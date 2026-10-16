// The worker pool's priority lane: a priority message (the realtime entry step) never waits behind a compute's long
// messages — it may start one worker beyond the cores — and routine messages never run on more workers than the cores.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { abortWorkers, closePool, isWorkersAbort, poolQueue, poolWorkers, runOnWorkers, workerActivity } from "./pool.server.ts";

process.env.CTS_CORE_WORKERS = "1";
afterEach(() => closePool());

describe("worker pool priority lane", () => {
  it("an acquired priority call aborted before its first await resumes retains the abort provenance", async () => {
    const call = runOnWorkers([{ type: "sleep", ms: 5000 }], 1, 10_000, undefined, true);
    const rejected = assert.rejects(call, (err) => isWorkersAbort(err) && /reserved priority abort/.test(String(err)));
    assert.equal(abortWorkers("reserved priority abort"), 1);
    await rejected;
    assert.equal(poolWorkers(), 0);
    assert.equal(workerActivity().inFlight, 0);
    assert.equal(poolQueue(), 0);
  });

  it("an abort rejects running work and routine waiters while a queued priority call still runs", async () => {
    await closePool();
    const stopped = (promise: Promise<unknown>) => assert.rejects(promise,
      (err) => isWorkersAbort(err) && /priority queue abort/.test(String(err)));
    const routine = stopped(runOnWorkers([{ type: "sleep", ms: 5000 }], 1, 10_000));
    const activePriority = stopped(runOnWorkers([{ type: "sleep", ms: 5000 }], 1, 10_000, undefined, true));
    // Let both acquired workers enter the actual running-call set before queuing the next calls.
    await new Promise((r) => setImmediate(r));
    assert.equal(poolWorkers(), 2);
    const waitingPriority = runOnWorkers<{ ok: boolean }>([{ type: "sleep", ms: 1 }], 1, 10_000, undefined, true);
    const waitingRoutine = stopped(runOnWorkers([{ type: "sleep", ms: 1 }], 1, 10_000));
    assert.equal(poolQueue(), 2);
    assert.equal(abortWorkers("priority queue abort"), 2);
    const [, , , reply] = await Promise.all([routine, activePriority, waitingRoutine, waitingPriority]);
    assert.equal(reply[0].ok, true, "the queued realtime call gets a fresh worker");
    assert.equal(poolQueue(), 0);
    assert.equal(workerActivity().inFlight, 0);
    assert.equal(poolWorkers(), 1, "only the surviving priority call's worker remains");
  });

  it("a priority message runs beside a long routine one; routine work stays on the cores", async () => {
    const t0 = Date.now();
    const long = runOnWorkers([{ type: "sleep", ms: 1500 }], 1);
    await new Promise((r) => setTimeout(r, 300));
    await runOnWorkers([{ type: "sleep", ms: 50 }], 1, 60_000, undefined, true);
    const prioMs = Date.now() - t0;
    assert.ok(prioMs < 1200, `the priority message waited ${prioMs} ms behind the routine one`);
    assert.equal(poolWorkers(), 2, "one extra worker for the priority message");
    // the extra worker is idle now; a second routine message waits for the core (never two routine at once)
    const t1 = Date.now();
    await Promise.all([long, runOnWorkers([{ type: "sleep", ms: 100 }], 1)]);
    const both = Date.now() - t1;
    assert.ok(both >= 1100, `the second routine message ran on the extra worker (${both} ms)`);
  });
});
