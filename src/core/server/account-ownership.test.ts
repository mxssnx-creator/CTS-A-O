import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { liveSession } from "../api-data.ts";
import { hasCompleteAccountMark, hasCompleteOwnership } from "../account-mark.ts";
import { parsePositionUpnl } from "../exchange/bingx.server.ts";
import { fakeRt, lane, SimExchange, type SimOrder } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { liveKv, resetLiveBackoff, stepLive, type LiveStatus } from "./live.server.ts";
import { accountPositions, outsideReduction, ownCoidKind } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });

test("account mark evidence requires explicit zero counts for each owner", () => {
  assert.equal(hasCompleteOwnership(undefined), false);
  assert.equal(hasCompleteAccountMark({ ownershipUnknown: { n: 0 }, markUnknown: { own: 0 } }, "own"), false);
  const known = { ownershipUnknown: { n: 0, pendingKeys: 0 }, markUnknown: { own: 0, foreign: 1 } };
  assert.equal(hasCompleteAccountMark(known, "own"), true);
  assert.equal(hasCompleteAccountMark(known, "foreign"), false);
  for (const invalid of [-1, NaN, "0", undefined]) {
    assert.equal(hasCompleteAccountMark({ ...known, markUnknown: { own: invalid } }, "own"), false);
    assert.equal(hasCompleteAccountMark({ ...known, ownershipUnknown: { n: invalid, pendingKeys: 0 } }, "own"), false);
  }
});

test("account separates known mixed shares and leaves unknown shares null", () => {
  const book = {
    positions: [
      { symbol: "A", venueSymbol: "A", side: "long" as const, qty: 10, upnl: 20, margin: 40, mark: 3 },
      { symbol: "B", venueSymbol: "B", side: "short" as const, qty: 5, upnl: -10, margin: 15 },
    ], orders: [],
  };
  const view = accountPositions(book, new Map([["A|1", 2], ["B|-1", 1]]), new Set(), new Set(["B|-1"]));
  assert.equal(view.rows.find((x) => x.key === "A|1")?.ownQty, 2);
  assert.equal(view.rows.find((x) => x.key === "B|-1")?.ownQty, null);
  assert.equal(view.rows.find((x) => x.key === "B|-1")?.ownershipUnknown, true);
  assert.deepEqual(view.own, { n: 1, upnl: 4, margin: 8, notional: 6 });
  assert.deepEqual(view.foreign, { n: 1, upnl: 16, margin: 32 });
  assert.equal(view.ownershipUnknown.n, 1);
});

test("position uPnL parser distinguishes a zero mark from missing or invalid data", () => {
  for (const value of [undefined, null, "", "  ", "NaN", NaN, Infinity, "0x10", "0b11"])
    assert.equal(parsePositionUpnl(value), undefined, `unavailable mark ${String(value)}`);
  assert.equal(parsePositionUpnl("0"), 0);
  assert.equal(parsePositionUpnl(0), 0);
  assert.equal(parsePositionUpnl("-0.25"), -0.25);
  assert.equal(parsePositionUpnl(" +1.25e-2 "), 0.0125);
});

for (const missing of [undefined, NaN] as const) test(`an unavailable position mark is not reported as zero (${String(missing)})`, () => {
  const book = { positions: [{ symbol: "A", venueSymbol: "A", side: "long" as const, qty: 1, upnl: missing }], orders: [] };
  const view = accountPositions(book, new Map([["A|1", 1]]), new Set());
  assert.equal(view.rows[0].ownQty, 1, "the missing mark does not make known ownership unknown");
  assert.equal(view.rows[0].upnl, null);
  assert.equal(view.ownershipUnknown.n, 0);
  assert.equal(view.markUnknown.own, 1);
});

