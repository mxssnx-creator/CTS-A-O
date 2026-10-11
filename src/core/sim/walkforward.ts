import {
  coordVariants,
  EVAL_MIN_SL,
  forEachCoord,
  forEachMicro,
  plusVariants,
  RANGE_TAGS,
  rangeGateOf,
  minPfOf,
  rangeGated,
  type CoordTag,
  rangeOfId,
} from "../minimal-coord.ts";
import type { RangeTag, RangeCoord } from "../domain/types.ts";
// Walk-forward trade simulation ("simulated trade runs") — the Base → Main → Real → Live coordination.
//
//   Base  every indication × bot type × protect × sub-strategy (normal, trailing, DCA, DCA Active) has a
//         causal tape, always computed (intern), independent of execution toggles.
//   Main  at each step t, configs whose LONG window (closed before t) passes min PF / DDT and whose
//         bot × indication pair is parameter-robust.
//   Real  Main configs that are still working in the PRE-HISTORIC window (default 20h) and are allowed by
//         the toggles; ranked, one per pair, top `portfolio`. Their entries are executed on paper:
//           - last-N check (last N closes before the entry must hold PF >= neutral)
//           - Block: last-N windows 1..maxLevel checked independently; level = passing windows;
//             volume = 1 + ratio·level (capped); Block Active executes only level >= minActiveLevel
//           - Normal off: plain normal entries only execute when Block-adjusted (level >= 1)
//           - max positions per symbol / total, honest hour guard
//   Live  the Real entries due now are handed to the live adapter (gated, off by default).
import {
  allCombos,
  configId,
  kindOfId,
  laneProtect,
  REF_TF,
  seriesOf,
  trailTag,
} from "../pipeline/pipeline.ts";
import type { SymStat, Universe } from "../pipeline/pipeline.ts";
import { entrySignal } from "../bots/bots.ts";
import { rangeAllows } from "../range-coord.ts";
import { tacticCooldown } from "../indications/filters.ts";
import {
  DEFAULT_BLOCK,
  DEFAULT_DCA,
  DEFAULT_TOGGLES,
  PF_NEUTRAL,
  type CoreSettings,
} from "../config.ts";
import type {
  AxisConfig,
  AxisMode,
  BlockConfig,
  BotType,
  Bars,
  ProtectGridSpec,
  DcaConfig,
  Gates,
  OpenPosition,
  Protect,
  Stats,
  StratKind,
  StrategyToggles,
  Tactics,
  Trade,
} from "../domain/types.ts";
import type { SeriesCache } from "../indications/cache.ts";
import { hourlyNet, profitFactor, scoreStats, statsOf } from "../metrics/stats.ts";
import { ATR_PERIOD, simulate, splitSides } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk, snapTpRatio } from "./axis.ts";
import { adjustProtect, setKeyOf, type AdjustState } from "../adjust.ts";
import { BlockBook, blockBookOf, blockDecide, bookLevels, sourceKey, type BlockSource } from "./block.ts";
import { S2Coord } from "./s2coord.ts";
import { INDICATION_BY_ID, isSignalInd, laneOf, signalSourceOf } from "../indications/registry.ts";
import { marketSideAllows, marketTrendOf, type MarketTrend } from "./market-trend.ts";
import { isMicroInd, microIndFits, type MicroIndRule } from "../indications/micro.ts";
import {
  acceptKey,
  activeSignals,
  EngineSideIndex,
  engineSideKey,
  engineSideKeyFor,
  guardKey,
  SignalAcceptIndex,
  SignalGuard,
  sigActiveKey,
  sigUnitKey,
  sideAcceptKey,
} from "../signals.ts";
import type {
  SignalAccept,
  SignalClusterSettings,
  SignalSettings,
  SignalSourceGate,
} from "../signal-config.ts";

const H = 3_600_000;

/**
 * Coordination tactics: portfolio-level rules on the realized results of the executed orders (causal: only orders
 * closed before an entry count) and on the positions open at that moment. Each can be switched on or off.
 */
export interface CoordSettings {
  enabled: boolean;
  /** hour profit lock: no new entries for the rest of a clock hour once its realized Σ trade % reaches this (0 = off) */
  hourLock: number;
  /** after a clock hour that closed negative: "signals" = no signal entries, "all" = no entries, "off" */
  cooldown: "off" | "signals" | "all";
  /** no entry against a position open on the same symbol in the other direction */
  conflict: boolean;
  /**
   * a signal enters only while an engine candidate is open on its symbol in its direction: a candidate the engine
   * processed (taken or not) that entered at or before the signal and had not closed yet
   */
  confirm: boolean;
  /** Stable-02 last-N windows: a symbol whose last window lost (or PF < 1) takes no entries for its next N closes */
  s2Windows?: boolean;
  /** window length (steps). Default 6. */
  s2Steps?: number;
  /** pause length in closes. Default: the window length. */
  s2Pause?: number;
  /** volume added per passing relation. Default 0.4. */
  s2Increase?: number;
  /** Stable-02 relation volume: winning relations add volume (0.4 each, ≤ 1.8×), re-evaluated every 2 h */
  s2RelVolume?: boolean;
  /**
   * negative-hour hedge: signals whose own results were positive in the past hours the executed book lost trade
   * (without confirmation) while the book is losing — the current or the previous hour negative
   */
  hedge?: boolean;
  /** hedge selection: PF of a signal in the book's losing hours (default 1.3) and results needed (default 5) */
  hedgeMinPf?: number;
  hedgeMinN?: number;
  /** hedge only after a losing previous hour (default false: also while the current hour is negative) */
  hedgePrevOnly?: boolean;
}

// causal validation, 8 days × 12 symbols (docs/signals-validation.md): confirmation PF 1.32 → 1.58, drawdown halved;
// the hour lock and the cooldown cost net on every variant; opposite-entry blocking mixed
export const DEFAULT_COORD: CoordSettings = {
  enabled: true,
  hourLock: 0,
  cooldown: "off",
  conflict: false,
  confirm: true,
};

/** strict negative-hour hedge selection (the loose PF 1.3 / 5 lost on 8 days, docs/signals-validation.md) */
export const HEDGE_DEFAULTS = { minPf: 2, minN: 10 } as const;
const numOr = (v: unknown, d: number, lo: number, hi: number) =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v))
    ? d
    : Math.min(hi, Math.max(lo, Number(v)));

export function coordSettings(c?: Partial<CoordSettings> | null): CoordSettings {
  const hl = Number(c?.hourLock);
  return {
    enabled: c?.enabled !== false,
    hourLock: Number.isFinite(hl) ? Math.min(100, Math.max(0, hl)) : DEFAULT_COORD.hourLock,
    cooldown:
      c?.cooldown === "signals" || c?.cooldown === "all" || c?.cooldown === "off"
        ? c.cooldown
        : DEFAULT_COORD.cooldown,
    conflict: c?.conflict === undefined ? DEFAULT_COORD.conflict : Boolean(c.conflict),
    confirm: c?.confirm === undefined ? DEFAULT_COORD.confirm : Boolean(c.confirm),
    s2Windows: c?.s2Windows === true,
    s2Steps: c?.s2Steps,
    s2Pause: c?.s2Pause,
    s2Increase: c?.s2Increase,
    s2RelVolume: c?.s2RelVolume === true,
    hedge: c?.hedge === true,
    hedgeMinPf: numOr(c?.hedgeMinPf, HEDGE_DEFAULTS.minPf, 1, 5),
    hedgeMinN: numOr(c?.hedgeMinN, HEDGE_DEFAULTS.minN, 1, 100),
    hedgePrevOnly: c?.hedgePrevOnly === true,
  };
}

/**
 * What signal confirmation judges: whether an engine candidate (taken or not) is open on the symbol in the direction
 * at t — entered at or before t, not closed yet.
 */
export interface ConfirmPool {
  confirms(sym: string, side: number, t: number): boolean;
}

/**
 * The engine candidates open right now, per symbol × direction (the walk-forward's confirmation pool): counted up when
 * an engine candidate is processed, down when it closes. The run asks it at the entry it has settled to.
 */
export class EngineOpenCount implements ConfirmPool {
  private n = new Map<string, number>();
  add(sym: string, side: number, d: 1 | -1) {
    const k = `${sym}|${side > 0 ? 1 : -1}`;
    const v = (this.n.get(k) ?? 0) + d;
    if (v > 0) this.n.set(k, v);
    else this.n.delete(k);
  }
  confirms(sym: string, side: number): boolean {
    return (this.n.get(`${sym}|${side > 0 ? 1 : -1}`) ?? 0) > 0;
  }
}

/**
 * The coordination verdict for one entry (null = allowed). `hourNet` = realized Σ trade % per clock hour of the
 * executed orders closed so far; `open` = executed orders open at the entry (the conflict rule reads them). `confirmPool`:
 * what confirmation judges — the engine candidates (taken or not) open at the entry. Without one, the neutral index is
 * empty (the same EngineOpenCount the simulation counts with, nothing counted yet): the executed book is never read for
 * confirmation, so no range setting can change a signal decision through it (8 Oct).
 */
export function coordBlock(
  c: CoordSettings | undefined,
  tr: { cfg: string; sym: string; side: number; entryT: number },
  hourNet: ReadonlyMap<number, number>,
  open: ReadonlyArray<{ cfg: string; sym: string; side: number }>,
  confirmPool?: ConfirmPool | null,
): string | null {
  if (!c?.enabled) return null;
  const hk = Math.floor(tr.entryT / H);
  const signal = sigCfg(tr.cfg);
  if (c.hourLock > 0 && (hourNet.get(hk) ?? 0) >= c.hourLock) return "hourLock";
  if (c.cooldown !== "off" && (hourNet.get(hk - 1) ?? 0) < 0 && (c.cooldown === "all" || signal))
    return "cooldown";
  if (c.conflict && open.some((x) => x.sym === tr.sym && x.side !== tr.side)) return "conflict";
  const pool: ConfirmPool = confirmPool ?? new EngineOpenCount();
  if (c.confirm && signal && !pool.confirms(tr.sym, tr.side, tr.entryT)) return "confirm";
  return null;
}

/**
 * A confirmation index: per "sym|1" / "sym|-1", the entries of the candidates ascending, with the running maximum exit.
 */
export type ConfirmIndex = Map<string, { e: Float64Array; mx: Float64Array }>;

/** The confirmation index of (symbol, direction, entry, exit) candidates. */
export function confirmIndexOf(
  cands: Iterable<{ sym: string; side: number; entryT: number; exitT: number }>,
): ConfirmIndex {
  const iv = new Map<string, Array<[number, number]>>();
  for (const f of cands) {
    const k = `${f.sym}|${f.side > 0 ? 1 : -1}`;
    let l = iv.get(k);
    if (!l) iv.set(k, (l = []));
    l.push([f.entryT, f.exitT]);
  }
  const out: ConfirmIndex = new Map();
  for (const [k, l] of iv) {
    l.sort((a, b) => a[0] - b[0]);
    const e = new Float64Array(l.length);
    const mx = new Float64Array(l.length);
    let m = -Infinity;
    l.forEach(([en, ex], j) => {
      e[j] = en;
      mx[j] = m = Math.max(m, ex);
    });
    out.set(k, { e, mx });
  }
  return out;
}

/**
 * Whether a candidate of the index is open on sym and direction at t: the last entry at or before t has a running
 * maximum exit after t (some candidate entered by t and not closed by it).
 */
export function confirmIndexOpen(idx: ConfirmIndex, sym: string, side: number, t: number): boolean {
  const g = idx.get(`${sym}|${side > 0 ? 1 : -1}`);
  if (!g) return false;
  let lo = 0;
  let hi = g.e.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (g.e[m] <= t) lo = m + 1;
    else hi = m;
  }
  return lo > 0 && g.mx[lo - 1] > t;
}

/**
 * The engine confirmation index of a run: its confirmation candidates (the range-neutral pool, taken or not), as the
 * simulation confirms on them. A candidate still open at the run's end closes at it (its exit is the run's end), so the
 * index answers the simulation's own question at every time up to that end. Live and paper (runtime coordOf) read this
 * index up to the run's end, and the live tapes of the pool's configs after it.
 */
export function engineConfirmIndex(sim: Pick<WalkForwardResult, "confirmCands">): ConfirmIndex {
  return confirmIndexOf(sim.confirmCands);
}

export interface WalkForwardOptions {
  preH: number;
  simH: number;
  stepH: number;
  /** simulation start; default = end - simH */
  startT?: number;
  portfolio: number;
  /**
   * fixed selection: how seats are ranked (the order `portfolio` keeps and the live top-config fill uses).
   * score (default): lower-confidence bound × (0.5 + hourly success); green: hourly success first (the share of a
   * config's exit-hours that ended positive), the lower-confidence bound only breaking ties
   */
  rankBy?: "score" | "green";
  /** Real / Live execution: last this-many closes must clear min PF and the DDT gate. 0 = off */
  lastN: number;
  lastNMinPf: number;
  /**
   * Normal on: a Normal / Trailing entry Block does not raise trades at its unit only when the config's own last
   * lastN (25 when off) closes clear this PF (and the DDT / DDR gates); Block Active does not skip it then. Unset =
   * the base trades on the stage gates alone (and Block Active skips it below its level, as before).
   */
  normalBaseMinPf?: number;
  /**
   * Pre-historic validation: last this-many closes must clear min PF and the DDT gate before a config
   * can take a seat (Base / Main / best-set). Additional strategies still pass the stage gates after it.
   * Real and Live check `lastN` again at the entry. 0 = off.
   */
  validLastN?: number;
  /**
   * Signals: the closes their seat validation last-N looks at (instead of validLastN). Their entry last-N is the smaller
   * of this and lastN, never more closes than the engine's: at the defaults (lastN 15, this 25) a signal enters on its
   * last 15 closes (execDecision; signal-last-n-window.test.ts). A signal config closes ~10 times in a 48 h window, so
   * the engine's 50 / 25 could never pass and signals never traded. Unset = the engine's values; 0 = off.
   */
  signalValidLastN?: number;
  /**
   * Ranges that open nothing new (range tags, e.g. "mc"): the walk-forward mirror of `live.excludeRanges`, so a
   * session measures what the desk sends — the range keeps computing and its tapes are unchanged. Unset = none.
   */
  excludeRanges?: string[];
  /**
   * Each range's own coordination (RangeGrid.coord, keyed by range tag): its seat and execution last-N windows, symbol
   * gate and engine direction acceptance replace the global values for that range's candidates only. Unset = global.
   */
  rangeCoord?: Partial<Record<string, RangeCoord>>;
  /**
   * Entry crowding cap per range ("mc", "mn", "mp", "sh", "gn", "lg", "wide", "sig"): at most this many configs of
   * the range enter on one symbol × side × entry time — the best-ranked first (candidates are taken best first). One
   * signal bar fires every cell of a range at once: on 6 Oct (24 h) a single LYN-USDT bar entered 229 Micro configs,
   * all stopped, −472 % — Micro's whole loss. Unset / 0 = no cap.
   */
  entryCrowd?: Partial<Record<string, number>>;
  /**
   * Range cells (micro, minimal, short, minimal plus): before a seat, the last `lastN` closes must also clear this
   * higher PF. Causal (only closes before the step). Unset = the ranges pass the same gates as the wide grid.
   */
  rangeGate?: {
    lastN: number;
    minPf: number;
    /** the range gate's own last-N floor (unset = gates.lastNFloor; 0 = strict: fewer than lastN closes fails) */
    floor?: number;
    /** the ranges it gates (unset = GATED_RANGES: Micro, Minimal, Short, Minimal plus) */
    ranges?: readonly string[];
  } | null;
  /** each range takes its own seat per pair instead of competing with the wide cells of that pair */
  rangeSeats?: boolean;
  /**
   * Demo probe (never on mainnet): besides the normal picks, the best `perRange` range tapes of each range
   * (micro / minimal / short / plus) by window result are seated even when they fail the gates, and their
   * entries skip the last-N and symbol gates — live fills per range for a test account.
   */
  /**
   * pairs ("bot|ind") that passed the Base gate in the current compute: only they take a seat (a pair held for an
   * open position stays to manage it, but opens nothing new). Unset = no Base restriction (tests, research tools).
   */
  basePassed?: ReadonlySet<string>;
  /**
   * signal pairs ("bot|ind") that passed their Base gate in the current compute: a held signal pair keeps its tapes
   * to manage its positions but opens nothing new. Unset = no restriction.
   */
  signalBasePassed?: ReadonlySet<string>;
  probe?: {
    perRange: number;
    /**
     * heatmap probe: the best `perCell` tapes of every protect cell (TP × SL × trailing, any range or the wide grid)
     * are seated, also a cell without closes yet (its tape with the most closes) — every cell trades
     */
    perCell?: number;
  } | null;
  maxPerSymbol: number;
  maxOpen: number;
  guardPct: number;
  /** coordination tactics across every order (engine and signals); absent = all off */
  coord?: CoordSettings;
  /** long (Main) window in hours */
  longH: number;
  /** share of a pair's variants that must pass the long window */
  robustFrac: number;
  rank: "score" | "lcb" | "net";
  /**
   * Selection mode.
   *  hourly  — re-rank every step on the long + pre-historic windows
   *  durable — keep durable winners: a config must be positive in >= durableFrac of `durableSplits`
   *            sub-windows of the long window (PF >= min overall); once held it stays until its long-window
   *            PF drops below neutral 1.0 (sticky, low churn)
   *  fixed   — every focus pair trades continuously (validated offline); best protect per pair
   */
  mode: "hourly" | "durable" | "fixed";
  /** strategy config sets paused by the live-feedback adjuster ("bot|ind|kind") */
  paused?: ReadonlySet<string>;
  durableSplits: number;
  durableFrac: number;
  /** require the pre-historic window to still work (PF >= neutral) */
  preGate: boolean;
  /** restrict Main to these bot types (empty = all) */
  bots: readonly BotType[];
  /** max open positions per side (long / short) across the book: limits correlated stop-outs */
  maxPerSide: number;
  /**
   * max open POSITIONS (distinct symbol × direction); an order on a symbol and side that is already open does
   * not add a position, so orders stay many while positions stay few
   */
  maxPositions?: number;
  /**
   * seats per strategy family: Normal/Trailing, DCA and Axis each get their own `portfolio` seats (one config
   * per pair and family), so the additional strategies run next to the base instead of competing for its seat
   */
  familySeats?: boolean;
  /** best first at the same entry time (default); false = by config id (the former order) */
  bestFirst?: boolean;
  /** DCA / Axis need a base (Normal / Trailing) result on the same pair to beat (default); false = pass when none */
  familyNeedsBase?: boolean;
  /**
   * DCA / Axis take a seat only while a Normal / Trailing config of the same pair holds one at that step (measurement,
   * default off): a ladder trades only where its pair's base is validated now — with every config its own seat,
   * familyNeedsBase never applied (micro20: Axis and DCA traded beside passed Normal configs that lost)
   */
  ladderNeedsBase?: boolean;
  /**
   * "config": every config is its own seat — each one that clears its own evaluation trades, independent of the
   * other configs of its pair (TP / SL / trailing variants, strategy types); DCA / Axis are judged on their own
   * results, not against the pair's base (default). "pair": one config per pair × family (the best scored).
   */
  seatPer?: "pair" | "config";
  /** minimum Real seats per timeframe lane group (validated configs only); the portfolio grows to fit */
  laneSeats?: number;
  /**
   * Cap on the Micro seats per step (0 / unset = none, the default): a Micro cell is its own seat, so one pair can
   * take many. It was a fixed 200, which silently dropped validated Micro sets.
   */
  microSeats?: number;
  /** signals that trade: "bot|ind|sym" (Signals processing); unset = every signal */
  signalActive?: ReadonlySet<string>;
  /**
   * causal signal activation: when set, the active signals are re-ranked at every step from the signal tapes'
   * results closed before it (activeSignals rules on the last longH hours); signalActive is then ignored
   */
  signalRank?: SignalSettings;
  /** source stability gate on the executed signal orders (signals.sourceGate) */
  signalSourceGate?: SignalSourceGate;
  /** signal guard window (last N closed results; 0 = off) */
  signalGuardN?: number;
  /** signal loss-cluster guard (unset / disabled = off) */
  signalCluster?: SignalClusterSettings;
  /** only signal groups (source × symbol × direction × type) with a recent PF above the minimum trade */
  signalAccept?: SignalAccept;
  /**
   * direction acceptance: a signal entry on a side opens only while every signal candidate of that side (all sources,
   * symbols and configs pooled, executed or not, closed before the entry) had a PF of at least minPf over the last
   * `hours` hours — fewer than minTrades closes: judged on twice the hours, still fewer = valid (`acceptOnWindow`;
   * unset / disabled = off)
   */
  signalSideAccept?: SignalAccept;
  /**
   * direction domination per source × symbol (8 Oct): "unit" refuses a signal's side on a symbol when the other side of
   * the same source and type has the better PF there (both sides with at least DOMINATION_MIN closes over the last
   * DOMINATION_HOURS, judged on the tape record, executed or not). "pooled" and "off": no per-unit rule (the pooled
   * signalSideAccept above is separate)
   */
  signalDomination?: "off" | "unit" | "pooled";
  /**
   * the signal unit is the config (10 Oct, plan T5): each TP x SL x trail config activates and records on its own. Off = the
   * pair (source x range) unit with its configs averaged (the pre-gate ranking). Simulation only until the live gate follows.
   */
  signalConfigUnits?: boolean;
  /** the acceptance groups split per source and range (signals.splitPool, 10 Oct T6): simulation and live alike */
  signalSplitPool?: boolean;
  /**
   * market side rule (10 Oct): a long opens only while the market's median return over `hours` is not up, a short only
   * while it is not down (market-trend.ts). Unset = off. An unknown market refuses the side.
   */
  signalMarketSide?: { hours: number };
  /** signals' Normal / Trailing trade on their own: Normal off and Block Active's skip do not apply (Block raises) */
  signalOwnBase?: boolean;
  /** signal orders have order caps of their own (per symbol, open); positions (symbol × direction) share maxPositions with the engine */
  signalPerSymbol?: number;
  signalMaxOpen?: number;
  /** max open signal POSITIONS (distinct symbol × direction, long and short counted apart); 0 / unset = no limit */
  signalMaxPositions?: number;
  toggles: StrategyToggles;
  block: BlockConfig;
  dca: DcaConfig;
  gates: Gates;
  /**
   * Real stage, per symbol of the config: closes of that symbol before the entry, inside the lookback.
   * veto — a sample of symMinN that misses min PF or is net-negative does not open.
   * proven — the symbol must already clear min PF (a quiet symbol does not open).
   * *Side — the same, on this direction only. Signals keep their own accept gate. Unset = off.
   */
  symGate?: "veto" | "proven" | "vetoSide" | "provenSide" | "off";
  /** closes on that symbol before the symbol gate judges it. Default 2. */
  symMinN?: number;
  /** symbol-gate lookback in hours. Unset = the selection window (max of longH and preH). */
  symH?: number;
  /**
   * Direction gate (Real stage, engine configs): an entry on a side opens only while that side's last sideGateN
   * candidates (the Block feed: every symbol and config, executed or not, closed before the entry) sum positive.
   * A side that loses across the universe stops opening until its candidates recover; signals keep their own gates.
   * 0 / unset = off.
   */
  sideGateN?: number;
  /**
   * Engine direction acceptance (Real stage, engine configs): an entry opens only while its group — type family
   * (Normal + Trailing / DCA / Axis) × range × side — had a PF of at least minPf over the last `hours` whole hours
   * on every engine candidate (executed or not, every symbol and config); with fewer than minTrades closes it is judged
   * on twice the hours, and still fewer counts as valid (`acceptOnWindow`). A side that
   * loses in one family and range (short Normal in a rally) pauses there alone and reopens once its record recovers;
   * the other families, ranges and the other side keep trading. Unset / disabled = off.
   */
  engineSideAccept?: SignalAccept;
  /**
   * Causal evaluation: Base, Main and the Real ranking compute on the history before the simulated run (now − simH), so
   * the pairs the run trades were chosen without seeing it. Off (live default): they use every bar up to now — right
   * for forward trading, but the simulated run's PF is then partly in-sample.
   */
  causalBase?: boolean;
  cost: number;
  protects: readonly Protect[];
  dcaProtects: readonly Protect[];
}

/**
 * The legacy fallback grid, for a caller that passes no settings grid (walkforward.ts protects, regression tests). The
 * live grid is `DEFAULT_SETTINGS.grid` (config.ts): every desk and the runtime pass that one (10 Oct: the two defaults
 * disagree on tp, slOfTp and holdH, and the sweep script now uses the live grid).
 */
export const DEFAULT_GRID: ProtectGridSpec = {
  tp: [0.026, 0.035, 0.05, 0.07],
  slOfTp: [1, 1.5, 2, 2.5],
  trailOfTp: [0, 0.5],
  minTrail: 0.006,
  minSl: 0.01,
  holdH: [8, 24],
  trailStep: 1,
  trailFree: false,
};

/** Upper bound on protect variants (wide grid plus the optional short range). Dedup can only make it smaller. */
export function gridVariants(g: ProtectGridSpec): number {
  const hold = g.holdH.length || 1;
  const main = g.tp.length * g.slOfTp.length * g.trailOfTp.length * hold;
  const plus = g.minimalPlus;
  const plusN = plus
    ? plusVariants(plus.enabled === true, plus.cells?.length ?? 0, hold)
    : 0;
  return (
    main +
    coordVariants(hold, g.short) +
    coordVariants(hold, g.minimal) +
    coordVariants(hold, g.general) +
    coordVariants(hold, g.long) +
    coordVariants(hold, g.micro) +
    plusN
  );
}

