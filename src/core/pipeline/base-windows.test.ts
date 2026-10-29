// Two-window Base (gates.baseWindows): a pair's Base cell judged on windows of its lane's own history as well as on the
// whole of it. Unset, Base computes exactly what it did; `report` rules only add their readout (never a pass, a target or
// a stat); the `gate` rule drops a cell that fails its windows — and drops exactly what the report readout of the same
// rule lists, so one report run reads every rule's gated run.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS, RT_COST, type CoreSettings } from "../config.ts";
import type { BaseWindowRule, Gates } from "../domain/types.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { microIndRule, rangeMinTfOf } from "../minimal-coord.ts";
import { checkSettings } from "../settings-check.ts";
import { baseWindowsPlan, judgeBaseWindows } from "./base-windows.ts";
import {
  baseRangeCounts,
  baseRangeProtects,
  baseRangeWhy,
  basePairRows,
  basePassTags,
  baseRuleTags,
  baseRuns,
  baseSetsGates,
  cellStats,
  laneFromT,
  makeUniverse,
  passesBase,
  runCombo,
  runPipelineSync,
  type ComboRun,
} from "./pipeline.ts";

const H = 3_600_000;
const T_END = Date.UTC(2026, 9, 1);
const ALL = ["mc", "mn", "mp", "sh", "gn", "lg"] as const;
const grid = { ...DEFAULT_SETTINGS.grid, holdH: [16] };
const protects = baseRangeProtects(grid, RT_COST);
// lenient closes so the synthetic cells pass Base
const gates0: Gates = { ...DEFAULT_SETTINGS.gates, minTrades: 3 };
const withWindows = (bw: Gates["baseWindows"]): Gates => ({ ...gates0, baseWindows: bw });
// a 15m lane of 12.5 days and a 5m lane of 6.25 days: each lane's windows start at its own first bar
const universe = () =>
  makeUniverse([
    barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1200, T_END, 3)),
    barsFromCandles("A-USDT", 5, syntheticCandles("A-USDT", 5, 1800, T_END, 7)),
    barsFromCandles("B-USDT", 5, syntheticCandles("B-USDT", 5, 1800, T_END, 11)),
  ]);
// pairs that pass Base on this universe, some of them in one stretch (the halves drop a range or the default cell)
const COMBOS = [
  { bot: "revert", ind: "break-squeeze-t10@m5" },
  { bot: "follow", ind: "break-squeeze-t10@m15" },
  { bot: "revert", ind: "break-atr@m15" },
  { bot: "follow", ind: "rsi-extreme@m5" },
  { bot: "revert", ind: "trend-ribbon@m5" },
  { bot: "follow", ind: "mc-rsi2-5@m5" },
  { bot: "revert", ind: "mc-rsi2-5@m5" },
];
const base = (u: ReturnType<typeof universe>, g: Gates) =>
  baseRuns(
    u,
    COMBOS,
    RT_COST,
    null,
    false,
    false,
    undefined,
    protects,
    rangeMinTfOf(grid),
    microIndRule(grid),
    g,
  );
/** a run without the readout's own fields (bw on every cell, ruleTps) */
const strip = (r: ComboRun) => {
  const { ruleTps: _r, ...rest } = r;
  const { bw: _f, ...full } = r.full;
  const ranges = r.ranges
    ? Object.fromEntries(
        Object.entries(r.ranges).map(([t, st]) => [t, (({ bw: _b, ...x }) => x)(st)]),
      )
    : undefined;
  return { ...rest, full, ...(ranges ? { ranges } : {}) };
};
const sorted = (xs: readonly number[] | null | undefined) => [...(xs ?? [])].sort((a, b) => a - b);

/** closes at hour marks h (exit order) with returns r, over [0, nowH) */
const closes = (xs: Array<[number, number]>) => ({
  n: xs.length,
  exitT: xs.map(([h]) => h * H),
  r: xs.map(([, r]) => r),
});
const judge = (
  rule: BaseWindowRule,
  c: ReturnType<typeof closes>,
  nowH = 100,
  g: Partial<Gates> = {},
) =>
  judgeBaseWindows(
    baseWindowsPlan({ ...gates0, ...g, baseWindows: { gate: rule } })!,
    "mn",
    0,
    nowH * H,
    c.n,
    c.exitT,
    c.r,
  )?.gate;

