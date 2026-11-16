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
//   CTS_CORE_MEM_RSS_HARD_MB: optional process RSS ceiling for environments whose container limit is not visible.
//                        CTS_CORE_MEM_RSS_SOFT_MB defaults to 85% of that ceiling when it is set.
import { freemem } from "node:os";
import { readFileSync } from "node:fs";
import { getHeapStatistics } from "node:v8";

export type MemLevel = "ok" | "soft" | "hard";
export interface CgroupMemoryEstimate {
  version: 1 | 2;
  basis: "clean-file-estimate" | "inactive-file";
  /** The limiting cgroup in the process's visible hierarchy. */
  scope: string;
  limitMb: number;
  usedMb: number;
  /** Headroom before cache credit, clamped at zero; an over-limit debt still reduces availMb. */
  rawAvailMb: number;
  cacheCreditMb: number;
  availMb: number;
}
export interface MemInfo {
  /** The tighter host/cgroup available-memory estimate, MB. */
  availMb: number;
  hostAvailMb?: number;
  cgroup?: CgroupMemoryEstimate;
  /** this process, MB (its workers included: they are threads) */
  rssMb: number;
  rssSoftMb?: number;
  rssHardMb?: number;
  heapMb: number;
  heapLimitMb?: number;
  heapAvailMb?: number;
  /** the V8 heap this thread has committed (used + free pages kept), MB */
  heapTotalMb?: number;
  /** typed-array / Buffer memory this thread holds (tapes, candles), MB */
  arrayBuffersMb?: number;
  /** native memory outside the heap and the array buffers (allocator arenas, workers' heaps), MB */
  nativeMb?: number;
  level: MemLevel;
  at: number;
}

export const memSoftMb = () => Number(process.env.CTS_CORE_MEM_SOFT_MB) || 2500;
export const memHardMb = () => Number(process.env.CTS_CORE_MEM_HARD_MB) || 1200;

