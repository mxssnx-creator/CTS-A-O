import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Protect, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { ProcessedSetBook } from "./processed-set.ts";
import { ProcessedReplay } from "./processed-replay.ts";
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
  assert.equal(report.validation.passingWindows.evaluated, 16);
  assert.equal(report.validation.passingWindows.passed, 1);
  assert.equal(report.validation.passingWindows.setPf?.noLossSets, 1, "the finite gate sentinel is not reported as PF");
  assert.equal(report.seededFromCandidates, false);
  const restored = ProcessedSetBook.restore(JSON.parse(JSON.stringify(report.snapshot)));
  assert.deepEqual(restored.snapshot(), report.snapshot, "model checkpoint survives serialization exactly");
});

test("summary-only replay retains the same decisions and coverage without copying its checkpoint", () => {
  const values = [.02, .02, .02, .02, .02, -.04, .02, .02, .02, .02];
  const full = fixture(values).result;
  const lean = fixture(values, { processedStages: { validationN: 2, realN: 2, reportDetail: "summary" } }).result;
  assert.ok(full.processedStages?.snapshot);
  assert.equal(lean.processedStages, undefined);
  assert.ok(lean.processedStageSummary);
  assert.deepEqual(lean.processedStageSummary!.validation, full.processedStages!.validation);
  assert.deepEqual(lean.processedStageSummary!.real, full.processedStages!.real);
  for (const key of ["trades", "skips", "steps", "stats", "feed"] as const)
    assert.deepEqual(lean[key], full[key], key);
});

test("compact modeled parent IDs remain scoped to exact config, symbol, side and onset", () => {
  const compact = new ProcessedReplay({ validationN: 2, realN: 2, reportDetail: "summary" }, .001);
  const full = new ProcessedReplay({ validationN: 2, realN: 2 }, .001);
  const tp = { id, kind: "normal", ind }, other = { ...tp, id: `${id}|other` };
  const scopes = [[tp, symbols[0], 1], [tp, symbols[0], -1], [tp, symbols[1], 1], [other, symbols[0], 1]] as const;
  const small = scopes.map(([cfg, sym, side]) => compact.enter(cfg, sym, side, T, 1.1));
  const normal = scopes.map(([cfg, sym, side]) => full.enter(cfg, sym, side, T, 1.1));
  assert.equal(new Set(small.map(x => x.entryId)).size, 1, "the containing identity supplies the independent scope");
  assert.equal(new Set(normal.map(x => x.entryId)).size, scopes.length, "full checkpoints retain their existing IDs");
  assert.throws(() => compact.enter(tp, symbols[0], 1, T, 1.1), /duplicate processed entry/);
  for (const x of small) compact.settle(x, T + 1, .02);
  for (const x of normal) full.settle(x, T + 1, .02);
  const identities = scopes.map(([cfg, sym, side]) => ({ identity: compact.identity(cfg, sym, side, 1.1), minPf: 1.1 }));
  const run = (p: ProcessedReplay) => {
    const g = p.reportGen(T + 2, identities, "summary");
    for (let next = g.next(); ; next = g.next()) if (next.done) return next.value;
  };
  assert.deepEqual(run(compact), run(full));
  const snapshot = compact.book.snapshot();
  assert.deepEqual(ProcessedSetBook.restore(JSON.parse(JSON.stringify(snapshot))).snapshot(), snapshot);
});

