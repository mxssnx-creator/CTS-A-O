// A real saved-preset job must include the same independent causal Exit configs as the continuous engine.
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { CoreRuntime, laneSeriesFrom } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { closePool, workersAvailable } from "./pool.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Candle } from "../domain/types.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { allCombos, makeUniverse } from "../pipeline/pipeline.ts";
import { exitStrategyPairs, exitStrategyProtectsGen } from "../exit-strategy.ts";
import {
  buildTapes,
  walkForward,
  type ConfigTape,
  type WalkForwardResult,
} from "../sim/walkforward.ts";
import { presetSettings, type Preset } from "../presets.ts";
import { SeriesCache } from "../indications/cache.ts";

const H = 3_600_000;
const runtimes: CoreRuntime[] = [];
type Job = NonNullable<CoreRuntime["backtestJob"]>;
type Inner = {
  btCandles: Map<string, { at: number; candles: Map<string, CandleSeries> }>;
  sliced<T, R>(g: Generator<T, R>, step: (v: T) => void, job?: Job): Promise<R>;
  onWorkers(
    job: Job,
    stage: string,
    fn: (n: number, signal?: AbortSignal) => Promise<void>,
  ): Promise<boolean>;
  workersBroken: boolean;
};
const finish = <T>(g: Generator<unknown, T>): T => {
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
};
const inner = (rt: CoreRuntime) => rt as unknown as Inner;
function fixture() {
  const end = Math.floor(Date.now() / H) * H;
  const candles: Candle[] = [];
  let price = 100;
  for (let i = 0; i < 16_000; i++) {
    const direction = Math.floor(i / 300) % 2 === 0 ? 1 : -1;
    const o = price;
    price = o * (1 + direction * 0.0002);
    candles.push({
      t: end - (16_000 - i) * 60_000,
      o,
      h: Math.max(o, price) * 1.00001,
      l: Math.min(o, price) * 0.99999,
      c: price,
      v: 100,
    });
  }
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    {
      symbols: 1,
      tfMin: 1,
      tfs: [1, 15],
      historyDays: 1,
      tfDays: { "1": 1, "15": 10 },
      focus: ["follow|ema-9-21@m15"],
      pinned: [],
      mainTop: 0,
      grid: {
        ...DEFAULT_SETTINGS.grid,
        tp: [],
        minimal: false,
        short: false,
        general: false,
        long: false,
        micro: false,
        minimalPlus: false,
      },
      signals: { ...DEFAULT_SETTINGS.signals, enabled: false },
      adjust: { ...DEFAULT_SETTINGS.adjust, enabled: false },
      tactics: {
        ...DEFAULT_SETTINGS.tactics,
        session: false,
        volRegime: false,
        trendStrength: false,
        cooldown: false,
      },
      gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.05, minTrades: 2, maxDdr: 0, maxDdtH: 1000 },
      exitStrategy: {
        ...DEFAULT_SETTINGS.exitStrategy,
        enabled: true,
        lookbackH: 168,
        minEntries: 3,
        minValidationTrades: 2,
        minPf: 1.05,
        maxDdr: 0,
        holdH: 3,
        maxConfigsPerPair: 12,
        minTp: 0.006,
        maxTp: 0.05,
        maxSl: 0.1,
        quantiles: [0.5, 0.75],
        stopQuantiles: [0.5, 0.75],
        trailShares: [0.33],
        stopMultiples: [1],
      },
      toggles: {
        normal: false,
        trailing: false,
        exit: true,
        block: false,
        blockActive: false,
        dca: false,
        dcaActive: false,
        axis: false,
      },
    },
    { market: "synthetic", priceStream: null },
  );
  rt.stop();
  runtimes.push(rt);
  const p: Preset = {
    id: "saved-exit-parity",
    label: "Exit parity",
    kind: "saved",
    info: "",
    at: 0,
    settings: presetSettings(rt.settings),
    wf: {
      mode: "fixed",
      longH: 72,
      preH: 12,
      validLastN: 0,
      lastN: 0,
      symGate: "off",
      portfolio: 0,
    },
    metrics: {} as Preset["metrics"],
  };
  rt.db.kvSet("presets", [p]);
  const columns = new Map([["SYN0-USDT", CandleSeries.fromCandles(candles)]]);
  inner(rt).btCandles.set(`${rt.settings.tfMin}|1|${rt.settings.symbolRank}`, {
    at: Date.now(),
    candles: columns,
  });
  return { rt, p, columns, end };
}
async function withWorkers<T>(enabled: boolean, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.CTS_CORE_WORKERS;
  process.env.CTS_CORE_WORKERS = enabled ? "1" : "0";
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.CTS_CORE_WORKERS;
    else process.env.CTS_CORE_WORKERS = prev;
  }
}
afterEach(async () => {
  for (const rt of runtimes) rt.dispose();
  await Promise.all(runtimes.map((rt) => rt.backtestsSettled()));
  runtimes.length = 0;
  await closePool();
});

