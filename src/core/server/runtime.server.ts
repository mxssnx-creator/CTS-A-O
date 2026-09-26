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
  type CoreSettings,
} from "../config.ts";
import { tacticWarmupBars } from "../indications/filters.ts";
import { evaluateAdjust, pausedSets, type AdjustState } from "../adjust.ts";
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
import { barsFromCandles, syntheticCandles, tailBars } from "../market/bars.ts";
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
  makeUniverse,
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
  type ConfigTape,
  type WalkForwardOptions,
  type WalkForwardResult,
} from "../sim/walkforward.ts";
import { monitorEventLoopDelay } from "node:perf_hooks";
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
  /** when settings last changed, and which settings version the last finished compute used */
  settingsAt: number;
  appliedSettingsAt: number;
  lastComputeAt: number;
  /** a compute is requested (settings change / recompute) and not yet finished */
  pending: boolean;
  /** self-healing: actions taken and consecutive failed cycles */
  heals: number;
  lastHeal: string;
  errorsInRow: number;
  /** event-loop delay over the last compute (ms) */
  loop: { p50: number; p99: number; max: number };
}

export interface PaperBook {
  selected: string[];
  eligible: number;
  positions: Array<OpenPosition & { vol?: number; level?: number }>;
  trades: Trade[];
  equity: number;
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
    const saved = db.kvGet<Partial<CoreSettings>>("settings");
    this.settings = mergeSettings(DEFAULT_SETTINGS, saved, settings);
    this.settings.gates.minPf = Math.min(1.5, Math.max(1.05, this.settings.gates.minPf));
    this.settings.gates.maxDdtH = Math.min(20, Math.max(2, this.settings.gates.maxDdtH));
    this.wf = {
      ...defaultWalkForward(this.settings),
      ...pickWf(db.kvGet<Partial<WalkForwardOptions>>("wf") ?? {}),
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
  async freshTickers(): Promise<Ticker[]> {
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
  }

  /** Stop now: the in-flight cycle is abandoned at its next yield (a new generation), nothing half-published. */
  stop() {
    this.stopped = true;
    this.gen++;
    this.busy = false;
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.status.state = "stopped";
    this.db.event("info", "runtime stopped");
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
    if (typeof self.tickersAt !== "number") self.tickersAt = 0;
    if (!(self.staleUntil instanceof Map)) self.staleUntil = new Map();
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
        this.db.run("DELETE FROM candles");
        this.db.run("DELETE FROM symbols");
        this.dirty = true;
      }
      const newBars = await this.syncMarket(gen);
      if (gen !== this.gen) return;
      // the universe changed while syncing (timeframe / symbols / history): start over with the new one
      if (this.resetUniverse) return;
      if (newBars || this.dirty) await this.compute(gen);
      if (gen !== this.gen) return;
      // settings changed during the compute: the tapes are from the old settings — recompute first
      const stale = this.dirty || this.resetUniverse;
      if (!stale) this.phase("Paper", () => this.stepPaper());
      if (!stale) this.phase("Adjust", () => this.runAdjust());
      if (!stale && this.onLive && this.settings.live.enabled) {
        await this.onLive(this, this.pendingEntries(), gen);
        if (gen !== this.gen) return;
      }
      if (!this.stopped) this.status.state = "running";
      this.status.error = null;
      if (this.snapshotPath && Date.now() - this.lastSnapshot > 10 * 60_000) {
        this.lastSnapshot = Date.now();
        this.db.snapshot(this.snapshotPath);
      }
      this.db.trim();
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
        if (!this.stopped) this.schedule(backoff || (this.dirty ? 0 : this.settings.cycleMs));
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
    // (re)start a backfill that never completed (stop / watchdog mid-way): fetch only the missing symbols
    if (this.candles.size === 0 || this.backfillKey !== uniKey) {
      // test-only feed (explicit opt-in); the app always runs on real BingX data
      if (this.market === "synthetic") {
        const end = Date.now();
        for (let i = 0; i < s.symbols; i++)
          this.storeCandles(`SYN${i}-USDT`, syntheticCandles(`SYN${i}`, s.tfMin, want, end));
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
        const syms = ranked
          .filter((x) => !this.candles.has(x))
          .slice(0, Math.max(0, s.symbols - this.candles.size));
        let done = 0;
        await mapLimit(
          syms,
          4,
          async (sym) => {
            const cs = await this.feed.history(sym, s.tfMin, want, { pauseMs: 60 }).catch(() => []);
            if (gen !== this.gen) return;
            if (cs.length >= minBars) this.storeCandles(sym, cs);
            this.setStage("backfill", ++done, syms.length, sym);
          },
          () => gen === this.gen,
        );
        if (gen !== this.gen) return false;
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
      this.backfillKey = uniKey;
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
            this.storeCandles(sym, cs);
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
    const due = [...this.candles.entries()].filter(([, cs]) => {
      const last = cs[cs.length - 1]?.t ?? 0;
      return last + 2 * tfMs <= now && now - last <= 300 * tfMs;
    });
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
          this.storeCandles(sym, extra, true);
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

  private storeCandles(sym: string, cs: Candle[], append = false) {
    const want = Math.round((this.settings.historyDays * 24 * 60) / this.settings.tfMin);
    const arr = append ? [...(this.candles.get(sym) ?? []), ...cs] : [...cs];
    const trimmed = arr.slice(Math.max(0, arr.length - want));
    this.candles.set(sym, trimmed);
    const ins =
      "INSERT OR REPLACE INTO candles (sym, t, o, h, l, c, v) VALUES (?, ?, ?, ?, ?, ?, ?)";
    this.db.tx(() => {
      for (const c of cs) this.db.run(ins, sym, c.t, c.o, c.h, c.l, c.c, c.v);
      if (trimmed.length)
        this.db.run("DELETE FROM candles WHERE sym = ? AND t < ?", sym, trimmed[0].t);
    });
    const last = trimmed[trimmed.length - 1]?.t ?? 0;
    if (last > this.status.lastBarT) this.status.lastBarT = last;
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
    for (;;) {
      const r = gen.next();
      if (r.done) {
        maxSlice = Math.max(maxSlice, performance.now() - slice);
        this.status.phases[name] = { ms: performance.now() - t0, maxSliceMs: maxSlice };
        return r.value;
      }
      onStep(r.value);
      const el = performance.now() - slice;
      if (el > SLICE_MS) {
        maxSlice = Math.max(maxSlice, el);
        await yieldNow();
        if (runGen !== this.gen) throw new Error("superseded by a newer loop generation");
        slice = performance.now();
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
    const allBars = [...this.candles.entries()].map(([sym, cs]) =>
      barsFromCandles(sym, s.tfMin, cs),
    );
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
    const pipeline = await this.drive(
      "Pipeline",
      runPipeline(u, s),
      (p: PipelineProgress) =>
        this.setStage(stageName[p.stage] ?? p.stage, p.done, p.total, p.label),
      gen,
    );
    await this.persistPipeline(pipeline, gen);
    this.pipeline = pipeline;

    // walk-forward tapes on the recent tail: warm-up + long window + simulated run
    // + the warm-up the active tactics need (e.g. the 2-week volatility rank) before their first valid signal
    const tailN =
      Math.round(((24 + Math.max(wf.preH, wf.longH) + wf.simH) * 60) / s.tfMin) +
      tacticWarmupBars(s.tactics);
    const wu = makeUniverse(allBars.map((b) => tailBars(b, tailN)));
    // Main candidates: Base combos by score (default protect, full history), plus every pair held right now
    const main = new Set<string>();
    for (const r of [...pipeline.s1].sort((a, b) => b.score - a.score).slice(0, s.mainTop))
      main.add(`${r.bot}|${r.ind}`);
    for (const id of this.paper.selected) main.add(id.split("|").slice(0, 2).join("|"));
    this.status.mainPairs = main.size;
    const tapes = await this.drive(
      "Tapes",
      buildTapesGen(
        wu,
        wf.protects,
        s.cost,
        { protects: wf.dcaProtects, dca: wf.dca, axis: s.axis },
        main,
        s.tactics,
        s.adjust?.enabled ? this.adjustState() : null,
      ),
      (p) =>
        this.setStage(
          "Base",
          p.done,
          p.total,
          "strategy tapes (normal · trailing · DCA · DCA Active)",
        ),
      gen,
    );
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
    this.persistSim(sim);
    this.autoPreset(s, wf, sim);
    // every preset on the same tapes: with / without Block, DCA and Active, side by side
    const presets: Record<string, unknown> = {};
    const names = Object.keys(STRATEGY_PRESETS);
    const tc = performance.now();
    let maxSlice = 0;
    for (let i = 0; i < names.length; i++) {
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
            JSON.stringify(r.bySym),
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
            JSON.stringify(o.runs.get(r.id)?.bySym ?? {}),
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
        await mapLimit(syms, 4, async (sym) => {
          const cs = await this.feed
            .history(sym, s.tfMin, wantBars, { pauseMs: 60 })
            .catch(() => [] as Candle[]);
          if (cs.length) candles.set(sym, cs);
          job.progress = (++done / syms.length) * 0.3;
        });
        if (!candles.size) throw new Error("no market data (exchange unreachable)");
        this.btCandles.set(uniKey, { at: Date.now(), candles });
      }
    }
    const bars = [...candles.entries()].map(([sym, cs]) =>
      tailBars(barsFromCandles(sym, s.tfMin, cs), wantBars),
    );
    const u = makeUniverse(bars);
    // Base on the window BEFORE the backtest (causal), unless a fixed focus set is traded
    job.stage = "Base";
    let main: Set<string>;
    const combos = allCombos(s.focus, s.disabledKinds);
    if (wf.mode === "fixed" && s.focus.length)
      main = new Set(combos.map((c) => `${c.bot}|${c.ind}`));
    else {
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
      const scores: Array<{ pair: string; score: number }> = [];
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
          if (r) scores.push({ pair: `${combos[i].bot}|${combos[i].ind}`, score: r.score });
          yield i;
        }
      }
      await this.sliced(base(), (i) => (job.progress = 0.3 + (0.3 * (i + 1)) / combos.length));
      main = new Set(
        scores
          .sort((a, b) => b.score - a.score)
          .slice(0, s.mainTop)
          .map((x) => x.pair),
      );
    }
    job.stage = "Tapes";
    const tapes = await this.sliced(
      buildTapesGen(
        u,
        wf.protects,
        s.cost,
        { protects: wf.dcaProtects, dca: wf.dca, axis: s.axis },
        main,
        s.tactics,
      ),
      (x) => (job.progress = 0.6 + (0.3 * x.done) / Math.max(1, x.total)),
    );
    job.stage = "Simulation";
    const sim = await this.sliced(
      walkForwardGen(u, tapes, { ...wf, startT, simH: days * 24 }),
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
  private stepPaper() {
    if (!this.tapes.length || !this.sim) return;
    const nowT = Math.floor(Date.now() / H) * H;
    const t = Math.min(nowT, this.sim.endT);
    const held = new Set(this.sim.steps[this.sim.steps.length - 1]?.real ?? []);
    const { picks, eligible } =
      this.wf.mode === "durable"
        ? selectDurable(this.tapes, t, this.wf, held)
        : this.wf.mode === "fixed"
          ? selectFixed(this.tapes, t, this.wf)
          : selectAt(this.tapes, t, this.wf);
    const sel = new Set(picks.map((p) => p.id));
    // the same Real-stage execution rules as the simulation: toggles, last-N, Block level / Block Active, volume
    const positions: Array<OpenPosition & { vol: number; level: number }> = [];
    const perSym = new Map<string, number>();
    const perSide = new Map<number, number>();
    for (const tp of this.tapes) {
      if (!sel.has(tp.id)) continue;
      for (const op of tp.open) {
        const d = execDecision(tp, op.entryT, this.wf);
        if (!d.ok) continue;
        const c = perSym.get(op.sym) ?? 0;
        const sd = perSide.get(op.side) ?? 0;
        if (
          c >= this.wf.maxPerSymbol ||
          sd >= this.wf.maxPerSide ||
          positions.length >= this.wf.maxOpen
        )
          continue;
        perSym.set(op.sym, c + 1);
        perSide.set(op.side, sd + 1);
        positions.push({ ...op, vol: d.vol, level: d.level });
      }
    }
    const since = this.paper.startedAt - this.wf.simH * H;
    const trades = this.sim.trades.filter((t) => t.exitT >= since);
    const notional = this.settings.paperNotional;
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
          "INSERT OR IGNORE INTO paper_trades (cfg, sym, side, entry_t, exit_t, entry, exit, r, pnl, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          t.cfg,
          t.sym,
          t.side,
          t.entryT,
          t.exitT,
          t.entry,
          t.exit,
          t.r,
          t.r * notional,
          t.reason,
        );
      }
    });
    this.paper = {
      selected: [...sel],
      eligible,
      positions,
      trades,
      equity:
        trades.reduce((a, t) => a + t.r * notional, 0) +
        positions.reduce((a, p) => a + p.mtm * notional, 0),
      startedAt: this.paper.startedAt,
    };
  }

