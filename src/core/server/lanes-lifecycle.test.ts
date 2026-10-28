// Overall control lifecycle: one new parent per netted symbol/side, Block contributions coalesced within that
// parent, and separate hedge sides. Pre-existing shared parents retain their original native exits until exact venue
// fills settle them; paper departures alone cannot infer a safe partial reduction. Verify stops, actual fills and the
// absence of speculative sibling admission or orphaned exits.
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeCoid, ownCoidKind } from "./live.ts";
import { laneKeyOf, type LaneOpen } from "../live-record.ts";
import type { LaneOrder } from "./lane-orders.ts";
import { CoreDb } from "./db.server.ts";
import { laneContributions, liveLaneFilter, liveReadiness, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { authorizeSyntheticLanes, syntheticExecutionRun } from "../test-support.ts";
import type { LiveGate } from "../live-validation.ts";

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;

class Ex implements ExchangeClient {
  positions = new Map<string, number>();
  orders: Array<{ id: string; venueSymbol: string; symbol: string; clientOrderId?: string; positionSide?: "LONG" | "SHORT"; type?: string; stopPrice?: number; qty?: number }> = [];
  cancelled = new Set<string>();
  filled = new Map<string, { qty: number; px: number }>();
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
      return { order: { status: "FILLED", executedQty: Number(p.quantity),
        avgPrice: sym === "S1-USDT" ? 10 : 20 } };
    } else {
      // BingX keeps one close-position stop per position side
      if (
        p.type === "STOP_MARKET" &&
        String(p.closePosition) === "true" &&
        this.orders.some((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === "STOP_MARKET")
      )
        throw new ExchangeRejected("Position SL order already exists", 109400);
      // BingX returns client order ids in lower case
      const id = `o${++this.seq}`;
      this.orders.push({
        id,
        venueSymbol: sym,
        symbol: sym,
        clientOrderId: String(p.clientOrderID).toLowerCase(),
        positionSide: ps,
        type: String(p.type),
        stopPrice: Number(p.stopPrice),
        qty: Number(p.quantity),
      });
      return { order: { orderId: id, status: "NEW" } };
    }
    return { order: { orderId: `r${++this.seq}`, status: p.type === "MARKET" ? "FILLED" : "NEW",
      ...(p.type === "MARKET" ? { executedQty: Number(p.quantity) } : {}) } };
  }
  async cancel(_s: string, id: string) {
    const n = this.orders.length;
    this.orders = this.orders.filter((o) => o.id !== id);
    const removed = this.orders.length < n;
    if (removed) this.cancelled.add(id);
    return removed;
  }
  async orderStatus(_s: string, id: string) {
    const fill = this.filled.get(id);
    if (fill) return { order: { orderId: id, status: "FILLED", executedQty: fill.qty, avgPrice: fill.px } };
    return this.cancelled.has(id) ? { order: { orderId: id, status: "CANCELLED", executedQty: 0 } } : null;
  }
  triggerOrder(id: string) {
    const o = this.orders.find((x) => x.id === id);
    if (!o || !o.positionSide || !(o.qty && o.qty > 0) || !(o.stopPrice && o.stopPrice > 0)) return;
    const key = `${o.venueSymbol}|${o.positionSide}`, q = Math.min(this.positions.get(key) ?? 0, o.qty);
    const left = (this.positions.get(key) ?? 0) - q;
    if (left > 1e-9) this.positions.set(key, left); else this.positions.delete(key);
    this.orders = this.orders.filter((x) => x.id !== id);
    this.filled.set(id, { qty: q, px: o.stopPrice });
  }
}

type Pos = { cfg: string; sym: string; side: 1 | -1; entry: number; stop: number; vol: number; entryT: number; w?: number; legs?: Record<string, number> };

