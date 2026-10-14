// Tag-scoped closes on a shared account: a tag closes its own part of a merged position, never another system's.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closableQty, historyWith, netByTag } from "./core-live-report.mjs";

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

describe("exchange report PF", () => {
  it("uses closed dollar results, retains open realized money separately, and recognizes every range", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const t = 1_790_000_000_000;
    const fill = (id, sym, into, profit, qty, at) => ({
      orderId: id, clientOrderId: `TEST_${id}`, symbol: sym, side: into ? "BUY" : "SELL",
      positionSide: "LONG", status: "FILLED", executedQty: qty,
      avgPrice: 100, time: at, updateTime: at, profit, commission: 0,
    });
    const r = await ownResults({ tag: "TEST_", from: t, to: t + 100, all: [
      fill("G1", "A-USDT", true, 0, 1, t), fill("C1", "A-USDT", false, 1.36, 1, t + 1),
      fill("L1", "B-USDT", true, 0, 6.8, t + 2), fill("C2", "B-USDT", false, -6.8, 6.8, t + 3),
      fill("Q1", "C-USDT", true, 0, 2, t + 4), fill("C3", "C-USDT", false, 100, 1, t + 5),
    ] });
    assert.equal(r.pfBasis, "closed-position-net-usdt");
    assert.equal(r.byKind.General.closedPositions, 1);
    assert.equal(r.byKind.Long.closedPositions, 1);
    assert.equal(r.byKind.Signals.openPositions, 1);
    assert.equal(r.byKind.Signals.gp, 0, "the open episode does not boost closed-position PF");
    assert.equal(r.byKind.Signals.net, 100, "its realized money still counts toward account loss checks");
    const gs = Object.values(r.byKind);
    assert.ok(Math.abs(gs.reduce((a, x) => a + x.gp, 0) / gs.reduce((a, x) => a + x.gl, 0) - .2) < 1e-12);
  });
});

describe("dense order history", () => {
  it("reads a burst above 500 orders within one minute without silently dropping fills", async () => {
    const t = 1_790_000_000_000;
    const all = Array.from({ length: 1200 }, (_, i) => ({ orderId: String(i), time: t + i * 20 }));
    const signed = async (_n, _c, _m, _p, q) => ({ orders: all.filter((x) => x.time >= q.startTime && x.time <= q.endTime).slice(-q.limit) });
    assert.equal((await historyWith(signed, "mainnet", "x", t, t + 60_000)).length, 1200);
  });

  it("refuses an incomplete instant instead of issuing an apparently complete PF report", async () => {
    const t = 1_790_000_000_000;
    await assert.rejects(historyWith(async () => ({ orders: Array.from({ length: 500 }, (_, i) => ({ orderId: String(i), time: t })) }), "mainnet", "x", t, t + 1), /truncated/);
    await assert.rejects(historyWith(async () => ({}), "mainnet", "x", t, t + 1), /completeness unknown/);
  });
});
