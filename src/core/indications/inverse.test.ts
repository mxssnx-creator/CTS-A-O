import { test } from "node:test";
import assert from "node:assert/strict";
import { INDICATIONS, INDICATION_BY_ID, indicationState, laneInd } from "./registry.ts";
import { INVERSE_CONFIG_IDS, INVERSE_SOURCES } from "./inverse-config.ts";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, headBars, syntheticCandles } from "../market/bars.ts";
import { allCombos, laneInds, makeUniverse } from "../pipeline/pipeline.ts";
import { entrySignal } from "../bots/bots.ts";
import { minPfOf } from "../minimal-coord.ts";
import type { Bars, Candle } from "../domain/types.ts";
import { buildTapes, packTapes, unpackTapes, type ConfigTape } from "../sim/walkforward.ts";
import { closePool, runOnWorkers } from "../server/pool.server.ts";
import { DEFAULT_DCA, DEFAULT_AXIS } from "../config.ts";
import { exitStrategyPairs } from "../exit-strategy.ts";

const END = Date.UTC(2026, 9, 1);
const fixture = (n = 1600, tf = 5) =>
  barsFromCandles("TEST-USDT", tf, syntheticCandles("TEST", tf, n, END, 17));
const inverse = INDICATIONS.filter((s) => s.kind === "inverse");

test("Inverse retains independent DCA, DCA Active, Axis and bot-free Exit identities", () => {
  // A noisy market exercises ladder fills; the smooth causal-market fixture intentionally
  // leaves the default Axis displacement/exit conditions unfilled.
  const bars = Array.from({ length: 12 }, (_, i) =>
    barsFromCandles(`X${i}-USDT`, 1, syntheticCandles(`X${i}`, 1, 1600, END, i + 17)),
  );
  const u = makeUniverse(bars);
  const ind = "inverse-known-trend-ema@m1";
  const p = { tp: 0.006, sl: 0.006, trail: 0, hold: 30 };
  const tapes = buildTapes(
    u,
    [p],
    0.002,
    {
      protects: [p],
      dca: DEFAULT_DCA,
      axis: { ...DEFAULT_AXIS, ranges: ["atr"], levelsSet: [2] },
    },
    new Set([`follow|${ind}`]),
    null,
  );
  for (const kind of ["normal", "dca", "dca-active", "axis"]) {
    const own = tapes.filter((tp) => tp.kind === kind);
    assert.ok(own.length > 0, kind);
    assert.ok(
      own.some((tp) => tp.n > 0),
      `${kind}: actual completed modeled positions`,
    );
    assert.ok(own.every((tp) => tp.ind === ind));
  }
  assert.equal(new Set(tapes.map((tp) => tp.id)).size, tapes.length);
  const pairs = exitStrategyPairs([{ ind }], u, {
    timeframes: [1],
    includeTactics: false,
    includeRelations: false,
    includeCombined: false,
  });
  assert.deepEqual(pairs, [`exit|${ind}`]);
  const exits = buildTapes(
    u,
    [{ ...p, exitType: "historic", exitSide: 1, exitSet: "static-sl" }],
    0.002,
    undefined,
    new Set(pairs),
    null,
  );
  assert.equal(exits.length, 1);
  assert.equal(exits[0].kind, "exit");
  assert.ok(exits[0].n > 0);
  assert.ok(exits[0].side.every((s) => s === 1));
});

test("Inverse catalogue has stable unique identities and the ordinary PF floor", () => {
  assert.equal(inverse.length, 58);
  assert.deepEqual(
    inverse.map((s) => s.id),
    INVERSE_CONFIG_IDS,
  );
  assert.equal(new Set(INVERSE_CONFIG_IDS).size, 58);
  assert.equal(minPfOf({ minPf: 1.02 }, "sh", INVERSE_CONFIG_IDS[0]), 1.1);
  assert.equal(minPfOf({ minPf: 1.5 }, "sh", INVERSE_CONFIG_IDS[0]), 1.5);
  assert.ok(allCombos([], ["inverse"], [1, 5, 15]).every((p) => !p.ind.startsWith("inverse-")));
});

test("Known Inverse states are the opposite of their actual source, before execution", () => {
  const k = new SeriesCache(fixture());
  for (const id of INVERSE_SOURCES) {
    const source = indicationState(id, k)!;
    const flipped = indicationState(`inverse-known-${id}`, k)!;
    for (let i = 0; i < source.length; i++)
      assert.equal(flipped[i], i < 80 || !source[i] ? 0 : -source[i], `${id} ${i}`);
    assert.strictEqual(indicationState(`inverse-known-${id}`, k), flipped, "memoized per cache");
  }
  assert.ok(entrySignal("follow", "inverse-known-trend-ema", k)!.some((s) => s === 1));
  assert.ok(entrySignal("follow", "inverse-known-trend-ema", k)!.some((s) => s === -1));
  assert.ok(
    entrySignal("revert", "inverse-known-trend-ema", k)!.every((s) => s === 0),
    "no double reversal",
  );
});

test("Inverse uses independent 1/5/15m and completed combined lanes, without 30m work", () => {
  const id = "inverse-known-ema-9-21";
  assert.deepEqual(
    laneInds(id, [1, 5, 15, 30]),
    [1, 5, 15].flatMap((tf) =>
      tf < 15 ? [laneInd(id, tf), laneInd(id, tf, true)] : [laneInd(id, tf)],
    ),
  );
  const combos = allCombos(
    INVERSE_CONFIG_IDS.map((id) => `follow|${id}`),
    [],
    [1, 5, 15, 30],
  );
  assert.equal(combos.length, 58 * 5);
  assert.ok(combos.every((p) => p.bot === "follow"));
  const b = fixture(1800, 1);
  b.lanes = [1, 5, 15, 30];
  const k = new SeriesCache(b);
  const full = indicationState(laneInd(id, 1, true), k)!;
  for (const cut of [1201, 1213, 1319]) {
    const prefix = headBars(b, b.t[cut]);
    assert.deepEqual(
      indicationState(laneInd(id, 1, true), new SeriesCache(prefix)),
      full.slice(0, prefix.n),
    );
  }
  assert.ok(indicationState(id, new SeriesCache(fixture(200, 30)))!.every((s) => s === 0));
});

