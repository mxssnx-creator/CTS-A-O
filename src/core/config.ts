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
export const DEFAULT_GATES: Gates = {
  minPf: 1.1,
  // longest drawdown time allowed, hours (selectable 2–20 in steps of 2)
  maxDdtH: 20,
  minTrades: 12,
  quorum: 0.6,
};

/** Execution toggles. Intern (Base) calculations always cover every sub-strategy. */
// Default = Block Active + DCA Active: best of all presets in the 30-day walk-forward comparison (docs/core-v2.md).
export const DEFAULT_TOGGLES: StrategyToggles = {
  normal: true,
  trailing: true,
  block: true,
  blockActive: true,
  dca: true,
  dcaActive: true,
  axis: true,
};

/** Tactics are off by default; see docs/tactics.md for the measured effect of each one. */
export const DEFAULT_TACTICS: Tactics = {
  session: false,
  volRegime: false,
  trendStrength: false,
  cooldown: false,
  cooldownBars: 4,
};

// Block Active needs a sustained streak: level ≥ 6 of 10 last-n windows. Validated on two separate days of real
// data (12 symbols): PF 1.04 / 2.81 against 0.71 / 2.54 with the former level ≥ 1 of 6, which raised volume
// after short streaks and amplified losses on a weak day (below Block off, 0.78).
// Source: direction (every Real candidate on the same side) — a regime filter: a side is raised only while its
// recent candidates win. Validated on 6 separate days (12 symbols, Normal off): PF above the config-set source
// on 5 of 6 days (e.g. 0.92 / 1.62 / 1.73 vs 0.76 / 1.13 / 1.20), 32–54 % fewer orders than Normal on.
// Symbol + direction additive looked best on 2 days but failed a third (PF 0.53) — not robust.
export const DEFAULT_BLOCK: BlockConfig = {
  sources: { config: false, direction: true },
  mode: "shared",
  ratio: 0.2,
  maxLevel: 10,
  minActiveLevel: 6,
  // the stack limit: additive sources can add up to 8× the base volume, never more
  maxMult: 8,
};
export const DEFAULT_DCA: DcaConfig = { levels: 2, step: 0.008 };
/** Axis: 3 legs 0.7 ATR apart toward the EMA-50 axis, entered at 0.35–2.6 ATR displacement (desk defaults). */
export const DEFAULT_AXIS: AxisConfig = {
  levels: 3,
  spacing: 0.7,
  ratio: 1,
  minDisp: 0.35,
  maxDisp: 2.6,
  center: 50,
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
  /** notional per paper trade, USD */
  paperNotional: number;
  toggles: StrategyToggles;
  /** entry tactics (session, volatility, trend strength, cooldown); each can be switched off */
  tactics: Tactics;
  /** restrict Base to these "bot|indication" pairs (empty = every combo) */
  focus: string[];
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
  /** account margin per symbol: cross (shared) or isolated */
  marginMode: "cross" | "isolated";
  /** hedge = long and short positions side by side; oneway = one net position per symbol */
  positionMode: "hedge" | "oneway";
}

/** Timeframe lanes the engine can process (minutes). */
export const TF_CHOICES = [1, 5, 15, 30] as const;

export const DEFAULT_SETTINGS: CoreSettings = {
  tfMin: 1,
  tfs: [1, 5, 15, 30],
  tfDays: { "1": 3, "5": 8, "15": 18, "30": 18 },
  // 14-day durable window + 48h run + 1 day indicator warm-up
  historyDays: 18,
  symbols: 40,
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
  toggles: DEFAULT_TOGGLES,
  tactics: DEFAULT_TACTICS,
  focus: [],
  disabledKinds: [],
  block: DEFAULT_BLOCK,
  dca: DEFAULT_DCA,
  axis: DEFAULT_AXIS,
  // Evidence (docs/research-*.md, 90 days, holdout): wider targets and SL 2–2.5 × TP scored best; min SL / min trail
  // distances were neutral; trailing slightly worse than none, so it stays one variant among others.
  grid: {
    tp: [0.026, 0.035, 0.05, 0.07],
    slOfTp: [1, 1.5, 2, 2.5],
    trailOfTp: [0, 0.5],
    minTrail: 0.006,
    minSl: 0.01,
    holdH: [8, 24],
    trailStep: 1,
    trailFree: false,
  },
  live: {
    enabled: false,
    connId: "bingx-vst-02",
    notionalUsd: 6,
    // control positions (symbol × direction) on the exchange: as many as the paper book holds (0 = no limit)
    maxPositions: 12,
    mode: "overall",
    ratio: 1,
    maxNotionalUsd: 200,
    rebalancePct: 0.25,
    marginMode: "cross",
    positionMode: "hedge",
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

/** Gate choices: min PF 1.05–1.50 (step 0.05), max DDT 2–20 h (step 2). */
export const MIN_PF_CHOICES = Array.from(
  { length: 10 },
  (_, i) => Math.round((1.05 + i * 0.05) * 100) / 100,
);
export const MAX_DDT_CHOICES = Array.from({ length: 10 }, (_, i) => 2 + i * 2);

export const GATE_PRESETS: Record<string, Gates> = {
  balanced: DEFAULT_GATES,
  strict: { minPf: 1.5, maxDdtH: 10, minTrades: 20, quorum: 0.75 },
  loose: { minPf: 1.05, maxDdtH: 20, minTrades: 8, quorum: 0.5 },
};

/** Named execution presets (toggles only; Base always computes everything). */
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
      block: false,
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
      block: false,
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
      block: false,
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
