import { publishMinimalPlus } from "./minimal-plus-publication.ts";
import { isHistoricExitConfig } from "../exit-scope.ts";
import { lstatSync } from "node:fs";
import { mergeWorkerTapesGen } from "./tape-merge.ts";
import { strategyCoverageGen, type StrategyCoverage } from "./strategy-coverage.ts";
import { validationProgressOf, type ValidationProgress } from "../validation-progress.ts";
// Core v2 continuous runtime. One per server process (globalThis singleton).
//
// Loop (every cycleMs):
//   1. market   backfill once, then pull newly CLOSED bars for every symbol (BingX public; real data only — an outage is retried with backoff)
//   2. compute  when a new bar closed: S1–S5 pipeline, walk-forward tapes, 48h simulated run with 20h pre-calc
//   3. paper    the current hour's selection trades on paper; closes land in paper_trades
//   4. live     optional gated adapter mirrors fresh paper entries (off by default)
// Heavy work is time-sliced (yields every ~12 ms) so the web server stays responsive.
import {
  DEFAULT_PROTECT,
  DEFAULT_SETTINGS,
  FORMER_FOCUS_13OCT,
  PREVIOUS_DEFAULT_FOCUS_17OCT,
  PREVIOUS_DEFAULT_FOCUS_20OCT,
  PREVIOUS_INVERSE_FOCUS_20OCT,
  PREVIOUS_MICRO_FOCUS_21OCT,
  GENERAL_RANGE,
  MAX_BACKTEST_DAYS,
  MAX_EXTERNAL_STACK,
  mergeGridSettings,
  exchangePositionLimit,
  LONG_RANGE,
  MINIMAL_RANGE,
  SHORT_RANGE,
  STRATEGY_PRESETS,
  TF_CHOICES,
  type CoreSettings,
  type SettingsPatch,
} from "../config.ts";
import { checkLowRangeComplete, checkRangeReplacementsComplete, checkSettings } from "../settings-check.ts";
import { BoundedHistory, HistoryStorageError, historyOf, withHistoryMetadata, HISTORY_CACHE_BYTES, transferHistoriesGen, type HistoryTransfer } from "./history-store.server.ts";
import { boundedModelCost, MAX_MODEL_RT_COST, roundTripCostFromFees } from "../model-cost.ts";
import { evaluationHistorySettings } from "../market/history-requirements.ts";
import {
  microIndRule,
  minPfOf,
  RANGE_LABEL,
  RANGE_TAGS,
  FORMER_MICRO_TP,
  MICRO_TP,
  rangeGateOf,
  rangeOfId,
  rangeMinTfOf,
  TRAIL_CONFIGS,
  WIDE_TARGET_SL,
} from "../minimal-coord.ts";
import { microSpecs, type MicroIndRule } from "../indications/micro.ts";
import { isLowRangeInd } from "../indications/low-range.ts";
import { PRE_CONTEXT_FOCUS_21OCT } from "../indications/context-default-focus.ts";
import { isBreakRelInd } from "../indications/break-config.ts";
import { sharedFeed } from "../market/shared-feed.ts";
import { catchUp } from "./loop-budget.ts";
import { ExecutionProgress, type ExecutionProgressStats } from "./execution-progress.ts";
import {
  evalFamilyMatch,
  familiesNarrowBase,
  familyTags,
  parseEvalFamilies,
  type EvalFamily,
} from "../eval-family.ts";
import { partitionByIndication } from "./partition.ts";
import { OwnedWorker } from "./owned-worker.server.ts";
import type { RealtimeTapeGroup } from "../sim/realtime.ts";
import { appendTape } from "../sim/tape-append.ts";
import { diffPositions, diffTrades, type WrittenPos } from "./paper-rows.ts";
import type { ConnId } from "../exchange/bingx.server.ts";
import { tacticWarmupBars } from "../indications/filters.ts";
import { adjustTrades, evaluateAdjust, pausedSets, type AdjustState } from "../adjust.ts";
import { prehistStatsGen, type PrehistStats } from "../prehist.ts";
import {
  abortWorkers,
  isWorkersAbort,
  isWorkerTimeout,
  poolSize,
  retireOwnedIdleWorkers,
  runOnWorkers,
  shareBars,
  slices,
  workerActivity,
  workersAvailable,
} from "./pool.server.ts";
import {
  collectGarbage,
  fallbackCarriedTags,
  fallbackLabel,
  fallbackProtects,
  heapAndBuffersMb,
  heapPressure,
  MEM_FALLBACK_MAX,
  MEM_READ_MS,
  memHardMb,
  memInfo,
  memRetryDelayMs,
  memSoftMb,
  nextFallback,
  shouldCollect,
  type MemInfo,
  type MemLevel,
} from "./memguard.server.ts";
import {
  metricsFromStats,
  presetKey,
  presetSettings,
  qualifies,
  ALL_RESEARCH_PRESETS,
  upsertPreset,
  type Preset,
} from "../presets.ts";
import type { Bars, BlockConfig, Candle, OpenPosition, Protect, RelateAdjustmentConfig, RelateParts, Trade } from "../domain/types.ts";
import { syntheticCandles, tailBars, headBars } from "../market/bars.ts";
import {
  CandleSeries,
  barsOfSeries,
  headroomFor,
  resampleTailBars,
} from "../market/candle-series.ts";
import { startStallProbe, type StallProbe } from "./stall-probe.server.ts";
import {
  BaseConfigJobRunner,
  baseConfigJobKey,
  type BaseConfigJob,
  type BaseConfigSnapshot,
  type BaseConfigSummary,
} from "./base-config-job.server.ts";
import type { BaseConfigChunkReply } from "./pool.server.ts";
import {
  fetchHistory,
  fetchKlines,
  fetchTickers,
  forceSymbols,
  normSymbol,
  rankUniverse,
  type Ticker,
} from "../market/bingx.ts";
import { KLINES, TICKERS, noteRateLimit, rateLimitedUntil } from "../exchange/bingx.server.ts";
import { dueKlines, KLINES_CONCURRENCY, type KlinesPace } from "../market/klines-pace.ts";
import {
  allCombos,
  baseRuns,
  type Combo,
  type ComboRun,
  kindOfId,
  configId,
  isPlainKind,
  laneProtect,
  laneClosesWith,
  mainByLane,
  parseConfigId,
  passesBase,
  baseRangeCountsGen,
  baseGateSensitivityGen,
  baseRangeWhyGen,
  BASE_GATE_VARIANTS,
  meanPf,
  pooledPf,
  type BaseGateRow,
  type BaseWhyRow,
  baseSetsGates,
  setsPassTags,
  pairBuildTags,
  rangeAppliesTo,
  type BaseRangeCount,
  baseRangeProtects,
  completeBaseRangeProtects,
  laneInds,
  makeUniverse,
  seriesOf,
  forgetCombo,
  microLaneFloor,
  runCombo,
  runComboSteps,
  runPipeline,
  slim,
  type PipelineOutput,
  type PipelineProgress,
} from "../pipeline/pipeline.ts";
import { IncrementalState } from "./incremental.ts";
import {
  buildTapesBoundedGen as buildTapesGen,
  baseAllowsTape,
  configEval,
  engineContextValid,
  configDirectionEval,
  tapeRetentionHours,
  kindExecutable,
  defaultWalkForward,
  signalHistoryHours,
  signalValidationOk,
  selectAt,
  selectDurable,
  selectFixedGen,
  modeGroups,
  selectGroupsGen,
  RANGE_OPT_TAGS,
  type RangeOpts,
  type RangeOptTag,
  withProbe,
  execDecision,
  walkForwardGen,
  assertSeatSet,
  passedCellsOf,
  validatedSetGen,
  validatedTapes,
  cellAllowed,
  walkForwardSteps,
  feedBooks,
  candidateDirectionFor,
  type CandidateDirectionBook,
  signalGuardFor,
  splitSignalTapes,
  bestFirst,
  coordBlock,
  coordSettings,
  sourceUnstable,
  type CoordSettings,
  packTapesGen,
  compactTapesGen,
  tapeBytes,
  capsOf,
  sigCfg,
  orderCapScope,
  openDupKey,
  checkGridVariantBudget,
  type ConfigTape,
  type EntryFloors,
  type TapeBuildStat,
  floorsForPairs,
  advanceGuardIndicesGen,
  blockEntryOf,
  relateBookFor,
  type BlockFeedEntry,
  mergeBuildStats,
  DEFAULT_RANGE_FIT,
  protectGrid,
  type WalkForwardOptions,
  type WalkForwardResult,
  type ValidationSummary,
  lowerBound,
  tradeAt,
  selectionScoreAt,
  positionMult,
  positionVolume,
  rangeVolumeFactorFor,
  freshEntry,
  seatedForEntry,
  stepSeats,
  pendingAsOpen,
  carryGuardIndices,
  crowdCapOf,
  crowdKey,
  type ConfirmPool,
  mirrorId,
} from "../sim/walkforward.ts";
import { monitorEventLoopDelay, performance as nodePerf } from "node:perf_hooks";
import {
  ENGINE_PROOF_PF,
  SIGNAL_PROOF_EVENTS,
  SIGNAL_PROOF_PF,
  engineProven,
  signalProven,
  signalUnitOf,
  liveEntryOk,
  liveGate,
  liveGroupGates,
  liveGroupKeyOf,
  liveGroupOf,
  promotionGate,
  sideTapeOf,
  type LiveGate,
  type LiveValidationStatus,
  type LivePromotionStatus,
  type SideTapeMemo,
} from "../live-validation.ts";
import {
  exchangeAcceptIndex,
  executionRecordKey,
  liveRecords,
  liveRecordsGen,
  postBaseExecutionRecords,
  preferExchange,
  recordKeyOf,
  sideOfRow,
  type LiveRecord,
} from "../live-record.ts";
import { OWN_CLOSE_SQL } from "../relation.ts";
import { ownedPromotionRecord } from "./promotion-record.server.ts";
import { signalActiveHas, type ExchangeAccept, type SignalActivationEnd } from "../signals.ts";
import {
  isSignalCoordinationInd,
  parseSignalCoordinationId,
  signalCoordinationHistory,
  signalCoordinationRanges,
} from "../signal-coordination.ts";
import { volumeFactorForStrategy } from "../volume-factor.ts";
import { volumeRatio } from "../volume-ratio.ts";

import os from "node:os";
import { isDeepStrictEqual } from "node:util";
import { type BlockBook, type BlockSource, blockBookOf, blockStackCap } from "../sim/block.ts";
import { capRelateParts, combineRelateStack, relateExternalStackCap, type RelateBook } from "../sim/relate-volume.ts";
import { carryTrail, TickMathBook, type TickMathResult } from "./tick-math.ts";
import { enforceSignalPosition } from "../sim/trailing.ts";
import { createExitProtection } from "../sim/exit-protection.ts";
import {
  activeSignals,
  signalEvaluationPairs,
  mergeSignals,
  signalCombos,
  signalProtects,
  signalSettings,
  SignalGuard,
  guardKey,
  sigActiveKey,
  signalSeatTapesGen,
} from "../signals.ts";
import {
  emptySignalHistDiagnostics,
  heldHistProtects,
  heldCoordinationProtects,
  signalHistProtectsGen,
  signalHistValidationOf,
  type SignalHistDiagnostics,
  type SignalHistValidation,
} from "../signal-hist.ts";
import { SIGNAL_HISTORY_H, SIGNAL_VALID_LAST_N } from "../signal-policy.ts";
import {
  EXIT_HISTORY_MAX_PAIRS,
  EXIT_BOT,
  emptyExitStrategyDiagnostics,
  exitHistoryFingerprint,
  exitSignalStrategyPairs,
  exitStrategyPairs,
  qualifyExitBase,
  exitStrategyProtectsBoundedGen,
  exitStrategyProtectsGen,
  heldExitProtect,
  type ExitStrategyDiagnostics,
  type ExitStrategyValidation,
} from "../exit-strategy.ts";
import {
  DEFAULT_SIGNALS,
  PRE_EXPANDED_SIGNAL_SOURCES,
  type SignalAccept,
  type SignalSettings,
} from "../signal-config.ts";
import { PriceStream, type StreamStats } from "./stream.server.ts";
import { INDICATIONS, isSignalInd, laneOf, signalSourceOf } from "../indications/registry.ts";
import { DEFAULT_SIZING, orderKey, sizeBook, sizeBookGen, sizingSettings } from "../sizing.ts";
import { presetSeries, type PresetSeries } from "../statistics.ts";
import {
  modeledUnitReturn as unitReturn,
  modeledUnitStatsOf as unitStatsOf,
} from "../metrics/stats.ts";
import { primaryPfLabel, unitStatsReport } from "../reporting-stats.ts";
import { promoteLaneKey, validPromotedLaneProof } from "../live-promote.ts";
import { auditState, auditStateGen, type AuditInput, type AuditReport } from "../audit.ts";
import { closedPositions, openBook, openTimeline, positionOrderCounts } from "../positions.ts";
import {
  backfillLabel,
  batchesOf,
  DONE_STAGE,
  estimatedFraction,
  overallOf,
  pipelineStage,
} from "../progress.ts";
import { connDb, connPath, coreDb, type CoreDb } from "./db.server.ts";

const H = 3_600_000;
const SLICE_MS = 12;
/** rows per page of the proofs' reads (a slice each: ~5 ms) */
const PROOF_PAGE = 4000;
type SignalProofResult = ReturnType<typeof signalProven> & { n: number; minPf: number; minEvents: number };
// Both forward proofs use the same owned unit basis. An explicit legacy multiplier is recoverable;
// nominal volume, missing funding, and nonfinite multipliers never establish a unit return.
const PAPER_PROOF_UNIT_SQL = `CASE
  WHEN owned_notional_usd > 1e-9 AND owned_notional_usd <= 1.7976931348623157e308
    THEN unit_r
  WHEN owned_notional_usd IS NULL AND unit_r IS NULL AND mult > 0 AND mult <= 1.7976931348623157e308
    THEN r / mult
  ELSE NULL END AS proof_r`;
/** runs a generator to its end without yielding (the synchronous callers of a sliced step) */
function drain<R>(g: Generator<void, R>): R {
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}
/** overall mode: the pending entries (status "pending:" reasons only) are recomputed at most this often */
const PENDING_STATUS_MS = 30_000;
/**
 * The live control step runs at once when what it acts on changed — the paper book (a paper step), a stop crossed at
 * tick time, a new bar — after a trailing stop moved at most every CONTROL_TRAIL_MS, and otherwise every
 * CONTROL_IDLE_MS for the price-only effects (chase, re-anchoring). Every 100 ms tick it rebuilt every lane of a
 * 2,000-position book: ~190 MB/s of garbage and multi-second collector pauses on x02 (7 Oct allocation profile), while
 * the exchange book it acts on is re-read every live.syncMs.
 */
const CONTROL_IDLE_MS = Number(process.env.CTS_CORE_CONTROL_IDLE_MS) || 1_000;
const CONTROL_TRAIL_MS = 100;
export const EXECUTION_INTERVAL_MS = 100;
/**
 * Only validated/held configs continue in realtime. Every selected family is included by default; an explicit
 * `break` override retains the narrower rollout and `0`/`off` disables realtime entries.
 */
export type FastEntryMode = "off" | "break" | "all";
export function fastEntryMode(raw = process.env.CTS_CORE_FAST_ENTRIES): FastEntryMode {
  const x = raw?.trim().toLowerCase();
  if (x === "1" || x === "all") return "all";
  if (x === "0" || x === "off") return "off";
  if (x === "break") return "break";
  return x ? "off" : "all";
}
const FAST_ENTRY_MODE = fastEntryMode();
const FAST_ENTRIES = FAST_ENTRY_MODE !== "off";
export function fastEntryLaneDue(
  ind: string,
  barOpenT: number,
  baseTfMin: number,
  mode = FAST_ENTRY_MODE,
): boolean {
  return (
    mode !== "off" &&
    (mode === "all" || isBreakRelInd(ind)) &&
    laneClosesWith(barOpenT, baseTfMin, laneOf(ind).tf ?? baseTfMin)
  );
}
/** Replace refreshed tape identities while preserving all unrelated tapes. */
export function mergeFastTapes<T extends { id: string }>(
  current: readonly T[],
  refreshed: readonly T[],
): T[] {
  if (!refreshed.length) return current as T[];
  const byId = new Map(refreshed.map((x) => [x.id, x] as const));
  let changed = false;
  const next = current.map((x) => {
    const y = byId.get(x.id);
    if (!y) return x;
    changed = true;
    return y;
  });
  return changed ? next : (current as T[]);
}
/** Exchange candles are already filtered to closed bars; allow two seconds for final publication. */
const KLINE_FINALITY_MS = 2_000;
const FAST_BAR_MAX_DELAY_MS = 15_000;
/** A 1m Base candle after its close plus the exchange publication grace is ready to pull. */
export function realtimeBarDue(lastOpenT: number, nowT: number, tfMin: number): boolean {
  return (
    Number.isFinite(lastOpenT) &&
    Number.isFinite(nowT) &&
    tfMin > 0 &&
    lastOpenT + tfMin * 60_000 + KLINE_FINALITY_MS <= nowT
  );
}
export function fastBarFresh(
  barCloseT: number,
  nowT: number,
  maxDelayMs = FAST_BAR_MAX_DELAY_MS,
): boolean {
  return (
    Number.isFinite(barCloseT) &&
    Number.isFinite(nowT) &&
    nowT >= barCloseT &&
    nowT - barCloseT <= maxDelayMs
  );
}
/** Discovery/selection is background work, not a full rebuild at every candle. Explicit kicks still apply now. */
export function researchIntervalMs(raw = process.env.CTS_CORE_RESEARCH_MS): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 60_000 && n <= 3_600_000 ? n : 300_000;
}
/** the live step's share of one tick for advancing the Block / acceptance books over a fresh run's feed, ms */
const BOOK_CATCHUP_MS = 15;
/** the paper step feeds the Block book / signal guard this many feed entries a slice before its entries */
const BOOK_FEED_SLICE = 200;
const BACKTEST_LIMIT_MS = 15 * 60_000;
/** workers that failed are tried again after this long */
const WORKERS_RETRY_MS = 10 * 60_000;
/** paper book rows written per transaction (one slice) */
const PAPER_ROWS = 500;
/** the sides a live count runs over with live.sideGates (each side apart), and without it (the pooled record) */
export const LV_SIDES_APART: ReadonlyArray<1 | -1 | undefined> = [1, -1];
export const LV_SIDES_POOLED: ReadonlyArray<1 | -1 | undefined> = [undefined];
/**
 * The side a live judgement is made on: an entry's own side with live.sideGates (sideOfRow: an entry that is neither
 * +1 nor -1 has none), undefined (the pooled record of both sides, as before) without it.
 */
export const lvSideOfEntry = (bySide: boolean, s?: number): 1 | -1 | undefined =>
  bySide ? sideOfRow(s) : undefined;
export { MAX_BACKTEST_DAYS };

export type RuntimeState =
  "idle" | "booting" | "backfill" | "running" | "computing" | "error" | "stopped";

export interface PhaseTiming {
  ms: number;
  /** longest synchronous slice between yields (what can delay other requests) */
  maxSliceMs: number;
  /** the step that ran in that slice (profiling: which combo / stage blocked) */
  slowest?: string;
  /** worker phases: main-thread time spent while the workers ran (receiving their replies, the live tick, …) */
  mainMs?: number;
}

export interface PrehistoricStatus {
  /** pre-calc window before realtime (hours; the walk-forward pre-historic window) */
  hours: number;
  /** simulated run the results come from (hours) */
  simH: number;
  total: number;
  loaded: number;
  ready: number;
  /** all symbols computed and running in realtime */
  complete: boolean;
  startedAt: number;
  readyAt: number;
  /** symbol → state (queued / loading / computing / ready / skipped) */
  symbols: Record<string, { state: string; bars?: number; n?: number; pf?: number | null }>;
  stats: PrehistStats | null;
  counts: { base: number; main: number; sets: number; real: number; evals: number; armed: number };
}

export interface RuntimeStatus {
  state: RuntimeState;
  stage: string;
  /** the stage's own fraction 0..1 (monotonic within a stage) */
  progress: number;
  label: string;
  /**
   * the whole job's fraction 0..1 (backfill batch → Base → Main → Tapes → Signals → Real → Compare → Paper), never
   * moving backwards within a job; 1 once the job is done (stage Realtime)
   */
  overall?: number;
  /** when the running (or last) compute started (epoch ms; with lastComputeMs an ETA) */
  computeStartedAt?: number;
  /** when the current stage started (epoch ms); `heartbeat` is its last progress report */
  stageAt?: number;
  /** paper steps completed, and the compute (status.computes) the last one stepped on — 0 = none yet */
  paperSteps?: number;
  paperCompute?: number;
  cycles: number;
  computes: number;
  startedAt: number;
  heartbeat: number;
  lastCycleMs: number;
  cycleKind?: "idle" | "incremental" | "research";
  nextResearchAt?: number;
  lastComputeMs: number;
  lastBarT: number;
  source: "bingx" | "synthetic" | "none";
  symbols: string[];
  error: string | null;
  nextCycleAt: number;
  phases: Record<string, PhaseTiming>;
  /** memory guard: the host's available memory and this process, the compute fallback level, the last abort */
  mem?: {
    availMb: number;
    /** Host cap and cgroup estimate basis/credit, retained in replay evidence. */
    hostAvailMb?: number;
    cgroup?: MemInfo["cgroup"];
    rssMb: number;
    level: MemLevel;
    fallback: number;
    fallbackLabel: string;
    minAvailMb: number | null;
    lastAbort: string | null;
    /** computes aborted on memory pressure since the start */
    aborts?: number;
    /** computes aborted in a row at the lightest level */
    abortsInRow?: number;
    /** a compute waiting for memory after aborts at the lightest level: its next try (epoch ms) */
    retryAt?: number | null;
    /** the fallback level the last started compute ran at (0 = the full settings) */
    computeLevel?: number;
    /** where this process's memory is: V8 heap used / committed, array buffers, the rest (native), MB */
    heapMb?: number;
    heapLimitMb?: number;
    heapAvailMb?: number;
    heapTotalMb?: number;
    arrayBuffersMb?: number;
    nativeMb?: number;
    /** the in-memory database's pages, and the current tapes' columns, MB */
    dbMb?: number;
    tapeMb?: number;
    /** the highest RSS / heap / array buffers per compute stage, over the current (or last) compute, MB */
    byPhase?: Record<string, { rssMb: number; heapMb: number; arrayBuffersMb: number }>;
  };
  /** Base combos promoted to Main in the last compute */
  mainPairs: number;
  /** Signals processing: combos scored in Base, active signals, signal pairs / configs, guard and results */
  signals?: {
    enabled: boolean;
    combos: number;
    active: number;
    pairs: number;
    configs: number;
    /** Distinct built tapes, including enabled ladders and independently fitted Exit cells. */
    builtConfigs?: number;
    coordinationPairs?: number;
    coordinationConfigs?: number;
    coordinationBuiltConfigs?: number;
    coordinationActive?: number;
    coordinationTrades?: number;
    coordinationPf?: number;
    coordinationNet?: number;
    coordinationPositions?: number;
    coordinationOrders?: number;
    coordinationPeakPositions?: number;
    coordinationPeakOrders?: number;
    /** Pair discovery is independent configuration evaluation, not a passed return-PF gate. */
    discoveryPairs?: number;
    representativePassed?: number;
    representativeBaseGate?: boolean;
    historic?: SignalHistDiagnostics;
    disabled?: number;
    trades?: number;
    pf?: number | null;
    net?: number | null;
    noLoss?: boolean | null;
    pfConvention?: "gross-return-ratio" | "no-loss-sentinel" | "unavailable";
    /** positions (symbol × direction) and orders (all orders and partials) of the simulated signal book */
    positions?: number;
    orders?: number;
    /** Modeled simulation openings and endpoint inventory; separate from settled PF and current paper holdings. */
    openedOrders?: number;
    openedPositions?: number;
    openAtEndOrders?: number;
    openAtEndPositions?: number;
    peakPositions?: number;
    peakOrders?: number;
    /** open now in the paper book: positions / orders */
    openPositions?: number;
    openOrders?: number;
    /** why each signal unit is or is not active at the end of the last compute (per direction and test) */
    activation?: SignalActivationEnd;
  };
  /** Published research tapes by strategy, separate from admission and actual execution. */
  strategyCoverage?: StrategyCoverage;
  /** Independent historic exit type: fit/holdout counts and qualified tapes from the last compute. */
  exitStrategies?: {
    enabled: boolean;
    pairs: number;
    baseEvaluated?: number;
    basePassed?: number;
    baseRejected?: number;
    families?: number;
    timeframes?: number[];
    tactics?: number;
    relations?: number;
    configs: number;
    history: ExitStrategyDiagnostics;
  };
  /** Last compute's accepted-order Relate history and configured stack boundary. */
  relateAdjustment?: {
    enabled: boolean;
    auto: boolean;
    mode: "shared" | "additive";
    maxStack: number;
    relations: number;
    qualified: number;
    closes: number;
    maxSample: number;
    shadowCloses: number;
  };
  /** Engine selection-pool validation at the last full paper step; Signals have their own context gates. */
  postBaseValidation?: ValidationProgress | null;
  /** Base config sets evaluated / passing the Base gate (PF ≥ min PF) in the last compute */
  baseEvaluated?: number;
  basePassed?: number;
  /** wf.seatSet "validated": the size of the validated set V of the last simulation (its ids: sim.validated) */
  validated?: number;
  /** pairs grid.allSets built for measurement without passing Base (not validated; apart from basePassed) */
  baseBuilt?: number;
  /** the passed count of the last computes (bounded; the events table keeps the long record): continuity of Base */
  baseHistory?: Array<{
    at: number;
    compute: number;
    passed: number;
    built: number;
    byRange: Record<string, number>;
  }>;
  /** tapes released at the start of the last compute's Tapes phase (partial processing: slimTapes) */
  tapesReleased?: number;
  /** after the Base PF evaluation, per range type (Wide, Micro … Long, Signals): sets evaluated / passed and PF */
  baseByRange?: Array<BaseRangeCount & { range: string; enabled: boolean }>;
  /** Exact causal Base config counts, separate from the representative pair counts above. */
  baseConfigs?: BaseConfigSummary;
  /** counts of the listings of the last paper step (CoreRuntime.listings; the pages page through coreListing) */
  listings?: {
    paperStep: number;
    at: number;
    validated: number;
    active: number;
    proven: number | null;
    byRange: Array<{ range: string; validated: number; pf: number | null }>;
    provenBySide?: true;
    byGroup: Array<{ group: string; validated: number; pf: number | null }>;
    byKind: Array<{
      kind: string;
      validated: number;
      calculated: number;
      validationCloses: number;
      gp: number;
      gl: number;
      pf: number | null;
      noLoss: boolean;
    }>;
  };
  /** the preset comparison after the paper step (comparePresets): running, presets done / total, when it last finished */
  compare?: {
    running: boolean;
    done: number;
    total: number;
    at?: number;
    error?: string;
    deferred?: string;
    retryAt?: number;
  };
  /**
   * Base-gate sensitivity from the same Base results: how many pairs would pass under each variation of the gate
   * (PF, minimum closes, DDR) and at what median PF. No recompute — it answers "what would validate more sets at
   * Base, and at what quality" from the run that just finished.
   */
  baseGates?: BaseGateRow[];
  /** per enabled range, the Base gate each failing pair misses first and the pairs only one gate removes */
  baseWhy?: BaseWhyRow[];
  /** when settings last changed, and which settings version the last finished compute used */
  settingsAt: number;
  appliedSettingsAt: number;
  lastComputeAt: number;
  /** a compute is requested (settings change / recompute) and not yet finished */
  pending: boolean;
  /** progressive prehistoric start: symbols #/#, stage, results and counts */
  prehistoric?: PrehistoricStatus;
  /** self-healing: actions taken and consecutive failed cycles */
  heals: number;
  lastHeal: string;
  errorsInRow: number;
  /** the fast tick (paper mark-to-market + live step) */
  tick?: TickStatus;
  /** Dedicated execution checks. Lag is measured, never a guaranteed exchange latency. */
  executionProgress?: ExecutionProgressStats;
  /** where Base runs: worker cores, or in-process and why */
  workers?: string;
  /** event-loop delay over the last compute (ms) */
  /** the compute's loop-delay histogram (p50 / p99 / max, ms) and `recent`: the worst single slice (a timer that came
   *  late) of the last 60 s with the phase that was running, so a slice is reported as it happens, not only as the
   *  compute's maximum */
  loop: { p50: number; p99: number; max: number; recent?: { ms: number; where: string; at: number; n: number } };
  /**
   * the realtime entry step's last run (CTS_CORE_FAST_ENTRIES): the bar it ran on, its time, the seated configs it
   * rebuilt, their open positions on the current bars, and how many the paper book took
   */
  fast?: {
    at: number;
    bar: number;
    ms: number;
    delayMs?: number;
    seated: number;
    open: number;
    added: number;
    error: string | null;
    phase?: "warming" | "ready" | "incremental" | "error";
    workerMs?: number;
    workerProfile?: Record<string, number>;
    cycles?: number;
    maxMs?: number;
    overBudget?: number;
  };
  /** runtime.cycle "incremental": the last cycle's mode and the light cycles since the last heavy compute */
  cycleMode?: { mode: "full" | "light"; lightSince: number; heavyBar: number; validated: number; continued: number; rebuilt: number; why?: string };
  /** the last event-loop stalls over 150 ms, with what was running (the live tick waits behind them) */
  stalls?: Array<{ at: number; ms: number; where: string }>;
  /** the last probed stalls (CTS_CORE_STALL_PROBE=1): what the main thread did during each (stall-probe.server.ts) */
  stallProbes?: Array<StallProbe & { where: string }>;
  /** live validation of the selected configs (live last N) */
  liveValidation?: LiveValidationStatus;
  livePromotion?: LivePromotionStatus;
  engineProof?: {
    n: number;
    minPf: number;
    judged: number;
    proven: number;
    unknown: number;
    unknownConfigs: number;
    pfBasis: "unit-net-returns";
  };
  /**
   * tape positions the paper step did not open, by reason (notSelected, stale, duplicate, liveValidation,
   * heldBack:<why>, exec:<why>, cap:<which>; signal ones prefixed "sig:"), and the pending entries the live adapter was
   * not offered ("pending:…", per call)
   */
  paperSkips?: Record<string, number>;
  /**
   * public market-data requests this runtime sent since its start (klines: the bar pull's asks, empty: those that
   * brought no new bar; tickers: REST ticker reads) and the klines bans they drew
   */
  marketCalls?: { klines: number; empty: number; tickers: number; bans: number };
}

export interface TickStatus {
  at: number;
  ms: number;
  count: number;
  open: number;
  stream: StreamStats | null;
  error: string | null;
}

const blankTick = (): TickStatus => ({
  at: 0,
  ms: 0,
  count: 0,
  open: 0,
  stream: null,
  error: null,
});

/**
 * identity of a paper position (lane order): config, symbol, direction, entry time — long and short of one config on
 * one symbol run independently, so both can be open (and even enter on the same bar: a DCA Active / Axis fill)
 */
const posId = (p: { cfg: string; sym: string; side: number; entryT: number }) =>
  `${p.cfg}|${p.sym}|${p.side > 0 ? 1 : -1}|${p.entryT}`;
/** the identity before the direction was part of it (persisted stop hits written by an older build) */
const posIdLegacy = (p: { cfg: string; sym: string; entryT: number }) =>
  `${p.cfg}|${p.sym}|${p.entryT}`;

export { tickTrail, carryTrail, crossedStop, crossedExit } from "./tick-math.ts";
export type { TickTrail } from "./tick-math.ts";

export interface PaperBook {
  selected: string[];
  /** selection score per selected engine config (its rank; fixed mode: wf.rankBy) — the live top-config fill */
  scores?: Map<string, number>;
  eligible: number;
  /**
   * stopHit: time a tick price crossed the position's stop or target (its lane leaves the live control at once);
   * hitPx: the level it crossed (unset: the stop)
   */
  /** legs: Block type overall — the extra volume of every raising source (its own position) */
  /** tkBar / tkHi / tkLo: the lane bar the tick follows for a trailing position, and its high and low so far */
  positions: Array<
    OpenPosition & {
      vol?: number;
      level?: number;
      stopHit?: number;
      hitPx?: number;
      legs?: Partial<Record<string, number>>;
      tkBar?: number;
      tkHi?: number;
      tkLo?: number;
      tkClose?: number;
      /** when the paper book first held this position (its entry delay is heldAt − entryT) */
      heldAt?: number;
      /**
       * the market price when the book first held it (a fresh ticker, else the last bar's close): the executable
       * record — the sim's entry may lie a compute in the past (relation.ts executableR)
       */
      heldPx?: number;
    }
  >;
  trades: Trade[];
  /** net P&L of the paper book: closed results + open mark-to-market (USD) */
  equity: number;
  /** starting balance + equity */
  balance?: number;
  /** unit notional per order key (`cfg|sym|entryT`), from the sizing at each entry */
  units?: Map<string, number>;
  /**
   * realized P&L of the paper trades that closed before the current simulated window (persisted in paper_trades):
   * the balance is a running total, not a rolling window of the latest simulation
   */
  carried?: number;
  startedAt: number;
}

const yieldNow = () => new Promise<void>((r) => setImmediate(r));

/** What a runtime reports as it works (the UI refreshes on these instead of polling blind). */
/**
 * The Block book and the signal guard as of a time (every executed position closed by then fed in), and `advance`:
 * the same feed in pieces — at most `max` entries a call, true once the book holds everything up to `t`.
 */
type BooksAt = ((t: number) => {
  book: BlockBook | null;
  relate: RelateBook | null;
  guard: SignalGuard | null;
  direction: CandidateDirectionBook | null;
}) & {
  advance: (t: number, max: number) => boolean;
};

export type CoreEventType = "state" | "progress" | "compute" | "paper" | "live" | "settings";
export interface CoreEvent {
  type: CoreEventType;
  conn: string | null;
  at: number;
  state: string;
  stage: string;
  progress: number;
  label: string;
  overall: number;
  computes: number;
}
/** Every runtime's events in one place (the event stream subscribes here; listeners never throw into the loop). */
const bus = new Set<(e: CoreEvent) => void>();
export function onCoreEvent(fn: (e: CoreEvent) => void): () => void {
  bus.add(fn);
  return () => bus.delete(fn);
}

/**
 * The slim set compacted per memory-fallback range: the tapes of each range a fallback can carry over (Micro, Minimal)
 * in a buffer of their own, the rest in one, in the input order (the same tapes, the same bytes). In one buffer, a
 * carried tape kept the whole slim set — every signal tape with it, 0.5 GB on x01 — until the next slim.
 */
export function* compactByCarryGen(tapes: readonly ConfigTape[]): Generator<number, ConfigTape[]> {
  const carry = fallbackCarriedTags(MEM_FALLBACK_MAX);
  const groups = new Map<string, number[]>();
  tapes.forEach((t, i) => {
    const k = t.protect.tag && carry.has(t.protect.tag) ? t.protect.tag : "";
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(i);
  });
  const out: ConfigTape[] = new Array(tapes.length);
  let done = 0;
  for (const idx of groups.values()) {
    const resident: number[] = [];
    for (const i of idx) {
      if (historyOf(tapes[i])) out[i] = tapes[i];
      else resident.push(i);
    }
    // Stored columns have no shared resident arena to compact. Repacking them defeats the memory bound.
    const g = compactTapesGen(resident.map((i) => tapes[i]));
    for (let r = g.next(); ; r = g.next()) {
      if (r.done) {
        r.value.forEach((c, j) => (out[resident[j]] = c));
        break;
      }
      yield done + r.value;
    }
    done += idx.length;
  }
  return out;
}

const cloneExitProtectMap = (source: Record<string, Protect[]>): Record<string, Protect[]> =>
  Object.fromEntries(
    Object.entries(source).map(([pair, protects]) => [
      pair,
      protects.map((p) => ({ ...p, ...(p.atr ? { atr: { ...p.atr } } : {}) })),
    ]),
  );

export class CoreRuntime {
  readonly db: CoreDb;
  settings: CoreSettings;
  wf: WalkForwardOptions;
  status: RuntimeStatus;
  baseConfigs: BaseConfigSnapshot | null = null;
  private baseConfigRunner: BaseConfigJobRunner;
  /** each symbol's base bars as columns (market/candle-series.ts; a stored series never changes) */
  candles = new Map<string, CandleSeries>();
  tickers: Ticker[] = [];
  pipeline: PipelineOutput | null = null;
  tapes: ConfigTape[] = [];
  sim: WalkForwardResult | null = null;
  paper: PaperBook;
  /** Measured at actual paper adoption, frozen separately from later retrospective sizing. */
  private paperOwnedAllocations = new Map<string, { unitUsd: number; vol: number }>();
  /** the paper book was stepped at least once since start */
  private paperStepped = false;
  private lastTrim = 0;
  /** live prices (public WebSocket) for the tick; null for the synthetic test market */
  stream: PriceStream | null = null;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private tickEpoch = 0;
  private tickWorker = new OwnedWorker(128);
  private tickSentBook: unknown = null;
  private tickRetryAt = 0;
  private mtmWriting = false;
  private executionProgress: ExecutionProgress | null = null;
  /** Native holdings or pending execution survive the end of their paper lane. */
  liveOrdersActive = false;
  /** the market is a replayed window (see the constructor option) */
  private replay = false;
  /** Complete offline replay universe before the first compute. */
  readonly replayPreloadAll: boolean;
  private readonly completeReplayUniverse: boolean;
  private ticking = false;
  private liveStartedAt = 0;
  private liveSlowNoted = false;
  /** when the pending entries were last computed for the status (overall mode reads them only there) */
  private pendingAt = 0;
  private liveBusy = false;
  /** live step epoch: a step abandoned by the watchdog loses it (its alive() turns false, it sends nothing more) */
  liveEpoch = 0;
  /** what the running live step is waiting on (named when the watchdog abandons it) */
  livePhase = "";
  private streamKey = "";
  private lastMtmWrite = 0;
  /**
   * per symbol: the last klines ask and the asks in a row that brought no new bar (dueKlines: a bar the exchange has
   * not published yet is asked again after 2 → 4 → 8 → 15 s, not every second)
   */
  private klinesPace = new Map<string, KlinesPace>();
  /** the end of the last klines ban seen: every symbol resumes at it plus its own offset (no burst as it lifts) */
  private klinesResumeAt = 0;
  /** self-audit after every paper step (invariants recomputed from the published state) */
  audit: AuditReport | null = null;
  private lastAuditKey = "";
  /** held positions carried without their tape at the last paper step (event on change) */
  private carriedMissing = 0;
  /** Lane-less legacy positions need reconciliation; do not infer a timeframe or delete their ownership. */
  private unknownLaneHeld = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private dirty = true;
  /**
   * settings changed and not yet taken by a compute: the live step waits for the book they produce. Only this — a
   * failed or memory-delayed compute (also dirty) keeps the live control running on the current book (closes when
   * lanes end, stop repair, reduces).
   */
  private settingsStale = false;
  /** Entry admission stays fenced until the changed settings have produced a complete paper book. */
  private executionPending = false;
  /**
   * the compute that would take the changed settings is held back for memory (memWait): the live control runs on the
   * current book meanwhile, with the current live settings — it never stops for as long as the pressure lasts (bug
   * hunt, 13 Oct: closes, trail updates and stop mirrors stopped while the desk waited). Cleared when a compute starts.
   */
  private memDeferred = false;
  /** the paper step's live validation for new entries (null = off) */
  private liveEntryGate: ((tp: ConfigTape, side?: number, sym?: string) => boolean) | null = null;
  /** the last compute's strategy-set completeness (tape builder record: grid cells built / kept / skipped and why) */
  buildStats: TapeBuildStat[] = [];
  /** loop generation: a cycle from an older generation never reschedules or publishes */
  private gen = 0;
  private stopped = false;
  private disposed = false;
  private resetUniverse = false;
  private loop = monitorEventLoopDelay({ resolution: 20 });
  /** what runs on the main thread now (a synchronous phase), for the stall attribution */
  private busyPhase = "";
  private stallTimer: ReturnType<typeof setInterval> | null = null;
  /** the stall probe (CTS_CORE_STALL_PROBE=1, the desk): what the main thread did during a stall (stall-probe.server.ts) */
  private stallProbe: { beat(): void; stop(): void } | null = null;
  /** every 50 ms: a tick that comes late by more than 150 ms is a stall, recorded with what was running */
  private startStallWatch() {
    let last = performance.now();
    if (process.env.CTS_CORE_STALL_PROBE === "1")
      this.stallProbe = startStallProbe((p) => this.noteStallProbe(p));
    this.stallTimer = setInterval(() => {
      this.stallProbe?.beat();
      const now = performance.now();
      const late = now - last - 50;
      last = now;
      this.noteLag(late);
      if (late < 150) return;
      const where = `${this.busyPhase || this.status.stage || "idle"}${this.livePhase ? ` · live ${this.livePhase}` : ""}`;
      const xs = (this.status.stalls ??= []);
      xs.push({ at: Date.now(), ms: Math.round(late), where });
      if (xs.length > 30) xs.splice(0, xs.length - 30);
    }, 50);
    (this.stallTimer as { unref?: () => void }).unref?.();
  }
  /** the slices of the last 60 s that held the loop 40 ms or more (a late 50 ms timer), newest last */
  private lags: Array<{ at: number; ms: number; where: string }> = [];
  private noteLag(late: number) {
    const now = Date.now();
    if (late >= 40) {
      this.lags.push({
        at: now,
        ms: Math.round(late),
        where: `${this.busyPhase || this.status.stage || "idle"}${this.livePhase ? ` · live ${this.livePhase}` : ""}`,
      });
      if (this.lags.length > 200) this.lags.splice(0, this.lags.length - 200);
    }
    while (this.lags.length && now - this.lags[0].at > 60_000) this.lags.shift();
    if (!this.lags.length) {
      if (this.status.loop?.recent) delete this.status.loop.recent;
      return;
    }
    let w = this.lags[0];
    for (const x of this.lags) if (x.ms > w.ms) w = x;
    if (this.status.loop) this.status.loop.recent = { ms: w.ms, where: w.where, at: w.at, n: this.lags.length };
  }
  /** a probed stall: kept in the status (the last 20) and, from 1 s, in the events (the status keeps only the last 30 stalls) */
  private noteStallProbe(p: StallProbe) {
    const where = `${this.busyPhase || this.status.stage || "idle"}${this.livePhase ? ` · live ${this.livePhase}` : ""}`;
    const xs = (this.status.stallProbes ??= []);
    xs.push({ ...p, where });
    if (xs.length > 20) xs.splice(0, xs.length - 20);
    if (p.ms < 1000) return;
    const top = (o: Record<string, number>, n = 3) =>
      Object.entries(o)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ");
    try {
      this.db.event(
        "warn",
        `stall ${p.ms} ms (${where}): ${p.verdict} · main thread ${top(p.states)} · syscall ${top(p.syscalls)} · wchan ${top(p.wchans, 2)} · ` +
          `main CPU ${p.mainCpuMs} ms · threads ${top(p.threadsCpuMs)} ms · gc ${p.gc.length ? p.gc.map((g) => `${g.kind} ${g.ms} ms`).join(", ") : "none"} · steal ${p.stealTicks}`,
      );
    } catch {
      /* the events table is closed (dispose) */
    }
  }
  private snapshotPath = process.env.CTS_CORE_SNAPSHOT || "";
  /** the exchange connection this runtime belongs to (one runtime per connection); unset = tests / scripts */
  readonly conn: ConnId | undefined;
  private lastSnapshot = 0;
  onLive?: (rt: CoreRuntime, intents: LiveIntent[], gen: number) => Promise<void>;

  /** market source: live BingX (the app) or synthetic (automated tests only, explicit opt-in) */
  private market: "bingx" | "synthetic";
  /** Explicit replay-only performance boundary; preceding data warms indicators, never qualification. */
  private readonly evaluationFromT?: number;
  /** makes the live price stream (null: none) */
  private priceStream: (() => PriceStream) | null = () => new PriceStream();
  /** market data functions (injectable for recovery tests) */
  private feed: MarketFeed;
  private healer: ReturnType<typeof setInterval> | null = null;
  private errorsInRow = 0;
  /** memory guard (memguard.server.ts): compute fallback level 0–2 and the clean computes since the last step */
  memFallback = 0;
  /** ranges each pair passed in the last Base ("" = the default protect / wide grid) */
  basePairTags: Record<string, string[]> = {};
  private memClean = 0;
  private memPressured = false;
  private memSoftNoted = false;
  private memMinAvail = Infinity;
  private memTimer: ReturnType<typeof setInterval> | null = null;
  /** the generation whose compute the guard timer watches: only that cycle stops it */
  private memTimerGen = -1;
  private memLastAbort: string | null = null;
  /** the last forced collection (time, heap + buffers after it): soft pressure collects at most every 30 s */
  private memGcLast: { at: number; mb: number } | null = null;
  /** computes aborted in a row at the lightest level, and the earliest next try (memRetryDelayMs) */
  private memMaxAborts = 0;
  private memRetryAt = 0;
  /** the memory reading (memInfo().at) that last raised the fallback before a compute: one level per reading */
  private memRaisedAt = -1;
  /** after such a raise, no compute start (and no further raise) before a fresh reading exists */
  private memFreshAt = 0;
  /** computes aborted on memory pressure since the start */
  private memAborts = 0;
  /** the fallback level of the compute running (or last run) */
  private memComputeLevel = 0;

  constructor(
    db: CoreDb = coreDb(),
    settings?: SettingsPatch,
    opts: {
      market?: "bingx" | "synthetic";
      feed?: Partial<MarketFeed>;
      /** connection of this runtime: its live settings always point at it */
      conn?: ConnId;
      /** snapshot file of this runtime (default CTS_CORE_SNAPSHOT) */
      snapshotPath?: string;
      /** live price stream (tests: a stub, or null for none); default the public BingX WebSocket */
      priceStream?: (() => PriceStream) | null;
      /** a replayed market (a fixed window of a feed): no wall clock to wait for between computes */
      replay?: boolean;
      /** Compatibility option: offline unconnected replays load all symbols before computing. */
      completeReplayUniverse?: boolean;
      evaluationFromT?: number;
      /** Unconnected replay only; preserve the ordinary progressive startup when omitted. */
      replayPreloadAll?: boolean;
    } = {},
  ) {
    if (opts.feed?.rankingAt !== undefined &&
      (!opts.replay || opts.conn || !Number.isFinite(opts.feed.rankingAt) || opts.feed.rankingAt < 0))
      throw new Error("rankingAt is a finite historical clock for unconnected replays only");
    if ((opts.completeReplayUniverse || opts.replayPreloadAll) && (!opts.replay || opts.conn))
      throw new Error("completeReplayUniverse is available for unconnected replays only");
    this.completeReplayUniverse =
      !!opts.replay && !opts.conn && (opts.completeReplayUniverse ?? opts.replayPreloadAll ?? true);
    this.replayPreloadAll = this.completeReplayUniverse;
    if (opts.evaluationFromT !== undefined) {
      if (
        !opts.replay ||
        opts.conn ||
        !Number.isFinite(opts.evaluationFromT) ||
        opts.evaluationFromT < 0
      )
        throw new Error(
          "evaluationFromT is a finite nonnegative boundary for unconnected replays only",
        );
      this.evaluationFromT = opts.evaluationFromT;
    }
    this.conn = opts.conn;
    this.replay = !!opts.replay;
    if (opts.snapshotPath !== undefined) this.snapshotPath = opts.snapshotPath;
    // runtimes of the app read the market through the shared feed (one request for every connection)
    const shared = opts.conn ? sharedFeed() : null;
    this.feed = {
      tickers: shared ? shared.tickers : fetchTickers,
      history: shared ? shared.history : fetchHistory,
      klines: shared ? shared.klines : fetchKlines,
      ...(opts.feed ?? {}),
    };
    this.market = opts.market ?? "bingx";
    if (opts.priceStream !== undefined) this.priceStream = opts.priceStream;
    this.db = db;
    // order caps from before unlimited orders are dropped once (walk-forward and signal caps)
    const savedWf = migrateSignalHistory150(db, migrateSignalLast4Policy(db, migrateSignalEvaluationPolicy(db, migrateWfCaps(db))));
    migrateExpandedSignalDefaults(db);
    migrateNeutralVolumeRatios(db);
    migrateDcaTwoSteps(db);
    migrateMicroBreakoutFocus(db);
    migrateMicroContextFocus(db);
    migrateHistoricExitOptIn(db);
    const saved = db.kvGet<Partial<CoreSettings>>("settings");
    // settings saved before the tick loop existed carry a cycle of ≥ 5 s (the old minimum): the fast defaults apply
    if (saved && saved.tickMs === undefined && (saved.cycleMs ?? 0) >= 5_000) {
      saved.cycleMs = DEFAULT_SETTINGS.cycleMs;
      saved.tickMs = DEFAULT_SETTINGS.tickMs;
    }
    this.settings = mergeSettings(DEFAULT_SETTINGS, saved, settings);
    if (this.conn) this.settings.live = { ...this.settings.live, connId: this.conn };
    this.settings.gates.minPf = Math.min(1.5, Math.max(1.05, this.settings.gates.minPf));
    // once: every saved preset and the running gates move to a 35 h drawdown max (the old ceiling was 20)
    if (!db.kvGet("ddtMax35") && settings?.gates?.maxDdtH === undefined) {
      this.settings.gates.maxDdtH = 35;
      const presets = db.kvGet<Preset[]>("presets") ?? [];
      for (const p of presets) p.settings.gates = { ...(p.settings.gates ?? {}), maxDdtH: 35 };
      db.kvSet("presets", presets);
      db.kvSet("settings", this.settings);
      db.kvSet("ddtMax35", true);
    }
    this.settings.gates.maxDdtH = Math.min(35, Math.max(2, this.settings.gates.maxDdtH));
    this.wf = {
      ...defaultWalkForward(this.settings),
      ...pickWf(savedWf),
      // Production/runtime execution always consumes the validated set V, including after loading a saved legacy pool.
      seatSet: "validated",
    };
    if (this.wf.relate) this.wf.relate.maxStack = Math.floor(Math.min(MAX_EXTERNAL_STACK, Math.max(1, this.wf.relate.maxStack)));
    const now = Date.now();
    this.status = {
      state: "idle",
      stage: "",
      progress: 0,
      label: "",
      overall: 0,
      computeStartedAt: 0,
      paperSteps: 0,
      paperCompute: 0,
      cycles: 0,
      computes: 0,
      startedAt: now,
      heartbeat: now,
      lastCycleMs: 0,
      lastComputeMs: 0,
      lastBarT: 0,
      source: "none",
      symbols: [],
      error: null,
      nextCycleAt: now,
      phases: {},
      mainPairs: 0,
      settingsAt: 0,
      appliedSettingsAt: 0,
      lastComputeAt: 0,
      pending: true,
      heals: 0,
      lastHeal: "",
      errorsInRow: 0,
      loop: { p50: 0, p99: 0, max: 0 },
    };
    this.baseConfigRunner = this.makeBaseConfigRunner();
    this.baseConfigRunner.restore(db.kvGet<BaseConfigSnapshot>("baseConfigCounts"));
    this.loop.enable();
    this.startStallWatch();
    this.paper = {
      selected: [],
      eligible: 0,
      positions: [],
      trades: [],
      equity: 0,
      startedAt: now,
    };
    this.restorePaperBook();
  }

  private makeBaseConfigRunner(): BaseConfigJobRunner {
    return new BaseConfigJobRunner({
      foreground: () => this.busy || !!this.comparing || this.ticking || this.liveBusy,
      ready: () => this.paperStepped && !this.stopped,
      memoryOkay: () => !this.memPressured,
      available: () => workersAvailable() && !this.workersBroken,
      run: async (message) => (await runOnWorkers<BaseConfigChunkReply>([message], 1, 60_000))[0],
      publish: (snapshot) => {
        this.baseConfigs = snapshot;
        this.status.baseConfigs = snapshot.summary;
        this.db.kvSet("baseConfigCounts", snapshot);
      },
    });
  }

  /**
   * A restart continues the paper book: its open positions (held — live keeps their exchange positions instead of
   * flattening every one whose config is no longer selected) and its start (the carried P&L window). Read on
   * construction (the same store) and again once start() restored the snapshot: the book is not a durable key, so a
   * desk process found it only there — read before the restore, the book started empty, the held configs got no tape
   * in the first compute and their exchange positions were closed (x02, 7 Oct 04:42: 21 at once after a deploy).
   */
  private restorePaperBook(): number {
    const book = this.db.kvGet<{
      startedAt?: number;
      selected?: string[];
      positions?: PaperBook["positions"];
      ownedEntryAllocations?: Array<[string, { unitUsd: number; vol: number }]>;
    }>("paperBook");
    if (!book || !Array.isArray(book.positions)) return 0;
    this.paper.positions = book.positions;
    this.paperOwnedAllocations = new Map(
      (book.ownedEntryAllocations ?? []).filter(
        (row) =>
          Array.isArray(row) &&
          typeof row[0] === "string" &&
          row[1] &&
          Number.isFinite(row[1].unitUsd) &&
          row[1].unitUsd > 0 &&
          Number.isFinite(row[1].vol) &&
          row[1].vol > 0,
      ),
    );
    for (const p of this.paper.positions) {
      const own = parseConfigId(p.cfg)?.protect;
      if (!p.exitProtection && own) {
        const protection = createExitProtection(own, p.entry, this.settings.cost);
        if (protection) p.exitProtection = protection;
      }
      if (own?.trail && own.trail > 0) {
        p.trail ??= own.trail;
        p.trailDist ??= own.trail * (own.trailStep ?? 1);
      }
      if (own?.trailOnly) {
        p.trailOnly = true;
        p.trailFree = false;
        p.target = 0;
        p.trail ??= own.trail;
        p.trailDist ??= own.trail * (own.trailStep ?? 1);
      }
      enforceSignalPosition(p);
    }
    this.paper.selected = Array.isArray(book.selected) ? book.selected : [];
    if (typeof book.startedAt === "number" && book.startedAt > 0)
      this.paper.startedAt = book.startedAt;
    return book.positions.length;
  }

  /** Current loop generation (live steps abort when it changes). */
  get generation(): number {
    return this.gen;
  }

  /**
   * The market price a paper position is adopted at (its heldPx): the price stream or the last ticker when at most
   * 30 s old, else the last bar's close; undefined without any.
   */
  heldPxOf(sym: string): number | undefined {
    const st = this.stream?.price(sym, 30_000);
    if (st && st > 0) return st;
    if (Date.now() - this.tickersAt <= 30_000) {
      const t = this.tickers.find((x) => x.sym === sym)?.last;
      if (t && t > 0) return t;
    }
    const c = this.candles.get(sym)?.lastC();
    return c && c > 0 ? c : undefined;
  }

  /** Tickers fetched now (for live pricing); falls back to the last known ones. */
  /** when `tickers` were last fetched successfully (live sizing refuses prices older than 30 s) */
  tickersAt = 0;
  /** last REST ticker request (the fallback runs at most every 2 s) */
  private restTickersAt = 0;
  async freshTickers(): Promise<Ticker[]> {
    // the price stream is fresher than any REST poll: use it when it covers the universe
    const st = this.stream;
    if (st && this.tickers.length) {
      const live = this.tickers.map((t) => ({ ...t, last: st.price(t.sym, 5_000) ?? NaN }));
      if (live.every((t) => Number.isFinite(t.last))) {
        this.tickersAt = Date.now();
        return live;
      }
      // partly covered (still subscribing / a gap): streamed prices where there are some, the last REST
      // snapshot for the rest — REST is asked at most every 2 s, never on every 100 ms tick
      if (Date.now() - this.restTickersAt < 2_000)
        return this.tickers.map((t) => ({ ...t, last: st.price(t.sym, 5_000) ?? t.last }));
    } else if (Date.now() - this.restTickersAt < 2_000) return this.tickers;
    // a ticker ban: nothing is sent until it ends (a call made while banned keeps the limit tripped) — the last
    // snapshot stands, and tickersAt tells the caller how old it is
    if (rateLimitedUntil(Date.now(), TICKERS))
      return st ? this.tickers.map((t) => ({ ...t, last: st.price(t.sym, 5_000) ?? t.last })) : this.tickers;
    this.restTickersAt = Date.now();
    try {
      this.marketCalls().tickers++;
      const t = await this.feed.tickers();
      if (t.length) {
        this.tickers = t;
        this.tickersAt = Date.now();
      }
    } catch (e) {
      // keep last; tickersAt tells the caller how old they are. A ban is held to the ticker endpoint
      noteRateLimit(e instanceof Error ? e.message : String(e), Date.now(), TICKERS);
    }
    return this.tickers;
  }

  start() {
    if (this.disposed) throw new Error("runtime disposed");
    if (!this.stopped && this.status.state !== "idle" && this.status.state !== "error") return;
    if (this.snapshotPath) this.db.journalPath = `${this.snapshotPath}.journal`;
    if (this.status.state === "idle" && this.snapshotPath) {
      if (this.db.restore(this.snapshotPath)) {
        // Do not accept a partial replay of a malformed or unreadable journal as the live ownership ledger.
        const replay = this.db.replayJournalChecked();
        this.baseConfigRunner.restore(this.db.kvGet<BaseConfigSnapshot>("baseConfigCounts"));
        if (replay.ok) this.db.event("info", `restored snapshot ${this.snapshotPath}${replay.writes ? ` + ${replay.writes} journaled write(s)` : ""}`);
        else this.db.event("error", `live journal replay unavailable — reconciliation required: ${replay.error}`);
        // Paper can still continue from the snapshot; live execution is fenced when journal proof is incomplete.
        if (!this.paper.positions.length && !this.paper.selected.length) {
          const p = this.restorePaperBook();
          if (p) this.db.event("info", `paper book continued from the snapshot: ${p} open position(s)`);
        }
      } else {
        try {
          const artifacts = [this.snapshotPath, `${this.snapshotPath}.tmp`, `${this.snapshotPath}.tmp.old`,
            `${this.snapshotPath}.journal`, `${this.snapshotPath}.journal.prev`];
          const present = artifacts.some((path) => {
            try { lstatSync(path); return true; }
            catch (err) { if ((err as NodeJS.ErrnoException).code === "ENOENT") return false; throw err; }
          });
          if (present) this.db.lastJournalError ||= "snapshot unavailable while recovery artifacts exist — live ownership requires reconciliation";
        } catch (err) {
          this.db.lastJournalError ||= `recovery artifacts unavailable — live ownership requires reconciliation: ${err instanceof Error ? err.message : String(err)}`;
        }
        if (this.db.lastJournalError) this.db.event("error", this.db.lastJournalError);
      }
    }
    this.stopped = false;
    if (!this.busy) this.status.state = "booting";
    if (!this.healer) {
      // a failing heal must never take the process down: every timer callback is guarded
      this.healer = setInterval(() => {
        this.heal().catch((err) => {
          try {
            this.db.event("error", `heal: ${err instanceof Error ? err.message : err}`);
          } catch {
            /* the event log itself failed — nothing more to do */
          }
        });
      }, 30_000);
      (this.healer as { unref?: () => void }).unref?.();
    }
    this.db.event("info", "runtime start");
    this.emit("state");
    this.schedule(0);
    this.startTick();
  }

  /** The tick: every tickMs, open paper positions marked to market and the live step (never overlapping). */
  private startTick() {
    this.startExecutionProgress();
    if (this.tickTimer) return;
    const epoch = ++this.tickEpoch;
    if (!this.stream && this.market === "bingx" && this.priceStream)
      this.stream = this.priceStream();
    const loop = () => {
      this.tickTimer = setTimeout(
        () => {
          this.tick()
            .catch((err) => {
              this.status.tick = {
                ...(this.status.tick ?? blankTick()),
                error: err instanceof Error ? err.message : String(err),
              };
            })
            .finally(() => {
              if (epoch === this.tickEpoch && this.tickTimer && !this.stopped) loop();
            });
        },
        Math.max(20, this.settings.tickMs ?? 100),
      );
      (this.tickTimer as { unref?: () => void }).unref?.();
    };
    loop();
  }

  private startExecutionProgress() {
    if (!this.executionProgress) {
      this.executionProgress = new ExecutionProgress(
        () => this.progressLive(),
        EXECUTION_INTERVAL_MS,
      );
      this.status.executionProgress = this.executionProgress.stats;
    }
    this.executionProgress.start();
  }

  private stopTick() {
    this.tickEpoch++;
    this.tickWorker.dispose(new Error("tick loop stopped"));
    this.tickSentBook = null;
    this.executionProgress?.stop();
    if (this.tickTimer) clearTimeout(this.tickTimer);
    this.tickTimer = null;
    this.stream?.stop();
    // a restarted tick re-follows the universe (the stream reconnects)
    this.streamKey = "";
  }

  /** Σ closed paper orders × their unit: recomputed only when the paper book changes, not on every tick. */
  private closedMemo: {
    trades: unknown;
    units: unknown;
    n: number;
    notional: number;
    sum: number;
  } | null = null;
  private closedPaperSum(): number {
    const { trades, units } = this.paper;
    const notional = this.settings.paperNotional;
    const m = this.closedMemo;
    if (
      m &&
      m.trades === trades &&
      m.units === units &&
      m.n === trades.length &&
      m.notional === notional
    )
      return m.sum;
    let sum = 0;
    for (const t of trades) sum += t.r * (units?.get(orderKey(t)) ?? notional);
    this.closedMemo = { trades, units, n: trades.length, notional, sum };
    return sum;
  }
  /**
   * The paper book by symbol for the tick: the positions' indexes per symbol (book order), each symbol's last price
   * and its positions' open result at it. Rebuilt with a new book, new units or a new cost.
   */
  private tickMemo: {
    positions: unknown;
    units: Float64Array;
    cost: number;
    baseTfMin: number;
    trailFree: boolean;
    math: TickMathBook | null;
    groups: Array<{ sym: string; idx: number[]; px: number; sum: number; nextBarT: number }>;
  } | null = null;
  private tickBook() {
    const positions = this.paper.positions;
    const units = this.paperUnits();
    const cost = this.settings.cost;
    const m = this.tickMemo;
    const baseTfMin = this.settings.tfMin,
      trailFree = this.settings.grid?.trailFree === true;
    if (
      m &&
      m.positions === positions &&
      m.units === units &&
      m.cost === cost &&
      m.baseTfMin === baseTfMin &&
      m.trailFree === trailFree
    )
      return m;
    const by = new Map<
      string,
      { sym: string; idx: number[]; px: number; sum: number; nextBarT: number }
    >();
    for (let i = 0; i < positions.length; i++) {
      const sym = positions[i].sym;
      let g = by.get(sym);
      if (!g) by.set(sym, (g = { sym, idx: [], px: NaN, sum: 0, nextBarT: Infinity }));
      g.idx.push(i);
    }
    this.tickMemo = {
      positions,
      units,
      cost,
      baseTfMin,
      trailFree,
      math: null,
      groups: [...by.values()],
    };
    return this.tickMemo;
  }

  /** The open paper orders' units, in book order (order keys built once per paper book, not on every tick). */
  private unitMemo: {
    positions: unknown;
    units: unknown;
    notional: number;
    a: Float64Array;
  } | null = null;
  private paperUnits(): Float64Array {
    const { positions, units } = this.paper;
    const notional = this.settings.paperNotional;
    const m = this.unitMemo;
    if (
      m &&
      m.positions === positions &&
      m.units === units &&
      m.notional === notional &&
      m.a.length === positions.length
    )
      return m.a;
    const a = new Float64Array(positions.length);
    for (let i = 0; i < positions.length; i++)
      a[i] = units?.get(orderKey(positions[i])) ?? notional;
    this.unitMemo = { positions, units, notional, a };
    return a;
  }

  /** the paper rows the last paper step wrote (posId → entry|stop|target, orderKey → pnl): only changes are written */
  private paperPosWritten: WrittenPos | null = null;
  private paperTradesWritten: Map<string, number> | null = null;
  /** the tape builder's arguments of the last compute (the realtime entry step rebuilds the seated configs with them) */
  private fastArgs: {
    main: { protects: readonly Protect[]; dcaFor: unknown; floors: EntryFloors };
    sig: { protects: readonly Protect[]; dcaFor: unknown; floors: EntryFloors };
    coord: { protects: readonly Protect[]; dcaFor: unknown; floors: EntryFloors };
    exit: { protects: readonly Protect[]; dcaFor: unknown; floors: EntryFloors };
    exitSig: { protects: readonly Protect[]; dcaFor: unknown; floors: EntryFloors };
    adjust: AdjustState | null;
    bars: Bars[];
    signalBars?: Bars[];
  } | null = null;
  /** a paper step (full or realtime) owns the book */
  private paperRunning = false;
  private paperOwner: symbol | null = null;
  private claimPaper(): symbol {
    if (this.paperRunning) throw new Error("paper book already has an active owner");
    const owner = Symbol("paper-step");
    this.paperOwner = owner;
    this.paperRunning = true;
    return owner;
  }
  private releasePaper(owner: symbol) {
    if (this.paperOwner !== owner) return;
    this.paperOwner = null;
    this.paperRunning = false;
  }
  /** the compute is replacing its tapes and run: no realtime step until the full paper step has run on them */
  private fastHold = false;
  private fastBusy = false;
  /** the newest bar the realtime entry step has run on */
  private fastBarDone = 0;
  private fastWorker = new OwnedWorker(512);
  private fastEpoch = 0;
  private fastReady = false;
  private fastCount = 0;
  private fastEnds: Record<string, number> = {};
  private fastPreparing: Promise<void> | null = null;
  private fastTask: Promise<void> | null = null;
  private fastRetryAt = 0;
  private nextResearchAt = 0;

  private resetRealtime(reason: string) {
    this.fastEpoch++;
    // The replacement cohort may be seeded behind the previous cohort's last consumed bar.
    // Its worker ends, rather than a retired cohort's global marker, determine what must catch up.
    this.fastBarDone = 0;
    this.fastReady = false;
    this.fastCount = 0;
    this.fastEnds = {};
    this.fastPreparing = null;
    this.fastWorker.dispose(new Error(reason));
  }

  /** Seed the exact selected history once, off the ticker, then exchange only newly closed candles and trade deltas. */
  private prepareRealtime(): Promise<void> {
    if (this.fastPreparing) return this.fastPreparing;
    const a = this.fastArgs;
    if (
      !FAST_ENTRIES ||
      this.market !== "bingx" ||
      this.replay ||
      !a ||
      this.fastReady ||
      this.fastHold ||
      !this.paperStepped ||
      this.stopped ||
      this.settingsStale ||
      Date.now() < this.fastRetryAt
    )
      return Promise.resolve();
    const epoch = this.fastEpoch,
      gen = this.gen;
    const task = (async () => {
      const byId = this.tapeIndex();
      const held = new Set(this.paper.positions.map((p) => p.cfg));
      const cohort = new Set([...this.paper.selected, ...held]);
      const groups: RealtimeTapeGroup[] = [];
      for (const key of ["main", "sig", "coord", "exit", "exitSig"] as const) {
        const ids = new Set<string>(),
          pairs = new Set<string>();
        for (const id of cohort) {
          const tp = byId.get(id);
          if (!tp) continue;
          if (!held.has(id) && FAST_ENTRY_MODE === "break" && !isBreakRelInd(tp.ind)) continue;
          const family =
            tp.kind === "exit"
              ? isSignalInd(tp.ind) ? "exitSig" : "exit"
              : isSignalCoordinationInd(tp.ind)
                ? "coord"
                : isSignalInd(tp.ind)
                  ? "sig"
                  : "main";
          if (family !== key) continue;
          ids.add(id);
          pairs.add(`${tp.bot}|${tp.ind}`);
        }
        if (!ids.size) continue;
        const source = a[key];
        const floors = floorsForPairs(source.floors)([...pairs]);
        groups.push({
          key,
          pairs: [...pairs],
          protects: source.protects,
          dcaOpt: source.dcaFor as RealtimeTapeGroup["dcaOpt"],
          tactics: this.settings.tactics,
          adjust: a.adjust,
          floors: {
            ...floors,
            onlyIds: ids,
            heldIds: new Set([...(floors.heldIds ?? []), ...held]),
          },
        });
      }
      if (gen !== this.gen || epoch !== this.fastEpoch) return;
      this.fastCount = groups.reduce((n, g) => n + (g.floors.onlyIds?.size ?? 0), 0);
      if (!groups.length) {
        this.fastReady = true;
        this.fastEnds = Object.fromEntries(
          a.bars.map((b) => [`${b.sym}|${b.tfMin}`, b.t[b.n - 1]]),
        );
        return;
      }
      this.status.fast = {
        at: Date.now(),
        bar: this.status.lastBarT,
        ms: 0,
        seated: cohort.size,
        open: this.paper.positions.length,
        added: 0,
        error: null,
        phase: "warming",
      };
      if (groups.some((g) => g.key === "sig" || g.key === "coord" || g.key === "exitSig")) {
        const signalBars = shareBars(a.signalBars ?? a.bars);
        for (const group of groups)
          if (group.key === "sig" || group.key === "coord" || group.key === "exitSig") group.bars = signalBars;
      }
      const result = await this.fastWorker.run<{ ends: Record<string, number> }>(
        {
          type: "realtime-init",
          bars: shareBars(a.bars),
          groups,
          cost: this.settings.cost,
          evaluationFromT: this.evaluationFromT,
        },
        120_000,
      );
      if (gen !== this.gen || epoch !== this.fastEpoch || this.stopped) return;
      this.fastEnds = result.ends;
      this.fastReady = true;
      if (this.status.fast) this.status.fast.phase = "ready";
    })()
      .catch((error) => {
        if (gen !== this.gen || epoch !== this.fastEpoch) return;
        this.resetRealtime("realtime bootstrap failed");
        this.fastRetryAt = Date.now() + 5_000;
        this.status.fast = {
          at: Date.now(),
          bar: this.status.lastBarT,
          ms: 0,
          seated: 0,
          open: this.paper.positions.length,
          added: 0,
          phase: "error",
          error: error instanceof Error ? error.message : String(error),
        };
      })
      .finally(() => {
        if (this.fastPreparing === task) this.fastPreparing = null;
      });
    this.fastPreparing = task;
    return task;
  }
  /** Resolves once no paper step runs (the full and the realtime step never interleave their slices). */
  private async paperIdle(timeoutMs = 30_000): Promise<void> {
    const gen = this.gen,
      until = performance.now() + timeoutMs;
    while (this.paperRunning) {
      if (gen !== this.gen || this.stopped)
        throw new Error("paper wait canceled by runtime generation");
      if (performance.now() >= until) {
        this.researchAbort?.abort(new Error("research canceled: stalled paper generation"));
        this.gen++;
        this.paperOwner = null;
        this.paperRunning = false;
        this.busy = false;
        this.dirty = true;
        this.resetRealtime("stalled paper generation retired");
        this.noteHeal("paper step stalled; retired its generation and scheduled recovery");
        if (!this.stopped) this.schedule(0);
        throw new Error("paper step stalled; generation retired");
      }
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  /** One serialized foreground candle cycle. Historical discovery keeps its separate background interval. */
  private fastStep(): Promise<void> {
    if (this.fastTask) return this.fastTask;
    const task = this.runFastStep().finally(() => {
      if (this.fastTask === task) this.fastTask = null;
    });
    this.fastTask = task;
    return task;
  }

  private async runFastStep(): Promise<void> {
    if (
      this.replay ||
      this.market !== "bingx" ||
      !FAST_ENTRIES ||
      !this.fastArgs ||
      this.fastBusy ||
      this.fastHold ||
      this.pulling ||
      this.paperRunning ||
      !this.paperStepped ||
      !this.sim ||
      !this.lastSelection ||
      this.stopped ||
      this.settingsStale ||
      this.resetUniverse
    )
      return;
    if (!this.fastReady) {
      void this.prepareRealtime();
      return;
    }
    const bar = this.status.lastBarT;
    if (!(bar > this.fastBarDone)) return;
    if (!this.fastCount) {
      this.fastBarDone = bar;
      return;
    }
    const barEnd = bar + this.settings.tfMin * 60_000;
    const startAt = Date.now();
    if (!fastBarFresh(barEnd, startAt)) {
      // Catch up state even when entries are too late. Suppressing the entire calculation would keep its
      // continuation behind forever; only pending/new entries are suppressed, held closes still reconcile.
      this.controlUrgent = true;
    }
    this.fastBusy = true;
    const gen = this.gen,
      epoch = this.fastEpoch;
    const t0 = performance.now();
    const s = this.settings;
    try {
      const appends: Bars[] = [];
      const maxFactor = Math.ceil(Math.max(...(s.tfs ?? [s.tfMin])) / s.tfMin);
      for (const [sym, cs] of this.candles) {
        const last = this.fastEnds[`${sym}|${s.tfMin}`];
        if (last === undefined) throw new Error(`realtime universe changed: ${sym}`);
        if (cs.firstT()! > last + s.tfMin * 60_000)
          throw new Error(`realtime candle coverage lost: ${sym}; research bootstrap required`);
        const from = cs.lowerBound(last + s.tfMin * 60_000);
        const tail = cs.tail(cs.n - from + 2 * maxFactor + 2);
        for (const b of laneSeriesOf(sym, tail, s)) {
          const end = this.fastEnds[`${sym}|${b.tfMin}`];
          if (end === undefined)
            throw new Error("realtime lane changed; research bootstrap required");
          const i = lowerBound(b.t, end + 1);
          if (i >= b.n) continue;
          appends.push({
            ...b,
            n: b.n - i,
            t: b.t.slice(i),
            o: b.o.slice(i),
            h: b.h.slice(i),
            l: b.l.slice(i),
            c: b.c.slice(i),
            v: b.v.slice(i),
          });
        }
      }
      if (!appends.length) {
        this.fastBarDone = bar;
        return;
      }
      const workerStart = performance.now();
      const result = await this.fastWorker.run<{
        tapes: ConfigTape[];
        ends: Record<string, number>;
        changed: string[];
        profile?: Record<string, number>;
      }>(
        {
          type: "realtime-advance",
          appends,
        },
        5_000,
      );
      const workerMs = performance.now() - workerStart;
      if (
        gen !== this.gen ||
        epoch !== this.fastEpoch ||
        this.stopped ||
        this.fastHold ||
        this.settingsStale
      )
        return;
      this.fastEnds = result.ends;
      const byId = this.tapeIndex();
      const next = this.tapes.slice();
      const slots = this.tapeIdx!.slots ?? new Map(this.tapes.map((tp, i) => [tp.id, i]));
      const refreshed: ConfigTape[] = [];
      for (const delta of result.tapes) {
        const previous = byId.get(delta.id);
        if (!previous) throw new Error("realtime config disappeared; research bootstrap required");
        const tp = appendTape(previous, delta);
        next[slots.get(tp.id)!] = tp;
        refreshed.push(tp);
      }
      await this.driveSliced(
        "Realtime acceptance",
        advanceGuardIndicesGen(this.tapes, next, refreshed, result.tapes, this.wf),
        gen,
        () => undefined,
      );
      if (gen !== this.gen || epoch !== this.fastEpoch || this.fastHold || this.stopped) return;
      for (const tp of refreshed) byId.set(tp.id, tp);
      this.tapes = next;
      this.tapeIdx = { tapes: next, byId, slots };
      await this.driveSliced(
        "Realtime learning",
        this.appendRealtimeLearningGen(result.tapes),
        gen,
        () => undefined,
      );
      if (gen !== this.gen || epoch !== this.fastEpoch || this.fastHold || this.stopped) return;
      const allowEntries = fastBarFresh(barEnd, Date.now());
      const priceOf = (sym: string) => this.stream?.price(sym) ?? this.candles.get(sym)?.lastC();
      const opens = new Map<string, OpenPosition[]>();
      for (const tp of refreshed) {
        const tf = laneOf(tp.ind).tf ?? s.tfMin;
        const pending =
          allowEntries && fastEntryLaneDue(tp.ind, bar, s.tfMin, FAST_ENTRY_MODE)
            ? tp.pending.filter((p) => result.ends[`${p.sym}|${tf}`] + tf * 60_000 === barEnd)
            : [];
        const eligible = allowEntries
          ? tp.open
          : tp.open.filter((o) => this.paper.positions.some((held) => posId(held) === posId(o)));
        opens.set(tp.id, [
          ...eligible,
          ...pendingAsOpen(withHistoryMetadata(tp, { pending }), barEnd, s.tfMin, priceOf, s.cost),
        ]);
      }
      const before = this.paper.positions.length;
      await this.paperIdle();
      if (gen !== this.gen || epoch !== this.fastEpoch || this.fastHold || this.stopped) return;
      const paperOwner = this.claimPaper();
      try {
        await this.driveSliced(
          "Realtime",
          this.stepPaperGen({ opens, t: barEnd, refreshHeld: true }),
          gen,
          () => undefined,
        );
      } finally {
        this.releasePaper(paperOwner);
      }
      if (gen !== this.gen || epoch !== this.fastEpoch) return;
      this.fastBarDone = bar;
      this.releaseExecutionBook(gen);
      const ms = performance.now() - t0;
      const previous = this.status.fast;
      this.status.fast = {
        at: Date.now(),
        bar,
        ms,
        workerMs,
        workerProfile: result.profile,
        delayMs: Math.max(0, Date.now() - barEnd),
        seated: this.paper.selected.length,
        open: this.paper.positions.length,
        added: this.paper.positions.length - before,
        phase: "incremental",
        cycles: (previous?.cycles ?? 0) + 1,
        maxMs: Math.max(previous?.maxMs ?? 0, ms),
        overBudget: (previous?.overBudget ?? 0) + Number(ms >= 500),
        error: allowEntries ? null : "state caught up; stale entries suppressed",
      };
      this.emit("paper");
    } catch (error) {
      if (gen !== this.gen || epoch !== this.fastEpoch) return;
      this.resetRealtime("realtime update failed");
      this.fastRetryAt = Date.now() + 5_000;
      // Do not keep retrying a partly advanced state or allocate a failed worker's workload on the ticker.
      this.dirty = true;
      this.status.fast = {
        at: Date.now(),
        bar,
        ms: performance.now() - t0,
        seated: 0,
        open: this.paper.positions.length,
        added: 0,
        phase: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.fastBusy = false;
    }
  }

  // ── runtime.cycle "incremental" ───────────────────────────────────────────────────────────────────────────
  /** the tail universe of the running/last compute (set when it is built, taken by incCapture after its paper step) */
  private incTail: ReturnType<typeof makeUniverse> | null = null;
  /** why the last cycle was a full compute although runtime.cycle is "incremental" */
  private incWhy: string | undefined;
  /** the incremental state of the last heavy compute: the validated set and its continued tapes */
  private inc: {
    state: IncrementalState;
    /** ids the paper step sees in a light cycle: seats, signal tapes, configs holding a position */
    ids: Set<string>;
    /** validated ids that are not resumable (DCA, Axis, signals, Exit): rebuilt over the grown universe each cycle */
    others: Set<string>;
    hour: number;
    since: number;
    heavyBar: number;
  } | null = null;

  /** The hour (in ms) the book is stepped at, from the newest bar. */
  private incHour(): number {
    return Math.floor((this.status.lastBarT + this.settings.tfMin * 60_000) / H);
  }

  /** Whether this cycle may continue the validated tapes instead of computing everything. */
  private lightEligible(): boolean {
    const inc = this.inc;
    const s = this.settings;
    const why = (w: string) => {
      this.incWhy = w;
      if (s.runtime?.cycle === "incremental")
        this.status.cycleMode = { ...(this.status.cycleMode ?? { lightSince: 0, heavyBar: 0, validated: 0, continued: 0, rebuilt: 0 }), mode: "full", why: w };
      return false;
    };
    if (s.runtime?.cycle !== "incremental") return false;
    if (!inc) return why("no validated set captured yet");
    if (this.dirty) return why("dirty (settings or a requested compute)");
    if (this.resetUniverse || this.settingsStale) return why("settings or universe changed");
    if (this.replay) return why("replay");
    if (this.memFallback > 0) return why("memory fallback");
    if (!this.sim || !this.lastSelection || !this.fastArgs) return why("no run yet");
    if (this.incHour() !== inc.hour) return why("new hour: the seats are stepped");
    if (inc.since >= Math.max(1, Math.round(s.runtime?.heavyEveryBars ?? 60))) return why("heavy interval");
    return true;
  }

  /** After a heavy compute and its paper step: take the validated set's resumable tapes into the incremental state. */
  private async incCapture(gen: number): Promise<void> {
    this.inc = null;
    const wu = this.incTail;
    this.incTail = null;
    const sel = this.lastSelection;
    if (!wu || !sel || !this.fastArgs) return;
    const captureRevision = computeKey(this.settings, this.wf);
    const capturedArgs = this.fastArgs;
    const s = this.settings;
    // Paper has already selected exact Signal configs using their own symbol/direction evidence.
    // Fast Paper ticks only consider paper.selected, so seeding all discovered Signal tapes here
    // wastes work without making them eligible. Heavy evaluation retains full discovery history.
    const ids = new Set<string>([...sel.picks.map((p) => p.id), ...this.paper.selected, ...this.paper.positions.map((p) => p.cfg)]);
    const validated = this.tapes.filter((tp) => ids.has(tp.id));
    const state = new IncrementalState(wu, s.cost, s.tactics, s.tfMin);
    const others = new Set<string>();
    // in slices: a seed is one full simulation of the config over the tail
    for (let i = 0; i < validated.length; i += 8) {
      const r = state.seed(validated.slice(i, i + 8));
      for (const id of r.skipped) others.add(id);
      await yieldNow();
      if (gen !== this.gen || this.resetUniverse || capturedArgs !== this.fastArgs ||
          captureRevision !== computeKey(this.settings, this.wf)) return;
    }
    this.inc = { state, ids, others, hour: this.incHour(), since: 0, heavyBar: this.status.lastBarT };
    this.status.cycleMode = { mode: "full", lightSince: 0, heavyBar: this.status.lastBarT, validated: validated.length, continued: state.entries.size, rebuilt: others.size, why: this.incWhy };
  }

  /**
   * A light cycle: the universe grown by the closed bars, the validated tapes continued over them (the resumable ones
   * from their stored state, the others rebuilt on the grown universe), then the caller's paper step. False: nothing was
   * changed and the caller computes in full.
   */
  private async lightStep(gen: number): Promise<boolean> {
    const inc = this.inc;
    if (!inc) return false;
    const economicRevision = computeKey(this.settings, this.wf);
    const superseded = () => {
      if (gen === this.gen && this.inc === inc && !this.resetUniverse &&
        economicRevision === computeKey(this.settings, this.wf)) return false;
      if (this.inc === inc) this.inc = null;
      return true;
    };
    const t0 = performance.now();
    this.dirty = false;
    this.status.state = "computing";
    const prev = this.status.phases;
    this.status.phases = {};
    for (const k of ["Paper", "Adjust", "Audit", "Compare"]) if (prev[k]) this.status.phases[k] = prev[k];
    const candles = new Map(this.candles);
    const settings = this.settings, wf = this.wf;
    const step = inc.state.step(candles);
    await yieldNow();
    if (superseded()) return true;
    if (!step) {
      this.inc = null;
      return false;
    }
    const tExt = performance.now();
    const repl = new Map<string, ConfigTape>(step.tapes);
    const need = new Set<string>([...inc.others, ...step.broken]);
    if (need.size) {
      const needsSignal = [...need].some((id) => isSignalInd(id.split("|")[1] ?? ""));
      const signalU = needsSignal
        ? makeUniverse(signalLaneSeriesFrom(candles, settings, wf), this.evaluationFromT)
        : inc.state.universe;
      const rebuilt = await this.rebuildOnUniverse(inc.state.universe, need, gen, signalU);
      if (superseded()) return true;
      if (!rebuilt) {
        // the rebuild could not run (no workers and no time): the continued tapes are dropped with it, compute in full
        this.inc = null;
        return false;
      }
      for (const tp of rebuilt) repl.set(tp.id, tp);
    }
    const tMerge = performance.now();
    // the realtime entry step stands aside while the tapes are replaced, until the paper step has run on them
    this.fastHold = true;
    await this.paperIdle();
    if (superseded()) return true;
    this.tapes = this.tapes.map((tp) => repl.get(tp.id) ?? tp);
    this.tapeIdx = null;
    inc.since++;
    this.status.phases.Light = {
      ms: performance.now() - t0,
      maxSliceMs: 0,
      slowest: `grow + continue ${Math.round(tExt - t0)} · rebuild ${Math.round(tMerge - tExt)} · merge ${Math.round(performance.now() - tMerge)} ms · ${step.tapes.size} continued, ${need.size} rebuilt`,
    };
    this.status.cycleMode = { mode: "light", lightSince: inc.since, heavyBar: inc.heavyBar, validated: inc.ids.size, continued: step.tapes.size, rebuilt: need.size };
    return true;
  }

  /** The configs `ids` rebuilt on `u` with the last compute's tape arguments (exactly the heavy compute's builder). */
  private async rebuildOnUniverse(u: ReturnType<typeof makeUniverse>, ids: ReadonlySet<string>, gen: number, signalUniverse?: ReturnType<typeof makeUniverse>): Promise<ConfigTape[] | null> {
    const a = this.fastArgs;
    if (!a) return null;
    const s = this.settings;
    const byId = this.tapeIndex();
    const sets = { main: new Set<string>(), sig: new Set<string>(), coord: new Set<string>(), exit: new Set<string>(), exitSig: new Set<string>() };
    const pairs = { main: new Set<string>(), sig: new Set<string>(), coord: new Set<string>(), exit: new Set<string>(), exitSig: new Set<string>() };
    for (const id of ids) {
      const tp = byId.get(id);
      if (!tp) continue;
      const k = tp.kind === "exit" ? isSignalInd(tp.ind) ? "exitSig" : "exit" : isSignalCoordinationInd(tp.ind) ? "coord" : isSignalInd(tp.ind) ? "sig" : "main";
      sets[k].add(id);
      pairs[k].add(`${tp.bot}|${tp.ind}`);
    }
    // Incremental strategy history is shorter than the independently configured Signal history.
    const signalU = signalUniverse ?? (sets.sig.size || sets.coord.size || sets.exitSig.size
      ? makeUniverse(signalLaneSeriesFrom(this.candles, s, this.wf), u.evaluationFromT)
      : u);
    const out: ConfigTape[] = [];
    if (workersAvailable() && !this.workersBroken) {
      const shared = { main: shareBars(u.series), sig: shareBars(signalU.series) };
      const msgs: Array<Record<string, unknown>> = [];
      for (const k of ["main", "sig", "coord", "exit", "exitSig"] as const)
        if (sets[k].size)
          msgs.push({
            type: "tapes",
            bars: shared[k === "sig" || k === "coord" || k === "exitSig" ? "sig" : "main"],
            evaluationFromT: u.evaluationFromT,
            pairs: [...pairs[k]],
            protects: a[k].protects,
            cost: s.cost,
            dcaOpt: a[k].dcaFor,
            tactics: s.tactics,
            adjust: a.adjust,
            floors: { ...a[k].floors, onlyIds: sets[k] },
          });
      if (!msgs.length) return out;
      const res = await runOnWorkers<{ tapes: ConfigTape[] }>(msgs, poolSize(), 120_000, undefined, true);
      if (gen !== this.gen) return null;
      for (const r of res) out.push(...r.tapes);
      return out;
    }
    for (const k of ["main", "sig", "coord", "exit", "exitSig"] as const) {
      if (!sets[k].size) continue;
      const g = buildTapesGen(k === "sig" || k === "coord" || k === "exitSig" ? signalU : u, a[k].protects, s.cost, a[k].dcaFor as never, pairs[k], s.tactics, a.adjust, { ...a[k].floors, onlyIds: sets[k] });
      out.push(...(await this.drive("Tapes", g, () => undefined, gen)));
    }
    return out;
  }

  /** the seats of the last full paper step (the realtime entry step keeps them) */
  /** the validated set V of the current simulation and the tapes it selects from (wf.seatSet "validated") */
  private validatedCache: { sim: WalkForwardResult; tapes: readonly ConfigTape[]; v: ReadonlySet<string>; list: ConfigTape[] } | null = null;
  private lastSelection: Pick<ReturnType<typeof withProbe>, "picks" | "eligible"> | null = null;
  private lastSelectionAt = 0;
  /** what the last live control step saw (controlDue) */
  private controlSeen: { positions: unknown; live: unknown; bar: number; at: number } | null = null;
  /** a stop crossed / a trailing stop moved since the last live control step (kept while a step is in flight) */
  private controlUrgent = false;
  /** Coalesced completed-book notification; never queue one exchange task per config. */
  private liveReadyQueued = false;
  private controlTrail = false;
  /** Whether the live control step runs on this tick (CONTROL_IDLE_MS); a step that starts takes the flags. */
  private controlDue(): boolean {
    const seen = this.controlSeen;
    const since = seen ? Date.now() - seen.at : Infinity;
    const due =
      !seen ||
      this.controlUrgent ||
      seen.positions !== this.paper.positions ||
      seen.live !== this.settings.live ||
      seen.bar !== this.status.lastBarT ||
      since >=
        (this.liveOrdersActive || this.paper.positions.length > 0
          ? EXECUTION_INTERVAL_MS
          : CONTROL_IDLE_MS) ||
      (this.controlTrail && since >= CONTROL_TRAIL_MS);
    if (due) {
      this.controlSeen = {
        positions: this.paper.positions,
        live: this.settings.live,
        bar: this.status.lastBarT,
        at: Date.now(),
      };
      this.controlUrgent = false;
      this.controlTrail = false;
    }
    return due;
  }

  /** Changed settings cannot admit entries; existing owned stops/reductions keep progressing. */
  executionEntryBlocked(): boolean {
    return this.executionPending || this.settingsStale || this.resetUniverse;
  }

  /** Release only a fully persisted, current book; diagnostics/cache preparation do not gate execution. */
  private releaseExecutionBook(gen: number): boolean {
    if (gen !== this.gen || this.stopped || this.paperRunning || this.dirty ||
        this.resetUniverse || this.settingsStale) return false;
    this.paperStepped = true;
    this.executionPending = false;
    this.controlUrgent = true;
    this.liveReadyQueued = true;
    this.progressLive();
    return true;
  }

  /** Independent of the paper tick, bar pulls and strategy compute. Exchange calls remain serialized. */
  private progressLive() {
    if (
      !this.stopped &&
      (this.paperStepped || this.liveOrdersActive) &&
      this.onLive &&
      this.settings.live.enabled &&
      !this.liveBusy &&
      this.controlDue()
    ) {
      // the live step runs detached: the tick (marking to market) never waits on the exchange; a step never
      // overlaps the previous one (no duplicate orders), and one in flight too long is reported
      this.liveBusy = true;
      this.liveReadyQueued = false;
      this.liveStartedAt = Date.now();
      const epoch = this.liveEpoch;
      const gen = this.gen;
      // overall mode never reads the pending entries (the control sizes its positions from the lanes): computed before
      // every step (Block books, symbol stats, signal acceptance) they held the loop 0.5–1.6 s at a time and fed the
      // collector's multi-second pauses (x02, 7 Oct profile) — there they only refresh the status' "pending:"
      // reasons, every PENDING_STATUS_MS
      const onLive = this.onLive;
      void (async () => {
        await Promise.resolve();
        if (this.stopped || epoch !== this.liveEpoch || gen !== this.gen) return;
        let intents: LiveIntent[] = [];
        if (!this.executionEntryBlocked() && (this.settings.live.mode ?? "overall") !== "overall") {
          this.livePhase = "pending entries";
          const paper = this.paper, tapes = this.tapes;
          const planned = await this.driveSliced("Live planning", this.pendingEntriesGen(), gen, () => undefined);
          if (this.stopped || epoch !== this.liveEpoch || gen !== this.gen) return;
          if (paper !== this.paper || tapes !== this.tapes || this.executionEntryBlocked()) return;
          intents = planned;
          this.pendingAt = Date.now();
        }
        if (this.stopped || epoch !== this.liveEpoch || gen !== this.gen) return;
        this.livePhase = "start";
        await onLive(this, intents, gen);
      })()
        .catch((err) =>
          this.db.event("error", `live step failed: ${err instanceof Error ? err.message : err}`),
        )
        .finally(() => {
          // a step the watchdog abandoned never clears the flag of the step that replaced it
          if (epoch !== this.liveEpoch) return;
          this.liveBusy = false;
          this.liveSlowNoted = false;
          // the stall watch names the live phase in flight: none once the step is done (a stall between steps
          // was booked on the last step's last phase — "Base · live lane orders" while nothing ran)
          this.livePhase = "";
          if (this.liveReadyQueued) this.progressLive();
        });
    } else if (this.liveBusy && Date.now() - this.liveStartedAt > LIVE_STEP_LIMIT_MS) {
      // watchdog: a step that never returns (an await without its own limit) would freeze Live for good — no
      // opens, and no closes when lanes end. It is abandoned: its epoch is gone, so it sends nothing more (it
      // checks alive() before every order), and the next tick starts a fresh step that re-reads the book.
      const stuck = this.livePhase;
      this.liveEpoch++;
      this.liveBusy = false;
      this.liveSlowNoted = false;
      this.db.event(
        "warn",
        `live step abandoned after ${Math.round((Date.now() - this.liveStartedAt) / 1000)} s (waiting on: ${stuck || "?"}) — a new step takes over`,
      );
    } else if (this.liveBusy && !this.liveSlowNoted && Date.now() - this.liveStartedAt > 60_000) {
      this.liveSlowNoted = true;
      this.db.event(
        "warn",
        `live step in flight for over 60 s (waiting on: ${this.livePhase || "?"})`,
      );
    }
  }

  /** when the realtime market loop last pulled bars */
  private marketPullAt = 0;
  /**
   * The realtime market loop: while a compute runs (the cycle is busy for minutes), newly closed bars are still pulled
   * every cycleMs — the realtime entry step and the status work on the current market, and the next cycle computes on
   * them (barsPending). Real market only, never during a backfill or a universe change.
   */
  private marketLoop() {
    if (
      !this.busy ||
      (this.status.state !== "computing" && !this.comparing) ||
      this.status.state === "backfill" ||
      this.pulling ||
      this.replay ||
      this.market !== "bingx" ||
      this.status.source !== "bingx"
    )
      return;
    // A progressive startup may spend minutes computing the first loaded batch before backfillKey is set. Keep
    // those loaded symbols current during the compute; the compute's captured candle views remain immutable.
    // Backfill itself and a changed universe are still excluded, and offline replays never poll wall-clock bars.
    if (this.resetUniverse || !this.candles.size) return;
    if (Date.now() - this.marketPullAt < Math.max(250, this.settings.cycleMs)) return;
    this.marketPullAt = Date.now();
    const gen = this.gen;
    void this.pullNewBars(gen)
      .then((n) => {
        if (n > 0 && gen === this.gen) this.barsPending = true;
      })
      .catch(() => undefined);
  }

  /** Inspection-only marks never hold the ticker for a transaction over the complete position book. */
  private async persistMtm(positions: PaperBook["positions"], gen: number) {
    this.mtmWriting = true;
    try {
      for (let i = 0; i < positions.length; i += 100) {
        if (gen !== this.gen || this.stopped) return;
        this.db.tx(() => {
          for (const p of positions.slice(i, i + 100))
            this.db.run(
              "UPDATE paper_positions SET mtm = ?, at = ? WHERE cfg = ? AND sym = ? AND side = ? AND entry_t = ?",
              p.mtm,
              Date.now(),
              p.cfg,
              p.sym,
              p.side,
              p.entryT,
            );
        });
        if (i + 100 < positions.length) await yieldNow();
      }
    } catch (error) {
      this.db.event("warn", `mark persistence: ${error instanceof Error ? error.message : error}`);
    } finally {
      this.mtmWriting = false;
    }
  }

  async tick() {
    if (this.ticking || this.stopped) return;
    this.ticking = true;
    const t0 = performance.now();
    try {
      this.marketLoop();
      if (FAST_ENTRIES && !this.replay) void this.fastStep();
      // follow the universe with the price stream
      const syms = this.status.symbols;
      const key = syms.join(",");
      if (this.stream && key && key !== this.streamKey) {
        this.streamKey = key;
        this.stream.follow(syms);
      }
      // Revisit a symbol only when its price moved or a protected lane completed a bar. Flat completed bars still
      // update Exit's volatility/TP state and trailing peaks; cache the next boundary instead of scanning every tick.
      const book = this.tickBook();
      const paper = this.paper;
      const positions = paper.positions;
      const nowMs = Date.now(),
        gen = this.gen;
      const prices = Object.fromEntries(
        book.groups.flatMap((g) => {
          const px = this.stream?.price(g.sym) ?? this.candles.get(g.sym)?.lastC();
          return px ? [[g.sym, px]] : [];
        }),
      );
      let marked: TickMathResult | undefined;
      if (positions.length >= 256 && this.tickWorker.available && nowMs >= this.tickRetryAt) {
        const init = this.tickSentBook !== book;
        try {
          const reply = await this.tickWorker.run<{ result: TickMathResult }>(
            {
              type: init ? "tick-init" : "tick-advance",
              prices,
              now: nowMs,
              ...(init
                ? {
                    positions,
                    units: book.units,
                    cost: book.cost,
                    baseTfMin: book.baseTfMin,
                    trailFree: book.trailFree,
                  }
                : {}),
            },
            init ? 3_000 : 750,
          );
          if (gen !== this.gen || paper !== this.paper || this.stopped) return;
          marked = reply.result;
          this.tickSentBook = book;
          book.math = null;
        } catch (error) {
          if (gen !== this.gen || paper !== this.paper || this.stopped) return;
          this.tickWorker.dispose(new Error("tick worker failed; sliced control recovery"));
          this.tickSentBook = null;
          this.tickRetryAt = Date.now() + 5_000;
          this.db.event(
            "warn",
            `tick worker: ${error instanceof Error ? error.message : error}; sliced recovery`,
          );
        }
      }
      if (!marked) {
        book.math ??= new TickMathBook(
          // The sliced fallback needs the same private ownership as the worker. Otherwise readers can observe
          // 127 new marks alongside the previous equity while the generator yields to the audit/control loop.
          positions.map(p => ({ ...p, ...(p.exitProtection ? { exitProtection: { ...p.exitProtection } } : {}) })),
          book.units,
          book.cost,
          book.baseTfMin,
          book.trailFree,
        );
        const steps = book.math.advanceGen(prices, nowMs);
        let completed = false;
        try {
          for (;;) {
            const next = steps.next();
            if (next.done) {
              marked = next.value;
              completed = true;
              break;
            }
            await yieldNow();
            if (gen !== this.gen || paper !== this.paper || this.stopped) return;
          }
        } finally {
          // A canceled/failed partial advance cannot seed the next frame's cached sums or protection state.
          if (!completed) book.math = null;
        }
      }
      // No await between publishing owned marks/protection and their matching equity below.
      for (const patch of marked.patches) Object.assign(positions[patch.index], patch.values);
      const { open, hits: newHits, trailMoved } = marked;
      if (newHits) this.controlUrgent = true;
      if (trailMoved) this.controlTrail = true;
      // the tick's stop crossings persisted in one write (a read and a write of every hit per crossing before)
      if (newHits) {
        const hits =
          this.db.kvGet<Record<string, { at: number; stop: number; px?: number }>>("stopHits") ??
          {};
        this.db.kvSet("stopHits", Object.assign(hits, newHits));
      }
      this.paper.equity = (this.paper.carried ?? 0) + this.closedPaperSum() + open;
      this.paper.balance = this.settings.paperBalance + this.paper.equity;
      // the stored marks are for inspection only (nothing reads them back; the book lives in memory and the state
      // file): every 30 s — every second it rewrote every paper position (17k rows on x01)
      if (Date.now() - this.lastMtmWrite > 30_000 && positions.length && !this.mtmWriting) {
        this.lastMtmWrite = Date.now();
        void this.persistMtm(positions, gen);
      }
      // Status-only diagnostics stay off the dedicated execution timer.
      if (
        this.paperStepped &&
        this.settings.live.enabled &&
        this.onLive &&
        (this.settings.live.mode ?? "overall") === "overall" &&
        !this.executionEntryBlocked() &&
        Date.now() - this.pendingAt >= PENDING_STATUS_MS
      ) {
        await this.driveSliced("Pending status", this.pendingEntriesGen(), this.gen, () => undefined);
        if (this.stopped) return;
        this.pendingAt = Date.now();
      }
      this.progressLive();
      const st = this.stream?.stats() ?? null;
      const prev = this.status.tick ?? blankTick();
      this.status.tick = {
        at: Date.now(),
        ms: performance.now() - t0,
        count: prev.count + 1,
        open: this.paper.positions.length,
        stream: st,
        error: null,
      };
    } finally {
      this.ticking = false;
    }
  }

  /** Stop now: the in-flight cycle is abandoned at its next yield (a new generation), nothing half-published. */
  stop() {
    this.resetRealtime("runtime stopped");
    this.cancelBacktests("backtest canceled: runtime stopped");
    this.baseConfigRunner.cancel("stopped");
    this.cancelCompare("runtime stopped");
    this.researchAbort?.abort(new Error("research canceled: runtime stopped"));
    this.stopTick();
    this.stopped = true;
    this.gen++;
    this.paperOwner = null;
    this.paperRunning = false;
    this.busy = false;
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.status.state = "stopped";
    this.db.event("info", "runtime stopped");
    this.emit("state");
  }

  /**
   * Releases what keeps a stopped runtime reachable: the stall watch (started in the constructor), the healer, the
   * memory-guard timer, the progress timeout and the event-loop monitor. Tests and scripts only — a desk's runtime
   * lives as long as its process. stop() alone leaves the stall watch and the healer running, so every runtime a test
   * built stayed in memory until its file ended (runtime.test.ts reached 7.3 GB, 13 Oct). Preset tasks are canceled
   * before any worker shutdown; backtestsSettled() drains their continuations. The database is not closed because
   * an abandoned engine cycle may still write to it before it sees the stopped generation.
   */
  dispose() {
    this.disposed = true;
    this.cancelBacktests("backtest canceled: runtime disposed");
    if (!this.stopped) this.stop();
    for (const t of [this.stallTimer, this.healer, this.memTimer]) if (t) clearInterval(t);
    this.stallTimer = null;
    this.healer = null;
    this.memTimer = null;
    if (this.progressTimer) clearTimeout(this.progressTimer);
    this.progressTimer = null;
    this.stallProbe?.stop();
    this.stallProbe = null;
    this.loop.disable();
  }

  /**
   * Resolves once no live step is in flight (true), or after `ms` (false). After stop() a step finishes the order
   * it is on (an open is followed by its protective stop) and then breaks: a restart that exits before that can
   * leave an opened position without its stop, or the own-quantity ledger without the last fill.
   */
  async liveSettled(ms = 20_000): Promise<boolean> {
    const until = Date.now() + ms;
    while (this.liveBusy) {
      if (Date.now() >= until) return false;
      await new Promise((r) => setTimeout(r, 50));
    }
    return true;
  }

  /**
   * Process shutdown (service stop / update / reboot): stop the loop, then persist everything that would
   * otherwise wait for its interval — the durable settings / presets and the SQLite snapshot (stats, trades,
   * runs, evals). The next start restores both.
   */
  shutdown(reason = "shutdown"): { snapshot: boolean } {
    this.cancelBacktests(`backtest canceled: ${reason}`);
    if (!this.stopped) this.stop();
    if (this.stallTimer) clearInterval(this.stallTimer);
    this.stallTimer = null;
    this.flushLive?.();
    // the event is part of the snapshot (a restart shows why it stopped); a failed snapshot adds its own error event
    // (db.snapshot) and leaves the previous snapshot in place
    this.db.event(
      "info",
      `${reason}: state saved${this.snapshotPath && !this.db.lastJournalError ? ", writing the snapshot" : ""}`,
    );
    let snapshot = false;
    if (this.snapshotPath && !this.db.lastJournalError) snapshot = this.db.snapshot(this.snapshotPath);
    else if (this.snapshotPath) this.db.event("error", "snapshot skipped: live journal recovery requires reconciliation");
    this.db.flushState();
    return { snapshot };
  }

  /** Watchdog: if a cycle has not beaten for a long time, abandon it (new generation) and start fresh. */
  ensureAlive() {
    if (this.status.state === "idle") return this.start();
    if (this.stopped) return;
    // a loop that is merely waiting out an error backoff (timer set) is not stale
    const waitingBackoff =
      !this.busy && this.timer !== null && this.status.nextCycleAt > Date.now() - 60_000;
    // a cycle waiting on the worker cores is alive while they keep replying (each message has its own
    // 15-minute time-out): long Base / tape phases on many symbols are not abandoned and restarted
    const w = workerActivity();
    const onWorkers = this.busy && w.inFlight > 0 && Date.now() - w.at < 16 * 60_000;
    const stale =
      !waitingBackoff &&
      !onWorkers &&
      Date.now() - this.status.heartbeat > Math.max(180_000, this.settings.cycleMs * 8);
    if (stale) {
      this.db.event("warn", "watchdog: loop stale, starting a new generation");
      this.baseConfigRunner.cancel("newGeneration");
      this.cancelCompare("new generation");
      this.researchAbort?.abort(new Error("research canceled: new generation"));
      this.gen++;
      this.paperOwner = null;
      this.paperRunning = false;
      this.resetRealtime("watchdog generation replaced");
      this.busy = false;
      this.dirty = true;
      this.status.heartbeat = Date.now();
      this.schedule(0);
    }
  }

  private noteHeal(msg: string, level: "info" | "warn" = "warn") {
    this.status.heals++;
    this.status.lastHeal = `${new Date().toISOString().slice(11, 19)} ${msg}`;
    this.db.event(level, `self-heal: ${msg}`);
  }

  /**
   * Periodic self-healing (every 30 s, independent of viewers):
   *  - stale loop → new generation (ensureAlive)
   *  - a lost timer (nothing scheduled while not busy / stopped) → reschedule
   */
  /** Fields added in newer code versions, for an instance re-bound after a dev hot reload. */
  ensureFields() {
    const self = this as unknown as Record<string, unknown>;
    if (!self.fastWorker || typeof (self.fastWorker as OwnedWorker).run !== "function")
      self.fastWorker = new OwnedWorker(512);
    if (!self.tickWorker || typeof (self.tickWorker as OwnedWorker).run !== "function")
      self.tickWorker = new OwnedWorker(128);
    for (const field of [
      "fastEpoch",
      "fastCount",
      "fastRetryAt",
      "nextResearchAt",
      "tickEpoch",
      "tickRetryAt",
    ])
      if (typeof self[field] !== "number") self[field] = 0;
    for (const field of ["fastReady", "mtmWriting"])
      if (typeof self[field] !== "boolean") self[field] = false;
    for (const field of [
      "fastPreparing",
      "fastTask",
      "paperOwner",
      "tickSentBook",
      "realtimeLearning",
      "researchAbort",
      "tickerMetadata",
    ])
      if (self[field] === undefined) self[field] = null;
    if (!self.fastEnds) self.fastEnds = {};
    if (this.fastArgs && (!this.fastArgs.bars || !this.fastArgs.exit || !this.fastArgs.exitSig)) {
      this.fastArgs = null;
      this.dirty = true;
    }
    if (!(self.btCandles instanceof Map)) self.btCandles = new Map();
    if (self.stallProbe === undefined) self.stallProbe = null;
    // candles of an earlier version (Candle[]) become series in a NEW map, in their order (code of the earlier module
    // still running — a compute's lane loop, a backtest — keeps the map it holds and its arrays); its backtest cache
    // restarts
    const prev = this.candles as Map<string, unknown>;
    if (prev instanceof Map && [...prev.values()].some((cs) => Array.isArray(cs))) {
      this.candles = new Map(
        [...prev].map(([sym, cs]) => [
          sym,
          Array.isArray(cs) ? CandleSeries.fromCandles(cs as Candle[]) : (cs as CandleSeries),
        ]),
      );
      (self.btCandles as Map<string, unknown>).clear();
    }
    if (self.backtestJob === undefined) self.backtestJob = null;
    if (typeof self.lastConsoleAt !== "number") self.lastConsoleAt = 0;
    if (typeof self.backfillKey !== "string") self.backfillKey = "";
    if (self.audit === undefined) self.audit = null;
    if (typeof self.paperStepped !== "boolean") self.paperStepped = false;
    if (typeof self.executionPending !== "boolean") self.executionPending = !!self.settingsStale;
    if (!self.baseConfigRunner) {
      this.baseConfigs = null;
      this.baseConfigRunner = this.makeBaseConfigRunner();
      this.baseConfigRunner.restore(this.db.kvGet<BaseConfigSnapshot>("baseConfigCounts"));
    }
    if (typeof self.lastTrim !== "number") self.lastTrim = 0;
    if (self.stream === undefined) self.stream = null;
    if (self.tickTimer === undefined) self.tickTimer = null;
    if (self.executionProgress === undefined) self.executionProgress = null;
    if (typeof self.liveOrdersActive !== "boolean") self.liveOrdersActive = false;
    if (typeof self.ticking !== "boolean") self.ticking = false;
    if (typeof self.liveBusy !== "boolean") self.liveBusy = false;
    if (typeof self.liveStartedAt !== "number") self.liveStartedAt = 0;
    if (typeof self.liveSlowNoted !== "boolean") self.liveSlowNoted = false;
    if (typeof self.streamKey !== "string") self.streamKey = "";
    if (typeof self.lastMtmWrite !== "number") self.lastMtmWrite = 0;
    if (typeof self.restTickersAt !== "number") self.restTickersAt = 0;
    if (!(self.klinesPace instanceof Map)) self.klinesPace = new Map();
    if (typeof self.klinesResumeAt !== "number") self.klinesResumeAt = 0;
    if (typeof self.lastProgressEmit !== "number") self.lastProgressEmit = 0;
    if (self.progressTimer === undefined) self.progressTimer = null;
    if (typeof self.jobOpen !== "boolean") self.jobOpen = false;
    if (typeof self.jobBackfill !== "boolean") self.jobBackfill = false;
    if (typeof self.inCycle !== "boolean") self.inCycle = false;
    if (!self.stepSlices || typeof self.stepSlices !== "object") self.stepSlices = {};
    if (typeof self.computeSummary !== "string") self.computeSummary = "";
    if (typeof self.prehistBatch !== "number") self.prehistBatch = 0;
    if (typeof self.lastLiveEmit !== "number") self.lastLiveEmit = 0;
    if (typeof self.lastEmittedState !== "string") self.lastEmittedState = "";
    // a running runtime from an older module version gets the tick loop it did not have
    if (!this.stopped && this.status.state !== "idle") this.startTick();
    if (typeof self.lastAuditKey !== "string") self.lastAuditKey = "";
    if (typeof self.tickersAt !== "number") self.tickersAt = 0;
    if (typeof self.workersBroken !== "boolean") self.workersBroken = false;
    if (!(self.staleUntil instanceof Map)) self.staleUntil = new Map();
    if (!(self.prehistSyms instanceof Map)) self.prehistSyms = new Map();
    if (typeof self.prehistTotal !== "number") self.prehistTotal = 0;
    if (typeof self.prehistPending !== "boolean") self.prehistPending = false;
    if (typeof self.prehistStartedAt !== "number") self.prehistStartedAt = 0;
    if (typeof self.prehistReadyAt !== "number") self.prehistReadyAt = 0;
  }

  async heal() {
    // backtest market data at other timeframes is kept 10 minutes at most
    for (const [tf, c] of this.btCandles)
      if (Date.now() - c.at > 10 * 60_000) this.btCandles.delete(tf);
    // logs stay bounded even while every cycle fails
    try {
      this.db.trim();
    } catch {
      /* trimming is best-effort */
    }
    if (
      this.backtestJob?.state === "running" &&
      Date.now() - this.backtestJob.startedAt > BACKTEST_LIMIT_MS + 60_000
    ) {
      this.cancelBacktest("backtest exceeded its 15 min limit — aborted");
    }
    if (this.stopped) return;
    const beforeGen = this.gen;
    this.ensureAlive();
    if (this.gen !== beforeGen) this.noteHeal("stale loop replaced by a new generation");
    if (!this.busy && !this.timer && !this.stopped && this.status.state !== "idle") {
      this.noteHeal("no cycle scheduled, rescheduling");
      this.schedule(0);
    }
  }

  updateSettings(patch: SettingsPatch, wfPatch?: Partial<WalkForwardOptions>) {
    const prevUniverse = `${this.settings.symbols}|${this.settings.tfMin}|${evaluationHistorySettings(this.settings, this.wf).historyDays}|${this.settings.symbolRank}|${this.settings.symbolOffset ?? 0}|${(this.settings.forceSymbols ?? []).join(",")}`;
    const prevCompute = computeKey(this.settings, this.wf);
    const next = mergeSettings(this.settings, patch);
    if (patch.grid) {
      checkLowRangeComplete(next.grid);
      checkRangeReplacementsComplete(next.grid);
      checkSettings({ grid: next.grid });
    }
    // a connection's runtime always trades its own connection (switching is done by selecting another runtime)
    if (this.conn) next.live = { ...next.live, connId: this.conn };
    // limits on the MERGED settings (a patch alone could bypass them across several saves)
    // position cost follows its components when they are edited (taker fee + slippage per side, × 2)
    if (patch.fees && patch.cost === undefined)
      next.cost = boundedModelCost(+roundTripCostFromFees(next.fees).toFixed(5));
    // a high ceiling, not a working limit (operator: process freely): it only catches a grid that would not fit in
    // memory at all
    checkGridVariantBudget(next.grid, next.cost);
    // the two acceptance gates keep their operator-set ranges (the Settings choices): PF 1.05-1.5, drawdown max
    // 2-35 h. Everything else the sanitiser touches is taken as asked.
    next.gates.minPf = Math.min(1.5, Math.max(1.05, next.gates.minPf));
    next.gates.maxDdtH = Math.min(35, Math.max(2, next.gates.maxDdtH));
    this.settings = next;
    // Tightening the builder's ladder policy applies immediately to new admissions on the carried cohort.
    // Relaxing it waits for fresh Base/tapes rather than inventing eligibility from a settings toggle.
    let baseWideLadderPairs = this.wf.baseWideLadderPairs;
    if (
      next.axis.perRange &&
      baseWideLadderPairs &&
      [...baseWideLadderPairs].some((pair) => !this.wf.basePassedRanges?.[pair]?.includes(""))
    )
      baseWideLadderPairs = new Set(
        [...baseWideLadderPairs].filter((pair) => this.wf.basePassedRanges?.[pair]?.includes("")),
      );
    // the per-compute gates (active signals, guards, signal caps, adjust pauses) carry over until the next
    // compute sets them again — dropping them left paper / live ungated for a whole compute
    const carry = {
      signalActive: this.wf.signalActive,
      signalGuardN: this.wf.signalGuardN,
      signalCluster: this.wf.signalCluster,
      signalAccept: this.wf.signalAccept,
      signalSideAccept: this.wf.signalSideAccept,
      signalOwnBase: this.wf.signalOwnBase,
      signalSourceGate: this.wf.signalSourceGate,
      signalPerSymbol: this.wf.signalPerSymbol,
      signalMaxOpen: this.wf.signalMaxOpen,
      signalMaxPositions: this.wf.signalMaxPositions,
      // the Base gates of the last compute: without them every pair took seats until the next compute finished
      basePassed: this.wf.basePassed,
      basePassedCells: this.wf.basePassedCells,
      exitBasePassed: this.wf.exitBasePassed,
      basePassedRanges: this.wf.basePassedRanges,
      basePassedTargets: this.wf.basePassedTargets,
      baseWideLadderPairs,
      signalBasePassed: this.wf.signalBasePassed,
      family: this.wf.family,
      paused: this.wf.paused,
      // the demo probe survives a settings change, and never applies to the mainnet connection
      probe: next.live.connId === "bingx-x01" ? null : this.wf.probe,
    };
    this.wf = {
      ...defaultWalkForward(this.settings),
      ...pickWf(this.wf),
      ...sanitizeWf(wfPatch ?? {}),
      ...carry,
      // A settings patch or restored in-memory value cannot switch runtime execution back to the candidate pool.
      seatSet: "validated",
      gates: this.settings.gates,
      cost: this.settings.cost,
      toggles: this.settings.toggles,
      block: this.settings.block,
      dca: this.settings.dca,
      relate: { ...this.settings.relate, maxStack: Math.floor(Math.min(MAX_EXTERNAL_STACK, Math.max(1, this.settings.relate.maxStack))) },
      rangeGate: rangeGateOf(this.settings.grid),
      rangeSeats: this.settings.grid.rangeSeats === true,
    };
    // mainnet floors: real money trades only validated configs (last 25 at entry, last 50 for a seat) and only
    // once the simulated run is ready — whatever a preset or a settings patch says
    if (this.settings.live.connId === "bingx-x01") {
      // the last-N floors can only be waived by the operator of the host process, explicitly
      // (CTS_CORE_MAINNET_WAIVE_FLOORS=1): each config then trades on its own Base evaluation and window gates
      // (min PF, net, DDT, DDR) like the demo desk — settings, presets and patches never switch the floors off
      if (process.env.CTS_CORE_MAINNET_WAIVE_FLOORS !== "1") {
        this.wf.lastN = Math.max(MAINNET_LAST_N, this.wf.lastN ?? 0);
        this.wf.validLastN = Math.max(MAINNET_VALID_LAST_N, this.wf.validLastN ?? 0);
        this.wf.signalValidLastN = Math.max(MAINNET_SIGNAL_VALID_LAST_N, this.wf.signalValidLastN ?? 0);
        // per range too (wf.rangeOpts): a range's own last-N never goes below the floors either
        if (this.wf.rangeOpts) this.wf.rangeOpts = mainnetRangeFloors(this.wf.rangeOpts);
      } else if (!this.floorsWaivedNoted) {
        this.floorsWaivedNoted = true;
        this.db.event(
          "warn",
          "mainnet last-N floors waived by the operator (CTS_CORE_MAINNET_WAIVE_FLOORS=1): configs trade on their own Base evaluation and window gates",
        );
      }
      // the readiness check can only be waived by the operator of the host process, explicitly
      // (CTS_CORE_MAINNET_WAIVE_READY=1): settings, presets and patches never switch it off
      const waived = process.env.CTS_CORE_MAINNET_WAIVE_READY === "1";
      if (this.settings.live.requireReady === false && !waived)
        this.settings = { ...this.settings, live: { ...this.settings.live, requireReady: true } };
      if (this.settings.live.requireReady === false && waived)
        this.db.event(
          "warn",
          "mainnet readiness check waived by the operator (CTS_CORE_MAINNET_WAIVE_READY=1): validated configs trade whatever the simulated run PF",
        );
    }
    this.db.kvSet("settings", this.settings);
    this.db.kvSet("wf", pickWf(this.wf));
    this.status.settingsAt = Date.now();
    // a running cycle keeps its snapshot; the universe reset is applied at the start of the next cycle
    if (
      prevUniverse !==
      `${this.settings.symbols}|${this.settings.tfMin}|${evaluationHistorySettings(this.settings, this.wf).historyDays}|${this.settings.symbolRank}|${this.settings.symbolOffset ?? 0}|${(this.settings.forceSymbols ?? []).join(",")}`
    )
      this.resetUniverse = true;
    // live execution settings (limits, pause, margin floor) are read by the live step, not by the compute: a change
    // to them alone (or a patch that changes nothing, e.g. one re-applied on a restart) keeps the running compute —
    // marking it stale threw away its tapes, and a desk whose compute outlasts the patch interval never stepped paper
    const recompute = this.resetUniverse || computeKey(this.settings, this.wf) !== prevCompute;
    if (recompute) {
      // Shadow entries were skipped under the prior economic settings. They must not advance a new policy
      // when their hypothetical closes arrive; the next published simulation reconstructs its own shadows.
      this.relateShadowPending.clear();
      this.liveBooks = null;
      this.baseConfigRunner.cancel("settingsChanged");
      this.cancelCompare("settings changed");
    }
    this.db.event(
      "info",
      !recompute
        ? "settings updated — live only, the compute keeps its results"
        : this.busy
          ? "settings updated — applied after the running compute"
          : "settings updated",
    );
    this.emit("settings");
    if (recompute) this.kick();
  }

  /** Drop all candles and backfill again (applied at the start of the next cycle). */
  requestResync() {
    this.resetUniverse = true;
    this.kick();
  }

  /** Re-run the compute stages on the next cycle, now (or right after the running one). */
  kick() {
    this.resetRealtime("research revision requested");
    this.dirty = true;
    this.settingsStale = true;
    this.executionPending = true;
    this.status.pending = true;
    if (!this.busy && !this.stopped) this.schedule(0);
  }

  /**
   * Time to the next cycle: the next bar close (+2 s for the exchange to publish it), never later than cycleMs
   * (250 ms by default: a cycle with no closed bar does no exchange call and no stage) and never sooner than
   * 100 ms. The next cycle only starts after this one has finished (schedule is called from its end).
   * Open positions and the live step run on their own, faster tick (tickMs).
   */
  private nextInterval(): number {
    // a replayed window is not paced by the clock: the next compute follows at once (a short pause keeps the loop yielding)
    if (this.replay) return 200;
    const tfMs = this.settings.tfMin * 60_000;
    const now = Date.now();
    const toClose = Math.ceil(now / tfMs) * tfMs + 2_000 - now;
    return Math.max(100, Math.min(this.settings.cycleMs, toClose));
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    const gen = this.gen;
    this.status.nextCycleAt = Date.now() + ms;
    this.timer = setTimeout(() => {
      if (gen !== this.gen || this.stopped) return;
      this.timer = null;
      // never an unhandled rejection (it would end the process): log, back off, keep the loop alive
      this.cycle().catch((err) => {
        if (gen !== this.gen || this.stopped) return;
        this.status.error = err instanceof Error ? err.message : String(err);
        try {
          this.db.event("error", `cycle crashed: ${this.status.error}`);
        } catch {
          /* ignore */
        }
        if (!this.stopped) this.schedule(30_000);
      });
    }, ms);
    (this.timer as { unref?: () => void }).unref?.();
  }

  /**
   * Report the stage at work and its fraction (done / total, clamped to 0..1). Within a stage the fraction never
   * moves back (a stage that starts over — a new backfill batch, a new compute — passes `restart`); the overall
   * fraction of the job follows the stage spans (progress.ts).
   */
  private setStage(stage: string, done: number, total: number, label = "", restart = false) {
    const changed = stage !== this.status.stage;
    let p = total > 0 ? done / total : 0;
    p = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
    if (!changed && !restart) p = Math.max(p, this.status.progress);
    // when this stage (re)started: the UI shows how long a stage has run and how old its last report is
    if (changed || restart || !this.status.stageAt) this.status.stageAt = Date.now();
    this.status.stage = stage;
    this.status.progress = p;
    this.status.label = label;
    this.status.overall = overallOf(stage, p, this.status.overall ?? 0, this.jobBackfill);
    this.status.heartbeat = Date.now();
    this.emitProgress(changed || restart);
  }

  /** A fresh subphase resets its local bar even when it shares a stage name; overall job progress stays monotonic. */
  private startStage(stage: "Tapes" | "Signals", label: string) {
    this.setStage(stage, 0, 1, label, true);
  }

  /**
   * Progress is reported at most 4 × a second, and a throttled report is sent 250 ms later (the last fraction of a
   * stage was dropped, leaving the UI on e.g. "Signals 0 %" until the next stage); a new stage is reported at once.
   */
  private emitProgress(now = false) {
    const el = Date.now() - this.lastProgressEmit;
    if (now || el > 250) {
      if (this.progressTimer) clearTimeout(this.progressTimer);
      this.progressTimer = null;
      this.lastProgressEmit = Date.now();
      this.emit("progress");
      return;
    }
    if (this.progressTimer) return;
    this.progressTimer = setTimeout(
      () => {
        this.progressTimer = null;
        this.lastProgressEmit = Date.now();
        this.emit("progress");
      },
      Math.max(1, 250 - el),
    );
    (this.progressTimer as { unref?: () => void }).unref?.();
  }

  /**
   * A job (a backfill batch and / or a compute, then its paper step) starts: the overall bar starts at 0. A compute
   * after a backfill batch in the same cycle continues that job.
   */
  private beginJob(backfill: boolean) {
    if (this.jobOpen) return;
    this.jobOpen = true;
    this.jobBackfill = backfill;
    this.status.overall = 0;
  }

  /** The job is done: the stage rests on Realtime at 100 % with a summary. */
  private endJob(label: string) {
    this.jobOpen = false;
    this.setStage(DONE_STAGE, 1, 1, label, true);
    this.status.overall = 1;
  }

  private progressTimer: ReturnType<typeof setTimeout> | null = null;
  private jobOpen = false;
  private jobBackfill = false;
  /** a cycle() is running (a compute called directly — tests — closes its own job) */
  private inCycle = false;
  /** slices the paper step and the audit took last time (their progress estimate) */
  private stepSlices: Record<string, number> = {};
  /** the last compute's one-line summary (the label of the finished job) */
  private computeSummary = "";
  private lastProgressEmit = 0;
  private lastLiveEmit = 0;
  private lastEmittedState = "";
  /** Report an event (state changes are reported once per change). */
  emit(type: CoreEventType) {
    if (type === "state") {
      if (this.status.state === this.lastEmittedState) return;
      this.lastEmittedState = this.status.state;
    }
    if (type === "live") {
      // the live step runs with the tick: reported at most once a second
      if (Date.now() - this.lastLiveEmit < 1000) return;
      this.lastLiveEmit = Date.now();
    }
    if (!bus.size) return;
    const e: CoreEvent = {
      type,
      conn: this.conn ?? null,
      at: Date.now(),
      state: this.status.state,
      stage: this.status.stage,
      progress: this.status.progress,
      label: this.status.label,
      overall: this.status.overall ?? 0,
      computes: this.status.computes,
    };
    for (const fn of bus)
      try {
        fn(e);
      } catch {
        /* a listener's failure is its own */
      }
  }

  async cycle() {
    if (this.busy || this.stopped) return;
    const gen = this.gen;
    this.busy = true;
    const t0 = performance.now();
    let compareGen: number | null = null;
    this.inCycle = true;
    // a job left open by an abandoned cycle (watchdog, stop, error) never carries its bar into this one
    this.jobOpen = false;
    try {
      // An explicitly requested discovery run waits before pulling another universe; ordinary foreground
      // cycles remain free to pull new candles and continue validated sets during the background comparison.
      if (this.dirty && this.comparing) {
        await this.waitCompare();
        if (gen !== this.gen || this.stopped) return;
      }
      if (this.resetUniverse) {
        this.resetUniverse = false;
        this.fastBarDone = 0;
        this.candles.clear();
        this.backfillKey = "";
        this.staleUntil.clear();
        this.prehistSyms.clear();
        this.prehistTotal = 0;
        this.prehistBatch = 0;
        this.prehistPending = false;
        this.prehistStartedAt = Date.now();
        this.prehistReadyAt = 0;
        // the old universe's start ("complete · realtime running", its counts) is not shown while the new one loads
        this.status.prehistoric = undefined;
        this.db.run("DELETE FROM candles");
        this.db.run("DELETE FROM symbols");
        this.dirty = true;
      }
      // (bars the realtime market loop pulled while the last compute ran are new to the engine too)
      const newBars = (await this.syncMarket(gen)) || this.barsPending;
      this.barsPending = false;
      if (gen !== this.gen) return;
      // the universe changed while syncing (timeframe / symbols / history): start over with the new one
      if (this.resetUniverse) return;
      // after aborts on memory pressure at the lightest level the next compute waits (memRetryDelayMs); the live
      // control keeps running on the current book meanwhile
      // Every progressive batch and changed symbol population requires its own complete Base/Real publication.
      // A warmed worker for the previous batch must not defer the new population to the periodic research timer.
      const cohortSymbols = new Set(this.fastArgs?.bars?.map((b) => b.sym) ?? []);
      const samePopulation =
        cohortSymbols.size === this.candles.size &&
        [...this.candles.keys()].every((sym) => cohortSymbols.has(sym));
      const incremental =
        this.status.prehistoric?.complete !== false &&
        samePopulation &&
        FAST_ENTRIES &&
        !this.replay &&
        this.market === "bingx" &&
        !!this.fastArgs &&
        this.paperStepped &&
        this.fastWorker.available;
      const wantsResearch =
        this.dirty || (newBars && (!incremental || Date.now() >= this.nextResearchAt));
      const memWait =
        wantsResearch &&
        (Date.now() < Math.max(this.memRetryAt, this.memFreshAt) || this.memStartBlocked());
      if (memWait) this.dirty = true;
      this.memDeferred = !!memWait;
      const computed = wantsResearch && !memWait;
      this.status.cycleKind = computed
        ? "research"
        : newBars && incremental
          ? "incremental"
          : "idle";
      let light = false;
      if (computed) {
        // Discovery waits for the previous comparison's workers. Foreground incremental updates keep running
        // while Compare evaluates its immutable snapshot in the background.
        await this.waitCompare();
        if (gen !== this.gen || this.stopped || this.resetUniverse) return;
        this.memGuardStart(gen);
        try {
          if (!incremental && this.lightEligible()) light = await this.lightStep(gen);
          if (!light) {
            await this.compute(gen);
          }
        } finally {
          this.memGuardStop(gen);
        }
        // finished: the fallback steps back up once memory has room again (a compute that saw hard pressure in an
        // in-process phase finished anyway — the next one still runs lighter). An abandoned cycle's compute (stop /
        // start while it waited on the workers) leaves the newer cycle's pressure and fallback alone.
        if (gen === this.gen) this.memAfterCompute(this.memPressured, false);
      }
      if (gen !== this.gen) return;
      if (!computed && incremental) await this.fastStep();
      if (gen !== this.gen) return;
      // settings changed during the compute: the tapes are from the old settings — recompute first
      const stale = this.dirty || this.resetUniverse;
      // the paper book, the adjuster and the audit only change with new tapes: after a compute (or once at
      // start), not on every 250 ms cycle; open positions are marked to market by the tick
      if (!stale && (computed || !this.paperStepped)) {
        // in time slices: the live tick runs between them (Paper and Audit were 1.6–2 s single slices with every
        // config its own seat)
        this.busyPhase = "Paper";
        // the paper step (seat selection, entries, sizing) then the self-audit: one Paper stage, the audit its
        // last 20 % (their slices against the last step's, as neither knows its total up front)
        this.beginJob(false);
        const paperLabel = `paper step · ${this.paper.selected.length} seats before`;
        this.setStage("Paper", 0, 1, paperLabel, true);
        try {
          await this.paperIdle();
          if (gen !== this.gen || this.stopped) return;
          const paperOwner = this.claimPaper();
          try {
            await this.driveSliced("Paper", this.stepPaperGen(undefined, light), gen, (f) =>
              this.setStage("Paper", 0.8 * f, 1, paperLabel),
            );
          } finally {
            this.releasePaper(paperOwner);
          }
        } finally {
          if (gen === this.gen) {
            this.fastHold = false;
            this.busyPhase = "";
          }
        }
        const pt = this.paperTimings;
        if (pt && this.status.phases.Paper)
          this.status.phases.Paper.slowest = `select ${Math.round(pt.select)} · candidates ${Math.round(pt.cands)} · entries ${Math.round(pt.exec)} ms over ${pt.n} (wall, sliced)${pt.stale ? ` · ${pt.stale} older tape positions left to their tape` : ""}`;
        await yieldNow();
        // (Adjust and the self-audit read the whole published state: they run with the heavy compute, not in a light cycle)
        if (!light) {
          this.phase("Adjust", () => this.runAdjust());
          // Adjust may invalidate costs/qualification; release only after its revision check.
          this.releaseExecutionBook(gen);
          await yieldNow();
          this.busyPhase = "Audit";
          const auditLabel = `self-audit · ${this.paper.selected.length} seats`;
          this.setStage("Paper", 0.8, 1, auditLabel);
          try {
            await this.runAuditAsync(gen, (f) => this.setStage("Paper", 0.8 + 0.2 * f, 1, auditLabel));
          } finally {
            this.busyPhase = "";
          }
          if (!incremental && this.settings.runtime?.cycle === "incremental") await this.incCapture(gen);
        }
        this.paperStepped = true;
        if (light) this.releaseExecutionBook(gen);
        // the public signal that this compute's book is ready: the seats (paper.selected) are the new tapes'
        this.status.paperSteps = (this.status.paperSteps ?? 0) + 1;
        this.status.paperCompute = this.status.computes;
        this.buildListings();
        if (this.status.prehistoric)
          this.status.prehistoric.counts.real = this.paper.selected.length;
        this.endJob(
          `${this.computeSummary ? `${this.computeSummary} · ` : ""}${this.paper.selected.length} seats · ${this.paper.positions.length} open`,
        );
        this.emit("paper");
        if (!this.replay && this.market === "bingx") {
          this.nextResearchAt = Date.now() + researchIntervalMs();
          this.status.nextResearchAt = this.nextResearchAt;
          void this.prepareRealtime();
        }
      }
      if (!this.stopped) this.status.state = "running";
      this.emit("state");
      this.status.error = null;
      // the preset comparison of this compute runs once the cycle has ended (its book is out, the next cycle is
      // scheduled): the next cycle waits for it before it starts, so the two never overlap
      if (
        !stale &&
        !this.stopped &&
        !light &&
        (computed || (this.compareInput && Date.now() >= this.compareRetryAt))
      )
        compareGen = gen;
      if (this.snapshotPath && !this.db.lastJournalError && Date.now() - this.lastSnapshot > 10 * 60_000) {
        this.lastSnapshot = Date.now();
        // in the background: the loop (and the live tick) keeps running while the pages are copied
        void this.db.snapshotAsync(this.snapshotPath);
      }
      if (Date.now() - this.lastTrim > 60_000) {
        this.lastTrim = Date.now();
        this.db.trim();
      }
      if (this.errorsInRow > 0)
        this.noteHeal(`recovered after ${this.errorsInRow} failed cycle(s)`, "info");
      this.errorsInRow = 0;
    } catch (e) {
      const memAbort = gen === this.gen && this.memPressured;
      if (memAbort) {
        // aborted on memory pressure: not a failure of the engine — the next compute runs lighter, right away
        this.memAfterCompute(true);
        this.dirty = true;
        this.status.state = this.stopped ? "stopped" : "running";
        this.status.error = null;
        // the bar does not stay on the aborted stage as if it were still running: the job is closed (the next compute
        // starts a new one at 0, never a job whose bar moves back)
        this.endJob(`compute aborted at ${this.status.stage} (memory) — retrying lighter`);
        this.emit("state");
      } else if (gen === this.gen) {
        this.errorsInRow++;
        this.dirty = true; // retry the compute on the next cycle
        this.status.state = this.stopped ? "stopped" : "error";
        this.status.error = e instanceof Error ? e.message : String(e);
        this.db.event("error", `cycle: ${this.status.error}`);
        this.emit("state");
      }
    } finally {
      if (gen === this.gen) {
        this.inCycle = false;
        this.jobOpen = false;
        this.status.cycles++;
        this.status.lastCycleMs = performance.now() - t0;
        this.status.heartbeat = Date.now();
        this.busy = false;
        // a compute requested while we were busy runs right away
        this.status.errorsInRow = this.errorsInRow;
        // failures back off exponentially (5 s … 10 min); a compute requested while busy runs right away
        const backoff = this.errorsInRow
          ? Math.min(600_000, 5_000 * 2 ** Math.min(7, this.errorsInRow - 1))
          : 0;
        // a compute waiting for memory: the next cycle at its retry time (or the usual interval, whichever is first)
        // (or, after a fallback raise, the next fresh memory reading)
        const memWaitMs = this.dirty ? Math.max(this.memRetryAt, this.memFreshAt) - Date.now() : 0;
        if (!this.stopped)
          this.schedule(
            backoff ||
              (memWaitMs > 0
                ? Math.min(memWaitMs, this.nextInterval())
                : this.dirty
                  ? 0
                  : this.nextInterval()),
          );
        if (compareGen === gen && !this.stopped) {
          const pending = this.runCompare(gen).finally(() => {
            if (this.comparing === pending) this.comparing = null;
          });
          this.comparing = pending;
        }
      }
    }
  }

  /** The preset comparison after a cycle (a failure there is not the cycle's: status.compare.error). */
  private comparing: Promise<void> | null = null;
  private async waitCompare(timeoutMs = 120_000) {
    const pending = this.comparing;
    if (!pending) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        pending,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error("Compare wait timeout; owned work canceled for recovery");
            if (this.comparing === pending) {
              this.compareAbort?.abort(error);
              this.comparing = null;
            }
            reject(error);
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
      if (this.comparing === pending) this.comparing = null;
    }
  }
  private async runCompare(gen: number) {
    try {
      await this.comparePresets(gen);
    } catch (e) {
      if (gen === this.gen) {
        this.status.compare = {
          running: false,
          done: 0,
          total: 0,
          at: this.status.compare?.at,
          error: e instanceof Error ? e.message : String(e),
        };
        this.db.event("warn", `preset comparison: ${this.status.compare.error}`);
      }
    }
  }

  private phase<T>(name: string, fn: () => T): T {
    const t = performance.now();
    this.busyPhase = name;
    let r: T;
    try {
      r = fn();
    } finally {
      this.busyPhase = "";
    }
    const ms = performance.now() - t;
    const pt = name === "Paper" ? this.paperTimings : null;
    this.status.phases[name] = {
      ms,
      maxSliceMs: ms,
      ...(pt
        ? {
            slowest: `select ${Math.round(pt.select)} · candidates ${Math.round(pt.cands)} · entries ${Math.round(pt.exec)} ms over ${pt.n}`,
          }
        : {}),
    };
    return r;
  }

  // ── market ────────────────────────────────────────────────────────────
  private async syncMarket(gen: number): Promise<boolean> {
    const s = this.settings;
    const want = marketHistoryBars(s, this.wf);
    // a symbol is usable with most of the requested history (small history settings must not stall the loop)
    const minBars = Math.max(50, Math.min(200, Math.floor(want * 0.8)));
    const uniKey = `${s.symbols}|${s.tfMin}|${want}|${s.symbolRank}|${s.symbolOffset ?? 0}|${(s.forceSymbols ?? []).join(",")}`;
    if (this.historyBackfillKey !== uniKey) {
      this.historyBackfillKey = uniKey;
      this.historyBackfilled = new Set();
    }
    if (this.candles.size === 0) {
      this.status.state = "backfill";
      this.loadCandlesFromDb();
      // a partial cache is not a finished universe: keep backfillKey unset so the missing symbols are fetched
      if (this.candles.size >= s.symbols && [...this.candles.values()].every((cs) => cs.n >= want)) this.backfillKey = uniKey;
    }
    // candles of another timeframe (an older version / snapshot, or a hot reload across the base timeframe
    // change) are never read as base bars: drop them and backfill at the base timeframe
    const baseMs = s.tfMin * 60_000;
    // the smallest spacing of the last bars is the timeframe (a missing bar only makes one gap larger)
    const spacing = (cs: CandleSeries) => {
      let m = Infinity;
      for (let i = Math.max(1, cs.n - 10); i < cs.n; i++) m = Math.min(m, cs.t[i] - cs.t[i - 1]);
      return m;
    };
    const wrongTf = [...this.candles.values()].some((cs) => cs.n > 2 && spacing(cs) !== baseMs);
    if (wrongTf) {
      this.db.event("info", `stored candles are not ${s.tfMin}m bars: re-backfilling`);
      this.candles.clear();
      this.db.run("DELETE FROM candles");
      this.backfillKey = "";
      this.prehistSyms.clear();
      this.prehistBatch = 0;
      this.prehistTotal = 0;
      this.prehistReadyAt = 0;
      this.status.prehistoric = undefined;
      this.dirty = true;
    }
    // (re)start a backfill that never completed (stop / watchdog mid-way): fetch only the missing symbols
    if (this.candles.size === 0 || this.backfillKey !== uniKey) {
      // test-only feed (explicit opt-in); the app always runs on real BingX data
      if (this.market === "synthetic") {
        // tests pin the end (CTS_CORE_SYNTHETIC_END, ms): the same bars, lane buckets and windows on every run
        const end = Number(process.env.CTS_CORE_SYNTHETIC_END) || Date.now();
        this.beginJob(true);
        for (let i = 0; i < s.symbols; i++) {
          const cs = syntheticCandles(`SYN${i}`, s.tfMin, want, end);
          // test-only: the price-mirrored market (K / price: rises become falls, highs become lows) — a correct
          // engine trades it as the original with long and short swapped
          if (process.env.CTS_CORE_SYNTHETIC_MIRROR === "1") {
            const K = cs[0].c * cs[0].c;
            for (const x of cs) [x.o, x.h, x.l, x.c] = [K / x.o, K / x.l, K / x.h, K / x.c];
          }
          await this.storeCandles(`SYN${i}-USDT`, cs);
          this.setStage(
            "backfill",
            i + 1,
            s.symbols,
            backfillLabel(`SYN${i}-USDT`, 1, 1, this.candles.size, s.symbols),
            i === 0,
          );
          await yieldNow();
        }
        this.status.source = "synthetic";
      } else {
        // real data only: if BingX does not answer, the cycle fails and is retried with backoff — no mock data
        try {
          this.tickers = await this.feed.tickers();
        } catch (e) {
          this.status.source = "none";
          throw new Error(
            `BingX market unavailable (${e instanceof Error ? e.message : e}) — retrying, no mock data is used`,
          );
        }
        // symbolOffset skips the first symbols of the ranking (several desks on one account take disjoint slices)
        const offset = Math.max(0, Math.floor(s.symbolOffset ?? 0));
        // forced symbols first (always traded), then the ranking (after its offset) up to the symbol count
        const ranked = forceSymbols(
          (
            await rankUniverse(
              this.tickers,
              s.symbols + offset,
              s.symbolRank ?? "volatility1h",
              this.feed.klines,
              this.feed.rankingAt,
            )
          ).slice(offset),
          s.forceSymbols,
          s.symbols,
        );
        // the universe of this run: the symbol count, or every forced symbol when there are more of them
        // (forceSymbols keeps them all) — the cap was s.symbols, which dropped forced symbols beyond it
        const target = ranked.length;
        const missing = ranked
          .filter((x) => !this.candles.has(x) || (this.candles.get(x)!.n < want && !this.historyBackfilled.has(x)))
          .slice(0, target);
        // Connected desks progressively start realtime after each batch. A frozen offline replay loads all
        // symbols first, avoiding repeated full computations on intermediate partial universes.
        const batch = this.completeReplayUniverse ? target : Math.max(5, Math.ceil(target / 4));
        const syms = missing.slice(0, batch);
        const more = missing.length > syms.length;
        this.prehistTotal = Math.min(target, this.candles.size + missing.length);
        for (const x of missing)
          if (!this.prehistSyms.has(x)) this.prehistSyms.set(x, { state: "queued" });
        for (const x of syms) this.prehistSyms.set(x, { state: "loading" });
        // batch #/# of this run (the batches done before + the ones the missing symbols still take) and the
        // symbols loaded of the universe — the line showed the loaded count over the symbol setting as "batch"
        const batchNo = ++this.prehistBatch;
        const batches = batchesOf(batchNo - 1, missing.length, batch);
        this.beginJob(true);
        if (this.status.state !== "backfill") {
          this.status.state = "backfill";
          this.emit("state");
        }
        this.setStage(
          "backfill",
          0,
          syms.length,
          backfillLabel("", batchNo, batches, this.candles.size, this.prehistTotal),
          true,
        );
        let done = 0;
        await mapLimit(
          syms,
          4,
          async (sym) => {
            // a failed fetch is logged (it was silently "skipped" and never retried while the process ran)
            const cs = await this.feed.history(sym, s.tfMin, want, { pauseMs: 60 }).catch((e) => {
              this.db.event(
                "warn",
                `${sym} history: ${e instanceof Error ? e.message : e} — skipped this batch`,
              );
              return [];
            });
            if (gen !== this.gen) return;
            if (cs.length >= minBars) {
              await this.storeCandles(sym, cs);
              this.historyBackfilled.add(sym);
              this.prehistSyms.set(sym, { state: "computing", bars: cs.length });
              if (s !== this.settings && cs.length < want)
                this.db.event(
                  "warn",
                  `${sym} extended history: ${cs.length}/${want} bars available; qualification uses measured history only`,
                );
            } else this.prehistSyms.set(sym, { state: "skipped", bars: cs.length });
            this.setStage(
              "backfill",
              ++done,
              syms.length,
              backfillLabel(sym, batchNo, batches, this.candles.size, this.prehistTotal),
            );
          },
          () => gen === this.gen,
        );
        if (gen !== this.gen) return false;
        if (this.replayPreloadAll) {
          const unloaded = ranked.filter((sym) => !this.candles.has(sym));
          if (unloaded.length) {
            // An unavailable or short history is still pending, never a smaller valid replay universe. Keep the
            // successful loads and retry only missing symbols; the cycle must not compute the partial cohort.
            this.prehistPending = true;
            this.dirty = true;
            this.status.symbols = [...this.candles.keys()];
            this.touchPrehist();
            throw new Error(
              `Replay history incomplete: ${this.candles.size}/${target} symbols loaded; retrying ${unloaded.length} before compute`,
            );
          }
        }
        // Catch up the earlier batches after the backfill itself. During their subsequent compute the market loop
        // also updates already-loaded symbols; this batch's current symbols are skipped by pullNewBars.
        if (this.candles.size > syms.length) await this.pullNewBars(gen);
        if (gen !== this.gen) return false;
        this.prehistPending = more;
        if (this.candles.size === 0) {
          this.status.source = "none";
          throw new Error("BingX returned no history — retrying, no mock data is used");
        }
        this.status.source = "bingx";
        this.db.event(
          "info",
          `backfilled ${this.candles.size} symbols × ${want} bars (${s.tfMin}m)`,
        );
      }
      // the universe is complete only when no batch is left; until then the next cycle loads the next batch
      if (this.market === "synthetic" || (!this.prehistPending && !this.prehistMore(s))) this.backfillKey = uniKey;
      else this.dirty = true;
      this.status.symbols = [...this.candles.keys()];
      this.upsertSymbols();
      this.touchPrehist();
      return true;
    }
    // incremental
    const tfMs = s.tfMin * 60_000;
    const now = Date.now();
    let added = 0;
    if (this.status.source === "synthetic") return false;
    // gap repair: a symbol more than 300 bars behind cannot be caught up incrementally → backfill it again
    const wantBars = marketHistoryBars(s, this.wf);
    // (its history pages are the klines endpoint: nothing is sent during a klines ban)
    const behind = rateLimitedUntil(now, KLINES)
      ? []
      : [...this.candles.entries()].filter(
          ([sym, cs]) => now - (cs.lastT() ?? 0) > 300 * tfMs && (this.staleUntil.get(sym) ?? 0) < now,
        );
    if (behind.length) {
      let repaired = 0;
      await mapLimit(
        behind,
        4,
        async ([sym, old]) => {
          const prevLast = old.lastT() ?? 0;
          const cs = await this.feed
            .history(sym, s.tfMin, wantBars, { pauseMs: 60 })
            .catch((e) => {
              const msg = e instanceof Error ? e.message : String(e);
              // a ban is held to the klines endpoint (the pull and the next repairs wait it out)
              if (noteRateLimit(msg, Date.now(), KLINES)) return [];
              this.db.event("warn", `${sym} gap repair: ${msg} — retried next cycle`);
              return [];
            });
          if (gen !== this.gen || !this.candles.has(sym)) return;
          const fresh = cs.filter((c) => c.t > prevLast).length;
          if (cs.length >= minBars && fresh > 0) {
            await this.storeCandles(sym, cs);
            added += fresh; // only genuinely new bars trigger a compute
            repaired++;
          }
          // still far behind (halted / delisted): do not retry for 30 minutes
          const last = (fresh > 0 ? cs[cs.length - 1]?.t : prevLast) ?? 0;
          if (now - last > 300 * tfMs) this.staleUntil.set(sym, now + 30 * 60_000);
        },
        () => gen === this.gen,
      );
      if (repaired) this.noteHeal(`re-backfilled ${repaired} symbol(s) with a gap > 300 bars`);
    }
    added += await this.pullNewBars(gen);
    return added > 0;
  }

  /** the status counter of the public market-data requests (made on the first one) */
  private marketCalls() {
    return (this.status.marketCalls ??= { klines: 0, empty: 0, tickers: 0, bans: 0 });
  }

  /** a bar pull in flight (the cycle's or the realtime market loop's): never two at once */
  private pulling: Promise<number> | null = null;
  /** new bars arrived while a compute ran (the realtime market loop): the next cycle computes on them */
  private barsPending = false;

  /**
   * Newly closed bars of every symbol (due ones only: a closed bar is 2 × the timeframe old), appended to the
   * candles. The cycle calls it, and the realtime market loop while a compute runs (the compute works on the bars it
   * started with: a published CandleSeries never changes, an append is a new series). Returns the bars added.
   */
  private tickerMetadata: Promise<void> | null = null;
  /** Cosmetic volume/ranking data never holds a completed candle batch or the foreground worker. */
  private refreshTickerMetadata(gen: number, timeoutMs = 5_000) {
    if (this.tickerMetadata) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("ticker metadata timeout")), timeoutMs);
      timer.unref?.();
    });
    const task = Promise.race([Promise.resolve().then(() => this.feed.tickers()), deadline])
      .then((tickers) => {
        if (gen !== this.gen || this.stopped) return;
        this.tickers = tickers;
        this.upsertSymbols();
      })
      .catch(() => undefined)
      .finally(() => {
        if (timer) clearTimeout(timer);
        if (this.tickerMetadata === task) this.tickerMetadata = null;
      });
    this.tickerMetadata = task;
  }

  private async pullNewBars(gen: number): Promise<number> {
    if (this.pulling) return await this.pulling;
    const run = async () => {
      const s = this.settings;
      const tfMs = s.tfMin * 60_000;
      const now = Date.now();
      let added = 0;
      // a klines ban (or an old "*" of a shared ban file) holds the pull; a ban of a signed endpoint does not
      const paused = rateLimitedUntil(Date.now(), KLINES);
      if (paused) this.klinesResumeAt = Math.max(this.klinesResumeAt, paused);
      // paced (dueKlines): each symbol at its own offset after the close and after a ban's end, backed off while its
      // bar is not published, two asks at a time
      const due = paused
        ? []
        : dueKlines(
            [...this.candles.entries()].map(([sym, cs]) => ({ sym, last: cs.lastT() ?? 0 })),
            now,
            tfMs,
            this.klinesPace,
            this.klinesResumeAt,
          );
      const calls = this.marketCalls();
      let banLogged = false;
      await mapLimit(due, KLINES_CONCURRENCY, async (sym) => {
        const cs = this.candles.get(sym);
        if (!cs || rateLimitedUntil(Date.now(), KLINES)) return;
        const last = cs.lastT() ?? 0;
        const pace = this.klinesPace.get(sym);
        const empty = pace?.empty ?? 0;
        this.klinesPace.set(sym, { at: Date.now(), empty });
        calls.klines++;
        try {
          const fresh = await this.feed.klines(sym, s.tfMin, {
            startT: last + 1,
            limit: 300,
            nowT: now,
          });
          const extra = fresh.filter((c) => c.t > last);
          this.klinesPace.set(sym, { at: Date.now(), empty: extra.length ? 0 : empty + 1 });
          if (!extra.length) calls.empty++;
          // A universe/settings change can occur while the request is in flight without changing the runtime
          // generation. Never append an old response into the reset or replacement series for the same symbol.
          if (extra.length && gen === this.gen && !this.resetUniverse && this.candles.get(sym) === cs &&
              this.settings.tfMin === s.tfMin) {
            await this.storeCandles(sym, extra, true);
            added += extra.length;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // held to the klines endpoint: the live step goes on through it (exits, stop repairs)
          const until = noteRateLimit(msg, Date.now(), KLINES);
          if (until) {
            // asked again at the ban's end plus its offset (dueKlines), not where it stood
            this.klinesPace.set(sym, { at: 0, empty });
            this.klinesResumeAt = Math.max(this.klinesResumeAt, until);
            if (!banLogged) {
              banLogged = true;
              calls.bans++;
              this.db.event(
                "warn",
                `klines paused: exchange rate limit until ${new Date(until).toISOString()}`,
              );
            }
            return;
          }
          this.klinesPace.set(sym, { at: Date.now(), empty: empty + 1 });
          this.db.event("warn", `${sym} klines: ${msg}`);
        }
      });
      this.status.heartbeat = Date.now();
      if (added) this.refreshTickerMetadata(gen);
      return added;
    };
    this.pulling = run();
    try {
      return await this.pulling;
    } finally {
      this.pulling = null;
    }
  }

  private loadCandlesFromDb() {
    // row by row into each symbol's columns (db.all held every row as a dictionary object at once: ~1 GB of heap on
    // each desk start); the same candles and the same symbol order (the universe's order follows it), each series sized
    // by its count (a builder grows past a count that moved)
    const want = marketHistoryBars(this.settings, this.wf);
    const counts = new Map<string, number>();
    for (const row of this.db.iterate(
      "SELECT sym, COUNT(*) FROM candles GROUP BY sym ORDER BY sym",
    )) {
      const [sym, n] = row as [string, number];
      counts.set(sym, n);
    }
    let curSym: string | null = null;
    let cur: ReturnType<typeof CandleSeries.builder> | null = null;
    for (const row of this.db.iterate(
      "SELECT sym, t, o, h, l, c, v FROM candles ORDER BY sym, t",
    )) {
      const [sym, t, o, h, l, c, v] = row as [
        string,
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      if (!cur || curSym !== sym) {
        if (cur && curSym !== null) this.candles.set(curSym, cur.done());
        curSym = sym;
        cur = CandleSeries.builder(counts.get(sym) ?? 0, headroomFor(sym, want, true));
      }
      cur.push(t, o, h, l, c, v);
    }
    if (cur && curSym !== null) this.candles.set(curSym, cur.done());
    if (this.candles.size) {
      this.status.source = this.status.source === "none" ? "bingx" : this.status.source;
      this.status.symbols = [...this.candles.keys()];
    }
  }

  /**
   * Candles in memory at once (the engine reads these); the SQLite copy is written in slices of 4000 rows with a
   * yield between them — a 1m backfill is ~26k rows per symbol and must not block the event loop.
   */
  private async storeCandles(sym: string, cs: Candle[], append = false) {
    const want = marketHistoryBars(this.settings, this.wf);
    // the last `want` of [...old, ...cs] (append) or of cs: a new series, the one stored before stays as it was (a
    // compute or the realtime step reading it keeps its bars); an append writes past the old bars in place when it fits
    const old = append ? this.candles.get(sym) : undefined;
    const trimmed = old
      ? old.append(cs, want, headroomFor(sym, want, false))
      : CandleSeries.fromCandles(cs, want, headroomFor(sym, want, true));
    this.candles.set(sym, trimmed);
    const last = trimmed.lastT() ?? 0;
    if (last > this.status.lastBarT) this.status.lastBarT = last;
    const ins =
      "INSERT OR REPLACE INTO candles (sym, t, o, h, l, c, v) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const rows = cs.length > want ? cs.slice(cs.length - want) : cs;
    // an in-memory session (CTS_CORE_STATE=off: the evaluation runs, the tests) restores nothing from its database, so the
    // SQLite copy is skipped: writing 26k rows per symbol was most of a family run's main-thread time
    if (process.env.CTS_CORE_STATE === "off") return;
    // 1000 rows per transaction (~25 ms): 4000 held the event loop for ~115 ms
    for (let i = 0; i < rows.length; i += 1000) {
      if (i > 0) await yieldNow();
      const part = rows.slice(i, i + 1000);
      this.db.tx(() => {
        for (const c of part) this.db.run(ins, sym, c.t, c.o, c.h, c.l, c.c, c.v);
      });
    }
    if (trimmed.n) this.db.run("DELETE FROM candles WHERE sym = ? AND t < ?", sym, trimmed.t[0]);
  }

  private upsertSymbols() {
    const tick = new Map(this.tickers.map((t) => [t.sym, t]));
    this.db.tx(() => {
      for (const [sym, cs] of this.candles) {
        const t = tick.get(sym);
        this.db.run(
          "INSERT OR REPLACE INTO symbols (sym, last, quote_vol, change_pct, bars, first_t, last_t, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          sym,
          t?.last ?? cs.lastC() ?? 0,
          t?.quoteVol ?? 0,
          t?.changePct ?? 0,
          cs.n,
          cs.firstT() ?? 0,
          cs.lastT() ?? 0,
          Date.now(),
        );
      }
    });
  }

  // ── memory guard ─────────────────────────────────────────────────────
  private memGuardStart(gen: number) {
    this.memByPhase = {};
    this.memPressured = false;
    this.memSoftNoted = false;
    this.memMinAvail = Infinity;
    if (this.memTimer) clearInterval(this.memTimer);
    this.memTimer = setInterval(() => this.memGuardTick(), 1000);
    this.memTimerGen = gen;
    (this.memTimer as { unref?: () => void }).unref?.();
    this.memGuardTick();
  }

  /**
   * Only the cycle that started the timer stops it: an abandoned cycle's compute returning late cleared the newer
   * cycle's timer (no hard-pressure abort for the rest of that compute); with no newer cycle it still stops its own.
   */
  private memGuardStop(gen: number) {
    if (this.memTimerGen !== gen) return;
    if (this.memTimer) clearInterval(this.memTimer);
    this.memTimer = null;
  }

  /** A forced collection, remembered (time and heap + buffers after it) for the soft-pressure throttle. */
  private collectNow(): boolean {
    const gc = collectGarbage();
    if (gc) this.memGcLast = { at: Date.now(), mb: heapAndBuffersMb() };
    return gc;
  }

  /**
   * Once a second while computing: soft pressure frees garbage (at most every 30 s, only after the heap grew:
   * shouldCollect), hard pressure aborts the compute.
   */
  memGuardTick(force = false) {
    const m = memInfo(Date.now(), force);
    this.memMinAvail = Math.min(this.memMinAvail, m.availMb);
    // the highest reading per compute stage (status.mem.byPhase: which stage holds the peak)
    {
      const st = this.status.stage || "idle";
      const p = (this.memByPhase[st] ??= { rssMb: 0, heapMb: 0, arrayBuffersMb: 0 });
      p.rssMb = Math.max(p.rssMb, m.rssMb);
      p.heapMb = Math.max(p.heapMb, m.heapMb);
      p.arrayBuffersMb = Math.max(p.arrayBuffersMb, m.arrayBuffersMb ?? 0);
    }
    this.memStatus(m);
    if (m.level === "soft") {
      const gc = shouldCollect(Date.now(), this.memGcLast, heapAndBuffersMb()) && this.collectNow();
      if (!this.memSoftNoted) {
        this.memSoftNoted = true;
        this.db.event(
          "warn",
          `memory low: ${m.availMb} MB available (soft ${memSoftMb()} MB), heap headroom ${m.heapAvailMb ?? "unknown"} MB, this process ${m.rssMb} MB${gc ? " — garbage collected" : ""}`,
        );
      }
    }
    // hard: the compute aborts — its worker runs are stopped (whenever they run), an in-process phase at its next
    // slice (drive)
    if (m.level === "hard" && (!this.memPressured || workerActivity().inFlight > 0)) {
      const first = !this.memPressured;
      this.memPressured = true;
      const reason = `memory pressure: ${m.availMb} MB available (hard ${memHardMb()} MB), heap headroom ${m.heapAvailMb ?? "unknown"} MB, this process ${m.rssMb} MB — compute aborted`;
      const busy = abortWorkers(reason);
      if (first) {
        this.memLastAbort = reason;
        this.collectNow();
        this.db.event("error", `${reason} (${busy} worker(s) stopped); live control continues`);
      }
      this.memStatus(memInfo(Date.now() + 1000));
    }
  }

  /**
   * Before a compute: under hard pressure none starts (it would abort at its first check) — the next cycle tries
   * one level lighter, and at the lightest level it waits (memRetryDelayMs) while the live control keeps running.
   * One level per memory reading: the next cycle (0 ms later) read the same cached reading (memInfo: one a second)
   * and raised again, so one momentary dip went full → micro and minimal carried without a compute in between. A
   * raised level waits for a fresh reading (MEM_READ_MS) before it is raised again or a compute starts on it.
   * True = not now.
   */
  private memStartBlocked(): boolean {
    const m = memInfo();
    if (m.level !== "hard") return false;
    if (m.at === this.memRaisedAt) {
      this.memFreshAt = m.at + MEM_READ_MS;
      return true;
    }
    if (this.memFallback < MEM_FALLBACK_MAX) {
      const before = this.memFallback;
      this.memFallback++;
      this.memClean = 0;
      this.memRaisedAt = m.at;
      this.memFreshAt = m.at + MEM_READ_MS;
      this.db.event(
        "warn",
        `memory fallback ${fallbackLabel(before)} → ${fallbackLabel(this.memFallback)} (pressure before the compute: ${m.availMb} MB available)`,
      );
      this.memStatus(m);
      return true;
    }
    this.memMaxAborts++;
    const wait = memRetryDelayMs(MEM_FALLBACK_MAX, this.memMaxAborts);
    this.memRetryAt = Date.now() + wait;
    this.memLastAbort = `memory pressure: ${m.availMb} MB available (hard ${memHardMb()} MB), this process ${m.rssMb} MB — compute not started`;
    this.db.event(
      "warn",
      `${this.memLastAbort}; ${this.memMaxAborts} time(s) in a row at the lightest level — next try in ${Math.round(wait / 1000)} s`,
    );
    this.memStatus(m);
    return true;
  }

  /** After a compute (or its abort): the fallback level for the next one. */
  private memAfterCompute(pressured: boolean, aborted = pressured) {
    const before = this.memFallback;
    const nx = nextFallback(this.memFallback, this.memClean, pressured, this.memMinAvail);
    this.memFallback = nx.level;
    this.memClean = nx.clean;
    if (nx.level !== before)
      this.db.event(
        nx.level > before ? "warn" : "info",
        `memory fallback ${fallbackLabel(before)} → ${fallbackLabel(nx.level)}${
          nx.level > before ? " (pressure during the compute)" : " (memory has room again)"
        }`,
      );
    // aborted at the lightest level: the next try waits (15 s doubling, up to 10 min) instead of aborting at once,
    // over and over
    if (aborted) this.memAborts++;
    this.memMaxAborts = aborted && before >= MEM_FALLBACK_MAX ? this.memMaxAborts + 1 : 0;
    const wait = aborted ? memRetryDelayMs(before, this.memMaxAborts) : 0;
    this.memRetryAt = wait > 0 ? Date.now() + wait : 0;
    if (wait > 0)
      this.db.event(
        "warn",
        `memory: compute aborted ${this.memMaxAborts} time(s) in a row at the lightest level — next try in ${Math.round(wait / 1000)} s`,
      );
    this.memPressured = false;
    this.memStatus(memInfo());
  }

  private memByPhase: NonNullable<NonNullable<RuntimeStatus["mem"]>["byPhase"]> = {};
  // (the set by a weak reference: the memo must not hold a set the swap released)
  private tapeMbMemo: { tapes: WeakRef<readonly ConfigTape[]>; mb: number } | null = null;
  private memStatus(m: MemInfo) {
    if (this.tapeMbMemo?.tapes.deref() !== this.tapes) {
      let b = 0;
      for (const t of this.tapes) b += tapeBytes(t.n);
      this.tapeMbMemo = { tapes: new WeakRef(this.tapes), mb: Math.round(b / 1048576) };
    }
    let dbMb: number | undefined;
    try {
      dbMb = Math.round(this.db.bytes() / 1048576);
    } catch {
      dbMb = undefined;
    }
    this.status.mem = {
      availMb: m.availMb,
      hostAvailMb: m.hostAvailMb,
      cgroup: m.cgroup,
      rssMb: m.rssMb,
      level: m.level,
      fallback: this.memFallback,
      fallbackLabel: fallbackLabel(this.memFallback),
      minAvailMb: Number.isFinite(this.memMinAvail) ? this.memMinAvail : null,
      lastAbort: this.memLastAbort,
      aborts: this.memAborts,
      abortsInRow: this.memMaxAborts,
      retryAt: this.memRetryAt > Date.now() ? this.memRetryAt : null,
      computeLevel: this.memComputeLevel,
      heapMb: m.heapMb,
      heapLimitMb: m.heapLimitMb,
      heapAvailMb: m.heapAvailMb,
      heapTotalMb: m.heapTotalMb,
      arrayBuffersMb: m.arrayBuffersMb,
      nativeMb: m.nativeMb,
      dbMb,
      tapeMb: this.tapeMbMemo.mb,
      byPhase: this.memByPhase,
    };
  }

  // ── compute ───────────────────────────────────────────────────────────
  /** Run a generator in time slices; records total time and the longest uninterrupted slice. */
  private async drive<T, R>(
    name: string,
    gen: Generator<T, R>,
    onStep: (v: T) => void,
    runGen = this.gen,
  ): Promise<R> {
    const t0 = performance.now();
    let slice = t0;
    let maxSlice = 0;
    let slowest = "";
    // the longest single step (between two yields) and what it was
    let stepT = t0;
    let maxStep = 0;
    const label = (v: unknown) => {
      if (name === "Simulation" && typeof v === "number") {
        if (v >= 0) return "complete simulation step";
        const simulationSlices: Record<number, string> = {
          [-2]: "settle simulated order books",
          [-3]: "expand signal tape candidates",
          [-4]: "build signal rank index",
          [-5]: "rank signal units",
          [-6]: "assemble engine tape candidates",
          [-7]: "merge signal candidates",
          [-8]: "sort step candidates",
          [-9]: "run candidate entry gates",
          [-10]: "finalize trade summaries",
          [-11]: "settle final orders",
          [-12]: "drain final candidate feed",
          [-13]: "sort signal candidates",
          [-14]: "fixed seat selection",
          [-15]: "causal signal ranking",
          [-16]: "negative-hour hedge qualification",
          [-17]: "completed one-minute candidate batch",
        };
        return simulationSlices[v] ?? (v < 0 ? "simulation helper" : "");
      }
      const x = v as { stage?: string; label?: string } | null;
      return x && typeof x === "object" ? `${x.stage ?? ""} ${x.label ?? ""}`.trim() : "";
    };
    try {
      for (;;) {
        const r = gen.next();
        const now = performance.now();
        if (now - stepT > maxStep) {
          maxStep = now - stepT;
          slowest = r.done ? "finish" : label(r.value);
        }
        stepT = now;
        if (r.done) {
          maxSlice = Math.max(maxSlice, now - slice);
          this.status.phases[name] = {
            ms: now - t0,
            maxSliceMs: maxSlice,
            slowest: `${slowest} (${Math.round(maxStep)} ms)`,
          };
          return r.value;
        }
        onStep(r.value);
        const el = performance.now() - slice;
        if (el > SLICE_MS) {
          maxSlice = Math.max(maxSlice, el);
          await yieldNow();
          if (runGen !== this.gen) throw new Error("superseded by a newer loop generation");
          // A burst can cross V8's independent ceiling between one-second RAM samples. Recheck at bounded
          // generator slice boundaries so a research abort can preserve the previous complete live cohort.
          if (heapPressure() !== "ok") this.memGuardTick(true);
          if (this.memPressured)
            throw new Error(this.memLastAbort ?? "memory pressure: compute aborted");
          slice = performance.now();
          stepT = slice;
        }
      }
    } finally { gen.return?.(undefined as R); }
  }

  /**
   * drive() for a step whose total is unknown up front (paper step, audit): its fraction is estimated from the
   * slices the same step took last time (estimatedFraction), and reaches 1 when it finishes.
   */
  private async driveSliced<T, R>(
    name: string,
    g: Generator<T, R>,
    runGen: number,
    onFraction: (f: number) => void,
  ): Promise<R> {
    const expected = this.stepSlices[name] ?? 0;
    let n = 0;
    const r = await this.drive(name, g, () => onFraction(estimatedFraction(++n, expected)), runGen);
    this.stepSlices[name] = n;
    onFraction(1);
    return r;
  }

  /** Live research never runs the historical selection/Real scan on the ticker's thread. */
  private async researchSimulation(
    u: ReturnType<typeof makeUniverse>,
    tapes: ConfigTape[],
    wf: WalkForwardOptions,
    gen: number,
    progress: (value: number) => void,
  ): Promise<WalkForwardResult> {
    if (this.market !== "bingx" || this.replay || !workersAvailable() || this.workersBroken)
      return await this.drive("Simulation", walkForwardGen(u, tapes, wf), progress, gen);
    const controller = new AbortController(),
      owner = {};
    const estimate = compareTapeBytes(tapes);
    this.researchAbort = controller;
    const check = () => {
      controller.signal.throwIfAborted();
      if (gen !== this.gen) throw new Error("research superseded by a newer generation");
      if (this.memPressured)
        throw new Error(this.memLastAbort ?? "memory pressure: research aborted");
      if (!compareWorkers(1, estimate, this.compareAvailableBytes(), false))
        throw new Error(
          "insufficient memory for background research; current position control retained",
        );
    };
    const started = performance.now();
    const steps = Math.max(1, walkForwardSteps(u, wf));
    let publishedSteps = 0;
    const report = (fraction: number) => {
      if (gen !== this.gen || controller.signal.aborted) return;
      this.status.heartbeat = Date.now();
      const completed = Math.min(steps, Math.round(fraction * steps));
      while (publishedSteps < completed) {
        publishedSteps++;
        progress(0);
      }
    };
    let transfer: HistoryTransfer | undefined;
    try {
      check();
      const payload = tapes.some(t => historyOf(t))
        ? { historyManifest: (transfer = await this.drive("Share Real histories", transferHistoriesGen(tapes), () => check(), gen)).path }
        : { packed: await this.drive("Pack Real tapes", packTapesGen(tapes), () => check(), gen) };
      check();
      const [result] = await runOnWorkers<{ sim: WalkForwardResult }>(
        [{ type: "research-real", nowT: u.nowT, baseTf: u.baseTf, ...payload, wf }],
        1,
        15 * 60_000,
        report,
        false,
        controller.signal,
        owner,
      );
      check();
      report(1);
      this.status.phases.Simulation = {
        ms: performance.now() - started,
        maxSliceMs: 0,
        slowest: "historical Real selection on owned worker",
      };
      return result.sim;
    } finally {
      if (this.researchAbort === controller) this.researchAbort = null;
      await retireOwnedIdleWorkers(owner);
      transfer?.close();
    }
  }

  async compute(gen = this.gen) {
    const history = new BoundedHistory();
    const publication = { done: false };
    try {
      await this.computeWithHistory(gen, history, publication);
    } finally {
      // Published lazy tapes retain their owner. Superseded/failed work releases its private files immediately.
      if (!publication.done) history.close();
    }
  }

  private async computeWithHistory(gen: number, history: BoundedHistory, publication: { done: boolean }) {
    const t0 = performance.now();
    // Foreground workers are no longer needed once every tape is received. Release only this compute's idle
    // threads before the in-process Real allocation; another runtime can claim a worker at every message handoff.
    const computeWorkerOwner = {};
    this.dirty = false;
    this.status.state = "computing";
    // the job's bar: a compute after this cycle's backfill batch continues it, otherwise it starts at 0
    this.beginJob(false);
    this.status.computeStartedAt = Date.now();
    // this compute's phases (the previous paper step's Paper / Adjust / Audit and the previous compute's preset
    // comparison, run after its cycle, stay until they run again): a phase the last compute ran and this one does not
    // (workers → in-process) is not shown as current
    const prevPhases = this.status.phases;
    this.status.phases = {};
    for (const k of ["Paper", "Adjust", "Audit", "Compare"])
      if (prevPhases[k]) this.status.phases[k] = prevPhases[k];
    // never the last job's stage (e.g. "Realtime 100 %") under "computing" while the lane series are built
    this.setStage("Base", 0, 1, `preparing ${this.candles.size} symbols`, true);
    this.emit("state");
    this.touchPrehist();
    this.loop.reset();
    // snapshot: a settings change during this compute applies to the next one
    const s = this.settings;
    const computeRevision = computeKey(s, this.wf);
    // Result counters describe the last published cohort, not an unfinished attempt. Progress has its own stage.
    const nextStatus: Pick<
      RuntimeStatus,
      | "basePassed"
      | "baseBuilt"
      | "baseEvaluated"
      | "baseByRange"
      | "baseGates"
      | "baseWhy"
      | "baseHistory"
      | "signals"
      | "exitStrategies"
      | "strategyCoverage"
    > = {
      baseHistory: this.status.baseHistory ? [...this.status.baseHistory] : undefined,
      exitStrategies: undefined,
    };
    const wf: WalkForwardOptions = {
      ...this.wf,
      paused: s.adjust?.enabled ? pausedSets(this.adjustState()) : undefined,
    };
    // Count the configured grid, including cells a foreground memory fallback may temporarily carry or omit.
    const countProtects = wf.protects;
    const countDcaProtects = wf.dcaProtects;
    this.workersRetry();
    // memory fallback: the heaviest ranges stay out of this compute (the saved settings are unchanged)
    this.memComputeLevel = this.memFallback;
    if (this.memFallback > 0) {
      wf.protects = fallbackProtects(wf.protects, this.memFallback);
      wf.dcaProtects = fallbackProtects(wf.dcaProtects, this.memFallback);
    }
    // lane series per symbol, yielding between symbols (resampling 1m for every lane is not free)
    const allBars: ReturnType<typeof laneSeriesFrom> = [];
    const signalBars: ReturnType<typeof laneSeriesFrom> = [];
    const signalH = signalDataHours(s, wf);
    const strategyH = strategyDataHours(s, wf);
    for (const [sym, cs] of this.candles) {
      allBars.push(...laneSeriesOf(sym, cs, s, 0, strategyH));
      if (sigEnabled(s)) signalBars.push(...signalLaneSeriesOf(sym, cs, s, wf));
      await yieldNow();
      if (gen !== this.gen) return;
    }
    if (
      this.evaluationFromT !== undefined &&
      this.paper.positions.some((p) => p.entryT < this.evaluationFromT!)
    )
      throw new Error(
        "Replay evaluationFromT excludes a held entry; existing tapes, book and protection remain unchanged",
      );
    const u = makeUniverse(allBars, this.evaluationFromT);
    if (!u.bars.length) return;
    // causal evaluation: the stages see only the history before the simulated run (its start, as walkForward sets it)
    const runStartT = Math.floor((u.nowT - wf.simH * H) / H) * H;
    const rangeFitCutT = wf.causalBase ? runStartT : undefined;
    if (this.evaluationFromT !== undefined && (!wf.causalBase || this.evaluationFromT >= runStartT))
      throw new Error(
        "Replay evaluationFromT requires a causal Base window before the trading start",
      );
    const uStage = wf.causalBase
      ? makeUniverse(
          allBars.map((b) => headBars(b, runStartT)),
          this.evaluationFromT,
        )
      : u;
    if (!uStage.bars.length) return;
    const signalU = sigEnabled(s) ? makeUniverse(signalBars, this.evaluationFromT) : u;
    const signalStageU = wf.causalBase && sigEnabled(s)
      ? makeUniverse(signalBars.map((b) => headBars(b, runStartT)), this.evaluationFromT)
      : signalU;
    const sig = signalSettings(s.signals);
    const configuredSignalCombos = signalCombos(sig, s.tfs);
    const sharedSignalStage = workersAvailable() && !this.workersBroken
      ? shareBars(signalStageU.series) : signalStageU.series;
    if (this.baseConfigs && this.baseConfigs.summary.cutT !== (wf.causalBase ? runStartT : u.nowT))
      this.baseConfigRunner.cancel("newBaseCut");

    // Base (S1) → Main (S2 refine, S3 evaluate, S5 ranking) on the full history (stage names: pipelineStage)
    // Base on every CPU core: the lane combos are dealt round-robin over the worker pool (each worker a mix of
    // 1m … 30m work); the main thread only waits, so the server stays responsive. In-process fallback.
    const computeCombos = allCombos(baseFocus(s), s.disabledKinds, s.tfs, microLaneFloor(s.grid),
      s.grid.lowRange?.enabled === true && !!s.grid.short, rangeMinTfOf(s.grid).sh ?? 0);
    const engineExitPairs = s.exitStrategy.enabled
      ? exitStrategyPairs(computeCombos, uStage, s.exitStrategy, s.disabledKinds)
      : [];
    const signalExitPairs = s.exitStrategy.enabled
      ? exitSignalStrategyPairs(sig.enabled ? configuredSignalCombos : [], signalStageU, s.exitStrategy)
      : [];
    const exitPairs = [...engineExitPairs, ...signalExitPairs].sort();
    const exitCombos: Combo[] = engineExitPairs.map((pair) => {
      const [, ind] = pair.split("|");
      return { bot: EXIT_BOT, ind };
    });
    const signalExitCombos: Combo[] = signalExitPairs.map((pair) => {
      const [, ind] = pair.split("|");
      return { bot: EXIT_BOT, ind };
    });
    let pre: { s1: ComboRun[] } | undefined;
    // bar series in shared memory once: every worker message then carries references, not copies. Every series given
    // (Universe.series): the worker's universe rebuilt from `bars` alone (≥ 120 bars) had a market without the short ones
    const sharedU =
      workersAvailable() && !this.workersBroken ? shareBars(uStage.series) : uStage.series;
    this.status.workers = !workersAvailable()
      ? "unavailable (in-process)"
      : this.workersBroken
        ? "failed earlier (in-process)"
        : `${poolSize()} cores`;
    if (workersAvailable() && !this.workersBroken) {
      // (the in-process Base, runPipeline, takes the same Micro lane floor: both paths evaluate the same combos)
      const combos = [
        ...computeCombos,
        ...configuredSignalCombos,
        ...exitCombos,
      ];
      const n = poolSize();
      // partial progression (CTS_CORE_BASE_SLICES = K > 1): each compute refreshes one K-th of the combos on the
      // new bars and keeps the others' last results, so every combo is recomputed every K computes at 1 / K of the
      // cost; a universe or Base settings change recomputes all of them
      const slices = Math.max(
        1,
        Math.min(24, Math.round(Number(process.env.CTS_CORE_BASE_SLICES) || 1)),
      );
      const ck = (c: { bot: string; ind: string }) => `${c.bot}|${c.ind}`;
      const bkey = JSON.stringify([
        uStage.bars.map((b) => `${b.sym}@${b.tfMin}`),
        wf.causalBase ? runStartT : 0,
        this.evaluationFromT,
        microOwnInds(s.grid),
        s.tfDays,
        strategyH,
        signalH,
        baseFocus(s),
        s.disabledKinds,
        s.tfs,
        s.signals,
        s.exitStrategy,
        exitPairs,
        sig.filter,
        s.cost,
        s.tactics,
        baseRangeProtects(s.grid, s.cost),
        completeBaseRangeProtects(s.grid, s.cost),
        s.grid?.baseCells === true,
        rangeMinTfOf(s.grid),
        // the gates decide which cell a range keeps (rangeCellPass in the worker): a gates patch must recompute
        // every combo, not reuse cells chosen under the old gates
        s.gates,
      ]);
      const cache = slices > 1 && this.baseCache?.key === bkey ? this.baseCache : null;
      const { todo, sliceNo } = baseSlice(
        combos,
        cache ? { runs: cache.runs, slice: cache.slice } : null,
        slices,
        ck,
      );
      // one indication's combos in one part (the worker builds its series once): see partitionByIndication
      const parts = [
        { combos: todo.filter((c) => !isSignalInd(c.ind)), bars: sharedU },
        { combos: todo.filter((c) => isSignalInd(c.ind)), bars: sharedSignalStage },
      ].flatMap(({ combos, bars }) => partitionByIndication(combos, n * 2).map((combos) => ({ combos, bars })));
      const baseLabel = `Base on ${n} cores · ${todo.length}${todo.length < combos.length ? ` of ${combos.length}` : ""} combos${
        cache ? ` (slice ${sliceNo + 1}/${slices})` : ""
      }`;
      this.setStage("Base", 0, todo.length, baseLabel);
      const tb = performance.now();
      const eluB = nodePerf.eventLoopUtilization();
      try {
        const res = await runOnWorkers<{ runsJson: string[] }>(
          parts
            .filter((p) => p.combos.length)
            .map(({ combos, bars }) => ({
              type: "s1",
              evaluationFromT: this.evaluationFromT,
              bars,
              combos,
              cost: s.cost,
              tactics: s.tactics,
              rangeProtects: baseRangeProtects(s.grid, s.cost),
              completeRangeProtects: completeBaseRangeProtects(s.grid, s.cost),
              rangeMinTf: rangeMinTfOf(s.grid),
              microOwnInds: microOwnInds(s.grid),
              gates: s.gates,
              cells: s.grid?.baseCells === true,
            })),
          n,
          15 * 60_000,
          (fraction) => {
            if (gen === this.gen) this.setStage("Base", fraction, 1, baseLabel);
          },
          false,
          undefined,
          computeWorkerOwner,
          undefined,
          60 * 60_000,
        );
        if (gen !== this.gen) return;
        // a reply of another shape (a worker file newer / older than this module) is refused: in-process
        if (!res.every((r) => Array.isArray(r?.runsJson)))
          throw new Error("unexpected Base worker reply (module version mismatch?)");
        const fresh = new Map<string, ComboRun[]>();
        for (const r of res)
          for (const chunk of r.runsJson) {
            for (const x of JSON.parse(chunk) as ComboRun[]) {
              const k = ck(x);
              const xs = fresh.get(k);
              if (xs) xs.push(x);
              else fresh.set(k, [x]);
            }
            await yieldNow();
            if (gen !== this.gen) return;
          }
        // this compute's results, the rest from the cache, in combo order (only the current combos are kept)
        const runs = new Map<string, ComboRun[]>();
        const s1: ComboRun[] = [];
        for (const c of combos) {
          const xs = fresh.get(ck(c)) ?? cache?.runs.get(ck(c));
          if (!xs) continue;
          runs.set(ck(c), xs);
          s1.push(...xs);
        }
        this.baseCache = slices > 1 ? { key: bkey, runs, slice: sliceNo } : null;
        pre = { s1 };
        this.status.phases["Base (workers)"] = {
          ms: performance.now() - tb,
          maxSliceMs: 0,
          slowest: `${todo.length} of ${combos.length} combos on ${n} cores`,
          mainMs: nodePerf.eventLoopUtilization(eluB).active,
        };
      } catch (err) {
        if (gen !== this.gen) return;
        this.workersFailed(err, "Base");
      }
    }
    const pipeline = await this.drive(
      "Pipeline",
      runPipeline(uStage, { ...s, focus: baseFocus(s) }, pre, exitCombos, signalStageU),
      (p: PipelineProgress) => {
        const x = pipelineStage(p);
        this.setStage(x.stage, x.fraction, 1, x.label);
      },
      gen,
    );
    let signalExitBaseRuns: ComboRun[] = [];
    if (signalExitCombos.length) {
      let signalExitBaseComplete = false;
      const label = `Signal Exit Base · ${signalExitCombos.length} source lanes`;
      if (workersAvailable() && !this.workersBroken) {
        const parts = partitionByIndication(signalExitCombos, poolSize() * 2);
        try {
          const replies = await runOnWorkers<{ runsJson: string[] }>(
            parts.map((combos) => ({
              type: "s1",
              evaluationFromT: this.evaluationFromT,
              bars: sharedSignalStage,
              combos,
              cost: s.cost,
              tactics: s.tactics,
              gates: s.gates,
            })),
            poolSize(),
            15 * 60_000,
            (fraction) => {
              if (gen === this.gen) this.setStage("Tapes", fraction, 1, label);
            },
            false,
            undefined,
            computeWorkerOwner,
          );
          if (gen !== this.gen) return;
          if (!replies.every((reply) => Array.isArray(reply?.runsJson)))
            throw new Error("unexpected Signal Exit Base worker reply (module version mismatch?)");
          signalExitBaseRuns = replies.flatMap((reply) => reply.runsJson.flatMap((chunk) => JSON.parse(chunk) as ComboRun[]));
          signalExitBaseComplete = true;
        } catch (err) {
          if (gen !== this.gen) return;
          this.workersFailed(err, "Signal Exit Base");
        }
      }
      if (!signalExitBaseComplete) {
        const local = function* (): Generator<{ done: number; total: number }, ComboRun[]> {
          const runs: ComboRun[] = [];
          for (let i = 0; i < signalExitCombos.length; i++) {
            const combo = signalExitCombos[i];
            const steps = runComboSteps(signalStageU, combo.bot as import("../domain/types.ts").BotType,
              combo.ind, DEFAULT_PROTECT, s.cost, 1, s.tactics, false, s.gates.baseLastN ?? 0);
            for (;;) {
              const step = steps.next();
              if (step.done) {
                if (step.value) runs.push(slim(step.value));
                break;
              }
              yield { done: i, total: signalExitCombos.length };
            }
            forgetCombo(signalStageU, combo.bot, combo.ind);
            yield { done: i + 1, total: signalExitCombos.length };
          }
          return runs;
        };
        signalExitBaseRuns = await this.drive(
          "Signal Exit Base",
          local(),
          (progress) => this.setStage("Tapes", progress.done, progress.total, label),
          gen,
        );
      }
    }
    // after Main up to the tapes (saving the results, the Base rows, the signals' historic configs, slimming the tapes):
    // the job reports it as the start of Tapes, so its bar and heartbeat move (the watchdog abandons a compute whose
    // heartbeat stands still for minutes)
    this.startStage("Tapes", "preparing: saving the Base / Main results");
    await this.persistPipeline(pipeline, gen, {
      engine: uStage.series, signals: signalStageU.series, evaluationFromT: this.evaluationFromT,
      cost: s.cost, tactics: s.tactics, grid: s.grid,
    });

    // walk-forward tapes on the recent tail: warm-up + long window + simulated run
    // + the warm-up the active tactics need (e.g. the 2-week volatility rank) before their first valid signal
    // (in each series' own bars: a 30m lane needs 30× fewer bars than the 1m lane for the same time)
    const tailOf = (tf: number) =>
      Math.round(((24 + tapeRetentionHours(s, wf, tf) + wf.simH) * 60) / tf) +
      tacticWarmupBars(s.tactics);
    const signalWu = signalU;
    const wu = makeUniverse(
      allBars.map((b) => tailBars(b, tailOf(b.tfMin))),
      this.evaluationFromT,
    );
    // runtime.cycle "incremental": the tail the tapes are built on is what the light cycles continue (incCapture)
    const nextIncTail = s.runtime?.cycle === "incremental" && !this.replay ? wu : null;
    // Main candidates: Base combos by score (default protect, full history), plus every pair held right now
    // Base gate: only config sets with PF ≥ min PF (and positive net, enough trades) continue to Main → Real → Live
    const main = new Set<string>();
    const setsGates = baseSetsGates(s.gates);
    // memory fallback: a carried range trades on its tapes of the previous compute (not rebuilt in this one). With no
    // previous tape of the range (a fresh process) there is nothing to carry: the range passes nothing in this compute —
    // its Base passes had no tape and no seat — while a pair that passed another range keeps that range and its seat
    const carryTags = fallbackCarriedTags(this.memComputeLevel);
    const noCarry = new Set(
      [...carryTags].filter((t) => !this.tapes.some((x) => x.protect.tag === t)),
    );
    const { rangeOn, applies } = baseRangeRules(s, noCarry);
    // evaluation families (CTS_CORE_FAMILY, "label; label", the causal per-family runs): an engine-only list narrows Base
    // to its bots and ranges. With a signal family Base is not narrowed — the engine pairs pass, build their tapes and take
    // their seats as on the desk, so their candidates confirm the signals (with no engine candidate, confirmation refused
    // every signal entry) — and the families apply at execution only (wf.family). Unset (the desk), every family runs.
    const evalFams = parseEvalFamilies(process.env.CTS_CORE_FAMILY);
    const famNarrow = !!evalFams && familiesNarrowBase(evalFams);
    // each pair at the default protect and at one cell of each enabled range: the ranges and targets it passes are the
    // ones whose configs it computes (basePass — the preset backtest judges by the same rule)
    const exitBase = qualifyExitBase([...pipeline.s1, ...signalExitBaseRuns], s.exitStrategy, {
      ...baseSetsGates(s.gates),
      minPf: Math.max(baseSetsGates(s.gates).minPf, s.gates.minPf),
    });
    const engineS1 = pipeline.s1.filter((r) => r.bot !== EXIT_BOT);
    const {
      passed,
      qualified,
      qualifiedTags,
      qualifiedTps,
      qualifiedCells,
      wideLadderPairs,
      pairTags,
      pairTps,
      pairCells,
      added: baseBuilt,
      addedKeys,
    } = basePass(engineS1, s, applies, famNarrow ? evalFams : null);
    // the count of pairs that passed Base (validated); the pairs grid.allSets adds for measurement are reported apart
    nextStatus.basePassed = qualified.length + exitBase.passed.size;
    nextStatus.baseBuilt = baseBuilt;
    nextStatus.baseEvaluated = pipeline.s1.filter((r) => !isSignalInd(r.ind)).length + signalExitBaseRuns.length;
    // every timeframe lane gets its share of Main, so each lane is processed through to the end stages
    for (const k of mainByLane(passed, s.mainTop)) main.add(k);
    // Diagnostic pairs may rank ahead of qualified ones; they cannot displace the normal Main cohort.
    for (const k of mainByLane(qualified, s.mainTop)) main.add(k);
    // An old position without a timeframe cannot be reconstructed on every current lane: its original timeframe
    // and a corresponding close are unknown. Preserve its owned position and protection, but do not promote it to
    // Main, build an invented tape, or admit new entries. Paper's missing-close path carries it until reconciled.
    const knownLane = (cfg: string) => !s.tfs?.length || laneOf(cfg.split("|")[1] ?? "").tf !== null;
    const unknownLaneHeld = this.paper.positions.filter((p) => !knownLane(p.cfg)).length;
    if (unknownLaneHeld && unknownLaneHeld !== this.unknownLaneHeld)
      this.db.event("warn", `paper: ${unknownLaneHeld} legacy position(s) retained; original timeframe and exact close are unavailable`);
    this.unknownLaneHeld = unknownLaneHeld;
    const held = new Set<string>();
    for (const id of this.paper.selected) if (knownLane(id)) held.add(id.split("|").slice(0, 2).join("|"));
    // sets with open positions stay in the continuous stages until the position is closed
    for (const p of this.paper.positions) if (knownLane(p.cfg)) held.add(p.cfg.split("|").slice(0, 2).join("|"));
    for (const k of held) main.add(k);
    restrictHeldBasePairs(pairTags, held);
    // a held config keeps its tape: a held pair that passed Base only in other ranges computes only those ranges'
    // cells (pairTags), and a config whose range is missing would lose its tape — its open position then vanished
    // from the paper book with no close (and live flattened it). Only that config is kept, not every cell of its
    // range: adding the range to the pair's tags built them all and let the pair take new seats in a range it had
    // not passed Base in.
    const heldIds = new Set<string>([
      ...this.paper.selected.filter(knownLane),
      ...this.paper.positions.map((p) => p.cfg).filter(knownLane),
    ]);
    // pinned pairs are evaluated in Base like every other pair (baseFocus): they reach Main only when they pass
    const passedKeys = new Set(qualified.map((r) => `${r.bot}|${r.ind}`));
    // a validated-only run seats nothing a measurement mode added without Base (grid.allSets): V ⊆ the Base cells
    if (wf.seatSet === "validated") {
      assertSeatSet(wf);
      for (const k of addedKeys) passedKeys.delete(k);
    }
    const normalBasePassedKeys = new Set([...passedKeys, ...exitBase.passed]);
    for (const k of s.pinned ?? []) if (passedKeys.has(k)) main.add(k);
    // contrarian execution (wf.invertSeats, an evaluation knob): each engine pair's mirror (follow ↔ revert, the same
    // entries on the other side) computes the same cells, so a seat's entries can execute on its mirror's tape; a
    // mirror that did not pass Base itself never takes a seat (wf.basePassed)
    if (wf.invertSeats)
      for (const k of [...main]) {
        if (isLowRangeInd(k.split("|")[1] ?? "")) continue;
        const m = mirrorId(k);
        if (!m || isSignalInd(k.split("|")[1] ?? "")) continue;
        main.add(m);
        if (pairTags[k]) pairTags[m] = [...new Set([...(pairTags[m] ?? []), ...pairTags[k]])];
        if (pairTps[k]) {
          const t = (pairTps[m] ??= {});
          for (const [tag, tps] of Object.entries(pairTps[k]))
            t[tag] = [...new Set([...(t[tag] ?? []), ...tps])];
        }
        if (pairCells[k]) pairCells[m] = [...new Set([...(pairCells[m] ?? []), ...pairCells[k]])];
      }
    // only pairs that passed Base take a seat; held pairs stay in Main to manage their open positions
    wf.basePassed = normalBasePassedKeys;
    wf.exitBasePassed = exitBase.passed;
    wf.basePassedRanges = qualifiedTags;
    wf.basePassedTargets = qualifiedTps;
    wf.baseWideLadderPairs = wideLadderPairs;
    // Cell qualification publishes with the rest of the economic cohort below.
    wf.basePassedCells = s.grid?.baseCells === true || s.grid?.lowRange?.enabled === true
      ? passedCellsOf(qualifiedCells) : undefined;
    wf.family = evalFams && !famNarrow ? evalFams.map((f) => f.label) : undefined;
    // Signals processing: the active signals and every signal pair still holding a position take the signal
    // configs, never the engine's protect grid
    const coordProtects = signalCoordinationProtects(s.grid, s.cost, sig.coordination.ranges, sig);
    // The full-history ranking is status-only; the simulation ranks each type causally from its own tapes.
    let sigActive = sig.enabled
      ? activeSignals(
          pipeline.s1.filter((r) => !isSignalCoordinationInd(r.ind) || coordProtects.length > 0),
          sig,
        )
      : new Set<string>();
    const heldLegacyCoordination = new Set(
      this.paper.positions.flatMap((p) => {
        const parsed = parseConfigId(p.cfg);
        return parsed && parseSignalCoordinationId(parsed.ind)?.version === 1
          ? [`${parsed.bot}|${parsed.ind}`]
          : [];
      }),
    );
    const configuredSignals = [
      ...signalCombos(sig, s.tfs),
      ...[...heldLegacyCoordination].map((pair) => {
        const [bot, ind] = pair.split("|");
        return { bot: bot as import("../domain/types.ts").BotType, ind };
      }),
    ].filter(
      (c) =>
        seriesOf(uStage, c.ind).length > 0 &&
        (!isSignalCoordinationInd(c.ind) || coordProtects.length > 0) &&
        (!evalFams || evalFams.some((f) => evalFamilyMatch(f, c.bot, c.ind, []))),
    );
    const representativePass = (r: ComboRun) => passesBase(r.full, { ...setsGates, minPf: minPfOf(setsGates, undefined, r.ind) });
    const sigPairs = signalEvaluationPairs(configuredSignals, pipeline.s1, sig, representativePass);
    const representativePassed = signalEvaluationPairs(
      configuredSignals,
      pipeline.s1,
      { ...sig, baseGate: true },
      representativePass,
    );
    const signalBaseGate = sig.enabled && sig.baseGate !== false;
    // Preserve the original cumulative-threshold tape only for v1 positions that are already open.
    // V1 identities are intentionally excluded from normal discovery and new-entry ranking.
    for (const pair of heldLegacyCoordination) sigPairs.add(pair);
    nextStatus.baseEvaluated =
      pipeline.s1.filter((r) => !isSignalInd(r.ind)).length + signalExitBaseRuns.length +
      (signalBaseGate
        ? new Set(pipeline.s1.filter((r) => isSignalInd(r.ind)).map((r) => `${r.bot}|${r.ind}`))
            .size
        : 0);
    // a held signal pair keeps its tapes to manage its open positions; new entries still need Base + validation
    wf.signalBasePassed = new Set(sigPairs);
    for (const k of [...main])
      // Signal-sourced Historic Exit positions belong to the separate Exit builder. Moving them into the
      // ordinary Signal set here made their held-only protection disappear when Exit discovery was disabled.
      if (!k.startsWith(`${EXIT_BOT}|`) && isSignalInd(k.split("|")[1] ?? "")) {
        main.delete(k);
        sigPairs.add(k);
      }
    const coordinationPairs = new Set(
      [...sigPairs].filter((pair) => isSignalCoordinationInd(pair.slice(pair.indexOf("|") + 1))),
    );
    const sourcePairs = new Set([...sigPairs].filter((pair) => !coordinationPairs.has(pair)));
    this.status.mainPairs = main.size;
    // Historic Exit searches each initialized engine or Signal source independently of the corresponding entry grid.
    // Signal sources keep their own full history and source filter; every fit remains causal before the run start.
    const exitProtects: Record<string, Protect[]> = {};
    const retainedExitIds = new Set<string>();
    const exitDiagnostics = emptyExitStrategyDiagnostics();
    exitDiagnostics.baseEvaluated = exitBase.evaluated.size;
    exitDiagnostics.basePassed = exitBase.passed.size;
    exitDiagnostics.baseRejected = exitBase.rejected;
    const exitFitPairs = exitPairs.filter((pair) => exitBase.passed.has(pair));
    const engineExitFitPairs = exitFitPairs.filter((pair) => !isSignalInd(pair.split("|")[1] ?? ""));
    const signalExitFitPairs = exitFitPairs.filter((pair) => isSignalInd(pair.split("|")[1] ?? ""));
    const sigHist: Record<string, Protect[]> = {};
    const retainedSignalIds = new Set<string>();
    const signalHistDiagnostics = emptySignalHistDiagnostics();
    const signalHistValidation = coordinatorHistValidationOf(s, coordProtects, wf.rangeOpts?.sig?.validLastN ?? wf.signalValidLastN);
    const standard = signalProtects(sig);
    try {
      if (s.exitStrategy.enabled && exitFitPairs.length) {
        if (gen !== this.gen) return;
        if (this.memPressured)
          throw new Error(this.memLastAbort ?? "memory pressure: compute aborted");
        // Exit fitting and holdout both end before the Real simulation window, even when the broader Base ranking is
        // configured to use the full history. This keeps Exit parameter selection outside the period it will be scored on.
        const cutT = runStartT;
        const labelBase = `independent Exit fit · ${exitFitPairs.length}/${exitPairs.length} Base-passed sources`;
        this.setStage("Tapes", 0, 1, `preparing: ${labelBase}`);
        const exitValidation: ExitStrategyValidation = {
          cost: s.cost,
          minPf: s.exitStrategy.minPf,
          minTrades: s.exitStrategy.minValidationTrades,
          maxDdr: s.exitStrategy.maxDdr,
          minSl: s.protectFloor.minSl,
          minTrail: s.protectFloor.minTrail,
        };
        const signalExitValidation: ExitStrategyValidation = {
          ...exitValidation,
          minSl: sig.minSl,
          minTrail: sig.minTrail,
          signalTrailMax: sig.trailMax,
        };
        const historyKey = JSON.stringify([
          cutT,
          this.evaluationFromT ?? null,
          exitHistoryFingerprint(uStage, engineExitFitPairs, cutT),
          exitHistoryFingerprint(signalStageU, signalExitFitPairs, cutT),
          exitBase.passed,
          s.gates,
          s.exitStrategy,
          s.tactics,
          exitValidation,
          signalExitValidation,
          sig.filter,
        ]);
        const cacheStarted = performance.now();
        const cached = this.exitHistoryCache?.key === historyKey ? this.exitHistoryCache : null;
        let history: Record<string, Protect[]> | null = null;
        if (cached) {
          history = cloneExitProtectMap(cached.protects);
          Object.assign(exitProtects, history);
          Object.assign(exitDiagnostics, cached.diagnostics);
          this.status.phases["Exit history"] = {
            ms: performance.now() - cacheStarted,
            maxSliceMs: 0,
            mainMs: 0,
            slowest: "unchanged causal history · fingerprint cache",
          };
        } else {
          if (workersAvailable() && !this.workersBroken) {
            const fitGroups = [
              { pairs: engineExitFitPairs, bars: sharedU, validation: exitValidation, entryFilters: undefined },
              {
                pairs: signalExitFitPairs,
                bars: sharedSignalStage,
                validation: signalExitValidation,
                entryFilters: Object.fromEntries(signalExitFitPairs.map((pair) => [pair, sig.filter])),
              },
            ].filter((group) => group.pairs.length);
            const parts = fitGroups.flatMap((group) =>
              slices(group.pairs, Math.ceil(group.pairs.length / EXIT_HISTORY_MAX_PAIRS)).map((pairs) => ({
                ...group,
                pairs,
                entryFilters: group.entryFilters
                  ? Object.fromEntries(pairs.map((pair) => [pair, group.entryFilters![pair]]))
                  : undefined,
              })),
            );
            // Keep pair fits independent, reduce message/queue overhead, and bound each worker reply to 16 pairs.
            const n = Math.min(poolSize(), parts.length, 8);
            const label = `${labelBase} on ${n} workers`;
            this.setStage("Tapes", 0, 1, label);
            const started = performance.now();
            const elu = nodePerf.eventLoopUtilization();
            try {
              const replies = await runOnWorkers<import("./pool.server.ts").ExitStrategyReply>(
                parts.map(({ pairs, bars, validation, entryFilters }) => ({
                  type: "exit-hist",
                  evaluationFromT: this.evaluationFromT,
                  bars,
                  pairs,
                  settings: s.exitStrategy,
                  tactics: s.tactics,
                  cutT,
                  validation,
                  entryFilters,
                })),
                n,
                15 * 60_000,
                (fraction) => {
                  if (gen === this.gen) this.setStage("Tapes", fraction, 1, label);
                },
                false,
                undefined,
                computeWorkerOwner,
              );
              if (gen !== this.gen) return;
              if (this.memPressured)
                throw new Error(this.memLastAbort ?? "memory pressure: compute aborted");
              for (let i = 0; i < replies.length; i++) {
                const own = new Set(parts[i].pairs);
                const ps = replies[i]?.pairProtects;
                if (
                  !ps ||
                  typeof ps !== "object" ||
                  Array.isArray(ps) ||
                  Object.entries(ps).some(
                    ([pair, protects]) => !own.has(pair) || !Array.isArray(protects),
                  )
                )
                  throw new Error(
                    "unexpected Exit history worker reply (module version mismatch?)",
                  );
                Object.assign(exitProtects, ps);
                const diagnostics = replies[i]?.diagnostics;
                if (diagnostics)
                  for (const key of Object.keys(exitDiagnostics) as Array<
                    keyof ExitStrategyDiagnostics
                  >)
                    exitDiagnostics[key] += diagnostics[key] ?? 0;
              }
              history = exitProtects;
              this.status.phases["Exit history"] = {
                ms: performance.now() - started,
                maxSliceMs: 0,
                mainMs: nodePerf.eventLoopUtilization(elu).active,
                slowest: `${n} workers · ${parts.length} bounded chunks of at most 16 pairs`,
              };
            } catch (err) {
              if (gen !== this.gen) return;
              this.workersFailed(err, "Exit history");
            }
          }
          if (history === null) {
            history = {};
            const fallbackGroups = [
              { universe: uStage, pairs: engineExitFitPairs, validation: exitValidation, entryFilters: undefined },
              {
                universe: signalStageU,
                pairs: signalExitFitPairs,
                validation: signalExitValidation,
                entryFilters: Object.fromEntries(signalExitFitPairs.map((pair) => [pair, sig.filter])),
              },
            ].filter((group) => group.pairs.length);
            for (const group of fallbackGroups) {
              const g = exitStrategyProtectsBoundedGen(
                group.universe,
                group.pairs,
                s.exitStrategy,
                s.tactics,
                cutT,
                group.validation,
                exitDiagnostics,
                group.entryFilters,
              );
              try {
                Object.assign(
                  history,
                  await this.drive(
                    "Exit history",
                    g,
                    () => this.setStage("Tapes", 0, 1, labelBase),
                    gen,
                  ),
                );
              } finally {
                // drive can abandon a suspended generator on cancellation or memory pressure.
                g.return({});
              }
            }
            Object.assign(exitProtects, history);
          }
          if (history !== null)
            this.exitHistoryCache = {
              key: historyKey,
              protects: cloneExitProtectMap(history),
              diagnostics: { ...exitDiagnostics },
            };
        }
      }
      // A changed history or disabled switch must not orphan an open historic Exit position. Rebuild only its exact id
      // and mark it held-only so it manages its stop without creating a fresh seat or entry.
      for (const pos of this.paper.positions) {
        const h = heldExitProtect(pos.cfg);
        if (!h || !main.has(h.pair)) continue;
        const list = (exitProtects[h.pair] ??= []);
        const heldId = configId(
          h.pair.split("|")[0] as import("../domain/types.ts").BotType,
          h.pair.split("|")[1],
          laneProtect(h.protect, h.pair.split("|")[1]),
        );
        if (
          !list.some((p) => {
            const [bot, ind] = h.pair.split("|");
            return (
              configId(bot as import("../domain/types.ts").BotType, ind, laneProtect(p, ind)) ===
              heldId
            );
          })
        ) {
          list.push(h.protect);
          retainedExitIds.add(heldId);
        }
      }
      nextStatus.exitStrategies = {
        enabled: s.exitStrategy.enabled,
        pairs: exitPairs.length,
        baseEvaluated: exitBase.evaluated.size,
        basePassed: exitBase.passed.size,
        baseRejected: exitBase.rejected,
        families: 5,
        timeframes: [...s.exitStrategy.timeframes],
        tactics: exitPairs.filter((pair) =>
          INDICATIONS.some(
            (spec) => spec.id === laneOf(pair.split("|")[1] ?? "").base && spec.kind === "tactic",
          ),
        ).length,
        relations: exitPairs.filter((pair) => {
          const base = laneOf(pair.split("|")[1] ?? "").base;
          return (
            isBreakRelInd(base) ||
            INDICATIONS.some((spec) => spec.id === base && spec.kind === "relate")
          );
        }).length,
        configs: Object.values(exitProtects).reduce((n, xs) => n + xs.length, 0),
        history: exitDiagnostics,
      };
      // each signal's historic trailing configs (signal-hist.ts) from the stage's history (causal: before the run start),
      // computed between ticks; a held historic config whose distances moved since keeps its own tape
      if (sig.enabled && sig.hist.enabled && sigPairs.size) {
        if (gen !== this.gen) return;
        if (this.memPressured)
          throw new Error(this.memLastAbort ?? "memory pressure: compute aborted");
        const cutT = wf.causalBase ? runStartT : u.nowT;
        const histLabel = `preparing: signal historic configs · ${sigPairs.size} pairs`;
        this.startStage("Tapes", histLabel);
        let hist: Record<string, Protect[]> | null = null;
        if (workersAvailable() && !this.workersBroken) {
          const order = [...sigPairs];
          // Small parts bound each worker's indicator caches and keep the shared pool responsive to other desks.
          const parts = slices(order, Math.ceil(order.length / 2));
          const n = poolSize();
          const label = `signal historic configs on ${n} cores · ${sigPairs.size} pairs`;
          this.setStage("Tapes", 0, 1, label);
          const th = performance.now();
          const eluH = nodePerf.eventLoopUtilization();
          try {
            const res = await runOnWorkers<import("./pool.server.ts").SignalHistReply>(
              parts.map((pairs) => ({
                type: "signal-hist",
                evaluationFromT: this.evaluationFromT,
                bars: sharedSignalStage,
                pairs,
                sig,
                tactics: s.tactics,
                cutT,
                validation: signalHistValidation,
              })),
              n,
              15 * 60_000,
              (fraction) => {
                if (gen === this.gen) this.setStage("Tapes", fraction, 1, label);
              },
              false,
              undefined,
              computeWorkerOwner,
            );
            if (gen !== this.gen) return;
            if (this.memPressured)
              throw new Error(this.memLastAbort ?? "memory pressure: compute aborted");
            const byPair = new Map<string, Protect[]>();
            for (let i = 0; i < res.length; i++) {
              const own = new Set(parts[i]);
              const ps = res[i]?.pairProtects;
              if (
                !ps ||
                typeof ps !== "object" ||
                Array.isArray(ps) ||
                Object.entries(ps).some(
                  ([pair, protects]) => !own.has(pair) || !Array.isArray(protects),
                )
              )
                throw new Error(
                  "unexpected Signal history worker reply (module version mismatch?)",
                );
              for (const [pair, protects] of Object.entries(ps)) byPair.set(pair, protects);
              const d = res[i]?.diagnostics;
              if (d)
                for (const key of Object.keys(signalHistDiagnostics) as Array<
                  keyof SignalHistDiagnostics
                >)
                  signalHistDiagnostics[key] += d[key] ?? 0;
            }
            hist = {};
            for (const pair of order) if (byPair.has(pair)) hist[pair] = byPair.get(pair)!;
            this.status.phases["Signal history"] = {
              ms: performance.now() - th,
              maxSliceMs: 0,
              mainMs: nodePerf.eventLoopUtilization(eluH).active,
              slowest: `${n} cores · ${parts.length} replies`,
            };
          } catch (err) {
            if (gen !== this.gen) return;
            this.workersFailed(err, "Signal history");
          }
        }
        if (hist === null) {
          // No workers or an ordinary worker failure: the same generator, with the compute's generation/memory
          // checks and heartbeat. A memory-guard abort is rethrown by workersFailed, never retried in-process.
          this.startStage("Tapes", histLabel);
          const g = signalHistProtectsGen(
            signalStageU,
            sigPairs,
            sig,
            s.tactics,
            cutT,
            signalHistValidation,
            signalHistDiagnostics,
          );
          try {
            hist = await this.drive(
              "Signal history",
              g,
              (p) => this.setStage("Tapes", p.done, p.total, histLabel),
              gen,
            );
          } finally {
            g.return({});
          }
        }
        Object.assign(sigHist, signalCoordinationHistory(hist, coordinationPairs, coordProtects));
      }
      // Removed/disabled configs retain exactly their open tape. Source Signals and each coordinator keep their own
      // current grid, so a source's wide cells cannot replace a coordination range (or vice versa).
      for (const [pairs, currentProtects] of [
        [sourcePairs, standard],
        [coordinationPairs, coordProtects],
      ] as const) {
        const openConfigs = this.paper.positions.map((p) => p.cfg);
        const held =
          pairs === coordinationPairs
            ? heldCoordinationProtects(openConfigs, pairs, currentProtects)
            : heldHistProtects(openConfigs, pairs, currentProtects);
        for (const [pair, ps] of Object.entries(held)) {
          const [bot, ind] = pair.split("|");
          const list = (sigHist[pair] ??= []);
          const current = new Set(
            [...currentProtects, ...list].map((p) =>
              configId(bot as import("../domain/types.ts").BotType, ind, laneProtect(p, ind)),
            ),
          );
          for (const h of ps) {
            const id = configId(
              bot as import("../domain/types.ts").BotType,
              ind,
              laneProtect(h, ind),
            );
            if (!current.has(id)) {
              list.push(h);
              retainedSignalIds.add(id);
            }
          }
        }
      }
    } finally {
      // Release indicator memos after either Exit or Signal history, including cancellation and memory pressure. A
      // newer loop generation): nothing after it reads them in this compute, and through lastUniverse they stayed until
      // the next compute's Base (0.05–0.15 GB of series; an aborted compute's through its retry). A detail page
      // recomputes a series on demand (the same values)
      for (const c of signalStageU.caches) c.clear();
      if (signalU !== signalStageU) for (const c of signalU.caches) c.clear();
      for (const c of uStage.caches) c.clear();
      if (u !== uStage) for (const c of u.caches) c.clear();
    }
    const sourceHistConfigs = [...sourcePairs].reduce(
      (n, pair) => n + (sigHist[pair]?.length ?? 0),
      0,
    );
    const coordinationHistConfigs = [...coordinationPairs].reduce(
      (n, pair) => n + (sigHist[pair]?.length ?? 0),
      0,
    );
    nextStatus.signals = {
      enabled: sig.enabled,
      combos: pipeline.s1.filter((r) => isSignalInd(r.ind)).length,
      active: sigActive.size,
      pairs: sigPairs.size,
      configs:
        sourcePairs.size * standard.length +
        sourceHistConfigs +
        coordinationPairs.size * coordProtects.length +
        coordinationHistConfigs,
      coordinationPairs: coordinationPairs.size,
      coordinationConfigs: coordinationPairs.size * coordProtects.length + coordinationHistConfigs,
      coordinationActive: [...sigActive].filter((key) =>
        isSignalCoordinationInd(key.split("|")[1] ?? ""),
      ).length,
      discoveryPairs: wf.signalBasePassed.size,
      representativePassed: representativePassed.size,
      representativeBaseGate: sig.baseGate !== false,
      historic: signalHistDiagnostics,
    };
    // the sets per range type after the Base PF evaluation (status, the desk log and every report show them)
    {
      const engineRuns = pipeline.s1.filter((r) => !isSignalInd(r.ind) && r.bot !== EXIT_BOT);
      const enabled = rangeOn;
      const label = "Base diagnostics · ranges, gates and reasons";
      const rangeWork = engineRuns.length * (1 + ALL_RANGE_TAGS.length);
      const gateWork = engineRuns.length * (1 + BASE_GATE_VARIANTS.length);
      const totalWork = Math.max(1, rangeWork * 2 + gateWork);
      const eligible = (ind: string, tag: string) => rangeAppliesTo(ind, tag, applies);
      this.startStage("Tapes", label);
      const rangeCounts = await this.drive(
        "Base ranges",
        baseRangeCountsGen(engineRuns, setsGates, ALL_RANGE_TAGS, eligible),
        (n) => this.setStage("Tapes", n, totalWork, label),
        gen,
      );
      if (gen !== this.gen) return;
      const rows: NonNullable<RuntimeStatus["baseByRange"]> = rangeCounts.map((x) => ({
        ...x,
        range: RANGE_LABEL[x.tag as keyof typeof RANGE_LABEL] ?? x.tag,
        enabled: enabled(x.tag),
      }));
      const sigRuns = pipeline.s1.filter((r) => isSignalInd(r.ind));
      if (sig.enabled) {
        const pfs = sigRuns
          .filter((r) => r.full.n > 0)
          .map((r) => r.full.pf)
          .filter(Number.isFinite)
          .sort((a, b) => a - b);
        // the pairs that passed (Base gate, enough trades on a symbol, the family focus): the count and the PF of
        // the same runs
        const okRuns = sigRuns.filter((r) => representativePassed.has(`${r.bot}|${r.ind}`));
        const ok = okRuns.map((r) => r.full.pf).sort((a, b) => a - b);
        const pooled = pooledPf(okRuns.map((r) => r.full));
        rows.push({
          tag: "sig",
          range: "Signals",
          enabled: true,
          evaluated: new Set(sigRuns.map((r) => `${r.bot}|${r.ind}`)).size,
          passed: new Set(okRuns.map((r) => `${r.bot}|${r.ind}`)).size,
          minPf: minPfOf(setsGates, undefined, "sig-base"),
          pfMedian: pfs.length ? pfs[pfs.length >> 1] : null,
          pfPassedMedian: ok.length ? ok[ok.length >> 1] : null,
          pfPassedMean: meanPf(ok),
          pfPassedPooled: pooled.pf,
          passedGp: pooled.gp,
          passedGl: pooled.gl,
          // These are representative diagnostic cells; discovery and each actual config's qualification are separate.
          ownCells: sigRuns.length,
        });
      }
      nextStatus.baseByRange = rows;
      // what each Base gate would admit, from the same results (no recompute)
      nextStatus.baseGates = await this.drive(
        "Base gate sensitivity",
        baseGateSensitivityGen(engineRuns, setsGates, ALL_RANGE_TAGS, BASE_GATE_VARIANTS, eligible),
        (n) => this.setStage("Tapes", rangeWork + n, totalWork, label),
        gen,
      );
      if (gen !== this.gen) return;
      // per range, the gate each failing pair misses (closes, net, PF, drawdown ratio)
      const why = await this.drive(
        "Base gate reasons",
        baseRangeWhyGen(engineRuns, setsGates, ALL_RANGE_TAGS, eligible),
        (n) => this.setStage("Tapes", rangeWork + gateWork + n, totalWork, label),
        gen,
      );
      if (gen !== this.gen) return;
      nextStatus.baseWhy = why.filter((x) => enabled(x.tag));
      this.setStage("Tapes", totalWork, totalWork, label);
      // Base totals include Signal representatives only when their representative Base gate is enabled; the Signals
      // range row remains an independent diagnostic either way.
      nextStatus.basePassed =
        qualified.length + exitBase.passed.size + (signalBaseGate ? representativePassed.size : 0);
      // continuity: the passed count per compute (last BASE_HISTORY_N), per range
      const hist = nextStatus.baseHistory ?? [];
      hist.push({
        at: Date.now(),
        compute: this.status.computes + 1,
        passed: nextStatus.basePassed ?? 0,
        built: nextStatus.baseBuilt ?? 0,
        byRange: Object.fromEntries(rows.map((r) => [r.tag || "wide", r.passed])),
      });
      nextStatus.baseHistory =
        hist.length > BASE_HISTORY_N ? hist.slice(hist.length - BASE_HISTORY_N) : hist;
      const f = (x: number | null) => (x === null ? "–" : x.toFixed(2));
      this.db.event(
        "info",
        `Base by range: ${rows
          .filter((r) => r.enabled)
          .map(
            (r) =>
              `${r.range} ${r.passed}/${r.evaluated} (PF ≥ ${r.minPf.toFixed(2)}, median ${f(r.pfMedian)}, passed ${f(r.pfPassedMedian)})`,
          )
          .join(" · ")}`,
      );
    }
    const dcaOpt = { protects: wf.dcaProtects, dca: wf.dca, axis: s.axis };
    const adjustNow = s.adjust?.enabled ? this.adjustState() : null;
    // strategy tapes on the worker cores (pairs dealt round-robin), back in Main-set order so every later
    // tie-break is the same as in-process
    // the walk-forward bars in shared memory once per compute (each tape call shared its own copy: 26–80 MB more at
    // the Tapes peak). When the tail cut nothing (each series is the stage's own), Base's shared copy is the same bars
    let sharedWuMemo: typeof wu.series | null = null;
    const sharedWuOf = () =>
      (sharedWuMemo ??=
        sharedU !== uStage.series &&
        wu.series.length === uStage.series.length &&
        wu.series.every((b, i) => b === uStage.series[i])
          ? sharedU
          : shareBars(wu.series));
    // Signal source, coordinator, and Exit tape builds share this immutable walk-forward universe.
    let sharedSignalWuMemo: typeof sharedSignalStage | null = null;
    const sharedSignalWuOf = () =>
      (sharedSignalWuMemo ??=
        signalWu.series === signalStageU.series
          ? sharedSignalStage
          : shareBars(signalWu.series));
    const tapesFor = async (
      pairs: ReadonlySet<string>,
      protects: readonly Protect[],
      dcaFor:
        (Omit<typeof dcaOpt, "axis"> & { axis?: typeof dcaOpt.axis; noDca?: boolean }) | undefined,
      what: string,
      floors: EntryFloors,
    ): Promise<ConfigTape[] | null> => {
      const signalStage = what.startsWith("signal");
      const tapeUniverse = signalStage ? signalWu : wu;
      let workerTapes: ConfigTape[] | null = null;
      if (workersAvailable() && !this.workersBroken && pairs.size) {
        const n = poolSize();
        // every series (the short ones too): the worker's market reference is the main thread's (Universe.series)
        const sharedWu = signalStage ? sharedSignalWuOf() : sharedWuOf();
        const order = [...pairs];
        // small messages: each reply is deserialised on the main thread in one piece (one part per core
        // stalled it for ~0.5 s at 30 symbols × 43 signal sources; with every config its own seat a pair carries
        // ~200 tapes, so a part holds at most 2 pairs)
        const parts: string[][] = Array.from(
          { length: Math.max(n * 2, Math.ceil(order.length / 2)) },
          () => [],
        );
        order.forEach((k, i) => parts[i % parts.length].push(k));
        // each message carries its own pairs' share of the floors (Base ranges, targets, held ids, own configs)
        const floorsOf = floorsForPairs(floors);
        const stage = signalStage ? "Signals" : "Tapes";
        // the pairs of this compute (a large universe: tens of thousands of tapes from them)
        const tapeLabel = `${what} on ${n} cores · ${pairs.size} pairs`;
        this.startStage(stage, tapeLabel);
        const tt = performance.now();
        const eluT = nodePerf.eventLoopUtilization();
        let maxRetainMs = 0;
        let maxConsumeSliceMs = 0;
        try {
          const res = await runOnWorkers<{ tapes: ConfigTape[]; buildStats?: TapeBuildStat[] }>(
            parts
              .filter((p) => p.length)
              .map((pp) => ({
                type: "tapes",
                evaluationFromT: this.evaluationFromT,
                bars: sharedWu,
                pairs: pp,
                protects,
                cost: s.cost,
                dcaOpt: dcaFor,
                tactics: s.tactics,
                adjust: adjustNow,
                floors: floorsOf(pp),
              })),
            n,
            15 * 60_000,
            (fraction) => {
              if (gen === this.gen) this.setStage(stage, fraction, 1, tapeLabel);
            },
            false,
            undefined,
            computeWorkerOwner,
            async (reply, _index, signal) => {
              let slice = performance.now();
              for (let i = 0; i < reply.tapes.length; i++) {
                signal.throwIfAborted();
                if (gen !== this.gen) throw new Error("history superseded by a newer generation");
                const retainStarted = performance.now();
                reply.tapes[i] = history.retain(reply.tapes[i]);
                const now = performance.now();
                maxRetainMs = Math.max(maxRetainMs, now - retainStarted);
                if (now - slice > SLICE_MS) {
                  maxConsumeSliceMs = Math.max(maxConsumeSliceMs, now - slice);
                  await yieldNow();
                  slice = performance.now();
                }
              }
              maxConsumeSliceMs = Math.max(maxConsumeSliceMs, performance.now() - slice);
              return reply;
            },
          );
          if (gen !== this.gen) return null;
          // A reply can contain hundreds of thousands of opens. Yield during interning and bucket flattening so
          // execution and protection checks can run, while preserving exactly the former pair/reply order.
          const merged = await this.drive("Tape merge", mergeWorkerTapesGen(res, order), () => undefined, gen);
          if (floors.buildStats)
            for (const r of res) mergeBuildStats(floors.buildStats, r.buildStats ?? []);
          workerTapes = merged;
          this.status.phases[
            what === "strategy tapes"
              ? "Tapes"
              : what === "carried tapes"
                ? "Carried tapes"
                : what === "signal coordination tapes"
                  ? "Signal coordination tapes"
                  : "Signal tapes"
          ] = {
            ms: performance.now() - tt,
            // Measured JavaScript work only. Worker message deserialization happens before the callback and is
            // captured separately by the event-loop stall probe, not by these slice timings.
            maxSliceMs: Math.max(maxConsumeSliceMs, this.status.phases["Tape merge"]?.maxSliceMs ?? 0),
            slowest: `${n} cores · ${parts.filter((p) => p.length).length} replies · longest history retain ${Math.round(maxRetainMs)} ms`,
            mainMs: nodePerf.eventLoopUtilization(eluT).active,
          };
        } catch (err) {
          if (gen !== this.gen) return null;
          // Storage failures cannot silently switch to an unbounded fallback or publish an incomplete cohort.
          if (err instanceof HistoryStorageError || this.memPressured) throw err;
          this.workersFailed(err, "Tape");
        }
      }
      if (workerTapes) return workerTapes;
      if (!pairs.size) return [];
      this.startStage(signalStage ? "Signals" : "Tapes", `${what} · ${pairs.size} pairs`);
      return await this.drive(
        "Tapes",
        buildTapesGen(tapeUniverse, protects, s.cost, dcaFor, pairs, s.tactics, adjustNow, {
          ...floors, tapeSink: history.retain,
        }),
        (p) =>
          this.setStage(
            signalStage ? "Signals" : "Tapes",
            p.done,
            p.total,
            `${what} · ${pairs.size} pairs`,
          ),
        gen,
      );
    };
    // a pair computes its Base-passed ranges; a failed held pair rebuilds only its exact retained configs
    // partial processing (memory): while the new tapes are built, the previous set keeps only what live can act on
    // during the compute — and, under a memory fallback, the ranges this compute does not rebuild (carried, carryTags)
    this.startStage("Tapes", "preparing: slimming the previous tapes");
    await this.slimTapes(carryTags, gen);
    // every set's completeness: grid cells per indication × range × type, built / kept / not built and why
    const buildStats = new Map<string, TapeBuildStat>();
    // validated-only processing builds nothing it cannot seat: a held pair that did not pass Base only its held ids, and no
    // DCA / Axis set while its toggle is off (Block on keeps them: its feed reads every tape)
    const validatedOnly = wf.seatSet === "validated" && !wf.toggles.block;
    const engineMain = new Set([...main].filter((pair) => !pair.startsWith(`${EXIT_BOT}|`)));
    // grid.allSets pairs are diagnostic measurement cohorts, not held-only pairs. They still need their tapes
    // built for comparison even though validated-seat admission deliberately removes them from passedKeys.
    const heldUnpassedPairs = new Set(
      [...main].filter((pair) =>
        !passedKeys.has(pair) && !addedKeys.has(pair) && !isSignalInd(pair.split("|")[1] ?? ""),
      ),
    );
    const built = await tapesFor(engineMain, wf.protects, dcaOpt, "strategy tapes", {
      ...protectFloors(s, rangeFitCutT),
      pairTags,
      pairTps,
      pairCells,
      ...(wf.seatSet === "validated"
        ? { heldPairsOnly: heldUnpassedPairs }
        : {}),
      ...(validatedOnly ? { skipDca: !wf.toggles.dca, skipAxis: wf.toggles.axis === false } : {}),
      heldIds,
      microOwnInds: microOwnInds(s.grid),
      buildStats,
    });
    if (!built || gen !== this.gen) return;
    // Historic Exit is built on a dedicated path: it receives no Normal/Trailing grid, range tags, target filters,
    // Micro ownership checks, or range-fit rules. Its own configs were already qualified on causal prehistory and
    // the walk-forward/live PF gates decide whether each independent set gets a seat.
    const exitBuildStats = new Map<string, TapeBuildStat>();
    const engineExitProtects = Object.fromEntries(
      Object.entries(exitProtects).filter(([pair, ps]) => ps.length && !isSignalInd(pair.split("|")[1] ?? "")),
    );
    const signalExitProtects = Object.fromEntries(
      Object.entries(exitProtects).filter(([pair, ps]) => ps.length && isSignalInd(pair.split("|")[1] ?? "")),
    );
    const engineExitBuilt = await tapesFor(
      new Set(Object.keys(engineExitProtects)),
      [],
      undefined,
      "Historic Exit tapes",
      {
        minSl: s.protectFloor.minSl,
        minTrail: s.protectFloor.minTrail,
        pairProtects: engineExitProtects,
        heldIds,
        heldOnlyIds: retainedExitIds,
        buildStats: exitBuildStats,
      },
    );
    if (!engineExitBuilt || gen !== this.gen) return;
    const signalExitBuilt = await tapesFor(
      new Set(Object.keys(signalExitProtects)),
      [],
      undefined,
      "signal Historic Exit tapes",
      {
        minSl: sig.minSl,
        minTrail: sig.minTrail,
        signalTrailMax: sig.trailMax,
        entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
        pairProtects: signalExitProtects,
        heldIds,
        heldOnlyIds: retainedExitIds,
        buildStats: exitBuildStats,
      },
    );
    if (!signalExitBuilt || gen !== this.gen) return;
    const exitBuilt = [...engineExitBuilt, ...signalExitBuilt];
    const newBuildStats = [...buildStats.values(), ...exitBuildStats.values()];
    // a carried range trades on its tapes of the previous compute (not rebuilt in this one, never switched off) —
    // those end at the previous compute's last bar, so the configs paper holds (seated or with an open position) are
    // rebuilt on the current bars: only those ids (onlyIds), the rest of the range stays carried
    const carriedHeld = carryTags.size
      ? carriedRebuild(this.tapes, carryTags, heldIds, countProtects, countDcaProtects)
      : null;
    const rebuilt = carriedHeld
      ? await tapesFor(
          carriedHeld.pairs,
          carriedHeld.protects,
          // (Axis builds on the first DCA cell of the whole grid — a Wide config, never carried)
          carriedHeld.dcaProtects.length
            ? { ...dcaOpt, protects: carriedHeld.dcaProtects, axis: undefined }
            : undefined,
          "carried tapes",
          {
            ...protectFloors(s, rangeFitCutT),
            pairTags,
            pairTps,
            pairCells,
            heldIds,
            microOwnInds: microOwnInds(s.grid),
            onlyIds: carriedHeld.ids,
          },
        )
      : [];
    if (!rebuilt || gen !== this.gen) return;
    const mainTapes = carryTags.size
      ? withCarried(
          rebuilt.length ? [...built, ...rebuilt] : built,
          this.tapes,
          carryTags,
          wf.basePassedCells || wf.seatSet === "validated"
            ? (t) => !!wf.basePassed?.has(`${t.bot}|${t.ind}`) && cellAllowed(t, wf)
            : undefined,
        )
      : built;
    const strategyTapes = exitBuilt.length ? [...mainTapes, ...exitBuilt] : mainTapes;
    // Signals: the active signals (best N by Base on each symbol) run their own Normal + Trailing configs and,
    // per signals.strategies, the DCA (+ DCA Active) and Axis sets
    const sigStrat =
      sig.strategies.dca || sig.strategies.axis
        ? {
            ...dcaOpt,
            axis: sig.strategies.axis ? s.axis : undefined,
            noDca: !sig.strategies.dca,
          }
        : undefined;
    const pairProtectsOf = (pairs: ReadonlySet<string>) =>
      Object.fromEntries(
        [...pairs].flatMap((pair) => (sigHist[pair]?.length ? [[pair, sigHist[pair]!]] : [])),
      );
    const sourceHist = pairProtectsOf(sourcePairs);
    const coordHist = pairProtectsOf(coordinationPairs);
    const coordStrat = sigStrat ? { ...sigStrat, protects: coordProtects } : undefined;
    const sourceTapes = sourcePairs.size
      ? await tapesFor(sourcePairs, standard, sigStrat, "signal tapes", {
          minSl: sig.minSl,
          minTrail: sig.minTrail,
          signalReferenceGrid: true,
          signalTrailMax: sig.trailMax,
          entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
          pairProtects: sourceHist,
          heldIds,
          heldOnlyIds: retainedSignalIds,
        })
      : [];
    if (!sourceTapes || gen !== this.gen) return;
    const coordTapes = coordinationPairs.size
      ? await tapesFor(coordinationPairs, coordProtects, coordStrat, "signal coordination tapes", {
          minSl: sig.minSl,
          minTrail: sig.minTrail,
          signalReferenceGrid: true,
          signalTrailMax: sig.trailMax,
          entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
          pairProtects: coordHist,
          heldIds,
          heldOnlyIds: retainedSignalIds,
        })
      : [];
    sharedWuMemo = null;
    sharedSignalWuMemo = null;
    if (!coordTapes || gen !== this.gen) return;
    // Await physical exit, not just removal from the pool. Transferred tape arenas remain main-owned; only worker
    // heaps/caches are released. Ownership is rechecked synchronously by the pool, so foreign reuse is preserved.
    await retireOwnedIdleWorkers(computeWorkerOwner);
    if (gen !== this.gen) return;
    if (this.memPressured) throw new Error(this.memLastAbort ?? "memory pressure: compute aborted");
    // Worker scratch and shared-input references are dead at this phase boundary. Collect once here instead
    // of carrying their garbage into the simulation's first allocation burst.
    this.collectNow();
    const sigTapes = [...sourceTapes, ...coordTapes];
    if (nextStatus.signals) {
      nextStatus.signals.builtConfigs = sigTapes.length + signalExitBuilt.length;
      nextStatus.signals.coordinationBuiltConfigs = coordTapes.length + signalExitBuilt.filter(tp => isSignalCoordinationInd(tp.ind)).length;
    }
    // Historic Exit Signal configs run on their own independent protection proof and do not consume the Normal /
    // Trailing Signal ranking cap. Their exact keys are carried into the step gate; own Exit and Signal PF/Last-N
    // gates still recheck every entry causally.
    if (sig.enabled) for (const tp of signalExitBuilt) {
      const seen = new Set<string>();
      for (let i = 0; i < tp.n; i++) {
        const sym = tp.syms[tp.symI[i]];
        const side = tp.side[i] > 0 ? 1 : -1;
        const key = `${sym}|${side}`;
        if (!seen.has(key)) {
          seen.add(key);
          sigActive.add(sigActiveKey(tp.bot, tp.ind, sym, side, tp.kind, tp.id));
        }
      }
      for (const op of tp.open) {
        const key = `${op.sym}|${op.side}`;
        if (!seen.has(key)) {
          seen.add(key);
          sigActive.add(sigActiveKey(tp.bot, tp.ind, op.sym, op.side, tp.kind, tp.id));
        }
      }
    }
    // the realtime entry step rebuilds the seated configs with exactly these arguments (fastStep) — every range's
    // cells, a carried one's included (it builds only the seated ids: under a memory fallback the seated Micro /
    // Minimal configs took no new entry between computes)
    const nextFastArgs: NonNullable<CoreRuntime["fastArgs"]> = {
      main: {
        protects: countProtects,
        dcaFor: { ...dcaOpt, protects: countDcaProtects },
        floors: {
          ...protectFloors(s, rangeFitCutT),
          pairTags,
          pairTps,
          pairCells,
          heldIds,
          microOwnInds: microOwnInds(s.grid),
        },
      },
      sig: {
        protects: standard,
        dcaFor: sigStrat,
        floors: {
          minSl: sig.minSl,
          minTrail: sig.minTrail,
          signalReferenceGrid: true,
          signalTrailMax: sig.trailMax,
          entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
          pairProtects: sourceHist,
          heldIds,
          heldOnlyIds: retainedSignalIds,
        },
      },
      coord: {
        protects: coordProtects,
        dcaFor: coordStrat,
        floors: {
          minSl: sig.minSl,
          minTrail: sig.minTrail,
          signalReferenceGrid: true,
          signalTrailMax: sig.trailMax,
          entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
          pairProtects: coordHist,
          heldIds,
          heldOnlyIds: retainedSignalIds,
        },
      },
      adjust: adjustNow,
      bars: wu.series,
      signalBars: signalWu.series,
      exit: {
        protects: [],
        dcaFor: undefined,
        floors: {
          minSl: s.protectFloor.minSl,
          minTrail: s.protectFloor.minTrail,
          pairProtects: engineExitProtects,
          heldIds,
          heldOnlyIds: retainedExitIds,
        },
      },
      exitSig: {
        protects: [],
        dcaFor: undefined,
        floors: {
          minSl: sig.minSl,
          minTrail: sig.minTrail,
          signalTrailMax: sig.trailMax,
          entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
          pairProtects: signalExitProtects,
          heldIds,
          heldOnlyIds: retainedExitIds,
        },
      },
    };
    // a demo probe measures the plus cells live: their static last-N gate does not apply there
    const rangePublication = publishMinimalPlus(
      [...strategyTapes, ...sigTapes], newBuildStats, s.grid.minimalPlus,
      // Strictly before the run, never fitted on its future closes.
      wf.startT ?? Math.floor((wu.nowT - wf.simH * H) / H) * H,
      heldIds, !!(wf.probe?.perRange || wf.probe?.perCell),
    );
    const tapes = rangePublication.tapes;
    wf.signalRank = sig.enabled ? sig : undefined;
    wf.signalActive = sig.enabled ? sigActive : undefined;
    wf.signalGuardN = sig.enabled && sig.guard.enabled ? sig.guard.lastN : 0;
    wf.signalCluster = sig.enabled ? sig.cluster : undefined;
    wf.signalAccept = sig.enabled ? sig.accept : undefined;
    wf.signalSideAccept = sig.enabled ? sig.sideAccept : undefined;
    wf.signalOwnBase = sig.enabled && sig.ownBase !== false;
    wf.signalSourceGate = sig.enabled ? sig.sourceGate : undefined;
    wf.signalPerSymbol = sig.perSymbol;
    wf.signalMaxOpen = sig.maxOpen;
    wf.signalMaxPositions = sig.maxPositions;
    // wf and fastArgs remain private to this computation until its matching tapes and simulation are ready.
    // Publishing Base/Signal qualifiers here mixed old active tapes with new gates during every yielded slice,
    // and an interrupted computation left that mixed state in service indefinitely.
    let step = 0;
    // the steps the simulation really takes (its start is floored to the hour: up to one step more than
    // simH / stepH, which ran the bar past 100 %)
    const steps = Math.max(1, walkForwardSteps(wu, wf));
    this.setStage("Real", 0, steps, `${wf.simH}h sim · step 0/${steps}`);
    const sim = await this.researchSimulation(wu, tapes, wf, gen, (v) => {
      if (v >= 0) {
        step++;
        this.setStage(
          "Real",
          step,
          steps,
          `${wf.simH}h sim · step ${Math.min(step, steps)}/${steps} · engine ${wf.preH}h pre / Last-${wf.validLastN ?? 0}${sig.enabled ? ` · Signals ${signalHistoryHours(wf)}h / Last-${wf.rangeOpts?.sig?.validLastN ?? wf.signalValidLastN ?? 0}` : ""} · entry Last-${wf.lastN}`,
        );
      }
    });
    if (
      gen !== this.gen ||
      computeRevision !== computeKey(this.settings, this.wf) ||
      this.resetUniverse
    )
      return;
    // Count the exact finished cohort, not the temporary worker inputs or a partially built next cohort.
    const strategyCoverage = await this.drive("Strategy coverage", strategyCoverageGen(tapes), () => undefined, gen);
    // the realtime entry step stands aside while the new tapes and run replace the old ones, until the full paper
    // step has seated on them (it re-checks the hold at every slice)
    if (
      gen !== this.gen ||
      computeRevision !== computeKey(this.settings, this.wf) ||
      this.resetUniverse
    )
      return;
    this.fastHold = true;
    await this.paperIdle();
    if (
      gen !== this.gen ||
      computeRevision !== computeKey(this.settings, this.wf) ||
      this.resetUniverse
    )
      return;
    const appliedSettingsAt = this.status.settingsAt;
    nextStatus.strategyCoverage = { ...strategyCoverage, completedAt: Date.now(), through: sim.endT };
    // No yield between the execution qualifiers, realtime rebuild inputs and their matching data publication.
    // Keep the previous complete snapshot usable until this point, including when a worker/compute fails.
    this.resetRealtime("qualified research cohort replaced");
    Object.assign(this.wf, {
      basePassed: wf.basePassed,
      basePassedCells: wf.basePassedCells,
      exitBasePassed: wf.exitBasePassed,
      basePassedRanges: wf.basePassedRanges,
      basePassedTargets: wf.basePassedTargets,
      baseWideLadderPairs: wf.baseWideLadderPairs,
      family: wf.family,
      signalBasePassed: wf.signalBasePassed,
      paused: wf.paused,
      signalGuardN: wf.signalGuardN,
      signalCluster: wf.signalCluster,
      signalAccept: wf.signalAccept,
      signalSideAccept: wf.signalSideAccept,
      signalOwnBase: wf.signalOwnBase,
      signalSourceGate: wf.signalSourceGate,
      signalPerSymbol: wf.signalPerSymbol,
      signalMaxOpen: wf.signalMaxOpen,
      signalMaxPositions: wf.signalMaxPositions,
    });
    Object.assign(this.status, nextStatus);
    this.buildStats = rangePublication.buildStats;
    this.fastArgs = nextFastArgs;
    this.basePairTags = pairTags;
    this.pipeline = pipeline;
    this.lastUniverse = u;
    this.inc = null;
    this.incTail = nextIncTail;
    this.tapes = tapes;
    publication.done = true;
    if (history.store) {
      const h = history.store.stats;
      this.status.phases["History storage"] = {
        ms: h.writeMs,
        maxSliceMs: h.maxWriteMs,
        slowest: `${h.tapes} complete tapes · ${(h.rawBytes / 1048576).toFixed(0)} MiB raw / ${(h.storedBytes / 1048576).toFixed(0)} MiB stored · ${(h.peakCacheBytes / 1048576).toFixed(0)} MiB peak column cache`,
      };
    }
    this.sim = sim;
    this.status.relateAdjustment = {
      enabled: this.wf.relate?.enabled === true,
      auto: this.wf.relate?.auto !== false,
      mode: this.wf.relate?.mode ?? "additive",
      maxStack: this.wf.relate?.maxStack ?? MAX_EXTERNAL_STACK,
      relations: sim.relate?.relations ?? 0,
      qualified: sim.relate?.qualified ?? 0,
      closes: sim.relate?.closes ?? 0,
      maxSample: sim.relate?.maxSample ?? 0,
      shadowCloses: sim.relate?.shadowCloses ?? 0,
    };
    // This exact settings revision is now published. Entry admission remains fenced by executionPending
    // until its matching paper step finishes; failed/superseded computes never reach this publication.
    this.settingsStale = false;
    this.realtimeLearning = { sim, feed: [...(sim.feed ?? [])], accepted: [] };
    // Rebuild open Active shadows from the published simulation after restart or a fresh generation. Keep
    // later realtime shadows that were created while this simulation was still computing.
    const shadowPending = new Map<string, { entryT: number; base: number; parts: RelateParts }>();
    if (this.wf.relate?.enabled) {
      for (const [key, value] of this.relateShadowPending)
        if (value.entryT >= sim.endT) shadowPending.set(key, value);
      for (const row of sim.feed ?? [])
        if (row.open && row.relateShadow && row.cfg && row.entryT !== undefined && row.relateBase !== undefined)
          shadowPending.set(orderKey({ cfg: row.cfg, sym: row.sym, side: row.side, entryT: row.entryT }),
            { entryT: row.entryT, base: row.relateBase, parts: row.relateParts ?? {} });
    }
    this.relateShadowPending = shadowPending;
    this.coordCache = null;
    this.status.validated = sim.validated?.length;
    // the previous set's index and the live books of the previous run (its feed, guard and acceptance index) are
    // released now: rebuilt on first use, as they were when they no longer matched — kept, they pinned the old set
    // (0.5–0.8 GB) for up to 30 s after every swap, the Paper / Audit peak
    this.tapeIdx = null;
    this.liveBooks = null;
    // paper / live trade on the set ranked at the end of the simulated run (causal, latest results)
    if (sig.enabled && sim.signalActiveEnd) {
      sigActive = new Set(sim.signalActiveEnd);
      // negative-hour hedge signals join the paper / live set; they trade only while the book is losing
      this.hedgeKeys = new Set((sim.hedgeEnd ?? []).filter((k) => !sigActive.has(k)));
      for (const k of this.hedgeKeys) sigActive.add(k);
      this.wf.signalActive = sigActive;
      if (nextStatus.signals) {
        nextStatus.signals.active = sigActive.size;
        nextStatus.signals.activation = sim.signalActivationEnd;
        nextStatus.signals.coordinationActive = [...sigActive].filter((key) =>
          isSignalCoordinationInd(key.split("|")[1] ?? ""),
        ).length;
      }
    } else this.wf.signalActive = wf.signalActive;
    // stage sets of this compute, for the self-audit (Base-validated → Main config sets → Real → trades)
    this.stageSets = {
      passed: passedKeys,
      measured: new Set(passed.map((r) => `${r.bot}|${r.ind}`).filter((k) => !passedKeys.has(k))),
      main: new Set(main),
      held,
      pinned: new Set(s.pinned ?? []),
      mainTop: s.mainTop,
      // the set paper / live trade (the simulation's end set), not the Base ranking the compute started from
      signalActive: this.wf.signalActive,
    };
    const sigStatus = nextStatus.signals;
    if (sigStatus && sig.enabled) {
      // in slices: the guard replays every candidate of the run (hundreds of thousands with every config its own seat).
      // The status reads only its disabled keys (each config's last results), so only those lists are fed — the
      // loss-cluster closes, entry onsets and acceptance groups of a full feedBooks replay held 50–150 MB at the end of
      // every compute for one count (the same count)
      const g = new SignalGuard();
      const feedAll = sim.feed ?? [];
      const sigSummary = function* () {
        for (let i = 0; i < feedAll.length; i++) {
          const e = feedAll[i];
          if (!e.open && e.ind && isSignalInd(e.ind))
            g.add(guardKey(e.cfg ?? e.ind, e.sym, e.side, e.type ?? "normal"), e.r);
          if ((i + 1) % 20_000 === 0) yield i;
        }
        const xs = sim.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? ""));
        const endpoint = (sim.openAtEnd ?? []).filter((x) => isSignalInd(x.cfg.split("|")[1] ?? ""));
        const endpointBook = openBook(endpoint);
        const counts = positionOrderCounts(xs, endpoint);
        yield 0;
        const st = unitStatsReport(unitStatsOf(xs), xs.length);
        const tl = openTimeline([...xs, ...endpoint], sim.startT, sim.endT);
        const coord = xs.filter((x) => isSignalCoordinationInd(x.cfg.split("|")[1] ?? ""));
        const coordStats = unitStatsOf(coord);
        const coordEndpoint = endpoint.filter((x) => isSignalCoordinationInd(x.cfg.split("|")[1] ?? ""));
        const coordTimeline = openTimeline([...coord, ...coordEndpoint], sim.startT, sim.endT);
        const coordEndpointBook = openBook(coordEndpoint);
        const coordCounts = positionOrderCounts(coord, coordEndpoint);
        yield 0;
        return {
          disabled: sig.guard.enabled ? g.disabledKeys(sig.guard.lastN).length : 0,
          trades: xs.length,
          pf: st.pf,
          net: st.net,
          noLoss: st.noLoss,
          pfConvention: st.pfConvention,
          // positions (symbol × direction, closed episodes) and orders (every order and partial) apart
          positions: counts.closedPositions,
          orders: xs.length,
          openedOrders: counts.openedOrders,
          openedPositions: counts.openedPositions,
          openAtEndOrders: endpoint.length,
          openAtEndPositions: endpointBook.positions,
          peakPositions: Math.max(tl.maxPositions, endpointBook.positions),
          peakOrders: Math.max(tl.maxOrders, endpoint.length),
          coordinationTrades: coord.length,
          coordinationPf: coordStats.pf,
          coordinationNet: coordStats.net,
          coordinationPositions: coordCounts.closedPositions,
          coordinationOrders: coord.length,
          coordinationPeakPositions: Math.max(coordTimeline.maxPositions, coordEndpointBook.positions),
          coordinationPeakOrders: Math.max(coordTimeline.maxOrders, coordEndpoint.length),
        };
      };
      Object.assign(
        sigStatus,
        await this.drive("Signal status", sigSummary(), () => undefined, gen),
      );
    }
    this.phase("Persist sim", () => this.persistSim(sim));
    this.phase("Auto preset", () => this.autoPreset(s, wf, sim));
    // the pre-historic stats in slices (one pass over every simulated trade per slice)
    const prehist = await this.drive(
      "Prehistoric",
      prehistStatsGen(sim.trades, sim.startT, sim.endT),
      () => undefined,
      gen,
    );
    this.updatePrehist(
      u.bars.map((b) => b.sym),
      pipeline,
      tapes,
      sim,
      wf,
      prehist,
    );
    // every preset on the same tapes (the Compare page): after the paper step, so the book never waits for a UI table
    // (CTS_CORE_COMPARE=0 on live desks and session runs: no comparison at all)
    this.compareInput =
      process.env.CTS_CORE_COMPARE !== "0"
        ? {
            tapes,
            wf,
            wu,
            startT: sim.startT,
            endT: sim.endT,
            gen,
            key: computeKey(this.settings, this.wf),
          }
        : null;
    this.computeSummary = `Sim PF including ${sim.openAtEnd?.length ?? "unrecorded"} open marks: ${primaryPfLabel(sim.stats)} · DDT ${sim.stats.ddt.toFixed(1)}h · green ${Math.round(sim.stats.gh * 100)}% · validate last ${wf.validLastN ?? 0} · live last ${wf.lastN}`;
    // the paper step on the new tapes follows in this cycle (it was "Real 100 %" again after Compare — backwards)
    this.setStage("Paper", 0, 1, `paper step next · ${this.computeSummary}`);
    this.status.computes++;
    this.status.lastComputeMs = performance.now() - t0;
    this.status.lastComputeAt = Date.now();
    this.status.appliedSettingsAt = appliedSettingsAt;
    if (gen === this.gen && computeRevision === computeKey(this.settings, this.wf)) {
      const isMeasuredIndication = (ind: string) => {
        const base = laneOf(ind).base;
        return (
          base.startsWith("tactic-") ||
          base.startsWith("relate-") ||
          base.startsWith("break-rel-") ||
          base.startsWith("break-mc-rel-") ||
          base.startsWith("micro-") ||
          base.startsWith("low-range-") ||
          base.startsWith("inverse-")
        );
      };
      const measuredRuns = pipeline.s1.filter((r) => isMeasuredIndication(r.ind));
      const countPairs = allCombos(baseFocus(s), s.disabledKinds, s.tfs, microLaneFloor(s.grid),
        s.grid.lowRange?.enabled === true && !!s.grid.short, rangeMinTfOf(s.grid).sh ?? 0)
        .filter((r) => isMeasuredIndication(r.ind))
        .map((r) => `${r.bot}|${r.ind}`);
      const admittedPairKeys = passed
        .filter(
          (r) =>
            isMeasuredIndication(r.ind) &&
            setsPassTags(r, setsGates, applies, ALL_RANGE_TAGS).length > 0,
        )
        .map((r) => `${r.bot}|${r.ind}`);
      const kinds = (["normal", "trailing", "trailing-only", "dca", "dca-active", "axis"] as const).filter((kind) =>
        kindExecutable(kind, wf.toggles),
      );
      const enabled = ["tactic", "relate", "break", "micro", "inverse", ...(s.grid.lowRange?.enabled ? ["low-range"] : [])].some(
        (kind) => !s.disabledKinds?.includes(kind),
      );
      const reason = !enabled
        ? "typeDisabled"
        : !countPairs.length
          ? "focusExcluded"
          : !kinds.length
            ? "strategiesDisabled"
            : !measuredRuns.length
              ? "noBaseHistory"
              : !admittedPairKeys.length
                ? "representativesNotAdmitted"
                : undefined;
      // All configured range cells are measured. Base representative target/range pruning is not a substitute
      // for evaluating the other cells; only structural lane/Micro/horizon rules remain, with explicit skip counts.
      const countApplies = baseRangeRules(s).applies;
      const countTags = Object.fromEntries(
        countPairs.map((pair) => {
          const ind = pair.split("|")[1];
          return [
            pair,
            ["", ...ALL_RANGE_TAGS].filter((tag) => rangeAppliesTo(ind, tag, countApplies)),
          ];
        }),
      );
      const input: Omit<BaseConfigJob, "key" | "settingsAt"> = {
        pairs: countPairs,
        admittedPairKeys,
        protects: [...countProtects],
        kinds,
        reason,
        dcaOpt: { protects: countDcaProtects, dca: wf.dca, axis: s.axis },
        common: {
          evaluationFromT: this.evaluationFromT,
          bars: sharedU,
          cost: s.cost,
          tactics: s.tactics,
          options: {
            gates: s.gates,
            cost: s.cost,
            cutT: wf.causalBase ? runStartT : u.nowT,
            fromT: uStage.startT,
          },
          floors: {
            ...protectFloors(s, rangeFitCutT),
            pairTags: countTags,
            countFitProtects: countProtects,
            microOwnInds: microOwnInds(s.grid),
          },
        },
      };
      this.baseConfigRunner.request({
        ...input,
        key: baseConfigJobKey(input),
        settingsAt: appliedSettingsAt,
      });
    }
    this.status.pending = this.dirty;
    this.status.loop = {
      p50: this.loop.percentile(50) / 1e6,
      p99: this.loop.percentile(99) / 1e6,
      max: this.loop.max / 1e6,
      ...(this.status.loop?.recent ? { recent: this.status.loop.recent } : {}),
    };
    const ph = Object.entries(this.status.phases)
      .map(([k, v]) => `${k} ${Math.round(v.ms)}/${Math.round(v.maxSliceMs)}`)
      .join(" · ");
    this.db.run(
      "INSERT INTO runs (kind, started, ended, items, ms, note) VALUES (?, ?, ?, ?, ?, ?)",
      "compute",
      Date.now() - Math.round(this.status.lastComputeMs),
      Date.now(),
      pipeline.s1.length + pipeline.s2.length + tapes.length,
      this.status.lastComputeMs,
      `${ph} (ms total/max slice) · loop p99 ${this.status.loop.p99.toFixed(0)} max ${this.status.loop.max.toFixed(0)}`,
    );
    // host log: at most one line per 5 minutes (the events table keeps the full, bounded record)
    if (Date.now() - this.lastConsoleAt > 5 * 60_000) {
      this.lastConsoleAt = Date.now();
      console.info(
        `[core-v2] compute #${this.status.computes} done in ${Math.round(this.status.lastComputeMs)} ms · sim PF including ${sim.openAtEnd?.length ?? "unrecorded"} open marks: ${primaryPfLabel(sim.stats)} n ${sim.stats.n} · loop max ${this.status.loop.max.toFixed(0)} ms${this.status.loop.recent ? ` (worst slice of the last 60 s ${this.status.loop.recent.ms} ms in ${this.status.loop.recent.where}, ${this.status.loop.recent.n} over 40 ms)` : ""}`,
      );
    }
    this.emit("compute");
    // a compute run on its own (not by the cycle, which steps paper next) compares the presets and closes its job here
    if (!this.inCycle) {
      await this.comparePresets(gen);
      this.endJob(this.computeSummary);
    }
    this.db.event(
      "info",
      `compute #${this.status.computes}: sim PF including ${sim.openAtEnd?.length ?? "unrecorded"} open marks: ${primaryPfLabel(sim.stats)} net ${sim.stats.net.toFixed(1)}% n ${sim.stats.n} · armed ${pipeline.armed.length} · ${Math.round(this.status.lastComputeMs)}ms`,
    );
  }

  /** The compute's inputs for the preset comparison (null: nothing to compare, or CTS_CORE_COMPARE=0). */
  private compareInput: {
    tapes: ConfigTape[];
    wf: WalkForwardOptions;
    wu: ReturnType<typeof makeUniverse>;
    startT: number;
    endT: number;
    gen: number;
    key: string;
  } | null = null;
  private compareAbort: AbortController | null = null;
  private researchAbort: AbortController | null = null;
  private compareRetryAt = 0;
  private cancelCompare(reason: string) {
    const pending = this.compareAbort || this.compareInput;
    this.compareAbort?.abort(new Error(`Compare canceled: ${reason}`));
    this.compareInput = null;
    this.compareRetryAt = 0;
    if (pending && this.status.compare)
      this.status.compare = {
        ...this.status.compare,
        running: false,
        deferred: `Compare canceled: ${reason}`,
        retryAt: undefined,
      };
  }
  /** Uses the tighter host/cgroup reading, independently of the foreground compute's guard. */
  private compareAvailableBytes(): number {
    return memInfo().availMb * 1048576;
  }
  private compareOnWorkers(
    messages: Array<Record<string, unknown>>,
    size: number,
    progress: (fraction: number) => void,
    signal: AbortSignal,
  ) {
    return runOnWorkers<{ results: Array<{ name: string } & Record<string, unknown>> }>(
      messages,
      size,
      15 * 60_000,
      progress,
      false,
      signal,
    );
  }

  /**
   * Every preset on the compute's tapes, side by side (with / without Block, DCA and Active) for the Compare page:
   * run after the paper step, outside the job's progress (status.compare), so the book and the live control never wait
   * for it. It walks every tape once per preset, on the worker cores when available.
   */
  private async comparePresets(gen = this.gen) {
    const input = this.compareInput;
    this.compareInput = null;
    if (!input) return;
    const current = () =>
      input.gen === gen && gen === this.gen && input.key === computeKey(this.settings, this.wf);
    if (!current()) return;
    const { tapes, wf, wu, startT, endT } = input;
    const previous = this.status.compare;
    const names = Object.keys(STRATEGY_PRESETS);
    const defer = (reason: string) => {
      // Keep only the latest snapshot; a stop/settings change must never resurrect an old job.
      if (!current() || this.stopped) return;
      if (!this.compareInput) this.compareInput = input;
      this.compareRetryAt = Date.now() + 5000;
      this.status.compare = {
        ...previous,
        running: false,
        done: previous?.done ?? 0,
        total: previous?.total ?? names.length,
        deferred: reason,
        retryAt: this.compareRetryAt,
      };
    };
    const estimate = compareTapeBytes(tapes);
    const workerPath = names.length > 0 && workersAvailable() && !this.workersBroken;
    let n = compareWorkers(
      workerPath ? poolSize() : 1,
      estimate,
      this.compareAvailableBytes(),
      workerPath,
    );
    if (names.length && n === 0) {
      defer("Compare deferred: insufficient memory for packing and walk-forward state");
      return;
    }
    const controller = new AbortController();
    this.compareAbort = controller;
    const checkMemory = () => {
      if (this.compareAvailableBytes() < memHardMb() * 1048576 && !controller.signal.aborted)
        controller.abort(
          new CompareMemoryDeferred("Compare deferred: memory fell below the hard reserve"),
        );
      controller.signal.throwIfAborted();
    };
    const monitor = setInterval(() => {
      try {
        checkMemory();
      } catch {
        /* the owned job observes its aborted signal */
      }
    }, 1000);
    monitor.unref?.();
    const guarded = function* <T, R>(work: Generator<T, R>): Generator<T, R> {
      try {
        for (;;) {
          checkMemory();
          const r = work.next();
          if (r.done) return r.value;
          yield r.value;
        }
      } finally {
        work.return?.(undefined as R);
      }
    };
    const compareAt = (done: number, total: number) => {
      checkMemory();
      this.status.compare = { running: true, done, total, at: this.status.compare?.at };
      this.status.heartbeat = Date.now();
    };
    const presets: Record<string, unknown> = {};
    const tc = performance.now();
    let maxSlice = 0;
    let transfer: HistoryTransfer | undefined;
    try {
      // on the worker cores when available: the presets are dealt round-robin, each worker walks its share
      let viaWorkers = false;
      if (workerPath) {
        // one shared buffer + one metadata string for every worker (cloning the tape objects per worker stalled
        // the event loop for seconds at 40+ symbols)
        const payload = tapes.some(t => historyOf(t))
          ? { historyManifest: (transfer = await this.drive("Share histories", guarded(transferHistoriesGen(tapes)), () => undefined, gen)).path }
          : { packed: await this.drive("Pack tapes", guarded(packTapesGen(tapes)), () => undefined, gen) };
        if (gen !== this.gen) return;
        // each worker walks every tape once per preset: on a large book fewer workers at once keep the memory
        // inside the machine (the presets queue on the pool)
        // Recheck after packing; another runtime may have consumed the original admission headroom.
        // memInfo can reuse a one-second reading. Rechecking must never increase the original admission
        // using headroom already spent on the packed copy.
        n = Math.min(n, compareWorkers(poolSize(), estimate, this.compareAvailableBytes(), false));
        if (n === 0)
          throw new CompareMemoryDeferred("Compare deferred: insufficient memory after packing");
        const parts: string[][] = Array.from({ length: n }, () => []);
        names.forEach((nm, i) => parts[i % n].push(nm));
        compareAt(0, names.length);
        try {
          const res = await this.compareOnWorkers(
            parts
              .filter((p) => p.length)
              .map((pp) => ({
                type: "compare",
                nowT: wu.nowT,
                baseTf: wu.baseTf,
                ...payload,
                wf,
                presets: pp.map((name) => ({ name, toggles: STRATEGY_PRESETS[name].toggles })),
              })),
            n,
            (fraction) => {
              // A worker event listener must not throw: abort its owned call through the signal instead.
              if (gen === this.gen)
                try {
                  compareAt(fraction, 1);
                } catch (err) {
                  if (!controller.signal.aborted) controller.abort(err);
                }
            },
            controller.signal,
          );
          checkMemory();
          if (!current()) return;
          for (const x of res.flatMap((r) => r.results)) {
            const { name, ...rest } = x;
            presets[name] = {
              label: STRATEGY_PRESETS[name].label,
              toggles: STRATEGY_PRESETS[name].toggles,
              ...rest,
            };
          }
          viaWorkers = true;
        } catch (err) {
          if (gen !== this.gen) return;
          if (controller.signal.aborted) throw controller.signal.reason;
          if (isWorkersAbort(err))
            throw new CompareMemoryDeferred(
              "Compare deferred: worker pool stopped under memory pressure",
            );
          this.workersFailed(err, "Compare");
        }
      }
      for (let i = 0; i < (viaWorkers ? 0 : names.length); i++) {
        const name = names[i];
        compareAt(i, names.length);
        const r = await this.drive(
          "Compare",
          guarded(walkForwardGen(wu, tapes, { ...wf, toggles: STRATEGY_PRESETS[name].toggles })),
          () => undefined,
          gen,
        );
        maxSlice = Math.max(maxSlice, this.status.phases.Compare?.maxSliceMs ?? 0);
        presets[name] = {
          label: STRATEGY_PRESETS[name].label,
          toggles: STRATEGY_PRESETS[name].toggles,
          stats: r.stats,
          hourly: r.hourly,
          byKind: r.byKind,
          skips: r.skips,
          blocks: r.blocks,
          stable: r.stable,
        };
      }
      checkMemory();
      if (!current()) return;
      this.status.phases.Compare = { ms: performance.now() - tc, maxSliceMs: maxSlice };
      this.db.kvSet("presetSims", { at: Date.now(), startT, endT, presets });
      this.compareRetryAt = 0;
      this.status.compare = {
        running: false,
        done: names.length,
        total: names.length,
        at: Date.now(),
      };
    } catch (err) {
      if (err instanceof CompareMemoryDeferred) {
        defer(err.message);
        return;
      }
      if (controller.signal.aborted && (this.stopped || !current())) return;
      throw err;
    } finally {
      clearInterval(monitor);
      if (this.compareAbort === controller) this.compareAbort = null;
      transfer?.close();
    }
  }

  /** Write rows in small transactions, yielding between them. */
  private async writeChunked(
    rows: Iterable<[string, Array<string | number | null>]>,
    gen: number,
    chunk = 1500,
  ) {
    const db = this.db;
    let n = 0;
    let slice = performance.now();
    let maxSlice = 0;
    db.db.exec("BEGIN");
    try {
      for (const [sql, p] of rows) {
        db.run(sql, ...p);
        // a slice ends on time as well as on count: a row's cost varies (per-symbol JSON, tape rows) and 1,500 rows
        // held the loop up to ~590 ms (x02, 7 Oct)
        if (++n % chunk === 0 || (n % 64 === 0 && performance.now() - slice > SLICE_MS)) {
          db.db.exec("COMMIT");
          maxSlice = Math.max(maxSlice, performance.now() - slice);
          await yieldNow();
          if (gen !== this.gen) throw new Error("superseded by a newer loop generation");
          slice = performance.now();
          db.db.exec("BEGIN");
        }
      }
      db.db.exec("COMMIT");
    } catch (e) {
      try {
        db.db.exec("ROLLBACK");
      } catch {
        /* no open transaction */
      }
      throw e;
    }
    return Math.max(maxSlice, performance.now() - slice);
  }

  private async persistPipeline(o: PipelineOutput, gen: number, detail: NonNullable<CoreRuntime["baseDetail"]>) {
    const t0 = performance.now();
    const now = Date.now();
    const db = this.db;
    const TABLES = ["results", "lastn", "tapes"] as const;
    db.shadowCreate(TABLES);
    const ins = `INSERT OR REPLACE INTO results_next (id, stage, bot, ind, tp, sl, trail, hold, n, pf, net, wr, mdd, ddt, gh, tph, is_n, is_pf, is_net, score,
        rank, armed, best_n, oos_n, oos_pf, oos_net, oos_ddt, lastn_ok, eval_pass, eval_ok, by_sym, at) VALUES (${Array(32).fill("?").join(",")})`;
    const lnIns =
      "INSERT OR REPLACE INTO lastn_next (cfg, n, part, taken, pf, net, ddt, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const evIns =
      "INSERT INTO evals (cfg, at, win, n, pf, net, ddt, wr, pass) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const tpIns =
      "INSERT OR REPLACE INTO tapes_next (cfg, sym, side, entry_t, exit_t, entry, exit, r, reason, bars) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const rankedById = new Map(o.ranked.map((k) => [k.id, k]));
    const s2Ids = new Set(o.s2.map((r) => r.id));
    function* rows(): Generator<[string, Array<string | number | null>]> {
      for (const r of o.s1) {
        // a Base row whose id was refined in Main is represented by the Main row
        if (s2Ids.has(r.id)) continue;
        yield [
          ins,
          [
            r.id,
            1,
            r.bot,
            r.ind,
            r.protect.tp,
            r.protect.sl,
            r.protect.trail,
            r.protect.hold,
            r.full.n,
            r.full.pf,
            r.full.net,
            r.full.wr,
            r.full.mdd,
            r.full.ddt,
            r.full.gh,
            r.full.tph,
            r.is.n,
            r.is.pf,
            r.is.net,
            r.score,
            null,
            0,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            // (per-symbol detail: no reader — 9 MB of JSON kept in the database and its snapshot every compute)
            null,
            now,
          ],
        ];
      }
      for (const r of o.s2) {
        const k = rankedById.get(r.id);
        yield [
          ins,
          [
            r.id,
            k ? 3 : 2,
            r.bot,
            r.ind,
            r.protect.tp,
            r.protect.sl,
            r.protect.trail,
            r.protect.hold,
            r.full.n,
            r.full.pf,
            r.full.net,
            r.full.wr,
            r.full.mdd,
            r.full.ddt,
            r.full.gh,
            r.full.tph,
            r.is.n,
            r.is.pf,
            r.is.net,
            r.score,
            k?.rank ?? null,
            k?.armed ? 1 : 0,
            k?.lastN?.bestN ?? null,
            k?.lastN?.oos.n ?? null,
            k?.lastN?.oos.pf ?? null,
            k?.lastN?.oos.net ?? null,
            k?.lastN?.oos.ddt ?? null,
            k?.lastN ? (k.lastN.success ? 1 : 0) : null,
            k?.evalRes?.passRatio ?? null,
            k?.evalRes ? (k.evalRes.success ? 1 : 0) : null,
            null,
            now,
          ],
        ];
      }
      for (const k of o.ranked) {
        if (k.lastN) {
          for (const r of k.lastN.rows)
            yield [lnIns, [k.id, r.n, "is", r.taken, r.pf, r.net, r.ddt, r.score]];
          for (const r of k.lastN.oosRows)
            yield [lnIns, [k.id, r.n, "oos", r.taken, r.pf, r.net, r.ddt, r.score]];
          yield [
            lnIns,
            [
              k.id,
              0,
              "is",
              k.lastN.baseline.is.n,
              k.lastN.baseline.is.pf,
              k.lastN.baseline.is.net,
              k.lastN.baseline.is.ddt,
              0,
            ],
          ];
          yield [
            lnIns,
            [
              k.id,
              0,
              "oos",
              k.lastN.baseline.oos.n,
              k.lastN.baseline.oos.pf,
              k.lastN.baseline.oos.net,
              k.lastN.baseline.oos.ddt,
              0,
            ],
          ];
        }
        for (const t of o.tapes.get(k.id) ?? [])
          yield [
            tpIns,
            [t.cfg, t.sym, t.side, t.entryT, t.exitT, t.entry, t.exit, t.r, t.reason, t.bars],
          ];
      }
    }
    const maxSlice = await this.writeChunked(rows(), gen);
    const ts = performance.now();
    db.shadowSwap(TABLES);
    // Detail reconstruction belongs to these published database rows, including their causal cutoff and the
    // independent Signal history. Keep raw column references only; per-request indicator caches are released.
    this.baseDetail = detail;
    // evals are a history table: written in one small transaction after the swap (a superseded compute
    // never leaves partial rows); a recompute of the same instant replaces its rows
    db.tx(() => {
      db.run("DELETE FROM evals WHERE at = ?", o.universe.nowT);
      for (const k of o.ranked) {
        if (!k.evalRes) continue;
        for (const w of k.evalRes.windows)
          db.run(
            evIns,
            k.id,
            o.universe.nowT,
            w.key,
            w.n,
            w.pf,
            w.net,
            w.ddt,
            w.wr,
            w.pass ? 1 : 0,
          );
      }
    });
    db.kvSet("pipeline", {
      at: o.at,
      universe: o.universe,
      timings: o.timings,
      armed: o.armed,
      s1: o.s1.length,
      s2: o.s2.length,
      ranked: o.ranked.length,
      portfolio: {
        members: o.portfolio.members,
        guardPct: o.portfolio.guardPct,
        is: o.portfolio.is,
        oos: o.portfolio.oos,
        full: o.portfolio.full,
        hourly: o.portfolio.hourly,
      },
    });
    this.status.phases.Persist = {
      ms: performance.now() - t0,
      maxSliceMs: Math.max(maxSlice, performance.now() - ts),
    };
  }

  // ── progressive prehistoric start ──────────────────────────
  /**
   * Symbols the universe holds: the symbol count, or the forced symbols when there are more of them (the ranking
   * fills the rest up to the count, forced symbols included). Session scripts and the status totals use it.
   */
  universeTarget(): number {
    const forced = new Set((this.settings.forceSymbols ?? []).map(normSymbol).filter(Boolean)).size;
    return Math.max(this.settings.symbols, forced);
  }

  /**
   * The progressive start's total: the backfill's universe once known (a ranking with fewer liquid symbols than
   * asked gives fewer), else the target; never below the symbols loaded, so loaded / total never exceeds 100 %.
   * (The status after a compute used the backfill's count only, the status before it the symbol setting.)
   */
  private prehistTarget(): number {
    return Math.max(this.prehistTotal || this.universeTarget(), this.candles.size);
  }

  /** Publish loaded / ready counts before a compute finishes, so the desk does not keep the previous batch. */
  private touchPrehist() {
    if (!this.candles.size && !this.prehistSyms.size) return;
    if (!this.prehistStartedAt) this.prehistStartedAt = this.status.startedAt || Date.now();
    const prev = this.status.prehistoric;
    const symbols: PrehistoricStatus["symbols"] = {};
    for (const [sym, v] of this.prehistSyms) {
      const old = prev?.symbols[sym];
      symbols[sym] = {
        state: v.state,
        bars: this.candles.get(sym)?.n ?? v.bars,
        n: old?.n ?? 0,
        pf: old?.pf,
      };
    }
    for (const sym of this.candles.keys()) {
      if (symbols[sym]) continue;
      symbols[sym] = { state: "computing", bars: this.candles.get(sym)?.n, n: 0 };
    }
    const ready = Object.values(symbols).filter((v) => v.state === "ready").length;
    this.status.prehistoric = {
      hours: prev?.hours ?? this.wf.preH,
      simH: prev?.simH ?? this.wf.simH,
      total: this.prehistTarget(),
      loaded: this.candles.size,
      ready,
      complete: Boolean(prev?.complete) && !this.prehistPending,
      startedAt: this.prehistStartedAt,
      readyAt: this.prehistReadyAt,
      symbols,
      stats: prev?.stats ?? null,
      counts: prev?.counts ?? { base: 0, main: 0, sets: 0, real: 0, evals: 0, armed: 0 },
    };
  }

  private updatePrehist(
    computed: string[],
    pipeline: PipelineOutput,
    tapes: ConfigTape[],
    sim: WalkForwardResult,
    wf: WalkForwardOptions,
    stats: PrehistStats,
  ) {
    if (!this.prehistStartedAt) this.prehistStartedAt = this.status.startedAt;
    for (const sym of computed)
      this.prehistSyms.set(sym, {
        ...(this.prehistSyms.get(sym) ?? {}),
        state: "ready",
        bars: this.candles.get(sym)?.n,
      });
    const per = new Map(stats.perSymbol.map((x) => [x.sym, x]));
    const symbols: PrehistoricStatus["symbols"] = {};
    for (const [sym, v] of this.prehistSyms)
      symbols[sym] = { ...v, n: per.get(sym)?.n ?? 0, pf: per.get(sym)?.pf };
    const ready = [...this.prehistSyms.values()].filter((v) => v.state === "ready").length;
    const complete = !this.prehistPending;
    if (complete && !this.prehistReadyAt) {
      this.prehistReadyAt = Date.now();
      this.db.event(
        "info",
        `prehistoric start complete: ${ready} symbols computed, realtime running (PF ${stats.pf === null ? "unavailable" : stats.pf.toFixed(2)}, ${stats.n} trades)`,
      );
    }
    this.status.prehistoric = {
      hours: wf.preH,
      simH: wf.simH,
      total: this.prehistTarget(),
      loaded: this.candles.size,
      ready,
      complete,
      startedAt: this.prehistStartedAt,
      readyAt: this.prehistReadyAt,
      symbols,
      stats,
      counts: {
        base: pipeline.s1.length,
        main: this.status.mainPairs,
        sets: tapes.length,
        real: sim.steps[sim.steps.length - 1]?.real.length ?? 0,
        evals: pipeline.ranked.filter((r) => r.evalRes).length,
        armed: pipeline.armed.length,
      },
    };
  }

  // ── live-feedback auto-adjuster ────────────────────────────
  adjustState(): AdjustState {
    return this.db.kvGet<AdjustState>("adjust") ?? {};
  }

  /** measured live round-trip cost from recorded fills (fees + adverse slippage), null below 20 round trips */
  liveCost(): { rt: number; fills: number; fee: number; slip: number } | null {
    const rows = this.db.all<{
      side: number;
      kind: string;
      qty: number;
      ref_px: number;
      fill_px: number;
      /** NULL when the reply carried no commission (unmeasured) */
      fee: number | null;
      fee_known: number | null;
    }>(
      "SELECT side, kind, qty, ref_px, fill_px, fee, fee_known FROM live_fills WHERE ref_px > 0 AND fill_px > 0 ORDER BY at DESC LIMIT 400",
    );
    if (rows.length < 40) return null;
    // Legacy zero placeholders are not measured. Newly confirmed zero commission
    // carries its durable flag and belongs to the same actual-cost sample.
    const withFee = rows.filter(
      (r) =>
        r.fee !== null &&
        Number.isFinite(r.fee) &&
        (r.fee > 0 || (r.fee === 0 && r.fee_known === 1)),
    );
    if (withFee.length < 20) return null;
    let fee = 0;
    for (const r of withFee) {
      const notional = r.qty * r.fill_px;
      fee += notional > 0 ? Math.abs(r.fee ?? 0) / notional : 0;
    }
    fee /= withFee.length;
    let slip = 0;
    for (const r of rows) {
      // entries (O/I) pay when filled above the reference (long), exits (R/X) when filled below
      const into = r.kind === "O" || r.kind === "I";
      const dir = into ? r.side : -r.side;
      slip += Math.max(0, (dir * (r.fill_px - r.ref_px)) / r.ref_px);
    }
    slip /= rows.length;
    return {
      rt: roundTripCostFromFees({ taker: fee, slippage: slip }),
      fills: rows.length,
      fee,
      slip,
    };
  }

  /** One adjuster pass on the executed (Real) positions; a change triggers a recompute with the new ranges. */
  private runAdjust() {
    const a = this.settings.adjust;
    if (!a?.enabled) return;
    const lc = this.liveCost();
    // Paper returns already contain the modeled cost once; owned net returns already contain actual fees.
    const excess = 0;
    if (lc) this.db.kvSet("liveCost", { ...lc, model: this.settings.cost, at: Date.now() });
    if (
      a.autoCost &&
      lc &&
      lc.rt > this.settings.cost + 0.0002 &&
      this.settings.cost < MAX_MODEL_RT_COST
    ) {
      this.updateSettings({ cost: boundedModelCost(+lc.rt.toFixed(5)) });
      this.db.event(
        "warn",
        `auto-cost: measured live round trip ${(lc.rt * 100).toFixed(3)} % > model — engine cost raised`,
      );
    }
    const trades = this.db.all<{ cfg: string; unit_r: number | null; exit_t: number }>(
      "SELECT cfg, unit_r, exit_t FROM paper_trades ORDER BY exit_t DESC LIMIT 5000",
    );
    const { state, changed } = evaluateAdjust(
      this.adjustState(),
      adjustTrades(
        // NULL stays in the current chronological window; it must not select older known winners instead.
        trades.map((t) => ({ cfg: t.cfg, r: t.unit_r ?? NaN, exitT: t.exit_t })),
        this.adjustExchangeTrades(),
        a.window,
      ),
      a,
      { minSl: this.settings.grid.minSl, minTrail: this.settings.grid.minTrail },
      excess,
    );
    this.db.kvSet("adjust", state);
    if (changed.length) {
      this.db.event(
        "info",
        `auto-adjust: ${changed.length} set(s) changed — ${changed
          .slice(0, 4)
          .map((k) => `${k}: ${state[k].note}`)
          .join(" · ")}`,
      );
      this.dirty = true;
    }
  }

  /**
   * The auto-adjuster's exchange closes: a set the exchange has a full window of closes for is judged on them (their
   * fees and slippage are real: no cost excess on top); the paper book's only until then. Own closes only (relation.ts).
   */
  adjustExchangeTrades(): Array<{ cfg: string; r: number; exitT: number }> {
    return this.db
      .all<{ cfg: string; r: number; exit_t: number }>(
        `SELECT cfg, r, exit_t FROM live_lane_trades WHERE ${OWN_CLOSE_SQL} ORDER BY exit_t DESC LIMIT 5000`,
      )
      .map((t) => ({ cfg: t.cfg, r: t.r, exitT: t.exit_t }));
  }

  // ── presets ──────────────────────────────────────────────
  savedPresets(): Preset[] {
    return this.db.kvGet<Preset[]>("presets") ?? [];
  }

  /** Every active catalog writer invalidates only removed or economically changed preset results. */
  private storeSavedPresets(next: Preset[], removedIds: readonly string[] = []) {
    const byId = new Map(next.map((p) => [p.id, p]));
    const invalid = new Set(removedIds);
    for (const before of this.savedPresets()) {
      const after = byId.get(before.id);
      if (
        !after ||
        !isDeepStrictEqual(before.settings, after.settings) ||
        !isDeepStrictEqual(before.wf, after.wf)
      )
        invalid.add(before.id);
    }
    this.db.kvSet("presets", next);
    if (!invalid.size) return;
    const bt = this.presetBacktests();
    const series = { ...(this.db.kvGet<Record<string, PresetSeries>>("presetSeries") ?? {}) };
    for (const id of invalid) {
      this.cancelPresetBacktest(id, "backtest canceled: preset settings changed or preset removed");
      delete bt[id];
      delete series[id];
    }
    // A changed ID's queued request resolves its latest settings; removed IDs cannot dispatch again.
    this.backtestQueue = this.backtestQueue.filter((q) => !invalid.has(q.id) || byId.has(q.id));
    this.db.kvSet("presetBacktests", bt);
    this.db.kvSet("presetSeries", series);
  }

  private currentPreset(
    kind: "saved" | "auto",
    label: string,
    info: string,
    s = this.settings,
    wf = this.wf,
    sim = this.sim,
  ): Preset | null {
    if (!sim) return null;
    const settings = presetSettings(s);
    const wfp = pickWf(wf) as Record<string, unknown>;
    const key = presetKey(settings, wfp);
    const spanH = (sim.endT - sim.startT) / 3_600_000;
    const period = `${new Date(sim.startT).toISOString().slice(0, 16).replace("T", " ")} → ${new Date(sim.endT).toISOString().slice(0, 16).replace("T", " ")} UTC`;
    const outcomes = [...sim.trades, ...(sim.openAtEnd ?? [])];
    const primary = unitStatsOf(outcomes, sim.endT);
    return {
      id: kind === "auto" ? `auto-${key}` : `saved-${key}-${Date.now().toString(36)}`,
      label,
      info,
      kind,
      at: Date.now(),
      settings,
      wf: wfp,
      metrics: metricsFromStats(
        { ...primary, n: outcomes.length },
        spanH,
        period,
        `engine simulated run (${Math.round(spanH)}h, ${wf.preH}h pre-calc)`,
        {
          positiveRuns: sim.stable ? 1 : 0,
          runs: 1,
          sample: "with-endpoint-marks",
          endpointMarks: sim.openAtEnd?.length ?? 0,
        },
      ),
    };
  }

  /** Save the current settings with the latest simulated run's results. */
  savePreset(label: string, info = ""): Preset {
    const p = this.currentPreset(
      "saved",
      label.trim().slice(0, 80) || "Saved preset",
      info.slice(0, 400),
    );
    if (!p) throw new Error("no simulated run yet — wait for the first compute");
    this.storeSavedPresets(upsertPreset(this.savedPresets(), p));
    this.db.event(
      "info",
      `preset saved: ${p.label} (PF ${primaryPfLabel(p.metrics)}, ${p.metrics.n} trades)`,
    );
    return p;
  }

  private autoPreset(s: CoreSettings, wf: WalkForwardOptions, sim: WalkForwardResult) {
    if (!qualifies(sim.stats, sim.stable, s.gates.minPf, s.gates.minTrades)) return;
    const p = this.currentPreset(
      "auto",
      `Auto · PF ${primaryPfLabel(sim.stats)} · ${sim.stats.n} trades`,
      "saved automatically: the simulated run passed min PF, min trades and stability",
      s,
      wf,
      sim,
    );
    if (!p) return;
    const before = this.savedPresets();
    const after = upsertPreset(before, p);
    if (after !== before && JSON.stringify(after) !== JSON.stringify(before)) {
      this.storeSavedPresets(after);
      this.db.event("info", `auto preset: ${p.label}`);
    }
  }

  // ── preset backtests (last 1–12 days, real data, background) ─────────────────
  private lastConsoleAt = 0;
  private backfillKey = "";
  private historyBackfillKey = "";
  /** A short-listed/new-market history is attempted once per requested span, without starving later batches. */
  private historyBackfilled = new Set<string>();
  /** progressive prehistoric start: per-symbol state and batch bookkeeping */
  private prehistSyms = new Map<
    string,
    { state: "queued" | "loading" | "computing" | "ready" | "skipped"; bars?: number }
  >();
  private prehistTotal = 0;
  /** backfill batches loaded in this progressive start (the backfill line's batch #/#) */
  private prehistBatch = 0;
  private prehistPending = false;
  private prehistStartedAt = 0;
  private prehistReadyAt = 0;
  private prehistMore(_s: CoreSettings) {
    return this.prehistPending;
  }
  private staleUntil = new Map<string, number>();
  backtestJob: {
    id: string;
    label: string;
    days: number;
    state: "running" | "done" | "error";
    stage: string;
    progress: number;
    startedAt: number;
    error?: string;
  } | null = null;
  private backtestControls = new WeakMap<object, AbortController>();
  private backtestTask: {
    job: NonNullable<CoreRuntime["backtestJob"]>;
    revision: { settings: SettingsPatch; wf: Record<string, unknown> };
    controller: AbortController;
    promise: Promise<void>;
    timer: ReturnType<typeof setTimeout> | null;
  } | null = null;
  private btCandles = new Map<string, { at: number; candles: Map<string, CandleSeries> }>();
  /** presets waiting for a backtest ("backtest all"): run one after another */
  backtestQueue: Array<{ id: string; days: number }> = [];

  /** The cached diagrams of a preset's latest backtest (null = none yet). */
  presetSeries(id: string): PresetSeries | null {
    return this.db.kvGet<Record<string, PresetSeries>>("presetSeries")?.[id] ?? null;
  }

  private setPresetSeries(id: string, series: PresetSeries | null) {
    const all = { ...(this.db.kvGet<Record<string, PresetSeries>>("presetSeries") ?? {}) };
    if (series) all[id] = series;
    else delete all[id];
    this.db.kvSet("presetSeries", all);
  }

  /** Queue a backtest of every preset (research and saved) over `days`; returns how many were queued. */
  queuePresetBacktests(days: number, onlyMissing = false): number {
    if (this.disposed) throw new Error("runtime disposed");
    const d = Math.min(MAX_BACKTEST_DAYS, Math.max(1, Math.round(days)));
    const ids = [...ALL_RESEARCH_PRESETS, ...this.savedPresets()]
      .map((p) => p.id)
      .filter((id) => !onlyMissing || (this.presetSeries(id)?.days ?? 0) < d)
      .filter(
        (id) =>
          !this.backtestQueue.some((q) => q.id === id) &&
          !(this.backtestJob?.state === "running" && this.backtestJob.id === id),
      );
    this.backtestQueue.push(...ids.map((id) => ({ id, days: d })));
    this.nextQueuedBacktest();
    return ids.length;
  }

  private nextQueuedBacktest() {
    if (this.disposed || this.backtestTask || this.backtestJob?.state === "running") return;
    while (this.backtestQueue.length) {
      const q = this.backtestQueue.shift()!;
      if (!this.findPreset(q.id)) continue;
      this.startPresetBacktest(q.id, q.days);
      return;
    }
  }

  presetBacktests(): Record<string, PresetBacktest[]> {
    return this.db.kvGet<Record<string, PresetBacktest[]>>("presetBacktests") ?? {};
  }

  /**
   * Start a backtest of a preset over the last `days` (1–MAX_BACKTEST_DAYS). One at a time; the result and its
   * diagrams (presetSeries) are kept per preset; a queued next one starts when it ends.
   */
  startPresetBacktest(id: string, days: number): void {
    if (this.disposed) throw new Error("runtime disposed");
    if (this.backtestTask || this.backtestJob?.state === "running")
      throw new Error(
        `a backtest is running (${this.backtestJob?.label}, ${this.backtestJob?.days}d)`,
      );
    const p = this.findPreset(id);
    if (!p) throw new Error("unknown preset");
    const d = Math.min(MAX_BACKTEST_DAYS, Math.max(1, Math.round(days)));
    this.backtestJob = {
      id,
      label: p.label,
      days: d,
      state: "running",
      stage: "market data",
      progress: 0,
      startedAt: Date.now(),
    };
    const job = this.backtestJob;
    const controller = new AbortController();
    this.backtestControls ??= new WeakMap();
    this.backtestControls.set(job, controller);
    const task = {
      job,
      controller,
      revision: structuredClone({ settings: p.settings, wf: p.wf }),
      promise: Promise.resolve(),
      timer: null as ReturnType<typeof setTimeout> | null,
    };
    this.backtestTask = task;
    task.timer = setTimeout(() => {
      if (this.backtestTask === task)
        this.cancelBacktest("backtest exceeded its 15 min limit — aborted");
    }, BACKTEST_LIMIT_MS);
    task.timer.unref?.();
    task.promise = this.runPresetBacktest(p, d, job)
      .catch((err) => {
        // only this job — a later job is never touched by an older one's failure
        if (job.state === "running") {
          job.state = "error";
          job.error = err instanceof Error ? err.message : String(err);
        }
        if (!controller.signal.aborted && !this.disposed)
          this.db.event(
            "error",
            `backtest ${p.label}: ${err instanceof Error ? err.message : err}`,
          );
      })
      .finally(() => {
        if (task.timer) clearTimeout(task.timer);
        if (this.backtestTask !== task) return;
        this.backtestTask = null;
        this.nextQueuedBacktest();
      });
  }

  /** Cancellation is scoped to this runtime; another connection's worker calls and shared reads keep running. */
  private cancelBacktest(reason: string) {
    const job = this.backtestTask?.job ?? this.backtestJob;
    if (job?.state === "running") {
      job.state = "error";
      job.error = reason;
    }
    this.backtestTask?.controller.abort(new Error(reason));
  }

  private cancelBacktests(reason: string) {
    this.backtestQueue.length = 0;
    this.cancelBacktest(reason);
  }

  private cancelPresetBacktest(id: string, reason: string) {
    if ((this.backtestTask?.job ?? this.backtestJob)?.id === id) this.cancelBacktest(reason);
  }

  /** Settles only this runtime's canceled task; call after stop/dispose before releasing shared workers. */
  async backtestsSettled(): Promise<void> {
    await this.backtestTask?.promise;
  }

  private checkBacktest(job: CoreRuntime["backtestJob"]) {
    if (this.disposed) throw new Error("backtest canceled: runtime disposed");
    if (!job) return;
    const controller = this.backtestControls?.get(job);
    controller?.signal.throwIfAborted();
    if (controller && this.backtestTask?.job !== job)
      throw new Error("backtest canceled: superseded task");
    if (job.state && job.state !== "running") throw new Error(job.error ?? "backtest canceled");
    if (Number.isFinite(job.startedAt) && Date.now() - job.startedAt > BACKTEST_LIMIT_MS) {
      const err = new Error("backtest exceeded its 15 min limit — aborted");
      controller?.abort(err);
      throw err;
    }
  }

  /** A catalog upsert/eviction can replace a preset without using updatePreset/deletePreset. */
  private checkBacktestRevision(job: NonNullable<CoreRuntime["backtestJob"]>) {
    this.checkBacktest(job);
    const task = this.backtestTask;
    // Direct private phase fixtures have no public task registration or catalog ownership.
    if (task?.job !== job) return;
    const current = this.findPreset(job.id);
    if (
      !current ||
      !isDeepStrictEqual(current.settings, task.revision.settings) ||
      !isDeepStrictEqual(current.wf, task.revision.wf)
    ) {
      this.cancelBacktest("backtest canceled: preset settings changed or preset removed");
      this.checkBacktest(job);
    }
  }

  /** Abandon the owner continuation promptly without canceling a transport shared by other runtimes. */
  private async backtestAwait<T>(
    job: NonNullable<CoreRuntime["backtestJob"]>,
    promise: Promise<T>,
  ): Promise<T> {
    this.checkBacktest(job);
    const signal = this.backtestControls?.get(job)?.signal;
    let cancel: (() => void) | undefined;
    try {
      const value = signal
        ? await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
              cancel = () => reject(signal.reason);
              signal.addEventListener("abort", cancel, { once: true });
              if (signal.aborted) cancel();
            }),
          ])
        : await promise;
      this.checkBacktest(job);
      return value;
    } finally {
      if (cancel) signal?.removeEventListener("abort", cancel);
    }
  }

  /** Run a backtest phase on worker threads (all cores); false = not available / failed → caller runs in-process. */
  private async onWorkers(
    job: NonNullable<CoreRuntime["backtestJob"]>,
    stage: string,
    fn: (n: number, signal?: AbortSignal) => Promise<void>,
  ): Promise<boolean> {
    this.checkBacktest(job);
    this.workersRetry();
    if (!workersAvailable() || this.workersBroken) return false;
    const n = poolSize();
    job.stage = `${stage} · ${n} cores`;
    try {
      await fn(n, this.backtestControls?.get(job)?.signal);
      this.checkBacktest(job);
      return true;
    } catch (err) {
      this.checkBacktest(job);
      this.workersFailed(err, "backtest", true);
      job.stage = stage;
      return false;
    }
  }
  private workersBroken = false;
  private workersBrokenAt = 0;
  /**
   * A worker run failed. Stopped by the memory guard: the compute aborts (rethrown; the cycle steps the fallback
   * and retries lighter) — computing it in-process instead held the event loop and never released the memory. The
   * pool is shared, so another runtime's guard stops this runtime's calls too, under the same pressure: the compute
   * aborts as on its own guard (that abort disabled its workers for 10 min and its compute went on in-process).
   * A Base worker timeout aborts the compute, keeping the published cohort and live controls responsive.
   * Other failures: this phase computes in-process, and the workers are tried again after WORKERS_RETRY_MS (one
   * failure disabled them for the life of the process). A backtest's failure moves only that phase in-process (it
   * disabled the engine's workers for 10 min too).
   */
  private workersFailed(err: unknown, what: string, backtest = false) {
    if (this.memPressured) throw err;
    if (isWorkersAbort(err)) {
      if (!backtest) {
        this.memPressured = true;
        this.memLastAbort = err instanceof Error ? err.message : String(err);
      }
      throw err;
    }
    // A timed-out Base job may already have held a worker for a long time. Re-running the same full work on the
    // live event loop can freeze controls; keep the last published cohort and retry on workers in a later cycle.
    if (!backtest && what === "Base" && isWorkerTimeout(err)) {
      this.db.event("warn", "Base worker timed out — compute aborted; the prior published state is retained");
      throw err;
    }
    if (!backtest) {
      this.workersBroken = true;
      this.workersBrokenAt = Date.now();
    }
    this.db.event(
      "warn",
      `${what} workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`,
    );
  }
  /** Workers that failed are tried again after WORKERS_RETRY_MS. */
  private workersRetry() {
    if (this.workersBroken && Date.now() - this.workersBrokenAt > WORKERS_RETRY_MS)
      this.workersBroken = false;
  }
  private floorsWaivedNoted = false;
  /** when this desk's live record starts (kept across restarts): the live validation counts closes from here */
  private exRecMemo: { key: string; recs: Map<string, LiveRecord> } | null = null;
  /**
   * Each config's own closes as the exchange executed them since `since` (live_lane_trades, own closes only:
   * relation.ts), memoized until a new one.
   */
  exchangeRecords(since: number): Map<string, LiveRecord> {
    return drain(this.exchangeRecordsGen(since));
  }
  /** exchangeRecords in slices (a yield per page of rows); it settles the same memo */
  private *exchangeRecordsGen(since: number): Generator<void, Map<string, LiveRecord>> {
    // live.sideGates: one record per config and side (recordKeyOf), memoized apart from the pooled one
    const bySide = this.settings.live.sideGates === true;
    // memoized on the record's write version (no COUNT over the table to learn that nothing changed)
    const key = `${since}|${this.db.version("live_lane_trades")}${bySide ? "|sides" : ""}`;
    if (this.exRecMemo?.key === key) return this.exRecMemo.recs;
    const rows = yield* this.exchangeRowsGen(since);
    const recs = yield* liveRecordsGen(rows, bySide ? { bySide } : undefined);
    // (rows read across a yield that a write changed meanwhile are not memoized under the older key)
    if (this.db.version("live_lane_trades") === Number(key.split("|")[1])) this.exRecMemo = { key, recs };
    return recs;
  }
  /**
   * The exchange record's closes since `since` (live_lane_trades) — the one read behind exchangeRecords and the signal
   * proof, so both judge the same closes. Not memoized: each caller memoizes what it builds from it. Read in pages
   * of the exit-time index (no cursor stays open across a yield); the same rows in the same order as one scan.
   */
  private exchangeRows(since: number): Array<{ id: string; cfg: string; sym: string; side: number; exitT: number; r: number }> {
    return drain(this.exchangeRowsGen(since));
  }
  private *exchangeRowsGen(
    since: number,
  ): Generator<void, Array<{ id: string; cfg: string; sym: string; side: number; exitT: number; r: number }>> {
    const out: Array<{ id: string; cfg: string; sym: string; side: number; exitT: number; r: number }> = [];
    let at = since;
    let after: string | null = null;
    for (;;) {
      const rows: Array<{ id: string; cfg: string; sym: string | null; side: number | null; exit_t: number; r: number }> =
        after === null
          ? this.db.all(
              `SELECT id, cfg, sym, side, exit_t, r FROM live_lane_trades WHERE exit_t >= ? AND ${OWN_CLOSE_SQL} ORDER BY exit_t, id LIMIT ${PROOF_PAGE}`,
              at,
            )
          : this.db.all(
              `SELECT id, cfg, sym, side, exit_t, r FROM live_lane_trades WHERE (exit_t > ? OR (exit_t = ? AND id > ?)) AND ${OWN_CLOSE_SQL} ORDER BY exit_t, id LIMIT ${PROOF_PAGE}`,
              at,
              at,
              after,
            );
      for (const x of rows) out.push({ id: x.id, cfg: x.cfg, sym: x.sym ?? "", side: x.side ?? 0, exitT: x.exit_t, r: x.r });
      if (rows.length < PROOF_PAGE) return out;
      const last = rows[rows.length - 1];
      at = last.exit_t;
      after = last.id;
      yield;
    }
  }
  /**
   * The listings of the last paper step, built once per step so a page never scans the tapes: the engine configs it
   * validated (its seats, best score first) with their validation-window PF and an index of rows per range (each range's
   * PF taken together), the signal units active (pair × symbol × side) and the engine configs proven live. Read a page at
   * a time through coreListing.
   */
  listings: SetListings | null = null;
  private buildListings() {
    const at = this.lastSelectionAt;
    const index = this.tapeIndex();
    const probed = !!(this.wf.probe?.perRange || this.wf.probe?.perCell);
    const picks = (this.lastSelection?.picks ?? []).filter((p) => {
      const tp = index.get(p.id);
      return (
        tp &&
        !tp.heldOnly &&
        baseAllowsTape(tp, this.wf) &&
        (!probed || configEval(tp, at, this.wf).ok)
      );
    });
    const candidates = this.tapes
      .filter(
        (tp) =>
          !isSignalInd(tp.ind) &&
          !tp.heldOnly &&
          baseAllowsTape(tp, this.wf) &&
          kindExecutable(tp.kind, this.wf.toggles) &&
          (!this.wf.bots?.length || this.wf.bots.includes(tp.bot)),
      )
      .map((tp) => ({ id: tp.id, group: liveGroupOf(tp.id), kind: kindOfId(tp.id) }));
    const validated: SetListings["validated"] = [];
    const byRange: SetListings["byRange"] = {};
    const byGroup: SetListings["byGroup"] = {};
    const byKind: SetListings["byKind"] = {};
    for (const p of picks) {
      // (the selection's window carries its gross profit / loss as well)
      const w = p.window as {
        n: number;
        net: number;
        pf: number;
        ddt: number;
        gp?: number;
        gl?: number;
      };
      const group = liveGroupOf(p.id);
      const range = kindOfId(p.id) === "exit" ? "" : RANGE_LABEL[rangeOfId(p.id)];
      const row = validated.length;
      validated.push({
        id: p.id,
        range,
        group,
        kind: kindOfId(p.id),
        score: p.score,
        pf: w.pf,
        n: w.n,
        net: w.net,
        ddt: w.ddt,
        gp: w.gp ?? 0,
        gl: w.gl ?? 0,
      });
      const g = (byGroup[group] ??= { rows: [], gp: 0, gl: 0, pf: null, calculated: 0 });
      g.rows.push(row);
      g.gp += w.gp ?? 0;
      g.gl += w.gl ?? 0;
      const k = (byKind[kindOfId(p.id)] ??= { rows: [], gp: 0, gl: 0, pf: null, calculated: 0 });
      k.rows.push(row);
      k.gp += w.gp ?? 0;
      k.gl += w.gl ?? 0;
      if (range) {
        const r = (byRange[range] ??= { rows: [], gp: 0, gl: 0, pf: null, calculated: 0 });
        r.rows.push(row);
        r.gp += w.gp ?? 0;
        r.gl += w.gl ?? 0;
      }
    }
    for (const c of candidates) {
      const g = (byGroup[c.group] ??= { rows: [], gp: 0, gl: 0, pf: null, calculated: 0 });
      g.calculated++;
      (byKind[c.kind] ??= { rows: [], gp: 0, gl: 0, pf: null, calculated: 0 }).calculated++;
      const range = kindOfId(c.id) === "exit" ? "" : RANGE_LABEL[rangeOfId(c.id)];
      if (range)
        (byRange[range] ??= { rows: [], gp: 0, gl: 0, pf: null, calculated: 0 }).calculated++;
    }
    for (const r of Object.values(byRange)) r.pf = r.gl > 1e-12 ? r.gp / r.gl : null;
    for (const r of Object.values(byGroup)) r.pf = r.gl > 1e-12 ? r.gp / r.gl : null;
    for (const r of Object.values(byKind)) r.pf = r.gl > 1e-12 ? r.gp / r.gl : null;
    const active: SetListings["active"] = [];
    for (const k of this.wf.signalActive ?? []) {
      const [bot, ind, sym, side, kind, config] = k.split("|");
      const cfg = config?.startsWith("cfg=") ? decodeURIComponent(config.slice(4)) : undefined;
      active.push({
        bot,
        ind,
        sym,
        side: side === "-1" ? -1 : 1,
        ...(kind ? { kind } : {}),
        ...(cfg ? { cfg } : {}),
      });
    }
    active.sort(
      (a, b) =>
        (a.bot + a.ind + a.sym).localeCompare(b.bot + b.ind + b.sym) ||
        b.side - a.side ||
        (a.kind ?? "").localeCompare(b.kind ?? "") ||
        (a.cfg ?? "").localeCompare(b.cfg ?? ""),
    );
    const proof = this.engineProof();
    // live.sideGates: each proven key is a config and its side (recordKeyOf); the listing and its count say so
    const provenBySide = proof !== null && this.settings.live.sideGates === true;
    this.listings = {
      paperStep: this.status.paperSteps ?? 0,
      at: Date.now(),
      validated,
      candidates,
      validation: {
        at,
        engineLastN: this.wf.validLastN ?? 0,
        signalLastN: this.wf.rangeOpts?.sig?.validLastN ?? this.wf.signalValidLastN ?? 0,
        entryLastN: this.wf.lastN,
        rangeLastN: this.wf.rangeGate?.lastN ?? 0,
        historyH: this.wf.longH,
      },
      byRange,
      byGroup,
      byKind,
      active,
      proven: proof ? [...proof.proven].sort() : null,
      ...(provenBySide ? { provenBySide: true as const } : {}),
    };
    this.status.listings = {
      paperStep: this.listings.paperStep,
      at: this.listings.at,
      validated: validated.length,
      active: active.length,
      proven: this.listings.proven ? this.listings.proven.length : null,
      byRange: Object.entries(byRange).map(([range, r]) => ({ range, validated: r.rows.length, pf: r.pf })),
      byGroup: Object.entries(byGroup).map(([group, r]) => ({ group, validated: r.rows.length, pf: r.pf })),
      byKind: Object.entries(byKind).map(([kind, r]) => ({
        kind,
        validated: r.rows.length,
        calculated: r.calculated,
        validationCloses: r.rows.reduce((n, i) => n + validated[i].n, 0),
        gp: r.gp,
        gl: r.gl,
        pf: r.pf,
        noLoss: r.gp > 0 && r.gl <= 1e-12,
      })),
      ...(provenBySide ? { provenBySide: true as const } : {}),
    };
  }
  private proofMemo: {
    key: string;
    out: {
      proven: Set<string>;
      judged: number;
      n: number;
      minPf: number;
      unknown: number;
      unknownConfigs: number;
    };
  } | null = null;
  private promotionModelMemo: {
    sim: WalkForwardResult;
    trades: Trade[];
    n: number;
    records: Map<string, LiveRecord>;
    byConfig: Map<string, LiveRecord>;
    /** live.sideGates: the same record per config and side (modeledGateRecords), built on first use */
    byConfigSide?: Map<string, LiveRecord>;
  } | null = null;
  private promotionSelectedMemo: { selected: string[]; ids: Set<string> } | null = null;
  private promotionReferenceMemo: {
    lanes: NonNullable<CoreSettings["live"]["promotedLanes"]>;
    byKey: Map<string, NonNullable<CoreSettings["live"]["promotedLanes"]>[number]>;
    records: Map<string, LiveRecord>;
  } | null = null;
  private modeledExecutionRecords() {
    const sim = this.sim;
    if (!sim) return null;
    let model = this.promotionModelMemo;
    if (
      !model ||
      model.sim !== sim ||
      model.trades !== sim.trades ||
      model.n !== sim.trades.length ||
      !model.byConfig
    ) {
      model = {
        sim,
        trades: sim.trades,
        n: sim.trades.length,
        records: postBaseExecutionRecords(sim.trades),
        byConfig: liveRecords(
          sim.trades.map((t) => ({ cfg: t.cfg, exitT: t.exitT, r: unitReturn(t) })),
        ),
      };
      this.promotionModelMemo = model;
    }
    return model;
  }
  /**
   * The paper live validation's record: the settled post-Base modeled execution per config (modeledExecutionRecords),
   * or with live.sideGates per config and side (recordKeyOf), built once per simulated run. null without a run.
   */
  private modeledGateRecords(bySide: boolean): Map<string, LiveRecord> | null {
    const model = this.modeledExecutionRecords();
    if (!model) return null;
    if (!bySide) return model.byConfig;
    if (!model.byConfigSide)
      model.byConfigSide = liveRecords(
        model.trades.map((t) => ({ cfg: t.cfg, exitT: t.exitT, r: unitReturn(t), side: t.side })),
        { bySide: true },
      );
    return model.byConfigSide;
  }
  /** Settled post-Base model outcomes and funded OWNED PAPER executions are distinct evidence, never venue fills. */
  livePromotionGate(lane: { cfg: string; sym: string; side: number }, now = Date.now()): LiveGate {
    const n = Math.max(
      1,
      this.settings.gates.minTrades ?? 0,
      this.settings.live.liveLastN ?? 25,
      this.settings.live.engineProofN ?? 0,
    );
    const ind = lane.cfg.split("|")[1] ?? "";
    const minPf = Math.max(
      liveMinPfOf(this.settings, rangeOfId(lane.cfg), ind, kindOfId(lane.cfg)),
      (this.settings.live.engineProofN ?? 0) > 0 && !isSignalInd(ind)
        ? (this.settings.live.engineProofPf ?? ENGINE_PROOF_PF)
        : 0,
    );
    const sim = this.sim;
    const model = this.modeledExecutionRecords();
    const owned = ownedPromotionRecord(this.db, lane, n, now);
    const key = executionRecordKey(lane.cfg, lane.sym, lane.side);
    const lanes = this.settings.live.promotedLanes;
    if (lanes && this.promotionReferenceMemo?.lanes !== lanes) {
      const records = liveRecords(
        lanes
          .filter((p) => validPromotedLaneProof(p, now))
          .flatMap((p) =>
            p.executionCloses.map((c) => ({ cfg: promoteLaneKey(p), exitT: c.exitT, r: c.unitR })),
          ),
      );
      this.promotionReferenceMemo = {
        lanes,
        byKey: new Map(lanes.map((p) => [promoteLaneKey(p), p])),
        records,
      };
    }
    const ref =
      !isSignalInd(ind) && lanes ? this.promotionReferenceMemo?.byKey.get(key) : undefined;
    const reference = validPromotedLaneProof(ref, now) ? ref : undefined;
    const referenceRecord = reference ? this.promotionReferenceMemo?.records.get(key) : undefined;
    const referenceGate = referenceRecord
      ? liveGate(referenceRecord, reference!.fromT, now, n, minPf)
      : undefined;
    const b = referenceRecord ? lowerBound(referenceRecord.exitT, now + 1) : 0;
    const a = Math.max(0, b - n);
    const referenceGp = referenceRecord ? referenceRecord.gp[b] - referenceRecord.gp[a] : 0;
    const referenceGl = referenceRecord ? referenceRecord.gl[b] - referenceRecord.gl[a] : 0;
    const noLoss = referenceGp > 0 && referenceGl === 0;
    const gate = promotionGate(
      sim ? model?.records.get(key) : undefined,
      owned,
      0,
      now,
      n,
      minPf,
      reference && referenceGate
        ? {
            source: reference.executionSource,
            n: referenceGate.n,
            pf: referenceGate.pf,
            unknown: referenceGate.unknown ?? 0,
            fromT: b > a ? referenceRecord!.exitT[a] : null,
            toT: b > a ? referenceRecord!.exitT[b - 1] : null,
            noLoss,
            pfConvention: noLoss ? "no-loss-score" : "ratio",
            validUntilT: reference.validUntilT,
          }
        : undefined,
    );
    const tp = this.tapeIndex().get(lane.cfg);
    const selected = this.paper.selected;
    if (selected && this.promotionSelectedMemo?.selected !== selected)
      this.promotionSelectedMemo = { selected, ids: new Set(selected) };
    const eligible =
      selected &&
      this.promotionSelectedMemo?.ids.has(lane.cfg) &&
      tp &&
      !tp.heldOnly &&
      (isSignalInd(ind) ||
        (baseAllowsTape(tp, this.wf) &&
          (!this.wf.basePassed || configEval(tp, now, this.wf).ok) &&
          configDirectionEval(tp, now, this.wf, lane.side).ok &&
          engineContextValid(tp, now, this.wf, lane.sym, lane.side))) &&
      (!isSignalInd(ind) ||
        (signalValidationOk(tp, now, this.wf, lane.sym, lane.side) &&
          (!this.wf.signalBasePassed || this.wf.signalBasePassed.has(`${tp.bot}|${tp.ind}`)) &&
          (!this.wf.signalActive ||
            signalActiveHas(
              this.wf.signalActive,
              tp.bot,
              tp.ind,
              lane.sym,
              lane.side,
              tp.kind,
              tp.id,
            ))));
    return eligible ? gate : { ...gate, ok: false, state: "ineligible" };
  }
  /**
   * Pooled per-config OWNED PAPER diagnostic (null when off). Strict native admission uses livePromotionGate's
   * exact symbol/direction windows instead: siblings cannot qualify or veto each other. Nominal venue-attribution
   * rows have no allocation proof and never replace these measured paper closes: the exchange's own record (own
   * closes, relation.ts) decides only a config whose paper record carries no unknown return, once it holds N closes.
   */
  engineProof(now = Date.now()): {
    proven: Set<string>;
    judged: number;
    n: number;
    minPf: number;
    unknown: number;
    unknownConfigs: number;
  } | null {
    return drain(this.engineProofGen(now));
  }
  /** the engine proof's memo key (null: the proof is off) */
  private engineProofKey(): string | null {
    const n = this.settings.live.engineProofN ?? 0;
    if (!(n > 0)) {
      this.status.engineProof = undefined;
      return null;
    }
    const minPf = this.settings.live.engineProofPf ?? ENGINE_PROOF_PF;
    // live.sideGates: the proof is per config and side (the records keyed by recordKeyOf)
    const sides = this.settings.live.sideGates === true ? "|sides" : "";
    // memoized on the two records' write versions: an unchanged book costs no query at all (every live control step
    // asks), a change re-reads the real closes from the partial index paper_book_trades_closed
    // Basis version invalidates a weighted proof retained by an older runtime across hot reload.
    return `unit-net-returns|${n}|${minPf}|${this.db.version("paper_book_trades")}|${this.db.version("live_lane_trades")}${sides}`;
  }
  /**
   * engineProof in slices: a page of rows per slice (the 50 k closes of a desk's book took 0.2–0.5 s in one piece
   * on every close that landed). A write that lands between two slices leaves the result unmemoized (warmProofs reads
   * again); read in one go (engineProof) nothing can land.
   */
  private *engineProofGen(now = Date.now()): Generator<
    void,
    {
      proven: Set<string>;
      judged: number;
      n: number;
      minPf: number;
      unknown: number;
      unknownConfigs: number;
    } | null
  > {
    const key = this.engineProofKey();
    if (key === null) return null;
    const n = this.settings.live.engineProofN ?? 0;
    const minPf = this.settings.live.engineProofPf ?? ENGINE_PROOF_PF;
    const bySide = this.settings.live.sideGates === true;
    const showProof = (out: { judged: number; proven: Set<string>; unknown: number; unknownConfigs: number }) => {
      this.status.engineProof = {
        n,
        minPf,
        judged: out.judged,
        proven: out.proven.size,
        unknown: out.unknown,
        unknownConfigs: out.unknownConfigs,
        pfBasis: "unit-net-returns",
      };
    };
    if (this.proofMemo?.key === key) {
      showProof(this.proofMemo.out);
      return this.proofMemo.out;
    }
    // Legacy unit recovery requires an explicit positive external multiplier. Volume can contain intrinsic
    // ladder weight and cannot establish that multiplier; retain unknown closes in their own chronological tail.
    const rows = yield* this.paperCloseRows(
      `cfg, ${bySide ? "side, " : ""}exit_t, ${PAPER_PROOF_UNIT_SQL}`,
      "",
      (x: {
        cfg: string;
        side?: number | null;
        exit_t: number | null;
        proof_r: number | null;
      }) =>
        x.exit_t === null
          ? null
          : {
              cfg: x.cfg,
              exitT: x.exit_t,
              // Keep NULLs in time order: skipping a new unknown could incorrectly prove the config on older known wins.
              r: x.proof_r,
              side: x.side,
            },
    );
    yield;
    // (live.sideGates: one record per config and side, recordKeyOf)
    const paper = yield* liveRecordsGen(rows, bySide ? { bySide } : undefined);
    yield;
    // The exchange's own record (own closes only, relation.ts) decides a config once it holds N closes — but
    // live_lane_trades is nominal attribution without allocated quantities, so it never replaces unknown owned-paper
    // evidence: a config whose paper record carries an unknown return is judged on the paper record alone.
    const ex = new Map<string, LiveRecord>();
    for (const [k, rec] of yield* this.exchangeRecordsGen(0)) {
      const pp = paper.get(k);
      if (!pp?.unknown?.[pp.exitT.length]) ex.set(k, rec);
    }
    yield;
    const out = { ...engineProven(paper, ex, now, n, minPf), n, minPf };
    showProof(out);
    if (this.engineProofKey() !== key) return out; // a write landed meanwhile: not memoized under the older key
    const prev = this.proofMemo?.out;
    if (!prev || prev.proven.size !== out.proven.size || prev.judged !== out.judged)
      this.db.event(
        "info",
        `engine proof: ${out.proven.size} engine config(s) proven of ${out.judged} with ${n}+ own closes (last ${n} unit return PF ≥ ${minPf}); ${out.unknownConfigs} blocked by ${out.unknown} unknown paper return(s); every other engine config trades on paper only`,
      );
    this.proofMemo = { key, out };
    return out;
  }
  /**
   * The paper book's real closes in pages that end on a whole config, so no cursor is open across a yield (VACUUM
   * INTO of the snapshot refuses one). The same rows in the same order as one scan of the partial index
   * paper_book_trades_unit (cfg, exit_t, r, mult, vol, then the primary key), which the proofs' ties follow.
   */
  private *paperCloseRows<Row, T>(cols: string, extra: string, map: (x: Row) => T | null): Generator<void, T[]> {
    const out: T[] = [];
    let after: string | null = null;
    let limit = PROOF_PAGE;
    for (;;) {
      const t = "paper_book_trades";
      const rows: Array<Row & { cfg: string }> = this.db.all(
        `SELECT ${cols} FROM ${t} WHERE ${t}.reason != 'dropped' AND ${t}.r IS NOT NULL${extra}${after === null ? "" : ` AND ${t}.cfg >= ?`} ` +
          `ORDER BY ${t}.cfg, ${t}.exit_t, ${t}.r, ${t}.mult, ${t}.vol, ${t}.sym, ${t}.side, ${t}.entry_t LIMIT ${limit}`,
        ...(after === null ? [] : [after]),
      );
      const full = rows.length >= limit;
      const lastCfg = rows.length ? rows[rows.length - 1].cfg : "";
      // a full page ends inside its last config: that config's rows come again on the next page
      const keep = full ? rows.filter((x) => x.cfg !== lastCfg) : rows;
      if (full && !keep.length) {
        limit *= 2; // one config holds the whole page
        continue;
      }
      for (const x of keep) {
        const m = map(x);
        if (m !== null) out.push(m);
      }
      if (!full) return out;
      after = lastCfg;
      limit = PROOF_PAGE;
      yield;
    }
  }
  private sigProofMemo: {
    key: string;
    out: SignalProofResult;
  } | null = null;
  /**
   * The signal proof (live.signalProofN, null when off): the signal units (indicator × side) whose own forward closes
   * prove them — the exchange record of the unit's lanes once it holds N, else the paper book's closes
   * (paper_book_trades, "dropped" marks left out) — whose last N hold PF ≥ signalProofPf over at least
   * signalProofEvents distinct events. Rebuilt when a close lands on either record or the setting changes.
   */
  signalProof(
    now = Date.now(),
  ): SignalProofResult | null {
    return drain(this.signalProofGen(now));
  }
  private signalProofKey(): string | null {
    const n = this.settings.live.signalProofN ?? 0;
    if (!(n > 0)) return null;
    const minPf = this.settings.live.signalProofPf ?? SIGNAL_PROOF_PF;
    const minEvents = this.settings.live.signalProofEvents ?? SIGNAL_PROOF_EVENTS;
    // memoized on the two records' write versions, as the engine proof: an unchanged book costs no query. live.sideGates
    // reads a side that is not +1 or -1 as no side (signalUnitOf), so its proof is memoized apart from the pooled one
    const bySide = this.settings.live.sideGates === true;
    return `${n}|${minPf}|${minEvents}|${this.db.version("paper_book_trades")}|${this.db.version("live_lane_trades")}${bySide ? "|sides" : ""}|owned-unit-v2`;
  }
  /** signalProof in slices (see engineProofGen) */
  private *signalProofGen(
    now = Date.now(),
  ): Generator<void, SignalProofResult | null> {
    const key = this.signalProofKey();
    if (key === null) return null;
    if (this.sigProofMemo?.key === key) return this.sigProofMemo.out;
    const n = this.settings.live.signalProofN ?? 0;
    const minPf = this.settings.live.signalProofPf ?? SIGNAL_PROOF_PF;
    const minEvents = this.settings.live.signalProofEvents ?? SIGNAL_PROOF_EVENTS;
    const bySide = this.settings.live.sideGates === true;
    // the paper book's signal closes, read from the partial covering index (its entries carry the primary key: symbol,
    // side and entry time); signal ids carry "|sig-" — signalUnitOf keeps exactly the signal configs
    const paper = yield* this.paperCloseRows(
      `cfg, sym, side, entry_t, exit_t, ${PAPER_PROOF_UNIT_SQL}`,
      " AND cfg LIKE '%|sig-%'",
      (x: { cfg: string; sym: string; side: number; entry_t: number; exit_t: number | null; proof_r: number | null }) =>
        x.exit_t === null ? null : { id: String(x.entry_t), cfg: x.cfg, sym: x.sym, side: x.side, exitT: x.exit_t, r: x.proof_r ?? NaN },
    );
    yield;
    const exchange = yield* this.exchangeRowsGen(0);
    yield;
    // Nominal lane attribution cannot replace an unknown owned-paper close in the same signal unit.
    const unknownUnits = new Set(paper.filter((x) => !Number.isFinite(x.r)).map((x) => signalUnitOf(x.cfg, x.side, bySide)));
    const verifiedExchange = exchange.filter((x) => !unknownUnits.has(signalUnitOf(x.cfg, x.side, bySide)));
    const out = {
      ...signalProven(paper, verifiedExchange, now, { n, minPf, minEvents, bySide }),
      n,
      minPf,
      minEvents,
    };
    if (this.signalProofKey() !== key) return out;
    const prev = this.sigProofMemo?.out;
    if (!prev || prev.proven.size !== out.proven.size || prev.judged !== out.judged)
      this.db.event(
        "info",
        `signal proof: ${out.proven.size} signal unit(s) proven of ${out.judged} with ${n}+ own closes (last ${n} PF ≥ ${minPf} over ≥ ${minEvents} events); every other signal unit trades on paper only`,
      );
    this.sigProofMemo = { key, out };
    return out;
  }
  /**
   * Brings the engine and signal proofs up to date in slices of at most ~SLICE_MS, so the live step reads them from
   * their memos (a close landing used to rebuild both in one synchronous piece inside the step: 0.3–1.2 s at 50–150 k
   * paper closes). The step waits for the current proofs — admission never reads older ones. A write that lands
   * while a rebuild yields restarts it (three times at most; after that the synchronous readers rebuild).
   */
  async warmProofs(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const eKey = this.engineProofKey();
      const sKey = this.signalProofKey();
      if ((eKey === null || this.proofMemo?.key === eKey) && (sKey === null || this.sigProofMemo?.key === sKey)) return;
      for (const g of [this.engineProofGen(), this.signalProofGen()]) {
        let t = performance.now();
        for (;;) {
          if (g.next().done) break;
          // (a step is a page of rows or one build: about 5–40 ms, so the loop is given back after each)
          if (performance.now() - t > 3) {
            await yieldNow();
            t = performance.now();
          }
        }
      }
    }
  }
  private exAcceptMemo: { key: string; idx: ExchangeAccept } | null = null;
  /**
   * The own exchange closes (relation.ts) as acceptance groups, rebuilt when a new close is on record (checked at most
   * once a second).
   */
  exchangeAccept(): ExchangeAccept {
    const now = Date.now();
    if (this.exAcceptMemo && now - this.exAcceptAt < 1_000) return this.exAcceptMemo.idx;
    this.exAcceptAt = now;
    const key = String(this.db.version("live_lane_trades"));
    if (this.exAcceptMemo?.key === key) return this.exAcceptMemo.idx;
    const rows = this.db.all<{ cfg: string; sym: string; side: number; exit_t: number; entry_t: number | null; r: number }>(
      `SELECT cfg, sym, side, exit_t, entry_t, r FROM live_lane_trades WHERE ${OWN_CLOSE_SQL}`,
    );
    const idx = exchangeAcceptIndex(
      rows.map((x) => ({
        cfg: x.cfg,
        sym: x.sym,
        side: x.side,
        exitT: x.exit_t,
        r: x.r,
        entryT: x.entry_t ?? undefined,
      })),
    );
    this.exAcceptMemo = { key, idx };
    return idx;
  }
  private exAcceptAt = 0;
  liveSince(): number {
    let t = this.db.kvGet<number>("liveSince");
    if (!(typeof t === "number" && t > 0)) {
      t = Date.now();
      this.db.kvSet("liveSince", t);
    }
    return t;
  }
  /** the parts of the last Paper step (ms) and its candidate count */
  private paperTimings: {
    select: number;
    cands: number;
    exec: number;
    n: number;
    /** tape positions of selected configs left to their tape: entered before the current step (freshEntry) */
    stale?: number;
  } | null = null;
  /** Base results by combo for the partial progression (CTS_CORE_BASE_SLICES) */
  private baseCache: { key: string; runs: Map<string, ComboRun[]>; slice: number } | null = null;
  /** One small, causal result cache; a verified prehistory fingerprint prevents refitting identical Exit inputs. */
  private exitHistoryCache: {
    key: string;
    protects: Record<string, Protect[]>;
    diagnostics: ExitStrategyDiagnostics;
  } | null = null;

  /** Time-sliced driver for backtests: yields every SLICE_MS, aborts past the job's time limit. */
  private async sliced<T, R>(
    gen: Generator<T, R>,
    onStep: (v: T) => void,
    job = this.backtestJob,
  ): Promise<R> {
    let slice = performance.now();
    try {
      for (;;) {
        this.checkBacktest(job);
        const r = gen.next();
        this.checkBacktest(job);
        if (r.done) return r.value;
        onStep(r.value);
        this.checkBacktest(job);
        if (performance.now() - slice > SLICE_MS) {
          await yieldNow();
          this.checkBacktest(job);
          slice = performance.now();
        }
      }
    } finally {
      gen.return(undefined as R);
    }
  }

  /**
   * The preset backtest's Base on the bars before its window, judged as the engine judges (basePass): each pair at the
   * default protect and at one cell of each enabled range (the engine's "s1" Base), the pairs that pass enter Main by
   * lane (mainByLane) with the ranges and targets they passed. The worker messages carry the gates, so the worker path
   * gates exactly as the in-process one — without them a worker scored every combo with a run, and every one entered
   * Main (PF below the minimum, too few trades or a negative net included).
   */
  private async presetBase(
    job: NonNullable<CoreRuntime["backtestJob"]>,
    s: CoreSettings,
    combos: Combo[],
    lookBars: Bars[],
    exitCombos: Combo[] = [],
    exitLookBars: Bars[] = lookBars,
    signalExitCombos: Combo[] = [],
    signalExitLookBars: Bars[] = lookBars,
  ): Promise<{
    main: Set<string>;
    qualified: Set<string>;
    qualifiedTags: Record<string, string[]>;
    qualifiedTps: Record<string, Record<string, readonly number[]>>;
    wideLadderPairs: Set<string>;
    pairTags: Record<string, string[]>;
    pairTps: Record<string, Record<string, readonly number[]>>;
    exitBasePassed: Set<string>;
    exitBaseEvaluated: number;
    pairCells: Record<string, readonly string[]>;
    qualifiedCells: Record<string, readonly string[]>;
  }> {
    const rangeProtects = baseRangeProtects(s.grid, s.cost);
    const completeRangeProtects = completeBaseRangeProtects(s.grid, s.cost);
    const rangeMinTf = rangeMinTfOf(s.grid);
    const micro = microOwnInds(s.grid);
    const byPair = new Map<string, ComboRun[]>();
    const add = (x: ComboRun) => {
      const k = `${x.bot}|${x.ind}`;
      const xs = byPair.get(k);
      if (xs) xs.push(x);
      else byPair.set(k, [x]);
    };
    this.checkBacktest(job);
    const calculate = async (
      work: Combo[],
      bars: Bars[],
      progressStart: number,
      progressSpan: number,
    ) => {
      if (!work.length) return;
      const viaWorkers = await this.onWorkers(job, "Base", async (n, signal) => {
        const res = await runOnWorkers<{ runsJson: string[] }>(
          partitionByIndication(work, n * 2)
            .filter((p) => p.length)
            .map((c) => ({
              type: "s1",
              bars,
              combos: c,
              cost: s.cost,
              tactics: s.tactics,
              rangeProtects,
              completeRangeProtects,
              rangeMinTf,
              microOwnInds: micro,
              gates: s.gates,
              cells: s.grid?.baseCells === true,
            })),
          n,
          15 * 60_000,
          undefined,
          true,
          signal,
        );
        this.checkBacktest(job);
        for (const r of res)
          for (const chunk of r.runsJson) for (const x of JSON.parse(chunk) as ComboRun[]) add(x);
      });
      if (viaWorkers) return;
      const look = makeUniverse(bars);
      function* base() {
        for (let i = 0; i < work.length; i++) {
          const rs = baseRuns(
            look,
            [work[i]],
            s.cost,
            s.tactics,
            false,
            false,
            undefined,
            rangeProtects,
            rangeMinTf,
            micro,
            s.gates,
            completeRangeProtects,
            s.grid?.baseCells === true,
          );
          for (const x of rs) add(x);
          yield i;
        }
      }
      await this.sliced(
        base(),
        (i) => (job.progress = progressStart + (progressSpan * (i + 1)) / work.length),
        job,
      );
    };
    await calculate(combos, lookBars, 0.3, 0.28);
    await calculate(exitCombos, exitLookBars, 0.58, 0.12);
    await calculate(signalExitCombos, signalExitLookBars, 0.7, 0.08);
    // in combo order (as the engine's S1), whichever path computed them
    const runs = [...combos, ...exitCombos, ...signalExitCombos].flatMap((c) => byPair.get(`${c.bot}|${c.ind}`) ?? []);
    const engineRuns = runs.filter((r) => r.bot !== EXIT_BOT);
    const { passed, qualified, qualifiedTags, qualifiedTps, qualifiedCells, wideLadderPairs, pairTags, pairTps, pairCells } = basePass(
      engineRuns,
      s,
    );
    const setsGates = baseSetsGates(s.gates);
    const exitBase = qualifyExitBase(runs, s.exitStrategy, {
      ...setsGates,
      minPf: Math.max(setsGates.minPf, s.gates.minPf),
    });
    return {
      main: new Set([...mainByLane(passed, s.mainTop), ...mainByLane(qualified, s.mainTop)]),
      qualified: new Set(qualified.map((r) => `${r.bot}|${r.ind}`)),
      qualifiedTags,
      qualifiedTps,
      qualifiedCells,
      wideLadderPairs,
      pairTags,
      pairTps,
      pairCells,
      exitBasePassed: exitBase.passed,
      exitBaseEvaluated: exitBase.evaluated.size,
    };
  }

  private async runPresetBacktest(
    p: Preset,
    days: number,
    job: NonNullable<CoreRuntime["backtestJob"]>,
  ) {
    this.checkBacktest(job);
    const patch = presetSettings(p.settings);
    const s = mergeSettings(this.settings, {
      ...patch,
      tactics: { ...DEFAULT_SETTINGS.tactics, ...(patch.tactics ?? {}) },
      focus: patch.focus ?? [],
    });
    checkGridVariantBudget(s.grid, s.cost);
    const wf: WalkForwardOptions = {
      ...defaultWalkForward(s),
      ...sanitizeWf(p.wf as never),
      gates: s.gates,
      cost: s.cost,
      toggles: s.toggles,
      block: s.block,
      dca: s.dca,
      relate: s.relate,
    };
    const lookH = Math.max(wf.longH, wf.preH, wf.symH ?? 0);
    const signalWantBars = Math.ceil(signalDataHours(s, { ...wf, simH: days * 24 }) * 60 / s.tfMin);
    // Preserve Normal/Signal cohorts while separately supplying Exit's causal fit/holdout and native lane warmup.
    // lookback=0 retains each lane's configured history; positive lookbacks extend only lanes needing more history.
    const exitLaneDays =
      (s.exitStrategy.lookbackH + 24 + (tacticWarmupBars(s.tactics) * s.tfMin) / 60) / 24;
    const exitLaneSettings =
      s.exitStrategy.enabled && s.exitStrategy.lookbackH > 0
        ? {
            ...s,
            tfDays: Object.fromEntries(
              s.tfs.map((tf) => [
                String(tf),
                Math.max(s.tfDays[String(tf)] ?? s.historyDays, exitLaneDays),
              ]),
            ),
          }
        : s;
    const exitHistoryH =
      Math.max(...s.tfs.map((tf) => exitLaneSettings.tfDays[String(tf)] ?? s.historyDays)) * 24;
    const dataNowT = this.market === "synthetic"
      ? Number(process.env.CTS_CORE_SYNTHETIC_END) || Date.now() : Date.now();
    const endT = Math.floor(dataNowT / H) * H;
    // A declared whole-hour backtest must not borrow the live tail after that hour. Count/fetch only its
    // closed prefix; otherwise a late partial native bucket can displace one complete history bar.
    const beforeEnd = (cs: CandleSeries) => cs.range(0, cs.lowerBound(endT));
    const startT = endT - days * 24 * H;
    // history: warm-up day + long window + tactics warm-up + the backtest days
    const laneWantBars = Math.max(
      ...s.tfs.map(
        (tf) =>
          Math.ceil((((s.tfDays[String(tf)] ?? s.historyDays) + days) * 24 * 60) / s.tfMin) +
          tacticWarmupBars(s.tactics) +
          10,
      ),
    );
    const ordinaryWantBars = Math.max(
      laneWantBars,
      Math.ceil(((24 + lookH + days * 24) * 60) / s.tfMin) + tacticWarmupBars(s.tactics) + 10,
      Math.ceil(strategyDataHours(s, { ...wf, simH: days * 24 }) * 60 / s.tfMin) + 10,
    );
    const wantBars = Math.max(s.signals.enabled ? signalWantBars : 0, s.exitStrategy.enabled
      ? Math.max(ordinaryWantBars, Math.ceil(((exitHistoryH + days * 24) * 60) / s.tfMin) + 11)
      : ordinaryWantBars);
    let candles: Map<string, CandleSeries>;
    // the engine's own data only when the preset trades the same universe (count, ranking, timeframe)
    const sameUniverse =
      s.symbols === this.settings.symbols && s.symbolRank === this.settings.symbolRank;
    const uniKey = `${s.tfMin}|${s.symbols}|${s.symbolRank}`;
    const own =
      sameUniverse &&
      s.tfMin === this.settings.tfMin &&
      [...this.candles.values()].every((c) => beforeEnd(c).n >= wantBars) &&
      this.candles.size > 0;
    if (own) candles = this.candles;
    else {
      const cached = this.btCandles.get(uniKey);
      const enough =
        cached &&
        Date.now() - cached.at < 10 * 60_000 &&
        [...cached.candles.values()].every((c) => beforeEnd(c).n >= wantBars);
      if (enough) candles = cached!.candles;
      else if (this.market === "synthetic") {
        // test-only market: the backtest reads the same synthetic series as the compute (it fetched real BingX
        // tickers and candles before — a network dependency and real data mixed into a synthetic run)
        candles = new Map();
        for (let i = 0; i < s.symbols; i++)
          candles.set(
            `SYN${i}-USDT`,
            CandleSeries.fromCandles(syntheticCandles(`SYN${i}`, s.tfMin, wantBars, endT - s.tfMin * 60_000)),
          );
        this.btCandles.set(uniKey, { at: Date.now(), candles });
      } else {
        candles = new Map();
        let syms = sameUniverse
          ? this.status.symbols.length
            ? this.status.symbols
            : [...this.candles.keys()]
          : [];
        // the preset's own universe (or the engine's before its first sync), ranked the way the engine does
        if (!syms.length) {
          if (!this.tickers.length) {
            const tickers = await this.backtestAwait(job, this.feed.tickers());
            this.checkBacktest(job);
            this.tickers = tickers;
          }
          syms = forceSymbols(
            await this.backtestAwait(
              job,
              rankUniverse(this.tickers, s.symbols, s.symbolRank ?? "volatility1h", (...args) => {
                this.checkBacktest(job);
                return this.backtestAwait(job, this.feed.klines(...args));
              }, this.feed.rankingAt),
            ),
            s.forceSymbols,
            s.symbols,
          );
        }
        let done = 0;
        // the engine's candles at this timeframe are reused; only the missing older part is downloaded
        const tfMs = s.tfMin * 60_000;
        await mapLimit(
          syms,
          8,
          async (sym) => {
            this.checkBacktest(job);
            const have =
              s.tfMin === this.settings.tfMin
                ? beforeEnd(this.candles.get(sym) ?? CandleSeries.EMPTY)
                : CandleSeries.EMPTY;
            const missing = wantBars - have.n;
            let cs: CandleSeries = have;
            if (missing > 0) {
              const first = have.firstT();
              const older = await this.backtestAwait(
                job,
                this.feed
                  .history(sym, s.tfMin, have.n ? missing : wantBars, {
                    pauseMs: 0,
                    nowT: first ?? endT,
                  })
                  .catch((error: unknown) => {
                    const reason = error instanceof Error ? error.message : String(error);
                    throw new Error(`preset market history ${sym}: ${reason}`);
                  }),
              );
              this.checkBacktest(job);
              cs =
                first !== undefined
                  ? CandleSeries.prepend(
                      older.filter((c) => c.t < first && c.t >= first - missing * tfMs),
                      have,
                    )
                  : CandleSeries.fromCandles(older);
            }
            if (cs.n) candles.set(sym, cs);
            job.progress = (++done / syms.length) * 0.3;
          },
          () =>
            !this.disposed &&
            job.state === "running" &&
            !this.backtestControls?.get(job)?.signal.aborted,
        );
        this.checkBacktest(job);
        if (!candles.size) throw new Error("no market data (exchange unreachable)");
        this.btCandles.set(uniKey, { at: Date.now(), candles });
      }
    }
    this.checkBacktest(job);
    candles = new Map([...candles].map(([sym, cs]) => [sym, beforeEnd(cs)]));
    // every lane over its own history before the backtest window plus the window itself
    // CandleSeries.tail is a zero-copy view. The ordinary source keeps exactly its original fetch span, including
    // the first partial resampling bucket, even when Exit needed additional older candles.
    const ordinaryCandles = s.exitStrategy.enabled
      ? new Map([...candles].map(([sym, cs]) => [sym, cs.tail(ordinaryWantBars)]))
      : candles;
    const bars = laneSeriesFrom(ordinaryCandles, s, days, strategyDataHours(s, { ...wf, simH: days * 24 })).map((b) =>
      tailBars(b, Math.ceil((ordinaryWantBars * s.tfMin) / b.tfMin)),
    );
    const u = makeUniverse(bars);
    const signalU = s.signals.enabled
      ? makeUniverse(signalLaneSeriesFrom(candles, s, { ...wf, simH: days * 24 })) : u;
    const sig = signalSettings(s.signals);
    const configuredSignalCombos = signalCombos(sig, s.tfs);
    const exitU = s.exitStrategy.enabled
      ? makeUniverse(laneSeriesFrom(candles, exitLaneSettings, days))
      : null;
    const exitPairs = exitU
      ? exitStrategyPairs(
          allCombos(baseFocus(s), s.disabledKinds, s.tfs, microLaneFloor(s.grid),
            s.grid.lowRange?.enabled === true && !!s.grid.short, rangeMinTfOf(s.grid).sh ?? 0),
          exitU,
          s.exitStrategy,
          s.disabledKinds,
        )
      : [];
    const exitCombos: Combo[] = exitPairs.map((pair) => {
      const [, ind] = pair.split("|");
      return { bot: EXIT_BOT, ind };
    });
    const signalExitPairs = s.exitStrategy.enabled && sig.enabled
      ? exitSignalStrategyPairs(configuredSignalCombos, signalU, s.exitStrategy)
      : [];
    const signalExitCombos: Combo[] = signalExitPairs.map((pair) => {
      const [, ind] = pair.split("|");
      return { bot: EXIT_BOT, ind };
    });
    const simulationUniverse = s.exitStrategy.enabled && exitU
      ? makeUniverse(
          (() => {
            const byLane = new Map<string, Bars>();
            for (const source of [u, signalU, exitU])
              for (const bar of source.bars) {
                const key = `${bar.sym}|${bar.tfMin}`;
                const current = byLane.get(key);
                if (
                  !current ||
                  bar.n > current.n ||
                  (bar.n === current.n && (bar.t[0] ?? Infinity) < (current.t[0] ?? Infinity))
                )
                  byLane.set(key, bar);
              }
            return [...byLane.values()];
          })(),
        )
      : u;
    // Every preset, including fixed-focus research, qualifies on Base history BEFORE the backtest.
    // Base on the window BEFORE the backtest (causal), unless a fixed focus set is traded
    job.stage = "Base";
    // The ranges and targets each pair passed in Base.
    // the engine's Micro lane floor (Micro's own was applied under both rules: with Minimal on Micro's indications a
    // Micro pair on a faster lane never reached its Minimal cells)
    const combos = allCombos(s.focus, s.disabledKinds, s.tfs, microLaneFloor(s.grid),
      s.grid.lowRange?.enabled === true && !!s.grid.short, rangeMinTfOf(s.grid).sh ?? 0);
    const beforeT = (b: Bars) => {
      let z = 0;
      while (z < b.n && b.t[z] < startT) z++;
      return {
        ...b,
        n: z,
        t: b.t.slice(0, z),
        o: b.o.slice(0, z),
        h: b.h.slice(0, z),
        l: b.l.slice(0, z),
        c: b.c.slice(0, z),
        v: b.v.slice(0, z),
      };
    };
    const lookBars = bars.map(beforeT);
    const exitLookBars = exitU?.series.map(beforeT) ?? [];
    const signalExitLookBars = signalU.series.map(beforeT);
    const base = await this.presetBase(job, s, combos, lookBars, exitCombos, exitLookBars, signalExitCombos, signalExitLookBars);
    const { main, pairTags, pairTps, pairCells } = base;
    wf.basePassed = new Set([...base.qualified, ...base.exitBasePassed]);
    wf.exitBasePassed = base.exitBasePassed;
    wf.basePassedRanges = base.qualifiedTags;
    wf.basePassedTargets = base.qualifiedTps;
    wf.basePassedCells = s.grid.baseCells === true || s.grid.lowRange?.enabled === true
      ? passedCellsOf(base.qualifiedCells) : undefined;
    wf.baseWideLadderPairs = base.wideLadderPairs;
    this.checkBacktest(job);
    job.stage = "Tapes";
    const dcaOpt = { protects: wf.dcaProtects, dca: wf.dca, axis: s.axis };
    const adjust = s.adjust?.enabled ? this.adjustState() : null;
    // the engine's tape rules: only the ranges and targets a pair passed in Base, and the Micro indication rule (the
    // floors alone built every range and target of every pair, and Micro cells for every indication)
    const floors: EntryFloors = {
      ...protectFloors(s, startT),
      pairTags,
      pairTps,
      ...(pairCells ? { pairCells } : {}),
      microOwnInds: microOwnInds(s.grid),
    };
    let tapes: ConfigTape[] = [];
    // pairs in the engine's combo order, cut into contiguous slices → identical tape order to one process
    // (lane combos included: the pairs are lane ids when the settings carry timeframe lanes)
    const pairs = combos.map((c) => `${c.bot}|${c.ind}`).filter((x) => main.has(x));
    const tapesViaWorkers = await this.onWorkers(job, "Tapes", async (n, signal) => {
      const res = await runOnWorkers<{ tapes: ConfigTape[] }>(
        slices(pairs, n * 2).map((pp) => ({
          type: "tapes",
          bars,
          pairs: pp,
          protects: wf.protects,
          cost: s.cost,
          dcaOpt,
          tactics: s.tactics,
          adjust,
          floors,
        })),
        n,
        15 * 60_000,
        undefined,
        // a backtest someone waits for goes before the engines' background recomputes
        true,
        signal,
      );
      this.checkBacktest(job);
      tapes = res.flatMap((x) => x.tapes);
    });
    if (!tapesViaWorkers)
      tapes = await this.sliced(
        buildTapesGen(u, wf.protects, s.cost, dcaOpt, main, s.tactics, adjust, floors),
        (x) => (job.progress = 0.6 + (0.3 * x.done) / Math.max(1, x.total)),
        job,
      );
    // Signals: scored on the window before the backtest, the best N trade their 42 Normal + 35 Trailing configs
    // Historic Exit qualifies independently of Base/range admission, as on the continuous runtime. Fit before the
    // simulated window, then build only those exact Exit configs on a dedicated, range-free tape path.
    if (s.exitStrategy.enabled && exitU) {
      const validation: ExitStrategyValidation = {
        cost: s.cost,
        minPf: s.exitStrategy.minPf,
        minTrades: s.exitStrategy.minValidationTrades,
        maxDdr: s.exitStrategy.maxDdr,
        minSl: s.protectFloor.minSl,
        minTrail: s.protectFloor.minTrail,
      };
      const signalValidation: ExitStrategyValidation = {
        ...validation,
        minSl: sig.minSl,
        minTrail: sig.minTrail,
        signalTrailMax: sig.trailMax,
      };
      const exitFitPairs = exitPairs.filter((pair) => base.exitBasePassed.has(pair));
      const engineExitFitPairs = exitFitPairs.filter((pair) => !isSignalInd(pair.split("|")[1] ?? ""));
      const signalExitFitPairs = exitFitPairs.filter((pair) => isSignalInd(pair.split("|")[1] ?? ""));
      let exitProtects: Record<string, Protect[]> = {};
      let sharedExitBars: Bars[] | null = null;
      let sharedSignalExitBars: Bars[] | null = null;
      const sharedBars = () => (sharedExitBars ??= shareBars(exitU.series));
      const sharedSignalBars = () => (sharedSignalExitBars ??= shareBars(signalU.series));
      const clearMemos = () => {
        for (const cache of exitU.caches) cache.clear();
        // With Signals disabled, signalU aliases the ordinary preset universe. Exit fitting must not evict that
        // unrelated indicator cache; only clear the separately initialized Signal history when it was used.
        if (signalExitFitPairs.length && signalU !== u)
          for (const cache of signalU.caches) cache.clear();
      };
      try {
        if (exitFitPairs.length) {
          job.stage = "Exit history";
          const fitGroups = [
            ...(engineExitFitPairs.length
              ? [{ pairs: engineExitFitPairs, universe: exitU, bars: sharedBars(), validation, entryFilters: undefined }]
              : []),
            ...(signalExitFitPairs.length
              ? [{
                  pairs: signalExitFitPairs,
                  universe: signalU,
                  bars: sharedSignalBars(),
                  validation: signalValidation,
                  entryFilters: Object.fromEntries(signalExitFitPairs.map((pair) => [pair, sig.filter])),
                }]
              : []),
          ];
          const parts = fitGroups.flatMap((group) =>
            slices(group.pairs, Math.ceil(group.pairs.length / EXIT_HISTORY_MAX_PAIRS)).map((pairs) => ({
              ...group,
              pairs,
              entryFilters: group.entryFilters
                ? Object.fromEntries(pairs.map((pair) => [pair, group.entryFilters![pair]]))
                : undefined,
            })),
          );
          const viaWorkers = await this.onWorkers(job, "Exit history", async (cores, signal) => {
            const n = Math.min(cores, parts.length, 8);
            job.stage = `Exit history · ${n} cores`;
            const replies = await runOnWorkers<import("./pool.server.ts").ExitStrategyReply>(
              parts.map((part) => ({
                type: "exit-hist",
                bars: part.bars,
                pairs: part.pairs,
                settings: s.exitStrategy,
                tactics: s.tactics,
                cutT: startT,
                validation: part.validation,
                entryFilters: part.entryFilters,
              })),
              n,
              15 * 60_000,
              undefined,
              true,
              signal,
            );
            this.checkBacktest(job);
            const fitted: Record<string, Protect[]> = {};
            replies.forEach((reply, i) => {
              const own = new Set(parts[i].pairs);
              if (
                !reply?.pairProtects ||
                typeof reply.pairProtects !== "object" ||
                Array.isArray(reply.pairProtects) ||
                Object.entries(reply.pairProtects).some(
                  ([pair, protects]) => !own.has(pair) || !Array.isArray(protects),
                )
              )
                throw new Error("unexpected preset Exit history worker reply");
              Object.assign(fitted, reply.pairProtects);
            });
            exitProtects = fitted;
          });
          if (!viaWorkers) {
            job.stage = "Exit history";
            for (const part of parts) {
              this.checkBacktest(job);
              try {
                Object.assign(
                  exitProtects,
                  await this.sliced(
                    exitStrategyProtectsGen(
                      part.universe,
                      part.pairs,
                      s.exitStrategy,
                      s.tactics,
                      startT,
                      part.validation,
                      undefined,
                      part.entryFilters,
                    ),
                    () => undefined,
                    job,
                  ),
                );
              } finally {
                clearMemos();
              }
            }
          }
          this.checkBacktest(job);
          const qualified = engineExitFitPairs.filter((pair) => exitProtects[pair]?.length);
          if (qualified.length) {
            job.stage = "Exit tapes";
            const tapeParts = slices(qualified, Math.ceil(qualified.length / 2));
            const exitFloors = {
              minSl: validation.minSl,
              minTrail: validation.minTrail,
              pairProtects: exitProtects,
            };
            let exitTapes: ConfigTape[] = [];
            const builtOnWorkers = await this.onWorkers(
              job,
              "Exit tapes",
              async (cores, signal) => {
                const n = Math.min(cores, tapeParts.length, 8);
                job.stage = `Exit tapes · ${n} cores`;
                const ownFloors = floorsForPairs(exitFloors);
                const replies = await runOnWorkers<{ tapes: ConfigTape[] }>(
                  tapeParts.map((pairs) => ({
                    type: "tapes",
                    bars: sharedBars(),
                    pairs,
                    protects: [],
                    cost: s.cost,
                    tactics: s.tactics,
                    adjust,
                    floors: ownFloors(pairs),
                  })),
                  n,
                  15 * 60_000,
                  undefined,
                  true,
                  signal,
                );
                this.checkBacktest(job);
                exitTapes = replies.flatMap((reply) => reply.tapes);
              },
            );
            if (!builtOnWorkers) {
              job.stage = "Exit tapes";
              for (const pairs of tapeParts) {
                this.checkBacktest(job);
                try {
                  exitTapes.push(
                    ...(await this.sliced(
                      buildTapesGen(
                        exitU,
                        [],
                        s.cost,
                        undefined,
                        new Set(pairs),
                        s.tactics,
                        adjust,
                        floorsForPairs(exitFloors)(pairs),
                      ),
                      () => undefined,
                      job,
                    )),
                  );
                } finally {
                  clearMemos();
                }
              }
            }
            this.checkBacktest(job);
            const ids = new Set<string>();
            for (const tape of exitTapes) {
              if (tape.kind !== "exit" || ids.has(tape.id))
                throw new Error("invalid or duplicate preset Exit tape");
              ids.add(tape.id);
            }
            tapes = tapes.concat(exitTapes);
          }
          const signalQualified = signalExitFitPairs.filter((pair) => exitProtects[pair]?.length);
          if (signalQualified.length) {
            job.stage = "Signal Exit tapes";
            const signalFloors: EntryFloors = {
              minSl: sig.minSl,
              minTrail: sig.minTrail,
              signalTrailMax: sig.trailMax,
              entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
              pairProtects: exitProtects,
            };
            const signalParts = slices(signalQualified, Math.ceil(signalQualified.length / 2));
            let signalExitTapes: ConfigTape[] = [];
            const builtOnWorkers = await this.onWorkers(
              job,
              "Signal Exit tapes",
              async (cores, signal) => {
                const n = Math.min(cores, signalParts.length, 8);
                job.stage = `Signal Exit tapes · ${n} cores`;
                const ownFloors = floorsForPairs(signalFloors);
                const replies = await runOnWorkers<{ tapes: ConfigTape[] }>(
                  signalParts.map((pairs) => ({
                    type: "tapes",
                    bars: sharedSignalBars(),
                    pairs,
                    protects: [],
                    cost: s.cost,
                    tactics: s.tactics,
                    adjust,
                    floors: ownFloors(pairs),
                  })),
                  n,
                  15 * 60_000,
                  undefined,
                  true,
                  signal,
                );
                this.checkBacktest(job);
                signalExitTapes = replies.flatMap((reply) => reply.tapes);
              },
            );
            if (!builtOnWorkers) {
              for (const pairs of signalParts) {
                this.checkBacktest(job);
                signalExitTapes.push(
                  ...(await this.sliced(
                    buildTapesGen(
                      signalU,
                      [],
                      s.cost,
                      undefined,
                      new Set(pairs),
                      s.tactics,
                      adjust,
                      floorsForPairs(signalFloors)(pairs),
                    ),
                    () => undefined,
                    job,
                  )),
                );
              }
            }
            this.checkBacktest(job);
            const ids = new Set<string>();
            for (const tape of signalExitTapes) {
              if (tape.kind !== "exit" || !isSignalInd(tape.ind) || ids.has(tape.id))
                throw new Error("invalid or duplicate preset Signal Exit tape");
              ids.add(tape.id);
            }
            tapes = tapes.concat(signalExitTapes);
          }
        }
      } finally {
        // Cancellation cannot retain historical indicator arrays or continue into a local fallback/publication.
        clearMemos();
        sharedExitBars = null;
        sharedSignalExitBars = null;
      }
    }
    // Signals: scored on the window before the backtest, the best N trade their 15 Normal + 15 Trailing configs
    const coordProtects = signalCoordinationProtects(s.grid, s.cost, sig.coordination.ranges, sig);
    const sigCombos = configuredSignalCombos.filter(
      (c) => !isSignalCoordinationInd(c.ind) || coordProtects.length > 0,
    );
    let sigActive: Set<string> | undefined;
    if (sigCombos.length) {
      const look = makeUniverse(
        signalU.series.map((b) => {
          let z = 0;
          while (z < b.n && b.t[z] < startT) z++;
          return {
            ...b,
            n: z,
            t: b.t.slice(0, z),
            o: b.o.slice(0, z),
            h: b.h.slice(0, z),
            l: b.l.slice(0, z),
            c: b.c.slice(0, z),
            v: b.v.slice(0, z),
          };
        }),
      );
      const runs: ComboRun[] = [];
      function* sigBase() {
        for (let i = 0; i < sigCombos.length; i++) {
          const c = sigCombos[i];
          const r = runCombo(look, c.bot, c.ind, DEFAULT_PROTECT, s.cost, 1, s.tactics, false, s.gates.baseLastN ?? 0);
          // (slim: the active signals and the candidates read the stats per symbol, not the trades)
          if (r) runs.push(slim(r));
          forgetCombo(look, c.bot, c.ind);
          yield i;
        }
      }
      await this.sliced(sigBase(), () => undefined, job);
      // The same initialized-pair discovery rule as the live runtime; type/config qualification remains causal.
      sigActive = activeSignals(runs, sig);
      const signalFamilies = parseEvalFamilies(process.env.CTS_CORE_FAMILY);
      const initialized = sigCombos.filter(
        (c) =>
          seriesOf(look, c.ind).length > 0 &&
          (!signalFamilies || signalFamilies.some((f) => evalFamilyMatch(f, c.bot, c.ind, []))),
      );
      const sigPairs = signalEvaluationPairs(initialized, runs, sig, (r) =>
        passesBase(r.full, { ...baseSetsGates(s.gates), minPf: minPfOf(baseSetsGates(s.gates), undefined, r.ind) }),
      );
      if (sigPairs.size) {
        const coordinationPairs = new Set(
          [...sigPairs].filter((pair) =>
            isSignalCoordinationInd(pair.slice(pair.indexOf("|") + 1)),
          ),
        );
        const sourcePairs = new Set([...sigPairs].filter((pair) => !coordinationPairs.has(pair)));
        const history = sig.hist.enabled
          ? await this.sliced(
              signalHistProtectsGen(
                signalU,
                sigPairs,
                sig,
                s.tactics,
                startT,
                coordinatorHistValidationOf(s, coordProtects, wf.rangeOpts?.sig?.validLastN ?? wf.signalValidLastN),
              ),
              () => undefined,
              job,
            )
          : {};
        const taggedHistory = signalCoordinationHistory(history, coordinationPairs, coordProtects);
        const historyOf = (pairs: ReadonlySet<string>) =>
          Object.fromEntries(
            [...pairs].flatMap((pair) =>
              taggedHistory[pair]?.length ? [[pair, taggedHistory[pair]!]] : [],
            ),
          );
        const entryFloors = {
          minSl: sig.minSl,
          minTrail: sig.minTrail,
          signalReferenceGrid: true,
          signalTrailMax: sig.trailMax,
          entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
        };
        const sigStrat =
          sig.strategies.dca || sig.strategies.axis
            ? {
                ...dcaOpt,
                axis: sig.strategies.axis ? s.axis : undefined,
                noDca: !sig.strategies.dca,
              }
            : undefined;
        const coordStrat = sigStrat ? { ...sigStrat, protects: coordProtects } : undefined;
        if (sourcePairs.size) {
          tapes = tapes.concat(
            await this.sliced(
              buildTapesGen(
                signalU,
                signalProtects(sig),
                s.cost,
                sigStrat,
                sourcePairs,
                s.tactics,
                adjust,
                {
                  ...entryFloors,
                  pairProtects: historyOf(sourcePairs),
                },
              ),
              () => undefined,
              job,
            ),
          );
        }
        if (coordinationPairs.size) {
          tapes = tapes.concat(
            await this.sliced(
              buildTapesGen(
                signalU,
                coordProtects,
                s.cost,
                coordStrat,
                coordinationPairs,
                s.tactics,
                adjust,
                {
                  ...entryFloors,
                  pairProtects: historyOf(coordinationPairs),
                },
              ),
              () => undefined,
              job,
            ),
          );
        }
      }
    }
    if (sig.enabled && sigActive) {
      for (const tape of tapes) {
        if (tape.kind !== "exit" || !isSignalInd(tape.ind)) continue;
        const seen = new Set<string>();
        for (let i = 0; i < tape.n; i++) {
          const sym = tape.syms[tape.symI[i]];
          const side = tape.side[i] > 0 ? 1 : -1;
          const key = `${sym}|${side}`;
          if (seen.has(key)) continue;
          seen.add(key);
          sigActive.add(sigActiveKey(tape.bot, tape.ind, sym, side, tape.kind, tape.id));
        }
        for (const open of tape.open) {
          const key = `${open.sym}|${open.side}`;
          if (seen.has(key)) continue;
          seen.add(key);
          sigActive.add(sigActiveKey(tape.bot, tape.ind, open.sym, open.side, tape.kind, tape.id));
        }
      }
    }
    this.checkBacktest(job);
    job.stage = "Simulation";
    const sim = await this.sliced(
      walkForwardGen(simulationUniverse, tapes, {
        ...wf,
        startT,
        simH: days * 24,
        signalActive: sigActive,
        signalRank: sigActive ? sig : undefined,
        signalGuardN: sigActive && sig.guard.enabled ? sig.guard.lastN : 0,
        signalCluster: sigActive ? sig.cluster : undefined,
        signalAccept: sigActive ? sig.accept : undefined,
        signalSideAccept: sigActive ? sig.sideAccept : undefined,
        signalOwnBase: !!sigActive && sig.ownBase !== false,
        signalSourceGate: sigActive ? sig.sourceGate : undefined,
        signalPerSymbol: sig.perSymbol,
        signalMaxOpen: sig.maxOpen,
        signalMaxPositions: sig.maxPositions,
      }),
      () => (job.progress = Math.min(0.99, job.progress + 0.001)),
      job,
    );
    this.checkBacktest(job);
    const st = sim.stats;
    const knownBasis = st.pfBasis === "unit-net-returns" && st.unknownReturns === 0;
    const noLoss = knownBasis ? st.gp > 0 && st.gl === 0 : null;
    const settledTrades = sim.trades.filter(
      (trade) => trade.exitT > startT && trade.exitT <= sim.endT,
    );
    const settled = unitStatsOf(settledTrades, sim.endT);
    const settledKnown = settled.pfBasis === "unit-net-returns";
    const settledNoLoss = settledKnown ? settled.gp > 0 && settled.gl === 0 : null;
    const r: PresetBacktest = {
      days,
      at: Date.now(),
      from: startT,
      to: Math.min(endT, simulationUniverse.nowT),
      tfMin: s.tfMin,
      pf: knownBasis ? st.pf : null,
      pfBasis: st.pfBasis,
      unknownReturns: st.unknownReturns,
      gp: knownBasis ? st.gp : null,
      gl: knownBasis ? st.gl : null,
      noLoss,
      pfConvention: !knownBasis
        ? "unavailable"
        : noLoss
          ? "no-loss-sentinel"
          : "gross-return-ratio",
      sample: "with-endpoint-marks",
      endpointMarks: sim.openAtEnd?.length ?? 0,
      settledStats: {
        ...settled,
        n: settledTrades.length,
        pf: settledKnown ? settled.pf : null,
        gp: settledKnown ? settled.gp : null,
        gl: settledKnown ? settled.gl : null,
        noLoss: settledNoLoss,
        pfConvention: !settledKnown
          ? "unavailable"
          : settledNoLoss
            ? "no-loss-sentinel"
            : "gross-return-ratio",
        sample: "settled-closes",
      },
      sizeWeightedDiagnostics: sim.sizedStats
        ? { ...sim.sizedStats, sample: "with-endpoint-marks" }
        : undefined,
      n: sim.trades.length + (sim.openAtEnd?.length ?? 0),
      perDay: (sim.trades.length + (sim.openAtEnd?.length ?? 0)) / days,
      wr: st.wr,
      net: knownBasis ? st.net : null,
      successHours: st.gh,
      greenHours: st.greenHours,
      hours: st.hours,
      ddtH: st.ddt,
      stable: sim.stable,
      minPf: s.gates.minPf,
      maxDdtH: s.gates.maxDdtH,
      pass: knownBasis && st.n > 0 && st.pf >= s.gates.minPf && st.ddt <= s.gates.maxDdtH,
      byKind: sim.byKind,
    };
    // the diagrams over the window (balance, equity, drawdown, open book, P&L per type) and the info line
    // (positions per hour, PF of the last 12 / 25 / 75 positions, DDT), cached per preset
    try {
      const to = Math.min(endT, simulationUniverse.nowT);
      const series = backtestSeries(sim.trades, candles, s, startT, to, days);
      this.checkBacktestRevision(job);
      this.setPresetSeries(p.id, series);
      r.posPerHour = series.info.posPerHour;
      r.pfLast12 = series.info.pfLast12;
      r.pfLast25 = series.info.pfLast25;
      r.pfLast75 = series.info.pfLast75;
      r.equityDdtH = series.info.ddtH;
      r.maxDdPct = series.info.maxDdPct;
    } catch (err) {
      this.checkBacktest(job);
      this.db.event(
        "warn",
        `backtest ${p.label}: diagrams not built: ${err instanceof Error ? err.message : err}`,
      );
    }
    this.checkBacktestRevision(job);
    const all = this.presetBacktests();
    all[p.id] = [r, ...(all[p.id] ?? [])].slice(0, 30);
    this.db.kvSet("presetBacktests", all);
    this.db.event(
      "info",
      `backtest ${p.label} · ${days}d: PF ${st.pf.toFixed(2)} · success hours ${(st.gh * 100).toFixed(0)}% · DDT ${st.ddt.toFixed(1)}h · ${st.n} trades`,
    );
    job.state = "done";
    job.stage = "done";
    job.progress = 1;
  }

  findPreset(id: string): Preset | undefined {
    return (
      ALL_RESEARCH_PRESETS.find((p) => p.id === id) ?? this.savedPresets().find((p) => p.id === id)
    );
  }

  /** Apply a preset's settings + walk-forward patch (the Live stage is never touched). */
  applyPreset(id: string): Preset {
    const p = this.findPreset(id);
    if (!p) throw new Error("unknown preset");
    const patch = presetSettings(p.settings);
    // a preset replaces tactics and focus completely (not merged with the current ones), and starts from the
    // default gates and walk-forward validation: what an earlier preset relaxed (last N 0, a lower min PF) does
    // not survive into the next one (the run horizons stay)
    // (rangeOpts: {} clears an earlier patch's per-range options: they are not in the defaults, so they carried over)
    const wfBase = {
      ...pickWf(defaultWalkForward(DEFAULT_SETTINGS)),
      rangeOpts: {},
      preH: this.wf.preH,
      simH: this.wf.simH,
    };
    const wfPatch = sanitizeWf({ ...wfBase, ...((p.wf ?? {}) as object) } as never);
    // (sanitised to undefined, the key would not survive updateSettings' own sanitiser: {} does, and clears it there)
    if (wfPatch.rangeOpts === undefined) wfPatch.rangeOpts = {};
    this.updateSettings(
      {
        ...patch,
        gates: { ...DEFAULT_SETTINGS.gates, ...(patch.gates ?? {}) },
        tactics: { ...DEFAULT_SETTINGS.tactics, ...(patch.tactics ?? {}) },
        focus: patch.focus ?? [],
      },
      wfPatch,
    );
    this.db.kvSet("activePreset", { id: p.id, label: p.label, at: Date.now() });
    return p;
  }

  /**
   * Edit a preset's own settings (never the engine's). A saved preset is changed in place; a research preset is
   * copied into a new saved preset. Its measured results no longer match the edited settings → marked stale.
   */
  updatePreset(
    id: string,
    settings: SettingsPatch,
    wf: Record<string, unknown>,
    label?: string,
    info?: string,
  ): Preset {
    const p = this.findPreset(id);
    if (!p) throw new Error("unknown preset");
    const gridPatch = settings.grid?.lowRange !== undefined
      ? { ...p.settings.grid, ...settings.grid,
          lowRange: mergeGridSettings(mergeGridSettings(DEFAULT_SETTINGS.grid, p.settings.grid), settings.grid).lowRange }
      : settings.grid;
    const merged = presetSettings({ ...p.settings, ...settings, ...(gridPatch ? { grid: gridPatch } : {}) });
    const g = merged.grid;
    if (g) {
      // Presets do not carry cost and are applied on the current desk, so
      // validate the same merged grid and cost that application will use.
      const materialized = mergeGridSettings(this.settings.grid, g);
      checkLowRangeComplete(materialized);
      checkRangeReplacementsComplete(materialized);
      checkSettings({ grid: materialized });
      checkGridVariantBudget(materialized, this.settings.cost);
    }
    const next: Preset = {
      ...p,
      id:
        p.kind === "research" ? `saved-${presetKey(merged, wf)}-${Date.now().toString(36)}` : p.id,
      kind: p.kind === "research" ? "saved" : p.kind === "auto" ? "saved" : p.kind,
      label: (label ?? (p.kind === "research" ? `${p.label} (edited)` : p.label)).slice(0, 80),
      info: (info ?? p.info).slice(0, 400),
      at: Date.now(),
      settings: merged,
      wf: { ...p.wf, ...sanitizeWf(wf as never) },
      metrics: {
        ...p.metrics,
        source: `${p.metrics.source} — settings edited since; run a backtest for current results`,
      },
    };
    const list = this.savedPresets().filter((x) => x.id !== next.id);
    this.storeSavedPresets(upsertPreset(list, next));
    this.db.event(
      "info",
      `preset ${p.kind === "research" ? "copied and edited" : "edited"}: ${next.label}`,
    );
    return next;
  }

  deletePreset(id: string) {
    this.storeSavedPresets(
      this.savedPresets().filter((p) => p.id !== id),
      [id],
    );
  }

  private persistSim(r: WalkForwardResult) {
    this.db.run(
      "INSERT INTO sim_runs (at, start_t, end_t, n, pf, net, gh, tph, ddt, stable, opts, blocks, hourly) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      Date.now(),
      r.startT,
      r.endT,
      r.stats.n,
      r.stats.pf,
      r.stats.net,
      r.stats.gh,
      r.stats.tph,
      r.stats.ddt,
      r.stable ? 1 : 0,
      JSON.stringify({ ...r.opts, pfBasis: r.stats.pfBasis ?? "unavailable" }),
      JSON.stringify(r.blocks),
      JSON.stringify(r.hourly),
    );
  }

  // ── paper ─────────────────────────────────────────────────────────────
  /** Current-hour selection from the pre-historic window; open positions of the selected configs are the paper book. */
  /** Block / guard books for the live step: a cursor over the current run's feed (advanced, never replayed) */
  private liveBooks: {
    sim: WalkForwardResult | null;
    t: number;
    at: ((t: number) => {
      book: BlockBook | null;
      relate: RelateBook | null;
      guard: SignalGuard | null;
      direction: CandidateDirectionBook | null;
    }) & {
      advance: (t: number, max: number) => boolean;
    };
  } | null = null;
  private realtimeLearning: {
    sim: WalkForwardResult;
    feed: BlockFeedEntry[];
    accepted: Trade[];
  } | null = null;
  /** Unexecuted Active-only skips awaiting a causal modeled close, separate from accepted-order evidence. */
  private relateShadowPending = new Map<string, { entryT: number; base: number; parts: RelateParts }>();

  /** Continue learning causally from this cohort. Actual held entries alone feed accepted-order Block history. */
  private *appendRealtimeLearningGen(deltas: readonly ConfigTape[]): Generator<number, void> {
    const sim = this.sim;
    if (!sim) return;
    if (this.realtimeLearning?.sim !== sim)
      this.realtimeLearning = { sim, feed: [...(sim.feed ?? [])], accepted: [] };
    const state = this.realtimeLearning;
    const held = new Map(this.paper.positions.map((p) => [orderKey(p), p]));
    const feed: BlockFeedEntry[] = [];
    const accepted: Trade[] = [];
    let processed = 0;
    for (const tp of deltas)
      for (let i = 0; i < tp.n; i++) {
        if (++processed % 256 === 0) yield processed;
        const trade = tradeAt(tp, i);
        const key = orderKey(trade);
        const p = held.get(key);
        const shadow = p ? undefined : this.relateShadowPending.get(key);
        const sources = p?.legs
          ? Object.entries(p.legs)
              .filter(([, value]) => (value ?? 0) > 0)
              .map(([source]) => source as BlockSource)
          : undefined;
        feed.push({
          ...blockEntryOf(trade, "candidate-unit"),
          exitT: trade.exitT,
          accepted: !!p,
          ...(p?.relateMeasured ? { relateMeasured: true } : {}),
          ...(p?.relateBase !== undefined ? { relateBase: p.relateBase } : {}),
          ...(p?.relateParts ? { relateParts: p.relateParts } : {}),
          ...(shadow ? { relateShadow: true, relateMeasured: true, relateBase: shadow.base, relateParts: shadow.parts } : {}),
          ...(p?.blockAttribution ? { blockAttribution: p.blockAttribution } : {}),
          ...(sources?.length ? { bsrc: sources } : {}),
        });
        if (shadow || p) this.relateShadowPending.delete(key);
        if (p) {
          const mult = positionMult(p);
          accepted.push({ ...trade, r: trade.r * mult, vol: (trade.vol ?? 1) * mult, mult });
        }
      }
    feed.sort((a, b) => a.exitT - b.exitT);
    accepted.sort((a, b) => a.exitT - b.exitT);
    for (const row of feed) state.feed.push(row);
    for (const row of accepted) state.accepted.push(row);
    const coord = this.coordCache;
    if (coord?.sim === sim)
      for (const trade of accepted) {
        coord.closedBy.push(trade);
        const hour = Math.floor(trade.exitT / H);
        let hours = coord.hourNet;
        if (isHistoricExitConfig(trade.cfg, trade.kind)) {
          hours = coord.exitHourNet.get(trade.cfg) ?? new Map<number, number>();
          coord.exitHourNet.set(trade.cfg, hours);
        }
        hours.set(hour, (hours.get(hour) ?? 0) + trade.r * 100);
        if (sigCfg(trade.cfg) && !isHistoricExitConfig(trade.cfg, trade.kind)) {
          const source = signalSourceOf(trade.cfg.split("|")[1] ?? "");
          let rows = coord.srcClosed.get(source);
          if (!rows) coord.srcClosed.set(source, (rows = []));
          rows.push({ exitT: trade.exitT, r: trade.r });
        }
      }
  }

  private realtimeBooksAt(t: number): BooksAt {
    if (!this.liveBooks || this.liveBooks.sim !== this.sim || t < this.liveBooks.t)
      this.liveBooks = { sim: this.sim, t, at: this.booksAt() };
    this.liveBooks.t = t;
    return this.liveBooks.at;
  }
  private tapeIdx: {
    tapes: readonly ConfigTape[];
    byId: Map<string, ConfigTape>;
    slots?: Map<string, number>;
  } | null = null;
  /**
   * Partial processing (memory). The previous compute's tapes stay in memory until the new simulation is done, and
   * the old and the new set side by side were each compute's peak (x01, 6 Oct: 13.9 GB, killed). During a compute
   * live acts only on the selected configs, the held positions' configs and the signal tapes (their acceptance), so
   * those are kept — compacted into one buffer, since a kept tape would otherwise hold its whole worker-reply arena —
   * plus the ranges a memory fallback carries over; the rest of the pool is released before the new tapes are built.
   */
  private async slimTapes(
    carryTags: ReadonlySet<string> = new Set(),
    gen = this.gen,
  ): Promise<void> {
    if (!this.tapes.length) return;
    const keep = new Set<string>(this.paper.selected ?? []);
    for (const p of this.paper.positions) keep.add(p.cfg);
    const kept = this.tapes.filter(
      (t) =>
        keep.has(t.id) || isSignalInd(t.ind) || (!!t.protect.tag && carryTags.has(t.protect.tag)),
    );
    if (kept.length === this.tapes.length) return;
    const released = this.tapes.length - kept.length;
    const full = this.tapes;
    // packed in slices (the live tick runs between them): in one piece the kept set — every signal tape among it —
    // held the loop for seconds at the start of every compute (x02, 7 Oct: loop max 3 s); the old set serves live
    // until the compact copy replaces it
    // compacted on this thread: the columns copied into one buffer, the metadata kept by reference (no JSON round
    // trip of every open position)
    let compact: ConfigTape[] = [];
    if (kept.length)
      try {
        compact = await this.drive("Slim", compactByCarryGen(kept), () => undefined, gen);
      } catch (err) {
        // memory pressure: the compaction is what frees memory — finished in one piece rather than aborted (an
        // aborted one kept the full set, and every next compute started under the same pressure); superseded: the
        // newer compute compacts
        if (gen !== this.gen) throw err;
        const g = compactByCarryGen(kept);
        for (let r = g.next(); ; r = g.next())
          if (r.done) {
            compact = r.value;
            break;
          }
      }
    this.tapes = compact;
    // the acceptance record stays the full set's (the simulation's), and is not rebuilt on the live tick
    carryGuardIndices(full, this.tapes);
    this.tapeIdx = null;
    this.status.tapesReleased = released;
  }
  /** The bar length of a config's lane (its indication's timeframe, else the base bars'), in ms — memoized. */
  private laneMsMemo = new Map<string, number>();
  private laneMs(cfg: string): number {
    let ms = this.laneMsMemo.get(cfg);
    if (ms === undefined) {
      ms = (laneOf(cfg.split("|")[1] ?? "").tf ?? this.settings.tfMin) * 60_000;
      if (this.laneMsMemo.size > 50_000) this.laneMsMemo.clear();
      this.laneMsMemo.set(cfg, ms);
    }
    return ms;
  }
  /** Tapes by config id (rebuilt when the tape list changes). */
  private tapeIndex(): Map<string, ConfigTape> {
    if (this.tapeIdx?.tapes !== this.tapes)
      this.tapeIdx = {
        tapes: this.tapes,
        byId: new Map(this.tapes.map((t) => [t.id, t])),
        slots: new Map(this.tapes.map((t, i) => [t.id, i])),
      };
    return this.tapeIdx.byId;
  }
  /** set by the live step: persists its in-memory state (called on shutdown) */
  flushLive?: () => void;
  /** stage sets of the last compute (self-audit) */
  stageSets: AuditInput["stages"] = undefined;
  /** The full universe of the last completed simulation, for research tools. */
  lastUniverse: ReturnType<typeof makeUniverse> | null = null;
  private baseDetail: {
    engine: ReturnType<typeof makeUniverse>["series"];
    signals: ReturnType<typeof makeUniverse>["series"];
    evaluationFromT?: number;
    cost: number;
    tactics: CoreSettings["tactics"];
    grid: CoreSettings["grid"];
  } | null = null;
  /**
   * Closed trades of one config computed on demand from its published Base snapshot (Base configs keep only their
   * stats; tapes exist for Main sets). Plain configs only (DCA / Axis come from tapes). Null if unknown.
   */
  comboTrades(id: string): Trade[] | null {
    const c = parseConfigId(id);
    if (!c || !isPlainKind(kindOfId(id))) return null;
    // Use the exact Base snapshot, not the wider engine history or subsequently edited settings.
    const detail = this.baseDetail;
    if (!detail) return null;
    const u = makeUniverse(isSignalInd(c.ind) ? detail.signals : detail.engine, detail.evaluationFromT);

    const g = detail.grid;
    const protect =
      c.protect.trail > 0 && !c.protect.trailOnly && !isSignalInd(c.ind)
        ? { ...c.protect, trailStep: g.trailStep ?? 1, trailFree: g.trailFree ?? false }
        : c.protect;
    const r = runCombo(
      u,
      c.bot,
      c.ind,
      protect,
      detail.cost,
      1,
      detail.tactics,
      true, // the id carries the lane's protect already
    );
    return r ? r.trades : null;
  }

  /** Recompute the published numbers from their inputs; failures go to the event log once per change. */
  runAudit(): AuditReport {
    return this.finishAudit(auditState(this.auditInput()));
  }

  /** The audit in time slices (the cycle): the live tick runs between them. */
  private async runAuditAsync(
    gen = this.gen,
    onFraction?: (f: number) => void,
  ): Promise<AuditReport> {
    return this.finishAudit(
      onFraction
        ? await this.driveSliced("Audit", auditStateGen(this.auditInput()), gen, onFraction)
        : await this.drive("Audit", auditStateGen(this.auditInput()), () => undefined, gen),
    );
  }

  private auditInput(): AuditInput {
    return {
      sim: this.sim,
      tapes: this.tapes,
      cost: this.settings.cost,
      base: { evaluated: this.status.baseEvaluated, passed: this.status.basePassed },
      stages: this.stageSets,
      // a snapshot: the sliced audit lets live ticks run between its slices, and a tick re-marks the open positions in
      // place (mtm, stopHit) — the audit would sum newer marks than the equity it compares them with
      paper: {
        ...this.paper,
        positions: this.paper.positions.map((p) => ({ ...p })),
        trades: [...this.paper.trades],
        sizing: {
          ...this.paperSizing(),
          balance: this.paperSizing().balance + (this.paper.carried ?? 0),
        },
        carried: this.paper.carried ?? 0,
      },
    };
  }

  private finishAudit(r: AuditReport): AuditReport {
    this.audit = r;
    const key = r.checks
      .filter((c) => !c.ok)
      .map((c) => c.name)
      .join("|");
    if (key !== this.lastAuditKey) {
      this.lastAuditKey = key;
      if (key)
        this.db.event(
          "error",
          `audit failed: ${r.checks
            .filter((c) => !c.ok)
            .map((c) => `${c.name} (${c.detail})`)
            .join("; ")}`,
        );
      else this.db.event("info", `audit ok: ${r.checks.length} checks`);
    }
    return r;
  }

  /** negative-hour hedge signals of the last compute (outside the ranked set) */
  private hedgeKeys = new Set<string>();
  /** the simulation's executed orders by exit, per hour and per signal source (coordination of new entries) */
  private coordCache: {
    sim: WalkForwardResult;
    closedBy: Trade[];
    hourNet: Map<number, number>;
    exitHourNet: Map<string, Map<number, number>>;
    srcClosed: Map<string, Array<{ exitT: number; r: number }>>;
    /**
     * the simulation's engine candidates (taken or not) per symbol × direction: entries ascending with the running
     * maximum exit — confirmation asks whether one was open at a signal's entry
     */
    engineIv: Map<string, { e: Float64Array; mx: Float64Array }>;
  } | null = null;
  private coordOf(sim: WalkForwardResult) {
    if (this.coordCache?.sim === sim) return this.coordCache;
    const continued = this.realtimeLearning?.sim === sim ? this.realtimeLearning.accepted : [];
    const closedBy = [...sim.trades, ...continued].sort((a, b) => a.exitT - b.exitT);
    const hourNet = new Map<number, number>();
    const exitHourNet = new Map<string, Map<number, number>>();
    const srcClosed = new Map<string, Array<{ exitT: number; r: number }>>();
    for (const x of closedBy) {
      const k = Math.floor(x.exitT / H);
      let hours = hourNet;
      if (isHistoricExitConfig(x.cfg, x.kind)) {
        hours = exitHourNet.get(x.cfg) ?? new Map<number, number>();
        exitHourNet.set(x.cfg, hours);
      }
      hours.set(k, (hours.get(k) ?? 0) + x.r * 100);
      if (sigCfg(x.cfg) && !isHistoricExitConfig(x.cfg, x.kind)) {
        const src = signalSourceOf(x.cfg.split("|")[1] ?? "");
        let l = srcClosed.get(src);
        if (!l) srcClosed.set(src, (l = []));
        l.push({ exitT: x.exitT, r: x.r });
      }
    }
    // the engine candidates of the run (the feed holds every candidate, executed or not, with its entry and exit)
    const iv = new Map<string, Array<[number, number]>>();
    for (const f of sim.feed ?? []) {
      if (f.entryT === undefined || !f.cfg || sigCfg(f.cfg) || isHistoricExitConfig(f.cfg, f.type)) continue;
      const k = `${f.sym}|${f.side > 0 ? 1 : -1}`;
      let l = iv.get(k);
      if (!l) iv.set(k, (l = []));
      l.push([f.entryT, f.exitT]);
    }
    const engineIv = new Map<string, { e: Float64Array; mx: Float64Array }>();
    for (const [k, l] of iv) {
      l.sort((a, b) => a[0] - b[0]);
      const e = new Float64Array(l.length);
      const mx = new Float64Array(l.length);
      let m = -Infinity;
      l.forEach(([en, ex], j) => {
        e[j] = en;
        mx[j] = m = Math.max(m, ex);
      });
      engineIv.set(k, { e, mx });
    }
    this.coordCache = { sim, closedBy, hourNet, exitHourNet, srcClosed, engineIv };
    return this.coordCache;
  }

  /**
   * Signal confirmation's pool for paper and the pending entries, as the simulation judges it (engine candidates taken
   * or not, open at the signal's entry): a candidate of the simulated run that entered at or before t and exited after
   * it, an engine tape position open now that entered at or before t (`openNow`: "sym|side" → earliest entry), or an
   * engine position of the paper book open at t.
   */
  private confirmPoolOf(
    engineIv: ReadonlyMap<string, { e: Float64Array; mx: Float64Array }>,
    openNowOf: () => ReadonlyMap<string, number>,
    positions: ReadonlyArray<{
      cfg: string;
      sym: string;
      side: number;
      entryT: number;
      stopHit?: number;
    }>,
  ): ConfirmPool {
    // built on the first signal that asks (the pending entries run every tick; most ticks have no signal entry)
    let openNow: ReadonlyMap<string, number> | null = null;
    return {
      confirms: (sym, side, t) => {
        const k = `${sym}|${side > 0 ? 1 : -1}`;
        if (((openNow ??= openNowOf()).get(k) ?? Infinity) <= t) return true;
        const g = engineIv.get(k);
        if (g) {
          // last entry at or before t: the running maximum exit says whether any of them was still open
          let lo = 0;
          let hi = g.e.length;
          while (lo < hi) {
            const m = (lo + hi) >> 1;
            if (g.e[m] <= t) lo = m + 1;
            else hi = m;
          }
          if (lo > 0 && g.mx[lo - 1] > t) return true;
        }
        return positions.some(
          (x) => x.sym === sym && x.side === side && x.entryT <= t && !x.stopHit && !sigCfg(x.cfg) && !isHistoricExitConfig(x.cfg),
        );
      },
    };
  }

  /** the engine tape positions open now per "sym|side" (earliest entry) of the given configs */
  private engineOpenNow(
    ids: Iterable<string>,
    byId: ReadonlyMap<string, ConfigTape>,
  ): Map<string, number> {
    const out = new Map<string, number>();
    for (const id of ids) {
      if (sigCfg(id) || isHistoricExitConfig(id)) continue;
      const tp = byId.get(id);
      if (!tp) continue;
      for (const op of tp.open) {
        const k = `${op.sym}|${op.side > 0 ? 1 : -1}`;
        if (op.entryT < (out.get(k) ?? Infinity)) out.set(k, op.entryT);
      }
    }
    return out;
  }

  /**
   * Why a new paper / live entry is held back by the rules the simulation applies before execution (null =
   * allowed): hour guard, coordination (confirmation / opposite entries / hour lock / cooldown), the
   * negative-hour hedge, Stable-02 symbol windows and the source stability gate. `open` = the positions of the
   * book; only those open at the entry (entered at or before it, stop not crossed) count. `confirmPool`: the engine
   * candidates confirmation judges (confirmPoolOf); without it, the book's engine positions.
   */
  private entryHeldBack(
    op: { cfg: string; sym: string; side: number; entryT: number },
    hourNet: ReadonlyMap<number, number>,
    open: ReadonlyArray<{
      cfg: string;
      sym: string;
      side: number;
      entryT: number;
      stopHit?: number;
    }>,
    srcClosed: ReadonlyMap<string, Array<{ exitT: number; r: number }>>,
    confirmPool?: ConfirmPool | null,
    /** entries that hold a crowd seat without a position (refused by the live validation after the simulation's rules) */
    crowdSeats?: ReadonlyArray<{ cfg: string; sym: string; side: number; entryT: number }>,
  ): string | null {
    const hk = Math.floor(op.entryT / H);
    if (this.wf.guardPct > 0 && (hourNet.get(hk) ?? 0) <= -this.wf.guardPct) return "hourGuard";
    // (coordination reads only the entry's own symbol: the whole book filtered per candidate was ~340 MB of garbage in
    // 5 min on x02, 8 Oct allocation profile)
    const at = open.filter((x) => x.sym === op.sym && x.entryT <= op.entryT && !x.stopHit);
    // entry crowding: at most entryCrowd[range] configs of a range on one symbol × side × entry time (as simulated)
    if (this.wf.entryCrowd) {
      const cap = crowdCapOf(this.wf, op.cfg);
      if (cap < Infinity) {
        const k = crowdKey(op.cfg, op.sym, op.side, op.entryT);
        let n = 0;
        for (const x of open)
          if (x.entryT === op.entryT && crowdKey(x.cfg, x.sym, x.side, x.entryT) === k) n++;
        if (crowdSeats)
          for (const x of crowdSeats)
            if (x.entryT === op.entryT && crowdKey(x.cfg, x.sym, x.side, x.entryT) === k) n++;
        if (n >= cap) return "crowd";
      }
    }
    // confirmation as in the simulation: an engine candidate (taken or not) open at the entry, not only a position
    const coordWhy = coordBlock(this.wf.coord, op, hourNet, at, confirmPool);
    // a hedge-only signal trades while the book is losing (this or the previous hour), without confirmation
    const hedging = this.isHedgeEntry(op);
    if (hedging) {
      const losing =
        (!this.wf.coord?.hedgePrevOnly && (hourNet.get(hk) ?? 0) < 0) ||
        (hourNet.get(hk - 1) ?? 0) < 0;
      if (!losing) return "hedgeIdle";
      if (coordWhy && coordWhy !== "confirm") return coordWhy;
    } else if (coordWhy) return coordWhy;
    // Stable-02 coordination: symbols the simulation ended holding back take no new entries. The paused keys are
    // sym|±1 (S2Coord): with coord.s2Side the entry's own symbol × direction is the key; off, the bare symbol
    // (as before)
    const s2End = this.wf.coord?.enabled
      ? (isHistoricExitConfig(op.cfg) ? this.sim?.exitS2?.[op.cfg] : this.sim?.s2) : undefined;
    const s2Key = this.wf.coord?.s2Side ? `${op.sym}|${op.side > 0 ? 1 : -1}` : op.sym;
    if (s2End?.paused.includes(s2Key)) return "s2Window";
    const sg = this.wf.signalSourceGate;
    if (sg?.enabled && sigCfg(op.cfg) && !isHistoricExitConfig(op.cfg)) {
      const src = signalSourceOf(op.cfg.split("|")[1] ?? "");
      if (sourceUnstable(srcClosed.get(src), op.entryT, sg)) return "sourceUnstable";
    }
    return null;
  }

  private isHedgeEntry(op: { cfg: string; sym: string; side: number }): boolean {
    return (
      sigCfg(op.cfg) && !isHistoricExitConfig(op.cfg) &&
      this.hedgeKeys.has(
        sigActiveKey(
          op.cfg.split("|")[0],
          op.cfg.split("|")[1] ?? "",
          op.sym,
          op.side,
          kindOfId(op.cfg),
          op.cfg,
        ),
      )
    );
  }

  /** Stable-02 adds volume to the current Block size but cannot exceed its configured stack ceiling. */
  private s2EntryVolume(blockVol: number, cfg: string): number {
    const factor = this.wf.coord?.enabled
      ? (isHistoricExitConfig(cfg) ? this.sim?.exitS2?.[cfg]?.factor : this.sim?.s2?.factor) : undefined;
    return factor && factor > 0
      ? Math.min(1 + factor, Math.max(1, blockStackCap(this.wf.block) / blockVol))
      : 1;
  }

  /** The paper step run to completion (tests). The cycle drives stepPaperGen so the live tick runs between slices. */
  private stepPaper() {
    const g = this.stepPaperGen();
    while (!g.next().done) {
      /* slices */
    }
  }

  /**
   * The paper step. `fast`: the realtime entry step (fastStep) — the seats of the last full step, every held position
   * kept as it is, and new entries only from `fast.opens` (the seated configs' tape positions on the current bars),
   * through the same entry rules; the full step (after each compute) re-seats and closes.
   */
  private *stepPaperGen(fast?: {
    opens: ReadonlyMap<string, readonly OpenPosition[]>;
    t: number;
    /** Current incremental tapes also reconcile held exits, instead of waiting for another research run. */
    refreshHeld?: boolean;
  }, reuseSeats = false): Generator<number, void> {
    if (!this.tapes.length || !this.sim) return;
    if (fast && !this.lastSelection) return;
    // sub-timings (the Paper phase is one synchronous slice: its slowest part is named in the phase record)
    const tp0 = performance.now();
    const nowT = Math.floor(Date.now() / H) * H;
    const t = fast ? fast.t : Math.min(nowT, this.sim.endT);
    // Selection uses hour boundaries, but a completed market snapshot can contain later closed bars in that hour.
    // Keep the close cutoff on the actual snapshot clock (or incremental clock), not the earlier selection clock.
    const closeT = fast ? fast.t : this.sim.endT;
    // A long market compute may finish hours after its candle snapshot. Keep selection and replay on the
    // snapshot's causal clock, but judge *new* live-market paper entries against the current step too. Otherwise
    // an old tape position can be adopted as fresh and passed toward Live after a delayed startup or recompute.
    // Historical replays and synthetic fixtures intentionally use their own simulated clock.
    const freshnessT = () => this.market === "bingx" && !this.replay
      ? Math.max(t, Math.floor(Date.now() / H) * H) : t;
    const held = new Set(this.sim.steps[this.sim.steps.length - 1]?.real ?? []);
    // Each Signal protection config needs its own active symbol/direction evidence before taking a paper seat.
    // Held configs are kept separately below to manage their existing exits only.
    const selectedTapes = fast
      ? this.paper.selected.flatMap((id) => {
          const tp = this.tapeIndex().get(id);
          return tp ? [tp] : [];
        })
      : this.tapes;
    const { engine: engineTapes, signal: signalCandidates } = splitSignalTapes(selectedTapes, this.wf);
    const signalActive = this.wf.signalActive;
    const sigTapes = yield* signalSeatTapesGen(signalCandidates, signalActive, !!fast);
    // wf.seatSet "validated": the step selects from the validated set V of the last simulation (its ids), never from the
    // pool; V is refreshed only by the next compute's Base + set evaluation
    let selTapes = engineTapes;
    let wfSel = this.wf;
    if (!fast && this.wf.seatSet === "validated") {
      assertSeatSet(this.wf);
      let vc = this.validatedCache;
      if (!vc || vc.sim !== this.sim || vc.tapes !== engineTapes) {
        const v = this.sim.validated ? new Set(this.sim.validated) : yield* validatedSetGen(engineTapes, t, this.wf);
        vc = this.validatedCache = { sim: this.sim, tapes: engineTapes, v, list: validatedTapes(engineTapes, v, this.wf) };
      }
      selTapes = vc.list;
      wfSel = { ...this.wf, validated: vc.v };
    }
    // (slices between the opening passes over every tape: together they were one 0.5 s step at 21 symbols)
    yield 0;
    // per-range selection modes (wf.rangeOpts[tag].mode), as the simulation selects; null = one selection
    const reuse = !fast && reuseSeats && !!this.lastSelection;
    const groups = fast || reuse ? null : modeGroups(selTapes, wfSel);
    // Fixed selection already evaluates each eligible engine tape. Capture its bounded aggregate at this step,
    // without retaining every check or changing the separate Signal or execution samples.
    const captureValidation = !fast && !reuse && (groups ? groups.every((g) => g.mode === "fixed") : wfSel.mode === "fixed");
    if (captureValidation) wfSel = { ...wfSel, recordValidation: "summary" };
    const selection = fast || reuse
      ? this.lastSelection!
      : withProbe(
          groups
            ? yield* selectGroupsGen(groups, t, wfSel, held)
            : wfSel.mode === "durable"
              ? selectDurable(selTapes, t, wfSel, held)
              : wfSel.mode === "fixed"
                ? yield* selectFixedGen(selTapes, t, wfSel)
                : selectAt(selTapes, t, wfSel),
          selTapes,
          t,
          wfSel,
        );
    const { picks, eligible } = selection;
    const postBaseValidation = captureValidation
      ? validationProgressOf((selection as { validationSummary?: ValidationSummary }).validationSummary, t) : null;
    if (!fast && !reuse) {
      this.lastSelection = { picks, eligible };
      this.lastSelectionAt = t;
    }
    const tSelect = performance.now() - tp0;
    const sel = new Set([...picks.map((p) => p.id), ...sigTapes.map((tp) => tp.id)]);
    // sets that still hold an open position stay processed until that position is closed (even when no longer
    // selected): their tape carries the open position forward until its exit
    const holding = new Set(this.paper.positions.map((p) => p.cfg));
    // (tape lookup by id: a scan of every tape per held set was O(held × tapes) — seconds at 70 symbols)
    yield 0;
    const byId = this.tapeIndex();
    yield 0;
    const keep = new Set<string>(sel);
    for (const id of holding) {
      const tp = byId.get(id);
      if (tp && tp.open.some((o) => o.cfg === id)) keep.add(id);
    }
    const positions: Array<
      OpenPosition & {
        vol: number;
        level: number;
        stopHit?: number;
        hitPx?: number;
        legs?: Partial<Record<string, number>>;
        heldAt?: number;
        heldPx?: number;
      }
    > = [];
    const saved =
      this.db.kvGet<Record<string, { at: number; stop: number; px?: number }>>("stopHits") ?? {};
    const stopHits: Record<string, number> = {};
    const stopHitsStop: Record<string, number> = {};
    const stopHitsPx: Record<string, number | undefined> = {};
    for (const [k, v] of Object.entries(saved)) {
      stopHits[k] = v.at;
      stopHitsStop[k] = v.stop;
      stopHitsPx[k] = v.px;
    }
    const perSym = new Map<string, number>();
    const perSide = new Map<string, number>();
    const openBy = new Map<string, number>();
    // open POSITIONS (symbol × direction) per class: the engine's and the signals' are capped apart
    const openPos = new Set<string>();
    // held positions first (they are never pushed out by a cap), then new entries by the Real-stage rules
    const prevByKey = new Map(this.paper.positions.map((p) => [posId(p), p]));
    const cands: Array<{ tp: ConfigTape; op: OpenPosition; held: boolean }> = [];
    let stale = 0;
    // every tape position the step does not open, by reason (status.paperSkips: none of them is dropped silently)
    const pSkips: Record<string, number> = {};
    const pSkip = (why: string) => {
      pSkips[why] = (pSkips[why] ?? 0) + 1;
    };
    // an entry made before this step's time is judged on the seats of its own step (the simulation's, as it took it):
    // the seats at t were picked on closes that came after that entry (bug hunt, 13 Oct: paper and live opened
    // positions the simulation never executed and skipped ones it did)
    const stepMs = Math.max(1, this.wf.stepH) * H;
    const seatsAt = stepSeats(this.sim.steps);
    if (fast) {
      // the realtime entry step: every held position stays (closes are the full step's); new entries are the seated
      // configs' tape positions on the current bars, entered since the step's window — on the same seat rule as the
      // full step (an entry of an earlier step on that step's seats; 13 Oct: judged on the seats at t alone, the
      // realtime step took entries the full step had refused)
      for (const p of this.paper.positions) {
        const tp = byId.get(p.cfg);
        if (!tp) continue;
        const refreshed = fast.refreshHeld ? fast.opens.get(p.cfg) : undefined;
        if (refreshed) {
          const op = refreshed.find((o) => posId(o) === posId(p));
          if (op) cands.push({ tp, op, held: true });
        } else cands.push({ tp, op: p, held: true });
      }
      for (const [id, ops] of fast.opens) {
        const tp = byId.get(id);
        if (!tp || !sel.has(id)) continue;
        const isSig = isSignalInd(tp.ind);
        for (const op of ops) {
          if (prevByKey.has(posId(op))) continue;
          if (!isSig && !seatedForEntry(tp.id, op.entryT, t, this.wf.stepH, seatsAt, sel)) {
            pSkip("notSelected");
            continue;
          }
          if (!freshEntry(op.entryT, freshnessT(), this.wf.stepH)) {
            stale++;
            pSkip("stale");
            continue;
          }
          cands.push({ tp, op, held: false });
        }
      }
    }
    // (the configs seated at the steps inside this step's entry window are visited too: dropped at t, their entries
    // of that window still stand as the simulation took them)
    const visit = new Set(keep);
    if (!fast)
      for (const st of this.sim.steps)
        if (st.t >= t - stepMs && st.t < t) for (const id of st.real) visit.add(id);
    for (const id of fast ? [] : visit) {
      const tp = byId.get(id);
      if (!tp) continue;
      const isSig = isSignalInd(tp.ind);
      for (const op of tp.open) {
        // held = this exact position was already in the paper book; a set that is no longer selected keeps
        // only those (its other tape positions were never taken and must not bypass the caps)
        const held = prevByKey.has(posId(op));
        if (!held && !isSig && !seatedForEntry(tp.id, op.entryT, t, this.wf.stepH, seatsAt, sel)) {
          pSkip("notSelected");
          continue;
        }
        // a new entry only from the current step, as the simulation takes them (an older tape position is left
        // to its tape: adopting it opened Wide's 8–24 h holds late, at today's price)
        if (!held && !freshEntry(op.entryT, freshnessT(), this.wf.stepH)) {
          stale++;
          pSkip("stale");
          continue;
        }
        cands.push({ tp, op, held });
      }
    }
    yield 0;
    // held first, then entry time, then best first (as in the simulation)
    const prio = bestFirst(picks, this.wf);
    cands.sort(
      (a, b) =>
        Number(b.held) - Number(a.held) ||
        a.op.entryT - b.op.entryT ||
        prio(a.tp, a.op.sym, a.op.side) - prio(b.tp, b.op.sym, b.op.side) ||
        (a.op.cfg < b.op.cfg ? -1 : a.op.cfg > b.op.cfg ? 1 : 0) ||
        (a.op.sym < b.op.sym ? -1 : a.op.sym > b.op.sym ? 1 : 0),
    );
    const since = this.paper.startedAt - this.wf.simH * H;
    const validClose = (x: Trade) => (x.side === 1 || x.side === -1) &&
      typeof x.cfg === "string" && typeof x.sym === "string" && Number.isFinite(x.entryT) && Number.isFinite(x.exitT) &&
      x.exitT >= x.entryT && x.exitT <= closeT && Number.isFinite(x.r) &&
      Number.isFinite(x.entry) && x.entry > 0 && Number.isFinite(x.exit) && x.exit > 0 && !x.markedOpen;
    let trades = (fast ? this.paper.trades : this.sim.trades).filter((x) => x.exitT >= since && x.exitT <= closeT);
    const inSim = new Set(trades.map(orderKey));
    const heldTradeIndices = new Map<string, number[]>();
    for (let i = 0; i < trades.length; i++) {
      const k = orderKey(trades[i]);
      if (!prevByKey.has(k)) continue;
      const indices = heldTradeIndices.get(k) ?? [];
      indices.push(i);
      heldTradeIndices.set(k, indices);
    }
    const excludeHeldCloses = new Set<string>();
    const heldCloses = new Map<string, Trade>();
    const samePrice = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    // One causal, unambiguous close of the exact held config × symbol × side × entry. Retain the position's own
    // entry-time multiplier and attribution, not a newer simulation's potentially different sizing policy.
    const heldCloseOf = (p: PaperBook["positions"][number]): Trade | undefined => {
      const indices = heldTradeIndices.get(orderKey(p)) ?? [];
      if (indices.length > 1) return undefined;
      const simulated = indices.length === 1 ? trades[indices[0]] : undefined;
      if (simulated && (!validClose(simulated) || simulated.cfg !== p.cfg || simulated.sym !== p.sym ||
        simulated.side !== p.side || simulated.entryT !== p.entryT)) return undefined;
      const tp = byId.get(p.cfg);
      let exact: Trade | undefined;
      for (let i = tp ? lowerBound(tp.exitT, p.entryT) : 0; tp && i < tp.n; i++) {
        if (tp.exitT[i] > closeT) break;
        if (tp.entryT[i] !== p.entryT || tp.syms[tp.symI[i]] !== p.sym || tp.side[i] !== (p.side > 0 ? 1 : -1)) continue;
        const row = tradeAt(tp, i);
        // A malformed row for this exact entry is conflicting evidence, not a reason to cherry-pick another row.
        if (!validClose(row)) return undefined;
        if (exact) return undefined;
        exact = row;
      }
      const simMult = simulated?.mult;
      const simUnit = simulated ? unitReturn(simulated) : NaN;
      if (simulated && typeof simMult === "number" && Number.isFinite(simMult) && simMult > 0 &&
        Number.isFinite(simUnit) && Math.abs(simUnit - simulated.r / simMult) > 1e-10 * Math.max(1, Math.abs(simUnit)))
        return undefined;
      if (exact && simulated && (exact.exitT !== simulated.exitT || !samePrice(exact.entry, simulated.entry) ||
        !samePrice(exact.exit, simulated.exit) || exact.reason !== simulated.reason ||
        (Number.isFinite(simUnit) && Math.abs(exact.r - simUnit) > 1e-10 * Math.max(1, Math.abs(exact.r))))) return undefined;
      if (!exact && simulated && typeof simMult === "number" && Number.isFinite(simMult) && simMult > 0 &&
        Number.isFinite(simulated.vol) && simulated.vol! > 0)
        exact = { ...simulated, r: simulated.r / simMult, vol: simulated.vol! / simMult };
      if (!exact) return undefined;
      const v = positionMult(p);
      if (!(Number.isFinite(v) && v > 0)) return undefined;
      const { blockVol: _bv, coordVol: _c, relateVol: _r, relateMeasured: _rm, relateBase: _rb, relateParts: _rp,
        volFactor: _vf, hedgeVol: _hv, rangeVol: _rv, legs: _l, blockAttribution: _ba,
        blockLevels: _bl, blockEffectiveLevels: _be, blockSampleCounts: _bc, ...source } = exact;
      return { ...source, r: exact.r * v, vol: (exact.vol ?? 1) * v, mult: v,
        ...(p.blockVol !== undefined ? { blockVol: p.blockVol } : {}),
        ...(p.coordVol !== undefined ? { coordVol: p.coordVol } : {}),
        ...(p.relateVol !== undefined ? { relateVol: p.relateVol } : {}),
        ...(p.relateMeasured ? { relateMeasured: true } : {}),
        ...(p.relateBase !== undefined ? { relateBase: p.relateBase } : {}),
        ...(p.relateParts ? { relateParts: p.relateParts } : {}),
        ...(p.volFactor !== undefined ? { volFactor: p.volFactor } : {}),
        ...(p.hedgeVol !== undefined ? { hedgeVol: p.hedgeVol } : {}),
        ...(p.rangeVol !== undefined ? { rangeVol: p.rangeVol } : {}),
        ...(p.legs ? { legs: p.legs } : {}),
        ...(p.blockAttribution ? { blockAttribution: p.blockAttribution } : {}),
        ...(p.blockLevels ? { blockLevels: p.blockLevels } : {}),
        ...(p.blockEffectiveLevels ? { blockEffectiveLevels: p.blockEffectiveLevels } : {}),
        ...(p.blockSampleCounts ? { blockSampleCounts: p.blockSampleCounts } : {}) };
    };
    // A held entry omitted by a rebuilt tape still owns exposure until its exact close is reconciled below. Reserve
    // it before evaluating any new candidates, including caps, crowd and coordination. Proven closes release that
    // capacity only for entries at or after their own exit time; unknown/future closes keep it reserved.
    const representedHeld = new Set(cands.filter((x) => x.held).map(({ op }) => orderKey(op)));
    const provisionalHeld = new Set<string>();
    for (const p of prevByKey.values()) {
      const k = orderKey(p);
      if (representedHeld.has(k)) continue;
      provisionalHeld.add(k);
      positions.push({ ...p, vol: p.vol ?? 1, level: p.level ?? 0 });
      const cls = orderCapScope(p.cfg);
      perSym.set(`${cls}|${p.sym}`, (perSym.get(`${cls}|${p.sym}`) ?? 0) + 1);
      perSide.set(`${cls}|${p.side}`, (perSide.get(`${cls}|${p.side}`) ?? 0) + 1);
      openBy.set(cls, (openBy.get(cls) ?? 0) + 1);
      openPos.add(`${cls}|${p.sym}|${p.side}`);
    }
    const releases = [...provisionalHeld].flatMap((key) => {
      const p = prevByKey.get(key)!;
      const close = heldCloseOf(p);
      return close ? [{ key, p, at: close.exitT }] : [];
    }).sort((a, b) => a.at - b.at);
    yield 0;
    // Block sources (overall / symbol / direction / indication) judge executed positions closed before each entry
    const booksAt = fast
      ? this.realtimeBooksAt(cands.find((c) => !c.held)?.op.entryT ?? t)
      : this.booksAt();
    // the books up to the first new entry, a slice at a time: the entries' lookups below then only add what closed
    // since (the first lookup replayed the whole run's feed in one block)
    const firstNew = cands.find((c) => !c.held)?.op.entryT;
    if (firstNew !== undefined) while (!booksAt.advance(firstNew, BOOK_FEED_SLICE)) yield 0;
    // hour guard and coordination on new entries, as in the simulation: realized Σ trade % per clock hour of the
    // executed orders closed before the entry, and the positions open at it
    const { closedBy, srcClosed, engineIv } = this.coordOf(this.sim);
    // signal confirmation's pool: the run's engine candidates, the engine tape positions open now of the selected /
    // held engine configs, and the book's engine positions (as the simulation: taken or not)
    const confirmPool = this.confirmPoolOf(
      engineIv,
      () => this.engineOpenNow(keep, byId),
      positions,
    );
    yield 0;
    const hourNet = new Map<number, number>();
    const exitHourNet = new Map<string, Map<number, number>>();
    let ci = 0;
    const tCands = performance.now() - tp0 - tSelect;
    // live validation: each config on its own last N closes since the desk went live (new entries only)
    const lvN = this.settings.live.liveLastN ?? 0;
    const lvMinPf = this.settings.live.liveMinPf ?? this.settings.gates.minPf;
    const lvSince = this.liveSince();
    const lvNow = Date.now();
    const lvMemo = new Map<string, LiveGate>();
    // Paper keeps learning. Its deactivation record is the settled AFTER-Base execution simulation, never the
    // independent raw candidate tape. Strict funded proof is checked separately at native live admission.
    // Forward deactivation must follow the exact config, symbol and direction even when legacy pooled proof is selected.
    const lvBySide = true;
    // Both independent sides are included in the diagnostic count, including insufficient ones.
    const lvSides = lvBySide ? LV_SIDES_APART : LV_SIDES_POOLED;
    const lvModel = this.modeledGateRecords(lvBySide) ?? new Map<string, LiveRecord>();
    const lvExact = this.modeledExecutionRecords()?.records ?? new Map<string, LiveRecord>();
    // judged as of `at`: a paper entry as of its entry time (the closes after it are not known when it enters — with
    // now, up to a step of later closes decided it), the entries planner as of now
    const lvOf = (x: ConfigTape, at = lvNow, side?: 1 | -1, sym?: string, cache = true): LiveGate => {
      // Missing identity provenance cannot borrow another symbol or side's record.
      if (side === undefined || !sym?.trim()) return { ok: false, n: 0, pf: null, unknown: 1 };
      const mk = JSON.stringify([x.id, sym, side, at]);
      let g = cache ? lvMemo.get(mk) : undefined;
      // A Live floor can tighten the matching stage floor, never relax it.
      const minPf = liveMinPfOf(this.settings, x.protect.tag, x.ind, x.kind);
      if (!g) {
        const model = lvExact.get(executionRecordKey(x.id, sym, side));
        g = {
          ...(model ? liveGate(model, lvSince, at, lvN, minPf) : { ok: true, n: 0, pf: null }),
          source: "post-base-accepted",
        };
        if (cache) lvMemo.set(mk, g);
      }
      return g;
    };
    // Optional pooled group summaries are diagnostic only; they never decide another config's admission.
    const lvGroupN = lvN > 0 ? (this.settings.live.liveGroupLastN ?? 0) : 0;
    // Groups retain their range floor too, including independent Signal Coordination ranges.
    const lvGroupMin = (g: string) => {
      const prefix = "Signals Coordination · ";
      const label = g.startsWith(prefix) ? g.slice(prefix.length) : g;
      const tag = RANGE_TAGS.find((t) => RANGE_LABEL[t] === label);
      return liveMinPfOf(this.settings, tag);
    };
    // the group gates as of a time (each distinct entry time of the step once)
    const lvGroupsAt = new Map<number, Map<string, LiveGate>>();
    const groupsAt = (at: number) => {
      let m = lvGroupsAt.get(at);
      if (m) return m;
      m = new Map<string, LiveGate>();
      lvGroupsAt.set(at, m);
      if (!(lvGroupN > 0)) return m;
      // live.sideGates: each side's group gate on its own closes, keyed group|side (liveGroupKeyOf)
      for (const s of lvSides) {
        const simG = liveGroupGates(
          (function* () {
            for (const id of sel) {
              const x = lvModel.get(recordKeyOf(id, s));
              if (x) yield x;
            }
          })(),
          lvSince,
          at,
          lvGroupN,
          lvGroupMin,
        );
        for (const [group, gate] of simG) m.set(liveGroupKeyOf(group, s), { ...gate, source: "post-base-accepted" });
      }
      return m;
    };
    const lvGroups = groupsAt(lvNow);
    if (lvGroupN > 0) yield 0;
    // The entries planner checks the entry's own config, symbol and side.
    this.liveEntryGate =
      lvN > 0
        ? (tp, s, sym) => {
            const side = lvSideOfEntry(lvBySide, s);
            return liveEntryOk(lvOf(tp, lvNow, side, sym));
          }
        : null;
    let lvSkipped = 0;
    let slice = 0;
    // Only retries of an identical config and open event deduplicate; sibling sources and strategy cells stay separate.
    const openKeys = new Set<string>();
    for (const { op, held } of cands) if (held) openKeys.add(openDupKey(op));
    for (const p of positions) if (provisionalHeld.has(orderKey(p))) openKeys.add(openDupKey(p));
    let releaseIndex = 0;
    const releaseDue = (at: number) => {
      const due: Array<(typeof releases)[number]> = [];
      while (releaseIndex < releases.length && releases[releaseIndex].at <= at) due.push(releases[releaseIndex++]);
      if (!due.length) return;
      const keys = new Set(due.map((x) => x.key));
      let write = 0;
      for (const p of positions) if (!keys.has(orderKey(p))) positions[write++] = p;
      positions.length = write;
      for (const { p } of due) {
        const cls = orderCapScope(p.cfg);
        const sym = `${cls}|${p.sym}`, side = `${cls}|${p.side}`, pos = `${cls}|${p.sym}|${p.side}`;
        perSym.set(sym, (perSym.get(sym) ?? 1) - 1);
        perSide.set(side, (perSide.get(side) ?? 1) - 1);
        openBy.set(cls, (openBy.get(cls) ?? 1) - 1);
        if (!positions.some((x) => `${orderCapScope(x.cfg)}|${x.sym}|${x.side}` === pos)) openPos.delete(pos);
        openKeys.delete(openDupKey(p));
      }
    };
    // A legacy hit key has no side. Never copy that ambiguous hit to both sides of an otherwise identical entry.
    const legacySides = new Map<string, number>();
    for (const p of [...prevByKey.values(), ...cands.map(({ op }) => op)]) {
      const key = posIdLegacy(p);
      legacySides.set(key, (legacySides.get(key) ?? 0) | (p.side > 0 ? 1 : 2));
    }
    const ambiguousLegacyHits = [...legacySides].filter(([key, mask]) => mask === 3 && stopHits[key]);
    if (ambiguousLegacyHits.length)
      this.db.event("warn", `paper: ${ambiguousLegacyHits.length} legacy stop hit(s) have ambiguous sides; exact hits are kept independent`);
    const crowdSeats: OpenPosition[] = [];
    for (const { tp, op, held } of cands) {
      if (++slice % 32 === 0) yield slice;
      if (!held) releaseDue(op.entryT);
      // Candidate collection, sorting and book preparation are also sliced. A position can age out while they run.
      if (!held && !freshEntry(op.entryT, freshnessT(), this.wf.stepH)) {
        stale++;
        pSkip("stale");
        continue;
      }
      if (!held && openKeys.has(openDupKey(op))) {
        pSkip("duplicate");
        continue;
      }
      if (!held) {
        while (ci < closedBy.length && closedBy[ci].exitT <= op.entryT) {
          const x = closedBy[ci++];
          const k = Math.floor(x.exitT / H);
          let hours = hourNet;
          if (isHistoricExitConfig(x.cfg, x.kind)) {
            hours = exitHourNet.get(x.cfg) ?? new Map<number, number>();
            exitHourNet.set(x.cfg, hours);
          }
          hours.set(k, (hours.get(k) ?? 0) + x.r * 100);
        }
        const back = this.entryHeldBack(
          { cfg: op.cfg, sym: op.sym, side: op.side, entryT: op.entryT },
          isHistoricExitConfig(op.cfg) ? (exitHourNet.get(op.cfg) ?? new Map()) : hourNet,
          positions,
          srcClosed,
          confirmPool,
          crowdSeats,
        );
        if (back) {
          pSkip(`${sigCfg(op.cfg) ? "sig:" : ""}heldBack:${back}`);
          continue;
        }
        // The entry's own side; missing side provenance cannot qualify.
        const lvSide = lvSideOfEntry(lvBySide, op.side);
        // the live validation after the simulation's own rules: a config it pauses keeps the crowd seat the
        // simulation gave it (judged first, its seat went to a config the simulation had crowded out)
        if (
          lvN > 0 &&
          !liveEntryOk(lvOf(tp, op.entryT, lvSide, op.sym))
        ) {
          lvSkipped++;
          pSkip("liveValidation");
          crowdSeats.push(op);
          continue;
        }
      }
      // a held position continues regardless of the entry rules (they decided at its entry) and keeps its execution
      // multiple (its volume without the ladder weight: an Axis ladder that filled another rung since grows)
      const prev = prevByKey.get(posId(op));
      // what the tick advanced since this tape's data end (a trailing stop never moves back)
      const tr = carryTrail(op, prev);
      const stopNow = tr.stop ?? op.stop;
      const d = held
        ? ({
            ok: true,
            vol: prev ? positionMult(prev) : 1,
            level: prev?.level ?? 0,
            relateVol: prev?.relateVol ?? 1,
            relateParts: prev?.relateParts,
            legs: prev?.legs,
            blockAttribution: prev?.blockAttribution,
            blockLevels: prev?.blockLevels,
            blockEffectiveLevels: prev?.blockEffectiveLevels,
            blockSampleCounts: prev?.blockSampleCounts,
          } as const)
        : execDecision(tp, op.entryT, this.wf, {
            ...booksAt(op.entryT),
            sym: op.sym,
            side: op.side,
            relateBase: () => 1,
          });
      // Exit keeps its own cap counts, while inheriting the configured caps of its source class.
      const cls = orderCapScope(op.cfg);
      const signalClass = sigCfg(op.cfg);
      const pre = isHistoricExitConfig(op.cfg) ? "exit:" : signalClass ? "sig:" : "";
      const caps = capsOf(this.wf, signalClass);
      const c = perSym.get(`${cls}|${op.sym}`) ?? 0;
      const sd = perSide.get(`${cls}|${op.side}`) ?? 0;
      const posKey = `${op.sym}|${op.side}`;
      const capWhy = held
        ? null
        : c >= caps.perSymbol
          ? "perSymbol"
          : sd >= caps.perSide
            ? "perSide"
            : (openBy.get(cls) ?? 0) >= caps.maxOpen
              ? "maxOpen"
              : (() => {
                    const cap = signalClass ? this.wf.signalMaxPositions : this.wf.maxPositions;
                    if (!cap || cap <= 0 || openPos.has(`${cls}|${posKey}`)) return false;
                    // signals: the cap counts each direction apart (long and short run independently); engine: both
                    const sideOf = (k: string) => k.slice(k.lastIndexOf("|") + 1);
                    const mySide = String(op.side);
                    let n = 0;
                    for (const k of openPos)
                      if (k.startsWith(`${cls}|`) && (!signalClass || sideOf(k) === mySide)) n++;
                    return n >= cap;
                  })()
                ? "maxPositions"
                : null;
      if (!d.ok) {
        if (!held && !capWhy && d.why === "relateActive" && this.wf.relate?.enabled) {
          const base = d.relateBase;
          if (base === undefined || !Number.isFinite(base) || !(base > 0)) {
            pSkip(`${pre}exec:relateVolumeUnknown`);
            continue;
          }
          const cap = relateExternalStackCap(this.wf.relate.maxStack, tp.kind, tp.protect);
          this.relateShadowPending.set(orderKey(op), {
            entryT: op.entryT,
            base: Math.min(base, cap),
            parts: capRelateParts(d.relateParts ?? {}, Math.min(1, cap), cap, 1),
          });
        }
        pSkip(`${pre}exec:${d.why}`);
        continue;
      }
      if (!held) this.relateShadowPending.delete(orderKey(op));
      if (capWhy) {
        pSkip(`${pre}cap:${capWhy}`);
        continue;
      }
      openPos.add(`${cls}|${posKey}`);
      perSym.set(`${cls}|${op.sym}`, c + 1);
      perSide.set(`${cls}|${op.side}`, sd + 1);
      openBy.set(cls, (openBy.get(cls) ?? 0) + 1);
      // new entries take the relation volume the simulation ended with (within the Block maximum)
      const vf = held ? 1 : volumeFactorForStrategy(tp, this.wf);
      const positionVf = held ? (prev?.volFactor ?? 1) : vf;
      const cv = !held ? this.s2EntryVolume(d.vol, op.cfg) : 1;
      const hedge = !held && this.isHedgeEntry(op);
      const appliedHedgeVol = hedge ? (this.wf.coord?.hedgeVolumeFactor ?? 1) : 1;
      const recordedHedgeVol = held ? (prev?.hedgeVol ?? 1) : appliedHedgeVol;
      const coordVol = held ? (prev?.coordVol ?? 1) : cv;
      // The configured range factor is captured only on entry; a settings edit cannot resize a held position.
      const rangeVol = held
        ? 1
        : rangeVolumeFactorFor(tp, this.wf);
      const recordedRangeVol = held ? (prev?.rangeVol ?? 1) : rangeVol;
      const baseExternalMult = d.vol * cv * vf * appliedHedgeVol * rangeVol;
      const relationCap = relateExternalStackCap(this.wf.relate?.maxStack ?? MAX_EXTERNAL_STACK, tp.kind, tp.protect);
      const combined = !held
        ? combineRelateStack(baseExternalMult, this.wf.relate?.enabled ? (d.relateVol ?? 1) : 1, relationCap)
        : { volume: baseExternalMult, relation: 1 };
      const relateVol = this.wf.relate?.enabled ? combined.relation : 1;
      const recordedRelateVol = held ? (prev?.relateVol ?? 1) : relateVol;
      const recordedRelateMeasured = held ? prev?.relateMeasured === true : this.wf.relate?.enabled === true;
      const recordedRelateBase = held
        ? prev?.relateBase
        : this.wf.relate?.enabled ? 1 : undefined;
      const recordedRelateParts = held
        ? prev?.relateParts
        : this.wf.relate?.enabled
          ? capRelateParts(d.relateParts ?? {}, relateVol, relationCap, 1)
          : undefined;
      openKeys.add(openDupKey(op));
      // the price at adoption, set once (a position held from before keeps its own, or none)
      const heldPx = prev ? prev.heldPx : this.heldPxOf(op.sym);
      positions.push({
        ...op,
        // when the book first held it (kept across steps): adopted now, or as it was
        heldAt: prevByKey.get(posId(op))?.heldAt ?? Date.now(),
        ...(heldPx ? { heldPx } : {}),
        // execution multiple × ladder weight (Axis: every filled rung is volume, as the simulation books it); the
        // live lane asks for this volume, and paper marks mtm (per unit) × it
        vol: positionVolume(combined.volume, op),
        blockVol: held ? prev?.blockVol ?? 1 : d.vol,
        ...(positionVf !== 1 ? { volFactor: positionVf } : {}),
        ...(coordVol !== 1 ? { coordVol } : {}),
        ...(recordedHedgeVol !== 1 ? { hedgeVol: recordedHedgeVol } : {}),
        ...(recordedRangeVol !== 1 ? { rangeVol: recordedRangeVol } : {}),
        ...(recordedRelateVol !== 1 ? { relateVol: recordedRelateVol } : {}),
        ...(recordedRelateMeasured ? { relateMeasured: true } : {}),
        ...(recordedRelateBase !== undefined ? { relateBase: recordedRelateBase } : {}),
        ...(recordedRelateParts && Object.keys(recordedRelateParts).length ? { relateParts: recordedRelateParts } : {}),
        level: d.level,
        ...(d.legs ? { legs: d.legs } : {}),
        ...(d.blockAttribution ? { blockAttribution: d.blockAttribution } : {}),
        ...(d.blockLevels
          ? {
              blockLevels: d.blockLevels,
              blockEffectiveLevels: d.blockEffectiveLevels,
              blockSampleCounts: d.blockSampleCounts,
            }
          : {}),
        ...tr,
        // a stop crossed at tick time stays crossed until the bar-closed exit replaces the position — only while
        // the stop is the same one (a recompute can move it), and across a restart (persisted)
        ...(() => {
          const id = posId(op);
          const lid = posIdLegacy(op);
          const fromPrev = !!prev?.stopHit && prev.stop === stopNow;
          const own = stopHitsStop[id] === stopNow;
          const legacy = legacySides.get(lid) !== 3 && stopHitsStop[lid] === stopNow;
          const hit = fromPrev
            ? prev!.stopHit
            : own
              ? stopHits[id]
              : legacy
                ? stopHits[lid]
                : undefined;
          // the price the stop was crossed at travels with the hit (the live exit is priced from it)
          const hitPx = fromPrev ? prev!.hitPx : own ? stopHitsPx[id] : stopHitsPx[lid];
          return hit ? { stopHit: hit, ...(hitPx ? { hitPx } : {}) } : {};
        })(),
      });
    }
    // Provisional orders have reserved capacity. Remove their temporary copies now so the exact close check decides
    // whether each should be carried or settled; never remove any other position that joined during the step.
    if (provisionalHeld.size) {
      let write = 0;
      for (const p of positions) if (!provisionalHeld.has(orderKey(p))) positions[write++] = p;
      positions.length = write;
    }
    // (the blocks below yield between them: in one piece they were the realtime step's ~0.4 s final slice)
    yield 0;
    yield 0;
    // a position held from before (entered under earlier settings) that closed on its tape although the current
    // re-simulation no longer takes it (a gate added since): its close is still recorded, at its volume — it left
    // the book without one before (x01: no paper close for 20 min after a gate change, 366 positions open)
    const openNow = new Set(positions.map(orderKey));
    let scanned = 0;
    for (const p of prevByKey.values()) {
      if (++scanned % 256 === 0) yield scanned;
      const k = orderKey(p);
      // (also a position entered before the window: its close is not in sim.trades and no row holds it yet)
      if (openNow.has(k)) {
        // A simultaneously open exact order and settled record conflict; do not count the close while held.
        if (heldTradeIndices.has(k)) { inSim.delete(k); excludeHeldCloses.add(k); }
        continue;
      }
      const indices = heldTradeIndices.get(k) ?? [];
      const ownClose = heldCloseOf(p);
      if (!ownClose) {
        inSim.delete(k);
        if (indices.length) excludeHeldCloses.add(k);
        continue;
      }
      heldCloses.set(k, ownClose);
      // A close before this paper book's accounting window can retire the held identity, but its unknown old
      // allocation must not be invented as a gain in today's equity (nor vanish again on the next step).
      if (ownClose.exitT >= since) {
        if (indices.length) trades[indices[0]] = ownClose;
        else trades.push(ownClose);
      }
      inSim.add(k);
    }
    if (excludeHeldCloses.size) trades = trades.filter((x) => !excludeHeldCloses.has(orderKey(x)));
    // A tape's existence is not evidence that it still contains this held entry. A changed history, incomplete
    // rebuild or missing tape can omit the exact order; dropping that position would make Live flatten its share
    // without its own exit. Keep its own protection and tick-time hit until a matching close is available. An
    // arbitrary age limit cannot establish a close either. A tick crossing still removes this lane from live control.
    let carriedMissing = 0;
    for (const p of prevByKey.values()) {
      const k = orderKey(p);
      if (openNow.has(k) || inSim.has(k)) continue;
      positions.push({ ...p, vol: p.vol ?? 1, level: p.level ?? 0 });
      openNow.add(k);
      carriedMissing++;
    }
    if (carriedMissing && carriedMissing !== this.carriedMissing)
      this.db.event("warn", `paper: ${carriedMissing} held position(s) carried; their exact tape close is unavailable`);
    this.carriedMissing = carriedMissing;
    // Persist crossings for the recovered positions too, so an unrelated rebuild cannot re-open their live shares.
    const keepHits: Record<string, { at: number; stop: number; px?: number }> = {};
    for (const p of positions)
      if (p.stopHit)
        keepHits[posId(p)] = { at: p.stopHit, stop: p.stop, ...(p.hitPx ? { px: p.hitPx } : {}) };
    if (
      Object.keys(keepHits).length !== Object.keys(saved).length ||
      Object.keys(keepHits).some((k) => !saved[k] || saved[k].at !== keepHits[k].at ||
        saved[k].stop !== keepHits[k].stop || saved[k].px !== keepHits[k].px)
    )
      this.db.kvSet("stopHits", keepHits);
    // the paper book's own record: every position it held that left it this step, with the close its tape gave it
    // (the order the simulation booked) and when the book first held it — paper_trades is the simulated window's
    // trades, most of which the book never held (closed between two computes); this is what the book really traded
    {
      const tradeOf = new Map([...trades.map((x) => [orderKey(x), x] as const), ...heldCloses]);
      const now = Date.now();
      const rows: Array<Array<string | number | null>> = [];
      for (const p of prevByKey.values()) {
        const k = orderKey(p);
        if (openNow.has(k)) continue;
        const x = tradeOf.get(k);
        // (mult: the execution multiple r is sized by — r / mult is the unit return the exchange record is in)
        rows.push(
          // (with the prices of the executable record: the price at adoption, the sim's entry and exit)
          x
            ? [p.cfg, p.sym, p.side, p.entryT, x.exitT, x.r, x.vol ?? 1, x.reason ?? "close", p.heldAt ?? null, now, p.heldPx ?? null, x.entry, x.exit, x.mult ?? 1,
                Number.isFinite(unitReturn(x)) ? unitReturn(x) : null,
                (() => {
                  const allocation = this.paperOwnedAllocations?.get(orderKey(p));
                  const sameShare =
                    typeof x.vol === "number" &&
                    typeof p.vol === "number" &&
                    Math.abs(x.vol - p.vol) <= 1e-9 * Math.max(1, p.vol);
                  const notional =
                    sameShare &&
                    allocation &&
                    typeof p.vol === "number" &&
                    p.vol <= allocation.vol + 1e-12
                      ? allocation.unitUsd * p.vol
                      : NaN;
                  return Number.isFinite(notional) && notional > 1e-9 ? notional : null;
                })(),
              ]
            : // left the book without a close on record (retired, dropped from its tape): its last mark, flagged
              [p.cfg, p.sym, p.side, p.entryT, now, (p.mtm ?? 0) * (p.vol ?? 1), p.vol ?? 1, "dropped", p.heldAt ?? null, now, p.heldPx ?? null, p.entry, null, positionMult(p), null, null],
        );
      }
      if (rows.length)
        this.db.tx(() => {
          for (const r of rows)
            this.db.run(
              "INSERT OR IGNORE INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, held_px, entry, exit, mult, unit_r, owned_notional_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              ...r,
            );
        });
    }
    yield 0;
    // earlier closed paper trades carry their realized P&L forward, counted once (paper_trades is keyed by config,
    // symbol, direction and entry): every trade recorded since the paper book started that the current window does not hold —
    // entered before it (the window slides), or inside it but no longer taken by the re-simulation (a gate added
    // since; its close was recorded under the settings it traded with)
    const carriedBefore =
      this.db.get<{ s: number | null }>(
        "SELECT SUM(pnl) AS s FROM paper_trades WHERE exit_t >= ? AND entry_t < ?",
        since,
        this.sim.startT,
      )?.s ?? 0;
    let carriedDropped = 0;
    for (const row of this.db.all<{
      cfg: string;
      sym: string;
      side: number;
      entry_t: number;
      pnl: number | null;
    }>(
      "SELECT cfg, sym, side, entry_t, pnl FROM paper_trades WHERE exit_t >= ? AND entry_t >= ?",
      since,
      this.sim.startT,
    ))
      if (!inSim.has(orderKey({ cfg: row.cfg, sym: row.sym, side: row.side, entryT: row.entry_t })))
        carriedDropped += row.pnl ?? 0;
    const carried = carriedBefore + carriedDropped;
    yield 0;
    // sizing: every order's unit from the equity at its entry (fixed % of equity) or the fixed notional
    const sizing = this.paperSizing();
    const sized = yield* sizeBookGen(trades, positions, {
      ...sizing,
      balance: sizing.balance + carried,
    });
    const ownedEntryAllocations = new Map<string, { unitUsd: number; vol: number }>();
    for (const p of positions) {
      const k = orderKey(p);
      // A legacy held position is never retroactively funded by a new simulation's reconstructed unit.
      const prior = this.paperOwnedAllocations?.get(k);
      const unit = !prevByKey.has(posId(p)) ? sized.units.get(k) : undefined;
      if (prior) ownedEntryAllocations.set(k, prior);
      else if (
        typeof unit === "number" &&
        Number.isFinite(unit) &&
        unit > 0 &&
        Number.isFinite(p.vol) &&
        p.vol > 0
      )
        ownedEntryAllocations.set(k, { unitUsd: unit, vol: p.vol });
    }
    this.paperOwnedAllocations = ownedEntryAllocations;
    const unitOf = (x: { cfg: string; sym: string; side: number; entryT: number }) =>
      sized.units.get(orderKey(x)) ?? this.settings.paperNotional;
    const db = this.db;
    // the book's rows in chunks of PAPER_ROWS, each its own transaction, the live tick between them (every open
    // position and every trade of the window in one transaction held the loop for up to 0.9 s on x01; the rows are
    // idempotent: a step cut short is completed by the next)
    // only what changed since the last step is written (paper-rows.ts; the first step after a start rewrites
    // everything): every position and every trade of the window on every step was ~20k rows, the step's longest slices
    const pd = diffPositions(this.paperPosWritten, positions);
    if (pd.full) db.run("DELETE FROM paper_positions");
    for (let i = 0; i < pd.gone.length; i += PAPER_ROWS) {
      const part = pd.gone.slice(i, i + PAPER_ROWS);
      db.tx(() => {
        for (const g of part)
          db.run(
            "DELETE FROM paper_positions WHERE cfg = ? AND sym = ? AND side = ? AND entry_t = ?",
            g.cfg,
            g.sym,
            g.side,
            g.entryT,
          );
      });
      yield i;
    }
    const posRows = pd.write;
    for (let i = 0; i < posRows.length; i += PAPER_ROWS) {
      const part = posRows.slice(i, i + PAPER_ROWS);
      db.tx(() => {
        for (const p of part)
          db.run(
            "INSERT OR REPLACE INTO paper_positions (cfg, sym, side, entry_t, entry, stop, target, mtm, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            p.cfg,
            p.sym,
            p.side,
            p.entryT,
            p.entry,
            p.stop,
            p.target,
            p.mtm,
            Date.now(),
          );
      });
      yield i;
    }
    // (the record of what is written moves only once its rows are: a step cut short is completed by the next)
    this.paperPosWritten = pd.next;
    const td = diffTrades(this.paperTradesWritten, trades, unitOf);
    const tradeRows = td.write;
    for (let i = 0; i < tradeRows.length; i += PAPER_ROWS) {
      const part = tradeRows.slice(i, i + PAPER_ROWS);
      db.tx(() => {
        for (const { t, pnl } of part)
          db.run(
            // first_at: when the trade was first recorded (a conflict keeps it). A trade the simulated window
            // back-fills (a config selected now, its closes hours ago) is recorded long after its exit: the forward
            // paper record counts only trades recorded around their exit (see paperForward)
            "INSERT INTO paper_trades (cfg, sym, side, entry_t, exit_t, entry, exit, r, pnl, reason, first_at, unit_r) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (cfg, sym, side, entry_t) DO UPDATE SET pnl = excluded.pnl",
            t.cfg,
            t.sym,
            t.side,
            t.entryT,
            t.exitT,
            t.entry,
            t.exit,
            t.r,
            pnl,
            t.reason,
            Date.now(),
            Number.isFinite(unitReturn(t)) ? unitReturn(t) : null,
          );
      });
      yield i;
    }
    this.paperTradesWritten = td.next;
    const tExec = performance.now() - tp0 - tSelect - tCands;
    if (lvN > 0) {
      let evaluated = 0;
      let unjudged = 0;
      let unknown = 0;
      let judged = 0;
      let passing = 0;
      let onExchange = 0;
      for (const id of sel) {
        const x = byId.get(id);
        if (!x) { evaluated += lvSides.length; unknown += lvSides.length; continue; }
        // The status has the same independent identities as admission, including both unjudged sides.
        // Do not retain these potentially large diagnostic-only lookups in the entry memo.
        for (const sym of x.syms) for (const side of lvSides) {
          evaluated++;
          const g = lvOf(x, lvNow, side, sym, false);
          if ((g.unknown ?? 0) > 0) unknown++;
          else if (g.pf === null) unjudged++;
          else {
            judged++;
            if (g.ok) passing++;
            if (g.source === "exchange") onExchange++;
          }
          if (evaluated % 128 === 0) yield 0;
        }
      }
      this.status.liveValidation = {
        lastN: lvN,
        minPf: lvMinPf,
        since: lvSince,
        at: lvNow,
        basis: "post-base-accepted",
        evaluated,
        unjudged,
        unknown,
        judged,
        passing,
        paused: judged - passing,
        skipped: lvSkipped,
        onExchange,
        exchangeCloses: 0,
        groupLastN: lvGroupN,
        groups: [...lvGroups]
          .map(([key, g]) => ({
            // (live.sideGates: the key is group|side)
            ...(lvBySide
              ? { group: key.slice(0, key.lastIndexOf("|")), side: key.endsWith("|1") ? (1 as const) : (-1 as const) }
              : { group: key }),
            n: g.n,
            pf: g.pf,
            ok: g.ok,
            source: g.source,
          }))
          .sort((a, b) => (a.group < b.group ? -1 : a.group > b.group ? 1 : 0)),
        ...(lvBySide ? { bySide: true as const } : {}),
      };
    } else delete this.status.liveValidation;
    this.paperTimings = { select: tSelect, cands: tCands, exec: tExec, n: cands.length, stale };
    // the step's reasons replace the previous step's; the pending entries' (pending:…) are kept until their next call
    const pendingKept = Object.fromEntries(
      Object.entries(this.status.paperSkips ?? {}).filter(([k]) => k.startsWith("pending:")),
    );
    this.status.paperSkips = { ...pSkips, ...pendingKept };
    // the live tick ran between this step's slices on the old book: a stop it crossed after the positions were
    // built is carried over (else the lane asks for its volume again until the next step reads the stored hit)
    for (const p of positions) {
      const prev = prevByKey.get(posId(p));
      Object.assign(p, carryTrail(p, prev));
      if (p.stopHit) continue;
      if (prev?.stopHit && prev.stop === p.stop) {
        p.stopHit = prev.stopHit;
        if (prev.hitPx) p.hitPx = prev.hitPx;
      }
    }
    this.paper = {
      selected: [...sel],
      // the control's fill ranks by these (live.signalsByScore ranks signals with the engine configs): ONE measure
      // for both kinds — the selection score itself is not comparable (rankBy "score" boosts it by the green share
      // ×0.5–1.5, "green" is the share alone, held / probe picks score their net), so every selected config is
      // scored by selectionScoreAt (lower confidence bound over the selection window)
      scores: fast
        ? this.paper.scores
        : new Map([
            ...picks.flatMap((p) => {
              const tp = byId.get(p.id);
              return tp ? [[p.id, selectionScoreAt(tp, t, this.wf)] as [string, number]] : [];
            }),
            ...sigTapes.map((tp) => [tp.id, selectionScoreAt(tp, t, this.wf)] as [string, number]),
          ]),
      eligible,
      positions,
      trades,
      equity:
        carried + sized.pnl + positions.reduce((a, p) => a + p.mtm * (p.vol ?? 1) * unitOf(p), 0),
      balance: 0,
      units: sized.units,
      carried,
      startedAt: this.paper.startedAt,
    };
    if (!fast && !reuse) this.status.postBaseValidation = postBaseValidation;
    this.paper.balance = this.settings.paperBalance + this.paper.equity;
    this.db.kvSet("paperBook", {
      at: Date.now(),
      startedAt: this.paper.startedAt,
      selected: this.paper.selected,
      positions: this.paper.positions,
      ownedEntryAllocations: [...ownedEntryAllocations],
    });
    // signal positions (symbol × direction) and orders open now, shown apart
    if (this.status.signals) {
      const sp = positions.filter((p) => sigCfg(p.cfg) && !isHistoricExitConfig(p.cfg));
      this.status.signals.openOrders = sp.length;
      this.status.signals.openPositions = new Set(sp.map((p) => `${p.sym}|${p.side}`)).size;
    }
  }

  /** Paper sizing: starting balance, fixed % of equity (or fixed notional) per order unit. */
  paperSizing() {
    return {
      balance: this.settings.paperBalance,
      sizing: sizingSettings(this.settings.sizing),
      fixedNotional: this.settings.paperNotional,
    };
  }

  /**
   * Block book over the simulation's Real candidates (the Block feed), advanced causally: call with non-decreasing entry times;
   * each call returns the book holding every position that closed at or before that time. Null when only the
   * config-set source is enabled (nothing else to judge).
   */
  private booksAt(): BooksAt {
    const src = this.wf.block.sources ?? {};
    // the book also carries the pause after a positive raise (the config source pauses too)
    // the direction gate reads the same feed, Block on or off
    const wantBook =
      this.wf.toggles.block &&
      (this.wf.block.historySource === "accepted-orders" ||
        !!(src.overall || src.symbol || src.direction || src.indication || src.type) ||
        (this.wf.block.pause ?? 0) > 0);
    const wantRelate = this.wf.relate?.enabled === true;
    const direction = candidateDirectionFor(this.wf);
    const wantGuard =
      !!this.wf.signalGuardN ||
      !!this.wf.signalCluster?.enabled ||
      !!this.wf.signalAccept?.enabled ||
      !!this.wf.signalSideAccept?.enabled ||
      !!this.wf.engineSideAccept?.enabled;
    if (!wantBook && !wantRelate && !wantGuard && !direction)
      return Object.assign(() => ({ book: null, relate: null, guard: null, direction: null }), {
        advance: () => true,
      });
    const feed =
      this.realtimeLearning?.sim === this.sim ? this.realtimeLearning.feed : (this.sim?.feed ?? []);
    // (fed only when read: an unread book cost the tick seconds after each new run)
    const book = wantBook ? blockBookOf(this.wf.block, !!this.wf.toggles.blockActive) : null;
    const relate = wantRelate ? relateBookFor(this.wf) : null;
    // acceptance on the same tape record the simulation judged on
    const guard = signalGuardFor(this.tapes, this.wf);
    // the desk's own exchange closes judge an acceptance group once they number its minTrades (live-record.ts)
    const exchange = {
      stats: (k: string, t: number, h: number) => this.exchangeAccept().stats(k, t, h),
    };
    guard.exchange = exchange;
    let i = 0;
    const at = (t: number) => {
      while (i < feed.length && feed[i].exitT <= t) feedBooks(feed[i++], book, guard, direction, relate);
      return { book: wantBook ? book : null, relate, guard: wantGuard ? guard : null, direction };
    };
    // the feed up to t, at most `max` entries a call (true once there): the first lookup of a fresh book replayed the
    // whole run's feed in one block — 1–4 s of the paper step on x02 (7 Oct profile), the loop held throughout
    const advance = (t: number, max: number) => {
      for (let n = 0; n < max && i < feed.length && feed[i].exitT <= t; n++)
        feedBooks(feed[i++], book, guard, direction, relate);
      return !(i < feed.length && feed[i].exitT <= t);
    };
    return Object.assign(at, { advance });
  }

  /**
   * Entries due NOW: signals of the selected configs on the newest closed bar (they enter at the next open).
   * These are what the live adapter may mirror.
   */
  pendingEntries(): LiveIntent[] {
    const g = this.pendingEntriesGen();
    for (;;) {
      const next = g.next();
      if (next.done) return next.value;
    }
  }

  private *pendingEntriesGen(): Generator<number, LiveIntent[]> {
    const out: LiveIntent[] = [];
    if (
      FAST_ENTRIES &&
      this.market === "bingx" &&
      !this.replay &&
      this.fastArgs &&
      this.fastBarDone < this.status.lastBarT
    )
      return out;
    yield 0;
    const entryT = this.status.lastBarT + this.settings.tfMin * 60_000;
    // the books advance with time: one cursor per simulated run, moved forward tick by tick (replaying the whole
    // feed every 100 ms tick was O(feed) per tick)
    if (!this.liveBooks || this.liveBooks.sim !== this.sim || entryT < this.liveBooks.t)
      this.liveBooks = { sim: this.sim, t: entryT, at: this.booksAt() };
    this.liveBooks.t = entryT;
    // a fresh run's books catch up with its feed in time-boxed steps, one per tick: the whole feed in one tick held the
    // loop 3.8 s (x02, 7 Oct profile: Block book scores and the acceptance index per entry) — until they are there no
    // entry is judged on a half-fed book (the next tick continues)
    if (!catchUp(this.liveBooks.at.advance, entryT, BOOK_CATCHUP_MS)) {
      this.status.paperSkips = {
        ...Object.fromEntries(
          Object.entries(this.status.paperSkips ?? {}).filter(([k]) => !k.startsWith("pending:")),
        ),
        "pending:booksCatchingUp": 1,
      };
      return out;
    }
    const books = this.liveBooks.at(entryT);
    const byId = this.tapeIndex();
    const coord = this.sim ? this.coordOf(this.sim) : null;
    // signal confirmation's pool, as in the paper step (engine candidates taken or not, open at the entry)
    const confirmPool = coord
      ? this.confirmPoolOf(
          coord.engineIv,
          () => this.engineOpenNow(this.paper.selected, byId),
          this.paper.positions,
        )
      : null;
    // every pending entry not sent, by reason (status.paperSkips "pending:…", replaced per call)
    const skips: Record<string, number> = {};
    const skip = (tp: ConfigTape, why: string) => {
      const k = `pending:${sigCfg(tp.id) ? "sig:" : ""}${why}`;
      skips[k] = (skips[k] ?? 0) + 1;
    };
    let visited = 0;
    for (const id of this.paper.selected) {
      if (++visited % 16 === 0) yield visited;
      const tp = byId.get(id);
      if (!tp) continue;
      for (const p of tp.pending) {
        if (++visited % 16 === 0) yield visited;
        // an entry on the next bar passes the same execution and coordination rules as in the simulation
        const d = execDecision(tp, entryT, this.wf, { ...books, sym: p.sym, side: p.side,
          relateBase: () => 1,
        });
        if (!d.ok) {
          skip(tp, `exec:${d.why}`);
          continue;
        }
        // and the live validation of the paper book (a config losing on its own record opens nothing), and native live
        // entries require both settled model and measured owned-paper execution proof for this side
        if (
          (this.liveEntryGate && !this.liveEntryGate(tp, p.side, p.sym)) ||
          !this.livePromotionGate({ cfg: tp.id, sym: p.sym, side: p.side }).ok
        ) {
          skip(tp, "liveValidation");
          continue;
        }
        const back = coord
          ? this.entryHeldBack(
              { cfg: tp.id, sym: p.sym, side: p.side, entryT },
              isHistoricExitConfig(tp.id) ? (coord.exitHourNet.get(tp.id) ?? new Map()) : coord.hourNet,
              this.paper.positions,
              coord.srcClosed,
              confirmPool,
            )
          : null;
        if (back) {
          skip(tp, `heldBack:${back}`);
          continue;
        }
        // the signal orders' own cap per symbol (open paper signal positions on the symbol + entries sent now)
        if (sigCfg(tp.id)) {
          const scope = orderCapScope(tp.id);
          const cap = capsOf(this.wf, true).perSymbol;
          const openOn =
            this.paper.positions.filter((x) => x.sym === p.sym && orderCapScope(x.cfg) === scope).length +
            out.filter((x) => x.sym === p.sym && orderCapScope(x.cfg) === scope).length;
          if (openOn >= cap) {
            skip(tp, "cap:perSymbol");
            continue;
          }
          // the signals' own cap on POSITIONS (symbol × direction, open paper positions + entries sent now), counted
          // per direction: long and short run independently, each up to the cap
          const pcap = this.wf.signalMaxPositions;
          if (pcap && pcap > 0) {
            const same = (x: { sym: string; side: number; cfg: string }) =>
              x.sym === p.sym && x.side === p.side && orderCapScope(x.cfg) === scope;
            if (!this.paper.positions.some(same) && !out.some(same)) {
              const set = new Set(
                [...this.paper.positions, ...out]
                  .filter((x) => orderCapScope(x.cfg) === scope && x.side === p.side)
                  .map((x) => `${x.sym}|${x.side}`),
              );
              if (set.size >= pcap) {
                skip(tp, "cap:maxPositions");
                continue;
              }
            }
          }
        }
        // the bar the signal was decided on is the symbol's own newest bar (a lagging symbol is dropped by the planner)
        const barT = this.candles.get(p.sym)?.lastT() ?? 0;
        // a lane enters at the open after ITS bar closed: only in the base bar that closes that lane bar
        // (a 15m signal is never offered again later in the quarter hour, so it cannot enter late)
        const laneTf = laneOf(tp.ind).tf ?? this.settings.tfMin;
        if (!laneClosesWith(barT, this.settings.tfMin, laneTf)) {
          skip(tp, "laneBar");
          continue;
        }
        const hedge = this.isHedgeEntry({ cfg: tp.id, sym: p.sym, side: p.side });
        const coordVol = this.s2EntryVolume(d.vol, tp.id);
        const volFactor = volumeFactorForStrategy(tp, this.wf);
        const rangeVol = rangeVolumeFactorFor(tp, this.wf);
        const hedgeVol = hedge ? (this.wf.coord?.hedgeVolumeFactor ?? 1) : 1;
        const baseExternalMult = d.vol * coordVol * volFactor * rangeVol * hedgeVol;
        const relationCap = relateExternalStackCap(this.wf.relate?.maxStack ?? MAX_EXTERNAL_STACK,
          tp.kind, p.protect ?? tp.protect);
        const combined = combineRelateStack(baseExternalMult,
          this.wf.relate?.enabled ? (d.relateVol ?? 1) : 1, relationCap);
        const relateVol = this.wf.relate?.enabled ? combined.relation : 1;
        out.push({
          cfg: tp.id,
          sym: p.sym,
          side: p.side,
          // an ATR protect trades the distances resolved for this entry (concrete stop / target)
          protect: p.protect ?? tp.protect,
          barT,
          kind: tp.kind,
          volFactor,
          rangeVol,
          ...(coordVol !== 1 ? { coordVol } : {}),
          ...(d.vol !== 1 ? { blockVol: d.vol } : {}),
          ...(relateVol !== 1 ? { relateVol } : {}),
          maxStack: relationCap,
          ...(hedge ? { hedge: true, hedgeVol: this.wf.coord?.hedgeVolumeFactor ?? 1 } : {}),
        });
      }
    }
    // the step's reasons stay; the pending ones are this call's
    this.status.paperSkips = {
      ...Object.fromEntries(
        Object.entries(this.status.paperSkips ?? {}).filter(([k]) => !k.startsWith("pending:")),
      ),
      ...skips,
    };
    return out;
  }
}

export interface PresetBacktest {
  days: number;
  at: number;
  from: number;
  to: number;
  tfMin: number;
  pf: number | null;
  pfBasis?: "unit-net-returns" | "unavailable";
  unknownReturns?: number;
  gp?: number | null;
  gl?: number | null;
  noLoss?: boolean | null;
  pfConvention?: "gross-return-ratio" | "no-loss-sentinel" | "unavailable";
  sample?: "with-endpoint-marks";
  endpointMarks?: number;
  settledStats?: Record<string, unknown>;
  sizeWeightedDiagnostics?: Record<string, unknown>;
  n: number;
  perDay: number;
  wr: number;
  net: number | null;
  /** share of trading hours that closed positive */
  successHours: number;
  greenHours: number;
  hours: number;
  /** longest drawdown time, hours */
  ddtH: number;
  stable: boolean;
  minPf: number;
  maxDdtH: number;
  /** PF >= min PF and DDT <= max DDT of the settings at run time */
  pass: boolean;
  byKind: Record<string, { n: number; net: number; pf: number }>;
  /** closed positions per hour, PF of the last 12 / 25 / 75 positions, equity drawdown time / depth */
  posPerHour?: number;
  pfLast12?: number | null;
  pfLast25?: number | null;
  pfLast75?: number | null;
  equityDdtH?: number;
  maxDdPct?: number;
}

/** A backtest's diagrams: sized like the paper book (sizing settings), marked to market on its own candles. */
export function backtestSeries(
  trades: readonly Trade[],
  candles: ReadonlyMap<string, CandleSeries>,
  s: CoreSettings,
  startT: number,
  endT: number,
  days: number,
): PresetSeries {
  const balance = s.paperBalance ?? 1000;
  const sized = sizeBook(trades, [], { balance, sizing: s.sizing, fixedNotional: s.paperNotional });
  const unit = (x: { cfg: string; sym: string; side: number; entryT: number }) =>
    sized.units.get(orderKey(x)) ?? s.paperNotional;
  // Candle timestamps are opens; the candle opening at t is still forming, so mark with the prior close.
  const price = (sym: string, t: number) => candles.get(sym)?.closeAtOrBefore(t - 60_000) ?? null;
  return presetSeries(trades as never, {
    startT,
    endT,
    balance,
    unit: unit as never,
    price,
    cost: s.cost,
    leverage: 10,
    days,
    points: 400,
  });
}

export interface LiveIntent {
  cfg: string;
  sym: string;
  side: 1 | -1;
  protect: Protect;
  barT: number;
  /** Extra multiplier relative to a normal order; 1 = neutral. */
  volFactor?: number;
  /** Range multiplier captured with the validated Real entry. */
  rangeVol?: number;
  /** sub-strategy of the set (trailing / DCA / Axis exits are managed by the simulation) */
  kind?: string;
  /** Stable-02 relation-volume multiplier captured by the current simulation (neutral = omitted). */
  coordVol?: number;
  /** Block's settled-order multiplier captured by the Real entry decision (neutral = omitted). */
  blockVol?: number;
  /** Relate's settled-order multiplier, capped with Block and other sizing factors (neutral = omitted). */
  relateVol?: number;
  /** Real-stage maximum for the combined external execution multiplier. */
  maxStack?: number;
  /** This is a hedge-only Signal selected from past negative hours. */
  hedge?: boolean;
  /** Hedge-only size multiplier captured with the intent (neutral = omitted). */
  hedgeVol?: number;
}

/** CoreRuntime.listings: what the last paper step validated and keeps active, for paged listings (coreListing). */
export interface SetListings {
  paperStep: number;
  at: number;
  candidates: Array<{ id: string; group: string; kind: string }>;
  validation: {
    at: number;
    engineLastN: number;
    signalLastN: number;
    entryLastN: number;
    rangeLastN: number;
    historyH: number;
  };
  /** engine configs validated (seated) at the paper step, best score first, with their validation-window figures */
  validated: Array<{
    id: string;
    range: string;
    group: string;
    kind: string;
    score: number;
    pf: number;
    n: number;
    net: number;
    ddt: number;
    gp: number;
    gl: number;
  }>;
  /** per range: the rows of `validated` (best first) and the range's PF taken together on the validation windows */
  byRange: Record<
    string,
    { rows: number[]; gp: number; gl: number; pf: number | null; calculated: number }
  >;
  byGroup: Record<
    string,
    { rows: number[]; gp: number; gl: number; pf: number | null; calculated: number }
  >;
  byKind: Record<
    string,
    { rows: number[]; gp: number; gl: number; pf: number | null; calculated: number }
  >;
  /** Signal units active at the paper step include their exact protection config; Base/discovery rows omit cfg. */
  active: Array<{
    bot: string;
    ind: string;
    sym: string;
    side: 1 | -1;
    kind?: string;
    cfg?: string;
  }>;
  /** engine configs proven live by their own closes (live.engineProofN); null when the proof is off */
  proven: string[] | null;
  /** live.sideGates on: `proven` holds record keys, a config and its side (cfg|1 / cfg|-1), not config ids alone */
  provenBySide?: true;
}

/** The walk-forward knobs that are user settings (grids, toggles and gates come from CoreSettings). */
export const WF_KEYS = [
  "preH",
  "simH",
  "stepH",
  "recordValidation",
  "blockTrace",
  "portfolio",
  "rankBy",
  "lastN",
  "lastNMinPf",
  "normalBaseMinPf",
  "validLastN",
  "signalValidLastN",
  "maxPerSymbol",
  "maxPerSide",
  "maxOpen",
  "maxPositions",
  "guardPct",
  "coord",
  "longH",
  "signalLongH",
  "robustFrac",
  "rank",
  "bots",
  "preGate",
  "familySeats",
  "familyNeedsBase",
  "seatPer",
  "seatSet",
  "bestFirst",
  "laneSeats",
  "microSeats",
  "mode",
  "durableSplits",
  "durableFrac",
  "symGate",
  "symMinN",
  "symH",
  "sideGateN",
  "engineSideAccept",
  "causalBase",
  "entryCrowd",
  "seatQuietH",
  "seatSideCooloff",
  "invertSeats",
  "rangeOpts",
] as const;
/**
 * wf.rangeOpts range-checked: engine ranges accept validLastN 0–200, seatQuietH 0–48 h, stableBlocks 0 or 2–12
 * (1 = off), lastN 0–200, mode fixed / durable. Signals accept their own validation and entry last-N only; their
 * source × symbol × direction proof and active ranking remain separate from engine seat controls. Unknown ranges and
 * keys, and values that are not numbers, are dropped; nothing left = unset (the range uses its documented fallback).
 */
export function sanitizeRangeOpts(v: unknown): Partial<Record<RangeOptTag, RangeOpts>> | undefined {
  if (!v || typeof v !== "object") return undefined;
  const num = (x: unknown, lo: number, hi: number, int: boolean) => {
    const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x) : NaN;
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, int ? Math.round(n) : n)) : undefined;
  };
  const out: Partial<Record<RangeOptTag, RangeOpts>> = {};
  for (const tag of RANGE_OPT_TAGS) {
    const x = (v as Record<string, unknown>)[tag];
    if (!x || typeof x !== "object") continue;
    const src = x as Record<string, unknown>;
    const r: RangeOpts = {};
    const validLastN = num(src.validLastN, 0, 200, true);
    if (validLastN !== undefined) r.validLastN = validLastN;
    const lastN = num(src.lastN, 0, 200, true);
    if (lastN !== undefined) r.lastN = lastN;
    if (tag !== "sig") {
      const seatQuietH = num(src.seatQuietH, 0, 48, false);
      if (seatQuietH !== undefined) r.seatQuietH = seatQuietH;
      const stableBlocks = num(src.stableBlocks, 0, 12, true);
      if (stableBlocks !== undefined) r.stableBlocks = stableBlocks < 2 ? 0 : stableBlocks;
      if (src.mode === "fixed" || src.mode === "durable") r.mode = src.mode;
    }
    if (Object.keys(r).length) out[tag] = r;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * A preset backtest skips Base on a fixed focus set (the pairs were validated offline): only while every range selects
 * in fixed mode too — a range on another mode (wf.rangeOpts[tag].mode) selects among Base-passed pairs.
 */
export function presetSkipsBase(
  wf: Pick<WalkForwardOptions, "mode" | "rangeOpts">,
  focus: readonly unknown[],
): boolean {
  if (wf.mode !== "fixed" || !focus.length) return false;
  return !Object.values(wf.rangeOpts ?? {}).some((r) => r?.mode && r.mode !== "fixed");
}

/** The mainnet last-N floors on each range's own values (wf.rangeOpts): max(floor, value); an unset value stays unset. */
export function mainnetRangeFloors(ro: Partial<Record<RangeOptTag, RangeOpts>>): Partial<Record<RangeOptTag, RangeOpts>> {
  const out: Partial<Record<RangeOptTag, RangeOpts>> = {};
  for (const tag of RANGE_OPT_TAGS) {
    const r = ro[tag];
    if (!r) continue;
    out[tag] = {
      ...r,
      ...(r.lastN !== undefined ? { lastN: Math.max(MAINNET_LAST_N, r.lastN) } : {}),
      ...(r.validLastN !== undefined ? { validLastN: Math.max(MAINNET_VALID_LAST_N, r.validLastN) } : {}),
    };
  }
  return out;
}

/** Range-checked walk-forward patch (unknown keys dropped, numbers clamped). */
export function sanitizeWf(o: Partial<WalkForwardOptions>): Partial<WalkForwardOptions> {
  const p = pickWf(o) as Record<string, unknown>;
  const num = (k: string, lo: number, hi: number, int = false) => {
    if (p[k] === undefined) return;
    const v = Number(p[k]);
    if (!Number.isFinite(v)) throw new Error(`${k} must be a number`);
    p[k] = Math.min(hi, Math.max(lo, int ? Math.round(v) : v));
  };
  num("preH", 1, 240);
  num("maxPositions", 0, 10_000, true); // 0 = no limit
  // the simulated window: down to one hour (it was clamped to 6 h, so "--run 2" / "--run 3" silently ran 6 h and
  // every short session report covered a window nobody asked for)
  num("simH", 1, 240);
  num("stepH", 1 / 60, 48); // re-evaluation down to 1 minute (BingX has no sub-minute history)
  num("portfolio", 0, 10_000, true); // 0 = no limit
  num("lastN", 0, 200, true);
  num("lastNMinPf", 0, 5);
  num("normalBaseMinPf", 0, 10);
  num("validLastN", 0, 200, true);
  num("signalValidLastN", 0, 200, true);
  // order caps: 0 = no limit
  num("maxPerSymbol", 0, 1000, true);
  num("maxPerSide", 0, 10_000, true);
  num("maxOpen", 0, 100_000, true);
  num("guardPct", 0, 100);
  if (p.coord !== undefined) p.coord = coordSettings(p.coord as Partial<CoordSettings>);
  num("longH", 24, 1440);
  num("signalLongH", 1, 1440);
  num("robustFrac", 0, 1);
  num("durableSplits", 2, 12, true);
  num("durableFrac", 0, 1);
  if (p.rank !== undefined && !["lcb", "score", "net"].includes(String(p.rank))) delete p.rank;
  if (p.rankBy !== undefined && !["score", "green"].includes(String(p.rankBy))) delete p.rankBy;
  if (p.mode !== undefined && !["hourly", "durable", "fixed"].includes(String(p.mode)))
    delete p.mode;
  if (p.preGate !== undefined) p.preGate = Boolean(p.preGate);
  if (p.blockTrace !== undefined) p.blockTrace = p.blockTrace === true;
  if (p.familySeats !== undefined) p.familySeats = Boolean(p.familySeats);
  if (p.familyNeedsBase !== undefined) p.familyNeedsBase = Boolean(p.familyNeedsBase);
  if (p.seatPer !== undefined && !["pair", "config"].includes(String(p.seatPer))) delete p.seatPer;
  if (p.seatSet !== undefined) {
    if (!["pool", "validated"].includes(String(p.seatSet))) delete p.seatSet;
    else p.seatSet = "validated";
  }
  if (p.relate !== undefined) {
    const relate = p.relate as RelateAdjustmentConfig;
    const maxStack = Number(relate.maxStack);
    p.relate = {
      ...relate,
      maxStack: Math.floor(Number.isFinite(maxStack) ? Math.min(MAX_EXTERNAL_STACK, Math.max(1, maxStack)) : MAX_EXTERNAL_STACK),
    };
  }
  // symbol gate: veto (a proven loser on the symbol is skipped) / proven (only proven symbols) / per side / off
  if (
    p.symGate !== undefined &&
    !["veto", "proven", "vetoSide", "provenSide", "off"].includes(String(p.symGate))
  )
    delete p.symGate;
  num("symMinN", 1, 50, true); // closes on the symbol before its result counts
  num("symH", 0, 1440); // the symbol's look-back (h); 0 = the long / pre window
  num("sideGateN", 0, 64, true);
  if (p.engineSideAccept !== undefined) {
    const a = (p.engineSideAccept ?? {}) as Partial<SignalAccept>;
    const n = (v: unknown, d: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : d));
    p.engineSideAccept = {
      enabled: a.enabled === true,
      minPf: n(a.minPf, 1.05, 0, 10),
      hours: Math.round(n(a.hours, 24, 1, 336)),
      minTrades: Math.round(n(a.minTrades, 30, 1, 100_000)),
      ...(Array.isArray(a.perInd)
        ? {
            perInd: a.perInd.filter((r) =>
              ["mc", "mn", "mp", "sh", "gn", "lg", "wide"].includes(r),
            ),
          }
        : {}),
    };
  }
  if (p.entryCrowd !== undefined) {
    // per range ("mc" … "lg", "wide", "sig"): whole numbers 0 … 1000 (0 = no cap); anything else dropped
    const src = (p.entryCrowd ?? {}) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const k of ["mc", "mn", "mp", "sh", "gn", "lg", "wide", "sig"]) {
      const v = Number(src[k]);
      if (Number.isFinite(v) && v > 0) out[k] = Math.min(1000, Math.round(v));
    }
    p.entryCrowd = Object.keys(out).length ? out : undefined;
  }
  num("seatQuietH", 0, 48); // seat cool-off hours (0 = off)
  if (p.invertSeats !== undefined) p.invertSeats = Boolean(p.invertSeats); // contrarian execution (evaluation only)
  if (p.seatSideCooloff !== undefined) p.seatSideCooloff = Boolean(p.seatSideCooloff); // seat cool-off: own direction only
  if (p.rangeOpts !== undefined) p.rangeOpts = sanitizeRangeOpts(p.rangeOpts); // per-range seat and entry options
  if (p.causalBase !== undefined) p.causalBase = Boolean(p.causalBase); // direction gate: last N candidates of the side (0 = off; the book keeps 64)
  if (p.bestFirst !== undefined) p.bestFirst = Boolean(p.bestFirst);
  num("laneSeats", 0, 40, true);
  num("microSeats", 0, 100_000, true); // 0 = no cap
  if (p.bots !== undefined)
    p.bots = Array.isArray(p.bots) ? (p.bots as unknown[]).map(String).slice(0, 20) : [];
  return p as Partial<WalkForwardOptions>;
}

/** Disable new Historic Exit work once while preserving a restorable settings snapshot. */
function migrateHistoricExitOptIn(db: CoreDb): void {
  if (db.kvGet("historicExitOptInV1")) return;
  const saved = db.kvGet<SettingsPatch>("settings");
  const backup = structuredClone(saved);
  // The operator requested disabling new Historic Exit entries. Keep saved presets unchanged so they remain
  // reviewable; an explicit subsequent enable is an opt-in and survives the one-time migration.
  if (saved?.exitStrategy?.enabled === true) saved.exitStrategy.enabled = false;
  db.tx(() => {
    db.kvSet("historicExitOptInBackupV1", backup ?? null);
    if (saved) db.kvSet("settings", saved);
    db.kvSet("historicExitOptInV1", true);
  });
}

/** Add context children once for the exact former factory selection; preserve custom/off Focus. */
function migrateMicroContextFocus(db: CoreDb): void {
  if (db.kvGet("microContextFocusV1")) return;
  const upgrade = (settings: SettingsPatch | undefined) => {
    if (!settings || JSON.stringify(settings.focus) !== JSON.stringify(PRE_CONTEXT_FOCUS_21OCT)) return false;
    settings.focus = [...DEFAULT_SETTINGS.focus];
    return true;
  };
  const settings = db.kvGet<SettingsPatch>("settings");
  if (upgrade(settings)) db.kvSet("settings", settings);
  const presets = db.kvGet<Preset[]>("presets");
  if (Array.isArray(presets)) {
    let changed = false;
    for (const preset of presets) changed = upgrade(preset.settings) || changed;
    if (changed) db.kvSet("presets", presets);
  }
  db.kvSet("microContextFocusV1", true);
}

/** Add channel sources once for exact former factory selections, independently of older WF-cap migrations. */
function migrateMicroBreakoutFocus(db: CoreDb): void {
  if (db.kvGet("microBreakoutFocusV1")) return;
  const upgrade = (settings: SettingsPatch | undefined) => {
    if (!settings || JSON.stringify(settings.focus) !== JSON.stringify(PREVIOUS_MICRO_FOCUS_21OCT)) return false;
    settings.focus = [...DEFAULT_SETTINGS.focus];
    return true;
  };
  const settings = db.kvGet<SettingsPatch>("settings");
  if (upgrade(settings)) db.kvSet("settings", settings);
  const presets = db.kvGet<Preset[]>("presets");
  if (Array.isArray(presets)) {
    let changed = false;
    for (const preset of presets) changed = upgrade(preset.settings) || changed;
    if (changed) db.kvSet("presets", presets);
  }
  db.kvSet("microBreakoutFocusV1", true);
}

/**
 * Saved walk-forward options from before unlimited orders carry the old order caps (3 per symbol, 16 per side,
 * 60 open): they are dropped once so every order works; caps chosen afterwards are kept.
 */
/** Move former factory Signal/Exit values once; preserve explicit custom policies and a restorable snapshot. */
function migrateSignalEvaluationPolicy(db: CoreDb, saved: Partial<WalkForwardOptions>): Partial<WalkForwardOptions> {
  if (db.kvGet("signalEvaluation100V1")) return saved;
  const settings = db.kvGet<SettingsPatch>("settings");
  const presets = db.kvGet<Preset[]>("presets");
  const backup = structuredClone({ wf: saved, settings, presets });
  const out = structuredClone(saved);
  const upgrade = (s: SettingsPatch | undefined, wf: Partial<WalkForwardOptions> | undefined) => {
    let changed = false;
    if (s?.exitStrategy?.lookbackH === 168) { s.exitStrategy.lookbackH = SIGNAL_HISTORY_H; changed = true; }
    if (s?.exitStrategy?.minValidationTrades === 12) { s.exitStrategy.minValidationTrades = SIGNAL_VALID_LAST_N; changed = true; }
    if (s?.signals?.hist?.lookbackH === 0) { s.signals.hist.lookbackH = SIGNAL_HISTORY_H; changed = true; }
    if (wf) {
      if (wf.signalLongH === 336) { wf.signalLongH = SIGNAL_HISTORY_H; changed = true; }
      if (wf.signalValidLastN === 25 || wf.signalValidLastN === 12) { wf.signalValidLastN = SIGNAL_VALID_LAST_N; changed = true; }
      if (wf.exitMinTrades === 12) { wf.exitMinTrades = SIGNAL_VALID_LAST_N; changed = true; }
      const range = wf.rangeOpts?.sig;
      for (const key of ["validLastN", "lastN"] as const)
        if (range?.[key] === 25 || range?.[key] === 12) { range[key] = SIGNAL_VALID_LAST_N; changed = true; }
    }
    return changed;
  };
  let changed = upgrade(settings, out);
  if (Array.isArray(presets)) for (const preset of presets) changed = upgrade(preset.settings, preset.wf) || changed;
  if (changed) {
    db.kvSet("signalEvaluation100BackupV1", backup);
    db.kvSet("wf", pickWf(out));
    if (settings) db.kvSet("settings", settings);
    if (presets) db.kvSet("presets", presets);
  }
  db.kvSet("signalEvaluation100V1", true);
  return out;
}

/** Upgrade only the former factory DCA ladder, retaining custom spacing and a complete backup. */
function migrateDcaTwoSteps(db: CoreDb): void {
  if (db.kvGet("dcaTwoStepsV1")) return;
  const settings = db.kvGet<SettingsPatch>("settings"), presets = db.kvGet<Preset[]>("presets");
  const backup = structuredClone({ settings, presets });
  const upgrade = (s: SettingsPatch | undefined) => {
    if (!s?.dca || s.dca.maxDistance !== undefined) return;
    const d = s.dca;
    if (d.levels === 1 && d.step === .02 && d.addRatio === 2.5 &&
      (d.stepOfTp ?? 0) === 0 && (d.stopGap ?? .5) === .5 && (d.slOfTp ?? 1) === 1 && !d.tp)
      Object.assign(d, { levels: 2, step: .01, maxDistance: .02 });
    else d.maxDistance = 0; // custom legacy spacing must not acquire an implicit cap
  };
  upgrade(settings);
  if (Array.isArray(presets)) for (const preset of presets) upgrade(preset.settings);
  db.tx(() => {
    db.kvSet("dcaTwoStepsBackupV1", backup);
    if (settings) db.kvSet("settings", settings);
    if (presets) db.kvSet("presets", presets);
    db.kvSet("dcaTwoStepsV1", true);
  });
}

function migrateNeutralVolumeRatios(db: CoreDb): void {
  if (db.kvGet("neutralVolumeRatiosV1")) return;
  const settings=db.kvGet<SettingsPatch>("settings"), presets=db.kvGet<Preset[]>("presets");
  const backup=structuredClone({settings,presets});
  const upgrade=(s:SettingsPatch|undefined) => {
    if(!s) return;
    if(s.signals?.coordination?.volumeFactor!==undefined)
      s.signals.coordination.volumeFactor=s.signals.coordination.volumeFactor===8?1:volumeRatio(s.signals.coordination.volumeFactor);
    if(s.axis?.volumeFactor!==undefined)
      s.axis.volumeFactor=s.axis.volumeFactor===0.1?1:volumeRatio(s.axis.volumeFactor);
    if(s.signals?.combinedVolumeFactors) for(const kind of Object.keys(s.signals.combinedVolumeFactors) as Array<keyof typeof s.signals.combinedVolumeFactors>)
      s.signals.combinedVolumeFactors[kind]=volumeRatio(s.signals.combinedVolumeFactors[kind]);
  };
  upgrade(settings); if(Array.isArray(presets)) for(const p of presets) upgrade(p.settings);
  db.tx(()=>{
    db.kvSet("neutralVolumeRatiosBackupV1",backup);
    if(settings) db.kvSet("settings",settings);
    if(presets) db.kvSet("presets",presets);
    db.kvSet("neutralVolumeRatiosV1",true);
  });
}

function migrateSignalHistory150(db: CoreDb, saved: Partial<WalkForwardOptions>): Partial<WalkForwardOptions> {
  if (db.kvGet("signalHistory150V1")) return saved;
  const settings = db.kvGet<SettingsPatch>("settings");
  const presets = db.kvGet<Preset[]>("presets");
  const backup = structuredClone({ wf: saved, settings, presets });
  const out = structuredClone(saved);
  const upgrade = (s: SettingsPatch | undefined, wf: Partial<WalkForwardOptions> | undefined) => {
    if (s?.signals?.hist?.lookbackH === 100) s.signals.hist.lookbackH = SIGNAL_HISTORY_H;
    if (s?.exitStrategy?.lookbackH === 100) s.exitStrategy.lookbackH = SIGNAL_HISTORY_H;
    if (wf?.signalLongH === 100) wf.signalLongH = SIGNAL_HISTORY_H;
  };
  upgrade(settings, out);
  if (Array.isArray(presets)) for (const preset of presets) upgrade(preset.settings, preset.wf);
  db.tx(() => {
    db.kvSet("signalHistory150BackupV1", backup);
    db.kvSet("wf", pickWf(out));
    if (settings) db.kvSet("settings", settings);
    if (presets) db.kvSet("presets", presets);
    db.kvSet("signalHistory150V1", true);
  });
  return out;
}

/** Upgrade former factory fields once, retaining explicit custom selections and a transactional backup. */
function migrateExpandedSignalDefaults(db: CoreDb): void {
  if (db.kvGet("signalExpandedDefaultsV1")) return;
  const settings = db.kvGet<SettingsPatch>("settings");
  const presets = db.kvGet<Preset[]>("presets");
  const backup = structuredClone({ settings, presets });
  const upgrade = (s: SettingsPatch | undefined) => {
    const sig = s?.signals;
    if (!sig) return false;
    let changed = false;
    const sources = sig.sources;
    if (sig.sourcesMode !== "allow" && sources &&
      Object.keys(sources).length === Object.keys(PRE_EXPANDED_SIGNAL_SOURCES).length &&
      Object.entries(PRE_EXPANDED_SIGNAL_SOURCES).every(([name, value]) => sources[name] === value)) {
      sig.sources = {};
      changed = true;
    }
    if (sig.lanes?.length === 1 && sig.lanes[0] === 15) {
      sig.lanes = [...DEFAULT_SIGNALS.lanes];
      changed = true;
    }
    if (sig.exits === "pct") { sig.exits = "both"; changed = true; }
    if (sig.coordination?.count === 100) { sig.coordination.count = 0; changed = true; }
    return changed;
  };
  let changed = upgrade(settings);
  if (Array.isArray(presets)) for (const preset of presets) changed = upgrade(preset.settings) || changed;
  db.tx(() => {
    if (changed) {
      db.kvSet("signalExpandedDefaultsBackupV1", backup);
      if (settings) db.kvSet("settings", settings);
      if (presets) db.kvSet("presets", presets);
    }
    db.kvSet("signalExpandedDefaultsV1", true);
  });
}

/** Last-4 supersedes Last-8 once; later deliberate settings and stricter custom samples remain intact. */
function migrateSignalLast4Policy(db: CoreDb, saved: Partial<WalkForwardOptions>): Partial<WalkForwardOptions> {
  if (db.kvGet("signalLast4V1")) return saved;
  const settings = db.kvGet<SettingsPatch>("settings");
  const presets = db.kvGet<Preset[]>("presets");
  const backup = structuredClone({ settings, wf: saved, presets });
  const out = structuredClone(saved);
  const upgrade = (s: SettingsPatch | undefined, wf: Partial<WalkForwardOptions> | undefined) => {
    let changed = false;
    if (s?.signals?.guard?.lastN === 8) { s.signals.guard.lastN = SIGNAL_VALID_LAST_N; changed = true; }
    if (s?.exitStrategy?.minValidationTrades === 8) { s.exitStrategy.minValidationTrades = SIGNAL_VALID_LAST_N; changed = true; }
    if (wf) {
      for (const key of ["signalValidLastN", "signalGuardN", "exitMinTrades"] as const)
        if (wf[key] === 8) { wf[key] = SIGNAL_VALID_LAST_N; changed = true; }
      const range = wf.rangeOpts?.sig;
      for (const key of ["validLastN", "lastN"] as const)
        if (range?.[key] === 8) { range[key] = SIGNAL_VALID_LAST_N; changed = true; }
    }
    return changed;
  };
  let changed = upgrade(settings, out);
  if (Array.isArray(presets)) for (const preset of presets) changed = upgrade(preset.settings, preset.wf) || changed;
  db.tx(() => {
    if (changed) {
      db.kvSet("signalLast4BackupV1", backup);
      db.kvSet("wf", pickWf(out));
      if (settings) db.kvSet("settings", settings);
      if (presets) db.kvSet("presets", presets);
    }
    db.kvSet("signalLast4V1", true);
  });
  return out;
}

function migrateWfCaps(db: CoreDb): Partial<WalkForwardOptions> {
  const saved = db.kvGet<Partial<WalkForwardOptions>>("wf") ?? {};
  const v = db.kvGet<number>("wfCapsV") ?? 0;
  if (v >= 37) return saved;
  // each step runs only for a database older than it: a choice made after a step is never overwritten
  const out = { ...saved };
  const st = db.kvGet<Partial<CoreSettings>>("settings");
  const sig = st?.signals as Partial<SignalSettings> | undefined;
  if (v < 3) {
    // order caps from before unlimited orders (engine and signal orders)
    delete out.maxPerSymbol;
    delete out.maxPerSide;
    delete out.maxOpen;
    if (sig) {
      delete sig.perSymbol;
      delete sig.maxOpen;
    }
  }
  if (v < 4) {
    // Signals on by default with the 1m lane; Main takes every validated pair
    if (sig) {
      delete sig.enabled;
      delete sig.lanes;
    }
    if (st?.mainTop === 140) st.mainTop = 0;
  }
  if (v < 5) {
    // seats / positions back to the defaults; the former $30 control cap raised
    delete out.maxPositions;
    delete out.portfolio;
    if (st?.live?.maxNotionalUsd === 30) st.live.maxNotionalUsd = 200;
    if (st?.live?.maxPositions === 3) st.live.maxPositions = 12;
  }
  // v6 used to force Block 10/6. The desk default is 6 levels, active from 1 — that choice is kept.
  if (v >= 5 && v < 7) {
    // caps restored: the unlimited live value a v5 / v6 migration wrote goes back to 12
    if (st?.live?.maxPositions === 0) st.live.maxPositions = 12;
  }
  if (v < 8) {
    // causal validation (8 days): signal confirmation + low-drawdown ranking, hour-loss stop off
    if (out.guardPct === 1) delete out.guardPct;
    delete out.coord;
    if (sig && sig.rank === "drawdown") delete sig.rank;
  }
  if (v < 9) {
    // signal orders capped at 8 per symbol (the former unlimited default moves to the new one)
    if (sig && (sig.perSymbol === 0 || sig.perSymbol === undefined)) delete sig.perSymbol;
  }
  if (v < 10) {
    // signal exits / lanes validated over four windows: a database still on the former defaults moves to the new
    // ones (a value the user changed stays)
    if (sig) {
      const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
      if (same(sig.lanes, [1, 5, 15])) delete sig.lanes;
      if (sig.exits === "both") delete sig.exits;
      if (sig.holdH === 24) delete sig.holdH;
      if (same(sig.normal, { tp: [0.015, 0.02, 0.025, 0.03, 0.04], slOfTp: [1, 1.5, 2] }))
        delete sig.normal;
      if (
        same(sig.trailing, {
          tp: [0.02, 0.025, 0.03, 0.04, 0.05],
          trailOfTp: [0.4, 0.6, 0.8],
          slOfTp: 2,
        })
      )
        delete sig.trailing;
    }
  }
  if (v < 11) {
    // 32 signal orders per symbol (with the PF acceptance): the former default 8 moves to it
    if (sig && sig.perSymbol === 8) delete sig.perSymbol;
  }
  if (v < 12) {
    // 120 signal orders per symbol and PF acceptance at 1.8: the former defaults (32; 1.18 / 1.25) move to them
    if (sig && sig.perSymbol === 32) delete sig.perSymbol;
    const acc = sig?.accept as { minPf?: number } | undefined;
    if (acc && (acc.minPf === 1.18 || acc.minPf === 1.25)) delete acc.minPf;
  }
  if (v < 13) {
    // signal orders unlimited (positions capped at 100 instead): the former 120 / 32 / 8 per symbol move to it
    if (sig && (sig.perSymbol === 120 || sig.perSymbol === 32 || sig.perSymbol === 8))
      delete sig.perSymbol;
  }
  if (v < 14) {
    // 8 validated research sources on by default: a database that stored them as off (the former default) follows
    if (sig?.sources) {
      const src = sig.sources as Record<string, boolean>;
      for (const n of [
        "r-vol-regime",
        "r-linreg",
        "r-session-trend",
        "r-fractal",
        "r-awesome",
        "r-inside",
        "r-nr-break",
        "r-connors",
      ])
        if (src[n] === false) delete src[n];
    }
  }
  if (v < 15) {
    // Short order range beside the wide targets (3–6× cost). A grid that already chose, including short: false, stays.
    const addShort = <T extends { short?: unknown }>(grid: T): T =>
      grid.short !== undefined ? grid : { ...grid, short: structuredClone(SHORT_RANGE) };
    if (st?.grid) st.grid = addShort(st.grid);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const p of presets) {
        const g = p.settings?.grid;
        if (g && g.short === undefined) {
          p.settings = { ...p.settings, grid: addShort(g) };
          changed = true;
        }
      }
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 16) {
    // TP ranges in position-cost multiples (Minimal 4–8×, Short 9–14×, General 16–22×, Long 24–32×) and the swept
    // Block default (Overall). A range, wide target list or Block still on a former default moves; a changed one stays.
    const sameTp = (r: unknown, tp: number[]) =>
      !!r &&
      typeof r === "object" &&
      JSON.stringify((r as { tp?: unknown }).tp) === JSON.stringify(tp);
    const moveGrid = <T extends Record<string, unknown>>(g: T): T => {
      const n: Record<string, unknown> = { ...g };
      if (sameTp(n.minimal, FORMER_MINIMAL_TP)) n.minimal = structuredClone(MINIMAL_RANGE);
      if (sameTp(n.short, FORMER_SHORT_TP)) n.short = structuredClone(SHORT_RANGE);
      if (n.general === undefined) n.general = structuredClone(GENERAL_RANGE);
      if (n.long === undefined) n.long = structuredClone(LONG_RANGE);
      if (JSON.stringify(n.tp) === JSON.stringify([0.03, 0.05, 0.08])) n.tp = [];
      return n as T;
    };
    const formerBlock = (b: Partial<BlockConfig> | undefined) =>
      !!b &&
      (b.mode ?? "shared") === "shared" &&
      b.ratio === 0.2 &&
      b.maxLevel === 6 &&
      b.minActiveLevel === 1 &&
      b.maxMult === 2.5;
    if (st?.grid) st.grid = moveGrid(st.grid as never);
    if (st && formerBlock(st.block)) delete st.block;
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      for (const p of presets) {
        if (p.settings?.grid)
          p.settings = { ...p.settings, grid: moveGrid(p.settings.grid as never) };
        if (p.settings && formerBlock(p.settings.block as Partial<BlockConfig>))
          delete p.settings.block;
      }
      db.kvSet("presets", presets);
    }
  }
  if (v < 17) {
    // every config possibility is computed: a grid still on the former horizon-fit default moves to it off
    const unfit = <T extends { rangeFit?: { enabled?: boolean } }>(g: T): T =>
      g.rangeFit && g.rangeFit.enabled === true && Object.keys(g.rangeFit).length === 1
        ? { ...g, rangeFit: { enabled: false } }
        : g;
    if (st?.grid) st.grid = unfit(st.grid as never);
  }
  if (v < 18) {
    // every evaluated config trades with its own family seats: the former defaults (16 seats, one seat per pair)
    // move to them; a different choice stays
    if (out.portfolio === 16) delete out.portfolio;
    if (out.familySeats === false) delete out.familySeats;
  }
  if (v < 19) {
    // trend strength + volatility regime on by default: tactics still on the former default (all off) follow
    const t = st?.tactics as Partial<Record<string, unknown>> | undefined;
    if (t && !t.session && !t.volRegime && !t.trendStrength && !t.cooldown) delete st!.tactics;
  }
  if (v < 20) {
    // the validated signal settings (PR #65 / #66): signals on their own exits, the 15m lane, acceptance PF 1.3 over
    // 48 h, no extra last-10 validation — a database still on the former defaults moves; a changed value stays
    if (sig) {
      if (JSON.stringify(sig.lanes) === JSON.stringify([15, 30])) delete sig.lanes;
      const acc = sig.accept as { minPf?: number; hours?: number } | undefined;
      if (acc && acc.minPf === 1.8 && (acc.hours === undefined || acc.hours === 48)) {
        delete acc.minPf;
        delete acc.hours;
      }
    }
    if (out.signalValidLastN === 10) delete out.signalValidLastN;
  }
  if (v < 21) {
    // General / Long stop ratios 0.25–1.5 step 0.25 (operator, 13 Oct): a database still on the former default
    // ladder [0.5, 0.75, 1] moves to WIDE_TARGET_SL; a ladder chosen since stays
    const g = st?.grid as
      { general?: { slOfTp?: number[] } | false; long?: { slOfTp?: number[] } | false } | undefined;
    for (const r of [g?.general, g?.long])
      if (r && JSON.stringify(r.slOfTp) === JSON.stringify([0.5, 0.75, 1]))
        r.slOfTp = [...WIDE_TARGET_SL];
  }
  if (v < 22) {
    // every TP × SL × Trail in every range (operator, 13 Oct): a range lever still on its former default moves to the
    // new one, field by field; a value chosen since stays
    const g = st?.grid as Record<string, Record<string, unknown> | false | undefined> | undefined;
    for (const [key, now] of Object.entries(FORMER_GRID_13OCT)) {
      const r = g?.[key];
      if (!r) continue;
      for (const [field, [was, next]] of Object.entries(now))
        if (JSON.stringify(r[field]) === JSON.stringify(was))
          r[field] = Array.isArray(next) ? [...next] : next;
    }
  }
  if (v < 23) {
    // entry last-N off by default (operator, 13 Oct): a database still on the former default 15 moves to 0; any other
    // value (a mainnet floor of 25, a window chosen since) stays
    if (out.lastN === 15) delete out.lastN;
  }
  if (v < 24) {
    // the range families PROTOCOL-8 kept join the default focus (13 Oct): a focus still on the former default moves to
    // the new one; a focus chosen since stays
    if (st && JSON.stringify(st.focus) === JSON.stringify(FORMER_FOCUS_13OCT))
      st.focus = [...DEFAULT_SETTINGS.focus];
  }
  if (v < 25) {
    // Micro at 2–5× the position cost (operator, 13 Oct): a stored Micro target list still on the former default moves
    const mc = (st?.grid as { micro?: { tp?: number[] } | false } | undefined)?.micro;
    if (mc && JSON.stringify(mc.tp) === JSON.stringify(FORMER_MICRO_TP)) mc.tp = [...MICRO_TP];
  }
  if (v < 26 && sig) {
    // PF-qualified signal units no longer inherit the former top-100 / low-DD ranking defaults.
    if (sig.count === 100) delete sig.count;
    if (sig.maxPositions === 100) delete sig.maxPositions;
    if (sig.rank === "lowdd") delete sig.rank;
  }
  if (v < 27) {
    // Mainline exchange migration: remove legacy symbol caps; deliberate smaller position caps survive.
    const migrateExchangeSettings = (settings: SettingsPatch | undefined) => {
      if (!settings?.live) return false;
      const live = settings.live as unknown as Record<string, unknown>;
      let changed = false;
      if (live.maxPositions === 0 || live.maxPositions === 12) {
        delete live.maxPositions;
        changed = true;
      }
      if (Object.hasOwn(live, "maxSymbols")) changed = true;
      delete live.maxSymbols;
      return changed;
    };
    migrateExchangeSettings(st);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) changed = migrateExchangeSettings(preset.settings) || changed;
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 28 && st && JSON.stringify(st.focus) === JSON.stringify(PREVIOUS_DEFAULT_FOCUS_17OCT)) {
    // The updated 60 Micro Break identities join the default focus; preserve a user-selected focus unchanged.
    st.focus = [...DEFAULT_SETTINGS.focus];
  }
  if (v < 29) {
    // Expand Signal grids for installs already through the mainline v28 migrations; custom fields stay untouched.
    const same = (a: unknown, b: readonly number[]) => JSON.stringify(a) === JSON.stringify(b);
    const migrateSignalGrid = (signals: Partial<SignalSettings> | undefined): boolean => {
      if (!signals) return false;
      let changed = false;
      if (signals.normal) {
        if (same(signals.normal.tp, [0.025, 0.03, 0.04, 0.05, 0.06])) {
          signals.normal.tp = [...DEFAULT_SIGNALS.normal.tp];
          changed = true;
        }
        if (same(signals.normal.slOfTp, [1.5, 2, 3])) {
          signals.normal.slOfTp = [...DEFAULT_SIGNALS.normal.slOfTp];
          changed = true;
        }
      }
      if (signals.trailing) {
        if (same(signals.trailing.tp, [0.03, 0.04, 0.05, 0.06, 0.08])) {
          signals.trailing.tp = [...DEFAULT_SIGNALS.trailing.tp];
          changed = true;
        }
        if (same(signals.trailing.trailOfTp, [0.4, 0.6, 0.8])) {
          signals.trailing.trailOfTp = [...DEFAULT_SIGNALS.trailing.trailOfTp];
          changed = true;
        }
      }
      if (signals.minTrail === 0.005) {
        signals.minTrail = DEFAULT_SIGNALS.minTrail;
        changed = true;
      }
      return changed;
    };
    migrateSignalGrid(sig);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) {
        const signals = preset.settings?.signals;
        if (signals?.count === 100) {
          delete signals.count;
          changed = true;
        }
        if (signals?.maxPositions === 100) {
          delete signals.maxPositions;
          changed = true;
        }
        if (signals?.rank === "lowdd") {
          delete signals.rank;
          changed = true;
        }
        changed = migrateSignalGrid(signals) || changed;
        const focus = preset.settings?.focus;
        if (focus && JSON.stringify(focus) === JSON.stringify(PREVIOUS_DEFAULT_FOCUS_17OCT)) {
          preset.settings!.focus = [...DEFAULT_SETTINGS.focus];
          changed = true;
        }
      }
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 30) {
    // Migrate only the former factory sizing/volume settings; preserve chosen factors and balance sizing.
    const resetMicroDefault = (g: { micro?: { volumeFactor?: number } | false } | undefined) => {
      const micro = g?.micro;
      if (micro && micro.volumeFactor === 2.5) {
        micro.volumeFactor = 1;
        return true;
      }
      return false;
    };
    resetMicroDefault(st?.grid);
    const coord = out.coord as (typeof out.coord & Record<string, unknown>) | undefined;
    if (coord) delete coord.s2VolumeFactor;
    if (st?.sizing?.mode === "minQty" && st.sizing.pct === 0.02)
      st.sizing = structuredClone(DEFAULT_SIZING);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) {
        changed = resetMicroDefault(preset.settings?.grid) || changed;
        if (preset.settings?.sizing?.mode === "minQty" && preset.settings.sizing.pct === 0.02) {
          preset.settings.sizing = structuredClone(DEFAULT_SIZING);
          changed = true;
        }
      }
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 31) {
    // Convert only the former factory exposure-cap pair; deliberate limits remain intact.
    const moveFormerCap = (settings: SettingsPatch | undefined) => {
      const live = settings?.live;
      if (live?.exposureScaler !== false && live?.maxPositionX === 0.25 && live?.maxExposureX === 2)
        live.maxExposureX = 0.75;
    };
    moveFormerCap(st);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) {
        const live = preset.settings?.live;
        if (
          live?.exposureScaler !== false &&
          live?.maxPositionX === 0.25 &&
          live?.maxExposureX === 2
        ) {
          live.maxExposureX = 0.75;
          changed = true;
        }
      }
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 32) {
    // Retire fixed-dollar ceilings and only the former factory ratio pair.
    const migrateLive = (settings: SettingsPatch | undefined) => {
      const live = settings?.live;
      if (!live) return false;
      let changed = live.maxNotionalUsd !== 0;
      live.maxNotionalUsd = 0;
      if (live.maxPositionX === 0.25 && live.maxExposureX === 0.75) {
        live.maxPositionX = 0;
        live.maxExposureX = 0;
        changed = true;
      }
      return changed;
    };
    migrateLive(st);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) changed = migrateLive(preset.settings) || changed;
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 33) {
    // Balance-relative sizing is the saved mode; legacy modes move to the neutral 0.2% default.
    const migrateSizing = (settings: SettingsPatch | undefined) => {
      const sizing = settings?.sizing as { mode?: string } | undefined;
      if (sizing && sizing.mode !== "equityPct") settings!.sizing = structuredClone(DEFAULT_SIZING);
    };
    migrateSizing(st);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) {
        const sizing = preset.settings?.sizing as { mode?: string } | undefined;
        if (sizing && sizing.mode !== "equityPct") {
          preset.settings!.sizing = structuredClone(DEFAULT_SIZING);
          changed = true;
        }
      }
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 34) {
    // Move only the explicitly stored former factory cost and fee tuple. Partial/custom models retain
    // their provenance; measured exchange fills and their commissions are never rewritten.
    const migrateModeledCost = (settings: SettingsPatch | undefined) => {
      const fees = settings?.fees;
      if (
        settings?.cost !== 0.002 ||
        fees?.taker !== 0.0005 ||
        fees?.maker !== 0.0002 ||
        fees?.slippage !== 0.0005
      )
        return false;
      settings.cost = DEFAULT_SETTINGS.cost;
      settings.fees = { ...fees, slippage: DEFAULT_SETTINGS.fees.slippage };
      return true;
    };
    migrateModeledCost(st);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) changed = migrateModeledCost(preset.settings) || changed;
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 35) {
    // Raise only the prior factory balance sizing default; keep deliberately chosen percentages unchanged.
    const migrateSizingDefault = (settings: SettingsPatch | undefined) => {
      const sizing = settings?.sizing;
      if (sizing?.mode !== "equityPct" || sizing.pct !== 0.001) return false;
      sizing.pct = DEFAULT_SIZING.pct;
      return true;
    };
    migrateSizingDefault(st);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) changed = migrateSizingDefault(preset.settings) || changed;
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 36) {
    // Enable Inverse in the factory calculation path; deliberate custom/off selections survive.
    const migrateFocus = (settings: SettingsPatch | undefined) => {
      if (
        !settings ||
        JSON.stringify(settings.focus) !== JSON.stringify(PREVIOUS_DEFAULT_FOCUS_20OCT)
      )
        return false;
      settings.focus = [...DEFAULT_SETTINGS.focus];
      return true;
    };
    migrateFocus(st);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) changed = migrateFocus(preset.settings) || changed;
      if (changed) db.kvSet("presets", presets);
    }
  }
  if (v < 37) {
    const migrateInverse = (settings: SettingsPatch | undefined) => {
      if (
        !settings ||
        JSON.stringify(settings.focus) !== JSON.stringify(PREVIOUS_INVERSE_FOCUS_20OCT)
      )
        return false;
      settings.focus = [...DEFAULT_SETTINGS.focus];
      return true;
    };
    migrateInverse(st);
    const presets = db.kvGet<Preset[]>("presets");
    if (Array.isArray(presets)) {
      let changed = false;
      for (const preset of presets) changed = migrateInverse(preset.settings) || changed;
      if (changed) db.kvSet("presets", presets);
    }
  }
  db.kvSet("wf", pickWf(out));
  if (st) db.kvSet("settings", st);
  db.kvSet("wfCapsV", 37);
  return out;
}

/** Range levers before the 13 Oct grids (v22 move): per range key, field → [former default, new default]. */
const FORMER_TRAILS = [0, 0.5, 0.75];
const FORMER_GRID_13OCT: Record<string, Record<string, readonly [unknown, unknown]>> = {
  minimal: {
    tp: [[0.008, 0.01, 0.012, 0.014, 0.016], MINIMAL_RANGE.tp],
    slOfTp: [[1.5, 2, 2.5, 3], MINIMAL_RANGE.slOfTp],
    trailOfTp: [FORMER_TRAILS, TRAIL_CONFIGS],
  },
  short: { slOfTp: [[1, 1.5, 2], SHORT_RANGE.slOfTp], trailOfTp: [FORMER_TRAILS, TRAIL_CONFIGS] },
  general: {
    tp: [[0.032, 0.036, 0.04, 0.044], GENERAL_RANGE.tp],
    trailOfTp: [FORMER_TRAILS, TRAIL_CONFIGS],
    trailSlOfTp: [1, GENERAL_RANGE.trailSlOfTp],
  },
  long: {
    tp: [[0.048, 0.052, 0.056, 0.06, 0.064], LONG_RANGE.tp],
    trailOfTp: [FORMER_TRAILS, TRAIL_CONFIGS],
    trailSlOfTp: [1, LONG_RANGE.trailSlOfTp],
  },
  micro: { trailOfTp: [FORMER_TRAILS, TRAIL_CONFIGS] },
  minimalPlus: { trailOfTp: [FORMER_TRAILS, TRAIL_CONFIGS] },
};

/** Former default targets of the Minimal (0.2–0.8 %) and Short (3–6× cost) ranges, for the v16 move. */
const FORMER_MINIMAL_TP = [0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008];
const FORMER_SHORT_TP = [0.006, 0.008, 0.01, 0.012];

function pickWf(o: Partial<WalkForwardOptions>): Partial<WalkForwardOptions> {
  const out: Record<string, unknown> = {};
  for (const k of WF_KEYS) if (o[k] !== undefined) out[k] = o[k];
  return out as Partial<WalkForwardOptions>;
}

/**
 * Everything a compute reads: the settings without the live execution block and the loop timings, and the
 * walk-forward options. cycleMs / tickMs only pace the loops (each reschedule reads them anew): in the key, a timing
 * change marked the compute stale and the tick skipped every live step — closes and stop repairs included — until a
 * full compute had run (1.5–2 min on x01).
 */
export function computeKey(s: CoreSettings, wf: Partial<WalkForwardOptions>): string {
  const { live: _live, cycleMs: _cycle, tickMs: _tick, ...rest } = s;
  return JSON.stringify([rest, pickWf(wf)]);
}

export interface MarketFeed {
  /** Frozen symbol-selection time; live feeds use the wall clock. Unconnected replay only. */
  rankingAt?: number;
  tickers: typeof fetchTickers;
  history: typeof fetchHistory;
  klines: typeof fetchKlines;
}

/** Run `fn` over items with at most `limit` in flight. */
async function mapLimit<T>(
  items: readonly T[],
  limit: number,
  fn: (x: T) => Promise<void>,
  alive: () => boolean = () => true,
) {
  let i = 0;
  let failed = false;
  // abandoned work (stop / newer generation) stops taking new items
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!failed && i < items.length && alive()) {
      try { await fn(items[i++]); }
      catch (error) { failed = true; throw error; }
    }
  });
  await Promise.all(workers);
}

/** Hard floors of the engine configs' stop and trailing distance (Settings → Protect grid). */
/**
 * Workers for the preset comparison: each one holds its own walk-forward state over every tape (about the size of
 * the packed tapes again). Admission includes the new packed copy before allocating it. Zero means defer.
 */
export function compareWorkers(
  pool: number,
  tapeBytes: number,
  freeBytes = memInfo().availMb * 1048576,
  needsPackedCopy = true,
): number {
  if (![pool, tapeBytes, freeBytes].every(Number.isFinite) || pool < 1 || tapeBytes < 0) return 0;
  const per = Math.max(256e6, tapeBytes * 1.1);
  const reserve = Math.max(1e9, memHardMb() * 1048576);
  const fit = Math.floor(
    Math.max(0, freeBytes - reserve - (needsPackedCopy ? tapeBytes : 0)) / per,
  );
  return Math.max(0, Math.min(Math.floor(pool), fit));
}
class CompareMemoryDeferred extends Error {}
/** Packed columns plus conservative metadata/open-position space; computed without allocating a SAB. */
export function compareTapeBytes(tapes: readonly ConfigTape[]): number {
  let bytes = 8, stored = false;
  for (const t of tapes) {
    const onDisk = !!historyOf(t);
    stored ||= onDisk;
    bytes = Math.ceil(bytes / 8) * 8 + (onDisk ? t.n * 32 : tapeBytes(t.n)) +
      2048 + ((t.open?.length ?? 0) + (t.pending?.length ?? 0)) * 512;
  }
  // Stored raw columns are bounded, while per-close indices and walk-forward state still need headroom.
  return bytes + (stored ? HISTORY_CACHE_BYTES : 0);
}

/**
 * Micro trades only the Micro indications, and they only Micro cells (grid.micro.ownInds, default on) — and Minimal
 * cells too with grid.minimal.microInds (default on): microIndRule
 */
export function microOwnInds(g: CoreSettings["grid"] | undefined): MicroIndRule {
  return microIndRule(g);
}

/** every range tag a protect grid can carry */
export const ALL_RANGE_TAGS = ["mc", "mn", "mp", "sh", "gn", "lg"] as const;

/** Historic signal configs use the eventual stage PF floors; coordinator variants also keep each enabled range's own floor. */
function coordinatorHistValidationOf(
  settings: CoreSettings,
  coordinatorProtects: readonly Protect[],
  lastN?: number,
): SignalHistValidation {
  const tags = new Set<"sh" | "gn" | "lg">();
  for (const protect of coordinatorProtects)
    if (protect.tag === "sh" || protect.tag === "gn" || protect.tag === "lg") tags.add(protect.tag);
  return {
    ...signalHistValidationOf(settings.cost, settings.gates, lastN),
    coordinationSignalRange: tags.size === 0,
    rangeMinPf: Object.fromEntries([...tags].map((tag) => [tag, minPfOf(settings.gates, tag, "sig-coord")])),
  };
}

/** Position-cost exit configs for Signals Coordination, restricted to the selected Short / Normal(General) / Long ranges. */
export function signalCoordinationProtects(
  grid: CoreSettings["grid"],
  cost: number,
  ranges: SignalSettings["coordination"]["ranges"],
  signals?: SignalSettings,
): Protect[] {
  const selected = signalCoordinationRanges(ranges);
  // Runtime coordinators use the same independent Signal grid as other Signal sources.
  // The legacy three-argument form remains available for reproducing sealed historical studies.
  // Removed legacy range identities are retained separately by heldCoordinationProtects.
  if (signals) return selected.short || selected.normal || selected.long ? signalProtects(signals) : [];
  const selectedGrid: CoreSettings["grid"] = {
    ...grid,
    tp: [],
    slOfTp: [],
    trailOfTp: [],
    short: selected.short ? grid.short : false,
    general: selected.normal ? grid.general : false,
    long: selected.long ? grid.long : false,
    minimal: false,
    micro: false,
    minimalPlus: false,
  };
  const tags = (p: Protect) => p.tag === "sh" || p.tag === "gn" || p.tag === "lg";
  const standard = protectGrid(15, selectedGrid, cost).filter(tags);
  // The original grid yields 4,500 Normal configs across the 15 current coordinator identities. Add untrailed
  // 12 h, 32 h and 48 h holds, plus 48 h Trailing holds. The 48 h cells are retained because they produce
  // runtime Strategy Base passes on the frozen IS replay; shorter/longer additions without passes are omitted.
  const normalRange = (range: typeof grid.short) => (range ? { ...range, trailOfTp: [0] } : false);
  const normalExtension = protectGrid(
    15,
    {
      ...selectedGrid,
      holdH: [12, 32, 48],
      short: selected.short ? normalRange(grid.short) : false,
      general: selected.normal ? normalRange(grid.general) : false,
      long: selected.long ? normalRange(grid.long) : false,
    },
    cost,
  ).filter((p) => tags(p) && p.trail === 0);
  const trailingExtension = protectGrid(
    15,
    {
      ...selectedGrid,
      holdH: [48],
    },
    cost,
  ).filter((p) => tags(p) && p.trail > 0);
  const seen = new Set(standard.map((p) => `${p.tp}|${p.sl}|${p.trail}|${p.hold}|${p.tag ?? ""}`));
  return [
    ...standard,
    ...[...normalExtension, ...trailingExtension].filter((p) => {
      const key = `${p.tp}|${p.sl}|${p.trail}|${p.hold}|${p.tag ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}
/** computes kept in status.baseHistory */
export const BASE_HISTORY_N = 48;

/**
 * The ranges that build sets for a pair's indication (the tape builder's own rules): a pass in a range the pair has no
 * sets in is no pass — a Micro indication passing at the default cell had no set at all (Micro takes only its own
 * cells), so it "passed" Base and was never evaluated (audit: "every validated pair has config sets").
 */
export function baseRangeRules(
  s: CoreSettings,
  /** ranges off for this compute only (a memory fallback range with no tapes to carry) */
  off: ReadonlySet<string> = new Set(),
): {
  rangeOn: (tag: string) => boolean;
  applies: Parameters<typeof rangeAppliesTo>[2];
} {
  const rangeGrid = s.grid as unknown as Record<string, unknown> & {
    minimalPlus?: { enabled?: boolean };
  };
  const RANGE_GRID_KEY: Record<string, string> = {
    mc: "micro",
    mn: "minimal",
    sh: "short",
    gn: "general",
    lg: "long",
  };
  const rangeOn = (tag: string) =>
    !tag ||
    (!off.has(tag) &&
      (tag === "mp" ? !!rangeGrid.minimalPlus?.enabled : !!rangeGrid[RANGE_GRID_KEY[tag]]));
  return {
    rangeOn,
    applies: {
      enabled: rangeOn,
      minTf: rangeMinTfOf(s.grid),
      microOwnInds: microOwnInds(s.grid),
      baseTf: s.tfMin,
    },
  };
}

/**
 * The Base gate over the S1 runs, one rule for the engine's compute and the preset backtest (the backtest judged the
 * default protect alone and built every range and target of a passed pair: sets the engine never validates). Each
 * engine pair is judged at the default protect and at one cell of each enabled range, against that range's own min PF:
 * the ranges it passes are the ones whose configs it computes (pairTags), and per range only the targets whose Base
 * cells passed (pairTps, grid.baseTargets).
 */
export function basePass(
  s1: readonly ComboRun[],
  s: CoreSettings,
  applies: Parameters<typeof rangeAppliesTo>[2] = baseRangeRules(s).applies,
  /** evaluation families (CTS_CORE_FAMILY): only their bots and ranges pass; null = every family (the desk) */
  evalFams: readonly EvalFamily[] | null = null,
): {
  /** Pairs built, including optional diagnostic-only allSets additions. */
  passed: ComboRun[];
  /** The actual Base-qualified rows and ranges, independent of diagnostic construction. */
  qualified: ComboRun[];
  qualifiedTags: Record<string, string[]>;
  qualifiedTps: Record<string, Record<string, readonly number[]>>;
  /** Independent untagged ladder admission follows the same policy as the actual tape builder. */
  wideLadderPairs: Set<string>;
  pairTags: Record<string, string[]>;
  pairTps: Record<string, Record<string, readonly number[]>>;
  /** grid.baseCells: per pair, the passed cells of the ranges it passed (protectCellKey); absent while the option is off */
  pairCells: Record<string, readonly string[]>;
  /** Actual passed cells, retained separately when allSets builds extra diagnostic candidates. */
  qualifiedCells: Record<string, readonly string[]>;
  added: number;
  /** the pairs grid.allSets added for measurement (not Base-passed) */
  addedKeys: Set<string>;
} {
  const pairTags: Record<string, string[]> = {};
  const pairCells: Record<string, readonly string[]> = {};
  const cellsOn = s.grid?.baseCells === true;
  const setsGates = baseSetsGates(s.gates);
  // per pair, the range targets whose Base cells passed: the tape stage builds only those (baseTargets, on by
  // default — a range tag used to unlock every target of the range, most of them never Base-evaluated)
  const pairTps: Record<string, Record<string, readonly number[]>> = {};
  const targetsOn = s.grid?.baseTargets !== false;
  // grid.baseRanges off: a passed pair builds every range its indication applies to, not only the ones it passed
  const rangesOn = s.grid?.baseRanges !== false;
  const passed = s1.filter((r) => {
    if (isSignalInd(r.ind)) return false;
    let tags = setsPassTags(r, setsGates, applies, ALL_RANGE_TAGS);
    // a family's pair builds only the sets of its own range (the other ranges of the pair are other families)
    if (evalFams) tags = familyTags(evalFams, r.bot, r.ind, tags);
    if (!tags.length) return false;
    // the ranges built: the passed ones, or (baseRanges off) every range that applies, the unpassed ones with every
    // target (pairTps lists only the passed ranges' targets)
    let built = pairBuildTags(r.ind, tags, ALL_RANGE_TAGS, applies, rangesOn);
    if (evalFams && !rangesOn) built = familyTags(evalFams, r.bot, r.ind, built);
    pairTags[`${r.bot}|${r.ind}`] = built;
    if (targetsOn && r.rangeTps) {
      const per: Record<string, readonly number[]> = {};
      for (const t of tags) if (t && r.rangeTps[t]?.length) per[t] = r.rangeTps[t];
      if (Object.keys(per).length) pairTps[`${r.bot}|${r.ind}`] = per;
    }
    // cell level: the passed cells of the passed ranges (a range without cells keeps the target / range level)
    if ((cellsOn || isLowRangeInd(r.ind)) && r.rangeCells?.length) {
      const keep = r.rangeCells.filter((k) => tags.includes(k.slice(0, k.indexOf("|"))));
      if (keep.length) pairCells[`${r.bot}|${r.ind}`] = keep;
    }
    return true;
  });
  const qualified = [...passed];
  const qualifiedCells = Object.fromEntries(Object.entries(pairCells).map(([pair, cells]) => [pair, [...cells]]));
  const qualifiedTags = Object.fromEntries(
    Object.entries(pairTags).map(([k, tags]) => [k, [...tags]]),
  );
  const qualifiedTps = Object.fromEntries(
    Object.entries(pairTps).map(([pair, ranges]) => [
      pair,
      Object.fromEntries(Object.entries(ranges).map(([tag, tps]) => [tag, [...tps]])),
    ]),
  );
  const wideLadderPairs = new Set(
    qualified
      .map((r) => `${r.bot}|${r.ind}`)
      .filter((pair) => !s.axis.perRange || qualifiedTags[pair].includes("")),
  );
  // grid.allSets (measurement): every indication builds its complete config sets — its best pair at Base (bot ×
  // lane, passed or not) and every pair that passed build every range they apply to, every target × stop × trail
  // × hold. Selection still requires the original qualified pair/range/target and independent config evaluation.
  // (Every pair's whole grid: ~12 M Micro tapes on 8 symbols.)
  // (`added`: the pairs allSets builds for measurement that did not pass Base — never counted as passed)
  let added = 0;
  const addedKeys = new Set<string>();
  if (s.grid?.allSets === true) {
    const best = new Map<string, ComboRun>();
    for (const r of s1) {
      if (isSignalInd(r.ind)) continue;
      if (!["", ...ALL_RANGE_TAGS].some((t) => rangeAppliesTo(r.ind, t, applies))) continue;
      const b = laneOf(r.ind).base;
      const x = best.get(b);
      if (!x || r.score > x.score) best.set(b, r);
    }
    const inPassed = new Set(passed.map((r) => `${r.bot}|${r.ind}`));
    for (const r of [...passed, ...best.values()]) {
      const k = `${r.bot}|${r.ind}`;
      pairTags[k] = ["", ...ALL_RANGE_TAGS].filter((t) => rangeAppliesTo(r.ind, t, applies));
      delete pairTps[k];
      delete pairCells[k];
      if (!inPassed.has(k)) {
        passed.push(r);
        inPassed.add(k);
        addedKeys.add(k);
        added++;
      }
    }
  }
  return { passed, qualified, qualifiedTags, qualifiedTps, qualifiedCells, wideLadderPairs, pairTags, pairTps, pairCells, added, addedKeys };
}

/** Paper deactivation and native admission preserve the same indication/range floor. */
export function liveMinPfOf(
  s: Pick<CoreSettings, "gates" | "live"> & Partial<Pick<CoreSettings, "exitStrategy">>,
  tag?: string,
  ind?: string,
  kind?: string,
): number {
  return Math.max(minPfOf(s.gates, kind === "exit" ? undefined : tag, ind), s.live.liveMinPf ?? 0,
    kind === "exit" ? (s.exitStrategy?.minPf ?? 0) : 0);
}

/** A failed pair retained for its open configs has no eligible ranges; an absent entry means unrestricted. */
export function restrictHeldBasePairs(
  pairTags: Record<string, readonly string[]>,
  heldPairs: ReadonlySet<string>,
): void {
  for (const pair of heldPairs) if (!Object.hasOwn(pairTags, pair)) pairTags[pair] = [];
}

function protectFloors(s: CoreSettings, rangeFitCutT?: number): EntryFloors {
  const fit = s.grid?.rangeFit;
  return {
    minSl: s.protectFloor?.minSl ?? DEFAULT_SETTINGS.protectFloor.minSl,
    minTrail: s.protectFloor?.minTrail ?? DEFAULT_SETTINGS.protectFloor.minTrail,
    // range cells fitted to the indication's horizon only when the fit is on; every computed tape is kept (the
    // gates decide the seats; a tape that cannot seat yet still shows in the evaluation and statistics)
    rangeFit: fit && fit.enabled !== false ? { ...DEFAULT_RANGE_FIT, ...fit } : null,
    ...(rangeFitCutT === undefined ? {} : { rangeFitCutT }),
    rangeMinN: 0,
    rangeMinTf: rangeMinTfOf(s.grid ?? {}),
  };
}

/** The pairs Base evaluates: the focus set plus the pinned pairs (a pinned pair must pass Base like any other);
 *  an empty focus means every combo, which includes the pinned pairs already. */
/** A live step running longer than this is abandoned by the watchdog (a fresh step re-reads the book). */
export const LIVE_STEP_LIMIT_MS = 180_000;

/** Mainnet (x01) validation floors: last N closes at entry and for a seat. */
export const MAINNET_LAST_N = 25;
export const MAINNET_VALID_LAST_N = 12;
/** Signals share the operator's Last-4 floor on every execution path. */
export const MAINNET_SIGNAL_VALID_LAST_N = SIGNAL_VALID_LAST_N;

export function baseFocus(s: CoreSettings): string[] {
  const f = s.focus ?? [];
  if (!f.length) return [...f];
  // Micro on its own indications trades only the "mc-" ones: a focus without them left Micro with no pair to
  // evaluate, so it never had a set (they point against the stretch themselves: the follow bot)
  // Only on the lanes Micro trades (its shortest lane, grid.micro.minTf, default 5m): a faster lane's Micro pair
  // could never build a set and only cost Base time.
  const microTf = rangeMinTfOf(s.grid ?? {}).mc ?? 0;
  const micro = microOwnInds(s.grid)
    ? microSpecs().flatMap((m) =>
        microTf > 0 && s.tfs?.length
          ? laneInds(m.id, s.tfs)
              .filter((ind) => (laneOf(ind).tf ?? 0) >= microTf)
              .map((ind) => `follow|${ind}`)
          : [`follow|${m.id}`],
      )
    : [];
  return [...new Set([...f, ...(s.pinned ?? []), ...micro])];
}

/**
 * Base partial progression: the combos this compute refreshes. Without a cache (first compute, settings or universe
 * changed) all of them; otherwise the next slice (every `slices`-th combo) plus any combo the cache does not hold.
 */
export function baseSlice<C>(
  combos: readonly C[],
  cache: { runs: ReadonlyMap<string, unknown>; slice: number } | null,
  slices: number,
  key: (c: C) => string,
): { todo: C[]; sliceNo: number } {
  if (!cache || slices <= 1) return { todo: [...combos], sliceNo: 0 };
  const sliceNo = (cache.slice + 1) % slices;
  return {
    todo: combos.filter((c, i) => i % slices === sliceNo || !cache.runs.has(key(c))),
    sliceNo,
  };
}

function mergeSettings(
  base: CoreSettings,
  ...patches: Array<SettingsPatch | undefined>
): CoreSettings {
  let out = {
    ...base,
    tfs: [...(base.tfs ?? DEFAULT_SETTINGS.tfs)],
    tfDays: { ...DEFAULT_SETTINGS.tfDays, ...(base.tfDays ?? {}) },
    gates: { ...base.gates },
    live: { ...base.live },
    toggles: { ...base.toggles },
    tactics: { ...base.tactics },
    focus: [...(base.focus ?? [])],
    pinned: [...(base.pinned ?? [])],
    disabledKinds: [...(base.disabledKinds ?? [])],
    block: { ...base.block },
    protectFloor: { ...DEFAULT_SETTINGS.protectFloor, ...(base.protectFloor ?? {}) },
    dca: { ...base.dca },
    relate: { ...DEFAULT_SETTINGS.relate, ...(base.relate ?? {}),
      sources: { ...DEFAULT_SETTINGS.relate.sources, ...(base.relate?.sources ?? {}) } },
    axis: { ...base.axis },
    grid: { ...base.grid },
    fees: { ...base.fees },
    adjust: { ...base.adjust },
    exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, ...(base.exitStrategy ?? {}) },
    signals: mergeSignals(base.signals),
    sizing: sizingSettings(base.sizing),
  };
  for (const p of patches) {
    if (!p) continue;
    out = {
      ...out,
      ...p,
      gates: { ...out.gates, ...(p.gates ?? {}) },
      exitStrategy: { ...out.exitStrategy, ...(p.exitStrategy ?? {}) },
      live: { ...out.live, ...(p.live ?? {}) },
      toggles: { ...out.toggles, ...(p.toggles ?? {}) },
      tactics: { ...out.tactics, ...(p.tactics ?? {}) },
      focus: p.focus ? [...p.focus] : out.focus,
      pinned: p.pinned ? [...p.pinned] : out.pinned,
      disabledKinds: p.disabledKinds ? [...p.disabledKinds] : (out.disabledKinds ?? []),
      block: { ...out.block, ...(p.block ?? {}) },
      dca: { ...out.dca, ...(p.dca ?? {}) },
      relate: { ...out.relate, ...(p.relate ?? {}),
        sources: { ...out.relate.sources, ...(p.relate?.sources ?? {}) } },
      axis: { ...out.axis, ...(p.axis ?? {}) },
      grid: mergeGridSettings(out.grid, p.grid),
      protectFloor: { ...out.protectFloor, ...(p.protectFloor ?? {}) },
      fees: { ...out.fees, ...(p.fees ?? {}) },
      adjust: { ...out.adjust, ...(p.adjust ?? {}) },
      signals: mergeSignals(out.signals, p.signals),
      sizing: sizingSettings({ ...out.sizing, ...(p.sizing ?? {}) }),
      tfs: p.tfs ? [...p.tfs] : out.tfs,
      tfDays: { ...out.tfDays, ...(p.tfDays ?? {}) },
    };
  }
  const live = { ...out.live, maxPositions: exchangePositionLimit(out.live.maxPositions) };
  delete (live as unknown as Record<string, unknown>).maxSymbols;
  return normalizeLanes({ ...out, cost: boundedModelCost(out.cost), live });
}

/**
 * Timeframe lanes: 1m is the base data and always processed; 5m / 15m / 30m are derived from it. The 1m backfill
 * covers the longest lane history. A research timeframe carried by an older preset is normalised to the lanes.
 */
export function normalizeLanes(s: CoreSettings): CoreSettings {
  const tfs = [...new Set([1, ...(s.tfs ?? DEFAULT_SETTINGS.tfs)])]
    .filter((x) => (TF_CHOICES as readonly number[]).includes(x))
    .sort((a, b) => a - b);
  const tfDays: Record<string, number> = { ...DEFAULT_SETTINGS.tfDays, ...(s.tfDays ?? {}) };
  for (const k of Object.keys(tfDays)) tfDays[k] = Math.min(45, Math.max(1, Math.round(tfDays[k])));
  return {
    ...s,
    tfMin: 1,
    tfs,
    tfDays,
    historyDays: Math.max(...tfs.map((tf) => tfDays[String(tf)] ?? s.historyDays)),
  };
}

/** Required physical candles include independent Signal evaluation plus simulator and indicator warmup. */
const sigEnabled = (s: CoreSettings) => s.signals.enabled;
export function signalDataHours(s: CoreSettings, wf: WalkForwardOptions): number {
  if (!s.signals.enabled) return 0;
  const slowest = Math.max(1, ...s.signals.lanes.filter((tf) => s.tfs.includes(tf)));
  return signalLaneDataHours(s, wf, slowest);
}
/** The 1m base lane uses its own tactic bars. Derived lanes retain their common warmup:
 * shortening it changed recursive/cross-lane source decisions at the evaluation boundary. */
export function signalLaneDataHours(s: CoreSettings, wf: WalkForwardOptions, tf: number): number {
  const warmupTf = tf === s.tfMin ? tf : Math.max(tf, ...s.signals.lanes.filter((lane) => s.tfs.includes(lane)));
  return 24 + signalHistoryHours(wf) + wf.simH + tacticWarmupBars(s.tactics) * warmupTf / 60;
}
function signalLaneSeriesOf(sym: string, cs: CandleSeries, s: CoreSettings, wf: WalkForwardOptions): Bars[] {
  const lanes = Object.freeze([...s.tfs]);
  return lanes.map((tf) => {
    const n = Math.ceil(signalLaneDataHours(s, wf, tf) * 60 / tf);
    const bars = tf === s.tfMin ? barsOfSeries(sym, tf, cs, cs.n - n, cs.n)
      : resampleTailBars(sym, cs, s.tfMin, tf, n);
    bars.lanes = lanes;
    return bars;
  });
}
/** Bound Signal work independently of an ordinary lane's longer storage/Last-N retention. */
export function signalLaneSeriesFrom(candles: ReadonlyMap<string, CandleSeries>, s: CoreSettings, wf: WalkForwardOptions): Bars[] {
  const out: Bars[] = [];
  for (const [sym, cs] of candles) out.push(...signalLaneSeriesOf(sym, cs, s, wf));
  return out;
}
/** General configs need their whole own evaluation window on every lane, plus replay and indicator warmup. */
export function strategyDataHours(s: CoreSettings, wf: WalkForwardOptions): number {
  const slowest = Math.max(1, ...s.tfs);
  return 24 + Math.max(wf.longH, wf.preH, wf.symH ?? 0) + wf.simH + tacticWarmupBars(s.tactics) * slowest / 60;
}
export function marketHistoryBars(s: CoreSettings, wf: WalkForwardOptions): number {
  return Math.ceil(Math.max(s.historyDays * 24, strategyDataHours(s, wf), signalDataHours(s, wf)) * 60 / s.tfMin);
}

/**
 * Every lane's series from base candles: the base as stored, 5m / 15m / 30m resampled (completed bars only), each
 * over its own history (tfDays) plus `extraDays` (a backtest window).
 */
export function laneSeriesFrom(
  candles: ReadonlyMap<string, CandleSeries>,
  s: CoreSettings,
  extraDays = 0,
  minHistoryH = 0,
): Bars[] {
  const out: Bars[] = [];
  for (const [sym, cs] of candles) out.push(...laneSeriesOf(sym, cs, s, extraDays, minHistoryH));
  return out;
}

/**
 * One symbol's lanes: the base as stored, each resampled lane from only the base bars of its last n + 1 buckets
 * (market/candle-series.ts resampleTailBars: the same bars as resampling everything and keeping the last n).
 */
export function laneSeriesOf(
  sym: string,
  cs: CandleSeries,
  s: CoreSettings,
  extraDays = 0,
  minHistoryH = 0,
): Bars[] {
  // the enabled lanes ride on every series (Bars.lanes): a combined lane agrees with the higher ENABLED lanes, the
  // ones laneInds generates it from (the whole ladder agreed with 15m / 30m on a desk running 1m and 5m only)
  const lanes = Object.freeze([...(s.tfs ?? [s.tfMin])]);
  const out: Bars[] = [];
  for (const tf of lanes) {
    const n = Math.max(laneBars(s, tf) + Math.round((extraDays * 24 * 60) / tf), Math.ceil(minHistoryH * 60 / tf));
    const b =
      tf === s.tfMin
        ? barsOfSeries(sym, tf, cs, cs.n - n, cs.n)
        : resampleTailBars(sym, cs, s.tfMin, tf, n);
    b.lanes = lanes;
    out.push(b);
  }
  return out;
}

/** History (bars of that timeframe) a lane is computed over. */
export const laneBars = (s: CoreSettings, tf: number) =>
  Math.round(((s.tfDays?.[String(tf)] ?? s.historyDays) * 24 * 60) / tf);

const G = globalThis as unknown as {
  __ctsCoreRuntime?: CoreRuntime;
  __ctsCoreRuntimes?: Map<ConnId, CoreRuntime>;
};

async function liveStep(r: CoreRuntime, intents: LiveIntent[], gen: number) {
  const { stepLive } = await import("./live.server.ts");
  const result = await stepLive(r, intents, gen);
  // Errors/disabled reads are not proof that a previously owned position disappeared.
  if (!result.error && result.enabled) {
    r.liveOrdersActive = result.control
      ? result.control.held.some((p) => p.qty > 0) ||
        (result.control.laneOrders?.pending ?? 0) > 0 ||
        result.control.actions.some((a) => /execution-pending/.test(a.msg ?? ""))
      : true;
  }
}

// ── One runtime per exchange connection ─────────────────────────────────────────────────────────────────────
// Every connection (x01 mainnet, vst-01, vst-02) has its own runtime: its own settings, presets, paper book, live
// ledger, state file and snapshot, and its own loop. They run side by side in the process and share only what is
// the same for all of them: the market feed (one request for every connection), the worker pool (capped at the
// cores, queued) and the exchange's rate-limit pause. The primary connection keeps the original state files, so an
// existing install keeps its data; the others get `<state>.<conn>.json` / `<snapshot>.<conn>.sqlite`.

export const CONN_IDS: readonly ConnId[] = ["bingx-vst-02", "bingx-vst-01", "bingx-x01"];
export const isConnId = (x: unknown): x is ConnId =>
  typeof x === "string" && (CONN_IDS as readonly string[]).includes(x);

/** The connection holding the original state: CTS_CORE_PRIMARY_CONN, else the saved live connection, else vst-02. */
export function primaryConn(): ConnId {
  const env = process.env.CTS_CORE_PRIMARY_CONN?.trim();
  if (isConnId(env)) return env;
  const live = coreDb().kvGet<Partial<CoreSettings>>("settings")?.live as
    { connId?: unknown } | undefined;
  return isConnId(live?.connId) ? live.connId : DEFAULT_SETTINGS.live.connId;
}

/**
 * Connections whose runtime runs. CTS_CORE_CONNS ("all" or a comma list) decides on the host; otherwise the saved
 * choice (Engine → connections); otherwise every connection. The primary connection always runs.
 */
export function enabledConns(): ConnId[] {
  const env = process.env.CTS_CORE_CONNS?.trim();
  const primary = primaryConn();
  let list: ConnId[];
  if (env) list = env === "all" ? [...CONN_IDS] : env.split(/[\s,]+/).filter(isConnId);
  else {
    const saved = coreDb().kvGet<unknown>("connsEnabled");
    list = Array.isArray(saved) ? saved.filter(isConnId) : [...CONN_IDS];
  }
  return CONN_IDS.filter((c) => c === primary || list.includes(c));
}

/** Switch a connection's runtime on or off (saved; the primary connection cannot be switched off). */
export function setConnEnabled(conn: ConnId, on: boolean): ConnId[] {
  if (conn === primaryConn() && !on) throw new Error("the primary connection always runs");
  const cur = new Set(enabledConns());
  if (on) cur.add(conn);
  else cur.delete(conn);
  const list = CONN_IDS.filter((c) => cur.has(c));
  coreDb().kvSet("connsEnabled", list);
  const r = runtimeFor(conn, { start: false });
  if (on) r.start();
  else r.shutdown("connection switched off");
  return list;
}

function attachLive(r: CoreRuntime) {
  // the live step is (re)attached from THIS module on every call: a callback kept from an older module
  // version imports through a module runner that a dev-server restart has closed, and then fails every cycle
  if ((r as { __liveFrom?: unknown }).__liveFrom !== liveStep) {
    r.onLive = liveStep;
    (r as { __liveFrom?: unknown }).__liveFrom = liveStep;
  }
}

/** Re-bind an instance created by an older module version (dev hot reload) to the current class. */
function rebind(cur: CoreRuntime | undefined): void {
  if (!cur || cur instanceof CoreRuntime) return;
  const r = cur as CoreRuntime;
  Object.setPrototypeOf(r, CoreRuntime.prototype);
  // settings added since the instance was created get their defaults
  r.settings = mergeSettings(DEFAULT_SETTINGS, r.settings);
  r.settings.live.maxPositions = exchangePositionLimit(r.settings.live.maxPositions);
  r.ensureFields();
}

/**
 * The runtime of a connection (created on first use). `start` (default): keep it running when its connection is
 * enabled. A new non-primary connection starts from the primary's settings and saved presets, with Live off.
 */
/**
 * A compute's new tapes plus the previous compute's tapes of the ranges a memory fallback carried over (engine tapes
 * only; an id the compute rebuilt anyway is not duplicated).
 */
export function withCarried(
  built: ConfigTape[],
  prev: readonly ConfigTape[],
  tags: ReadonlySet<string>,
  /** a carried tape this rejects (not among the current compute's Base-passed cells) is kept held-only: it manages its open position, takes no seat */
  allow?: (t: ConfigTape) => boolean,
): ConfigTape[] {
  const ids = new Set(built.map((t) => t.id));
  const carried = prev
    .filter((t) => !isSignalInd(t.ind) && !!t.protect.tag && tags.has(t.protect.tag) && !ids.has(t.id))
    .map((t) => (allow && !t.heldOnly && !allow(t) ? withHistoryMetadata(t, { heldOnly: true }) : t));
  // Mark shallow copies so reports can distinguish them from the current compute's built sets. The large typed-array
  // tape columns remain shared; only metadata is copied.
  return carried.length ? [...built, ...carried.map((t) => withHistoryMetadata(t, { carried: true }))] : built;
}

/**
 * Under a memory fallback, the carried configs the paper book holds (seated, or with an open position): rebuilt on
 * the current bars (onlyIds) so they keep taking entries and closing on new bars — a carried tape ends at the previous
 * compute's last bar. Null when paper holds none. `protects` / `dcaProtects`: the carried ranges' cells of the full
 * (unfiltered) grid.
 */
export function carriedRebuild(
  prev: readonly ConfigTape[],
  tags: ReadonlySet<string>,
  held: ReadonlySet<string>,
  protects: readonly Protect[],
  dcaProtects: readonly Protect[],
): { ids: Set<string>; pairs: Set<string>; protects: Protect[]; dcaProtects: Protect[] } | null {
  const ids = new Set<string>();
  const pairs = new Set<string>();
  for (const t of prev)
    if (!isSignalInd(t.ind) && !!t.protect.tag && tags.has(t.protect.tag) && held.has(t.id)) {
      ids.add(t.id);
      pairs.add(`${t.bot}|${t.ind}`);
    }
  if (!ids.size) return null;
  const inTags = (p: Protect) => !!p.tag && tags.has(p.tag);
  return { ids, pairs, protects: protects.filter(inTags), dcaProtects: dcaProtects.filter(inTags) };
}

/**
 * Test-only (explicit opt-in, never set on a desk): CTS_CORE_MARKET=synthetic runs the app's runtimes on the
 * synthetic market with no network (no ticker feed, no price stream), with CTS_CORE_TEST_SETTINGS (JSON) applied —
 * the UI functional test renders every page on real computed numbers this way.
 */
function testMarket(): {
  settings?: SettingsPatch;
  opts: { market?: "synthetic"; feed?: Partial<MarketFeed>; priceStream?: null };
} {
  if (process.env.CTS_CORE_MARKET !== "synthetic") return { opts: {} };
  const settings = process.env.CTS_CORE_TEST_SETTINGS
    ? (JSON.parse(process.env.CTS_CORE_TEST_SETTINGS) as SettingsPatch)
    : undefined;
  return {
    settings,
    opts: { market: "synthetic", feed: { tickers: async () => [] }, priceStream: null },
  };
}

export function runtimeFor(conn?: ConnId, opts: { start?: boolean } = {}): CoreRuntime {
  const primary = primaryConn();
  const c = conn ?? primary;
  let r: CoreRuntime;
  if (c === primary) {
    rebind(G.__ctsCoreRuntime);
    // the shared database also gets this version's methods and tables (hot reload)
    if (G.__ctsCoreRuntime) coreDb();
    if (!G.__ctsCoreRuntime)
      G.__ctsCoreRuntime = new CoreRuntime(coreDb(), testMarket().settings, {
        conn: c,
        ...testMarket().opts,
      });
    r = G.__ctsCoreRuntime;
  } else {
    const map = (G.__ctsCoreRuntimes ??= new Map());
    rebind(map.get(c));
    let x = map.get(c);
    if (!x) {
      const db = connDb(c);
      if (!db.kvGet("settings")) {
        // first use: the primary's settings and presets, Live off (a connection is armed on purpose, never by copy)
        const base = runtimeFor(primary, { start: false });
        db.kvSet("settings", {
          ...structuredClone(base.settings),
          live: { ...base.settings.live, enabled: false, connId: c },
        });
        db.kvSet("wf", base.db.kvGet("wf") ?? {});
        const presets = base.db.kvGet("presets");
        if (presets) db.kvSet("presets", structuredClone(presets));
      }
      x = new CoreRuntime(db, testMarket().settings, {
        conn: c,
        snapshotPath: connPath(process.env.CTS_CORE_SNAPSHOT || "", c) ?? "",
        ...testMarket().opts,
      });
      map.set(c, x);
    }
    r = x;
  }
  attachLive(r);
  if (opts.start !== false && enabledConns().includes(c)) r.ensureAlive();
  return r;
}

/** A connection's runtime if it exists (never creates one). */
export function existingRuntime(conn: ConnId): CoreRuntime | null {
  if (conn === primaryConn()) return G.__ctsCoreRuntime ?? null;
  return G.__ctsCoreRuntimes?.get(conn) ?? null;
}

/** Every runtime created so far (primary first). */
export function allRuntimes(): CoreRuntime[] {
  const out: CoreRuntime[] = [];
  if (G.__ctsCoreRuntime) out.push(G.__ctsCoreRuntime);
  for (const r of G.__ctsCoreRuntimes?.values() ?? []) out.push(r);
  return out;
}

/** The primary connection's runtime (kept running). Scripts and tests use it as the one engine. */
export function coreRuntime(): CoreRuntime {
  const r = runtimeFor(undefined, { start: false });
  r.ensureAlive();
  return r;
}

/** Demo probe for a test run (never on mainnet): see WalkForwardOptions.probe. */
export function setProbe(rt: CoreRuntime, perRange: number, perCell = 0): void {
  if (rt.settings.live.connId === "bingx-x01")
    throw new Error("the probe is for demo connections only");
  rt.wf.probe =
    perRange > 0 || perCell > 0
      ? {
          perRange: Math.min(20, Math.max(0, Math.floor(perRange))),
          ...(perCell > 0 ? { perCell: Math.min(5, Math.floor(perCell)) } : {}),
        }
      : null;
  rt.kick();
}
