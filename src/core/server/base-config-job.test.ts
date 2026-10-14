import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { BaseConfigJobRunner, baseConfigJobKey, type BaseConfigJob, type BaseConfigSnapshot } from "./base-config-job.server.ts";
import { closePool, runOnWorkers, shareBars, type BaseConfigChunkMessage, type BaseConfigChunkReply } from "./pool.server.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapesGen, defaultWalkForward, DEFAULT_RANGE_FIT, tradeAt, type ConfigTape } from "../sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { BaseConfigCounter } from "../base-config-counts.ts";
import type { Protect } from "../domain/types.ts";

after(() => closePool());
const END = Date.UTC(2026, 8, 20);
const bars = [barsFromCandles("COUNT-USDT", 1, syntheticCandles("COUNT", 1, 9000, END))];
const u = makeUniverse(bars);
const wf = defaultWalkForward(DEFAULT_SETTINGS);
const pair = "follow|tactic-breakout-s@m1";
const protects: Protect[] = Array.from({ length: 40 }, (_, i) => ({
  tp: 0.001 + i * 0.0004, sl: 0.003 + (i % 3) * 0.001, trail: i % 2 ? 0.002 : 0, hold: 32, tag: i < 20 ? "sh" : "gn",
}));
const options = { gates: { minPf: 1.1, minTrades: 2, maxDdr: 0 }, cost: DEFAULT_SETTINGS.cost, cutT: u.nowT, fromT: u.startT };
const common: BaseConfigJob["common"] = {
  bars: shareBars(bars), cost: options.cost, options,
  tactics: { ...DEFAULT_SETTINGS.tactics, session: false, volRegime: false, trendStrength: false, cooldown: false },
  floors: { minSl: 0, minTrail: 0, pairTags: { [pair]: ["", "sh", "gn"] }, rangeFit: DEFAULT_RANGE_FIT, countFitProtects: protects },
};
const jobOf = (patch: Partial<BaseConfigJob> = {}): BaseConfigJob => {
  const j: BaseConfigJob = {
    key: "fixture", settingsAt: 1, common, pairs: [pair], protects,
    kinds: ["normal", "trailing", "dca", "dca-active", "axis"],
    dcaOpt: { protects: wf.dcaProtects.slice(0, 1), dca: wf.dca, axis: { ...DEFAULT_SETTINGS.axis, ranges: ["atr"], levelsSet: [2], perRange: true } }, ...patch,
  };
  return j;
};
const until = async (cond: () => boolean, ms = 15_000) => {
  const deadline = Date.now() + ms;
  while (!cond()) { if (Date.now() > deadline) throw new Error("Base count fixture timeout"); await new Promise((r) => setTimeout(r, 10)); }
};
const remote = async (message: BaseConfigChunkMessage): Promise<BaseConfigChunkReply> => (await runOnWorkers<BaseConfigChunkReply>([message], 1, 15_000))[0];
const skippedReply = (m: BaseConfigChunkMessage): BaseConfigChunkReply => {
  const n = m.kinds.includes("axis") ? m.floors.countAxisWindow!.limit : m.dcaOpt
    ? m.dcaOpt.protects.length * m.kinds.length : m.protects.length;
  const [bot, ind] = m.pair.split("|");
  return { seen: ["fixture-config"], rows: [{ bot, ind, tag: "", kind: m.kinds[0], configured: n, evaluated: 0,
    pfPassed: 0, passed: 0, notEvaluated: { fixture: n }, minPf: 1.1, floorPf: 1.1,
    cost: m.options.cost, cutT: m.options.cutT, fromT: m.options.fromT, closes: 0, gp: 0, gl: 0, firstEntryT: null, lastExitT: null,
  }] };
};
const runnerOf = (patch: Partial<ConstructorParameters<typeof BaseConfigJobRunner>[0]> = {}) => new BaseConfigJobRunner({
  foreground: () => false, ready: () => true, memoryOkay: () => true, available: () => true, run: remote, publish: () => undefined, ...patch,
});

