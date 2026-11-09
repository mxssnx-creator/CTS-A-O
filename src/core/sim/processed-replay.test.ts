import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Protect, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { ProcessedSetBook } from "./processed-set.ts";
import { defaultWalkForward, execDecision, makeTape, packTapes, walkForward,
  type WalkForwardOptions, type WalkForwardResult } from "./walkforward.ts";
import { retireOwnedIdleWorkers, runOnWorkers } from "../server/pool.server.ts";

const H = 3_600_000, M = 60_000, T = Date.UTC(2026, 10, 9);
const symbols = ["ADA", "APT", "ARB", "ATOM", "AVAX", "BCH", "BNB", "BTC"].map(x => `${x}-USDT`);
const ind = "ema-9-21@m1";
const protect: Protect = { tp: .0215, sl: .0085, trail: 0, hold: 60, tag: "mn" };
const id = configId("follow", ind, protect);
function trade(r: number, entryT: number, side: 1 | -1 = 1, sym = symbols[0], cfg = id): Trade & { unitR: number } {
  return { cfg, sym, side, entryT, exitT: entryT + M, entry: 100, exit: 100 * (1 + side * (r + .0015)),
    r, unitR: r, mult: 1, kind: "normal", reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0 };
}
function fixture(values: number[], overrides: Partial<WalkForwardOptions> = {}, open: OpenPosition[] = []) {
  const history = Array.from({ length: 160 }, (_, i) => trade(.02, T - 11 * H + i * 2 * M));
  const future = values.map((r, i) => trade(r, T + (2 * i + 1) * M));
  const tape = makeTape(id, "follow", ind, protect, "normal", symbols, [...history, ...future], open, []);
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const options: WalkForwardOptions = { ...base, preH: 12, longH: 12, simH: 12, signalLongH: 12,
    startT: T, stepH: 1, mode: "fixed", seatPer: "config", portfolio: 0, maxPositions: 0,
    preGate: false, symGate: "off", validLastN: 100, rangeGate: undefined,
    rangeOpts: undefined, basePassed: new Set([`follow|${ind}`]),
    basePassedRanges: { [`follow|${ind}`]: ["mn"] },
    toggles: { ...base.toggles, normal: true, trailing: false, axis: false, dca: false, dcaActive: false, block: false, exit: false },
    coord: { ...base.coord!, enabled: false }, signalRank: undefined, engineSideAccept: undefined,
    processedStages: { validationN: 2, realN: 2 }, ...overrides };
  const universe = { bars: [], caches: [], startT: T - 12 * H, endT: T + 12 * H,
    splitT: T, nowT: T + 12 * H, baseTf: 1 } as never;
  const result = walkForward(universe, [tape], options);
  return { result, tape, options, future, universe };
}

test("native replay advances through two own processed windows, retains losses and recovers", () => {
  const values = [.02, .02, .02, .02, .02, -.04, -.04, -.04, .02, .02, .02, .02, .02, .02];
  const f = fixture(values), report = f.result.processedStages!;
  const postBase: number[] = [], validated: number[] = [], expected: number[] = [];
  const passes = (rows: number[]) => {
    const tail = rows.slice(-2);
    return tail.length === 2 && tail.reduce((s, r) => s + Math.max(r, 0), 0) >=
      1.08 * tail.reduce((s, r) => s + Math.max(-r, 0), 0) && tail.some(r => r > 0);
  };
  for (let i = 0; i < values.length; i++) {
    const main = passes(postBase), real = main && passes(validated);
    if (real) expected.push(f.future[i].entryT);
    if (main) validated.push(values[i]);
    postBase.push(values[i]);
  }
  assert.deepEqual(f.result.trades.map(x => x.entryT), expected);
  assert.equal(expected[0], f.future[4].entryT, "two Main and two Real settlements precede the first Active order");
  assert.ok(f.result.trades.some(x => x.r < 0), "a later failure never removes an admitted loss");
  assert.equal(f.result.trades.at(-1)!.entryT, f.future.at(-1)!.entryT, "the predecessor keeps learning after failure");
  assert.equal(report.sets[0].stages.postBase.closedOrders, values.length);
  assert.equal(report.sets[0].stages.validated.closedOrders, validated.length);
  assert.equal(report.sets[0].stages.active.closedOrders, expected.length);
  assert.equal(f.result.feed.filter(x => x.accepted).length, expected.length);
  assert.equal(report.validation.contexts, 16, "eight symbols × two sides, including empty siblings");
  assert.equal(report.validation.full, 1);
  assert.equal(report.validation.fullPct, 6.25);
  assert.equal(report.seededFromCandidates, false);
  const restored = ProcessedSetBook.restore(JSON.parse(JSON.stringify(report.snapshot)));
  assert.deepEqual(restored.snapshot(), report.snapshot, "model checkpoint survives serialization exactly");
});

