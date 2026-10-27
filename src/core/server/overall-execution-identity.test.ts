import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, resetLiveBackoff, stepLive } from "./live.server.ts";
import { SimExchange, fakeRt, lane } from "../test-support.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { resetLiveBackoff(); mock.timers.reset(); });

for (const side of [1, -1] as const) for (const kind of ["entry", "close"] as const)
  for (const defect of ["venue-id", "client-id", "symbol", "side", "position-side", "type", "conflicting-ids", "unsafe-id", "rounded-conflict", "no-identity", "original-quantity", "invalid-original"] as const)
    test(`overall ${kind} side ${side} rejects ${defect} pending receipt`, async () => {
      mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
      const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
      try {
        const place = ex.order.bind(ex), step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
        if (kind === "close") { await step(); rt.paper.positions = []; mock.timers.tick(20_000); }
        let sends = 0, requested = 0, final = false;
        let market: Record<string, string | number> | undefined;
        ex.order = async (p) => {
          if (p.type !== "MARKET") return place(p);
          sends++;
          if (!market) { market = p; requested = Number(p.quantity); }
          await place({ ...p, quantity: Number(p.quantity) / 4 });
          return { order: { orderId: defect === "rounded-conflict" ? "8923456789012345678" : "our-market-id",
            status: "PARTIALLY_FILLED", executedQty: Number(p.quantity) / 4, avgPrice: 10 } };
        };
        const receipt = () => {
          const o: Record<string, unknown> = { orderId: defect === "rounded-conflict" ? "8923456789012345678" : "our-market-id", clientOrderId: market!.clientOrderID,
            symbol: "S0-USDT", side: market!.side, positionSide: market!.positionSide, type: "MARKET",
            status: "FILLED", executedQty: requested, origQty: requested, avgPrice: 10 };
          if (!final) {
            if (defect === "venue-id") o.orderId = "other-market-id";
            if (defect === "client-id") o.clientOrderId = "another-client";
            if (defect === "symbol") o.symbol = "S2-USDT";
            if (defect === "side") o.side = market!.side === "BUY" ? "SELL" : "BUY";
            if (defect === "position-side") o.positionSide = market!.positionSide === "LONG" ? "SHORT" : "LONG";
            if (defect === "type") o.type = "STOP_MARKET";
            if (defect === "conflicting-ids") o.orderID = "other-market-id";
            if (defect === "unsafe-id") o.orderId = Number.MAX_SAFE_INTEGER + 10;
            if (defect === "rounded-conflict") { o.orderID = "8923456789012345678"; o.orderId = Number("999999999999999999"); }
            if (defect === "no-identity") { delete o.orderId; delete o.clientOrderId; }
            if (defect === "original-quantity") o.origQty = requested * 1.5;
            if (defect === "invalid-original") o.origQty = "not-a-number";
          }
          return { order: o };
        };
        ex.orderStatus = async () => receipt();
        await step();
        const orderKind = kind === "entry" ? "O" : "X";
        const row = () => db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind=?", orderKind)!;
        assert.equal(row().qty, requested / 4);
        assert.ok(row().msg.startsWith("execution-pending "));
        mock.timers.tick(1_100);
        await step();
        assert.equal(sends, 1, "a mismatched status cannot cause a duplicate market order");
        assert.equal(row().qty, requested / 4, "a mismatched status cannot attribute the wrong fill");
        assert.ok(row().msg.startsWith("execution-pending "));
        await place({ ...market!, quantity: requested * 3 / 4 });
        final = true;
        mock.timers.tick(1_100);
        await step();
        assert.equal(sends, 1);
        assert.equal(row().qty, requested, "a matching cumulative receipt settles the exact order");
        assert.ok(!row().msg.startsWith("execution-pending "));
      } finally { db.db.close(); }
    });

