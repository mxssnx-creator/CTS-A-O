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
  return ({ normal: "Normal", trailing: "Trailing", dca: "DCA", "dca-active": "DCA Active", axis: "Axis" } as Record<string, string>)[kind] ?? kind;
}

/** Every independently ranked unit retains a distinct row, including its full pair, direction and type. */
export function signalUnitRowKey(unit: SignalUnit): string {
  return JSON.stringify([unit.bot, unit.ind, unit.sym, unit.side > 0 ? 1 : -1, unit.kind ?? null]);
}
