// Tag-scoped closes on a shared account: a tag closes its own part of a merged position, never another system's.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closableQty, netByTag } from "./core-live-report.mjs";

const o = (coid, side, positionSide, qty, symbol = "SAND-USDT") => ({
  clientOrderId: coid,
  side,
  positionSide,
  executedQty: String(qty),
  symbol,
});

describe("tag-scoped close", () => {
  it("an own net overstated by untagged closes never reaches the other systems' part", () => {
    // CTS-A opened 900, a manual close took 500 of it (no tag); the twin holds 462 on the same short
    const orders = [
      o("ctsav2_e1", "SELL", "SHORT", 900),
      o("", "BUY", "SHORT", 500),
      o("ctsv2t_e1", "SELL", "SHORT", 462),
    ];
    const { own, others } = netByTag(orders, "CTSAV2_");
    assert.equal(own.get("SAND-USDT|SHORT"), 900);
    // the exchange shows 862 (400 CTS-A + 462 twin): only 400 may close
    assert.equal(closableQty(862, own.get("SAND-USDT|SHORT"), others.get("SAND-USDT|SHORT")), 400);
  });

  it("a tag alone on a position closes its whole net; a net below the position closes only the net", () => {
    const { own, others } = netByTag([o("ctsv2t_e1", "BUY", "LONG", 10), o("ctsv2t_x1", "SELL", "LONG", 4)], "CTSV2T_");
    assert.equal(closableQty(6, own.get("SAND-USDT|LONG"), others.get("SAND-USDT|LONG") ?? 0), 6);
    assert.equal(closableQty(9, own.get("SAND-USDT|LONG"), 0), 6);
  });

  it("another system's closed-out history counts as zero, not negative", () => {
    const { others } = netByTag([o("ctsbx1_e1", "BUY", "LONG", 5), o("ctsbx1_x1", "SELL", "LONG", 8)], "CTSV2T_");
    assert.equal(others.get("SAND-USDT|LONG"), 0);
  });
});