test("a raw winning history cannot bootstrap cold or losing processed contexts", () => {
  const f = fixture([-.01, -.01, -.01, -.01, -.01]);
  assert.equal(f.result.trades.length, 0);
  assert.equal(f.result.processedStages!.sets[0].stages.postBase.closedOrders, 5);
  assert.equal(f.result.processedStages!.sets[0].stages.postBase.returnPf, 0);
  assert.equal(f.result.processedStages!.validation.failed, 1);
  assert.equal(f.result.processedStages!.validation.insufficient, 15);
  assert.equal(f.result.processedStages!.real.full, 0);
  const legacy = fixture([-.01, -.01, -.01, -.01, -.01], { processedStages: undefined });
  assert.equal(legacy.result.trades.length, 5, "explicit legacy control reproduces the old behavior");
  assert.equal(legacy.result.processedStages, undefined);
});

test("an unknown settled return remains in the processed window and checkpoint", () => {
  const f = fixture([.02, NaN]);
  assert.equal(f.result.trades.length, 0);
  assert.equal(f.result.processedStages!.validation.unknown, 1);
  assert.equal(f.result.processedStages!.validation.full, 0);
  assert.equal(f.result.processedStages!.sets[0].stages.postBase.unknownReturns, 1);
  const snapshot = ProcessedSetBook.restore(JSON.parse(JSON.stringify(f.result.processedStages!.snapshot))).snapshot();
  assert.equal(snapshot.sets[0].postBase.at(-1)!.unitReturn, null);
});

test("post-Base costs and external volume are not charged or applied twice", () => {
  const values = [.02, -.01, .02, .02, -.01, .02, .02, .02];
  const a = fixture(values), b = fixture(values, { rangeVolumeFactors: { mn: 3 } as never });
  const own = (f: ReturnType<typeof fixture>) => f.result.processedStages!.sets[0].stages;
  for (const stage of ["postBase", "validated", "active"] as const) {
    assert.equal(own(a)[stage].closedOrders, own(b)[stage].closedOrders);
    assert.ok(Math.abs(own(a)[stage].grossProfit - own(b)[stage].grossProfit) < 1e-12);
    assert.ok(Math.abs(own(a)[stage].grossLoss - own(b)[stage].grossLoss) < 1e-12);
  }
  assert.ok(Math.abs(own(a).postBase.grossProfit - .12) < 1e-12);
  assert.ok(Math.abs(own(a).postBase.grossLoss - .02) < 1e-12);
});

test("endpoint marks remain held and cannot complete a processed window", () => {
  const op: OpenPosition = { cfg: id, sym: symbols[0], side: 1, entryI: 0, entryT: T + 45 * M,
    entry: 100, stop: 99, target: 102, peak: 100, trailOn: false, mtm: .02 };
  const f = fixture([.02], {}, [op]), stage = f.result.processedStages!.sets[0].stages.postBase;
  assert.equal(stage.openedOrders, 2);
  assert.equal(stage.closedOrders, 1);
  assert.equal(stage.heldOrders, 1);
  assert.equal(f.result.processedStages!.validation.full, 0);
  const book = ProcessedSetBook.restore(JSON.parse(JSON.stringify(f.result.processedStages!.snapshot)));
  assert.equal(book.snapshot().open.length, 1);
});

