import { it } from "node:test";
import assert from "node:assert/strict";
import { configId } from "../src/core/pipeline/pipeline.ts";
import { auditPricePath, auditScreen } from "./audit-low-range-screen-orders.mjs";

function fixture() {
  const ind = "low-range-3-edge-turn-trend@m1", protect = { tp: .01, sl: .01, trail: 0, hold: 2 };
  const cfg = configId("follow", ind, protect), r = .01 - .0015;
  const reasons = { tp: { n: 1, gp: r, gl: 0 } };
  const forward = { settled: 1, gp: r, gl: 0, openAtEnd: 0, exitReasons: reasons };
  const cells = [{ ind, tf: 1, protect, base: { passed: true }, initiallyValidated: true, directions: [
    { side: 1, initial: { passed: true, gp: 2, gl: 1 }, forwardGate: { candidates: 1, passed: 1 }, forward },
    { side: -1, initial: { passed: false }, forwardGate: { candidates: 0, passed: 0 },
      forward: { settled: 0, gp: 0, gl: 0, openAtEnd: 0, exitReasons: {} } },
  ] }];
  const protocol = { windowScreen: true, recordOrders: true, totalCells: 1, symbols: ["X"],
    start: 60_000, end: 180_000, policy: { cost: .0015 } };
  const total = { cells: 1, basePassed: 1, activeConfigs: 1, contexts: 2, validated: 1,
    historicalGp: 2, historicalGl: 1, forwardCandidates: 1, forwardGatePassed: 1, forwardGateRejected: 0,
    ...forward };
  const results = { status: "completed", total, byStrategy: { normal: forward }, byStrategyTf: { "normal|1": forward } };
  const orders = [{ cfg, ind, tf: 1, strategy: "normal", sym: "X", side: 1, entryT: 60_000, exitT: 120_000,
    entry: 100, exit: 101, r, reason: "tp", bars: 1 }];
  return { protocol, results, cells, orders };
}
const run = ({ protocol, results, cells, orders }) => auditScreen(protocol, results, cells, orders);

it("reconciles each modeled order and refuses invalid identity, cost, exit and aggregate evidence", () => {
  const good = fixture();
  assert.equal(run(good).settled, 1);
  const unvalidated = structuredClone(good); unvalidated.cells[0].initiallyValidated = false;
  assert.throws(() => run(unvalidated), /outside initial Active set/);
  const duplicate = structuredClone(good); duplicate.orders.push({ ...duplicate.orders[0] });
  assert.throws(() => run(duplicate), /duplicate order/);
  const cost = structuredClone(good); cost.orders[0].r += .0015;
  assert.throws(() => run(cost), /one-time cost/);
  const target = structuredClone(good); target.orders[0].exit = 100.5; target.orders[0].r = .005 - .0015;
  assert.throws(() => run(target), /target was not reached/);
  const early = structuredClone(good); early.orders[0].reason = "time";
  assert.throws(() => run(early), /early time exit/);
  const totals = structuredClone(good); totals.results.total.gp += .01;
  assert.throws(() => run(totals), /total gains/);
});

it("checks Normal targets and prior-bar trailing stops on both sides against candles", () => {
  const good = fixture();
  auditPricePath(good.orders[0], good.cells[0].protect,
    [{ t: 60_000, o: 100, h: 101, l: 99.5, c: 100.5 }]);
  assert.throws(() => auditPricePath(good.orders[0], good.cells[0].protect,
    [{ t: 60_000, o: 100, h: 100.9, l: 99.5, c: 100.5 }]), /no recorded exit/);
  const protect = { tp: .1, sl: .05, trail: .02, hold: 3 };
  for (const side of [1, -1]) {
    const first = side === 1
      ? { t: 60_000, o: 100, h: 103, l: 99, c: 102 }
      : { t: 60_000, o: 100, h: 101, l: 97, c: 98 };
    const second = side === 1
      ? { t: 120_000, o: 102, h: 102.5, l: 100, c: 100.5 }
      : { t: 120_000, o: 98, h: 100, l: 97.5, c: 99 };
    const exit = side === 1 ? 103 * .98 : 97 * 1.02;
    auditPricePath({ ...good.orders[0], side, bars: 2, exitT: 180_000, exit, reason: "trail" }, protect, [first, second]);
    assert.throws(() => auditPricePath({ ...good.orders[0], side, bars: 2, exitT: 180_000,
      exit, reason: "sl" }, protect, [first, second]), /exit reason differs/);
  }
});
