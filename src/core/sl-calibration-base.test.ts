import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { makeUniverse, rangeBaseStats, rangeCellPass, completeBaseRangeProtects, baseRangeProtects } from "./pipeline/pipeline.ts";
import { buildTapes, protectGrid } from "./sim/walkforward.ts";
import { slCalibrationOf, checkAutoSlRatios, DEFAULT_AUTO_SL } from "./sl-ratios.ts";
import { slWithinBounds, type SlBounds } from "./sl-calibration.ts";
import type { Protect } from "./domain/types.ts";

const ind = "ema-9-21@m1", pair = `follow|${ind}`;
const cost = DEFAULT_SETTINGS.cost, g = DEFAULT_SETTINGS.gates;
const tactics = { ...DEFAULT_SETTINGS.tactics, session: false, volRegime: false, trendStrength: false, cooldown: false };
const universe = () => makeUniverse(Array.from({ length: 2 }, (_, i) =>
  barsFromCandles(`R${i}`, 1, syntheticCandles(`R${i}`, 1, 4000, Date.UTC(2026, 9, 17), 28 + i))));
const RATIOS = [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];
const TP = 0.01;
const cells = (cal?: ReturnType<typeof slCalibrationOf>): Protect[] =>
  RATIOS.map((k) => ({ tp: TP, sl: +(TP * k).toFixed(6), trail: 0, hold: 20, tag: "sh" as const, ...(cal ? { slCal: cal } : {}) }));
const cal = (over = {}) => slCalibrationOf({ ...DEFAULT_AUTO_SL, ...over });
function run(protects: Protect[]) {
  const slOut: Record<string, Record<string, SlBounds>> = {}, tps: Record<string, number[]> = {};
  const out = rangeBaseStats(universe(), "follow", ind, protects, cost, tactics, undefined, false, rangeCellPass(g, ind), 1, tps,
    undefined, undefined, g.baseLastN, g.baseRangeLastN, undefined, undefined, undefined, slOut)!;
  return { out, slOut, tps };
}

it("a policy attaches to a range's Base cells only while it is automatic and adaptive", () => {
  assert.equal(slCalibrationOf(undefined), undefined);
  assert.equal(slCalibrationOf({ ...DEFAULT_AUTO_SL, enabled: false }), undefined, "manual");
  assert.equal(slCalibrationOf({ ...DEFAULT_AUTO_SL, adaptive: false }), undefined, "adaptive off builds every ratio");
  assert.deepEqual(slCalibrationOf(DEFAULT_AUTO_SL), { min: .25, max: 2.5, step: .25, tolerance: .1, minSamples: 20 });
  const grid = { ...DEFAULT_SETTINGS.grid, short: { ...DEFAULT_SETTINGS.grid.short!, slAuto: { ...DEFAULT_AUTO_SL } },
    general: { ...DEFAULT_SETTINGS.grid.general!, slAuto: { ...DEFAULT_AUTO_SL, adaptive: false } } } as typeof DEFAULT_SETTINGS.grid;
  for (const protects of [completeBaseRangeProtects(grid, cost), baseRangeProtects(grid, cost)]) {
    // a trailing-only cell has no target, so no stop ratio to calculate
    const ordinary = (tag: string) => protects.filter((p) => p.tag === tag && !p.trailOnly);
    assert.ok(ordinary("sh").length > 0 && ordinary("sh").every((p) => p.slCal), "adaptive range carries the policy");
    assert.ok(protects.filter((p) => p.trailOnly).every((p) => !p.slCal), "trailing-only cells carry none");
    assert.ok(ordinary("gn").length > 0 && ordinary("gn").every((p) => !p.slCal), "adaptive off carries none");
    assert.ok(ordinary("mn").length > 0 && ordinary("mn").every((p) => !p.slCal), "a range without a saved policy carries none");
  }
});

it("the new policy fields are validated", () => {
  for (const bad of [{ adaptive: "yes" }, { tolerance: -0.1 }, { tolerance: 1 }, { minSamples: 2 }, { minSamples: 1.5 }, { minSamples: 501 }])
    assert.throws(() => checkAutoSlRatios({ ...DEFAULT_AUTO_SL, ...bad }), /Auto SL/, JSON.stringify(bad));
  assert.doesNotThrow(() => checkAutoSlRatios({ ...DEFAULT_AUTO_SL, adaptive: true, tolerance: 0.2, minSamples: 30 }));
});

