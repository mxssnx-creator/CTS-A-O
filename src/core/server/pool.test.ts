// Worker-thread tapes / Base scores must be identical to the in-process computation (same data, same order).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import {
  allCombos,
  baseRuns,
  makeUniverse,
  runCombo,
  type ComboRun,
} from "../pipeline/pipeline.ts";
import { resample } from "../market/bars.ts";
import { buildTapes, defaultWalkForward } from "../sim/walkforward.ts";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import { runOnWorkers, slices } from "./pool.server.ts";

const END = Date.UTC(2026, 8, 20);

describe("worker pool", { timeout: 300_000 }, () => {
  const bars = ["A", "B", "C"].map((s) =>
    barsFromCandles(`${s}-USDT`, 15, syntheticCandles(s, 15, 1500, END)),
  );
  const u = makeUniverse(bars);
  const s = { ...DEFAULT_SETTINGS, tfMin: 15 };
  const wf = defaultWalkForward(s);
  const combos = allCombos().slice(0, 60);
  const pairs = combos.map((c) => `${c.bot}|${c.ind}`);
  const dcaOpt = { protects: wf.dcaProtects, dca: wf.dca, axis: s.axis };

  it("engine Base (lanes, round-robin over workers) equals the in-process Base exactly", async () => {
    const cs = syntheticCandles("L", 1, 6000, END);
    const lanes = [1, 5, 15, 30].map((tf) =>
      barsFromCandles("L-USDT", tf, tf === 1 ? cs : resample(cs, 1, tf)),
    );
    const lu = makeUniverse(lanes);
    const lc = allCombos(undefined, undefined, [1, 5, 15, 30]).filter((_, i) => i % 37 === 0);
    const local = baseRuns(lu, lc, s.cost, s.tactics);
    const parts: Array<typeof lc> = [[], [], []];
    lc.forEach((c, i) => parts[i % 3].push(c));
    const res = await runOnWorkers<{ runs: ComboRun[] }>(
      parts.map((c) => ({ type: "s1", bars: lanes, combos: c, cost: s.cost, tactics: s.tactics })),
      3,
    );
    const key = (r: ComboRun) =>
      `${r.id}:${r.full.n}:${r.full.pf.toFixed(6)}:${r.score.toFixed(6)}`;
    const remote = res.flatMap((x) => x.runs);
    assert.ok(local.length > 50);
    assert.deepEqual(remote.map(key).sort(), local.map(key).sort());
  });

  it("Base scores match the in-process ones", async () => {
    const local = combos
      .map((c) => runCombo(u, c.bot, c.ind, DEFAULT_PROTECT, s.cost, 1, s.tactics))
      .filter(Boolean)
      .map((r) => ({ pair: `${r!.bot}|${r!.ind}`, score: r!.score }));
    const res = await runOnWorkers<{ scores: typeof local }>(
      slices(combos, 4).map((c) => ({
        type: "base",
        bars,
        combos: c,
        cost: s.cost,
        tactics: s.tactics,
      })),
      2,
    );
    assert.deepEqual(
      res.flatMap((x) => x.scores),
      local,
    );
  });

  it("tapes match the in-process ones exactly, in the same order", async () => {
    const local = buildTapes(
      u,
      wf.protects.slice(0, 6),
      s.cost,
      dcaOpt,
      new Set(pairs),
      s.tactics,
      null,
    );
    const res = await runOnWorkers<{ tapes: typeof local }>(
      slices(pairs, 4).map((pp) => ({
        type: "tapes",
        bars,
        pairs: pp,
        protects: wf.protects.slice(0, 6),
        cost: s.cost,
        dcaOpt,
        tactics: s.tactics,
        adjust: null,
      })),
      2,
    );
    const remote = res.flatMap((x) => x.tapes);
    assert.equal(remote.length, local.length);
    for (let i = 0; i < local.length; i++) {
      assert.equal(remote[i].id, local[i].id);
      assert.equal(remote[i].n, local[i].n);
      assert.deepEqual([...remote[i].r], [...local[i].r]);
      assert.deepEqual([...remote[i].gp], [...local[i].gp]);
      assert.deepEqual(remote[i].pending, local[i].pending);
    }
  });
});
