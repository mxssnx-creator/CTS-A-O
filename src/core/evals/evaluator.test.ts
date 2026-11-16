import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_GATES } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { evaluateConfig } from "./evaluator.ts";

const H = 3_600_000, NOW = Date.UTC(2026, 9, 17, 12);
const trade = (exitT: number, r: number): Trade => ({
  cfg: "fixture", sym: "A", side: 1, entryT: exitT - 60_000, exitT,
  entry: 100, exit: 100 * (1 + r), r, mult: 1,
  reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0,
});
test("every evaluation window and score stops at its requested clock, including Last-N", () => {
  const closed = Array.from({ length: 30 }, (_, i) => trade(NOW - (29 - i) * 60_000, 0.01));
  const future = Array.from({ length: 100 }, (_, i) => trade(NOW + (i + 1) * 60_000, -0.1));
  const options = { gates: {...DEFAULT_GATES,positionWindows:null}, nowT: NOW, timeWindowsH: [1, 6, 72], tradeWindows: [5, 15] };
  const expected = evaluateConfig("fixture", closed, options);
  assert.equal(expected.windows.find(w => w.key === "1h")?.n, 30);
  assert.deepEqual(evaluateConfig("fixture", [...closed, ...future], options), expected);
  assert.equal(evaluateConfig("fixture", future, options).windows.every(w => w.n === 0 && !w.pass), true);
  assert.equal(evaluateConfig("fixture", future, options).score, 0);
  assert.equal(evaluateConfig("fixture", [...closed, ...future], { ...options, nowT: NOW + 2 * H }).success, false);
});

const countOptions=()=>({gates:{...DEFAULT_GATES,stepPf:{enabled:false,ratio:.2,max:2},minPf:1.1,maxDdr:0,minGreen:0,lossPrior:false,
 positionWindows:{base:4,main:4,real:2,entry:2,maxDrawdownPositions:40}},nowT:NOW});
test('count evaluations cannot qualify older wins by dropping a corrupt own timestamp',()=>{
 const rows=Array.from({length:8},(_,i)=>trade(NOW-(8-i)*60000,.02));
 assert.equal(evaluateConfig('fixture',rows,countOptions()).success,true);
 rows.push({...trade(NaN,-.9)});
 assert.equal(evaluateConfig('fixture',rows,countOptions()).success,false);
});
test('unrelated config symbols cannot dilute own evaluation progress',()=>{
 const rows=Array.from({length:8},(_,i)=>trade(NOW-(8-i)*60000,.02));
 const expected=evaluateConfig('fixture',rows,countOptions());
 assert.deepEqual(evaluateConfig('fixture',[...rows,{...trade(NOW-1,-.9),cfg:'sibling',sym:'OTHER'}],countOptions()),expected);
});
test('disjoint evaluation PF and count describe the actual long block and complete requested sample',()=>{
 const rows=[.02,-.005,.02,.02,-.10,-.10,-.01].map((r,i)=>trade(NOW-(8-i)*60000,r));
 const o=countOptions(),block={long:4,short:2,minimal:1,shortPolarity:'negative' as const,minimalPolarity:'negative' as const};
 o.gates.positionWindows={...o.gates.positionWindows,blocks:{base:block,main:block,real:block,entry:block}} as typeof o.gates.positionWindows;
 const result=evaluateConfig('fixture',rows,o),main=result.windows.find(w=>w.key.startsWith('A/1/main/'))!;
 assert.equal(result.success,true);
 assert.equal(main.pf,12,'PF uses the independent long block, not the negative tail');
 assert.equal(main.span,7);assert.equal(main.n,7);assert.equal(main.key,'A/1/main/N7');
});

test('a failed sibling context cannot supply the successful config ranking score',()=>{
 const good=Array.from({length:40},(_,i)=>({...trade(NOW-(41-i)*60000,.02),sym:'GOOD'}));
 const failed=Array.from({length:40},(_,i)=>({...trade(NOW-(41-i)*60000,i<38?1:i===38?.001:-.002),sym:'FAILED'}));
 const o=countOptions();o.gates.positionWindows={...o.gates.positionWindows,base:40,main:40};
 const expected=evaluateConfig('fixture',good,o),mixed=evaluateConfig('fixture',[...good,...failed],o);
 assert.equal(mixed.success,true);assert.equal(mixed.score,expected.score);
});

test('count evaluation removes an explicit external multiplier once and retains unknown unit returns',()=>{
 const rows=[-.02,.1,.1,.1].map((r,i)=>({...trade(NOW-(5-i)*60000,r),mult:i===0?1:10}));
 assert.equal(evaluateConfig('fixture',rows,countOptions()).success,false,'sized gains cannot qualify a weaker unit window');
 const unknown=Array.from({length:8},(_,i)=>({...trade(NOW-(9-i)*60000,.02),unitR:null}));
 assert.equal(evaluateConfig('fixture',unknown,countOptions()).success,false);
});
