import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";

process.env.CTS_CORE_WORKERS = "1";
const globalPool = globalThis as unknown as { __ctsPool?: unknown };
const bounded = async <T>(p: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([p, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("legacy queue did not drain")), 5000); })]); }
  finally { if (timer) clearTimeout(timer); }
};

describe("worker pool upgrade from the old private-queue schema", () => {
  it("rejects a hot reload before mutation while actual running and independently queued legacy calls both drain", async () => {
    const worker = new Worker(new URL("./tapes.worker.ts", import.meta.url), { execArgv: ["--experimental-strip-types", "--no-warnings"] });
    const slot = { w: worker, busy: false, ver: 0 };
    const legacy = { slots: [slot], idle: null };
    globalPool.__ctsPool = legacy;
    // The previous module's scheduling queues were closure-local, absent from its shared slots-only object.
    // This real worker fixture preserves that lifetime: two separate calls queue and release through the old owner.
    const privateQueue: Array<() => void> = [];
    const oldRun = (ms: number) => new Promise<void>((resolve, reject) => {
      const start = () => {
        slot.busy = true;
        const cleanup = () => { worker.off("message", message); worker.off("error", error); };
        const finish = () => { slot.busy = false; privateQueue.shift()?.(); };
        const message = () => { cleanup(); resolve(); finish(); };
        const error = (err: Error) => { cleanup(); reject(err); finish(); };
        worker.once("message", message); worker.once("error", error);
        worker.postMessage({ type: "sleep", id: 1, ms });
      };
      if (slot.busy) privateQueue.push(start); else start();
    });
    try {
      const running = oldRun(100);
      const queued = oldRun(1);
      assert.equal(privateQueue.length, 1);
      await assert.rejects(import(new URL("./pool.server.ts?legacy-running-upgrade", import.meta.url).href), /process restart.*legacy scheduler state/);
      assert.equal(globalPool.__ctsPool, legacy, "the old owner's object was not replaced");
      assert.equal(legacy.slots[0], slot, "the active legacy worker was not removed or terminated");
      await bounded(Promise.all([running, queued]));
      assert.equal(privateQueue.length, 0);
      assert.equal(slot.busy, false);
    } finally {
      await worker.terminate();
      delete globalPool.__ctsPool;
    }
    // A fresh process has no inherited legacy object. Its first import initializes the whole shared schema.
    const fresh: typeof import("./pool.server.ts") = await import(new URL("./pool.server.ts?fresh-after-restart", import.meta.url).href);
    try {
      const reply = await bounded(fresh.runOnWorkers<{ ok: boolean }>([{ type: "sleep", ms: 1 }], 1, 5000));
      assert.equal(reply[0].ok, true);
      assert.equal(fresh.poolQueue(), 0);
      assert.equal(fresh.workerActivity().inFlight, 0);
    } finally { await fresh.closePool(); }
  });

  it("also requires a restart for an empty legacy object without claiming transparent migration", async () => {
    const legacy = { slots: [], idle: null };
    globalPool.__ctsPool = legacy;
    try {
      await assert.rejects(import(new URL("./pool.server.ts?legacy-empty-upgrade", import.meta.url).href), /process restart.*legacy scheduler state/);
      assert.equal(globalPool.__ctsPool, legacy);
      assert.deepEqual(legacy, { slots: [], idle: null });
    } finally { delete globalPool.__ctsPool; }
  });

  it("requires a restart when an older shared scheduler cannot register its calls for synchronous aborts", async () => {
    const legacy = { slots: [], idle: null, waiters: [], urgent: [], activity: { inFlight: 0, at: 0 }, abortReason: null };
    globalPool.__ctsPool = legacy;
    try {
      await assert.rejects(import(new URL("./pool.server.ts?legacy-abort-registry-upgrade", import.meta.url).href), /process restart.*legacy scheduler state/);
      assert.equal(globalPool.__ctsPool, legacy);
      assert.equal("aborters" in legacy, false, "the older scheduler was not partially adopted");
    } finally { delete globalPool.__ctsPool; }
  });
});
