import { signalSettings, type SignalSettings } from "../../core/signal-config.ts";
import { signalProtects } from "../../core/signals.ts";

export interface SignalUnit {
  bot: string;
  /** Full indication identity, including its range and timeframe lane. */
  ind: string;
  sym: string;
  side: number;
  /** Absent only for a legacy Base / discovery unit. */
  kind?: string | null;
  /** Exact protection config; absent for Base / discovery evidence. */
  cfg?: string | null;
}

export function signalTypeLabel(kind?: string | null): string {
  if (!kind) return "Base / discovery";
  return ({ normal: "Normal", trailing: "Trailing with TP", "trailing-only": "Trailing only · no TP", exit: "Historic Exit", dca: "DCA", "dca-active": "DCA Active", axis: "Axis" } as Record<string, string>)[kind] ?? kind;
}

/** Read the canonical Exit suffix without importing the server-side config pipeline into the browser. */
export function historicExitLabel(value: { cfg?: string; key?: string; id?: string }): string | null {
  const suffix = /\|hx([LS])?([012])?$/.exec(value.cfg ?? value.key ?? value.id ?? "");
  if (!suffix) return null;
  const family = suffix[2] === "0" ? "Static SL" : suffix[2] === "1" ? "Adaptive SL" : suffix[2] === "2" ? "Trailing" : null;
  const side = suffix[1] === "L" ? "Long" : suffix[1] === "S" ? "Short" : null;
  return ["Historic Exit", family, side].filter(Boolean).join(" · ");
}

/** Match the engine's normalized percent/ATR grids and the independent no-TP grid. */
export function signalConfigCounts(input?: Partial<SignalSettings> | null) {
  const s = signalSettings(input);
  const protects = signalProtects(s);
  const normal = protects.filter((p) => !p.atr && !p.trailOnly && p.trail === 0).length;
  const trailing = protects.filter((p) => !p.atr && !p.trailOnly && p.trail > 0).length;
  const atr = protects.filter((p) => !!p.atr).length;
  // The UI reports requested trailing-only cells even when the engine rejects them below its minimum trail floor.
  // Deduplicate repeated stop values so the count reflects distinct configs, not duplicate array entries.
  const trailingOnly = s.trailingOnly.enabled
    ? new Set(
        s.trailingOnly.sl.flatMap((sl) =>
          s.trailingOnly.trail.map((trail) => `${sl}|${trail}|${s.trailingOnly.trailStep}`),
        ),
      ).size
    : 0;
  const pct = normal + trailing;
  const validTrailingOnly = protects.filter((p) => p.trailOnly).length;
  const total = protects.length - validTrailingOnly + trailingOnly;
  return { normal, trailing, pct, atr, trailingOnly, total };
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

/** Every independently ranked unit retains a distinct row, including its full pair, direction, type and protection config. */
export function signalUnitRowKey(unit: SignalUnit): string {
  return JSON.stringify([unit.bot, unit.ind, unit.sym, unit.side > 0 ? 1 : -1, unit.kind ?? null, unit.cfg ?? null]);
}

