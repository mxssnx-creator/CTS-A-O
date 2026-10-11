// Signals: each TP x SL x trail config as its own unit (10 Oct, plan T5; arm A4). With signals.configUnits off, the unit is the
// pair (source x range) x symbol x side and every config of the pair shares one activation, averaged over the pair's
// configs (r x 100 / k, 1 / k). With it on, the unit is the config: its own activation and its own raw record.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeTape, signalIndexGen } from "./walkforward.ts";
import { sigActiveKey, sigUnitKey } from "../signals.ts";
import type { Trade } from "../domain/types.ts";

const SIG = "sig-ema-cross-s@m15";
const SYM = "AAA-USDT";
const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 6);

const cfgA = `follow|${SIG}|tp2|sl4|tr0|h32`;
const cfgB = `follow|${SIG}|tp3|sl6|tr0|h32`;

function trade(cfg: string, r: number, k: number): Trade {
  return {
    cfg,
    sym: SYM,
    side: 1,
    entryT: T0 + k * H,
    exitT: T0 + (k + 1) * H,
    entry: 100,
    exit: 100 * (1 + r),
    r,
    reason: "tp",
    bars: 1,
    mfe: 0,
    mae: 0,
  };
}

function tapes() {
  const a = makeTape(cfgA, "follow", SIG, { tp: 0.02, sl: 0.04, trail: 0, hold: 32 }, "normal", [SYM], [trade(cfgA, 0.01, 1), trade(cfgA, -0.02, 3)], [], []);
  const b = makeTape(cfgB, "follow", SIG, { tp: 0.03, sl: 0.06, trail: 0, hold: 32 }, "normal", [SYM], [trade(cfgB, 0.05, 2)], [], []);
  return [a, b];
}

function groupsOf(perConfig: boolean) {
  const it = signalIndexGen(tapes(), undefined, perConfig);
  let step = it.next();
  while (!step.done) step = it.next();
  return step.value;
}

describe("the unit key: the pair by default, the config with signals.configUnits (10 Oct, T5)", () => {
  const tp = { bot: "follow", ind: SIG, id: cfgA };
  it("the default unit is the pair's indication (the pre-gate key)", () => {
    assert.equal(sigUnitKey(tp, SYM, 1, false), sigActiveKey("follow", SIG, SYM, 1));
  });
  it("with configUnits the unit is the config id, so two configs of one pair are two units", () => {
    assert.equal(sigUnitKey(tp, SYM, 1, true), sigActiveKey("follow", cfgA, SYM, 1));
    assert.notEqual(sigUnitKey({ ...tp, id: cfgB }, SYM, 1, true), sigUnitKey(tp, SYM, 1, true));
  });
});

describe("the hourly index: pair units average over the pair's configs, config units keep their own record", () => {
  it("pair units: one group per symbol and side, each config's trade weighted 1 / k (k = 2 configs)", () => {
    const gs = groupsOf(false);
    assert.equal(gs.length, 1, "one pair unit for the symbol and side");
    const net = gs[0].net.reduce((x, y) => x + y, 0);
    // r x 100 / k: (1 + (-2) + 5) x 100 / 2 over the three trades, with k = 2
    assert.ok(Math.abs(net - ((0.01 - 0.02 + 0.05) * 100) / 2) < 1e-9, `pair net ${net}`);
  });
  it("config units: one group per config, each the raw sum of its own trades (no 1 / k)", () => {
    const gs = groupsOf(true);
    assert.equal(gs.length, 2, "one unit per config");
    const nets = gs.map((g) => g.net.reduce((x, y) => x + y, 0)).sort((x, y) => x - y);
    // config A: 0.01 - 0.02 = -0.01 (x 100 = -1); config B: 0.05 (x 100 = 5): each its own raw record
    assert.ok(Math.abs(nets[0] - -1) < 1e-9, `config A ${nets[0]}`);
    assert.ok(Math.abs(nets[1] - 5) < 1e-9, `config B ${nets[1]}`);
  });
  it("a losing config is not averaged into its winning sibling under configUnits", () => {
    const gs = groupsOf(true);
    const sibling = gs.find((g) => g.pair.endsWith(cfgB));
    assert.ok(sibling, "the winning config has its own unit");
    assert.ok(sibling!.net.reduce((x, y) => x + y, 0) > 0, "its record is its own, positive");
  });
});
