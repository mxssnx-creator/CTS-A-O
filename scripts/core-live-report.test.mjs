// Tag-scoped closes on a shared account: a tag closes its own part of a merged position, never another system's.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closableQty, historyWith, netByTag, ownOpenPnl, ownResults } from "./core-live-report.mjs";

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
    // own-first: the manual close of 500 took CTS-A's quantity (the operator's quantity is never own)
    assert.equal(own.get("SAND-USDT|SHORT"), 400);
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

describe("order history paging", () => {
  it("a busy range (more than one 500-order page) is read in full, whichever 500 the exchange returns", async () => {
    // 1,800 orders in one hour; the fake exchange answers a full range with its NEWEST 500, as a busy CTS-A hour did
    const t0 = 1_790_000_000_000;
    const all = Array.from({ length: 1800 }, (_, i) => ({ orderId: String(i), time: t0 + i * 2000 }));
    const signed = async (_n, _c, _m, _p, q) => {
      const xs = all.filter((o) => o.time >= q.startTime && o.time <= q.endTime);
      return { orders: xs.slice(-q.limit) };
    };
    const got = await historyWith(signed, "mainnet", "x", t0, t0 + 3_600_000);
    assert.equal(got.length, 1800);
  });
});

describe("R-e: the loss check counts own quantity only (own-first)", () => {
  const T = "CTSBV2_";
  const f = (coid, side, qty, px, t, extra = {}) => ({
    orderId: `${coid}-${t}`,
    clientOrderId: coid,
    symbol: "PUMP-USDT",
    positionSide: "SHORT",
    side,
    status: "FILLED",
    executedQty: String(qty),
    avgPrice: String(px),
    cumQuote: String(qty * px),
    time: t,
    updateTime: t,
    profit: "0",
    commission: "0",
    ...extra,
  });

  it("a manual close on a merged side reduces our quantity first, carries its share of the money and ends our episode as hand", async () => {
    const all = [
      f(`${T}Ea`, "SELL", 400, 0.005, 1),
      // the operator shorts 14,269 by hand on the same side (merged): never ours
      f("", "SELL", 14269, 0.005, 2),
      // the operator buys back 1,000 by hand: 400 of it is taken from ours first (profit share 400 / 1000)
      f("", "BUY", 1000, 0.0049, 3, { profit: "0.1", commission: "-0.01" }),
      // another symbol nobody of ours trades: ignored
      { ...f("", "SELL", 5, 1, 4), symbol: "OTHER-USDT" },
    ];
    const r = await ownResults({ tag: T, from: 0, all });
    assert.equal(r.orders, 1, "own orders only in the count");
    assert.equal(r.positions.length, 1);
    const p = r.positions[0];
    assert.equal(p.open, false);
    assert.equal(p.closedBy, "hand");
    assert.equal(p.hand, true);
    assert.ok(Math.abs(p.net - (0.1 - 0.01) * 0.4) < 1e-12, String(p.net));
    // hand episodes stay out of the PF counts, their money stays in
    const k = Object.values(r.byKind)[0];
    assert.equal(k.positions, 0);
    assert.equal(k.hand, 1);
    assert.ok(Math.abs(k.net - p.net) < 1e-12);
  });

  it("someone else's fill into the position never adds to ours; open P&L is our quantity against our own entry", async () => {
    const all = [f(`${T}Ea`, "SELL", 400, 0.005, 1), f("", "SELL", 14269, 0.0052, 2)];
    const r = await ownResults({ tag: T, from: 0, all });
    const p = r.positions[0];
    assert.equal(p.qty, 400);
    assert.equal(p.avgEntry, 0.005);
    const raw = [{ symbol: "PUMP-USDT", positionSide: "SHORT", positionAmt: "-14669", markPrice: "0.0049", unrealizedProfit: "1.6" }];
    const o = ownOpenPnl(r.positions, raw);
    assert.equal(o.approx, false);
    assert.ok(Math.abs(o.open - 400 * (0.005 - 0.0049)) < 1e-12, String(o.open));
    // no mark price: the old share of the venue's unrealized profit, flagged
    const a = ownOpenPnl(r.positions, [{ ...raw[0], markPrice: undefined }]);
    assert.equal(a.approx, true);
    assert.ok(Math.abs(a.open - 1.6 * (400 / 14669)) < 1e-12);
  });
});
