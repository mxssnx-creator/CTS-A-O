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
import {
  buildTapes,
  defaultWalkForward,
  floorsForPairs,
  mergeBuildStats,
  packTapes,
  unpackTapes,
  walkForward,
  type TapeBuildStat,
} from "../sim/walkforward.ts";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS, STRATEGY_PRESETS } from "../config.ts";
import {
  closePool,
  poolWorkers,
  runOnWorkers,
  shareBars,
  shareTapes,
  slices,
} from "./pool.server.ts";

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
    const res = await runOnWorkers<{ runsJson: string[] }>(
      parts.map((c) => ({ type: "s1", bars: lanes, combos: c, cost: s.cost, tactics: s.tactics })),
      3,
    );
    const key = (r: ComboRun) =>
      `${r.id}:${r.full.n}:${r.full.pf.toFixed(6)}:${r.score.toFixed(6)}`;
    const remote = res.flatMap((x) => x.runsJson.flatMap((c) => JSON.parse(c) as ComboRun[]));
    assert.ok(local.length > 50);
    assert.deepEqual(remote.map(key).sort(), local.map(key).sort());
  });

  it("preset Compare (simulated trading) on workers equals the in-process walk-forward", async () => {
    const tapes = buildTapes(u, wf.protects, s.cost, dcaOpt, new Set(pairs), s.tactics);
    const names = Object.keys(STRATEGY_PRESETS).slice(0, 4);
    // (a small synthetic fixture: seats from 3 closes, so the comparison has trades to compare)
    const o = { ...wf, simH: 48, validLastN: 0, lastN: 0, gates: { ...wf.gates, minTrades: 3 } };
    const local = names.map(
      (name) => walkForward(u, tapes, { ...o, toggles: STRATEGY_PRESETS[name].toggles }).stats,
    );
    const res = await runOnWorkers<{ results: Array<{ name: string; stats: (typeof local)[0] }> }>(
      [names.slice(0, 2), names.slice(2)].map((pp) => ({
        type: "compare",
        nowT: u.nowT,
        baseTf: u.baseTf,
        packed: packTapes(tapes),
        wf: o,
        presets: pp.map((name) => ({ name, toggles: STRATEGY_PRESETS[name].toggles })),
      })),
      2,
    );
    const remote = new Map(res.flatMap((r) => r.results).map((x) => [x.name, x.stats]));
    assert.ok(local.some((st) => st.n > 0));
    names.forEach((name, i) => assert.deepEqual(remote.get(name), local[i], name));
  });

  it("shared-memory bars and tapes carry the same data and give the same worker results", async () => {
    const sb = shareBars(bars);
    for (let i = 0; i < bars.length; i++)
      for (const k of ["t", "o", "h", "l", "c", "v"] as const) {
        assert.ok(sb[i][k].buffer instanceof SharedArrayBuffer);
        assert.deepEqual([...sb[i][k]], [...bars[i][k]]);
      }
    const tapes = buildTapes(
      u,
      wf.protects,
      s.cost,
      dcaOpt,
      new Set(pairs.slice(0, 10)),
      s.tactics,
    );
    const st = shareTapes(tapes as never) as unknown as typeof tapes;
    assert.ok(st[0].r.buffer instanceof SharedArrayBuffer);
    for (let i = 0; i < tapes.length; i++) {
      assert.deepEqual([...st[i].r], [...tapes[i].r]);
      assert.deepEqual([...st[i].exitT], [...tapes[i].exitT]);
      assert.equal(st[i].fromT, tapes[i].fromT);
    }
    // packed: one shared buffer + one metadata string; unpacked tapes are identical to the originals
    const packed = packTapes(tapes);
    assert.ok(packed.sab instanceof SharedArrayBuffer);
    const up = unpackTapes(packed);
    assert.equal(up.length, tapes.length);
    for (let i = 0; i < tapes.length; i++) {
      for (const k of [
        "exitT",
        "entryT",
        "r",
        "entry",
        "symI",
        "side",
        "gp",
        "gl",
        "rs",
        "r2",
        "level",
        "vol",
      ] as const)
        assert.deepEqual([...up[i][k]], [...tapes[i][k]], `${tapes[i].id} ${k}`);
      assert.equal(up[i].id, tapes[i].id);
      assert.equal(up[i].fromT, tapes[i].fromT);
      assert.deepEqual(up[i].open, tapes[i].open);
      assert.deepEqual(up[i].syms, tapes[i].syms);
    }
    const name = Object.keys(STRATEGY_PRESETS)[0];
    const o = { ...wf, simH: 48 };
    const local = walkForward(u, tapes, { ...o, toggles: STRATEGY_PRESETS[name].toggles }).stats;
    const [res] = await runOnWorkers<{ results: Array<{ stats: typeof local }> }>(
      [
        {
          type: "compare",
          nowT: u.nowT,
          baseTf: u.baseTf,
          packed,
          wf: o,
          presets: [{ name, toggles: STRATEGY_PRESETS[name].toggles }],
        },
      ],
      1,
    );
    assert.deepEqual(res.results[0].stats, local);
    const [b1raw] = await runOnWorkers<{ runsJson: string[] }>(
      [{ type: "s1", bars: sb, combos: combos.slice(0, 8), cost: s.cost, tactics: s.tactics }],
      1,
    );
    const direct = combos
      .slice(0, 8)
      .map((c) => runCombo(u, c.bot, c.ind, DEFAULT_PROTECT, s.cost, 1, s.tactics))
      .filter(Boolean);
    assert.deepEqual(
      b1raw.runsJson
        .flatMap((c) => JSON.parse(c) as Array<{ id: string; score: number }>)
        .map((r) => `${r.id}:${r.score}`),
      direct.map((r) => `${r!.id}:${r!.score}`),
    );
  });

  it("workers are reused across calls (no new threads per call) and released on demand", async () => {
    await closePool();
    const msg = () => [
      {
        type: "s1",
        bars: shareBars(bars),
        combos: combos.slice(0, 2),
        cost: s.cost,
        tactics: s.tactics,
      },
    ];
    await runOnWorkers(msg(), 2);
    const after1 = poolWorkers();
    for (let i = 0; i < 4; i++) await runOnWorkers(msg(), 2);
    assert.equal(poolWorkers(), after1, "same workers reused");
    assert.ok(after1 >= 1 && after1 <= 2);
    await closePool();
    assert.equal(poolWorkers(), 0);
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
    // no caller floors: the worker's own completeness record must not turn into floors (a missing minSl made every
    // worker stop NaN: "…|slNaN|…")
    assert.deepEqual(remote.filter((t) => /NaN/.test(t.id)).map((t) => t.id), []);
    for (let i = 0; i < local.length; i++) {
      assert.equal(remote[i].id, local[i].id);
      assert.equal(remote[i].n, local[i].n);
      assert.deepEqual([...remote[i].r], [...local[i].r]);
      assert.deepEqual([...remote[i].gp], [...local[i].gp]);
      assert.deepEqual(remote[i].pending, local[i].pending);
    }
  });

  it("a tape message's floors hold only its pairs' entries and held ids, the rest as given", () => {
    const P = { tp: 0.01, sl: 0.005, trail: 0, hold: 8 };
    const tags = { "x|a": ["mn"], "x|b": [""], "y|c": ["sh"] };
    const floors = {
      minSl: 0.004,
      minTrail: 0.002,
      pairTags: tags,
      pairTps: { "x|a": { mn: [0.008] }, "y|c": { sh: [0.02] } },
      pairProtects: { "x|b": [P], "y|d": [P] },
      // "x|ab|…" is pair x|ab: not taken for x|a by its prefix
      heldIds: new Set(["x|a|tp0.8|sl0.4|tr0|h8|mn", "x|b|tp1|sl0.5|tr0|h8", "y|c|tp2|sl1|tr0|h8|sh", "x|ab|tp1|sl0.5|tr0|h8"]),
    };
    const cut = floorsForPairs(floors)(["x|a", "x|b"]);
    assert.deepEqual(cut.pairTags, { "x|a": ["mn"], "x|b": [""] });
    assert.deepEqual(cut.pairTps, { "x|a": { mn: [0.008] } });
    assert.deepEqual(cut.pairProtects, { "x|b": [P] });
    assert.deepEqual([...cut.heldIds!], ["x|a|tp0.8|sl0.4|tr0|h8|mn", "x|b|tp1|sl0.5|tr0|h8"]);
    assert.equal(cut.minSl, 0.004);
    assert.equal(cut.minTrail, 0.002);
    // a pair with no entry stays without one (no Base ranges listed: it computes every cell)
    assert.deepEqual(floorsForPairs(floors)(["z|e"]).pairTags, {});
    // floors without the per-pair maps get none
    assert.deepEqual(floorsForPairs({ minSl: 0.004, minTrail: 0.002 })(["x|a"]), { minSl: 0.004, minTrail: 0.002 });
  });

  it("tapes built on workers from each message's floors equal the in-process ones from the whole floors", async () => {
    // two cells each of two Minimal and two Short targets, a pair's own config beside them
    const pick = (tag: string) => {
      const tps = [...new Set(wf.protects.filter((p) => p.tag === tag).map((p) => p.tp))].slice(0, 2);
      return tps.flatMap((tp) => wf.protects.filter((p) => p.tag === tag && p.tp === tp).slice(0, 2));
    };
    const protects = [...pick("mn"), ...pick("sh")];
    const mnTp = protects[0].tp;
    const own = { tp: 0.012, sl: 0.006, trail: 0.004, hold: 8 };
    const pairTags: Record<string, string[]> = {};
    const pairTps: Record<string, Record<string, number[]>> = {};
    const pairProtects: Record<string, (typeof own)[]> = {};
    pairs.forEach((k, i) => {
      if (i % 3 === 0) pairTags[k] = ["mn"];
      else if (i % 3 === 1) pairTags[k] = ["mn", "sh"];
      if (i % 2 === 0) pairTps[k] = { mn: [mnTp] };
      if (i % 5 === 0) pairProtects[k] = [own];
    });
    // held: the Short configs of the Minimal-only pairs (built held-only, outside their Base ranges)
    const all = buildTapes(u, protects, s.cost, undefined, new Set(pairs), s.tactics, null, { minSl: 0.004, minTrail: 0.002 });
    const heldIds = new Set(
      all.filter((t) => t.protect.tag === "sh" && pairs.indexOf(`${t.bot}|${t.ind}`) % 3 === 0).map((t) => t.id),
    );
    assert.ok(heldIds.size > 0);
    const floors = { minSl: 0.004, minTrail: 0.002, pairTags, pairTps, pairProtects, heldIds };
    const local = buildTapes(u, protects, s.cost, undefined, new Set(pairs), s.tactics, null, floors);
    const localIds = new Set(local.map((t) => t.id));
    assert.ok(all.some((t) => !localIds.has(t.id)), "the floors filter cells");
    assert.ok(local.some((t) => heldIds.has(t.id)), "held configs keep their tapes");
    assert.ok(local.some((t) => t.protect.trail === own.trail && !t.protect.tag), "a pair's own config is built");
    const floorsOf = floorsForPairs(floors);
    const res = await runOnWorkers<{ tapes: typeof local }>(
      slices(pairs, 4).map((pp) => ({
        type: "tapes",
        bars,
        pairs: pp,
        protects,
        cost: s.cost,
        dcaOpt: undefined,
        tactics: s.tactics,
        adjust: null,
        floors: floorsOf(pp),
      })),
      2,
    );
    const remote = res.flatMap((x) => x.tapes);
    assert.deepEqual(
      remote.map((t) => `${t.id}:${t.n}`),
      local.map((t) => `${t.id}:${t.n}`),
    );
  });

  it("with the caller's floors, the workers' completeness record (merged) equals the in-process one", async () => {
    const floors = { minSl: 0.004, minTrail: 0.002 };
    const localStats = new Map<string, TapeBuildStat>();
    const local = buildTapes(u, wf.protects.slice(0, 6), s.cost, dcaOpt, new Set(pairs), s.tactics, null, {
      ...floors,
      buildStats: localStats,
    });
    const res = await runOnWorkers<{ tapes: typeof local; buildStats?: TapeBuildStat[] }>(
      slices(pairs, 4).map((pp) => ({
        type: "tapes",
        bars,
        pairs: pp,
        protects: wf.protects.slice(0, 6),
        cost: s.cost,
        dcaOpt,
        tactics: s.tactics,
        adjust: null,
        floors,
      })),
      2,
    );
    assert.deepEqual(
      res.flatMap((x) => x.tapes).map((t) => t.id),
      local.map((t) => t.id),
    );
    const merged = new Map<string, TapeBuildStat>();
    for (const r of res) mergeBuildStats(merged, r.buildStats ?? []);
    const norm = (m: Map<string, TapeBuildStat>) =>
      [...m.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([k, x]) => [k, x.grid, x.built, x.kept, x.few, JSON.stringify(x.skip), x.tps.length, x.sls.length, x.trails.length]);
    assert.ok(localStats.size > 0);
    assert.deepEqual(norm(merged), norm(localStats));
  });

  it("progress reaches 1 when every message is done, never backwards (short parts post no progress of their own)", async () => {
    // before: a worker posts tape progress at most every 400 ms, so a part shorter than that never reported its
    // end and the stage stayed at "Signals 0 %" until the next stage
    const seen: number[] = [];
    await runOnWorkers(
      slices(pairs.slice(0, 6), 6).map((pp) => ({
        type: "tapes",
        bars,
        pairs: pp,
        protects: wf.protects.slice(0, 2),
        cost: s.cost,
        dcaOpt: undefined,
        tactics: s.tactics,
        adjust: null,
      })),
      2,
      15 * 60_000,
      (f) => seen.push(f),
    );
    assert.ok(seen.length > 0, "progress reported");
    for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1], `backwards at ${i}: ${seen[i - 1]} → ${seen[i]}`);
    assert.ok(seen.every((f) => f >= 0 && f <= 1));
    assert.equal(seen[seen.length - 1], 1);
  });
});
