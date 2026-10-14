import assert from "node:assert/strict";
import { test } from "node:test";
import { accountSource, cashPf, sameDataScope, liveBalanceUnavailable } from "./accounting.ts";

test("cash PF does not substitute normalized PF when real execution loses", () => {
  const row = { n: 12, cashPf: 0.20, pf: 1.36 };
  assert.equal(cashPf(row), 0.20);
  assert.equal(cashPf({ n: 12, pf: 1.36 } as typeof row), null);
});

test("missing, invalid and empty execution ledgers never report profitability", () => {
  assert.equal(cashPf(null), null);
  assert.equal(cashPf({ n: 0, cashPf: 1.36 }), null);
  assert.equal(cashPf({ n: 12, cashPf: null }), null);
  assert.equal(cashPf({ n: 12, cashPf: NaN }), null);
  assert.equal(cashPf({ n: 12, cashPf: 0 }), 0);
});

test("position-only reads cannot claim an exchange balance snapshot", () => {
  assert.equal(accountSource({ source: "exchange" }), "Exchange account snapshot");
  assert.equal(accountSource({ source: "positions" }), "Account balance unavailable");
  assert.equal(accountSource(), "Account balance unavailable");
});

test("a source, range or connection switch cannot display a prior request's figures", () => {
  const current = ["bingx-x01", "live", 24];
  assert.equal(sameDataScope(current, ["bingx-x01", "live", 24]), true);
  assert.equal(sameDataScope(current, ["bingx-x01", "sim", 24]), false);
  assert.equal(sameDataScope(current, ["bingx-x01", "live", 6]), false);
  assert.equal(sameDataScope(current, ["bingx-vst-02", "live", 24]), false);
});

test("live ledger with no exchange baseline cannot claim a paper-funded account balance", () => {
  assert.equal(liveBalanceUnavailable("live", "unavailable"), true);
  assert.equal(liveBalanceUnavailable("live", "paper start balance + live P&L"), true);
  assert.equal(liveBalanceUnavailable("live", undefined), true);
  assert.equal(liveBalanceUnavailable("live", "account equity"), false);
  assert.equal(liveBalanceUnavailable("paper", "paper start balance"), false);
});
