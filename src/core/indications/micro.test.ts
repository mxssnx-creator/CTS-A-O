// Micro indications ("mc-…"): one-bar reversal events, causal (bar i reads bars 0..i only), and with
// grid.micro.ownInds the Micro range trades only them while they trade only Micro cells.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bbWidthRank, microSpecs, isMicroInd, isMicroRelation, microTrend, MICRO_QUIET, MICRO_TREND } from "./micro.ts";
import { INDICATION_BY_ID } from "./registry.ts";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapes, dcaProtectGrid } from "../sim/walkforward.ts";
import { DEFAULT_AXIS, DEFAULT_DCA } from "../config.ts";
import type { Bars, Protect } from "../domain/types.ts";

const t0 = Date.UTC(2026, 8, 20);
const bars = () => barsFromCandles("A-USDT", 1, syntheticCandles("A", 1, 1500, t0));

describe("micro indications", () => {
  it("are registered, fire on some bars, and are causal", () => {
    const full = new SeriesCache(bars());
    let firing = 0;
    for (const s of microSpecs()) {
      assert.ok(INDICATION_BY_ID.get(s.id), s.id);
      assert.ok(isMicroInd(s.id));
      const a = s.fn(full);
      // no market reference attached: a relation is neutral, never a throw
      if (isMicroRelation(s.id)) assert.ok(a.length === full.b.n && a.every((x) => x === 0), `${s.id} neutral alone`);
      // smooth synthetic bars hold few spikes: most, not every, indication fires on them
      if (a.some((x) => x !== 0)) firing++;
      // the state at bar i is the same when computed on bars 0..i only
      const b = bars();
      const cut = 900;
      const part = new SeriesCache({ ...b, n: cut + 1, t: b.t.slice(0, cut + 1), o: b.o.slice(0, cut + 1), h: b.h.slice(0, cut + 1), l: b.l.slice(0, cut + 1), c: b.c.slice(0, cut + 1), v: b.v.slice(0, cut + 1) });
      const p = s.fn(part);
      for (let i = 0; i <= cut; i++) assert.equal(p[i], a[i], `${s.id} bar ${i}`);
    }
    // (the market-relation ones need a universe: on a series of its own they are neutral — micro-rel.test.ts)
    const own = microSpecs().filter((s) => !isMicroRelation(s.id)).length;
    assert.ok(firing >= own - 2, `${firing} fire`);
  });

  it("with Micro's own indications, Micro cells go only to them and they take only Micro cells", () => {
    const u = makeUniverse([bars()]);
    const protects: Protect[] = [
      { tp: 0.003, sl: 0.003, trail: 0, hold: 64, tag: "mc" },
      { tp: 0.012, sl: 0.012, trail: 0, hold: 64, tag: "mn" },
    ];
    const only = new Set(["follow|mc-rsi2-5@m1", "follow|rsi-mom-14-20@m1"]);
    const got = (own: boolean) =>
      buildTapes(u, protects, 0.002, undefined, only, null, undefined, { minSl: 0, minTrail: 0, microOwnInds: own })
        .map((x) => `${x.ind} ${x.protect.tag}`)
        .sort();
    assert.deepEqual(got(true), ["mc-rsi2-5@m1 mc", "rsi-mom-14-20@m1 mn"]);
    assert.equal(got(false).length, 4);
  });

  it("every validated pair, a Micro indication included, builds every strategy set (Normal, Trailing, DCA, DCA Active, Axis)", () => {
    const u = makeUniverse([bars()]);
    const protects: Protect[] = [
      { tp: 0.003, sl: 0.003, trail: 0, hold: 64, tag: "mc" },
      { tp: 0.003, sl: 0.003, trail: 0.002, hold: 64, tag: "mc" },
      { tp: 0.012, sl: 0.012, trail: 0, hold: 64 },
      { tp: 0.012, sl: 0.012, trail: 0.006, hold: 64 },
    ];
    const only = new Set(["follow|mc-rsi2-5@m1", "follow|rsi-mom-14-20@m1"]);
    const dcaOpt = { protects: dcaProtectGrid(1, DEFAULT_DCA), dca: DEFAULT_DCA, axis: DEFAULT_AXIS };
    const tapes = buildTapes(u, protects, 0.002, dcaOpt, only, null, undefined, { minSl: 0, minTrail: 0, microOwnInds: true });
    for (const ind of ["mc-rsi2-5@m1", "rsi-mom-14-20@m1"]) {
      const kinds = new Set(tapes.filter((x) => x.ind === ind).map((x) => x.kind));
      assert.deepEqual([...kinds].sort(), ["axis", "dca", "dca-active", "normal", "trailing"], ind);
    }
    // every config is its own tape: ids are unique
    assert.equal(new Set(tapes.map((x) => x.id)).size, tapes.length);
  });
});

