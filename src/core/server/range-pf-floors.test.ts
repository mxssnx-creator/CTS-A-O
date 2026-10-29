import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { BaseConfigCounter } from "../base-config-counts.ts";
import { minPfOf } from "../minimal-coord.ts";
import { CoreDb } from "./db.server.ts";
import { migrateBasePf11, migrateRangePfFloors } from "./runtime.server.ts";

const flat = () => ({ minPf: 1.1, baseSetsMinPf: 1.1,
  rangeMinPf: { micro: 1.1, minimal: 1.1, short: 1.1, general: 1.1, long: 1.1 } });
const expected = { micro: 1.05, minimal: 1.08, short: 1.12, general: 1.25, long: 1.5 };

test("all research families retain the requested range floor instead of a hidden PF1.1 override", () => {
  for (const ind of ["ema-9-21@m1", "micro-1-adaptive-fast", "inverse-micro-1-adaptive-fast",
    "low-range-1-breakout-trend", "tactic-trend", "relate-test", "break-rel-test", "break-mc-rel-test"]) {
    assert.deepEqual(["mc", "mn", "mp", "sh", "gn", "lg", ""].map((tag) => minPfOf(DEFAULT_SETTINGS.gates, tag, ind)),
      [1.05, 1.08, 1.08, 1.12, 1.25, 1.5, 1.25], ind);
  }
  assert.equal(minPfOf(DEFAULT_SETTINGS.gates, "mc", "sig-ema-cross-s@m1"), 1.5,
    "Signals retain their independently configured economic floor");
});

test("full configured-cell statistics count qualifying Micro/Minimal cells below the former hidden 1.1", () => {
  for (const [tag, pf] of [["mc", 1.06], ["mn", 1.09]] as const) {
    const counter = new BaseConfigCounter({ gates: { ...DEFAULT_SETTINGS.gates, baseLastN: 0,
      baseRangeLastN: {}, minTrades: 2, maxDdr: 0, lossPrior: false, lastNFloor: 0 },
      cost: .0015, fromT: 0, cutT: 60_000 });
    counter.record("follow", "low-range-1-breakout-trend", { tp: .01, sl: .01, trail: 0, hold: 1, tag },
      "normal", [{ r: pf * .01, entryT: 1, exitT: 2 }, { r: -.01, entryT: 3, exitT: 4 }]);
    const [row] = counter.rows();
    assert.equal(row.minPf, tag === "mc" ? 1.05 : 1.08);
    assert.equal(row.pfPassed, 1); assert.equal(row.passed, 1);
    assert.equal(row.evaluated, 1); assert.equal(row.configured, 1);
  }
});

test("range policy migration backs up and upgrades factory settings/presets, preserving custom results", () => {
  const db = new CoreDb(":memory:");
  const settings = { gates: flat() }, custom = { gates: { minPf: 1.8, baseSetsMinPf: 1.7,
    rangeMinPf: { micro: 1.2, minimal: 1.3, short: 1.4, general: 1.5, long: 2 } } };
  try {
    db.kvSet("settings", settings);
    db.kvSet("presets", [{ id: "factory", settings: { gates: flat() } }, { id: "custom", settings: custom }]);
    db.kvSet("presetBacktests", { factory: { pf: 2 }, custom: { pf: 3 }, orphan: { pf: 4 } });
    db.kvSet("presetSeries", { factory: [1], custom: [2] });
    migrateRangePfFloors(db);
    assert.deepEqual(db.kvGet<{ gates: unknown }>("settings")!.gates,
      { minPf: 1.25, baseSetsMinPf: 1.25, rangeMinPf: expected });
    const presets = db.kvGet<Array<{ id: string; settings: unknown }>>("presets")!;
    assert.deepEqual(presets[1].settings, custom);
    assert.deepEqual(db.kvGet("presetBacktests"), { custom: { pf: 3 } });
    assert.deepEqual(db.kvGet("presetSeries"), { custom: [2] });
    const backup = db.kvGet<{ settings: unknown; invalidPresetIds: string[] }>("rangePfFloors20261029BackupV1")!;
    assert.deepEqual(backup.settings, settings);
    assert.deepEqual(backup.invalidPresetIds.sort(), ["factory", "orphan"]);
    db.kvSet("settings", custom); migrateRangePfFloors(db);
    assert.deepEqual(db.kvGet("settings"), custom, "the migration is once-only");
  } finally { db.db.close(); }
});

test("range migration retires stale custom low-range proofs when their formerly hidden floor changes", () => {
  const db = new CoreDb(":memory:");
  const settings = { gates: { minPf: 1.4, rangeMinPf: { micro: 1.05 } } };
  try {
    db.kvSet("presets", [{ id: "custom-low", settings }]);
    db.kvSet("presetBacktests", { "custom-low": { pf: 2 } });
    migrateRangePfFloors(db);
    assert.deepEqual(db.kvGet<Array<{ settings: unknown }>>("presets")![0].settings, settings);
    assert.deepEqual(db.kvGet("presetBacktests"), {}, "same stored numbers do not prove the same effective policy");
  } finally { db.db.close(); }
});

test("historical PF migration stays frozen before the new range policy is applied", () => {
  const db = new CoreDb(":memory:");
  try {
    db.kvSet("settings", { gates: { minPf: 1.1, baseSetsMinPf: 1,
      rangeMinPf: { micro: 1.05, minimal: 1.1, short: 1.1, general: 1.2, long: 1.3 } } });
    migrateBasePf11(db);
    assert.deepEqual(db.kvGet<{ gates: unknown }>("settings")!.gates, flat());
    migrateRangePfFloors(db);
    assert.deepEqual(db.kvGet<{ gates: unknown }>("settings")!.gates,
      { minPf: 1.25, baseSetsMinPf: 1.25, rangeMinPf: expected });
  } finally { db.db.close(); }
});

test("range migration settings/cache/backup writes roll back atomically on storage failure", () => {
  const db = new CoreDb(":memory:"), settings = { gates: flat() };
  try {
    db.kvSet("settings", settings); db.kvSet("presetBacktests", { orphan: { pf: 2 } });
    const write = db.kvSet.bind(db);
    db.kvSet = ((key: string, value: unknown) => {
      if (key === "rangePfFloors20261029V1") throw new Error("fixture storage failure");
      write(key, value);
    }) as typeof db.kvSet;
    assert.throws(() => migrateRangePfFloors(db), /fixture storage failure/);
    assert.deepEqual(db.kvGet("settings"), settings);
    assert.deepEqual(db.kvGet("presetBacktests"), { orphan: { pf: 2 } });
    assert.equal(db.kvGet("rangePfFloors20261029BackupV1"), undefined);
    assert.equal(db.kvGet("rangePfFloors20261029V1"), undefined);
  } finally { db.db.close(); }
});
