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
