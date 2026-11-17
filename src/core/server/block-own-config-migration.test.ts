import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { migrateBlockOwnConfig } from "./block-own-config-migration.server.ts";
import { DEFAULT_BLOCK } from "../config.ts";

const ALL = { config: true, overall: true, symbol: true, direction: true, indication: true, type: true };

test("Block migration moves only the stored old six-source default to the relations under Auto", () => {
  const db = new CoreDb(":memory:");
  try {
    db.kvSet("settings", { symbols: 8, block: { sources: { ...ALL }, ratio: 0.3 } });
    db.kvSet("presets", [
      { settings: { block: { sources: { ...ALL } } } },
      { settings: { block: { sources: { config: true, overall: true } } } },
      { settings: { symbols: 4 } },
    ]);
    migrateBlockOwnConfig(db);
    const s = db.kvGet<any>("settings");
    assert.deepEqual(s.block.sources, DEFAULT_BLOCK.sources);
    assert.equal(s.block.configScope, "config");
    assert.deepEqual(s.block.auto, DEFAULT_BLOCK.auto);
    assert.equal(s.block.ratio, 0.3, "the other Block settings stay");
    const p = db.kvGet<any[]>("presets")!;
    assert.deepEqual(p[0].settings.block.sources, DEFAULT_BLOCK.sources);
    assert.deepEqual(p[1].settings.block.sources, { config: true, overall: true }, "a custom selection stays");
    assert.equal(p[1].settings.block.configScope, undefined);
    assert.deepEqual(p[2].settings, { symbols: 4 });
    assert.deepEqual(db.kvGet<any>("blockOwnConfig20261117BackupV1").settings.block.sources, ALL);
    // once only: a later explicit choice of the pooled sources is never moved again
    db.kvSet("settings", { block: { sources: { ...ALL } } });
    migrateBlockOwnConfig(db);
    assert.deepEqual(db.kvGet<any>("settings").block.sources, ALL);
  } finally {
    db.db.close();
  }
});
