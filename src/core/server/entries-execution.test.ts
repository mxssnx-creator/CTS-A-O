import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { liveKv, resetLiveBackoff, stepLive, type LiveStatus } from "./live.server.ts";
import { liveTag, makeCoid } from "./live.ts";
import { liveTrades, type LedgerRow } from "../statistics.ts";
import { fakeRt } from "../test-support.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CoreRuntime, LiveIntent } from "./runtime.server.ts";

const originalKey = process.env.BINGX_X02_API_KEY;
const originalSecret = process.env.BINGX_X02_SECRET;
const originalArmed = process.env.CTS_CORE_LIVE;
const intent: LiveIntent = { cfg: "combo|ema-9-21@m1|entry", sym: "S0-USDT", side: 1,
  barT: 1, protect: { tp: .1, sl: .05, trail: 0, hold: 1 } };
type Reply = { order: { orderId?: string; status?: string; executedQty?: number; avgPrice?: number; commission?: number; updateTime?: number } };
function fixture(db = new CoreDb(":memory:")) {
  const rt = fakeRt(db).rt;
  rt.settings.live = { ...rt.settings.live, mode: "entries", requireReady: false, syncMs: 0 };
  rt.status.lastBarT = 1;
  const state = {
    qty: 0, entry: { order: { orderId: "entry", status: "FILLED", executedQty: .25, avgPrice: 10.2, commission: -.01 } } as Reply,
    close: { order: { orderId: "close", status: "FILLED", executedQty: 1, avgPrice: 10.1, commission: -.02 } } as Reply,
    failControls: false, polls: 0,
    sent: [] as Array<Record<string, string>>, orders: [] as Array<Record<string, string>>,
  };
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(input));
    const p = Object.fromEntries(u.searchParams);
    const reply = (data: unknown, code = 0) => new Response(JSON.stringify({ code, data, msg: code ? "conditional refused" : "" }));
    if (u.pathname.endsWith("/quote/contracts"))
      return reply([{ symbol: "S0-USDT", quantityPrecision: 3, pricePrecision: 4, tradeMinQuantity: .001, tradeMinUSDT: 2 }]);
    if (u.pathname.endsWith("/user/positions"))
      return reply(state.qty > 0 ? [{ symbol: "S0-USDT", positionSide: "LONG", positionAmt: state.qty }] : []);
    if (u.pathname.endsWith("/trade/openOrders")) return reply({ orders: state.orders });
    if (u.pathname.endsWith("/user/balance")) return reply({ balance: { asset: "USDT", equity: 100, balance: 100, availableMargin: 100 } });
    assert.ok(u.pathname.endsWith("/trade/order"), `unexpected mocked request ${u.pathname}`);
    if (init?.method === "GET") { state.polls++; return reply(p.orderId === "close" ? state.close : state.entry); }
    if (init?.method === "DELETE") { state.orders = state.orders.filter((o) => o.orderId !== p.orderId); return reply({}); }
    state.sent.push(p);
    if (p.type !== "MARKET") {
      if (state.failControls) return reply({}, 101400);
      state.orders.push({ ...p, orderId: String(state.orders.length + 1) });
      return reply({});
    }
    const response = p.side === "BUY" ? state.entry : state.close;
    const got = Math.min(Number(p.quantity), response.order.executedQty ?? Number(p.quantity));
    state.qty = Math.max(0, state.qty + (p.side === "BUY" ? got : -got));
    return reply(response);
  });
  const step = (intents: LiveIntent[] = [intent]) => stepLive(rt as unknown as CoreRuntime, intents, 1);
  const seed = (side = 1) => {
    state.qty = 1;
    rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      makeCoid(rt.settings.live.connId, "E"), intent.cfg, intent.sym, side, "E", 1, 10, "ok", "seed", Date.now() - 1_000);
  };
  const history = () => liveTrades(rt.db.all<LedgerRow>(
    "SELECT o.*,f.fill_px AS fillPx,f.fee FROM live_orders o LEFT JOIN live_fills f USING(coid) ORDER BY o.at,o.rowid",
  ), liveTag(rt.settings.live.connId).length);
  return { rt, state, step, seed, history };
}

