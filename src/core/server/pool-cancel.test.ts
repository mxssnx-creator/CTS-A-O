// The worker pool stops a call as a whole: after one message fails, the call's other messages do not run on (their
// results were discarded while they held the cores, queued the next compute behind them and moved its progress),
// and an abort (memory pressure) rejects the calls still waiting for a worker instead of handing them fresh ones.
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { abortWorkers, closePool, isWorkersAbort, poolWorkers, runOnWorkers, workerActivity } from "./pool.server.ts";

process.env.CTS_CORE_WORKERS = "1";
after(() => closePool());

describe("worker pool: a failed or aborted call stops", { timeout: 120_000 }, () => {
  it("an abort at a successful reply's progress boundary rejects that reply and never starts the next part", async () => {
    await closePool();
    let progress = 0;
    const reason = "memory pressure: completed reply boundary";
    await assert.rejects(runOnWorkers(
      [{ type: "sleep", ms: 1 }, { type: "sleep", ms: 1 }], 1, 5000,
      () => { if (++progress === 1) assert.equal(abortWorkers(reason), 1); },
    ), (err) => isWorkersAbort(err) && String(err).includes(reason));
    assert.equal(progress, 1, "no successful reply or progress from a later part");
    assert.equal(workerActivity().inFlight, 0, "the whole aborted call has settled");
    assert.equal(poolWorkers(), 0, "no fresh worker was spawned for its remaining part");
    const [fresh] = await runOnWorkers<{ ok: boolean }>([{ type: "sleep", ms: 1 }], 1, 5000);
    assert.equal(fresh.ok, true, "a new call may run immediately after the abort");
  });

  it("a later call's ordinary worker exit does not inherit an earlier memory-abort reason", async () => {
    await closePool();
    abortWorkers("memory pressure: previous call only");
    const next = runOnWorkers([{ type: "sleep", ms: 5000 }], 1, 10_000);
    const rejected = assert.rejects(next, (err) => !isWorkersAbort(err) && /worker exited/.test(String(err)));
    await new Promise((r) => setImmediate(r));
    await closePool();
    await rejected;
    assert.equal(workerActivity().inFlight, 0);
  });

  it("after one message fails, the call's queued messages never run", async () => {
    // one core, two lanes: #0 (300 ms) runs, #1 queues; #1 fails on the worker (a Base message without bars), and
    // the call's surviving lane took #2 and then #3 (800 ms each) before the next call got the core
    let rejected = false;
    let late = 0;
    await assert.rejects(
      runOnWorkers(
        [{ type: "sleep", ms: 300 }, { type: "base" }, { type: "sleep", ms: 800 }, { type: "sleep", ms: 800 }],
        2,
        60_000,
        () => {
          if (rejected) late++;
        },
      ),
    );
    rejected = true;
    assert.equal(workerActivity().inFlight, 0);
    const t0 = Date.now();
    await runOnWorkers([{ type: "sleep", ms: 10 }], 1);
    const waited = Date.now() - t0;
    assert.ok(waited < 300, `the next call waited ${waited} ms behind the failed call's messages`);
    assert.equal(late, 0, "no progress of the failed call after its rejection");
  });

  it("after one message fails, the call's running messages are terminated, not finished", async () => {
    process.env.CTS_CORE_WORKERS = "2";
    try {
      await closePool();
      // two cores: #0 sleeps 5 s on one worker while #1 fails on the other (its worker stays: it replied)
      await assert.rejects(runOnWorkers([{ type: "sleep", ms: 5000 }, { type: "base" }], 2));
      assert.equal(poolWorkers(), 1, "the sleeping sibling's worker was terminated");
    } finally {
      process.env.CTS_CORE_WORKERS = "1";
      await closePool();
    }
  });

  it("an abort rejects a call still waiting for a worker (it got a fresh one and ran)", async () => {
    // warm: the worker exists, so the running call is surely on it when the abort comes
    await runOnWorkers([{ type: "sleep", ms: 1 }], 1);
    const running = runOnWorkers([{ type: "sleep", ms: 600 }], 1);
    const waiting = runOnWorkers([{ type: "sleep", ms: 600 }], 1);
    await new Promise((r) => setTimeout(r, 100));
    abortWorkers("memory pressure: test");
    const t0 = Date.now();
    await Promise.all([
      assert.rejects(running, /memory pressure: test/),
      assert.rejects(waiting, /memory pressure: test/),
    ]);
    assert.ok(Date.now() - t0 < 300, "the waiting call rejects at once, it does not run");
  });
});
