import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive, type ExchangeClient, type LiveStatus } from "./live.server.ts";
import { ownCoidKind } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });

for (const side of [1, -1] as const) {
  for (const storage of ["sqlite", "state-and-journal"] as const)
  test(`a residual regains its exact stop after zero-fill cancellation and ${storage} restart, side ${side}`, async (t) => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
    const dir = mkdtempSync(join(tmpdir(), "cts-residual-stop-")), path = join(dir, "live.sqlite"),
      statePath = join(dir, "state.json"), snapshot = join(dir, "snapshot.sqlite"), dbs: CoreDb[] = [];
    t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* closed */ }
      rmSync(dir, { recursive: true, force: true }); });
    const make = () => {
      const db = storage === "sqlite" ? new CoreDb(path) : new CoreDb(":memory:", { statePath });
      if (storage === "state-and-journal") {
        if (existsSync(snapshot)) assert.equal(db.restore(snapshot), true);
        db.journalPath = `${snapshot}.journal`;
        db.replayJournal();
      }
      dbs.push(db);
      const { rt, prices } = fakeRt(db);
      Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: false });
      return { rt, prices };
    };
    let { rt } = make();
    const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
    const paper = { ...lane(`follow|sig-ema-cross-s@m15|residual-${side}`, sym, side, 17),
      target: 17 * (1 + side * 0.03), entryT: Date.now() - 60_000 };
    rt.paper.positions = [paper];
    const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
    await step();
    const own = ex.positions.get(key)!;
    const old = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(old?.id && old.stopPrice);
    ex.foreignFill(key, 10); await step(); await step();
    if (storage === "state-and-journal") assert.equal(rt.db.snapshot(snapshot), true);
    ex.orders.push({ id: "operator-freeze", venueSymbol: sym, symbol: sym, positionSide: ps,
      type: "STOP_MARKET", clientOrderId: "operator", stopPrice: 15, qty: 1 });
    const cut = Math.round(own * 500) / 1000;
    ex.foreignFill(key, cut, false, 16.5); await step();
    ex.orders = ex.orders.filter((o) => o.id !== "operator-freeze");
    const status = ex.orderStatus.bind(ex);
    let unknown = true;
    (ex as ExchangeClient).orderStatus = async (symbol, id) => id === old.id && unknown ? null : status(symbol, id);
    const markets = ex.log.filter((o) => o.type === "MARKET").length;
    await step(); await step();
    assert.ok(!ex.orders.some((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S"),
      "no replacement may be sent while the exact old cancellation is unresolved");
    assert.ok(Object.keys(liveKv<Record<string, unknown>>(rt.db, "orphanExitFences") ?? {}).length > 0);
    flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
    ({ rt } = make()); rt.paper.positions = [paper]; unknown = false;
    for (let i = 0; i < 4 && !ex.orders.some((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S"); i++) await step();
    const replacement = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(replacement, "a proven zero-fill cancellation allows the exact old level to be restored");
    assert.equal(replacement.stopPrice, old.stopPrice);
    assert.ok((replacement.qty ?? Infinity) <= own - cut + 1e-9);
    assert.equal(ex.positions.get(key), +(10 + own - cut).toFixed(6));
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, markets);
  });

  for (const failure of ["crossed", "venue-refusal", "unknown-level", "missing-contract"] as const)
  test(`a residual stop repair handles ${failure} safely, side ${side}`, async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: false });
    const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
    rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|no-widen-${side}-${failure}`, sym, side, 17),
      target: 17 * (1 + side * 0.03), entryT: Date.now() - 60_000 }];
    const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
    await step(); const own = ex.positions.get(key)!;
    const old = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(old?.stopPrice);
    ex.foreignFill(key, 10); await step(); await step();
    ex.orders.push({ id: "operator-freeze", venueSymbol: sym, symbol: sym, positionSide: ps,
      type: "STOP_MARKET", clientOrderId: "operator", stopPrice: 15, qty: 1 });
    const cut = Math.round(own * 500) / 1000;
    ex.foreignFill(key, cut, false, 16.5);
    // Inject the failure before the resize step: otherwise the previous step can already restore an exact stop,
    // making a later crossed-price/refusal fixture test a different state than the one it names.
    if (failure === "crossed") prices.find((p) => p.sym === sym)!.last = old.stopPrice - side * 0.01;
    else if (failure === "venue-refusal") {
      const send = ex.order.bind(ex);
      ex.order = async (p) => p.type === "STOP_MARKET" ? Promise.reject(new ExchangeRejected("stop price too close", 1)) : send(p);
    } else if (failure === "unknown-level") {
      rt.db.runDurable("UPDATE live_orders SET px=0 WHERE coid=?", old.clientOrderId!);
      mock.timers.tick(65_000); // reload the control-row mirror with the unavailable legacy level
    } else ex.emptyContracts = true;
    await step(); ex.orders = ex.orders.filter((o) => o.id !== "operator-freeze");
    await step();
    const market = ex.log.filter((o) => o.type === "MARKET").length;
    for (let i = 0; i < 3; i++) await step();
    const marketsAfterRetries = ex.log.filter((o) => o.type === "MARKET").length;
    assert.equal(marketsAfterRetries, market + (failure === "venue-refusal" ? 1 : 0),
      "a venue-refused protective repair gets at most one emergency close");
    const ownStops = ex.orders.filter((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(ownStops.every((o) => side * (Number(o.stopPrice) - Number(old.stopPrice)) >= -1e-9),
      "every surviving stop stays at the original level or tightens it");
    assert.ok(ownStops.every((o) => o.id === old.id || (o.qty ?? Infinity) <= own - cut + 1e-9),
      "a replacement stop never exceeds the residual own quantity");
    if (failure !== "venue-refusal")
      assert.ok(liveKv<LiveStatus>(rt.db, "liveStatus")!.skipped.some((s) => /prior stop|ownership|reconcil|fresh prices/.test(s.why)));
    const expectedPosition = failure === "venue-refusal" ? 10 : 10 + own - cut;
    assert.ok(Math.abs((ex.positions.get(key) ?? 0) - expectedPosition) < 1e-9);
    rt.db.db.close();
  });
}
