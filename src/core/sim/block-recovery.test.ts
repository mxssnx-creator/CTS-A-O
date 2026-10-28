import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BLOCK } from "../config.ts";
import { BLOCK_SOURCES, blockBookOf, blockDecide, sourceKey } from "./block.ts";

const levels = { config: 1, overall: 1, symbol: 1, direction: 1, indication: 1, type: 1 };
const policy = { ...DEFAULT_BLOCK, ratio: .2, steps: 0,
  sourceRatios: { config: 1, overall: 1, symbol: 4, direction: 2, indication: 2, type: 3 } };
const identity = { cfg: "set-a", sym: "A", side: 1, kind: "trend", ind: "ema@m1", type: "normal" };

test("independent relation ratios conserve the common cap and do not compound", () => {
  const d = blockDecide(levels, policy, false);
  assert.deepEqual(d.legs, { config: .2, overall: .2, symbol: .8, direction: .4, indication: .4, type: .6 });
  assert.equal(d.vol, 3.6);
  const limited = blockDecide(levels, { ...policy, maxMult: 2 }, false);
  assert.equal(limited.vol, 2);
  assert.ok(Math.abs(Object.values(limited.legs!).reduce((n, x) => n + x!, 0) - 1) < 1e-12);
  assert.equal(blockDecide(levels, { ...policy, mode: "shared" }, false).vol, 1.8);
  assert.equal(blockDecide(levels, { ...policy, mode: "additive" }, false).vol, 3.6);
  assert.equal(blockDecide(levels, { ...policy, stepFloor:false,sourceRatios:Object.fromEntries(BLOCK_SOURCES.map(s=>[s,0])) }, true).adjusted,false);
});

for (const windowAuto of [false, true]) test(`recovery persists independently until net break-even; auto=${windowAuto}`, () => {
  const book = blockBookOf({ ...policy, pause: 3, maxLevel: 1, windowAuto, windowCandidates: [1, 2] });
  const d = blockDecide(levels, policy, false);
  const row = { ...identity, accepted: true, blockAttribution: d.blockAttribution, bsrc: d.src, r: -.02 };
  book.add(row);
  for (const source of BLOCK_SOURCES) {
    const key = sourceKey(source, row);
    assert.equal(book.level(key, 1), 1, "losing last-N must not erase outstanding recovery");
    assert.ok(book.recoveryState(key)!.net < 0);
  }
  book.add({ ...row, r: .01 });
  assert.equal(book.paused("all"), false, "a partial recovery win must not pause the remaining debt");
  assert.ok(book.recoveryState("all")!.net < 0);
  book.add({ ...row, cfg: "set-b", sym: "B", ind: "ema@m5", side: -1, type: "trailing", r: .02 });
  assert.equal(book.recoveryState("all"), null, "Overall can recover across its own whole pool");
  for (const source of BLOCK_SOURCES.filter(s => s !== "overall"))
    assert.ok(book.recoveryState(sourceKey(source, row))!.net < 0, "sibling relations cannot clear this recovery");
  book.add({ ...row, r: .01, accepted: false });
  assert.ok(book.recoveryState(sourceKey("config", row))!.net < 0);
  book.add({ ...row, r: .01 });
  assert.equal(book.recoveryState(sourceKey("config", row)), null);
});

test("entry attribution survives replay, Active skips low levels and never manufactures cold evidence", () => {
  const b = { ...policy, minActiveLevel: 2 };
  assert.equal(blockDecide(levels, b, true).adjusted, false);
  const warm = { ...levels, config: 2 };
  const d = blockDecide(warm, b, true);
  assert.deepEqual(d.src, ["config"]);
  const row = { ...identity, r: -.03, accepted: true, blockAttribution: d.blockAttribution };
  const book = blockBookOf(b), restored = blockBookOf(b);
  book.add(row); restored.add(JSON.parse(JSON.stringify(row)));
  for (const source of BLOCK_SOURCES)
    assert.deepEqual(restored.recoveryState(sourceKey(source, row)), book.recoveryState(sourceKey(source, row)));
  assert.equal(book.level(sourceKey("config", row), 8), 2);
  book.add({ ...row, r: NaN });
  assert.ok(Number.isNaN(book.recoveryState(sourceKey("config", row))!.net));
  assert.equal(book.recoveryLevel(sourceKey("config", row), 8), 0);
  for(let i=0;i<20;i++)book.add({...row,r:.1,blockAttribution:undefined,exitT:1000+i});
  assert.equal(book.level(sourceKey("config",row),8),0,"later wins cannot certify an unknown recovery balance");
  const legacy=blockBookOf(b);
  legacy.add(JSON.parse(JSON.stringify({...row,r:NaN})));
  assert.ok(Number.isNaN(legacy.recoveryState(sourceKey("config",row))!.net),"serialized unknown must not become zero");
});
