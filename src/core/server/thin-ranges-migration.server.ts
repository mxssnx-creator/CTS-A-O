import { FINE_SL_TP_RATIOS, SL_TP_RATIOS, THIN_SL_TP_RATIOS } from "../protection-policy.ts";
import type { CoreDb } from "./db.server.ts";

const flag = "thinMicroMinimalShort20261116V1";
const same = (a: unknown, b: readonly number[]) => Array.isArray(a) && a.length === b.length &&
  a.every((x, i) => typeof x === "number" && Math.abs(x - b[i]) < 1e-9);

/** Update former factory ladders only; existing positions retain their captured protections. */
export function migrateThinRanges(db: CoreDb): void {
  if (db.kvGet(flag)) return;
  db.tx(() => {
    const settings = db.kvGet<Record<string, any>>("settings");
    const presets = db.kvGet<Array<Record<string, any>>>("presets");
    const backup = structuredClone({ settings, presets });
    const move = (s: Record<string, any> | undefined) => {
      let changed = false;
      for (const name of ["micro", "minimal", "short"]) {
        const r = s?.grid?.[name];
        if (!r || typeof r !== "object") continue;
        const old = name === "micro" ? FINE_SL_TP_RATIOS : SL_TP_RATIOS;
        if (!same(r.slOfTp, old)) continue;
        r.slOfTp = [...THIN_SL_TP_RATIOS];
        if (name !== "micro" && r.trailSlOfTp === SL_TP_RATIOS[0]) r.trailSlOfTp = THIN_SL_TP_RATIOS[0];
        changed = true;
      }
      return changed;
    };
    let changed = false;
    if (settings && move(settings)) { db.kvSet("settings", settings); changed = true; }
    if (presets) {
      let presetsChanged = false;
      for (const p of presets) if (move(p.settings)) {
        presetsChanged = true;
        if (p.metrics && p.metrics.pfBasis !== "unavailable") {
          const { gp: _gp, gl: _gl, ...m } = p.metrics;
          p.metrics = { ...m, pf: null, pfBasis: "unavailable", noLoss: null, pfConvention: "unavailable",
            source: `${typeof m.source === "string" ? m.source : "Previous result"} — stop grid changed; re-evaluate` };
        }
      }
      if (presetsChanged) { db.kvSet("presets", presets); changed = true; }
    }
    if (changed) db.kvSet("thinMicroMinimalShort20261116BackupV1", backup);
    db.kvSet(flag, true);
  });
}
