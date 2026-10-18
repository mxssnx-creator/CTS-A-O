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
import type { PromotedLaneProof } from "./live-promote.ts";
import { BREAK_CONFIG_IDS, BREAK_DEFAULT_MICRO_CONFIG_IDS, breakAnchorTf, isBreakMicroInd } from "./indications/break-config.ts";
import { RT_COST } from "./model-cost.ts";
export { RT_COST } from "./model-cost.ts";

/** Hard ceiling for unique positions on the exchange. Strategy/config orders do not consume extra slots. */
export const MAX_EXCHANGE_POSITIONS = 100;

/** Normalize legacy, unset, or oversized exchange limits without allowing the account cap to be bypassed. */
export function exchangePositionLimit(value?: number): number {
  const requested = Number.isFinite(value) ? Math.floor(value!) : MAX_EXCHANGE_POSITIONS;
  return requested <= 0 ? MAX_EXCHANGE_POSITIONS : Math.min(requested, MAX_EXCHANGE_POSITIONS);
}

/** Profit factor reported when a sample has wins and no losses. */
export const PF_NO_LOSS = 4;

/** Base-stage protect (15m bars): 2.6% target, 1.5× stop, 8h max hold. Wide targets clear the modeled cost. */
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
export {
  GENERAL_RANGE,
  LONG_RANGE,
  MICRO_RANGE,
  MINIMAL_PLUS_RANGE,
  MINIMAL_RANGE,
  RANGE_GATE,
  SHORT_RANGE,
};

