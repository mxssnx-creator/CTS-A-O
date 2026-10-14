// Memory guard in the runtime: soft pressure never forces a collection every second (each one held the event loop
// for seconds: x01 stalled 2–2.7 s back to back, its exchange calls timed out or reached BingX with a stale
// timestamp); hard pressure never starts a compute at the lightest level (it waits, the live control keeps running)
// and a memory abort never disables the workers (the compute went on in-process on the main thread, for good) —
// another runtime's abort on the shared pool included; a backtest's failed message never disables the engine's.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime as BaseRuntime } from "./runtime.server.ts";
import { trackRuntimes } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { MEM_FALLBACK_MAX } from "./memguard.server.ts";
import { abortWorkers, closePool, runOnWorkers, workersAvailable } from "./pool.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { MICRO_RANGE } from "../minimal-coord.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);

// every runtime a test builds is stopped and released after it (a stopped runtime stayed in memory until the file ended)
const tracked = trackRuntimes();
class CoreRuntime extends BaseRuntime {
  constructor(...a: ConstructorParameters<typeof BaseRuntime>) {
    super(...a);
    tracked.track(this);
  }
}
afterEach(() => tracked.disposeAll());

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

  it("another runtime's memory abort aborts this compute too and never disables its workers", { skip: !workersAvailable() }, async () => {
    // one pool for every runtime (one per connection): runtime A's guard stops runtime B's Base call as well
    const rt = mk() as unknown as Inner;
    const call = runOnWorkers([{ type: "sleep", ms: 5000 }], 1, 60_000);
    await sleep(300);
    abortWorkers("memory pressure: runtime A");
    const err = await call.then(
      () => null,
      (e: unknown) => e,
    );
    assert.ok(err instanceof Error);
    // B's own guard has not ticked yet (its pressure is false)
    assert.equal(rt.memPressured, false);
    assert.throws(() => rt.workersFailed(err, "Base"), /memory pressure: runtime A/);
    assert.equal(rt.workersBroken, false, "B's workers stay on (they were 10 min off, B computing in-process)");
    assert.equal(rt.memPressured, true, "B's compute aborts as a memory abort: its cycle steps the fallback");
    await closePool();
  });

  it("a backtest's failed worker message moves only that phase in-process: the engine keeps its workers", { skip: !workersAvailable() }, async () => {
    const rt = mk() as unknown as Inner & {
      onWorkers(job: { stage: string }, stage: string, fn: (n: number) => Promise<void>): Promise<boolean>;
    };
    const job = { stage: "" };
    const ok = await rt.onWorkers(job, "Base", async () => {
      throw new Error("worker exited (1)");
    });
    assert.equal(ok, false, "the backtest's phase computes in-process");
    assert.equal(job.stage, "Base");
    assert.equal(rt.workersBroken, false, "the engine's computes keep their workers");
  });

  it("one momentary hard reading raises the fallback one level, and the compute runs at that level", async () => {
    await pressure(1e9, 1e9);
    const rt = mk();
    try {
      rt.start();
      await until(() => rt.memFallback >= 1, 60_000);
      // the dip is over (the host's reading is cached for a second: the cycles meanwhile see the same reading)
      delete process.env.CTS_CORE_MEM_SOFT_MB;
      delete process.env.CTS_CORE_MEM_HARD_MB;
      await until(() => rt.status.computes >= 1, 240_000);
      assert.equal(rt.status.mem?.computeLevel, 1, "computed one level lighter, not two");
    } finally {
      rt.stop();
      await pressure(null, null);
    }
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

  it("an abandoned cycle never stops the next cycle's guard nor resets its pressure; each cycle stops its own", async () => {
    // stop / start while a compute waits on the workers: the old compute returns later, and its cycle cleared the
    // new cycle's guard timer (no hard-pressure abort for the rest of that compute) and reset its pressure
    const rt = mk();
    const R = rt as unknown as Inner & {
      memTimer: unknown;
      syncMarket(gen: number): Promise<boolean>;
      compute(gen: number): Promise<void>;
    };
    const computes: Array<() => void> = [];
    R.syncMarket = async () => true;
    R.compute = () => new Promise<void>((r) => computes.push(r));
    try {
      rt.start();
      await until(() => computes.length === 1, 10_000);
      rt.stop();
      rt.start();
      await until(() => computes.length === 2, 10_000);
      // the new cycle's guard saw hard pressure
      R.memPressured = true;
      const level = rt.memFallback;
      computes[0]();
      await sleep(50);
      assert.notEqual(R.memTimer, null, "the new cycle's guard still runs");
      assert.equal(R.memPressured, true, "its pressure is not reset by the old cycle");
      assert.equal(rt.memFallback, level, "the old compute does not step the fallback");
      // stopped with no newer cycle: the cycle still stops its own guard (no timer left ticking)
      rt.stop();
      computes[1]();
      await sleep(50);
      assert.equal(R.memTimer, null);
    } finally {
      rt.stop();
    }
  });

  it("a fresh process under the fallback carries no Micro tapes: Micro passes nothing, a pair keeps its other ranges", async () => {
    await pressure(1, 1);
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      {
        ...small,
        symbols: 1,
        // Micro on (its own indications, which also take Minimal cells); one other indication keeps Base light
        grid: { ...DEFAULT_SETTINGS.grid, micro: MICRO_RANGE },
        focus: ["follow|ema-21-55"],
        pinned: [],
      } as never,
      { market: "synthetic" },
    );
    try {
      // level 1 (Micro carried) from the start, as memStartBlocked leaves it — and no tape of a previous compute
      rt.memFallback = 1;
      rt.start();
      await until(() => rt.status.computes >= 1 && rt.status.state === "running", 600_000);
      rt.stop();
      assert.equal(rt.status.mem?.computeLevel, 1);
      assert.equal(rt.tapes.filter((t) => t.protect.tag === "mc").length, 0, "no Micro tape (none to carry)");
      const tags = Object.entries(rt.basePairTags);
      assert.deepEqual(
        tags.filter(([, ts]) => ts.includes("mc")).map(([k]) => k),
        [],
        "no pair passes Micro in this compute",
      );
      assert.equal(rt.status.baseByRange?.find((r) => r.tag === "mc")?.enabled, false, "the Base status: Micro off");
      // a Micro indication that also passed Minimal keeps that range and its seat
      const kept = tags.filter(([k, ts]) => k.includes("|mc-") && ts.includes("mn")).map(([k]) => k);
      assert.ok(kept.length > 0, "a Micro indication passed Minimal");
      assert.ok(kept.every((k) => rt.wf.basePassed?.has(k)));
    } finally {
      rt.stop();
      await pressure(null, null);
    }
  });
});
