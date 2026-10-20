import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as yieldNow } from "node:timers/promises";
import { CoreRuntime, researchIntervalMs } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

type Hooks = {
  startTick(): void;
  stopTick(): void;
  tick(): Promise<void>;
  syncMarket(gen: number): Promise<boolean>;
  schedule(ms: number): void;
  paperIdle(ms?: number): Promise<void>;
  claimPaper(): symbol;
  releasePaper(owner: symbol): void;
  comparing: Promise<void> | null;
  waitCompare(ms?: number): Promise<void>;
  gen: number;
  busy: boolean;
  dirty: boolean;
  paperStepped: boolean;
  paperRunning: boolean;
  paperOwner: symbol | null;
};
const runtimes: CoreRuntime[] = [];
function fixture() {
  const runtime = new CoreRuntime(
    new CoreDb(":memory:"),
    { tickMs: 100, cycleMs: 250 },
    { market: "synthetic", priceStream: null },
  );
  runtimes.push(runtime);
  return { runtime, hooks: runtime as unknown as Hooks };
}
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
});

describe("completion-paced engine intervals", () => {
  it("waits for a tick, and an old completion cannot re-arm a restarted ticker", async (t) => {
    const { hooks } = fixture();
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const completions: Array<() => void> = [];
    hooks.tick = () => new Promise<void>((resolve) => completions.push(resolve));
    hooks.startTick();
    t.mock.timers.tick(100);
    assert.equal(completions.length, 1);
    t.mock.timers.tick(10_000);
    assert.equal(completions.length, 1, "no interval starts before completion");
    hooks.stopTick();
    hooks.startTick();
    completions[0]();
    await yieldNow();
    t.mock.timers.tick(100);
    assert.equal(completions.length, 2, "only the current timer fires after restart");
    t.mock.timers.tick(1_000);
    assert.equal(completions.length, 2);
    completions[1]();
    await yieldNow();
    t.mock.timers.tick(99);
    assert.equal(completions.length, 2);
    t.mock.timers.tick(1);
    assert.equal(completions.length, 3);
    hooks.stopTick();
    completions[2]();
    await yieldNow();
  });

  it("never overlaps cycles and recovers from a failed feed with a bounded retry", async () => {
    const { runtime, hooks } = fixture();
    const scheduled: number[] = [];
    hooks.schedule = (ms) => {
      scheduled.push(ms);
    };
    hooks.dirty = false;
    hooks.paperStepped = true;
    let finish!: (value: boolean) => void;
    let calls = 0;
    hooks.syncMarket = () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    };
    const first = runtime.cycle();
    await runtime.cycle();
    assert.equal(calls, 1);
    assert.equal(scheduled.length, 0);
    finish(false);
    await first;
    assert.equal(hooks.busy, false);
    assert.equal(scheduled.length, 1);
    hooks.syncMarket = async () => {
      throw new Error("bounded transport failure");
    };
    await runtime.cycle();
    assert.equal(hooks.busy, false);
    assert.equal(scheduled.at(-1), 5_000);
    hooks.syncMarket = async () => false;
    hooks.dirty = false;
    await runtime.cycle();
    assert.equal(runtime.status.error, null);
    assert.equal(runtime.status.errorsInRow, 0);
    assert.ok(scheduled.at(-1)! <= 250);
  });

  it("releases a rejected comparison and times out a stalled owner without blocking later cycles", async () => {
    const { runtime, hooks } = fixture();
    const scheduled: number[] = [];
    hooks.schedule = (ms) => {
      scheduled.push(ms);
    };
    hooks.syncMarket = async () => false;
    hooks.comparing = Promise.reject(new Error("comparison transport failed"));
    await runtime.cycle();
    assert.equal(hooks.busy, false);
    assert.equal(hooks.comparing, null);
    assert.match(runtime.status.error ?? "", /comparison transport failed/);
    assert.equal(scheduled.at(-1), 5_000);
    hooks.comparing = new Promise(() => {});
    await assert.rejects(hooks.waitCompare(20), /timeout/);
    assert.equal(hooks.comparing, null);
    hooks.syncMarket = async () => false;
    hooks.dirty = false;
    hooks.paperStepped = true;
    await runtime.cycle();
    assert.equal(hooks.busy, false);
    assert.equal(runtime.status.error, null);
  });

  it("continues foreground updates while background Compare is still running", async () => {
    const { runtime, hooks } = fixture();
    let updates = 0;
    Object.assign(hooks, {
      market: "bingx",
      fastArgs: {},
      nextResearchAt: Date.now() + 300_000,
      fastStep: async () => {
        updates++;
      },
    });
    hooks.comparing = new Promise(() => {});
    hooks.dirty = false;
    hooks.paperStepped = true;
    hooks.syncMarket = async () => true;
    hooks.schedule = () => {};
    await runtime.cycle();
    assert.equal(updates, 1);
    assert.equal(runtime.status.cycleKind, "incremental");
    assert.equal(hooks.busy, false);
    assert.notEqual(hooks.comparing, null, "the comparison was neither awaited nor canceled");
  });

  it("retires a stalled paper owner and protects the replacement from the old finally block", async () => {
    const { hooks } = fixture();
    const scheduled: number[] = [];
    hooks.schedule = (ms) => {
      scheduled.push(ms);
    };
    const old = hooks.claimPaper(),
      gen = hooks.gen;
    await assert.rejects(hooks.paperIdle(20), /generation retired/);
    assert.equal(hooks.gen, gen + 1);
    assert.equal(hooks.busy, false);
    assert.equal(hooks.paperRunning, false);
    assert.equal(scheduled.at(-1), 0);
    const fresh = hooks.claimPaper();
    hooks.releasePaper(old);
    assert.equal(hooks.paperRunning, true);
    hooks.releasePaper(fresh);
    assert.equal(hooks.paperRunning, false);
  });

  it("bounds the background cadence without changing configured history or validation", () => {
    assert.equal(researchIntervalMs(""), 300_000);
    assert.equal(researchIntervalMs("60000"), 60_000);
    assert.equal(researchIntervalMs("3600000"), 3_600_000);
    for (const raw of ["nan", "-1", "0", "500", "3600001"])
      assert.equal(researchIntervalMs(raw), 300_000);
  });
});
