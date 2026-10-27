import assert from "node:assert/strict";
import { test } from "node:test";
import { auditReplayPrices } from "./replay-price-audit.mjs";

const t = 1_000_000_000;
function fixture() {
  const cfg = "follow|ema@m1|tp1|sl1|tr0|h60|mc";
  return { feed: { candles: { "A|1": [{ t, o: 100, h: 102, l: 99, c: 101, v: 1 },
    { t: t + 60_000, o: 101, h: 102, l: 100, c: 101, v: 1 }] } },
  session: { settings: { cost: .0015 }, validation: [{ t, real: [cfg], checks: [[cfg, 1]] }],
    trades: [{ cfg, sym: "A", side: 1, entryT: t, exitT: t + 60_000, entry: 100, exit: 101,
      r: .0085, mult: 1, kind: "normal", vol: 1 }], openEnd: [] } };
}

test("one-minute prices, selected configurations and cost-adjusted unit returns reconcile", () => {
  const f = fixture(), report = auditReplayPrices(f.feed, f.session);
  assert.equal(report.ok, true);
  assert.equal(report.candleCount, 2);
  assert.equal(report.selectedSeats, 1);
  assert.ok(report.maxReturnError < 1e-12);
});

test("bad bars, future/unselected seats, price errors and missing return provenance cannot pass", () => {
  const f = fixture();
  f.feed.candles["A|1"][1].t += 60_000;
  f.feed.candles["A|1"][0].h = 99;
  f.session.validation[0].t += 1;
  f.session.trades[0].exit = 120;
  f.session.trades[0].r = null;
  const report = auditReplayPrices(f.feed, f.session);
  assert.equal(report.ok, false);
  assert.equal(report.failures.gaps, 1);
  assert.equal(report.failures.invalidBars, 1);
  assert.equal(report.failures.noSelectionTime, 1);
  assert.equal(report.failures.badExitPrices, 1);
  assert.equal(report.failures.unknownReturns, 1);
});

test("plain adjusted volume is normalized once and unknown or inconsistent sizing fails", () => {
  const f = fixture();
  Object.assign(f.session.trades[0], { vol: 3, mult: 3, r: .0255 });
  assert.equal(auditReplayPrices(f.feed, f.session).ok, true);
  f.session.trades[0].vol = 2;
  assert.equal(auditReplayPrices(f.feed, f.session).failures.unsupportedOrders, 1);
  f.session.trades[0].mult = undefined;
  assert.equal(auditReplayPrices(f.feed, f.session).failures.unsupportedOrders, 1);
});

test("a plausible intrabar entry still fails when it differs from the next bar open", () => {
  const f = fixture();
  f.session.trades[0].entry = 100.5;
  f.session.trades[0].r = (101 - 100.5) / 100.5 - .0015;
  const report = auditReplayPrices(f.feed, f.session);
  assert.equal(report.ok, false);
  assert.equal(report.failures.badEntryPrices, 0);
  assert.equal(report.failures.badReturns, 0);
  assert.equal(report.failures.badEntryOpens, 1);
});

test("missing validation, unsupported ladders and failed seats remain unverified", () => {
  const f = fixture();
  f.session.trades[0].kind = "dca";
  f.session.validation[0].checks[0][1] = 0;
  let report = auditReplayPrices(f.feed, f.session);
  assert.equal(report.ok, false);
  assert.equal(report.failures.unsupportedOrders, 1);
  assert.equal(report.failures.failedSeatChecks, 1);
  f.session.validation = [];
  report = auditReplayPrices(f.feed, f.session);
  assert.equal(report.ok, false);
  assert.equal(report.validationSteps, 0);
});
