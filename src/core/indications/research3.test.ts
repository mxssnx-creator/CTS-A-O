import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars, Candle } from "../domain/types.ts";
import { SeriesCache } from "./cache.ts";
import { INDICATION_BY_ID } from "./registry.ts";
import { choppiness, isQuarterHour, laguerreRsi, research3Specs, ultimate } from "./research3.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";

const T0 = Date.UTC(2026, 8, 20, 12, 0, 0);
const IDS = research3Specs().map((x) => x.id);
const stateOf = (id: string, cs: readonly Candle[], tf: number) =>
  INDICATION_BY_ID.get(id)!.fn(new SeriesCache(barsFromCandles("X-USDT", tf, [...cs]) as Bars));
const mirror = (cs: readonly Candle[]): Candle[] => {
  const K = 2 * Math.max(...cs.map((x) => x.h));
  return cs.map((x) => ({ t: x.t, o: K - x.o, h: K - x.l, l: K - x.h, c: K - x.c, v: x.v }));
};

describe("research signals, third batch", () => {
  it("16 indications (8 families, short + medium), all registered, none an existing id", () => {
    assert.equal(IDS.length, 16);
    assert.equal(new Set(IDS).size, 16);
    for (const id of IDS) assert.ok(INDICATION_BY_ID.has(id), id);
  });

  it("causal: appending later bars never changes an earlier state, on 1m and on 15m bars", () => {
    for (const tf of [1, 15]) {
      const cs = syntheticCandles("R3", tf, 2400, T0);
      let fires = 0;
      for (const id of IDS) {
        const full = stateOf(id, cs, tf);
        const cut = stateOf(id, cs.slice(0, 1500), tf);
        for (let i = 0; i < 1500; i++) assert.equal(full[i], cut[i], `${id} ${tf}m bar ${i}`);
        if (full.some((x) => x !== 0)) fires++;
      }
      // synthetic noise is not every family's pattern, but most must be able to fire
      assert.ok(fires >= 10, `${tf}m: ${fires} of 16 fired`);
    }
  });

  it("quarter-hour signals fire only on bars that open on :00 / :15 / :30 / :45", () => {
    const cs = syntheticCandles("QH", 1, 3000, T0);
    for (const id of ["r-qh-flow", "r-qh-flow-m", "r-qh-rev", "r-qh-rev-m"]) {
      const s = stateOf(id, cs, 1);
      for (let i = 0; i < cs.length; i++) if (s[i] !== 0) assert.ok(isQuarterHour(cs[i].t), `${id} fired at ${new Date(cs[i].t).toISOString()}`);
    }
    assert.equal(isQuarterHour(Date.UTC(2026, 0, 1, 10, 45)), true);
    assert.equal(isQuarterHour(Date.UTC(2026, 0, 1, 10, 46)), false);
  });

  it("direction-symmetric: a mirrored series fires the opposite way, bar for bar", () => {
    const cs = syntheticCandles("SYM", 15, 1600, T0);
    for (const id of ["r-laguerre", "r-td", "r-ultimate", "r-chand", "r-chop"]) {
      const a = stateOf(id, cs, 15);
      const b = stateOf(id, mirror(cs), 15);
      let checked = 0;
      for (let i = 0; i < cs.length; i++)
        if (a[i] !== 0 && b[i] !== 0) {
          assert.equal(a[i], -b[i], `${id} bar ${i}`);
          checked++;
        }
      assert.ok(checked > 0 || a.every((x) => x === 0), `${id}: nothing to compare`);
    }
  });

  it("the oscillators stay in their ranges", () => {
    const cs = syntheticCandles("RNG", 15, 1200, T0);
    const b = barsFromCandles("X-USDT", 15, cs);
    for (const x of laguerreRsi(b.c, 0.5)) if (Number.isFinite(x)) assert.ok(x >= 0 && x <= 1, `${x}`);
    for (const x of ultimate(b.h, b.l, b.c, 7, 14, 28)) if (Number.isFinite(x)) assert.ok(x >= 0 && x <= 100, `${x}`);
    // choppiness: 100 · log10(Σ TR / range) / log10(n) — positive, and bounded by 100 for n bars of true range
    for (const x of choppiness(b.h, b.l, b.c, 14)) if (Number.isFinite(x)) assert.ok(x > 0 && x <= 100 + 1e-9, `${x}`);
  });

  it("TD setup: nine closes in a row above the close four bars earlier fades short, mirrored long", () => {
    const cs: Candle[] = [];
    for (let i = 0; i < 40; i++) {
      // flat, then a steady run up from bar 20
      const c = i < 20 ? 100 + (i % 2 ? 0.1 : -0.1) : 100 + (i - 19) * 0.5;
      cs.push({ t: T0 + i * 15 * 60_000, o: c - 0.05, h: c + 0.2, l: c - 0.2, c, v: 100 });
    }
    const s = stateOf("r-td", cs, 15);
    // closes from bar 20 on are each above the close four bars before; the ninth such close is bar 28
    assert.equal(s[28], -1);
    assert.equal(stateOf("r-td", mirror(cs), 15)[28], 1);
  });
});
