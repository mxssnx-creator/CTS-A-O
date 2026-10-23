import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { StratKind, Trade } from "../domain/types.ts";
import {
  configEval, defaultWalkForward, makeTape, signalConfigEval, validatedSetGen,
} from "./walkforward.ts";

const H = 3_600_000, NOW = Date.UTC(2026, 9, 17, 9);
const defaults = defaultWalkForward(DEFAULT_SETTINGS);
const options = {
  ...defaults, longH: 24, preH: 6, signalLongH: 336, preGate: false,
  signalOwnBase: true, validLastN: 0, signalValidLastN: 0, lastN: 0,
  rangeGate: undefined, rangeOpts: undefined, exitMinTrades: 3, exitMinPf: 1.5,
  exitMinGreenHourShare: 0, exitMaxDdr: 0,
  gates: { ...defaults.gates, minTrades: 3, minPf: 1.1, rangeMinPf: undefined,
    baseSetsMinPf: 1.5, maxDdtH: 1000, minDdtH: 0, maxDdr: 0, minGreen: 0,
    stableBlocks: 0, lossPrior: false, lastNFloor: 0 },
};
function rows(sym: string, side: 1 | -1, returns: number[], end = NOW - H): Trade[] {
  return returns.map((r, i) => ({ cfg: "fixture", sym, side,
    entryT: end - (returns.length - i) * 60_000 - 60_000,
    exitT: end - (returns.length - i) * 60_000, r, mult: 1,
    entry: 100, exit: 100 * (1 + side * r), reason: r > 0 ? "tp" : "sl",
    bars: 1, mfe: 0, mae: 0 }));
}
const positive = Array.from({ length: 30 }, (_, i) => i % 5 === 4 ? -0.01 : 0.01);
function tape(ind: string, trades: Trade[], kind: StratKind = "normal", tag?: string) {
  return makeTape(`follow|${ind}|${kind}`, "follow", ind,
    { tp: 0.02, sl: 0.02, trail: 0, hold: 60, tag }, kind, ["A", "B"], trades, [], []);
}
function validated(tp: ReturnType<typeof tape>, o = options) {
  const gen = validatedSetGen([tp], NOW, o);
  let r = gen.next();
  while (!r.done) r = gen.next();
  return r.value.has(tp.id);
}

describe("independent validation policy at every selection stage", () => {
  for (const tag of [undefined, "mc", "mn", "mp", "sh", "gn", "lg"])
    for (const tf of [1, 5, 15])
      for (const kind of ["normal", "trailing", "trailing-only", "exit", "dca", "dca-active", "axis"] as StratKind[]) {
    it(`${tag ?? "wide"}/${tf}m/${kind}: a losing opposite direction cannot veto an independently passing direction`, () => {
      const tp = tape(`rsi-mom-14-20@m${tf}`, [...rows("A", 1, positive), ...rows("A", -1, positive.map(() => -0.1))], kind, tag);
      const o = { ...options, toggles: { ...options.toggles, normal: true, trailing: true, exit: true, dca: true, axis: true, dcaActive: kind === "dca-active" } };
      assert.equal(configEval(tp, NOW, o).ok, true);
      assert.equal(validated(tp, o), true);
    });
  }
  it("a Signal keeps its independent 336h history when ordinary selection uses 24h", () => {
    const tp = tape("sig-ema-cross-s@m5", rows("A", 1, positive, NOW - 48 * H));
    assert.equal(configEval(tp, NOW, options).ok, true);
    assert.equal(validated(tp), true);
  });
  it("pooled thin Signal contexts cannot fabricate an independently proven context", () => {
    const tp = tape("sig-ema-cross-s@m5", [...rows("A", 1, [0.02, 0.02]), ...rows("B", 1, [0.02, 0.02])]);
    assert.equal(configEval(tp, NOW, options).ok, false);
    assert.equal(validated(tp), false);
  });
  for (const [field, strict] of [["exitMinPf", 5], ["exitMinTrades", 50], ["exitMaxDdr", 0.01]] as const) {
    it(`Signal Exit cache respects ${field} edits at the same market time`, () => {
      const tp = tape("sig-ema-cross-s@m5", rows("A", 1, positive), "exit");
      assert.equal(signalConfigEval(tp, NOW, options, "A", 1).ok, true);
      const changed = { ...options, [field]: strict };
      const fresh = tape(tp.ind, rows("A", 1, positive), "exit");
      const expected = signalConfigEval(fresh, NOW, changed, "A", 1);
      assert.equal(expected.ok, false);
      assert.deepEqual(signalConfigEval(tp, NOW, changed, "A", 1), expected);
      assert.equal(signalConfigEval(tp, NOW, options, "A", 1).ok, true);
    });
  }
});
