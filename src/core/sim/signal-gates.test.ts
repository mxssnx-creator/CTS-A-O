// Signal gates in the walk-forward run: the per-step active ranking holds only pairs that may open, and the
// acceptance groups judge on the record the run can see.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeSignalsAt,
  configEval,
  defaultWalkForward,
  execDecision,
  makeTape,
  selectFixed,
  walkForward,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { signalSettings } from "../signal-config.ts";
import { acceptKey, SignalAcceptIndex, sigActiveKey } from "../signals.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYM = "AAA-USDT";
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const trade = (cfg: string, r: number, entryT: number, side: 1 | -1 = 1): Trade =>
  ({
    cfg,
    sym: SYM,
    side,
    entryT,
    exitT: entryT + 30 * 60_000,
    entry: 100,
    exit: 100 * (1 + r),
    r,
    reason: r > 0 ? "tp" : "sl",
    bars: 2,
    mfe: 0,
    mae: 0,
    kind: "normal",
  }) as Trade;
const tape = (ind: string, trades: (cfg: string) => Trade[]) => {
  const id = `follow|${ind}|tp1|sl1|tr0|h32`;
  return makeTape(id, "follow", ind, P, "normal", [SYM], trades(id), [], []);
};
/** the run: the last 6 hours before NOW; every gate but the one under test off */
const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: {
    normal: true,
    trailing: true,
    block: false,
    blockActive: false,
    dca: false,
    dcaActive: false,
    axis: false,
  },
  symGate: undefined,
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 6,
  lastN: 0,
  validLastN: 0,
  signalValidLastN: 0,
  signalGuardN: 0,
  signalCluster: undefined,
  signalAccept: undefined,
};
const u = {
  bars: [],
  caches: [],
  startT: T0,
  endT: NOW,
  splitT: T0,
  nowT: NOW,
  baseTf: 60,
} as never;
const IN_RUN = NOW - 2 * H + 10 * 60_000;

describe("signals: the active ranking", () => {
  it("a pair held only for its open positions never takes an active slot from a pair that may open", () => {
    // pair A (held, no longer passing Base) has the better record; pair B passed Base
    const a = tape("sig-ema-cross-s@m15", (id) => [
      ...Array.from({ length: 30 }, (_, i) => trade(id, 0.03, NOW - 40 * H + i * H)),
      trade(id, 0.01, IN_RUN),
    ]);
    const b = tape("sig-sar-s@m15", (id) => [
      ...Array.from({ length: 30 }, (_, i) => trade(id, 0.01, NOW - 40 * H + i * H)),
      trade(id, 0.01, IN_RUN),
    ]);
    const o: WalkForwardOptions = {
      ...base,
      // one active slot
      signalRank: { ...signalSettings({ enabled: true }), validate: false, count: 1 },
      signalBasePassed: new Set([`follow|${b.ind}`]),
    };
    const r = walkForward(u, [a, b], o);
    assert.deepEqual(
      r.trades.map((x) => x.cfg),
      [b.id],
      "B trades its in-run entry; A opens nothing new",
    );
    assert.deepEqual(r.signalActiveEnd, [sigActiveKey("follow", b.ind, SYM, 1, "normal", b.id)]);
    assert.equal(r.skips["sig:signalBase"] ?? 0, 0);
    // A's entry outside the step's active set is counted (the signal funnel, per side), never dropped silently
    assert.equal(r.signalFunnel?.inactive, 1);
  });

  it("keeps Signal Exit active outside the Signals Normal/Trailing cap and bypasses Signal entry Base", () => {
    const ind = "sig-ema-cross-s@m15";
    const id = `exit|${ind}|tp1|sl1|tr0|h32`;
    const exit = makeTape(id, "exit", ind, P, "exit", [SYM], [], [], []);
    const key = sigActiveKey("exit", ind, SYM, 1, "exit", id);
    const o: WalkForwardOptions = {
      ...base,
      toggles: { ...base.toggles, exit: true },
      signalActive: new Set([key]),
      signalBasePassed: new Set(),
      exitBasePassed: new Set([`exit|${ind}`]),
      rangeOpts: { sig: { validLastN: 0, lastN: 0 } },
    };
    assert.deepEqual(
      [...activeSignalsAt([exit], NOW, signalSettings({ enabled: true, count: 1 }), 100, o)],
      [key],
      "the exact independently qualified Signal Exit context survives the dynamic Normal/Trailing ranking",
    );
    const decision = execDecision(exit, IN_RUN, o, { sym: SYM, side: 1 });
    assert.ok(
      decision.ok || decision.why !== "signalBase",
      "Signal Exit has its own Exit Base proof and does not need Normal/Trailing Signal Base admission",
    );
  });
});

