// Lane control orders (live.laneOrders): every lane on the exchange carries its own partial stop and take-profit at
// its own levels; a lane order that fills is that lane's exit (booked at the fill, its sibling cancelled, the lane
// never reopened); a lane that leaves is cancelled before it is reduced, never exited twice; a trailed stop follows
// the lane toward the price; at most 60 orders a step (4 in flight), stops first.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { liveKv, resetLiveBackoff, stepLive, type ControlStatus } from "./live.server.ts";
import { coveredLanes, goneOrderOf, planLaneOrders, swapCount, trimLaneOrders, type LaneOrder, type LaneWant } from "./lane-orders.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { configId } from "../pipeline/pipeline.ts";
import { pxTick } from "../exchange/bingx.server.ts";
import { authorizeSyntheticLanes, SimExchange, syntheticExecutionRun, type SimOrder } from "../test-support.ts";
import type { LiveGate } from "../live-validation.ts";
import { ownCoidKind } from "./live.ts";

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;

// a lane's own order (V stop, Y take-profit) — the position's backstop and take-profit are S / T (in hedge mode both are
// quantity-bounded now: the kind, not closePosition, tells them apart)
const isLane = (o: SimOrder) => /^[VY]$/.test(ownCoidKind(o.clientOrderId, DEFAULT_SETTINGS.live.connId));

