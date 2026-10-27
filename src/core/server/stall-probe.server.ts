// What the main thread does during a stall (14 Oct: four 3–10 s stalls in one desk hour that no timed phase explained —
// not the bar append, the report, the snapshot, the memory guard or a whole-VM pause). A watchdog thread reads a
// heartbeat the main thread writes every 50 ms into shared memory. When the heartbeat is older than `probeAfterMs`, the
// watchdog samples the main thread from /proc every `everyMs` — its state, system call, wait channel and CPU time — and
// the CPU time of the process's other threads (V8's GC helpers, libuv, the compute workers); when the main thread
// answers again it posts the record. The main thread adds its garbage collections of the stall (PerformanceObserver).
//
//   verdict "gc"      the main thread ran, and its GC entries cover most of the stall
//   verdict "js"      the main thread ran (state R, CPU ≈ the stall): JavaScript or native code on the main thread
//   verdict "blocked" the main thread slept (state S / D): its system call names what it waited on (202 futex: a lock;
//                     0 / 1 read / write, 74 fsync, 82 rename: the disk)
//
// Linux only (/proc); elsewhere, or when the worker cannot start, nothing is recorded.
import { Worker } from "node:worker_threads";
import { constants, PerformanceObserver } from "node:perf_hooks";
import { readlinkSync } from "node:fs";

export type StallProbe = {
  /** epoch ms of the last heartbeat before the stall */
  startedAt: number;
  ms: number;
  samples: number;
  /** main-thread state per sample (R running, S sleeping, D disk wait, …) */
  states: Record<string, number>;
  /** main-thread system call per sample ("running" while it ran user code) */
  syscalls: Record<string, number>;
  wchans: Record<string, number>;
  /** Approximate main-thread CPU since the first sample after the last heartbeat, ms; a late sample can undercount. */
  mainCpuMs: number;
  /** Other threads' CPU after the probe threshold, ms, by thread name (not the entire stall). */
  threadsCpuMs: Record<string, number>;
  /** steal ticks of the host over the stall (a hypervisor taking the CPU) */
  stealTicks: number;
  /** the main thread's garbage collections that overlap the stall */
  gc: Array<{ kind: string; ms: number }>;
  verdict: "gc" | "js" | "blocked" | "unknown";
};

// the watchdog (run in its own thread; plain JS: it reads only /proc and the heartbeat)
const WATCHDOG = `
const { parentPort, workerData } = require("node:worker_threads");
const fs = require("node:fs");
const hb = new BigInt64Array(workerData.sab);
const { pid, probeAfterMs, everyMs, tick } = workerData;
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const statOf = (txt) => {
  if (!txt) return null;
  const r = txt.slice(txt.lastIndexOf(")") + 2).split(" ");
  return { state: r[0], cpu: (Number(r[11]) + Number(r[12])) * tick };
};
const threads = () => {
  const out = {};
  let ids = [];
  try { ids = fs.readdirSync("/proc/" + pid + "/task"); } catch { return out; }
  for (const id of ids) {
    if (Number(id) === pid) continue;
    const st = statOf(read("/proc/" + pid + "/task/" + id + "/stat"));
    if (!st) continue;
    const name = (read("/proc/" + pid + "/task/" + id + "/comm") || "?").trim();
    out[id] = { name, cpu: st.cpu };
  }
  return out;
};
const steal = () => { const l = (read("/proc/stat") || "").split("\\n")[0].trim().split(/\\s+/); return Number(l[8]) || 0; };
let cur = null, heartbeat = 0, heartbeatCpu = null;
setInterval(() => {
  const last = Number(Atomics.load(hb, 0));
  if (!last) return;
  const main = statOf(read("/proc/" + pid + "/task/" + pid + "/stat"));
  if (!main || !Number.isFinite(main.cpu)) return;
  // Save a CPU baseline near every heartbeat, before waiting for probeAfterMs. Taking cpu0 only when
  // the threshold is reached loses the first part of every stall and can misidentify a runnable thread.
  if (last !== heartbeat && !cur) { heartbeat = last; heartbeatCpu = main.cpu; }
  const late = Date.now() - last;
  if (late >= probeAfterMs) {
    if (!cur) cur = { startedAt: last, samples: 0, states: {}, syscalls: {}, wchans: {}, cpu0: heartbeatCpu ?? main.cpu, th0: threads(), steal0: steal() };
    cur.samples++;
    cur.states[main.state] = (cur.states[main.state] || 0) + 1;
    const sc = (read("/proc/" + pid + "/task/" + pid + "/syscall") || "?").trim().split(" ")[0];
    cur.syscalls[sc] = (cur.syscalls[sc] || 0) + 1;
    const wc = (read("/proc/" + pid + "/task/" + pid + "/wchan") || "?").trim() || "0";
    cur.wchans[wc] = (cur.wchans[wc] || 0) + 1;
    cur.cpu1 = main.cpu;
  } else if (cur) {
    const th1 = threads();
    const by = {};
    for (const [id, t] of Object.entries(th1)) {
      const d = t.cpu - (cur.th0[id] ? cur.th0[id].cpu : t.cpu);
      if (d > 0) by[t.name] = (by[t.name] || 0) + d;
    }
    parentPort.postMessage({
      startedAt: cur.startedAt, ms: last - cur.startedAt, samples: cur.samples, states: cur.states, syscalls: cur.syscalls,
      wchans: cur.wchans, mainCpuMs: (cur.cpu1 ?? cur.cpu0) - cur.cpu0, threadsCpuMs: by, stealTicks: steal() - cur.steal0,
    });
    cur = null;
    heartbeat = last;
    heartbeatCpu = main.cpu;
  }
}, everyMs);
`;

