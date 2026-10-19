// Nitro emits boot and SSR copies of the pool module in one process. Shared workers need shared queues/watchdog too.
import { after, afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.CTS_CORE_WORKERS = "1";
const a: typeof import("./pool.server.ts") = await import(new URL("./pool.server.ts?pool-copy-a", import.meta.url).href);
const b: typeof import("./pool.server.ts") = await import(new URL("./pool.server.ts?pool-copy-b", import.meta.url).href);
afterEach(async () => { a.abortWorkers("module-copy fixture cleanup"); await a.closePool(); });
after(() => a.closePool());
const until = async (cond: () => boolean) => {
  const end = Date.now() + 5000;
  while (!cond()) { if (Date.now() > end) throw new Error("cross-module pool timeout"); await new Promise((r) => setTimeout(r, 5)); }
};
const bounded = async <T>(p: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([p, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("shared worker queue hung")), 5000); })]); }
  finally { if (timer) clearTimeout(timer); }
};

describe("one worker pool across duplicate server module copies", { timeout: 20_000 }, () => {
  it("hands an actual worker from one module's routine job to another module's queued job", async () => {
    const first = a.runOnWorkers([{ type: "sleep", ms: 150 }], 1, 5000);
    await until(() => a.poolWorkers() === 1);
    const second = b.runOnWorkers([{ type: "sleep", ms: 1 }], 1, 5000);
    await until(() => b.poolQueue() === 1);
    assert.equal(a.poolQueue(), 1, "both modules see the same queue");
    assert.equal(a.workerActivity().inFlight, 2);
    assert.equal(b.workerActivity().inFlight, 2);
    await bounded(Promise.all([first, second]));
    assert.equal(a.poolQueue(), 0);
    assert.equal(b.workerActivity().inFlight, 0);
  });

  it("serves cross-module priority waiters before routine work at the same unchanged worker limits", async () => {
    const order: string[] = [];
    const first = a.runOnWorkers([{ type: "sleep", ms: 150 }], 1, 5000).then(() => { order.push("first"); });
    const extra = b.runOnWorkers([{ type: "sleep", ms: 250 }], 1, 5000, undefined, true);
    await until(() => a.poolWorkers() === 2);
    const routine = a.runOnWorkers([{ type: "sleep", ms: 1 }], 1, 5000).then(() => { order.push("routine"); });
    const priority = b.runOnWorkers([{ type: "sleep", ms: 1 }], 1, 5000, undefined, true).then(() => { order.push("priority"); });
    await until(() => a.poolQueue() === 2);
    assert.equal(b.poolQueue(), 2);
    await bounded(Promise.all([first, extra, routine, priority]));
    assert.ok(order.indexOf("priority") < order.indexOf("routine"));
    assert.equal(a.poolWorkers(), 2, "priority retains the existing one-extra-worker allowance");
  });

  it("shares watchdog activity and abort reasons, rejecting running and queued work in both modules", async () => {
    const running = a.runOnWorkers([{ type: "sleep", ms: 10_000 }], 1, 15_000);
    const checkedRunning = assert.rejects(running, (e) => a.isWorkersAbort(e) && /cross-module abort/.test(String(e)));
    await until(() => a.poolWorkers() === 1);
    const queued = b.runOnWorkers([{ type: "sleep", ms: 1 }], 1, 15_000);
    const checkedQueued = assert.rejects(queued, (e) => b.isWorkersAbort(e) && /cross-module abort/.test(String(e)));
    await until(() => a.poolQueue() === 1);
    a.markWorkersSilent();
    assert.equal(b.workerActivity().at, 0, "another module reads the same watchdog state");
    assert.equal(b.abortWorkers("cross-module abort"), 1);
    await bounded(Promise.all([checkedRunning, checkedQueued]));
    assert.equal(a.poolQueue(), 0);
    assert.equal(b.workerActivity().inFlight, 0);
  });

  it("another module's abort rejects an already successful reply before any remaining part can start", async () => {
    let progress = 0;
    await assert.rejects(a.runOnWorkers(
      [{ type: "sleep", ms: 1 }, { type: "sleep", ms: 1 }], 1, 5000,
      () => { if (++progress === 1) b.abortWorkers("cross-module reply boundary"); },
    ), (err) => a.isWorkersAbort(err) && /cross-module reply boundary/.test(String(err)));
    assert.equal(progress, 1);
    assert.equal(a.poolWorkers(), 0);
    assert.equal(b.workerActivity().inFlight, 0);
    assert.equal(a.poolQueue(), 0);
  });
});
