import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPARISON_ARMS,
  armOptions,
  assertComparisonRuntime,
  assessComparisonSummaries,
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
    assert.deepEqual(opts.toggles, { ...base.toggles, block: arm.block });
    assert.deepEqual(opts.block, {
      ...base.block,
      maxMult: arm.maxMult,
      mode: arm.mode,
      ratio: arm.ratio,
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
test("research criteria use unrounded own funded PF and minute DD without changing production gates", () => {
  const row = (arm, exactPf, dd = 0.08) => ({
    arm,
    fold: "development-1",
    total: {
      ownedCloses: 30,
      unknownReturns: 0,
      unknownAllocations: 0,
      unknownReturnTotals: 0,
      exactPf,
    },
    risk: { exactMinuteTotals: true, equityMaxDrawdownFraction: dd },
  });
  const off = row("off", 1),
    on = row("overall8", 1.2);
  assert.equal(assessComparisonSummaries([off, on])[1].passes, true);
  assert.equal(assessComparisonSummaries([off, row("overall8", 1.19999999999)])[1].passes, false);
  assert.equal(
    assessComparisonSummaries([off, row("overall8", 1.3, 0.080000000001)])[1].passes,
    false,
  );
  assert.equal(
    assessComparisonSummaries([row("off", 1, 0.2), row("overall8", 1.3, 0.100000000001)])[1].passes,
    false,
  );
  const unknown = structuredClone(on);
  unknown.total.unknownReturns = 1;
  assert.equal(assessComparisonSummaries([off, unknown])[1].passes, false);
  const short = structuredClone(on);
  short.total.ownedCloses = 29;
  assert.equal(assessComparisonSummaries([off, short])[1].passes, false);
  const rounded = structuredClone(on);
  rounded.risk.exactMinuteTotals = false;
  assert.equal(assessComparisonSummaries([off, rounded])[1].passes, false);
  assert.equal(assessComparisonSummaries([off, row("overall8", null)])[1].passes, false);
  assert.equal(assessComparisonSummaries([row("off", 0), on])[1].passes, false);
  assert.equal(assessComparisonSummaries([off, on])[0].controlOnly, true);
});
