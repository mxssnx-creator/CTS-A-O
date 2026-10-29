import { DEFAULT_SETTINGS, mergeGridSettings, type SettingsPatch } from "../config.ts";
import type { CoreDb } from "./db.server.ts";

type Preset = { id: string; settings?: SettingsPatch; metrics?: Record<string, unknown> };
function hasCap(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (obj.enabled === false) return false;
  if (typeof obj.maxHoldMin === "number" && obj.maxHoldMin > 0) return true;
  return Object.values(obj).some(hasCap);
}

/** Changed model economics need fresh proofs. Preserve settings, held positions and realized ledgers verbatim. */
export function migrateMinuteCaps(db: CoreDb): void {
  if (db.kvGet("minuteCapExecutionV1")) return;
  const settings = db.kvGet<SettingsPatch>("settings"), presets = db.kvGet<Preset[]>("presets");
  const backtests = db.kvGet<Record<string, unknown>>("presetBacktests");
  const series = db.kvGet<Record<string, unknown>>("presetSeries");
  const counts = db.kvGet("baseConfigCounts");
  const backup = structuredClone({ settings, presets, presetBacktests: backtests, presetSeries: series, baseConfigCounts: counts });
  const inherited = mergeGridSettings(DEFAULT_SETTINGS.grid, settings?.grid);
  const invalid = new Set<string>(), known = new Set<string>();
  let changed = false;
  for (const p of presets ?? []) {
    known.add(p.id);
    if (!hasCap(mergeGridSettings(inherited, p.settings?.grid))) continue;
    invalid.add(p.id);
    if (p.metrics) {
      const { gp: _gp, gl: _gl, ...m } = p.metrics;
      p.metrics = { ...m, pf: null, pfBasis: "unavailable", noLoss: null, pfConvention: "unavailable",
        source: `${typeof m.source === "string" ? m.source : "Previous result"} — minute-cap execution changed; re-evaluate for current results` };
      changed = true;
    }
  }
  for (const id of new Set([...Object.keys(backtests ?? {}), ...Object.keys(series ?? {})]))
    if (!known.has(id)) invalid.add(id); // orphaned proofs have no verifiable configuration
  db.tx(() => {
    const retireCounts = counts !== undefined && (hasCap(inherited) || invalid.size > 0);
    if (invalid.size || retireCounts) db.kvSet("minuteCapExecutionBackupV1", { ...backup, invalidPresetIds: [...invalid] });
    if (changed) db.kvSet("presets", presets);
    if (backtests) db.kvSet("presetBacktests", Object.fromEntries(Object.entries(backtests).filter(([id]) => !invalid.has(id))));
    if (series) db.kvSet("presetSeries", Object.fromEntries(Object.entries(series).filter(([id]) => !invalid.has(id))));
    if (retireCounts) db.run("DELETE FROM kv WHERE k = ?", "baseConfigCounts");
    db.kvSet("minuteCapExecutionV1", true);
  });
}
