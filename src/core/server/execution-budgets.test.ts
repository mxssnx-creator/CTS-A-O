import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { accountGrowthBlock, controlTargets, scaleToRisk } from "./live.ts";
import { laneContributions, liveKv, resetLiveBackoff, stepLive, type ControlStatus } from "./live.server.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { SimExchange, fakeRt, lane } from "../test-support.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
const core = (rt: unknown) => rt as CoreRuntime;
const sig = (range: string) => `follow|sig-ema-cross-${range}@m5|tp1|sl1|tr0|h32`;
const setup = () => {
  const { rt, prices } = fakeRt(new CoreDb(":memory:"));
  rt.settings.live = { ...rt.settings.live, notionalUsd: 100, maxNotionalUsd: 0, maxPositions: 0,
    rebalancePct: 0, ratio: 1, top: 0, minFreeMargin: 0, maxPositionX: 0, maxExposureX: 0,
    maxRiskPct: 0, maxBackstopLossPct: 0, maxChase: 0 };
  const ex = new SimExchange().withEquity(100);
  return { rt, prices, ex, step: () => stepLive(core(rt), [], 1, ex) };
};
const gross = (ex: SimExchange) => [...ex.positions].reduce((sum, [key, q]) => sum + q * (10 + 7 * Number(key.slice(1).split("-")[0])), 0);

describe("actual execution account budgets across independent Signal sets", () => {
  afterEach(() => resetLiveBackoff());

  for (const gate of ["gross", "risk", "backstop"] as const) {
    for (const outcome of ["refused", "partial", "pending", "confirmed"] as const) {
      it(`${gate}: a ${outcome} reduction releases only its confirmed quantity before a different set grows`, async () => {
        const { rt, ex, step } = setup();
        Object.assign(rt.settings.live, gate === "gross" ? { maxExposureX: 1 }
          : gate === "risk" ? { maxRiskPct: .04 } : { maxBackstopLossPct: .048 });
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

  it("adding a narrow-stop sibling on a held key cannot dilute the wider quantity's risk to fund growth", async () => {
    const { rt, ex, step } = setup();
    rt.settings.live.maxRiskPct = .1;
    rt.paper.positions = [lane(sig("s"), "S0-USDT", 1, 10, 1, .1)];
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