it("with too few samples every ratio is simulated, exactly as without a policy", () => {
  const plain = run(cells());
  const few = run(cells(cal({ minSamples: 500 })));
  assert.deepEqual(few.out, plain.out);
  assert.deepEqual(few.tps, plain.tps);
  const b = few.slOut.sh?.[String(TP)];
  assert.ok(b, "the record exists even for the defaults");
  assert.deepEqual([b.min, b.max, b.source], [.25, 2.5, "default"]);
});

it("with enough samples the interval lies inside the limits, holds the chosen cell, and is deterministic", () => {
  const a = run(cells(cal({ minSamples: 5 })));
  const b = a.slOut.sh?.[String(TP)];
  assert.ok(b, "bounds recorded for the TP step");
  assert.equal(b.source, "samples");
  assert.ok(b.n >= 5 && b.n <= 40, `uses at most the last N=40 samples (${b.n})`);
  assert.ok(b.min >= .25 - 1e-9 && b.max <= 2.5 + 1e-9 && b.min <= b.max);
  assert.ok(a.out.sh, "the range still has a representative cell");
  assert.ok(slWithinBounds(a.out.sh.slRatio ?? NaN, b), `the representative cell ${a.out.sh.slRatio} is inside [${b.min}, ${b.max}]`);
  assert.deepEqual(run(cells(cal({ minSamples: 5 }))), a, "same data, same bounds");
  // a narrower tolerance can only shrink the interval
  const tight = run(cells(cal({ minSamples: 5, tolerance: 0 }))).slOut.sh[String(TP)];
  assert.ok(tight.min >= b.min - 1e-9 && tight.max <= b.max + 1e-9);
});

it("one candidate ratio leaves nothing to choose between and records nothing", () => {
  const one = run([cells(cal({ minSamples: 5 }))[3]]);
  assert.equal(one.slOut.sh, undefined);
});

it("the tape stage builds only the stop ratios inside the calculated interval", () => {
  const grid = { ...DEFAULT_SETTINGS.grid } as typeof DEFAULT_SETTINGS.grid;
  const u = universe();
  const build = (floors: object) => buildTapes(u, protectGrid(15, grid, cost), cost, undefined, new Set([pair]), null, undefined,
    { minSl: 0, minTrail: 0, pairTags: { [pair]: ["sh"] }, ...floors });
  const all = build({}).filter((t) => t.protect.tag === "sh");
  assert.ok(all.length > 0, "the short range builds cells");
  const tp = all[0].protect.tp;
  const ratios = (ts: typeof all) => [...new Set(ts.filter((t) => t.protect.tp === tp).map((t) => +(t.protect.sl / t.protect.tp).toFixed(4)))].sort((a, b) => a - b);
  const full = ratios(all);
  assert.ok(full.length >= 4, `several ratios without a record: ${full}`);
  const lo = full[1], hi = full[2];
  const bounds: SlBounds = { min: lo, max: hi, source: "samples", n: 30, best: lo };
  const cut = build({ pairSl: { [pair]: { sh: { [String(tp)]: bounds } } } }).filter((t) => t.protect.tag === "sh");
  const kept = ratios(cut);
  assert.deepEqual(kept, full.filter((r) => r >= lo - 1e-9 && r <= hi + 1e-9));
  assert.ok(kept.length < full.length);
  assert.ok(cut.filter((t) => t.protect.tp !== tp).length === all.filter((t) => t.protect.tp !== tp).length, "other TP steps are untouched");
  // the defaults (too few samples) and an unknown target keep everything
  const keep = (b: SlBounds) => build({ pairSl: { [pair]: { sh: { [String(tp)]: b } } } }).filter((t) => t.protect.tag === "sh");
  assert.equal(keep({ ...bounds, source: "default" }).length, all.length);
  assert.equal(build({ pairSl: { [pair]: { sh: { "0.123": bounds } } } }).filter((t) => t.protect.tag === "sh").length, all.length);
});
