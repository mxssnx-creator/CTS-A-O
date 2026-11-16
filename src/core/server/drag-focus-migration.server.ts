import { DEFAULT_SETTINGS, PRE_DRAG_FACTORY_FOCUS, type SettingsPatch } from "../config.ts";
import { dragReferenceSelection } from "../indications/drag.ts";
import type { Preset } from "../presets.ts";
import type { CoreDb } from "./db.server.ts";

export const DRAG_FOCUS_FLAG = "dragFactoryFocus20261116V1";
export const DRAG_FOCUS_BACKUP = "dragFactoryFocus20261116BackupV1";

/**
 * Upgrade only exact factory selections once. Edited, disabled and empty Focus lists remain choices.
 * Previously recorded preset PF is no longer evidence for the expanded selection.
 */
export function migrateDragFactoryFocus(db: CoreDb): void {
  if (db.kvGet(DRAG_FOCUS_FLAG)) return;
  db.tx(() => {
    const settings = db.kvGet<SettingsPatch>("settings");
    const presets = db.kvGet<Preset[]>("presets");
    const before = structuredClone({ settings, presets });
    const move = (s: SettingsPatch | undefined) => {
      if (!s) return false;
      const serialized = JSON.stringify(s.focus);
      const former = serialized === JSON.stringify(PRE_DRAG_FACTORY_FOCUS);
      const current = serialized === JSON.stringify(DEFAULT_SETTINGS.focus);
      if (!former && !current) return false;
      let changed = false;
      if (former) { s.focus = [...DEFAULT_SETTINGS.focus]; changed = true; }
      // An absent forced-symbol setting inherits the factory BTC reference. If a list exists,
      // keep every chosen symbol and add BTC only when there is room.
      if (Array.isArray(s.forceSymbols)) {
        const selected = dragReferenceSelection(s.forceSymbols);
        if (selected.symbols.length !== s.forceSymbols.length) {
          s.forceSymbols = selected.symbols;
          changed = true;
        }
      }
      return changed;
    };
    let any = false;
    if (move(settings)) { db.kvSet("settings", settings); any = true; }
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) {
        if (!move(preset.settings)) continue;
        changed = true;
        if (preset.metrics && preset.metrics.pfBasis !== "unavailable") {
          const { gp: _gp, gl: _gl, ...m } = preset.metrics;
          preset.metrics = { ...m, pf: null, pfBasis: "unavailable", noLoss: null, pfConvention: "unavailable",
            source: `${m.source || "Previous result"} — Drag selection changed; re-evaluate` };
        }
      }
      if (changed) { db.kvSet("presets", presets); any = true; }
    }
    if (any) db.kvSet(DRAG_FOCUS_BACKUP, before);
    db.kvSet(DRAG_FOCUS_FLAG, true);
  });
}
