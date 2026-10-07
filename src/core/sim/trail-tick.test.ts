// Trailing between computes: the live tick advances a trailing position's stop with the simulation's own per-bar
// rule (trailBar) when the position's lane bar closes, and a rebuilt paper position never takes a ratcheted stop back.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulate, trailBar } from "./backtest.ts";
import { carryTrail, tickTrail, type TickTrail } from "../server/runtime.server.ts";
import type { Bars, Protect } from "../domain/types.ts";

const M = 60_000;
function bars(hs: number[], ls: number[], tfMin = 15): Bars {
  const n = hs.length;
  const t = new Float64Array(n);
  const o = new Float64Array(n);
  const c = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    t[i] = i * tfMin * M;
    o[i] = (hs[i] + ls[i]) / 2;
    c[i] = (hs[i] + ls[i]) / 2;
  }
  return { sym: "A", tfMin, n, t, o, h: Float64Array.from(hs), l: Float64Array.from(ls), c, v: new Float64Array(n) };
}

describe("trailing between computes", () => {
  it("trailBar reproduces simulate's open trailing position bar by bar (long and short)", () => {
    // a trend that never reaches the far target nor the stop: the trail arms and ratchets
    const up = [100, 100.6, 101.4, 102.2, 103.1, 102.9, 104.0, 104.4];
    for (const side of [1, -1] as const) {
      const hs = up.map((x) => (side === 1 ? x + 0.2 : 200 - x + 0.2));
      const ls = up.map((x) => (side === 1 ? x - 0.2 : 200 - x - 0.2));
      const b = bars(hs, ls);
      const sig = new Int8Array(b.n);
      sig[0] = side;
      const p: Protect = { tp: 0.5, sl: 0.05, trail: 0.01, trailStep: 1.5, hold: 1000 } as Protect;
      const r = simulate("c", b, sig, p, { cost: 0 });
      assert.ok(r.open, "the position is still open");
      assert.equal(r.open!.trail, 0.01);
      assert.equal(r.open!.trailDist, 0.015);
      // replay: entry at bar 1's open, the stop at sl, every bar from the entry bar through trailBar
      const entry = b.o[1];
      const pos = { side, entry, stop: entry * (1 - side * 0.05), peak: entry, trailOn: false };
      for (let i = 1; i < b.n; i++) trailBar(pos, 0.01, 0.015, b.h[i], b.l[i]);
      assert.ok(Math.abs(pos.stop - r.open!.stop) < 1e-9, `${side}: stop ${pos.stop} vs ${r.open!.stop}`);
      assert.ok(Math.abs(pos.peak - r.open!.peak) < 1e-9);
      assert.equal(pos.trailOn, r.open!.trailOn);
      assert.equal(pos.trailOn, true);
    }
  });

  it("the tick moves the stop only when the position's lane bar closes, by that bar's extreme", () => {
    const tf = 15 * M;
    const p: TickTrail = { side: 1, entry: 100, stop: 95, peak: 100, trailOn: false, trail: 0.01, trailDist: 0.02 };
    const t0 = 1000 * tf;
    tickTrail(p, 100.5, t0 + 1 * M, tf);
    tickTrail(p, 102, t0 + 5 * M, tf);
    tickTrail(p, 101.2, t0 + 9 * M, tf);
    assert.equal(p.stop, 95, "inside the bar the stop stays (the simulation trails at bar end)");
    // the next bar's first tick: the closed bar's high (102) arms the trail (+2 % ≥ 1 %), stop = 102 × 0.98
    assert.equal(tickTrail(p, 101.5, t0 + tf + 30_000, tf), true);
    assert.ok(Math.abs(p.stop - 99.96) < 1e-9);
    assert.equal(p.trailOn, true);
    // a lower bar never takes the stop back
    tickTrail(p, 100.2, t0 + tf + 5 * M, tf);
    assert.equal(tickTrail(p, 100.4, t0 + 2 * tf + M, tf), false);
    assert.ok(Math.abs(p.stop - 99.96) < 1e-9);
    // not armed below the trail distance; a short trails down
    const s: TickTrail = { side: -1, entry: 100, stop: 105, peak: 100, trailOn: false, trail: 0.01, trailDist: 0.02 };
    tickTrail(s, 99.5, t0 + M, tf);
    tickTrail(s, 99.4, t0 + tf + M, tf);
    assert.equal(s.trailOn, false);
    assert.equal(s.stop, 105);
    tickTrail(s, 98, t0 + tf + 2 * M, tf);
    tickTrail(s, 98.4, t0 + 2 * tf + M, tf);
    assert.equal(s.trailOn, true);
    assert.ok(Math.abs(s.stop - 99.96) < 1e-9, `${s.stop}`);
    // a plain (non-trailing) position is never touched
    const plain: TickTrail = { side: 1, entry: 100, stop: 95, peak: 100, trailOn: false };
    tickTrail(plain, 110, t0, tf);
    assert.equal(tickTrail(plain, 110, t0 + tf, tf), false);
    assert.equal(plain.stop, 95);
  });

  it("a rebuilt position keeps the stop and peak the tick advanced since the tape's data end", () => {
    const prev: TickTrail = { side: 1, entry: 100, stop: 99.96, peak: 102, trailOn: true, trail: 0.01, trailDist: 0.02, tkBar: 7, tkHi: 101, tkLo: 100 };
    const fromTape: TickTrail = { side: 1, entry: 100, stop: 98.5, peak: 100.5, trailOn: false, trail: 0.01, trailDist: 0.02 };
    assert.deepEqual(carryTrail(fromTape, prev), { stop: 99.96, peak: 102, trailOn: true, tkBar: 7, tkHi: 101, tkLo: 100 });
    // a tape that trailed further wins
    const further = { ...fromTape, stop: 100.4, peak: 102.5, trailOn: true };
    assert.equal(carryTrail(further, prev).stop, 100.4);
    // a short: down only
    const sPrev: TickTrail = { side: -1, entry: 100, stop: 100.04, peak: 98, trailOn: true, trail: 0.01, trailDist: 0.02 };
    assert.equal(carryTrail({ ...sPrev, stop: 101, peak: 99, trailOn: false }, sPrev).stop, 100.04);
    // no previous position, or a plain one: the tape's values
    assert.deepEqual(carryTrail(fromTape, undefined), {});
    assert.deepEqual(carryTrail({ ...fromTape, trail: undefined }, prev), {});
  });
});
