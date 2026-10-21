import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEFAULT_SETTINGS, RT_COST, type SettingsPatch } from "../config.ts";
import { liveTrades, type LedgerRow } from "../statistics.ts";
import { DEFAULT_MODEL_FEES, MAX_MODEL_RT_COST, roundTripCostFromFees } from "../model-cost.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { LANE_MIN } from "../sim/backtest.ts";
import { HIST_MIN_TP } from "../signal-hist.ts";
import { POSITION_COST_RT, POSITION_COST_STRESS_RT } from "../model-cost.ts";
import {
  GENERAL_RANGE, LONG_RANGE, MICRO_RANGE, MICRO_TP, MINIMAL_PLUS_RANGE, MINIMAL_RANGE, SHORT_RANGE,
  forEachMicro, microNetTps, microPriceTp, microSlFloor, rangeTpLabel,
} from "../minimal-coord.ts";

const formerModel = { cost: 0.002, fees: { taker: 0.0005, maker: 0.0002, slippage: 0.0005 } };
const runtimes: CoreRuntime[] = [];
afterEach(() => { for (const runtime of runtimes.splice(0)) runtime.dispose(); });
function fixture(settings?: SettingsPatch, version = 33, presets?: unknown[]) {
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", version);
  db.kvSet("ddtMax35", true);
  if (settings) db.kvSet("settings", settings);
  if (presets) db.kvSet("presets", presets);
  const runtime = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  runtime.stop();
  runtimes.push(runtime);
  return { db, runtime };
}

