import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { closePool, poolQueue, poolWorkers, runOnWorkers, workerActivity } from "./pool.server.ts";
import type { Ticker } from "../market/bingx.ts";
import { trackRuntimes } from "../test-support.ts";

type Job = NonNullable<CoreRuntime["backtestJob"]>;
type Inner = {
  sliced<T, R>(gen: Generator<T, R>, step: (v: T) => void, job?: Job): Promise<R>;
  runPresetBacktest(p: unknown, days: number, job: Job): Promise<void>;
  onWorkers(job: Job, stage: string, fn: (n: number, signal?: AbortSignal) => Promise<void>): Promise<boolean>;
  backtestsSettled?(): Promise<void>;
};
const runtimes: CoreRuntime[] = [];
const mk = (opts: ConstructorParameters<typeof CoreRuntime>[2] = { market: "synthetic" }) => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, opts);
  rt.stop();
  runtimes.push(rt);
  return rt;
};
const inner = (rt: CoreRuntime) => rt as unknown as Inner;
const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};
const job = (): Job => ({ id: "test", label: "test", days: 1, state: "running", stage: "Base", progress: 0, startedAt: Date.now() });

afterEach(async () => {
  for (const rt of runtimes) rt.dispose();
  await Promise.all(runtimes.map((rt) => inner(rt).backtestsSettled?.()));
  runtimes.length = 0;
  await closePool();
});

