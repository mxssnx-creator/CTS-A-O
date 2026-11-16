import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";

const H = 3_600_000, M = 60_000, T = Date.UTC(2026, 10, 14);
const ind = "ema-9-21@m1", protect = { tp: .0215, sl: .0085, trail: 0, hold: 60, tag: "mn" as const };
const id = configId("follow", ind, protect), sym = "OWN-USDT";
const universe = { bars: [], caches: [], startT: T - 12 * H, endT: T + 12 * H,
  splitT: T, nowT: T + 12 * H, baseTf: 1 } as never;
export function fixture(mode: "shared" | "additive" | "overall", side: 1 | -1, values = Array(8).fill(.02)) {
  const row = (r: number, entryT: number): Trade => ({ cfg: id, sym, side, entryT, exitT: entryT + M,
    entry: 100, exit: 100 * (1 + side * (r + .0015)), r, mult: 1, kind: "normal",
    reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0 });
  const history = Array.from({ length: 160 }, (_, i) => row(.02, T - 11 * H + i * 2 * M));
  const future = values.map((r, i) => row(r, T + (2 * i + 1) * M));
  const tape = makeTape(id, "follow", ind, protect, "normal", [sym], [...history, ...future], [], []);
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  const options: WalkForwardOptions = { ...d, preH: 12, longH: 12, simH: 12, startT: T,
    mode: "fixed", seatPer: "config", portfolio: 0, maxPositions: 0, maxOpen: 1, symGate: "off",
    rangeOpts: undefined, basePassed: new Set([`follow|${ind}`]), basePassedRanges: { [`follow|${ind}`]: ["mn"] },
    toggles: { ...d.toggles, normal: false, block: true, blockActive: true },
    block: { ...d.block, mode, historySource: "processed-orders", ratio: .2, maxMult: 2,
      minActiveLevel: 1, sources: { config: true, overall: true, symbol: true, direction: true, indication: true, type: true } },
    coord: { ...d.coord!, enabled: false }, signalRank: undefined, engineSideAccept: undefined,
    processedStages: { validationN: 2, realN: 2 } };
  return { tape, future, options, universe };
}

for (const mode of ["shared", "additive", "overall"] as const) for (const side of [1, -1] as const)
  test(`${mode}/${side}: count-policy Block processes its own stage predecessors with Ordinary off`, () => {
    const f = fixture(mode, side), result = walkForward(universe, [f.tape], f.options);
    assert.equal(result.processedStages!.sets[0]?.stages.postBase.closedOrders, 8,
      "Block Active must not deadlock its independently processed stage input");
    assert.equal(result.trades.length, 3);
    assert.equal(result.trades[0].entryT, f.future[5].entryT,
      "two Main and two Real closes, then one Active precursor, must settle before Block can raise");
    assert.ok(result.trades.every(x => x.blockVol! > 1));
    assert.equal(result.feed.filter(x => x.accepted).length, 3);
    assert.equal(result.feed.filter(x => x.blockProcessed && !x.accepted).length, 1,
      "pre-Active stage history must not be relabeled as Block or accepted execution proof");
  });

test("independent processed Block retains losses and recovers without importing raw candidate wins", () => {
  const f = fixture("overall", 1, [.02, .02, .02, .02, .02, -.04, -.04, .02, .02, .02, .02, .02]);
  const result = walkForward(universe, [f.tape], f.options);
  assert.ok(result.trades.some(x => x.r < 0));
  assert.equal(result.processedStages!.sets[0]?.stages.postBase.closedOrders, f.future.length);
  assert.equal(result.trades.at(-1)?.entryT, f.future.at(-1)?.entryT);
  const losing = fixture("overall", 1, Array(8).fill(-.02));
  const rejected = walkForward(universe, [losing.tape], losing.options);
  assert.equal(rejected.trades.length, 0);
  assert.equal(rejected.feed.filter(x => x.blockProcessed).length, 0);
  assert.ok((rejected.processedStages?.sets[0]?.stages.postBase.closedOrders ?? 0) > 0);
  assert.equal(rejected.processedStages!.real.qualified, 0);
});

test("range-level Ordinary off keeps independent Block precursor processing on the same exact count gates", () => {
  const f=fixture("overall",1);
  const ordinaryOff={...f.options,processedStages:undefined,
    toggles:{...f.options.toggles,normal:true},rangeOpts:{mn:{normal:false}}};
  const result=walkForward(universe,[f.tape],ordinaryOff);
  assert.equal(result.trades.length,7);
  assert.equal(result.trades[0].entryT,f.future[1].entryT);
  assert.ok(result.trades.every(x=>x.blockVol!>1));
  const losing=makeTape(f.tape.id,f.tape.bot,f.tape.ind,f.tape.protect,f.tape.kind,f.tape.syms,
    f.future.map(x=>({...x,r:-.02})),[],[]);
  assert.equal(walkForward(universe,[losing],ordinaryOff).trades.length,0);
});
