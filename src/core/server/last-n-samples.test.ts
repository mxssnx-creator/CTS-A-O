import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward, type ConfigTape } from "../sim/walkforward.ts";
import { lastNSamplesGen } from "./last-n-samples.ts";

// Frozen legacy clock/history readout; primary count-window progress is tested in position-windows.test.ts.
const options = () => ({ ...defaultWalkForward({...DEFAULT_SETTINGS,gates:{...DEFAULT_SETTINGS.gates,positionWindows:null}}), validLastN: 3, lastN: 2, rangeGate: undefined });
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

test("48h evaluated history adds own samples while Last-N, empty contexts and Signal history remain distinct", () => {
  const H = 3_600_000, at = 72 * H;
  const tp = tape({ n: 7, exitT: Float64Array.from([30,31,50,60,61,62,72].map(h => h * H)),
    symI: Uint16Array.from([0,0,0,1,1,1,0]), side: Int8Array.from([1,1,1,-1,-1,-1,1]),
    r: Float64Array.from([-.01,-.01,-.01,.02,.02,.02,.1]) });
  const empty = tape({ id: "empty-config", n: 0 });
  const base = { ...options(), gates: { ...options().gates, minTrades: 3 }, preH: 24, longH: 24 };
  const prior = run([tp, empty], at, base);
  const extended = run([tp, empty], at, { ...base, preH: 48, longH: 48 });
  const row = (out: ReturnType<typeof run>, window: string) => out.rows.find(r => r.window === window)!;
  assert.deepEqual([row(prior,"history").usable,row(prior,"history").contexts,row(prior,"history").pct],[1,8,12.5]);
  assert.deepEqual([row(extended,"history").usable,row(extended,"history").contexts,row(extended,"history").pct],[2,8,25]);
  assert.equal(row(extended,"history").historyH,48);
  assert.equal(row(prior,"validation").usable,2,"Last-N retains its own preceding-close scope");
  assert.equal(row(extended,"validation").usable,2);
  assert.equal(row(extended,"validation").historyH,null);
  assert.equal(extended.catalogueScope,"built-configs-including-empty-contexts");
  assert.equal(extended.processedNative.state,"unavailable");
  const signal = run([tape({ind:"sig-ema-cross-s@m1"})], at,
    { ...base, preH: 48, longH: 48 });
  assert.equal(row(signal,"history").historyH,150);
  assert.equal(row(signal,"history").source,"signals");
});

test("corrupt timing or ownership cannot be skipped to qualify older closes", () => {
  for (const tp of [tape({exitT:Float64Array.from([1,2,NaN,4,5])}),
    tape({side:Int8Array.from([1,1,0,-1,-1])}),
    tape({exitT:Float64Array.from([1,3,2,4,5])})]) {
    const result = run([tp],6).rows.find(r => r.window === "validation")!;
    assert.equal(result.usable,0);
    assert.equal(result.unknown,4);
    assert.equal(result.pct,null);
  }
});
