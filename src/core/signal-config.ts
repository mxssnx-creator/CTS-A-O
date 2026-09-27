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
  { name: "williams-r", label: "Williams %R", short: "willr-14-90", medium: "willr-28-80" },
  { name: "mfi", label: "Money Flow Index", short: "mfi-14-10", medium: "mfi-14-20" },
  { name: "obv", label: "On-Balance Volume", short: "obv-20", medium: "obv-50" },
  { name: "cmf", label: "Chaikin Money Flow", short: "cmf-20-0.1", medium: "cmf-20-0.05" },
  { name: "trix", label: "TRIX", short: "trix-9", medium: "trix-15" },
  { name: "kama", label: "Kaufman adaptive MA", short: "kama-10", medium: "kama-20" },
  { name: "heikin-ashi", label: "Heikin-Ashi", short: "ha-1", medium: "ha-3" },
  { name: "zscore", label: "Z-score reversion", short: "z-20-2", medium: "z-50-2.5" },
  { name: "ema-slope", label: "EMA slope", short: "ema-slope-20", medium: "ema-slope-100" },
  { name: "macd-hist", label: "MACD histogram", short: "macd-hist-8-21-5", medium: "macd-hist" },
  { name: "volume-break", label: "Volume breakout", short: "break-vol-2", medium: "break-vol" },
  { name: "ichi-cloud", label: "Ichimoku cloud", short: "ichi-cloud-9", medium: "ichi-cloud-20" },
  { name: "rsi-momentum", label: "RSI momentum", short: "rsi-mom-14-20", medium: "rsi-mom-21-20" },
  // registry computations added as sources (the stability gate decides at every step which of them trade)
  { name: "ema-trend", label: "EMA trend", short: "trend-ema-12-26", medium: "trend-ema-20-50" },
  { name: "atr-break", label: "ATR breakout", short: "break-atr-0.9", medium: "break-atr-1.5" },
  { name: "act-burst", label: "Activity burst", short: "act-burst-1.5", medium: "act-burst-2.5" },
  { name: "thrust", label: "Directional thrust", short: "dir-thrust-4", medium: "dir-thrust" },
  {
    name: "impulse",
    label: "Impulse move",
    short: "move-impulse-4-1.2",
    medium: "move-impulse-10-2",
  },
  { name: "swing", label: "Swing move", short: "move-swing-16", medium: "move-swing-32" },
  { name: "rsi-mid", label: "RSI mid cross", short: "rsi-mid-52-48", medium: "rsi-mid-60-40" },
  { name: "bb-walk", label: "Bollinger walk", short: "bb-walk", medium: "bb-walk-50" },
  { name: "ema-pullback", label: "EMA pullback", short: "ema-pullback", medium: "ema-pullback-50" },
  {
    name: "ema-cross-fast",
    label: "EMA cross fast",
    short: "dir-emax-5-13",
    medium: "dir-emax-12-26",
  },
  { name: "reclaim", label: "Level reclaim", short: "dir-reclaim", medium: "dir-reclaim-50" },
  { name: "act-hf", label: "High-frequency activity", short: "act-hf-5", medium: "act-hf-8" },
  {
    name: "macd-slow",
    label: "MACD cross slow",
    short: "macd-cross-5-35-5",
    medium: "macd-cross-19-39-9",
  },
  { name: "st-slow", label: "Supertrend slow", short: "trend-st", medium: "trend-st-21-5" },
  // Stable-02 desk entry signals ("s2-…", src/core/indications/stable02.ts): short = the desk's own parameters,
  // medium = the slower alternate
  {
    name: "s2-ema-cross",
    label: "S2 EMA cross pulse",
    short: "s2-ema-cross",
    medium: "s2-ema-cross-m",
  },
  {
    name: "s2-rsi-revert",
    label: "S2 RSI mean revert",
    short: "s2-rsi-revert",
    medium: "s2-rsi-revert-m",
  },
  {
    name: "s2-st-trail",
    label: "S2 Supertrend trail",
    short: "s2-st-trail",
    medium: "s2-st-trail-m",
  },
  {
    name: "s2-bb-bounce",
    label: "S2 Bollinger bounce",
    short: "s2-bb-bounce",
    medium: "s2-bb-bounce-m",
  },
  { name: "s2-vwap-axis", label: "S2 VWAP axis", short: "s2-vwap-axis", medium: "s2-vwap-axis-m" },
  {
    name: "s2-vol-break",
    label: "S2 Volume breakout",
    short: "s2-vol-break",
    medium: "s2-vol-break-m",
  },
  {
    name: "s2-adx-gate",
    label: "S2 ADX trend gate",
    short: "s2-adx-gate",
    medium: "s2-adx-gate-m",
  },
  {
    name: "s2-stoch-swing",
    label: "S2 Stoch swing",
    short: "s2-stoch-swing",
    medium: "s2-stoch-swing-m",
  },
  {
    name: "s2-confluence",
    label: "S2 Confluence 3 of 5",
    short: "s2-confluence",
    medium: "s2-confluence-m",
  },
  {
    name: "s2-range-break",
    label: "S2 Range break",
    short: "s2-range-break",
    medium: "s2-range-break-m",
  },
  { name: "s2-atr-break", label: "S2 ATR break", short: "s2-atr-break", medium: "s2-atr-break-m" },
  {
    name: "s2-active-hf",
    label: "S2 Active high-freq",
    short: "s2-active-hf",
    medium: "s2-active-hf-m",
  },
  {
    name: "s2-range-shift",
    label: "S2 Range shift",
    short: "s2-range-shift",
    medium: "s2-range-shift-m",
  },
  {
    name: "s2-block-stack",
    label: "S2 Block stack",
    short: "s2-block-stack",
    medium: "s2-block-stack-m",
  },
  {
    name: "s2-block-scale",
    label: "S2 Block scale",
    short: "s2-block-scale",
    medium: "s2-block-scale-m",
  },
];

