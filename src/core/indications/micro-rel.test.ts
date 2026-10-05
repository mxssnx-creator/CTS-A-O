// The market reference (market.ts) and the Micro market-relation indications ("mc-lag-…", "mc-rsrev-…",
// "mc-mturn-…", "mc-act-…" and the AND combinations): the market of a timeframe, its alignment by time, strict
// causality on a universe cut at any time, neutrality without a market or alone in a timeframe, and that every
// relation fires on a universe and is processed through Base as a Micro indication (Micro cells only).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { baseRangeProtects, makeUniverse, rangeAppliesTo, rangeBaseStats, runCombo } from "../pipeline/pipeline.ts";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import { MICRO_RANGE, rangeMinTfOf } from "../minimal-coord.ts";
import { MARKET_ACT_P, MarketSource } from "./market.ts";
import { isMicroInd, isMicroRelation, microRel, microSpecs } from "./micro.ts";
import { indicationState, laneInd } from "./registry.ts";
import { SeriesCache } from "./cache.ts";
import type { Bars, Candle } from "../domain/types.ts";

const END = Date.UTC(2026, 9, 1);
const REL = microSpecs()
  .map((s) => s.id)
  .filter(isMicroRelation);

/**
 * Symbols on a common market: each symbol's own walk × a shared market walk, its volume × the market's activity, so
 * the relations have something to read (a lag, a residual overshoot, a market-wide surge).
 */
function basket(tf: number, n: number, seed: number, syms: readonly string[] = ["AAA", "BBB", "CCC", "DDD", "EEE"]): Candle[][] {
  const m = syntheticCandles("MKT-USDT", tf, n, END, seed);
  return syms.map((s, j) => {
    const own = syntheticCandles(`${s}-USDT`, tf, n, END, seed + 101 * (j + 1));
    return own.map((x, i) => {
      const f = m[i].c / m[0].c;
      return { ...x, o: x.o * f, h: x.h * f, l: x.l * f, c: x.c * f, v: (x.v * m[i].v) / 1000 };
    });
  });
}

const barsOf = (cs: Candle[][], tf: number, syms: readonly string[] = ["AAA", "BBB", "CCC", "DDD", "EEE"]) =>
  cs.map((c, j) => barsFromCandles(`${syms[j]}-USDT`, tf, c));

/** the bars of b with open time ≤ cutT */
function cutAt(b: Bars, cutT: number): Bars {
  let n = 0;
  while (n < b.n && b.t[n] <= cutT) n++;
  const s = <T extends Float64Array>(x: T) => x.slice(0, n) as T;
  return { ...b, n, t: s(b.t), o: s(b.o), h: s(b.h), l: s(b.l), c: s(b.c), v: s(b.v) };
}

/** b without its bar k (a gap in the series) */
function without(b: Bars, k: number): Bars {
  const d = <T extends Float64Array>(x: T) => Float64Array.from([...x.subarray(0, k), ...x.subarray(k + 1, b.n)]) as T;
  return { ...b, n: b.n - 1, t: d(b.t), o: d(b.o), h: d(b.h), l: d(b.l), c: d(b.c), v: d(b.v) };
}

/** b from its bar k on (a symbol listed later) */
const from = (b: Bars, k: number): Bars => {
  const d = <T extends Float64Array>(x: T) => x.slice(k) as T;
  return { ...b, n: b.n - k, t: d(b.t), o: d(b.o), h: d(b.h), l: d(b.l), c: d(b.c), v: d(b.v) };
};

const near = (a: number, b: number) => (Number.isNaN(a) ? Number.isNaN(b) : Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b)));

