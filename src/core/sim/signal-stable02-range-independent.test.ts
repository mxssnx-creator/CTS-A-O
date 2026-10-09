// Signals are range independent with Stable-02 on (I3): a signal decision must not change when a range setting changes.
// Stable-02 holds a signal back (its symbol × direction last-N window) and sizes it (its relation volume) from the closed
// candidates' results. Those results must come from range-neutral picks (the confirmation pool, never executed, as D1
// did for the confirmation), so rangeMinPf, rangeCoord, rangeGate, excludeRanges, engineSideAccept and entryCrowd leave
// the signal trades of a run identical, with s2Windows and with s2RelVolume on, in every selection mode.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYM = "AAA-USDT";
const ENG_IND = "rsi-14-30-70@m15";
const SIG_IND = "sig-ema-cross-s@m15";
const IN_RUN = NOW - 2 * H + 10 * 60_000;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const U = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

// the Micro candidate's closes before the run, 20 minutes apart from 12 h before the run (each closes 20 minutes after
// its entry): blocks of six. A good block is five wins of +1 % and a loss of −2 % (window PF 2.5, never judged losing);
// the losing block is five losses and a win (window PF 0.1, judged losing at its sixth close: Stable-02 pauses)
const EXTRA_START = NOW - 12 * H;
const EXTRA_STEP = 20 * 60_000;
const GOOD = [0.01, 0.01, 0.01, 0.01, 0.01, -0.02];
const LOSING = [-0.02, -0.02, -0.02, -0.02, -0.02, 0.01];
/** 4 good blocks and a losing one: the symbol × direction window pauses the signal's side before the run */
const PAUSE_TAIL = [...GOOD, ...GOOD, ...GOOD, ...GOOD, ...LOSING];
/** 5 good blocks: no pause, every relation of the Micro candidate wins (Stable-02 adds relation volume) */
const ALL_GOOD = [...GOOD, ...GOOD, ...GOOD, ...GOOD, ...GOOD];

const trade = (cfg: string, entryT: number, r: number, hold = 30): Trade =>
  ({
    cfg,
    sym: SYM,
    side: 1,
    entryT,
    exitT: entryT + hold * 60_000,
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
 * A Micro (mc) engine config: 300 hourly closes at PF 1.5 before the warm-up (its record), the `extra` closes, and one
 * entry five minutes before the signal, still open at the signal's entry (the signal's engine confirmation).
 */
function microTape(extra: number[]) {
  const id = `follow|${ENG_IND}|tp1|sl1|tr0|h32|mc`;
  const xs: Trade[] = [];
  for (let i = 0; i < 300; i++) xs.push(trade(id, NOW - 330 * H + i * H, i % 5 < 2 ? -0.01 : 0.01));
  extra.forEach((r, i) => xs.push(trade(id, EXTRA_START + i * EXTRA_STEP, r, 20)));
  xs.push(trade(id, IN_RUN - 5 * 60_000, 0.01));
  return makeTape(id, "follow", ENG_IND, { ...P, tag: "mc" }, "normal", [SYM], xs, [], []);
}

/** A signal config with one entry in the run, on the same symbol and direction as the Micro candidate. */
function sigTape() {
  const id = `follow|${SIG_IND}|tp1|sl1|tr0|h32`;
  return makeTape(id, "follow", SIG_IND, P, "normal", [SYM], [trade(id, IN_RUN, 0.01)], [], []);
}

const base = (mode: WalkForwardOptions["mode"], stable: { s2Windows?: boolean; s2RelVolume?: boolean }): WalkForwardOptions => ({
  ...defaultWalkForward(DEFAULT_SETTINGS),
  mode,
  rangeCoord: undefined,
  toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  symGate: undefined,
  coord: { enabled: true, hourLock: 0, cooldown: "off", conflict: false, confirm: true, ...stable },
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

/**
 * The run's signal trades (with their sizes) and its signal refusals by reason. Fresh tapes each run: the tapes are
 * built in place.
 */
function run(o: WalkForwardOptions, extra: number[]) {
  const r = walkForward(U, [microTape(extra), sigTape()], o);
  return {
    sig: r.trades.filter((x) => x.cfg.includes("|sig-")).map((x) => [x.cfg, x.sym, x.side, x.entryT, x.r]),
    refusals: Object.fromEntries(Object.entries(r.skips).filter(([k]) => k.startsWith("sig:"))),
  };
}

/** the variants whose signal decision (trades, sizes, refusals) differs from the reference */
function differing(o: WalkForwardOptions, extra: number[], ref: ReturnType<typeof run>): string[] {
  const out: string[] = [];
  for (const [name, v] of rangeVariants(o)) {
    const r = run(v, extra);
    if (JSON.stringify(r) !== JSON.stringify(ref))
      out.push(`${name}: ${JSON.stringify(r)}; reference ${JSON.stringify(ref)}`);
  }
  return out;
}

for (const mode of ["fixed", "durable", "hourly"] as const) {
  describe(`signals are range independent with Stable-02 (mode ${mode})`, () => {
    it("the reference run holds the signal back on Stable-02's window (the path is exercised)", () => {
      const ref = run(base(mode, { s2Windows: true }), PAUSE_TAIL);
      assert.equal(ref.sig.length, 0, "the signal is held back");
      assert.equal(ref.refusals["sig:s2Window"], 1, `held by Stable-02 once (refusals ${JSON.stringify(ref.refusals)})`);
    });

    it("no range setting changes a signal held back by Stable-02's windows", () => {
      const o = base(mode, { s2Windows: true });
      const ref = run(o, PAUSE_TAIL);
      assert.deepEqual(differing(o, PAUSE_TAIL, ref), [], "a range setting changed a signal decision");
    });

    it("the reference run sizes the signal by Stable-02's relation volume (the path is exercised)", () => {
      const ref = run(base(mode, { s2RelVolume: true }), ALL_GOOD);
      assert.equal(ref.sig.length, 1, "the signal trades");
      assert.ok((ref.sig[0][4] as number) > 0.01, `the signal is sized up (r ${ref.sig[0][4]})`);
    });

    it("no range setting changes the Stable-02 volume of a signal", () => {
      const o = base(mode, { s2RelVolume: true });
      const ref = run(o, ALL_GOOD);
      assert.deepEqual(differing(o, ALL_GOOD, ref), [], "a range setting changed a signal's size");
    });
  });
}
