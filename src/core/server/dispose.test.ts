// A stopped runtime a test (or script) is done with must be collectable: stop() alone leaves the stall watch (started
// in the constructor) and the healer running, and they keep the whole runtime — candles, tapes, sim, pipeline —
// reachable until the process ends (runtime.test.ts built ~28 runtimes and reached 7.3 GB, 13 Oct). dispose()
// releases them; trackRuntimes() (test-support) does stop → close the pool → dispose for every tracked runtime.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as tick } from "node:timers/promises";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { pinSyntheticEnd, trackRuntimes, runtimeFixtureGrid } from "../test-support.ts";

pinSyntheticEnd();

const tiny = {
  symbols: 1,
  historyDays: 4,
  tfDays: { "1": 1, "5": 2, "15": 4, "30": 4 },
  mainTop: 4,
  refineTop: 2,
  evalTop: 2,
  cycleMs: 60_000,
  grid: { ...runtimeFixtureGrid(), short: false as const },
  exitStrategy: { enabled: false },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
};
const gc = (globalThis as { gc?: () => void }).gc;
// (a WeakRef's target survives the job in which deref() was called: each collection runs in a fresh job, and the
// check comes after it)
const collected = async (ref: WeakRef<object>) => {
  for (let i = 0; i < 6; i++) {
    await tick();
    gc?.();
    if (ref.deref() === undefined) return true;
  }
  return false;
};
const until = async (cond: () => boolean, ms = 600_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

// (each runtime is built in a helper whose frame has ended before the check: a suspended async function's registers can
// keep a block's local alive, which would make every check pass or fail for the wrong reason)
const build = (t?: ReturnType<typeof trackRuntimes>) => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), tiny as never, { market: "synthetic" });
  t?.track(rt);
  return new WeakRef(rt);
};
const buildComputed = async (t: ReturnType<typeof trackRuntimes>) => {
  const ref = build(t);
  const rt = ref.deref()!;
  rt.wf.validLastN = 0;
  rt.wf.lastN = 0;
  rt.start();
  await until(() => rt.status.computes >= 1 && (rt.status.paperSteps ?? 0) >= 1);
  return ref;
};

describe("runtime disposal", { skip: gc ? false : "needs --expose-gc (npm run test:core passes it)", timeout: 900_000 }, () => {
  it("a constructed, never started runtime is collectable after dispose", async () => {
    const t = trackRuntimes();
    const ref = build(t);
    await t.disposeAll();
    assert.ok(await collected(ref), "the runtime is still reachable after dispose");
  });

  it("a runtime that computed and stepped paper is collectable after stop → close the pool → dispose", async () => {
    const t = trackRuntimes();
    const ref = await buildComputed(t);
    await t.disposeAll();
    assert.ok(await collected(ref), "the runtime is still reachable after dispose");
  });

  it("stop() alone keeps it reachable (what dispose is for)", async () => {
    const ref = build();
    (ref.deref() as CoreRuntime).stop();
    assert.equal(await collected(ref), false, "the stall watch holds a stopped runtime");
    // (released here so this test does not leak it)
    (ref.deref() as CoreRuntime | undefined)?.dispose();
  });
});
