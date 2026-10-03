// Stress tests of the Live stage in Overall mode (control orders per symbol + direction) against a simulated
// hedge-mode exchange with rejects, time-outs after fills, triggered stops, foreign positions and a changing
// connection. Invariants are checked after every step.
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import {
  laneContributions,
  ISOLATED_MAX_LEVERAGE,
  liveKv,
  resetLiveBackoff,
  stepLive,
  type ExchangeClient,
} from "./live.server.ts";
import { crossedStop } from "./runtime.server.ts";
import { capHeldToOwn, controlTargets, liveTag, ownLedger, planControl, stateHash, topConfigLanes } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { noteRateLimit } from "../exchange/bingx.server.ts";

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
  async setMarginMode(_venueSymbol: string, _mode: "cross" | "isolated") {}
  leverage?: ExchangeClient["leverage"];
  setLeverage?: ExchangeClient["setLeverage"];
  account?: ExchangeClient["account"];
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
      // these tests converge on explicit notionals (equity-% sizing is tested separately)
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
  /** own positions held (venue key → qty): ranked first under the position cap, as in the engine */
  held?: ReadonlyMap<string, number>,
) {
  const s = rt.settings.live;
  // lane orders of a position closed outside the system (manually or by a stop) do not count any more
  // the newest live state (in memory; the database copy trails it by up to ~1 s)
  const suppressed = liveKv<Record<string, unknown>>(rt.db, "controlSuppressed") ?? {};
  return controlTargets(
    rt.paper.positions
      .filter((p) => !suppressed[`${p.cfg}|${p.sym}|${(p as { entryT?: number }).entryT}`])
      .map((p) => ({
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
      heldKeys: new Set(
        [...(held ?? new Map()).keys()]
          .filter((k) => !k.startsWith("S9-"))
          .map((k) => `${k.split("|")[0]}|${k.endsWith("LONG") ? 1 : -1}`),
      ),
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
    expected(rt, prices, ex.positions).map((t) => [`${t.sym}|${t.side === 1 ? "LONG" : "SHORT"}`, t.qty]),
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
  // failure backoff and the equity cache are per process and keyed by the connection (the same in every test)
  beforeEach(() => resetLiveBackoff());
  it("one position cap for engine and signal positions; the signal cap narrows the signal share; lane orders count once", () => {
    const prices = new Map(["A", "B", "C", "D", "E"].map((x) => [`${x}-USDT`, 10] as const));
    const eng = "combo|ema-9-21@m15|x";
    const sig = "follow|sig-ema-cross-s@m15|x";
    const lanes = [
      // engine: A long with three lane orders, B long
      { cfg: `${eng}1`, sym: "A-USDT", side: 1 as const, vol: 1, sl: 0.02 },
      { cfg: `${eng}2`, sym: "A-USDT", side: 1 as const, vol: 1, sl: 0.02 },
      { cfg: `${sig}1`, sym: "A-USDT", side: 1 as const, vol: 1, sl: 0.02 }, // a signal order on an engine position
      { cfg: `${eng}3`, sym: "B-USDT", side: 1 as const, vol: 1, sl: 0.02 },
      // signals only: C long, C short (apart), D long, E long
      { cfg: `${sig}2`, sym: "C-USDT", side: 1 as const, vol: 1, sl: 0.02 },
      { cfg: `${sig}3`, sym: "C-USDT", side: -1 as const, vol: 1, sl: 0.02 },
      { cfg: `${sig}4`, sym: "D-USDT", side: 1 as const, vol: 1, sl: 0.02 },
      { cfg: `${sig}5`, sym: "E-USDT", side: 1 as const, vol: 1, sl: 0.02 },
    ];
    const base = { notionalUsd: 10, ratio: 1, maxNotionalUsd: 25, rebalancePct: 0.25 };
    // one cap for every position: 4 in all — A (engine, strongest), then B, C short, C long; D and E held back
    const r = controlTargets(lanes, prices, { ...base, maxPositions: 4 });
    assert.deepEqual(
      r.targets.map((t) => t.key),
      ["A-USDT|1", "B-USDT|1", "C-USDT|-1", "C-USDT|1"],
    );
    assert.equal(r.skipped.filter((x) => x.why === "max control positions").length, 2);
    // the signal cap narrows the signal share inside the total: 2 signal positions at most
    const narrow = controlTargets(lanes, prices, { ...base, maxPositions: 10, signalMaxPositions: 2 });
    assert.equal(narrow.targets.length, 4, "A, B + two signal positions");
    assert.equal(narrow.skipped.filter((x) => x.why === "max signal control positions").length, 2);
    // no cap: every position
    assert.equal(controlTargets(lanes, prices, { ...base, maxPositions: 0 }).targets.length, 6);
  });

  it("top configs: signals always, engine configs by score — a number of them, or as many as the budget carries", () => {
    const eng = (n: number) => `combo|ema-9-21@m15|x${n}`;
    const sig = "follow|sig-ema-cross-s@m15|x";
    const L = (cfg: string, sym: string, side: 1 | -1, vol = 1) => ({ cfg, sym, side, vol, sl: 0.02 });
    const lanes = [
      L(eng(1), "A-USDT", 1),
      L(eng(1), "B-USDT", -1),
      L(eng(2), "A-USDT", 1),
      L(eng(3), "C-USDT", 1, 2),
      L(eng(4), "D-USDT", -1),
      L(`${sig}1`, "E-USDT", 1),
    ];
    const score = new Map([
      [eng(1), 0.2],
      [eng(2), 0.9],
      [eng(3), 0.5],
      [eng(4), 0.1],
    ]);
    // a position costs $2 per lane unit, at least the $2 minimum
    const posCost = (_s: string, v: number) => Math.max(2, 2 * v);
    // top 2: the signal, then x2 (0.9), x3 (0.5)
    const two = topConfigLanes(lanes, (c) => score.get(c), { top: 2, budget: Infinity, posCost });
    assert.deepEqual(new Set(two.lanes.map((l) => l.cfg)), new Set([`${sig}1`, eng(2), eng(3)]));
    assert.deepEqual([two.kept, two.of], [2, 4]);
    // fill: signal E ($2) + x2 A ($2) + x3 C 2 units ($4) = $8; x1 adds A (+$2) and B ($2) → $12 > $10: skipped;
    // x4 D ($2) still fits → $10
    const fill = topConfigLanes(lanes, (c) => score.get(c), { top: "fill", budget: 10, posCost });
    assert.deepEqual(new Set(fill.lanes.map((l) => l.cfg)), new Set([`${sig}1`, eng(2), eng(3), eng(4)]));
    // a budget that carries everything keeps every config; a config sharing a kept position costs only its growth
    assert.equal(topConfigLanes(lanes, (c) => score.get(c), { top: "fill", budget: 1e9, posCost }).kept, 4);
    // the best config always stays, even over the budget
    const tight = topConfigLanes(lanes, (c) => score.get(c), { top: "fill", budget: 0, posCost });
    assert.deepEqual(new Set(tight.lanes.map((l) => l.cfg)), new Set([`${sig}1`, eng(2)]));
    // a per-position cap in the cost: a crowded position stops growing in the budget, further configs fit
    const crowd = [L(eng(1), "A-USDT", 1, 8), L(eng(2), "A-USDT", 1, 8), L(eng(3), "C-USDT", 1), L(eng(4), "D-USDT", -1)];
    const uncapped = topConfigLanes(crowd, (c) => score.get(c), { top: "fill", budget: 34, posCost });
    const capped = topConfigLanes(crowd, (c) => score.get(c), {
      top: "fill",
      budget: 34,
      posCost: (sym, v) => Math.min(20, posCost(sym, v)),
    });
    assert.deepEqual([uncapped.kept, capped.kept], [3, 4]);
    // kept last step: they stay ahead of a better-scored newcomer, so a reshuffled ranking does not churn the book
    const sticky = topConfigLanes(lanes, (c) => score.get(c), {
      top: 2,
      budget: Infinity,
      posCost,
      prefer: new Set([eng(1), eng(4)]),
    });
    assert.deepEqual(sticky.cfgs, [eng(1), eng(4)]);
    // a preferred config no longer offered (deselected, no lanes) takes no place
    const gone = topConfigLanes(lanes, (c) => score.get(c), { top: 2, budget: Infinity, posCost, prefer: new Set([eng(9)]) });
    assert.deepEqual(gone.cfgs, [eng(2), eng(3)]);
    // configs without a score rank last
    const unk = topConfigLanes([...lanes, L(eng(9), "F-USDT", 1)], (c) => score.get(c), { top: 4, budget: Infinity, posCost });
    assert.ok(!unk.lanes.some((l) => l.cfg === eng(9)));
    // fill with a held engine config: a new signal that alone fills the budget does not evict it (held first)
    // (two held configs: before, the signal took the budget first and evicted the second one, closing its positions)
    const bigSig = [L(eng(4), "D-USDT", -1), L(eng(1), "A-USDT", 1), L(eng(1), "B-USDT", -1), L(`${sig}9`, "G-USDT", 1, 5)];
    const held = topConfigLanes(bigSig, (c) => score.get(c), { top: "fill", budget: 10, posCost, prefer: new Set([eng(4), eng(1)]) });
    assert.deepEqual(new Set(held.cfgs), new Set([eng(4), eng(1)]));
    assert.ok(held.lanes.some((l) => l.cfg === `${sig}9`), "the signal is still kept");
  });

  it("signal weight: signal lanes count signalWeight units, engine lanes one; default 1", () => {
    const prices = new Map(["A", "C"].map((x) => [`${x}-USDT`, 10] as const));
    const eng = "combo|ema-9-21@m15|x";
    const sig = "follow|sig-ema-cross-s@m15|x";
    const lanes = [
      { cfg: `${eng}1`, sym: "A-USDT", side: 1 as const, vol: 1, sl: 0.02 },
      { cfg: `${sig}1`, sym: "A-USDT", side: 1 as const, vol: 1, sl: 0.02 },
      { cfg: `${sig}2`, sym: "C-USDT", side: -1 as const, vol: 2, sl: 0.02 },
    ];
    const base = { notionalUsd: 10, ratio: 1, maxNotionalUsd: 0, rebalancePct: 0.25, maxPositions: 0 };
    const qtyOf = (r: ReturnType<typeof controlTargets>) =>
      Object.fromEntries(r.targets.map((t) => [t.key, t.qty]));
    // default: one unit per lane volume (A: engine 1 + signal 1 = 2 units of $10 at 10 → 2; C: 2)
    assert.deepEqual(qtyOf(controlTargets(lanes, prices, { ...base, maxNotionalUsd: Infinity })), {
      "A-USDT|1": 2,
      "C-USDT|-1": 2,
    });
    // weight 3: A = 1 + 3, C = 2 × 3; the engine lane is unchanged
    assert.deepEqual(qtyOf(controlTargets(lanes, prices, { ...base, maxNotionalUsd: Infinity, signalWeight: 3 })), {
      "A-USDT|1": 4,
      "C-USDT|-1": 6,
    });
    // weight 0: signal-only positions have nothing to hold
    assert.deepEqual(qtyOf(controlTargets(lanes, prices, { ...base, maxNotionalUsd: Infinity, signalWeight: 0 })), {
      "A-USDT|1": 1,
    });
  });

  it("own quantity in time order: a close of a position this ledger never opened does not eat the next open", () => {
    // restart that lost the database: the adopted position is closed (X), then a new one opens (O)
    const own = ownLedger([
      { k: "P-USDT|1", kind: "X", status: "ok", qty: 378.21 },
      { k: "P-USDT|1", kind: "O", status: "ok", qty: 378.5 },
      { k: "Q-USDT|1", kind: "O", status: "ok", qty: 2 },
      { k: "Q-USDT|1", kind: "I", status: "pending", qty: 1 },
      { k: "Q-USDT|1", kind: "R", status: "ok", qty: 1.5 },
      { k: "Q-USDT|1", kind: "X", status: "error", qty: 1.5 },
    ]);
    assert.equal(own.get("P-USDT|1"), 378.5);
    assert.equal(own.get("Q-USDT|1"), 1.5);
    // the whole exchange position is then ours: nothing is capped, nothing is added on top
    const held = new Map([["P-USDT|1", 378.5]]);
    assert.deepEqual(capHeldToOwn(held, own), []);
    assert.equal(held.get("P-USDT|1"), 378.5);
  });

  it("a resize of one exchange lot is not made (the minimum-volume target moves by a lot with the price)", () => {
    const plan = (want: number, have: number) =>
      planControl({
        targets: [{ key: "Q-USDT|1", sym: "Q-USDT", side: 1, qty: want, stopDist: 0.02 }] as never,
        held: new Map([["Q-USDT|1", have]]),
        foreign: new Set(),
        rebalancePct: 0.25,
        lots: new Map([["Q-USDT", 0.01]]),
      }).actions;
    // the raised minimum alternates between 0.01 and 0.02 lots as the price crosses the lot boundary: no order
    assert.deepEqual(plan(0.02, 0.01), []);
    assert.deepEqual(plan(0.01, 0.02), []);
    // two lots or more away: resized
    assert.equal(plan(0.03, 0.01)[0]?.kind, "increase");
    assert.equal(plan(0.01, 0.03)[0]?.kind, "reduce");
  });

  it("only the quantity this system opened is ever reduced or closed (a foreign add on the same key stays)", () => {
    const held = new Map([
      ["A-USDT|1", 5], // 2 ours + 3 added by someone else on the same symbol and direction
      ["B-USDT|1", 4], // exactly ours
      ["C-USDT|-1", 3], // no ledger entry: left as it is
      ["D-USDT|1", 4.1], // within the rounding tolerance of ours (4)
    ]);
    const ledger = new Map([
      ["A-USDT|1", 2],
      ["B-USDT|1", 4],
      ["D-USDT|1", 4],
    ]);
    const excess = capHeldToOwn(held, ledger);
    assert.deepEqual(excess, [{ key: "A-USDT|1", exchange: 5, own: 2 }]);
    assert.equal(held.get("A-USDT|1"), 2);
    assert.equal(held.get("B-USDT|1"), 4);
    assert.equal(held.get("C-USDT|-1"), 3);
    assert.equal(held.get("D-USDT|1"), 4.1);
    // a lane that ended closes the position: the close is the own 2, never the 5 on the exchange
    const plan = planControl({ targets: [], held, foreign: new Set(), rebalancePct: 0.25 });
    const close = plan.actions.find((x) => x.key === "A-USDT|1")!;
    assert.equal(close.kind, "close");
    assert.equal(close.qty, 2);
  });

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

  it("a position closed manually keeps processing: the same lane orders put it back", async () => {
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
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const lane = (cfg: string, sym: string, entryT: number) =>
      ({ cfg, sym, side: 1 as const, entry: 17, stop: 16.5, vol: 1, entryT }) as never;
    rt.paper.positions = [
      lane("a", "S1-USDT", 1),
      lane("b", "S1-USDT", 2),
      lane("c", "S2-USDT", 3),
    ];
    await step(rt, ex);
    const before = ex.positions.get("S1-USDT|LONG") ?? 0;
    assert.ok(before > 0 && (ex.positions.get("S2-USDT|LONG") ?? 0) > 0);
    // the user closes S1 long on the exchange (its stop order is left behind)
    ex.positions.delete("S1-USDT|LONG");
    const st = await step(rt, ex);
    const again = ex.positions.get("S1-USDT|LONG") ?? 0;
    assert.ok(again > 0, "processing puts the position back");
    assert.ok(Math.abs(again - before) / before <= 0.25, `size stays with the lanes (${again} vs ${before})`);
    assert.equal(st.control?.suppressed, 0, "lanes are not held back");
    assert.ok((ex.positions.get("S2-USDT|LONG") ?? 0) > 0, "other positions keep processing");
    assert.ok(
      ex.orders.some((o) => o.venueSymbol === "S1-USDT" && o.clientOrderId?.startsWith("CTSB")),
      "protective stop is back on the reopened position",
    );
    await step(rt, ex);
    assert.ok((ex.positions.get("S1-USDT|LONG") ?? 0) > 0, "still processing on the next step");
    // a lane that closes in the simulation is no longer a target, so that share comes off
    rt.paper.positions = rt.paper.positions.filter((p) => p.cfg !== "a" && p.cfg !== "b");
    const st2 = await step(rt, ex);
    assert.equal(st2.control?.suppressed, 0);
    assert.equal(ex.positions.get("S1-USDT|LONG") ?? 0, 0, "flat once its lanes have closed");
    assert.ok((ex.positions.get("S2-USDT|LONG") ?? 0) > 0);
  });

  it("a position this system closed itself is not treated as closed manually", async () => {
    const r = rng(6);
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
    rt.paper.positions = [
      { cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16.5, vol: 1, entryT: 1 } as never,
    ];
    await step(rt, ex);
    rt.paper.positions = [];
    await step(rt, ex); // closes S1 (its lane closed)
    assert.equal(ex.positions.get("S1-USDT|LONG") ?? 0, 0);
    rt.paper.positions = [
      { cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16.5, vol: 1, entryT: 1 } as never,
    ];
    const st = await step(rt, ex);
    assert.equal(st.control?.suppressed, 0);
    assert.ok((ex.positions.get("S1-USDT|LONG") ?? 0) > 0, "reopened: it was our own close");
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

  it("keeps its state in memory: rapid steps write it at most once a second, flushed on shutdown", async () => {
    const { flushLiveKv } = await import("./live.server.ts");
    const r = rng(12);
    const ex = new SimExchange(r);
    const db = new CoreDb(":memory:");
    const { rt, prices } = fakeRt(db);
    rt.paper.positions = randomLanes(r, prices);
    let writes = 0;
    const orig = db.kvSet.bind(db);
    db.kvSet = ((k: string, v: unknown) => {
      if (k === "controlStatus") writes++;
      return orig(k, v);
    }) as typeof db.kvSet;
    for (let i = 0; i < 6; i++) await step(rt, ex);
    assert.ok(writes <= 2, `${writes} writes for 6 steps`);
    // readers get the newest state from memory; the flush persists it
    const mem = liveKv<{ at: number }>(db, "controlStatus");
    assert.ok(mem);
    flushLiveKv(db);
    assert.deepEqual(db.kvGet("controlStatus"), JSON.parse(JSON.stringify(mem)));
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
    // once the backoff after the failures has run out
    resetLiveBackoff();
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
    const net = new Map<string, number>(); // sym → signed qty
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
    // the refused mode change is not re-sent every tick
    let modeCalls = 0;
    const counting = Object.assign(Object.create(Object.getPrototypeOf(ex)), ex, {
      setPositionMode: async () => {
        modeCalls++;
        throw new Error("position mode cannot be changed with open positions");
      },
    });
    const c = fakeRt(new CoreDb(":memory:")).rt;
    c.paper.positions = rt.paper.positions;
    resetLiveBackoff();
    for (let i = 0; i < 5; i++) await step(c, counting);
    assert.equal(modeCalls, 1, "backoff after a refused mode change");
  });

  it("a lane whose stop was crossed at tick time leaves the control at once (live position reduced / closed)", async () => {
    // the rule: long at or below its stop, short at or above
    assert.equal(crossedStop({ side: 1, stop: 99 }, 99), true);
    assert.equal(crossedStop({ side: 1, stop: 99 }, 99.5), false);
    assert.equal(crossedStop({ side: -1, stop: 101 }, 101.2), true);
    assert.equal(crossedStop({ side: -1, stop: 101 }, 100), false);
    assert.equal(crossedStop({ side: 1, stop: 0 }, 50), false, "no stop, never crossed");
    const ex = new SimExchange(rng(8));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [
      { cfg: "follow|sig-a-s@m5|p", sym: "S2-USDT", side: 1, entry: 24, stop: 23.88, vol: 1 },
      { cfg: "follow|sig-b-s@m5|p", sym: "S2-USDT", side: 1, entry: 24, stop: 23.88, vol: 1 },
    ];
    await step(rt, ex);
    const full = ex.positions.get("S2-USDT|LONG")!;
    assert.ok(full > 0);
    // one lane's stop is crossed: its volume leaves the control position right away
    (rt.paper.positions[0] as { stopHit?: number }).stopHit = Date.now();
    assert.equal(laneContributions(rt as unknown as CoreRuntime).length, 1);
    await step(rt, ex);
    const half = ex.positions.get("S2-USDT|LONG")!;
    assert.ok(half < full * 0.75, `reduced ${full} → ${half}`);
    // both stopped: closed
    (rt.paper.positions[1] as { stopHit?: number }).stopHit = Date.now();
    await step(rt, ex);
    assert.equal(ex.positions.has("S2-USDT|LONG"), false);
  });

  it("the protective stop of an opened position is priced from its fill, not from the reference ticker", async () => {
    const ex = new SimExchange(rng(9));
    const stops: number[] = [];
    const base = ex.order.bind(ex);
    // S2 trades at 24 on the ticker; the market fill slips to 25
    (ex as unknown as { order: (p: Record<string, string | number>) => Promise<unknown> }).order =
      async (p: Record<string, string | number>) => {
        await base(p);
        if (p.type === "STOP_MARKET") stops.push(Number(p.stopPrice));
        return p.type === "MARKET" ? { order: { avgPrice: "25", commission: "0" } } : undefined;
      };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [
      { cfg: "follow|sig-a-s@m5|p", sym: "S2-USDT", side: 1, entry: 24, stop: 23.5, vol: 1 },
    ];
    await step(rt, ex);
    assert.equal(stops.length, 1);
    // the stop sits below the fill by the planned distance (from 24 it would sit about 1 below this)
    assert.ok(stops[0] > 24 * 0.98 && stops[0] < 25, `stop ${stops[0]}`);
    const dist = 1 - stops[0] / 25;
    assert.ok(dist > 0.01 && dist < 0.05, `distance from the fill ${dist}`);
  });

  it("the backstop distance of a trailed lane is measured from the current price, not from the entry", () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    // long from 100, stop trailed to 118, price 120: 1.7 % to the stop (|entry − stop| said 18 %)
    rt.paper.positions = [
      { cfg: "follow|sig-a-s@m5|p", sym: "T-USDT", side: 1, entry: 100, stop: 118, vol: 1 },
    ];
    const [c] = laneContributions(rt as unknown as CoreRuntime, new Map([["T-USDT", 120]]));
    assert.ok(Math.abs(c.sl - 2 / 120) < 1e-9, `sl ${c.sl}`);
    assert.equal(c.risk, 0, "a stop in profit risks nothing");
    // short: stop 104 above price 100 → 4 %
    rt.paper.positions = [
      { cfg: "follow|sig-a-s@m5|p", sym: "T-USDT", side: -1, entry: 101, stop: 104, vol: 1 },
    ];
    const [d] = laneContributions(rt as unknown as CoreRuntime, new Map([["T-USDT", 100]]));
    assert.ok(Math.abs(d.sl - 0.04) < 1e-9, `sl ${d.sl}`);
    // no price: the entry distance stays the fallback
    const [e] = laneContributions(rt as unknown as CoreRuntime);
    assert.ok(Math.abs(e.sl - 3 / 101) < 1e-9);
  });

  it("a stop the exchange keeps refusing: one open, one protective close, then no buy-sell-repeat", async () => {
    const ex = new SimExchange(rng(2));
    const orig = ex.order.bind(ex);
    let opens = 0;
    ex.order = async (p) => {
      if (p.type === "STOP_MARKET") throw new Error("stop price precision");
      if (p.type === "MARKET" && (p.side === "BUY") === (p.positionSide === "LONG")) opens++;
      return orig(p);
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [{ cfg: "k", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 }];
    for (let i = 0; i < 20; i++) await step(rt, ex);
    assert.equal(opens, 1, `opened ${opens}×`);
    assert.equal(ex.positions.has("S2-USDT|LONG"), false, "closed again: never unprotected");
    const st = liveKv<{ actions: Array<{ msg?: string }> }>(rt.db, "controlStatus");
    assert.match(st?.actions[0]?.msg ?? "", /waiting after a failure/);
  });

  it("a refused open is marked error (not pending) and not re-sent every tick", async () => {
    const { ExchangeRejected } = await import("../exchange/bingx.server.ts");
    const ex = new SimExchange(rng(2));
    let sent = 0;
    ex.order = async () => {
      sent++;
      throw new ExchangeRejected("insufficient margin", 101204);
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [{ cfg: "k", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 }];
    for (let i = 0; i < 10; i++) await step(rt, ex);
    assert.equal(sent, 1);
    const rows = rt.db.all<{ status: string }>("SELECT status FROM live_orders");
    assert.deepEqual(
      rows.map((r) => r.status),
      ["error"],
    );
  });

  it("not ready only blocks opening: held positions are still closed, reduced and protected", async () => {
    const ex = new SimExchange(rng(4));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [
      { cfg: "a", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 },
      { cfg: "b", sym: "S3-USDT", side: 1, entry: 31, stop: 30, vol: 1 },
    ];
    await step(rt, ex);
    assert.ok(ex.positions.has("S2-USDT|LONG") && ex.positions.has("S3-USDT|LONG"));
    rt.sim = { stats: { pf: 0.8, n: 50 }, stable: true } as never;
    // S3's lane ended, S4 is new; S2's stop vanished
    rt.paper.positions = [
      { cfg: "a", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 },
      { cfg: "c", sym: "S4-USDT", side: 1, entry: 38, stop: 37, vol: 1 },
    ];
    await step(rt, ex);
    const st = await step(rt, ex);
    assert.match(st.reason, /opening blocked: not ready/);
    assert.equal(ex.positions.has("S3-USDT|LONG"), false, "ended lane closed while not ready");
    assert.equal(ex.positions.has("S4-USDT|LONG"), false, "nothing opens while not ready");
    assert.ok(ex.positions.has("S2-USDT|LONG"), "held lane kept");
  });

  it("unknown account equity or a missing price never closes a held position", async () => {
    const ex = new SimExchange(rng(6));
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [{ cfg: "a", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 }];
    await step(rt, ex);
    const held = ex.positions.get("S2-USDT|LONG");
    assert.ok(held);
    // no price for S2: kept as it is
    rt.freshTickers = async () => {
      rt.tickersAt = Date.now();
      return prices.filter((p) => p.sym !== "S2-USDT");
    };
    await step(rt, ex);
    assert.equal(ex.positions.get("S2-USDT|LONG"), held, "kept without a price");
    rt.freshTickers = async () => {
      rt.tickersAt = Date.now();
      return prices;
    };
    // equity-% sizing with the equity unknown: kept, nothing new opens
    rt.settings.sizing = { mode: "equityPct", pct: 0.02 } as never;
    const noEq = Object.assign(Object.create(Object.getPrototypeOf(ex)), ex, {
      equity: async () => null,
    });
    rt.paper.positions.push({ cfg: "b", sym: "S3-USDT", side: 1, entry: 31, stop: 30, vol: 3 });
    const st = await step(rt, noEq);
    assert.match(st.reason, /equity unknown/);
    assert.equal(ex.positions.get("S2-USDT|LONG"), held, "kept while the equity is unknown");
    assert.equal(ex.positions.has("S3-USDT|LONG"), false);
  });
});

describe("live sizing: fixed % of equity", () => {
  it("one lane unit = pct × the account equity; the paper balance when the exchange reports none", async () => {
    const { liveUnit } = await import("./live.server.ts");
    const mk = (fp: string, equity?: () => Promise<number | null>) =>
      ({
        hasKeys: () => true,
        fingerprint: () => fp,
        book: async () => ({ positions: [], orders: [] }),
        contracts: async () => new Map(),
        order: async () => ({}),
        cancel: async () => true,
        ...(equity ? { equity } : {}),
      }) as ExchangeClient;
    const rt = {
      settings: {
        ...DEFAULT_SETTINGS,
        paperBalance: 500,
        sizing: { mode: "equityPct" as const, pct: 0.04 },
        live: { ...DEFAULT_SETTINGS.live, notionalUsd: 7 },
      },
    } as unknown as CoreRuntime;
    assert.equal(
      await liveUnit(
        rt,
        mk("a", async () => 250),
      ),
      10,
    );
    assert.equal(
      await liveUnit(rt, mk("b")),
      20,
      "a client without an equity read (paper): 4 % of the paper balance",
    );
    assert.equal(
      await liveUnit(
        rt,
        mk("b2", async () => null),
      ),
      null,
      "a real account reporting no equity: unknown, never the paper balance",
    );
    assert.equal(
      await liveUnit(
        rt,
        mk("b3", async () => {
          throw new Error("down");
        }),
      ),
      null,
      "first read failed: unknown",
    );
    // a failed read keeps the last known equity (read at most every 30 s)
    let calls = 0;
    const flaky = mk("c", async () => {
      calls++;
      if (calls > 1) throw new Error("down");
      return 1000;
    });
    assert.equal(await liveUnit(rt, flaky), 40);
    assert.equal(await liveUnit(rt, flaky), 40);
    assert.equal(calls, 1, "cached within 30 s");
    // fixed sizing: the configured notional
    const fixed = {
      ...rt,
      settings: { ...rt.settings, sizing: { mode: "fixed" as const, pct: 0.04 } },
    };
    assert.equal(
      await liveUnit(
        fixed as CoreRuntime,
        mk("d", async () => 250),
      ),
      7,
    );
  });
});


describe("control orders: listed symbols, bans, offline", () => {
  beforeEach(() => resetLiveBackoff());

  it("an unlisted symbol is not opened and does not call the exchange", async () => {
    const ex = new SimExchange(rng(11));
    let orders = 0;
    const orig = ex.order.bind(ex);
    ex.order = async (p) => {
      orders++;
      return orig(p);
    };
    let margins = 0;
    ex.setMarginMode = async () => {
      margins++;
    };
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    rt.freshTickers = async () => {
      rt.tickersAt = Date.now();
      return [...prices, { sym: "ICP-USDT", last: 4 }];
    };
    rt.paper.positions = [{ cfg: "a", sym: "ICP-USDT", side: 1, entry: 4, stop: 3.8, vol: 1 }];
    const st = await step(rt, ex);
    assert.equal(orders, 0);
    assert.equal(margins, 0);
    assert.match(st.control?.actions[0]?.msg ?? "", /not listed/);
  });

  it("an offline symbol is asked once, then held without another margin call", async () => {
    const ex = new SimExchange(rng(12));
    const origC = ex.contracts.bind(ex);
    ex.contracts = async () => {
      const m = await origC();
      m.set("ICP-USDT", {
        symbol: "ICP-USDT",
        minQty: 0.1,
        step: 0.1,
        qtyPrec: 1,
        pxPrec: 4,
        minUsdt: 2,
      });
      return m;
    };
    let margins = 0;
    ex.setMarginMode = async (sym) => {
      margins++;
      throw new Error(`${sym} is offline currently`);
    };
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    rt.freshTickers = async () => {
      rt.tickersAt = Date.now();
      return [...prices, { sym: "ICP-USDT", last: 4 }];
    };
    rt.paper.positions = [{ cfg: "a", sym: "ICP-USDT", side: 1, entry: 4, stop: 3.8, vol: 1 }];
    await step(rt, ex);
    await step(rt, ex);
    assert.equal(margins, 1);
    assert.equal(ex.sent, 0);
  });

  it("open orders of an earlier read (rate limited): opening goes on, stop repairs and leftover cancels wait", async () => {
    const ex = new SimExchange(rng(17));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const stopOf = (o: { clientOrderId?: string }) => !!o.clientOrderId?.startsWith(`${liveTag("bingx-vst-02")}S`);
    rt.paper.positions = [{ cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16, vol: 1 }];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"));
    // from now on the open orders cannot be read: the last read still shows S1's stop, which is gone meanwhile,
    // and an own leftover sits on a flat symbol
    const stale = ex.orders.map((o) => ({ ...o }));
    ex.orders = ex.orders.filter((o) => !(o.venueSymbol === "S1-USDT" && stopOf(o)));
    ex.orders.push({ id: "left", venueSymbol: "S5-USDT", symbol: "S5-USDT", clientOrderId: `${liveTag("bingx-vst-02")}Sleft`, positionSide: "LONG", type: "STOP_MARKET" });
    const fresh = ex.book.bind(ex);
    ex.book = async () => ({ ...(await fresh()), orders: stale, ordersAt: Date.now() - 60_000 });
    rt.paper.positions.push({ cfg: "b", sym: "S2-USDT", side: 1, entry: 17, stop: 16, vol: 1 });
    await step(rt, ex);
    assert.ok(ex.positions.has("S2-USDT|LONG"), "opening goes on");
    assert.ok(ex.positions.has("S1-USDT|LONG"), "the held position stays ours");
    assert.ok(!ex.orders.some((o) => o.venueSymbol === "S1-USDT" && stopOf(o)), "no repair from an earlier read");
    assert.ok(ex.orders.some((o) => o.id === "left"), "no cancel from an earlier read");
    // the open orders are read again: the stop is repaired and the leftover cancelled
    ex.book = fresh;
    await step(rt, ex);
    assert.ok(ex.orders.some((o) => o.venueSymbol === "S1-USDT" && stopOf(o)));
    assert.ok(!ex.orders.some((o) => o.id === "left"));
  });

  it("a BingX ban pauses the control step before any book read", async () => {
    const ex = new SimExchange(rng(13));
    let books = 0;
    const orig = ex.book.bind(ex);
    ex.book = async () => {
      books++;
      return orig();
    };
    noteRateLimit(`unblocked after ${Date.now() + 120_000}`);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [{ cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16, vol: 1 }];
    const st = await step(rt, ex);
    assert.equal(books, 0);
    assert.match(st.reason, /rate limit/);
  });
});

describe("leverage: always the maximum, quantity at the exchange minimum", () => {
  beforeEach(() => resetLiveBackoff());
  const withLeverage = (ex: SimExchange, maxLong = 75, maxShort = 50) => {
    const calls: Array<[string, string, number]> = [];
    const lev = new Map<string, number>();
    ex.leverage = async (sym) => ({
      long: lev.get(`${sym}|LONG`) ?? lev.get(`${sym}|BOTH`) ?? 5,
      short: lev.get(`${sym}|SHORT`) ?? lev.get(`${sym}|BOTH`) ?? 5,
      maxLong,
      maxShort,
    });
    ex.setLeverage = async (sym, side, l) => {
      calls.push([sym, side, l]);
      lev.set(`${sym}|${side}`, l);
    };
    return calls;
  };

  it("sets each side of a symbol to its maximum once, before the first open, at the minimum quantity", async () => {
    const ex = new SimExchange(rng(31));
    const calls = withLeverage(ex);
    const sent: Array<Record<string, string | number>> = [];
    const orig = ex.order.bind(ex);
    ex.order = async (p) => {
      if (p.type === "MARKET") sent.push(p);
      return orig(p);
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    // minimum volume: 1 USDT is raised to the exchange minimum (2 USDT at 17 → 0.118 at step 0.001)
    rt.settings.live = { ...rt.settings.live, notionalUsd: 1 };
    rt.paper.positions = [{ cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16, vol: 1 }];
    await step(rt, ex);
    assert.deepEqual(calls, [
      ["S1-USDT", "LONG", 75],
      ["S1-USDT", "SHORT", 50],
    ]);
    assert.equal(sent.length, 1);
    assert.equal(Number(sent[0].quantity), 0.118);
    // cached: the next open on the same symbol does not set the leverage again
    rt.paper.positions.push({ cfg: "b", sym: "S1-USDT", side: -1, entry: 17, stop: 18, vol: 1 });
    await step(rt, ex);
    assert.equal(calls.length, 2);
    assert.ok(ex.positions.has("S1-USDT|SHORT"));
  });

  it("one-way mode sets BOTH; a fixed leverage is capped at the maximum", async () => {
    const ex = new SimExchange(rng(32));
    const calls = withLeverage(ex, 20, 25);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, positionMode: "oneway", leverage: 40 };
    rt.paper.positions = [{ cfg: "a", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 }];
    await step(rt, ex);
    assert.deepEqual(calls, [["S2-USDT", "BOTH", 20]]);
  });

  it("isolated margin caps the leverage so liquidation stays behind the widest protective stop", async () => {
    const ex = new SimExchange(rng(33));
    const calls = withLeverage(ex);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, marginMode: "isolated" };
    rt.paper.positions = [{ cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16, vol: 1 }];
    await step(rt, ex);
    assert.deepEqual(calls, [
      ["S1-USDT", "LONG", ISOLATED_MAX_LEVERAGE],
      ["S1-USDT", "SHORT", ISOLATED_MAX_LEVERAGE],
    ]);
    // 1 / leverage beyond the 20 % stop cap
    assert.ok(1 / ISOLATED_MAX_LEVERAGE > 0.2);
  });

  it("free-margin floor: below it (or unknown) nothing opens, held positions stay; above it opening resumes", async () => {
    const ex = new SimExchange(rng(35));
    withLeverage(ex);
    let free: number | null = 3;
    ex.account = async () => ({
      equity: 20,
      wallet: 20,
      unrealized: 0,
      realized: 0,
      usedMargin: 7,
      availableMargin: free,
    });
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, minFreeMargin: 5 };
    rt.paper.positions = [{ cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16, vol: 1 }];
    let st = await step(rt, ex);
    assert.equal(ex.positions.size, 0);
    assert.match(st.reason, /free margin 3\.00 USDT below the 5 USDT floor/);
    free = null;
    st = await step(rt, ex);
    assert.equal(ex.positions.size, 0);
    assert.match(st.reason, /free margin unknown/);
    free = 10;
    resetLiveBackoff();
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "opens once the free margin is back above the floor");
    // back below the floor: the held position is kept (closing / keeping never depends on the floor)
    free = 1;
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"));
    // and a lane that ended still closes
    rt.paper.positions = [];
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG") ?? 0, 0);
  });

  it("open paused (coordination): nothing opens or grows, held positions stay, ended lanes still close", async () => {
    const ex = new SimExchange(rng(36));
    withLeverage(ex);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [{ cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16, vol: 1 }];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"));
    rt.settings.live = { ...rt.settings.live, openPaused: "reference desk PF 0.80" };
    rt.paper.positions.push({ cfg: "b", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 });
    const st = await step(rt, ex);
    assert.match(st.reason, /opening paused: reference desk PF 0\.80/);
    assert.ok(!ex.positions.has("S2-USDT|LONG"));
    assert.ok(ex.positions.has("S1-USDT|LONG"), "held position kept");
    rt.paper.positions = [];
    await step(rt, ex);
    assert.equal(ex.positions.get("S1-USDT|LONG") ?? 0, 0, "an ended lane still closes while paused");
    rt.settings.live = { ...rt.settings.live, openPaused: false };
    rt.paper.positions = [{ cfg: "b", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 }];
    resetLiveBackoff();
    await step(rt, ex);
    assert.ok(ex.positions.has("S2-USDT|LONG"), "opens again once unpaused");
  });

  it("a refused leverage blocks opening, never closing; it is retried after the backoff only", async () => {
    const ex = new SimExchange(rng(33));
    let tries = 0;
    ex.leverage = async () => ({ long: 5, short: 5, maxLong: 75, maxShort: 75 });
    ex.setLeverage = async () => {
      tries++;
      throw new Error("leverage refused");
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [{ cfg: "a", sym: "S3-USDT", side: 1, entry: 31, stop: 30, vol: 1 }];
    await step(rt, ex);
    await step(rt, ex);
    assert.equal(tries, 1);
    assert.equal(ex.positions.size, 0, "nothing opened with the wrong leverage");
  });

  it("minimum-quantity sizing: one unit is the symbol's exchange minimum, a Block volume of 2 is two minimums", async () => {
    const ex = new SimExchange(rng(34));
    withLeverage(ex);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings = { ...rt.settings, sizing: { mode: "minQty" as never, pct: 0.02 } };
    rt.paper.positions = [
      { cfg: "a", sym: "S1-USDT", side: 1, entry: 17, stop: 16, vol: 1 },
      { cfg: "b", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 2 },
    ];
    await step(rt, ex);
    // S1 at 17: 2 USDT / 17 → 0.118; S2 at 24: 2 × (2 / 24 → 0.084) = 0.168
    assert.equal(ex.positions.get("S1-USDT|LONG"), 0.118);
    assert.equal(ex.positions.get("S2-USDT|LONG"), 0.168);
  });
});
