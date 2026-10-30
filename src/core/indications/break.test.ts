import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Bars } from "../domain/types.ts";
import { minPfOf } from "../minimal-coord.ts";
import { BREAK_MICRO_FOCUS_17OCT, DEFAULT_SETTINGS } from "../config.ts";
import { allCombos, makeUniverse, rangeAppliesTo } from "../pipeline/pipeline.ts";
import { orderCfgKey } from "../sim/walkforward.ts";
import { SeriesCache } from "./cache.ts";
import { isMicroInd } from "./micro.ts";
import { INDICATION_BY_ID, indicationState, laneOf } from "./registry.ts";
import {
  BREAK_CONFIG_IDS,
  BREAK_DEFAULT_MICRO_CONFIG_IDS,
  BREAK_CORES,
  BREAK_DRAWDOWN_WINDOWS,
  BREAK_PROFILES,
  BREAK_SUBSETS,
  breakAnchorTf,
  breakSpecs,
  isBreakMicroInd,
} from "./break.ts";

const T0 = Date.UTC(2026, 8, 1);
const stepMs = (tf: number) => tf * 60_000;

function bars(
  sym: string,
  tf: number,
  n: number,
  changeAt: (i: number) => number = () => 0.002,
  volumeAt: (i: number) => number = () => 1_000,
): Bars {
  const out: Bars = {
    sym, tfMin: tf, n,
    t: new Float64Array(n), o: new Float64Array(n), h: new Float64Array(n),
    l: new Float64Array(n), c: new Float64Array(n), v: new Float64Array(n),
  };
  let price = 100;
  for (let i = 0; i < n; i++) {
    const open = price;
    price *= 1 + changeAt(i);
    const wick = Math.max(0.002, Math.max(open, price) * 0.0008);
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
  return { ...b, n, t: b.t.slice(0, n), o: b.o.slice(0, n), h: b.h.slice(0, n), l: b.l.slice(0, n), c: b.c.slice(0, n), v: b.v.slice(0, n) };
}

function breakoutBars(sym: string, tf: number, n: number, direction: 1 | -1 = 1, volumeAt: (i: number) => number = () => 1_000): Bars {
  return bars(sym, tf, n, (i) => {
    const phase = i % 70;
    if (phase < 60) return direction * 0.001;
    if (phase < 69) return -direction * 0.00007;
    return direction * 0.002;
  }, volumeAt);
}

function reclaimBars(direction: 1 | -1, tf = 5): Bars {
  const b = bars(`RECLAIM-${direction}-${tf}`, tf, 180, () => direction * 0.00015);
  const i = 150;
  const atr = new SeriesCache(b).atr(14)[i - 1];
  if (direction === 1) {
    const priorLow = Math.min(...b.l.slice(i - 8, i));
    b.l[i] = priorLow - atr * 0.15;
    b.c[i] = b.o[i] + atr * 0.1;
    b.h[i] = b.c[i] + atr * 0.05;
  } else {
    const priorHigh = Math.max(...b.h.slice(i - 8, i));
    b.h[i] = priorHigh + atr * 0.15;
    b.c[i] = b.o[i] - atr * 0.1;
    b.l[i] = b.c[i] - atr * 0.05;
  }
  return b;
}

function reclaimContext(b: Bars): { reclaim8: Int8Array; don8: Int8Array } {
  const cache = new SeriesCache(b);
  breakSpecs().find((x) => x.id === `break-mc-rel-reclaim8-${b.tfMin}-dd24-balanced`)!.fn(cache);
  return cache.memo("break:shared:context:v1", () => {
    throw new Error("Break shared context was not memoized");
  });
}

describe("Break indication family", () => {
  it("registers every breakout source, timeframe subset, profile and eligible Micro alias", () => {
    const specs = breakSpecs();
    assert.equal(specs.length, 348);
    assert.equal(BREAK_CONFIG_IDS.length, 348);
    assert.equal(new Set(BREAK_CONFIG_IDS).size, 348);
    assert.equal(BREAK_SUBSETS.length, 15);
    assert.equal(BREAK_CORES.length, 6);
    assert.equal(BREAK_PROFILES.length, 2);
    assert.deepEqual(BREAK_DRAWDOWN_WINDOWS.map((x) => x.bars), [24, 48]);
    assert.deepEqual([...new Set(specs.map((x) => x.params.drawdownBars))].sort(), [24, 48]);
    assert.deepEqual(specs.map((x) => x.id).sort(), [...BREAK_CONFIG_IDS].sort());
    for (const spec of specs) {
      assert.equal(INDICATION_BY_ID.get(spec.id)?.kind, "break", spec.id);
      assert.equal(spec.kind, "break", spec.id);
      assert.equal(breakAnchorTf(spec.id), Number(spec.id.match(/^break-(?:mc-)?rel-(?:don|squeeze|retest|don8|retest8|reclaim8)-(1|5|15|30)(?:x(?:5|15|30))*-dd(?:24|48)-(?:guarded|balanced)$/)?.[1]));
      assert.equal(isBreakMicroInd(spec.id), spec.id.startsWith("break-mc-rel-"));
      assert.equal(isMicroInd(spec.id), spec.id.startsWith("break-mc-rel-"));
    }
  });

  it("routes each config only on its anchor lane and honors the Micro floor", () => {
    const focus = BREAK_CONFIG_IDS.map((id) => `follow|${id}`);
    const combos = allCombos(focus, [], [1, 5, 15, 30], 5);
    assert.equal(combos.length, 348);
    assert.equal(new Set(combos.map((x) => x.ind)).size, 348);
    for (const combo of combos) {
      const lane = laneOf(combo.ind);
      assert.equal(lane.combined, false, combo.ind);
      assert.equal(lane.tf, breakAnchorTf(lane.base), combo.ind);
    }
    assert.equal(allCombos(focus, ["break"], [1, 5, 15, 30], 5).length, 0);

    const rules = { enabled: () => true, minTf: { mc: 5, mn: 1, sh: 15 }, microOwnInds: true };
    const mc5 = "break-mc-rel-don-5-dd24-guarded@m5";
    const mc15 = "break-mc-rel-don-15-dd48-balanced@m15";
    const regular5 = "break-rel-don-5-dd24-guarded@m5";
    assert.equal(rangeAppliesTo(mc5, "mc", rules), true);
    assert.equal(rangeAppliesTo(mc5, "mn", rules), false);
    assert.equal(rangeAppliesTo(mc5, "sh", rules), false);
    assert.equal(rangeAppliesTo(mc15, "mc", rules), true);
    assert.equal(rangeAppliesTo(mc15, "sh", rules), false);
    assert.equal(rangeAppliesTo(regular5, "mc", rules), false);
    assert.equal(rangeAppliesTo(regular5, "mn", rules), true);
    assert.equal(rangeAppliesTo("break-rel-don-15-dd24-balanced@m15", "sh", rules), true);
    assert.equal(rangeAppliesTo(mc5, "mn", { ...rules, microOwnInds: "minimal" }), true);
    assert.equal(
      minPfOf({ minPf: 1, rangeMinPf: { short: 1.05 } }, "sh", "break-rel-don-5-dd24-guarded"),
      1.1,
      "first-class Break configs retain the minimum profitability gate",
    );
  });

  it("keeps Break source and lane identity in order deduplication", () => {
    const don = "follow|break-rel-don-5-dd24-guarded@m5|normal|tp0.5|sl0.2";
    const squeeze = "follow|break-rel-squeeze-5-dd24-guarded@m5|normal|tp0.5|sl0.2";
    const micro = "follow|break-mc-rel-don-5-dd24-guarded@m5|normal|tp0.5|sl0.2";
    assert.equal(orderCfgKey(don), don);
    assert.equal(orderCfgKey(squeeze), squeeze);
    assert.equal(orderCfgKey(micro), micro);
    assert.notEqual(orderCfgKey(don), orderCfgKey(squeeze));
  });

  it("registers reclaim as28 opt-in Micro configs without changing the sixty default Break identities", () => {
    const optional = breakSpecs().filter((x) => x.id.includes("-rel-reclaim8-"));
    const expected = ["5", "15", "5x15", "30", "5x30", "15x30", "5x15x30"].flatMap((tf) => ["24", "48"].flatMap((dd) =>
      ["guarded", "balanced"].map((profile) => `break-mc-rel-reclaim8-${tf}-dd${dd}-${profile}`),
    ));
    assert.deepEqual(optional.map((x) => x.id).sort(), expected.sort());
    assert.equal(BREAK_DEFAULT_MICRO_CONFIG_IDS.length, 60);
    assert.deepEqual(BREAK_DEFAULT_MICRO_CONFIG_IDS, BREAK_CONFIG_IDS.filter((x) => isBreakMicroInd(x) &&
      !x.includes("-rel-reclaim8-") && !/-[\dx]*30-dd/.test(x)));
    assert.equal(BREAK_MICRO_FOCUS_17OCT.length, 60);
    assert.ok(DEFAULT_SETTINGS.focus.every((x) => !x.includes("-rel-reclaim8-")), "registration cannot promote a new source into existing defaults");
    const combos = allCombos(expected.map((id) => `follow|${id}`), [], [1, 5, 15, 30], 5);
    assert.equal(combos.length, 28);
    for (const combo of combos) {
      const lane = laneOf(combo.ind);
      assert.equal(lane.tf, breakAnchorTf(lane.base));
      assert.ok(lane.tf === 5 || lane.tf === 15 || lane.tf === 30);
      const key = `follow|${combo.ind}|normal|tp0.5|sl0.2`;
      assert.equal(orderCfgKey(key), key);
      assert.notEqual(orderCfgKey(key), orderCfgKey(key.replace("reclaim8", "retest8")));
    }
  });

  it("reclaims prior eight-bar edges with mirrored completed long and short sweeps", () => {
    for (const direction of [1, -1] as const) {
      for (const tf of [5, 15]) {
        const b = reclaimBars(direction, tf);
        const context = reclaimContext(b);
        assert.equal(context.reclaim8[150], direction, `${tf}m mirrored reclaim source`);
        assert.equal(context.don8[150], 0, "returning inside the swept edge is distinct from a sustained channel break");
        const id = `break-mc-rel-reclaim8-${tf}-dd24-balanced`;
        const state = breakSpecs().find((x) => x.id === id)!.fn(new SeriesCache(b));
        assert.equal(state[150], direction, `${id} keeps the existing independent trend/activity/drawdown gates`);
        const prefix = cut(b, 151);
        assert.deepEqual(reclaimContext(prefix).reclaim8, context.reclaim8.slice(0, 151), "raw event never reads a future candle");
        for (const spec of breakSpecs().filter((x) => x.id.includes("-rel-reclaim8-") && breakAnchorTf(x.id) === tf)) {
          assert.deepEqual(spec.fn(new SeriesCache(prefix)), spec.fn(new SeriesCache(b)).slice(0, 151), `${spec.id} prefix remains causal`);
        }
      }
    }
  });

  it("rejects sustained breaks, oversized wick penetration and incomplete reclaim bodies", () => {
    for (const direction of [1, -1] as const) {
      const sustained = reclaimBars(direction);
      const at = 150;
      const priorAtr = new SeriesCache(sustained).atr(14)[at - 1];
      const edge = direction === 1 ? Math.min(...sustained.l.slice(at - 8, at)) : Math.max(...sustained.h.slice(at - 8, at));
      sustained.c[at] = edge - direction * priorAtr * 0.05;
      sustained.o[at] = edge + direction * priorAtr * 0.2;
      assert.equal(reclaimContext(sustained).reclaim8[at], 0, "close outside the prior edge cannot reclaim it");

      const touch = reclaimBars(direction);
      if (direction === 1) touch.l[at] = edge;
      else touch.h[at] = edge;
      assert.equal(reclaimContext(touch).reclaim8[at], 0, "touching the channel edge has no positive sweep penetration");

      const oversized = reclaimBars(direction);
      if (direction === 1) oversized.l[at] = edge - priorAtr * 1.5001;
      else oversized.h[at] = edge + priorAtr * 1.5001;
      assert.equal(reclaimContext(oversized).reclaim8[at], 0, "penetration uses prior ATR, so the wick cannot normalize its own excess");

      const wrongBody = reclaimBars(direction);
      wrongBody.o[at] = wrongBody.c[at] + direction * priorAtr * 0.01;
      assert.equal(reclaimContext(wrongBody).reclaim8[at], 0, "the body must agree with the reclaim direction");

      const weakClose = reclaimBars(direction);
      if (direction === 1) weakClose.h[at] = weakClose.l[at] + (weakClose.c[at] - weakClose.l[at]) / 0.64;
      else weakClose.l[at] = weakClose.h[at] - (weakClose.h[at] - weakClose.c[at]) / 0.64;
      assert.equal(reclaimContext(weakClose).reclaim8[at], 0, "the close must finish within its directional 35% of the range");
    }
  });

  it("retains independent profile activity qualification and shares one bounded source context", () => {
    const b = reclaimBars(1);
    b.v[150] = 600;
    const cache = new SeriesCache(b);
    const guarded = breakSpecs().find((x) => x.id === "break-mc-rel-reclaim8-5-dd24-guarded")!;
    const balanced = breakSpecs().find((x) => x.id === "break-mc-rel-reclaim8-5-dd24-balanced")!;
    assert.equal(guarded.fn(cache)[150], 0, "Guarded independently rejects activity below its unchanged minimum");
    assert.equal(balanced.fn(cache)[150], 1, "Balanced independently retains its unchanged lower threshold");
    const shared = cache.memo<{ reclaim8: Int8Array }>("break:shared:context:v1", () => {
      throw new Error("Break shared context was not memoized");
    });
    for (const spec of breakSpecs().filter((x) => x.id.includes("-rel-reclaim8-") && breakAnchorTf(x.id) === 5)) {
      const first = spec.fn(cache);
      assert.deepEqual(spec.fn(cache), first, `${spec.id} repeated calculation keeps identical output`);
      assert.equal(cache.memo("break:shared:context:v1", () => null), shared, "all profiles/subsets reuse one source context");
    }
    assert.equal(shared.reclaim8.byteLength, b.n, "the source adds only one Int8 array per lane context");
    cache.clear(["bot:"]);
    const rebuilt = balanced.fn(cache);
    assert.equal(rebuilt[150], 1, "releasing the shared context preserves fresh calculation results");
    assert.notEqual(cache.memo("break:shared:context:v1", () => null), shared, "the source context follows the existing Base release lifetime");
  });

  it("rewarms reclaim history after gaps and cannot carry a previous sweep into a new state", () => {
    const normal = reclaimBars(1);
    const gap = reclaimBars(1);
    for (let i = 149; i < gap.n; i++) gap.t[i] += stepMs(5);
    assert.equal(reclaimContext(normal).reclaim8[150], 1);
    assert.equal(reclaimContext(gap).reclaim8[150], 0, "a prior-segment channel/ATR cannot qualify a post-gap sweep");
    const opposite = reclaimBars(-1);
    const normalContext = reclaimContext(normal);
    const oppositeContext = reclaimContext(opposite);
    assert.equal(oppositeContext.reclaim8[150], -1);
    assert.equal(normalContext.reclaim8[151], 0, "a reclaim is a same-bar event with no pending continuation");
    assert.equal(oppositeContext.reclaim8[151], 0, "opposite direction cannot inherit another bar's reclaim");
  });

  it("emits causal long and short Break states and waits for completed higher bars", () => {
    const specs = breakSpecs();
    for (const tfs of BREAK_SUBSETS) {
      const tf = Math.min(...tfs);
      const n = Math.floor(4320 / tf);
      const up = new SeriesCache(breakoutBars(`UP-${tfs.join("x")}`, tf, n));
      const dn = new SeriesCache(breakoutBars(`DN-${tfs.join("x")}`, tf, n, -1));
      for (const core of BREAK_CORES) {
        if (core.microOnly && tf < 5) continue;
        if (core.id === "reclaim8") continue; // A sustained breakout does not contain a failed-break reclaim.
        const id = `break-${core.microOnly ? "mc-" : ""}rel-${core.id}-${tfs.join("x")}-dd24-balanced`;
        const spec = specs.find((x) => x.id === id)!;
        const upState = spec.fn(up);
        const dnState = spec.fn(dn);
        assert.ok(upState.some((x) => x === 1), `${id} long breakout`);
        assert.ok(dnState.some((x) => x === -1), `${id} short breakout`);
        if (tf >= 5 && !core.microOnly) {
          const micro = specs.find((x) => x.id === id.replace("break-rel-", "break-mc-rel-"))!;
          assert.deepEqual(micro.fn(up), upState, `${micro.id} preserves long direction`);
          assert.deepEqual(micro.fn(dn), dnState, `${micro.id} preserves short direction`);
        }
      }
    }

    const b = breakoutBars("CAUSAL", 1, 1_500);
    const id = "break-rel-don-1x5x15-dd48-balanced@m1";
    const full = indicationState(id, new SeriesCache(b))!;
    const n = 850;
    assert.deepEqual(indicationState(id, new SeriesCache(cut(b, n)))!, full.slice(0, n));
    assert.deepEqual(indicationState("break-rel-don-1-dd24-balanced@m1", new SeriesCache(b))!.slice(0, n),
      indicationState("break-rel-don-1-dd24-balanced@m1", new SeriesCache(cut(b, n)))!, "prefix output is stable");
  });

  it("builds the squeeze-expansion and retest sources independently", () => {
    const retestCache = new SeriesCache(breakoutBars("RETEST", 5, 240));
    breakSpecs().find((x) => x.id === "break-rel-retest-5-dd24-balanced")!.fn(retestCache);
    const retestContext = retestCache.memo<{ retest: Int8Array }>("break:shared:context:v1", () => {
      throw new Error("Break shared context was not memoized");
    });
    assert.ok(retestContext.retest.some((x) => x !== 0), "a retest after the channel break is a distinct source event");

    const fastCache = new SeriesCache(breakoutBars("FAST-RETEST", 5, 240));
    breakSpecs().find((x) => x.id === "break-mc-rel-retest8-5-dd24-balanced")!.fn(fastCache);
    const fastContext = fastCache.memo<{ retest8: Int8Array; don8: Int8Array; don: Int8Array }>("break:shared:context:v1", () => {
      throw new Error("Break shared context was not memoized");
    });
    assert.ok(fastContext.retest8.some((x) => x !== 0), "the short-channel Micro retest is an independent event source");
    assert.ok(fastContext.don8.some((x) => x !== 0), "the 8-bar Micro channel emits its own short-channel break events");

    const squeezeBars = bars("SQUEEZE", 5, 220, (i) =>
      i < 80 ? (i % 2 ? 0.0003 : -0.0003) : i === 80 ? 0.004 : 0.0004,
    );
    const squeezeCache = new SeriesCache(squeezeBars);
    breakSpecs().find((x) => x.id === "break-rel-squeeze-5-dd48-balanced")!.fn(squeezeCache);
    const squeezeContext = squeezeCache.memo<{ squeeze: Int8Array }>("break:shared:context:v1", () => {
      throw new Error("Break shared context was not memoized");
    });
    assert.ok(squeezeContext.squeeze.some((x) => x !== 0), "compression followed by expansion creates a squeeze event");
  });

  it("cancels a pending retest after a fresh opposite channel break", () => {
    const b = bars("RETEST-FLIP", 5, 80, () => 0);
    for (let i = 0; i < b.n; i++) {
      b.o[i] = 100;
      b.h[i] = 101;
      b.l[i] = 99;
      b.c[i] = 100;
    }
    // Break above the prior range at bar 40, then break below it with a wide reversal wick at bar 42. The
    // following rebound crosses the old long retest level but stays beneath the new range high of 106.
    b.o[40] = 100; b.h[40] = 103; b.l[40] = 99; b.c[40] = 102;
    b.o[42] = 102; b.h[42] = 106; b.l[42] = 97; b.c[42] = 98;
    b.o[43] = 100; b.h[43] = 103; b.l[43] = 100; b.c[43] = 102;

    for (const [id, retestKey, breakKey] of [
      ["break-rel-retest-5-dd24-balanced", "retest", "don"],
      ["break-mc-rel-retest8-5-dd24-balanced", "retest8", "don8"],
    ] as const) {
      const cache = new SeriesCache(b);
      breakSpecs().find((x) => x.id === id)!.fn(cache);
      const context = cache.memo<Record<string, Int8Array>>("break:shared:context:v1", () => {
        throw new Error("Break shared context was not memoized");
      });
      assert.equal(context[breakKey][42], -1, `${id} observes the opposite down break`);
      assert.equal(context[retestKey][43], 0, `${id} cannot emit the stale long retest after the reversal`);
    }
  });

  it("cancels a pending short retest after a fresh opposite channel break", () => {
    const b = bars("RETEST-FLIP-SHORT", 5, 80, () => 0);
    for (let i = 0; i < b.n; i++) {
      b.o[i] = 100;
      b.h[i] = 101;
      b.l[i] = 99;
      b.c[i] = 100;
    }
    // Break below the prior range at bar 40, then break above it at bar 42. Bar 43 closes back
    // below the old short retest level while staying above the new channel low.
    b.o[40] = 100; b.h[40] = 101; b.l[40] = 97; b.c[40] = 98;
    b.o[42] = 100; b.h[42] = 103; b.l[42] = 99; b.c[42] = 102;
    b.o[43] = 100; b.h[43] = 100; b.l[43] = 97; b.c[43] = 98;

    for (const [id, retestKey, breakKey] of [
      ["break-rel-retest-5-dd24-balanced", "retest", "don"],
      ["break-mc-rel-retest8-5-dd24-balanced", "retest8", "don8"],
    ] as const) {
      const cache = new SeriesCache(b);
      breakSpecs().find((x) => x.id === id)!.fn(cache);
      const context = cache.memo<Record<string, Int8Array>>("break:shared:context:v1", () => {
        throw new Error("Break shared context was not memoized");
      });
      assert.equal(context[breakKey][42], 1, `${id} observes the opposite up break`);
      assert.equal(context[retestKey][43], 0, `${id} cannot emit the stale short retest after the reversal`);
    }
  });

  it("keeps 24- and 48-bar price drawdown windows independent", () => {
    const b = bars("DD-WINDOWS", 5, 180, (i) => (i < 60 ? 0.001 : i < 95 ? -0.0003 : 0.0002));
    const k = new SeriesCache(b);
    breakSpecs().find((x) => x.id === "break-rel-don-5-dd24-balanced")!.fn(k);
    const context = k.memo<{ priceDd24Long: Float32Array; priceDd48Long: Float32Array }>("break:shared:context:v1", () => {
      throw new Error("Break shared context was not memoized");
    });
    assert.ok(context.priceDd48Long[90] > context.priceDd24Long[90], "48 bars retain the older peak after it leaves the 24-bar range");
  });

  it("resets warmup on data gaps and evaluates last-bar activity separately", () => {
    const gap = breakoutBars("GAP", 5, 260);
    for (let i = 140; i < gap.n; i++) gap.t[i] += stepMs(5);
    const spec = breakSpecs().find((x) => x.id === "break-rel-don-5-dd24-balanced")!;
    const state = spec.fn(new SeriesCache(gap));
    assert.ok(state.slice(140, 178).every((x) => x === 0), "post-gap trend and activity need fresh warmup");
    assert.ok(state.slice(178).some((x) => x === 1), "post-gap Break recovers after warmup");

    const normal = breakoutBars("ACTIVITY", 5, 260);
    const reduced = breakoutBars("ACTIVITY-REDUCED", 5, 260, 1, (i) => (i === 69 ? 600 : 1_000));
    const guarded = breakSpecs().find((x) => x.id === "break-rel-don-5-dd24-guarded")!;
    const balanced = spec;
    assert.equal(guarded.fn(new SeriesCache(normal))[69], 1);
    assert.equal(guarded.fn(new SeriesCache(reduced))[69], 0, "Guarded rejects low last-bar activity");
    assert.equal(balanced.fn(new SeriesCache(reduced))[69], 1, "Balanced retains its independent lower activity threshold");
  });

  it("uses market drawdown and activity causally when a market reference exists", () => {
    const target = breakoutBars("TARGET", 5, 300);
    const marketSelloff = breakoutBars("SELL", 5, 300, 1, (i) => (i === 139 ? -0.08 : 1_000));
    const id = "break-rel-don-5-dd48-guarded";
    const solo = breakSpecs().find((x) => x.id === id)!.fn(new SeriesCache(target));
    const market = makeUniverse([target, marketSelloff]).caches[0];
    const withMarket = breakSpecs().find((x) => x.id === id)!.fn(market);
    assert.equal(solo[139], 1, "standalone signal has no cross-market filter");
    assert.equal(withMarket[139], 0, "market drawdown/against-move suppresses the long signal");

    const fullUniverse = makeUniverse([target, marketSelloff]);
    const fullState = breakSpecs().find((x) => x.id === id)!.fn(fullUniverse.caches[0]);
    const cutAt = 139;
    const cutMarket = makeUniverse([cut(target, cutAt + 1), cut(marketSelloff, cutAt + 1)]);
    assert.deepEqual(
      breakSpecs().find((x) => x.id === id)!.fn(cutMarket.caches[0]),
      fullState.slice(0, cutAt + 1),
      "market-relative features do not read bars beyond the evaluation time",
    );
  });

  it("scores market and residual z-values against prior returns only", () => {
    const shockAt = 150;
    const target = bars("TARGET-Z", 5, 240, (i) =>
      i === shockAt ? 0.012 : Math.sin(i * 0.47) * 0.001,
    );
    const peer = bars("PEER-Z", 5, 240, (i) =>
      i === shockAt ? 0.008 : Math.cos(i * 0.23) * 0.0008,
    );
    const cache = makeUniverse([target, peer]).caches[0];
    breakSpecs().find((x) => x.id === "break-rel-don-5-dd48-balanced")!.fn(cache);
    const x = cache.memo<{ marketZ: Float32Array; residualZ: Float32Array }>("break:shared:context:v1", () => {
      throw new Error("Break shared context was not memoized");
    });
    const market = cache.market()!;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let j = shockAt - 60; j < shockAt; j++) {
      xs.push(market.ret[j]);
      ys.push(Math.log(target.c[j] / target.c[j - 1]));
    }
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    let vx = 0, vy = 0, cov = 0;
    for (let j = 0; j < xs.length; j++) {
      vx += (xs[j] - meanX) ** 2;
      vy += (ys[j] - meanY) ** 2;
      cov += (xs[j] - meanX) * (ys[j] - meanY);
    }
    vx /= xs.length;
    vy /= xs.length;
    cov /= xs.length;
    const marketMove = market.idx[shockAt] - market.idx[shockAt - 12];
    const marketZ = marketMove / (Math.sqrt(vx) * Math.sqrt(12));
    const beta = cov / vx;
    const residualSd = Math.sqrt(vy - (cov * cov) / vx);
    const residualZ =
      (Math.log(target.c[shockAt] / target.c[shockAt - 12]) - beta * marketMove) /
      (residualSd * Math.sqrt(12));
    assert.ok(Math.abs(x.marketZ[shockAt] - marketZ) < 1e-5, "current shock must not inflate its own market-volatility baseline");
    assert.ok(Math.abs(x.residualZ[shockAt] - residualZ) < 1e-5, "current shock must not refit its own beta or residual baseline");
  });
});
