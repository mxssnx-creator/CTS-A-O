import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, DEFAULT_TACTICS } from "./config.ts";
import { entrySignal } from "./bots/bots.ts";
import type { Bars, Protect } from "./domain/types.ts";
import { barsFromCandles, headBars, syntheticCandles } from "./market/bars.ts";
import { baseRuns, evaluationSignal, makeUniverse, runCombo } from "./pipeline/pipeline.ts";
import { buildTapes, type ConfigTape } from "./sim/walkforward.ts";
import { signalHistProtects, signalMfe } from "./signal-hist.ts";
import { signalSettings } from "./signal-config.ts";
import { closePool, runOnWorkers } from "./server/pool.server.ts";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime, crossedExit } from "./server/runtime.server.ts";

const H = 3_600_000;
const END = Date.UTC(2026, 9, 15, 4);
const FROM = END - 12 * H;
const CUT = END - 6 * H;
const PROTECT: Protect = { tp: 0.001, sl: 0.001, trail: 0, hold: 2 };
const fixture = (): Bars[] =>
  [1, 5, 15, 30].map((tf) =>
    barsFromCandles(
      "A-USDT",
      tf,
      syntheticCandles("A-USDT", tf, 900 + (12 * 60) / tf, END, tf + 7),
    ),
  );
const pairs = [1, 5, 15, 30].map((tf) => ({ bot: "follow", ind: `sig-ema-cross-s@m${tf}` }));