describe("preset backtest lifetime", { timeout: 30_000 }, () => {
  it("stop during a sliced phase prevents the next step and completion", async () => {
    const rt = mk();
    let advanced = 0;
    function* work() { yield 1; advanced++; return 2; }
    rt.backtestJob = job();
    await assert.rejects(inner(rt).sliced(work(), () => rt.stop(), rt.backtestJob), /stopped|cancel/i);
    assert.equal(advanced, 0);
  });

  it("dispose during an awaited real market phase prevents history, caches, results and queued dispatch", async () => {
    const tickers = deferred<Ticker[]>();
    let entered = false;
    let requests = 0;
    const rt = mk({ market: "bingx", priceStream: null, feed: {
      tickers: async () => { entered = true; return await tickers.promise; },
      history: async () => { requests++; return []; },
      klines: async () => { requests++; return []; },
    } });
    const id = "live-all-independent";
    rt.startPresetBacktest(id, 1);
    assert.equal(entered, true);
    rt.backtestQueue.push({ id, days: 2 });
    const active = rt.backtestJob!;
    rt.dispose();
    const canceled = active.state === "error" && /disposed|cancel/i.test(active.error ?? "");
    const queue = rt.backtestQueue.length;
    tickers.resolve([]);
    await nextTurn();
    await inner(rt).backtestsSettled?.();
    assert.equal(canceled, true, "the actual public task is canceled immediately");
    assert.equal(queue, 0, "future work is discarded");
    assert.equal(requests, 0, "no phase after the canceled shared read starts");
    assert.deepEqual(rt.presetBacktests(), {});
    assert.equal(rt.presetSeries(id), null);
    assert.equal(rt.backtestJob, active, "no queued successor replaces the canceled job");
  });

  it("a task still draining cannot overlap a successor even if its job was marked error", async () => {
    const rt = mk();
    const gate = deferred<void>();
    inner(rt).runPresetBacktest = async () => gate.promise;
    rt.startPresetBacktest("live-all-independent", 1);
    rt.backtestJob!.state = "error";
    let blocked = false;
    try { rt.startPresetBacktest("live-all-independent", 2); } catch { blocked = true; }
    gate.resolve();
    await nextTurn();
    assert.equal(blocked, true);
  });

  it("a fresh stopped runtime can backtest, while a disposed runtime cannot start or queue", async () => {
    const rt = mk();
    let starts = 0;
    inner(rt).runPresetBacktest = async (_p, _d, j) => { starts++; j.state = "done"; };
    rt.startPresetBacktest("live-all-independent", 1);
    await nextTurn();
    assert.equal(starts, 1);
    rt.dispose();
    assert.throws(() => rt.startPresetBacktest("live-all-independent", 1), /disposed/i);
    assert.throws(() => rt.queuePresetBacktests(1), /disposed/i);
    assert.equal(starts, 1);
  });

  it("per-call cancellation at a successful worker reply stops remaining parts and leaves another call alive", async () => {
    const ctrl = new AbortController();
    let progress = 0;
    const canceled = runOnWorkers(
      [{ type: "sleep", ms: 1 }, { type: "sleep", ms: 1 }], 1, 5000,
      () => { if (++progress === 1) ctrl.abort(new Error("backtest canceled")); }, true, ctrl.signal,
    );
    const rejection = assert.rejects(canceled, /backtest canceled/);
    const healthy = runOnWorkers<{ ok: boolean }>([{ type: "sleep", ms: 1 }], 1, 5000);
    await rejection;
    assert.equal((await healthy)[0].ok, true);
    assert.equal(progress, 1);
    assert.equal(workerActivity().inFlight, 0);
  });

  it("an already canceled call does not spawn a worker", async () => {
    await closePool();
    const ctrl = new AbortController();
    ctrl.abort(new Error("backtest canceled before submit"));
    await assert.rejects(runOnWorkers([{ type: "sleep", ms: 1 }], 1, 5000, undefined, true, ctrl.signal), /canceled before submit/);
    assert.equal(poolWorkers(), 0);
  });

  it("canceling a wholly queued priority call leaves the occupied worker and its owner alive", async () => {
    await runOnWorkers([{ type: "sleep", ms: 1 }], 1, 5000);
    const healthy = runOnWorkers<{ ok: boolean }>([{ type: "sleep", ms: 80 }], 1, 5000);
    const healthyPriority = runOnWorkers<{ ok: boolean }>([{ type: "sleep", ms: 80 }], 1, 5000, undefined, true);
    assert.equal(poolWorkers(), 2, "both the routine and priority allowance are occupied");
    const ctrl = new AbortController();
    const queued = runOnWorkers([{ type: "sleep", ms: 1 }], 1, 5000, undefined, true, ctrl.signal);
    assert.equal(poolQueue(), 1, "this priority call is wholly queued");
    const rejected = assert.rejects(queued, /queued backtest canceled/);
    await nextTurn();
    ctrl.abort(new Error("queued backtest canceled"));
    await rejected;
    assert.equal(poolQueue(), 0);
    assert.equal(poolWorkers(), 2, "both unrelated occupied workers were retained");
    assert.equal((await healthy)[0].ok, true);
    assert.equal((await healthyPriority)[0].ok, true);
    assert.equal(workerActivity().inFlight, 0);
  });

  it("dispose cancels its actual worker phase without fallback, result publication or queued successor", async () => {
    const rt = mk();
    let fallback = 0;
    let published = 0;
    const entered = deferred<void>();
    inner(rt).runPresetBacktest = async (_p, _d, j) => {
      const ok = await inner(rt).onWorkers(j, "Tapes", async (n, signal) => {
        entered.resolve();
        await runOnWorkers([{ type: "sleep", ms: 5000 }], n, 10_000, undefined, true, signal);
      });
      if (!ok) fallback++;
      published++;
    };
    rt.startPresetBacktest("live-all-independent", 1);
    await entered.promise;
    rt.backtestQueue.push({ id: "live-all-independent", days: 2 });
    rt.dispose();
    await inner(rt).backtestsSettled?.();
    assert.equal(fallback, 0);
    assert.equal(published, 0);
    assert.equal(rt.backtestQueue.length, 0);
    assert.equal(rt.backtestJob!.state, "error");
    assert.equal(workerActivity().inFlight, 0);
    assert.equal(poolWorkers(), 0);
  });

  it("the supplied expired job is rejected before advancing, regardless of a newer job timestamp", async () => {
    const rt = mk();
    rt.backtestJob = job();
    const expired = { ...job(), startedAt: Date.now() - 15 * 60_000 - 1 };
    let advanced = 0;
    function* work() { advanced++; yield 1; return 2; }
    await assert.rejects(inner(rt).sliced(work(), () => undefined, expired), /15 min limit/);
    assert.equal(advanced, 0);
    assert.equal(rt.backtestJob.state, "running", "an unrelated current job is unchanged");
  });

  it("tracked release drains cancellation without waiting for another owner's shared market read", async () => {
    const tickers = deferred<Ticker[]>();
    let history = 0;
    const rt = mk({ market: "bingx", priceStream: null, feed: {
      tickers: async () => tickers.promise,
      history: async () => { history++; return []; },
    } });
    const tracker = trackRuntimes();
    tracker.track(rt);
    rt.startPresetBacktest("live-all-independent", 1);
    await tracker.release(rt);
    assert.equal(rt.backtestJob!.state, "error");
    assert.deepEqual(rt.presetBacktests(), {});
    tickers.resolve([]);
    await nextTurn();
    assert.equal(history, 0);
    assert.deepEqual(rt.presetBacktests(), {});
  });
});
