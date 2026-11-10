import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { BaseConfigCounter } from "../base-config-counts.ts";
import { basePassTags, rangeCellPass, baseRangeCounts, baseRangeWhy, baseGateSensitivity } from "./pipeline.ts";

test("representative Base and each cell retain their own SL-ratio floor across range relations", () => {
  const gates = { ...DEFAULT_SETTINGS.gates, minTrades: 1, baseLastN: 0, maxDdr: 0,
    rangeMinPf: { micro: 1.05, minimal: 1.08 },
    stepPf: { enabled: true, ratio: .2, max: 2, bySlRatio: { "0.5": 1.6, "1": 1.2 } } };
  const sample = { n: 20, pf: 1.5, net: .5, mdd: 0, gp: 1.5, gl: 1, stepPct: .4, slRatio: .5 };
  const other = { ...sample, slRatio: 1 };
  for (const tag of ["mc", "mn"]) {
    assert.equal(rangeCellPass(gates, "ema@m1")(tag, sample), false);
    assert.equal(rangeCellPass(gates, "ema@m1")(tag, other), true);
  }
  assert.deepEqual(basePassTags({ ind: "ema@m1", full: { ...sample, n: 0 } as never,
    ranges: { mc: sample, mn: other } }, gates), ["mn"]);
  const defaultRun={ind:"ema@m1",full:{...sample,slRatioKnown:true as const}};
  assert.deepEqual(basePassTags(defaultRun as never,gates,["mc","mn"]),[],"default cell cannot bypass its own SL floor");
  assert.ok(baseRangeCounts([defaultRun] as never,gates,["mc","mn"]).every(r=>r.passed===0));
  assert.ok(baseRangeWhy([defaultRun] as never,gates,["mc","mn"]).every(r=>r.passed===0));
  assert.ok(baseGateSensitivity([defaultRun] as never,gates,["mc","mn"]).every(r=>r.passed===0));
  const { slRatio: _missing, ...legacy } = sample;
  assert.equal(rangeCellPass(gates,"ema@m1")("mc",legacy),false,"legacy missing SL provenance requires recomputation");
  assert.equal(rangeCellPass(gates,"ema@m1")("mc",{...legacy,slRatioKnown:true}),true,
    "an evaluated no-TP cell does not invent an SL/TP ratio");
});

test("a Base count's captured step/SL map is immutable across later settings edits", () => {
  const gates = { minTrades: 2, minPf: 1.05,
    stepPf: { enabled: true, ratio: .2, max: 2, byStep: { "4": 1.1 }, bySlRatio: { "0.5": 1.6 } } };
  const count = new BaseConfigCounter({ gates, cost: .0011, fromT: 0, cutT: 100 });
  gates.stepPf.bySlRatio["0.5"] = 1.1;
  gates.stepPf.byStep["4"] = 1.01;
  count.record("follow", "ema@m1", { tp: .004, sl: .002, trail: 0, hold: 20, tag: "mc" }, "normal",
    [{ r: .015, entryT: 1, exitT: 2 }, { r: -.01, entryT: 3, exitT: 4 }]);
  const [row] = count.rows();
  assert.equal(row.minPf, 1.6);
  assert.equal(row.passed, 0);
});