describe("replay: indicator warmup is separate from evaluation evidence", () => {
  it("retains warmed lanes while physically truncating six-hour history removes slower lanes", () => {
    const bars = fixture().map((b) => headBars(b, CUT));
    const physical = bars.map((b) => {
      const a = b.t.findIndex((t) => t >= FROM);
      return {
        ...b,
        n: b.n - a,
        t: b.t.slice(a),
        o: b.o.slice(a),
        h: b.h.slice(a),
        l: b.l.slice(a),
        c: b.c.slice(a),
        v: b.v.slice(a),
      };
    });
    assert.deepEqual(
      makeUniverse(physical).bars.map((b) => b.tfMin),
      [1],
    );
    const warmed = makeUniverse(bars, FROM);
    assert.deepEqual(
      warmed.bars.map((b) => b.tfMin),
      [1, 5, 15, 30],
    );
    assert.equal(warmed.startT, FROM);
    assert.ok(warmed.indicatorStartT! < FROM);
    assert.equal(warmed.nowT, CUT);
    assert.ok(warmed.splitT >= FROM && warmed.splitT <= CUT);
  });

  it("suppresses warmup entries without resetting indicator state or inventing a boundary onset", () => {
    const b = fixture()[0];
    const u = makeUniverse([b], FROM);
    const raw = new Int8Array(b.n).fill(1);
    const clipped = evaluationSignal(u, b, raw);
    const at = b.t.findIndex((t) => t >= FROM);
    assert.equal(clipped[at - 2], 0);
    assert.equal(clipped[at - 1], 1, "signal closes exactly at the first evaluated open");
    assert.equal(raw[at - 2], 1, "shared indicator signal remains unchanged");
    assert.equal(
      evaluationSignal(makeUniverse([b]), b, raw),
      raw,
      "ordinary runtime behavior is unchanged",
    );
    const absent = new Int8Array(b.n);
    absent[at - 2] = 1;
    assert.equal(evaluationSignal(u, b, absent)[at - 1], 0, "an old onset is never moved forward");
  });

  it("Base, tapes and historic config calculations use only entries inside the exact six-hour evaluation window", () => {
    const bars = fixture().map((b) => headBars(b, CUT));
    const bounded = makeUniverse(bars, FROM);
    const full = makeUniverse(bars);
    let boundedCloses = 0,
      warmupCloses = 0;
    for (const pair of pairs) {
      const limited = runCombo(bounded, "follow", pair.ind, PROTECT, 0.002, 1, DEFAULT_TACTICS)!;
      const unbounded = runCombo(full, "follow", pair.ind, PROTECT, 0.002, 1, DEFAULT_TACTICS)!;
      assert.ok(limited.trades.every((t) => t.entryT >= FROM && t.exitT <= CUT));
      assert.equal(limited.full.n, limited.trades.length);
      assert.ok(limited.open.every((p) => p.entryT >= FROM));
      boundedCloses += limited.full.n;
      warmupCloses += unbounded.trades.filter((t) => t.entryT < FROM).length;
    }
    assert.ok(boundedCloses > 0);
    assert.ok(warmupCloses > 0);
    const tapes = buildTapes(
      bounded,
      [PROTECT],
      0.002,
      undefined,
      new Set(pairs.map((p) => `${p.bot}|${p.ind}`)),
      DEFAULT_TACTICS,
    );
    assert.equal(tapes.length, 4);
    assert.ok(tapes.every((tp) => [...tp.entryT].every((t) => t >= FROM) && tp.fromT === FROM));
    const sig = signalSettings({});
    assert.deepEqual(
      signalHistProtects(
        bounded,
        pairs.map((p) => `${p.bot}|${p.ind}`),
        sig,
        DEFAULT_TACTICS,
        CUT,
      ),
      {},
      "six hours cannot supply a complete 48-hour historical hold",
    );
    const b = bounded.bars[0];
    const raw = entrySignal("follow", pairs[0].ind, bounded.caches[0], DEFAULT_TACTICS)!;
    assert.ok(
      raw.some((v, i) => v && b.t[i] < FROM),
      "indicators really used prior warmup",
    );
    assert.ok(
      signalMfe(full, "follow", pairs[0].ind, 0.5, DEFAULT_TACTICS, CUT).length >
        signalMfe(bounded, "follow", pairs[0].ind, 0.5, DEFAULT_TACTICS, CUT).length,
    );
  });

  it("Base evidence cannot read poisoned bars after the causal trading start", () => {
    const original = fixture();
    const poisoned = original.map((b) => ({
      ...b,
      o: b.o.slice(),
      h: b.h.slice(),
      l: b.l.slice(),
      c: b.c.slice(),
      v: b.v.slice(),
    }));
    for (const b of poisoned)
      for (let i = 0; i < b.n; i++)
        if (b.t[i] >= CUT) {
          b.o[i] = 100000;
          b.h[i] = 200000;
          b.l[i] = 1;
          b.c[i] = 1;
          b.v[i] = 1e12;
        }
    const base = (bars: Bars[]) =>
      baseRuns(
        makeUniverse(
          bars.map((b) => headBars(b, CUT)),
          FROM,
        ),
        pairs,
        0.002,
        DEFAULT_TACTICS,
      );
    assert.deepEqual(base(poisoned), base(original));
  });

  it("real workers preserve the lower boundary in Base, tapes and historical-config replies", async () => {
    const bars = fixture().map((b) => headBars(b, CUT));
    const u = makeUniverse(bars, FROM);
    const localBase = baseRuns(u, pairs, 0.002, DEFAULT_TACTICS, true);
    const localTapes = buildTapes(
      u,
      [PROTECT],
      0.002,
      undefined,
      new Set(pairs.map((p) => `${p.bot}|${p.ind}`)),
      DEFAULT_TACTICS,
    );
    const sig = signalSettings({});
    try {
      const [base] = await runOnWorkers<{ runsJson: string[] }>(
        [
          {
            type: "s1",
            bars,
            evaluationFromT: FROM,
            combos: pairs,
            cost: 0.002,
            tactics: DEFAULT_TACTICS,
          },
        ],
        2,
      );
      assert.deepEqual(
        base.runsJson.flatMap((x) => JSON.parse(x)),
        localBase,
      );
      const [remote] = await runOnWorkers<{ tapes: ConfigTape[] }>(
        [
          {
            type: "tapes",
            bars,
            evaluationFromT: FROM,
            pairs: pairs.map((p) => `${p.bot}|${p.ind}`),
            protects: [PROTECT],
            cost: 0.002,
            tactics: DEFAULT_TACTICS,
            dcaOpt: null,
            adjust: null,
          },
        ],
        2,
      );
      assert.deepEqual(remote.tapes, localTapes);
      const [hist] = await runOnWorkers<{ pairProtects: Record<string, Protect[]> }>(
        [
          {
            type: "signal-hist",
            bars,
            evaluationFromT: FROM,
            pairs: pairs.slice(0, 2).map((p) => `${p.bot}|${p.ind}`),
            sig,
            tactics: DEFAULT_TACTICS,
            cutT: CUT,
          },
        ],
        2,
      );
      assert.deepEqual(hist.pairProtects, {});
    } finally {
      closePool();
    }
  });

  it("is explicit replay-only and refuses to replace a pre-floor held position's protection", async () => {
    const db = new CoreDb(":memory:");
    assert.throws(
      () => new CoreRuntime(db, {}, { evaluationFromT: FROM }),
      /unconnected replays only/,
    );
    const rt = new CoreRuntime(
      db,
      {},
      { market: "synthetic", replay: true, evaluationFromT: FROM },
    );
    try {
      const position = {
        cfg: "held",
        sym: "A-USDT",
        side: 1 as const,
        entryT: FROM - H,
        entryI: 0,
        entry: 100,
        stop: 101,
        target: 0,
        peak: 103,
        trailOn: true,
        mtm: 0,
      };
      rt.paper.positions.push(position);
      const positions = rt.paper.positions,
        tapes = rt.tapes;
      await assert.rejects(rt.compute(), /excludes a held entry.*protection remain unchanged/);
      assert.equal(rt.paper.positions, positions);
      assert.equal(rt.tapes, tapes);
      assert.equal(rt.paper.positions[0], position);
      assert.equal(position.stop, 101);
      assert.equal(position.peak, 103);
      assert.equal(
        crossedExit(position, 100),
        101,
        "the already-ratcheted protection still applies",
      );
      assert.equal(rt.settings.live.enabled, DEFAULT_SETTINGS.live.enabled);
    } finally {
      rt.stop();
      db.db.close();
    }
  });
});