test("native non-replay admission fails closed until its persistent adapter exists", () => {
  const { tape, options } = fixture([.02]);
  assert.deepEqual(execDecision(tape, T, options, { sym: symbols[0], side: 1 }),
    { ok: false, why: "processedUnavailable" });
  assert.throws(() => fixture([], { processedStages: { validationN: 0, realN: 2 } }), /policy/);
  assert.throws(() => fixture([], { processedStages: { validationN: 2, realN: 201 } }), /policy/);
});

test("worker transport preserves every processed decision, close, count and empty context", async () => {
  const f = fixture([.02, -.01, .02, .02, -.01, .02, .02, .02]);
  const owner = {};
  try {
    const [reply] = await runOnWorkers<{ sim: WalkForwardResult }>([{ type: "research-real",
      nowT: T + 12 * H, baseTf: 1, packed: packTapes([f.tape]), wf: f.options }],
    1, 30_000, undefined, false, undefined, owner);
    assert.ok(f.result.trades.length > 0);
    assert.deepEqual(reply.sim, f.result);
  } finally { await retireOwnedIdleWorkers(owner); }
});

test("same-time settlements cannot qualify their concurrent entry", () => {
  const f = fixture([]);
  const history = Array.from({ length: 160 }, (_, i) => trade(.02, T - 11 * H + i * 2 * M));
  const next = Array.from({ length: 8 }, (_, i) => trade(.02, T + (i + 1) * M));
  const tape = makeTape(id, "follow", ind, protect, "normal", symbols, [...history, ...next], [], []);
  const result = walkForward(f.universe, [tape], f.options);
  assert.equal(result.trades[0].entryT, next[6].entryT,
    "Main waits one boundary beyond two closes, then Real waits for its own two strictly prior closes");
  assert.equal(result.processedStages!.sets[0].stages.postBase.closedOrders, 8);
});

test("native recent-loss veto uses processed parents without deleting a previously admitted loss", () => {
  const values = [.02, .02, .02, .02, .02, -.001, .02, .02, .02];
  const plain = fixture(values);
  const guarded = fixture(values, { processedStages: { validationN: 2, realN: 2,
    negativeFilter: { windows: [1], mode: "any", maxPf: 1 } } });
  const afterLoss = guarded.future[6].entryT;
  assert.ok(plain.result.trades.some(x => x.entryT === afterLoss));
  assert.equal(guarded.result.trades.some(x => x.entryT === afterLoss), false);
  assert.ok(guarded.result.trades.some(x => x.r < 0));
  assert.equal(guarded.result.processedStages!.sets[0].stages.postBase.closedOrders, values.length);
});

test("native exact symbol and direction windows cannot borrow one another's wins", () => {
  const f = fixture([]), history: Trade[] = [], future: Trade[] = [];
  for (const sym of symbols.slice(0, 2)) for (const side of [1, -1] as const) {
    for (let i = 0; i < 160; i++) history.push(trade(.02, T - 11 * H + i * 2 * M, side, sym));
    for (let i = 0; i < 8; i++) future.push(trade(sym === symbols[0] && side === 1 ? -.01 : .02,
      T + (2 * i + 1) * M, side, sym));
  }
  const tape = makeTape(id, "follow", ind, protect, "normal", symbols,
    [...history, ...future].sort((a, b) => a.exitT - b.exitT), [], []);
  const result = walkForward(f.universe, [tape], f.options);
  assert.equal(result.trades.filter(x => x.sym === symbols[0] && x.side === 1).length, 0);
  for (const [sym, side] of [[symbols[0], -1], [symbols[1], 1], [symbols[1], -1]] as const)
    assert.equal(result.trades.filter(x => x.sym === sym && x.side === side).length, 4);
  assert.equal(result.processedStages!.validation.failed, 1);
  assert.equal(result.processedStages!.validation.qualified, 3);
  assert.equal(result.processedStages!.validation.insufficient, 12);
});
