// Signals: the market side rule refuses a signal's side against the market's median move (10 Oct). Failing test first:
// the rule and its refusal reason did not exist; a signal into a rising market was never refused for the market.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, execDecision, makeTape, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { sigActiveKey } from "../signals.ts";

const SIG = "sig-ema-cross-s@m15";
const SYM = "AAA-USDT";
const normalCfg = `follow|${SIG}|tp1|sl1|tr0|h32`;
const tape = makeTape(normalCfg, "follow", SIG, { tp: 0.01, sl: 0.01, trail: 0, hold: 32 }, "normal", [SYM], [], [], []);
const market = (m: number) => ({ at: () => m });

function opts(side: 1 | -1, on: boolean): WalkForwardOptions {
  return {
    ...defaultWalkForward(DEFAULT_SETTINGS),
    signalOwnBase: true,
    signalActive: new Set([sigActiveKey("follow", SIG, SYM, side)]),
    ...(on ? { signalMarketSide: { hours: 6 } } : {}),
  };
}

describe("the market side rule", () => {
  it("refuses a long while the market's median move is up", () => {
    const d = execDecision(tape, 1000, opts(1, true), { sym: SYM, side: 1, market: market(0.01) });
    assert.equal(d.ok ? "" : d.why, "signalMarket");
  });

  it("refuses a short while the market's median move is down", () => {
    const d = execDecision(tape, 1000, opts(-1, true), { sym: SYM, side: -1, market: market(-0.01) });
    assert.equal(d.ok ? "" : d.why, "signalMarket");
  });

  it("lets a long into a falling market past the market rule (the next checks may still refuse it)", () => {
    const d = execDecision(tape, 1000, opts(1, true), { sym: SYM, side: 1, market: market(-0.01) });
    assert.notEqual(d.ok ? "" : d.why, "signalMarket");
  });

  it("lets a short into a rising market past the market rule", () => {
    const d = execDecision(tape, 1000, opts(-1, true), { sym: SYM, side: -1, market: market(0.01) });
    assert.notEqual(d.ok ? "" : d.why, "signalMarket");
  });

  it("refuses both sides while the market is not known (NaN)", () => {
    const dl = execDecision(tape, 1000, opts(1, true), { sym: SYM, side: 1, market: market(Number.NaN) });
    const ds = execDecision(tape, 1000, opts(-1, true), { sym: SYM, side: -1, market: market(Number.NaN) });
    assert.equal(dl.ok ? "" : dl.why, "signalMarket");
    assert.equal(ds.ok ? "" : ds.why, "signalMarket");
  });

  it("fails closed when a run has the rule on but no market in its context", () => {
    const d = execDecision(tape, 1000, opts(1, true), { sym: SYM, side: 1 });
    assert.equal(d.ok ? "" : d.why, "signalMarket");
  });

  it("does nothing while the rule is off (the default): a long into a rising market is not refused for the market", () => {
    const d = execDecision(tape, 1000, opts(1, false), { sym: SYM, side: 1, market: market(0.01) });
    assert.notEqual(d.ok ? "" : d.why, "signalMarket");
  });
});
