import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive } from "./live.server.ts";
import { ownCoidKind } from "./live.ts";
import type { LaneOrder } from "./lane-orders.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });

test("durable submission sequence survives snapshot and journal replay", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cts-submission-sequence-")), snapshot = join(dir, "snapshot.sqlite"),
    journal = `${snapshot}.journal`, first = new CoreDb(":memory:"), second = new CoreDb(":memory:");
  t.after(() => { first.db.close(); second.db.close(); rmSync(dir, { recursive: true, force: true }); });
  first.journalPath = journal;
  const insert = "INSERT OR IGNORE INTO live_submission_sequence (coid,k,kind) VALUES (?,?,?)";
  first.runDurable(insert, "entry", "A|1", "O");
  first.runDurable(insert, "aggregate", "A|1", "S");
  assert.equal(first.snapshot(snapshot), true);
  first.runDurable(insert, "native", "A|1", "V");
  first.runDurable(insert, "later-intent", "A|1", "O");
  assert.equal(second.restore(snapshot), true);
  second.journalPath = journal;
  assert.equal(second.replayJournal(), 2);
  const restored = second.all<{ seq: number; coid: string }>("SELECT seq,coid FROM live_submission_sequence ORDER BY seq");
  assert.deepEqual(restored.map((x) => x.coid), ["entry", "aggregate", "native", "later-intent"]);
  assert.ok(restored.every((x, i) => i === 0 || x.seq > restored[i - 1].seq));
  second.runDurable(insert, "next", "A|1", "Y");
  assert.ok(second.get<{ seq: number }>("SELECT seq FROM live_submission_sequence WHERE coid='next'")!.seq > restored[3].seq);
});

