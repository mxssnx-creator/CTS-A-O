// Stress tests of the Live stage in Overall mode (control orders per symbol + direction) against a simulated
// hedge-mode exchange with rejects, time-outs after fills, triggered stops, foreign positions and a changing
// connection. Invariants are checked after every step.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { stepLive, type ExchangeClient } from "./live.server.ts";
import { controlTargets, planControl, stateHash } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;

function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

class SimExchange implements ExchangeClient {
  positions = new Map<string, number>(); // `${sym}|LONG|SHORT` → qty
  orders: Array<{
    id: string;
    venueSymbol: string;
    symbol: string;
    clientOrderId?: string;
    positionSide?: "LONG" | "SHORT";
    type?: string;
  }> = [];
  sent = 0;
  rejectRate = 0;
  timeoutAfterFillRate = 0;
  key = "key-A";
  private seq = 0;
  private r: () => number;
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
  async order(p: Record<string, string | number>) {
    this.sent++;
    if (this.r() < this.rejectRate) throw new Error("simulated reject");
    const sym = String(p.symbol);
    const ps = String(p.positionSide) as "LONG" | "SHORT";
    const key = `${sym}|${ps}`;
    if (p.type === "MARKET") {
      const into = (ps === "LONG" && p.side === "BUY") || (ps === "SHORT" && p.side === "SELL");
      const q = Number(p.quantity);
      const cur = this.positions.get(key) ?? 0;
      const next = +(into ? cur + q : Math.max(0, cur - q)).toFixed(6);
      if (next > 0) this.positions.set(key, next);
      else this.positions.delete(key);
    } else {
      this.orders.push({
        id: `o${++this.seq}`,
        venueSymbol: sym,
        symbol: sym,
        clientOrderId: String(p.clientOrderID),
        positionSide: ps,
        type: String(p.type),
      });
    }
    if (this.r() < this.timeoutAfterFillRate) throw new Error("simulated timeout after fill");
  }
  async cancel(_sym: string, id: string) {
    const n = this.orders.length;
    this.orders = this.orders.filter((o) => o.id !== id);
    return this.orders.length < n;
  }
  /** a stop triggers: the position and its stop disappear */
  triggerRandomStop() {
    const own = [...this.positions.keys()].filter((k) =>
      this.orders.some(
        (o) => o.venueSymbol === k.split("|")[0] && o.clientOrderId?.startsWith("CTSB"),
      ),
    );
    if (!own.length) return;
    const k = own[Math.floor(this.r() * own.length)];
    this.positions.delete(k);
    const [sym, ps] = k.split("|");
    this.orders = this.orders.filter(
      (o) =>
        !(o.venueSymbol === sym && o.positionSide === ps && o.clientOrderId?.startsWith("CTSB")),
    );
  }
}

function fakeRt(db: CoreDb) {
  const prices = Array.from({ length: 12 }, (_, i) => ({ sym: `S${i}-USDT`, last: 10 + i * 7 }));
  const rt = {
    generation: 1,
    db,
    settings: {
      ...DEFAULT_SETTINGS,
      live: {
        ...DEFAULT_SETTINGS.live,
        enabled: true,
        mode: "overall" as const,
        notionalUsd: 10,
        maxPositions: 8,
        maxNotionalUsd: 40,
        ratio: 1,
        rebalancePct: 0.25,
      },
    },
    sim: { stats: { pf: 1.5, n: 50 }, stable: true },
    status: { lastBarT: Math.floor(Date.now() / H) * H },
    paper: {
      positions: [] as Array<{
        cfg: string;
        sym: string;
        side: 1 | -1;
        entry: number;
        stop: number;
        vol: number;
      }>,
    },
    tickersAt: 0,
    freshTickers: async () => {
      rt.tickersAt = Date.now();
      return prices;
    },
  };
  return { rt, prices };
}

