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

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;

class Ex implements ExchangeClient {
  positions = new Map<string, number>();
  orders: Array<{ id: string; venueSymbol: string; symbol: string; clientOrderId?: string; positionSide?: "LONG" | "SHORT"; type?: string }> = [];
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
  async order(p: Record<string, string | number>) {
    const sym = String(p.symbol);
    const ps = String(p.positionSide) as "LONG" | "SHORT";
    const key = `${sym}|${ps}`;
    if (p.type === "MARKET") {
      const into = (ps === "LONG" && p.side === "BUY") || (ps === "SHORT" && p.side === "SELL");
      const next = +((this.positions.get(key) ?? 0) + (into ? 1 : -1) * Number(p.quantity)).toFixed(6);
      if (next > 1e-9) this.positions.set(key, next);
      else this.positions.delete(key);
    } else
      this.orders.push({ id: `o${++this.seq}`, venueSymbol: sym, symbol: sym, clientOrderId: String(p.clientOrderID), positionSide: ps, type: String(p.type) });
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
});
