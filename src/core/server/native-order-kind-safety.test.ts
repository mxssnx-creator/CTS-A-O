import assert from "node:assert/strict";
import { afterEach, it, mock } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, isBackstopKind, liveKv, resetLiveBackoff, stepLive, type LiveStatus } from "./live.server.ts";
import { makeCoid, ownCoidKind } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { resetLiveBackoff(); mock.timers.reset(); });

it("only an explicit position-stop kind is treated as a backstop", () => {
  assert.equal(isBackstopKind("S"), true);
  for (const kind of ["", "E", "U", "M", "N", "H", "G", "L", "Q", "C", "T", "V", "Y"])
    assert.equal(isBackstopKind(kind), false, kind);
});

for (const side of [1, -1] as const) {
  it(`confirmed native closes retire their own backstops on separate symbols, side ${side}`, async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    const ex = new SimExchange();
    rt.paper.positions = [
      { ...lane(`follow|ema-9-21@m15|separate-a-${side}`, "S0-USDT", side, 10), entryT: 1234 },
      { ...lane(`follow|ema-9-21@m15|separate-b-${side}`, "S1-USDT", side, 17), entryT: 1235 },
    ];
    const step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    await step();
    const ownStops = ["S0-USDT", "S1-USDT"].map((sym) => ex.orders.find((o) =>
      o.venueSymbol === sym && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V"));
    assert.ok(ownStops[0] && ownStops[1]);
    ex.triggerOrder(ownStops[0].id);
    await step();
    await step();
    assert.ok(ex.orders.some((o) => o.id === ownStops[1]!.id), "the other parent's stop is untouched");
    ex.triggerOrder(ownStops[1].id);
    for (let i = 0; i < 4; i++) await step();
    assert.equal(ex.positions.size, 0);
    assert.equal(ex.orders.length, 0, "journaled backstops are retired after each exact native close");
    assert.deepEqual(liveKv(rt.db, "positionExitCleanup"), {}, "confirmed zero-fill cancellations release their reservations");
    rt.db.db.close();
  });

  it(`a tighter venue cap never removes a departed parent's stop or target, side ${side}`, async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    const ex = new SimExchange(), sym = "S0-USDT", key = `${sym}|${side === 1 ? "LONG" : "SHORT"}`;
    rt.paper.positions = [{ ...lane(`follow|ema-9-21@m15|cap-${side}`, sym, side, 10),
      target: 10 * (1 + side * .1), entryT: 1234 }];
    const step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    await step();
    const native = ex.orders.filter((o) => ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)));
    assert.equal(native.length, 2);
    const qty = ex.positions.get(key), markets = ex.log.filter((o) => o.type === "MARKET").length;
    rt.settings.live.maxVenueOrders = 5;
    rt.paper.positions = [];
    for (let i = 0; i < 3; i++) await step();
    assert.deepEqual(ex.orders.filter((o) => ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)))
      .map((o) => o.id).sort(), native.map((o) => o.id).sort());
    assert.equal(ex.positions.get(key), qty);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, markets, "paper exit did not submit an unsafe market close");
    // relation: all rows — a held parent must not be settled at a ticker while its own orders remain.
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_lane_trades")?.n, 0);
    rt.db.db.close();
  });

  it(`only one native parent enters a side and the next waits for sibling cancellation, side ${side}`, async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const { rt } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0, top: 0 });
    const ex = new SimExchange(), sym = "S0-USDT", key = `${sym}|${side === 1 ? "LONG" : "SHORT"}`;
    const p = (suffix: string) => ({ ...lane(`follow|ema-9-21@m15|${suffix}`, sym, side, 10),
      target: 10 * (1 + side * .1), entryT: suffix === "first" ? 1234 : 1235 });
    rt.paper.positions = [p("first"), p("second")];
    const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
    await step();
    assert.equal(ex.positions.get(key), 1);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 1);
    const stop = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
    const target = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "Y");
    assert.ok(stop && target);
    const cancel = ex.cancel.bind(ex);
    let refuse = true;
    ex.cancel = async (symbol, id) => id === target.id && refuse ? false : cancel(symbol, id);
    ex.triggerOrder(stop.id);
    rt.paper.positions = [p("second")];
    for (let i = 0; i < 2; i++) await step();
    assert.equal(ex.positions.has(key), false, "a stale sibling target cannot be left behind for the next parent");
    assert.ok(ex.orders.some((o) => o.id === target.id));
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 1);
    const state = liveKv<LiveStatus>(rt.db, "liveStatus");
    assert.ok(state?.skipped.some((item) => item.sym === sym) ||
      state?.control?.keys?.some((item) => item.key === `${sym}|${side}`), "the blocked side is visible");
    refuse = false;
    for (let i = 0; i < 3; i++) await step();
    assert.ok(!ex.orders.some((o) => o.id === target.id));
    assert.ok((ex.positions.get(key) ?? 0) > 0, "a new parent may enter after the stale order is confirmed gone");
    rt.db.db.close();
  });

  it(`does not cancel an unverified market entry as a stop, side ${side}`, async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0, top: 0 });
    const ex = new SimExchange(), sym = "S0-USDT", ps = side === 1 ? "LONG" : "SHORT";
    rt.paper.positions = [{ ...lane(`follow|ema-9-21@m15|market-${side}`, sym, side, 10), target: 10 * (1 + side * .1), entryT: 1234 }];
    const step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    await step();
    ex.orders.push({ id: "unknown-market-entry", venueSymbol: sym, symbol: sym, positionSide: ps,
      type: "MARKET", clientOrderId: makeCoid(rt.settings.live.connId, "E"), qty: .2 });
    const canceled: string[] = [], cancel = ex.cancel.bind(ex);
    ex.cancel = async (symbol, id) => { canceled.push(id); return cancel(symbol, id); };
    await step();
    assert.ok(ex.orders.some((x) => x.id === "unknown-market-entry"));
    assert.ok(!canceled.includes("unknown-market-entry"));
    rt.db.db.close();
  });

  it(`an unjournaled flat-side stop remains untouched and blocks admission, side ${side}`, async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    const ex = new SimExchange(), sym = "S0-USDT", ps = side === 1 ? "LONG" : "SHORT";
    await ex.order({ symbol: sym, positionSide: ps, side: side === 1 ? "SELL" : "BUY", type: "STOP_MARKET",
      quantity: 1, stopPrice: side === 1 ? 9 : 11, clientOrderID: makeCoid(rt.settings.live.connId, "S") });
    const orphan = ex.orders[0].id, cancel = ex.cancel.bind(ex), canceled: string[] = [];
    ex.cancel = async (symbol, id) => { canceled.push(id); return cancel(symbol, id); };
    rt.paper.positions = [{ ...lane(`follow|ema-9-21@m15|orphan-${side}`, sym, side, 10), entryT: 1234 }];
    for (let i = 0; i < 3; i++) await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.ok(ex.orders.some((o) => o.id === orphan));
    assert.ok(!canceled.includes(orphan));
    assert.equal(ex.positions.size, 0);
    rt.db.db.close();
  });

  it(`unknown position-exit cancellation survives restart and blocks the next parent, side ${side}`, async (t) => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const dir = mkdtempSync(join(tmpdir(), "cts-exit-cleanup-")), path = join(dir, "live.sqlite"), dbs: CoreDb[] = [];
    t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
      rmSync(dir, { recursive: true, force: true }); });
    const make = () => {
      const db = new CoreDb(path); dbs.push(db);
      const { rt } = fakeRt(db);
      Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
        notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
      return rt;
    };
    let rt = make();
    const ex = new SimExchange(), sym = "S0-USDT", key = `${sym}|${side === 1 ? "LONG" : "SHORT"}`;
    const first = { ...lane(`follow|ema-9-21@m15|cleanup-first-${side}`, sym, side, 10),
      target: 10 * (1 + side * .1), entryT: 1234 };
    const next = { ...lane(`follow|ema-9-21@m15|cleanup-next-${side}`, sym, side, 10), entryT: 1235 };
    rt.paper.positions = [first];
    const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
    await step();
    const native = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
    const backstop = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(native && backstop);
    const status = ex.orderStatus.bind(ex);
    let unknown = true;
    ex.orderStatus = async (symbol, id) => id === backstop.id && unknown
      ? { order: { orderId: id, status: "FILLED" } } : status(symbol, id);
    ex.triggerOrder(native.id);
    rt.paper.positions = [next];
    await step();
    assert.equal(ex.positions.has(key), false);
    assert.ok(Object.keys(liveKv<Record<string, unknown>>(rt.db, "positionExitCleanup") ?? {}).length > 0,
      "uncertain backstop cancellation retains its durable identity");
    flushLiveKv(rt.db); rt.db.db.close();
    rt = make(); rt.paper.positions = [next];
    for (let i = 0; i < 2; i++) await step();
    assert.equal(ex.positions.has(key), false, "unknown canceled exit cannot be forgotten after restart");
    unknown = false;
    for (let i = 0; i < 4; i++) await step();
    assert.ok(ex.positions.has(key), "a confirmed terminal zero-fill cancellation releases the side");
  });

  it(`a stop-exists refusal preserves every unrelated order, side ${side}`, async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0, top: 0 });
    const ex = new SimExchange(), sym = "S0-USDT", ps = side === 1 ? "LONG" : "SHORT";
    const send = ex.order.bind(ex), canceled: string[] = [], cancel = ex.cancel.bind(ex);
    ex.cancel = async (symbol, id) => { canceled.push(id); return cancel(symbol, id); };
    ex.order = async (p) => {
      if (p.type === "STOP_MARKET" && ownCoidKind(String(p.clientOrderID), rt.settings.live.connId) === "S") {
        for (const [i, kind] of (["V", "Y"] as const).entries()) ex.orders.push({ id: `existing-${i}`,
          venueSymbol: sym, symbol: sym, positionSide: ps, type: kind === "V" ? "STOP_MARKET" : "TAKE_PROFIT_MARKET",
          clientOrderId: makeCoid(rt.settings.live.connId, kind), stopPrice: 10, qty: 1, closePosition: false });
        ex.orders.push({ id: "foreign", venueSymbol: sym, symbol: sym, positionSide: ps, type: "STOP_MARKET",
          clientOrderId: "foreign-stop", stopPrice: 10, qty: 1 });
        throw new ExchangeRejected("Position SL order already exists", 109400);
      }
      return send(p);
    };
    rt.paper.positions = [{ ...lane(`follow|ema-9-21@m15|refusal-${side}`, sym, side, 10),
      target: 10 * (1 + side * .1), entryT: 1234 }];
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    for (const id of ["existing-0", "existing-1", "foreign"]) {
      assert.ok(ex.orders.some((x) => x.id === id));
      assert.ok(!canceled.includes(id));
    }
    assert.equal(ex.positions.size, 0, "the newly filled but unprotected quantity follows the emergency close");
    rt.db.db.close();
  });

  it(`an empty stop error never becomes a false successful backstop, side ${side}`, async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", positionSize: "lanes",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0, top: 0 });
    const ex = new SimExchange(), sym = "S0-USDT", send = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.type === "STOP_MARKET" && ownCoidKind(String(p.clientOrderID), rt.settings.live.connId) === "S")
        throw new Error("");
      return send(p);
    };
    rt.paper.positions = [{ ...lane(`follow|ema-9-21@m15|empty-${side}`, sym, side, 10), entryT: 1234 }];
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.equal(ex.positions.size, 0, "a failed protective placement triggers the bounded emergency close");
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind='S' AND status='ok'")?.n, 0);
    rt.db.db.close();
  });
}
