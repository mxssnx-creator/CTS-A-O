import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive, type LiveStatus } from "./live.server.ts";
import { ownCoidKind, ownLedger } from "./live.ts";
import { controlRows } from "./live.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });

for (const side of [1, -1] as const) test(`native partial beside foreign is not also booked as outside H, side ${side}`, async (t) => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const dir = mkdtempSync(join(tmpdir(), "cts-native-foreign-")), path = join(dir, "live.sqlite"), dbs: CoreDb[] = [];
  t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
    rmSync(dir, { recursive: true, force: true }); });
  const make = () => {
    const db = new CoreDb(path); dbs.push(db);
    const { rt } = fakeRt(db);
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    return rt;
  };
  let rt = make();
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", venueKey = `${sym}|${ps}`,
    ledgerKey = `${sym}|${side}`;
  const paper = { ...lane(`follow|sig-ema-cross-s@m15|partial-foreign-${side}`, sym, side, 17), entryT: Date.now() - 60_000 };
  rt.paper.positions = [paper];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const original = ex.positions.get(venueKey)!;
  ex.foreignFill(venueKey, 10); await step(); await step();
  const stop = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
  assert.ok(stop && Math.abs((stop.qty ?? 0) - original) < 1e-9);
  const partial = +(original / 2).toFixed(6), px = stop.stopPrice ?? 16;
  const orderStatus = ex.orderStatus.bind(ex);
  let receiptAvailable = false, seenVisible = false;
  ex.orderStatus = async (sym, id) => {
    if (id !== stop.id) return orderStatus(sym, id);
    if (!receiptAvailable) return null;
    seenVisible ||= ex.orders.some((o) => o.id === stop.id);
    return { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: partial, avgPrice: px } };
  };
  ex.positions.set(venueKey, +(10 + original - partial).toFixed(6));
  const markets = ex.log.filter((x) => x.type === "MARKET").length;
  await step();
  assert.equal(rt.db.all("SELECT * FROM live_orders WHERE kind='H'").length, 0, "unobserved native fill cannot be reclassified as H");
  assert.ok(Math.abs((ownLedger([...controlRows(rt).values()]).get(ledgerKey) ?? 0) - original) < 1e-9,
    "ownership remains reserved until exact native evidence arrives");
  const detail = liveKv<LiveStatus>(rt.db, "liveStatus")?.account?.positionsDetail?.find((p) => p.key === ledgerKey);
  assert.equal(detail?.ownQty, null, "mixed side is unresolved while a native fill is unaccounted");
  assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
  flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
  rt = make(); rt.paper.positions = [paper];
  await step();
  assert.equal(rt.db.all("SELECT * FROM live_orders WHERE kind='H'").length, 0, "foreign baseline survives restart");
  assert.equal(liveKv<LiveStatus>(rt.db, "liveStatus")?.account?.positionsDetail?.find((p) => p.key === ledgerKey)?.ownQty, null);
  assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
  // The cumulative receipt becomes available while its native order still rests on the venue. Its exact quantity
  // is journaled once; the unresolved sibling remains fenced and no extra H can consume the remainder.
  assert.ok(ex.orders.some((o) => o.id === stop.id));
  receiptAvailable = true;
  await step();
  assert.ok(seenVisible, "the exact conditional is polled without waiting for it to disappear from the book");
  assert.equal(rt.db.all("SELECT * FROM live_orders WHERE kind='H'").length, 0);
  const rows = rt.db.all<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='R' AND msg LIKE '%measured conditional%'");
  assert.equal(rows.length, 1);
  assert.ok(Math.abs(rows[0].qty - partial) < 1e-9);
  assert.ok(Math.abs((ownLedger([...controlRows(rt).values()]).get(ledgerKey) ?? 0) - (original - partial)) < 1e-9);
  assert.ok(Math.abs((ex.positions.get(venueKey) ?? 0) - (10 + original - partial)) < 1e-9);
  assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
  await step(); await step();
  assert.equal(rt.db.all("SELECT * FROM live_orders WHERE kind='H'").length, 0);
  assert.equal(rt.db.all("SELECT * FROM live_orders WHERE kind='R' AND msg LIKE '%measured conditional%'").length, 1);
  assert.ok(Math.abs((ownLedger([...controlRows(rt).values()]).get(ledgerKey) ?? 0) - (original - partial)) < 1e-9);
  assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
});
