import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accountSource,
  cashPf,
  cashPfText,
  comparisonPfDelta,
  comparisonPfText,
  hasUnitReturnBasis,
  paperUnitReturn,
  returnPf,
  returnPfText,
  sameDataScope,
  unitStatsPfText,
  presetMetricsPfText,
  liveBalanceUnavailable,
} from "./accounting.ts";

test("return PF is the primary metric and cash PF remains a separate diagnostic", () => {
  const row = { n: 12, cashPf: 0.2, pf: 1.36 };
  assert.equal(returnPf(row), 1.36);
  assert.equal(cashPf(row), 0.2);
  assert.equal(returnPf({ n: 12, cashPf: 0.2 } as typeof row), null);
  assert.equal(cashPf({ n: 12, pf: 1.36 } as typeof row), null);
});

test("missing, invalid and empty execution ledgers never report profitability", () => {
  assert.equal(returnPf(null), null);
  assert.equal(returnPf({ n: 0, pf: 1.36 }), null);
  assert.equal(returnPf({ n: 12, pf: NaN }), null);
  assert.equal(returnPf({ n: 12, pf: 0 }), 0);
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

test("a no-loss return PF sample discloses the sentinel without changing its numeric ranking value", () => {
  const row = { n: 3, pf: 4, noLoss: true };
  assert.equal(returnPf(row), 4);
  assert.equal(returnPfText(row), "No losses");
  assert.equal(returnPfText({ n: 3, pf: 4, noLoss: false }), "4.00");
  assert.equal(returnPfText({ n: 0, pf: 4, noLoss: true }), "–");
  assert.equal(returnPfText({ n: 3, pf: NaN, noLoss: true }), "–");
});

test("cash PF text uses explicit no-loss provenance without reinterpreting measured or legacy four", () => {
  assert.equal(cashPfText({ n: 3, cashPf: 4, cashNoLoss: true }), "No losses");
  assert.equal(cashPfText({ n: 3, cashPf: 4, cashNoLoss: false }), "4.00");
  assert.equal(cashPfText({ n: 3, cashPf: 4 }), "4.00");
  assert.equal(cashPfText({ n: 3, cashPf: 0, cashNoLoss: false }), "0.00");
  assert.equal(cashPfText({ n: 0, cashPf: 4, cashNoLoss: true }), "–");
  assert.equal(cashPfText({ n: 3, cashPf: Number.NaN, cashNoLoss: true }), "–");
});

test("preset comparisons distinguish a no-loss score from an actual finite ratio of four", () => {
  const noLoss = {
    n: 1,
    pf: 4,
    gp: 1,
    gl: 0,
    noLoss: true,
    pfConvention: "no-loss-sentinel",
    pfBasis: "unit-net-returns",
  };
  const four = {
    n: 2,
    pf: 4,
    gp: 4,
    gl: 1,
    noLoss: false,
    pfConvention: "gross-return-ratio",
    pfBasis: "unit-net-returns",
  };
  const five = { ...four, pf: 5, gp: 5 };
  assert.equal(comparisonPfText(noLoss), "No losses");
  assert.equal(comparisonPfText(four), "4.00");
  assert.equal(comparisonPfDelta(noLoss, five), null);
  assert.equal(comparisonPfDelta(five, noLoss), null);
  assert.equal(comparisonPfDelta(noLoss, noLoss), null);
  assert.equal(comparisonPfDelta(four, five), -1);
  assert.equal(comparisonPfText({ ...four, n: 0 }), "–");
  assert.equal(comparisonPfDelta({ ...four, n: 0 }, five), null);
});

test("old comparison payloads cannot present a legacy score or delta as a measured ratio", () => {
  const legacy = { n: 3, pf: 4 };
  assert.equal(comparisonPfText(legacy), "4.00 (basis unavailable)");
  assert.equal(comparisonPfText({ n: 3, pf: 1.2 }), "1.20 (basis unavailable)");
  assert.equal(comparisonPfDelta(legacy, legacy), null);
  assert.equal(
    comparisonPfDelta({ ...legacy, noLoss: false, pfConvention: "gross-return-ratio" }, legacy),
    null,
  );
  assert.equal(comparisonPfText({ n: 0, pf: 0 }), "–");
  assert.equal(
    comparisonPfText({
      n: 3,
      pf: 4,
      gp: 4,
      gl: 1,
      noLoss: false,
      pfConvention: "gross-return-ratio",
    }),
    "4.00 (basis unavailable)",
    "old weighted gross sums do not certify unit returns",
  );
  assert.equal(comparisonPfText({ n: 3, pf: null, pfBasis: "unavailable" }), "Basis unavailable");
  assert.equal(returnPf({ n: 3, pf: 4, pfBasis: "unavailable" }), null);
});

test("paper close displays use persisted unit returns and never fall back to size-weighted returns", () => {
  const weighted = { r: -0.068, unit_r: -0.01 };
  assert.equal(paperUnitReturn(weighted), -0.01);
  assert.equal(paperUnitReturn({ ...weighted, unit_r: null }), null);
  assert.equal(paperUnitReturn({ ...weighted, unit_r: undefined }), null);
  assert.equal(paperUnitReturn({ unit_r: 0 }), 0);
  assert.equal(paperUnitReturn({ unit_r: NaN }), null);
});

test("unavailable archived unit history is distinct from a known empty run and a no-loss score", () => {
  const known = { n: 2, pf: 4, gp: 4, gl: 1, pfBasis: "unit-net-returns", unknownReturns: 0 };
  assert.equal(hasUnitReturnBasis(known), true);
  assert.equal(unitStatsPfText(known), "4.00");
  assert.equal(unitStatsPfText({ ...known, n: 1, gp: 1, gl: 0 }), "No losses");
  assert.equal(unitStatsPfText({ ...known, n: 0, pf: 0, gp: 0, gl: 0 }), "–");
  assert.equal(hasUnitReturnBasis({ ...known, unknownReturns: 1 }), false);
  assert.equal(hasUnitReturnBasis({ ...known, pfBasis: "unavailable" }), false);
  assert.equal(hasUnitReturnBasis({}), false);
  assert.equal(unitStatsPfText({ n: 3, pf: 4, gp: 4, gl: 1 }), "Basis unavailable");
});

test("saved preset cards require verified unit evidence while fixed research keeps its disclosed study basis", () => {
  const known = { n: 2, pf: 1.36, gp: 1.36, gl: 1, pfBasis: "unit-net-returns", unknownReturns: 0 };
  assert.equal(presetMetricsPfText("saved", known), "1.36");
  assert.equal(presetMetricsPfText("auto", { ...known, pf: 4, gp: 1, gl: 0 }), "No losses");
  assert.equal(presetMetricsPfText("saved", { n: 2, pf: 0.2 }), "Basis unavailable");
  assert.equal(presetMetricsPfText("research", { n: 2, pf: 0.2 }), "0.20");
  assert.equal(presetMetricsPfText("saved", { ...known, pf: 4, gp: 4, gl: 1 }), "4.00");
});
