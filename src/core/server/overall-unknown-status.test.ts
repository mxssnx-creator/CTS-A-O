import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, resetLiveBackoff, stepLive } from "./live.server.ts";
import { SimExchange, fakeRt, lane } from "../test-support.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { resetLiveBackoff(); mock.timers.reset(); });

for (const side of [1, -1] as const)
  for (const source of ["ack", "poll"] as const)
    for (const unknownStatus of ["CANCEL_PENDING", "FUTURE_STATUS", ""] as const)
      test(`overall ${side} ${source} retains ${unknownStatus || "missing status"} partial remainder until terminal`, async () => {
        mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
        const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
        try {
          rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
          const place = ex.order.bind(ex);
          let requested = 0, sends = 0, final = false;
          let market: Record<string, string | number> | undefined;
          ex.order = async (p) => {
            if (p.type !== "MARKET") return place(p);
            sends++;
            if (!market) { market = p; requested = Number(p.quantity); }
            await place({ ...p, quantity: Number(p.quantity) / 4 });
            return { order: { orderId: "unsettled-entry", avgPrice: 10.1, executedQty: Number(p.quantity) / 4,
              status: source === "ack" ? unknownStatus : "PARTIALLY_FILLED" } };
          };
          ex.orderStatus = async () => ({ order: { orderId: "unsettled-entry", avgPrice: final ? 10.2 : 10.1,
            executedQty: final ? requested : requested / 4, status: final ? "FILLED" : unknownStatus } });
          const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
          const entry = () => db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
          await step();
          assert.equal(entry().qty, requested / 4, "book only the measured quarter");
          assert.ok(entry().msg.startsWith("execution-pending "), "retain remaining unconfirmed execution");
          mock.timers.tick(1_100);
          await step();
          assert.equal(sends, 1, "do not send a second market increase while the remainder may fill");
          assert.equal(entry().qty, requested / 4);
          assert.ok(entry().msg.startsWith("execution-pending "), "an unknown poll status is still pending");
          await place({ ...market!, quantity: requested * 3 / 4 });
          final = true;
          mock.timers.tick(1_100);
          await step();
          assert.equal(sends, 1, "terminal cumulative fill settles the original order only");
          assert.equal(entry().qty, requested);
          assert.ok(!entry().msg.startsWith("execution-pending "), "the exact terminal fill resolves the reservation");
          assert.equal(db.all("SELECT * FROM live_orders WHERE kind='I'").length, 0);
        } finally { db.db.close(); }
      });

for (const side of [1, -1] as const)
  for (const source of ["ack", "poll"] as const)
    for (const shape of ["missing", "invalid", "conflicting"] as const)
      test(`overall ${side} ${source} keeps ${shape} terminal cumulative quantity unresolved`, async () => {
        mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
        const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
        try {
          rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
          const place = ex.order.bind(ex);
          let sends = 0;
          const response = () => ({ order: { orderId: "unknown-terminal", status: "CANCELLED", avgPrice: 10.1,
            ...(shape === "invalid" ? { executedQty: "bad" } :
              shape === "conflicting" ? { executedQty: 0.25, executedVolume: 0.5 } : {}) } });
          ex.order = async (p) => {
            if (p.type !== "MARKET") return place(p);
            sends++;
            return source === "ack" ? response() : { order: { orderId: "unknown-terminal", status: "NEW", executedQty: 0 } };
          };
          ex.orderStatus = async () => response();
          const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
          await step();
          mock.timers.tick(1_100);
          await step();
          const row = db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='O'")!;
          assert.equal(row.qty, 0, "inconsistent cumulative fields are not evidence of ownership");
          assert.ok(row.msg.startsWith("execution-pending "));
          assert.equal(sends, 1, "no market resubmission without consistent terminal execution evidence");
        } finally { db.db.close(); }
      });

for (const side of [1, -1] as const)
  for (const amount of ["under", "over"] as const)
    test(`overall ${side} keeps ${amount}-reported FILLED close unresolved`, async () => {
      mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
      const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
      try {
        rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
        const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        const place = ex.order.bind(ex);
        await step();
        let requested = 0, sends = 0;
        ex.order = async (p) => {
          if (p.type !== "MARKET") return place(p);
          sends++; requested ||= Number(p.quantity);
          await place({ ...p, quantity: Number(p.quantity) / 4 });
          return { order: { orderId: "contradictory-close", avgPrice: 10.1,
            executedQty: amount === "over" ? requested * 1.5 : requested / 4, status: "FILLED" } };
        };
        ex.orderStatus = async () => ({ order: { orderId: "contradictory-close", avgPrice: 10.1,
          executedQty: amount === "over" ? requested * 1.5 : requested / 4, status: "FILLED" } });
        rt.paper.positions = [];
        mock.timers.tick(20_000);
        await step();
        mock.timers.tick(1_100);
        await step();
        const row = db.get<{ msg: string }>("SELECT msg FROM live_orders WHERE kind='X'")!;
        assert.ok(row.msg.startsWith("execution-pending "), "conflicting FILLED quantity stays unresolved");
        assert.equal(sends, 1, "no duplicate market close while the outcome is unresolved");
      } finally { db.db.close(); }
    });

