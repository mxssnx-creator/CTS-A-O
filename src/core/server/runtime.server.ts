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
  STRATEGY_PRESETS,
  TF_CHOICES,
  type CoreSettings,
} from "../config.ts";
import { tacticWarmupBars } from "../indications/filters.ts";
import { evaluateAdjust, pausedSets, type AdjustState } from "../adjust.ts";
import { prehistStats, type PrehistStats } from "../prehist.ts";
import { poolSize, runOnWorkers, shareBars, slices, workersAvailable } from "./pool.server.ts";
import {
  metricsFromStats,
  presetKey,
  presetSettings,
  qualifies,
  RESEARCH_PRESETS,
  upsertPreset,
  type Preset,
} from "../presets.ts";
import type { Candle, OpenPosition, Protect, Trade } from "../domain/types.ts";
import { barsFromCandles, resample, syntheticCandles, tailBars } from "../market/bars.ts";
import {
  fetchHistory,
  fetchKlines,
  fetchTickers,
  pickUniverse,
  rankUniverse,
  type Ticker,
} from "../market/bingx.ts";
import {
  allCombos,
  type ComboRun,
  kindOfId,
  laneClosesWith,
  mainByLane,
  parseConfigId,
  passesBase,
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
  execDecision,
  walkForwardGen,
  feedBooks,
  splitSignalTapes,
  bestFirst,
  packTapes,
  capsOf,
  sigCfg,
  type ConfigTape,
  type WalkForwardOptions,
  type WalkForwardResult,
} from "../sim/walkforward.ts";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { BlockBook } from "../sim/block.ts";
import {
  activeSignals,
  mergeSignals,
  signalCombos,
  signalProtects,
  signalSettings,
  SignalGuard,
} from "../signals.ts";
import type { SignalSettings } from "../signal-config.ts";
import { PriceStream, type StreamStats } from "./stream.server.ts";
import { isSignalInd, laneOf } from "../indications/registry.ts";
import { orderKey, sizeBook, sizingSettings } from "../sizing.ts";
import { statsOf } from "../metrics/stats.ts";
import { auditState, type AuditInput, type AuditReport } from "../audit.ts";
import { coreDb, type CoreDb } from "./db.server.ts";

const H = 3_600_000;
const SLICE_MS = 12;
const BACKTEST_LIMIT_MS = 15 * 60_000;

export type RuntimeState =
  "idle" | "booting" | "backfill" | "running" | "computing" | "error" | "stopped";

export interface PhaseTiming {
  ms: number;
  /** longest synchronous slice between yields (what can delay other requests) */
  maxSliceMs: number;
  /** the step that ran in that slice (profiling: which combo / stage blocked) */
  slowest?: string;
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
  progress: number;
  label: string;
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
  };
  /** Base config sets evaluated / passing the Base gate (PF ≥ min PF) in the last compute */
  baseEvaluated?: number;
  basePassed?: number;
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

export interface PaperBook {
  selected: string[];
  eligible: number;
  positions: Array<OpenPosition & { vol?: number; level?: number }>;
  trades: Trade[];
  /** net P&L of the paper book: closed results + open mark-to-market (USD) */
  equity: number;
  /** starting balance + equity */
  balance?: number;
  /** unit notional per order key (`cfg|sym|entryT`), from the sizing at each entry */
  units?: Map<string, number>;
  startedAt: number;
}