/**
 * Every protect variant of a grid (hold converted to bars). Each variant is computed independently. `cost` (the
 * round-trip position cost, settings.cost) turns Micro's net targets into price targets (tpNetOfCost).
 */
export function protectGrid(tfMin: number, g: ProtectGridSpec = DEFAULT_GRID, cost?: number): Protect[] {
  // the evaluation's minimum stop (settings.grid.minSlEval, default EVAL_MIN_SL)
  const slFloor = g.minSlEval ?? EVAL_MIN_SL;
  const out: Protect[] = [];
  const seen = new Set<string>();
  const push = (p: Protect) => {
    if (p.trail > 0) {
      p.trailStep = g.trailStep ?? 1;
      p.trailFree = g.trailFree ?? false;
    }
    // (the trail step and trail-free switch are part of the key, as they are part of the config id)
    const key = `${p.tp}|${p.sl}|${p.trail}|${p.hold}|${p.tag ?? ""}${trailTag(p)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  };
  const cell = (
    tp: number,
    k: number,
    tr: number,
    h: number,
    minSl: number,
    minTrail: number,
    tag?: CoordTag,
  ) => {
    const p: Protect = {
      tp,
      // no evaluated config below the stop floor (EVAL_MIN_SL): a tighter stop is inside the spread and noise
      sl: +Math.max(slFloor, minSl, tp * k).toFixed(4),
      // the floor is on the trailing distance (trail × trailStep), not on the arming move
      trail: tr > 0 ? +Math.max(minTrail / (g.trailStep ?? 1), tp * tr).toFixed(4) : 0,
      hold: Math.max(2, Math.round((h * 60) / tfMin)),
      ...(tag ? { tag } : {}),
    };
    push(p);
  };
  for (const tp of g.tp)
    for (const k of g.slOfTp)
      for (const tr of g.trailOfTp)
        for (const h of g.holdH) cell(tp, k, tr, h, g.minSl, g.minTrail);
  forEachCoord(g, (tp, k, tr, h, minSl, minTrail, tag) => cell(tp, k, tr, h, minSl, minTrail, tag));
  forEachMicro(g, (tp, k, tr, h, minSl, minTrail, slEval) => {
    push({
      tp: +tp.toFixed(6),
      // the range's own evaluation floor when it sets one (micro.minSlEval), else the global one
      sl: +Math.max(slEval ?? slFloor, minSl, tp * k).toFixed(6),
      trail: tr > 0 ? +Math.max(minTrail, tp * tr).toFixed(6) : 0,
      hold: Math.max(2, Math.round((h * 60) / tfMin)),
      tag: "mc",
    });
  }, cost);
  const plus = g.minimalPlus;
  if (plus && plus.enabled === true && plus.cells?.length) {
    for (const c of plus.cells)
      for (const h of g.holdH)
        push({
          tp: c.tp,
          sl: Math.max(slFloor, c.sl),
          trail: c.trail,
          hold: Math.max(2, Math.round((h * 60) / tfMin)),
          tag: "mp",
          ...(c.trail > 0 ? { trailStep: g.trailStep ?? 1, trailFree: g.trailFree ?? false } : {}),
        });
  }
  return out;
}

export function dcaProtectGrid(tfMin: number, dca?: Partial<DcaConfig> | null, minSlEval?: number): Protect[] {
  const hold = Math.max(4, Math.round(480 / tfMin));
  // targets: the configured ones, else short adds (4× and 6× the position cost) and two wide ones; the stop a
  // multiple of the target (configured, else 2× for the short adds and 1.5× for the wide ones)
  const tps = dca?.tp?.length ? dca.tp : [0.008, 0.012, 0.026, 0.035];
  return tps.map((tp) => ({
    tp,
    sl: +Math.max(minSlEval ?? EVAL_MIN_SL, tp * (dca?.slOfTp ?? (tp < 0.02 ? 2 : 1.5))).toFixed(4),
    trail: 0,
    hold,
  }));
}

/** engine direction acceptance as on by default (operator, 6 Oct): PF 1.05 over 24 h, at least 30 closes */
export const ENGINE_SIDE_ACCEPT: SignalAccept = { enabled: true, minPf: 1.05, hours: 24, minTrades: 30 };

/** The settings key of each range tag (a range is named by its grid key in the settings, by its tag in the engine) */
const GRID_KEY_OF_TAG: Readonly<Record<string, string>> = { mc: "micro", mn: "minimal", sh: "short", gn: "general", lg: "long" };

/** Every range's own coordination by tag: only the ranges whose grid sets one (undefined = the global values) */
export function rangeCoordsOf(s: CoreSettings): Partial<Record<string, RangeCoord>> {
  const out: Partial<Record<string, RangeCoord>> = {};
  const grid = s.grid as unknown as Record<string, { coord?: RangeCoord } | false | undefined> | undefined;
  for (const [tag, key] of Object.entries(GRID_KEY_OF_TAG)) {
    const c = grid?.[key];
    if (c && c.coord) out[tag] = c.coord;
  }
  return out;
}

/** The range's own coordination of a candidate's tag (undefined when none is set: the global values apply) */
export function rangeCoordOf(
  o: { rangeCoord?: Partial<Record<string, RangeCoord>> },
  tag: string | undefined | null,
): RangeCoord | undefined {
  return tag && o.rangeCoord ? o.rangeCoord[tag] : undefined;
}

export function defaultWalkForward(s: CoreSettings): WalkForwardOptions {
  return {
    rangeCoord: rangeCoordsOf(s),
    preH: 20,
    simH: 48,
    stepH: 1,
    // Real seats per strategy family: 0 = no limit — every config that passes the evaluation (PF, DDT, DDR,
    // validation) trades (12 windows × 12 symbols: PF 1.223 → 1.226, orders +5 % vs 16 seats; docs/block-sweep.md)
    portfolio: 0,
    // entry last-N 15: the best of ten windows (0, 5 … 75) — PF 3.62 against 3.12 at 20, 2.89 at 25, 2.57 at 35
    // (12 symbols, 6 h pre-historic + 6 h run, 5-6 Oct, every window on the same tapes (scratchpad lastn12)); operator, 6 Oct: the best last-N windows as defaults
    lastN: 15,
    lastNMinPf: PF_NEUTRAL,
    // best-set validation: the last 15 closes must clear min PF and the DDT gate before a seat — 6 of 6 hours positive,
    // net +36 % and 42 % more orders than 25, PF 3.43 against 3.62 (50: PF 3.40 at 48 % fewer orders) (12 symbols, 6 h pre-historic + 6 h run, 5-6 Oct, every window on the same tapes (scratchpad lastn12))
    validLastN: 15,
    // signals: their own last 25 at validation (signalValidLastN) — PF 3.85 against 3.62 with it off, 6 of 6 hours positive,
    // max drawdown −57 % (12 symbols, 6 h pre-historic + 6 h run, 5-6 Oct, every window on the same tapes (scratchpad lastn12)). A last 10 cut orders and PF on 2 Oct (PR #65) and again here (PF 3.39), so the
    // window is the 25 that measured best, not the 10 that did not. The entry reads min(lastN, 25): the last 15 closes at
    // the default lastN 15 (execDecision). A 25-close signal entry has not been measured: the entry is capped at lastN,
    // so it needs a code change or a setting of its own first (a variant to measure, not the default).
    signalValidLastN: 25,
    // engine direction acceptance: a type family × range × side opens only while its candidates' last 24 h clear
    // PF 1.05 (≥ 30 closes). Operator, 6 Oct: on — 24 h, 30 symbols: PF 1.19 → 2.59, net +8,556 → +23,268 %
    // (docs/sims/sim24h-2026-10-06; the 3 h windows: 0.38 → 0.88 and 0.57 → 0.54)
    engineSideAccept: { ...ENGINE_SIDE_ACCEPT },
    // range cells: their own, higher last-N gate (grid.rangeGate)
    rangeGate: rangeGateOf(s.grid),
    rangeSeats: s.grid?.rangeSeats === true,
    // unlimited working orders on one symbol (0 = no limit)
    maxPerSymbol: 0,
    maxOpen: 0,
    // hour-loss stop off: with signal confirmation PF 1.49 → 1.63 and drawdown 490 → 442 (8 causal days)
    guardPct: 0,
    coord: {
      ...DEFAULT_COORD,
      // s2Steps / s2Pause stay unset: the Stable-02 window and pause default to 6 closes (S2Coord, `?? 6`). Seeded
      // from Block's volume steps / pause they read 7 / 0, and a pause of 0 is no Stable-02 pause at all
      s2Increase: s.block?.increase,
    },
    longH: 336,
    robustFrac: 0.6,
    rank: "lcb",
    bots: [],
    mode: "fixed",
    durableSplits: 4,
    durableFrac: 0.75,
    preGate: true,
    maxPerSide: 0,
    // no processing cap by default (operator, 5 Oct: "always remove caps and limits or keep them very high — it
    // has to process freely always, and many orders"). 0 = no limit; the live risk budgets (exposure, stop risk,
    // worst case) still size what reaches the exchange.
    maxPositions: 0,
    // family seats: Normal / Trailing, DCA and Axis each take their own seats (independent books) and a DCA / Axis
    // set needs no base to beat — with every config evaluated and unlimited seats the highest PF (12 windows:
    // 1.253 vs 1.226 one seat per pair, net ÷ drawdown 0.52 vs 0.43; docs/block-sweep.md, stage 7)
    familySeats: true,
    familyNeedsBase: false,
    // every config of every validated pair is its own seat, evaluated on its own results only (operator, 5 Oct;
    // x01 runs it) — one seat per pair × family dropped all but the best-scored config of each set
    seatPer: "config",
    laneSeats: 3,
    // Real, per symbol: open only where this config's own closes already clear min PF
    // per direction (operator: long and short run independently) — "proven" pooled both sides' closes on a symbol
    symGate: "provenSide",
    symMinN: 2,
    toggles: { ...DEFAULT_TOGGLES, ...(s.toggles ?? {}) },
    block: { ...DEFAULT_BLOCK, ...(s.block ?? {}) },
    dca: { ...DEFAULT_DCA, ...(s.dca ?? {}) },
    gates: s.gates,
    cost: s.cost,
    // with timeframe lanes the grid is expressed on the 15m reference and every lane scales it (laneProtect)
    protects: protectGrid(s.tfs?.length ? REF_TF : s.tfMin, s.grid ?? DEFAULT_GRID, s.cost),
    dcaProtects: dcaProtectGrid(s.tfs?.length ? REF_TF : s.tfMin, s.dca, s.grid?.minSlEval),
  };
}

export interface ConfigTape {
  id: string;
  bot: BotType;
  ind: string;
  protect: Protect;
  kind: StratKind;
  /** number of closed trades; columns below are ordered by exit time */
  n: number;
  syms: readonly string[];
  exitT: Float64Array;
  entryT: Float64Array;
  r: Float64Array;
  entry: Float32Array;
  exit: Float32Array;
  symI: Uint16Array;
  side: Int8Array;
  reason: Uint8Array;
  bars: Uint16Array;
  vol: Float32Array;
  level: Uint8Array;
  /** prefix sums over trades (length n+1): gross profit, gross loss, r, r² */
  gp: Float64Array;
  gl: Float64Array;
  rs: Float64Array;
  r2: Float64Array;
  /** positions still open at the last bar (normal / trailing only) */
  open: OpenPosition[];
  /** signals on the last closed bar (enter at the next open) */
  /** `protect`: an ATR protect's distances resolved for that entry (live / paper get concrete prices) */
  pending: Array<{ sym: string; side: 1 | -1; protect?: Protect }>;
  /**
   * Built only because paper holds it (a seat or an open position) while its pair no longer passes Base for this
   * cell's range / target / lane: it serves that position and takes no new seat. Built unfiltered and seated by the
   * pair alone, a held cell kept opening orders after Base had dropped it.
   */
  heldOnly?: boolean;
  /**
   * First time the tape's series can produce a trade (its lane's history start + a day of indicator warm-up).
   * Selection windows start here at the earliest: a lane with a shorter history (1m: days) is judged on what
   * it has, not on empty weeks before its data.
   */
  fromT?: number;
}

// appended only: a tape stores the index ("be" last, so the earlier indices keep their meaning)
const REASONS: Trade["reason"][] = ["tp", "sl", "trail", "time", "disarm", "be"];

/** Bytes of one tape's backing buffer: 9 float64 columns (3 × n, 4 × n+1), 3 float32, 2 uint16, 3 int8/uint8. */
export const tapeBytes = (n: number) => (3 * n + 4 * (n + 1)) * 8 + n * 4 * 3 + n * 2 * 2 + n * 3;

/** The column views of a tape of `n` trades laid out at `off` in `buf` (the one layout, used everywhere). */
export function tapeViews(buf: ArrayBufferLike, off0: number, n: number) {
  let off = off0;
  const F = (len: number) => {
    const a = new Float64Array(buf, off, len);
    off += len * 8;
    return a;
  };
  const exitT = F(n),
    entryT = F(n),
    r = F(n),
    gp = F(n + 1),
    gl = F(n + 1),
    rs = F(n + 1),
    r2 = F(n + 1);
  const entry = new Float32Array(buf, off, n);
  off += n * 4;
  const exit = new Float32Array(buf, off, n);
  off += n * 4;
  const vol = new Float32Array(buf, off, n);
  off += n * 4;
  const symI = new Uint16Array(buf, off, n);
  off += n * 2;
  const bars = new Uint16Array(buf, off, n);
  off += n * 2;
  const side = new Int8Array(buf, off, n);
  off += n;
  const reason = new Uint8Array(buf, off, n);
  off += n;
  const level = new Uint8Array(buf, off, n);
  return { exitT, entryT, r, gp, gl, rs, r2, entry, exit, vol, symI, bars, side, reason, level };
}

/** Whether a tape's columns sit in one buffer in the tapeViews layout from its exitT column (makeTape / packArena). */
export function inTapeLayout(t: ConfigTape): boolean {
  const src = t.exitT.buffer;
  const base = t.exitT.byteOffset;
  const bytes = tapeBytes(t.n);
  return (
    t.level.buffer === src &&
    t.level.byteOffset === base + bytes - t.n &&
    src.byteLength >= base + bytes
  );
}

/**
 * Every tape of a worker reply in ONE buffer (each in the tapeViews layout at an 8-byte aligned offset): the main
 * thread then receives one ArrayBuffer per reply instead of one per tape. Each received or allocated ArrayBuffer
 * costs the main thread ~20 µs plus collector work — at 100k tapes per compute that was seconds of native time and
 * the longest event-loop stalls. The tapes' views are moved onto the arena (same values); a tape not in the layout
 * keeps its own buffer. Returns the arena and the buffers that stay separate.
 */
export function packArena(tapes: ConfigTape[]): { arena: ArrayBuffer | null; others: ArrayBuffer[] } {
  const align = (x: number) => Math.ceil(x / 8) * 8;
  const packed = tapes.filter(inTapeLayout);
  const others = new Set<ArrayBuffer>();
  for (const t of tapes) if (!inTapeLayout(t)) for (const k of TAPE_COLUMNS) others.add(t[k].buffer as ArrayBuffer);
  let total = 0;
  for (const t of packed) total = align(total) + tapeBytes(t.n);
  if (!packed.length) return { arena: null, others: [...others] };
  const arena = new ArrayBuffer(Math.max(8, align(total)));
  let off = 0;
  for (const t of packed) {
    off = align(off);
    const bytes = tapeBytes(t.n);
    new Uint8Array(arena, off, bytes).set(new Uint8Array(t.exitT.buffer, t.exitT.byteOffset, bytes));
    Object.assign(t, tapeViews(arena, off, t.n));
    off += bytes;
  }
  return { arena, others: [...others] };
}

const TAPE_COLUMNS = [
  "exitT",
  "entryT",
  "r",
  "entry",
  "exit",
  "symI",
  "side",
  "reason",
  "bars",
  "vol",
  "level",
  "gp",
  "gl",
  "rs",
  "r2",
] as const;

/**
 * All tapes in ONE shared buffer plus one metadata string (symbol lists stored once): posting this to a worker
 * clones a buffer handle and a string, not tens of thousands of objects (that clone stalled the event loop for
 * seconds per worker at 40+ symbols).
 */
export interface PackedTapes {
  sab: SharedArrayBuffer;
  meta: string;
}
export function packTapes(tapes: readonly ConfigTape[]): PackedTapes {
  const g = packTapesGen(tapes);
  for (let r = g.next(); ; r = g.next()) if (r.done) return r.value;
}

/**
 * The tapes compacted into one shared buffer on this thread, in slices: the columns copied, everything else (id,
 * protect, open, pending, the symbol list) kept by reference. packTapes + unpackTapes did the same through a JSON
 * round trip of the metadata — every open position stringified and parsed back (x02, 7 Oct: ~90k positions, a
 * 484 ms final slice, a synchronous parse and its garbage at the start of every compute).
 */
export function* compactTapesGen(tapes: readonly ConfigTape[]): Generator<number, ConfigTape[]> {
  const align = (x: number) => Math.ceil(x / 8) * 8;
  let total = 0;
  for (const t of tapes) total = align(total) + tapeBytes(t.n);
  const sab = new SharedArrayBuffer(Math.max(8, align(total)));
  const out: ConfigTape[] = [];
  let off = 0;
  let k = 0;
  let t0 = performance.now();
  for (const t of tapes) {
    if (++k % 64 === 0 && performance.now() - t0 > 8) {
      yield k;
      t0 = performance.now();
    }
    off = align(off);
    if (!inTapeLayout(t)) throw new Error("tape not in the packed layout");
    const bytes = tapeBytes(t.n);
    const srcU = new Uint8Array(t.exitT.buffer, t.exitT.byteOffset, bytes);
    const CHUNK = 32 * 1024 * 1024;
    for (let i = 0; i < bytes; i += CHUNK) {
      const n = Math.min(CHUNK, bytes - i);
      new Uint8Array(sab, off + i, n).set(srcU.subarray(i, i + n));
    }
    const c: ConfigTape = {
      id: t.id,
      bot: t.bot,
      ind: t.ind,
      protect: t.protect,
      kind: t.kind,
      n: t.n,
      syms: t.syms,
      ...tapeViews(sab, off, t.n),
      open: t.open,
      pending: t.pending,
    };
    if (t.fromT !== undefined) c.fromT = t.fromT;
    if (t.heldOnly) c.heldOnly = true;
    out.push(c);
    off += bytes;
  }
  return out;
}

/** packTapes in slices (tens of thousands of tapes took seconds in one piece). */
export function* packTapesGen(tapes: readonly ConfigTape[]): Generator<number, PackedTapes> {
  const align = (x: number) => Math.ceil(x / 8) * 8;
  let total = 0;
  for (const t of tapes) total = align(total) + tapeBytes(t.n);
  const sab = new SharedArrayBuffer(Math.max(8, align(total)));
  const symTables: Array<readonly string[]> = [];
  const symIdx = new Map<readonly string[], number>();
  const rows: unknown[] = [];
  // metadata serialised per slice (one JSON.stringify over every row blocked too)
  const chunks: string[] = [];
  let off = 0;
  let k = 0;
  for (const t of tapes) {
    if (++k % 1000 === 0) {
      chunks.push(JSON.stringify(rows).slice(1, -1));
      rows.length = 0;
      yield k;
    }
    off = align(off);
    const src = t.exitT.buffer;
    // a makeTape tape (own buffer) or a packArena tape (a region of its reply's arena): the tapeViews layout from
    // its exitT column
    if (!inTapeLayout(t)) throw new Error("tape not in the packed layout");
    // a single Uint8Array over the whole pack throws once the book is past ~2GB
    const bytes = tapeBytes(t.n);
    const srcU = new Uint8Array(src, t.exitT.byteOffset, bytes);
    const CHUNK = 32 * 1024 * 1024;
    for (let i = 0; i < bytes; i += CHUNK) {
      const n = Math.min(CHUNK, bytes - i);
      new Uint8Array(sab, off + i, n).set(srcU.subarray(i, i + n));
    }
    let si = symIdx.get(t.syms);
    if (si === undefined) {
      si = symTables.length;
      symTables.push(t.syms);
      symIdx.set(t.syms, si);
    }
    rows.push([
      t.id,
      t.bot,
      t.ind,
      t.protect,
      t.kind,
      t.n,
      si,
      off,
      t.open,
      t.pending,
      t.fromT ?? null,
      t.heldOnly ? 1 : 0,
    ]);
    off += tapeBytes(t.n);
  }
  if (rows.length) chunks.push(JSON.stringify(rows).slice(1, -1));
  return {
    sab,
    meta: `{"syms":${JSON.stringify(symTables)},"rows":[${chunks.filter((c) => c).join(",")}]}`,
  };
}
export function unpackTapes(p: PackedTapes): ConfigTape[] {
  const { syms, rows } = JSON.parse(p.meta) as { syms: string[][]; rows: unknown[][] };
  return rows.map((x) => {
    const [id, bot, ind, protect, kind, n, si, off, open, pending, fromT, heldOnly] = x as [
      string,
      BotType,
      string,
      Protect,
      StratKind,
      number,
      number,
      number,
      OpenPosition[],
      ConfigTape["pending"],
      number | null,
      number | undefined,
    ];
    const t: ConfigTape = {
      id,
      bot,
      ind,
      protect,
      kind,
      n,
      syms: syms[si],
      ...tapeViews(p.sab, off, n),
      open,
      pending,
    };
    if (fromT !== null) t.fromT = fromT;
    if (heldOnly) t.heldOnly = true;
    return t;
  });
}

export function makeTape(
  id: string,
  bot: BotType,
  ind: string,
  protect: Protect,
  kind: StratKind,
  syms: readonly string[],
  trades: Trade[],
  open: OpenPosition[],
  pending: ConfigTape["pending"],
): ConfigTape {
  trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  const n = trades.length;
  const symIdx = new Map(syms.map((s, i) => [s, i]));
  const buf = new ArrayBuffer(tapeBytes(n));
  const { exitT, entryT, r, gp, gl, rs, r2, entry, exit, vol, symI, bars, side, reason, level } =
    tapeViews(buf, 0, n);
  const tp: ConfigTape = {
    id,
    bot,
    ind,
    protect,
    kind,
    n,
    syms,
    exitT,
    entryT,
    r,
    entry,
    exit,
    symI,
    side,
    reason,
    bars,
    vol,
    level,
    gp,
    gl,
    rs,
    r2,
    open,
    pending,
  };
  for (let i = 0; i < n; i++) {
    const t = trades[i];
    tp.exitT[i] = t.exitT;
    tp.entryT[i] = t.entryT;
    tp.r[i] = t.r;
    tp.entry[i] = t.entry;
    tp.exit[i] = t.exit;
    tp.symI[i] = symIdx.get(t.sym) ?? 0;
    tp.side[i] = t.side;
    tp.reason[i] = Math.max(0, REASONS.indexOf(t.reason));
    tp.bars[i] = Math.min(65535, t.bars);
    tp.vol[i] = t.vol ?? 1;
    tp.level[i] = Math.min(255, t.level ?? 0);
    const r = t.r;
    tp.gp[i + 1] = tp.gp[i] + (r > 0 ? r : 0);
    tp.gl[i + 1] = tp.gl[i] + (r < 0 ? -r : 0);
    tp.rs[i + 1] = tp.rs[i] + r;
    tp.r2[i + 1] = tp.r2[i] + r * r;
  }
  return tp;
}

/** Materialise one trade of a compact tape. */
export function tradeAt(tp: ConfigTape, i: number): Trade {
  return {
    cfg: tp.id,
    sym: tp.syms[tp.symI[i]],
    side: tp.side[i] as 1 | -1,
    entryT: tp.entryT[i],
    exitT: tp.exitT[i],
    entry: tp.entry[i],
    exit: tp.exit[i],
    r: tp.r[i],
    reason: REASONS[tp.reason[i]],
    bars: tp.bars[i],
    mfe: 0,
    mae: 0,
    kind: tp.kind,
    vol: tp.vol[i],
    level: tp.level[i],
  };
}

/**
 * An order's identity apart from the indication that produced it: symbol, side, entry, exit, result, strategy type
 * and the protect part of the config id. Two configs of the same class (signal or engine) with the same key are the
 * same order. The class is part of the key (8 Oct): an engine order never makes a signal order a duplicate.
 */
export function dupKey(tr: Pick<Trade, "cfg" | "sym" | "side" | "entryT" | "exitT" | "r" | "kind">): string {
  const parts = tr.cfg.split("|");
  const cls = sigCfg(tr.cfg) ? "sig" : "eng";
  return `${cls}|${parts[0]}|${parts.slice(2).join("|")}|${tr.sym}|${tr.side}|${tr.entryT}|${tr.exitT}|${tr.r}|${tr.kind ?? ""}`;
}

/**
 * A paper position's volume: its execution multiple (Block × relation volume) × its ladder weight (an Axis ladder
 * with two filled rungs is 2 units, as the simulation books it). Paper marks it as mtm (per unit) × volume × unit,
 * and the live lane asks for this volume.
 */
export const positionVolume = (mult: number, op: { w?: number }): number => mult * (op.w ?? 1);

/**
 * The execution multiple of a paper position (its volume without the ladder weight): what a tape order's r — which
 * already carries the ladder (Σ legs) — is scaled by when the position closes, and what a held position keeps.
 */
export const positionMult = (p: { vol?: number; w?: number }): number => (p.vol ?? 1) / (p.w ?? 1);

/**
 * A tape's pending entries (a signal on its lane's last closed bar) as the positions the simulation opens at the next
 * open — the realtime entry step takes them at the open of the lane bar that just started (`barEnd`), at the current
 * price, with the stop and target the simulation sets from the entry (the ATR-resolved protect when it has one).
 * Plain configs only (Normal / Trailing: a ladder's entry is its own), and only when the lane bar closed at `barEnd`.
 */
export function pendingAsOpen(
  tp: Pick<ConfigTape, "id" | "ind" | "kind" | "protect" | "pending">,
  barEnd: number,
  baseTfMin: number,
  priceOf: (sym: string) => number | undefined,
  cost: number,
): OpenPosition[] {
  if (tp.kind !== "normal" && tp.kind !== "trailing") return [];
  const laneMs = (laneOf(tp.ind).tf ?? baseTfMin) * 60_000;
  if (!tp.pending.length || barEnd % laneMs !== 0) return [];
  const out: OpenPosition[] = [];
  for (const pe of tp.pending) {
    const px = priceOf(pe.sym);
    if (!(px && px > 0)) continue;
    const q = pe.protect ?? tp.protect;
    const side = pe.side;
    out.push({
      cfg: tp.id,
      sym: pe.sym,
      side,
      entryT: barEnd,
      entryI: 0,
      entry: px,
      stop: side === 1 ? px * (1 - q.sl) : px * (1 + q.sl),
      target: side === 1 ? px * (1 + q.tp) : px * (1 - q.tp),
      peak: px,
      trailOn: false,
      mtm: -cost,
      ...(q.trail > 0 ? { trail: q.trail, trailDist: q.trail * (q.trailStep ?? 1) } : {}),
    });
  }
  return out;
}

/**
 * Whether the paper book may take a tape's open position that it does not hold yet: only one entered inside the
 * current walk-forward step or the one before it (the paper step runs after each compute, so an entry just before
 * the hour boundary is seen a little after it). The simulation takes a config's entries only inside the step that
 * selected it; a position the tape opened hours earlier — before the config was selected — was never part of the
 * simulated result, and on the exchange it would open at today's price with a stop measured from it.
 */
export function freshEntry(entryT: number, t: number, stepH: number): boolean {
  return entryT >= t - Math.max(1, stepH) * H;
}

/**
 * A tape's position still open at its end as an order closing at `endT` at its mark: r = mtm × ladder weight incl.
 * cost (as a closed order's r carries every leg), vol = the ladder weight.
 */
export function markedOpenTrade(tp: ConfigTape, op: OpenPosition, endT: number): Trade {
  const w = op.w ?? 1;
  return {
    cfg: tp.id,
    sym: op.sym,
    side: op.side,
    entryT: op.entryT,
    exitT: endT,
    entry: op.entry,
    exit: op.entry * (1 + op.side * op.mtm),
    r: op.mtm * w,
    reason: "time",
    bars: 0,
    mfe: 0,
    mae: 0,
    kind: tp.kind,
    vol: w,
    level: 0,
    markedOpen: true,
  };
}

export function tapeTrades(tp: ConfigTape, from = 0, to = tp.n): Trade[] {
  const out: Trade[] = [];
  for (let i = from; i < to; i++) out.push(tradeAt(tp, i));
  return out;
}

/** O(1) window numbers from prefix sums (net in percent). */
function win(tp: ConfigTape, a: number, b: number) {
  const gp = tp.gp[b] - tp.gp[a];
  const gl = tp.gl[b] - tp.gl[a];
  return { n: b - a, net: (tp.rs[b] - tp.rs[a]) * 100, pf: profitFactor(gp, gl), gp, gl };
}

/** gates.lossPrior: one virtual stop-out at the config's own stop (r units), added to every evaluation PF's losses */
export const lossPriorOf = (tp: Pick<ConfigTape, "protect">, gates: { lossPrior?: boolean }): number =>
  gates.lossPrior ? Math.max(0, tp.protect.sl) : 0;

/** whether the range gate judges a range: its own list, else GATED_RANGES */
const rangeGateOn = (g: { ranges?: readonly string[] }, tag: string | undefined | null) =>
  g.ranges ? !!tag && g.ranges.includes(tag) : rangeGated(tag);

/** Longest time under the running peak inside [a, b), counting an open dip up to nowT (hours). */
/** Drawdown of a tape's closes [a, b): longest time under a prior peak (hours, open until nowT) and the max depth. */
export function winDd(tp: ConfigTape, a: number, b: number, nowT: number): { ddtH: number; mdd: number } {
  if (b <= a) return { ddtH: 0, mdd: 0 };
  let cum = 0;
  let peak = 0;
  let peakT = tp.entryT[a];
  let dipped = false;
  let ddt = 0;
  let mdd = 0;
  for (let i = a; i < b; i++) {
    cum += tp.r[i];
    if (cum < peak) {
      dipped = true;
      if (peak - cum > mdd) mdd = peak - cum;
    } else {
      if (dipped && tp.exitT[i] - peakT > ddt) ddt = tp.exitT[i] - peakT;
      dipped = false;
      peak = cum;
      peakT = tp.exitT[i];
    }
  }
  if (dipped && nowT - peakT > ddt) ddt = nowT - peakT;
  return { ddtH: ddt / H, mdd };
}
const winDdt = (tp: ConfigTape, a: number, b: number, nowT: number) => winDd(tp, a, b, nowT).ddtH;

/** winDd over the closes at `idx` (ascending exit order): one direction's last closes, which interleave the other's. */
export function winDdIdx(
  tp: Pick<ConfigTape, "entryT" | "exitT" | "r">,
  idx: readonly number[],
  nowT: number,
): { ddtH: number; mdd: number } {
  if (!idx.length) return { ddtH: 0, mdd: 0 };
  let cum = 0;
  let peak = 0;
  let peakT = tp.entryT[idx[0]];
  let dipped = false;
  let ddt = 0;
  let mdd = 0;
  for (const i of idx) {
    cum += tp.r[i];
    if (cum < peak) {
      dipped = true;
      if (peak - cum > mdd) mdd = peak - cum;
    } else {
      if (dipped && tp.exitT[i] - peakT > ddt) ddt = tp.exitT[i] - peakT;
      dipped = false;
      peak = cum;
      peakT = tp.exitT[i];
    }
  }
  if (dipped && nowT - peakT > ddt) ddt = nowT - peakT;
  return { ddtH: ddt / H, mdd };
}

/** Max drawdown ratio gate: drawdown ÷ net result above the limit (or nothing earned) fails; off at 0. Both in
 *  the same unit (the window net of win() is in %: pass the drawdown × 100). */
export function ddrFails(mdd: number, net: number, maxDdr: number | undefined): boolean {
  if (!(maxDdr && maxDdr > 0)) return false;
  return !(net > 0) || mdd / net > maxDdr;
}

/**
 * Entry filters of the signal tapes (causal: bar i only looks at bars up to i): `trendH` keeps a signal only in
 * the direction of the EMA over that many hours (long above, short below); `volFloor` drops signals while
 * ATR(14) ÷ close is below it (the expected move must be worth the round-trip cost).
 */
export interface EntryFilter {
  trendH: number;
  volFloor: number;
}
export type EntryFloors = {
  minSl: number;
  minTrail: number;
  entry?: EntryFilter | null;
  /** range cells fitted to each indication's horizon (rangeFit); unset = every range cell on every indication */
  rangeFit?: RangeFit | null;
  /** range tapes with fewer closes can never take a seat and are not kept (3, or the range gate's last N) */
  rangeMinN?: number;
  /** shortest lane (minutes) per range tag: a range cell is not computed on a faster lane (rangeMinTfOf) */
  rangeMinTf?: Partial<Record<string, number>>;
  /**
   * per pair ("bot|ind"), the ranges it passed in Base ("" = the wide grid): only their cells are computed. A pair
   * not listed (held for an open position) computes every cell.
   */
  pairTags?: Record<string, readonly string[]>;
  /**
   * per pair, the range targets Base validated (`ComboRun.rangeTps`): only their cells are built, so a pair never
   * trades a target Base never saw. Base tries each target at a spread of stops, so the selection is best-of-4 per
   * target instead of best-of-28 per range — unlocking every target of a range made ~95 % of the built Micro cells
   * configs the Real net gate then threw away. A pair or range absent from the map keeps every target.
   */
  pairTps?: Record<string, Record<string, readonly number[]>>;
  /**
   * config ids held by the paper book (selected or holding a position): each keeps its own tape even when its range
   * is not in its pair's Base tags — without its tape an open position vanished from the book with no close. Only
   * that config, not every cell of its range (a held General position used to unlock all General cells of the pair,
   * and the pair could take new General seats it had not passed Base in).
   */
  heldIds?: ReadonlySet<string>;
  /** Micro cells only on Micro indications ("mc-…") and Micro indications only on Micro cells (grid.micro.ownInds) */
  microOwnInds?: MicroIndRule;
  /**
   * filled by the builder when given: per indication × range × type, the grid's cells and what became of each
   * (built, kept, dropped for too few closes, or not built and why) — the completeness record of every config set
   */
  buildStats?: Map<string, TapeBuildStat>;
  /**
   * The realtime entry step: only these config ids are built (the seated ones, on a short tail of fresh bars) —
   * every other cell of the given pairs is skipped before it is simulated, and none is counted in buildStats.
   */
  onlyIds?: ReadonlySet<string>;
};

/**
 * The floors one worker part needs: the per-pair maps and the held ids of its own pairs only (a pair keeps whether it
 * is listed, so the build is the same), and no build record (the worker fills its own). Every tape message carried
 * every pair's entries and every held id — cloned on the main thread for each of hundreds of parts (x02, 8 Oct:
 * structuredClone + postMessage ~9 s of 300 s).
 */
export function floorsForPairs(floors: EntryFloors, pairs: readonly string[]): EntryFloors {
  const out: EntryFloors = { ...floors };
  delete out.buildStats;
  if (floors.pairTags) {
    const m: Record<string, readonly string[]> = {};
    for (const p of pairs) if (p in floors.pairTags) m[p] = floors.pairTags[p];
    out.pairTags = m;
  }
  if (floors.pairTps) {
    const m: Record<string, Record<string, readonly number[]>> = {};
    for (const p of pairs) if (p in floors.pairTps) m[p] = floors.pairTps[p];
    out.pairTps = m;
  }
  if (floors.heldIds) {
    const want = new Set(pairs);
    const s = new Set<string>();
    for (const id of floors.heldIds) {
      // a config id starts with its pair: "bot|ind|…"
      const i = id.indexOf("|");
      const j = i < 0 ? -1 : id.indexOf("|", i + 1);
      if (j > 0 && want.has(id.slice(0, j))) s.add(id);
    }
    out.heldIds = s;
  }
  return out;
}

/** Adds build records (one worker part's) into `into`: counts summed, the distinct levels united. */
export function mergeBuildStats(into: Map<string, TapeBuildStat>, xs: readonly TapeBuildStat[]) {
  for (const x of xs) {
    const k = `${x.ind}|${x.tag}|${x.kind}`;
    const y = into.get(k);
    if (!y) {
      into.set(k, { ...x, skip: { ...x.skip }, tps: [...x.tps], sls: [...x.sls], trails: [...x.trails] });
      continue;
    }
    y.grid += x.grid;
    y.built += x.built;
    y.kept += x.kept;
    y.few += x.few;
    for (const [w, n] of Object.entries(x.skip)) y.skip[w] = (y.skip[w] ?? 0) + n;
    for (const v of x.tps) if (!y.tps.includes(v)) y.tps.push(v);
    for (const v of x.sls) if (!y.sls.includes(v)) y.sls.push(v);
    for (const v of x.trails) if (!y.trails.includes(v)) y.trails.push(v);
  }
}

/** What the tape builder did with one indication × range × type's grid cells (EntryFloors.buildStats). */
export interface TapeBuildStat {
  ind: string;
  /** range tag ("" = Wide) */
  tag: string;
  kind: string;
  /** the grid's cells for it (every target × stop × trail × hold) */
  grid: number;
  /** simulated */
  built: number;
  /** kept as a tape that can take a seat */
  kept: number;
  /** simulated, then dropped: fewer closes than the range gate needs (it could never seat) */
  few: number;
  /** not built, by reason: Base tags, Base targets, Micro own indications, lane floor, horizon fit */
  skip: Record<string, number>;
  /** distinct targets / stops / trails among the kept tapes */
  tps: number[];
  sls: number[];
  trails: number[];
}

/**
 * Range cells (micro / minimal / short / plus) are fitted to the indication that trades them: an indication over
 * `p` bars of a `tf`-minute lane moves about σ₁ₘ · √(p · tf) (σ₁ₘ = median 1-minute volatility of the universe).
 * A cell is computed when its target is within [lo, hi] × that move; at least `keep` targets per range stay (the
 * nearest ones), so every indication keeps range coverage. Example: a 1m RSI-14 (≈ 0.7 %) keeps micro / minimal
 * targets, a 30m Supertrend-10 (≈ 3.5 %) keeps the short targets.
 */
export interface RangeFit {
  lo: number;
  hi: number;
  keep: number;
}
export const DEFAULT_RANGE_FIT: RangeFit = { lo: 0.2, hi: 2.5, keep: 2 };

/** Lookback in bars of an indication (its main period parameter; 14 when none). */
export function indHorizonBars(ind: string): number {
  const spec = INDICATION_BY_ID.get(laneOf(ind).base);
  const p = spec?.params ?? {};
  for (const k of ["p", "slow", "s", "look", "n", "w", "bars", "rsi", "bb", "cci", "atr", "c", "b"]) {
    const v = p[k];
    if (Number.isFinite(v) && v >= 2) return Math.min(200, v);
  }
  return 14;
}

/** Median per-minute volatility (std of log returns / √tf) over the universe's series. */
export function universeSigma1m(bars: readonly Bars[]): number {
  const xs: number[] = [];
  for (const b of bars) {
    const n = b.n ?? b.c.length;
    if (n < 30) continue;
    let s = 0;
    let s2 = 0;
    let k = 0;
    for (let i = Math.max(1, n - 2000); i < n; i++) {
      const a = b.c[i - 1];
      const c = b.c[i];
      if (!(a > 0 && c > 0)) continue;
      const r = Math.log(c / a);
      s += r;
      s2 += r * r;
      k++;
    }
    if (k < 20) continue;
    const sd = Math.sqrt(Math.max(0, s2 / k - (s / k) ** 2));
    xs.push(sd / Math.sqrt(Math.max(1, b.tfMin)));
  }
  if (!xs.length) return 0.002;
  xs.sort((a, b) => a - b);
  return xs[xs.length >> 1];
}

/**
 * Targets of each range kept for one indication (keys `${tag}|${tp}`); null = keep everything.
 * Wide-grid cells are never filtered.
 */
export function fittedRangeTps(
  ind: string,
  laneTf: number,
  protects: readonly Protect[],
  sigma1m: number,
  fit: RangeFit | null | undefined,
): Set<string> | null {
  if (!fit || !(sigma1m > 0)) return null;
  const move = sigma1m * Math.sqrt(indHorizonBars(ind) * Math.max(1, laneTf));
  const byTag = new Map<string, Set<number>>();
  // only the gated ranges are fitted (micro / minimal / short / plus); General and Long keep every target, as they
  // are judged like the wide ones (GATED_RANGES)
  for (const p of protects)
    if (p.tag && rangeGated(p.tag)) (byTag.get(p.tag) ?? byTag.set(p.tag, new Set()).get(p.tag)!).add(p.tp);
  const keep = new Set<string>();
  for (const [tag, tps] of byTag) {
    const xs = [...tps];
    const inside = xs.filter((tp) => tp >= fit.lo * move && tp <= fit.hi * move);
    // coverage: the targets nearest to the band (log distance) when fewer than `keep` are inside
    const dist = (tp: number) =>
      tp < fit.lo * move ? Math.log((fit.lo * move) / tp) : tp > fit.hi * move ? Math.log(tp / (fit.hi * move)) : 0;
    const picked =
      inside.length >= fit.keep ? inside : xs.sort((a, b) => dist(a) - dist(b)).slice(0, Math.max(fit.keep, inside.length));
    for (const tp of picked) keep.add(`${tag}|${tp}`);
  }
  // the ungated ranges (General, Long) keep every target: the cell filter rejects a tagged cell missing from this set
  for (const p of protects) if (p.tag && !rangeGated(p.tag)) keep.add(`${p.tag}|${p.tp}`);
  return keep;
}

export function filterEntries(sig: Int8Array, b: Bars, k: SeriesCache, f: EntryFilter): Int8Array {
  const out = Int8Array.from(sig);
  const e = f.trendH > 0 ? k.ema(Math.max(2, Math.round((f.trendH * 60) / (b.tfMin || 1)))) : null;
  const a = f.volFloor > 0 ? k.atr(14) : null;
  for (let i = 0; i < out.length; i++) {
    if (out[i] === 0) continue;
    if (e && !(out[i] > 0 ? b.c[i] > e[i] : b.c[i] < e[i])) out[i] = 0;
    else if (a && !(a[i] / b.c[i] >= f.volFloor)) out[i] = 0;
  }
  return out;
}

/** Base: causal tapes for every combo × protect × sub-strategy. Generator so callers can time-slice. */
export function* buildTapesGen(
  u: Universe,
  protects: readonly Protect[],
  cost: number,
  dcaOpt?: { protects: readonly Protect[]; dca: DcaConfig; axis?: AxisConfig; noDca?: boolean },
  /** Main candidates as "bot|ind"; undefined = every combo */
  only?: ReadonlySet<string>,
  /** engine-wide entry tactics (session, volatility, trend strength, cooldown) */
  tactics?: Tactics | null,
  /** live-feedback adjustments per set (wider min SL / trailing distance) */
  adjust?: AdjustState | null,
  /** hard floors of every config's stop and trailing distance, after lane scaling (fractions of price) */
  floors?: EntryFloors | null,
): Generator<{ done: number; total: number }, ConfigTape[]> {
  // a range cell keeps its own minimum stop / trail (set when the grid was built), not the wide-grid floor
  const adj = (bot: string, ind: string, kind: StratKind, p: Protect) =>
    adjustProtect(p.tag ? p : adjustProtect(p, floors), adjust?.[`${bot}|${ind}|${kind}`]);
  const cooldown = tacticCooldown(tactics);
  // Main candidates are "bot|ind" pairs (lane indications included); without them every plain combo
  const combos = only
    ? [...only].map((k) => {
        const [bot, ind] = k.split("|");
        return { bot: bot as BotType, ind };
      })
    : allCombos();
  const syms = u.bars.map((b) => b.sym);
  const out: ConfigTape[] = [];
  // range cells fitted to each indication's horizon, and range tapes that could never seat dropped
  const sigma1m = floors?.rangeFit ? universeSigma1m(u.bars) : 0;
  const rangeMinN = Math.max(0, floors?.rangeMinN ?? 0);
  const bs = floors?.buildStats;
  const onlyIds = floors?.onlyIds;
  const notOnly = (id: string) => !!onlyIds && !onlyIds.has(id);
  const statOf = (ind: string, tag: string | undefined, kind: string) => {
    const k = `${ind}|${tag ?? ""}|${kind}`;
    let x = bs!.get(k);
    if (!x)
      bs!.set(k, (x = { ind, tag: tag ?? "", kind, grid: 0, built: 0, kept: 0, few: 0, skip: {}, tps: [], sls: [], trails: [] }));
    return x;
  };
  const statKept = (x: TapeBuildStat, p: Protect) => {
    x.kept++;
    if (!x.tps.includes(p.tp)) x.tps.push(p.tp);
    if (!x.sls.includes(p.sl)) x.sls.push(p.sl);
    if (!x.trails.includes(p.trail)) x.trails.push(p.trail);
  };
  const axisN = dcaOpt?.axis ? axisVariants(dcaOpt.axis, dcaOpt.protects).length : 0;
  const per =
    protects.length + (dcaOpt ? (dcaOpt.noDca ? 0 : dcaOpt.protects.length * 2) + axisN : 0);
  const total = combos.length * per;
  let done = 0;
  for (const c of combos) {
    // a lane indication runs only on its timeframe's series
    const series = seriesOf(u, c.ind);
    let fromT = Infinity;
    for (const s of series) fromT = Math.min(fromT, (u.bars[s].t[0] ?? Infinity) + 24 * H);
    const atFrom = (t: ConfigTape) => {
      if (Number.isFinite(fromT)) t.fromT = fromT;
      return t;
    };
    const sigs: Array<Int8Array | null> = new Array(u.bars.length).fill(null);
    for (const s of series) {
      sigs[s] = entrySignal(c.bot, c.ind, u.caches[s], tactics);
      if (floors?.entry && sigs[s] && isSignalInd(c.ind))
        sigs[s] = filterEntries(sigs[s]!, u.bars[s], u.caches[s], floors.entry);
      // signal series for one symbol can be heavy on first use; let the caller yield per symbol
      yield { done, total };
    }
    if (!series.length || series.some((s) => sigs[s] === null)) {
      done += per;
      continue;
    }
    // long and short run independently: each direction on its own side-filtered signal (its own position slot), so
    // an open long never drops a short signal (and vice versa); a one-sided signal runs once, as before
    const sides: Array<Int8Array[] | null> = sigs.map((x) => (x ? splitSides(x) : null));
    // short-lane floors can map two grid configs onto one: each config id is built once
    const built = new Set<string>();
    const fitted = fittedRangeTps(
      c.ind,
      laneOf(c.ind).tf ?? u.bars[series[0]]?.tfMin ?? 1,
      protects,
      sigma1m,
      floors?.rangeFit,
    );
    const laneTf = laneOf(c.ind).tf ?? u.bars[series[0]]?.tfMin ?? 1;
    const tagsOk = floors?.pairTags?.[`${c.bot}|${c.ind}`];
    const microInd = isMicroInd(laneOf(c.ind).base);
    for (const p0 of protects) {
      const kind: StratKind = p0.trail > 0 ? "trailing" : "normal";
      const p = adj(c.bot, c.ind, kind, laneProtect(p0, c.ind));
      const id = configId(c.bot, c.ind, p);
      if (notOnly(id)) {
        done++;
        continue;
      }
      // a held config keeps its tape whatever the filters say (its open position needs it) — but only for that:
      // failing a filter it is built held-only and takes no new seat
      const held = floors?.heldIds?.has(id) ?? false;
      const tps = p0.tag ? floors?.pairTps?.[`${c.bot}|${c.ind}`]?.[p0.tag] : undefined;
      const why = !microIndFits(floors?.microOwnInds, p0.tag, microInd)
        ? "microOwnInds"
        : !!tagsOk && !tagsOk.includes(p0.tag ?? "")
          ? "baseRange"
          : // only the targets of this range that passed Base
            !!tps && !tps.includes(p0.tp)
            ? "baseTarget"
            : !!p0.tag && !!fitted && !fitted.has(`${p0.tag}|${p0.tp}`)
              ? "rangeFit"
              : // (an untagged Wide cell reads the "wide" entry: grid.wideMinTf)
                laneTf < (floors?.rangeMinTf?.[p0.tag ?? "wide"] ?? 0)
                ? "laneFloor"
                : null;
      const filtered = why !== null;
      const st = bs && why !== "microOwnInds" && why !== "laneFloor" ? statOf(c.ind, p0.tag, kind) : null;
      if (st) st.grid++;
      if (filtered && !held) {
        if (st) st.skip[why!] = (st.skip[why!] ?? 0) + 1;
        done++;
        continue;
      }
      if (built.has(id)) {
        if (st) st.skip.duplicate = (st.skip.duplicate ?? 0) + 1;
        done++;
        continue;
      }
      built.add(id);
      // a filtered config built only to carry its open position (held-only, no seat) is counted under its filter
      // reason, not as a built set: the record keeps grid = built + not built and built = kept + too few closes
      if (st && filtered) st.skip[why!] = (st.skip[why!] ?? 0) + 1;
      else if (st) st.built++;
      const trades: Trade[] = [];
      const open: OpenPosition[] = [];
      const pending: ConfigTape["pending"] = [];
      for (const s of series)
        for (const sg of sides[s]!) {
          const res = simulate(id, u.bars[s], sg, p, {
            cost,
            cooldown,
            atr: p.atr ? u.caches[s].atrEma(ATR_PERIOD) : undefined,
          });
          for (const tr of res.trades) {
            tr.kind = kind;
            trades.push(tr);
          }
          if (res.open) open.push(res.open);
          if (res.pending)
            pending.push(
              res.pendingProtect
                ? { sym: u.bars[s].sym, side: res.pending, protect: res.pendingProtect }
                : { sym: u.bars[s].sym, side: res.pending },
            );
        }
      // a range tape with fewer closes than its gate needs can never take a seat: not kept (memory) — unless it is
      // held: its open position needs the tape for its exit (dropped, the position was carried without one), so it
      // is kept held-only (no new seat)
      const enough = !rangeGated(p.tag) || trades.length >= rangeMinN;
      if (st && !filtered) {
        if (!enough) st.few++;
        else statKept(st, p);
      }
      if (enough || held) {
        const tp = atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, open, pending));
        if (filtered || !enough) tp.heldOnly = true;
        out.push(tp);
      }
      done++;
      yield { done, total };
    }
    // every validated indication builds every strategy set: a Micro indication trades the Micro cells of the base
    // grid and its DCA / DCA Active / Axis sets as every other pair does (each config judged on its own results)
    if (dcaOpt) {
      // Axis per range: the Wide ladders (DCA and Axis) only for a pair that passed Base for Wide — a pair that
      // passed only in a range gets that range's ladders instead of being judged as Wide
      const wideOk = !(dcaOpt.axis?.perRange && tagsOk && !tagsOk.includes(""));
      for (const p0 of dcaOpt.noDca || !wideOk ? [] : dcaOpt.protects) {
        for (const active of [false, true]) {
          const kind: StratKind = active ? "dca-active" : "dca";
          const p = adj(c.bot, c.ind, kind, laneProtect(p0, c.ind));
          const id = configId(c.bot, c.ind, p, kind);
          if (notOnly(id)) {
            done++;
            continue;
          }
          const st = bs ? statOf(c.ind, p0.tag, kind) : null;
          if (st) st.grid++;
          if (built.has(id)) {
            if (st) st.skip.duplicate = (st.skip.duplicate ?? 0) + 1;
            done++;
            continue;
          }
          built.add(id);
          if (st) {
            st.built++;
            statKept(st, p);
          }
          const trades: Trade[] = [];
          const open: OpenPosition[] = [];
          const pending: ConfigTape["pending"] = [];
          for (const s of series)
            for (const sg of sides[s]!) {
              const res = simulateDca(id, u.bars[s], sg, p, dcaOpt.dca, active, cost, cooldown);
              for (const tr of res.trades) trades.push(tr);
              // a ladder open at the last close is carried (marked open in the simulation, held in paper / live)
              if (res.open) open.push(res.open);
              if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
            }
          out.push(atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, open, pending)));
          done++;
          yield { done, total };
        }
      }
      if (dcaOpt.axis) {
        const variants = axisVariants(dcaOpt.axis, dcaOpt.protects);
        // desk stops / trails: the configured floors and the set's live-feedback floors (as adjustProtect)
        const af = adjust?.[`${c.bot}|${c.ind}|axis`];
        const deskFloor = {
          minSl: Math.max(EVAL_MIN_SL, floors?.minSl ?? 0, af?.minSl ?? 0),
          minTrail: Math.max(floors?.minTrail ?? 0, af?.minTrail ?? 0),
        };
        for (const { p0, ax, tag } of wideOk ? variants : []) {
          const p0l = laneProtect(p0, c.ind);
          const p = adj(c.bot, c.ind, "axis", p0l);
          // the id is the lane cell + variant, never the feedback-adjusted placeholder: Axis takes its stops from
          // the axis / ATR and deskFloor (which carries the feedback floors), so a raised placeholder stop changed
          // the id without changing the behaviour — and a held position lost its tape
          const id = configId(c.bot, c.ind, p0l, "axis").replace(/\|axis$/, `${tag}|axis`);
          if (notOnly(id)) {
            done++;
            continue;
          }
          const st = bs ? statOf(c.ind, p0.tag, "axis") : null;
          if (st) st.grid++;
          if (built.has(id)) {
            if (st) st.skip.duplicate = (st.skip.duplicate ?? 0) + 1;
            done++;
            continue;
          }
          built.add(id);
          if (st) {
            st.built++;
            statKept(st, p0l);
          }
          const trades: Trade[] = [];
          const open: OpenPosition[] = [];
          const pending: ConfigTape["pending"] = [];
          for (const s of series)
            for (const sg of sides[s]!) {
              const k = u.caches[s];
              const centerS = k.ema(
                Math.max(
                  2,
                  Math.round(ax.centerMin ? ax.centerMin / (u.bars[s].tfMin || 1) : ax.center),
                ),
              );
              if (ax.mode === "desk") {
                const res = simulateAxisDesk(
                  id,
                  u.bars[s],
                  sg,
                  p,
                  ax,
                  centerS,
                  k.atr(14),
                  cost,
                  cooldown,
                  deskFloor,
                );
                for (const tr of res.trades) trades.push(tr);
                // open desk positions carry their average entry, stop and target (paper / live get a concrete stop)
                if (res.open) open.push(res.open);
                if (res.pending)
                  pending.push(
                    res.pendingProtect
                      ? { sym: u.bars[s].sym, side: res.pending, protect: res.pendingProtect }
                      : { sym: u.bars[s].sym, side: res.pending },
                  );
                continue;
              }
              const res = simulateAxis(
                id,
                u.bars[s],
                sg,
                p,
                ax,
                centerS,
                k.atr(14),
                cost,
                cooldown,
              );
              for (const tr of res.trades) trades.push(tr);
              // revert positions open at the last close as well (marked open at run end, held in paper, mirrored live)
              if (res.open) open.push(res.open);
              if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
            }
          out.push(atFrom(makeTape(id, c.bot, c.ind, p, "axis", syms, trades, open, pending)));
          done++;
          yield { done, total };
        }
        // Axis per range: desk ladders whose targets stay inside each passed range's target band
        if (dcaOpt.axis.perRange && tagsOk)
          for (const rv of axisRangeVariants(dcaOpt.axis, protects, tagsOk, floors?.pairTps?.[`${c.bot}|${c.ind}`])) {
            const p0l = laneProtect(rv.p0, c.ind);
            const id = configId(c.bot, c.ind, p0l, "axis").replace(/\|axis$/, `${rv.tag}|axis`);
            if (notOnly(id) || built.has(id)) continue;
            built.add(id);
            const rf = {
              minSl: Math.max(rv.minSl, deskFloor.minSl),
              minTrail: deskFloor.minTrail,
              maxSl: rv.maxSl,
            };
            const trades: Trade[] = [];
            const open: OpenPosition[] = [];
            const pending: ConfigTape["pending"] = [];
            for (const s of series)
              for (const sg of sides[s]!) {
                const k = u.caches[s];
                const centerS = k.ema(
                  Math.max(2, Math.round(rv.ax.centerMin ? rv.ax.centerMin / (u.bars[s].tfMin || 1) : rv.ax.center)),
                );
                const res = simulateAxisDesk(id, u.bars[s], sg, p0l, rv.ax, centerS, k.atr(14), cost, cooldown, rf);
                for (const tr of res.trades) trades.push(tr);
                if (res.open) open.push(res.open);
                if (res.pending)
                  pending.push(
                    res.pendingProtect
                      ? { sym: u.bars[s].sym, side: res.pending, protect: { ...res.pendingProtect, tag: rv.p0.tag } }
                      : { sym: u.bars[s].sym, side: res.pending },
                  );
              }
            out.push(atFrom(makeTape(id, c.bot, c.ind, p0l, "axis", syms, trades, open, pending)));
            yield { done, total };
          }
      }
    }
  }
  return out;
}

/**
 * Axis per range (AxisConfig.perRange): for each range tag a pair passed in Base (Wide "" excluded — it has its
 * own ladders), one desk ladder per rung-spacing type at the middle depth. The id carries the range's middle cell
 * (so the range tag, its minimum PF and range gate apply); the desk's stop is clamped to [lowest target, highest
 * target] ÷ tpRatio of the range (the targets Base passed for the pair when known) — so the ladder's target stays
 * inside the range's target band (unless the evaluation stop floor, applied by the caller, lifts it above).
 */
export function axisRangeVariants(
  ax0: AxisConfig,
  protects: readonly Protect[],
  tags: readonly string[],
  pairTps?: Partial<Record<string, readonly number[]>>,
): Array<{ p0: Protect; ax: AxisConfig; tag: string; minSl: number; maxSl: number }> {
  const ratio = snapTpRatio(ax0.tpRatio ?? 2.2);
  const ranges = ax0.ranges?.length ? [...new Set(ax0.ranges)] : [ax0.range ?? "atr"];
  const depths = (ax0.levelsSet?.length ? [...ax0.levelsSet] : [ax0.levels]).sort((a, b) => a - b);
  const levels = depths[Math.floor((depths.length - 1) / 2)];
  const hybrid = ax0.hybrids?.length ? !!ax0.hybrids[0] : !!ax0.hybrid;
  const out: Array<{ p0: Protect; ax: AxisConfig; tag: string; minSl: number; maxSl: number }> = [];
  for (const t of tags) {
    if (!t) continue;
    let cells = protects.filter((p) => p.tag === t && p.trail === 0);
    const ok = pairTps?.[t];
    if (ok?.length) {
      const kept = cells.filter((p) => ok.includes(p.tp));
      if (kept.length) cells = kept;
    }
    if (!cells.length) continue;
    const tps = [...new Set(cells.map((p) => p.tp))].sort((a, b) => a - b);
    const mid = tps[Math.floor((tps.length - 1) / 2)];
    const atMid = cells.filter((p) => p.tp === mid).sort((a, b) => a.sl - b.sl);
    const p0 = atMid[Math.floor((atMid.length - 1) / 2)];
    // (the range's own stop ratios are not the desk's geometry — its target is stop × tpRatio — so the band comes
    // from the targets alone; the evaluation floor is applied on top by the caller)
    const minSl = tps[0] / ratio;
    const maxSl = Math.max(minSl, tps[tps.length - 1] / ratio);
    for (const range of ranges)
      out.push({
        p0,
        ax: { ...ax0, mode: "desk", range, levels, hybrid },
        tag: `|axd-${range}${levels}${hybrid ? "h" : ""}`,
        minSl: +minSl.toFixed(6),
        maxSl: +maxSl.toFixed(6),
      });
  }
  return out;
}

export function buildTapes(
  u: Universe,
  protects: readonly Protect[],
  cost: number,
  dcaOpt?: { protects: readonly Protect[]; dca: DcaConfig; axis?: AxisConfig; noDca?: boolean },
  only?: ReadonlySet<string>,
  tactics?: Tactics | null,
  adjust?: AdjustState | null,
  floors?: EntryFloors | null,
): ConfigTape[] {
  const gen = buildTapesGen(u, protects, cost, dcaOpt, only, tactics, adjust, floors);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/** First index with exitT >= t. */
export function lowerBound(a: Float64Array, t: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] < t) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/**
 * Whether a sub-strategy may execute at all under the toggles (Block may still veto per trade).
 *   Normal off   the plain base (Normal and Trailing entries) is off: only Block-raised Normal / Trailing entries
 *                execute (with Block on); DCA, DCA Active and Axis keep processing on their own
 *   Trailing off no trailing anywhere (also not Block-raised)
 * Toggles never stop the processing itself: every tape is still built and evaluated (Base / Main, the Block
 * feed, the base PF DCA / Axis must beat) — they only decide what executes.
 */
export function kindExecutable(kind: StratKind, tg: StrategyToggles): boolean {
  switch (kind) {
    case "normal":
      return tg.normal || tg.block;
    case "trailing":
      return tg.trailing && (tg.normal || tg.block);
    case "dca":
      return tg.dca && !tg.dcaActive;
    case "dca-active":
      return tg.dca && tg.dcaActive;
    case "axis":
      return tg.axis !== false;
  }
}

/**
 * Every Axis set the settings ask for, each its own tape: every mode (`modes`, else `mode`) × range type × ladder
 * depth, desk sets also plain and hybrid (`hybrids`, else `hybrid`); revert with fixed exits: one set per protect.
 * Desk sets carry their own tag (…|axd-atr3[h]) so they never share an id with revert sets (…|ax-atr3).
 */
export function axisVariants<P>(ax0: AxisConfig, protects: readonly P[]): Array<{ p0: P; ax: AxisConfig; tag: string }> {
  const modes: AxisMode[] = ax0.modes?.length ? [...new Set(ax0.modes)] : [ax0.mode ?? "revert"];
  const ranges = ax0.ranges?.length ? ax0.ranges : [ax0.range ?? "atr"];
  const depths = ax0.levelsSet?.length ? ax0.levelsSet : [ax0.levels];
  const out: Array<{ p0: P; ax: AxisConfig; tag: string }> = [];
  for (const mode of modes) {
    const desk = mode === "desk";
    if (!desk && ax0.exits === "fixed") {
      for (const p0 of protects) out.push({ p0, ax: { ...ax0, mode }, tag: modes.length > 1 ? "|ax-fixed" : "" });
      continue;
    }
    const hybrids = desk ? (ax0.hybrids?.length ? [...new Set(ax0.hybrids)] : [!!ax0.hybrid]) : [false];
    for (const range of ranges)
      for (const levels of depths)
        for (const hybrid of hybrids)
          out.push({
            p0: protects[0],
            ax: { ...ax0, mode, range, levels, hybrid: desk ? hybrid : ax0.hybrid },
            tag: desk ? `|axd-${range}${levels}${hybrid ? "h" : ""}` : `|ax-${range}${levels}`,
          });
  }
  return out;
}

/**
 * Whether a config of this tape trades under the toggles: kindExecutable, except a signal's own base (signalOwnBase):
 * its Normal and its Trailing always trade, whatever the engine's Normal / Trailing / Block switches say (8 Oct; the signal
 * switch decides them).
 */
export function tapeExecutable(
  tp: Pick<ConfigTape, "kind" | "ind">,
  o: Pick<WalkForwardOptions, "toggles" | "signalOwnBase">,
): boolean {
  // a signal's own base (Normal and Trailing) is the signal switch, not the engine toggles (8 Oct): the engine's
  // Normal and Trailing switches never stop a signal order
  if (o.signalOwnBase && (tp.kind === "normal" || tp.kind === "trailing") && isSignalInd(tp.ind)) return true;
  return kindExecutable(tp.kind, o.toggles);
}

/** Block level from the config's own closes before `entryT`: independent last-n windows, n = 1..maxLevel. */
export function blockLevel(tp: ConfigTape, entryT: number, b: BlockConfig): number {
  const end = lowerBound(tp.exitT, entryT + 1);
  let level = 0;
  let sum = 0;
  for (let n = 1; n <= b.maxLevel && n <= end; n++) {
    sum += tp.r[end - n];
    if (sum > 0) level++;
  }
  return level;
}

export interface StepLog {
  t: number;
  main: number;
  real: string[];
  taken: number;
  skipped: number;
  net: number;
}

export interface WalkForwardResult {
  startT: number;
  endT: number;
  opts: Omit<WalkForwardOptions, "protects" | "dcaProtects">;
  trades: Trade[];
  /** orders executed in the run and still open at its end, marked to market (outside `trades`, inside `stats`) */
  openAtEnd?: Trade[];
  /** over the closed orders and the ones still open at the end marked to market (a run's PF no longer favours
   *  configs that close fast: a loser still open at the end counts) */
  stats: Stats;
  hourly: Array<{ t: number; net: number; n: number; pf: number }>;
  /** PF per consecutive 8h block: stability view */
  blocks: Array<{ t: number; n: number; pf: number; net: number }>;
  steps: StepLog[];
  byConfig: Array<{ id: string; n: number; net: number; pf: number }>;
  byKind: Record<string, { n: number; net: number; pf: number }>;
  /** the closed orders per direction (long and short run independently: each side's own record) */
  bySide?: { long: { n: number; net: number; pf: number }; short: { n: number; net: number; pf: number } };
  skips: Record<string, number>;
  /**
   * The same skips per range of the candidate ("mc" … "lg", "" = Wide, "sig" = signals): why a range's seated
   * configs did not execute (the global count could not tell Micro's skips from Minimal's)
   */
  skipsByRange?: Record<string, Record<string, number>>;
  /** the same refusals per strategy type (normal, trailing, dca, dca-active, axis): an empty family is read by its refusals */
  skipsByKind?: Record<string, Record<string, number>>;
  /** the candidates of each family that reached the decision (skipsByKind + executed) */
  candidatesByKind?: Record<string, number>;
  candidatesByRange?: Record<string, number>;
  /** the skips per direction: "why|1" (long) / "why|-1" (short) */
  skipsBySide?: Record<string, number>;
  stable: boolean;
  /**
   * Block feed: every Real-stage candidate position (taken or not) with its simulated unit result, by exit time.
   * The overall / symbol / direction / indication Block sources judge this, like the config level judges its tape.
   */
  feed: BlockFeedEntry[];
  /**
   * The signal confirmation pool: the engine candidates of the range-neutral selection (taken or not, never executed),
   * with their entry and exit. engineConfirmIndex builds the index that simulation, paper and live confirm on from these,
   * so no range setting changes what a signal confirms on.
   */
  confirmCands: ConfirmCand[];
  /** causal signal activation: the active set of every step, and the set at the end (paper / live use it) */
  signalSteps?: Array<{ t: number; keys: string[] }>;
  signalActiveEnd?: string[];
  /**
   * the signal candidates of the run before any gate: every config's entry in the run, and how many of them belonged to
   * a unit not active at their step (dropped before the gates — counted here, not as skips: they are every config of
   * every inactive unit and would swamp the skip table)
   */
  signalFunnel?: { candidates: number; inactive: number; inactiveBySide: { "1": number; "-1": number } };
  /** Stable-02 coordination state at the end of the run (paper / live: relation factor, held-back symbols) */
  s2?: { factor: number; paused: string[] };
  /** negative-hour hedge signals at the end of the run (paper / live) */
  hedgeEnd?: string[];
}

/**
 * An engine confirmation candidate: its configuration, symbol and direction, and its entry and exit. A candidate still
 * open at the run's end carries the run's end as its exit (marked to market there, as the simulation settles it); the
 * live path reads the live tapes of `cfg` after that end (runtime confirmPoolOf).
 */
export interface ConfirmCand {
  cfg: string;
  sym: string;
  side: number;
  entryT: number;
  exitT: number;
}

export interface BlockFeedEntry {
  exitT: number;
  sym: string;
  side: number;
  kind: string;
  r: number;
  /** lane indication of the candidate (signals guard) */
  ind?: string;
  /** sub-strategy of the candidate (normal / trailing / …) */
  type?: string;
  /** config id of the candidate (signals guard: each config judged on its own) */
  cfg?: string;
  /**
   * entry time of the candidate: the signal guard counts one signal entry once (its k configs share it), and paper's
   * confirmation reads which engine candidates were open at a signal's entry
   */
  entryT?: number;
  /** set when the candidate was executed raised: the Block sources that raised it (they pause on a positive close) */
  bsrc?: BlockSource[];
}

/**
 * A tape-set index cache keyed by the tapes' identity, not by the array's (10 Oct, performance). A copy of the same tape
 * objects (a slice or a filter per step) hits the index built for the set: the probe run built one 11,696-tape record
 * 34 times, once per copy, and the main thread held each build for seconds. Entries are keyed by the first tape and
 * compared element by element (microseconds against seconds to build), so a different set never hits.
 */
class IdentityIndexCache<T> {
  private byFirst = new WeakMap<object, Array<{ tapes: readonly ConfigTape[]; value: T }>>();
  get(tapes: readonly ConfigTape[]): T | undefined {
    const first = tapes[0];
    if (!first) return undefined;
    for (const e of this.byFirst.get(first) ?? []) {
      if (e.tapes.length !== tapes.length) continue;
      let same = true;
      for (let i = 0; i < tapes.length && same; i++) same = e.tapes[i] === tapes[i];
      if (same) return e.value;
    }
    return undefined;
  }
  set(tapes: readonly ConfigTape[], value: T): void {
    const first = tapes[0];
    if (!first) return;
    let list = this.byFirst.get(first);
    if (!list) this.byFirst.set(first, (list = []));
    list.push({ tapes: tapes.slice(), value });
  }
}

// one record per tape set and per acceptance split (signals.splitPool): the split groups are a different record
const acceptIndexCache = new IdentityIndexCache<SignalAcceptIndex>();
const acceptIndexSplitCache = new IdentityIndexCache<SignalAcceptIndex>();
/**
 * The signal acceptance record of a tape set (every signal tape's closes per acceptance group), built once per tape
 * list and in slices: the run, the live step and the audit judge acceptance on the same record.
 */
export function* signalAcceptIndexGen(tapes: readonly ConfigTape[], split = false): Generator<number, SignalAcceptIndex> {
  const cache = split ? acceptIndexSplitCache : acceptIndexCache;
  const hit = cache.get(tapes);
  if (hit) return hit;
  const x = new SignalAcceptIndex();
  for (const _ of x.fill(tapes, split)) yield -1;
  cache.set(tapes, x);
  return x;
}

// the engine-side record stays keyed by the array: a content match changed the 12 h + 12 h replay (10 Oct: 2,114 trades by
// identity, 1,955 by content; the cause is not isolated yet, so the identity behaviour is kept for this record)
const engineSideCache = new WeakMap<object, EngineSideIndex>();
/** The engine direction record of a tape set, built once per tape list and in slices (run, live step and audit alike). */
/**
 * The acceptance indices of a tape set carried to a subset of it (the runtime's slimmed tapes during a compute):
 * the record stays the simulation's — every candidate, not only the kept configs' — and nothing is rebuilt on the
 * main thread (rebuilt synchronously, it held the live tick for seconds: x02, 7 Oct, loop max 3.5 s).
 */
export function carryGuardIndices(from: readonly ConfigTape[], to: readonly ConfigTape[]): void {
  const a = acceptIndexCache.get(from);
  if (a) acceptIndexCache.set(to, a);
  const b = acceptIndexSplitCache.get(from);
  if (b) acceptIndexSplitCache.set(to, b);
  const e = engineSideCache.get(from);
  if (e) engineSideCache.set(to, e);
}

export function* engineSideIndexGen(tapes: readonly ConfigTape[]): Generator<number, EngineSideIndex> {
  const hit = engineSideCache.get(tapes);
  if (hit) return hit;
  const x = new EngineSideIndex();
  for (const _ of x.fill(tapes)) yield -1;
  engineSideCache.set(tapes, x);
  return x;
}

const drain = <T>(gen: Generator<number, T>): T => {
  for (let r = gen.next(); ; r = gen.next()) if (r.done) return r.value;
};

/** A signal guard whose acceptance groups judge on the tape set's record (acceptance on), else on the fed closes. */
export function signalGuardFor(
  tapes: readonly ConfigTape[],
  o: Pick<WalkForwardOptions, "signalAccept" | "signalSideAccept" | "signalDomination" | "engineSideAccept" | "signalSplitPool">,
): SignalGuard {
  const g = new SignalGuard();
  g.splitPool = !!o.signalSplitPool;
  if (o.signalAccept?.enabled || o.signalSideAccept?.enabled || o.signalDomination === "unit") g.acceptIndex = drain(signalAcceptIndexGen(tapes, g.splitPool));
  if (o.engineSideAccept?.enabled) g.engineSide = drain(engineSideIndexGen(tapes));
  return g;
}

/**
 * The Block book only where a decision reads it: Block on (its pooled sources, its pause) or the direction gate
 * (sideGateN). Otherwise null — feeding it cost seconds per run (every close re-scored each auto-window candidate)
 * and nothing read it (x02, 7 Oct profile: Block off, 5 s of the loop's stalls in the book).
 */
export function bookFor(o: { toggles: { block?: boolean }; sideGateN?: number; block: Parameters<typeof blockBookOf>[0] }): BlockBook | null {
  return o.toggles.block || (o.sideGateN ?? 0) > 0 ? blockBookOf(o.block) : null;
}

/**
 * Hours a run feeds its records before its start: the longest window a feed-fed signal rule reads — the direction
 * acceptance's window and its twice-the-hours fallback, the loss cluster — and never less than the 24 h pre-history.
 */
export function recordWarmH(o: Pick<WalkForwardOptions, "signalSideAccept" | "signalCluster" | "signalDomination">): number {
  return Math.max(
    24,
    o.signalSideAccept?.enabled ? 2 * (o.signalSideAccept.hours || 0) : 0,
    o.signalDomination === "unit" ? 2 * DOMINATION_HOURS : 0,
    o.signalCluster?.enabled ? (o.signalCluster.windowMin || 0) / 60 : 0,
  );
}

/** The first step of a run: its start less the record warm-up, on the run's own step grid (stepMs = one step). */
export function warmStartOf(
  startT: number,
  stepMs: number,
  o: Pick<WalkForwardOptions, "signalSideAccept" | "signalCluster" | "signalDomination">,
): number {
  return startT - Math.ceil((recordWarmH(o) * H) / stepMs) * stepMs;
}

/** Feed one closed candidate into the Block book and, for a signal, into the signal guard. */
export function feedBooks(e: BlockFeedEntry, book: BlockBook | null, guard?: SignalGuard | null) {
  book?.add(e);
  // keyed by the candidate's config (the same key execDecision checks); the exit time feeds the loss-cluster guard
  if (guard && e.ind && isSignalInd(e.ind)) {
    // the signal entry the close belongs to: its k configs count once in the loss cluster and the acceptance counts
    const onset = e.entryT !== undefined ? `${e.ind}|${e.sym}|${e.side > 0 ? 1 : -1}|${e.entryT}` : undefined;
    guard.add(guardKey(e.cfg ?? e.ind, e.sym, e.side, e.type ?? "normal"), e.r, e.exitT, e.side, onset);
    guard.addAccept(acceptKey(e.ind, e.sym, e.side, e.type ?? "normal", guard.splitPool), e.r, e.exitT, onset);
    guard.addAccept(sideAcceptKey(e.side), e.r, e.exitT, onset);
  }
}

export interface Selection {
  id: string;
  score: number;
  window: { n: number; net: number; pf: number; ddt: number };
}

/** Share of exit-hours in [a, b) with a positive summed return. */
function greenShare(tp: ConfigTape, a: number, b: number): number {
  if (b <= a) return 0;
  let curH = -1;
  let cur = 0;
  let hours = 0;
  let green = 0;
  const flush = () => {
    if (curH < 0) return;
    hours++;
    if (cur > 0) green++;
  };
  for (let i = a; i < b; i++) {
    const h = Math.floor(tp.exitT[i] / H);
    if (h !== curH) {
      flush();
      curH = h;
      cur = tp.r[i];
    } else cur += tp.r[i];
  }
  flush();
  return hours ? green / hours : 0;
}

/** Lower confidence bound (≈ 1σ) of the summed return over [a, b): mean·n − sd·√n, in percent. */
/** A config's selection score at t (the lower confidence bound over the selection window) — signals scored alike. */
export function selectionScoreAt(tp: ConfigTape, t: number, o: Pick<WalkForwardOptions, "longH" | "preH">): number {
  return lcbFast(tp, lowerBound(tp.exitT, t - Math.max(o.longH, o.preH) * H), lowerBound(tp.exitT, t));
}

function lcbFast(tp: ConfigTape, a: number, b: number): number {
  const n = b - a;
  if (n < 2) return 0;
  const s = tp.rs[b] - tp.rs[a];
  const s2 = tp.r2[b] - tp.r2[a];
  const m = s / n;
  const sd = Math.sqrt(Math.max(0, (s2 - n * m * m) / (n - 1)));
  return (m * n - sd * Math.sqrt(n)) * 100;
}

/**
 * Main + Real selection at time t (only trades closed before t count).
 * Main: long window passes PF/DDT (DDT limit scales per 72h) and the pair is parameter-robust.
 * Real: still working over the pre-historic window (PF >= neutral, net >= 0; < 3 closes = quiet, allowed)
 *       and executable under the toggles. Best variant per pair, top `portfolio` by rank.
 */
/** Real seats per family: `portfolio`, 0 = no limit. */
const seatsOf = (o: Pick<WalkForwardOptions, "portfolio">) =>
  o.portfolio > 0 ? o.portfolio : Infinity;

/** Strategy family. Trailing is not part of the plain base: it is seated and executed on its own. */
export const familyOf = (kind: string) =>
  kind === "axis"
    ? "axis"
    : kind === "dca" || kind === "dca-active"
      ? "dca"
      : kind === "trailing"
        ? "trailing"
        : "base";

/** Seat key of a tape: its pair, per family when every family has its own seats.
 *  A micro cell is its own seat, so it is not dropped for the wide cell of the same strategy. */
const seatKey = (
  tp: ConfigTape,
  o: Pick<WalkForwardOptions, "familySeats" | "rangeSeats" | "seatPer">,
) => {
  const tag = tp.protect.tag;
  // independent configs: the config id is the seat (its family and range stay readable for the seat counts)
  if (o.seatPer === "config")
    return `${tag ? `${tag}|` : ""}${tp.bot}|${tp.ind}|${familyOf(tp.kind)}#${tp.id.replaceAll("|", "~")}${
      tp.kind === "trailing" ? "|tr" : ""
    }`;
  if (tag === "mc") return `mc|${tp.id}`;
  const trail = tp.kind === "trailing" ? "|tr" : "";
  const key = o.familySeats ? `${tp.bot}|${tp.ind}|${familyOf(tp.kind)}${trail}` : `${tp.bot}|${tp.ind}${trail}`;
  // range seats: short / minimal / plus each hold a seat of their own per pair
  return o.rangeSeats && tag ? `${tag}|${key}` : key;
};
/**
 * A tape's seat key and pair key (`bot|ind`), built once per tape and seat mode: the key reads the options only through
 * the mode (seatPer, familySeats, rangeSeats), and a selection scores every tape at every step — building the strings
 * per step was most of the selection's garbage.
 */
const seatMemo = new WeakMap<ConfigTape, { mode: number; key: string; pairKey: string }>();
function seatOf(tp: ConfigTape, o: Pick<WalkForwardOptions, "familySeats" | "rangeSeats" | "seatPer">) {
  const mode = (o.seatPer === "config" ? 4 : 0) | (o.familySeats ? 2 : 0) | (o.rangeSeats ? 1 : 0);
  const hit = seatMemo.get(tp);
  if (hit && hit.mode === mode) return hit;
  const v = { mode, key: seatKey(tp, o), pairKey: `${tp.bot}|${tp.ind}` };
  seatMemo.set(tp, v);
  return v;
}
/**
 * Micro seats per step: no cap of its own (operator, 5 Oct — "disable micro sets cap"). Micro follows `portfolio`
 * like every other family (0 = every validated config trades). It used to be held to 200 best-scored configs, which
 * silently dropped validated Micro sets once a few pairs passed Base.
 */
const microSeats = (o: Pick<WalkForwardOptions, "portfolio" | "seatPer" | "microSeats">) =>
  o.microSeats && o.microSeats > 0 ? Math.min(seatsOf(o), o.microSeats) : seatsOf(o);
/** range tag of a range seat key ("mc", "mn", "sh", "gn", "lg", "mp"), "" otherwise */
const rangeSeat = (pair: string) => (/^(mc|sh|mn|mp|gn|lg)\|/.exec(pair)?.[1] ?? "") as "" | RangeTag;
const seatFamily = (pair: string, familySeats: boolean | undefined) => {
  const r = rangeSeat(pair);
  if (r === "mc") return "micro";
  if (r) return r;
  return pair.endsWith("|tr") ? "trailing" : familySeats ? famOfKey(pair) : "base";
};
const famOfKey = (pair: string) => (pair.split("|")[2] ?? "base").split("#")[0];

/**
 * Additional strategies (DCA, Axis) must beat the base: a candidate of another family stays only when its window
 * PF is at least the best base-family (Normal / Trailing) PF of the same pair in that window.
 */
function beatsBase<T extends { pair: string; window: { pf: number } }>(
  xs: T[],
  basePf: ReadonlyMap<string, number>,
  o: Pick<WalkForwardOptions, "familySeats" | "familyNeedsBase" | "seatPer">,
): T[] {
  if (!o.familySeats || o.seatPer === "config") return xs;
  return xs.filter((c) => {
    const f = famOfKey(c.pair);
    if (f === "base" || f === "trailing") return true;
    const b = basePf.get(c.pair.split("|").slice(0, 2).join("|"));
    // no base to beat in the window: rejected (unless the gate is relaxed) — nothing shows DCA / Axis improve it
    if (b === undefined) return o.familyNeedsBase === false;
    return c.window.pf >= b;
  });
}
const noteBase = (m: Map<string, number>, tp: ConfigTape, w: { n: number; pf: number }) => {
  if (w.n < 3 || familyOf(tp.kind) !== "base") return;
  const k = `${tp.bot}|${tp.ind}`;
  m.set(k, Math.max(m.get(k) ?? -Infinity, w.pf));
};

/** pickByLane per strategy family (each with `seats` of its own) when family seats are on. */
function pickSeats(
  cands: ReadonlyArray<Selection & { pair: string }>,
  seats: number,
  picks: Array<Selection & { pair?: string }>,
  pairs: Set<string>,
  o: Pick<WalkForwardOptions, "familySeats" | "laneSeats" | "rangeSeats" | "portfolio" | "seatPer" | "microSeats">,
): Selection[] {
  const ls = o.laneSeats ?? 0;
  // ranges: micro per cell (no cap of its own); short / minimal / plus with seats of their own when range seats are on
  const rangeOut: Selection[] = [];
  for (const r of RANGE_TAGS) {
    const xs = cands.filter((c) => rangeSeat(c.pair) === r);
    const held = picks.filter((p) => rangeSeat(p.pair ?? "") === r);
    if (xs.length || held.length)
      rangeOut.push(...pickByLane(xs, r === "mc" ? microSeats(o) : seats, held, pairs, r === "mc" ? 0 : ls));
  }
  const plain = cands.filter((c) => !rangeSeat(c.pair));
  const plainHeld = picks.filter((p) => !rangeSeat(p.pair ?? ""));
  const trail = plain.filter((c) => c.pair.endsWith("|tr"));
  const rest = plain.filter((c) => !c.pair.endsWith("|tr"));
  const trailHeld = plainHeld.filter((p) => (p.pair ?? "").endsWith("|tr"));
  const restHeld = plainHeld.filter((p) => !(p.pair ?? "").endsWith("|tr"));
  const trailOut = pickByLane(trail, seats, trailHeld, pairs, ls);
  if (!o.familySeats) return [...pickByLane(rest, seats, restHeld, pairs, ls), ...trailOut, ...rangeOut];
  const fams = new Map<string, Array<Selection & { pair: string }>>();
  for (const c of rest) {
    const f = famOfKey(c.pair);
    let xs = fams.get(f);
    if (!xs) fams.set(f, (xs = []));
    xs.push(c);
  }
  const held = new Map<string, Selection[]>();
  for (const p of restHeld) {
    const f = famOfKey(p.pair ?? "");
    let xs = held.get(f);
    if (!xs) held.set(f, (xs = []));
    xs.push(p);
  }
  const out: Selection[] = [];
  for (const f of ["base", "dca", "axis", "trailing"])
    out.push(...pickByLane(fams.get(f) ?? [], seats, held.get(f) ?? [], pairs, ls));
  return [...out, ...trailOut, ...rangeOut];
}

/**
 * Real seats with a share per timeframe lane: `picks` (held) first, then floor(free / lanes) of each lane's best
 * candidates, then the best remaining — one config per bot × indication pair. Without it the slower lanes
 * (longer history, bigger windows, higher scores) take every seat and the fast lanes never trade.
 */
function pickByLane(
  cands: ReadonlyArray<Selection & { pair: string }>,
  seats0: number,
  picks: Selection[],
  pairs: Set<string>,
  /** minimum seats per lane group (short lanes get more than a sliver of the portfolio) */
  laneSeats = 0,
): Selection[] {
  const laneKey = (pair: string) => {
    const ind = pair.split("|")[1] ?? "";
    const l = laneOf(ind);
    // signals are a share of their own (they compete with each other, not with the engine's lanes)
    return isSignalInd(ind)
      ? "signal"
      : l.tf === null
        ? "plain"
        : `${l.tf}${l.combined ? "c" : ""}`;
  };
  const byLane = new Map<string, Array<Selection & { pair: string }>>();
  for (const c of cands) {
    const k = laneKey(c.pair);
    let xs = byLane.get(k);
    if (!xs) byLane.set(k, (xs = []));
    xs.push(c);
  }
  // held seats count toward their own lane's minimum: a lane short of laneSeats gets the missing seats even when
  // held seats of other lanes fill the portfolio (they no longer starve a fast lane for as long as they hold)
  const heldBy = new Map<string, number>();
  for (const p of picks) {
    const pair = (p as Selection & { pair?: string }).pair;
    if (pair) heldBy.set(laneKey(pair), (heldBy.get(laneKey(pair)) ?? 0) + 1);
  }
  let deficit = 0;
  for (const k of byLane.keys()) deficit += Math.max(0, laneSeats - (heldBy.get(k) ?? 0));
  const seats = Math.max(seats0, laneSeats * byLane.size, picks.length + deficit);
  const free = seats - picks.length;
  if (free <= 0) return picks;
  const take = (c: Selection & { pair: string }) => {
    if (picks.length >= seats || pairs.has(c.pair)) return;
    pairs.add(c.pair);
    picks.push(c);
  };
  const sorted = new Map(
    [...byLane].map(([k, xs]) => [k, [...xs].sort((x, y) => y.score - x.score)]),
  );
  const fill = (k: string, upTo: number) => {
    // seats of lane k up to `upTo` in total (held included), best first
    let n = heldBy.get(k) ?? 0;
    for (const c of sorted.get(k) ?? []) {
      if (n >= upTo) break;
      if (pairs.has(c.pair)) continue;
      const before = picks.length;
      take(c);
      if (picks.length > before) {
        n++;
        heldBy.set(k, n);
      }
    }
  };
  if (byLane.size > 1) {
    // 1) every lane its missing minimum, 2) up to an even share of all seats (held included); 3) best of the rest
    for (const k of sorted.keys()) fill(k, laneSeats);
    const even = Math.floor(seats / byLane.size);
    for (const k of sorted.keys()) fill(k, Math.max(laneSeats, even));
  }
  for (const c of [...cands].sort((x, y) => y.score - x.score)) take(c);
  return picks;
}

export function selectAt(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): { picks: Selection[]; eligible: number } {
  const longH = Math.max(o.longH, o.preH);
  const fromLong = t - longH * H;
  const fromPre = t - o.preH * H;
  const minLong = Math.max(8, o.gates.minTrades);
  const ddtMax = Math.max(o.gates.minDdtH ?? 0, (o.gates.maxDdtH * longH) / 72);
  const pairTotal = new Map<string, number>();
  const pairOk = new Map<string, number>();
  const basePf = new Map<string, number>();
  const cand: Array<Selection & { pair: string }> = [];
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  for (const tp of tapes) {
    if (botOk && !botOk.has(tp.bot)) continue;
    if (o.basePassed && !o.basePassed.has(`${tp.bot}|${tp.ind}`)) continue;
    const a = lowerBound(tp.exitT, fromLong);
    const b = lowerBound(tp.exitT, t);
    if (b - a < minLong) continue;
    const pair = seatOf(tp, o).key;
    pairTotal.set(pair, (pairTotal.get(pair) ?? 0) + 1);
    const w = win(tp, a, b);
    noteBase(basePf, tp, w);
    if (w.net <= 0 || w.pf < minPfOf(o.gates, tp.protect.tag)) continue;
    const dd = winDd(tp, a, b, t);
    const ddt = dd.ddtH;
    if (ddt > Math.min(ddtMax, ddtLimitH(o, tp, t, longH)) || ddrFails(dd.mdd * 100, w.net, o.gates.maxDdr)) continue;
    pairOk.set(pair, (pairOk.get(pair) ?? 0) + 1);
    // a held-only tape serves its open position, it takes no new seat
    if (tp.heldOnly || !tapeExecutable(tp, o)) continue;
    const pa = lowerBound(tp.exitT, fromPre);
    const pre = win(tp, pa, b);
    if (o.preGate && pre.n >= 3 && (pre.pf < PF_NEUTRAL || pre.net < 0)) continue;
    if (!validOk(tp, t, o)) continue;
    const score =
      o.rank === "lcb"
        ? lcbFast(tp, a, b)
        : o.rank === "net"
          ? w.net
          : scoreStats(statsOf(tapeTrades(tp, a, b), t), minLong);
    if (!(score > 0)) continue;
    cand.push({ id: tp.id, score, window: { ...w, ddt }, pair });
  }
  const robust = (pair: string) =>
    o.seatPer === "config" ||
    (pairOk.get(pair) ?? 0) / Math.max(1, pairTotal.get(pair) ?? 0) >= o.robustFrac;
  const scored = beatsBase(
    cand.filter((c) => robust(c.pair)),
    basePf,
    o,
  ).sort((x, y) => y.score - x.score);
  const picks = pickSeats(scored, seatsOf(o), [], new Set<string>(), o).map((x) => ({
    id: x.id,
    score: x.score,
    window: x.window,
  }));
  return { picks, eligible: scored.length };
}

/** Durable winners at t: consistent across sub-windows of the long window. */
export function selectDurable(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
  held: ReadonlySet<string>,
): { picks: Selection[]; eligible: number } {
  const longH = Math.max(o.longH, o.preH);
  const from0 = t - longH * H;
  const minLong = Math.max(8, o.gates.minTrades);
  const k = Math.max(2, o.durableSplits);
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  const keep: Array<Selection & { pair: string }> = [];
  const cand0: Array<Selection & { pair: string }> = [];
  const basePf = new Map<string, number>();
  for (const tp of tapes) {
    if (botOk && !botOk.has(tp.bot)) continue;
    if (o.basePassed && !o.basePassed.has(`${tp.bot}|${tp.ind}`)) continue;
    // the window a tape can be judged on: the long window, clipped to where its lane's data begins (at least
    // the pre-calc window, so a lane with too little history is not judged on a sliver)
    const from = Math.min(t - o.preH * H, Math.max(from0, tp.fromT ?? from0));
    const span = (t - from) / k;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    const w = win(tp, a, b);
    const pair = seatOf(tp, o).key;
    // the base is evaluated whatever the toggles: DCA / Axis still have to beat it with Normal off
    noteBase(basePf, tp, w);
    // a held-only tape serves its open position, it takes no new seat
    if (tp.heldOnly || !tapeExecutable(tp, o)) continue;
    if (held.has(tp.id)) {
      // sticky: stay while the long window still pays (PF >= neutral)
      if (w.n >= 3 && w.pf >= PF_NEUTRAL && w.net > 0)
        keep.push({ id: tp.id, score: w.net, window: { ...w, ddt: 0 }, pair });
      continue;
    }
    if (w.n < minLong || w.net <= 0 || w.pf < minPfOf(o.gates, tp.protect.tag)) continue;
    if (o.gates.maxDdr && ddrFails(winDd(tp, a, b, t).mdd * 100, w.net, o.gates.maxDdr)) continue;
    let pos = 0;
    for (let i = 0; i < k; i++) {
      const sa = lowerBound(tp.exitT, from + i * span);
      const sb = lowerBound(tp.exitT, from + (i + 1) * span);
      if (sb > sa && tp.rs[sb] - tp.rs[sa] > 0) pos++;
    }
    if (pos / k < o.durableFrac) continue;
    if (o.preGate) {
      const pre = win(tp, lowerBound(tp.exitT, t - o.preH * H), b);
      if (pre.n >= 3 && (pre.pf < PF_NEUTRAL || pre.net < 0)) continue;
    }
    if (!validOk(tp, t, o)) continue;
    cand0.push({ id: tp.id, score: lcbFast(tp, a, b), window: { ...w, ddt: 0 }, pair });
  }
  const cand = beatsBase(cand0, basePf, o);
  const pairs = new Set<string>();
  const picks: Array<Selection & { pair: string }> = [];
  const perFam = new Map<string, number>();
  for (const s of keep.sort((x, y) => y.score - x.score)) {
    const f = seatFamily(s.pair, o.familySeats);
    const cap = f === "micro" ? microSeats(o) : seatsOf(o);
    if (pairs.has(s.pair) || (perFam.get(f) ?? 0) >= cap) continue;
    pairs.add(s.pair);
    perFam.set(f, (perFam.get(f) ?? 0) + 1);
    picks.push(s);
  }
  const out = pickSeats(cand, seatsOf(o), picks, pairs, o);
  return {
    picks: out.map((x) => ({ id: x.id, score: x.score, window: x.window })),
    eligible: keep.length + cand.length,
  };
}

/**
 * Fixed set: the focus pairs were validated offline, but each protect still has to clear the same evals as the
 * other modes. A variant is eligible only with enough closes, net > 0, PF ≥ min PF, drawdown time inside the
 * gate, a positive lower-confidence bound, and (when the pre-gate is on) a pre-window that also clears min PF.
 * The seat goes to the eligible variant with the best green-hour-weighted score. Pairs with nothing eligible
 * do not trade. Last-N, Block and the caps still apply at execution.
 */
export function selectFixed(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): { picks: Selection[]; eligible: number } {
  const g = selectFixedGen(tapes, t, o);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/**
 * The drawdown-time limit for a config at t: maxDdtH per 72 h of the history it actually has inside the window. The
 * limit was scaled by the whole window (336 h → 163 h) while a 1m tape covers 72 h at most, so the gate never failed
 * on 1m lanes (and rarely on 5m).
 */
export function ddtLimitH(o: WalkForwardOptions, tp: ConfigTape, t: number, winH: number): number {
  const spanH = tp.fromT !== undefined ? Math.max(1, Math.min(winH, (t - tp.fromT) / H)) : winH;
  return Math.max(o.gates.minDdtH ?? 0, (o.gates.maxDdtH * spanH) / 72);
}

/** The stage evaluation gates in the order the engine applies them (configEval's failing reason). */
export const EVAL_GATES = ["closes", "net", "pf", "ddt", "ddr", "pre", "lastN", "rangeGate", "lcb", "green", "stable"] as const;
export type EvalGate = (typeof EVAL_GATES)[number];
export type ConfigEval =
  | { ok: true; lcb: number; gh: number; ddt: number; pf: number; n: number; net: number }
  | { ok: false; fail: EvalGate; pf: number; n: number; net: number };

/**
 * Stage Base evaluation of one config at time t, on its own closes only (every config independent): over the
 * selection window (max of long and pre-historic hours) at least max(3, minTrades) closes, positive net, PF ≥ its
 * range's minimum, drawdown time ≤ maxDdtH × window / 72 h, drawdown ratio ≤ maxDdr; the pre-historic window not
 * negative (preGate); its last validLastN closes clear the same PF / DDT / DDR (and a range cell its range gate);
 * positive lower-confidence bound; green hours ≥ minGreen. The engine's seat selection and every report use this.
 */
/**
 * Continuous stability (Gates.stableBlocks): the window [t − winH, t) in `blocks` consecutive time blocks; every block
 * with at least 2 closes clears `minPf` with a positive net, and at least 2 blocks have closes. Off at 0.
 */
export function stableOk(
  tp: ConfigTape,
  t: number,
  winH: number,
  blocks: number,
  minPf: number,
  /** gates.warmup: fewer than two blocks carry a sample → not judgeable yet, so valid until they do */
  warmup = true,
): boolean {
  if (!(blocks >= 2)) return true;
  const span = (winH * H) / blocks;
  let active = 0;
  for (let k = 0; k < blocks; k++) {
    const from = t - winH * H + k * span;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, from + span);
    const w = win(tp, a, b);
    if (w.n < 2) continue;
    active++;
    if (w.net <= 0 || w.pf < minPf) return false;
  }
  return active >= 2 || warmup;
}

export function configEval(tp: ConfigTape, t: number, o: WalkForwardOptions): ConfigEval {
  const a = lowerBound(tp.exitT, t - Math.max(o.longH, o.preH) * H);
  const b = lowerBound(tp.exitT, t);
  return configEvalAt(tp, t, o, a, b, win(tp, a, b), (o.gates.maxDdtH * Math.max(o.longH, o.preH)) / 72);
}

/** A failed config evaluation: the gate that failed and the window it failed on (no closure per config, 10 Oct perf). */
function failOf(fail: EvalGate, w: { pf: number; n: number; net: number }): ConfigEval {
  return { ok: false, fail, pf: w.pf, n: w.n, net: w.net };
}

function configEvalAt(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  a: number,
  b: number,
  w: { n: number; net: number; pf: number; gp?: number; gl?: number },
  ddtMax: number,
): ConfigEval {
  const minPf = minPfOf(o.gates, tp.protect.tag);
  if (w.n < Math.max(3, o.gates.minTrades ?? 0)) return failOf("closes", w);
  if (w.net <= 0) return failOf("net", w);
  const prior = lossPriorOf(tp, o.gates);
  if ((prior > 0 && w.gp !== undefined && w.gl !== undefined ? profitFactor(w.gp, w.gl + prior) : w.pf) < minPf)
    return failOf("pf", w);
  const dd = winDd(tp, a, b, t);
  if (dd.ddtH > Math.min(ddtMax, ddtLimitH(o, tp, t, Math.max(o.longH, o.preH)))) return failOf("ddt", w);
  if (ddrFails(dd.mdd * 100, w.net, o.gates.maxDdr)) return failOf("ddr", w);
  if (o.preGate) {
    const pre = win(tp, lowerBound(tp.exitT, t - o.preH * H), b);
    if (pre.n >= 3 && (pre.pf < minPf || pre.net < 0)) return failOf("pre", w);
  }
  // best-set validation: last validLastN closes clear min PF and the drawdown-time gate; a range cell its range gate
  if (!lastNOk(tp, t, rangeCoordOf(o, tp.protect.tag)?.validLastN ?? o.validLastN ?? 0, minPf, o.gates.maxDdtH, o.gates.maxDdr ?? 0, o.gates.lastNFloor ?? 0, o.gates.warmup !== false, prior)) return failOf("lastN", w);
  const g = o.rangeGate;
  if (g && rangeGateOn(g, tp.protect.tag) && !lastNOk(tp, t, g.lastN, g.minPf, 0, 0, g.floor ?? o.gates.lastNFloor ?? 0, o.gates.warmup !== false, prior))
    return failOf("rangeGate", w);
  const lcb = lcbFast(tp, a, b);
  if (!(lcb > 0)) return failOf("lcb", w);
  const gh = greenShare(tp, a, b);
  // a variant that is red most hours is not what we run, even if a few large wins clear PF (gates.minGreen)
  if (gh < (o.gates.minGreen ?? 0.5)) return failOf("green", w);
  if (!stableOk(tp, t, Math.max(o.longH, o.preH), o.gates.stableBlocks ?? 0, minPf, o.gates.warmup !== false))
    return failOf("stable", w);
  return { ok: true, lcb, gh, ddt: dd.ddtH, pf: w.pf, n: w.n, net: w.net };
}

/** selectFixed in slices: yields −1 every ~8 ms (with every config its own seat, ~100k tapes per step). */
export function* selectFixedGen(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): Generator<number, { picks: Selection[]; eligible: number }> {
  const from = t - Math.max(o.longH, o.preH) * H;
  let seen = 0;
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  const best = new Map<string, Selection>();
  const basePf = new Map<string, number>();
  // ladderNeedsBase: the family and pair of each seat, and the pairs whose base (Normal / Trailing) holds a seat
  const seatFam = new Map<string, { fam: string; pairKey: string }>();
  const baseSeated = new Set<string>();
  const ddtMax = Math.max(o.gates.minDdtH ?? 0, (o.gates.maxDdtH * Math.max(o.longH, o.preH)) / 72);
  // yields on time, not on a count: 2,000 tapes took up to ~500 ms (x02, 7 Oct profile), and 32 tapes of configEvalAt
  // held the loop 1–2 s in the 10 Oct 12 h + 12 h profile: the clock is read on every tape
  let t0 = performance.now();
  for (const tp of tapes) {
    if (++seen && performance.now() - t0 > 8) {
      yield -1;
      t0 = performance.now();
    }
    if (botOk && !botOk.has(tp.bot)) continue;
    const seat = seatOf(tp, o);
    if (o.basePassed && !o.basePassed.has(seat.pairKey)) continue;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    const w = win(tp, a, b);
    const pair = seat.key;
    // the base is evaluated whatever the toggles: DCA / Axis still have to beat it with Normal off
    noteBase(basePf, tp, w);
    // a held-only tape serves its open position, it takes no new seat
    if (tp.heldOnly || !tapeExecutable(tp, o)) continue;
    const ev = configEvalAt(tp, t, o, a, b, w, ddtMax);
    if (!ev.ok) continue;
    const { lcb, gh, ddt } = ev;
    const score = o.rankBy === "green" ? gh + Math.min(1, Math.max(0, lcb)) * 1e-6 : lcb * (0.5 + gh);
    const pairKey = seat.pairKey;
    const fam = familyOf(tp.kind);
    if (fam === "base" || fam === "trailing") baseSeated.add(pairKey);
    const cur = best.get(pair);
    if (!cur || score > cur.score) {
      best.set(pair, { id: tp.id, score, window: { ...w, ddt } });
      seatFam.set(pair, { fam, pairKey });
    }
  }
  const ladderOk = (pair: string) => {
    if (!o.ladderNeedsBase) return true;
    const m = seatFam.get(pair);
    return !m || (m.fam !== "dca" && m.fam !== "axis") || baseSeated.has(m.pairKey);
  };
  const ok = new Set(
    beatsBase(
      [...best.entries()].map(([pair, v]) => ({ pair, window: v.window })),
      basePf,
      o,
    ).map((x) => x.pair),
  );
  const perFam = new Map<string, number>();
  const picks = [...best.entries()]
    .filter(([pair]) => ok.has(pair) && ladderOk(pair))
    .sort((x, y) => y[1].score - x[1].score)
    .filter(([pair]) => {
      const f = seatFamily(pair, o.familySeats);
      const n = perFam.get(f) ?? 0;
      perFam.set(f, n + 1);
      return n < (f === "micro" ? microSeats(o) : seatsOf(o));
    })
    .map(([, v]) => v);
  return { picks, eligible: best.size };
}

/** Closed results of one symbol (side 0 = both directions) with exit in [from, entryT). */
function symStats(tp: ConfigTape, sym: string, side: number, from: number, entryT: number) {
  // syms is one slot per series (symbol x timeframe); the same name sits at several indexes
  const mask = new Uint8Array(tp.syms.length);
  let any = false;
  for (let s = 0; s < tp.syms.length; s++)
    if (tp.syms[s] === sym) {
      mask[s] = 1;
      any = true;
    }
  if (!any) return { n: 0, net: 0, pf: 0 };
  const b = lowerBound(tp.exitT, entryT + 1);
  let n = 0;
  let gp = 0;
  let gl = 0;
  let net = 0;
  for (let i = b - 1; i >= 0; i--) {
    if (tp.exitT[i] < from) break;
    if (!mask[tp.symI[i]]) continue;
    if (side !== 0 && tp.side[i] !== side) continue;
    n++;
    const r = tp.r[i];
    net += r;
    if (r > 0) gp += r;
    else gl -= r;
  }
  return { n, net: net * 100, pf: profitFactor(gp, gl) };
}

/** The probe's extra seats: per range, the best tapes by window result (closes inside the window). */
export function probePicks(
  tapes: readonly ConfigTape[],
  t: number,
  o: Pick<WalkForwardOptions, "probe" | "longH" | "preH">,
  taken: ReadonlySet<string>,
): Selection[] {
  const n = Math.max(0, Math.floor(o.probe?.perRange ?? 0));
  const nc = Math.max(0, Math.floor(o.probe?.perCell ?? 0));
  if (!n && !nc) return [];
  const from = t - Math.max(o.longH, o.preH) * H;
  const by = new Map<string, Selection[]>();
  if (nc) {
    // heatmap probe: per cell (TP × SL × trailing), the best tapes by window result; a cell without closes in the
    // window still seats its tape with the most closes. Only plain / trailing tapes of the reference lane: there
    // a cell's distances are exactly the grid's (other lanes are scaled, DCA / Axis carry their own exits)
    const cells = new Map<string, Array<{ sel: Selection; closed: number; all: number }>>();
    for (const tp of tapes) {
      if (taken.has(tp.id)) continue;
      if (tp.kind !== "normal" && tp.kind !== "trailing") continue;
      if ((laneOf(tp.ind).tf ?? REF_TF) !== REF_TF) continue;
      const key = `${tp.protect.tp}|${tp.protect.sl}|${tp.protect.trail}`;
      const a = lowerBound(tp.exitT, from);
      const b = lowerBound(tp.exitT, t);
      const w = win(tp, a, b);
      let xs = cells.get(key);
      if (!xs) cells.set(key, (xs = []));
      xs.push({ sel: { id: tp.id, score: w.net, window: { ...w, ddt: 0 } }, closed: b - a, all: b });
    }
    const out: Selection[] = [];
    for (const xs of cells.values())
      out.push(
        ...xs
          .sort((x, y) => Number(y.closed > 0) - Number(x.closed > 0) || y.sel.score - x.sel.score || y.all - x.all)
          .slice(0, nc)
          .map((x) => x.sel),
      );
    return out;
  }
  for (const tp of tapes) {
    const tag = tp.protect.tag;
    if (!tag || taken.has(tp.id)) continue;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    if (b - a < 1) continue;
    const w = win(tp, a, b);
    let xs = by.get(tag);
    if (!xs) by.set(tag, (xs = []));
    xs.push({ id: tp.id, score: w.net, window: { ...w, ddt: 0 } });
  }
  const out: Selection[] = [];
  for (const xs of by.values()) out.push(...xs.sort((x, y) => y.score - x.score).slice(0, n));
  return out;
}

/** Picks plus the probe's seats (none unless o.probe is set). */
export function withProbe<T extends { picks: Selection[]; eligible: number }>(
  r: T,
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): T {
  if (!o.probe?.perRange && !o.probe?.perCell) return r;
  const extra = probePicks(tapes, t, o, new Set(r.picks.map((p) => p.id)));
  return extra.length ? { ...r, picks: [...r.picks, ...extra], eligible: r.eligible + extra.length } : r;
}

/**
 * Seat validation: last validLastN closes at min PF; a small-range cell also its range gate (higher PF). Pooled over
 * both directions on purpose: a seat is the config as one unit (it trades long and short, each on its own slot) —
 * the entry's own direction is judged per side by the last-N execution gate (lastNSideOk in execDecision).
 */
function validOk(
  tp: ConfigTape,
  t: number,
  o: Pick<WalkForwardOptions, "validLastN" | "gates" | "rangeGate" | "rangeCoord">,
): boolean {
  const prior = lossPriorOf(tp, o.gates);
  if (
    !lastNOk(
      tp,
      t,
      rangeCoordOf(o, tp.protect.tag)?.validLastN ?? o.validLastN ?? 0,
      minPfOf(o.gates, tp.protect.tag),
      o.gates.maxDdtH,
      o.gates.maxDdr ?? 0,
      o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
      prior,
    )
  )
    return false;
  const g = o.rangeGate;
  return (
    !g ||
    !rangeGateOn(g, tp.protect.tag) ||
    lastNOk(tp, t, g.lastN, g.minPf, 0, 0, g.floor ?? o.gates.lastNFloor ?? 0, o.gates.warmup !== false, prior)
  );
}

export function lastNOk(
  tp: ConfigTape,
  entryT: number,
  n: number,
  minPf: number,
  maxDdtH = 0,
  maxDdr = 0,
  /** gates.lastNFloor: fewer than n closes but at least this many → judged on all of them (0 = strict) */
  floor = 0,
  /**
   * gates.warmup: what the warm-up waives on a sample shorter than n is the DRAWDOWN half (time and ratio) — the
   * drawdown of 8 of 50 closes is not that config's drawdown, so it counts as valid until the sample is complete
   * and is judged normally from then on (operator, 5 Oct: "if no DDT available because of too few previous
   * positions, calculate as valid until enough exist, then evaluate normally").
   *
   * The RESULT half is never waived: a config without its last n closes does not clear a last-n PF gate, exactly as
   * before, unless `lastNFloor` admits the partial sample. Measured on the 12 h / 20-symbol run of 5 Oct: waiving
   * the result half too let 8,427 extra orders through on samples of a few closes and took the window from PF 1.108
   * (net +2,527 % in trade units) to PF 0.818 (net −14,467 %) — most of them Micro and Minimal cells whose last-50
   * range gate was waived.
   */
  warmup = true,
  /** gates.lossPrior: a virtual stop-out (r units) added to the losses of the PF (lossPriorOf) */
  prior = 0,
): boolean {
  if (n <= 0) return true;
  const b = lowerBound(tp.exitT, entryT + 1); // closed at or before entry
  let short = false;
  if (b < n) {
    if (!(floor > 0) || b < floor) return false;
    short = true;
    n = b;
  }
  if (!warmup) short = false;
  if (profitFactor(tp.gp[b] - tp.gp[b - n], tp.gl[b] - tp.gl[b - n] + prior) < minPf) return false;
  // the same closes have to come back inside the drawdown-time gate and keep their drawdown ratio — not judged on a
  // sample shorter than the gate asks for (the drawdown of 8 of 50 closes is not that config's drawdown)
  if (!short && (maxDdtH > 0 || maxDdr > 0)) {
    const dd = winDd(tp, b - n, b, entryT);
    if (maxDdtH > 0 && dd.ddtH > maxDdtH) return false;
    if (ddrFails(dd.mdd, tp.rs[b] - tp.rs[b - n], maxDdr)) return false;
  }
  return true;
}

/**
 * lastNOk on ONE direction's closes: the last `n` closes of `side` before the entry (long and short run independently,
 * so an entry is judged on its own side's recent record, never on the other side's). Same rules as lastNOk (result
 * half never waived; `floor` admits a shorter sample; the warm-up waives the drawdown half of a short sample). When
 * that side's last closes are the tape's last closes (a one-sided tape, or no interleaving in the window) it IS
 * lastNOk — the same prefix sums, the same result bit for bit. `side` 0 = pooled (lastNOk).
 */
export function lastNSideOk(
  tp: ConfigTape,
  side: number,
  entryT: number,
  n: number,
  minPf: number,
  maxDdtH = 0,
  maxDdr = 0,
  floor = 0,
  warmup = true,
  /** gates.lossPrior (lossPriorOf) */
  prior = 0,
): boolean {
  if (n <= 0 || !side) return lastNOk(tp, entryT, n, minPf, maxDdtH, maxDdr, floor, warmup, prior);
  const b = lowerBound(tp.exitT, entryT + 1); // closed at or before entry
  const want = side > 0;
  const idx: number[] = [];
  for (let i = b - 1; i >= 0 && idx.length < n; i--) if (tp.side[i] > 0 === want) idx.push(i);
  const k = idx.length;
  // contiguous with the end of the closed part: exactly the pooled window
  if ((k === n && idx[k - 1] === b - n) || (k < n && k === b))
    return lastNOk(tp, entryT, n, minPf, maxDdtH, maxDdr, floor, warmup, prior);
  let short = false;
  if (k < n) {
    if (!(floor > 0) || k < floor) return false;
    short = true;
  }
  if (!warmup) short = false;
  let gp = 0;
  let gl = 0;
  let net = 0;
  for (const i of idx) {
    const r = tp.r[i];
    net += r;
    if (r > 0) gp += r;
    else gl -= r;
  }
  if (profitFactor(gp, gl + prior) < minPf) return false;
  if (!short && (maxDdtH > 0 || maxDdr > 0)) {
    idx.reverse();
    const dd = winDdIdx(tp, idx, entryT);
    if (maxDdtH > 0 && dd.ddtH > maxDdtH) return false;
    if (ddrFails(dd.mdd, net, maxDdr)) return false;
  }
  return true;
}

export type ExecDecision =
  | {
      ok: true;
      level: number;
      vol: number;
      /** Block type overall: the extra volume of every raising source (its own position) */
      legs?: Partial<Record<BlockSource, number>>;
      /** the Block sources that raised this entry (paused after it closes positive) */
      src?: BlockSource[];
    }
  | { ok: false; why: string };

/** The crowding group of a config: its range tag, "wide" without one, "sig" for a signal. */
export const crowdRangeOf = (cfg: string): string =>
  isSignalInd(cfg.split("|")[1] ?? "") ? "sig" : rangeOfId(cfg) || "wide";
/** The crowding key of an entry: range × symbol × side × entry time. */
export const crowdKey = (cfg: string, sym: string, side: number, entryT: number) =>
  `${crowdRangeOf(cfg)}|${sym}|${side}|${entryT}`;
/** Direction domination window and the closes each side needs to be judged (the signal acceptance defaults, 8 Oct). */
export const DOMINATION_HOURS = 48;
export const DOMINATION_MIN = 6;

/** The cap of a config's range under `entryCrowd` (Infinity = none). */
export const crowdCapOf = (o: Pick<WalkForwardOptions, "entryCrowd">, cfg: string): number => {
  const k = o.entryCrowd?.[crowdRangeOf(cfg)];
  return k && k > 0 ? k : Infinity;
};

/** Indication type of a tape (Block "indication" source). */
export const kindOfInd = (ind: string) => INDICATION_BY_ID.get(laneOf(ind).base)?.kind ?? "none";

/** Block book entry of a position: its unit result (without the Block multiplier, like the config level). */
export const blockEntryOf = (x: Trade) => ({
  sym: x.sym,
  side: x.side,
  kind: kindOfInd(x.cfg.split("|")[1] ?? ""),
  r: x.r / (x.mult || 1),
  ind: x.cfg.split("|")[1] ?? "",
  type: x.kind ?? "normal",
  cfg: x.cfg,
  entryT: x.entryT,
});

const OWN_SOURCES = { config: true, overall: false, symbol: false, direction: false, indication: false, type: false };

/** Real-stage execution rules for one candidate entry (toggles, last-N, Block / Block Active). */

export function execDecision(
  tp: ConfigTape,
  entryT: number,
  o: WalkForwardOptions,
  ctx?: { book?: BlockBook | null; guard?: SignalGuard | null; sym: string; side: number; market?: MarketTrend | null },
): ExecDecision {
  const tg = o.toggles;
  if (!tapeExecutable(tp, o)) return { ok: false, why: "toggle" };
  if (o.excludeRanges?.length && tp.protect.tag && o.excludeRanges.includes(tp.protect.tag))
    return { ok: false, why: "rangeOff" };
  // signals: only the active ones (source × lane × symbol) trade, and a config set of source × symbol ×
  // direction × type whose last N closed results average below zero is disabled
  if (ctx && isSignalInd(tp.ind)) {
    // a signal pair held only for its open positions (it no longer passes Base) opens nothing new
    if (o.signalBasePassed && !o.signalBasePassed.has(`${tp.bot}|${tp.ind}`)) return { ok: false, why: "signalBase" };
    if (o.signalActive && !o.signalActive.has(sigUnitKey(tp, ctx.sym, ctx.side, !!o.signalConfigUnits)))
      return { ok: false, why: "signalInactive" };
    if (
      o.signalGuardN &&
      ctx.guard?.disabled(guardKey(tp.id, ctx.sym, ctx.side, tp.kind), o.signalGuardN)
    )
      return { ok: false, why: "signalGuard" };
    // the loss cluster of this direction only (a cluster of losing shorts never pauses the longs)
    if (o.signalCluster?.enabled && ctx.guard?.clustered(entryT, o.signalCluster, ctx.side))
      return { ok: false, why: "signalCluster" };
    if (
      o.signalAccept?.enabled &&
      ctx.guard &&
      // the signal source's record on this symbol, direction and type (one exit config alone rarely has the
      // closes the acceptance needs: keyed per config, no signal would ever be accepted)
      !ctx.guard.accepts(acceptKey(tp.ind, ctx.sym, ctx.side, tp.kind, !!o.signalSplitPool), entryT, o.signalAccept)
    )
      return { ok: false, why: "signalPf" };
    // direction acceptance: this side's signal candidates, pooled over every source and symbol, must clear the PF
    if (
      o.signalSideAccept?.enabled &&
      ctx.guard &&
      !ctx.guard.accepts(sideAcceptKey(ctx.side), entryT, o.signalSideAccept)
    )
      return { ok: false, why: "signalSide" };
    // domination per unit: on this symbol the other side of the same source and type must not have the better PF
    if (o.signalDomination === "unit" && ctx.guard) {
      const own = ctx.guard.acceptStats(acceptKey(tp.ind, ctx.sym, ctx.side, tp.kind, !!o.signalSplitPool), entryT, DOMINATION_HOURS);
      const other = ctx.guard.acceptStats(acceptKey(tp.ind, ctx.sym, -ctx.side, tp.kind, !!o.signalSplitPool), entryT, DOMINATION_HOURS);
      if (own.n >= DOMINATION_MIN && other.n >= DOMINATION_MIN && other.pf > own.pf) return { ok: false, why: "signalDomination" };
    }
    // the market's side (10 Oct): a long only while the market's median return is not up, a short only while it is not
    // down; an unknown market refuses the side
    if (o.signalMarketSide && !marketSideAllows(ctx.side as 1 | -1, ctx.market?.at(entryT) ?? Number.NaN))
      return { ok: false, why: "signalMarket" };
    // the validation an engine config needs for its seat (min PF, DDT and DDR), on the signal's own last N
    if (!validOk(tp, entryT, o.signalValidLastN === undefined ? o : { ...o, validLastN: o.signalValidLastN }))
      return { ok: false, why: "signalValid" };
  }
  if (o.paused?.size && o.paused.has(setKeyOf(tp.id))) return { ok: false, why: "adjustPause" };
  // last-N uses the stricter of its own floor and the stage min PF, so a pass below min PF cannot enter
  // a demo probe seat (a range tape) trades without the last-N and symbol gates: that is what it measures
  // the demo probe measures engine range cells only (8 Oct): a signal never passes its gates through it
  const probed = !isSignalInd(tp.ind) && ((!!o.probe?.perRange && !!tp.protect.tag) || !!o.probe?.perCell);
  // end stage / Live: the recent closes must clear min PF and the DDT gate again
  // signals: their own last N (never more than the engine's)
  // per direction: the last N closes of the entry's own side (long and short run independently). The seat validation
  // above (validOk) stays pooled: a config's seat is one unit, judged on all of its closes
  const lastN =
    o.signalValidLastN !== undefined && isSignalInd(tp.ind)
      ? Math.min(o.lastN, o.signalValidLastN)
      : (rangeCoordOf(o, tp.protect.tag)?.lastN ?? o.lastN);
  if (
    !probed &&
    !lastNSideOk(
      tp,
      ctx?.side ?? 0,
      entryT,
      lastN,
      Math.max(o.lastNMinPf, minPfOf(o.gates, tp.protect.tag)),
      o.gates.maxDdtH,
      o.gates.maxDdr ?? 0,
      o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
      lossPriorOf(tp, o.gates),
    )
  )
    return { ok: false, why: "lastN" };
  // the config can clear min PF overall and still be the wrong set on this symbol. Judge that symbol alone.
  const symGate = rangeCoordOf(o, tp.protect.tag)?.symGate ?? o.symGate;
  if (!probed && ctx?.sym && symGate && symGate !== "off" && !isSignalInd(tp.ind)) {
    const bySide = symGate === "vetoSide" || symGate === "provenSide";
    const proven = symGate === "proven" || symGate === "provenSide";
    const lookH = o.symH && o.symH > 0 ? o.symH : Math.max(o.longH, o.preH);
    const w = symStats(tp, ctx.sym, bySide ? ctx.side : 0, entryT - lookH * H, entryT);
    const minN = o.symMinN ?? 2;
    const fails = w.net <= 0 || w.pf < minPfOf(o.gates, tp.protect.tag);
    // with gates.warmup on, "proven" no longer refuses a symbol purely for having fewer than minN of this config's
    // own closes: the result it does have is judged (a loss on this symbol still refuses it), and a symbol with no
    // closes at all is valid until it has one. Strict "proven" (warmup off) keeps the sample count as a condition.
    const strict = o.gates.warmup === false;
    const refuse = proven
      ? strict
        ? w.n < minN || fails // the old rule: the symbol must be proven on at least minN closes
        : w.n >= 1 && fails // the warm-up judges the closes there are; no closes yet = valid
      : w.n >= minN && fails; // veto modes: only a judged symbol is vetoed
    if (refuse) return { ok: false, why: "symPf" };
  }
  // engine direction acceptance: this type family × range × side must clear its PF on its candidates' last hours
  const engineSideOn = rangeCoordOf(o, tp.protect.tag)?.engineSide ?? o.engineSideAccept?.enabled;
  if (
    !probed &&
    engineSideOn &&
    o.engineSideAccept &&
    ctx?.guard?.engineSide &&
    ctx.side &&
    !isSignalInd(tp.ind) &&
    !ctx.guard.engineSide.acceptsPerInd(
      engineSideKeyFor(tp.kind, tp.protect.tag, ctx.side, tp.ind, o.engineSideAccept.perInd),
      engineSideKey(tp.kind, tp.protect.tag, ctx.side),
      entryT,
      o.engineSideAccept,
      ctx.guard.exchange,
    )
  )
    return { ok: false, why: "engineSide" };
  // the direction gate: this side's last N candidates across the universe sum negative → no new entry on it
  if (!probed && (o.sideGateN ?? 0) > 0 && ctx?.book && ctx.side && !isSignalInd(tp.ind)) {
    const n = o.sideGateN as number;
    const s = ctx.book.tailSum(sourceKey("direction", { sym: "", side: ctx.side, kind: "" }), n);
    if (s.n >= n && !(s.sum > 0)) return { ok: false, why: "sideGate" };
  }
  // Normal off: the plain base (Normal and Trailing) executes only Block-raised — a signal's own base aside
  const plain = tp.kind === "normal" || tp.kind === "trailing";
  const sigBase = plain && !!o.signalOwnBase && isSignalInd(tp.ind);
  // Normal on with a base PF: the unraised base trades on the config's own recent record
  const gatedBase = plain && tg.normal && !sigBase && (o.normalBaseMinPf ?? 0) > 0;
  const baseOk = () =>
    lastNSideOk(
      tp,
      ctx?.side ?? 0,
      entryT,
      o.lastN > 0 ? o.lastN : 25,
      o.normalBaseMinPf ?? 0,
      o.gates.maxDdtH,
      o.gates.maxDdr ?? 0,
      o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
    );
  if (!tg.block) {
    if (plain && !tg.normal && !sigBase) return { ok: false, why: "normalOff" };
    if (gatedBase && !baseOk()) return { ok: false, why: "normalPf" };
    return { ok: true, level: 0, vol: 1 };
  }
  // a type Block never raises trades at its own volume (and Block Active does not skip it); the Normal base PF
  // still applies, as for a range Block never raises
  if (o.block.excludeKinds?.includes(tp.kind)) {
    if (gatedBase && !baseOk()) return { ok: false, why: "normalPf" };
    return { ok: true, level: 0, vol: 1 };
  }
  // a range Block never raises: its unit, on its own record (the Normal base PF still applies)
  if (tp.protect.tag && o.block.excludeRanges?.includes(tp.protect.tag)) {
    if (gatedBase && !baseOk()) return { ok: false, why: "normalPf" };
    return { ok: true, level: 0, vol: 1 };
  }
  const t = { sym: ctx?.sym ?? "", side: ctx?.side ?? 0, kind: kindOfInd(tp.ind), type: tp.kind, cfg: tp.id };
  // a signal on its own record: only its config source counts (no pooled book)
  const own = !!o.block.signalsOwn && isSignalInd(tp.ind);
  const blk = own ? { ...o.block, sources: OWN_SOURCES } : o.block;
  const book = own ? null : ctx?.book;
  const d = blockDecide(
    { config: blockLevel(tp, entryT, blk), ...bookLevels(book, t, blk.maxLevel) },
    blk,
    !!tg.blockActive,
    (src) => !!book?.paused(sourceKey(src, t)),
  );
  // Block Active: only entries at the minimum level or above are opened — every lower entry is skipped; a signal's
  // own base trades at its unit then
  if (!d.adjusted && gatedBase) return baseOk() ? { ok: true, level: 0, vol: 1 } : { ok: false, why: "normalPf" };
  if (tg.blockActive && !d.adjusted && !sigBase) return { ok: false, why: "blockActive" };
  // Normal off: a plain Normal / Trailing entry needs Block (DCA / Axis are not plain and run on their own)
  if (plain && !tg.normal && !d.adjusted && !sigBase) return { ok: false, why: "normalOff" };
  if (!d.adjusted) return { ok: true, level: 0, vol: 1 };
  return { ok: true, level: d.level, vol: d.vol, src: d.src, ...(d.legs ? { legs: d.legs } : {}) };
}

/** Synchronous wrapper (CLI / tests). The runtime drives walkForwardGen so it can yield between hours. */
export function walkForward(
  u: Universe,
  tapes: readonly ConfigTape[],
  o: WalkForwardOptions,
): WalkForwardResult {
  const gen = walkForwardGen(u, tapes, o);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

const sigCfgMemo = new Map<string, boolean>();
/** Whether a config id ("bot|ind|…") is a signal config (memoised: called per open order per candidate). */
export function sigCfg(cfg: string): boolean {
  let v = sigCfgMemo.get(cfg);
  if (v === undefined) {
    v = isSignalInd(cfg.split("|")[1] ?? "");
    if (sigCfgMemo.size > 200_000) sigCfgMemo.clear();
    sigCfgMemo.set(cfg, v);
  }
  return v;
}

/**
 * True when opening `sym` × `side` would exceed the cap on POSITIONS (distinct symbol × direction, long and short
 * independent; every order or partial on a position counts once). Engine and signal positions are capped apart
 * (engine: maxPositions, signals: signalMaxPositions); 0 / unset = no limit. The signals' cap counts each direction
 * on its own (long and short run independently: up to `cap` long positions and `cap` short positions); the engine's
 * counts both directions together (a measured preset value, e.g. the desk preset's 6).
 */
export function positionsFull(
  open: ReadonlyArray<{ sym: string; side: number; cfg: string }>,
  sym: string,
  side: number,
  signal: boolean,
  cap: number | undefined,
): boolean {
  if (!cap || cap <= 0) return false;
  const seen = new Set<string>();
  for (const x of open) {
    if (sigCfg(x.cfg) !== signal) continue;
    if (x.sym === sym && x.side === side) return false;
    if (signal && x.side !== side) continue;
    seen.add(`${x.sym}|${x.side}`);
  }
  return seen.size >= cap;
}

/** Order caps for engine orders, or for signal orders (their own budget); 0 / unset = no limit. */
export function capsOf(
  o: Pick<
    WalkForwardOptions,
    "maxPerSymbol" | "maxOpen" | "maxPerSide" | "signalPerSymbol" | "signalMaxOpen"
  >,
  signal: boolean,
): { perSymbol: number; maxOpen: number; perSide: number } {
  const lim = (x: number | undefined) => (x && x > 0 ? x : Infinity);
  if (!signal)
    return { perSymbol: lim(o.maxPerSymbol), maxOpen: lim(o.maxOpen), perSide: lim(o.maxPerSide) };
  const maxOpen = lim(o.signalMaxOpen);
  return { perSymbol: lim(o.signalPerSymbol), maxOpen, perSide: maxOpen };
}

/**
 * Negative-hour hedge candidates at t: signals (pair × symbol) whose tape results in the hours the executed book
 * lost (complete hours before t, within `windowH`) were positive — at least `minN` results (per config), net > 0
 * and PF ≥ `minPf`. Keys `sigActiveKey` ("bot|ind|sym|side": each direction a hedge of its own).
 */
export function hedgeSignalsAt(
  groups: readonly SignalGroup[],
  t: number,
  negHours: ReadonlySet<number>,
  windowH: number,
  opt: { minN: number; minPf: number } = HEDGE_DEFAULTS,
): Set<string> {
  const out = new Set<string>();
  if (!negHours.size) return out;
  const endB = Math.floor(t / H);
  const fromB = endB - windowH;
  for (const g of groups) {
    let lo = 0;
    let hi = g.h.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (g.h[m] < fromB) lo = m + 1;
      else hi = m;
    }
    let n = 0;
    let net = 0;
    let gp = 0;
    let gl = 0;
    for (let j = lo; j < g.h.length && g.h[j] < endB; j++) {
      if (!negHours.has(g.h[j])) continue;
      n += g.n[j];
      net += g.net[j];
      gp += g.gp[j];
      gl += g.gl[j];
    }
    if (n >= opt.minN && net > 0 && profitFactor(gp, gl) >= opt.minPf) {
      const i = g.pair.indexOf("|");
      out.add(sigActiveKey(g.pair.slice(0, i), g.pair.slice(i + 1), g.sym, g.side));
    }
  }
  return out;
}

/**
 * Hourly index of the signal tapes' closed results per signal (pair × symbol × direction), averaged over the
 * signal's configs (15 Normal + 15 Trailing): built once per tape set, so ranking at every step scans hour buckets,
 * not trades. Long and short of a signal on a symbol are separate groups (ranked and activated independently).
 */
interface SignalGroup {
  pair: string;
  sym: string;
  /** direction of the group's closes (1 long, −1 short) */
  side: 1 | -1;
  /** signal source ("ema-cross") */
  src: string;
  /** hour bucket ids (floor(exitT / H)), ascending */
  h: Float64Array;
  /** per bucket: Σ r·100 / configs, Σ gains, Σ losses (r), trade count / configs */
  net: Float64Array;
  gp: Float64Array;
  gl: Float64Array;
  n: Float64Array;
}
const signalIndexCache = new WeakMap<object, SignalGroup[]>();
export function signalIndex(sigTapes: readonly ConfigTape[], cacheKey?: object, perConfig = false): SignalGroup[] {
  const g = signalIndexGen(sigTapes, cacheKey, perConfig);
  for (let r = g.next(); ; r = g.next()) if (r.done) return r.value;
}

/** signalIndex in slices (yields every few tapes, so a large index never blocks the event loop). */
export function* signalIndexGen(
  sigTapes: readonly ConfigTape[],
  cacheKey?: object,
  perConfig = false,
): Generator<number, SignalGroup[]> {
  // the unit is the pair (default) or the config (signals.configUnits, 10 Oct T5); the cache holds the pair index only
  const hit = cacheKey && !perConfig && signalIndexCache.get(cacheKey);
  if (hit) return hit;
  const cfgs = new Map<string, number>();
  const unitOf = (tp: ConfigTape) => (perConfig ? `${tp.bot}|${tp.id}` : `${tp.bot}|${tp.ind}`);
  for (const tp of sigTapes) {
    const pair = unitOf(tp);
    cfgs.set(pair, (cfgs.get(pair) ?? 0) + 1);
  }
  const acc = new Map<string, Map<number, [number, number, number, number]>>();
  const meta = new Map<string, { pair: string; sym: string; side: 1 | -1; ind: string }>();
  let done = 0;
  // slices by trades, not tapes (a signal tape holds thousands: 100 tapes were one 0.8 s step at 21 symbols); the
  // key and its bucket map are resolved once per symbol × side slot of the tape, not per trade (same insertion order)
  let work = 0;
  for (const tp of sigTapes) {
    done++;
    const pair = unitOf(tp);
    const k = cfgs.get(pair)!;
    const slot: Array<Map<number, [number, number, number, number]> | undefined> = new Array(tp.syms.length * 2);
    for (let i = 0; i < tp.n; i++) {
      const si = tp.symI[i];
      const side: 1 | -1 = tp.side[i] > 0 ? 1 : -1;
      const sl = si * 2 + (side > 0 ? 1 : 0);
      let m = slot[sl];
      if (!m) {
        const sym = tp.syms[si];
        const key = sigUnitKey(tp, sym, side, perConfig);
        m = acc.get(key);
        if (!m) {
          acc.set(key, (m = new Map()));
          meta.set(key, { pair, sym, side, ind: tp.ind });
        }
        slot[sl] = m;
      }
      const hb = Math.floor(tp.exitT[i] / H);
      let x = m.get(hb);
      if (!x) m.set(hb, (x = [0, 0, 0, 0]));
      const r = tp.r[i];
      x[0] += (r * 100) / k;
      if (r > 0) x[1] += r;
      else x[2] -= r;
      x[3] += 1 / k;
    }
    work += tp.n + 1;
    if (work >= 20_000) {
      work = 0;
      yield done;
    }
  }
  const out: SignalGroup[] = [];
  let built = 0;
  for (const [key, m] of acc) {
    if (++built % 200 === 0) yield done;
    const mt = meta.get(key)!;
    const hs = [...m.keys()].sort((x, y) => x - y);
    const g: SignalGroup = {
      pair: mt.pair,
      src: signalSourceOf(mt.ind),
      sym: mt.sym,
      side: mt.side,
      h: new Float64Array(hs),
      net: new Float64Array(hs.length),
      gp: new Float64Array(hs.length),
      gl: new Float64Array(hs.length),
      n: new Float64Array(hs.length),
    };
    hs.forEach((hb, j) => {
      const x = m.get(hb)!;
      g.net[j] = x[0];
      g.gp[j] = x[1];
      g.gl[j] = x[2];
      g.n[j] = x[3];
    });
    out.push(g);
  }
  if (cacheKey && !perConfig) signalIndexCache.set(cacheKey, out);
  return out;
}

/**
 * Source stability on its executed (taken) signal orders: the orders of the source closed in the `days` × 24 h
 * before t, in 24-hour buckets counted back from t. Unstable = at least `minTrades` of them and negative in sum,
 * or positive in fewer than `minShare` of the buckets it traded in. A source without enough executed history is
 * not judged (it trades).
 */
export function sourceUnstable(
  closed: ReadonlyArray<{ exitT: number; r: number }> | undefined,
  t: number,
  gate: { days: number; minShare: number; minTrades?: number },
): boolean {
  if (!closed?.length) return false;
  const from = t - gate.days * 24 * H;
  const buckets = new Map<number, number>();
  let n = 0;
  let sum = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    const x = closed[i];
    if (x.exitT > t) continue;
    if (x.exitT <= from) break;
    n++;
    sum += x.r;
    const b = Math.floor((t - x.exitT) / (24 * H));
    buckets.set(b, (buckets.get(b) ?? 0) + x.r);
  }
  if (n < (gate.minTrades ?? 5)) return false;
  let pos = 0;
  for (const v of buckets.values()) if (v > 0) pos++;
  return sum < 0 || pos < gate.minShare * buckets.size;
}

/**
 * The active signals at time t, causally: every signal (pair × symbol × direction) judged on its tapes' results in the hours
 * that closed completely in the `windowH` hours before t (hourly resolution: drawdown over hourly steps), averaged
 * over the signal's configs, then ranked by the same rules as the Base ranking (activeSignals: drawdown /
 * consistency / latest-24 h validation, the best `count`).
 */
export function activeSignalsAt(
  sigTapes: readonly ConfigTape[] | SignalGroup[],
  t: number,
  sig: SignalSettings,
  windowH: number,
): Set<string> {
  const groups =
    sigTapes.length && "h" in sigTapes[0]
      ? (sigTapes as SignalGroup[])
      : signalIndex(sigTapes as readonly ConfigTape[], undefined, sig.configUnits === true);
  const endB = Math.floor(t / H); // buckets < endB closed completely by t
  const fromB = endB - windowH;
  const recentB = endB - (sig.validateH ?? 24);

  const byPair = new Map<string, Record<string, SymStat>>();
  const hb = (x: Float64Array, v: number) => {
    let lo = 0;
    let hi = x.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (x[m] < v) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  for (const g of groups) {
    const a = hb(g.h, fromB);
    const b = hb(g.h, endB);
    if (a >= b) continue;
    let cum = 0;
    let peak = 0;
    let dd = 0;
    let gp = 0;
    let gl = 0;
    let n = 0;
    let recentN = 0;
    let recentNet = 0;
    let blocks = 0;
    let ok = 0;
    let blk = NaN;
    let blkSum = 0;
    for (let j = a; j < b; j++) {
      cum += g.net[j];
      if (cum > peak) peak = cum;
      if (peak - cum > dd) dd = peak - cum;
      gp += g.gp[j];
      gl += g.gl[j];
      n += g.n[j];
      if (g.h[j] >= recentB) {
        recentN += g.n[j];
        recentNet += g.net[j];
      }
      const bk = Math.floor(g.h[j] / 4);
      if (bk !== blk) {
        if (blocks && blkSum > 0) ok++;
        blocks++;
        blk = bk;
        blkSum = 0;
      }
      blkSum += g.net[j];
    }
    if (blocks && blkSum > 0) ok++;
    let rec = byPair.get(g.pair);
    if (!rec) byPair.set(g.pair, (rec = {}));
    // each direction is its own unit (activeSignals ranks the sides; the pooled fields are not read)
    const st = (rec[g.sym] ??= { n: 0, net: 0, pf: 0, sides: {} });
    (st.sides ??= {})[g.side > 0 ? "1" : "-1"] = {
      n,
      net: cum,
      pf: profitFactor(gp, gl),
      dd,
      okShare: blocks ? ok / blocks : 0,
      recentN,
      recentNet,
    };
  }
  const pairs = [...byPair];
  return activeSignals(
    pairs.map(([pair, bySym]) => {
      const i = pair.indexOf("|");
      return { bot: pair.slice(0, i), ind: pair.slice(i + 1), bySym };
    }),
    sig,
  );
}

/**
 * Best-first order of candidates entering at the same time (lower = earlier): engine sets before signals (engine
 * PF 2.4–2.8 vs signals 1.0–1.5 on real data); engine sets by their selection score, best first; signals by their
 * active ranking (the order of `signalActive`: recovery factor), best first.
 */
export function bestFirst(
  picks: ReadonlyArray<{ id: string; score: number }>,
  o: Pick<WalkForwardOptions, "signalActive" | "bestFirst" | "signalConfigUnits">,
): (tp: ConfigTape, sym: string, side?: number) => number {
  if (o.bestFirst === false) return () => 0;
  const rank = new Map(
    [...picks].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1)).map((p, i) => [p.id, i]),
  );
  const sigRank = new Map([...(o.signalActive ?? [])].map((k, i) => [k, i]));
  const E = rank.size + 1;
  return (tp, sym, side = 1) => {
    const r = rank.get(tp.id);
    if (r !== undefined) return r;
    if (isSignalInd(tp.ind)) return E + (sigRank.get(sigUnitKey(tp, sym, side, !!o.signalConfigUnits)) ?? sigRank.size);
    return E - 1; // held / unranked engine set
  };
}

/**
 * Engine tapes (selected into Real seats) and signal tapes (every config of an active signal runs on its own;
 * none when signals are off).
 */
export function splitSignalTapes(
  tapes: readonly ConfigTape[],
  o: Pick<WalkForwardOptions, "signalActive" | "signalRank">,
): { engine: readonly ConfigTape[]; signal: ConfigTape[] } {
  if (!tapes.some((t) => isSignalInd(t.ind))) return { engine: tapes, signal: [] };
  // ranked per step: every signal tape is a candidate, the step's active set gates it
  if (o.signalRank)
    return {
      engine: tapes.filter((t) => !isSignalInd(t.ind)),
      signal: tapes.filter((t) => isSignalInd(t.ind)),
    };
  const pairs = new Set([...(o.signalActive ?? [])].map((k) => k.split("|").slice(0, 2).join("|")));
  return {
    engine: tapes.filter((t) => !isSignalInd(t.ind)),
    signal: o.signalActive
      ? tapes.filter((t) => isSignalInd(t.ind) && pairs.has(`${t.bot}|${t.ind}`))
      : [],
  };
}

/** one set per recorded step, built once (read-only: every caller only asks `has`) */
const stepSets = new WeakMap<readonly string[], ReadonlySet<string>>();

/**
 * The active signal set a step recorded for an entry at t (the last step starting at or before t). The set is built
 * once per step and shared: the audit asks once per executed signal trade, and a fresh set of every active key each
 * time made thousands of large sets a run (x02, 7 Oct profile: 0.5 s and the collector's pauses behind it).
 */
export function signalSetAt(
  steps: ReadonlyArray<{ t: number; keys: readonly string[] }>,
  t: number,
): ReadonlySet<string> | undefined {
  let lo = 0;
  let hi = steps.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (steps[m].t <= t) lo = m + 1;
    else hi = m;
  }
  if (!lo) return undefined;
  const keys = steps[lo - 1].keys;
  let set = stepSets.get(keys);
  if (!set) stepSets.set(keys, (set = new Set(keys)));
  return set;
}

/**
 * Min-heap by (exit time, insertion order): pops in exactly the order a stable insertion sort by exit time gives,
 * at O(log n) per change. The walk-forward kept its open orders and pending candidates in sorted arrays (a linear
 * insertion and an O(n) shift per close): with every config its own seat that was tens of thousands of entries
 * moved per candidate. `items` is the heap's own array (heap order) for order-free scans.
 */
export class ExitHeap<T> {
  readonly items: T[] = [];
  private ts: number[] = [];
  private ss: number[] = [];
  private seq = 0;
  get size() {
    return this.items.length;
  }
  /** the smallest exit time (Infinity when empty) */
  peekT(): number {
    return this.items.length ? this.ts[0] : Infinity;
  }
  push(t: number, v: T) {
    let i = this.items.length;
    this.items.push(v);
    this.ts.push(t);
    this.ss.push(this.seq++);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): T | undefined {
    const n = this.items.length;
    if (!n) return undefined;
    const top = this.items[0];
    const v = this.items.pop()!;
    const t = this.ts.pop()!;
    const s = this.ss.pop()!;
    if (n > 1) {
      this.items[0] = v;
      this.ts[0] = t;
      this.ss[0] = s;
      const m = n - 1;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let b = i;
        if (l < m && this.less(l, b)) b = l;
        if (r < m && this.less(r, b)) b = r;
        if (b === i) break;
        this.swap(i, b);
        i = b;
      }
    }
    return top;
  }
  private less(a: number, b: number) {
    return this.ts[a] < this.ts[b] || (this.ts[a] === this.ts[b] && this.ss[a] < this.ss[b]);
  }
  private swap(a: number, b: number) {
    const v = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = v;
    const t = this.ts[a];
    this.ts[a] = this.ts[b];
    this.ts[b] = t;
    const s = this.ss[a];
    this.ss[a] = this.ss[b];
    this.ss[b] = s;
  }
}

const bump = (m: Map<string, number>, k: string, d: number) => {
  const v = (m.get(k) ?? 0) + d;
  if (v) m.set(k, v);
  else m.delete(k);
};

/**
 * Counts of the executed open orders the caps read, kept as orders open and close: O(1) per candidate instead of
 * four scans of every open order (dupe, per symbol, total, per side) and a fifth for the position cap.
 * Engine and signal orders are counted apart (each class has its own caps).
 */
export class OpenCounts {
  private keys = new Map<string, number>();
  private sym = new Map<string, number>();
  private side = new Map<string, number>();
  private pos = new Map<string, number>();
  private all = [0, 0];
  private positions = [0, 0];
  /** distinct positions per class and direction ([class][0 short, 1 long]) */
  private positionsSide = [
    [0, 0],
    [0, 0],
  ];
  add(x: { cfg: string; sym: string; side: number }, d: 1 | -1) {
    const c = sigCfg(x.cfg) ? 1 : 0;
    bump(this.keys, `${x.sym}|${x.cfg}|${x.side > 0 ? 1 : -1}`, d);
    bump(this.sym, `${c}|${x.sym}`, d);
    bump(this.side, `${c}|${x.side}`, d);
    const pk = `${c}|${x.sym}|${x.side}`;
    const before = this.pos.get(pk) ?? 0;
    bump(this.pos, pk, d);
    const si = x.side > 0 ? 1 : 0;
    if (d > 0 && before === 0) {
      this.positions[c]++;
      this.positionsSide[c][si]++;
    } else if (d < 0 && before === 1) {
      this.positions[c]--;
      this.positionsSide[c][si]--;
    }
    this.all[c] += d;
  }
  /**
   * the same config already holds an order on the symbol in this direction (long and short of one config run
   * independently: an open long never blocks the config's short; without `side` either direction counts)
   */
  dupe(sym: string, cfg: string, side?: number) {
    if (side === undefined) return this.keys.has(`${sym}|${cfg}|1`) || this.keys.has(`${sym}|${cfg}|-1`);
    return this.keys.has(`${sym}|${cfg}|${side > 0 ? 1 : -1}`);
  }
  perSymbol(sym: string, signal: boolean) {
    return this.sym.get(`${signal ? 1 : 0}|${sym}`) ?? 0;
  }
  open(signal: boolean) {
    return this.all[signal ? 1 : 0];
  }
  perSide(side: number, signal: boolean) {
    return this.side.get(`${signal ? 1 : 0}|${side}`) ?? 0;
  }
  /**
   * positionsFull on the counts: opening sym × side would exceed the cap on distinct positions of its class (signals:
   * of its class and direction — each side up to the cap)
   */
  positionsFull(sym: string, side: number, signal: boolean, cap: number | undefined) {
    if (!cap || cap <= 0) return false;
    const c = signal ? 1 : 0;
    if (this.pos.has(`${c}|${sym}|${side}`)) return false;
    return (signal ? this.positionsSide[c][side > 0 ? 1 : 0] : this.positions[c]) >= cap;
  }
}

/**
 * The simulated steps walkForwardGen yields (one `yield t` per step) over `u` — the total of the runtime's Real
 * progress. The same window as walkForwardGen: the start is floored to the hour, so the run spans up to one partial
 * hour more than simH (a total of ceil(simH / stepH) ran past 100 %). The steps before the start (the record warm-up)
 * are counted too: they run and yield like the rest.
 */
export function walkForwardSteps(
  u: Pick<Universe, "nowT" | "baseTf" | "bars">,
  o: Pick<WalkForwardOptions, "simH" | "stepH" | "startT" | "signalSideAccept" | "signalCluster">,
): number {
  const endT = u.nowT;
  const startT = o.startT ?? Math.floor((endT - o.simH * H) / H) * H;
  const stopT = o.startT === undefined ? endT : Math.min(endT, startT + o.simH * H);
  const barH = (u.baseTf ?? u.bars[0]?.tfMin ?? 60) / 60;
  const stepMs = Math.max(o.stepH, barH) * H;
  if (!(stepMs > 0) || !(stopT > startT)) return 0;
  // the loop runs t = warmT, warmT + step, … while t < stopT (the same float steps, so the same count)
  let n = 0;
  for (let t = warmStartOf(startT, stepMs, o); t < stopT; t += stepMs) n++;
  return n;
}

/** A run's closed orders per consecutive `blockH`-hour block (by exit time): its stability view. */
export function runBlocks(
  trades: readonly Trade[],
  startT: number,
  stopT: number,
  blockH = 8,
): WalkForwardResult["blocks"] {
  const blocks: WalkForwardResult["blocks"] = [];
  for (let b = startT; b < stopT; b += blockH * H) {
    const s = statsOf(trades.filter((x) => x.exitT >= b && x.exitT < b + blockH * H));
    blocks.push({ t: b, n: s.n, pf: s.pf, net: s.net });
  }
  return blocks;
}

/** A stable run: PF at least the minimum, net positive, and no block with 3+ closes clearly losing. */
export function runStable(
  stats: Pick<Stats, "pf" | "net">,
  blocks: ReadonlyArray<{ n: number; pf: number }>,
  minPf: number,
): boolean {
  return stats.pf >= minPf && stats.net > 0 && blocks.filter((b) => b.n >= 3).every((b) => b.pf >= PF_NEUTRAL * 0.9);
}

/**
 * A run's PF and stability over part of its orders — the readiness of a desk that sends only some of the configs the
 * run simulates (live.source, kinds, excludeRanges). The run's own measures on the subset: the closed orders and
 * those still open at the end, marked to market, for the stats; the closed ones per 8-hour block for stability.
 */
export function runSubset(
  r: Pick<WalkForwardResult, "startT" | "endT" | "trades" | "openAtEnd">,
  keep: (t: Trade) => boolean,
  minPf: number,
): { stats: Stats; stable: boolean } {
  const closed = r.trades.filter(keep);
  const open = (r.openAtEnd ?? []).filter(keep);
  const stats = statsOf(open.length ? [...closed, ...open] : closed, r.endT);
  return { stats, stable: runStable(stats, runBlocks(closed, r.startT, r.endT), minPf) };
}

/**
 * The options the signal confirmation pool is selected under: the run's own options with every range setting taken
 * out (the per-range minimum PF, the range coordination lists, the range gate, the range seats, the Micro seat cap,
 * the range exclusions, the per-range engine direction, the crowding, the probes). A signal confirms on what the engine
 * would select under these, so no range setting changes a signal decision (docs/positive-coordinations.md, 8 Oct).
 */
function confirmPoolOptions(o: WalkForwardOptions): WalkForwardOptions {
  return {
    ...o,
    gates: { ...o.gates, rangeMinPf: undefined },
    rangeCoord: undefined,
    rangeGate: undefined,
    rangeSeats: false,
    microSeats: undefined,
    excludeRanges: undefined,
    engineSideAccept: undefined,
    entryCrowd: undefined,
    probe: undefined,
  };
}

/**
 * The signal pairs that pass the Base gate (signalBasePassed) and the number removed (10 Oct, W1). A pair that fails the
 * gate is never a candidate: the walk-forward counts the removed pairs as refused by the named gate "signalBase".
 */
export function signalBaseGate<G extends { pair: string }>(
  groups: readonly G[],
  passed: ReadonlySet<string>,
): { kept: G[]; gated: number } {
  const kept = groups.filter((g) => passed.has(g.pair));
  return { kept, gated: groups.length - kept.length };
}

export function* walkForwardGen(
  u: Universe,
  input: readonly ConfigTape[],
  o: WalkForwardOptions,
): Generator<number, WalkForwardResult> {
  // a range's own bot and indication allow-lists (RangeCoord): a config outside them is not a candidate at all, so
  // the other ranges' candidates, seats and gates are the same as without the lists (judged per config)
  const tapes = o.rangeCoord ? input.filter((tp) => rangeAllows(rangeCoordOf(o, tp.protect.tag), tp.bot, tp.ind)) : input;
  const byId = new Map(tapes.map((t) => [t.id, t]));
  // signals: not selected into seats; every config of an active signal is a candidate on its own symbol and
  // direction (the Real gate checks active + guard per config × symbol × direction)
  const { engine: selTapes, signal: sigTapes } = splitSignalTapes(tapes, o);
  const endT = u.nowT;
  const startT = o.startT ?? Math.floor((endT - o.simH * H) / H) * H;
  // the market's median return for the signal side rule (10 Oct): built from every universe symbol, read causally
  const market = o.signalMarketSide ? marketTrendOf(u.bars, o.signalMarketSide.hours) : null;
  // without an explicit start the run reaches the newest bar (the last partial hour included)
  const stopT = o.startT === undefined ? endT : Math.min(endT, startT + o.simH * H);
  // re-evaluating more often than one bar cannot change anything: the step is at least one bar
  const barH = (u.baseTf ?? u.bars[0]?.tfMin ?? 60) / 60;
  const stepH = Math.max(o.stepH, barH);
  // the records the signal rules read are fed from the candidates of the steps from warmT: the steps before the run's
  // start feed them without executing (`warming` in the step loop), so a run that starts later holds the record an
  // earlier start would have built. The steps stay on the run's own grid.
  const warmT = warmStartOf(startT, stepH * H, o);
  const steps: StepLog[] = [];
  const trades: Trade[] = [];
  const openAtEnd: Trade[] = [];
  const executedKeys = new Set<string>();
  // entries per range × symbol × side × entry time (entryCrowd)
  const crowd = new Map<string, number>();
  const open = new ExitHeap<Trade>(); // taken, by exit
  const counts = new OpenCounts(); // the caps' counts of the taken orders still open
  const hourNet = new Map<number, number>();
  const skips: Record<string, number> = {};
  // per direction as well ("why|1" / "why|-1"): long and short run independently, and their skips are read apart;
  // and per range of the candidate ("sig" = signals): Micro's skips apart from Minimal's
  const skipsBySide: Record<string, number> = {};
  const skipsByRange: Record<string, Record<string, number>> = {};
  const skipsByKind: Record<string, Record<string, number>> = {};
  // every candidate that reaches the decision (after the warm-up and the pool): the execution check counts a family as
  // named only when its refusals cover all of them (no decision is read from this count)
  const candidatesByKind: Record<string, number> = {};
  const candidatesByRange: Record<string, number> = {};
  const skip = (why: string, side?: number, cfg?: string) => {
    skips[why] = (skips[why] ?? 0) + 1;
    if (side) {
      const k = `${why}|${side > 0 ? 1 : -1}`;
      skipsBySide[k] = (skipsBySide[k] ?? 0) + 1;
    }
    if (cfg !== undefined) {
      const m = (skipsByRange[sigCfg(cfg) ? "sig" : rangeOfId(cfg)] ??= {});
      m[why] = (m[why] ?? 0) + 1;
      const kd = (skipsByKind[sigCfg(cfg) ? "sig" : kindOfId(cfg)] ??= {});
      kd[why] = (kd[why] ?? 0) + 1;
    }
  };
  // Block sources: every Real candidate's simulated result, entered into the book when it closes (causal)
  const book = bookFor(o);
  // acceptance on the tapes' record: every candidate of the source closed before the entry (before the run too)
  const guard = new SignalGuard();
  if (o.signalAccept?.enabled || o.signalSideAccept?.enabled || o.signalDomination === "unit") guard.acceptIndex = yield* signalAcceptIndexGen(tapes);
  if (o.engineSideAccept?.enabled) guard.engineSide = yield* engineSideIndexGen(tapes);
  // every candidate in exit order, collected as they settle (the heap pops in the order of a stable sort by exit:
  // sorting the whole feed at the end was one long slice)
  const feed: BlockFeedEntry[] = [];
  const vopen = new ExitHeap<BlockFeedEntry>(); // candidates not closed yet, by exit
  const seen = new Map<string, BlockFeedEntry>();
  // signal confirmation's pool: the engine candidates processed (taken or not, not closed yet) per symbol × direction —
  // the executed orders alone refused most signals (an engine candidate a cap or gate held back never confirmed one).
  // The pool is selected under range-neutral options (confirmPoolOptions), so no range setting changes a signal
  // decision; its candidates are never executed (cands with pool set)
  const engineOpen = new EngineOpenCount();
  const poolOpen = new ExitHeap<{ sym: string; side: number }>(); // pool candidates not closed yet, by exit
  const poolSeen = new Set<string>();
  const confirmCands: ConfirmCand[] = [];
  const poolO = confirmPoolOptions(o);
  const poolTapes = splitSignalTapes(input, o).engine;
  const poolById = new Map(poolTapes.map((t) => [t.id, t]));
  let poolHeld = new Set<string>();
  // signal candidates before any gate, and those of a unit not active at their step
  const sigFunnel = { candidates: 0, inactive: 0, inactiveBySide: { "1": 0, "-1": 0 } };
  const inactiveSig = (side: number) => {
    sigFunnel.inactive++;
    sigFunnel.inactiveBySide[side > 0 ? "1" : "-1"]++;
  };
  const newS2 = () =>
    o.coord?.enabled && (o.coord.s2Windows || o.coord.s2RelVolume)
      ? new S2Coord({
          windows: !!o.coord.s2Windows,
          windowN: o.coord.s2Steps ?? 6,
          pauseN: o.coord.s2Pause ?? o.coord.s2Steps ?? 6,
          relVolume: !!o.coord.s2RelVolume,
          ratio: o.coord.s2Increase ?? 0.4,
          minPf: 1.25,
          maxMult: 1.8,
          evalH: 2,
        })
      : null;
  // Stable-02 Block coordination on every closed candidate (the Block feed): the engine's instance, fed by every
  // candidate of the run (executed or not, range-gated picks and signals)
  const s2 = newS2();
  // the signals' instance, fed by the signal candidates and the confirmation pool's engine candidates (range-neutral,
  // never executed), so no range setting changes a signal's Stable-02 hold or volume (the 8 Oct rule: no range setting
  // changes a signal decision)
  const s2Sig = newS2();
  const sigS2Open = new ExitHeap<BlockFeedEntry>(); // the signals' feed entries not closed yet, by exit
  // executed signal orders per source, in exit order (source stability gate)
  const srcClosed = new Map<string, Array<{ exitT: number; r: number }>>();
  const settle = (t: number) => {
    while (poolOpen.size && poolOpen.peekT() <= t) {
      const x = poolOpen.pop()!;
      engineOpen.add(x.sym, x.side, -1);
    }
    while (sigS2Open.size && sigS2Open.peekT() <= t) s2Sig?.close(sigS2Open.pop()!);
    while (vopen.size && vopen.peekT() <= t) {
      const fx = vopen.pop()!;
      feed.push(fx);
      feedBooks(fx, book, guard);
      // the engine's Stable-02 windows judge engine candidates only: signals have their own window (8 Oct)
      if (!sigCfg(fx.cfg ?? "")) s2?.close(fx);
    }
    while (open.size && open.peekT() <= t) {
      const x = open.pop()!;
      counts.add(x, -1);
      const k = Math.floor(x.exitT / H);
      hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
      if (sigCfg(x.cfg)) {
        const src = signalSourceOf(x.cfg.split("|")[1]);
        let l = srcClosed.get(src);
        if (!l) srcClosed.set(src, (l = []));
        l.push({ exitT: x.exitT, r: x.r });
      }
    }
  };

  // (tape, trade index) by entry time; ranked per step: only the step's active signals are materialised
  // the tapes end at the run's end: their positions still open there are orders of the run too (marked to market),
  // or the run would count only the orders that closed in time — a bias toward configs that exit fast
  const markOpen = stopT === endT;
  const sigCands: Array<{ e: number; i: number; tp: ConfigTape; key: string; op?: OpenPosition }> = [];
  let built = 0;
  for (const tp of sigTapes) {
    if (++built % 200 === 0) yield -1; // (a slice, not a simulated step)
    // keyed per direction (sigActiveKey): long and short of a signal on a symbol are active apart
    const take = (key: string) => o.signalRank || !o.signalActive || o.signalActive.has(key);
    for (let i = 0; i < tp.n; i++) {
      const e = tp.entryT[i];
      if (e < warmT || e >= stopT) continue;
      const key = sigUnitKey(tp, tp.syms[tp.symI[i]], tp.side[i], !!o.signalConfigUnits);
      // the warm-up's candidates feed the records; the funnel counts the run's own
      const own = e >= startT;
      if (own) sigFunnel.candidates++;
      if (take(key)) sigCands.push({ e, i, tp, key });
      else if (own) inactiveSig(tp.side[i]);
    }
    if (markOpen)
      for (const op of tp.open) {
        if (op.entryT < warmT || op.entryT >= stopT) continue;
        const key = sigUnitKey(tp, op.sym, op.side, !!o.signalConfigUnits);
        const own = op.entryT >= startT;
        if (own) sigFunnel.candidates++;
        if (take(key)) sigCands.push({ e: op.entryT, i: -1, tp, key, op });
        else if (own) inactiveSig(op.side);
      }
  }
  sigCands.sort((a, b) => a.e - b.e);
  let sp = 0;
  let held = new Set<string>();
  const signalSteps: Array<{ t: number; keys: string[] }> = [];
  // the hourly signal index, shared by every run over the same tape set
  // (its slices yield −1: not a simulated step)
  let sigIdx: SignalGroup[] = [];
  if (o.signalRank && sigTapes.length) {
    const ig = signalIndexGen(sigTapes, tapes, !!o.signalConfigUnits);
    for (let r = ig.next(); ; r = ig.next()) {
      if (r.done) {
        sigIdx = r.value;
        break;
      }
      yield -1;
    }
    // a pair held only for its open positions (outside signalBasePassed) opens nothing new: it never takes one of
    // the `count` active slots (it took them from the pairs that may trade, which then never traded)
    const passed = o.signalBasePassed;
    if (passed) {
      // the Base gate removes a pair before any decision: each removed pair is one candidate of the signal family refused
      // by the named gate "signalBase" (10 Oct, W1). A run where the gate removes every pair then reads as named refusals,
      // not as an empty family. The unit is the pair here, the order at a decision; a run's family is read by its refusals.
      const gate = signalBaseGate(sigIdx, passed);
      sigIdx = gate.kept;
      if (gate.gated > 0) {
        const g = gate.gated;
        candidatesByKind.sig = (candidatesByKind.sig ?? 0) + g;
        candidatesByRange.sig = (candidatesByRange.sig ?? 0) + g;
        skips.signalBase = (skips.signalBase ?? 0) + g;
        (skipsByKind.sig ??= {}).signalBase = ((skipsByKind.sig ?? {}).signalBase ?? 0) + g;
        (skipsByRange.sig ??= {}).signalBase = ((skipsByRange.sig ?? {}).signalBase ?? 0) + g;
      }
    }
  }
  let stepOpts: WalkForwardOptions = o;
  // the step's hedge-only signals (negative-hour hedge; outside the ranked set)
  let hedgeKeys = new Set<string>();
  for (let t = warmT; t < stopT; t += stepH * H) {
    // a warm-up step (before the run's start): its candidates feed the records and are never executed
    const warming = t < startT;
    // every order closed before the step counts for this step's decisions (hedge hours, coordination state)
    settle(t);
    if (o.signalRank && sigTapes.length) {
      const act = activeSignalsAt(sigIdx, t, o.signalRank, Math.max(o.longH, o.preH));
      hedgeKeys = new Set();
      if (o.coord?.enabled && o.coord.hedge) {
        const neg = new Set<number>();
        for (const [h, v] of hourNet) if (v < 0 && h < Math.floor(t / H)) neg.add(h);
        for (const k of hedgeSignalsAt(sigIdx, t, neg, Math.max(o.longH, o.preH), {
          minN: o.coord.hedgeMinN ?? HEDGE_DEFAULTS.minN,
          minPf: o.coord.hedgeMinPf ?? HEDGE_DEFAULTS.minPf,
        }))
          if (!act.has(k)) hedgeKeys.add(k);
      }
      const all = hedgeKeys.size ? new Set([...act, ...hedgeKeys]) : act;
      stepOpts = { ...o, signalActive: all };
      if (!warming) signalSteps.push({ t, keys: [...all] });
      yield -1; // (a slice: the ranking and the step's executions are separate pieces of work)
    }
    // fixed mode in slices (the selection scores every tape)
    const sel = o.mode === "fixed" ? yield* selectFixedGen(selTapes, t, o) : null;
    const { picks, eligible } = withProbe(
      o.mode === "durable"
        ? selectDurable(selTapes, t, o, held)
        : o.mode === "fixed"
          ? sel!
          : selectAt(selTapes, t, o),
      selTapes,
      t,
      o,
    );
    held = new Set(picks.map((p) => p.id));
    // the confirmation pool's picks: the same selection under range-neutral options (confirmPoolOptions). A candidate
    // belongs to the one step whose window holds its entry, so the step's dedupe set starts empty
    poolSeen.clear();
    const poolSel = o.mode === "fixed" ? yield* selectFixedGen(poolTapes, t, poolO) : null;
    const poolPicks = (
      o.mode === "durable"
        ? selectDurable(poolTapes, t, poolO, poolHeld)
        : o.mode === "fixed"
          ? poolSel!
          : selectAt(poolTapes, t, poolO)
    ).picks;
    poolHeld = new Set(poolPicks.map((p) => p.id));
    const cands: Array<{ tr: Trade; tp: ConfigTape; pool?: boolean }> = [];
    let pi = 0;
    for (const [list, pool] of [
      [picks, false],
      [poolPicks, true],
    ] as const) {
      for (const p of list) {
        if (++pi % 500 === 0) yield -1;
        const tp = (pool ? poolById : byId).get(p.id)!;
        // a trade entering in [t, t + step) exits at or after t: the scan starts at the first exit ≥ t (exit order)
        for (let i = lowerBound(tp.exitT, t); i < tp.n; i++) {
          const e = tp.entryT[i];
          if (e >= t && e < t + stepH * H && e < stopT) cands.push({ tr: tradeAt(tp, i), tp, pool });
        }
        if (markOpen)
          for (const op of tp.open)
            if (op.entryT >= t && op.entryT < t + stepH * H && op.entryT < stopT)
              cands.push({ tr: markedOpenTrade(tp, op, stopT), tp, pool });
      }
    }
    while (sp < sigCands.length && sigCands[sp].e < t + stepH * H) {
      const c = sigCands[sp++];
      if (o.signalRank && !stepOpts.signalActive?.has(c.key)) {
        if (c.e >= startT) inactiveSig(c.op ? c.op.side : c.tp.side[c.i]);
        continue;
      }
      cands.push({ tr: c.op ? markedOpenTrade(c.tp, c.op, stopT) : tradeAt(c.tp, c.i), tp: c.tp });
    }
    // best first: at the same entry time the better candidate takes a capped slot first
    const prio = bestFirst(picks, stepOpts);
    cands.sort(
      (a, b) =>
        a.tr.entryT - b.tr.entryT ||
        prio(a.tp, a.tr.sym, a.tr.side) - prio(b.tp, b.tr.sym, b.tr.side) ||
        a.tr.cfg.localeCompare(b.tr.cfg),
    );
    let taken = 0;
    let skipped = 0;
    let net = 0;
    let ci = 0;
    for (const { tr, tp, pool } of cands) {
      // a busy step is worked through in slices
      if (++ci % 300 === 0) yield -1;
      settle(tr.entryT);
      if (pool) {
        // a confirmation candidate of the range-neutral pool: processed on its entry, taken or not, never executed
        const pk = `${tr.cfg}|${tr.sym}|${tr.side}|${tr.entryT}`;
        if (!poolSeen.has(pk)) {
          poolSeen.add(pk);
          engineOpen.add(tr.sym, tr.side, 1);
          poolOpen.push(tr.exitT, { sym: tr.sym, side: tr.side });
          confirmCands.push({ cfg: tr.cfg, sym: tr.sym, side: tr.side, entryT: tr.entryT, exitT: tr.exitT });
          if (s2Sig) sigS2Open.push(tr.exitT, { exitT: tr.exitT, ...blockEntryOf(tr) });
        }
        continue;
      }
      // the candidate's own result feeds the Block sources when it closes, whether it executes or not
      const fk = `${tr.cfg}|${tr.sym}|${tr.side}|${tr.entryT}`;
      let fx = seen.get(fk);
      if (!fx) {
        const fe = blockEntryOf(tr);
        fx = { exitT: tr.exitT, ...fe };
        seen.set(fk, fx);
        vopen.push(fx.exitT, fx);
        if (s2Sig && sigCfg(tr.cfg)) sigS2Open.push(fx.exitT, fx);
      }
      // a warm-up candidate is fed to the records above, never executed
      if (warming) continue;
      {
        const kk = sigCfg(tr.cfg) ? "sig" : kindOfId(tr.cfg);
        candidatesByKind[kk] = (candidatesByKind[kk] ?? 0) + 1;
        const rk = sigCfg(tr.cfg) ? "sig" : rangeOfId(tr.cfg);
        candidatesByRange[rk] = (candidatesByRange[rk] ?? 0) + 1;
      }
      // signal skips are named apart from the engine's ("sig:why"): the same reason means different gates
      const skipName = (why: string) => (sigCfg(tr.cfg) ? `sig:${why}` : why);
      // the same order twice: two indications computing the same signal (e.g. an EMA cross under two names) give
      // identical trades at the same protect — executed once, or the duplicate doubles the position
      const dk = dupKey(tr);
      if (executedKeys.has(dk)) {
        skipped++;
        skip(skipName("duplicate"), tr.side, tr.cfg);
        continue;
      }
      const hourKey = Math.floor(tr.entryT / H);
      let why = "";
      // engine orders and signal orders are capped each on their own (same class only)
      const cls = sigCfg(tr.cfg);
      const caps = capsOf(o, cls);
      const gateOn = cls && o.signalSourceGate?.enabled;
      // hedge-only signal: trades while the book is losing (this or the previous hour), without confirmation
      const hedging =
        cls &&
        hedgeKeys.size > 0 &&
        hedgeKeys.has(sigUnitKey(tp, tr.sym, tr.side, !!o.signalConfigUnits));
      const bookLosing =
        (!o.coord?.hedgePrevOnly && (hourNet.get(hourKey) ?? 0) < 0) ||
        (hourNet.get(hourKey - 1) ?? 0) < 0;
      const coordRaw = coordBlock(o.coord, tr, hourNet, open.items, engineOpen);
      const coordWhy =
        (hedging
          ? bookLosing
            ? coordRaw === "confirm"
              ? null
              : coordRaw
            : "hedgeIdle"
          : coordRaw) ??
        (cls ? s2Sig : s2)?.blocked(tr.sym, tr.side) ??
        (gateOn &&
        sourceUnstable(
          srcClosed.get(signalSourceOf(tr.cfg.split("|")[1])),
          tr.entryT,
          o.signalSourceGate!,
        )
          ? "sourceUnstable"
          : null);
      if (o.guardPct > 0 && (hourNet.get(hourKey) ?? 0) <= -o.guardPct) why = "hourGuard";
      else if (coordWhy) why = coordWhy;
      else if (counts.dupe(tr.sym, tr.cfg, tr.side)) why = "dupe";
      else if (counts.perSymbol(tr.sym, cls) >= caps.perSymbol) why = "perSymbol";
      else if (counts.open(cls) >= caps.maxOpen) why = "maxOpen";
      else if (counts.perSide(tr.side, cls) >= caps.perSide) why = "perSide";
      else if (counts.positionsFull(tr.sym, tr.side, cls, cls ? o.signalMaxPositions : o.maxPositions))
        why = "maxPositions";
      else if (o.entryCrowd && (crowd.get(crowdKey(tr.cfg, tr.sym, tr.side, tr.entryT)) ?? 0) >= crowdCapOf(o, tr.cfg))
        why = "crowd";
      const dec = why
        ? null
        : execDecision(tp, tr.entryT, stepOpts, { book, guard, sym: tr.sym, side: tr.side, market });
      if (dec && !dec.ok) why = dec.why;
      if (why || !dec || !dec.ok) {
        skipped++;
        skip(skipName(why), tr.side, tr.cfg);
        continue;
      }
      // the sources that raised it pause once it closes positive (the feed entry carries them into the book)
      if (dec.vol > 1 && dec.src?.length) fx.bsrc = dec.src;
      // Stable-02 relation volume on top of the Block volume (the stack stays within the Block maximum); a signal's from
      // the signals' instance
      const stackCap = o.block.mode === "overall" ? 8 : o.block.maxMult;
      const s2Of = cls ? s2Sig : s2;
      const cv = s2Of ? Math.min(s2Of.volume(tr.entryT), Math.max(1, stackCap / dec.vol)) : 1;
      const x: Trade = {
        ...tr,
        r: tr.r * dec.vol * cv,
        vol: (tr.vol ?? 1) * dec.vol * cv,
        mult: dec.vol * cv,
        ...(cv !== 1 ? { coordVol: cv } : {}),
        ...(hedging ? { hedge: true } : {}),
        level: tp.kind.startsWith("dca") || tp.kind === "axis" ? tr.level : dec.level,
        ...(dec.legs ? { legs: dec.legs } : {}),
      };
      executedKeys.add(dk);
      if (o.entryCrowd) {
        const ck = crowdKey(tr.cfg, tr.sym, tr.side, tr.entryT);
        crowd.set(ck, (crowd.get(ck) ?? 0) + 1);
      }
      if (x.markedOpen) openAtEnd.push(x);
      else trades.push(x);
      taken++;
      net += x.r * 100;
      open.push(x.exitT, x);
      counts.add(x, 1);
    }
    if (!warming) steps.push({ t, main: eligible, real: picks.map((p) => p.id), taken, skipped, net });
    yield t;
  }

  trades.sort((a, b) => a.exitT - b.exitT);
  yield -1; // (summary slices, not simulated steps)
  const stats = statsOf(openAtEnd.length ? [...trades, ...openAtEnd] : trades, stopT);
  yield -1;
  const hn = hourlyNet(trades);
  const perHour = new Map<number, { gp: number; gl: number }>();
  for (const x of trades) {
    const k = Math.floor((x.exitT - 1) / H) * H;
    const e = perHour.get(k) ?? { gp: 0, gl: 0 };
    if (x.r > 0) e.gp += x.r;
    else e.gl -= x.r;
    perHour.set(k, e);
  }
  const hourly = [...hn.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, e]) => ({
      t,
      net: e.net,
      n: e.n,
      pf: profitFactor(perHour.get(t)?.gp ?? 0, perHour.get(t)?.gl ?? 0),
    }));
  yield -1;
  const blocks = runBlocks(trades, startT, stopT);
  yield -1;
  const group = (key: (t: Trade) => string) => {
    const m = new Map<string, Trade[]>();
    for (const tr of trades) {
      const k = key(tr);
      (m.get(k) ?? m.set(k, []).get(k)!).push(tr);
    }
    return m;
  };
  const byConfig = [...group((t) => t.cfg).entries()]
    .map(([id, xs]) => {
      const s = statsOf(xs);
      return { id, n: s.n, net: s.net, pf: s.pf };
    })
    .sort((a, b) => b.net - a.net);
  const byKind: WalkForwardResult["byKind"] = {};
  for (const [k, xs] of group((t) => t.kind ?? "normal")) {
    const s = statsOf(xs);
    byKind[k] = { n: s.n, net: s.net, pf: s.pf };
  }
  const sideStat = (sd: number) => {
    const s = statsOf(trades.filter((x) => x.side === sd));
    return { n: s.n, net: s.net, pf: s.pf };
  };
  const bySide = { long: sideStat(1), short: sideStat(-1) };
  const stable = runStable(stats, blocks, o.gates.minPf);
  const { protects: _p, dcaProtects: _d, ...rest } = o;
  // the end-of-run state paper / live continue from: every order closed by the end counts
  settle(stopT);
  // candidates still open at the end close the feed, in exit order (they never reached the books)
  while (vopen.size) feed.push(vopen.pop()!);
  return {
    startT,
    endT: stopT,
    opts: rest,
    trades,
    openAtEnd,
    stats,
    hourly,
    blocks,
    steps,
    byConfig,
    byKind,
    bySide,
    skips,
    skipsByRange,
    skipsByKind,
    candidatesByKind,
    candidatesByRange,
    skipsBySide,
    ...(sigTapes.length ? { signalFunnel: sigFunnel } : {}),
    stable,
    feed,
    confirmCands,
    ...(s2 ? { s2: s2.snapshot(stopT) } : {}),
    ...(o.coord?.enabled && o.coord.hedge && sigIdx.length
      ? {
          hedgeEnd: [
            ...hedgeSignalsAt(
              sigIdx,
              stopT,
              new Set(
                [...hourNet].filter(([h, v]) => v < 0 && h < Math.floor(stopT / H)).map(([h]) => h),
              ),
              Math.max(o.longH, o.preH),
              {
                minN: o.coord.hedgeMinN ?? HEDGE_DEFAULTS.minN,
                minPf: o.coord.hedgeMinPf ?? HEDGE_DEFAULTS.minPf,
              },
            ),
          ],
        }
      : {}),
    ...(o.signalRank
      ? {
          signalSteps,
          signalActiveEnd: sigTapes.length
            ? [...activeSignalsAt(sigIdx, stopT, o.signalRank, Math.max(o.longH, o.preH))]
            : [],
        }
      : {}),
  };
}