describe("market reference", () => {
  it("per timeframe: mean bar log return, cumulative index and mean activity, aligned by open time", () => {
    const five = barsOf(basket(5, 400, 3), 5);
    // one symbol listed 50 bars later, one with a missing bar
    five[1] = from(five[1], 50);
    five[2] = without(five[2], 200);
    const fifteen = barsFromCandles("QQQ-USDT", 15, syntheticCandles("QQQ-USDT", 15, 300, END, 9));
    const src = new MarketSource([...five, fifteen]);
    const g = src.grid(5);
    assert.equal(g.t.length, 400, "the union of the 5m open times");
    assert.equal(g.syms, 5);
    // a bar in the middle: the mean of the log returns of the symbols with a bar and a previous bar there
    for (const gi of [1, 49, 50, 51, 200, 201, 399]) {
      const t = g.t[gi];
      const rs: number[] = [];
      const as: number[] = [];
      for (const b of five) {
        const i = b.t.indexOf(t);
        if (i < 0) continue;
        if (i >= 1) rs.push(Math.log(b.c[i] / b.c[i - 1]));
        if (i >= MARKET_ACT_P - 1) {
          let s = 0;
          for (let j = i - MARKET_ACT_P + 1; j <= i; j++) s += b.v[j];
          as.push(b.v[i] / (s / MARKET_ACT_P));
        }
      }
      const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN);
      assert.ok(near(g.ret[gi], mean(rs)), `ret @${gi}: ${g.ret[gi]} vs ${mean(rs)}`);
      assert.ok(Math.abs(g.act[gi] - mean(as)) < 1e-9 || (Number.isNaN(g.act[gi]) && !as.length), `act @${gi}`);
    }
    assert.ok(Number.isNaN(g.ret[0]) && g.idx[0] === 0);
    let cum = 0;
    for (let i = 1; i < 400; i++) cum += g.ret[i];
    assert.ok(Math.abs(g.idx[399] - cum) < 1e-12, "the index is the cumulative return");
    // the caches of a universe: a gapless series reads views into the one grid, a gapped one a copy matched by time
    const u = makeUniverse([...five, fifteen]);
    const m0 = u.caches[0].market()!;
    const m1 = u.caches[1].market()!;
    assert.equal(m0.ret.buffer.byteLength, 400 * 8, "a view of the 400-bar grid, no copy");
    assert.equal(m1.ret.buffer, m0.ret.buffer, "a later listing is a run of the grid too");
    assert.equal(m1.ret.length, 350);
    for (let i = 0; i < 400; i++) assert.ok(near(m0.idx[i], g.idx[i]) && Object.is(m0.ret[i], g.ret[i]), "the same market");
    assert.ok(near(m1.idx[0], g.idx[50]));
    const m2 = u.caches[2].market()!;
    assert.notEqual(m2.ret.buffer, m0.ret.buffer);
    assert.equal(m2.ret.length, 399);
    assert.ok(near(m2.idx[199], g.idx[199]) && near(m2.idx[200], g.idx[201]), "matched by open time across the gap");
    // alone in its timeframe: its own series, the relations neutral
    const q = u.caches[5].market()!;
    assert.equal(q.syms, 1);
    assert.ok(near(q.ret[10], Math.log(fifteen.c[10] / fifteen.c[9])));
    assert.equal(microRel(u.caches[5]), null);
    for (const id of REL) assert.ok(indicationState(id, u.caches[5])!.every((x) => x === 0), `${id} neutral alone`);
    // the higher view of a universe series carries the market of the same higher bars of every symbol
    const hm = u.caches[0].htf(3).k.market()!;
    assert.equal(hm.syms, 5);
    assert.equal(hm.ret.length, u.caches[0].htf(3).k.b.n);
  });

  it("without a market reference (a series computed on its own) every relation is neutral and never throws", () => {
    const b = barsOf(basket(5, 600, 4), 5)[0];
    const k = new SeriesCache(b);
    assert.equal(k.market(), null);
    for (const id of REL) {
      for (const ind of [id, laneInd(id, 5), laneInd(id, 5, true)]) {
        const st = indicationState(ind, k)!;
        assert.equal(st.length, b.n);
        assert.ok(st.every((x) => x === 0), `${ind} neutral`);
      }
    }
  });
});

