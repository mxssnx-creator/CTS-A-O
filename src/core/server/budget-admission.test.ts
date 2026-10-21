// The account budgets (gross exposure, stop risk, worst case) admit the strongest targets that FIT, in rank order: a
// target whose exchange minimum does not fit a budget is left out and the next ones are still tried, against every
// budget at once. Before (x01, 13 Oct 18:55Z): each scaler dropped from the weakest up "while the survivors cannot
// fit at their minimum", so a strongest target alone over the budget emptied the book — the exposure scaler kept the
// two strongest keys (ZKP, XPL short), the risk scaler dropped XPL (2.00 USD at 11 %, which fit the 0.249 USD
// budget) and then ZKP (2.06 USD at 12.15 %, which did not), and the desk placed nothing while 24 further keys were
// never tried against the risk budget at all.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scaleToBudgets, scaleToRisk, type ControlTarget } from "./live.ts";
import { stepLive, type ExchangeClient } from "./live.server.ts";
import { CoreDb } from "./db.server.ts";
import { fakeRt, lane, rng, SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";

const t = (sym: string, qty: number, px: number, riskDist: number): ControlTarget => ({
  key: `${sym}|-1`,
  sym,
  side: -1,
  lanes: 1,
  vol: 1,
  qty,
  notional: qty * px,
  stopDist: Math.min(0.2, riskDist * 1.2),
  riskDist,
});
const riskOf = (ts: ControlTarget[]) => ts.reduce((a, x) => a + x.notional * (x.riskDist ?? x.stopDist), 0);

describe("stop-risk budget: the strongest targets that fit", () => {
  it("x01, 13 Oct: ZKP (2.06 USD at 12.15 %) is over the 0.249 USD budget, XPL (2.00 USD at 11 %) fits: XPL is kept", () => {
    // one unit is the exchange minimum: nothing shrinks
    const atMin = (_s: string, q: number) => Math.max(1, q);
    const ts = [t("ZKP-USDT", 1, 2.06, 0.1215), t("XPL-USDT", 1, 2.0, 0.11)];
    const r = scaleToRisk(ts, 0.4977, 0.5, atMin)!;
    assert.deepEqual(r.dropped, ["ZKP-USDT|-1"], "the one over the budget, not both");
    assert.deepEqual(
      ts.map((x) => x.key),
      ["XPL-USDT|-1"],
    );
    assert.ok(riskOf(ts) <= 0.24885 + 1e-9);
  });

  it("a stronger target over the budget does not take the weaker ones that fit with it", () => {
    // budget 0.1 USD: A at its minimum costs 0.2, B and C 0.02 each
    const atMin = (_s: string, q: number) => Math.max(1, q);
    const ts = [t("A", 1, 2, 0.1), t("B", 1, 2, 0.01), t("C", 1, 2, 0.01)];
    const r = scaleToRisk(ts, 1, 0.1, atMin)!;
    assert.deepEqual(r.dropped, ["A|-1"]);
    assert.deepEqual(
      ts.map((x) => x.key),
      ["B|-1", "C|-1"],
    );
  });
});

describe("the three budgets together (scaleToBudgets)", () => {
  it("the gross cap fits two minimums; the two strongest fail the risk budget: the next two that fit every budget are kept", () => {
    // equity 0.5: gross cap 5 USD (10×), risk and worst-case budgets 0.25 USD (50 %); targets 2.5 USD with a 2 USD minimum
    const snap = (_s: string, q: number, px: number) => Math.max(2 / px, q);
    const ts = [t("A", 2.5, 1, 0.13), t("B", 2.5, 1, 0.13), t("C", 2.5, 1, 0.03), t("D", 2.5, 1, 0.03), t("E", 2.5, 1, 0.03)];
    const r = scaleToBudgets(ts, 0.5, { maxExposureX: 10, maxRiskPct: 0.5, maxBackstopLossPct: 0.5 }, snap);
    assert.deepEqual(
      ts.map((x) => x.key),
      ["C|-1", "D|-1"],
    );
    assert.deepEqual(r.risk?.dropped, ["B|-1", "A|-1"], "over the risk budget at their minimum (2 × 13 % = 0.26), weakest first");
    assert.deepEqual(r.exposure?.dropped, ["E|-1"], "no room left under the gross cap");
    assert.deepEqual(r.worst?.dropped, []);
    const gross = ts.reduce((a, x) => a + Math.abs(x.notional), 0);
    assert.ok(gross <= 5 * 1.0001 + 1e-9, `gross ${gross}`);
    assert.ok(riskOf(ts) <= 0.25 + 1e-9, `risk ${riskOf(ts)}`);
    assert.ok(ts.reduce((a, x) => a + x.notional * x.stopDist, 0) <= 0.25 + 1e-9, "worst case within its budget");
  });

  it("a held position takes its budget first and is never dropped; without equity nothing is scaled or dropped", () => {
    const snap = (_s: string, q: number, px: number) => Math.max(2 / px, q);
    const held = [t("H", 2.5, 1, 0.13), t("C", 2.5, 1, 0.03)];
    const r = scaleToBudgets(held, 0.5, { maxExposureX: 10, maxRiskPct: 0.5, maxBackstopLossPct: 0.5 }, snap, new Set(["H|-1"]));
    assert.deepEqual(
      held.map((x) => x.key),
      ["H|-1"],
      "H (0.26 at its minimum) stays over the budget; C cannot fit after it",
    );
    assert.deepEqual(r.risk?.dropped, ["C|-1"]);
    const none = [t("A", 2.5, 1, 0.13)];
    const n = scaleToBudgets(none, null, { maxExposureX: 10, maxRiskPct: 0.5, maxBackstopLossPct: 0.5 }, snap);
    assert.equal(n.exposure, null);
    assert.equal(n.risk, null);
    assert.equal(none.length, 1);
  });
});

describe("control: the budgets admit the targets that fit (end to end)", () => {
  it("0.50 USDT wallet, 5 USD gross, 0.25 USD risk: two wide-stop keys are passed over, two tight-stop keys open", async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    // the x01 settings of 13 Oct: no slot cap, one venue-minimum position of ~2 USD on a 0.5 USDT wallet
    rt.settings.live = {
      ...rt.settings.live,
      maxPositions: 0,
      maxExposureX: 10,
      maxRiskPct: 0.5,
      maxBackstopLossPct: 0.5,
      maxPositionX: 5,
      minFreeMargin: 0,
      exposureScaler: true,
    };
    // Signals have a hard 2% legacy cap. This budget regression deliberately needs
    // genuine 13%/3% ordinary stops, rather than inventing wide-stop Signal exposure.
    const cfg = (sl: number) => `follow|rsi-mom-14-20@m15|tp1|sl${sl}|tr0|h192`;
    rt.paper.positions = [
      lane(cfg(13), "S0-USDT", 1, 10, 3, 0.13),
      lane(cfg(13), "S1-USDT", 1, 17, 3, 0.13),
      lane(cfg(3), "S2-USDT", 1, 24, 1, 0.03),
      lane(cfg(3), "S3-USDT", 1, 31, 1, 0.03),
    ];
    const ex = new SimExchange(rng(1)).withEquity(0.5);
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    assert.deepEqual([...ex.positions.keys()].sort(), ["S2-USDT|LONG", "S3-USDT|LONG"]);
    const gross = [...ex.positions].reduce((a, [k, q]) => a + q * (k.startsWith("S2") ? 24 : 31), 0);
    assert.ok(gross <= 5 * 1.0001 + 1e-9, `gross ${gross}`);
  });
});
