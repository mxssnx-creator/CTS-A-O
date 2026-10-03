// Memory guard in the runtime: soft pressure never forces a collection every second (each one held the event loop
// for seconds: x01 stalled 2–2.7 s back to back, its exchange calls timed out or reached BingX with a stale
// timestamp); hard pressure never starts a compute at the lightest level (it waits, the live control keeps running)
// and a memory abort never disables the workers (the compute went on in-process on the main thread, for good).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { MEM_FALLBACK_MAX } from "./memguard.server.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);

const small = {
  symbols: 3,
  historyDays: 6,
  tfDays: { "1": 2, "5": 3, "15": 6, "30": 6 },
  mainTop: 8,
  refineTop: 3,
  evalTop: 4,
  cycleMs: 60_000,
  grid: { short: false as const },
  tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
};
const mk = () => new CoreRuntime(new CoreDb(":memory:"), small, { market: "synthetic" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (cond: () => boolean, ms = 120_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await sleep(20);
  }
};
/** memory levels from the thresholds (the host's reading is cached for a second) */
async function pressure(soft: number | null, hard: number | null) {
  if (soft === null) delete process.env.CTS_CORE_MEM_SOFT_MB;
  else process.env.CTS_CORE_MEM_SOFT_MB = String(soft);
  if (hard === null) delete process.env.CTS_CORE_MEM_HARD_MB;
  else process.env.CTS_CORE_MEM_HARD_MB = String(hard);
  await sleep(1100);
}
type Inner = {
  memPressured: boolean;
  memRetryAt: number;
  workersBroken: boolean;
  workersBrokenAt: number;
  workersFailed(err: unknown, what: string): void;
  workersRetry(): void;
};

describe("memory guard in the runtime", { timeout: 300_000 }, () => {
  it("soft pressure collects at most once per 30 s (not on every one-second tick)", async () => {
    const g = globalThis as { gc?: () => void };
    const prev = g.gc;
    let calls = 0;
    g.gc = () => {
      calls++;
    };
    try {
      await pressure(1e9, 1);
      const rt = mk();
      for (let i = 0; i < 10; i++) rt.memGuardTick();
      assert.equal(rt.status.mem?.level, "soft");
      assert.equal(calls, 1, "one collection, not ten");
    } finally {
      g.gc = prev;
      await pressure(null, null);
    }
  });

  it("a memory abort stops the compute and never disables the workers; other failures retry them after 10 min", () => {
    const rt = mk() as unknown as Inner;
    rt.memPressured = true;
    assert.throws(() => rt.workersFailed(new Error("memory pressure: test"), "Base"), /memory pressure: test/);
    assert.equal(rt.workersBroken, false, "a memory abort is not a broken worker");
    rt.memPressured = false;
    rt.workersFailed(new Error("worker exited"), "Base");
    assert.equal(rt.workersBroken, true, "a real failure: in-process for now");
    rt.workersRetry();
    assert.equal(rt.workersBroken, true, "not tried again at once");
    rt.workersBrokenAt = Date.now() - 11 * 60_000;
    rt.workersRetry();
    assert.equal(rt.workersBroken, false, "tried again after 10 minutes");
  });

  it("hard pressure: no compute starts — lighter levels first, then it waits (no busy loop) and runs once memory has room", async () => {
    await pressure(1e9, 1e9);
    const rt = mk();
    try {
      rt.start();
      await until(() => (rt.status.mem?.retryAt ?? 0) > 0, 60_000);
      assert.equal(rt.memFallback, MEM_FALLBACK_MAX, "stepped to the lightest level");
      assert.equal(rt.status.computes, 0, "no compute started into the pressure");
      assert.equal(rt.status.mem?.aborts, 0, "nothing had to be aborted");
      assert.equal(rt.status.mem?.abortsInRow, 1);
      const c0 = rt.status.cycles;
      await sleep(1500);
      assert.equal(rt.status.computes, 0, "nothing computed while it waits");
      assert.ok(rt.status.cycles - c0 < 10, `no busy loop (${rt.status.cycles - c0} cycles in 1.5 s)`);
      // memory has room again and the wait is over: the compute runs, at the lightest level
      await pressure(null, null);
      (rt as unknown as Inner).memRetryAt = 0;
      rt.kick();
      await until(() => rt.status.computes >= 1, 240_000);
      assert.equal(rt.status.mem?.abortsInRow, 0);
      assert.equal(rt.status.mem?.computeLevel, MEM_FALLBACK_MAX);
    } finally {
      rt.stop();
      await pressure(null, null);
    }
  });
});
