// Stop-risk budget and the equity-relative position cap: what every stop hit at once would cost stays within
// maxRiskPct × equity (targets scaled by one factor, then the weakest new ones left out when positions at the
// exchange minimum cannot shrink; held positions never dropped).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { controlTargets, positionCapFor, scaleToRisk, type ControlTarget } from "./live.ts";

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

  it("worst case: priced at the exchange backstops, the same budget scales further than at the lanes' own stops", () => {
    // 4 positions of 15 USD, lane stops 2 %, backstop 20 %: 1.2 USD at the lanes' stops, 12 USD if every backstop fills
    const ts = ["A", "B", "C", "D"].map((k) => ({ ...t(k, 15, 1, 0.2), riskDist: 0.02 }));
    assert.equal(scaleToRisk(ts, 34, 0.5, exact)!.factor, 1, "lanes' stops: 1.2 USD within 17 USD");
    const w = scaleToRisk(ts, 34, 0.25, exact, undefined, (x) => x.stopDist)!;
    assert.ok(Math.abs(w.risk - 12) < 1e-9);
    assert.ok(Math.abs(w.factor - 8.5 / 12) < 1e-9);
    assert.ok(Math.abs(ts.reduce((a, x) => a + x.notional * x.stopDist, 0) - 8.5) < 1e-9, "worst case at 25 % of equity");
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
    // (each of these sits at its minimum: the survivors keep it, the budget is met by the drops alone)
    const held = [t("H", 10, 1, 0.5)];
    assert.deepEqual(scaleToRisk(held, 20, 0.05, atMin, new Set(["H|1"]))!.dropped, []);
    assert.equal(held.length, 1);
  });
});

