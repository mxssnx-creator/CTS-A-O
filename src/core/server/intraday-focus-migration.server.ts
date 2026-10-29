import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS, type SettingsPatch } from "../config.ts";
import type { CoreDb } from "./db.server.ts";

// Exact ordered1841-entry factory selection before30m subsets. Never derive a migration identity from new defaults.
const FORMER_FACTORY_SHA = "bee61e84d7a2f9c6a3c17a2bddf9c02ac4d1b897df24490687bb0e5cac8b3c73";
const fingerprint = (focus: unknown) => createHash("sha256").update(JSON.stringify(focus)).digest("hex");
export const isFormerIntradayFocus = (focus: unknown): boolean =>
  Array.isArray(focus) && focus.every((x) => typeof x === "string") && fingerprint(focus) === FORMER_FACTORY_SHA;
type SavedPreset = { id: string; settings?: SettingsPatch; metrics?: Record<string, unknown> };

/** Upgrade only the exact factory selection, with transactional backup and selective proof retirement. */
export function migrateIntradayFocus(db: CoreDb): void {
  if (db.kvGet("intraday30FocusV1")) return;
  const settings = db.kvGet<SettingsPatch>("settings"), presets = db.kvGet<SavedPreset[]>("presets");
  const backtests = db.kvGet<Record<string, unknown>>("presetBacktests"), series = db.kvGet<Record<string, unknown>>("presetSeries");
  const backup = structuredClone({ settings, presets, presetBacktests: backtests, presetSeries: series });
  const currentFactorySha = fingerprint(DEFAULT_SETTINGS.focus);
  const factory = (f: unknown) => f === undefined || isFormerIntradayFocus(f) ||
    Array.isArray(f) && fingerprint(f) === currentFactorySha;
  // Empty Focus means all sources. Bare Low-Range/standard Inverse sources acquire new30m lanes too,
  // even when the operator keeps that custom selection; their older cache is not a proof of the new scope.
  const expands = (f: unknown) => factory(f) || Array.isArray(f) && (f.length === 0 || f.some((key) => {
    if (typeof key !== "string") return false;
    const ind = key.split("|")[1] ?? "";
    return !/@m\d+(?:c(?:30)?)?$/.test(ind) &&
      (ind.startsWith("low-range-") || ind.startsWith("inverse-") && !ind.startsWith("inverse-micro-"));
  }));
  const inherited = expands(settings?.focus), invalid = new Set<string>();
  let changed = false;
  const upgrade = (s?: SettingsPatch) => {
    if (s && isFormerIntradayFocus(s.focus)) { s.focus = [...DEFAULT_SETTINGS.focus]; changed = true; }
  };
  upgrade(settings);
  const byId = new Map((presets ?? []).map((p) => [p.id, p]));
  for (const p of presets ?? []) {
    if (!(p.settings?.focus === undefined ? inherited : expands(p.settings.focus))) continue;
    invalid.add(p.id); upgrade(p.settings);
    if (p.metrics) {
      const { gp: _gp, gl: _gl, ...metrics } = p.metrics;
      p.metrics = { ...metrics, pf: null, pfBasis: "unavailable", noLoss: null, pfConvention: "unavailable",
        source: `${typeof metrics.source === "string" ? metrics.source : "Previous result"} — intraday catalogue changed; re-evaluate for current results` };
      changed = true;
    }
  }
  for (const id of new Set([...Object.keys(backtests ?? {}), ...Object.keys(series ?? {})])) {
    const p = byId.get(id);
    if (!p || (p.settings?.focus === undefined ? inherited : expands(p.settings.focus))) invalid.add(id);
  }
  db.tx(() => {
    if (changed || invalid.size) db.kvSet("intraday30FocusBackupV1", { ...backup, invalidPresetIds: [...invalid] });
    if (changed) {
      if (settings) db.kvSet("settings", settings);
      if (presets) db.kvSet("presets", presets);
    }
    if (invalid.size) {
      const keptBacktests = { ...backtests }, keptSeries = { ...series };
      for (const id of invalid) { delete keptBacktests[id]; delete keptSeries[id]; }
      if (backtests) db.kvSet("presetBacktests", keptBacktests);
      if (series) db.kvSet("presetSeries", keptSeries);
    }
    db.kvSet("intraday30FocusV1", true);
  });
}
