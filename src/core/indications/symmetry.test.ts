// Long / short symmetry: the engine must treat a falling market as it treats a rising one. On the price-mirrored
// series (K / price: rises become falls, highs become lows) every indication fires short where it fired long and the
// simulators book a short as they book a long. A one-sided rule (an else-if that hands an overlap zone to one side,
// a doji counted as bearish) shows up here as a long / short count that does not swap with the mirror. (Exception:
// the Stable-02 confluence port, the desk's own rule kept bit for bit — see below.)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INDICATIONS, indicationState } from "./registry.ts";
import { BOTS, botTrigger } from "../bots/bots.ts";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { simulate } from "../sim/backtest.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { isMicroRelation } from "./micro.ts";
import type { Candle } from "../domain/types.ts";

const END = Date.UTC(2026, 9, 1);
const mirror = (cs: readonly Candle[]) => {
  const K = cs[0].c * cs[0].c;
  return cs.map((x) => ({ ...x, o: K / x.o, c: K / x.c, h: K / x.l, l: K / x.h }));
};

describe("long / short symmetry", { timeout: 600_000 }, () => {
  it("every indication's long count on a market is its short count on the mirrored market", () => {
    const counts = new Map<string, { up: number; dn: number; mup: number; mdn: number }>();
    for (const tf of [5, 15])
      for (const seed of [3, 11, 29]) {
        const cs = syntheticCandles("AAA-USDT", tf, 3000, END, seed);
        const A = new SeriesCache(barsFromCandles("AAA-USDT", tf, cs));
        const B = new SeriesCache(barsFromCandles("AAA-USDT", tf, mirror(cs)));
        for (const x of INDICATIONS) {
          // the Stable-02 confluence port keeps the desk's own rule bit for bit (stable02.test.ts): its RSI bands
          // overlap at 45–55 and the else-if gives that zone to long — the desk's signal as validated (8 days, all
          // sources PF 1.96), so it stays; direction acceptance judges each side on its own record
          if (x.id.includes("s2-confluence")) continue;
          const a = indicationState(x.id, A);
          const b = indicationState(x.id, B);
          if (!a || !b) continue;
          const c = counts.get(x.id) ?? { up: 0, dn: 0, mup: 0, mdn: 0 };
          for (let i = 0; i < a.length; i++) {
            if (a[i] === 1) c.up++;
            else if (a[i] === -1) c.dn++;
            if (b[i] === 1) c.mup++;
            else if (b[i] === -1) c.mdn++;
          }
          counts.set(x.id, c);
        }
      }
    // (indicators on K / price are not exact mirrors — EMAs and RSI of 1 / x differ slightly — so rare-event
    // thresholds may move a few events; a structural bias moves thousands)
    const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(20, 0.3 * Math.max(a, b));
    const bad = [...counts]
      .filter(([, c]) => !near(c.up, c.mdn) || !near(c.dn, c.mup))
      .map(([id, c]) => `${id}: long ${c.up} short ${c.dn} | mirrored long ${c.mup} short ${c.mdn}`);
    assert.ok(counts.size > 100, `${counts.size} indications checked`);
    assert.deepEqual(bad, []);
  });

  it("every bot trigger's long count on a market is its short count on the mirrored market", () => {
    // the bot triggers decide the direction of every combo: "sweep" used to hand an outside bar that swept BOTH
    // prior extremes to long (an else-if), which is a long bias on every market and on its mirror
    const counts = new Map<string, { up: number; dn: number; mup: number; mdn: number }>();
    for (const tf of [5, 15])
      for (const seed of [3, 11, 29]) {
        const cs = syntheticCandles("AAA-USDT", tf, 3000, END, seed);
        const A = new SeriesCache(barsFromCandles("AAA-USDT", tf, cs));
        const B = new SeriesCache(barsFromCandles("AAA-USDT", tf, mirror(cs)));
        for (const b of BOTS) {
          const a = botTrigger(b.type, A);
          const m = botTrigger(b.type, B);
          if (!a || !m) continue;
          const c = counts.get(b.type) ?? { up: 0, dn: 0, mup: 0, mdn: 0 };
          for (let i = 0; i < a.length; i++) {
            if (a[i] === 1) c.up++;
            else if (a[i] === -1) c.dn++;
            if (m[i] === 1) c.mup++;
            else if (m[i] === -1) c.mdn++;
          }
          counts.set(b.type, c);
        }
      }
    const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(20, 0.3 * Math.max(a, b));
    const bad = [...counts]
      .filter(([, c]) => !near(c.up, c.mdn) || !near(c.dn, c.mup))
      .map(([id, c]) => `${id}: long ${c.up} short ${c.dn} | mirrored long ${c.mup} short ${c.mdn}`);
    assert.ok(counts.size >= 8, `${counts.size} bot triggers checked`);
    assert.deepEqual(bad, []);
    // the constructed case: one hour of wide bars, then a narrow hour whose last bar sweeps BOTH prior extremes
    const t0 = Date.UTC(2026, 9, 1);
    const cs: Candle[] = [];
    for (let i = 0; i < 60; i++) cs.push({ t: t0 + i * 60_000, o: 100, h: 101, l: 99, c: 100, v: 1 });
    for (let i = 0; i < 5; i++) cs.push({ t: t0 + 3_600_000 + i * 60_000, o: 100, h: 100.2, l: 99.8, c: 100, v: 1 });
    cs.push({ t: t0 + 3_600_000 + 5 * 60_000, o: 100, h: 102, l: 98, c: 100, v: 1 });
    const ev = botTrigger("sweep", new SeriesCache(barsFromCandles("A-USDT", 1, cs)))!;
    assert.equal(ev[65], 0, "an outside bar reclaiming both extremes takes no side");
  });

  it("the market relations: long counts on a universe are the short counts on the universe with every symbol mirrored", () => {
    // (on a single series they are neutral: they need the market of a multi-symbol universe — market.ts)
    const rel = INDICATIONS.filter((x) => isMicroRelation(x.id));
    assert.ok(rel.length >= 12, `${rel.length} relations`);
    const counts = new Map<string, { up: number; dn: number; mup: number; mdn: number }>();
    for (const tf of [5, 15])
      for (const seed of [3, 11]) {
        // symbols on a shared market walk (prices × the market's), volume × the market's: relations fire
        const m = syntheticCandles("MKT-USDT", tf, 3000, END, seed);
        const syms = ["AAA", "BBB", "CCC", "DDD", "EEE"];
        const cs = syms.map((s, j) =>
          syntheticCandles(`${s}-USDT`, tf, 3000, END, seed + 101 * (j + 1)).map((x, i) => {
            const f = m[i].c / m[0].c;
            return { ...x, o: x.o * f, h: x.h * f, l: x.l * f, c: x.c * f, v: (x.v * m[i].v) / 1000 };
          }),
        );
        const A = makeUniverse(cs.map((c, j) => barsFromCandles(`${syms[j]}-USDT`, tf, c)));
        const B = makeUniverse(cs.map((c, j) => barsFromCandles(`${syms[j]}-USDT`, tf, mirror(c))));
        for (const x of rel)
          for (let s = 0; s < A.caches.length; s++) {
            const a = indicationState(x.id, A.caches[s])!;
            const b = indicationState(x.id, B.caches[s])!;
            const c = counts.get(x.id) ?? { up: 0, dn: 0, mup: 0, mdn: 0 };
            for (let i = 0; i < a.length; i++) {
              if (a[i] === 1) c.up++;
              else if (a[i] === -1) c.dn++;
              if (b[i] === 1) c.mup++;
              else if (b[i] === -1) c.mdn++;
            }
            counts.set(x.id, c);
          }
      }
    const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(20, 0.3 * Math.max(a, b));
    const bad = [...counts]
      .filter(([, c]) => !near(c.up, c.mdn) || !near(c.dn, c.mup))
      .map(([id, c]) => `${id}: long ${c.up} short ${c.dn} | mirrored long ${c.mup} short ${c.mdn}`);
    assert.deepEqual(bad, []);
    // they fire (a silent relation would pass the comparison trivially)
    const silent = [...counts].filter(([, c]) => c.up + c.dn === 0).map(([id]) => id);
    assert.deepEqual(silent, []);
  });

  it("the bar simulator books a short on a market as a long on its mirror (same exits, same results)", () => {
    for (const seed of [5, 17]) {
      const cs = syntheticCandles("BBB-USDT", 15, 3000, END, seed);
      const A = barsFromCandles("BBB-USDT", 15, cs);
      const B = barsFromCandles("BBB-USDT", 15, mirror(cs));
      // the same entries: short on the market, long on the mirror
      const sa = new Int8Array(A.n);
      const sb = new Int8Array(B.n);
      for (let i = 50; i < A.n; i += 37) {
        sa[i] = -1;
        sb[i] = 1;
      }
      for (const p of [
        { tp: 0.02, sl: 0.02, trail: 0, hold: 64 },
        { tp: 0.03, sl: 0.015, trail: 0.01, hold: 96 },
      ]) {
        const a = simulate("x", A, sa, p, { cost: 0.002 }).trades;
        const b = simulate("x", B, sb, p, { cost: 0.002 }).trades;
        assert.equal(a.length, b.length);
        const pf = (ts: typeof a) => {
          let gp = 0;
          let gl = 0;
          for (const t of ts) if (t.r > 0) gp += t.r;
          else gl -= t.r;
          return gp / gl;
        };
        // percent distances on K / price differ by second-order terms: the books agree closely, not exactly
        assert.ok(Math.abs(pf(a) - pf(b)) / pf(b) < 0.1, `short PF ${pf(a)} vs mirrored long PF ${pf(b)}`);
        const same = a.filter((t, i) => t.reason === b[i].reason && t.exitT === b[i].exitT).length;
        assert.ok(same / a.length > 0.8, `${same} of ${a.length} exits agree`);
      }
    }
  });
});
