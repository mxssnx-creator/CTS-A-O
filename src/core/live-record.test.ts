// The live record: lanes attributed the exchange's own prices; the gates and the adjuster read it before the
// simulation once it holds enough closes.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attributeLanes, executionRecordKey, laneIdOf, laneKeyOf, liveRecords, ownedPaperExecutionRecords, postBaseExecutionRecords, preferExchange, type LaneOpen } from "./live-record.ts";
import { liveGate, liveGroupGates, promotionGate } from "./live-validation.ts";
import { adjustTrades, evaluateAdjust } from "./adjust.ts";
import { DEFAULT_ADJUST } from "./config.ts";
import type { UnitReturnLike } from "./metrics/stats.ts";

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

describe("post-Base modeled unit provenance", () => {
  const cfg = "follow|rsi-mom-14-25@m15|tp2.6|sl3.9|tr0|h32";
  const key = executionRecordKey(cfg, "S1-USDT", 1);
  const trade = (
    r: number,
    i: number,
    provenance: Pick<UnitReturnLike, "mult" | "unitR"> = {},
  ) => ({
    cfg,
    sym: "S1-USDT",
    side: 1 as const,
    entryT: i * 10,
    exitT: 100 + i,
    entry: 100,
    exit: 101,
    r,
    kind: "normal" as const,
    reason: "time" as const,
    bars: 1,
    mfe: 0,
    mae: 0,
    ...provenance,
  });
  const execution = ownedPaperExecutionRecords(
    [0, 1, 2, 3, 4, 5].map((i) => ({
      cfg,
      sym: "S1-USDT",
      side: 1,
      exitT: 100 + i,
      unitR: 0.01,
      ownedNotionalUsd: 100,
    })),
  ).get(key)!;

  it("cannot promote a legacy modeled sample with missing multipliers despite valid owned execution", () => {
    const model = postBaseExecutionRecords([trade(0.02, 0), trade(0.02, 1), trade(-0.01, 2)]).get(
      key,
    )!;
    const gate = promotionGate(model, execution, 0, 500, 3, 1.1);
    assert.equal(gate.ok, false);
    assert.equal(gate.state, "unknown");
    assert.equal(gate.model?.n, 3);
    assert.equal(gate.model?.pf, null);
    assert.equal(gate.model?.unknown, 3);
  });

  it("keeps a new unknown loss in the current window instead of backfilling older wins", () => {
    const rows = [0, 1, 2, 3, 4].map((i) => trade(0.02, i, { mult: 1 }));
    rows.push(trade(-1, 5));
    const model = postBaseExecutionRecords(rows).get(key)!;
    const gate = promotionGate(model, execution, 0, 500, 3, 1.1);
    assert.equal(model.exitT.length, 6);
    assert.equal(gate.ok, false);
    assert.equal(gate.model?.unknown, 1);
    assert.equal(gate.model?.n, 3);
    assert.equal(gate.model?.fromT, 103);
    assert.equal(gate.model?.toT, 105);
  });

  it("accepts known unit returns and explicit unit multipliers on the exact same close sample", () => {
    for (const provenance of [{ mult: 1 }, { unitR: 0.02 }]) {
      const rows = [
        trade(0.02, 0, provenance),
        trade(0.02, 1, provenance),
        trade(-0.01, 2, "unitR" in provenance ? { unitR: -0.01 } : provenance),
      ];
      const model = postBaseExecutionRecords(rows).get(key)!;
      const gate = promotionGate(model, execution, 0, 500, 3, 1.1);
      assert.equal(gate.ok, true);
      assert.equal(gate.model?.unknown, 0);
      assert.equal(gate.model?.pf, 4);
      assert.equal(gate.model?.noLoss, false);
    }
  });
});

