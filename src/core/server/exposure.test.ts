// Account exposure factor: the gross notional (long and short both counted) stays within maxX × equity, every
// target scaled by the same factor (relations kept), never below the exchange minimum for an open target.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scaleToExposure, type ControlTarget } from "./live.ts";

const t = (sym: string, side: 1 | -1, qty: number, px: number): ControlTarget => ({
  key: `${sym}|${side}`,
  sym,
  side,
  lanes: 1,
  vol: 1,
  qty,
  notional: qty * px,
  stopDist: 0.05,
});
const exact = (_s: string, q: number) => q;

describe("account exposure factor", () => {
  it("scales every target by the same factor down to maxX × equity, long and short alike", () => {
    const ts = [t("XRP-USDT", 1, 658, 1.5), t("XRP-USDT", -1, 17, 1.5), t("QNT-USDT", -1, 1.84, 254)];
    const before = ts.map((x) => x.notional);
    const r = scaleToExposure(ts, 34, 5, exact)!;
    assert.ok(r.factor < 1);
    const gross = ts.reduce((a, x) => a + x.notional, 0);
    assert.ok(Math.abs(gross - 170) < 1e-6, `gross ${gross}`);
    // the relations stay: every target keeps its share of the gross
    const g0 = before.reduce((a, b) => a + b, 0);
    ts.forEach((x, i) => assert.ok(Math.abs(x.notional / gross - before[i] / g0) < 1e-9));
  });

  it("inside the limit, without equity or with the factor off: unchanged", () => {
    const ts = [t("A-USDT", 1, 10, 1)];
    assert.equal(scaleToExposure(ts, 34, 5, exact)!.factor, 1);
    assert.equal(scaleToExposure(ts, null, 5, exact), null);
    assert.equal(scaleToExposure(ts, 34, 0, exact), null);
    assert.equal(ts[0].qty, 10);
  });

  it("a scaled target is snapped to the exchange and never drops below its minimum", () => {
    const ts = [t("A-USDT", 1, 1000, 1), t("B-USDT", 1, 2, 1)];
    // minimum lot 1, step 1
    const snap = (_s: string, q: number) => Math.max(1, Math.floor(q));
    scaleToExposure(ts, 10, 5, snap);
    assert.equal(ts[1].qty, 1, "raised to the minimum, not closed");
    assert.ok(ts[0].qty <= 50);
  });
});
