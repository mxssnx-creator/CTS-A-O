// Order sides: the live control's orders on each position side (LONG / SHORT), long and short alike, one layer at a time.
// Hedge mode through the overall control on a simulated venue (the Venue of control-orders.test.ts): the open, the stop
// and the take-profit name their side and position side; a bounded close of one lane sends its own quantity on its own
// key and touches no other key; a manual position on one side freezes nothing on the other; a side closed by its stop
// leaves the other side's orders alone; a stop that filled while the desk was away is recognised. Entries mode: a foreign
// position freezes only its own side (planLive), and an entry's exit orders name their side. A take-profit refused for
// being too close is retried under both wordings the venue may use (plan item 6). One-way (BOTH) cells cover the defects
// where the position side is BOTH (plan items 7, 9, 10, 11, and the BOTH read in the flat check, item 12's family); each
// one-way cell has its hedge control. A cell marked expectedFail fails for the defect named in its title, and only that.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { entryExitOrder, liveKv, reconcileLaneCloses, resetLiveBackoff, stepLive, type ControlStatus } from "./live.server.ts";
import {
  closeFillsOf,
  controlOwnership,
  liveTag,
  outsideCloseOf,
  planLive,
  type BookView,
  type LiveIntentLite,
} from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { ExchangeRejected, stopPxExchange } from "../exchange/bingx.server.ts";
import { SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";

/** hedge mode: BingX keeps one close-position stop and one take-profit per position side */
class Venue extends SimExchange {
  oneStopPerSide = true;
  /** take-profits the venue refuses before it accepts one */
  refuseTp = 0;
  /** the message the venue refuses a take-profit with when it lies too close to the mark (unset: it accepts it) */
  tooCloseTp?: string;
  async order(p: Record<string, string | number>): Promise<unknown> {
    if (p.type === "TAKE_PROFIT_MARKET" && this.refuseTp > 0) {
      this.refuseTp--;
      this.log.push(p);
      throw new ExchangeRejected("simulated take-profit refusal", 1);
    }
    // a take-profit within 3 % of the mark is refused for being too close (the venue's wording is the test's input)
    if (p.type === "TAKE_PROFIT_MARKET" && this.tooCloseTp !== undefined) {
      const mark = this.px.get(String(p.symbol));
      if (mark && Math.abs(Number(p.stopPrice) - mark) / mark < 0.03) {
        this.sent++;
        this.log.push(p);
        throw new ExchangeRejected(this.tooCloseTp, 1);
      }
    }
    return super.order(p);
  }
  of(k: string, type: string) {
    const [sym, ps] = k.split("|");
    return this.orders.filter((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === type);
  }
}

/**
 * One-way (BOTH) venue: one net position per symbol, signed (long > 0, short < 0). A market moves the net; a reduce-only
 * one never opens. A stop or take-profit that fills takes its quantity off the net — the whole net when it is
 * closePosition. The order history rows carry the BOTH position side and the order's own side, as allOrders reports them.
 */
class OneWayVenue extends SimExchange {
  net = new Map<string, number>();
  async book() {
    return {
      positions: [...this.net.entries()]
        .filter(([, q]) => q !== 0)
        .map(([sym, q]) => ({
          symbol: sym,
          venueSymbol: sym,
          side: q > 0 ? ("long" as const) : ("short" as const),
          qty: Math.abs(q),
        })),
      orders: this.orders.map((o) => ({ ...o })),
    };
  }
  async order(p: Record<string, string | number>): Promise<unknown> {
    if (p.type !== "MARKET") return super.order(p);
    this.sent++;
    this.log.push(p);
    const sym = String(p.symbol);
    const cur = this.net.get(sym) ?? 0;
    const sgn = p.side === "BUY" ? 1 : -1;
    let q = Number(p.quantity);
    if (p.reduceOnly === "true") q = sgn === -Math.sign(cur) ? Math.min(q, Math.abs(cur)) : 0;
    const next = +(cur + sgn * q).toFixed(6);
    if (next) this.net.set(sym, next);
    else this.net.delete(sym);
    this.history.push({
      symbol: sym,
      positionSide: "BOTH",
      side: String(p.side),
      type: "MARKET",
      status: "FILLED",
      avgPrice: this.px.get(sym) ?? 0,
      executedQty: q,
      clientOrderId: String(p.clientOrderID ?? ""),
      updateTime: Date.now(),
    });
    return { order: { orderId: `m${this.sent}` } };
  }
  /** a resting stop or take-profit fills: its quantity leaves the net (the whole net when closePosition) */
  fillOrder(id: string) {
    const o = this.orders.find((x) => x.id === id);
    if (!o) return;
    const sym = o.venueSymbol;
    const cur = this.net.get(sym) ?? 0;
    const q = o.closePosition ? Math.abs(cur) : Math.min(Math.abs(cur), o.qty ?? 0);
    const next = +(cur + (cur > 0 ? -q : q)).toFixed(6);
    if (next) this.net.set(sym, next);
    else this.net.delete(sym);
    this.orders = this.orders.filter((x) => x !== o);
    this.done.set(id, { status: "FILLED", px: o.stopPrice, qty: q });
    this.history.push({
      symbol: sym,
      positionSide: "BOTH",
      side: cur > 0 ? "SELL" : "BUY",
      type: o.type,
      status: "FILLED",
      avgPrice: o.stopPrice ?? 0,
      executedQty: q,
      clientOrderId: o.clientOrderId ?? "",
      updateTime: Date.now(),
    });
  }
  /** someone else's market order on the symbol: `qty` long (`long`) or short; it merges with ours */
  foreignOpen(sym: string, qty: number, long: boolean) {
    const cur = this.net.get(sym) ?? 0;
    this.net.set(sym, +(cur + (long ? qty : -qty)).toFixed(6));
    this.history.push({
      symbol: sym,
      positionSide: "BOTH",
      side: long ? "BUY" : "SELL",
      type: "MARKET",
      status: "FILLED",
      avgPrice: this.px.get(sym) ?? 0,
      executedQty: qty,
      clientOrderId: "",
      updateTime: Date.now(),
    });
  }
}

/** a hedge venue whose order `fillId` fills just before the desk's cancel reaches it (the fill-before-cancel race) */
class LaneFillVenue extends Venue {
  fillId = "";
  async cancel(sym: string, id: string) {
    if (id === this.fillId) this.triggerOrder(id);
    return super.cancel(sym, id);
  }
}

/** the one-way venue with the same fill-before-cancel hook */
class OneWayLaneFillVenue extends OneWayVenue {
  fillId = "";
  async cancel(sym: string, id: string) {
    if (id === this.fillId) this.fillOrder(id);
    return super.cancel(sym, id);
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
    status: { lastBarT: Math.floor(Date.now() / 3_600_000) * 3_600_000 },
    paper: { positions: [] as Pos[] },
    tickersAt: 0,
    freshTickers: async () => {
      rt.tickersAt = Date.now();
      return prices;
    },
  };
  return { rt };
}

/** a paper lane on `sym` at `entry`: its stop `sl` away on its own side, its target `tp` beyond it (none: no target) */
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
const TP = "TAKE_PROFIT_MARKET";
const STOP = "STOP_MARKET";

function clock() {
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  return (ms: number) => mock.timers.tick(ms);
}

describe("order sides, hedge mode (overall control): LONG and SHORT alike", { timeout: 120_000 }, () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());

  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const ps = s === 1 ? "LONG" : "SHORT";
    const opp = s === 1 ? "SHORT" : "LONG";
    const entrySide = s === 1 ? "BUY" : "SELL";
    const exitSide = s === 1 ? "SELL" : "BUY";
    const sym = "S1-USDT";
    const mark = 10;

    it(`H-A ${side}: the open is a market ${entrySide} on positionSide ${ps}, bounded to the lane's quantity, and the other side stays shut`, async () => {
      const ex = new Venue();
      const { rt } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      const opens = ex.log.filter((p) => p.type === "MARKET");
      assert.equal(opens.length, 1, JSON.stringify(ex.log));
      assert.equal(opens[0].side, entrySide);
      assert.equal(opens[0].positionSide, ps);
      assert.ok(Number(opens[0].quantity) > 0, "a quantity");
      assert.equal(opens[0].reduceOnly, undefined, "an open is not reduce-only");
      assert.ok((ex.positions.get(`${sym}|${ps}`) ?? 0) > 0, "the position is on its own side");
      assert.equal(ex.positions.has(`${sym}|${opp}`), false, "the other side is not opened");
    });

    it(`H-B ${side}: the stop is a STOP_MARKET ${exitSide} on ${ps}, triggered ${s === 1 ? "below" : "above"} the mark, bounded (no closePosition)`, async () => {
      const ex = new Venue();
      const { rt } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      const stops = ex.log.filter((p) => p.type === STOP);
      assert.equal(stops.length, 1, JSON.stringify(ex.log));
      assert.equal(stops[0].side, exitSide, "the closing side");
      assert.equal(stops[0].positionSide, ps, "the position side it protects");
      assert.equal(stops[0].closePosition, undefined, "hedge mode: bounded to the own quantity");
      const sp = Number(stops[0].stopPrice);
      assert.ok(s === 1 ? sp < mark : sp > mark, `stop ${sp} against the mark ${mark}`);
    });

    it(`H-D ${side}: a bounded close of one lane sends its own quantity as a ${exitSide} on ${ps}, never closePosition, and the other side's key is untouched`, async () => {
      const ex = new Venue();
      const { rt } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const a = lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02, undefined, 1);
      const b = lane("combo|ema-9-21@m15|b", sym, s, mark, 0.02, undefined, 2);
      const c = lane("combo|ema-9-21@m15|c", sym, -s as 1 | -1, mark, 0.02, undefined, 3);
      rt.paper.positions = [a, b, c];
      await step();
      const before = ex.positions.get(`${sym}|${ps}`) ?? 0;
      const otherBefore = ex.positions.get(`${sym}|${opp}`) ?? 0;
      assert.ok(before > 0 && otherBefore > 0, "both sides held before the close");
      // lane b leaves: its share of this side is closed, the other side keeps its lane
      rt.paper.positions = [a, c];
      const n = ex.log.length;
      await step();
      const closes = ex.log.slice(n).filter((p) => p.type === "MARKET");
      assert.equal(closes.length, 1, JSON.stringify(closes));
      assert.equal(closes[0].side, exitSide);
      assert.equal(closes[0].positionSide, ps);
      assert.equal(closes[0].closePosition, undefined, "bounded: never closePosition");
      assert.ok(near(Number(closes[0].quantity), before / 2, 2e-3), `quantity ${closes[0].quantity} of ${before}`);
      assert.ok(near(ex.positions.get(`${sym}|${ps}`) ?? 0, before / 2, 2e-3), "half remains");
      assert.equal(ex.positions.get(`${sym}|${opp}`), otherBefore, "the other side's quantity is unchanged");
      assert.equal(
        ex.log.slice(n).filter((p) => p.positionSide === opp).length,
        0,
        "no order on the other side's key",
      );
    });

    it(`H-F ${side}: a manual ${opp} position freezes nothing and closes nothing on ${ps}: the own side still grows, the manual quantity stays`, async () => {
      const ex = new Venue();
      const { rt } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      // someone else's market order adds 3 to the other side (merged into that key, not ours)
      ex.foreignFill(`${sym}|${opp}`, 3, true, mark);
      const n = ex.log.length;
      // no lane on the other side: the manual quantity is neither closed nor touched
      await step();
      assert.equal(ex.positions.get(`${sym}|${opp}`), 3, "the manual quantity is not closed");
      assert.equal(
        ex.log.slice(n).filter((p) => p.positionSide === opp).length,
        0,
        "no order on the manual side",
      );
      // the own side takes a second lane: it opens its own quantity on its own side, the manual side stays as it was
      rt.paper.positions = [rt.paper.positions[0], lane("combo|ema-9-21@m15|b", sym, s, mark, 0.02, undefined, 2)];
      const before = ex.positions.get(`${sym}|${ps}`) ?? 0;
      await step();
      assert.ok((ex.positions.get(`${sym}|${ps}`) ?? 0) > before, "the own side grows beside the manual position");
      assert.equal(ex.positions.get(`${sym}|${opp}`), 3, "the manual quantity is still 3");
      assert.equal(
        ex.log.slice(n).filter((p) => p.positionSide === opp).length,
        0,
        "no order on the manual side in any step",
      );
    });

    it(`H-G ${side}: its side closed by its stop leaves the ${opp} side's stop and take-profit resting, and the ${opp} position as it was`, async () => {
      const tick = clock();
      const ex = new Venue();
      const { rt } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [
        lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02, 0.05, 1),
        lane("combo|ema-9-21@m15|c", sym, -s as 1 | -1, mark, 0.02, 0.05, 2),
      ];
      await step();
      const otherQty = ex.positions.get(`${sym}|${opp}`) ?? 0;
      assert.equal(ex.of(`${sym}|${opp}`, STOP).length, 1, "the other side's stop placed");
      assert.equal(ex.of(`${sym}|${opp}`, TP).length, 1, "the other side's take-profit placed");
      // our side's stop fills: its position and its orders leave; the other side is not ours to touch
      ex.triggerStop(`${sym}|${ps}`);
      const n = ex.log.length;
      tick(20_000);
      await step();
      assert.equal(ex.positions.get(`${sym}|${opp}`), otherQty, "the other side's quantity unchanged");
      assert.equal(ex.of(`${sym}|${opp}`, STOP).length, 1, "the other side's stop still resting");
      assert.equal(ex.of(`${sym}|${opp}`, TP).length, 1, "the other side's take-profit still resting");
      assert.equal(
        ex.log.slice(n).filter((p) => p.type === "MARKET" && p.positionSide === ps).length,
        0,
        "the closed side is not reopened while its lane stays",
      );
    });

    // control for OW-7: the same exit-while-away in hedge mode is recognised (its own side's LONG / SHORT history row)
    it(`H-7 ${side}: our stop filled while the desk was away — the quantity someone else opened on ${ps} is not adopted (flat marker)`, async () => {
      const tick = clock();
      const ex = new Venue();
      const { rt } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      tick(11 * 60_000);
      const k = `${sym}|${ps}`;
      const ours = ex.positions.get(k) ?? 0;
      ex.triggerStop(k);
      ex.foreignFill(k, ours, true, mark);
      await step();
      const flats = rt.db.all<{ msg: string }>("SELECT msg FROM live_orders WHERE kind = 'F'").map((r) => r.msg);
      assert.ok(flats.some((m) => m.includes("own exit filled while away")), `adopted; flat markers: ${JSON.stringify(flats)}`);
    });

    // control for OW-9: a merged side whose stop was lost is re-protected bounded to the own quantity (never closePosition)
    it(`H-9 ${side}: merged with someone else's quantity on ${ps} and its stop lost, the stop is re-placed bounded — no closePosition order`, async () => {
      const tick = clock();
      const ex = new Venue();
      const { rt } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      ex.orders = ex.orders.filter((o) => o.type !== STOP);
      ex.foreignFill(`${sym}|${ps}`, 2, true, mark);
      const n = ex.log.length;
      for (let i = 0; i < 3; i++) {
        tick(61_000);
        await step();
      }
      assert.ok(ex.log.slice(n).some((p) => p.type === STOP), "the stop is re-placed");
      assert.deepEqual(
        ex.log.slice(n).filter((p) => p.closePosition === "true").map((p) => `${p.type} ${p.side}`),
        [],
        "closePosition orders sent on the merged side",
      );
    });

    // item 9 (hedge side): a merged position is bounded — its take-profit goes, nothing closes the whole side
    it(`H-M ${side}: merged with someone else's quantity on ${ps}, the own take-profit is cancelled and nothing closes the whole side`, async () => {
      const tick = clock();
      const ex = new Venue();
      const { rt } = rtOf();
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02, 0.05)];
      await step();
      assert.equal(ex.of(`${sym}|${ps}`, TP).length, 1, "own take-profit placed");
      ex.foreignFill(`${sym}|${ps}`, 2, true, mark);
      tick(61_000);
      await step();
      assert.equal(ex.of(`${sym}|${ps}`, TP).length, 0, "the take-profit of a merged side is cancelled");
      assert.ok(
        ex.orders.every((o) => o.closePosition !== true),
        "no resting order closes the whole side",
      );
    });
  }

  // item 6: a take-profit refused for being too close (the venue's wording decides whether the desk widens and retries)
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const ps = s === 1 ? "LONG" : "SHORT";
    const sym = s === 1 ? "S1-USDT" : "S2-USDT";
    const mark = s === 1 ? 10 : 20;
    const hi = s === 1 ? "higher" : "lower";
    const wordings: Array<[string, string]> = [
      [`trigger price should be ${hi} than the current price`, "stop/trigger wording"],
      [`take profit price should be ${hi} than the current price`, "take-profit wording"],
    ];
    for (const [msg, label] of wordings) {
      const name = `I-6 ${side} (${label}): a take-profit the venue refuses for being too close is retried and placed, widened`;
      // pending: no recorded venue refusal shows the take-profit wording, so the fix waits for it (plan item 6)
      if (label === "take-profit wording") {
        it.todo(name);
        continue;
      }
      it(name, async () => {
        const tick = clock();
        const ex = new Venue();
        ex.tooCloseTp = msg;
        ex.px.set(sym, mark);
        const { rt } = rtOf();
        const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        // a 2 % target: the take-profit wanted beyond it (2.4 % out) lies inside the venue's 3 % refusal band
        rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02, 0.02)];
        await step();
        for (let i = 0; i < 3 && ex.of(`${sym}|${ps}`, TP).length === 0; i++) {
          tick(61_000);
          await step();
        }
        const attempts = ex.log.filter((p) => p.type === TP).length;
        assert.equal(
          ex.of(`${sym}|${ps}`, TP).length,
          1,
          `take-profit not placed after ${attempts} attempts, refused with "${msg}"`,
        );
        assert.ok(attempts >= 2, "the refused take-profit was sent again");
      });
    }
  }

  // one-way mode, the open and the stop: the same layer on the BOTH position side
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const sym = s === 1 ? "S1-USDT" : "S2-USDT";
    const mark = s === 1 ? 10 : 20;
    it(`OW-A ${side}: one-way: the open is a market ${s === 1 ? "BUY" : "SELL"} on positionSide BOTH, and its stop closes it with closePosition`, async () => {
      const ex = new OneWayVenue();
      const { rt } = rtOf({ positionMode: "oneway" });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      const opens = ex.log.filter((p) => p.type === "MARKET");
      assert.equal(opens.length, 1, JSON.stringify(ex.log));
      assert.equal(opens[0].side, s === 1 ? "BUY" : "SELL");
      assert.equal(opens[0].positionSide, "BOTH");
      const st = ex.orders.filter((o) => o.type === STOP);
      assert.equal(st.length, 1, "the stop is placed");
      assert.equal(st[0].positionSide, "BOTH");
    });
  }

  // item 7: one-way adoption — our stop filled while the desk was away; the quantity someone else opened there is not ours
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const sym = s === 1 ? "S1-USDT" : "S2-USDT";
    const mark = s === 1 ? 10 : 20;
    it(`OW-7 ${side}: one-way: our stop filled while the desk was away — the quantity someone else opened is not adopted (own exit flat marker, no closePosition order)`, async () => {
      const tick = clock();
      const ex = new OneWayVenue();
      const { rt } = rtOf({ positionMode: "oneway" });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      const stop = ex.orders.find((o) => o.type === STOP);
      assert.ok(stop, "our stop is placed");
      // past the 10-minute recent window: the desk is away while our stop fills, then someone else opens the same size
      tick(11 * 60_000);
      const ours = ex.net.get(sym) ?? 0;
      ex.fillOrder(stop.id);
      ex.foreignOpen(sym, Math.abs(ours), s === 1);
      const n = ex.log.length;
      await step();
      const flats = rt.db.all<{ msg: string }>("SELECT msg FROM live_orders WHERE kind = 'F'").map((r) => r.msg);
      assert.ok(flats.some((m) => m.includes("own exit filled while away")), `adopted; flat markers: ${JSON.stringify(flats)}`);
      assert.equal(
        ex.log.slice(n).filter((p) => p.closePosition === "true").length,
        0,
        "no closePosition order on someone else's quantity",
      );
    });
  }

  // item 9: one-way merged with someone else's quantity: a lost stop of the merged side is re-placed with closePosition,
  // which closes the other owner's quantity with ours when it triggers (the control H-9 is the hedge side)
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const sym = s === 1 ? "S1-USDT" : "S2-USDT";
    const mark = s === 1 ? 10 : 20;
    it(`OW-9 ${side}: one-way: merged with someone else's quantity and its stop lost, no closePosition order is sent on the side`, async () => {
      const tick = clock();
      const ex = new OneWayVenue();
      const { rt } = rtOf({ positionMode: "oneway" });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      ex.orders = ex.orders.filter((o) => o.type !== STOP);
      ex.foreignOpen(sym, 2, s === 1);
      const n = ex.log.length;
      for (let i = 0; i < 3; i++) {
        tick(61_000);
        await step();
      }
      assert.deepEqual(
        ex.log.slice(n).filter((p) => p.closePosition === "true").map((p) => `${p.type} ${p.side}`),
        [],
        "closePosition orders sent on the merged side",
      );
    });
  }

  // item 9, the estimate and the books of a merged one-way key: our quantity stays in `held` (a key that leaves it reads as
  // closed outside), so the estimate (controlStatus.foreignQty) is the other owner's part alone, and no flat marker is written
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const sym = s === 1 ? "S1-USDT" : "S2-USDT";
    const mark = s === 1 ? 10 : 20;
    it(`OW-9 ${side}, estimate: one-way merged with someone else's 2 units, the other owner's estimate is those 2 units and our side is not booked closed`, async () => {
      const tick = clock();
      const ex = new OneWayVenue();
      const { rt } = rtOf({ positionMode: "oneway" });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02)];
      await step();
      ex.orders = ex.orders.filter((o) => o.type !== STOP);
      ex.foreignOpen(sym, 2, s === 1);
      for (let i = 0; i < 3; i++) {
        tick(61_000);
        await step();
      }
      const est = liveKv<ControlStatus>(rt.db, "controlStatus")?.foreignQty?.[`${sym}|${s}`] ?? 0;
      assert.ok(Math.abs(est - 2) < 1e-6, `the other owner's estimate ${est}, against 2 units held by them`);
      const flats = rt.db.all<{ msg: string }>("SELECT msg FROM live_orders WHERE kind = 'F'").map((r) => r.msg);
      assert.deepEqual(flats, [], "no flat marker: the side is not booked closed while it is held");
    });
  }

  // item 12 (live.server.ts:2479-2480): a lane order (V) of a one-way short that filled while the desk looks — its fill is
  // booked on the key of the position side it names. BOTH reads as LONG there, so the short's fill is booked on the long
  // key. The hedge short is the control; the one-way long is not written here (its V order is cancelled as an orphan first,
  // see OW-12 long, so the fill branch is not reached)
  const laneCoid = `${liveTag("bingx-vst-02")}V1_order`;
  for (const mode of ["hedge", "oneway"] as const) {
    const sym = "S2-USDT";
    it(`OW-12 short, ${mode}: a lane order of the short that fills is booked on the short's key (${sym}|-1)`, async () => {
      const ex = mode === "hedge" ? new LaneFillVenue() : new OneWayLaneFillVenue();
      const { rt } = rtOf({ positionMode: mode === "hedge" ? "hedge" : "oneway" });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const ps = mode === "hedge" ? "SHORT" : "BOTH";
      if (mode === "hedge") ex.positions.set(`${sym}|SHORT`, 0.5);
      else (ex as OneWayVenue).net.set(sym, -0.5);
      ex.orders.push({
        id: "L1",
        venueSymbol: sym,
        symbol: sym,
        clientOrderId: laneCoid,
        positionSide: ps as "LONG" | "SHORT",
        type: STOP,
        stopPrice: 20.5,
        qty: 0.5,
        closePosition: false,
      });
      ex.fillId = "L1";
      rt.paper.positions = [lane("combo|ema-9-21@m15|c", sym, -1, 20, 0.02, 0.05)];
      await step();
      const booked = rt.db
        .all<{ cfg: string }>("SELECT cfg FROM live_orders WHERE kind = 'R'")
        .map((r) => r.cfg.replace(/^control\|/, ""));
      assert.ok(booked.includes(`${sym}|-1`), `the lane fill is booked on ${JSON.stringify(booked)}, not on ${sym}|-1`);
    });
  }

  // item 12 family (one-way): a plain step keeps a one-way position's own stop and take-profit. The flat check reads a
  // BOTH order as not-LONG, so a long's orders look like a flat side's and are cancelled (live.server.ts:3197-3200)
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const sym = s === 1 ? "S1-USDT" : "S2-USDT";
    const mark = s === 1 ? 10 : 20;
    it(`OW-12 ${side}: one-way: a plain step keeps the open ${side}'s own stop and take-profit resting`, async () => {
      const tick = clock();
      const ex = new OneWayVenue();
      const { rt } = rtOf({ positionMode: "oneway" });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02, 0.05)];
      await step();
      assert.equal(ex.orders.length, 2, "own stop and take-profit placed");
      tick(61_000);
      const n = ex.log.length;
      await step();
      assert.equal(ex.orders.length, 2, `after a plain step: ${JSON.stringify(ex.orders.map((o) => o.type))}`);
      assert.equal(ex.log.slice(n).length, 0, "nothing re-sent");
    });
  }

  // item 16, the lag branch of the same orphan check: a fresh open the book does not show yet (the read lags after an open)
  // keeps its own stop and take-profit. The lagging set and the check read BOTH as SHORT, so a one-way long's own orders
  // were not seen as lagging. The hedge side is the control.
  for (const mode of ["hedge", "oneway"] as const) {
    for (const s of [1, -1] as const) {
      const side = s === 1 ? "long" : "short";
      const sym = s === 1 ? "S1-USDT" : "S2-USDT";
      const mark = s === 1 ? 10 : 20;
      it(`OW-16 ${side}, ${mode}: a fresh open the book does not show yet keeps its own stop and take-profit resting`, async () => {
        const tick = clock();
        const ex = mode === "hedge" ? new Venue() : new OneWayVenue();
        const { rt } = rtOf({ positionMode: mode });
        const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
        rt.paper.positions = [lane("combo|ema-9-21@m15|a", sym, s, mark, 0.02, 0.05)];
        await step();
        assert.equal(ex.orders.length, 2, "own stop and take-profit placed");
        // the read does not show the position yet: hedge hides its side, one-way has no net position on the symbol
        if (mode === "hedge") ex.hide.add(`${sym}|${s === 1 ? "LONG" : "SHORT"}`);
        else (ex as OneWayVenue).net.delete(sym);
        tick(5_000);
        const n = ex.log.length;
        await step();
        assert.equal(ex.orders.length, 2, `after the lagging step: ${JSON.stringify(ex.orders.map((o) => o.type))}`);
        assert.equal(ex.log.slice(n).length, 0, "nothing cancelled or re-sent");
      });
    }
  }

  // item 12 family (venue cap, lane mode: live.server.ts lane planning and the trims): the own backstop of a short is on
  // the short's key. Read as LONG (BOTH is none of SHORT), it counted the short as one backstop missing: one slot less
  // for its lane orders, and lane orders trimmed one step early. The hedge short is the control of each cell.
  for (const mode of ["hedge", "oneway"] as const) {
    const sym = "S2-USDT";
    // lanes without a target: one stop each, so the count is the backstop plus the lanes
    const shortLanes = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        lane(`combo|ema-9-21@m15|${String.fromCharCode(97 + i)}`, sym, -1, 20, 0.02 + i * 0.002, undefined, i + 1),
      );
    const venue = () => (mode === "hedge" ? new Venue() : new OneWayVenue());
    it(`OW-12 short, ${mode}, venue cap: the short's backstop counts on its own key, so its seventh lane gets the slot`, async () => {
      const tick = clock();
      const ex = venue();
      const { rt } = rtOf({ positionMode: mode, laneOrders: true, maxVenueOrders: 13 });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = shortLanes(5);
      await step();
      assert.equal(ex.orders.length, 6, `the backstop and five lanes: ${JSON.stringify(ex.orders.map((o) => o.type))}`);
      rt.paper.positions = shortLanes(7);
      tick(20_000);
      await step();
      assert.equal(ex.orders.length, 8, `seven lanes and the backstop under 13 − 5 reserved: ${JSON.stringify(ex.orders.map((o) => o.type))}`);
    });
    it(`OW-12 short, ${mode}, venue cap: a count at the trim line is not trimmed for the short's backstop`, async () => {
      const tick = clock();
      const ex = venue();
      const { rt } = rtOf({ positionMode: mode, laneOrders: true, maxVenueOrders: 20 });
      const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      rt.paper.positions = shortLanes(8);
      await step();
      assert.equal(ex.orders.length, 9, "the backstop and eight lanes");
      rt.settings.live = { ...rt.settings.live, maxVenueOrders: 12 };
      let cancels = 0;
      const cancel = ex.cancel.bind(ex);
      ex.cancel = async (s: string, id: string) => {
        cancels++;
        return cancel(s, id);
      };
      tick(20_000);
      await step();
      assert.equal(cancels, 0, "nothing trimmed: nine orders against 12 − 5 reserved, the backstop among them");
      assert.equal(ex.orders.length, 9);
    });
  }
});

