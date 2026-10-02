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
  /** trailing distance after activation as a share of `trail` (default 1: stop = peak · (1 − trail)) */
  trailStep?: number;
  /** once the trail is active the target is dropped and the trail alone exits (let winners run) */
  trailFree?: boolean;
  /** max bars in trade (time exit at close) */
  hold: number;
  /**
   * ATR-scaled exits (Stable-02 model): resolved at every entry from ATR(14) of the signal bar into the distances
   * above — stop = sl × ATR, target = tpRatio × stop, trailing (Stable-02 trail %) arming at 0.95 × stop. `tp` /
   * `sl` / `trail` then hold the nominal values at an ATR of 1 % of price (fallback while ATR is warming up; display).
   */
  atr?: AtrProtect;
  /**
   * Range of the cell: "mn" minimal, "sh" short, "gn" general, "lg" long (position-cost multiples), "mc" micro,
   * "mp" minimal plus. Unset = the wide grid.
   * A range cell keeps its price distances on every lane (no lane scaling, no global stop floor: the range has its
   * own minimum stop / trail), and its orders carry their own tracking kind.
   */
  tag?: RangeTag;
}

/** Protect ranges beside the wide grid (see minimal-coord.ts). */
export type RangeTag = "mp" | "mc" | "mn" | "sh" | "gn" | "lg";

/** ATR exit parameters (see Protect.atr and resolveAtrProtect). */
export interface AtrProtect {
  /** stop distance in ATR(14) multiples (Stable-02 SL_ATR 0.2–2) */
  sl: number;
  /** target = stop × ratio (Stable-02 TP_SL_RATIOS 0.2–3) */
  tpRatio: number;
  /** Stable-02 trailing percent (TRAIL_PCTS 0.4–2.4; 0 / absent = no trail) */
  trail?: number;
  /** live-feedback floors of the resolved stop / trailing distance (fractions; see adjustProtect) */
  minSl?: number;
  minTrail?: number;
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
  /** EMA period of the axis (bars; used when centerMin is not set) */
  center: number;
  /** EMA of the axis in minutes, converted to each lane's bars (the old desk: ≈ 132 one-minute ticks) */
  centerMin?: number;
  /**
   * ladder range type: atr (spacing × ATR), linear (price % × 1.8 + ¼ ATR), geo (price %), fib (0.809 ATR),
   * volume (ATR × (1.15 − min(vol × 8, 0.45)), vol = realized volatility ATR ÷ price ÷ 1.6; see axisSpacing)
   */
  range?: AxisRange;
  /** every Axis set computed: each range type × each ladder depth (levels) — its own independent tape */
  ranges?: AxisRange[];
  levelsSet?: number[];
  /**
   * managed (default): target just past the moving axis (≥ 0.85 step from the average entry), stop at most the
   * target distance, target tightened toward the axis, breakeven at 0.85 risk. fixed: target = the axis at the
   * signal, stop beyond the last rung by the protect's SL (the former behaviour).
   */
  exits?: "managed" | "fixed";
  /**
   * revert (default): the mean-reversion ladder above (entries only back toward the axis, base leg at the next
   * open). desk: the Stable-02 desk structure (vst.ts armUniverse / handleAxis): the combo signal picks the side,
   * `levels` resting limit rungs at axis ∓ k × spacing, each with the desk's SL (slDist) and TP (ratio × SL), the
   * stop tightened every bar and never loosened, the target never reduced (see simulateAxisDesk).
   */
  mode?: AxisMode;
  /** desk: stop distance in ATR multiples (Stable-02 slAtr, default 0.7) */
  slAtr?: number;
  /** desk: target = stop × ratio (Stable-02 tpRatio, snapped to 0.2 … 3 step 0.2, default 2.2) */
  tpRatio?: number;
  /** desk: hybrid = ladder + DCA-style rung fills + the Stable-02 trailing exit */
  hybrid?: boolean;
  /** desk hybrid: Stable-02 trailing percent (0.4 … 2.4, default 0.8) */
  trailPct?: number;
  /** desk: bars an unfilled rung rests before it is cancelled (0 / absent = the protect's hold) */
  expiry?: number;
}

export type AxisMode = "revert" | "desk";

export type AxisRange = "atr" | "linear" | "geo" | "fib" | "volume";

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
  /** which positions the levels are judged on (config set only by default) */
  sources?: {
    config?: boolean;
    overall?: boolean;
    symbol?: boolean;
    direction?: boolean;
    indication?: boolean;
    /** the strategy type (Normal, Trailing, DCA, DCA Active, Axis) */
    type?: boolean;
  };
  /**
   * shared: the strongest source's level; additive: the sources' levels add up; overall: every source is its own
   * Block (its own level, its own extra position, tracked per source — the sources never combine)
   */
  mode?: "shared" | "additive" | "overall";
  /** after a raised position closes positive, its sources raise nothing for this many closes (0 = no pause) */
  pause?: number;
  /** volume steps: the raise moves in this many equal steps up to maxMult (0 = continuous) */
  steps?: number;
  /** volume added per passing relation. Default 0.4. */
  increase?: number;
  /** allowed min/max for the Block knobs. The active value stays inside. */
  ranges?: {
    levels: readonly [number, number];
    volRatio: readonly [number, number];
    steps: readonly [number, number];
    increase: readonly [number, number];
    pause: readonly [number, number];
  };
}

