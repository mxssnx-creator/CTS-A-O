import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
function dbWithCurrentMigrations() {
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 37);
  for (const key of ["ddtMax35", "signalEvaluation100V1", "signalLast4V1", "signalHistory150V1",
    "signalExpandedDefaultsV1", "neutralVolumeRatiosV1", "dcaTwoStepsV1", "microBreakoutFocusV1",
    "microContextFocusV1"]) db.kvSet(key, true);
  return db;
}
function open(db: CoreDb) {
  const rt = new CoreRuntime(db, undefined, { market: "synthetic", replay: true, priceStream: null });
  rt.stop();
  return rt;
}

test("Historic Exit defaults off, migrates current settings once with backup, and preserves later opt-in", () => {
  assert.equal(DEFAULT_SETTINGS.exitStrategy.enabled, false);
  const db = dbWithCurrentMigrations();
  const saved = { exitStrategy: { enabled: true, timeframes: [5], lookbackH: 123 } };
  const presets = [{ id: "explicit-exit", settings: { exitStrategy: { enabled: true } } }];
  db.kvSet("settings", saved); db.kvSet("presets", presets);
  let rt: CoreRuntime | undefined;
  try {
    rt = open(db);
    assert.equal(rt.settings.exitStrategy.enabled, false);
    assert.deepEqual(rt.settings.exitStrategy.timeframes, [5]);
    assert.deepEqual(db.kvGet("historicExitOptInBackupV1"), saved);
    assert.deepEqual(db.kvGet("presets"), presets);
    rt.dispose(); rt = undefined;
    db.kvSet("settings", saved);
    rt = open(db);
    assert.equal(rt.settings.exitStrategy.enabled, true, "an explicit post-migration opt-in remains enabled");
  } finally { rt?.dispose(); db.db.close(); }
});

test("Historic Exit opt-in migration rolls back its backup and marker on write failure", () => {
  const db = dbWithCurrentMigrations();
  const saved = { exitStrategy: { enabled: true } };
  db.kvSet("settings", saved);
  const write = db.kvSet.bind(db);
  db.kvSet = (key, value) => { if (key === "settings") throw new Error("injected write failure"); write(key, value); };
  try {
    assert.throws(() => open(db), /injected write failure/);
    assert.deepEqual(db.kvGet("settings"), saved);
    assert.equal(db.kvGet("historicExitOptInBackupV1"), undefined);
    assert.equal(db.kvGet("historicExitOptInV1"), undefined);
  } finally { db.db.close(); }
});