export const DEFAULT_GATES: Gates = {
  minPf: 1.1,
  // longest drawdown time allowed, hours (selectable 2–35)
  maxDdtH: 35,
  // floor under the scaled DDT limit (operator, 6 Oct: "increase min default DDT to 18 hrs")
  minDdtH: 18,
  // max drawdown ratio: a config's largest drawdown ÷ its net over the window (docs/block-sweep.md, DDR sweep:
  // 12 windows — PF 1.232 → 1.244, drawdown −9 %, 85 % of the orders kept; 0.5 = low drawdown, −39 % orders)
  maxDdr: 1,
  // stage minimum PF per target range: require progressively more return margin for longer targets.
  // These are the defaults at Base and at post-Base config evaluation; short inherits the 1.1 stage floor.
  rangeMinPf: { micro: 1.05, minimal: 1.1, short: 1.1, general: 1.2, long: 1.3 },
  minTrades: 12,
  quorum: 0.6,
  // Base keeps the wide/default set prefilter at PF 1.0. Configured per-range PF floors still apply at Base to each
  // tagged cell and again at config evaluation; this widens only the untagged prefilter, never a range gate.
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
  exit: true,
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
 * direction / indication its own Block, 8 levels, Active from level 2, ratio 0.5, total max stack 8× including
 * base and every source, 7 volume steps (one step = one more unit: one exchange minimum lot live), no pause.
 */
export const DEFAULT_BLOCK: BlockConfig = {
  sources: {
    config: false,
    overall: true,
    symbol: true,
    direction: true,
    indication: true,
    type: false,
  },
  mode: "overall",
  historySource: "accepted-orders",
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
  /**
   * per level, a set's own stop distance grows by this fraction of itself (0 / unset = off: only the minimum above).
   * The minimum alone never reaches a set whose stops are wider (x02, 7 Oct: engine sets with stops of 1.6–6.4 %
   * were at levels 1–4, floors 1.2–1.4 % — the adjuster changed nothing they traded)
   */
  slScale?: number;
  /** per level, a set's own trailing distance grows by this fraction of itself (0 / unset = off) */
  trailScale?: number;
  /** the relative steps widen a set to at most this multiple of its own distances (default 2) */
  scaleMax?: number;
  /**
   * a set steps again only after this many new closes since its last step (default 1): the window still holds the
   * closes that moved it, so stepping on every new close widened a set over and over on the same losers
   */
  stepEvery?: number;
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
  /** prehistory-derived exit candidates; each candidate and direction is validated and carried independently */
  exitStrategy: ExitStrategySettings;
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
  /** paper starting balance, USD (balance-percent sizing compounds from it) */
  paperBalance: number;
  /** order sizing: fixed % of account balance per order unit (default 0.1 %) or a legacy fixed notional mode */
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
  /** Signals processing: proven signal sources, the best N active, 42 Normal + 35 Trailing configs each by default */
  signals: SignalSettings;
}

export interface ExitStrategySettings {
  enabled: boolean;
  /** prehistory horizon before the causal run cut; 0 uses all available prehistory */
  lookbackH: number;
  /** oldest fraction fits MFE candidates; the newer remainder is reserved for independent validation */
  trainFraction: number;
  /** mature entry moves required in the fit segment, per direction */
  minEntries: number;
  /** completed, held-out closes required before a candidate can qualify, per direction */
  minValidationTrades: number;
  /** minimum held-out net return profit factor for this independent Exit candidate */
  minPf: number;
  /** maximum held-out drawdown / net ratio; 0 disables this additional cap */
  maxDdr: number;
  /** maximum hold horizon; shortened when the fit segment is small */
  holdH: number;
  /** upper bound across independent Exit config families and both directions for each pair */
  maxConfigsPerPair: number;
  /** MFE quantiles estimate each adjustable TP directly from the fit history */
  quantiles: number[];
  /** MAE quantiles estimate recalibrated SL distances for adaptive-SL and trailing families */
  stopQuantiles: number[];
  /** minimum and maximum fitted TP (fractions of entry price) */
  minTp: number;
  maxTp: number;
  /** maximum fitted SL (fractions of entry price) */
  maxSl: number;
  /** trailing distance as a share of the selected target */
  trailShares: number[];
  /** static stop distance as a multiple of the selected target */
  stopMultiples: number[];
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
  /** Maximum occupied exchange slots (symbol × direction), shared across every strategy and order; hard ceiling 100. */
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
   * overall: every lane the exchange holds is one exchange-minimum unit and carries its own exit orders on the venue —
   * a partial stop at its own stop (moved as the lane trails) and a partial take-profit at its own target
   * (lane-orders.ts). The position is the sum of its lanes; the closePosition backstop stays behind them all. The
   * venue executes each lane's exit at its level whatever the desk is doing.
   */
  laneOrders?: boolean;
  /**
   * lane orders: the open TP/SL orders this desk keeps on the account at most (BingX caps an account at 200, every
   * symbol together; default 190). Every position's backstop comes first; the lane orders nearest to triggering take
   * the rest, and a lane without one exits through the desk.
   */
  maxVenueOrders?: number;
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
  /** Legacy setting. USD position ceilings are disabled; balance-relative sizing and optional ratio budgets apply. */
  maxNotionalUsd: number;
  /** overall: adjust an existing position only when the target differs by more than this share */
  rebalancePct: number;
  /** exchange book (positions, open orders) re-read over REST at most this often; own orders force a re-read */
  syncMs?: number;
  /** stops are never closer than this (fraction of price); default 1 % */
  minStopPct?: number;
  /**
   * only open while settled post-Base accepted simulated orders hold PF ≥ min and are stable (before allocation;
   * endpoint marks excluded). The exact lane also needs independent owned execution proof at native admission.
   */
  requireReady?: boolean;
  /**
   * Paper deactivation on settled post-Base accepted outcomes. Paper can learn before the window is full; native
   * live growth separately requires at least this many exact cfg/symbol/side accepted AND owned execution closes.
   * Zero disables paper deactivation, not strict live evidence (minTrades still applies). Held exits stay managed.
   */
  liveLastN?: number;
  /** minimum PF over the live last N (default: the stage min PF) */
  liveMinPf?: number;
  /**
   * Additional minimum owned-execution sample for engine promotion. Native admission judges each exact symbol and
   * side independently at engineProofPf; a pooled config diagnostic never admits or vetoes sibling lanes. Only
   * measured owned-paper or verified reference execution qualifies, never nominal venue lane attribution.
   * Zero/unset removes this additional floor, while strict liveLastN/minTrades proof remains mandatory.
   */
  engineProofN?: number;
  /** the PF the engine proof's last N closes must hold (default ENGINE_PROOF_PF, 1.2) */
  engineProofPf?: number;
  /** Reference promotion is an exact, expiring proof allowlist; [] holds managed engine lanes on paper. */
  promotedLanes?: readonly PromotedLaneProof[];
  /**
   * overall: the strategy kinds whose configs reach the exchange ("normal", "trailing", "trailing-only", "exit",
   * "dca", "dca-active", "axis"). Unset / empty = every kind. The engine keeps computing, validating and paper-trading all of them —
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
   * Ranges apply to Normal / Trailing engine grids only. Historic Exit owns its target/stop fit and config sets;
   * signal configs and the Axis / DCA ladders carry no range tag either. `source` and `kinds` narrow those.
   */
  excludeRanges?: readonly string[];
  /**
   * overall: engine configs of these families do NOT reach the exchange, and a held position of one is CLOSED — its
   * lanes never ask for volume again, held or not (the operator's stop, unlike excludeRanges, which keeps a held lane
   * until its paper position exits). A family is `bot|range`: the bot "follow" or "revert", the range "wide" (untagged)
   * or a range tag ("mc", "mn", "mp", "sh", "gn", "lg"); `bot|exit` excludes every Historic Exit config set.
   * Example: "follow|mn" = every Normal / Trailing follow config of Minimal.
   * Signal configs have no family here (live.source narrows them). Unset / empty = none.
   */
  excludeConfigs?: readonly string[];
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
   * of the account balance — every target is scaled by the same factor, so the relations between positions stay
   * (default off; 0 / unset = off)
   */
  maxExposureX?: number;
  /**
   * the exposure scaler on / off (default on): off, maxExposureX neither scales the targets down nor bounds the
   * top-config fill budget — the per-position cap, the stop-risk budget and the worst-case budget still apply
   */
  exposureScaler?: boolean;
  /**
   * stop-risk budget, fraction of balance: the positions' summed notional × stop distance (what every stop hit at
   * once would cost) stays within it — every target is scaled by the same factor. The drawdown bound that the
   * volume factor and the exposure cap leave open (0 / unset = off)
   */
  maxRiskPct?: number;
  /**
   * worst-case loss budget (fraction of balance): what every exchange backstop filled at once would cost (Σ notional ×
   * backstop distance) stays within it, whatever the volume factor — the guard against losing the account. Unset = off.
   */
  maxBackstopLossPct?: number;
  /** optional per-position cap as a multiple of account balance (default off; legacy USD cap is ignored) */
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

/** The default focus before the range families (until 13 Oct): the settings migration v24 moves it. */
export const FORMER_FOCUS_13OCT: readonly string[] = [
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
];

/**
 * The range families PROTOCOL-8 kept (run 3, selected on D1a only: confluence cfl-trend-50, higher-timeframe pullbacks
 * htfpb-4 / htfpb-8, the US-session opening range orb-us, relative strength rel-str-12 / rel-str-48 and the regime
 * tactic rgm-20), each on the Short / General / Long lanes. Against the baseline on feed120 (causal, 120 symbols):
 * PF D1a 0.475 → 0.53, D1b 0.374 → 0.45, holdout 0.362 → 0.37 and 0.368 → 0.38, orders 57,107 → 70,649
 * (PF-SEARCH.md section 19).
 */
export const FAMILY_FOCUS_13OCT: readonly string[] = [
  "cfl-trend-50",
  "htfpb-4",
  "htfpb-8",
  "orb-us",
  "rel-str-12",
  "rel-str-48",
  "rgm-20",
].flatMap((id) => [`follow|${id}@m15`, `follow|${id}@m15c`, `follow|${id}@m30`]);

/** The updated 60 Micro Break identities, each selected on its fastest eligible anchor lane by default. */
export const BREAK_MICRO_FOCUS_17OCT: readonly string[] = BREAK_DEFAULT_MICRO_CONFIG_IDS.flatMap((id) => {
  const tf = breakAnchorTf(id);
  return tf === null ? [] : [`follow|${id}@m${tf}`];
});

/** The complete default focus before the 60 Micro Break identities joined it. */
export const PREVIOUS_DEFAULT_FOCUS_17OCT: readonly string[] = [...FORMER_FOCUS_13OCT, ...FAMILY_FOCUS_13OCT];

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
  // Model per side: 0.05 % taker + 0.025 % slippage → 0.15 % round trip; measured venue fees stay authoritative.
  fees: { taker: 0.0005, maker: 0.0002, slippage: 0.00025 },
  adjust: DEFAULT_ADJUST,
  exitStrategy: {
    enabled: true,
    lookbackH: 168,
    trainFraction: 0.6,
    minEntries: 30,
    minValidationTrades: 12,
    minPf: 1.1,
    maxDdr: 1,
    holdH: 24,
    maxConfigsPerPair: 24,
    quantiles: [0.6, 0.8],
    stopQuantiles: [0.5, 0.75],
    minTp: 0.006,
    maxTp: 0.2,
    maxSl: 0.25,
    trailShares: [0.33, 0.66],
    stopMultiples: [1, 2],
  },
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
  focus: [...PREVIOUS_DEFAULT_FOCUS_17OCT, ...BREAK_MICRO_FOCUS_17OCT],
  pinned: [...PROVEN_WIDE_TRAIL_PAIRS],
  disabledKinds: [],
  block: DEFAULT_BLOCK,
  dca: DEFAULT_DCA,
  axis: DEFAULT_AXIS,
  // Evidence (docs/research-*.md, 90 days, holdout): wider targets and SL 2–2.5 × TP scored best; min SL / min trail
  // distances were neutral; trailing slightly worse than none, so it stays one variant among others.
  // TP ranges retain their fixed 0.2 % construction basis (13 Oct: every TP × SL × Trail): Minimal 4–8× (step 0.5),
  // Short 9–14×, General 15–22×, Long 23–32× (step 1). They replace the wide targets (3 / 5 / 8 %), which General and
  // Long cover.
  grid: {
    // untagged Wide configs use the normal volume unless their own factor is changed
    volumeFactor: 1,
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
    // Micro on (operator, 13 Oct: "include and enable also range Micro for processing completely"): its own Micro
    // indications on its own net-target cells (ownInds), 5m lanes and slower. Measured on feed120, five causal D1
    // windows: PF 0.44 → 0.59 (D1a 0.48 → 0.64, D1b 0.37 → 0.49), orders 57k → 134k (PF-SEARCH.md section 17)
    micro: MICRO_RANGE,
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
    // the tape stage builds only the ranges a pair passed in Base (false = every range its indication applies to)
    baseRanges: true,
    // Base measures every range cell at trail 0; on, it also measures one trailed cell per target (the middle
    // non-zero trail at the middle stop), so a target whose edge needs a trailing stop can pass Base too. Off
    // until a run shows it earns its Base cost: with baseTargets on it widens what the tape stage builds.
    baseTrailCells: false,
    // every evaluated pair's full config sets without the Base gate (a measurement mode: the whole grid in memory)
    allSets: false,
  },
  live: {
    enabled: false,
    connId: "bingx-vst-02",
    notionalUsd: 6,
    // Final Live Exchange admission: at most 100 occupied symbol-direction positions across all lanes and strategies.
    maxPositions: MAX_EXCHANGE_POSITIONS,
    mode: "overall",
    // control orders "overall" by default (operator, 7 Oct): per position one stop at the outer stop range and one
    // take-profit beyond the outer target, every lane's partial exit by the system; true = "partials" (lane orders)
    laneOrders: false,
    ratio: 1,
    maxNotionalUsd: 0,
    maxPositionX: 0,
    maxExposureX: 0,
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

// Historic Exit is independent of Normal / Trailing: only the all-on presets opt into its execution.
for (const [name, preset] of Object.entries(STRATEGY_PRESETS))
  preset.toggles.exit = name === "all-on" || name === "all-on+axis";
