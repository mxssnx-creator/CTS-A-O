import { isSignalInd } from "../indications/registry.ts";
import { positionTapeValid } from "../position-windows.ts";
import { sampleHistoryForTape, sampleWindowsForTape, type ConfigTape, type WalkForwardOptions } from "../sim/walkforward.ts";

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
  catalogueScope: "built-configs-including-empty-contexts";
  processedNative:
    | { state: "disabled" }
    | { state: "configured"; basis: "paper"; persistent: true; seededFromCandidates: false;
        validationN: number; realN: number };
  rows: Array<SampleCount & { kind: string; range: string; source: "engine" | "signals"; window: string; n: number; historyH: number | null }>;
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
    const history = sampleHistoryForTape(tp, o);
    const countMode=!!o.gates.positionWindows;
    const historyFrom = countMode ? -Infinity : at - history.hours * 3_600_000;
    const cap = Math.max(0, ...Object.values(windows));
    const symbols = [...new Set(tp.syms)], slots = new Map(symbols.map((sym, i) => [sym, i]));
    const canonical = tp.syms.map(sym => slots.get(sym)!);
    const own = symbols.flatMap(() => [1, -1].map(() => ({ recent: [] as number[], historyN: 0, historyKnown: 0 })));
    let remaining = cap > 0 ? own.length : 0;
    let corrupt = countMode&&!positionTapeValid(tp), nextExit = Infinity;
    // Capture each immutable column once. Stored accessors may otherwise reopen/decompress the same
    // history for every scalar lookup; only this bounded tape is retained across cooperative yields.
    const exits = tp.exitT, returns = tp.r, symbolSlots = tp.symI, sides = tp.side;
    if (!tp.carried && !corrupt) for (let i = tp.n - 1; i >= 0; i--) {
      if ((++work & 4095) === 0) yield;
      const exit = exits[i];
      if (!Number.isFinite(exit) || exit > nextExit) { corrupt = true; break; }
      nextExit = exit;
      if (!(exit < at)) continue;
      if ((countMode || exit < historyFrom) && !remaining) break;
      const direction = sides[i], slot = canonical[symbolSlots[i]];
      const rows = (direction === 1 || direction === -1) && slot !== undefined
        ? own[slot * 2 + (direction === 1 ? 0 : 1)] : undefined;
      if (!rows) { corrupt = true; break; }
      if (exit >= historyFrom) {
        rows.historyN++;
        if (Number.isFinite(returns[i])) rows.historyKnown++;
      }
      if (rows.recent.length < cap) {
        rows.recent.push(returns[i]);
        if (rows.recent.length === cap) remaining--;
      }
    }
    for (const [window, n] of Object.entries(countMode?windows:{ ...windows, history: history.minTrades })) {
      const range = tp.protect.tag ?? "none";
      const source = isSignalInd(tp.ind) ? "signals" : "engine";
      const historyH = window === "history" ? history.hours : null;
      const key = JSON.stringify([tp.kind, range, source, window, n, historyH]);
      let row = groups.get(key);
      if (!row) groups.set(key, row = { ...empty(), kind: tp.kind, range, source, window, n, historyH });
      for (const values of own) {
        row.contexts++;
        if (n <= 0) { row.disabled++; continue; }
        if (tp.carried || corrupt) { row.unknown++; continue; }
        const count = window === "history" ? values.historyN : values.recent.length;
        if (count < n) { row.insufficient++; continue; }
        row.full++;
        const known = window === "history" ? values.historyKnown === values.historyN
          : values.recent.slice(0, n).every(Number.isFinite);
        if (known) row.usable++;
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
  const processedNative: LastNSamples["processedNative"] = o.processedStages
    ? { state: "configured", basis: "paper", persistent: true, seededFromCandidates: false,
        validationN: o.processedStages.validationN, realN: o.processedStages.realN }
    : { state: "disabled" };
  return { at, basis: "candidate-config-symbol-side", configs, heldOnly,
    catalogueScope: "built-configs-including-empty-contexts",
    processedNative, rows };
}
