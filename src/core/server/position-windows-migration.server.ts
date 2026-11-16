import { DEFAULT_POSITION_WINDOWS } from "../position-windows.ts";
import type { CoreDb } from "./db.server.ts";
import type { SettingsPatch } from "../config.ts";
/** The new evaluation basis invalidates old PF evidence, not owned positions or their protection. */
export function migratePositionWindows(db: CoreDb): void {
  const version = "positionWindows20261111V1";
  if (db.kvGet(version)) return;
  db.tx(() => {
    const settings = db.kvGet<SettingsPatch>("settings"),
      presets =
        db.kvGet<Array<{ settings?: SettingsPatch; metrics?: Record<string, unknown> }>>("presets");
    db.kvSet(
      "positionWindows20261111BackupV1",
      structuredClone({
        settings,
        presets,
        presetBacktests: db.kvGet("presetBacktests"),
        presetSeries: db.kvGet("presetSeries"),
      }),
    );
    if (settings) {
      settings.gates = {
        ...settings.gates,
        positionWindows:
          settings.gates?.positionWindows ?? structuredClone(DEFAULT_POSITION_WINDOWS),
      };
      db.kvSet("settings", settings);
    }
    for (const p of presets ?? []) {
      p.settings = {
        ...p.settings,
        gates: {
          ...p.settings?.gates,
          positionWindows:
            p.settings?.gates?.positionWindows ?? structuredClone(DEFAULT_POSITION_WINDOWS),
        },
      };
      if (p.metrics)
        p.metrics = {
          ...p.metrics,
          pf: null,
          pfBasis: "unavailable",
          noLoss: null,
          pfConvention: "unavailable",
          source: "Evaluation changed to complete Last-N positions; re-evaluate",
        };
    }
    if (presets) db.kvSet("presets", presets);
    db.kvSet("presetBacktests", {});
    db.kvSet("presetSeries", {});
    db.kvSet(version, true);
  });
}

/** Upgrade inherited Signal counts and disable new Exit work once, without touching held positions. */
export function migrateSignalEvaluation15(db: CoreDb): void {
  const version = "signalEvaluation15ExitOff20261116V1";
  if (db.kvGet(version)) return;
  db.tx(() => {
    const settings = db.kvGet<SettingsPatch>("settings");
    const backup = structuredClone(settings);
    let changed = false;
    const windows = settings?.gates?.positionWindows;
    if (windows && !windows.byRange?.sig) {
      windows.byRange = { ...windows.byRange, sig: { ...DEFAULT_POSITION_WINDOWS.byRange!.sig } };
      changed = true;
    }
    if (settings?.toggles?.exit === true) { settings.toggles.exit = false; changed = true; }
    if (settings?.toggles && settings.toggles.axis !== true) { settings.toggles.axis = true; changed = true; }
    if (settings?.toggles && settings.toggles.block !== true) { settings.toggles.block = true; changed = true; }
    if (settings?.exitStrategy?.enabled === true) { settings.exitStrategy.enabled = false; changed = true; }
    if (settings?.grid?.tp?.length) { settings.grid.tp = []; changed = true; }
    if (settings?.block) {
      if (settings.block.windowAuto !== true) { settings.block.windowAuto = true; changed = true; }
      if (settings.block.windowIndependent !== true) { settings.block.windowIndependent = true; changed = true; }
      if ((settings.block.windowMinSamples ?? 0) < 30) { settings.block.windowMinSamples = 30; changed = true; }
      if (settings.block.windowLookback !== undefined && settings.block.windowLookback < settings.block.windowMinSamples!) {
        settings.block.windowLookback = settings.block.windowMinSamples; changed = true;
      }
    }
    if (settings?.tactics) {
      if (settings.tactics.volRegime !== true) { settings.tactics.volRegime = true; changed = true; }
      if (settings.tactics.trendStrength !== true) { settings.tactics.trendStrength = true; changed = true; }
    }
    if (changed) {
      db.kvSet("signalEvaluation15ExitOff20261116BackupV1", backup);
      db.kvSet("settings", settings);
    }
    db.kvSet(version, true);
  });
}

/** Enable the range-tagged Axis lanes when Wide is disabled; never rewrite an owned position. */
export function migrateAxisPerRange(db: CoreDb): void {
  const version = "axisPerRangeWideOff20261116V1";
  if (db.kvGet(version)) return;
  db.tx(() => {
    const settings = db.kvGet<SettingsPatch>("settings");
    if (settings?.axis && settings.axis.perRange !== true) {
      db.kvSet("axisPerRangeWideOff20261116BackupV1", structuredClone(settings.axis));
      settings.axis.perRange = true;
      db.kvSet("settings", settings);
    }
    db.kvSet(version, true);
  });
}