type FakeRt = ReturnType<typeof fakeRt>["rt"];
const step = (rt: FakeRt, ex: ExchangeClient) => stepLive(rt as unknown as CoreRuntime, [], 1, ex);

function randomLanes(r: () => number, prices: Array<{ sym: string; last: number }>) {
  const out = [];
  const n = Math.floor(r() * 14);
  for (let i = 0; i < n; i++) {
    const p = prices[Math.floor(r() * 7)]; // S0..S6 (S9 carries a foreign position)
    const side = (r() < 0.5 ? 1 : -1) as 1 | -1;
    out.push({
      cfg: `lane${i}`,
      sym: p.sym,
      side,
      entry: p.last,
      stop: p.last * (1 - side * 0.03),
      vol: [1, 1.2, 1.4, 2][Math.floor(r() * 4)],
    });
  }
  return out;
}

function expected(
  rt: ReturnType<typeof fakeRt>["rt"],
  prices: Array<{ sym: string; last: number }>,
) {
  const s = rt.settings.live;
  return controlTargets(
    rt.paper.positions.map((p) => ({
      cfg: p.cfg,
      sym: p.sym,
      side: p.side,
      vol: p.vol ?? 1,
      sl: 0.03,
    })),
    new Map(prices.map((p) => [p.sym, p.last])),
    {
      notionalUsd: s.notionalUsd,
      ratio: s.ratio,
      maxNotionalUsd: s.maxNotionalUsd,
      maxPositions: s.maxPositions,
      rebalancePct: s.rebalancePct,
    },
    (_sym: string, q: number) => Math.floor(q / 0.001 + 1e-12) * 0.001,
  ).targets;
}

function checkInvariants(
  ex: SimExchange,
  rt: ReturnType<typeof fakeRt>["rt"],
  prices: Array<{ sym: string; last: number }>,
  strict: boolean,
) {
  // foreign position and order are never touched
  assert.equal(ex.positions.get("S9-USDT|LONG"), 5, "foreign position untouched");
  assert.ok(
    ex.orders.some((o) => o.clientOrderId === "OTHER_1"),
    "foreign order untouched",
  );
  const targets = new Map(
    expected(rt, prices).map((t) => [`${t.sym}|${t.side === 1 ? "LONG" : "SHORT"}`, t.qty]),
  );
  for (const [k, q] of ex.positions) {
    if (k.startsWith("S9-")) continue;
    // every own position carries its own protective stop (under injected failures a step may leave one to repair)
    const [sym, ps] = k.split("|");
    if (strict)
      assert.ok(
        ex.orders.some(
          (o) =>
            o.venueSymbol === sym &&
            o.positionSide === ps &&
            o.clientOrderId?.startsWith("CTSBV2_"),
        ),
        `${k} has a stop`,
      );
    if (strict) {
      const want = targets.get(k) ?? 0;
      assert.ok(want > 0, `${k} held without target`);
      assert.ok(Math.abs(q - want) / want <= 0.25 + 1e-9, `${k} held ${q} vs target ${want}`);
    }
  }
  if (strict)
    for (const [k, want] of targets)
      if (!k.startsWith("S9-"))
        assert.ok((ex.positions.get(k) ?? 0) > 0 || want * 10 < 2, `${k} target ${want} not held`);
  // no own order rests on a flat (symbol, side) after a clean step
  if (strict)
    for (const o of ex.orders)
      if (o.clientOrderId?.startsWith("CTSB"))
        assert.ok(
          ex.positions.has(`${o.venueSymbol}|${o.positionSide}`),
          `orphan ${o.clientOrderId}`,
        );
}

