// Regression tests for the control (overall) orders, from an audit of the path: one-way flips, the minimum-amount
// retry cap, contract outages, the own-quantity ledger (stop-outs, foreign remainders, trimming), stop repair while a
// close fails, and the free-margin floor within one step. Each test asserts the correct behaviour.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { cachedClient, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import { ownLedger } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;
function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

class SimExchange implements ExchangeClient {
  positions = new Map<string, number>();
  orders: Array<{
    id: string;
    venueSymbol: string;
    symbol: string;
    clientOrderId?: string;
    positionSide?: "LONG" | "SHORT";
    type?: string;
  }> = [];
  log: Array<Record<string, string | number>> = [];
  sent = 0;
  key = "key-A";
  emptyContracts = false;
  private seq = 0;
  r: () => number;
  constructor(r: () => number) {
    this.r = r;
  }
  hasKeys() {
    return true;
  }
  fingerprint() {
    return `bingx-vst-02|testnet|sim|${this.key}`;
  }
  async book() {
    return {
      positions: [...this.positions.entries()].map(([k, qty]) => {
        const [venueSymbol, ps] = k.split("|");
        return {
          symbol: venueSymbol,
          venueSymbol,
          side: ps === "LONG" ? ("long" as const) : ("short" as const),
          qty,
        };
      }),
      orders: this.orders.map((o) => ({ ...o })),
    };
  }
  async contracts() {
    const m = new Map();
    if (this.emptyContracts) return m;
    for (let i = 0; i < 12; i++)
      m.set(`S${i}-USDT`, {
        symbol: `S${i}-USDT`,
        minQty: 0.001,
        step: 0.001,
        qtyPrec: 3,
        pxPrec: 4,
        minUsdt: 2,
      });
    return m;
  }
  async setMarginMode() {}
  async order(p: Record<string, string | number>) {
    this.sent++;
    this.log.push(p);
    const sym = String(p.symbol);
    const ps = String(p.positionSide);
    const key = `${sym}|${ps}`;
    if (p.type === "MARKET") {
      const into = (ps === "LONG" && p.side === "BUY") || (ps === "SHORT" && p.side === "SELL");
      const q = Number(p.quantity);
      const cur = this.positions.get(key) ?? 0;
      const next = +(into ? cur + q : Math.max(0, cur - q)).toFixed(6);
      if (next > 0) this.positions.set(key, next);
      else this.positions.delete(key);
    } else {
      // BingX keeps one close-position stop per position side (the live rule x01 ran into)
      if (
        p.type === "STOP_MARKET" &&
        String(p.closePosition) === "true" &&
        this.orders.some((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === "STOP_MARKET")
      )
        throw new ExchangeRejected("Position SL order already exists", 109400);
      this.orders.push({
        id: `o${++this.seq}`,
        venueSymbol: sym,
        symbol: sym,
        clientOrderId: String(p.clientOrderID),
        positionSide: ps as "LONG",
        type: String(p.type),
      });
    }
  }
  async cancel(_s: string, id: string) {
    const n = this.orders.length;
    this.orders = this.orders.filter((o) => o.id !== id);
    return this.orders.length < n;
  }
}

function fakeRt(db: CoreDb) {
  const prices = Array.from({ length: 12 }, (_, i) => ({ sym: `S${i}-USDT`, last: 10 + i * 7 }));
  const rt = {
    generation: 1,
    db,
    settings: {
      ...DEFAULT_SETTINGS,
      sizing: { mode: "fixed" as const, pct: 0.02 },
      live: {
        ...DEFAULT_SETTINGS.live,
        enabled: true,
        mode: "overall" as const,
        notionalUsd: 10,
        maxPositions: 8,
        maxNotionalUsd: 40,
        ratio: 1,
        rebalancePct: 0.25,
      } as typeof DEFAULT_SETTINGS.live,
    },
    sim: { stats: { pf: 1.5, n: 50 }, stable: true },
    status: { lastBarT: Math.floor(Date.now() / H) * H },
    paper: { positions: [] as Array<Record<string, unknown>> },
    tickersAt: 0,
    freshTickers: async () => {
      rt.tickersAt = Date.now();
      return prices;
    },
  };
  return { rt, prices };
}
// a minimal exchange for the contracts-outage case (minQty sizing)
function mkF3() {
  const pos = new Map<string, number>();
  const orders: Array<Record<string, unknown>> = [];
  let seq = 0;
  const log: Array<Record<string, unknown>> = [];
  const ex = {
    empty: false,
    hasKeys: () => true,
    fingerprint: () => "x|f3b",
    book: async () => ({
      positions: [...pos].map(([k, qty]) => ({
        symbol: k.split("|")[0],
        venueSymbol: k.split("|")[0],
        side: k.endsWith("LONG") ? "long" : "short",
        qty,
      })),
      orders: orders.map((o) => ({ ...o })),
    }),
    contracts: async () =>
      ex.empty
        ? new Map()
        : new Map([
            [
              "S1-USDT",
              { symbol: "S1-USDT", minQty: 0.001, step: 0.001, qtyPrec: 3, pxPrec: 4, minUsdt: 2 },
            ],
          ]),
    order: async (p: any) => {
      log.push(p);
      const k = `${p.symbol}|${p.positionSide}`;
      if (p.type === "MARKET") {
        const into = (p.positionSide === "LONG") === (p.side === "BUY");
        const n = +((pos.get(k) ?? 0) + (into ? 1 : -1) * Number(p.quantity)).toFixed(6);
        if (n > 0) pos.set(k, n);
        else pos.delete(k);
      } else
        orders.push({
          id: `o${++seq}`,
          symbol: p.symbol,
          venueSymbol: p.symbol,
          clientOrderId: p.clientOrderID,
          positionSide: p.positionSide,
          type: p.type,
        });
    },
    cancel: async (_s: string, id: string) => {
      const i = orders.findIndex((o) => o.id === id);
      if (i >= 0) orders.splice(i, 1);
      return i >= 0;
    },
  };
  return { ex, pos, log };
}
type FakeRt = ReturnType<typeof fakeRt>["rt"];
const step = (rt: FakeRt, ex: ExchangeClient) => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
const lane = (cfg: string, sym: string, side: 1 | -1, vol = 1, px = 17) => ({
  cfg,
  sym,
  side,
  entry: px,
  stop: px * (1 - side * 0.03),
  vol,
  entryT: 1,
});

describe("control orders: audit regressions", () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());
  /** the clock moves past the held-unknown window of a fresh open (the position read may lag for 15 s) */
  const later = (ms = 20_000) => mock.timers.enable({ apis: ["Date"], now: Date.now() + ms });

