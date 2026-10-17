Warning: truncated output (original token count: 87544)
Total output lines: 7670

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
  GENERAL_RANGE,
  MAX_BACKTEST_DAYS,
  GRID_VARIANTS_MAX,
  exchangePositionLimit,
  LONG_RANGE,
  MINIMAL_RANGE,
  SHORT_RANGE,
  STRATEGY_PRESETS,
  TF_CHOICES,
  type CoreSettings,
  type SettingsPatch,
} from "../config.ts";
import {
  gateMinimalPlus,
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
import { isBreakRelInd } from "../indications/break-config.ts";
import { sharedFeed } from "../market/shared-feed.ts";
import { catchUp } from "./loop-budget.ts";
import { evalFamilyMatch, familiesNarrowBase, familyTags, parseEvalFamilies, type EvalFamily } from "../eval-family.ts";
import { partitionByIndication } from "./partition.ts";
import { diffPositions, diffTrades, type WrittenPos } from "./paper-rows.ts";
import type { ConnId } from "../exchange/bingx.server.ts";
import { tacticWarmupBars } from "../indications/filters.ts";
import { adjustTrades, evaluateAdjust, pausedSets, type AdjustState } from "../adjust.ts";
import { prehistStatsGen, type PrehistStats } from "../prehist.ts";
import {
  abortWorkers,
  isWorkersAbort,
  poolSize,
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
import type { Bars, BlockConfig, Candle, OpenPosition, Protect, Trade } from "../domain/types.ts";
import { syntheticCandles, tailBars, headBars } from "../market/bars.ts";
import { CandleSeries, barsOfSeries, headroomFor, resampleTailBars } from "../market/candle-series.ts";
import { startStallProbe, type StallProbe } from "./stall-probe.server.ts";
import { BaseConfigJobRunner, baseConfigJobKey, type BaseConfigJob, type BaseConfigSnapshot, type BaseConfigSummary } from "./base-config-job.server.ts";
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
import { noteRateLimit, rateLimitedUntil } from "../exchange/bingx.server.ts";
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
  baseRangeCounts,
  baseGateSensitivity,
  baseRangeWhy,
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
  laneInds,
  makeUniverse,
  seriesOf,
  forgetCombo,
  microLaneFloor,
  runCombo,
  runPipeline,
  slim,
  type PipelineOutput,
  type PipelineProgress,
} from "../pipeline/pipeline.ts";
import {
  buildTapesGen,
  kindExecutable,
  defaultWalkForward,
  selectAt,
  selectDurable,
  selectFixedGen,
  withProbe,
  execDecision,
  walkForwardGen,
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
  openDupKey,
  gridVariants,
  type ConfigTape,
  type EntryFloors,
  type TapeBuildStat,
  floorsForPairs,
  mergeBuildStats,
  DEFAULT_RANGE_FIT,
  protectGrid,
  type WalkForwardOptions,
  type WalkForwardResult,
  lowerBound,
  tradeAt,
  selectionScoreAt,
  positionMult,
  positionVolume,
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
  engineProven,
  liveEntryOk,
  liveGate,
  liveGroupGates,
  liveGroupOf,
  promotionGate,
  type LiveGate,
  type LiveValidationStatus,
  type LivePromotionStatus,
} from "../live-validation.ts";
import { exchangeAcceptIndex, executionRecordKey, liveRecords, ownedPaperExecutionRecords, postBaseExecutionRecords, type LiveRecord } from "../live-record.ts";
import { signalActiveHas, type ExchangeAccept } from "../signals.ts";
import {
  isSignalCoordinationInd,
  signalCoordinationHistory,
  signalCoordinationRanges,
} from "../signal-coordination.ts";
import { volumeFactorForIndication } from "../volume-factor.ts";

import os from "node:os";
import { isDeepStrictEqual } from "node:util";
import { type BlockBook, blockBookOf, blockStackCap } from "../sim/block.ts";
import { trailBar } from "../sim/backtest.ts";
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
} from "../signals.ts";
import {
  emptySignalHistDiagnostics,
  heldHistProtects,
  heldCoordinationProtects,
  signalHistProtectsGen,
  type SignalHistDiagnostics,
  type SignalHistValidation,
} from "../signal-hist.ts";
import type { SignalAccept, SignalSettings } from "../signal-config.ts";
import { PriceStream, type StreamStats } from "./stream.server.ts";
import { isSignalInd, laneOf, signalSourceOf } from "../indications/registry.ts";
import { orderKey, sizeBook, sizeBookGen, sizingSettings } from "../sizing.ts";
import { presetSeries, type PresetSeries } from "../statistics.ts";
import { modeledUnitReturn as unitReturn, modeledUnitStatsOf as unitStatsOf } from "../metrics/stats.ts";
import { promoteLaneKey, validPromotedLaneProof } from "../live-promote.ts";
import { auditState, auditStateGen, type AuditInput, type AuditReport } from "../audit.ts";
import { closedPositions, openTimeline } from "../positions.ts";
import { backfillLabel, batchesOf, DONE_STAGE, estimatedFraction, overallOf, pipelineStage } from "../progress.ts";
import { connDb, connPath, coreDb, type CoreDb } from "./db.server.ts";

const H = 3_600_000;
const SLICE_MS = 12;
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
const CONTROL_TRAIL_MS = 250;
/**
 * Realtime entries are Break-only by default. `1` enables every selected indication; `0`/`off` disables this path.
 * This keeps the new Break live path scoped while leaving the existing broad rollout explicitly operator-controlled.
 */
export type FastEntryMode = "off" | "break" | "all";
export function fastEntryMode(raw = process.env.CTS_CORE_FAST_ENTRIES): FastEntryMode {
  const x = raw?.trim().toLowerCase();
  if (x === "1" || x === "all") return "all";
  if (x === "0" || x === "off") return "off";
  if (x === "break") return "break";
  return x ? "off" : "break";
}
const FAST_ENTRY_MODE = fastEntryMode();
const FAST_ENTRIES = FAST_ENTRY_MODE !== "off";
export function fastEntryLaneDue(ind: string, barOpenT: number, baseTfMin: number, mode = FAST_ENTRY_MODE): boolean {
  return mode !== "off" && (mode === "all" || isBreakRelInd(ind)) &&
    laneClosesWith(barOpenT, baseTfMin, laneOf(ind).tf ?? baseTfMin);
}
/** Replace refreshed tape identities while preserving all unrelated tapes. */
export function mergeFastTapes<T extends { id: string }>(current: readonly T[], refreshed: readonly T[]): T[] {
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
  return Number.isFinite(lastOpenT) && Number.isFinite(nowT) && tfMin > 0 &&
    lastOpenT + tfMin * 60_000 + KLINE_FINALITY_MS <= nowT;
}
export function fastBarFresh(barCloseT: number, nowT: number, maxDelayMs = FAST_BAR_MAX_DELAY_MS): boolean {
  return Number.isFinite(barCloseT) && Number.isFinite(nowT) && nowT >= barCloseT && nowT - barCloseT <= maxDelayMs;
}
/** its bar tail: the longest hold a position blocks a re-entry for (signals 48 h), and the indicators' warm-up bars */
const FAST_TAIL_H = 48;
const FAST_WARMUP_BARS = 200;
/** the live step's share of one tick for advancing the Block / acceptance books over a fresh run's feed, ms */
const BOOK_CATCHUP_MS = 15;
/** the paper step feeds the Block book / signal guard this many feed entries a slice before its entries */
const BOOK_FEED_SLICE = 200;
const BACKTEST_LIMIT_MS = 15 * 60_000;
/** workers that failed are tried again after this long */
const WORKERS_RETRY_MS = 10 * 60_000;
/** paper book rows written per transaction (one slice) */
const PAPER_ROWS = 500;
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
  /** paper steps completed, and the compute (status.computes) the last one stepped on — 0 = none yet */
  paperSteps?: number;
  paperCompute?: number;
  cycles: number;
  computes: number;
  startedAt: number;
  heartbeat: number;
  lastCycleMs: number;
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
    coordinationPairs?: number;
    coordinationConfigs?: number;
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
    pf?: number;
    net?: number;
    /** positions (symbol × direction) and orders (all orders and partials) of the simulated signal book */
    positions?: number;
    orders?: number;
    peakPositions?: number;
    peakOrders?: number;
    /** open now in the paper book: positions / orders */
    openPositions?: number;
    openOrders?: number;
  };
  /** Base config sets evaluated / passing the Base gate (PF ≥ min PF) in the last compute */
  baseEvaluated?: number;
  basePassed?: number;
  /** pairs grid.allSets built for measurement without passing Base (not validated; apart from basePassed) */
  baseBuilt?: number;
  /** the passed count of the last computes (bounded; the events table keeps the long record): continuity of Base */
  baseHistory?: Array<{ at: number; compute: number; passed: number; built: number; byRange: Record<string, number> }>;
  /** tapes released at the start of the last compute's Tapes phase (partial processing: slimTapes) */
  tapesReleased?: number;
  /** after the Base PF evaluation, per range type (Wide, Micro … Long, Signals): sets evaluated / passed and PF */
  baseByRange?: Array<BaseRangeCount & { range: string; enabled: boolean }>;
  /** Exact causal Base config counts, separate from the representative pair counts above. */
  baseConfigs?: BaseConfigSummary;
  /** counts of the listings of the last paper step (CoreRuntime.listings; the pages page through coreListing) */
  listings?: { paperStep: number; at: number; validated: number; active: number; proven: number | null; byRange: Array<{ range: string; validated: number; pf: number | null }> };
  /** the preset comparison after the paper step (comparePresets): running, presets done / total, when it last finished */
  compare?: { running: boolean; done: number; total: number; at?: number; error?: string };
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
  /** where Base runs: worker cores, or in-process and why */
  workers?: string;
  /** event-loop delay over the last compute (ms) */
  loop: { p50: number; p99: number; max: number };
  /**
   * the realtime entry step's last run (CTS_CORE_FAST_ENTRIES): the bar it ran on, its time, the seated configs it
   * rebuilt, their open positions on the current bars, and how many the paper book took
   */
  fast?: { at: number; bar: number; ms: number; delayMs?: number; seated: number; open: number; added: number; error: string | null };
  /** the last event-loop stalls over 150 ms, with what was running (the live tick waits behind them) */
  stalls?: Array<{ at: number; ms: number; where: string }>;
  /** the last probed stalls (CTS_CORE_STALL_PROBE=1): what the main thread did during each (stall-probe.server.ts) */
  stallProbes?: Array<StallProbe & { where: string }>;
  /** live validation of the selected configs (live last N) */
  liveValidation?: LiveValidationStatus;
  livePromotion?: LivePromotionStatus;
  engineProof?: { n: number; minPf: number; judged: number; proven: number; unknown: number; unknownConfigs: number; pfBasis: "unit-net-returns" };
  /**
   * tape positions the paper step did not open, by reason (notSelected, stale, duplicate, liveValidation,
   * heldBack:<why>, exec:<why>, cap:<which>; signal ones prefixed "sig:"), and the pending entries the live adapter was
   * not offered ("pending:…", per call)
   */
  paperSkips?: Record<string, number>;
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
const posIdLegacy = (p: { cfg: string; sym: string; entryT: number }) => `${p.cfg}|${p.sym}|${p.entryT}`;

/** true when `px` is at or through the position's stop (long: at or below, short: at or above) */
export function crossedStop(p: { side: number; stop: number }, px: number): boolean {
  if (!(p.stop > 0) || !(px > 0)) return false;
  return p.side === 1 ? px <= p.stop : px >= p.stop;
}