// ── trend-aligned Micro events: constructed patterns and causality ──────────────────────────────────────────────

/** 1m bars from per-bar returns: open = previous close, a 0.02 % wick each side */
function fromReturns(rets: readonly number[], t = t0): Bars {
  const n = rets.length;
  const b: Bars = {
    sym: "P-USDT",
    tfMin: 1,
    n,
    t: new Float64Array(n),
    o: new Float64Array(n),
    h: new Float64Array(n),
    l: new Float64Array(n),
    c: new Float64Array(n),
    v: new Float64Array(n).fill(1000),
  };
  let p = 100;
  for (let i = 0; i < n; i++) {
    const o = p;
    p = o * (1 + rets[i]);
    b.t[i] = t + i * 60_000;
    b.o[i] = o;
    b.c[i] = p;
    b.h[i] = Math.max(o, p) * 1.0002;
    b.l[i] = Math.min(o, p) * 0.9998;
  }
  return b;
}
const fn = (id: string) => microSpecs().find((s) => s.id === id)!.fn;
/** a steady trend (alternating closes so RSI(2) stays off its extremes), then `tail` */
const trendThen = (dir: 1 | -1, tail: readonly number[]) => [
  ...Array.from({ length: 400 }, (_, i) => dir * (i % 2 ? 0.0015 : -0.0005)),
  ...tail,
];

