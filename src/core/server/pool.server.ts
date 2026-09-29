// Small worker pool for backtests: one worker per core (minus one for the server loop), created on demand and
// shut down after use. Falls back to in-process work when workers are unavailable (e.g. a bundled deployment).
import { availableParallelism } from "node:os";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

// A bundled server has no .ts next to its chunks: a self-hosted install points CTS_CORE_WORKER at the source file
const WORKER_URL = process.env.CTS_CORE_WORKER
  ? pathToFileURL(process.env.CTS_CORE_WORKER)
  : new URL("./tapes.worker.ts", import.meta.url);

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
/** the worker file's version: a reused worker never runs older code than the file on disk (hot reload) */
const workerVersion = () => {
  try {
    return statSync(fileURLToPath(WORKER_URL)).mtimeMs;
  } catch {
    return 0;
  }
};
const G = globalThis as unknown as {
  __ctsPool?: { slots: Slot[]; idle: ReturnType<typeof setTimeout> | null };
};
const pool = () => (G.__ctsPool ??= { slots: [], idle: null });

function spawn(): Slot {
  const w = new Worker(WORKER_URL, {
    execArgv: ["--experimental-strip-types", "--no-warnings"],
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
  void slot.w.terminate().catch(() => undefined);
}

/** Workers alive right now (for status / tests). */
export function poolWorkers(): number {
  return pool().slots.length;
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
const activity = { inFlight: 0, at: 0 };
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
): Promise<R[]> {
  activity.inFlight++;
  activity.at = Date.now();
  try {
    return await runOnWorkersNow<R>(messages, size, timeoutMs, onProgress);
  } finally {
    activity.inFlight--;
    activity.at = Date.now();
  }
}

async function runOnWorkersNow<R>(
  messages: Array<Record<string, unknown>>,
  size = poolSize(),
  timeoutMs = 15 * 60_000,
  onProgress?: (fraction: number) => void,
): Promise<R[]> {
  const p = pool();
  if (p.idle) clearTimeout(p.idle);
  p.idle = null;
  const ver = workerVersion();
  for (const x of p.slots.filter((y) => !y.busy && y.ver !== ver)) drop(x);
  const out: R[] = new Array(messages.length);
  const frac = new Map<number, number>();
  let next = 0;
  const lane = async () => {
    // borrow a free worker, or start one
    let slot = p.slots.find((x) => !x.busy);
    if (!slot) slot = spawn();
    slot.busy = true;
    try {
      while (next < messages.length) {
        const i = next++;
        const w = slot.w;
        out[i] = await new Promise<R>((resolve, reject) => {
          const timer = setTimeout(() => {
            cleanup();
            drop(slot!);
            reject(new Error("worker timed out"));
          }, timeoutMs);
          const onMsg = (m: {
            ok?: boolean;
            error?: string;
            id?: number;
            progress?: number;
            total?: number;
          } & R) => {
            // progress posts keep the watchdog alive and move the desk bar; they are not the reply
            if (m.ok == null && typeof m.progress === "number") {
              activity.at = Date.now();
              const id = typeof m.id === "number" ? m.id : i;
              frac.set(id, m.total ? Math.min(1, m.progress / m.total) : 0);
              if (onProgress && messages.length) {
                let sum = 0;
                for (const v of frac.values()) sum += v;
                onProgress(sum / messages.length);
              }
              return;
            }
            cleanup();
            activity.at = Date.now();
            if (!m.ok) reject(new Error(m.error ?? "worker failed"));
            else resolve(m);
          };
          const onErr = (e: Error) => {
            cleanup();
            reject(e);
          };
          const onExit = (code: number) => {
            cleanup();
            reject(new Error(`worker exited (${code})`));
          };
          const cleanup = () => {
            clearTimeout(timer);
            w.off("message", onMsg);
            w.off("error", onErr);
            w.off("exit", onExit);
          };
          w.on("message", onMsg);
          w.once("error", onErr);
          w.once("exit", onExit);
          w.postMessage({ ...messages[i], id: i });
        });
      }
    } finally {
      slot.busy = false;
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.max(1, Math.min(size, messages.length)) }, lane));
  } finally {
    // idle workers are released after a while (a steady engine reuses them every compute)
    if (p.idle) clearTimeout(p.idle);
    p.idle = setTimeout(() => {
      p.idle = null;
      for (const x of p.slots.filter((y) => !y.busy)) drop(x);
    }, IDLE_MS);
    (p.idle as { unref?: () => void }).unref?.();
  }
  return out;
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
