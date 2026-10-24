import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { RangeTag, StratKind, Trade } from "../domain/types.ts";
import {
  configEval, defaultWalkForward, execDecision, makeTape, signalConfigEval, validatedSetGen,
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
function tape(ind: string, trades: Trade[], kind: StratKind = "normal", tag?: RangeTag) {
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
  for (const tag of [undefined, "mc", "mn", "mp", "sh", "gn", "lg"] as const)
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
  for (const kind of ["normal", "trailing", "trailing-only", "exit"] as const) {
    it(`${kind}: Last-4 processes an own four-close sample without borrowing another context`, () => {
      const own = { ...options, signalLongH: 100, signalValidLastN: 4, exitMinTrades: 4 };
      const tp = tape("sig-ema-cross-s@m1", [...rows("A", 1, Array<number>(4).fill(0.025)),
        ...rows("B", -1, Array<number>(10).fill(0.1))], kind);
      assert.equal(signalConfigEval(tp, NOW, own, "A", 1).ok, true);
      assert.equal(signalConfigEval(tp, NOW, { ...own, signalValidLastN: 8 }, "A", 1).ok, false);
      const thin = tape(tp.ind, [...rows("A", 1, Array<number>(3).fill(0.025)),
        ...rows("B", -1, Array<number>(10).fill(0.1))], kind);
      assert.equal(signalConfigEval(thin, NOW, own, "A", 1).ok, false);
    });
    it(`${kind}: requested Last-8 judges exactly eight settled results`, () => {
      const history = [...Array<number>(30).fill(0.1), ...Array<number>(4).fill(-0.1), ...Array<number>(8).fill(0.025)];
      const tp = tape("sig-ema-cross-s@m1", rows("A", 1, history), kind);
      const own = { ...options, signalLongH: 100, signalValidLastN: 8, exitMinTrades: 8 };
      assert.equal(signalConfigEval(tp, NOW, own, "A", 1).ok, true);
      assert.equal(signalConfigEval(tp, NOW, { ...own, signalValidLastN: 12, exitMinTrades: 12 }, "A", 1).ok, false);
      const thin = tape(tp.ind, rows("A", 1, Array<number>(7).fill(0.025)), kind);
      assert.equal(signalConfigEval(thin, NOW, own, "A", 1).ok, false, "seven closes cannot fill Last-8");
    });
  }
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
  for (const tag of ["sh", "gn", "lg"] as const)
    for (const kind of ["normal", "trailing", "trailing-only", "exit", "dca", "dca-active", "axis"] as const)
      for (const side of [1, -1] as const) {
    it(`Signal ${tag}/${kind}/${side}: protection distances never select an ordinary range gate`, () => {
      const ind = "sig-coord-v2-r60-n3-i3-br9a60mhgf0326kw8ow07@m5";
      const tp = tape(ind, rows("A", side, Array<number>(12).fill(0.02)), kind, tag);
      const own = { ...options, signalLongH: 100, signalValidLastN: 8,
        exitMinTrades: 8, rangeGate: { lastN: 75, minPf: 1.35, ranges: [tag] },
        gates: { ...options.gates, minTrades: 12, warmup: false, lastNFloor: 0 },
        toggles: { ...options.toggles, normal: true, trailing: true, exit: true,
          dca: true, dcaActive: kind === "dca-active", axis: true },
      };
      assert.equal(signalConfigEval(tp, NOW, own, "A", side).ok, true);
      assert.equal(configEval(tp, NOW, own).ok, true);
      assert.equal(execDecision(tp, NOW, own, { sym: "A", side }).ok, true);
      const shortHistory = tape(ind, rows("A", side, Array<number>(7).fill(0.02)), kind, tag);
      assert.equal(signalConfigEval(shortHistory, NOW, own, "A", side).ok, false);
      const engine = tape("rsi-mom-14-20@m5", rows("A", side, Array<number>(12).fill(0.02)), "normal", tag);
      assert.equal(configEval(engine, NOW, own).ok, false, "ordinary ranges keep their own Last-75");
    });
  }
  it("Signal PF ignores borrowed protection-range floors but retains its own stage and Exit floors", () => {
    const history = Array.from({ length: 120 }, (_, i) => i % 3 === 0 ? -0.01 : 0.01);
    const own = { ...options, signalLongH: 100, signalValidLastN: 8,
      gates: { ...options.gates, minPf: 1.5, rangeMinPf: { short: 3, general: 3, long: 3 } },
    };
    for (const tag of ["sh", "gn", "lg"] as const) {
      const tp = tape("sig-ema-cross-s@m5", rows("A", 1, history), "normal", tag);
      assert.equal(configEval(tp, NOW, own).ok, true);
      assert.equal(configEval(tp, NOW, { ...own, gates: { ...own.gates, minPf: 3 } }).ok, false);
      const exit = tape(tp.ind, rows("A", 1, history), "exit", tag);
      assert.equal(configEval(exit, NOW, own).ok, true);
      assert.equal(configEval(exit, NOW, { ...own, exitMinPf: 3 }).ok, false);
      const engine = tape("rsi-mom-14-20@m5", rows("A", 1, history), "normal", tag);
      assert.equal(configEval(engine, NOW, own).ok, false);
    }
  });
});
