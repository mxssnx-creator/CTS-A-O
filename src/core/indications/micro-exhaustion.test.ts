// The Micro exhaustion family (13 Oct): fade a stalled run, a rejected activity climax, a failed range break and an
// idiosyncratic overshoot on flow — hand-built series, mirrored prices give mirrored entries, causal.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { microExhaustionSpecs, microSpecs } from "./micro.ts";
import { INDICATION_BY_ID } from "./registry.ts";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import type { Bars } from "../domain/types.ts";

const t0 = Date.UTC(2026, 8, 20);
/** bars from (o, h, l, c, v) rows */
function rows(xs: ReadonlyArray<readonly [number, number, number, number, number]>): Bars {
  const n = xs.length;
  const b: Bars = { sym: "A-USDT", tfMin: 5, n, t: new Float64Array(n), o: new Float64Array(n), h: new Float64Array(n), l: new Float64Array(n), c: new Float64Array(n), v: new Float64Array(n) };
  xs.forEach(([o, h, l, c, v], i) => {
    b.t[i] = t0 + i * 300_000;
    b.o[i] = o;
    b.h[i] = h;
    b.l[i] = l;
    b.c[i] = c;
    b.v[i] = v;
  });
  return b;
}
/** the same bars mirrored around 200 (a rise becomes a fall), so a long entry must become a short one */
const mirror = (b: Bars): Bars => ({ ...b, o: b.o.map((x) => 200 - x), h: b.l.map((x) => 200 - x), l: b.h.map((x) => 200 - x), c: b.c.map((x) => 200 - x) });
const fn = (id: string) => microExhaustionSpecs().find((s) => s.id === id)!.fn;
/** flat noise: 70 quiet bars around 100 */
const quiet = (n = 70) => Array.from({ length: n }, (_, i) => [100, 100.1, 99.9, 100 + (i % 2 ? 0.05 : -0.05), 1000] as const);

describe("Micro exhaustion family", () => {
  it("is registered with the Micro indications (10 ids)", () => {
    const ids = microExhaustionSpecs().map((s) => s.id);
    assert.equal(ids.length, 10);
    for (const id of ids) {
      assert.ok(INDICATION_BY_ID.get(id), id);
      assert.ok(microSpecs().some((s) => s.id === id));
    }
  });

  it("a 4-bar run of ≥ 3 ATR that stalls is faded on the stalling bar; mirrored, the other side", () => {
    // ATR ~0.2 on the quiet bars; then 4 bars up +0.5 each (2 → ≥ 3 ATR) and a bar closing down below the prior midpoint
    const run = [[100, 100.6, 100, 100.5, 1000], [100.5, 101.1, 100.5, 101, 1000], [101, 101.6, 101, 101.5, 1000], [101.5, 102.1, 101.5, 102, 1000], [102, 102.1, 101.4, 101.5, 1000]] as const;
    const b = rows([...quiet(), ...run]);
    const s = fn("mc-exh-4-3")(new SeriesCache(b));
    assert.equal(s[b.n - 1], -1, "fade the up run");
    assert.equal(s.slice(0, b.n - 1).filter((x) => x !== 0).length, 0, "nothing before");
    assert.equal(fn("mc-exh-4-3")(new SeriesCache(mirror(b)))[b.n - 1], 1, "mirrored: fade the down run");
    // the run without the stall (the last bar continues up): no entry
    const cont = rows([...quiet(), ...run.slice(0, 4), [102, 102.6, 102, 102.5, 1000]]);
    assert.equal(fn("mc-exh-4-3")(new SeriesCache(cont))[cont.n - 1], 0);
  });

  it("an activity climax after three closes one way, closing in its opposite 40 %, is faded", () => {
    const up3 = [[100, 100.2, 100, 100.15, 1000], [100.15, 100.35, 100.1, 100.3, 1000], [100.3, 100.5, 100.25, 100.45, 1000]] as const;
    // range 1.2 (≥ 1.5 ATR), volume 5× normal, closes at 25 % of its range below its open
    const climax = [100.6, 101.4, 100.2, 100.5, 5000] as const;
    const b = rows([...quiet(), ...up3, climax]);
    assert.equal(fn("mc-climax-3")(new SeriesCache(b))[b.n - 1], -1);
    assert.equal(fn("mc-climax-3")(new SeriesCache(mirror(b)))[b.n - 1], 1);
    // the same bar on normal volume: no climax
    const calm = rows([...quiet(), ...up3, [100.6, 101.4, 100.2, 100.5, 1000]]);
    assert.equal(fn("mc-climax-3")(new SeriesCache(calm))[calm.n - 1], 0);
  });

  it("a failed break of the 48-bar range is faded; a break that holds is not", () => {
    // the quiet range tops at 100.1; a bar trades to 100.5 and closes at 100.0 below its open
    const fail = rows([...quiet(), [100.05, 100.5, 99.95, 100.0, 1000]]);
    assert.equal(fn("mc-fbo-48")(new SeriesCache(fail))[fail.n - 1], -1);
    assert.equal(fn("mc-fbo-48")(new SeriesCache(mirror(fail)))[fail.n - 1], 1);
    const hold = rows([...quiet(), [100.05, 100.5, 99.95, 100.4, 1000]]);
    assert.equal(fn("mc-fbo-48")(new SeriesCache(hold))[hold.n - 1], 0);
  });

  it("is causal: every entry at bar i is the same computed on bars 0..i (the relation one is neutral alone)", () => {
    const b = barsFromCandles("A-USDT", 5, syntheticCandles("A", 5, 1500, t0, 7));
    let firing = 0;
    for (const s of microExhaustionSpecs()) {
      const full = s.fn(new SeriesCache(b));
      if (full.some((x) => x !== 0)) firing++;
      for (const cut of [300, 900]) {
        const part = s.fn(new SeriesCache({ ...b, n: cut + 1, t: b.t.slice(0, cut + 1), o: b.o.slice(0, cut + 1), h: b.h.slice(0, cut + 1), l: b.l.slice(0, cut + 1), c: b.c.slice(0, cut + 1), v: b.v.slice(0, cut + 1) }));
        for (let i = 0; i <= cut; i++) assert.equal(part[i], full[i], `${s.id} bar ${i}`);
      }
    }
    assert.ok(firing >= 6, `${firing} of the single-symbol ids fire on synthetic bars`);
  });
});
