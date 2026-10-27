// Lane control orders (live.laneOrders): every lane on the exchange carries its own partial stop and take-profit at
// its own levels; a lane order that fills is that lane's exit (booked at the fill, its sibling cancelled, the lane
// never reopened); a lane that leaves is cancelled before it is reduced, never exited twice; a trailed stop follows
// the lane toward the price; at most 60 orders a step (4 in flight), stops first.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive, type ControlStatus } from "./live.server.ts";
import { coveredLanes, goneOrderOf, planLaneOrders, swapCount, trimLaneOrders, type LaneOrder, type LaneWant } from "./lane-orders.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { configId } from "../pipeline/pipeline.ts";
import { ExchangeRejected, pxTick } from "../exchange/bingx.server.ts";
import { authorizeSyntheticLanes, SimExchange, syntheticExecutionRun, type SimOrder } from "../test-support.ts";
import type { LiveGate } from "../live-validation.ts";
import { makeCoid, ownCoidKind } from "./live.ts";

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

function rtOf(db = new CoreDb(":memory:")) {
  const prices = [
    { sym: "S1-USDT", last: 10 },
    { sym: "S2-USDT", last: 20 },
  ];
  let positions: Pos[] = [];
  const rt = {
    generation: 1,
    db,
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
    const existing = prices.find((p) => p.sym === sym);
    if (existing) existing.last = last; else prices.push({ sym, last });
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

// A snapshot from an earlier version which allowed several parents on a netted side.
// No current admission is bypassed: the simulated venue and durable records begin
// with already-held, individually identified exits, as after a real restart.
async function seedLegacy(rt: ReturnType<typeof rtOf>["rt"], ex: Venue, positions: Pos[], opts: { rawLedgerQty?: boolean } = {}) {
  rt.paper.positions = positions;
  const laneMap: Record<string, LaneOrder> = {}, open: Record<string, { cfg: string; sym: string; side: 1 | -1; t: number; px: number }> = {};
  const groups = new Map<string, { sym: string; side: 1 | -1; qty: number; rawQty: number; stops: number[] }>();
  const at = Date.now() - 120_000, conn = DEFAULT_SETTINGS.live.connId;
  const save = (coid: string, sym: string, side: 1 | -1, kind: string, qty: number, px: number, msg = "") =>
    rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,'ok',?,?)",
      coid, `control|${sym}|${side}`, sym, side, kind, qty, px, msg, at);
  for (const p of positions) {
    const id = `${p.cfg}|${p.sym}|${p.side}|${p.entryT}`, key = `${p.sym}|${p.side}`;
    const ps = p.side === 1 ? "LONG" : "SHORT", qty = p.vol * (p.sym === "S2-USDT" ? 0.1 : LANE);
    const group = groups.get(key) ?? { sym: p.sym, side: p.side, qty: 0, rawQty: 0, stops: [] };
    group.rawQty += qty; group.qty = +(group.qty + qty).toFixed(8); group.stops.push(p.stop); groups.set(key, group);
    ex.positions.set(`${p.sym}|${ps}`, +(group.qty.toFixed(8)));
    const lo: LaneOrder = { id, key, sym: p.sym, side: p.side, qty, at,
      exitQty: 0, exitNotional: 0, weights: { [id]: 1 } };
    for (const [which, kind, type, price] of [["s", "V", "STOP_MARKET", p.stop], ["t", "Y", "TAKE_PROFIT_MARKET", p.target]] as const) {
      if (price === undefined) continue;
      const coid = makeCoid(conn, kind, at), reply = await ex.order({ symbol: p.sym, positionSide: ps,
        side: p.side === 1 ? "SELL" : "BUY", type, quantity: qty, stopPrice: price, clientOrderID: coid }) as { order: { orderId: string } };
      lo[which] = { coid, oid: reply.order.orderId, px: price, qty };
      save(coid, p.sym, p.side, kind, qty, price, id);
    }
    laneMap[id] = lo; open[id] = { cfg: p.cfg, sym: p.sym, side: p.side, t: at, px: p.entry };
  }
  for (const { sym, side, qty, rawQty, stops } of groups.values()) {
    const ps = side === 1 ? "LONG" : "SHORT", coid = makeCoid(conn, "S", at);
    const price = side === 1 ? Math.min(...stops) * .99 : Math.max(...stops) * 1.01;
    await ex.order({ symbol: sym, positionSide: ps, side: side === 1 ? "SELL" : "BUY", type: "STOP_MARKET",
      quantity: qty, stopPrice: price, clientOrderID: coid });
    save(makeCoid(conn, "E", at), sym, side, "O", opts.rawLedgerQty ? rawQty : qty, positions.find((p) => p.sym === sym && p.side === side)!.entry);
    save(coid, sym, side, "S", qty, price);
  }
  rt.db.kvSet("liveLaneOpen", open); rt.db.kvSet("laneOrders", laneMap);
  rt.db.kvSet("liveBoundedSince", at - 1);
  ex.log.length = 0;
}

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
    for (const status of ["CANCEL_PENDING", "CANCELLING", "CANCEL_REQUESTED", "CANCEL_REJECTED", "FAILED"]) {
      assert.deepEqual(goneOrderOf({ order: { status, executedQty: 0, avgPrice: 0 } }), { status: "unknown" }, status);
      assert.deepEqual(goneOrderOf({ order: { status, executedQty: .4, avgPrice: 9.8 } }), { status: "unknown" }, status);
    }
    for (const status of ["CANCELLED", "CANCELED", "EXPIRED", "REJECTED"])
      assert.deepEqual(goneOrderOf({ order: { status, executedQty: 0 } }), { status: "cancelled" }, status);
  });
});