test("large modeled coverage scans yield while retaining empty contexts", () => {
  const p = new ProcessedReplay({ validationN: 2, realN: 2 }, .001);
  function* contexts() {
    for (let i = 0; i < 12_000; i++) yield { identity: p.identity({ id: `cfg-${i}`, ind, kind: "normal" },
      symbols[0], 1, 1.1), minPf: 1.1 };
  }
  const gen = p.reportGen(T, contexts(), "summary");
  let yields = 0, next = gen.next();
  while (!next.done) { yields++; next = gen.next(); }
  assert.ok(yields > 0, "a large coverage pass must give control back to the event loop");
  assert.equal(next.value.validation.contexts, 12_000);
  assert.equal(next.value.validation.insufficient, 12_000);
  assert.equal("snapshot" in next.value, false);
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

test("Base-approved siblings warm their own stages despite empty raw seats", () => {
  const f = fixture([.02, .02, .02, .02, .02, -.01]);
  const siblingProtect = { ...protect, tp: .03 };
  const siblingId = configId("follow", ind, siblingProtect);
  const baseHistory = [trade(-.01, T - M * 3), trade(-.01, T - M * 2)];
  const losingShorts = f.future.map(row => trade(-.02, row.entryT, -1, symbols[0], siblingId));
  const longTape = makeTape(id, "follow", ind, protect, "normal", symbols, [...baseHistory, ...f.future], [], []);
  const shortTape = makeTape(siblingId, "follow", ind, siblingProtect, "normal", symbols, losingShorts, [], []);
  const options = { ...f.options, onePerPairEvent: false, recordValidation: "summary" as const };
  const sim = walkForward(f.universe, [longTape, shortTape], options);
  assert.equal(sim.steps[0].validationSummary?.passed, 0);
  const own = sim.processedStages!.sets.find(set => set.identity.baseConfigId === id)!;
  const other = sim.processedStages!.sets.find(set => set.identity.baseConfigId === siblingId)!;
  assert.equal(own.stages.postBase.closedOrders, 6);
  assert.equal(other.stages.postBase.closedOrders, 6);
  assert.equal(other.stages.validated.closedOrders, 0);
  assert.deepEqual(sim.trades.map(row => [row.cfg, row.side, row.r]), [[id, 1, .02], [id, 1, -.01]]);
  assert.equal(walkForward(f.universe, [longTape, shortTape], { ...options,
    validated: new Set<string>() }).processedStages!.sets.length, 0, "explicit frozen selection remains authoritative");
  assert.equal(walkForward(f.universe, [longTape, shortTape], { ...options,
    basePassed: new Set<string>() }).processedStages!.sets.length, 0, "a failed Base batch never enters the book");
});

test("siblings can collect warmup at the same onset while Active still spends one pair-event slot", () => {
  const f = fixture([.02, .02, .02, .02, .02, .02]);
  const otherProtect = { ...protect, tp: .03 };
  const otherId = configId("follow", ind, otherProtect);
  const other = makeTape(otherId, "follow", ind, otherProtect, "normal", symbols,
    f.future.map(row => ({ ...row, cfg: otherId })), [], []);
  const simulation = walkForward(f.universe, [f.tape, other], { ...f.options, onePerPairEvent: true });
  const sets = simulation.processedStages!.sets;
  assert.equal(sets.length, 2);
  assert.ok(sets.every(set => set.stages.postBase.closedOrders >= 4));
  assert.ok(sets.every(set => set.stages.validated.closedOrders >= 2));
  assert.equal(simulation.trades.length, 2);
  assert.equal(simulation.skips.pairEvent, 2);
});

test("an unqualified warmup order does not consume a funded Active slot", () => {
  const f = fixture([.02, .02, .02, .02, .02, .02]);
  const otherProtect = { ...protect, tp: .03 };
  const otherId = configId("follow", ind, otherProtect);
  for (const conflict of [false, true]) {
    const warmup = { ...trade(.02, T + 8 * M + M / 2, conflict ? -1 : 1,
      conflict ? symbols[0] : symbols[1], otherId), exitT: T + 13 * M };
    const other = makeTape(otherId, "follow", ind, otherProtect, "normal", symbols, [warmup], [], []);
    const sim = walkForward(f.universe, [f.tape, other], {
      ...f.options, onePerPairEvent: false, maxOpen: 1, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0,
      coord: { ...f.options.coord!, enabled: conflict, conflict },
    });
    assert.deepEqual(sim.trades.map(row => row.entryT), [f.future[4].entryT, f.future[5].entryT]);
    const warmupSet = sim.processedStages!.sets.find(set => set.identity.baseConfigId === otherId)!;
    assert.equal(warmupSet.stages.postBase.closedOrders, 1);
    assert.equal(warmupSet.stages.active.openedOrders, 0);
  }
});

test("Active exposure does not block a modeled predecessor or bypass its own caps", () => {
  const f = fixture([.02, .02, .02, .02, .02, .02]);
  const otherProtect = { ...protect, tp: .03 };
  const otherId = configId("follow", ind, otherProtect);
  const history = Array.from({ length: 160 }, (_, i) => trade(.02, T - 11 * H + i * 2 * M));
  const longer = f.future.map((row, i) => i === 4 ? { ...row, exitT: T + 13 * M } : row);
  const main = makeTape(id, "follow", ind, protect, "normal", symbols,
    [...history, ...longer].sort((a, b) => a.exitT - b.exitT), [], []);
  const warmup = { ...trade(.02, T + 9 * M + M / 2, -1, symbols[0], otherId), exitT: T + 14 * M };
  const other = makeTape(otherId, "follow", ind, otherProtect, "normal", symbols, [warmup], [], []);
  const sim = walkForward(f.universe, [main, other], {
    ...f.options, onePerPairEvent: false, maxOpen: 1, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0,
    coord: { ...f.options.coord!, enabled: true, conflict: true },
  });
  assert.deepEqual(sim.trades.map(row => row.entryT), [f.future[4].entryT], "Active still honors its own duplicate guard");
  const warmupSet = sim.processedStages!.sets.find(set => set.identity.baseConfigId === otherId)!;
  assert.equal(warmupSet.stages.postBase.closedOrders, 1);
  assert.equal(warmupSet.stages.active.openedOrders, 0);
});

test("two independently qualified Active sets still share the configured execution cap", () => {
  const f = fixture([.02, .02, .02, .02, .02, .02]);
  const otherProtect = { ...protect, tp: .03 };
  const otherId = configId("follow", ind, otherProtect);
  const history = Array.from({ length: 160 }, (_, i) => trade(.02, T - 11 * H + i * 2 * M));
  const longer = f.future.map((row, i) => i === 4 ? { ...row, exitT: T + 13 * M } : row);
  const main = makeTape(id, "follow", ind, protect, "normal", symbols,
    [...history, ...longer].sort((a, b) => a.exitT - b.exitT), [], []);
  const otherRows = Array.from({ length: 5 }, (_, i) => trade(.02, T + (2 * i + 2) * M, 1, symbols[1], otherId));
  const other = makeTape(otherId, "follow", ind, otherProtect, "normal", symbols, otherRows, [], []);
  const sim = walkForward(f.universe, [main, other], {
    ...f.options, onePerPairEvent: false, maxOpen: 1, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0,
  });
  assert.equal(sim.trades.filter(row => row.cfg === id).length, 1);
  assert.equal(sim.trades.filter(row => row.cfg === otherId).length, 0);
  assert.equal(sim.skips.maxOpen, 1);
  const own = sim.processedStages!.sets.find(set => set.identity.baseConfigId === otherId)!;
  assert.equal(own.stages.validated.closedOrders, 2, "the blocked candidate had already qualified both predecessor windows");
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
  const lean = fixture([.02, -.01, .02, .02, -.01, .02, .02, .02],
    { processedStages: { validationN: 2, realN: 2, reportDetail: "summary" } });
  const owner = {};
  try {
    const [reply, summaryReply] = await runOnWorkers<{ sim: WalkForwardResult }>([{ type: "research-real",
      nowT: T + 12 * H, baseTf: 1, packed: packTapes([f.tape]), wf: f.options }, { type: "research-real",
      nowT: T + 12 * H, baseTf: 1, packed: packTapes([lean.tape]), wf: lean.options }],
    1, 30_000, undefined, false, undefined, owner);
    assert.ok(f.result.trades.length > 0);
    assert.deepEqual(reply.sim, f.result);
    assert.deepEqual(summaryReply.sim, lean.result);
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

test("causal modeled warmup keeps pre-start positions and losses out of the funded account", () => {
  const f = fixture([]), begin = T - H;
  const older = Array.from({ length: 80 }, (_, i) => trade(.02, T - 11 * H + i * 2 * M));
  const learning = Array.from({ length: 4 }, (_, i) => trade(.02, begin + (2 * i + 1) * M));
  const ghost = { ...trade(-.10, T - 2 * M), exitT: T + 3 * M };
  const target = [trade(.02, T + M), trade(.02, T + 4 * M)];
  const tape = makeTape(id, 'follow', ind, protect, 'normal', symbols,
    [...older, ...learning, ghost, ...target].sort((a, b) => a.exitT - b.exitT), [], []);
  const options = { ...f.options, simH: 1, startT: T, causalBase: true,
    processedWarmup: { fromT: begin, untilT: T, baseCutT: begin },
    onePerPairEvent: false, maxOpen: 1, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0 };
  const result = walkForward(f.universe, [tape], options);
  assert.deepEqual(result.processedWarmup, { fromT: begin, untilT: T, baseCutT: begin });
  assert.equal(result.startT, T); assert.equal(result.endT, T + H); assert.equal(result.steps.length, 1);
  assert.deepEqual(result.trades.map(row => row.entryT), [T + M],
    'the ghost does not consume the target account slot, but its later settled loss rejects subsequent entries');
  assert.equal(result.trades[0].r, .02);
  assert.equal(result.skips['processed:validation:failed'], 1);
  assert.ok(result.feed.every(row => row.entryT !== undefined && row.entryT >= T), 'reported candidate feed excludes historical entries');
  const own = result.processedStages!.sets.find(row => row.identity.baseConfigId === id)!;
  assert.equal(own.stages.postBase.closedOrders, 7, 'modeled stage evidence includes its own warmup closes and loss');
  assert.equal(own.stages.active.closedOrders, 2, 'modeled Active includes ghost and the target order');
  assert.throws(() => walkForward(f.universe, [tape], { ...options, causalBase: false }), /pre-warmup causal Base/);
  assert.throws(() => walkForward(f.universe, [tape], { ...options, processedWarmup: { fromT: begin, untilT: T, baseCutT: T } }), /pre-warmup causal Base/);
  assert.throws(() => walkForward(f.universe, [tape], { ...options, processedStages: undefined }), /pre-warmup causal Base/);
});

test("a historical loss across the boundary cannot trip the target account hour guard", () => {
  const f = fixture([]), begin = T - H, siblingProtect = { ...protect, tp: .03 };
  const siblingId = configId('follow', ind, siblingProtect);
  const older = Array.from({ length: 80 }, (_, i) => trade(.02, T - 11 * H + i * 2 * M));
  const prior = Array.from({ length: 4 }, (_, i) => trade(.02, begin + (2 * i + 1) * M));
  const ghost = { ...trade(-.10, T - 2 * M), exitT: T + 3 * M };
  const main = makeTape(id, 'follow', ind, protect, 'normal', symbols,
    [...older, ...prior, ghost].sort((a, b) => a.exitT - b.exitT), [], []);
  const otherPrior = prior.map(row => ({ ...row, cfg: siblingId, sym: symbols[1], entryT: row.entryT + M, exitT: row.exitT + M }));
  const target = trade(.02, T + 4 * M, 1, symbols[1], siblingId);
  const other = makeTape(siblingId, 'follow', ind, siblingProtect, 'normal', symbols,
    [...otherPrior, target], [], []);
  const result = walkForward(f.universe, [main, other], { ...f.options, simH: 1, startT: T,
    causalBase: true, processedWarmup: { fromT: begin, untilT: T, baseCutT: begin },
    onePerPairEvent: false, maxOpen: 1, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0, guardPct: 1 });
  assert.deepEqual(result.trades.map(row => [row.cfg, row.entryT]), [[siblingId, T + 4 * M]],
    JSON.stringify({ skips: result.skips, sets: result.processedStages?.sets }));
  assert.equal(result.skips.hourGuard ?? 0, 0, 'a model-only loss is not a funded loss');
  assert.equal(result.processedStages!.sets.find(row => row.identity.baseConfigId === id)!.stages.postBase.grossLoss, .1,
    'the same loss remains in its own modeled stage');
});

test("a pre-start modeled position cannot conflict with the opposite funded direction", () => {
  const f = fixture([]), begin = T - H;
  const prior = Array.from({ length: 4 }, (_, i) => [
    trade(.02, begin + (2 * i + 1) * M, 1), trade(.02, begin + (2 * i + 2) * M, -1),
  ]).flat();
  const ghost = { ...trade(.02, T - 2 * M), exitT: T + 5 * M };
  const target = trade(.02, T + M, -1);
  const tape = makeTape(id, 'follow', ind, protect, 'normal', symbols,
    [...prior, ghost, target].sort((a, b) => a.exitT - b.exitT), [], []);
  const result = walkForward(f.universe, [tape], { ...f.options, simH: 1, startT: T,
    causalBase: true, processedWarmup: { fromT: begin, untilT: T, baseCutT: begin },
    onePerPairEvent: false, maxOpen: 1, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0,
    coord: { ...f.options.coord!, enabled: true, conflict: true } });
  assert.deepEqual(result.trades.map(row => [row.entryT, row.side]), [[T + M, -1]], JSON.stringify(result.skips));
  assert.equal(result.skips.conflict ?? 0, 0);
});
