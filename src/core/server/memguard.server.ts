// Memory guard: the engine measures the host's available memory (and its own RSS) while it computes, frees memory
// under pressure and aborts a compute before the kernel kills the process (an OOM kill loses the in-memory state and
// leaves live positions unattended until a restart). A runtime that hit pressure computes on a lighter snapshot
// (the heaviest ranges off) and steps back up once memory has room again; the saved settings are never changed.
//
//   CTS_CORE_MEM_SOFT_MB (default 2500): below this much available memory — collect garbage (at most every 30 s,
//                        only after the heap grew: shouldCollect), log a warning
//   CTS_CORE_MEM_HARD_MB (default 1200): below this — abort the running compute (its workers are terminated; the
//                        compute is never continued in-process), and never start one: one level lighter, or at the
//                        lightest level wait 15 s doubling up to 10 min (memRetryDelayMs)
import { freemem } from "node:os";
import { readFileSync } from "node:fs";

export type MemLevel = "ok" | "soft" | "hard";
export interface MemInfo {
  /** memory the host can still give (MemAvailable), MB */
  availMb: number;
  /** this process, MB (its workers included: they are threads) */
  rssMb: number;
  heapMb: number;
  /** typed-array / Buffer memory this thread holds (tapes, candles), MB */
  arrayBuffersMb?: number;
  /** native memory outside the heap and the array buffers (allocator arenas, workers' heaps), MB */
  nativeMb?: number;
  level: MemLevel;
  at: number;
}

export const memSoftMb = () => Number(process.env.CTS_CORE_MEM_SOFT_MB) || 2500;
export const memHardMb = () => Number(process.env.CTS_CORE_MEM_HARD_MB) || 1200;

/** "MemAvailable:   1234567 kB" → MB; null when the line is missing */
export function parseMemAvailable(meminfo: string): number | null {
  const m = /^MemAvailable:\s+(\d+)\s*kB/m.exec(meminfo);
  return m ? Math.round(Number(m[1]) / 1024) : null;
}

export function memLevel(availMb: number, soft = memSoftMb(), hard = memHardMb()): MemLevel {
  return availMb < hard ? "hard" : availMb < soft ? "soft" : "ok";
}

let cached: MemInfo | null = null;
/** The current memory picture (read at most once a second). */
export function memInfo(now = Date.now()): MemInfo {
  if (cached && now - cached.at < 1000) return cached;
  let avail: number | null = null;
  try {
    avail = parseMemAvailable(readFileSync("/proc/meminfo", "utf8"));
  } catch {
    avail = null;
  }
  const availMb = avail ?? Math.round(freemem() / 1048576);
  const mu = process.memoryUsage();
  cached = {
    availMb,
    rssMb: Math.round(mu.rss / 1048576),
    heapMb: Math.round(mu.heapUsed / 1048576),
    arrayBuffersMb: Math.round(mu.arrayBuffers / 1048576),
    nativeMb: Math.max(0, Math.round((mu.rss - mu.heapTotal - mu.arrayBuffers) / 1048576)),
    level: memLevel(availMb),
    at: now,
  };
  return cached;
}

/** Collect garbage now when the process was started with --expose-gc; true when it ran. */
export function collectGarbage(): boolean {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (typeof gc !== "function") return false;
  try {
    gc();
    return true;
  } catch {
    return false;
  }
}

/** Least time between two forced collections under soft pressure. */
export const MEM_GC_MIN_MS = 30_000;
/**
 * Whether to force a collection now under soft pressure. A forced collection is a full, stop-the-world collection
 * (seconds on a desk's heap): forced every second, back to back, it held the event loop for 2–2.7 s at a time and
 * live exchange calls timed out or reached the exchange with a stale timestamp. At most once per MEM_GC_MIN_MS,
 * and only after the heap (with its array buffers) grew by 256 MB or a quarter since the last one: a collection
 * with nothing new to free only blocks the loop.
 */
export function shouldCollect(
  now: number,
  last: { at: number; mb: number } | null,
  mb: number,
  minMs = MEM_GC_MIN_MS,
): boolean {
  if (!last) return true;
  if (now - last.at < minMs) return false;
  return mb - last.mb >= Math.max(256, last.mb * 0.25);
}

/** This process's collectable memory: the JS heap and the array buffers it holds, MB. */
export function heapAndBuffersMb(): number {
  const mu = process.memoryUsage();
  return Math.round((mu.heapUsed + mu.arrayBuffers) / 1048576);
}

/**
 * Wait before the next compute after one was aborted on memory pressure. Below the lightest level the next compute
 * runs lighter right away; at the lightest level it waits 15 s, doubling per abort in a row up to 10 min (aborting
 * every compute at once, forever, kept a desk busy with no new tapes; the live control keeps running meanwhile).
 */
export function memRetryDelayMs(level: number, abortsInRow: number): number {
  if (level < MEM_FALLBACK_MAX || abortsInRow <= 0) return 0;
  return Math.min(600_000, 15_000 * 2 ** Math.min(6, abortsInRow - 1));
}

/** The fallback ladder: 0 = everything, 1 = micro off, 2 = micro and minimal off. */
export const MEM_FALLBACK_MAX = 2;
/** The protect variants a compute at this fallback level keeps (micro = "mc", minimal = "mn" range tags). */
export function fallbackProtects<P extends { tag?: string | null }>(protects: readonly P[], level: number): P[] {
  if (level <= 0) return [...protects];
  const drop = new Set(level >= 2 ? ["mc", "mn"] : ["mc"]);
  return protects.filter((p) => !p.tag || !drop.has(p.tag));
}
export const fallbackLabel = (level: number) =>
  level <= 0 ? "full" : level === 1 ? "micro off" : "micro and minimal off";

/**
 * After a compute: the next fallback level. Pressure during the compute → one level up (to the max); three clean
 * computes in a row with memory above twice the soft threshold → one level down.
 */
export function nextFallback(
  level: number,
  clean: number,
  pressured: boolean,
  minAvailMb: number,
  soft = memSoftMb(),
): { level: number; clean: number } {
  if (pressured) return { level: Math.min(MEM_FALLBACK_MAX, level + 1), clean: 0 };
  if (level <= 0) return { level: 0, clean: 0 };
  const c = minAvailMb >= 2 * soft ? clean + 1 : 0;
  return c >= 3 ? { level: level - 1, clean: 0 } : { level, clean: c };
}

/**
 * The allocator settings a long-running engine needs on Linux (glibc): without them every worker thread's arena keeps
 * the tape buffers it freed — a desk grew to 11 GB RSS on a 2.6 GB heap. Null when set (or not Linux), else the
 * warning to print at startup.
 */
export function allocatorWarning(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string | null {
  if (platform !== "linux") return null;
  const missing = ["MALLOC_ARENA_MAX", "MALLOC_MMAP_THRESHOLD_"].filter((k) => !env[k]);
  return missing.length
    ? `memory: ${missing.join(" and ")} not set — freed buffers stay in the allocator's arenas and RSS keeps growing (start with MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576)`
    : null;
}
