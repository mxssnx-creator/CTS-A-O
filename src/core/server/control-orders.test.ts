// Complete control orders: every exchange position carries its stop (STOP_MARKET) and, when every lane on it has a
// target, its take-profit (TAKE_PROFIT_MARKET beyond the farthest target), long and short alike; the take-profit is
// repaired, re-priced and removed like the stop; a position the exchange closes is booked at the order that closed
// it; the stop follows trailing lanes in both directions and stays inside the liquidation price; positionSize "min"
// holds every position at the exchange minimum.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { liveKv, resetLiveBackoff, stepLive, type ControlStatus } from "./live.server.ts";
import { closedBy, tpDistFor, tpFits } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;

class Venue extends SimExchange {
  oneStopPerSide = true;
  /** take-profits the venue refuses before it accepts one */
  refuseTp = 0;
  async order(p: Record<string, string | number>): Promise<unknown> {
    if (p.type === "TAKE_PROFIT_MARKET" && this.refuseTp > 0) {
      this.refuseTp--;
      this.log.push(p);
      throw new ExchangeRejected("simulated take-profit refusal", 1);
    }
    return super.order(p);
  }
  of(k: string, type: string) {
    const [sym, ps] = k.split("|");
    return this.orders.filter((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === type);
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

function rtOf(live: Record<string, unknown> = {}, sizing: { mode: string; pct: number } = { mode: "fixed", pct: 0.02 }) {
  const prices = [
    { sym: "S1-USDT", last: 10 },
    { sym: "S2-USDT", last: 20 },
  ];
  const rt = {
    generation: 1,
    db: new CoreDb(":memory:"),
    settings: {
      ...DEFAULT_SETTINGS,
      sizing,
      live: {
        ...DEFAULT_SETTINGS.live,
        enabled: true,
        mode: "overall" as const,
        positionMode: "hedge" as const,
        notionalUsd: 10,
        ratio: 1,
        maxNotionalUsd: 1000,
        maxPositions: 0,
        rebalancePct: 0,
        top: 0,
        minFreeMargin: 0,
        maxPositionX: 0,
        maxExposureX: 0,
        maxRiskPct: 0,
        maxBackstopLossPct: 0,
        maxChase: 0,
        ...live,
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

const lane = (cfg: string, sym: string, side: 1 | -1, entry: number, sl: number, tp?: number, entryT = 1): Pos => ({
  cfg,
  sym,
  side,
  entry,
  stop: entry * (1 - side * sl),
  vol: 1,
  entryT,
  ...(tp !== undefined ? { target: entry * (1 + side * tp) } : {}),
});
// (venue prices snap away from the mark: a float a hair over a tick rounds one tick further)
const near = (a: number, b: number, eps = 2.5e-4) => Math.abs(a - b) < eps;
const statusOf = (rt: { db: CoreDb }) => liveKv<ControlStatus>(rt.db, "controlStatus")!;

describe("control orders: complete (stop, take-profit, trailing), long and short", { timeout: 120_000 }, () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());
  const clock = () => {
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    return (ms: number) => mock.timers.tick(ms);
  };

  it("the take-profit's distance and fit (pure)", () => {
    // 1.2 × the farthest target's distance, at least the floor, at most 50 %; none at or past the target
    assert.ok(near(tpDistFor(1, 10.5, 10, 0.01), 0.06));
    assert.ok(near(tpDistFor(-1, 9.6, 10, 0.01), 0.048));
    assert.ok(near(tpDistFor(1, 10.05, 10, 0.01), 0.01));
    assert.equal(tpDistFor(1, 10, 10, 0.01), 0);
    assert.equal(tpDistFor(-1, 10.2, 10, 0.01), 0);
    // at most 90 % while that still lies beyond the target; a target that far out gets none (it would be cut)
    assert.ok(near(tpDistFor(1, 18, 10, 0.01), 0.9));
    assert.equal(tpDistFor(1, 30, 10, 0.01), 0);
    assert.equal(tpDistFor(-1, 0.5, 10, 0.01), 0);
    // fits: beyond the target, not more than its own distance past the wanted price
    assert.equal(tpFits(1, 10.55, 10.5, 10.6, 10), true);
    assert.equal(tpFits(1, 10.45, 10.5, 10.6, 10), false, "inside the farthest target");
    assert.equal(tpFits(1, 11.3, 10.5, 10.6, 10), false, "left far out");
    assert.equal(tpFits(-1, 9.5, 9.6, 9.52, 10), true);
    assert.equal(tpFits(-1, 9.65, 9.6, 9.52, 10), false);
  });

  it("which order closed a position the exchange closed (pure)", () => {
    const x = { stopPx: 9.7, tpPx: 10.6, px: 10.6 };
    assert.deepEqual(closedBy({ ...x, stopLeft: true, tpLeft: false }), { px: 10.6, why: "target" });
    assert.deepEqual(closedBy({ ...x, stopLeft: false, tpLeft: true }), { px: 9.7, why: "stop" });
    assert.deepEqual(closedBy({ ...x, stopLeft: true, tpLeft: true }), { px: null, why: "hand" });
    // both gone (the venue cancels the other with the position): the level nearer to the price now
    assert.deepEqual(closedBy({ ...x, stopLeft: false, tpLeft: false }), { px: 10.6, why: "target" });
    assert.deepEqual(closedBy({ ...x, px: 9.75, stopLeft: false, tpLeft: false }), { px: 9.7, why: "stop" });
    // no take-profit on the position: as before (the stop resting = by hand, gone = by its stop)
    assert.deepEqual(closedBy({ ...x, tpPx: null, stopLeft: true, tpLeft: false }), { px: null, why: "hand" });
    assert.deepEqual(closedBy({ ...x, tpPx: null, stopLeft: false, tpLeft: false }), { px: 9.7, why: "stop" });
  });

  it("every position carries its stop and its take-profit on the right sides, long and short; nothing churns", async () => {
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = [
      lane("combo|ema-9-21@m15|a", "S1-USDT", 1, 10, 0.02, 0.03),
      lane("combo|ema-9-21@m15|b", "S1-USDT", 1, 10, 0.02, 0.05, 2),
      lane("combo|ema-9-21@m15|c", "S1-USDT", -1, 10, 0.02, 0.04, 3),
    ];
    await step();
    assert.ok(ex.positions.has("S1-USDT|LONG") && ex.positions.has("S1-USDT|SHORT"));
    const [ls] = ex.of("S1-USDT|LONG", "STOP_MARKET");
    const [lt] = ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET");
    const [ss] = ex.of("S1-USDT|SHORT", "STOP_MARKET");
    const [st] = ex.of("S1-USDT|SHORT", "TAKE_PROFIT_MARKET");
    assert.ok(ls && lt && ss && st, "a stop and a take-profit on each side");
    assert.ok(ls.stopPrice! < 10 && lt.stopPrice! > 10, "long: stop below, take-profit above");
    assert.ok(ss.stopPrice! > 10 && st.stopPrice! < 10, "short: stop above, take-profit below");
    // beyond the farthest lane target by 1.2 × its distance: long 10.5 → 10.6, short 9.6 → 9.52
    assert.ok(near(lt.stopPrice!, 10.6), `long take-profit ${lt.stopPrice}`);
    assert.ok(near(st.stopPrice!, 9.52), `short take-profit ${st.stopPrice}`);
    const sent = ex.log.filter((p) => p.type === "TAKE_PROFIT_MARKET");
    assert.ok(sent.every((p) => String(p.closePosition) === "true"));
    assert.deepEqual(
      sent.map((p) => `${p.positionSide} ${p.side}`).sort(),
      ["LONG SELL", "SHORT BUY"],
      "each closes its own side",
    );
    const n = ex.log.length;
    await step();
    await step();
    assert.equal(ex.log.length, n, "a steady book sends nothing more");
    const c = statusOf(rt);
    assert.deepEqual(
      { ...c.protect },
      { positions: 2, stops: 2, tps: 2, noTarget: 0 },
      "completeness: 2 positions, 2 stops, 2 take-profits",
    );
  });

  it("a refused take-profit is placed by the upkeep; a lane without a target removes it; a farther target moves it", async () => {
    const tick = clock();
    const ex = new Venue();
    ex.refuseTp = 1;
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const a = lane("combo|ema-9-21@m15|a", "S1-USDT", 1, 10, 0.02, 0.05);
    rt.paper.positions = [a];
    await step();
    assert.equal(ex.of("S1-USDT|LONG", "STOP_MARKET").length, 1, "the stop is placed");
    assert.equal(ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 0, "the take-profit was refused");
    assert.ok(ex.positions.has("S1-USDT|LONG"), "a refused take-profit never closes the position");
    // (the completeness count is the step's own read: the next step shows what this one left)
    await step();
    assert.deepEqual(statusOf(rt).protect?.tpsMissing, ["S1-USDT|1"]);
    assert.equal(ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 0, "the upkeep waits out the backoff");
    tick(31_000);
    await step();
    assert.equal(ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 1, "the upkeep placed it after the backoff");

    // a lane with no target joins: no take-profit may cut its run
    const b = { ...lane("combo|ema-9-21@m15|b", "S1-USDT", 1, 10, 0.02, undefined, 2) };
    rt.paper.positions = [a, b];
    tick(1_000);
    await step();
    assert.equal(ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET").length, 0, "removed for the target-less lane");
    assert.equal(statusOf(rt).protect?.noTarget, 1);

    // it leaves; a lane with a farther target joins: placed beyond the new farthest target (10.8 → 10.96)
    const c = lane("combo|ema-9-21@m15|c", "S1-USDT", 1, 10, 0.02, 0.08, 3);
    rt.paper.positions = [a, c];
    tick(1_000);
    await step();
    const [t1] = ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET");
    assert.ok(t1 && near(t1.stopPrice!, 10.96), `beyond 10.8: ${t1?.stopPrice}`);
    // a still farther one (11.2): the resting take-profit lies inside it — re-priced (at most once a minute)
    const d = lane("combo|ema-9-21@m15|d", "S1-USDT", 1, 10, 0.02, 0.12, 4);
    rt.paper.positions = [a, c, d];
    tick(61_000);
    await step();
    const tps = ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET");
    assert.equal(tps.length, 1, "one take-profit per side");
    assert.ok(near(tps[0].stopPrice!, 11.44), `beyond 11.2: ${tps[0].stopPrice}`);
    // the price moves toward the target: the take-profit stays (beyond the target, not far out)
    const n = ex.log.length;
    tick(61_000);
    await step();
    assert.equal(ex.log.length, n);
  });

  it("closed by its take-profit: booked as target exits at its price; by its stop: stop exits; never reopened", async () => {
    const tick = clock();
    for (const keepStop of [false, true]) {
      resetLiveBackoff();
      const ex = new Venue();
      const { rt, price } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const a = lane("combo|ema-9-21@m15|a", "S1-USDT", 1, 10, 0.02, 0.05);
      const s = lane("combo|ema-9-21@m15|s", "S2-USDT", -1, 20, 0.02, 0.05);
      rt.paper.positions = [a, s];
      await step();
      const tp = ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET")[0].stopPrice!;
      const sp = ex.of("S2-USDT|SHORT", "STOP_MARKET")[0].stopPrice!;
      // the long runs through its take-profit, the short's stop is hit
      price("S1-USDT", tp);
      price("S2-USDT", sp);
      ex.triggerTarget("S1-USDT|LONG", keepStop);
      ex.triggerStop("S2-USDT|SHORT");
      const opens = ex.log.filter((p) => p.type === "MARKET").length;
      // (past the held-unknown window of a fresh open: a side read flat with its own order resting right after the
      // open is taken for a lagging read for 15 s)
      tick(20_000);
      await step();
      const rows = rt.db.all<{ sym: string; reason: string; exit: number }>(
        "SELECT sym, reason, exit FROM live_lane_trades ORDER BY sym",
      );
      assert.deepEqual(
        rows.map((r) => [r.sym, r.reason, r.exit]),
        [
          ["S1-USDT", "target", tp],
          ["S2-USDT", "stop", sp],
        ],
        `keepStop ${keepStop}`,
      );
      await step();
      assert.equal(ex.log.filter((p) => p.type === "MARKET").length, opens, "not reopened");
      assert.equal(ex.orders.length, 0, "no own order left on a flat side");
    }
  });

  it("trailing: the stop follows the lanes' trailed stops — up for a long, down for a short — and holds on a pullback", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt, price } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const L = lane("trail|ema-9-21@m15|tr2", "S1-USDT", 1, 10, 0.02, 0.5);
    const S = lane("trail|ema-9-21@m15|tr2", "S2-USDT", -1, 20, 0.02, 0.5);
    rt.paper.positions = [L, S];
    await step();
    const stopOf = (k: string) => ex.of(k, "STOP_MARKET")[0].stopPrice!;
    let l0 = stopOf("S1-USDT|LONG");
    let s0 = stopOf("S2-USDT|SHORT");
    // the trend runs, the lanes trail (the tick advances p.stop): the exchange stop follows each step
    for (let i = 1; i <= 3; i++) {
      price("S1-USDT", 10 + i * 0.5);
      price("S2-USDT", 20 - i * 1);
      L.stop = (10 + i * 0.5) * 0.98;
      L.trailOn = true;
      S.stop = (20 - i * 1) * 1.02;
      S.trailOn = true;
      tick(61_000);
      await step();
      const l1 = stopOf("S1-USDT|LONG");
      const s1 = stopOf("S2-USDT|SHORT");
      assert.ok(l1 > l0, `long stop up ${l0} → ${l1}`);
      assert.ok(l1 < L.stop, "beyond the lane's own stop");
      assert.ok(s1 < s0, `short stop down ${s0} → ${s1}`);
      assert.ok(s1 > S.stop, "beyond the lane's own stop");
      l0 = l1;
      s0 = s1;
    }
    assert.equal(ex.of("S1-USDT|LONG", "STOP_MARKET").length, 1);
    assert.equal(ex.of("S2-USDT|SHORT", "STOP_MARKET").length, 1);
    // a pullback toward the trailed stops: the exchange stops never move away from them
    price("S1-USDT", 11.3);
    price("S2-USDT", 17.3);
    tick(61_000);
    await step();
    assert.ok(stopOf("S1-USDT|LONG") >= l0, "long stop not lowered on the pullback");
    assert.ok(stopOf("S2-USDT|SHORT") <= s0, "short stop not raised on the pullback");
    // and the take-profits stay beyond the targets throughout
    assert.ok(ex.of("S1-USDT|LONG", "TAKE_PROFIT_MARKET")[0].stopPrice! > L.target!);
    assert.ok(ex.of("S2-USDT|SHORT", "TAKE_PROFIT_MARKET")[0].stopPrice! < S.target!);
  });

  it("the stop stays inside the liquidation price the exchange reports", async () => {
    const tick = clock();
    const ex = new Venue();
    const { rt } = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    rt.paper.positions = [
      lane("combo|ema-9-21@m15|a", "S1-USDT", 1, 10, 0.05, 0.05),
      lane("combo|ema-9-21@m15|b", "S2-USDT", -1, 20, 0.05, 0.05),
    ];
    await step();
    // a 6 % backstop (5 % × 1.2) — then the venue reports liquidation 2 % away
    ex.liq.set("S1-USDT|LONG", 9.8);
    ex.liq.set("S2-USDT|SHORT", 20.4);
    tick(61_000);
    await step();
    const ls = ex.of("S1-USDT|LONG", "STOP_MARKET");
    const ss = ex.of("S2-USDT|SHORT", "STOP_MARKET");
    assert.equal(ls.length, 1);
    assert.ok(ls[0].stopPrice! > 9.8 && ls[0].stopPrice! < 10, `long stop ${ls[0].stopPrice} inside 9.8`);
    assert.ok(ss[0].stopPrice! < 20.4 && ss[0].stopPrice! > 20, `short stop ${ss[0].stopPrice} inside 20.4`);
    // a lost stop is repaired inside it too
    ex.orders = ex.orders.filter((o) => !(o.venueSymbol === "S1-USDT" && o.type === "STOP_MARKET"));
    tick(1_000);
    await step();
    const r = ex.of("S1-USDT|LONG", "STOP_MARKET");
    assert.equal(r.length, 1);
    assert.ok(r[0].stopPrice! > 9.8, `repaired stop ${r[0].stopPrice}`);
  });

  it('positionSize "min": every position at the exchange minimum whatever its lanes, never resized', async () => {
    const ex = new Venue();
    const { rt } = rtOf({ positionSize: "min", ratio: 1 }, { mode: "minQty", pct: 0.02 });
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    // S1 at 10: the minimum is max(0.001, 2 USDT / 10) = 0.2
    const ls = [1, 2, 3, 4, 5].map((i) => lane(`combo|ema-9-21@m15|${i}`, "S1-USDT", 1, 10, 0.02, 0.05, i));
    rt.paper.positions = ls.slice(0, 3);
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 0.2, "3 lanes: the minimum");
    const n = ex.log.filter((p) => p.type === "MARKET").length;
    rt.paper.positions = ls;
    await step();
    rt.paper.positions = ls.slice(4);
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 0.2, "5 lanes, then 1: still the minimum");
    assert.equal(ex.log.filter((p) => p.type === "MARKET").length, n, "never resized");
    rt.paper.positions = [];
    await step();
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "closed with its last lane");
    assert.equal(ex.orders.length, 0);
  });
});