describe("two-window Base: the windows of one cell", () => {
  it("the halves gate refuses a cell that won only in its first half and admits a steady one (the same whole-history PF)", () => {
    // whole history PF 1.25 both: 6 wins of 1 % then 6 losses of 0.8 % / the same closes alternating
    const early = closes([
      ...[5, 10, 15, 20, 25, 30].map((h) => [h, 0.01] as [number, number]),
      ...[55, 60, 65, 70, 75, 80].map((h) => [h, -0.008] as [number, number]),
    ]);
    const steady = closes(
      [5, 10, 15, 20, 25, 30, 55, 60, 65, 70, 75, 80].map(
        (h, i) => [h, i % 2 ? -0.008 : 0.01] as [number, number],
      ),
    );
    assert.equal(judge({ split: 2 }, early), false);
    assert.equal(judge({ split: 2 }, steady), true);
    // the gate is what Base reads: a cell that passes its whole history fails Base on its windows
    const st = { n: 12, pf: 1.25, net: 1.2, mdd: 4.8 };
    const g = { minPf: 1, minTrades: 3 };
    assert.equal(passesBase(st, g), true);
    assert.equal(passesBase({ ...st, bw: { gate: false } }, g), false);
    assert.equal(
      passesBase({ ...st, bw: { gate: true, report: [false] } }, g),
      true,
      "report rules never gate",
    );
    // 1 of 2 halves is enough with need 1
    assert.equal(judge({ split: 2, need: 1 }, early), true);
  });

  it("a block with fewer than minN closes is not judged (passes); the recent window widens to 2 × recentH", () => {
    // thirds of 100 h: two losing closes in the first third, winners after
    const c = closes([
      [5, -0.01],
      [10, -0.01],
      [40, 0.01],
      [45, 0.01],
      [50, 0.01],
      [70, 0.01],
      [75, 0.01],
      [80, 0.01],
    ]);
    assert.equal(judge({ split: 3 }, c), true, "2 closes < minN 3: the block counts as passed");
    assert.equal(judge({ split: 3, minN: 2 }, c), false, "judged at minN 2");
    assert.equal(judge({ split: 3, minN: 2, need: 2 }, c), true);
    // the last 10 h hold 2 closes (under minN): unwidened not judged, widened the last 20 h (5 closes) are
    const r = closes([
      [50, 0.01],
      [82, -0.01],
      [84, -0.01],
      [86, -0.01],
      [92, 0.002],
      [95, 0.002],
    ]);
    assert.equal(judge({ recentH: 10 }, r), true);
    assert.equal(judge({ recentH: 10, widen: true }, r), false);
    const r2 = closes([
      [50, 0.01],
      [82, 0.01],
      [84, 0.01],
      [86, -0.01],
      [92, 0.002],
      [95, 0.002],
    ]);
    assert.equal(judge({ recentH: 10, widen: true }, r2), true);
    // the whole recent window losing fails, with or without widening
    assert.equal(judge({ recentH: 30, widen: true }, r), false);
    // both windows of a rule must pass
    assert.equal(judge({ split: 2, recentH: 30 }, r), false);
  });

  it("defaults: every block, minN 3, the Base floor (baseSetsMinPf) as PF floor with net > 0 dropped under 1; ranges pick the tags", () => {
    const plan = baseWindowsPlan(withWindows({ gate: { split: 3 } }))!;
    assert.deepEqual([plan.gate!.need, plan.gate!.minN, plan.gate!.minPf], [3, 3, 1.25]);
    assert.equal(
      baseWindowsPlan({ ...gates0, baseSetsMinPf: 0.9, baseWindows: { gate: { split: 2 } } })!.gate!
        .minPf,
      0.9,
    );
    // a losing half at PF 0.95 passes a 0.9 floor (no positive net asked), not the default 1
    const c = closes([
      [10, 0.01],
      [20, 0.01],
      [30, 0.01],
      [60, 0.0095],
      [70, -0.01],
      [80, 0.0095],
      [90, -0.01],
      [95, 0.0005],
    ]);
    assert.equal(judge({ split: 2 }, c), false);
    assert.equal(judge({ split: 2, minPf: 0.9 }, c), true);
    assert.equal(judge({ split: 2 }, c, 100, { baseSetsMinPf: 0.9 }), true);
    // ranges: a tag outside them is not judged by the gate (no verdict at all) and passes a report rule
    const p = baseWindowsPlan(
      withWindows({
        gate: { split: 2, ranges: ["mn", "wide"] },
        report: [{ split: 2, ranges: ["sh"] }],
      }),
    )!;
    const early = closes([
      [10, 0.01],
      [20, 0.01],
      [30, 0.01],
      [60, -0.01],
      [70, -0.01],
      [80, -0.01],
    ]);
    const at = (tag: string) => judgeBaseWindows(p, tag, 0, 100 * H, early.n, early.exitT, early.r);
    assert.deepEqual(at("mn"), { gate: false, report: [true] });
    assert.deepEqual(at(""), { gate: false, report: [true] }, "the default cell is 'wide'");
    assert.deepEqual(at("sh"), { report: [false] });
    // unset, empty or judging nothing: no plan, nothing computed
    assert.equal(baseWindowsPlan(gates0), null);
    assert.equal(baseWindowsPlan(withWindows({})), null);
    assert.equal(baseWindowsPlan(withWindows({ report: [] })), null);
    assert.equal(baseWindowsPlan(withWindows({ gate: {} }))?.gate ?? null, null);
  });
});

