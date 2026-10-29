import assert from "node:assert/strict";
import { test } from "node:test";
import { causalWindow, evaluateWindow, identity } from "./audit-independent-lastn-20261029.mjs";

test("Last-N preserves neutral, loss, no-loss, flat and missing observations", () => {
  const run = rows => evaluateWindow(rows, 2, 1.1);
  assert.deepEqual(run([.02, -.02]), { n: 2, state: "failed", pf: 1, gp: .02, gl: .02, noLoss: false });
  assert.equal(run([.03, -.02]).state, "qualified");
  assert.equal(run([.02, .01]).noLoss, true);
  assert.equal(run([0, 0]).state, "flat");
  assert.equal(run([.01]).state, "insufficient");
  assert.equal(run([.01, NaN]).state, "unknown");
  assert.equal(run([1e-13, -1e-13]).pf, 1);
  assert.equal(run([.01, -.03]).state, "failed");
});

test("entry-time windows exclude same-time and future closes and keep exact ownership", () => {
  const events = [[1, .03], [2, -.01], [4, -.09], [5, .1]];
  assert.equal(causalWindow(events, 4, 2, 1.1).pf, 3);
  assert.equal(causalWindow(events, 5, 2, 1.1).pf, 0);
  assert.notEqual(identity("a|b", "X", 1), identity("a", "b|X", 1));
  assert.notEqual(identity("a", "X", 1), identity("a", "X", -1));
  assert.notEqual(identity("normal", "X", 1), identity("trailing", "X", 1));
});
