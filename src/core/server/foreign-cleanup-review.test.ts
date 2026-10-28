import assert from "node:assert/strict";
import { afterEach, it, mock } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { makeCoid, ownCoidKind } from "./live.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive, type ExchangeClient, type LiveStatus } from "./live.server.ts";
import { CoreDb } from "./db.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });
for (const side of [1, -1] as const) {
  async function fixture(partial = false, stable = false, db = new CoreDb(":memory:")) {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
    const { rt } = fakeRt(db);
    Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: false });
    const sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
    rt.paper.positions = [{ ...lane("follow|sig-ema-cross-s@m15|tp1|sl2|tr0|h192", sym, side, 17),
      target: 17 * (1 + side * 0.03), entryT: Date.now() - 60_000 }];
    const ex = new SimExchange(); ex.px.set(sym, 17);
    const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], 1, ex); };
    const first = await step();
    const own = ex.positions.get(key)!;
    assert.ok(own > 0, JSON.stringify(first));
    const stop = ex.orders.find((o) => o.venueSymbol === sym && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S")!;
    assert.ok(stop);
    ex.foreignFill(key, 10);
    await step(); await step();
    if (partial || stable) ex.orders.push({ id: "operator-frozen", venueSymbol: sym, symbol: sym, positionSide: ps,
      type: "STOP_MARKET", clientOrderId: "foreign", stopPrice: 15, qty: 1 });
    const cut = stable ? 0 : partial ? Math.round((own / 2) * 1000) / 1000 : own + 3;
    if (cut) ex.foreignFill(key, cut, false, 16.5);
    return { rt, ex, step, sym, ps: ps as "LONG" | "SHORT", key, stop, own, cut, position: rt.paper.positions[0], expected: own + 10 - cut };
  }
  it(`own-first zero cleanup touches only the journaled own order and never foreign orders, side ${side}`, async () => {
    const { rt, ex, step, sym, ps, key, stop } = await fixture();
    const unrelated = "operator-stop", unjournaled = "unjournaled-own-looking-stop";
    ex.orders.push({ id: unrelated, venueSymbol: sym, symbol: sym, positionSide: ps, type: "STOP_MARKET",
      clientOrderId: "foreign", stopPrice: 15, qty: 1 });
    ex.orders.push({ id: unjournaled, venueSymbol: sym, symbol: sym, positionSide: ps, type: "STOP_MARKET",
      clientOrderId: makeCoid(rt.settings.live.connId, "S"), stopPrice: 15, qty: 1 });
    const cancels: string[] = [], cancel = ex.cancel.bind(ex), market = ex.log.filter((o) => o.type === "MARKET").length;
    ex.cancel = async (symbol, id) => { cancels.push(id); return cancel(symbol, id); };
    for (let i = 0; i < 3; i++) await step();
    assert.deepEqual(cancels, [stop.id], JSON.stringify({ status: liveKv(rt.db, "liveStatus"),
      rows: rt.db.all("SELECT coid,cfg,kind,status,qty,msg,at FROM live_orders"), orders: ex.orders }));
    assert.ok(!ex.orders.some((o) => o.id === stop.id));
    assert.ok(ex.orders.some((o) => o.id === unrelated));
    assert.ok(ex.orders.some((o) => o.id === unjournaled));
    assert.equal(ex.positions.get(key), 7);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, market);
    rt.db.db.close();
  });
  it(`a partially filled or unknown own-stop cancellation remains reserved beside foreign quantity, side ${side}`, async () => {
    const { rt, ex, step, key, stop } = await fixture();
    const status = ex.orderStatus.bind(ex), cancel = ex.cancel.bind(ex), cancels: string[] = [];
    let unresolved = true;
    ex.cancel = async (symbol, id) => { cancels.push(id); return cancel(symbol, id); };
    (ex as ExchangeClient).orderStatus = async (symbol, id) => id === stop.id && unresolved
      ? { order: { orderId: id, status: "CANCELED", executedQty: .1 } } : status(symbol, id);
    const market = ex.log.filter((o) => o.type === "MARKET").length;
    for (let i = 0; i < 3; i++) await step();
    assert.deepEqual(cancels, [stop.id], "a pending exact cancellation is not reissued");
    assert.equal(ex.positions.get(key), 7, "foreign quantity remains untouched");
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, market);
    assert.equal(Object.keys(liveKv<Record<string, unknown>>(rt.db, "positionExitCleanup") ?? {}).length, 1);
    assert.ok(liveKv<LiveStatus>(rt.db, "liveStatus")!.skipped.some((s) => /awaiting exact zero-fill/.test(s.why)));
    unresolved = false;
    await step();
    assert.deepEqual(liveKv(rt.db, "positionExitCleanup"), {});
    assert.equal(ex.positions.get(key), 7);
    rt.db.db.close();
  });
  it(`an unresolved cancellation is not resent while the same order still rests, side ${side}`, async () => {
    const { rt, ex, step, key, stop } = await fixture();
    const cancel = ex.cancel.bind(ex), cancels: string[] = [];
    ex.cancel = async (symbol, id) => { cancels.push(id); return id === stop.id ? false : cancel(symbol, id); };
    ex.orderStatus = async (_symbol, id) => id === stop.id ? null : { order: { orderId: id, status: "NEW" } };
    for (let i = 0; i < 3; i++) await step();
    assert.deepEqual(cancels, [stop.id], "the unresolved request keeps its exact durable identity");
    assert.ok(ex.orders.some((o) => o.id === stop.id));
    assert.equal(ex.positions.get(key), 7);
    assert.equal(Object.keys(liveKv<Record<string, unknown>>(rt.db, "positionExitCleanup") ?? {}).length, 1);
    rt.db.db.close();
  });
  it(`a foreign-order-frozen partial ownership observation does not cancel or resize either side, side ${side}`, async () => {
    const { rt, ex, step, key, stop, expected } = await fixture(true);
    const cancels: string[] = [], cancel = ex.cancel.bind(ex), markets = ex.log.filter((o) => o.type === "MARKET").length;
    ex.cancel = async (sym, id) => { cancels.push(id); return cancel(sym, id); };
    for (let i = 0; i < 3; i++) await step();
    assert.ok(Math.abs((ex.positions.get(key) ?? 0) - expected) < 1e-9);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, markets);
    assert.ok(ex.orders.some((o) => o.id === "operator-frozen"));
    assert.ok(ex.orders.some((o) => o.id === stop.id));
    assert.deepEqual(cancels, []);
    rt.db.db.close();
  });
  it(`removing a foreign freeze after a partial outside close cannot over-attribute the own quantity, side ${side}`, async () => {
    const { rt, ex, step, key, stop, own, cut } = await fixture(true);
    await step();
    ex.orders = ex.orders.filter((o) => o.id !== "operator-frozen");
    const from = ex.log.length;
    for (let i = 0; i < 3; i++) await step();
    const rows = rt.db.all<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='H'");
    assert.ok(rows.reduce((sum, row) => sum + row.qty, 0) <= cut + 1e-9,
      `attribution cannot exceed the ${cut} actually removed: ${JSON.stringify(rows)}`);
    assert.ok((ex.positions.get(key) ?? 0) >= 10 - 1e-9, "the ten foreign units remain untouched");
    const actions = ex.log.slice(from).filter((o) => o.type === "MARKET");
    assert.ok(actions.every((o) => Number(o.quantity) <= own - cut + 1e-9 &&
      o.side === (side === 1 ? "SELL" : "BUY")), "any close is limited to the proven remaining own quantity");
    if ((ex.positions.get(key) ?? 0) > 10 + 1e-9)
      assert.ok(ex.orders.some((o) => o.venueSymbol === stop.venueSymbol && o.positionSide === stop.positionSide &&
        ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S" && (o.qty ?? Infinity) <= own - cut + 1e-9 &&
        Math.abs((o.stopPrice ?? 0) - (stop.stopPrice ?? 0)) < 1e-9),
        "remaining own quantity keeps a bounded stop at its prior level");
    rt.db.db.close();
  });
  it(`a stable mixed side with foreign protection never creates an outside reduction, side ${side}`, async () => {
    const { rt, ex, step, key, stop, expected } = await fixture(false, true);
    const market = ex.log.filter((o) => o.type === "MARKET").length;
    for (let i = 0; i < 4; i++) await step();
    assert.ok(Math.abs((ex.positions.get(key) ?? 0) - expected) < 1e-9);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, market);
    assert.ok(ex.orders.some((o) => o.id === stop.id) && ex.orders.some((o) => o.id === "operator-frozen"));
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind='H'")?.n, 0);
    rt.db.db.close();
  });
  it(`a frozen mixed side cannot invent an outside reduction after restart, side ${side}`, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "cts-foreign-review-")), path = join(dir, "state.sqlite"), dbs: CoreDb[] = [];
    t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
      rmSync(dir, { recursive: true, force: true }); });
    const db = new CoreDb(path); dbs.push(db);
    const { ex, step, key, stop, expected, position } = await fixture(false, true, db);
    await step();
    const market = ex.log.filter((o) => o.type === "MARKET").length;
    flushLiveKv(db); db.db.close();
    const nextDb = new CoreDb(path); dbs.push(nextDb);
    const { rt: next } = fakeRt(nextDb);
    Object.assign(next.settings.live, { positionMode: "hedge", laneOrders: false });
    next.paper.positions = [position];
    for (let i = 0; i < 4; i++) { mock.timers.tick(20_000); await stepLive(next as unknown as CoreRuntime, [], 1, ex); }
    assert.ok(Math.abs((ex.positions.get(key) ?? 0) - expected) < 1e-9);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, market);
    assert.ok(ex.orders.some((o) => o.id === stop.id) && ex.orders.some((o) => o.id === "operator-frozen"));
    assert.equal(nextDb.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind='H'")?.n, 0);
  });
}
