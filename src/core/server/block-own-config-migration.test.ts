import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { migrateBlockOwnConfig, migrateX01BlockAuto } from "./block-own-config-migration.server.ts";
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

test("x01 judges Block auto per config (scope key, PF 1.1) once; other connections keep the default; a later desk change stays", () => {
  for (const conn of ["bingx-vst-01", "bingx-vst-02", undefined]) {
    const db = new CoreDb(":memory:");
    try {
      db.kvSet("settings", { symbols: 4 });
      migrateX01BlockAuto(db, conn);
      assert.deepEqual(db.kvGet("settings"), { symbols: 4 }, String(conn));
    } finally {
      db.db.close();
    }
  }
  const db = new CoreDb(":memory:");
  try {
    db.kvSet("settings", { symbols: 8, block: { ratio: 0.3, auto: { n: 40, pf: 1.3 } } });
    migrateX01BlockAuto(db, "bingx-x01");
    const s = db.kvGet<any>("settings");
    assert.equal(s.block.auto.scope, "key");
    assert.equal(s.block.auto.pf, 1.1);
    assert.equal(s.block.auto.n, 40, "the operator's other auto values stay");
    assert.equal(s.block.auto.enabled, true);
    assert.equal(s.block.ratio, 0.3);
    assert.equal(s.symbols, 8);
    // once only: the operator's later value is kept
    s.block.auto.scope = "rule";
    db.kvSet("settings", s);
    migrateX01BlockAuto(db, "bingx-x01");
    assert.equal(db.kvGet<any>("settings").block.auto.scope, "rule");
  } finally {
    db.db.close();
  }
});
