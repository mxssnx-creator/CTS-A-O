import assert from "node:assert/strict";
import { test } from "node:test";
import { adjustProtect, setKeyOf } from "./adjust.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { ProtectGridSpec } from "./domain/types.ts";
import { barsFromCandles } from "./market/bars.ts";
import { baseRangeProtects, baseRuns, completeBaseRangeProtects, configId, laneProtect, makeUniverse, parseConfigId, protectCellKey } from "./pipeline/pipeline.ts";
import { DEFAULT_PRICE_DISTANCE_GRID, PRICE_STOP_PCTS, PRICE_TRAIL_PCTS } from "./price-distance-grid.ts";
import { basePass } from "./server/runtime.server.ts";
import { checkSettings } from "./settings-check.ts";
import { DEFAULT_GRID, baseAllowsTape, buildTapes, cellAllowed, checkGridVariantBudget, passedCellsOf, protectGrid } from "./sim/walkforward.ts";
import { protectSlRatio, protectStepPct, stepPfFloor } from "./step-pf.ts";

const grid: ProtectGridSpec = {
  ...DEFAULT_GRID, tp: [0.03], holdH: [1], minSl: 0, minTrail: 0, trailingOnly: true,
  priceDistances: { ...DEFAULT_PRICE_DISTANCE_GRID, enabled: true, ranges: ["wide"] },
};

test("all requested price distances and both bases are separate, including trailing-only", () => {
  const ps = protectGrid(15, grid, 0.0005);
  assert.equal(ps.length, 21 * (1 + 25 * 4));
  assert.equal(checkGridVariantBudget(grid, 0.0005), ps.length);
  assert.throws(() => checkGridVariantBudget(grid, 0.0005, ps.length - 1), /protect grid too large/);
  assert.deepEqual([...new Set(ps.map(p => +(p.sl * 100).toFixed(1)))], PRICE_STOP_PCTS);
  assert.deepEqual([...new Set(ps.filter(p => p.trail > 0).map(p => +(p.trail * 100).toFixed(1)))], PRICE_TRAIL_PCTS);
  assert.equal(new Set(ps.map(protectCellKey)).size, ps.length);
  assert.deepEqual(new Set(completeBaseRangeProtects(grid, 0.0005).map(protectCellKey)), new Set(ps.map(protectCellKey)));
  assert.throws(() => checkSettings({ grid: { ...grid, priceDistances: { ...grid.priceDistances!, stopPcts: [0.21] } } }), /0.1 percentage-point/);
});

test("price thresholds respect the cost floor and keep proof bound to the exact gap and stop", () => {
  const ps = protectGrid(15, grid, 0.00176);
  const ind = "ema-21-55@m5";
  const p = laneProtect(ps.find(cell => cell.sl === 0.003 && cell.trail === 0.008 && cell.trailFixed && !cell.trailOnly)!, ind);
  assert.ok(ps.every(cell => cell.sl >= 0.003));
  assert.equal(p.sl, 0.003);
  assert.equal(p.trail, 0.008);
  assert.equal(p.trailFixed, true);
  assert.deepEqual(adjustProtect(p, { minSl: 0.02, minTrail: 0.02, slMult: 2, trailMult: 2 }), p);
  const cfg = configId("follow", ind, p);
  assert.equal(parseConfigId(cfg)?.protect.priceDistance, true);
  assert.equal(parseConfigId(cfg)?.protect.trailFixed, true);
  assert.notEqual(setKeyOf(cfg), setKeyOf(configId("follow", ind, { ...p, sl: 0.004 })));
  assert.notEqual(setKeyOf(cfg), setKeyOf(configId("follow", ind, { ...p, trail: 0.009 })));
  const row = { bot: "follow" as const, ind, protect: p };
  const map = { basePassedCells: passedCellsOf({ [`follow|${ind}`]: [protectCellKey(p)] }) };
  assert.equal(cellAllowed(row, {}), false);
  assert.equal(cellAllowed(row, map), true);
  assert.equal(cellAllowed({ ...row, protect: { ...p, trailFixed: false } }, map), false);
  assert.equal(cellAllowed({ ...row, protect: { ...p, sl: 0.004 } }, map), false);
  const ratio = protectSlRatio(p)!;
  const stepPf = { enabled: true, ratio: 0.2, max: 2, bySlRatio: { [String(Math.round(ratio * 1e8) / 1e8)]: 1.95 } };
  assert.equal(stepPfFloor(1.1, protectStepPct(p), stepPf, ratio), 1.95);
  assert.ok(stepPfFloor(1.1, protectStepPct(p), stepPf, protectSlRatio({ ...p, sl: 0.004 })) < 1.95);
});

test("the untagged Wide range publishes exact native Base cells before building tapes", () => {
  const ind = "ema-9-21@m1", pair = `follow|${ind}`;
  const selected = {
    ...grid, tp: [0.008], trailingOnly: false,
    priceDistances: { ...grid.priceDistances!, stopPcts: [0.3, 0.9], trailPcts: [0.6] },
  };
  const gates = { ...DEFAULT_SETTINGS.gates, positionWindows: null, minTrades: 4, minPf: 1.05,
    baseSetsMinPf: 1.05, rangeMinPf: {}, maxDdr: 0, baseLastN: 0, lastNFloor: 0 };
  const cost = 0.0005;
  const candles = Array.from({ length: 720 }, (_, i) => {
    const p = 100 + 4 * Math.sin(i / 35) + 1.5 * Math.sin(i / 9);
    return { t: Date.UTC(2026, 9, 4) + i * 60_000, o: p, h: p + 0.01, l: p - 0.01, c: p, v: 1 };
  });
  const u = makeUniverse([barsFromCandles("BTC-USDT", 1, candles)]);
  const [run] = baseRuns(u, [{ bot: "follow", ind }], cost, null, false, false, undefined,
    baseRangeProtects(selected, cost), undefined, false, gates, completeBaseRangeProtects(selected, cost), true);
  assert.ok(run.rangeCells?.length);
  const settings = { ...DEFAULT_SETTINGS, grid: selected, gates };
  const proof = basePass([run], settings);
  assert.deepEqual(proof.qualifiedTags[pair], [""]);
  assert.deepEqual(basePass([{ ...run, rangeCells: undefined }], settings).qualifiedTags[pair], undefined);
  const protects = protectGrid(15, selected, cost);
  const one = proof.qualifiedCells[pair][0];
  const tapes = buildTapes(u, protects, cost, undefined, new Set([pair]), null, undefined,
    { minSl: 0, minTrail: 0, pairTags: proof.pairTags, pairCells: { [pair]: [one] } });
  assert.equal(tapes.filter(t => !t.heldOnly).length, 1);
  assert.equal(protectCellKey(tapes[0].protect), one);
  const opts = { basePassedRanges: proof.qualifiedTags, baseWideLadderPairs: new Set([pair]),
    basePassedCells: passedCellsOf({ [pair]: [one] }) };
  const sibling = protects.map(p => laneProtect(p, ind)).find(p => protectCellKey(p) !== one)!;
  assert.equal(baseAllowsTape(tapes[0], opts), true);
  assert.equal(baseAllowsTape({ ...tapes[0], protect: sibling, kind: "axis" }, opts), false);
});
