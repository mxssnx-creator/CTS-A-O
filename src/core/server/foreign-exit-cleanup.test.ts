import assert from "node:assert/strict";
import { test } from "node:test";
import { foreignExhaustionProof, type ForeignCleanupRow } from "./foreign-exit-cleanup.ts";

const row = (kind: string, qty: number, at: number, options: Partial<ForeignCleanupRow> = {}): ForeignCleanupRow => ({
  k: "A|1", kind, qty, at, status: "ok", ...options,
});
const start = row("O", 1, 1), end = row("H", 1, 3, { msg: "outside reduction: 3 gone" });
const proves = (...rows: ForeignCleanupRow[]) => foreignExhaustionProof(rows).get("A|1");

test("only a complete, ordered own-first reduction authorizes retiring an older exit", () => {
  assert.equal(proves(start, end), 3);
  assert.equal(proves(start, row("R", 0.4, 2), row("H", 0.6, 3, { msg: "outside reduction: 3 gone" })), 3);
  assert.equal(proves(start, row("H", 0.5, 3, { msg: "outside reduction: 3 gone" })), undefined);
  assert.equal(proves(start, row("H", 1, 3)), undefined, "unknown legacy H purpose is not proof");
  assert.equal(proves(row("O", 0, 1), end), undefined, "unknown open quantity is not owned evidence");
  assert.equal(proves(start, row("H", 1, 1, { msg: "outside reduction: 3 gone" })), undefined,
    "same-time entry and reduction have no proven order");
  assert.equal(proves(start, end, row("F", 0, 4)), undefined);
});

test("later entry intents and uncertain quantities cannot inherit an old exhaustion decision", () => {
  for (const later of [row("O", 0, 4, { status: "pending" }), row("I", 0, 4, { status: "pending" }),
    row("O", 0, 4, { status: "error" }), row("I", 1, 4), row("O", 0, 3, { status: "error" })])
    assert.equal(proves(start, end, later), undefined, JSON.stringify(later));
  assert.equal(proves(row("O", 1, 1, { status: "pending" }), end), undefined);
  assert.equal(proves(start, row("X", 0, 2, { status: "pending" }), end), undefined);
  assert.equal(proves(start, row("R", Number.NaN, 2), end), undefined);
  assert.equal(proves(start, row("H", 1, Number.NaN, { msg: "outside reduction: bad clock" })), undefined);
  assert.equal(proves(start, row("R", 0, 4), end), undefined, "out-of-order evidence stays unknown");
});

test("a new independently opened episode needs its own subsequent H and keys never share proof", () => {
  const other = row("O", 1, 2, { k: "A|-1" });
  const next = row("O", 2, 4), nextEnd = row("H", 2, 5, { msg: "outside reduction: 2 gone" });
  const proof = foreignExhaustionProof([start, other, end, next, nextEnd]);
  assert.equal(proof.get("A|1"), 5);
  assert.equal(proof.has("A|-1"), false);
});

import { afterEach, mock } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import { makeCoid, ownCoidKind } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });

for (const side of [1, -1] as const) {
  test(`journaled outside exhaustion survives interruption, stale book and restart, side ${side}`, async (t) => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
    const dir = mkdtempSync(join(tmpdir(), "cts-foreign-proof-")), path = join(dir, "live.sqlite");
    const dbs: CoreDb[] = [];
    t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
      rmSync(dir, { recursive: true, force: true }); });
    const make = () => {
      const db = new CoreDb(path); dbs.push(db);
      const { rt } = fakeRt(db);
      Object.assign(rt.settings.live, { laneOrders: false, positionMode: "hedge", foreignSides: "avoid",
        notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
      return rt;
    };
    let rt = make();
    const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
    const pos = { ...lane(`follow|sig-ema-cross-s@m15|proof-${side}`, sym, side, 17), entryT: Date.now() - 60_000 };
    rt.paper.positions = [pos];
    const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
    await step();
    const own = ex.positions.get(key)!;
    const stop = ex.orders.find((o) => o.venueSymbol === sym && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(own > 0 && stop?.clientOrderId);
    ex.foreignFill(key, 10);
    await step(); await step();
    ex.foreignFill(key, own + 3, false, 16.5);
    const write = rt.db.runDurable.bind(rt.db);
    let interrupted = false;
    rt.db.runDurable = (sql, ...values) => {
      const result = write(sql, ...values);
      if (!interrupted && values[4] === "H") { interrupted = true; throw new Error("interruption after durable H"); }
      return result;
    };
    const markets = ex.log.filter((x) => x.type === "MARKET").length;
    await step();
    assert.equal(interrupted, true, "the crash occurs after H was written and before exit cancellation");
    assert.ok(ex.orders.some((o) => o.id === stop.id));
    flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
    rt = make(); rt.paper.positions = [pos];
    const book = ex.book.bind(ex), client: ExchangeClient = ex;
    client.book = async () => ({ ...await book(), ordersAt: Date.now() - 60_000 });
    await step();
    assert.ok(ex.orders.some((o) => o.id === stop.id), "an earlier orders snapshot cannot authorize cancellation");
    client.book = async () => book();
    await step();
    assert.ok(!ex.orders.some((o) => o.id === stop.id), "exact journaled stop is retired after fresh reconciliation");
    assert.equal(ex.positions.get(key), 7, "no foreign quantity was traded");
    assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
    assert.deepEqual(liveKv(rt.db, "positionExitCleanup"), {});
  });

  for (const conflict of ["same-time-exit", "later-entry"] as const) test(
    `${conflict} cannot reuse a former H as exit cancellation authority, side ${side}`, async (t) => {
      mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
      const dir = mkdtempSync(join(tmpdir(), "cts-foreign-conflict-")), path = join(dir, "live.sqlite"), dbs: CoreDb[] = [];
      t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
        rmSync(dir, { recursive: true, force: true }); });
      const make = () => {
        const db = new CoreDb(path); dbs.push(db);
        const { rt } = fakeRt(db);
        Object.assign(rt.settings.live, { laneOrders: false, positionMode: "hedge", foreignSides: "avoid",
          notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
        return rt;
      };
      let rt = make();
      const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
      const pos = { ...lane(`follow|sig-ema-cross-s@m15|conflict-${side}`, sym, side, 17), entryT: Date.now() - 60_000 };
      rt.paper.positions = [pos];
      const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
      await step();
      const own = ex.positions.get(key)!;
      const stop = ex.orders.find((o) => o.venueSymbol === sym && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
      assert.ok(own > 0 && stop?.clientOrderId);
      ex.foreignFill(key, 10); await step(); await step(); ex.foreignFill(key, own + 3, false, 16.5);
      const write = rt.db.runDurable.bind(rt.db); let interrupted = false;
      rt.db.runDurable = (sql, ...values) => {
        const result = write(sql, ...values);
        if (!interrupted && values[4] === "H") { interrupted = true; throw new Error("interrupt after H"); }
        return result;
      };
      await step(); assert.equal(interrupted, true);
      const h = rt.db.get<{ at: number }>("SELECT at FROM live_orders WHERE kind='H'"); assert.ok(h);
      if (conflict === "same-time-exit") rt.db.runDurable("UPDATE live_orders SET at=? WHERE coid=?", h.at, stop.clientOrderId);
      else rt.db.runDurable("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        makeCoid(rt.settings.live.connId, "E"), `control|${sym}|${side}`, sym, side, "O", 0, 17, "error", "later rejected entry", h.at + 1);
      flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
      rt = make(); rt.paper.positions = [];
      for (let i = 0; i < 2; i++) await step();
      assert.ok(ex.orders.some((o) => o.id === stop.id), "old or ambiguous H cannot retire a newer/ambiguous stop");
      assert.equal(ex.positions.get(key), 7);
    },
  );

  test(`legacy frozen foreign estimate remains untrusted after order disappearance and restart, side ${side}`, async (t) => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
    const dir = mkdtempSync(join(tmpdir(), "cts-foreign-legacy-")), path = join(dir, "live.sqlite"), dbs: CoreDb[] = [];
    t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
      rmSync(dir, { recursive: true, force: true }); });
    const make = () => {
      const db = new CoreDb(path); dbs.push(db);
      const { rt } = fakeRt(db);
      Object.assign(rt.settings.live, { laneOrders: false, positionMode: "hedge", foreignSides: "avoid",
        notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
      return rt;
    };
    let rt = make();
    const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
    const statusKey = `${sym}|${side}`;
    const pos = { ...lane(`follow|sig-ema-cross-s@m15|legacy-${side}`, sym, side, 17), entryT: Date.now() - 60_000 };
    rt.paper.positions = [pos];
    const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
    await step();
    const own = ex.positions.get(key)!;
    const stop = ex.orders.find((o) => o.venueSymbol === sym && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(own > 0 && stop?.clientOrderId);
    ex.foreignFill(key, 10); await step(); await step();
    const markets = ex.log.filter((x) => x.type === "MARKET").length;
    // A prior release could persist the entire mixed physical side as foreign while its own side was frozen.
    // Remove that operator's conditional before restart: absence alone must not make the old estimate trustworthy.
    const saved = liveKv<Record<string, unknown>>(rt.db, "controlStatus")!;
    saved.held = []; saved.actions = []; saved.foreignQty = { [statusKey]: ex.positions.get(key) };
    delete saved.foreignQtyFrozen; delete saved.foreignQtyUnknown;
    flushLiveKv(rt.db); rt.db.kvSet("controlStatus", saved); assert.equal(rt.db.flushState(), true); rt.db.db.close();
    rt = make(); rt.paper.positions = [pos];
    await step();
    assert.deepEqual(liveKv<{ foreignQtyUnknown?: string[] }>(rt.db, "controlStatus")?.foreignQtyUnknown, [statusKey]);
    flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
    rt = make(); rt.paper.positions = [pos];
    await step(); await step();
    assert.deepEqual(liveKv<{ foreignQtyUnknown?: string[] }>(rt.db, "controlStatus")?.foreignQtyUnknown, [statusKey]);
    assert.equal(rt.db.all("SELECT * FROM live_orders WHERE kind='H'").length, 0, "untrusted estimates cannot invent a reduction");
    assert.ok(ex.orders.some((o) => o.id === stop.id), "uncertain ownership retains the exact own stop");
    assert.equal(ex.positions.get(key), own + 10);
    assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
  });
}