for (const side of [1, -1] as const) test(`session remains unavailable until an owned venue mark is measured, side ${side}`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { laneOrders: false, positionMode: "hedge", foreignSides: "independent",
    notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
  const ex = new SimExchange(), book = ex.book.bind(ex);
  let measured = false;
  ex.book = async () => { const b = await book(); return { ...b, positions: b.positions.map((p) => ({ ...p, upnl: measured ? 0 : undefined })) }; };
  rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|missing-mark-${side}`, "S1-USDT", side, 17), entryT: Date.now() - 60_000 }];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  let account = liveKv<LiveStatus>(rt.db, "liveStatus")!.account!;
  assert.equal(account.ownershipUnknown?.n, 0);
  assert.equal(account.positionsDetail![0].upnl, null);
  assert.equal(account.markUnknown?.own, 1);
  let session = await liveSession(rt as unknown as CoreRuntime);
  assert.equal(session.openUpnl, null);
  assert.equal(session.net, null);
  measured = true; await step();
  account = liveKv<LiveStatus>(rt.db, "liveStatus")!.account!;
  assert.equal(account.positionsDetail![0].upnl, 0);
  assert.equal(account.markUnknown?.own, 0);
  session = await liveSession(rt as unknown as CoreRuntime);
  assert.equal(session.openUpnl, 0);
  assert.equal(session.net, session.realized);
});

for (const side of [1, -1] as const) test(`duplicate venue rows retain unknown side allocation, side ${side}`, () => {
  const book = { positions: [
    { symbol: "A", venueSymbol: "A", side: side === 1 ? "long" as const : "short" as const, qty: 1, upnl: 10, margin: 20 },
    { symbol: "A", venueSymbol: "A", side: side === 1 ? "long" as const : "short" as const, qty: 1, upnl: 10, margin: 20 },
  ], orders: [] };
  const view = accountPositions(book, new Map([[`A|${side}`, 1]]), new Set());
  assert.equal(view.rows.length, 2, "both actual venue rows remain visible");
  assert.ok(view.rows.every((row) => row.ownQty === null && row.ownershipUnknown));
  assert.equal(view.ownershipUnknown.n, 2);
  assert.equal(view.own.n, 0);
  assert.equal(view.foreign.n, 0);
});

for (const side of [1, -1] as const) test(`an accepted unmeasured entry keeps session totals unavailable, side ${side}`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { laneOrders: false, positionMode: "hedge", foreignSides: "independent",
    notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
  const ex = new SimExchange(), send = ex.order.bind(ex);
  ex.order = async (p) => p.type === "MARKET" ? { order: { orderId: "unmeasured-entry" } } : send(p);
  ex.orderStatus = async () => null;
  rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|unmeasured-${side}`, "S1-USDT", side, 17), entryT: Date.now() - 60_000 }];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const account = liveKv<LiveStatus>(rt.db, "liveStatus")!.account!;
  assert.equal(account.positionsDetail?.length, 0);
  assert.ok((account.ownershipUnknown?.pendingKeys ?? 0) > 0);
  const session = await liveSession(rt as unknown as CoreRuntime);
  assert.equal(session.openUpnl, null);
  assert.equal(session.net, null);
});

test("only sub-ulp-scale residue in a measured outside reduction is exhausted", () => {
  const own = 0.29399999999999926;
  const complete = outsideReduction({ own, ex: 10, prevForeign: 10, tol: 0.001, ownFilled: 0 });
  assert.equal(complete?.own, 0);
  assert.equal(complete?.unexplained, own);
  const partial = outsideReduction({ own, ex: 10.000001, prevForeign: 10, tol: 0.001, ownFilled: 0 });
  assert.ok(partial && partial.own > 0, "a real residual is not rounded to zero");
});

test("session total needs an account open mark, while a verified empty account has zero open P&L", async () => {
  const absent = fakeRt(new CoreDb(":memory:")).rt;
  const missing = await liveSession(absent as unknown as CoreRuntime);
  assert.equal(missing.openUpnl, null);
  assert.equal(missing.net, null, "missing account P&L is not a zero contribution");
  const partial = fakeRt(new CoreDb(":memory:")).rt;
  partial.db.kvSet("liveStatus", { account: { readAt: 1 } });
  assert.equal((await liveSession(partial as unknown as CoreRuntime)).net, null, "a missing own subtotal is also unknown");
  const empty = fakeRt(new CoreDb(":memory:")).rt;
  empty.db.kvSet("liveStatus", { account: { own: { n: 0, upnl: 0 }, ownershipUnknown: { n: 0, pendingKeys: 0 },
    markUnknown: { own: 0, foreign: 0 }, readAt: 1 } });
  const measured = await liveSession(empty as unknown as CoreRuntime);
  assert.equal(measured.openUpnl, 0);
  assert.equal(measured.net, measured.realized);
});

test("legacy account totals stay unavailable until ownership and mark provenance are explicit", async () => {
  const { rt } = fakeRt(new CoreDb(":memory:"));
  const status = { account: { own: { n: 1, upnl: 0 }, ownershipUnknown: { n: 0, pendingKeys: 0 }, readAt: 1 } };
  rt.db.kvSet("liveStatus", status);
  let session = await liveSession(rt as unknown as CoreRuntime);
  assert.equal(session.openUpnl, null, "a pre-upgrade zero may have represented a missing mark");
  assert.equal(session.net, null);
  const fresh = fakeRt(new CoreDb(":memory:")).rt;
  fresh.db.kvSet("liveStatus", { account: { ...status.account, markUnknown: { own: 0, foreign: 0 } } });
  session = await liveSession(fresh as unknown as CoreRuntime);
  assert.equal(session.openUpnl, 0, "an explicit measured zero remains available");
  assert.equal(session.net, session.realized);
  rt.db.db.close();
  fresh.db.db.close();
});

