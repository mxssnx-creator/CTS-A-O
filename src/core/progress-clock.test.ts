import assert from "node:assert/strict";
import { it } from "node:test";
import { SIM_CLOCK_BASE, simulatedMinutesOf, simulationClock, simulationProgress, simulationWorkLabel } from "./progress.ts";

it("clock codes round-trip and never collide with the work codes or completed steps", () => {
  assert.equal(simulatedMinutesOf(simulationClock(0)), 0);
  assert.equal(simulatedMinutesOf(simulationClock(90.9)), 90);
  assert.equal(simulatedMinutesOf(simulationClock(-5)), 0, "never negative");
  for (const v of [0, 1, 5, -1, -2, -17, -999, NaN, Infinity]) assert.equal(simulatedMinutesOf(v), null, String(v));
  assert.ok(simulationClock(0) <= SIM_CLOCK_BASE && simulationClock(719) < simulationClock(0));
  assert.match(simulationWorkLabel(simulationClock(10)), /simulated clock/);
});

it("the bar and label follow the simulated clock between completed hours, throttled, and never move backward", () => {
  let now = 0;
  const seen: Array<[number, string]> = [];
  const report = simulationProgress(12, 12, "own windows", (done, label) => seen.push([done, label]), () => now);
  report(simulationClock(90));
  assert.deepEqual(seen.at(-1)![0], 1.5, "90 of 720 minutes = 1.5 of 12 steps");
  assert.match(seen.at(-1)![1], /1 h 30 min simulated/);
  assert.doesNotMatch(seen.at(-1)![1], /step \d+\/12/, "no hourly step counter once the clock is known");
  report(simulationClock(100));
  assert.equal(seen.length, 1, "throttled to a few updates a second");
  now = 600;
  report(simulationClock(60)); // an older clock value does not pull the bar back; the throttled minute 100 was remembered
  assert.ok(Math.abs(seen.at(-1)![0] - 100 / 60) < 1e-9, `bar ${seen.at(-1)![0]}`);
  assert.match(seen.at(-1)![1], /1 h 40 min simulated/);
  now = 1200;
  report(simulationClock(180));
  assert.equal(seen.at(-1)![0], 3);
  report(0); // a completed hour never lowers the clock-based bar
  assert.ok(seen.at(-1)![0] >= 3);
  now = 1800;
  report(simulationClock(720));
  assert.equal(seen.at(-1)![0], 12, "the full window = all steps");
  assert.match(seen.at(-1)![1], /12 h 00 min simulated/);
});

it("work labels still show beside the clock, and without a clock the former step label is kept", () => {
  let now = 0;
  const seen: Array<[number, string]> = [];
  const report = simulationProgress(12, 12, "own windows", (done, label) => seen.push([done, label]), () => now);
  report(-15);
  assert.match(seen.at(-1)![1], /step 0\/12/);
  assert.match(seen.at(-1)![1], /evaluating Signals/);
  now = 600;
  report(simulationClock(45));
  now = 1200;
  report(-9);
  assert.match(seen.at(-1)![1], /0 h 45 min simulated/);
  assert.match(seen.at(-1)![1], /checking entry qualification/);
});
