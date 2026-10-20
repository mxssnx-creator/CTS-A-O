import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPARISON_ARMS,
  COMPARISON_SOURCES,
  NATIVE_BASELINE_ID,
  armOptions,
  assertComparisonRuntime,
  canonical,
  exactJson,
} from "./block-comparison.mjs";

test("Block arms preserve every independent source/type/gate and never mutate shared options", () => {
  const base = {
    toggles: {
      normal: true,
      trailing: true,
      block: true,
      blockActive: false,
      dca: true,
      axis: false,
    },
    block: { maxMult: 8, mode: "overall", maxLevel: 8, sources: { config: false, symbol: true } },
    gates: { minPf: 1.1, lastNFloor: 5 },
    signalAccept: { minPf: 1.3 },
    signalSideAccept: { minPf: 1.3 },
    protects: [1],
    dcaProtects: [2],
  };
  const before = exactJson(base);
  for (const arm of COMPARISON_ARMS) {
    const opts = armOptions(base, arm);
    assert.deepEqual(opts.toggles, { ...base.toggles, block: arm.block, blockActive: arm.active });
    assert.deepEqual(opts.block, {
      ...base.block,
      maxMult: arm.maxMult,
      mode: arm.mode,
      ratio: arm.ratio,
      sharedRatio: arm.sharedRatio,
      steps: arm.steps,
    });
    assert.equal(opts.gates, base.gates);
    assert.equal(opts.signalAccept, base.signalAccept);
    assert.equal(opts.signalSideAccept, base.signalSideAccept);
    assert.deepEqual(opts.protects, []);
    assert.deepEqual(opts.dcaProtects, []);
  }
  assert.equal(exactJson(base), before);
  assert.throws(() => armOptions(base, { id: "cap2", block: true, maxMult: 3 }), /Unfrozen/);
});
test("predeclares ten arms separating weighting, Active selection, Shared sensitivity and configured step arithmetic", () => {
  assert.equal(COMPARISON_ARMS.length, 10);
  assert.equal(COMPARISON_ARMS.filter((x) => !x.block).length, 1);
  assert.equal(COMPARISON_ARMS.filter((x) => x.active).length, 4);
  assert.equal(new Set(COMPARISON_ARMS.map((x) => x.id)).size, 10);
  assert.equal(COMPARISON_ARMS.find((x) => x.id === NATIVE_BASELINE_ID).active, false);
  assert.ok(COMPARISON_ARMS.every((x) => x.ratio === 0.2));
  assert.deepEqual(
    COMPARISON_ARMS.filter((x) => x.sharedRatio !== undefined).map((x) => x.sharedRatio),
    [0.4, 0.4],
  );
  assert.deepEqual(COMPARISON_SOURCES, {
    config: false,
    overall: true,
    symbol: true,
    direction: true,
    indication: true,
    type: false,
  });
  const legacy = COMPARISON_ARMS.find((x) => x.id === "stepped-cap8");
  assert.equal(legacy.maxMult, 8);
  assert.equal(legacy.steps, 7);
  assert.equal(legacy.diagnostic, true);
});
test("pre-score parity rejects silent settings or WF changes and any prior compute", () => {
  const rt = {
    settings: { signals: { enabled: true }, grid: { micro: { tp: [1, 2], slOfTp: [1, 2] } } },
    wf: { lastN: 0, validLastN: 15, active: new Set(["x", "y"]) },
    status: { computes: 0 },
  };
  const p = { actualSettings: canonical(rt.settings), actualWf: canonical(rt.wf) };
  assertComparisonRuntime(rt, p);
  assert.throws(
    () =>
      assertComparisonRuntime(
        { ...rt, settings: { ...rt.settings, signals: { enabled: false } } },
        p,
      ),
    /settings differ/,
  );
  assert.throws(
    () => assertComparisonRuntime({ ...rt, wf: { ...rt.wf, validLastN: 1 } }, p),
    /options differ/,
  );
  assert.throws(
    () => assertComparisonRuntime({ ...rt, status: { computes: 1 } }, p),
    /before any compute/,
  );
});
