import {
  FINE_SL_TP_RATIOS, FINE_TRAIL_RATIOS, FORMER_FINE_SL_TP_RATIOS, FORMER_FINE_TRAIL_RATIOS,
} from "../protection-policy.ts";
import type { CoreDb } from "./db.server.ts";

export const FINE_LADDER_FLAG = "microLowRangeFineLadder20261111V1";
export const FINE_LADDER_BACKUP = "microLowRangeFineLadder20261111BackupV1";

const same = (a: unknown, b: readonly number[]) =>
  Array.isArray(a) && a.length === b.length && a.every((x, i) => typeof x === "number" && Math.abs(x - b[i]) < 1e-9);

/**
 * Micro and Low-Range, 11 Nov 2026: stop ratios 0.2–1.6 step 0.1 and trailing shares 0.1–0.6 step 0.1.
 * Only a ladder still on the former factory value (0.25–2.5 step 0.25; trailing ¼ / ½ / ¾) moves; an edited ladder
 * stays. Future candidates only: owned positions, their captured protection, orders and fills are not touched.
 * A preset whose ladder moved loses its recorded PF (the original stays in the backup) until it is re-evaluated.
 */
export function migrateFineLadders(db: CoreDb): void {
  if (db.kvGet(FINE_LADDER_FLAG)) return;
  db.tx(() => {
    const settings = db.kvGet<Record<string, any>>("settings");
    const presets = db.kvGet<Array<Record<string, any>>>("presets");
    const move = (s: Record<string, any> | undefined): boolean => {
      const g = s?.grid;
      if (!g || typeof g !== "object") return false;
      let changed = false;
      const micro = g.micro;
      if (micro && typeof micro === "object") {
        if (same(micro.slOfTp, FORMER_FINE_SL_TP_RATIOS)) { micro.slOfTp = [...FINE_SL_TP_RATIOS]; changed = true; }
        if (same(micro.trailOfTp, FORMER_FINE_TRAIL_RATIOS)) { micro.trailOfTp = [...FINE_TRAIL_RATIOS]; changed = true; }
        // forEachMicro applies the configured ratio as is; the stored 0.25 was the former ladder's first value
        if (changed && micro.trailSlOfTp === FORMER_FINE_SL_TP_RATIOS[0]) micro.trailSlOfTp = FINE_SL_TP_RATIOS[0];
      }
      const lr = g.lowRange;
      if (lr && typeof lr === "object") {
        if (same(lr.slRatios, FORMER_FINE_SL_TP_RATIOS)) { lr.slRatios = [...FINE_SL_TP_RATIOS]; changed = true; }
        if (same(lr.trailRatios, FORMER_FINE_TRAIL_RATIOS)) { lr.trailRatios = [...FINE_TRAIL_RATIOS]; changed = true; }
      }
      return changed;
    };
    const before = structuredClone({ settings, presets });
    let any = false;
    if (settings && move(settings)) { db.kvSet("settings", settings); any = true; }
    if (Array.isArray(presets)) {
      let changed = false;
      for (const p of presets) {
        if (!move(p.settings)) continue;
        changed = true;
        if (p.metrics && p.metrics.pfBasis !== "unavailable") {
          const { gp: _gp, gl: _gl, ...m } = p.metrics;
          p.metrics = { ...m, pf: null, pfBasis: "unavailable", noLoss: null, pfConvention: "unavailable",
            source: `${typeof m.source === "string" ? m.source : "Previous result"} — Micro / Low-Range ladders changed; re-evaluate` };
        }
      }
      if (changed) { db.kvSet("presets", presets); any = true; }
    }
    if (any) db.kvSet(FINE_LADDER_BACKUP, before);
    db.kvSet(FINE_LADDER_FLAG, true);
  });
}
