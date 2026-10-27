import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { reconcilePendingConditionals, stepLive } from "./live.server.ts";
import { makeCoid } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { fakeRt, rng, SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";

type Kind = "S" | "T";
type Side = 1 | -1;

function fixture(kind: Kind = "S", side: Side = 1) {
  const ex = new SimExchange(rng(1));
  const { rt } = fakeRt(new CoreDb(":memory:"));
  const sym = "S1-USDT";
  const coid = makeCoid(rt.settings.live.connId, kind);
  const positionSide = side === 1 ? "LONG" : "SHORT";
  const type = kind === "S" ? "STOP_MARKET" : "TAKE_PROFIT_MARKET";
  const at = Date.now();
  rt.db.runDurable(
    "INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    coid, `control|${sym}|${side}`, sym, side, kind, 0.5, 16, "pending", "re-sized", at,
  );
  const row = (id = coid) => {
    const found = rt.db.get<{ status: string; qty: number }>(
      "SELECT status,qty FROM live_orders WHERE coid=?", id,
    );
    return found && { status: found.status, qty: found.qty };
  };
  const reconcile = async (alive?: () => boolean) => reconcilePendingConditionals(
    rt as unknown as CoreRuntime, ex, await ex.book(), alive,
  );
  const history = (overrides: Record<string, unknown> = {}) => ({
    symbol: sym, positionSide, side: side === 1 ? "SELL" : "BUY", type, clientOrderId: coid, status: "CANCELLED", executedQty: 0,
    updateTime: at, ...overrides,
  });
  const place = async () => ex.order({
    symbol: sym, positionSide, type, side: side === 1 ? "SELL" : "BUY", quantity: 0.5,
    stopPrice: 16, clientOrderID: coid,
  });
  return { rt, ex, sym, coid, row, reconcile, history, place, at };
}

describe("uncertain conditional-order reconciliation", () => {
  for (const kind of ["S", "T"] as const) for (const side of [1, -1] as const) {
    it(`${kind} ${side}: an exact resting order does not prove zero execution`, async () => {
      const f = fixture(kind, side);
      await f.place();
      assert.equal(await f.reconcile(), 0);
      assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
    });

    it(`${kind} ${side}: an exact zero-fill cancellation clears a pending order`, async () => {
      const f = fixture(kind, side);
      await f.place();
      const order = f.ex.orders[0];
      assert.ok(order);
      assert.equal(await f.ex.cancel(f.sym, order.id), true);
      assert.equal(await f.reconcile(), 1);
      assert.deepEqual(f.row(), { status: "gone", qty: 0 });
    });

    it(`${kind} ${side}: one-way cancellation requires exact BOTH position-side evidence`, async () => {
      const f = fixture(kind, side);
      f.rt.settings.live = { ...f.rt.settings.live, positionMode: "oneway" };
      f.ex.history.push(f.history({ positionSide: "BOTH" }));
      assert.equal(await f.reconcile(), 1);
      assert.deepEqual(f.row(), { status: "gone", qty: 0 });
    });
  }

  for (const [name, change] of [
    ["a different client order ID", { clientOrderId: "another-id" }],
    ["a different symbol", { symbol: "S2-USDT" }],
    ["the opposite position side", { positionSide: "SHORT" }],
    ["the wrong close action", { side: "BUY" }],
    ["a missing close action", { side: undefined }],
    ["a different conditional type", { type: "TAKE_PROFIT_MARKET" }],
    ["a filled order", { status: "FILLED", executedQty: 0.5 }],
    ["a partially executed cancellation", { executedQty: 0.1 }],
    ["a cancellation without an executed quantity", { executedQty: undefined }],
  ] as const) {
    it(`keeps an uncertain stop pending for ${name}`, async () => {
      const f = fixture();
      f.ex.history.push(f.history(change));
      assert.equal(await f.reconcile(), 0);
      assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
    });
  }

  it("keeps contradictory snapshots with the same timestamp pending", async () => {
    const f = fixture();
    f.ex.history.push(f.history(), f.history({ status: "FILLED", executedQty: 0.5 }));
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("checks every same-time snapshot, including a conflicting third row", async () => {
    const f = fixture();
    f.ex.history.push(f.history(), f.history(), f.history({ status: "NEW" }));
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("keeps same-time snapshots with conflicting cumulative-fill aliases pending", async () => {
    const f = fixture();
    f.ex.history.push(
      f.history({ executedQty: undefined, cumExecQty: 0 }),
      f.history({ executedQty: undefined, cumExecQty: 0.5 }),
    );
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("keeps a later zero cancellation pending after an earlier positive cumulative fill", async () => {
    const f = fixture();
    f.ex.history.push(
      f.history({ status: "PARTIALLY_FILLED", executedQty: 0.25, updateTime: f.at }),
      f.history({ executedQty: 0, updateTime: f.at + 1 }),
    );
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("keeps a later zero cancellation pending if an earlier row has conflicting fill fields", async () => {
    const f = fixture();
    f.ex.history.push(
      f.history({ status: "PARTIALLY_FILLED", executedQty: 0, cumExecQty: 0.25, updateTime: f.at }),
      f.history({ executedQty: 0, updateTime: f.at + 1 }),
    );
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("keeps a same-coid cancellation with conflicting position-side evidence pending", async () => {
    const f = fixture();
    f.ex.history.push(f.history(), f.history({ positionSide: "SHORT", status: "FILLED", executedQty: 0.5 }));
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("does not attribute a one-way BUY cancellation to a long protective SELL", async () => {
    const f = fixture();
    f.rt.settings.live = { ...f.rt.settings.live, positionMode: "oneway" };
    f.ex.history.push(f.history({ positionSide: "BOTH", side: "BUY" }));
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("does not attribute a one-way SELL cancellation to a short protective BUY", async () => {
    const f = fixture("T", -1);
    f.rt.settings.live = { ...f.rt.settings.live, positionMode: "oneway" };
    f.ex.history.push(f.history({ positionSide: "BOTH", side: "SELL" }));
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("does not resolve an order from a stale book", async () => {
    const f = fixture();
    await f.place();
    const book = { ...await f.ex.book(), ordersAt: Date.now() };
    assert.equal(await reconcilePendingConditionals(f.rt as unknown as CoreRuntime, f.ex, book), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("keeps conflicting fresh-book and cancellation evidence pending", async () => {
    const f = fixture();
    await f.place();
    f.ex.history.push(f.history());
    assert.equal(await f.reconcile(), 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("can use explicit terminal history while disregarding an old book", async () => {
    const f = fixture();
    await f.place();
    const book = { ...await f.ex.book(), ordersAt: Date.now() };
    f.ex.history.push(f.history());
    assert.equal(await reconcilePendingConditionals(f.rt as unknown as CoreRuntime, f.ex, book), 1);
    assert.deepEqual(f.row(), { status: "gone", qty: 0 });
  });

  it("does not write history evidence after its runtime generation is no longer current", async () => {
    const f = fixture();
    let finish!: (value: { orders: Array<Record<string, unknown>> }) => void;
    f.ex.ordersSince = async () => new Promise((resolve) => { finish = resolve; });
    let alive = true;
    const pending = f.reconcile(() => alive);
    // Wait until the book read has completed and the background history request is actually pending.
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(typeof finish, "function");
    alive = false;
    finish({ orders: [f.history()] });
    assert.equal(await pending, 0);
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("leaves a timed-out history read pending even if the reply arrives later", { timeout: 3_000 }, async () => {
    const f = fixture();
    let finish!: (value: { orders: Array<Record<string, unknown>> }) => void;
    f.ex.ordersSince = async () => new Promise((resolve) => { finish = resolve; });
    assert.equal(await f.reconcile(), 0);
    assert.equal(typeof finish, "function");
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
    finish({ orders: [f.history()] });
    await Promise.resolve();
    assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
  });

  it("does not delay the control step while conditional history is unavailable", { timeout: 3_000 }, async () => {
    const f = fixture();
    f.rt.paper.positions = [{ cfg: "protected-owner", sym: f.sym, side: 1, entry: 17, stop: 16.5, vol: 1, entryT: 1 }];
    let finish!: (value: { orders: Array<Record<string, unknown>> }) => void;
    f.ex.ordersSince = async () => new Promise((resolve) => { finish = resolve; });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        stepLive(f.rt as unknown as CoreRuntime, [], 1, f.ex),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("control waited for conditional history")), 500);
        }),
      ]);
      assert.equal(result.error, null);
      assert.equal(typeof finish, "function", "the background history read began");
      assert.ok((f.ex.positions.get(`${f.sym}|LONG`) ?? 0) > 0, "the live entry completed");
      assert.ok(f.ex.orders.some((o) => o.venueSymbol === f.sym && o.positionSide === "LONG" && o.type === "STOP_MARKET"),
        "the live entry retained its protective stop");
      assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
    } finally {
      if (timer) clearTimeout(timer);
      if (finish) finish({ orders: [] });
    }
  });

  it("does not poll an unresolved conditional again on every control tick", async () => {
    const f = fixture();
    let reads = 0;
    f.ex.ordersSince = async () => { reads++; return { orders: [] }; };
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    try {
      for (let i = 0; i < 10; i++) {
        const result = await stepLive(f.rt as unknown as CoreRuntime, [], 1, f.ex);
        assert.equal(result.error, null);
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      assert.equal(reads, 1, `history queried ${reads} times without the clock advancing`);
      assert.deepEqual(f.row(), { status: "pending", qty: 0.5 });
      mock.timers.tick(5_000);
      const retried = await stepLive(f.rt as unknown as CoreRuntime, [], 1, f.ex);
      assert.equal(retried.error, null);
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.equal(reads, 2, "the unresolved order is retried after the polling interval");
    } finally {
      mock.timers.reset();
    }
  });

  it("eventually checks later orders when the first four remain unknown", async () => {
    const f = fixture();
    const more: string[] = [];
    for (let i = 0; i < 4; i++) {
      const id = makeCoid(f.rt.settings.live.connId, "S");
      more.push(id);
      f.rt.db.runDurable(
        "INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        id, `control|${f.sym}|1`, f.sym, 1, "S", 0.5, 16, "pending", "re-sized", f.at + i + 1,
      );
    }
    f.ex.history.push(f.history({ clientOrderId: more[3] }));
    for (let i = 0; i < 3; i++) await f.reconcile();
    assert.deepEqual(f.row(more[3]), { status: "gone", qty: 0 });
    for (const id of [f.coid, ...more.slice(0, 3)])
      assert.deepEqual(f.row(id), { status: "pending", qty: 0.5 });
  });
});