describe("lane orders: the control step", { timeout: 120_000 }, () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());
  const clock = () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    return (ms: number) => mock.timers.tick(ms);
  };

  it("new native parents reserve one physical side while an independent short remains eligible", async () => {
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
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, LANE), `one admitted parent: ${ex.positions.get("S1-USDT|LONG")}`);
    const ls = ex.partial("S1-USDT|LONG", "STOP_MARKET").map((o) => o.stopPrice!).sort();
    const lt = ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").map((o) => o.stopPrice!).sort();
    assert.deepEqual(ls.map((x) => x.toFixed(2)), ["9.80"], "the admitted parent's own stop");
    assert.deepEqual(lt.map((x) => x.toFixed(2)), ["10.30"], "the admitted parent's own target");
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
    assert.equal(c.laneOrders?.onExchange, 2);
    assert.equal(c.protect?.laneStops, 2);
    assert.equal(c.protect?.laneTps, 2);
  });

  // Technical ownership fixture: synthetic admission is explicit, not a profitability claim.
  for (const tf of [1, 5, 15]) for (const source of ["rsi-mom-14-20", "sig-ema-cross-s"]) {
    for (const side of [1, -1] as const) {
      it(`legacy Exit allocations retain protections and exact closes: ${source}@m${tf}, side ${side}`, async () => {
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
        await seedLegacy(rt, ex, lanes);
        const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        await step();
        assert.ok(near(ex.positions.get(key)!, 5 * LANE));
        assert.equal(ex.partial(key, "STOP_MARKET").length, 5);
        assert.equal(ex.partial(key, "TAKE_PROFIT_MARKET").length, 4);
        // A netted legacy side cannot safely resize one parent's stop while siblings are live.
        const oldStop = lanes[2].stop;
        lanes[2].stop = 10 * (1 - side * .005);
        tick(20_000);
        await step();
        assert.equal(ex.partial(key, "STOP_MARKET").length, 5);
        assert.ok(ex.partial(key, "STOP_MARKET").some((o) => near(o.stopPrice!, oldStop)), "the old native stop remains");
        assert.ok(!ex.partial(key, "STOP_MARKET").some((o) => near(o.stopPrice!, lanes[2].stop)), "no unsafe resize on a shared side");
        lanes[2].stop = oldStop;
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
          // relation: all rows — this isolated fixture verifies exactly what the writer settled.
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
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, 4 * LANE), `only the four-unit parent enters: ${ex.positions.get("S1-USDT|LONG")}`);
    const stops = ex.partial("S1-USDT|LONG", "STOP_MARKET");
    assert.equal(stops.length, 1, "the Overall parent has one stop and the sibling cannot enter");
    const qs = stops.map((o) => o.qty!).sort((x, y) => x - y);
    assert.ok(near(qs[0], 4 * LANE), `the Overall lane holds its 4 units: ${qs}`);
    const tps = ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET");
    assert.equal(tps.length, 1);
    // S2 at 20: one minimum 0.1; the raised lane 3 units, one stop for them
    assert.ok(near(ex.positions.get("S2-USDT|SHORT")!, 0.3), `raised lane: ${ex.positions.get("S2-USDT|SHORT")}`);
    assert.equal(ex.partial("S2-USDT|SHORT", "STOP_MARKET").length, 1);
    assert.ok(near(ex.partial("S2-USDT|SHORT", "STOP_MARKET")[0].qty!, 0.3));
    // every own lane order is in the lane map (none placed and then overwritten)
    const map = liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {};
    const tracked = new Set(Object.values(map).flatMap((lo) => [lo.s?.coid, lo.t?.coid]).filter(Boolean).map((c) => c!.toUpperCase()));
    for (const o of [...stops, ...tps, ...ex.partial("S2-USDT|SHORT", "STOP_MARKET")])
      assert.ok(tracked.has((o.clientOrderId ?? "").toUpperCase()), `own order ${o.clientOrderId} tracked`);
    assert.equal(Object.keys(map).length, 2);
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
    await seedLegacy(rt, ex, [a, b]);
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

  it("a legacy target is booked at its fill; an unallocated hand close stays unreconciled", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt, price } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const a = lane(1, "S1-USDT", 1, 10, 0.02, 0.05);
    const b = lane(2, "S1-USDT", 1, 10, 0.04, 0.06);
    await seedLegacy(rt, ex, [a, b]);
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
      [[a.cfg, "target"]],
    );
    assert.equal(rows[0].exit, tpA.stopPrice, "lane a at its take-profit's fill");
    const remaining = liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {};
    assert.ok(Object.values(remaining).some((x) => x.id.startsWith(b.cfg)), "the second parent remains unresolved");
  });

  it("a departed legacy lane remains protected while a sibling's stop is booked exactly once", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const a = lane(1, "S1-USDT", 1, 10, 0.02, 0.05);
    const b = lane(2, "S1-USDT", 1, 10, 0.04, 0.06);
    const c = lane(3, "S1-USDT", 1, 10, 0.03, 0.07);
    await seedLegacy(rt, ex, [a, b, c]);
    await step();
    // The paper exit cannot authorize a netted market reduction of a legacy shared side.
    rt.paper.positions = [b, c];
    tick(20_000);
    await step();
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, 3 * LANE));
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 3);
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 3);
    // lane b's stop fills on the venue at the same moment the paper book exits it: one exit, not two
    const stopB = ex.partial("S1-USDT|LONG", "STOP_MARKET").find((o) => near(o.stopPrice!, 9.6))!;
    ex.triggerOrder(stopB.id);
    rt.paper.positions = [c];
    tick(20_000);
    await step();
    tick(20_000);
    await step();
    assert.ok(near(ex.positions.get("S1-USDT|LONG")!, 2 * LANE), `two protected lanes remain: ${ex.positions.get("S1-USDT|LONG")}`);
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 2);
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 2);
    // relation: all rows — the measured stop is the sole recorded close.
    const rows = rt.db.all<{ cfg: string; reason: string }>("SELECT cfg,reason FROM live_lane_trades");
    assert.deepEqual(rows.map((r) => [r.cfg, r.reason]), [[b.cfg, "stop"]]);
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

  for (const side of [1, -1] as const)
    it(`a zero-fill cancel request keeps the ${side === 1 ? "long" : "short"} native stop reserved through restart`, async () => {
      const dir = mkdtempSync(join(tmpdir(), "cts-cancel-pending-"));
      const statePath = join(dir, "state.json"), journalPath = join(dir, "journal");
      let db = new CoreDb(":memory:", { statePath }); db.journalPath = journalPath;
      const ex = new Venue(), book = ex.book.bind(ex), orderStatus = ex.orderStatus.bind(ex);
      try {
        let { rt } = rtOf(db);
        const p = lane(31, "S1-USDT", side, 10, .02, .05);
        rt.paper.positions = [p];
        const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        await step();
        const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
        const qty = ex.positions.get(key), stop = ex.partial(key, "STOP_MARKET")[0];
        assert.ok(qty && stop?.id, "the original parent and native stop are real");
        ex.book = async () => { const b = await book(); return { ...b, orders: b.orders.filter((o) => o.id !== stop.id) }; };
        let state = "CANCEL_PENDING";
        ex.orderStatus = async (sym, id) => id === stop.id
          ? { order: { orderId: id, status: state, executedQty: 0 } }
          : orderStatus(sym, id);
        const initialStops = ex.orders.length;
        await step();
        assert.equal(ex.orders.length, initialStops, "a pending cancellation neither duplicates nor removes protection");
        assert.equal(ex.positions.get(key), qty, "no market close for a pending cancellation");
        flushLiveKv(db); assert.equal(db.flushState(), true); db.db.close();
        db = new CoreDb(":memory:", { statePath }); db.journalPath = journalPath; db.replayJournal();
        ({ rt } = rtOf(db)); rt.paper.positions = [p];
        state = "CANCELLING";
        await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        assert.equal(ex.orders.length, initialStops, "restart keeps the still-live old order");
        assert.equal(ex.positions.get(key), qty, "restart must not submit a speculative market close");
        assert.ok(ex.orders.some((o) => o.id === stop.id));
      } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
    });

  it("many lanes: at most 60 orders a step, every stop before any take-profit, complete within a few steps", async () => {
    const tick = clock();
    const ex = new Venue();
    ex.symbols = 70;
    const { rt, price } = rtOf();
    rt.settings.live = { ...rt.settings.live, maxVenueOrders: 220 };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = Array.from({ length: 70 }, (_, i) => {
      const sym = `S${i}-USDT`; price(sym, 10);
      return lane(i + 1, sym, 1, 10, 0.02 + i * 0.0005, 0.05 + i * 0.0005);
    });
    const native = (type: string) => ex.orders.filter((o) => isLane(o) && o.type === type);
    await step();
    assert.equal(native("STOP_MARKET").length, 60, "the budget goes to stops first");
    assert.equal(native("TAKE_PROFIT_MARKET").length, 0);
    tick(20_000);
    await step();
    assert.equal(native("STOP_MARKET").length, 70, "every lane's stop by the second step");
    assert.equal(native("TAKE_PROFIT_MARKET").length, 50);
    tick(20_000);
    await step();
    assert.equal(native("TAKE_PROFIT_MARKET").length, 70, "the rest follow");
    assert.equal(ex.positions.size, 70);
    assert.ok([...ex.positions.values()].every((qty) => near(qty, LANE)));
  });
  it("the venue's TP/SL cap: backstops first, lane orders nearest to triggering, no retry storm when it is full", async () => {
    const tick = clock();
    const ex = new Venue();
    ex.tpslCap = 10;
    const { rt } = rtOf();
    rt.settings.live = { ...rt.settings.live, maxVenueOrders: 10 };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = [
      lane(1, "S1-USDT", 1, 10, 0.02, 0.05),
      lane(2, "S2-USDT", -1, 20, 0.02, 0.04),
    ];
    await step();
    // 2 backstops, then 10 − 2 − 5 reserved = 3 lane orders nearest to the price.
    assert.equal(ex.orders.filter((o) => !isLane(o)).length, 2, "every position's backstop");
    const lanesPlaced = ex.orders.filter((o) => isLane(o));
    assert.equal(lanesPlaced.length, 3);
    // These are the five nearest logical levels. Venue-safe outward snapping can put an exact 4 % level one
    // price tick farther out (9.6 → 9.5999), so a raw distance <= 4 % incorrectly rejected the right selection.
    const nearest = [
      { sym: "S1-USDT", type: "STOP_MARKET", px: 9.8 },
      { sym: "S2-USDT", type: "STOP_MARKET", px: 20.4 },
      { sym: "S2-USDT", type: "TAKE_PROFIT_MARKET", px: 19.2 },
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
    ex.tpslCap = 5;
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
  it("cap pressure never churns a legacy parent's existing protection", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt } = rtOf();
    rt.settings.live = { ...rt.settings.live, maxVenueOrders: 12 };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    await seedLegacy(rt, ex, Array.from({ length: 3 }, (_, i) => lane(i + 1, "S1-USDT", 1, 10, 0.02 + i * 0.002, 0.03 + i * 0.002)));
    await step();
    assert.equal(ex.orders.length, 7, "the backstop and 6 lane orders: 12 − 5 reserved");
    const protectedOrders = ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stop: o.stopPrice }));
    // A separate short may use the account too; legacy orders must not be trimmed to give it a slot.
    rt.paper.positions.push(lane(7, "S2-USDT", -1, 20, 0.15, 0.2));
    tick(20_000);
    await step();
    assert.ok(ex.positions.has("S2-USDT|SHORT"));
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
    assert.deepEqual(ex.orders.filter((o) => isLane(o) && o.venueSymbol === "S1-USDT")
      .map((o) => ({ id: o.id, qty: o.qty, stop: o.stopPrice })), protectedOrders);
  });
  it("a full cap and moving prices retain every legacy native exit without swapping", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt, price } = rtOf();
    // room for exactly the backstop and 6 lane orders
    rt.settings.live = { ...rt.settings.live, maxVenueOrders: 12 };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    // A previously opened shared side can predate today's tighter account cap.
    await seedLegacy(rt, ex, Array.from({ length: 6 }, (_, i) => lane(i + 1, "S1-USDT", 1, 10, 0.15 + i * 0.01, 0.02 + i * 0.002)));
    await step();
    assert.equal(ex.partial("S1-USDT|LONG", "STOP_MARKET").length, 6);
    assert.equal(ex.partial("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 6);
    const before = ex.orders.map((o) => ({ id: o.id, qty: o.qty, stop: o.stopPrice }));
    // Nearer targets/stops cannot justify cancelling another parent's existing stop.
    price("S1-USDT", 8.6);
    tick(20_000);
    await step();
    assert.deepEqual(ex.orders.map((o) => ({ id: o.id, qty: o.qty, stop: o.stopPrice })), before,
      "legacy orders survive unchanged; a tighter cap does not retroactively cancel them");
  });
  it("drains native lane protection across an aggregate-mode switch and restart without adding or reallocating parents", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const first = { ...lane(1, "S1-USDT", 1, 10, 0.02, 0.05), vol: 2, legs: { overall: 1 } };
    const second = lane(2, "S1-USDT", 1, 10, 0.04, 0.06);
    const newcomer = lane(3, "S1-USDT", 1, 10, 0.03, 0.07);
    await seedLegacy(rt, ex, [first, second], { rawLedgerQty: true });
    await step();
    const key = "S1-USDT|LONG";
    const native = () => ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice })).sort((a, b) => a.id.localeCompare(b.id));
    const original = native();
    assert.equal(original.length, 4, "both original stops and take-profits exist");
    assert.deepEqual(original.map((o) => o.qty).sort(), [0.2, 0.2, 0.4, 0.4], "the parents have different confirmed quantities");
    rt.settings.live = { ...rt.settings.live, laneOrders: false };
    rt.paper.positions = [first, second, newcomer];
    tick(20_000);
    await step();
    assert.deepEqual(native(), original, "the switch preserves every original order, quantity, and level");
    assert.ok(near(ex.positions.get(key)!, 0.6), "the newcomer has not been added");
    const restarted = { ...rt, generation: rt.generation + 1,
      freshTickers: async () => {
        const result = await rt.freshTickers();
        restarted.tickersAt = rt.tickersAt;
        return result;
      } };
    tick(20_000);
    await stepLive(restarted as unknown as CoreRuntime, [], restarted.generation, ex);
    assert.deepEqual(native(), original, "restart retains the same per-parent orders");
    const firstTarget = ex.partial(key, "TAKE_PROFIT_MARKET").find((o) => near(o.stopPrice!, first.target!));
    assert.ok(firstTarget);
    ex.triggerOrder(firstTarget.id);
    rt.paper.positions = [second, newcomer];
    tick(20_000);
    await stepLive(restarted as unknown as CoreRuntime, [], restarted.generation, ex);
    assert.ok(near(ex.positions.get(key)!, 0.2), "only the filled parent leaves");
    assert.deepEqual(native(), original.filter((o) => near(o.stopPrice!, second.stop) || near(o.stopPrice!, second.target!)),
      `the survivor keeps its original protective identities and quantity: ${JSON.stringify(liveKv(rt.db, "laneOrders"))}`);
    const secondTarget = ex.partial(key, "TAKE_PROFIT_MARKET").find((o) => near(o.stopPrice!, second.target!));
    assert.ok(secondTarget);
    ex.triggerOrder(secondTarget.id);
    rt.paper.positions = [newcomer];
    tick(20_000);
    await stepLive(restarted as unknown as CoreRuntime, [], restarted.generation, ex);
    assert.equal(ex.positions.get(key) ?? 0, 0, "all old native parents have closed");
    tick(20_000);
    await stepLive(restarted as unknown as CoreRuntime, [], restarted.generation, ex);
    for (let n = 0; n < 3 && !(ex.positions.get(key) ?? 0); n++) {
      tick(20_000);
      await stepLive(restarted as unknown as CoreRuntime, [], restarted.generation, ex);
    }
    assert.ok((ex.positions.get(key) ?? 0) > 0, `aggregate mode admits the new single parent after the drain: ${JSON.stringify(liveKv(rt.db, "liveStatus"))} ${JSON.stringify(liveKv(rt.db, "laneOrders"))}`);
  });

  for (const side of [1, -1] as const) {
    it(`retains known native exits across a durable mode-transition restart, side ${side}`, async () => {
      const tick = clock();
      const ex = new Venue();
      const dir = mkdtempSync(join(tmpdir(), "cts-native-resume-"));
      const path = join(dir, "core.sqlite");
      const { rt } = rtOf(new CoreDb(path));
      const first = lane(1, "S1-USDT", side, 10, 0.02, 0.05);
      const second = lane(2, "S1-USDT", side, 10, 0.04, 0.06);
      try {
        await seedLegacy(rt, ex, [first, second]);
        await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        const before = ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice }));
        assert.equal(before.length, 4);
        flushLiveKv(rt.db);
        rt.db.db.close();
        const { rt: resumed } = rtOf(new CoreDb(path));
        resumed.settings.live = { ...resumed.settings.live, laneOrders: false };
        resumed.paper.positions = [first, second];
        tick(20_000);
        await stepLive(resumed as unknown as CoreRuntime, [], 1, ex);
        assert.deepEqual(ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice })), before,
          "the persisted native stop and target quantities survive a full database reopen");
        flushLiveKv(resumed.db);
        resumed.db.db.close();
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });

    it(`keeps a departed native parent's protection without an unsafe reduction attempt, side ${side}`, async () => {
      const tick = clock();
      const ex = new Venue();
      const { rt } = rtOf();
      const first = lane(1, "S1-USDT", side, 10, 0.02, 0.05);
      const second = lane(2, "S1-USDT", side, 10, 0.04, 0.06);
      const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await seedLegacy(rt, ex, [first, second]);
      await step();
      const original = ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice }));
      const send = ex.order.bind(ex);
      ex.order = async (p) => {
        if (p.type === "MARKET" && p.side === (side === 1 ? "SELL" : "BUY")) throw new ExchangeRejected("refused", 1);
        return send(p);
      };
      rt.settings.live = { ...rt.settings.live, laneOrders: false };
      rt.paper.positions = [second];
      tick(20_000);
      await step();
      assert.ok(near(ex.positions.get(key)!, 0.4));
      assert.equal(ex.log.filter((p) => p.type === "MARKET").length, 0, "no market close is submitted after cancelling protection");
      assert.deepEqual(ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice })), original,
        "neither parent's existing native protection was cancelled");
    });

    it(`draining mode waits for a departed parent's own venue exit and preserves its sibling, side ${side}`, async () => {
      const tick = clock();
      const ex = new Venue();
      const { rt } = rtOf();
      const first = { ...lane(1, "S1-USDT", side, 10, 0.02, 0.05), vol: 2, legs: { overall: 1 } };
      const second = lane(2, "S1-USDT", side, 10, 0.04, 0.06);
      const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      await seedLegacy(rt, ex, [first, second]);
      await step();
      const survivor = ex.orders.filter((o) => isLane(o) && (near(o.stopPrice!, second.stop) || near(o.stopPrice!, second.target!)))
        .map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice }));
      assert.equal(survivor.length, 2);
      rt.settings.live = { ...rt.settings.live, laneOrders: false };
      rt.paper.positions = [second];
      tick(20_000);
      await step();
      assert.ok(near(ex.positions.get(key)!, 0.6), "no unprotected market reduction is attempted");
      // relation: all rows — the still-owned parent must not appear under any close classification.
      assert.equal(rt.db.all("SELECT id FROM live_lane_trades").length, 0, "the still-owned parent is not booked as closed");
      const firstTarget = ex.partial(key, "TAKE_PROFIT_MARKET").find((o) => near(o.stopPrice!, first.target!));
      assert.ok(firstTarget, "the departed parent keeps its own exit order");
      ex.triggerOrder(firstTarget.id);
      tick(20_000);
      await step();
      assert.ok(near(ex.positions.get(key)!, 0.2), "only the departing parent's own target filled");
      // relation: all rows — verify this measured parent exit is the only close of any classification.
      const closed = rt.db.all<{ cfg: string; exit: number }>("SELECT cfg,exit FROM live_lane_trades");
      assert.equal(closed.length, 1);
      assert.equal(closed[0].cfg, first.cfg);
      assert.ok(near(closed[0].exit, first.target!), "the own measured venue target is the only recorded close");
      assert.deepEqual(ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice })), survivor,
        "both surviving exit orders retain their original identities and quantities");
    });

    it(`retains unknown native exits and held exposure after a mode switch, side ${side}`, async () => {
      const tick = clock();
      const ex = new Venue();
      const dir = mkdtempSync(join(tmpdir(), "cts-native-drain-"));
      const path = join(dir, "core.sqlite");
      const { rt } = rtOf(new CoreDb(path));
      const owned = lane(1, "S1-USDT", side, 10, 0.02, 0.05);
      const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      try {
        rt.paper.positions = [owned];
        await step();
        const original = ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice }));
        assert.equal(original.length, 2);
        flushLiveKv(rt.db);
        rt.db.db.close();
        const db = new CoreDb(path);
        db.kvSet("laneOrders", {}); // lost parent ledger: existing venue orders still provide protection
        const { rt: resumed } = rtOf(db);
        resumed.settings.live = { ...resumed.settings.live, laneOrders: false };
        resumed.paper.positions = [];
        tick(20_000);
        await stepLive(resumed as unknown as CoreRuntime, [], 1, ex);
        assert.ok(near(ex.positions.get(key)!, 0.2));
        assert.deepEqual(ex.orders.filter(isLane).map((o) => ({ id: o.id, qty: o.qty, stopPrice: o.stopPrice })), original,
          "unknown ownership cannot authorize cancelling or reallocating existing exits");
        flushLiveKv(db);
        db.db.close();
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });
  }
});