for (const kind of ["O", "S"] as const) test(`journal failure prevents ${kind} dispatch and any speculative fallback`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
    notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
  const ex = new SimExchange();
  rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|journal-fail-${kind}`, "S1-USDT", 1, 17), entryT: Date.now() - 60_000 }];
  const write = rt.db.runDurable.bind(rt.db);
  rt.db.runDurable = (sql, ...values) => {
    const result = write(sql, ...values);
    if (sql.includes("live_submission_sequence") && values[2] === kind) rt.db.lastJournalError = "injected unavailable journal";
    return result;
  };
  mock.timers.tick(20_000);
  await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
  const market = ex.log.filter((p) => p.type === "MARKET");
  assert.equal(market.length, kind === "O" ? 0 : 1, "no unjournaled entry or speculative market close is dispatched");
  assert.equal(ex.log.filter((p) => p.type === "STOP_MARKET").length, 0, "the affected stop was never dispatched");
  rt.db.db.close();
});

for (const side of [1, -1] as const) test(`legacy native siblings keep aggregate protection pending after partial, side ${side}`, async (t) => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const dir = mkdtempSync(join(tmpdir(), "cts-native-siblings-")), path = join(dir, "live.sqlite"), dbs: CoreDb[] = [];
  t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
    rmSync(dir, { recursive: true, force: true }); });
  const make = () => {
    const db = new CoreDb(path); dbs.push(db);
    const { rt } = fakeRt(db);
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    return rt;
  };
  let rt = make();
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  const paper = { ...lane(`follow|sig-ema-cross-s@m15|siblings-${side}`, sym, side, 17), entryT: Date.now() - 60_000 };
  rt.paper.positions = [paper];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const original = ex.positions.get(key)!;
  ex.foreignFill(key, 10); await step(); await step();
  const source = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
  const aggregate = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(source && aggregate);
  const saved = liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders")!, base = Object.values(saved)[0];
  assert.ok(base);
  saved[`legacy-sibling-${side}`] = { ...base, id: `legacy-sibling-${side}`, qty: original / 3, s: undefined, t: undefined };
  flushLiveKv(rt.db); rt.db.kvSet("laneOrders", saved); assert.equal(rt.db.flushState(), true); rt.db.db.close();
  rt = make(); rt.paper.positions = [paper];
  const status = ex.orderStatus.bind(ex), partial = +(original / 2).toFixed(6);
  ex.orderStatus = async (sym, id) => id === source.id
    ? { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: partial, avgPrice: source.stopPrice } } : status(sym, id);
  ex.positions.set(key, +(10 + original - partial).toFixed(6));
  const markets = ex.log.filter((o) => o.type === "MARKET").length;
  await step(); await step();
  assert.ok(ex.orders.some((o) => o.id === aggregate.id), "ambiguous sibling ownership does not authorize aggregate cancellation");
  assert.equal(ex.log.filter((o) => o.type === "MARKET").length, markets);
  assert.ok(Math.abs((ex.positions.get(key) ?? 0) - (10 + original - partial)) < 1e-9);
});

for (const side of [1, -1] as const) for (const refused of [false, true]) for (const timed of [false, true])
test(`oversized aggregate exit after native partial is ${refused ? "reserved on refusal" : "retired by exact receipt"}, side ${side}, venue time ${timed}`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
    notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  const submit = ex.order.bind(ex);
  ex.order = async (p) => {
    const coid = String(p.clientOrderID ?? ""), kind = ownCoidKind(coid, rt.settings.live.connId);
    if (["E", "S", "T", "V", "Y"].includes(kind)) {
      const row = rt.db.get<{ seq: number }>("SELECT seq FROM live_submission_sequence WHERE coid=?", coid);
      assert.ok(row?.seq, `submission sequence must exist before dispatch of ${kind}`);
    }
    return submit(p);
  };
  rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|partial-stop-${side}-${refused}`, sym, side, 17),
    target: 17 * (1 + side * 0.05), entryT: Date.now() - 60_000 }];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const original = ex.positions.get(key)!;
  ex.foreignFill(key, 10); await step(); await step();
  const source = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
  const aggregate = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(source && aggregate && aggregate.qty && Math.abs(aggregate.qty - original) < 1e-9);
  const nativeOrder = rt.db.get<{ seq: number }>("SELECT seq FROM live_submission_sequence WHERE coid=?", source.clientOrderId!);
  const aggregateOrder = rt.db.get<{ seq: number }>("SELECT seq FROM live_submission_sequence WHERE coid=?", aggregate.clientOrderId!);
  assert.ok(nativeOrder && aggregateOrder && aggregateOrder.seq < nativeOrder.seq, "submission sequence proves causal order despite clock ties");
  ex.orders.push({ id: "manual-stop", venueSymbol: sym, symbol: sym, positionSide: ps,
    clientOrderId: "operator-manual", type: "STOP_MARKET", qty: 10, stopPrice: 12 });
  const partial = +(original / 2).toFixed(6), status = ex.orderStatus.bind(ex), cancel = ex.cancel.bind(ex), fillAt = Date.now();
  ex.orderStatus = async (sym, id) => id === source.id
    ? { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: partial, avgPrice: source.stopPrice,
      ...(timed ? { updateTime: fillAt } : {}) } }
    : status(sym, id);
  let aggregateCancels = 0;
  ex.cancel = async (sym, id) => { if (id === aggregate.id) { aggregateCancels++; if (refused) return false; } return cancel(sym, id); };
  ex.positions.set(key, +(10 + original - partial).toFixed(6));
  const markets = ex.log.filter((x) => x.type === "MARKET").length;
  await step();
  assert.equal(aggregateCancels, 1, "only the exact old aggregate stop is requested for cancellation");
  assert.ok(ex.orders.some((o) => o.id === "manual-stop"), "foreign protection is not cancelled");
  if (!refused) {
    assert.ok(!ex.orders.some((o) => o.id === aggregate.id), "confirmed zero-fill cancellation retires the oversized stop");
    for (const o of ex.orders.filter((x) => ownCoidKind(x.clientOrderId, rt.settings.live.connId) === "S")) ex.triggerOrder(o.id);
    assert.ok((ex.positions.get(key) ?? 0) >= 10 - 1e-9, "no remaining own aggregate exit consumes foreign quantity");
  } else {
    assert.ok(ex.orders.some((o) => o.id === aggregate.id));
    assert.ok(Object.keys(liveKv<Record<string, unknown>>(rt.db, "positionExitCleanup") ?? {}).length > 0,
      "refused cancellation retains its exact durable reservation");
    await step(); await step();
    assert.equal(aggregateCancels, 1, "unknown cancellation is polled, not re-sent");
  }
  assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets);
});

for (const side of [1, -1] as const) for (const conflict of ["none", "entry", "intent-only"] as const)
test(`durable native partial with ${conflict} conflict after restart, side ${side}`, async (t) => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const dir = mkdtempSync(join(tmpdir(), "cts-native-stop-crash-")), path = join(dir, "live.sqlite"), dbs: CoreDb[] = [];
  t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
    rmSync(dir, { recursive: true, force: true }); });
  const make = () => {
    const db = new CoreDb(path); dbs.push(db);
    const { rt } = fakeRt(db);
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    return rt;
  };
  let rt = make();
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  const paper = { ...lane(`follow|sig-ema-cross-s@m15|partial-crash-${side}`, sym, side, 17), entryT: Date.now() - 60_000 };
  rt.paper.positions = [paper];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const original = ex.positions.get(key)!;
  ex.foreignFill(key, 10); await step(); await step();
  const source = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
  const aggregate = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(source && aggregate);
  const partial = +(original / 2).toFixed(6), status = ex.orderStatus.bind(ex), fillAt = Date.now();
  let receipt = true;
  ex.orderStatus = async (sym, id) => id === source.id
    ? receipt ? { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: partial, avgPrice: source.stopPrice, updateTime: fillAt } } : null
    : status(sym, id);
  ex.positions.set(key, +(10 + original - partial).toFixed(6));
  const write = rt.db.runDurable.bind(rt.db);
  let interrupted = false;
  rt.db.runDurable = (sql, ...values) => {
    const result = write(sql, ...values);
    if (!interrupted && values[4] === "R" && String(values[8]).includes("measured conditional")) {
      interrupted = true; throw new Error("interrupt after native reduction journal");
    }
    return result;
  };
  await step(); assert.equal(interrupted, true);
  assert.ok(ex.orders.some((o) => o.id === aggregate.id), "interruption occurred before aggregate cancellation");
  if (conflict === "entry") rt.db.runDurable("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    `later-${side}`, `control|${sym}|${side}`, sym, side, "O", 0, 17, "error", "later rejected entry", Date.now() + 1);
  if (conflict === "intent-only") rt.db.runDurable("INSERT OR IGNORE INTO live_submission_sequence (coid,k,kind) VALUES (?,?,?)",
    `intent-only-${side}`, `${sym}|${side}`, "O");
  flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
  receipt = false; rt = make(); rt.paper.positions = [paper];
  await step();
  assert.equal(ex.orders.some((o) => o.id === aggregate.id), conflict !== "none",
    "only an unsuperseded native fill authorizes retirement of the old oversized aggregate exit");
  assert.ok(Math.abs((ex.positions.get(key) ?? 0) - (10 + original - partial)) < 1e-9);
});