  it("F1 one-way: an opposite open must not be sent while the close of the held side failed / waits", async () => {
    const net = new Map<string, number>();
    const stops: Array<{ id: string; venueSymbol: string; symbol: string; clientOrderId: string }> =
      [];
    const log: string[] = [];
    let refuseClose = false;
    const ex: ExchangeClient = {
      hasKeys: () => true,
      fingerprint: () => "vst|oneway-audit",
      async book() {
        return {
          positions: [...net.entries()]
            .filter(([, q]) => q !== 0)
            .map(([sym, q]) => ({
              symbol: sym,
              venueSymbol: sym,
              side: q > 0 ? ("long" as const) : ("short" as const),
              qty: Math.abs(q),
            })),
          orders: stops.map((o) => ({ ...o })),
        };
      },
      async contracts() {
        return new Map([
          [
            "S1-USDT",
            { symbol: "S1-USDT", minQty: 0.001, step: 0.001, qtyPrec: 3, pxPrec: 4, minUsdt: 2 },
          ],
        ]);
      },
      async order(p) {
        const sym = String(p.symbol);
        if (p.type === "MARKET") {
          if (p.reduceOnly === "true" && refuseClose)
            throw new ExchangeRejected("reduce only rejected", 1);
          const q = Number(p.quantity) * (p.side === "BUY" ? 1 : -1);
          net.set(sym, +((net.get(sym) ?? 0) + q).toFixed(6));
          log.push(`${p.side} ${p.quantity}${p.reduceOnly ? " RO" : ""}`);
        } else
          stops.push({
            id: `s${stops.length}`,
            venueSymbol: sym,
            symbol: sym,
            clientOrderId: String(p.clientOrderID),
          });
      },
      async cancel(_s, id) {
        const i = stops.findIndex((o) => o.id === id);
        if (i >= 0) stops.splice(i, 1);
        return i >= 0;
      },
      async setPositionMode() {},
      async setMarginMode() {},
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live.positionMode = "oneway";
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const long = net.get("S1-USDT")!;
    assert.ok(long > 0);
    // lanes flip to short; the exchange refuses the reduce-only close of the long
    rt.paper.positions = [lane("c", "S1-USDT", -1, 2)];
    refuseClose = true;
    log.length = 0;
    await step(rt, ex);
    // the long must still be there and no SELL (non reduce-only) open may have been sent on top of it
    assert.deepEqual(
      log,
      [],
      `orders sent while the close failed: ${JSON.stringify(log)}; net now ${net.get("S1-USDT")}`,
    );
  });

  it("F2 capped retry on 'minimum order amount' must stay under maxNotionalUsd", async () => {
    const ex = new SimExchange(rng(1));
    const orig = ex.order.bind(ex);
    let first = true;
    ex.order = async (p) => {
      if (p.type === "MARKET" && first) {
        first = false;
        throw new ExchangeRejected("The minimum order amount is 100 S1", 101400);
      }
      return orig(p);
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const q = ex.positions.get("S1-USDT|LONG") ?? 0;
    assert.ok(q * 17 <= 40 * 1.0001, `opened ${q} × 17 = ${(q * 17).toFixed(2)} USDT, cap 40`);
  });

  it("F2b the minimum-amount retry stays under the equity-multiple position cap (maxPositionX), like the targets", async () => {
    const ex = new SimExchange(rng(21));
    (ex as ExchangeClient).account = async () => ({
      equity: 20,
      wallet: 20,
      unrealized: 0,
      realized: 0,
      usedMargin: 0,
      availableMargin: 20,
    });
    const orig = ex.order.bind(ex);
    let first = true;
    ex.order = async (p) => {
      if (p.type === "MARKET" && first) {
        first = false;
        // 1.5 × 17 = 25.5 USDT: under the fixed 40 USDT cap, over the 1 × equity = 20 USDT cap
        throw new ExchangeRejected("The minimum order amount is 1.5 S1", 101400);
      }
      return orig(p);
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxPositionX: 1 };
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const q = ex.positions.get("S1-USDT|LONG") ?? 0;
    assert.ok(q * 17 <= 20 * 1.0001, `opened ${q} × 17 = ${(q * 17).toFixed(2)} USDT, cap 1 × equity = 20`);
  });

  it("the backstop is re-priced when lanes with a wider stop join (new stop first, old one cancelled)", async () => {
    // AT-USDT: the position sat at its cap, so the joining lanes changed no quantity and no action ran — the old,
    // tighter backstop stayed and filled before any lane stop
    const ex = new SimExchange(rng(22));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxNotionalUsd: 10 };
    rt.paper.positions = [lane("a", "S1-USDT", 1)]; // 3 % lane stop → backstop 3.6 % below 17
    await step(rt, ex);
    const stopLog = () => ex.log.filter((p) => p.type === "STOP_MARKET");
    const stopsOf = () => stopLog().map((p) => Number(p.stopPrice));
    const ownOn = () =>
      ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.clientOrderId?.startsWith("CTSB"));
    assert.equal(stopsOf().length, 1);
    assert.ok(Math.abs(stopsOf()[0] - 17 * (1 - 0.036)) < 1e-3, `first stop ${stopsOf()[0]}`);
    const q = ex.positions.get("S1-USDT|LONG")!;
    // unchanged lanes: nothing re-placed
    await step(rt, ex);
    assert.equal(stopsOf().length, 1, "no churn while the lanes are unchanged");
    // a lane with a 10 % stop joins: the backstop moves to 12 % below the price (no quantity change at the cap)
    rt.paper.positions = [
      lane("a", "S1-USDT", 1),
      { cfg: "b", sym: "S1-USDT", side: 1, entry: 17, stop: 15.3, vol: 1, entryT: 2 },
    ];
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG"), q, "quantity unchanged (at its cap)");
    const all = stopsOf();
    assert.equal(all.length, 2, `stops placed: ${JSON.stringify(all)}`);
    assert.ok(Math.abs(all[1] - 17 * 0.88) < 1e-3, `re-priced stop ${all[1]}`);
    assert.equal(ownOn().length, 1, "the old, tighter stop is cancelled");
    assert.equal(ownOn()[0].clientOrderId, String(stopLog()[1].clientOrderID));
    // the new stop's price is in the ledger
    const row = rt.db.get<{ px: number }>(
      "SELECT px FROM live_orders WHERE coid = ? AND kind = 'S' AND status = 'ok'",
      String(ownOn()[0].clientOrderId),
    );
    assert.ok(row && Math.abs(row.px - 17 * 0.88) < 1e-3, `ledger ${JSON.stringify(row)}`);
    // the wide lane leaves again: the stop is now more than 25 % of its distance beyond the target — tightened, but
    // at most once a minute per position
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    assert.equal(stopsOf().length, 2, "re-priced at most once a minute per position");
    resetLiveBackoff(); // (the per-position re-price spacing is process memory)
    await step(rt, ex);
    assert.equal(stopsOf().length, 3);
    assert.ok(Math.abs(stopsOf()[2] - 17 * (1 - 0.036)) < 1e-3, `tightened to ${stopsOf()[2]}`);
    assert.equal(ownOn().length, 1);
  });

