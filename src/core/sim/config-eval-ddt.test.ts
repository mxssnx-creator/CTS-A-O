import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { configEval, ddtLimitH, defaultWalkForward, makeTape, selectFixed, winDd } from "./walkforward.ts";

const H = 3_600_000;
const NOW = 100 * H;
const ID = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
const PROTECT = { tp: .01, sl: .01, trail: 0, hold: 32 };
const trades: Trade[] = Array.from({ length: 12 }, (_, i) => {
  const exitT = (i ? 98 + i * .1 : 94.1) * H;
  return { cfg: ID, sym: "A-USDT", side: 1, entryT: exitT - 1_000, exitT,
    entry: 100, exit: 101, r: i ? .02 : -.01, reason: i ? "tp" : "sl", bars: 1, mfe: 0, mae: 0, kind: "normal" };
});
const tape = () => makeTape(ID, "follow", "rsi-mom-14-20@m15", PROTECT, "normal", ["A-USDT"], [...trades], [], []);
function options() {
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  return { ...base, preH: 6, longH: 6, preGate: false, validLastN: 0, lastN: 0,
    rangeGate: undefined, basePassed: undefined, normalBaseMinPf: 0, robustFrac: 0,
    gates: { ...base.gates, maxDdr: 0, minGreen: 0 },
    toggles: { ...base.toggles, normal: true, trailing: false, block: false, dca: false, axis: false } };
}

describe("config evaluation uses the selection drawdown-time limit", () => {
  it("reports the existing default minimum DDT floor on a short evaluated window", () => {
    const tp = tape(), o = options();
    assert.ok(winDd(tp, 0, tp.n, NOW).ddtH > 4);
    assert.equal(ddtLimitH(o, tp, NOW, 6), DEFAULT_SETTINGS.gates.minDdtH);
    assert.equal(configEval(tp, NOW, o).ok, true);
    for (const recordValidation of [false, true])
      assert.deepEqual(selectFixed([tp], NOW, { ...o, recordValidation }).picks.map((p) => p.id), [ID]);
  });

  it("uses actual tape history while retaining the same configured minimum floor", () => {
    const tp = { ...tape(), fromT: NOW - 5 * H }, o = options();
    assert.equal(ddtLimitH(o, tp, NOW, 6), 18);
    assert.equal(configEval(tp, NOW, o).ok, true);
    assert.deepEqual(selectFixed([tp], NOW, o).picks.map((p) => p.id), [ID]);
  });

  it("keeps stricter custom DDT settings rejecting in reporting and execution selection", () => {
    for (const minDdtH of [0, 1]) {
      const tp = tape(), base = options(), o = { ...base, gates: { ...base.gates, minDdtH } };
      const ev = configEval(tp, NOW, o);
      assert.equal(ev.ok, false);
      assert.equal(!ev.ok && ev.fail, "ddt");
      for (const recordValidation of [false, true])
        assert.deepEqual(selectFixed([tp], NOW, { ...o, recordValidation }).picks, []);
    }
  });
});
