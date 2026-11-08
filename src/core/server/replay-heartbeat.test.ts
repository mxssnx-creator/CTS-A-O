import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

type Inner = {
  gen: number; stopped: boolean; busy: boolean; schedule(ms: number): void;
  drive<T, R>(name: string, work: Generator<T, R>, step: (v: T) => void, generation?: number): Promise<R>;
};

test("working helper slices keep the current replay alive without inventing hour progress", async (t) => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 }, { market: "synthetic" });
  t.after(() => rt.dispose());
  rt.stop();
  const inner = rt as unknown as Inner;
  inner.stopped = false; inner.busy = true;
  rt.status.state = "computing";
  rt.status.progress = 0;
  const generation = inner.gen;
  let now = Date.now(), restarts = 0, slices = 0;
  t.mock.method(Date, "now", () => now);
  inner.schedule = () => { restarts++; };
  const work = function* () {
    now += 181_000; yield -14;
    now += 181_000; yield -17;
    return 42;
  };
  const value = await inner.drive("Simulation", work(), () => {
    slices++;
    assert.equal(rt.status.heartbeat, now);
    rt.ensureAlive();
  }, generation);
  assert.equal(value, 42);
  assert.equal(slices, 2);
  assert.equal(inner.gen, generation);
  assert.equal(restarts, 0);
  assert.equal(rt.status.progress, 0, "liveness does not claim an hour has finished");
});

test("an obsolete generator cannot refresh the replacement's heartbeat or publish its result", async (t) => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 }, { market: "synthetic" });
  t.after(() => rt.dispose());
  rt.stop();
  const inner = rt as unknown as Inner, generation = inner.gen;
  rt.status.heartbeat = 123;
  const work = function* () { inner.gen++; yield -14; return 42; };
  await assert.rejects(inner.drive("Simulation", work(), () => assert.fail("obsolete progress"), generation), /superseded/);
  assert.equal(rt.status.heartbeat, 123);
});
