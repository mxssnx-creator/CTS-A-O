// The venue's own minimums are authoritative: a quantity is never sent a step under what the exchange named, and a
// stop is never sent closer to the mark than the venue accepts.
//
// The quantity cases are the ones live x01 actually paid for: 26 rejected orders across 16 symbols in three days,
// all "The minimum order amount is N <COIN>", because flooring to the lot step dropped a whole step at magnitudes
// where one ULP is bigger than a fixed 1e-12 epsilon.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  type ContractSpec,
  contractSpecOf,
  minQtyFromReject,
  minStopDist,
  pxTick,
  snapPx,
  snapQtyDown,
  snapQtyExchange,
  STOP_TICK_BUFFER,
  stopPxExchange,
  stopTooClose,
  VENUE_MIN_STOP_FRAC,
  widenStopDist,
} from "./bingx.server.ts";

const spec = (p: Partial<ContractSpec>): ContractSpec => ({
  symbol: "T-USDT",
  minQty: 0,
  step: 0.01,
  qtyPrec: 2,
  pxPrec: 4,
  minUsdt: 2,
  ...p,
});

describe("quantity: the venue minimum is never undercut", () => {
  it("flooring an exact multiple of the step returns it, not a step below", () => {
    // 476.53 / 0.01 is 47652.99999999999 in IEEE 754 — one ULP there is 7.3e-12, so a fixed 1e-12 epsilon floored
    // to 476.52 and the venue refused it ("The minimum order amount is 476.53 SOLV.")
    assert.equal(snapQtyDown(476.53, spec({})), 476.53);
    for (const q of [476.53, 84.25, 1.21, 3.63, 12.09, 0.07, 1210.77, 99999.99])
      assert.equal(snapQtyDown(q, spec({})), q, `${q} is an exact multiple of 0.01`);
  });

  it("every step size and precision floors its own exact multiples", () => {
    for (const [step, qtyPrec] of [
      [1, 0],
      [0.1, 1],
      [0.01, 2],
      [0.001, 3],
      [0.0001, 4],
    ] as const)
      for (const mult of [1, 3, 7, 29, 4765, 47653, 123457]) {
        const q = Number((mult * step).toFixed(qtyPrec));
        assert.equal(snapQtyDown(q, spec({ step, qtyPrec })), q, `${mult} x ${step}`);
      }
  });

  it("flooring still floors: a quantity between steps goes down, never up", () => {
    assert.equal(snapQtyDown(476.539, spec({})), 476.53);
    assert.equal(snapQtyDown(476.5299, spec({})), 476.52);
    assert.equal(snapQtyDown(0.004, spec({})), 0);
  });

  it("a minimum the venue named wins over our own view of the contract", () => {
    // our snapshot says minQty 1 / minUsdt 2 — at px 10 a quantity of 1 passes both — but the venue just told us 476.53
    const s = spec({ minQty: 1, minUsdt: 2 });
    const { qty, raised } = snapQtyExchange(1, 10, s, 476.53);
    assert.ok(qty >= 476.53, `${qty} must not be under the named minimum`);
    assert.equal(raised, true);
  });

  it("the raise never lands under what the venue requires, at any step", () => {
    for (const [step, qtyPrec] of [
      [1, 0],
      [0.1, 1],
      [0.01, 2],
      [0.001, 3],
    ] as const)
      for (const named of [476.53, 84.25, 1.21, 0.007, 1210.77]) {
        const s = spec({ step, qtyPrec, minQty: step });
        const { qty } = snapQtyExchange(step, 10, s, named);
        assert.ok(qty >= named - 1e-12, `step ${step}: ${qty} < named ${named}`);
        assert.equal(Number(qty.toFixed(qtyPrec)), qty, `step ${step}: ${qty} exceeds the precision`);
      }
  });

  it("a named minimum the position already clears does not raise it", () => {
    const s = spec({ minQty: 1, minUsdt: 2 });
    assert.deepEqual(snapQtyExchange(500, 10, s, 476.53), { qty: 500, raised: false });
  });

  it("the reject message the venue sends is the source of the named minimum", () => {
    assert.equal(minQtyFromReject("The minimum order amount is 476.53 SOLV."), 476.53);
    assert.equal(minQtyFromReject("Stop Loss price should be lower than the current price"), null);
  });
});

