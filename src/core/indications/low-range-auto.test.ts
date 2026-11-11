import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS, mergeGridSettings, SHORT_RANGE } from "../config.ts";
import {
  DEFAULT_LOW_RANGE_GRID,
  LOW_RANGE_IDS,
  LOW_RANGE_BASE_IDS,
  lowRangeGridProtects,
  lowRangeHolds,
  lowRangeSpecs,
} from "./low-range.ts";
import {
  LOW_RANGE_EXTRA_WINDOWS,
  LOW_RANGE_EXTRA_METHODS,
  LOW_RANGE_EXTRA_FILTERS,
  lowRangeExtraState,
} from "./low-range-extra.ts";
import { baseRangeRules } from "../server/runtime.server.ts";
import {
  configId,
  parseConfigId,
  protectCellKey,
  completeBaseRangeProtects,
  baseRangeProtects,
  laneProtect,
  REF_TF,
} from "../pipeline/pipeline.ts";
import { protectGrid, cellAllowed, passedCellsOf } from "../sim/walkforward.ts";
import { trailingOnlyProtects } from "../sim/trailing.ts";
import { adjustProtect } from "../adjust.ts";
import { rangeHolds, rangeVolumeFactorsOf, rangeOfId, minPfOf } from "../minimal-coord.ts";
import { checkMerged } from "../settings-check.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import type { Bars } from "../domain/types.ts";
import { SeriesCache } from "./cache.ts";
import { StreamMath } from "./stream-math.ts";
import { controlledLowRangeResearch } from "./test-support.ts";
const lr = { ...DEFAULT_LOW_RANGE_GRID, enabled: true };

