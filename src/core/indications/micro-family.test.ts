import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import {
  MICRO_CONFIG_IDS,
  MICRO_METHODS,
  MICRO_PROFILES,
  MICRO_SUBSETS,
  microFamilySpecs,
  inverseMicroSpecs,
  INVERSE_MICRO_CONFIG_IDS,
  microFrame,
  microPriorExtrema,
} from "./micro-family.ts";
import { barsFromCandles, headBars, resample, syntheticCandles } from "../market/bars.ts";
import { SeriesCache } from "./cache.ts";
import { INDICATION_BY_ID, indicationState } from "./registry.ts";
import {
  allCombos,
  completeBaseRangeProtects,
  baseRuns,
  makeUniverse,
  rangeAppliesTo,
  type ComboRun,
} from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { minPfOf } from "../minimal-coord.ts";
import { buildTapes, protectGrid } from "../sim/walkforward.ts";
import { exitStrategyPairs } from "../exit-strategy.ts";
import { checkSettings } from "../settings-check.ts";
import { closePool, runOnWorkers } from "../server/pool.server.ts";
import type { Bars, Protect } from "../domain/types.ts";

const end = Date.UTC(2026, 9, 1);
function fixture() {
  return ["A", "B", "C"].flatMap((sym) => {
    const candles = syntheticCandles(sym, 1, 2700, end, 17);
    return [1, 5, 15].map((tf) => ({
      ...barsFromCandles(`${sym}-USDT`, tf, resample(candles, 1, tf)),
      lanes: [1, 5, 15],
    }));
  });
}
after(() => closePool());
describe("first-class Micro", () => {
  it("registers every method/profile/subset once and computes only its own anchor", () => {
    assert.equal(MICRO_CONFIG_IDS.length, 308);
    assert.equal(new Set(MICRO_CONFIG_IDS).size, 308);
    for (const id of MICRO_CONFIG_IDS) assert.equal(INDICATION_BY_ID.get(id)?.kind, "micro");
    const combos = allCombos(
      MICRO_CONFIG_IDS.map((id) => `follow|${id}`),
      [],
      [1, 5, 15],
    );
    assert.equal(combos.length, 308);
    assert.equal(new Set(combos.map((c) => c.ind)).size, 308);
    assert.ok(
      combos.every((c) => !c.ind.endsWith("c")),
      "explicit subsets never spawn duplicate combined lanes",
    );
    assert.equal(
      allCombos(
        MICRO_CONFIG_IDS.map((id) => `follow|${id}`),
        ["micro"],
        [1, 5, 15],
      ).length,
      0,
    );
    assert.doesNotThrow(() => checkSettings(DEFAULT_SETTINGS));
    assert.ok(DEFAULT_SETTINGS.focus.includes("follow|micro-1x5x15-adaptive-selective"));
  });
  it("uses prior extrema, excludes the current spike, and handles invalid windows", () => {
    const a = microPriorExtrema(Float64Array.from([2, 3, 1, 100, 4, NaN, 8, 7, 6, 5]), 3);
    assert.equal(a.high[3], 3);
    assert.equal(a.low[3], 1);
    assert.equal(a.high[4], 100);
    assert.ok(Number.isNaN(a.high[7]));
    assert.equal(a.high[9], 8);
    assert.throws(() => microPriorExtrema(new Float64Array(), 0));
  });
  it("matches prefix-only universes for all subsets and leaves no-market relations neutral", () => {
    const bars = fixture(),
      full = makeUniverse(bars);
    let long = 0,
      short = 0;
    for (const cut of [end - 8 * 60_000, end - 17 * 60_000]) {
      const prefix = makeUniverse(bars.map((b) => headBars(b, cut)));
      for (const spec of microFamilySpecs()) {
        const tf = spec.params.anchor;
        const s = bars.findIndex((b) => b.tfMin === tf);
        const a = indicationState(spec.id, full.caches[s])!;
        const p = indicationState(spec.id, prefix.caches[s])!;
        assert.deepEqual(a.slice(0, p.length), p, spec.id);
        long += a.filter((x) => x === 1).length;
        short += a.filter((x) => x === -1).length;
      }
    }
    assert.ok(long > 0 && short > 0, `${long} long, ${short} short events`);
    const noMarket = microFrame(new SeriesCache(bars[0]), "fast");
    for (const method of [
      "residual-revert",
      "market-follow",
      "drawdown-residual",
      "drawdown-market",
    ] as const)
      assert.ok(
        noMarket.states[method].every((x) => x === 0),
        method,
      );
  });
  it("resets readiness across data gaps and supports genuine 5-second bars", () => {
    const b = fixture()[0];
    const g: Bars = { ...b, t: b.t.slice() };
    for (let i = 2000; i < g.n; i++) g.t[i] += 60_000;
    const frame = microFrame(new SeriesCache(g), "selective");
    assert.ok(frame.ready.slice(2000, 2047).every((x) => x === 0));
    assert.equal(frame.ready[2047], 1);
    const fastBars: Bars = {
      ...b,
      tfMin: 1 / 12,
      t: Float64Array.from(b.t, (_, i) => end + i * 5000),
    };
    const fast = microFrame(new SeriesCache(fastBars), "fast");
    assert.equal(fast.ready.at(-1), 1);
    assert.ok(fast.states.adaptive.some((x) => x !== 0));
  });
  it("keeps Micro/Minimal/Short and TP, SL, trailing identities independently computable", () => {
    const ind = "micro-1-drawdown-turn-fast@m1";
    for (const tag of ["mc", "mn", "sh", "gn", "lg"])
      assert.equal(
        rangeAppliesTo(ind, tag, { enabled: () => true, microOwnInds: "minimal" }),
        true,
      );
    assert.equal(minPfOf({ minPf: 1.05 }, "mc", ind), 1.1);
    assert.equal(minPfOf({ minPf: 1.5 }, "mc", ind), 1.5);
    const protects: Protect[] = ["mc", "mn", "sh"].flatMap((tag) =>
      [0, 0.003].map((trail) => ({
        tag: tag as Protect["tag"],
        tp: 0.01,
        sl: 0.015,
        trail,
        hold: 30,
      })),
    );
    const tapes = buildTapes(
      makeUniverse(fixture()),
      protects,
      0.0015,
      undefined,
      new Set([`follow|${ind}`]),
      null,
      undefined,
      { minSl: 0, minTrail: 0, microOwnInds: "minimal" },
    );
    assert.equal(tapes.length, 6);
    assert.equal(new Set(tapes.map((t) => t.id)).size, 6);
    assert.deepEqual([...new Set(tapes.map((t) => t.kind))].sort(), ["normal", "trailing"]);
    assert.ok(tapes.every((t) => t.n > 0));
  });
  it("adds Bot-free Exit sources independently and respects the type switch", () => {
    const u = makeUniverse(fixture());
    const settings = {
      ...DEFAULT_SETTINGS.exitStrategy,
      includeTactics: false,
      includeRelations: false,
      includeMicro: true,
    };
    const pairs = exitStrategyPairs([], u, settings);
    assert.equal(pairs.length, 308);
    assert.ok(pairs.every((pair) => pair.startsWith("exit|micro-") && !pair.endsWith("c")));
    assert.equal(exitStrategyPairs([], u, settings, ["micro"]).length, 0);
    assert.equal(exitStrategyPairs([], u, { ...settings, includeMicro: false }).length, 0);
  });
  it(
    "keeps parallel-worker Base results identical to local computation",
    { timeout: 60_000 },
    async () => {
      const bars = fixture();
      const combos = allCombos(
        [...MICRO_CONFIG_IDS, ...INVERSE_MICRO_CONFIG_IDS].map((id) => `follow|${id}`),
        [],
        [1, 5, 15],
      );
      const grid = {
        ...DEFAULT_SETTINGS.grid,
        tp: [],
        general: false as const,
        long: false as const,
        micro: {
          ...DEFAULT_SETTINGS.grid.micro!,
          tp: [0.002],
          slOfTp: [1, 1.25],
          trailOfTp: [0, 0.25],
          maxHoldMin: 60,
        },
        minimal: false as const,
        short: false as const,
      };
      const full = completeBaseRangeProtects(grid, 0.0015);
      assert.deepEqual(full, protectGrid(15, grid, 0.0015));
      const local = baseRuns(
        makeUniverse(bars),
        combos,
        0.0015,
        null,
        false,
        false,
        undefined,
        [],
        {},
        false,
        DEFAULT_SETTINGS.gates,
        full,
      );
      const parts = [combos.filter((_, i) => i % 2 === 0), combos.filter((_, i) => i % 2 === 1)];
      const remote = await runOnWorkers<{ runsJson: string[] }>(
        parts.map((combos) => ({
          type: "s1",
          bars,
          combos,
          cost: 0.0015,
          tactics: null,
          gates: DEFAULT_SETTINGS.gates,
          completeRangeProtects: full,
        })),
        2,
      );
      const rows = remote.flatMap((r) =>
        r.runsJson.flatMap((row) => JSON.parse(row) as ComboRun[]),
      );
      const key = (r: ComboRun) => JSON.stringify([r.id, r.full, r.ranges, r.rangeTps]);
      assert.deepEqual(rows.map(key).sort(), local.map(key).sort());
    },
  );
});

it("mirrors each complete Micro technique before entry with its own net-return qualification", () => {
  assert.equal(INVERSE_MICRO_CONFIG_IDS.length, MICRO_CONFIG_IDS.length);
  const u = makeUniverse(fixture());
  for (const inverse of inverseMicroSpecs()) {
    const s = u.bars.findIndex((b) => b.tfMin === inverse.params.anchor);
    const normal = indicationState(inverse.id.replace(/^inverse-/, ""), u.caches[s])!;
    const opposite = indicationState(inverse.id, u.caches[s])!;
    assert.deepEqual(
      [...opposite],
      [...normal].map((x) => (x === 0 ? 0 : -x)),
      inverse.id,
    );
    assert.equal(minPfOf({ minPf: 1.05 }, "mc", inverse.id), 1.1);
  }
});
