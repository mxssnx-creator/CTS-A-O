import assert from "node:assert/strict";
import { test } from "node:test";
import { completeBaseRangeProtects, protectCellKey } from "./pipeline/pipeline.ts";
import { DEFAULT_GRID, protectGrid } from "./sim/walkforward.ts";

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
