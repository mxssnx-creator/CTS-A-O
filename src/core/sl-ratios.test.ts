import { it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AUTO_SL, DEFAULT_FINE_AUTO_SL, checkAutoSlRatios, slRatioCandidates, slRatiosOf } from "./sl-ratios.ts";
import { MICRO_RANGE, MINIMAL_RANGE } from "./minimal-coord.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { protectGrid, checkGridVariantBudget } from "./sim/walkforward.ts";
import { completeBaseRangeProtects, baseRangeProtects } from "./pipeline/pipeline.ts";
import { checkSettings } from "./settings-check.ts";
import { normalizeLanes } from "./server/runtime.server.ts";
import { DEFAULT_SIGNALS, signalSettings } from "./signal-config.ts";
import { lowRangeGridProtects, DEFAULT_LOW_RANGE_GRID } from "./indications/low-range.ts";

it("auto stop ratios use inclusive bounded integer steps and independent fine defaults", () => {
  assert.deepEqual(slRatiosOf({ slAuto: DEFAULT_AUTO_SL }), [.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5]);
  assert.deepEqual(slRatiosOf({ slAuto: DEFAULT_FINE_AUTO_SL }), [.2,.3,.4,.5,.6,.7,.8,.9,1,1.1,1.2,1.3,1.4,1.5,1.6]);
  assert.deepEqual(slRatiosOf({ slAuto: { ...DEFAULT_AUTO_SL, min:.3,max:1,step:.2,fallback:.5 } }), [.3,.5,.7,.9]);
});
it("manual custom ladders retain their exact values; invalid persisted auto policies recover bounded candidates", () => {
  const manual = [.25,.75,2.5];
  assert.equal(slRatiosOf({ slOfTp:manual }),manual);
  assert.deepEqual(slRatioCandidates({ slOfTp:[], slAuto:{...DEFAULT_AUTO_SL,step:0} }), {ratios:[1],source:"fallback"});
  assert.deepEqual(slRatiosOf({ slAuto:{...DEFAULT_AUTO_SL,min:1.2,max:1.5,step:NaN,fallback:2} }), [1.2]);
  assert.deepEqual(slRatiosOf({ slOfTp:[NaN] }), [1]);
  for (const p of [{...DEFAULT_AUTO_SL,min:2,max:1}, {...DEFAULT_AUTO_SL,step:0}, {...DEFAULT_AUTO_SL,step:.01}, {...DEFAULT_AUTO_SL,fallback:NaN}])
    assert.throws(()=>checkAutoSlRatios(p));
});
it("auto ratios reach runtime, Base, executable grids and budgets without changing targets/floors or manual siblings", () => {
  const base = {...DEFAULT_SETTINGS.grid,tp:[.02],slOfTp:[1],trailOfTp:[0,.5],holdH:[1],trailingOnly:false,short:false as const,general:false as const,long:false as const,lowRange:undefined,
    micro:{...MICRO_RANGE,tp:[.004],holdAuto:false},minimal:{...MINIMAL_RANGE,tp:[.008],holdAuto:false}};
  const policy={...DEFAULT_AUTO_SL,min:.5,max:1,step:.25,fallback:.75};
  const micro={...base.micro!, slAuto:{...DEFAULT_FINE_AUTO_SL,min:.2,max:.4,step:.1,fallback:.3}};
  const grid={...base,slAuto:policy,micro,minimal:{...base.minimal!,slAuto:policy}};
  const manual={...grid,slAuto:undefined,slOfTp:[.5,.75,1],micro:{...micro,slAuto:undefined,slOfTp:[.2,.3,.4]},minimal:{...grid.minimal,slAuto:undefined,slOfTp:[.5,.75,1]}};
  checkSettings({grid});
  assert.deepEqual(protectGrid(15,grid,DEFAULT_SETTINGS.cost),protectGrid(15,manual,DEFAULT_SETTINGS.cost));
  assert.deepEqual(completeBaseRangeProtects(grid,DEFAULT_SETTINGS.cost),completeBaseRangeProtects(manual,DEFAULT_SETTINGS.cost));
  assert.deepEqual(baseRangeProtects(grid,DEFAULT_SETTINGS.cost),baseRangeProtects(manual,DEFAULT_SETTINGS.cost));
  assert.equal(checkGridVariantBudget(grid,DEFAULT_SETTINGS.cost),checkGridVariantBudget(manual,DEFAULT_SETTINGS.cost));
  const s=normalizeLanes({...DEFAULT_SETTINGS,grid});
  assert.deepEqual(s.grid.minimal && s.grid.minimal.slOfTp,[.5,.75,1]);
  assert.equal(s.grid.short,false);
  assert.deepEqual(s.grid.micro && s.grid.micro.slOfTp,[.2,.3,.4]);
  assert.equal(s.grid.minimal && s.grid.minimal.slAuto?.fallback,.75);
});
it("invalid edits fail before any runtime publication and work expansion", () => {
  assert.throws(()=>checkSettings({grid:{slAuto:{...DEFAULT_AUTO_SL,step:0}}}));
  assert.throws(()=>checkSettings({grid:{micro:{...MICRO_RANGE,slAuto:{...DEFAULT_FINE_AUTO_SL,step:.01}}}}));
});
it("Signals and Low-Range retain their independent auto settings and later hard risk caps", () => {
  const policy={...DEFAULT_AUTO_SL,min:.5,max:1,step:.25,fallback:.75};
  const sig=signalSettings({...DEFAULT_SIGNALS,normal:{...DEFAULT_SIGNALS.normal,slAuto:policy},hist:{...DEFAULT_SIGNALS.hist,slAuto:policy}});
  assert.deepEqual(sig.normal.slOfTp,[.5,.75,1]);
  assert.deepEqual(sig.hist.slOfTp,[.5,.75,1]);
  const grid={...DEFAULT_LOW_RANGE_GRID,enabled:true,slAuto:policy,maxSlRatio:.75};
  const auto=lowRangeGridProtects(grid,DEFAULT_SETTINGS.cost);
  assert.ok(auto.length>0);
  assert.ok(auto.every(p=>p.sl/p.tp<=.75+1e-12));
  assert.deepEqual(auto,lowRangeGridProtects({...grid,slAuto:undefined,slRatios:[.5,.75,1]},DEFAULT_SETTINGS.cost));
});