for (const side of [1, -1] as const)
  for (const source of ["ack", "poll"] as const)
    test(`overall ${side} ${source} retains a partially executed close while cancellation is pending`, async () => {
      mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
      const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
      try {
        rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
        const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        const place = ex.order.bind(ex);
        await step();
        let requested = 0, sends = 0, final = false;
        let close: Record<string, string | number> | undefined;
        ex.order = async (p) => {
          if (p.type !== "MARKET") return place(p);
          sends++;
          if (!close) { close = p; requested = Number(p.quantity); }
          await place({ ...p, quantity: Number(p.quantity) / 4 });
          return { order: { orderId: "unsettled-close", avgPrice: 10.1, executedQty: Number(p.quantity) / 4,
            status: source === "ack" ? "CANCEL_PENDING" : "PARTIALLY_FILLED" } };
        };
        ex.orderStatus = async () => ({ order: { orderId: "unsettled-close", avgPrice: 10.1,
          executedQty: final ? requested : requested / 4, status: final ? "FILLED" : "CANCEL_PENDING" } });
        rt.paper.positions = [];
        mock.timers.tick(20_000);
        await step();
        const row = () => db.get<{ qty: number; msg: string }>("SELECT qty,msg FROM live_orders WHERE kind='X'")!;
        assert.equal(row().qty, requested / 4);
        assert.ok(row().msg.startsWith("execution-pending "));
        mock.timers.tick(1_100);
        await step();
        assert.equal(sends, 1, "do not send a duplicate close while the remainder may execute");
        assert.equal(row().qty, requested / 4);
        assert.ok(row().msg.startsWith("execution-pending "));
        await place({ ...close!, quantity: requested * 3 / 4 });
        final = true;
        mock.timers.tick(1_100);
        await step();
        assert.equal(sends, 1);
        assert.equal(row().qty, requested);
        assert.ok(!row().msg.startsWith("execution-pending "));
        assert.equal(ex.positions.has(`S0-USDT|${side === 1 ? "LONG" : "SHORT"}`), false);
      } finally { db.db.close(); }
    });

for (const side of [1, -1] as const)
  test(`overall ${side} unknown partial remains fenced across journal and state restart`, async () => {
    mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
    const dir = mkdtempSync(join(tmpdir(), "cts-overall-unknown-"));
    const statePath = join(dir, "state.json"), journalPath = join(dir, "orders.journal");
    const dbs: CoreDb[] = [];
    try {
      const create = () => {
        const db = new CoreDb(":memory:", { statePath });
        db.journalPath = journalPath;
        db.replayJournal(); dbs.push(db);
        return fakeRt(db).rt;
      };
      const ex = new SimExchange(), place = ex.order.bind(ex);
      let sends = 0, requested = 0, final = false;
      let market: Record<string, string | number> | undefined;
      ex.order = async (p) => {
        if (p.type !== "MARKET") return place(p);
        sends++; market = p; requested = Number(p.quantity);
        await place({ ...p, quantity: requested / 4 });
        return { order: { orderId: "restart-entry", avgPrice: 10.1,
          executedQty: requested / 4, status: "CANCEL_PENDING" } };
      };
      ex.orderStatus = async () => ({ order: { orderId: "restart-entry", avgPrice: 10.1,
        executedQty: final ? requested : requested / 4, status: final ? "FILLED" : "CANCEL_PENDING" } });
      let rt = create();
      rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
      await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const before = rt.db.get<{ coid: string; qty: number; msg: string }>("SELECT coid,qty,msg FROM live_orders WHERE kind='O'")!;
      assert.ok(before.msg.startsWith("execution-pending "));
      flushLiveKv(rt.db);
      assert.equal(rt.db.flushState(), true);
      rt.db.db.close();
      rt = create();
      rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
      mock.timers.tick(1_100);
      await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const pending = rt.db.get<{ coid: string; qty: number; msg: string }>("SELECT coid,qty,msg FROM live_orders WHERE kind='O'")!;
      assert.equal(pending.coid, before.coid);
      assert.equal(pending.qty, requested / 4);
      assert.ok(pending.msg.startsWith("execution-pending "));
      assert.equal(sends, 1);
      await place({ ...market!, quantity: requested * 3 / 4 });
      final = true;
      mock.timers.tick(1_100);
      await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
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
  for (const source of ["ack", "poll"] as const)
    for (const amount of ["under", "over"] as const)
      test(`overall ${side} ${source} keeps ${amount}-reported FILLED entry unresolved`, async () => {
        mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
        const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
        try {
          rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
          const place = ex.order.bind(ex);
          let requested = 0, sends = 0;
          ex.order = async (p) => {
            if (p.type !== "MARKET") return place(p);
            sends++; requested ||= Number(p.quantity);
            await place({ ...p, quantity: Number(p.quantity) / 4 });
            return { order: { orderId: "contradictory-entry", avgPrice: 10.1,
              executedQty: source === "ack" && amount === "over" ? requested * 1.5 : requested / 4,
              status: source === "ack" ? "FILLED" : "PARTIALLY_FILLED" } };
          };
          ex.orderStatus = async () => ({ order: { orderId: "contradictory-entry", avgPrice: 10.1,
            executedQty: amount === "over" ? requested * 1.5 : requested / 4, status: "FILLED" } });
          const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
          await step();
          mock.timers.tick(1_100);
          await step();
          const row = db.get<{ msg: string }>("SELECT msg FROM live_orders WHERE kind='O'")!;
          assert.ok(row.msg.startsWith("execution-pending "), "FILLED and explicit inconsistent quantity cannot release the remainder");
          assert.equal(sends, 1, "no new market increase while the original order remains unresolved");
        } finally { db.db.close(); }
      });
