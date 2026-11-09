import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward, type ConfigTape } from "../sim/walkforward.ts";
import { lastNSamplesGen } from "./last-n-samples.ts";

const options = () => ({ ...defaultWalkForward(DEFAULT_SETTINGS), validLastN: 3, lastN: 2, rangeGate: undefined });
function tape(extra: Partial<ConfigTape> = {}): ConfigTape {
  return { id: "own", ind: "ema@m1", kind: "normal", protect: { tag: "mn" },
    syms: ["A", "B"], n: 5, exitT: Float64Array.from([1,2,3,4,5]),
    symI: Uint16Array.from([0,0,0,1,1]), side: Int8Array.from([1,1,1,-1,-1]),
    r: Float64Array.from([-.01,-.01,-.01,.02,.02]), ...extra } as ConfigTape;
}
function run(tapes: ConfigTape[], at = 5, o = options()) {
  const gen = lastNSamplesGen(tapes, at, o);
  for (;;) { const item = gen.next(); if (item.done) return item.value; }
}
test("exact-context coverage counts losses and empty sides without sharing sibling or future evidence", () => {
  const before = run([tape()]);
  const v = before.rows.find(r => r.window === "validation")!;
  assert.deepEqual([v.contexts,v.usable,v.insufficient,v.pct],[4,1,3,25]);
  const e = before.rows.find(r => r.window === "entry")!;
  assert.equal(e.usable,1,"same-clock close cannot complete B's sample");
  assert.equal(run([tape()],6).rows.find(r=>r.window==="entry")!.usable,2);
  assert.equal(run([tape(),tape({id:"empty",n:0})]).rows.find(r=>r.window==="validation")!.pct,12.5);
});
test("full requested counts preserve low range overrides, disabled windows and corrupt/carry evidence", () => {
  const o = { ...options(), rangeOpts: { mn: { validLastN: 1, lastN: 0 } } };
  const rows = run([tape()],5,o).rows;
  assert.deepEqual([rows[0].n,rows[0].usable],[1,2]);
  assert.equal(rows.find(r=>r.window==="entry")!.disabled,4);
  const bad = run([tape({r:Float64Array.from([-.01,-.01,NaN,.02,.02])})]).rows[0];
  assert.deepEqual([bad.full,bad.usable,bad.unknown],[1,0,1]);
  const carried = run([tape({carried:true}),tape({heldOnly:true})]);
  assert.equal(carried.heldOnly,1);
  assert.deepEqual([carried.rows[0].contexts,carried.rows[0].unknown,carried.rows[0].usable],[4,4,0]);
});
