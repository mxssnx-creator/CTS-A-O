import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { accountGrowthBlock, controlTargets, scaleToRisk } from "./live.ts";
import { laneContributions, liveKv, resetLiveBackoff, stepLive, type ControlStatus, type ExchangeClient } from "./live.server.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { SimExchange, fakeRt, lane } from "../test-support.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { blockDecide } from "../sim/block.ts";
import { DEFAULT_BLOCK } from "../config.ts";
import type { LaneOrder } from "./lane-orders.ts";

process.env.CTS_CORE_LIVE = "1";
const core = (rt: unknown) => rt as CoreRuntime;
const sig = (range: string) => `follow|sig-ema-cross-${range}@m5|tp1|sl1|tr0|h32`;
const setup = (db = new CoreDb(":memory:")) => {
  const { rt, prices } = fakeRt(db);
  rt.settings.live = { ...rt.settings.live, notionalUsd: 100, maxNotionalUsd: 0, maxPositions: 0,
    rebalancePct: 0, ratio: 1, top: 0, minFreeMargin: 0, maxPositionX: 0, maxExposureX: 0,
    maxRiskPct: 0, maxBackstopLossPct: 0, maxChase: 0 };
  const ex = new SimExchange().withEquity(100);
  return { rt, prices, ex, step: () => stepLive(core(rt), [], 1, ex) };
};
const gross = (ex: SimExchange) => [...ex.positions].reduce((sum, [key, q]) => sum + q * (10 + 7 * Number(key.slice(1).split("-")[0])), 0);