function rtOf() {
  const prices = [
    { sym: "S1-USDT", last: 10 },
    { sym: "S2-USDT", last: 20 },
  ];
  let positions: Pos[] = [];
  const rt = {
    generation: 1,
    // This fixture is an explicitly synthetic memory-backed runtime and never reaches a real venue.
    testOnlyAllowMemoryLive: true,
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
        maxChase: 0.25,
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
  return rt;
}

describe("lane orders: independent, partial, Block Overall legs", { timeout: 120_000 }, () => {
  beforeEach(() => resetLiveBackoff());

  it("a sibling waits for its parent's close; other sides and Block legs stay independently protected", async () => {
    const ex = new Ex();
    const rt = rtOf();
    rt.settings.live.laneOrders = false;
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const L = (cfg: string, sym: string, side: 1 | -1, vol: number, entryT: number, legs?: Record<string, number>): Pos => {
      const px = sym === "S1-USDT" ? 10 : 20;
      return { cfg, sym, side, entry: px, stop: px * (1 - side * 0.02), vol, entryT, ...(legs ? { legs } : {}) };
    };
    // one unit = $10: S1 at 10 → 1 coin per lane unit, S2 at 20 → 0.5
    const invariants = (label: string) => {
      for (const [k] of ex.positions) {
        const [sym, ps] = k.split("|");
        const stops = ex.orders.filter((o) => o.venueSymbol === sym && o.positionSide === ps && o.type === "STOP_MARKET" && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
        assert.equal(stops.length, 1, `${label}: ${k} carries exactly one own stop`);
      }
      for (const o of ex.orders)
        assert.ok(ex.positions.has(`${o.venueSymbol}|${o.positionSide}`), `${label}: no own order on a flat side (${o.venueSymbol} ${o.positionSide})`);
    };
    const a = L("combo|ema-9-21@m15|a", "S1-USDT", 1, 1, 1);
    const b = { ...L("combo|ema-9-21@m15|b", "S1-USDT", 1, 2, 2), w: 1 };
    const c = L("combo|ema-9-21@m15|c", "S1-USDT", -1, 1, 3);
    // A Block type Overall position: volume 2.5 = base 1 + overall leg 1 + symbol leg 0.5
    const d = L("combo|ema-9-21@m15|d", "S2-USDT", 1, 2.5, 4, { overall: 1, symbol: 0.5 });

    rt.paper.positions = [a];
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 1, "lane a opens its unit");
    invariants("a");

    // A newly declared identity added in place receives exact synthetic proof too.
    rt.paper.positions.push(b);
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 1, "a new same-side parent waits");
    invariants("a+b waiting");

    rt.paper.positions = [a, b, c];
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 1, "the long parent is unchanged");
    assert.equal(ex.positions.get("S1-USDT|SHORT"), 1, "lane c opens the short side apart (hedge)");
    invariants("a+b+c");

    rt.paper.positions = [b, c, d];
    // the legs are contributions of their own, together exactly the position's volume
    const lanes = laneContributions(rt as unknown as CoreRuntime).filter((l) => l.sym === "S2-USDT");
    assert.equal(lanes.length, 3, "base + 2 legs");
    assert.ok(Math.abs(lanes.reduce((s, l) => s + l.vol, 0) - 2.5) < 1e-9);
    assert.equal(new Set(lanes.map((l) => l.id)).size, 3, "each leg has its own order id");
    await step();
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "lane a closes before b can open");
    assert.equal(ex.positions.get("S2-USDT|LONG"), 1.25, "Block Overall position: 2.5 units × 0.5");
    invariants("b waits, c+d held");
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 2, "b opens its own two units only after flat");
    assert.equal(ex.positions.get("S1-USDT|SHORT"), 1, "the opposite side stays untouched");
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

  it("live.plainOnly judges the whole position: no lane of a Block Overall position is sent, in the step or the readiness", () => {
    const rt = rtOf();
    const base = { cfg: "combo|ema-9-21@m15|d", sym: "S2-USDT", side: 1 as const, entry: 20, stop: 19.6, entryT: 4 };
    // Overall: base 1 + overall leg 1 + symbol leg 0.5 — every contribution asks for one unit or less
    const ov = { ...base, vol: 2.5, legs: { overall: 1, symbol: 0.5 } };
    const plain = { ...base, cfg: "combo|ema-9-21@m15|e", vol: 1, entryT: 5 };
    rt.paper.positions = [ov, plain];
    const lanes = laneContributions(rt as unknown as CoreRuntime);
    assert.ok(lanes.filter((l) => l.cfg === ov.cfg).every((l) => l.vol <= 1 + 1e-9), "each Overall lane ≤ 1 unit");
    const { sendable } = liveLaneFilter({ plainOnly: true }, null, null);
    assert.deepEqual(
      lanes.filter((l) => sendable(l)).map((l) => l.cfg),
      [plain.cfg],
      "only the plain position's lane is sent",
    );
    assert.equal(lanes.filter((l) => liveLaneFilter({}, null, null).sendable(l)).length, 4, "plainOnly off: every lane");
    // the readiness check judges the same orders (each order's whole multiple)
    const t = (cfg: string, r: number, mult: number, i: number) =>
      ({ cfg, sym: "S2-USDT", side: 1, entryT: i * H, exitT: i * H + 1, entry: 20, exit: 20, r, reason: "tp", bars: 1, mfe: 0, mae: 0, mult }) as never;
    const trades = [
      ...Array.from({ length: 20 }, (_, i) => t(ov.cfg, -0.01 * 2.5, 2.5, i)),
      ...Array.from({ length: 20 }, (_, i) => t(plain.cfg, i % 3 ? 0.01 : -0.005, 1, i)),
    ];
    const sim = { stats: { pf: 0.5, n: 40 }, stable: true, startT: 0, endT: 21 * H, trades, openAtEnd: [] };
    assert.equal(liveReadiness(sim as never, {}, 1.05).ok, false, "the whole run: PF 0.5");
    assert.deepEqual(liveReadiness(sim as never, { plainOnly: true }, 1.05), { ok: true, why: "" }, "the plain orders only");
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

  it("an orphan own stop keeps a new parent on that side blocked until the order is reconciled", async () => {
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
    let cancellations = 0;
    const cancel = ex.cancel.bind(ex);
    ex.cancel = async (sym: string, id: string) => { cancellations++; return cancel(sym, id); };
    rt.paper.positions = [{ cfg: "combo|ema-9-21@m15|a", sym: "S1-USDT", side: 1, entry: 10, stop: 9.8, vol: 1, entryT: 1 }];
    await step();
    await step();
    assert.equal(ex.positions.has("S1-USDT|LONG"), false, "the ambiguous old order blocks a new parent");
    assert.equal(cancellations, 0, "a flat snapshot alone does not authorize cancelling an unknown own exit");
    const stops = ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.positionSide === "LONG" && o.type === "STOP_MARKET");
    assert.deepEqual(stops.map((o) => [o.id, o.stopPrice]), [["left", 9.5]], "the original identity and level remain");
  });

  it("a verified legacy native exit reduces its own share even inside the 25% rebalance band", async () => {
    const ex = new Ex();
    const rt = rtOf();
    rt.settings.live = { ...rt.settings.live, rebalancePct: 0.25, laneOrders: true };
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const lane = (k: number) => ({ cfg: `combo|ema-9-21@m15|l${k}`, sym: "S1-USDT",
      side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: k });
    const parents = [1, 2, 3, 4, 5].map(lane);
    const key = "S1-USDT|1", now = Date.now() - 10_000;
    const tracked: Record<string, LaneOpen> = {}, native: Record<string, LaneOrder> = {};
    ex.positions.set("S1-USDT|LONG", 5);
    const backstop = makeCoid(rt.settings.live.connId, "S"), open = makeCoid(rt.settings.live.connId, "E");
    await ex.order({ symbol: "S1-USDT", positionSide: "LONG", side: "SELL", type: "STOP_MARKET",
      quantity: 5, stopPrice: 9.76, clientOrderID: backstop });
    rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      open, `control|${key}`, "S1-USDT", 1, "O", 5, 10, "ok", "legacy opening", now);
    rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      backstop, `control|${key}`, "S1-USDT", 1, "S", 5, 9.76, "ok", "legacy backstop", now + 1);
    for (const p of parents) {
      const id = laneKeyOf({ ...p, id: `${p.cfg}|${p.sym}|${p.entryT}` });
      const coid = makeCoid(rt.settings.live.connId, "V");
      const reply = await ex.order({ symbol: p.sym, positionSide: "LONG", side: "SELL", type: "STOP_MARKET",
        quantity: 1, stopPrice: p.stop, clientOrderID: coid }) as { order: { orderId: string } };
      tracked[id] = { cfg: p.cfg, sym: p.sym, side: 1, t: now, px: 10 };
      native[id] = { id, key, sym: p.sym, side: 1, qty: 1, at: now, s: { coid, oid: reply.order.orderId, px: p.stop } };
    }
    rt.db.kvSet("liveLaneOpen", tracked);
    rt.db.kvSet("laneOrders", native);
    rt.paper.positions = parents.slice(0, 4);
    const departed = laneKeyOf({ ...parents[4], id: `${parents[4].cfg}|${parents[4].sym}|${parents[4].entryT}` });
    const ownStop = native[departed].s!.oid!;
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 5, "paper departure alone cannot infer a safe reduction");
    assert.ok(ex.orders.some((o) => o.id === ownStop), "the departed parent keeps its own stop");
    ex.triggerOrder(ownStop);
    await step();
    assert.equal(ex.positions.get("S1-USDT|LONG"), 4, "the exact own native fill reduced one unit");
    const remaining = Object.values(native).filter((x) => x.id !== departed).map((x) => x.s!.oid);
    assert.ok(remaining.every((id) => ex.orders.some((o) => o.id === id)), "every surviving parent's stop remains");
    // relation: all rows — only the one exact parent fill may be booked.
    const rows = rt.db.all<{ cfg: string; reason: string; exit: number }>(
      "SELECT cfg,reason,exit FROM live_lane_trades");
    assert.deepEqual(rows.map((row) => [row.cfg, row.reason, row.exit]), [[parents[4].cfg, "stop", parents[4].stop]]);
  });

  it("regression (x01): a parent's backstop tracks its changed stop when client ids are lower case", async () => {
    const ex = new Ex();
    const rt = rtOf();
    rt.settings.live.laneOrders = true;
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const tight = { cfg: "combo|ema-9-21@m15|t", sym: "S1-USDT", side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: 1 };
    rt.paper.positions = [tight];
    await step();
    const stopOf = () => ex.orders.filter((o) => o.type === "STOP_MARKET" && o.venueSymbol === "S1-USDT" && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S").map((o) => o.stopPrice);
    // 2 % lane stop → backstop 2.4 % below 10
    assert.deepEqual(stopOf(), [9.76]);
    // The same parent's own stop is widened to 6%; no second parent is admitted.
    rt.paper.positions = [{ ...tight, stop: 9.4 }];
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
    const history: Record<string, unknown>[] = [];
    ex.order = async (p: Record<string, string | number>) => {
      await order(p);
      if (p.type === "MARKET") {
        history.push({ clientOrderId: p.clientOrderID, status: "FILLED", executedQty: p.quantity, avgPrice: 10, updateTime: Date.now() });
        throw new Error("request timed out");
      }
    };
    // A flat book alone is not proof of which order filled: the venue's own history confirms this close.
    Object.assign(ex, { ordersSince: async () => ({ orders: history }) });
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

  it("regression: a single parent's changed stop retains protection if a cancel reply is lost", async () => {
    const ex = new Ex();
    const rt = rtOf();
    rt.settings.live.laneOrders = true;
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    const tight = { cfg: "combo|ema-9-21@m15|t", sym: "S1-USDT", side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: 1 };
    rt.paper.positions = [tight];
    await step();
    const stopOf = () => ex.orders.filter((o) => o.type === "STOP_MARKET" && o.venueSymbol === "S1-USDT" && ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S").map((o) => o.stopPrice);
    assert.deepEqual(stopOf(), [9.76]);
    // every cancel now executes but its reply says it failed (a timed-out reply)
    const cancel = ex.cancel.bind(ex);
    ex.cancel = async (sym: string, id: string) => {
      await cancel(sym, id);
      return false;
    };
    rt.paper.positions = [{ ...tight, stop: 9.4 }];
    await step();
    assert.ok(ex.positions.get("S1-USDT|LONG")! > 0, "the position is held");
    assert.deepEqual(stopOf(), [9.28], "the old stop was cancelled and none placed: the position sat bare");
  });

  it("the live record keeps separate parent fill prices on independent symbols", async () => {
    const ex = new Ex();
    const rt = rtOf();
    rt.settings.live.laneOrders = false;
    const step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
    let fillPx = 10.1;
    const order = ex.order.bind(ex);
    ex.order = async (p: Record<string, string | number>) => {
      const reply = await order(p);
      return p.type === "MARKET" ? { order: { status: "FILLED", avgPrice: fillPx,
        executedQty: Number(p.quantity), commission: 0 } } : reply;
    };
    const a = { cfg: "combo|ema-9-21@m15|a", sym: "S1-USDT", side: 1 as const, entry: 10, stop: 9.8, vol: 1, entryT: 1 };
    const b = { ...a, cfg: "combo|ema-9-21@m15|b", sym: "S2-USDT", entry: 20, stop: 19.6, entryT: 2 };
    rt.paper.positions = [a];
    await step();
    fillPx = 20.2;
    rt.paper.positions = [a, b];
    await step();
    fillPx = 10.3;
    rt.paper.positions = [b];
    await step();
    const cost = rt.settings.cost;
    // relation: all rows — the test reads what the writer wrote
    const rows = () => rt.db.all<{ cfg: string; entry: number; exit: number; r: number; reason: string }>(
      "SELECT cfg, entry, exit, r, reason FROM live_lane_trades ORDER BY exit_t, cfg");
    assert.equal(rows().length, 1);
    assert.deepEqual({ ...rows()[0], r: +rows()[0].r.toFixed(9) }, {
      cfg: a.cfg, entry: 10.1, exit: 10.3, r: +(0.2 / 10.1 - cost).toFixed(9), reason: "exit",
    });
    const ownStop = ex.orders.find((o) => o.venueSymbol === "S2-USDT" && o.type === "STOP_MARKET" &&
      ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
    assert.ok(ownStop && ownStop.stopPrice && ownStop.clientOrderId);
    const stopPx = ownStop.stopPrice, stoppedQty = ex.positions.get("S2-USDT|LONG")!;
    ex.positions.delete("S2-USDT|LONG");
    ex.orders = ex.orders.filter((o) => o.venueSymbol !== "S2-USDT");
    (ex as ExchangeClient).ordersSince = async () => ({ orders: [{ symbol: "S2-USDT", positionSide: "LONG",
      side: "SELL", type: "STOP_MARKET", status: "FILLED", avgPrice: stopPx, executedQty: stoppedQty,
      clientOrderId: ownStop.clientOrderId, updateTime: Date.now() }] });
    await step();
    assert.equal(ex.positions.has("S2-USDT|LONG"), false, "the stopped-out position is not reopened");
    const r = rows();
    assert.equal(r.length, 2);
    const stopped = r.find((x) => x.cfg === b.cfg)!;
    assert.equal(stopped.reason, "stop");
    assert.equal(stopped.entry, 20.2);
    assert.equal(stopped.exit, stopPx);
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