describe("live Overall control orders", { timeout: 300_000 }, () => {
  it("plans exactly one position per symbol + direction and is hash-stable", () => {
    const prices = new Map([
      ["A-USDT", 10],
      ["B-USDT", 20],
    ]);
    const cs = {
      notionalUsd: 10,
      ratio: 1,
      maxNotionalUsd: 25,
      maxPositions: 5,
      rebalancePct: 0.25,
    };
    const { targets } = controlTargets(
      [
        { cfg: "x", sym: "A-USDT", side: 1, vol: 1, sl: 0.02 },
        { cfg: "y", sym: "A-USDT", side: 1, vol: 1.4, sl: 0.04 },
        { cfg: "z", sym: "A-USDT", side: -1, vol: 1, sl: 0.02 },
        { cfg: "w", sym: "B-USDT", side: 1, vol: 1, sl: 0.02 },
      ],
      prices,
      cs,
    );
    assert.equal(targets.length, 3);
    const a = targets.find((t) => t.key === "A-USDT|1")!;
    assert.equal(a.lanes, 2);
    assert.ok(Math.abs(a.notional - 24) < 1e-9, "10 × (1 + 1.4)");
    assert.ok(Math.abs(a.stopDist - 0.048) < 1e-9, "widest lane stop × 1.2");
    const held = new Map([
      ["A-USDT|1", 2.4],
      ["C-USDT|-1", 1],
    ]);
    const p1 = planControl({ targets, held, foreign: new Set(), rebalancePct: 0.25 });
    assert.deepEqual(p1.actions.map((x) => `${x.kind}:${x.key}`).sort(), [
      "close:C-USDT|-1",
      "open:A-USDT|-1",
      "open:B-USDT|1",
    ]);
    const p2 = planControl({ targets, held, foreign: new Set(), rebalancePct: 0.25 });
    assert.equal(p1.hashes.targets, p2.hashes.targets);
    assert.equal(p1.hashes.plan, p2.hashes.plan);
    // foreign symbol: nothing planned
    const p3 = planControl({ targets, held, foreign: new Set(["A-USDT"]), rebalancePct: 0.25 });
    assert.ok(p3.actions.every((x) => x.sym !== "A-USDT"));
    // capped at maxNotionalUsd
    const big = controlTargets([{ cfg: "x", sym: "A-USDT", side: 1, vol: 9, sl: 0.02 }], prices, cs)
      .targets[0];
    assert.equal(big.notional, 25);
    assert.notEqual(stateHash(["a"]), stateHash(["b"]));
  });

  it("converges to the targets on every step over 400 random steps and never touches foreign positions", async () => {
    const r = rng(7);
    const ex = new SimExchange(r);
    ex.positions.set("S9-USDT|LONG", 5);
    ex.orders.push({
      id: "f1",
      venueSymbol: "S8-USDT",
      symbol: "S8-USDT",
      clientOrderId: "OTHER_1",
      positionSide: "LONG",
      type: "LIMIT",
    });
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    for (let i = 0; i < 400; i++) {
      if (r() < 0.6) rt.paper.positions = randomLanes(r, prices);
      const st = await step(rt, ex);
      assert.equal(st.error, null, st.error ?? "");
      // a second step right after converges fully (the first may leave orphans it cancels next time)
      await step(rt, ex);
      checkInvariants(ex, rt, prices, true);
      if (r() < 0.1) ex.triggerRandomStop();
    }
  });

  it("is idempotent: unchanged targets and book send nothing and are marked unchanged", async () => {
    const r = rng(11);
    const ex = new SimExchange(r);
    ex.positions.set("S9-USDT|LONG", 5);
    ex.orders.push({
      id: "f1",
      venueSymbol: "S8-USDT",
      symbol: "S8-USDT",
      clientOrderId: "OTHER_1",
      positionSide: "LONG",
      type: "LIMIT",
    });
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = randomLanes(r, prices).concat([
      { cfg: "k", sym: "S1-USDT", side: 1, entry: 17, stop: 16.5, vol: 1 },
    ]);
    await step(rt, ex);
    await step(rt, ex);
    const before = ex.sent;
    const st = await step(rt, ex);
    assert.equal(ex.sent, before, "no order sent");
    assert.equal(st.control?.unchanged, true);
    assert.equal(st.control?.actions.length, 0);
    checkInvariants(ex, rt, prices, true);
  });

  it("survives rejects and time-outs after fills, then converges once the exchange is healthy", async () => {
    const r = rng(23);
    const ex = new SimExchange(r);
    ex.positions.set("S9-USDT|LONG", 5);
    ex.orders.push({
      id: "f1",
      venueSymbol: "S8-USDT",
      symbol: "S8-USDT",
      clientOrderId: "OTHER_1",
      positionSide: "LONG",
      type: "LIMIT",
    });
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    ex.rejectRate = 0.2;
    ex.timeoutAfterFillRate = 0.1;
    for (let i = 0; i < 300; i++) {
      if (r() < 0.5) rt.paper.positions = randomLanes(r, prices);
      const st = await step(rt, ex);
      assert.equal(st.error, null, st.error ?? "");
      checkInvariants(ex, rt, prices, false);
      // never more than one position per (symbol, side) — by construction of hedge mode, and never an unknown side
      for (const k of ex.positions.keys()) assert.match(k, /\|(LONG|SHORT)$/);
    }
    ex.rejectRate = 0;
    ex.timeoutAfterFillRate = 0;
    for (let i = 0; i < 3; i++) await step(rt, ex);
    checkInvariants(ex, rt, prices, true);
  });

  it("re-syncs from the exchange after a restart (fresh DB) and flags a connection change", async () => {
    const r = rng(5);
    const ex = new SimExchange(r);
    ex.positions.set("S9-USDT|LONG", 5);
    ex.orders.push({
      id: "f1",
      venueSymbol: "S8-USDT",
      symbol: "S8-USDT",
      clientOrderId: "OTHER_1",
      positionSide: "LONG",
      type: "LIMIT",
    });
    const a = fakeRt(new CoreDb(":memory:"));
    a.rt.paper.positions = [{ cfg: "k", sym: "S2-USDT", side: -1, entry: 24, stop: 25, vol: 1.4 }];
    await step(a.rt, ex);
    const held = ex.positions.get("S2-USDT|SHORT");
    assert.ok(held && held > 0);
    // restart: new process state, same exchange — ownership comes from the own stop on the exchange
    const b = fakeRt(new CoreDb(":memory:"));
    b.rt.paper.positions = [];
    await step(b.rt, ex);
    assert.equal(
      ex.positions.has("S2-USDT|SHORT"),
      false,
      "own position closed after restart when no lane holds it",
    );
    // connection identity changes → flagged, full re-sync, still consistent
    b.rt.paper.positions = [{ cfg: "k", sym: "S3-USDT", side: 1, entry: 31, stop: 30, vol: 1 }];
    await step(b.rt, ex);
    ex.key = "key-B";
    const st = await step(b.rt, ex);
    assert.equal(st.control?.reconnected, true);
    checkInvariants(ex, b.rt, b.prices, true);
  });

  it("does nothing while not armed, not ready or disabled", async () => {
    const ex = new SimExchange(rng(1));
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = randomLanes(rng(3), prices);
    rt.sim = { stats: { pf: 0.9, n: 50 }, stable: true } as never;
    let st = await step(rt, ex);
    assert.match(st.reason, /not ready/);
    rt.sim = { stats: { pf: 1.5, n: 50 }, stable: true } as never;
    process.env.CTS_CORE_LIVE = "0";
    st = await step(rt, ex);
    assert.match(st.reason, /CTS_CORE_LIVE/);
    process.env.CTS_CORE_LIVE = "1";
    rt.settings.live.enabled = false;
    st = await step(rt, ex);
    assert.match(st.reason, /disabled/);
    assert.equal(ex.sent, 0);
  });

  it("one-way mode: nets long and short lanes into one position per symbol, closes before flipping, reduce-only exits", async () => {
    const orders: Array<Record<string, string | number>> = [];
    let net = new Map<string, number>(); // sym → signed qty
    const stops: Array<{ id: string; venueSymbol: string; symbol: string; clientOrderId: string }> =
      [];
    let modeCalls = 0;
    let marginCalls = 0;
    const ex: ExchangeClient = {
      hasKeys: () => true,
      fingerprint: () => "vst|oneway",
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
        orders.push(p);
        const sym = String(p.symbol);
        assert.equal(p.positionSide, "BOTH");
        if (p.type === "MARKET") {
          const q = Number(p.quantity) * (p.side === "BUY" ? 1 : -1);
          const cur = net.get(sym) ?? 0;
          if (p.reduceOnly === "true")
            assert.ok(Math.abs(cur + q) <= Math.abs(cur) + 1e-9, "reduce-only never increases");
          net.set(sym, +(cur + q).toFixed(6));
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
      async setPositionMode(m) {
        modeCalls++;
        assert.equal(m, "oneway");
      },
      async setMarginMode(_sym, m) {
        marginCalls++;
        assert.equal(m, "isolated");
      },
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live.positionMode = "oneway";
    rt.settings.live.marginMode = "isolated";
    // long 2 volume, short 1 volume on S1 → one net long of volume 1
    rt.paper.positions = [
      { cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16.5, vol: 1 },
      { cfg: "b", sym: "S1-USDT", side: 1, entry: 17, stop: 16.5, vol: 1 },
      { cfg: "c", sym: "S1-USDT", side: -1, entry: 17, stop: 17.5, vol: 1 },
    ];
    await step(rt, ex);
    assert.ok(Math.abs((net.get("S1-USDT") ?? 0) - 10 / 17) < 0.002, `net ${net.get("S1-USDT")}`);
    assert.equal(modeCalls, 1);
    assert.equal(marginCalls, 1);
    // flip: short lanes dominate → the long is closed (reduce-only) before the short opens
    rt.paper.positions = [{ cfg: "c", sym: "S1-USDT", side: -1, entry: 17, stop: 17.5, vol: 2 }];
    const before = orders.length;
    await step(rt, ex);
    const flip = orders.slice(before).filter((o) => o.type === "MARKET");
    assert.equal(flip[0].reduceOnly, "true");
    assert.equal(flip[0].side, "SELL");
    assert.ok((net.get("S1-USDT") ?? 0) < 0);
    assert.equal(modeCalls, 1, "position mode applied once per connection");
  });

  it("never opens on stale prices or when the exchange refuses the position mode (closing still works)", async () => {
    const r = rng(31);
    const ex = new SimExchange(r);
    ex.positions.set("S9-USDT|LONG", 5);
    ex.orders.push({
      id: "f1",
      venueSymbol: "S8-USDT",
      symbol: "S8-USDT",
      clientOrderId: "OTHER_1",
      positionSide: "LONG",
      type: "LIMIT",
    });
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [{ cfg: "k", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 }];
    // stale prices
    rt.freshTickers = async () => {
      rt.tickersAt = Date.now() - 60_000;
      return Array.from({ length: 12 }, (_, i) => ({
        sym: `S${i}-USDT`,
        last: 10 + i * 7,
      })) as never;
    };
    await step(rt, ex);
    assert.equal(ex.positions.has("S2-USDT|LONG"), false, "no open on stale prices");
    // refused position mode (fresh process state: the mode has not been applied on this connection yet)
    const refuse = Object.assign(Object.create(Object.getPrototypeOf(ex)), ex, {
      setPositionMode: async () => {
        throw new Error("position mode cannot be changed with open positions");
      },
    });
    const b = fakeRt(new CoreDb(":memory:")).rt;
    b.paper.positions = rt.paper.positions;
    const st = await step(b, refuse);
    assert.match(st.reason, /opening blocked/);
    assert.equal(ex.positions.has("S2-USDT|LONG"), false, "no open while the mode is not applied");
  });
});
