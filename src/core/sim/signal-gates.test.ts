// Signal gates in the walk-forward run: the per-step active ranking holds only pairs that may open, and the
// acceptance groups judge on the record the run can see.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWalkForward,
  makeTape,
  walkForward,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { signalSettings } from "../signal-config.ts";
import { acceptKey, SignalAcceptIndex } from "../signals.ts";

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
    assert.deepEqual(r.signalActiveEnd, [`follow|${b.ind}|${SYM}`]);
    assert.equal(r.skips.signalBase ?? 0, 0);
    // A's entry outside the step's active set is a skip with its reason (it was dropped silently: a run whose signal
    // candidates all fell outside the active set reported no signal skip at all)
    assert.equal(r.skips.signalInactive, 1);
    // and per range: a signal candidate counts under "sig"
    assert.deepEqual(r.skipsByRange?.sig, { signalInactive: 1 });
  });
});

describe("signals: acceptance on the source's record", () => {
  const accept = { enabled: true, minPf: 1.05, hours: 48, minTrades: 6 };
  // the m15 lane of the source active on the symbol (the ranking is not under test)
  const o = (): WalkForwardOptions => ({
    ...base,
    signalActive: new Set([`follow|sig-ema-cross-s@m15|${SYM}`]),
    signalAccept: accept,
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
    assert.equal(r.skips.signalPf ?? 0, 0);
    // a source that lost on this symbol and side before the run is not accepted
    const lost = tape("sig-ema-cross-s@m15", (id) => [
      ...Array.from({ length: 10 }, (_, i) => trade(id, -0.01, NOW - 30 * H + i * H)),
      trade(id, 0.01, IN_RUN),
    ]);
    const r2 = walkForward(u, [lost], o());
    assert.equal(r2.trades.length, 0);
    assert.equal(r2.skips.signalPf, 1);
  });

  it("pools every lane and range of the source, active or not; closes after the entry never count", () => {
    // the m30 medium lane of the same source won before the run; only the m15 short lane enters in the run
    const other = tape("sig-ema-cross-m@m30", (id) =>
      Array.from({ length: 10 }, (_, i) => trade(id, 0.01, NOW - 30 * H + i * H)),
    );
    const lane = tape("sig-ema-cross-s@m15", (id) => [trade(id, 0.01, IN_RUN)]);
    assert.deepEqual(
      walkForward(u, [other, lane], o()).trades.map((x) => x.cfg),
      [lane.id],
    );
    // causality, shown with losers: ten losing closes before the entry refuse the lane...
    const early = tape("sig-ema-cross-m@m30", (id) =>
      Array.from({ length: 10 }, (_, i) => trade(id, -0.01, NOW - 30 * H + i * H)),
    );
    const e = walkForward(u, [early, lane], o());
    assert.equal(e.trades.filter((x) => x.cfg === lane.id).length, 0);
    assert.equal(e.skips.signalPf, 1);
    // ...the same losers closing only after the entry are never seen: no sample to judge in the window or in twice
    // the window, so the group counts as valid (operator, 6 Oct) and the lane trades
    const late = tape("sig-ema-cross-m@m30", (id) =>
      Array.from({ length: 10 }, (_, i) => trade(id, -0.01, IN_RUN + 10 * 60_000 + i * 60_000)),
    );
    const r = walkForward(u, [late, lane], o());
    assert.equal(r.trades.filter((x) => x.cfg === lane.id).length, 1);
    assert.equal(r.skips.signalPf ?? 0, 0);
  });

  it("the record by group: count and PF of the closes in (t − hours, t]", () => {
    const tp = tape("sig-ema-cross-s@m15", (id) => [
      trade(id, 0.02, NOW - 50 * H),
      trade(id, 0.02, NOW - 10 * H),
      trade(id, -0.01, NOW - 5 * H),
      trade(id, 0.03, NOW - 5 * H, -1),
    ]);
    const idx = new SignalAcceptIndex([tp]);
    const key = acceptKey(tp.ind, SYM, 1, "normal");
    // exits 30 min after entry: at NOW the −50 h close is outside 48 h; the short is a group of its own
    assert.deepEqual(idx.stats(key, NOW, 48), { n: 2, pf: 2 });
    // at −5 h: the −50 h and −10 h winners (the −5 h loser closes after it)
    assert.deepEqual(idx.stats(key, NOW - 5 * H, 48), { n: 2, pf: Infinity });
    assert.deepEqual(idx.stats(key, NOW - 5 * H, 24), { n: 1, pf: Infinity });
    assert.deepEqual(idx.stats(acceptKey(tp.ind, SYM, -1, "normal"), NOW, 48), {
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
