import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Bars } from "../domain/types.ts";
import { minPfOf } from "../minimal-coord.ts";
import { allCombos, makeUniverse, rangeAppliesTo } from "../pipeline/pipeline.ts";
import { orderCfgKey } from "../sim/walkforward.ts";
import { SeriesCache } from "./cache.ts";
import { isMicroInd } from "./micro.ts";
import { INDICATION_BY_ID, indicationState, laneOf } from "./registry.ts";
import {
  BREAK_CONFIG_IDS,
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

describe("Break indication family", () => {
  it("registers every breakout source, timeframe subset, profile and eligible Micro alias", () => {
    const specs = breakSpecs();
    assert.equal(specs.length, 144);
    assert.equal(BREAK_CONFIG_IDS.length, 144);
    assert.equal(new Set(BREAK_CONFIG_IDS).size, 144);
    assert.equal(BREAK_SUBSETS.length, 7);
    assert.equal(BREAK_CORES.length, 5);
    assert.equal(BREAK_PROFILES.length, 2);
    assert.deepEqual(BREAK_DRAWDOWN_WINDOWS.map((x) => x.bars), [24, 48]);
    assert.deepEqual([...new Set(specs.map((x) => x.params.drawdownBars))].sort(), [24, 48]);
    assert.deepEqual(specs.map((x) => x.id).sort(), [...BREAK_CONFIG_IDS].sort());
    for (const spec of specs) {
      assert.equal(INDICATION_BY_ID.get(spec.id)?.kind, "break", spec.id);
      assert.equal(spec.kind, "break", spec.id);
      assert.equal(breakAnchorTf(spec.id), Number(spec.id.match(/^break-(?:mc-)?rel-(?:don|squeeze|retest|don8|retest8)-(1|5|15)(?:x(?:5|15))*-dd(?:24|48)-(?:guarded|balanced)$/)?.[1]));
      assert.equal(isBreakMicroInd(spec.id), spec.id.startsWith("break-mc-rel-"));
      assert.equal(isMicroInd(spec.id), spec.id.startsWith("break-mc-rel-"));
    }
  });

  it("routes each config only on its anchor lane and honors the Micro floor", () => {
    const focus = BREAK_CONFIG_IDS.map((id) => `follow|${id}`);
    const combos = allCombos(focus, [], [1, 5, 15, 30], 5);
    assert.equal(combos.length, 144);
    assert.equal(new Set(combos.map((x) => x.ind)).size, 144);
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

  it("emits causal long and short Break states and waits for completed higher bars", () => {
    const specs = breakSpecs();
    for (const tfs of BREAK_SUBSETS) {
      const tf = Math.min(...tfs);
      const n = tf === 1 ? 1_500 : 600;
      const up = new SeriesCache(breakoutBars(`UP-${tfs.join("x")}`, tf, n));
      const dn = new SeriesCache(breakoutBars(`DN-${tfs.join("x")}`, tf, n, -1));
      for (const core of BREAK_CORES) {
        if (core.microOnly && tf < 5) continue;
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
