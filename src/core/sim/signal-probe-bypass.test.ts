// The demo probe measures engine range cells: it must never let a signal past its own gates (8 Oct). Before this rule the
// probe skipped the signal's direction acceptance, its seat validation and its last-N check, so a signal the gates refused
// traded whenever a probe was on.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, execDecision, makeTape, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYM = "AAA-USDT";
const SIG = "sig-ema-cross-s@m15";
const ENG = "rsi-mom-14-20@m15";
const cfg = `follow|${SIG}|tp1|sl1|tr0|h32`;
const engCfg = `follow|${ENG}|tp1|sl1|tr0|h32|mc`;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const IN_RUN = NOW - 2 * H + 10 * 60_000;

const trade = (c: string, entryT: number, r: number): Trade =>
  ({
    cfg: c,
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

const sigTape = makeTape(cfg, "follow", SIG, P, "normal", [SYM], [trade(cfg, IN_RUN, 0.01)], [], []);
const engTape = makeTape(engCfg, "follow", ENG, { ...P, tag: "mc" }, "normal", [SYM], [trade(engCfg, IN_RUN, 0.01)], [], []);

const opts: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  signalActive: new Set([sigActiveKey("follow", SIG, SYM, 1)]),
  signalSideAccept: { enabled: true, minPf: 1.3, hours: 24, minTrades: 20 },
};

// a guard whose direction acceptance refuses every candidate (the signal's gate says no)
const refuseAll = { accepts: () => false, lastN: () => true, cluster: () => false } as never;
const ctx = { sym: SYM, side: 1, guard: refuseAll };

describe("the demo probe never bypasses a signal's gates", () => {
  it("a refused signal stays refused with the probe on (perCell and perRange)", () => {
    const without = execDecision(sigTape, IN_RUN, opts, ctx);
    assert.equal(without.ok, false, "the gate refuses the signal without a probe");
    const probed = execDecision(sigTape, IN_RUN, { ...opts, probe: { perRange: 1, perCell: 1 } }, ctx);
    assert.equal(probed.ok, false, "the probe does not let the refused signal trade");
    assert.equal(probed.why, without.why, "the same reason with and without the probe");
  });

  it("the probe still bypasses the engine range gate it measures", () => {
    // an engine mc tape: the probe skips the gates for range tapes, as before (the rule above is for signals only)
    const probedEng = execDecision(engTape, IN_RUN, { ...opts, probe: { perRange: 1, perCell: 0 }, signalSideAccept: undefined }, { sym: SYM, side: 1, guard: refuseAll });
    assert.equal(probedEng.ok, true, "a probed engine range tape still trades");
  });
});
