// The live record: lanes attributed the exchange's own prices; the gates and the adjuster read it before the
// simulation once it holds enough closes.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attributeLanes, laneIdOf, liveRecords, preferExchange, type LaneOpen } from "./live-record.ts";
import { liveGate, liveGroupGates } from "./live-validation.ts";
import { adjustTrades, evaluateAdjust } from "./adjust.ts";
import { DEFAULT_ADJUST } from "./config.ts";

const K = "S1-USDT|1";
const lane = (cfg: string, t: number) => ({ id: `${cfg}|S1-USDT|${t}`, cfg, sym: "S1-USDT", side: 1 as const });
const step = (open: Record<string, LaneOpen>, o: Partial<Parameters<typeof attributeLanes>[1]>) =>
  attributeLanes(open, {
    lanes: [],
    heldAfter: new Set(),
    grew: new Map(),
    shrank: new Map(),
    external: new Map(),
    prices: new Map([["S1-USDT", 100]]),
    cost: 0,
    now: 1_000,
    ...o,
  });

describe("live record: lanes at the exchange's prices", () => {
  it("joins at the fill that grew the position, leaves at the fill that shrank it", () => {
    const a = lane("b|ema|a", 1);
    const b = lane("b|ema|b", 2);
    // a opens the position: filled at 101 (the market said 100)
    let r = step({}, { lanes: [a], heldAfter: new Set([K]), grew: new Map([[K, 101]]) });
    assert.equal(r.open[a.id].px, 101);
    // b joins with an increase filled at 103; a stays at its own entry
    r = step(r.open, { lanes: [a, b], heldAfter: new Set([K]), grew: new Map([[K, 103]]), now: 2_000 });
    assert.equal(r.open[a.id].px, 101);
    assert.equal(r.open[b.id].px, 103);
    assert.equal(r.closed.length, 0);
    // a leaves: the reduce filled at 99 → a lost 2 / 101 less the cost
    r = attributeLanes(r.open, {
      lanes: [b],
      heldAfter: new Set([K]),
      grew: new Map(),
      shrank: new Map([[K, 99]]),
      external: new Map(),
      prices: new Map([["S1-USDT", 100]]),
      cost: 0.001,
      now: 3_000,
    });
    assert.equal(r.closed.length, 1);
    assert.equal(r.closed[0].cfg, "b|ema|a");
    assert.ok(Math.abs(r.closed[0].r - (-2 / 101 - 0.001)) < 1e-12);
    assert.equal(r.closed[0].reason, "exit");
    assert.deepEqual(Object.keys(r.open), [b.id]);
  });

  it("a stop-out closes every lane of the key at the stop price; Block legs are one lane", () => {
    const a = lane("b|ema|a", 1);
    const leg = { ...a, id: `${a.id}|blk:overall` };
    assert.equal(laneIdOf(leg.id), a.id);
    let r = step({}, { lanes: [a, leg], heldAfter: new Set([K]) });
    assert.equal(Object.keys(r.open).length, 1, "the leg folds into its lane");
    assert.equal(r.open[a.id].px, 100, "no fill reply: the market price");
    // the exchange stop fired at 97: the lane is still in the paper book, but it is closed on the exchange
    r = step(r.open, { lanes: [a, leg], heldAfter: new Set(), external: new Map([[K, 97]]), now: 5_000 });
    assert.equal(r.closed.length, 1);
    assert.equal(r.closed[0].reason, "stop");
    assert.ok(Math.abs(r.closed[0].r - -0.03) < 1e-12);
    assert.deepEqual(r.open, {});
  });

  it("a lane whose key the exchange does not hold never enters the record", () => {
    const r = step({}, { lanes: [lane("b|ema|a", 1)], heldAfter: new Set() });
    assert.deepEqual(r.open, {});
    assert.equal(r.closed.length, 0);
  });
});

describe("live record judges before the simulation", () => {
  // the simulation says this config earns; the exchange says it loses
  const sim = liveRecords([1, 2, 3, 4].map((i) => ({ cfg: "b|ema|a", exitT: i * 10, r: 0.01 }))).get("b|ema|a")!;
  const exch = liveRecords([1, 2, 3, 4].map((i) => ({ cfg: "b|ema|a", exitT: i * 10, r: i === 1 ? 0.01 : -0.01 }))).get(
    "b|ema|a",
  )!;

  it("a config with N exchange closes is judged on them, with fewer on the simulation", () => {
    const simG = liveGate(sim, 0, 100, 4, 1.1);
    const g = preferExchange(liveGate(exch, 0, 100, 4, 1.1), simG);
    assert.equal(g.source, "exchange");
    assert.equal(g.ok, false, "the exchange's losses pause it although the simulation earns");
    const short = preferExchange(liveGate(exch, 0, 100, 5, 1.1), liveGate(sim, 0, 100, 4, 1.1));
    assert.equal(short.source, "sim");
    assert.equal(short.ok, true);
  });

  it("groups pool the exchange closes of every config the desk traded", () => {
    const g = liveGroupGates([exch], 0, 100, 3, 1.1);
    assert.equal(g.size, 1);
    assert.equal([...g.values()][0].ok, false);
  });

  it("the adjuster reads a set's exchange window once it is full, never mixed with paper closes", () => {
    const paper = Array.from({ length: 30 }, (_, i) => ({ cfg: "b|ema|tr0|x", r: 0.01, exitT: i }));
    const exchange = Array.from({ length: 30 }, (_, i) => ({ cfg: "b|ema|tr0|y", r: -0.01, exitT: 100 + i }));
    const w = DEFAULT_ADJUST.window;
    const mixed = adjustTrades(paper, exchange.slice(0, w - 1), w);
    assert.ok(mixed.every((t) => !t.net), "a short exchange record: the paper book decides");
    const full = adjustTrades(paper, exchange, w);
    assert.ok(full.every((t) => t.net), "a full exchange window replaces the paper closes of its set");
    const { state } = evaluateAdjust({}, full, { ...DEFAULT_ADJUST, enabled: true }, { minSl: 0.01, minTrail: 0.01 }, 0.5);
    const s = Object.values(state)[0];
    assert.equal(s.n, w);
    assert.ok(s.level >= 1, "the exchange losses widen the set");
    // exchange returns are net of their real costs: a cost excess is not charged on top
    const winners = exchange.map((t) => ({ ...t, r: 0.002 }));
    const st2 = evaluateAdjust({}, adjustTrades([], winners, w), { ...DEFAULT_ADJUST, enabled: true }, { minSl: 0.01, minTrail: 0.01 }, 0.5);
    assert.equal(Object.values(st2.state)[0].level, 0);
  });
});