/**
 * The exit level a tick price reached (0 = none): the stop, else the target — as the simulation exits (a target
 * reached exits there, unless the position trails free with its trail armed). Only the stop was checked at tick
 * time: a target reached intrabar kept the lane's volume on the exchange until the bar-closed compute (1.5–2 min
 * on x01) while the paper book had already taken its profit.
 */
/** A paper position's trail state while the tick follows it (its lane bar, and that bar's high and low so far). */
export interface TickTrail {
  side: number;
  entry: number;
  stop: number;
  peak: number;
  trailOn: boolean;
  trail?: number;
  trailDist?: number;
  tkBar?: number;
  tkHi?: number;
  tkLo?: number;
}

/**
 * The tick's trailing between computes: the prices of the position's lane bar (5 / 15 / 30 min …) are followed, and
 * when that bar closes the simulation's own rule advances the peak and the trailing stop (trailBar). Without it a
 * trailing stop stood where the last paper step left it until the next compute (minutes on x02, 7 Oct) — the tick
 * then exited a reversal at an old level. Returns whether the stop moved.
 */
export function tickTrail(p: TickTrail, px: number, now: number, tfMs: number): boolean {
  if (!(p.trail && p.trail > 0) || !(px > 0) || !(tfMs > 0)) return false;
  const bar = Math.floor(now / tfMs);
  if (p.tkBar === undefined) {
    p.tkBar = bar;
    p.tkHi = px;
    p.tkLo = px;
    return false;
  }
  if (bar !== p.tkBar) {
    const moved = trailBar(p, p.trail, p.trailDist ?? p.trail, p.tkHi ?? px, p.tkLo ?? px);
    p.tkBar = bar;
    p.tkHi = px;
    p.tkLo = px;
    return moved;
  }
  if (px > (p.tkHi ?? px)) p.tkHi = px;
  if (px < (p.tkLo ?? px)) p.tkLo = px;
  return false;
}

/**
 * A rebuilt paper position (a new compute's tape) keeps what the tick advanced since: the tape stops at its data
 * end, the tick saw the bars after it — the stop and peak are only ever carried further (long up, short down), and
 * the bar being followed continues. Same position only (posId); a non-trailing position keeps the tape's.
 */
export function carryTrail(
  op: TickTrail,
  prev: TickTrail | undefined,
): Partial<Pick<TickTrail, "stop" | "peak" | "trailOn" | "tkBar" | "tkHi" | "tkLo">> {
  if (!prev || !(op.trail && op.trail > 0)) return {};
  const long = op.side === 1;
  return {
    stop: long ? Math.max(op.stop, prev.stop) : Math.min(op.stop, prev.stop),
    peak: long ? Math.max(op.peak, prev.peak) : Math.min(op.peak, prev.peak),
    trailOn: op.trailOn || prev.trailOn,
    ...(prev.tkBar !== undefined ? { tkBar: prev.tkBar, tkHi: prev.tkHi, tkLo: prev.tkLo } : {}),
  };
}