/** Registry id of a signal source in a range. */
export const signalId = (name: string, range: "short" | "medium") =>
  `sig-${name}-${range === "short" ? "s" : "m"}`;

export interface SignalClusterSettings {
  enabled: boolean;
  /** look-back of closed signal results (minutes) */
  windowMin: number;
  /** at least this many losing closes in the window */
  minLosses: number;
  /** and at least this share of the window's closes losing */
  lossShare: number;
}

/**
 * Source stability gate: a source's signals pause while its own executed signal orders of the latest `days`
 * (24-hour buckets back from each entry) are unstable — at least `minTrades` of them and negative in sum, or
 * positive in fewer than `minShare` of the buckets. Causal (only orders closed before the entry); a source
 * without enough executed history trades.
 */
export interface SignalSourceGate {
  enabled: boolean;
  days: number;
  minShare: number;
  minTrades: number;
}

/**
 * ATR exits (the Stable-02 model): stop = sl × ATR(14) at entry, target = stop × tpRatio, optional trailing
 * (Stable-02 trail %), max hold in 15m-reference bars. Every sl × tpRatio cell runs without trail and once per
 * trail value.
 */
export interface SignalAtrExits {
  /** stop in ATR(14) multiples, 0.2–2 (Stable-02 SL_ATR) */
  sl: number[];
  /** target ÷ stop, 0.2–3 (Stable-02 TP_SL_RATIOS) */
  tpRatio: number[];
  /** trailing variants (Stable-02 TRAIL_PCTS, 0.4–2.4 %); empty = no trailing variants */
  trail: number[];
  /** max hold in 15m-reference bars (Stable-02 DEFAULT_MAX_HOLD_BARS 3); 0 = the signal hold (holdH) */
  holdBars: number;
}

export type SignalExitModel = "pct" | "atr" | "both";

