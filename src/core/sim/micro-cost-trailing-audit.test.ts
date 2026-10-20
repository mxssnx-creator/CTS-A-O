import assert from "node:assert/strict";
import { it } from "node:test";
import { simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { ratchetTrail } from "./trailing.ts";
import { barsFromCandles } from "../market/bars.ts";
import { configId, completeBaseRangeProtects } from "../pipeline/pipeline.ts";
import { protectGrid } from "./walkforward.ts";
import {
  DEFAULT_SETTINGS,
  DEFAULT_DCA,
  SHORT_RANGE,
  GENERAL_RANGE,
  MINIMAL_RANGE,
  MINIMAL_PLUS_RANGE,
} from "../config.ts";
import { MICRO_RANGE } from "../minimal-coord.ts";
import type { Trade } from "../domain/types.ts";
import { boundedModelCost, MAX_MODEL_RT_COST, RT_COST } from "../model-cost.ts";
import { timeline, liveTrades } from "../statistics.ts";

const t0 = Date.UTC(2026, 9, 1),
  M = 60_000;
const bars = (rows: number[][]) =>
  barsFromCandles(
    "A-USDT",
    1,
    rows.map(([o, h, l, c], i) => ({ t: t0 + i * M, o, h, l, c, v: 1 })),
  );
it("charges a flat long or short exactly 0.15% once and caps runtime model overrides", () => {
  assert.equal(MAX_MODEL_RT_COST, 0.0015);
  assert.equal(RT_COST, MAX_MODEL_RT_COST);
  assert.equal(boundedModelCost(0.004), MAX_MODEL_RT_COST);
  assert.equal(boundedModelCost(0.001), 0.001);
  const b = bars(Array.from({ length: 5 }, () => [100, 100, 100, 100]));
  for (const side of [1, -1]) {
    const trade: Trade = simulate(
      "fee-audit",
      b,
      Int8Array.of(side, 0, 0, 0, 0),
      { tp: 0.01, sl: 0.01, trail: 0, hold: 2 },
      { cost: RT_COST },
    ).trades[0];
    assert.equal(trade.r, -0.0015);
    assert.equal(trade.entry, trade.exit);
  }
});
it("DCA charges once per filled leg, never twice per side or on an unfilled ladder", () => {
  const b = bars([
    [100, 100, 100, 100],
    [100, 100, 98.9, 99],
    [99, 99.1, 97.9, 98],
    [98, 98.1, 97.9, 98],
    [98, 98.1, 97.9, 98],
  ]);
  const p = { tp: 0.05, sl: 0.08, trail: 0, hold: 4 };
  const options = { ...DEFAULT_DCA, levels: 2, step: 0.01 };
  const gross = simulateDca("dca-audit", b, Int8Array.of(1, 0, 0, 0, 0), p, options, false, 0)
    .trades[0];
  const net = simulateDca("dca-audit", b, Int8Array.of(1, 0, 0, 0, 0), p, options, false, RT_COST)
    .trades[0];
  assert.ok(net && gross && (net.vol ?? 0) >= 2);
  assert.equal(net.entryT, gross.entryT);
  assert.equal(net.exitT, gross.exitT);
  assert.ok(Math.abs(gross.r - net.r - RT_COST * net.vol!) < 1e-12);
});
it("matches every configured TP/SL/trailing/hold cell at Base, including General and all stop ratios", () => {
  const grid = {
    ...DEFAULT_SETTINGS.grid,
    tp: [],
    long: false as const,
    minimalPlus: { ...MINIMAL_PLUS_RANGE, enabled: false, lastN: 50, minPf: 1.35 },
    micro: { ...MICRO_RANGE, maxHoldMin: 60 },
    minimal: { ...MINIMAL_RANGE, maxHoldMin: 120 },
    short: { ...SHORT_RANGE, maxHoldMin: 180 },
    general: { ...GENERAL_RANGE, maxHoldMin: 240 },
  };
  const a = completeBaseRangeProtects(grid, RT_COST),
    b = protectGrid(15, grid, RT_COST);
  const ids = (xs: typeof a) =>
    xs.map((p) => configId("follow", "micro-1-break-close-fast@m15", p)).sort();
  assert.deepEqual(ids(a), ids(b));
  for (const tag of ["mc", "mn", "sh", "gn"]) {
    const own = a.filter((p) => p.tag === tag);
    assert.ok(own.some((p) => p.trail === 0) && own.some((p) => p.trail > 0), tag);
    assert.equal(new Set(own.map((p) => configId("follow", "micro", p))).size, own.length);
  }
});
it("arms from the peak, never loosens a stop, applies updates next bar, and respects a worse gap fill on both sides", () => {
  const long = [
    [100, 100, 100, 100],
    [100, 102, 99.5, 101.8],
    [101.7, 103, 101.6, 102.8],
    [102, 102.2, 101, 101.5],
  ];
  const short = [
    [100, 100, 100, 100],
    [100, 100.5, 98, 98.2],
    [98.3, 98.4, 97, 97.2],
    [98, 99, 97.8, 98.5],
  ];
  for (const [side, path] of [
    [1, long],
    [-1, short],
  ] as const) {
    const trade = simulate(
      "micro-trailing-audit",
      bars(path),
      Int8Array.of(side, 0, 0, 0),
      { tp: 0.05, sl: 0.015, trail: 0.01, trailStep: 0.5, hold: 10 },
      { cost: RT_COST },
    ).trades[0];
    assert.equal(trade.reason, "trail");
    assert.equal(trade.exitT, t0 + 4 * M);
    assert.equal(trade.exit, side === 1 ? 102 : 98);
    assert.ok(Math.abs(trade.r - 0.0185) < 1e-12);
    for (const ratio of [0.25, 0.5, 1]) {
      const state = { side, entry: 100, peak: 100, stop: 100 * (1 - side * 0.015), trailOn: false };
      ratchetTrail(state, 0.01, 0.01 * ratio, side === 1 ? 102 : 100, side === -1 ? 98 : 100);
      const before = state.stop;
      ratchetTrail(state, 0.01, 0.01 * ratio, 100, 100);
      assert.equal(state.stop, before);
      assert.equal(state.trailOn, true);
    }
  }
});
it("replaces the open mark with a settled net return without charging again; owned measured fees stay authoritative", () => {
  const trade = {
    cfg: "fee",
    sym: "A-USDT",
    side: 1,
    entryT: t0,
    exitT: t0 + 2 * M,
    entry: 100,
    exit: 100,
    r: -RT_COST,
  };
  const curve = timeline([trade], {
    startT: t0,
    endT: t0 + 3 * M,
    balance: 10,
    unit: () => 1,
    price: () => 100,
    cost: RT_COST,
    leverage: 10,
  });
  assert.ok(Math.abs(curve.points.at(-1)!.balance - (10 - RT_COST)) < 1e-12);
  assert.ok(Math.abs(curve.points.at(-1)!.equity - (10 - RT_COST)) < 1e-12);
  const actual = liveTrades(
    [
      {
        coid: "TAGNa",
        sym: "A-USDT",
        side: 1,
        kind: "O",
        qty: 1,
        px: 100,
        fee: 0.2,
        feeKnown: 1,
        status: "ok",
        at: t0,
      },
      {
        coid: "TAGXb",
        sym: "A-USDT",
        side: 1,
        kind: "X",
        qty: 1,
        px: 100,
        fee: 0.2,
        feeKnown: 1,
        status: "ok",
        at: t0 + M,
      },
    ],
    3,
  );
  assert.equal(
    actual[0].r,
    -0.004,
    "real measured costs are neither capped nor charged an additional model fee",
  );
});
