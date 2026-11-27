import type { Bars } from "./domain/types.ts";

/** Seven complete trailing days, observed before the current onset. */
export const SIGNAL_CADENCE_DAYS = 7;
const DAY_MS = 24 * 60 * 60_000;

/**
 * Gate a source/symbol/lane's entries by its own raw onset frequency. Protective configurations share the same
 * source array, so none of their duplicate positions can inflate the count. The current onset is not included.
 * An incomplete or gapped seven-day interval is unknown and cannot authorize an entry.
 */
export function signalCadence(
  entries: Int8Array,
  source: Int8Array,
  bars: Pick<Bars, "t" | "tfMin" | "n">,
  minDaily: number,
): Int8Array {
  if (!Number.isFinite(minDaily)) return new Int8Array(entries.length);
  if (!(minDaily > 0)) return entries;
  if (entries.length !== source.length || entries.length !== bars.n ||
      !Number.isFinite(bars.tfMin) || !(bars.tfMin > 0)) return new Int8Array(entries.length);
  const period = bars.tfMin * 60_000, window = SIGNAL_CADENCE_DAYS * DAY_MS;
  const minCount = minDaily * SIGNAL_CADENCE_DAYS;
  const out = new Int8Array(entries.length);
  let left = 0, count = 0, lastGapEnd = -Infinity;
  for (let i = 0; i < bars.n; i++) {
    const now = bars.t[i];
    if (!Number.isFinite(now)) break;
    // A backward or duplicate timestamp is not a missing candle: later order is no longer trustworthy. Preserve
    // the already-decided prefix and refuse the remainder rather than accidentally counting a future onset.
    if (i && now <= bars.t[i - 1]) break;
    if (i && now - bars.t[i - 1] !== period) lastGapEnd = now;
    const from = now + period - window;
    while (left < i && bars.t[left] + period < from) {
      if (source[left] !== 0) count--;
      left++;
    }
    if (entries[i] !== 0 && from >= bars.t[0] && lastGapEnd <= from && count >= minCount)
      out[i] = entries[i];
    if (source[i] !== 0) count++;
  }
  return out;
}
