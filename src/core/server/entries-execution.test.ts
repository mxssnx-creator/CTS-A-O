import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { liveKv, resetLiveBackoff, stepLive, type LiveStatus } from "./live.server.ts";
import { liveTag, makeCoid } from "./live.ts";
import { liveTrades, type LedgerRow } from "../statistics.ts";
import { authorizeSyntheticLanes, fakeRt, syntheticExecutionRun } from "../test-support.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CoreRuntime, LiveIntent } from "./runtime.server.ts";
import { REQUEST_WINDOW_MS, takeSignedRequestSlot } from "../exchange/request-budget.server.ts";

const originalKey = process.env.BINGX_X02_API_KEY;
const originalSecret = process.env.BINGX_X02_SECRET;
const originalArmed = process.env.CTS_CORE_LIVE;
const intent: LiveIntent = { cfg: "combo|ema-9-21@m1|entry", sym: "S0-USDT", side: 1,
  barT: 1, protect: { tp: .1, sl: .05, trail: 0, hold: 1 } };
type Reply = { order: { orderId?: string; status?: string; executedQty?: number; avgPrice?: number; commission?: number; updateTime?: number } };
function fixture(db = new CoreDb(":memory:")) {
  const rt = fakeRt(db).rt;
  // Settings are mutable runtime state; keep factor edits in each fixture from leaking across the test suite.
  rt.settings = { ...rt.settings, grid: structuredClone(rt.settings.grid), live: { ...rt.settings.live } };
  rt.settings.live = { ...rt.settings.live, mode: "entries", requireReady: false, syncMs: 0 };
  rt.status.lastBarT = 1;
  const state = {
    equity: 100 as number | null, availableMargin: 100 as number | null,
    extraQty: new Map<string, number>(),
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
      return reply(["S0-USDT", "S1-USDT"].map((symbol) => ({ symbol, quantityPrecision: 3, pricePrecision: 4, tradeMinQuantity: .001, tradeMinUSDT: 2 })));
    if (u.pathname.endsWith("/user/positions"))
      return reply([...(state.qty > 0 ? [{ symbol: "S0-USDT", positionSide: "LONG", positionAmt: state.qty }] : []),
        ...[...state.extraQty].filter(([, q]) => q > 0).map(([symbol, positionAmt]) => ({ symbol, positionSide: "LONG", positionAmt }))]);
    if (u.pathname.endsWith("/trade/openOrders")) return reply({ orders: state.orders });
    if (u.pathname.endsWith("/user/balance")) return reply({ balance: { asset: "USDT", equity: state.equity, balance: state.equity, availableMargin: state.availableMargin } });
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
    if (p.symbol === "S0-USDT") state.qty = Math.max(0, state.qty + (p.side === "BUY" ? got : -got));
    else state.extraQty.set(p.symbol, Math.max(0, (state.extraQty.get(p.symbol) ?? 0) + (p.side === "BUY" ? got : -got)));
    return reply(response);
  });
  const step = (intents: LiveIntent[] = [intent]) => {
    // This native Entries fixture explicitly supplies model + funded owned-paper history for its exact intents.
    authorizeSyntheticLanes(rt, intents);
    return stepLive(rt as unknown as CoreRuntime, intents, 1);
  };
  const seed = (side = 1) => {
    state.qty = 1;
    rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      makeCoid(rt.settings.live.connId, "E"), intent.cfg, intent.sym, side, "E", 1, 10, "ok", "seed", Date.now() - 1_000);
  };
  const history = () => liveTrades(rt.db.all<LedgerRow>(
    "SELECT o.*,f.fill_px AS fillPx,f.fee,f.fee_known AS feeKnown FROM live_orders o LEFT JOIN live_fills f USING(coid) ORDER BY o.at,o.rowid",
  ), liveTag(rt.settings.live.connId).length);
  return { rt, state, step, seed, history };
}

