import assert from "node:assert/strict";
import { afterEach, it, mock } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { laneKeyOf, type LaneOpen } from "../live-record.ts";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { CoreDb } from "./db.server.ts";
import { isolateNewParents } from "./live-parent-isolation.ts";
import { nativeProcessedRevision } from "./processed-stage-adapter.ts";
import { DEFAULT_POSITION_WINDOWS } from "../position-windows.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive, type ControlStatus } from "./live.server.ts";
import { makeCoid, type ControlContribution } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
const A = "follow|sig-ema-cross-a@m5|tp1|sl1|tr0|h32";
const B = "follow|sig-ema-cross-b@m5|tp1|sl1|tr0|h32";
const SYM = "S0-USDT";
const pos = (cfg: string, side: 1 | -1) => ({ ...lane(cfg, SYM, side, 10), entryT: 123 });
const setup = (db = new CoreDb(":memory:")) => {
  const { rt } = fakeRt(db);
  Object.assign(rt.settings.live, { notionalUsd: 10, maxPositions: 0, rebalancePct: 0, ratio: 1, top: 0,
    minFreeMargin: 0, maxPositionX: 0, maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, maxChase: 0 });
  const ex = new SimExchange().withEquity(100);
  return { rt, ex, step: () => stepLive(rt as unknown as CoreRuntime, [], 1, ex) };
};
afterEach(() => resetLiveBackoff());

it("the pure selector folds Block legs, retains tracked parents, and never guesses an anonymous one", () => {
  const l = (cfg: string, side: 1 | -1, id = `${cfg}|${SYM}|123`): ControlContribution =>
    ({ cfg, id, sym: SYM, side, sl: .04, vol: 1 });
  const parent = l(A, 1), leg = { ...parent, id: `${parent.id}|blk:overall` }, other = l(B, 1);
  const id = laneKeyOf({ ...parent, id: parent.id! });
  const tracked: Record<string, LaneOpen> = { [id]: { cfg: A, sym: SYM, side: 1, t: 1, px: 10 } };
  const out = isolateNewParents([parent, leg, other], { aggregate: true, oneway: false,
    occupied: new Set([`${SYM}|1`]), tracked });
  assert.deepEqual(out.lanes.map((x) => x.id), [parent.id, leg.id]);
  assert.equal(out.blocked.length, 1);
  const otherId = laneKeyOf({ ...other, id: other.id! });
  const legacy = isolateNewParents([parent, other], { aggregate: true, oneway: false,
    occupied: new Set([`${SYM}|1`]), tracked: { ...tracked,
      [otherId]: { cfg: B, sym: SYM, side: 1, t: 1, px: 10 } } });
  assert.equal(legacy.lanes.length, 2, "previously tracked holdings keep their existing control path");
  assert.ok(legacy.ambiguous.has(`${SYM}|1`), "existing mixed-parent quantities are explicitly unverified");
  const anon = isolateNewParents([{ ...other, id: undefined }], { aggregate: true, oneway: false,
    occupied: new Set([`${SYM}|1`]), tracked: {} });
  assert.equal(anon.lanes.length, 0);
  assert.ok(anon.unknown.has(`${SYM}|1`));
  const simultaneous = isolateNewParents([parent, l(B, -1)], { aggregate: false, oneway: true,
    occupied: new Set(), tracked: {} });
  assert.equal(simultaneous.lanes.length, 0);
  assert.equal(simultaneous.blocked.length, 2);
  assert.match(simultaneous.blocked[0].why, /simultaneous opposite parents/);
});