describe("stops: never closer to the mark than the venue accepts", () => {
  // the symbols live x01 actually holds, with their real price precisions
  const CASES: Array<{ sym: string; px: number; pxPrec: number }> = [
    { sym: "SOLV-USDT", px: 0.0042, pxPrec: 6 },
    { sym: "BTC-USDT", px: 62000, pxPrec: 1 },
    { sym: "ETH-USDT", px: 2400, pxPrec: 2 },
    { sym: "AIN-USDT", px: 0.0653, pxPrec: 5 },
    { sym: "ZRO-USDT", px: 1.6224, pxPrec: 4 },
  ];

  it("a stop is always on the right side of the mark, at every precision and every asked distance", () => {
    for (const c of CASES)
      for (const dist of [0, 1e-9, 1e-6, 0.0001, 0.001, 0.01, 0.05, 0.2])
        for (const side of [1, -1] as const) {
          const sp = stopPxExchange(c.px, side, dist, spec({ pxPrec: c.pxPrec }));
          assert.ok(sp > 0, `${c.sym} ${side} ${dist}: no price`);
          if (side === 1) assert.ok(sp < c.px, `${c.sym} long stop ${sp} is not below ${c.px}`);
          else assert.ok(sp > c.px, `${c.sym} short stop ${sp} is not above ${c.px}`);
        }
  });

  it("a distance under the venue minimum is widened to it, not snapped onto the mark", () => {
    // snapPx alone is the bug: a distance tighter than one tick rounds back to the mark and the venue refuses it
    const s = spec({ pxPrec: 4 });
    const px = 1.6224;
    assert.equal(snapPx(px * (1 - 1e-6), s), px, "snapPx gives the mark back — this is what stopPxExchange replaces");
    const sp = stopPxExchange(px, 1, 1e-6, s);
    assert.ok((px - sp) / px >= VENUE_MIN_STOP_FRAC - 1e-9, `${sp} is only ${(((px - sp) / px) * 100).toFixed(4)} % away`);
  });

  it("the minimum distance comes from the contract's own tick, floored", () => {
    // a coarse tick on a cheap coin dominates the floor
    const coarse = minStopDist(0.0042, spec({ pxPrec: 4 }));
    assert.ok(coarse > VENUE_MIN_STOP_FRAC, `tick-derived ${coarse} should exceed the blanket floor`);
    assert.ok(
      Math.abs(coarse - (pxTick(spec({ pxPrec: 4 })) * STOP_TICK_BUFFER) / 0.0042) < 1e-12,
      "the tick buffer sets it",
    );
    // a fine tick on an expensive coin does not, so the floor holds
    assert.equal(minStopDist(62000, spec({ pxPrec: 1 })), VENUE_MIN_STOP_FRAC);
    // a distance the venue already refused raises it
    assert.equal(minStopDist(62000, spec({ pxPrec: 1 }), 0.004), 0.004);
  });

  it("a distance the venue accepts is kept as asked, not widened", () => {
    const s = spec({ pxPrec: 4 });
    const sp = stopPxExchange(1.6224, 1, 0.05, s);
    assert.ok(Math.abs((1.6224 - sp) / 1.6224 - 0.05) < 1e-3, `${sp}`);
  });

  it("the too-close refusal is recognised, and other refusals are not", () => {
    for (const m of [
      "Stop Loss price should be lower than the current price",
      "Stop Loss price should be higher than the current price",
      "stop price is too close to the current price",
    ])
      assert.equal(stopTooClose(m), true, m);
    for (const m of ["The minimum order amount is 476.53 SOLV.", "Insufficient margin", "position not exist"])
      assert.equal(stopTooClose(m), false, m);
  });

  it("widening after a refusal is a real step, bounded, and always above the floor", () => {
    for (const c of CASES) {
      const s = spec({ pxPrec: c.pxPrec });
      let d = minStopDist(c.px, s);
      for (let i = 0; i < 12; i++) {
        const w = widenStopDist(d, c.px, s);
        assert.ok(w > d || w === 0.2, `${c.sym}: ${w} is not wider than ${d}`);
        assert.ok(w <= 0.2 + 1e-12, `${c.sym}: ${w} is unbounded`);
        d = w;
      }
      assert.equal(d, 0.2, `${c.sym}: widening must settle at the bound`);
    }
  });
});

describe("contract specs: the lot is the quantity precision", () => {
  it("a contract whose size is coarser than its precision keeps the venue's own minimum (VST rows, 7 Oct)", () => {
    // the venue validated 0.02 / 0.03 SOL, 0.001 ETH, 1.5 INJ and 4.77 UMA as test orders
    const sol = contractSpecOf({ symbol: "SOL-USDT", size: "1", quantityPrecision: 2, tradeMinQuantity: 0.02, tradeMinUSDT: 2, pricePrecision: 3 })!;
    assert.equal(sol.step, 0.01);
    assert.equal(sol.minQty, 0.02, "not 1 SOL (the size): 50 × the venue's minimum");
    const eth = contractSpecOf({ symbol: "ETH-USDT", size: "0.01", quantityPrecision: 3, tradeMinQuantity: 0.001 })!;
    assert.equal(eth.step, 0.001);
    assert.equal(eth.minQty, 0.001);
    const uma = contractSpecOf({ symbol: "UMA-USDT", size: "0.1", quantityPrecision: 3, tradeMinQuantity: 4.77 })!;
    assert.equal(uma.step, 0.001);
    assert.equal(uma.minQty, 4.77);
    assert.equal(snapQtyExchange(0.02, 117.9, sol).qty, 0.02, "the minimum is sent as it is");
    // the common case (size = the precision's step) is unchanged
    const parti = contractSpecOf({ symbol: "PARTI-USDT", size: "0.01", quantityPrecision: 2, tradeMinQuantity: 63.28 })!;
    assert.deepEqual([parti.step, parti.minQty], [0.01, 63.28]);
    // no precision named: the size is the step
    const bare = contractSpecOf({ symbol: "X-USDT", size: "0.5", tradeMinQuantity: 1 })!;
    assert.equal(bare.step, 0.5);
    assert.equal(contractSpecOf({ size: "1" }), null);
  });
});