export interface SignalSettings {
  enabled: boolean;
  /** active signals (source × lane × symbol), best by Base results; 10–200 step 10 */
  count: number;
  /** sources switched on (by name); missing = on */
  sources: Record<string, boolean>;
  ranges: { short: boolean; medium: boolean };
  /** timeframe lanes signals run on (of the engine's lanes) */
  lanes: number[];
  normal: { tp: number[]; slOfTp: number[] };
  trailing: { tp: number[]; trailOfTp: number[]; slOfTp: number };
  holdH: number;
  /** exit model of the signal configs: percent grid (Normal + Trailing), ATR grid, or both */
  exits: SignalExitModel;
  atr: SignalAtrExits;
  guard: { enabled: boolean; lastN: number };
  /** loss-cluster guard: pause signal executions while many signals just lost together (see SignalGuard) */
  cluster: SignalClusterSettings;
  /** Base minimum per signal to be ranked: closed trades on that symbol */
  minTrades: number;
  /**
   * How the active signals are ranked: "drawdown" (default) = net ÷ max drawdown (recovery), only signals whose
   * 4-hour blocks were positive at least `minBlockShare` of the time; "lowdd" = the same filter, net ÷ drawdown²
   * and at least as much net as drawdown (prefers the smallest drawdowns); "net" = the former ranking by net then PF
   */
  rank: "drawdown" | "lowdd" | "net";
  minBlockShare: number;
  /**
   * automatic validation before a signal goes active: besides its whole Base history, its result over the most
   * recent 24 h of that history must be positive (a signal that stopped working is not started)
   */
  validate: boolean;
  /** hard floors of every signal config's stop and trailing distance (fractions; 0.005 = 0.5 %) */
  minSl: number;
  minTrail: number;
  /** only stable sources trade (see SignalSourceGate) */
  sourceGate: SignalSourceGate;
  /** hours of the latest results the validation judges (2–72; the per-step ranking uses the same window) */
  validateH: number;
  /** signal orders' own caps (they add to the engine's orders): open per symbol, open overall; 0 = no limit */
  perSymbol: number;
  maxOpen: number;
}

export const DEFAULT_SIGNALS: SignalSettings = {
  enabled: true,
  count: 50,
  sources: {},
  ranges: { short: true, medium: true },
  lanes: [1, 5, 15],
  // 5 targets × 3 stop ratios = 15 Normal configs (medium to high)
  normal: { tp: [0.015, 0.02, 0.025, 0.03, 0.04], slOfTp: [1, 1.5, 2] },
  // 5 targets × 3 trail widths = 15 Trailing configs, stops at 2 × target (medium to higher)
  trailing: { tp: [0.02, 0.025, 0.03, 0.04, 0.05], trailOfTp: [0.4, 0.6, 0.8], slOfTp: 2 },
  holdH: 24,
  // both exit models: 30 percent + 18 ATR configs per signal (1.6× the percent-only tapes)
  exits: "both",
  // Stable-02 defaults: SL 0.7 × ATR (its default), 1.15 (SHORT_SL_ATR), 1.5 · TP 1 / 1.6 / 2.2 R (2.2 its default)
  // · trail 0.8 % (its default) · hold 3 × 15m bars (DEFAULT_MAX_HOLD_BARS)
  atr: { sl: [0.7, 1.15, 1.5], tpRatio: [1, 1.6, 2.2], trail: [0.8], holdBars: 3 },
  guard: { enabled: true, lastN: 8 },
  cluster: { enabled: true, windowMin: 60, minLosses: 8, lossShare: 0.6 },
  minTrades: 3,
  // causal validation (8 days, with signal confirmation): lowdd PF 1.49 dd 490 · drawdown 1.49 / 521 · net 1.17 / 2565
  rank: "lowdd",
  // 4-day validation: halves drawdown, PF up on 3 of 4 days (docs/signals-validation.md)
  minBlockShare: 0.6,
  validate: true,
  validateH: 24,
  minSl: 0.005,
  minTrail: 0.005,
  // off: pausing a source after its executed orders lost cost net at every tested setting (continuous 8 days,
  // 43 sources: no gate PF 1.53 net 3470 · best gate 2 d / 67 % PF 1.50 net 2671; docs/signals-validation.md)
  sourceGate: { enabled: false, days: 2, minShare: 0.5, minTrades: 5 },
  perSymbol: 0,
  maxOpen: 0,
};

