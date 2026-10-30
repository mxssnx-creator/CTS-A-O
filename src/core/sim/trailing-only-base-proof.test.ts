import assert from "node:assert/strict";
import { after, test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Candle, Protect } from "../domain/types.ts";
import { DEFAULT_LOW_RANGE_GRID } from "../indications/low-range.ts";
import { barsFromCandles } from "../market/bars.ts";
import { baseRangeProtects, baseRuns, cellStats, completeBaseRangeProtects, configId,
  laneProtect, makeUniverse, protectCellKey, REF_TF } from "../pipeline/pipeline.ts";
import { rangeBaseStats, runPipelineSync, trailingOnlyBaseCountsGen } from "../pipeline/pipeline.ts";
import { closePool, runOnWorkers } from "../server/pool.server.ts";
import { basePass } from "../server/runtime.server.ts";
import { capTrailingOnlyProtect } from "./trailing.ts";
import { baseAllowsTape, buildTapes, cellAllowed, floorsForPairs, passedCellsOf, protectGrid } from "./walkforward.ts";

after(() => closePool());
const M = 60_000, START = Date.UTC(2026, 9, 8, 12), IND = "ema-9-21@m1", PAIR = `follow|${IND}`;
const syms = ["ADA", "APT", "ARB", "ATOM", "AVAX", "BCH", "BNB", "BTC"].map((s) => `${s}-USDT`);
const series = syms.map((sym, i) => Array.from({ length: 24 * 60 }, (_, j): Candle => {
  const px = 100 + 4 * Math.sin((j + i * 7) / 35) + 1.5 * Math.sin((j + i * 11) / 9);
  return { t: START + j * M, o: px, h: px + .01, l: px - .01, c: px, v: 1 };
}));
const bars = (minutes: number) => syms.map((s, i) => barsFromCandles(s, 1, series[i].slice(0, minutes)));
const grid = { ...DEFAULT_SETTINGS.grid, tp: [], holdH: [1], micro: false as const,
  minimal: { ...DEFAULT_SETTINGS.grid.minimal as Exclude<typeof DEFAULT_SETTINGS.grid.minimal, false>,
    tp: [.008], slOfTp: [1.5, 3], trailOfTp: [0, .5], ownBase: true },
  short: false as const, general: false as const, long: false as const,
  lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: false }, minimalPlus: false as const,
  trailingOnly: true, baseCells: false, baseTargets: true };
const gates = { ...DEFAULT_SETTINGS.gates, minTrades: 8, minPf: .6, baseSetsMinPf: .6,
  baseLastN: 0, baseRangeLastN: { micro: 0, minimal: 0 },
  rangeMinPf: { ...DEFAULT_SETTINGS.gates.rangeMinPf, minimal: 4 }, lastNFloor: 0,
  maxDdr: 0, minDdtH: 0, maxDdtH: 0 };
const settings = { ...DEFAULT_SETTINGS, grid, gates }, cost = settings.cost;
const candidates = completeBaseRangeProtects(grid, cost).filter((p) => p.trailOnly && p.tag === "mn");
const proofKey = (p: Protect) => protectCellKey(capTrailingOnlyProtect(laneProtect(p, IND)));
const runs = () => baseRuns(makeUniverse(bars(12 * 60)), [{ bot: "follow", ind: IND }], cost, null,
  false, false, undefined, baseRangeProtects(grid, cost), undefined, false, gates,
  completeBaseRangeProtects(grid, cost), false);

