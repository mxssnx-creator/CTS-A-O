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
import { rng, SimExchange as SimVenue, fakeRt, type FakeRt } from "../test-support.ts";
/** this suite runs with the venue's one-stop-per-position-side rule */
class SimExchange extends SimVenue {
  oneStopPerSide = true;
}

process.env.CTS_CORE_LIVE = "1";

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
    assert.ok(
      q * 17 <= 20 * 1.0001,
      `opened ${q} × 17 = ${(q * 17).toFixed(2)} USDT, cap 1 × equity = 20`,
    );
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
    const own = ex.orders.filter(
      (o) => o.venueSymbol === "S1-USDT" && o.clientOrderId?.startsWith("CTSB"),
    );
    assert.equal(own.length, 1, "one stop resting");
    const restored = ex.log.filter(
      (p) => p.type === "STOP_MARKET" && String(p.clientOrderID) === own[0].clientOrderId,
    );
    assert.equal(restored.length, 1);
    assert.ok(
      Math.abs(Number(restored[0].stopPrice) - first) < 1e-9,
      "the stop at the old price is back",
    );
    const ev = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE msg LIKE '%re-price%'");
    assert.ok(
      ev.some((e) => e.msg.includes("restored")),
      JSON.stringify(ev),
    );
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
    assert.equal(
      ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.type === "STOP_MARKET").length,
      0,
    );
    const ev = rt.db.all<{ level: string; msg: string }>(
      "SELECT level, msg FROM events WHERE msg LIKE '%re-price%'",
    );
    assert.ok(
      ev.some((e) => e.level === "error" && e.msg.includes("could not be restored")),
      JSON.stringify(ev),
    );
    refuse = false;
    resetLiveBackoff();
    await step(rt, ex);
    assert.equal(
      ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.type === "STOP_MARKET").length,
      1,
      "repaired",
    );
  });

  it("no reopen right after the exchange stop filled while the same lanes are still active", async () => {
    const ex = new SimExchange(rng(24));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1), lane("b", "S2-USDT", 1, 1, 24)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG") && ex.positions.has("S2-USDT|LONG"));
    const opens = () =>
      ex.log.filter((p) => p.type === "MARKET" && p.side === "BUY" && p.symbol === "S1-USDT")
        .length;
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
    rt.paper.positions = [
      { ...lane("c", "S1-USDT", 1), entryT: 9 },
      lane("b", "S2-USDT", 1, 1, 24),
    ];
    const st2 = await step(rt, ex);
    assert.equal(st2.control?.suppressed, 0, "the exited lane is no longer held back");
    assert.ok(ex.positions.has("S1-USDT|LONG"), "a new lane opens the key");
  });

  it("a position closed BY HAND is not reopened either: processing continues, a new lane order opens it again", async () => {
    // the operator's rule: keep processing when a position is closed by hand, but never put the SAME position back -
    // only new ones. A close by hand is told apart from a stop fill by the own stop still resting on the exchange.
    const ex = new SimExchange(rng(126));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1), lane("b", "S2-USDT", 1, 1, 24)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG") && ex.positions.has("S2-USDT|LONG"));
    const stopsOn = (sym: string) =>
      ex.orders.filter((o) => o.venueSymbol === sym && o.type === "STOP_MARKET").length;
    assert.equal(stopsOn("S1-USDT"), 1, "it carried its own stop");
    const opens = () =>
      ex.log.filter((p) => p.type === "MARKET" && p.side === "BUY" && p.symbol === "S1-USDT")
        .length;
    // closed BY HAND: the position is gone, its own stop is LEFT RESTING (that is what tells the two apart)
    ex.positions.delete("S1-USDT|LONG");
    later();
    const st = await step(rt, ex);
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "the same position is not put back");
    assert.equal(st.control?.suppressed, 1, "the lane order that held it is held back");
    // the event says so, and says processing continues
    const ev = rt.db.all<{ level: string; msg: string }>(
      "SELECT level, msg FROM events WHERE msg LIKE '%closed by hand%'",
    );
    assert.equal(ev.length, 1, JSON.stringify(rt.db.all("SELECT msg FROM events")));
    assert.ok(ev[0].msg.includes("processing continues"), ev[0].msg);
    // the stop it left behind is cancelled, so it can never catch a later position on that side
    assert.equal(stopsOn("S1-USDT"), 0, "the stop left resting is cancelled");
    // processing really does continue: every other position is still managed, and more steps change nothing
    await step(rt, ex);
    await step(rt, ex);
    assert.equal(opens(), 1, "still exactly one open on the key");
    assert.ok(ex.positions.has("S2-USDT|LONG"), "the other position keeps being managed");
    // a NEW lane order on the same symbol and side is a new decision: it opens
    rt.paper.positions = [
      { ...lane("c", "S1-USDT", 1), entryT: 9 },
      lane("b", "S2-USDT", 1, 1, 24),
    ];
    const st2 = await step(rt, ex);
    assert.equal(st2.control?.suppressed, 0, "the held-back lane order is gone with its exit");
    assert.ok(ex.positions.has("S1-USDT|LONG"), "the new lane order opens the key again");
    assert.equal(opens(), 2, "a second open, for the new position only");
    assert.equal(stopsOn("S1-USDT"), 1, "and it carries its own stop");
  });

  it("a long closed by hand holds back only the long: the short of the same config and bar keeps running", async () => {
    // long and short of one config on one symbol can enter on the same bar: the held-back lane is the long one only
    const ex = new SimExchange(rng(127));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1), lane("a", "S1-USDT", -1)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG") && ex.positions.has("S1-USDT|SHORT"));
    const shortQty = ex.positions.get("S1-USDT|SHORT");
    ex.positions.delete("S1-USDT|LONG");
    later();
    const st = await step(rt, ex);
    assert.equal(st.control?.suppressed, 1, "one lane order held back");
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "the long is not put back");
    assert.equal(ex.positions.get("S1-USDT|SHORT"), shortQty, "the short keeps its volume");
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|SHORT"), shortQty, "and keeps it on later steps");
  });

  it("a lane held back under the former id (no side) stays held back after the deploy, on its own side only", async () => {
    const ex = new SimExchange(rng(128));
    const db = new CoreDb(":memory:");
    db.kvSet("controlSuppressed", { "a|S1-USDT|1": { key: "S1-USDT|1", at: Date.now() } });
    const { rt } = fakeRt(db);
    rt.paper.positions = [lane("a", "S1-USDT", 1), lane("a", "S1-USDT", -1)];
    const st = await step(rt, ex);
    assert.equal(st.control?.suppressed, 1);
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "the held-back long is not opened");
    assert.ok(ex.positions.has("S1-USDT|SHORT"), "the short opens");
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
      ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.clientOrderId?.startsWith("CTSB"))
        .length,
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
    const left = db
      .all<{ coid: string }>("SELECT coid FROM live_orders ORDER BY rowid")
      .map((r) => r.coid);
    assert.deepEqual(left, ["new-open", "flat"]);
    // the ledger still restarts at the flat marker
    const led = ownLedger(
      db.all<{ k: string; kind: string; status: string; qty: number }>(
        "SELECT cfg AS k, kind, status, qty FROM live_orders ORDER BY rowid",
      ),
    );
    assert.equal(led.get("control|S1-USDT|-1"), 0);
  });

  it("trimming a day-old ledger stays cheap: the flat-marker lookup is an index seek, not a scan per row", () => {
    // the per-row "last flat marker of this key" subquery scanned the whole table: 2.9 s at 10k day-old rows on held
    // keys (never deleted, so it repeated every 30 s and grew with the ledger) — quadratic
    const db = new CoreDb(":memory:");
    const plan = db
      .all<{ detail: string }>(
        "EXPLAIN QUERY PLAN SELECT MAX(f.rowid) FROM live_orders f WHERE f.cfg = ? AND f.kind = 'F'",
        "control|S1-USDT|-1",
      )
      .map((r) => r.detail)
      .join(" | ");
    assert.match(plan, /live_orders_cfg_kind/, plan);
    const old = Date.now() - 30 * 3_600_000;
    db.tx(() => {
      for (let i = 0; i < 20_000; i++)
        db.run(
          "INSERT INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          `o${i}`,
          `control|S${i % 40}-USDT|1`,
          `S${i % 40}-USDT`,
          1,
          "O",
          1,
          1,
          "ok",
          "",
          old + i,
        );
    });
    const t0 = performance.now();
    db.trim();
    const ms = performance.now() - t0;
    assert.equal(db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders")?.n, 20_000, "held keys keep their ledger");
    assert.ok(ms < 3_000, `trim took ${ms.toFixed(0)} ms`);
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

  it("live.kinds / plainOnly: only trailing-plain lanes reach the exchange, held positions stay managed", async () => {
    const ex = new SimExchange(rng(25));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const base = "follow|rsi-mom-14-20@m15|tp1|sl1";
    const trailing = (sym: string, vol = 1) => lane(`${base}|tr0.5|h32`, sym, 1, vol);
    rt.settings.live = { ...rt.settings.live, kinds: ["trailing"], plainOnly: true };
    rt.paper.positions = [
      trailing("S1-USDT"),
      lane(`${base}|tr0|h32`, "S2-USDT", 1), // Normal
      lane(`${base}|tr0|h32|axis`, "S3-USDT", 1), // Axis
      trailing("S4-USDT", 3), // Trailing, but Block raised it to 3×
    ];
    const st = await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "trailing plain opens");
    assert.ok(!ex.positions.has("S2-USDT|LONG"), "Normal is not sent");
    assert.ok(!ex.positions.has("S3-USDT|LONG"), "Axis is not sent");
    assert.ok(!ex.positions.has("S4-USDT|LONG"), "a Block-raised trailing lane is not sent");
    assert.equal(st.control?.notSent, 3, "three lanes held back from the exchange");
    // a kind that stops being sent does not orphan what is already held: it is kept, then closed when its lane ends
    rt.settings.live = { ...rt.settings.live, kinds: ["axis"] };
    later();
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "the held trailing position is kept");
    assert.ok(ex.positions.has("S3-USDT|LONG"), "Axis opens once it is on the list");
    rt.paper.positions = [];
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG"), undefined, "closed when its lane ended");
  });

  it("live.source: only the signal configs reach the exchange (engine lanes keep paper-trading)", async () => {
    const ex = new SimExchange(rng(26));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const sigCfg = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0.5|h32";
    const engCfg = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0.5|h32";
    rt.settings.live = {
      ...rt.settings.live,
      kinds: ["trailing"],
      plainOnly: true,
      source: "signals",
    };
    rt.paper.positions = [
      lane(sigCfg, "S1-USDT", 1),
      lane(engCfg, "S2-USDT", 1),
      lane(sigCfg, "S3-USDT", 1, 4), // a signal lane Block raised: not plain, not sent
    ];
    const st = await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "the signal trailing-plain lane opens");
    assert.ok(!ex.positions.has("S2-USDT|LONG"), "an engine lane of the same kind is not sent");
    assert.ok(!ex.positions.has("S3-USDT|LONG"), "a Block-raised signal lane is not sent");
    assert.equal(st.control?.notSent, 2);
    // the mirror: "engine" sends the engine lane and holds the signal lanes back
    const ex2 = new SimExchange(rng(27));
    const { rt: rt2 } = fakeRt(new CoreDb(":memory:"));
    rt2.settings.live = { ...rt2.settings.live, kinds: ["trailing"], source: "engine" };
    rt2.paper.positions = [lane(sigCfg, "S1-USDT", 1), lane(engCfg, "S2-USDT", 1)];
    await step(rt2, ex2);
    assert.ok(!ex2.positions.has("S1-USDT|LONG"), "the signal lane is not sent");
    assert.ok(ex2.positions.has("S2-USDT|LONG"), "the engine lane opens");
  });

  it("the narrowing is lifted by its OFF values, not by dropping the keys: kinds [] / plainOnly false / source all", async () => {
    // a settings patch merges one level deep, so omitting `kinds` keeps whatever the previous patch set. Clearing
    // the live book is therefore an explicit act: an empty kind list, plainOnly off and source "all". This pins the
    // off values, so the operator can always get back to "every validated set reaches the exchange".
    const ex = new SimExchange(rng(125));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const base = "follow|rsi-mom-14-20@m15|tp1|sl1";
    const sigCfg = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0.5|h32";
    const positions = () => [
      lane(`${base}|tr0.5|h32`, "S1-USDT", 1), // Trailing, plain, engine
      lane(`${base}|tr0|h32`, "S2-USDT", 1), // Normal
      lane(`${base}|tr0|h32|axis`, "S3-USDT", 1), // Axis
      lane(`${base}|tr0.5|h32`, "S4-USDT", 1, 3), // Trailing raised by Block (not plain)
      lane(sigCfg, "S5-USDT", 1), // a signal lane
    ];
    // narrowed as the desk ran it: signals trailing plain only
    rt.settings.live = {
      ...rt.settings.live,
      kinds: ["trailing"],
      plainOnly: true,
      source: "signals",
    };
    rt.paper.positions = positions();
    const narrowed = await step(rt, ex);
    assert.equal(narrowed.control?.notSent, 4, "four of the five lanes held back");
    assert.ok(
      ex.positions.has("S5-USDT|LONG"),
      "the signal trailing-plain lane is the one that opens",
    );
    // now the off values — every lane reaches the exchange, nothing held back
    rt.settings.live = { ...rt.settings.live, kinds: [], plainOnly: false, source: "all" };
    rt.paper.positions = positions();
    later();
    const open = await step(rt, ex);
    assert.equal(open.control?.notSent ?? 0, 0, "nothing is held back once the filters are off");
    for (const sym of ["S1-USDT", "S2-USDT", "S3-USDT", "S4-USDT", "S5-USDT"])
      assert.ok(ex.positions.has(`${sym}|LONG`), `${sym} reaches the exchange`);
  });

  it("live.maxSymbols: the exchange sees at most N symbols; held ones are never dropped", async () => {
    const ex = new SimExchange(rng(28));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxSymbols: 2 };
    rt.paper.positions = [0, 1, 2, 3, 4].map((i) => lane(`c${i}`, `S${i}-USDT`, 1, 1, 10 + i * 7));
    await step(rt, ex);
    const syms = new Set([...ex.positions.keys()].map((k) => k.split("|")[0]));
    assert.equal(syms.size, 2, `two symbols on the exchange, got ${[...syms].join(", ")}`);
    // the two held symbols stay even when the cap comes down and other lanes rank ahead of them
    rt.settings.live = { ...rt.settings.live, maxSymbols: 1 };
    later();
    await step(rt, ex);
    const after = new Set([...ex.positions.keys()].map((k) => k.split("|")[0]));
    assert.deepEqual(
      [...after].sort(),
      [...syms].sort(),
      "held symbols are kept, none closed by the cap",
    );
    // no cap: every lane's symbol can open
    rt.settings.live = { ...rt.settings.live, maxSymbols: 0 };
    await step(rt, ex);
    assert.ok(
      new Set([...ex.positions.keys()].map((k) => k.split("|")[0])).size > 2,
      "without the cap more symbols open",
    );
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

// Exits: what the exchange really executed, the exchange minimum on a reduce, and a side that is already flat.
// From the order-lifecycle audit of 5 Oct (positions sit at 2-5 USDT since the processing caps were removed, so a
// reduce falls into the refused band and a partial close is no longer rare).
describe("control exits: partial fills, the exchange minimum, an already-flat side", () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());
  const later = (ms = 20_000) => mock.timers.enable({ apis: ["Date"], now: Date.now() + ms });

  it("the reply's executed quantity is what the ledger counts (never what was asked)", async () => {
    const { parseFill, executedQty } = await import("./live.server.ts");
    const half = { order: { avgPrice: "17", commission: "-0.001", executedQty: "0.25" } };
    assert.deepEqual(parseFill(half), { px: 17, fee: 0.001, qty: 0.25 });
    assert.equal(executedQty(half, 0.5), 0.25, "a partial fill");
    assert.equal(executedQty(half, 0.1), 0.1, "never more than was sent");
    // no executed quantity in the reply: what was sent is what filled (a MARKET order the exchange accepted)
    assert.equal(executedQty({ order: { avgPrice: "17" } }, 0.5), 0.5);
    assert.equal(executedQty(undefined, 0.5), 0.5);
  });

  it("a partial close keeps our own quantity and the protective stop; the next step closes the rest", async () => {
    const ex = new SimExchange(rng(21));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    const q = ex.positions.get("S1-USDT|LONG")!;
    assert.ok(q > 0);
    // the lane ends: the close is sent, and the exchange fills half of it
    const orig = ex.order.bind(ex);
    let partial = true;
    ex.order = async (p) => {
      // hedge mode: an exit is the MARKET order that sells a long (no reduceOnly flag)
      if (partial && p.type === "MARKET" && p.positionSide === "LONG" && p.side === "SELL") {
        const got = +(Number(p.quantity) / 2).toFixed(3);
        await orig({ ...p, quantity: got });
        return { order: { avgPrice: "17", executedQty: String(got) } };
      }
      return orig(p);
    };
    rt.paper.positions = [];
    later();
    await step(rt, ex);
    const left = ex.positions.get("S1-USDT|LONG") ?? 0;
    assert.ok(left > 0 && left < q, `half of the position is still open (${left} of ${q})`);
    assert.ok(
      ex.orders.some((o) => o.venueSymbol === "S1-USDT" && o.type === "STOP_MARKET"),
      "the rest keeps its protective stop",
    );
    // the ledger still counts the remainder as ours — not handed to the foreign-position guard, which would leave
    // it open and unprotected (the close recorded the full quantity before this fix, so the ledger read 0)
    const rows = rt.db.all<{ cfg: string; kind: string; qty: number; status: string }>(
      "SELECT cfg, kind, qty, status FROM live_orders ORDER BY at",
    );
    const own = ownLedger(
      rows.map((r) => ({
        k: r.cfg.replace("control|", ""),
        kind: r.kind,
        status: r.status,
        qty: r.qty,
      })),
    ).get("S1-USDT|1");
    assert.ok(
      Math.abs((own ?? 0) - left) < 1e-6,
      `the ledger counts the open remainder (${own} vs ${left})`,
    );
    // the next step closes what is left
    partial = false;
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG"), undefined, "closed on the second step");
  });

  it("a reduce under the exchange minimum is held, not refused every step (and never blocks the symbol)", async () => {
    const ex = new SimExchange(rng(22));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, rebalancePct: 0.02 };
    rt.paper.positions = [lane("a", "S1-USDT", 1, 1)];
    await step(rt, ex);
    const q = ex.positions.get("S1-USDT|LONG")!;
    // the lanes now ask for 10 % less: 1 USDT of a 10 USDT position, under the 2 USDT exchange minimum
    rt.paper.positions = [lane("a", "S1-USDT", 1, 0.9)];
    later();
    const st = await step(rt, ex);
    const red = st.control?.actions.find((x) => x.kind === "reduce");
    assert.ok(red, "a reduce was planned");
    assert.match(String(red!.msg), /under the exchange minimum/);
    assert.equal(ex.positions.get("S1-USDT|LONG"), q, "the position is kept as it is");
    const errs = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE level = 'error'");
    assert.equal(errs.length, 0, `no error event: ${errs.map((e) => e.msg).join(" | ")}`);
    const bad = rt.db.all<{ msg: string }>("SELECT msg FROM live_orders WHERE status = 'error'");
    assert.equal(bad.length, 0, "nothing was sent to be refused");
  });

  it("live.excludeRanges: a left-out range opens nothing new; a held one runs out on its lanes, never force-closed", async () => {
    const ex = new SimExchange(rng(41));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    // a Wide config (no range tag in its id) and a Short-range one
    const wide = lane("rev|ind-a", "S1-USDT", 1);
    const short = lane("rev|ind-b|tp1.6|sl1|tr0|h16|sh", "S2-USDT", 1);
    rt.paper.positions = [wide, short];
    await step(rt, ex);
    assert.ok(
      ex.positions.has("S1-USDT|LONG") && ex.positions.has("S2-USDT|LONG"),
      "both open with nothing left out",
    );
    rt.settings.live = { ...rt.settings.live, excludeRanges: ["wide"] };
    later();
    await step(rt, ex);
    // the held Wide position is still managed by its lane (no forced round trip), the Short one untouched
    assert.ok(
      ex.positions.has("S1-USDT|LONG"),
      "the held Wide position is kept while its lane runs",
    );
    assert.ok(ex.positions.has("S2-USDT|LONG"), "the Short position is kept");
    // its lane exits: the Wide position closes and is not replaced by another Wide one
    // a fresh Wide lane is never opened while Wide is left out
    rt.paper.positions = [lane("rev|ind-c", "S3-USDT", 1), short];
    mock.timers.reset();
    later(40_000);
    await step(rt, ex);
    assert.equal(
      ex.positions.has("S1-USDT|LONG"),
      false,
      "the Wide position closed once its lane exited",
    );
    assert.equal(ex.positions.has("S3-USDT|LONG"), false, "no new Wide position");
    assert.ok(ex.positions.has("S2-USDT|LONG"), "the Short position still held");
    const errs = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE level = 'error'");
    assert.equal(errs.length, 0, `no error event: ${errs.map((e) => e.msg).join(" | ")}`);
  });

  it("live.excludeRanges ['wide'] leaves out only the Wide grid: signal, Axis and DCA lanes still open", async () => {
    const ex = new SimExchange(rng(43));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, excludeRanges: ["wide"] };
    // untagged ids all four: a Wide-grid Normal config, a signal config, an Axis ladder and a DCA ladder
    rt.paper.positions = [
      lane("rev|ind-a|tp2.6|sl3.9|tr0|h32", "S1-USDT", 1),
      lane("follow|sig-sar-m@m5|tp2.5|sl2.5|tr0|h96", "S2-USDT", 1),
      lane("pulse|ind-b|tp0.8|sl1.6|tr0|h32|ax-fib3|axis", "S3-USDT", 1),
      lane("rev|ind-c|tp0.8|sl1.6|tr0|h32|dca", "S4-USDT", 1),
    ];
    await step(rt, ex);
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "the Wide-grid config is left out");
    assert.ok(ex.positions.has("S2-USDT|LONG"), "a signal config is not a range: it opens");
    assert.ok(
      ex.positions.has("S3-USDT|LONG"),
      "an Axis ladder opens (narrowed by live.kinds, not the range)",
    );
    assert.ok(ex.positions.has("S4-USDT|LONG"), "a DCA ladder opens");
  });

  it("a stop refused as too close is re-placed wider — the position is never closed for it", async () => {
    const ex = new SimExchange(rng(31));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const orig = ex.order.bind(ex);
    const stopPrices: number[] = [];
    let refused = 0;
    ex.order = async (p) => {
      if (p.type === "STOP_MARKET") {
        stopPrices.push(Number(p.stopPrice));
        // the venue's own wording, which used to market-close the position instead of being retried
        if (refused++ === 0)
          throw new ExchangeRejected(
            "Stop Loss price should be lower than the current price",
            80001,
          );
      }
      return orig(p);
    };
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    const st = await step(rt, ex);
    const open = st.control?.actions.find((x) => x.kind === "open");
    assert.ok(open, "an open was planned");
    assert.ok(ex.positions.get("S1-USDT|LONG"), "the position is still open");
    assert.equal(
      ex.log.filter((x) => x.type === "MARKET" && x.side === "SELL").length,
      0,
      "no protective close was sent",
    );
    assert.equal(refused, 2, "the stop was sent again after the refusal");
    assert.ok(
      stopPrices[1] < stopPrices[0],
      `the retry is further from the mark: ${stopPrices[0]} then ${stopPrices[1]}`,
    );
    // the position carries a stop afterwards, and the refusal was reported as a warning, not an error
    assert.equal(
      ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.type === "STOP_MARKET").length,
      1,
      "exactly one protective stop rests on it",
    );
    const errs = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE level = 'error'");
    assert.equal(errs.length, 0, `no error event: ${errs.map((e) => e.msg).join(" | ")}`);
    assert.match(
      rt.db
        .all<{ msg: string }>("SELECT msg FROM events WHERE level = 'warn'")
        .map((e) => e.msg)
        .join(" | "),
      /too close/,
    );
    // and the distance the venue refused is remembered, so the next position on the symbol starts wider
    const learned = rt.db.kvGet<Record<string, { stop?: number }>>("controlVenueMin");
    assert.ok(
      (learned?.["S1-USDT"]?.stop ?? 0) > 0,
      `the refused distance is learned: ${JSON.stringify(learned)}`,
    );
  });

  it("a close the exchange refuses because the side is already flat is done, not an error", async () => {
    const ex = new SimExchange(rng(23));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"));
    const orig = ex.order.bind(ex);
    ex.order = async (p) => {
      // the stop filled a moment after the book read: the close finds nothing
      if (p.type === "MARKET" && p.positionSide === "LONG" && p.side === "SELL")
        throw new ExchangeRejected("position not exist", 80001);
      return orig(p);
    };
    rt.paper.positions = [];
    later();
    const st = await step(rt, ex);
    const cl = st.control?.actions.find((x) => x.kind === "close");
    assert.ok(cl, "a close was planned");
    assert.equal(cl!.ok, true, `the close counts as done: ${cl!.msg}`);
    const errs = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE level = 'error'");
    assert.equal(errs.length, 0, `no error event: ${errs.map((e) => e.msg).join(" | ")}`);
    // the ledger restarts from flat on that key: a position found there later is not counted as ours
    const rows = rt.db.all<{ cfg: string; kind: string; qty: number; status: string; at: number }>(
      "SELECT cfg, kind, qty, status, at FROM live_orders ORDER BY at",
    );
    assert.equal(
      ownLedger(
        rows.map((r) => ({
          k: r.cfg.replace("control|", ""),
          kind: r.kind,
          status: r.status,
          qty: r.qty,
          px: 17,
          at: r.at,
        })),
      ).get("S1-USDT|1") ?? 0,
      0,
    );
  });

  it("a close quantity is snapped to the lot step (a float sum must not exceed the quantity precision)", async () => {
    const ex = new SimExchange(rng(24));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S1-USDT", 1)];
    await step(rt, ex);
    // the book reports a float sum of two adds (what a hedge account merge looks like)
    ex.positions.set("S1-USDT|LONG", 0.1 + 0.2);
    rt.db.run("UPDATE live_orders SET qty = 0.30000000000000004 WHERE kind = 'O'");
    rt.paper.positions = [];
    later();
    await step(rt, ex);
    const closes = ex.log.filter(
      (p) => p.type === "MARKET" && p.positionSide === "LONG" && p.side === "SELL",
    );
    assert.equal(closes.length, 1);
    const sent = String(closes[0].quantity);
    assert.ok(
      (sent.split(".")[1]?.length ?? 0) <= 3,
      `the sent quantity fits the quantity precision: ${sent}`,
    );
  });
});
