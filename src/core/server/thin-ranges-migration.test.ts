import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { migrateThinRanges } from "./thin-ranges-migration.server.ts";
import { FINE_SL_TP_RATIOS, SL_TP_RATIOS, THIN_SL_TP_RATIOS } from "../protection-policy.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { checkSettings } from "../settings-check.ts";
import { migrateMinimumProtectionPolicy } from "./protection-policy-migration.server.ts";

test("Micro, Minimal and Short use the requested 0.2–1.2 grid and pass Settings validation", () => {
  const expected = [0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,1.1,1.2];
  for (const range of [DEFAULT_SETTINGS.grid.micro, DEFAULT_SETTINGS.grid.minimal, DEFAULT_SETTINGS.grid.short]) {
    assert.ok(range);
    assert.deepEqual(range.slOfTp, expected);
  }
  assert.doesNotThrow(() => checkSettings(DEFAULT_SETTINGS));
  assert.deepEqual([...THIN_SL_TP_RATIOS], expected);
});

test("the earlier protection migration does not round away a new fine factory ladder", () => {
  const db = new CoreDb(":memory:");
  try {
    const ranges = Object.fromEntries(["micro", "minimal", "short"].map(name =>
      [name, { slOfTp: [...THIN_SL_TP_RATIOS], trailSlOfTp: .2 }]));
    db.kvSet("settings", { grid: ranges });
    migrateMinimumProtectionPolicy(db);
    const saved = db.kvGet<any>("settings");
    for (const name of ["micro", "minimal", "short"]) {
      assert.deepEqual(saved.grid[name].slOfTp, [...THIN_SL_TP_RATIOS]);
      assert.equal(saved.grid[name].trailSlOfTp, .2);
    }
  } finally { db.db.close(); }
});

test("thin-grid migration backs up factory ladders, preserves custom cells and held protections", () => {
  const db = new CoreDb(":memory:");
  try {
    const settings = { grid: { micro: { slOfTp: [...FINE_SL_TP_RATIOS] },
      minimal: { slOfTp: [...SL_TP_RATIOS], trailSlOfTp: .25 }, short: { slOfTp: [.3,.9] } } };
    const paper = { positions: [{ cfg: "held", sl: 99 }] };
    db.kvSet("settings", settings); db.kvSet("paper", paper);
    db.kvSet("presets", [{ settings, metrics: { pf: 2, pfBasis: "unit-net" } }]);
    migrateThinRanges(db);
    const next = db.kvGet<any>("settings");
    assert.deepEqual(next.grid.micro.slOfTp, [...THIN_SL_TP_RATIOS]);
    assert.deepEqual(next.grid.minimal.slOfTp, [...THIN_SL_TP_RATIOS]);
    assert.equal(next.grid.minimal.trailSlOfTp, .2);
    assert.deepEqual(next.grid.short.slOfTp, [.3,.9]);
    assert.deepEqual(db.kvGet<any>("thinMicroMinimalShort20261116BackupV1").settings, settings);
    assert.equal(db.kvGet<any[]>("presets")![0].metrics.pfBasis, "unavailable");
    assert.deepEqual(db.kvGet("paper"), paper);
  } finally { db.db.close(); }
});