describe("modeled position cost defaults and migration", () => {
  it("fresh defaults use the coherent 0.15% round-trip fee and slippage model", () => {
    const { runtime } = fixture();
    assert.equal(RT_COST, 0.0015);
    assert.equal(DEFAULT_SETTINGS.cost, RT_COST);
    assert.deepEqual(DEFAULT_SETTINGS.fees, DEFAULT_MODEL_FEES);
    assert.equal(roundTripCostFromFees(DEFAULT_SETTINGS.fees), RT_COST);
    assert.equal(runtime.settings.cost, RT_COST);
    assert.deepEqual(runtime.settings.fees, DEFAULT_SETTINGS.fees);
    assert.equal(LANE_MIN.tp, +(RT_COST * 3).toFixed(6), "short-lane ATR target floor follows the modeled transaction cost");
    assert.equal(POSITION_COST_RT, 0.002);
    assert.equal(POSITION_COST_STRESS_RT, 0.004);
    assert.equal(HIST_MIN_TP, POSITION_COST_RT * 5, "the historic Signal floor follows the PositionCost baseline");
  });

  it("fee-only edits derive one round-trip model value; an explicit cost stays authoritative", () => {
    const { runtime } = fixture();
    const changedFees = { ...DEFAULT_MODEL_FEES, taker: 0.0006 };
    runtime.updateSettings({ fees: changedFees });
    assert.equal(runtime.settings.cost, MAX_MODEL_RT_COST);
    runtime.updateSettings({ cost: 0.0021, fees: DEFAULT_MODEL_FEES });
    assert.equal(runtime.settings.cost, MAX_MODEL_RT_COST);
    runtime.updateSettings({ cost: 0.001 });
    assert.equal(runtime.settings.cost, 0.001, "lower explicit modeled costs remain authoritative");
  });

  it("omitted Micro helper costs use the model default while configured range distances keep their fixed basis", () => {
    assert.equal(microPriceTp(0.002, MICRO_RANGE), 0.0035);
    assert.equal(microSlFloor({ minSlNet: 0.002 }), 0.0035);
    assert.equal(rangeTpLabel(0.0035, "mc"), "0.35 % (net 0.20 %)");
    const netRange = { tp: [0.0015, 0.002, 0.003], minNetOfCost: 1 };
    assert.deepEqual(microNetTps(netRange), netRange.tp);
    assert.deepEqual(microNetTps(netRange, 0.002), [0.002, 0.003]);
    const targets: number[] = [];
    const original = structuredClone(MICRO_RANGE);
    forEachMicro({ holdH: [1], micro: MICRO_RANGE }, (tp, sl, trail) => {
      if (sl === 1 && trail === 0) targets.push(tp);
    });
    assert.deepEqual(targets, [0.0035, 0.0045, 0.0055, 0.0065, 0.0075, 0.0085, 0.0095]);
    assert.deepEqual(MICRO_RANGE, original, "cost helpers cannot rewrite the configured net target distances");
    assert.deepEqual(MICRO_TP, [0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008]);
    assert.deepEqual([MINIMAL_RANGE, SHORT_RANGE, GENERAL_RANGE, LONG_RANGE, MINIMAL_PLUS_RANGE]
      .map((range) => [range.tp[0], range.tp.at(-1), range.minSl, range.minTrail]), [
      [0.008, 0.016, 0.006, 0.003],
      [0.018, 0.028, 0.006, 0.002],
      [0.03, 0.044, 0.01, 0.004],
      [0.046, 0.064, 0.016, 0.006],
      [0.004, 0.01, 0.001, 0.001],
    ]);
    assert.equal(microPriceTp(0.002, MICRO_RANGE, 0.002), 0.004, "explicit historical model costs remain unchanged");
  });

  it("v34 moves the exact former factory tuple once, including legacy preset copies", () => {
    const custom = { ...formerModel, cost: 0.0021 };
    const { db, runtime } = fixture({ ...structuredClone(formerModel), symbols: 7 }, 33, [
      { id: "factory", settings: structuredClone(formerModel), wf: { lastN: 25 }, metrics: { pf: 1.3 } },
      { id: "custom", settings: structuredClone(custom), wf: { lastN: 30 }, metrics: { pf: 1.7 } },
      { id: "absent", settings: { symbols: 11 }, wf: {}, metrics: { pf: 1.4 } },
    ]);
    assert.equal(runtime.settings.cost, RT_COST);
    assert.deepEqual(runtime.settings.fees, DEFAULT_SETTINGS.fees);
    assert.equal(runtime.settings.symbols, 7);
    assert.equal(db.kvGet<number>("wfCapsV"), 37);
    const presets = db.kvGet<Array<{ id: string; settings: SettingsPatch; wf: unknown; metrics: unknown }>>("presets")!;
    assert.deepEqual(presets[0], {
      id: "factory", settings: { cost: RT_COST, fees: DEFAULT_SETTINGS.fees }, wf: { lastN: 25 }, metrics: { pf: 1.3 },
    });
    assert.deepEqual(presets[1].settings, custom);
    assert.deepEqual(presets[2].settings, { symbols: 11 });
  });

  it("preserves custom cost, custom fee components and partial saved provenance", () => {
    const alternatives: SettingsPatch[] = [
      { ...structuredClone(formerModel), cost: 0.0021 },
      { ...structuredClone(formerModel), fees: { ...formerModel.fees, taker: 0.0006 } },
      { ...structuredClone(formerModel), fees: { ...formerModel.fees, maker: 0.0001 } },
      { ...structuredClone(formerModel), fees: { ...formerModel.fees, slippage: 0.0004 } },
      { cost: formerModel.cost },
      { fees: structuredClone(formerModel.fees) },
      { cost: formerModel.cost, fees: { slippage: formerModel.fees.slippage } },
    ];
    for (const settings of alternatives) {
      const before = structuredClone(settings);
      const { db } = fixture(settings);
      assert.deepEqual(db.kvGet("settings"), before);
    }
    const { runtime } = fixture(structuredClone(formerModel), 34);
    assert.equal(runtime.settings.cost, MAX_MODEL_RT_COST, "saved model choices respect the current operator ceiling; durable provenance is preserved");
    assert.deepEqual(runtime.settings.fees, formerModel.fees);
  });

  it("uses the canonical default only for unmeasured ledger fees and preserves measured fill costs", () => {
    const rows: LedgerRow[] = [
      { coid: "TAGNa", sym: "A-USDT", side: 1, kind: "O", qty: 1, px: 100, status: "ok", at: 1 },
      { coid: "TAGXb", sym: "A-USDT", side: 1, kind: "X", qty: 1, px: 100, status: "ok", at: 2 },
    ];
    assert.equal(liveTrades(rows, 3)[0].r, -RT_COST);
    assert.equal(liveTrades(rows, 3, formerModel.cost)[0].r, -formerModel.cost, "explicit historical costs remain explicit");
    const measured = rows.map((row) => ({ ...row, fee: 0.04, feeKnown: 1 }));
    assert.equal(liveTrades(measured, 3)[0].r, -0.0008);
    assert.deepEqual(liveTrades(measured, 3), liveTrades(measured, 3, formerModel.cost));
    const free = measured.map((row) => ({ ...row, fee: 0 }));
    assert.equal(liveTrades(free, 3)[0].r, 0, "confirmed zero commissions do not receive modeled replacement fees");
    assert.equal(liveTrades(free.map((row) => ({ ...row, feeKnown: null })), 3)[0].r, -RT_COST);
  });
});
