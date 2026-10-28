import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { laneKeyOf } from "../live-record.ts";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { liveKv, resetLiveBackoff, stepLive, type ControlStatus } from "./live.server.ts";
import { makeCoid } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
const SYM = "S0-USDT";
const cfgA = "follow|sig-ema-cross-a@m5|tp1|sl1|tr0|h32";
const cfgB = "follow|sig-ema-cross-b@m5|tp1|sl1|tr0|h32";
const pos = (cfg: string, side: 1 | -1) => ({ ...lane(cfg, SYM, side, 10), entryT: 123 });
const setup = () => {
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { foreignSides: "independent", positionMode: "hedge", laneOrders: false,
    notionalUsd: 10, maxPositions: 0, maxNotionalUsd: 0, rebalancePct: 0, minFreeMargin: 0,
    maxPositionX: 0, maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, maxChase: 0 });
  const ex = new SimExchange().withEquity(100);
  const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
  return { rt, ex, step };
};
afterEach(() => resetLiveBackoff());

for (const sizing of ["min", "risk", "lanes"] as const) for (const side of [1, -1] as const) {
  it(`independent hedge ${sizing}, side ${side}: foreign quantity fences every new parent until flat`, async () => {
    const { rt, ex, step } = setup();
    rt.settings.live.positionSize = sizing;
    const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`;
    ex.positions.set(key, 5);
    const manualStop = `manual-stop-${side}`;
    ex.orders.push({ id: manualStop, venueSymbol: SYM, symbol: SYM, positionSide: side === 1 ? "LONG" : "SHORT",
      type: "STOP_MARKET", stopPrice: side === 1 ? 9 : 11, qty: 5, clientOrderId: `foreign-${side}` });
    const first = pos(cfgA, side), sibling = pos(cfgB, side);
    rt.paper.positions = [first];
    await step();
    assert.equal(ex.positions.get(key), 5, "foreign quantity is untouched");
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 0, "no first parent enters a netted foreign side");
    assert.deepEqual(ex.orders.map((o) => o.id), [manualStop], "the existing foreign protective order stays untouched");
    rt.paper.positions = [first, sibling];
    await step();
    assert.equal(ex.positions.get(key), 5);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 0, "a sibling cannot bypass the same fence");
    // The foreign operator closes their position; only then can a parent open.
    ex.positions.delete(key);
    ex.orders = ex.orders.filter((o) => o.id !== manualStop); // operator cancels their own stop
    rt.paper.positions = [first];
    await step();
    await step();
    const own = ex.positions.get(key) ?? 0;
    assert.ok(own > 0, "the now-empty side can admit its own parent");
    const orders = ex.orders.filter((o) => o.venueSymbol === SYM);
    assert.ok(orders.some((o) => o.type === "STOP_MARKET"));
    assert.ok(orders.every((o) => !o.closePosition && (o.qty ?? Infinity) <= own + 1e-9), "native exits remain bounded");
    const markets = ex.log.filter((o) => o.type === "MARKET").length;
    rt.paper.positions = [first, sibling];
    await step();
    assert.equal(ex.positions.get(key), own, "another parent cannot share the occupied side");
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, markets);
    rt.paper.positions = [];
    await step();
    assert.ok(Math.abs(ex.positions.get(key) ?? 0) < 1e-9, "own parent closes without any foreign quantity to adopt");
  });
}

for (const side of [1, -1] as const) {
  it(`independent hedge side ${side}: opposite foreign side and its stop survive the owned lane`, async () => {
    const { rt, ex, step } = setup();
    const ownKey = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`;
    const foreignKey = `${SYM}|${side === 1 ? "SHORT" : "LONG"}`;
    const foreignPs = side === 1 ? "SHORT" : "LONG";
    ex.positions.set(foreignKey, 5);
    const manualStop = `opposite-manual-${side}`;
    ex.orders.push({ id: manualStop, venueSymbol: SYM, symbol: SYM, positionSide: foreignPs,
      type: "STOP_MARKET", stopPrice: side === 1 ? 11 : 9, qty: 5, clientOrderId: `foreign-opposite-${side}` });
    rt.paper.positions = [pos(cfgA, side)];
    await step();
    const own = ex.positions.get(ownKey) ?? 0;
    assert.ok(own > 0, "the flat opposite hedge side remains eligible");
    assert.equal(ex.positions.get(foreignKey), 5);
    assert.ok(ex.orders.some((o) => o.id === manualStop && o.qty === 5), "the foreign stop stays in place");
    const ownStops = ex.orders.filter((o) => o.venueSymbol === SYM && o.positionSide !== foreignPs && o.type === "STOP_MARKET");
    assert.ok(ownStops.length > 0 && ownStops.every((o) => !o.closePosition && (o.qty ?? Infinity) <= own + 1e-9), "owned protection is bounded");
    rt.paper.positions = [];
    await step();
    assert.equal(ex.positions.get(foreignKey), 5, "closing our lane leaves the foreign position");
    assert.ok(ex.orders.some((o) => o.id === manualStop && o.qty === 5), "closing our lane leaves the foreign stop");
  });
}

