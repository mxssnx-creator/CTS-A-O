import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { DEFAULT_SETTINGS, DEFAULT_PROTECT } from "../config.ts";
import { barsFromCandles, syntheticCandles, resample } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import {
  buildTapes,
  defaultWalkForward,
  walkForward,
  compactTapesGen,
  tradeAt,
  tapeBytes,
  packArena,
  makeTape,
  packTapes,
  unpackTapes,
  type WalkForwardResult,
} from "../sim/walkforward.ts";
import {
  TapeHistoryStore,
  describeStoredTape,
  restoreStoredTapes,
  HistoryStorageError,
  BoundedHistory,
  historyOf,
  transferHistoriesGen,
  readHistoryManifest,
} from "./history-store.server.ts";
import { runOnWorkers, retireOwnedIdleWorkers } from "./pool.server.ts";

const end = Date.UTC(2026, 9, 17),
  H = 3_600_000;
function fixture() {
  const u = makeUniverse(
    ["A", "B"].flatMap((sym) => {
      const candles = syntheticCandles(sym, 1, 7200, end);
      return [1, 5, 15].map((tf) =>
        barsFromCandles(sym, tf, tf === 1 ? candles : resample(candles, 1, tf)),
      );
    }),
  );
  const wf = {
    ...defaultWalkForward(DEFAULT_SETTINGS),
    longH: 100,
    simH: 12,
    mode: "fixed" as const,
    validLastN: 4,
    lastN: 4,
    seatPer: "config" as const,
  };
  const tapes = buildTapes(
    u,
    [DEFAULT_PROTECT, { ...DEFAULT_PROTECT, trail: 0.004 }],
    0.0015,
    {
      protects: wf.dcaProtects.slice(0, 1),
      dca: wf.dca,
      axis: { ...DEFAULT_SETTINGS.axis, ranges: ["atr"], levelsSet: [2], hybrids: [false] },
    },
    new Set(["follow|ema-9-21@m5", "follow|ema-21-55@m15"]),
    null,
  );
  assert.ok(tapes.some((t) => t.n > 0));
  assert.ok(tapes.some((t) => t.open.length || t.pending.length));
  return { u, wf, tapes };
}
test("bounded histories preserve every binary column, metadata, prefix, open and pending position across eviction", () => {
  const directory = mkdtempSync(join(tmpdir(), "history-test-")),
    { tapes } = fixture();
  const store = new TapeHistoryStore({ directory, cacheBytes: 128 });
  try {
    const saved = tapes.map((t) =>
      store.append({ ...t, heldOnly: true, carried: true, fromT: 123 }),
    );
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < tapes.length; i++) {
        assert.deepEqual(
          { ...saved[i] },
          { ...tapes[i], heldOnly: true, carried: true, fromT: 123 },
        );
        for (let j = 0; j < tapes[i].n; j++)
          assert.deepEqual(tradeAt(saved[i], j), tradeAt(tapes[i], j));
      }
    assert.ok(store.stats.reads > saved.length, "evicted histories are read again in full");
    assert.ok(store.stats.peakCacheBytes <= 128);
    assert.equal(
      store.stats.rawBytes,
      tapes.reduce((n, t) => n + tapeBytes(t.n), 0),
    );
    const compact = compactTapesGen(saved);
    let copied;
    for (;;) {
      const result = compact.next();
      if (result.done) {
        copied = result.value;
        break;
      }
    }
    assert.ok(copied.every((t) => t.heldOnly && t.carried && t.fromT === 123));
    assert.deepEqual(
      unpackTapes(packTapes(saved)),
      saved.map((t) => ({ ...t })),
      "worker packing retains recovery eligibility metadata",
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("stored and ordinary histories have identical full walk-forward selection, orders, returns, gates and counts", () => {
  const { u, wf, tapes } = fixture(),
    store = new TapeHistoryStore({ cacheBytes: 8192 });
  try {
    const saved = tapes.map((t) => store.append(t));
    const expected = walkForward(u, tapes, wf);
    assert.deepEqual(walkForward(u, saved, wf), expected);
    const g = compactTapesGen(saved);
    let out;
    for (;;) {
      const r = g.next();
      if (r.done) {
        out = r.value;
        break;
      }
    }
    assert.deepEqual(out, tapes, "held-tape compaction materializes exact bytes only when needed");
    const restored = restoreStoredTapes(saved.map((t) => describeStoredTape(t)!));
    try {
      assert.deepEqual(walkForward(u, restored.tapes, wf), walkForward(u, tapes, wf));
    } finally {
      restored.close();
    }
    assert.ok(existsSync(store.path), "a read-only consumer cannot remove the owner's histories");
  } finally {
    store.close();
  }
});

test("the memory budget accounts for the entire shared worker arena and the local builder retains incrementally", () => {
  const { u, tapes } = fixture();
  packArena(tapes);
  const owner = new BoundedHistory(tapeBytes(tapes[0].n));
  try {
    const saved = tapes.map(owner.retain);
    assert.ok(
      saved.every((t) => historyOf(t)),
      "a small slice cannot pin an arena larger than the budget",
    );
    for (let i = 0; i < saved.length; i++) assert.deepEqual({ ...saved[i] }, tapes[i]);
    const fresh = new BoundedHistory(0);
    let retained = 0;
    try {
      const ps = [DEFAULT_PROTECT, { ...DEFAULT_PROTECT, trail: 0.004 }],
        pairs = new Set(["follow|ema-9-21@m5"]);
      const ordinary = buildTapes(u, ps, 0.0015, undefined, pairs);
      const bounded = buildTapes(u, ps, 0.0015, undefined, pairs, null, null, {
        minSl: 0,
        minTrail: 0,
        tapeSink: (t) => {
          retained++;
          return fresh.retain(t);
        },
      });
      assert.equal(retained, bounded.length);
      assert.ok(retained > 0);
      assert.deepEqual(
        bounded.map((t) => ({ ...t })),
        ordinary,
      );
    } finally {
      fresh.close();
    }
  } finally {
    owner.close();
  }
});

test("a streamed worker manifest preserves independent admitted orders and losses, and rejects truncation", async () => {
  const { u, wf, tapes } = fixture(),
    store = new TapeHistoryStore({ cacheBytes: 8192 });
  const planted = tapes.slice(0, 2).map((tp) =>
    makeTape(
      tp.id,
      tp.bot,
      tp.ind,
      tp.protect,
      tp.kind,
      tp.syms,
      Array.from({ length: 1440 }, (_, i) => {
        const entryT = u.nowT - 120 * H + i * 300_000,
          side = (i % 2 ? 1 : -1) as 1 | -1,
          r = i % 5 ? 0.0185 : -0.0065;
        return {
          cfg: tp.id,
          sym: tp.syms[Math.floor(i / 2) % tp.syms.length],
          side,
          entryT,
          exitT: entryT + 240_000,
          entry: 100,
          exit: 100 * (1 + side * (r + 0.0015)),
          r,
          mult: 1,
          reason: i % 5 ? ("tp" as const) : ("sl" as const),
          bars: 4,
          mfe: 0,
          mae: 0,
        };
      }),
      [],
      [],
    ),
  );
  let transfer;
  const workerOwner = {};
  try {
    const expected = walkForward(u, planted, wf);
    assert.ok(
      expected.trades.length > 0,
      "parity must execute orders, not merely compare empty results",
    );
    assert.ok(
      expected.feed.some((t) => t.r < 0),
      "loss observations remain present",
    );
    const mixed = [store.append(planted[0]), planted[1]];
    const gen = transferHistoriesGen(mixed);
    for (;;) {
      const r = gen.next();
      if (r.done) {
        transfer = r.value;
        break;
      }
    }
    const restored = readHistoryManifest(transfer.path);
    try {
      assert.deepEqual(walkForward(u, restored.tapes, wf), expected);
    } finally {
      restored.close();
    }
    const [reply] = await runOnWorkers<{ sim: WalkForwardResult }>(
      [
        {
          type: "research-real",
          nowT: u.nowT,
          baseTf: u.baseTf,
          historyManifest: transfer.path,
          wf,
        },
      ],
      1,
      30_000,
      undefined,
      false,
      undefined,
      workerOwner,
    );
    assert.deepEqual(reply.sim, expected);
    assert.ok(existsSync(store.path));
    const bytes = readFileSync(transfer.path);
    writeFileSync(transfer.path, bytes.subarray(0, bytes.length - 80));
    assert.throws(() => readHistoryManifest(transfer!.path), /Incomplete history manifest/);
  } finally {
    await retireOwnedIdleWorkers(workerOwner);
    transfer?.close();
    store.close();
  }
});
test("incomplete/corrupt/noncanonical history fails explicitly instead of creating empty or profitable evidence", () => {
  const { tapes } = fixture(),
    store = new TapeHistoryStore({ cacheBytes: 64 });
  try {
    const source = tapes.find((t) => t.n > 0)!;
    assert.throws(() => store.append({ ...source, r: source.r.slice() }), /Noncanonical/);
    const saved = store.append(source),
      row = describeStoredTape(saved)!;
    assert.throws(() => store.restore(row.meta, { ...row.record, n: row.record.n + 1 }), /Invalid/);
    const bytes = readFileSync(store.path);
    bytes[0] ^= 0xff;
    writeFileSync(store.path, bytes);
    assert.throws(() => saved.r, HistoryStorageError);
    writeFileSync(store.path, Buffer.alloc(0));
    assert.throws(() => saved.exitT, /Incomplete history bytes/);
    const directory = dirname(store.path);
    store.close();
    store.close();
    assert.equal(existsSync(directory), false);
    assert.throws(() => saved.r, /closed/);
  } finally {
    store.close();
  }
});

test("both available history codecs preserve the canonical binary layout", () => {
  const { tapes } = fixture();
  for (const codec of ["deflate", "zstd"] as const) {
    const store = new TapeHistoryStore({ codec, cacheBytes: 64 });
    try {
      const saved = store.append(tapes.find((t) => t.n > 0)!);
      assert.equal(describeStoredTape(saved)!.record.codec, codec);
      assert.deepEqual(
        { ...saved },
        tapes.find((t) => t.n > 0),
      );
    } finally {
      store.close();
    }
  }
});