export interface DcaConfig {
  levels: number;
  /** distance between levels as a fraction of the reference price */
  step: number;
  /** distance between levels as a multiple of the target (overrides step when set): step = TP × stepOfTp */
  stepOfTp?: number;
  /** stop beyond the deepest level, in level steps (default 0.5): stop = ref ∓ step × (levels + stopGap) */
  stopGap?: number;
  /** DCA targets (fractions; default 0.8 / 1.2 / 2.6 / 3.5 %) */
  tp?: readonly number[];
  /** stop of a DCA target as a multiple of it (default 1.5 for wide targets, 2 for short ones); the stop is
   *  never inside the deepest level + stopGap */
  slOfTp?: number;
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
  /** Block volume multiplier applied at execution (r includes it); r / mult is the unit result */
  mult?: number;
  /** part of mult from coordination volume (Stable-02 relation volume); mult / coordVol is the Block volume */
  coordVol?: number;
  /** taken by the negative-hour hedge (a signal outside the ranked set, while the book was losing) */
  hedge?: boolean;
  /** Block type overall: the extra volume each source added as its own position (part of mult) */
  legs?: Partial<Record<string, number>>;
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
  /** trailing distance after activation as a share of the activation move (default 1) */
  trailStep?: number;
  /** drop the target once the trail is active (default false) */
  trailFree?: boolean;
  /**
   * Extra short range (position-cost targets). Counted on top of the wide grid; the walk-forward keeps
   * whichever cell actually holds PF and green hours.
   */
  short?:
    | false
    | {
        tp: readonly number[];
        slOfTp: readonly number[];
        trailOfTp: readonly number[];
        /** trailing variants use at least this SL÷TP (higher stop than the trail) */
        trailSlOfTp?: number;
        minSl?: number;
        minTrail?: number;
      };
  /**
   * Minimal range, under the short range: targets from 1× position cost up to the short range.
   * Counted on top of the wide and short grids. The walk-forward seats only the cells that clear PF and drawdown.
   */
  minimal?:
    | false
    | {
        tp: readonly number[];
        slOfTp: readonly number[];
        trailOfTp: readonly number[];
        /** trailing variants use at least this SL÷TP */
        trailSlOfTp?: number;
        minSl?: number;
        minTrail?: number;
      };
  /** General range: 14–22× position cost, step 2× (tagged "gn"). */
  general?:
    | false
    | {
        tp: readonly number[];
        slOfTp: readonly number[];
        trailOfTp: readonly number[];
        trailSlOfTp?: number;
        minSl?: number;
        minTrail?: number;
      };
  /** Long range: 22–32× position cost, step 2× (tagged "lg"). */
  long?:
    | false
    | {
        tp: readonly number[];
        slOfTp: readonly number[];
        trailOfTp: readonly number[];
        trailSlOfTp?: number;
        minSl?: number;
        minTrail?: number;
      };
  /**
   * Micro range: 0.10%–0.40% step 0.025%, stops 1×–3× step 0.5, both trailing distances.
   * Tagged "mc" so the orders are not mixed with the minimal range.
   */
  micro?:
    | false
    | {
        tp: readonly number[];
        slOfTp: readonly number[];
        trailOfTp: readonly number[];
        trailSlOfTp?: number;
        minSl?: number;
        minTrail?: number;
      };
  /**
   * Range gate: a range cell (micro, minimal, short, plus) takes a seat only when its last `lastN` previous closes
   * clear `minPf` (higher than the usual gate). Causal in the simulation, the same rule in live.
   */
  rangeGate?: { enabled: boolean; lastN: number; minPf: number };
  /** short / minimal / plus each hold their own seat per pair (off: they compete with the wide cells) */
  rangeSeats?: boolean;
  /**
   * Range cells fitted to each indication's horizon: a cell is computed when its target is within lo…hi × the
   * indication's typical move (σ₁ₘ · √(period · lane minutes)); at least `keep` targets per range stay.
   */
  rangeFit?: { enabled: boolean; lo?: number; hi?: number; keep?: number };
  /**
   * Additional minimal range (2×–5× cost). Disabled by default. When on, only `cells` are built.
   */
  minimalPlus?:
    | false
    | {
        enabled?: boolean;
        lastN?: number;
        minPf?: number;
        tp: readonly number[];
        slOfTp: readonly number[];
        trailOfTp: readonly number[];
        trailSlOfTp?: number;
        minSl?: number;
        minTrail?: number;
        cells?: ReadonlyArray<{ tp: number; sl: number; trail: number }>;
      };
}
