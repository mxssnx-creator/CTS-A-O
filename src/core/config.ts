import { PROVEN_WIDE_TRAIL_PAIRS } from "./proven-wide-trail.ts";
// CTS-A Core v2 — authoritative defaults. Every number the engine uses lives here.
import type {
  AxisConfig,
  BlockConfig,
  DcaConfig,
  Gates,
  Protect,
  ProtectGridSpec,
  StrategyToggles,
  Tactics,
} from "./domain/types.ts";
import { DEFAULT_SIGNALS, type SignalSettings } from "./signal-config.ts";
import { DEFAULT_SIZING, type SizingSettings } from "./sizing.ts";

/** Round-trip position cost: 0.1% per side, doubled = 0.2% of notional per closed trade. */
export const RT_COST = 0.002;
/** Profit factor reported when a sample has wins and no losses. */
export const PF_NO_LOSS = 4;

/** Base-stage protect (15m bars): 2.6% target, 1.5× stop, 8h max hold. Wide targets clear the 0.2% cost. */
export const DEFAULT_PROTECT: Protect = { tp: 0.026, sl: 0.039, trail: 0, hold: 32 };

/** Main-stage refinement grid (fractions). SL is expressed relative to TP; trail relative to TP (0 = off). */
export const PROTECT_GRID = {
  tp: [0.018, 0.026, 0.035, 0.05],
  slOfTp: [1, 1.5],
  trail: [0, 0.4],
  hold: [12, 32],
} as const;

/** Last-N candidates for the walk-forward gate. */
export const LAST_N_GRID = [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100] as const;

/** PF 1 is neutral; the default floor 1.1 keeps one position cost of margin above it. */
export const PF_NEUTRAL = 1;

import {
  GENERAL_RANGE,
  LONG_RANGE,
  MICRO_RANGE,
  MINIMAL_PLUS_RANGE,
  MINIMAL_RANGE,
  RANGE_GATE,
  SHORT_RANGE,
} from "./minimal-coord.ts";
export { GENERAL_RANGE, LONG_RANGE, MICRO_RANGE, MINIMAL_PLUS_RANGE, MINIMAL_RANGE, RANGE_GATE, SHORT_RANGE };

export const DEFAULT_GATES: Gates = {
  minPf: 1.1,
  // longest drawdown time allowed, hours (selectable 2–35)
  maxDdtH: 35,
  // floor under the scaled DDT limit (operator, 6 Oct: "increase min default DDT to 18 hrs")
  minDdtH: 18,
  // max drawdown ratio: a config's largest drawdown ÷ its net over the window (docs/block-sweep.md, DDR sweep:
  // 12 windows — PF 1.232 → 1.244, drawdown −9 %, 85 % of the orders kept; 0.5 = low drawdown, −39 % orders)
  maxDdr: 1,
  // stage minimum PF per target range (operator, 3 October): the longer targets need more margin to hold out of
  // sample — General and Long passed at 1.05 and lost live (forward PF 0.96 / 0.76)
  rangeMinPf: { micro: 1.05, minimal: 1.08, general: 1.12, long: 1.18 },
  minTrades: 12,
  quorum: 0.6,
  // Base computes a pair's config sets from PF 1 up (operator, 5 Oct: "it is about the stage Base eval for sets with
  // PF 1+ — that unfiltered sets come out under PF 1 is normal; keep all processing and validate the better ones by
  // PF and DDT"). Every set is still judged at its own stage / range minimum before it can trade, so this only
  // widens what is built and evaluated, never what trades.
  baseSetsMinPf: 1,
  // a check with too few closes to compute counts as valid until it has enough, then is judged normally
  warmup: true,
  // the smallest last-N sample judged on all its closes: 5 (3, 8 and 10 run identically; off = strict lost PF 3.62 →
  // 3.36), 12 symbols, 6 h + 6 h, 5-6 Oct; operator, 6 Oct: the best last-N windows as defaults
  lastNFloor: 5,
};

