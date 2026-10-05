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
  GENERAL_RANGE,
  MAX_BACKTEST_DAYS,
  GRID_VARIANTS_MAX,
  LONG_RANGE,
  MINIMAL_RANGE,
  SHORT_RANGE,
  STRATEGY_PRESETS,
  TF_CHOICES,
  type CoreSettings,
  type SettingsPatch,
} from "../config.ts";
import { gateMinimalPlus, minPfOf, RANGE_LABEL, RANGE_TAGS, rangeGateOf, rangeMinTfOf } from "../minimal-coord.ts";
import { microSpecs } from "../indications/micro.ts";
import { sharedFeed } from "../market/shared-feed.ts";
import type { ConnId } from "../exchange/bingx.server.ts";
import { tacticWarmupBars } from "../indications/filters.ts";
import { evaluateAdjust, pausedSets, type AdjustState } from "../adjust.ts";
import { prehistStatsGen, type PrehistStats } from "../prehist.ts";
import {
  abortWorkers,
  poolSize,
  runOnWorkers,
  shareBars,
  slices,
  workerActivity,
  workersAvailable,
} from "./pool.server.ts";
import {
  collectGarbage,
  fallbackLabel,
  fallbackProtects,
  heapAndBuffersMb,
  MEM_FALLBACK_MAX,
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
import type { BlockConfig, Candle, OpenPosition, Protect, Trade } from "../domain/types.ts";
import { barsFromCandles, resample, syntheticCandles, tailBars, headBars } from "../market/bars.ts";
import {
  fetchHistory,
  fetchKlines,
  fetchTickers,
  pickUniverse,
  forceSymbols,
  normSymbol,
  rankUniverse,
  type Ticker,
} from "../market/bingx.ts";
import { noteRateLimit, rateLimitedUntil } from "../exchange/bingx.server.ts";
import {
  allCombos,
  type ComboRun,
  kindOfId,
  laneClosesWith,
  mainByLane,
  parseConfigId,
  passesBase,
  basePassTags,
  baseRangeCounts,
  baseSetsGates,
  rangeAppliesTo,
  type BaseRangeCount,
  baseRangeProtects,
  laneInds,
  makeUniverse,
  forgetCombo,
  runCombo,
  runPipeline,
  type PipelineOutput,
  type PipelineProgress,
} from "../pipeline/pipeline.ts";
import {
  buildTapesGen,
  defaultWalkForward,
  selectAt,
  selectDurable,
  selectFixed,
  selectFixedGen,
  withProbe,
  execDecision,
  walkForwardGen,
  walkForwardSteps,
  feedBooks,
  signalGuardFor,
  splitSignalTapes,
  bestFirst,
  coordBlock,
  coordSettings,
  sourceUnstable,
  type CoordSettings,
  packTapesGen,
  capsOf,
  sigCfg,
  gridVariants,
  type ConfigTape,
  type EntryFloors,
  DEFAULT_RANGE_FIT,
  type WalkForwardOptions,
  type WalkForwardResult,
  lowerBound,
  tradeAt,
  selectionScoreAt,
  positionMult,
  positionVolume,
} from "../sim/walkforward.ts";
import { monitorEventLoopDelay, performance as nodePerf } from "node:perf_hooks";
import {
  liveEntryOk,
  liveGate,
  liveGroupGates,
  liveGroupOf,
  type LiveGate,
  type LiveValidationStatus,
} from "../live-validation.ts";

import os from "node:os";
import { type BlockBook, blockBookOf } from "../sim/block.ts";
import {
  activeSignals,
  signalCandidates,
  mergeSignals,
  signalCombos,
  signalProtects,
  signalSettings,
  SignalGuard,
} from "../signals.ts";
import type { SignalAccept, SignalSettings } from "../signal-config.ts";
import { PriceStream, type StreamStats } from "./stream.server.ts";
import { isSignalInd, laneOf, signalSourceOf } from "../indications/registry.ts";
import { orderKey, sizeBook, sizeBookGen, sizingSettings } from "../sizing.ts";
import { presetSeries, type PresetSeries } from "../statistics.ts";
import { statsOf } from "../metrics/stats.ts";
import { auditState, auditStateGen, type AuditInput, type AuditReport } from "../audit.ts";
import { closedPositions, openTimeline } from "../positions.ts";
import { backfillLabel, batchesOf, DONE_STAGE, estimatedFraction, overallOf, pipelineStage } from "../progress.ts";
import { connDb, connPath, coreDb, type CoreDb } from "./db.server.ts";

const H = 3_600_000;
const SLICE_MS = 12;
const BACKTEST_LIMIT_MS = 15 * 60_000;
/** workers that failed are tried again after this long */
const WORKERS_RETRY_MS = 10 * 60_000;
/** paper book rows written per transaction (one slice) */
const PAPER_ROWS = 2000;
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
  symbols: Record<string, { state: string; bars?: number; n?: number; pf?: number }>;
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
  /** after the Base PF evaluation, per range type (Wide, Micro … Long, Signals): sets evaluated / passed and PF */
  baseByRange?: Array<BaseRangeCount & { range: string; enabled: boolean }>;
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
  /** the last event-loop stalls over 150 ms, with what was running (the live tick waits behind them) */
  stalls?: Array<{ at: number; ms: number; where: string }>;
  /** live validation of the selected configs (live last N) */
  liveValidation?: LiveValidationStatus;
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

/** identity of a paper position (lane order): config, symbol, entry time */
const posId = (p: { cfg: string; sym: string; entryT: number }) => `${p.cfg}|${p.sym}|${p.entryT}`;

/** true when `px` is at or through the position's stop (long: at or below, short: at or above) */
export function crossedStop(p: { side: number; stop: number }, px: number): boolean {
  if (!(p.stop > 0) || !(px > 0)) return false;
  return p.side === 1 ? px <= p.stop : px >= p.stop;
}

export interface PaperBook {
  selected: string[];
  /** selection score per selected engine config (its rank; fixed mode: wf.rankBy) — the live top-config fill */
  scores?: Map<string, number>;
  eligible: number;
  /** stopHit: time a tick price crossed the position's stop (its lane leaves the live control at once) */
  /** legs: Block type overall — the extra volume of every raising source (its own position) */
  positions: Array<
    OpenPosition & { vol?: number; level?: number; stopHit?: number; legs?: Partial<Record<string, number>> }
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

export class CoreRuntime {
  readonly db: CoreDb;
  settings: CoreSettings;
  wf: WalkForwardOptions;
  status: RuntimeStatus;
  candles = new Map<string, Candle[]>();
  tickers: Ticker[] = [];
  pipeline: PipelineOutput | null = null;
  tapes: ConfigTape[] = [];
  sim: WalkForwardResult | null = null;
  paper: PaperBook;
  /** the paper book was stepped at least once since start */
  private paperStepped = false;
  private lastTrim = 0;
  /** live prices (public WebSocket) for the tick; null for the synthetic test market */
  stream: PriceStream | null = null;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private ticking = false;
  private liveStartedAt = 0;
  private liveSlowNoted = false;
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
  /** the paper step's live validation for new entries (null = off) */
  private liveEntryGate: ((tp: ConfigTape) => boolean) | null = null;
  /** loop generation: a cycle from an older generation never reschedules or publishes */
  private gen = 0;
  private stopped = false;
  private resetUniverse = false;
  private loop = monitorEventLoopDelay({ resolution: 20 });
  /** what runs on the main thread now (a synchronous phase), for the stall attribution */
  private busyPhase = "";
  private stallTimer: ReturnType<typeof setInterval> | null = null;
  /** every 50 ms: a tick that comes late by more than 150 ms is a stall, recorded with what was running */
  private startStallWatch() {
    let last = performance.now();
    this.stallTimer = setInterval(() => {
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
  private snapshotPath = process.env.CTS_CORE_SNAPSHOT || "";
  /** the exchange connection this runtime belongs to (one runtime per connection); unset = tests / scripts */
  readonly conn: ConnId | undefined;
  private lastSnapshot = 0;
  onLive?: (rt: CoreRuntime, intents: LiveIntent[], gen: number) => Promise<void>;

  /** market source: live BingX (the app) or synthetic (automated tests only, explicit opt-in) */
  private market: "bingx" | "synthetic";
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
  private memLastAbort: string | null = null;
  /** the last forced collection (time, heap + buffers after it): soft pressure collects at most every 30 s */
  private memGcLast: { at: number; mb: number } | null = null;
  /** computes aborted in a row at the lightest level, and the earliest next try (memRetryDelayMs) */
  private memMaxAborts = 0;
  private memRetryAt = 0;
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
    } = {},
  ) {
    this.conn = opts.conn;
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
    // a restart continues the paper book: its open positions (held — live keeps their exchange positions instead of
    // flattening every one whose config is no longer selected) and its start (the carried P&L window)
    const book = this.db.kvGet<{ startedAt?: number; selected?: string[]; positions?: PaperBook["positions"] }>(
      "paperBook",
    );
    if (book && Array.isArray(book.positions)) {
      this.paper.positions = book.positions;
      this.paper.selected = Array.isArray(book.selected) ? book.selected : [];
      if (typeof book.startedAt === "number" && book.startedAt > 0) this.paper.startedAt = book.startedAt;
    }
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
    if (!this.stopped && this.status.state !== "idle" && this.status.state !== "error") return;
    if (this.snapshotPath) this.db.journalPath = `${this.snapshotPath}.journal`;
    if (this.status.state === "idle" && this.snapshotPath && this.db.restore(this.snapshotPath)) {
      // the ledger writes since that snapshot (a crash between snapshots loses none of them)
      const n = this.db.replayJournal();
      this.db.event("info", `restored snapshot ${this.snapshotPath}${n ? ` + ${n} journaled write(s)` : ""}`);
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
    if (!this.stream && this.market === "bingx") this.stream = new PriceStream();
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

  async tick() {
    if (this.ticking || this.stopped) return;
    this.ticking = true;
    const t0 = performance.now();
    try {
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
      let newHits: Record<string, { at: number; stop: number }> | null = null;
      const book = this.tickBook();
      const positions = this.paper.positions;
      for (const g of book.groups) {
        const px = this.stream?.price(g.sym) ?? this.candles.get(g.sym)?.at(-1)?.c;
        // no price: these positions keep their marks and add nothing to the open result (as before)
        if (!px) continue;
        if (px !== g.px) {
          let sum = 0;
          for (const pi of g.idx) {
            const p = positions[pi];
            if (!(p.entry > 0)) continue;
            // a price through the stop stops the position now (the live control drops its lane at once); the paper
            // book records the exit when the bar closes, at the stop, as the simulation does
            if (!p.stopHit && crossedStop(p, px)) {
              p.stopHit = Date.now();
              (newHits ??= {})[posId(p)] = { at: p.stopHit, stop: p.stop };
            }
            const at = p.stopHit ? p.stop : px;
            p.mtm = (p.side * (at - p.entry)) / p.entry - cost;
            // an open order's result is its unit result × its Block volume (as its closed r will be)
            sum += p.mtm * (p.vol ?? 1) * book.units[pi];
          }
          g.px = px;
          g.sum = sum;
        }
        open += g.sum;
      }
      // the tick's stop crossings persisted in one write (a read and a write of every hit per crossing before)
      if (newHits) {
        const hits = this.db.kvGet<Record<string, { at: number; stop: number }>>("stopHits") ?? {};
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
              "UPDATE paper_positions SET mtm = ?, at = ? WHERE cfg = ? AND sym = ? AND entry_t = ?",
              p.mtm,
              Date.now(),
              p.cfg,
              p.sym,
              p.entryT,
            );
        });
      }
      // live: decisions every tick on the newest paper book and prices (the exchange book is re-read over
      // REST at most every live.syncMs, and at once after own orders)
      const stale = this.settingsStale || this.resetUniverse;
      if (
        !stale &&
        this.paperStepped &&
        this.onLive &&
        this.settings.live.enabled &&
        !this.liveBusy
      ) {
        // the live step runs detached: the tick (marking to market) never waits on the exchange; a step never
        // overlaps the previous one (no duplicate orders), and one in flight too long is reported
        this.liveBusy = true;
        this.liveStartedAt = Date.now();
        this.livePhase = "start";
        const epoch = this.liveEpoch;
        const intents = this.pendingEntries();
        void this.onLive(this, intents, this.gen)
          .catch((err) =>
            this.db.event("error", `live step failed: ${err instanceof Error ? err.message : err}`),
          )
          .finally(() => {
            // a step the watchdog abandoned never clears the flag of the step that replaced it
            if (epoch !== this.liveEpoch) return;
            this.liveBusy = false;
            this.liveSlowNoted = false;
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
    if (self.backtestJob === undefined) self.backtestJob = null;
    if (typeof self.lastConsoleAt !== "number") self.lastConsoleAt = 0;
    if (typeof self.backfillKey !== "string") self.backfillKey = "";
    if (self.audit === undefined) self.audit = null;
    if (typeof self.paperStepped !== "boolean") self.paperStepped = false;
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
      this.backtestJob.state = "error";
      this.backtestJob.error = "timed out";
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
    const gen = this.gen;
    const t0 = performance.now();
    this.inCycle = true;
    // a job left open by an abandoned cycle (watchdog, stop, error) never carries its bar into this one
    this.jobOpen = false;
    try {
      if (this.resetUniverse) {
        this.resetUniverse = false;
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
      const newBars = await this.syncMarket(gen);
      if (gen !== this.gen) return;
      // the universe changed while syncing (timeframe / symbols / history): start over with the new one
      if (this.resetUniverse) return;
      // after aborts on memory pressure at the lightest level the next compute waits (memRetryDelayMs); the live
      // control keeps running on the current book meanwhile
      const memWait =
        (newBars || this.dirty) && (Date.now() < this.memRetryAt || this.memStartBlocked());
      if (memWait) this.dirty = true;
      const computed = (newBars || this.dirty) && !memWait;
      if (computed) {
        this.memGuardStart();
        try {
          await this.compute(gen);
        } finally {
          this.memGuardStop();
        }
        // finished: the fallback steps back up once memory has room again (a compute that saw hard pressure in an
        // in-process phase finished anyway — the next one still runs lighter)
        this.memAfterCompute(this.memPressured, false);
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
          await this.driveSliced("Paper", this.stepPaperGen(), gen, (f) =>
            this.setStage("Paper", 0.8 * f, 1, paperLabel),
          );
        } finally {
          this.busyPhase = "";
        }
        const pt = this.paperTimings;
        if (pt && this.status.phases.Paper)
          this.status.phases.Paper.slowest = `select ${Math.round(pt.select)} · candidates ${Math.round(pt.cands)} · entries ${Math.round(pt.exec)} ms over ${pt.n} (wall, sliced)`;
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
        if (this.status.prehistoric) this.status.prehistoric.counts.real = this.paper.selected.length;
        this.endJob(
          `${this.computeSummary ? `${this.computeSummary} · ` : ""}${this.paper.selected.length} seats · ${this.paper.positions.length} open`,
        );
        this.emit("paper");
      }
      if (!this.stopped) this.status.state = "running";
      this.emit("state");
      this.status.error = null;
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
        // the bar does not stay on the aborted stage as if it were still running
        this.status.label = `compute aborted at ${this.status.stage} (memory) — retrying lighter`;
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
        const memWaitMs = this.dirty ? this.memRetryAt - Date.now() : 0;
        if (!this.stopped)
          this.schedule(
            backoff ||
              (memWaitMs > 0
                ? Math.min(memWaitMs, this.nextInterval())
                : this.dirty
                  ? 0
                  : this.nextInterval()),
          );
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
    const spacing = (cs: Candle[]) => {
      let m = Infinity;
      for (let i = Math.max(1, cs.length - 10); i < cs.length; i++)
        m = Math.min(m, cs[i].t - cs[i - 1].t);
      return m;
    };
    const wrongTf = [...this.candles.values()].some(
      (cs) => cs.length > 2 && spacing(cs) !== baseMs,
    );
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
          this.setStage("backfill", i + 1, s.symbols, backfillLabel(`SYN${i}-USDT`, 1, 1, this.candles.size, s.symbols), i === 0);
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
            await rankUniverse(this.tickers, s.symbols + offset, s.symbolRank ?? "volatility1h", this.feed.klines)
          ).slice(offset),
          s.forceSymbols,
          s.symbols,
        );
        // the universe of this run: the symbol count, or every forced symbol when there are more of them
        // (forceSymbols keeps them all) — the cap was s.symbols, which dropped forced symbols beyond it
        const target = ranked.length;
        const missing = ranked
          .filter((x) => !this.candles.has(x))
          .slice(0, Math.max(0, target - this.candles.size));
        // progressive start: load a batch, compute it completely, start realtime for it, then the next batch
        const batch = Math.max(5, Math.ceil(target / 4));
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
              this.db.event("warn", `${sym} history: ${e instanceof Error ? e.message : e} — skipped this batch`);
              return [];
            });
            if (gen !== this.gen) return;
            if (cs.length >= minBars) {
              await this.storeCandles(sym, cs);
              this.prehistSyms.set(sym, { state: "computing", bars: cs.length });
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
      if (this.market === "synthetic" || !this.prehistMore(s)) this.backfillKey = uniKey;
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
    const wantBars = Math.round((s.historyDays * 24 * 60) / s.tfMin);
    const behind = [...this.candles.entries()].filter(
      ([sym, cs]) =>
        now - (cs[cs.length - 1]?.t ?? 0) > 300 * tfMs && (this.staleUntil.get(sym) ?? 0) < now,
    );
    if (behind.length) {
      let repaired = 0;
      await mapLimit(
        behind,
        4,
        async ([sym, old]) => {
          const prevLast = old[old.length - 1]?.t ?? 0;
          const cs = await this.feed
            .history(sym, s.tfMin, wantBars, { pauseMs: 60 })
            .catch((e) => {
              this.db.event("warn", `${sym} gap repair: ${e instanceof Error ? e.message : e} — retried next cycle`);
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
    const paused = rateLimitedUntil(Date.now(), "*");
    const due = paused
      ? []
      : [...this.candles.entries()].filter(([sym, cs]) => {
          const last = cs[cs.length - 1]?.t ?? 0;
          return (
            last + 2 * tfMs <= now &&
            now - last <= 300 * tfMs &&
            now - (this.klinesAt.get(sym) ?? 0) >= 1_000
          );
        });
    if (!paused) for (const [sym] of due) this.klinesAt.set(sym, now);
    let banLogged = false;
    await mapLimit(due, 6, async ([sym, cs]) => {
      if (rateLimitedUntil(Date.now(), "*")) return;
      const last = cs[cs.length - 1]?.t ?? 0;
      try {
        const fresh = await this.feed.klines(sym, s.tfMin, {
          startT: last + 1,
          limit: 300,
          nowT: now,
        });
        const extra = fresh.filter((c) => c.t > last);
        if (extra.length && gen === this.gen && this.candles.has(sym)) {
          await this.storeCandles(sym, extra, true);
          added += extra.length;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const until = noteRateLimit(msg);
        if (until) {
          this.klinesAt.delete(sym);
          if (!banLogged) {
            banLogged = true;
            this.db.event(
              "warn",
              `klines paused: exchange rate limit until ${new Date(until).toISOString()}`,
            );
          }
          return;
        }
        this.db.event("warn", `${sym} klines: ${msg}`);
      }
    });
    this.status.heartbeat = Date.now();
    if (added) {
      try {
        this.tickers = await this.feed.tickers();
        this.upsertSymbols();
      } catch {
        /* tickers are cosmetic */
      }
    }
    return added > 0;
  }

  private loadCandlesFromDb() {
    const rows = this.db.all<Candle & { sym: string }>(
      "SELECT sym, t, o, h, l, c, v FROM candles ORDER BY sym, t",
    );
    for (const r of rows) {
      const arr = this.candles.get(r.sym) ?? [];
      arr.push({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v });
      this.candles.set(r.sym, arr);
    }
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
    const want = Math.round((this.settings.historyDays * 24 * 60) / this.settings.tfMin);
    const arr = append ? [...(this.candles.get(sym) ?? []), ...cs] : [...cs];
    const trimmed = arr.slice(Math.max(0, arr.length - want));
    this.candles.set(sym, trimmed);
    const last = trimmed[trimmed.length - 1]?.t ?? 0;
    if (last > this.status.lastBarT) this.status.lastBarT = last;
    const ins =
      "INSERT OR REPLACE INTO candles (sym, t, o, h, l, c, v) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const rows = cs.length > want ? cs.slice(cs.length - want) : cs;
    // 1000 rows per transaction (~25 ms): 4000 held the event loop for ~115 ms
    for (let i = 0; i < rows.length; i += 1000) {
      if (i > 0) await yieldNow();
      const part = rows.slice(i, i + 1000);
      this.db.tx(() => {
        for (const c of part) this.db.run(ins, sym, c.t, c.o, c.h, c.l, c.c, c.v);
      });
    }
    if (trimmed.length)
      this.db.run("DELETE FROM candles WHERE sym = ? AND t < ?", sym, trimmed[0].t);
  }

  private upsertSymbols() {
    const tick = new Map(this.tickers.map((t) => [t.sym, t]));
    this.db.tx(() => {
      for (const [sym, cs] of this.candles) {
        const t = tick.get(sym);
        this.db.run(
          "INSERT OR REPLACE INTO symbols (sym, last, quote_vol, change_pct, bars, first_t, last_t, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          sym,
          t?.last ?? cs[cs.length - 1]?.c ?? 0,
          t?.quoteVol ?? 0,
          t?.changePct ?? 0,
          cs.length,
          cs[0]?.t ?? 0,
          cs[cs.length - 1]?.t ?? 0,
          Date.now(),
        );
      }
    });
  }

  // ── memory guard ─────────────────────────────────────────────────────
  private memGuardStart() {
    this.memPressured = false;
    this.memSoftNoted = false;
    this.memMinAvail = Infinity;
    if (this.memTimer) clearInterval(this.memTimer);
    this.memTimer = setInterval(() => this.memGuardTick(), 1000);
    (this.memTimer as { unref?: () => void }).unref?.();
    this.memGuardTick();
  }

  private memGuardStop() {
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
  memGuardTick() {
    const m = memInfo();
    this.memMinAvail = Math.min(this.memMinAvail, m.availMb);
    this.memStatus(m);
    if (m.level === "soft") {
      const gc = shouldCollect(Date.now(), this.memGcLast, heapAndBuffersMb()) && this.collectNow();
      if (!this.memSoftNoted) {
        this.memSoftNoted = true;
        this.db.event(
          "warn",
          `memory low: ${m.availMb} MB available (soft ${memSoftMb()} MB), this process ${m.rssMb} MB${gc ? " — garbage collected" : ""}`,
        );
      }
    }
    // hard: the compute aborts — its worker runs are stopped (whenever they run), an in-process phase at its next
    // slice (drive)
    if (m.level === "hard" && (!this.memPressured || workerActivity().inFlight > 0)) {
      const first = !this.memPressured;
      this.memPressured = true;
      const reason = `memory pressure: ${m.availMb} MB available (hard ${memHardMb()} MB), this process ${m.rssMb} MB — compute aborted`;
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
   * True = not now.
   */
  private memStartBlocked(): boolean {
    const m = memInfo();
    if (m.level !== "hard") return false;
    if (this.memFallback < MEM_FALLBACK_MAX) {
      const before = this.memFallback;
      this.memFallback++;
      this.memClean = 0;
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

  private memStatus(m: MemInfo) {
    this.status.mem = {
      availMb: m.availMb,
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
      const x = v as { stage?: string; label?: string } | null;
      return x && typeof x === "object" ? `${x.stage ?? ""} ${x.label ?? ""}`.trim() : "";
    };
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
        if (this.memPressured) throw new Error(this.memLastAbort ?? "memory pressure: compute aborted");
        slice = performance.now();
        stepT = slice;
      }
    }
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

  async compute(gen = this.gen) {
    const t0 = performance.now();
    this.dirty = false;
    this.settingsStale = false;
    this.status.state = "computing";
    // the job's bar: a compute after this cycle's backfill batch continues it, otherwise it starts at 0
    this.beginJob(false);
    this.status.computeStartedAt = Date.now();
    // this compute's phases (the previous paper step's Paper / Adjust / Audit stay until it runs again): a phase the
    // last compute ran and this one does not (workers → in-process, compare off) is not shown as current
    const prevPhases = this.status.phases;
    this.status.phases = {};
    for (const k of ["Paper", "Adjust", "Audit"]) if (prevPhases[k]) this.status.phases[k] = prevPhases[k];
    // never the last job's stage (e.g. "Realtime 100 %") under "computing" while the lane series are built
    this.setStage("Base", 0, 1, `preparing ${this.candles.size} symbols`, true);
    this.emit("state");
    this.touchPrehist();
    this.loop.reset();
    const settingsAt = this.status.settingsAt;
    // snapshot: a settings change during this compute applies to the next one
    const s = this.settings;
    const wf: WalkForwardOptions = {
      ...this.wf,
      paused: s.adjust?.enabled ? pausedSets(this.adjustState()) : undefined,
    };
    this.workersRetry();
    // memory fallback: the heaviest ranges stay out of this compute (the saved settings are unchanged)
    this.memComputeLevel = this.memFallback;
    if (this.memFallback > 0) {
      wf.protects = fallbackProtects(wf.protects, this.memFallback);
      wf.dcaProtects = fallbackProtects(wf.dcaProtects, this.memFallback);
    }
    // lane series per symbol, yielding between symbols (resampling 1m for every lane is not free)
    const allBars: ReturnType<typeof laneSeriesFrom> = [];
    for (const [sym, cs] of this.candles) {
      allBars.push(...laneSeriesFrom(new Map([[sym, cs]]), s));
      await yieldNow();
      if (gen !== this.gen) return;
    }
    const u = makeUniverse(allBars);
    if (!u.bars.length) return;
    // causal evaluation: the stages see only the history before the simulated run (its start, as walkForward sets it)
    const runStartT = Math.floor((u.nowT - wf.simH * H) / H) * H;
    const uStage = wf.causalBase ? makeUniverse(allBars.map((b) => headBars(b, runStartT))) : u;
    if (!uStage.bars.length) return;

    // Base (S1) → Main (S2 refine, S3 evaluate, S5 ranking) on the full history (stage names: pipelineStage)
    // Base on every CPU core: the lane combos are dealt round-robin over the worker pool (each worker a mix of
    // 1m … 30m work); the main thread only waits, so the server stays responsive. In-process fallback.
    let pre: { s1: ComboRun[] } | undefined;
    // bar series in shared memory once: every worker message then carries references, not copies
    const sharedU = workersAvailable() && !this.workersBroken ? shareBars(uStage.bars) : uStage.bars;
    this.status.workers = !workersAvailable()
      ? "unavailable (in-process)"
      : this.workersBroken
        ? "failed earlier (in-process)"
        : `${poolSize()} cores`;
    if (workersAvailable() && !this.workersBroken) {
      const combos = [
        ...allCombos(baseFocus(s), s.disabledKinds, s.tfs, microOwnInds(s.grid) ? (rangeMinTfOf(s.grid ?? {}).mc ?? 0) : 0),
        ...signalCombos(signalSettings(s.signals), s.tfs),
      ];
      const n = poolSize();
      // partial progression (CTS_CORE_BASE_SLICES = K > 1): each compute refreshes one K-th of the combos on the
      // new bars and keeps the others' last results, so every combo is recomputed every K computes at 1 / K of the
      // cost; a universe or Base settings change recomputes all of them
      const slices = Math.max(1, Math.min(24, Math.round(Number(process.env.CTS_CORE_BASE_SLICES) || 1)));
      const ck = (c: { bot: string; ind: string }) => `${c.bot}|${c.ind}`;
      const bkey = JSON.stringify([
        uStage.bars.map((b) => `${b.sym}@${b.tfMin}`),
        wf.causalBase ? runStartT : 0,
        microOwnInds(s.grid),
        s.tfDays,
        baseFocus(s),
        s.disabledKinds,
        s.tfs,
        s.signals,
        s.cost,
        s.tactics,
        baseRangeProtects(s.grid, s.cost),
        rangeMinTfOf(s.grid),
        // the gates decide which cell a range keeps (rangeCellPass in the worker): a gates patch must recompute
        // every combo, not reuse cells chosen under the old gates
        s.gates,
      ]);
      const cache = slices > 1 && this.baseCache?.key === bkey ? this.baseCache : null;
      const { todo, sliceNo } = baseSlice(combos, cache ? { runs: cache.runs, slice: cache.slice } : null, slices, ck);
      const parts: Array<typeof combos> = Array.from({ length: n * 2 }, () => []);
      todo.forEach((c, i) => parts[i % parts.length].push(c));
      const baseLabel = `Base on ${n} cores · ${todo.length}${todo.length < combos.length ? ` of ${combos.length}` : ""} combos${
        cache ? ` (slice ${sliceNo + 1}/${slices})` : ""
      }`;
      this.setStage("Base", 0, todo.length, baseLabel);
      const tb = performance.now();
      const eluB = nodePerf.eventLoopUtilization();
      try {
        const res = await runOnWorkers<{ runsJson: string[] }>(
          parts
            .filter((p) => p.length)
            .map((c) => ({
              type: "s1",
              bars: sharedU,
              combos: c,
              cost: s.cost,
              tactics: s.tactics,
              rangeProtects: baseRangeProtects(s.grid, s.cost),
              rangeMinTf: rangeMinTfOf(s.grid),
              microOwnInds: microOwnInds(s.grid),
              gates: s.gates,
            })),
          n,
          15 * 60_000,
          (fraction) => {
            if (gen === this.gen) this.setStage("Base", fraction, 1, baseLabel);
          },
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
      runPipeline(uStage, { ...s, focus: baseFocus(s) }, pre),
      (p: PipelineProgress) => {
        const x = pipelineStage(p);
        this.setStage(x.stage, x.fraction, 1, x.label);
      },
      gen,
    );
    await this.persistPipeline(pipeline, gen);
    this.pipeline = pipeline;
    this.lastUniverse = u;

    // walk-forward tapes on the recent tail: warm-up + long window + simulated run
    // + the warm-up the active tactics need (e.g. the 2-week volatility rank) before their first valid signal
    // (in each series' own bars: a 30m lane needs 30× fewer bars than the 1m lane for the same time)
    const tailOf = (tf: number) =>
      Math.round(((24 + Math.max(wf.preH, wf.longH) + wf.simH) * 60) / tf) +
      tacticWarmupBars(s.tactics);
    const wu = makeUniverse(allBars.map((b) => tailBars(b, tailOf(b.tfMin))));
    // Main candidates: Base combos by score (default protect, full history), plus every pair held right now
    // Base gate: only config sets with PF ≥ min PF (and positive net, enough trades) continue to Main → Real → Live
    const main = new Set<string>();
    // each pair at the default protect and at one cell of each enabled range, against that range's own min PF: the
    // ranges it passes are the ones whose configs it computes (pairTags)
    const pairTags: Record<string, string[]> = {};
    const setsGates = baseSetsGates(s.gates);
    // the ranges that build sets for a pair's indication (the tape builder's own rules): a pass in a range the pair
    // has no sets in is no pass — a Micro indication passing at the default cell had no set at all (Micro takes only
    // its own cells), so it "passed" Base and was never evaluated (audit: "every validated pair has config sets")
    const rangeGrid = s.grid as unknown as Record<string, unknown> & { minimalPlus?: { enabled?: boolean } };
    const RANGE_GRID_KEY: Record<string, string> = { mc: "micro", mn: "minimal", sh: "short", gn: "general", lg: "long" };
    const rangeOn = (tag: string) =>
      !tag || (tag === "mp" ? !!rangeGrid.minimalPlus?.enabled : !!rangeGrid[RANGE_GRID_KEY[tag]]);
    const applies = { enabled: rangeOn, minTf: rangeMinTfOf(s.grid), microOwnInds: microOwnInds(s.grid), baseTf: s.tfMin };
    // per pair, the range targets whose Base cells passed: the tape stage builds only those (baseTargets, on by
    // default — a range tag used to unlock every target of the range, most of them never Base-evaluated)
    const pairTps: Record<string, Record<string, readonly number[]>> = {};
    const targetsOn = s.grid?.baseTargets !== false;
    const passed = pipeline.s1.filter((r) => {
      if (isSignalInd(r.ind)) return false;
      const tags = basePassTags(r, setsGates, ALL_RANGE_TAGS).filter((t) => rangeAppliesTo(r.ind, t, applies));
      if (tags.length) pairTags[`${r.bot}|${r.ind}`] = tags;
      if (targetsOn && tags.length && r.rangeTps) {
        const per: Record<string, readonly number[]> = {};
        for (const t of tags) if (t && r.rangeTps[t]?.length) per[t] = r.rangeTps[t];
        if (Object.keys(per).length) pairTps[`${r.bot}|${r.ind}`] = per;
      }
      return tags.length > 0;
    });
    this.basePairTags = pairTags;
    this.status.basePassed = passed.length;
    this.status.baseEvaluated = pipeline.s1.length;
    // every timeframe lane gets its share of Main, so each lane is processed through to the end stages
    for (const k of mainByLane(passed, s.mainTop)) main.add(k);
    // positions from before the timeframe lanes (plain ids, another base timeframe) cannot be continued on the
    // 1m-based lanes: they are retired, not carried on unscaled tapes over every series
    if (s.tfs?.length) {
      const plain = (cfg: string) => laneOf(cfg.split("|")[1] ?? "").tf === null;
      const retired = this.paper.positions.filter((p) => plain(p.cfg));
      if (retired.length) {
        this.paper.positions = this.paper.positions.filter((p) => !plain(p.cfg));
        this.paper.selected = this.paper.selected.filter((id) => !plain(id));
        this.db.event(
          "info",
          `retired ${retired.length} paper position(s) from before the timeframe lanes (base timeframe changed)`,
        );
      }
    }
    const held = new Set<string>();
    for (const id of this.paper.selected) held.add(id.split("|").slice(0, 2).join("|"));
    // sets with open positions stay in the continuous stages until the position is closed
    for (const p of this.paper.positions) held.add(p.cfg.split("|").slice(0, 2).join("|"));
    for (const k of held) main.add(k);
    // a held config keeps its tape: a held pair that passed Base only in other ranges computes only those ranges'
    // cells (pairTags), and a config whose range is missing would lose its tape — its open position then vanished
    // from the paper book with no close (and live flattened it). Only that config is kept, not every cell of its
    // range: adding the range to the pair's tags built them all and let the pair take new seats in a range it had
    // not passed Base in.
    const heldIds = new Set<string>([...this.paper.selected, ...this.paper.positions.map((p) => p.cfg)]);
    // pinned pairs are evaluated in Base like every other pair (baseFocus): they reach Main only when they pass
    const passedKeys = new Set(passed.map((r) => `${r.bot}|${r.ind}`));
    for (const k of s.pinned ?? []) if (passedKeys.has(k)) main.add(k);
    // only pairs that passed Base take a seat; held pairs stay in Main to manage their open positions
    wf.basePassed = passedKeys;
    this.wf.basePassed = passedKeys;
    // Signals processing: the active signals and every signal pair still holding a position take the signal
    // configs, never the engine's protect grid
    const sig = signalSettings(s.signals);
    // the full-history ranking (status only): the simulation ranks causally per step on the tapes' results closed
    // before it, so every signal pair with enough Base trades on a symbol gets its tapes
    let sigActive = sig.enabled ? activeSignals(pipeline.s1, sig) : new Set<string>();
    // signal pairs pass the same Base gate as every engine pair (PF ≥ min PF, positive net, enough trades, DDR)
    const sigPairs = sig.enabled
      ? signalCandidates(
          pipeline.s1.filter(
            (r) => isSignalInd(r.ind) && (sig.baseGate === false || passesBase(r.full, s.gates)),
          ),
          sig.minTrades,
        )
      : new Set<string>();
    // a held signal pair keeps its tapes to manage its open positions; new entries still need Base + validation
    wf.signalBasePassed = new Set(sigPairs);
    this.wf.signalBasePassed = wf.signalBasePassed;
    for (const k of [...main])
      if (isSignalInd(k.split("|")[1] ?? "")) {
        main.delete(k);
        if (sig.enabled) sigPairs.add(k);
      }
    this.status.mainPairs = main.size;
    this.status.signals = {
      enabled: sig.enabled,
      combos: pipeline.s1.filter((r) => isSignalInd(r.ind)).length,
      active: sigActive.size,
      pairs: sigPairs.size,
      configs: sigPairs.size * signalProtects(sig).length,
    };
    // the sets per range type after the Base PF evaluation (status, the desk log and every report show them)
    {
      const engineRuns = pipeline.s1.filter((r) => !isSignalInd(r.ind));
      const enabled = rangeOn;
      const rows: NonNullable<RuntimeStatus["baseByRange"]> = baseRangeCounts(
        engineRuns,
        setsGates,
        ALL_RANGE_TAGS,
        (ind, tag) => rangeAppliesTo(ind, tag, applies),
      ).map((x) => ({
        ...x,
        range: RANGE_LABEL[x.tag as keyof typeof RANGE_LABEL] ?? x.tag,
        enabled: enabled(x.tag),
      }));
      const sigRuns = pipeline.s1.filter((r) => isSignalInd(r.ind));
      if (sig.enabled) {
        const pfs = sigRuns.map((r) => r.full.pf).filter(Number.isFinite).sort((a, b) => a - b);
        const ok = sigRuns.filter((r) => passesBase(r.full, s.gates)).map((r) => r.full.pf).sort((a, b) => a - b);
        rows.push({
          tag: "sig",
          range: "Signals",
          enabled: true,
          evaluated: sigRuns.length,
          passed: wf.signalBasePassed.size,
          minPf: s.gates.minPf,
          pfMedian: pfs.length ? pfs[pfs.length >> 1] : null,
          pfPassedMedian: ok.length ? ok[ok.length >> 1] : null,
        });
      }
      this.status.baseByRange = rows;
      // the totals on one basis: the evaluated count holds the signal pairs, so the passed count does too
      this.status.basePassed = passed.length + wf.signalBasePassed.size;
      const f = (x: number | null) => (x === null ? "–" : x.toFixed(2));
      this.db.event(
        "info",
        `Base by range: ${rows
          .filter((r) => r.enabled)
          .map((r) => `${r.range} ${r.passed}/${r.evaluated} (PF ≥ ${r.minPf.toFixed(2)}, median ${f(r.pfMedian)}, passed ${f(r.pfPassedMedian)})`)
          .join(" · ")}`,
      );
    }
    const dcaOpt = { protects: wf.dcaProtects, dca: wf.dca, axis: s.axis };
    const adjustNow = s.adjust?.enabled ? this.adjustState() : null;
    // strategy tapes on the worker cores (pairs dealt round-robin), back in Main-set order so every later
    // tie-break is the same as in-process
    const tapesFor = async (
      pairs: ReadonlySet<string>,
      protects: readonly Protect[],
      dcaFor:
        (Omit<typeof dcaOpt, "axis"> & { axis?: typeof dcaOpt.axis; noDca?: boolean }) | undefined,
      what: string,
      floors: EntryFloors,
    ): Promise<ConfigTape[] | null> => {
      let workerTapes: ConfigTape[] | null = null;
      if (workersAvailable() && !this.workersBroken && pairs.size) {
        const n = poolSize();
        const sharedWu = shareBars(wu.bars);
        const order = [...pairs];
        // small messages: each reply is deserialised on the main thread in one piece (one part per core
        // stalled it for ~0.5 s at 30 symbols × 43 signal sources; with every config its own seat a pair carries
        // ~200 tapes, so a part holds at most 2 pairs)
        const parts: string[][] = Array.from(
          { length: Math.max(n * 2, Math.ceil(order.length / 2)) },
          () => [],
        );
        order.forEach((k, i) => parts[i % parts.length].push(k));
        const stage = what === "strategy tapes" ? "Tapes" : "Signals";
        // the pairs of this compute (a large universe: tens of thousands of tapes from them)
        const tapeLabel = `${what} on ${n} cores · ${pairs.size} pairs`;
        this.setStage(stage, 0, 1, tapeLabel);
        const tt = performance.now();
        const eluT = nodePerf.eventLoopUtilization();
        try {
          const res = await runOnWorkers<{ tapes: ConfigTape[] }>(
            parts
              .filter((p) => p.length)
              .map((pp) => ({
                type: "tapes",
                bars: sharedWu,
                pairs: pp,
                protects,
                cost: s.cost,
                dcaOpt: dcaFor,
                tactics: s.tactics,
                adjust: adjustNow,
                floors,
              })),
            n,
            15 * 60_000,
            (fraction) => {
              if (gen === this.gen) this.setStage(stage, fraction, 1, tapeLabel);
            },
          );
          if (gen !== this.gen) return null;
          const rank = new Map(order.map((k, i) => [k, i]));
          // back in pair order in one linear pass (buckets by pair rank; within a pair the reply order stays) —
          // a sort of every tape stalled the loop at 100k tapes
          const buckets: ConfigTape[][] = Array.from({ length: order.length + 1 }, () => []);
          for (const r of res)
            for (const t of r.tapes) buckets[rank.get(`${t.bot}|${t.ind}`) ?? 0].push(t);
          workerTapes = [];
          for (const b of buckets) for (const t of b) workerTapes.push(t);
          this.status.phases[what === "strategy tapes" ? "Tapes" : "Signal tapes"] = {
            ms: performance.now() - tt,
            maxSliceMs: 0,
            slowest: `${n} cores · ${parts.filter((p) => p.length).length} replies`,
            mainMs: nodePerf.eventLoopUtilization(eluT).active,
          };
        } catch (err) {
          if (gen !== this.gen) return null;
          this.workersFailed(err, "Tape");
        }
      }
      if (workerTapes) return workerTapes;
      if (!pairs.size) return [];
      return await this.drive(
        "Tapes",
        buildTapesGen(wu, protects, s.cost, dcaFor, pairs, s.tactics, adjustNow, floors),
        (p) =>
          this.setStage(
            what === "strategy tapes" ? "Tapes" : "Signals",
            p.done,
            p.total,
            `${what === "strategy tapes" ? "strategy tapes (normal · trailing · DCA · DCA Active)" : what} · ${pairs.size} pairs`,
          ),
        gen,
      );
    };
    // a pair computes the cells of the ranges it passed in Base (a held pair, not in pairTags, computes all)
    const mainTapes = await tapesFor(main, wf.protects, dcaOpt, "strategy tapes", {
      ...protectFloors(s),
      pairTags: this.basePairTags,
      pairTps,
      heldIds,
      microOwnInds: microOwnInds(s.grid),
    });
    if (!mainTapes || gen !== this.gen) return;
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
    const sigTapes = sigPairs.size
      ? await tapesFor(sigPairs, signalProtects(sig), sigStrat, "signal tapes", {
          minSl: sig.minSl,
          minTrail: sig.minTrail,
          entry: sig.filter.trendH > 0 || sig.filter.volFloor > 0 ? sig.filter : null,
        })
      : [];
    if (!sigTapes || gen !== this.gen) return;
    // a demo probe measures the plus cells live: their static last-N gate does not apply there
    const tapes = this.wf.probe?.perRange || this.wf.probe?.perCell
      ? [...mainTapes, ...sigTapes]
      : gateMinimalPlus([...mainTapes, ...sigTapes], s.grid.minimalPlus);
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
    this.wf.signalActive = wf.signalActive;
    // adjust pauses apply to paper / live as they did to the simulation
    this.wf.paused = wf.paused;
    this.wf.signalGuardN = wf.signalGuardN;
    this.wf.signalCluster = wf.signalCluster;
    this.wf.signalAccept = wf.signalAccept;
    this.wf.signalSideAccept = wf.signalSideAccept;
    this.wf.signalOwnBase = wf.signalOwnBase;
    this.wf.signalSourceGate = wf.signalSourceGate;
    this.wf.signalPerSymbol = wf.signalPerSymbol;
    this.wf.signalMaxOpen = wf.signalMaxOpen;
    this.wf.signalMaxPositions = wf.signalMaxPositions;
    let step = 0;
    // the steps the simulation really takes (its start is floored to the hour: up to one step more than
    // simH / stepH, which ran the bar past 100 %)
    const steps = Math.max(1, walkForwardSteps(wu, wf));
    this.setStage("Real", 0, steps, `${wf.simH}h sim · step 0/${steps}`);
    const sim = await this.drive(
      "Simulation",
      walkForwardGen(wu, tapes, wf),
      (v) => {
        if (v >= 0) {
          step++;
          this.setStage(
            "Real",
            step,
            steps,
            `${wf.simH}h sim · step ${Math.min(step, steps)}/${steps} · ${wf.preH}h pre · validate last ${wf.validLastN ?? 0} · live last ${wf.lastN}`,
          );
        }
      },
      gen,
    );
    this.tapes = tapes;
    this.sim = sim;
    // paper / live trade on the set ranked at the end of the simulated run (causal, latest results)
    if (sig.enabled && sim.signalActiveEnd) {
      sigActive = new Set(sim.signalActiveEnd);
      // negative-hour hedge signals join the paper / live set; they trade only while the book is losing
      this.hedgeKeys = new Set((sim.hedgeEnd ?? []).filter((k) => !sigActive.has(k)));
      for (const k of this.hedgeKeys) sigActive.add(k);
      this.wf.signalActive = sigActive;
      if (this.status.signals) this.status.signals.active = sigActive.size;
    }
    // stage sets of this compute, for the self-audit (Base-validated → Main config sets → Real → trades)
    this.stageSets = {
      passed: new Set(passed.map((r) => `${r.bot}|${r.ind}`)),
      main: new Set(main),
      held,
      pinned: new Set(s.pinned ?? []),
      mainTop: s.mainTop,
      signalActive: wf.signalActive,
    };
    const sigStatus = this.status.signals;
    if (sigStatus && sig.enabled) {
      // in slices: the guard replays every candidate of the run (hundreds of thousands with every config its own seat)
      const g = new SignalGuard();
      const feedAll = sim.feed ?? [];
      const sigSummary = function* () {
        for (let i = 0; i < feedAll.length; i++) {
          feedBooks(feedAll[i], null, g);
          if ((i + 1) % 20_000 === 0) yield i;
        }
        const xs = sim.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? ""));
        yield 0;
        const st = statsOf(xs);
        const tl = openTimeline(xs, sim.startT, sim.endT);
        yield 0;
        return {
          disabled: sig.guard.enabled ? g.disabledKeys(sig.guard.lastN).length : 0,
          trades: xs.length,
          pf: st.pf,
          net: st.net,
          // positions (symbol × direction, closed episodes) and orders (every order and partial) apart
          positions: closedPositions(xs),
          orders: xs.length,
          peakPositions: tl.maxPositions,
          peakOrders: tl.maxOrders,
        };
      };
      Object.assign(sigStatus, await this.drive("Signal status", sigSummary(), () => undefined, gen));
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
    // every preset on the same tapes: with / without Block, DCA and Active, side by side
    const presets: Record<string, unknown> = {};
    // CTS_CORE_COMPARE=0 (live desks, session runs): no preset comparison — it walks every tape once per preset on
    // every compute, for a UI table only (the last saved comparison stays)
    const compareOn = process.env.CTS_CORE_COMPARE !== "0";
    const names = compareOn ? Object.keys(STRATEGY_PRESETS) : [];
    const tc = performance.now();
    let maxSlice = 0;
    // on the worker cores when available: the presets are dealt round-robin, each worker walks its share
    let viaWorkers = false;
    if (names.length && workersAvailable() && !this.workersBroken) {
      // one shared buffer + one metadata string for every worker (cloning the tape objects per worker stalled
      // the event loop for seconds at 40+ symbols)
      const packed = await this.drive("Pack tapes", packTapesGen(tapes), () => undefined, gen);
      if (gen !== this.gen) return;
      // each worker walks every tape once per preset: on a large book fewer workers at once keep the memory
      // inside the machine (the presets queue on the pool)
      const n = compareWorkers(poolSize(), packed.sab.byteLength);
      const parts: string[][] = Array.from({ length: n }, () => []);
      names.forEach((nm, i) => parts[i % n].push(nm));
      this.setStage("Compare", 0, names.length, `${names.length} presets on ${n} cores`);
      try {
        const compareLabel = `${names.length} presets on ${n} cores`;
        const res = await runOnWorkers<{
          results: Array<{ name: string } & Record<string, unknown>>;
        }>(
          parts
            .filter((p) => p.length)
            .map((pp) => ({
              type: "compare",
              nowT: wu.nowT,
              baseTf: wu.baseTf,
              packed,
              wf,
              presets: pp.map((name) => ({ name, toggles: STRATEGY_PRESETS[name].toggles })),
            })),
          n,
          15 * 60_000,
          (fraction) => {
            if (gen === this.gen) this.setStage("Compare", fraction, 1, compareLabel);
          },
        );
        if (gen !== this.gen) return;
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
        this.workersFailed(err, "Compare");
      }
    }
    for (let i = 0; i < (viaWorkers ? 0 : names.length); i++) {
      const name = names[i];
      this.setStage("Compare", i, names.length, name);
      const r = await this.drive(
        "Compare",
        walkForwardGen(wu, tapes, { ...wf, toggles: STRATEGY_PRESETS[name].toggles }),
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
    this.status.phases.Compare = { ms: performance.now() - tc, maxSliceMs: maxSlice };
    if (compareOn) this.db.kvSet("presetSims", { at: Date.now(), startT: sim.startT, endT: sim.endT, presets });
    this.computeSummary = `PF ${sim.stats.pf.toFixed(2)} · DDT ${sim.stats.ddt.toFixed(1)}h · green ${Math.round(sim.stats.gh * 100)}% · validate last ${wf.validLastN ?? 0} · live last ${wf.lastN}`;
    // the paper step on the new tapes follows in this cycle (it was "Real 100 %" again after Compare — backwards)
    this.setStage("Paper", 0, 1, `paper step next · ${this.computeSummary}`);
    this.status.computes++;
    this.status.lastComputeMs = performance.now() - t0;
    this.status.lastComputeAt = Date.now();
    this.status.appliedSettingsAt = settingsAt;
    this.status.pending = this.dirty;
    this.status.loop = {
      p50: this.loop.percentile(50) / 1e6,
      p99: this.loop.percentile(99) / 1e6,
      max: this.loop.max / 1e6,
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
        `[core-v2] compute #${this.status.computes} done in ${Math.round(this.status.lastComputeMs)} ms · sim PF ${sim.stats.pf.toFixed(2)} n ${sim.stats.n} · loop max ${this.status.loop.max.toFixed(0)} ms`,
      );
    }
    this.emit("compute");
    // a compute run on its own (not by the cycle, which steps paper next) closes its job here
    if (!this.inCycle) this.endJob(this.computeSummary);
    this.db.event(
      "info",
      `compute #${this.status.computes}: sim PF ${sim.stats.pf.toFixed(2)} net ${sim.stats.net.toFixed(1)}% n ${sim.stats.n} · armed ${pipeline.armed.length} · ${Math.round(this.status.lastComputeMs)}ms`,
    );
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
        if (++n % chunk === 0) {
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

  private async persistPipeline(o: PipelineOutput, gen: number) {
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
            typeof r.bySym === "string" ? r.bySym : JSON.stringify(r.bySym),
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
            (() => {
              const b = o.runs.get(r.id)?.bySym ?? {};
              return typeof b === "string" ? b : JSON.stringify(b);
            })(),
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
        bars: this.candles.get(sym)?.length ?? v.bars,
        n: old?.n ?? 0,
        pf: old?.pf,
      };
    }
    for (const sym of this.candles.keys()) {
      if (symbols[sym]) continue;
      symbols[sym] = { state: "computing", bars: this.candles.get(sym)?.length, n: 0 };
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
        bars: this.candles.get(sym)?.length,
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
        `prehistoric start complete: ${ready} symbols computed, realtime running (PF ${stats.pf.toFixed(2)}, ${stats.n} trades)`,
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
      fee: number;
    }>(
      "SELECT side, kind, qty, ref_px, fill_px, fee FROM live_fills WHERE ref_px > 0 AND fill_px > 0 ORDER BY at DESC LIMIT 400",
    );
    if (rows.length < 40) return null;
    let fee = 0;
    let slip = 0;
    for (const r of rows) {
      const notional = r.qty * r.fill_px;
      fee += notional > 0 ? Math.abs(r.fee) / notional : 0;
      // entries (O/I) pay when filled above the reference (long), exits (R/X) when filled below
      const into = r.kind === "O" || r.kind === "I";
      const dir = into ? r.side : -r.side;
      slip += Math.max(0, (dir * (r.fill_px - r.ref_px)) / r.ref_px);
    }
    fee /= rows.length;
    slip /= rows.length;
    return { rt: 2 * (fee + slip), fills: rows.length, fee, slip };
  }

  /** One adjuster pass on the executed (Real) positions; a change triggers a recompute with the new ranges. */
  private runAdjust() {
    const a = this.settings.adjust;
    if (!a?.enabled) return;
    const lc = this.liveCost();
    const excess = lc ? Math.max(0, lc.rt - this.settings.cost) : 0;
    if (lc) this.db.kvSet("liveCost", { ...lc, model: this.settings.cost, at: Date.now() });
    if (a.autoCost && lc && lc.rt > this.settings.cost + 0.0002) {
      this.updateSettings({ cost: +Math.min(0.02, lc.rt).toFixed(5) });
      this.db.event(
        "warn",
        `auto-cost: measured live round trip ${(lc.rt * 100).toFixed(3)} % > model — engine cost raised`,
      );
    }
    const trades = this.db.all<{ cfg: string; r: number; exit_t: number }>(
      "SELECT cfg, r, exit_t FROM paper_trades ORDER BY exit_t DESC LIMIT 5000",
    );
    const { state, changed } = evaluateAdjust(
      this.adjustState(),
      trades.map((t) => ({ cfg: t.cfg, r: t.r, exitT: t.exit_t })),
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

  // ── presets ──────────────────────────────────────────────
  savedPresets(): Preset[] {
    return this.db.kvGet<Preset[]>("presets") ?? [];
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
    return {
      id: kind === "auto" ? `auto-${key}` : `saved-${key}-${Date.now().toString(36)}`,
      label,
      info,
      kind,
      at: Date.now(),
      settings,
      wf: wfp,
      metrics: metricsFromStats(
        sim.stats,
        spanH,
        period,
        `engine simulated run (${Math.round(spanH)}h, ${wf.preH}h pre-calc)`,
        {
          positiveRuns: sim.stable ? 1 : 0,
          runs: 1,
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
    this.db.kvSet("presets", upsertPreset(this.savedPresets(), p));
    this.db.event(
      "info",
      `preset saved: ${p.label} (PF ${p.metrics.pf.toFixed(2)}, ${p.metrics.n} trades)`,
    );
    return p;
  }

  private autoPreset(s: CoreSettings, wf: WalkForwardOptions, sim: WalkForwardResult) {
    if (!qualifies(sim.stats, sim.stable, s.gates.minPf, s.gates.minTrades)) return;
    const p = this.currentPreset(
      "auto",
      `Auto · PF ${sim.stats.pf.toFixed(2)} · ${sim.stats.n} trades`,
      "saved automatically: the simulated run passed min PF, min trades and stability",
      s,
      wf,
      sim,
    );
    if (!p) return;
    const before = this.savedPresets();
    const after = upsertPreset(before, p);
    if (after !== before && JSON.stringify(after) !== JSON.stringify(before)) {
      this.db.kvSet("presets", after);
      this.db.event("info", `auto preset: ${p.label}`);
    }
  }

  // ── preset backtests (last 1–12 days, real data, background) ─────────────────
  private lastConsoleAt = 0;
  private backfillKey = "";
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
  private btCandles = new Map<string, { at: number; candles: Map<string, Candle[]> }>();
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
    const d = Math.min(MAX_BACKTEST_DAYS, Math.max(1, Math.round(days)));
    const ids = [...ALL_RESEARCH_PRESETS, ...this.savedPresets()]
      .map((p) => p.id)
      .filter((id) => !onlyMissing || (this.presetSeries(id)?.days ?? 0) < d)
      .filter((id) => !this.backtestQueue.some((q) => q.id === id) && this.backtestJob?.id !== id);
    this.backtestQueue.push(...ids.map((id) => ({ id, days: d })));
    this.nextQueuedBacktest();
    return ids.length;
  }

  private nextQueuedBacktest() {
    if (this.backtestJob?.state === "running") return;
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
    if (this.backtestJob?.state === "running")
      throw new Error(
        `a backtest is running (${this.backtestJob.label}, ${this.backtestJob.days}d)`,
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
    void this.runPresetBacktest(p, d, job)
      .catch((err) => {
        // only this job — a later job is never touched by an older one's failure
        if (job.state === "running") {
          job.state = "error";
          job.error = err instanceof Error ? err.message : String(err);
        }
        this.db.event("error", `backtest ${p.label}: ${err instanceof Error ? err.message : err}`);
      })
      .finally(() => this.nextQueuedBacktest());
  }

  /** Run a backtest phase on worker threads (all cores); false = not available / failed → caller runs in-process. */
  private async onWorkers(
    job: NonNullable<CoreRuntime["backtestJob"]>,
    stage: string,
    fn: (n: number) => Promise<void>,
  ): Promise<boolean> {
    this.workersRetry();
    if (!workersAvailable() || this.workersBroken) return false;
    const n = poolSize();
    job.stage = `${stage} · ${n} cores`;
    try {
      await fn(n);
      return true;
    } catch (err) {
      this.workersFailed(err, "backtest");
      job.stage = stage;
      return false;
    }
  }
  private workersBroken = false;
  private workersBrokenAt = 0;
  /**
   * A worker run failed. Stopped by the memory guard: the compute aborts (rethrown; the cycle steps the fallback
   * and retries lighter) — computing it in-process instead held the event loop and never released the memory.
   * Anything else: this phase computes in-process, and the workers are tried again after WORKERS_RETRY_MS (one
   * failure disabled them for the life of the process).
   */
  private workersFailed(err: unknown, what: string) {
    if (this.memPressured) throw err;
    this.workersBroken = true;
    this.workersBrokenAt = Date.now();
    this.db.event(
      "warn",
      `${what} workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`,
    );
  }
  /** Workers that failed are tried again after WORKERS_RETRY_MS. */
  private workersRetry() {
    if (this.workersBroken && Date.now() - this.workersBrokenAt > WORKERS_RETRY_MS) this.workersBroken = false;
  }
  private floorsWaivedNoted = false;
  /** when this desk's live record starts (kept across restarts): the live validation counts closes from here */
  liveSince(): number {
    let t = this.db.kvGet<number>("liveSince");
    if (!(typeof t === "number" && t > 0)) {
      t = Date.now();
      this.db.kvSet("liveSince", t);
    }
    return t;
  }
  /** the parts of the last Paper step (ms) and its candidate count */
  private paperTimings: { select: number; cands: number; exec: number; n: number } | null = null;
  /** Base results by combo for the partial progression (CTS_CORE_BASE_SLICES) */
  private baseCache: { key: string; runs: Map<string, ComboRun[]>; slice: number } | null = null;

  /** Time-sliced driver for backtests: yields every SLICE_MS, aborts past the job's time limit. */
  private async sliced<T, R>(
    gen: Generator<T, R>,
    onStep: (v: T) => void,
    job = this.backtestJob,
  ): Promise<R> {
    let slice = performance.now();
    for (;;) {
      const r = gen.next();
      if (r.done) return r.value;
      onStep(r.value);
      if (performance.now() - slice > SLICE_MS) {
        await yieldNow();
        if (this.backtestJob && Date.now() - this.backtestJob.startedAt > BACKTEST_LIMIT_MS)
          throw new Error("backtest exceeded its 15 min limit — aborted");
        slice = performance.now();
      }
    }
  }

  private async runPresetBacktest(
    p: Preset,
    days: number,
    job: NonNullable<CoreRuntime["backtestJob"]>,
  ) {
    const patch = presetSettings(p.settings);
    const s = mergeSettings(this.settings, {
      ...patch,
      tactics: { ...DEFAULT_SETTINGS.tactics, ...(patch.tactics ?? {}) },
      focus: patch.focus ?? [],
    });
    const wf: WalkForwardOptions = {
      ...defaultWalkForward(s),
      ...sanitizeWf(p.wf as never),
      gates: s.gates,
      cost: s.cost,
      toggles: s.toggles,
      block: s.block,
      dca: s.dca,
    };
    const lookH = Math.max(wf.longH, wf.preH);
    const endT = Math.floor(Date.now() / H) * H;
    const startT = endT - days * 24 * H;
    // history: warm-up day + long window + tactics warm-up + the backtest days
    const wantBars =
      Math.ceil(((24 + lookH + days * 24) * 60) / s.tfMin) + tacticWarmupBars(s.tactics) + 10;
    let candles: Map<string, Candle[]>;
    // the engine's own data only when the preset trades the same universe (count, ranking, timeframe)
    const sameUniverse =
      s.symbols === this.settings.symbols && s.symbolRank === this.settings.symbolRank;
    const uniKey = `${s.tfMin}|${s.symbols}|${s.symbolRank}`;
    const own =
      sameUniverse &&
      s.tfMin === this.settings.tfMin &&
      [...this.candles.values()].every((c) => c.length >= wantBars) &&
      this.candles.size > 0;
    if (own) candles = this.candles;
    else {
      const cached = this.btCandles.get(uniKey);
      const enough =
        cached &&
        Date.now() - cached.at < 10 * 60_000 &&
        [...cached.candles.values()].every((c) => c.length >= wantBars);
      if (enough) candles = cached!.candles;
      else {
        candles = new Map();
        let syms = sameUniverse
          ? this.status.symbols.length
            ? this.status.symbols
            : [...this.candles.keys()]
          : [];
        // the preset's own universe (or the engine's before its first sync), ranked the way the engine does
        if (!syms.length) {
          if (!this.tickers.length) this.tickers = await this.feed.tickers();
          syms = forceSymbols(
            await rankUniverse(this.tickers, s.symbols, s.symbolRank ?? "volatility1h", this.feed.klines),
            s.forceSymbols,
            s.symbols,
          );
        }
        let done = 0;
        // the engine's candles at this timeframe are reused; only the missing older part is downloaded
        const tfMs = s.tfMin * 60_000;
        await mapLimit(syms, 8, async (sym) => {
          const have = s.tfMin === this.settings.tfMin ? (this.candles.get(sym) ?? []) : [];
          const missing = wantBars - have.length;
          let cs: Candle[] = have;
          if (missing > 0) {
            const older = await this.feed
              .history(sym, s.tfMin, have.length ? missing : wantBars, {
                pauseMs: 0,
                nowT: have.length ? have[0].t : undefined,
              })
              .catch(() => [] as Candle[]);
            cs = have.length
              ? [
                  ...older.filter((c) => c.t < have[0].t && c.t >= have[0].t - missing * tfMs),
                  ...have,
                ]
              : older;
          }
          if (cs.length) candles.set(sym, cs);
          job.progress = (++done / syms.length) * 0.3;
        });
        if (!candles.size) throw new Error("no market data (exchange unreachable)");
        this.btCandles.set(uniKey, { at: Date.now(), candles });
      }
    }
    // every lane over its own history before the backtest window plus the window itself
    const bars = laneSeriesFrom(candles, s, days).map((b) =>
      tailBars(b, Math.ceil((wantBars * s.tfMin) / b.tfMin)),
    );
    const u = makeUniverse(bars);
    // Base on the window BEFORE the backtest (causal), unless a fixed focus set is traded
    job.stage = "Base";
    let main: Set<string>;
    const combos = allCombos(
      s.focus,
      s.disabledKinds,
      s.tfs,
      microOwnInds(s.grid) ? (rangeMinTfOf(s.grid ?? {}).mc ?? 0) : 0,
    );
    if (wf.mode === "fixed" && s.focus.length)
      main = new Set(combos.map((c) => `${c.bot}|${c.ind}`));
    else {
      const lookBars = bars.map((b) => {
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
      });
      const look = makeUniverse(lookBars);
      let scores: Array<{ pair: string; score: number }> = [];
      const viaWorkers = await this.onWorkers(job, "Base", async (n) => {
        const parts = slices(combos, n * 2);
        const res = await runOnWorkers<{ scores: typeof scores }>(
          parts.map((c) => ({
            type: "base",
            bars: lookBars,
            combos: c,
            cost: s.cost,
            tactics: s.tactics,
          })),
          n,
          15 * 60_000,
          undefined,
          // a backtest someone waits for goes before the engines' background recomputes
          true,
        );
        scores = res.flatMap((x) => x.scores);
      });
      function* base() {
        for (let i = 0; i < combos.length; i++) {
          const r = runCombo(
            look,
            combos[i].bot,
            combos[i].ind,
            DEFAULT_PROTECT,
            s.cost,
            1,
            s.tactics,
          );
          if (r && passesBase(r.full, s.gates))
            scores.push({ pair: `${combos[i].bot}|${combos[i].ind}`, score: r.score });
          yield i;
        }
      }
      if (!viaWorkers)
        await this.sliced(base(), (i) => (job.progress = 0.3 + (0.3 * (i + 1)) / combos.length));
      main = new Set(
        scores
          .sort((a, b) => b.score - a.score)
          .slice(0, s.mainTop > 0 ? s.mainTop : undefined)
          .map((x) => x.pair),
      );
    }
    job.stage = "Tapes";
    const dcaOpt = { protects: wf.dcaProtects, dca: wf.dca, axis: s.axis };
    const adjust = s.adjust?.enabled ? this.adjustState() : null;
    let tapes: ConfigTape[] = [];
    // pairs in the engine's combo order, cut into contiguous slices → identical tape order to one process
    // (lane combos included: the pairs are lane ids when the settings carry timeframe lanes)
    const pairs = combos.map((c) => `${c.bot}|${c.ind}`).filter((x) => main.has(x));
    const tapesViaWorkers = await this.onWorkers(job, "Tapes", async (n) => {
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
          floors: protectFloors(s),
        })),
        n,
        15 * 60_000,
        undefined,
        // a backtest someone waits for goes before the engines' background recomputes
        true,
      );
      tapes = res.flatMap((x) => x.tapes);
    });
    if (!tapesViaWorkers)
      tapes = await this.sliced(
        buildTapesGen(u, wf.protects, s.cost, dcaOpt, main, s.tactics, adjust, protectFloors(s)),
        (x) => (job.progress = 0.6 + (0.3 * x.done) / Math.max(1, x.total)),
      );
    // Signals: scored on the window before the backtest, the best N trade their 15 Normal + 15 Trailing configs
    const sig = signalSettings(s.signals);
    const sigCombos = signalCombos(sig, s.tfs);
    let sigActive: Set<string> | undefined;
    if (sigCombos.length) {
      const look = makeUniverse(
        bars.map((b) => {
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
          const r = runCombo(look, c.bot, c.ind, DEFAULT_PROTECT, s.cost, 1, s.tactics);
          if (r) runs.push(r);
          forgetCombo(look, c.bot, c.ind);
          yield i;
        }
      }
      await this.sliced(sigBase(), () => undefined);
      // every signal pair with enough trades on a symbol before the window; the simulation ranks them per step
      sigActive = activeSignals(runs, sig);
      const sigPairs = signalCandidates(runs, sig.minTrades);
      if (sigPairs.size)
        tapes = tapes.concat(
          await this.sliced(
            buildTapesGen(u, signalProtects(sig), s.cost, undefined, sigPairs, s.tactics, adjust, {
              minSl: sig.minSl,
              minTrail: sig.minTrail,
            }),
            () => undefined,
          ),
        );
    }
    job.stage = "Simulation";
    const sim = await this.sliced(
      walkForwardGen(u, tapes, {
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
    );
    const st = sim.stats;
    const r: PresetBacktest = {
      days,
      at: Date.now(),
      from: startT,
      to: Math.min(endT, u.nowT),
      tfMin: s.tfMin,
      pf: st.pf,
      n: st.n,
      perDay: st.n / days,
      wr: st.wr,
      net: st.net,
      successHours: st.gh,
      greenHours: st.greenHours,
      hours: st.hours,
      ddtH: st.ddt,
      stable: sim.stable,
      minPf: s.gates.minPf,
      maxDdtH: s.gates.maxDdtH,
      pass: st.n > 0 && st.pf >= s.gates.minPf && st.ddt <= s.gates.maxDdtH,
      byKind: sim.byKind,
    };
    // the diagrams over the window (balance, equity, drawdown, open book, P&L per type) and the info line
    // (positions per hour, PF of the last 12 / 25 / 75 positions, DDT), cached per preset
    try {
      const to = Math.min(endT, u.nowT);
      const series = backtestSeries(sim.trades, candles, s, startT, to, days);
      this.setPresetSeries(p.id, series);
      r.posPerHour = series.info.posPerHour;
      r.pfLast12 = series.info.pfLast12;
      r.pfLast25 = series.info.pfLast25;
      r.pfLast75 = series.info.pfLast75;
      r.equityDdtH = series.info.ddtH;
      r.maxDdPct = series.info.maxDdPct;
    } catch (err) {
      this.db.event("warn", `backtest ${p.label}: diagrams not built: ${err instanceof Error ? err.message : err}`);
    }
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
    const wfBase = { ...pickWf(defaultWalkForward(DEFAULT_SETTINGS)), preH: this.wf.preH, simH: this.wf.simH };
    this.updateSettings(
      {
        ...patch,
        gates: { ...DEFAULT_SETTINGS.gates, ...(patch.gates ?? {}) },
        tactics: { ...DEFAULT_SETTINGS.tactics, ...(patch.tactics ?? {}) },
        focus: patch.focus ?? [],
      },
      sanitizeWf({ ...wfBase, ...((p.wf ?? {}) as object) } as never),
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
    const merged = presetSettings({ ...p.settings, ...settings });
    const g = merged.grid;
    if (g && gridVariants({ ...DEFAULT_SETTINGS.grid, ...g }) > 1200)
      throw new Error(`protect grid too large (max ${GRID_VARIANTS_MAX} variants)`);
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
    this.db.kvSet("presets", upsertPreset(list, next));
    // backtests of the old settings do not describe the edited preset
    if (next.id === p.id) {
      const bt = this.presetBacktests();
      delete bt[p.id];
      this.db.kvSet("presetBacktests", bt);
      this.setPresetSeries(p.id, null);
    }
    this.db.event(
      "info",
      `preset ${p.kind === "research" ? "copied and edited" : "edited"}: ${next.label}`,
    );
    return next;
  }

  deletePreset(id: string) {
    this.db.kvSet(
      "presets",
      this.savedPresets().filter((p) => p.id !== id),
    );
    this.setPresetSeries(id, null);
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
      JSON.stringify(r.opts),
      JSON.stringify(r.blocks),
      JSON.stringify(r.hourly),
    );
  }

  // ── paper ─────────────────────────────────────────────────────────────
  /** Current-hour selection from the pre-historic window; open positions of the selected configs are the paper book. */
  /** Every lane's series from the engine's 1m candles (see laneSeriesFrom). */
  laneSeries(s: CoreSettings = this.settings) {
    return laneSeriesFrom(this.candles, s);
  }

  private detailU: { key: string; u: ReturnType<typeof makeUniverse> } | null = null;
  /** the universe of the last finished compute (detail pages recompute trades on exactly this) */
  /** Block / guard books for the live step: a cursor over the current run's feed (advanced, never replayed) */
  private liveBooks: {
    sim: WalkForwardResult | null;
    t: number;
    at: (t: number) => { book: BlockBook | null; guard: SignalGuard | null };
  } | null = null;
  private tapeIdx: { tapes: readonly ConfigTape[]; byId: Map<string, ConfigTape> } | null = null;
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
    if (!c || (kindOfId(id) !== "normal" && kindOfId(id) !== "trailing")) return null;
    // exactly the universe the stored statistics were computed on (the candles may have moved on since)
    if (!this.lastUniverse) return null;
    this.detailU = { key: "last", u: this.lastUniverse };

    const g = this.settings.grid;
    const protect =
      c.protect.trail > 0
        ? { ...c.protect, trailStep: g.trailStep ?? 1, trailFree: g.trailFree ?? false }
        : c.protect;
    const r = runCombo(
      this.detailU.u,
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
    this.coordCache = { sim, closedBy, hourNet, srcClosed };
    return this.coordCache;
  }

  /**
   * Why a new paper / live entry is held back by the rules the simulation applies before execution (null =
   * allowed): hour guard, coordination (confirmation / opposite entries / hour lock / cooldown), the
   * negative-hour hedge, Stable-02 symbol windows and the source stability gate. `open` = the positions of the
   * book; only those open at the entry (entered at or before it, stop not crossed) count.
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
  ): string | null {
    const hk = Math.floor(op.entryT / H);
    if (this.wf.guardPct > 0 && (hourNet.get(hk) ?? 0) <= -this.wf.guardPct) return "hourGuard";
    const at = open.filter((x) => x.entryT <= op.entryT && !x.stopHit);
    const coordWhy = coordBlock(this.wf.coord, op, hourNet, at);
    // a hedge-only signal trades while the book is losing (this or the previous hour), without confirmation
    const hedging =
      this.hedgeKeys.size > 0 &&
      this.hedgeKeys.has(`${op.cfg.split("|").slice(0, 2).join("|")}|${op.sym}`);
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

  private *stepPaperGen(): Generator<number, void> {
    if (!this.tapes.length || !this.sim) return;
    // sub-timings (the Paper phase is one synchronous slice: its slowest part is named in the phase record)
    const tp0 = performance.now();
    const nowT = Math.floor(Date.now() / H) * H;
    const t = Math.min(nowT, this.sim.endT);
    const held = new Set(this.sim.steps[this.sim.steps.length - 1]?.real ?? []);
    // signal configs are not selected into seats: every config of an active signal runs (Real gate per symbol)
    const { engine: selTapes, signal: sigTapes } = splitSignalTapes(this.tapes, this.wf);
    // (slices between the opening passes over every tape: together they were one 0.5 s step at 21 symbols)
    yield 0;
    const { picks, eligible } = withProbe(
      this.wf.mode === "durable"
        ? selectDurable(selTapes, t, this.wf, held)
        : this.wf.mode === "fixed"
          ? yield* selectFixedGen(selTapes, t, this.wf)
          : selectAt(selTapes, t, this.wf),
      selTapes,
      t,
      this.wf,
    );
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
      OpenPosition & { vol: number; level: number; stopHit?: number; legs?: Partial<Record<string, number>> }
    > = [];
    const saved = this.db.kvGet<Record<string, { at: number; stop: number }>>("stopHits") ?? {};
    const stopHits: Record<string, number> = {};
    const stopHitsStop: Record<string, number> = {};
    for (const [k, v] of Object.entries(saved)) {
      stopHits[k] = v.at;
      stopHitsStop[k] = v.stop;
    }
    const perSym = new Map<string, number>();
    const perSide = new Map<string, number>();
    const openBy = new Map<string, number>();
    // open POSITIONS (symbol × direction) per class: the engine's and the signals' are capped apart
    const openPos = new Set<string>();
    // held positions first (they are never pushed out by a cap), then new entries by the Real-stage rules
    const prevByKey = new Map(
      this.paper.positions.map((p) => [`${p.cfg}|${p.sym}|${p.entryT}`, p]),
    );
    const cands: Array<{ tp: ConfigTape; op: OpenPosition; held: boolean }> = [];
    for (const id of keep) {
      const tp = byId.get(id);
      if (!tp) continue;
      for (const op of tp.open) {
        // held = this exact position was already in the paper book; a set that is no longer selected keeps
        // only those (its other tape positions were never taken and must not bypass the caps)
        const held = prevByKey.has(`${op.cfg}|${op.sym}|${op.entryT}`);
        if (!held && !sel.has(tp.id)) continue;
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
        prio(a.tp, a.op.sym) - prio(b.tp, b.op.sym) ||
        (a.op.cfg < b.op.cfg ? -1 : a.op.cfg > b.op.cfg ? 1 : 0) ||
        (a.op.sym < b.op.sym ? -1 : a.op.sym > b.op.sym ? 1 : 0),
    );
    yield 0;
    // Block sources (overall / symbol / direction / indication) judge executed positions closed before each entry
    const booksAt = this.booksAt();
    // hour guard and coordination on new entries, as in the simulation: realized Σ trade % per clock hour of the
    // executed orders closed before the entry, and the positions open at it
    const { closedBy, srcClosed } = this.coordOf(this.sim);
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
    const lvOf = (x: ConfigTape) => {
      let g = lvMemo.get(x.id);
      // without an explicit live floor every config is held to its own range's minimum (as at the stages)
      const minPf = this.settings.live.liveMinPf ?? minPfOf(this.settings.gates, x.protect.tag);
      if (!g) lvMemo.set(x.id, (g = liveGate(x, lvSince, lvNow, lvN, minPf)));
      return g;
    };
    // until a config has its own N live closes, its group (range or signals) decides on its pooled last closes
    const lvGroupN = lvN > 0 ? (this.settings.live.liveGroupLastN ?? 0) : 0;
    const lvGroups =
      lvGroupN > 0
        ? liveGroupGates(
            (function* () {
              for (const id of sel) {
                const x = byId.get(id);
                if (x) yield x;
              }
            })(),
            lvSince,
            lvNow,
            lvGroupN,
            // a range group is held to its range's minimum, as each of its configs is (an explicit live floor wins)
            this.settings.live.liveMinPf ??
              ((g: string) => {
                const tag = RANGE_TAGS.find((t) => RANGE_LABEL[t] === g);
                return minPfOf(this.settings.gates, tag);
              }),
          )
        : new Map<string, LiveGate>();
    if (lvGroupN > 0) yield 0;
    // the same gate for the entries planner (entries mode sends the pending entries of the selected configs)
    this.liveEntryGate =
      lvN > 0 ? (tp) => liveEntryOk(lvOf(tp), lvGroups.get(liveGroupOf(tp.id))) : null;
    let lvSkipped = 0;
    let slice = 0;
    // the same open order from two indications (identical signal, same protect) is held once, as the simulation
    // executes it once (dupKey): the open state stands in for the exit, which is not known yet
    const openKeys = new Set<string>();
    const openKey = (op: OpenPosition) => {
      const parts = op.cfg.split("|");
      return `${parts[0]}|${parts.slice(2).join("|")}|${op.sym}|${op.side}|${op.entryT}|${op.entry}|${op.stop}|${op.target}`;
    };
    for (const { op, held } of cands) if (held) openKeys.add(openKey(op));
    for (const { tp, op, held } of cands) {
      if (++slice % 300 === 0) yield slice;
      if (!held && openKeys.has(openKey(op))) continue;
      if (!held && lvN > 0 && !liveEntryOk(lvOf(tp), lvGroups.get(liveGroupOf(tp.id)))) {
        lvSkipped++;
        continue;
      }
      if (!held) {
        while (ci < closedBy.length && closedBy[ci].exitT <= op.entryT) {
          const x = closedBy[ci++];
          const k = Math.floor(x.exitT / H);
          hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
        }
        if (
          this.entryHeldBack(
            { cfg: op.cfg, sym: op.sym, side: op.side, entryT: op.entryT },
            hourNet,
            positions,
            srcClosed,
          )
        )
          continue;
      }
      // a held position continues regardless of the entry rules (they decided at its entry) and keeps its execution
      // multiple (its volume without the ladder weight: an Axis ladder that filled another rung since grows)
      const prev = prevByKey.get(`${op.cfg}|${op.sym}|${op.entryT}`);
      const d = held
        ? ({
            ok: true,
            vol: prev ? positionMult(prev) : 1,
            level: prev?.level ?? 0,
            legs: prev?.legs,
          } as const)
        : execDecision(tp, op.entryT, this.wf, {
            ...booksAt(op.entryT),
            sym: op.sym,
            side: op.side,
          });
      if (!d.ok) continue;
      // engine and signal orders are capped each on their own
      const cls = sigCfg(op.cfg) ? "s" : "e";
      const caps = capsOf(this.wf, cls === "s");
      const c = perSym.get(`${cls}|${op.sym}`) ?? 0;
      const sd = perSide.get(`${cls}|${op.side}`) ?? 0;
      const posKey = `${op.sym}|${op.side}`;
      if (
        !held &&
        (c >= caps.perSymbol ||
          sd >= caps.perSide ||
          (openBy.get(cls) ?? 0) >= caps.maxOpen ||
          (() => {
            const cap = cls === "s" ? this.wf.signalMaxPositions : this.wf.maxPositions;
            if (!cap || cap <= 0 || openPos.has(`${cls}|${posKey}`)) return false;
            let n = 0;
            for (const k of openPos) if (k.startsWith(`${cls}|`)) n++;
            return n >= cap;
          })())
      )
        continue;
      openPos.add(`${cls}|${posKey}`);
      perSym.set(`${cls}|${op.sym}`, c + 1);
      perSide.set(`${cls}|${op.side}`, sd + 1);
      openBy.set(cls, (openBy.get(cls) ?? 0) + 1);
      // new entries take the relation volume the simulation ended with (within the Block maximum)
      const stackCap = this.wf.block.mode === "overall" ? 8 : this.wf.block.maxMult;
      const cv =
        !held && s2End?.factor ? Math.min(1 + s2End.factor, Math.max(1, stackCap / d.vol)) : 1;
      openKeys.add(openKey(op));
      positions.push({
        ...op,
        // execution multiple × ladder weight (Axis: every filled rung is volume, as the simulation books it); the
        // live lane asks for this volume, and paper marks mtm (per unit) × it
        vol: positionVolume(d.vol * cv, op),
        level: d.level,
        ...(d.legs ? { legs: d.legs } : {}),
        // a stop crossed at tick time stays crossed until the bar-closed exit replaces the position — only while
        // the stop is the same one (a recompute can move it), and across a restart (persisted)
        ...(() => {
          const id = posId(op);
          const hit =
            prev?.stopHit && prev.stop === op.stop
              ? prev.stopHit
              : stopHitsStop[id] === op.stop
                ? stopHits[id]
                : undefined;
          return hit ? { stopHit: hit } : {};
        })(),
      });
    }
    // a held position whose tape this compute did not build (the memory fallback dropped its range, an adjusted
    // config id, a range switched off): carried forward as it was for up to 48 h — dropping it left no close and live
    // flattened the exchange position
    {
      const have = new Set(positions.map((p) => `${p.cfg}|${p.sym}|${p.entryT}`));
      let carriedMissing = 0;
      for (const p of this.paper.positions) {
        if (byId.get(p.cfg) || have.has(`${p.cfg}|${p.sym}|${p.entryT}`)) continue;
        if (Date.now() - p.entryT > 48 * H) continue;
        positions.push({ ...p, vol: p.vol ?? 1, level: p.level ?? 0 });
        carriedMissing++;
      }
      if (carriedMissing && carriedMissing !== this.carriedMissing)
        this.db.event("warn", `paper: ${carriedMissing} held position(s) carried without their tape this compute`);
      this.carriedMissing = carriedMissing;
    }
    // persisted tick-time stops: only those of positions still open
    const keepHits: Record<string, { at: number; stop: number }> = {};
    for (const p of positions) if (p.stopHit) keepHits[posId(p)] = { at: p.stopHit, stop: p.stop };
    if (
      Object.keys(keepHits).length !== Object.keys(saved).length ||
      Object.keys(keepHits).some((k) => !saved[k])
    )
      this.db.kvSet("stopHits", keepHits);
    const since = this.paper.startedAt - this.wf.simH * H;
    const trades = this.sim.trades.filter((t) => t.exitT >= since);
    const inSim = new Set(trades.map(orderKey));
    // a position held from before (entered under earlier settings) that closed on its tape although the current
    // re-simulation no longer takes it (a gate added since): its close is still recorded, at its volume — it left
    // the book without one before (x01: no paper close for 20 min after a gate change, 366 positions open)
    const openNow = new Set(positions.map(orderKey));
    for (const p of prevByKey.values()) {
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
        trades.push({ ...x, r: x.r * v, vol: (x.vol ?? 1) * v, mult: v });
        inSim.add(k);
        break;
      }
    }
    // earlier closed paper trades carry their realized P&L forward, counted once (paper_trades is keyed by config,
    // symbol and entry): every trade recorded since the paper book started that the current window does not hold —
    // entered before it (the window slides), or inside it but no longer taken by the re-simulation (a gate added
    // since; its close was recorded under the settings it traded with)
    const carriedBefore =
      this.db.get<{ s: number | null }>(
        "SELECT SUM(pnl) AS s FROM paper_trades WHERE exit_t >= ? AND entry_t < ?",
        since,
        this.sim.startT,
      )?.s ?? 0;
    let carriedDropped = 0;
    for (const row of this.db.all<{ cfg: string; sym: string; entry_t: number; pnl: number | null }>(
      "SELECT cfg, sym, entry_t, pnl FROM paper_trades WHERE exit_t >= ? AND entry_t >= ?",
      since,
      this.sim.startT,
    ))
      if (!inSim.has(orderKey({ cfg: row.cfg, sym: row.sym, entryT: row.entry_t }))) carriedDropped += row.pnl ?? 0;
    const carried = carriedBefore + carriedDropped;
    // sizing: every order's unit from the equity at its entry (fixed % of equity) or the fixed notional
    const sizing = this.paperSizing();
    const sized = yield* sizeBookGen(trades, positions, { ...sizing, balance: sizing.balance + carried });
    const unitOf = (x: { cfg: string; sym: string; entryT: number }) =>
      sized.units.get(orderKey(x)) ?? this.settings.paperNotional;
    const db = this.db;
    // the book's rows in chunks of PAPER_ROWS, each its own transaction, the live tick between them (every open
    // position and every trade of the window in one transaction held the loop for up to 0.9 s on x01; the rows are
    // idempotent: a step cut short is completed by the next)
    db.run("DELETE FROM paper_positions");
    for (let i = 0; i < positions.length; i += PAPER_ROWS) {
      const part = positions.slice(i, i + PAPER_ROWS);
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
    for (let i = 0; i < trades.length; i += PAPER_ROWS) {
      const part = trades.slice(i, i + PAPER_ROWS);
      db.tx(() => {
        for (const t of part)
          db.run(
            // first_at: when the trade was first recorded (a conflict keeps it). A trade the simulated window
            // back-fills (a config selected now, its closes hours ago) is recorded long after its exit: the forward
            // paper record counts only trades recorded around their exit (see paperForward)
            "INSERT INTO paper_trades (cfg, sym, side, entry_t, exit_t, entry, exit, r, pnl, reason, first_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (cfg, sym, entry_t) DO UPDATE SET pnl = excluded.pnl",
            t.cfg,
            t.sym,
            t.side,
            t.entryT,
            t.exitT,
            t.entry,
            t.exit,
            t.r,
            t.r * unitOf(t),
            t.reason,
            Date.now(),
          );
      });
      yield i;
    }
    const tExec = performance.now() - tp0 - tSelect - tCands;
    if (lvN > 0) {
      let judged = 0;
      let passing = 0;
      for (const id of sel) {
        const x = byId.get(id);
        if (!x) continue;
        const g = lvOf(x);
        if (g.pf === null) continue;
        judged++;
        if (g.ok) passing++;
      }
      this.status.liveValidation = {
        lastN: lvN,
        minPf: lvMinPf,
        since: lvSince,
        judged,
        passing,
        paused: judged - passing,
        skipped: lvSkipped,
        groupLastN: lvGroupN,
        groups: [...lvGroups]
          .map(([group, g]) => ({ group, n: g.n, pf: g.pf, ok: g.ok }))
          .sort((a, b) => (a.group < b.group ? -1 : a.group > b.group ? 1 : 0)),
      };
    }
    this.paperTimings = { select: tSelect, cands: tCands, exec: tExec, n: cands.length };
    // the live tick ran between this step's slices on the old book: a stop it crossed after the positions were
    // built is carried over (else the lane asks for its volume again until the next step reads the stored hit)
    for (const p of positions) {
      if (p.stopHit) continue;
      const prev = prevByKey.get(`${p.cfg}|${p.sym}|${p.entryT}`);
      if (prev?.stopHit && prev.stop === p.stop) p.stopHit = prev.stopHit;
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
  private booksAt(): (t: number) => { book: BlockBook | null; guard: SignalGuard | null } {
    const src = this.wf.block.sources ?? {};
    // the book also carries the pause after a positive raise (the config source pauses too)
    // the direction gate reads the same feed, Block on or off
    const wantBook =
      (this.wf.toggles.block &&
        (!!(src.overall || src.symbol || src.direction || src.indication || src.type) ||
          (this.wf.block.pause ?? 0) > 0)) ||
      (this.wf.sideGateN ?? 0) > 0;
    const wantGuard =
      !!this.wf.signalGuardN ||
      !!this.wf.signalCluster?.enabled ||
      !!this.wf.signalAccept?.enabled ||
      !!this.wf.signalSideAccept?.enabled ||
      !!this.wf.engineSideAccept?.enabled;
    if (!wantBook && !wantGuard) return () => ({ book: null, guard: null });
    const feed = this.sim?.feed ?? [];
    const book = blockBookOf(this.wf.block);
    // acceptance on the same tape record the simulation judged on
    const guard = signalGuardFor(this.tapes, this.wf);
    let i = 0;
    return (t: number) => {
      while (i < feed.length && feed[i].exitT <= t) feedBooks(feed[i++], book, guard);
      return { book: wantBook ? book : null, guard: wantGuard ? guard : null };
    };
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
    const books = this.liveBooks.at(entryT);
    const byId = this.tapeIndex();
    const coord = this.sim ? this.coordOf(this.sim) : null;
    for (const id of this.paper.selected) {
      const tp = byId.get(id);
      if (!tp) continue;
      for (const p of tp.pending) {
        // an entry on the next bar passes the same execution and coordination rules as in the simulation
        if (!execDecision(tp, entryT, this.wf, { ...books, sym: p.sym, side: p.side }).ok) continue;
        // and the live validation of the paper book (a config losing on its own live closes opens nothing)
        if (this.liveEntryGate && !this.liveEntryGate(tp)) continue;
        if (
          coord &&
          this.entryHeldBack(
            { cfg: tp.id, sym: p.sym, side: p.side, entryT },
            coord.hourNet,
            this.paper.positions,
            coord.srcClosed,
          )
        )
          continue;
        // the signal orders' own cap per symbol (open paper signal positions on the symbol + entries sent now)
        if (sigCfg(tp.id)) {
          const cap = capsOf(this.wf, true).perSymbol;
          const openOn =
            this.paper.positions.filter((x) => x.sym === p.sym && sigCfg(x.cfg)).length +
            out.filter((x) => x.sym === p.sym && sigCfg(x.cfg)).length;
          if (openOn >= cap) continue;
          // the signals' own cap on POSITIONS (symbol × direction, open paper positions + entries sent now)
          const pcap = this.wf.signalMaxPositions;
          if (pcap && pcap > 0) {
            const same = (x: { sym: string; side: number; cfg: string }) =>
              x.sym === p.sym && x.side === p.side && sigCfg(x.cfg);
            if (!this.paper.positions.some(same) && !out.some(same)) {
              const set = new Set(
                [...this.paper.positions, ...out]
                  .filter((x) => sigCfg(x.cfg))
                  .map((x) => `${x.sym}|${x.side}`),
              );
              if (set.size >= pcap) continue;
            }
          }
        }
        // the bar the signal was decided on is the symbol's own newest bar (a lagging symbol is dropped by the planner)
        const barT = this.candles.get(p.sym)?.at(-1)?.t ?? 0;
        // a lane enters at the open after ITS bar closed: only in the base bar that closes that lane bar
        // (a 15m signal is never offered again later in the quarter hour, so it cannot enter late)
        const laneTf = laneOf(tp.ind).tf ?? this.settings.tfMin;
        if (!laneClosesWith(barT, this.settings.tfMin, laneTf)) continue;
        out.push({
          cfg: tp.id,
          sym: p.sym,
          side: p.side,
          // an ATR protect trades the distances resolved for this entry (concrete stop / target)
          protect: p.protect ?? tp.protect,
          barT,
          kind: tp.kind,
        });
      }
    }
    return out;
  }
}

export interface PresetBacktest {
  days: number;
  at: number;
  from: number;
  to: number;
  tfMin: number;
  pf: number;
  n: number;
  perDay: number;
  wr: number;
  net: number;
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
  candles: ReadonlyMap<string, readonly Candle[]>,
  s: CoreSettings,
  startT: number,
  endT: number,
  days: number,
): PresetSeries {
  const balance = s.paperBalance ?? 1000;
  const sized = sizeBook(trades, [], { balance, sizing: s.sizing, fixedNotional: s.paperNotional });
  const unit = (x: { cfg: string; sym: string; entryT: number }) => sized.units.get(orderKey(x)) ?? s.paperNotional;
  const price = (sym: string, t: number) => {
    const cs = candles.get(sym);
    if (!cs?.length) return null;
    let lo = 0;
    let hi = cs.length - 1;
    if (cs[0].t > t) return null;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (cs[m].t <= t) lo = m;
      else hi = m - 1;
    }
    return cs[lo].c;
  };
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
  /** sub-strategy of the set (trailing / DCA / Axis exits are managed by the simulation) */
  kind?: string;
}

/** The walk-forward knobs that are user settings (grids, toggles and gates come from CoreSettings). */
export const WF_KEYS = [
  "preH",
  "simH",
  "stepH",
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
    };
  }
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
  if (v >= 20) return saved;
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
  db.kvSet("wf", pickWf(out));
  if (st) db.kvSet("settings", st);
  db.kvSet("wfCapsV", 20);
  return out;
}

/** Former default targets of the Minimal (0.2–0.8 %) and Short (3–6× cost) ranges, for the v16 move. */
const FORMER_MINIMAL_TP = [0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008];
const FORMER_SHORT_TP = [0.006, 0.008, 0.01, 0.012];

function pickWf(o: Partial<WalkForwardOptions>): Partial<WalkForwardOptions> {
  const out: Record<string, unknown> = {};
  for (const k of WF_KEYS) if (o[k] !== undefined) out[k] = o[k];
  return out as Partial<WalkForwardOptions>;
}

/** Everything a compute reads: the settings without the live execution block, and the walk-forward options. */
function computeKey(s: CoreSettings, wf: Partial<WalkForwardOptions>): string {
  const { live: _live, ...rest } = s;
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

/** Micro trades only the Micro indications, and they only Micro cells (grid.micro.ownInds, default on) */
function microOwnInds(g: CoreSettings["grid"] | undefined): boolean {
  const m = g?.micro;
  return !!m && m.ownInds !== false;
}

/** every range tag a protect grid can carry */
const ALL_RANGE_TAGS = ["mc", "mn", "mp", "sh", "gn", "lg"] as const;

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
  return normalizeLanes(out);
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
  candles: ReadonlyMap<string, Candle[]>,
  s: CoreSettings,
  extraDays = 0,
) {
  const out: ReturnType<typeof barsFromCandles>[] = [];
  for (const [sym, cs] of candles) {
    for (const tf of s.tfs ?? [s.tfMin]) {
      const c = tf === s.tfMin ? cs : resample(cs, s.tfMin, tf);
      const n = laneBars(s, tf) + Math.round((extraDays * 24 * 60) / tf);
      out.push(barsFromCandles(sym, tf, c.length > n ? c.slice(c.length - n) : c));
    }
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
  r.ensureFields();
}

/**
 * The runtime of a connection (created on first use). `start` (default): keep it running when its connection is
 * enabled. A new non-primary connection starts from the primary's settings and saved presets, with Live off.
 */
export function runtimeFor(conn?: ConnId, opts: { start?: boolean } = {}): CoreRuntime {
  const primary = primaryConn();
  const c = conn ?? primary;
  let r: CoreRuntime;
  if (c === primary) {
    rebind(G.__ctsCoreRuntime);
    // the shared database also gets this version's methods and tables (hot reload)
    if (G.__ctsCoreRuntime) coreDb();
    if (!G.__ctsCoreRuntime)
      G.__ctsCoreRuntime = new CoreRuntime(coreDb(), undefined, { conn: c });
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
      x = new CoreRuntime(db, undefined, {
        conn: c,
        snapshotPath: connPath(process.env.CTS_CORE_SNAPSHOT || "", c) ?? "",
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