  it("a backstop re-price the exchange refuses puts a stop at the old price back (never a position without one)", async () => {
    const ex = new SimExchange(rng(23));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxNotionalUsd: 10 };
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const first = Number(ex.log.find((p) => p.type === "STOP_MARKET")!.stopPrice);
    const orig = ex.order.bind(ex);
    // the exchange refuses the new price only (the restore at the old price goes through)
    ex.order = async (p) => {
      if (p.type === "STOP_MARKET" && Math.abs(Number(p.stopPrice) - first) > 1e-9)
        throw new ExchangeRejected("stop price invalid", 1);
      return orig(p);
    };
    rt.paper.positions = [
      lane("a", "S1-USDT", 1),
      { cfg: "b", sym: "S1-USDT", side: 1, entry: 17, stop: 15.3, vol: 1, entryT: 2 },
    ];
    await step(rt, ex);
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "position kept");
    const own = ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.clientOrderId?.startsWith("CTSB"));
    assert.equal(own.length, 1, "one stop resting");
    const restored = ex.log.filter((p) => p.type === "STOP_MARKET" && String(p.clientOrderID) === own[0].clientOrderId);
    assert.equal(restored.length, 1);
    assert.ok(Math.abs(Number(restored[0].stopPrice) - first) < 1e-9, "the stop at the old price is back");
    const ev = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE msg LIKE '%re-price%'");
    assert.ok(ev.some((e) => e.msg.includes("restored")), JSON.stringify(ev));
  });

  it("a refused re-price whose restore also fails is an error event; the stop repair re-places next step", async () => {
    const ex = new SimExchange(rng(27));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxNotionalUsd: 10 };
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const orig = ex.order.bind(ex);
    let refuse = true;
    ex.order = async (p) => {
      if (refuse && p.type === "STOP_MARKET") throw new ExchangeRejected("stop price invalid", 1);
      return orig(p);
    };
    rt.paper.positions = [
      lane("a", "S1-USDT", 1),
      { cfg: "b", sym: "S1-USDT", side: 1, entry: 17, stop: 15.3, vol: 1, entryT: 2 },
    ];
    await step(rt, ex);
    assert.equal(ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.type === "STOP_MARKET").length, 0);
    const ev = rt.db.all<{ level: string; msg: string }>("SELECT level, msg FROM events WHERE msg LIKE '%re-price%'");
    assert.ok(ev.some((e) => e.level === "error" && e.msg.includes("could not be restored")), JSON.stringify(ev));
    refuse = false;
    resetLiveBackoff();
    await step(rt, ex);
    assert.equal(ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.type === "STOP_MARKET").length, 1, "repaired");
  });

  it("no reopen right after the exchange stop filled while the same lanes are still active", async () => {
    const ex = new SimExchange(rng(24));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1), lane("b", "S2-USDT", 1, 1, 24)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG") && ex.positions.has("S2-USDT|LONG"));
    const opens = () =>
      ex.log.filter((p) => p.type === "MARKET" && p.side === "BUY" && p.symbol === "S1-USDT").length;
    // the backstop fills: position and its stop gone, lane "a" still active in the simulation
    ex.positions.delete("S1-USDT|LONG");
    ex.orders = ex.orders.filter((o) => o.venueSymbol !== "S1-USDT");
    later();
    const st = await step(rt, ex);
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "not reopened at market");
    assert.equal(st.control?.suppressed, 1, "the lane order is held back (status)");
    await step(rt, ex);
    await step(rt, ex);
    assert.equal(opens(), 1, "still one open");
    assert.ok(ex.positions.has("S2-USDT|LONG"), "other positions keep processing");
    // lane "a" exits; a new lane on the key is a new decision and opens it
    rt.paper.positions = [{ ...lane("c", "S1-USDT", 1), entryT: 9 }, lane("b", "S2-USDT", 1, 1, 24)];
    const st2 = await step(rt, ex);
    assert.equal(st2.control?.suppressed, 0, "the exited lane is no longer held back");
    assert.ok(ex.positions.has("S1-USDT|LONG"), "a new lane opens the key");
  });

  it("an open the position read does not show yet is neither opened again nor stripped of its stop", async () => {
    const ex = new SimExchange(rng(25));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const q = ex.positions.get("S1-USDT|LONG")!;
    // the exchange position read lags behind the fill (the stop already shows)
    const orig = ex.book.bind(ex);
    ex.book = async () => {
      const b = await orig();
      return { ...b, positions: b.positions.filter((p) => p.venueSymbol !== "S1-USDT") };
    };
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG"), q, "not opened twice");
    assert.equal(
      ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.clientOrderId?.startsWith("CTSB")).length,
      1,
      "its stop is kept",
    );
    ex.book = orig;
    const st = await step(rt, ex);
    assert.equal(st.control?.suppressed, 0);
    assert.equal(ex.positions.get("S1-USDT|LONG"), q);
  });

  it("F3 contracts unavailable (empty map, cached 10 min by cachedClient): never opens unrounded quantities", async () => {
    const ex = new SimExchange(rng(2));
    ex.emptyContracts = true;
    const c = cachedClient(ex, 1000);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, c);
    const sentQ = ex.log.filter((p) => p.type === "MARKET").map((p) => p.quantity);
    assert.deepEqual(sentQ, [], `opened without a contract spec: ${JSON.stringify(sentQ)}`);
  });

  it("F4 ledger: after a stop-out and a reopen, a foreign add on the same key is still recognised", async () => {
    const ex = new SimExchange(rng(3));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const q = ex.positions.get("S1-USDT|LONG")!;
    // the stop triggers: position and its stop gone (no ledger row is written for it)
    ex.positions.delete("S1-USDT|LONG");
    ex.orders = [];
    // the stop-out holds lane "a" back (no reopen at market); a new lane on the key reopens it
    later();
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG"), undefined, "not reopened for lane a");
    rt.paper.positions = [{ ...lane("b", "S1-USDT", 1), entryT: 2 }];
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG"), q);
    // > 10 min later someone else adds q on the same symbol and direction (hedge account, merges)
    rt.db.run("UPDATE live_orders SET at = at - 3600000");
    ex.positions.set("S1-USDT|LONG", +(q * 2).toFixed(6));
    rt.paper.positions = []; // lane ends
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG"), q, "only our own q should have been closed");
  });

  it("F5 after our own close, a foreign excess left on the key is not closed by us (recent window)", async () => {
    const ex = new SimExchange(rng(4));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const q = ex.positions.get("S1-USDT|LONG")!;
    ex.positions.set("S1-USDT|LONG", +(q + 1).toFixed(6)); // foreign add of 1
    rt.paper.positions = [];
    await step(rt, ex); // closes our q only (capped), cancels our stop
    assert.equal(ex.positions.get("S1-USDT|LONG"), 1, "first close: own part only");
    await step(rt, ex); // within 10 min of our open: the excess is 'recent' and the ledger says 0 → adopted?
    assert.equal(ex.positions.get("S1-USDT|LONG"), 1, "the foreign 1 must stay untouched");
  });

  it("F6 trimming the database never cuts the own-quantity ledger of a held position", async () => {
    const ex = new SimExchange(rng(5));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    // the open is an hour old; 20 001 rows of other kinds (entries mode) came after it
    rt.db.run("UPDATE live_orders SET at = at - 3600000");
    for (let i = 0; i < 20_001; i++)
      rt.db.run(
        "INSERT INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        `x${i}`,
        "entry|z",
        "S9-USDT",
        1,
        "E",
        1,
        1,
        "ok",
        "",
        Date.now() - 60_000 + i / 1e3,
      );
    rt.paper.positions = [lane("a", "S1-USDT", 1), lane("b", "S1-USDT", 1)];
    await step(rt, ex); // increase: its row is the newest
    const full = ex.positions.get("S1-USDT|LONG")!;
    // the global trim keeps the newest 20 000 rows: it must not drop the open row while the increase row stays
    rt.db.trim();
    rt.db.run("UPDATE live_orders SET at = at - 3600000 WHERE cfg LIKE 'control|%'");
    rt.paper.positions = [];
    await step(rt, ex);
    assert.equal(
      ex.positions.get("S1-USDT|LONG") ?? 0,
      0,
      `left ${ex.positions.get("S1-USDT|LONG")} of ${full}, own orders left: ${ex.orders.length}`,
    );
  });

  it("trimming keeps a flat key's rows of the last day (tracking ids), drops older ones", () => {
    const db = new CoreDb(":memory:");
    const ins = (coid: string, kind: string, at: number) =>
      db.run(
        "INSERT INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        coid,
        "control|S1-USDT|-1",
        "S1-USDT",
        -1,
        kind,
        kind === "F" ? 0 : 1,
        1,
        "ok",
        "",
        at,
      );
    const now = Date.now();
    ins("old-open", "O", now - 30 * 3_600_000);
    ins("new-open", "O", now - 600_000);
    ins("flat", "F", now - 60_000);
    db.trim();
    const left = db.all<{ coid: string }>("SELECT coid FROM live_orders ORDER BY rowid").map((r) => r.coid);
    assert.deepEqual(left, ["new-open", "flat"]);
    // the ledger still restarts at the flat marker
    const led = ownLedger(
      db.all<{ k: string; kind: string; status: string; qty: number }>(
        "SELECT cfg AS k, kind, status, qty FROM live_orders ORDER BY rowid",
      ),
    );
    assert.equal(led.get("control|S1-USDT|-1"), 0);
  });

  it("F7 a close that keeps failing must not leave the position without its protective stop", async () => {
    const ex = new SimExchange(rng(6));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    // the stop vanished (e.g. cancelled by hand) and the lane ended; the exchange refuses the close
    ex.orders = [];
    const orig = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.type === "MARKET") throw new ExchangeRejected("system busy", 1);
      return orig(p);
    };
    rt.paper.positions = [];
    for (let i = 0; i < 3; i++) await step(rt, ex); // close waits in backoff
    assert.ok(ex.positions.has("S1-USDT|LONG"));
    assert.ok(
      ex.orders.some((o) => o.venueSymbol === "S1-USDT"),
      "position open for steps without a stop",
    );
  });

  it("F8 free-margin floor: one step must not open far past the floor", async () => {
    const ex = new SimExchange(rng(7));
    (ex as ExchangeClient).account = async () => ({
      equity: 20,
      wallet: 20,
      unrealized: 0,
      realized: 0,
      usedMargin: 0,
      availableMargin: 6,
    });
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, minFreeMargin: 5 };
    rt.paper.positions = [0, 1, 2, 3, 4].map((i) => lane(`l${i}`, `S${i}-USDT`, 1, 1, 10 + i * 7));
    await step(rt, ex);
    const opened = [...ex.positions.keys()].length;
    // 6 USDT free, floor 5: 1 USDT room; each open is 10 USDT notional
    assert.ok(
      opened <= 1,
      `${opened} positions (≈${opened * 10} USDT notional) opened on 1 USDT of room`,
    );
  });

  it("F3b default minQty sizing: a contracts outage (empty map) must not close held positions", async () => {
    const { ex, pos } = mkF3();
    const prices = [{ sym: "S1-USDT", last: 17 }];
    const rt: any = {
      generation: 1,
      db: new CoreDb(":memory:"),
      settings: {
        ...DEFAULT_SETTINGS,
        sizing: { mode: "minQty", pct: 0.02 },
        live: {
          ...DEFAULT_SETTINGS.live,
          enabled: true,
          mode: "overall",
          notionalUsd: 10,
          maxPositions: 8,
          maxNotionalUsd: 40,
          ratio: 1,
        },
      },
      sim: { stats: { pf: 1.5 }, stable: true },
      status: {},
      paper: {
        positions: [
          { cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16.5, vol: 1, entryT: 1 },
        ],
      },
      tickersAt: 0,
      freshTickers: async () => {
        rt.tickersAt = Date.now();
        return prices;
      },
    };
    await stepLive(rt, [], 1, ex as any);
    assert.ok(pos.get("S1-USDT|LONG")! > 0);
    ex.empty = true; // bx.fetchContracts returns an empty map when every host fails; cachedClient keeps it 10 min
    const st = await stepLive(rt, [], 1, ex as any);
    assert.ok(
      pos.get("S1-USDT|LONG")! > 0,
      `closed on a contracts outage: ${JSON.stringify(st.control?.actions)}`,
    );
  });

  it("F9 the position cap never closes a held position for a new one that cannot open", async () => {
    const ex = new SimExchange(rng(9));
    let free = 50;
    (ex as ExchangeClient).account = async () => ({
      equity: 60,
      wallet: 60,
      unrealized: 0,
      realized: 0,
      usedMargin: 0,
      availableMargin: free,
    });
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxPositions: 1, minFreeMargin: 5 };
    rt.paper.positions = [lane("a", "S1-USDT", 1, 1)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"));
    // a stronger new position appears while opening is blocked (free margin under the floor)
    free = 1;
    rt.paper.positions = [lane("a", "S1-USDT", 1, 1), lane("b", "S2-USDT", 1, 2, 24)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "held position kept");
    assert.ok(!ex.positions.has("S2-USDT|LONG"));
  });

  it("only selected configs ask for volume: a deselected config is never opened, a held one is kept", async () => {
    const ex = new SimExchange(rng(12));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    (rt.paper as { selected?: string[] }).selected = ["a"];
    rt.paper.positions = [lane("a", "S1-USDT", 1), lane("b", "S2-USDT", 1)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "selected config opens");
    assert.ok(!ex.positions.has("S2-USDT|LONG"), "deselected config never opens");
    // "a" is dropped by the next selection while its position is held: kept, not closed
    (rt.paper as { selected?: string[] }).selected = [];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "held position kept while its paper position runs");
    // closed outside (its stop): a deselected config does not reopen it
    ex.positions.delete("S1-USDT|LONG");
    ex.orders = [];
    await step(rt, ex);
    assert.ok(!ex.positions.has("S1-USDT|LONG"), "not reopened for a deselected config");
  });

  it("a live step abandoned by the watchdog (its epoch gone) sends nothing when it resumes", async () => {
    const ex = new SimExchange(rng(13));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    (rt as { liveEpoch?: number }).liveEpoch = 0;
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    // the book read hangs until the watchdog has moved on
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const inBook = new Promise<void>((r) => (entered = r));
    const orig = ex.book.bind(ex);
    ex.book = async () => {
      entered();
      await gate;
      return orig();
    };
    const stuck = step(rt, ex);
    await inBook; // the step is now waiting on the book
    (rt as { liveEpoch?: number }).liveEpoch = 1; // the watchdog abandons it
    release();
    await stuck;
    assert.equal(ex.sent, 0, "the abandoned step sent nothing");
    // a fresh step (current epoch) opens normally
    ex.book = orig;
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"));
  });

  it("a live step that never returns does not hold up the next one once the watchdog abandoned it", async () => {
    // x01, 4 Oct 17:40: a step hung on an await without a limit; the watchdog abandoned it every 180 s, but each new
    // step was queued behind the hung one and waited forever ("waiting on: start") — Live sent nothing for 45 min
    const ex = new SimExchange(rng(17));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    (rt as { liveEpoch?: number }).liveEpoch = 0;
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    let entered!: () => void;
    const inBook = new Promise<void>((r) => (entered = r));
    const orig = ex.book.bind(ex);
    ex.book = async () => {
      entered();
      return new Promise<never>(() => {}); // never settles
    };
    void step(rt, ex);
    await inBook;
    (rt as { liveEpoch?: number }).liveEpoch = 1; // the watchdog abandons it
    ex.book = orig;
    const fresh = await Promise.race([
      step(rt, ex).then(() => "done"),
      new Promise((r) => setTimeout(() => r("blocked"), 5_000)),
    ]);
    assert.equal(fresh, "done", "the new step ran although the abandoned one never returned");
    assert.ok(ex.positions.has("S1-USDT|LONG"));
  });
});
