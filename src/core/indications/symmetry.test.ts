// Long / short symmetry: the engine must treat a falling market as it treats a rising one. On the price-mirrored
// series (K / price: rises become falls, highs become lows) every indication fires short where it fired long and the
// simulators book a short as they book a long. A one-sided rule (an else-if that hands an overlap zone to one side,
// a doji counted as bearish) shows up here as a long / short count that does not swap with the mirror.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INDICATIONS, indicationState } from "./registry.ts";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { simulate } from "../sim/backtest.ts";
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