let fixtureClock = 1_790_000_000_000;
describe("strict synthetic promotion evidence", () => {
  it("starts empty and only proves explicitly declared config, symbol and direction identities", () => {
    const { rt } = fakeRt();
    assert.equal(rt.livePromotionGate!(intent).ok, false);
    rt.paper.positions = [{ ...intent, entry: 10, stop: 9.5, vol: 1 }];
    assert.equal(rt.livePromotionGate!(intent).ok, true);
    for (const other of [{ ...intent, cfg: `${intent.cfg}|other` }, { ...intent, sym: "S1-USDT" }, { ...intent, side: -1 as const }])
      assert.equal(rt.livePromotionGate!(other).ok, false);
    assert.equal(rt.sim.trades.length, 50);
    assert.ok(rt.sim.trades.every((t) => t.cfg === intent.cfg && t.sym === intent.sym && t.side === intent.side));
  });

  it("keeps a replaced losing settled model losing when another fixture lane is declared", () => {
    const { rt } = fakeRt();
    authorizeSyntheticLanes(rt, [intent]);
    rt.sim = syntheticExecutionRun([intent], [-0.01, 0.002]);
    rt.paper.positions = [{ ...intent, entry: 10, stop: 9.5, vol: 1 }];
    const gate = rt.livePromotionGate!(intent);
    assert.equal(gate.ok, false);
    assert.equal(gate.state, "model-failed");
    assert.ok(gate.model!.pf! < 1);
  });

  it("keeps independently losing or unknown owned-paper records unqualified", () => {
    for (const ownedReturns of [[-0.01, 0.002], [null]] as const) {
      const { rt } = fakeRt();
      authorizeSyntheticLanes(rt, [intent], { ownedReturns });
      rt.paper.positions = [{ ...intent, entry: 10, stop: 9.5, vol: 1 }];
      const gate = rt.livePromotionGate!(intent);
      assert.equal(gate.ok, false);
      assert.equal(gate.state, ownedReturns[0] === null ? "unknown" : "execution-failed");
      assert.ok(gate.model!.pf! > 1);
    }
  });
});

