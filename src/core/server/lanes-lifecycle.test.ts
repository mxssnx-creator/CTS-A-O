// Lane orders end to end in Overall mode (control orders): every lane is an independent order on its (symbol,
// direction) position — a lane that joins grows the position by exactly its share, one that leaves shrinks it by its
// share, the last one closes it; Block type Overall legs are lane orders of their own and add up to the position's
// volume; long and short of one symbol are separate positions (hedge mode); every own position carries its own stop
// at every step and no own order rests on a flat side.
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { laneContributions, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;

class Ex implements ExchangeClient {
  positions = new Map<string, number>();
  orders: Array<{ id: string; venueSymbol: string; symbol: string; clientOrderId?: string; positionSide?: "LONG" | "SHORT"; type?: string; stopPrice?: number }> = [];
  private seq = 0;
  hasKeys() {
    return true;
  }
  fingerprint() {
    return "bingx-vst-02|testnet|lifecycle|k";
  }
  async book() {
    return {
      positions: [...this.positions.entries()].map(([k, qty]) => {
        const [venueSymbol, ps] = k.split("|");
        return { symbol: venueSymbol, venueSymbol, side: ps === "LONG" ? ("long" as const) : ("short" as const), qty };
      }),
      orders: this.orders.map((o) => ({ ...o })),
    };
  }
  async contracts() {
    return new Map(
      ["S1-USDT", "S2-USDT"].map((s) => [s, { symbol: s, minQty: 0.001, step: 0.001, qtyPrec: 3, pxPrec: 4, minUsdt: 2 }]),
    );
  }
  async setMarginMode() {}
  leverage = async () => ({ long: 20, short: 20, maxLong: 20, maxShort: 20 });
  setLeverage = async () => {};
  async order(p: Record<string, string | number>): Promise<unknown> {
    const sym = String(p.symbol);
    const ps = String(p.positionSide) as "LONG" | "SHORT";
    const key = `${sym}|${ps}`;
    if (p.type === "MARKET") {
      const into = (ps === "LONG" && p.side === "BUY") || (ps === "SHORT" && p.side === "SELL");
      const next = +((this.positions.get(key) ?? 0) + (into ? 1 : -1) * Number(p.quantity)).toFixed(6);
      if (next > 1e-9) this.positions.set(key, next);
      else this.positions.delete(key);
    } else {
      // BingX keeps one close-position stop per position side
      if (
        p.type === "STOP_MARKET" &&
        String(p.closePosition) === "true" &&
        this.orders.some((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === "STOP_MARKET")
      )
        throw new ExchangeRejected("Position SL order already exists", 109400);
      // BingX returns client order ids in lower case
      this.orders.push({
        id: `o${++this.seq}`,
        venueSymbol: sym,
        symbol: sym,
        clientOrderId: String(p.clientOrderID).toLowerCase(),
        positionSide: ps,
        type: String(p.type),
        stopPrice: Number(p.stopPrice),
      });
    }
    return undefined;
  }
  async cancel(_s: string, id: string) {
    const n = this.orders.length;
    this.orders = this.orders.filter((o) => o.id !== id);
    return this.orders.length < n;
  }
}

type Pos = { cfg: string; sym: string; side: 1 | -1; entry: number; stop: number; vol: number; entryT: number; legs?: Record<string, number> };

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
      sizing: { mode: "fixed" as const, pct: 0.02 },
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
  return rt;
}

describe("lane orders: independent, partial, Block Overall legs", { timeout: 120_000 }, () => {
  beforeEach(() => resetLiveBackoff());

  it("join grows, leave shrinks, last one closes; legs are own lane orders; stops always present, none orphaned", async () => {
    const ex = new Ex();
    const rt = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const L = (cfg: string, sym: string, side: 1 | -1, vol: number, entryT: number, legs?: Record<string, number>): Pos => {
      const px = sym === "S1-USDT" ? 10 : 20;
      return { cfg, sym, side, entry: px, stop: px * (1 - side * 0.02), vol, entryT, ...(legs ? { legs } : {}) };
    };
    // one unit = $10: S1 at 10 → 1 coin per lane unit, S2 at 20 → 0.5
    const invariants = (label: string) => {
      for (const [k] of ex.positions) {
        const [sym, ps] = k.split("|");
        const stops = ex.orders.filter((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === "STOP_MARKET");
        assert.equal(stops.length, 1, `${label}: ${k} carries exactly one own stop`);
      }
      for (const o of ex.orders)
        assert.ok(ex.positions.has(`${o.venueSymbol}|${o.positionSide}`), `${label}: no own order on a flat side (${o.venueSymbol} ${o.positionSide})`);
    };
    const a = L("combo|ema-9-21@m15|a", "S1-USDT", 1, 1, 1);
    const b = L("combo|ema-9-21@m15|b", "S1-USDT", 1, 2, 2);
    const c = L("combo|ema-9-21@m15|c", "S1-USDT", -1, 1, 3);
    // A Block type Overall position: volume 2.5 = base 1 + overall leg 1 + symbol leg 0.5
    const d = L("combo|ema-9-21@m15|d", "S2-USDT", 1, 2.5, 4, { overall: 1, symbol: 0.5 });

    rt.paper.positions = [a];
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 1, "lane a opens its unit");
    invariants("a");

    rt.paper.positions = [a, b];
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 3, "lane b joins: +2 units");
    invariants("a+b");

    rt.paper.positions = [a, b, c];
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 3, "the long side is unchanged");
    assert.equal(ex.positions.get("S1-USDT|SHORT"), 1, "lane c opens the short side apart (hedge)");
    invariants("a+b+c");

    rt.paper.positions = [b, c, d];
    // the legs are lane orders of their own, together exactly the position's volume
    const lanes = laneContributions(rt as unknown as CoreRuntime).filter((l) => l.sym === "S2-USDT");
    assert.equal(lanes.length, 3, "base + 2 legs");
    assert.ok(Math.abs(lanes.reduce((s, l) => s + l.vol, 0) - 2.5) < 1e-9);
    assert.equal(new Set(lanes.map((l) => l.id)).size, 3, "each leg has its own order id");
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 2, "lane a leaves: −1 unit (partial reduce)");
    assert.equal(ex.positions.get("S2-USDT|LONG"), 1.25, "Block Overall position: 2.5 units × 0.5");
    invariants("b+c+d");

    // the Block legs end with their position: the whole position closes
    rt.paper.positions = [b, c];
    await step();
    assert.equal(ex.positions.has("S2-USDT|LONG"), false, "position and legs closed together");
    invariants("b+c");

    rt.paper.positions = [];
    await step();
    assert.equal(ex.positions.size, 0, "the last lanes leave: everything closed");
    assert.equal(ex.orders.length, 0, "no own order left");
  });

  it("regression: a stop that fired on the exchange inside the sync window is seen before a joining lane is sized", async () => {
    const { cachedClient } = await import("./live.server.ts");
    const raw = new Ex();
    // the desk's 15 s exchange sync: the book is cached between our own orders (a plain client object, as
    // bingxClient returns — the wrapper spreads it)
    const plain = Object.fromEntries(
      [...Object.getOwnPropertyNames(Ex.prototype), "leverage", "setLeverage"]
        .filter((k) => k !== "constructor")
        .map((k) => [k, (raw as unknown as Record<string, (...a: unknown[]) => unknown>)[k].bind(raw)]),
    ) as unknown as ExchangeClient;
    const ex = cachedClient(plain, 15_000);
    const rt = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const a = { cfg: "combo|ema-9-21@m15|a", sym: "S1-USDT", side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: 1 };
    rt.paper.positions = [a];
    await step();
    assert.equal(raw.positions.get("S1-USDT|LONG"), 1);
    await step(); // a quiet step: the book is cached now
    // the exchange stop fires (position and its stop gone) — no order of ours, so the cache is not dirty
    raw.positions.delete("S1-USDT|LONG");
    raw.orders = [];
    // a second lane joins right after (paper still holds a: its exit is not known yet)
    rt.paper.positions = [a, { ...a, cfg: "combo|ema-9-21@m15|b", vol: 2, entryT: 2 }];
    await step();
    const stops = raw.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.positionSide === "LONG" && o.type === "STOP_MARKET");
    const qty = raw.positions.get("S1-USDT|LONG") ?? 0;
    // the stop-out is seen: the key's lanes are held back after an exchange close (no re-entry), or a fresh open
    // carries its stop — never the stale-book increase of 2 that opened a position with no stop
    assert.notEqual(qty, 2, "sized on the stale book: an increase of 2 on a position that no longer existed");
    if (qty > 0) assert.equal(stops.length, 1, "an open position carries its stop");
    else assert.equal(stops.length, 0, "no stop on a flat side");
  });

  it("regression: a leftover stop of ours on the side is cancelled and the new stop placed — the open is kept", async () => {
    const { makeCoid } = await import("./live.ts");
    const ex = new Ex();
    const rt = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    // a stop of ours left on the flat long side (a close whose cancels failed), and its cleanup cancel fails once
    ex.orders.push({
      id: "left",
      venueSymbol: "S1-USDT",
      symbol: "S1-USDT",
      clientOrderId: makeCoid(rt.settings.live.connId, "S").toLowerCase(),
      positionSide: "LONG",
      type: "STOP_MARKET",
      stopPrice: 9.5,
    });
    let failCancel = 1;
    const cancel = ex.cancel.bind(ex);
    ex.cancel = async (sym: string, id: string) => (failCancel-- > 0 ? false : cancel(sym, id));
    rt.paper.positions = [{ cfg: "combo|ema-9-21@m15|a", sym: "S1-USDT", side: 1, entry: 10, stop: 9.8, vol: 1, entryT: 1 }];
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 1, "the open was closed again (protective close on 'SL order already exists')");
    const stops = ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.positionSide === "LONG" && o.type === "STOP_MARKET");
    assert.equal(stops.length, 1, "exactly one stop on the side");
    assert.notEqual(stops[0].id, "left", "the new position's own stop, not the leftover");
  });

  it("regression: a lane's exit inside the default 25 % rebalance band still reduces the position by its share", async () => {
    const ex = new Ex();
    const rt = rtOf();
    // the default band (the test above runs with 0, which hid this)
    rt.settings.live = { ...rt.settings.live, rebalancePct: 0.25 };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const lane = (k: number) => ({
      cfg: `combo|ema-9-21@m15|l${k}`,
      sym: "S1-USDT",
      side: 1 as const,
      entry: 10,
      stop: 9.8,
      vol: 1,
      entryT: k,
    });
    rt.paper.positions = [1, 2, 3, 4, 5].map(lane);
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 5, "five lanes: five units");
    // one config exits (−20 %, inside the 25 % band): its share is closed on the exchange
    rt.paper.positions = [1, 2, 3, 4].map(lane);
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 4, "the exited lane's unit was left open");
    // a lane joins (+25 %, at the band): opened as well
    rt.paper.positions = [1, 2, 3, 4, 6].map(lane);
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 5, "the joining lane's unit was not opened");
    // nothing changed: no churn
    const orders = ex.orders.length;
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 5);
    assert.equal(ex.orders.length, orders, "an unchanged book sends nothing");
  });

  it("regression (x01): the backstop follows a wider lane although the exchange returns client ids in lower case", async () => {
    const ex = new Ex();
    const rt = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const tight = { cfg: "combo|ema-9-21@m15|t", sym: "S1-USDT", side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: 1 };
    rt.paper.positions = [tight];
    await step();
    const stopOf = () => ex.orders.filter((o) => o.type === "STOP_MARKET" && o.venueSymbol === "S1-USDT").map((o) => o.stopPrice);
    // 2 % lane stop → backstop 2.4 % below 10
    assert.deepEqual(stopOf(), [9.76]);
    // a lane with a 6 % stop joins: the backstop moves to 7.2 % below (placed first, the old one cancelled)
    rt.paper.positions = [tight, { ...tight, cfg: "combo|ema-9-21@m15|w", stop: 9.4, entryT: 2 }];
    await step();
    assert.deepEqual(stopOf(), [9.28], "re-priced to the wider lane (before the fix: the lower-case id missed the ledger and the stop stayed at 9.76)");
  });

  it("regression: a close that filled but whose reply timed out is confirmed as our close, not reported as a stop-out", async () => {
    const ex = new Ex();
    const rt = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const a = { cfg: "combo|ema-9-21@m15|a", sym: "S1-USDT", side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: 1 };
    rt.paper.positions = [a];
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 1);
    // the lane exits; the close executes on the exchange but its reply is lost (a time-out)
    const order = ex.order.bind(ex);
    ex.order = async (p: Record<string, string | number>) => {
      await order(p);
      if (p.type === "MARKET") throw new Error("request timed out");
    };
    rt.paper.positions = [];
    await step();
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "the close executed on the exchange");
    ex.order = order;
    resetLiveBackoff();
    await step();
    const rows = rt.db.all<{ kind: string; status: string; msg: string }>(
      "SELECT kind, status, msg FROM live_orders WHERE kind = 'X'",
    );
    assert.ok(rows.length >= 1 && rows.every((r) => r.status === "ok"), `the close row is done: ${JSON.stringify(rows)}`);
    const events = rt.db.all<{ msg: string }>("SELECT msg FROM events").map((e) => e.msg);
    assert.ok(events.some((m) => /closed by our own close order/.test(m)), "confirmed as our own close");
    assert.ok(!events.some((m) => /closed by its exchange stop/.test(m)), "reported as an exchange stop-out");
  });

  it("regression: a re-price whose cancel went through without confirming places the new stop at once (never bare)", async () => {
    const ex = new Ex();
    const rt = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const tight = { cfg: "combo|ema-9-21@m15|t", sym: "S1-USDT", side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: 1 };
    rt.paper.positions = [tight];
    await step();
    const stopOf = () => ex.orders.filter((o) => o.type === "STOP_MARKET" && o.venueSymbol === "S1-USDT").map((o) => o.stopPrice);
    assert.deepEqual(stopOf(), [9.76]);
    // every cancel now executes but its reply says it failed (a timed-out reply)
    const cancel = ex.cancel.bind(ex);
    ex.cancel = async (sym: string, id: string) => {
      await cancel(sym, id);
      return false;
    };
    rt.paper.positions = [tight, { ...tight, cfg: "combo|ema-9-21@m15|w", stop: 9.4, entryT: 2 }];
    await step();
    assert.ok(ex.positions.get("S1-USDT|LONG")! > 0, "the position is held");
    assert.deepEqual(stopOf(), [9.28], "the old stop was cancelled and none placed: the position sat bare");
  });

  it("the live record: each lane at the exchange's fill prices; a stop-out at the stop price", async () => {
    const ex = new Ex();
    const rt = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    // the exchange fills market orders at its own price, not the ticker's
    let fillPx = 10.1;
    const order = ex.order.bind(ex);
    ex.order = async (p: Record<string, string | number>) => {
      await order(p);
      return p.type === "MARKET" ? { order: { avgPrice: fillPx, executedQty: Number(p.quantity), commission: 0 } } : undefined;
    };
    const a = { cfg: "combo|ema-9-21@m15|a", sym: "S1-USDT", side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: 1 };
    const b = { ...a, cfg: "combo|ema-9-21@m15|b", entryT: 2 };
    rt.paper.positions = [a];
    await step();
    fillPx = 10.2;
    rt.paper.positions = [a, b];
    await step();
    fillPx = 10.3;
    rt.paper.positions = [b];
    await step();
    const cost = rt.settings.cost;
    const rows = () =>
      rt.db.all<{ cfg: string; entry: number; exit: number; r: number; reason: string }>(
        "SELECT cfg, entry, exit, r, reason FROM live_lane_trades ORDER BY exit_t, cfg",
      );
    assert.equal(rows().length, 1);
    assert.deepEqual({ ...rows()[0], r: +rows()[0].r.toFixed(9) }, {
      cfg: a.cfg,
      entry: 10.1,
      exit: 10.3,
      r: +(0.2 / 10.1 - cost).toFixed(9),
      reason: "exit",
    });
    // the exchange stop fires: b closes at its stop price, though the paper book still holds it
    const stopPx = ex.orders.find((o) => o.type === "STOP_MARKET")!.stopPrice!;
    ex.positions.clear();
    ex.orders = [];
    // (regression: the step before reduced this side, and a flat side after a reduce was taken for our own close —
    // the lanes reopened the same position at market)
    await step();
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "the stopped-out position is not reopened");
    const r = rows();
    assert.equal(r.length, 2);
    assert.equal(r[1].cfg, b.cfg);
    assert.equal(r[1].reason, "stop");
    assert.equal(r[1].entry, 10.2);
    assert.equal(r[1].exit, stopPx);
  });

  it("no chasing: a new lane whose price ran past maxChase of its target distance waits; one on the exchange stays", async () => {
    const ex = new Ex();
    const rt = rtOf();
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const prices = await rt.freshTickers();
    const setPx = (sym: string, px: number) => {
      const p = prices.find((x) => x.sym === sym);
      if (p) p.last = px;
    };
    // a long entered at 9.5 with its target at 10.5: at 10 the price has run 0.5 / 1.0 = 50 % of the target distance
    const late = { cfg: "combo|ema-9-21@m15|late", sym: "S1-USDT", side: 1 as const, entry: 9.5, stop: 9.0, target: 10.5, vol: 1, entryT: 1 };
    rt.paper.positions = [late];
    const st = await step();
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "not opened at a run-away price (default maxChase 0.25)");
    assert.equal(st.control?.chased, 1);
    // within the bound (price 9.7 = 20 % of the target distance): opened
    setPx("S1-USDT", 9.7);
    await step();
    assert.ok(ex.positions.has("S1-USDT|LONG"), "opened while the run is within maxChase");
    // the price runs on (10.4 = 90 %): the lane is on the exchange and stays
    setPx("S1-USDT", 10.4);
    const st2 = await step();
    assert.ok(ex.positions.has("S1-USDT|LONG"), "a lane on the exchange is never dropped for the run");
    assert.equal(st2.control?.chased ?? 0, 0);
    // a cheaper entry than the paper's (price below it) is never held back; 0 switches the guard off
    const other = { ...late, cfg: "combo|ema-9-21@m15|cheap", sym: "S2-USDT", entry: 21, stop: 19, target: 23, entryT: 2 };
    rt.paper.positions = [late, other];
    await step();
    assert.ok(ex.positions.has("S2-USDT|LONG"), "below its paper entry: opened");
    rt.settings.live = { ...rt.settings.live, maxChase: 0 };
    const third = { ...late, cfg: "combo|ema-9-21@m15|third", entryT: 3 };
    rt.paper.positions = [late, other, third];
    const st3 = await step();
    assert.equal(st3.control?.chased ?? 0, 0, "maxChase 0: off");
  });
});
