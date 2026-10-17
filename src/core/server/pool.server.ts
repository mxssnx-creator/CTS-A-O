// Small worker pool for backtests: one worker per core (minus one for the server loop), created on demand and
// shut down after use. Falls back to in-process work when workers are unavailable (e.g. a bundled deployment).
import { availableParallelism } from "node:os";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { Worker } from "node:worker_threads";
import type { Bars, Protect, Tactics } from "../domain/types.ts";
import type { SignalSettings } from "../signal-config.ts";
import type { SignalHistDiagnostics, SignalHistValidation } from "../signal-hist.ts";
import type { BaseConfigCountOptions, BaseConfigCountRow } from "../base-config-counts.ts";
import type { buildTapesGen, EntryFloors } from "../sim/walkforward.ts";

/** One background slice; normal/trailing work is bounded to 32 protection cells. No tapes cross the worker boundary. */
export type BaseConfigChunkMessage = {
  type: "base-config-count";
  evaluationFromT?: number;
  bars: Bars[];
  pair: string;
  protects: Protect[];
  cost: number;
  dcaOpt?: Parameters<typeof buildTapesGen>[3];
  tactics?: Tactics | null;
  adjust?: Parameters<typeof buildTapesGen>[6];
  floors: Omit<EntryFloors, "baseConfigCounter" | "countSeen" | "buildStats">;
  options: BaseConfigCountOptions;
  kinds: string[];
  seen: string[];
};
export type BaseConfigChunkReply = { rows: BaseConfigCountRow[]; seen: string[] };

/** Signal-specific historic configs: the stage's shared series and causal cut, at most two pairs per part. */
export type SignalHistMessage = {
  type: "signal-hist";
  evaluationFromT?: number;
  bars: Bars[];
  pairs: string[];
  sig: SignalSettings;
  tactics?: Tactics | null;
  cutT: number;
  validation?: SignalHistValidation;
};
export type SignalHistReply = { pairProtects: Record<string, Protect[]>; diagnostics?: SignalHistDiagnostics };

