import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import { INDICATION_KINDS, type Bars } from "../domain/types.ts";
import { minPfOf, rangeMinTfOf } from "../minimal-coord.ts";
import { allCombos, baseRangeProtects, makeUniverse, rangeAppliesTo, rangeBaseStats, runCombo } from "../pipeline/pipeline.ts";
import { orderCfgKey } from "../sim/walkforward.ts";
import { isMicroInd } from "./micro.ts";
import { tacticKeyFor } from "./filters.ts";
import { SeriesCache } from "./cache.ts";
import { MarketSource } from "./market.ts";
import { INDICATION_BY_ID, indicationState, laneOf } from "./registry.ts";
import {
  RELATE_CONFIG_IDS,
  RELATE_MODES,
  RELATE_PROFILES,
  RELATE_SUBSETS,
  isRelateInd,
  isRelateMicroInd,
  relateAnchorTf,
  relateSpecs,
} from "./relate.ts";

const T0 = Date.UTC(2026, 8, 1);
const stepMs = (tf: number) => tf * 60_000;

function bars(
  sym: string,
  tf: number,
  n: number,
  changeAt: (i: number) => number = () => 0.001,
  volumeAt: (i: number) => number = () => 1_000,
): Bars {
  const out: Bars = {
    sym,
    tfMin: tf,
    n,
    t: new Float64Array(n),
    o: new Float64Array(n),
    h: new Float64Array(n),
    l: new Float64Array(n),
    c: new Float64Array(n),
    v: new Float64Array(n),
  };
  let price = 100;
  for (let i = 0; i < n; i++) {
    const open = price;
    price *= 1 + changeAt(i);
    const wick = Math.max(0.01, Math.max(open, price) * 0.001);
    out.t[i] = T0 + i * stepMs(tf);
    out.o[i] = open;
    out.h[i] = Math.max(open, price) + wick;
    out.l[i] = Math.min(open, price) - Math.min(wick, Math.min(open, price) / 2);
    out.c[i] = price;
    out.v[i] = volumeAt(i);
  }
  return out;
}

function cut(b: Bars, n: number): Bars {
  return {
    ...b,
    n,
    t: b.t.slice(0, n),
    o: b.o.slice(0, n),
    h: b.h.slice(0, n),
    l: b.l.slice(0, n),
    c: b.c.slice(0, n),
    v: b.v.slice(0, n),
  };
}