  /**
   * Entries due NOW: signals of the selected configs on the newest closed bar (they enter at the next open).
   * These are what the live adapter may mirror.
   */
  pendingEntries(): LiveIntent[] {
    const sel = new Set(this.paper.selected);
    const out: LiveIntent[] = [];
    for (const tp of this.tapes) {
      if (!sel.has(tp.id)) continue;
      for (const p of tp.pending) {
        // an entry on the next bar passes the same execution rules as in the simulation
        if (!execDecision(tp, this.status.lastBarT + this.settings.tfMin * 60_000, this.wf).ok)
          continue;
        // the bar the signal was decided on is the symbol's own newest bar (a lagging symbol is dropped by the planner)
        const barT = this.candles.get(p.sym)?.at(-1)?.t ?? 0;
        out.push({ cfg: tp.id, sym: p.sym, side: p.side, protect: tp.protect, barT });
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
  "guardPct",
  "longH",
  "robustFrac",
  "rank",
  "bots",
  "preGate",
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
  num("simH", 6, 240);
  num("stepH", 1 / 60, 48); // re-evaluation down to 1 minute (BingX has no sub-minute history)
  num("portfolio", 1, 60, true);
  num("lastN", 0, 200, true);
  num("lastNMinPf", 0, 5);
  num("maxPerSymbol", 1, 20, true);
  num("maxPerSide", 1, 400, true);
  num("maxOpen", 1, 1000, true);
  num("guardPct", 0, 100);
  num("longH", 24, 1440);
  num("robustFrac", 0, 1);
  num("durableSplits", 2, 12, true);
  num("durableFrac", 0, 1);
  if (p.rank !== undefined && !["lcb", "score", "net"].includes(String(p.rank))) delete p.rank;
  if (p.mode !== undefined && !["hourly", "durable", "fixed"].includes(String(p.mode)))
    delete p.mode;
  if (p.preGate !== undefined) p.preGate = Boolean(p.preGate);
  if (p.bots !== undefined)
    p.bots = Array.isArray(p.bots) ? (p.bots as unknown[]).map(String).slice(0, 20) : [];
  return p as Partial<WalkForwardOptions>;
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
    };
  }
  return out;
}

const G = globalThis as unknown as { __ctsCoreRuntime?: CoreRuntime };
export function coreRuntime(): CoreRuntime {
  // dev hot reload keeps the running instance; re-bind it to the current class so new methods exist
  const cur = G.__ctsCoreRuntime as { settings: CoreSettings } | undefined;
  if (cur && !(cur instanceof CoreRuntime)) {
    Object.setPrototypeOf(cur, CoreRuntime.prototype);
    // settings added since the instance was created get their defaults
    cur.settings = mergeSettings(DEFAULT_SETTINGS, cur.settings);
    (cur as unknown as CoreRuntime).ensureFields();
  }
  if (!G.__ctsCoreRuntime) {
    const rt = new CoreRuntime();
    rt.onLive = async (r, intents, gen) => {
      const { stepLive } = await import("./live.server.ts");
      await stepLive(r, intents, gen);
    };
    G.__ctsCoreRuntime = rt;
  }
  G.__ctsCoreRuntime.ensureAlive();
  return G.__ctsCoreRuntime;
}
