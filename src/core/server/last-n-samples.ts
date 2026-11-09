import { sampleWindowsForTape, type ConfigTape, type WalkForwardOptions } from "../sim/walkforward.ts";

export interface SampleCount {
  contexts: number;
  full: number;
  usable: number;
  insufficient: number;
  unknown: number;
  disabled: number;
  pct: number | null;
}
export interface LastNSamples {
  at: number;
  basis: "candidate-config-symbol-side";
  configs: number;
  heldOnly: number;
  rows: Array<SampleCount & { kind: string; range: string; window: string; n: number }>;
}
const empty = (): SampleCount => ({ contexts: 0, full: 0, usable: 0, insufficient: 0, unknown: 0, disabled: 0, pct: null });

/** Bounded counts on the published tapes. Includes empty sides and losing rows,
 * excludes same-clock/future closes, and never treats carried evidence as fresh.
 * These are exact-context candidate samples, not processed Main/Real or venue proof. */
export function* lastNSamplesGen(tapes: readonly ConfigTape[], at: number, o: WalkForwardOptions): Generator<void, LastNSamples> {
  if (!Number.isFinite(at)) throw new Error("Invalid sample clock");
  const groups = new Map<string, LastNSamples["rows"][number]>();
  let configs = 0, heldOnly = 0, work = 0;
  for (const tp of tapes) {
    if (tp.heldOnly) { heldOnly++; continue; }
    configs++;
    const windows = sampleWindowsForTape(tp, o);
    const cap = Math.max(0, ...Object.values(windows));
    const own = new Map<string, number[]>();
    for (const sym of new Set(tp.syms)) for (const side of [1, -1]) own.set(JSON.stringify([sym, side]), []);
    let remaining = cap > 0 ? own.size : 0;
    if (!tp.carried) for (let i = tp.n - 1; i >= 0 && remaining; i--) {
      if ((++work & 4095) === 0) yield;
      if (!(tp.exitT[i] < at)) continue;
      const rows = own.get(JSON.stringify([tp.syms[tp.symI[i]], tp.side[i]]));
      if (!rows || rows.length >= cap) continue;
      rows.push(tp.r[i]);
      if (rows.length === cap) remaining--;
    }
    for (const [window, n] of Object.entries(windows)) {
      const range = tp.protect.tag ?? "none";
      const key = JSON.stringify([tp.kind, range, window, n]);
      let row = groups.get(key);
      if (!row) groups.set(key, row = { ...empty(), kind: tp.kind, range, window, n });
      for (const values of own.values()) {
        row.contexts++;
        if (n <= 0) { row.disabled++; continue; }
        if (tp.carried) { row.unknown++; continue; }
        if (values.length < n) { row.insufficient++; continue; }
        row.full++;
        if (values.slice(0, n).every(Number.isFinite)) row.usable++;
        else row.unknown++;
      }
    }
    if ((configs & 255) === 0) yield;
  }
  const rows = [...groups.values()];
  for (const row of rows) {
    const denominator = row.contexts - row.disabled;
    row.pct = denominator && row.full + row.insufficient > 0 ? row.usable * 100 / denominator : null;
  }
  return { at, basis: "candidate-config-symbol-side", configs, heldOnly, rows };
}
