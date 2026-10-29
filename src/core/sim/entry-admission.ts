import type { Bars, Side } from "../domain/types.ts";

export interface SimulationEntry {
  readonly cfg: string;
  readonly sym: string;
  readonly side: Side;
  readonly signalCloseT: number;
  /** Next-open market entry or the initial placement time of a resting ladder. */
  readonly entryT: number;
  readonly entry: number;
}
export type EntryAdmission = (entry: SimulationEntry) => boolean;

/** Called before any position, waiting limit or resting ladder can occupy the independent lane. */
export function admitSimulationEntry(admit: EntryAdmission | undefined, cfg: string, bars: Bars, signalI: number,
  side: Side): boolean {
  if (!admit) return true;
  const result = admit({ cfg, sym: bars.sym, side, signalCloseT: bars.t[signalI] + bars.tfMin * 60_000,
    entryT: bars.t[signalI + 1], entry: bars.o[signalI + 1] });
  if (typeof result !== "boolean") throw new TypeError("entry admission must return a boolean");
  return result;
}
