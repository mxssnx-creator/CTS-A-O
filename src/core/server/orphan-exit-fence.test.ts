import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { ExchangeRejected, RequestBudgetDeferred } from "../exchange/bingx.server.ts";
import { exactVenueOrderId, exactVenueOrderIds } from "../exchange/venue-order-id.ts";
import { flushLiveKv, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import { makeCoid } from "./live.ts";
import { orphanCancelledZero, orphanFenceId, orphanFenceKeys, type OrphanExitFence } from "./orphan-exit-fence.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { fakeRt, rng, SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";
const SYM = "S1-USDT";
const order: OrphanExitFence = { conn: "account-a", sym: SYM, coid: "CTSBV2_S123", oid: "42",
  positionSide: "LONG", type: "STOP_MARKET" };
const receipt = (change: Record<string, unknown> = {}) => ({ order: { orderId: "42", symbol: SYM,
  clientOrderId: order.coid, positionSide: "LONG", side: "SELL", type: "STOP_MARKET",
  status: "CANCELLED", executedQty: 0, ...change } });

class OneWayExchange extends SimExchange {
  async order(p: Record<string, string | number>): Promise<unknown> {
    if (p.type === "MARKET" && p.positionSide === "BOTH") {
      const reduce = String(p.reduceOnly) === "true";
      const long = reduce ? p.side === "SELL" : p.side === "BUY";
      return super.order({ ...p, positionSide: long ? "LONG" : "SHORT" });
    }
    return super.order(p);
  }
}

const setup = (db: CoreDb, mode: "hedge" | "oneway") => {
  const { rt } = fakeRt(db);
  rt.settings.live = { ...rt.settings.live, enabled: true, mode: "overall", positionMode: mode,
    laneOrders: false, maxPositions: 0, maxChase: 0, minFreeMargin: 0, maxPositionX: 0,
    maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0 };
  return rt;
};
const position = (side: 1 | -1) => ({ cfg: `follow|ema-9-21@m15|side-${side}`, sym: SYM, side,
  entry: 17, stop: 17 * (1 - side * .03), vol: 1, entryT: 1 });
const run = (rt: ReturnType<typeof setup>, ex: ExchangeClient) => stepLive(rt as unknown as CoreRuntime, [], 1, ex);

describe("durable unlinked conditional fence", () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());

  it("releases only exact, nonconflicting, zero-fill terminal receipts", () => {
    assert.equal(orphanCancelledZero(order, receipt()), true);
    for (const change of [
      { orderId: "another" }, { symbol: "S2-USDT" }, { clientOrderId: "different" },
      { positionSide: "SHORT" }, { side: "BUY" }, { type: "TAKE_PROFIT_MARKET" },
      { status: "FILLED", executedQty: .1 }, { status: "PARTIALLY_FILLED", executedQty: .1 },
      { status: "CANCEL_PENDING" }, { status: "CANCELLING" }, { status: "CANCEL_REQUESTED" },
      { status: "CANCEL_REJECTED" }, { status: "FAILED" },
      { executedQty: .1 }, { executedQty: undefined }, { executedQty: "" },
      { executedQty: 0, cumExecQty: .1 }, { executedQty: 0, executedVolume: .1 }, { executedQty: NaN },
    ]) assert.equal(orphanCancelledZero(order, receipt(change)), false, JSON.stringify(change));
    assert.equal(orphanCancelledZero({ ...order, oid: "" }, receipt()), false);
    assert.equal(orphanCancelledZero({ ...order, positionSide: "BOTH" }, receipt()), false);
    assert.equal(exactVenueOrderId(Number.MAX_SAFE_INTEGER + 1), "");
    assert.equal(exactVenueOrderId("9007199254740992"), "9007199254740992");
    assert.equal(exactVenueOrderIds(Number.MAX_SAFE_INTEGER + 1, "9007199254740993"), "9007199254740993");
    assert.equal(exactVenueOrderIds(42, "42"), "42");
    assert.equal(exactVenueOrderIds(42, "43"), "", "contradictory exact ID aliases never select an order");
    assert.equal(orphanCancelledZero({ ...order, oid: "9007199254740993" },
      receipt({ orderId: Number.MAX_SAFE_INTEGER + 1, orderID: "9007199254740993" })), true);
    assert.equal(orphanCancelledZero(order, receipt({ orderId: "42", orderID: "43" })), false);
    assert.equal(orphanCancelledZero({ ...order, oid: "9007199254740992" }, receipt({ orderId: Number.MAX_SAFE_INTEGER + 1 })), false);
    assert.notEqual(orphanFenceId(order), orphanFenceId({ ...order, positionSide: "SHORT" }));
    assert.notEqual(orphanFenceId(order), orphanFenceId({ ...order, type: "TAKE_PROFIT_MARKET" }));
    assert.deepEqual(orphanFenceKeys({ ...order, positionSide: "BOTH" }), [`${SYM}|1`, `${SYM}|-1`]);
  });

  for (const mode of ["hedge", "oneway"] as const) for (const side of [1, -1] as const)
    it(`${mode} side ${side}: an omitted orphan stays reserved after a real durable-state restart until the runtime reads its receipt`, async () => {
      mock.timers.enable({ apis: ["Date"], now: Date.now() });
      const dir = mkdtempSync(join(tmpdir(), "cts-orphan-fence-")), path = join(dir, "state.json");
      let db = new CoreDb(":memory:", { statePath: path });
      const ex = mode === "hedge" ? new SimExchange(rng(3)) : new OneWayExchange(rng(3));
      try {
        let rt = setup(db, mode);
        const coid = makeCoid(rt.settings.live.connId, "S");
        const venueSide = mode === "oneway" ? "BOTH" : side === 1 ? "LONG" : "SHORT";
        const reply = await ex.order({ symbol: SYM, positionSide: venueSide, side: side === 1 ? "SELL" : "BUY",
          type: "STOP_MARKET", quantity: 1, stopPrice: side === 1 ? 16 : 18, clientOrderID: coid }) as { order: { orderId: string } };
        const oid = reply.order.orderId;
        rt.paper.positions = [position(side)];
        await run(rt, ex);
        assert.equal(ex.positions.size, 0, "the visible unlinked exit blocks the new parent");
        assert.equal(Object.keys(db.kvGet<Record<string, unknown>>("orphanExitFences") ?? {}).length, 1);
        db.kvSet("positionExitCleanup", { marker: { coid: "sentinel" } });
        assert.equal(db.flushState(), true);
        flushLiveKv(db); db.db.close();
        db = new CoreDb(":memory:", { statePath: path });
        assert.deepEqual(db.kvGet("positionExitCleanup"), { marker: { coid: "sentinel" } }, "existing cleanup state also survives production restart");
        db.kvSet("positionExitCleanup", {}); // fixture sentinel is not a real cleanup request
        rt = setup(db, mode);
        rt.paper.positions = [position(side)];
        ex.orders = ex.orders.filter((o) => o.id !== oid);
        ex.orderStatus = async () => null;
        await run(rt, ex);
        assert.equal(ex.positions.size, 0, "a missing book row and unknown status are not a cancellation");
        const originalCount = ex.log.filter((o) => o.type === "MARKET").length;
        ex.orderStatus = async () => ({ order: { orderId: oid, clientOrderId: coid, symbol: SYM,
          positionSide: venueSide, side: side === 1 ? "SELL" : "BUY", type: "STOP_MARKET",
          status: "CANCELLED", executedQty: 0 } });
        mock.timers.tick(6_000);
        await run(rt, ex); // schedule the non-blocking exact-status lookup
        await run(rt, ex); // consume it only against another fresh book
        assert.equal(ex.log.filter((o) => o.type === "MARKET").length, originalCount + 1,
          "the runtime observed exact terminal zero-fill evidence before opening");
        assert.ok(ex.positions.size > 0);
        const fences = Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {});
        assert.equal(fences.some((f) => f.oid === oid), false, "the old identity was durably cleared before re-entry");
        assert.ok(fences.some((f) => f.oid !== oid && f.type === "STOP_MARKET"),
          "the new parent's own stop is durably reserved before its submission");
      } finally {
        flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true });
      }
    });

  for (const mode of ["hedge", "oneway"] as const) for (const side of [1, -1] as const)
    it(`${mode} side ${side}: a submitted attached stop survives omitted books, two hours and restart`, async () => {
      mock.timers.enable({ apis: ["Date"], now: Date.now() });
      const dir = mkdtempSync(join(tmpdir(), "cts-attached-fence-")), path = join(dir, "state.json");
      const journal = join(dir, "ledger.journal");
      let db = new CoreDb(":memory:", { statePath: path });
      db.journalPath = journal;
      const ex = mode === "hedge" ? new SimExchange(rng(12)) : new OneWayExchange(rng(12));
      try {
        let rt = setup(db, mode);
        rt.paper.positions = [position(side)];
        await run(rt, ex);
        const venueSide = side === 1 ? "LONG" : "SHORT";
        const qty = ex.positions.get(`${SYM}|${venueSide}`);
        assert.ok(qty && qty > 0, "the original parent really opened");
        const stop = ex.orders.find((o) => o.type === "STOP_MARKET");
        assert.ok(stop?.id && stop.clientOrderId, "the original stop really rests at the venue");
        assert.ok(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
          .some((f) => f.oid === stop.id && f.coid === stop.clientOrderId), "the submitted ID is already durable");
        await run(rt, ex);
        assert.equal(ex.positions.get(`${SYM}|${venueSide}`), qty, "a healthy attached stop does not freeze normal upkeep");
        assert.ok(ex.orders.some((o) => o.id === stop.id), "healthy protection is preserved");
        flushLiveKv(db); db.db.close();
        db = new CoreDb(":memory:", { statePath: path });
        db.journalPath = journal; db.replayJournal();
        rt = setup(db, mode);
        rt.paper.positions = [{ ...position(side), cfg: `follow|ema-12-26@m15|new-${side}`, entryT: 2 }];
        // This deliberately hides rows instead of deleting them: the actual venue still has both position and stop.
        ex.book = async () => ({ positions: [], orders: [] });
        const readStatus = ex.orderStatus.bind(ex);
        ex.orderStatus = async () => null;
        mock.timers.tick(7_200_000);
        await run(rt, ex);
        await run(rt, ex);
        assert.equal(ex.positions.get(`${SYM}|${venueSide}`), qty, "the physical position is not opened twice");
        assert.ok(ex.orders.some((o) => o.id === stop.id), "the original physical stop still rests");
        assert.equal(ex.log.filter((o) => o.type === "MARKET" && o.side === (side === 1 ? "BUY" : "SELL")).length, 1,
          "unknown status cannot admit a replacement parent even after suppression expires");
        // Simulate an independently closed position and a confirmed zero-fill cancellation of the exact old stop.
        ex.positions.delete(`${SYM}|${venueSide}`);
        assert.equal(await ex.cancel(SYM, stop.id), true);
        ex.orderStatus = readStatus;
        // Let the previously suppressed paper lane leave before presenting an actually new lane.
        rt.paper.positions = [];
        mock.timers.tick(6_000);
        await run(rt, ex);
        rt.paper.positions = [{ ...position(side), cfg: `follow|ema-24-48@m15|fresh-${side}`, entryT: Date.now() }];
        const reentry = await run(rt, ex);
        assert.ok((ex.positions.get(`${SYM}|${venueSide}`) ?? 0) > 0, `actual re-entry follows runtime-observed terminal evidence: ${JSON.stringify(reentry)}`);
        assert.equal(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
          .some((f) => f.oid === stop.id), false, "the previous identity was durably released");
      } finally {
        flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true });
      }
    });

  it("refuses a market parent before dispatch when its durable checkpoint is unavailable", async () => {
    const db = new CoreDb(":memory:", { statePath: "/dev/null/cts-orphan-state.json" });
    const rt = setup(db, "hedge"), ex = new SimExchange(rng(25));
    try {
      rt.paper.positions = [position(1)];
      await run(rt, ex);
      await run(rt, ex);
      assert.ok(db.lastStateError, "the configured storage failure is observable");
      assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 0, "neither attempt dispatches an unprotected parent");
      assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, 0, "no unjournaled conditional is dispatched");
    } finally { flushLiveKv(db); db.db.close(); }
  });

  it("uses the exact string orderID when the numeric acknowledgement is rounded", async () => {
    const db = new CoreDb(":memory:"), rt = setup(db, "hedge"), ex = new SimExchange(rng(46));
    const send = ex.order.bind(ex), exact = "9007199254740993";
    try {
      ex.order = async (p) => {
        const reply = await send(p);
        if (p.type !== "STOP_MARKET") return reply;
        const stop = ex.orders.find((o) => o.clientOrderId === p.clientOrderID);
        assert.ok(stop); stop.id = exact;
        return { order: { orderId: Number.MAX_SAFE_INTEGER + 1, orderID: exact } };
      };
      rt.paper.positions = [position(1)]; await run(rt, ex);
      const fences = Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {});
      assert.ok(fences.some((f) => f.oid === exact), "the string alias preserves the exact venue identity");
      assert.equal(fences.some((f) => f.oid === ""), false, "a usable exact string does not leave the ID unknown");
      await run(rt, ex);
      assert.ok(ex.positions.has(`${SYM}|LONG`) && ex.orders.some((o) => o.id === exact));
    } finally { flushLiveKv(db); db.db.close(); }
  });

  it("a conditional checkpoint failure aborts that submission even after a successful parent preflight", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-checkpoint-failure-"));
    const db = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
    const rt = setup(db, "hedge"), ex = new SimExchange(rng(26));
    const realOrder = ex.order.bind(ex), realFlush = db.flushState.bind(db);
    try {
      let parentFilled = false;
      ex.order = async (p) => {
        const out = await realOrder(p);
        if (p.type === "MARKET" && p.side === "BUY") parentFilled = true;
        return out;
      };
      db.flushState = () => {
        if (parentFilled) { db.lastStateError = "simulated checkpoint failure"; return false; }
        return realFlush();
      };
      rt.paper.positions = [position(1)];
      await run(rt, ex);
      await run(rt, ex);
      assert.equal(ex.log.filter((o) => o.type === "MARKET" && o.side === "BUY").length, 1);
      assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, 0,
        "the venue never receives the stop whose mandatory checkpoint failed");
    } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it("retains an unknown-ID conditional after a timeout and does not send another after restart", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const dir = mkdtempSync(join(tmpdir(), "cts-stop-timeout-")), path = join(dir, "state.json");
    let db = new CoreDb(":memory:", { statePath: path });
    const ex = new SimExchange(rng(27)), send = ex.order.bind(ex);
    try {
      let rt = setup(db, "hedge");
      ex.order = async (p) => {
        const reply = await send(p);
        if (p.type === "STOP_MARKET") throw new Error("transport timeout after accepted stop");
        return reply;
      };
      rt.paper.positions = [position(1)];
      await run(rt, ex);
      assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, 1);
      assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET"), "the timed-out stop really reached the venue");
      assert.ok((ex.positions.get(`${SYM}|LONG`) ?? 0) > 0, "an indeterminate initial stop does not speculatively close the parent");
      assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 1, "no protective market close on an unknown submission");
      assert.ok(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
        .some((f) => f.oid === "" && f.type === "STOP_MARKET"), "unknown ID remains durably reserved");
      flushLiveKv(db); db.db.close();
      db = new CoreDb(":memory:", { statePath: path });
      rt = setup(db, "hedge");
      rt.paper.positions = [position(1)];
      ex.book = async () => ({ positions: [], orders: [] });
      ex.orderStatus = async () => null;
      mock.timers.tick(7_200_000);
      await run(rt, ex);
      assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, 1, "the unknown accepted stop is not duplicated");
      assert.equal(ex.log.filter((o) => o.type === "MARKET" && o.side === "BUY").length, 1, "no replacement parent is admitted");
    } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  for (const mode of ["hedge", "oneway"] as const) for (const side of [1, -1] as const)
    it(`${mode} side ${side}: an accepted but timed-out repair is neither duplicated nor market-closed after restart`, async () => {
      mock.timers.enable({ apis: ["Date"], now: Date.now() });
      const dir = mkdtempSync(join(tmpdir(), "cts-repair-timeout-")), path = join(dir, "state.json");
      const journal = join(dir, "ledger.journal");
      let db = new CoreDb(":memory:", { statePath: path });
      db.journalPath = journal;
      const ex = mode === "hedge" ? new SimExchange(rng(35)) : new OneWayExchange(rng(35));
      const send = ex.order.bind(ex), book = ex.book.bind(ex);
      try {
        let rt = setup(db, mode);
        rt.paper.positions = [position(side)];
        await run(rt, ex);
        const venueSide = side === 1 ? "LONG" : "SHORT";
        const qty = ex.positions.get(`${SYM}|${venueSide}`);
        const initial = ex.orders.find((o) => o.type === "STOP_MARKET");
        assert.ok(qty && initial?.id);
        assert.equal(await ex.cancel(SYM, initial.id), true);
        let timedOutId = "";
        ex.order = async (p) => {
          const reply = await send(p);
          if (p.type === "STOP_MARKET") {
            timedOutId = String((reply as { order?: { orderId?: string } }).order?.orderId ?? "");
            throw new Error("accepted repair; acknowledgement timed out");
          }
          return reply;
        };
        mock.timers.tick(6_000);
        await run(rt, ex); // start exact cancellation confirmation without blocking unrelated parents
        await run(rt, ex); // the next fresh book allows repair after the confirmed terminal receipt
        assert.ok(timedOutId && ex.orders.some((o) => o.id === timedOutId), "the repair really exists on the venue");
        assert.equal(ex.positions.get(`${SYM}|${venueSide}`), qty, "the indeterminate repair did not trigger a market close");
        const sentAtTimeout = ex.log.length;
        assert.ok(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
          .some((f) => !f.oid && f.type === "STOP_MARKET"), "the ambiguous repair is durably reserved");
        ex.book = async () => { const b = await book(); return { ...b, orders: b.orders.filter((o) => o.id !== timedOutId) }; };
        ex.orderStatus = async () => null;
        mock.timers.tick(7_200_000);
        await run(rt, ex);
        assert.equal(ex.log.length, sentAtTimeout, "the next step sends neither another stop nor a speculative market close");
        flushLiveKv(db); db.db.close();
        db = new CoreDb(":memory:", { statePath: path }); db.journalPath = journal; db.replayJournal();
        rt = setup(db, mode); rt.paper.positions = [position(side)];
        await run(rt, ex);
        assert.equal(ex.log.length, sentAtTimeout, "restart preserves the same hold without a duplicate or market close");
        assert.equal(ex.positions.get(`${SYM}|${venueSide}`), qty);
        assert.ok(ex.orders.some((o) => o.id === timedOutId));
      } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
    });

  for (const mode of ["hedge", "oneway"] as const) for (const side of [1, -1] as const)
    it(`${mode}: a boolean stop-cancel acknowledgment cannot authorize a competing ${side === 1 ? "long" : "short"} replacement, even after restart`, async () => {
      mock.timers.enable({ apis: ["Date"], now: Date.now() });
      const dir = mkdtempSync(join(tmpdir(), "cts-reprice-unknown-")), path = join(dir, "state.json");
      const journal = join(dir, "ledger.journal");
      let db = new CoreDb(":memory:", { statePath: path }); db.journalPath = journal;
      const ex = mode === "hedge" ? new SimExchange(rng(58)) : new OneWayExchange(rng(58));
      const realCancel = ex.cancel.bind(ex), realBook = ex.book.bind(ex);
      try {
        let rt = setup(db, mode);
        rt.paper.positions = [position(side)]; await run(rt, ex);
        const old = ex.orders.find((o) => o.type === "STOP_MARKET");
        assert.ok(old?.id);
        const qty = ex.positions.get(`${SYM}|${side === 1 ? "LONG" : "SHORT"}`);
        const stopsBefore = ex.log.filter((o) => o.type === "STOP_MARKET").length;
        const marketsBefore = ex.log.filter((o) => o.type === "MARKET").length;
        let attempts = 0;
        // The venue acknowledges the cancel but the old order is in fact still executable.
        ex.cancel = async (sym, oid) => { if (oid === old.id) { attempts++; return true; } return realCancel(sym, oid); };
        ex.orderStatus = async () => null;
        rt.paper.positions = [{ ...position(side), stop: 17 * (1 - side * .08) }];
        await run(rt, ex);
        assert.ok(attempts > 0, "the old stop's cancellation was attempted");
        assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, stopsBefore,
          "a boolean acknowledgement cannot authorize another stop in the same step");
        assert.equal(ex.log.filter((o) => o.type === "MARKET").length, marketsBefore, "no speculative market close");
        assert.ok(ex.orders.some((o) => o.id === old.id), "the original physical stop is still retained");
        assert.ok(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
          .some((f) => f.oid === old.id && f.cancelPending), "cancel-pending is durable before the venue request");
        mock.timers.tick(61_000); await run(rt, ex); await run(rt, ex);
        assert.equal(attempts, 1, "a still-visible but cancelling stop is neither retried nor replaced");
        flushLiveKv(db); db.db.close();
        db = new CoreDb(":memory:", { statePath: path }); db.journalPath = journal; db.replayJournal();
        rt = setup(db, mode); rt.paper.positions = [{ ...position(side), stop: 17 * (1 - side * .08) }];
        mock.timers.tick(7_200_000); await run(rt, ex); await run(rt, ex);
        assert.equal(attempts, 1, "restart does not re-cancel the still-visible old stop");
        ex.book = async () => { const b = await realBook(); return { ...b, orders: b.orders.filter((o) => o.id !== old.id) }; };
        await run(rt, ex); await run(rt, ex);
        assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, stopsBefore, "no replacement after restart and omission");
        assert.equal(ex.log.filter((o) => o.type === "MARKET").length, marketsBefore);
        assert.equal(ex.positions.get(`${SYM}|${side === 1 ? "LONG" : "SHORT"}`), qty);
        assert.ok(ex.orders.some((o) => o.id === old.id));
      } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
    });

  for (const mode of ["hedge", "oneway"] as const) for (const side of [1, -1] as const)
    it(`${mode}: a ${side === 1 ? "long" : "short"} stop replacement resumes only after exact zero-fill terminal proof`, async () => {
      mock.timers.enable({ apis: ["Date"], now: Date.now() });
      const db = new CoreDb(":memory:"), rt = setup(db, mode);
      const ex = mode === "hedge" ? new SimExchange(rng(60)) : new OneWayExchange(rng(60));
      try {
        rt.paper.positions = [position(side)]; await run(rt, ex);
        const old = ex.orders.find((o) => o.type === "STOP_MARKET");
        assert.ok(old?.id);
        const initial = ex.log.filter((o) => o.type === "STOP_MARKET").length;
        rt.paper.positions = [{ ...position(side), stop: 17 * (1 - side * .08) }];
        await run(rt, ex);
        assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, initial,
          "successful cancel alone does not cause same-step replacement");
        assert.equal(ex.orders.some((o) => o.id === old.id), false, "the test venue really canceled the old stop");
        await run(rt, ex); // schedule exact terminal-status read
        await run(rt, ex); // consume that reply against a fresh book and repair
        assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, initial + 1,
          "a replacement is sent after the runtime observes exact zero-fill terminal status");
        assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET").length, 1);
      } finally { flushLiveKv(db); db.db.close(); }
    });

  it("a boolean take-profit cancel acknowledgment cannot authorize a competing target across restart", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const dir = mkdtempSync(join(tmpdir(), "cts-target-cancel-")), path = join(dir, "state.json");
    const journal = join(dir, "ledger.journal");
    let db = new CoreDb(":memory:", { statePath: path }); db.journalPath = journal;
    let rt = setup(db, "hedge");
    const ex = new SimExchange(rng(59)), realCancel = ex.cancel.bind(ex);
    try {
      rt.paper.positions = [{ ...position(1), target: 18 }]; await run(rt, ex);
      const old = ex.orders.find((o) => o.type === "TAKE_PROFIT_MARKET");
      assert.ok(old?.id);
      let attempts = 0;
      ex.cancel = async (sym, oid) => { if (oid === old.id) { attempts++; return true; } return realCancel(sym, oid); };
      ex.orderStatus = async () => null;
      const before = ex.log.length;
      rt.paper.positions = [{ ...position(1), target: 19 }];
      mock.timers.tick(61_000); await run(rt, ex);
      assert.equal(attempts, 1);
      await run(rt, ex); mock.timers.tick(61_000); await run(rt, ex);
      assert.equal(attempts, 1, "a visible pending cancellation is not repeated");
      flushLiveKv(db); db.db.close();
      db = new CoreDb(":memory:", { statePath: path }); db.journalPath = journal; db.replayJournal();
      rt = setup(db, "hedge"); rt.paper.positions = [{ ...position(1), target: 19 }];
      mock.timers.tick(61_000); await run(rt, ex); await run(rt, ex);
      assert.equal(attempts, 1, "restart preserves the pending cancellation");
      assert.equal(ex.log.slice(before).filter((o) => o.type === "TAKE_PROFIT_MARKET").length, 0,
        "no replacement target follows the ambiguous cancellation");
      assert.equal(ex.log.slice(before).filter((o) => o.type === "MARKET").length, 0);
      assert.ok(ex.orders.some((o) => o.id === old.id));
      assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET"), "the existing protective stop is kept");
    } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it("a terminal receipt does not clear a pending cancel while the same order remains visible", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const db = new CoreDb(":memory:"), rt = setup(db, "hedge"), ex = new SimExchange(rng(63));
    const realCancel = ex.cancel.bind(ex), realStatus = ex.orderStatus.bind(ex);
    try {
      rt.paper.positions = [position(1)]; await run(rt, ex);
      const old = ex.orders.find((o) => o.type === "STOP_MARKET"); assert.ok(old?.id);
      ex.cancel = async (_sym, id) => id === old.id; // acknowledgement with the old order still present
      ex.orderStatus = async (_sym, id) => ({ order: { orderId: id, status: "CANCELLED", executedQty: 0 } });
      rt.paper.positions = [{ ...position(1), stop: 17 * .92 }]; await run(rt, ex);
      await run(rt, ex); await run(rt, ex);
      assert.ok(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
        .some((f) => f.oid === old.id && f.cancelPending), "the visible order remains durably reserved");
      assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET").length, 1, "no duplicate after the terminal reply alone");
      assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 1, "no speculative market close");
      assert.equal(await realCancel(SYM, old.id), true); // the next book now genuinely omits that exact order
      ex.orderStatus = async () => null;
      mock.timers.tick(6_000); // the prior conflicting visible-book receipt is not reused
      await run(rt, ex); await run(rt, ex);
      assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET").length, 0,
        "an old contradictory receipt cannot authorize replacement when the new status is unavailable");
      assert.ok(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
        .some((f) => f.oid === old.id), "the old identity stays reserved");
      ex.orderStatus = realStatus; mock.timers.tick(6_000);
      await run(rt, ex); await run(rt, ex);
      assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET").length, 1, "a new exact terminal receipt and book agreement allow replacement");
      assert.equal(ex.orders.some((o) => o.id === old.id), false);
    } finally { flushLiveKv(db); db.db.close(); }
  });

  it("a typed pre-dispatch cancellation deferral releases only its pending marker and retries safely", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const dir = mkdtempSync(join(tmpdir(), "cts-cancel-defer-"));
    const db = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
    const rt = setup(db, "hedge"), ex = new SimExchange(rng(62)), realCancel = ex.cancel.bind(ex);
    try {
      rt.paper.positions = [position(1)]; await run(rt, ex);
      const old = ex.orders.find((o) => o.type === "STOP_MARKET"); assert.ok(old?.id);
      let attempts = 0, deferred = true;
      ex.cancel = async (sym, oid) => {
        attempts++;
        if (deferred) throw new RequestBudgetDeferred("request budget pause; cancellation was not dispatched");
        return realCancel(sym, oid);
      };
      rt.paper.positions = [{ ...position(1), stop: 17 * .92 }];
      await run(rt, ex);
      assert.equal(attempts, 1);
      assert.ok(ex.orders.some((o) => o.id === old.id), "the old stop was never canceled");
      assert.equal(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
        .some((f) => f.oid === old.id && f.cancelPending), false, "only the provably not-sent marker is rolled back");
      deferred = false; mock.timers.tick(61_000);
      await run(rt, ex); await run(rt, ex); await run(rt, ex);
      assert.equal(attempts, 2, "the cancellation retries on a later step");
      assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET").length, 1, "a proven cancellation permits exactly one replacement");
      assert.equal(ex.orders.some((o) => o.id === old.id), false);
    } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it("an unavailable cancellation checkpoint never dispatches the venue cancel", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-cancel-checkpoint-"));
    const db = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
    const rt = setup(db, "hedge"), ex = new SimExchange(rng(61));
    const realFlush = db.flushState.bind(db), realCancel = ex.cancel.bind(ex);
    try {
      rt.paper.positions = [position(1)]; await run(rt, ex);
      const old = ex.orders.find((o) => o.type === "STOP_MARKET"); assert.ok(old?.id);
      let attempts = 0;
      ex.cancel = async (sym, oid) => { attempts++; return realCancel(sym, oid); };
      db.flushState = () => { db.lastStateError = "simulated cancellation checkpoint failure"; return false; };
      rt.paper.positions = [{ ...position(1), stop: 17 * .92 }];
      await run(rt, ex);
      assert.equal(attempts, 0, "no cancel leaves before its durable identity is recorded");
      assert.ok(ex.orders.some((o) => o.id === old.id), "the previously held stop remains physically present");
      assert.equal(ex.log.filter((o) => o.type === "STOP_MARKET").length, 1, "no competing replacement was sent");
      db.flushState = realFlush;
    } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it("an exact positive fill remains held until its original parent and accounting are reconciled", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const db = new CoreDb(":memory:"), rt = setup(db, "hedge"), ex = new SimExchange(rng(45));
    try {
      rt.paper.positions = [position(1)]; await run(rt, ex);
      const stop = ex.orders.find((o) => o.type === "STOP_MARKET");
      assert.ok(stop?.id);
      ex.triggerOrder(stop.id);
      assert.equal(ex.positions.size, 0, "the original stop really filled");
      const receipt = await ex.orderStatus(SYM, stop.id);
      assert.ok(receipt && typeof receipt === "object" && "order" in receipt);
      assert.ok(receipt.order && typeof receipt.order === "object" && "status" in receipt.order && "executedQty" in receipt.order);
      assert.equal(receipt.order.status, "FILLED");
      assert.ok(typeof receipt.order.executedQty === "number" && receipt.order.executedQty > 0);
      mock.timers.tick(20_000); await run(rt, ex); await run(rt, ex);
      rt.paper.positions = [{ ...position(1), cfg: "follow|ema-24-48@m15|fresh", entryT: 2 }];
      mock.timers.tick(7_200_000); await run(rt, ex); await run(rt, ex);
      assert.equal(ex.positions.size, 0, "positive fills are not misclassified as zero-fill cancellation");
      assert.ok(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {}).some((f) => f.oid === stop.id),
        "exact fill attribution remains an explicit reconciliation hold");
    } finally { flushLiveKv(db); db.db.close(); }
  });

  it("a hanging orphan status lookup cannot delay another parent's own close", async () => {
    const db = new CoreDb(":memory:"), rt = setup(db, "hedge"), ex = new SimExchange(rng(29));
    const book = ex.book.bind(ex), orderStatus = ex.orderStatus.bind(ex);
    try {
      rt.paper.positions = [position(1), { ...position(1), sym: "S2-USDT", entry: 24, stop: 23 }];
      await run(rt, ex);
      assert.ok(ex.positions.has("S1-USDT|LONG") && ex.positions.has("S2-USDT|LONG"));
      const stop = ex.orders.find((o) => o.venueSymbol === SYM && o.type === "STOP_MARKET");
      assert.ok(stop?.id);
      ex.book = async () => { const b = await book(); return { ...b, orders: b.orders.filter((o) => o.id !== stop.id) }; };
      ex.orderStatus = async (sym, id) => sym === SYM ? new Promise(() => {}) : orderStatus(sym, id);
      rt.paper.positions = [position(1)]; // S2's original parent ended normally
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const result = await Promise.race([
        run(rt, ex).then(() => "done"),
        new Promise<string>((resolve) => { timeout = setTimeout(() => resolve("hung"), 300); }),
      ]);
      if (timeout) clearTimeout(timeout);
      assert.equal(result, "done", "one unavailable venue status does not block the control step");
      assert.equal(ex.positions.has("S2-USDT|LONG"), false, "the unrelated parent's own close still runs");
      assert.ok(ex.positions.has("S1-USDT|LONG") && ex.orders.some((o) => o.id === stop.id),
        "the unresolved side and its real stop stay untouched");
    } finally { flushLiveKv(db); db.db.close(); }
  });

  it("bounded status polling rotates beyond eight unresolved identities", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const db = new CoreDb(":memory:"), rt = setup(db, "hedge"), ex = new SimExchange(rng(30));
    try {
      const ids: string[] = [];
      for (let i = 0; i < 12; i++) {
        const reply = await ex.order({ symbol: SYM, positionSide: "LONG", side: "SELL", type: "STOP_MARKET",
          quantity: 1, stopPrice: 16, clientOrderID: makeCoid(rt.settings.live.connId, "S") }) as { order: { orderId: string } };
        ids.push(reply.order.orderId);
      }
      await run(rt, ex); // record every physically visible unlinked identity
      assert.equal(Object.keys(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {}).length, 12);
      assert.equal(await ex.cancel(SYM, ids[11]), true); // only the twelfth order has a terminal-zero receipt
      const actualStatus = ex.orderStatus.bind(ex), checked: string[] = [];
      ex.book = async () => ({ positions: [], orders: [] }); // the other 11 still physically exist
      ex.orderStatus = async (sym, id) => { checked.push(id); return id === ids[11] ? actualStatus(sym, id) : null; };
      await run(rt, ex); await run(rt, ex); await run(rt, ex);
      assert.ok(checked.includes(ids[11]), "the first eight unknowns do not starve the twelfth");
      const fences = Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {});
      assert.equal(fences.some((f) => f.oid === ids[11]), false, "only the confirmed identity is released");
      assert.equal(fences.length, 11);
      assert.equal(ex.orders.length, 11, "unknown identities remain physically untouched");
    } finally { flushLiveKv(db); db.db.close(); }
  });

  it("a late receipt from a changed connection cannot clear the original account's reservation", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const db = new CoreDb(":memory:"), rt = setup(db, "hedge"), ex = new SimExchange(rng(31));
    try {
      const coid = makeCoid(rt.settings.live.connId, "S");
      const reply = await ex.order({ symbol: SYM, positionSide: "LONG", side: "SELL", type: "STOP_MARKET",
        quantity: 1, stopPrice: 16, clientOrderID: coid }) as { order: { orderId: string } };
      const oid = reply.order.orderId;
      await run(rt, ex);
      ex.book = async () => ({ positions: [], orders: [] });
      let resolveStatus: ((x: unknown) => void) | undefined;
      ex.orderStatus = async () => new Promise<unknown>((resolve) => { resolveStatus = resolve; });
      await run(rt, ex);
      assert.ok(resolveStatus, "the old account's exact lookup started");
      const originalKey = ex.key;
      ex.key = "different-account";
      resolveStatus({ order: { orderId: oid, status: "CANCELLED", executedQty: 0 } });
      await new Promise<void>((resolve) => setImmediate(resolve));
      ex.orderStatus = async () => null;
      ex.key = originalKey;
      rt.paper.positions = [position(1)];
      await run(rt, ex);
      assert.equal(ex.positions.size, 0, "late account-A data observed after switching away is not used for re-entry");
      assert.ok(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {}).some((f) => f.oid === oid));
    } finally { flushLiveKv(db); db.db.close(); }
  });

  it("a definitive rejection clears only the rejected pre-submission reservation", async () => {
    const db = new CoreDb(":memory:"), rt = setup(db, "hedge"), ex = new SimExchange(rng(28));
    const send = ex.order.bind(ex);
    try {
      ex.order = async (p) => {
        if (p.type === "STOP_MARKET") throw new ExchangeRejected("definitive refusal");
        return send(p);
      };
      rt.paper.positions = [position(1)];
      await run(rt, ex);
      assert.equal(Object.values(db.kvGet<Record<string, OrphanExitFence>>("orphanExitFences") ?? {})
        .some((f) => f.type === "STOP_MARKET"), false, "a definite refusal cannot have created a stop");
      assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET").length, 0);
    } finally { flushLiveKv(db); db.db.close(); }
  });

  it("captures an unlinked exit while a foreign position exists, before both disappear", async () => {
    const db = new CoreDb(":memory:");
    const rt = setup(db, "hedge"), ex = new SimExchange(rng(4));
    try {
      ex.positions.set(`${SYM}|LONG`, 3);
      const coid = makeCoid(rt.settings.live.connId, "S");
      const reply = await ex.order({ symbol: SYM, positionSide: "LONG", side: "SELL", type: "STOP_MARKET",
        quantity: 1, stopPrice: 16, clientOrderID: coid }) as { order: { orderId: string } };
      rt.paper.positions = [position(1)];
      await run(rt, ex);
      assert.equal(Object.keys(db.kvGet<Record<string, unknown>>("orphanExitFences") ?? {}).length, 1,
        "the unexplained exit is recorded while the position is visible");
      ex.positions.delete(`${SYM}|LONG`);
      ex.orders = ex.orders.filter((o) => o.id !== reply.order.orderId);
      ex.orderStatus = async () => null;
      await run(rt, ex);
      assert.equal(ex.positions.size, 0, "the pair of missing rows does not authorize a new parent");
      assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 0);
    } finally { flushLiveKv(db); db.db.close(); }
  });
});