describe("exact background Base config counts", { timeout: 60_000 }, () => {
  it("bounded worker chunks equal the full builder including horizon fitting, all types and range Axis exactly once", async () => {
    const job = jobOf();
    const counter = new BaseConfigCounter(options);
    const gen = buildTapesGen(u, protects, options.cost, job.dcaOpt, new Set([pair]), common.tactics, null, { ...common.floors, baseConfigCounter: counter, countKinds: job.kinds });
    let tapes: ConfigTape[] = [];
    for (;;) { const r = gen.next(); if (r.done) { tapes = r.value; break; } }
    assert.ok(Array.isArray(tapes));
    const direct = counter.rows();
    assert.ok(direct.some((r) => r.closes > 0), "the fixture exercises closed outcomes");
    assert.deepEqual(new Set(direct.map((r) => r.kind)), new Set(job.kinds));
    assert.ok(direct.some((r) => r.notEvaluated.rangeFit), "full-grid horizon fallback is exercised across chunk boundary");
    // Independent return PF calculation from the actual retained simulator outcomes, with the exact net cost.
    for (const row of direct) {
      const cells = tapes.filter((t) => t.bot === row.bot && t.ind === row.ind && (t.protect.tag ?? "") === row.tag && t.kind === row.kind);
      const pfPassed = cells.filter((t) => {
        let gp = 0, gl = 0;
        for (let i = 0; i < t.r.length; i++) { const tr = tradeAt(t, i); if (tr.entryT < options.fromT || tr.exitT > options.cutT) continue; if (tr.r > 0) gp += tr.r; else gl -= tr.r; }
        return gp > 0 && (gl === 0 || gp / gl >= 1.1);
      }).length;
      assert.equal(row.pfPassed, pfPassed, `${row.tag}/${row.kind} direct net-return PF`);
    }
    const runner = runnerOf();
    runner.request(job);
    await until(() => runner.snapshot?.summary.state === "complete");
    assert.deepEqual(runner.snapshot!.rows, direct);
    assert.equal(runner.snapshot!.summary.doneChunks, 4, "two protect slices, one DCA slice and one Axis slice");
    assert.equal(runner.snapshot!.summary.plannedConfigured, direct.reduce((n, r) => n + r.configured, 0));
    assert.equal(runner.snapshot!.summary.donePairs, 1);
    for (const row of runner.snapshot!.rows) assert.equal(row.configured, row.evaluated + Object.values(row.notEvaluated).reduce((a, b) => a + b, 0));
    runner.cancel("test");
  });

  it("rejects an oversized normal/trailing worker job rather than monopolizing a core", async () => {
    await assert.rejects(remote({ ...common, type: "base-config-count", pair, protects, kinds: ["normal", "trailing"], seen: [] }), /at most 32/);
  });

  it("splits a large Axis family into bounded windows without repeated or omitted variant counts", async () => {
    const job = jobOf({ kinds: ["axis"], dcaOpt: { protects: wf.dcaProtects.slice(0, 1), dca: wf.dca,
      axis: { ...DEFAULT_SETTINGS.axis, modes: ["revert", "desk"], ranges: ["atr", "linear", "geo", "fib"], levelsSet: [2, 3, 4], hybrids: [false, true], perRange: true },
    } });
    const counter = new BaseConfigCounter(options);
    const g = buildTapesGen(u, protects, options.cost, job.dcaOpt, new Set([pair]), common.tactics, null, { ...common.floors, countOnly: true, countKinds: ["axis"], baseConfigCounter: counter });
    for (;;) { if (g.next().done) break; }
    const runner = runnerOf(); runner.request(job);
    await until(() => runner.snapshot?.summary.state === "complete");
    assert.ok(runner.snapshot!.summary.totalChunks >= 2);
    assert.deepEqual(runner.snapshot!.rows, counter.rows());
    assert.equal(runner.snapshot!.summary.configured, runner.snapshot!.summary.plannedConfigured);
    runner.cancel("test");
  });

  it("counts absent lane history as explicit not-evaluated cells rather than zero configurations", async () => {
    const noSeries = pair.replace("@m1", "@m30");
    const runner = runnerOf();
    runner.request(jobOf({ pairs: [noSeries], common: { ...common, floors: { ...common.floors, pairTags: { [noSeries]: ["", "sh", "gn"] } } } }));
    await until(() => runner.snapshot?.summary.state === "complete");
    assert.equal(runner.snapshot!.summary.evaluated, 0);
    assert.ok(runner.snapshot!.summary.configured > 0);
    assert.equal(runner.snapshot!.summary.configured, runner.snapshot!.summary.plannedConfigured);
    assert.equal(runner.snapshot!.rows.reduce((n, r) => n + (r.notEvaluated["no-series"] ?? 0), 0), runner.snapshot!.summary.configured);
    runner.cancel("test");
  });

  it("lets foreground work run between real slices and never queues the entire background grid", async () => {
    let foreground = false;
    let calls = 0;
    const runner = runnerOf({ foreground: () => foreground, run: async (m) => { calls++; foreground = true; return remote(m); } });
    runner.request(jobOf());
    await until(() => calls === 1);
    const began = performance.now();
    await runOnWorkers([{ type: "sleep", ms: 1 }], 1, 10_000, undefined, true);
    assert.ok(performance.now() - began < 2000, "foreground priority does not wait for the full grid");
    await until(() => runner.snapshot?.summary.doneChunks === 1);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(calls, 1, "foreground holds subsequent chunks; only the current bounded slice was sent");
    runner.cancel("test");
  });

  it("discards stale in-flight results and resets dedup identities for a replacement of the same pair", async () => {
    let resolveOld!: (r: BaseConfigChunkReply) => void;
    let calls = 0;
    const messages: BaseConfigChunkMessage[] = [];
    const runner = runnerOf({ run: async (m) => {
      messages.push(m); calls++;
      if (calls === 1) return new Promise((r) => { resolveOld = r; });
      return skippedReply(m);
    } });
    runner.request(jobOf());
    await until(() => calls === 1);
    runner.request(jobOf({ key: "new-cut", settingsAt: 2, protects: protects.slice(0, 1), dcaOpt: undefined, kinds: ["normal"] }));
    resolveOld({ rows: [{ bot: "follow", ind: pair.split("|")[1], tag: "sh", kind: "normal", configured: 99 } as never], seen: ["old-config"] });
    await until(() => runner.snapshot?.summary.state === "complete");
    assert.equal(runner.snapshot!.summary.key, "new-cut");
    assert.equal(runner.snapshot!.summary.configured, 1);
    assert.deepEqual(messages[1].seen, []);
    runner.cancel("test");
  });

  it("stop/cancel prevents publication of in-flight outcomes", async () => {
    let release!: (r: BaseConfigChunkReply) => void;
    let started = false;
    const runner = runnerOf({ run: () => { started = true; return new Promise((r) => { release = r; }); } });
    runner.request(jobOf()); await until(() => started);
    runner.cancel("stopped"); release({ rows: [], seen: [] });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(runner.snapshot!.summary.state, "cancelled");
    assert.equal(runner.snapshot!.summary.reason, "stopped");
    assert.equal(runner.snapshot!.summary.doneChunks, 0);
  });

  it("clears identities after a completed partial slice when the same pair is replaced", async () => {
    let foreground = false;
    const messages: BaseConfigChunkMessage[] = [];
    const runner = runnerOf({ foreground: () => foreground, run: async (m) => {
      messages.push(m); foreground = true;
      return skippedReply(m);
    } });
    runner.request(jobOf());
    await until(() => runner.snapshot?.summary.doneChunks === 1);
    assert.equal(runner.snapshot!.summary.state, "partial");
    runner.request(jobOf({ key: "replacement", settingsAt: 2 }));
    foreground = false;
    await until(() => messages.length === 2);
    assert.deepEqual(messages[1].seen, [], "the first completed old slice cannot suppress new evaluation");
    runner.cancel("test");
  });

  it("memory and worker failures leave unknown cells explicit, with no foreground fallback", async () => {
    let calls = 0;
    const memory = runnerOf({ memoryOkay: () => false, run: async () => { calls++; return { rows: [], seen: [] }; } });
    memory.request(jobOf()); await until(() => memory.snapshot?.summary.state === "error");
    assert.equal(calls, 0); assert.equal(memory.snapshot!.summary.reason, "memoryPressure");
    const failure = runnerOf({ run: async () => { throw new Error("fixture worker failure"); } });
    failure.request(jobOf()); await until(() => failure.snapshot?.summary.state === "error");
    assert.match(failure.snapshot!.summary.error!, /fixture worker failure/);
    assert.equal(failure.snapshot!.summary.evaluated, 0);
    memory.cancel("test"); failure.cancel("test");
  });

  it("retries the same identity after memory recovers, releases terminal source buffers, and marks completed old settings stale", async () => {
    let okay = false;
    let calls = 0;
    const runner = runnerOf({ memoryOkay: () => okay, run: async (m) => { calls++; return skippedReply(m); } });
    const j = jobOf({ protects: protects.slice(0, 1), dcaOpt: undefined, kinds: ["normal"] });
    runner.request(j); await until(() => runner.snapshot?.summary.state === "error");
    assert.equal((runner as unknown as { job: unknown }).job, null, "memory guard releases shared source history");
    okay = true; runner.request(j); await until(() => runner.snapshot?.summary.state === "complete");
    assert.equal(calls, 1);
    assert.equal((runner as unknown as { job: unknown }).job, null, "completed cache retains rows/provenance only");
    runner.cancel("settingsChanged");
    assert.equal(runner.snapshot!.summary.state, "cancelled");
    assert.equal(runner.snapshot!.summary.reason, "settingsChanged");
  });

  it("persists provenance and restores prior counts as cancelled, never as the current successful cut", () => {
    let saved: BaseConfigSnapshot | undefined;
    const runner = runnerOf({ publish: (v) => { saved = structuredClone(v); } });
    runner.request(jobOf({ pairs: [], reason: "focusExcluded" }));
    assert.equal(saved!.summary.state, "complete");
    assert.equal(saved!.summary.reason, "focusExcluded");
    const restored = runnerOf(); restored.restore(saved);
    assert.equal(restored.snapshot!.summary.state, "cancelled");
    assert.equal(restored.snapshot!.summary.reason, "restartRequired");
    assert.equal(restored.snapshot!.summary.cutT, options.cutT);
    assert.equal(restored.snapshot!.summary.cost, options.cost);
    const j = jobOf(); const hash = baseConfigJobKey(j);
    assert.equal(hash, baseConfigJobKey(j));
    assert.notEqual(hash, baseConfigJobKey({ ...j, common: { ...j.common, cost: j.common.cost + 0.001 } }));
    const changed = structuredClone(bars); changed[0].c[200] += 1;
    assert.notEqual(hash, baseConfigJobKey({ ...j, common: { ...j.common, bars: changed } }));
    runner.cancel("test"); restored.cancel("test");
  });
});