for (const side of [1, -1] as const)
  test(`Overall side ${side} retains a protective close after a contradictory acknowledgment`, async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
    try {
      rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
      const place = ex.order.bind(ex);
      let closeClient = "", closeSends = 0;
      ex.order = async (p) => {
        if (p.type === "STOP_MARKET") throw new ExchangeRejected("stop permission denied", 109400);
        if (p.type !== "MARKET") return place(p);
        const into = p.side === (side === 1 ? "BUY" : "SELL");
        if (into) return place(p);
        closeClient = String(p.clientOrderID); closeSends++;
        await place({ ...p, quantity: Number(p.quantity) / 4 });
        return { order: { orderId: "unrelated-close", clientOrderId: "another-client", type: "MARKET",
          status: "FILLED", executedQty: p.quantity, avgPrice: 10 } };
      };
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await step();
      const row = db.get<{ coid: string; qty: number; msg: string }>("SELECT coid,qty,msg FROM live_orders WHERE kind='X'")!;
      assert.equal(row.coid, closeClient);
      assert.equal(row.qty, 0);
      assert.ok(row.msg.startsWith("execution-pending "));
      assert.equal(JSON.parse(row.msg.slice("execution-pending ".length)).oid, "");
      assert.equal(closeSends, 1);
    } finally { db.db.close(); }
  });

for (const identity of ["venue", "client"] as const)
  test(`sparse Overall status receipt with exact ${identity} identity can settle`, async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
    try {
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const place = ex.order.bind(ex);
      let market: Record<string, string | number> | undefined, final = false;
      ex.order = async (p) => {
        if (p.type !== "MARKET") return place(p);
        market = p;
        return { order: { orderId: "sparse-id", status: "NEW", executedQty: 0 } };
      };
      ex.orderStatus = async () => ({ order: {
        ...(identity === "venue" ? { orderId: "sparse-id" } : { clientOrderId: market!.clientOrderID }),
        status: final ? "FILLED" : "NEW", executedQty: final ? market!.quantity : 0, avgPrice: 10,
      } });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await step();
      await place(market!); final = true;
      mock.timers.tick(1_100); await step();
      const row = db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(row.qty, Number(market!.quantity));
      assert.ok(!row.msg.startsWith("execution-pending "));
    } finally { db.db.close(); }
  });

test("an exact string orderID beside an unsafe numeric alias remains usable for Overall reconciliation", async () => {
  mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
  const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
  try {
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const place = ex.order.bind(ex), exact = "8923456789012345678";
    let market: Record<string, string | number> | undefined, queried = "";
    ex.order = async (p) => {
      if (p.type !== "MARKET") return place(p);
      market = p;
      return { order: { orderId: Number(exact), orderID: exact, status: "NEW", executedQty: 0 } };
    };
    ex.orderStatus = async (_sym, id) => {
      queried = id;
      return { order: { orderId: Number(exact), orderID: exact, status: "FILLED", executedQty: market!.quantity, avgPrice: 10 } };
    };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    await step();
    await place(market!);
    mock.timers.tick(1_100); await step();
    const row = db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
    assert.equal(queried, exact);
    assert.equal(row.qty, Number(market!.quantity));
    assert.ok(!row.msg.startsWith("execution-pending "));
  } finally { db.db.close(); }
});