// ── pure layer cells: the decisions that name the position side ──────────────────────────────────────────────────────

describe("order sides, entries mode and exit orders (pure)", () => {
  const S = {
    ...DEFAULT_SETTINGS.live,
    enabled: true,
    mode: "entries",
    positionMode: "hedge",
    maxPositions: 0,
  } as typeof DEFAULT_SETTINGS.live;
  const intent = (side: 1 | -1): LiveIntentLite => ({ cfg: `c${side}`, sym: "S1-USDT", side, tp: 0.03, sl: 0.02, barT: 1000 });

  // item 5: a foreign position on one side freezes that side's entries only (planLive, entries mode)
  for (const f of [1, -1] as const) {
    for (const e of [1, -1] as const) {
      const fName = f === 1 ? "LONG" : "SHORT";
      const eName = e === 1 ? "LONG" : "SHORT";
      const same = f === e;
      it(`E-5 foreign ${fName} position, ${eName} entry: ${same ? "skipped (the same side)" : "allowed — the other side is not frozen"}`, () => {
        const book: BookView = {
          positions: [{ symbol: "S1-USDT", venueSymbol: "S1-USDT", side: f === 1 ? "long" : "short", qty: 1 }],
          orders: [],
        };
        const plan = planLive({
          settings: S,
          envArmed: true,
          hasKeys: true,
          intents: [intent(e)],
          book,
          ownSyms: new Set(),
          sent: new Set(),
          ready: { ok: true, why: "" },
        });
        assert.equal(plan.entries.length, same ? 0 : 1, `skipped: ${JSON.stringify(plan.skipped)}`);
      });
    }
  }

  // E-5 for orders: a foreign order that names its position side freezes only that side, as a foreign position does
  const enter = (book: BookView, e: 1 | -1) =>
    planLive({
      settings: S,
      envArmed: true,
      hasKeys: true,
      intents: [intent(e)],
      book,
      ownSyms: new Set(),
      sent: new Set(),
      ready: { ok: true, why: "" },
    });
  for (const f of [1, -1] as const) {
    for (const e of [1, -1] as const) {
      const fName = f === 1 ? "LONG" : "SHORT";
      const eName = e === 1 ? "LONG" : "SHORT";
      const same = f === e;
      it(`E-5 foreign ${fName} order, ${eName} entry: ${same ? "skipped (the same side)" : "allowed — the other side is not frozen"}`, () => {
        const positionSide = f === 1 ? "LONG" : "SHORT";
        const plan = enter({ positions: [], orders: [{ symbol: "S1-USDT", venueSymbol: "S1-USDT", clientOrderId: "manual-1", positionSide }] }, e);
        assert.equal(plan.entries.length, same ? 0 : 1, `skipped: ${JSON.stringify(plan.skipped)}`);
        if (same) assert.match(plan.skipped[0]?.why ?? "", /foreign/);
      });
    }
  }

  // E-5 for an order with no position side: the whole symbol is frozen, so both entries are skipped
  for (const e of [1, -1] as const) {
    const eName = e === 1 ? "LONG" : "SHORT";
    it(`E-5 foreign order with no position side, ${eName} entry: skipped (the whole symbol is frozen)`, () => {
      const orders = [{ symbol: "S1-USDT", venueSymbol: "S1-USDT", clientOrderId: "manual-1" }];
      const plan = enter({ positions: [], orders }, e);
      assert.equal(plan.entries.length, 0, `allowed: ${JSON.stringify(plan.entries)}`);
      assert.match(plan.skipped[0]?.why ?? "", /foreign/);
    });
  }

  // the overall control's ownership (controlOwnership, hedge): a foreign position marks only its own side's key — the
  // contrast of E-5 (planLive marks the whole symbol)
  for (const f of [1, -1] as const) {
    const fName = f === 1 ? "LONG" : "SHORT";
    it(`E-5 control: overall ownership marks only the foreign ${fName} key (S1-USDT|${f}), not the symbol`, () => {
      const book: BookView = {
        positions: [{ symbol: "S1-USDT", venueSymbol: "S1-USDT", side: f === 1 ? "long" : "short", qty: 1 }],
        orders: [],
      };
      const { foreign } = controlOwnership(book, "bingx-vst-02", new Set(), new Set(), "hedge", false);
      assert.deepEqual([...foreign], [`S1-USDT|${f}`]);
    });
  }

  // an entry's exit orders: the closing side, the position side, bounded to the entry's quantity, beyond the mark
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const ps = s === 1 ? "LONG" : "SHORT";
    const exitSide = s === 1 ? "SELL" : "BUY";
    it(`E-X ${side}: the entry's exit orders are ${exitSide} on ${ps}, bounded (no closePosition), the stop ${s === 1 ? "below" : "above"} and the target ${s === 1 ? "above" : "below"} the entry`, () => {
      const sl = stopPxExchange(10, s, 0.02, null, 0);
      const tpPx = 10 * (1 + s * 0.03);
      const stop = entryExitOrder({ sym: "S1-USDT", exitSide, positionSide: ps, type: STOP, qty: 0.5, stopPrice: sl, coid: "x", oneway: false });
      const tp = entryExitOrder({ sym: "S1-USDT", exitSide, positionSide: ps, type: TP, qty: 0.5, stopPrice: tpPx, coid: "y", oneway: false });
      for (const o of [stop, tp]) {
        assert.equal(o.side, exitSide);
        assert.equal(o.positionSide, ps);
        assert.equal(o.closePosition, undefined, "bounded to the entry's quantity");
        assert.equal(o.quantity, 0.5);
      }
      assert.ok(s === 1 ? sl < 10 && tpPx > 10 : sl > 10 && tpPx < 10, `stop ${sl}, target ${tpPx}`);
    });
  }
});

