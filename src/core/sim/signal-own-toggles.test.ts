// A signal's own base (its Normal and its Trailing) is the signal's own switch, not the engine's toggles (8 Oct). The
// Normal already was (signalOwnBase); its Trailing still read toggles.trailing, so an engine trailing switch could stop
// signal trailing orders while the signal set itself was on. Failing test first.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, execDecision, makeTape, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { sigActiveKey } from "../signals.ts";

const SIG = "sig-ema-cross-s@m15";
const SYM = "AAA-USDT";
const trailCfg = `follow|${SIG}|tp1|sl1|tr0.5|h32`;
const normalCfg = `follow|${SIG}|tp1|sl1|tr0|h32`;
const tapeOf = (id: string, kind: "normal" | "trailing") =>
  makeTape(id, "follow", SIG, { tp: 0.01, sl: 0.01, trail: kind === "trailing" ? 0.005 : 0, hold: 32 }, kind, [SYM], [], [], []);

const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  signalOwnBase: true,
  signalActive: new Set([sigActiveKey("follow", SIG, SYM, 1)]),
};
const ctx = { sym: SYM, side: 1 };

describe("a signal's own base is the signal's switch", () => {
  it("signal trailing trades with the engine trailing toggle off", () => {
    const o: WalkForwardOptions = {
      ...base,
      toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
    };
    const d = execDecision(tapeOf(trailCfg, "trailing"), 1000, o, ctx);
    // the tape has no closes, so the signal may still be refused by its own validation: the engine toggle must not be the reason
    assert.notEqual(d.why, "toggle", "the engine trailing toggle does not decide a signal trailing order");
  });

  it("signal normal trades with the engine normal toggle off (already its own, unchanged)", () => {
    const o: WalkForwardOptions = {
      ...base,
      toggles: { normal: false, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
    };
    const d = execDecision(tapeOf(normalCfg, "normal"), 1000, o, ctx);
    assert.notEqual(d.why, "toggle", "the engine normal toggle does not decide a signal normal order");
    assert.notEqual(d.why, "normalOff", "nor does the engine Normal-off rule");
  });

  it("without the signal's own base, the engine toggles still decide (the engine path is unchanged)", () => {
    const o: WalkForwardOptions = {
      ...base,
      signalOwnBase: false,
      toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
    };
    const d = execDecision(tapeOf(trailCfg, "trailing"), 1000, o, ctx);
    assert.equal(d.ok, false);
    assert.equal(d.why, "toggle");
  });
});