describe("actual execution account budgets across independent Signal sets", () => {
  afterEach(() => resetLiveBackoff());

  for (const laneOrders of [false, true])
  it(`Overall Block asks for its total capped target once across repeated native cycles (lane orders ${laneOrders})`, async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { notionalUsd: 25, maxExposureX: 1, laneOrders });
    const levels = { config: 8, overall: 8, symbol: 8, direction: 8, indication: 8, type: 8 };
    const d = blockDecide(levels, { ...DEFAULT_BLOCK, mode: "overall", maxMult: 2,
      sources: { config: true, overall: true, symbol: true, direction: true, indication: true, type: true } }, false);
    rt.paper.positions = [{ ...lane(sig("s"), "S0-USDT", 1, 10), vol: d.vol, legs: d.legs }];
    const contributions = laneContributions(core(rt));
    assert.equal(contributions.length, 7, "all six independent source IDs remain represented beside the base");
    assert.ok(Math.abs(contributions.reduce((sum, c) => sum + c.vol, 0) - 2) < 1e-12);
    const place = ex.order.bind(ex);
    let entries = 0;
    ex.order = async (p) => {
      if (p.type === "MARKET" && p.side === "BUY") entries++;
      return place(p);
    };
    for (let i = 0; i < 4; i++) await step();
    assert.equal(entries, 1, "unchanged target does not add another Block stack each cycle");
    assert.equal(ex.positions.get("S0-USDT|LONG"), 5, "25 USD base × total cap2 at price10 is5 owned units");
    assert.ok(gross(ex) <= 50 + 1e-9);
    if (laneOrders) {
      const map = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {});
      assert.equal(map.length, 1, "only the exact parent config and common exit are physically coalesced");
      assert.equal(map[0].qty, 5, "the parent stop covers the whole owned stack");
      assert.equal(Object.keys(map[0].weights ?? {}).length, 7, "base and all six source allocations remain explicit");
      assert.ok(Math.abs(Object.values(map[0].weights ?? {}).reduce((sum, w) => sum + w, 0) - 2) < 1e-12);
      assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition)[0]?.qty, 5);
    }
  });

  for (const laneOrders of [false, true])
  it(`an unfilled capped Block target reserves its whole stack without repeating or funding a sibling (lane orders ${laneOrders})`, async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { notionalUsd: 25, maxExposureX: .5, laneOrders });
    const d = blockDecide({ config: 8, overall: 8, symbol: 8, direction: 8, indication: 8, type: 8 },
      { ...DEFAULT_BLOCK, mode: "overall", maxMult: 2 }, false);
    rt.paper.positions = [{ ...lane(sig("s"), "S0-USDT", 1, 10), vol: d.vol, legs: d.legs }];
    const place = ex.order.bind(ex);
    let entries = 0;
    ex.order = async (p) => {
      if (p.type === "MARKET" && p.symbol === "S0-USDT" && p.side === "BUY") {
        entries++;
        assert.equal(Number(p.quantity), 5);
        return { order: { orderId: "block-pending", status: "NEW", executedQty: 0 } };
      }
      return place(p);
    };
    await step();
    rt.paper.positions.push(lane(sig("m"), "S1-USDT", 1, 17));
    for (let i = 0; i < 3; i++) await step();
    assert.equal(entries, 1, "one unresolved Block entry retains one durable request identity");
    assert.equal(ex.positions.size, 0, "50 USD pending stack leaves none of the50 USD gross budget for a sibling");
  });

  it("weighted Block exits do not merge unrelated minimum-sized configs or change their one-unit rule", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { notionalUsd: 25, laneOrders: true });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10, 9), lane(sig("m"), "S0-USDT", 1, 10, 3)];
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 5, "two independent ordinary configs keep one25USD unit each");
    const map = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {});
    assert.equal(map.length, 2, "different config identities retain separate physical exits");
    assert.ok(map.every((x) => x.qty === 2.5));
  });

  it("a partial weighted Block fill reserves its unfilled remainder and cannot fund a new sibling", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { notionalUsd: 25, maxExposureX: .5, laneOrders: true });
    const d = blockDecide({ config: 8, overall: 8, symbol: 8, direction: 8, indication: 8, type: 8 },
      { ...DEFAULT_BLOCK, mode: "overall", maxMult: 2 }, false);
    rt.paper.positions = [{ ...lane(sig("s"), "S0-USDT", 1, 10), vol: d.vol, legs: d.legs }];
    const place = ex.order.bind(ex);
    let entries = 0;
    ex.order = async (p) => {
      if (p.type !== "MARKET" || p.symbol !== "S0-USDT" || p.side !== "BUY") return place(p);
      entries++;
      await place({ ...p, quantity: 2.5 });
      return { order: { orderId: "partial-block", status: "PARTIALLY_FILLED", executedQty: 2.5 } };
    };
    await step();
    rt.paper.positions.push(lane(sig("m"), "S1-USDT", 1, 17));
    await step();
    assert.equal(entries, 1);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 2.5);
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "25USD confirmed plus25pending already fills the50USD cap");
    assert.ok(ex.orders.some((o) => o.type === "STOP_MARKET"), "actual held quantity retains its protective backstop");
  });

  it("a coalesced Block stop suppresses all its source children while an unrelated held config continues", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { notionalUsd: 25, laneOrders: true });
    const d = blockDecide({ config: 8, overall: 8, symbol: 8, direction: 8, indication: 8, type: 8 },
      { ...DEFAULT_BLOCK, mode: "overall", maxMult: 2,
        sources: { config: true, overall: true, symbol: true, direction: true, indication: true, type: true } }, false);
    rt.paper.positions = [{ ...lane(sig("s"), "S0-USDT", 1, 10), vol: d.vol, legs: d.legs },
      lane(sig("m"), "S0-USDT", 1, 10)];
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 7.5);
    const physical = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {});
    const block = physical.find((p) => Object.keys(p.weights ?? {}).length === 7)!;
    assert.ok(block?.s?.oid, "the exact Block parent has its own physical stop");
    ex.triggerOrder(block.s.oid);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 2.5, "only the unrelated25USD config remains held");
    await step();
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 2.5, "no source child reopens its parent after its own stop");
    const suppressed = liveKv<Record<string, unknown>>(rt.db, "controlSuppressed") ?? {};
    assert.equal(Object.keys(suppressed).length, 7, "all logical Block allocations share the proven stop exit");
    assert.equal(Object.keys(liveKv(rt.db, "laneOrders") ?? {}).length, 1, "the unrelated config retains its separate protection");
  });

  for (const gate of ["gross", "risk", "backstop"] as const) {
    for (const outcome of ["refused", "partial", "pending", "confirmed"] as const) {
      it(`${gate}: a ${outcome} reduction releases only its confirmed quantity before a different set grows`, async () => {
        const { rt, ex, step } = setup();
        Object.assign(rt.settings.live, gate === "gross" ? { maxExposureX: 1 }
          : gate === "risk" ? { maxRiskPct: .02 } : { maxBackstopLossPct: .02 });
        rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
        await step();
        assert.equal(ex.positions.get("S0-USDT|LONG"), 10);
        const place = ex.order.bind(ex);
        ex.order = async (p) => {
          if (p.type !== "MARKET" || p.symbol !== "S0-USDT" || p.side !== "SELL") return place(p);
          if (outcome === "refused") throw new ExchangeRejected("definite reduce refusal", 101400);
          if (outcome === "pending") return { order: { orderId: "reduce", status: "NEW", executedQty: 0 } };
          if (outcome === "partial") {
            const q = Number(p.quantity) / 2;
            await place({ ...p, quantity: q });
            return { order: { status: "FILLED", executedQty: q } };
          }
          return place(p);
        };
        rt.paper.positions.push(lane(sig("m"), "S1-USDT", 1, 17));
        await step();
        const second = ex.positions.get("S1-USDT|LONG") ?? 0;
        if (outcome === "confirmed") assert.ok(second > 0, "a confirmed reduction really frees capacity");
        else {
          assert.equal(second, 0, "desired reductions are not spendable account capacity");
          const actions = liveKv<ControlStatus>(rt.db, "controlStatus")!.actions;
          assert.match(actions.find((a) => a.key === "S1-USDT|1")?.msg ?? "", /account .* (cap|budget)/);
        }
        assert.ok(gross(ex) <= 100.01, `actual gross ${gross(ex)} must stay within the original risk-equivalent cap`);
        assert.ok(ex.orders.some((o) => o.venueSymbol === "S0-USDT" && o.type === "STOP_MARKET"), "held protection survives");
      });
    }
  }

  it("an accepted unfilled entry reserves its entire account capacity across other keys and later steps", async () => {
    const { rt, ex, step } = setup();
    rt.settings.live.maxExposureX = 1;
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    const place = ex.order.bind(ex);
    let pendingOpens = 0;
    ex.order = async (p) => {
      if (p.type === "MARKET" && p.symbol === "S0-USDT" && p.side === "BUY") {
        pendingOpens++;
        return { order: { orderId: "entry", status: "NEW", executedQty: 0 } };
      }
      return place(p);
    };
    await step();
    rt.paper.positions.push(lane(sig("m"), "S1-USDT", 1, 17));
    await step();
    assert.equal(pendingOpens, 1, "the accepted order is not duplicated");
    assert.equal(ex.positions.size, 0, "the second set cannot spend the first set's unresolved 100 USD request");
  });

  it("a larger accepted minimum retry reserves its remainder before the next set opens", async () => {
    const { rt, ex, step } = setup();
    rt.settings.live = { ...rt.settings.live, notionalUsd: 50, maxExposureX: 1 };
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10), lane(sig("m"), "S1-USDT", 1, 17)];
    const place = ex.order.bind(ex);
    let calls = 0;
    ex.order = async (p) => {
      if (p.type === "MARKET" && p.symbol === "S0-USDT" && p.side === "BUY") {
        if (++calls === 1) throw new ExchangeRejected("The minimum order amount is 6 S0", 101400);
        assert.equal(p.quantity, 6);
        return { order: { orderId: "retry", status: "NEW", executedQty: 0 } };
      }
      return place(p);
    };
    await step();
    assert.equal(calls, 2);
    assert.equal(ex.positions.size, 0, "60 USD unresolved minimum plus 50 USD new target exceeds the 100 USD cap");
  });

  it("a partial entry reserves confirmed plus remaining quantity exactly once, allowing another set that fits", async () => {
    const { rt, ex, step } = setup();
    rt.settings.live = { ...rt.settings.live, notionalUsd: 50, maxExposureX: 1 };
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10), lane(sig("m"), "S1-USDT", 1, 17)];
    const place = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.type !== "MARKET" || p.symbol !== "S0-USDT" || p.side !== "BUY") return place(p);
      await place({ ...p, quantity: 1 });
      return { order: { orderId: "partial", status: "PARTIALLY_FILLED", executedQty: 1 } };
    };
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1);
    assert.ok((ex.positions.get("S1-USDT|LONG") ?? 0) > 0,
      "10 USD confirmed plus40 pending leaves50 for the second set; confirmed fills are not double-reserved");
    assert.ok(gross(ex) + 40 <= 100.01);
  });

  it("a resting pending MARKET row is never mistaken for zero-distance stop protection", async () => {
    const { rt, ex, step } = setup();
    rt.settings.live.maxRiskPct = .04;
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    const place = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.symbol === "S0-USDT" && p.type === "STOP_MARKET") throw new Error("unknown stop transport outcome");
      if (p.symbol === "S0-USDT" && p.type === "MARKET" && p.side === "BUY") {
        const q = Number(p.quantity) / 2;
        await place({ ...p, quantity: q });
        ex.orders.push({ id: "pending-market", venueSymbol: "S0-USDT", symbol: "S0-USDT", positionSide: "LONG",
          type: "MARKET", clientOrderId: String(p.clientOrderID), qty: Number(p.quantity) });
        return { order: { orderId: "pending-market", status: "PARTIALLY_FILLED", executedQty: q } };
      }
      return place(p);
    };
    const cancel = ex.cancel.bind(ex);
    ex.cancel = async (sym, id) => id === "pending-market" ? false : cancel(sym, id);
    await step();
    rt.paper.positions.push(lane(sig("m"), "S1-USDT", 1, 17));
    const result = await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), undefined);
    assert.match(result.control!.actions.find((a) => a.key === "S1-USDT|1")?.msg ?? "", /risk budget.*unknown/);
    assert.equal(ex.orders.some((o) => o.type === "STOP_MARKET"), false, "an entry reference price supplies no proven stop");
  });

  it("adding a narrow-stop sibling on a held key cannot dilute the wider quantity's risk to fund growth", async () => {
    const { rt, ex, step } = setup();
    rt.settings.live.maxRiskPct = .1;
    // Ordinary engine stops can be 10%; Signals retain their legacy 2% hard ceiling.
    rt.paper.positions = [lane("follow|ema-9-21@m5|tp1|sl10|tr0|h32", "S0-USDT", 1, 10, 1, .1)];
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 10);
    rt.paper.positions.push(lane(sig("m"), "S0-USDT", 1, 10, 1, .001));
    const result = await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 10, "the existing100 USD still has a10 USD wide-stop loss");
    assert.match(result.control!.actions.find((a) => a.kind === "increase")?.msg ?? "", /account risk budget/);
  });

  it("unfilled entries also reserve free margin when the configured floor is enabled", async () => {
    const { rt, ex, step } = setup();
    rt.settings.live = { ...rt.settings.live, notionalUsd: 50, minFreeMargin: 25 };
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10), lane(sig("m"), "S1-USDT", 1, 17)];
    const place = ex.order.bind(ex);
    let accepted = 0;
    ex.order = async (p) => {
      if (p.type === "MARKET" && p.side === "BUY") {
        accepted++;
        return { order: { orderId: String(p.symbol), status: "NEW", executedQty: 0 } };
      }
      return place(p);
    };
    await step();
    assert.equal(accepted, 1, "50 USD pending margin leaves only 25 above the floor, not enough for a second 50");
  });

  it("unknown held/pending cost and invalid equity cannot silently become zero budget usage", () => {
    const use = { notional: 100, risk: 5, worst: 6 };
    assert.match(accountGrowthBlock([{ ...use, notional: null }], use, 100, { maxExposureX: 2 })!, /unknown/);
    assert.match(accountGrowthBlock([{ ...use, risk: null }], use, 100, { maxRiskPct: .1 })!, /unknown/);
    for (const equity of [null, NaN, 0, -1, Infinity])
      assert.match(accountGrowthBlock([], use, equity, { maxExposureX: 2 })!, /equity unknown/);
    assert.equal(accountGrowthBlock([{ notional: null, risk: null, worst: null }], use, null, {}), null, "explicitly disabled caps stay disabled");
  });

  it("lane partial exits follow confirmed equity/ratio resizing and retain exact Block parent weights", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.sizing, { mode: "equityPct", pct: .1 });
    Object.assign(rt.settings.live, { ratio: 2, laneOrders: true });
    rt.paper.positions = [{ ...lane(sig("s"), "S0-USDT", 1, 10), vol: 2,
      legs: { overall: .6, symbol: .4 } }];
    for (const [equity, qty] of [[100, 4], [50, 2], [200, 8]]) {
      ex.equityUsd = equity;
      await step();
      assert.equal(ex.positions.get("S0-USDT|LONG"), qty);
      const map = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {});
      assert.equal(map.length, 1);
      assert.equal(map[0].qty, qty, "stored partial quantity follows actual owned resizing");
      assert.equal(Object.keys(map[0].weights ?? {}).length, 3);
      const stops = ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition);
      assert.deepEqual(stops.map((o) => o.qty), [qty], "one exact parent stop covers the owned stack");
    }
  });

  it("a refused partial-exit cancellation holds the reduction and preserves its durable quantity", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.sizing, { mode: "equityPct", pct: .1 });
    Object.assign(rt.settings.live, { laneOrders: true });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    await step();
    const original = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    assert.equal(original.qty, 1);
    const cancel = ex.cancel.bind(ex);
    let refuse = true;
    ex.cancel = async (sym, id) => refuse && id === original.s?.oid ? false : cancel(sym, id);
    ex.equityUsd = 50;
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1, "unknown cancellation cannot be followed by a market reduction");
    const held = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    assert.equal(held.qty, 1);
    assert.equal(held.s?.oid, original.s?.oid);
    assert.ok(ex.orders.some((o) => o.closePosition), "the backstop remains");
    refuse = false;
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), .5);
    assert.equal(Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0].qty, .5);
  });

  it("a stop filling during resize cancellation is reconciled before any second reduction or reopen", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.sizing, { mode: "equityPct", pct: .1 });
    Object.assign(rt.settings.live, { laneOrders: true });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    await step();
    const original = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    const cancel = ex.cancel.bind(ex);
    let raced = false;
    ex.cancel = async (sym, id) => {
      if (!raced && id === original.s?.oid) { raced = true; ex.triggerOrder(id); return false; }
      return cancel(sym, id);
    };
    ex.equityUsd = 50;
    const before = ex.log.filter((o) => o.type === "MARKET").length;
    await step();
    assert.equal(ex.positions.size, 0);
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, before, "the already-filled stop is not reduced twice");
    await step();
    assert.equal(ex.positions.size, 0, "the stopped parent cannot reopen");
  });

  it("partial fills replace exact exits only for the confirmed quantity, never the pending remainder", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.sizing, { mode: "equityPct", pct: .1 });
    Object.assign(rt.settings.live, { laneOrders: true });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    await step();
    const place = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.type !== "MARKET" || p.side !== "BUY") return place(p);
      await place({ ...p, quantity: .5 });
      return { order: { orderId: "pending-increase", status: "PARTIALLY_FILLED", executedQty: .5 } };
    };
    ex.equityUsd = 200;
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1.5);
    const map = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {});
    assert.equal(map[0].qty, 1.5);
    assert.deepEqual(ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition).map((o) => o.qty), [1.5]);
    const count = ex.log.filter((o) => o.type === "MARKET").length;
    await step();
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, count, "pending remainder is not requested again");
  });

  it("a partially filled reduction retains actual ownership and never installs an oversized partial exit", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.sizing, { mode: "equityPct", pct: .1 });
    Object.assign(rt.settings.live, { laneOrders: true });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    await step();
    const place = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.type !== "MARKET" || p.side !== "SELL") return place(p);
      await place({ ...p, quantity: .25 });
      return { order: { orderId: "pending-reduction", status: "PARTIALLY_FILLED", executedQty: .25 } };
    };
    ex.equityUsd = 50;
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), .75);
    const partials = ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition);
    assert.deepEqual(partials.map((o) => o.qty), [.5], "only the intended retained share has the exact partial exit");
    assert.ok(ex.orders.some((o) => o.closePosition), "the unconfirmed reduction remainder retains the whole-side backstop");
    const count = ex.log.filter((o) => o.type === "MARKET").length;
    await step();
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, count);
    assert.equal(ex.positions.get("S0-USDT|LONG"), .75);
  });

  it("native one-way exits divide only the net owned quantity across the surviving independent parents", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "oneway", notionalUsd: 20 });
    const place = ex.order.bind(ex);
    // This fixture emulates a net venue through the same confirmed-fill / resting-order interface.
    ex.order = async (p) => {
      if (p.positionSide !== "BOTH") return place(p);
      const reduce = p.reduceOnly === "true" || p.closePosition === "true" || p.type !== "MARKET";
      const long = reduce ? p.side === "SELL" : p.side === "BUY";
      return place({ ...p, positionSide: long ? "LONG" : "SHORT" });
    };
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10), lane(sig("m"), "S0-USDT", 1, 10),
      lane(sig("w"), "S0-USDT", -1, 10)];
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 2, "two longs minus one short fund one20USD unit");
    const physical = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {});
    assert.equal(physical.length, 2, "only the surviving-side parent configs have exits");
    assert.ok(physical.every((p) => p.side === 1 && p.qty === 1));
    assert.equal(physical.reduce((sum, p) => sum + p.qty, 0), 2);
    assert.deepEqual(ex.orders.filter((o) => !o.closePosition && o.type === "STOP_MARKET").map((o) => o.qty), [1, 1]);
  });

  it("a measured conditional partial fill protects the exact remainder without reopening it or diluting siblings", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { laneOrders: true, notionalUsd: 10 });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10), lane(sig("m"), "S0-USDT", 1, 10)];
    await step();
    const original = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {}).find((p) => p.id.includes(sig("s")))!;
    assert.equal(original.qty, 1);
    ex.positions.set("S0-USDT|LONG", 1.6);
    const status = ex.orderStatus.bind(ex);
    const receiptClient: ExchangeClient = ex;
    receiptClient.orderStatus = async (sym, id) => id === original.s?.oid
      ? { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: .4, avgPrice: 9.8 } } : status(sym, id);
    const count = ex.log.filter((o) => o.type === "MARKET").length;
    for (let i = 0; i < 3; i++) await step();
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, count, "the stopped .4 share is never repurchased");
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1.6);
    const parents = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {});
    assert.deepEqual(parents.map((p) => p.qty).sort(), [.6, 1]);
    assert.deepEqual(ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition).map((o) => o.qty).sort(), [.6, 1]);
    const rows = rt.db.all<{ qty: number }>("SELECT qty FROM live_orders WHERE coid LIKE 'lanefill-%'");
    assert.deepEqual(rows.map((r) => r.qty), [.4], "one measured cumulative slice is booked once");
  });

  it("a full conditional fill retains a refused sibling identity until its cancellation confirms", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { laneOrders: true, notionalUsd: 10 });
    const first = { ...lane(sig("s"), "S0-USDT", 1, 10), target: 11 };
    rt.paper.positions = [first, lane(sig("m"), "S0-USDT", 1, 10)];
    await step();
    const original = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {}).find((p) => p.id.includes(sig("s")))!;
    assert.ok(original.t?.oid);
    ex.triggerOrder(original.s!.oid!);
    const cancel = ex.cancel.bind(ex);
    let refuse = true;
    ex.cancel = async (sym, id) => refuse && id === original.t?.oid ? false : cancel(sym, id);
    await step();
    const pending = liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders")![original.id];
    assert.equal(pending.qty, 0);
    assert.ok(pending.closed);
    assert.equal(pending.t?.oid, original.t?.oid, "a refused sibling never loses its durable identity");
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1);
    refuse = false;
    await step();
    assert.equal(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders")![original.id], undefined);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1);
  });

  it("a terminal cancellation without cumulative quantity remains unknown until zero execution is measured", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.sizing, { mode: "equityPct", pct: .1 });
    Object.assign(rt.settings.live, { laneOrders: true });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    await step();
    const original = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    const status = ex.orderStatus.bind(ex);
    let missing = true;
    const receiptClient: ExchangeClient = ex;
    receiptClient.orderStatus = async (sym, id) => missing && id === original.s?.oid
      ? { order: { orderId: id, status: "CANCELED" } } : status(sym, id);
    ex.equityUsd = 50;
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1);
    assert.equal(Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0].s?.coid, original.s?.coid);
    missing = false;
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), .5);
  });

  it("a successful cancellation that reveals a partial fill cannot be followed by a double reduction", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.sizing, { mode: "equityPct", pct: .1 });
    Object.assign(rt.settings.live, { laneOrders: true });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    await step();
    const original = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    const cancel = ex.cancel.bind(ex);
    const status = ex.orderStatus.bind(ex);
    let partial = false;
    ex.cancel = async (sym, id) => {
      const ok = await cancel(sym, id);
      if (!partial && id === original.s?.oid) { partial = true; ex.positions.set("S0-USDT|LONG", .6); }
      return ok;
    };
    const receiptClient: ExchangeClient = ex;
    receiptClient.orderStatus = async (sym, id) => partial && id === original.s?.oid
      ? { order: { orderId: id, status: "CANCELLED", executedQty: .4, avgPrice: 9.8 } } : status(sym, id);
    ex.equityUsd = 50;
    const count = ex.log.filter((o) => o.type === "MARKET").length;
    await step();
    assert.equal(ex.log.filter((o) => o.type === "MARKET").length, count, "the already filled .4 is reconciled first");
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), .4,
      "after reconciliation, the remaining requested .1 reduction follows the existing .2 venue-minimum rule");
    assert.equal(ex.log.filter((o) => o.type === "MARKET").at(-1)?.quantity, .2,
      "the next reduction uses the fresh .6 holding, not the stale original1");
    assert.deepEqual(rt.db.all<{ qty: number }>("SELECT qty FROM live_orders WHERE coid LIKE 'lanefill-%'").map((r) => r.qty), [.4]);
  });

  it("a failed configured state checkpoint keeps the held backstop and sends no partial conditional", async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "cts-block-state-failure-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const stateDir = join(dir, "state");
    const db = new CoreDb(":memory:", { statePath: join(stateDir, "state.json") });
    db.journalPath = join(dir, "state.journal");
    const { rt, ex, step } = setup(db);
    Object.assign(rt.settings.live, { laneOrders: true, notionalUsd: 10 });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    const place = ex.order.bind(ex);
    let blocked = false;
    ex.order = async (p) => {
      const result = await place(p);
      if (!blocked && p.type === "STOP_MARKET" && p.closePosition === "true") {
        blocked = true;
        rmSync(stateDir, { recursive: true, force: true });
        writeFileSync(stateDir, "blocks the configured state directory");
      }
      return result;
    };
    await step();
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1);
    assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition).length, 0);
    assert.ok(ex.orders.some((o) => o.closePosition), "existing own-position protection remains");
    assert.ok(db.lastStateError);
    assert.equal(db.flushState(), false, "failed configured storage cannot become intentional memory mode");
    db.db.close();
  });

  it("a failed pending ownership journal prevents funded native submission", async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "cts-block-journal-failure-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const db = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
    const blocker = join(dir, "not-a-directory");
    writeFileSync(blocker, "blocks journal");
    db.journalPath = join(blocker, "state.journal");
    const { rt, ex, step } = setup(db);
    Object.assign(rt.settings.live, { laneOrders: true, notionalUsd: 10 });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    await step();
    assert.ok(db.lastJournalError);
    assert.equal(ex.positions.size, 0);
    assert.equal(ex.log.filter((p) => p.type === "MARKET").length, 0, "an unjournaled pending identity cannot fund an order");
    db.flushState();
    db.db.close();
  });

  it("conditional provisional IDs and partial caps survive an immediate state/journal reopen", async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "cts-block-durable-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, "state.json");
    const db = new CoreDb(":memory:", { statePath: path });
    db.journalPath = join(dir, "state.journal");
    const { rt, ex, step } = setup(db);
    Object.assign(rt.settings.live, { laneOrders: true, notionalUsd: 10 });
    const parent = { ...lane(sig("s"), "S0-USDT", 1, 10), target: 11 };
    rt.paper.positions = [parent];
    const place = ex.order.bind(ex);
    let checked = 0;
    ex.order = async (p) => {
      if (p.type !== "MARKET" && p.closePosition !== "true") {
        const checkpoint = JSON.parse(readFileSync(path, "utf8"));
        const rows = Object.values(checkpoint.laneOrders) as LaneOrder[];
        assert.ok(rows.some((row) => row.s?.coid === p.clientOrderID || row.t?.coid === p.clientOrderID),
          "the actual state file contains this stop/TP coid before the venue can accept it");
        checked++;
      }
      return place(p);
    };
    await step();
    assert.equal(checked, 2);
    const first = Object.values(db.kvGet<Record<string, LaneOrder>>("laneOrders")!)[0];
    assert.ok(first.s?.oid && first.t?.oid, "completed venue IDs are also flushed into actual DB state");
    ex.positions.set("S0-USDT|LONG", .6);
    const status = ex.orderStatus.bind(ex);
    const receiptClient: ExchangeClient = ex;
    receiptClient.orderStatus = async (sym, id) => id === first.s?.oid
      ? { order: { orderId: id, status: "PARTIALLY_FILLED", executedQty: .4, avgPrice: 9.8,
        updateTime: Date.now() - 1000 } } : status(sym, id);
    await step();
    const restored = new CoreDb(":memory:", { statePath: path });
    restored.journalPath = db.journalPath;
    restored.replayJournal();
    assert.equal(restored.kvGet<Record<string, number>>("laneQuantityCaps")![first.id], .6);
    assert.equal(restored.kvGet<Record<string, LaneOrder>>("laneOrders")![first.id].qty, .6);
    assert.deepEqual(restored.all<{ qty: number }>("SELECT qty FROM live_orders WHERE coid LIKE 'lanefill-%'").map((r) => r.qty), [.4]);
    const reopened = fakeRt(restored).rt;
    reopened.settings = structuredClone(rt.settings);
    reopened.paper.positions = [parent];
    const count = ex.log.filter((p) => p.type === "MARKET").length;
    await stepLive(core(reopened), [], 1, ex);
    assert.equal(ex.log.filter((p) => p.type === "MARKET").length, count, "restart does not repurchase the exited share");
    restored.db.close();
    db.db.close();
  });

  it("an accepted conditional timeout retains its provisional coid and is never placed twice", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { laneOrders: true, notionalUsd: 10 });
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    const place = ex.order.bind(ex);
    let timedOut = false;
    ex.order = async (p) => {
      const result = await place(p);
      if (!timedOut && p.type === "STOP_MARKET" && p.closePosition !== "true") {
        timedOut = true;
        throw new Error("transport timeout after actual conditional acceptance");
      }
      return result;
    };
    await step();
    const provisional = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    assert.ok(provisional.s?.coid);
    resetLiveBackoff();
    for (let i = 0; i < 3; i++) await step();
    assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition).length, 1);
    const adopted = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    assert.equal(adopted.s?.coid, provisional.s?.coid);
    assert.ok(adopted.s?.oid, "the resting coid recovers its venue identity");
  });

  it("an unknown cancellation while moving a stop retains its order identity and sends no duplicate", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { laneOrders: true, notionalUsd: 10 });
    const parent = lane(sig("s"), "S0-USDT", 1, 10);
    rt.paper.positions = [parent];
    await step();
    const original = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0];
    const cancel = ex.cancel.bind(ex);
    ex.cancel = async (sym, id) => id === original.s?.oid ? false : cancel(sym, id);
    const status = ex.orderStatus.bind(ex);
    const receiptClient: ExchangeClient = ex;
    receiptClient.orderStatus = async (sym, id) => id === original.s?.oid ? null : status(sym, id);
    parent.stop = 9.9;
    await step();
    assert.equal(ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition).length, 1);
    assert.equal(Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})[0].s?.coid, original.s?.coid);
  });

  it("coalesced parent quantities snap down to coarse venue lot steps", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.live, { laneOrders: true, notionalUsd: 10, maxNotionalUsd: 10 });
    const contracts = ex.contracts.bind(ex);
    ex.contracts = async () => {
      const specs = await contracts();
      specs.set("S0-USDT", { ...specs.get("S0-USDT")!, minQty: .25, step: .25, qtyPrec: 2 });
      return specs;
    };
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10), lane(sig("m"), "S0-USDT", 1, 10),
      lane(sig("w"), "S0-USDT", 1, 10)];
    await step();
    const partials = ex.orders.filter((o) => o.type === "STOP_MARKET" && !o.closePosition);
    assert.ok(partials.every((o) => Math.abs(o.qty! / .25 - Math.round(o.qty! / .25)) < 1e-12));
    assert.ok(partials.reduce((sum, o) => sum + o.qty!, 0) <= ex.positions.get("S0-USDT|LONG")!);
  });

  it("DCA and Axis minimum-lane units remove intrinsic ladder weight for every Block mode", () => {
    const { rt } = setup();
    for (const suffix of ["dca", "axis"])
      for (const overall of [false, true]) {
        const cfg = `${sig("s")}|${suffix}`;
        const base = { ...lane(cfg, "S0-USDT", 1, 10), w: 4 };
        const raised = { ...base, vol: 8, level: 2, ...(overall ? { legs: { overall: 1 } } : {}) };
        const raisedLanes = laneContributions(core(rt), undefined, [raised] as never);
        assert.equal(raisedLanes.reduce((sum, l) => sum + (l.laneUnits ?? 1), 0), 2,
          `${suffix} external Block2 funds2units regardless of intrinsic4 or source legs`);
        assert.equal(raisedLanes.reduce((sum, l) => sum + l.vol, 0), 8, "fixed/equity notional volume is unchanged");
        const plain = laneContributions(core(rt), undefined, [{ ...base, vol: 4, level: 0 }] as never);
        assert.equal(plain.reduce((sum, l) => sum + (l.laneUnits ?? 1), 0), 1);
      }
    const invalid = laneContributions(core(rt), undefined,
      [{ ...lane(sig("s"), "S0-USDT", 1, 10), vol: 8, w: NaN, level: 2 }] as never);
    const out = controlTargets(invalid, new Map([["S0-USDT", 10]]), { notionalUsd: 10, ratio: 1,
      maxNotionalUsd: Infinity, maxPositions: 0, rebalancePct: 0, laneMode: true });
    assert.equal(out.targets.length, 0, "unknown external unit basis cannot fund growth");
    assert.equal(out.skipped[0].keep, "S0-USDT|1", "unknown sizing retains protection of an existing holding");
  });

  it("minimum-lane risk weights match equal funded shares despite unequal intrinsic model volume", () => {
    const cs = { notionalUsd: 10, ratio: 1, maxNotionalUsd: Infinity, maxPositions: 0,
      rebalancePct: 0, laneMode: true, minStopPct: 0 };
    const base = { cfg: sig("s"), sym: "S0-USDT", side: 1 as const };
    const target = controlTargets([{ ...base, vol: 10, sl: .01 }, { ...base, vol: 1, sl: .2 }],
      new Map([["S0-USDT", 10]]), cs).targets[0];
    assert.equal(target.qty, 2);
    assert.ok(Math.abs(target.riskDist! - .105) < 1e-12, "equal funded units have equal weight in mark-to-stop risk");
  });

  it("one-way lane units net fractional Block weights and choose the side actually funded", () => {
    const cs = { notionalUsd: 10, ratio: 1, maxNotionalUsd: Infinity, maxPositions: 0,
      rebalancePct: 0, laneMode: true, positionMode: "oneway" as const };
    const base = { cfg: sig("s"), sym: "S0-USDT", sl: .02 };
    const out = controlTargets([{ ...base, side: 1, vol: 10, laneUnits: 1 },
      { ...base, side: -1, vol: 2, laneUnits: 2 }], new Map([["S0-USDT", 10]]), cs).targets;
    assert.equal(out.length, 1);
    assert.equal(out[0].side, -1, "one short unit remains; intrinsic long volume cannot reverse it");
    assert.equal(out[0].laneUnits, 1);
    assert.equal(out[0].qty, 1);
    const balanced = controlTargets([{ ...base, side: 1, vol: 2, laneUnits: 1.4 },
      { ...base, side: -1, vol: 1, laneUnits: 1.4 }], new Map([["S0-USDT", 10]]), cs).targets;
    assert.equal(balanced.length, 0, "equal funded units offset completely");
  });

  it("the equity percent and volume factor follow verified balance gains and losses without paper balance fallback", async () => {
    const { rt, ex, step } = setup();
    Object.assign(rt.settings.sizing, { mode: "equityPct", pct: .1 });
    rt.settings.live.ratio = 2;
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10)];
    for (const [equity, qty] of [[100, 2], [50, 1], [200, 4]]) {
      ex.equityUsd = equity;
      await step();
      assert.equal(ex.positions.get("S0-USDT|LONG"), qty, `${equity} × 10% × volume factor 2 / price 10`);
    }
  });
});