describe("Relate indication family", () => {
  it("registers every subset, mode and ratio profile with one independent anchor lane", () => {
    const specs = relateSpecs();
    assert.ok(INDICATION_KINDS.includes("relate"));
    assert.equal(specs.length, 40);
    assert.equal(RELATE_CONFIG_IDS.length, 40);
    assert.equal(new Set(RELATE_CONFIG_IDS).size, 40);
    assert.equal(RELATE_SUBSETS.length, 7);
    assert.equal(RELATE_MODES.length, 2);
    assert.equal(RELATE_PROFILES.length, 2);
    assert.deepEqual(specs.map((spec) => spec.id).sort(), [...RELATE_CONFIG_IDS].sort());
    for (const spec of specs) {
      assert.equal(INDICATION_BY_ID.get(spec.id)?.kind, "relate");
      assert.equal(spec.kind, "relate");
      assert.ok(isRelateInd(spec.id));
      assert.equal(relateAnchorTf(spec.id), Number(spec.id.match(/^relate-(?:mc-)?(1|5|15)(?=x|-)/)?.[1]));
    }

    const focus = specs.map((spec) => `follow|${spec.id}`);
    const combos = allCombos(focus, [], [1, 5, 15]);
    assert.equal(combos.length, specs.length);
    assert.equal(new Set(combos.map((x) => x.ind)).size, specs.length);
    for (const combo of combos) {
      const lane = laneOf(combo.ind);
      assert.equal(lane.combined, false, combo.ind);
      assert.equal(lane.tf, relateAnchorTf(lane.base), combo.ind);
    }
    assert.equal(allCombos(focus, ["relate"], [1, 5, 15]).length, 0);
    assert.equal(allCombos(focus, [], [1, 5]).length, 32, "15m-anchored configs need the 15m lane selected");
  });

  it("routes standard and Micro identities through Micro, Minimal and Short range rules", () => {
    const standard = "relate-5x15-trend-guarded@m5";
    const standardShort = "relate-15-trend-guarded@m15";
    const micro = "relate-mc-5x15-trend-guarded@m5";
    const baseRules = { enabled: () => true, minTf: { mc: 5, mn: 1, sh: 15 }, microOwnInds: true };
    assert.equal(isMicroInd("mc-rsi2-5"), true);
    assert.equal(isMicroInd(micro), true);
    assert.equal(isRelateMicroInd("relate-mc-5x15-trend-guarded"), true);
    assert.equal(isMicroInd(standard), false);
    assert.equal(rangeAppliesTo(standard, "mc", baseRules), false);
    assert.equal(rangeAppliesTo(standard, "mn", baseRules), true);
    assert.equal(rangeAppliesTo(standard, "sh", baseRules), false, "5m relation keeps the Short 15m minimum");
    assert.equal(rangeAppliesTo(standardShort, "sh", baseRules), true, "the 15m subset is eligible for Short");
    assert.equal(rangeAppliesTo(micro, "mc", baseRules), true);
    assert.equal(rangeAppliesTo(micro, "mn", baseRules), false);
    assert.equal(rangeAppliesTo(micro, "sh", baseRules), false);
    assert.equal(rangeAppliesTo(micro, "mn", { ...baseRules, microOwnInds: "minimal" }), true);
  });

  it("produces causal signals for every 1/5/15m subset and resets after data gaps", () => {
    const byTf = new Map([[1, bars("A-USDT", 1, 1_200)], [5, bars("B-USDT", 5, 600)], [15, bars("C-USDT", 15, 240)]]);
    for (const spec of relateSpecs()) {
      const tf = relateAnchorTf(spec.id)!;
      const k = new SeriesCache(byTf.get(tf)!);
      const state = spec.fn(k);
      assert.ok(state.some((x) => x !== 0), `${spec.id} should evaluate with its anchor history`);
      assert.ok(state.every((x) => x === -1 || x === 0 || x === 1), `${spec.id} directional values`);
    }
    const down = relateSpecs().find((spec) => spec.id === "relate-5-trend-guarded")!.fn(
      new SeriesCache(bars("DOWN-USDT", 5, 300, () => -0.001)),
    );
    assert.ok(down.some((x) => x === -1), "the relation supports a sustained short trend");

    const b = bars("PREFIX-USDT", 1, 1_100);
    const id = "relate-1x5x15-trend-guarded";
    const full = indicationState(id, new SeriesCache(b))!;
    const prefixN = 850;
    const prefix = indicationState(id, new SeriesCache(cut(b, prefixN)))!;
    assert.deepEqual(prefix, full.slice(0, prefixN), "future bars cannot change earlier 1/5/15m states");
    const poisoned = { ...b, o: b.o.slice(), h: b.h.slice(), l: b.l.slice(), c: b.c.slice(), v: b.v.slice() };
    for (let i = prefixN; i < b.n; i++) {
      poisoned.o[i] = 100;
      poisoned.c[i] = i % 2 ? 50 : 150;
      poisoned.h[i] = 200;
      poisoned.l[i] = 10;
      poisoned.v[i] = 1_000_000;
    }
    assert.deepEqual(indicationState(id, new SeriesCache(poisoned))!.slice(0, prefixN), prefix);

    const gap = bars("GAP-USDT", 5, 300);
    for (let i = 150; i < gap.n; i++) gap.t[i] += stepMs(5);
    const afterGap = relateSpecs().find((spec) => spec.id === "relate-5-trend-guarded")!.fn(new SeriesCache(gap));
    assert.ok(afterGap.slice(150, 188).every((x) => x === 0), "trend and ratios warm up again after a missing bar");
    assert.ok(afterGap.slice(188).some((x) => x === 1), "the relation recovers once post-gap history is sufficient");
  });

  it("uses completed higher bars, market drawdown and market activity without leaking future data", () => {
    const b = bars("HTF-USDT", 1, 1_100);
    const id = "relate-1x5x15-trend-guarded@m1";
    const state = indicationState(id, new SeriesCache(b))!;
    const cutN = 850;
    assert.deepEqual(
      indicationState(id, new SeriesCache(cut(b, cutN)))!,
      state.slice(0, cutN),
      "the 5m and 15m checks only use completed higher bars",
    );

    const target = bars("TARGET-USDT", 5, 240);
    const crash = bars("CRASH-USDT", 5, 240, (i) => (i >= 130 && i < 138 ? -0.25 : i < 130 ? 0.001 : 0));
    const signal = relateSpecs().find((spec) => spec.id === "relate-5-trend-guarded")!;
    const solo = signal.fn(new SeriesCache(target));
    const lateMarketCache = new SeriesCache(target);
    const beforeAttach = signal.fn(lateMarketCache);
    lateMarketCache.setMarket(new MarketSource([target, crash]));
    assert.equal(beforeAttach[137], 1);
    assert.equal(signal.fn(lateMarketCache)[137], 0, "attaching market data invalidates preexisting relation memos");
    const market = makeUniverse([target, crash]).caches[0];
    const relative = signal.fn(market);
    assert.equal(solo[137], 1, "the standalone uptrend is still valid");
    assert.equal(relative[137], 0, "a large market drawdown suppresses the long relation");

    const quiet = bars("QUIET-USDT", 5, 240);
    const spike = bars("SPIKE-USDT", 5, 240, () => 0.001, (i) => (i === 180 ? 100_000 : 1_000));
    const withActivity = signal.fn(makeUniverse([quiet, spike]).caches[0]);
    assert.equal(withActivity[179], 1, "normal cross-market activity qualifies");
    assert.equal(withActivity[180], 0, "a market-wide activity surge is filtered");

    const guard = relateSpecs().find((spec) => spec.id === "relate-5-trend-guarded")!;
    const balanced = relateSpecs().find((spec) => spec.id === "relate-5-trend-balanced")!;
    const moderateTarget = bars("MODERATE-TARGET-USDT", 5, 240);
    const moderatePartner = bars("MODERATE-PARTNER-USDT", 5, 240, () => 0.001, (i) => (i === 180 ? 6_500 : 1_000));
    const moderateMarket = makeUniverse([moderateTarget, moderatePartner]);
    assert.equal(guard.fn(moderateMarket.caches[0])[180], 0, "Guarded rejects market activity above 3×");
    assert.equal(balanced.fn(moderateMarket.caches[0])[180], 1, "Balanced accepts the same activity below its 4× limit");

    const cutT = target.t[137];
    const fullBars = [target, crash];
    const fullTarget = signal.fn(makeUniverse(fullBars).caches[0]);
    const cutBars = fullBars.map((x) => {
      let n = 0;
      while (n < x.n && x.t[n] <= cutT) n++;
      return cut(x, n);
    });
    const cutTarget = signal.fn(makeUniverse(cutBars).caches[0]);
    assert.deepEqual(cutTarget, fullTarget.slice(0, cutTarget.length), "market context is causal on a time cut");
  });

  it("checks last-bar activity, recent-part activity and activity change separately", () => {
    const id = "relate-5-trend-guarded";
    const spec = relateSpecs().find((x) => x.id === id)!;
    const lastQuiet = bars("LAST-QUIET-USDT", 5, 240, () => 0.001, (i) => (i === 180 ? 0 : 1_000));
    const lastQuietState = spec.fn(new SeriesCache(lastQuiet));
    assert.equal(lastQuietState[179], 1);
    assert.equal(lastQuietState[180], 0, "last-bar activity ratio below 0.55× is rejected");

    const partQuiet = bars("PART-QUIET-USDT", 5, 240, () => 0.001, (i) => {
      if (i >= 161 && i <= 172) return 2_000;
      if (i >= 173 && i <= 176) return 1_000;
      if (i >= 177 && i <= 179) return 600;
      return 1_000;
    });
    assert.equal(spec.fn(new SeriesCache(partQuiet))[180], 0, "recent-part activity below 0.65× is rejected");

    const changeQuiet = bars("CHANGE-QUIET-USDT", 5, 240, () => 0.001, (i) => {
      if (i >= 173 && i <= 176) return 2_000;
      return 1_000;
    });
    assert.equal(spec.fn(new SeriesCache(changeQuiet))[180], 0, "recent-to-prior activity change below 0.65× is rejected");
  });

  it("runs Relate through Base range cells for Micro, Minimal and Short", () => {
    const u = makeUniverse([
      bars("A-1M-USDT", 1, 1_200), bars("B-1M-USDT", 1, 1_200),
      bars("A-5M-USDT", 5, 600), bars("B-5M-USDT", 5, 600),
      bars("A-15M-USDT", 15, 240), bars("B-15M-USDT", 15, 240),
    ]);
    const grid = { ...DEFAULT_SETTINGS.grid, holdH: [16] };
    const cost = DEFAULT_SETTINGS.cost;
    const protects = baseRangeProtects(grid, cost).filter((p) => ["mc", "mn", "sh"].includes(p.tag ?? ""));
    const cases = [
      { ind: "relate-mc-5-trend-guarded@m5", rule: true, ranges: ["mc"] },
      { ind: "relate-mc-5-trend-guarded@m5", rule: "minimal" as const, ranges: ["mc", "mn"] },
      { ind: "relate-5-trend-guarded@m5", rule: true, ranges: ["mn"] },
      { ind: "relate-15-trend-guarded@m15", rule: true, ranges: ["mn", "sh"] },
    ];
    for (const x of cases) {
      const run = runCombo(u, "follow", x.ind, DEFAULT_PROTECT, cost, 1, null);
      assert.ok(run && run.trades.length > 0, `${x.ind}: executable signal and trade tape`);
      const stats = rangeBaseStats(u, "follow", x.ind, protects, cost, null, rangeMinTfOf(grid), x.rule);
      assert.deepEqual(Object.keys(stats ?? {}).sort(), [...x.ranges].sort(), `${x.ind}: exact eligible Base range cells`);
      for (const tag of x.ranges) assert.ok(stats?.[tag], `${x.ind}: ${tag} Base cell`);
    }
  });

  it("keeps Relate IDs independent and applies its 1.10 return-PF floor", () => {
    const a = "follow|relate-1-trend-guarded@m1|mc|tp=0.01|sl=0.01";
    const b = "follow|relate-1x5-trend-guarded@m1|mc|tp=0.01|sl=0.01";
    assert.equal(orderCfgKey(a), a);
    assert.equal(orderCfgKey(b), b);
    assert.notEqual(orderCfgKey(a), orderCfgKey(b));
    const gates = { minPf: 1.05, rangeMinPf: { short: 1.08 } };
    assert.equal(minPfOf(gates, "sh", "relate-1-trend-guarded@m15"), 1.1);
    assert.equal(minPfOf(gates, "sh", "relate-mc-5x15-adaptive-balanced@m5"), 1.1);
    const trendFilter = { session: false, volRegime: false, trendStrength: true, cooldown: false, cooldownBars: 0 };
    assert.equal(tacticKeyFor(trendFilter, "relate-1-adaptive-guarded"), "");
    assert.equal(tacticKeyFor(trendFilter, "relate-1-trend-guarded"), "adx20");
  });
});