describe("trend-aligned micro indications", () => {
  // a sharp two-bar dip, then a bar closing back above the dip bar's high
  const dip = [-0.004, -0.004, 0.006];
  const last = (a: Int8Array, k = 0) => a[a.length - 1 - k];

  it("the 4× timeframe trend reads completed higher bars only and follows the trend", () => {
    const up = new SeriesCache(fromReturns(trendThen(1, [])));
    const dn = new SeriesCache(fromReturns(trendThen(-1, [])));
    assert.equal(last(microTrend(up)), 1);
    assert.equal(last(microTrend(dn)), -1);
    // before 4 × 50 bars (the EMA's warm-up on the 4× bars) there is no trend
    assert.equal(microTrend(up)[150], 0);
    assert.deepEqual(MICRO_TREND, { factor: 4, ema: 50 });
  });

  it("RSI(2) with the trend: a dip in an uptrend is bought, the same dip in a downtrend is not", () => {
    const up = new SeriesCache(fromReturns(trendThen(1, dip.slice(0, 2))));
    assert.equal(last(fn("mc-trsi2-10")(up)), 1);
    assert.equal(last(fn("mc-rsi2-10")(up)), 1, "the plain event fires too");
    const dn = new SeriesCache(fromReturns(trendThen(-1, dip.slice(0, 2))));
    assert.equal(last(fn("mc-rsi2-10")(dn)), 1, "a dip in a downtrend is a plain RSI(2) event …");
    assert.equal(last(fn("mc-trsi2-10")(dn)), 0, "… but not one with the trend");
  });

  it("the turn: fires on the bar closing beyond the stretched bar, with the trend, not on the extreme bar", () => {
    const k = new SeriesCache(fromReturns(trendThen(1, dip)));
    const a = fn("mc-turn-10")(k);
    assert.equal(last(a), 1, "the turn bar");
    assert.equal(last(a, 1), 0, "not the extreme bar");
    // no turn: the bar after the dip closes lower again
    const k2 = new SeriesCache(fromReturns(trendThen(1, [-0.004, -0.004, -0.001])));
    assert.equal(last(fn("mc-turn-10")(k2)), 0);
    // the mirror in a downtrend: a rip, then a bar closing below the rip bar's low → short
    const k3 = new SeriesCache(fromReturns(trendThen(-1, [0.004, 0.004, -0.006])));
    assert.equal(last(fn("mc-turn-10")(k3)), -1);
  });

  it("the streak turn: four falling closes, then a close above the fourth bar's high, in an uptrend", () => {
    const k = new SeriesCache(fromReturns(trendThen(1, [-0.001, -0.001, -0.001, -0.001, 0.003])));
    const a = fn("mc-tstreak-4")(k);
    assert.equal(last(a), 1);
    assert.equal(last(a, 1), 0);
  });

  it("are causal: appending other future bars never changes an earlier output", () => {
    const head = trendThen(1, [-0.004, -0.004, 0.006, 0.001, -0.002]);
    const a = fromReturns([...head, ...Array.from({ length: 300 }, (_, i) => (i % 3 ? 0.002 : -0.003))]);
    const b = fromReturns([...head, ...Array.from({ length: 300 }, (_, i) => (i % 2 ? -0.004 : 0.001))]);
    const ids = ["mc-trsi2-10", "mc-tbbx-25", "mc-tvwapd-3", "mc-tz-25", "mc-turn-10", "mc-tstreak-4", "mc-qrsi2-5"];
    for (const id of ids) {
      const x = fn(id)(new SeriesCache(a));
      const y = fn(id)(new SeriesCache(b));
      for (let i = 0; i < head.length; i++) assert.equal(x[i], y[i], `${id} bar ${i}`);
    }
    const tx = microTrend(new SeriesCache(a));
    const ty = microTrend(new SeriesCache(b));
    for (let i = 0; i < head.length; i++) assert.equal(tx[i], ty[i], `trend bar ${i}`);
  });

  it("every Micro indication is registered under the mc- prefix with a unique id", () => {
    const ids = microSpecs().map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.ok(isMicroInd(id), id);
      assert.equal(INDICATION_BY_ID.get(id)?.kind, "active", id);
    }
    // 35 stretch / trend / quiet / relation events + 23 continuation, break, activity, RSI and pattern events
    assert.equal(ids.length, 58);
    assert.equal(ids.filter(isMicroRelation).length, 16, "12 market relations + 4 AND combinations");
  });

  it("continuation, break and pattern events fire on their constructed pattern, the right way, once", () => {
    const flat = (n: number) => Array.from({ length: n }, () => 0);
    // a 10-bar break: alternating small bars (equal ranges), then one wide bar closing above the prior 10-bar high
    {
      const b = fromReturns([...Array.from({ length: 90 }, (_, i) => (i % 2 ? 0.0005 : -0.0005)), 0.01, 0, 0]);
      const ev = fn("mc-brk-10")(new SeriesCache(b));
      assert.equal(ev[90], 1, "the break bar");
      assert.equal(ev.filter((x) => x !== 0).length, 1, "only the break bar");
      const m = fn("mc-brk-10")(new SeriesCache(fromReturns([...Array.from({ length: 90 }, (_, i) => (i % 2 ? 0.0005 : -0.0005)), -0.01, 0, 0])));
      assert.equal(m[90], -1, "the mirror");
    }
    // an inside bar (a flat bar inside the previous one) broken upward by the next close
    {
      const b = fromReturns([...flat(30), 0.005, 0, 0.003, 0]);
      const ev = fn("mc-ibrk")(new SeriesCache(b));
      assert.equal(ev[32], 1, "the bar closing above the mother bar's high");
      assert.equal(ev[33], 0);
    }
    // a pullback to the EMA(8) in an uptrend, resumed by a close back above it
    {
      const b = fromReturns(trendThen(1, [-0.003, -0.003, -0.003, 0.008, 0.001]));
      const ev = fn("mc-tpull-8")(new SeriesCache(b));
      assert.equal(ev[403], 1, "the resumption bar");
      assert.ok(!ev.includes(-1), "never against the trend");
      const m = fn("mc-tpull-8")(new SeriesCache(fromReturns(trendThen(-1, [0.003, 0.003, 0.003, -0.008, -0.001]))));
      assert.equal(m[403], -1, "the mirror");
    }
    // a 3-bar resumption with the trend right after one counter-trend close
    {
      const b = fromReturns(trendThen(1, [-0.002, 0.001, 0.001, 0.001, 0.001]));
      const ev = fn("mc-tmom-3")(new SeriesCache(b));
      assert.equal(ev[403], 1, "the third close with the trend after the counter close");
      assert.equal(ev[404], 0, "not again on the fourth");
    }
    // an RSI(14) divergence: a new closing low while the RSI holds above its window low
    {
      const b = fromReturns([
        ...flat(40),
        ...Array.from({ length: 12 }, () => -0.004), // a steep run down: the RSI low of the window
        ...Array.from({ length: 10 }, (_, i) => (i % 2 ? 0.003 : -0.0025)), // a bounce that drifts
        -0.001, -0.001, -0.001, -0.001, -0.001, -0.001, // a slow new low: the RSI stays above its earlier low
      ]);
      const ev = fn("mc-rsidiv-14")(new SeriesCache(b));
      assert.ok(ev.includes(1), "a bullish divergence fires");
      assert.ok(!ev.includes(-1));
    }
  });

  it("quiet-market reversion: an RSI(2) extreme counts only while ADX is low and the band narrower than its median", () => {
    // on synthetic markets: exactly the plain RSI(2) events whose bar is quiet
    let fired = 0;
    for (const s of ["A", "C", "D"]) {
      const k = new SeriesCache(barsFromCandles(`${s}-USDT`, 1, syntheticCandles(s, 1, 3000, t0)));
      const { adx } = k.dmi(14);
      const wr = bbWidthRank(k);
      const plain = fn("mc-rsi2-5")(k);
      const quiet = fn("mc-qrsi2-5")(k);
      for (let i = 0; i < k.b.n; i++) {
        const isQuiet = adx[i] < MICRO_QUIET.adx && wr[i] < MICRO_QUIET.widthRank;
        assert.equal(quiet[i], isQuiet ? plain[i] : 0, `${s} bar ${i}`);
        if (quiet[i]) fired++;
      }
      assert.ok(Number.isNaN(wr[50]), "no width rank in warm-up");
    }
    assert.ok(fired > 0, "fires on quiet bars");
    // in a trend (ADX high) a sharp dip is not a quiet-market event
    const t = new SeriesCache(fromReturns(trendThen(1, [-0.004, -0.004, -0.004])));
    assert.ok(t.dmi(14).adx[t.b.n - 4] >= MICRO_QUIET.adx);
    assert.equal(fn("mc-rsi2-5")(t)[t.b.n - 1], 1);
    assert.equal(fn("mc-qrsi2-5")(t)[t.b.n - 1], 0);
    // a narrowing band ranks low
    const flat = Array.from({ length: 300 }, (_, i) => (i % 2 ? 0.001 : -0.001) * (1 - i / 400));
    const wrf = bbWidthRank(new SeriesCache(fromReturns(flat)));
    assert.ok(wrf[290] < 0.1, `narrowing band rank ${wrf[290]}`);
  });
});

describe("the Base-passing families", () => {
  it("are sampled finely, with unique ids, and every new spec is registered", async () => {
    const { INDICATIONS, INDICATION_BY_ID: byId } = await import("./registry.ts");
    // the families the 12 h run put at the top of the Base pass rate
    const fams: Record<string, number> = { "willr-": 15, "trend-st-": 7, "break-squeeze": 5 };
    for (const [fam, n] of Object.entries(fams))
      assert.equal(
        INDICATIONS.filter((i) => i.id.startsWith(fam)).length,
        n,
        `${fam}: ${INDICATIONS.filter((i) => i.id.startsWith(fam)).map((i) => i.id).join(" ")}`,
      );
    assert.equal(INDICATIONS.filter((i) => i.id.startsWith("ema-slope")).length, 8);
    // ids are unique (a collision would share a cache key and silently reuse another spec's series)
    assert.equal(new Set(INDICATIONS.map((i) => i.id)).size, INDICATIONS.length);
    for (const id of ["willr-50-95", "ema-slope-20-3", "trend-st-35-7", "break-squeeze-120"])
      assert.ok(byId.get(id), `${id} is registered`);
  });
});
