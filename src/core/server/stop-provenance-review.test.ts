import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { controlRows, controlStopPxOf, flushLiveKv, liveKv, resetLiveBackoff, stepLive, type ControlRow } from "./live.server.ts";
import { ownCoidKind } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });

for (const side of [1, -1] as const) for (const storage of ["journal", "snapshot"] as const)
test(`cumulative open reorder preserves its stop after ${storage} restart ${side}`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const dir = mkdtempSync(join(tmpdir(), "cts-stop-sequence-"));
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange();
  const journal = join(dir, "orders.journal"), snapshot = join(dir, "snapshot.sqlite");
  db.journalPath = journal;
  Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: false });
  rt.paper.positions = [lane(`follow|sig-ema-cross-s@m15|partial-open-${side}`, "S1-USDT", side, 17)];
  const place = ex.order.bind(ex), status = ex.orderStatus.bind(ex);
  let partial = 0, pending = true;
  ex.order = async (p) => {
    if (pending && p.type === "MARKET") {
      pending = false; partial = Number(p.quantity) / 2;
      await place({ ...p, quantity: partial });
      return { order: { orderId: "entry-partial", avgPrice: 17, executedQty: partial, status: "CANCEL_PENDING" } };
    }
    return place(p);
  };
  ex.orderStatus = async (sym, id) => id === "entry-partial"
    ? { order: { orderId: id, status: "CANCELLED", executedQty: partial } } : status(sym, id);
  const step = async () => { await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); mock.timers.tick(20_000); };
  await step();
  const initial = [...controlRows(rt).values()].filter((r) => r.k === `S1-USDT|${side}`).map((r) => `${r.kind}:${r.status}`);
  assert.ok(initial.includes("O:ok") && initial.includes("S:ok"), JSON.stringify(initial));
  await step();
  const memory = [...controlRows(rt).values()].filter((r) => r.k === `S1-USDT|${side}`).map((r) => r.kind);
  const fresh = [...controlRows({ db }).values()].filter((r) => r.k === `S1-USDT|${side}`).map((r) => r.kind);
  assert.ok(memory.indexOf("O") < memory.indexOf("S"));
  assert.ok(fresh.indexOf("S") < fresh.indexOf("O"));
  const stop = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(stop?.stopPrice);
  assert.equal(controlStopPxOf(controlRows({ db }).values(), `S1-USDT|${side}`), stop.stopPrice);
  let restored: CoreDb;
  if (storage === "snapshot") {
    assert.equal(db.snapshot(snapshot), true);
    restored = new CoreDb(snapshot);
  } else {
    restored = new CoreDb(":memory:"); restored.journalPath = journal;
    assert.ok(restored.replayJournal() > 0);
  }
  assert.equal(controlStopPxOf(controlRows({ db: restored }).values(), `S1-USDT|${side}`), stop.stopPrice);
  restored.db.close();
  db.db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("same-time legacy or conflicting sequences never establish a stop episode", () => {
  const row = (kind: string, px: number, at: number, submissionSeq?: number): ControlRow =>
    ({ k: "S1-USDT|1", kind, status: "ok", px, at, qty: 1, submissionSeq });
  const key = "S1-USDT|1";
  const open = row("O", 0, 100), stop = row("S", 16, 100);
  assert.equal(controlStopPxOf([open, stop], key), null);
  assert.equal(controlStopPxOf([stop, open], key), null);
  assert.equal(controlStopPxOf([row("O", 0, 100, 1), stop], key), null);
  assert.equal(controlStopPxOf([row("O", 0, 100, 1), row("S", 16, 100, 1)], key), null);
  assert.equal(controlStopPxOf([row("S", 16, 101)], key), null, "a stop with no proven open has no parent");
  assert.equal(controlStopPxOf([{ ...row("O", 0, 100), status: "error" }, row("S", 16, 101)], key), null);
  assert.equal(controlStopPxOf([stop, open, row("O", 0, 101), row("S", 15, 102)], key), 15);
});

