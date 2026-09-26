// CTS-A Core v2 — domain types. Pure data, no runtime imports.

export type Side = 1 | -1;

/** Column-oriented OHLCV series (one symbol, one timeframe). Index 0 = oldest bar. */
export interface Bars {
  sym: string;
  tfMin: number;
  n: number;
  t: Float64Array; // bar open time, ms
  o: Float64Array;
  h: Float64Array;
  l: Float64Array;
  c: Float64Array;
  v: Float64Array;
}

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export const INDICATION_KINDS = [
  "trend",
  "break",
  "active",
  "direction",
  "move",
  "rsi",
  "bollinger",
  "sar",
  "macd",
  "ema",
  "osc",
  "volume",
  "channel",
  "ichimoku",
  "smooth",
] as const;
export type IndicationKind = (typeof INDICATION_KINDS)[number];

export interface IndicationDef {
  id: string;
  kind: IndicationKind;
  label: string;
  params: Record<string, number>;
}

export const BOT_TYPES = [
  "sandwich",
  "snap",
  "pulse",
  "ribbon",
  "sweep",
  "clamp",
  "magnet",
  "pivot",
  "follow",
  "revert",
] as const;
export type BotType = (typeof BOT_TYPES)[number];

/** Protective exit config. All distances are fractions of entry price. */
export interface Protect {
  tp: number;
  sl: number;
  /** trailing distance from peak; 0 = off. Activates once MFE >= trail. */
  trail: number;
  /** max bars in trade (time exit at close) */
  hold: number;
}

/** A strategy configuration = bot trigger × indication filter × protect. */
export interface StrategyConfig {
  id: string;
  bot: BotType;
  /** indication id or "none" */
  ind: string;
  protect: Protect;
}

export type ExitReason = "tp" | "sl" | "trail" | "time" | "disarm";

/** Sub-strategy that produced a trade. */
export type StratKind = "normal" | "trailing" | "dca" | "dca-active" | "axis";

/** Strategy toggles. Intern calculations always cover every kind; toggles only filter execution. */
export interface StrategyToggles {
  normal: boolean;
  trailing: boolean;
  block: boolean;
  /** Block Active: execute only positions at Block level >= minActiveLevel (skip normal / lower levels) */
  blockActive: boolean;
  dca: boolean;
  /** DCA Active: skip the base leg; enter only at the first DCA level (limit), i.e. the higher-level position */
  dcaActive: boolean;
  /** Axis: mean-reversion ladder toward the axis price (EMA centre), rungs at ATR spacing */
  axis: boolean;
}

export interface AxisConfig {
  /** legs incl. the base leg */
  levels: number;
  /** rung spacing in ATR(14) */
  spacing: number;
  /** size of each extra rung relative to a normal position */
  ratio: number;
  /** enter only between these displacements from the axis, in ATR */
  minDisp: number;
  maxDisp: number;
  /** EMA period of the axis */
  center: number;
}

/** Tactics: causal entry filters and pacing applied to every combo's signal (Base, Main, Real, Live alike).
 *  Each one only removes entries; with all off the engine computes the plain signals. */
export interface Tactics {
  /** EU/US session only: signal bar opens 07:00–20:59 UTC */
  session: boolean;
  /** volatility regime: ATR% in the upper half of its last ~2 weeks of bars */
  volRegime: boolean;
  /** trend strength: ADX(14) >= 20 */
  trendStrength: boolean;
  /** pacing: after a closed trade the same config waits `cooldownBars` before re-entering the symbol */
  cooldown: boolean;
  cooldownBars: number;
}

export interface BlockConfig {
  /** extra volume per passing level (additive) */
  ratio: number;
  /** last-N windows 1..maxLevel are checked independently */
  maxLevel: number;
  minActiveLevel: number;
  /** total volume cap as a multiple of the base position */
  maxMult: number;
}

export interface DcaConfig {
  levels: number;
  /** distance between levels as a fraction of the reference price */
  step: number;
}

export interface Trade {
  cfg: string;
  sym: string;
  side: Side;
  entryT: number;
  exitT: number;
  entry: number;
  exit: number;
  /** net return on notional after round-trip cost (fraction) */
  r: number;
  reason: ExitReason;
  bars: number;
  mfe: number;
  mae: number;
  /** sub-strategy (defaults to normal / trailing by protect) */
  kind?: StratKind;
  /** notional units held (DCA legs); r already includes all legs */
  vol?: number;
  /** Block level at execution (broker) or DCA legs added (sim) */
  level?: number;
}

export interface OpenPosition {
  cfg: string;
  sym: string;
  side: Side;
  entryT: number;
  entryI: number;
  entry: number;
  stop: number;
  target: number;
  peak: number;
  trailOn: boolean;
  /** mark-to-market return incl. cost at the last close */
  mtm: number;
}

export interface Stats {
  n: number;
  wins: number;
  losses: number;
  wr: number;
  pf: number;
  /** sum of net returns, in percent of one notional */
  net: number;
  avg: number;
  gp: number;
  gl: number;
  /** max drawdown of the cumulative net curve, percent */
  mdd: number;
  /** drawdown time: longest time under a prior equity peak, hours */
  ddt: number;
  /** current (ongoing) drawdown time, hours */
  ddtNow: number;
  expectancy: number;
  sqn: number;
  recovery: number;
  avgHoldMin: number;
  firstT: number;
  lastT: number;
  /** clock hours (by exit) that had at least one close */
  hours: number;
  /** hours with net > 0 */
  greenHours: number;
  /** greenHours / hours */
  gh: number;
  /** closes per active hour */
  tph: number;
  /** worst single-hour net, percent */
  worstHour: number;
}

export interface LastNRow {
  n: number;
  taken: number;
  pf: number;
  net: number;
  ddt: number;
  score: number;
}

export interface LastNResult {
  cfg: string;
  total: number;
  baseline: { is: Stats; oos: Stats };
  rows: LastNRow[]; // in-sample rows per N
  bestN: number; // 0 = ungated wins
  is: Stats;
  oos: Stats;
  oosRows: LastNRow[];
  success: boolean;
  /** gate currently open for the next trade (using bestN on the full tape) */
  gateOpen: boolean;
}

export interface EvalWindow {
  key: string; // "4h" | "24h" | "N20"...
  kind: "time" | "trades";
  span: number; // hours or trades
  n: number;
  pf: number;
  net: number;
  ddt: number;
  wr: number;
  pass: boolean;
}

export interface EvalResult {
  cfg: string;
  at: number;
  windows: EvalWindow[];
  passRatio: number;
  success: boolean;
  score: number;
}

export interface Gates {
  minPf: number;
  maxDdtH: number;
  minTrades: number;
  quorum: number;
}

export interface ProtectGridSpec {
  tp: readonly number[];
  /** SL as a multiple of TP (max ratio e.g. 2 or 2.5) */
  slOfTp: readonly number[];
  /** trailing distance as a share of TP (0 = no trail) */
  trailOfTp: readonly number[];
  /** minimum absolute trailing distance (fraction) */
  minTrail: number;
  /** minimum absolute SL distance (fraction) */
  minSl: number;
  holdH: readonly number[];
}
