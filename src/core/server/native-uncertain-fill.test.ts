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

beforeEach(() => {
  resetLiveBackoff();
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
});
afterEach(() => mock.timers.reset());

for (const side of [1, -1] as const) {
  it(`a flat venue does not invent a native stop fill while its receipt is unknown, side ${side}`, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "cts-native-unknown-"));
    const path = join(dir, "core.sqlite");
    const opened: CoreDb[] = [];
    t.after(() => {
      for (const db of opened) try { db.db.close(); } catch { /* already closed */ }
      rmSync(dir, { recursive: true, force: true });
    });
    const db = new CoreDb(path);
    opened.push(db);
    const { rt } = fakeRt(db);
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    const ex = new SimExchange();
    const sym = "S0-USDT", cfg = "follow|ema-9-21@m15|native-unknown";
    const key = `${sym}|${side === 1 ? "LONG" : "SHORT"}`;
    const first = { ...lane(cfg, sym, side, 10, 1, 0.02), target: 10 * (1 + side * 0.05), entryT: 1234 };
    rt.paper.positions = [first];
    const step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    await step();
    const stop = ex.orders.find((o) => o.venueSymbol === sym && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
    assert.ok(stop && (ex.positions.get(key) ?? 0) > 0, "the exact parent was funded with its own stop");
    const cancel = ex.cancel.bind(ex), status = ex.orderStatus.bind(ex);
    let unknown = true, once = true;
    ex.cancel = async (symbol, id) => {
      if (id === stop.id && once) { once = false; ex.triggerOrder(id); }
      return cancel(symbol, id);
    };
    const client: ExchangeClient = ex;
    client.orderStatus = async (symbol, id) => unknown && id === stop.id
      ? { order: { orderId: id, status: "FILLED" } } : status(symbol, id);
    client.ordersSince = async () => ({ orders: [] });
    // Moving this parent's stop asks to cancel its old native stop while the same parent remains live. A paper
    // disappearance now conservatively waits on its existing venue exit and does not request a market close.
    rt.paper.positions = [{ ...first, stop: 10 * (1 - side * 0.01), trailOn: true }];
    mock.timers.tick(20_000);
    await step();
    assert.equal(ex.positions.get(key) ?? 0, 0, "the venue is actually flat after the stop trigger");
    // relation: all rows — no close class may invent a settled price while venue execution is unknown.
    const closes = () => rt.db.all<{ side: number; reason: string; exit: number }>(
      "SELECT side,reason,exit FROM live_lane_trades",
    );
    assert.equal(closes().length, 0, `no ticker-priced parent close is booked before fill evidence: ${JSON.stringify(closes())}`);
    mock.timers.tick(20_000);
    await step();
    assert.equal(closes().length, 0, "a flat read alone still does not prove a stop fill");
    const pending = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {}).find((x) => x.id.includes(cfg));
    assert.ok(pending?.s?.oid === stop.id, "the exact native order identity remains available for reconciliation");
    unknown = false;
    for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
    const final = closes();
    assert.equal(final.length, 1, "the actual fill books its parent exactly once");
    assert.equal(final[0].side, side);
    assert.equal(final[0].reason, "stop");
    assert.ok(Math.abs(final[0].exit - stop.stopPrice!) < 1e-9, "the venue's actual stop fill price is used");
    const fillId = `lanefill-${stop.clientOrderId}`;
    const fill = rt.db.get<{ side: number; qty: number; fill_px: number; fee: number | null; fee_known: number }>(
      "SELECT side,qty,fill_px,fee,fee_known FROM live_fills WHERE coid=?", fillId,
    );
    assert.ok(fill, "the actual venue receipt is attached to the canonical native reduction");
    assert.equal(fill.side, side);
    assert.equal(fill.qty, stop.qty);
    assert.equal(fill.fill_px, stop.stopPrice);
    assert.equal(fill.fee_known, 0, "an absent commission remains unknown");
    assert.equal(fill.fee, null);
    flushLiveKv(rt.db);
    rt.db.db.close();
    const reopened = new CoreDb(path);
    opened.push(reopened);
    const { rt: resumed } = fakeRt(reopened);
    Object.assign(resumed.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    resumed.paper.positions = [];
    for (let i = 0; i < 2; i++) {
      mock.timers.tick(20_000);
      await stepLive(resumed as unknown as CoreRuntime, [], resumed.generation, ex);
    }
    assert.equal(reopened.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_fills WHERE coid=?", fillId)?.n, 1,
      "replayed observations do not duplicate a native fill after restart");
    // relation: all rows — restart must not add any duplicate close classification.
    assert.equal(reopened.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_lane_trades")?.n, 1);
  });

  it(`a later same-cumulative native partial receipt can supply its real commission, side ${side}`, async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    const ex = new SimExchange();
    const sym = "S0-USDT", cfg = "follow|ema-9-21@m15|native-partial-fee";
    const key = `${sym}|${side === 1 ? "LONG" : "SHORT"}`;
    rt.paper.positions = [{ ...lane(cfg, sym, side, 10, 1, 0.02), target: 10 * (1 + side * 0.05), entryT: 1234 }];
    const step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    await step();
    const stop = ex.orders.find((o) => o.venueSymbol === sym && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
    assert.ok(stop && stop.qty && stop.stopPrice);
    const before = ex.positions.get(key)!;
    const partial = +(stop.qty * 0.4).toFixed(6);
    ex.positions.set(key, +(before - partial).toFixed(6));
    const status = ex.orderStatus.bind(ex);
    const client: ExchangeClient = ex;
    let withFee = false;
    client.orderStatus = async (symbol, id) => id === stop.id
      ? { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: partial, avgPrice: stop.stopPrice,
        ...(withFee ? { commission: 0.003 } : {}) } } : status(symbol, id);
    const marketCount = ex.log.filter((o) => o.type === "MARKET").length;
    mock.timers.tick(20_000);
    await step();
    const fillId = `lanefill-${stop.clientOrderId}`;
    const readFill = () => rt.db.get<{ qty: number; fill_px: number; fee: number | null; fee_known: number }>(
      "SELECT qty,fill_px,fee,fee_known FROM live_fills WHERE coid=?", fillId,
    );
    const first = readFill();
    assert.ok(first);
    assert.equal(first.qty, partial);
    assert.equal(first.fill_px, stop.stopPrice);
    assert.equal(first.fee, null);
    assert.equal(first.fee_known, 0);
    withFee = true;
    for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
    const measured = readFill();
    assert.ok(measured);
    assert.equal(measured.qty, partial, "the same cumulative execution is not booked twice");
    assert.equal(measured.fill_px, stop.stopPrice);
    assert.equal(measured.fee, 0.003, "the matching venue commission is retained");
    assert.equal(measured.fee_known, 1);
    assert.equal(ex.positions.get(key), +(before - partial).toFixed(6));
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, marketCount, "no duplicate market action");
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_fills WHERE coid=?", fillId)?.n, 1);
    // relation: all rows — the still-held parent cannot be closed under any classification.
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_lane_trades")?.n, 0);
  });
}