describe("stop-risk budget: drops decided first, the factor on the survivors (C8)", () => {
  it("a survivor is not shrunk for the budget of a position that is dropped anyway", () => {
    // budget 1 USD. A (20 USD, 5 % stop, minimum 1) can shrink; B sits at its minimum of 10 at a 10 % stop (1 USD)
    const snap = (s: string, q: number) => Math.max(s === "A" ? 1 : 10, q);
    const ts = [t("A", 20, 1, 0.05), t("B", 10, 1, 0.1)];
    const r = scaleToRisk(ts, 20, 0.05, snap)!;
    assert.deepEqual(r.dropped, ["B|1"], "B alone fills the budget at its minimum");
    assert.equal(r.factor, 1, "the factor is computed on A alone: 1 USD fits");
    assert.deepEqual(ts.map((x) => [x.key, x.qty]), [["A|1", 20]], "A keeps its size (it was squeezed to 10 before)");
  });

  it("drops only what the minimums need; a survivor at its minimum stays there and the others share the rest", () => {
    // budget 1 USD. H held (10 at minimum 10, 5 %: 0.5), A (40, minimum 1, 5 %: 2), B and C at minimum 10 (0.5 each)
    const snap = (s: string, q: number) => Math.max(s === "A" ? 1 : 10, q);
    const ts = [t("H", 10, 1, 0.05), t("A", 40, 1, 0.05), t("B", 10, 1, 0.05), t("C", 10, 1, 0.05)];
    const r = scaleToRisk(ts, 20, 0.05, snap, new Set(["H|1"]))!;
    // the minimums (0.5 + 0.05 + 0.5 + 0.5) are over 1: C, then B go; A is NOT dropped (the old pass dropped it too)
    assert.deepEqual(r.dropped, ["C|1", "B|1"]);
    assert.deepEqual(ts.map((x) => x.key), ["H|1", "A|1"]);
    // H cannot shrink (0.5), A takes the remaining 0.5 USD of risk: 10 USD
    assert.equal(ts[0].qty, 10);
    assert.ok(Math.abs(ts[1].qty - 10) < 1e-9, `A ${ts[1].qty}`);
    assert.ok(Math.abs(riskOf(ts) - 1) < 1e-9);
  });

  it("volEff follows each target's own resize", () => {
    const snap = (s: string, q: number) => Math.max(s === "A" ? 1 : 10, q);
    const ts = [{ ...t("H", 10, 1, 0.05), volEff: 10 }, { ...t("A", 40, 1, 0.05), volEff: 40 }];
    scaleToRisk(ts, 20, 0.05, snap, new Set(["H|1"]));
    assert.equal(ts[0].volEff, 10);
    assert.ok(Math.abs((ts[1].volEff ?? 0) - 10) < 1e-9);
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

describe("planned loss distance (riskDist)", () => {
  const cs = { notionalUsd: 1, ratio: 8, maxNotionalUsd: 24, maxPositions: 0, rebalancePct: 0, minStopPct: 0.01 };
  const px = new Map([["A", 1]]);
  const lane = (vol: number, sl: number, risk?: number) => ({
    cfg: "b|rsi-14@m15|tp2|sl2|tr0|h32",
    sym: "A",
    side: 1 as const,
    vol,
    sl,
    ...(risk !== undefined ? { risk } : {}),
  });

  it("is the volume-weighted mean of the lanes' own stops; the backstop stays at the widest lane", () => {
    // 9 units at 2 %, 1 unit at 34 %: the backstop is capped at 20 %, the planned loss 5.2 %
    const { targets } = controlTargets([lane(9, 0.02), lane(1, 0.34)], px, cs);
    assert.equal(targets[0].stopDist, 0.2);
    assert.ok(Math.abs((targets[0].riskDist ?? 0) - 0.052) < 1e-9);
  });

  it("a stop trailed past the entry risks nothing (floored at the minimum stop)", () => {
    const { targets } = controlTargets([lane(1, 0.03, 0)], px, cs);
    assert.equal(targets[0].riskDist, 0.01);
    assert.ok(Math.abs(targets[0].stopDist - 0.036) < 1e-9);
  });

  it("the risk budget measures riskDist: one wide lane no longer shrinks every position to the minimum", () => {
    // equity 32, budget 15 %: 4.8 USD; two 24 USD positions with mostly 2 % lanes and one 34 % lane each
    const mk = () => controlTargets([lane(9, 0.02), lane(1, 0.34), { ...lane(9, 0.02), sym: "B" }], new Map([["A", 1], ["B", 1]]), cs).targets;
    const ts = mk();
    const r = scaleToRisk(ts, 32, 0.15, exact)!;
    assert.equal(r.factor, 1, "24 × 5.2 % + 24 × 2 % = 1.73 USD, inside 4.8");
    // measured at the backstop (the old rule) the same book was cut to 4.8 / (24 × 20 % + 24 × 2.4 %) = 0.89
    const old = mk().map((x) => ({ ...x, riskDist: undefined }));
    assert.ok(scaleToRisk(old, 32, 0.15, exact)!.factor < 0.9);
  });

  it("the volume factor reaches the targets until the per-position cap binds", () => {
    const at = (ratio: number) => controlTargets([lane(1, 0.02)], px, { ...cs, ratio }).targets[0].notional;
    assert.equal(at(4), 4);
    assert.equal(at(8), 8);
    assert.equal(at(32), 24);
  });
});

describe("control ownership through the ledger", () => {
  it("an own position whose stop order vanished stays ours (and is managed), not foreign", async () => {
    const { controlOwnership } = await import("./live.ts");
    const book = {
      positions: [{ symbol: "AAA-USDT", venueSymbol: "AAA-USDT", side: "long" as const, qty: 5 }],
      orders: [],
    };
    // no own order, not recent, no ledger: someone else's (hedge mode: that side; one-way: the symbol)
    assert.deepEqual([...controlOwnership(book, "bingx-x01", new Set()).foreign], ["AAA-USDT|1"]);
    assert.deepEqual([...controlOwnership(book, "bingx-x01", new Set(), new Set(), "oneway").foreign], ["AAA-USDT"]);
    // the ledger still counts it: ours
    const r = controlOwnership(book, "bingx-x01", new Set(), new Set(["AAA-USDT|1"]));
    assert.equal(r.held.get("AAA-USDT|1"), 5);
    assert.equal(r.foreign.size, 0);
    // a foreign order on the symbol still makes the whole symbol foreign
    const mixed = { ...book, orders: [{ symbol: "AAA-USDT", venueSymbol: "AAA-USDT", clientOrderId: "OTHER_1" }] };
    const m = controlOwnership(mixed, "bingx-x01", new Set(), new Set(["AAA-USDT|1"]));
    assert.equal(m.held.size, 0);
    assert.ok(m.foreign.has("AAA-USDT"));
  });
});