test("a later same-time parent cannot inherit a preceding parent's stop", () => {
  const row = (kind: string, px: number, submissionSeq: number): ControlRow =>
    ({ k: "S1-USDT|1", kind, status: "ok", px, at: 100, qty: 1, submissionSeq });
  const first = [row("O", 0, 1), row("S", 16, 2), row("O", 0, 4)];
  assert.equal(controlStopPxOf(first, "S1-USDT|1"), null);
  assert.equal(controlStopPxOf([...first, row("S", 15, 5)].reverse(), "S1-USDT|1"), 15);
  assert.equal(controlStopPxOf([...first, row("S", 15, 5), row("S", 14, 6)], "S1-USDT|1"), 14);
  assert.equal(controlStopPxOf([...first, { ...row("F", 0, 3), submissionSeq: null }, row("S", 15, 5)], "S1-USDT|1"), null,
    "a flat marker tied to both episodes has no proven ordering");
});

test("a proven sequence wins over a backwards clock, but unsequenced records stay unresolved", () => {
  const row = (kind: string, px: number, at: number, submissionSeq: number | null): ControlRow =>
    ({ k: "S1-USDT|1", kind, status: "ok", px, at, qty: 1, submissionSeq });
  const key = "S1-USDT|1";
  const records = [row("O", 0, 200, 1), row("S", 16, 100, 2)];
  assert.equal(controlStopPxOf(records, key), 16);
  assert.equal(controlStopPxOf([...records, row("O", 0, 50, 3)], key), null);
  assert.equal(controlStopPxOf([...records, row("F", 0, 50, null)], key), null,
    "an unsequenced flat cannot be positioned across a known clock reversal");
});

for (const side of [1, -1] as const) test(`successive parents restore only their own residual stop, side ${side}`, async (t) => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const dir = mkdtempSync(join(tmpdir(), "cts-stop-parent-")), path = join(dir, "state.sqlite"), dbs: CoreDb[] = [];
  t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* closed */ }
    rmSync(dir, { recursive: true, force: true }); });
  const make = () => {
    const db = new CoreDb(path); dbs.push(db);
    const { rt } = fakeRt(db); Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: false });
    return rt;
  };
  let rt = make();
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  const paper = (name: string, dist: number) => ({ ...lane(`follow|sig-ema-cross-s@m15|${name}-${side}`, sym, side, 17),
    stop: 17 * (1 - side * dist), target: 17 * (1 + side * 0.15), entryT: Date.now() - 60_000 });
  const first = paper("first", 0.008), second = paper("second", 0.015);
  rt.paper.positions = [first];
  const step = async () => { mock.timers.tick(20_000); await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step();
  const old = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(old?.id && old.stopPrice);
  ex.closeByHand(key, 16.9); rt.paper.positions = [];
  mock.timers.tick(11 * 60_000);
  for (let i = 0; i < 4; i++) await step();
  rt.paper.positions = [second];
  for (let i = 0; i < 5 && !ex.positions.has(key); i++) await step();
  const own = ex.positions.get(key)!;
  const newStop = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(own > 0 && newStop?.id && newStop.stopPrice && newStop.stopPrice !== old.stopPrice,
    JSON.stringify({ own, old, newStop, orders: ex.orders, status: liveKv(rt.db, "liveStatus"), control: liveKv(rt.db, "controlStatus"), rows: [...controlRows(rt)] }));
  ex.foreignFill(key, 10); await step(); await step();
  ex.orders.push({ id: "operator-freeze", venueSymbol: sym, symbol: sym, positionSide: ps,
    type: "STOP_MARKET", clientOrderId: "operator", stopPrice: 15, qty: 1 });
  const cut = Math.round(own * 500) / 1000;
  ex.foreignFill(key, cut, false, 16.5); await step();
  ex.orders = ex.orders.filter((o) => o.id !== "operator-freeze");
  await step();
  flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
  rt = make(); rt.paper.positions = [second];
  for (let i = 0; i < 5 && !ex.orders.some((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S"); i++) await step();
  const replacement = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(replacement, "the proven residual stop is eventually restored");
  assert.equal(replacement.stopPrice, newStop.stopPrice);
  assert.notEqual(replacement.stopPrice, old.stopPrice);
  assert.ok((replacement.qty ?? Infinity) <= own - cut + 1e-9);
});
