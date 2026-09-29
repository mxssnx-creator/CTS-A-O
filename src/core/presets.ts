// Presets: named, complete engine settings with the measured results that justify them.
// Research presets are fixed here (measured offline on real data, see docs/tactics.md); saved presets are
// captured from the running engine (manually or automatically after a successful simulated run).
import { SHORT_RANGE, type CoreSettings } from "./config.ts";
import type { Stats } from "./domain/types.ts";
import { RESEARCH_PRESETS as RESEARCH_PRESETS_RAW } from "./presets.research.ts";

export interface PresetMetrics {
  /** profit factor after the 0.2% round-trip cost */
  pf: number;
  /** closed trades */
  n: number;
  /** trades per day */
  perDay: number;
  /** win rate 0..1 */
  wr: number;
  /** summed trade return, % of notional */
  net: number;
  /** success ratio: share of trading hours that closed positive, 0..1 */
  greenHours: number;
  /** share of trading days that closed positive, 0..1 */
  greenDays?: number;
  /** positive runs / runs (2-day walk-forward runs) */
  positiveRuns?: number;
  runs?: number;
  /** longest drawdown time in hours */
  ddtH?: number;
  /** every measured period (research presets from the simulated trading matrix) */
  checks?: Array<{
    period: string;
    label: string;
    pf: number;
    n: number;
    perDay: number;
    greenHours: number;
    wr: number;
    positiveRuns?: number;
    runs?: number;
  }>;
  /** out-of-time check on data no selection saw */
  oot?: { period: string; pf: number; n: number; perDay: number; greenHours: number; wr: number };
  period: string;
  source: string;
}

export type PresetKind = "research" | "saved" | "auto";

export interface Preset {
  id: string;
  label: string;
  info: string;
  kind: PresetKind;
  at: number;
  /** CoreSettings patch (never contains the Live stage) */
  settings: Partial<CoreSettings>;
  /** walk-forward patch (mode, last-N, caps …) */
  wf: Record<string, unknown>;
  metrics: PresetMetrics;
}

/**
 * Strip what a preset must never carry or change: the Live stage and everything that sizes or costs real orders
 * (sizing, paper balance, cost model and fees — an auto-raised cost is never undone by a preset), the loop timing
 * and the live auto-adjuster.
 */
export const PRESET_EXCLUDED = [
  "live",
  "sizing",
  "paperBalance",
  "cost",
  "fees",
  "cycleMs",
  "tickMs",
  "adjust",
] as const;
export function presetSettings(s: Partial<CoreSettings>): Partial<CoreSettings> {
  const rest: Record<string, unknown> = { ...s };
  for (const k of PRESET_EXCLUDED) delete rest[k];
  return structuredClone(rest) as Partial<CoreSettings>;
}

/** Stable identity of a settings + wf pair (for de-duplicating auto presets). */
export function presetKey(settings: Partial<CoreSettings>, wf: Record<string, unknown>): string {
  const norm = (o: unknown): unknown =>
    Array.isArray(o)
      ? o.map(norm)
      : o && typeof o === "object"
        ? Object.fromEntries(
            Object.keys(o as object)
              .sort()
              .map((k) => [k, norm((o as Record<string, unknown>)[k])]),
          )
        : o;
  const json = JSON.stringify(norm({ settings: presetSettings(settings), wf }));
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) h = Math.imul(h ^ json.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export function metricsFromStats(
  st: Stats,
  spanH: number,
  period: string,
  source: string,
  extra: Partial<PresetMetrics> = {},
): PresetMetrics {
  return {
    pf: st.pf,
    n: st.n,
    perDay: spanH > 0 ? (st.n * 24) / spanH : 0,
    wr: st.wr,
    net: st.net,
    greenHours: st.gh,
    ddtH: st.ddt,
    period,
    source,
    ...extra,
  };
}

/** Insert or replace; an auto preset for the same settings is replaced only by a better (PF) run. Keeps `max`. */
export function upsertPreset(list: readonly Preset[], p: Preset, max = 40): Preset[] {
  const out = [...list];
  const i = out.findIndex((x) => x.id === p.id);
  if (i >= 0) {
    if (p.kind === "auto" && out[i].kind === "auto" && out[i].metrics.pf >= p.metrics.pf)
      return out;
    out[i] = p;
  } else out.push(p);
  // drop the oldest auto presets first, never a manually saved one
  while (out.length > max) {
    // oldest auto preset first; only when none is left, the oldest saved one (the list stays bounded)
    const pick = (kind: PresetKind) =>
      out
        .map((x, k) => [x, k] as const)
        .filter(([x]) => x.kind === kind)
        .sort((a, b) => a[0].at - b[0].at)[0]?.[1];
    const j = pick("auto") ?? pick("saved");
    if (j === undefined) break;
    out.splice(j, 1);
  }
  return out;
}

/** Whether a simulated run qualifies for an automatic preset. */
export function qualifies(st: Stats, stable: boolean, minPf: number, minTrades: number): boolean {
  return stable && st.n >= minTrades && st.pf >= minPf && st.net > 0;
}

/** Every research preset allows a 35 h drawdown and the short order range beside its wide targets. */
export const RESEARCH_PRESETS: Preset[] = RESEARCH_PRESETS_RAW.map((p) => ({
  ...p,
  settings: {
    ...p.settings,
    gates: { ...(p.settings.gates ?? {}), maxDdtH: 35 },
    grid: {
      ...(p.settings.grid ?? {}),
      short:
        p.settings.grid?.short !== undefined
          ? p.settings.grid.short
          : {
              tp: [...SHORT_RANGE.tp],
              slOfTp: [...SHORT_RANGE.slOfTp],
              trailOfTp: [...SHORT_RANGE.trailOfTp],
              trailSlOfTp: SHORT_RANGE.trailSlOfTp,
              minSl: SHORT_RANGE.minSl,
              minTrail: SHORT_RANGE.minTrail,
            },
    },
  },
}));
