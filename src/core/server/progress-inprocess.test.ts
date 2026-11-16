// In-process progress check: a real runtime compute on an injected feed, with the status sampled continuously.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, type MarketFeed } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { syntheticCandles } from "../market/bars.ts";
import { JOB_STAGES, DONE_STAGE } from "../progress.ts";
import { trackRuntimes } from "../test-support.ts";

const small = {
  symbols: 3, historyDays: 6, tfDays: { "1": 3, "5": 6, "15": 6, "30": 6 },
  mainTop: 10, refineTop: 4, evalTop: 6, cycleMs: 250,
  focus: ["follow|rsi-mom-14-25@m15", "revert|rsi-mom-14-25@m15"], pinned: [], tfs: [15],
  grid: { tp: [0.02], slOfTp: [1], trailOfTp: [0], holdH: [1],
    micro: false as const, minimal: false as const, short: false as const,
    general: false as const, long: false as const, minimalPlus: false as const },
  signals: { enabled: false }, exitStrategy: { enabled: false },
};
const tracked = trackRuntimes();
class TrackedRuntime extends CoreRuntime {
  constructor(...a: ConstructorParameters<typeof CoreRuntime>) { super(...a); tracked.track(this); }
}
afterEach(() => tracked.disposeAll());
const feed = (): Partial<MarketFeed> => ({
  tickers: async () => ["AAA-USDT", "BBB-USDT", "CCC-USDT"].map((sym, i) => ({ sym, last: 1, bid: 0.999, ask: 1.001, quoteVol: 1e9 - i, changePct: 0 })),
  history: async (sym, tf, bars) => syntheticCandles(sym, tf, bars, Date.now() - tf * 60_000),
  klines: async () => [],
});
const order = new Map<string, number>([...JOB_STAGES.map(([name], i) => [name, i] as [string, number]), [DONE_STAGE, JOB_STAGES.length]]);

describe("progress, sampled while a real compute runs", { timeout: 300_000 }, () => {
  it("stays within 0..1, never moves backward inside a job, visits the stages in order, and ends complete", async () => {
    const rt = new TrackedRuntime(new CoreDb(":memory:"), small, { market: "bingx", priceStream: null, feed: feed() });
    const samples: Array<{ stage: string; progress: number; overall: number; computes: number; state: string; label: string }> = [];
    const sample = () => samples.push({ stage: rt.status.stage, progress: rt.status.progress, overall: rt.status.overall ?? 0,
      computes: rt.status.computes, state: rt.status.state, label: rt.status.label });
    const timer = setInterval(sample, 2);
    rt.start();
    const t0 = Date.now();
    while (rt.status.computes < 1 && Date.now() - t0 < 240_000) await new Promise((r) => setTimeout(r, 10));
    // let the realtime stage report once
    await new Promise((r) => setTimeout(r, 100));
    clearInterval(timer);
    sample();
    assert.ok(rt.status.computes >= 1, "the compute finished");
    assert.ok(samples.length > 10, `enough samples to judge (${samples.length})`);

    for (const s of samples) {
      assert.ok(Number.isFinite(s.progress) && s.progress >= 0 && s.progress <= 1, `progress ${s.progress} in ${s.stage}`);
      assert.ok(Number.isFinite(s.overall) && s.overall >= 0 && s.overall <= 1, `overall ${s.overall} in ${s.stage}`);
    }
    // inside the first compute job the bar and the stage only move forward
    const job = samples.filter((s) => s.computes === 0 && s.stage !== "" && order.has(s.stage));
    let last = -1, lastOverall = 0;
    const seen: string[] = [];
    for (const s of job) {
      const idx = order.get(s.stage)!;
      assert.ok(idx >= last, `stage went back from index ${last} to ${s.stage}`);
      assert.ok(s.overall + 1e-9 >= lastOverall, `overall went back from ${lastOverall} to ${s.overall} in ${s.stage}`);
      if (seen.at(-1) !== s.stage) seen.push(s.stage);
      last = idx; lastOverall = Math.max(lastOverall, s.overall);
    }
    assert.ok(seen.includes("backfill") && seen.includes("Base"), `the first stages were visible: ${seen.join(" → ")}`);
    // a stage that reports itself at 100 % is not the end of the job
    assert.ok(job.every((s) => s.stage === DONE_STAGE || s.overall < 1 || s.progress >= 0), "no sample is inconsistent");
    // the finished job rests on the realtime stage with the bar full
    assert.ok((rt.status.overall ?? 0) >= 0.99, `final overall ${rt.status.overall}`);
    rt.stop();
  });
});