for (const side of [1, -1] as const) for (const defect of ["duplicate", "wrong-symbol", "wrong-side", "wrong-client-alias"] as const)
  test(`Overall history identity keeps ${defect} receipt pending for side ${side}`, async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
    try {
      rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
      const place = ex.order.bind(ex);
      let market: Record<string, string | number> | undefined, sends = 0, final = false;
      ex.order = async (p) => {
        if (p.type !== "MARKET") return place(p);
        sends++; market = p;
        return { order: { status: "NEW", executedQty: 0 } }; // no venue id: history must prove client identity
      };
      ex.ordersSince = async () => {
        const order: Record<string, unknown> = { clientOrderID: market!.clientOrderID, symbol: "S0-USDT",
          side: market!.side, positionSide: market!.positionSide, type: "MARKET",
          status: "FILLED", executedQty: market!.quantity, avgPrice: 10 };
        if (!final && defect === "wrong-symbol") order.symbol = "S1-USDT";
        if (!final && defect === "wrong-side") order.side = market!.side === "BUY" ? "SELL" : "BUY";
        if (!final && defect === "wrong-client-alias") order.clientOrderId = "wrong-client";
        return { orders: !final && defect === "duplicate" ? [order, { ...order }] : [order] };
      };
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await step(); mock.timers.tick(1_100); await step();
      const row = () => db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(row().qty, 0);
      assert.ok(row().msg.startsWith("execution-pending "));
      assert.equal(sends, 1);
      await place(market!); final = true;
      mock.timers.tick(1_100); await step();
      assert.equal(row().qty, Number(market!.quantity));
      assert.ok(!row().msg.startsWith("execution-pending "));
      assert.equal(sends, 1);
    } finally { db.db.close(); }
  });

for (const side of [1, -1] as const)
  test(`Overall pending identity stays verified after state and journal restart, side ${side}`, async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const dir = mkdtempSync(join(tmpdir(), "cts-overall-identity-"));
    const statePath = join(dir, "state.json"), journalPath = join(dir, "orders.journal"), dbs: CoreDb[] = [];
    try {
      const create = () => {
        const db = new CoreDb(":memory:", { statePath });
        db.journalPath = journalPath; db.replayJournal(); dbs.push(db);
        return fakeRt(db).rt;
      };
      const ex = new SimExchange(), place = ex.order.bind(ex);
      let market: Record<string, string | number> | undefined, requested = 0, sends = 0, final = false;
      ex.order = async (p) => {
        if (p.type !== "MARKET") return place(p);
        market = p; requested = Number(p.quantity); sends++;
        await place({ ...p, quantity: requested / 4 });
        return { order: { orderId: "restart-id", status: "PARTIALLY_FILLED", executedQty: requested / 4, avgPrice: 10 } };
      };
      ex.orderStatus = async () => ({ order: { orderId: final ? "restart-id" : "wrong-id",
        status: "FILLED", executedQty: requested, avgPrice: 10 } });
      let rt = create();
      rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
      await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const before = rt.db.get<{ coid: string; qty: number }>("SELECT coid,qty FROM live_orders WHERE kind='O'")!;
      flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
      rt = create(); rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
      mock.timers.tick(1_100); await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const pending = rt.db.get<{ coid: string; qty: number; msg: string }>("SELECT coid,qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(pending.coid, before.coid);
      assert.equal(pending.qty, requested / 4);
      assert.ok(pending.msg.startsWith("execution-pending "));
      assert.equal(sends, 1);
      await place({ ...market!, quantity: requested * 3 / 4 }); final = true;
      mock.timers.tick(1_100); await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const settled = rt.db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(settled.qty, requested);
      assert.ok(!settled.msg.startsWith("execution-pending "));
      assert.equal(sends, 1);
    } finally {
      for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
      rmSync(dir, { recursive: true, force: true });
    }
  });

for (const side of [1, -1] as const)
  test(`Overall one-way pending receipt verifies BOTH position side, side ${side}`, async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
    try {
      rt.settings.live.positionMode = "oneway";
      rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
      const place = ex.order.bind(ex);
      let market: Record<string, string | number> | undefined, sends = 0, valid = false;
      ex.order = async (p) => {
        if (p.type !== "MARKET") return place(p);
        market = p; sends++;
        return { order: { orderId: "oneway-id", status: "NEW", executedQty: 0 } };
      };
      ex.orderStatus = async () => ({ order: { orderId: "oneway-id", symbol: "S0-USDT", side: market!.side,
        positionSide: valid ? "BOTH" : side === 1 ? "LONG" : "SHORT", type: "MARKET",
        status: "FILLED", executedQty: market!.quantity, avgPrice: 10 } });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await step();
      assert.equal(market?.positionSide, "BOTH");
      mock.timers.tick(1_100); await step();
      const row = () => db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(row().qty, 0, "a hedge-side receipt cannot be attributed to a one-way order");
      assert.ok(row().msg.startsWith("execution-pending "));
      valid = true; mock.timers.tick(1_100); await step();
      assert.equal(row().qty, Number(market!.quantity));
      assert.ok(row().msg.startsWith("execution-pending "), "the filled order remains reserved until its position is observed");
      assert.equal(sends, 1);
    } finally { db.db.close(); }
  });