/**
 * Desk default: Normal and Trailing enabled and running (operator, 5 Oct), Block raising them, DCA. Block Active stays
 * off: with it only Block-raised entries open (minActiveLevel 5: nearly every Normal / Trailing entry was skipped —
 * a 2 h Micro run traded Axis alone).
 */
export const DEFAULT_TOGGLES: StrategyToggles = {
  normal: true,
  trailing: true,
  block: true,
  blockActive: false,
  dca: true,
  dcaActive: false,
  axis: false,
};

/** Tactics: trend strength + volatility regime on by default (docs/block-sweep.md, tactics); the others in docs/tactics.md. */
export const DEFAULT_TACTICS: Tactics = {
  session: false,
  // trend strength + volatility regime (docs/block-sweep.md, tactics: 6 windows × 12 symbols): PF 1.313 → 1.859,
  // net +52 %, drawdown −47 %, positive in 6 of 6 windows (vs 3 of 6); orders −34 %
  volRegime: true,
  trendStrength: true,
  // off until a session run measures it against the defaults (CLAUDE.md: defaults change on a measured win only)
  chopRegime: false,
  cooldown: false,
  cooldownBars: 4,
};

/**
 * Block default from the 12-symbol sweeps (docs/block-sweep.md): Overall, every source of overall / symbol /
 * direction / indication its own Block, 8 levels, Active from level 2, ratio 0.5, max stack 8× (each source up to
 * 7× extra, the stack ≤ 8×), 7 volume steps (one step = one more unit: one exchange minimum lot live), no pause.
 */
export const DEFAULT_BLOCK: BlockConfig = {
  sources: { config: false, overall: true, symbol: true, direction: true, indication: true, type: false },
  mode: "overall",
  ratio: 0.5,
  maxLevel: 8,
  minActiveLevel: 2,
  maxMult: 8,
  /** closes a source waits after a positive raised position (0 = none) */
  pause: 0,
  /** volume steps up to maxMult (0 = continuous) */
  steps: 7,
  increase: 0.4,
  // a signal's Block level from its own closes only, not the pooled book (pooled raising up to 7× turned 23 Sep into
  // signal PF 0.42 vs 0.59 at one unit; causal 50-symbol sims 3 Oct / 2 Oct / 23 Sep, PR #65)
  signalsOwn: true,
  ranges: {
    levels: [1, 8],
    volRatio: [0.1, 1],
    steps: [0, 6],
    increase: [0.1, 0.5],
    pause: [0, 6],
  },
};
/**
 * DCA default from the 12-symbol sweep (6 windows × 24 h, docs/dca-sweep.md): 2 levels 2 % apart (3 stages; the
 * stack is capped at 5), stop 1 × the target (never inside the deepest level + half a step). Walk-forward PF 1.55,
 * positive in 4 of 5 windows, the lowest drawdown of every variant (the former stops: PF 2.03, 3 of 5, drawdown +36 %).
 */
/**
 * Ceiling on the protect-grid variants: a memory guard, not a working limit (operator, 5 Oct: caps removed or kept
 * very high so the engine processes freely). It was 1,200, which a free grid reaches quickly.
 */
export const GRID_VARIANTS_MAX = 20_000;

export const DEFAULT_DCA: DcaConfig = { levels: 2, step: 0.02, stopGap: 0.5, slOfTp: 1 };
/** Axis: 3 legs 0.7 ATR apart toward the EMA-50 axis, entered at 0.35–2.6 ATR displacement (desk defaults). */
export const DEFAULT_AXIS: AxisConfig = {
  levels: 3,
  spacing: 0.7,
  ratio: 1,
  minDisp: 0.35,
  maxDisp: 2.6,
  center: 50,
  // old desk Axis: axis ≈ 132-minute EMA, 4 range types × 2 ladder depths = 8 sets per pair, managed exits
  centerMin: 132,
  ranges: ["atr", "linear", "geo", "fib"],
  levelsSet: [2, 3],
  exits: "managed",
  // the Stable-02 desk structure is an additional mode (Axis PF 1.25 vs 0.90 on one 12 h window, not robust over 4
  // windows): revert stays the default
  mode: "revert",
  slAtr: 0.7,
  tpRatio: 2.2,
  hybrid: false,
  trailPct: 0.8,
  expiry: 0,
};

