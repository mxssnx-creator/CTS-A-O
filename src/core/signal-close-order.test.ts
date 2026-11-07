import assert from "node:assert/strict";
import { test } from "node:test";
import { SignalGuard } from "./signals.ts";

const H = 3_600_000;
test("late old settlement cannot hide recent losing Signal acceptance evidence", () => {
  const g = new SignalGuard();
  g.addAccept("own", .01, 9 * H, "a");
  g.addAccept("own", -.02, 9.5 * H, "b");
  assert.deepEqual(g.acceptStats("own", 10 * H, 2), { n: 2, pf: .5 });
  g.addAccept("own", .1, H, "old");
  g.addAccept("sibling", .9, 9.8 * H, "other");
  g.addAccept("own", 1, 11 * H, "future");
  assert.deepEqual(g.acceptStats("own", 10 * H, 2), { n: 2, pf: .5 });
  assert.equal(g.accepts("own", 10 * H, { enabled: true, minPf: 1.3, minTrades: 2, hours: 2 }), false);
  assert.deepEqual(g.acceptStats("own", 9 * H, 1), { n: 1, pf: Infinity });
});

test("loss clusters retain settled losses after a delayed earlier close, by side and population", () => {
  const g = new SignalGuard();
  const c = { enabled: true, windowMin: 120, minLosses: 2, lossShare: .5 };
  g.add("a", -.02, 9 * H, 1, "a");
  g.add("b", -.01, 9.5 * H, 1, "b");
  g.add("old", .5, H, 1, "old");
  g.add("short", .5, 9.7 * H, -1, "short");
  g.add("coord", .5, 9.7 * H, 1, "coord", "coordination");
  g.add("future", .5, 11 * H, 1, "future");
  assert.equal(g.clustered(10 * H, c, 1), true);
  assert.equal(g.clustered(10 * H, c, -1), false);
  assert.equal(g.clustered(10 * H, c, 1, "coordination"), false);
  assert.equal(g.clustered(12 * H, c, 1), false);
});

test("invalid close timestamps reject before mutating Signal evidence", () => {
  const g = new SignalGuard();
  for (const t of [NaN, Infinity, -1]) {
    assert.throws(() => g.addAccept("k", 1, t), RangeError);
    assert.throws(() => g.add("k", 1, t), RangeError);
  }
  assert.deepEqual(g.acceptStats("k", H, 1), { n: 0, pf: 0 });
  assert.equal(g.disabled("k", 1), false);
});