it("all 54 added research identities can fire in both directions on bounded causal regimes", () => {
  for (const w of LOW_RANGE_EXTRA_WINDOWS)
    for (const method of LOW_RANGE_EXTRA_METHODS) {
      for (const filter of LOW_RANGE_EXTRA_FILTERS)
        for (const inverse of [false, true]) {
          const seen = new Set<number>();
          for (const mirror of [false, true]) {
            const rows = controlledLowRangeResearch(w, method, mirror ? -1 : 1);
            for (const side of lowRangeExtraState(
              new SeriesCache(barsFromCandles("LR-USDT", 1, rows)),
              w,
              method,
              filter,
              inverse,
            ))
              if (side) seen.add(side);
          }
          assert.deepEqual(seen, new Set([1, -1]), `${w}/${method}/${filter}/${inverse}`);
        }
    }
});
const g = { ...DEFAULT_SETTINGS.grid, short: false as const, lowRange: lr };
const cost = DEFAULT_SETTINGS.cost;
const ind = "low-range-12-breakout-standalone@m1";
const prefix = (b: Bars, n: number): Bars => ({
  ...b,
  n,
  t: b.t.slice(0, n),
  o: b.o.slice(0, n),
  h: b.h.slice(0, n),
  l: b.l.slice(0, n),
  c: b.c.slice(0, n),
  v: b.v.slice(0, n),
});
it("independent Low-Range runs with Short off and owns its PF, sizing and exact hold proofs", () => {
  const s = { ...DEFAULT_SETTINGS, grid: g };
  const rules = baseRangeRules(s);
  assert.equal(rules.rangeOn("lr"), true);
  assert.equal(rules.rangeOn("sh"), false);
  assert.equal(
    baseRangeRules({ ...s, grid: { ...g, lowRange: { ...lr, enabled: false } } }).rangeOn("lr"),
    false,
  );
  const base = completeBaseRangeProtects(g, cost).filter((p) => p.lowRangeOnly),
    exec = protectGrid(REF_TF, g, cost).filter((p) => p.lowRangeOnly);
  assert.ok(base.length);
  assert.deepEqual(base, exec);
  assert.deepEqual([...new Set(base.map((p) => p.maxHoldMin))], [5, 15, 30, 60]);
  const first = laneProtect(base[0], ind),
    second = laneProtect(
      base.find((p) => p.maxHoldMin === 15)!,
      ind,
    );
  const a = configId("follow", ind, first),
    b = configId("follow", ind, second);
  assert.notEqual(a, b);
  assert.equal(rangeOfId(a), "lr");
  assert.equal(
    minPfOf({ ...s.gates, stepPf: { enabled: false, ratio: 0.2, max: 2 } }, "lr", ind),
    1.08,
  );
  assert.equal(rangeVolumeFactorsOf({ ...g, lowRange: { ...lr, volumeFactor: 1.7 } }).lr, 1.7);
  assert.equal(
    cellAllowed(
      { bot: "follow", ind, protect: first },
      { basePassedCells: passedCellsOf({ [`follow|${ind}`]: [protectCellKey(first)] }) },
    ),
    true,
  );
  assert.equal(
    cellAllowed(
      { bot: "follow", ind, protect: second },
      { basePassedCells: passedCellsOf({ [`follow|${ind}`]: [protectCellKey(first)] }) },
    ),
    false,
  );
});
it("captures risk ceilings in normal, trailing and no-TP identities and limits feedback widening", () => {
  for (const p of [
    ...lowRangeGridProtects(lr, cost),
    ...trailingOnlyProtects(lowRangeGridProtects(lr, cost)),
  ]) {
    const q = adjustProtect(p, { minSl: 0.2, minTrail: 0.2, slMult: 10, trailMult: 10 });
    assert.ok(q.sl <= q.riskCaps!.sl + 1e-12);
    assert.ok(q.trail * (q.trailStep ?? 1) <= q.riskCaps!.trail + 1e-12);
    const id = configId("follow", ind, q),
      parsed = parseConfigId(id);
    assert.ok(parsed, id);
    assert.deepEqual(parsed.protect.riskCaps, q.riskCaps);
    assert.equal(configId("follow", ind, parsed.protect), id);
  }
  assert.deepEqual(
    lowRangeGridProtects({ ...lr, maxSlRatio: 0.25 }, 0.02, 15, 0.1, 0.1),
    [],
    "a cost floor cannot widen past the selected maximum",
  );
  assert.equal(
    parseConfigId("follow|low-range-12-breakout-standalone@m1|tp0.5|sl1|tr0|h1|lr|rc0.5x0.5"),
    null,
  );
});
it("preserves legacy Short settings and manual holds through unrelated partial updates", () => {
  const legacy = {
    enabled: true,
    step: 0.002,
    steps: [2],
    slRatios: [1],
    trailRatios: [0],
    maxHoldMin: 60,
  };
  const migrated = mergeGridSettings(DEFAULT_SETTINGS.grid, { lowRange: legacy });
  assert.deepEqual(migrated.lowRange, legacy);
  const edited = mergeGridSettings(migrated, { lowRange: { maxHoldMin: 45 } });
  assert.deepEqual(edited.lowRange, { ...legacy, maxHoldMin: 45 });
  assert.ok(
    lowRangeGridProtects(edited.lowRange, cost).every(
      (p) => p.tag === "sh" && p.maxHoldMin === 45 && !p.riskCaps,
    ),
  );
  for (const bad of [[60, 60], [120], [], [1.5]])
    assert.throws(() => lowRangeHolds({ ...lr, holdCandidatesMin: bad }));
});
it("ordinary auto hold candidates preserve minute identity from Base through lane execution", () => {
  const range = {
    ...SHORT_RANGE,
    ownBase: true,
    baseBest: true,
    holdAuto: true,
    holdCandidatesMin: [5, 15, 30],
    maxHoldMin: 30,
  };
  const grid = { ...DEFAULT_SETTINGS.grid, short: range, baseCells: true, baseTrailCells: true };
  assert.doesNotThrow(() => checkMerged(DEFAULT_SETTINGS, { grid }));
  assert.deepEqual(rangeHolds(range, [16, 24]), [5 / 60, 15 / 60, 0.5]);
  assert.throws(
    () => checkMerged(DEFAULT_SETTINGS, { grid: { ...grid, baseCells: false } }),
    /automatic hold requires/,
  );
  const b = baseRangeProtects(grid, cost).filter((p) => p.tag === "sh"),
    x = protectGrid(REF_TF, grid, cost).filter((p) => p.tag === "sh");
  assert.deepEqual(new Set(b.map(protectCellKey)), new Set(x.map(protectCellKey)));
  assert.deepEqual([...new Set(b.map((p) => p.maxHoldMin))], [5, 15, 30]);
});
it("keeps all 650 original signals unchanged and gives Inverse separate identities", () => {
  const specs = lowRangeSpecs(),
    map = new Map(specs.map((s) => [s.id, s]));
  assert.equal(LOW_RANGE_BASE_IDS.length, 650);
  assert.equal(LOW_RANGE_IDS.length, 1354);
  assert.equal(map.size, LOW_RANGE_IDS.length);
  const b = barsFromCandles("A", 1, syntheticCandles("A", 1, 300, 0, 19)),
    k = new SeriesCache(b);
  for (const id of LOW_RANGE_BASE_IDS) {
    const normal = map.get(id)!.fn(k),
      inverse = map.get(`${id}-inverse`)!.fn(k);
    assert.deepEqual(
      inverse,
      Int8Array.from(normal, (x) => -x),
      id,
    );
  }
});
it("new research signals are causal, incremental and reset after gaps or corrupt bars", () => {
  const b = barsFromCandles("A", 1, syntheticCandles("A", 1, 600, 0, 91));
  b.c[170] = NaN;
  for (let i = 350; i < b.n; i++) b.t[i] += 120000;
  for (const w of LOW_RANGE_EXTRA_WINDOWS)
    for (const method of LOW_RANGE_EXTRA_METHODS)
      for (const filter of LOW_RANGE_EXTRA_FILTERS) {
        const full = lowRangeExtraState(new SeriesCache(b), w, method, filter),
          math = new StreamMath();
        for (const n of [1, 20, 169, 170, 171, 200, 349, 350, 351, 400, 600]) {
          const part = prefix(b, n),
            direct = lowRangeExtraState(new SeriesCache(part), w, method, filter);
          assert.deepEqual(direct, full.slice(0, n), `${w}/${method}/${filter}/${n} causal`);
          assert.deepEqual(
            lowRangeExtraState(new SeriesCache(part).enableStreaming(math), w, method, filter),
            direct,
            `${w}/${method}/${filter}/${n} stream`,
          );
        }
        assert.ok(full.slice(170, 171 + w).every((x) => x === 0));
        assert.ok(full.slice(350, 350 + w).every((x) => x === 0));
        assert.deepEqual(
          lowRangeExtraState(new SeriesCache(b), w, method, filter, true),
          Int8Array.from(full, (x) => -x),
        );
      }
  for (const method of LOW_RANGE_EXTRA_METHODS)
    assert.ok(
      LOW_RANGE_EXTRA_WINDOWS.some((w) =>
        lowRangeExtraState(new SeriesCache(b), w, method, "standalone").some((x) => x !== 0),
      ),
      `${method} fires on the fixed fixture`,
    );
});
