// Small worker pool for backtests: one worker per core (minus one for the server loop), created on demand and
// shut down after use. Falls back to in-process work when workers are unavailable (e.g. a bundled deployment).
import { availableParallelism } from "node:os";
import { existsSync } from "node:fs";
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
  return Math.max(1, Math.min(8, availableParallelism() - 1));
}

/** Run each message on its own worker (at most `size` at once); resolves the replies in message order. */
export async function runOnWorkers<R>(
  messages: Array<Record<string, unknown>>,
  size = poolSize(),
  timeoutMs = 15 * 60_000,
): Promise<R[]> {
  const out: R[] = new Array(messages.length);
  let next = 0;
  const one = () =>
    new Promise<void>((resolve, reject) => {
      const w = new Worker(WORKER_URL, {
        execArgv: ["--experimental-strip-types", "--no-warnings"],
        resourceLimits: { maxOldGenerationSizeMb: 4096 },
      });
      const timer = setTimeout(() => {
        void w.terminate();
        reject(new Error("worker timed out"));
      }, timeoutMs);
      const run = () => {
        if (next >= messages.length) {
          clearTimeout(timer);
          void w.terminate();
          resolve();
          return;
        }
        const i = next++;
        w.once("message", (m: { ok: boolean; error?: string } & R) => {
          if (!m.ok) {
            clearTimeout(timer);
            void w.terminate();
            reject(new Error(m.error ?? "worker failed"));
            return;
          }
          out[i] = m;
          run();
        });
        w.postMessage({ ...messages[i], id: i });
      };
      w.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      run();
    });
  await Promise.all(Array.from({ length: Math.min(size, messages.length) }, one));
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