describe("Micro market relations", () => {
  it("are causal: a universe cut at any time gives the same market and the same events up to the cut", () => {
    const syms = ["AAA", "BBB", "CCC", "DDD", "EEE"];
    const full = barsOf(basket(5, 1500, 7), 5, syms);
    full[1] = from(full[1], 200);
    full[2] = without(full[2], 700);
    // a short listing: below the universe's 120 bars, still part of the market
    full.push(from(barsOf(basket(5, 1500, 8, ["SSS"]), 5, ["SSS"])[0], 1400));
    const uFull = makeUniverse(full);
    const ids = REL.flatMap((id) => [laneInd(id, 5), laneInd(id, 5, true)]);
    const ref = new Map<string, Int8Array>();
    let fired = 0;
    for (const k of uFull.caches)
      for (const id of ids) {
        const st = indicationState(id, k)!;
        ref.set(`${k.b.sym}|${id}`, st);
        for (const x of st) if (x) fired++;
      }
    assert.ok(fired > 100, `${fired} events checked`);
    for (const ci of [400, 777, 1203, 1450]) {
      const cutT = full[0].t[ci];
      const uCut = makeUniverse(full.map((b) => cutAt(b, cutT)));
      for (const k of uCut.caches) {
        const kf = uFull.caches.find((x) => x.b.sym === k.b.sym)!;
        const a = kf.market()!;
        const b = k.market()!;
        for (let i = 0; i < k.b.n; i++) {
          assert.ok(Object.is(a.ret[i], b.ret[i]) && Object.is(a.idx[i], b.idx[i]) && Object.is(a.act[i], b.act[i]), `${k.b.sym} market @${i} cut ${ci}`);
        }
        for (const id of ids) {
          const st = indicationState(id, k)!;
          const f = ref.get(`${k.b.sym}|${id}`)!;
          for (let i = 0; i < k.b.n; i++) assert.equal(st[i], f[i], `${k.b.sym} ${id} @${i} cut ${ci}`);
        }
      }
    }
  });

  it("every relation fires both ways on a universe and is a Micro indication on the Micro lanes", () => {
    const counts = new Map<string, { up: number; dn: number }>();
    for (const seed of [11, 23]) {
      const u = makeUniverse([...barsOf(basket(5, 3000, seed), 5), ...barsOf(basket(15, 2000, seed + 1), 15)]);
      for (const k of u.caches)
        for (const id of REL) {
          const st = indicationState(id, k)!;
          const c = counts.get(id) ?? { up: 0, dn: 0 };
          for (const x of st) if (x === 1) c.up++;
          else if (x === -1) c.dn++;
          counts.set(id, c);
        }
    }
    const silent = REL.filter((id) => !counts.get(id)!.up || !counts.get(id)!.dn);
    assert.deepEqual(silent, [], JSON.stringify(Object.fromEntries(counts)));
    const o = { enabled: () => true, minTf: rangeMinTfOf({ micro: MICRO_RANGE }), microOwnInds: true };
    for (const id of REL) {
      assert.ok(isMicroInd(id), id);
      for (const tf of [5, 15, 30]) {
        assert.equal(rangeAppliesTo(laneInd(id, tf), "mc", o), true, `${id}@m${tf} trades Micro`);
        for (const tag of ["", "mn", "sh"]) assert.equal(rangeAppliesTo(laneInd(id, tf), tag, o), false, `${id} not ${tag}`);
      }
    }
  });

  it("are processed through Base like the other Micro indications: judged at Micro's own cell only", () => {
    const u = makeUniverse(barsOf(basket(5, 3000, 31), 5));
    const g = { ...DEFAULT_SETTINGS.grid, holdH: [16], micro: { ...MICRO_RANGE, ownInds: true } };
    const cost = 0.002;
    let traded = 0;
    for (const id of ["mc-lag-6", "mc-rsrev-6", "mc-mturn-10", "mc-act-mkt-18", "mc-irsi2-10"]) {
      const ind = laneInd(id, 5);
      const r = runCombo(u, "follow", ind, DEFAULT_PROTECT, cost, 1)!;
      assert.ok(r, ind);
      const ranges = rangeBaseStats(u, "follow", ind, baseRangeProtects(g, cost), cost, null, rangeMinTfOf(g), true)!;
      assert.deepEqual(Object.keys(ranges), ["mc"], `${ind}: Micro only`);
      traded += ranges.mc.n;
    }
    assert.ok(traded > 50, `${traded} Micro trades`);
  });
});
