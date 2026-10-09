// Signals are range independent (D1): a signal decision must not change when a range setting changes. Signal
// confirmation judges the engine candidates open on the symbol; those candidates must come from range-neutral options
// (global minPf, no range coordination lists, no range gate, no range seats), so rangeMinPf, rangeCoord, rangeGate,
// excludeRanges, engineSideAccept and entryCrowd leave the signal trades of a run identical, in every selection mode.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";
import { SIGNAL_MIN_CLOSES } from "../signal-config.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYM = "AAA-USDT";
const ENG_IND = "rsi-14-30-70@m15";
const SIG_IND = "sig-ema-cross-s@m15";
const IN_RUN = NOW - 2 * H + 10 * 60_000;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const U = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

const trade = (cfg: string, entryT: number, r: number): Trade =>
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

/**
 * A Micro (mc) engine config: 300 hourly closes at PF 1.5 (60 % of +1 %, 40 % of −1 %) over the whole long window, and
 * one entry in the run.
 */
function microTape() {
  const id = `follow|${ENG_IND}|tp1|sl1|tr0|h32|mc`;
  const xs: Trade[] = [];
  for (let i = 0; i < 300; i++) xs.push(trade(id, NOW - 330 * H + i * H, i % 5 < 2 ? -0.01 : 0.01));
  xs.push(trade(id, IN_RUN - 5 * 60_000, 0.01));
  return makeTape(id, "follow", ENG_IND, { ...P, tag: "mc" }, "normal", [SYM], xs, [], []);
}

/**
 * A signal config with one entry in the run, on the same symbol and direction as the Micro candidate, and twelve winning
 * closes before the run: the set is judged on SIGNAL_MIN_CLOSES closes (9 Oct), so an unjudged set would not trade.
 */
function sigTape() {
  const id = `follow|${SIG_IND}|tp1|sl1|tr0|h32`;
  const judged = Array.from({ length: SIGNAL_MIN_CLOSES }, (_, i) => trade(id, NOW - 40 * H + i * H, 0.01));
  return makeTape(id, "follow", SIG_IND, P, "normal", [SYM], [...judged, trade(id, IN_RUN, 0.01)], [], []);
}

const base = (mode: WalkForwardOptions["mode"]): WalkForwardOptions => ({
  ...defaultWalkForward(DEFAULT_SETTINGS),
  mode,
  rangeCoord: undefined,
  toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  symGate: undefined,
  coord: { enabled: true, hourLock: 0, cooldown: "off", conflict: false, confirm: true },
  simH: 6,
  lastN: 0,
  validLastN: 0,
  robustFrac: 0,
  signalValidLastN: 0,
  signalGuardN: 0,
  signalCluster: undefined,
  signalAccept: undefined,
  signalSideAccept: undefined,
  signalActive: new Set([sigActiveKey("follow", SIG_IND, SYM, 1)]),
});

/** The same options with each range setting changed on its own, then all of them together. */
function rangeVariants(o: WalkForwardOptions): Array<[string, WalkForwardOptions]> {
  const rangeMinPf = { ...o.gates.rangeMinPf, micro: 3 };
  const levers = {
    gates: { ...o.gates, rangeMinPf },
    rangeCoord: { mc: { bots: ["snap" as const] } },
    rangeGate: { lastN: 50, minPf: 3 },
    excludeRanges: ["mc"],
    engineSideAccept: o.engineSideAccept ? { ...o.engineSideAccept, enabled: false } : undefined,
    entryCrowd: { mc: 1 },
  };
  return [
    ["rangeMinPf micro 3", { ...o, gates: levers.gates }],
    ["rangeCoord mc bots", { ...o, rangeCoord: levers.rangeCoord }],
    ["rangeGate 50 at PF 3", { ...o, rangeGate: levers.rangeGate }],
    ["excludeRanges mc", { ...o, excludeRanges: levers.excludeRanges }],
    ["engineSideAccept off", { ...o, engineSideAccept: levers.engineSideAccept }],
    ["entryCrowd mc 1", { ...o, entryCrowd: levers.entryCrowd }],
    [
      "all range settings",
      {
        ...o,
        gates: levers.gates,
        rangeCoord: levers.rangeCoord,
        rangeGate: levers.rangeGate,
        excludeRanges: levers.excludeRanges,
        engineSideAccept: levers.engineSideAccept,
        entryCrowd: levers.entryCrowd,
      },
    ],
  ];
}

/** The run's signal trades and its confirmation refusals (fresh tapes each run: the tapes are built in place). */
function run(o: WalkForwardOptions) {
  const r = walkForward(U, [microTape(), sigTape()], o);
  return {
    sig: r.trades
      .filter((x) => x.cfg.includes("|sig-"))
      .map((x) => [x.cfg, x.sym, x.side, x.entryT, x.r]),
    confirmRefusals: r.skips["sig:confirm"] ?? 0,
  };
}

for (const mode of ["fixed", "durable", "hourly"] as const) {
  describe(`signals are range independent (mode ${mode})`, () => {
    it("the reference run trades the signal, confirmed by the Micro candidate", () => {
      const ref = run(base(mode));
      assert.equal(ref.sig.length, 1, "one signal trade");
      assert.equal(ref.confirmRefusals, 0);
    });

    it("no range setting changes the signal trades or their confirmation", () => {
      const ref = run(base(mode));
      const differ: string[] = [];
      for (const [name, o] of rangeVariants(base(mode))) {
        const r = run(o);
        if (JSON.stringify(r) !== JSON.stringify(ref))
          differ.push(
            `${name}: ${r.sig.length} signal trade(s), ${r.confirmRefusals} confirmation refusal(s); reference ${ref.sig.length}, ${ref.confirmRefusals}`,
          );
      }
      assert.deepEqual(differ, [], "a range setting changed a signal decision");
    });
  });
}