/** Continuous independent eval windows. */
export const EVAL_TIME_WINDOWS_H = [1, 4, 12, 24, 72] as const;
export const EVAL_TRADE_WINDOWS = [20, 50] as const;

/** Live-feedback auto-adjuster settings (see adjust.ts). */
export interface AdjustSettings {
  enabled: boolean;
  /** positions per set that are judged */
  window: number;
  /** step up (wider SL / trail) below this PF */
  triggerPf: number;
  /** step back at or above this PF */
  recoverPf: number;
  /** min-SL step and cap (fractions) */
  slStep: number;
  slMax: number;
  /** min-trailing-distance step and cap (fractions) */
  trailStep: number;
  trailMax: number;
  /** pause a set that is still below the trigger at the caps, hours */
  pauseH: number;
  /** raise the engine's round-trip cost to the measured live cost (≥ 20 measured round trips) */
  autoCost: boolean;
}

export const DEFAULT_ADJUST: AdjustSettings = {
  enabled: true,
  window: 15,
  triggerPf: 1.0,
  recoverPf: 1.2,
  slStep: 0.002,
  slMax: 0.03,
  trailStep: 0.001,
  trailMax: 0.02,
  pauseH: 12,
  autoCost: true,
};

export interface CoreSettings {
  /** hard floors of every engine config's stop and trailing distance after lane scaling (fractions; 0.005 = 0.5 %) */
  protectFloor: { minSl: number; minTrail: number };
  /** base candle timeframe in minutes: 1m (every lane is derived from it) */
  tfMin: number;
  /** timeframe lanes processed, each independent and combined with the higher ones; 1m is always on */
  tfs: number[];
  /** history each lane is computed over (days), keyed by timeframe */
  tfDays: Record<string, number>;
  /** backfill depth in days */
  historyDays: number;
  /** symbols in the universe */
  symbols: number;
  /** how the universe is chosen: 1H volatility (default), 24h volume, market majors, 24h gainers / losers */
  symbolRank: "volatility1h" | "volume" | "market" | "gainers" | "losers";
  /** engine cycle: checks for newly closed bars and runs the stages when one closed (ms) */
  cycleMs: number;
  /** tick: open paper positions marked to market from the price stream and the live step (ms) */
  tickMs: number;
  /** effective round-trip position cost (fraction); = 2 × (taker fee + slippage per side) */
  cost: number;
  /** cost components as on the exchange (per side, fractions) */
  fees: { taker: number; maker: number; slippage: number };
  /** live-feedback auto-adjuster (last N positions per strategy config set) */
  adjust: AdjustSettings;
  gates: Gates;
  /** stage-1 winners refined in stage 2 */
  refineTop: number;
  /** Base combos promoted to Main (expanded into every protect variant × sub-strategy) */
  /** Base passers promoted to Main (strategy config sets); 0 = every validated pair */
  mainTop: number;
  /** configs taken to last-N + continuous evals */
  evalTop: number;
  /** max bots in the armed portfolio */
  armTop: number;
  /** notional per paper order unit in fixed sizing, USD */
  paperNotional: number;
  /** paper starting balance, USD (fixed % of equity sizing compounds from it) */
  paperBalance: number;
  /** order sizing: fixed % of equity per order unit (default 2 %) or a fixed notional */
  sizing: SizingSettings;
  toggles: StrategyToggles;
  /** entry tactics (session, volatility, trend strength, cooldown); each can be switched off */
  tactics: Tactics;
  /** skip this many symbols at the top of the ranking (desks sharing one account take disjoint slices); 0 = none */
  symbolOffset?: number;
  /** symbols always in the universe whatever their rank ("XRP-USDT"); the ranking fills the rest up to `symbols` */
  forceSymbols?: string[];
  /** restrict Base to these "bot|indication" pairs (empty = every combo) */
  focus: string[];
  /**
   * Wide-trail pairs that already cleared PF and trade count. Always taken through
   * Main → Real in addition to whatever Base passes. Empty leaves the catalog alone.
   */
  pinned?: readonly string[];
  /** indication main types switched off (their combos are not computed) */
  disabledKinds: string[];
  block: BlockConfig;
  dca: DcaConfig;
  axis: AxisConfig;
  /** independent protect variants computed in Base */
  grid: ProtectGridSpec;
  live: LiveSettings;
  /** Signals processing: proven signal sources, the best N active, 15 Normal + 15 Trailing configs each */
  signals: SignalSettings;
}

