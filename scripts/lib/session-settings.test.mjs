import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionSettingsEvidence } from "./session-settings.mjs";

test("preserves complete normalized replay controls and serializes Base cohort metadata", () => {
  const settings = { cost: .0015, fees: { taker: .0005, slippage: .00025 }, grid: { micro: { tp: [.001, .002], slOfTp: [1, 2], trailOfTp: [0, .5] } },
    tfDays: { 1: 3, 5: 4 }, focus: ["follow|break-mc@m5"], live: { promotedLanes: [] } };
  const wf = { preH: 24, lastN: 15, basePassed: new Set(["follow|break-mc@m5"]), basePassedRanges: { "follow|break-mc@m5": ["mc"] } };
  const out = sessionSettingsEvidence(settings, wf);
  assert.deepEqual(out.effective, settings);
  assert.deepEqual(out.effectiveWf, { ...wf, basePassed: [...wf.basePassed] });
  assert.match(out.fullSettingsSha256, /^[a-f0-9]{64}$/);
  assert.equal(out.privateExecutionEvidence, undefined);
  out.effective.grid.micro.tp.push(.003);
  assert.deepEqual(settings.grid.micro.tp, [.001, .002], "capturing or reading evidence cannot mutate runtime controls");
});

test("redacts private owned-execution close rows while binding their count and content hash", () => {
  const closes = [{ id: "private-fill-1", exitT: 100, unitR: -.01 }, { id: "private-fill-2", exitT: 200, unitR: .02 }];
  const settings = { live: { promotedLanes: [{ cfg: "source|range", minN: 2, minPf: 1.1, executionCloses: closes }] } };
  const out = sessionSettingsEvidence(settings, {}), lane = out.effective.live.promotedLanes[0];
  assert.deepEqual(lane.executionCloses, []);
  assert.equal(lane.executionClosesRedacted.count, 2);
  assert.match(lane.executionClosesRedacted.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(out.privateExecutionEvidence, { redacted: true, closes: 2 });
  assert.equal(JSON.stringify(out).includes("private-fill-1"), false);
  assert.equal(settings.live.promotedLanes[0].executionCloses, closes, "the admission runtime retains its original proof");
  assert.notEqual(sessionSettingsEvidence({ ...settings, cost: .002 }, {}).fullSettingsSha256, out.fullSettingsSha256);
});