describe("entries mode: actual MARKET execution quantities", () => {
  beforeEach(() => {
    resetLiveBackoff();
    mock.timers.enable({ apis: ["Date"], now: fixtureClock += 100_000 });
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

  for (const restart of [false, true]) it(`an unsent request-budget hold retries the same entry ${restart ? "after restart" : "on a fresh step"} without pending ownership`, async () => {
    const { rt, state, step } = fixture();
    for (let i = 0; i < 8; i++)
      assert.equal(takeSignedRequestSlot("POST", "/openApi/swap/v2/trade/order", { type: "STOP_MARKET" }).until, 0);
    const held = await step();
    assert.equal(held.placed, 0);
    assert.equal(state.sent.length, 0);
    assert.ok(held.skipped.some((x) => /request budget pause.*not sent/.test(x.why)));
    assert.equal(rt.db.all("SELECT coid FROM live_orders WHERE status = 'pending'").length, 0);
    assert.equal(rt.db.all("SELECT coid FROM live_orders WHERE status = 'not-sent'").length, 1);
    mock.timers.tick(REQUEST_WINDOW_MS + 1);
    const resumed = restart ? fixture(rt.db) : { state, step };
    const retry = await resumed.step();
    assert.equal(retry.placed, 1, JSON.stringify(retry));
    assert.equal(resumed.state.sent.filter((x) => x.type === "MARKET" && x.side === "BUY").length, 1);
    assert.ok(resumed.state.sent.some((x) => x.type === "STOP_MARKET"), "the accepted entry receives its native stop");
  });

  it("a durable non-dispatch marker wins over stale pre-crash request metadata", async () => {
    const { rt, state, step } = fixture();
    const coid = makeCoid(rt.settings.live.connId, "E");
    const key = `${intent.cfg}|${intent.sym}|${intent.barT}`;
    rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      coid, intent.cfg, intent.sym, intent.side, "E", 0, 10, "not-sent", key, Date.now());
    rt.db.kvSet(`entriesPendingExecutions|${rt.settings.live.connId}`, {
      [coid]: { oid: "",cfg:intent.cfg,sym:intent.sym,side:intent.side,kind:"E",sentQty:1,px:10,key,at:Date.now() },
    });
    const status = await step();
    assert.equal(status.placed, 1, JSON.stringify(status));
    assert.equal(state.polls, 0, "a known non-dispatch is never queried as a possible venue fill");
    assert.equal(rt.db.all("SELECT coid FROM live_fills WHERE coid=?", coid).length, 0);
    assert.equal(rt.db.get<{qty:number}>("SELECT qty FROM live_orders WHERE coid=?", coid)?.qty, 0);
  });

  it("Signal native protection caps the stop from its actual fill, not the preflight quote", async () => {
    const { rt, state, step } = fixture();
    const signal = { ...intent, cfg: "follow|sig-ema-cross-s@m15|tp10|sl8|tr0|h32",
      protect: { ...intent.protect, sl: 0.08 } };
    Object.assign(rt.settings.live, { notionalUsd: 10, maxPositionX: 0, maxExposureX: 0,
      maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
    const result = await step([signal]);
    assert.equal(result.placed, 1, JSON.stringify(result));
    const stops = state.sent.filter((p) => p.type === "STOP_MARKET");
    assert.equal(stops.length, 1, JSON.stringify({ result, sent: state.sent }));
    const fill = Number(state.entry.order.avgPrice);
    assert.ok(Math.abs(Number(stops[0].stopPrice) - fill * 0.98) < 1e-10);
    assert.equal(Number(stops[0].quantity), .25, "only the confirmed filled quantity is protected");
  });

  it("ordinary fixed-unit entries obey maxPositionX using the same actual account, without control-only ratio", async () => {
    const { rt, state, step } = fixture();
    Object.assign(rt.settings.live, { notionalUsd: 100, maxNotionalUsd: 0, maxPositionX: .1, ratio: 10,
      maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
    await step();
    const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
    assert.equal(Number(entry.quantity), 1, "100 equity×.1 cap =10 USD / price10, rather than the requested100 USD");
  });

  it("applies an indication factor to the normal unit before live account caps", async () => {
    const { rt, state, step } = fixture();
    Object.assign(rt.settings.live, {
      notionalUsd: 10,
      maxNotionalUsd: 0,
      maxPositionX: 0,
      maxExposureX: 0,
      maxRiskPct: 0,
      maxBackstopLossPct: 0,
      minFreeMargin: 0,
    });
    state.entry.order = { orderId: "entry", status: "FILLED", executedQty: 8, avgPrice: 10 };
    await step([{ ...intent, volFactor: 8 }]);
    const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
    assert.equal(Number(entry.quantity), 8, "normal $10 × factor 8 = $80, priced at $10 per unit");
  });

  it("still applies the live per-position cap after multiplying the normal unit", async () => {
    const { rt, state, step } = fixture();
    Object.assign(rt.settings.live, {
      notionalUsd: 10,
      maxNotionalUsd: 0,
      maxPositionX: 0.5,
      maxExposureX: 0,
      maxRiskPct: 0,
      maxBackstopLossPct: 0,
      minFreeMargin: 0,
    });
    state.entry.order = { orderId: "entry", status: "FILLED", executedQty: 5, avgPrice: 10 };
    await step([{ ...intent, volFactor: 8 }]);
    const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
    assert.equal(
      Number(entry.quantity),
      5,
      "the $80 scaled unit is bounded to $50 by equity × maxPositionX",
    );
  });

  it("Micro's range factor sizes an Entries order at 250% of normal", async () => {
    const micro: LiveIntent = {
      ...intent,
      cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc",
    };
    const { rt, state, step } = fixture();
    Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0,
      maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
    const microGrid = rt.settings.grid.micro;
    assert.ok(microGrid && typeof microGrid === "object");
    Object.assign(microGrid, { volumeFactor: 2.5 });
    assert.equal((microGrid as unknown as { volumeFactor: number }).volumeFactor, 2.5);
    await step([micro]);
    const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
    assert.equal(Number(entry.quantity), 2.5, "$10 normal size × Micro's 2.5 factor at $10 per unit");
  });

  for (const { name, tag, rangeFactor, cfg, expected } of [
    { name: "Micro", tag: "micro", rangeFactor: 2.5, cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc", expected: 27 },
    { name: "Minimal", tag: "minimal", rangeFactor: 1.7, cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mn", expected: 18.36 },
  ] as const) {
    it(`${name} live sizing stacks Block, Relate, coordination, strategy, and range factors before caps`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      const rangeGrid = rt.settings.grid[tag];
      assert.ok(rangeGrid && typeof rangeGrid === "object");
      Object.assign(rangeGrid, { volumeFactor: rangeFactor });
      state.entry.order = { orderId: "entry", status: "PARTIALLY_FILLED", executedQty: 0.25, avgPrice: 10.2, commission: -.01 };
      const relation: LiveIntent = {
        ...intent,
        cfg,
        blockVol: 2,
        relateVol: 1.5,
        coordVol: 1.2,
        volFactor: 3,
      };
      const result = await step([relation]);
      assert.equal(result.placed, 1, `${name} entry reaches the synthetic live exchange: ${JSON.stringify(result)}`);
      const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
      assert.equal(Number(entry.quantity), expected,
        `$10 × ${rangeFactor} range × 1.2 coordination × 2 Block × 1.5 Relate × 3 strategy ÷ $10 price`);
      const stops = state.sent.filter((p) => p.type === "STOP_MARKET");
      assert.equal(stops.length, 1, `${name} partial fills receive native protection`);
      assert.equal(Number(stops[0].quantity), 0.25,
        `${name} protects only the exchange-confirmed partial fill, not the requested scaled quantity`);
      const fill = rt.db.get<{ qty: number; fill_px: number; fee: number }>(
        "SELECT qty,fill_px,fee FROM live_fills WHERE kind='E'",
      );
      assert.deepEqual(fill && { qty: fill.qty, fill_px: fill.fill_px, fee: fill.fee },
        { qty: 0.25, fill_px: 10.2, fee: 0.01 },
        `${name} ledger records the actual exchange fill and fee`);
    });
  }

  for (const { name, tag, rangeFactor, cfg } of [
    { name: "Micro", tag: "micro", rangeFactor: 2.5, cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc" },
    { name: "Minimal", tag: "minimal", rangeFactor: 1.7, cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mn" },
  ] as const) {
    it(`${name} applies the same account position cap after every stacked sizing factor`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0.5,
        maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      const rangeGrid = rt.settings.grid[tag];
      assert.ok(rangeGrid && typeof rangeGrid === "object");
      Object.assign(rangeGrid, { volumeFactor: rangeFactor });
      const result = await step([{
        ...intent, cfg, blockVol: 2, relateVol: 1.5, coordVol: 1.2, volFactor: 3,
      }]);
      assert.equal(result.placed, 1, JSON.stringify(result));
      const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
      assert.equal(Number(entry.quantity), 5, `${name} factors would raise size above the $50 cap; venue quantity stays $50 / $10`);
      assert.equal(Number(state.sent.find((p) => p.type === "STOP_MARKET")!.quantity), 0.25,
        `${name} protective quantity follows the actual partial fill after account capping`);
    });
  }

  for (const { name, tag, rangeFactor, cfg } of [
    { name: "Micro", tag: "micro", rangeFactor: 2.5, cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc" },
    { name: "Minimal", tag: "minimal", rangeFactor: 1.7, cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mn" },
  ] as const) {
    it(`${name} rechecks Max stack after resolving live range and strategy factors`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      const rangeGrid = rt.settings.grid[tag];
      assert.ok(rangeGrid && typeof rangeGrid === "object");
      Object.assign(rangeGrid, { volumeFactor: rangeFactor });
      const result = await step([{
        ...intent, cfg, blockVol: 2, relateVol: 1.5, coordVol: 1.2, volFactor: 3, maxStack: 15,
      }]);
      assert.equal(result.placed, 1, JSON.stringify(result));
      const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
      assert.equal(Number(entry.quantity), 15,
        `${name} must cap the combined execution multiplier at 15× even if the current factors would exceed it`);
    });
  }

  for (const { name, tag, captured, cfg } of [
    { name: "Micro", tag: "micro", captured: 2.5, cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc" },
    { name: "Minimal", tag: "minimal", captured: 1.7, cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mn" },
  ] as const) {
    it(`${name} uses the range multiplier captured by the validated Real intent`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      const rangeGrid = rt.settings.grid[tag];
      assert.ok(rangeGrid && typeof rangeGrid === "object");
      Object.assign(rangeGrid, { volumeFactor: 4 });
      await step([{ ...intent, cfg, rangeVol: captured, blockVol: 1.2, relateVol: 1.44, maxStack: 50 }]);
      const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
      assert.ok(entry, `${name} entry is sent`);
      assert.ok(Math.abs(Number(entry.quantity) - captured * 1.2 * 1.44) <= 0.001,
        `${name} keeps the captured Real multiplier rather than repricing it from the edited grid`);
    });
  }

  for (const { name, cfg } of [
    { name: "Micro", cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc" },
    { name: "Minimal", cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mn" },
  ] as const) {
    it(`${name} does not round a venue minimum above the captured Max stack`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 0.5, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      const result = await step([{ ...intent, cfg, maxStack: 2 }]);
      assert.equal(result.placed, 0);
      assert.equal(state.sent.length, 0);
      assert.ok(result.skipped.some((x) => x.why.includes("exchange minimum exceeds the captured Max stack")), JSON.stringify(result));
    });

    it(`${name} accepts a venue minimum exactly at the captured Max stack`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 1, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      const result = await step([{ ...intent, cfg, maxStack: 2 }]);
      assert.equal(result.placed, 1, JSON.stringify(result));
      assert.equal(Number(state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!.quantity), 0.2);
    });
  }

  for (const [name, invalid] of [
    ["range", { rangeVol: NaN }],
    ["Block", { blockVol: Infinity }],
    ["Relate", { relateVol: 0 }],
    ["coordination", { coordVol: -1 }],
    ["strategy", { volFactor: NaN }],
    ["max stack", { maxStack: NaN }],
  ] as const) {
    it(`rejects an invalid captured ${name} multiplier instead of substituting neutral size`, async () => {
      const { state, step } = fixture();
      const result = await step([{ ...intent, ...invalid }]);
      assert.equal(result.placed, 0);
      assert.equal(state.sent.length, 0);
      assert.ok(result.skipped.some((x) => x.why.includes("invalid captured execution sizing")));
    });
  }

  for (const { name, cfg, factor } of [
    { name: "Wide", cfg: intent.cfg, factor: 1.4 },
    { name: "General", cfg: "combo|ema-9-21@m1|tp1|sl1|tr0|h32|gn", factor: 1.6 },
    { name: "Long", cfg: "combo|ema-9-21@m1|tp1|sl1|tr0|h32|lg", factor: 2.2 },
  ]) {
    it(`${name} range factor reaches the native Entries quantity`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      if (name === "Wide") rt.settings.grid.volumeFactor = factor;
      else {
        const key = name === "General" ? "general" : "long";
        const range = rt.settings.grid[key];
        assert.ok(range);
        Object.assign(range, { volumeFactor: factor });
      }
      await step([{ ...intent, cfg }]);
      const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
      assert.equal(Number(entry.quantity), factor, `$10 normal size × ${factor} for ${name}`);
    });
  }

  it("captured Stable-02 and hedge factors scale Signal size before account caps", async () => {
    const signal: LiveIntent = {
      ...intent,
      cfg: "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32",
      coordVol: 1.4,
      hedge: true,
      hedgeVol: 1.6,
    };
    const { rt, state, step } = fixture();
    Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0,
      maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
    await step([signal]);
    let entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
    assert.equal(Number(entry.quantity), 2.24, "10 × 1.4 × 1.6 at $10 per unit; Signal range factor is neutral");

    const capped = fixture();
    Object.assign(capped.rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0.1,
      maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
    await capped.step([signal]);
    entry = capped.state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
    assert.equal(Number(entry.quantity), 1, "the 10 USD per-position cap still bounds coordinated sizing");
  });

  it("Signal short and medium range factors scale Entries orders before caps", async () => {
    for (const { range, suffix } of ([{ range: "short", suffix: "s" }, { range: "medium", suffix: "m" }] as const)) {
      const signal: LiveIntent = {
        ...intent,
        cfg: `follow|sig-ema-cross-${suffix}@m15|tp1|sl1|tr0|h32`,
        coordVol: 1.4,
        hedge: true,
        hedgeVol: 1.6,
      };
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      rt.settings.signals.rangeVolumeFactors[range] = 1.5;
      await step([signal]);
      const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
      assert.equal(Number(entry.quantity), 3.36, `$10 × ${range} 1.5 × relation 1.4 × hedge 1.6`);
    }
  });

  it("applies the range factor before the same per-position equity cap", async () => {
    const micro: LiveIntent = {
      ...intent,
      cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc",
    };
    const { rt, state, step } = fixture();
    Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0.1,
      maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
    await step([micro]);
    const entry = state.sent.find((p) => p.type === "MARKET" && p.side === "BUY")!;
    assert.equal(Number(entry.quantity), 1, "2.5× $10 is bounded back to 10% of the $100 account");
  });

  for (const gate of ["gross", "risk", "backstop", "margin"] as const) {
    it(`${gate} includes unfilled entry reservations before another independent symbol's native POST`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 60, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: gate === "gross" ? 1 : 0, maxRiskPct: gate === "risk" ? .04 : 0,
        maxBackstopLossPct: gate === "backstop" ? .04 : 0, minFreeMargin: gate === "margin" ? 25 : 0 });
      state.entry.order = { orderId: "entry", status: "NEW", executedQty: 0 };
      const second = { ...intent, cfg: "combo|ema-12-26@m1|entry", sym: "S1-USDT" };
      const result = await step([intent, second]);
      assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 1,
        "accepted60 USD cannot fund another60 USD with the same100 USD equity");
      assert.ok(result.skipped.some((p) => p.sym === second.sym && /cap|budget|margin/.test(p.why)));
      await step([intent, second]);
      assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 1, "pending reservation survives a new decision step");
    });
  }

  it("unknown real equity blocks capped fixed entries instead of borrowing the paper account", async () => {
    const { rt, state, step } = fixture();
    rt.settings.live.maxPositionX = .1;
    state.equity = null;
    const result = await step();
    assert.equal(state.sent.length, 0);
    assert.ok(result.skipped.some((p) => /account balance unknown/.test(p.why)));
  });

  it("a known partial and its pending remainder are reserved once, allowing another exact-fit entry", async () => {
    const { rt, state, step } = fixture();
    Object.assign(rt.settings.live, { notionalUsd: 50, maxNotionalUsd: 0, maxPositionX: 0, maxExposureX: 1,
      maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
    state.entry.order = { orderId: "entry", status: "PARTIALLY_FILLED", executedQty: 1, avgPrice: 10 };
    await step([intent, { ...intent, cfg: "combo|ema-12-26@m1|entry", sym: "S1-USDT" }]);
    assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 2,
      "first10 USD confirmed+40 pending leaves50 USD; counting its confirmed quantity again would reject the second");
  });

  it("a never-observed partial still reserves its known fill after the15s ordinary book-lag window", async () => {
    const { rt, state, step } = fixture();
    Object.assign(rt.settings.live, { notionalUsd: 50, maxNotionalUsd: 0, maxPositionX: 0, maxExposureX: 1,
      maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
    state.entry.order = { orderId: "entry", status: "PARTIALLY_FILLED", executedQty: 1, avgPrice: 10 };
    await step();
    state.qty = 0; // endpoint lag: it never showed the confirmed partial, so this proves no closure
    mock.timers.tick(20_000);
    rt.settings.live.notionalUsd = 60;
    const result = await step([{ ...intent, sym: "S1-USDT" }]);
    assert.equal(state.sent.filter((p) => p.type === "MARKET").length, 1,
      "10 USD known+40 pending remains50, rather than40; a new60 cannot fit the100 USD account");
    assert.ok(result.skipped.some((p) => /gross exposure cap/.test(p.why)));
  });

  for (const terminal of ["immediate-full", "partial-to-full", "terminal-partial"] as const) {
    it(`${terminal}: terminal known fills reserve actual quantity until first position visibility, with no phantom remainder`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 50, maxNotionalUsd: 0, maxPositionX: 0, maxExposureX: 1,
        maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      state.entry.order = { orderId: "entry", status: terminal === "immediate-full" ? "FILLED" : "PARTIALLY_FILLED",
        executedQty: terminal === "immediate-full" ? 5 : 1, avgPrice: 10 };
      await step();
      state.qty = 0;
      mock.timers.tick(20_000);
      state.entry.order.status = "FILLED";
      state.entry.order.executedQty = terminal === "terminal-partial" ? 1 : 5;
      rt.settings.live.notionalUsd = 60;
      const next = { ...intent, sym: "S1-USDT" };
      await step([next]);
      assert.equal(state.sent.filter((p) => p.type === "MARKET").length, terminal === "terminal-partial" ? 2 : 1,
        "terminalpartial keeps only10 USD known; full50 USD cannot admit another60 under the100 USD cap");
      assert.ok(state.orders.some((o) => o.symbol === "S0-USDT" && o.type === "STOP_MARKET"),
        "never-observed confirmed fills keep their own protection while the endpoint lags");
      const polls = state.polls;
      mock.timers.tick(20_000);
      await step([]);
      assert.equal(state.polls, polls, "a known terminal order is neither repolled nor resubmitted");
      state.qty = terminal === "terminal-partial" ? 1 : 5;
      await step([]);
      const saved = liveKv<Record<string, { sym: string }>>(rt.db, `entriesPendingExecutions|${rt.settings.live.connId}`)!;
      assert.ok(!Object.values(saved).some((p) => p.sym === "S0-USDT"), "actual first visibility clears the ownership marker");
    });
  }

  for (const close of ["full", "partial", "unknown"] as const) {
    it(`${close}: only confirmed protective-close quantity releases never-observed terminal ownership`, async () => {
      const { rt, state, step } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 50, maxNotionalUsd: 0, maxPositionX: 0, maxExposureX: 1,
        maxRiskPct: 0, maxBackstopLossPct: 0, minFreeMargin: 0 });
      state.entry.order = { orderId: "entry", status: "FILLED", executedQty: 5, avgPrice: 10 };
      state.failControls = true;
      state.close.order = { orderId: "close", status: close === "unknown" ? "NEW" : "FILLED",
        executedQty: close === "full" ? 5 : close === "partial" ? 2 : 0, avgPrice: 10 };
      await step();
      const original = rt.db.get<{ qty: number; at: number }>("SELECT qty,at FROM live_orders WHERE kind='E' AND sym='S0-USDT'")!;
      assert.equal(original.qty, 5);
      state.qty = 0; // remaining known ownership has never appeared in the position endpoint
      state.failControls = false;
      if (close !== "full") {
        const stop = makeCoid(rt.settings.live.connId, "S");
        state.orders.push({ symbol: "S0-USDT", positionSide: "LONG", orderId: "repaired", clientOrderID: stop, type: "STOP_MARKET" });
        rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
          stop, intent.cfg, intent.sym, 1, "S", 5, 9.5, "ok", "protection restored", Date.now());
      }
      mock.timers.tick(20_000);
      rt.settings.live.notionalUsd = close === "full" ? 100 : close === "partial" ? 70 : 60;
      await step([{ ...intent, sym: "S1-USDT" }]);
      assert.equal(state.sent.filter((p) => p.type === "MARKET" && p.side === "BUY").length, close === "unknown" ? 1 : 2,
        "full frees50 USD, partial frees20 leaving30, unknown frees0 leaving50");
      assert.deepEqual(rt.db.get("SELECT qty,at FROM live_orders WHERE kind='E' AND sym='S0-USDT'"), original,
        "the original cash execution quantity and timestamp are never rewritten to release a budget marker");
    });
  }

  for (const gate of ["gross", "risk", "backstop"] as const) {
    it(`${gate} still reserves an owned position protected by its resting stop after the24h recent-entry window`, async () => {
      const { rt, state, step, seed } = fixture();
      Object.assign(rt.settings.live, { notionalUsd: 10, maxNotionalUsd: 0, maxPositionX: 0,
        maxExposureX: gate === "gross" ? 1 : 0, maxRiskPct: gate === "risk" ? .05 : 0,
        maxBackstopLossPct: gate === "backstop" ? .05 : 0, minFreeMargin: 0 });
      seed();
      state.qty = 10;
      rt.db.run("UPDATE live_orders SET qty=10,at=? WHERE kind='E'", Date.now() - 25 * 3_600_000);
      const coid = makeCoid(rt.settings.live.connId, "S");
      state.orders.push({ symbol: "S0-USDT", positionSide: "LONG", orderId: "s", clientOrderID: coid, type: "STOP_MARKET" });
      rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        coid, intent.cfg, intent.sym, 1, "S", 10, 9.5, "ok", "held-stop", Date.now() - 25 * 3_600_000);
      const result = await step([{ ...intent, sym: "S1-USDT" }]);
      assert.equal(state.sent.length, 0, "the100 USD position still reserves its actual gross and5 USD stop loss");
      assert.ok(result.skipped.some((p) => /cap|budget/.test(p.why)));
    });
  }

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

  it("persists a parser-confirmed zero entry commission through the native journal", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-entry-free-fee-"));
    const db = new CoreDb();
    try {
      db.journalPath = join(dir, "orders.journal");
      const { state, step } = fixture(db);
      state.entry.order.commission = 0;
      await step();
      const fill = db.get<{ fee: number; fee_known: number }>("SELECT fee,fee_known FROM live_fills WHERE kind='E'")!;
      assert.deepEqual({ ...fill }, { fee: 0, fee_known: 1 });
      const restored = new CoreDb();
      try {
        restored.journalPath = db.journalPath;
        restored.replayJournal();
        assert.deepEqual(restored.get("SELECT fee,fee_known FROM live_fills WHERE kind='E'"), fill);
      } finally { restored.db.close(); }
    } finally { db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  for (const fee of [.05, 0])
  it(`keeps measured commission ${fee} across a same-fill sparse Entries poll, without certifying changed fills`, async () => {
    const { rt, state, step } = fixture();
    try {
      state.entry.order = { orderId: "entry", status: "PARTIALLY_FILLED", executedQty: .25, avgPrice: 10.2, commission: -fee };
      const actual = () => ({ ...rt.db.get("SELECT qty,fill_px,fee,fee_known FROM live_fills WHERE kind='E'")! });
      await step();
      assert.deepEqual(actual(), { qty: .25, fill_px: 10.2, fee, fee_known: 1 });
      delete state.entry.order.commission;
      mock.timers.tick(1_100);
      await step();
      assert.deepEqual(actual(), { qty: .25, fill_px: 10.2, fee, fee_known: 1 }, "the unchanged cumulative fill retains its measured cost");
      state.entry.order.avgPrice = 10.3;
      mock.timers.tick(1_100);
      await step();
      assert.deepEqual(actual(), { qty: .25, fill_px: 10.3, fee: null, fee_known: 0 }, "a price correction without commission has new unknown provenance");
      state.entry.order = { ...state.entry.order, avgPrice: 10.2, commission: -fee };
      mock.timers.tick(1_100);
      await step();
      assert.equal(actual().fee_known, 1);
      state.entry.order.executedQty = .5;
      state.qty = .5;
      delete state.entry.order.commission;
      mock.timers.tick(1_100);
      await step();
      assert.deepEqual(actual(), { qty: .5, fill_px: 10.2, fee: null, fee_known: 0 }, "an additional fill cannot borrow the earlier partial's fee proof");
      assert.equal(state.sent.filter((p) => p.type === "MARKET" && p.side === "BUY").length, 1);
    } finally { rt.db.db.close(); }
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
