import assert from "node:assert/strict";
import { it } from "node:test";
import { ExecutionProgress, type ProgressClock } from "./execution-progress.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { fakeRt, rng, SimExchange } from "../test-support.ts";
import { resetLiveBackoff, stepLive } from "./live.server.ts";

const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
class Clock implements ProgressClock {
  t = 0;
  callback: (() => void) | null = null;
  deadline = 0;
  now = () => this.t;
  set(callback: () => void, delay: number) {
    this.callback = callback;
    this.deadline = this.t + delay;
    return callback;
  }
  clear(handle: unknown) {
    if (this.callback === handle) this.callback = null;
  }
  async fire(at = this.deadline) {
    this.t = at;
    const callback = this.callback;
    this.callback = null;
    callback?.();
    await settle();
  }
}

it("execution follows 100ms deadlines, coalesces lag, survives errors and cancels on stop", async () => {
  const clock = new Clock();
  let n = 0;
  const loop = new ExecutionProgress(
    () => {
      n++;
      clock.t += 35;
      if (n === 2) throw new Error("transient");
    },
    100,
    clock,
  );
  loop.start();
  loop.start();
  await clock.fire();
  assert.equal(n, 1);
  assert.equal(clock.deadline, 200, "task duration does not shift the deadline to 235");
  await clock.fire(540);
  assert.equal(n, 2);
  assert.equal(clock.deadline, 600, "missed checks coalesce instead of bursting");
  assert.equal(loop.stats.maxLagMs, 340);
  assert.equal(loop.stats.missed, 3);
  assert.equal(loop.stats.error, "transient");
  await clock.fire();
  assert.equal(loop.stats.error, null);
  loop.stop();
  await clock.fire(900);
  assert.equal(n, 3);
});

it("execution never overlaps a delayed step or resurrects a stopped timer", async () => {
  const clock = new Clock();
  let release!: () => void;
  const loop = new ExecutionProgress(
    () =>
      new Promise<void>((r) => {
        release = r;
      }),
    100,
    clock,
  );
  loop.start();
  await clock.fire();
  assert.equal(clock.callback, null, "no timer while the same task is in flight");
  clock.t = 450;
  release();
  await settle();
  assert.equal(clock.deadline, 500);
  await clock.fire();
  loop.stop();
  release();
  await settle();
  assert.equal(clock.callback, null, "a late result cannot restart a stopped timer");
});

it("native progress runs independently of a slow paper tick and changed settings", async () => {
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    {
      tickMs: 60_000,
      live: { enabled: true, mode: "overall" },
      signals: { enabled: false },
    },
    { market: "synthetic" },
  );
  const self = rt as unknown as {
    startTick(): void;
    settingsStale: boolean;
    executionPending: boolean;
    pendingEntries(): never;
  };
  let n = 0,
    active = 0,
    maxActive = 0;
  const times: number[] = [];
  rt.liveOrdersActive = true;
  self.settingsStale = true;
  self.pendingEntries = () => {
    throw new Error("expensive diagnostics ran on the execution timer");
  };
  rt.onLive = async (_r, intents) => {
    assert.deepEqual(intents, []);
    n++;
    times.push(performance.now());
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 135));
    active--;
  };
  try {
    self.startTick();
    const start = Date.now();
    while (n < 4 && Date.now() - start < 5000) await new Promise((r) => setTimeout(r, 20));
    assert.ok(n >= 4, `${n} execution checks while no paper tick can run`);
    assert.equal(maxActive, 1, "slow native calls never overlap");
    assert.equal(rt.status.tick?.count ?? 0, 0);
    assert.equal(rt.status.executionProgress?.intervalMs, 100);
    assert.equal(rt.executionEntryBlocked(), true);
    self.settingsStale = false;
    self.executionPending = true;
    assert.equal(
      rt.executionEntryBlocked(),
      true,
      "starting a compute does not admit the old paper book",
    );
    console.log(
      JSON.stringify({
        executionIntervalMs: 100,
        observedStarts: n,
        gapsMs: times.slice(1).map((t, i) => t - times[i]),
        stats: rt.status.executionProgress,
      }),
    );
    rt.stop();
    await rt.liveSettled(2000);
    const stopped = n;
    await new Promise((r) => setTimeout(r, 220));
    assert.equal(n, stopped);
  } finally {
    rt.dispose();
  }
});

it("settings awaiting computation block native entries but retain stops, closes and reductions", async () => {
  process.env.CTS_CORE_LIVE = "1";
  resetLiveBackoff();
  const { rt } = fakeRt(new CoreDb(":memory:"));
  const runtime = rt as unknown as CoreRuntime;
  const ex = new SimExchange(rng(4));
  rt.paper.positions = [
    { cfg: "a", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 1 },
    { cfg: "b", sym: "S3-USDT", side: 1, entry: 31, stop: 30, vol: 1 },
  ];
  await stepLive(runtime, [], 1, ex);
  assert.ok(ex.positions.has("S2-USDT|LONG") && ex.positions.has("S3-USDT|LONG"));
  runtime.executionEntryBlocked = () => true;
  rt.paper.positions = [
    { cfg: "a", sym: "S2-USDT", side: 1, entry: 24, stop: 23, vol: 0.5 },
    { cfg: "c", sym: "S4-USDT", side: 1, entry: 38, stop: 37, vol: 1 },
  ];
  ex.orders = ex.orders.filter((o) => o.venueSymbol !== "S2-USDT");
  const before = ex.positions.get("S2-USDT|LONG")!;
  const st = await stepLive(runtime, [], 1, ex);
  assert.match(st.reason, /settings awaiting computation/);
  assert.equal(ex.positions.has("S3-USDT|LONG"), false);
  assert.equal(ex.positions.has("S4-USDT|LONG"), false);
  assert.ok(ex.positions.get("S2-USDT|LONG")! < before, "confirmed reduction still executes");
  assert.ok(
    ex.orders.some((o) => o.venueSymbol === "S2-USDT" && o.clientOrderId?.startsWith("CTSBV2_")),
    "missing stop repaired",
  );
});

