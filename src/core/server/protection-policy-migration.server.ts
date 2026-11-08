import { DEFAULT_MIN_SL_DISTANCE_PCT, SL_TP_MAX, SL_TP_MIN, SL_TP_RATIOS, SL_TP_STEP } from "../protection-policy.ts";
import type { CoreDb } from "./db.server.ts";
import { DEFAULT_SIGNALS } from "../signal-config.ts";

const FLAG = "minimumProtectionPolicy20261108";
const ratio = (n: number) => Math.max(SL_TP_MIN, Math.min(SL_TP_MAX, Math.round(n / SL_TP_STEP) * SL_TP_STEP));

/** Migrate future candidates only. Owned orders, positions, fills and historical evidence are never rewritten. */
export function migrateMinimumProtectionPolicy(db: CoreDb): void {
  if (db.kvGet(FLAG)) return;
  db.tx(() => {
  const settings = db.kvGet<Record<string, any>>("settings");
  const presets = db.kvGet<Array<Record<string, any>>>("presets");
  const presetBacktests = db.kvGet("presetBacktests"), presetSeries = db.kvGet("presetSeries");
  const baseConfigCounts = db.kvGet("baseConfigCounts");
  if (settings || presets) db.kvSet(FLAG + "Backup", { settings, presets, presetBacktests, presetSeries, baseConfigCounts });
  const update = (s: Record<string, any>, preset = false) => {
    // An omitted preset field keeps inheriting the current overall setting.
    if (!preset) s.minSlDistancePct ??= DEFAULT_MIN_SL_DISTANCE_PCT;
    const arrays = (o: Record<string, any> | undefined, key: string) => {
      if (!o || !Array.isArray(o[key])) return;
      const values = o[key].filter((x: unknown) => typeof x === "number" && Number.isFinite(x)).map(ratio);
      o[key] = values.length ? [...new Set(values)].sort((a, b) => Number(a) - Number(b)) : [...SL_TP_RATIOS];
    };
    const g = s.grid;
    if (g) {
      arrays(g, "slOfTp");
      delete g.minSl; delete g.minSlEval;
      for (const name of ["micro", "minimal", "short", "general", "long"]) {
        const r = g[name]; if (!r || typeof r !== "object") continue;
        arrays(r, "slOfTp"); delete r.minSl; delete r.minSlEval; delete r.minSlNet;
        if (Number.isFinite(r.trailSlOfTp)) r.trailSlOfTp = ratio(r.trailSlOfTp);
      }
      arrays(g.lowRange, "slRatios");
    }
    arrays(s.signals?.normal, "slOfTp"); arrays(s.signals?.hist, "slOfTp");
    const trailing = s.signals?.trailing;
    if (trailing?.slOfTp === 3 &&
        JSON.stringify(trailing.tp) === JSON.stringify(DEFAULT_SIGNALS.trailing.tp) &&
        JSON.stringify(trailing.trailOfTp) === JSON.stringify(DEFAULT_SIGNALS.trailing.trailOfTp))
      trailing.slOfTp = DEFAULT_SIGNALS.trailing.slOfTp;
    for (const r of [s.signals?.trailing, s.dca]) if (r && Number.isFinite(r.slOfTp)) r.slOfTp = ratio(r.slOfTp);
    if (s.signals) delete s.signals.minSl;
    if (s.protectFloor) delete s.protectFloor.minSl;
  };
  if (settings) { update(settings); db.kvSet("settings", settings); }
  if (presets) {
    for (const p of presets) {
      if (p.settings) update(p.settings, true);
      // A changed initial stop invalidates a previously scored candidate. The
      // original result is in Backup; actual fills and realized PnL stay intact.
      if (p.metrics && p.metrics.pfBasis !== "unavailable") {
        const { gp: _gp, gl: _gl, ...m } = p.metrics;
        p.metrics = { ...m, pf: null, pfBasis: "unavailable", noLoss: null, pfConvention: "unavailable",
          source: `${typeof m.source === "string" ? m.source : "Previous result"} — initial SL policy changed; re-evaluate for current results` };
      }
    }
    db.kvSet("presets", presets);
  }
  for (const key of ["presetBacktests", "presetSeries"])
    if (db.kvGet(key) !== undefined) db.kvSet(key, {});
  db.run("DELETE FROM kv WHERE k = ?", "baseConfigCounts");
  db.kvSet(FLAG, true);
  });
}
