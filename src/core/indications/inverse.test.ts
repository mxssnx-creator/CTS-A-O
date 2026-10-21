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
import { DEFAULT_DCA, DEFAULT_AXIS, DEFAULT_SETTINGS } from "../config.ts";
import { microIndRule, rangeMinTfOf } from "../minimal-coord.ts";
import { microIndFits, isMicroInd } from "./micro.ts";
import { protectGrid } from "../sim/walkforward.ts";
import { exitStrategyPairs } from "../exit-strategy.ts";

const END = Date.UTC(2026, 9, 1);
const fixture = (n = 1600, tf = 5) =>
  barsFromCandles("TEST-USDT", tf, syntheticCandles("TEST", tf, n, END, 17));
const inverse = INDICATIONS.filter((s) => s.kind === "inverse" && INVERSE_CONFIG_IDS.includes(s.id));

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
  assert.equal(inverse.length, 114);
  assert.deepEqual(
    inverse.map((s) => s.id),
    INVERSE_CONFIG_IDS,
  );
  assert.equal(new Set(INVERSE_CONFIG_IDS).size, 114);
  assert.equal(minPfOf({ minPf: 1.02 }, "sh", INVERSE_CONFIG_IDS[0]), 1.1);
  assert.equal(minPfOf({ minPf: 1.5 }, "sh", INVERSE_CONFIG_IDS[0]), 1.5);
  assert.ok(allCombos([], ["inverse"], [1, 5, 15]).every((p) => !p.ind.startsWith("inverse-")));
});

test("Inverse standard and Micro identities use the complete production TP/SL/trailing ranges on twenty symbols", () => {
  const bars = Array.from({ length: 20 }, (_, i) => [5, 15].map((tf) =>
    barsFromCandles(`X${i}-USDT`, tf, syntheticCandles(`X${i}`, tf, 500, END, i + 17)),
  )).flat();
  const pairs = ["follow|inverse-known-trend-ema@m15", "follow|inverse-mc-zscore-10@m5"];
  const protects = protectGrid(15, DEFAULT_SETTINGS.grid, DEFAULT_SETTINGS.cost);
  const floors = { minSl: DEFAULT_SETTINGS.protectFloor.minSl, minTrail: DEFAULT_SETTINGS.protectFloor.minTrail, rangeMinTf: rangeMinTfOf(DEFAULT_SETTINGS.grid), microOwnInds: microIndRule(DEFAULT_SETTINGS.grid) };
  const tapes = buildTapes(makeUniverse(bars), protects, DEFAULT_SETTINGS.cost, undefined, new Set(pairs), null, null, floors);
  assert.equal(new Set(tapes.map((t) => t.id)).size, tapes.length);
  for (const pair of pairs) {
    const ind = pair.split("|")[1];
    const mc = isMicroInd(ind);
    const tf = mc ? 5 : 15;
    const eligible = protects.filter((p) => microIndFits(floors.microOwnInds, p.tag, mc) && tf >= (floors.rangeMinTf[p.tag ?? "wide"] ?? 0));
    const own = tapes.filter((t) => t.ind === ind);
    // Exact distances/hold conversion are compared with the production builder, including deduplicated floors.
    assert.equal(own.length, eligible.length, ind);
    const tags = new Set(own.map((t) => t.protect.tag));
    assert.deepEqual([...tags].sort(), (mc ? ["mc", "mn"] : ["mn", "sh", "gn", "lg"]).sort());
    for (const tag of tags) for (const kind of ["normal", "trailing"]) {
      const cells = own.filter((t) => t.protect.tag === tag && t.kind === kind);
      assert.ok(cells.length > 0, `${ind} ${tag} ${kind}`);
      const sides = new Set(cells.flatMap((t) => [...t.side]));
      const symbols = new Set(cells.flatMap((t) => [...t.symI].map((i) => t.syms[i])));
      assert.deepEqual([...sides].sort(), [-1, 1], `${tag} ${kind}: both directions actually close`);
      assert.equal(symbols.size, 20, `${tag} ${kind}: every symbol actually closes`);
      assert.ok(cells.every((t) => t.protect.tp > 0 && t.protect.sl + 1e-12 >= (tag === "mc" ? 0.0035 : 0.005) && !t.protect.trailOnly));
    }
  }
});

