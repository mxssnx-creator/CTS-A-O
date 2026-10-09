// The signal PF gate (9 Oct, operator): a signal set trades only when it is validated on its own closes — at least
// SIGNAL_MIN_CLOSES (12, the window is extended to reach them) with PF above 1. A set with fewer closes is unjudged: it stays
// internal and does not trade. No setting lowers the signal floors (min PF 1, last-N and validation samples 12).
// Failing tests first: before this change a thin sample passed (acceptOnWindow, validOk, the last-N check), validation off
// (signalValidLastN 0) passed everything, and a min PF below 1 admitted a set with PF < 1.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { activeSignals, sigActiveKey, SignalGuard } from "../signals.ts";
import { signalSettings } from "../signal-config.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYM = "AAA-USDT";
const SIG = "sig-ema-cross-s@m15";
const cfg = `follow|${SIG}|tp1|sl1|tr0|h32`;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const RUN = NOW - 2 * H + 10 * 60_000;
const U = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

const trade = (entryT: number, r: number): Trade =>
  ({
    cfg,
    sym: SYM,
    side: 1,
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

/** `n` closes before the run's window: `wins` of them +w, the rest −l. */
function history(n: number, wins: number, w = 0.01, l = 0.01): Trade[] {
  const out: Trade[] = [];
  for (let i = 0; i < n; i++) out.push(trade(NOW - 40 * H + i * H, i < wins ? w : -l));
  return out;
}

/** the tape: its history and one order in the run */
const tapeOf = (hist: Trade[]) => makeTape(cfg, "follow", SIG, P, "normal", [SYM], [...hist, trade(RUN, 0.01)], [], []);

const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  rangeCoord: undefined,
  symGate: undefined,
  coord: { enabled: true, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 6,
  signalGuardN: 0,
  signalCluster: undefined,
  signalAccept: undefined,
  signalSideAccept: undefined,
  signalDomination: "off",
  signalActive: new Set([sigActiveKey("follow", SIG, SYM, 1)]),
  seatPer: "config",
};

/** the run's executed orders of the tape */
const inRun = (o: WalkForwardOptions, hist: Trade[]) =>
  walkForward(U, [tapeOf(hist)], o).trades.filter((t) => t.entryT >= RUN - 1).length;

describe("the signal PF gate: a set trades only when judged on 12 closes", () => {
  it("a set with fewer than 12 closes does not trade (unjudged, internal)", () => {
    const o: WalkForwardOptions = { ...base, signalValidLastN: 25, lastN: 15 };
    assert.equal(inRun(o, history(5, 5)), 0, "five winning closes are not a judgement");
  });

  it("validation off (signalValidLastN 0) means 12, not no check", () => {
    const o: WalkForwardOptions = { ...base, signalValidLastN: 0, lastN: 0 };
    assert.equal(inRun(o, history(5, 5)), 0, "a thin sample is refused with validation at zero");
  });

  it("a min PF below 1 cannot admit a set with PF < 1 on its 12 closes", () => {
    // six wins of 0.9 % and six losses of 1 %: gross profit 0.054, gross loss 0.06, PF 0.9
    const hist = history(12, 6, 0.009, 0.01);
    const o: WalkForwardOptions = {
      ...base,
      signalValidLastN: 12,
      lastN: 12,
      lastNMinPf: 0,
      gates: { ...base.gates, minPf: 0.5 },
    };
    assert.equal(inRun(o, hist), 0, "PF 0.9 is refused whatever the setting says");
  });

  it("a set with 12 closes and PF above 1 still trades (the gate is not a wall)", () => {
    const hist = history(12, 9, 0.01, 0.01);
    const o: WalkForwardOptions = { ...base, signalValidLastN: 12, lastN: 12 };
    assert.equal(inRun(o, hist), 1, "nine wins of 1 % against three losses of 1 % trades");
  });
});

describe("the signal rank by net", () => {
  it("never activates a unit whose net is negative", () => {
    const side = { n: 12, net: -0.2, pf: 0.8, dd: 0.5, okShare: 0.6, recentN: 4, recentNet: 0.01 };
    const runs = [{ bot: "follow", ind: SIG, bySym: { [SYM]: { n: 12, net: -0.2, pf: 0.8, sides: { "1": side } } } }];
    const set = activeSignals(runs, signalSettings({ rank: "net", count: 0 }));
    assert.equal(set.has(sigActiveKey("follow", SIG, SYM, 1)), false, "a losing unit is not active under rank net");
  });
});

describe("the signal acceptance floors: a group is judged on 12 closes at PF above 1, whatever its settings", () => {
  const H = 3_600_000;
  // twelve closes, six of +0.9 % and six of −1 %: PF 0.9 (gross profit 0.054, gross loss 0.06)
  const losing = () => {
    const g = new SignalGuard();
    for (let i = 0; i < 12; i++) g.addAccept("grp", i < 6 ? 0.009 : -0.01, (i + 1) * H);
    return g;
  };
  it("a group with PF below 1 is refused even when its minimum PF is set below 1", () => {
    const g = losing();
    assert.equal(g.accepts("grp", 13 * H, { enabled: true, minPf: 0.5, hours: 48, minTrades: 1 }), false);
  });
  it("a group with fewer than 12 closes is refused whatever its minimum of trades says", () => {
    const g = new SignalGuard();
    for (let i = 0; i < 11; i++) g.addAccept("grp", 0.02, (i + 1) * H);
    assert.equal(g.accepts("grp", 12 * H, { enabled: true, minPf: 1.1, hours: 48, minTrades: 1 }), false);
  });
  it("a group with twelve winning closes is accepted (the floor is not a wall)", () => {
    const g = new SignalGuard();
    for (let i = 0; i < 12; i++) g.addAccept("grp", 0.02, (i + 1) * H);
    assert.equal(g.accepts("grp", 13 * H, { enabled: true, minPf: 1.1, hours: 48, minTrades: 1 }), true);
  });
});
