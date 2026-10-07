// Lane control orders (live.laneOrders): every lane on the exchange carries its own partial stop and take-profit at
// its own levels; a lane order that fills is that lane's exit (booked at the fill, its sibling cancelled, the lane
// never reopened); a lane that leaves is cancelled before it is reduced, never exited twice; a trailed stop follows
// the lane toward the price; at most 60 orders a step (4 in flight), stops first.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { liveKv, resetLiveBackoff, stepLive, type ControlStatus } from "./live.server.ts";
import { coveredLanes, goneOrderOf, planLaneOrders, type LaneOrder, type LaneWant } from "./lane-orders.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;

class Venue extends SimExchange {
  oneStopPerSide = true;
  of(k: string, type: string) {
    const [sym, ps] = k.split("|");
    return this.orders.filter((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === type);
  }
  partial(k: string, type: string) {
    return this.of(k, type).filter((o) => !o.closePosition);
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
};

function rtOf() {
  const prices = [
    { sym: "S1-USDT", last: 10 },
    { sym: "S2-USDT", last: 20 },
  ];
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
    sim: { stats: { pf: 1.5, n: 50 }, stable: true },
    status: { lastBarT: Math.floor(Date.now() / H) * H },
    paper: { positions: [] as Pos[] },
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
  it("plans stops before take-profits, moves a trailed stop toward the price only, within the budget", () => {
    const map: Record<string, LaneOrder> = {
      a: { id: "a", key: "S1-USDT|1", sym: "S1-USDT", side: 1, qty: LANE, at: 1, s: { coid: "XA", px: 9.5 }, t: { coid: "XB", px: 10.5 } },
      b: { id: "b", key: "S1-USDT|1", sym: "S1-USDT", side: 1, qty: LANE, at: 2 },
    };
    const resting = new Set(["XA", "XB"]);
    const o = { px: () => 10, stopPx: (x: LaneWant) => x.stop, targetPx: (x: LaneWant) => x.target ?? 0, budget: 10 };
    const acts = planLaneOrders([w("a", 1, 9.8, 10.5), w("b", 2, 9.5, 10.6)], map, resting, o);
    assert.deepEqual(
      acts.map((x) => `${x.kind} ${x.lane}`),
      ["placeStop b", "placeTarget b", "moveStop a"],
    );
    // a stop that would move away from the price never moves
    assert.equal(planLaneOrders([w("a", 1, 9.3, 10.5)], map, resting, o).length, 0);
    // the budget cuts the tail, the stop stays first
    assert.deepEqual(
      planLaneOrders([w("a", 1, 9.8, 10.5), w("b", 2, 9.5, 10.6)], map, resting, { ...o, budget: 1 }).map((x) => x.kind),
      ["placeStop"],
    );
    // a price already past the stop: left to the desk's exit
    assert.equal(planLaneOrders([w("b", 2, 10.2)], map, resting, o).length, 0);
    // the target is gone from the lane: its take-profit is dropped
    assert.deepEqual(
      planLaneOrders([w("a", 1, 9.5)], map, resting, o).map((x) => x.kind),
      ["dropTarget"],
    );
  });
  it("reads the venue's answer for an order that left the book", () => {
    assert.deepEqual(goneOrderOf({ order: { status: "FILLED", avgPrice: "9.49", stopPrice: "9.5" } }), { status: "filled", px: 9.49 });
    assert.deepEqual(goneOrderOf({ order: { status: "CANCELLED", avgPrice: "0" } }), { status: "cancelled" });
    assert.deepEqual(goneOrderOf(null), { status: "unknown" });
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
    assert.equal(ex.of("S1-USDT|LONG", "STOP_MARKET").filter((o) => o.closePosition).length, 1);
    assert.equal(ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET").filter((o) => o.closePosition).length, 0);
    const n = ex.log.length;
    await step();
    assert.equal(ex.log.length, n, "a steady book sends nothing more");
    const c = liveKv<ControlStatus>(rt.db, "controlStatus")!;
    assert.equal(c.laneOrders?.onExchange, 4);
    assert.equal(c.protect?.laneStops, 4);
    assert.equal(c.protect?.laneTps, 3);
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
});
