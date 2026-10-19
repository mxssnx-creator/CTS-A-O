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
import { isMicroInd, isMicroRelation, marketRsi2, marketZ, MICRO_REL, microRel, microSpecs, residZ } from "./micro.ts";
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

function tinyRelationPair(gap: boolean) {
  const at = 70;
  const make = (sym: string, n: number, target: boolean): Bars => {
    const b: Bars = { sym, tfMin: 1, n, t: new Float64Array(n), o: new Float64Array(n),
      h: new Float64Array(n), l: new Float64Array(n), c: new Float64Array(n), v: new Float64Array(n) };
    let price = 100;
    for (let i = 0; i < n; i++) {
      const peer = Math.sin(i * 0.37) * 0.001 + Math.cos(i * 0.11) * 0.0004;
      const move = target ? i === at ? 0.2 : 1.2 * peer + Math.cos(i * 0.53) * 0.00015 : peer;
      b.t[i] = (i + (gap && target && i >= at ? 1 : 0)) * 60_000;
      b.o[i] = price;
      price *= Math.exp(move);
      b.c[i] = price;
      b.h[i] = Math.max(b.o[i], price) * 1.001;
      b.l[i] = Math.min(b.o[i], price) * 0.999;
      b.v[i] = target && i >= at ? i % 3 === 0 ? 4_000 : 400 : 1_000;
    }
    return b;
  };
  const b = make("TARGET", 160, true), peer = make("PEER", 161, false);
  const k = new SeriesCache(b);
  k.setMarket(new MarketSource([b, peer]));
  return { at, b, peer, k };
}

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
        if (i >= 1 && b.t[i] - b.t[i - 1] === b.tfMin * 60_000)
          rs.push(Math.log(b.c[i] / b.c[i - 1]));
        if (i >= MARKET_ACT_P - 1) {
          let contiguous = true;
          let s = 0;
          for (let j = i - MARKET_ACT_P + 1; j <= i; j++) {
            s += b.v[j];
            if (j > i - MARKET_ACT_P + 1 && b.t[j] - b.t[j - 1] !== b.tfMin * 60_000)
              contiguous = false;
          }
          if (contiguous) as.push(b.v[i] / (s / MARKET_ACT_P));
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
    const gapOnly = new MarketSource([five[2]]).grid(5);
    assert.ok(Number.isNaN(gapOnly.ret[200]), "a missing candle cannot become a one-bar market return");
    assert.equal(gapOnly.idx[200], gapOnly.idx[199], "the market index does not jump across missing data");
    assert.ok(Number.isNaN(gapOnly.act[200]) && Number.isNaN(gapOnly.act[258]), "activity warmup restarts after a gap");
    assert.ok(Number.isFinite(gapOnly.act[259]), "activity resumes after 60 contiguous bars");
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

  it("a worker's universe, rebuilt from the series the engine sends it (Universe.series), has the main thread's market", () => {
    // AAA: 130 flat 5m bars (close 100). SSS: listed 3 bars ago (< 120 bars: no cache, still part of the market), it
    // doubles on AAA's bar 128 → the market return there is (log 1 + log 2) / 2
    const M5 = 5 * 60_000;
    const T0 = END - 130 * M5;
    const flat = (n: number, k0: number, c: (i: number) => number): Candle[] =>
      Array.from({ length: n }, (_, i) => ({ t: T0 + (k0 + i) * M5, o: c(i), h: c(i), l: c(i), c: c(i), v: 1 }));
    const A = barsFromCandles("AAA-USDT", 5, flat(130, 0, () => 100));
    const S = barsFromCandles("SSS-USDT", 5, flat(3, 127, (i) => (i === 0 ? 100 : 200)));
    const main = makeUniverse([A, S]);
    assert.deepEqual(main.bars.map((b) => b.sym), ["AAA-USDT"]);
    const a = main.caches[0].market()!;
    assert.equal(a.syms, 2);
    assert.ok(near(a.ret[128], Math.log(2) / 2) && near(a.idx[129], Math.log(2) / 2));
    // the worker's universe: the same caches and, bar for bar, the same market
    const worker = makeUniverse(main.series);
    assert.deepEqual(worker.bars.map((b) => b.sym), ["AAA-USDT"]);
    const w = worker.caches[0].market()!;
    for (let i = 0; i < A.n; i++)
      assert.ok(Object.is(a.ret[i], w.ret[i]) && Object.is(a.idx[i], w.idx[i]) && Object.is(a.act[i], w.act[i]), `@${i}`);
    // the payload the workers had (the ≥ 120-bar series only): AAA alone is its own market, the listing's move gone
    const old = makeUniverse(main.bars).caches[0].market()!;
    assert.equal(old.syms, 1);
    assert.equal(old.ret[128], 0);
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
  it("excludes a symbol's cross-gap return while retaining the rolling valid-pair/minimum policy", () => {
    const { at, b, k } = tinyRelationPair(true), r = microRel(k)!;
    assert.equal(b.t[at] - b.t[at - 1], 120_000);
    assert.ok(Number.isFinite(r.m.ret[at]), "a contiguous peer still contributes a real one-bar market return");
    assert.ok(Number.isFinite(r.beta[at]), "59 valid pairs remain; a gap does not impose an unrelated 60-bar fit reset");
    const fit = (end: number, omitGap: boolean) => {
      let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (let j = Math.max(1, end - MICRO_REL.win + 1); j <= end; j++) {
        if (omitGap && b.t[j] - b.t[j - 1] !== 60_000) continue;
        const x = r.m.ret[j], y = Math.log(b.c[j] / b.c[j - 1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
      }
      const vx = sxx / n - (sx / n) ** 2, vy = syy / n - (sy / n) ** 2, cov = sxy / n - sx / n * sy / n;
      return { n, beta: cov / vx, sde: Math.sqrt(Math.max(0, vy - cov * cov / vx)) };
    };
    assert.equal(fit(at, true).n, 59);
    assert.ok(Math.abs(fit(at, false).beta - fit(at, true).beta) > 1, "the regression fixture exposes the old contamination");
    for (let i = at; i < b.n; i++) {
      const expected = fit(i, true);
      assert.ok(near(r.beta[i], expected.beta), `correct pair eviction at ${i}`);
      assert.ok(near(r.sde[i], expected.sde), `residual variance at ${i}`);
    }
  });

  it("blocks cross-gap movement/activity windows, rewarms market RSI and keeps causal prefixes", () => {
    const { at, b, peer, k } = tinyRelationPair(true), r = microRel(k)!, mrsi = marketRsi2(k);
    for (const n of [3, 6, 12]) {
      for (let i = at; i < at + n; i++) {
        assert.ok(Number.isNaN(residZ(k, r, n, i)), `${n}-bar own movement cannot bridge the timestamp gap`);
        assert.ok(Number.isNaN(marketZ(r, n, i)), `${n}-bar market movement uses the same complete own window`);
      }
      assert.ok(Number.isFinite(residZ(k, r, n, at + n)), "a wholly contiguous movement window resumes");
      assert.ok(Number.isFinite(marketZ(r, n, at + n)));
    }
    assert.ok(Number.isNaN(mrsi[at]) && Number.isNaN(mrsi[at + 1]), "two new aligned market returns must seed RSI after the gap");
    assert.ok(Number.isFinite(mrsi[at + 2]));
    for (const spec of microSpecs().filter((x) => isMicroRelation(x.id))) {
      const state = spec.fn(k);
      assert.equal(state[at], 0, `${spec.id} cannot treat the post-gap multi-bar close move as an entry bar`);
      if (/^mc-(act-idio|ivwapd)-/.test(spec.id))
        assert.ok(state.slice(at, at + 59).every((x) => x === 0), `${spec.id} needs its own 60 contiguous volumes`);
      if (spec.id.startsWith("mc-rexh-"))
        assert.ok(state.slice(at, at + 60).every((x) => x === 0), `${spec.id} needs 60 contiguous prior volumes`);
      const cutT = b.t[at + 12], prefix = new SeriesCache(cutAt(b, cutT));
      prefix.setMarket(new MarketSource([cutAt(b, cutT), cutAt(peer, cutT)]));
      assert.deepEqual(spec.fn(prefix), state.slice(0, prefix.b.n), `${spec.id} future bars cannot repair an earlier gap`);
    }
  });

  it("preserves the exact former fit and market RSI on valid gapless bars", () => {
    const { b, k } = tinyRelationPair(false), r = microRel(k)!;
    let cnt = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    const add = (i: number, sign: number) => {
      const x = r.m.ret[i], y = i >= 1 ? Math.log(b.c[i] / b.c[i - 1]) : NaN;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      cnt += sign; sx += sign * x; sy += sign * y; sxx += sign * x * x; syy += sign * y * y; sxy += sign * x * y;
    };
    let su = 0, sd = 0, au = 0, ad = 0;
    const oldRsi = new Float64Array(b.n).fill(NaN);
    for (let i = 0; i < b.n; i++) {
      add(i, 1); if (i >= MICRO_REL.win) add(i - MICRO_REL.win, -1);
      if (cnt >= MICRO_REL.min) {
        const mx = sx / cnt, my = sy / cnt, vx = sxx / cnt - mx * mx, vy = syy / cnt - my * my, cv = sxy / cnt - mx * my;
        assert.equal(r.beta[i], cv / vx);
        assert.equal(r.sde[i], Math.sqrt(Math.max(0, vy - cv * cv / vx)));
      } else assert.ok(Number.isNaN(r.beta[i]));
      if (i < 1) continue;
      const x = Number.isFinite(r.m.ret[i]) ? r.m.ret[i] : 0, u = x > 0 ? x : 0, d = x < 0 ? -x : 0;
      if (i <= 2) { su += u; sd += d; if (i < 2) continue; au = su / 2; ad = sd / 2; }
      else { au = (au + u) / 2; ad = (ad + d) / 2; }
      oldRsi[i] = ad === 0 ? au === 0 ? 50 : 100 : 100 - 100 / (1 + au / ad);
    }
    assert.deepEqual(marketRsi2(k), oldRsi);
  });

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
