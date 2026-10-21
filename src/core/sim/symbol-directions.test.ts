import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { splitSides } from "./backtest.ts";
import { symbolDirections } from "./symbol-directions.ts";
import { configEval, defaultWalkForward, makeTape, selectFixed } from "./walkforward.ts";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 17);
const IND = "sig-ema-cross-s@m15";
const ID = `follow|${IND}|tp1|sl1|tr0|h32`;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
// Universe order is meaningful; do not replace it with an alphabetic tie-break.
const SYMS = ["ZZZ-USDT", "AAA-USDT"];

const tr = (sym: string, side: 1 | -1, r: number, entryT: number): Trade => ({
  cfg: ID,
  sym,
  side,
  entryT,
  exitT: entryT + H / 2,
  entry: 100,
  exit: 100 * (1 + side * r),
  r,
  mult: 1,
  reason: r > 0 ? "tp" : "sl",
  bars: 2,
  mfe: 0,
  mae: 0,
});

describe("pooled symbol/direction tape assembly", () => {
  it("constructs identical cross-symbol timestamp ties in runtime and replay, including last-N decisions", () => {
    const old = Array.from({ length: 40 }, (_, i) => tr(SYMS[0], 1, 0.01, NOW - (80 - i) * H));
    const tiedAt = NOW - H;
    const histories: Record<string, Record<number, Trade[]>> = {
      [SYMS[0]]: { 1: old, [-1]: [tr(SYMS[0], -1, -0.3, tiedAt)] },
      [SYMS[1]]: { 1: Array.from({ length: 25 }, () => tr(SYMS[1], 1, 0.01, tiedAt)), [-1]: [] },
    };
    const signals = [new Int8Array([1, -1]), new Int8Array([1, 0])];

    // Runtime traverses splitSides' signal arrays; replay traverses its explicit side keys.
    // Both production paths now use symbolDirections, rather than sharing only the final sort.
    const runtimeTrades = symbolDirections([0, 1], (s) => splitSides(signals[s])).flatMap(
      ({ symbol: s, direction }) => {
        const side = direction.some((x) => x > 0) ? 1 : -1;
        return histories[SYMS[s]][side];
      },
    );
    const replayTrades = symbolDirections(SYMS, () => [1, -1] as const).flatMap(
      ({ symbol, direction }) => histories[symbol][direction],
    );
    const tp = (xs: Trade[]) => makeTape(ID, "follow", IND, P, "normal", SYMS, [...xs], [], []);
    const runtime = tp(runtimeTrades);
    const replay = tp(replayTrades);
    for (const field of ["exitT", "entryT", "symI", "side", "r"] as const)
      assert.deepEqual(
        Array.from(replay[field]),
        Array.from(runtime[field]),
        `${field} must match across constructed tapes`,
      );
    assert.deepEqual(Array.from(replay.side.slice(-26)), [-1, ...Array(25).fill(1)]);

    const options = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      longH: 100,
      preH: 20,
      preGate: false,
      validLastN: 15,
      signalValidLastN: 25,
      rangeGate: undefined,
      gates: {
        ...DEFAULT_SETTINGS.gates,
        minTrades: 12,
        maxDdtH: 1_000,
        minDdtH: 0,
        maxDdr: 0,
        minGreen: 0,
        stableBlocks: 0,
      },
    };
    assert.deepEqual(configEval(replay, NOW, options), configEval(runtime, NOW, options));
    assert.equal(configEval(runtime, NOW, options).ok, true);
    assert.deepEqual(
      selectFixed([replay], NOW, options).picks,
      selectFixed([runtime], NOW, options).picks,
    );
    assert.equal(selectFixed([runtime], NOW, options).picks.length, 1);

    // This is the former replay path. Stable timestamp sorting cannot repair its source-order difference.
    const formerReplay = tp(
      ([1, -1] as const).flatMap((side) => SYMS.flatMap((sym) => histories[sym][side])),
    );
    const former = configEval(formerReplay, NOW, options);
    assert.equal(former.ok, true, "a losing sibling direction cannot reject the qualified own symbol/direction");
    assert.equal(selectFixed([formerReplay], NOW, options).picks.length, 1);
    assert.deepEqual(former.contexts?.map((x) => [x.sym, x.side, x.evaluation.ok]),
      [[SYMS[0], 1, true], [SYMS[0], -1, false], [SYMS[1], 1, true], [SYMS[1], -1, false]]);
  });

  it("preserves empty and one-sided symbol cases without inventing duplicate runtime directions", () => {
    const signals = [new Int8Array(3), new Int8Array([-1, 0, -1])];
    const cases = symbolDirections([0, 1], (s) => splitSides(signals[s]));
    assert.equal(cases.length, 2);
    assert.deepEqual(
      cases.map(({ symbol }) => symbol),
      [0, 1],
    );
    assert.deepEqual(Array.from(cases[1].direction), [-1, 0, -1]);
  });
});
