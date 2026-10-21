import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as yieldNow } from "node:timers/promises";
import { CoreRuntime, researchIntervalMs } from "./runtime.server.ts";
import { CandleSeries } from "../market/candle-series.ts";
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
      fastArgs: { bars: [] },
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

  it("immediately reevaluates a changed symbol population instead of waiting for the research interval", async () => {
    const { runtime, hooks } = fixture();
    let researched = 0,
      updated = 0;
    Object.assign(hooks, {
      market: "bingx",
      fastArgs: { bars: [{ sym: "NEW-USDT" }] },
      nextResearchAt: Date.now() + 300_000,
      fastStep: async () => {
        updated++;
      },
      prepareRealtime: async () => {},
      compute: async () => {
        researched++;
        hooks.dirty = false;
      },
    });
    hooks.dirty = false;
    hooks.paperStepped = true;
    hooks.syncMarket = async () => true;
    hooks.schedule = () => {};
    await runtime.cycle();
    assert.equal(researched, 1);
    assert.equal(updated, 0);
    assert.equal(runtime.status.cycleKind, "research");
    assert.equal(runtime.status.error, null);
  });

  it("keeps partial candle batches away from continuation and resumes after the pull ends", async () => {
    const { hooks } = fixture();
    let prepared = 0;
    const r = hooks as unknown as { fastStep(): Promise<void>; pulling: Promise<number> | null };
    Object.assign(hooks, {
      market: "bingx",
      fastArgs: { bars: [] },
      paperStepped: true,
      sim: {},
      lastSelection: {},
      prepareRealtime: async () => {
        prepared++;
      },
      fastReady: false,
    });
    r.pulling = new Promise(() => {});
    await r.fastStep();
    assert.equal(prepared, 0, "no half-updated market grid may be consumed");
    r.pulling = null;
    await r.fastStep();
    assert.equal(prepared, 1, "the next completed pull can initialize continuation");
  });

  it("catches up a replacement cohort even when its predecessor already consumed the current bar", async () => {
    const { runtime, hooks } = fixture(),
      M = 60_000,
      bar = Math.floor(Date.now() / M) * M - M;
    runtime.settings.tfMin = 1;
    runtime.settings.tfs = [1];
    runtime.status.lastBarT = bar;
    runtime.candles.set(
      "A-USDT",
      CandleSeries.fromCandles(
        [bar - M, bar].map((t) => ({ t, o: 100, h: 101, l: 99, c: 100, v: 1 })),
      ),
    );
    const r = hooks as unknown as {
      fastStep(): Promise<void>;
      resetRealtime(reason: string): void;
      fastWorker: {
        run: (message: { appends: Array<{ n: number; t: Float64Array }> }) => Promise<unknown>;
      };
      fastBarDone: number;
    };
    Object.assign(hooks, {
      market: "bingx",
      fastArgs: { bars: [] },
      paperStepped: true,
      sim: {},
      lastSelection: {},
      fastReady: true,
      fastCount: 1,
      fastBarDone: bar,
      fastEnds: { "A-USDT|1": bar - M },
      appendRealtimeLearningGen: function* () {},
      stepPaperGen: function* () {},
    });
    let calls = 0;
    r.fastWorker.run = async ({ appends }) => {
      calls++;
      assert.equal(appends.length, 1);
      assert.equal(appends[0].n, 1);
      assert.equal(appends[0].t[0], bar);
      return { tapes: [], ends: { "A-USDT|1": bar }, changed: ["A-USDT|1"] };
    };
    await r.fastStep();
    assert.equal(calls, 0, "the predecessor has already processed this bar");
    r.resetRealtime("qualified research cohort replaced");
    Object.assign(hooks, { fastReady: true, fastCount: 1, fastEnds: { "A-USDT|1": bar - M } });
    await r.fastStep();
    assert.equal(calls, 1, "the replacement catches up without waiting for another candle");
    assert.equal(runtime.status.fast?.phase, "incremental");
    assert.equal(r.fastBarDone, bar);
    await r.fastStep();
    assert.equal(calls, 1, "the caught-up replacement does not consume the bar twice");
  });

  it("completes candle ingestion before a stalled cosmetic ticker request and bounds metadata retries", async () => {
    const { runtime, hooks } = fixture(),
      M = 60_000,
      t = Math.floor(Date.now() / M) * M;
    const old = { t: t - 3 * M, o: 100, h: 101, l: 99, c: 100, v: 1 };
    runtime.candles.set("A-USDT", CandleSeries.fromCandles([old]));
    let release!: (rows: never[]) => void,
      requests = 0;
    Object.assign(hooks, {
      feed: {
        klines: async () => [{ ...old, t: t - 2 * M }],
        tickers: () => {
          requests++;
          return new Promise<never[]>((resolve) => {
            release = resolve;
          });
        },
      },
    });
    const r = hooks as unknown as {
      pullNewBars(g: number): Promise<number>;
      tickerMetadata: Promise<void> | null;
      refreshTickerMetadata(g: number, ms?: number): void;
    };
    assert.equal(await r.pullNewBars(hooks.gen), 1);
    assert.equal(runtime.candles.get("A-USDT")?.n, 2);
    assert.equal(requests, 1);
    assert.ok(r.tickerMetadata, "metadata remains detached while ingestion is complete");
    r.refreshTickerMetadata(hooks.gen);
    assert.equal(requests, 1, "coalesces metadata requests");
    release([]);
    await r.tickerMetadata;
    assert.equal(r.tickerMetadata, null);
    r.refreshTickerMetadata(hooks.gen, 20);
    await r.tickerMetadata;
    assert.equal(
      r.tickerMetadata,
      null,
      "a never-resolving metadata source is retired by its deadline",
    );
    Object.assign(hooks, {
      feed: {
        tickers: () => {
          throw new Error("synchronous metadata failure");
        },
      },
    });
    r.refreshTickerMetadata(hooks.gen);
    await r.tickerMetadata;
    assert.equal(r.tickerMetadata, null);
    assert.equal(
      runtime.status.error,
      null,
      "cosmetic failures do not become ingestion/cycle failures",
    );
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