for (const side of [1, -1] as const) test(`mixed and frozen account shares follow reconciled book, side ${side}`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { laneOrders: false, positionMode: "hedge", foreignSides: "avoid",
    notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|account-${side}`, sym, side, 17), entryT: Date.now() - 60_000 }];
  const book = ex.book.bind(ex);
  ex.book = async () => { const b = await book(); return { ...b, positions: b.positions.map((p) => ({ ...p, upnl: 20, margin: 40, mark: 17 })) }; };
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  const account = () => liveKv<LiveStatus>(rt.db, "liveStatus")!.account!;
  await step();
  const own = ex.positions.get(key)!;
  ex.foreignFill(key, 10); await step(); await step();
  let detail = account().positionsDetail![0];
  assert.equal(detail.qty, own + 10);
  assert.ok(Math.abs(detail.ownQty! - own) < 1e-9, "foreign quantity must not enter the own account total");
  assert.ok(Math.abs(account().own!.upnl - 20 * own / (own + 10)) < 1e-9);
  assert.ok(Math.abs(account().foreign!.upnl - 20 * 10 / (own + 10)) < 1e-9);
  assert.equal(account().ownershipUnknown!.n, 0);
  const foreignStop: SimOrder = { id: `foreign-${side}`, venueSymbol: sym, symbol: sym, positionSide: ps,
    type: "STOP_MARKET", stopPrice: 15, qty: 10 };
  ex.orders.push(foreignStop);
  await step();
  detail = account().positionsDetail![0];
  assert.equal(detail.ownQty, null, "a frozen mixed side is unresolved, not zero owned or wholly foreign");
  assert.equal(detail.ownershipUnknown, true);
  assert.equal(account().ownershipUnknown!.n, 1);
  let session = await liveSession(rt as unknown as CoreRuntime);
  assert.equal(session.openUpnl, null);
  assert.equal(session.net, null, "unknown open P&L cannot be added as a zero to realized P&L");
  ex.foreignFill(key, own / 2, false, 16.5); await step();
  assert.equal(account().positionsDetail![0].ownQty, null);
  ex.orders = ex.orders.filter((o) => o.id !== foreignStop.id);
  await step();
  detail = account().positionsDetail![0];
  const remaining = own - own / 2;
  assert.ok(Math.abs(detail.ownQty! - remaining) < 1e-6, `own share ${detail.ownQty}; expected ${remaining}`);
  assert.ok(Math.abs(account().own!.upnl - 20 * remaining / detail.qty) < 1e-6);
  session = await liveSession(rt as unknown as CoreRuntime);
  assert.notEqual(session.openUpnl, null, "a reconciled read restores the measured open subtotal");
  // Account detail describes the read before this step's market actions; a later read reports their result.
  // A subsequent observed outside reduction exhausts the remaining own-first ledger quantity; only then may
  // the following account snapshot label the physical remainder as foreign.
  const onVenue = ex.positions.get(key) ?? 0;
  if (onVenue > 10) ex.foreignFill(key, onVenue - 10, false, 16.5);
  for (let i = 0; i < 4 && account().positionsDetail![0].ownQty !== 0; i++) await step();
  assert.equal(ex.positions.get(key), 10);
  assert.equal(account().positionsDetail![0].ownQty, 0);
  assert.equal(account().positionsDetail![0].foreign, true);
});

for (const side of [1, -1] as const) for (const kind of ["V", "Y"] as const)
test(`account uses verified native ${kind} exit ledger beside foreign quantity, side ${side}`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
    notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|native-account-${side}-${kind}`, sym, side, 17),
    target: 17 * (1 + side * 0.05), entryT: Date.now() - 60_000 }];
  const book = ex.book.bind(ex);
  ex.book = async () => { const b = await book(); return { ...b, positions: b.positions.map((p) => ({ ...p, upnl: 20, margin: 40, mark: 17 })) }; };
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const own = ex.positions.get(key)!;
  ex.foreignFill(key, 10); await step(); await step();
  const exit = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === kind);
  assert.ok(exit && Math.abs((exit.qty ?? 0) - own) < 1e-9);
  ex.triggerOrder(exit.id); rt.paper.positions = [];
  await step();
  const account = liveKv<LiveStatus>(rt.db, "liveStatus")!.account!;
  const detail = account.positionsDetail!.find((p) => p.key === `${sym}|${side}`)!;
  assert.equal(detail.qty, 10);
  assert.ok(detail.ownQty === 0 || detail.ownQty === null, `native exit cannot remain in own share: ${JSON.stringify(detail)}`);
});