for (const change of ["epoch", "connection", "mode", "processing"] as const)
  test(`Overall discards a pending receipt after ${change} changes during the status read`, async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
    try {
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const place = ex.order.bind(ex);
      let requested = 0, sends = 0;
      ex.order = async (p) => {
        if (p.type !== "MARKET") return place(p);
        sends++; requested = Number(p.quantity);
        await place({ ...p, quantity: requested / 4 });
        return { order: { orderId: "delayed-id", status: "PARTIALLY_FILLED", executedQty: requested / 4, avgPrice: 10 } };
      };
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await step();
      let entered!: () => void, resolve!: (value: unknown) => void;
      const reached = new Promise<void>((r) => { entered = r; });
      ex.orderStatus = async () => { entered(); return new Promise((r) => { resolve = r; }); };
      mock.timers.tick(1_100);
      const pendingStep = step();
      await reached;
      if (change === "epoch") (rt as unknown as { liveEpoch: number }).liveEpoch = 1;
      else if (change === "connection") Object.assign(rt.settings.live, { connId: "bingx-x01" });
      else if (change === "mode") rt.settings.live.positionMode = "oneway";
      else rt.settings.live.mode = "entries";
      resolve({ order: { orderId: "delayed-id", status: "FILLED", executedQty: requested, avgPrice: 10 } });
      await pendingStep;
      const row = db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(row.qty, requested / 4, "old-context result cannot alter current ownership");
      assert.ok(row.msg.startsWith("execution-pending "));
      assert.equal(sends, 1);
    } finally { db.db.close(); }
  });

for (const change of ["epoch", "connection", "mode", "processing"] as const)
  test(`Overall retains the original entry when ${change} changes during its acknowledgment`, async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
    try {
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const place = ex.order.bind(ex);
      let market: Record<string, string | number> | undefined, sends = 0;
      let entered!: () => void, resolve!: (value: unknown) => void;
      const reached = new Promise<void>((r) => { entered = r; });
      ex.order = async (p) => {
        if (p.type !== "MARKET") return place(p);
        sends++; market = p;
        await place(p); entered();
        return new Promise((r) => { resolve = r; });
      };
      const pendingStep = stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await reached;
      if (change === "epoch") (rt as unknown as { liveEpoch: number }).liveEpoch = 1;
      else if (change === "connection") Object.assign(rt.settings.live, { connId: "bingx-x01" });
      else if (change === "mode") rt.settings.live.positionMode = "oneway";
      else rt.settings.live.mode = "entries";
      resolve({ order: { orderId: "late-id", clientOrderId: market!.clientOrderID, status: "FILLED", executedQty: market!.quantity } });
      await pendingStep;
      const row = db.get<{ coid: string; qty: number; msg: string }>("SELECT coid,qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(row.coid, market!.clientOrderID);
      assert.equal(row.qty, 0, "the abandoned response cannot change ownership");
      assert.ok(row.msg.startsWith("execution-pending "));
      assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, 0, "the old context sends no additional stop");
      assert.equal(sends, 1);
    } finally { db.db.close(); }
  });

