// The preset backtest's Base (presetBase, on the bars before its window): the pairs entering Main pass the Base gate on
// the worker cores exactly as in-process — the worker messages carried no gates, so every combo with a run entered.
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { closePool } from "./pool.server.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { allCombos } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS, type CoreSettings } from "../config.ts";
import type { Bars } from "../domain/types.ts";

const END = Date.UTC(2026, 8, 20);
const BARS = 1500;
// the pool test's fixture: three synthetic symbols, 15m, the first 60 combos (every one of them has a run)
const bars = ["A", "B", "C"].map((s) => barsFromCandles(`${s}-USDT`, 15, syntheticCandles(s, 15, BARS, END)));
const combos = allCombos().slice(0, 60);

type Inner = {
  presetBase(job: unknown, s: CoreSettings, combos: unknown[], lookBars: Bars[]): Promise<Set<string>>;
};
const job = () => ({ id: "t", label: "t", days: 1, state: "running", stage: "Base", progress: 0, startedAt: Date.now() });
/** the backtest's Base on workers (CTS_CORE_WORKERS=1) or in-process (CTS_CORE_WORKERS=0) */
async function mainOf(gates: Partial<CoreSettings["gates"]>, workers: boolean): Promise<Set<string>> {
  const prev = process.env.CTS_CORE_WORKERS;
  process.env.CTS_CORE_WORKERS = workers ? "1" : "0";
  try {
    const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic" });
    rt.stop();
    const s = { ...DEFAULT_SETTINGS, mainTop: 0, gates: { ...DEFAULT_SETTINGS.gates, ...gates } };
    return await (rt as unknown as Inner).presetBase(job(), s, combos, bars);
  } finally {
    if (prev === undefined) delete process.env.CTS_CORE_WORKERS;
    else process.env.CTS_CORE_WORKERS = prev;
  }
}

describe("preset backtest Base", { timeout: 300_000 }, () => {
  after(() => closePool());

  it("a pair that fails the Base gate never enters Main on the workers", async () => {
    // 3 symbols × 1,500 bars: no pair can close 10,000 trades, so nothing passes — on either path
    const none = { minTrades: 10_000 };
    assert.deepEqual([...(await mainOf(none, false))], []);
    assert.deepEqual([...(await mainOf(none, true))], [], "the worker path gates as the in-process one");
  });

  it("the worker path and the in-process path give the same Main", async () => {
    const lenient = { minPf: 1.05, minTrades: 6, maxDdr: 0 };
    const local = await mainOf(lenient, false);
    const remote = await mainOf(lenient, true);
    assert.ok(local.size > 0 && local.size < combos.length, `${local.size} of ${combos.length} pass`);
    assert.deepEqual([...remote].sort(), [...local].sort());
  });
});
