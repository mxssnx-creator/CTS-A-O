import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { RangeTag, Trade } from "../domain/types.ts";
import { protectCellKey } from "../pipeline/pipeline.ts";
import {
  baseAllowsTape, configDirectionEval, defaultWalkForward, execDecision, makeTape,
  passedCellsOf, selectAt, selectDurable, selectFixed,
} from "./walkforward.ts";

const H = 3_600_000, T = Date.UTC(2026, 9, 17);
const ind = "rsi-mom-14-20@m15", pair = `follow|${ind}`;
function fixture(tag: RangeTag, side: 1 | -1, trailing = false) {
  const protect = { tp: .01, sl: .02, trail: trailing ? .005 : 0, hold: 4, tag };
  const id = `${pair}|tp1|sl2|tr${trailing ? .5 : 0}|h4|${tag}`;
  const kind = trailing ? "trailing" as const : "normal" as const;
  const rows: Trade[] = Array.from({ length: 60 }, (_, i) => ({
    cfg: id, sym: "A", side, entryT: T - (61 - i) * 20 * 60_000,
    exitT: T - (60 - i) * 20 * 60_000, entry: 100, exit: 100 + side,
    r: .01, mult: 1, kind, reason: "tp", bars: 1, mfe: 0, mae: 0,
  }));
  const tape = makeTape(id, "follow", ind, protect, kind, ["A"], rows, [], []);
  const defaults = defaultWalkForward(DEFAULT_SETTINGS);
  const options = {
    ...defaults, preH: 6, longH: 24, preGate: false, lastN: 0, validLastN: 15,
    durableSplits: 4, durableFrac: .5, portfolio: 0, rangeGate: undefined,
    symGate: "off" as const, basePassed: new Set([pair]),
    basePassedRanges: { [pair]: [tag] },
    basePassedCells: passedCellsOf({ [pair]: [protectCellKey(protect)] }),
    gates: { ...defaults.gates, minTrades: 12, minPf: 1.1, rangeMinPf: undefined,
      maxDdr: 0, maxDdtH: 1000, minGreen: 0, stableBlocks: 0, lossPrior: false },
  };
  return { tape, options };
}

describe("exact published admission cohort", () => {
  for (const tag of ["mc", "mn", "mp", "sh", "gn", "lg"] as const)
    for (const side of [1, -1] as const)
      for (const trailing of [false, true])
        it(`${tag}/${side}/${trailing ? "Trailing" : "Normal"}: a passed sibling cell cannot authorize selection or execution`, () => {
          const { tape, options } = fixture(tag, side, trailing);
          const selections = [
            (o: typeof options) => selectFixed([tape], T, o),
            (o: typeof options) => selectAt([tape], T, o),
            (o: typeof options) => selectDurable([tape], T, o, new Set()),
            (o: typeof options) => selectDurable([tape], T, o, new Set([tape.id])),
          ];
          assert.equal(configDirectionEval(tape, T, options, side).ok, true);
          assert.equal(execDecision(tape, T, options, { sym: "A", side }).ok, true);
          for (const select of selections) assert.equal(select(options).picks.length, 1);
          // Same pair, range and target; only the exact SL cell failed Base.
          const rejected = { ...options, basePassedCells: passedCellsOf({
            [pair]: [protectCellKey({ ...tape.protect, sl: .03 })],
          }) };
          assert.equal(baseAllowsTape(tape, rejected), false, "exact Base cell must remain qualified");
          assert.deepEqual(execDecision(tape, T, rejected, { sym: "A", side }), { ok: false, why: "base" });
          for (const select of selections) assert.equal(select(rejected).picks.length, 0);
          // Explicit cell proof is optional; absence preserves pair/target policy.
          assert.equal(baseAllowsTape(tape, { ...rejected, basePassedCells: undefined }), true);
        });
});