it("stop and restart cannot overlap an old pending task or publish its stale error", async () => {
  const clock = new Clock();
  let release!: () => void,
    calls = 0,
    active = 0,
    maxActive = 0;
  const loop = new ExecutionProgress(
    async () => {
      calls++;
      active++;
      maxActive = Math.max(maxActive, active);
      if (calls === 1)
        await new Promise<void>((r) => {
          release = r;
        });
      active--;
    },
    100,
    clock,
  );
  loop.start();
  await clock.fire();
  loop.stop();
  loop.start();
  await clock.fire();
  assert.equal(calls, 1, "restart waits for the old task rather than overlapping it");
  release();
  await settle();
  await settle();
  assert.equal(calls, 2);
  assert.equal(maxActive, 1);
  loop.stop();
});

it("stop before the detached live callback runs cannot grant it the restart generation", async () => {
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    {
      live: { enabled: true, mode: "overall" },
      signals: { enabled: false },
    },
    { market: "synthetic" },
  );
  let calls = 0;
  rt.liveOrdersActive = true;
  rt.onLive = async () => {
    calls++;
  };
  try {
    (rt as unknown as { progressLive(): void }).progressLive();
    rt.stop();
    await settle();
    assert.equal(calls, 0, "no queued callback starts after stop with a newer generation");
    assert.equal(await rt.liveSettled(1000), true);
  } finally {
    rt.dispose();
  }
});

it("completed current books dispatch immediately and coalesce while exchange work is pending", async () => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), { live: { enabled: true, mode: "overall" }, signals: { enabled: false } }, { market: "synthetic" });
  const self = rt as unknown as { gen: number; dirty: boolean; settingsStale: boolean; resetUniverse: boolean; executionPending: boolean; paperRunning: boolean; stopped: boolean; releaseExecutionBook(gen: number): boolean };
  Object.assign(self, { dirty: false, settingsStale: false, resetUniverse: false, executionPending: true, stopped: false });
  let active = 0, peak = 0, calls = 0, release!: () => void;
  const seen: unknown[] = [];
  rt.onLive = async () => {
    calls++; active++; peak = Math.max(peak, active); seen.push(rt.paper.positions);
    if (calls === 1) await new Promise<void>(r => { release = r; });
    active--;
  };
  try {
    assert.equal(self.releaseExecutionBook(self.gen), true);
    await settle();
    assert.equal(calls, 1, "no polling timer needs to fire");
    assert.equal(rt.executionEntryBlocked(), false);
    rt.paper = { ...rt.paper, positions: [] };
    self.releaseExecutionBook(self.gen);
    rt.paper = { ...rt.paper, positions: [] };
    const newest = rt.paper.positions;
    self.releaseExecutionBook(self.gen);
    assert.equal(calls, 1);
    release(); await settle(); await settle();
    assert.equal(calls, 2, "one immediate follow-up, not one queued task per book");
    assert.equal(seen[1], newest);
    assert.equal(peak, 1);
    for (const field of ["dirty", "settingsStale", "resetUniverse", "paperRunning", "stopped"] as const) {
      self.executionPending = true; self[field] = true;
      assert.equal(self.releaseExecutionBook(self.gen), false, field);
      assert.equal(rt.executionEntryBlocked(), true);
      self[field] = false;
    }
    assert.equal(self.releaseExecutionBook(self.gen - 1), false);
    await settle(); assert.equal(calls, 2);
  } finally { rt.dispose(); rt.db.db.close(); }
});

it("cycle releases a persisted qualified book before a slow diagnostic audit", async () => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), { live: { enabled: true, mode: "overall" }, signals: { enabled: false } }, { market: "synthetic" });
  // Delayed diagnostics are controlled here; the production cycle and dispatch path remain real.
  const self = rt as unknown as Record<string, any>;
  Object.assign(self, { stopped: false, dirty: true, settingsStale: true, executionPending: true, resetUniverse: false });
  self.syncMarket = async () => false;
  self.compute = async () => { self.dirty = false; self.settingsStale = false; };
  self.stepPaperGen = function* () { yield 0; rt.db.kvSet("ready-fixture", true); };
  self.runAdjust = () => undefined;
  self.incCapture = async () => undefined;
  self.buildListings = () => undefined;
  self.schedule = () => undefined;
  let called = false, audit = false;
  rt.onLive = async () => { assert.equal(rt.db.kvGet("ready-fixture"), true); called = true; };
  self.runAuditAsync = async () => {
    audit = true;
    await settle();
    assert.equal(called, true, "ready admission must not wait for audit completion");
    assert.equal(rt.executionEntryBlocked(), false);
  };
  try { await rt.cycle(); assert.equal(audit, true); assert.equal(rt.status.error, null); }
  finally { rt.dispose(); rt.db.db.close(); }
});