test("each trailing-only stop is independently proved before construction and selection", () => {
  assert.equal(candidates.length, 2);
  const pre = makeUniverse(bars(12 * 60));
  const a = cellStats(pre, "follow", IND, candidates[0], cost)!;
  const b = cellStats(pre, "follow", IND, candidates[1], cost)!;
  assert.ok(a.n >= 8 && b.n >= 8 && a.pf > 4 && b.pf < 4, "both cells are real distinct Base histories");
  const [run] = runs();
  assert.deepEqual(run.trailingOnlyCells, [proofKey(candidates[0])]);
  const stats = run.trailingOnlyStats?.mn; assert.ok(stats);
  assert.equal(stats.evaluated, 2); assert.equal(stats.passed, 1); assert.equal(stats.unavailable, 0);
  assert.ok(Math.abs(stats.passedGp - a.gp!) < 1e-10 && Math.abs(stats.passedGl - a.gl!) < 1e-10,
    "the displayed pool includes the passed cell's true returns only");
  const counting = trailingOnlyBaseCountsGen([run], (_bot, _ind, tag) => tag === "mn");
  let row = counting.next(); while (!row.done) row = counting.next();
  assert.deepEqual(row.value, [{ tag: "mn", ...stats }]);
  const base = basePass([run], settings);
  assert.deepEqual(base.pairTrailingOnlyCells[PAIR], [proofKey(candidates[0])]);
  assert.ok(!base.qualifiedTps[PAIR]?.mn?.includes(0), "a no-TP result cannot qualify a positive-target sibling");
  const floors = { minSl: 0, minTrail: 0, pairTags: base.pairTags, pairTps: base.pairTps,
    pairTrailingOnlyCells: base.pairTrailingOnlyCells };
  const all = protectGrid(REF_TF, grid, cost);
  const built = buildTapes(makeUniverse(bars(24 * 60)), all, cost, undefined, new Set([PAIR]), null, undefined, floors);
  const only = built.filter((t) => t.kind === "trailing-only");
  assert.equal(only.length, 1); assert.equal(protectCellKey(only[0].protect), proofKey(candidates[0]));
  const published = { basePassed: new Set([PAIR]), basePassedRanges: base.qualifiedTags,
    basePassedTargets: base.qualifiedTps, basePassedTrailingOnlyCells: passedCellsOf(base.pairTrailingOnlyCells) };
  assert.equal(baseAllowsTape(only[0], published), true);
  const failed = { ...only[0], protect: capTrailingOnlyProtect(laneProtect(candidates[1], IND)) };
  assert.equal(baseAllowsTape(failed, published), false, "a worse sibling cannot borrow the passing zero target");

  const standalone = basePass([{ ...run, full: { ...run.full, n: 0, pf: 0, net: 0 },
    ranges: undefined, rangeTps: undefined }], settings);
  assert.ok(standalone.qualified.some((x) => `${x.bot}|${x.ind}` === PAIR), "no-TP can qualify independently");
  assert.deepEqual(standalone.qualifiedTags[PAIR], [], "no-TP must not qualify ordinary strategy ranges");
  const independent = buildTapes(makeUniverse(bars(24 * 60)), all, cost, undefined, new Set([PAIR]), null, undefined,
    { ...floors, pairTags: standalone.pairTags, pairTps: standalone.pairTps,
      pairTrailingOnlyCells: standalone.pairTrailingOnlyCells });
  assert.deepEqual(independent.filter((t) => !t.heldOnly).map((t) => t.kind), ["trailing-only"]);
  const independentAdmission = { basePassed: new Set([PAIR]), basePassedRanges: standalone.qualifiedTags,
    basePassedTargets: standalone.qualifiedTps, basePassedTrailingOnlyCells: passedCellsOf(standalone.pairTrailingOnlyCells) };
  assert.equal(baseAllowsTape(independent[0], independentAdmission), true);
  assert.equal(baseAllowsTape({ ...independent[0], kind: "normal", protect: { ...independent[0].protect,
    trailOnly: false, tp: .008, trail: 0 } }, independentAdmission), false, "ordinary cannot borrow no-TP qualification");
  assert.equal(standalone.wideLadderPairs.has(PAIR), false, "no-TP cannot qualify a Wide ladder");

  const set = `${PAIR}|trailing-only`;
  const adjust = { [set]: { set, level: 1, minSl: 0, minTrail: 0, pausedUntil: 0, pf: 1, n: 8,
    lastExitT: 0, at: 0, note: "fixture", slMult: 2 } };
  const changed = buildTapes(makeUniverse(bars(24 * 60)), all, cost, undefined, new Set([PAIR]), null, adjust, floors);
  assert.equal(changed.filter((t) => t.kind === "trailing-only").length, 0,
    "feedback cannot change a proven stop and borrow the unadjusted cell's proof");

  const heldId = configId("follow", IND, failed.protect);
  const held = buildTapes(makeUniverse(bars(24 * 60)), all, cost, undefined, new Set([PAIR]), null, undefined,
    { ...floors, heldIds: new Set([heldId]) }).find((t) => t.id === heldId);
  assert.ok(held?.heldOnly, "a previously opened unqualified order is still rebuilt for its protection");
  assert.equal(baseAllowsTape(held, published), false, "held-only is never a new admission");

  const missing = basePass([{ ...run, trailingOnlyCells: undefined }], settings);
  assert.deepEqual(missing.pairTrailingOnlyCells[PAIR], [], "missing proof fails closed");
  const unproven = buildTapes(makeUniverse(bars(24 * 60)), all, cost, undefined, new Set([PAIR]), null, undefined,
    { ...floors, pairTrailingOnlyCells: missing.pairTrailingOnlyCells });
  assert.equal(unproven.filter((t) => t.kind === "trailing-only").length, 0);
  assert.equal(cellAllowed(only[0], { basePassedTrailingOnlyCells: passedCellsOf(missing.pairTrailingOnlyCells) }), false);
  const expanded = basePass([run], { ...settings, grid: { ...grid, allSets: true } });
  assert.deepEqual(expanded.pairTrailingOnlyCells[PAIR], base.pairTrailingOnlyCells[PAIR], "diagnostics cannot widen proof");
  assert.deepEqual(floorsForPairs(floors)(["other|x"]).pairTrailingOnlyCells, {}, "worker partitions cannot borrow another pair's proof");
  assert.equal(cellAllowed({ ...only[0], ind: "sig-ema-cross-s@m1" }, { basePassedTrailingOnlyCells: {} }), true,
    "Signal's independent admission path is not gated by engine no-TP cells");
  assert.equal(cellAllowed({ ...only[0], kind: "exit" }, { basePassedTrailingOnlyCells: {} }), true,
    "Historic Exit retains its separate admission path");
});