describe("two-window Base in the Base stage", () => {
  it("unset: Base computes what it did — no window field, the cell stats and the pass tags of the readout's run", () => {
    const u = universe();
    const off = base(u, gates0);
    const json = JSON.stringify(off);
    assert.ok(
      !json.includes('"bw"') && !json.includes('"ruleTps"'),
      "no readout field while unset",
    );
    const on = base(u, withWindows({ report: [{ split: 2 }] }));
    assert.deepEqual(on.map(strip), off, "the readout adds its fields and nothing else");
    // a cell's stats: the same with and without the windows
    const p = protects.find((x) => x.tag === "mn")!;
    const plan = baseWindowsPlan(withWindows({ report: [{ split: 2 }] }))!;
    const plain = cellStats(u, "follow", "mc-rsi2-5@m5", p, RT_COST, null);
    const judged = cellStats(u, "follow", "mc-rsi2-5@m5", p, RT_COST, null, {
      plan,
      fromT: laneFromT(u, "mc-rsi2-5@m5"),
    });
    assert.ok(plain && judged && judged.bw?.report?.length === 1 && !("bw" in plain));
    const { bw: _bw, ...rest } = judged;
    assert.deepEqual(rest, plain);
  });

  it("report-only never changes the pass tags or rangeTps; each rule's targets are a subset of rangeTps, and some rule drops some", () => {
    const u = universe();
    const sets = baseSetsGates(gates0);
    const off = base(u, gates0);
    const report = [
      { split: 2 },
      { split: 3, need: 2 },
      { recentH: 24, widen: true },
      { split: 2, minPf: 1.5 },
    ];
    const on = base(u, withWindows({ report }));
    let dropped = 0;
    for (let i = 0; i < on.length; i++) {
      assert.deepEqual(basePassTags(on[i], sets, ALL), basePassTags(off[i], sets, ALL), on[i].id);
      assert.deepEqual(on[i].rangeTps, off[i].rangeTps);
      assert.equal(on[i].ruleTps?.length, report.length);
      assert.equal(on[i].full.bw?.report?.length, report.length);
      for (const per of on[i].ruleTps ?? [])
        for (const [t, tps] of Object.entries(per)) {
          for (const tp of tps)
            assert.ok(on[i].rangeTps?.[t]?.includes(tp), `${on[i].id} ${t} ${tp} ⊆ rangeTps`);
          dropped += (on[i].rangeTps?.[t]?.length ?? 0) - tps.length;
        }
      for (const per of on[i].ruleTps ?? [])
        for (const [t, tps] of Object.entries(on[i].rangeTps ?? {}))
          dropped += per[t] ? 0 : tps.length;
    }
    assert.ok(dropped > 0, "a rule keeps fewer targets than Base passed");
  });

  it("the gate drops exactly the cells that fail it: its pass tags and targets are the report readout of the same rule", () => {
    const u = universe();
    const sets = baseSetsGates(gates0);
    const rule = { split: 2 };
    const read = base(u, withWindows({ report: [rule] }));
    const gated = base(u, withWindows({ gate: rule }));
    let narrowed = 0;
    for (let i = 0; i < read.length; i++) {
      const tags = basePassTags(read[i], sets, ALL);
      const want = baseRuleTags(read[i], tags)[0];
      const got = basePassTags(gated[i], sets, ALL);
      assert.deepEqual([...got].sort(), Object.keys(want).sort(), read[i].id);
      for (const t of got)
        if (t && read[i].ranges?.[t])
          assert.deepEqual(sorted(gated[i].rangeTps?.[t]), sorted(want[t]), `${read[i].id} ${t}`);
      if (got.length < tags.length) narrowed++;
      // a gated run's cells carry the gate verdict, not the report
      assert.equal(typeof gated[i].full.bw?.gate, "boolean");
      assert.equal(gated[i].ruleTps, undefined);
    }
    assert.ok(narrowed > 0, "the gate narrows some pair's ranges");
  });

  it("the dump rows carry a passing pair's rules only while report rules are set; the why rows count the gate only while it is set", () => {
    const u = universe();
    const sets = baseSetsGates(gates0);
    const tagsOf = (runs: ComboRun[]) =>
      Object.fromEntries(
        runs.flatMap((r) =>
          basePassTags(r, sets, ALL).length
            ? [[`${r.bot}|${r.ind}`, basePassTags(r, sets, ALL)]]
            : [],
        ),
      );
    const off = base(u, gates0);
    assert.ok(basePairRows(off, tagsOf(off)).every((x) => !("rules" in x)));
    const on = base(u, withWindows({ report: [{ split: 2 }, { recentH: 48 }] }));
    const rows = basePairRows(on, tagsOf(on));
    assert.ok(rows.some((x) => x.passed));
    for (const x of rows)
      assert.equal(x.passed ? x.rules?.length : x.rules, x.passed ? 2 : undefined);
    // grid.baseTargets off: every target of a range that passes the rule
    for (const x of basePairRows(on, tagsOf(on), false))
      for (const k of x.rules ?? []) for (const v of Object.values(k)) assert.equal(v, null);
    // why: the windows reason only with the gate; its passes agree with baseRangeCounts
    assert.ok(baseRangeWhy(on, sets, ALL).every((x) => !("windows" in x.first)));
    const gated = base(u, withWindows({ gate: { split: 2 } }));
    const g = withWindows({ gate: { split: 2 } });
    const why = baseRangeWhy(gated, baseSetsGates(g), ALL);
    const counts = baseRangeCounts(gated, baseSetsGates(g), ALL);
    assert.ok(
      why.some((x) => (x.first.windows ?? 0) > 0),
      "some pair fails the windows alone",
    );
    for (const x of why)
      assert.equal(x.passed, counts.find((c) => c.tag === x.tag)!.passed, `tag ${x.tag}`);
  });

  it("a lane's windows run from its own first bar to the stage's cut (u.nowT: the run start under causalBase)", () => {
    const u = universe();
    assert.equal(laneFromT(u, "rsi-mom-14-20@m15"), u.bars.find((b) => b.tfMin === 15)!.t[0]);
    assert.equal(
      laneFromT(u, "rsi-mom-14-20@m5"),
      Math.min(...u.bars.filter((b) => b.tfMin === 5).map((b) => b.t[0])),
    );
    assert.ok(
      laneFromT(u, "rsi-mom-14-20@m5") > u.startT,
      "the 5m lane's history is shorter than the universe's",
    );
    // a cell's and the default cell's verdicts are the windows of their own closes over [laneFromT, u.nowT)
    const plan = baseWindowsPlan(
      withWindows({ report: [{ split: 2 }, { split: 3, need: 2 }, { recentH: 24, widen: true }] }),
    )!;
    const ind = "mc-rsi2-5@m5";
    const own = (trades: ReadonlyArray<{ exitT: number; r: number }>, tag: string) =>
      judgeBaseWindows(
        plan,
        tag,
        laneFromT(u, ind),
        u.nowT,
        trades.length,
        trades.map((t) => t.exitT),
        trades.map((t) => t.r),
      );
    const p = protects.find((x) => x.tag === "mn")!;
    const cell = cellStats(u, "follow", ind, p, RT_COST, null, { plan, fromT: laneFromT(u, ind) })!;
    const cellTrades = runCombo(u, "follow", ind, p, RT_COST, 1, null)!.trades;
    assert.ok(cellTrades.length >= 10);
    assert.deepEqual(cell.bw, own(cellTrades, "mn"));
    const full = baseRuns(
      u,
      [{ bot: "follow", ind }],
      RT_COST,
      null,
      false,
      false,
      undefined,
      protects,
      rangeMinTfOf(grid),
      microIndRule(grid),
      withWindows({ report: [{ split: 2 }, { split: 3, need: 2 }, { recentH: 24, widen: true }] }),
    )[0];
    assert.deepEqual(
      full.full.bw,
      own(runCombo(u, "follow", ind, DEFAULT_PROTECT, RT_COST, 1, null)!.trades, ""),
    );
  });

  it("the workers' Base (baseRuns over the series, sent as JSON) and the in-process Base (runPipeline) carry the same windows", () => {
    const u = universe();
    const g = withWindows({
      gate: { split: 2, ranges: ["mn", "sh", "wide"] },
      report: [
        { split: 3, need: 2 },
        { recentH: 48, widen: true },
      ],
    });
    const s = {
      ...DEFAULT_SETTINGS,
      grid,
      gates: g,
      tfs: [5, 15],
      focus: ["revert|break-squeeze-t10", "follow|mc-rsi2-5"],
      refineTop: 0,
      evalTop: 0,
      signals: { ...DEFAULT_SETTINGS.signals, enabled: false },
    } as CoreSettings;
    const inProcess = runPipelineSync(u, s).s1;
    // the worker rebuilds the universe from every series given and replies in JSON (tapes.worker.ts, "s1")
    const w = makeUniverse(u.series);
    const combos = inProcess.map((r) => ({ bot: r.bot, ind: r.ind }));
    const viaWorker = JSON.parse(
      JSON.stringify(
        baseRuns(
          w,
          combos,
          s.cost,
          s.tactics,
          true,
          true,
          undefined,
          baseRangeProtects(grid, s.cost),
          rangeMinTfOf(grid),
          microIndRule(grid),
          g,
        ),
      ),
    ) as ComboRun[];
    assert.ok(inProcess.length >= 4);
    const pick = (r: ComboRun) =>
      JSON.parse(
        JSON.stringify({
          id: r.id,
          full: r.full,
          ranges: r.ranges,
          rangeTps: r.rangeTps,
          ruleTps: r.ruleTps,
        }),
      );
    const byId = new Map(viaWorker.map((r) => [r.id, r]));
    for (const r of inProcess) assert.deepEqual(pick(byId.get(r.id)!), pick(r), r.id);
    assert.ok(
      inProcess.some(
        (r) =>
          r.full.bw?.gate === false ||
          Object.values(r.ranges ?? {}).some((x) => x.bw?.gate === false),
      ),
    );
  });
});

