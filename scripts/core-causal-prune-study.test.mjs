import { test } from "node:test";
import assert from "node:assert/strict";
import { initialPruneFocus, materializePruneCase, assertPruneFullCompute, PRUNE_POLICY } from "./core-causal-prune-study.mjs";
import { studyRuntimeSettings, studyWindow, STUDY_SYMBOLS } from "./core-22-symbol-study.mjs";

test("prune plan reads only exact initial IS checks and never later profits/passes", () => {
  const initial = { t: 100, checks: [["follow|initial@m5|tp3|gn", true, 25], ["follow|later@m5|tp3|gn", false, 25], ["follow|sig-source-s@m15|tp1|sh", true, 25]] };
  const p = initialPruneFocus([initial, { t: 200, checks: [["follow|later@m5|tp3|gn", true, 999]] }], 100, (id) => id.startsWith("sig-"));
  assert.deepEqual(p.focus, ["follow|initial@m5"]);
  assert.throws(() => initialPruneFocus([{ ...initial, t: 101 }], 100, () => false), /exact trade start/);
  assert.throws(() => initialPruneFocus([{ t: 100, checks: [["follow|sig-only-s@m15|sh", true, 100]] }], 100, (id) => id.startsWith("sig-")), /empty focus/);
});

test("only engine Micro/Minimal ranges with25 distinct adequately sampled failures may be cropped", () => {
  const checks = [["follow|winner@m5|cfg|gn", true, 25]];
  checks.push(...Array.from({ length: 25 }, (_, i) => [`follow|micro@m5|cfg${i}|mc`, false, 12]));
  checks.push(...Array.from({ length: 24 }, (_, i) => [`follow|minimal@m5|cfg${i}|mn`, false, 12]));
  checks.push(...Array.from({ length: 100 }, (_, i) => [`follow|minimal@m5|short${i}|mn`, false, 2]));
  checks.push(["follow|micro@m5|cfg0|mc", false, 12]);
  checks.push(["follow|sig-source-s@m15|cfg|mc", true, 50]);
  const p = initialPruneFocus([{ t: 100, checks }], 100, (id) => id.startsWith("sig-"));
  assert.deepEqual(p.ranges.map((x) => [x.tag, x.scoredConfigsWithMinimumHistory, x.disable]), [["mc", 25, true], ["mn", 24, false]]);
  checks.push(["follow|micro@m5|passing|mc", true, 12]);
  assert.equal(initialPruneFocus([{ t: 100, checks }], 100, (id) => id.startsWith("sig-")).ranges[0].disable, false);
  assert.match(PRUNE_POLICY.scope, /own Signal validation/);
});

test("startup memory fallback is rejected before rendering even when engine exits successfully", () => {
  const raw = { engine: { mem: { computeLevel: 0, fallback: 0 }, coverage: { expectedCombos: 100, evaluated: 100 } } };
  assert.doesNotThrow(() => assertPruneFullCompute(raw));
  raw.engine.mem = { computeLevel: 2, fallback: 2, lastAbort: "1015MB available; compute not started" };
  assert.throws(() => assertPruneFullCompute(raw), /compute not started/);
  raw.engine.mem = {};
  assert.throws(() => assertPruneFullCompute(raw), /unknown/);
  raw.engine.mem = { computeLevel: 0 }; raw.engine.coverage.evaluated--;
  assert.throws(() => assertPruneFullCompute(raw), /not every configured/);
});

test("actual runtime trial reduces engine combos while preserving all Signal configuration identities", async () => {
  const runtime = await studyRuntimeSettings(STUDY_SYMBOLS.slice(0, 20), studyWindow());
  const [{ allCombos, microLaneFloor }, { baseFocus }] = await Promise.all([import("../src/core/pipeline/pipeline.ts"), import("../src/core/server/runtime.server.ts")]);
  const pairs = allCombos(baseFocus(runtime.settings), runtime.settings.disabledKinds, runtime.settings.tfs, microLaneFloor(runtime.settings.grid));
  const pair = pairs.find((x) => !x.ind.startsWith("mc-"));
  const c = { id: "baseline-20", symbols: STUDY_SYMBOLS.slice(0, 20), runtime };
  const trial = await materializePruneCase(c, [`${pair.bot}|${pair.ind}`], [{ tag: "mc", key: "micro", scoredConfigsWithMinimumHistory: 25, passedConfigs: 0, minTrades: 12, disable: true }]);
  assert.equal(trial.runtime.settings.grid.micro, false);
  assert.deepEqual(trial.runtime.settings.grid.short, runtime.settings.grid.short);
  assert.deepEqual(trial.runtime.settings.signals, runtime.settings.signals);
  assert.equal(trial.runtime.wf.lastN, 15); assert.equal(trial.runtime.wf.signalValidLastN, 8);
  assert.ok(trial.focusEvidence.trialExpandedPairs < trial.focusEvidence.baselineExpandedPairs);
  assert.ok(trial.focusEvidence.unchangedSignals.combos > 0);
  assert.ok(trial.focusEvidence.unchangedSignals.coordinatorProtects > 0);
  assert.deepEqual(trial.runtime.settings.pinned, []);
  await assert.rejects(() => materializePruneCase(c, []), /Empty\/unknown/);
  await assert.rejects(() => materializePruneCase(c, [`${pair.bot}|${pair.ind}`], [{ tag: "sh", key: "short", disable: true }]), /Only predeclared/);
});
