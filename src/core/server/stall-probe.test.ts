// The stall probe names what the main thread did during a stall: running JavaScript, collecting garbage, or asleep in
// a system call (a lock, the disk). Each kind of stall is made here and must be told apart.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { arch } from "node:os";
import { procMainThreadPid, startStallProbe, stallVerdict, type StallProbe } from "./stall-probe.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

const linux = process.platform === "linux";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** one stall made by `block`, with a heartbeat every 10 ms before and after it */
async function probeOf(block: () => void, probeAfterMs = 250): Promise<StallProbe | null> {
  let got: StallProbe | null = null;
  const p = startStallProbe((x) => (got ??= x), { probeAfterMs, everyMs: 25 });
  const iv = setInterval(() => p.beat(), 10);
  try {
    await sleep(400); // (the watchdog thread starts)
    block();
    for (let i = 0; i < 100 && !got; i++) await sleep(20);
    return got;
  } finally {
    clearInterval(iv);
    p.stop();
  }
}

describe("stall probe", { skip: !linux && "Linux /proc only" }, () => {
  it("uses the procfs-visible process identity rather than the caller's PID namespace", () => {
    const outerPid = process.pid + 1_000_000;
    assert.equal(procMainThreadPid((path) => {
      assert.equal(path, "/proc/self");
      return String(outerPid);
    }), outerPid);
    for (const invalid of ["0", "-1", "1/task/2", "self", "9007199254740992"])
      assert.equal(procMainThreadPid(() => invalid), null, invalid);
    assert.equal(procMainThreadPid(() => { throw new Error("procfs unavailable"); }), null);
  });

  it("a busy main thread: running, its CPU ≈ the stall, verdict js", async () => {
    const r = await probeOf(() => {
      const t = Date.now();
      let x = 0;
      while (Date.now() - t < 1200) x += Math.sqrt(x + 1);
      if (x < 0) console.log(x);
    });
    assert.ok(r, "a record");
    assert.ok(r!.ms >= 900, `ms ${r!.ms}`);
    assert.ok((r!.states.R ?? 0) > (r!.states.S ?? 0), JSON.stringify(r!.states));
    assert.ok(r!.mainCpuMs >= 600, `main CPU ${r!.mainCpuMs} ms`);
    assert.equal(r!.verdict, "js");
  });

  it("counts main-thread CPU from the heartbeat, not only after the probe threshold", async () => {
    let consumed = 0;
    const r = await probeOf(() => {
      const start = process.threadCpuUsage(), t = Date.now();
      let x = 0;
      while (Date.now() - t < 1600) x += Math.sqrt(x + 1);
      const used = process.threadCpuUsage(start);
      consumed = (used.user + used.system) / 1000;
      if (x < 0) console.log(x);
    }, 1000);
    assert.ok(r, "a record");
    assert.ok(r!.mainCpuMs >= consumed * .65 - 50,
      `probe measured ${r!.mainCpuMs} ms of ${Math.round(consumed)} ms main-thread CPU`);
  });

  it("a main thread asleep on a lock: sleeping in futex, verdict blocked", async () => {
    const r = await probeOf(() => {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200);
    });
    assert.ok(r, "a record");
    assert.ok((r!.states.S ?? 0) > (r!.states.R ?? 0), JSON.stringify(r!.states));
    // futex: 202 on x86-64, 98 on arm64
    const futex = arch() === "arm64" ? "98" : "202";
    assert.ok((r!.syscalls[futex] ?? 0) > 0, `syscalls ${JSON.stringify(r!.syscalls)}`);
    assert.ok(r!.mainCpuMs < 300, `main CPU ${r!.mainCpuMs} ms`);
    assert.equal(r!.verdict, "blocked");
  });

  it("a forced full collection on a large heap: its GC entry is part of the record", async () => {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (!gc) return assert.fail("needs --expose-gc (npm run test:core passes it)");
    // ~2.5 M small objects: a full collection marks them all
    const keep: Array<{ a: number; b: { c: number } }> = [];
    for (let i = 0; i < 2_500_000; i++) keep.push({ a: i, b: { c: i } });
    let r: StallProbe | null = null;
    for (let attempt = 0; attempt < 3 && !r?.gc.length; attempt++)
      r = await probeOf(() => {
        for (let k = 0; k < 4; k++) gc();
      }, 100);
    assert.ok(keep.length > 0);
    assert.ok(r, "a record");
    assert.ok(r!.gc.length > 0, `gc entries ${JSON.stringify(r!.gc)}`);
    assert.ok(r!.gc.some((g) => g.kind === "major"), `forced full collection labeled major: ${JSON.stringify(r!.gc)}`);
  });

  it("a desk runtime (CTS_CORE_STALL_PROBE=1) keeps the probed stall in its status and, from 1 s, in its events", async () => {
    process.env.CTS_CORE_STALL_PROBE = "1";
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 } as never, { market: "synthetic" });
    try {
      await sleep(500);
      const t = Date.now();
      let x = 0;
      while (Date.now() - t < 1300) x += Math.sqrt(x + 1);
      if (x < 0) console.log(x);
      for (let i = 0; i < 100 && !(rt.status.stallProbes ?? []).length; i++) await sleep(20);
      const p = (rt.status.stallProbes ?? [])[0];
      assert.ok(p, "a probed stall in the status");
      assert.equal(p.verdict, "js");
      assert.ok(typeof p.where === "string");
      const ev = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE msg LIKE 'stall %'");
      assert.ok(ev.some((e) => /: js · main thread R/.test(e.msg)), ev.map((e) => e.msg).join(" | "));
    } finally {
      delete process.env.CTS_CORE_STALL_PROBE;
      rt.dispose();
    }
    // without the variable no probe runs (tests and sessions)
    const rt2 = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 } as never, { market: "synthetic" });
    try {
      assert.equal((rt2 as unknown as { stallProbe: unknown }).stallProbe, null);
    } finally {
      rt2.dispose();
    }
  });

  it("the verdict rule", () => {
    assert.equal(stallVerdict({ ms: 1000, states: { R: 18, S: 2 }, mainCpuMs: 950, gc: [{ kind: "major", ms: 800 }] }), "gc");
    assert.equal(stallVerdict({ ms: 1000, states: { R: 18, S: 2 }, mainCpuMs: 950, gc: [] }), "js");
    assert.equal(stallVerdict({ ms: 1185, states: { R: 4 }, mainCpuMs: 150, gc: [] }), "unknown",
      "runnable samples alone do not show that the main thread consumed the stall");
    assert.equal(stallVerdict({ ms: 1000, states: { S: 19, R: 1 }, mainCpuMs: 10, gc: [] }), "blocked");
    assert.equal(stallVerdict({ ms: 1000, states: { D: 15, R: 5 }, mainCpuMs: 10, gc: [] }), "blocked");
    assert.equal(stallVerdict({ ms: 1000, states: {}, mainCpuMs: 0, gc: [] }), "unknown");
  });
});
