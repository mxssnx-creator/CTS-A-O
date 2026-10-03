// Stop-risk budget and the equity-relative position cap: what every stop hit at once would cost stays within
// maxRiskPct × equity (targets scaled by one factor, then the weakest new ones left out when positions at the
// exchange minimum cannot shrink; held positions never dropped).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { positionCapFor, scaleToRisk, type ControlTarget } from "./live.ts";

const t = (sym: string, qty: number, px: number, stopDist: number): ControlTarget => ({
  key: `${sym}|1`,
  sym,
  side: 1,
  lanes: 1,
  vol: 1,
  qty,
  notional: qty * px,
  stopDist,
});
const exact = (_s: string, q: number) => q;
const riskOf = (ts: ControlTarget[]) => ts.reduce((a, x) => a + x.notional * x.stopDist, 0);

describe("stop-risk budget", () => {
  it("scales every target by one factor to maxRiskPct × equity, relations kept", () => {
    // 3 positions of 15 USD at 2 / 4 / 6 % stops: 1.8 USD at risk; equity 34 at 4 % = 1.36 USD
    const ts = [t("A", 15, 1, 0.02), t("B", 15, 1, 0.04), t("C", 15, 1, 0.06)];
    const r = scaleToRisk(ts, 34, 0.04, exact)!;
    assert.ok(Math.abs(r.risk - 1.8) < 1e-9);
    assert.ok(Math.abs(riskOf(ts) - 1.36) < 1e-9);
    assert.ok(ts.every((x) => Math.abs(x.notional - 15 * r.factor) < 1e-9));
    assert.deepEqual(r.dropped, []);
  });

  it("inside the budget, without equity or off: unchanged", () => {
    const ts = [t("A", 10, 1, 0.02)];
    assert.equal(scaleToRisk(ts, 34, 0.1, exact)!.factor, 1);
    assert.equal(scaleToRisk(ts, null, 0.1, exact), null);
    assert.equal(scaleToRisk(ts, 34, 0, exact), null);
    assert.equal(ts[0].qty, 10);
  });

  it("positions at the exchange minimum: the weakest new ones are left out, held positions stay", () => {
    // the exchange minimum is 10 units: nothing shrinks
    const atMin = (_s: string, q: number) => Math.max(10, q);
    const ts = [t("H", 10, 1, 0.05), t("A", 10, 1, 0.05), t("B", 10, 1, 0.05), t("C", 10, 1, 0.05)];
    const r = scaleToRisk(ts, 20, 0.05, atMin, new Set(["H|1"]))!; // budget 1 USD, 2 USD at risk
    assert.deepEqual(r.dropped, ["C|1", "B|1"]);
    assert.deepEqual(
      ts.map((x) => x.key),
      ["H|1", "A|1"],
    );
    assert.ok(riskOf(ts) <= 1 + 1e-9);
    // a held position is never dropped, even when it alone exceeds the budget
    const held = [t("H", 10, 1, 0.5)];
    assert.deepEqual(scaleToRisk(held, 20, 0.05, atMin, new Set(["H|1"]))!.dropped, []);
    assert.equal(held.length, 1);
  });
});

describe("equity-relative position cap", () => {
  it("the smaller of the fixed USD cap and maxPositionX × equity", () => {
    assert.equal(positionCapFor(15, 34, 1), 15);
    assert.equal(positionCapFor(Infinity, 34, 0.5), 17);
    assert.equal(positionCapFor(Infinity, 34, 0), Infinity);
    assert.equal(positionCapFor(50, null, 1), 50);
  });
});
