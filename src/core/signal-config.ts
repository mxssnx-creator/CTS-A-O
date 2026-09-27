// Signals processing settings and sources (pure, no engine imports: shared by the engine, config and the UI).
// The engine side (combos, configs, active ranking, guard) is in signals.ts.

/**
 * Proven classic signals, each in a short and a medium parameter range (registry ids of the computations they
 * reuse under their own "sig-…" ids).
 */
export const SIGNAL_SOURCES: ReadonlyArray<{
  name: string;
  label: string;
  short: string;
  medium: string;
}> = [
  { name: "ema-cross", label: "EMA cross", short: "ema-9-21", medium: "ema-21-55" },
  {
    name: "macd-cross",
    label: "MACD signal cross",
    short: "macd-cross-8-21-5",
    medium: "macd-cross",
  },
  { name: "rsi-reversal", label: "RSI reversal", short: "rsi-7-15-85", medium: "rsi-14-25-75" },
  { name: "bollinger", label: "Bollinger bounce", short: "bb-bounce", medium: "bb-bounce-20-2.5" },
  { name: "supertrend", label: "Supertrend flip", short: "trend-st-7-2", medium: "trend-st-14-4" },
  { name: "donchian", label: "Donchian breakout", short: "break-don10", medium: "break-don20" },
  { name: "sar", label: "Parabolic SAR flip", short: "sar-fast", medium: "sar-std" },
  { name: "ichimoku", label: "Ichimoku TK cross", short: "ichi-tk-9", medium: "ichi-tk-20" },
  { name: "stoch-rsi", label: "Stoch RSI", short: "srsi-14-20", medium: "srsi-14-10" },
  { name: "keltner", label: "Keltner breakout", short: "kelt-20-1.5", medium: "kelt-20-2" },
  { name: "adx", label: "ADX / DMI", short: "trend-adx-20", medium: "trend-adx-30" },
  { name: "vwap", label: "VWAP reclaim", short: "dir-vwap-30", medium: "dir-vwap-120" },
  { name: "hma", label: "Hull MA", short: "hma-16", medium: "hma-55" },
  { name: "cci", label: "CCI", short: "cci-14-100", medium: "cci-20-200" },
  { name: "squeeze", label: "TTM squeeze", short: "squeeze-20", medium: "squeeze-30" },
  { name: "aroon", label: "Aroon", short: "aroon-14", medium: "aroon-25" },
];

/** Registry id of a signal source in a range. */
export const signalId = (name: string, range: "short" | "medium") =>
  `sig-${name}-${range === "short" ? "s" : "m"}`;

export interface SignalSettings {
  enabled: boolean;
  /** active signals (source × lane × symbol), best by Base results; 10–500 step 10 */
  count: number;
  /** sources switched on (by name); missing = on */
  sources: Record<string, boolean>;
  ranges: { short: boolean; medium: boolean };
  /** timeframe lanes signals run on (of the engine's lanes) */
  lanes: number[];
  normal: { tp: number[]; slOfTp: number[] };
  trailing: { tp: number[]; trailOfTp: number[]; slOfTp: number };
  holdH: number;
  guard: { enabled: boolean; lastN: number };
  /** Base minimum per signal to be ranked: closed trades on that symbol */
  minTrades: number;
  /** signal orders' own caps (they add to the engine's orders): open per symbol, open overall; 0 = no limit */
  perSymbol: number;
  maxOpen: number;
}

export const DEFAULT_SIGNALS: SignalSettings = {
  enabled: false,
  count: 50,
  sources: {},
  ranges: { short: true, medium: true },
  lanes: [5, 15],
  // 5 targets × 3 stop ratios = 15 Normal configs (medium to high)
  normal: { tp: [0.015, 0.02, 0.025, 0.03, 0.04], slOfTp: [1, 1.5, 2] },
  // 5 targets × 3 trail widths = 15 Trailing configs, stops at 2 × target (medium to higher)
  trailing: { tp: [0.02, 0.025, 0.03, 0.04, 0.05], trailOfTp: [0.4, 0.6, 0.8], slOfTp: 2 },
  holdH: 24,
  guard: { enabled: true, lastN: 8 },
  minTrades: 3,
  perSymbol: 0,
  maxOpen: 0,
};

export const SIGNAL_COUNT_CHOICES = Array.from({ length: 50 }, (_, i) => (i + 1) * 10); // 10 … 500

export function signalSettings(s?: Partial<SignalSettings> | null): SignalSettings {
  const out: SignalSettings = {
    ...DEFAULT_SIGNALS,
    ...(s ?? {}),
    ranges: { ...DEFAULT_SIGNALS.ranges, ...(s?.ranges ?? {}) },
    normal: { ...DEFAULT_SIGNALS.normal, ...(s?.normal ?? {}) },
    trailing: { ...DEFAULT_SIGNALS.trailing, ...(s?.trailing ?? {}) },
    guard: { ...DEFAULT_SIGNALS.guard, ...(s?.guard ?? {}) },
    sources: { ...(s?.sources ?? {}) },
    lanes: s?.lanes?.length ? [...s.lanes] : [...DEFAULT_SIGNALS.lanes],
  };
  // active count 10–500 in steps of 10
  const c = Number(out.count);
  out.count = Number.isFinite(c)
    ? Math.min(500, Math.max(10, Math.round(c / 10) * 10))
    : DEFAULT_SIGNALS.count;
  out.guard.lastN = Math.min(
    50,
    Math.max(2, Math.round(Number(out.guard.lastN) || DEFAULT_SIGNALS.guard.lastN)),
  );
  return out;
}

/** A partial signals patch applied onto current settings (nested groups merged, lists replaced). */
export function mergeSignals(
  cur: SignalSettings | undefined,
  p?: Partial<SignalSettings> | null,
): SignalSettings {
  const a = signalSettings(cur);
  if (!p) return a;
  return signalSettings({
    ...a,
    ...p,
    ranges: { ...a.ranges, ...(p.ranges ?? {}) },
    normal: { ...a.normal, ...(p.normal ?? {}) },
    trailing: { ...a.trailing, ...(p.trailing ?? {}) },
    guard: { ...a.guard, ...(p.guard ?? {}) },
    sources: { ...a.sources, ...(p.sources ?? {}) },
    lanes: p.lanes?.length ? [...p.lanes] : a.lanes,
  });
}