test("All price/math variants are prefix-causal and recover only after fresh gap/invalid warmup", () => {
  const b = fixture(900);
  const full = new SeriesCache(b);
  const prefix = headBars(b, b.t[601]);
  const pk = new SeriesCache(prefix);
  for (const s of inverse)
    assert.deepEqual(
      indicationState(s.id, pk),
      indicationState(s.id, full)!.slice(0, prefix.n),
      s.id,
    );
  for (const invalid of [false, true]) {
    const broken: Bars = { ...b, t: b.t.slice(), c: b.c.slice() };
    if (invalid) broken.c[300] = NaN;
    else for (let i = 300; i < b.n; i++) broken.t[i] += 5 * 60_000;
    const restart = invalid ? 301 : 300;
    const bk = new SeriesCache(broken);
    const fresh: Bars = {
      ...broken,
      n: broken.n - restart,
      t: broken.t.slice(restart),
      o: broken.o.slice(restart),
      h: broken.h.slice(restart),
      l: broken.l.slice(restart),
      c: broken.c.slice(restart),
      v: broken.v.slice(restart),
    };
    const fk = new SeriesCache(fresh);
    for (const s of inverse) {
      const state = indicationState(s.id, bk)!;
      assert.ok(
        state.slice(300, restart + 80).every((s) => s === 0),
        s.id,
      );
      assert.deepEqual(state.slice(restart), indicationState(s.id, fk), s.id);
    }
  }
});

function marketFixture(n: number): Bars[] {
  return Array.from({ length: 12 }, (_, s) => {
    const cs: Candle[] = [];
    let last = 100;
    for (let i = 0; i < n; i++) {
      const c = 100 * Math.exp(0.015 * Math.sin(i / 14) + 0.012 * Math.sin(i / (5 + s)));
      cs.push({
        t: END + i * 60_000,
        o: last,
        c,
        h: Math.max(last, c) * 1.0003,
        l: Math.min(last, c) * 0.9997,
        v: 100 + 10 * Math.sin(i / 7),
      });
      last = c;
    }
    return barsFromCandles(`M${s}-USDT`, 1, cs);
  });
}

test("Market Inverse uses the full causal universe, has both directions and rejects absent market evidence", () => {
  const bars = marketFixture(1600);
  const u = makeUniverse(bars);
  const cut = 1213;
  const p = makeUniverse(bars.map((b) => headBars(b, b.t[cut])));
  for (const method of ["market-residual", "market-shock", "market-aligned"]) {
    for (const window of [20, 40]) {
      const id = `inverse-${method}-${window}`;
      const directions = new Set<number>();
      for (let s = 0; s < bars.length; s++) {
        const full = indicationState(id, u.caches[s])!;
        for (const dir of full) if (dir) directions.add(dir);
        assert.deepEqual(indicationState(id, p.caches[s]), full.slice(0, cut), `${id} ${s}`);
      }
      assert.deepEqual([...directions].sort(), [-1, 1], id);
      assert.ok(indicationState(id, new SeriesCache(bars[0]))!.every((s) => s === 0));
      assert.ok(indicationState(id, makeUniverse([bars[0]]).caches[0])!.every((s) => s === 0));
      assert.equal(INDICATION_BY_ID.get(id)?.kind, "inverse");
    }
  }
});

test("Real workers and serialized Normal/Trailing/Trailing-only tapes preserve Inverse returns and both sides", async () => {
  const bars = marketFixture(900);
  const pairs = ["inverse-known-trend-ema", "inverse-zscore-20", "inverse-market-residual-20"].map(
    (id) => `follow|${id}@m1`,
  );
  const protects = [
    { tp: 0.006, sl: 0.006, trail: 0, hold: 30 },
    { tp: 0.006, sl: 0.006, trail: 0.003, hold: 30 },
    { tp: 0.006, sl: 0.006, trail: 0.003, hold: 30, trailOnly: true },
  ];
  const local = buildTapes(makeUniverse(bars), protects, 0.002, undefined, new Set(pairs), null);
  assert.equal(local.length, 9);
  assert.ok(local.some((tp) => tp.side.includes(1)));
  assert.ok(local.some((tp) => tp.side.includes(-1)));
  try {
    const remote = (
      await runOnWorkers<{ tapes: ConfigTape[] }>(
        pairs.map((pair) => ({
          type: "tapes",
          bars,
          pairs: [pair],
          protects,
          cost: 0.002,
          dcaOpt: null,
          tactics: null,
        })),
        2,
      )
    ).flatMap((r) => r.tapes);
    for (const actual of [remote, unpackTapes(packTapes(remote))]) {
      assert.deepEqual(
        actual.map((t) => t.id),
        local.map((t) => t.id),
      );
      actual.forEach((tp, i) => {
        for (const key of ["r", "entryT", "exitT", "side", "symI"] as const)
          assert.deepEqual(tp[key], local[i][key], `${tp.id} ${key}`);
        assert.deepEqual(tp.protect, local[i].protect);
      });
    }
  } finally {
    await closePool();
  }
});