it("processed mode rejects a non-active venue parent and persists active stage evidence through its close", async () => {
  const { rt, ex, step } = setup();
  Object.assign(rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
  const windows = { validationN: 2, realN: 2 };
  const main = { long: 2, short: 1, minimal: 1, shortPolarity: "negative", minimalPolarity: "positive" } as const;
  Object.assign(rt, { wf: { processedStages: windows, gates: {
    positionWindows: { ...DEFAULT_POSITION_WINDOWS, blocks: { main } },
  } } });
  const policy = nativeProcessedRevision({ ...windows, blocks: { validation: main } }, rt.settings.cost);
  const unsignedPolicy = nativeProcessedRevision(windows, rt.settings.cost);
  try {
    rt.paper.positions = [{ ...pos(A, 1), processedStage: "validated", processedPolicy: policy }];
    await step();
    assert.equal(ex.log.filter((row) => row.type === "MARKET").length, 0);
    const rejectedControl = liveKv<ControlStatus>(rt.db, "controlStatus")!;
    assert.ok(rejectedControl.actions.some((row) => /processed-stage identity/.test(row.msg ?? "")), JSON.stringify(rejectedControl.actions));

    rt.paper.positions = [{ ...pos(A, 1), processedStage: "active", processedPolicy: unsignedPolicy }];
    await step();
    const staleControl = liveKv<ControlStatus>(rt.db, "controlStatus")!;
    assert.ok(staleControl.actions.some((row) => /processed-stage identity/.test(row.msg ?? "")), JSON.stringify(staleControl.actions));
    assert.equal(ex.log.filter((row) => row.type === "MARKET").length, 0);

    rt.paper.positions = [{ ...pos(A, 1), processedStage: "active", processedPolicy: policy }];
    await step();
    const open = Object.values(liveKv<Record<string, LaneOpen>>(rt.db, "liveLaneOpen") ?? {});
    assert.equal(open.length, 1);
    assert.equal(open[0].processedStage, "active");
    assert.equal(open[0].processedPolicy, policy);

    rt.paper.positions = [];
    await step();
    // relation: all rows — the isolated fixture reads back the sole row it wrote.
    const closed = rt.db.get<{ processed_stage: string; processed_policy: string }>(
      "SELECT processed_stage,processed_policy FROM live_lane_trades WHERE cfg=?",
      A,
    );
    assert.equal(closed?.processed_stage, "active");
    assert.equal(closed?.processed_policy, policy);
  } finally {
    flushLiveKv(rt.db);
    rt.db.db.close();
  }
});

it("a pending processed venue request keeps its exact active policy across restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-processed-venue-parent-"));
  const path = join(dir, "core.sqlite");
  const { rt, ex, step } = setup(new CoreDb(path));
  Object.assign(rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
  (rt as unknown as { wf: { processedStages: { validationN: number; realN: number } } }).wf = {
    processedStages: { validationN: 2, realN: 2 },
  };
  const policy = nativeProcessedRevision({ validationN: 2, realN: 2 }, rt.settings.cost);
  const place = ex.order.bind(ex);
  ex.order = async (request) => request.type === "MARKET" && request.reduceOnly !== "true"
    ? { order: { orderId: "pending-processed", status: "NEW", executedQty: 0 } }
    : place(request);
  try {
    rt.paper.positions = [{ ...pos(A, 1), processedStage: "active", processedPolicy: policy }];
    await step();
    flushLiveKv(rt.db);
    rt.db.db.close();

    const reopened = new CoreDb(path);
    const allocations = liveKv<Record<string, { parents: Array<{ processedStage?: string; processedPolicy?: string }> }>>(
      reopened,
      "liveEntryParents",
    ) ?? {};
    const parent = Object.values(allocations)[0]?.parents[0];
    assert.equal(parent?.processedStage, "active");
    assert.equal(parent?.processedPolicy, policy);
    reopened.db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const side of [1, -1] as const) for (const terminal of ["FILLED", "CANCELLED"] as const) it(`a partially filled processed entry retains its exact request parent until ${terminal} reconciliation, side ${side}`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-processed-partial-parent-")), path = join(dir, "core.sqlite");
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const databases: CoreDb[] = [];
  const make = () => {
    const fixture = setup(new CoreDb(path)); databases.push(fixture.rt.db);
    Object.assign(fixture.rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
    (fixture.rt as unknown as { wf: { processedStages: { validationN: number; realN: number } } }).wf = { processedStages: { validationN: 2, realN: 2 } };
    return fixture.rt;
  };
  let rt = make();
  const ex = new SimExchange().withEquity(100), key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`;
  ex.px.set(SYM, 10);
  const policy = nativeProcessedRevision({ validationN: 2, realN: 2 }, rt.settings.cost);
  const parent = { ...pos(A, side), processedStage: "active" as const, processedPolicy: policy };
  const place = ex.order.bind(ex), status = ex.orderStatus.bind(ex);
  let phase: "partial" | "stale" | "full" = "partial", requested = 0, partial = 0, entryCoid = "";
  ex.order = async request => {
    const into = side === 1 ? request.side === "BUY" : request.side === "SELL";
    if (request.type !== "MARKET" || !into) return place(request);
    ex.sent++; ex.log.push(request); requested = Number(request.quantity); partial = +(requested * .4).toFixed(6);
    entryCoid = String(request.clientOrderID);
    const history = rt.db.kvGet<{ parents: Array<{ cfg: string; processedPolicy?: string }> }>(`liveEntryParentHistory:${entryCoid}`);
    assert.equal(history?.parents[0]?.cfg, A, "frozen request parent is durable before dispatch");
    assert.equal(history?.parents[0]?.processedPolicy, policy);
    ex.positions.set(key, partial);
    return { order: { orderId: "partial-processed-parent", status: "PARTIALLY_FILLED", executedQty: partial, avgPrice: 10 } };
  };
  ex.orderStatus = async (symbol, id) => id === "partial-processed-parent"
    ? { order: { orderId: id, status: phase === "full" ? terminal : phase === "stale" ? "NEW" : "PARTIALLY_FILLED",
      executedQty: phase === "full" && terminal === "FILLED" ? requested : phase === "stale" ? 0 : partial, avgPrice: phase === "stale" ? 0 : 10 } }
    : status(symbol, id);
  const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
  const allocations = () => liveKv<Record<string, { parents: Array<{ cfg: string; side: number; processedStage?: string; processedPolicy?: string }> }>>(rt.db, "liveEntryParents") ?? {};
  const entryCount = () => ex.log.filter(x => x.type === "MARKET" && (side === 1 ? x.side === "BUY" : x.side === "SELL")).length;
  try {
    rt.paper.positions = [parent]; await step();
    assert.ok(partial > 0 && partial < requested); assert.equal(ex.positions.get(key), partial);
    assert.equal(Object.values(liveKv<Record<string, LaneOpen>>(rt.db, "liveLaneOpen") ?? {}).length, 1, "first fill is already attributed");
    assert.deepEqual(allocations()[entryCoid]?.parents.map(p => [p.cfg, p.side, p.processedStage, p.processedPolicy]), [[A, side, "active", policy]], "partial attribution cannot retire a still-pending request's frozen parent");
    flushLiveKv(rt.db); rt.db.db.close(); rt = make(); rt.paper.positions = [parent];
    assert.equal(allocations()[entryCoid]?.parents[0]?.cfg, A, "request identity survives disk restart");
    assert.equal(rt.db.kvGet<{parents: Array<{cfg:string}>}>(`liveEntryParentHistory:${entryCoid}`)?.parents[0]?.cfg,A);
    phase = "stale"; mock.timers.tick(20_000); await step();
    assert.equal(ex.positions.get(key), partial); assert.equal(entryCount(), 1);
    assert.equal(allocations()[entryCoid]?.parents[0]?.processedPolicy, policy, "a stale zero cumulative poll keeps the exact pending policy");
    phase = "full"; const terminalQty = terminal === "FILLED" ? requested : partial;
    if (terminal === "CANCELLED") rt.paper.positions = [{ ...parent, vol: (parent.vol ?? 1) * .4 }];
    ex.positions.set(key, terminalQty); mock.timers.tick(20_000); await step();
    assert.equal(ex.positions.get(key), terminalQty); assert.equal(entryCount(), 1);
    assert.equal(Object.keys(allocations()).length, 0, "terminal attributed entry can retire its request checkpoint");
    assert.equal(rt.db.kvGet<{ parents: Array<{ cfg: string }> }>(`liveEntryParentHistory:${entryCoid}`)?.parents[0]?.cfg, A, "terminal cleanup keeps the historical exact request-to-parent link");
    const held = Object.values(liveKv<Record<string, LaneOpen>>(rt.db, "liveLaneOpen") ?? {});
    assert.equal(held[0]?.processedPolicy, policy); assert.equal(held[0]?.processedStage, "active");
    rt.paper.positions = []; mock.timers.tick(20_000); await step();
    assert.equal(ex.positions.has(key), false);
    // relation: all rows — fixture asserts the stored processed stage of every row it wrote, not a PF
    const rows = rt.db.all<{ cfg: string; processed_stage: string; processed_policy: string }>("SELECT cfg,processed_stage,processed_policy FROM live_lane_trades");
    assert.deepEqual(rows.map(r => [r.cfg, r.processed_stage, r.processed_policy]), [[A, "active", policy]]);
    flushLiveKv(rt.db); rt.db.db.close(); rt = make();
    const historical = rt.db.kvGet<{conn:string;parents:Array<{cfg:string;processedPolicy?:string}>}>(`liveEntryParentHistory:${entryCoid}`);
    assert.equal(historical?.parents[0]?.processedPolicy,policy,"exact policy survives terminal cleanup, final close and another disk restart");
    assert.match(historical?.conn ?? "", /^[a-f0-9]{64}$/);
  } finally {
    for (const db of databases) try { flushLiveKv(db); db.db.close(); } catch { /* closed before restart */ }
    mock.timers.reset(); rmSync(dir, { recursive: true, force: true });
  }
});

for (const sizing of ["min", "risk", "lanes"] as const) for (const side of [1, -1] as const) {
  it(`${sizing}, side ${side}: an aggregate holding cannot acquire a sibling; its own exit still runs`, async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { positionSize: sizing, laneOrders: false, positionMode: "hedge" });
    const first = pos(A, side), second = pos(B, side);
    try {
      rt.paper.positions = [first];
      await step();
      const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`, qty = ex.positions.get(key);
      assert.ok(qty && qty > 0);
      const market = ex.log.filter((x) => x.type === "MARKET").length;
      rt.paper.positions = [first, second];
      await step();
      assert.equal(ex.positions.get(key), qty);
      assert.equal(ex.log.filter((x) => x.type === "MARKET").length, market);
      const status = liveKv<ControlStatus>(rt.db, "controlStatus")!;
      assert.match(status.keys!.find((x) => x.key === `${SYM}|${side}`)?.why ?? "", /aggregate position/);
      assert.equal(Object.keys(liveKv<Record<string, LaneOpen>>(rt.db, "liveLaneOpen") ?? {}).length, 1);
      rt.paper.positions = [second];
      await step();
      assert.equal(ex.positions.has(key), false, "the existing parent's own exit is not blocked by the sibling");
      assert.equal(ex.log.filter((x) => x.type === "MARKET").length, market + 1);
      await step();
      assert.ok(ex.positions.has(key), "the sibling may open only after the former parent has closed");
    } finally { flushLiveKv(rt.db); rt.db.db.close(); }
  });
}

