import assert from "node:assert/strict";
import { test } from "node:test";
import type { Bars, Protect, ProtectGridSpec } from "../domain/types.ts";
import { completeBaseRangeProtects, configId, parseConfigId, protectCellKey } from "../pipeline/pipeline.ts";
import { tickTrail, type TickTrail } from "../server/tick-math.ts";
import { checkSettings } from "../settings-check.ts";
import { simulate, simulateFrom } from "./backtest.ts";
import { protectGrid } from "./walkforward.ts";

test("fixed distance has its own protection proof in Base and the executable grid", () => {
  const grid: ProtectGridSpec = {
    tp: [.15], slOfTp: [.5], trailOfTp: [.1], holdH: [1], minTrail: 0, minSl: 0, trailingOnly: true,
  };
  const dynamic = protectGrid(15, grid, .0011);
  const selected = { ...grid, trailGapBasis: "entry" as const };
  const fixed = protectGrid(15, selected, .0011);
  const baseKeys = new Set(completeBaseRangeProtects(selected, .0011).map(protectCellKey));
  assert.equal(dynamic.length, fixed.length);
  assert.ok(fixed.some(cell => cell.trailOnly));
  for (const [i, cell] of fixed.entries()) {
    assert.ok(baseKeys.has(protectCellKey(cell)));
    if (cell.trail > 0) {
      const id = configId("follow", "trend-10", cell);
      assert.equal(parseConfigId(id)?.protect.trailFixed, true);
      assert.notEqual(protectCellKey(dynamic[i]), protectCellKey(cell));
      assert.notEqual(configId("follow", "trend-10", dynamic[i]), id);
    } else assert.equal(protectCellKey(dynamic[i]), protectCellKey(cell));
  }
  assert.throws(() => checkSettings({ grid: { trailGapBasis: "unknown" } } as never), /trailing distance/);
});

test("fixed and dynamic trailing agree between historical replay and restored ticks on both sides", () => {
  const t0 = 1_790_000_000_000, minute = 60_000;
  for (const side of [1, -1] as const) for (const fixed of [true, false]) {
    const high = side === 1 ? 107 : 100;
    const low = side === 1 ? 100 : 93;
    const pullback = 100 + side * 4;
    const toBars = (withClose: boolean): Bars => {
      const n = withClose ? 4 : 3;
      const column = (values: number[]) => Float64Array.from(values.slice(0, n));
      return {
        sym: "BTCUSDT", tfMin: 1, n, t: column([t0, t0+minute, t0+2*minute, t0+3*minute]),
        o: column([100, 100, 100, 100+side*6]), h: column([100, 100, high, Math.max(100+side*6,pullback)]),
        l: column([100, 100, low, Math.min(100+side*6,pullback)]), c: column([100, 100, 100+side*6, pullback]),
        v: column([1, 1, 1, 1]),
      };
    };
    const protection: Protect = { tp:.15, sl:.05, trail:.02, hold:60, ...(fixed ? {trailFixed:true} : {}) };
    const cfg = configId("follow","trend-10",protection);
    const peak = 100+side*7;
    const expected = peak - side * (fixed ? 100 : peak) * .02;
    const before = simulateFrom(cfg, toBars(false), Int8Array.of(side, 0, 0), protection, {cost:.0011});
    assert.ok(before.state && before.open);
    assert.ok(Math.abs(before.open.stop - expected) < 1e-10);
    const restored = simulateFrom(cfg, toBars(true), Int8Array.of(side, 0, 0, 0), protection, {cost:.0011},
      JSON.parse(JSON.stringify(before.state)));
    assert.deepEqual(restored.trades, simulate(cfg, toBars(true), Int8Array.of(side, 0, 0, 0), protection, {cost:.0011}).trades);
    assert.ok(Math.abs(restored.trades[0].exit - expected) < 1e-10);

    const tick: TickTrail = { cfg, side, entry:100, stop:100-side*5, peak:100, trailOn:false, trail:.02, trailDist:.02 };
    tickTrail(tick, 100, t0, minute);
    tickTrail(tick, peak, t0+1, minute);
    assert.equal(tick.stop, 100-side*5);
    tickTrail(tick, 100+side*6, t0+minute, minute);
    assert.ok(Math.abs(tick.stop - expected) < 1e-10);
  }
});