/** A settings patch: every group (grid, gates, live, block …) may be partial — it is merged into the current values. */
export type SettingsPatch = {
  [K in keyof CoreSettings]?: K extends "tfDays"
    ? CoreSettings[K]
    : CoreSettings[K] extends readonly unknown[]
    ? CoreSettings[K]
    : CoreSettings[K] extends object
      ? Partial<CoreSettings[K]>
      : CoreSettings[K];
};

export interface LiveSettings {
  enabled: boolean;
  connId: "bingx-x01" | "bingx-vst-01" | "bingx-vst-02";
  notionalUsd: number;
  maxPositions: number;
  /**
   * overall — control orders: ONE position per (symbol, direction), sized from every lane holding it
   * entries — one market entry per new signal (with its own SL / TP)
   */
  mode: "overall" | "entries";
  /** overall: control volume per lane volume unit (Block multiples count) */
  ratio: number;
  /**
   * overall: how large an exchange position is. "lanes" (default): its lanes' volume × ratio units. "min": ratio
   * units whatever its lanes — with minQty sizing the exchange minimum × ratio (ratio 1: the minimum itself). A
   * position then opens with its first lane and closes with its last, never resized in between, and the budgets carry
   * a position for every symbol × side the paper book holds.
   */
  positionSize?: "lanes" | "min";
  /**
   * overall: a lane joins the exchange only while the price has run at most this fraction of its target distance
   * past its paper entry in the trade's direction (default 0.25; 0 = off) — the paper book adopts positions after
   * a compute, minutes after the bar, and a late entry at a run-away price loses what the simulation booked
   */
  maxChase?: number;
  /**
   * overall: signal lanes' volume weight against engine lanes (default 1). Signals trade only while their hourly
   * index clears its gate; in the simulations and on x01's paper book they are the strongest category (PF 1.9–2.9
   * simulated, 8–12 forward), so they can carry more volume than an engine lane.
   */
  signalWeight?: number;
  /**
   * overall, top "fill": rank the signal configs together with the engine configs by score (the same selection score,
   * same window) instead of keeping and costing every signal first. Off: signals first (on x01, 5 Oct, they took the
   * whole risk budget and 1 of 144 engine configs reached the exchange).
   */
  signalsByScore?: boolean;
  /**
   * overall: top configs for the exchange — only the best-ranked engine configs (selection score, wf.rankBy) are sent
   * to the exchange, every active signal always: a number of configs, or "fill" (as many as the account exposure cap
   * carries, each position at least at its exchange minimum). Unset / 0: every selected config. The paper book keeps
   * every config either way.
   */
  top?: number | "fill";
  /** overall: cap per (symbol, direction) position, USD */
  maxNotionalUsd: number;
  /** overall: adjust an existing position only when the target differs by more than this share */
  rebalancePct: number;
  /** exchange book (positions, open orders) re-read over REST at most this often; own orders force a re-read */
  syncMs?: number;
  /** stops are never closer than this (fraction of price); default 1 % */
  minStopPct?: number;
  /** only trade while the rolling simulated run holds PF ≥ min and is stable (default on; off e.g. for testnet) */
  requireReady?: boolean;
  /**
   * live validation: a config opens new entries only while its last `liveLastN` forward closes (the paper book on
   * live prices, recorded at their exit) hold PF ≥ liveMinPf; with fewer closes its simulated validation decides.
   * Held positions are never cut by it; the config keeps being computed. 0 = off. Default 25 (a deactivation check:
   * below N live closes nothing is judged — it matters most for micro / minimal, whose live results can differ most).
   */
  liveLastN?: number;
  /** minimum PF over the live last N (default: the stage min PF) */
  liveMinPf?: number;
  /**
   * overall: the strategy kinds whose configs reach the exchange ("normal", "trailing", "dca", "dca-active",
   * "axis"). Unset / empty = every kind. The engine keeps computing, validating and paper-trading all of them —
   * this only narrows what the live control sends. A position already held is still managed and closed, whatever
   * its kind, so nothing is left orphaned when the list changes.
   */
  kinds?: readonly string[];
  /**
   * overall: only plain lanes reach the exchange — a lane whose Block volume multiple is above 1 (Block raised it)
   * is not sent. Held positions are still managed. Default off.
   */
  plainOnly?: boolean;
  /**
   * overall: which configs reach the exchange by their source — "signals" = signal-source configs only, "engine" =
   * engine indications only, "all" (default) = both. Like `kinds`, it narrows only what the live control sends: the
   * engine keeps computing and paper-trading everything, and a held position is still managed whatever its source.
   */
  source?: "all" | "signals" | "engine";
  /**
   * overall: ranges whose configs do NOT reach the exchange — "wide" (the default-protect grid), "mc" Micro, "mn"
   * Minimal, "mp" Minimal plus, "sh" Short, "gn" General, "lg" Long. Unset / empty = every range. Like `kinds`, it
   * narrows only what the live control sends: the engine keeps computing and paper-trading every range, so a range
   * left out keeps its own paper record and can be let back in on evidence. A held position of a range left out is
   * still managed by its lanes until they exit (never force-closed, never orphaned) — only new ones do not open.
   * A range is a target band of the Normal / Trailing configs: signal configs and the Axis / DCA ladders carry no
   * range tag but are never "wide" — `source` and `kinds` narrow those (rangeExcluded in live.server.ts).
   */
  excludeRanges?: readonly string[];
  /**
   * overall: the live control sends orders on at most this many distinct symbols (0 / unset = every symbol the
   * universe has). Symbols already held come first, then the rest in the order the ranked targets arrive, so the
   * cap never closes a held position and never reshuffles which symbols trade from step to step. The engine keeps
   * computing and paper-trading the whole universe — this is how a desk evaluates more symbols at Base than it
   * trades on the exchange.
   */
  maxSymbols?: number;
  /**
   * group live validation: until a config has its own `liveLastN` closes, its live group (Signals, or its target
   * range: Minimal, Short, General, Long, Wide …) decides — the group's last `liveGroupLastN` live closes pooled over
   * its selected configs must hold PF ≥ liveMinPf for the group's configs to open new entries. Held positions are
   * never cut. 0 = off (default): replayed at entry time on x01's forward record (4,452 closes over 4.5 h,
   * PF 1.11), every window cut the PF (last 50: 0.93, 100: 0.98, 200: 1.02, 400: 0.96, the whole record: 0.95) —
   * a group's losing streaks were followed by its winners (docs/live-group-validation.md).
   */
  liveGroupLastN?: number;
  /**
   * account exposure factor: the positions' gross notional (long and short both counted) stays within this multiple
   * of the account equity — every target is scaled by the same factor, so the relations between positions stay
   * (0 / unset = off)
   */
  maxExposureX?: number;
  /**
   * the exposure scaler on / off (default on): off, maxExposureX neither scales the targets down nor bounds the
   * top-config fill budget — the per-position cap, the stop-risk budget and the worst-case budget still apply
   */
  exposureScaler?: boolean;
  /**
   * stop-risk budget, fraction of equity: the positions' summed notional × stop distance (what every stop hit at
   * once would cost) stays within it — every target is scaled by the same factor. The drawdown bound that the
   * volume factor and the exposure cap leave open (0 / unset = off)
   */
  maxRiskPct?: number;
  /**
   * worst-case loss budget (fraction of equity): what every exchange backstop filled at once would cost (Σ notional ×
   * backstop distance) stays within it, whatever the volume factor — the guard against losing the account. Unset = off.
   */
  maxBackstopLossPct?: number;
  /** per-position cap as a multiple of the equity (with maxNotionalUsd the smaller one holds; 0 / unset = off) */
  maxPositionX?: number;
  /** account margin per symbol: cross (shared) or isolated */
  marginMode: "cross" | "isolated";
  /** hedge = long and short positions side by side; oneway = one net position per symbol */
  positionMode: "hedge" | "oneway";
  /**
   * leverage set per symbol before its first open: "max" = the exchange maximum of each side (the margin per
   * position is then the smallest), or a fixed leverage (capped at the maximum). The quantity stays the sizing's.
   */
  leverage?: "max" | number;
  /**
   * no opening or increasing while the account's free margin (USDT) is below this floor (0 / unset = off). On a
   * cross-margin account shared with other positions it keeps the margin that protects them; closing always runs.
   */
  minFreeMargin?: number;
  /**
   * opening and increasing paused (a coordinator gates a real-money desk on a reference desk's live results);
   * held positions, closes, reduces and stops keep running. A string is the reason shown.
   */
  openPaused?: boolean | string;
}

