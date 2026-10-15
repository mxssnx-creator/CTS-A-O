import { signalSettings, type SignalSettings } from "../../core/signal-config.ts";

export interface SignalUnit {
  bot: string;
  /** Full indication identity, including its range and timeframe lane. */
  ind: string;
  sym: string;
  side: number;
  /** Absent only for a legacy Base / discovery unit. */
  kind?: string | null;
}

export function signalTypeLabel(kind?: string | null): string {
  if (!kind) return "Base / discovery";
  return ({ normal: "Normal", trailing: "Trailing with TP", "trailing-only": "Trailing only · no TP", dca: "DCA", "dca-active": "DCA Active", axis: "Axis" } as Record<string, string>)[kind] ?? kind;
}

/** Match the engine's normalized percent/ATR grids and the independent no-TP grid. */
export function signalConfigCounts(input?: Partial<SignalSettings> | null) {
  const s = signalSettings(input);
  const normal = s.normal.tp.length * s.normal.slOfTp.length;
  const trailing = s.trailing.tp.length * s.trailing.trailOfTp.length;
  const pct = s.exits === "atr" ? 0 : normal + trailing;
  const atr = s.exits === "pct" ? 0 : s.atr.sl.length * s.atr.tpRatio.length * (1 + s.atr.trail.length);
  const trailingOnly = s.trailingOnly.enabled ? s.trailingOnly.sl.length * s.trailingOnly.trail.length : 0;
  return { normal, trailing, pct, atr, trailingOnly, total: pct + atr + trailingOnly };
}

/** TP zero alone is not proof of no-TP mode: aggregate live rows also use zero for missing config detail. */
export function hasNoTakeProfit(value: { tp?: number; trailOnly?: boolean; kind?: string; cfg?: string; key?: string; id?: string }) {
  return value.trailOnly === true || value.kind === "trailing-only" || value.kind === "Trailing only" ||
    /\|to(?:\||$)/.test(value.cfg ?? value.key ?? value.id ?? "");
}

/** This ratio multiplies the activation move to obtain the trailing gap; it is not a TP ratio or ratchet tick. */
export function signalTrailGapRatio(value: { trailStep?: number; cfg?: string; key?: string; id?: string }): number {
  const recorded = value.trailStep ?? Number(/\|ts([\d.]+)(?:\||$)/.exec(value.cfg ?? value.key ?? value.id ?? "")?.[1] ?? 1);
  return Number.isFinite(recorded) && recorded > 0 ? recorded : 1;
}

/** Every independently ranked unit retains a distinct row, including its full pair, direction and type. */
export function signalUnitRowKey(unit: SignalUnit): string {
  return JSON.stringify([unit.bot, unit.ind, unit.sym, unit.side > 0 ? 1 : -1, unit.kind ?? null]);
}

