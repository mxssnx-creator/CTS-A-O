import assert from "node:assert/strict";
import { test } from "node:test";
import { exactVenueOrderId, exactVenueOrderIds } from "./venue-order-id.ts";
import { orphanCancelledZero, type OrphanExitFence } from "../server/orphan-exit-fence.ts";

test("an imprecise numeric venue ID is accepted only beside a compatible exact decimal string", () => {
  const exact = "8923456789012345678", rounded = Number(exact), unrelated = Number("999999999999999999");
  assert.equal(exactVenueOrderId(rounded), "");
  assert.equal(exactVenueOrderIds(rounded, exact), exact);
  assert.equal(exactVenueOrderIds(exact, rounded), exact);
  assert.equal(exactVenueOrderIds(unrelated, exact), "", "a conflicting rounded numeric alias is not ignored");
  assert.equal(exactVenueOrderIds(rounded, "order-not-a-number"), "", "a nonnumeric string cannot corroborate the number");
  assert.equal(exactVenueOrderIds(42, "42"), "42");
  assert.equal(exactVenueOrderIds(42, "43"), "");
  assert.equal(exactVenueOrderIds("42", ""), "", "an explicit blank ID cannot corroborate the exact ID");
  assert.equal(exactVenueOrderIds("42", null, undefined), "42", "absent aliases are allowed");
  for (const invalid of [NaN, Infinity, -2, {}, true]) assert.equal(exactVenueOrderIds(invalid, exact), "");
});

test("a conflicting rounded status alias cannot release an orphan exit fence", () => {
  const exact = "8923456789012345678", pending: OrphanExitFence = {
    conn: "account", sym: "S1-USDT", coid: "CTSBV2_S123", oid: exact,
    positionSide: "LONG", type: "STOP_MARKET",
  };
  const status = (orderId: number, orderID: string) => ({ order: {
    orderId, orderID, symbol: pending.sym, clientOrderId: pending.coid, positionSide: "LONG", side: "SELL",
    type: "STOP_MARKET", status: "CANCELLED", executedQty: 0,
  } });
  assert.equal(orphanCancelledZero(pending, status(Number(exact), exact)), true);
  assert.equal(orphanCancelledZero(pending, status(Number("999999999999999999"), exact)), false,
    "the unknown order must stay fenced despite an exact-looking string alias");
});
