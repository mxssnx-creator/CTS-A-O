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

/** Count configured cells for the UI, including cells the engine later filters below its trail floor. */
export function signalConfigCounts(input?: Partial<SignalSettings> | null) {
  const s = signalSettings(input);
  // The settings panel reports the requested grid. Runtime eligibility applies minTrail after this count, so
  // show those configured cells instead of making them disappear from the user's configuration summary.
  const protects = signalProtects({ ...s, minTrail: 0 });
  const normal = protects.filter((p) => !p.atr && !p.trailOnly && p.trail === 0).length;
  const trailing = protects.filter((p) => !p.atr && !p.trailOnly && p.trail > 0).length;
  const atr = protects.filter((p) => !!p.atr).length;
  const trailingOnly = protects.filter((p) => p.trailOnly).length;
  const pct = normal + trailing;
  return { normal, trailing, pct, atr, trailingOnly, total: protects.length };
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