const yieldNow = () => new Promise<void>((r) => setImmediate(r));

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
  private streamKey = "";
  private lastMtmWrite = 0;
  /** last klines request per symbol (a bar the exchange has not published yet is not re-asked every cycle) */
  private klinesAt = new Map<string, number>();
  /** self-audit after every paper step (invariants recomputed from the published state) */
  audit: AuditReport | null = null;
  private lastAuditKey = "";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private dirty = true;
  /** loop generation: a cycle from an older generation never reschedules or publishes */
  private gen = 0;
  private stopped = false;
  private resetUniverse = false;
  private loop = monitorEventLoopDelay({ resolution: 20 });
  private snapshotPath = process.env.CTS_CORE_SNAPSHOT || "";
  private lastSnapshot = 0;
  onLive?: (rt: CoreRuntime, intents: LiveIntent[], gen: number) => Promise<void>;

  /** market source: live BingX (the app) or synthetic (automated tests only, explicit opt-in) */
  private market: "bingx" | "synthetic";
  /** market data functions (injectable for recovery tests) */
  private feed: MarketFeed;
  private healer: ReturnType<typeof setInterval> | null = null;
  private errorsInRow = 0;

  constructor(
    db: CoreDb = coreDb(),
    settings?: Partial<CoreSettings>,
    opts: { market?: "bingx" | "synthetic"; feed?: Partial<MarketFeed> } = {},
  ) {
    this.feed = {
      tickers: fetchTickers,
      history: fetchHistory,
      klines: fetchKlines,
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
    this.settings.gates.minPf = Math.min(1.5, Math.max(1.05, this.settings.gates.minPf));
    this.settings.gates.maxDdtH = Math.min(20, Math.max(2, this.settings.gates.maxDdtH));
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
    this.paper = {
      selected: [],
      eligible: 0,
      positions: [],
      trades: [],
      equity: 0,
      startedAt: now,
    };
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
    if (this.status.state === "idle" && this.snapshotPath && this.db.restore(this.snapshotPath))
      this.db.event("info", `restored snapshot ${this.snapshotPath}`);
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
      // open positions marked to market at the newest price (stream, else the newest closed bar)
      const cost = this.settings.cost;
      let open = 0;
      const units = this.paper.units;
      for (const p of this.paper.positions) {
        const px = this.stream?.price(p.sym) ?? this.candles.get(p.sym)?.at(-1)?.c;
        if (!px || !(p.entry > 0)) continue;
        p.mtm = (p.side * (px - p.entry)) / p.entry - cost;
        open += p.mtm * (units?.get(orderKey(p)) ?? this.settings.paperNotional);
      }
      let closed = 0;
      for (const t of this.paper.trades)
        closed += t.r * (units?.get(orderKey(t)) ?? this.settings.paperNotional);
      this.paper.equity = closed + open;
      this.paper.balance = this.settings.paperBalance + this.paper.equity;
      if (Date.now() - this.lastMtmWrite > 1_000 && this.paper.positions.length) {
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
      const stale = this.dirty || this.resetUniverse;
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
        const intents = this.pendingEntries();
        void this.onLive(this, intents, this.gen)
          .catch((err) =>
            this.db.event("error", `live step failed: ${err instanceof Error ? err.message : err}`),
          )
          .finally(() => {
            this.liveBusy = false;
            this.liveSlowNoted = false;
          });
      } else if (this.liveBusy && !this.liveSlowNoted && Date.now() - this.liveStartedAt > 60_000) {
        this.liveSlowNoted = true;
        this.db.event(
          "warn",
          "live step in flight for over 60 s (exchange slow?) — no new step until it returns",
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
  }

  /**
   * Process shutdown (service stop / update / reboot): stop the loop, then persist everything that would
   * otherwise wait for its interval — the durable settings / presets and the SQLite snapshot (stats, trades,
   * runs, evals). The next start restores both.
   */
  shutdown(reason = "shutdown"): { snapshot: boolean } {
    if (!this.stopped) this.stop();
    this.flushLive?.();
    this.db.event("info", `${reason}: state and snapshot saved`);
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
    const stale =
      !waitingBackoff &&
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

  updateSettings(patch: Partial<CoreSettings>, wfPatch?: Partial<WalkForwardOptions>) {
    const prevUniverse = `${this.settings.symbols}|${this.settings.tfMin}|${this.settings.historyDays}|${this.settings.symbolRank}`;
    const next = mergeSettings(this.settings, patch);
    // limits on the MERGED settings (a patch alone could bypass them across several saves)
    // position cost follows its components when they are edited (taker fee + slippage per side, × 2)
    if (patch.fees && patch.cost === undefined)
      next.cost = +(2 * (next.fees.taker + next.fees.slippage)).toFixed(5);
    const g = next.grid;
    const variants = g.tp.length * g.slOfTp.length * g.trailOfTp.length * g.holdH.length;
    if (variants > 240) throw new Error(`protect grid too large (${variants} variants, max 240)`);
    // gates stay inside the offered choices (legacy values such as max DDT 36 h are snapped, not rejected)
    next.gates.minPf = Math.min(1.5, Math.max(1.05, next.gates.minPf));
    next.gates.maxDdtH = Math.min(20, Math.max(2, next.gates.maxDdtH));
    this.settings = next;
    this.wf = {
      ...defaultWalkForward(this.settings),
      ...pickWf(this.wf),
      ...sanitizeWf(wfPatch ?? {}),
      gates: this.settings.gates,
      cost: this.settings.cost,
      toggles: this.settings.toggles,
      block: this.settings.block,
      dca: this.settings.dca,
    };
    this.db.kvSet("settings", this.settings);
    this.db.kvSet("wf", pickWf(this.wf));
    this.status.settingsAt = Date.now();
    // a running cycle keeps its snapshot; the universe reset is applied at the start of the next cycle
    if (
      prevUniverse !==
      `${this.settings.symbols}|${this.settings.tfMin}|${this.settings.historyDays}|${this.settings.symbolRank}`
    )
      this.resetUniverse = true;
    this.db.event(
      "info",
      this.busy ? "settings updated — applied after the running compute" : "settings updated",
    );
    this.kick();
  }

  /** Drop all candles and backfill again (applied at the start of the next cycle). */
  requestResync() {
    this.resetUniverse = true;
    this.kick();
  }

  /** Re-run the compute stages on the next cycle, now (or right after the running one). */
  kick() {
    this.dirty = true;
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

  private setStage(stage: string, done: number, total: number, label = "") {
    this.status.stage = stage;
    this.status.progress = total ? done / total : 0;
    this.status.label = label;
    this.status.heartbeat = Date.now();
  }

  async cycle() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    const gen = this.gen;
    const t0 = performance.now();
    try {
      if (this.resetUniverse) {
        this.resetUniverse = false;
        this.candles.clear();
        this.backfillKey = "";
        this.staleUntil.clear();
        this.prehistSyms.clear();
        this.prehistTotal = 0;
        this.prehistPending = false;
        this.prehistStartedAt = Date.now();
        this.prehistReadyAt = 0;
        this.db.run("DELETE FROM candles");
        this.db.run("DELETE FROM symbols");
        this.dirty = true;
      }
      const newBars = await this.syncMarket(gen);
      if (gen !== this.gen) return;
      // the universe changed while syncing (timeframe / symbols / history): start over with the new one
      if (this.resetUniverse) return;
      const computed = newBars || this.dirty;
      if (computed) await this.compute(gen);
      if (gen !== this.gen) return;
      // settings changed during the compute: the tapes are from the old settings — recompute first
      const stale = this.dirty || this.resetUniverse;
      // the paper book, the adjuster and the audit only change with new tapes: after a compute (or once at
      // start), not on every 250 ms cycle; open positions are marked to market by the tick
      if (!stale && (computed || !this.paperStepped)) {
        this.phase("Paper", () => this.stepPaper());
        this.phase("Adjust", () => this.runAdjust());
        this.phase("Audit", () => this.runAudit());
        this.paperStepped = true;
      }
      if (!this.stopped) this.status.state = "running";
      this.status.error = null;
      if (this.snapshotPath && Date.now() - this.lastSnapshot > 10 * 60_000) {
        this.lastSnapshot = Date.now();
        this.db.snapshot(this.snapshotPath);
      }
      if (Date.now() - this.lastTrim > 60_000) {
        this.lastTrim = Date.now();
        this.db.trim();
      }
      if (this.errorsInRow > 0)
        this.noteHeal(`recovered after ${this.errorsInRow} failed cycle(s)`, "info");
      this.errorsInRow = 0;
    } catch (e) {
      if (gen === this.gen) {
        this.errorsInRow++;
        this.dirty = true; // retry the compute on the next cycle
        this.status.state = this.stopped ? "stopped" : "error";
        this.status.error = e instanceof Error ? e.message : String(e);
        this.db.event("error", `cycle: ${this.status.error}`);
      }
    } finally {
      if (gen === this.gen) {
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
        if (!this.stopped) this.schedule(backoff || (this.dirty ? 0 : this.nextInterval()));
      }
    }
  }

  private phase<T>(name: string, fn: () => T): T {
    const t = performance.now();
    const r = fn();
    const ms = performance.now() - t;
    this.status.phases[name] = { ms, maxSliceMs: ms };
    return r;
  }

  // ── market ────────────────────────────────────────────────────────────
  private async syncMarket(gen: number): Promise<boolean> {
    const s = this.settings;
    const want = Math.round((s.historyDays * 24 * 60) / s.tfMin);
    // a symbol is usable with most of the requested history (small history settings must not stall the loop)
    const minBars = Math.max(50, Math.min(200, Math.floor(want * 0.8)));
    const uniKey = `${s.symbols}|${s.tfMin}|${s.historyDays}|${s.symbolRank}`;
    if (this.candles.size === 0) {
      this.status.state = "backfill";
      this.loadCandlesFromDb();
      if (this.candles.size) this.backfillKey = uniKey;
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
      this.dirty = true;
    }
    // (re)start a backfill that never completed (stop / watchdog mid-way): fetch only the missing symbols
    if (this.candles.size === 0 || this.backfillKey !== uniKey) {
      // test-only feed (explicit opt-in); the app always runs on real BingX data
      if (this.market === "synthetic") {
        const end = Date.now();
        for (let i = 0; i < s.symbols; i++) {
          await this.storeCandles(`SYN${i}-USDT`, syntheticCandles(`SYN${i}`, s.tfMin, want, end));
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
        const ranked = await rankUniverse(
          this.tickers,
          s.symbols,
          s.symbolRank ?? "volatility1h",
          this.feed.klines,
        );
        const missing = ranked
          .filter((x) => !this.candles.has(x))
          .slice(0, Math.max(0, s.symbols - this.candles.size));
        // progressive start: load a batch, compute it completely, start realtime for it, then the next batch
        const batch = Math.max(5, Math.ceil(s.symbols / 4));
        const syms = missing.slice(0, batch);
        const more = missing.length > syms.length;
        this.prehistTotal = Math.min(s.symbols, this.candles.size + missing.length);
        for (const x of missing)
          if (!this.prehistSyms.has(x)) this.prehistSyms.set(x, { state: "queued" });
        for (const x of syms) this.prehistSyms.set(x, { state: "loading" });
        let done = 0;
        await mapLimit(
          syms,
          4,
          async (sym) => {
            const cs = await this.feed.history(sym, s.tfMin, want, { pauseMs: 60 }).catch(() => []);
            if (gen !== this.gen) return;
            if (cs.length >= minBars) {
              await this.storeCandles(sym, cs);
              this.prehistSyms.set(sym, { state: "computing", bars: cs.length });
            } else this.prehistSyms.set(sym, { state: "skipped", bars: cs.length });
            this.setStage(
              "backfill",
              ++done,
              syms.length,
              `${sym} · batch ${this.candles.size}/${this.prehistTotal}`,
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
            .catch(() => []);
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
    const due = [...this.candles.entries()].filter(([sym, cs]) => {
      const last = cs[cs.length - 1]?.t ?? 0;
      return (
        last + 2 * tfMs <= now &&
        now - last <= 300 * tfMs &&
        now - (this.klinesAt.get(sym) ?? 0) >= 1_000
      );
    });
    for (const [sym] of due) this.klinesAt.set(sym, now);
    await mapLimit(due, 6, async ([sym, cs]) => {
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
        this.db.event("warn", `${sym} klines: ${e instanceof Error ? e.message : e}`);
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
        slice = performance.now();
        stepT = slice;
      }
    }
  }

  async compute(gen = this.gen) {
    const t0 = performance.now();
    this.dirty = false;
    this.status.state = "computing";
    this.loop.reset();
    const settingsAt = this.status.settingsAt;
    // snapshot: a settings change during this compute applies to the next one
    const s = this.settings;
    const wf: WalkForwardOptions = {
      ...this.wf,
      paused: s.adjust?.enabled ? pausedSets(this.adjustState()) : undefined,
    };
    // lane series per symbol, yielding between symbols (resampling 1m for every lane is not free)
    const allBars: ReturnType<typeof laneSeriesFrom> = [];
    for (const [sym, cs] of this.candles) {
      allBars.push(...laneSeriesFrom(new Map([[sym, cs]]), s));
      await yieldNow();
      if (gen !== this.gen) return;
    }
    const u = makeUniverse(allBars);
    if (!u.bars.length) return;

    // Base (S1) → Main (S2/S3) → Real ranking on the full history
    const stageName: Record<string, string> = {
      S1: "Base",
      S2: "Main",
      S3: "Main",
      S4: "Real",
      S5: "Real",
    };
    // Base on every CPU core: the lane combos are dealt round-robin over the worker pool (each worker a mix of
    // 1m … 30m work); the main thread only waits, so the server stays responsive. In-process fallback.
    let pre: { s1: ComboRun[] } | undefined;
    // bar series in shared memory once: every worker message then carries references, not copies
    const sharedU = workersAvailable() && !this.workersBroken ? shareBars(u.bars) : u.bars;
    this.status.workers = !workersAvailable()
      ? "unavailable (in-process)"
      : this.workersBroken
        ? "failed earlier (in-process)"
        : `${poolSize()} cores`;
    if (workersAvailable() && !this.workersBroken) {
      const combos = [
        ...allCombos(s.focus, s.disabledKinds, s.tfs),
        ...signalCombos(signalSettings(s.signals), s.tfs),
      ];
      const n = poolSize();
      const parts: Array<typeof combos> = Array.from({ length: n * 2 }, () => []);
      combos.forEach((c, i) => parts[i % parts.length].push(c));
      this.setStage("Base", 0, combos.length, `Base on ${n} cores · ${combos.length} combos`);
      const tb = performance.now();
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
            })),
          n,
        );
        if (gen !== this.gen) return;
        // a reply of another shape (a worker file newer / older than this module) is refused: in-process
        if (!res.every((r) => Array.isArray(r?.runsJson)))
          throw new Error("unexpected Base worker reply (module version mismatch?)");
        const s1: ComboRun[] = [];
        for (const r of res)
          for (const chunk of r.runsJson) {
            for (const x of JSON.parse(chunk) as ComboRun[]) s1.push(x);
            await yieldNow();
            if (gen !== this.gen) return;
          }
        pre = { s1 };
        this.status.phases["Base (workers)"] = {
          ms: performance.now() - tb,
          maxSliceMs: 0,
          slowest: `${combos.length} combos on ${n} cores`,
        };
      } catch (err) {
        if (gen !== this.gen) return;
        this.workersBroken = true;
        this.db.event(
          "warn",
          `Base workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`,
        );
      }
    }
    const pipeline = await this.drive(
      "Pipeline",
      runPipeline(u, s, pre),
      (p: PipelineProgress) =>
        this.setStage(stageName[p.stage] ?? p.stage, p.done, p.total, p.label),
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
    const passed = pipeline.s1.filter((r) => !isSignalInd(r.ind) && passesBase(r.full, s.gates));
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
    // Signals processing: the active signals and every signal pair still holding a position take the signal
    // configs, never the engine's protect grid
    const sig = signalSettings(s.signals);
    const sigActive = sig.enabled ? activeSignals(pipeline.s1, sig) : new Set<string>();
    const sigPairs = new Set<string>();
    for (const k of sigActive) sigPairs.add(k.split("|").slice(0, 2).join("|"));
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
    const dcaOpt = { protects: wf.dcaProtects, dca: wf.dca, axis: s.axis };
    const adjustNow = s.adjust?.enabled ? this.adjustState() : null;
    // strategy tapes on the worker cores (pairs dealt round-robin), back in Main-set order so every later
    // tie-break is the same as in-process
    const tapesFor = async (
      pairs: ReadonlySet<string>,
      protects: readonly Protect[],
      dcaFor: typeof dcaOpt | undefined,
      what: string,
    ): Promise<ConfigTape[] | null> => {
      let workerTapes: ConfigTape[] | null = null;
      if (workersAvailable() && !this.workersBroken && pairs.size) {
        const n = poolSize();
        const sharedWu = shareBars(wu.bars);
        const order = [...pairs];
        const parts: string[][] = Array.from({ length: n * 2 }, () => []);
        order.forEach((k, i) => parts[i % parts.length].push(k));
        this.setStage("Base", 0, order.length, `${what} on ${n} cores`);
        const tt = performance.now();
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
              })),
            n,
          );
          if (gen !== this.gen) return null;
          const rank = new Map(order.map((k, i) => [k, i]));
          workerTapes = res
            .flatMap((r) => r.tapes)
            .map((t, i) => ({ t, i }))
            .sort(
              (a, b) =>
                (rank.get(`${a.t.bot}|${a.t.ind}`) ?? 0) -
                  (rank.get(`${b.t.bot}|${b.t.ind}`) ?? 0) || a.i - b.i,
            )
            .map((x) => x.t);
          this.status.phases[what === "strategy tapes" ? "Tapes" : "Signal tapes"] = {
            ms: performance.now() - tt,
            maxSliceMs: 0,
            slowest: `${n} cores`,
          };
        } catch (err) {
          if (gen !== this.gen) return null;
          this.workersBroken = true;
          this.db.event(
            "warn",
            `Tape workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`,
          );
        }
      }
      if (workerTapes) return workerTapes;
      if (!pairs.size) return [];
      return await this.drive(
        "Tapes",
        buildTapesGen(wu, protects, s.cost, dcaFor, pairs, s.tactics, adjustNow),
        (p) =>
          this.setStage(
            "Base",
            p.done,
            p.total,
            what === "strategy tapes"
              ? "strategy tapes (normal · trailing · DCA · DCA Active)"
              : what,
          ),
        gen,
      );
    };
    const mainTapes = await tapesFor(main, wf.protects, dcaOpt, "strategy tapes");
    if (!mainTapes || gen !== this.gen) return;
    // Signals: the active signals (best N by Base on each symbol) run their own 15 Normal + 15 Trailing configs
    const sigTapes = sigPairs.size
      ? await tapesFor(sigPairs, signalProtects(sig), undefined, "signal tapes")
      : [];
    if (!sigTapes || gen !== this.gen) return;
    const tapes = [...mainTapes, ...sigTapes];
    wf.signalActive = sig.enabled ? sigActive : undefined;
    wf.signalGuardN = sig.enabled && sig.guard.enabled ? sig.guard.lastN : 0;
    wf.signalCluster = sig.enabled ? sig.cluster : undefined;
    wf.signalPerSymbol = sig.perSymbol;
    wf.signalMaxOpen = sig.maxOpen;
    this.wf.signalActive = wf.signalActive;
    this.wf.signalGuardN = wf.signalGuardN;
    this.wf.signalCluster = wf.signalCluster;
    this.wf.signalPerSymbol = wf.signalPerSymbol;
    this.wf.signalMaxOpen = wf.signalMaxOpen;
    let step = 0;
    const steps = Math.max(1, Math.ceil(wf.simH / Math.max(wf.stepH, s.tfMin / 60)));
    const sim = await this.drive(
      "Simulation",
      walkForwardGen(wu, tapes, wf),
      () => this.setStage("Real", ++step, steps, `${wf.simH}h simulated run, ${wf.preH}h pre-calc`),
      gen,
    );
    this.tapes = tapes;
    this.sim = sim;
    // stage sets of this compute, for the self-audit (Base-validated → Main config sets → Real → trades)
    this.stageSets = {
      passed: new Set(passed.map((r) => `${r.bot}|${r.ind}`)),
      main: new Set(main),
      held,
      mainTop: s.mainTop,
      signalActive: wf.signalActive,
    };
    if (this.status.signals && sig.enabled) {
      const g = new SignalGuard();
      for (const e of sim.feed ?? []) feedBooks(e, null, g);
      const xs = sim.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? ""));
      const st = statsOf(xs);
      Object.assign(this.status.signals, {
        disabled: sig.guard.enabled ? g.disabledKeys(sig.guard.lastN).length : 0,
        trades: xs.length,
        pf: st.pf,
        net: st.net,
      });
    }
    this.persistSim(sim);
    this.autoPreset(s, wf, sim);
    this.updatePrehist(
      u.bars.map((b) => b.sym),
      pipeline,
      tapes,
      sim,
      wf,
    );
    // every preset on the same tapes: with / without Block, DCA and Active, side by side
    const presets: Record<string, unknown> = {};
    const names = Object.keys(STRATEGY_PRESETS);
    const tc = performance.now();
    let maxSlice = 0;
    // on the worker cores when available: the presets are dealt round-robin, each worker walks its share
    let viaWorkers = false;
    if (workersAvailable() && !this.workersBroken) {
      // one shared buffer + one metadata string for every worker (cloning the tape objects per worker stalled
      // the event loop for seconds at 40+ symbols)
      const packed = packTapes(tapes);
      const n = poolSize();
      const parts: string[][] = Array.from({ length: n }, () => []);
      names.forEach((nm, i) => parts[i % n].push(nm));
      this.setStage("Compare", 0, names.length, `${names.length} presets on ${n} cores`);
      try {
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
        this.workersBroken = true;
        this.db.event(
          "warn",
          `Compare workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`,
        );
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
    this.db.kvSet("presetSims", { at: Date.now(), startT: sim.startT, endT: sim.endT, presets });
    this.setStage("Real", 1, 1, "done");
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
  private updatePrehist(
    computed: string[],
    pipeline: PipelineOutput,
    tapes: ConfigTape[],
    sim: WalkForwardResult,
    wf: WalkForwardOptions,
  ) {
    if (!this.prehistStartedAt) this.prehistStartedAt = this.status.startedAt;
    for (const sym of computed)
      this.prehistSyms.set(sym, {
        ...(this.prehistSyms.get(sym) ?? {}),
        state: "ready",
        bars: this.candles.get(sym)?.length,
      });
    const stats = prehistStats(sim.trades, sim.startT, sim.endT);
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
      total: Math.max(this.prehistTotal, this.candles.size),
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

  presetBacktests(): Record<string, PresetBacktest[]> {
    return this.db.kvGet<Record<string, PresetBacktest[]>>("presetBacktests") ?? {};
  }

  /** Start a backtest of a preset over the last `days` (1–12). One at a time; the result is kept per preset. */
  startPresetBacktest(id: string, days: number): void {
    if (this.backtestJob?.state === "running")
      throw new Error(
        `a backtest is running (${this.backtestJob.label}, ${this.backtestJob.days}d)`,
      );
    const p = this.findPreset(id);
    if (!p) throw new Error("unknown preset");
    const d = Math.min(12, Math.max(1, Math.round(days)));
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
    void this.runPresetBacktest(p, d, job).catch((err) => {
      // only this job — a later job is never touched by an older one's failure
      if (job.state === "running") {
        job.state = "error";
        job.error = err instanceof Error ? err.message : String(err);
      }
      this.db.event("error", `backtest ${p.label}: ${err instanceof Error ? err.message : err}`);
    });
  }

  /** Run a backtest phase on worker threads (all cores); false = not available / failed → caller runs in-process. */
  private async onWorkers(
    job: NonNullable<CoreRuntime["backtestJob"]>,
    stage: string,
    fn: (n: number) => Promise<void>,
  ): Promise<boolean> {
    if (!workersAvailable() || this.workersBroken) return false;
    const n = poolSize();
    job.stage = `${stage} · ${n} cores`;
    try {
      await fn(n);
      return true;
    } catch (err) {
      this.workersBroken = true;
      this.db.event(
        "warn",
        `backtest workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`,
      );
      job.stage = stage;
      return false;
    }
  }
  private workersBroken = false;

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
          syms = await rankUniverse(
            this.tickers,
            s.symbols,
            s.symbolRank ?? "volatility1h",
            this.feed.klines,
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
    const combos = allCombos(s.focus, s.disabledKinds, s.tfs);
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
        })),
        n,
      );
      tapes = res.flatMap((x) => x.tapes);
    });
    if (!tapesViaWorkers)
      tapes = await this.sliced(
        buildTapesGen(u, wf.protects, s.cost, dcaOpt, main, s.tactics, adjust),
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
      const self = this;
      function* sigBase() {
        for (let i = 0; i < sigCombos.length; i++) {
          const c = sigCombos[i];
          const r = runCombo(look, c.bot, c.ind, DEFAULT_PROTECT, s.cost, 1, s.tactics);
          if (r) runs.push(r);
          forgetCombo(look, c.bot, c.ind);
          yield i;
        }
      }
      await self.sliced(sigBase(), () => undefined);
      sigActive = activeSignals(runs, sig);
      const sigPairs = new Set([...sigActive].map((k) => k.split("|").slice(0, 2).join("|")));
      if (sigPairs.size)
        tapes = tapes.concat(
          await this.sliced(
            buildTapesGen(u, signalProtects(sig), s.cost, undefined, sigPairs, s.tactics, adjust),
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
        signalGuardN: sigActive && sig.guard.enabled ? sig.guard.lastN : 0,
        signalCluster: sigActive ? sig.cluster : undefined,
        signalPerSymbol: sig.perSymbol,
        signalMaxOpen: sig.maxOpen,
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
      RESEARCH_PRESETS.find((p) => p.id === id) ?? this.savedPresets().find((p) => p.id === id)
    );
  }

  /** Apply a preset's settings + walk-forward patch (the Live stage is never touched). */
  applyPreset(id: string): Preset {
    const p = this.findPreset(id);
    if (!p) throw new Error("unknown preset");
    const patch = presetSettings(p.settings);
    // a preset replaces tactics and focus completely (not merged with the current ones)
    this.updateSettings(
      {
        ...patch,
        tactics: { ...DEFAULT_SETTINGS.tactics, ...(patch.tactics ?? {}) },
        focus: patch.focus ?? [],
      },
      sanitizeWf(p.wf as never),
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
    settings: Partial<CoreSettings>,
    wf: Record<string, unknown>,
    label?: string,
    info?: string,
  ): Preset {
    const p = this.findPreset(id);
    if (!p) throw new Error("unknown preset");
    const merged = presetSettings({ ...p.settings, ...settings });
    const g = merged.grid;
    if (g && g.tp.length * g.slOfTp.length * g.trailOfTp.length * g.holdH.length > 240)
      throw new Error("protect grid too large (max 240 variants)");
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
    const r = auditState({
      sim: this.sim,
      tapes: this.tapes,
      cost: this.settings.cost,
      base: { evaluated: this.status.baseEvaluated, passed: this.status.basePassed },
      stages: this.stageSets,
      paper: { ...this.paper, sizing: this.paperSizing() },
    });
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

  private stepPaper() {
    if (!this.tapes.length || !this.sim) return;
    const nowT = Math.floor(Date.now() / H) * H;
    const t = Math.min(nowT, this.sim.endT);
    const held = new Set(this.sim.steps[this.sim.steps.length - 1]?.real ?? []);
    // signal configs are not selected into seats: every config of an active signal runs (Real gate per symbol)
    const { engine: selTapes, signal: sigTapes } = splitSignalTapes(this.tapes, this.wf);
    const { picks, eligible } =
      this.wf.mode === "durable"
        ? selectDurable(selTapes, t, this.wf, held)
        : this.wf.mode === "fixed"
          ? selectFixed(selTapes, t, this.wf)
          : selectAt(selTapes, t, this.wf);
    const sel = new Set([...picks.map((p) => p.id), ...sigTapes.map((tp) => tp.id)]);
    // sets that still hold an open position stay processed until that position is closed (even when no longer
    // selected): their tape carries the open position forward until its exit
    const holding = new Set(this.paper.positions.map((p) => p.cfg));
    // (tape lookup by id: a scan of every tape per held set was O(held × tapes) — seconds at 70 symbols)
    const byId = this.tapeIndex();
    const keep = new Set<string>(sel);
    for (const id of holding) {
      const tp = byId.get(id);
      if (tp && tp.open.some((o) => o.cfg === id)) keep.add(id);
    }
    const positions: Array<OpenPosition & { vol: number; level: number }> = [];
    const perSym = new Map<string, number>();
    const perSide = new Map<string, number>();
    const openBy = new Map<string, number>();
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
    // Block sources (overall / symbol / direction / indication) judge executed positions closed before each entry
    const booksAt = this.booksAt();
    for (const { tp, op, held } of cands) {
      // a held position continues regardless of the entry rules (they decided at its entry) and keeps its volume
      const prev = prevByKey.get(`${op.cfg}|${op.sym}|${op.entryT}`);
      const d = held
        ? ({ ok: true, vol: prev?.vol ?? 1, level: prev?.level ?? 0 } as const)
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
          (this.wf.maxPositions && !openPos.has(posKey) && openPos.size >= this.wf.maxPositions))
      )
        continue;
      openPos.add(posKey);
      perSym.set(`${cls}|${op.sym}`, c + 1);
      perSide.set(`${cls}|${op.side}`, sd + 1);
      openBy.set(cls, (openBy.get(cls) ?? 0) + 1);
      positions.push({ ...op, vol: d.vol, level: d.level });
    }
    const since = this.paper.startedAt - this.wf.simH * H;
    const trades = this.sim.trades.filter((t) => t.exitT >= since);
    // sizing: every order's unit from the equity at its entry (fixed % of equity) or the fixed notional
    const sized = sizeBook(trades, positions, this.paperSizing());
    const unitOf = (x: { cfg: string; sym: string; entryT: number }) =>
      sized.units.get(orderKey(x)) ?? this.settings.paperNotional;
    const db = this.db;
    db.tx(() => {
      db.run("DELETE FROM paper_positions");
      for (const p of positions) {
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
      }
      for (const t of trades) {
        db.run(
          "INSERT INTO paper_trades (cfg, sym, side, entry_t, exit_t, entry, exit, r, pnl, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (cfg, sym, entry_t) DO UPDATE SET pnl = excluded.pnl",
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
        );
      }
    });
    this.paper = {
      selected: [...sel],
      eligible,
      positions,
      trades,
      equity: sized.pnl + positions.reduce((a, p) => a + p.mtm * unitOf(p), 0),
      balance: 0,
      units: sized.units,
      startedAt: this.paper.startedAt,
    };
    this.paper.balance = this.settings.paperBalance + this.paper.equity;
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
    const wantBook =
      this.wf.toggles.block && !!(src.overall || src.symbol || src.direction || src.indication);
    const wantGuard = !!this.wf.signalGuardN || !!this.wf.signalCluster?.enabled;
    if (!wantBook && !wantGuard) return () => ({ book: null, guard: null });
    const feed = this.sim?.feed ?? [];
    const book = new BlockBook();
    const guard = new SignalGuard();
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
    for (const id of this.paper.selected) {
      const tp = byId.get(id);
      if (!tp) continue;
      for (const p of tp.pending) {
        // an entry on the next bar passes the same execution rules as in the simulation
        if (!execDecision(tp, entryT, this.wf, { ...books, sym: p.sym, side: p.side }).ok) continue;
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
          protect: tp.protect,
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
  "lastN",
  "lastNMinPf",
  "maxPerSymbol",
  "maxPerSide",
  "maxOpen",
  "maxPositions",
  "guardPct",
  "longH",
  "robustFrac",
  "rank",
  "bots",
  "preGate",
  "familySeats",
  "laneSeats",
  "mode",
  "durableSplits",
  "durableFrac",
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
  num("simH", 6, 240);
  num("stepH", 1 / 60, 48); // re-evaluation down to 1 minute (BingX has no sub-minute history)
  num("portfolio", 0, 10_000, true); // 0 = no limit
  num("lastN", 0, 200, true);
  num("lastNMinPf", 0, 5);
  // order caps: 0 = no limit
  num("maxPerSymbol", 0, 1000, true);
  num("maxPerSide", 0, 10_000, true);
  num("maxOpen", 0, 100_000, true);
  num("guardPct", 0, 100);
  num("longH", 24, 1440);
  num("robustFrac", 0, 1);
  num("durableSplits", 2, 12, true);
  num("durableFrac", 0, 1);
  if (p.rank !== undefined && !["lcb", "score", "net"].includes(String(p.rank))) delete p.rank;
  if (p.mode !== undefined && !["hourly", "durable", "fixed"].includes(String(p.mode)))
    delete p.mode;
  if (p.preGate !== undefined) p.preGate = Boolean(p.preGate);
  if (p.familySeats !== undefined) p.familySeats = Boolean(p.familySeats);
  num("laneSeats", 0, 40, true);
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
  if (db.kvGet<number>("wfCapsV") === 7) return saved;
  const out = { ...saved };
  delete out.maxPerSymbol;
  delete out.maxPerSide;
  delete out.maxOpen;
  db.kvSet("wf", pickWf(out));
  // signal orders likewise: no limit
  const st = db.kvGet<Partial<CoreSettings>>("settings");
  if (st?.signals) {
    delete (st.signals as Partial<SignalSettings>).perSymbol;
    delete (st.signals as Partial<SignalSettings>).maxOpen;
    // saved before Signals were on by default with the 1m lane: the stored values were the old defaults
    delete (st.signals as Partial<SignalSettings>).enabled;
    delete (st.signals as Partial<SignalSettings>).lanes;
    db.kvSet("settings", st);
  }
  // positions / Real seats: no limit (every validated set runs through to execution)
  delete out.maxPositions;
  delete out.portfolio;
  db.kvSet("wf", pickWf(out));
  if (st?.live && (st.live.maxPositions === 3 || st.live.maxNotionalUsd === 30)) {
    if (st.live.maxPositions === 3) st.live.maxPositions = 0;
    if (st.live.maxNotionalUsd === 30) st.live.maxNotionalUsd = 200;
    db.kvSet("settings", st);
  }
  // Main: every validated pair (the former default 140 selected a subset)
  if (st?.mainTop === 140) {
    st.mainTop = 0;
    db.kvSet("settings", st);
  }
  // Block: the former default (level ≥ 1 of 6) is replaced by the validated one (≥ 6 of 10)
  const st2 = db.kvGet<Partial<CoreSettings>>("settings");
  if (st2?.block && st2.block.maxLevel === 6 && st2.block.minActiveLevel === 1) {
    st2.block = { ...st2.block, maxLevel: 10, minActiveLevel: 6 };
    db.kvSet("settings", st2);
  }
  // caps restored (seats / positions 12): an unlimited value written by the previous migration goes back
  const st3 = db.kvGet<Partial<CoreSettings>>("settings");
  if (st3?.live && st3.live.maxPositions === 0) {
    st3.live.maxPositions = 12;
    db.kvSet("settings", st3);
  }
  db.kvSet("wfCapsV", 7);
  return out;
}

function pickWf(o: Partial<WalkForwardOptions>): Partial<WalkForwardOptions> {
  const out: Record<string, unknown> = {};
  for (const k of WF_KEYS) if (o[k] !== undefined) out[k] = o[k];
  return out as Partial<WalkForwardOptions>;
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

function mergeSettings(
  base: CoreSettings,
  ...patches: Array<Partial<CoreSettings> | undefined>
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
    disabledKinds: [...(base.disabledKinds ?? [])],
    block: { ...base.block },
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
      disabledKinds: p.disabledKinds ? [...p.disabledKinds] : (out.disabledKinds ?? []),
      block: { ...out.block, ...(p.block ?? {}) },
      dca: { ...out.dca, ...(p.dca ?? {}) },
      axis: { ...out.axis, ...(p.axis ?? {}) },
      grid: { ...out.grid, ...(p.grid ?? {}) },
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

const G = globalThis as unknown as { __ctsCoreRuntime?: CoreRuntime };

async function liveStep(r: CoreRuntime, intents: LiveIntent[], gen: number) {
  const { stepLive } = await import("./live.server.ts");
  await stepLive(r, intents, gen);
}
export function coreRuntime(): CoreRuntime {
  // dev hot reload keeps the running instance; re-bind it to the current class so new methods exist
  const cur = G.__ctsCoreRuntime as { settings: CoreSettings } | undefined;
  if (cur && !(cur instanceof CoreRuntime)) {
    Object.setPrototypeOf(cur, CoreRuntime.prototype);
    // settings added since the instance was created get their defaults
    cur.settings = mergeSettings(DEFAULT_SETTINGS, cur.settings);
    (cur as unknown as CoreRuntime).ensureFields();
  }
  // the shared database also gets this version's methods and tables (hot reload)
  if (cur) coreDb();
  if (!G.__ctsCoreRuntime) G.__ctsCoreRuntime = new CoreRuntime();
  // the live step is (re)attached from THIS module on every call: a callback kept from an older module
  // version imports through a module runner that a dev-server restart has closed, and then fails every cycle
  if ((G.__ctsCoreRuntime as { __liveFrom?: unknown }).__liveFrom !== liveStep) {
    G.__ctsCoreRuntime.onLive = liveStep;
    (G.__ctsCoreRuntime as { __liveFrom?: unknown }).__liveFrom = liveStep;
  }
  G.__ctsCoreRuntime.ensureAlive();
  return G.__ctsCoreRuntime;
}