test("worker and in-process Base publish the same trailing-only cell proofs", async () => {
  const input = bars(12 * 60), combos = [{ bot: "follow" as const, ind: IND }];
  const rp = baseRangeProtects(grid, cost), complete = completeBaseRangeProtects(grid, cost);
  const local = runs();
  const remote = await runOnWorkers<{ runsJson: string[] }>([{ type: "s1", bars: input, combos, cost,
    tactics: null, rangeProtects: rp, completeRangeProtects: complete, microOwnInds: false, gates, cells: false }], 1);
  const result = remote.flatMap((x) => x.runsJson.flatMap((chunk) => JSON.parse(chunk)));
  assert.deepEqual(result[0].trailingOnlyCells, local[0].trailingOnlyCells);
  assert.deepEqual(result[0].trailingOnlyStats, local[0].trailingOnlyStats);
  assert.deepEqual(result[0].rangeTps, local[0].rangeTps);
  assert.deepEqual(result[0].ranges, local[0].ranges);
});

test("the complete in-process pipeline publishes the worker's independent Base proofs", () => {
  const s = { ...settings, focus: [PAIR], tfs: [1], refineTop: 0, mainTop: 0, evalTop: 0,
    tactics: { ...settings.tactics, session: false, volRegime: false, trendStrength: false, cooldown: false },
    signals: { ...settings.signals, enabled: false } };
  const combo = [{ bot: "follow" as const, ind: IND }];
  const local = baseRuns(makeUniverse(bars(12 * 60)), combo, cost, s.tactics, false, false, undefined,
    baseRangeProtects(grid, cost), undefined, false, gates, completeBaseRangeProtects(grid, cost), false)[0];
  const pipeline = runPipelineSync(makeUniverse(bars(12 * 60)), s);
  const row = pipeline.s1.find((x) => x.bot === "follow" && x.ind === IND);
  assert.ok(row); assert.deepEqual(row.trailingOnlyCells, local.trailingOnlyCells);
  assert.deepEqual(row.trailingOnlyStats, local.trailingOnlyStats);
});

test("Minimal Plus generated trailing-only cells match the executable grid", () => {
  const g = { ...grid, minimalPlus: { ...DEFAULT_SETTINGS.grid.minimalPlus as Exclude<typeof DEFAULT_SETTINGS.grid.minimalPlus, false>,
    enabled: true, tp: [.01], slOfTp: [1.2, 2], trailOfTp: [.4, .5],
    cells: [{ tp: .01, sl: .012, trail: .004 }, { tp: .01, sl: .02, trail: .005 },
      { tp: .01, sl: .012, trail: .004 }] } };
  const keys = (ps: Protect[]) => ps.filter((p) => p.tag === "mp").map(protectCellKey).sort();
  assert.deepEqual(keys(completeBaseRangeProtects(g, cost)), keys(protectGrid(REF_TF, g, cost)));
  assert.ok(completeBaseRangeProtects(g, cost).some((p) => p.tag === "mp" && p.trailOnly));
});

test("draft Last-N-only no-TP statistics report the same recent window that qualified", () => {
  const pre = makeUniverse(bars(12 * 60)), candidate = candidates[0], proof: string[] = [];
  const recent = cellStats(pre, "follow", IND, candidate, cost, null, undefined, 12)!;
  assert.ok(recent.baseLast && recent.baseLast.n === 12 && recent.n > 12);
  const counts: Record<string, { evaluated: number; passed: number; unavailable: number;
    passedGp: number; passedGl: number; unknownPassed: number }> = {};
  rangeBaseStats(pre, "follow", IND, [candidate], cost, null, undefined, false, () => true, 1,
    undefined, undefined, undefined, 12, true, { micro: 12, minimal: 12 }, proof, counts);
  assert.equal(proof.length, 1); assert.equal(counts.mn.passed, 1);
  assert.equal(counts.mn.passedGp, recent.baseLast.gp); assert.equal(counts.mn.passedGl, recent.baseLast.gl);
  assert.notEqual(counts.mn.passedGp, recent.gp, "the displayed pool cannot silently switch to full-history returns");
});
