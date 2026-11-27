import assert from "node:assert/strict";
import { test } from "node:test";
import { fixedProtects } from "./fixed-stop-grid.ts";
import { SHORT_RANGE } from "./config.ts";
import { completeBaseRangeProtects, protectCellKey, protectCellRange } from "./pipeline/pipeline.ts";
import { cellAllowed, DEFAULT_GRID, passedCellsOf, protectGrid } from "./sim/walkforward.ts";

test("fixed SL bands and ceiling survive Base and the execution grid", () => {
  for (const ceiling of [.5,1,2.5]) {
    const g={...DEFAULT_GRID, tp:[.004,.012,.016,.05], holdH:[1], trailOfTp:[0], minTrail:0, minSl:0, fixedSlBands:{}, maxStopLossRatio:ceiling};
    const cells=protectGrid(15,g,.0001);
    const bases=completeBaseRangeProtects(g,.0001);
    const fixed=cells.filter(c=>c.stopBand);
    assert.ok(fixed.length>0);
    for(const cell of fixed) {
      assert.ok(cell.sl<=cell.tp*ceiling+1e-12);
      assert.equal(cell.stopBand==="short" ? cell.tp<=.016 : cell.tp>=.012,true);
    }
    const a=fixed.filter(c=>c.tp===.012 && c.sl===.004 && !c.trail && !c.trailOnly && !c.tag);
    assert.deepEqual(new Set(a.map(c=>c.stopBand)), new Set(["short","long"]));
    assert.equal(new Set(a.map(protectCellKey)).size,2);
    assert.ok(a.every(c=>bases.some(b=>protectCellKey(b)===protectCellKey(c))));
  }
});

test("a Base stop-band proof qualifies only its exact range, band and geometry", () => {
  for (const tag of [undefined, "sh", "mn"] as const) {
    const protect = { tp: .012, sl: .004, trail: 0, hold: 5, tag, stopBand: "short" as const };
    const tape = { bot: "follow" as const, ind: "test@m5", protect };
    const key = protectCellKey(protect);
    const proof = passedCellsOf({ "follow|test@m5": [key] });
    assert.equal(protectCellRange(key), tag ?? "");
    assert.equal(protectCellRange(protectCellKey({ ...protect, stopBand: undefined })), tag ?? "");
    assert.equal(protectCellRange(protectCellKey({ ...protect, stopBand: "long" })), tag ?? "");
    assert.deepEqual([...proof["follow|test@m5"].tags], [tag ?? ""]);
    assert.equal(cellAllowed(tape, { basePassedCells: proof }), true);
    assert.equal(cellAllowed(tape, {}), false);
    assert.equal(cellAllowed({ ...tape, protect: { ...protect, stopBand: "long" } }, { basePassedCells: proof }), false);
    assert.equal(cellAllowed({ ...tape, protect: { ...protect, sl: .006 } }, { basePassedCells: proof }), false);
  }
});

test("fixed stops obey the range-specific executable floor even when the global floor is lower", () => {
  const grid = { ...DEFAULT_GRID, minSlEval: 0, short: { ...SHORT_RANGE, minSlEval: .008 },
    fixedSlBands: { short: [.2, .6, 1], long: [] } };
  const rows = fixedProtects([{ tag: "sh", tp: .014, sl: .002, trail: 0, hold: 4 }], grid, .001, 100);
  assert.deepEqual(rows.map(row => row.sl), [.01]);
});