describe("live record: lanes at the exchange's prices", () => {
  it("joins at the fill that grew the position, leaves at the fill that shrank it", () => {
    const a = lane("b|ema|a", 1);
    const b = lane("b|ema|b", 2);
    // a opens the position: filled at 101 (the market said 100)
    let r = step({}, { lanes: [a], heldAfter: new Set([K]), grew: new Map([[K, 101]]) });
    assert.equal(r.open[laneKeyOf(a)].px, 101);
    // b joins with an increase filled at 103; a stays at its own entry
    r = step(r.open, { lanes: [a, b], heldAfter: new Set([K]), grew: new Map([[K, 103]]), now: 2_000 });
    assert.equal(r.open[laneKeyOf(a)].px, 101);
    assert.equal(r.open[laneKeyOf(b)].px, 103);
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
    assert.deepEqual(Object.keys(r.open), [laneKeyOf(b)]);
  });

  it("a stop-out closes every lane of the key at the stop price; Block legs are one lane", () => {
    const a = lane("b|ema|a", 1);
    const leg = { ...a, id: `${a.id}|blk:overall` };
    assert.equal(laneIdOf(leg.id), a.id);
    let r = step({}, { lanes: [a, leg], heldAfter: new Set([K]) });
    assert.equal(Object.keys(r.open).length, 1, "the leg folds into its lane");
    assert.equal(r.open[laneKeyOf(a)].px, 100, "no fill reply: the market price");
    // the exchange stop fired at 97: the lane is still in the paper book, but it is closed on the exchange
    r = step(r.open, { lanes: [a, leg], heldAfter: new Set(), external: new Map([[K, 97]]), now: 5_000 });
    assert.equal(r.closed.length, 1);
    assert.equal(r.closed[0].reason, "stop");
    assert.ok(Math.abs(r.closed[0].r - -0.03) < 1e-12);
    assert.deepEqual(r.open, {});
  });

  it("long and short of one config entering on the same bar are two lanes (the paper position's direction is part of it)", () => {
    const long = lane("b|ema|a", 1);
    const short = { ...long, side: -1 as const };
    assert.notEqual(laneKeyOf(long), laneKeyOf(short));
    const r = step({}, { lanes: [long, short], heldAfter: new Set([K, "S1-USDT|-1"]) });
    assert.equal(Object.keys(r.open).length, 2);
    assert.equal(laneKeyOf(long), `b|ema|a|S1-USDT|1|1`);
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

describe("acceptance groups on the exchange record", async () => {
  const { exchangeAcceptIndex } = await import("./live-record.ts");
  const { EngineSideIndex, SignalGuard, acceptKey, engineSideKey, sideAcceptKey } = await import("./signals.ts");
  const H = 3_600_000;
  const o = { enabled: true, minPf: 1.05, hours: 24, minTrades: 3 };
  // engine Short-range trailing longs: three exchange closes, all losses
  const cfg = "b|ema|tr1|sh";
  const rows = [1, 2, 3].map((i) => ({ cfg, sym: "S1-USDT", side: 1, exitT: 10 * H + i * 60_000, r: -0.01 }));
  const ex = exchangeAcceptIndex(rows);
  const key = engineSideKey("trailing", "sh", 1);

  it("keys an engine close by type family × range × side, causally", () => {
    assert.equal(ex.stats(key, 11 * H, 24).n, 3);
    assert.equal(ex.stats(key, 10 * H + 2 * 60_000, 24).n, 1, "only the closes before t");
    assert.equal(ex.stats(engineSideKey("trailing", "sh", -1), 11 * H, 24).n, 0);
  });

  it("engine direction acceptance: the exchange's losses refuse the group the simulation accepts", () => {
    const idx = new EngineSideIndex(); // no simulated record: the simulation alone accepts (too few candidates)
    assert.equal(idx.accepts(key, 11 * H, o), true);
    assert.equal(idx.accepts(key, 11 * H, o, ex), false);
    // fewer exchange closes than minTrades in the window: the simulation decides again
    assert.equal(idx.accepts(key, 10 * H + 2 * 60_000, o, ex), true);
    // the shared index itself holds no exchange record: a simulation on the same tapes never reads live closes
    assert.equal(idx.accepts(key, 11 * H, o), true);
  });

  it("one sample per entry: the lane closes of one entry are one trade (r summed, exits at the last close)", () => {
    // one entry split into three lane closes, then a second entry with one close
    const split = [
      { cfg, sym: "S2-USDT", side: 1, exitT: 10 * H + 1 * 60_000, r: -0.01, entryT: 9 * H },
      { cfg, sym: "S2-USDT", side: 1, exitT: 10 * H + 2 * 60_000, r: -0.01, entryT: 9 * H },
      { cfg, sym: "S2-USDT", side: 1, exitT: 10 * H + 3 * 60_000, r: 0.005, entryT: 9 * H },
      { cfg, sym: "S3-USDT", side: 1, exitT: 10 * H + 4 * 60_000, r: 0.01, entryT: 9 * H },
    ];
    const per = exchangeAcceptIndex(split);
    assert.equal(per.stats(key, 11 * H, 24).n, 2, "two entries, not four closes");
    // the first entry is judged on its summed return: -0.015 (a loss), the second +0.01 (a win)
    assert.ok(Math.abs(per.stats(key, 11 * H, 24).pf - 0.01 / 0.015) < 1e-9);
    // the entry is not counted before its last close
    assert.equal(per.stats(key, 10 * H + 2 * 60_000, 24).n, 0);
  });

  it("Signal exchange acceptance keeps exact protection configs independent", () => {
    const ind = "sig-rsi-s@m15";
    const won = `follow|${ind}|tp1|sl1|tr0|h32`;
    const lost = `follow|${ind}|tp2|sl1|tr0|h32`;
    const index = exchangeAcceptIndex([won, lost].flatMap((cfg) => rows.map((x) => ({
      ...x, cfg, r: cfg === won ? 0.03 : -0.01,
    }))));
    assert.deepEqual(index.stats(acceptKey(ind, "S1-USDT", 1, "normal", won), 11 * H, 24), { n: 3, pf: Infinity });
    assert.deepEqual(index.stats(acceptKey(ind, "S1-USDT", 1, "normal", lost), 11 * H, 24), { n: 3, pf: 0 });
    assert.deepEqual(index.stats(acceptKey(ind, "S1-USDT", 1, "normal"), 11 * H, 24), { n: 0, pf: 0 });
  });

  it("signal side acceptance reads the exchange's signal closes", () => {
    const sig = "b|sig-rsi-x|tr1";
    const g = new SignalGuard();
    g.exchange = exchangeAcceptIndex(rows.map((x) => ({ ...x, cfg: sig })));
    assert.equal(g.accepts(sideAcceptKey(1), 11 * H, o), false);
    assert.equal(g.accepts(sideAcceptKey(-1), 11 * H, o), true);
  });
});