test("BTC/ETH pair references are causal, timestamp aligned, gap-safe and unavailable without a distinct peer", () => {
  const peerFixture = (method: string) => Array.from({ length: 12 }, (_, s) => {
    let last = 100;
    const candles: Candle[] = Array.from({ length: 900 }, (_, i) => {
      const log = method === "spread"
        ? .03 * Math.sin(i / 25) + .002 * Math.sin(i * 1.1) + (s < 2 ? 0 : .01 * Math.sin(i / 30 + s) + .002 * Math.sin(i * 1.7 + s))
        : .03 * Math.sin(i / 14) + (s < 2 ? .002 : .012) * Math.sin(i / (5 + s));
      const c = 100 * Math.exp(log);
      const bar = { t: END + i * 60_000, o: last, c, h: Math.max(last, c) * 1.0003, l: Math.min(last, c) * .9997, v: 100 };
      last = c;
      return bar;
    });
    return barsFromCandles(s === 0 ? "BTC-USDT" : s === 1 ? "ETH-USDT" : `X${s}`, 1, candles);
  });
  for (const id of INVERSE_CONFIG_IDS.filter((id) => id.startsWith("inverse-pair-"))) {
    const bars = peerFixture(id.includes("-spread-") ? "spread" : "residual");
    const full = makeUniverse(bars);
    const cut = 651;
    const prefix = makeUniverse(bars.map((b) => headBars(b, b.t[cut])));
    const dirs = new Set<number>();
    for (let s = 0; s < bars.length; s++) {
      const state = indicationState(id, full.caches[s])!;
      assert.deepEqual(indicationState(id, prefix.caches[s]), state.slice(0, cut), `${id} ${s}`);
      for (const d of state) if (d) dirs.add(d);
    }
    assert.deepEqual([...dirs].sort(), [-1, 1], id);
    assert.ok(indicationState(id, new SeriesCache(bars[2]))!.every((d) => !d));
    const self = id.includes("-btc-") ? 0 : 1;
    assert.ok(indicationState(id, full.caches[self])!.every((d) => !d));
  }
  const bars = peerFixture("residual");
  const full = makeUniverse(bars);
  const gap = { ...bars[0], t: bars[0].t.slice(), n: bars[0].n };
  for (let i = 400; i < gap.n; i++) gap.t[i] += 60_000;
  const g = makeUniverse([gap, bars[2]]);
  const ref = g.caches[1].reference("BTC-USDT")!;
  assert.ok(Number.isNaN(ref.ret[400]), "missing peer time never carries a stale return");
  assert.ok(Number.isNaN(ref.ret[401]), "peer's first bar after its gap has no one-bar return");
  const state = indicationState("inverse-pair-btc-residual-20", g.caches[1])!;
  assert.ok(state.slice(400, 422).every((d) => !d), "full fresh pair-fit window required");
  const cache = full.caches[2];
  assert.ok(cache.reference("BTC-USDT"));
  cache.setMarket(null);
  assert.ok(indicationState("inverse-pair-btc-spread-20", cache)!.every((d) => !d), "changing universe invalidates peer states");
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
  assert.equal(combos.length, 114 * 5);
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
  bars[0] = { ...bars[0], sym: "BTC-USDT" };
  bars[1] = { ...bars[1], sym: "ETH-USDT" };
  const pairs = ["inverse-known-trend-ema", "inverse-zscore-20", "inverse-market-residual-20",
    "inverse-zscore-80", "inverse-mc-zscore-10", "inverse-pair-btc-residual-20", "inverse-pair-eth-spread-20"].map(
    (id) => `follow|${id}@m1`,
  );
  const protects = [
    { tp: 0.006, sl: 0.006, trail: 0, hold: 30 },
    { tp: 0.006, sl: 0.006, trail: 0.003, hold: 30 },
    { tp: 0.006, sl: 0.006, trail: 0.003, hold: 30, trailOnly: true },
  ];
  const local = buildTapes(makeUniverse(bars), protects, 0.002, undefined, new Set(pairs), null);
  assert.equal(local.length, 21);
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
