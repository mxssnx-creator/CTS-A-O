import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Bars, Protect } from "../domain/types.ts";
import { adjustProtect } from "../adjust.ts";
import { exitProtectCandidates, heldExitProtect } from "../exit-strategy.ts";
import { configId, kindOfId, parseConfigId } from "../pipeline/pipeline.ts";
import { carryTrail, tickTrail } from "../server/tick-math.ts";
import { simulate } from "./backtest.ts";
import { advanceExitProtection, createExitProtection } from "./exit-protection.ts";
import { capSignalProtect, capTrailingOnlyProtect } from "./trailing.ts";
import { pendingAsOpen } from "./walkforward.ts";

const cost = 0.0015;
const minTrail = 0.0050214;
const validation = { cost, minPf: 1.1, minTrades: 2, minSl: 0.005, minTrail };
const settings = { ...DEFAULT_SETTINGS.exitStrategy, quantiles: [0.5], stopQuantiles: [0.5], trailShares: [0.33] };
const candidates = exitProtectCandidates([0.006, 0.006], [0.005, 0.005], 1, 12, settings, validation);

test("Exit candidates capture their own precise floor in independently recoverable identities", () => {
  for (const set of ["trailing", "trailing-only"] as const) {
    const candidate = candidates[set][0];
    assert.ok(candidate, set);
    assert.equal(candidate.exitTrailFloor, 0.005022);
    const p = adjustProtect(candidate, validation);
    assert.ok(p.trail * (p.trailStep ?? 1) >= minTrail);
    const id = configId("follow", "ema-9-21@m15", p);
    assert.match(id, /\|eg0\.5022\|hxL[24]$/);
    assert.equal(kindOfId(id), "exit");
    assert.equal(parseConfigId(id)!.protect.exitTrailFloor, p.exitTrailFloor);
    assert.deepEqual(heldExitProtect(id)?.protect, p);
    assert.equal(configId("follow", "ema-9-21@m15", parseConfigId(id)!.protect), id);
    assert.notEqual(id, configId("follow", "ema-9-21@m15", { ...p, exitTrailFloor: 0.005023 }));
    const invalid = id.replace(/\|eg[^|]+/, "|eg0.5022|eg0.6");
    assert.equal(parseConfigId(invalid), null, "duplicate floor tokens are rejected");
  }
  const legacy: Protect = { tp: 0.02, sl: 0.02, trail: 0.005, hold: 12,
    exitType: "historic", exitSet: "trailing", exitSide: 1 };
  const id = configId("follow", "ema-9-21@m15", legacy);
  assert.ok(heldExitProtect(id));
  assert.equal(parseConfigId(id)!.protect.exitTrailFloor, undefined, "legacy ids keep their existing contract");
  assert.throws(() => exitProtectCandidates([0.01], [0.01], 1, 12, settings, { ...validation, minTrail: NaN }));
});

test("both Exit trailing families hold the captured gap across completed bars, replay and restart", () => {
  for (const set of ["trailing", "trailing-only"] as const) for (const side of [1, -1] as const) {
    const source = candidates[set][0];
    const p = adjustProtect({ ...source, exitSide: side }, validation);
    const state = createExitProtection(p, 100, cost)!;
    assert.equal(state.trailFloor, 0.005022);
    const held = { side, entry: 100, stop: 100 * (1 - side * p.sl), target: p.tp ? 100 * (1 + side * p.tp) : 0,
      peak: 100, trailOn: false, trail: p.trail, trailDist: p.trail * (p.trailStep ?? 1), exitProtection: state };
    for (let i = 1; i <= 8; i++) {
      const previous = held.stop;
      advanceExitProtection(held, { t: i * 60_000, high: 100, low: 100, close: 100 });
      assert.ok(held.trailDist >= state.trailFloor!, `${set}/${side} bar ${i}`);
      assert.ok(side > 0 ? held.stop >= previous : held.stop <= previous, "the held stop cannot loosen");
      const replayed = JSON.parse(JSON.stringify(held)) as typeof held;
      const duplicate = JSON.stringify(held);
      assert.equal(advanceExitProtection(replayed, { t: i * 60_000, high: 100, low: 100, close: 100 }), false);
      assert.equal(JSON.stringify(replayed), duplicate, "the same completed bar is never applied twice");
    }
    const rows = 9;
    const bars: Bars = { sym: "X", tfMin: 1, n: rows,
      t: Float64Array.from({ length: rows }, (_, i) => i * 60_000),
      o: new Float64Array(rows).fill(100), h: new Float64Array(rows).fill(100),
      l: new Float64Array(rows).fill(100), c: new Float64Array(rows).fill(100),
      v: new Float64Array(rows).fill(1) };
    const sig = new Int8Array(rows); sig[0] = side;
    const open = simulate(configId("follow", "ema-9-21@m1", p), bars, sig, p, { cost }).open!;
    assert.ok(open);
    assert.equal(open.trailDist, held.trailDist);
    assert.deepEqual(open.exitProtection, held.exitProtection, "simulation and completed tick bars share state");
  }
});

