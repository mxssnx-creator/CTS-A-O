import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Bars, ExitConfigSet, Protect } from "../domain/types.ts";
import { simulate } from "./backtest.ts";
import { capTrailingOnlyProtect } from "./trailing.ts";
import {
  advanceExitProtection,
  createExitProtection,
  type ExitProtectionPosition,
} from "./exit-protection.ts";
import { carryTrail, tickTrail } from "../server/runtime.server.ts";

const protect = (set: ExitConfigSet): Protect => ({
  tp: set === "trailing-only" ? 0 : 0.1,
  sl: 0.2,
  trail: set === "trailing" || set === "trailing-only" ? 0.03 : 0,
  ...(set === "trailing-only" ? { trailOnly: true, trailStep: 0.5 } : {}),
  hold: 100,
  exitType: "historic",
  exitSide: 1,
  exitSet: set,
});
const position = (set: ExitConfigSet, side = 1, cost = 0): ExitProtectionPosition => {
  const p = capTrailingOnlyProtect(protect(set));
  return {
    side,
    entry: 100,
    stop: 100 * (1 - side * p.sl),
    ...(p.tp > 0 ? { target: 100 * (1 + side * p.tp) } : {}),
    peak: 100,
    trailOn: false,
    trail: p.trail,
    trailDist: p.trail * (p.trailStep ?? 1),
    exitProtection: createExitProtection(p, 100, cost),
  };
};
const bars = (rows: number[][], tfMin = 1): Bars => ({
  sym: "FIXTURE",
  tfMin,
  n: rows.length,
  t: Float64Array.from(rows, (_, i) => i * tfMin * 60_000),
  o: Float64Array.from(rows, (r) => r[0]),
  h: Float64Array.from(rows, (r) => r[1]),
  l: Float64Array.from(rows, (r) => r[2]),
  c: Float64Array.from(rows, (r) => r[3]),
  v: Float64Array.from(rows, () => 1),
});

