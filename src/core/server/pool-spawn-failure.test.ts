import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { Worker } from "node:worker_threads";
import { closePool, poolQueue, poolWorkers, runOnWorkers, workerActivity } from "./pool.server.ts";

test("a second owned spawn failure drains the first lane and its thread before rejecting, preserving another owner", async () => {
  await closePool();
  const previousWorkers = process.env.CTS_CORE_WORKERS;
  process.env.CTS_CORE_WORKERS = "3";
  // Updating Node's existing builtin export keeps fault injection out of the production pool API.
  const builtin = createRequire(import.meta.url)("node:worker_threads") as { Worker: typeof Worker };
  const RealWorker = builtin.Worker;
  const created: Array<{ worker: Worker; exited: boolean; terminations: number; posts: number }> = [];
  const failure = new Error("injected second owned Worker spawn failure");
  let attempts = 0;
  builtin.Worker = new Proxy(RealWorker, {
    construct(target, args) {
      if (++attempts === 3) throw failure; // unrelated owner, first owned lane, second owned lane
      const worker = Reflect.construct(target, args) as Worker;
      const state = { worker, exited: false, terminations: 0, posts: 0 };
      created.push(state);
      worker.once("exit", () => { state.exited = true; });
      const terminate = worker.terminate.bind(worker);
      worker.terminate = () => { state.terminations++; return terminate(); };
      const postMessage = worker.postMessage.bind(worker);
      worker.postMessage = (...message) => { state.posts++; return postMessage(...message); };
      return worker;
    },
  });
  syncBuiltinESMExports();
  let unrelated: Promise<Array<{ ok: boolean }>> | undefined;
  try {
    unrelated = runOnWorkers([{ type: "sleep", ms: 500 }], 1, 10_000);
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(runOnWorkers(
      [{ type: "sleep", ms: 5000 }, { type: "sleep", ms: 5000 }, { type: "sleep", ms: 5000 }],
      2, 10_000,
    ), (err) => err === failure);
    assert.equal(attempts, 3, "no remaining owned part starts after acquisition fails");
    assert.ok(created[1].terminations > 0, "the reserved first owned lane is terminated");
    assert.equal(created[1].exited, true, "the owned thread has physically exited before the call rejects");
    assert.equal(created[1].worker.listenerCount("message"), 0, "the owned lane has drained its reply listener");
    assert.equal(created[1].posts, 0, "the reserved lane cannot begin work after its sibling's spawn failure");
    assert.equal(created[0].terminations, 0, "another owner's worker is untouched");
    assert.equal(poolWorkers(), 1);
    assert.equal(poolQueue(), 0);
    assert.equal((await unrelated)[0].ok, true);
    assert.equal(workerActivity().inFlight, 0);
  } finally {
    builtin.Worker = RealWorker;
    syncBuiltinESMExports();
    if (unrelated) await unrelated.catch(() => undefined);
    await closePool();
    if (previousWorkers === undefined) delete process.env.CTS_CORE_WORKERS;
    else process.env.CTS_CORE_WORKERS = previousWorkers;
  }
});