function rssLimit(name: string): number | undefined {
  const value = process.env[name];
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be a positive number of MiB`);
  return n;
}
export const memRssHardMb = () => rssLimit("CTS_CORE_MEM_RSS_HARD_MB");
export const memRssSoftMb = (hard = memRssHardMb()) =>
  rssLimit("CTS_CORE_MEM_RSS_SOFT_MB") ?? (hard === undefined ? undefined : hard * .85);

/** RSS includes worker threads and native buffers that the main V8 heap limit cannot see. */
export function rssMemLevel(rssMb: number, soft?: number, hard?: number): MemLevel {
  if (!Number.isFinite(rssMb) || rssMb < 0) return "ok";
  return hard !== undefined && rssMb >= hard ? "hard" : soft !== undefined && rssMb >= soft ? "soft" : "ok";
}

/** "MemAvailable:   1234567 kB" → MB; null when the line is missing */
export function parseMemAvailable(meminfo: string): number | null {
  const m = /^MemAvailable:\s+(\d+)\s*kB/m.exec(meminfo);
  return m ? Math.round(Number(m[1]) / 1024) : null;
}

export function memLevel(availMb: number, soft = memSoftMb(), hard = memHardMb()): MemLevel {
  return availMb < hard ? "hard" : availMb < soft ? "soft" : "ok";
}

/** RAM can remain available while V8 reaches its own lower heap ceiling. Preserve room to yield and abort. */
export function heapMemLevel(usedMb: number, limitMb: number): MemLevel {
  if (!(limitMb > 0) || !Number.isFinite(limitMb) || !Number.isFinite(usedMb)) return "ok";
  const free = limitMb - usedMb;
  return free < Math.min(128, limitMb * .04) ? "hard"
    : free < Math.min(512, limitMb * .15) ? "soft" : "ok";
}

/** Cheap between-slice check; avoids filesystem/RSS reads while the heap has ample room. */
export function heapPressure(): MemLevel {
  const heap = getHeapStatistics();
  return heapMemLevel(heap.used_heap_size / 1048576, heap.heap_size_limit / 1048576);
}

/**
 * Available-memory estimate for the tightest visible cgroup ancestor: its limit minus what it uses, with eligible file cache
 * credited. Complete v2 counters exclude mapped, dirty, writeback, shmem and unevictable memory; missing or invalid
 * counters retain the inactive-file estimate. These counters do not prove immediate reclaimability: extra folio
 * references or pins can delay removal even for clean, unmapped files. The host's MemAvailable is not the binding
 * number in a container: x01's cgroup is limited to 14.3 GB on a 16 GB host, so the guard read ~2 GB more than there was and the
 * kernel killed the desk (6 Oct, three times) before the guard ever reached its hard level. cgroup v2 (memory.max /
 * memory.current) and v1 (memory.limit_in_bytes / memory.usage_in_bytes) are both read.
 */
export function cgroupMemoryEstimate(read: (path: string) => string | null = readOr): CgroupMemoryEstimate | null {
  const cg = read("/proc/self/cgroup");
  if (!cg) return null;
  const safeBytes = (txt: string | null): number | null => {
    if (txt == null || !/^\d+$/.test(txt.trim())) return null;
    const n = Number(txt.trim());
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  };
  const safeStat = (txt: string | null, key: string): number | null => {
    const matches = [...(txt ?? "").matchAll(new RegExp(`^${key}[ \\t]+([^\\n]*)$`, "gm"))];
    return matches.length === 1 ? safeBytes(matches[0][1]) : null;
  };
  const v1 = /^\d+:(?:[^:]*,)?memory(?:,[^:]*)?:(.*)$/m.exec(cg);
  const v2 = /^0::(.*)$/m.exec(cg);
  let best: CgroupMemoryEstimate | null = null;
  let bestBytes = Infinity;
  const scan = (version: 1 | 2, root: string, membership: string) => {
    if (!membership.startsWith("/")) return;
    const parts = membership.split("/").filter(Boolean);
    if (parts.some((part) => part === "." || part === "..")) return;
    // A parent accounts for its descendants and siblings. Its remaining budget can be smaller than the child's,
    // even when the child is unlimited, so inspect every visible ancestor, including the controller root.
    for (let depth = parts.length; depth >= 0; depth--) {
      const d = root + (depth ? `/${parts.slice(0, depth).join("/")}` : "");
      const limit = safeBytes(read(`${d}/${version === 1 ? "memory.limit_in_bytes" : "memory.max"}`));
      if (limit === null || limit >= 2 ** 60) continue; // "max" or the v1 unlimited sentinel
      const used = safeBytes(read(`${d}/${version === 1 ? "memory.usage_in_bytes" : "memory.current"}`));
      if (used === null) continue;
      const st = read(`${d}/memory.stat`);
      let credit = version === 1
        ? (safeStat(st, "total_inactive_file") || safeStat(st, "inactive_file") || 0)
        : (safeStat(st, "inactive_file") ?? 0);
      let basis: CgroupMemoryEstimate["basis"] = "inactive-file";
      if (version === 2) {
        const keys = ["file", "shmem", "active_file", "inactive_file", "file_mapped", "file_dirty", "file_writeback", "unevictable"] as const;
        const values = keys.map((key) => safeStat(st, key));
        if (values.every((value) => value !== null)) {
          const [file, shmem, active, inactive, mapped, dirty, writeback, unevictable] = values as number[];
          const regular = Math.max(0, file - shmem);
          // min(regular, active + inactive), without overflowing valid safe integer counters.
          credit = Math.min(regular, inactive);
          credit += Math.min(regular - credit, active);
          for (const excluded of [mapped, dirty, writeback, unevictable]) credit = Math.max(0, credit - excluded);
          basis = "clean-file-estimate";
        }
      }
      credit = Math.min(used, Math.max(0, credit));
      const avail = Math.max(0, limit - (used - credit));
      if (avail >= bestBytes) continue;
      bestBytes = avail;
      best = { version, basis, scope: d, limitMb: Math.round(limit / 1048576), usedMb: Math.round(used / 1048576),
        rawAvailMb: Math.max(0, Math.round((limit - used) / 1048576)), cacheCreditMb: Math.round(credit / 1048576),
        availMb: Math.round(avail / 1048576) };
    }
  };
  if (v1) scan(1, "/sys/fs/cgroup/memory", v1[1]);
  if (v2) scan(2, "/sys/fs/cgroup", v2[1]);
  return best;
}

/** Backward-compatible scalar estimate; memInfo also records its basis and cache credit. */
export function cgroupAvailMb(read: (path: string) => string | null = readOr): number | null {
  return cgroupMemoryEstimate(read)?.availMb ?? null;
}

function readOr(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

let cached: MemInfo | null = null;
/** How long a memory reading is reused (memInfo): a fresh reading is at least this far apart from the last. */
export const MEM_READ_MS = 1000;
/** The current memory picture (read at most once a second). */
export function memInfo(now = Date.now(), force = false): MemInfo {
  if (!force && cached && now - cached.at < MEM_READ_MS) return cached;
  let avail: number | null = null;
  try {
    avail = parseMemAvailable(readFileSync("/proc/meminfo", "utf8"));
  } catch {
    avail = null;
  }
  const host = avail ?? Math.round(freemem() / 1048576);
  // the tighter of the host's and the cgroup's (the cgroup limit is what the kernel kills by in a container)
  const cgroup = cgroupMemoryEstimate();
  const availMb = cgroup == null ? host : Math.min(host, cgroup.availMb);
  const mu = process.memoryUsage();
  const heapLimitMb = getHeapStatistics().heap_size_limit / 1048576;
  const heapLevel = heapMemLevel(mu.heapUsed / 1048576, heapLimitMb);
  const ramLevel = memLevel(availMb);
  const rssHardMb = memRssHardMb(), rssSoftMb = memRssSoftMb(rssHardMb);
  const rssLevel = rssMemLevel(mu.rss / 1048576, rssSoftMb, rssHardMb);
  cached = {
    availMb,
    hostAvailMb: host,
    ...(cgroup ? { cgroup } : {}),
    rssMb: Math.round(mu.rss / 1048576),
    ...(rssSoftMb === undefined ? {} : { rssSoftMb }),
    ...(rssHardMb === undefined ? {} : { rssHardMb }),
    heapMb: Math.round(mu.heapUsed / 1048576),
    heapLimitMb: Math.round(heapLimitMb),
    heapAvailMb: Math.max(0, Math.round(heapLimitMb - mu.heapUsed / 1048576)),
    heapTotalMb: Math.round(mu.heapTotal / 1048576),
    arrayBuffersMb: Math.round(mu.arrayBuffers / 1048576),
    nativeMb: Math.max(0, Math.round((mu.rss - mu.heapTotal - mu.arrayBuffers) / 1048576)),
    level: ramLevel === "hard" || heapLevel === "hard" || rssLevel === "hard" ? "hard"
      : ramLevel === "soft" || heapLevel === "soft" || rssLevel === "soft" ? "soft" : "ok",
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

/**
 * The fallback ladder: 0 = everything rebuilt, 1 = Micro/Low-Range carried, 2 = Minimal carried too. A carried range is
 * not rebuilt in that compute: its tapes from the previous compute go into the new set unchanged (partial
 * processing), so the range keeps computing, validating and trading on its last results instead of being switched
 * off; it is rebuilt again once memory has room (nextFallback).
 */
export const MEM_FALLBACK_MAX = 2;
/** The range tags a compute at this fallback level does not rebuild (carries over). */
export function fallbackCarriedTags(level: number): ReadonlySet<string> {
  return new Set(level <= 0 ? [] : level >= 2 ? ["mc", "mn", "lr"] : ["mc", "lr"]);
}
/** The protect variants a compute at this fallback level rebuilds (the carried ranges' cells are left out). */
export function fallbackProtects<P extends { tag?: string | null }>(protects: readonly P[], level: number): P[] {
  if (level <= 0) return [...protects];
  const drop = fallbackCarriedTags(level);
  return protects.filter((p) => !p.tag || !drop.has(p.tag));
}
export const fallbackLabel = (level: number) =>
  level <= 0 ? "full" : level === 1 ? "micro and Low-Range carried" : "micro, minimal and Low-Range carried";

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
