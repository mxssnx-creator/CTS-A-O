// Memory admission for the eval runners (eval-gate, eval-families, sim-positive-types): a child session starts only
// when the host can give it its expected peak and still leave a reserve for the live desk. Every desk memory-fallback
// step on 13 Oct happened while two eval children ran beside it (each 3.5–6.8 GB); one admitted at a time keeps the
// desk out of its fallback. A child that waited past the timeout runs once nothing else of this runner runs (logged).
//
// The expected peak is the largest high-water mark (VmHWM) of the children finished so far, or the starting estimate.
import { readFileSync } from "node:fs";

/** "MemAvailable:   1234567 kB" → MB (null when the line is missing) */
export function parseMemAvailableMb(meminfo) {
  const m = /^MemAvailable:\s+(\d+)\s*kB/m.exec(meminfo);
  return m ? Math.round(Number(m[1]) / 1024) : null;
}

/** "VmHWM:   1234567 kB" → MB (null when the line is missing) */
export function parseVmHwmMb(status) {
  const m = /^VmHWM:\s+(\d+)\s*kB/m.exec(status);
  return m ? Math.round(Number(m[1]) / 1024) : null;
}

const readOr = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
};

/** the host's available memory, MB, the tighter of MemAvailable and the cgroup's (cgroupAvail: memguard's reading) */
export function availMb(read = readOr, cgroupAvail = () => null) {
  const host = parseMemAvailableMb(read("/proc/meminfo") ?? "");
  const cg = cgroupAvail();
  if (host == null) return cg;
  return cg == null ? host : Math.min(host, cg);
}

/** a child's high-water mark so far (its worker threads included), MB; null when it has exited */
export function childHwmMb(pid, read = readOr) {
  const st = read(`/proc/${pid}/status`);
  return st ? parseVmHwmMb(st) : null;
}

/**
 * Waits until `avail() − reserveMb ≥ needMb` (a number, or a function read at every poll: the need of the children
 * still running counts too). After `timeoutMs` the child is admitted once `running()` is 0 (it then runs alone,
 * whatever the reading). Resolves { waitedMs, alone, availMb }.
 */
export async function admit({
  needMb,
  reserveMb = 3000,
  timeoutMs = 30 * 60_000,
  pollMs = 5_000,
  avail = availMb,
  running = () => 0,
  now = Date.now,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  const t0 = now();
  for (;;) {
    const a = avail();
    const need = typeof needMb === "function" ? needMb() : needMb;
    if (a == null || a - reserveMb >= need) return { waitedMs: now() - t0, alone: false, availMb: a };
    if (now() - t0 >= timeoutMs && running() === 0) return { waitedMs: now() - t0, alone: true, availMb: a };
    await sleep(pollMs);
  }
}

/**
 * The admissions of one runner, one at a time, each child counted as running the moment it is admitted: workers that
 * checked at once each saw the others not yet started and all started on a one-child check (14 Oct: two 7 GB children
 * admitted on 12 GB). `perChildMb` (a number, or a function read at every poll) is one child's expected peak; a child
 * needs it for itself and for every child running. `acquire()` resolves as `admit` does; `release()` when the child ends.
 */
export function admitter({ perChildMb, ...opts }) {
  let running = 0;
  let chain = Promise.resolve();
  const per = () => (typeof perChildMb === "function" ? perChildMb() : perChildMb);
  return {
    get running() {
      return running;
    },
    acquire() {
      const p = chain.then(async () => {
        const r = await admit({ ...opts, needMb: () => per() * (running + 1), running: () => running });
        running++;
        return r;
      });
      chain = p.catch(() => {});
      return p;
    },
    release() {
      if (running > 0) running--;
    },
  };
}

/**
 * Stops a running child when the host's available memory falls under `floorMb` (CTS_EVAL_KILL_BELOW_MB, default
 * 2,800: above the desk's 2,500 MB soft level, so the desk never collects or falls back for an eval). Admission checks
 * before a start; a child that grows past its expected peak was not stopped before (14 Oct: a signals-on 60-symbol
 * child reached 6.5 GB, the desk had 521 MB left and skipped a compute). stop() returns { availMb, at } when it acted.
 */
export function guardChild(child, { floorMb = Number(process.env.CTS_EVAL_KILL_BELOW_MB || 2800), avail = availMb, everyMs = 1000 } = {}) {
  let stopped = null;
  const tick = () => {
    if (stopped) return;
    const a = avail();
    if (a != null && a < floorMb) {
      stopped = { availMb: a, at: Date.now() };
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }
  };
  const iv = setInterval(tick, everyMs);
  iv.unref?.();
  return {
    stop() {
      clearInterval(iv);
      return stopped;
    },
  };
}

/** Polls a child's VmHWM every `everyMs`; stop() returns the largest reading (null when none was read). */
export function watchHwm(pid, everyMs = 1000, read = readOr) {
  let max = null;
  // (a reading of 0: the child is still being exec'd — not a mark)
  const tick = () => {
    const v = childHwmMb(pid, read);
    if (v != null && v > 0) max = Math.max(max ?? 0, v);
  };
  tick();
  const iv = setInterval(tick, everyMs);
  iv.unref?.();
  return {
    stop() {
      tick();
      clearInterval(iv);
      return max;
    },
  };
}