for (const side of [1, -1] as const) {
  it(`independent hedge side ${side}: an own resting order without an own fill remains unknown`, async () => {
    const { rt, ex, step } = setup();
    const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`;
    ex.positions.set(key, 5);
    await ex.order({ symbol: SYM, positionSide: side === 1 ? "LONG" : "SHORT", side: side === 1 ? "SELL" : "BUY",
      type: "STOP_MARKET", quantity: 0.2, stopPrice: side === 1 ? 9 : 11, clientOrderID: makeCoid(rt.settings.live.connId, "S") });
    rt.paper.positions = [pos(cfgA, side)];
    await step();
    assert.equal(ex.positions.get(key), 5);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 0, "an unverified position cannot be adopted or duplicated");
  });

  it(`independent hedge side ${side}: an old tracked parent without an owned fill remains unknown`, async () => {
    const { rt, ex, step } = setup();
    const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`;
    ex.positions.set(key, 5);
    const first = pos(cfgA, side);
    const id = laneKeyOf({ id: `${first.cfg}|${first.sym}|${first.side}|${first.entryT}`,
      cfg: first.cfg, sym: first.sym, side: first.side });
    rt.db.kvSet("liveLaneOpen", { [id]: { cfg: first.cfg, sym: first.sym, side: first.side, t: 123, px: 10 } });
    rt.paper.positions = [first, pos(cfgB, side)];
    await step();
    assert.equal(ex.positions.get(key), 5);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 0);
    assert.ok(liveKv<ControlStatus>(rt.db, "controlStatus")?.keys?.some((x) => x.key === `${SYM}|${side}`));
  });

  it(`independent hedge side ${side}: a stale order book cannot classify the side as foreign-only`, async () => {
    const { rt, ex, step } = setup();
    const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`;
    ex.positions.set(key, 5);
    const book = ex.book.bind(ex);
    ex.book = async () => ({ ...await book(), ordersAt: Date.now() - 1_000 });
    rt.paper.positions = [pos(cfgA, side)];
    await step();
    assert.equal(ex.positions.get(key), 5);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 0);
  });

  it(`independent hedge side ${side}: a pending own entry reserves the side beside manual quantity`, async () => {
    const { rt, ex, step } = setup();
    const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`;
    const send = ex.order.bind(ex);
    let attempts = 0;
    ex.order = async (p) => {
      if (p.type === "MARKET" && p.side === (side === 1 ? "BUY" : "SELL")) {
        attempts++;
        return { order: { orderId: "pending-entry", status: "NEW", executedQty: 0 } };
      }
      return send(p);
    };
    const first = pos(cfgA, side);
    rt.paper.positions = [first];
    await step();
    assert.equal(attempts, 1);
    ex.positions.set(key, 5); // a manual position appears while the own order is still unresolved
    rt.paper.positions = [first, pos(cfgB, side)];
    await step();
    assert.equal(attempts, 1, "no sibling can enter while ownership is pending");
    assert.equal(ex.positions.get(key), 5);
  });
}