/** Timeframe lanes the engine can process (minutes). */
export const TF_CHOICES = [1, 5, 15, 30] as const;

/** The longest preset backtest (days): the maximal historic range a preset's cached diagrams cover. */
export const MAX_BACKTEST_DAYS = 30;

export const DEFAULT_SETTINGS: CoreSettings = {
  tfMin: 1,
  tfs: [1, 5, 15, 30],
  tfDays: { "1": 3, "5": 8, "15": 18, "30": 18 },
  // 14-day durable window + 48h run + 1 day indicator warm-up
  historyDays: 18,
  symbols: 32,
  symbolRank: "volatility1h",
  cycleMs: 250,
  tickMs: 100,
  cost: RT_COST,
  // BingX standard tier: 0.05 % taker / 0.02 % maker per side; + 0.05 % slippage per side → 0.20 % round trip
  fees: { taker: 0.0005, maker: 0.0002, slippage: 0.0005 },
  adjust: DEFAULT_ADJUST,
  gates: DEFAULT_GATES,
  refineTop: 24,
  // 0 = every Base-validated pair gets its strategy config sets (pseudo positions)
  mainTop: 0,
  evalTop: 60,
  armTop: 10,
  paperNotional: 100,
  paperBalance: 1000,
  // every config's stop and trailing distance at least 0.5 % of price (after lane scaling)
  protectFloor: { minSl: 0.005, minTrail: 0.005 },
  sizing: DEFAULT_SIZING,
  toggles: DEFAULT_TOGGLES,
  tactics: DEFAULT_TACTICS,
  focus: [
    "follow|rsi-mom-10-25",
    "follow|rsi-mom-14-15",
    "follow|rsi-mom-14-20",
    "follow|rsi-mom-14-25",
    "follow|rsi-mom-21-15",
    "follow|rsi-mom-21-20",
    "follow|rsi-mom-21-25",
    "follow|bb-walk@x4",
    "follow|break-vol-2@x4",
    "follow|break-vol@x4",
    "follow|break-atr-2@x4",
    "follow|act-burst-2.5@x4",
    "revert|act-chop@x4",
    "revert|cci-14-200@x4",
    "revert|cci-40-200@x4",
    "revert|z-50-2.5@x4",
  ],
  pinned: [...PROVEN_WIDE_TRAIL_PAIRS],
  disabledKinds: [],
  block: DEFAULT_BLOCK,
  dca: DEFAULT_DCA,
  axis: DEFAULT_AXIS,
  // Evidence (docs/research-*.md, 90 days, holdout): wider targets and SL 2–2.5 × TP scored best; min SL / min trail
  // distances were neutral; trailing slightly worse than none, so it stays one variant among others.
  // TP ranges in multiples of the 0.2 % position cost: Minimal 4–8×, Short 8–14×, General 14–22× (step 2),
  // Long 22–32× (step 2). They replace the wide targets (3 / 5 / 8 %), which General and Long cover.
  grid: {
    tp: [],
    slOfTp: [1, 2],
    trailOfTp: [0, 0.5],
    minTrail: 0.006,
    minSl: 0.01,
    holdH: [16, 24],
    trailStep: 1,
    trailFree: false,
    minimal: MINIMAL_RANGE,
    short: SHORT_RANGE,
    general: GENERAL_RANGE,
    long: LONG_RANGE,
    minimalPlus: { enabled: false, lastN: 50, minPf: 1.35, ...MINIMAL_PLUS_RANGE, cells: [] },
    // Range cells (short / minimal / micro / plus) seat only after their last 50 closes clear PF 1.35, and are
    // computed only where their target fits the indication's horizon. Measured (docs/ranges-validation.md): every
    // range lost after the 0.2 % cost without them; the gate keeps the result identical while holding half the
    // tapes (8 symbols, every indication: 236k → 128k tapes, peak 6.9 → 5.0 GB).
    rangeGate: { ...RANGE_GATE },
    // Base judges every range at all its configs (best cell) — the operator's rule: ranges and Micro reach Main with
    // every config that passes Base, not only when one middle cell happens to pass
    baseBest: true,
    // every config possibility is computed and evaluated: no horizon fit (it skipped range cells per indication);
    // the gates (PF, DDT, DDR, range gate) decide what takes a seat
    rangeFit: { enabled: false },
    // the tape stage builds only the range targets Base validated (false = every target of a passed range)
    baseTargets: true,
    // Base measures every range cell at trail 0; on, it also measures one trailed cell per target (the middle
    // non-zero trail at the middle stop), so a target whose edge needs a trailing stop can pass Base too. Off
    // until a run shows it earns its Base cost: with baseTargets on it widens what the tape stage builds.
    baseTrailCells: false,
  },
  live: {
    enabled: false,
    connId: "bingx-vst-02",
    notionalUsd: 6,
    // control positions (symbol × direction) on the exchange: as many as the paper book holds (0 = no limit,
    // the default — operator: process freely, many orders; the exposure / stop-risk / worst-case budgets size them)
    maxPositions: 0,
    mode: "overall",
    ratio: 1,
    maxNotionalUsd: 200,
    rebalancePct: 0.25,
    marginMode: "cross",
    positionMode: "hedge",
    leverage: "max",
    liveLastN: 25,
    liveGroupLastN: 0,
  },
  signals: DEFAULT_SIGNALS,
};

