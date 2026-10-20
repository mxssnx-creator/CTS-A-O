import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { closePool, poolQueue, poolWorkers, runOnWorkers, workerActivity } from "./pool.server.ts";
import type { Ticker } from "../market/bingx.ts";
import { trackRuntimes } from "../test-support.ts";
import { upsertPreset, type Preset } from "../presets.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

type Job = NonNullable<CoreRuntime["backtestJob"]>;
type Inner = {
  sliced<T, R>(gen: Generator<T, R>, step: (v: T) => void, job?: Job): Promise<R>;
  runPresetBacktest(p: unknown, days: number, job: Job): Promise<void>;
  onWorkers(job: Job, stage: string, fn: (n: number, signal?: AbortSignal) => Promise<void>): Promise<boolean>;
  backtestsSettled?(): Promise<void>;
  backtestControls: WeakMap<object, AbortController>;
  currentPreset(...args: unknown[]): Preset | null;
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

function presetMutationFixture() {
  const tickers = deferred<Ticker[]>();
  let histories = 0;
  const rt = mk({ market: "bingx", priceStream: null, feed: {
    tickers: async () => tickers.promise,
    history: async () => { histories++; return []; },
    klines: async () => { histories++; return []; },
  } });
  const research = rt.findPreset("live-all-independent")!;
  const saved = ["A", "B", "C"].map((id) => ({ ...structuredClone(research), id: `saved-${id}`, kind: "saved" as const }));
  rt.db.kvSet("presets", saved);
  const seen: Array<{ id: string; symbols: number | undefined }> = [];
  const run = inner(rt).runPresetBacktest.bind(rt);
  inner(rt).runPresetBacktest = async (p, days, j) => {
    const preset = p as Preset;
    seen.push({ id: preset.id, symbols: preset.settings.symbols });
    return run(p, days, j);
  };
  return { rt, research, saved, tickers, seen, histories: () => histories };
}

afterEach(async () => {
  for (const rt of runtimes) rt.dispose();
  await Promise.all(runtimes.map((rt) => inner(rt).backtestsSettled?.()));
  runtimes.length = 0;
  await closePool();
});

describe("preset backtest lifetime", { timeout: 30_000 }, () => {
  it("editing the running saved preset cancels old settings while its queued rerun reads the new settings", async () => {
    const { rt, saved: [a, b], tickers, seen } = presetMutationFixture();
    rt.startPresetBacktest(a.id, 1);
    const old = rt.backtestJob!;
    const signal = inner(rt).backtestControls.get(old)!.signal;
    rt.backtestQueue.push({ id: a.id, days: 2 }, { id: b.id, days: 3 });
    const next = rt.updatePreset(a.id, { symbols: 2 }, {});
    const canceled = signal.aborted && old.state === "error";
    const pending = structuredClone(rt.backtestQueue);
    tickers.resolve([]);
    await rt.backtestsSettled();
    await nextTurn();
    await rt.backtestsSettled();
    assert.equal(next.id, a.id);
    assert.equal(canceled, true, "the captured old settings lose publication authority immediately");
    assert.deepEqual(pending, [{ id: a.id, days: 2 }, { id: b.id, days: 3 }]);
    assert.deepEqual(seen.slice(0, 2), [{ id: a.id, symbols: a.settings.symbols }, { id: a.id, symbols: 2 }]);
    assert.equal(old.progress, 0, "the canceled old market phase never advances; queued successors remain allowed");
    assert.equal(rt.presetSeries(a.id), null);
    assert.equal(rt.presetBacktests()[a.id], undefined);
  });

  it("deleting the running preset cancels only it and removes its derived caches and pending identities", async () => {
    const { rt, saved: [a, b], tickers, seen } = presetMutationFixture();
    // Presence-only cache metadata: no financial return/PF is fabricated by this lifecycle fixture.
    rt.db.kvSet("presetBacktests", { [a.id]: [], [b.id]: [] });
    rt.db.kvSet("presetSeries", { [a.id]: { days: 1 }, [b.id]: { days: 2 } });
    rt.startPresetBacktest(a.id, 1);
    const old = rt.backtestJob!;
    const signal = inner(rt).backtestControls.get(old)!.signal;
    rt.backtestQueue.push({ id: a.id, days: 2 }, { id: b.id, days: 3 }, { id: a.id, days: 4 });
    rt.deletePreset(a.id);
    const canceled = signal.aborted && old.state === "error";
    const pending = structuredClone(rt.backtestQueue);
    const cached = rt.presetBacktests();
    const remainingSeries = rt.presetSeries(b.id);
    tickers.resolve([]);
    await rt.backtestsSettled();
    await nextTurn();
    await rt.backtestsSettled();
    assert.equal(canceled, true);
    assert.equal(rt.findPreset(a.id), undefined);
    assert.deepEqual(pending, [{ id: b.id, days: 3 }]);
    assert.equal(Object.hasOwn(cached, a.id), false);
    assert.deepEqual(cached[b.id], []);
    assert.equal(remainingSeries?.days, 2);
    assert.equal(rt.presetSeries(a.id), null);
    assert.equal(rt.presetBacktests()[a.id], undefined, "the deleted ID cannot reappear after its read settles");
    assert.deepEqual(seen.map((x) => x.id), [a.id, b.id], "only the unrelated successor dispatches after drain");
  });

  it("editing and deleting an unrelated preset leaves the active owner and other queued IDs intact", async () => {
    const { rt, saved: [a, b, c], tickers } = presetMutationFixture();
    rt.db.kvSet("presetBacktests", { [a.id]: [], [b.id]: [], [c.id]: [] });
    rt.db.kvSet("presetSeries", { [a.id]: { days: 1 }, [b.id]: { days: 2 }, [c.id]: { days: 3 } });
    rt.startPresetBacktest(a.id, 1);
    const active = rt.backtestJob!;
    const signal = inner(rt).backtestControls.get(active)!.signal;
    rt.backtestQueue.push({ id: b.id, days: 2 }, { id: c.id, days: 3 });
    rt.updatePreset(b.id, { symbols: 2 }, {});
    assert.equal(signal.aborted, false);
    assert.equal(active.state, "running");
    assert.deepEqual(rt.backtestQueue, [{ id: b.id, days: 2 }, { id: c.id, days: 3 }]);
    rt.deletePreset(b.id);
    assert.equal(signal.aborted, false);
    assert.equal(rt.backtestJob, active);
    assert.equal(active.state, "running");
    assert.deepEqual(rt.backtestQueue, [{ id: c.id, days: 3 }]);
    assert.deepEqual(rt.presetBacktests()[a.id], []);
    assert.deepEqual(rt.presetBacktests()[c.id], []);
    assert.equal(rt.presetSeries(a.id)?.days, 1);
    assert.equal(rt.presetSeries(c.id)?.days, 3);
    tickers.resolve([]);
    await rt.backtestsSettled();
    await nextTurn();
  });

  it("editing research creates a new saved ID without canceling its immutable original backtest", async () => {
    const { rt, research, saved: [, b], tickers } = presetMutationFixture();
    rt.startPresetBacktest(research.id, 1);
    const active = rt.backtestJob!;
    const signal = inner(rt).backtestControls.get(active)!.signal;
    rt.backtestQueue.push({ id: research.id, days: 2 }, { id: b.id, days: 3 });
    const next = rt.updatePreset(research.id, { symbols: 2 }, {});
    assert.notEqual(next.id, research.id);
    assert.equal(next.kind, "saved");
    assert.equal(next.settings.symbols, 2);
    assert.deepEqual(rt.findPreset(research.id), research);
    assert.equal(signal.aborted, false);
    assert.equal(rt.backtestJob, active);
    assert.equal(active.state, "running");
    assert.deepEqual(rt.backtestQueue, [{ id: research.id, days: 2 }, { id: b.id, days: 3 }]);
    tickers.resolve([]);
    await rt.backtestsSettled();
    await nextTurn();
  });

  for (const mutation of ["economic overwrite", "WF overwrite", "catalog eviction", "metadata refresh"] as const)
    it(`final publication fences an alternate ${mutation} after actual tiny simulation`, async () => {
      const rt = mk();
      const a: Preset = {
        ...structuredClone(rt.findPreset("live-all-independent")!), id: "auto-revision-probe", kind: "saved", at: 0,
        settings: {
          symbols: 1, tfMin: 30, tfs: [30], tfDays: { "30": 2 }, focus: ["follow|ema-21-55@m30"],
          grid: { ...DEFAULT_SETTINGS.grid, tp: [0.02], slOfTp: [1], trailOfTp: [0], holdH: [1],
            micro: false, minimal: false, short: false, general: false, long: false },
          signals: { ...DEFAULT_SETTINGS.signals, enabled: false },
          toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
        },
        wf: { mode: "fixed", longH: 1, preH: 1 },
      };
      // The same-ID auto-over-saved replacement and default40 eviction use the production upsert rules.
      const others = Array.from({ length: 39 }, (_, i) => ({ ...structuredClone(a), id: `saved-other-${i}`, at: i + 1 }));
      rt.db.kvSet("presets", [a, ...others]);
      const drive = inner(rt).sliced.bind(rt);
      let simulated = false;
      inner(rt).sliced = async <T, R>(gen: Generator<T, R>, step: (v: T) => void, j?: Job): Promise<R> => {
        const result = await drive(gen, step, j);
        if (result && typeof result === "object" && "stats" in result) {
          simulated = true;
          const replacement = mutation === "economic overwrite" || mutation === "WF overwrite"
            ? { ...structuredClone(a), kind: "auto" as const,
                settings: mutation === "economic overwrite" ? { ...a.settings, symbols: 2 } : a.settings,
                wf: mutation === "WF overwrite" ? { ...a.wf, longH: 2 } : a.wf }
            : mutation === "catalog eviction"
              ? { ...structuredClone(a), id: "saved-newest", at: 100 }
              : { ...structuredClone(a), label: "Refreshed label", at: 100, metrics: { ...a.metrics, source: "refreshed metadata" } };
          rt.db.kvSet("presets", upsertPreset(rt.savedPresets(), replacement));
        }
        return result;
      };
      const workers = process.env.CTS_CORE_WORKERS;
      process.env.CTS_CORE_WORKERS = "0";
      try {
        rt.startPresetBacktest(a.id, 1);
        await rt.backtestsSettled();
      } finally {
        if (workers === undefined) delete process.env.CTS_CORE_WORKERS;
        else process.env.CTS_CORE_WORKERS = workers;
      }
      assert.equal(simulated, true, "actual local candles/tapes/simulation reached the publication boundary");
      if (mutation === "metadata refresh") {
        assert.equal(rt.backtestJob!.state, "done", rt.backtestJob!.error);
        assert.equal(rt.presetBacktests()[a.id].length, 1);
        assert.ok(rt.presetSeries(a.id), "equivalent economic settings retain valid measured results");
      } else {
        assert.equal(rt.backtestJob!.state, "error", "removed or changed economic settings cannot inherit captured results");
        assert.equal(rt.presetBacktests()[a.id], undefined);
        assert.equal(rt.presetSeries(a.id), null);
      }
    });

  for (const mutation of ["settings", "WF", "eviction", "metadata"] as const)
    it(`the saved-list writer invalidates only completed derived caches for ${mutation}`, () => {
      const rt = mk();
      const a: Preset = { ...structuredClone(rt.findPreset("live-all-independent")!), id: "auto-completed-probe", kind: "saved", at: 0 };
      const others = Array.from({ length: 39 }, (_, i) => ({ ...structuredClone(a), id: `saved-cache-${i}`, at: i + 1 }));
      const b = others[0];
      rt.db.kvSet("presets", [a, ...others]);
      rt.db.kvSet("presetBacktests", { [a.id]: [], [b.id]: [] });
      rt.db.kvSet("presetSeries", { [a.id]: { days: 1 }, [b.id]: { days: 2 } });
      rt.backtestQueue.push({ id: a.id, days: 2 }, { id: b.id, days: 3 });
      const incoming = mutation === "settings"
        ? { ...structuredClone(a), settings: { ...a.settings, symbols: 2 } }
        : mutation === "WF"
          ? { ...structuredClone(a), wf: { ...a.wf, longH: 2 } }
          : mutation === "eviction"
            ? { ...structuredClone(a), id: "saved-newest-cache", at: 100 }
            : { ...structuredClone(a), label: "Metadata refresh", at: 100 };
      // Configuration-only writer fixture: supply existing preset metadata at the snapshot factory boundary.
      // No engine, financial value or PF result is fabricated/asserted. savePreset/upsert/persistence are real.
      inner(rt).currentPreset = () => incoming;
      rt.savePreset("Configuration cache fixture");
      if (mutation === "metadata") rt.updatePreset(a.id, {}, {}, "Another display label", "Display text only");
      assert.deepEqual(rt.presetBacktests()[b.id], []);
      assert.equal(rt.presetSeries(b.id)?.days, 2);
      if (mutation === "metadata") {
        assert.deepEqual(rt.presetBacktests()[a.id], []);
        assert.equal(rt.presetSeries(a.id)?.days, 1);
      } else {
        assert.equal(rt.presetBacktests()[a.id], undefined);
        assert.equal(rt.presetSeries(a.id), null);
      }
      assert.deepEqual(rt.backtestQueue, mutation === "eviction"
        ? [{ id: b.id, days: 3 }]
        : [{ id: a.id, days: 2 }, { id: b.id, days: 3 }]);
    });

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