for (const side of [1, -1] as const) for (const timeOnly of [false, true])
test(`intervening entry blocks old-exit cancellation without native update time, side ${side}, time-only ${timeOnly}`, async (t) => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const dir = mkdtempSync(join(tmpdir(), "cts-native-time-unknown-")), path = join(dir, "live.sqlite"), dbs: CoreDb[] = [];
  t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
    rmSync(dir, { recursive: true, force: true }); });
  const make = () => {
    const db = new CoreDb(path); dbs.push(db);
    const { rt } = fakeRt(db);
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    return rt;
  };
  let rt = make();
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  const paper = { ...lane(`follow|sig-ema-cross-s@m15|unknown-time-${side}-${timeOnly}`, sym, side, 17), entryT: Date.now() - 60_000 };
  rt.paper.positions = [paper];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const original = ex.positions.get(key)!;
  ex.foreignFill(key, 10); await step(); await step();
  const source = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
  const aggregate = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(source && aggregate);
  const partial = +(original / 2).toFixed(6), status = ex.orderStatus.bind(ex), fillAt = Date.now();
  ex.positions.set(key, +(10 + original - partial).toFixed(6));
  // An entry intent occurred after the actual partial but before its receipt was observed.
  rt.db.runDurable("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    `intervening-${side}-${timeOnly}`, `control|${sym}|${side}`, sym, side, "O", 0, 17, "error", "intervening entry intent", fillAt + 1);
  mock.timers.tick(65_000); // ensure the control-row mirror reloads this intervening intent
  let receipt = true;
  ex.orderStatus = async (sym, id) => id === source.id
    ? receipt ? { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: partial, avgPrice: source.stopPrice,
      ...(timeOnly ? { time: fillAt } : {}) } } : null
    : status(sym, id);
  await step();
  assert.ok(ex.orders.some((o) => o.id === aggregate.id), "an observation timestamp is not execution chronology");
  const r = rt.db.get<{ msg: string }>("SELECT msg FROM live_orders WHERE kind='R' AND msg LIKE '%measured conditional%'");
  assert.ok(r?.msg.includes("timestamp unverified"));
  flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
  receipt = false; rt = make(); rt.paper.positions = [paper];
  await step();
  assert.ok(ex.orders.some((o) => o.id === aggregate.id), "unverified chronology cannot gain authority after restart");
});

for (const side of [1, -1] as const) for (const tie of ["entry", "aggregate"] as const)
test(`equal ${tie} and native submission times do not authorize cancellation, side ${side}`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
    notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|native-tie-${side}-${tie}`, sym, side, 17), entryT: Date.now() - 60_000 }];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const original = ex.positions.get(key)!;
  ex.foreignFill(key, 10); await step(); await step();
  const source = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "V");
  const aggregate = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(source && aggregate);
  const submission = Date.now() + 1;
  rt.db.runDurable("UPDATE live_orders SET at=? WHERE coid=?", submission, source.clientOrderId!);
  rt.db.runDurable("DELETE FROM live_submission_sequence WHERE coid=?", source.clientOrderId!);
  if (tie === "aggregate") rt.db.runDurable("UPDATE live_orders SET at=? WHERE coid=?", submission, aggregate.clientOrderId!);
  else rt.db.runDurable("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    `tied-${side}`, `control|${sym}|${side}`, sym, side, "O", 0, 17, "error", "tied entry intent", submission);
  mock.timers.tick(65_000);
  const partial = +(original / 2).toFixed(6), status = ex.orderStatus.bind(ex);
  ex.orderStatus = async (sym, id) => id === source.id
    ? { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: partial, avgPrice: source.stopPrice } }
    : status(sym, id);
  ex.positions.set(key, +(10 + original - partial).toFixed(6));
  await step();
  assert.ok(ex.orders.some((o) => o.id === aggregate.id), "equal timestamps do not prove an older aggregate order");
  assert.ok(Math.abs((ex.positions.get(key) ?? 0) - (10 + original - partial)) < 1e-9);
});