/** Symbol selection rankings (engine universe and preset settings). */
export const SYMBOL_RANK_CHOICES = [
  { id: "volatility1h", label: "1H volatility" },
  { id: "volume", label: "24h volume" },
  { id: "market", label: "Market (majors first)" },
  { id: "gainers", label: "24h gainers" },
  { id: "losers", label: "24h losers" },
] as const;

/** Gate choices: min PF 1.05–1.50 (step 0.05), max DDT 2–35 h. */
export const MIN_PF_CHOICES = Array.from(
  { length: 10 },
  (_, i) => Math.round((1.05 + i * 0.05) * 100) / 100,
);
/** 2, 4, … 34, then 35 so the preset max is a real choice. */
export const MAX_DDT_CHOICES = [...Array.from({ length: 17 }, (_, i) => 2 + i * 2), 35];

export const GATE_PRESETS: Record<string, Gates> = {
  balanced: DEFAULT_GATES,
  // rangeMinPf {}: every range at the preset's own min PF (a preset merged over the current gates would otherwise
  // keep the current per-range values, and the display would not match the preset's intent)
  strict: { minPf: 1.5, maxDdtH: 35, minTrades: 20, quorum: 0.75, rangeMinPf: {} },
  loose: { minPf: 1.05, maxDdtH: 35, minTrades: 8, quorum: 0.5, rangeMinPf: {} },
};

