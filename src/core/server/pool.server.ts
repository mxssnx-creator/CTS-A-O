// Small worker pool for backtests: one worker per core (minus one for the server loop), created on demand and
// shut down after use. Falls back to in-process work when workers are unavailable (e.g. a bundled deployment).
import { availableParallelism } from "node:os";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const WORKER_URL = new URL("./tapes.worker.ts", import.meta.url);

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