test("review: a conflicting initial MARKET acknowledgment cannot book another identity's fill", async () => {
  mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
  const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
  try {
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const place = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.type !== "MARKET") return place(p);
      await place({ ...p, quantity: Number(p.quantity) / 4 });
      return { order: { orderId: "other-order", clientOrderId: "other-client", symbol: "S9-USDT", side: "SELL",
        positionSide: "SHORT", type: "MARKET", status: "FILLED", executedQty: p.quantity, avgPrice: 10 } };
    };
    await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const row = db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
    assert.equal(row.qty, 0, "contradictory acknowledgment must not be attributed to this request");
    assert.ok(row.msg.startsWith("execution-pending "));
  } finally { db.db.close(); }
});

for (const side of [1, -1] as const) for (const kind of ["entry", "close"] as const)
  for (const defect of ["client-id", "symbol", "side", "position-side", "type", "conflicting-ids", "unsafe-id", "rounded-conflict", "original-quantity"] as const)
    test(`Overall ${kind} side ${side} reserves original client after conflicting ${defect} acknowledgment`, async () => {
      mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
      const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
      try {
        const place = ex.order.bind(ex), step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
        if (kind === "close") { await step(); rt.paper.positions = []; mock.timers.tick(20_000); }
        let sends = 0, requested = 0;
        let market: Record<string, string | number> | undefined;
        ex.order = async (p) => {
          if (p.type !== "MARKET") return place(p);
          sends++; market = p; requested = Number(p.quantity);
          await place({ ...p, quantity: requested / 4 });
          const o: Record<string, unknown> = { orderId: "unrelated-id", clientOrderId: p.clientOrderID,
            symbol: "S0-USDT", side: p.side, positionSide: p.positionSide, type: "MARKET",
            origQty: requested, status: "FILLED", executedQty: requested, avgPrice: 10 };
          if (defect === "client-id") o.clientOrderId = "another-client";
          if (defect === "symbol") o.symbol = "S2-USDT";
          if (defect === "side") o.side = p.side === "BUY" ? "SELL" : "BUY";
          if (defect === "position-side") o.positionSide = p.positionSide === "LONG" ? "SHORT" : "LONG";
          if (defect === "type") o.type = "STOP_MARKET";
          if (defect === "conflicting-ids") o.orderID = "other-id";
          if (defect === "unsafe-id") o.orderId = Number.MAX_SAFE_INTEGER + 10;
          if (defect === "rounded-conflict") { o.orderId = Number("999999999999999999"); o.orderID = "8923456789012345678"; }
          if (defect === "original-quantity") o.origQty = requested * 1.5;
          return { order: o };
        };
        const statusQueries: string[] = [];
        ex.orderStatus = async (_sym, id) => { statusQueries.push(id); return null; };
        ex.ordersSince = async () => ({ orders: [{ clientOrderId: market!.clientOrderID, orderId: "our-verified-id",
          symbol: "S0-USDT", side: market!.side, positionSide: market!.positionSide, type: "MARKET", origQty: requested,
          status: "PARTIALLY_FILLED", executedQty: requested / 4, avgPrice: 10 }] });
        await step();
        const row = () => db.get<{ coid: string; qty: number; msg: string }>("SELECT coid,qty,msg FROM live_orders WHERE kind=?", kind === "entry" ? "O" : "X")!;
        const first = row();
        assert.equal(first.coid, market!.clientOrderID, "retain the request's own client identity");
        assert.equal(first.qty, 0, "a conflicting receipt attributes no execution");
        assert.ok(first.msg.startsWith("execution-pending "));
        assert.equal(JSON.parse(first.msg.slice("execution-pending ".length)).oid, "", "never persist the unrelated venue ID");
        mock.timers.tick(1_100); await step();
        assert.equal(row().coid, market!.clientOrderID);
        assert.equal(row().qty, requested / 4, "the exact client's later measured receipt owns only the partial fill");
        assert.ok(row().msg.startsWith("execution-pending "));
        assert.equal(sends, 1, "no duplicate MARKET while the original remainder is pending");
        assert.ok(!statusQueries.includes("unrelated-id"));
      } finally { db.db.close(); }
    });