/** the verdict from the samples (exported for the tests) */
export function stallVerdict(p: Pick<StallProbe, "ms" | "states" | "mainCpuMs" | "gc">): StallProbe["verdict"] {
  const n = Object.values(p.states).reduce((a, x) => a + x, 0);
  if (!n || !Number.isFinite(p.ms) || p.ms <= 0) return "unknown";
  const running = (p.states.R ?? 0) / n;
  const gcMs = p.gc.reduce((a, x) => a + x.ms, 0);
  if (running >= 0.5 && gcMs >= 0.5 * p.ms) return "gc";
  // R means runnable, not necessarily scheduled. Missing or low CPU evidence stays unknown.
  if (running >= 0.5 && Number.isFinite(p.mainCpuMs) && p.mainCpuMs >= 0.5 * p.ms) return "js";
  if (((p.states.S ?? 0) + (p.states.D ?? 0)) / n >= 0.5) return "blocked";
  return "unknown";
}

const GC_KIND: Record<number, string> = {
  [constants.NODE_PERFORMANCE_GC_MINOR]: "minor",
  [constants.NODE_PERFORMANCE_GC_MAJOR]: "major",
  [constants.NODE_PERFORMANCE_GC_INCREMENTAL]: "incremental",
  [constants.NODE_PERFORMANCE_GC_WEAKCB]: "weakcb",
};

/** Resolve the main thread in this procfs mount's PID namespace, which may differ from process.pid. */
export function procMainThreadPid(readSelf: (path: string) => string = (path) => readlinkSync(path)): number | null {
  try {
    const self = readSelf("/proc/self");
    if (!/^[1-9]\d*$/.test(self)) return null;
    const pid = Number(self);
    return Number.isSafeInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

/**
 * Starts the watchdog. Call beat() from a frequent main-thread timer (the heartbeat); onStall receives a record per stall
 * of at least probeAfterMs. stop() ends the watchdog and the GC observer.
 */
export function startStallProbe(
  onStall: (p: StallProbe) => void,
  { probeAfterMs = 1000, everyMs = 50 }: { probeAfterMs?: number; everyMs?: number } = {},
): { beat(): void; stop(): void } {
  const none = { beat() {}, stop() {} };
  if (process.platform !== "linux") return none;
  // /proc can expose an outer namespace. Using process.pid there can sample an
  // unrelated process (or no process) instead of this Node process's main thread.
  const pid = procMainThreadPid();
  if (pid === null) return none;
  const sab = new SharedArrayBuffer(8);
  const hb = new BigInt64Array(sab);
  // the main thread's collections of the last minute (epoch start, duration)
  const gcs: Array<{ at: number; ms: number; kind: string }> = [];
  let obs: PerformanceObserver | null = null;
  try {
    obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration < 20) continue;
        const kind = GC_KIND[(e as unknown as { detail?: { kind?: number } }).detail?.kind ?? 0] ?? "gc";
        gcs.push({ at: performance.timeOrigin + e.startTime, ms: e.duration, kind });
      }
      const cut = Date.now() - 60_000;
      while (gcs.length && gcs[0].at < cut) gcs.shift();
    });
    obs.observe({ entryTypes: ["gc"] });
  } catch {
    obs = null;
  }
  let w: Worker;
  try {
    w = new Worker(WATCHDOG, {
      eval: true,
      workerData: { sab, pid, probeAfterMs, everyMs, tick: 10 },
      // (a few MB: it only reads /proc)
      resourceLimits: { maxOldGenerationSizeMb: 32, maxYoungGenerationSizeMb: 8 },
    });
  } catch {
    obs?.disconnect();
    return none;
  }
  w.unref();
  w.on("error", () => undefined);
  w.on("message", (m: Omit<StallProbe, "gc" | "verdict">) => {
    const end = m.startedAt + m.ms;
    const gc = gcs.filter((g) => g.at < end && g.at + g.ms > m.startedAt).map((g) => ({ kind: g.kind, ms: Math.round(g.ms) }));
    const rec: StallProbe = { ...m, mainCpuMs: Math.round(m.mainCpuMs), gc, verdict: "unknown" };
    rec.verdict = stallVerdict(rec);
    onStall(rec);
  });
  return {
    beat() {
      Atomics.store(hb, 0, BigInt(Date.now()));
    },
    stop() {
      obs?.disconnect();
      void w.terminate();
    },
  };
}
