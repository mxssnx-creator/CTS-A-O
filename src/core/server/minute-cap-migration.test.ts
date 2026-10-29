import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { migrateMinuteCaps } from "./minute-cap-migration.server.ts";

test("minute-cap proof retirement is selective, backed up and does not rewrite held/realized economics", () => {
  const db = new CoreDb(":memory:");
  try {
    const held = { cfg: "legacy|h1", entryT: 1, r: -.2 }, ledger = [{ cfg: "legacy|h1", r: -.2 }];
    db.kvSet("paper", { positions: [held], closed: ledger });
    db.kvSet("presets", [{ id: "capped", settings: { grid: { lowRange: { enabled: true } } }, metrics: { pf: 2, gp: 2, gl: 1 } },
      { id: "native", settings: { grid: { micro: false, minimal: false, short: false, general: false,
        long: false, lowRange: { enabled: false } } }, metrics: { pf: 3 } }]);
    db.kvSet("presetBacktests", { capped: 1, native: 2, orphan: 3 });
    db.kvSet("baseConfigCounts", { old: "cached capped counts" });
    db.kvSet("presetSeries", { capped: [1], native: [2] });
    migrateMinuteCaps(db);
    assert.deepEqual(db.kvGet("presetBacktests"), { native: 2 });
    assert.deepEqual(db.kvGet("presetSeries"), { native: [2] });
    assert.equal(db.kvGet("baseConfigCounts"), undefined);
    const presets = db.kvGet<Array<{ metrics: Record<string, unknown> }>>("presets")!;
    assert.equal(presets[0].metrics.pf, null); assert.equal(presets[0].metrics.gp, undefined);
    assert.equal(presets[1].metrics.pf, 3);
    assert.deepEqual(db.kvGet("paper"), { positions: [held], closed: ledger });
    const backup = db.kvGet<{ presetBacktests: unknown }>("minuteCapExecutionBackupV1")!;
    assert.deepEqual(backup.presetBacktests, { capped: 1, native: 2, orphan: 3 });
    db.kvSet("presetBacktests", { capped: "fresh" }); migrateMinuteCaps(db);
    assert.deepEqual(db.kvGet("presetBacktests"), { capped: "fresh" });
  } finally { db.db.close(); }
});

test("minute-cap cache and backup migration rolls back atomically on failure", () => {
  const db = new CoreDb(":memory:");
  try {
    db.kvSet("presetBacktests", { orphan: 1 });
    const write = db.kvSet.bind(db);
    db.kvSet = ((key: string, value: unknown) => {
      if (key === "minuteCapExecutionV1") throw new Error("fixture failure"); write(key, value);
    }) as typeof db.kvSet;
    assert.throws(() => migrateMinuteCaps(db), /fixture failure/);
    assert.deepEqual(db.kvGet("presetBacktests"), { orphan: 1 });
    assert.equal(db.kvGet("minuteCapExecutionBackupV1"), undefined);
    assert.equal(db.kvGet("minuteCapExecutionV1"), undefined);
  } finally { db.db.close(); }
});