test("an armed Exit trail uses the captured peak gap on later bars on both sides", () => {
  for (const set of ["trailing", "trailing-only"] as const) for (const side of [1, -1] as const) {
    const p = adjustProtect({ ...candidates[set][0], exitSide: side,
      ...(set === "trailing" ? { tp: 0.04 } : {}), sl: 0.02 }, validation);
    const held = { side, entry: 100, stop: 100 * (1 - side * p.sl), target: p.tp ? 100 * (1 + side * p.tp) : 0,
      peak: 100, trailOn: false, trail: p.trail, trailDist: p.trail * (p.trailStep ?? 1),
      ...(p.trailOnly ? { trailOnly: true } : {}), exitProtection: createExitProtection(p, 100, cost) };
    const dt = 60_000, favorable = set === "trailing" ? 0.007 : 0.017;
    const price = (x: number) => 100 * (1 + side * x);
    const rows: number[][] = [[100, 100, 100, 100]];
    for (let i = 1; i <= 8; i++) {
      const lo = i === 1 ? 0 : favorable - 0.0004;
      rows.push([price(i === 1 ? 0 : favorable - 0.0002),
        Math.max(price(favorable), price(lo)), Math.min(price(favorable), price(lo)), price(favorable - 0.0002)]);
    }
    for (let i = 1; i <= 8; i++) {
      const [o, h, l, c] = rows[i];
      const previous = held.stop;
      tickTrail(held, o, i * dt, dt);
      tickTrail(held, h, i * dt + 1, dt);
      tickTrail(held, l, i * dt + 2, dt);
      tickTrail(held, c, i * dt + 3, dt);
      tickTrail(held, c, (i + 1) * dt, dt);
      assert.ok(held.trailDist >= p.exitTrailFloor!, `${set}/${side} bar ${i}`);
      assert.ok(side > 0 ? held.stop >= previous : held.stop <= previous);
    }
    assert.ok(held.trailOn, `${set}/${side} armed`);
    const bars: Bars = { sym: "X", tfMin: 1, n: rows.length,
      t: Float64Array.from(rows, (_, i) => i * dt), o: Float64Array.from(rows, (r) => r[0]),
      h: Float64Array.from(rows, (r) => r[1]), l: Float64Array.from(rows, (r) => r[2]),
      c: Float64Array.from(rows, (r) => r[3]), v: Float64Array.from(rows, () => 1) };
    const sig = new Int8Array(rows.length); sig[0] = side;
    const result = simulate(configId("follow", "ema-9-21@m1", p), bars, sig, p, { cost });
    assert.equal(result.trades.length, 0);
    assert.ok(result.open, `${set}/${side} remains held`);
    assert.equal(result.open.stop, held.stop);
    assert.equal(result.open.trailDist, held.trailDist);
    assert.deepEqual(result.open.exitProtection, held.exitProtection);
  }
});

test("new pending entries capture cost and floor; held and legacy states retain their entry contract", () => {
  const p = adjustProtect(candidates["trailing"][0], validation);
  for (const side of [1, -1] as const) {
    const protect = { ...p, exitSide: side };
    const id = configId("follow", "ema-9-21@m1", protect);
    const [pending] = pendingAsOpen({ id, ind: "ema-9-21@m1", kind: "exit", protect,
      pending: [{ sym: "X", side }] }, 60_000, 1, () => 100, cost);
    assert.equal(pending.exitProtection!.cost, cost);
    assert.equal(pending.exitProtection!.trailFloor, p.exitTrailFloor);
    const rebuilt = structuredClone(pending);
    rebuilt.exitProtection!.lastBarT = 120_000;
    rebuilt.exitProtection!.trailFloor = 0.01;
    pending.exitProtection!.lastBarT = 60_000;
    const carried = { ...rebuilt, ...carryTrail(rebuilt, pending) };
    assert.equal(carried.exitProtection!.trailFloor, p.exitTrailFloor, "later settings cannot replace entry-time floor");
    delete pending.exitProtection!.trailFloor;
    const legacy = { ...rebuilt, ...carryTrail(rebuilt, pending) };
    assert.equal(legacy.exitProtection!.trailFloor, undefined, "an unknowable old floor is not invented");
  }
});

test("a ceiling that cannot fit the captured floor is rejected rather than silently weakening it", () => {
  const p: Protect = { tp: 0, sl: 0.01, trail: 0.04, trailStep: 1, trailOnly: true, hold: 12,
    exitType: "historic", exitSet: "trailing-only", exitSide: 1, exitTrailFloor: 0.04 };
  assert.throws(() => createExitProtection(capTrailingOnlyProtect(p), 100, cost), /below its captured floor/);
  assert.throws(() => createExitProtection(capSignalProtect(p), 100, cost), /below its captured floor/);
});