class Venue extends SimExchange {
  oneStopPerSide = true;
  of(k: string, type: string) {
    const [sym, ps] = k.split("|");
    return this.orders.filter((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === type);
  }
  partial(k: string, type: string) {
    return this.of(k, type).filter((o) => isLane(o));
  }
}

type Pos = {
  cfg: string;
  sym: string;
  side: 1 | -1;
  entry: number;
  stop: number;
  vol: number;
  entryT: number;
  target?: number;
  trailOn?: boolean;
  level?: number;
  legs?: Record<string, number>;
};

function rtOf() {
  const prices = [
    { sym: "S1-USDT", last: 10 },
    { sym: "S2-USDT", last: 20 },
  ];
  let positions: Pos[] = [];
  const rt = {
    generation: 1,
    db: new CoreDb(":memory:"),
    settings: {
      ...DEFAULT_SETTINGS,
      sizing: { mode: "minQty" as const, pct: 0.02 },
      live: {
        ...DEFAULT_SETTINGS.live,
        enabled: true,
        mode: "overall" as const,
        positionMode: "hedge" as const,
        notionalUsd: 10,
        ratio: 1,
        maxNotionalUsd: 0,
        maxPositions: 0,
        rebalancePct: 0,
        top: 0,
        minFreeMargin: 0,
        maxPositionX: 0,
        maxExposureX: 0,
        maxRiskPct: 0,
        maxBackstopLossPct: 0,
        maxChase: 0,
        signalWeight: 1,
        laneOrders: true,
      },
    },
    // Settled synthetic accepted outcomes and independent owned-paper execution evidence are declared per exact
    // fixture lane below. A summary alone cannot authorize admission or manufacture missing proof.
    sim: syntheticExecutionRun([]),
    livePromotionGate: undefined as ((lane: Pick<Pos, "cfg" | "sym" | "side">, at?: number) => LiveGate) | undefined,
    status: { lastBarT: Math.floor(Date.now() / H) * H },
    paper: {
      get positions(): Pos[] { return positions; },
      set positions(next: Pos[]) {
        positions = new Proxy(next, { set(target, property, value) {
          const changed = Reflect.set(target, property, value);
          if (property !== "length") authorizeSyntheticLanes(rt, target);
          return changed;
        } });
        authorizeSyntheticLanes(rt, positions);
      },
    },
    tickersAt: 0,
    freshTickers: async () => {
      rt.tickersAt = Date.now();
      return prices;
    },
  };
  const price = (sym: string, last: number) => {
    prices.find((p) => p.sym === sym)!.last = last;
  };
  return { rt, price };
}

// S1 at 10: the exchange minimum is max(0.001, 2 USDT / 10) = 0.2 — one lane
const LANE = 0.2;
const lane = (i: number, sym: string, side: 1 | -1, entry: number, sl: number, tp?: number): Pos => ({
  cfg: `combo|ema-9-21@m15|l${i}`,
  sym,
  side,
  entry,
  stop: entry * (1 - side * sl),
  vol: 1,
  entryT: 1000 + i,
  ...(tp !== undefined ? { target: entry * (1 + side * tp) } : {}),
});
const near = (a: number, b: number, eps = 2.5e-4) => Math.abs(a - b) < eps;

describe("lane orders: the planner (pure)", () => {
  const w = (id: string, entryT: number, stop = 9.5, target?: number): LaneWant => ({
    id,
    key: "S1-USDT|1",
    sym: "S1-USDT",
    side: 1,
    stop,
    ...(target ? { target } : {}),
    entryT,
  });
  it("covers the lanes already on the exchange first, then new ones by entry, as many as the position holds", () => {
    const map: Record<string, LaneOrder> = {
      b: { id: "b", key: "S1-USDT|1", sym: "S1-USDT", side: 1, qty: LANE, at: 5 },
    };
    const cov = coveredLanes([w("a", 1), w("b", 9), w("c", 2)], map, 0.4 + 1e-12, LANE);
    assert.deepEqual(
      cov.map((x) => x.id),
      ["b", "a"],
    );
    assert.equal(coveredLanes([w("a", 1)], {}, 0.1, LANE).length, 0, "less than one lane held: none");
  });
  it("moves a trailed stop toward the price only (first: it keeps its slot), then new orders nearest first", () => {
    const map: Record<string, LaneOrder> = {
      a: { id: "a", key: "S1-USDT|1", sym: "S1-USDT", side: 1, qty: LANE, at: 1, s: { coid: "XA", px: 9.5 }, t: { coid: "XB", px: 10.5 } },
      b: { id: "b", key: "S1-USDT|1", sym: "S1-USDT", side: 1, qty: LANE, at: 2 },
    };
    const resting = new Set(["XA", "XB"]);
    const o = { px: () => 10, stopPx: (x: LaneWant) => x.stop, targetPx: (x: LaneWant) => x.target ?? 0, budget: 10 };
    const acts = planLaneOrders([w("a", 1, 9.8, 10.5), w("b", 2, 9.5, 10.6)], map, resting, o);
    assert.deepEqual(
      acts.map((x) => `${x.kind} ${x.lane}`),
      ["moveStop a", "placeStop b", "placeTarget b"],
    );
    // a stop that would move away from the price never moves
    assert.equal(planLaneOrders([w("a", 1, 9.3, 10.5)], map, resting, o).length, 0);
    // the budget cuts the tail
    assert.deepEqual(
      planLaneOrders([w("a", 1, 9.8, 10.5), w("b", 2, 9.5, 10.6)], map, resting, { ...o, budget: 2 }).map((x) => x.kind),
      ["moveStop", "placeStop"],
    );
    // a price already past the stop: left to the desk's exit
    assert.equal(planLaneOrders([w("b", 2, 10.2)], map, resting, o).length, 0);
    // the target is gone from the lane: its take-profit is dropped
    assert.deepEqual(
      planLaneOrders([w("a", 1, 9.5)], map, resting, o).map((x) => x.kind),
      ["dropTarget"],
    );
  });
  it("under the venue's cap: the nearest levels first; a trim cancels the farthest first", () => {
    const o = { px: () => 10, stopPx: (x: LaneWant) => x.stop, targetPx: (x: LaneWant) => x.target ?? 0, budget: 60 };
    const acts = planLaneOrders([w("a", 1, 9.0, 12), w("b", 2, 9.8, 10.9), w("c", 3, 9.5, 10.1)], {}, new Set(), { ...o, slots: 3 });
    assert.deepEqual(
      acts.map((x) => `${x.kind} ${x.lane}`),
      ["placeTarget c", "placeStop b", "placeStop c"],
      "the three levels nearest to the price",
    );
    assert.equal(planLaneOrders([w("a", 1, 9.0, 12)], {}, new Set(), { ...o, slots: 0 }).length, 0, "no slot left: nothing new");
    const map: Record<string, LaneOrder> = {
      a: { id: "a", key: "S1-USDT|1", sym: "S1-USDT", side: 1, qty: LANE, at: 1, s: { coid: "A1", px: 9.0 }, t: { coid: "A2", px: 12 } },
      b: { id: "b", key: "S1-USDT|1", sym: "S1-USDT", side: 1, qty: LANE, at: 2, s: { coid: "B1", px: 9.8 } },
    };
    assert.deepEqual(trimLaneOrders(map, new Set(["A1", "A2", "B1"]), () => 10, 5, 3), [
      { lane: "a", which: "t" },
      { lane: "a", which: "s" },
    ]);
    assert.deepEqual(trimLaneOrders(map, new Set(["A1", "A2", "B1"]), () => 10, 3, 3), []);
  });
  it("a full cap swaps the farthest resting orders for candidates less than half as far, a few a step", () => {
    assert.equal(swapCount([0.01, 0.02, 0.09], [0.2, 0.18, 0.05]), 2, "0.01 < 0.1, 0.02 < 0.09; 0.09 ≥ 0.025");
    assert.equal(swapCount([0.01, 0.01, 0.01, 0.01, 0.01, 0.01], [0.2, 0.2, 0.2, 0.2, 0.2, 0.2]), 4, "at most 4");
    assert.equal(swapCount([0.15], [0.2]), 0, "barely nearer: no churn");
  });
  it("reads the venue's answer for an order that left the book", () => {
    assert.deepEqual(goneOrderOf({ order: { status: "FILLED", avgPrice: "9.49", stopPrice: "9.5" } }), { status: "filled", px: 9.49 });
    assert.deepEqual(goneOrderOf({ order: { status: "CANCELLED", avgPrice: "0" } }), { status: "cancelled" });
    assert.deepEqual(goneOrderOf(null), { status: "unknown" });
    assert.deepEqual(goneOrderOf({ order: { status: "FILLED", avgPrice: 0, stopPrice: 9.8, executedQty: 1 } }),
      { status: "unknown" }, "a trigger is not measured execution price");
    assert.deepEqual(goneOrderOf({ order: { status: "FILLED", avgPrice: Infinity, executedQty: 1 } }),
      { status: "unknown" }, "execution price must be finite");
    assert.deepEqual(goneOrderOf({ order: { status: "PARTIALLY_FILLED", avgPrice: "9.8", executedQty: "0.4" } }),
      { status: "filled", px: 9.8, qty: .4, complete: false });
    assert.deepEqual(goneOrderOf({ order: { status: "FILLED", avgPrice: "9.8", executedQty: "1" } }),
      { status: "filled", px: 9.8, qty: 1, complete: true });
    assert.deepEqual(goneOrderOf({ order: { status: "CANCELLED", avgPrice: "9.8", executedQty: "0.4" } }),
      { status: "filled", px: 9.8, qty: .4, complete: true });
  });
});

describe("lane orders: the control step", { timeout: 120_000 }, () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());
  const clock = () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    return (ms: number) => mock.timers.tick(ms);
  };

  it("every lane on the exchange: one minimum each, its own stop and take-profit at its own levels, long and short", async () => {
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = [
      lane(1, "S1-USDT", 1, 10, 0.02, 0.03),
      lane(2, "S1-USDT", 1, 10, 0.04, 0.05),
      lane(3, "S1-USDT", 1, 10, 0.03),
      lane(4, "S2-USDT", -1, 20, 0.02, 0.04),
    ];
    await step();
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, 3 * LANE), `three lanes: ${ex.positions.get("S1-USDT|LONG")}`);
    const ls = ex.partial("S1-USDT|LONG", "STOP_MARKET").map((o) => o.stopPrice!).sort();
    const lt = ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").map((o) => o.stopPrice!).sort();
    assert.deepEqual(ls.map((x) => x.toFixed(2)), ["9.60", "9.70", "9.80"], "each lane's own stop");
    assert.deepEqual(lt.map((x) => x.toFixed(2)), ["10.30", "10.50"], "a take-profit for each lane with a target");
    assert.ok(ex.partial("S1-USDT|LONG", "STOP_MARKET").every((o) => near(o.qty!, LANE)), "each for one lane");
    // the short mirrored: stop above, take-profit below
    const ss = ex.partial("S2-USDT|SHORT", "STOP_MARKET");
    const st = ex.partial("S2-USDT|SHORT", "TAKE_PROFIT_MARKET");
    assert.ok(ss.length === 1 && ss[0].stopPrice! > 20 && st.length === 1 && st[0].stopPrice! < 20);
    // the backstop stays behind them all; no position-wide take-profit
    assert.equal(ex.of("S1-USDT|LONG", "STOP_MARKET").filter((o) => !isLane(o)).length, 1);
    assert.equal(ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET").filter((o) => !isLane(o)).length, 0);
    const n = ex.log.length;
    await step();
    assert.equal(ex.log.length, n, "a steady book sends nothing more");
    const c = liveKv<ControlStatus>(rt.db, "controlStatus")!;
    assert.equal(c.laneOrders?.onExchange, 4);
    assert.equal(c.protect?.laneStops, 4);
    assert.equal(c.protect?.laneTps, 3);
  });

  // Technical ownership fixture: synthetic admission is explicit, not a profitability claim.
  for (const tf of [1, 5, 15]) for (const source of ["rsi-mom-14-20", "sig-ema-cross-s"]) {
    for (const side of [1, -1] as const) {
      it(`Exit allocations survive updates and independent closes: ${source}@m${tf}, side ${side}`, async () => {
        const tick = clock();
        const ex = new Venue();
        const { rt } = rtOf();
        const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
        const sets = ["static-sl", "adaptive-sl", "trailing", "breakeven", "trailing-only"] as const;
        const lanes = sets.map((exitSet, i) => {
          const sl = .006 + i * .003;
          const tp = exitSet === "trailing-only" ? 0 : .05 + i * .01;
          return {
            ...lane(i + 1, "S1-USDT", side, 10, sl, tp || undefined),
            cfg: configId("follow", `${source}@m${tf}`, {
              tp, sl, trail: exitSet === "trailing" || exitSet === "trailing-only" ? .015 : 0,
              hold: Math.max(1, Math.floor(180 / tf)), exitType: "historic", exitSide: side, exitSet,
              ...(exitSet === "trailing-only" ? { trailOnly: true, trailStep: .5 } : {}),
            }),
          };
        });
        rt.paper.positions = lanes;
        const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        await step();
        assert.ok(near(ex.positions.get(key)!, 5 * LANE));
        assert.equal(ex.partial(key, "STOP_MARKET").length, 5);
        assert.equal(ex.partial(key, "TAKE_PROFIT_MARKET").length, 4);
        // Updating a trailing allocation must not replace another configuration's protection.
        lanes[2].stop = 10 * (1 - side * .005);
        tick(20_000);
        await step();
        assert.equal(ex.partial(key, "STOP_MARKET").length, 5);
        assert.ok(ex.partial(key, "STOP_MARKET").some((o) => near(o.stopPrice!, lanes[2].stop)));
        for (let i = 0; i < lanes.length; i++) {
          const own = lanes[i];
          const takeProfit = i % 2 === 1;
          const px = takeProfit ? own.target! : own.stop;
          const order = ex.partial(key, takeProfit ? "TAKE_PROFIT_MARKET" : "STOP_MARKET")
            .find((o) => near(o.stopPrice!, px));
          assert.ok(order, `allocation ${i} protection ${px}: ${JSON.stringify(ex.partial(key, "STOP_MARKET"))}`);
          ex.triggerOrder(order.id);
          tick(20_000);
          await step();
          const rows = rt.db.all<{ cfg: string; reason: string; exit: number }>(
            "SELECT cfg, reason, exit FROM live_lane_trades");
          assert.equal(rows.length, i + 1, "each filled allocation settles exactly once");
          assert.equal(new Set(rows.map((r) => r.cfg)).size, i + 1);
          const row = rows.find((r) => r.cfg === own.cfg)!;
          assert.ok(row && near(row.exit, px), "actual own fill price is retained");
          const remaining = lanes.length - i - 1;
          assert.ok(near(ex.positions.get(key) ?? 0, remaining * LANE), "remaining quantity reconciles");
          assert.equal(ex.partial(key, "STOP_MARKET").length, remaining);
          assert.equal(ex.partial(key, "TAKE_PROFIT_MARKET").length, Math.max(0, 3 - i));
          const opens = ex.opens("S1-USDT").length;
          tick(20_000);
          await step();
          assert.equal(ex.opens("S1-USDT").length, opens, "settled allocations never reopen from stale paper");
        }
        assert.equal(ex.partial(key, "STOP_MARKET").length, 0);
        assert.equal(ex.partial(key, "TAKE_PROFIT_MARKET").length, 0);
      });
    }
  }

  it("a Block Overall position is ONE lane sized by its whole volume: one stop and one take-profit, none untracked", async () => {
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    // volume 4 = base 1 + overall leg 2 + symbol leg 1 (Overall legs share the position's stop and target)
    const ov = { ...lane(1, "S1-USDT", 1, 10, 0.02, 0.05), vol: 4, legs: { overall: 2, symbol: 1 } };
    const plain = lane(2, "S1-USDT", 1, 10, 0.04, 0.06);
    // a Block-raised lane without legs (shared / additive): volume 3 → 3 units
    const raised = { ...lane(3, "S2-USDT", -1, 20, 0.02, 0.04), vol: 3, level: 2 };
    rt.paper.positions = [ov, plain, raised];
    await step();
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, 5 * LANE), `4 + 1 units: ${ex.positions.get("S1-USDT|LONG")}`);
    const stops = ex.partial("S1-USDT|LONG", "STOP_MARKET");
    assert.equal(stops.length, 2, "one lane stop for the Overall position (not one per leg), one for the plain lane");
    const qs = stops.map((o) => o.qty!).sort((x, y) => x - y);
    assert.ok(near(qs[0], LANE) && near(qs[1], 4 * LANE), `the Overall lane holds its 4 units: ${qs}`);
    const tps = ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET");
    assert.equal(tps.length, 2);
    // S2 at 20: one minimum 0.1; the raised lane 3 units, one stop for them
    assert.ok(near(ex.positions.get("S2-USDT|SHORT")!, 0.3), `raised lane: ${ex.positions.get("S2-USDT|SHORT")}`);
    assert.equal(ex.partial("S2-USDT|SHORT", "STOP_MARKET").length, 1);
    assert.ok(near(ex.partial("S2-USDT|SHORT", "STOP_MARKET")[0].qty!, 0.3));
    // every own lane order is in the lane map (none placed and then overwritten)
    const map = liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {};
    const tracked = new Set(Object.values(map).flatMap((lo) => [lo.s?.coid, lo.t?.coid]).filter(Boolean).map((c) => c!.toUpperCase()));
    for (const o of [...stops, ...tps, ...ex.partial("S2-USDT|SHORT", "STOP_MARKET")])
      assert.ok(tracked.has((o.clientOrderId ?? "").toUpperCase()), `own order ${o.clientOrderId} tracked`);
    assert.equal(Object.keys(map).length, 3);
    const n = ex.log.length;
    await step();
    assert.equal(ex.log.length, n, "a steady book sends nothing more");
  });

  it("a lane's stop fills on the venue: booked there, its take-profit cancelled, never reopened, the others untouched", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt, price } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const a = lane(1, "S1-USDT", 1, 10, 0.02, 0.05);
    const b = lane(2, "S1-USDT", 1, 10, 0.04, 0.06);
    rt.paper.positions = [a, b];
    await step();
    const stopA = ex.partial("S1-USDT|LONG", "STOP_MARKET").find((o) => near(o.stopPrice!, 9.8))!;
    price("S1-USDT", 9.79);
    ex.triggerOrder(stopA.id);
    tick(20_000);
    await step();
    // relation: all rows — the test reads what the writer wrote
    const rows = rt.db.all<{ cfg: string; reason: string; exit: number }>("SELECT cfg, reason, exit FROM live_lane_trades");
    assert.deepEqual(rows.map((r) => [r.cfg, r.reason, r.exit]), [[a.cfg, "stop", 9.8]]);
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, LANE), "the other lane stays");
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 1, "lane a's take-profit went with it");
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 1);
    const opens = ex.opens("S1-USDT").length;
    tick(20_000);
    await step();
    assert.equal(ex.opens("S1-USDT").length, opens, "lane a is not reopened while the paper book still holds it");
  });

  it("a lane's take-profit fills, then the side is closed by hand: that lane at its fill, the rest at the hand close", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt, price } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const a = lane(1, "S1-USDT", 1, 10, 0.02, 0.05);
    const b = lane(2, "S1-USDT", 1, 10, 0.04, 0.06);
    rt.paper.positions = [a, b];
    await step();
    const tpA = ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").find((o) => near(o.stopPrice!, 10.5))!;
    // (both before the desk's next step: it was down)
    price("S1-USDT", 10.5);
    ex.triggerOrder(tpA.id);
    price("S1-USDT", 10.3);
    ex.closeByHand("S1-USDT|LONG", 10.3);
    tick(20_000);
    await step();
    // relation: all rows — the test reads what the writer wrote
    const rows = rt.db.all<{ cfg: string; reason: string; exit: number }>(
      "SELECT cfg, reason, exit FROM live_lane_trades ORDER BY cfg",
    );
    assert.deepEqual(
      rows.map((r) => [r.cfg, r.reason]),
      [
        [a.cfg, "target"],
        [b.cfg, "hand"],
      ],
    );
    assert.equal(rows[0].exit, tpA.stopPrice, "lane a at its take-profit's fill");
    assert.ok(near(rows[1].exit, 10.3, 1e-9), `lane b at the hand close: ${rows[1].exit}`);
  });

  it("a lane that leaves is cancelled first, then reduced — and a stop that filled meanwhile is never exited twice", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const a = lane(1, "S1-USDT", 1, 10, 0.02, 0.05);
    const b = lane(2, "S1-USDT", 1, 10, 0.04, 0.06);
    const c = lane(3, "S1-USDT", 1, 10, 0.03, 0.07);
    rt.paper.positions = [a, b, c];
    await step();
    // lane a exits on paper: its two orders go, the position shrinks by one lane
    rt.paper.positions = [b, c];
    tick(20_000);
    await step();
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, 2 * LANE));
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 2);
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 2);
    // lane b's stop fills on the venue at the same moment the paper book exits it: one exit, not two
    const stopB = ex.partial("S1-USDT|LONG", "STOP_MARKET").find((o) => near(o.stopPrice!, 9.6))!;
    ex.triggerOrder(stopB.id);
    rt.paper.positions = [c];
    tick(20_000);
    await step();
    tick(20_000);
    await step();
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, LANE), `one lane left: ${ex.positions.get("S1-USDT|LONG")}`);
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 1);
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 1);
  });

  it("a trailed lane's stop follows it toward the price — up for a long, down for a short", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt, price } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const L = lane(1, "S1-USDT", 1, 10, 0.02, 0.5);
    const S = lane(2, "S2-USDT", -1, 20, 0.02, 0.5);
    rt.paper.positions = [L, S];
    await step();
    price("S1-USDT", 11);
    price("S2-USDT", 18);
    L.stop = 10.78;
    L.trailOn = true;
    S.stop = 18.36;
    S.trailOn = true;
    tick(20_000);
    await step();
    const ls = ex.partial("S1-USDT|LONG", "STOP_MARKET");
    const ss = ex.partial("S2-USDT|SHORT", "STOP_MARKET");
    assert.equal(ls.length, 1);
    assert.ok(near(ls[0].stopPrice!, 10.78), `long lane stop ${ls[0].stopPrice}`);
    assert.equal(ss.length, 1);
    assert.ok(near(ss[0].stopPrice!, 18.36), `short lane stop ${ss[0].stopPrice}`);
    // a pullback never moves them back
    price("S1-USDT", 10.85);
    price("S2-USDT", 18.3);
    tick(20_000);
    await step();
    assert.ok(near(ex.partial("S1-USDT|LONG", "STOP_MARKET")[0].stopPrice!, 10.78));
    assert.ok(near(ex.partial("S2-USDT|SHORT", "STOP_MARKET")[0].stopPrice!, 18.36));
  });

  it("many lanes: at most 60 orders a step, every stop before any take-profit, complete within a few steps", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = Array.from({ length: 70 }, (_, i) => lane(i + 1, "S1-USDT", 1, 10, 0.02 + i * 0.0005, 0.05 + i * 0.0005));
    await step();
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 60, "the budget goes to stops first");
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 0);
    tick(20_000);
    await step();
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 70, "every lane's stop by the second step");
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 50);
    tick(20_000);
    await step();
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 70, "the rest follow");
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, 70 * LANE));
  });
  it("the venue's TP/SL cap: backstops first, lane orders nearest to triggering, no retry storm when it is full", async () => {
    const tick = clock();
    const ex = new Venue();
    ex.tpslCap = 12;
    const { rt } = rtOf();
    rt.settings.live = { ...rt.settings.live, maxVenueOrders: 12 };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = [
      ...Array.from({ length: 6 }, (_, i) => lane(i + 1, "S1-USDT", 1, 10, 0.02 + i * 0.01, 0.05 + i * 0.01)),
      lane(7, "S2-USDT", -1, 20, 0.02, 0.04),
    ];
    await step();
    // 2 backstops, then 12 − 2 − 5 reserved = 5 lane orders: the 5 levels nearest to the price
    assert.equal(ex.orders.filter((o) => !isLane(o)).length, 2, "every position's backstop");
    const lanesPlaced = ex.orders.filter((o) => isLane(o));
    assert.equal(lanesPlaced.length, 5);
    // These are the five nearest logical levels. Venue-safe outward snapping can put an exact 4 % level one
    // price tick farther out (9.6 → 9.5999), so a raw distance <= 4 % incorrectly rejected the right selection.
    const nearest = [
      { sym: "S1-USDT", type: "STOP_MARKET", px: 9.8 },
      { sym: "S2-USDT", type: "STOP_MARKET", px: 20.4 },
      { sym: "S1-USDT", type: "STOP_MARKET", px: 9.7 },
      { sym: "S2-USDT", type: "TAKE_PROFIT_MARKET", px: 19.2 },
      { sym: "S1-USDT", type: "STOP_MARKET", px: 9.6 },
    ];
    const contracts = await ex.contracts();
    for (const want of nearest)
      assert.equal(
        lanesPlaced.filter((o) => o.venueSymbol === want.sym && o.type === want.type &&
          Math.abs((o.stopPrice ?? 0) - want.px) <= pxTick(contracts.get(want.sym)) + 1e-9).length,
        1,
        `nearest ${want.sym} ${want.type} at ${want.px}, within one venue tick`,
      );
    // the venue refuses the next one: lane orders pause, they are not retried every step
    ex.tpslCap = 7;
    rt.settings.live = { ...rt.settings.live, maxVenueOrders: 40 };
    const sent = () => ex.log.filter((p) => p.type !== "MARKET").length;
    tick(20_000);
    await step();
    const after = sent();
    for (let i = 0; i < 4; i++) {
      tick(10_000);
      await step();
    }
    assert.equal(sent(), after, "no lane order sent again inside the pause");
    assert.ok(ex.positions.has("S1-USDT|LONG") && ex.positions.has("S2-USDT|SHORT"), "nothing closed for it");
  });
  it("a count just over the fill line is left alone: no cancel / place churn every step", async () => {
    // x02, 7 Oct: one order over the line (a new position's backstop) trimmed one lane order every step and the next
    // step placed it again — a cancel and a place every second
    const tick = clock();
    const ex = new Venue();
    const { rt } = rtOf();
    rt.settings.live = { ...rt.settings.live, maxVenueOrders: 12 };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = Array.from({ length: 6 }, (_, i) => lane(i + 1, "S1-USDT", 1, 10, 0.02 + i * 0.002, 0.03 + i * 0.002));
    await step();
    assert.equal(ex.orders.length, 7, "the backstop and 6 lane orders: 12 − 5 reserved");
    // a second position opens: its backstop takes one of the reserved slots (8 = one over the line)
    rt.paper.positions.push(lane(7, "S2-USDT", -1, 20, 0.15, 0.2));
    tick(20_000);
    await step();
    assert.equal(ex.orders.length, 8);
    let cancels = 0;
    const cancel = ex.cancel.bind(ex);
    ex.cancel = async (sym: string, id: string) => {
      cancels++;
      return cancel(sym, id);
    };
    for (let i = 0; i < 3; i++) {
      tick(20_000);
      await step();
    }
    assert.equal(cancels, 0, "nothing trimmed for one order over the line");
    assert.equal(ex.orders.length, 8);
  });
  it("under a full cap the farthest lane stops give their slots to nearer take-profits, four a step", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt, price } = rtOf();
    // room for exactly the backstop and 6 lane orders
    rt.settings.live = { ...rt.settings.live, maxVenueOrders: 12 };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    // six lanes with far stops (15 % …) and targets near the price (2 % …)
    rt.paper.positions = Array.from({ length: 6 }, (_, i) => lane(i + 1, "S1-USDT", 1, 10, 0.15 + i * 0.01, 0.02 + i * 0.002));
    await step();
    // first step: the 6 slots go to the 6 nearest levels — the take-profits (2 % …) before the stops (15 % …)
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 6);
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 0);
    // the price moves near the stops, away from the targets: the far take-profits give way to the stops, 4 a step
    price("S1-USDT", 8.6);
    tick(20_000);
    await step();
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 4, "four swaps this step");
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 2);
    assert.ok(ex.orders.length <= 12, "within the cap");
  });
  it('switched to control orders "overall": the lane orders are cancelled, the position gets its stop and take-profit', async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = [lane(1, "S1-USDT", 1, 10, 0.02, 0.05), lane(2, "S1-USDT", 1, 10, 0.04, 0.06)];
    await step();
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 2);
    rt.settings.live = { ...rt.settings.live, laneOrders: false };
    tick(20_000);
    await step();
    tick(20_000);
    await step();
    assert.equal(ex.orders.filter((o) => isLane(o)).length, 0, "no lane order left");
    assert.equal(ex.of("S1-USDT|LONG", "STOP_MARKET").filter((o) => !isLane(o)).length, 1, "the position's stop");
    const tp = ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET").filter((o) => !isLane(o));
    assert.equal(tp.length, 1, "the position's take-profit, beyond the outer target");
    assert.ok(tp[0].stopPrice! > 10.6, `${tp[0].stopPrice}`);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "the position stays");
  });
});
