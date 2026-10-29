import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { CoreDb } from "./db.server.ts";
import { isFormerIntradayFocus, migrateIntradayFocus } from "./intraday-focus-migration.server.ts";

const formerFocus = () => DEFAULT_SETTINGS.focus.filter((x) => {
  const subset = /\|(?:inverse-)?micro-([\dx]+)-/.exec(x)?.[1];
  return !subset?.split("x").includes("30");
});

test("the exact frozen factory selection upgrades to30m, preserving custom selections and retiring expanded scopes", () => {
  const before = formerFocus();
  assert.equal(before.length, 1841); assert.ok(isFormerIntradayFocus(before));
  assert.ok(!isFormerIntradayFocus([...before].reverse()), "order is a configuration preference too");
  const db = new CoreDb(":memory:");
  try {
    db.kvSet("settings", { focus: before });
    db.kvSet("presets", [{ id: "factory", settings: { focus: before }, metrics: { pf: 2, gp: 2, gl: 1 } },
      { id: "inherited", settings: {} }, { id: "custom", settings: { focus: [before[0]] }, metrics: { pf: 3 } },
      { id: "all", settings: { focus: [] }, metrics: { pf: 4 } }]);
    db.kvSet("presetBacktests", { factory: 1, inherited: 2, custom: 3, all: 4, orphan: 5 });
    db.kvSet("presetSeries", { factory: [1], custom: [3] });
    migrateIntradayFocus(db);
    assert.deepEqual(db.kvGet<{ focus: string[] }>("settings")!.focus, DEFAULT_SETTINGS.focus);
    const presets = db.kvGet<Array<{ id: string; settings: { focus?: string[] }; metrics?: { pf: number | null; gp?: number } }>>("presets")!;
    assert.deepEqual(presets[0].settings.focus, DEFAULT_SETTINGS.focus);
    assert.equal(presets[0].metrics?.pf, null); assert.equal(presets[0].metrics?.gp, undefined);
    assert.deepEqual(presets[2].settings.focus, [before[0]]); assert.equal(presets[2].metrics?.pf, 3);
    assert.deepEqual(presets[3].settings.focus, []); assert.equal(presets[3].metrics?.pf, null,
      "empty Focus means all sources, so its old proof cannot certify an expanded catalogue");
    assert.deepEqual(db.kvGet("presetBacktests"), { custom: 3 });
    assert.deepEqual(db.kvGet("presetSeries"), { custom: [3] });
    assert.deepEqual(db.kvGet<{ settings: unknown }>("intraday30FocusBackupV1")!.settings, { focus: before });
    db.kvSet("settings", { focus: [] }); migrateIntradayFocus(db);
    assert.deepEqual(db.kvGet("settings"), { focus: [] });
  } finally { db.db.close(); }
});

test("a custom inherited Focus never loses its current proof to a factory-only upgrade", () => {
  const db = new CoreDb(":memory:");
  try {
    db.kvSet("settings", { focus: ["follow|ema-9-21"] }); db.kvSet("presets", [{ id: "own", settings: {} }]);
    db.kvSet("presetBacktests", { own: { pf: 2 } }); migrateIntradayFocus(db);
    assert.deepEqual(db.kvGet("presetBacktests"), { own: { pf: 2 } });
  } finally { db.db.close(); }
});

test("custom bare Low-Range/Inverse selections stay unchanged but acquire new scoped proofs", () => {
  for (const source of ["follow|low-range-1-breakout-trend", "follow|inverse-trend-ema"]) {
    const db = new CoreDb(":memory:"), settings = { focus: [source] };
    try {
      db.kvSet("settings", settings); db.kvSet("presets", [{ id: "own", settings: {} }]);
      db.kvSet("presetBacktests", { own: { pf: 2 } }); migrateIntradayFocus(db);
      assert.deepEqual(db.kvGet("settings"), settings);
      assert.deepEqual(db.kvGet("presetBacktests"), {}, "new lane identities require new evaluation");
    } finally { db.db.close(); }
  }
});

test("intraday selection/cache/backup writes roll back together", () => {
  const db = new CoreDb(":memory:"), settings = { focus: formerFocus() };
  try {
    db.kvSet("settings", settings); db.kvSet("presetBacktests", { orphan: 1 });
    const write = db.kvSet.bind(db);
    db.kvSet = ((key: string, value: unknown) => {
      if (key === "intraday30FocusV1") throw new Error("fixture write failure"); write(key, value);
    }) as typeof db.kvSet;
    assert.throws(() => migrateIntradayFocus(db), /fixture write failure/);
    assert.deepEqual(db.kvGet("settings"), settings); assert.deepEqual(db.kvGet("presetBacktests"), { orphan: 1 });
    assert.equal(db.kvGet("intraday30FocusBackupV1"), undefined); assert.equal(db.kvGet("intraday30FocusV1"), undefined);
  } finally { db.db.close(); }
});