describe("signals: Strategy Base validation window", () => {
  it("preserves runtime tie order across the pooled Signals last-N boundary", () => {
    const ind = "sig-ema-cross-s@m15";
    const id = `follow|${ind}|tp1|sl1|tr0|h32`;
    const tiedAt = NOW - H;
    const oldWinners = Array.from({ length: 40 }, (_, i) => trade(id, 0.01, NOW - 80 * H + i * H));
    // Runtime's stable tape order puts this losing short first in the tied group. Re-sorting ties by side
    // moves it to the end and incorrectly inserts it into the 25-close validation sample.
    const tied = [trade(id, -0.3, tiedAt, -1), ...Array.from({ length: 25 }, () => trade(id, 0.01, tiedAt, 1))];
    const tp = makeTape(id, "follow", ind, P, "normal", [SYM], [...oldWinners, ...tied], [], []);
    assert.deepEqual(Array.from(tp.side.slice(-26)), [-1, ...Array(25).fill(1)]);
    assert.ok(Array.from(tp.r.slice(-25)).every((r) => r > 0), "last-N excludes the earlier tied loss");

    const o: WalkForwardOptions = {
      ...base,
      longH: 100,
      preH: 20,
      validLastN: 15,
      signalValidLastN: 25,
      preGate: false,
      gates: {
        ...DEFAULT_SETTINGS.gates,
        minTrades: 12,
        maxDdtH: 1_000,
        minDdtH: 0,
        maxDdr: 0,
        minGreen: 0,
        stableBlocks: 0,
      },
    };
    assert.equal(configEval(tp, NOW, o).ok, true);
    assert.equal(selectFixed([tp], NOW, o).picks.length, 1);
  });

  it("uses signalValidLastN in both diagnostics and actual Base selection", () => {
    const ind = "sig-ema-cross-s@m15";
    const id = `follow|${ind}|tp1|sl1|tr0|h32`;
    // The whole record is profitable and the last 15 closes win, but the 10 losses immediately before
    // those wins make the Signals-specific last 25 fail. An engine last-15 setting must not override it.
    const history = [
      ...Array.from({ length: 35 }, (_, i) => trade(id, 0.03, NOW - 60 * H + i * H)),
      ...Array.from({ length: 10 }, (_, i) => trade(id, -0.02, NOW - 25 * H + i * H)),
      ...Array.from({ length: 15 }, (_, i) => trade(id, 0.01, NOW - 15 * H + i * H)),
    ];
    const tp = makeTape(id, "follow", ind, P, "normal", [SYM], history, [], []);
    const o = {
      ...base,
      longH: 100,
      preH: 20,
      validLastN: 15,
      signalValidLastN: 25,
      preGate: false,
      rangeGate: undefined,
      gates: {
        ...DEFAULT_SETTINGS.gates,
        minTrades: 12,
        maxDdtH: 1_000,
        minDdtH: 0,
        maxDdr: 0,
        minGreen: 0,
        stableBlocks: 0,
      },
    };

    const evaluation = configEval(tp, NOW, o);
    assert.equal(evaluation.ok, false);
    assert.equal(!evaluation.ok && evaluation.fail, "lastN");
    assert.equal(selectFixed([tp], NOW, o).picks.length, 0);

    // Engine configs continue to use the engine last-N setting with the same tape history.
    const engine = makeTape(id.replace(ind, "rsi-mom-14-20@m15"), "follow", "rsi-mom-14-20@m15", P, "normal", [SYM], history.map((x) => ({ ...x, cfg: id.replace(ind, "rsi-mom-14-20@m15") })), [], []);
    assert.equal(configEval(engine, NOW, o).ok, true);
    assert.equal(selectFixed([engine], NOW, o).picks.length, 1);
  });

  it("uses only the Signals range's own validation and entry last-N values", () => {
    const ind = "sig-ema-cross-s@m15";
    const id = `follow|${ind}|tp1|sl1|tr0|h32`;
    const history = [
      ...Array.from({ length: 80 }, (_, i) => trade(id, 0.03, NOW - 160 * H + i * H)),
      ...Array.from({ length: 30 }, (_, i) => trade(id, -0.02, NOW - 80 * H + i * H)),
      ...Array.from({ length: 20 }, (_, i) => trade(id, 0.03, NOW - 50 * H + i * H)),
      trade(id, 0.03, IN_RUN),
    ];
    const tp = makeTape(id, "follow", ind, P, "normal", [SYM], history, [], []);
    const gates = {
      ...DEFAULT_SETTINGS.gates,
      minTrades: 12,
      maxDdtH: 1_000,
      minDdtH: 0,
      maxDdr: 0,
      minGreen: 0,
      stableBlocks: 0,
      lastNFloor: 0,
    };
    const o = {
      ...base,
      longH: 200,
      validLastN: 50,
      lastN: 50,
      signalValidLastN: 15,
      preGate: false,
      rangeOpts: { sig: { validLastN: 15, lastN: 15 } },
      gates,
      signalActive: new Set([sigActiveKey("follow", ind, SYM, 1, "normal", id)]),
    };
    assert.equal(configEval(tp, NOW, o).ok, true, "the Signals range overrides both engine and legacy signal validation windows");
    assert.equal(walkForward(u, [tp], o).trades.length, 1, "its own entry window is used too");
    assert.equal(
      configEval(tp, NOW, { ...o, rangeOpts: { sig: { validLastN: 50, lastN: 15 } } }).ok,
      false,
      "a changed Signals window invalidates the cached exact-context evaluation",
    );
    const strictDecision = execDecision(
      tp,
      IN_RUN,
      { ...o, rangeOpts: { sig: { validLastN: 15, lastN: 50 } } },
      { sym: SYM, side: 1 },
    );
    assert.equal(
      strictDecision.ok ? undefined : strictDecision.why,
      "lastN",
      "the Signals range's stricter entry last-N still blocks the order",
    );
    const excludedDecision = execDecision(tp, IN_RUN, { ...o, excludeRanges: ["sig"] }, { sym: SYM, side: 1 });
    assert.equal(
      excludedDecision.ok ? undefined : excludedDecision.why,
      "rangeOff",
      "the dedicated Signals range can be excluded without affecting other ranges",
    );
  });
});

