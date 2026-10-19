// The worker pool's priority lane: a priority message (the realtime entry step) never waits behind a compute's long
// messages — it may start one worker beyond the cores — and routine messages never run on more workers than the cores.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
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
    const directory = mkdtempSync(join(tmpdir(), "cts-priority-barrier-"));
    const workerPath = join(directory, "barrier.worker.mjs");
    writeFileSync(workerPath, `import { parentPort, threadId } from 'node:worker_threads';
parentPort.on('message', (m) => {
  const state = new Int32Array(m.barrier);
  Atomics.store(state, m.index, 1);
  Atomics.notify(state, m.index);
  while (Atomics.load(state, 3 + m.index) === 0) Atomics.wait(state, 3 + m.index, 0);
  Atomics.store(state, 6 + m.index, 1);
  parentPort.postMessage({ ok: true, id: m.id, threadId });
});
`);
    // Isolate the configured worker URL: the real pool module resolves it once, before any messages are sent.
    // Barriers measure scheduling order directly; cold TypeScript/module startup is not part of an overlap test.
    const script = `
import assert from 'node:assert/strict';
import { runOnWorkers, closePool, poolQueue, poolWorkers, workerActivity } from ${JSON.stringify(new URL("./pool.server.ts", import.meta.url).href)};
const barrier = new SharedArrayBuffer(9 * Int32Array.BYTES_PER_ELEMENT), state = new Int32Array(barrier);
const calls = [];
const run = (index, priority = false) => {
  const call = runOnWorkers([{ barrier, index }], 1, 10000, undefined, priority);
  calls.push(call); call.catch(() => undefined);
  return call;
};
const started = async (index) => {
  while (Atomics.load(state, index) === 0) await Atomics.waitAsync(state, index, 0).value;
};
try {
  Atomics.store(state, 4, 1); Atomics.store(state, 5, 1);
  const first = run(0);
  await started(0);
  const [priority] = await run(1, true);
  assert.equal(Atomics.load(state, 6), 0, 'routine 1 is still held when priority finishes');
  assert.equal(Atomics.load(state, 7), 1, 'priority actually ran on its worker');
  assert.equal(poolWorkers(), 2, 'one extra worker belongs to the completed priority call');
  const second = run(2);
  assert.equal(poolQueue(), 1, 'routine 2 queues despite the idle extra worker');
  assert.equal(Atomics.load(state, 2), 0, 'routine 2 cannot start while routine 1 owns the core');
  assert.equal(Atomics.load(state, 6), 0);
  Atomics.store(state, 3, 1); Atomics.notify(state, 3);
  await started(2);
  const [[one], [two]] = await Promise.all([first, second]);
  assert.equal(one.threadId, two.threadId, 'the routine core is handed to the queued routine');
  assert.notEqual(priority.threadId, one.threadId, 'priority overlapped on its own extra worker');
  assert.equal(Atomics.load(state, 8), 1); assert.equal(poolQueue(), 0);
  assert.equal(workerActivity().inFlight, 0);
  console.log(JSON.stringify({ overlap: true, queuedRoutine: true, routineCoreReused: true }));
} finally {
  for (let i = 3; i < 6; i++) { Atomics.store(state, i, 1); Atomics.notify(state, i); }
  await closePool(); await Promise.allSettled(calls);
}
`;
    try {
      const { stdout } = await promisify(execFile)(process.execPath,
        ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", script],
        { env: { ...process.env, CTS_CORE_WORKER: workerPath, CTS_CORE_WORKERS: "1" }, timeout: 20_000, maxBuffer: 64_000 });
      assert.deepEqual(JSON.parse(stdout.trim()), { overlap: true, queuedRoutine: true, routineCoreReused: true });
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