export function crossedExit(
  p: { side: number; stop: number; target?: number; trailOn?: boolean; trailOnly?: boolean; trailFree?: boolean },
  px: number,
  trailFree = false,
): number {
  if (crossedStop(p, px)) return p.stop;
  const t = p.target ?? 0;
  if (!(t > 0) || !(px > 0) || p.trailOnly || ((p.trailFree ?? trailFree) && p.trailOn)) return 0;
  return (p.side === 1 ? px >= t : px <= t) ? t : 0;
}

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
      /** when the paper book first held this position (its entry delay is heldAt − entryT) */
      heldAt?: number;
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
type BooksAt = ((t: number) => { book: BlockBook | null; guard: SignalGuard | null; direction: CandidateDirectionBook | null }) & {
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
function* compactByCarryGen(tapes: readonly ConfigTape[]): Generator<number, ConfigTape[]> {
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
    const g = compactTapesGen(idx.map((i) => tapes[i]));
    for (let r = g.next(); ; r = g.next()) {
      if (r.done) {
        r.value.forEach((c, j) => (out[idx[j]] = c));
        break;
      }
      yield done + r.value;
    }
    done += idx.length;
  }
  return out;
}

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
  /** the market is a replayed window (see the constructor option) */
  private replay = false;
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
  /** last klines request per symbol (a bar the exchange has not published yet is not re-asked every cycle) */
  private klinesAt = new Map<string, number>();
  /** self-audit after every paper step (invariants recomputed from the published state) */
  audit: AuditReport | null = null;
  private lastAuditKey = "";
  /** held positions carried without their tape at the last paper step (event on change) */
  private carriedMissing = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private dirty = true;
  /**
   * settings changed and not yet taken by a compute: the live step waits for the book they produce. Only this — a
   * failed or memory-delayed compute (also dirty) keeps the live control running on the current book (closes when
   * lanes end, stop repair, reduces).
   */
  private settingsStale = false;
  /**
   * the compute that would take the changed settings is held back for memory (memWait): the live control runs on the
   * current book meanwhile, with the current live settings — it never stops for as long as the pressure lasts (bug
   * hunt, 13 Oct: closes, trail updates and stop mirrors stopped while the desk waited). Cleared when a compute starts.
   */
  private memDeferred = false;
  /** the paper step's live validation for new entries (null = off) */
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
    if (process.env.CTS_CORE_STALL_PROBE === "1") this.stallProbe = startStallProbe((p) => this.noteStallProbe(p));
    this.stallTimer = setInterval(() => {
      this.stallProbe?.beat();
      const now = performance.now();
      const late = now - last - 50;
      last = now;
      if (late < 150) return;
      const where = `${this.busyPhase || this.status.stage || "idle"}${this.livePhase ? ` · live ${this.livePhase}` : ""}`;
      const xs = (this.status.stalls ??= []);
      xs.push({ at: Date.now(), ms: Math.round(late), where });
      if (xs.length > 30) xs.splice(0, xs.length - 30);
    }, 50);
    (this.stallTimer as { unref?: () => void }).unref?.();
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
      evaluationFromT?: number;
    } = {},
  ) {
    if (opts.evaluationFromT !== undefined) {
      if (!opts.replay || opts.conn || !Number.isFinite(opts.evaluationFromT) || opts.evaluationFromT < 0)
        throw new Error("evaluationFromT is a finite nonnegative boundary for unconnected replays only");
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
    const savedWf = migrateWfCaps(db);
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
      for (const p of presets)
        p.settings.gates = { ...(p.settings.gates ?? {}), maxDdtH: 35 };
      db.kvSet("presets", presets);
      db.kvSet("settings", this.settings);
      db.kvSet("ddtMax35", true);
    }
    this.settings.gates.maxDdtH = Math.min(35, Math.max(2, this.settings.gates.maxDdtH));
    this.wf = {
      ...defaultWalkForward(this.settings),
      ...pickWf(savedWf),
    };
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
    const book = this.db.kvGet<{ startedAt?: number; selected?: string[]; positions?: PaperBook["positions"]; ownedEntryAllocations?: Array<[string, { unitUsd: number; vol: number }]> }>(
      "paperBook",
    );
    if (!book || !Array.isArray(book.positions)) return 0;
    this.paper.positions = book.positions;
    this.paperOwnedAllocations = new Map((book.ownedEntryAllocations ?? []).filter((row) => Array.isArray(row) && typeof row[0] === "string" &&
      row[1] && Number.isFinite(row[1].unitUsd) && row[1].unitUsd > 0 && Number.isFinite(row[1].vol) && row[1].vol > 0));
    for (const p of this.paper.positions) {
      const own = parseConfigId(p.cfg)?.protect;
      if (own?.trailOnly) {
        p.trailOnly = true;
        p.trailFree = false;
        p.target = 0;
        p.trail ??= own.trail;
        p.trailDist ??= own.trail * (own.trailStep ?? 1);
      }
    }
    this.paper.selected = Array.isArray(book.selected) ? book.selected : [];
    if (typeof book.startedAt === "number" && book.startedAt > 0) this.paper.startedAt = book.startedAt;
    return book.positions.length;
  }

  /** Current loop generation (live steps abort when it changes). */
  get generation(): number {
    return this.gen;
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
    this.restTickersAt = Date.now();
    try {
      const t = await this.feed.tickers();
      if (t.length) {
        this.tickers = t;
        this.tickersAt = Date.now();
      }
    } catch {
      /* keep last; tickersAt tells the caller how old they are */
    }
    return this.tickers;
  }

  start() {
    if (this.disposed) throw new Error("runtime disposed");
    if (!this.stopped && this.status.state !== "idle" && this.status.state !== "error") return;
    if (this.snapshotPath) this.db.journalPath = `${this.snapshotPath}.journal`;
    if (this.status.state === "idle" && this.snapshotPath && this.db.restore(this.snapshotPath)) {
      // the ledger writes since that snapshot (a crash between snapshots loses none of them)
      const n = this.db.replayJournal();
      this.baseConfigRunner.restore(this.db.kvGet<BaseConfigSnapshot>("baseConfigCounts"));
      this.db.event("info", `restored snapshot ${this.snapshotPath}${n ? ` + ${n} journaled write(s)` : ""}`);
      // the paper book the snapshot carries (an empty book here held nothing: every unselected config's position
      // was closed on the exchange after the first compute)
      if (!this.paper.positions.length && !this.paper.selected.length) {
        const p = this.restorePaperBook();
        if (p) this.db.event("info", `paper book continued from the snapshot: ${p} open position(s)`);
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
    if (this.tickTimer) return;
    if (!this.stream && this.market === "bingx" && this.priceStream) this.stream = this.priceStream();
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
              if (this.tickTimer && !this.stopped) loop();
            });
        },
        Math.max(20, this.settings.tickMs ?? 100),
      );
      (this.tickTimer as { unref?: () => void }).unref?.();
    };
    loop();
  }

  private stopTick() {
    if (this.tickTimer) clearTimeout(this.tickTimer);
    this.tickTimer = null;
    this.stream?.stop();
    // a restarted tick re-follows the universe (the stream reconnects)
    this.streamKey = "";
  }

  /** Σ closed paper orders × their unit: recomputed only when the paper book changes, not on every tick. */
  private closedMemo: { trades: unknown; units: unknown; n: number; notional: number; sum: number } | null = null;
  private closedPaperSum(): number {
    const { trades, units } = this.paper;
    const notional = this.settings.paperNotional;
    const m = this.closedMemo;
    if (m && m.trades === trades && m.units === units && m.n === trades.length && m.notional === notional)
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
    groups: Array<{ sym: string; idx: number[]; px: number; sum: number }>;
  } | null = null;
  private tickBook() {
    const positions = this.paper.positions;
    const units = this.paperUnits();
    const cost = this.settings.cost;
    const m = this.tickMemo;
    if (m && m.positions === positions && m.units === units && m.cost === cost) return m;
    const by = new Map<string, { sym: string; idx: number[]; px: number; sum: number }>();
    for (let i = 0; i < positions.length; i++) {
      const sym = positions[i].sym;
      let g = by.get(sym);
      if (!g) by.set(sym, (g = { sym, idx: [], px: NaN, sum: 0 }));
      g.idx.push(i);
    }
    this.tickMemo = { positions, units, cost, groups: [...by.values()] };
    return this.tickMemo;
  }

  /** The open paper orders' units, in book order (order keys built once per paper book, not on every tick). */
  private unitMemo: { positions: unknown; units: unknown; notional: number; a: Float64Array } | null = null;
  private paperUnits(): Float64Array {
    const { positions, units } = this.paper;
    const notional = this.settings.paperNotional;
    const m = this.unitMemo;
    if (m && m.positions === positions && m.units === units && m.notional === notional && m.a.length === positions.length)
      return m.a;
    const a = new Float64Array(positions.length);
    for (let i = 0; i < positions.length; i++) a[i] = units?.get(orderKey(positions[i])) ?? notional;
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
    adjust: AdjustState | null;
  } | null = null;
  /** a paper step (full or realtime) owns the book */
  private paperRunning = false;
  /** the compute is replacing its tapes and run: no realtime step until the full paper step has run on them */
  private fastHold = false;
  private fastBusy = false;
  /** the newest bar the realtime entry step has run on */
  private fastBarDone = 0;
  /** Resolves once no paper step runs (the full and the realtime step never interleave their slices). */
  private async paperIdle(): Promise<void> {
    while (this.paperRunning) await new Promise((r) => setTimeout(r, 10));
  }

  /**
   * The realtime entry step (Break-only by default; CTS_CORE_FAST_ENTRIES=1 selects all types): on each new closed
   * lane bar — also while a compute runs — seated configs are rebuilt on a short tail in a priority worker (onlyIds)
   * and their tape refresh is published to both live modes before the paper book takes positions with the usual gates.
   */
  private async fastStep(): Promise<void> {
    const a = this.fastArgs;
    if (this.replay || !a || this.fastBusy || this.fastHold || this.paperRunning || !this.paperStepped || !this.sim || !this.lastSelection) return;
    const bar = this.status.lastBarT;
    if (!(bar > this.fastBarDone)) return;
    const barEnd = bar + this.settings.tfMin * 60_000;
    const startAt = Date.now();
    if (!fastBarFresh(barEnd, startAt)) {
      this.fastBarDone = bar;
      this.status.fast = {
        at: startAt, bar, ms: 0, delayMs: Math.max(0, startAt - barEnd),
        seated: 0, open: this.paper.positions.length, added: 0,
        error: "closed candle is stale; late entry suppressed",
      };
      return;
    }
    if (!workersAvailable() || this.workersBroken) {
      this.fastBarDone = bar;
      this.status.fast = {
        at: startAt, bar, ms: 0, delayMs: Math.max(0, startAt - barEnd),
        seated: 0, open: this.paper.positions.length, added: 0,
        error: "priority worker unavailable; full compute path remains active",
      };
      return;
    }
    this.fastBusy = true;
    const gen = this.gen;
    const t0 = performance.now();
    const s = this.settings;
    try {
      const byId = this.tapeIndex();
      const ids = { main: new Set<string>(), sig: new Set<string>(), coord: new Set<string>() };
      const pairs = { main: new Set<string>(), sig: new Set<string>(), coord: new Set<string>() };
      for (const id of this.paper.selected ?? []) {
        const tp = byId.get(id);
        if (!tp) continue;
        // Keep realtime work scoped to the configured mode and run each selected lane only at its candle close.
        if (!fastEntryLaneDue(tp.ind, bar, s.tfMin, FAST_ENTRY_MODE)) continue;
        const k = isSignalCoordinationInd(tp.ind) ? "coord" : isSignalInd(tp.ind) ? "sig" : "main";
        ids[k].add(id);
        pairs[k].add(`${tp.bot}|${tp.ind}`);
      }
      if (!ids.main.size && !ids.sig.size && !ids.coord.size) {
        this.fastBarDone = bar;
        return;
      }
      // the tail: FAST_TAIL_H of history (a position held that long still blocks a re-entry, as in the full tapes)
      // plus the slowest lane's indicator and tactic warm-up
      const maxTf = Math.max(...(s.tfs ?? [s.tfMin]));
      const tail1m = Math.round((FAST_TAIL_H * 60) / s.tfMin) + (FAST_WARMUP_BARS + tacticWarmupBars(s.tactics)) * Math.ceil(maxTf / s.tfMin);
      // per symbol, a yield between them (all at once was a 60–90 ms block at 30 symbols)
      const lanes: ReturnType<typeof laneSeriesFrom> = [];
      for (const [sym, cs] of this.candles) {
        lanes.push(...laneSeriesOf(sym, cs.tail(tail1m), s));
        await yieldNow();
        if (gen !== this.gen || this.fastHold) return;
      }
      const u = makeUniverse(lanes, this.evaluationFromT);
      // every series (the short ones too): the worker's market reference is the main thread's (Universe.series)
      const shared = shareBars(u.series);
      const msgs: Array<Record<string, unknown>> = [];
      for (const k of ["main", "sig", "coord"] as const)
        if (ids[k].size)
          msgs.push({
            type: "tapes",
            evaluationFromT: this.evaluationFromT,
            bars: shared,
            pairs: [...pairs[k]],
            protects: a[k].protects,
            cost: s.cost,
            dcaOpt: a[k].dcaFor,
            tactics: s.tactics,
            adjust: a.adjust,
            floors: { ...a[k].floors, onlyIds: ids[k] },
          });
      const res = await runOnWorkers<{ tapes: ConfigTape[] }>(msgs, poolSize(), 120_000, undefined, true);
      if (gen !== this.gen || this.fastHold || this.paperRunning) return;
      if (!fastBarFresh(barEnd, Date.now())) {
        this.fastBarDone = bar;
        this.status.fast = {
          at: Date.now(), bar, ms: Math.round(performance.now() - t0), delayMs: Math.max(0, Date.now() - barEnd),
          seated: ids.main.size + ids.sig.size + ids.coord.size, open: this.paper.positions.length, added: 0,
          error: "closed candle aged out during processing; late entry suppressed",
        };
        return;
      }
      // Publish refreshed seated tapes as well as paper opens: Entries mode reads pending from tapes; Overall mode
      // reads the positions below. Without both, only one live mode saw the fast result.
      const refreshed = res.flatMap((r) => r.tapes);
      if (refreshed.length) this.tapes = mergeFastTapes(this.tapes, refreshed);
      // the rebuilt configs' open positions, and their signals on a lane bar that closed now as entries at the open of
      // the bar that starts (as the simulation enters them: next open) — not one lane bar later at a moved price
      const priceOf = (sym: string) => this.stream?.price(sym) ?? this.candles.get(sym)?.lastC();
      const opens = new Map<string, OpenPosition[]>();
      for (const r of res)
        for (const tp of r.tapes) opens.set(tp.id, [...tp.open, ...pendingAsOpen(tp, barEnd, s.tfMin, priceOf, s.cost)]);
      const before = this.paper.positions.length;
      this.paperRunning = true;
      try {
        await this.driveSliced("Realtime", this.stepPaperGen({ opens, t: barEnd }), gen, () => undefined);
      } finally {
        this.paperRunning = false;
      }
      this.fastBarDone = bar;
      const n = [...opens.values()].reduce((x, o) => x + o.length, 0);
      this.status.fast = {
        at: Date.now(),
        bar,
        ms: Math.round(performance.now() - t0),
        delayMs: Math.max(0, Date.now() - barEnd),
        seated: ids.main.size + ids.sig.size + ids.coord.size,
        open: n,
        added: this.paper.positions.length - before,
        error: null,
      };
      this.emit("paper");
    } catch (e) {
      this.status.fast = { ...(this.status.fast ?? { at: 0, bar: 0, ms: 0, seated: 0, open: 0, added: 0 }), at: Date.now(), error: e instanceof Error ? e.message : String(e) };
    } finally {
      this.fastBusy = false;
    }
  }

  /** the seats of the last full paper step (the realtime entry step keeps them) */
  private lastSelection: Pick<ReturnType<typeof withProbe>, "picks" | "eligible"> | null = null;
  /** what the last live control step saw (controlDue) */
  private controlSeen: { positions: unknown; live: unknown; bar: number; at: number } | null = null;
  /** a stop crossed / a trailing stop moved since the last live control step (kept while a step is in flight) */
  private controlUrgent = false;
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
      since >= CONTROL_IDLE_MS ||
      (this.controlTrail && since >= CONTROL_TRAIL_MS);
    if (due) {
      this.controlSeen = { positions: this.paper.positions, live: this.settings.live, bar: this.status.lastBarT, at: Date.now() };
      this.controlUrgent = false;
      this.controlTrail = false;
    }
    return due;
  }

  /** when the realtime market loop last pulled bars */
  private marketPullAt = 0;
  /**
   * The realtime market loop: while a compute runs (the cycle is busy for minutes), newly closed bars are still pulled
   * every cycleMs — the realtime entry step and the status work on the current market, and the next cycle computes on
   * them (barsPending). Real market only, never during a backfill or a universe change.
   */
  private marketLoop() {
    if (!this.busy || this.status.state !== "computing" || this.pulling || this.market !== "bingx" || this.status.source !== "bingx") return;
    if (this.resetUniverse || !this.backfillKey || this.prehistPending) return;
    if (Date.now() - this.marketPullAt < Math.max(250, this.settings.cycleMs)) return;
    this.marketPullAt = Date.now();
    const gen = this.gen;
    void this.pullNewBars(gen)
      .then((n) => {
        if (n > 0 && gen === this.gen) this.barsPending = true;
      })
      .catch(() => undefined);
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
      // open positions marked to market at the newest price (stream, else the newest closed bar), per symbol: only
      // a symbol whose price moved since the last tick is marked again (an unchanged price moves no mark and crosses
      // no stop) — every position on every 100 ms tick was the main thread's largest steady cost
      const cost = this.settings.cost;
      let open = 0;
      let newHits: Record<string, { at: number; stop: number; px?: number }> | null = null;
      let trailMoved = false;
      // a trailing position that trails free (grid.trailFree) takes no target once its trail is armed
      const trailFree = this.settings.grid?.trailFree === true;
      const book = this.tickBook();
      const positions = this.paper.positions;
      const nowMs = Date.now();
      for (const g of book.groups) {
        const px = this.stream?.price(g.sym) ?? this.candles.get(g.sym)?.lastC();
        // no price: these positions keep their marks and add nothing to the open result (as before)
        if (!px) continue;
        if (px !== g.px) {
          let sum = 0;
          for (const pi of g.idx) {
            const p = positions[pi];
            if (!(p.entry > 0)) continue;
            // a trailing position's stop follows its lane bars between computes, as the simulation trails it
            if (!p.stopHit && p.trail) {
              const stop0 = p.stop;
              const on0 = p.trailOn;
              tickTrail(p, px, nowMs, this.laneMs(p.cfg));
              if (p.stop !== stop0 || p.trailOn !== on0) trailMoved = true;
            }
            // a price through the stop stops the position now (the live control drops its lane at once); the paper
            // book records the exit when the bar closes, at the stop, as the simulation does
            if (!p.stopHit) {
              const lvl = crossedExit(p, px, isSignalInd(p.cfg.split("|")[1] ?? "") ? false : trailFree);
              if (lvl > 0) {
                p.stopHit = Date.now();
                p.hitPx = lvl;
                (newHits ??= {})[posId(p)] = { at: p.stopHit, stop: p.stop, px: lvl };
              }
            }
            const at = p.stopHit ? (p.hitPx ?? p.stop) : px;
            p.mtm = (p.side * (at - p.entry)) / p.entry - cost;
            // an open order's result is its unit result × its Block volume (as its closed r will be)
            sum += p.mtm * (p.vol ?? 1) * book.units[pi];
          }
          g.px = px;
          g.sum = sum;
        }
        open += g.sum;
      }
      if (newHits) this.controlUrgent = true;
      if (trailMoved) this.controlTrail = true;
      // the tick's stop crossings persisted in one write (a read and a write of every hit per crossing before)
      if (newHits) {
        const hits = this.db.kvGet<Record<string, { at: number; stop: number; px?: number }>>("stopHits") ?? {};
        this.db.kvSet("stopHits", Object.assign(hits, newHits));
      }
      this.paper.equity = (this.paper.carried ?? 0) + this.closedPaperSum() + open;
      this.paper.balance = this.settings.paperBalance + this.paper.equity;
      // the stored marks are for inspection only (nothing reads them back; the book lives in memory and the state
      // file): every 30 s — every second it rewrote every paper position (17k rows on x01)
      if (Date.now() - this.lastMtmWrite > 30_000 && this.paper.positions.length) {
        this.lastMtmWrite = Date.now();
        const db = this.db;
        db.tx(() => {
          for (const p of this.paper.positions)
            db.run(
              "UPDATE paper_positions SET mtm = ?, at = ? WHERE cfg = ? AND sym = ? AND side = ? AND entry_t = ?",
              p.mtm,
              Date.now(),
              p.cfg,
              p.sym,
              p.side,
              p.entryT,
            );
        });
      }
      // live: decisions every tick on the newest paper book and prices (the exchange book is re-read over
      // REST at most every live.syncMs, and at once after own orders)
      const stale = (this.settingsStale && !this.memDeferred) || this.resetUniverse;
      if (
        !stale &&
        this.paperStepped &&
        this.onLive &&
        this.settings.live.enabled &&
        !this.liveBusy &&
        this.controlDue()
      ) {
        // the live step runs detached: the tick (marking to market) never waits on the exchange; a step never
        // overlaps the previous one (no duplicate orders), and one in flight too long is reported
        this.liveBusy = true;
        this.liveStartedAt = Date.now();
        const epoch = this.liveEpoch;
        // overall mode never reads the pending entries (the control sizes its positions from the lanes): computed before
        // every step (Block books, symbol stats, signal acceptance) they held the loop 0.5–1.6 s at a time and fed the
        // collector's multi-second pauses (x02, 7 Oct profile) — there they only refresh the status' "pending:"
        // reasons, every PENDING_STATUS_MS
        let intents: LiveIntent[] = [];
        if ((this.settings.live.mode ?? "overall") !== "overall" || Date.now() - this.pendingAt >= PENDING_STATUS_MS) {
          this.livePhase = "pending entries";
          intents = this.pendingEntries();
          this.pendingAt = Date.now();
        }
        this.livePhase = "start";
        void this.onLive(this, intents, this.gen)
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
    this.cancelBacktests("backtest canceled: runtime stopped");
    this.baseConfigRunner.cancel("stopped");
    this.stopTick();
    this.stopped = true;
    this.gen++;
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
      `${reason}: state saved${this.snapshotPath ? ", writing the snapshot" : ""}`,
    );
    let snapshot = false;
    if (this.snapshotPath) snapshot = this.db.snapshot(this.snapshotPath);
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
      this.gen++;
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
    if (!(self.btCandles instanceof Map)) self.btCandles = new Map();
    if (self.stallProbe === undefined) self.stallProbe = null;
    // candles of an earlier version (Candle[]) become series in a NEW map, in their order (code of the earlier module
    // still running — a compute's lane loop, a backtest — keeps the map it holds and its arrays); its backtest cache
    // restarts
    const prev = this.candles as Map<string, unknown>;
    if (prev instanceof Map && [...prev.values()].some((cs) => Array.isArray(cs))) {
      this.candles = new Map(
        [...prev].map(([sym, cs]) => [sym, Array.isArray(cs) ? CandleSeries.fromCandles(cs as Candle[]) : (cs as CandleSeries)]),
      );
      (self.btCandles as Map<string, unknown>).clear();
    }
    if (self.backtestJob === undefined) self.backtestJob = null;
    if (typeof self.lastConsoleAt !== "number") self.lastConsoleAt = 0;
    if (typeof self.backfillKey !== "string") self.backfillKey = "";
    if (self.audit === undefined) self.audit = null;
    if (typeof self.paperStepped !== "boolean") self.paperStepped = false;
    if (!self.baseConfigRunner) {
      this.baseConfigs = null;
      this.baseConfigRunner = this.makeBaseConfigRunner();
      this.baseConfigRunner.restore(this.db.kvGet<BaseConfigSnapshot>("baseConfigCounts"));
    }
    if (typeof self.lastTrim !== "number") self.lastTrim = 0;
    if (self.stream === undefined) self.stream = null;
    if (self.tickTimer === undefined) self.tickTimer = null;
    if (typeof self.ticking !== "boolean") self.ticking = false;
    if (typeof self.liveBusy !== "boolean") self.liveBusy = false;
    if (typeof self.liveStartedAt !== "number") self.liveStartedAt = 0;
    if (typeof self.liveSlowNoted !== "boolean") self.liveSlowNoted = false;
    if (typeof self.streamKey !== "string") self.streamKey = "";
    if (typeof self.lastMtmWrite !== "number") self.lastMtmWrite = 0;
    if (typeof self.restTickersAt !== "number") self.restTickersAt = 0;
    if (!(self.klinesAt instanceof Map)) self.klinesAt = new Map();
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
    if (!this.stopped && this.status.state !== "idle" && !self.tickTimer) this.startTick();
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
    const prevUniverse = `${this.settings.symbols}|${this.settings.tfMin}|${this.settings.historyDays}|${this.settings.symbolRank}|${this.settings.symbolOffset ?? 0}|${(this.settings.forceSymbols ?? []).join(",")}`;
    const prevCompute = computeKey(this.settings, this.wf);
    const next = mergeSettings(this.settings, patch);
    // a connection's runtime always trades its own connection (switching is done by selecting another runtime)
    if (this.conn) next.live = { ...next.live, connId: this.conn };
    // limits on the MERGED settings (a patch alone could bypass them across several saves)
    // position cost follows its components when they are edited (taker fee + slippage per side, × 2)
    if (patch.fees && patch.cost === undefined)
      next.cost = +(2 * (next.fees.taker + next.fees.slippage)).toFixed(5);
    const variants = gridVariants(next.grid);
    // a high ceiling, not a working limit (operator: process freely): it only catches a grid that would not fit in
    // memory at all
    if (variants > GRID_VARIANTS_MAX)
      throw new Error(`protect grid too large (${variants} variants, max ${GRID_VARIANTS_MAX})`);
    // the two acceptance gates keep their operator-set ranges (the Settings choices): PF 1.05-1.5, drawdown max
    // 2-35 h. Everything else the sanitiser touches is taken as asked.
    next.gates.minPf = Math.min(1.5, Math.max(1.05, next.gates.minPf));
    next.gates.maxDdtH = Math.min(35, Math.max(2, next.gates.maxDdtH));
    this.settings = next;
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
      gates: this.settings.gates,
      cost: this.settings.cost,
      toggles: this.settings.toggles,
      block: this.settings.block,
      dca: this.settings.dca,
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
    this.baseConfigRunner.cancel("settingsChanged");
    // a running cycle keeps its snapshot; the universe reset is applied at the start of the next cycle
    if (
      prevUniverse !==
      `${this.settings.symbols}|${this.settings.tfMin}|${this.settings.historyDays}|${this.settings.symbolRank}|${this.settings.symbolOffset ?? 0}|${(this.settings.forceSymbols ?? []).join(",")}`
    )
      this.resetUniverse = true;
    // live execution settings (limits, pause, margin floor) are read by the live step, not by the compute: a change
    // to them alone (or a patch that changes nothing, e.g. one re-applied on a restart) keeps the running compute —
    // marking it stale threw away its tapes, and a desk whose compute outlasts the patch interval never stepped paper
    const recompute = this.resetUniverse || computeKey(this.settings, this.wf) !== prevCompute;
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
    this.dirty = true;
    this.settingsStale = true;
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
    this.status.nextCycleAt = Date.now() + ms;
    this.timer = setTimeout(() => {
      this.timer = null;
      // never an unhandled rejection (it would end the process): log, back off, keep the loop alive
      this.cycle().catch((err) => {
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
    this.status.stage = stage;
    this.status.progress = p;
    this.status.label = label;
    this.status.overall = overallOf(stage, p, this.status.overall ?? 0, this.jobBackfill);
    this.status.heartbeat = Date.now();
    this.emitProgress(changed || restart);
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
    this.progressTimer = setTimeout(() => {
      this.progressTimer = null;
      this.lastProgressEmit = Date.now();
      this.emit("progress");
    }, Math.max(1, 250 - el));
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
    this.busy = true;
    // the previous compute's preset comparison finishes first (never beside a compute: memory, the cores)
    if (this.comparing) await this.comparing;
    if (this.stopped) {
      this.busy = false;
      return;
    }
    const gen = this.gen;
    const t0 = performance.now();
    let compareGen: number | null = null;
    this.inCycle = true;
    // a job left open by an abandoned cycle (watchdog, stop, error) never carries its bar into this one
    this.jobOpen = false;
    try {
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
      const memWait =
        (newBars || this.dirty) &&
        (Date.now() < Math.max(this.memRetryAt, this.memFreshAt) || this.memStartBlocked());
      if (memWait) this.dirty = true;
      this.memDeferred = !!memWait;
      const computed = (newBars || this.dirty) && !memWait;
      if (computed) {
        this.memGuardStart(gen);
        try {
          await this.compute(gen);
        } finally {
          this.memGuardStop(gen);
        }
        // finished: the fallback steps back up once memory has room again (a compute that saw hard pressure in an
        // in-process phase finished anyway — the next one still runs lighter). An abandoned cycle's compute (stop /
        // start while it waited on the workers) leaves the newer cycle's pressure and fallback alone.
        if (gen === this.gen) this.memAfterCompute(this.memPressured, false);
      }
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
          this.paperRunning = true;
          await this.driveSliced("Paper", this.stepPaperGen(), gen, (f) =>
            this.setStage("Paper", 0.8 * f, 1, paperLabel),
          );
        } finally {
          this.paperRunning = false;
          this.fastHold = false;
          this.busyPhase = "";
        }
        const pt = this.paperTimings;
        if (pt && this.status.phases.Paper)
          this.status.phases.Paper.slowest = `select ${Math.round(pt.select)} · candidates ${Math.round(pt.cands)} · entries ${Math.round(pt.exec)} ms over ${pt.n} (wall, sliced)${pt.stale ? ` · ${pt.stale} older tape positions left to their tape` : ""}`;
        await yieldNow();
        this.phase("Adjust", () => this.runAdjust());
        await yieldNow();
        this.busyPhase = "Audit";
        const auditLabel = `self-audit · ${this.paper.selected.length} seats`;
        this.setStage("Paper", 0.8, 1, auditLabel);
        try {
          await this.runAuditAsync(gen, (f) => this.setStage("Paper", 0.8 + 0.2 * f, 1, auditLabel));
        } finally {
          this.busyPhase = "";
        }
        this.paperStepped = true;
        // the public signal that this compute's book is ready: the seats (paper.selected) are the new tapes'
        this.status.paperSteps = (this.status.paperSteps ?? 0) + 1;
        this.status.paperCompute = this.status.computes;
        this.buildListings();
        if (this.status.prehistoric) this.status.prehistoric.counts.real = this.paper.selected.length;
        this.endJob(
          `${this.computeSummary ? `${this.computeSummary} · ` : ""}${this.paper.selected.length} seats · ${this.paper.positions.length} open`,
        );
        this.emit("paper");
      }
      if (!this.stopped) this.status.state = "running";
      this.emit("state");
      this.status.error = null;
      // the preset comparison of this compute runs once the cycle has ended (its book is out, the next cycle is
      // scheduled): the next cycle waits for it before it starts, so the two never overlap
      if (computed && !stale && !this.stopped) compareGen = gen;
      if (this.snapshotPath && Date.now() - this.lastSnapshot > 10 * 60_000) {
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
        if (compareGen === gen && !this.stopped)
          this.comparing = this.runCompare(gen).finally(() => {
            this.comparing = null;
          });
      }
    }
  }

  /** The preset comparison after a cycle (a failure there is not the cycle's: status.compare.error). */
  private comparing: Promise<void> | null = null;
  private async runCompare(gen: number) {
    try {
      await this.comparePresets(gen);
    } catch (e) {
      if (gen === this.gen) {
        this.status.compare = { running: false, done: 0, total: 0, at: this.status.compare?.at, error: e instanceof Error ? e.message : String(e) };
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
    const want = Math.round((s.historyDays * 24 * 60) / s.tfMin);
    // a symbol is usable with most of the requested history (small history settings must not stall the loop)
    const minBars = Math.max(50, Math.min(200, Math.floor(want * 0.8)));
    const uniKey = `${s.symbols}|${s.tfMin}|${s.historyDays}|${s.symbolRank}|${s.symbolOffset ?? 0}|${(s.forceSymbols ?? []).join(",")}`;
    if (this.candles.size === 0) {
      this.status.state = "backfill";
      this.loadCandlesFromDb();
      // a partial cache is not a finished universe: keep backfillKey unset so the missing symbols are fetched
      if (this.candles.size >= s.symbols) this.backfillKey = uniKey;
    }
    // candles of another timeframe (an older version / snapshot, or a hot reload across the base timeframe
    // change) are never read as base bars: drop them and backfill at the base timeframe
    const baseMs = s.tfMin * 60_000;
    // the smallest spacing of the last bars is the timeframe (a missing bar only makes one gap larger)
    const spacing = (cs: CandleSeries) => {
      let m = Infinity;
      for (let i = Math.max(1, cs.n - 10); i < cs.n; i++)
        m = Math.min(m, cs.t[i] - cs.t[i - 1]);
      return m;
    };
    const wrongTf = [...this.candles.values()].some(
      (cs) => cs.n > 2 && spacing(cs) !== baseMs,
    );
    …37544 tokens truncated… timeframe, else the base bars'), in ms — memoized. */
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
      this.tapeIdx = { tapes: this.tapes, byId: new Map(this.tapes.map((t) => [t.id, t])) };
    return this.tapeIdx.byId;
  }
  /** set by the live step: persists its in-memory state (called on shutdown) */
  flushLive?: () => void;
  /** stage sets of the last compute (self-audit) */
  stageSets: AuditInput["stages"] = undefined;
  /** the universe of the last compute (comboTrades, research tools) */
  lastUniverse: ReturnType<typeof makeUniverse> | null = null;
  /**
   * Closed trades of one config computed on demand from the current candles (Base configs keep only their
   * stats; tapes exist for Main sets). Plain configs only (DCA / Axis come from tapes). Null if unknown.
   */
  comboTrades(id: string): Trade[] | null {
    const c = parseConfigId(id);
    if (!c || !isPlainKind(kindOfId(id))) return null;
    // exactly the universe the stored statistics were computed on (the candles may have moved on since)
    const u = this.lastUniverse;
    if (!u) return null;

    const g = this.settings.grid;
    const protect =
      c.protect.trail > 0 && !c.protect.trailOnly && !isSignalInd(c.ind)
        ? { ...c.protect, trailStep: g.trailStep ?? 1, trailFree: g.trailFree ?? false }
        : c.protect;
    const r = runCombo(
      u,
      c.bot,
      c.ind,
      protect,
      this.settings.cost,
      1,
      this.settings.tactics,
      true, // the id carries the lane's protect already
    );
    return r ? r.trades : null;
  }

  /** Recompute the published numbers from their inputs; failures go to the event log once per change. */
  runAudit(): AuditReport {
    return this.finishAudit(auditState(this.auditInput()));
  }

  /** The audit in time slices (the cycle): the live tick runs between them. */
  private async runAuditAsync(gen = this.gen, onFraction?: (f: number) => void): Promise<AuditReport> {
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
    srcClosed: Map<string, Array<{ exitT: number; r: number }>>;
    /**
     * the simulation's engine candidates (taken or not) per symbol × direction: entries ascending with the running
     * maximum exit — confirmation asks whether one was open at a signal's entry
     */
    engineIv: Map<string, { e: Float64Array; mx: Float64Array }>;
  } | null = null;
  private coordOf(sim: WalkForwardResult) {
    if (this.coordCache?.sim === sim) return this.coordCache;
    const closedBy = [...sim.trades].sort((a, b) => a.exitT - b.exitT);
    const hourNet = new Map<number, number>();
    const srcClosed = new Map<string, Array<{ exitT: number; r: number }>>();
    for (const x of closedBy) {
      const k = Math.floor(x.exitT / H);
      hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
      if (sigCfg(x.cfg)) {
        const src = signalSourceOf(x.cfg.split("|")[1] ?? "");
        let l = srcClosed.get(src);
        if (!l) srcClosed.set(src, (l = []));
        l.push({ exitT: x.exitT, r: x.r });
      }
    }
    // the engine candidates of the run (the feed holds every candidate, executed or not, with its entry and exit)
    const iv = new Map<string, Array<[number, number]>>();
    for (const f of sim.feed ?? []) {
      if (f.entryT === undefined || !f.cfg || sigCfg(f.cfg)) continue;
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
    this.coordCache = { sim, closedBy, hourNet, srcClosed, engineIv };
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
    positions: ReadonlyArray<{ cfg: string; sym: string; side: number; entryT: number; stopHit?: number }>,
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
          (x) => x.sym === sym && x.side === side && x.entryT <= t && !x.stopHit && !sigCfg(x.cfg),
        );
      },
    };
  }

  /** the engine tape positions open now per "sym|side" (earliest entry) of the given configs */
  private engineOpenNow(ids: Iterable<string>, byId: ReadonlyMap<string, ConfigTape>): Map<string, number> {
    const out = new Map<string, number>();
    for (const id of ids) {
      if (sigCfg(id)) continue;
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
        for (const x of open) if (x.entryT === op.entryT && crowdKey(x.cfg, x.sym, x.side, x.entryT) === k) n++;
        if (crowdSeats)
          for (const x of crowdSeats) if (x.entryT === op.entryT && crowdKey(x.cfg, x.sym, x.side, x.entryT) === k) n++;
        if (n >= cap) return "crowd";
      }
    }
    // confirmation as in the simulation: an engine candidate (taken or not) open at the entry, not only a position
    const coordWhy = coordBlock(this.wf.coord, op, hourNet, at, confirmPool);
    // a hedge-only signal trades while the book is losing (this or the previous hour), without confirmation
    const hedging =
      this.hedgeKeys.size > 0 &&
      this.hedgeKeys.has(sigActiveKey(op.cfg.split("|")[0], op.cfg.split("|")[1] ?? "", op.sym, op.side, kindOfId(op.cfg)));
    if (hedging) {
      const losing =
        (!this.wf.coord?.hedgePrevOnly && (hourNet.get(hk) ?? 0) < 0) ||
        (hourNet.get(hk - 1) ?? 0) < 0;
      if (!losing) return "hedgeIdle";
      if (coordWhy && coordWhy !== "confirm") return coordWhy;
    } else if (coordWhy) return coordWhy;
    // Stable-02 coordination: symbols the simulation ended holding back take no new entries
    const s2End = this.wf.coord?.enabled ? this.sim?.s2 : undefined;
    if (s2End?.paused.includes(op.sym)) return "s2Window";
    const sg = this.wf.signalSourceGate;
    if (sg?.enabled && sigCfg(op.cfg)) {
      const src = signalSourceOf(op.cfg.split("|")[1] ?? "");
      if (sourceUnstable(srcClosed.get(src), op.entryT, sg)) return "sourceUnstable";
    }
    return null;
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
  private *stepPaperGen(fast?: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number }): Generator<number, void> {
    if (!this.tapes.length || !this.sim) return;
    if (fast && !this.lastSelection) return;
    // sub-timings (the Paper phase is one synchronous slice: its slowest part is named in the phase record)
    const tp0 = performance.now();
    const nowT = Math.floor(Date.now() / H) * H;
    const t = fast ? fast.t : Math.min(nowT, this.sim.endT);
    const held = new Set(this.sim.steps[this.sim.steps.length - 1]?.real ?? []);
    // signal configs are not selected into seats: every config of an active signal runs (Real gate per symbol)
    const { engine: selTapes, signal: sigTapes } = splitSignalTapes(this.tapes, this.wf);
    // (slices between the opening passes over every tape: together they were one 0.5 s step at 21 symbols)
    yield 0;
    const { picks, eligible } = fast
      ? this.lastSelection!
      : withProbe(
          this.wf.mode === "durable"
            ? selectDurable(selTapes, t, this.wf, held)
            : this.wf.mode === "fixed"
              ? yield* selectFixedGen(selTapes, t, this.wf)
              : selectAt(selTapes, t, this.wf),
          selTapes,
          t,
          this.wf,
        );
    if (!fast) this.lastSelection = { picks, eligible };
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
      }
    > = [];
    const saved = this.db.kvGet<Record<string, { at: number; stop: number; px?: number }>>("stopHits") ?? {};
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
        if (tp) cands.push({ tp, op: p, held: true });
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
          if (!freshEntry(op.entryT, t, this.wf.stepH)) {
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
    if (!fast) for (const st of this.sim.steps) if (st.t >= t - stepMs && st.t < t) for (const id of st.real) visit.add(id);
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
        if (!held && !freshEntry(op.entryT, t, this.wf.stepH)) {
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
    yield 0;
    // Block sources (overall / symbol / direction / indication) judge executed positions closed before each entry
    const booksAt = this.booksAt();
    // the books up to the first new entry, a slice at a time: the entries' lookups below then only add what closed
    // since (the first lookup replayed the whole run's feed in one block)
    const firstNew = cands.find((c) => !c.held)?.op.entryT;
    if (firstNew !== undefined) while (!booksAt.advance(firstNew, BOOK_FEED_SLICE)) yield 0;
    // hour guard and coordination on new entries, as in the simulation: realized Σ trade % per clock hour of the
    // executed orders closed before the entry, and the positions open at it
    const { closedBy, srcClosed, engineIv } = this.coordOf(this.sim);
    // signal confirmation's pool: the run's engine candidates, the engine tape positions open now of the selected /
    // held engine configs, and the book's engine positions (as the simulation: taken or not)
    const confirmPool = this.confirmPoolOf(engineIv, () => this.engineOpenNow(keep, byId), positions);
    yield 0;
    const s2End = this.wf.coord?.enabled ? this.sim.s2 : undefined;
    const hourNet = new Map<number, number>();
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
    const lvModel = this.modeledExecutionRecords()?.byConfig ?? new Map<string, LiveRecord>();
    // judged as of `at`: a paper entry as of its entry time (the closes after it are not known when it enters — with
    // now, up to a step of later closes decided it), the entries planner as of now
    const lvOf = (x: ConfigTape, at = lvNow) => {
      const mk = `${x.id}|${at}`;
      let g = lvMemo.get(mk);
      // without an explicit live floor every config is held to its own range's minimum (as at the stages)
      const stageMin = minPfOf(this.settings.gates, x.protect.tag, x.ind);
      const minPf = x.ind.startsWith("tactic-") || x.ind.startsWith("relate-") || x.ind.startsWith("break-rel-") || x.ind.startsWith("break-mc-rel-")
        ? Math.max(stageMin, this.settings.live.liveMinPf ?? stageMin)
        : this.settings.live.liveMinPf ?? stageMin;
      if (!g) {
        const model = lvModel.get(x.id);
        g = { ...(model ? liveGate(model, lvSince, at, lvN, minPf) : { ok: true, n: 0, pf: null }), source: "post-base-accepted" };
        lvMemo.set(mk, g);
      }
      return g;
    };
    // until a config has its own N live closes, its group (range or signals) decides on its pooled last closes
    const lvGroupN = lvN > 0 ? (this.settings.live.liveGroupLastN ?? 0) : 0;
    // a range group is held to its range's minimum, as each of its configs is (an explicit live floor wins)
    const lvGroupMin =
      this.settings.live.liveMinPf ??
      ((g: string) => {
        const prefix = "Signals Coordination · ";
        const label = g.startsWith(prefix) ? g.slice(prefix.length) : g;
        const tag = RANGE_TAGS.find((t) => RANGE_LABEL[t] === label);
        return minPfOf(this.settings.gates, tag);
      });
    // the group gates as of a time (each distinct entry time of the step once)
    const lvGroupsAt = new Map<number, Map<string, LiveGate>>();
    const groupsAt = (at: number) => {
      let m = lvGroupsAt.get(at);
      if (m) return m;
      m = new Map<string, LiveGate>();
      lvGroupsAt.set(at, m);
      if (!(lvGroupN > 0)) return m;
      const simG = liveGroupGates(
        (function* () {
          for (const id of sel) {
            const x = lvModel.get(id);
            if (x) yield x;
          }
        })(),
        lvSince,
        at,
        lvGroupN,
        lvGroupMin,
      );
      for (const [group, gate] of simG) m.set(group, { ...gate, source: "post-base-accepted" });
      return m;
    };
    const lvGroups = groupsAt(lvNow);
    if (lvGroupN > 0) yield 0;
    let lvSkipped = 0;
    let slice = 0;
    // the same open order from two indications (identical signal, same protect) or two Axis depths is held once, as
    // the simulation executes it once (dupKey)
    const openKeys = new Set<string>();
    for (const { op, held } of cands) if (held) openKeys.add(openDupKey(op));
    const crowdSeats: OpenPosition[] = [];
    for (const { tp, op, held } of cands) {
      if (++slice % 300 === 0) yield slice;
      if (!held && openKeys.has(openDupKey(op))) {
        pSkip("duplicate");
        continue;
      }
      if (!held) {
        while (ci < closedBy.length && closedBy[ci].exitT <= op.entryT) {
          const x = closedBy[ci++];
          const k = Math.floor(x.exitT / H);
          hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
        }
        const back = this.entryHeldBack(
          { cfg: op.cfg, sym: op.sym, side: op.side, entryT: op.entryT },
          hourNet,
          positions,
          srcClosed,
          confirmPool,
          crowdSeats,
        );
        if (back) {
          pSkip(`${sigCfg(op.cfg) ? "sig:" : ""}heldBack:${back}`);
          continue;
        }
        // the live validation after the simulation's own rules: a config it pauses keeps the crowd seat the
        // simulation gave it (judged first, its seat went to a config the simulation had crowded out)
        if (
          lvN > 0 &&
          !liveEntryOk(lvOf(tp, op.entryT), (lvGroupsAt.has(op.entryT) ? lvGroupsAt.get(op.entryT)! : groupsAt(op.entryT)).get(liveGroupOf(tp.id)))
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
            legs: prev?.legs,
            blockLevels: prev?.blockLevels,
            blockEffectiveLevels: prev?.blockEffectiveLevels,
            blockSampleCounts: prev?.blockSampleCounts,
          } as const)
        : execDecision(tp, op.entryT, this.wf, {
            ...booksAt(op.entryT),
            sym: op.sym,
            side: op.side,
          });
      // engine and signal orders are capped each on their own
      const cls = sigCfg(op.cfg) ? "s" : "e";
      const pre = cls === "s" ? "sig:" : "";
      if (!d.ok) {
        pSkip(`${pre}exec:${(d as { why?: string }).why ?? "?"}`);
        continue;
      }
      const caps = capsOf(this.wf, cls === "s");
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
                    const cap = cls === "s" ? this.wf.signalMaxPositions : this.wf.maxPositions;
                    if (!cap || cap <= 0 || openPos.has(`${cls}|${posKey}`)) return false;
                    // signals: the cap counts each direction apart (long and short run independently); engine: both
                    const sideOf = (k: string) => k.slice(k.lastIndexOf("|") + 1);
                    const mySide = String(op.side);
                    let n = 0;
                    for (const k of openPos)
                      if (k.startsWith(`${cls}|`) && (cls !== "s" || sideOf(k) === mySide)) n++;
                    return n >= cap;
                  })()
                ? "maxPositions"
                : null;
      if (capWhy) {
        pSkip(`${pre}cap:${capWhy}`);
        continue;
      }
      openPos.add(`${cls}|${posKey}`);
      perSym.set(`${cls}|${op.sym}`, c + 1);
      perSide.set(`${cls}|${op.side}`, sd + 1);
      openBy.set(cls, (openBy.get(cls) ?? 0) + 1);
      // new entries take the relation volume the simulation ended with (within the Block maximum)
      const stackCap = blockStackCap(this.wf.block);
      const cv =
        !held && s2End?.factor ? Math.min(1 + s2End.factor, Math.max(1, stackCap / d.vol)) : 1;
      const vf = held ? 1 : volumeFactorForIndication(tp.ind, this.wf.indicationVolumeFactors);
      const positionCv = held ? (prev?.coordVol ?? 1) : cv;
      const positionVf = held ? (prev?.volFactor ?? 1) : vf;
      openKeys.add(openDupKey(op));
      positions.push({
        ...op,
        // when the book first held it (kept across steps): adopted now, or as it was
        heldAt: prevByKey.get(posId(op))?.heldAt ?? Date.now(),
        // execution multiple × ladder weight (Axis: every filled rung is volume, as the simulation books it); the
        // live lane asks for this volume, and paper marks mtm (per unit) × it
        vol: positionVolume(d.vol * cv * vf, op),
        ...(positionCv !== 1 ? { coordVol: positionCv } : {}),
        ...(positionVf !== 1 ? { volFactor: positionVf } : {}),
        level: d.level,
        ...(d.legs ? { legs: d.legs } : {}),
        ...(d.blockLevels ? { blockLevels: d.blockLevels, blockEffectiveLevels: d.blockEffectiveLevels,
          blockSampleCounts: d.blockSampleCounts } : {}),
        ...tr,
        // a stop crossed at tick time stays crossed until the bar-closed exit replaces the position — only while
        // the stop is the same one (a recompute can move it), and across a restart (persisted)
        ...(() => {
          const id = posId(op);
          const lid = posIdLegacy(op);
          const fromPrev = !!prev?.stopHit && prev.stop === stopNow;
          const own = stopHitsStop[id] === stopNow;
          const hit = fromPrev
            ? prev!.stopHit
            : own
              ? stopHits[id]
              : stopHitsStop[lid] === stopNow
                ? stopHits[lid]
                : undefined;
          // the price the stop was crossed at travels with the hit (the live exit is priced from it)
          const hitPx = fromPrev ? prev!.hitPx : own ? stopHitsPx[id] : stopHitsPx[lid];
          return hit ? { stopHit: hit, ...(hitPx ? { hitPx } : {}) } : {};
        })(),
      });
    }
    // a held position whose tape this compute did not build (the memory fallback dropped its range, an adjusted
    // config id, a range switched off): carried forward as it was for up to 48 h — dropping it left no close and live
    // flattened the exchange position
    {
      const have = new Set(positions.map(posId));
      let carriedMissing = 0;
      for (const p of this.paper.positions) {
        if (byId.get(p.cfg) || have.has(posId(p))) continue;
        // (the realtime entry step keeps every held position: closing is the full step's)
        if (!fast && Date.now() - p.entryT > 48 * H) continue;
        positions.push({ ...p, vol: p.vol ?? 1, level: p.level ?? 0 });
        carriedMissing++;
      }
      if (carriedMissing && carriedMissing !== this.carriedMissing)
        this.db.event("warn", `paper: ${carriedMissing} held position(s) carried without their tape this compute`);
      this.carriedMissing = carriedMissing;
    }
    // (the blocks below yield between them: in one piece they were the realtime step's ~0.4 s final slice)
    yield 0;
    // persisted tick-time stops: only those of positions still open
    const keepHits: Record<string, { at: number; stop: number; px?: number }> = {};
    for (const p of positions)
      if (p.stopHit) keepHits[posId(p)] = { at: p.stopHit, stop: p.stop, ...(p.hitPx ? { px: p.hitPx } : {}) };
    if (
      Object.keys(keepHits).length !== Object.keys(saved).length ||
      Object.keys(keepHits).some((k) => !saved[k])
    )
      this.db.kvSet("stopHits", keepHits);
    const since = this.paper.startedAt - this.wf.simH * H;
    const trades = this.sim.trades.filter((t) => t.exitT >= since);
    yield 0;
    const inSim = new Set(trades.map(orderKey));
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
      if (openNow.has(k) || inSim.has(k)) continue;
      const tp = byId.get(p.cfg);
      if (!tp) continue;
      // the tape is in exit order and an exit is never before its entry: the scan starts at the first exit ≥ it
      for (let i = lowerBound(tp.exitT, p.entryT); i < tp.n; i++) {
        if (tp.entryT[i] !== p.entryT || tp.syms[tp.symI[i]] !== p.sym) continue;
        const x = tradeAt(tp, i);
        if (x.exitT < since) break;
        // the tape order's r and vol already carry the ladder (Σ legs): scaled by the execution multiple only
        const v = positionMult(p);
        trades.push({
          ...x,
          r: x.r * v,
          vol: (x.vol ?? 1) * v,
          mult: v,
          ...(p.coordVol !== undefined ? { coordVol: p.coordVol } : {}),
          ...(p.volFactor !== undefined ? { volFactor: p.volFactor } : {}),
        });
        inSim.add(k);
        break;
      }
    }
    // the paper book's own record: every position it held that left it this step, with the close its tape gave it
    // (the order the simulation booked) and when the book first held it — paper_trades is the simulated window's
    // trades, most of which the book never held (closed between two computes); this is what the book really traded
    {
      const tradeOf = new Map(trades.map((x) => [orderKey(x), x]));
      const now = Date.now();
      const rows: Array<Array<string | number | null>> = [];
      for (const p of prevByKey.values()) {
        const k = orderKey(p);
        if (openNow.has(k)) continue;
        const x = tradeOf.get(k);
        rows.push(
          x
            ? [p.cfg, p.sym, p.side, p.entryT, x.exitT, x.r, x.vol ?? 1, x.reason ?? "close", p.heldAt ?? null, now,
              Number.isFinite(unitReturn(x)) ? unitReturn(x) : null,
              (() => { const allocation = this.paperOwnedAllocations?.get(orderKey(p));
                const sameShare = typeof x.vol === "number" && typeof p.vol === "number" && Math.abs(x.vol - p.vol) <= 1e-9 * Math.max(1, p.vol);
                const notional = sameShare && allocation && typeof p.vol === "number" && p.vol <= allocation.vol + 1e-12 ? allocation.unitUsd * p.vol : NaN;
                return Number.isFinite(notional) && notional > 1e-9 ? notional : null; })()]
            : // left the book without a close on record (retired, dropped from its tape): its last mark, flagged
              [p.cfg, p.sym, p.side, p.entryT, now, (p.mtm ?? 0) * (p.vol ?? 1), p.vol ?? 1, "dropped", p.heldAt ?? null, now, null, null],
        );
      }
      if (rows.length)
        this.db.tx(() => {
          for (const r of rows)
            this.db.run(
              "INSERT OR IGNORE INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, unit_r, owned_notional_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
    for (const row of this.db.all<{ cfg: string; sym: string; side: number; entry_t: number; pnl: number | null }>(
      "SELECT cfg, sym, side, entry_t, pnl FROM paper_trades WHERE exit_t >= ? AND entry_t >= ?",
      since,
      this.sim.startT,
    ))
      if (!inSim.has(orderKey({ cfg: row.cfg, sym: row.sym, side: row.side, entryT: row.entry_t }))) carriedDropped += row.pnl ?? 0;
    const carried = carriedBefore + carriedDropped;
    yield 0;
    // sizing: every order's unit from the equity at its entry (fixed % of equity) or the fixed notional
    const sizing = this.paperSizing();
    const sized = yield* sizeBookGen(trades, positions, { ...sizing, balance: sizing.balance + carried });
    const ownedEntryAllocations = new Map<string, { unitUsd: number; vol: number }>();
    for (const p of positions) {
      const k = orderKey(p);
      // A legacy held position is never retroactively funded by a new simulation's reconstructed unit.
      const prior = this.paperOwnedAllocations?.get(k);
      const unit = !prevByKey.has(posId(p)) ? sized.units.get(k) : undefined;
      if (prior) ownedEntryAllocations.set(k, prior);
      else if (typeof unit === "number" && Number.isFinite(unit) && unit > 0 && Number.isFinite(p.vol) && p.vol > 0)
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
          db.run("DELETE FROM paper_positions WHERE cfg = ? AND sym = ? AND side = ? AND entry_t = ?", g.cfg, g.sym, g.side, g.entryT);
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
      let judged = 0;
      let passing = 0;
      let onExchange = 0;
      for (const id of sel) {
        const x = byId.get(id);
        if (!x) continue;
        const g = lvOf(x);
        if (g.pf === null) continue;
        judged++;
        if (g.ok) passing++;
        if (g.source === "exchange") onExchange++;
      }
      this.status.liveValidation = {
        lastN: lvN,
        minPf: lvMinPf,
        since: lvSince,
        judged,
        passing,
        paused: judged - passing,
        skipped: lvSkipped,
        onExchange,
        exchangeCloses: 0,
        groupLastN: lvGroupN,
        groups: [...lvGroups]
          .map(([group, g]) => ({ group, n: g.n, pf: g.pf, ok: g.ok, source: g.source }))
          .sort((a, b) => (a.group < b.group ? -1 : a.group > b.group ? 1 : 0)),
      };
    }
    this.paperTimings = { select: tSelect, cands: tCands, exec: tExec, n: cands.length, stale };
    // the step's reasons replace the previous step's; the pending entries' (pending:…) are kept until their next call
    const pendingKept = Object.fromEntries(
      Object.entries(this.status.paperSkips ?? {}).filter(([k]) => k.startsWith("pending:")),
    );
    this.status.paperSkips = { ...pSkips, ...pendingKept };
    // the live tick ran between this step's slices on the old book: a stop it crossed after the positions were
    // built is carried over (else the lane asks for its volume again until the next step reads the stored hit)
    for (const p of positions) {
      if (p.stopHit) continue;
      const prev = prevByKey.get(posId(p));
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
      scores: new Map([
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
      const sp = positions.filter((p) => sigCfg(p.cfg));
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
    const direction = candidateDirectionFor(this.wf);
    const wantGuard =
      !!this.wf.signalGuardN ||
      !!this.wf.signalCluster?.enabled ||
      !!this.wf.signalAccept?.enabled ||
      !!this.wf.signalSideAccept?.enabled ||
      !!this.wf.engineSideAccept?.enabled;
    if (!wantBook && !wantGuard && !direction) return Object.assign(() => ({ book: null, guard: null, direction: null }), { advance: () => true });
    const feed = this.sim?.feed ?? [];
    // (fed only when read: an unread book cost the tick seconds after each new run)
    const book = wantBook ? blockBookOf(this.wf.block, !!this.wf.toggles.blockActive) : null;
    // acceptance on the same tape record the simulation judged on
    const guard = signalGuardFor(this.tapes, this.wf);
    // the desk's own exchange closes judge an acceptance group once they number its minTrades (live-record.ts)
    const exchange = { stats: (k: string, t: number, h: number) => this.exchangeAccept().stats(k, t, h) };
    guard.exchange = exchange;
    let i = 0;
    const at = (t: number) => {
      while (i < feed.length && feed[i].exitT <= t) feedBooks(feed[i++], book, guard, direction);
      return { book: wantBook ? book : null, guard: wantGuard ? guard : null, direction };
    };
    // the feed up to t, at most `max` entries a call (true once there): the first lookup of a fresh book replayed the
    // whole run's feed in one block — 1–4 s of the paper step on x02 (7 Oct profile), the loop held throughout
    const advance = (t: number, max: number) => {
      for (let n = 0; n < max && i < feed.length && feed[i].exitT <= t; n++) feedBooks(feed[i++], book, guard, direction);
      return !(i < feed.length && feed[i].exitT <= t);
    };
    return Object.assign(at, { advance });
  }

  /**
   * Entries due NOW: signals of the selected configs on the newest closed bar (they enter at the next open).
   * These are what the live adapter may mirror.
   */
  pendingEntries(): LiveIntent[] {
    const out: LiveIntent[] = [];
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
        ...Object.fromEntries(Object.entries(this.status.paperSkips ?? {}).filter(([k]) => !k.startsWith("pending:"))),
        "pending:booksCatchingUp": 1,
      };
      return out;
    }
    const books = this.liveBooks.at(entryT);
    const byId = this.tapeIndex();
    const coord = this.sim ? this.coordOf(this.sim) : null;
    // signal confirmation's pool, as in the paper step (engine candidates taken or not, open at the entry)
    const confirmPool = coord
      ? this.confirmPoolOf(coord.engineIv, () => this.engineOpenNow(this.paper.selected, byId), this.paper.positions)
      : null;
    // every pending entry not sent, by reason (status.paperSkips "pending:…", replaced per call)
    const skips: Record<string, number> = {};
    const skip = (tp: ConfigTape, why: string) => {
      const k = `pending:${sigCfg(tp.id) ? "sig:" : ""}${why}`;
      skips[k] = (skips[k] ?? 0) + 1;
    };
    for (const id of this.paper.selected) {
      const tp = byId.get(id);
      if (!tp) continue;
      for (const p of tp.pending) {
        // an entry on the next bar passes the same execution and coordination rules as in the simulation
        const d = execDecision(tp, entryT, this.wf, { ...books, sym: p.sym, side: p.side });
        if (!d.ok) {
          skip(tp, `exec:${d.why}`);
          continue;
        }
        // Native live entries require both settled model and measured owned-paper execution proof for this side.
        if (!this.livePromotionGate({ cfg: tp.id, sym: p.sym, side: p.side }).ok) {
          skip(tp, "liveValidation");
          continue;
        }
        const back = coord
          ? this.entryHeldBack(
              { cfg: tp.id, sym: p.sym, side: p.side, entryT },
              coord.hourNet,
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
          const cap = capsOf(this.wf, true).perSymbol;
          const openOn =
            this.paper.positions.filter((x) => x.sym === p.sym && sigCfg(x.cfg)).length +
            out.filter((x) => x.sym === p.sym && sigCfg(x.cfg)).length;
          if (openOn >= cap) {
            skip(tp, "cap:perSymbol");
            continue;
          }
          // the signals' own cap on POSITIONS (symbol × direction, open paper positions + entries sent now), counted
          // per direction: long and short run independently, each up to the cap
          const pcap = this.wf.signalMaxPositions;
          if (pcap && pcap > 0) {
            const same = (x: { sym: string; side: number; cfg: string }) =>
              x.sym === p.sym && x.side === p.side && sigCfg(x.cfg);
            if (!this.paper.positions.some(same) && !out.some(same)) {
              const set = new Set(
                [...this.paper.positions, ...out]
                  .filter((x) => sigCfg(x.cfg) && x.side === p.side)
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
        out.push({
          cfg: tp.id,
          sym: p.sym,
          side: p.side,
          // an ATR protect trades the distances resolved for this entry (concrete stop / target)
          protect: p.protect ?? tp.protect,
          barT,
          kind: tp.kind,
          volFactor: volumeFactorForIndication(tp.ind, this.wf.indicationVolumeFactors),
        });
      }
    }
    // the step's reasons stay; the pending ones are this call's
    this.status.paperSkips = {
      ...Object.fromEntries(Object.entries(this.status.paperSkips ?? {}).filter(([k]) => !k.startsWith("pending:"))),
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
  const unit = (x: { cfg: string; sym: string; side: number; entryT: number }) => sized.units.get(orderKey(x)) ?? s.paperNotional;
  const price = (sym: string, t: number) => candles.get(sym)?.closeAtOrBefore(t) ?? null;
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
  /** sub-strategy of the set (trailing / DCA / Axis exits are managed by the simulation) */
  kind?: string;
}

/** CoreRuntime.listings: what the last paper step validated and keeps active, for paged listings (coreListing). */
export interface SetListings {
  paperStep: number;
  at: number;
  /** engine configs validated (seated) at the paper step, best score first, with their validation-window figures */
  validated: Array<{ id: string; range: string; kind: string; score: number; pf: number; n: number; net: number; ddt: number }>;
  /** per range: the rows of `validated` (best first) and the range's PF taken together on the validation windows */
  byRange: Record<string, { rows: number[]; gp: number; gl: number; pf: number | null }>;
  /** signal units active at the paper step (full pair × symbol × side × type); Base/discovery rows omit kind */
  active: Array<{ bot: string; ind: string; sym: string; side: 1 | -1; kind?: string }>;
  /** engine configs proven live by their own closes (live.engineProofN); null when the proof is off */
  proven: string[] | null;
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
  "robustFrac",
  "rank",
  "bots",
  "preGate",
  "familySeats",
  "familyNeedsBase",
  "seatPer",
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
  "invertSeats",
] as const;
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
  // symbol gate: veto (a proven loser on the symbol is skipped) / proven (only proven symbols) / per side / off
  if (p.symGate !== undefined && !["veto", "proven", "vetoSide", "provenSide", "off"].includes(String(p.symGate)))
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
        ? { perInd: a.perInd.filter((r) => ["mc", "mn", "mp", "sh", "gn", "lg", "wide"].includes(r)) }
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
  if (p.causalBase !== undefined) p.causalBase = Boolean(p.causalBase); // direction gate: last N candidates of the side (0 = off; the book keeps 64)
  if (p.bestFirst !== undefined) p.bestFirst = Boolean(p.bestFirst);
  num("laneSeats", 0, 40, true);
  num("microSeats", 0, 100_000, true); // 0 = no cap
  if (p.bots !== undefined)
    p.bots = Array.isArray(p.bots) ? (p.bots as unknown[]).map(String).slice(0, 20) : [];
  return p as Partial<WalkForwardOptions>;
}

/**
 * Saved walk-forward options from before unlimited orders carry the old order caps (3 per symbol, 16 per side,
 * 60 open): they are dropped once so every order works; caps chosen afterwards are kept.
 */
function migrateWfCaps(db: CoreDb): Partial<WalkForwardOptions> {
  const saved = db.kvGet<Partial<WalkForwardOptions>>("wf") ?? {};
  const v = db.kvGet<number>("wfCapsV") ?? 0;
  if (v >= 27) return saved;
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
      !!r && typeof r === "object" && JSON.stringify((r as { tp?: unknown }).tp) === JSON.stringify(tp);
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
        if (p.settings?.grid) p.settings = { ...p.settings, grid: moveGrid(p.settings.grid as never) };
        if (p.settings && formerBlock(p.settings.block as Partial<BlockConfig>)) delete p.settings.block;
      }
      db.kvSet("presets", presets);
    }
  }
  if (v < 17) {
    // every config possibility is computed: a grid still on the former horizon-fit default moves to it off
    const unfit = <T extends { rangeFit?: { enabled?: boolean } }>(g: T): T =>
      g.rangeFit && g.rangeFit.enabled === true && Object.keys(g.rangeFit).length === 1 ? { ...g, rangeFit: { enabled: false } } : g;
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
    const g = st?.grid as { general?: { slOfTp?: number[] } | false; long?: { slOfTp?: number[] } | false } | undefined;
    for (const r of [g?.general, g?.long])
      if (r && JSON.stringify(r.slOfTp) === JSON.stringify([0.5, 0.75, 1])) r.slOfTp = [...WIDE_TARGET_SL];
  }
  if (v < 22) {
    // every TP × SL × Trail in every range (operator, 13 Oct): a range lever still on its former default moves to the
    // new one, field by field; a value chosen since stays
    const g = st?.grid as Record<string, Record<string, unknown> | false | undefined> | undefined;
    for (const [key, now] of Object.entries(FORMER_GRID_13OCT)) {
      const r = g?.[key];
      if (!r) continue;
      for (const [field, [was, next]] of Object.entries(now))
        if (JSON.stringify(r[field]) === JSON.stringify(was)) r[field] = Array.isArray(next) ? [...next] : next;
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
    if (st && JSON.stringify(st.focus) === JSON.stringify(FORMER_FOCUS_13OCT)) st.focus = [...DEFAULT_SETTINGS.focus];
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
    const migrateExchangeSettings = (settings: SettingsPatch | undefined) => {
      if (!settings?.live) return false;
      const live = settings.live as unknown as Record<string, unknown>;
      // Former unlimited and shipped-12 live defaults inherit the 100-slot exchange ceiling. Preserve other
      // deliberate lower caps, and remove the old symbol-count limiter from settings and presets.
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
  db.kvSet("wf", pickWf(out));
  if (st) db.kvSet("settings", st);
  db.kvSet("wfCapsV", 27);
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
  // abandoned work (stop / newer generation) stops taking new items
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length && alive()) await fn(items[i++]);
  });
  await Promise.all(workers);
}

/** Hard floors of the engine configs' stop and trailing distance (Settings → Protect grid). */
/**
 * Workers for the preset comparison: each one holds its own walk-forward state over every tape (about the size of
 * the packed tapes again). At most as many as the free memory carries after a reserve, at least one.
 */
export function compareWorkers(pool: number, tapeBytes: number, freeBytes = os.freemem()): number {
  const per = Math.max(256e6, tapeBytes * 1.1);
  const fit = Math.floor(Math.max(0, freeBytes - 1e9) / per);
  return Math.max(1, Math.min(pool, fit));
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
function signalHistValidationOf(
  settings: CoreSettings,
  coordinatorProtects: readonly Protect[],
): SignalHistValidation {
  const tags = new Set<"sh" | "gn" | "lg">();
  for (const protect of coordinatorProtects)
    if (protect.tag === "sh" || protect.tag === "gn" || protect.tag === "lg") tags.add(protect.tag);
  return {
    cost: settings.cost,
    minPf: settings.gates.minPf,
    minTrades: settings.gates.minTrades,
    maxDdr: settings.gates.maxDdr,
    rangeMinPf: Object.fromEntries([...tags].map((tag) => [tag, minPfOf(settings.gates, tag)])),
  };
}

/** Position-cost exit configs for Signals Coordination, restricted to the selected Short / Normal(General) / Long ranges. */
export function signalCoordinationProtects(
  grid: CoreSettings["grid"],
  cost: number,
  ranges: SignalSettings["coordination"]["ranges"],
): Protect[] {
  const selected = signalCoordinationRanges(ranges);
  return protectGrid(15, {
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
  }, cost).filter((p) => p.tag === "sh" || p.tag === "gn" || p.tag === "lg");
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
  const rangeGrid = s.grid as unknown as Record<string, unknown> & { minimalPlus?: { enabled?: boolean } };
  const RANGE_GRID_KEY: Record<string, string> = { mc: "micro", mn: "minimal", sh: "short", gn: "general", lg: "long" };
  const rangeOn = (tag: string) =>
    !tag || (!off.has(tag) && (tag === "mp" ? !!rangeGrid.minimalPlus?.enabled : !!rangeGrid[RANGE_GRID_KEY[tag]]));
  return {
    rangeOn,
    applies: { enabled: rangeOn, minTf: rangeMinTfOf(s.grid), microOwnInds: microOwnInds(s.grid), baseTf: s.tfMin },
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
  passed: ComboRun[];
  pairTags: Record<string, string[]>;
  pairTps: Record<string, Record<string, readonly number[]>>;
  added: number;
} {
  const pairTags: Record<string, string[]> = {};
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
    return true;
  });
  // grid.allSets (measurement): every indication builds its complete config sets — its best pair at Base (bot ×
  // lane, passed or not) and every pair that passed build every range they apply to, every target × stop × trail
  // × hold; the evaluation alone decides the seats. (Every pair's whole grid: ~12 M Micro tapes on 8 symbols.)
  // (`added`: the pairs allSets builds for measurement that did not pass Base — never counted as passed)
  let added = 0;
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
      if (!inPassed.has(k)) {
        passed.push(r);
        inPassed.add(k);
        added++;
      }
    }
  }
  return { passed, pairTags, pairTps, added };
}

function protectFloors(s: CoreSettings): EntryFloors {
  const fit = s.grid?.rangeFit;
  return {
    minSl: s.protectFloor?.minSl ?? DEFAULT_SETTINGS.protectFloor.minSl,
    minTrail: s.protectFloor?.minTrail ?? DEFAULT_SETTINGS.protectFloor.minTrail,
    // range cells fitted to the indication's horizon only when the fit is on; every computed tape is kept (the
    // gates decide the seats; a tape that cannot seat yet still shows in the evaluation and statistics)
    rangeFit: fit && fit.enabled !== false ? { ...DEFAULT_RANGE_FIT, ...fit } : null,
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
export const MAINNET_VALID_LAST_N = 50;
/** Real money: signals validate on at least their last 10 closes (their activity in a window; see walkforward) */
export const MAINNET_SIGNAL_VALID_LAST_N = 10;

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
  return { todo: combos.filter((c, i) => i % slices === sliceNo || !cache.runs.has(key(c))), sliceNo };
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
    axis: { ...base.axis },
    grid: { ...base.grid },
    fees: { ...base.fees },
    adjust: { ...base.adjust },
    signals: mergeSignals(base.signals),
    sizing: sizingSettings(base.sizing),
  };
  for (const p of patches) {
    if (!p) continue;
    out = {
      ...out,
      ...p,
      gates: { ...out.gates, ...(p.gates ?? {}) },
      live: { ...out.live, ...(p.live ?? {}) },
      toggles: { ...out.toggles, ...(p.toggles ?? {}) },
      tactics: { ...out.tactics, ...(p.tactics ?? {}) },
      focus: p.focus ? [...p.focus] : out.focus,
      pinned: p.pinned ? [...p.pinned] : out.pinned,
      disabledKinds: p.disabledKinds ? [...p.disabledKinds] : (out.disabledKinds ?? []),
      block: { ...out.block, ...(p.block ?? {}) },
      dca: { ...out.dca, ...(p.dca ?? {}) },
      axis: { ...out.axis, ...(p.axis ?? {}) },
      grid: { ...out.grid, ...(p.grid ?? {}) },
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
  return normalizeLanes({ ...out, live });
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

/**
 * Every lane's series from base candles: the base as stored, 5m / 15m / 30m resampled (completed bars only), each
 * over its own history (tfDays) plus `extraDays` (a backtest window).
 */
export function laneSeriesFrom(
  candles: ReadonlyMap<string, CandleSeries>,
  s: CoreSettings,
  extraDays = 0,
): Bars[] {
  const out: Bars[] = [];
  for (const [sym, cs] of candles) out.push(...laneSeriesOf(sym, cs, s, extraDays));
  return out;
}

/**
 * One symbol's lanes: the base as stored, each resampled lane from only the base bars of its last n + 1 buckets
 * (market/candle-series.ts resampleTailBars: the same bars as resampling everything and keeping the last n).
 */
export function laneSeriesOf(sym: string, cs: CandleSeries, s: CoreSettings, extraDays = 0): Bars[] {
  // the enabled lanes ride on every series (Bars.lanes): a combined lane agrees with the higher ENABLED lanes, the
  // ones laneInds generates it from (the whole ladder agreed with 15m / 30m on a desk running 1m and 5m only)
  const lanes = Object.freeze([...(s.tfs ?? [s.tfMin])]);
  const out: Bars[] = [];
  for (const tf of lanes) {
    const n = laneBars(s, tf) + Math.round((extraDays * 24 * 60) / tf);
    const b = tf === s.tfMin ? barsOfSeries(sym, tf, cs, cs.n - n, cs.n) : resampleTailBars(sym, cs, s.tfMin, tf, n);
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
  await stepLive(r, intents, gen);
}

// ── One runtime per exchange connection ─────────────────────────────────────────────────────────────────────
// Every connection (x01 mainnet, vst-01, vst-02) has its own runtime: its own settings, presets, paper book, live
// ledger, state file and snapshot, and its own loop. They run side by side in the process and share only what is
// the same for all of them: the market feed (one request for every connection), the worker pool (capped at the
// cores, queued) and the exchange's rate-limit pause. The primary connection keeps the original state files, so an
// existing install keeps its data; the others get `<state>.<conn>.json` / `<snapshot>.<conn>.sqlite`.

export const CONN_IDS: readonly ConnId[] = ["bingx-vst-02", "bingx-vst-01", "bingx-x01"];
export const isConnId = (x: unknown): x is ConnId => typeof x === "string" && (CONN_IDS as readonly string[]).includes(x);

/** The connection holding the original state: CTS_CORE_PRIMARY_CONN, else the saved live connection, else vst-02. */
export function primaryConn(): ConnId {
  const env = process.env.CTS_CORE_PRIMARY_CONN?.trim();
  if (isConnId(env)) return env;
  const live = coreDb().kvGet<Partial<CoreSettings>>("settings")?.live as { connId?: unknown } | undefined;
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
): ConfigTape[] {
  const ids = new Set(built.map((t) => t.id));
  const carried = prev.filter(
    (t) => !isSignalInd(t.ind) && !!t.protect.tag && tags.has(t.protect.tag) && !ids.has(t.id),
  );
  return carried.length ? [...built, ...carried] : built;
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
function testMarket(): { settings?: SettingsPatch; opts: { market?: "synthetic"; feed?: Partial<MarketFeed>; priceStream?: null } } {
  if (process.env.CTS_CORE_MARKET !== "synthetic") return { opts: {} };
  const settings = process.env.CTS_CORE_TEST_SETTINGS ? (JSON.parse(process.env.CTS_CORE_TEST_SETTINGS) as SettingsPatch) : undefined;
  return { settings, opts: { market: "synthetic", feed: { tickers: async () => [] }, priceStream: null } };
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
      G.__ctsCoreRuntime = new CoreRuntime(coreDb(), testMarket().settings, { conn: c, ...testMarket().opts });
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
  if (rt.settings.live.connId === "bingx-x01") throw new Error("the probe is for demo connections only");
  rt.wf.probe =
    perRange > 0 || perCell > 0
      ? {
          perRange: Math.min(20, Math.max(0, Math.floor(perRange))),
          ...(perCell > 0 ? { perCell: Math.min(5, Math.floor(perCell)) } : {}),
        }
      : null;
  rt.kick();
}