for (const side of [1, -1] as const) for (const partial of [false, true]) {
  it(`one-way ${side}: a ${partial ? "partial" : "pending"} entry reserves its side across restart`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-oneway-parent-")), path = join(dir, "core.sqlite");
    const { rt, ex, step } = setup(new CoreDb(path));
    Object.assign(rt.settings.live, { positionMode: "oneway", positionSize: "lanes", laneOrders: false });
    const place = ex.order.bind(ex);
    let entries = 0;
    ex.order = async (p) => {
      if (p.type === "MARKET" && p.reduceOnly !== "true") {
        entries++;
        if (partial) await place({ ...p, quantity: Number(p.quantity) / 2,
          positionSide: side === 1 ? "LONG" : "SHORT" });
        return { order: { orderId: "unresolved-oneway", status: partial ? "PARTIALLY_FILLED" : "NEW",
          executedQty: partial ? Number(p.quantity) / 2 : 0 } };
      }
      if (p.positionSide === "BOTH") return place({ ...p, positionSide: side === 1 ? "LONG" : "SHORT" });
      return place(p);
    };
    try {
      const first = pos(A, side), other = pos(B, -side as 1 | -1);
      rt.paper.positions = [first];
      await step();
      flushLiveKv(rt.db);
      rt.db.db.close();
      const resumed = setup(new CoreDb(path));
      Object.assign(resumed.rt.settings.live, { positionMode: "oneway", positionSize: "lanes", laneOrders: false });
      resumed.rt.paper.positions = [first, other];
      await stepLive(resumed.rt as unknown as CoreRuntime, [], 1, ex);
      assert.equal(entries, 1, "an unresolved side prevents an opposite market order");
      if (partial) assert.ok(ex.orders.some((x) => x.type === "STOP_MARKET"), "the partial fill remains protected");
      flushLiveKv(resumed.rt.db);
      resumed.rt.db.db.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

for (const side of [1, -1] as const) {
  it(`one-way, side ${side}: the opposite parent waits for confirmed flat, rather than netting an existing lane`, async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { positionMode: "oneway", laneOrders: false, positionSize: "lanes" });
    const place = ex.order.bind(ex);
    ex.order = async (p) => {
      // Market opens/closes are mapped to SimExchange's LONG/SHORT balance keys. Native one-way
      // conditionals must remain BOTH so the control path sees the same position identity as BingX.
      if (p.positionSide !== "BOTH" || p.type !== "MARKET") return place(p);
      const reduce = p.reduceOnly === "true" || p.closePosition === "true" || p.type !== "MARKET";
      const long = reduce ? p.side === "SELL" : p.side === "BUY";
      return place({ ...p, positionSide: long ? "LONG" : "SHORT" });
    };
    const first = pos(A, side), other = pos(B, -side as 1 | -1);
    try {
      rt.paper.positions = [first];
      await step();
      const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`, qty = ex.positions.get(key);
      assert.ok(qty && qty > 0);
      const market = ex.log.filter((x) => x.type === "MARKET").length;
      rt.paper.positions = [first, other];
      await step();
      assert.equal(ex.positions.get(key), qty);
      assert.equal(ex.log.filter((x) => x.type === "MARKET").length, market);
      rt.paper.positions = [other];
      await step();
      assert.equal(ex.positions.has(key), false, "the old parent closes after its stop is cancelled and reconciled");
      assert.equal(ex.positions.has(`${SYM}|${side === 1 ? "SHORT" : "LONG"}`), false,
        "the opposite parent cannot net against the existing lane in the close step");
      await step();
      assert.equal(ex.positions.has(`${SYM}|${side === 1 ? "SHORT" : "LONG"}`), true,
        "the opposite parent opens only after the next fresh flat book read");
    } finally { flushLiveKv(rt.db); rt.db.db.close(); }
  });
}

for (const partial of [false, true]) {
  it(`a ${partial ? "partial" : "pending"} aggregate entry reserves its parent across restart`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-parent-isolation-")), path = join(dir, "core.sqlite");
    const { rt, ex, step } = setup(new CoreDb(path));
    Object.assign(rt.settings.live, { positionSize: "min", laneOrders: false, positionMode: "hedge" });
    const place = ex.order.bind(ex);
    let attempts = 0;
    ex.order = async (p) => {
      if (p.type !== "MARKET" || p.side !== "BUY") return place(p);
      attempts++;
      if (partial) await place({ ...p, quantity: Number(p.quantity) / 2 });
      return { order: { orderId: "unresolved-entry", status: partial ? "PARTIALLY_FILLED" : "NEW",
        executedQty: partial ? Number(p.quantity) / 2 : 0 } };
    };
    const first = pos(A, 1), other = pos(B, 1);
    try {
      rt.paper.positions = [first];
      await step();
      assert.equal(attempts, 1);
      flushLiveKv(rt.db);
      rt.db.db.close();
      const resumed = setup(new CoreDb(path));
      Object.assign(resumed.rt.settings.live, { positionSize: "min", laneOrders: false, positionMode: "hedge" });
      resumed.rt.paper.positions = [first, other];
      await stepLive(resumed.rt as unknown as CoreRuntime, [], 1, ex);
      assert.equal(attempts, 1, "restart or sibling selection cannot send a duplicate or unrelated entry");
      if (partial) assert.ok(ex.orders.some((x) => x.type === "STOP_MARKET"), "confirmed partial exposure retains a backstop");
      flushLiveKv(resumed.rt.db);
      resumed.rt.db.db.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

it("an occupied aggregate key without a recoverable parent remains protected and cannot be adopted by a sibling", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-parent-unknown-")), path = join(dir, "core.sqlite");
  const { rt, ex, step } = setup(new CoreDb(path));
  Object.assign(rt.settings.live, { positionSize: "min", laneOrders: false, positionMode: "hedge" });
  try {
    rt.paper.positions = [pos(A, 1)];
    await step();
    const qty = ex.positions.get(`${SYM}|LONG`);
    assert.ok(qty);
    flushLiveKv(rt.db);
    // Legacy state can have a confirmed side but no recoverable per-parent record.
    rt.db.kvSet("liveLaneOpen", {});
    rt.db.db.close();
    const resumed = setup(new CoreDb(path));
    Object.assign(resumed.rt.settings.live, { positionSize: "min", laneOrders: false, positionMode: "hedge" });
    resumed.rt.paper.positions = [pos(B, 1)];
    const market = ex.log.filter((x) => x.type === "MARKET").length;
    await stepLive(resumed.rt as unknown as CoreRuntime, [], 1, ex);
    assert.equal(ex.positions.get(`${SYM}|LONG`), qty);
    assert.equal(ex.log.filter((x) => x.type === "MARKET").length, market);
    assert.ok(ex.orders.some((x) => x.type === "STOP_MARKET"), "the existing backstop stays in force");
    assert.equal(Object.keys(liveKv<Record<string, LaneOpen>>(resumed.rt.db, "liveLaneOpen") ?? {}).length, 0,
      "no new parent ownership is inferred from the existing quantity");
    flushLiveKv(resumed.rt.db);
    resumed.rt.db.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const side of [1, -1] as const) it(`an incomplete full close on side ${side} resumes after restart`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-partial-close-")), path = join(dir, "core.sqlite");
  const { rt, ex, step } = setup(new CoreDb(path));
  Object.assign(rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
  const place = ex.order.bind(ex), exitSide = side === 1 ? "SELL" : "BUY";
  let partial = true;
  ex.order = async (p) => {
    if (partial && p.type === "MARKET" && p.side === exitSide) {
      const qty = Number(p.quantity) / 2;
      await place({ ...p, quantity: qty });
      ex.done.set("partial-close", { status: "CANCELLED", px: 10, qty });
      return { order: { orderId: "partial-close", status: "CANCELLED", executedQty: qty, avgPrice: 10 } };
    }
    return place(p);
  };
  try {
    rt.paper.positions = [pos(A, side)];
    await step();
    const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`, initial = ex.positions.get(key)!;
    rt.paper.positions = [];
    await step();
    const left = ex.positions.get(key)!;
    assert.ok(left > 0 && left < initial);
    assert.ok(ex.orders.some((x) => x.type === "STOP_MARKET"), "the unresolved remainder remains protected");
    // relation: all rows — no classification may record a settled parent for this partial close.
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_lane_trades")?.n, 0,
      "a partial aggregate close is not a complete parent close");
    flushLiveKv(rt.db);
    rt.db.db.close();
    partial = false;
    const resumed = setup(new CoreDb(path));
    Object.assign(resumed.rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
    await stepLive(resumed.rt as unknown as CoreRuntime, [], 1, ex);
    assert.equal(ex.positions.has(key), false, "the prior confirmed full-close intent still owns its remainder");
    flushLiveKv(resumed.rt.db);
    resumed.rt.db.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const side of [1, -1] as const) it(`a definitively refused full-close intent on side ${side} can retry after restart`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-refused-close-")), path = join(dir, "core.sqlite");
  const { rt, ex, step } = setup(new CoreDb(path));
  Object.assign(rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
  const place = ex.order.bind(ex), exitSide = side === 1 ? "SELL" : "BUY";
  let refuse = true;
  ex.order = async (p) => {
    if (refuse && p.type === "MARKET" && p.side === exitSide) throw new ExchangeRejected("definite rejection", 101400);
    return place(p);
  };
  try {
    rt.paper.positions = [pos(A, side)];
    await step();
    const key = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`, initial = ex.positions.get(key)!;
    rt.paper.positions = [];
    await step();
    assert.equal(ex.positions.get(key), initial, "the refused close releases no owned quantity");
    assert.ok(ex.orders.some((x) => x.type === "STOP_MARKET"));
    // relation: all rows — no classification may record a settled parent after a rejected close.
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_lane_trades")?.n, 0,
      "a rejected close never becomes a ticker-priced parent settlement");
    flushLiveKv(rt.db);
    rt.db.db.close();
    refuse = false;
    resetLiveBackoff();
    const resumed = setup(new CoreDb(path));
    Object.assign(resumed.rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
    await stepLive(resumed.rt as unknown as CoreRuntime, [], 1, ex);
    assert.equal(ex.positions.has(key), false, "the durable full-close request can be retried");
    flushLiveKv(resumed.rt.db);
    resumed.rt.db.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const side of [1, -1] as const) it(`legacy mixed parents on side ${side} stay frozen and protected until a verified full close`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-mixed-parent-")), path = join(dir, "core.sqlite");
  const { rt, ex, step } = setup(new CoreDb(path));
  Object.assign(rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
  const first = pos(A, side), second = pos(B, side), key = `${SYM}|${side}`;
  const venueKey = `${SYM}|${side === 1 ? "LONG" : "SHORT"}`;
  const ids = [first, second].map((p) => laneKeyOf({ ...p, id: `${p.cfg}|${p.sym}|${p.entryT}` }));
  const tracked = Object.fromEntries(ids.map((id, i) => [id, { cfg: [A, B][i], sym: SYM, side, t: 1, px: 10 }]));
  const stopId = makeCoid(rt.settings.live.connId, "S"), openId = makeCoid(rt.settings.live.connId, "E");
  const stopPx = side === 1 ? 9 : 11;
  ex.positions.set(venueKey, 2);
  ex.orders.push({ id: "legacy-stop", venueSymbol: SYM, symbol: SYM, clientOrderId: stopId,
    positionSide: side === 1 ? "LONG" : "SHORT", type: "STOP_MARKET", stopPrice: stopPx });
  rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    openId, `control|${key}`, SYM, side, "O", 2, 10, "ok", "", Date.now() - 10_000);
  rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    stopId, `control|${key}`, SYM, side, "S", 2, stopPx, "ok", "", Date.now() - 9_000);
  rt.db.kvSet("liveLaneOpen", tracked);
  try {
    rt.paper.positions = [first]; // The other logical lane disappeared, but its owned quantity is unknown.
    await step();
    assert.equal(ex.positions.get(venueKey), 2);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, 0);
    assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET" && o.stopPrice === stopPx), JSON.stringify(ex.orders));
    assert.equal(Object.keys(liveKv<Record<string, LaneOpen>>(rt.db, "liveLaneOpen") ?? {}).length, 2);
    flushLiveKv(rt.db);
    rt.db.db.close();
    const resumed = setup(new CoreDb(path));
    Object.assign(resumed.rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
    resumed.rt.paper.positions = [];
    await stepLive(resumed.rt as unknown as CoreRuntime, [], 1, ex);
    assert.equal(ex.positions.get(venueKey), 2, "restarting cannot erase ambiguous parent ownership");
    assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET" && o.stopPrice === stopPx), JSON.stringify(ex.orders));
    assert.equal(Object.keys(liveKv<Record<string, LaneOpen>>(resumed.rt.db, "liveLaneOpen") ?? {}).length, 2);
    // A previously confirmed full-close intent reduced one unit and still owns the remaining unit.
    const closeId = makeCoid(resumed.rt.settings.live.connId, "C");
    resumed.rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      closeId, `control|${key}`, SYM, side, "X", 1, 10, "ok", "", Date.now() + 1);
    ex.positions.set(venueKey, 1);
    flushLiveKv(resumed.rt.db);
    resumed.rt.db.db.close();
    const finishing = setup(new CoreDb(path));
    Object.assign(finishing.rt.settings.live, { positionSize: "lanes", laneOrders: false, positionMode: "hedge" });
    await stepLive(finishing.rt as unknown as CoreRuntime, [], 1, ex);
    assert.equal(ex.positions.has(venueKey), false, "confirmed full-close intent may finish its proven residual");
    flushLiveKv(finishing.rt.db);
    finishing.rt.db.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it("a failed historical parent checkpoint prevents market dispatch", async () => {
  const {rt,ex,step}=setup();
  const write=rt.db.runDurable.bind(rt.db);
  const instrument=mock.method(rt.db,"runDurable",(sql:string,...params:unknown[])=>{
    if(String(params[0]).startsWith("liveEntryParentHistory:")) throw new Error("injected history journal failure");
    return write(sql,...params as Parameters<typeof write> extends [string,...infer P] ? P : never);
  });
  try {rt.paper.positions=[pos(A,1)];await step();assert.equal(ex.log.filter(o=>o.type === "MARKET").length,0);}
  finally {instrument.mock.restore();flushLiveKv(rt.db);rt.db.db.close();}
});
