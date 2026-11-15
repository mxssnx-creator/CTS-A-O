import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_ADJUST } from "./config.ts";
import { evaluateAdjust } from "./adjust.ts";

const losing = (cfg: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ cfg, r: -0.01, exitT: 1_000 + i }));

test("auto SL range: the level grows from the base floor up to the cap, and never below the base floor", () => {
  const base = { minSl: 0.0028, minTrail: 0.001 };
  const a = { ...DEFAULT_ADJUST, window: 5, triggerPf: 1, recoverPf: 1.2, slStep: 0.002, slMax: 0.03 };
  const cfg = "follow|ema-9-21@m5|tp1|sl1|tr0|h32";
  const r1 = evaluateAdjust({}, losing(cfg, 5), a, base, 0);
  const set = Object.keys(r1.state)[0];
  assert.ok(r1.state[set].minSl >= base.minSl, "one losing window raises the stop, never below its floor");
  assert.ok(r1.state[set].minSl <= a.slMax);
});

test("a cap below the base floor cannot lower the floor (the range collapses to the floor)", () => {
  const base = { minSl: 0.0028, minTrail: 0.001 };
  const a = { ...DEFAULT_ADJUST, window: 5, triggerPf: 1, recoverPf: 1.2, slStep: 0.002, slMax: 0.002, trailMax: 0.0005 };
  const cfg = "follow|ema-9-21@m5|tp1|sl1|tr0|h32";
  const r = evaluateAdjust({}, losing(cfg, 5), a, base, 0);
  const set = Object.keys(r.state)[0];
  assert.ok(r.state[set].minSl >= base.minSl, "SL floor kept");
  assert.ok(r.state[set].minTrail >= base.minTrail, "trail floor kept");
});

test("too few samples keep the manual defaults: no state change", () => {
  const base = { minSl: 0.0028, minTrail: 0.001 };
  const a = { ...DEFAULT_ADJUST, window: 15 };
  const r = evaluateAdjust({}, losing("follow|ema-9-21@m5|tp1|sl1|tr0|h32", 4), a, base, 0);
  assert.deepEqual(Object.keys(r.state), [], "fewer than the window: nothing is changed");
});
