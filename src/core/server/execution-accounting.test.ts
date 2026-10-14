import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { cachedClient, executedQty, parseFill, liveKv, resetLiveBackoff, stepLive, type LiveStatus } from "./live.server.ts";
import { ownLedger } from "./live.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { SimExchange, fakeRt, lane } from "../test-support.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";

describe("execution accounting integrity", () => {
  afterEach(() => { resetLiveBackoff(); mock.timers.reset(); });

  it("execution quantity is independent of price and explicit zero or nonfilled status never means a full fill", () => {
    assert.equal(executedQty({ order: { avgPrice: 100, executedQty: "0", status: "NEW" } }, 1), 0);
    assert.equal(parseFill({ order: { avgPrice: 100, executedQty: "0", status: "NEW" } }), null);
    assert.equal(executedQty({ order: { avgPrice: 0, executedQty: ".25" } }, 1), .25);
    assert.equal(parseFill({ order: { avgPrice: 0, executedQty: ".25" } }), null, "unknown price remains unmeasured");
    assert.equal(executedQty({ order: { executedVolume: ".25" } }, 1), .25);
    for (const q of [-1, "garbage", Infinity, "", null])
      assert.equal(executedQty({ order: { avgPrice: 100, executedQty: q } }, 1), 0);
    assert.equal(executedQty({ order: { status: "NEW" } }, 1), 0);
    assert.equal(executedQty({ order: { status: "CANCELLED" } }, 1), 0);
    assert.equal(executedQty({ order: { avgPrice: 100, status: "FILLED" } }, 1), 1, "documented missing-field fallback for an accepted fill");
    assert.equal(executedQty(undefined, 1), 1, "legacy accepted simulated replies remain compatible");
  });

  it("an unfilled accepted entry owns zero, submits no phantom stop, and settles the same order without duplicates", async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const rt = fakeRt(new CoreDb(":memory:")).rt;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange();
    const place = ex.order.bind(ex);
    let market: Record<string, string | number> | null = null;
    let requests = 0;
    let settled = false;
    let unreadable = false;
    let polls = 0;
    ex.order = async (p) => {
      if (p.type !== "MARKET") return place(p);
      requests++;
      market = p;
      const written = rt.db.get<{ qty: number; status: string; msg: string }>("SELECT qty,status,msg FROM live_orders WHERE coid=?", String(p.clientOrderID));
      assert.equal(written?.qty, 0, "the write-ahead journal never claims the requested quantity before a reply");
      assert.equal(written?.status, "pending");
      assert.ok(written?.msg.includes("execution-pending"));
      return { order: { orderId: "pending-entry", avgPrice: 100, executedQty: 0, status: "NEW" } };
    };
    Object.assign(ex, { orderStatus: async () => {
      polls++;
      if (unreadable) return {};
      return { order: { orderId: "pending-entry", avgPrice: settled ? 10.2 : 100, executedQty: settled ? market!.quantity : 0, status: settled ? "FILLED" : "NEW", commission: settled ? -.02 : 0 } };
    } });
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const owned = () => ownLedger(rt.db.all<{ k: string; kind: string; status: string; qty: number }>(
      "SELECT substr(cfg, 9) AS k, kind, status, qty FROM live_orders ORDER BY at, rowid",
    )).get("S0-USDT|1") ?? 0;
    const initial = await step();
    assert.equal(initial.placed, 0);
    assert.equal(owned(), 0);
    assert.equal(ex.orders.length, 0, "no stop for a position that has not executed");
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_fills")?.n, 0);
    await step();
    await step();
    assert.equal(requests, 1, "the NEW order is never submitted twice");
    assert.equal(polls, 1, "polling is bounded while the control loops");
    unreadable = true;
    mock.timers.tick(1_100);
    await step();
    assert.equal(owned(), 0, "a malformed order-status reply cannot promote the pending order to a full fill");
    assert.equal(requests, 1);
    await place(market!);
    settled = true;
    unreadable = false;
    ex.hide.add("S0-USDT|LONG");
    mock.timers.tick(1_100);
    await step();
    assert.equal(requests, 1);
    assert.equal(owned(), Number(market!.quantity));
    mock.timers.tick(1_100);
    await step();
    assert.equal(requests, 1, "a filled entry is not submitted again while the position endpoint lags");
    ex.hide.delete("S0-USDT|LONG");
    mock.timers.tick(1_100);
    await step();
    assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET"), "the actual execution is protected");
    const fills = rt.db.all<{ fill_px: number; qty: number }>("SELECT fill_px, qty FROM live_fills");
    assert.deepEqual(fills.map((x) => [x.fill_px, x.qty]), [[10.2, Number(market!.quantity)]]);
    await step();
    assert.equal(owned(), Number(market!.quantity), "the cumulative fill is not counted again");
  });

  it("an explicit partial quantity with no average price books and protects only that executed quantity", async () => {
    const rt = fakeRt(new CoreDb(":memory:")).rt;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange();
    const place = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.type !== "MARKET") return place(p);
      await place({ ...p, quantity: .25 });
      return { order: { avgPrice: 0, executedQty: .25, status: "FILLED" } };
    };
    await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    assert.equal(ex.positions.get("S0-USDT|LONG"), .25);
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind = 'O' AND status = 'ok'")?.qty, .25);
    assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET"));
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_fills")?.n, 0, "no average fill price is invented");
  });

  it("a pending close keeps protection and ownership until the same venue order actually executes", async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const rt = fakeRt(new CoreDb(":memory:")).rt;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange();
    const place = ex.order.bind(ex);
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    await step();
    const initial = ex.positions.get("S0-USDT|LONG")!;
    let close: Record<string, string | number> | null = null;
    let sends = 0;
    let settled = false;
    ex.order = async (p) => {
      if (p.type !== "MARKET") return place(p);
      close = p;
      sends++;
      return { order: { orderId: "pending-close", avgPrice: 10.5, executedQty: 0, status: "NEW" } };
    };
    Object.assign(ex, { orderStatus: async () => ({ order: {
      orderId: "pending-close", avgPrice: 10.5, executedQty: settled ? close!.quantity : 0,
      status: settled ? "FILLED" : "NEW", commission: settled ? -.01 : 0,
    } }) });
    rt.paper.positions = [];
    mock.timers.tick(20_000);
    const pending = await step();
    assert.equal(pending.closed, 0);
    assert.equal(ex.positions.get("S0-USDT|LONG"), initial);
    assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET"));
    const closeRow = rt.db.get<{ qty: number; status: string }>("SELECT qty, status FROM live_orders WHERE kind = 'X'");
    assert.equal(closeRow?.qty, 0);
    assert.equal(closeRow?.status, "pending");
    await step();
    assert.equal(sends, 1);
    await place(close!);
    settled = true;
    mock.timers.tick(1_100);
    await step();
    assert.equal(sends, 1);
    assert.equal(ex.positions.has("S0-USDT|LONG"), false);
    const row = rt.db.get<{ qty: number; fill_px: number; at: number }>("SELECT o.qty, f.fill_px, o.at FROM live_orders o JOIN live_fills f ON f.coid=o.coid WHERE o.kind='X'");
    assert.equal(row?.qty, initial);
    assert.equal(row?.fill_px, 10.5);
    assert.equal(row?.at, Date.now(), "the close belongs to its measured execution time, not the earlier NEW acknowledgment");
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind='F'")?.n, 0, "our delayed fill is never relabeled an exchange stop-out");
  });

  it("a continuing partial entry replaces cumulative quantity instead of adding it or submitting the remainder twice", async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const rt = fakeRt(new CoreDb(":memory:")).rt;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange();
    const place = ex.order.bind(ex);
    let requested = 0;
    let market: Record<string, string | number> | null = null;
    let sends = 0;
    let final = false;
    ex.order = async (p) => {
      if (p.type !== "MARKET") return place(p);
      market = p;
      requested = Number(p.quantity);
      sends++;
      await place({ ...p, quantity: requested / 4 });
      return { order: { orderId: "partial-entry", avgPrice: 10.1, executedQty: requested / 4, status: "PARTIALLY_FILLED", commission: -.01 } };
    };
    Object.assign(ex, { orderStatus: async () => ({ order: {
      orderId: "partial-entry", avgPrice: final ? 10.2 : 10.1,
      executedQty: final ? requested : requested / 4, status: final ? "FILLED" : "PARTIALLY_FILLED", commission: final ? -.04 : -.01,
    } }) });
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    await step();
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='O'")?.qty, requested / 4);
    assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET"), "the executed part is protected immediately");
    await step();
    assert.equal(sends, 1, "the pending remainder is not submitted as an increase");
    await place({ ...market!, quantity: requested * 3 / 4 });
    final = true;
    mock.timers.tick(1_100);
    await step();
    const entries = rt.db.all<{ qty: number }>("SELECT qty FROM live_orders WHERE kind IN ('O','I') AND status='ok'");
    assert.equal(entries.length, 1);
    assert.equal(entries[0].qty, requested);
    assert.equal(rt.db.get<{ qty: number; fill_px: number; fee: number }>("SELECT qty, fill_px, fee FROM live_fills")?.fee, .04);
    assert.equal(sends, 1);
  });

  it("a protective close books only its actual partial fill and leaves the remainder owned", async () => {
    const rt = fakeRt(new CoreDb(":memory:")).rt;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange();
    const place = ex.order.bind(ex);
    let opened = 0;
    ex.order = async (p) => {
      if (p.type === "STOP_MARKET") throw new ExchangeRejected("stop permission denied", 109400);
      if (p.type !== "MARKET") return place(p);
      const into = p.positionSide === "LONG" && p.side === "BUY";
      const q = Number(p.quantity) * (into ? 1 : .25);
      if (into) opened = q;
      await place({ ...p, quantity: q });
      return { order: { avgPrice: into ? 10 : 9.9, executedQty: q, status: "FILLED" } };
    };
    const result = await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    assert.equal(result.closed, 0, "an incomplete protective close is never counted as a fully closed position");
    assert.equal(ex.positions.get("S0-USDT|LONG"), opened * .75);
    const rows = rt.db.all<{ k: string; kind: string; status: string; qty: number }>(
      "SELECT substr(cfg, 9) AS k, kind, status, qty FROM live_orders ORDER BY at, rowid",
    );
    assert.equal(ownLedger(rows).get("S0-USDT|1"), opened * .75);
    assert.equal(rows.find((x) => x.kind === "X")?.qty, opened * .25);
  });

  it("a protective close accepted with zero fills is not sent again while its execution remains pending", async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const rt = fakeRt(new CoreDb(":memory:")).rt;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange();
    const place = ex.order.bind(ex);
    let closes = 0;
    ex.order = async (p) => {
      if (p.type === "STOP_MARKET") throw new ExchangeRejected("stop permission denied", 109400);
      if (p.type === "MARKET" && p.side === "SELL") {
        closes++;
        return { order: { orderId: "protective-pending", avgPrice: 9.9, executedQty: 0, status: "NEW" } };
      }
      return place(p);
    };
    Object.assign(ex, { orderStatus: async () => ({ order: { orderId: "protective-pending", avgPrice: 9.9, executedQty: 0, status: "NEW" } }) });
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const first = await step();
    assert.equal(first.closed, 0);
    const owned = ex.positions.get("S0-USDT|LONG")!;
    mock.timers.tick(20_000);
    await step();
    assert.equal(closes, 1, "stop repair does not submit a second protective close into the pending one");
    assert.equal(ex.positions.get("S0-USDT|LONG"), owned);
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='X'")?.qty, 0);
  });

  for (const later of ["cancelled", "growth-flat", "growth-visible"] as const)
    it(`a stopped partial entry preserves its original record and ${later === "cancelled" ? "books its known stop once" : "holds ambiguous later growth"} (${later})`, async () => {
      const start = 1_790_000_000_000;
      mock.timers.enable({ apis: ["Date"], now: start });
      const rt = fakeRt(new CoreDb(":memory:")).rt;
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const ex = new SimExchange();
      const place = ex.order.bind(ex);
      let requested = 0;
      let market: Record<string, string | number> | null = null;
      let sends = 0;
      let terminal = false;
      ex.order = async (p) => {
        if (p.type !== "MARKET") return place(p);
        market = p;
        requested = Number(p.quantity);
        sends++;
        await place({ ...p, quantity: requested / 4 });
        return { order: { orderId: "stopped-partial", avgPrice: 10.1, executedQty: requested / 4, status: "PARTIALLY_FILLED", commission: -.01 } };
      };
      let stop: Record<string, unknown> | null = null;
      Object.assign(ex, {
        orderStatus: async () => ({ order: {
          orderId: "stopped-partial", avgPrice: terminal && later !== "cancelled" ? 10.2 : 10.1,
          executedQty: terminal && later !== "cancelled" ? requested : requested / 4,
          status: terminal ? later === "cancelled" ? "CANCELLED" : "FILLED" : "PARTIALLY_FILLED", commission: -.01,
        } }),
        ordersSince: async () => ({ orders: stop ? [stop] : [] }),
      });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await step();
      const opening = rt.db.get<{ coid: string; qty: number; at: number }>("SELECT coid, qty, at FROM live_orders WHERE kind='O'")!;
      mock.timers.tick(1_100);
      await step(); // the partial exchange position has now been observed, not just acknowledged by an order
      assert.equal(rt.db.get<{ at: number }>("SELECT at FROM live_orders WHERE coid=?", opening.coid)?.at, start);
      const resting = ex.orders.find((o) => o.type === "STOP_MARKET")!;
      stop = { clientOrderId: resting.clientOrderId, positionSide: "LONG", side: "SELL", type: "STOP_MARKET", status: "FILLED", executedQty: requested / 4, avgPrice: 9.5, time: start + 2_000, updateTime: start + 2_000 };
      ex.positions.clear();
      ex.orders = [];
      mock.timers.tick(1_100);
      await step(); // the position went flat while the entry was still reported as partial
      const pending = rt.db.get<{ msg: string }>("SELECT msg FROM live_orders WHERE coid=?", opening.coid)!.msg;
      assert.ok(pending.includes('"wasFlat":true'));
      if (later === "growth-visible") await place({ ...market!, quantity: requested * .75 });
      terminal = true;
      mock.timers.tick(1_100);
      const result = await step();
      const same = rt.db.get<{ qty: number; at: number; msg: string }>("SELECT qty, at, msg FROM live_orders WHERE coid=?", opening.coid)!;
      assert.equal(same.qty, opening.qty, "later cumulative replies never erase / enlarge the previous entry after its stop");
      assert.equal(same.at, opening.at, "status polling never moves the entry after its exit");
      assert.equal(sends, 1, "the stopped partial is not reopened");
      const flats = rt.db.all<{ px: number }>("SELECT px FROM live_orders WHERE kind='F'");
      if (later === "cancelled") {
        assert.equal(flats.length, 1);
        assert.equal(flats[0].px, 9.5, "the stop is booked from actual venue history");
        const { liveTrades } = await import("../statistics.ts");
        const rows = rt.db.all<any>("SELECT coid, sym, side, kind, qty, px, status, msg, at FROM live_orders ORDER BY at, rowid");
        const closed = liveTrades(rows, "CTSBV2_".length);
        assert.equal(closed.length, 1);
        assert.ok(closed[0].r < 0, "the known stop loss remains in execution PF");
        mock.timers.tick(1_100);
        await step();
        assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind='F'")?.n, 1);
      } else {
        assert.equal(flats.length, 1, "the proven stop of the original partial remains booked even while later growth is unresolved");
        assert.equal(flats[0].px, 9.5);
        const { liveTrades } = await import("../statistics.ts");
        const closed = liveTrades(rt.db.all<any>("SELECT coid,sym,side,kind,qty,px,status,msg,at FROM live_orders ORDER BY at,rowid"), "CTSBV2_".length);
        assert.equal(closed.length, 1, "only the known partial stop enters PF, never the unproved later quantity");
        assert.ok(closed[0].r < 0);
        assert.ok(same.msg.includes('"unresolved":true'));
        assert.ok(same.msg.includes('"late"'), "raw cumulative evidence stays available for reconciliation");
        assert.ok(result.skipped.some((x) => x.why.includes("chronology unresolved")));
      }
    });

  for (const fraction of [0, .25])
  it(`a cancelled ${fraction === 0 ? "zero-fill" : "partial-fill"} close cannot hide the protective stop that actually emptied the position`, async () => {
    const start = 1_790_000_000_000;
    mock.timers.enable({ apis: ["Date"], now: start });
    const rt = fakeRt(new CoreDb(":memory:")).rt;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange();
    const place = ex.order.bind(ex);
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    await step();
    const known = ex.positions.get("S0-USDT|LONG")!;
    const stop = ex.orders.find((o) => o.type === "STOP_MARKET")!;
    let terminal = false;
    let stopFilled = false;
    ex.order = async (p) => {
      if (p.type !== "MARKET") return place(p);
      if (fraction > 0) await place({ ...p, quantity: known * fraction });
      return { order: { orderId: "stopped-close", avgPrice: 10.5, executedQty: known * fraction, status: fraction > 0 ? "PARTIALLY_FILLED" : "NEW" } };
    };
    Object.assign(ex, {
      orderStatus: async () => ({ order: { orderId: "stopped-close", avgPrice: 10.5, executedQty: known * fraction, status: terminal ? "CANCELLED" : fraction > 0 ? "PARTIALLY_FILLED" : "NEW" } }),
      ordersSince: async () => ({ orders: stopFilled ? [{ clientOrderId: stop.clientOrderId, positionSide: "LONG", side: "SELL", type: "STOP_MARKET", status: "FILLED", executedQty: known * (1 - fraction), avgPrice: 9.5, time: start + 2_000, updateTime: start + 2_000 }] : [] }),
    });
    rt.paper.positions = [];
    mock.timers.tick(1_100);
    await step();
    ex.positions.clear();
    ex.orders = [];
    stopFilled = true;
    mock.timers.tick(1_100);
    await step();
    terminal = true;
    mock.timers.tick(1_100);
    await step();
    assert.equal(rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE kind='X'")?.qty, known * fraction);
    const flats = rt.db.all<{ px: number }>("SELECT px FROM live_orders WHERE kind='F'");
    assert.deepEqual(flats.map((x) => x.px), [9.5]);
    const { liveTrades } = await import("../statistics.ts");
    const closed = liveTrades(rt.db.all<any>("SELECT coid,sym,side,kind,qty,px,status,msg,at FROM live_orders ORDER BY at,rowid"), "CTSBV2_".length);
    assert.equal(closed.length, fraction > 0 ? 2 : 1);
    assert.ok(closed.some((x) => x.r < 0));
    await step();
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind='F'")?.n, 1);
  });

  it("a clamped reported overfill charges only the owned fill's proportional commission", async () => {
    const rt = fakeRt(new CoreDb(":memory:")).rt;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange();
    const place = ex.order.bind(ex);
    let requested = 0;
    ex.order = async (p) => {
      await place(p);
      if (p.type === "MARKET") {
        requested = Number(p.quantity);
        return { order: { avgPrice: 10, executedQty: requested * 2.5, commission: -.001, status: "FILLED" } };
      }
    };
    await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const fill = rt.db.get<{ qty: number; fee: number }>("SELECT qty,fee FROM live_fills")!;
    assert.equal(fill.qty, requested);
    assert.ok(Math.abs(fill.fee - .0004) < 1e-12);
  });

  it("a restart after a lost entry reply owns zero until venue history confirms the journaled client id", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-unacknowledged-"));
    try {
      const db = new CoreDb(":memory:");
      db.journalPath = join(dir, "orders.journal");
      const rt = fakeRt(db).rt;
      const a = lane("a", "S0-USDT", 1, 10);
      rt.paper.positions = [a];
      const ex = new SimExchange();
      const place = ex.order.bind(ex);
      let sends = 0;
      const history: Record<string, unknown>[] = [];
      ex.order = async (p) => {
        await place(p);
        if (p.type === "MARKET") {
          sends++;
          history.push({ clientOrderId: p.clientOrderID, status: "FILLED", executedQty: p.quantity, avgPrice: 10.2, commission: -.02, updateTime: Date.now() });
          throw new Error("reply timed out after execution");
        }
      };
      Object.assign(ex, { ordersSince: async () => ({ orders: history }) });
      await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const pending = db.get<{ coid: string; qty: number; msg: string }>("SELECT coid,qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(pending.qty, 0);
      assert.ok(pending.msg.includes("sentQty"));
      const restored = new CoreDb(":memory:");
      restored.journalPath = db.journalPath;
      restored.replayJournal();
      const next = fakeRt(restored).rt;
      next.paper.positions = [a];
      await stepLive(next as unknown as CoreRuntime, [], 1, ex);
      assert.equal(sends, 1, "the restored pending client id is resolved instead of resubmitted");
      const entries = restored.all<{ coid: string; qty: number; status: string }>("SELECT coid,qty,status FROM live_orders WHERE kind='O'");
      assert.equal(entries.length, 1);
      assert.equal(entries[0].coid, pending.coid);
      assert.equal(entries[0].qty, ex.positions.get("S0-USDT|LONG"));
      assert.equal(entries[0].status, "ok");
      assert.equal(restored.get<{ fill_px: number }>("SELECT fill_px FROM live_fills")?.fill_px, 10.2);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("an account snapshot keeps its original read time while the control and caches keep running", async () => {
    const now = 1_790_000_000_000;
    mock.timers.enable({ apis: ["Date"], now });
    const rt = fakeRt(new CoreDb(":memory:")).rt as unknown as CoreRuntime;
    const raw = new SimExchange().withEquity(100);
    let reads = 0;
    raw.account = async () => {
      reads++;
      return { at: now - 10_000, wallet: 100, equity: 100, unrealized: 0, realized: -2, usedMargin: 0, availableMargin: 100 };
    };
    const ex = cachedClient({
      hasKeys: () => raw.hasKeys(), fingerprint: () => raw.fingerprint(), book: () => raw.book(),
      contracts: () => raw.contracts(), order: (p) => raw.order(p), cancel: (s, id) => raw.cancel(s, id),
      account: raw.account,
    }, 1000);
    await stepLive(rt, [], 1, ex);
    mock.timers.tick(20_000);
    await stepLive(rt, [], 1, ex);
    assert.equal(reads, 1);
    const a = liveKv<LiveStatus>(rt.db, "liveStatus")?.account;
    assert.equal(a?.at, now - 10_000, "the same cached balance must not acquire a newer timestamp");
    assert.equal(a?.source, "exchange");
    assert.equal(a?.wallet, 100);
    assert.equal(a?.realized, -2, "the account's cumulative realized number stays distinct from ledger P&L");
  });

  it("the real fill price and commission survive a crash between snapshots with the order ledger", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-execution-"));
    try {
      const db = new CoreDb(":memory:");
      db.journalPath = join(dir, "orders.journal");
      const rt = fakeRt(db).rt;
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const ex = new SimExchange();
      const order = ex.order.bind(ex);
      ex.order = async (p) => {
        await order(p);
        return p.type === "MARKET" ? { order: { avgPrice: 10.2, executedQty: p.quantity, commission: -.017 } } : undefined;
      };
      await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const actual = db.all("SELECT coid, qty, ref_px, fill_px, fee FROM live_fills");
      assert.equal(actual.length, 1);
      const restored = new CoreDb(":memory:");
      restored.journalPath = db.journalPath;
      restored.replayJournal();
      assert.deepEqual(restored.all("SELECT coid, qty, ref_px, fill_px, fee FROM live_fills"), actual);
      assert.ok(restored.get("SELECT coid FROM live_orders WHERE kind = 'O' AND status = 'ok'"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