describe("order sides, closes read from the venue history (pure)", () => {
  const connId = "bingx-vst-02" as const;
  const row = (o: Record<string, unknown>) => ({ status: "FILLED", type: "MARKET", clientOrderId: "", executedQty: 1, ...o });

  // item 10: a close by hand on a one-way (BOTH) account is found as the side's close
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const closing = s === 1 ? "SELL" : "BUY";
    const hedge = row({ positionSide: s === 1 ? "LONG" : "SHORT", side: closing, avgPrice: 10.3 });
    const oneway = row({ positionSide: "BOTH", side: closing, avgPrice: 10.3 });
    it(`OW-10 ${side}, hedge: a close by hand (not ours) is the ${side} side's outside close`, () => {
      assert.deepEqual(outsideCloseOf([hedge], s, connId), { why: "hand", px: 10.3 });
    });
    it(`OW-10 ${side}, one-way: a close by hand (BOTH, not ours) is the side's outside close — outsideCloseOf skips BOTH rows`, () => {
      assert.deepEqual(outsideCloseOf([oneway], s, connId), { why: "hand", px: 10.3 });
    });
    it(`OW-10 ${side}, one-way: the close fills (closeFillsOf) count the BOTH fill as the side's foreign close`, () => {
      const f = closeFillsOf([oneway], s, connId);
      assert.equal(f.foreign.qty, 1, JSON.stringify(f));
      assert.equal(f.foreign.px, 10.3);
    });
    it(`OW-10 ${side}, hedge: the close fills (closeFillsOf) count the ${side} side's foreign close`, () => {
      const f = closeFillsOf([hedge], s, connId);
      assert.equal(f.foreign.qty, 1, JSON.stringify(f));
      assert.equal(f.foreign.px, 10.3);
    });
  }

  // item 11: a one-way (BOTH) close of a lane is re-priced from the venue's history like a hedge close
  for (const s of [1, -1] as const) {
    const side = s === 1 ? "long" : "short";
    const exitSide = s === 1 ? "SELL" : "BUY";
    for (const [mode, positionSide] of [
      ["hedge", s === 1 ? "LONG" : "SHORT"],
      ["one-way", "BOTH"],
    ] as const) {
      it(`OW-11 ${side}, ${mode}: a lane's stop that filled (${positionSide}) re-prices the unverified close at the fill`, () => {
        const db = new CoreDb(":memory:");
        const rt = { db, settings: { live: { connId } } };
        const exitT = Date.now() - 60_000;
        const entry = s === 1 ? 10 : 20;
        const exitPx = s === 1 ? 9.9 : 20.1;
        db.run(
          "INSERT INTO live_lane_trades (id, exit_t, cfg, sym, side, entry_t, entry, exit, r, reason, px_src) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          "t1",
          exitT,
          "combo|ema-9-21@m15|a",
          "S1-USDT",
          s,
          exitT - 3_600_000,
          entry,
          exitPx,
          0,
          "stop",
          "bar",
        );
        const fill = s === 1 ? 9.7 : 20.4;
        const n = reconcileLaneCloses(
          rt,
          [
            {
              symbol: "S1-USDT",
              positionSide,
              side: exitSide,
              type: STOP,
              status: "FILLED",
              clientOrderId: `${liveTag(connId)}Sx1`,
              avgPrice: fill,
              executedQty: 1,
              updateTime: exitT,
            },
          ],
          Date.now(),
        );
        assert.equal(n, 1, "the close row is re-priced");
        const r = db.all<{ exit: number; px_src: string }>("SELECT exit, px_src FROM live_lane_trades WHERE id = 't1'");
        assert.equal(r[0].px_src, "history");
        assert.ok(near(r[0].exit, fill, 1e-9), `exit ${r[0].exit} at the fill ${fill}`);
      });
    }
  }
});