describe("signals: acceptance on the source's record", () => {
  const accept = { enabled: true, minPf: 1.05, hours: 48, minTrades: 6 };
  // the m15 lane of the source active on the symbol (the ranking is not under test)
  const o = (): WalkForwardOptions => ({
    ...base,
    signalActive: new Set([sigActiveKey("follow", "sig-ema-cross-s@m15", SYM, 1, "normal", "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32")]),
    signalAccept: accept,
    gates: { ...base.gates, minTrades: 3, maxDdtH: 1000, maxDdr: 0, minGreen: 0, stableBlocks: 0 },
  });

  it("counts the group's closes from before the run (regression: the first hours of every run accepted nothing)", () => {
    // ten winners closed in the 48 h before the run, then an entry inside it
    const won = tape("sig-ema-cross-s@m15", (id) => [
      ...Array.from({ length: 10 }, (_, i) => trade(id, 0.01, NOW - 30 * H + i * H)),
      trade(id, 0.01, IN_RUN),
    ]);
    const r = walkForward(u, [won], o());
    assert.deepEqual(
      r.trades.map((x) => x.cfg),
      [won.id],
    );
    assert.equal(r.skips["sig:signalPf"] ?? 0, 0);
    // a source that lost on this symbol and side before the run is not accepted
    const lost = tape("sig-ema-cross-s@m15", (id) => [
      ...Array.from({ length: 10 }, (_, i) => trade(id, -0.01, NOW - 30 * H + i * H)),
      trade(id, 0.01, IN_RUN),
    ]);
    const r2 = walkForward(u, [lost], o());
    assert.equal(r2.trades.length, 0);
    assert.equal(r2.skips["sig:signalPf"], 1);
  });

  it("keeps lanes and parameter ranges independent; closes after the entry never count", () => {
    // the m30 medium lane of the same source won before the run; only the m15 short lane enters in the run
    const other = tape("sig-ema-cross-m@m30", (id) =>
      Array.from({ length: 10 }, (_, i) => trade(id, 0.01, NOW - 30 * H + i * H)),
    );
    const lane = tape("sig-ema-cross-s@m15", (id) => [...Array.from({ length: 10 }, (_, i) => trade(id, 0.01, NOW - 30 * H + i * H)), trade(id, 0.01, IN_RUN)]);
    assert.deepEqual(
      walkForward(u, [other, lane], o()).trades.map((x) => x.cfg),
      [lane.id],
    );
    // Losses of another lane and parameter range never refuse this independent set.
    const early = tape("sig-ema-cross-m@m30", (id) =>
      Array.from({ length: 10 }, (_, i) => trade(id, -0.01, NOW - 30 * H + i * H)),
    );
    const e = walkForward(u, [early, lane], o());
    assert.equal(e.trades.filter((x) => x.cfg === lane.id).length, 1);
    assert.equal(e.skips["sig:signalPf"] ?? 0, 0);
    // ...the same losers closing only after the entry are never seen: no sample to judge in the window or in twice
    // the window, so the group counts as valid (operator, 6 Oct) and the lane trades
    const late = tape("sig-ema-cross-m@m30", (id) =>
      Array.from({ length: 10 }, (_, i) => trade(id, -0.01, IN_RUN + 10 * 60_000 + i * 60_000)),
    );
    const r = walkForward(u, [late, lane], o());
    assert.equal(r.trades.filter((x) => x.cfg === lane.id).length, 1);
    assert.equal(r.skips["sig:signalPf"] ?? 0, 0);
  });

  it("the record by group: count and PF of the closes in (t − hours, t]", () => {
    const tp = tape("sig-ema-cross-s@m15", (id) => [
      trade(id, 0.02, NOW - 50 * H),
      trade(id, 0.02, NOW - 10 * H),
      trade(id, -0.01, NOW - 5 * H),
      trade(id, 0.03, NOW - 5 * H, -1),
    ]);
    const idx = new SignalAcceptIndex([tp]);
    const key = acceptKey(tp.ind, SYM, 1, "normal", tp.id);
    // exits 30 min after entry: at NOW the −50 h close is outside 48 h; the short is a group of its own
    assert.deepEqual(idx.stats(key, NOW, 48), { n: 2, pf: 2 });
    // at −5 h: the −50 h and −10 h winners (the −5 h loser closes after it)
    assert.deepEqual(idx.stats(key, NOW - 5 * H, 48), { n: 2, pf: Infinity });
    assert.deepEqual(idx.stats(key, NOW - 5 * H, 24), { n: 1, pf: Infinity });
    assert.deepEqual(idx.stats(acceptKey(tp.ind, SYM, -1, "normal", tp.id), NOW, 48), {
      n: 1,
      pf: Infinity,
    });
    assert.deepEqual(idx.stats("none", NOW, 48), { n: 0, pf: 0 });
  });
});

describe("signal defaults (the validated settings, PR #65)", () => {
  it("judge signals on their own exits, on the 15m lane, with acceptance and their own Block level", async () => {
    const { DEFAULT_SIGNALS } = await import("../signal-config.ts");
    const { DEFAULT_BLOCK, DEFAULT_SETTINGS } = await import("../config.ts");
    const { defaultWalkForward } = await import("./walkforward.ts");
    assert.equal(DEFAULT_SIGNALS.baseGate, false);
    assert.deepEqual(DEFAULT_SIGNALS.lanes, [15]);
    assert.deepEqual(DEFAULT_SIGNALS.strategies, { dca: false, axis: false });
    assert.deepEqual(DEFAULT_SIGNALS.accept, { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 });
    assert.equal(DEFAULT_BLOCK.signalsOwn, true);
    // their own last 25 since 6 Oct (PF 3.85 vs 3.62 off, max drawdown −57 %, on the same tapes)
    assert.equal(defaultWalkForward(DEFAULT_SETTINGS).signalValidLastN, 25);
  });
});