describe("two-window Base: settings bounds", () => {
  const ok = (bw: unknown) =>
    checkSettings({ gates: { ...gates0, baseWindows: bw as Gates["baseWindows"] } });
  it("takes rules within split 2–6, need 1–split, recentH 1–336, minPf 0.5–3, minN 1–100, at most 8 report rules", () => {
    ok({ gate: { split: 2 } });
    ok({
      gate: { recentH: 48, widen: true, ranges: ["mn", "sh", "wide"] },
      report: [{ split: 6, need: 1, minPf: 3, minN: 100 }],
    });
    ok({ report: Array.from({ length: 8 }, () => ({ recentH: 336, minPf: 0.5, minN: 1 })) });
    for (const bad of [
      { gate: { split: 1 } },
      { gate: { split: 7 } },
      { gate: { split: 2.5 } },
      { gate: { split: 3, need: 4 } },
      { gate: { need: 1, recentH: 24 } },
      { gate: { recentH: 0 } },
      { gate: { recentH: 337 } },
      { gate: { split: 2, minPf: 0.4 } },
      { gate: { split: 2, minPf: 3.5 } },
      { gate: { split: 2, minN: 0 } },
      { gate: { split: 2, minN: 101 } },
      { gate: { split: 2, widen: "yes" } },
      { gate: { split: 2, ranges: ["xx"] } },
      { gate: { minPf: 1.2 } },
      { gate: { split: 2, other: 1 } },
      { report: Array.from({ length: 9 }, () => ({ split: 2 })) },
      { report: { split: 2 } },
      { both: { split: 2 } },
      { gate: { splits: 2 } },
      [],
    ])
      assert.throws(() => ok(bad), /two-window Base/, JSON.stringify(bad));
  });

  it("refuses a range list that judges nothing: Minimal plus (judged at the default cell: \"wide\") or an empty list", () => {
    for (const bad of [
      { gate: { split: 2, ranges: ["mp"] } },
      { gate: { split: 2, ranges: ["mn", "mp"] } },
      { report: [{ recentH: 24, ranges: ["mp"] }] },
      { gate: { split: 2, ranges: [] } },
    ])
      assert.throws(() => ok(bad), /two-window Base.*(Minimal plus|judges nothing)/, JSON.stringify(bad));
    ok({ gate: { split: 2, ranges: ["wide", "mn"] } });
  });

  it("null is off: accepted, and no plan", () => {
    ok(null);
    assert.equal(baseWindowsPlan({ ...gates0, baseWindows: null }), null);
  });
});