describe("independent Exit preset backtests", { timeout: 90_000 }, () => {
  for (const workers of [false, true])
    it(
      `matches a direct causal fit and independent WF with workers ${workers ? "on" : "off"}`,
      { skip: workers && !workersAvailable() },
      async () =>
        withWorkers(workers, async () => {
          const { rt, p, columns, end } = fixture();
          let actual: WalkForwardResult | undefined;
          const localExitTapes: ConfigTape[] = [];
          const original = inner(rt).sliced.bind(rt);
          inner(rt).sliced = async <T, R>(
            g: Generator<T, R>,
            step: (v: T) => void,
            job?: Job,
          ): Promise<R> => {
            const value = await original(g, step, job);
            if (value && typeof value === "object" && "stats" in value)
              actual = value as unknown as WalkForwardResult;
            if (Array.isArray(value))
              localExitTapes.push(...value.filter((t) => t?.kind === "exit"));
            return value;
          };
          rt.startPresetBacktest(p.id, 1);
          await rt.backtestsSettled();
          assert.equal(rt.backtestJob?.state, "done", rt.backtestJob?.error);
          assert.ok(actual, "the real job reached simulation");
          // Exact native histories: 1m needs the 168h fit plus 24h warmup; 15m retains its longer configured ten days.
          // Aligning the historical input also preserves candidate insertion order and tied-exit order exactly.
          const u = makeUniverse(
            laneSeriesFrom(columns, { ...rt.settings, tfDays: { "1": 8, "15": 10 } }, 1),
          );
          assert.equal(
            u.bars.find((b) => b.tfMin === 15)!.n,
            11 * 24 * 4,
            "a configured slow-lane history longer than the Exit lookback must not be globally truncated",
          );
          const pairs = exitStrategyPairs(
            allCombos(rt.settings.focus, rt.settings.disabledKinds, rt.settings.tfs),
            u,
          );
          const validation = {
            cost: rt.settings.cost,
            minPf: rt.settings.exitStrategy.minPf,
            minTrades: rt.settings.exitStrategy.minValidationTrades,
            maxDdr: rt.settings.exitStrategy.maxDdr,
            minSl: rt.settings.protectFloor.minSl,
            minTrail: rt.settings.protectFloor.minTrail,
          };
          const fitted = finish(
            exitStrategyProtectsGen(
              u,
              pairs,
              rt.settings.exitStrategy,
              rt.settings.tactics,
              end - 24 * H,
              validation,
            ),
          );
          assert.ok(
            Object.values(fitted).flat().length >= 6,
            "all three independent tactics and both directions qualify",
          );
          const tapes = buildTapes(
            u,
            [],
            rt.settings.cost,
            undefined,
            new Set(pairs),
            rt.settings.tactics,
            null,
            { minSl: validation.minSl, minTrail: validation.minTrail, pairProtects: fitted },
          );
          const direct = walkForward(u, tapes, { ...actual.opts, protects: [], dcaProtects: [] });
          assert.ok(
            direct.stats.n > 0 && direct.stats.pf > 1,
            "planted forward data exercises real executed exits",
          );
          assert.deepEqual(actual.stats, direct.stats);
          assert.deepEqual(
            actual.trades,
            direct.trades,
            "exact order identities and tied-exit ordering match the oracle",
          );
          assert.equal(new Set(tapes.map((t) => t.id)).size, tapes.length);
          if (!workers)
            assert.deepEqual(
              localExitTapes.map((t) => t.id),
              tapes.map((t) => t.id),
            );
          assert.ok(actual.trades.every((t) => t.kind === "exit" && /\|hx[LS][012]$/.test(t.cfg)));
          assert.ok(
            tapes.every((t) => !t.protect.tag),
            "ranges are disabled and cannot gate Exit tapes",
          );
          const saved = rt.presetBacktests()[p.id][0];
          assert.equal(saved.pfBasis, "unit-net-returns");
          assert.equal(saved.unknownReturns, 0);
          assert.equal(saved.pf, direct.stats.pf);
        }),
    );

  it("executes a sparse 30m Exit focus even when its ordinary lane is not initialized", async () =>
    withWorkers(false, async () => {
      const { rt, p, columns, end } = fixture();
      p.settings.tfs = [1, 30];
      p.settings.tfDays = { ...rt.settings.tfDays, "30": 1 };
      p.settings.focus = ["follow|ema-9-21@m30"];
      rt.db.kvSet("presets", [p]);
      const ordinary = makeUniverse(
        laneSeriesFrom(
          columns,
          { ...rt.settings, tfs: [1, 30], tfDays: { ...rt.settings.tfDays, "30": 1 } },
          1,
        ),
      );
      assert.equal(
        ordinary.bars.some((b) => b.tfMin === 30),
        false,
        "96 ordinary 30m bars cannot initialize an indication",
      );
      let actual: WalkForwardResult | undefined;
      const original = inner(rt).sliced.bind(rt);
      inner(rt).sliced = async <T, R>(
        g: Generator<T, R>,
        step: (v: T) => void,
        job?: Job,
      ): Promise<R> => {
        const value = await original(g, step, job);
        if (value && typeof value === "object" && "stats" in value)
          actual = value as unknown as WalkForwardResult;
        return value;
      };
      rt.startPresetBacktest(p.id, 1);
      await rt.backtestsSettled();
      assert.equal(rt.backtestJob?.state, "done", rt.backtestJob?.error);
      assert.ok(
        actual && actual.trades.length > 0,
        "independently initialized 30m Exit configs execute forward orders",
      );
      assert.ok(actual.trades.every((t) => t.kind === "exit" && t.cfg.includes("ema-9-21@m30|")));
      assert.equal(
        rt.presetBacktests()[p.id][0].to,
        end,
        "the report retains its actual market end time",
      );
    }));

  it("enabling Exit history preserves the ordinary strategy's exact simulation cohort", async () =>
    withWorkers(false, async () => {
      const observed: WalkForwardResult[] = [];
      for (const enabled of [false, true]) {
        const { rt, p } = fixture();
        p.settings.exitStrategy = { ...rt.settings.exitStrategy, enabled };
        p.settings.toggles = { ...rt.settings.toggles, normal: true, exit: false };
        p.settings.grid = {
          ...rt.settings.grid,
          tp: [0.02],
          slOfTp: [1],
          trailOfTp: [0],
          holdH: [3],
        };
        rt.db.kvSet("presets", [p]);
        const original = inner(rt).sliced.bind(rt);
        inner(rt).sliced = async <T, R>(
          g: Generator<T, R>,
          step: (v: T) => void,
          job?: Job,
        ): Promise<R> => {
          const value = await original(g, step, job);
          if (value && typeof value === "object" && "stats" in value)
            observed.push(value as unknown as WalkForwardResult);
          return value;
        };
        rt.startPresetBacktest(p.id, 1);
        await rt.backtestsSettled();
        assert.equal(rt.backtestJob?.state, "done", rt.backtestJob?.error);
      }
      assert.equal(observed.length, 2);
      assert.ok(observed[0].trades.length > 0, "the ordinary cohort contains actual trades");
      assert.deepEqual(observed[1].stats, observed[0].stats);
      assert.deepEqual(
        observed[1].trades,
        observed[0].trades,
        "additional Exit prehistory cannot change Normal config/order identities or causal returns",
      );
    }));

  it("fetches enough new candles for the default Exit lookback and longer configured native lanes", async () =>
    withWorkers(false, async () => {
      const { rt, p } = fixture();
      inner(rt).btCandles.clear(); // force the production synthetic loader to honor wantBars instead of reusing richer data
      const native = new Map<number, number>();
      const clear = SeriesCache.prototype.clear;
      SeriesCache.prototype.clear = function (keep) {
        if (rt.backtestJob?.stage === "Exit history") native.set(this.b.tfMin, this.b.n);
        return clear.call(this, keep);
      };
      try {
        rt.startPresetBacktest(p.id, 1);
        await rt.backtestsSettled();
      } finally {
        SeriesCache.prototype.clear = clear;
      }
      assert.equal(rt.backtestJob?.state, "done", rt.backtestJob?.error);
      assert.equal(
        native.get(1),
        9 * 24 * 60,
        "1m receives 168h fit, 24h warmup and the trading day",
      );
      assert.equal(
        native.get(15),
        11 * 24 * 4,
        "15m preserves its longer ten-day prehistory plus the trading day",
      );
    }));

  it("lookback zero retains each Exit lane's own configured history", async () =>
    withWorkers(false, async () => {
      const { rt, p } = fixture();
      p.settings.exitStrategy = { ...rt.settings.exitStrategy, lookbackH: 0 };
      rt.db.kvSet("presets", [p]);
      const native = new Map<number, number>();
      const clear = SeriesCache.prototype.clear;
      SeriesCache.prototype.clear = function (keep) {
        if (rt.backtestJob?.stage === "Exit history") native.set(this.b.tfMin, this.b.n);
        return clear.call(this, keep);
      };
      try {
        rt.startPresetBacktest(p.id, 1);
        await rt.backtestsSettled();
      } finally {
        SeriesCache.prototype.clear = clear;
      }
      assert.equal(rt.backtestJob?.state, "done", rt.backtestJob?.error);
      assert.equal(
        native.get(1),
        2 * 24 * 60,
        "1m keeps one configured prehistory day plus the trading day",
      );
      assert.equal(
        native.get(15),
        11 * 24 * 4,
        "15m keeps ten configured days plus the trading day",
      );
    }));

  for (const workers of [false, true])
    it(
      `cancels Exit fitting without local continuation or cached results with workers ${workers ? "on" : "off"}`,
      { skip: workers && !workersAvailable() },
      async () =>
        withWorkers(workers, async () => {
          const { rt, p } = fixture();
          let reached = false;
          let continuedLocally = 0;
          let clearedAfterCancel = 0;
          const clear = SeriesCache.prototype.clear;
          SeriesCache.prototype.clear = function () {
            if (reached) clearedAfterCancel++;
            return clear.call(this);
          };
          const sliced = inner(rt).sliced.bind(rt);
          inner(rt).sliced = async <T, R>(
            g: Generator<T, R>,
            step: (v: T) => void,
            job?: Job,
          ): Promise<R> => {
            if (job?.stage === "Exit history") {
              if (workers) continuedLocally++;
              else {
                g.next();
                g.next();
                reached = true;
                rt.dispose();
              }
            }
            return sliced(g, step, job);
          };
          const onWorkers = inner(rt).onWorkers.bind(rt);
          inner(rt).onWorkers = async (job, stage, fn) => {
            const pending = onWorkers(job, stage, fn);
            if (workers && stage === "Exit history") {
              reached = true;
              setImmediate(() => rt.dispose());
            }
            return pending;
          };
          try {
            rt.startPresetBacktest(p.id, 1);
            await rt.backtestsSettled();
          } finally {
            SeriesCache.prototype.clear = clear;
          }
          assert.equal(reached, true, "the real job reaches Exit fitting before cancellation");
          assert.equal(rt.backtestJob?.state, "error");
          assert.match(rt.backtestJob?.error ?? "", /canceled|disposed/);
          assert.equal(
            continuedLocally,
            0,
            "an owned cancellation cannot start an in-process fallback",
          );
          assert.ok(
            clearedAfterCancel > 0,
            "fitting memos are cleared in the cancellation finally path",
          );
          assert.equal(inner(rt).workersBroken, false);
          assert.equal(rt.presetBacktests()[p.id], undefined);
          assert.equal(rt.presetSeries(p.id), null);
        }),
    );
});
