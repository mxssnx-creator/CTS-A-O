import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { migratePositionWindows, migrateSignalEvaluation15 } from "./position-windows-migration.server.ts";
import { DEFAULT_POSITION_WINDOWS, mainnetPositionWindows } from "../position-windows.ts";
test("count-policy migration backs up old PF evidence and preserves held ownership and explicit counts", () => {
  const db = new CoreDb(":memory:");
  try {
    const old = { symbols: 8, gates: { minPf: 1.35 } };
    db.kvSet("settings", old);
    db.kvSet("paper", { positions: [{ cfg: "held", qty: 2, stop: 99 }] });
    db.kvSet("presets", [
      {
        settings: { gates: { positionWindows: { ...DEFAULT_POSITION_WINDOWS, main: 70 } } },
        metrics: { pf: 4, source: "old" },
      },
    ]);
    db.kvSet("presetBacktests", { old: { pf: 4 } });
    db.kvSet("presetSeries", { old: [1, 2] });
    migratePositionWindows(db);
    assert.deepEqual(
      db.kvGet<{ settings: unknown }>("positionWindows20261111BackupV1")!.settings,
      old,
    );
    assert.deepEqual(db.kvGet("paper"), { positions: [{ cfg: "held", qty: 2, stop: 99 }] });
    const presets = db.kvGet<any[]>("presets")!;
    assert.equal(presets[0].settings.gates.positionWindows.main, 70);
    assert.equal(presets[0].metrics.pf, null);
    assert.deepEqual(db.kvGet("presetBacktests"), {});
    const saved = db.kvGet("settings");
    migratePositionWindows(db);
    assert.deepEqual(db.kvGet("settings"), saved);
  } finally {
    db.db.close();
  }
});
test("native mainnet floors also constrain per-range and exact-config position counts", () => {
  const p = mainnetPositionWindows(
    {
      ...DEFAULT_POSITION_WINDOWS,
      real: 1,
      entry: 1,
      byRange: { lr: { real: 1, entry: 1 }, sig: { real: 1, entry: 1 } },
      byConfig: { "follow|ema|tp1": { real: 1, entry: 1 } },
    },
    12,
    25,
    4,
  );
  assert.equal(p.real, 12);
  assert.equal(p.entry, 25);
  assert.equal(p.byRange!.lr.entry, 25);
  assert.equal(p.byRange!.sig.entry, 4);
  assert.equal(p.byConfig!["follow|ema|tp1"].entry, 25);
});
test("Signal-15 migration backs up settings, disables new Exit work and preserves held positions and explicit counts", () => {
  const db = new CoreDb(":memory:");
  try {
    const old = { grid: { tp: [.03] }, gates: { positionWindows: { ...DEFAULT_POSITION_WINDOWS, byRange: { mc: { base: 30 } } } },
      toggles: { exit: true }, exitStrategy: { enabled: true } };
    const paper = { positions: [{ cfg: "held-exit", stop: 99 }] };
    db.kvSet("settings", old); db.kvSet("paper", paper);
    migrateSignalEvaluation15(db);
    assert.deepEqual(db.kvGet("signalEvaluation15ExitOff20261116BackupV1"), old);
    assert.deepEqual(db.kvGet<any>("settings").gates.positionWindows.byRange.sig, {base:15,main:15,real:15,entry:15});
    assert.equal(db.kvGet<any>("settings").toggles.exit, false);
    assert.equal(db.kvGet<any>("settings").exitStrategy.enabled, false);
    assert.deepEqual(db.kvGet<any>("settings").grid.tp, []);
    assert.deepEqual(db.kvGet("paper"), paper);
    const changed = db.kvGet<any>("settings");
    changed.gates.positionWindows.byRange.sig.main = 20;
    changed.toggles.exit = true;
    db.kvSet("settings", changed); migrateSignalEvaluation15(db);
    assert.equal(db.kvGet<any>("settings").gates.positionWindows.byRange.sig.main, 20);
    assert.equal(db.kvGet<any>("settings").toggles.exit, true);
  } finally { db.db.close(); }
});
