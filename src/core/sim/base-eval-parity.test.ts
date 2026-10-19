import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { configEval, defaultWalkForward, makeTape, selectFixed, type WalkForwardOptions } from "./walkforward.ts";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 17, 12);

describe("Strategy Base diagnostic and runtime parity", () => {
  it("applies the configured minimum DDT allowance to short validation windows", () => {
    const ind = "sig-ema-cross-s@m15";
    const id = `follow|${ind}|tp1|sl1|tr0|h32`;
    const close = (r: number, agoH: number): Trade => ({
      cfg: id,
      sym: "AAA-USDT",
      side: 1,
      entryT: NOW - (agoH + 0.1) * H,
      exitT: NOW - agoH * H,
      entry: 100,
      exit: 100 * (1 + r),
      r,
      mult: 1,
      reason: r > 0 ? "tp" : "sl",
      bars: 1,
      mfe: 0,
      mae: 0,
      kind: "normal",
    });
    const trades = [
      ...Array.from({ length: 12 }, (_, i) => close(0.02, 5.5 - i * 0.1)),
      close(-0.01, 4),
      close(0.005, 2),
      close(0.02, 1),
    ];
    const tp = makeTape(id, "follow", ind, { tp: 0.01, sl: 0.01, trail: 0, hold: 32 }, "normal", ["AAA-USDT"], trades, [], []);
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    const o: WalkForwardOptions = {
      ...defaults,
      longH: 6,
      preH: 6,
      preGate: false,
      validLastN: 0,
      signalValidLastN: 0,
      rangeGate: undefined,
      seatPer: "config",
      gates: {
        ...defaults.gates,
        minTrades: 3,
        minPf: 1.1,
        maxDdtH: 1,
        minDdtH: 4,
        maxDdr: 0,
        minGreen: 0,
        stableBlocks: 0,
        lossPrior: false,
      },
    };

    const picks = selectFixed([tp], NOW, o).picks;
    assert.deepEqual(picks.map((p) => p.id), [id], "runtime honors the explicit four-hour DDT minimum");
    const ev = configEval(tp, NOW, o);
    assert.equal(ev.ok, true, "diagnostics must apply the same DDT allowance as runtime selection");
    assert.ok(ev.ok && ev.ddt > 3 && ev.ddt < 4, "the test exercises a recovered drawdown longer than the scaled allowance");

    const strict = { ...o, gates: { ...o.gates, minDdtH: 0 } };
    const rejected = configEval(tp, NOW, strict);
    assert.equal(rejected.ok ? "ok" : rejected.fail, "ddt");
    assert.equal(selectFixed([tp], NOW, strict).picks.length, 0, "neither evaluator relaxes an absent DDT minimum");
  });
});
