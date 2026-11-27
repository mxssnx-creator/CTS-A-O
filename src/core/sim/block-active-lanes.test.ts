// Block Active belongs to Block's own lanes (plain Normal / Trailing). It must not skip, or raise the minimum level
// of, DCA, DCA Active, Axis, Historic Exit or Signal entries (operator, 16 Nov 2026).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BlockBook } from "./block.ts";
import { defaultWalkForward, execDecision, makeTape } from "./walkforward.ts";
import { DEFAULT_SETTINGS as FACTORY_SETTINGS, DEFAULT_TOGGLES } from "../config.ts";
import { INDICATIONS } from "../indications/registry.ts";
import type { BlockConfig, Trade } from "../domain/types.ts";

const H = 3_600_000;
const B: BlockConfig = { ratio: 0.2, maxLevel: 3, minActiveLevel: 5, maxMult: 3 };
const rows = (cfg: string): Trade[] => Array.from({ length: 30 }, (_, i) => ({ cfg, sym: "A", side: 1 as const,
  entryT: i * 60_000, exitT: (i + 1) * 60_000, entry: 1, exit: 1.01, r: .01, reason: "tp", bars: 1, mfe: 0, mae: 0 }));
const ind = INDICATIONS[0].id;
const base = {
  ...defaultWalkForward({ ...FACTORY_SETTINGS, gates: { ...FACTORY_SETTINGS.gates, positionWindows: null } }),
  wideEnabled: true, longH: 96, preGate: false, validLastN: 0, lastN: 0, symGate: undefined, block: B,
  toggles: { ...DEFAULT_TOGGLES, normal: true, block: true, blockActive: true, dca: true, dcaActive: true, axis: true },
};
const decide = (kind: "normal" | "dca-active" | "axis" | "dca", dcaActive = true) => {
  const tp = makeTape("x", "magnet", ind, { tp: .02, sl: .02, trail: 0, hold: 32 }, kind, ["A"], rows("x"), [], []);
  const o = { ...base, toggles: { ...base.toggles, dcaActive } };
  return execDecision(tp, 2 * H, o, { book: new BlockBook(), sym: "A", side: 1 });
};

describe("Block Active is scoped to its own lanes", () => {
  it("skips a plain Normal entry below the active minimum only when Normal itself is off", () => {
    assert.equal(decide("normal").ok, true, "Normal on: the un-raised base trades at its unit");
    const off = { ...base, toggles: { ...base.toggles, normal: false } };
    const tp = makeTape("x", "magnet", ind, { tp: .02, sl: .02, trail: 0, hold: 32 }, "normal", ["A"], rows("x"), [], []);
    assert.deepEqual(execDecision(tp, 2 * H, off, { book: new BlockBook(), sym: "A", side: 1 }), { ok: false, why: "blockActive" });
  });
  it("does not skip DCA Active, DCA or Axis entries", () => {
    for (const kind of ["dca-active", "axis"] as const) assert.equal(decide(kind).ok, true, kind);
    assert.equal(decide("dca", false).ok, true, "dca");
  });
});
