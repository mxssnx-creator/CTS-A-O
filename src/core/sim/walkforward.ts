import { slRatiosOf } from "../sl-ratios.ts";
import { slWithinBounds, type SlBounds } from "../sl-calibration.ts";
import {partialFloorOf, positionStageStats} from "../position-windows.ts";
import { simulationClock } from "../progress.ts";
import { blockPolicyKey, blockRequired, type BlockPolicy } from "../../../shared/cts-lastn/blocks.ts";
import { positionCounts, positionStats, positionTapeValid, type PositionWindows } from "../position-windows.ts";
import {prepareRelationalVolumeFactor} from "../../../shared/cts-volume/ratios.ts";
import { RT_COST } from "../model-cost.ts";
import { EVALUATION_HISTORY_H, PRECALC_HISTORY_H } from "../market/history-requirements.ts";
import { ProcessedLaneReplay, ownedProcessedPolicy, type PreparedProcessedBaseCheck, type ProcessedBaseCheck,
  type ProcessedReplayPolicy, type ProcessedReplayReport, type ProcessedReplaySummary } from "./processed-replay.ts";
import { ProcessedWindowGridReplay, type OppositeProcessedSource } from "./processed-window-grid.ts";
import { PROCESSED_AUTO_PF_SAMPLES, processedGateVerdict, ProcessedWindowIndex, type ProcessedHistoryRow } from "./processed-set.ts";
import { minimumStopFraction } from "../protection-policy.ts";
import { protectSlRatio, protectStepPct } from "../step-pf.ts";
import { addValidatedSetPf, emptyValidatedSetPf, mergeValidatedSetPf, type ValidatedSetPfAccumulator } from "../validated-set-pf.ts";
import { returnWindow } from "../metrics/return-window.ts";
import { DerivedCache, derivedCacheBytes } from "./derived-cache.ts";
import { immutableHistoryGeneration } from "./immutable-history-generation.ts";
import { tapeOpenTimes, tapeOpenView, tapeOpenOverride, storedTapeOpen } from "./tape-open-times.ts";
import { exitScopeSuffix, isHistoricExitConfig } from "../exit-scope.ts";
import { applyPriceDistanceGrid } from "../price-distance-grid.ts";
import { isLowRangeInd, lowRangeGridProtects, lowRangeEnabled } from "../indications/low-range.ts";
import {
  coordVariants,
  EVAL_MIN_SL,
  forEachCoord,
  forEachMicro,
  holdFloorBars,
  plusVariants,
  RANGE_TAGS,
  rangeGateOf,
  minPfOf,
  rangeGated,
  rangeVolumeFactorsOf,
  RANGE_VOLUME_FACTOR_DEFAULTS,
  type CoordTag,
  type RangeVolumeFactors,
  rangeOfId,
  distanceAtFloor,
  trailAtFloor,
  ownSlFloor,
} from "../minimal-coord.ts";
import type { RangeTag } from "../domain/types.ts";
import { createExitProtection } from "./exit-protection.ts";
import { applyTrailingGapBasis, capSignalProtect, capTrailingOnlyProtect, trailingOnlyProtects, isSignalConfig } from "./trailing.ts";
import { SIGNAL_HISTORY_H, SIGNAL_VALID_LAST_N, SIGNAL_EVALUATION_LAST_N } from "../signal-policy.ts";
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
  evaluationSignal,
  configId,
  parseConfigId,
  kindOfId,
  isPlainKind,
  isTrailingKind,
  protectKind,
  laneProtect,
  protectCellKey,
  baseSetsGates,
  passesBase,
  REF_TF,
  seriesOf,
} from "../pipeline/pipeline.ts";
import type { SymStat, Universe } from "../pipeline/pipeline.ts";
import { baseLastNForRange } from "../pipeline/base-lastn.ts";
import { entrySignal } from "../bots/bots.ts";
import { tacticCooldown } from "../indications/filters.ts";
import type { BaseConfigCounter } from "../base-config-counts.ts";
import {
  DEFAULT_BLOCK,
  DEFAULT_DCA,
  DEFAULT_RELATE_ADJUSTMENT,
  DEFAULT_TOGGLES,
  GRID_VARIANTS_MAX,
  MAX_EXTERNAL_STACK,
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
  BlockAttribution,
  Gates,
  RelateAdjustmentConfig,
  RelateParts,
  RelateSource,
  OpenPosition,
  Protect,
  Stats,
  StratKind,
  StrategyToggles,
  Tactics,
  Trade,
} from "../domain/types.ts";
import type { SeriesCache } from "../indications/cache.ts";
import {
  ddrFails as drawdownRatioFails,
  profitFactor,
  scoreStats,
  statsOf,
  settledHourT,
  modeledUnitReturn as unitReturn,
  modeledUnitStatsOf as unitStatsOf,
  type UnitStats,
} from "../metrics/stats.ts";
import { ATR_PERIOD, simulate, splitSides, sideSignal } from "./backtest.ts";
import { cappedExecution, cappedPriceStart, clearCappedProjections, hasMinutePrices, stampCappedOpen, type CappedExecution } from "./capped-execution.ts";
import { pendingFromResult, type PendingTapeEntry, type SimulationCursor, type TapeContinuations, type CursorResult } from "./cursor.ts";
import { headBars } from "../market/bars.ts";
import { symbolDirections } from "./symbol-directions.ts";
import { dcaSnapshot, simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk, snapTpRatio } from "./axis.ts";
import { adjustProtect, setKeyOf, type AdjustState } from "../adjust.ts";
import {
  BlockBook,
  blockBookOf,
  blockDecide,
  blockStackCap,
  BLOCK_SOURCES,
  bookLevels,
  sourcesOf,
  sourceKey,
  type BlockSource,
} from "./block.ts";
import { capRelateParts, combineRelateStack, relateBookOf, relateExternalStackCap, relateFixedStopWithinLimit, type RelateBook } from "./relate-volume.ts";
import { S2Coord } from "./s2coord.ts";
import { isSignalCoordinationInd } from "../signal-coordination.ts";
import { botFamilyOf } from "../bot-stats.ts";
import { INDICATION_BY_ID, isSignalInd, laneOf, signalSourceOf } from "../indications/registry.ts";
import { signalRangeOf } from "../signal-config.ts";
import { isMicroInd, microIndFits, type MicroIndRule } from "../indications/micro.ts";
import { isMicroCalculationInd as isMicroFamilyInd } from "../indications/micro-family.ts";
import {
  acceptKey,
  activationEnd,
  activeSignals,
  activeSignalsGen,
  EngineSideIndex,
  engineSideKey,
  engineSideKeyFor,
  guardKey,
  SignalAcceptIndex,
  type SignalActivationEnd,
  SignalGuard,
  type SignalUnitReport,
  sigActiveKey,
  signalActiveHas,
  sideAcceptKey,
} from "../signals.ts";
import type {
  SignalAccept,
  SignalClusterSettings,
  SignalSettings,
  SignalSourceGate,
  SignalVolumeFactors,
} from "../signal-config.ts";
import { signalVolumeFactorsOf } from "../signal-config.ts";
import { volumeFactorForStrategy } from "../volume-factor.ts";
import { volumeRatio } from "../volume-ratio.ts";

const H = 3_600_000;

/** Signals' independent evidence window; indicator warmup is loaded separately. */
export const signalWindowH = (o: { preH: number; signalLongH?: number; longH?: number }): number => signalHistoryHours(o);

/** Stable merge sort that lets the server yield during large multi-symbol replay orderings. */
export function* stableSortGen<T>(
  values: T[],
  compare: (a: T, b: T) => number,
): Generator<number, void> {
  const n = values.length;
  if (n < 2) return;
  const scratch = new Array<T>(n);
  let source = values;
  let target = scratch;
  let work = 0;
  const yieldEvery = n >= 2048 ? 128 : 512;
  const shouldYield = () => {
    return ++work % yieldEvery === 0;
  };
  for (let width = 1; width < n; width *= 2) {
    for (let left = 0; left < n; left += width * 2) {
      const mid = Math.min(left + width, n);
      const right = Math.min(left + width * 2, n);
      let a = left;
      let b = mid;
      let out = left;
      while (a < mid && b < right) {
        target[out++] = compare(source[a], source[b]) <= 0 ? source[a++] : source[b++];
        if (shouldYield()) yield -1;
      }
      while (a < mid) {
        target[out++] = source[a++];
        if (shouldYield()) yield -1;
      }
      while (b < right) {
        target[out++] = source[b++];
        if (shouldYield()) yield -1;
      }
    }
    [source, target] = [target, source];
  }
  if (source !== values) {
    for (let i = 0; i < n; i++) {
      values[i] = source[i];
      if (shouldYield()) yield -1;
    }
  }
}

/** Sort short native runs, then merge them cooperatively to bound long selection slices. */
function* selectionSortGen<T>(values: T[], compare: (a: T, b: T) => number): Generator<number, void> {
  const n = values.length, chunk = 2048;
  if (n < 2) return;
  if (n <= chunk) { values.sort(compare); return; }
  for (let left = 0; left < n; left += chunk) {
    const run = values.slice(left, Math.min(n, left + chunk));
    run.sort(compare);
    for (let i = 0; i < run.length; i++) values[left + i] = run[i];
    yield -14;
  }
  let source = values, target = new Array<T>(n), work = 0;
  for (let width = chunk; width < n; width *= 2) {
    for (let left = 0; left < n; left += width * 2) {
      const mid = Math.min(left + width, n), right = Math.min(left + 2 * width, n);
      let a = left, b = mid, out = left;
      while (a < mid && b < right) {
        target[out++] = compare(source[a], source[b]) <= 0 ? source[a++] : source[b++];
        if (++work % 1024 === 0) yield -14;
      }
      while (a < mid) { target[out++] = source[a++]; if (++work % 1024 === 0) yield -14; }
      while (b < right) { target[out++] = source[b++]; if (++work % 1024 === 0) yield -14; }
    }
    [source, target] = [target, source];
  }
  if (source !== values) for (let i = 0; i < n; i++) {
    values[i] = source[i];
    if (++work % 1024 === 0) yield -14;
  }
}

/** One fail-closed PF gate for Base, selection and last-N (no fabricated wins from NaN/overflow). */
function qualifiedPf(gp: number, gl: number, floor: number): boolean {
  if (!(Number.isFinite(gp) && Number.isFinite(gl) && gp >= 0 && gl >= 0 && Number.isFinite(floor)))
    return false;
  const pf = profitFactor(gp, gl);
  return Number.isFinite(pf) && pf >= floor;
}

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
  /** Multiplier applied only to hedge-selected Signal entries (0.2–5 by 0.2); 1 is neutral. */
  hedgeVolumeFactor?: number;
  /** hedge only after a losing previous hour (default false: also while the current hour is negative) */
  hedgePrevOnly?: boolean;
  /**
   * Stable-02 pause per side: the paper book refuses an entry while its symbol × direction is paused (`sym|±1`, the
   * keys S2Coord holds and the simulation's blocked(sym, side) judges). Off (default): the paper book compares the bare
   * symbol with those keys, which never match, so the pause never refuses a paper entry. Default off until a causal
   * eval decides it (docs/positive-coordinations.md).
   */
  s2Side?: boolean;
}

// causal validation, 8 days × 12 symbols (docs/signals-validation.md): confirmation PF 1.32 → 1.58, drawdown halved;
// the hour lock and the cooldown cost net on every variant; opposite-entry blocking mixed
export const DEFAULT_COORD: CoordSettings = {
  enabled: true,
  hourLock: 0,
  cooldown: "off",
  conflict: false,
  confirm: true,
  hedgeVolumeFactor: 1,
};

/** strict negative-hour hedge selection (the loose PF 1.3 / 5 lost on 8 days, docs/signals-validation.md) */
export const HEDGE_DEFAULTS = { minPf: 2, minN: 10 } as const;
const numOr = (v: unknown, d: number, lo: number, hi: number) =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v))
    ? d
    : Math.min(hi, Math.max(lo, Number(v)));
const volumeFactor = volumeRatio;

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
    hedgeVolumeFactor: volumeFactor(c?.hedgeVolumeFactor),
    hedgePrevOnly: c?.hedgePrevOnly === true,
    // (a key only when on: the normalised object of the default is unchanged)
    ...(c?.s2Side === true ? { s2Side: true } : {}),
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
 * executed orders closed so far; `open` = executed orders open at the entry. `confirmPool`: what confirmation judges —
 * the engine candidates (taken or not) open at the entry; without it, the executed engine orders in `open` (the rule
 * before 6 Oct, which refused most signals: an engine candidate a cap or gate did not take never confirmed).
 */
export function coordBlock<T extends { cfg: string; sym: string; side: number }>(
  c: CoordSettings | undefined,
  tr: { cfg: string; sym: string; side: number; entryT: number },
  hourNet: ReadonlyMap<number, number>,
  open: ReadonlyArray<T>,
  confirmPool?: ConfirmPool | null,
  includeOpen?: (position: T) => boolean,
): string | null {
  if (!c?.enabled) return null;
  const hk = Math.floor(tr.entryT / H);
  const exit = isHistoricExitConfig(tr.cfg);
  const signal = sigCfg(tr.cfg) && !exit;
  if (c.hourLock > 0 && (hourNet.get(hk) ?? 0) >= c.hourLock) return "hourLock";
  if (c.cooldown !== "off" && (hourNet.get(hk - 1) ?? 0) < 0 && (c.cooldown === "all" || signal))
    return "cooldown";
  if (c.conflict && open.some((x) => (!includeOpen || includeOpen(x)) && x.sym === tr.sym && x.side !== tr.side &&
      (exit ? x.cfg === tr.cfg : !isHistoricExitConfig(x.cfg)))) return "conflict";
  if (
    c.confirm &&
    signal &&
    !(confirmPool
      ? confirmPool.confirms(tr.sym, tr.side, tr.entryT)
      : open.some((x) => (!includeOpen || includeOpen(x)) && x.sym === tr.sym && x.side === tr.side && !sigCfg(x.cfg) && !isHistoricExitConfig(x.cfg)))
  )
    return "confirm";
  return null;
}

/** The ranges wf.rangeOpts sets apart: engine ranges, "sig" for Signals, and "wide" for untagged engine configs. */
export const RANGE_OPT_TAGS = ["wide", "mc", "mn", "mp", "sh", "gn", "lg", "lr", "sig", "exit"] as const;
export type RangeOptTag = (typeof RANGE_OPT_TAGS)[number];
/** One range's seat and entry options (WalkForwardOptions.rangeOpts); each one unset is the global value. */
export interface RangeOpts {
  /** Both the overall switch and this range switch must allow standalone base progression. */
  normal?: boolean;
  /** Master within this range, including trailing used by additional strategies. */
  trailing?: boolean;
  /** seat validation: the last this-many closes (WalkForwardOptions.validLastN) */
  validLastN?: number;
  /** seat cool-off in hours (WalkForwardOptions.seatQuietH) */
  seatQuietH?: number;
  /** continuous stability blocks (Gates.stableBlocks) */
  stableBlocks?: number;
  /** entry last-N (WalkForwardOptions.lastN) */
  lastN?: number;
  /** selection mode (WalkForwardOptions.mode) */
  mode?: "fixed" | "durable";
}

export interface WalkForwardOptions {
  /** Opt-in native model stages; full own-parent windows, no raw-history bootstrap. Paper/live fail closed. */
  processedStages?: ProcessedReplayPolicy;
  /** Offline model warmup; the caller must build this exact Base cohort at or before fromT. */
  processedWarmup?: { fromT: number; untilT: number; baseCutT: number };
  /** Per Axis set, relative to the corresponding base volume. Captured once at entry. */
  axisVolumeFactor?: number;
  /** Historic Exit owns its range ratio; never inherits Wide or a Signal parameter range. */
  exitVolumeFactor?: number;
  /** execution sizing multiplier relative to the normal factor, per strategy target range */
  rangeVolumeFactors?: RangeVolumeFactors;
  /** execution sizing multiplier relative to the normal factor, per independent Signal range */
  signalRangeVolumeFactors?: { short: number; medium: number };
  preH: number;
  simH: number;
  stepH: number;
  /**
   * Continuous evaluation (default on, position-count policy and fixed seat mode): inside each step the seat picks are
   * re-derived every `decisionMin` minutes from the closes settled so far, so a config enters as soon as its own windows
   * qualify and stops as soon as they no longer do, instead of waiting for the next hourly boundary. Entries were
   * always judged on the closes before the entry; this releases the hourly pick list that gated them. false = hourly.
   */
  continuous?: boolean;
  /** minutes between re-derivations while `continuous` (1–60, default 1) */
  decisionMin?: number;
  /** Per-run memo of position evaluations by tape and settled-close count (created by walkForwardGen; exact). */
  evalMemo?: EvalMemo;
  /** Measurement only. Summary retains passed/evaluated counts and accepted-window sums without one row per config/hour. */
  recordValidation?: boolean | "summary";
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
   * Signals: the closes their validation and entry last-N look at (instead of validLastN / lastN). A signal config
   * closes ~10 times in a 48 h window, so the engine's 50 / 25 could never pass and signals never traded. Unset =
   * the engine's values.
   */
  signalValidLastN?: number;
  /** Historic Exit's own rolling sample and qualification thresholds. */
  exitMinTrades?: number;
  exitMinPf?: number;
  exitMinGreenHourShare?: number;
  exitMaxDdr?: number;
  /**
   * Ranges that open nothing new (range tags, e.g. "mc"): the walk-forward mirror of `live.excludeRanges`, so a
   * session measures what the desk sends — the range keeps computing and its tapes are unchanged. Unset = none.
   */
  excludeRanges?: string[];
  /**
   * Entry crowding cap per range ("mc", "mn", "mp", "sh", "gn", "lg", "lr", "wide", "sig"): at most this many configs of
   * the range enter on one symbol × side × entry time — the best-ranked first (candidates are taken best first). One
   * signal bar fires every cell of a range at once: on 6 Oct (24 h) a single LYN-USDT bar entered 229 Micro configs,
   * all stopped, −472 % — Micro's whole loss. Unset / 0 = no cap.
   */
  entryCrowd?: Partial<Record<string, number>>;
  /**
   * One order per pair event (operator, 17 Nov; default on): per indicator pair × symbol × side × strategy type × entry
   * minute only the best-ranked config executes. The others are still evaluated and recorded on their own lanes, never
   * funded: a 6-symbol replay entered up to 2,140 variants of one pair in one minute (10,200 closes from 99 events).
   */
  onePerPairEvent?: boolean;
  /**
   * A comparison run that reads only trades, open-at-end and skips (session variants): the result carries no feed
   * and no signal-step snapshots. The books, guards and every decision are unchanged (they consume each entry as it
   * settles); only the returned copies, which grow with every candidate and every changed minute, are not kept.
   */
  resultLean?: boolean;
  /** under onePerPairEvent: every Axis config is its own event (default true); false = Axis variants of a pair share one */
  pairEventAxisOwn?: boolean;
  /**
   * Seat cool-off in hours (0 / unset = off): an engine config whose own last close (its tape, any symbol) is less
   * than this many hours before an entry does not take it (skip "seatQuiet"). The PF gap analysis (13 Oct): orders
   * of a config that closed within the last 4 h realized PF 0.39, those with no close for 4 h 0.63 (D1) and 1.09
   * (holdout) — the seat validation picks configs at their equity peak, and their next hours reverse. Measured as a
   * lever; on only after a causal comparison (docs/positive-coordinations.md). With seatSideCooloff only the entry's
   * own direction counts.
   */
  seatQuietH?: number;
  /**
   * Seat cool-off per direction (only with seatQuietH on): true = a close of the engine config in the entry's own
   * direction starts the cool-off, a close in the opposite direction does not; the symbol is not part of it (any
   * symbol, as before). Unset / false = both directions count (today's). Long and short run independently (6 Oct,
   * docs/positive-coordinations.md); the default stays off until a causal comparison on the walk-forward records it.
   */
  seatSideCooloff?: boolean;
  /**
   * Contrarian execution — an EVALUATION knob (off; the paper book and live do not implement it): the seat selection
   * is unchanged, and each seated engine config's entries execute on its mirror's tape (follow ↔ revert: the same
   * entry bars on the other side, the same protect). The PF gap analysis (13 Oct): the other side at the real entries
   * gave PF 1.1-1.5 in every half (D1a, D1b, both holdout halves) offline. A seat whose mirror has no tape takes no entry.
   */
  invertSeats?: boolean;
  /**
   * Per-range seat and entry options: a range ("wide" = the untagged engine configs — the Wide grid and the Axis / DCA
   * ladders; "sig" = Signals) takes rangeOpts[tag][k] in place of the global validLastN and lastN for Signals, and
   * validLastN, seatQuietH, gates.stableBlocks, lastN and mode for engine ranges; a key it leaves unset is the global
   * value. The seats are picked per range, but the ranges are not
   * independent: they interact through Block and the signal confirmation, so a range's
   * response measured in one run with a global value need not hold once other ranges change too — a per-range winner
   * is a candidate, and adopting a combination needs a causal run of that combination recorded in
   * docs/positive-coordinations.md. `mode` selection remains range-specific even under legacy pair seats. longH stays global (the selection keeps one
   * window cursor per step). Unset = the global values everywhere, on the same code path.
   */
  rangeOpts?: Partial<Record<RangeOptTag, RangeOpts>>;
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
  /** Retained legacy setting; range seat identities are always separate. */
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
  /** Standalone Historic Exit pairs that passed their own Normal-system Base return-PF gate. */
  exitBasePassed?: ReadonlySet<string>;
  /** Exact engine pair → admitted range tags ("" = Wide), before diagnostic allSets expansion. */
  basePassedRanges?: Readonly<Record<string, readonly string[]>>;
  /** Exact Base-qualified targets, retained before allSets widens diagnostic construction. */
  basePassedTargets?: Readonly<Record<string, Readonly<Record<string, readonly number[]>>>>;
  /** Qualified pairs whose builder policy admits independent untagged DCA/Axis, before allSets expansion. */
  baseWideLadderPairs?: ReadonlySet<string>;
  /** Whether untagged ordinary Wide candidates may be newly admitted. Signals own their independent range. */
  wideEnabled?: boolean;
  /**
   * Which configs a step may seat. "validated" (default): only the validated set V — the configs that pass the
   * evaluation (configEval) at the run's start
   * (`validated`); each later step selects from V alone (its gates may drop a member for a step, never add a config
   * outside V), and V is refreshed only by the next compute's Base + set evaluation. Explicit "pool" revalidates every
   * config of a Base-passed pair at each step. Not with probe / invertSeats (they seat configs outside V).
   */
  seatSet?: "validated" | "pool";
  /**
   * grid.baseCells: the Base-passed cells per pair (passedCellsOf). A tape of a range the pair has cells for, whose cell
   * is not among them, takes no seat — whatever built it (a carried tape of an earlier compute, a measurement set).
   * Unset = the pair / range level.
   */
  basePassedCells?: Readonly<Record<string, PassedCells>>;
  /** Per-pair exact no-TP Base proofs. Present empty means no new trailing-only entry is qualified. */
  basePassedTrailingOnlyCells?: Readonly<Record<string, PassedCells>>;
  /** V's ids (seatSet "validated"): given, or evaluated once at the run's start (WalkForwardResult.validated) */
  validated?: ReadonlySet<string>;
  /**
   * signal pairs ("bot|ind") that passed their Base gate in the current compute: a held signal pair keeps its tapes
   * to manage its positions but opens nothing new. Unset = no restriction.
   */
  signalBasePassed?: ReadonlySet<string>;
  /**
   * evaluation families (CTS_CORE_FAMILY with a signal family): only the configs of these families (their bot-stats
   * names, botFamilyOf) execute. Every other candidate is processed as on the desk — it confirms signals and feeds the
   * Block sources — and skipped as "family" before any cap. Unset = every config (the desk).
   */
  family?: readonly string[];
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
  /**
   * The window (hours) of the Signals' own history: activation (activeSignals rules), hedge and the end-of-run report read
   * the last signalLongH hours of the signal sources' closes, independent of the engine's longH/preH.
   * Operator, 23 Oct: default 100 hours; indicator warmup remains outside this evidence window.
   */
  signalLongH?: number;
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
  /** strategy config sets paused by live feedback ("bot|ind|kind", Historic Exit also includes its tactic) */
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
  /** Optional cross-family coordination: DCA / Axis must beat a base result of the same pair. Off by default. */
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
   * results, not against the pair's base (default). "pair": one best config per pair × range × type. Historic Exit
   * and Micro always retain one seat per exact config, including with legacy pair settings.
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
   * direction acceptance: a Signal entry on a side opens only while settled accepted post-Base orders of that side
   * (all sources, symbols and configs pooled, closed before the entry) had a PF of at least minPf over the last
   * `hours` hours — fewer than minTrades closes: judged on twice the hours, still fewer = valid (`acceptOnWindow`;
   * unset / disabled = off)
   */
  signalSideAccept?: SignalAccept;
  /** signals' Normal / Trailing trade on their own: Normal off and Block Active's skip do not apply (Block raises) */
  signalOwnBase?: boolean;
  /** New Signal orders use the configured coordination sources. */
  signalCoordinationOnly?: boolean;
  /** signal orders have order caps of their own (per symbol, open); positions (symbol × direction) share maxPositions with the engine */
  signalPerSymbol?: number;
  signalMaxOpen?: number;
  /** max open signal POSITIONS (distinct symbol × direction, long and short counted apart); 0 / unset = no limit */
  signalMaxPositions?: number;
  /** Extra per-type execution multipliers; derived from signals settings, not a walk-forward user override. */
  indicationVolumeFactors?: SignalVolumeFactors;
  relationalVolumeRatios?: import("../../../shared/cts-volume/ratios.ts").RelationalVolumeRatios;
  toggles: StrategyToggles;
  block: BlockConfig;
  /** Settled-order volume adjustment; undefined on legacy research callers is inert. */
  relate?: RelateAdjustmentConfig;
  /** Explicit diagnostic source-level capture; off by default and independent of execution decisions. */
  blockTrace?: boolean;
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

export const DEFAULT_GRID: ProtectGridSpec = {
  volumeFactor: 1,
  tp: [0.026, 0.035, 0.05, 0.07],
  slOfTp: [1, 1.5, 2, 2.5],
  trailOfTp: [0, 0.5],
  minTrail: 0.006,
  minSl: 0.01,
  holdH: [8, 24],
  trailStep: 1,
  trailFree: false,
};

/** Upper bound on protect variants at the effective modeled cost. Dedup can only make it smaller. */
export function gridVariants(g: ProtectGridSpec, cost?: number): number {
  if (g.trailingOnly || g.priceDistances?.enabled) return protectGrid(REF_TF, g, cost).length;
  const hold = g.holdH.length || 1;
  const main = g.tp.length * slRatiosOf(g).length * g.trailOfTp.length * hold;
  const plus = g.minimalPlus;
  const plusN = plus ? plusVariants(plus.enabled === true, plus.cells?.length ?? 0, hold) : 0;
  return (
    main +
    coordVariants(hold, g.short) +
    coordVariants(hold, g.minimal) +
    coordVariants(hold, g.general) +
    coordVariants(hold, g.long) +
    coordVariants(hold, g.micro) +
    plusN + (lowRangeEnabled(g) ? lowRangeGridProtects(g.lowRange, cost).length : 0)
  );
}

/** Refuse an oversized effective grid before publishing settings or running a preset. */
export function checkGridVariantBudget(g: ProtectGridSpec, cost: number, limit = GRID_VARIANTS_MAX): number {
  if (!(Number.isFinite(cost) && cost >= 0)) throw new RangeError("grid budget requires a finite nonnegative modeled cost");
  if (!(Number.isSafeInteger(limit) && limit > 0)) throw new RangeError("grid budget requires a positive integer limit");
  const variants = gridVariants(g, cost);
  if (variants > limit) throw new Error(`protect grid too large (${variants} variants, max ${limit})`);
  return variants;
}

/** upper bound of a Wide stop / trail (grid.maxSl / maxTrail); none when unset */
const capAt = (x: number, max?: number) => (max && max > 0 ? Math.min(x, max) : x);

/**
 * Every protect variant of a grid (hold converted to bars). Each variant is computed independently. `cost` (the
 * round-trip position cost, settings.cost) turns Micro's net targets into price targets (tpNetOfCost).
 */
export function protectGrid(
  tfMin: number,
  g: ProtectGridSpec = DEFAULT_GRID,
  cost?: number,
): Protect[] {
  // the evaluation's minimum stop (settings.grid.minSlEval, default EVAL_MIN_SL)
  const slFloor = g.minSlEval ?? minimumStopFraction(cost ?? RT_COST);
  // a range's own minimum net distance (minSlDistancePct) replaces the global floor for its cells only
  const rangeOf = (tag?: string) => tag === "mc" ? g.micro : tag === "mn" ? g.minimal : tag === "sh" ? g.short
    : tag === "gn" ? g.general : tag === "lg" ? g.long : undefined;
  const floorOf = (tag?: string) => ownSlFloor(rangeOf(tag), cost ?? RT_COST) ?? slFloor;
  const out: Protect[] = [];
  const seen = new Set<string>();
  const push = (p: Protect) => {
    const slFloor = p.tag === "mc" ? (ownSlFloor(rangeOf(p.tag), cost ?? RT_COST) ?? 0) : floorOf(p.tag);
    // Micro's absolute floor is resolved by forEachMicro. Explicit range net floors remain cost-aware.
    // Preserve already rounded floor cells so Base and execution keep the same protectCellKey.
    if (p.sl + Number.EPSILON * Math.max(Math.abs(p.sl), slFloor) < slFloor) p.sl = slFloor;
    if (!p.tag && g.maxSl && g.maxSl > 0) {
      if (g.maxSl + 1e-12 < Math.max(slFloor, g.minSl ?? 0)) return;
      p.sl = Math.min(p.sl, g.maxSl);
    }
    if (p.trail > 0) {
      p.trailStep = g.trailStep ?? 1;
      p.trailFree = g.trailFree ?? false;
    }
    const key = `${p.tp}|${p.sl}|${p.trail}|${p.hold}|${p.maxHoldMin ?? ""}|${p.tag ?? ""}`;
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
    slEval?: number,
  ) => {
    const range =
      tag === "mn"
        ? g.minimal
        : tag === "sh"
          ? g.short
          : tag === "gn"
            ? g.general
            : tag === "lg"
              ? g.long
              : undefined;
    const p: Protect = {
      tp,
      // A range's own evaluation floor replaces the grid-wide floor, exactly as its Base cells do. The Wide grid
      // (no tag) caps its stop / trailing distance at grid.maxSl / grid.maxTrail when set.
      sl: distanceAtFloor(tp * k, Math.max(slEval ?? floorOf(tag), minSl, floorOf(tag)), 4),
      // the floor is on the trailing distance (trail × trailStep), not on the arming move
      trail: tr > 0 ? capAt(trailAtFloor(tp * tr, minTrail, g.trailStep ?? 1, 4), tag ? undefined : g.maxTrail) : 0,
      hold: Math.max(
        holdFloorBars(
          tag === "mn"
            ? g.minimal
            : tag === "sh"
              ? g.short
              : tag === "gn"
                ? g.general
                : tag === "lg"
                  ? g.long
                  : undefined,
        ),
        Math.round((h * 60) / tfMin),
      ),
      ...(tag ? { tag } : {}),
      ...(range && (range.holdAuto || range.maxHoldMin) ? { maxHoldMin: range.holdAuto ? Math.round(h * 60) : range.maxHoldMin } : {}),
    };
    push(p);
  };
  for (const tp of g.tp)
    for (const k of slRatiosOf(g))
      for (const tr of g.trailOfTp)
        for (const h of g.holdH) cell(tp, k, tr, h, g.minSl, g.minTrail);
  forEachCoord(g, (tp, k, tr, h, minSl, minTrail, tag, slEval) =>
    cell(tp, k, tr, h, minSl, minTrail, tag, slEval),
  );
  forEachMicro(
    g,
    (tp, k, tr, h, minSl, minTrail, slEval) => {
      push({
        tp: +tp.toFixed(6),
        // the range's own evaluation floor when it sets one (micro.minSlEval), else the global one
        sl: distanceAtFloor(tp * k, Math.max(slEval ?? slFloor, minSl), 6),
        trail: tr > 0 ? trailAtFloor(tp * tr, minTrail, g.trailStep ?? 1, 6) : 0,
        hold: Math.max(holdFloorBars(g.micro), Math.round((h * 60) / tfMin)),
        tag: "mc",
        ...(g.micro && (g.micro.holdAuto || g.micro.maxHoldMin) ? { maxHoldMin: g.micro.holdAuto ? Math.round(h * 60) : g.micro.maxHoldMin } : {}),
      });
    },
    cost,
  );
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
  const lowRange = (lowRangeEnabled(g) ? lowRangeGridProtects(g.lowRange, cost, tfMin, g.lowRange?.minSlDistancePct ?? .1, ownSlFloor(g.lowRange, cost ?? RT_COST) ?? slFloor) : []);
  if (g.priceDistances?.enabled) {
    const priced = applyPriceDistanceGrid(applyTrailingGapBasis([...out, ...lowRange], g.trailGapBasis), g, cost ?? RT_COST, GRID_VARIANTS_MAX);
    return g.trailingOnly ? [...priced, ...trailingOnlyProtects(priced)] : priced;
  }
  if (g.trailingOnly) out.push(...trailingOnlyProtects(out), ...trailingOnlyProtects(lowRange));
  out.push(...lowRange);
  return applyTrailingGapBasis(out, g.trailGapBasis);
}

export function dcaProtectGrid(
  tfMin: number,
  dca?: Partial<DcaConfig> | null,
  minSlEval?: number,
): Protect[] {
  const hold = Math.max(4, Math.round(480 / tfMin));
  // targets: the configured ones, else short adds (4× and 6× the position cost) and two wide ones; the stop a
  // multiple of the target (configured, else 2× for the short adds and 1.5× for the wide ones)
  const tps = dca?.tp?.length ? dca.tp : [0.008, 0.012, 0.026, 0.035];
  return tps.map((tp) => ({
    tp,
    sl: distanceAtFloor(tp * (dca?.slOfTp ?? (tp < 0.02 ? 2 : 1.5)), minSlEval ?? EVAL_MIN_SL, 6),
    trail: 0,
    hold,
  }));
}

/** engine direction acceptance as on by default (operator, 6 Oct): PF 1.05 over 24 h, at least 30 closes */
// off by default (operator, 11 Oct): the 6 Oct ON evidence (24 h, 30 symbols) is in docs/positive-coordinations.md; the
// five causal D1 windows of 11 Oct measured it off as higher PF in every half
export const ENGINE_SIDE_ACCEPT: SignalAccept = {
  enabled: false,
  minPf: 1.05,
  hours: 24,
  minTrades: 30,
};

export function defaultWalkForward(s: CoreSettings): WalkForwardOptions {
  return {
    // The execution pipeline must consume only the configs admitted by Base and the initial set evaluation.
    // Pool reselection can admit later configs whose PF was not part of that validated cohort.
    seatSet: "validated",
    axisVolumeFactor: volumeRatio(s.axis.volumeFactor),
    exitVolumeFactor: volumeRatio(s.exitStrategy.volumeFactor),
    indicationVolumeFactors: signalVolumeFactorsOf(s.signals),
    relationalVolumeRatios: s.relationalVolumeRatios,
    // Evaluated history is separate from indicator warmup and independent Signal/Exit history.
    preH: PRECALC_HISTORY_H,
    simH: 48,
    stepH: 1,
    continuous: true,
    decisionMin: 1,
    onePerPairEvent: true,
    // Real seats per strategy family: 0 = no limit — every config that passes the evaluation (PF, DDT, DDR,
    // validation) trades (12 windows × 12 symbols: PF 1.223 → 1.226, orders +5 % vs 16 seats; docs/block-sweep.md)
    portfolio: 0,
    // entry last-N off (operator, 13 Oct): the gate dropped candidates trading better than the ones it let through
    // (feed120, D1: dropped PF 0.68 vs executed 0.44; holdout 0.82 vs 0.37), and lastN 0 passed 3 of 4 measurements on
    // 12 Oct (PF-SEARCH.md sections 12–14, 17). Was 15 (6 Oct, 12 symbols × 12 h). Mainnet keeps its own floor
    // (MAINNET_LAST_N) unless the host waives it.
    lastN: 0,
    lastNMinPf: PF_NEUTRAL,
    // Operator-requested default: the last 12 closes must clear the seat's PF and drawdown gates.
    // Saved stricter choices and independent Signal/Exit/range overrides retain their own values.
    validLastN: 12,
    // Signal and Exit contexts default to their own last 12 completed results.
    signalValidLastN: SIGNAL_EVALUATION_LAST_N,
    wideEnabled: s.grid.tp.length > 0,
    exitMinTrades: s.exitStrategy.minValidationTrades,
    exitMinPf: s.exitStrategy.minPf,
    exitMinGreenHourShare: s.exitStrategy.minGreenHourShare,
    exitMaxDdr: s.exitStrategy.maxDdr,
    // engine direction acceptance: a type family × range × side opens only while its candidates' last 24 h clear
    // PF 1.05 (≥ 30 closes). Operator, 6 Oct: on — 24 h, 30 symbols: PF 1.19 → 2.59, net +8,556 → +23,268 %
    // (docs/sims/sim24h-2026-10-06; the 3 h windows: 0.38 → 0.88 and 0.57 → 0.54)
    engineSideAccept: { ...ENGINE_SIDE_ACCEPT },
    // range cells: their own, higher last-N gate (grid.rangeGate)
    rangeGate: rangeGateOf(s.grid),
    rangeVolumeFactors: rangeVolumeFactorsOf(s.grid),
    signalRangeVolumeFactors: s.signals.rangeVolumeFactors,
    signalCoordinationOnly: s.signals.coordination.strategyOnly,
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
    // Bound broad history-based qualification. Per-symbol history can request a longer window via symH.
    longH: EVALUATION_HISTORY_H,
    signalLongH: SIGNAL_HISTORY_H,
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
    relate: { ...DEFAULT_RELATE_ADJUSTMENT, ...(s.relate ?? {}),
      sources: { ...DEFAULT_RELATE_ADJUSTMENT.sources, ...(s.relate?.sources ?? {}) } },
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
  pending: PendingTapeEntry[];
  /**
   * Built only because paper holds it (a seat or an open position) while its pair no longer passes Base for this
   * cell's range / target / lane: it serves that position and takes no new seat. Built unfiltered and seated by the
   * pair alone, a held cell kept opening orders after Base had dropped it.
   */
  heldOnly?: boolean;
  /** Kept from the preceding compute during a memory fallback instead of being rebuilt in this compute. */
  carried?: boolean;
  /**
   * First time the tape's series can produce a trade (its lane's history start + a day of indicator warm-up).
   * Selection windows start here at the earliest: a lane with a shorter history (1m: days) is judged on what
   * it has, not on empty weeks before its data.
   */
  fromT?: number;
}

// appended only: a tape stores the index ("be" last, so the earlier indices keep their meaning)
export const REASONS: Trade["reason"][] = ["tp", "sl", "trail", "time", "disarm", "be"];

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
export function packArena(tapes: ConfigTape[]): {
  arena: ArrayBuffer | null;
  others: ArrayBuffer[];
} {
  const align = (x: number) => Math.ceil(x / 8) * 8;
  const packed = tapes.filter(inTapeLayout);
  const others = new Set<ArrayBuffer>();
  for (const t of tapes)
    if (!inTapeLayout(t)) for (const k of TAPE_COLUMNS) others.add(t[k].buffer as ArrayBuffer);
  let total = 0;
  for (const t of packed) total = align(total) + tapeBytes(t.n);
  if (!packed.length) return { arena: null, others: [...others] };
  const arena = new ArrayBuffer(Math.max(8, align(total)));
  let off = 0;
  for (const t of packed) {
    off = align(off);
    const bytes = tapeBytes(t.n);
    new Uint8Array(arena, off, bytes).set(
      new Uint8Array(t.exitT.buffer, t.exitT.byteOffset, bytes),
    );
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
    if (t.heldOnly !== undefined) c.heldOnly = t.heldOnly;
    if (t.carried !== undefined) c.carried = t.carried;
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
      t.carried ? 1 : 0,
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
    const [id, bot, ind, protect, kind, n, si, off, open, pending, fromT, heldOnly, carried] = x as [
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
    if (carried) t.carried = true;
    return t;
  });
}

// the symbol index of a universe is one array shared by all its tapes: built once per array, not per tape (a full-focus
// compute builds ~100k tapes over the same 60 symbols)
const symbolIndexOf = new WeakMap<readonly string[], { len: number; index: Map<string, number> }>();
export function symbolIndex(syms: readonly string[]): Map<string, number> {
  let c = symbolIndexOf.get(syms);
  // rebuilt when the array has changed length since it was indexed (a cached index never outlives its universe)
  if (!c || c.len !== syms.length) {
    c = { len: syms.length, index: new Map(syms.map((x, i) => [x, i])) };
    symbolIndexOf.set(syms, c);
  }
  return c.index;
}

/** Chronological order shared by runtime tape construction and offline evaluators.
 * Returning 0 for an exact timestamp tie intentionally preserves the source order via stable Array#sort.
 */
export function compareTapeTrades(a: Trade, b: Trade): number {
  return a.exitT - b.exitT || a.entryT - b.entryT;
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
  if (open.some((p) => p.entryStopMax !== undefined))
    throw new Error("compact tape cannot retain per-entry stop-limit provenance");
  trades.sort(compareTapeTrades);
  const n = trades.length;
  const symIdx = symbolIndex(syms);
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
    if (t.entryStopMax !== undefined)
      throw new Error("compact tape cannot retain per-entry stop-limit provenance");
    tp.exitT[i] = t.exitT;
    tp.entryT[i] = t.entryT;
    // Float64Array assignment otherwise converts a restored null return into zero.
    const r = typeof t.r === "number" && Number.isFinite(t.r) ? t.r : NaN;
    tp.r[i] = r;
    tp.entry[i] = t.entry;
    tp.exit[i] = t.exit;
    tp.symI[i] = symIdx.get(t.sym) ?? 0;
    tp.side[i] = t.side;
    tp.reason[i] = Math.max(0, REASONS.indexOf(t.reason));
    tp.bars[i] = Math.min(65535, t.bars);
    tp.vol[i] = t.vol ?? 1;
    tp.level[i] = Math.min(255, t.level ?? 0);
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

/** Each source, timeframe, range and strategy owns its own order, even when another has the same onset and exits. */
export function orderCfgKey(cfg: string): string {
  return cfg;
}

/**
 * Exact event identity: config, symbol, side, entry, exit, result and strategy type.
 */
export function dupKey(
  tr: Pick<Trade, "cfg" | "sym" | "side" | "entryT" | "exitT" | "r" | "kind">,
): string {
  return `${orderCfgKey(tr.cfg)}|${tr.sym}|${tr.side}|${tr.entryT}|${tr.exitT}|${tr.r}|${tr.kind ?? ""}`;
}

/**
 * dupKey of a position still open (paper / live): the open state (entry, stop, target) stands in for the exit, which
 * is not known yet.
 */
export function openDupKey(
  op: Pick<OpenPosition, "cfg" | "sym" | "side" | "entryT" | "entry" | "stop" | "target">,
): string {
  return `${orderCfgKey(op.cfg)}|${op.sym}|${op.side}|${op.entryT}|${op.entry}|${op.stop}|${op.target}`;
}

/**
 * A paper position's volume: external execution multiple (Block × relation × indication factor) × its ladder weight
 * (an Axis ladder with two filled rungs is 2 units, as the simulation books it). Paper marks mtm (per unit) × volume
 * × unit, and the live lane asks for this volume.
 */
export const positionVolume = (mult: number, op: { w?: number }): number => mult * (op.w ?? 1);

/**
 * The external execution multiple of a paper position (its volume without the ladder weight): what a tape order's r —
 * which already carries the ladder (Σ legs) — is scaled by when the position closes, and what a held position keeps.
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
  if (!isPlainKind(tp.kind)) return [];
  const laneMs = (laneOf(tp.ind).tf ?? baseTfMin) * 60_000;
  if (!tp.pending.length || barEnd % laneMs !== 0) return [];
  const out: OpenPosition[] = [];
  for (const pe of tp.pending) {
    const px = priceOf(pe.sym);
    if (!(px && px > 0)) continue;
    const requested = pe.protect ?? tp.protect;
    const q = isSignalConfig(tp.id) ? capSignalProtect(requested) : capTrailingOnlyProtect(requested);
    if (pe.execution && (pe.execution.tfMin !== 1 || !Number.isSafeInteger(pe.execution.holdMin) ||
      pe.execution.holdMin < 1 || !Number.isFinite(tp.protect.maxHoldMin) ||
      pe.execution.holdMin !== Math.floor(tp.protect.maxHoldMin!)))
      throw new RangeError("pending minute execution has invalid hold-clock provenance");
    const side = pe.side;
    const exitProtection = createExitProtection(q, px, cost);
    out.push({
      cfg: tp.id,
      sym: pe.sym,
      side,
      entryT: barEnd,
      entryI: 0,
      entry: px,
      stop: side === 1 ? px * (1 - q.sl) : px * (1 + q.sl),
      target: q.trailOnly ? 0 : side === 1 ? px * (1 + q.tp) : px * (1 - q.tp),
      peak: px,
      trailOn: false,
      mtm: -cost,
      ...(pe.execution ? { executionTfMin: pe.execution.tfMin, holdEndT: barEnd + pe.execution.holdMin * 60_000 } : {}),
      ...(exitProtection ? { exitProtection } : {}),
      ...(q.trail > 0
        ? {
            trail: q.trail,
            trailDist: q.trail * (q.trailStep ?? 1),
            trailFree: q.trailFree === true,
            ...(q.trailOnly ? { trailOnly: true } : {}),
          }
        : {}),
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

/** The seats of every walk-forward step by its time (seatedForEntry). */
export function stepSeats(
  steps: ReadonlyArray<{ t: number; real: readonly string[] }>,
): Map<number, ReadonlySet<string>> {
  return new Map(steps.map((st) => [st.t, new Set(st.real)] as const));
}

/**
 * Whether the paper step takes a config's new entry: an entry before the step's time `t` on the seats of its own step
 * (as the simulation took it — the seats at `t` were picked on closes after that entry), an entry at or after `t` (or
 * one whose step the run does not hold) on the seats picked at `t` (`sel`).
 */
export function seatedForEntry(
  id: string,
  entryT: number,
  t: number,
  stepH: number,
  seatsAt: ReadonlyMap<number, ReadonlySet<string>>,
  sel: ReadonlySet<string>,
): boolean {
  if (entryT < t) {
    const stepMs = Math.max(1, stepH) * H;
    const st = seatsAt.get(Math.floor(entryT / stepMs) * stepMs);
    if (st) return st.has(id);
  }
  return sel.has(id);
}

/**
 * A tape's position still open at its end as an order closing at `endT` at its mark: r = mtm × ladder weight incl.
 * cost (as a closed order's r carries every leg), vol = the ladder weight.
 */
type MarkableOpen = Pick<OpenPosition, "sym" | "side" | "entryT" | "entry" | "mtm" | "w">;
export function markedOpenTrade(tp: ConfigTape, op: MarkableOpen, endT: number): Trade {
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
  const { gp, gl, rescanned } = returnWindow(tp, a, b);
  return { n: b - a, net: (rescanned ? gp - gl : tp.rs[b] - tp.rs[a]) * 100, pf: profitFactor(gp, gl), gp, gl };
}

/** gates.lossPrior: one virtual stop-out at the config's own stop (r units), added to every evaluation PF's losses */
export const lossPriorOf = (
  tp: Pick<ConfigTape, "protect">,
  gates: { lossPrior?: boolean },
): number => (gates.lossPrior ? Math.max(0, tp.protect.sl) : 0);

/** whether the range gate judges a range: its own list, else GATED_RANGES */
const rangeGateOn = (g: { ranges?: readonly string[] }, tag: string | undefined | null) =>
  g.ranges ? !!tag && g.ranges.includes(tag) : rangeGated(tag);

/** Protection tags describe distances; they never route Signals or Historic Exit through ordinary range qualification. */
const tapeRangeGateOn = (g: { ranges?: readonly string[] }, tp: Pick<ConfigTape, "ind" | "protect"> & Partial<Pick<ConfigTape, "kind">>) =>
  tp.kind !== "exit" && !isSignalInd(tp.ind) && rangeGateOn(g, tp.protect.tag);

/**
 * A tape's per-range options (wf.rangeOpts): those of its range tag, "wide" for an untagged engine config, and "sig"
 * for Signals. Signals use only the supported own-range validation and entry last-N values; they retain their own
 * source × symbol × direction validation and signal ranking instead of engine seat controls. Historic Exit has its
 * own policy and never borrows an ordinary or Signal range's options. Undefined when unset.
 */
export function rangeOptsOf(
  o: Pick<WalkForwardOptions, "rangeOpts">,
  tp: Pick<ConfigTape, "protect" | "ind"> & Partial<Pick<ConfigTape, "kind">>,
): RangeOpts | undefined {
  const ro = o.rangeOpts;
  if (!ro || tp.kind === "exit") return undefined;
  if (isSignalInd(tp.ind)) {
    const signal = ro.sig;
    if (!signal) return undefined;
    return {
      ...(signal.validLastN !== undefined ? { validLastN: signal.validLastN } : {}),
      ...(signal.lastN !== undefined ? { lastN: signal.lastN } : {}),
    };
  }
  return ro[tp.protect.tag ?? "wide"];
}

/** Longest time under the running peak inside [a, b), counting an open dip up to nowT (hours). */
/** Drawdown of a tape's closes [a, b): longest time under a prior peak (hours, open until nowT) and the max depth. */
export function winDd(
  tp: ConfigTape,
  a: number,
  b: number,
  nowT: number,
): { ddtH: number; mdd: number } {
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
export function ddrFails(
  mdd: number | undefined,
  net: number,
  maxDdr: number | undefined,
): boolean {
  return drawdownRatioFails(mdd, net, maxDdr);
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
  /** Per range tag: the reach gate (RangeGrid.reachFrac); entries a cell's target cannot plausibly be reached from are dropped. */
  rangeReach?: Readonly<Partial<Record<string, number>>>;
  /** False disables new ordinary Wide ladders, but retains exact held positions for exit management. */
  wideEnabled?: boolean;
  /** In-process only: retain each finished immutable tape through the caller's bounded history owner. */
  tapeSink?: (tape: ConfigTape) => ConfigTape;
  /** Standard Signal protections use 15m reference distances; apply the trail floor after lane scaling. */
  signalReferenceGrid?: boolean;
  signalTrailMax?: number;
  /** Background Base evaluation: the same simulations, counted and immediately discarded. Never used for trading. */
  baseConfigCounter?: BaseConfigCounter;
  countOnly?: boolean;
  countKinds?: readonly string[];
  /** Config identities carried across bounded protection chunks, preserving the builder's floor-collision deduplication. */
  countSeen?: Set<string>;
  /** Preserve full-grid horizon fitting when the background count splits that grid into bounded slices. */
  countFitProtects?: readonly Protect[];
  /** Axis ladders have their own bounded background slices; each variant is counted exactly once. */
  countAxisWindow?: { offset: number; limit: number };
  entry?: EntryFilter | null;
  /** range cells fitted to each indication's horizon (rangeFit); unset = every range cell on every indication */
  rangeFit?: RangeFit | null;
  /** Explicit causal fit boundary: only candles closed by this time may select range targets. */
  rangeFitCutT?: number;
  /** range tapes with fewer closes can never take a seat and are not kept (3, or the range gate's last N) */
  rangeMinN?: number;
  /** shortest lane (minutes) per range tag: a range cell is not computed on a faster lane (rangeMinTfOf) */
  rangeMinTf?: Partial<Record<string, number>>;
  /**
   * per pair ("bot|ind"), the ranges it passed in Base ("" = the wide grid): only their cells are computed. An
   * absent entry keeps the legacy unfiltered behavior; an explicit empty list rejects new cells but allows exact
   * ids in heldIds to be rebuilt as held-only tapes.
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
   * per pair, range tag and target (String(tp)): the best minimal and maximal stop ratio Base calculated from the last N
   * samples of that TP step (ComboRun.rangeSl). Only the cells with a stop ratio inside it are built; a target without an
   * entry, or one whose interval is the configured defaults (too few samples), keeps every ratio. Absent = off.
   */
  pairSl?: Record<string, Record<string, Record<string, SlBounds>>>;
  /**
   * grid.baseCells, per pair, the cells Base validated (`protectCellKey`, tag|tp|sl|trail|hold): of a range with cells
   * listed here only those cells are built (not every stop × trail × hold of a passed target). A range without an entry
   * and the Wide grid keep the pair / target level. Absent = off.
   */
  pairCells?: Record<string, readonly string[]>;
  /** Exact no-TP Base proofs for the tape builder; absent only on legacy/research callers. */
  pairTrailingOnlyCells?: Record<string, readonly string[]>;
  /**
   * Pairs in Main only because the paper book holds one of their configs (they did not pass Base): only the held ids are
   * built — no Wide / range cell, no DCA, no Axis (a pair without Base entry used to build its whole grid).
   */
  heldPairsOnly?: ReadonlySet<string>;
  /** DCA / Axis sets are not built while their toggle is off (only a held id keeps its tape); they could not seat anyway */
  skipDca?: boolean;
  skipAxis?: boolean;
  /**
   * config ids held by the paper book (selected or holding a position): each keeps its own tape even when its range
   * is not in its pair's Base tags — without its tape an open position vanished from the book with no close. Only
   * that config, not every cell of its range (a held General position used to unlock all General cells of the pair,
   * and the pair could take new General seats it had not passed Base in).
   */
  heldIds?: ReadonlySet<string>;
  /** Recovered open configs whose settings were removed: manage exits, never admit another entry. */
  heldOnlyIds?: ReadonlySet<string>;
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
  /** Private worker-owned continuations. Never serialize this object or use it for discovery/Base counts. */
  continuations?: TapeContinuations;
  /**
   * per pair ("bot|ind"), configs of its own beside the shared `protects` (a signal's historic trailing configs,
   * signalHistProtects): built, validated and seated like every other config of the pair
   */
  pairProtects?: Record<string, readonly Protect[]>;
};

/**
 * The floors of one worker message: the per-pair entries (pairTags, pairTps, pairProtects) and the held config ids
 * cut to the message's pairs, the rest as given — the builder reads no other pair's (every tape message cloned every
 * pair's entries and every held id, and a compute sends one message per two pairs). Held ids are indexed once.
 */
export function floorsForPairs(floors: EntryFloors): (pairs: readonly string[]) => EntryFloors {
  const pairOf = (id: string) => {
    const a = id.indexOf("|");
    const b = a < 0 ? -1 : id.indexOf("|", a + 1);
    return b < 0 ? id : id.slice(0, b);
  };
  const held = new Map<string, string[]>();
  for (const id of floors.heldIds ?? []) {
    const k = pairOf(id);
    const xs = held.get(k);
    if (xs) xs.push(id);
    else held.set(k, [id]);
  }
  const pick = <V>(m: Record<string, V>, pairs: readonly string[]) => {
    const out: Record<string, V> = {};
    for (const k of pairs) if (Object.hasOwn(m, k)) out[k] = m[k];
    return out;
  };
  return (pairs) => ({
    ...floors,
    ...(floors.pairTags ? { pairTags: pick(floors.pairTags, pairs) } : {}),
    ...(floors.pairTps ? { pairTps: pick(floors.pairTps, pairs) } : {}),
    ...(floors.pairSl ? { pairSl: pick(floors.pairSl, pairs) } : {}),
    ...(floors.pairCells ? { pairCells: pick(floors.pairCells, pairs) } : {}),
    ...(floors.pairTrailingOnlyCells ? { pairTrailingOnlyCells: pick(floors.pairTrailingOnlyCells, pairs) } : {}),
    ...(floors.pairProtects ? { pairProtects: pick(floors.pairProtects, pairs) } : {}),
    ...(floors.heldIds ? { heldIds: new Set(pairs.flatMap((k) => held.get(k) ?? [])) } : {}),
    ...(floors.heldOnlyIds
      ? { heldOnlyIds: new Set([...floors.heldOnlyIds].filter((id) => pairs.includes(pairOf(id)))) }
      : {}),
  });
}

/** Adds build records (one worker part's) into `into`: counts summed, the distinct levels united. */
export function mergeBuildStats(into: Map<string, TapeBuildStat>, xs: readonly TapeBuildStat[]) {
  for (const x of xs) {
    const k = `${x.ind}|${x.tag}|${x.kind}`;
    const y = into.get(k);
    if (!y) {
      into.set(k, {
        ...x,
        skip: { ...x.skip },
        tps: [...x.tps],
        sls: [...x.sls],
        trails: [...x.trails],
      });
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
  /** Built retained cells rejected by the subsequent pre-run range gate. */
  postGateRejected?: number;
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
  for (const k of [
    "p",
    "slow",
    "s",
    "look",
    "n",
    "w",
    "bars",
    "rsi",
    "bb",
    "cci",
    "atr",
    "c",
    "b",
  ]) {
    const v = p[k];
    if (Number.isFinite(v) && v >= 2) return Math.min(200, v);
  }
  return 14;
}

/** Median per-minute volatility; an explicit fit cut excludes every candle that has not closed by that time. */
export function universeSigma1m(bars: readonly Bars[], cutT?: number): number {
  if (cutT !== undefined && (!Number.isFinite(cutT) || cutT < 0))
    throw new Error("rangeFitCutT must be a finite nonnegative completed-candle boundary");
  const xs: number[] = [];
  for (const source of bars) {
    const b = cutT === undefined ? source : headBars(source, cutT);
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
    if (p.tag && rangeGated(p.tag))
      (byTag.get(p.tag) ?? byTag.set(p.tag, new Set()).get(p.tag)!).add(p.tp);
  const keep = new Set<string>();
  for (const [tag, tps] of byTag) {
    const xs = [...tps];
    const inside = xs.filter((tp) => tp >= fit.lo * move && tp <= fit.hi * move);
    // coverage: the targets nearest to the band (log distance) when fewer than `keep` are inside
    const dist = (tp: number) =>
      tp < fit.lo * move
        ? Math.log((fit.lo * move) / tp)
        : tp > fit.hi * move
          ? Math.log(tp / (fit.hi * move))
          : 0;
    const picked =
      inside.length >= fit.keep
        ? inside
        : xs.sort((a, b) => dist(a) - dist(b)).slice(0, Math.max(fit.keep, inside.length));
    for (const tp of picked) keep.add(`${tag}|${tp}`);
  }
  return keep;
}

/**
 * Reach gate of one cell: keep an entry only while ATR(14)/close x sqrt(hold) covers `frac` of the target. Causal: the
 * entry bar's own completed ATR. NaN volatility (warm-up) keeps nothing.
 */
export function reachEntries(sig: Int8Array, b: Bars, k: SeriesCache, tp: number, hold: number, frac: number): Int8Array {
  if (!(frac > 0) || !(tp > 0)) return sig;
  const a = k.atr(14);
  const root = Math.sqrt(Math.max(1, hold));
  const need = frac * tp;
  const out = Int8Array.from(sig);
  for (let i = 0; i < out.length; i++)
    if (out[i] !== 0 && !(a[i] / b.c[i] * root >= need)) out[i] = 0;
  return out;
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

/** Local fallback retains the same tapes but bounds disposable indicator caches like worker messages. */
export function* buildTapesBoundedGen(
  ...args: Parameters<typeof buildTapesGen>
): ReturnType<typeof buildTapesGen> {
  try {
    return yield* buildTapesGen(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], 16);
  } finally {
    // Completion, cancellation and errors all release derived series. Owned tapes and continuation state stay intact.
    for (const cache of args[0].caches) cache.clear();
    clearCappedProjections(args[0]);
  }
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
  /** Internal local-fallback cache lifetime; does not shorten history or limit output. */
  cacheBatchPairs = 0,
): Generator<{ done: number; total: number }, ConfigTape[]> {
  // a range cell keeps its own minimum stop / trail (set when the grid was built), not the wide-grid floor
  // a range cell keeps its own stop / trail floors: the live-feedback adjuster's absolute floors are the wide grid's
  // (a set's level-0 entry carries the 0.5 % floors and lifted every Micro / Minimal cell of the set to them — bug hunt,
  // 13 Oct); it takes only the relative widening (slMult / trailMult), and is untouched without one
  const adj = (bot: string, ind: string, kind: StratKind, p: Protect, ownKey?: string) => {
    // the config's own feedback record (setKeyOf): its id without the stop / trailing distances the adjuster changes
    const key = ownKey ?? setKeyOf(configId(bot as BotType, ind, p,
      kind === "dca" || kind === "dca-active" || kind === "axis" || kind === "block" ? kind : undefined));
    const e = adjust?.[key];
    const adjusted = !p.tag ? adjustProtect(adjustProtect(p, floors), e)
      : !e || ((e.slMult ?? 1) === 1 && (e.trailMult ?? 1) === 1) ? p
      : adjustProtect(p, { minSl: 0, minTrail: 0, slMult: e.slMult, trailMult: e.trailMult });
    return isSignalInd(ind) ? capSignalProtect(floors?.signalTrailMax === undefined || p.trailMax !== undefined ? adjusted : { ...adjusted, trailMax: floors.signalTrailMax }) : capTrailingOnlyProtect(adjusted);
  };
  const cooldown = tacticCooldown(tactics);
  // Main candidates are "bot|ind" pairs (lane indications included); without them every plain combo
  const combos = only
    ? [...only].map((k) => {
        const [bot, ind] = k.split("|");
        return { bot: bot as BotType, ind };
      })
    : allCombos();
  const heldRangeTagsByPair = new Map<string, Set<string>>();
  for (const id of floors?.heldIds ?? []) {
    const tag = rangeOfId(id);
    if (!tag) continue;
    const first = id.indexOf("|");
    const second = first < 0 ? -1 : id.indexOf("|", first + 1);
    const pair = second < 0 ? id : id.slice(0, second);
    let tags = heldRangeTagsByPair.get(pair);
    if (!tags) heldRangeTagsByPair.set(pair, (tags = new Set()));
    tags.add(tag);
  }
  // A held plain position can outlive a settings change or a minute-cap identity migration. Rebuild its exact historical
  // distances and lane hold, but only to manage that position; it must never acquire a new seat.
  const recoveredPlain = new Map<string, Protect[]>();
  for (const id of floors?.heldIds ?? []) {
    const parsed = parseConfigId(id);
    const kind = kindOfId(id);
    if (!parsed ||
        !(kind === "normal" || kind === "trailing" || kind === "trailing-only")) continue;
    const pair = `${parsed.bot}|${parsed.ind}`;
    const list = recoveredPlain.get(pair) ?? [];
    list.push(parsed.protect);
    recoveredPlain.set(pair, list);
  }
  const syms = u.bars.map((b) => b.sym);
  const out: ConfigTape[] = [];
  // range cells fitted to each indication's horizon, and range tapes that could never seat dropped
  const sigma1m = floors?.rangeFit ? universeSigma1m(u.bars, floors.rangeFitCutT) : 0;
  const rangeMinN = Math.max(0, floors?.rangeMinN ?? 0);
  const bs = floors?.buildStats;
  const onlyIds = floors?.onlyIds;
  const notOnly = (id: string) => !!onlyIds && !onlyIds.has(id);
  const directions = new WeakMap<Int8Array, number>();
  const sidesOf = (sig: Int8Array) => {
    if (!floors?.continuations) return splitSides(sig);
    const long = sideSignal(sig, 1),
      short = sideSignal(sig, -1);
    directions.set(long, 1);
    directions.set(short, -1);
    return [long, short];
  };
  const resume = <R extends CursorResult>(
    id: string,
    s: number,
    sig: Int8Array,
    protect: Protect,
    run: (cursor: SimulationCursor | undefined, b: Bars, sig: Int8Array, k: SeriesCache,
      p: Protect, series: (v: Float64Array) => Float64Array, cooldown: number) => R,
    rawExit = false,
  ): R => {
    const initial = cappedExecution(u, s, sig, protect, rawExit ? 0 : cooldown);
    const stamp = (result: R, view: CappedExecution): R => {
      stampCappedOpen(result.open, view);
      result.pendingExecution = result.pending && view.minute
        ? { tfMin: view.bars.tfMin, holdMin: view.protect.hold * view.bars.tfMin } : undefined;
      return result;
    };
    const cursor = floors?.continuations?.cursor(id, initial.bars, directions.get(sig) ?? 0);
    if (cursor) {
      const side = directions.get(sig) ?? 0;
      const pair = id.split("|").slice(0, 2);
      const sourceKey = `cursor-source:${pair.join("|")}:${Number(rawExit)}`;
      const filter = !rawExit && isSignalInd(pair[1]) ? floors?.entry : null;
      floors!.continuations!.bind(cursor, id, initial.bars, (nextU) => {
        const b = nextU.bars[s],
          k = nextU.caches[s];
          const sg = floors!.continuations!.measure(
            "sourceMs",
            () =>
              k.memo(`${sourceKey}:${side}`, () => {
                const source = entrySignal(
                  pair[0] as BotType,
                  pair[1],
                  k,
                  rawExit ? null : tactics,
                );
                if (!source)
                  throw new Error("continued source disappeared; research bootstrap required");
                let entry = evaluationSignal(nextU, b, source);
                if (filter) entry = filterEntries(entry, b, k, filter);
                return sideSignal(entry, side > 0 ? 1 : -1);
              }),
            sourceKey,
          );
          const next = cappedExecution(nextU, s, sg, protect, rawExit ? 0 : cooldown);
          return stamp(cursor.run(next.bars, () => floors!.continuations!.measure("simulationMs",
            () => run(cursor, next.bars, next.signal, k, next.protect, next.series, next.cooldown))), next);
      });
      return stamp(cursor.run(initial.bars, () => run(cursor, initial.bars, initial.signal, u.caches[s], initial.protect, initial.series, initial.cooldown)), initial);
    }
    return stamp(run(undefined, initial.bars, initial.signal, u.caches[s], initial.protect, initial.series, initial.cooldown), initial);
  };
  // B6: a held-only pair builds only its held ids, a DCA / Axis set whose toggle is off only a held id
  const b6Skip = (id: string, pair: string, kind: "dca" | "axis") =>
    !floors?.heldIds?.has(id) && (!!floors?.heldPairsOnly?.has(pair) || (kind === "dca" ? !!floors?.skipDca : !!floors?.skipAxis));
  const statOf = (ind: string, tag: string | undefined, kind: string) => {
    const k = `${ind}|${tag ?? ""}|${kind}`;
    let x = bs!.get(k);
    if (!x)
      bs!.set(
        k,
        (x = {
          ind,
          tag: tag ?? "",
          kind,
          grid: 0,
          built: 0,
          kept: 0,
          few: 0,
          skip: {},
          tps: [],
          sls: [],
          trails: [],
        }),
      );
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
  let total = combos.length * per;
  // (a pair's own configs count in the progress too)
  if (floors?.pairProtects)
    for (const c of combos) total += floors.pairProtects[`${c.bot}|${c.ind}`]?.length ?? 0;
  for (const c of combos) total += recoveredPlain.get(`${c.bot}|${c.ind}`)?.length ?? 0;
  let done = 0;
  let cachePairs = 0;
  for (const c of combos) {
    if (cacheBatchPairs > 0 && cachePairs++ >= cacheBatchPairs) {
      for (const cache of u.caches) cache.clear(["bot:", "break:shared:"]);
      cachePairs = 1;
    }
    // a lane indication runs only on its timeframe's series
    const series = seriesOf(u, c.ind);
    let fromT = Infinity;
    for (const s of series) fromT = Math.min(fromT, (u.bars[s].t[0] ?? Infinity) + 24 * H);
    const atFrom = (t: ConfigTape) => {
      if (Number.isFinite(fromT))
        t.fromT =
          u.evaluationFromT === undefined ? fromT : Math.max(u.evaluationFromT, fromT - 24 * H);
      if (t.protect.maxHoldMin !== undefined && hasMinutePrices(u)) {
        const priceStart = cappedPriceStart(u, series);
        if (Number.isFinite(priceStart)) t.fromT = Math.max(t.fromT ?? -Infinity, priceStart);
      }
      return t;
    };
    const sigs: Array<Int8Array | null> = new Array(u.bars.length).fill(null);
    const hasExitSets = floors?.pairProtects?.[`${c.bot}|${c.ind}`]?.some((p) => p.exitSet);
    const exitSigs: Array<Int8Array | null> | null = hasExitSets
      ? new Array(u.bars.length).fill(null)
      : null;
    for (const s of series) {
      const rawSignal = entrySignal(c.bot, c.ind, u.caches[s], tactics);
      sigs[s] = rawSignal ? evaluationSignal(u, u.bars[s], rawSignal) : null;
      if (exitSigs) {
        const signal = entrySignal(c.bot, c.ind, u.caches[s], null);
        exitSigs[s] = signal ? evaluationSignal(u, u.bars[s], signal) : null;
      }
      if (floors?.entry && sigs[s] && isSignalInd(c.ind))
        sigs[s] = filterEntries(sigs[s]!, u.bars[s], u.caches[s], floors.entry);
      // signal series for one symbol can be heavy on first use; let the caller yield per symbol
      yield { done, total };
    }
    if (
      !series.length ||
      (series.some((s) => sigs[s] === null) &&
        (!exitSigs || series.some((s) => exitSigs[s] === null)))
    ) {
      if (floors?.baseConfigCounter) {
        const reason = series.length ? "missing-signal" : "no-series";
        const record = (p0: Protect, kind: StratKind) => {
          const applied = adj(c.bot, c.ind, kind, laneProtect(p0, c.ind));
          const p = dcaOpt && (kind === "dca" || kind === "dca-active")
            ? { ...applied, dca: dcaSnapshot(dcaOpt.dca) } : applied;
          if (!floors.countKinds || floors.countKinds.includes(kind))
            floors.baseConfigCounter!.record(
              c.bot,
              c.ind,
              p,
              kind,
              [],
              reason,
            );
        };
        for (const p of protects)
          if ((p.lowRangeOnly === true) === isLowRangeInd(c.ind)) record(p, protectKind(p));
        if (dcaOpt) {
          const tags = floors.pairTags?.[`${c.bot}|${c.ind}`];
          const wide = floors?.wideEnabled !== false && !isLowRangeInd(c.ind) && !(dcaOpt.axis?.perRange && tags && !tags.includes(""));
          if (!dcaOpt.noDca && wide)
            for (const p of dcaOpt.protects) {
              record(p, "dca");
              record(p, "dca-active");
            }
          if (dcaOpt.axis) {
            let axisIndex = 0;
            const recordAxis = (p: Protect) => {
              const index = axisIndex++;
              const w = floors.countAxisWindow;
              if (!w || (index >= w.offset && index < w.offset + w.limit)) record(p, "axis");
            };
            if (wide) for (const v of axisVariants(dcaOpt.axis, dcaOpt.protects)) recordAxis(v.p0);
            if (dcaOpt.axis.perRange && tags && !isLowRangeInd(c.ind))
              for (const v of axisRangeVariants(dcaOpt.axis, protects, tags)) recordAxis(v.p0);
          }
        }
      }
      done += per + (floors?.pairProtects?.[`${c.bot}|${c.ind}`]?.length ?? 0) +
        (recoveredPlain.get(`${c.bot}|${c.ind}`)?.length ?? 0);
      continue;
    }
    // long and short run independently: each direction on its own side-filtered signal (its own position slot), so
    // an open long never drops a short signal (and vice versa); a one-sided signal runs once, as before
    const sides: Array<Int8Array[] | null> = sigs.map((x) => (x ? sidesOf(x) : null));
    const orderedSides = symbolDirections(
      series.filter((s) => sides[s]),
      (s) => sides[s]!,
    );
    const exitSideSignals = (exitSigs ?? sigs).map((x) => {
      const xs = x ? sidesOf(x) : null;
      if (!xs?.length) return null;
      if (xs.length > 1) return { long: xs[0], short: xs[1] };
      let first = 0;
      for (const value of xs[0])
        if (value !== 0) {
          first = value;
          break;
        }
      return first > 0
        ? { long: xs[0], short: null }
        : first < 0
          ? { long: null, short: xs[0] }
          : { long: null, short: null };
    });
    const exitSides = new Map(
      ([1, -1] as const).map((side) => [
        side,
        symbolDirections(
          series.filter((s) => exitSideSignals[s]),
          (s) => {
            const scoped = side === 1 ? exitSideSignals[s]?.long : exitSideSignals[s]?.short;
            return scoped ? [scoped] : [];
          },
        ),
      ]),
    );
    // short-lane floors can map two grid configs onto one: each config id is built once
    const built = floors?.countSeen ?? new Set<string>();
    const fitted = fittedRangeTps(
      c.ind,
      laneOf(c.ind).tf ?? u.bars[series[0]]?.tfMin ?? 1,
      floors?.rangeFit
        ? (floors.countFitProtects ?? protects).filter((p) => (p.lowRangeOnly === true) === isLowRangeInd(c.ind))
        : protects,
      sigma1m,
      floors?.rangeFit,
    );
    const laneTf = laneOf(c.ind).tf ?? u.bars[series[0]]?.tfMin ?? 1;
    const pairKey = `${c.bot}|${c.ind}`;
    const tagsOk = floors?.pairTags?.[pairKey];
    const heldRangeTags = heldRangeTagsByPair.get(pairKey) ?? new Set<string>();
    const heldOnlyPair = !!floors?.heldPairsOnly?.has(pairKey);
    // grid.baseCells: the Base-passed cells of this pair, and the ranges they cover
    const cellKeys = floors?.pairCells?.[pairKey];
    const cellSet = cellKeys ? new Set(cellKeys) : null;
    const cellTags = cellKeys ? new Set(cellKeys.map((k) => k.slice(0, k.indexOf("|")))) : null;
    const noTpCells = floors?.pairTrailingOnlyCells ? new Set(floors.pairTrailingOnlyCells[pairKey] ?? []) : null;
    const microInd = isMicroInd(laneOf(c.ind).base);
    const own = floors?.pairProtects?.[`${c.bot}|${c.ind}`];
    const recovered = recoveredPlain.get(pairKey) ?? [];
    const recoveredSet = new Set(recovered);
    const pairProtects = own?.length || recovered.length ? [...protects, ...(own ?? []), ...recovered] : protects;
    const reachMasked = new Map<string, typeof orderedSides>();
    for (const p0 of pairProtects) {
      const exitConfig = p0.exitType === "historic";
      const kind: StratKind = protectKind(p0);
      // Recovery-only exits are not additional configured/evaluated Base cells.
      const configCounter = recoveredSet.has(p0) ? undefined : floors?.baseConfigCounter;
      if (!exitConfig && (p0.lowRangeOnly === true) !== isLowRangeInd(c.ind)) {
        done++;
        continue;
      }
      if (floors?.countKinds && !floors.countKinds.includes(kind)) {
        done++;
        continue;
      }
      const lane = recoveredSet.has(p0) ? p0 : laneProtect(p0, c.ind);
      if (lane.hold < 1 && !(lane.maxHoldMin !== undefined && hasMinutePrices(u))) {
        configCounter?.record(c.bot, c.ind, lane, kind, [], "holdTooShort");
        done++;
        continue;
      }
      // Historical Signal protections are qualified at their exact lane distances; a too-short one stays disabled
      // instead of being widened after qualification. Standard Signal protections are specified at the 15m
      // reference, so the caller marks that grid for floor adjustment after lane scaling (aliases then deduplicate
      // by effective id below). An existing position still rebuilds its exact tape so protection cannot vanish.
      const laneId = configId(c.bot, c.ind, lane);
      const heldLane = floors?.heldIds?.has(laneId) || floors?.heldOnlyIds?.has(laneId);
      const historicalProtect = own?.includes(p0) ?? false;
      if (
        isSignalInd(c.ind) &&
        (!floors?.signalReferenceGrid || historicalProtect) &&
        p0.trail > 0 &&
        lane.trail * (lane.trailStep ?? 1) + 1e-12 < (floors?.minTrail ?? 0) &&
        !heldLane
      ) {
        const st = bs ? statOf(c.ind, p0.tag, kind) : null;
        if (st) {
          st.grid++;
          st.skip.trailTooShort = (st.skip.trailTooShort ?? 0) + 1;
        }
        configCounter?.record(c.bot, c.ind, lane, kind, [], "trailTooShort");
        done++;
        continue;
      }
      // Recovered-only protects already encode the distances of the held entry. Reapplying a relative live
      // adjustment would widen them again, change the id and discard the very position this tape preserves.
      const p = recoveredSet.has(p0) || floors?.heldOnlyIds?.has(laneId) ? lane : adj(c.bot, c.ind, kind, lane);
      const id = configId(c.bot, c.ind, p);
      if (notOnly(id)) {
        configCounter?.record(c.bot, c.ind, p, kind, [], "only-ids");
        done++;
        continue;
      }
      // a held config keeps its tape whatever the filters say (its open position needs it) — but only for that:
      // failing a filter it is built held-only and takes no new seat
      const held = floors?.heldIds?.has(id) ?? false;
      const tps = p0.tag ? floors?.pairTps?.[`${c.bot}|${c.ind}`]?.[p0.tag] : undefined;
      const slb = p0.tag && !p0.trailOnly && !p0.priceDistance ? floors?.pairSl?.[pairKey]?.[p0.tag]?.[String(p0.tp)] : undefined;
      // the structural exclusions first (a cell below its range's lane floor, a Micro cell off a Micro indication):
      // neither is a Base-gate hold, and a pair's tags already leave a floored range out (rangeAppliesTo), so
      // testing baseRange first labelled every lane-floor cell a gate hold (13 Oct: grid.allSets "cells held back")
      const why =
        !exitConfig && heldOnlyPair
          ? "baseRange"
          : !exitConfig && !microIndFits(floors?.microOwnInds, p0.tag, microInd, isMicroFamilyInd(c.ind))
            ? "microOwnInds"
            : // (an untagged Wide cell reads the "wide" entry: grid.wideMinTf)
              !exitConfig && laneTf < (floors?.rangeMinTf?.[p0.tag ?? "wide"] ?? 0)
              ? "laneFloor"
              : !exitConfig && !!tagsOk && !tagsOk.includes(p0.tag ?? "") &&
                !(p0.trailOnly && !!noTpCells && noTpCells.has(protectCellKey(p)))
                ? "baseRange"
                : !exitConfig && isLowRangeInd(c.ind) && !!floors?.pairTags && !cellSet &&
                  !(p0.trailOnly && !!noTpCells)
                  ? "baseCell"
                : // only the targets of this range that passed Base
                  !exitConfig && !!tps && !(p0.trailOnly && !!noTpCells) && !tps.includes(p0.tp)
                  ? "baseTarget"
                  : // the stop ratios inside the interval Base calculated for this target (src/core/sl-calibration.ts)
                    !exitConfig && !!slb && slb.source === "samples" && !slWithinBounds(protectSlRatio(p0) ?? NaN, slb)
                    ? "baseStop"
                  : !exitConfig && !isSignalInd(c.ind) && p0.trailOnly && !!noTpCells &&
                    !noTpCells.has(protectCellKey(p))
                    ? "baseCell"
                  : !exitConfig && p0.priceDistance && !p0.trailOnly && !!floors?.pairTags && !cellSet?.has(protectCellKey(p))
                    ? "baseCell"
                  : !exitConfig && !!p0.tag && !!cellSet && !(p0.trailOnly && !!noTpCells) &&
                    (isLowRangeInd(c.ind) || cellTags!.has(p0.tag)) &&
                    // Proofs identify the actual lane cell, including feedback. A source cell cannot prove
                    // a different hold or adjusted protection unless that exact cell also passed Base.
                    !cellSet.has(protectCellKey(p))
                    ? "baseCell"
                    : !exitConfig && !p0.trailOnly && !!p0.tag && !!fitted && !fitted.has(`${p0.tag}|${p0.tp}`)
                      ? "rangeFit"
                      : null;
      const filtered = why !== null;
      const st =
        bs && !recoveredSet.has(p0) && why !== "microOwnInds" && why !== "laneFloor" ? statOf(c.ind, p0.tag, kind) : null;
      if (st) st.grid++;
      if (filtered && !held) {
        configCounter?.record(c.bot, c.ind, p, kind, [], why!);
        if (st) st.skip[why!] = (st.skip[why!] ?? 0) + 1;
        done++;
        continue;
      }
      if (built.has(id)) {
        configCounter?.record(c.bot, c.ind, p, kind, [], "duplicate");
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
      const reach = !p.exitType && p.tag && !p.trailOnly ? floors?.rangeReach?.[p.tag] : undefined;
      const runSides = p.exitType
        ? p.exitSide
          ? (exitSides.get(p.exitSide) ?? [])
          : []
        : reach && reach > 0
          ? (() => {
              // one masked copy per (range, target, hold): the stop and trail variants of a cell share it
              const key = `${p.tag}|${p.tp}|${p.hold}|${reach}`;
              let masked = reachMasked.get(key);
              if (!masked) {
                masked = orderedSides.map(({ symbol: s, direction: sg }) => ({
                  symbol: s,
                  direction: reachEntries(sg, u.bars[s], u.caches[s], p.tp, p.hold, reach),
                }));
                reachMasked.set(key, masked);
              }
              return masked;
            })()
          : orderedSides;
      for (const { symbol: s, direction: sg } of runSides) {
        const res = resume(
          id,
          s,
          sg,
          p,
          (cursor, b, direction, cache, executionProtect, series, executionCooldown) =>
            simulate(id, b, direction, executionProtect, {
              cost,
              cooldown: exitConfig ? 0 : executionCooldown,
              atr: p.atr ? series(cache.atrEma(ATR_PERIOD)) : undefined,
              fixedPathScope: cursor ? undefined : u,
              cursor,
            }),
          !!p.exitType && !!exitSigs,
        );
        for (const tr of res.trades) {
          tr.kind = kind;
          trades.push(tr);
        }
        if (res.open) open.push(res.open);
        const intent = pendingFromResult(u.bars[s].sym, res);
        if (intent) pending.push(intent);
      }
      // a range tape with fewer closes than its gate needs can never take a seat: not kept (memory) — unless it is
      // held: its open position needs the tape for its exit (dropped, the position was carried without one), so it
      // is kept held-only (no new seat)
      const enough =
        !rangeGated(p.tag) || (floors?.continuations?.closed(id) ?? trades.length) >= rangeMinN;
      if (st && !filtered) {
        if (!enough) st.few++;
        else statKept(st, p);
      }
      configCounter?.record(c.bot, c.ind, p, kind, trades);
      if (!floors?.countOnly && (enough || held)) {
        const tp = atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, open, pending));
        if (filtered || !enough || recoveredSet.has(p0) || floors?.heldOnlyIds?.has(id)) tp.heldOnly = true;
        out.push(floors?.tapeSink?.(tp) ?? tp);
      }
      done++;
      yield { done, total };
    }
    // A held ladder retains the exact economics stamped into its ID. It can manage exits after a spacing/weight
    // change or after DCA is disabled, but the old candidate never takes a new seat or supplies the new set's proof.
    for (const id of floors?.heldIds ?? []) {
      if (built.has(id) || !id.startsWith(`${c.bot}|${c.ind}|`)) continue;
      const kind = kindOfId(id);
      if (kind !== "dca" && kind !== "dca-active") continue;
      const p = parseConfigId(id)?.protect;
      if (!p?.dca || notOnly(id)) continue; // legacy missing economics stay protected by the held-position book
      if (dcaOpt && !dcaOpt.noDca && dcaOpt.protects.some((p0) =>
        configId(c.bot,c.ind,{ ...adj(c.bot,c.ind,kind,laneProtect(p0,c.ind)),dca:dcaSnapshot(dcaOpt.dca) },kind) === id))
        continue; // the current generated set below keeps its ordinary independent admission verdict
      const trades: Trade[] = [], open: OpenPosition[] = [], pending: ConfigTape["pending"] = [];
      for (const { symbol: s, direction: sg } of orderedSides) {
        const view = cappedExecution(u, s, sg, p, cooldown);
        const res = simulateDca(id, view.bars, view.signal, view.protect, p.dca, kind === "dca-active", cost, view.cooldown);
        stampCappedOpen(res.open, view);
        trades.push(...res.trades);
        if (res.open) open.push(res.open);
        if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
      }
      const tp = atFrom(makeTape(id,c.bot,c.ind,p,kind,syms,trades,open,pending));
      tp.heldOnly = true;
      out.push(floors?.tapeSink?.(tp) ?? tp);built.add(id);total++;done++;
      yield { done, total };
    }
    // every validated indication builds every strategy set: a Micro indication trades the Micro cells of the base
    // grid and its DCA / DCA Active / Axis sets as every other pair does (each config judged on its own results)
    if (dcaOpt) {
      // Axis per range: the Wide ladders (DCA and Axis) only for a pair that passed Base for Wide — a pair that
      // passed only in a range gets that range's ladders instead of being judged as Wide
      const failedBase = tagsOk !== undefined && tagsOk.length === 0;
      const wideOk = floors?.wideEnabled !== false && !isLowRangeInd(c.ind) && !failedBase && !(dcaOpt.axis?.perRange && tagsOk && !tagsOk.includes(""));
      for (const p0 of dcaOpt.noDca ? [] : dcaOpt.protects) {
        for (const active of [false, true]) {
          const kind: StratKind = active ? "dca-active" : "dca";
          if (floors?.countKinds && !floors.countKinds.includes(kind)) {
            done++;
            continue;
          }
          const p = { ...adj(c.bot, c.ind, kind, laneProtect(p0, c.ind)), dca: dcaSnapshot(dcaOpt.dca) };
          if (p.hold < 1 && !(p.maxHoldMin !== undefined && hasMinutePrices(u))) {
            floors?.baseConfigCounter?.record(c.bot, c.ind, p, kind, [], "holdTooShort");
            done++; continue;
          }
          const id = configId(c.bot, c.ind, p, kind);
          if (notOnly(id) || b6Skip(id, `${c.bot}|${c.ind}`, "dca")) {
            floors?.baseConfigCounter?.record(c.bot, c.ind, p, kind, [], "only-ids");
            done++;
            continue;
          }
          const st = bs ? statOf(c.ind, p0.tag, kind) : null;
          if (st) st.grid++;
          const held = floors?.heldIds?.has(id) ?? false;
          if (!wideOk && !held) {
            floors?.baseConfigCounter?.record(c.bot, c.ind, p, kind, [], "baseRange");
            if (st) st.skip.baseRange = (st.skip.baseRange ?? 0) + 1;
            done++;
            continue;
          }
          if (built.has(id)) {
            floors?.baseConfigCounter?.record(c.bot, c.ind, p, kind, [], "duplicate");
            if (st) st.skip.duplicate = (st.skip.duplicate ?? 0) + 1;
            done++;
            continue;
          }
          built.add(id);
          if (st && wideOk) {
            st.built++;
            statKept(st, p);
          } else if (st) {
            st.skip.baseRange = (st.skip.baseRange ?? 0) + 1;
          }
          const trades: Trade[] = [];
          const open: OpenPosition[] = [];
          const pending: ConfigTape["pending"] = [];
          for (const { symbol: s, direction: sg } of orderedSides) {
            const res = resume(id, s, sg, p, (cursor, b, direction, _cache, executionProtect, _series, executionCooldown) =>
              simulateDca(id, b, direction, executionProtect, dcaOpt.dca, active, cost, executionCooldown, cursor),
            );
            for (const tr of res.trades) trades.push(tr);
            // a ladder open at the last close is carried (marked open in the simulation, held in paper / live)
            if (res.open) open.push(res.open);
            if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
          }
          floors?.baseConfigCounter?.record(c.bot, c.ind, p, kind, trades);
          if (!floors?.countOnly) {
            const tp = atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, open, pending));
            if (!wideOk) tp.heldOnly = true;
            out.push(floors?.tapeSink?.(tp) ?? tp);
          }
          done++;
          yield { done, total };
        }
      }
      if (dcaOpt.axis && (!floors?.countKinds || floors.countKinds.includes("axis"))) {
        let axisIndex = 0;
        const axisInWindow = () => {
          const index = axisIndex++;
          const w = floors?.countAxisWindow;
          return !w || (index >= w.offset && index < w.offset + w.limit);
        };
        const variants = axisVariants(dcaOpt.axis, dcaOpt.protects);
        for (const { p0, ax, tag } of variants) {
          if (!axisInWindow()) {
            done++;
            continue;
          }
          const p0l = laneProtect(isSignalInd(c.ind) && floors?.signalTrailMax !== undefined && p0.trailMax === undefined
            ? { ...p0, trailMax: floors.signalTrailMax } : p0, c.ind);
          if (p0l.hold < 1 && !(p0l.maxHoldMin !== undefined && hasMinutePrices(u))) {
            floors?.baseConfigCounter?.record(c.bot, c.ind, p0l, "axis", [], "holdTooShort");
            done++; continue;
          }
          // the id is the lane cell + variant, never the feedback-adjusted placeholder: Axis takes its stops from
          // the axis / ATR floored at deskFloor / revFloor (which carry the feedback floors; fixed exits use p.sl),
          // so a raised placeholder stop must not change the id — a held position would lose its tape
          const id = configId(c.bot, c.ind, p0l, "axis").replace(/\|axis$/, `${tag}|axis`);
          // each Axis config reads its own live-feedback record (setKeyOf: pair × axis × its variant tag), never a
          // sibling depth's or range's: desk stops / trails = the configured floors and that record's floors
          const ownKey = setKeyOf(id);
          const af = adjust?.[ownKey];
          const deskFloor = {
            minSl: Math.max(minimumStopFraction(cost), floors?.minSl ?? 0, af?.minSl ?? 0),
            minTrail: Math.max(floors?.minTrail ?? 0, af?.minTrail ?? 0),
          };
          // managed revert stops (derived from the step, ≈ 0.2-0.3 % at a low ATR) are held to the same floors and take
          // the set's relative widening (they never read p.sl, so without this every adjust step was a no-op — bug
          // hunt, 13 Oct). The revert variants are the Wide (untagged) ladders: the wide floors are theirs
          const revFloor = { minSl: deskFloor.minSl, slMult: af?.slMult };
          const p = adj(c.bot, c.ind, "axis", p0l, ownKey);
          if (notOnly(id) || b6Skip(id, `${c.bot}|${c.ind}`, "axis")) {
            floors?.baseConfigCounter?.record(c.bot, c.ind, p0l, "axis", [], "only-ids");
            done++;
            continue;
          }
          const st = bs ? statOf(c.ind, p0.tag, "axis") : null;
          if (st) st.grid++;
          const held = floors?.heldIds?.has(id) ?? false;
          if (!wideOk && !held) {
            floors?.baseConfigCounter?.record(c.bot, c.ind, p0l, "axis", [], "baseRange");
            if (st) st.skip.baseRange = (st.skip.baseRange ?? 0) + 1;
            done++;
            continue;
          }
          if (built.has(id)) {
            floors?.baseConfigCounter?.record(c.bot, c.ind, p0l, "axis", [], "duplicate");
            if (st) st.skip.duplicate = (st.skip.duplicate ?? 0) + 1;
            done++;
            continue;
          }
          built.add(id);
          if (st && wideOk) {
            st.built++;
            statKept(st, p0l);
          } else if (st) {
            st.skip.baseRange = (st.skip.baseRange ?? 0) + 1;
          }
          const trades: Trade[] = [];
          const open: OpenPosition[] = [];
          const pending: ConfigTape["pending"] = [];
          for (const { symbol: s, direction: sg } of orderedSides) {
            if (ax.mode === "desk") {
              const res = resume(id, s, sg, p, (cursor, b, direction, cache, executionProtect, series, executionCooldown) =>
                simulateAxisDesk(
                  id,
                  b,
                  direction,
                  executionProtect,
                  ax,
                  series(cache.ema(
                    Math.max(2, Math.round(ax.centerMin ? ax.centerMin / cache.b.tfMin : ax.center)),
                  )),
                  series(cache.atr(14)),
                  cost,
                  executionCooldown,
                  deskFloor,
                  cursor,
                ),
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
            const res = resume(id, s, sg, p, (cursor, b, direction, cache, executionProtect, series, executionCooldown) =>
              simulateAxis(
                id,
                b,
                direction,
                executionProtect,
                ax,
                series(cache.ema(
                  Math.max(2, Math.round(ax.centerMin ? ax.centerMin / cache.b.tfMin : ax.center)),
                )),
                series(cache.atr(14)),
                cost,
                executionCooldown,
                revFloor,
                cursor,
              ),
            );
            for (const tr of res.trades) trades.push(tr);
            // revert positions open at the last close as well (marked open at run end, held in paper, mirrored live)
            if (res.open) open.push(res.open);
            if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
          }
          floors?.baseConfigCounter?.record(c.bot, c.ind, p, "axis", trades);
          if (!floors?.countOnly) {
            const tp = atFrom(makeTape(id, c.bot, c.ind, p, "axis", syms, trades, open, pending));
            if (!wideOk) tp.heldOnly = true;
            out.push(floors?.tapeSink?.(tp) ?? tp);
          }
          done++;
          yield { done, total };
        }
        // Axis per range: desk ladders whose targets stay inside each passed range's target band. Include held
        // ranges from a pair's otherwise empty Base entry so an open ladder keeps its own exit tape.
        const axisRangeTags = tagsOk
          ? [...new Set([...tagsOk.filter(Boolean), ...heldRangeTags])]
          : null;
        // Axis changes entry/exit economics and has no matching Low-Range Base-cell proof yet.
        if (dcaOpt.axis.perRange && axisRangeTags && !isLowRangeInd(c.ind))
          for (const rv of axisRangeVariants(
            dcaOpt.axis,
            protects.filter((p) => (p.lowRangeOnly === true) === isLowRangeInd(c.ind)),
            axisRangeTags,
            floors?.pairTps?.[`${c.bot}|${c.ind}`],
          )) {
            if (!axisInWindow()) continue;
            const p0l = laneProtect(isSignalInd(c.ind) && floors?.signalTrailMax !== undefined && rv.p0.trailMax === undefined
              ? { ...rv.p0, trailMax: floors.signalTrailMax } : rv.p0, c.ind);
            if (p0l.hold < 1 && !(p0l.maxHoldMin !== undefined && hasMinutePrices(u))) {
              floors?.baseConfigCounter?.record(c.bot, c.ind, p0l, "axis", [], "holdTooShort");
              continue;
            }
            const id = configId(c.bot, c.ind, p0l, "axis").replace(/\|axis$/, `${rv.tag}|axis`);
            const held = floors?.heldIds?.has(id) ?? false;
            const filtered = tagsOk !== undefined && !tagsOk.includes(rv.p0.tag ?? "");
            if (filtered && !held) {
              floors?.baseConfigCounter?.record(c.bot, c.ind, p0l, "axis", [], "baseRange");
              const st = bs ? statOf(c.ind, p0l.tag, "axis") : null;
              if (st) {
                st.grid++;
                st.skip.baseRange = (st.skip.baseRange ?? 0) + 1;
              }
              continue;
            }
            if (notOnly(id) || b6Skip(id, `${c.bot}|${c.ind}`, "axis")) {
              floors?.baseConfigCounter?.record(
                c.bot,
                c.ind,
                p0l,
                "axis",
                [],
                built.has(id) ? "duplicate" : "only-ids",
              );
              continue;
            }
            const st = bs ? statOf(c.ind, p0l.tag, "axis") : null;
            if (st) st.grid++;
            if (built.has(id)) {
              floors?.baseConfigCounter?.record(c.bot, c.ind, p0l, "axis", [], "duplicate");
              if (st) st.skip.duplicate = (st.skip.duplicate ?? 0) + 1;
              continue;
            }
            built.add(id);
            // A recovered, filtered position is exit-only; it cannot count as a seat-eligible set.
            if (st && filtered) st.skip.baseRange = (st.skip.baseRange ?? 0) + 1;
            else if (st) {
              st.built++;
              statKept(st, p0l);
            }
            // this per-range Axis config's own live-feedback floors (its own setKeyOf record), as the ladders above
            const raf = adjust?.[setKeyOf(id)];
            const rf = {
              minSl: Math.max(rv.minSl, minimumStopFraction(cost), floors?.minSl ?? 0, raf?.minSl ?? 0),
              minTrail: Math.max(floors?.minTrail ?? 0, raf?.minTrail ?? 0),
              maxSl: rv.maxSl,
            };
            const trades: Trade[] = [];
            const open: OpenPosition[] = [];
            const pending: ConfigTape["pending"] = [];
            for (const { symbol: s, direction: sg } of orderedSides) {
              const res = resume(id, s, sg, p0l, (cursor, b, direction, cache, executionProtect, series, executionCooldown) =>
                simulateAxisDesk(
                  id,
                  b,
                  direction,
                  executionProtect,
                  rv.ax,
                  series(cache.ema(
                    Math.max(
                      2,
                      Math.round(rv.ax.centerMin ? rv.ax.centerMin / cache.b.tfMin : rv.ax.center),
                    ),
                  )),
                  series(cache.atr(14)),
                  cost,
                  executionCooldown,
                  rf,
                  cursor,
                ),
              );
              for (const tr of res.trades) trades.push(tr);
              if (res.open) open.push(res.open);
              if (res.pending)
                pending.push(
                  res.pendingProtect
                    ? {
                        sym: u.bars[s].sym,
                        side: res.pending,
                        protect: { ...res.pendingProtect, tag: rv.p0.tag },
                      }
                    : { sym: u.bars[s].sym, side: res.pending },
                );
            }
            floors?.baseConfigCounter?.record(c.bot, c.ind, p0l, "axis", trades);
            if (!floors?.countOnly) {
              const tp = atFrom(
                makeTape(id, c.bot, c.ind, p0l, "axis", syms, trades, open, pending),
              );
              if (filtered) tp.heldOnly = true;
              out.push(floors?.tapeSink?.(tp) ?? tp);
            }
            yield { done, total };
          }
      }
    }
    clearCappedProjections(u);
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
export function lowerBound(a: ArrayLike<number>, t: number): number {
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
 *                execute (with Block on); Historic Exit, DCA, DCA Active and Axis keep processing on their own
 *   Trailing off no trailing anywhere (also not Block-raised)
 * Toggles never stop the processing itself: every tape is still built and evaluated (Base / Main, the Block
 * feed, the base PF DCA / Axis must beat) — they only decide what executes.
 */
export function kindExecutable(kind: StratKind, tg: StrategyToggles): boolean {
  switch (kind) {
    case "normal":
      return tg.normal || tg.block;
    case "trailing":
    case "trailing-only":
      return tg.trailing && (tg.normal || tg.block);
    case "exit":
      return tg.exit !== false;
    case "dca":
      return tg.dca && !tg.dcaActive;
    case "dca-active":
      return tg.dca && tg.dcaActive;
    case "axis":
      return tg.axis !== false;
    case "block":
      return tg.block === true;
  }
}

/** Diagnostic construction never expands the engine's Base-qualified pair/range/target/cell cohort. */
export function baseAllowsTape(
  tp: Pick<ConfigTape, "bot" | "ind" | "protect" | "kind">,
  o: Pick<
    WalkForwardOptions,
    | "basePassed"
    | "basePassedRanges"
    | "basePassedTargets"
    | "baseWideLadderPairs"
    | "wideEnabled"
    | "exitBasePassed"
    | "basePassedCells"
    | "basePassedTrailingOnlyCells"
  >,
  /** An inverted research seat executes its mirror's tape but retains the source seat's qualification. */
  pair = `${tp.bot}|${tp.ind}`,
): boolean {
  if (tp.kind === "exit") return !o.exitBasePassed || o.exitBasePassed.has(pair);
  if (o.wideEnabled === false && !isSignalInd(tp.ind) && !tp.protect.tag) return false;
  if (o.basePassed && !o.basePassed.has(pair)) return false;
  if (tp.protect.trailOnly && !isSignalInd(tp.ind) && o.basePassedTrailingOnlyCells)
    return o.basePassedTrailingOnlyCells[pair]?.keys.has(protectCellKey(tp.protect)) ?? false;
  if (tp.protect.priceDistance && !cellAllowed(tp, o, pair)) return false;
  const ranges = o.basePassedRanges?.[pair];
  if (o.basePassedRanges && !ranges?.length) return false;
  // With Axis perRange off, an admitted pair's independent untagged ladders are not the plain Wide config.
  // This explicit builder permission never qualifies a plain/trailing Wide cell or another tagged range.
  if (
    !tp.protect.tag &&
    (tp.kind === "dca" || tp.kind === "dca-active" || tp.kind === "axis") &&
    o.baseWideLadderPairs?.has(pair)
  )
    return true;
  if (o.basePassedRanges && !ranges!.includes(tp.protect.tag ?? "")) return false;
  const targets = o.basePassedTargets?.[pair]?.[tp.protect.tag ?? ""];
  return (!targets || targets.includes(tp.protect.tp)) && cellAllowed(tp, o, pair);
}

/** Base-built engine configurations can collect their own processed closes before any raw tape earns a seat. */
export function processedBaseTapeEligible(tp: ConfigTape, o: WalkForwardOptions): boolean {
  if (!o.processedStages || tp.heldOnly || tp.carried || isSignalInd(tp.ind)) return false;
  const pair = `${tp.bot}|${tp.ind}`;
  const proof = tp.kind === "exit" ? o.exitBasePassed : o.basePassed;
  return !!proof?.has(pair) &&
    (tp.kind === "exit" || !o.bots.length || o.bots.includes(tp.bot)) &&
    (tp.kind === "exit" || !o.excludeRanges?.includes(tp.protect.tag ?? "wide")) &&
    baseAllowsTape(tp, o) && tapeExecutable(tp, o);
}

/**
 * Every Axis set the settings ask for, each its own tape: every mode (`modes`, else `mode`) × range type × ladder
 * depth, desk sets also plain and hybrid (`hybrids`, else `hybrid`); revert with fixed exits: one set per protect.
 * Desk sets carry their own tag (…|axd-atr3[h]) so they never share an id with revert sets (…|ax-atr3).
 */
export function axisVariants<P>(
  ax0: AxisConfig,
  protects: readonly P[],
): Array<{ p0: P; ax: AxisConfig; tag: string }> {
  if (protects.length === 0) return [];
  const modes: AxisMode[] = ax0.modes?.length ? [...new Set(ax0.modes)] : [ax0.mode ?? "revert"];
  const ranges = ax0.ranges?.length ? ax0.ranges : [ax0.range ?? "atr"];
  const depths = ax0.levelsSet?.length ? ax0.levelsSet : [ax0.levels];
  const out: Array<{ p0: P; ax: AxisConfig; tag: string }> = [];
  for (const mode of modes) {
    const desk = mode === "desk";
    if (!desk && ax0.exits === "fixed") {
      for (const p0 of protects)
        out.push({ p0, ax: { ...ax0, mode }, tag: modes.length > 1 ? "|ax-fixed" : "" });
      continue;
    }
    const hybrids = desk
      ? ax0.hybrids?.length
        ? [...new Set(ax0.hybrids)]
        : [!!ax0.hybrid]
      : [false];
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
 * Whether a config of this tape trades under the toggles: kindExecutable, except a signal's own base (signalOwnBase)
 * — its Normal always, its Trailing with the Trailing switch — whatever the engine's Normal / Block switches say.
 */
export function effectiveStrategyToggles(
  tp: Pick<ConfigTape, "kind" | "ind"> & Partial<Pick<ConfigTape, "protect">>,
  o: Pick<WalkForwardOptions, "toggles" | "rangeOpts">,
): StrategyToggles {
  const tag = tp.kind === "exit" ? "exit" : isSignalInd(tp.ind) ? "sig" : tp.protect?.tag ?? "wide";
  const own = o.rangeOpts?.[tag];
  return { ...o.toggles, normal: o.toggles.normal && own?.normal !== false,
    trailing: o.toggles.trailing && own?.trailing !== false };
}

export function tapeExecutable(
  tp: Pick<ConfigTape, "kind" | "ind"> & Partial<Pick<ConfigTape, "protect">>,
  o: Pick<WalkForwardOptions, "toggles" | "signalOwnBase" | "signalCoordinationOnly" | "rangeOpts">,
): boolean {
  if (o.signalCoordinationOnly && isSignalInd(tp.ind) && !isSignalCoordinationInd(tp.ind)) return false;
  if (tp.protect) {
    const base = laneOf(tp.ind).base, tag = tp.kind === "exit" ? "exit" : tp.protect.tag;
    if (!microIndFits(false, tag, isMicroInd(base), isMicroFamilyInd(base))) return false;
    if (isLowRangeInd(base) && tag !== "lr") return false;
  }
  const tg = effectiveStrategyToggles(tp, o);
  // A trailing Exit, DCA or hybrid Axis must also respect the master. Never silently change its qualified economics.
  if (!tg.trailing && ((tp.protect?.trail ?? 0) > 0 || tp.protect?.trailOnly || (tp.kind === "axis" && /\|axd?-.*h(?:\||$)/.test((tp as Partial<ConfigTape>).id ?? "")))) return false;
  // Signals with an explicitly independent base keep their own Normal switch.
  // The engine master still controls trailing geometry and every other family.
  if (isPlainKind(tp.kind) && tp.kind !== "exit" && o.signalOwnBase && isSignalInd(tp.ind) &&
      o.rangeOpts?.sig?.normal !== false)
    return !isTrailingKind(tp.kind) || tg.trailing;
  return kindExecutable(tp.kind, tg);
}

/** Block level from the entry's own config × symbol × side closes, in independent last-n windows. */
export function blockLevel(
  tp: ConfigTape,
  entryT: number,
  b: BlockConfig,
  scope?: { sym?: string; side?: number },
  observed?: { n: number },
): number {
  if (observed) observed.n = 0;
  const end = lowerBound(tp.exitT, entryT + 1);
  const idx = scope?.sym ? symTradeIdx(tp, scope.sym) : undefined;
  if (idx === null) return 0;
  const side = scope?.side;
  const scopedEnd = idx ? lowerBound(idx, end) : end;
  // Diagnostic availability counts the full bounded own tail, including rows beyond an unknown outcome that
  // stops level calculation. Counting separately leaves the original finite-window decision unchanged.
  if (observed)
    for (let j = scopedEnd - 1; j >= 0 && observed.n < b.maxLevel; j--) {
      const i = idx ? idx[j] : j;
      if (!side || tp.side[i] === side) observed.n++;
    }
  let level = 0;
  let sum = 0;
  let n = 0;
  for (let j = scopedEnd - 1; j >= 0 && n < b.maxLevel; j--) {
    const i = idx ? idx[j] : j;
    if (side && tp.side[i] !== side) continue;
    n++;
    const r = tp.r[i];
    if (!Number.isFinite(r) || !Number.isFinite(sum + r)) return level;
    sum += r;
    if (sum > 0) level++;
  }
  return level;
}

/** one config that reached the validation check at a step: [id, validated 1 / 0, closes, PF, gross profit, gross loss] */
export type ValidationCheck = [
  id: string,
  ok: 0 | 1,
  n: number,
  pf: number,
  gp: number,
  gl: number,
];
export interface ValidationSummary {
  evaluated: number;
  passed: number;
  closes: number;
  /** Intrinsic unit-return sums of passing config windows only; histories overlap. */
  gp: number;
  gl: number;
  failures: Partial<Record<EvalGate, number>>;
  /** Equal weight per passing config; never a pool-weighted PF or a no-loss score. */
  setPf?: ValidatedSetPfAccumulator;
}

function summarizeValidation(summary: ValidationSummary | null, ev: ConfigEval, n: number, gp: number, gl: number) {
  if (!summary) return;
  summary.evaluated++;
  if (ev.ok) {
    summary.passed++;
    addValidatedSetPf(summary.setPf ??= emptyValidatedSetPf(), n, gp, gl);
    summary.closes += n;
    summary.gp += gp;
    summary.gl += gl;
  } else summary.failures[ev.fail] = (summary.failures[ev.fail] ?? 0) + 1;
}

export interface StepLog {
  t: number;
  main: number;
  real: string[];
  taken: number;
  skipped: number;
  net: number;
  /** the validation checks of the step (only when WalkForwardOptions.recordValidation is on) */
  checks?: ValidationCheck[];
  validationSummary?: ValidationSummary;
  /**
   * the step per range ("" = Wide, "mc" … "lg", "sig" = signals): the range's tapes, its configs validated at the step,
   * its candidates entering in the step and the orders taken — every enabled range shows up at every step
   */
  byRange?: Record<string, { tapes: number; validated: number; candidates: number; taken: number }>;
}

export interface WalkForwardResult {
  /** Own processed-stage evidence, separately labeled from raw historical validation and funded returns. */
  processedStages?: ProcessedReplayReport;
  /** Aggregate-only modeled result, explicitly requested in place of per-set checkpoint details. */
  processedStageSummary?: ProcessedReplaySummary;
  /** Modeled pre-start admissions; they do not occupy or fund the reported execution account. */
  processedWarmup?: { fromT: number; untilT: number; baseCutT: number };
  startT: number;
  /** seatSet "validated": the validated set V the run selected from (ids), evaluated at startT */
  validated?: string[];
  endT: number;
  opts: Omit<WalkForwardOptions, "protects" | "dcaProtects">;
  trades: Trade[];
  /** orders executed in the run and still open at its end, marked to market (outside `trades`, inside `stats`) */
  openAtEnd?: Trade[];
  /** over the closed orders and the ones still open at the end marked to market (a run's PF no longer favours
   *  configs that close fast: a loser still open at the end counts) */
  stats: Stats & Partial<Pick<UnitStats, "pfBasis" | "unknownReturns">>;
  /** Execution-sized return diagnostic. Trades retain these sized returns for cash/equity; primary stats are unit returns. */
  sizedStats?: Stats;
  hourly: Array<{ t: number; net: number; n: number; pf: number }>;
  /** PF per consecutive 8h block: stability view */
  blocks: Array<{ t: number; n: number; pf: number; net: number }>;
  steps: StepLog[];
  byConfig: Array<{ id: string; n: number; net: number; pf: number }>;
  byKind: Record<string, { n: number; net: number; pf: number }>;
  /** the closed orders per direction (long and short run independently: each side's own record) */
  bySide?: {
    long: { n: number; net: number; pf: number };
    short: { n: number; net: number; pf: number };
  };
  skips: Record<string, number>;
  /**
   * The same skips per range of the candidate ("mc" … "lg", "" = Wide, "sig" = signals): why a range's seated
   * configs did not execute (the global count could not tell Micro's skips from Minimal's)
   */
  skipsByRange?: Record<string, Record<string, number>>;
  /** the skips per direction: "why|1" (long) / "why|-1" (short) */
  skipsBySide?: Record<string, number>;
  /**
   * What each skip reason dropped: the skipped candidates' count and gross unit profit / loss (their own tape result).
   * Set against the executed orders it says whether a gate drops losers (its PF below the executed) or winners.
   */
  skipPf?: Record<string, { n: number; gp: number; gl: number }>;
  /** contrarian execution (wf.invertSeats): seat-steps whose mirror had no tape (they took no entry) */
  invertMissing?: number;
  stable: boolean;
  /**
   * Block feed: every Real-stage candidate position (taken or not) with its simulated unit result, by exit time.
   * The overall / symbol / direction / indication Block sources judge this, like the config level judges its tape.
   */
  feed: BlockFeedEntry[];
  /** causal signal activation: the active set of every step, and the set at the end (paper / live use it) */
  signalSteps?: Array<{ t: number; keys: string[] }>;
  signalActiveEnd?: string[];
  /** why each signal unit is or is not in signalActiveEnd (counts per direction and reason, the top long units) */
  signalActivationEnd?: SignalActivationEnd;
  /** block.auto: each relation × block count's record at the end of the run (key "source#level", or "key#level") */
  blockAuto?: Array<{ key: string; n: number; pf: number | null;
    state: "empty" | "flat" | "unknown" | "overflow" | "no-loss" | "measured"; raise: boolean | null }>;
  /**
   * the signal candidates of the run before any gate: every config's entry in the run, and how many of them belonged to
   * a unit not active at their step (dropped before the gates — counted here, not as skips: they are every config of
   * every inactive unit and would swamp the skip table)
   */
  signalFunnel?: {
    candidates: number;
    inactive: number;
    inactiveBySide: { "1": number; "-1": number };
  };
  /** Stable-02 coordination state at the end of the run (paper / live: relation factor, held-back symbols) */
  s2?: { factor: number; paused: string[] };
  /** Independent Stable-02 state for each Historic Exit config. */
  exitS2?: Record<string, { factor: number; paused: string[] }>;
  /** Bounded Relate history diagnostics; closes count relation-key observations, not unique exchange fills. */
  relate?: { relations: number; qualified: number; closes: number; maxSample: number; shadowCloses: number };
  /** negative-hour hedge signals at the end of the run (paper / live) */
  hedgeEnd?: string[];
}

export interface BlockFeedEntry {
  /** Independent bounded predecessor admission, not a funded order or venue fill. */
  blockProcessed?: boolean;
  blockAttribution?: BlockAttribution;
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
  /**
   * still open at the run's end (exitT = the end, r = its mark): kept in the feed for the confirmation pool's
   * intervals, never fed to the books as a close (paper and live entries after the end would read the marks)
   */
  open?: boolean;
  /** windowAuto: the candidate windows that would have raised it at its entry (AutoBlockBook.stampEntry) */
  autoRaise?: number;
  /** windowAuto pause attribution: BLOCK_SOURCES bitmask per candidate window, stamped at entry. */
  autoSources?: number[];
  /** Entry-time independent Block Auto levels, packed per source. */
  autoLevels?: number;
  /** Independent-window source masks use a versioned entry stamp. */
  autoWindowVersion?: 1;
  /** Passed every actual Real entry gate; only settled accepted orders feed accepted-order Block history. */
  accepted?: boolean;
  /** Proven relation portions from the modeled accepted entry; absent legacy provenance is unknown. */
  relateMeasured?: boolean;
  relateBase?: number;
  relateParts?: RelateParts;
  /** Rejected solely by Relate Active; its later close advances shadow steps, not accepted PF. */
  relateShadow?: boolean;
}

const acceptIndexCache = new WeakMap<object, SignalAcceptIndex>();
/**
 * The signal acceptance record of a tape set (every signal tape's closes per acceptance group), built once per tape
 * list and in slices: the run, the live step and the audit judge acceptance on the same record.
 */
export function* signalAcceptIndexGen(
  tapes: readonly ConfigTape[],
): Generator<number, SignalAcceptIndex> {
  const hit = acceptIndexCache.get(tapes);
  if (hit) return hit;
  const x = new SignalAcceptIndex([], true);
  for (const _ of x.fill(tapes)) yield -1;
  acceptIndexCache.set(tapes, x);
  return x;
}

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
  const e = engineSideCache.get(from);
  if (e) engineSideCache.set(to, e);
}

/** Retain the complete discovery record and update only the continued cohort. No historical candidate is lost. */
export function* advanceGuardIndicesGen(
  from: readonly ConfigTape[],
  to: readonly ConfigTape[],
  refreshed: readonly ConfigTape[],
  deltas: readonly ConfigTape[],
  options: Pick<WalkForwardOptions, "signalAccept" | "signalSideAccept" | "engineSideAccept">,
): Generator<number, void> {
  if (options.signalAccept?.enabled || options.signalSideAccept?.enabled) {
    const index = (yield* signalAcceptIndexGen(from)).fork();
    yield* index.fill(refreshed.filter((tp) => isSignalInd(tp.ind)));
    acceptIndexCache.set(to, index);
  }
  if (options.engineSideAccept?.enabled) {
    const index = (yield* engineSideIndexGen(from)).fork();
    yield* index.append(deltas);
    engineSideCache.set(to, index);
  }
}

export function* engineSideIndexGen(
  tapes: readonly ConfigTape[],
): Generator<number, EngineSideIndex> {
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
  o: Pick<WalkForwardOptions, "signalAccept" | "signalSideAccept" | "engineSideAccept">,
): SignalGuard {
  const g = new SignalGuard();
  if (o.signalAccept?.enabled || o.signalSideAccept?.enabled)
    g.acceptIndex = drain(signalAcceptIndexGen(tapes));
  if (o.engineSideAccept?.enabled) g.engineSide = drain(engineSideIndexGen(tapes));
  return g;
}

/** Each strategy type keeps its own direction record: a losing DCA side never closes the Normal or Axis side. */
// (a close or a lookup without a type is the plain base type, as legacy feeds record it)
const directionKey = (side: number, cfg?: string, type?: string) =>
  `${side}${exitScopeSuffix(cfg, type) || (!type || type === "normal" ? "" : `|t:${type}`)}`;

/** The raw Real-candidate direction record: separate from accepted-order Block sizing evidence. */
export class CandidateDirectionBook {
  private tails = new Map<string, number[]>();
  add(e: Pick<BlockFeedEntry, "side" | "r" | "open" | "cfg" | "type">) {
    if (e.open || (e.side !== 1 && e.side !== -1)) return;
    const key = directionKey(e.side, e.cfg, e.type);
    let tail = this.tails.get(key);
    if (!tail) this.tails.set(key, (tail = []));
    // The configured direction gate is limited to 64 closes. Keep each side's full supported last-N history.
    tail.push(Number.isFinite(e.r) ? e.r : NaN);
    if (tail.length > 64) tail.splice(0, tail.length - 64);
  }
  tailSum(side: number, n: number, identity?: { cfg?: string; type?: string }): { n: number; sum: number } {
    const tail = this.tails.get(directionKey(side, identity?.cfg, identity?.type)) ?? [];
    const k = Math.min(Math.max(0, Math.floor(n)), tail.length);
    let sum = 0;
    for (let i = tail.length - k; i < tail.length; i++) sum += tail[i];
    return { n: k, sum };
  }
}

export function candidateDirectionFor(o: { sideGateN?: number }): CandidateDirectionBook | null {
  return (o.sideGateN ?? 0) > 0 ? new CandidateDirectionBook() : null;
}

/** Block sizing history is allocated only while Block is enabled; direction gating has its own raw history. */
export function bookFor(o: {
  toggles: { block?: boolean; blockActive?: boolean };
  sideGateN?: number;
  block: Parameters<typeof blockBookOf>[0];
}): BlockBook | null {
  // Block Active only coordinates which entries execute (execDecision). The book's own calculation - levels, the
  // automatic window's stamps and scores - is the same with or without it, so the procedures always run on the full
  // candidate record and the Active switch can be flipped without recomputing or starving the evidence.
  return o.toggles.block ? blockBookOf(o.block, false) : null;
}

/** Relate keeps its own bounded accepted-order history and never borrows Block/candidate-only evidence. */
export function relateBookFor(o: { relate?: RelateAdjustmentConfig }): RelateBook | null {
  return relateBookOf(o.relate);
}

/** Own candidate validation stays complete; shared post-Base gates consume settled accepted orders only. */
export function feedBooks(
  e: BlockFeedEntry,
  book: BlockBook | null,
  guard?: SignalGuard | null,
  direction?: CandidateDirectionBook | null,
  relate?: RelateBook | null,
) {
  if (e.open) return; // not closed: its mark is no result
  direction?.add(e); // every candidate, including signals and rejected entries; never accepted-only Block evidence
  if (book?.accepts(e)) book.add(e, !!e.ind && isSignalInd(e.ind));
  if (relate && (e.accepted === true || e.relateShadow === true) && e.cfg && e.ind) {
    const entry = {
      cfg: e.cfg,
      sym: e.sym,
      side: e.side,
      ind: e.ind,
      strategy: e.type ?? "normal",
      coordination: isSignalCoordinationInd(e.ind) ? (e.cfg.split("|")[0] ?? "signal") : "ordinary",
      range: rangeOfId(e.cfg) || "wide",
      r: e.r,
      closedAt: e.exitT,
      accepted: e.accepted === true,
      relateMeasured: e.relateMeasured,
      relateBase: e.relateBase,
      relateParts: e.relateParts,
    };
    if (e.accepted === true) relate.add(entry);
    else relate.advanceShadow(entry);
  }
  // keyed by the candidate's config (the same key execDecision checks); the exit time feeds the loss-cluster guard
  if (guard && e.ind && isSignalInd(e.ind)) {
    const coordination = isSignalCoordinationInd(e.ind);
    const population = coordination ? "coordination" : "signals";
    // the signal entry the close belongs to: its k configs count once in the loss cluster and the acceptance counts
    const onset =
      e.entryT !== undefined ? `${e.ind}|${e.sym}|${e.side > 0 ? 1 : -1}|${e.entryT}` : undefined;
    guard.add(
      guardKey(e.cfg ?? e.ind, e.sym, e.side, e.type ?? "normal"),
      e.r,
      e.exitT,
      e.side,
      onset,
      population,
      e.accepted === true && !isHistoricExitConfig(e.cfg, e.type),
    );
    guard.addAccept(
      acceptKey(e.ind, e.sym, e.side, e.type ?? "normal", e.cfg),
      e.r,
      e.exitT,
      onset,
    );
    if (e.accepted === true && !isHistoricExitConfig(e.cfg, e.type))
      guard.addAccept(sideAcceptKey(e.side, coordination), e.r, e.exitT, onset);
  }
}

export interface Selection {
  id: string;
  score: number;
  window: { n: number; net: number; pf: number; ddt: number; gp?: number; gl?: number };
}

/** Keep priority ordering unchanged while making large rank construction cooperative. */
export function* selectionRankGen(selections: readonly Selection[]): Generator<number, Map<string, number>> {
  const sorted = [...selections];
  const compare = (a: Selection, b: Selection) => b.score - a.score || (a.id < b.id ? -1 : 1);
  let finite = true, work = 0;
  for (const item of sorted) {
    if (!Number.isFinite(item.score)) finite = false;
    if (++work % 1024 === 0) yield -14;
  }
  if (finite) yield* selectionSortGen(sorted, compare);
  else sorted.sort(compare);
  const ranks = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    ranks.set(sorted[i].id, i);
    if (++work % 1024 === 0) yield -14;
  }
  return ranks;
}

/** Share of exit-hours in [a, b) with a positive summed return. */
function greenShare(tp: ConfigTape, a: number, b: number): number {
  if (b <= a) return 0;
  let curH = -1;
  let cur = 0;
  let hours = 0;
  let green = 0;
  for (let i = a; i < b; i++) {
    const h = settledHourT(tp.exitT[i]) / H;
    if (h !== curH) {
      // the hour before closes (no closure per call: this runs for every validated tape on every step)
      if (curH >= 0) {
        hours++;
        if (cur > 0) green++;
      }
      curH = h;
      cur = tp.r[i];
    } else cur += tp.r[i];
  }
  if (curH >= 0) {
    hours++;
    if (cur > 0) green++;
  }
  return hours ? green / hours : 0;
}

/** Lower confidence bound (≈ 1σ) of the summed return over [a, b): mean·n − sd·√n, in percent. */
/** A config's selection score at t (the lower confidence bound over the selection window) — signals scored alike. */
export function selectionScoreAt(
  tp: ConfigTape,
  t: number,
  o: Pick<WalkForwardOptions, "longH" | "preH" | "signalLongH"> & Partial<WalkForwardOptions>,
): number {
  if(o.gates?.positionWindows) {const ev=positionAggregate(tp,t,o as WalkForwardOptions);return ev.ok?ev.lcb:0;}
  return lcbFast(
    tp,
    lowerBound(tp.exitT, t - tapeHistoryHours(tp, o) * H),
    lowerBound(tp.exitT, t),
  );
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

/** Strategy family. Each Historic Exit tactic and direction keeps its own selection family and seats. */
export const familyOf = (
  kind: string,
  exitSet?: Protect["exitSet"],
  exitSide?: Protect["exitSide"],
) =>
  kind === "exit"
    ? `exit-${exitSet ?? "legacy"}${exitSide === 1 ? "-long" : exitSide === -1 ? "-short" : ""}`
    : kind === "axis"
      ? "axis"
      : kind === "dca" || kind === "dca-active"
        ? "dca"
        : isTrailingKind(kind)
          ? kind
          : "base";

/** The mirror of an engine config or pair (follow ↔ revert: the same entries on the other side); null for other bots. */
export function mirrorId(id: string): string | null {
  if (id.startsWith("follow|")) return `revert|${id.slice(7)}`;
  if (id.startsWith("revert|")) return `follow|${id.slice(7)}`;
  return null;
}

/** Seat key of a tape: its pair, per family when every family has its own seats.
 *  A micro cell is its own seat, so it is not dropped for the wide cell of the same strategy. */
const seatKey = (
  tp: ConfigTape,
  o: Pick<WalkForwardOptions, "familySeats" | "rangeSeats" | "seatPer">,
) => {
  // Historic Exit and Signals never borrow an ordinary range's seat from their protection distances.
  const tag = tp.kind === "exit" || isSignalInd(tp.ind) ? undefined : tp.protect.tag;
  const family = familyOf(tp.kind, tp.protect.exitSet, tp.protect.exitSide);
  // Historic Exit always owns its exact config; a sibling's score or robustness cannot withdraw its seat.
  if (o.seatPer === "config" || tp.kind === "exit" || tag === "mc")
    return `${tag ? `${tag}|` : ""}${tp.bot}|${tp.ind}|${family}#${tp.id.replaceAll("|", "~")}${
      isTrailingKind(tp.kind) ? `|${tp.kind === "trailing-only" ? "to" : "tr"}` : ""
    }`;
  const trail = isTrailingKind(tp.kind) ? `|${tp.kind === "trailing-only" ? "to" : "tr"}` : "";
  // Pair mode may select one variant, but never across economic ranges or strategy types. The familySeats
  // option controls shared portfolio limits, not the identity on which validation and selection compete.
  const seatType = tp.kind === "dca-active" ? "dca-active" : family;
  return `${tag ? `${tag}|` : ""}${tp.bot}|${tp.ind}|${seatType}${trail}`;
};
/**
 * Micro seats per step: no cap of its own (operator, 5 Oct — "disable micro sets cap"). Micro follows `portfolio`
 * like every other family (0 = every validated config trades). It used to be held to 200 best-scored configs, which
 * silently dropped validated Micro sets once a few pairs passed Base.
 */
const microSeats = (o: Pick<WalkForwardOptions, "portfolio" | "seatPer" | "microSeats">) =>
  o.microSeats && o.microSeats > 0 ? Math.min(seatsOf(o), o.microSeats) : seatsOf(o);
/** range tag of a range seat key ("mc", "mn", "sh", "gn", "lg", "mp"), "" otherwise */
const rangeSeat = (pair: string) =>
  (/^(mc|sh|mn|mp|gn|lg|lr)\|/.exec(pair)?.[1] ?? "") as "" | RangeTag;
const seatFamily = (pair: string, familySeats: boolean | undefined) => {
  const r = rangeSeat(pair);
  if (r === "mc") return "micro";
  if (r) return r;
  const family = famOfKey(pair);
  if (family.startsWith("exit-")) {
    const lane = laneOf(pair.split("|")[1] ?? "");
    return `${family}@${lane.tf === null ? "plain" : `${lane.tf}${lane.combined ? "c" : ""}`}`;
  }
  return pair.endsWith("|tr") ? "trailing" : familySeats ? family : "base";
};
const famOfKey = (pair: string) => {
  const fields = pair.split("|");
  const family = (fields[rangeSeat(pair) ? 3 : 2] ?? "base").split("#")[0];
  return family === "dca-active" ? "dca" : family;
};
/** The optional family comparison never borrows another range's base. */
const baseComparisonKey = (tp: Pick<ConfigTape, "bot" | "ind" | "protect" | "kind">) =>
  `${tp.bot}|${tp.ind}|${tp.kind === "exit" || isSignalInd(tp.ind) ? "" : tp.protect.tag ?? ""}`;
const seatComparisonKey = (pair: string) => {
  const fields = pair.split("|");
  const tag = rangeSeat(pair);
  const offset = tag ? 1 : 0;
  return `${fields[offset]}|${fields[offset + 1]}|${tag}`;
};

/**
 * Additional strategies (DCA, Axis) must beat the base: a candidate of another family stays only when its window
 * PF is at least the best base-family (Normal / Trailing) PF of the same pair in that window.
 */
function beatsBase<T extends { pair: string; window: { pf: number } }>(
  xs: T[],
  basePf: ReadonlyMap<string, number>,
  o: Pick<WalkForwardOptions, "familySeats" | "familyNeedsBase" | "seatPer">,
): T[] {
  if (!o.familySeats || o.seatPer === "config" || o.familyNeedsBase !== true) return xs;
  return xs.filter((c) => {
    const f = famOfKey(c.pair);
    if (f === "base" || f === "trailing" || f === "trailing-only" || f.startsWith("exit-")) return true;
    const b = basePf.get(seatComparisonKey(c.pair));
    // The explicitly enabled comparison requires an observed base result.
    if (b === undefined) return false;
    return c.window.pf >= b;
  });
}
const noteBase = (m: Map<string, number>, tp: ConfigTape, w: { n: number; pf: number }) => {
  if (
    w.n < 3 ||
    !Number.isFinite(w.pf) ||
    familyOf(tp.kind, tp.protect.exitSet, tp.protect.exitSide) !== "base"
  )
    return;
  const k = baseComparisonKey(tp);
  m.set(k, Math.max(m.get(k) ?? -Infinity, w.pf));
};

/** Cooperatively filter a potentially large candidate catalog without changing its order. */
function* filterSeatsGen<T>(values: readonly T[], keep: (value: T) => boolean): Generator<number, T[]> {
  const result: T[] = [];
  let work = 0;
  for (const value of values) {
    if (keep(value)) result.push(value);
    if (++work % 1024 === 0) yield -14;
  }
  return result;
}

/** Match native stable score sorting; keep its exact behavior for unusual non-finite scores. */
function* sortSeatsGen<T extends Selection>(values: T[]): Generator<number, void> {
  let finite = true, work = 0;
  for (const value of values) {
    if (!Number.isFinite(value.score)) finite = false;
    if (++work % 1024 === 0) yield -14;
  }
  if (!finite) values.sort((x, y) => y.score - x.score);
  else yield* selectionSortGen(values, (x, y) => y.score - x.score);
}

/** The synchronous API is retained for existing callers; the simulation drives the generator in slices. */
export function pickSeats(
  cands: ReadonlyArray<Selection & { pair: string }>,
  seats: number,
  picks: Array<Selection & { pair?: string }>,
  pairs: Set<string>,
  o: Pick<WalkForwardOptions, "familySeats" | "laneSeats" | "rangeSeats" | "portfolio" | "seatPer" | "microSeats">,
): Selection[] {
  const gen = pickSeatsGen(cands, seats, picks, pairs, o);
  for (;;) { const next = gen.next(); if (next.done) return next.value; }
}

/** Pick each range and strategy family independently while yielding during large catalogs. */
export function* pickSeatsGen(
  cands: ReadonlyArray<Selection & { pair: string }>,
  seats: number,
  picks: Array<Selection & { pair?: string }>,
  pairs: Set<string>,
  o: Pick<WalkForwardOptions, "familySeats" | "laneSeats" | "rangeSeats" | "portfolio" | "seatPer" | "microSeats">,
  alreadySorted = false,
): Generator<number, Selection[]> {
  const ls = o.laneSeats ?? 0, rangeOut: Selection[] = [];
  let work = 0;
  let ordered = alreadySorted;
  let previousScore = Infinity;
  if (ordered) for (const c of cands) {
    if (!Number.isFinite(c.score) || c.score > previousScore) ordered = false;
    previousScore = c.score;
    if (++work % 1024 === 0) yield -14;
  }
  const byRange = new Map<RangeTag, Array<Selection & { pair: string }>>();
  const heldByRange = new Map<RangeTag, Array<Selection & { pair?: string }>>();
  const plain: Array<Selection & { pair: string }> = [], plainHeld: Array<Selection & { pair?: string }> = [];
  for (const c of cands) {
    const tag = rangeSeat(c.pair);
    if (!tag) plain.push(c);
    else {
      let xs = byRange.get(tag);
      if (!xs) byRange.set(tag, (xs = []));
      xs.push(c);
    }
    if (++work % 1024 === 0) yield -14;
  }
  for (const p of picks) {
    const tag = rangeSeat(p.pair ?? "");
    if (!tag) plainHeld.push(p);
    else {
      let xs = heldByRange.get(tag);
      if (!xs) heldByRange.set(tag, (xs = []));
      xs.push(p);
    }
    if (++work % 1024 === 0) yield -14;
  }
  for (const r of RANGE_TAGS) {
    const xs = byRange.get(r) ?? [], held = heldByRange.get(r) ?? [];
    if (xs.length || held.length) {
      const selected = yield* pickByLaneGen(xs, r === "mc" ? microSeats(o) : seats, held, pairs, r === "mc" ? 0 : ls, ordered);
      for (const pick of selected) { rangeOut.push(pick); if (++work % 1024 === 0) yield -14; }
    }
  }
  const exitFamily = (pair: string) => famOfKey(pair).startsWith("exit-");
  const exits: typeof plain = [], trail: typeof plain = [], rest: typeof plain = [];
  const exitHeld: typeof plainHeld = [], trailHeld: typeof plainHeld = [], restHeld: typeof plainHeld = [];
  for (const c of plain) {
    (exitFamily(c.pair) ? exits : c.pair.endsWith("|tr") ? trail : rest).push(c);
    if (++work % 1024 === 0) yield -14;
  }
  for (const p of plainHeld) {
    const pair = p.pair ?? "";
    (exitFamily(pair) ? exitHeld : pair.endsWith("|tr") ? trailHeld : restHeld).push(p);
    if (++work % 1024 === 0) yield -14;
  }
  const trailOut = yield* pickByLaneGen(trail, seats, trailHeld, pairs, ls, ordered);
  const exitFamilySet = new Set<string>();
  for (const c of exits) {
    exitFamilySet.add(seatFamily(c.pair, o.familySeats));
    if (++work % 1024 === 0) yield -14;
  }
  const exitFamilies = [...exitFamilySet], exitOut: Selection[] = [];
  for (const f of exitFamilies) {
    const own = yield* filterSeatsGen(exits, (c) => seatFamily(c.pair, o.familySeats) === f);
    const held = yield* filterSeatsGen(exitHeld, (p) => seatFamily(p.pair ?? "", o.familySeats) === f);
    const selected = yield* pickByLaneGen(own, seats, held, pairs, ls, ordered);
    for (const pick of selected) { exitOut.push(pick); if (++work % 1024 === 0) yield -14; }
  }
  if (!o.familySeats) {
    const selected = yield* pickByLaneGen(rest, seats, restHeld, pairs, ls, ordered);
    return [...selected, ...trailOut, ...rangeOut, ...exitOut];
  }
  const fams = new Map<string, Array<Selection & { pair: string }>>();
  for (const c of rest) {
    const f = famOfKey(c.pair);
    let xs = fams.get(f);
    if (!xs) fams.set(f, (xs = []));
    xs.push(c);
    if (++work % 1024 === 0) yield -14;
  }
  const held = new Map<string, Selection[]>();
  for (const p of restHeld) {
    const f = famOfKey(p.pair ?? "");
    let xs = held.get(f);
    if (!xs) held.set(f, (xs = []));
    xs.push(p);
    if (++work % 1024 === 0) yield -14;
  }
  const out: Selection[] = [];
  for (const f of ["base", "dca", "axis", "trailing", "trailing-only", ...exitFamilies]) {
    const selected = yield* pickByLaneGen(fams.get(f) ?? [], seats, held.get(f) ?? [], pairs, ls, ordered);
    for (const pick of selected) { out.push(pick); if (++work % 1024 === 0) yield -14; }
  }
  return [...out, ...trailOut, ...rangeOut, ...exitOut];
}

/** Preserve each lane's held seats and score order, yielding while sorting or scanning large lanes. */
function* pickByLaneGen(
  cands: ReadonlyArray<Selection & { pair: string }>,
  seats0: number,
  picks: Selection[],
  pairs: Set<string>,
  laneSeats = 0,
  alreadySorted = false,
): Generator<number, Selection[]> {
  const laneKey = (pair: string) => {
    const fields = pair.split("|");
    const ind = fields[rangeSeat(pair) ? 2 : 1] ?? "";
    const l = laneOf(ind);
    return isSignalInd(ind) ? "signal" : l.tf === null ? "plain" : `${l.tf}${l.combined ? "c" : ""}`;
  };
  const byLane = new Map<string, Array<Selection & { pair: string }>>();
  let work = 0;
  for (const c of cands) {
    const k = laneKey(c.pair);
    let xs = byLane.get(k);
    if (!xs) byLane.set(k, (xs = []));
    xs.push(c);
    if (++work % 1024 === 0) yield -14;
  }
  const heldBy = new Map<string, number>();
  for (const p of picks) {
    const pair = (p as Selection & { pair?: string }).pair;
    if (pair) heldBy.set(laneKey(pair), (heldBy.get(laneKey(pair)) ?? 0) + 1);
    if (++work % 1024 === 0) yield -14;
  }
  let deficit = 0;
  for (const k of byLane.keys()) deficit += Math.max(0, laneSeats - (heldBy.get(k) ?? 0));
  const seats = Math.max(seats0, laneSeats * byLane.size, picks.length + deficit);
  if (seats - picks.length <= 0) return picks;
  const take = (c: Selection & { pair: string }) => {
    if (picks.length >= seats || pairs.has(c.pair)) return;
    pairs.add(c.pair); picks.push(c);
  };
  const sorted = new Map<string, Array<Selection & { pair: string }>>();
  for (const [key, xs] of byLane) {
    if (alreadySorted) sorted.set(key, xs);
    else {
      const copy = [...xs];
      yield* sortSeatsGen(copy);
      sorted.set(key, copy);
    }
  }
  const fill = function* (k: string, upTo: number): Generator<number, void> {
    let n = heldBy.get(k) ?? 0;
    for (const c of sorted.get(k) ?? []) {
      if (n >= upTo || picks.length >= seats) break;
      if (!pairs.has(c.pair)) {
        const before = picks.length;
        take(c);
        if (picks.length > before) { n++; heldBy.set(k, n); }
      }
      if (++work % 1024 === 0) yield -14;
    }
  };
  if (byLane.size > 1) {
    for (const k of sorted.keys()) yield* fill(k, laneSeats);
    const even = Math.floor(seats / byLane.size);
    for (const k of sorted.keys()) yield* fill(k, Math.max(laneSeats, even));
  }
  let all: ReadonlyArray<Selection & { pair: string }> = cands;
  if (!alreadySorted) {
    const copy = [...cands];
    yield* sortSeatsGen(copy);
    all = copy;
  }
  for (const c of all) {
    if (picks.length >= seats) break;
    take(c);
    if (++work % 1024 === 0) yield -14;
  }
  return picks;
}

export function selectAt(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): { picks: Selection[]; eligible: number } {
  if(o.gates.positionWindows) { const gen=selectPositionsGen(tapes,t,o);let step=gen.next();while(!step.done)step=gen.next();return step.value; }
  const fromPre = t - o.preH * H;
  const minLong = Math.max(8, o.gates.minTrades);
  const pairTotal = new Map<string, number>();
  const pairOk = new Map<string, number>();
  const basePf = new Map<string, number>();
  const cand: Array<Selection & { pair: string }> = [];
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  for (const original of tapes) {
    const longH = tapeHistoryHours(original, o);
    const fromLong = t - longH * H;
    const ddtMax = Math.max(o.gates.minDdtH ?? 0, (o.gates.maxDdtH * longH) / 72);
    if (original.kind !== "exit" && botOk && !botOk.has(original.bot)) continue;
    if (!baseAllowsTape(original, o)) continue;
    if (!cellAllowed(original, o)) continue;
    if (isSignalInd(original.ind)) {
      const ev = configEval(original, t, o);
      const pair = seatKey(original, o);
      pairTotal.set(pair, (pairTotal.get(pair) ?? 0) + 1);
      if (ev.ok) {
        pairOk.set(pair, (pairOk.get(pair) ?? 0) + 1);
        if (!original.heldOnly && tapeExecutable(original, o) && inValidated(original.id, o)) cand.push({ id: original.id, score: ev.lcb * (0.5 + ev.gh), window: { n: ev.n, net: ev.net, pf: ev.pf, gp: (ev.gp ?? 0) / 100, gl: (ev.gl ?? 0) / 100, ddt: ev.ddt }, pair });
      }
      continue;
    }
    const originalA = lowerBound(original.exitT, fromLong), originalB = lowerBound(original.exitT, t);
    if (originalB - originalA < minTradesForTape(original, o, minLong)) continue;
    const originalPair = seatKey(original, o);
    pairTotal.set(originalPair, (pairTotal.get(originalPair) ?? 0) + 1);
    const tp = qualifiedDirectionTape(original, t, o);
    if (!tp) continue;
    const a = lowerBound(tp.exitT, fromLong);
    const b = lowerBound(tp.exitT, t);
    const minSample = minTradesForTape(tp, o, minLong);
    if (b - a < minSample) continue;
    const pair = seatKey(tp, o);
    const w = win(tp, a, b);
    noteBase(basePf, tp, w);
    if (w.net <= 0 || w.pf < minPfForTape(tp, o)) continue;
    const dd = winDd(tp, a, b, t);
    const ddt = dd.ddtH;
    if (
      ddt > Math.min(ddtMax, ddtLimitH(o, tp, t, longH)) ||
      ddrFails(dd.mdd * 100, w.net, maxDdrForTape(tp, o))
    )
      continue;
    pairOk.set(pair, (pairOk.get(pair) ?? 0) + 1);
    // a held-only tape serves its open position, it takes no new seat
    if (tp.heldOnly || !tapeExecutable(tp, o) || !inValidated(tp.id, o)) continue;
    const pa = lowerBound(tp.exitT, fromPre);
    const pre = win(tp, pa, b);
    const preFloor =
      tp.ind.startsWith("tactic-") ||
      tp.ind.startsWith("relate-") ||
      tp.ind.startsWith("break-rel-") ||
      tp.ind.startsWith("break-mc-rel-")
        ? minPfForTape(tp, o)
        : PF_NEUTRAL;
    if (o.preGate && pre.n >= 3 && (pre.pf < preFloor || pre.net < 0)) continue;
    if (!validOk(tp, t, o) || !configEval(tp, t, o).ok) continue;
    const score =
      o.rank === "lcb"
        ? lcbFast(tp, a, b)
        : o.rank === "net"
          ? w.net
          : scoreStats(statsOf(tapeTrades(tp, a, b), t), minSample);
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
  if(o.gates.positionWindows) { const gen=selectPositionsGen(tapes,t,o);let step=gen.next();while(!step.done)step=gen.next();return step.value; }
  const minLong = Math.max(8, o.gates.minTrades);
  const k = Math.max(2, o.durableSplits);
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  const keep: Array<Selection & { pair: string }> = [];
  const cand0: Array<Selection & { pair: string }> = [];
  const basePf = new Map<string, number>();
  for (const original of tapes) {
    const tp = isSignalInd(original.ind) ? original : qualifiedDirectionTape(original, t, o);
    if (!tp) continue;
    const longH = tapeHistoryHours(tp, o);
    const from0 = t - longH * H;
    const ddtMax = Math.max(o.gates.minDdtH ?? 0, (o.gates.maxDdtH * longH) / 72);
    if (tp.kind !== "exit" && botOk && !botOk.has(tp.bot)) continue;
    if (!baseAllowsTape(tp, o)) continue;

    // the window a tape can be judged on: the long window, clipped to where its lane's data begins (at least
    // the pre-calc window, so a lane with too little history is not judged on a sliver)
    if (isSignalInd(tp.ind)) {
      const ev = configEval(tp, t, o);
      if (ev.ok && !tp.heldOnly && tapeExecutable(tp, o) && inValidated(tp.id, o)) cand0.push({ id: tp.id, score: ev.lcb * (0.5 + ev.gh), window: { n: ev.n, net: ev.net, pf: ev.pf, gp: (ev.gp ?? 0) / 100, gl: (ev.gl ?? 0) / 100, ddt: ev.ddt }, pair: seatKey(tp, o) });
      continue;
    }
    const from = Math.min(t - o.preH * H, Math.max(from0, tp.fromT ?? from0));
    const span = (t - from) / k;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    const w = win(tp, a, b);
    const pair = seatKey(tp, o);
    // the base is evaluated whatever the toggles: DCA / Axis still have to beat it with Normal off
    noteBase(basePf, tp, w);
    // a held-only tape serves its open position, it takes no new seat
    if (tp.heldOnly || !tapeExecutable(tp, o) || !inValidated(tp.id, o)) continue;
    if (held.has(tp.id)) {
      // Keeping an existing position never grants a new-entry seat after its current gates fail.
      if (configEval(tp, t, o).ok)
        keep.push({ id: tp.id, score: w.net, window: { ...w, ddt: 0 }, pair });
      continue;
    }
    const minSample = minTradesForTape(tp, o, minLong);
    if (w.n < minSample || w.net <= 0 || w.pf < minPfForTape(tp, o)) continue;
    if (ddrFails(winDd(tp, a, b, t).mdd * 100, w.net, maxDdrForTape(tp, o))) continue;
    let pos = 0;
    for (let i = 0; i < k; i++) {
      const sa = lowerBound(tp.exitT, from + i * span);
      const sb = lowerBound(tp.exitT, from + (i + 1) * span);
      if (sb > sa && tp.rs[sb] - tp.rs[sa] > 0) pos++;
    }
    if (pos / k < o.durableFrac) continue;
    if (o.preGate) {
      const pre = win(tp, lowerBound(tp.exitT, t - o.preH * H), b);
      const preFloor =
        tp.ind.startsWith("tactic-") ||
        tp.ind.startsWith("relate-") ||
        tp.ind.startsWith("break-rel-") ||
        tp.ind.startsWith("break-mc-rel-")
          ? minPfForTape(tp, o)
          : PF_NEUTRAL;
      if (pre.n >= 3 && (pre.pf < preFloor || pre.net < 0)) continue;
    }
    if (!validOk(tp, t, o) || !configEval(tp, t, o).ok) continue;
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
): {
  picks: Selection[];
  eligible: number;
  checks?: ValidationCheck[];
  validationSummary?: ValidationSummary;
} {
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
export const EVAL_GATES = [
  "closes",
  "net",
  "pf",
  "pre",
  "lcb",
  "lastN",
  "rangeGate",
  "context",
  "ddt",
  "ddr",
  "green",
  "stable",
] as const;
export type EvalGate = (typeof EVAL_GATES)[number];
export type ConfigEval = (
  | {
      ok: true;
      lcb: number;
      gh: number;
      ddt: number;
      pf: number;
      n: number;
      net: number;
      gp?: number;
      gl?: number;
    }
  | { ok: false; fail: EvalGate; pf: number; n: number; net: number; gp?: number; gl?: number }) & {
    /** Signals qualify exact own contexts. Unfiltered history remains visible as a separate diagnostic. */
    windowBasis?: "positions";
    requestedN?: number;
    drawdownPositions?: number;
    contexts?: Array<{ sym: string; side: number; evaluation: ConfigEval }>;
    candidate?: { n: number; pf: number; net: number; gp: number; gl: number };
  };

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
 *
 * The window starts where the tape's history does (tp.fromT), the clip ddtLimitH and selectDurable use: a 1m tape (at
 * most 72 h) or a 5m tape (~120 h) at longH 336 left the first block empty, the warm-up waived it, and the gate never
 * judged those lanes.
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
  const lo = t - winH * H;
  const clip = tp.fromT !== undefined && tp.fromT > lo;
  const from0 = clip ? (tp.fromT as number) : lo;
  const span = clip ? (t - from0) / blocks : (winH * H) / blocks;
  // no history before t: nothing to judge yet
  if (!(span > 0)) return warmup;
  let active = 0;
  for (let k = 0; k < blocks; k++) {
    const from = from0 + k * span;
    const a = lowerBound(tp.exitT, from);
    // a clipped span is not a whole number of ms: the last block ends at t itself (no close at t or after)
    const b = lowerBound(tp.exitT, clip && k === blocks - 1 ? t : from + span);
    const w = win(tp, a, b);
    if (w.n < 2) continue;
    active++;
    if (w.net <= 0 || w.pf < minPf) return false;
  }
  return active >= 2 || warmup;
}

/** Signal ranking/validation window; short replay boundaries remain explicit on Universe. */
export function signalHistoryHours(o: { preH: number; signalLongH?: number }): number {
  return o.signalLongH ?? SIGNAL_HISTORY_H;
}

function tapeHistoryHours(tp: Pick<ConfigTape, "ind">, o: Pick<WalkForwardOptions, "longH" | "preH" | "signalLongH">): number {
  return isSignalInd(tp.ind) ? signalHistoryHours(o) : Math.max(o.longH, o.preH);
}

const SIGNAL_SIDES = [1, -1] as const;

/** Primary count evaluator. Every sample is the exact config × symbol × side, strictly settled before t. */
export function positionConfigEval(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  sym: string,
  side: number,
): ConfigEval {
  return positionContextEval(tp, o, sym, side, positionEvaluationInput(tp, t));
}

/** One immutable source check and strict clock lookup per tape, shared by its independent contexts. */
const EMPTY_POSITION_CONTEXTS: ReadonlyMap<number, Uint32Array> = new Map();
function positionEvaluationInput(tp: ConfigTape, t: number) {
  if (!positionTapeValid(tp)) return null;
  const before = lowerBound(tp.exitT, t);
  // The per-context index is built on the first lane-scoped judgment only: a config-wide window reads the tape's own
  // exit-ordered rows and never needs it (most tapes under the default scope), so a selection does not rebuild it.
  let contexts: ReadonlyMap<number, Uint32Array> | undefined = before ? undefined : EMPTY_POSITION_CONTEXTS;
  return {
    get contexts(): ReadonlyMap<number, Uint32Array> { return (contexts ??= prepareSignalContexts(tp)); },
    before,
    returns: tp.r,
  };
}

/** The Base proof belongs to the exact config, symbol and direction's strictly earlier closes. */
export function processedBaseCheck(tp: ConfigTape, o: WalkForwardOptions, sym: string, side: number, at: number): ProcessedBaseCheck {
  let own: Uint32Array | undefined, end = 0, loaded = false;
  const verdicts = new Map<string, boolean>();

  const available = () => {
    if (!loaded) {
      loaded = true;
      const source = positionEvaluationInput(tp, at), symbol = tp.syms.indexOf(sym);
      if (source && symbol >= 0 && (side === 1 || side === -1)) {
        own = source.contexts.get(symbol * 2 + (side > 0 ? 1 : 0));
        end = own ? lowerBound(own, source.before) : 0;
      }
    }
    return end;
  };
  const recentRows = (capacity: number) => {
    const exits = tp.exitT, returns = tp.r;
    const history: ProcessedHistoryRow[] = [];
    for (let j = Math.max(0, end - capacity); j < end; j++) {
      const i = own![j];
      history.push({ exitT: exits[i], unitReturn: returns[i] });
    }
    return history;
  };
  const check: ProcessedBaseCheck = (block, configuredAuto, scope, minPfOverride) => {
    if (!available() || !own) return false;
    if (minPfOverride !== undefined && (!Number.isFinite(minPfOverride) || minPfOverride <= 1 || minPfOverride > 5))
      throw new RangeError("invalid processed Base PF override");
    const tag = isSignalInd(tp.ind) ? "sig" : tp.kind === "exit" ? "exit" : tp.protect.tag ?? "wide";
    const baseGates = scope === "context" && !configuredAuto && o.gates.stepPf
      ? { ...o.gates, stepPf: { ...o.gates.stepPf, mode: "manual" as const } } : o.gates;
    const gates = baseSetsGates(baseGates);
    const n = block ? blockRequired(block) : baseLastNForRange(gates, tag, tp.id) || Math.max(1, gates.minTrades);
    const partial = block ? 0 : partialFloorOf(gates.positionWindows, gates.lastNFloor);
    if (end < Math.min(n, partial || n)) return false;
    const rules = o.gates.stepPf;
    const autoPf = rules?.enabled && (rules.mode ?? "auto") === "auto" && configuredAuto || undefined;
    const key = `${block ? blockPolicyKey(block) : "count"}|${autoPf?.ratio ?? 0}|${scope ?? ""}|${baseGates === o.gates}|${minPfOverride ?? 0}`;
    const cached = verdicts.get(key);
    if (cached !== undefined) return cached;
    const capacity = n + (autoPf ? PROCESSED_AUTO_PF_SAMPLES : 0);
    const history = recentRows(capacity);
    const minPf = Math.max(minPfOverride ?? 0, minPfForTape(tp, { ...o, gates: baseGates }),
      minPfOf(gates, tag, tp.ind, protectStepPct(tp.protect), protectSlRatio(tp.protect)));
    const sampleN = Math.min(end, n);
    let passed = processedGateVerdict(history, capacity, { validationN: sampleN, realN: sampleN,
      minPf, ...(block && { blocks: { validation: block } }), autoPf }, "validation", at).state === "qualified";
    if (passed && scope === "context") {
      const returns = history.slice(-sampleN).map(row => row.unitReturn ?? NaN);
      const own = positionStats(returns, n, partial);
      // The signed lane defines its own Base length. Preserve the same risk, cost and minimum sample rules.
      const positionWindows = gates.positionWindows && block ? {
        ...gates.positionWindows, blocks: { ...gates.positionWindows.blocks, base: block },
      } : gates.positionWindows;
      passed = own.known && passesBase({ n: own.n, pf: profitFactor(own.gp, own.gl), net: own.net * 100,
        mdd: own.mdd * 100, configId: tp.id, rangeTag: tag, baseLast: {
          requested: n, n: own.n, gp: own.gp * 100, gl: own.gl * 100,
          stop: Math.max(0, tp.protect.sl) * 100, mdd: own.mdd * 100,
          ...(block && { signedReturns: returns }),
        } }, { ...gates, positionWindows, baseLastN: block ? 0 : gates.baseLastN,
        maxDdr: maxDdrForTape(tp, o), minPf });
    }
    verdicts.set(key, passed);
    return passed;
  };
  check.available = available;
  check.prepare = (capacity, configuredAuto, minPfOverride) => {
    if (!available() || !own) return () => false;
    if (minPfOverride !== undefined && (!Number.isFinite(minPfOverride) || minPfOverride <= 1 || minPfOverride > 5))
      throw new RangeError("invalid processed Base PF override");
    const tag = isSignalInd(tp.ind) ? "sig" : tp.kind === "exit" ? "exit" : tp.protect.tag ?? "wide";
    const rules = o.gates.stepPf;
    const base = !configuredAuto && rules ? { ...o.gates, stepPf: { ...rules, mode: "manual" as const } } : o.gates;
    const gates = baseSetsGates(base);
    if (!gates.positionWindows) {
      const prepared: PreparedProcessedBaseCheck = block => check(block, configuredAuto, "context", minPfOverride);
      return prepared;
    }
    const minPf = Math.max(minPfOverride ?? 0, minPfForTape(tp, { ...o, gates: base }),
      minPfOf(gates, tag, tp.ind, protectStepPct(tp.protect), protectSlRatio(tp.protect)));
    const auto = rules?.enabled && (rules.mode ?? "auto") === "auto" ? configuredAuto : undefined;
    const history = recentRows(capacity);
    const index = new ProcessedWindowIndex(history, at, capacity, minPf, auto);
    const windows = new Map<number, boolean>();
    const maxDdr = maxDdrForTape(tp, o);
    const stop = Math.max(0, tp.protect.sl) * 100;
    const evaluate = (block: BlockPolicy, key: string) => {
      const proof = index.evaluate(block, key);
      if (proof.state !== "qualified") return proof;
      const n = blockRequired(block);
      let pass = windows.get(n);
      if (pass === undefined) {
        const rows = history.slice(-n).map(row => row.unitReturn ?? NaN);
        const own = positionStats(rows, n);
        const gp = own.gp * 100, gl = own.gl * 100, net = gp - gl;
        pass = own.known && Number.isFinite(gp) && Number.isFinite(gl) && Number.isFinite(stop) && net > 0 &&
          own.net > 0 && own.gp >= own.gl * minPf && gp >= minPf * (gl + (gates.lossPrior ? stop : 0)) && !ddrFails(own.mdd * 100, net, maxDdr);
        windows.set(n, pass);
      }
      return pass ? proof : { ...proof, state: "failed" as const };
    };
    const prepared: PreparedProcessedBaseCheck = (block, key) => evaluate(block, key).state === "qualified";
    prepared.evaluate = evaluate;
    prepared.history = (block, key) => prepared(block, key)
      ? history.slice(-blockRequired(block)) : undefined;
    return prepared;
  };
  return check;
}
function positionContextEval(
  tp: ConfigTape,
  o: WalkForwardOptions,
  sym: string,
  side: number,
  input: ReturnType<typeof positionEvaluationInput>,
): ConfigEval {
  const policyOrNull = o.gates.positionWindows;
  if (!policyOrNull) throw new Error("Position-count policy unavailable");
  const policy: PositionWindows = policyOrNull;
  const counts = positionCounts(
    policy,
    isSignalInd(tp.ind) ? "sig" : tp.kind === "exit" ? "exit" : (tp.protect.tag ?? "wide"),
    tp.id,
  );
  if(!input) return {ok:false,fail:"closes",n:0,pf:NaN,net:NaN,gp:NaN,gl:NaN,
    windowBasis:"positions",requestedN:counts.main};
  const slot = tp.syms.indexOf(sym);
  // gates.lastNFloor: a window with fewer closes than requested but at least this many is judged on the closes it has
  const partial = partialFloorOf(policy, o.gates.lastNFloor);
  // scope "config": the config's own last N closes on every symbol and side (rows are in exit order). Scope "auto": the
  // context's own closes once it holds its floor (an independent lane), else the config's own record across symbols
  const scope = positionScopeOf(tp, policy);
  const own = scope !== "config" && slot >= 0 && (side === 1 || side === -1)
    ? input.contexts.get(slot * 2 + (side > 0 ? 1 : 0)) : undefined;
  const ownEnd = own ? lowerBound(own, input.before) : 0;
  // scope "both" (Micro's default): the lane's own window AND the config's record must pass; its own sample is reported
  if (scope === "both") {
    const lane = judge(false);
    if (!lane.ok) return lane;
    const wide = judge(true);
    return wide.ok ? lane : wide;
  }
  return judge(scope === "config" || (scope === "auto" && ownEnd < Math.max(1, partial || counts.main)));
  function judge(pooled: boolean): ConfigEval {
  const indices = pooled ? undefined : own,
    end = pooled ? input!.before : ownEnd;
  const take = (n: number, stage?: "base"|"main"|"real"|"entry") => {
    const blocks=stage?policy.blocks?.[stage]:undefined; if(blocks)n=blockRequired(blocks);
    const values: number[] = [];
    for (let j = Math.max(0, end - n); j < end; j++) values.push(input!.returns[pooled ? j : indices![j]]);
    return positionStageStats(values,n,blocks,minPfForTape(tp,o),partial);
  };
  const main = take(counts.main,"main"),
    floor = minPfForTape(tp, o),
    prior = lossPriorOf(tp, o.gates);
  const base = {
    n: main.n,
    pf: profitFactor(main.gp, main.gl),
    net: main.net * 100,
    gp: main.gp * 100,
    gl: main.gl * 100,
    windowBasis: "positions" as const,
    requestedN: main.requested,
    drawdownPositions: main.maxDrawdownPositions,
  };
  const no = (fail: EvalGate): ConfigEval => ({ ok: false, fail, ...base });
  if (tp.heldOnly || tp.carried || !main.complete) return no("closes");
  if (!main.blocksPassed) return no("pf");
  if (!main.known || !(main.net > 0)) return no("net");
  if (!qualifiedPf(main.gp, main.gl + prior, floor)) return no("pf");
  // Real and entry observations remain separate count windows, even when their sizes coincide.
  for (const [stage,n, fail] of [
    ["real",counts.real, "pre"],
    ["entry",counts.entry, "lastN"],
  ] as const) {
    const sample = take(n,stage);
    if (!sample.blocksPassed) return no(fail);
    if (!sample.complete) return no("closes");
    if (!sample.known || !(sample.net > 0) || !qualifiedPf(sample.gp, sample.gl + prior, floor))
      return no(fail);
  }
  const range = o.rangeGate && tapeRangeGateOn(o.rangeGate, tp) ? o.rangeGate : null;
  if (range) {
    const sample = take(range.lastN);
    if (!sample.complete) return no("closes");
    if (!sample.known || !qualifiedPf(sample.gp, sample.gl + prior, Math.max(floor, range.minPf)))
      return no("rangeGate");
  }
  if (main.maxDrawdownPositions > policy.maxDrawdownPositions) return no("ddt");
  if (ddrFails(main.mdd * 100, main.net * 100, maxDdrForTape(tp, o))) return no("ddr");
  if (!(main.lcb > 0)) return no("lcb");
  if (main.positiveShare < minGreenForTape(tp, o)) return no("green");
  const mainEnd=policy.blocks?.main?Math.max(0,end-policy.blocks.main.short-policy.blocks.main.minimal):end;
  const mainLongN=policy.blocks?.main?.long??counts.main;
  if (o.mode === "durable") {
    const parts = Math.max(2, o.durableSplits),
      values: number[] = [];
    if (mainLongN < parts) return no("stable");
    for (let j = mainEnd - mainLongN; j < mainEnd; j++) values.push(input!.returns[pooled ? j : indices![j]]);
    let passing = 0;
    for (let k = 0; k < parts; k++) {
      const a = Math.floor((values.length * k) / parts),
        b = Math.floor((values.length * (k + 1)) / parts),
        sample = positionStats(values.slice(a, b), b - a);
      if (sample.known && sample.net > 0 && qualifiedPf(sample.gp, sample.gl + prior, floor))
        passing++;
    }
    if (passing < Math.ceil(parts * o.durableFrac)) return no("stable");
  }
  const blocks = rangeOptsOf(o, tp)?.stableBlocks ?? o.gates.stableBlocks ?? 0;
  if (blocks >= 2) {
    if (mainLongN < 2 * blocks) return no("stable");
    const values: number[] = [];
    for (let j = mainEnd - mainLongN; j < mainEnd; j++) values.push(input!.returns[pooled ? j : indices![j]]);
    for (let k = 0; k < blocks; k++) {
      const a = Math.floor((values.length * k) / blocks),
        b = Math.floor((values.length * (k + 1)) / blocks),
        w = positionStats(values.slice(a, b), b - a);
      if (!w.known || !(w.net > 0) || !qualifiedPf(w.gp, w.gl + prior, floor)) return no("stable");
    }
  }
  return { ok: true, lcb: main.lcb, gh: main.positiveShare, ddt: 0, ...base };
  }
}
/** The window scope a tape is judged with: its range's own scope, else the policy's, else per context. */
export function positionScopeOf(tp: Pick<ConfigTape, "ind" | "kind" | "protect">, policy: PositionWindows) {
  const tag = isSignalInd(tp.ind) ? "sig" : tp.kind === "exit" ? "exit" : (tp.protect.tag ?? "wide");
  return policy.byRange?.[tag]?.scope ?? policy.scope ?? "context";
}

function positionAggregate(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  side?: number,
  detailed = true,
): ConfigEval {
  const input = positionEvaluationInput(tp, t);
  if (!detailed && input?.before === 0)
    return { ok: false, fail: "closes", n: 0, gp: 0, gl: 0, net: 0, pf: profitFactor(0, 0), windowBasis: "positions" };
  const contexts: NonNullable<ConfigEval["contexts"]> | undefined = detailed ? [] : undefined;
  // scope "config": every context reads the same pooled window, so it is judged once (counting it once per context
  // multiplied the reported closes and sums by the number of contexts)
  if (o.gates.positionWindows && positionScopeOf(tp, o.gates.positionWindows) === "config") {
    const syms = [...new Set(tp.syms)];
    const e = positionContextEval(tp, o, syms[0] ?? "", side ?? 1, input);
    if (contexts) for (const sym of syms) for (const direction of side === undefined ? SIGNAL_SIDES : [side])
      contexts.push({ sym, side: direction, evaluation: e });
    // the same shape as the aggregate below (the detailed and the summary readings must agree)
    const base = { n: e.n, gp: e.gp ?? 0, gl: e.gl ?? 0, net: (e.gp ?? 0) - (e.gl ?? 0), pf: profitFactor(e.gp ?? 0, e.gl ?? 0),
      ...(contexts ? { contexts } : {}), windowBasis: "positions" as const };
    return e.ok ? { ok: true, lcb: e.lcb, gh: e.gh, ddt: 0, ...base } : { ok: false, fail: e.fail, ...base };
  }
  let passed = 0, nAll = 0, gpAll = 0, glAll = 0, nYes = 0, gpYes = 0, glYes = 0;
  let lcb = Infinity, gh = Infinity, firstFail: EvalGate | undefined;
  for (const sym of new Set(tp.syms)) for (const direction of side === undefined ? SIGNAL_SIDES : [side]) {
    const e = positionContextEval(tp, o, sym, direction, input);
    contexts?.push({ sym, side: direction, evaluation: e });
    nAll += e.n; gpAll += e.gp ?? 0; glAll += e.gl ?? 0;
    if (e.ok) {
      passed++; nYes += e.n; gpYes += e.gp ?? 0; glYes += e.gl ?? 0;
      lcb = Math.min(lcb, e.lcb); gh = Math.min(gh, e.gh);
    } else firstFail ??= e.fail;
  }
  const gp = passed ? gpYes : gpAll, gl = passed ? glYes : glAll;
  const base = {
    n: passed ? nYes : nAll,
    gp,
    gl,
    net: gp - gl,
    pf: profitFactor(gp, gl),
    ...(contexts ? { contexts } : {}),
    windowBasis: "positions" as const,
  };
  return passed
    ? {
        ok: true,
        lcb,
        gh,
        ddt: 0,
        ...base,
      }
    : {
        ok: false,
        fail: firstFail ?? "closes",
        ...base,
      };
}

/**
 * Run-scoped memo of position evaluations. A tape's verdict depends on the clock only through the number of closes settled
 * before it, so a cached verdict stays exact until one of that tape's closes settles. With the run's exit events attached
 * (`attach`), the memo learns which tapes have a newly settled close from one sorted list, without opening any tape's columns
 * (they live compressed on disk): an unchanged tape costs a set lookup, a changed one a fresh evaluation.
 */
export class EvalMemo {
  readonly byTape = new Map<ConfigTape, { before: number; ev: ConfigEval; token?: object }>();
  /**
   * Per tape, what the selection's static filters said (bots, Base admission, cell, seat key): they read only option
   * objects that stay fixed through a run, so they are computed once; `staticRefs` are the inputs they were computed
   * with, and any change rebuilds them.
   */
  readonly staticSeat = new Map<ConfigTape, { keep: boolean; pair: string }>();
  staticRefs: readonly unknown[] | null = null;
  /** tapes with a close settled since their verdict was computed (only while events are attached) */
  readonly dirty = new Set<ConfigTape>();
  private times = new Float64Array(0);
  private owner = new Int32Array(0);
  private tapes: readonly ConfigTape[] = [];
  private ptr = 0;
  private clock = -Infinity;
  private fromT = -Infinity;
  private toT = -Infinity;
  private indexed = new WeakMap<ConfigTape, number>();
  private token = {};
  private advancing = false;
  uniqueTapes = true;
  tracking = false;

  /** A cached verdict may skip its settled-close lookup only for this exact attached index and forward clock. */
  tokenFor(tp: ConfigTape, forward: boolean): object | undefined {
    return forward && this.indexed.has(tp) ? this.token : undefined;
  }
  /** Input order is also the stable tie order in the selector. */
  indexOf(tp: ConfigTape): number | undefined { return this.indexed.get(tp); }
  covers(fromT: number, toT: number, tapes: number): boolean {
    return this.tracking && this.tapes.length === tapes && this.clock <= fromT &&
      fromT >= this.fromT && toT <= this.toT;
  }

  /** Index the exit times of every tape inside [fromT, toT), sorted; slices (yields −1) so a long scan stays responsive. */
  *attach(tapes: readonly ConfigTape[], fromT: number, toT: number): Generator<number, void> {
    if (this.advancing) throw new Error("position memo advance already in progress");
    let count = 0;
    const lo: number[] = [];
    const indexed = new WeakMap<ConfigTape, number>();
    let uniqueTapes = true;
    // Minute-aligned market closes admit a stable counting sort with a small, bounded time-axis table. If any
    // close is not exactly aligned, or the time span is too large, use the general stable permutation below.
    const minute = 60_000, origin = Math.floor(fromT / minute) * minute;
    const bucketCount = Math.ceil((toT - origin) / minute);
    let buckets: Uint32Array | undefined = Number.isSafeInteger(origin) && Number.isSafeInteger(bucketCount) &&
      bucketCount > 0 && bucketCount <= 100_000 ? new Uint32Array(bucketCount) : undefined;
    let at = performance.now();
    let scanned = 0;
    for (let i = 0; i < tapes.length; i++) {
      if (indexed.has(tapes[i])) uniqueTapes = false;
      indexed.set(tapes[i], i);
      const x = tapes[i].exitT;
      let j = lowerBound(x, fromT);
      const start = j;
      for (; j < x.length && j < tapes[i].n && x[j] < toT; j++) {
        if (buckets) {
          const bucket = (x[j] - origin) / minute;
          if (!Number.isSafeInteger(bucket) || bucket < 0 || bucket >= buckets.length || buckets[bucket] === 0xffff_ffff)
            buckets = undefined;
          else buckets[bucket]++;
        }
        if (++scanned % 8192 === 0 && performance.now() - at > 8) { yield -1; at = performance.now(); }
      }
      lo.push(j - start);
      count += j - start;
      if (performance.now() - at > 8) { yield -1; at = performance.now(); }
    }
    if (count > 0xffff_ffff) throw new RangeError("Close index exceeds the supported 32-bit event count");
    const times = new Float64Array(count), owner = new Int32Array(count);
    if (buckets) {
      let offset = 0;
      for (let i = 0; i < buckets.length; i++) {
        const n = buckets[i]; buckets[i] = offset; offset += n;
        if (i % 8192 === 8191 && performance.now() - at > 8) { yield -1; at = performance.now(); }
      }
      let written = 0;
      for (let i = 0; i < tapes.length; i++) {
        if (!lo[i]) continue;
        const x = tapes[i].exitT;
        let j = lowerBound(x, fromT);
        for (let n = 0; n < lo[i]; n++, j++) {
          const dst = buckets[(x[j] - origin) / minute]++;
          times[dst] = x[j]; owner[dst] = i;
          if (++written % 8192 === 0 && performance.now() - at > 8) { yield -1; at = performance.now(); }
        }
        if (performance.now() - at > 8) { yield -1; at = performance.now(); }
      }
    } else {
      let k = 0;
      for (let i = 0; i < tapes.length; i++) {
        if (!lo[i]) continue;
        const x = tapes[i].exitT;
        let j = lowerBound(x, fromT);
        for (let n = 0; n < lo[i]; n++, j++) { times[k] = x[j]; owner[k] = i; k++; }
        if (performance.now() - at > 8) { yield -1; at = performance.now(); }
      }
      const order = new Uint32Array(count);
      for (let i = 0; i < count; i++) order[i] = i;
      order.sort((a, b) => times[a] - times[b]);
      yield -1;
      // Apply the sorted permutation in place; completed cycles serve as the visited marker.
      let moves = 0;
      for (let i = 0; i < count; i++) {
        if (order[i] === i) {
          if (i % 8192 === 8191) yield -1;
          continue;
        }
        const savedTime = times[i], savedOwner = owner[i];
        let dst = i;
        while (order[dst] !== i) {
          const src = order[dst];
          times[dst] = times[src]; owner[dst] = owner[src]; order[dst] = dst; dst = src;
          if (++moves % 8192 === 0) yield -1;
        }
        times[dst] = savedTime; owner[dst] = savedOwner; order[dst] = dst;
        if (++moves % 8192 === 0) yield -1;
      }
    }
    this.times = times; this.owner = owner; this.tapes = tapes; this.ptr = 0; this.clock = fromT;
    this.fromT = fromT; this.toT = toT; this.indexed = indexed; this.uniqueTapes = uniqueTapes;
    this.token = {}; this.tracking = true;
    this.dirty.clear();
  }

  /** Move the clock to t: every tape with a close settling in [clock, t) becomes dirty. False when t is not a forward move. */
  advance(t: number): boolean {
    if (this.advancing) throw new Error("position memo advance already in progress");
    if (!this.tracking || !Number.isFinite(t) || t < this.fromT || t > this.toT) return false;
    if (t < this.clock) return false;
    if (t === this.clock) return true;
    while (this.ptr < this.times.length && this.times[this.ptr] < t) this.dirty.add(this.tapes[this.owner[this.ptr++]]);
    this.clock = t;
    return true;
  }

  /** Gather and publish dirty tapes in bounded slices; a cancelled scan leaves the clock and cursor unchanged. */
  *advanceGen(t: number): Generator<number, boolean> {
    if (this.advancing) throw new Error("position memo advance already in progress");
    if (!this.tracking || !Number.isFinite(t) || t < this.fromT || t > this.toT) return false;
    if (t < this.clock) return false;
    if (t === this.clock) return true;
    const end = lowerBound(this.times, t);
    // Small advances are faster without a second Set and already fit in a short slice.
    if (end - this.ptr <= 262_144) {
      while (this.ptr < end) this.dirty.add(this.tapes[this.owner[this.ptr++]]);
      this.clock = t;
      return true;
    }
    this.advancing = true;
    try {
      let cursor = this.ptr, work = 0;
      const pending = new Set<ConfigTape>();
      while (cursor < end) {
        const tp = this.tapes[this.owner[cursor++]];
        if (!this.dirty.has(tp)) pending.add(tp);
        if (++work % 2048 === 0) yield -14;
      }
      for (const tp of pending) {
        this.dirty.add(tp);
        if (++work % 2048 === 0) yield -14;
      }
      this.ptr = cursor;
      this.clock = t;
      return true;
    } finally {
      this.advancing = false;
    }
  }
}

/** Identical verdict and arithmetic without retaining per-context diagnostics for a complete catalog scan. */
export function configEvalSummary(tp: ConfigTape, t: number, o: WalkForwardOptions): ConfigEval {
  if (!o.gates.positionWindows) return configEval(tp, t, o);
  const memo = o.evalMemo;
  if (!memo) return positionAggregate(tp, t, o, undefined, false);
  const forward = memo.advance(t);
  const token = memo.tokenFor(tp, forward);
  const hit = memo.byTape.get(tp);
  // no close of this tape has settled since its verdict was computed: the cached verdict is exact, no column is opened
  if (hit && token && hit.token === token && !memo.dirty.has(tp)) return hit.ev;
  const before = lowerBound(tp.exitT, t);
  if (hit && hit.before === before) {
    hit.token = token;
    memo.dirty.delete(tp);
    return hit.ev;
  }
  const ev = positionAggregate(tp, t, o, undefined, false);
  memo.byTape.set(tp, { before, ev, token });
  memo.dirty.delete(tp);
  return ev;
}
function* selectPositionsGen(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): Generator<
  number,
  {
    picks: Selection[];
    eligible: number;
    checks?: ValidationCheck[];
    validationSummary?: ValidationSummary;
  }
> {
  const pairTotal = new Map<string, number>(),
    pairOk = new Map<string, number>(),
    basePf = new Map<string, number>(),
    baseSeated = new Set<string>();
  const cand: Array<Selection & { pair: string }> = [],
    checks: ValidationCheck[] = [],
    summary: ValidationSummary = {
      evaluated: 0,
      passed: 0,
      closes: 0,
      gp: 0,
      gl: 0,
      failures: {},
      setPf: emptyValidatedSetPf(),
    };
  // the static filters per tape, cached on the run's memo while their inputs stay the same
  const memo = o.evalMemo;
  const refs = [o.bots, o.basePassed, o.basePassedRanges, o.basePassedTrailingOnlyCells, o.baseWideLadderPairs,
    o.exitBasePassed, o.basePassedCells, o.invertSeats, o.probe, o.seatSet, o.validated, o.microSeats, o.seatPer];
  if (memo && (!memo.staticRefs || memo.staticRefs.length !== refs.length || memo.staticRefs.some((x, k) => x !== refs[k]))) {
    memo.staticSeat.clear();
    memo.staticRefs = refs;
  }
  let advanced = false;
  for (let i = 0; i < tapes.length; i++) {
    const tp = tapes[i];
    let st = memo?.staticSeat.get(tp);
    if (!st) {
      const keep = !((tp.kind !== "exit" && o.bots.length && !o.bots.includes(tp.bot)) || !baseAllowsTape(tp, o) || !cellAllowed(tp, o));
      st = { keep, pair: keep ? seatKey(tp, o) : "" };
      memo?.staticSeat.set(tp, st);
    }
    if (!st.keep) {
      if (i % 8 === 0) yield -14;
      continue;
    }
    const pair = st.pair;
    pairTotal.set(pair, (pairTotal.get(pair) ?? 0) + 1);
    if (memo && !advanced) { yield* memo.advanceGen(t); advanced = true; }
    const ev = configEvalSummary(tp, t, o),
      w = {
        n: ev.n,
        net: ev.net,
        pf: ev.pf,
        gp: (ev.gp ?? 0) / 100,
        gl: (ev.gl ?? 0) / 100,
        ddt: ev.ok ? ev.ddt : 0,
      };
    summarizeValidation(summary, ev, ev.n, w.gp, w.gl);
    if (o.recordValidation === true) checks.push([tp.id, ev.ok ? 1 : 0, ev.n, ev.pf, w.gp, w.gl]);
    noteBase(basePf, tp, w);
    if (ev.ok) {
      pairOk.set(pair, (pairOk.get(pair) ?? 0) + 1);
      if (tp.kind === "normal" || tp.kind === "trailing" || tp.kind === "trailing-only")
        baseSeated.add(baseComparisonKey(tp));
    }
    if (ev.ok && !tp.heldOnly && tapeExecutable(tp, o) && inValidated(tp.id, o))
      cand.push({
        id: tp.id,
        pair,
        score:
          o.rankBy === "green"
            ? ev.gh + Math.min(1, Math.max(0, ev.lcb)) * 1e-6
            : ev.lcb * (0.5 + ev.gh),
        window: w,
      });
    if (i % 8 === 0) yield -14; // a work slice, not a completed simulated step (a non-negative yield counts as one)
  }
  // Only the optional ladder-vs-base comparison reads this index. In the normal independent-config path,
  // building a full tape-sized Map on every decision minute added allocation and sorting pressure for no result.
  const byId = o.ladderNeedsBase ? new Map(tapes.map((tp) => [tp.id, tp])) : undefined;
  const eligible = beatsBase(
    cand.filter(
      (c) =>
        (o.seatPer === "config" ||
          (pairOk.get(c.pair) ?? 0) / Math.max(1, pairTotal.get(c.pair) ?? 0) >= o.robustFrac) &&
        (!o.ladderNeedsBase ||
          !["dca", "dca-active", "axis"].includes(byId!.get(c.id)!.kind) ||
          baseSeated.has(baseComparisonKey(byId!.get(c.id)!))),
    ),
    basePf,
    o,
  );
  yield* sortSeatsGen(eligible);
  const selected = yield* pickSeatsGen(eligible, seatsOf(o), [], new Set<string>(), o, true);
  return {
    picks: selected.map(
      ({ id, score, window }) => ({ id, score, window }),
    ),
    eligible: eligible.length,
    ...(o.recordValidation === true ? { checks } : {}),
    ...(o.recordValidation === "summary" ? { validationSummary: summary } : {}),
  };
}

/**
 * For independent per-config seats, only tapes with newly settled closes can change their score or eligibility.
 * Rebuild the small passing set after each update, preserving the full selector's original tape order for ties.
 * Other seat policies use the ordinary full selector.
 */
export class ContinuousPositionSelection {
  private readonly candidates = new Map<ConfigTape, Selection & { pair: string; index: number }>();
  private readonly memo: EvalMemo;
  private readonly byId: ReadonlyMap<string, ConfigTape>;
  constructor(memo: EvalMemo, byId: ReadonlyMap<string, ConfigTape>) {
    this.memo = memo;
    this.byId = byId;
  }

  private update(tp: ConfigTape, t: number, o: WalkForwardOptions): void {
    const index = this.memo.indexOf(tp);
    const keep = index !== undefined && !(tp.kind !== "exit" && o.bots.length && !o.bots.includes(tp.bot)) &&
      baseAllowsTape(tp, o) && cellAllowed(tp, o) && !tp.heldOnly && tapeExecutable(tp, o);
    if (!keep) {
      this.candidates.delete(tp);
      this.memo.dirty.delete(tp);
      this.memo.byTape.delete(tp);
      return;
    }
    const ev = configEvalSummary(tp, t, o);
    if (!ev.ok) { this.candidates.delete(tp); return; }
    const score = o.rankBy === "green"
      ? ev.gh + Math.min(1, Math.max(0, ev.lcb)) * 1e-6 : ev.lcb * (0.5 + ev.gh);
    this.candidates.set(tp, { id: tp.id, pair: seatKey(tp, o), index, score,
      window: { n: ev.n, net: ev.net, pf: ev.pf, gp: (ev.gp ?? 0) / 100, gl: (ev.gl ?? 0) / 100, ddt: ev.ddt } });
  }

  *reset(validated: ReadonlySet<string>, t: number, o: WalkForwardOptions): Generator<number, void> {
    this.candidates.clear();
    const free: WalkForwardOptions = { ...o, seatSet: "pool", validated: undefined, recordValidation: undefined };
    let n = 0, advanced = false;
    for (const id of validated) {
      const tp = this.byId.get(id);
      if (tp) {
        if (!advanced) { yield* this.memo.advanceGen(t); advanced = true; }
        this.update(tp, t, free);
      }
      if (++n % 8 === 0) yield -14;
    }
  }

  *refresh(t: number, o: WalkForwardOptions): Generator<number, { picks: Selection[]; eligible: number }> {
    const free: WalkForwardOptions = { ...o, seatSet: "pool", validated: undefined, recordValidation: undefined };
    if (this.memo.dirty.size) yield* this.memo.advanceGen(t);
    let n = 0;
    for (const tp of this.memo.dirty) {
      this.update(tp, t, free);
      if (++n % 8 === 0) yield -14;
    }
    const eligible = [...this.candidates.values()];
    if (eligible.every((c) => Number.isFinite(c.score)))
      yield* selectionSortGen(eligible, (a, b) => b.score - a.score || a.index - b.index);
    else eligible.sort((a, b) => b.score - a.score || a.index - b.index);
    const selected = yield* pickSeatsGen(eligible, seatsOf(free), [], new Set<string>(), free, true);
    return { picks: selected.map(
      ({ id, score, window }) => ({ id, score, window })), eligible: eligible.length };
  }
}

export function configEval(tp: ConfigTape, t: number, o: WalkForwardOptions): ConfigEval {
  if(o.gates.positionWindows) return positionAggregate(tp,t,o);
  if (isSignalInd(tp.ind)) {
    const key = signalEvaluationKey(tp, t, o);
    const symbols = new Set(tp.syms);
    const contexts = new Array<{ sym: string; side: number; evaluation: ConfigEval }>(
      symbols.size * SIGNAL_SIDES.length,
    );
    let contextIndex = 0;
    let passing = 0;
    let n = 0;
    let net = 0;
    let gp = 0;
    let gl = 0;
    let lcb = Infinity;
    let gh = Infinity;
    let ddt = -Infinity;
    let failed: Extract<ConfigEval, { ok: false }> | undefined;
    for (const sym of symbols) {
      for (const side of SIGNAL_SIDES) {
        const evaluation = signalConfigEvalWithKey(tp, t, o, sym, side, key);
        contexts[contextIndex++] = { sym, side, evaluation };
        if (evaluation.ok) {
          passing++;
          n += evaluation.n;
          net += evaluation.net;
          gp += evaluation.gp ?? 0;
          gl += evaluation.gl ?? 0;
          lcb = Math.min(lcb, evaluation.lcb);
          gh = Math.min(gh, evaluation.gh);
          ddt = Math.max(ddt, evaluation.ddt);
        } else failed ??= evaluation;
      }
    }
    const all = win(tp, lowerBound(tp.exitT, t - signalHistoryHours(o) * H), lowerBound(tp.exitT, t));
    const candidate = { n: all.n, pf: all.pf, net: all.net, gp: all.gp * 100, gl: all.gl * 100 };
    if (!passing) return { ok: false, fail: failed?.fail ?? "closes", ...candidate, contexts, candidate };
    return { ok: true, n, net, pf: profitFactor(gp, gl), gp, gl, lcb, gh, ddt, contexts, candidate };
  }
  if (directionViews.has(tp)) return configEvalRaw(tp, t, o);
  const a = configDirectionEval(tp, t, o, 1),
    b = configDirectionEval(tp, t, o, -1);
  const admitted = [a, b].filter((ev): ev is Extract<ConfigEval, { ok: true }> => ev.ok);
  if (!admitted.length) return a.n >= b.n ? a : b;
  const gp = admitted.reduce((n, ev) => n + (ev.gp ?? 0), 0),
    gl = admitted.reduce((n, ev) => n + (ev.gl ?? 0), 0);
  return {
    ok: true,
    n: admitted.reduce((n, ev) => n + ev.n, 0),
    net: admitted.reduce((n, ev) => n + ev.net, 0),
    gp,
    gl,
    pf: profitFactor(gp, gl),
    lcb: Math.min(...admitted.map((ev) => ev.lcb)),
    gh: Math.min(...admitted.map((ev) => ev.gh)),
    ddt: Math.max(...admitted.map((ev) => ev.ddt)),
  };
}

/** Full configured evaluator on an already scoped chronological record. */
function configEvalRaw(tp: ConfigTape, t: number, o: WalkForwardOptions): ConfigEval {
  const a = lowerBound(tp.exitT, t - tapeHistoryHours(tp, o) * H);
  const b = lowerBound(tp.exitT, t);
  return configEvalAt(
    tp,
    t,
    o,
    a,
    b,
    win(tp, a, b),
    Math.max(o.gates.minDdtH ?? 0, (o.gates.maxDdtH * tapeHistoryHours(tp, o)) / 72),
  );
}

// A complete Signal scan visits hundreds of thousands of tapes. Weak maps alone retain every
// derived context while the immutable source catalog is alive; bound the working set instead.
const signalEvaluationCache = new DerivedCache<ConfigTape, { key: string; contexts: Map<string, ConfigEval> }>(512);
// Indexes and compact views have variable-sized typed buffers. A key-count cap alone cannot bound their memory.
const derivedIndexBytes = Math.floor(derivedCacheBytes() / 4);
/** The same exact history + Last-N verdict for Strategy Base, causal ranking and native/model entry. */
function signalEvaluationPolicyKey(t: number, o: WalkForwardOptions): string {
  return JSON.stringify([
    t,
    signalHistoryHours(o),
    o.preH,
    o.preGate,
    o.gates,
    o.rangeGate,
    o.validLastN,
    o.signalValidLastN,
    o.rangeOpts?.sig,
    o.signalRank?.minTrades,
    o.exitMinTrades,
    o.exitMinPf,
    o.exitMinGreenHourShare,
    o.exitMaxDdr,
  ]);
}
function signalEvaluationKey(tp: ConfigTape, t: number, o: WalkForwardOptions): string {
  return signalEvaluationKeyOfPolicy(tp, signalEvaluationPolicyKey(t, o));
}
function signalEvaluationKeyOfPolicy(tp: ConfigTape, policy: string): string {
  return `${policy}|${tp.heldOnly === true ? 1 : 0}|${tp.fromT ?? ""}`;
}
type PreparedSignalContext = { tape: ConfigTape; indices: Uint32Array; key?: string; result?: ConfigEval };
function signalInitialVerdict(tp: ConfigTape, source: ConfigTape, indices: Uint32Array | null | undefined, t: number, o: WalkForwardOptions) {
  const from = t - signalHistoryHours(o) * H;
  const first = indices ? lowerBound(indices, lowerBound(source.exitT, from)) : 0;
  const before = indices ? lowerBound(indices, lowerBound(source.exitT, t)) : 0;
  let n = 0, gp = 0, gl = 0;
  if (indices) for (let j = first; j < before; j++) {
    const r = source.r[indices[j]];
    n++; if (r > 0) gp += r; else gl -= r;
  }
  const summary = { n, pf: profitFactor(gp, gl), net: (gp - gl) * 100, gp: gp * 100, gl: gl * 100 };
  const fail: EvalGate | undefined = tp.heldOnly || n < minTradesForTape(tp, o, o.gates.minTrades ?? 0) ? "closes"
    : !(Number.isFinite(summary.net) && summary.net > 0) ? "net"
    : !Number.isFinite(summary.pf) || summary.pf < minPfForTape(tp, o) ? "pf" : undefined;
  return { summary, first, before, fail };
}
function signalConfigEvalWithKey(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  sym: string,
  side: number,
  key: string,
  prepared?: PreparedSignalContext,
): ConfigEval {
  if(o.gates.positionWindows) return positionConfigEval(tp,t,o,sym,side);
  const slot = `${sym}|${side}`;
  let cached = prepared ? undefined : signalEvaluationCache.get(tp);
  if (!prepared && (!cached || cached.key !== key)) signalEvaluationCache.set(tp, (cached = { key, contexts: new Map() }));
  const hit = prepared ? (prepared.key === key ? prepared.result : undefined) : cached!.contexts.get(slot);
  if (hit) return hit;
  const save = (ev: ConfigEval) => {
    if (prepared) { prepared.key = key; prepared.result = ev; }
    else cached!.contexts.set(slot, ev);
    return ev;
  };
  const source = prepared?.tape ?? tp;
  const indices = prepared?.indices ?? signalContextOf(source, sym, side);
  const { summary, fail } = signalInitialVerdict(tp, source, indices, t, o);
  const reject = (fail: EvalGate): ConfigEval => {
    return save({ ok: false, fail, ...summary });
  };
  if (fail) return reject(fail);
  const floor = minPfForTape(tp, o);
  if (!signalLastNOk(source, sym, side, t - 1, validLastNOf(tp, o), floor, o.gates.maxDdtH, maxDdrForTape(tp, o) ?? 0, o.gates.lastNFloor ?? 0, o.gates.warmup !== false, lossPriorOf(tp, o.gates), prepared?.indices)) return reject("lastN");
  // Preserve the original tied order and all past Last-N evidence without
  // allocating/sorting Trade objects or copying the unobserved replay future.
  const end = indices ? lowerBound(indices, lowerBound(source.exitT, t + 1)) : 0;
  const own = prepared?.tape ?? indexedEvaluationTape(tp, indices!, 0, end);
  const a = lowerBound(own.exitT, t - signalHistoryHours(o) * H), b = lowerBound(own.exitT, t);
  const result: ConfigEval = tp.heldOnly ? { ok: false, fail: "closes", pf: 0, n: 0, net: 0 } : configEvalAt(own, t, o, a, b, win(own, a, b), Math.max(o.gates.minDdtH ?? 0, o.gates.maxDdtH * signalHistoryHours(o) / 72));
  return save(result);
}
export function signalConfigEval(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  sym: string,
  side: number,
): ConfigEval {
  if(o.gates.positionWindows) return positionConfigEval(tp,t,o,sym,side);
  return signalConfigEvalWithKey(tp, t, o, sym, side, signalEvaluationKey(tp, t, o));
}

/** Signals have an independently tuned validation sample; every Strategy Base path must use the same sample. */
function validLastNOf(
  tp: Pick<ConfigTape, "ind" | "protect"> & Partial<Pick<ConfigTape, "kind">>,
  o: Pick<WalkForwardOptions, "validLastN" | "signalValidLastN" | "rangeOpts">,
): number {
  // Signals prefer their dedicated range value, then the legacy signal setting, then the global value.
  return isSignalInd(tp.ind)
    ? (rangeOptsOf(o, tp)?.validLastN ?? o.signalValidLastN ?? o.validLastN ?? 0)
    : (rangeOptsOf(o, tp)?.validLastN ?? o.validLastN ?? 0);
}

/** Signal entry last-N is owned by the Signals range when set; legacy signalValidLastN remains its fallback. */
function signalEntryLastNOf(tp: Pick<ConfigTape, "ind" | "protect"> & Partial<Pick<ConfigTape, "kind">>, o: WalkForwardOptions): number {
  const own = rangeOptsOf(o, tp)?.lastN;
  if (own !== undefined) return own;
  return o.signalValidLastN !== undefined ? Math.min(o.lastN, o.signalValidLastN) : o.lastN;
}

function minTradesForTape(
  tp: Pick<ConfigTape, "kind">,
  o: Pick<WalkForwardOptions, "exitMinTrades">,
  fallback = 0,
): number {
  return Math.max(3, tp.kind === "exit" ? (o.exitMinTrades ?? fallback) : fallback);
}

export function minPfForTape(
  tp: Pick<ConfigTape, "kind" | "protect" | "ind">,
  o: Pick<WalkForwardOptions, "gates" | "exitMinPf">,
): number {
  return Math.max(
    minPfOf(o.gates, tp.kind === "exit" ? undefined : tp.protect.tag, tp.ind, protectStepPct(tp.protect), protectSlRatio(tp.protect)),
    isSignalInd(tp.ind) ? (o.gates.baseSetsMinPf ?? 0) : 0,
    tp.kind === "exit" ? (o.exitMinPf ?? 0) : 0,
  );
}

/** One configured floor for the exact processed Set in modeled and paper admission. */
export function processedMinPfForTape(tp: ConfigTape, o: WalkForwardOptions): number {
  const normal = tp.kind !== "exit" && isPlainKind(tp.kind) && effectiveStrategyToggles(tp, o).normal &&
    !(o.signalOwnBase && isSignalInd(tp.ind) && o.rangeOpts?.sig?.normal !== false)
    ? o.normalBaseMinPf ?? 0 : 0;
  return Math.max(o.lastNMinPf, minPfForTape(tp, o), normal);
}

function minGreenForTape(
  tp: Pick<ConfigTape, "kind">,
  o: Pick<WalkForwardOptions, "gates" | "exitMinGreenHourShare">,
): number {
  return Math.max(o.gates.minGreen ?? 0.5, tp.kind === "exit" ? (o.exitMinGreenHourShare ?? 0) : 0);
}

function maxDdrForTape(
  tp: Pick<ConfigTape, "kind">,
  o: Pick<WalkForwardOptions, "gates" | "exitMaxDdr">,
): number | undefined {
  if (tp.kind !== "exit" || !(o.exitMaxDdr && o.exitMaxDdr > 0)) return o.gates.maxDdr;
  return o.gates.maxDdr && o.gates.maxDdr > 0
    ? Math.min(o.gates.maxDdr, o.exitMaxDdr)
    : o.exitMaxDdr;
}

function validationLastNForTape(
  tp: Pick<ConfigTape, "kind" | "ind" | "protect">,
  o: Pick<WalkForwardOptions, "validLastN" | "signalValidLastN" | "exitMinTrades" | "rangeOpts">,
): number {
  return tp.kind === "exit" ? (o.exitMinTrades ?? validLastNOf(tp, o)) : validLastNOf(tp, o);
}

/** Requested counts for sample diagnostics; partial-window waivers never change these numbers. */
export function sampleWindowsForTape(tp: ConfigTape, o: WalkForwardOptions): Record<string, number> {
  if(o.gates.positionWindows) {
    const p=positionCounts(o.gates.positionWindows,isSignalInd(tp.ind)?"sig":tp.kind==="exit"?"exit":tp.protect.tag??"wide",tp.id);
    const blocks = o.gates.positionWindows.blocks;
    return {main:blocks?.main ? blockRequired(blocks.main) : p.main,
      real:blocks?.real ? blockRequired(blocks.real) : p.real,
      entry:blocks?.entry ? blockRequired(blocks.entry) : p.entry,
      range:o.rangeGate&&tapeRangeGateOn(o.rangeGate,tp)?o.rangeGate.lastN:0};
  }
  return {
    validation: validationLastNForTape(tp, o),
    entry: isSignalInd(tp.ind) ? signalEntryLastNOf(tp, o) : (rangeOptsOf(o, tp)?.lastN ?? o.lastN),
    range: o.rangeGate && tapeRangeGateOn(o.rangeGate, tp) ? o.rangeGate.lastN : 0,
  };
}

/** Count diagnostics share the actual config evaluator's history and minimum-sample policy. */
export function sampleHistoryForTape(tp: ConfigTape, o: WalkForwardOptions): { hours: number; minTrades: number } {
  return { hours: tapeHistoryHours(tp, o), minTrades: minTradesForTape(tp, o, o.gates.minTrades ?? 0) };
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
  // gp / gl in net's units (percent): the pooled PF of the validated sets needs the gross loss itself (0 = no loss)
  const base = {
    pf: w.pf,
    n: w.n,
    net: w.net,
    ...(w.gp !== undefined && w.gl !== undefined ? { gp: w.gp * 100, gl: w.gl * 100 } : {}),
  };
  const no = (fail: EvalGate): ConfigEval => ({ ok: false, fail, ...base });
  const minPf = minPfForTape(tp, o);
  if (!Number.isSafeInteger(w.n) || w.n < minTradesForTape(tp, o, o.gates.minTrades ?? 0))
    return no("closes");
  if (!(Number.isFinite(w.net) && w.net > 0)) return no("net");
  const prior = lossPriorOf(tp, o.gates);
  if (!(
    Number.isFinite(w.pf) &&
    w.pf >= minPf &&
    (prior <= 0 ||
      (w.gp !== undefined && w.gl !== undefined && qualifiedPf(w.gp, w.gl + prior, minPf)))
  ))
    return no("pf");
  if (o.preGate) {
    const pre = win(tp, lowerBound(tp.exitT, t - o.preH * H), b);
    if (
      pre.n >= 3 &&
      !(Number.isFinite(pre.pf) && pre.pf >= minPf && Number.isFinite(pre.net) && pre.net >= 0)
    )
      return no("pre");
  }
  const lcb = lcbFast(tp, a, b);
  if (!(lcb > 0)) return no("lcb");
  // best-set validation: last validLastN closes clear min PF and the drawdown-time gate; a range cell its range gate
  if (
    !lastNOk(
      tp,
      t,
      validationLastNForTape(tp, o),
      minPf,
      o.gates.maxDdtH,
      maxDdrForTape(tp, o) ?? 0,
      o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
      prior,
    )
  )
    return no("lastN");
  const g = o.rangeGate;
  if (
    g &&
    tapeRangeGateOn(g, tp) &&
    !lastNOk(
      tp,
      t,
      g.lastN,
      g.minPf,
      0,
      0,
      g.floor ?? o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
      prior,
    )
  )
    return no("rangeGate");
  if (!engineValidationLastNOk(tp, t, o)) return no("lastN");
  const dd = winDd(tp, a, b, t);
  if (dd.ddtH > Math.min(ddtMax, ddtLimitH(o, tp, t, tapeHistoryHours(tp, o)))) return no("ddt");
  if (ddrFails(dd.mdd * 100, w.net, maxDdrForTape(tp, o))) return no("ddr");
  const gh = greenShare(tp, a, b);
  // a variant that is red most hours is not what we run, even if a few large wins clear PF (gates.minGreen)
  if (gh < minGreenForTape(tp, o)) return no("green");
  if (
    !stableOk(
      tp,
      t,
      tapeHistoryHours(tp, o),
      // the range's own stableBlocks (wf.rangeOpts), else the global one
      rangeOptsOf(o, tp)?.stableBlocks ?? o.gates.stableBlocks ?? 0,
      minPf,
      o.gates.warmup !== false,
    )
  )
    return no("stable");
  return { ok: true, lcb, gh, ddt: dd.ddtH, ...base };
}

/**
 * What the seat selection reads of a tape that never changes within a run of the same options — whether it is in
 * scope (its bot and its Base-passed pair), whether it can take a seat, its seat key and family, its PF floor and loss
 * prior — computed once per tape list and options (selInfos), not once per tape on every hourly step.
 */
interface SelInfo {
  tp: WeakRef<ConfigTape>;
  inScope: boolean;
  canSeat: boolean;
  /** seatSet "validated": the config is a member of V (always true under "pool") */
  inV: boolean;
  base: boolean;
  pairKey: string;
  seat: string;
  fam: string;
  seatFam: string;
  minPf: number;
  prior: number;
  rangeGate: boolean;
  /** its range's validLastN / stableBlocks overrides (wf.rangeOpts); undefined = the global ones */
  ro: RangeOpts | undefined;
}
/**
 * Per tape list: the static infos and each tape's window cursors (the first close at or after the window start / the
 * step time). Inside a run the steps move forward, so a cursor only advances over the closes since the last step
 * instead of two binary searches per tape per step. A call that starts earlier than the last, or while another call
 * on the same list is between slices (`busy`), uses the binary searches and leaves the cursors alone.
 */
interface SelCache {
  sig: string;
  infos: Array<SelInfo | undefined>;
  ca: Int32Array;
  cb: Int32Array;
  lastFrom: number;
  lastT: number;
  busy: boolean;
}
const selCache = new WeakMap<readonly ConfigTape[], SelCache>();
const objIds = new WeakMap<object, number>();
let nextObjId = 1;
/** a stable number per object (a Set or options part compared by identity in a cache key) */
const objId = (x: object | null | undefined) => {
  if (!x) return 0;
  let i = objIds.get(x);
  if (!i) objIds.set(x, (i = nextObjId++));
  return i;
};
/** The options selInfos depends on, as one string (cheap: a few fields per step). */
function selSig(o: WalkForwardOptions): string {
  return [
    o.bots.join(","),
    o.signalLongH ?? SIGNAL_HISTORY_H,
    objId(o.basePassed),
    objId(o.exitBasePassed),
    objId(o.basePassedRanges),
    objId(o.basePassedTargets),
    objId(o.baseWideLadderPairs),
    o.wideEnabled === false ? 0 : 1,
    o.seatSet === "validated" ? objId(o.validated) : 0,
    objId(o.basePassedCells),
    objId(o.basePassedTrailingOnlyCells),
    JSON.stringify(o.toggles ?? null),
    o.signalOwnBase ? 1 : 0,
    o.signalCoordinationOnly ? 1 : 0,
    o.seatPer ?? "",
    o.familySeats ? 1 : 0,
    o.rangeSeats ? 1 : 0,
    o.gates.minPf,
    JSON.stringify(o.gates.rangeMinPf ?? null),
    JSON.stringify(o.gates.stepPf ?? null),
    o.exitMinTrades ?? "",
    o.exitMinPf ?? "",
    o.exitMinGreenHourShare ?? "",
    o.exitMaxDdr ?? "",
    o.gates.lossPrior ? 1 : 0,
    JSON.stringify(o.rangeGate?.ranges ?? null),
    o.rangeGate ? 1 : 0,
    JSON.stringify(o.rangeOpts ?? null),
  ].join("|");
}
/** A pair's passed cells (protectCellKey) and the ranges they cover. */
export interface PassedCells {
  tags: ReadonlySet<string>;
  keys: ReadonlySet<string>;
}
export function passedCellsOf(pairCells: Readonly<Record<string, readonly string[]>>): Record<string, PassedCells> {
  const out: Record<string, PassedCells> = {};
  for (const [pair, ks] of Object.entries(pairCells))
    out[pair] = { tags: new Set(ks.map((k) => k.slice(0, k.indexOf("|")))), keys: new Set(ks) };
  return out;
}
/** Whether a tape's cell is one its pair's Base passed (true without cells for the pair / its range: the pair level decides). */
export function cellAllowed(
  tp: Pick<ConfigTape, "bot" | "ind" | "protect"> & Partial<Pick<ConfigTape, "kind">>,
  o: Pick<WalkForwardOptions, "basePassedCells" | "basePassedTrailingOnlyCells">,
  pair = `${tp.bot}|${tp.ind}`,
): boolean {
  // Historic Exit has a separate Base proof; a same-pair ordinary cell must never decide its admission.
  if (tp.kind === "exit") return true;
  if (tp.protect.trailOnly && !isSignalInd(tp.ind) && o.basePassedTrailingOnlyCells)
    return o.basePassedTrailingOnlyCells[pair]?.keys.has(protectCellKey(tp.protect)) ?? false;
  const c = o.basePassedCells?.[pair];
  if (tp.protect.priceDistance) return c?.keys.has(protectCellKey(tp.protect)) ?? false;
  const tag = tp.protect.tag;
  if (!c) return !o.basePassedCells || !isLowRangeInd(tp.ind);
  if (!tag || !c.tags.has(tag)) return !isLowRangeInd(tp.ind);
  return c.keys.has(protectCellKey(tp.protect));
}

/** Whether a config may take a seat under seatSet: always under "pool", only a member of V under "validated". */
export function inValidated(id: string, o: Pick<WalkForwardOptions, "seatSet" | "validated">): boolean {
  return o.seatSet !== "validated" || !o.validated || o.validated.has(id);
}

/** seatSet "validated" seats nothing outside V: a probe / contrarian seat would. */
export function assertSeatSet(o: Pick<WalkForwardOptions, "seatSet" | "probe" | "invertSeats">): void {
  if (o.seatSet !== "validated") return;
  if (o.probe?.perRange || o.probe?.perCell) throw new Error('wf.seatSet "validated" refuses wf.probe (it seats configs outside V)');
  if (o.invertSeats) throw new Error('wf.seatSet "validated" refuses wf.invertSeats (a seat executes on its mirror, outside V)');
}

function selInfoOf(
  tp: ConfigTape,
  o: WalkForwardOptions,
  botOk: ReadonlySet<string> | null,
): SelInfo {
  const pairKey = baseComparisonKey(tp);
  const seat = seatKey(tp, o);
  const fam = familyOf(tp.kind, tp.protect.exitSet, tp.protect.exitSide);
  return {
    tp: new WeakRef(tp),
    inScope:
      !(tp.kind !== "exit" && botOk && !botOk.has(tp.bot)) && baseAllowsTape(tp, o) && cellAllowed(tp, o),
    inV: inValidated(tp.id, o),
    canSeat: !tp.heldOnly && tapeExecutable(tp, o) && inValidated(tp.id, o),
    base: fam === "base",
    pairKey,
    seat,
    fam,
    seatFam: seatFamily(seat, o.familySeats),
    minPf: minPfForTape(tp, o),
    prior: lossPriorOf(tp, o.gates),
    rangeGate: tp.kind !== "exit" && !!o.rangeGate && tapeRangeGateOn(o.rangeGate, tp),
    ro: rangeOptsOf(o, tp),
  };
}
function selInfos(tapes: readonly ConfigTape[], o: WalkForwardOptions): SelCache {
  const sig = selSig(o);
  const c = selCache.get(tapes);
  if (c && c.sig === sig && c.ca.length === tapes.length) return c;
  const x: SelCache = {
    sig,
    infos: new Array(tapes.length),
    ca: new Int32Array(tapes.length).fill(-1),
    cb: new Int32Array(tapes.length).fill(-1),
    lastFrom: -Infinity,
    lastT: -Infinity,
    busy: false,
  };
  selCache.set(tapes, x);
  return x;
}

/** The longest hold of a tape (exit − entry over its trades): no trade exiting at or after x + it entered before x. */
const maxHoldMemo = new WeakMap<ConfigTape, number>();
function maxHoldOf(tp: ConfigTape): number {
  let m = maxHoldMemo.get(tp);
  if (m === undefined) {
    m = 0;
    for (let i = 0; i < tp.n; i++)
      if (tp.exitT[i] - tp.entryT[i] > m) m = tp.exitT[i] - tp.entryT[i];
    maxHoldMemo.set(tp, m);
  }
  return m;
}

/** The scores a passing config carries out of configPassAt (one object, reused: the selection copies what it keeps). */
const passOut = { lcb: 0, gh: 0, ddt: 0 };
/**
 * configEvalAt's verdict without its report: the same gates, all of which must pass, with the O(1) ones (prefix sums:
 * closes, net, PF, pre-window, last N, range gate, lower bound) before the O(window) scans (drawdown, green hours,
 * stability) — so a config that fails cheaply never pays for a scan. Same pass set and the same lcb / gh / ddt as
 * configEvalAt (only the first failing gate's name differs, which the selection does not read); no object per call.
 */
function configPassAt(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  a: number,
  b: number,
  n: number,
  net: number,
  pf: number,
  gp: number,
  gl: number,
  ddtMax: number,
  info: SelInfo,
): boolean {
  const minPf = info.minPf;
  const prior = info.prior;
  if (!Number.isSafeInteger(n) || n < minTradesForTape(tp, o, o.gates.minTrades ?? 0)) return false;
  if (!(Number.isFinite(net) && net > 0)) return false;
  if (!(Number.isFinite(pf) && pf >= minPf && (prior <= 0 || qualifiedPf(gp, gl + prior, minPf))))
    return false;
  if (o.preGate) {
    const pa = lowerBound(tp.exitT, t - o.preH * H);
    const pn = b - pa;
    if (pn >= 3) {
      const { gp: pgp, gl: pgl, rescanned } = returnWindow(tp, pa, b);
      const pnet = (rescanned ? pgp - pgl : tp.rs[b] - tp.rs[pa]) * 100;
      if (!qualifiedPf(pgp, pgl, minPf) || !(Number.isFinite(pnet) && pnet >= 0)) return false;
    }
  }
  const lcb = lcbFast(tp, a, b);
  if (!(lcb > 0)) return false;
  const warm = o.gates.warmup !== false;
  if (
    !lastNOk(
      tp,
      t,
      validationLastNForTape(tp, o),
      minPf,
      o.gates.maxDdtH,
      maxDdrForTape(tp, o) ?? 0,
      o.gates.lastNFloor ?? 0,
      warm,
      prior,
    )
  )
    return false;
  const g = o.rangeGate;
  if (
    g &&
    info.rangeGate &&
    !lastNOk(tp, t, g.lastN, g.minPf, 0, 0, g.floor ?? o.gates.lastNFloor ?? 0, warm, prior)
  )
    return false;
  if (!engineValidationLastNOk(tp, t, o)) return false;
  const dd = winDd(tp, a, b, t);
  if (dd.ddtH > Math.min(ddtMax, ddtLimitH(o, tp, t, tapeHistoryHours(tp, o)))) return false;
  if (ddrFails(dd.mdd * 100, net, maxDdrForTape(tp, o))) return false;
  const gh = greenShare(tp, a, b);
  if (gh < minGreenForTape(tp, o)) return false;
  if (!stableOk(tp, t, tapeHistoryHours(tp, o), info.ro?.stableBlocks ?? o.gates.stableBlocks ?? 0, minPf, warm))
    return false;
  passOut.lcb = lcb;
  passOut.gh = gh;
  passOut.ddt = dd.ddtH;
  return true;
}

/**
 * The validated set V: the ids of the configs that take a seat-eligible place and pass the evaluation (configEval's gates)
 * at time t. Ongoing runs refresh this cohort at each decision clock; explicit snapshots stay frozen. In slices (yields −1 every ~8 ms).
 */
export function* validatedSetGen(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
  record?: { summary: ValidationSummary; checks?: ValidationCheck[] },
): Generator<number, Set<string>> {
  const out = new Set<string>();
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  const free: WalkForwardOptions = { ...o, seatSet: "pool", validated: undefined };
  let seen = 0, advanced = false;
  let t0 = performance.now();
  for (const tp of tapes) {
    if (++seen % 8 === 0 && performance.now() - t0 > 8) {
      yield -1;
      t0 = performance.now();
    }
    const info = selInfoOf(tp, free, botOk);
    if (!info.inScope || !info.canSeat) continue;
    if (free.evalMemo && !advanced) { yield* free.evalMemo.advanceGen(t); advanced = true; }
    // The initial validated pool must use the same own-direction / Signal
    // context proof and independent history as hourly selection and entry.
    const ev = configEvalSummary(tp, t, free);
    if (record) {
      record.checks?.push([tp.id, ev.ok ? 1 : 0, ev.n, ev.pf, (ev.gp ?? 0) / 100, (ev.gl ?? 0) / 100]);
      summarizeValidation(record.summary, ev, ev.n, (ev.gp ?? 0) / 100, (ev.gl ?? 0) / 100);
    }
    if (ev.ok) out.add(tp.id);
  }
  return out;
}

/** The tapes a validated run selects from: V's members, and (family seats judged against their base) the base tapes of V's pairs. */
export function validatedTapes(
  tapes: readonly ConfigTape[],
  v: ReadonlySet<string>,
  o: Pick<WalkForwardOptions, "familySeats" | "seatPer">,
): ConfigTape[] {
  const needBase = !!o.familySeats && o.seatPer !== "config";
  const pairs = new Set<string>();
  if (needBase) for (const tp of tapes) if (v.has(tp.id)) pairs.add(baseComparisonKey(tp));
  return tapes.filter((tp) => v.has(tp.id) || (needBase && familyOf(tp.kind) === "base" && pairs.has(baseComparisonKey(tp))));
}

/** selectFixed in slices: yields −1 every ~8 ms (with every config its own seat, ~100k tapes per step). */
export function* selectFixedGen(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): Generator<
  number,
  {
    picks: Selection[];
    eligible: number;
    checks?: ValidationCheck[];
    validationSummary?: ValidationSummary;
  }
> {
  if(o.gates.positionWindows) return yield* selectPositionsGen(tapes,t,o);
  const from = t - Math.max(o.longH, o.preH) * H;
  let seen = 0;
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  const best = new Map<string, Selection>();
  const checks: ValidationCheck[] | null = o.recordValidation === true ? [] : null;
  const validationSummary: ValidationSummary | null =
    o.recordValidation === "summary"
      ? { evaluated: 0, passed: 0, closes: 0, gp: 0, gl: 0, failures: {}, setPf: emptyValidatedSetPf() }
      : null;
  const basePf = new Map<string, number>();
  // the base PFs are read by beatsBase only, which judges nothing without family seats or with every config its seat
  const needBase = !!o.familySeats && o.seatPer !== "config";
  // ladderNeedsBase: the family and pair of each seat, and the pairs whose base (Normal / Trailing) holds a seat
  const seatFam = new Map<string, { fam: string; pairKey: string }>();
  const famOfSeat = new Map<string, string>();
  const baseSeated = new Set<string>();
  const cache = selInfos(tapes, o);
  const infos = cache.infos;
  // forward from the last completed call on this list: the cursors advance (else binary searches, cursors untouched)
  const fwd = !cache.busy && from >= cache.lastFrom && t >= cache.lastT;
  if (fwd) cache.busy = true;
  const { ca, cb } = cache;
  // yields on time, not on a count: 2,000 tapes took up to ~500 ms (x02, 7 Oct profile)
  let t0 = performance.now();
  for (let i = 0; i < tapes.length; i++) {
    const original = tapes[i];
    const tp = isSignalInd(original.ind) ? original : qualifiedDirectionTape(original, t, o);
    if (!tp) {
      const info = selInfoOf(original, o, botOk);
      if (info.inScope && info.canSeat) checks?.push([original.id, 0, 0, 0, 0, 0]);
      if (info.inScope && info.canSeat && validationSummary)
        summarizeValidation(validationSummary, configEval(original, t, o), 0, 0, 0);
      infos[i] = undefined;
      ca[i] = -1;
      cb[i] = -1;
      if (++seen % 8 === 0 && performance.now() - t0 > 8) {
        yield -1;
        t0 = performance.now();
      }
      continue;
    }
    const tapeFrom = t - tapeHistoryHours(tp, o) * H;
    const tapeDdtMax = Math.max(
      o.gates.minDdtH ?? 0,
      (o.gates.maxDdtH * tapeHistoryHours(tp, o)) / 72,
    );
    if (++seen % 8 === 0 && performance.now() - t0 > 8) {
      yield -1;
      t0 = performance.now();
    }
    let info = infos[i];
    // The validated Set may be updated in place between selections, so its object identity alone is not a version.
    const canSeat = !tp.heldOnly && tapeExecutable(tp, o) && inValidated(tp.id, o);
    if (!info || info.tp.deref() !== tp || info.canSeat !== canSeat) {
      info = infos[i] = selInfoOf(tp, o, botOk);
      ca[i] = -1;
      cb[i] = -1;
    }
    if (!info.inScope) continue;
    // neither a seat nor a base PF to note: nothing to read
    if (!info.canSeat && !(needBase && info.base)) continue;
    if (isSignalInd(tp.ind)) {
      const ev = configEval(tp, t, o);
      if (checks) checks.push([tp.id, ev.ok ? 1 : 0, ev.n, ev.pf, (ev.gp ?? 0) / 100, (ev.gl ?? 0) / 100]);
      summarizeValidation(validationSummary, ev, ev.n, (ev.gp ?? 0) / 100, (ev.gl ?? 0) / 100);
      if (needBase && info.base && ev.ok) basePf.set(info.pairKey, Math.max(basePf.get(info.pairKey) ?? -Infinity, ev.pf));
      if (ev.ok && info.canSeat) {
        const score = ev.lcb * (0.5 + ev.gh), pair = info.seat;
        if (info.fam === "base" || info.fam === "trailing") baseSeated.add(info.pairKey);
        const cur = best.get(pair);
        if (!cur || score > cur.score) {
          best.set(pair, { id: tp.id, score, window: { n: ev.n, net: ev.net, pf: ev.pf, gp: (ev.gp ?? 0) / 100, gl: (ev.gl ?? 0) / 100, ddt: ev.ddt } });
          seatFam.set(pair, { fam: info.fam, pairKey: info.pairKey }); famOfSeat.set(pair, info.seatFam);
        }
      }
      continue;
    }
    let a: number;
    let b: number;
    if (fwd && ca[i] >= 0) {
      const ex = tp.exitT;
      const nn = tp.n;
      a = ca[i];
      while (a < nn && ex[a] < tapeFrom) a++;
      b = cb[i] < a ? a : cb[i];
      while (b < nn && ex[b] < t) b++;
    } else {
      a = lowerBound(tp.exitT, tapeFrom);
      b = lowerBound(tp.exitT, t);
    }
    if (fwd) {
      ca[i] = a;
      cb[i] = b;
    }
    const { gp, gl, rescanned } = returnWindow(tp, a, b);
    const n = b - a;
    const pf = profitFactor(gp, gl);
    // the base is evaluated whatever the toggles: DCA / Axis still have to beat it with Normal off
    if (needBase && info.base && n >= 3 && Number.isFinite(pf))
      basePf.set(info.pairKey, Math.max(basePf.get(info.pairKey) ?? -Infinity, pf));
    // a held-only tape serves its open position, it takes no new seat
    if (!info.canSeat) continue;
    const net = (rescanned ? gp - gl : tp.rs[b] - tp.rs[a]) * 100;
    let lcb: number;
    let gh: number;
    let ddt: number;
    if (!isSignalInd(tp.ind) || checks || validationSummary) {
      // the validation record keeps configEvalAt's own verdict
      const ev = !isSignalInd(tp.ind) ? configEval(tp, t, o) : configEvalAt(tp, t, o, a, b, { n, net, pf, gp, gl }, tapeDdtMax);
      checks?.push([tp.id, ev.ok ? 1 : 0, n, pf, gp, gl]);
      summarizeValidation(validationSummary, ev, n, gp, gl);
      if (!ev.ok) continue;
      ({ lcb, gh, ddt } = ev);
    } else {
      if (!configPassAt(tp, t, o, a, b, n, net, pf, gp, gl, tapeDdtMax, info)) continue;
      ({ lcb, gh, ddt } = passOut);
    }
    const pair = info.seat;
    const score =
      o.rankBy === "green" ? gh + Math.min(1, Math.max(0, lcb)) * 1e-6 : lcb * (0.5 + gh);
    if (info.fam === "base" || info.fam === "trailing") baseSeated.add(info.pairKey);
    const cur = best.get(pair);
    if (!cur || score > cur.score) {
      best.set(pair, {
        id: tp.id,
        score,
        window: { n, net, pf, gp, gl, ddt } as Selection["window"],
      });
      seatFam.set(pair, { fam: info.fam, pairKey: info.pairKey });
      famOfSeat.set(pair, info.seatFam);
    }
  }
  if (fwd) {
    cache.lastFrom = from;
    cache.lastT = t;
    cache.busy = false;
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
      const f = famOfSeat.get(pair) ?? seatFamily(pair, o.familySeats);
      const n = perFam.get(f) ?? 0;
      perFam.set(f, n + 1);
      return n < (f === "micro" ? microSeats(o) : seatsOf(o));
    })
    .map(([, v]) => v);
  return {
    picks,
    eligible: best.size,
    ...(checks ? { checks } : {}),
    ...(validationSummary ? { validationSummary } : {}),
  };
}

/** The engine tapes of the ranges that select in one mode (modeGroups). */
export interface ModeGroup {
  mode: WalkForwardOptions["mode"];
  tapes: readonly ConfigTape[];
}
const modeGroupsMemo = new WeakMap<readonly ConfigTape[], { n: number; sig: string; groups: ModeGroup[] }>();
/**
 * Per-range selection modes (wf.rangeOpts[tag].mode): the engine tapes grouped by their range's mode (fixed, durable,
 * hourly, in that order), one array per group and tape list (memoized, like engineTapesOf: selectFixedGen's per-tape
 * infos and window cursors carry from step to step and from the simulation to the paper step). null when no range's
 * mode differs from the global one. Seats no longer span ranges, including under legacy pair settings.
 */
export function modeGroups(
  tapes: readonly ConfigTape[],
  o: Pick<WalkForwardOptions, "rangeOpts" | "mode" | "seatPer" | "rangeSeats">,
): ModeGroup[] | null {
  const ro = o.rangeOpts;
  if (!ro) return null;
  let sig = "";
  for (const k of RANGE_OPT_TAGS) {
    const m = ro[k]?.mode;
    if (m && m !== o.mode) sig += `${k}:${m},`;
  }
  if (!sig) return null;
  sig = `${o.mode}|${sig}`;
  const c = modeGroupsMemo.get(tapes);
  if (c && c.n === tapes.length && c.sig === sig) return c.groups;
  const by = new Map<string, ConfigTape[]>();
  for (const tp of tapes) {
    const m = rangeOptsOf(o, tp)?.mode ?? o.mode;
    let xs = by.get(m);
    if (!xs) by.set(m, (xs = []));
    xs.push(tp);
  }
  const groups: ModeGroup[] = [];
  for (const mode of ["fixed", "durable", "hourly"] as const) {
    const xs = by.get(mode);
    if (xs) groups.push({ mode, tapes: xs });
  }
  modeGroupsMemo.set(tapes, { n: tapes.length, sig, groups });
  return groups;
}

/**
 * The selection over mode groups: each group selects on its own tapes with its own mode, and the picks are
 * concatenated. Range seat identities remain separate, so a group's seats are its own; the seat caps (portfolio)
 * apply per group. The fixed group's validation record
 * (recordValidation) is kept.
 */
export function* selectGroupsGen(
  groups: readonly ModeGroup[],
  t: number,
  o: WalkForwardOptions,
  held: ReadonlySet<string>,
): Generator<number, { picks: Selection[]; eligible: number; checks?: ValidationCheck[]; validationSummary?: ValidationSummary }> {
  const picks: Selection[] = [];
  let eligible = 0;
  let checks: ValidationCheck[] | undefined;
  let validationSummary: ValidationSummary | undefined;
  for (const g of groups) {
    const r: { picks: Selection[]; eligible: number; checks?: ValidationCheck[]; validationSummary?: ValidationSummary } =
      g.mode === "fixed"
        ? yield* selectFixedGen(g.tapes, t, o)
        : g.mode === "durable"
          ? selectDurable(g.tapes, t, o, held)
          : selectAt(g.tapes, t, o);
    for (const p of r.picks) picks.push(p);
    eligible += r.eligible;
    if (r.checks) checks = [...(checks ?? []), ...r.checks];
    if (r.validationSummary) {
      validationSummary ??= { evaluated: 0, passed: 0, closes: 0, gp: 0, gl: 0, failures: {}, setPf: emptyValidatedSetPf() };
      if (r.validationSummary.setPf) mergeValidatedSetPf(validationSummary.setPf!, r.validationSummary.setPf);
      else { validationSummary.setPf!.sets += r.validationSummary.passed; validationSummary.setPf!.unavailableSets += r.validationSummary.passed; }
      for (const key of ["evaluated", "passed", "closes", "gp", "gl"] as const) validationSummary[key] += r.validationSummary[key];
      for (const key of Object.keys(r.validationSummary.failures) as Array<keyof ValidationSummary["failures"]>) validationSummary.failures[key] = (validationSummary.failures[key] ?? 0) + r.validationSummary.failures[key]!;
    }
  }
  return { picks, eligible, ...(checks ? { checks } : {}), ...(validationSummary ? { validationSummary } : {}) };
}

/**
 * Per tape and symbol: the indexes of its trades on that symbol (all its series, ascending = exit order), built on
 * first use — the symbol gate walks only that symbol's closes, not every symbol's in the look-back (at 120 symbols
 * the scan read ~120× the closes it counted, on every engine candidate). null: the tape has no series of the symbol.
 */
const symIdxMemo = new DerivedCache<ConfigTape, {
  source: CountSignalSource; n: number; values: Map<string, Int32Array | null>;
}>(512, derivedIndexBytes);
function symTradeIdx(tp: ConfigTape, sym: string): Int32Array | null {
  const cached = symIdxMemo.get(tp);
  const m = cached && cached.n === tp.n && sameCountSignalSource(tp, cached.source) ? cached.values : new Map<string, Int32Array | null>();
  if (m !== cached?.values) {
    const source = countSignalSource(tp);
    if (source) symIdxMemo.set(tp, { source, n: tp.n, values: m });
    else symIdxMemo.delete(tp);
  }
  let x = m.get(sym);
  if (x !== undefined) return x;
  // syms is one slot per series (symbol x timeframe); the same name sits at several indexes
  const mask = new Uint8Array(tp.syms.length);
  let any = false;
  for (let s = 0; s < tp.syms.length; s++)
    if (tp.syms[s] === sym) {
      mask[s] = 1;
      any = true;
    }
  if (!any) x = null;
  else {
    let k = 0;
    for (let i = 0; i < tp.n; i++) if (mask[tp.symI[i]]) k++;
    x = new Int32Array(k);
    k = 0;
    for (let i = 0; i < tp.n; i++) if (mask[tp.symI[i]]) x[k++] = i;
  }
  m.set(sym, x);
  const record = symIdxMemo.get(tp);
  if (record?.values === m) {
    let bytes = 0;
    for (const indices of m.values()) bytes += indices?.byteLength ?? 0;
    symIdxMemo.set(tp, record, bytes);
  }
  return x;
}

/** Closed results of one symbol (side 0 = both directions) with exit in [from, entryT]. */
export function symStats(tp: ConfigTape, sym: string, side: number, from: number, entryT: number) {
  const idx = symTradeIdx(tp, sym);
  if (!idx) return { n: 0, net: 0, pf: 0 };
  const b = lowerBound(tp.exitT, entryT + 1);
  // the symbol's trades before b: the first index position at or past b (idx ascending)
  let lo = 0;
  let hi = idx.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (idx[mid] < b) lo = mid + 1;
    else hi = mid;
  }
  let n = 0;
  let gp = 0;
  let gl = 0;
  let net = 0;
  // newest first, as the scan over every close did (the same additions in the same order)
  for (let j = lo - 1; j >= 0; j--) {
    const i = idx[j];
    if (tp.exitT[i] < from) break;
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
      if (!isPlainKind(tp.kind)) continue;
      if ((laneOf(tp.ind).tf ?? REF_TF) !== REF_TF) continue;
      const key = `${tp.kind}|${tp.protect.tp}|${tp.protect.sl}|${tp.protect.trail}|${tp.protect.trailStep ?? 1}`;
      const a = lowerBound(tp.exitT, from);
      const b = lowerBound(tp.exitT, t);
      const w = win(tp, a, b);
      let xs = cells.get(key);
      if (!xs) cells.set(key, (xs = []));
      xs.push({
        sel: { id: tp.id, score: w.net, window: { ...w, ddt: 0 } },
        closed: b - a,
        all: b,
      });
    }
    const out: Selection[] = [];
    for (const xs of cells.values())
      out.push(
        ...xs
          .sort(
            (x, y) =>
              Number(y.closed > 0) - Number(x.closed > 0) ||
              y.sel.score - x.sel.score ||
              y.all - x.all,
          )
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
  return extra.length
    ? { ...r, picks: [...r.picks, ...extra], eligible: r.eligible + extra.length }
    : r;
}

/** Validation and range Last-N belong to the exact config, independently of its symbol-entry gate. */
function validOk(tp: ConfigTape, t: number, o: WalkForwardOptions): boolean {
  const prior = lossPriorOf(tp, o.gates);
  const minPf = minPfForTape(tp, o);
  if (
    !lastNOk(
      tp,
      t,
      validationLastNForTape(tp, o),
      minPf,
      o.gates.maxDdtH,
      maxDdrForTape(tp, o) ?? 0,
      o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
      prior,
    )
  )
    return false;
  const g = o.rangeGate;
  return (
    !g ||
    !tapeRangeGateOn(g, tp) ||
    lastNOk(
      tp,
      t,
      g.lastN,
      g.minPf,
      0,
      0,
      g.floor ?? o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
      prior,
    )
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
  const { gp, gl } = returnWindow(tp, b - n, b);
  if (!qualifiedPf(gp, gl + prior, minPf)) return false;
  // the same closes have to come back inside the drawdown-time gate and keep their drawdown ratio — not judged on a
  // sample shorter than the gate asks for (the drawdown of 8 of 50 closes is not that config's drawdown)
  if (!short && (maxDdtH > 0 || maxDdr !== 0)) {
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
  if (!qualifiedPf(gp, gl + prior, minPf) || !Number.isFinite(net)) return false;
  if (!short && (maxDdtH > 0 || maxDdr !== 0)) {
    idx.reverse();
    const dd = winDdIdx(tp, idx, entryT);
    if (maxDdtH > 0 && dd.ddtH > maxDdtH) return false;
    if (ddrFails(dd.mdd, net, maxDdr)) return false;
  }
  return true;
}

/** A config's validation evidence cannot cross directions. The separate execution Last-N may be off,
 * but that never disables validLastN or the range's Last-N. Symbols still use their configured symbol gate.
 * side=0 is a container query: it may seat if either independently validated direction can trade.
 */
export function engineValidationLastNOk(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  side = 0,
): boolean {
  if(o.gates.positionWindows) return positionAggregate(tp,t,o,side===0?undefined:side).ok;
  if (isSignalInd(tp.ind)) return true; // Signals retain their stricter exact-symbol/direction proof.
  const prior = lossPriorOf(tp, o.gates);
  const range = o.rangeGate && tapeRangeGateOn(o.rangeGate, tp) ? o.rangeGate : null;
  const valid = (direction: number) =>
    lastNSideOk(
      tp,
      direction,
      t,
      validationLastNForTape(tp, o),
      minPfForTape(tp, o),
      o.gates.maxDdtH,
      maxDdrForTape(tp, o) ?? 0,
      o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
      prior,
    ) &&
    (!range ||
      lastNSideOk(
        tp,
        direction,
        t,
        range.lastN,
        range.minPf,
        0,
        0,
        range.floor ?? o.gates.lastNFloor ?? 0,
        o.gates.warmup !== false,
        prior,
      ));
  return side === 1 || side === -1 ? valid(side) : side === 0 && (valid(1) || valid(-1));
}

/** Independent config × direction proof. Symbols remain subject to their separate configured gate. */
const directionViews = new WeakSet<ConfigTape>();
const directionIndices = new DerivedCache<ConfigTape, Map<number, Uint32Array>>(512, derivedIndexBytes);
const directionTapes = new DerivedCache<
  ConfigTape,
  Map<number, { start: number; end: number; tape: ConfigTape }>
>(512, derivedIndexBytes);

function directionIndexOf(tp: ConfigTape, side: number): Uint32Array {
  let bySide = directionIndices.get(tp);
  if (!bySide) bySide = new Map();
  let idx = bySide.get(side);
  if (!idx) {
    const rows: number[] = [];
    for (let i = 0; i < tp.n; i++) if (tp.side[i] === side) rows.push(i);
    bySide.set(side, (idx = Uint32Array.from(rows)));
    let bytes = 0;
    for (const indices of bySide.values()) bytes += indices.byteLength;
    directionIndices.set(tp, bySide, bytes);
  }
  return idx;
}

/** Compact immutable evaluation view; keep the source's chronological order and return precision. */
function indexedEvaluationTape(tp: ConfigTape, idx: Uint32Array, start: number, end: number): ConfigTape {
  const n = end - start;
  const own: ConfigTape = {
    ...tp,
    ...tapeViews(new ArrayBuffer(tapeBytes(n)), 0, n),
    n,
    open: [],
    pending: [],
  };
  for (let i = 0; i < n; i++) {
    const j = idx[start + i];
    own.exitT[i] = tp.exitT[j];
    own.entryT[i] = tp.entryT[j];
    own.r[i] = tp.r[j];
    own.entry[i] = tp.entry[j];
    own.exit[i] = tp.exit[j];
    own.symI[i] = tp.symI[j];
    own.side[i] = tp.side[j];
    own.reason[i] = tp.reason[j];
    own.bars[i] = tp.bars[j];
    own.vol[i] = tp.vol[j];
    own.level[i] = tp.level[j];
    const r = own.r[i];
    own.gp[i + 1] = own.gp[i] + Math.max(0, r);
    own.gl[i + 1] = own.gl[i] + Math.max(0, -r);
    own.rs[i + 1] = own.rs[i] + r;
    own.r2[i + 1] = own.r2[i] + r * r;
  }
  return own;
}

function directionTape(tp: ConfigTape, t: number, o: WalkForwardOptions, side: number): ConfigTape {
  const idx = directionIndexOf(tp, side);
  const bound = (time: number) => {
    let lo = 0,
      hi = idx!.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (tp.exitT[idx![mid]] < time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const end = bound(t + 1),
    from = bound(t - tapeHistoryHours(tp, o) * H);
  const range = o.rangeGate && tapeRangeGateOn(o.rangeGate, tp) ? o.rangeGate : null;
  const required = Math.max(validationLastNForTape(tp, o), range?.lastN ?? 0, o.lastN);
  const start = Math.min(from, Math.max(0, end - required));
  let cached = directionTapes.get(tp);
  if (!cached) cached = new Map();
  const old = cached.get(side);
  if (old && old.end === end && old.start <= start) {
    old.tape.heldOnly = tp.heldOnly;
    old.tape.carried = tp.carried;
    old.tape.fromT = tp.fromT;
    return old.tape;
  }
  const own = indexedEvaluationTape(tp, idx, start, end);
  directionViews.add(own);
  cached.set(side, { start, end, tape: own });
  let bytes = 0;
  for (const view of cached.values()) bytes += view.tape.exitT.buffer.byteLength;
  directionTapes.set(tp, cached, bytes);
  return own;
}

export function configDirectionEval(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  side: number,
): ConfigEval {
  if(o.gates.positionWindows) return positionAggregate(tp,t,o,side);
  if (side !== 1 && side !== -1) return { ok: false, fail: "context", n: 0, pf: 0, net: 0 };
  // Reject definitely failing window samples before allocating/copying a compact view. Borderline arithmetic
  // falls through to the canonical evaluator, so this is a compute optimization, not a changed PF threshold.
  const idx = directionIndexOf(tp, side);
  const before = lowerBound(tp.exitT, t),
    from = lowerBound(tp.exitT, t - tapeHistoryHours(tp, o) * H);
  const a = lowerBound(idx, from),
    b = lowerBound(idx, before);
  let gp = 0,
    gl = 0;
  for (let j = a; j < b; j++) {
    const r = tp.r[idx[j]];
    gp += Math.max(0, r);
    gl += Math.max(0, -r);
  }
  const n = b - a,
    net = (gp - gl) * 100,
    pf = profitFactor(gp, gl);
  const stats = { n, net, pf, gp: gp * 100, gl: gl * 100 };
  if (n < minTradesForTape(tp, o, o.gates.minTrades)) {
    directionTapes.get(tp)?.delete(side);
    return { ok: false, fail: "closes", ...stats };
  }
  const tolerance = 1e-10 * Math.max(1, gp + gl);
  if (gp - gl < -tolerance) {
    directionTapes.get(tp)?.delete(side);
    return { ok: false, fail: "net", ...stats };
  }
  if (gp + tolerance < minPfForTape(tp, o) * (gl + lossPriorOf(tp, o.gates))) {
    directionTapes.get(tp)?.delete(side);
    return { ok: false, fail: "pf", ...stats };
  }
  return configEvalRaw(directionTape(tp, t, o, side), t, o);
}

function qualifiedDirectionTape(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
): ConfigTape | null {
  if (directionViews.has(tp)) return configEvalRaw(tp, t, o).ok ? tp : null;
  const long = configDirectionEval(tp, t, o, 1).ok,
    short = configDirectionEval(tp, t, o, -1).ok;
  return long && short
    ? tp
    : long
      ? directionTape(tp, t, o, 1)
      : short
        ? directionTape(tp, t, o, -1)
        : null;
}

/** Only queried config contexts allocate an index; original tape returns/times are never copied.
 * The bound covers a whole book of lane-scoped tapes (Micro's "both" scope reads every Micro tape at each selection):
 * at 512 a book of a few thousand Micro tapes rebuilt every index on every call. An index is 4 bytes per close, half
 * of the tape's own return column, so the bound adds at most about half of the indexed tapes' resident returns. */
const signalContextIndices = new DerivedCache<ConfigTape, {
  source: CountSignalSource; n: number; contexts: Map<number, Uint32Array>;
}>(16_384);
const completeSignalContexts = new WeakSet<Map<number, Uint32Array>>();
function currentSignalContexts(tp: ConfigTape): Map<number, Uint32Array> {
  const cached = signalContextIndices.get(tp);
  if (cached && cached.n === tp.n && sameCountSignalSource(tp, cached.source)) return cached.contexts;
  const contexts = new Map<number, Uint32Array>(), source = countSignalSource(tp);
  // Unknown getters can replace their columns without a generation notification; remain uncached.
  if (source) signalContextIndices.set(tp, { source, n: tp.n, contexts });
  else signalContextIndices.delete(tp);
  return contexts;
}
function accountSignalContexts(tp: ConfigTape, contexts: Map<number, Uint32Array>): void {
  const record = signalContextIndices.get(tp);
  if (record?.contexts !== contexts) return;
  let bytes = 0;
  for (const indices of contexts.values()) bytes += indices.byteLength;
  signalContextIndices.set(tp, record, bytes);
}
/** A caller which needs every context indexes the immutable columns together.
 * Keep the same bounded cache and chronological indices; single-context native
 * queries continue to build only the context they request. */
function prepareSignalContexts(tp: ConfigTape): Map<number, Uint32Array> {
  const contexts = currentSignalContexts(tp);
  if (completeSignalContexts.has(contexts)) return contexts;
  const canonical = tp.syms.map((sym) => tp.syms.indexOf(sym));
  const counts = new Uint32Array(tp.syms.length * 2);
  const symI = tp.symI, side = tp.side;
  for (let i = 0; i < tp.n; i++) counts[canonical[symI[i]] * 2 + (side[i] > 0 ? 1 : 0)]++;
  for (const slot of new Set(canonical)) {
    contexts.set(slot * 2, new Uint32Array(counts[slot * 2]));
    contexts.set(slot * 2 + 1, new Uint32Array(counts[slot * 2 + 1]));
  }
  const offsets = new Uint32Array(counts.length);
  for (let i = 0; i < tp.n; i++) {
    const slot = canonical[symI[i]] * 2 + (side[i] > 0 ? 1 : 0);
    contexts.get(slot)![offsets[slot]++] = i;
  }
  completeSignalContexts.add(contexts);
  accountSignalContexts(tp, contexts);
  return contexts;
}
function signalContextOf(tp: ConfigTape, sym: string, side: number): Uint32Array | null {
  if (side !== 1 && side !== -1) return null;
  const si = tp.syms.indexOf(sym);
  if (si < 0) return null;
  const contexts = currentSignalContexts(tp);
  const slot = si * 2 + (side > 0 ? 1 : 0);
  let indices = contexts.get(slot);
  if (!indices) {
    const own: number[] = [];
    // A multi-timeframe tape can contain several symbol slots with the same name. makeTape records the last
    // slot, while indexOf returns the first; compare every matching slot through the shared symbol index.
    const symbols = tp.syms, slots = tp.symI, sides = tp.side;
    for (let i = 0; i < tp.n; i++) if (symbols[slots[i]] === sym && sides[i] === side) own.push(i);
    contexts.set(slot, (indices = Uint32Array.from(own)));
    accountSignalContexts(tp, contexts);
  }
  return indices;
}

/** The recent closes of one exact config on the entry's own symbol and direction. */
function signalLastNOk(
  tp: ConfigTape,
  sym: string,
  side: number,
  entryT: number,
  n: number,
  minPf: number,
  maxDdtH = 0,
  maxDdr = 0,
  floor = 0,
  warmup = true,
  prior = 0,
  preparedIndices?: Uint32Array,
): boolean {
  if (n <= 0) return true;
  const own = preparedIndices ?? signalContextOf(tp, sym, side);
  if (!own) return false;
  let lo = 0;
  let hi = own.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (tp.exitT[own[mid]] <= entryT) lo = mid + 1;
    else hi = mid;
  }
  const idx = Array.from(own.subarray(Math.max(0, lo - n), lo));
  const short = idx.length < n;
  if (short && (!(floor > 0) || idx.length < floor)) return false;
  let gp = 0;
  let gl = 0;
  let net = 0;
  for (const i of idx) {
    const r = tp.r[i];
    net += r;
    if (r > 0) gp += r;
    else gl -= r;
  }
  if (!qualifiedPf(gp, gl + prior, minPf) || !Number.isFinite(net)) return false;
  if ((!short || !warmup) && (maxDdtH > 0 || maxDdr !== 0)) {
    const dd = winDdIdx(tp, idx, entryT);
    if (maxDdtH > 0 && dd.ddtH > maxDdtH) return false;
    if (ddrFails(dd.mdd, net, maxDdr)) return false;
  }
  return true;
}

/** Recheck the exact Signal context at native admission as well as modeled entry. */
export function signalValidationOk(
  tp: ConfigTape, entryT: number, o: WalkForwardOptions, sym: string, side: number,
): boolean {
  if(o.gates.positionWindows) return positionConfigEval(tp,entryT,o,sym,side).ok;
  const check = (n: number, minPf: number) => signalLastNOk(
    tp, sym, side, entryT, n, minPf, o.gates.maxDdtH, o.gates.maxDdr ?? 0,
    o.gates.lastNFloor ?? 0, o.gates.warmup !== false, lossPriorOf(tp, o.gates),
  );
  const n = validLastNOf(tp, o);
  const floor = minPfForTape(tp, o);
  return signalConfigEval(tp, entryT, o, sym, side).ok && check(n, floor) && check(signalEntryLastNOf(tp, o), Math.max(o.lastNMinPf, floor));
}

/** The configured symbol gate is separate from config validation/range Last-N. Reuse the identical
 * causal rule at order admission and native promotion; Base provenance never changes its sample scope.
 */
export function configContextEval(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  sym: string,
  side: number,
): ConfigEval {
  if(o.gates.positionWindows) return positionConfigEval(tp,t,o,sym,side);
  const bySide = o.symGate === "vetoSide" || o.symGate === "provenSide";
  const lookH = o.symH && o.symH > 0 ? o.symH : Math.max(o.longH, o.preH);
  const w = symStats(tp, sym, bySide ? side : 0, t - lookH * H, t);
  const stats = { n: w.n, pf: w.pf, net: w.net };
  const yes = (): ConfigEval => ({ ok: true, lcb: 0, gh: 1, ddt: 0, ...stats });
  if (!o.symGate || o.symGate === "off" || isSignalInd(tp.ind)) return yes();
  const minN = o.symMinN ?? 2;
  const proven = o.symGate === "proven" || o.symGate === "provenSide";
  const fails = w.net <= 0 || w.pf < minPfForTape(tp, o);
  // Warmup can relax the sample floor for an observed result. An empty result proves no symbol/side PF and
  // must never inherit the config's or another symbol's qualification, including when symMinN is zero.
  if (proven && (w.n === 0 || (o.gates.warmup === false && w.n < minN)))
    return { ok: false, fail: "closes", ...stats };
  const judged = proven ? o.gates.warmup === false || w.n >= 1 : w.n >= minN;
  return judged && fails ? { ok: false, fail: "pf", ...stats } : yes();
}

export function engineContextValid(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  sym?: string,
  side?: number,
): boolean {
  return sym === undefined || side === undefined || configContextEval(tp, t, o, sym, side).ok;
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
      /** Explicit diagnostic capture from this entry's causal Block history. */
      blockLevels?: Partial<Record<BlockSource, number>>;
      /** block.auto: per relation at its level, whether Auto or the manual switch decided it */
      blockDecidedBy?: Partial<Record<BlockSource, "auto" | "manual">>;
      blockAttribution?: BlockAttribution;
      blockEffectiveLevels?: Partial<Record<BlockSource, number>>;
      blockSampleCounts?: Partial<Record<BlockSource, number>>;
      /** Relate multiplier captured from settled accepted-order history. */
      relateVol?: number;
      relateBase?: number;
      relateLevels?: Partial<Record<RelateSource, number>>;
      relateParts?: RelateParts;
    }
  | { ok: false; why: string; relateParts?: RelateParts; relateBaseVol?: number; relateBase?: number };

/** Range sizing sits outside the Block / coordination stack and does not change unit-return qualification. */
export function rangeVolumeFactorFor(
  tp: Pick<ConfigTape, "ind"> & {protect: Partial<Protect>},
  o: Pick<WalkForwardOptions, "rangeVolumeFactors" | "signalRangeVolumeFactors" | "exitVolumeFactor">,
): number {
  if (tp.protect.exitType === "historic") return volumeRatio(o.exitVolumeFactor);
  if (isSignalInd(tp.ind)) {
    const range = signalRangeOf(tp.ind);
    return range ? volumeRatio(o.signalRangeVolumeFactors?.[range]) : 1;
  }
  const key = tp.protect.tag ?? "wide";
  return volumeRatio(o.rangeVolumeFactors?.[key] ?? RANGE_VOLUME_FACTOR_DEFAULTS[key]);
}

/** The crowding group of a config: its range tag, "wide" without one, "sig" for a signal. */
export const crowdRangeOf = (cfg: string): string =>
  isHistoricExitConfig(cfg)
    ? "exit"
    : isSignalInd(cfg.split("|")[1] ?? "")
    ? "sig"
    : rangeOfId(cfg) || "wide";
/** The crowding key of an entry: strategy group × symbol × side × entry time. */
/**
 * A pair event: indicator pair (bot|ind, the config id's first two fields) × symbol × side × strategy type × entry minute.
 * Historic Exit configs keep their own identity (an exit config is its own event).
 */
export const pairEventKey = (
  cfg: string,
  sym: string,
  side: number,
  kind: string | undefined,
  entryT: number,
  axisOwn = true,
) => {
  // an Axis config (each depth / range / mode is its own Set) is its own event, as a Historic Exit config is
  const pair = isHistoricExitConfig(cfg, kind) || (axisOwn && kind === "axis") ? cfg : cfg.split("|", 2).join("|");
  return `${pair}|${sym}|${side > 0 ? 1 : -1}|${kind ?? ""}|${Math.floor(entryT / 60_000)}`;
};
export const crowdKey = (cfg: string, sym: string, side: number, entryT: number) =>
  `${crowdRangeOf(cfg)}|${sym}|${side}|${entryT}${exitScopeSuffix(cfg)}`;
/** The cap of a config's range under `entryCrowd` (Infinity = none). */
export const crowdCapOf = (o: Pick<WalkForwardOptions, "entryCrowd">, cfg: string): number => {
  const k = o.entryCrowd?.[crowdRangeOf(cfg)];
  return k && k > 0 ? k : Infinity;
};

/** Indication type of a tape; exact Block indication relations use the full ID separately. */
export const kindOfInd = (ind: string) => INDICATION_BY_ID.get(laneOf(ind).base)?.kind ?? "none";

/** Executed rows need verified unit evidence. A raw ConfigTape candidate explicitly declares its intrinsic unit basis. */
export const blockEntryOf = (
  x: Trade,
  basis: "modeled-execution" | "candidate-unit" = "modeled-execution",
) => ({
  sym: x.sym,
  side: x.side,
  kind: kindOfInd(x.cfg.split("|")[1] ?? ""),
  r: basis === "candidate-unit" ? x.r : unitReturn(x),
  ind: x.cfg.split("|")[1] ?? "",
  type: x.kind ?? "normal",
  cfg: x.cfg,
  entryT: x.entryT,
});

const OWN_SOURCES: Record<BlockSource, boolean> = {
  config: true,
  lane: true,
  overall: false,
  symbol: false,
  direction: false,
  indication: false,
  type: false,
  range: false,
};

/** Real-stage execution rules for one candidate entry (toggles, last-N, Block / Block Active). */

function positionAcceptRule(o: WalkForwardOptions, a: import("../signal-config.ts").SignalAccept) {
  return o.gates.positionWindows
    ? { ...a, lastN: a.lastN ?? Math.min(500, Math.max(1, a.minTrades)) }
    : a;
}

export function execDecision(
  tp: ConfigTape,
  entryT: number,
  o: WalkForwardOptions,
  ctx?: {
    book?: BlockBook | null;
    guard?: SignalGuard | null;
    direction?: CandidateDirectionBook | null;
    relate?: RelateBook | null;
    /** Complete current external base, resolved from the Block decision before Relate sizes the entry. */
    relateBase?: (blockVolume: number) => number;
    /** Internal replay collection path; it must apply the processed verdict before publishing execution. */
    processedBase?: boolean;
    /** Only the independently priced window grid can hand off the exact opposite side of this parent. */
    processedParentPair?: string;
    sym: string;
    side: number;
  },
): ExecDecision {
  if (o.processedStages && !ctx?.processedBase) return { ok: false, why: "processedUnavailable" };
  const tg = effectiveStrategyToggles(tp, o);
  const applyRelate = (decision: Extract<ExecDecision, { ok: true }>): ExecDecision => {
    if (!o.relate?.enabled) return decision;
    if (!ctx?.relate) return { ok: false, why: "relateUnavailable" };
    // Relate source portions are always measured from the original base unit. Other sizing groups must not
    // compound the relation additions before their combined stack is capped at execution.
    const base = ctx.relateBase ? ctx.relateBase(decision.vol) : 1;
    if (!Number.isFinite(base) || !(base > 0)) return { ok: false, why: "relateVolumeUnknown" };
    const relation = ctx.relate.decide({
      cfg: tp.id,
      sym: ctx.sym,
      side: ctx.side,
      ind: tp.ind,
      strategy: tp.kind,
      coordination: isSignalCoordinationInd(tp.ind) ? tp.bot : "ordinary",
      range: tp.protect.tag ?? "wide",
    }, base, entryT);
    if (!relation.allowed)
      return { ok: false, why: "relateActive", relateParts: relation.parts, relateBaseVol: decision.vol, relateBase: base };
    // Active gates every entry independently of raise eligibility. When the path cannot prove this limit,
    // keep the original trade/stop and record no hypothetical relation parts as actual funded sizing.
    // Legacy settings acquire the same default as the settings merger.
    if (!relateFixedStopWithinLimit(tp.kind, tp.protect, o.relate.maxSl ?? DEFAULT_RELATE_ADJUSTMENT.maxSl))
      return { ...decision, relateBase: base };
    return {
      ...decision,
      relateBase: base,
      ...(relation.volume !== 1 ? { relateVol: relation.volume } : {}),
      ...(Object.keys(relation.levels).length ? { relateLevels: relation.levels } : {}),
      ...(Object.keys(relation.parts).length ? { relateParts: relation.parts } : {}),
    };
  };
  if (tp.heldOnly) return { ok: false, why: "heldOnly" };
  const pair = `${tp.bot}|${tp.ind}`;
  const sourcePair = o.processedStages?.windowGrid && ctx?.processedParentPair === mirrorId(pair)
    ? ctx.processedParentPair : o.invertSeats ? mirrorId(pair) ?? pair : pair;
  if (o.processedStages?.execN !== undefined || o.processedStages?.lanes) {
    const proof = tp.kind === "exit" ? o.exitBasePassed :
      isSignalInd(tp.ind) ? o.signalBasePassed : o.basePassed;
    if (!proof?.has(sourcePair)) return { ok: false, why: "processedBaseUnavailable" };
  }
  if (
    (!isSignalInd(tp.ind) || tp.kind === "exit") &&
    !baseAllowsTape(tp, o, sourcePair)
  )
    return { ok: false, why: "base" };
  if (!tapeExecutable(tp, o)) return { ok: false, why: "toggle" };
  if(!o.processedStages && o.gates?.positionWindows && (!ctx || !positionConfigEval(tp,entryT,o,ctx.sym,ctx.side).ok))
    return {ok:false,why:"configValidation"};

  const excludedRange = isSignalInd(tp.ind) ? "sig" : tp.protect.tag;
  if (tp.kind !== "exit" && o.excludeRanges?.length && excludedRange && o.excludeRanges.includes(excludedRange))
    return { ok: false, why: "rangeOff" };
  // the range's own seatQuietH / lastN (wf.rangeOpts), else the global ones
  const ro = o.rangeOpts ? rangeOptsOf(o, tp) : undefined;
  const quietH = ro?.seatQuietH ?? o.seatQuietH;
  // seat cool-off (wf.seatQuietH): an engine config that closed within the last H hours before the entry waits;
  // wf.seatSideCooloff: only a close in the entry's own direction counts (any symbol, as before)
  if (quietH && quietH > 0 && !isSignalInd(tp.ind)) {
    const b = lowerBound(tp.exitT, entryT + 1);
    if (o.seatSideCooloff && ctx?.side) {
      const want = ctx.side > 0 ? 1 : -1;
      for (let i = b - 1; i >= 0 && tp.exitT[i] > entryT - quietH * H; i--)
        if ((tp.side[i] > 0 ? 1 : -1) === want) return { ok: false, why: "seatQuiet" };
    } else if (b > 0 && tp.exitT[b - 1] > entryT - quietH * H) return { ok: false, why: "seatQuiet" };
  }
  // signals: only the active ones (source × lane × symbol) trade, and a config set of source × symbol ×
  // direction × type whose last N closed results average below zero is disabled
  if (ctx && isSignalInd(tp.ind)) {
    // a signal pair held only for its open positions (it no longer passes Base) opens nothing new
    if (tp.kind !== "exit" && o.signalBasePassed && !o.signalBasePassed.has(`${tp.bot}|${tp.ind}`))
      return { ok: false, why: "signalBase" };
    if (
      o.signalActive &&
      !signalActiveHas(o.signalActive, tp.bot, tp.ind, ctx.sym, ctx.side, tp.kind, tp.id)
    )
      return { ok: false, why: "signalInactive" };
    if (
      o.signalGuardN &&
      ctx.guard?.disabled(guardKey(tp.id, ctx.sym, ctx.side, tp.kind), o.signalGuardN)
    )
      return { ok: false, why: "signalGuard" };
    // the loss cluster of this direction only (a cluster of losing shorts never pauses the longs)
    const coordination = isSignalCoordinationInd(tp.ind);
    if (
      tp.kind !== "exit" && o.signalCluster?.enabled &&
      ctx.guard?.clustered(
        entryT,
        o.signalCluster,
        ctx.side,
        coordination ? "coordination" : "signals",
      )
    )
      return { ok: false, why: "signalCluster" };
    if (
      o.signalAccept?.enabled &&
      ctx.guard &&
      // Own-config acceptance is separate from the explicit shared side/cluster coordination below.
      !ctx.guard.accepts(
        acceptKey(tp.ind, ctx.sym, ctx.side, tp.kind, tp.id),
        entryT,
        positionAcceptRule(o,o.signalAccept),
      )
    )
      return { ok: false, why: "signalPf" };
    // Direction acceptance: this side's settled accepted orders, pooled over source and symbol, must clear the PF.
    if (
      tp.kind !== "exit" && o.signalSideAccept?.enabled &&
      ctx.guard &&
      !o.probe?.perRange &&
      !o.probe?.perCell &&
      !ctx.guard.accepts(sideAcceptKey(ctx.side, coordination), entryT, positionAcceptRule(o,o.signalSideAccept))
    )
      return { ok: false, why: "signalSide" };
    // the Signal's own last N on this exact symbol and direction (min PF, DDT and DDR)
    if (
      !o.processedStages &&
      !o.probe?.perRange &&
      !o.probe?.perCell &&
      (!signalConfigEval(tp, entryT, o, ctx.sym, ctx.side).ok || !o.gates.positionWindows && !signalLastNOk(
        tp,
        ctx.sym,
        ctx.side,
        entryT,
        validLastNOf(tp, o),
        minPfForTape(tp, o),
        o.gates.maxDdtH,
        o.gates.maxDdr ?? 0,
        o.gates.lastNFloor ?? 0,
        o.gates.warmup !== false,
        lossPriorOf(tp, o.gates),
      ))
    )
      return { ok: false, why: "signalValid" };
  }
  if (o.paused?.size && o.paused.has(setKeyOf(tp.id))) return { ok: false, why: "adjustPause" };
  // Runtime admission carries its Base provenance. Recheck this exact config as of the entry, not the last seat
  // refresh: short holds can settle several losing closes within one selection step. Held exits bypass entries.
  if (
    !o.processedStages &&
    !isSignalInd(tp.ind) &&
    o.basePassed &&
    !o.probe?.perRange &&
    !o.probe?.perCell &&
    !configEval(tp, entryT, o).ok
  )
    return { ok: false, why: "configValidation" };

  if (
    !o.processedStages &&
    !isSignalInd(tp.ind) &&
    !o.probe?.perRange &&
    !o.probe?.perCell &&
    !(ctx?.side === 1 || ctx?.side === -1
      ? configDirectionEval(tp, entryT, o, ctx.side).ok
      : configEval(tp, entryT, o).ok)
  )
    return { ok: false, why: "directionValidation" };

  // last-N uses the stricter of its own floor and the stage min PF, so a pass below min PF cannot enter
  // a demo probe seat (a range tape) trades without the last-N and symbol gates: that is what it measures
  const probed = (!!o.probe?.perRange && !!tp.protect.tag) || !!o.probe?.perCell;
  // end stage / Live: the recent closes must clear min PF and the DDT gate again
  // signals: their own last N (never more than the engine's)
  // Per direction: the last N closes of the entry's own side. Full engine validation above also requires the
  // per direction: the last N closes of the entry's own side (long and short run independently). The seat validation
  // above stays pooled only for engine seats; Signals always judge their own symbol and direction
  // (an engine range's own lastN: wf.rangeOpts)
  const engineN = ro?.lastN ?? o.lastN;
  const lastN = isSignalInd(tp.ind) ? signalEntryLastNOf(tp, o) : engineN;
  if (
    !probed &&
    !o.gates.positionWindows &&
    !o.processedStages &&
    !(ctx && isSignalInd(tp.ind)
      ? signalLastNOk(
          tp,
          ctx.sym,
          ctx.side,
          entryT,
          lastN,
          Math.max(o.lastNMinPf, minPfForTape(tp, o)),
          o.gates.maxDdtH,
          o.gates.maxDdr ?? 0,
          o.gates.lastNFloor ?? 0,
          o.gates.warmup !== false,
          lossPriorOf(tp, o.gates),
        )
      : lastNSideOk(
          tp,
          ctx?.side ?? 0,
          entryT,
          lastN,
          Math.max(o.lastNMinPf, minPfForTape(tp, o)),
          o.gates.maxDdtH,
          o.gates.maxDdr ?? 0,
          o.gates.lastNFloor ?? 0,
          o.gates.warmup !== false,
          lossPriorOf(tp, o.gates),
        ))
  )
    return { ok: false, why: "lastN" };

  // The explicit symbol gate has its own scope, sample and warmup policy. Never impose config Last-N here.
  if (!probed && !o.processedStages && ctx?.sym && !engineContextValid(tp, entryT, o, ctx.sym, ctx.side))
    return { ok: false, why: "symPf" };
  // engine direction acceptance: this type family × range × side must clear its PF on its candidates' last hours
  if (
    !probed &&
    o.engineSideAccept?.enabled &&
    ctx?.guard?.engineSide &&
    ctx.side &&
    !isSignalInd(tp.ind) &&
    !ctx.guard.engineSide.acceptsPerInd(
      engineSideKeyFor(
        tp.kind,
        tp.protect.tag,
        ctx.side,
        tp.ind,
        o.engineSideAccept.perInd,
        tp.protect.exitSet,
      ),
      engineSideKey(tp.kind, tp.protect.tag, ctx.side, tp.kind === "exit" ? tp.ind : undefined, tp.protect.exitSet),
      entryT,
      positionAcceptRule(o,o.engineSideAccept),
      ctx.guard.exchange,
    )
  )
    return { ok: false, why: "engineSide" };
  // the direction gate: this side's last N candidates across the universe sum negative → no new entry on it
  if (!probed && (o.sideGateN ?? 0) > 0 && !isSignalInd(tp.ind)) {
    // A known empty candidate record is immature and may trade. Missing evidence is not an empty record.
    if (!ctx?.direction || (ctx.side !== 1 && ctx.side !== -1))
      return { ok: false, why: "sideGateUnavailable" };
    const n = o.sideGateN as number;
    const s = ctx.direction.tailSum(ctx.side, n, { cfg: tp.id, type: tp.kind });
    if (s.n >= n && !(Number.isFinite(s.sum) && s.sum > 0)) return { ok: false, why: "sideGate" };
  }
  // Normal off: Normal / Trailing execute only Block-raised. Historic Exit has its own independent switch.
  const plain = isPlainKind(tp.kind);
  const sigBase = plain && tp.kind !== "exit" && o.rangeOpts?.sig?.normal !== false && !!o.signalOwnBase && isSignalInd(tp.ind);
  const kindBaseOn = tp.kind === "exit" ? tg.exit !== false : tg.normal;
  // The enabled plain type's unraised base trades on the config's own recent record.
  const gatedBase = !o.processedStages && plain && tp.kind !== "exit" && kindBaseOn && !sigBase && (o.normalBaseMinPf ?? 0) > 0;
  const baseOk = () => o.gates.positionWindows && ctx ? (()=>{
    const ev=positionConfigEval(tp,entryT,o,ctx.sym,ctx.side);
    return ev.ok&&qualifiedPf(ev.gp??NaN,ev.gl??NaN,o.normalBaseMinPf??0);
  })() : lastNSideOk(
      tp,
      ctx?.side ?? 0,
      entryT,
      engineN > 0 ? engineN : 25,
      o.normalBaseMinPf ?? 0,
      o.gates.maxDdtH,
      o.gates.maxDdr ?? 0,
      o.gates.lastNFloor ?? 0,
      o.gates.warmup !== false,
    );
  if (!tg.block) {
    if (plain && !kindBaseOn && !sigBase) return { ok: false, why: "normalOff" };
    if (gatedBase && !baseOk()) return { ok: false, why: "normalPf" };
    return applyRelate({ ok: true, level: 0, vol: 1 });
  }
  // a type Block never raises trades at its own volume (and Block Active does not skip it); the Normal base PF
  // still applies, as for a range Block never raises
  if (o.block.excludeKinds?.includes(tp.kind)) {
    if (plain && !kindBaseOn && !sigBase) return { ok: false, why: "normalOff" };
    if (gatedBase && !baseOk()) return { ok: false, why: "normalPf" };
    return applyRelate({ ok: true, level: 0, vol: 1 });
  }
  // a range Block never raises: its unit, on its own record (the Normal base PF still applies). "wide" is the untagged
  // Normal / Trailing grid, as live.excludeRanges reads it: signals and the untagged Axis / DCA ladders are not Wide
  const blockRange =
    tp.kind === "exit" ? "" : tp.protect.tag || (plain && !isSignalInd(tp.ind) ? "wide" : "");
  if (blockRange && o.block.excludeRanges?.includes(blockRange)) {
    if (plain && !kindBaseOn && !sigBase) return { ok: false, why: "normalOff" };
    if (gatedBase && !baseOk()) return { ok: false, why: "normalPf" };
    return applyRelate({ ok: true, level: 0, vol: 1 });
  }
  const t = {
    sym: ctx?.sym ?? "",
    side: ctx?.side ?? 0,
    kind: kindOfInd(tp.ind),
    ind: tp.ind,
    type: tp.kind,
    cfg: tp.id,
  };
  // the config source's key under the configured scope (config-wide by default: the config's own record across symbols
  // and sides); every other source keeps its own key
  const keyOf = (src: BlockSource) =>
    sourceKey(src, t, false, o.block.configScope === "config" ? "config" : "context");
  // a signal on its own record: only its config source counts (no pooled book)
  const own = !!o.block.signalsOwn && isSignalInd(tp.ind);
  const blk = own ? { ...o.block, sources: OWN_SOURCES } : o.block;
  const book = own ? null : ctx?.book;
  const observed = o.blockTrace ? { n: 0 } : undefined;
  // Accepted-order history must not borrow unexecuted raw config wins, including when the book is absent.
  const configLevel =
    (blk.historySource === "accepted-orders" || blk.historySource === "processed-orders")
      ? (ctx?.book?.level(keyOf("config"), blk.maxLevel) ?? 0)
      // legacy raw-tape diagnostic: config-wide reads the tape's own closes on every symbol and side
      : blockLevel(tp, entryT, blk, blk.configScope === "config" ? undefined : ctx, observed);
  const levels = { config: configLevel, ...bookLevels(book, t, blk.maxLevel) };
  // Automatic evaluation (block.auto): every relation's count at its current level decides by its own newest results
  // whether it raises (an observed relation that Auto switches on raises with its own ratio); without enough results
  // the manual switch holds. The evidence lives in the book (accepted closes, at the level each relation stood at entry).
  const auto = ctx?.book?.auto ?? null;
  let decidedBy: Partial<Record<BlockSource, "auto" | "manual">> | undefined;
  let blkEff = blk;
  if (auto) {
    const manual = sourcesOf(blk);
    const eff: Record<BlockSource, boolean> = { ...manual };
    decidedBy = {};
    for (const src of BLOCK_SOURCES) {
      // a signal on its own record keeps only its own relations
      if (own && !OWN_SOURCES[src]) { eff[src] = false; continue; }
      const level = levels[src] ?? 0;
      if (level < 1) continue;
      const v = auto.verdict(src, keyOf(src), Math.min(level, auto.maxLevel));
      eff[src] = v.raise ?? manual[src];
      decidedBy[src] = v.raise === null ? "manual" : "auto";
    }
    blkEff = { ...blk, sources: eff };
  }
  const d = blockDecide(
    levels,
    blkEff,
    !!tg.blockActive,
    (src) => !!ctx?.book?.paused(keyOf(src)),
  );
  const traceSources = o.blockTrace ? sourcesOf(blkEff) : null;
  const trace = o.blockTrace
    ? {
        blockLevels: levels,
        ...(decidedBy ? { blockDecidedBy: decidedBy } : {}),
        blockEffectiveLevels: Object.fromEntries(
          BLOCK_SOURCES.map((src) => [
            src,
            traceSources?.[src] && !ctx?.book?.paused(keyOf(src)) ? levels[src] : 0,
          ]),
        ),
        blockSampleCounts: Object.fromEntries(
          BLOCK_SOURCES.map((src) => [
            src,
            src === "config"
              ? (blk.historySource === "accepted-orders" || blk.historySource === "processed-orders")
                ? (ctx?.book?.sampleCount(keyOf(src), blk.maxLevel) ?? 0)
                : (observed?.n ?? 0)
              : (book?.sampleCount(keyOf(src), blk.maxLevel) ?? 0),
          ]),
        ),
      }
    : {};
  // Block Active is the Block lane's own rule: Block raises only from its minimum level. It never vetoes another lane:
  // an un-raised entry falls through to its own type's rules (an enabled Normal / Trailing base trades at its unit,
  // DCA / Axis / Exit / Signals run on their own). Only a plain entry whose base is off needs the Block raise.
  if (tg.blockActive && !d.adjusted && plain && !kindBaseOn && !sigBase) return { ok: false, why: "blockActive" };
  if (!d.adjusted && gatedBase)
    return baseOk() ? applyRelate({ ok: true, level: 0, vol: 1, ...trace }) : { ok: false, why: "normalPf" };
  // Normal off: a plain Normal / Trailing entry needs Block (DCA / Axis are not plain and run on their own)
  if (plain && !kindBaseOn && !d.adjusted && !sigBase) return { ok: false, why: "normalOff" };
  if (!d.adjusted) return applyRelate({ ok: true, level: 0, vol: 1, ...trace });
  return applyRelate({
    ok: true,
    level: d.level,
    vol: d.vol,
    src: d.src,
    ...(d.legs ? { legs: d.legs } : {}),
    ...(d.blockAttribution ? { blockAttribution: d.blockAttribution } : {}),
    ...trace,
  });
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

/** No per-config string cache: the prefix check allocates nothing and retains no old research identities. */
export function sigCfg(cfg: string): boolean {
  const first = cfg.indexOf("|");
  return first >= 0 && cfg.startsWith("sig-", first + 1);
}

/** Strategy caps do not let an Exit consume another category's or another Exit lane's capacity. */
export function orderCapScope(cfg: string): string {
  return isHistoricExitConfig(cfg) ? `x:${encodeURIComponent(cfg)}` : sigCfg(cfg) ? "s" : "e";
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
  scope = signal ? "s" : "e",
): boolean {
  if (!cap || cap <= 0) return false;
  const seen = new Set<string>();
  for (const x of open) {
    if (orderCapScope(x.cfg) !== scope) continue;
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
 * and PF ≥ `minPf`. Keys `sigActiveKey` ("bot|ind|sym|side|kind": every type and direction a hedge of its own).
 */
export function hedgeSignalsAt(
  groups: readonly SignalIndexRow[],
  t: number,
  negHours: ReadonlySet<number>,
  windowH: number,
  opt: { minN: number; minPf: number } = HEDGE_DEFAULTS,
): Set<string> {
  const gen = hedgeSignalsAtGen(groups, t, negHours, windowH, opt);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/** Time-sliced hedge qualification used by the walk-forward runtime. */
export function* hedgeSignalsAtGen(
  groups: readonly SignalIndexRow[],
  t: number,
  negHours: ReadonlySet<number>,
  windowH: number,
  opt: { minN: number; minPf: number } = HEDGE_DEFAULTS,
  options?: WalkForwardOptions,
): Generator<number, Set<string>> {
  const out = new Set<string>();
  if (!negHours.size) return out;
  let visited = 0;
  for (const row of signalWindowRows(groups, t, windowH, 24, negHours, options)) {
    if (!row) {
      yield -16;
      continue;
    }
    for (const [sym, st] of Object.entries(row.bySym))
      for (const side of [1, -1] as const) {
        const own = st.sides?.[side > 0 ? "1" : "-1"];
        if (own && own.n >= opt.minN && own.net > 0 && own.pf >= opt.minPf)
          out.add(sigActiveKey(row.bot, row.ind, sym, side, row.kind, row.cfg));
      }
    if (++visited % 8 === 0) yield -16;
  }
  return out;
}

/** Keep one reference per tape, avoiding a durable config × symbol × hour expansion. */
interface SignalIndexRow {
  tp: ConfigTape;
  pair: string;
}
const signalIndexCache = new WeakMap<object, SignalIndexRow[]>();
function withSignalExitKeys(active: Set<string>, existing?: ReadonlySet<string>): Set<string> {
  if (!existing?.size) return active;
  for (const key of existing) if (key.split("|", 6)[4] === "exit") active.add(key);
  return active;
}
export function signalIndex(sigTapes: readonly ConfigTape[], cacheKey?: object): SignalIndexRow[] {
  const g = signalIndexGen(sigTapes, cacheKey);
  for (let r = g.next(); ; r = g.next()) if (r.done) return r.value;
}

/** Build only immutable tape references; each ranking reads the causal window lazily. */
export function* signalIndexGen(
  sigTapes: readonly ConfigTape[],
  cacheKey?: object,
): Generator<number, SignalIndexRow[]> {
  const hit = cacheKey && signalIndexCache.get(cacheKey);
  if (hit) return hit;
  const out: SignalIndexRow[] = [];
  for (let i = 0; i < sigTapes.length; i++) {
    const tp = sigTapes[i];
    // Historic Exit signal configs are independently qualified and do not consume the Normal/Trailing active cap.
    if (!tp.heldOnly && tp.kind !== "exit") out.push({ tp, pair: `${tp.bot}|${tp.ind}` });
    if (i > 0 && i % 1000 === 0) yield -4; // a work slice, not a completed simulated step
  }
  if (cacheKey) signalIndexCache.set(cacheKey, out);
  return out;
}

interface SignalWindowRow {
  bot: string;
  ind: string;
  cfg: string;
  kind: string;
  bySym: Record<string, SymStat>;
}
const COUNT_SOURCE_COLUMNS = ["syms", "exitT", "entryT", "symI", "side", "r"] as const;
type CountSignalSource = { generation: object; symbols: WeakRef<object> } | { columns: WeakRef<object>[] };
function countSignalSource(tp: ConfigTape): CountSignalSource | undefined {
  if (!Array.isArray(tp.syms)) return;
  const generation = immutableHistoryGeneration(tp);
  if (generation) return { generation, symbols: new WeakRef(tp.syms) };
  const columns: WeakRef<object>[] = [];
  for (const key of COUNT_SOURCE_COLUMNS) {
    const field = Object.getOwnPropertyDescriptor(tp, key);
    // An arbitrary getter is not evidence of immutable storage. Unknown sources stay on the scalar path.
    if (!field || !("value" in field) || !field.value || typeof field.value !== "object") return;
    columns.push(new WeakRef(field.value));
  }
  return { columns };
}
function sameCountSignalSource(tp: ConfigTape, source: CountSignalSource): boolean {
  if ("generation" in source)
    return immutableHistoryGeneration(tp) === source.generation && source.symbols.deref() === tp.syms;
  return COUNT_SOURCE_COLUMNS.every((key, i) => {
    const field = Object.getOwnPropertyDescriptor(tp, key);
    return !!field && "value" in field && field.value !== undefined && field.value === source.columns[i].deref();
  });
}
type CountSignalRow = {
  row: SignalWindowRow; source: CountSignalSource; at: number; until: number; bytes: number; pass: number;
  n: number; id: string; bot: string; ind: string; kind: string; tag: Protect["tag"];
  tp: number; sl: number; trail: number; trailOnly: boolean | undefined;
  heldOnly: boolean | undefined; carried: boolean | undefined; fromT: number | undefined;
};
type CountEmptyRows = {
  capacity: number; bytes: number;
  at: Float64Array; until: Float64Array; n: Float64Array; fromT: Float64Array; floor: Float64Array; flags: Uint8Array;
  generation: Array<object | undefined>; id: Array<string | undefined>; symbols: Array<readonly string[] | undefined>;
};
function countEmptyRows(capacity: number): CountEmptyRows {
  // 41 binary bytes and three reference slots per immutable catalog row, plus conservative array overhead.
  return { capacity, bytes: capacity * 80, at: new Float64Array(capacity), until: new Float64Array(capacity),
    n: new Float64Array(capacity), fromT: new Float64Array(capacity), floor: new Float64Array(capacity),
    flags: new Uint8Array(capacity), generation: new Array(capacity), id: new Array(capacity), symbols: new Array(capacity) };
}
/** Earliest close that could change a rejected window under its configured evidence scope. */
function countRejectedUntil(tp: ConfigTape, t: number, o: WalkForwardOptions, fallback: number): number {
  const policy = o.gates.positionWindows!;
  const counts = positionCounts(policy, isSignalInd(tp.ind) ? "sig" : (tp.protect.tag ?? "wide"), tp.id);
  const range = o.rangeGate && tapeRangeGateOn(o.rangeGate, tp) ? o.rangeGate : undefined;
  const partial = partialFloorOf(policy, o.gates.lastNFloor);
  const required = (n: number) => partial > 0 ? Math.min(n, partial) : n;
  const need = Math.max(...(["main", "real", "entry"] as const).map(stage =>
    policy.blocks?.[stage] ? blockRequired(policy.blocks[stage]!) : required(counts[stage])), range ? required(range.lastN) : 0);
  if (!Number.isSafeInteger(need) || need < 1) return fallback;
  const exitT = tp.exitT, before = lowerBound(exitT, t);
  // Any close in this config can complete a pooled sample or change its verdict.
  if (positionScopeOf(tp, policy) !== "context") return exitT[Math.max(need - 1, before)] ?? Infinity;
  let until = Infinity;
  for (const sym of new Set(tp.syms)) for (const side of [1, -1]) {
    const indices = signalContextOf(tp, sym, side);
    if (!indices || indices.length < need) continue;
    const end = lowerBound(indices, before);
    // Insufficient own samples cannot recover before the required close. A mature losing window may
    // recover at its very next own close. Both boundaries remain strict: exit === t is not settled yet.
    const next = end < need ? need - 1 : end;
    if (next < indices.length) until = Math.min(until, exitT[indices[next]]);
  }
  return until;
}
/**
 * Stream one tape at a time. Each context carries only its current hour/block and totals; no expanded per-config
 * hourly arrays are retained or recreated. Own completed closes count as the sample, so empty/losing sibling
 * protects cannot dilute it. Flushing an hour before updating DD preserves the former hourly causal semantics.
 */
function* signalWindowRows(
  index: readonly SignalIndexRow[],
  t: number,
  windowH: number,
  recentH: number,
  negHours?: ReadonlySet<number>,
  options?: WalkForwardOptions,
): Generator<SignalWindowRow | null> {
  if (options?.gates.positionWindows) {
    const policy = options.gates.positionWindows;
    for (const { tp } of index) {
      if (tp.heldOnly) continue;
      const input = positionEvaluationInput(tp, t);
      const bySym: Record<string, SymStat> = {};
      const counts = positionCounts(policy, "sig", tp.id);
      for (const sym of new Set(tp.syms))
        for (const side of [1, -1]) {
          const ev = positionContextEval(tp, options, sym, side, input);
          if (!ev.ok) continue;
          const indices = signalContextOf(tp, sym, side);
          if (!indices?.length) continue;
          const end = lowerBound(indices, lowerBound(tp.exitT, t));
          const own = Array.from(indices.subarray(Math.max(0, end - counts.main), end));
          const rows = negHours
            ? own.filter((i) => negHours.has(Math.floor(tp.exitT[i] / H)))
            : own;
          if (!rows.length) continue;
          const values = rows.map((i) => tp.r[i]),
            sample = positionStats(values, values.length);
          const recent = positionStats(
            Array.from(indices.subarray(Math.max(0, end - counts.real), end), (i) => tp.r[i]),
            counts.real,
          );
          const blocks = Math.min(4, values.length);
          let positive = 0;
          for (let k = 0; k < blocks; k++)
            if (
              values
                .slice(
                  Math.floor((k * values.length) / blocks),
                  Math.floor(((k + 1) * values.length) / blocks),
                )
                .reduce((a, b) => a + b, 0) > 0
            )
              positive++;
          const st = (bySym[sym] ??= { n: 0, net: 0, pf: 0, sides: {} });
          (st.sides ??= {})[side > 0 ? "1" : "-1"] = {
            n: sample.n,
            net: sample.net * 100,
            pf: profitFactor(sample.gp, sample.gl),
            dd: sample.mdd * 100,
            okShare: positive / blocks,
            recentN: recent.n,
            recentNet: recent.net * 100,
          };
        }
      yield { bot: tp.bot, ind: tp.ind, cfg: tp.id, kind: tp.kind, bySym };
    }
    return;
  }
  const endB = Math.floor(t / H);
  const fromB = endB - windowH;
  const recentB = endB - recentH;
  for (const { tp } of index) {
    if (tp.heldOnly) continue;
    type Context = {
      n: number;
      gp: number;
      gl: number;
      h: number;
      hourNet: number;
      hourGp: number;
      hourGl: number;
      net: number;
      peak: number;
      dd: number;
      block: number;
      blockNet: number;
      blocks: number;
      ok: number;
      recentN: number;
      recentNet: number;
    };
    const contexts = new Map<number, Context>();
    const flushHour = (x: Context) => {
      x.net += x.hourNet;
      x.gp += x.hourGp;
      x.gl += x.hourGl;
      if (x.h >= recentB) x.recentNet += x.hourNet;
      x.peak = Math.max(x.peak, x.net);
      x.dd = Math.max(x.dd, x.peak - x.net);
      const block = Math.floor(x.h / 4);
      if (block !== x.block) {
        if (x.blocks && x.blockNet > 0) x.ok++;
        x.blocks++;
        x.block = block;
        x.blockNet = 0;
      }
      x.blockNet += x.hourNet;
      x.hourNet = 0;
      x.hourGp = 0;
      x.hourGl = 0;
    };
    const a = lowerBound(tp.exitT, fromB * H);
    const b = lowerBound(tp.exitT, endB * H);
    let scanned = 0;
    for (let i = a; i < b; i++) {
      if (++scanned % 2048 === 0) yield null;
      const h = Math.floor(tp.exitT[i] / H);
      if (negHours && !negHours.has(h)) continue;
      const slot = tp.symI[i] * 2 + (tp.side[i] > 0 ? 1 : 0);
      let x = contexts.get(slot);
      if (!x)
        contexts.set(
          slot,
          (x = {
            n: 0,
            gp: 0,
            gl: 0,
            h,
            hourNet: 0,
            hourGp: 0,
            hourGl: 0,
            net: 0,
            peak: 0,
            dd: 0,
            block: NaN,
            blockNet: 0,
            blocks: 0,
            ok: 0,
            recentN: 0,
            recentNet: 0,
          }),
        );
      if (h !== x.h) {
        flushHour(x);
        x.h = h;
      }
      const r = tp.r[i];
      x.hourNet += r * 100;
      if (r > 0) x.hourGp += r;
      else x.hourGl -= r;
      x.n++;
      if (h >= recentB) x.recentN++;
    }
    if (!contexts.size) continue;
    const bySym: Record<string, SymStat> = {};
    const evaluationKey = options ? signalEvaluationKey(tp, t, options) : "";
    for (const [slot, x] of contexts) {
      flushHour(x);
      if (x.blocks && x.blockNet > 0) x.ok++;
      const sym = tp.syms[Math.floor(slot / 2)];
      if (
        options &&
        !signalConfigEvalWithKey(tp, t, options, sym, slot % 2 ? 1 : -1, evaluationKey).ok
      )
        continue;
      const st = (bySym[sym] ??= { n: 0, net: 0, pf: 0, sides: {} });
      (st.sides ??= {})[slot % 2 ? "1" : "-1"] = {
        n: x.n,
        net: x.net,
        pf: profitFactor(x.gp, x.gl),
        dd: x.dd,
        okShare: x.blocks ? x.ok / x.blocks : 0,
        recentN: x.recentN,
        recentNet: x.recentNet,
      };
    }
    yield { bot: tp.bot, ind: tp.ind, cfg: tp.id, kind: tp.kind, bySym };
  }
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
  gate: { days: number; minShare: number; minTrades?: number; lastN?: number },
): boolean {
  if (!closed?.length) return false;
  if (gate.lastN) {
    const sample = positionStats(
      closed.filter((x) => x.exitT < t).map((x) => x.r),
      gate.lastN,
    );
    return (
      !sample.known || (sample.complete && (sample.net < 0 || sample.positiveShare < gate.minShare))
    );
  }
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
 * The active signals at time t, causally: every exact config × type × symbol × direction judged on its own closes
 * in complete hours before t inside `windowH` (hourly resolution: drawdown over hourly steps), then ranked by
 * the same rules as the Base ranking (activeSignals: drawdown /
 * consistency / latest-24 h validation, the best `count`).
 */
export function activeSignalsAt(
  sigTapes: readonly ConfigTape[] | SignalIndexRow[],
  t: number,
  sig: SignalSettings,
  windowH: number,
  options?: WalkForwardOptions,
  report?: SignalUnitReport[],
): Set<string> {
  const index =
    sigTapes.length && "tp" in sigTapes[0]
      ? (sigTapes as SignalIndexRow[])
      : signalIndex(sigTapes as readonly ConfigTape[]);
  return withSignalExitKeys(
    activeSignals(signalWindowRows(index, t, windowH, sig.validateH ?? 24, undefined, options),
      options?.gates.positionWindows ? {...sig,minTrades:1} : sig, report),
    options?.signalActive,
  );
}

function* activeSignalsAtGen(
  index: readonly SignalIndexRow[],
  t: number,
  sig: SignalSettings,
  windowH: number,
  options?: WalkForwardOptions,
  report?: SignalUnitReport[],
): Generator<number, Set<string>> {
  const gen = activeSignalsGen(signalWindowRows(index, t, windowH, sig.validateH ?? 24, undefined, options),
    options?.gates.positionWindows ? {...sig,minTrades:1} : sig, report);
  for (;;) {
    const r = gen.next();
    if (r.done) return withSignalExitKeys(r.value, options?.signalActive);
    yield -15;
  }
}

/**
 * One immutable tape/settings generation. Ranking statistics use completed hours, so their ordered
 * candidates can be reused within that hour. Own config gates still run at the exact decision minute:
 * a newly completed Last-N sample must not wait for the next reporting/ordinary-selection step.
 * Only statically qualifying keys are retained; no config × symbol × hour history expansion.
 */
export class SignalActivationBook {
  private countRows = new Map<ConfigTape, CountSignalRow>();
  private countBytes = 0;
  private countLimit = 64 * 1024 * 1024;
  private countPass = 0;
  private countPolicy = "";
  private countEmpty?: CountEmptyRows;
  private hour = NaN;
  private ranked: Array<{
    key: string;
    tp: ConfigTape;
    sym: string;
    side: number;
    coordination: boolean;
    rejected?: { from: number; until: number; policy: number; heldOnly: boolean; fromT?: number };
  }> = [];
  private index: readonly SignalIndexRow[];
  private sig: SignalSettings;
  private windowH: number;
  private options: WalkForwardOptions;
  private own = new Map<string, PreparedSignalContext & { bytes: number; pass: number }>();
  private ownBytes = 0;
  private ownLimit = 128 * 1024 * 1024;
  private pass = 0;
  private rejectionPolicy = "";
  private rejectionGeneration = 0;

  private context(
    row: (typeof this.ranked)[number],
    pass: number,
    prefetched?: Uint32Array,
  ): PreparedSignalContext {
    let own = this.own.get(row.key);
    if (own) this.own.delete(row.key);
    else {
      const indices =
        prefetched ?? signalContextOf(row.tp, row.sym, row.side) ?? new Uint32Array(0);
      const tape = indexedEvaluationTape(row.tp, indices, 0, indices.length);
      const order = new Uint32Array(tape.n);
      for (let i = 0; i < order.length; i++) order[i] = i;
      // Columns alone underestimate many short histories: each context also owns typed-array views,
      // tape/result objects and cache keys. Reserve conservative overhead as well as exact binary bytes.
      const bytes = tapeBytes(tape.n) + order.byteLength + 4096 + 2 * row.key.length;
      own = { tape, indices: order, bytes, pass };
      while (this.ownBytes + bytes > this.ownLimit && this.own.size) {
        const first = this.own.keys().next().value!;
        const expired = this.own.get(first)!;
        // A sequential scan larger than the cache must not evict every context it just used.
        // Keep this pass's useful working set; calculate the overflow without retaining it.
        if (expired.pass === pass) return own;
        this.ownBytes -= expired.bytes;
        this.own.delete(first);
      }
      if (bytes > this.ownLimit) return own;
      this.ownBytes += bytes;
    }
    own.pass = pass;
    this.own.set(row.key, own);
    own.tape.heldOnly = row.tp.heldOnly;
    own.tape.carried = row.tp.carried;
    own.tape.fromT = row.tp.fromT;
    return own;
  }

  constructor(
    index: readonly SignalIndexRow[],
    sig: SignalSettings,
    windowH: number,
    options: WalkForwardOptions,
  ) {
    this.index = index;
    this.sig = sig;
    this.windowH = windowH;
    this.options = options;
  }

  /** Count windows change at their own strict settled-close boundary, not a sibling's close or a reporting hour. */
  private *countWindowRows(t: number): Generator<SignalWindowRow | null> {
    const policy = JSON.stringify([signalEvaluationPolicyKey(0, this.options), this.options.mode,
      this.options.durableSplits, this.options.durableFrac]);
    if (policy !== this.countPolicy) {
      this.countRows.clear(); this.countBytes = 0; this.countPolicy = policy;
      if (this.countEmpty) { this.countEmpty.generation.fill(undefined); this.countBytes = this.countEmpty.bytes; }
    }
    const capacity = Math.min(this.index.length, Math.max(0, Math.floor(this.countLimit / 80)));
    if (capacity !== (this.countEmpty?.capacity ?? 0)) {
      this.countBytes -= this.countEmpty?.bytes ?? 0;
      this.countEmpty = capacity ? countEmptyRows(capacity) : undefined;
      this.countBytes += this.countEmpty?.bytes ?? 0;
    }
    const remove = (tp: ConfigTape) => {
      const old = this.countRows.get(tp);
      if (old) { this.countBytes -= old.bytes; this.countRows.delete(tp); }
    };
    while (this.countBytes > this.countLimit && this.countRows.size)
      remove(this.countRows.keys().next().value!);
    const pass = ++this.countPass;
    let visited = 0, sliceAt = performance.now();
    for (const item of this.index) {
      const tp = item.tp;
      const slot = visited;
      // Warm rejected rows are metadata-only. Yield on elapsed work rather than millions of
      // empty checkpoints, while cold reads still return control within a bounded batch.
      if (++visited % 8 === 0 && performance.now() - sliceAt >= 8) {
        yield null; sliceAt = performance.now();
      }
      if (tp.heldOnly) continue;
      const empty = this.countEmpty, generation = immutableHistoryGeneration(tp);
      const flags = (tp.carried ? 1 : 0) | (tp.heldOnly ? 2 : 0);
      if (empty && slot < empty.capacity && generation && empty.generation[slot] === generation &&
          empty.at[slot] <= t && t <= empty.until[slot] && empty.n[slot] === tp.n &&
          empty.id[slot] === tp.id && empty.symbols[slot] === tp.syms && empty.flags[slot] === flags &&
          Object.is(empty.fromT[slot], tp.fromT ?? NaN) && Object.is(empty.floor[slot], minPfForTape(tp, this.options)))
        continue;
      let cached = this.countRows.get(tp);
      const p = tp.protect;
      if (cached && cached.at <= t && t <= cached.until && cached.n === tp.n && cached.id === tp.id &&
          cached.bot === tp.bot && cached.ind === tp.ind && cached.kind === tp.kind && cached.tag === p.tag &&
          cached.tp === p.tp && cached.sl === p.sl && cached.trail === p.trail && cached.trailOnly === p.trailOnly &&
          cached.heldOnly === tp.heldOnly && cached.carried === tp.carried && cached.fromT === tp.fromT &&
          sameCountSignalSource(tp, cached.source)) {
        cached.pass = pass;
        this.countRows.delete(tp); this.countRows.set(tp, cached);
        yield cached.row;
        continue;
      }
      if (cached) remove(tp);
      const next = signalWindowRows([item], t, this.windowH, this.sig.validateH ?? 24, undefined, this.options).next();
      if (next.done || !next.value) continue;
      const row = next.value;
      const source = countSignalSource(tp);
      if (source && positionTapeValid(tp)) {
        const exitT = tp.exitT, end = lowerBound(exitT, t);
        const until = end < tp.n ? exitT[end] : Infinity;
        if (empty && slot < empty.capacity && generation && Object.keys(row.bySym).length === 0) {
          empty.generation[slot] = generation; empty.at[slot] = t;
          empty.until[slot] = countRejectedUntil(tp, t, this.options, until); empty.n[slot] = tp.n;
          empty.id[slot] = tp.id; empty.symbols[slot] = tp.syms; empty.flags[slot] = flags;
          empty.fromT[slot] = tp.fromT ?? NaN; empty.floor[slot] = minPfForTape(tp, this.options);
          yield row;
          continue;
        }
        if (empty && slot < empty.capacity) empty.generation[slot] = undefined;
        const bytes = 4096 + 2 * (row.cfg.length + row.ind.length + row.bot.length) +
          Object.entries(row.bySym).reduce((sum, [sym, stat]) => sum + 512 + 2 * sym.length +
            512 * Object.keys(stat.sides ?? {}).length, 0);
        cached = { row, source, at: t, until, bytes, pass,
          n: tp.n, id: tp.id, bot: tp.bot, ind: tp.ind, kind: tp.kind, tag: p.tag, tp: p.tp, sl: p.sl,
          trail: p.trail, trailOnly: p.trailOnly, heldOnly: tp.heldOnly, carried: tp.carried, fromT: tp.fromT };
        while (this.countBytes + bytes > this.countLimit && this.countRows.size) {
          const first = this.countRows.keys().next().value!;
          // A scan beyond the budget keeps its current useful working set; overflow is scalar and unretained.
          if (this.countRows.get(first)!.pass === pass) break;
          remove(first);
        }
        if (this.countBytes + bytes <= this.countLimit) {
          this.countRows.set(tp, cached); this.countBytes += bytes;
        }
      }
      yield row;
    }
  }

  *at(t: number): Generator<number, Set<string>> {
    if (this.options.gates.positionWindows) {
      this.own.clear(); this.ownBytes = 0; this.ranked = []; this.hour = NaN;
      const gen = activeSignalsGen(this.countWindowRows(t), { ...this.sig, minTrades: 1 });
      for (;;) {
        const next = gen.next();
        if (next.done) return withSignalExitKeys(next.value, this.options.signalActive);
        yield -15;
      }
    }
    this.countRows.clear(); this.countBytes = 0; this.countPolicy = ""; this.countEmpty = undefined;
    const hour = Math.floor(t / H);
    if (hour !== this.hour) {
      // Apply family caps AFTER the current own-context verdicts, exactly as activeSignalsAt does.
      const uncapped = {
        ...this.sig,
        count: 0,
        coordination: { ...this.sig.coordination, count: 0 },
      };
      const keys = yield* activeSignalsGen(
        signalWindowRows(this.index, t, this.windowH, this.sig.validateH ?? 24),
        uncapped,
      );
      const byId = new Map(this.index.map(({ tp }) => [tp.id, tp]));
      const ranked: typeof this.ranked = [];
      let count = 0;
      for (const key of keys) {
        const [, , sym, side, , encoded] = key.split("|");
        const tp = encoded?.startsWith("cfg=")
          ? byId.get(decodeURIComponent(encoded.slice(4)))
          : undefined;
        if (!tp || (side !== "1" && side !== "-1"))
          throw new Error("Signal ranking lost its exact config context");
        ranked.push({
          key,
          tp,
          sym,
          side: Number(side),
          coordination: isSignalCoordinationInd(tp.ind),
        });
        if (++count % 256 === 0) yield -15;
      }
      // A cancelled construction cannot expose a partial ranking.
      this.ranked = ranked;
      this.hour = hour;
    }
    const out = new Set<string>(),
      evaluationKeys = new Map<ConfigTape, string>();
    const pass = ++this.pass,
      rejectionPolicy = signalEvaluationPolicyKey(0, this.options);
    if (rejectionPolicy !== this.rejectionPolicy) {
      this.rejectionPolicy = rejectionPolicy;
      this.rejectionGeneration++;
    }
    const policy = signalEvaluationPolicyKey(t, this.options);
    let classic = 0,
      coordinated = 0,
      count = 0;
    for (const row of this.ranked) {
      if (++count % 32 === 0) yield -15;
      const cap = row.coordination ? this.sig.coordination.count : this.sig.count;
      if (cap > 0 && (row.coordination ? coordinated : classic) >= cap) continue;
      const rejected = row.rejected;
      if (
        rejected &&
        rejected.policy === this.rejectionGeneration &&
        rejected.from <= t &&
        t < rejected.until &&
        rejected.heldOnly === !!row.tp.heldOnly &&
        rejected.fromT === row.tp.fromT
      )
        continue;
      let indices: Uint32Array | undefined;
      if (!this.own.has(row.key)) {
        indices = signalContextOf(row.tp, row.sym, row.side) ?? new Uint32Array(0);
        const initial = signalInitialVerdict(row.tp, row.tp, indices, t, this.options);
        if (initial.fail) {
          // These three early gates depend only on strict [t-history, t) completed closes. A rejection
          // cannot recover before a close enters/leaves that interval (or the immutable policy changes).
          // Retain only its clock, not a copied history for a context which cannot currently qualify.
          const nextClose =
            initial.before < indices.length ? row.tp.exitT[indices[initial.before]] + 1 : Infinity;
          const expiry =
            initial.first < initial.before
              ? row.tp.exitT[indices[initial.first]] + signalHistoryHours(this.options) * H + 1
              : Infinity;
          row.rejected = {
            from: t,
            until: row.tp.heldOnly ? Infinity : Math.min(nextClose, expiry),
            policy: this.rejectionGeneration,
            heldOnly: !!row.tp.heldOnly,
            fromT: row.tp.fromT,
          };
          continue;
        }
      }
      row.rejected = undefined;
      let key = evaluationKeys.get(row.tp);
      if (key === undefined)
        evaluationKeys.set(row.tp, (key = signalEvaluationKeyOfPolicy(row.tp, policy)));
      // Cache immutable own columns only; every time-dependent verdict is recalculated at this minute.
      // Future rows remain behind the evaluator's existing strict t / t−1 boundaries.
      if (
        !signalConfigEvalWithKey(
          row.tp,
          t,
          this.options,
          row.sym,
          row.side,
          key,
          this.context(row, pass, indices),
        ).ok
      )
        continue;
      out.add(row.key);
      if (row.coordination) coordinated++;
      else classic++;
    }
    return withSignalExitKeys(out, this.options.signalActive);
  }
}

/** Signals retain their own source history even when the broad engine window is shortened. */


/** Last-N is a count, independent of the broad selection window: retain the configured source history. */
export function tapeRetentionHours(s: CoreSettings, o: WalkForwardOptions, tf: number): number {
  const needsLastN = (o.validLastN ?? 0) > 0 || o.lastN > 0 || (o.rangeGate?.lastN ?? 0) > 0;
  const warmupH = o.processedWarmup ? Math.max(0, (o.processedWarmup.untilT - o.processedWarmup.fromT) / H) : 0;
  return warmupH + Math.max(
    o.preH,
    o.longH,
    o.symH ?? 0,
    s.signals.enabled ? signalHistoryHours(o) : 0,
    needsLastN ? (s.tfDays[String(tf)] ?? s.historyDays) * 24 : 0,
  );
}

/**
 * Best-first order of candidates entering at the same time (lower = earlier): engine sets before signals (engine
 * PF 2.4–2.8 vs signals 1.0–1.5 on real data); engine sets by their selection score, best first; signals by their
 * active ranking (the order of `signalActive`: recovery factor), best first.
 */
export function bestFirst(
  picks: ReadonlyArray<{ id: string; score: number }>,
  o: Pick<WalkForwardOptions, "signalActive" | "bestFirst">,
  engineRank?: ReadonlyMap<string, number>,
): (tp: ConfigTape, sym: string, side?: number) => number {
  if (o.bestFirst === false) return () => 0;
  const rank = engineRank ?? new Map(
    [...picks].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1)).map((p, i) => [p.id, i]),
  );
  const sigRank = new Map([...(o.signalActive ?? [])].map((k, i) => [k, i]));
  const E = rank.size + 1;
  return (tp, sym, side = 1) => {
    const r = rank.get(tp.id);
    if (r !== undefined) return r;
    if (isSignalInd(tp.ind)) {
      const exact = sigRank.get(sigActiveKey(tp.bot, tp.ind, sym, side, tp.kind, tp.id));
      return E + (exact ?? sigRank.size);
    }
    return E - 1; // held / unranked engine set
  };
}

/**
 * Engine tapes (selected into Real seats) and signal tapes (every config of an active signal runs on its own;
 * none when signals are off).
 */
/**
 * The engine tapes of a tape list, one array per list (memoized): the simulation and the paper step then select on the
 * same array, so the selection's per-tape infos and window cursors (selectFixedGen) carry from the simulation's last
 * step to the paper step instead of being rebuilt for a fresh copy.
 */
const engineTapesMemo = new WeakMap<
  readonly ConfigTape[],
  { n: number; engine: readonly ConfigTape[] | null }
>();
function engineTapesOf(tapes: readonly ConfigTape[]): readonly ConfigTape[] | null {
  const m = engineTapesMemo.get(tapes);
  if (m && m.n === tapes.length) return m.engine;
  // null: no signal tape (the engine list is the list itself)
  const engine = tapes.some((t) => isSignalInd(t.ind))
    ? tapes.filter((t) => !isSignalInd(t.ind))
    : null;
  engineTapesMemo.set(tapes, { n: tapes.length, engine });
  return engine;
}

export function splitSignalTapes(
  tapes: readonly ConfigTape[],
  o: Pick<WalkForwardOptions, "signalActive" | "signalRank">,
): { engine: readonly ConfigTape[]; signal: ConfigTape[] } {
  const engine = engineTapesOf(tapes);
  if (!engine) return { engine: tapes, signal: [] };
  // ranked per step: every signal tape is a candidate, the step's active set gates it
  if (o.signalRank)
    return {
      engine,
      signal: tapes.filter((t) => isSignalInd(t.ind)),
    };
  const pairs = new Set([...(o.signalActive ?? [])].map((k) => k.split("|").slice(0, 2).join("|")));
  return {
    engine,
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

export type SignalEntryCursor = {
  tp: ConfigTape;
  order: Uint32Array;
  next: number;
  nextT: number;
  openOrder: Uint32Array;
  openTimes: Float64Array;
  /** Read-only endpoint fields for spilled positions, indexed like openTimes. */
  packedOpen?: Float64Array;
  nextOpen: number;
};

/** Compact only the fields used for endpoint marks; unusual records fall back to the original lossless view. */
function* packOpenMarks(tp: ConfigTape, open: readonly OpenPosition[]): Generator<number, Float64Array | undefined> {
  const values = new Float64Array(open.length * 4);
  for (let i = 0; i < open.length; i++) {
    const p = open[i], sym = tp.syms.indexOf(p.sym), weight = p.w ?? 1;
    if (sym < 0 || typeof p.entryT !== "number" || typeof p.entry !== "number" ||
        typeof p.mtm !== "number" || typeof weight !== "number" || (p.side !== 1 && p.side !== -1)) return undefined;
    const at = i * 4;
    values[at] = p.entry; values[at + 1] = p.mtm; values[at + 2] = weight;
    values[at + 3] = sym * 2 + (p.side > 0 ? 1 : 0);
    if ((i & 2047) === 2047) yield -3;
  }
  return values;
}

function packedOpenAt(cursor: SignalEntryCursor, i: number): MarkableOpen | undefined {
  const values = cursor.packedOpen;
  if (!values) return undefined;
  // A mutable tape access after scheduling remains authoritative, as it was before compaction.
  const override = tapeOpenOverride(cursor.tp);
  if (override) return override[i];
  const at = i * 4, slot = values[at + 3];
  return { sym: cursor.tp.syms[Math.floor(slot / 2)], side: slot % 2 ? 1 : -1,
    entryT: cursor.openTimes[i], entry: values[at], mtm: values[at + 1], w: values[at + 2] };
}
/** Only metadata and the next closed-entry timestamp are needed while a history has no due entry. */
export function nextSignalEntryT(cursor: SignalEntryCursor): number {
  return Math.min(cursor.nextT, cursor.nextOpen < cursor.openOrder.length
    ? cursor.openTimes[cursor.openOrder[cursor.nextOpen]] : Infinity);
}
/** Schedule complete immutable histories without reopening every stored tape at each minute. */
export function* signalEntryQueueGen(
  tapes: readonly ConfigTape[], startT: number, stopT: number, markOpen: boolean,
): Generator<number, ExitHeap<SignalEntryCursor>> {
  const queue = new ExitHeap<SignalEntryCursor>();
  for (const tp of tapes) {
    const entryT = tp.entryT;
    let n = 0;
    for (let i = 0; i < tp.n; i++) {
      if (entryT[i] >= startT && entryT[i] < stopT) n++;
      if ((i & 8191) === 8191) yield -3;
    }
    const order = new Uint32Array(n);
    let j = 0;
    for (let i = 0; i < tp.n; i++)
      if (entryT[i] >= startT && entryT[i] < stopT) order[j++] = i;
    order.sort((a, b) => entryT[a] - entryT[b] || a - b);
    let packedOpen: Float64Array | undefined;
    let openSnapshot: readonly OpenPosition[] | undefined;
    let openTimes: Float64Array;
    if (markOpen && storedTapeOpen(tp) && !tapeOpenOverride(tp)) {
      // One lossless disk read supplies both the clock index and compact marking fields.
      openSnapshot = tapeOpenView(tp);
      openTimes = Float64Array.from(openSnapshot, p => p.entryT);
    } else openTimes = markOpen ? tapeOpenTimes(tp) : new Float64Array(0);
    const eligibleOpen: number[] = [];
    for (let i = 0; i < openTimes.length; i++)
      if (openTimes[i] >= startT && openTimes[i] < stopT) eligibleOpen.push(i);
    if (openSnapshot && eligibleOpen.length) packedOpen = yield* packOpenMarks(tp, openSnapshot);
    const openOrder = Uint32Array.from(eligibleOpen);
    openOrder.sort((a, b) => openTimes[a] - openTimes[b] || a - b);
    if (order.length || openOrder.length) {
      const cursor = { tp, order, next: 0, nextT: order.length ? entryT[order[0]] : Infinity, openOrder, openTimes,
        ...(packedOpen ? { packedOpen } : {}), nextOpen: 0 };
      queue.push(nextSignalEntryT(cursor), cursor);
    }
    yield -3;
  }
  return queue;
}

/** Drain due entries only. Unselected histories may advance to the end of a caller-frozen
 * selection interval. The boundary entry is retained for the next selection; no return is changed. */
export function* scheduledEngineEntriesGen(
  queue: ExitHeap<SignalEntryCursor>, endT: number, selected: Pick<ReadonlySet<string>, "has">, markT: number,
  selectionEndT = endT,
): Generator<number, Array<{ tr: Trade; tp: ConfigTape }>> {
  const out: Array<{ tr: Trade; tp: ConfigTape }> = [];
  let visitedRows = 0, visitedCursors = 0;
  while (queue.peekT() < endT) {
    const c = queue.pop()!;
    const tp = c.tp, accept = selected.has(tp.id);
    // These sets cannot produce an admitted entry until selection changes. Reopening their compressed
    // history at every minute dominated the full-catalog replay. Advance once within that exact interval.
    const until = accept ? endT : Math.max(endT, selectionEndT);
    const entryT = c.nextT < until ? tp.entryT : undefined;
    while (c.nextT < until) {
      const i = c.order[c.next++];
      c.nextT = c.next < c.order.length ? entryT![c.order[c.next]] : Infinity;
      if (accept) out.push({ tr: tradeAt(tp, i), tp });
      if (++visitedRows % 256 === 0) yield -6;
    }
    let openView: readonly OpenPosition[] | undefined;
    while (c.nextOpen < c.openOrder.length && c.openTimes[c.openOrder[c.nextOpen]] < until) {
      const i = c.openOrder[c.nextOpen++];
      if (accept) out.push({ tr: markedOpenTrade(tp, packedOpenAt(c, i) ?? (openView ??= tapeOpenView(tp))[i], markT), tp });
      if (++visitedRows % 256 === 0) yield -6;
    }
    const nextT = nextSignalEntryT(c);
    if (Number.isFinite(nextT)) queue.push(nextT, c);
    if (++visitedCursors % 8 === 0) yield -6;
  }
  return out;
}

const bump = (m: Map<string, number>, k: string, d: number) => {
  const v = (m.get(k) ?? 0) + d;
  if (v) m.set(k, v);
  else m.delete(k);
};

/**
 * Counts of the executed open orders the caps read, kept as orders open and close: O(1) per candidate instead of
 * four scans of every open order (dupe, per symbol, total, per side) and a fifth for the position cap.
 * Engine and signal orders are counted apart; each Historic Exit config has a separate cap scope.
 */
export class OpenCounts {
  private keys = new Map<string, number>();
  private sym = new Map<string, number>();
  private side = new Map<string, number>();
  private pos = new Map<string, number>();
  private all = new Map<string, number>();
  private positions = new Map<string, number>();
  private positionsSide = new Map<string, number>();
  add(x: { cfg: string; sym: string; side: number }, d: 1 | -1) {
    const c = orderCapScope(x.cfg);
    bump(this.keys, `${x.sym}|${x.cfg}|${x.side > 0 ? 1 : -1}`, d);
    bump(this.sym, `${c}|${x.sym}`, d);
    bump(this.side, `${c}|${x.side}`, d);
    const pk = `${c}|${x.sym}|${x.side}`;
    const before = this.pos.get(pk) ?? 0;
    bump(this.pos, pk, d);
    const si = x.side > 0 ? 1 : 0;
    if (d > 0 && before === 0) {
      bump(this.positions, c, 1);
      bump(this.positionsSide, `${c}|${si}`, 1);
    } else if (d < 0 && before === 1) {
      bump(this.positions, c, -1);
      bump(this.positionsSide, `${c}|${si}`, -1);
    }
    bump(this.all, c, d);
  }
  /**
   * the same config already holds an order on the symbol in this direction (long and short of one config run
   * independently: an open long never blocks the config's short; without `side` either direction counts)
   */
  dupe(sym: string, cfg: string, side?: number) {
    if (side === undefined)
      return this.keys.has(`${sym}|${cfg}|1`) || this.keys.has(`${sym}|${cfg}|-1`);
    return this.keys.has(`${sym}|${cfg}|${side > 0 ? 1 : -1}`);
  }
  perSymbol(sym: string, signal: boolean, scope = signal ? "s" : "e") {
    return this.sym.get(`${scope}|${sym}`) ?? 0;
  }
  open(signal: boolean, scope = signal ? "s" : "e") {
    return this.all.get(scope) ?? 0;
  }
  perSide(side: number, signal: boolean, scope = signal ? "s" : "e") {
    return this.side.get(`${scope}|${side}`) ?? 0;
  }
  /**
   * positionsFull on the counts: opening sym × side would exceed the cap on distinct positions of its class (signals:
   * of its class and direction — each side up to the cap)
   */
  positionsFull(sym: string, side: number, signal: boolean, cap: number | undefined, scope = signal ? "s" : "e") {
    if (!cap || cap <= 0) return false;
    if (this.pos.has(`${scope}|${sym}|${side}`)) return false;
    return (signal ? this.positionsSide.get(`${scope}|${side > 0 ? 1 : 0}`) ?? 0
      : this.positions.get(scope) ?? 0) >= cap;
  }
}

/**
 * The simulated steps walkForwardGen yields (one `yield t` per step) over `u` — the total of the runtime's Real
 * progress. The same window as walkForwardGen: the start is floored to the hour, so the run spans up to one partial
 * hour more than simH (a total of ceil(simH / stepH) ran past 100 %).
 */
export function walkForwardSteps(
  u: Pick<Universe, "nowT" | "baseTf" | "bars">,
  o: Pick<WalkForwardOptions, "simH" | "stepH" | "startT" | "processedWarmup">,
): number {
  const endT = u.nowT;
  const targetT = o.startT ?? Math.floor((endT - o.simH * H) / H) * H;
  const startT = o.processedWarmup?.fromT ?? targetT;
  const stopT = o.startT === undefined ? endT : Math.min(endT, targetT + o.simH * H);
  const barH = (u.baseTf ?? u.bars[0]?.tfMin ?? 60) / 60;
  const stepMs = Math.max(o.stepH, barH) * H;
  if (!(stepMs > 0) || !(stopT > startT)) return 0;
  // the loop runs t = startT, startT + step, … while t < stopT (the same float steps, so the same count)
  let n = 0;
  for (let t = startT; t < stopT; t += stepMs) n++;
  return n;
}

/** Closed orders per consecutive (start, end] block, aligned with hourly closes and the run's terminal close. */
export function runBlocks(
  trades: readonly Trade[],
  startT: number,
  stopT: number,
  blockH = 8,
): WalkForwardResult["blocks"] {
  const blockMs = blockH * H;
  if (!Number.isFinite(blockMs) || blockMs <= 0)
    throw new RangeError("blockH must be finite and positive");
  const blocks: WalkForwardResult["blocks"] = [];
  for (let b = startT; b < stopT; b += blockMs) {
    const end = Math.min(stopT, b + blockMs);
    const s = unitStatsOf(trades.filter((x) => x.exitT > b && x.exitT <= end));
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
  return (
    stats.pf >= minPf &&
    stats.net > 0 &&
    blocks.filter((b) => b.n >= 3).every((b) => b.pf >= PF_NEUTRAL * 0.9)
  );
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
): { stats: UnitStats; stable: boolean } {
  const closed = r.trades.filter(keep);
  const open = (r.openAtEnd ?? []).filter(keep);
  const stats = unitStatsOf(open.length ? [...closed, ...open] : closed, r.endT);
  return { stats, stable: runStable(stats, runBlocks(closed, r.startT, r.endT), minPf) };
}

function* selectFixedRuntimeGen(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): Generator<
  number,
  {
    picks: Selection[];
    eligible: number;
    checks?: ValidationCheck[];
    validationSummary?: ValidationSummary;
  }
> {
  const gen = selectFixedGen(tapes, t, o);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
    yield -14;
  }
}

export function* walkForwardGen(
  u: Universe,
  tapes: readonly ConfigTape[],
  o: WalkForwardOptions,
): Generator<number, WalkForwardResult> {
  const processedPolicy = o.processedStages && ownedProcessedPolicy(o.processedStages, o.gates.positionWindows);
  const processed = processedPolicy?.windowGrid ? new ProcessedWindowGridReplay(processedPolicy)
    : processedPolicy ? new ProcessedLaneReplay(processedPolicy, o.cost) : null;
  const ownedWindowGrid = !!processedPolicy?.windowGrid;
  const rankedSignals = o.signalRank && (!ownedWindowGrid || o.signalRank.count > 0 ||
    o.signalRank.coordination.count > 0 || o.coord?.hedge) ? o.signalRank : undefined;
  // Settings are frozen for this replay; do not clone and validate the same volume policy for every candidate.
  const relationalFactor = prepareRelationalVolumeFactor(o.relationalVolumeRatios);
  const processedOpen = new Map<Trade, ReturnType<ProcessedLaneReplay["enter"]> | ReturnType<ProcessedWindowGridReplay["enter"]>>();
  const activePosition = (position: Trade) => processedOpen.get(position)?.stage === "active" && !historicalActive.has(position);
  const warmupPosition = (position: Trade) => processedOpen.get(position)?.stage !== "active";
  const processedFloor = (tp: ConfigTape) => processedMinPfForTape(tp, o);
  const byId = new Map<string, ConfigTape>(), indicationVolumeFactors = new Map<string, number>();
  let indexed = 0, indexedAt = performance.now();
  for (const tp of tapes) {
    byId.set(tp.id, tp); indicationVolumeFactors.set(tp.id, volumeFactorForStrategy(tp, o));
    if (++indexed % 256 === 0 && performance.now() - indexedAt >= 8) { yield -1; indexedAt = performance.now(); }
  }
  // contrarian execution: seats whose mirror (follow ↔ revert) has no tape, step by step
  let invertMissing = 0;
  // signals: not selected into seats; every config of an active signal is a candidate on its own symbol and
  // direction (the Real gate checks active + guard per config × symbol × direction)
  const { engine: allEngine, signal: sigTapes } = splitSignalTapes(tapes, o);
  const endT = u.nowT;
  const startT = o.startT ?? Math.floor((endT - o.simH * H) / H) * H;
  const barH = (u.baseTf ?? u.bars[0]?.tfMin ?? 60) / 60;
  const stepH = Math.max(o.stepH, barH);
  const warmup = o.processedWarmup;
  const replayStartT = warmup?.fromT ?? startT;
  if (warmup && (!processed || !o.causalBase || !o.basePassed || (sigTapes.length > 0 && !o.signalBasePassed) ||
      !Number.isFinite(warmup.fromT) || warmup.fromT < 0 || warmup.fromT >= startT || warmup.untilT !== startT ||
      !Number.isFinite(warmup.baseCutT) || warmup.baseCutT < 0 || warmup.baseCutT > warmup.fromT ||
      !(stepH > 0) || (startT - warmup.fromT) % (stepH * H) !== 0))
    throw new Error("processed warmup requires a pre-warmup causal Base snapshot and aligned execution boundary");
  // seatSet "validated": each step selects only its causally validated cohort; explicit snapshots remain frozen.
  assertSeatSet(o);
  if (!ownedWindowGrid && o.gates.positionWindows && !o.evalMemo) o = { ...o, evalMemo: new EvalMemo() };
  const frozenValidation = o.validated !== undefined;
  // Explicit caller snapshots can still restrict the replay. Auto-selection scores do not own the processed book.
  const processedEntries = new Set<string>();
  const oppositeOnly = new Set<string>();
  if (processed && !frozenValidation) {
    for (let i = 0; i < allEngine.length; i++) {
      const tp = allEngine[i];
      if (processedBaseTapeEligible(tp, o)) processedEntries.add(tp.id);
      if ((i + 1) % 512 === 0) yield -1;
    }
  }
  if (processed instanceof ProcessedWindowGridReplay && processed.usesOppositeSource) {
    for (const id of processedEntries) {
      const mate = mirrorId(id);
      if (!mate || processedEntries.has(mate)) continue;
      const source = byId.get(mate);
      if (source && !source.heldOnly && !source.carried && tapeExecutable(source, o)) oppositeOnly.add(mate);
    }
  }
  const newValidationRecord = (): { summary: ValidationSummary; checks?: ValidationCheck[] } | undefined => o.recordValidation ? {
    summary: { evaluated: 0, passed: 0, closes: 0, gp: 0, gl: 0, failures: {}, setPf: emptyValidatedSetPf() },
    ...(o.recordValidation === true ? { checks: [] } : {}),
  } : undefined;
  let validationRecord = !frozenValidation ? newValidationRecord() : undefined;
  let validatedIds: Set<string> | undefined;
  const everValidated = new Set<string>();
  let selTapes = allEngine;
  if (!ownedWindowGrid && o.seatSet === "validated") {
    validatedIds = o.validated ? new Set(o.validated) : yield* validatedSetGen(allEngine, replayStartT, o, validationRecord);
    o = { ...o, validated: validatedIds };
    selTapes = validatedTapes(allEngine, validatedIds, o);
    for (const id of validatedIds) everValidated.add(id);
  }
  // without an explicit start the run reaches the newest bar (the last partial hour included)
  const stopT = o.startT === undefined ? endT : Math.min(endT, startT + o.simH * H);
  const steps: StepLog[] = [];
  const trades: Trade[] = [];
  const openAtEnd: Trade[] = [];
  const executedKeys = new Set<string>();
  // Entries are consumed in timestamp order. Exact-identity and crowd keys cannot recur after their timestamp;
  // pair events can recur later in the same minute, including across minute-batch boundaries.
  let entryKeyTime = -Infinity, pairEventMinute = -Infinity;
  // entries per range × symbol × side × entry time (entryCrowd)
  const crowd = new Map<string, number>();
  const warmupCrowd = new Map<string, number>();
  // executed pair events (onePerPairEvent)
  const pairEvents = new Set<string>();
  const open = new ExitHeap<Trade>(); // taken, by exit
  const counts = new OpenCounts(); // the caps' counts of the taken orders still open
  const historicalActiveCounts = new OpenCounts(); // modeled pre-start Active orders never spend funded capacity
  const historicalActive = new WeakSet<Trade>();
  const warmupCounts = new OpenCounts(); // modeled predecessors are not funded Active exposure
  const blockPredecessors = new OpenCounts(); // independent virtual admissions never reserve funded slots
  const hourNet = new Map<number, number>();
  const exitHourNet = new Map<string, Map<number, number>>();
  const skips: Record<string, number> = {};
  // per direction as well ("why|1" / "why|-1"): long and short run independently, and their skips are read apart;
  // and per range of the candidate ("sig" = signals): Micro's skips apart from Minimal's
  const skipsBySide: Record<string, number> = {};
  const skipsByRange: Record<string, Record<string, number>> = {};
  const skipPf: Record<string, { n: number; gp: number; gl: number }> = {};
  // the skipped candidate's own unit result, per reason (what the gate dropped)
  const skipR = (why: string, r: number) => {
    const a = (skipPf[why] ??= { n: 0, gp: 0, gl: 0 });
    a.n++;
    if (r > 0) a.gp += r;
    else a.gl -= r;
  };
  const skip = (why: string, side?: number, cfg?: string) => {
    skips[why] = (skips[why] ?? 0) + 1;
    if (side) {
      const k = `${why}|${side > 0 ? 1 : -1}`;
      skipsBySide[k] = (skipsBySide[k] ?? 0) + 1;
    }
    if (cfg !== undefined) {
      const group = isHistoricExitConfig(cfg) ? "exit" : sigCfg(cfg) ? "sig" : rangeOfId(cfg);
      const m = (skipsByRange[group] ??= {});
      m[why] = (m[why] ?? 0) + 1;
    }
  };
  // Block evidence is settled accepted Real orders, or the explicitly configured legacy candidate diagnostic.
  const book = bookFor(o);
  const relateBook = relateBookFor(o);
  const direction = candidateDirectionFor(o);
  // acceptance on the tapes' record: every candidate of the source closed before the entry (before the run too)
  const guard = new SignalGuard();
  if (o.signalAccept?.enabled || o.signalSideAccept?.enabled)
    guard.acceptIndex = yield* signalAcceptIndexGen(tapes);
  if (o.engineSideAccept?.enabled) guard.engineSide = yield* engineSideIndexGen(tapes);
  // every candidate in exit order, collected as they settle (the heap pops in the order of a stable sort by exit:
  // sorting the whole feed at the end was one long slice)
  const feed: BlockFeedEntry[] = [];
  const lean = o.resultLean === true;
  const vopen = new ExitHeap<BlockFeedEntry>(); // candidates not closed yet, by exit
  const seen = new Map<string, BlockFeedEntry>();
  // signal confirmation's pool: the engine candidates in vopen (processed, taken or not, not closed yet) per symbol ×
  // direction — the executed orders alone refused most signals (an engine candidate a cap or gate held back never
  // confirmed one)
  const engineOpen = new EngineOpenCount();
  // an evaluation family's run: the families whose configs execute (o.family)
  const families = o.family ? new Set(o.family) : null;
  // signal candidates before any gate, and those of a unit not active at their step
  const sigFunnel = { candidates: 0, inactive: 0, inactiveBySide: { "1": 0, "-1": 0 } };
  const inactiveSig = (side: number) => {
    sigFunnel.inactive++;
    sigFunnel.inactiveBySide[side > 0 ? "1" : "-1"]++;
  };
  // Stable-02 Block coordination on every closed candidate (the Block feed)
  const s2Options =
    o.coord?.enabled && (o.coord.s2Windows || o.coord.s2RelVolume)
      ? {
          windows: !!o.coord.s2Windows,
          windowN: o.coord.s2Steps ?? 6,
          pauseN: o.coord.s2Pause ?? o.coord.s2Steps ?? 6,
          relVolume: !!o.coord.s2RelVolume,
          ratio: o.coord.s2Increase ?? 0.4,
          minPf: 1.25,
          maxMult: 1.8,
          evalH: 2,
        }
      : null;
  const s2 = s2Options ? new S2Coord(s2Options) : null;
  const exitS2 = new Map<string, S2Coord>();
  const s2For = (cfg: string, type?: string, create = false): S2Coord | null => {
    if (!s2Options) return null;
    if (!isHistoricExitConfig(cfg, type)) return s2;
    let own = exitS2.get(cfg);
    if (!own && create) exitS2.set(cfg, (own = new S2Coord(s2Options)));
    return own ?? null;
  };
  // executed signal orders per source, in exit order (source stability gate)
  const srcClosed = new Map<string, Array<{ exitT: number; r: number }>>();
  const settle = function* (t: number): Generator<number, void> {
    let settled = 0;
    while (vopen.size && vopen.peekT() <= t) {
      const fx = vopen.pop()!;
      if (fx.cfg && !sigCfg(fx.cfg) && !isHistoricExitConfig(fx.cfg, fx.type)) engineOpen.add(fx.sym, fx.side, -1);
      if (fx.blockProcessed && fx.cfg) blockPredecessors.add({cfg:fx.cfg,sym:fx.sym,side:fx.side}, -1);
      // resultLean: the books still read every settled entry; only the returned copy of the feed is not kept
      if (!lean && (!warmup || (fx.entryT !== undefined && fx.entryT >= startT))) feed.push(fx);
      feedBooks(fx, book, guard, direction, relateBook);
      if (!fx.open) s2For(fx.cfg ?? "", fx.type, true)?.close(fx);
      if (++settled % 32 === 0) yield -2;
    }
    while (open.size && open.peekT() <= t) {
      const x = open.pop()!;
      const owned = processedOpen.get(x);
      (owned && owned.stage !== "active" ? warmupCounts : historicalActive.has(x) ? historicalActiveCounts : counts).add(x, -1);
      if (owned) {
        // An endpoint mark is held exposure, never a completed Last-N observation.
        if (!x.markedOpen) {
          processed!.settle(owned, x.exitT, unitReturn(x));
        }
        processedOpen.delete(x);
        if (owned.stage !== "active") {
          if (++settled % 32 === 0) yield -2;
          continue;
        }
      }
      const k = Math.floor(x.exitT / H);
      let hours = hourNet;
      if (isHistoricExitConfig(x.cfg, x.kind)) {
        hours = exitHourNet.get(x.cfg) ?? new Map<number, number>();
        exitHourNet.set(x.cfg, hours);
      }
      // The post-start account is flat at the boundary; a later close of a historical model position
      // still advances its owned stages, but cannot create funded P&L or trigger an account-hour guard.
      if (!(warmup && historicalActive.has(x) && x.exitT >= startT))
        hours.set(k, (hours.get(k) ?? 0) + x.r * 100);
      if (sigCfg(x.cfg) && !isHistoricExitConfig(x.cfg, x.kind)) {
        const src = signalSourceOf(x.cfg.split("|")[1]);
        let l = srcClosed.get(src);
        if (!l) srcClosed.set(src, (l = []));
        l.push({ exitT: x.exitT, r: x.r });
      }
      if (++settled % 32 === 0) yield -2;
    }
  };

  // Read each step directly from immutable tape columns. Expanding every candidate for the entire run here
  // retained millions of objects and repeated config keys before the first simulated minute could execute.
  // the tapes end at the run's end: their positions still open there are orders of the run too (marked to market),
  // or the run would count only the orders that closed in time — a bias toward configs that exit fast
  const markOpen = stopT === endT;
  // Four bytes per closed/open entry plus one small cursor per tape with an entry in this run.
  const signalEntries = yield* signalEntryQueueGen(sigTapes, replayStartT, stopT, markOpen);
  const engineEntries = yield* signalEntryQueueGen(allEngine, replayStartT, stopT, markOpen);
  let held = new Set<string>();
  // re-evaluating more often than one bar cannot change anything: the step is at least one bar
  const signalSteps: Array<{ t: number; keys: string[] }> = [];
  // the hourly signal index, shared by every run over the same tape set
  // (its slices yield −1: not a simulated step)
  let sigIdx: SignalIndexRow[] = [];
  if (rankedSignals && sigTapes.length) {
    const ig = signalIndexGen(sigTapes, tapes);
    for (let r = ig.next(); ; r = ig.next()) {
      if (r.done) {
        sigIdx = r.value;
        break;
      }
      yield -4;
    }
    // a pair held only for its open positions (outside signalBasePassed) opens nothing new: it never takes one of
    // the `count` active slots (it took them from the pairs that may trade, which then never traded)
    const passed = o.signalBasePassed;
    if (passed) sigIdx = sigIdx.filter((g) => passed.has(g.pair));
  }
  const entryOptions = () => ownedWindowGrid && o.signalRank && !rankedSignals
    ? { ...o, signalActive: undefined } : o;
  let stepOpts: WalkForwardOptions = entryOptions();
  const signalActivation = rankedSignals && sigIdx.length
    ? new SignalActivationBook(sigIdx, rankedSignals, signalHistoryHours(o), o) : null;
  const recordSignalStep = (t: number, keys: Set<string>) => {
    if (lean || t < startT) return;
    const before = signalSteps.at(-1)?.keys;
    // Identical ordered sets share their preceding snapshot; replay/audit reads the last change at or before t.
    if (before?.length === keys.size) {
      let i = 0, identical = true;
      for (const key of keys) if (key !== before[i++]) { identical = false; break; }
      if (identical) return;
    }
    signalSteps.push({ t, keys: [...keys] });
  };
  // every step's record per group: ranges, signals, and the independent Historic Exit strategy.
  const stepRange = (cfg: string) =>
    isHistoricExitConfig(cfg) ? "exit" : sigCfg(cfg) ? "sig" : rangeOfId(cfg);
  const tapesByRange: Record<string, number> = {};
  for (const tp of allEngine)
    tapesByRange[stepRange(tp.id)] = (tapesByRange[stepRange(tp.id)] ?? 0) + 1;
  for (const tp of sigTapes)
    tapesByRange[stepRange(tp.id)] = (tapesByRange[stepRange(tp.id)] ?? 0) + 1;
  // the step's hedge-only signals (negative-hour hedge; outside the ranked set)
  let hedgeKeys = new Set<string>();
  // per-range selection modes (wf.rangeOpts[tag].mode); null = one selection over every engine tape, as without them
  let groups = ownedWindowGrid ? null : modeGroups(selTapes, o);
  const continuousPicks = !ownedWindowGrid && o.continuous !== false && !!o.gates.positionWindows && o.mode === "fixed" &&
    o.seatSet === "validated" && !frozenValidation && !groups;
  // the run's exit events, so a re-derivation touches only the tapes whose closes changed
  if (continuousPicks && o.evalMemo && !o.evalMemo.tracking) yield* o.evalMemo.attach(allEngine, replayStartT, stopT);
  let incremental = continuousPicks && o.seatPer === "config" && !o.ladderNeedsBase && o.evalMemo?.uniqueTapes &&
    o.evalMemo.covers(replayStartT, stopT, allEngine.length)
    ? new ContinuousPositionSelection(o.evalMemo, byId) : null;
  // Duplicate IDs do not have an unambiguous stable input position. Preserve the full selector for those catalogs.
  if (incremental) for (let i = 0; i < allEngine.length; i++) {
    if (byId.get(allEngine[i].id) !== allEngine[i] || o.evalMemo!.indexOf(allEngine[i]) !== i) {
      incremental = null; break;
    }
    if ((i + 1) % 2048 === 0) yield -1;
  }
  for (let t = replayStartT; t < stopT; t += stepH * H) {
    if (warmup && t === startT) {
      // Warmup earns modeled stage history but cannot appear as a target-period order or skip.
      for (const row of [skips, skipsBySide, skipsByRange, skipPf]) for (const k of Object.keys(row)) delete row[k];
      sigFunnel.candidates = sigFunnel.inactive = sigFunnel.inactiveBySide["1"] = sigFunnel.inactiveBySide["-1"] = 0;
      invertMissing = 0;
      hourNet.clear();
      exitHourNet.clear();
      everValidated.clear();
      if (frozenValidation && validatedIds) for (const id of validatedIds) everValidated.add(id);
    }
    // A short/losing run-start window is not a permanent rejection. Re-evaluate the same Base-qualified
    // built cohort on each new decision clock, using only its own already settled history. Explicit caller
    // snapshots remain frozen; previously admitted losses and held protection stay in their original books.
    if (!ownedWindowGrid && t > replayStartT && o.seatSet === "validated" && !frozenValidation) {
      validationRecord = newValidationRecord();
      validatedIds = yield* validatedSetGen(allEngine, t, o, validationRecord);
      for (const id of validatedIds) everValidated.add(id);
      o = { ...o, validated: validatedIds };
      selTapes = validatedTapes(allEngine, validatedIds, o);
      groups = modeGroups(selTapes, o);
    }
    stepOpts = entryOptions();
    // every order closed before the step counts for this step's decisions (hedge hours, coordination state)
    yield* settle(t);
    if (rankedSignals && sigTapes.length) {
      const act = signalActivation ? yield* signalActivation.at(t)
        : yield* activeSignalsAtGen(sigIdx, t, rankedSignals, signalHistoryHours(o), o);
      hedgeKeys = new Set();
      if (o.coord?.enabled && o.coord.hedge) {
        const neg = new Set<number>();
        for (const [h, v] of hourNet) if (v < 0 && h < Math.floor(t / H)) neg.add(h);
        for (const k of yield* hedgeSignalsAtGen(sigIdx, t, neg, signalHistoryHours(o), {
          minN: o.coord.hedgeMinN ?? HEDGE_DEFAULTS.minN,
          minPf: o.coord.hedgeMinPf ?? HEDGE_DEFAULTS.minPf,
        }, o))
          if (!act.has(k)) hedgeKeys.add(k);
      }
      const all = hedgeKeys.size ? new Set([...act, ...hedgeKeys]) : act;
      stepOpts = { ...o, signalActive: all };
      recordSignalStep(t, all);
      yield -5; // (a slice: the ranking and the step's executions are separate pieces of work)
    }
    // fixed mode in slices (the selection scores every tape); per-range modes: each mode on its own ranges' tapes
    const sel = ownedWindowGrid ? { picks: [], eligible: 0 } : groups
      ? yield* selectGroupsGen(groups, t, o, held)
      : o.mode === "fixed"
        ? yield* selectFixedRuntimeGen(selTapes, t, o)
        : null;
    const { picks: initialPicks, eligible } = withProbe(
      ownedWindowGrid || groups
        ? sel!
        : o.mode === "durable"
          ? selectDurable(selTapes, t, o, held)
          : o.mode === "fixed"
            ? sel!
            : selectAt(selTapes, t, o),
      selTapes,
      t,
      o,
    );
    let picks = initialPicks;
    // Strategy Base reports Signals from the same own-context history/Last-N
    // evaluator as activation and entry, never from a pooled representative.
    const signalChecks: ValidationCheck[] = [];
    const validationSummary = validationRecord?.summary ?? sel?.validationSummary ?? (o.recordValidation === "summary"
      ? { evaluated: 0, passed: 0, closes: 0, gp: 0, gl: 0, failures: {}, setPf: emptyValidatedSetPf() } as ValidationSummary : null);
    if (!ownedWindowGrid && o.recordValidation) {
      let checked = 0;
      if (sigTapes.length && o.evalMemo) yield* o.evalMemo.advanceGen(t);
      for (const tp of sigTapes) {
        const ev = configEvalSummary(tp, t, o);
        if (o.recordValidation === true)
          signalChecks.push([tp.id, ev.ok ? 1 : 0, ev.n, ev.pf, (ev.gp ?? 0) / 100, (ev.gl ?? 0) / 100]);
        summarizeValidation(validationSummary, ev, ev.n, (ev.gp ?? 0) / 100, (ev.gl ?? 0) / 100);
        if (++checked % 8 === 0) yield -6;
      }
    }
    const stepPicks = picks;
    const gridActive = new Set<string>(); // the step's record keeps the picks the step started with
    held = new Set(picks.map((p) => p.id));
    let taken = 0;
    let skipped = 0;
    let net = 0;
    const byRange: NonNullable<StepLog["byRange"]> = {};
    const rangeRow = (k: string) =>
      (byRange[k] ??= { tapes: tapesByRange[k] ?? 0, validated: 0, candidates: 0, taken: 0 });
    for (const k of Object.keys(tapesByRange)) rangeRow(k);
    for (const p of picks) rangeRow(stepRange(p.id)).validated++;
    if (rankedSignals && sigTapes.length) {
      let signals = 0, exits = 0;
      for (const key of stepOpts.signalActive ?? []) {
        if (key.split("|", 6)[4] === "exit") exits++;
        else signals++;
      }
      rangeRow("sig").validated = signals;
      if (exits) rangeRow("exit").validated += exits;
    }
    const stepEnd = Math.min(stopT, t + stepH * H);
    let engineRank = yield* selectionRankGen(picks);
    const selectedEntries = new Set<string>();
    // The Base-qualified processed cohort is fixed for this replay. Check it alongside the current seats
    // instead of copying its entire set into a new union on every intra-hour selection refresh.
    const scheduledEntries: Pick<ReadonlySet<string>, "has"> = processedEntries.size
      ? { has: (id) => processedEntries.has(id) || selectedEntries.has(id) || oppositeOnly.has(id) } : selectedEntries;
    const seat = function* (ps: readonly Selection[]): Generator<number, void> {
      selectedEntries.clear();
      let indexed = 0;
      for (const p of ps) {
        const tid = o.invertSeats ? mirrorId(p.id) : p.id;
        if (tid && byId.has(tid)) selectedEntries.add(tid);
        else invertMissing++;
        if (++indexed % 1024 === 0) yield -14;
      }
    };
    if (ownedWindowGrid) {
      for (const id of o.validated ?? []) selectedEntries.add(id);
    } else yield* seat(picks);
    if (incremental && validatedIds) yield* incremental.reset(validatedIds, t, stepOpts);
    // Reporting/selection cadence does not determine candle precision or candidate memory. Process one minute
    // at a time, with the same stable entry ordering, and release the completed batch before assembling the next.
    // Continuous evaluation: the picks are re-derived every decisionMin minutes from the closes settled so far (the memo makes
    // a re-derivation cost only the tapes whose closes changed). Entries were always judged at their own time.
    const decisionMs = Math.max(60_000, Math.round((o.decisionMin ?? 1) * 60_000));
    const batchMs = ownedWindowGrid || sigTapes.length ? 60_000 : continuousPicks ? Math.min(decisionMs, stepH * H) : stepH * H;
    let nextPickAt = t + decisionMs;
    for (let batchT = t; batchT < stepEnd; batchT += batchMs) {
      yield simulationClock((batchT - replayStartT) / 60_000); // includes modeled warmup work
      if (batchT !== t && signalActivation) {
        const act = yield* signalActivation.at(batchT);
        const all = hedgeKeys.size ? new Set([...act, ...hedgeKeys]) : act;
        stepOpts = { ...o, signalActive: all };
        recordSignalStep(batchT, all);
      }
      if (continuousPicks && batchT > t && batchT >= nextPickAt) {
        nextPickAt = batchT + decisionMs;
        // only when a close has settled since the last derivation (the memo knows which tapes: no column is opened to ask)
        yield* o.evalMemo!.advanceGen(batchT);
        if (o.evalMemo!.dirty.size > 0) {
          const fresh = incremental ? yield* incremental.refresh(batchT, stepOpts)
            : yield* selectPositionsGen(allEngine, batchT,
              { ...stepOpts, seatSet: "pool", validated: undefined, recordValidation: undefined });
          picks = fresh.picks;
          engineRank = yield* selectionRankGen(picks);
          yield* seat(picks);
        }
      }
      const prio = bestFirst(picks, stepOpts, engineRank);
      const batchEnd = Math.min(stepEnd, batchT + batchMs);
      // Hourly: an unselected history may advance to the end of the step (its selection is frozen for the hour). Continuous:
      // the picks are re-derived inside the hour, so no entry past this batch may be skipped.
      const cands = yield* scheduledEngineEntriesGen(engineEntries, batchEnd, scheduledEntries, stopT,
        continuousPicks ? batchEnd : stepEnd);
      let mergedSignalRows = 0, mergedSignalCursors = 0;
      while (signalEntries.peekT() < batchEnd) {
        const cursor = signalEntries.pop()!;
        const { tp, order } = cursor;
        const active: Array<boolean | undefined> = [];
        const take = (sym: string, side: number, slot: number) => {
          sigFunnel.candidates++;
          const yes = (active[slot] ??= !stepOpts.signalActive ||
            signalActiveHas(stepOpts.signalActive, tp.bot, tp.ind, sym, side, tp.kind, tp.id));
          if (!yes) inactiveSig(side);
          return yes;
        };
        while (cursor.nextT < batchEnd) {
          const i = order[cursor.next++];
          cursor.nextT = cursor.next < order.length ? tp.entryT[order[cursor.next]] : Infinity;
          if (++mergedSignalRows % 256 === 0) yield -7;
          if (take(tp.syms[tp.symI[i]], tp.side[i], tp.symI[i] * 2 + (tp.side[i] > 0 ? 1 : 0)))
            cands.push({ tr: tradeAt(tp, i), tp });
        }
        let openView: readonly OpenPosition[] | undefined;
        while (cursor.nextOpen < cursor.openOrder.length) {
          const i = cursor.openOrder[cursor.nextOpen];
          if (cursor.openTimes[i] >= batchEnd) break;
          cursor.nextOpen++;
          const op = packedOpenAt(cursor, i) ?? (openView ??= tapeOpenView(tp))[i];
          if (take(op.sym, op.side, tp.syms.indexOf(op.sym) * 2 + (op.side > 0 ? 1 : 0)))
            cands.push({ tr: markedOpenTrade(tp, op, stopT), tp });
          if (++mergedSignalRows % 256 === 0) yield -7;
        }
        const nextT = nextSignalEntryT(cursor);
        if (Number.isFinite(nextT)) signalEntries.push(nextT, cursor);
        if (++mergedSignalCursors % 8 === 0) yield -7;
      }
      // best first: at the same entry time the better candidate takes a capped slot first
      yield* stableSortGen(
        cands,
        (a, b) =>
          a.tr.entryT - b.tr.entryT ||
          prio(a.tp, a.tr.sym, a.tr.side) - prio(b.tp, b.tr.sym, b.tr.side) ||
          a.tr.cfg.localeCompare(b.tr.cfg),
      );
      yield -8;
      let ci = 0;
      const pricedByOnset = processed instanceof ProcessedWindowGridReplay && processed.usesOppositeSource
        ? new Map(cands.flatMap(item => {
            const mate = mirrorId(item.tp.id);
            return mate && byId.has(mate) && (oppositeOnly.has(item.tp.id) || processedBaseTapeEligible(item.tp, o))
              ? [[JSON.stringify([item.tp.id, item.tr.sym, item.tr.side, item.tr.entryT]), item] as const] : [];
          })) : null;
      for (const { tr } of cands) rangeRow(stepRange(tr.cfg)).candidates++;
      for (const { tr, tp } of cands) {
        // Entry gates can touch several relation / acceptance books per candidate. A 300-order batch
        // produced 800 ms main-thread slices on the 12-symbol replay, so hand control back in smaller batches.
        if (++ci % 32 === 0) yield -9;
        if (tr.entryT !== entryKeyTime) {
          executedKeys.clear(); crowd.clear(); warmupCrowd.clear(); entryKeyTime = tr.entryT;
        }
        const minute = Math.floor(tr.entryT / 60_000);
        if (minute !== pairEventMinute) { pairEvents.clear(); pairEventMinute = minute; }
        yield* settle(tr.entryT);
        // Keep the full candidate feed for guards/confirmation; accepted-order Block reads only the later marker.
        const fk = `${tr.cfg}|${tr.sym}|${tr.side}|${tr.entryT}`;
        const isOppositeOnly = oppositeOnly.has(tp.id);
        let fx = seen.get(fk);
        if (!fx) {
          const fe = blockEntryOf(tr, "candidate-unit");
          fx = { exitT: tr.exitT, ...fe, ...(tr.markedOpen ? { open: true } : {}) };
          // the auto window scores the windows on their levels now, at the entry (paper and the audit replay the stamps)
          // Accepted-only books can stamp after admission, avoiding per-candidate masks for rejected orders.
          seen.set(fk, fx);
          if (!isOppositeOnly) {
            if (!book?.acceptedOnly || book.processedOnly) book?.stampEntry(fx);
            vopen.push(fx.exitT, fx);
            if (!sigCfg(tr.cfg) && !isHistoricExitConfig(tr.cfg, tr.kind)) engineOpen.add(tr.sym, tr.side, 1);
          }
        }
        // signal skips are named apart from the engine's ("sig:why"): the same reason means different gates
        const skipName = (why: string) => (sigCfg(tr.cfg) ? `sig:${why}` : why);
        // an evaluation family's run: another family's candidate was processed above (it confirms signals and feeds the
        // Block sources, as on the desk) but never executes or takes a capped slot
        if (families && !families.has(botFamilyOf(tr.cfg))) {
          skipped++;
          skip(skipName("family"), tr.side, tr.cfg);
          skipR(skipName("family"), tr.r);
          continue;
        }
        // the same order twice: two indications computing the same signal (e.g. an EMA cross under two names) give
        // identical trades at the same protect — executed once, or the duplicate doubles the position
        const dk = processed ? fk : dupKey(tr);
        if (executedKeys.has(dk)) {
          skipped++;
          skip(skipName("duplicate"), tr.side, tr.cfg);
          skipR(skipName("duplicate"), tr.r);
          continue;
        }
        const hourKey = Math.floor(tr.entryT / H);
        let why = "";
        // engine orders and signal orders are capped each on their own (same class only)
        const cls = sigCfg(tr.cfg);
        const isExit = isHistoricExitConfig(tr.cfg, tr.kind);
        const capScope = orderCapScope(tr.cfg);
        const ownHours = isExit ? (exitHourNet.get(tr.cfg) ?? new Map<number, number>()) : hourNet;
        const ownS2 = s2For(tr.cfg, tr.kind);
        const caps = capsOf(o, cls);
        // A predecessor is only a modeled sample; it cannot reserve or conflict with an Active slot.
        const baseCheck = processed?.checksBase && !isOppositeOnly ? processedBaseCheck(tp, o, tr.sym, tr.side, tr.entryT) : undefined;
        const mate = pricedByOnset && mirrorId(tp.id);
        const parent = mate ? pricedByOnset!.get(JSON.stringify([mate, tr.sym, -tr.side, tr.entryT])) : undefined;
        const counterpart: OppositeProcessedSource | undefined = parent && {
          tp: parent.tp, symbol: tr.sym, side: parent.tr.side, minPf: processedFloor(parent.tp),
          base: !oppositeOnly.has(parent.tp.id) ? processedBaseCheck(parent.tp, o, tr.sym, parent.tr.side, tr.entryT) : undefined,
        };
        const preview = processed instanceof ProcessedWindowGridReplay
          ? processed.preview(tp, tr.sym, tr.side, tr.entryT, processedFloor(tp), baseCheck, counterpart)
          : processed?.preview(tp, tr.sym, tr.side, tr.entryT, processedFloor(tp), baseCheck);
        if (processed && !preview) {
          skipped++;
          skip(skipName("processed:base:failed"), tr.side, tr.cfg);
          skipR(skipName("processed:base:failed"), tr.r);
          continue;
        }
        const warmup = !!preview && preview.stage !== "active";
        const independentPortfolio = preview?.exec !== undefined;
        const usePortfolioCaps = !independentPortfolio || !warmup;
        const historical = tr.entryT < startT;
        let admissionCounts = warmup ? warmupCounts : historical ? historicalActiveCounts : counts;
        const admissionCrowd = warmup ? warmupCrowd : crowd;
        const gateOn = cls && !isExit && o.signalSourceGate?.enabled;
        // hedge-only signal: trades while the book is losing (this or the previous hour), without confirmation
        const hedging =
          cls && !isExit &&
          hedgeKeys.size > 0 &&
          hedgeKeys.has(sigActiveKey(tp.bot, tp.ind, tr.sym, tr.side, tp.kind, tp.id));
        const bookLosing =
          (!o.coord?.hedgePrevOnly && (hourNet.get(hourKey) ?? 0) < 0) ||
          (hourNet.get(hourKey - 1) ?? 0) < 0;
        const coordRaw = coordBlock(o.coord, tr, ownHours, open.items, engineOpen,
          processed ? (warmup ? (independentPortfolio ? x => x.side === tr.side && warmupPosition(x) : warmupPosition) : historical
            ? (position: Trade) => historicalActive.has(position) : activePosition) : undefined);
        const coordination = hedging
          ? bookLosing ? (coordRaw === "confirm" ? null : coordRaw) : "hedgeIdle"
          : coordRaw;
        const exposureConflict = coordination === "conflict" && independentPortfolio && !warmup;
        const coordWhy = (exposureConflict ? null : coordination) ??
          ownS2?.blocked(tr.sym, tr.side) ??
          (gateOn &&
          sourceUnstable(
            srcClosed.get(signalSourceOf(tr.cfg.split("|")[1])),
            tr.entryT,
            o.gates.positionWindows ? {...o.signalSourceGate!,lastN:o.signalSourceGate!.lastN??o.gates.positionWindows.main} : o.signalSourceGate!,
          )
            ? "sourceUnstable"
            : null);
        const pairEvent = o.onePerPairEvent
          ? pairEventKey(tr.cfg, tr.sym, tr.side, tr.kind, tr.entryT, o.pairEventAxisOwn !== false) : null;
        let portfolioLimit = "";
        if (coordWhy) why = coordWhy;
        else if (admissionCounts.dupe(tr.sym, tr.cfg, tr.side)) why = "dupe";
        else if (exposureConflict) portfolioLimit = "conflict";
        else if (usePortfolioCaps) {
          if (admissionCounts.perSymbol(tr.sym, cls, capScope) >= caps.perSymbol) portfolioLimit = "perSymbol";
          else if (admissionCounts.open(cls, capScope) >= caps.maxOpen) portfolioLimit = "maxOpen";
          else if (admissionCounts.perSide(tr.side, cls, capScope) >= caps.perSide) portfolioLimit = "perSide";
          else if (admissionCounts.positionsFull(tr.sym, tr.side, cls, cls ? o.signalMaxPositions : o.maxPositions, capScope))
            portfolioLimit = "maxPositions";
          else if (o.entryCrowd &&
            (admissionCrowd.get(crowdKey(tr.cfg, tr.sym, tr.side, tr.entryT)) ?? 0) >= crowdCapOf(o, tr.cfg))
            portfolioLimit = "crowd";
          else if (pairEvent !== null && pairEvents.has(pairEvent) && (!processed || !warmup))
            portfolioLimit = "pairEvent";
        }
        // The account hour guard and shared slots apply to final exposure. Each qualified Real order
        // still has its own modeled outcome when the portfolio cannot mirror it into Exec.
        if (usePortfolioCaps && o.guardPct > 0 && (ownHours.get(hourKey) ?? 0) <= -o.guardPct) {
          if (independentPortfolio && !why) portfolioLimit = "hourGuard";
          else why = "hourGuard";
        }
        const deferred = !!portfolioLimit && independentPortfolio && preview?.stage === "active" &&
          !warmupCounts.dupe(tr.sym, tr.cfg, tr.side);
        if (deferred) admissionCounts = warmupCounts;
        else if (portfolioLimit) why = portfolioLimit;
        const vf = (indicationVolumeFactors.get(tp.id) ?? 1) * (relationalFactor ? relationalFactor({
          indicationType: kindOfInd(tp.ind), indication: laneOf(tp.ind).base, strategy: tp.kind,
          range: tp.kind === "exit" ? "exit" : isSignalInd(tp.ind) ? "sig" : tp.protect.tag ?? "wide", symbol: tr.sym,
        }) : 1);
        const hedgeVol = hedging ? (o.coord?.hedgeVolumeFactor ?? 1) : 1;
        const rangeVol = rangeVolumeFactorFor(tp, o);
        const baseForBlock = (_blockVolume: number) => 1;
        const dec = why
          ? null
          : execDecision(tp, tr.entryT, stepOpts, {
              processedBase: !!processed,
              ...(isOppositeOnly && parent && { processedParentPair: `${parent.tp.bot}|${parent.tp.ind}` }),
              book,
              guard,
              direction,
              relate: relateBook,
              relateBase: baseForBlock,
              sym: tr.sym,
              side: tr.side,
            });
        // The explicit processed-orders book has an independent gate-qualified unit predecessor.
        // It can keep learning with Ordinary/Block Active off. No raw rejected, cap-conflicting,
        // open-mark or future result qualifies it; actual accepted-orders history remains unchanged.
        // A configured persistent stage chain still requires its own Active admissions, below.
        if (!why && !processed && book?.processedOnly && !fx.blockProcessed &&
            !blockPredecessors.dupe(tr.sym, tr.cfg, tr.side) &&
            blockPredecessors.perSymbol(tr.sym, cls, capScope) < caps.perSymbol &&
            blockPredecessors.open(cls, capScope) < caps.maxOpen &&
            blockPredecessors.perSide(tr.side, cls, capScope) < caps.perSide &&
            !blockPredecessors.positionsFull(tr.sym, tr.side, cls, cls ? o.signalMaxPositions : o.maxPositions, capScope)) {
          const predecessor = execDecision(tp, tr.entryT,
            {...stepOpts, toggles:{...stepOpts.toggles,normal:true,block:false,blockActive:false}}, {
              book:null,guard,direction,relate:relateBook,relateBase:baseForBlock,sym:tr.sym,side:tr.side,
            });
          if (predecessor.ok) {
            fx.blockProcessed = true;
            blockPredecessors.add(tr, 1);
          }
        }
        if (dec && !dec.ok) why = dec.why;
        if (why || !dec || !dec.ok) {
          if (dec && !dec.ok && dec.why === "relateActive" && o.relate?.enabled) {
            const shadowBase = dec.relateBase ?? baseForBlock(dec.relateBaseVol ?? 1);
            const shadowCap = relateExternalStackCap(o.relate.maxStack, tp.kind, tp.protect);
            fx.relateShadow = true;
            fx.relateMeasured = true;
            fx.relateBase = shadowBase;
            fx.relateParts = capRelateParts(dec.relateParts ?? {}, Math.min(1, shadowCap), shadowCap, 1);
          }
          skipped++;
          skip(skipName(why), tr.side, tr.cfg);
          skipR(skipName(why), tr.r);
          continue;
        }
        // Only actual Base-processed admissions enter this book. Portfolio-deferred orders settle only
        // in their modeled predecessor Sets. Coordination or strategy rejects cannot provide a close.
        const stage = processed instanceof ProcessedWindowGridReplay
          ? processed.enter(tp, tr.sym, tr.side, tr.entryT, processedFloor(tp), baseCheck, counterpart, !deferred)
          : processed?.enter(tp, tr.sym, tr.side, tr.entryT, processedFloor(tp), baseCheck, !deferred);
        if (stage && (stage.stage !== (deferred ? "real" : preview?.stage) || !!stage.execDeferred !== deferred))
          throw new Error("processed admission changed during entry");
        const active = !stage || stage.stage === "active";
        // Accepted Real feedback belongs to Real, even when its distinct Exec gate needs more evidence.
        fx.accepted = active || stage?.stage === "real";
        if (isOppositeOnly) {
          if (!book?.acceptedOnly || book.processedOnly) book?.stampEntry(fx);
          vopen.push(fx.exitT, fx);
          engineOpen.add(tr.sym, tr.side, 1);
        }
        if (fx.accepted && book?.acceptedOnly && !book.processedOnly) book.stampEntry(fx);
        delete fx.relateShadow;
        if (dec.blockAttribution) fx.blockAttribution = dec.blockAttribution;
        // the sources that raised it pause once it closes positive (the feed entry carries them into the book)
        if (dec.vol > 1 && dec.src?.length) fx.bsrc = dec.src;
        // Stable-02 relation volume on top of the Block volume (the stack stays within the Block maximum)
        const stackCap = blockStackCap(o.block);
        const cv = ownS2 ? Math.min(ownS2.volumeFor(tr.entryT, { cfg: tr.cfg, ind: tp.ind, sym: tr.sym, side: tr.side, kind: tp.kind, type: tp.kind }), Math.max(1, stackCap / dec.vol)) : 1;
        const baseExecutionMult = dec.vol * cv * vf * hedgeVol * rangeVol;
        const relationCap = relateExternalStackCap(o.relate?.maxStack ?? MAX_EXTERNAL_STACK, tp.kind, tp.protect);
        const combined = combineRelateStack(baseExecutionMult, o.relate?.enabled ? (dec.relateVol ?? 1) : 1, relationCap);
        const relateVol = o.relate?.enabled ? combined.relation : 1;
        const relateParts = o.relate?.enabled
          ? capRelateParts(dec.relateParts ?? {}, relateVol, relationCap, 1)
          : {};
        if (o.relate?.enabled) {
          fx.relateMeasured = true;
          fx.relateBase = 1;
          if (Object.keys(relateParts).length) fx.relateParts = relateParts;
        }
        const executionMult = combined.volume;
        const x: Trade = {
          ...tr,
          r: tr.r * executionMult,
          unitR: tr.r,
          vol: (tr.vol ?? 1) * executionMult,
          mult: executionMult,
          blockVol: dec.vol,
          ...(cv !== 1 ? { coordVol: cv } : {}),
          ...(relateVol !== 1 ? { relateVol } : {}),
          ...(o.relate?.enabled ? { relateMeasured: true } : {}),
          ...(o.relate?.enabled ? { relateBase: 1 } : {}),
          ...(Object.keys(relateParts).length ? { relateParts } : {}),
          ...(vf !== 1 ? { volFactor: vf } : {}),
          ...(hedgeVol !== 1 ? { hedgeVol } : {}),
          ...(rangeVol !== 1 ? { rangeVol } : {}),
          ...(hedging ? { hedge: true } : {}),
          level: tp.kind.startsWith("dca") || tp.kind === "axis" ? tr.level : dec.level,
          ...(dec.legs ? { legs: dec.legs } : {}),
          ...(dec.blockAttribution ? { blockAttribution: dec.blockAttribution } : {}),
          ...(dec.blockLevels
            ? {
                blockLevels: dec.blockLevels,
                blockEffectiveLevels: dec.blockEffectiveLevels,
                blockSampleCounts: dec.blockSampleCounts,
              }
            : {}),
        };
        executedKeys.add(dk);
        // Warm-up decisions own a modeled order, but they do not spend a funded pair-event slot.
        if (active && pairEvent !== null) pairEvents.add(pairEvent);
        if (o.entryCrowd && (!independentPortfolio || active)) {
          const ck = crowdKey(tr.cfg, tr.sym, tr.side, tr.entryT);
          admissionCrowd.set(ck, (admissionCrowd.get(ck) ?? 0) + 1);
        }
        if (stage) processedOpen.set(x, stage);
        if (active && historical) historicalActive.add(x);
        if (active && !historical) {
          if (ownedWindowGrid && !gridActive.has(tp.id)) {
            gridActive.add(tp.id);
            everValidated.add(tp.id);
            rangeRow(stepRange(tp.id)).validated++;
          }
          if (x.markedOpen) openAtEnd.push(x);
          else trades.push(x);
          taken++;
          rangeRow(stepRange(x.cfg)).taken++;
          net += x.r * 100;
        } else if (!active) {
          // Keep processing the predecessor after a failed/short window so it can causally recover.
          const reason = deferred ? `processed:portfolio:${portfolioLimit}`
            : stage!.stage === "postBase" ? `processed:validation:${stage!.validation.state}`
            : stage!.stage === "real" ? `processed:exec:${stage!.exec!.state}` : `processed:real:${stage!.real!.state}`;
          skipped++;
          skip(skipName(reason), tr.side, tr.cfg);
          skipR(skipName(reason), tr.r);
        }
        open.push(x.exitT, x);
        admissionCounts.add(x, 1);
      }
      // Every candidate belongs to exactly one disjoint entry window. Keep its feed object in feed/vopen, but its
      // long deduplication key and materialized Trade are no longer needed after that window has been processed.
      seen.clear();
      cands.length = 0;
      yield -17;
    }
    if (t >= startT) steps.push({
      t,
      main: ownedWindowGrid ? gridActive.size : eligible,
      real: ownedWindowGrid ? [...gridActive] : stepPicks.map((p) => p.id),
      taken,
      skipped,
      net,
      byRange,
      ...(o.recordValidation === true ? { checks: [...(validationRecord?.checks ?? sel?.checks ?? []), ...signalChecks] } : {}),
      ...(!ownedWindowGrid && validationSummary ? { validationSummary } : {}),
    });
    yield t;
  }

  yield* stableSortGen(trades, (a, b) => a.exitT - b.exitT);
  yield -10; // (summary slices, not simulated steps)
  const allOutcomes = openAtEnd.length ? [...trades, ...openAtEnd] : trades;
  const stats = unitStatsOf(allOutcomes, stopT);
  const sizedStats = statsOf(allOutcomes, stopT);
  yield -10;
  const perHour = new Map<number, { gp: number; gl: number; net: number; n: number }>();
  for (const x of trades) {
    const k = settledHourT(x.exitT);
    const e = perHour.get(k) ?? { gp: 0, gl: 0, net: 0, n: 0 };
    const r = unitReturn(x);
    if (r > 0) e.gp += r;
    else e.gl -= r;
    e.net += r * 100;
    e.n++;
    perHour.set(k, e);
  }
  const hourly = [...perHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, e]) => ({
      t,
      net: e.net,
      n: e.n,
      pf: profitFactor(e.gp, e.gl),
    }));
  yield -10;
  const blocks = runBlocks(trades, startT, stopT);
  yield -10;
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
      const s = unitStatsOf(xs);
      return { id, n: s.n, net: s.net, pf: s.pf };
    })
    .sort((a, b) => b.net - a.net);
  yield -10;
  const byKind: WalkForwardResult["byKind"] = {};
  for (const [k, xs] of group((t) => t.kind ?? "normal")) {
    const s = unitStatsOf(xs);
    byKind[k] = { n: s.n, net: s.net, pf: s.pf };
  }
  yield -10;
  const sideStat = (sd: number) => {
    const s = unitStatsOf(trades.filter((x) => x.side === sd));
    return { n: s.n, net: s.net, pf: s.pf };
  };
  const bySide = { long: sideStat(1), short: sideStat(-1) };
  yield -10;
  const stable = runStable(stats, blocks, o.gates.minPf);
  const { protects: _p, dcaProtects: _d, validated: _v, evalMemo: _m, ...rest } = o;
  // the end-of-run state paper / live continue from: every order closed by the end counts
  yield -11;
  yield* settle(stopT);
  // candidates still open at the end close the feed, in exit order (they never reached the books)
  let drained = 0;
  while (vopen.size) {
    const open = vopen.pop()!;
    if (!lean && (!warmup || (open.entryT !== undefined && open.entryT >= startT))) feed.push(open);
    if (++drained % 32 === 0) yield -12;
  }
  const hasHedgeEnd = !!(o.coord?.enabled && o.coord.hedge && sigIdx.length);
  const hedgeLossHours = new Set(
    [...hourNet].filter(([h, v]) => v < 0 && h < Math.floor(stopT / H)).map(([h]) => h),
  );
  const hedgeEndKeys = hasHedgeEnd
    ? [
        ...(yield* hedgeSignalsAtGen(sigIdx, stopT, hedgeLossHours, signalHistoryHours(o), {
          minN: o.coord?.hedgeMinN ?? HEDGE_DEFAULTS.minN,
          minPf: o.coord?.hedgeMinPf ?? HEDGE_DEFAULTS.minPf,
        }, o)),
      ]
    : undefined;
  // the end-of-run activation report: why each signal unit is or is not in signalActiveEnd
  const activationRep: SignalUnitReport[] = [];
  const signalActiveEnd = rankedSignals
    ? sigTapes.length
      ? [...(yield* activeSignalsAtGen(sigIdx, stopT, rankedSignals, signalHistoryHours(o), o, activationRep))]
      : []
    : undefined;
  const processedSummaryOnly = o.processedStages?.reportDetail === "summary";
  const processedResult = processed ? yield* processed.reportGen(stopT, function* () {
      for (const tp of [...allEngine, ...sigTapes]) {
        if (tp.heldOnly || tp.carried) continue;
        if (isSignalInd(tp.ind) && tp.kind !== "exit") {
          if (o.signalBasePassed && !o.signalBasePassed.has(`${tp.bot}|${tp.ind}`)) continue;
        } else if (!baseAllowsTape(tp, o)) continue;
        const minPf = processedFloor(tp);
        for (const symbol of new Set(tp.syms)) for (const side of [1, -1] as const)
          yield { tp, symbol, side, minPf,
            ...(o.processedStages?.directExec && { base: processedBaseCheck(tp, o, symbol, side, stopT) }) };
      }
    }) : undefined;
  return {
    startT,
    ...(warmup ? { processedWarmup: { fromT: replayStartT, untilT: startT, baseCutT: warmup.baseCutT } } : {}),
    ...(processedResult ? processedSummaryOnly ? { processedStageSummary: processedResult }
      : { processedStages: processedResult as ProcessedReplayReport } : {}),
    ...(validatedIds || ownedWindowGrid ? { validated: [...everValidated] } : {}),
    endT: stopT,
    opts: rest,
    trades,
    openAtEnd,
    stats,
    sizedStats,
    hourly,
    blocks,
    steps,
    byConfig,
    byKind,
    bySide,
    skips,
    skipsByRange,
    skipsBySide,
    skipPf,
    ...(o.invertSeats ? { invertMissing } : {}),
    ...(sigTapes.length ? { signalFunnel: sigFunnel } : {}),
    stable,
    feed,
    ...(s2 ? { s2: s2.snapshot(stopT) } : {}),
    ...(exitS2.size ? { exitS2: Object.fromEntries([...exitS2].map(([cfg, own]) => [cfg, own.snapshot(stopT)])) } : {}),
    ...(relateBook ? { relate: relateBook.summary() } : {}),
    // block.auto: every relation × count's record at the end of the run (results, PF, verdict)
    ...(book?.auto ? { blockAuto: book.auto.table() } : {}),
    ...(hasHedgeEnd ? { hedgeEnd: hedgeEndKeys ?? [] } : {}),
    ...(o.signalRank
      ? { signalSteps, signalActiveEnd: signalActiveEnd ?? [], signalActivationEnd: activationEnd(activationRep) }
      : {}),
  };
}
