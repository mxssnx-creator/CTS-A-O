import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { Worker } from "node:worker_threads";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { syntheticCandles } from "../market/bars.ts";
import { closePool, poolWorkers } from "./pool.server.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const runtimes: CoreRuntime[] = [];
afterEach(async () => { for (const rt of runtimes.splice(0)) rt.dispose(); await closePool(); });

type Inner = {
  gen: number;
  fastArgs: unknown;
  memPressured: boolean;
  memLastAbort: string;
  drive<T, R>(name: string, generator: Generator<T, R>, step: (value: T) => void, gen?: number): Promise<R>;
};

for (const mode of ["normal", "superseded", "pressure"] as const) {
  test(`foreground workers physically exit before Real (${mode})`, async () => {
    await closePool();
    const rt = new CoreRuntime(new CoreDb(":memory:"), {
      symbols: 1, historyDays: 1, tfs: [1], tfDays: { "1": 1 }, pinned: [], focus: ["follow|ema-21-55@m1"],
      refineTop: 1, mainTop: 1, evalTop: 1, signals: { enabled: false },
      grid: { tp: [0.01], slOfTp: [1], trailOfTp: [0], holdH: [1], micro: false, minimal: false,
        short: false, general: false, long: false, baseBest: false },
    }, { market: "synthetic" });
    runtimes.push(rt);
    const inner = rt as unknown as Inner;
    const oldFastArgs = inner.fastArgs;
    rt.candles.set("RETIRE-USDT", CandleSeries.fromCandles(syntheticCandles("RETIRE", 1, 600, Date.UTC(2026, 9, 17, 12)), 600));
    const builtin = createRequire(import.meta.url)("node:worker_threads") as { Worker: typeof Worker };
    const RealWorker = builtin.Worker;
    const created: Array<{ exited: boolean }> = [];
    builtin.Worker = new Proxy(RealWorker, {
      construct(target, args) {
        const worker = Reflect.construct(target, args) as Worker;
        const state = { exited: false }; created.push(state);
        worker.once("exit", () => {
          state.exited = true;
          if (mode === "superseded") rt.stop();
          if (mode === "pressure") { inner.memPressured = true; inner.memLastAbort = "memory pressure: fixture during retirement"; }
        });
        return worker;
      },
    });
    syncBuiltinESMExports();
    const reached = new Error("fixture reached Real before allocating walk-forward state");
    const normalDrive = inner.drive.bind(rt);
    let simulations = 0;
    inner.drive = async (name, ...args) => {
      if (name === "Simulation") {
        simulations++;
        assert.ok(created.length > 0, "the actual Base used worker threads");
        assert.ok(created.every((state) => state.exited), "removing pool slots alone is insufficient");
        assert.equal(poolWorkers(), 0);
        throw reached;
      }
      return normalDrive(name, ...args);
    };
    try {
      if (mode === "superseded") await rt.compute(inner.gen);
      else if (mode === "pressure") await assert.rejects(rt.compute(inner.gen), /memory pressure: fixture during retirement/);
      else await assert.rejects(rt.compute(inner.gen), (error) => error === reached);
      assert.ok(created.length > 0);
      assert.ok(created.every((state) => state.exited));
      assert.equal(simulations, mode === "normal" ? 1 : 0);
      assert.equal(rt.status.computes, 0, "the fixture does not publish a partial simulation");
      if (mode !== "normal") assert.equal(inner.fastArgs, oldFastArgs, "an obsolete or memory-aborted continuation cannot replace realtime tape arguments");
    } finally {
      builtin.Worker = RealWorker;
      syncBuiltinESMExports();
    }
  });
}
