import { afterEach, beforeEach, it, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { ownCoidKind } from "./live.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import type { LaneOrder } from "./lane-orders.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
beforeEach(() => { resetLiveBackoff(); mock.timers.enable({ apis: ["Date"], now: Date.now() }); });
afterEach(() => mock.timers.reset());

for (const side of [1, -1] as const) {
  it(`weighs exact native partial and residual fills across restart, side ${side}`, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "cts-native-weighted-")), path = join(dir, "live.sqlite");
    const dbs: CoreDb[] = [];
    t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* closed */ }
      rmSync(dir, { recursive: true, force: true }); });
    const make = (db: CoreDb) => {
      dbs.push(db);
      const { rt } = fakeRt(db);
      Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
        notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
      return rt;
    };
    let rt = make(new CoreDb(path));
    const ex = new SimExchange(), sym = "S0-USDT", key = `${sym}|${side === 1 ? "LONG" : "SHORT"}`;
    const p = { ...lane("follow|ema-9-21@m15|weighted", sym, side, 10, 1, 0.02),
      target: 10 * (1 + side * 0.05), entryT: 1234 };
    rt.paper.positions = [p];
    const step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    await step();
    const stop = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
    assert.ok(stop && stop.qty);
    const original = stop.qty, partial = +(original * 0.4).toFixed(6), firstPx = 10 - side * 0.3,
      finalPx = 10 - side * 0.8, cumulativePx = (partial * firstPx + (original - partial) * finalPx) / original;
    const normalStatus = ex.orderStatus.bind(ex);
    let phase: "partial" | "contradictory" | "full" = "partial";
    const client: ExchangeClient = ex;
    client.orderStatus = async (symbol, id) => id === stop.id
      ? { order: { orderId: id, status: phase === "full" ? "FILLED" : "PARTIALLY_FILLED",
        executedQty: phase === "full" ? original : partial,
        avgPrice: phase === "full" ? cumulativePx : phase === "contradictory" ? firstPx + 1 : firstPx } }
      : normalStatus(symbol, id);
    ex.positions.set(key, +(original - partial).toFixed(6));
    mock.timers.tick(20_000); await step();
    const partialMap = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    assert.equal(partialMap.exitQty, partial);
    assert.ok(Math.abs(partialMap.exitNotional! - partial * firstPx) < 1e-9);
    assert.equal(ex.orders.some((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "Y"), false,
      "oversized sibling is removed only after its exact zero-fill cancellation");
    phase = "contradictory";
    mock.timers.tick(20_000); await step();
    // relation: all rows — any close would be premature while the cumulative receipt conflicts.
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_lane_trades")?.n, 0);
    assert.equal(ex.positions.get(key), +(original - partial).toFixed(6));
    flushLiveKv(rt.db); rt.db.db.close();
    rt = make(new CoreDb(path)); rt.paper.positions = [];
    phase = "full";
    ex.positions.delete(key);
    ex.orders = ex.orders.filter((o) => o.id !== stop.id);
    mock.timers.tick(20_000); await step();
    // relation: all rows — an unverified or duplicate settlement must not enter the result.
    const rows = rt.db.all<{ reason: string; exit: number; side: number }>("SELECT reason,exit,side FROM live_lane_trades");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reason, "stop");
    assert.equal(rows[0].side, side);
    assert.ok(Math.abs(rows[0].exit - cumulativePx) < 1e-9, "the full parent's quantity-weighted execution is used");
    mock.timers.tick(20_000); await step();
    // relation: all rows — the same cumulative order cannot settle twice.
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_lane_trades")?.n, 1);
  });

  it(`restores proven residual stop and target after partial target and restart, side ${side}`, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "cts-partial-repair-")), path = join(dir, "live.sqlite");
    const dbs: CoreDb[] = [];
    t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* closed */ }
      rmSync(dir, { recursive: true, force: true }); });
    const make = (db: CoreDb) => {
      dbs.push(db);
      const { rt } = fakeRt(db);
      Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
        notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
      return rt;
    };
    let rt = make(new CoreDb(path));
    const ex = new SimExchange(), sym = "S0-USDT", key = `${sym}|${side === 1 ? "LONG" : "SHORT"}`;
    const p = { ...lane("follow|ema-9-21@m15|partial-target-repair", sym, side, 10, 1, 0.04),
      target: 10 * (1 + side * 0.05), entryT: 1234 };
    rt.paper.positions = [p];
    const step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    await step();
    const stop = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
    const target = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "Y");
    assert.ok(stop?.qty && stop.stopPrice && target?.qty && target.stopPrice);
    const full = target.qty, part = +(full * 0.4).toFixed(6), remaining = +(full - part).toFixed(6);
    const status = ex.orderStatus.bind(ex), cancel = ex.cancel.bind(ex);
    let targetCancelled = false;
    ex.cancel = async (symbol, id) => { if (id === target.id) targetCancelled = true; return cancel(symbol, id); };
    const client: ExchangeClient = ex;
    client.orderStatus = async (symbol, id) => id === target.id
      ? { order: { orderId: id, status: targetCancelled ? "CANCELLED" : "PARTIALLY_FILLED",
        executedQty: part, avgPrice: target.stopPrice } } : status(symbol, id);
    ex.positions.set(key, remaining);
    mock.timers.tick(20_000); await step();
    assert.equal(ex.orders.filter((o) => ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId))).length, 0,
      "old oversized conditionals were accounted and cancelled");
    assert.equal(ex.positions.get(key), remaining);
    flushLiveKv(rt.db); rt.db.db.close();
    rt = make(new CoreDb(path)); rt.paper.positions = [];
    mock.timers.tick(20_000); await step();
    const replacementStop = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
    assert.ok(replacementStop, "a proven residual regains its own stop before its target");
    assert.equal(replacementStop.qty, remaining);
    assert.equal(replacementStop.stopPrice, stop.stopPrice);
    assert.equal(ex.orders.some((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "Y"), false);
    mock.timers.tick(20_000); await step();
    const replacementTarget = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "Y");
    assert.ok(replacementTarget, "the target is restored after the stop is observed on the venue");
    assert.equal(replacementTarget.qty, remaining);
    assert.equal(replacementTarget.stopPrice, target.stopPrice);
    ex.triggerOrder(replacementStop.id);
    mock.timers.tick(20_000); await step();
    // relation: all rows — no provisional or duplicate close may affect statistics.
    const rows = rt.db.all<{ reason: string; exit: number }>("SELECT reason,exit FROM live_lane_trades");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reason, "stop", "the reason labels the final fill");
    assert.ok(Math.abs(rows[0].exit - (part * target.stopPrice + remaining * stop.stopPrice) / full) < 1e-9);
    assert.equal(ex.positions.has(key), false);
  });
}
