import assert from "node:assert/strict";
import { test } from "node:test";
import { INTRADAY_SUBSETS, LEGACY_INTRADAY_SUBSETS, intradayAnchor } from "./intraday-timeframes.ts";
import { MICRO_CONFIG_IDS, microAnchorTf } from "./micro-family.ts";
import { RELATE_CONFIG_IDS, relateAnchorTf } from "./relate.ts";
import { BREAK_CONFIG_IDS, BREAK_DEFAULT_MICRO_CONFIG_IDS, breakAnchorTf } from "./break-config.ts";
import { allCombos, configId, parseConfigId } from "../pipeline/pipeline.ts";
import { orderCfgKey } from "../sim/walkforward.ts";
import { indicationState, laneOf } from "./registry.ts";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { lowRangeState } from "./low-range-research.ts";

test("all15 nonempty1/5/15/30m subsets retain independent, unambiguous anchors and original ordering", () => {
  assert.deepEqual(INTRADAY_SUBSETS.slice(0, 7), LEGACY_INTRADAY_SUBSETS);
  const actual = new Set(INTRADAY_SUBSETS.map((x) => x.join("x")));
  const expected = new Set(Array.from({ length: 15 }, (_, i) => [1, 5, 15, 30].filter((_, j) => (i + 1) & (1 << j)).join("x")));
  assert.deepEqual(actual, expected);
  for (const s of INTRADAY_SUBSETS) assert.equal(intradayAnchor(s.join("x")), Math.min(...s));
  for (const invalid of ["", "30x1", "1x1", "1x60", "5x1x30", "1xx30"]) assert.equal(intradayAnchor(invalid), null);
  assert.equal(BREAK_DEFAULT_MICRO_CONFIG_IDS.length, 60, "the historical default/migration identity stays frozen");
});

test("adding30m confirmation creates a new lane and never rewrites a legacy combined lane", () => {
  const source = "low-range-1-breakout-standalone";
  const b = { ...barsFromCandles("LANE-USDT", 1,
    syntheticCandles("LANE-USDT", 1, 4320, Date.UTC(2026, 9, 9, 12), 17)), lanes: [1, 5, 15, 30] };
  const full = new SeriesCache(b), legacy = new SeriesCache({ ...b, lanes: [1, 5, 15] });
  assert.deepEqual(indicationState(`${source}@m1c`, full), indicationState(`${source}@m1c`, legacy),
    "enabling the additional30m path cannot alter original c-lane historical evidence");
  const base = lowRangeState(full, 1, "breakout", "standalone");
  const expected = Int8Array.from(base);
  for (const factor of [5, 15, 30]) {
    const { k, map } = full.htf(factor), high = lowRangeState(k, 1, "breakout", "standalone");
    for (let i = 0; i < expected.length; i++) if (map[i] < 0 || high[map[i]] !== expected[i]) expected[i] = 0;
  }
  assert.deepEqual(indicationState(`${source}@m1c30`, full), expected, "new confirmation uses all completed higher frames");
  assert.ok(indicationState(`${source}@m1c30`, legacy)!.every((x) => x === 0), "a missing required30m lane is unavailable");
  assert.deepEqual(laneOf(`${source}@m1c30`), { base: source, tf: 1, combined: true, confirmation30: true });
  const protect = { tp: .02, sl: .01, trail: 0, hold: 3, tag: "sh" as const };
  assert.notEqual(orderCfgKey(configId("follow", `${source}@m1c`, protect)),
    orderCfgKey(configId("follow", `${source}@m1c30`, protect)), "the new lane cannot borrow the old set's orders");
});

test("every Micro/Relate/Break combination reaches its own lane, config, order and reverse mapping", () => {
  const ids = [...MICRO_CONFIG_IDS, ...RELATE_CONFIG_IDS, ...BREAK_CONFIG_IDS];
  const combos = allCombos(ids.map((x) => `follow|${x}`), [], [1, 5, 15, 30]);
  assert.equal(combos.length, ids.length);
  const keys = new Set<string>();
  for (const c of combos) {
    const anchor = microAnchorTf(c.ind.split("@m")[0]) ?? relateAnchorTf(c.ind.split("@m")[0]) ?? breakAnchorTf(c.ind.split("@m")[0]);
    assert.ok(c.ind.endsWith(`@m${anchor}`), c.ind);
    const protect = { tp: .02, sl: .01, trail: .005, hold: 3, tag: "sh" as const };
    const cfg = configId("follow", c.ind, protect, "trailing");
    assert.equal(parseConfigId(cfg)?.ind, c.ind);
    keys.add(orderCfgKey(cfg));
  }
  assert.equal(keys.size, ids.length, "identical protection numbers never merge distinct source/subset lanes");
});
