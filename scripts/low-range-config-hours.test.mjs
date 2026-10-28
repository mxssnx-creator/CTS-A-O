import assert from "node:assert/strict";
import { test } from "node:test";
import { addOrder, createAnalysis, finishAnalysis, pfState } from "./low-range-config-hours.mjs";
const H = 3_600_000, startT = 10 * H, endT = startT + 24 * H;
const make = (ids = ["A", "B"]) => createAnalysis({ startT, endT, symbols: ["AAA"], configIds: ids });
const order = (closeIndex, cfg, side, exitT, unitR, allocatedNotional = 1) =>
  ({ closeIndex, cfg, side, entryT: startT, exitT, unitR, allocatedNotional, sizedPnl: unitR * 2, sym: "AAA" });

test("funded exact config × direction conserves cash and applies closed-hour boundaries", () => {
  const a = make();
  addOrder(a, order(0, "A", 1, startT + H, .1)); // exact hour belongs to previous bin
  addOrder(a, order(1, "A", 1, startT + H + 1, -.05));
  addOrder(a, order(2, "A", -1, endT, 0)); // exact run end belongs to last bin
  addOrder(a, order(3, "B", -1, startT + H, -.8, 0)); // known-zero candidate excluded
  const audit = { checksOk: true, total: { closes: 3, unitGp: .1, unitGl: .05, sizedNetUsd: .1, unknownReturns: 0, unknownCash: 0 },
    byDirection: [{ key: "Long", closes: 2, unitGp: .1, unitGl: .05, sizedNetUsd: .1 },
      { key: "Short", closes: 1, unitGp: 0, unitGl: 0, sizedNetUsd: 0 }] };
  const r = finishAnalysis(a, audit, 1), long = r.rows.find(x => x[0] === "A" && x[1] === 1);
  const short = r.rows.find(x => x[0] === "A" && x[1] === -1), empty = r.rows.find(x => x[0] === "B" && x[1] === 1);
  assert.equal(r.contexts, 4); assert.deepEqual(long[6].map(x => x[0]), [0, 1]);
  assert.equal(pfState({ n: long[6][0][1], gp: long[6][0][2], gl: long[6][0][3] }), "no-loss");
  assert.equal(short[6][0][0], 23); assert.equal(pfState({ n: 1, gp: 0, gl: 0 }), "flat");
  assert.equal(empty[2], 0); assert.deepEqual(empty[6], []); assert.equal(pfState({ n: 0, gp: 0, gl: 0 }), "empty");
  assert.equal(pfState({ n: 2, gp: .1, gl: .05 }), 2);
});

test("candidate consistency uses exact config-direction, minimum sample and every active hour", () => {
  const a = make(["PASS", "TWO-HOURS", "FLAT-HOUR"]); let i = 0;
  const push = (id, hour, n, r) => { for (let j = 0; j < n; j++) addOrder(a, order(i++, id, 1, startT + hour * H + 1, r)); };
  push("PASS", 0, 7, .1); push("PASS", 1, 7, .1); push("PASS", 2, 6, .1);
  push("TWO-HOURS", 0, 10, .1); push("TWO-HOURS", 1, 10, .1);
  push("FLAT-HOUR", 0, 10, .1); push("FLAT-HOUR", 1, 9, .1); push("FLAT-HOUR", 2, 1, 0);
  const n = 60, gp = 5.9, cash = 11.8;
  const audit = { checksOk: true, total: { closes: n, unitGp: gp, unitGl: 0, sizedNetUsd: cash, unknownReturns: 0, unknownCash: 0 },
    byDirection: [{ key: "Long", closes: n, unitGp: gp, unitGl: 0, sizedNetUsd: cash }] };
  const r = finishAnalysis(a, audit, 0);
  assert.equal(r.exploratory.eligible, 2); assert.equal(r.exploratory.consistent, 1); assert.equal(r.exploratory.percent, 50);
  assert.equal(r.rows.find(x => x[0] === "PASS" && x[1] === 1)[7], true);
  assert.equal(r.rows.find(x => x[0] === "FLAT-HOUR" && x[1] === 1)[7], false);
  assert.equal(r.rows.find(x => x[0] === "TWO-HOURS" && x[1] === 1)[7], false);
});

test("numeric hourly PF 1.1 passes exactly and the value immediately below fails", () => {
  const a = make(["PASS", "BELOW"]); let i = 0;
  for (const [id, win] of [["PASS", 1.1], ["BELOW", 1.099]]) {
    addOrder(a, order(i++, id, -1, startT + 1, win));
    addOrder(a, order(i++, id, -1, startT + 1, -1));
    for (let j = 0; j < 5; j++) addOrder(a, order(i++, id, -1, startT + 1, 0));
    for (let j = 0; j < 7; j++) addOrder(a, order(i++, id, -1, startT + H + 1, 1));
    for (let j = 0; j < 6; j++) addOrder(a, order(i++, id, -1, startT + 2 * H + 1, 1));
  }
  const audit = { checksOk: true, total: { closes: 40, unitGp: 28.199, unitGl: 2, sizedNetUsd: 52.398, unknownReturns: 0, unknownCash: 0 },
    byDirection: [{ key: "Short", closes: 40, unitGp: 28.199, unitGl: 2, sizedNetUsd: 52.398 }] };
  const r = finishAnalysis(a, audit, 0);
  assert.equal(r.exploratory.eligible, 2); assert.equal(r.exploratory.consistent, 1);
  assert.equal(r.rows.find(x => x[0] === "PASS" && x[1] === -1)[7], true);
  assert.equal(r.rows.find(x => x[0] === "BELOW" && x[1] === -1)[7], false);
});

test("unknown funding, returns, clocks, side, identity and reconciliation fail closed", () => {
  for (const edit of [
    x => { x.allocatedNotional = null; }, x => { x.allocatedNotional = -1; }, x => { x.unitR = null; },
    x => { x.sizedPnl = NaN; }, x => { x.side = 0; }, x => { x.cfg = "UNKNOWN"; },
    x => { x.sym = "OTHER"; }, x => { x.exitT = startT; }, x => { x.exitT = endT + 1; },
  ]) { const a = make(), x = order(0, "A", 1, startT + 1, .1); edit(x); assert.throws(() => addOrder(a, x)); }
  const a = make(); addOrder(a, order(0, "A", 1, startT + 1, .1));
  assert.throws(() => addOrder(a, order(0, "A", 1, startT + 1, .1)), /duplicate/);
  const bad = { checksOk: true, total: { closes: 1, unitGp: .2, unitGl: 0, sizedNetUsd: .2, unknownReturns: 0, unknownCash: 0 }, byDirection: [] };
  assert.throws(() => finishAnalysis(a, bad, 0), /unit profit/);
});
