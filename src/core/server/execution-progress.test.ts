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
    assert.equal(rt.executionEntryBlocked(), true, "starting a compute does not admit the old paper book");
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