export const SIGNAL_COUNT_CHOICES = Array.from({ length: 20 }, (_, i) => (i + 1) * 10); // 10 … 200

export function signalSettings(s?: Partial<SignalSettings> | null): SignalSettings {
  const out: SignalSettings = {
    ...DEFAULT_SIGNALS,
    ...(s ?? {}),
    ranges: { ...DEFAULT_SIGNALS.ranges, ...(s?.ranges ?? {}) },
    normal: { ...DEFAULT_SIGNALS.normal, ...(s?.normal ?? {}) },
    trailing: { ...DEFAULT_SIGNALS.trailing, ...(s?.trailing ?? {}) },
    atr: {
      ...DEFAULT_SIGNALS.atr,
      ...(s?.atr ?? {}),
    },
    guard: { ...DEFAULT_SIGNALS.guard, ...(s?.guard ?? {}) },
    cluster: { ...DEFAULT_SIGNALS.cluster, ...(s?.cluster ?? {}) },
    sourceGate: { ...DEFAULT_SIGNALS.sourceGate, ...(s?.sourceGate ?? {}) },
    sources: { ...(s?.sources ?? {}) },
    lanes: s?.lanes?.length ? [...s.lanes] : [...DEFAULT_SIGNALS.lanes],
  };
  // active count 10–200 in steps of 10
  const c = Number(out.count);
  out.count = Number.isFinite(c)
    ? Math.min(200, Math.max(10, Math.round(c / 10) * 10))
    : DEFAULT_SIGNALS.count;
  const sg = out.sourceGate;
  sg.enabled = sg.enabled === true;
  sg.days = Math.min(14, Math.max(1, Math.round(Number(sg.days) || 2)));
  sg.minTrades = Math.min(100, Math.max(1, Math.round(Number(sg.minTrades) || 5)));
  sg.minShare = Math.min(
    1,
    Math.max(0, Number.isFinite(Number(sg.minShare)) ? Number(sg.minShare) : 0.5),
  );
  if (!["pct", "atr", "both"].includes(out.exits)) out.exits = DEFAULT_SIGNALS.exits;
  const a = out.atr;
  const nums = (xs: unknown, lo: number, hi: number, def: readonly number[], empty = false) => {
    const v = Array.isArray(xs)
      ? xs.map(Number).filter((x) => Number.isFinite(x) && x >= lo && x <= hi)
      : [];
    return v.length || (empty && Array.isArray(xs)) ? [...new Set(v)].slice(0, 8) : [...def];
  };
  a.sl = nums(a.sl, 0.2, 2, DEFAULT_SIGNALS.atr.sl);
  a.tpRatio = nums(a.tpRatio, 0.2, 3, DEFAULT_SIGNALS.atr.tpRatio);
  a.trail = nums(a.trail, 0.4, 2.4, DEFAULT_SIGNALS.atr.trail, true);
  const hb = Number(a.holdBars);
  a.holdBars = Number.isFinite(hb) ? Math.min(384, Math.max(0, Math.round(hb))) : 3;
  const fl = (v: unknown, d: number) =>
    Number.isFinite(Number(v)) ? Math.min(0.1, Math.max(0, Number(v))) : d;
  out.minSl = fl(out.minSl, DEFAULT_SIGNALS.minSl);
  out.minTrail = fl(out.minTrail, DEFAULT_SIGNALS.minTrail);
  const vh = Number(out.validateH);
  out.validateH = Number.isFinite(vh) ? Math.min(72, Math.max(2, Math.round(vh))) : 24;
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
    atr: { ...a.atr, ...(p.atr ?? {}) },
    guard: { ...a.guard, ...(p.guard ?? {}) },
    cluster: { ...a.cluster, ...(p.cluster ?? {}) },
    sourceGate: { ...a.sourceGate, ...(p.sourceGate ?? {}) },
    sources: { ...a.sources, ...(p.sources ?? {}) },
    lanes: p.lanes?.length ? [...p.lanes] : a.lanes,
  });
}
