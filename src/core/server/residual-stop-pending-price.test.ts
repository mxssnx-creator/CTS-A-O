import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { controlRows, flushLiveKv, liveKv, resetLiveBackoff, stepLive } from "./live.server.ts";
import { ownCoidKind } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });

for (const side of [1, -1] as const) for (const missing of [false, true])
test(`ambiguous residual-stop acknowledgement preserves ${missing ? "unknown" : "requested"} price across restart, side ${side}`, async (t) => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const dir = mkdtempSync(join(tmpdir(), "cts-pending-repair-")), statePath = join(dir, "state.json"),
    snapshot = join(dir, "snapshot.sqlite"), dbs: CoreDb[] = [];
  t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* closed */ }
    rmSync(dir, { recursive: true, force: true }); });
  const make = () => {
    const db = new CoreDb(":memory:", { statePath });
    if (existsSync(snapshot)) assert.equal(db.restore(snapshot), true);
    db.journalPath = `${snapshot}.journal`; db.replayJournal(); dbs.push(db);
    const { rt } = fakeRt(db);
    Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: false });
    return rt;
  };
  let rt = make();
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  const paper = { ...lane(`follow|sig-ema-cross-s@m15|repair-ack-${side}-${missing}`, sym, side, 17),
    target: 17 * (1 + side * 0.03), entryT: Date.now() - 60_000 };
  rt.paper.positions = [paper];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); const own = ex.positions.get(key)!;
  const old = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(old?.stopPrice);
  ex.foreignFill(key, 10); await step(); await step();
  assert.equal(rt.db.snapshot(snapshot), true);
  ex.orders.push({ id: "operator-freeze", venueSymbol: sym, symbol: sym, positionSide: ps,
    type: "STOP_MARKET", clientOrderId: "operator", stopPrice: 15, qty: 1 });
  const cut = Math.round(own * 500) / 1000;
  ex.foreignFill(key, cut, false, 16.5); await step();
  ex.orders = ex.orders.filter((o) => o.id !== "operator-freeze");
  const submit = ex.order.bind(ex); let ambiguousId = "";
  ex.order = async (p) => {
    const response = await submit(p);
    if (!ambiguousId && p.type === "STOP_MARKET") {
      ambiguousId = String(p.clientOrderID);
      if (missing) {
        const pending = controlRows(rt).get(ambiguousId);
        assert.ok(pending);
        rt.db.runDurable("UPDATE live_orders SET px=0 WHERE coid=?", ambiguousId);
        pending.px = undefined; // explicit lost evidence: never infer a replacement price
      }
      throw new Error("simulated timeout after accepted stop");
    }
    return response;
  };
  await step();
  const markets = ex.log.filter((x) => x.type === "MARKET").length;
  for (let i = 0; i < 4 && !ambiguousId; i++) await step();
  assert.ok(ambiguousId, "the exact residual stop was sent and its acknowledgement was lost");
  const findPending = () => rt.db.get<{ px: number; status: string }>("SELECT px,status FROM live_orders WHERE coid=?", ambiguousId);
  assert.equal(findPending()?.status, "pending");
  assert.equal(findPending()?.px, missing ? 0 : old.stopPrice);
  assert.equal(ex.orders.filter((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S").length, 1,
    "the accepted replacement remains the only active stop after its ambiguous acknowledgement");
  flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
  rt = make(); rt.paper.positions = [paper];
  await step(); await step();
  // A fresh post-restart book confirms a known-price stop under its exact client ID. When
  // its requested price was lost, the row stays pending and fenced instead of guessing.
  assert.equal(findPending()?.status, missing ? "pending" : "ok");
  assert.equal(findPending()?.px, missing ? 0 : old.stopPrice, "journal restore preserves only recorded evidence");
  assert.equal(ex.orders.filter((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S").length, 1,
    "unresolved stop is not duplicated");
  assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
  assert.equal(Object.keys(liveKv<Record<string, unknown>>(rt.db, "orphanExitFences") ?? {}).length > 0, missing,
    "only an order with unknown requested-price evidence remains fenced after restart");
  assert.ok(Math.abs((ex.positions.get(key) ?? 0) - (10 + own - cut)) < 1e-9);
  if (!missing) {
    const acknowledged = ex.orders.find((o) => o.clientOrderId === ambiguousId);
    assert.ok(acknowledged);
    await ex.cancel(sym, acknowledged.id);
    // The restart step proved this exact identity active, so its row is now historical "ok"
    // evidence rather than pending. Cancellation here is venue-side; let the next fresh-book
    // control step restore from that proven level instead of asking the pending-only reconciler.
    for (let i = 0; i < 6 && !ex.orders.some((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S"); i++) await step();
    const replacement = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(replacement && replacement.stopPrice === old.stopPrice, "later recovery uses the proven requested level");
    assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
  }
});