describe("causal per-position Exit protection", () => {
  it("locks breakeven after captured costs in both directions and never places it ahead of earned profit", () => {
    for (const side of [1, -1]) for (const set of ["breakeven", "adaptive-sl", "trailing", "trailing-only"] as const) {
      const p = position(set, side, .002);
      p.exitProtection!.baseTp = .006;
      const mark = (profit: number) => ({ t: 60_000 + profit * 1e6,
        high: Math.max(100, 100 * (1 + side * profit)), low: Math.min(100, 100 * (1 + side * profit)), close: 100 * (1 + side * profit) });
      const initial = p.stop;
      advanceExitProtection(p, mark(.002));
      assert.equal(p.stop, initial, "no net-breakeven lock while mark only covers modeled cost");
      const restored = JSON.parse(JSON.stringify(p));
      advanceExitProtection(p, mark(.004));
      advanceExitProtection(restored, mark(.004));
      assert.deepEqual(p, restored, "captured cost survives restart");
      const locked = side * (p.stop - p.entry) / p.entry;
      assert.ok(locked >= .002 - 1e-12 && locked < .004, `${set} locks the cost behind the mark`);
      assert.equal(p.exitProtection!.cost, .002);
    }
    assert.throws(() => createExitProtection(protect("breakeven"), 100, NaN));
    assert.throws(() => createExitProtection(protect("breakeven"), 100, -.001));
  });

  it("keeps legacy Exit ids fixed and gives every tactic its own bounded TP state", () => {
    assert.equal(
      createExitProtection({ tp: 0.1, sl: 0.1, trail: 0, hold: 10, exitType: "historic" }, 100),
      undefined,
    );
    for (const set of ["static-sl", "adaptive-sl", "trailing"] as const) {
      const p = position(set);
      advanceExitProtection(p, { t: 60_000, high: 104, low: 99, close: 103 });
      assert.notEqual(p.target, 110, `${set} actively adjusts TP`);
      assert.ok(p.target! >= 107.5 && p.target! <= 115);
      assert.equal(p.exitProtection?.samples, 1);
    }
  });

  it("static SL stays fixed while adaptive SL and trailing ratchet independently in both directions", () => {
    for (const side of [1, -1]) {
      for (const set of ["static-sl", "adaptive-sl", "trailing"] as const) {
        const p = position(set, side);
        const stop0 = p.stop;
        const favorable =
          side > 0 ? { high: 108, low: 100, close: 107 } : { high: 100, low: 92, close: 93 };
        advanceExitProtection(p, { t: 60_000, ...favorable });
        if (set === "static-sl") assert.equal(p.stop, stop0);
        else assert.ok(side * (p.stop - stop0) > 0);
        const stop1 = p.stop;
        const adverse =
          side > 0 ? { high: 107, low: 98, close: 99 } : { high: 102, low: 93, close: 101 };
        advanceExitProtection(p, { t: 120_000, ...adverse });
        assert.ok(side * (p.stop - stop1) >= 0, `${side} ${set} never loosens a stop`);
        assert.ok(side * (p.target! - p.entry) >= 0.075 * p.entry - 1e-10);
        assert.ok(side * (p.target! - p.entry) <= 0.15 * p.entry + 1e-10);
        if (set === "trailing")
          assert.ok(p.trailOn && p.trailDist! >= 0.03 * 0.65 && p.trailDist! <= 0.03 * 1.35);
      }
    }
  });

  it("moves breakeven to entry and runs a target-free trailing stop in both directions", () => {
    for (const side of [1, -1]) {
      const be = position("breakeven", side);
      const stop0 = be.stop;
      const beBar =
        side > 0
          ? { t: 60_000, high: 105, low: 100, close: 104 }
          : { t: 60_000, high: 100, low: 95, close: 96 };
      advanceExitProtection(be, beBar);
      assert.equal(be.stop, 100, `${side}: breakeven never crosses behind entry`);
      assert.ok(side * (be.stop - stop0) > 0);

      const trailing = position("trailing-only", side);
      assert.equal(trailing.target, undefined, "trailing-only has no profit target");
      const trailBar =
        side > 0
          ? { t: 60_000, high: 105, low: 100, close: 104 }
          : { t: 60_000, high: 100, low: 95, close: 96 };
      advanceExitProtection(trailing, trailBar);
      assert.equal(trailing.target, undefined, "updates cannot introduce a target");
      assert.equal(trailing.trailOn, true);
      assert.ok(side * (trailing.stop - 100) > 0, `${side}: favorable move ratchets the trail`);
      const stop1 = trailing.stop;
      const adverse =
        side > 0
          ? { t: 120_000, high: 104, low: 102, close: 102.5 }
          : { t: 120_000, high: 98, low: 96, close: 97.5 };
      advanceExitProtection(trailing, adverse);
      assert.ok(side * (trailing.stop - stop1) >= 0, `${side}: target-free trail never loosens`);
    }
  });

  it("rejects duplicate and older completed bars and keeps a serialized state deterministic", () => {
    const p = position("adaptive-sl");
    const bar = { t: 60_000, high: 106, low: 100, close: 105 };
    advanceExitProtection(p, bar);
    const before = JSON.stringify(p);
    assert.equal(advanceExitProtection(p, bar), false);
    assert.equal(advanceExitProtection(p, { ...bar, t: 0 }), false);
    assert.equal(JSON.stringify(p), before);
    const restored = JSON.parse(before) as ExitProtectionPosition;
    const next = { t: 120_000, high: 107, low: 104, close: 106 };
    advanceExitProtection(p, next);
    advanceExitProtection(restored, next);
    assert.deepEqual(restored, p);
  });

  it("applies the updated target only after the bar that calculated it", () => {
    const p = protect("static-sl");
    const prefix = bars([
      [100, 100, 100, 100],
      [100, 109.9, 99, 100],
    ]);
    const a = simulate("fixed-id", prefix, Int8Array.of(1, 0), p, { cost: 0 });
    assert.equal(
      a.trades.length,
      0,
      "a newly lowered TP cannot fill retrospectively inside the calculation bar",
    );
    assert.ok(a.open && a.open.target < 109.9 && a.open.target > 100);
    const full = bars([
      [100, 100, 100, 100],
      [100, 109.9, 99, 100],
      [100, 109.85, 99, 100],
    ]);
    const b = simulate("fixed-id", full, Int8Array.of(1, 0, 0), p, { cost: 0 });
    assert.equal(b.trades.length, 1);
    assert.equal(b.trades[0].exitT, 180_000);
    assert.equal(b.trades[0].exit, a.open.target);
    assert.equal(b.trades[0].cfg, "fixed-id", "adaptation never changes config identity");
  });

  it("matches simulation, tick and restart for all five tactics, both directions and 1/5/15m lanes", () => {
    for (const set of ["static-sl", "adaptive-sl", "trailing", "breakeven", "trailing-only"] as const) {
      for (const tf of [1, 5, 15]) for (const side of [1, -1] as const) for (const cost of [0, .0015, .002]) {
        const dt = tf * 60_000;
        const price = (x: number) => 100 + side * (x - 100);
        const p = position(set, side, cost);
        const tick = JSON.parse(JSON.stringify(p)) as ExitProtectionPosition;
        tickTrail(tick, 100, dt, dt);
        tickTrail(tick, price(103), dt + 10, dt);
        tickTrail(tick, price(99), dt + 20, dt);
        tickTrail(tick, price(102), 2 * dt - 1, dt);
        const restarted = JSON.parse(JSON.stringify(tick));
        tickTrail(tick, price(102), 2 * dt, dt);
        tickTrail(restarted, price(102), 2 * dt, dt);
        assert.deepEqual(restarted, tick);
        const simulated = simulate(
          "fixed-id",
          bars([
            [100, 100, 100, 100],
            [100, Math.max(price(103), price(99)), Math.min(price(103), price(99)), price(102)],
          ], tf),
          Int8Array.of(side, 0),
          { ...protect(set), exitSide: side },
          { cost },
        ).open!;
        assert.ok(simulated, `${set} m${tf} side${side}: allocation remains open`);
        assert.equal(tick.stop, simulated.stop, `${set} m${tf} side${side}`);
        assert.equal(tick.target ?? 0, simulated.target ?? 0);
        assert.equal(tick.trailDist, simulated.trailDist ?? 0);
        assert.deepEqual(tick.exitProtection, simulated.exitProtection);
        const carried = { ...p, ...carryTrail(p, tick) };
        assert.equal(carried.target, tick.target);
        assert.equal(carried.stop, tick.stop);
        assert.deepEqual(carried.exitProtection, tick.exitProtection);
        const before = JSON.stringify(carried.exitProtection);
        tickTrail(carried, price(102), 2 * dt + 1, dt);
        assert.equal(JSON.stringify(carried.exitProtection), before, "rollover applies each closed bar once");
      }
    }
  });
});
