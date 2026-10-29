import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { minPfOf } from "../minimal-coord.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime, migrateBasePf11 } from "./runtime.server.ts";

const former = () => ({ gates: { minPf: 1.1, baseSetsMinPf: 1,
  rangeMinPf: { micro: 1.05, minimal: 1.1, short: 1.1, general: 1.2, long: 1.3 } } });
const custom = () => ({ gates: { minPf: 1.4, baseSetsMinPf: 1.25,
  rangeMinPf: { micro: 1.15, minimal: 1.2, short: 1.3, general: 1.4, long: 1.5 } } });

test("fresh runtime uses PF1.1 for ordinary Base/range factory floors and keeps Signal's own floor", () => {
  const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  try {
    assert.equal(rt.settings.gates.minPf, 1.1); assert.equal(rt.settings.gates.baseSetsMinPf, 1.1);
    for (const tag of ["mc", "mn", "sh", "gn", "lg", ""]) assert.equal(minPfOf(rt.settings.gates, tag), 1.1);
    assert.equal(minPfOf(DEFAULT_SETTINGS.gates, "sh", "sig-ema-cross-s@m15"), 1.5);
    assert.equal(rt.wf.gates.minPf, 1.1);
  } finally { rt.dispose(); db.db.close(); }
});

test("former factory PF migration backs up settings/results, retains custom gates and retires only changed caches", () => {
  const db = new CoreDb(":memory:"), old = former(), own = custom();
  try {
    db.kvSet("settings", old);
    db.kvSet("presets", [{ id: "factory", settings: former() }, { id: "custom", settings: own }]);
    db.kvSet("presetBacktests", { factory: { proof: "old-factory" }, custom: { proof: "custom" }, orphan: { proof: "unknown-policy" } });
    db.kvSet("presetSeries", { factory: [1], custom: [2] });
    migrateBasePf11(db);
    assert.deepEqual(db.kvGet<{ gates: unknown }>("settings")!.gates,
      { minPf: 1.1, baseSetsMinPf: 1.1, rangeMinPf: DEFAULT_SETTINGS.gates.rangeMinPf });
    const presets = db.kvGet<Array<{ id: string; settings: unknown }>>("presets")!;
    assert.deepEqual(presets[1].settings, own);
    assert.deepEqual(db.kvGet("presetBacktests"), { custom: { proof: "custom" } });
    assert.deepEqual(db.kvGet("presetSeries"), { custom: [2] });
    const backup = db.kvGet<{ settings: unknown; invalidPresetIds: string[]; presetBacktests: unknown }>("basePf11BackupV1")!;
    assert.deepEqual(backup.settings, old);
    assert.deepEqual(backup.invalidPresetIds.sort(), ["factory", "orphan"]);
    assert.deepEqual(backup.presetBacktests, { factory: { proof: "old-factory" }, custom: { proof: "custom" }, orphan: { proof: "unknown-policy" } });
    db.kvSet("settings", own); migrateBasePf11(db);
    assert.deepEqual(db.kvGet("settings"), own, "a later deliberate setting survives the once-only migration");
    assert.deepEqual(db.kvGet<{ settings: unknown }>("basePf11BackupV1")!.settings, old);
  } finally { db.db.close(); }
});

test("PF factory migration rolls back its backup/settings/cache writes together on storage failure", () => {
  const db = new CoreDb(":memory:"), old = former();
  try {
    db.kvSet("settings", old); db.kvSet("presetBacktests", { orphan: { proof: "original" } });
    const write = db.kvSet.bind(db);
    db.kvSet = ((key: string, value: unknown) => {
      if (key === "basePf11V1") throw new Error("fixture storage failure");
      write(key, value);
    }) as typeof db.kvSet;
    assert.throws(() => migrateBasePf11(db), /fixture storage failure/);
    assert.deepEqual(db.kvGet("settings"), old);
    assert.deepEqual(db.kvGet("presetBacktests"), { orphan: { proof: "original" } });
    assert.equal(db.kvGet("basePf11BackupV1"), undefined);
    assert.equal(db.kvGet("basePf11V1"), undefined);
  } finally { db.db.close(); }
});