/** Source installs use TypeScript; production builds place one standalone ESM worker beside the server entry. */
export function resolveWorkerUrl(moduleUrl = import.meta.url, configured = process.env.CTS_CORE_WORKER): URL {
  // An explicit operator path is authoritative. A typo remains unavailable instead of silently selecting another file.
  if (configured) return pathToFileURL(configured);
  const source = new URL("./tapes.worker.ts", moduleUrl);
  if (source.protocol !== "file:") return source;
  const isFile = (url: URL) => {
    try { return statSync(fileURLToPath(url)).isFile(); } catch { return false; }
  };
  if (isFile(source)) return source;
  let dir = dirname(fileURLToPath(moduleUrl));
  // Nitro's _ssr / _chunks directories sit below __server.func, __nitro.func or .output/server. Check only the
  // exact build artifact in this bounded parent chain; never search the filesystem or depend on the launch cwd.
  for (let depth = 0; depth < 6; depth++) {
    const packaged = pathToFileURL(join(dir, "cts-core-worker.mjs"));
    if (isFile(packaged)) return packaged;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return source;
}
export function workerExecArgv(url: URL): string[] {
  return /\.[cm]?ts$/.test(url.pathname) ? ["--experimental-strip-types", "--no-warnings"] : ["--no-warnings"];
}
const WORKER_URL = resolveWorkerUrl();

export function workersAvailable(): boolean {
  try {
    return (
      WORKER_URL.protocol === "file:" &&
      existsSync(fileURLToPath(WORKER_URL)) &&
      process.env.CTS_CORE_WORKERS !== "0"
    );
  } catch {
    return false;
  }
}

export function poolSize(): number {
  const env = Number(process.env.CTS_CORE_WORKERS);
  if (Number.isInteger(env) && env > 0) return env;
  // every core: the main thread only waits while the workers compute (ticks stay responsive, see the loop test)
  return Math.max(1, Math.min(32, availableParallelism()));
}

// Workers are kept and reused across calls (and released after IDLE_MS without work). Spawning fresh worker
// threads for every call made the allocator keep each thread's freed memory: the server grew to ~7 GB RSS with a
// ~0.7 GB heap. Reuse keeps the thread count and their arenas bounded (MALLOC_ARENA_MAX=2 caps them further).
const IDLE_MS = 120_000;
type Slot = { w: Worker; busy: boolean; ver: number };
/** The bundled server can contain this module in boot and SSR chunks. Every scheduling field shares one owner. */
type SharedPool = {
  slots: Slot[];
  idle: ReturnType<typeof setTimeout> | null;
  waiters: Waiter[];
  urgent: Waiter[];
  activity: { inFlight: number; at: number };
  abortReason: string | null;
  /** Running calls share cancellation across boot / SSR module copies, including already queued replies. */
  aborters: Set<(reason: string) => void>;
};
/** the worker file's version: a reused worker never runs older code than the file on disk (hot reload) */
const workerVersion = () => {
  try {
    return statSync(fileURLToPath(WORKER_URL)).mtimeMs;
  } catch {
    return 0;
  }
};
const G = globalThis as unknown as {
  __ctsPool?: Partial<SharedPool> & Pick<SharedPool, "slots" | "idle">;
};
const pool = (): SharedPool => {
  const p = (G.__ctsPool ??= {
    slots: [], idle: null, waiters: [], urgent: [], activity: { inFlight: 0, at: 0 }, abortReason: null,
    aborters: new Set(),
  });
  if (!p.waiters || !p.urgent || !p.activity || !p.aborters) {
    // Old module copies may own private queues or calls without an abort registration. Leave their pool untouched
    // so existing calls can drain. A process restart creates the complete shared schema; partial adoption cannot
    // cancel those older calls reliably, and adopting private queues could strand them forever.
    throw new Error("Worker pool upgrade requires a process restart: legacy scheduler state cannot be adopted safely");
  }
  if (p.abortReason === undefined) p.abortReason = null;
  return p as SharedPool;
};

function spawn(): Slot {
  const w = new Worker(WORKER_URL, {
    // (a worker collects after each reply when the process runs with --expose-gc — V8 flags are process-wide, a
    // worker's execArgv may not carry them — so its heap does not sit near its limit on an always-busy desk)
    execArgv: workerExecArgv(WORKER_URL),
    resourceLimits: { maxOldGenerationSizeMb: 4096 },
  });
  w.unref();
  const slot: Slot = { w, busy: false, ver: workerVersion() };
  w.on("error", () => drop(slot));
  w.on("exit", () => drop(slot));
  pool().slots.push(slot);
  return slot;
}

function drop(slot: Slot) {
  const p = pool();
  p.slots = p.slots.filter((x) => x !== slot);
  return slot.w.terminate().catch(() => undefined);
}

/** a queued message's hand-off: a worker, or null when its call stopped waiting (failed / aborted) */
type Waiter = (slot: Slot | null) => void;
/**
 * Workers are borrowed per message from ONE pool capped at poolSize(): several runtimes (one per connection)
 * computing at once queue for the cores (first come, first served, one message at a time) instead of each
 * starting a worker per core. Priority messages (a backtest someone is waiting for) are served before the
 * engines' background recomputes, so a busy pool never starves them past their time limit.
 */
const waiters = pool().waiters;
const urgent = pool().urgent;
function acquire(priority = false, queued?: Set<Waiter>, claimed?: (slot: Slot) => void): Promise<Slot | null> {
  const p = pool();
  const free = p.slots.find((x) => !x.busy);
  // (a routine message takes a free worker only while fewer than the cores are busy: an idle extra worker stays
  // free for the next priority message)
  if (free && (priority || p.slots.filter((x) => x.busy).length < poolSize())) {
    free.busy = true;
    claimed?.(free);
    return Promise.resolve(free);
  }
  // a priority message (the realtime entry step, a backtest someone waits for) may start one worker beyond the
  // cores: a compute's Base messages hold every worker for minutes, and the realtime step must not wait behind them
  if (p.slots.length < poolSize() + (priority ? 1 : 0)) {
    const slot = spawn();
    slot.busy = true;
    claimed?.(slot);
    return Promise.resolve(slot);
  }
  return new Promise((resolve) => {
    const w: Waiter = (slot) => {
      queued?.delete(w);
      if (slot) claimed?.(slot);
      resolve(slot);
    };
    queued?.add(w);
    (priority ? urgent : waiters).push(w);
  });
}
/** A stopped call's queued messages leave the queue; their lanes end (null). */
function unqueue(queued: Set<Waiter>) {
  for (const w of [...queued]) {
    for (const q of [waiters, urgent]) {
      const k = q.indexOf(w);
      if (k >= 0) q.splice(k, 1);
    }
    w(null);
  }
}
function release(slot: Slot) {
  const p = pool();
  // routine messages never run on more workers than the cores (the extra one is a priority message's)
  const busyOthers = p.slots.filter((x) => x.busy && x !== slot).length;
  const next = urgent.shift() ?? (busyOthers < poolSize() ? waiters.shift() : undefined);
  if (!p.slots.includes(slot)) {
    // the worker was dropped (time-out / exit): a waiter gets a fresh one
    if (next) {
      const fresh = spawn();
      fresh.busy = true;
      next(fresh);
    }
    return;
  }
  if (next) next(slot);
  else slot.busy = false;
}
/** Messages waiting for a free worker (status / tests). */
export function poolQueue(): number {
  return waiters.length + urgent.length;
}

/** Workers alive right now (for status / tests). */
export function poolWorkers(): number {
  return pool().slots.length;
}

/**
 * Abort every running message now (memory pressure): busy workers are terminated — their memory is released at
 * once — and each waiting routine call rejects with `reason`. Idle workers are dropped too. Returns how many were busy.
 */
export function abortWorkers(reason: string): number {
  const p = pool();
  const busy = p.slots.filter((x) => x.busy).length;
  p.abortReason = reason;
  // Termination is asynchronous: a successful reply may already be queued on the main thread. Cancel each call
  // now, before that reply can resolve it or its next part can acquire a fresh worker.
  for (const abort of [...p.aborters]) abort(reason);
  for (const x of [...p.slots]) drop(x);
  // a routine call still waiting rejects now: a dropped worker's release handed it a fresh one, so the aborted work
  // went on (a waiting priority message — the realtime step — still runs: live control continues)
  for (const w of waiters.splice(0)) w(null);
  // the rejections run on the next turn (worker exit events); the reason is cleared after them
  setTimeout(() => {
    p.abortReason = null;
  }, 1000).unref?.();
  return busy;
}

/**
 * A call stopped by abortWorkers rejects with this mark: the memory guard stopped it, its workers did not fail. The
 * pool is shared, so one runtime's abort also stops another runtime's calls (isWorkersAbort tells them apart).
 */
const abortedError = (reason: string) => Object.assign(new Error(reason), { workersAborted: true });
export function isWorkersAbort(err: unknown): boolean {
  return (err as { workersAborted?: unknown } | null)?.workersAborted === true;
}

/** Release every worker now (tests, shutdown). */
export async function closePool() {
  const p = pool();
  if (p.idle) clearTimeout(p.idle);
  p.idle = null;
  const slots = p.slots;
  p.slots = [];
  await Promise.all(slots.map((x) => x.w.terminate().catch(() => undefined)));
}

/** Run the messages on up to `size` pooled workers (one message per worker at a time); replies in order. */
/** Worker runs in flight and the time of the last start / reply: the watchdog keeps a waiting cycle alive. */
const activity = pool().activity;
/** tests: simulate silent workers (a hung phase) */
export function markWorkersSilent() {
  activity.at = 0;
}
export function workerActivity(): { inFlight: number; at: number } {
  return { ...activity };
}

export async function runOnWorkers<R>(
  messages: Array<Record<string, unknown>>,
  size = poolSize(),
  timeoutMs = 15 * 60_000,
  /** fraction 0..1 across every message, from worker progress posts (no `ok`) */
  onProgress?: (fraction: number) => void,
  /** served before non-priority messages waiting for a worker */
  priority = false,
  /** Cancel only this call, including a wholly queued priority call. */
  signal?: AbortSignal,
): Promise<R[]> {
  signal?.throwIfAborted();
  activity.inFlight++;
  activity.at = Date.now();
  try {
    return await runOnWorkersNow<R>(messages, size, timeoutMs, onProgress, priority, signal);
  } finally {
    activity.inFlight--;
    activity.at = Date.now();
  }
}

const sumOf = (m: ReadonlyMap<number, number>) => {
  let sum = 0;
  for (const v of m.values()) sum += v;
  return sum;
};

async function runOnWorkersNow<R>(
  messages: Array<Record<string, unknown>>,
  size = poolSize(),
  timeoutMs = 15 * 60_000,
  onProgress?: (fraction: number) => void,
  priority = false,
  signal?: AbortSignal,
): Promise<R[]> {
  signal?.throwIfAborted();
  const p = pool();
  if (p.idle) clearTimeout(p.idle);
  p.idle = null;
  const ver = workerVersion();
  for (const x of p.slots.filter((y) => !y.busy && y.ver !== ver)) drop(x);
  const out: R[] = new Array(messages.length);
  const frac = new Map<number, number>();
  let next = 0;
  // the call stops as a whole at its first failure: its other lanes ran every remaining message on the cores for
  // results nobody read, queued the next compute behind them and moved the caller's progress
  let failed: Error | null = null;
  const running = new Set<Slot>();
  const queued = new Set<Waiter>();
  const cancellations = new Set<(err: Error) => void>();
  const stopping = new Set<Promise<unknown>>();
  const stopOwned = (slot: Slot) => { stopping.add(drop(slot)); };
  const fail = (err: unknown) => {
    if (failed) return;
    failed = err instanceof Error ? err : new Error(String(err));
    unqueue(queued);
    for (const cancel of [...cancellations]) cancel(failed);
    // (a Base part holds its worker for minutes: terminated now, not finished)
    for (const x of running) stopOwned(x);
  };
  const progress = (f: number) => {
    if (onProgress && !failed) onProgress(f);
  };
  const lane = async () => {
    while (!failed && next < messages.length) {
      const i = next++;
      let slot: Slot | null = null;
      try {
        // Acquisition can throw synchronously while spawning: it must stop and drain this call's other lanes too.
        // Own a reserved worker before the await continuation, including the moment a waiter is handed its worker.
        slot = await acquire(priority, queued, (slot) => running.add(slot));
        // (null: aborted while waiting, or this call failed meanwhile)
        if (!slot) return fail(abortedError(p.abortReason ?? "worker aborted"));
        if (failed) return;
        const activeSlot = slot;
        const w = activeSlot.w;
        out[i] = await new Promise<R>((resolve, reject) => {
          const timer = setTimeout(() => {
            cleanup();
            stopOwned(activeSlot);
            reject(new Error("worker timed out"));
          }, timeoutMs);
          const onMsg = (m: {
            ok?: boolean;
            error?: string;
            id?: number;
            progress?: number;
            total?: number;
          } & R) => {
            if (failed) return cancel(failed);
            // progress posts keep the watchdog alive and move the desk bar; they are not the reply
            if (m.ok == null && typeof m.progress === "number") {
              activity.at = Date.now();
              const id = typeof m.id === "number" ? m.id : i;
              // never backwards for one message (a late post after its reply, or a smaller count)
              frac.set(id, Math.max(frac.get(id) ?? 0, m.total ? Math.min(1, m.progress / m.total) : 0));
              if (messages.length) progress(sumOf(frac) / messages.length);
              return;
            }
            activity.at = Date.now();
            if (!m.ok) cancel(new Error(m.error ?? "worker failed"));
            else {
              // a finished message counts whole: a worker posts progress at most every 400 ms, so a short part
              // never posted any (or not its last) and the stage stayed at 0 % ("Signals 0 %") until the next stage
              frac.set(i, 1);
              if (messages.length) progress(sumOf(frac) / messages.length);
              // A progress observer (including a memory guard) can abort at the successful-reply boundary.
              if (failed) return cancel(failed);
              cleanup();
              resolve(m);
            }
          };
          const onErr = (e: Error) => {
            cancel(e);
          };
          const onExit = (code: number) => {
            // A memory abort already cancelled this call synchronously. A newer call's ordinary exit must not
            // inherit a previous abort's briefly retained reason.
            cancel(failed ?? new Error(`worker exited (${code})`));
          };
          const cleanup = () => {
            clearTimeout(timer);
            w.off("message", onMsg);
            w.off("error", onErr);
            w.off("exit", onExit);
            cancellations.delete(cancel);
          };
          const cancel = (err: Error) => { cleanup(); reject(err); };
          cancellations.add(cancel);
          w.on("message", onMsg);
          w.once("error", onErr);
          w.once("exit", onExit);
          w.postMessage({ ...messages[i], id: i });
        });
      } catch (err) {
        if (slot) {
          running.delete(slot);
          // A worker error/exit drops the slot before this continuation; retain its termination barrier too.
          if (!p.slots.includes(slot)) stopOwned(slot);
        }
        fail(err);
      } finally {
        if (slot) {
          running.delete(slot);
          release(slot);
        }
      }
    }
  };
  const abort = (reason: string) => {
    // An entirely queued priority call (the realtime step) still runs. Calls already using a worker abort as
    // before; every routine call stops, even while waiting or handling its last successful reply.
    if (!priority || running.size > 0) fail(abortedError(reason));
  };
  p.aborters.add(abort);
  const cancelOwn = () => fail(signal?.reason ?? new Error("worker call canceled"));
  signal?.addEventListener("abort", cancelOwn, { once: true });
  if (signal?.aborted) cancelOwn();
  try {
    // (every lane has settled before the call rejects: in flight for the watchdog and the memory guard until then)
    await Promise.all(Array.from({ length: Math.max(1, Math.min(size, messages.length)) }, () => lane().catch(fail)));
    // A local fallback must not overlap threads this call has stopped. Other owners' workers are never awaited.
    await Promise.all(stopping);
  } finally {
    p.aborters.delete(abort);
    signal?.removeEventListener("abort", cancelOwn);
    // idle workers are released after a while (a steady engine reuses them every compute)
    armIdle();
  }
  if (failed) throw failed;
  return out;
}

/**
 * The idle release, armed after every call. Defined here, not inside the call: a timer made inside runOnWorkersNow
 * shared that call's closure context, which holds its onProgress — and with it the caller's runtime — for IDLE_MS
 * (a stopped test or session runtime stayed in memory for 2 min after its last worker call).
 */
function armIdle() {
  const p = pool();
  if (p.idle) clearTimeout(p.idle);
  p.idle = setTimeout(releaseIdle, IDLE_MS);
  (p.idle as { unref?: () => void }).unref?.();
}
function releaseIdle() {
  const p = pool();
  p.idle = null;
  for (const x of p.slots.filter((y) => !y.busy)) drop(x);
}

/** Split a list into `k` contiguous slices (order preserved). */
export function slices<T>(xs: readonly T[], k: number): T[][] {
  const n = Math.max(1, Math.min(k, xs.length));
  const out: T[][] = [];
  for (let i = 0; i < n; i++)
    out.push(xs.slice(Math.floor((i * xs.length) / n), Math.floor(((i + 1) * xs.length) / n)));
  return out.filter((s) => s.length);
}

// ── zero-copy messages ─────────────────────────────────────────────────────────────────────────────────────
// A worker message is serialized on the main thread; copying every bar series (and, for the preset
// simulations, every tape) into each message stalled the server for hundreds of ms. Copied once into shared
// memory per compute, the messages carry references only.

type Col = Float64Array | Float32Array | Uint16Array | Uint8Array | Int8Array;

/** Bars backed by one SharedArrayBuffer per series (read-only for every worker). */
export function shareBars<
  B extends {
    n: number;
    t: Float64Array;
    o: Float64Array;
    h: Float64Array;
    l: Float64Array;
    c: Float64Array;
    v: Float64Array;
  },
>(bars: readonly B[]): B[] {
  return bars.map((b) => {
    const sab = new SharedArrayBuffer(Math.max(1, b.n) * 6 * 8);
    const cols = ["t", "o", "h", "l", "c", "v"] as const;
    const out = { ...b } as B;
    cols.forEach((k, i) => {
      const a = new Float64Array(sab, i * b.n * 8, b.n);
      a.set(b[k].subarray(0, b.n));
      (out as Record<string, unknown>)[k] = a;
    });
    return out;
  });
}

const TAPE_COLS = [
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

/** Tapes whose columns live in shared memory (each tape's single backing buffer copied once). */
export function shareTapes<T extends Record<string, unknown>>(tapes: readonly T[]): T[] {
  return tapes.map((tp) => {
    const first = tp[TAPE_COLS[0]] as Col;
    const src = first.buffer as ArrayBuffer;
    const sab = new SharedArrayBuffer(src.byteLength);
    new Uint8Array(sab).set(new Uint8Array(src));
    const out = { ...tp } as Record<string, unknown>;
    for (const k of TAPE_COLS) {
      const a = tp[k] as Col;
      if (a.buffer !== src) {
        out[k] = a; // not on the tape's backing buffer (never the case for makeTape): leave as is
        continue;
      }
      const Ctor = a.constructor as new (b: SharedArrayBuffer, off: number, len: number) => Col;
      out[k] = new Ctor(sab, a.byteOffset, a.length);
    }
    return out as T;
  });
}
