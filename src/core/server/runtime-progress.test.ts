// Progress reporting of a job on the synthetic feed (runtime.test.ts has the coordination tests).
import { afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { syntheticCandles } from "../market/bars.ts";
import { CoreRuntime, mk, small, stopStarted, until } from "./runtime-harness.ts";

afterEach(stopStarted);

describe("progress reporting", { timeout: 600_000 }, () => {
  before(stopStarted);
  type Rec = {
    stage: string;
    done: number;
    total: number;
    restart: boolean;
    progress: number;
    overall: number;
    state: string;
    label: string;
  };
  /** every setStage call with the status right after it */
  const record = (rt: CoreRuntime) => {
    const rec: Rec[] = [];
    const R = rt as unknown as {
      setStage: (stage: string, done: number, total: number, label?: string, restart?: boolean) => void;
    };
    const orig = R.setStage.bind(rt);
    R.setStage = (stage, done, total, label = "", restart = false) => {
      orig(stage, done, total, label, restart);
      rec.push({
        stage,
        done,
        total,
        restart,
        progress: rt.status.progress,
        overall: rt.status.overall ?? -1,
        state: rt.status.state,
        label: rt.status.label,
      });
    };
    return rec;
  };

  it("a job reports every stage in order, each monotonic, and ends at Realtime 100 % / running after its paper step", async () => {
    const { JOB_STAGES, DONE_STAGE } = await import("../progress.ts");
    const { onCoreEvent } = await import("./runtime.server.ts");
    const rt = mk();
    const rec = record(rt);
    const atCompute: Array<{ computes: number; paperCompute: number; seats: number }> = [];
    const atPaper: Array<{ computes: number; paperCompute: number; stage: string; overall: number }> = [];
    const off = onCoreEvent((e) => {
      if (e.type === "compute")
        atCompute.push({ computes: e.computes, paperCompute: rt.status.paperCompute ?? 0, seats: rt.paper.selected.length });
      if (e.type === "paper")
        atPaper.push({ computes: e.computes, paperCompute: rt.status.paperCompute ?? 0, stage: e.stage, overall: e.overall });
    });
    try {
      rt.start();
      await until(() => (rt.status.paperCompute ?? 0) >= 1 && rt.status.state === "running");
      // the finished job: Realtime 100 %, the paper step on this compute (the session waits for exactly this)
      assert.equal(rt.status.stage, DONE_STAGE);
      assert.equal(rt.status.progress, 1);
      assert.equal(rt.status.overall, 1);
      assert.equal(rt.status.paperCompute, rt.status.computes);
      assert.ok((rt.status.paperSteps ?? 0) >= 1);
      assert.match(rt.status.label, /seats/);
      assert.ok((rt.status.computeStartedAt ?? 0) > 0);
    } finally {
      off();
      rt.stop();
    }
    // the compute event comes before its paper step: computes counts it, paperCompute does not yet (a session that
    // dumped on computes read the seats of the step before — "Real seats 0")
    assert.ok(atCompute.length >= 1);
    assert.ok(atCompute[0].paperCompute < atCompute[0].computes, JSON.stringify(atCompute[0]));
    assert.ok(atPaper.length >= 1);
    assert.equal(atPaper[0].paperCompute, atPaper[0].computes);
    assert.equal(atPaper[0].stage, DONE_STAGE);
    assert.equal(atPaper[0].overall, 1);

    const order = new Map(JOB_STAGES.map(([st], i) => [st, i]));
    assert.ok(rec.every((r) => r.progress >= 0 && r.progress <= 1 && r.overall >= 0 && r.overall <= 1));
    // jobs end at Realtime; the first one holds the backfill and the first compute
    const jobs: Rec[][] = [[]];
    for (const r of rec) {
      if (r.stage === DONE_STAGE) jobs.push([]);
      else jobs[jobs.length - 1].push(r);
    }
    const first = jobs[0];
    const stages = new Set(first.map((r) => r.stage));
    for (const st of ["backfill", "Base", "Main", "Tapes", "Real", "Compare", "Paper"]) assert.ok(stages.has(st), `stage ${st} reported`);
    for (const job of jobs.filter((j) => j.length)) {
      for (let i = 1; i < job.length; i++) {
        const a = job[i - 1];
        const b = job[i];
        // the job's bar never moves back, and the stages come in the job's order
        assert.ok(b.overall >= a.overall, `overall back ${a.stage} ${a.overall} → ${b.stage} ${b.overall}`);
        assert.ok((order.get(b.stage) ?? -1) >= (order.get(a.stage) ?? -1), `stage back ${a.stage} → ${b.stage}`);
        // within a stage the fraction never moves back (a restart starts it over)
        if (a.stage === b.stage && !b.restart)
          assert.ok(b.progress >= a.progress, `${b.stage} back ${a.progress} → ${b.progress}`);
      }
      // computing, not "running", while a compute stage reports
      for (const r of job.filter((x) => x.stage !== "backfill" && x.stage !== "Paper")) assert.equal(r.state, "computing", r.stage);
    }
    // the Real total is the steps the simulation takes: never past it, and it ends exactly there
    const real = first.filter((r) => r.stage === "Real" && r.done > 0);
    assert.ok(real.length > 0);
    assert.ok(real.every((r) => r.done <= r.total), `Real past 100 %: ${real.map((r) => `${r.done}/${r.total}`).join(" ")}`);
    assert.equal(real[real.length - 1].done, real[real.length - 1].total);
    // Main ends complete before the tapes (it reported "Real 100 %" there before)
    const main = first.filter((r) => r.stage === "Main");
    assert.equal(main[main.length - 1].progress, 1);
    // the paper step reaches 100 % before the job closes
    const paper = first.filter((r) => r.stage === "Paper");
    assert.equal(paper[paper.length - 1].progress, 1);
  });

  it("the backfill reports batch #/# of the run and symbols of the universe, forced symbols included", async () => {
    const tickers = Array.from({ length: 20 }, (_, i) => ({
      sym: `T${String(i).padStart(2, "0")}-USDT`,
      last: 1,
      quoteVol: 1e9 - i,
      changePct: 0,
    }));
    const end = Math.floor(Date.now() / 60_000) * 60_000 - 60_000;
    const feed = {
      tickers: async () => tickers,
      history: async (sym: string, tf: number, bars: number) => syntheticCandles(sym.replace("-USDT", ""), tf, bars, end),
      klines: async () => [],
    };
    const mkFeed = (patch: Record<string, unknown>) =>
      new CoreRuntime(
        new CoreDb(":memory:"),
        { ...small, historyDays: 1, symbolRank: "volume", ...patch },
        { market: "bingx", feed },
      );
    const sync = (rt: CoreRuntime) =>
      (rt as unknown as { syncMarket: (gen: number) => Promise<boolean> }).syncMarket(rt.generation);

    // 12 symbols with one forced symbol outside the ranking: 12 in batches of 5 → 3 batches
    const rt = mkFeed({ symbols: 12, forceSymbols: ["ZZZ-USDT"] });
    const rec = record(rt);
    for (let i = 0; i < 3; i++) await sync(rt);
    rt.stop();
    assert.equal(rt.candles.size, 12);
    assert.ok(rt.candles.has("ZZZ-USDT"));
    assert.equal(rt.universeTarget(), 12);
    assert.equal(rt.status.prehistoric?.total, 12);
    const bf = rec.filter((r) => r.stage === "backfill");
    for (const b of [1, 2, 3]) assert.ok(bf.some((r) => r.label.includes(`batch ${b}/3`)), `batch ${b}/3 in ${bf.map((r) => r.label).join(" | ")}`);
    for (const r of bf) {
      const m = /symbols (\d+)\/(\d+)/.exec(r.label);
      assert.ok(m && Number(m[1]) <= Number(m[2]) && Number(m[2]) === 12, r.label);
      // every batch is a backfill (batches 2 and 3 stayed "running" before)
      assert.equal(r.state, "backfill", r.label);
    }
    assert.ok(!bf.some((r) => /batch \d+\/(?!3\b)/.test(r.label)), "no other batch total");

    // more forced symbols than the symbol count: every forced symbol is loaded (the cap was the symbol count)
    const forced = ["F1-USDT", "F2-USDT", "F3-USDT", "F4-USDT", "F5-USDT", "F6-USDT"];
    const rt2 = mkFeed({ symbols: 5, forceSymbols: forced });
    for (let i = 0; i < 3; i++) await sync(rt2);
    rt2.stop();
    assert.equal(rt2.universeTarget(), 6);
    assert.equal(rt2.candles.size, 6);
    for (const f of forced) assert.ok(rt2.candles.has(f), f);
    assert.equal(rt2.status.prehistoric?.total, 6);
    assert.ok((rt2.status.prehistoric?.loaded ?? 0) <= (rt2.status.prehistoric?.total ?? 0));
  });
});