/**
 * Named execution presets (toggles only; Base always computes everything). "Normal off" presets keep Block on
 * (Block Active off): Trailing runs on the Normal base, and with Normal and Block both off nothing trailing is
 * executable (kindExecutable).
 */
export const STRATEGY_PRESETS: Record<string, { label: string; toggles: StrategyToggles }> = {
  "all-on": {
    label: "All on (no Active)",
    toggles: {
      normal: true,
      trailing: true,
      block: true,
      blockActive: false,
      dca: true,
      dcaActive: false,
      axis: false,
    },
  },
  normal: {
    label: "Normal only",
    toggles: {
      normal: true,
      trailing: false,
      block: false,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: false,
    },
  },
  "normal-trailing": {
    label: "Normal + Trailing",
    toggles: {
      normal: true,
      trailing: true,
      block: false,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: false,
    },
  },
  trailing: {
    label: "Trailing only",
    toggles: {
      normal: false,
      trailing: true,
      block: true,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: false,
    },
  },
  block: {
    label: "Normal + Trailing + Block",
    toggles: {
      normal: true,
      trailing: true,
      block: true,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: false,
    },
  },
  "block-active": {
    label: "Block Active",
    toggles: {
      normal: true,
      trailing: true,
      block: true,
      blockActive: true,
      dca: false,
      dcaActive: false,
      axis: false,
    },
  },
  "normal-off+block": {
    label: "Normal off, Block + DCA",
    toggles: {
      normal: false,
      trailing: true,
      block: true,
      blockActive: false,
      dca: true,
      dcaActive: false,
      axis: false,
    },
  },
  dca: {
    label: "DCA only",
    toggles: {
      normal: false,
      trailing: false,
      block: false,
      blockActive: false,
      dca: true,
      dcaActive: false,
      axis: false,
    },
  },
  "dca-active": {
    label: "DCA Active only",
    toggles: {
      normal: false,
      trailing: false,
      block: false,
      blockActive: false,
      dca: true,
      dcaActive: true,
      axis: false,
    },
  },
  "trailing+block-active": {
    label: "Normal off · Trailing + Block Active",
    toggles: {
      normal: false,
      trailing: true,
      block: true,
      blockActive: true,
      dca: false,
      dcaActive: false,
      axis: false,
    },
  },
  "normal+dca-active": {
    label: "Normal + DCA Active",
    toggles: {
      normal: true,
      trailing: false,
      block: false,
      blockActive: false,
      dca: true,
      dcaActive: true,
      axis: false,
    },
  },
  "trailing+dca": {
    label: "Normal off · Trailing + DCA",
    toggles: {
      normal: false,
      trailing: true,
      block: true,
      blockActive: false,
      dca: true,
      dcaActive: false,
      axis: false,
    },
  },
  "normal-trailing+block-active": {
    label: "Normal + Trailing + Block Active",
    toggles: {
      normal: true,
      trailing: true,
      block: true,
      blockActive: true,
      dca: false,
      dcaActive: false,
      axis: false,
    },
  },
  axis: {
    label: "Axis only",
    toggles: {
      normal: false,
      trailing: false,
      block: false,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: true,
    },
  },
  "normal+axis": {
    label: "Normal + Axis",
    toggles: {
      normal: true,
      trailing: false,
      block: false,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: true,
    },
  },
  "trailing+axis": {
    label: "Normal off · Trailing + Axis",
    toggles: {
      normal: false,
      trailing: true,
      block: true,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: true,
    },
  },
  "all-on+axis": {
    label: "All on + Axis (no Active)",
    toggles: {
      normal: true,
      trailing: true,
      block: true,
      blockActive: false,
      dca: true,
      dcaActive: false,
      axis: true,
    },
  },
  "block-active+dca-active": {
    label: "Block Active + DCA Active",
    toggles: {
      normal: true,
      trailing: true,
      block: true,
      blockActive: true,
      dca: true,
      dcaActive: true,
      axis: false,
    },
  },
};