describe("current-equity stop risk and per-position trailing mode", () => {
  it("a profitable paper trail still risks mark→stop for long and short late live adoption", () => {
    const { rt } = setup();
    for (const side of [1, -1] as const) {
      const entry = side === 1 ? 100 : 120;
      const stop = side === 1 ? 105 : 115;
      const positions = [{ ...lane(sig("s"), "S0-USDT", side, entry), stop }];
      const contributions = laneContributions(core(rt), new Map([["S0-USDT", 110]]), positions as never);
      assert.ok(Math.abs(contributions[0].risk! - 5 / 110) < 1e-12);
      const targets = controlTargets(contributions, new Map([["S0-USDT", 110]]), {
        notionalUsd: 100, ratio: 1, maxNotionalUsd: Infinity, maxPositions: 0, rebalancePct: 0,
      }).targets;
      const result = scaleToRisk(targets, 100, .01, (_s, q) => q)!;
      assert.ok(result.factor < .23, "100 USD at a 4.545% current loss cannot fit a 1 USD budget unscaled");
      assert.ok(Math.abs(targets[0].notional * targets[0].riskDist! - 1) < 1e-10);
    }
  });

  it("a higher peak increases current giveback risk until the own trailing stop follows", () => {
    const { rt } = setup();
    const positions = [{ ...lane(sig("s"), "S0-USDT", 1, 100), stop: 105 }];
    const risk = (px: number) => laneContributions(core(rt), new Map([["S0-USDT", px]]), positions as never)[0].risk!;
    assert.ok(risk(120) > risk(110));
    positions[0].stop = 117;
    assert.ok(risk(120) < 5 / 110);
  });

  it("capped Signal targets and trailing-only no-target mode survive the global engine free-trail setting", () => {
    const { rt } = setup();
    rt.settings.grid.trailFree = true;
    const cfg = "follow|sig-ema-cross-s@m5|tp1|sl1|tr1|h32";
    const positions = [
      { ...lane(cfg, "S0-USDT", 1, 10), target: 11, trailOn: true, trailFree: false },
      { ...lane(cfg.replace("tp1", "tp0") + "|to", "S1-USDT", 1, 17), target: 0, trailOn: true, trailOnly: true, trailFree: true },
      { ...lane(cfg, "S2-USDT", 1, 24), target: 25, trailOn: true },
      { ...lane(cfg.replace("tp1", "tp0") + "|to", "S3-USDT", 1, 31), target: 32, trailOn: true },
      { ...lane("follow|ema-9-21@m5|tp1|sl1|tr1|h32", "S4-USDT", 1, 38), target: 39, trailOn: true },
    ];
    const contributions = laneContributions(core(rt), new Map([["S0-USDT", 10], ["S1-USDT", 17]]), positions as never);
    assert.equal(contributions[0].tgt, 11);
    assert.equal(contributions[1].tgt, undefined);
    assert.equal(contributions[2].tgt, 25, "legacy Signal flags absent never inherit engine free-trail mode");
    assert.equal(contributions[3].tgt, undefined, "explicit trailing-only config recovers no-target mode after legacy load");
    assert.equal(contributions[4].tgt, undefined, "legacy engine positions retain their documented global fallback");
    assert.ok(contributions.every((p) => p.stopPx! > 0), "each independent set retains its custom stop");
  });
});