describe("entries mode: actual MARKET execution quantities", () => {
  beforeEach(() => {
    resetLiveBackoff();
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    process.env.CTS_CORE_LIVE = "1";
    process.env.BINGX_X02_API_KEY = "entries-fixture-key";
    process.env.BINGX_X02_SECRET = "entries-fixture-secret";
  });
  afterEach(() => {
    mock.restoreAll();
    mock.timers.reset();
    resetLiveBackoff();
    if (originalKey === undefined) delete process.env.BINGX_X02_API_KEY; else process.env.BINGX_X02_API_KEY = originalKey;
    if (originalSecret === undefined) delete process.env.BINGX_X02_SECRET; else process.env.BINGX_X02_SECRET = originalSecret;
    if (originalArmed === undefined) delete process.env.CTS_CORE_LIVE; else process.env.CTS_CORE_LIVE = originalArmed;
  });

  it("an explicitly zero entry books no position or phantom protection and is never submitted twice", async () => {
    const { rt, state, step } = fixture();
    state.entry.order = { orderId: "entry", status: "NEW", executedQty: 0, avgPrice: 100 };
    const status = await step();
    assert.equal(status.placed, 0);
    assert.equal(state.sent.filter((p) => p.type !== "MARKET").length, 0);
    const row = rt.db.get<{ qty: number; status: string }>("SELECT qty,status FROM live_orders WHERE kind='E'")!;
    assert.equal(row.qty, 0);
    assert.equal(row.status, "pending");
    await step();
    assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 1);
  });

  it("a partial entry books and protects only the executed amount at its actual fill price", async () => {
    const { rt, state, step } = fixture();
    const status = await step();
    assert.equal(status.placed, 1);
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='E'")?.qty, .25);
    const controls = state.sent.filter((p) => p.type !== "MARKET");
    assert.equal(controls.length, 2);
    assert.ok(controls.every((p) => Number(p.quantity) === .25));
    assert.ok(Math.abs(Number(controls.find((p) => p.type === "STOP_MARKET")!.stopPrice) - 9.69) <= .0001);
    const fill = rt.db.get<{ qty: number; fill_px: number; fee: number }>("SELECT qty,fill_px,fee FROM live_fills")!;
    assert.equal(fill.qty, .25);
    assert.equal(fill.fill_px, 10.2);
    assert.equal(fill.fee, .01);
  });

  it("a delayed entry settles on its original id and its actual fill survives into closed-position history", async () => {
    const { rt, state, step, history } = fixture();
    state.entry.order = { orderId: "entry", status: "NEW", executedQty: 0 };
    await step();
    const original = rt.db.get<{ coid: string; at: number }>("SELECT coid,at FROM live_orders WHERE kind='E'")!;
    mock.timers.tick(1_001);
    state.entry.order = { orderId: "entry", status: "FILLED", executedQty: 1, avgPrice: 10.5, commission: -.02 };
    state.qty = 1;
    const status = await step();
    assert.equal(status.placed, 1);
    assert.equal(status.closed, 1, "legacy protection closes the delayed entry found without a stop");
    const entries = rt.db.all<{ coid: string; qty: number; at: number }>("SELECT coid,qty,at FROM live_orders WHERE kind='E'");
    assert.deepEqual(entries.map((x) => ({ ...x })), [{ ...original, qty: 1 }]);
    assert.equal(state.sent.filter((p) => p.type === "MARKET" && p.side === "BUY").length, 1);
    const trades = history();
    assert.equal(trades.length, 1);
    assert.equal(trades[0].entry, 10.5);
    assert.ok(Math.abs(trades[0].r * trades[0].notional + .44) < 1e-10, "10.5 → 10.1, less .02 entry + .02 exit fees");
  });

  it("continuing partial entry replies replace cumulative quantity and never resend the remainder", async () => {
    const { rt, state, step } = fixture();
    state.entry.order.status = "PARTIALLY_FILLED";
    await step();
    mock.timers.tick(1_001);
    state.entry.order = { orderId: "entry", status: "FILLED", executedQty: 1, avgPrice: 10.3, commission: -.04 };
    state.qty = 1;
    await step();
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind='E'")?.n, 1);
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='E'")?.qty, 1);
    assert.equal(rt.db.get<{ qty: number; fee: number }>("SELECT qty,fee FROM live_fills WHERE kind='E'")?.fee, .04);
    assert.equal(state.sent.filter((p) => p.type === "MARKET" && p.side === "BUY").length, 1);
  });

  it("zero and partial accepted protective closes do not overbook closes or submit duplicates", async () => {
    const { rt, state, step, seed, history } = fixture();
    seed();
    state.close.order = { orderId: "close", status: "NEW", executedQty: 0 };
    assert.equal((await step([])).closed, 0);
    assert.equal(history().length, 0);
    await step([]);
    assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 1);
    mock.timers.tick(1_001);
    state.close.order = { orderId: "close", status: "PARTIALLY_FILLED", executedQty: .4, avgPrice: 10.1, commission: -.008 };
    state.qty = .6;
    assert.equal((await step([])).closed, 0);
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='C'")?.qty, .4);
    assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 1);
    mock.timers.tick(1_001);
    state.close.order = { orderId: "close", status: "FILLED", executedQty: 1, avgPrice: 10.1, commission: -.02 };
    state.close.order.updateTime = Date.now() - 100;
    state.qty = 0;
    assert.equal((await step([])).closed, 1);
    assert.equal(history().length, 1);
    assert.equal(history()[0].exitT, state.close.order.updateTime, "the settled close belongs to execution time, not its old submission time");
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind='C'")?.n, 1);
  });

  it("a partial emergency close after failed TP/SL books only what actually exited", async () => {
    const { rt, state, step, history } = fixture();
    state.failControls = true;
    state.close.order.executedQty = .1;
    const status = await step();
    assert.equal(status.placed, 1);
    assert.equal(status.closed, 0);
    assert.ok(Math.abs(state.qty - .15) < 1e-12);
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='C'")?.qty, .1);
    assert.equal(history().length, 1);
    assert.ok(Math.abs(history()[0].notional - 1.02) < 1e-12);
  });

  it("an unmeasured or regressing cumulative poll cannot promote zero or erase a known partial fill", async () => {
    const { rt, state, step } = fixture();
    state.entry.order = { orderId: "entry", status: "NEW", executedQty: 0 };
    await step();
    mock.timers.tick(1_001);
    state.entry = { order: {} };
    await step();
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='E'")?.qty, 0);
    mock.timers.tick(1_001);
    state.entry.order = { orderId: "entry", status: "PARTIALLY_FILLED", executedQty: .25, avgPrice: 10.2 };
    // Keep a matching stop visible so this test isolates reconciliation rather than the protection close.
    state.orders.push({ symbol: "S0-USDT", positionSide: "LONG", orderId: "s", clientOrderID: makeCoid(rt.settings.live.connId, "S"), type: "STOP_MARKET" });
    state.qty = .25;
    await step();
    mock.timers.tick(1_001);
    state.entry.order = { orderId: "entry", status: "NEW", executedQty: 0 };
    await step();
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='E'")?.qty, .25);
  });

  it("a foreign position or an unentered hedge side is never protectively closed", async () => {
    for (const side of [null, -1]) {
      resetLiveBackoff();
      const { state, step, seed } = fixture();
      if (side !== null) seed(side); else state.qty = 1;
      await step([]);
      assert.equal(state.sent.length, 0);
      mock.restoreAll();
    }
  });

  it("accepted zero execution recovers its original request after a crash before snapshots", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-entries-journal-"));
    try {
      const db = new CoreDb(":memory:");
      db.journalPath = join(dir, "orders.journal");
      const first = fixture(db);
      first.state.entry.order = { orderId: "entry", status: "NEW", executedQty: 0 };
      await first.step();
      const original = db.get<{ coid: string; at: number }>("SELECT coid,at FROM live_orders WHERE kind='E'")!;
      mock.restoreAll();
      // A new database and runtime see the journal only: no snapshot, KV flush or process-local pending map.
      const restored = new CoreDb(":memory:");
      restored.journalPath = db.journalPath;
      assert.ok(restored.replayJournal() >= 3);
      const pending = restored.kvGet<Record<string, { sentQty: number; oid: string }>>("entriesPendingExecutions|bingx-vst-02")!;
      assert.equal(pending[original.coid].sentQty, 1);
      assert.equal(pending[original.coid].oid, "entry");
      const next = fixture(restored);
      next.state.entry.order = { orderId: "entry", status: "FILLED", executedQty: 1, avgPrice: 10.6, commission: -.03 };
      next.state.qty = 1;
      mock.timers.tick(1_001);
      const status = await next.step();
      assert.equal(status.placed, 1);
      assert.equal(status.closed, 1);
      assert.equal(next.state.sent.filter((p) => p.type === "MARKET" && p.side === "BUY").length, 0, "the restored intent is not submitted again");
      assert.equal(restored.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid=?", original.coid)?.qty, 1);
      assert.equal(next.history().length, 1);
      assert.equal(next.history()[0].entry, 10.6);
      const again = new CoreDb(":memory:");
      again.journalPath = db.journalPath;
      again.replayJournal();
      assert.deepEqual(again.kvGet("entriesPendingExecutions|bingx-vst-02"), {});
      assert.equal(again.get<{ qty: number; fee: number }>("SELECT qty,fee FROM live_fills WHERE coid=?", original.coid)?.fee, .03);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("a stopped partial entry followed by later cumulative fills is explicitly unresolved, never merged into fake history", async () => {
    const { rt, state, step } = fixture();
    state.entry.order.status = "PARTIALLY_FILLED";
    await step();
    await step(); // the partial position is observed while still inside the one-second status-poll throttle
    state.qty = 0;
    state.orders = [];
    await step(); // its stop flattened the observed partial before the remaining entry executed
    state.entry.order = { orderId: "entry", status: "FILLED", executedQty: 1, avgPrice: 10.3, commission: -.04 };
    state.qty = .75;
    mock.timers.tick(1_001);
    const status = await step();
    assert.match(status.reason, /execution chronology unresolved/);
    assert.match(liveKv<LiveStatus>(rt.db, "liveStatus")!.reason, /execution chronology unresolved/, "the UI sees the same unresolved status even with no new entries");
    assert.ok(status.skipped.some((p) => /execution chronology unresolved/.test(p.why)));
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='E'")?.qty, .25, "the known partial is not replaced with a different position episode");
    assert.equal(rt.db.get<{ fill_px: number }>("SELECT fill_px FROM live_fills WHERE kind='E'")?.fill_px, 10.2);
    assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 1, "no duplicate entry or invented full-size protective close");
    assert.equal(state.qty, .75);
  });

  it("an entry still confirmed at zero cannot claim an unrelated position that appears on its symbol", async () => {
    const { state, step } = fixture();
    state.entry.order = { orderId: "entry", status: "NEW", executedQty: 0 };
    await step();
    state.qty = 1; // another actor's position; our original order status still explicitly confirms zero execution
    mock.timers.tick(1_001);
    await step([]);
    assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 1, "no protective close of an unowned position");
    assert.equal(state.qty, 1);
  });
});
