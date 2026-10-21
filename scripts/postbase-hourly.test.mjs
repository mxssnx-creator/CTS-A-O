import assert from "node:assert/strict";
import { test } from "node:test";
import { auditSettledHours } from "./lib/postbase-hourly.mjs";
const H = 3600000, start = Date.UTC(2026, 9, 17), end = start + 3 * H;
const row = (id, exit, r, mult = 1) => ({ cfg: id, sym: "A", side: 1, entryT: start, exitT: start + exit, r, mult });
const orders = [row("win", H, .04, 2), row("loss", H + 1, -.01), row("end", 3 * H, .02)];
test("exact-hour settlements, empty scope and external weighting retain one fixed hourly cohort", () => {
  const r = auditSettledHours(orders, start, end, [
    { t: start, n: 1, pf: 4, net: 2 }, { t: start + H, n: 1, pf: 0, net: -1 },
    { t: start + 2 * H, n: 1, pf: 4, net: 2 },
  ]);
  assert.equal(r.summary.pf, 4); // 0.04 / 0.01 is a measured ratio here.
  assert.equal(r.summary.pfConvention, "ratio");
  assert.deepEqual(r.hourly.map((x) => x.n), [1, 1, 1]);
  assert.equal(r.allActiveHoursPfAbove1, false);
  assert.equal(r.pfAbove1AtEveryActiveHourEnd, true);
  assert.equal(r.negativeHours, 1);
  const empty = auditSettledHours([], start, end, []);
  assert.equal(empty.summary.pf, null); assert.equal(empty.emptyHours, 3);
  assert.equal(empty.allActiveHoursPfAbove1, null);
});
for (const [label, change] of [
  ["future close", (xs) => { xs[0].exitT = end + 1; }],
  ["missing multiplier", (xs) => { delete xs[0].mult; }],
  ["unknown persisted return", (xs) => { xs[0].unitR = null; }],
  ["invalid multiplier", (xs) => { xs[0].mult = Infinity; }],
  ["duplicate", (xs) => { xs.push(xs[0]); }],
  ["endpoint mark", (xs) => { xs[0].markedOpen = true; }],
]) test(`rejects ${label} instead of proving hourly stability`, () => {
  const xs = structuredClone(orders); change(xs);
  assert.throws(() => auditSettledHours(xs, start, end));
});
test("rejects a shifted hour, an omitted losing hour and a weighted primary PF", () => {
  for (const report of [
    [{ t: start + 3 * H, n: 1, pf: 4, net: 2 }],
    [{ t: start, n: 1, pf: 4, net: 2 }],
    [{ t: start, n: 1, pf: 4, net: 4 }, { t: start + H, n: 1, pf: 0, net: -1 }, { t: start + 2 * H, n: 1, pf: 4, net: 2 }],
  ]) assert.throws(() => auditSettledHours(orders, start, end, report));
});
