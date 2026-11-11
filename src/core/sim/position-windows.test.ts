import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS, mergeGateSettings } from "../config.ts";
import {
  DEFAULT_POSITION_WINDOWS,
  checkPositionWindows,
  positionStats,
} from "../position-windows.ts";
import { configId, passesBase, baseRangeCounts, baseRangeWhy } from "../pipeline/pipeline.ts";
import { baseLastNOf, baseLastNForRange } from "../pipeline/base-lastn.ts";
import { BaseCellAccumulator } from "../pipeline/base-cell-stats.ts";
import { statsOf } from "../metrics/stats.ts";
import { BaseConfigCounter } from "../base-config-counts.ts";
import {
  defaultWalkForward,
  makeTape,
  positionConfigEval,
  configEval,
  configDirectionEval,
  configContextEval,
  signalConfigEval,
  signalValidationOk,
  engineValidationLastNOk,
  execDecision,
  selectFixed,
  selectAt,
  selectDurable,
  sampleWindowsForTape,
  activeSignalsAt,
  SignalActivationBook,
  signalIndex,
  sourceUnstable,
} from "./walkforward.ts";
import { lastNSamplesGen } from "../server/last-n-samples.ts";
import type { Protect, Trade } from "../domain/types.ts";
const M = 60_000,
  T = 72 * 60 * M;
const p: Protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 1, tag: "mn" },
  ind = "ema-9-21@m1",
  id = configId("follow", ind, p);
const policy = {
  ...DEFAULT_POSITION_WINDOWS,
  base: 4,
  main: 4,
  real: 3,
  entry: 2,
  maxDrawdownPositions: 4,
  byRange: {},
};
function fixture(values: number[], symbol = "A", side: 1 | -1 = 1, cfg = id) {
  return values.map(
    (r, i) =>
      ({
        cfg,
        sym: symbol,
        side,
        entryT: T - 60 * 60 * M + i * 60 * M,
        exitT: T - 60 * 60 * M + i * 60 * M + M,
        entry: 100,
        exit: 100 * (1 + side * (r + 0.00176)),
        r,
        mult: 1,
        kind: "normal",
        reason: "tp",
        bars: 1,
        mfe: 0,
        mae: 0,
      }) as Trade,
  );
}
function tape(values: number[] = [0.02, 0.02, 0.02, -0.001], extra: Trade[] = [], source = ind) {
  const cfg = configId("follow", source, p);
  return makeTape(
    cfg,
    "follow",
    source,
    p,
    "normal",
    ["A", "B"],
    [...fixture(values, "A", 1, cfg), ...extra].sort(
      (a, b) => a.exitT - b.exitT || a.entryT - b.entryT,
    ),
    [],
    [],
  );
}
function options() {
  const o = defaultWalkForward(DEFAULT_SETTINGS);
  return {
    ...o,
    startT: T,
    simH: 1,
    preH: 1,
    longH: 1,
    preGate: true,
    rangeGate: undefined,
    recordValidation: true as const,
    gates: {
      ...o.gates,
      positionWindows: policy,
      minPf: 1.05,
      rangeMinPf: { minimal: 1.05 },
      minGreen: 0,
      maxDdr: 0,
    },
    normalBaseMinPf: undefined,
    engineSideAccept: undefined,
    signalAccept: undefined,
    signalSideAccept: undefined,
    signalOwnBase: false,
    signalRank: undefined,
    signalGuardN: 0,
    sideGateN: 0,
    confirm: undefined,
    toggles: {
      ...o.toggles,
      normal: true,
      trailing: false,
      block: false,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: false,
      exit: false,
    },
  };
}
test("count membership and verdicts ignore time-window settings and idle gaps", () => {
  const tp = tape(),
    o = options(),
    a = positionConfigEval(tp, T, o, "A", 1);
  assert.equal(a.ok, true);
  assert.equal(a.n, 4);
  assert.equal(a.requestedN, 4);
  assert.deepEqual(
    positionConfigEval(tp, T, { ...o, longH: 72, preH: 72, symH: 72, signalLongH: 72 }, "A", 1),
    a,
  );
  for (const mode of ["fixed", "hourly", "durable"] as const) {
    const selected =
      mode === "fixed"
        ? selectFixed([tp], T, o)
        : mode === "hourly"
          ? selectAt([tp], T, o)
          : selectDurable([tp], T, o, new Set());
    assert.deepEqual(
      selected.picks.map((x) => x.id),
      [id],
      mode,
    );
  }
  assert.deepEqual(selectFixed([tp], T, o).checks, [
    [id, 1, 4, a.pf, (a.gp ?? 0) / 100, (a.gl ?? 0) / 100],
  ]);
});
test("a config cannot borrow a symbol, direction, sibling config or incomplete sample", () => {
  const o = options(),
    tp = tape([0.02, 0.02, 0.02, 0.02], fixture([-0.01, -0.01, -0.01, -0.01], "B", -1));
  assert.equal(configEval(tp, T, o).ok, true);
  assert.equal(configDirectionEval(tp, T, o, -1).ok, false);
  assert.equal(configContextEval(tp, T, o, "B", -1).ok, false);
  assert.equal(engineValidationLastNOk(tp, T, o, -1), false);
  assert.equal(execDecision(tp, T, o, { sym: "B", side: -1 }).ok, false);
  assert.equal(execDecision(tp, T, o, { sym: "A", side: 1 }).ok, true);
  assert.equal(
    positionConfigEval(
      tape([0.02, 0.02, 0.02]),
      T,
      { ...o, gates: { ...o.gates, warmup: true, lastNFloor: 1 } },
      "A",
      1,
    ).ok,
    false,
  );
  const sibling = tape([0.02, 0.02, 0.02]);
  sibling.id += "-other";
  assert.equal(selectFixed([sibling], T, o).picks.length, 0);
});
test("unknown returns stay in N; old unknowns outside N do not poison recovery", () => {
  const o = options();
  assert.equal(positionConfigEval(tape([0.02, NaN, 0.02, 0.02]), T, o, "A", 1).ok, false);
  const tp = tape([NaN, 0.02, 0.02, 0.02, 0.02]);
  assert.equal(positionConfigEval(tp, T, o, "A", 1).ok, true);
  const exact = tape();
  exact.exitT[exact.n - 1] = T;
  assert.equal(
    positionConfigEval(exact, T, o, "A", 1).ok,
    false,
    "same-clock settlement cannot qualify its entry",
  );
  tp.carried = true;
  assert.equal(
    positionConfigEval(tp, T, o, "A", 1).ok,
    false,
    "stale evidence does not become fresh",
  );
});

test("corrupt ownership or chronology cannot qualify older wins at selection or admission",()=>{
 const good=tape(Array(8).fill(.02)),o=options();
 const changes=[{side:Int8Array.from([0,...Array(7).fill(1)])},
  {symI:Uint16Array.from([999,...Array(7).fill(0)])},
  {exitT:Float64Array.from([NaN,...Array.from(good.exitT).slice(1)])},
  {exitT:Float64Array.from([good.exitT[2],...Array.from(good.exitT).slice(1)])}];
 for(const patch of changes){
  const bad={...good,...patch};
  assert.equal(positionConfigEval(bad,T,o,"A",1).ok,false);
  assert.equal(selectFixed([bad],T,o).picks.length,0);
  assert.equal(execDecision(bad,T,o,{sym:"A",side:1}).ok,false);
 }
});
test("Signals and ordinary strategies share exact count semantics at selection and native admission", () => {
  const o = options(),
    tp = tape([0.02, 0.02, 0.02, 0.02], [], "sig-test");
  assert.equal(signalConfigEval(tp, T, o, "A", 1).ok, true);
  assert.equal(signalValidationOk(tp, T, o, "A", 1), true);
  assert.equal(signalValidationOk(tp, T, o, "B", 1), false);
});
test("Base judges its complete N sample, including its own drawdown, rather than an older profitable period", () => {
  const gates = { ...options().gates, baseLastN: 4 };
  const rows = fixture([-0.1, 0.02, 0.02, 0.02, 0.02]),
    recent = baseLastNOf(rows, 4, 1)!;
  assert.equal(passesBase({ n: 5, pf: 0, net: -2, mdd: 10, baseLast: recent }, gates), true);
  const losses = baseLastNOf(fixture([0.9, -0.01, -0.01, -0.01, -0.01]), 4, 1)!;
  assert.equal(passesBase({ n: 5, pf: 99, net: 90, mdd: 0, baseLast: losses }, gates), false);
  assert.equal(
    passesBase(
      { n: 3, pf: 4, net: 6, baseLast: baseLastNOf(fixture([0.02, 0.02, 0.02]), 4, 1) },
      gates,
    ),
    false,
  );
  const acc = new BaseCellAccumulator();
  acc.beginRun();
  for (const row of fixture([NaN, 0.02, 0.02, 0.02, 0.02])) acc.push(row.r, row.entryT, row.exitT);
  assert.equal(
    passesBase(acc.stats(4, 1), gates),
    true,
    "finite current N recovers after an old unknown",
  );
  assert.equal(
    baseLastNForRange(
      { ...gates, positionWindows: { ...policy, byRange: { lr: { base: 7 } } } },
      "lr",
    ),
    7,
  );
});
test("sample progress reports complete N windows with empty exact contexts and no hour window", () => {
  const tp = tape(),
    o = options();
  assert.deepEqual(sampleWindowsForTape(tp, o), { main: 4, real: 3, entry: 2, range: 0 });
  const gen = lastNSamplesGen([tp], T, o);
  let step = gen.next();
  while (!step.done) step = gen.next();
  const main = step.value.rows.find((x) => x.window === "main")!;
  assert.equal(main.contexts, 4);
  assert.equal(main.usable, 1);
  assert.equal(main.insufficient, 3);
  assert.equal(main.pct, 25);
  assert.ok(step.value.rows.every((x) => x.historyH === null));
});
test("per-range/config counts and atomic leaf merges retain unrelated policy", () => {
  const o = options(),
    tp = tape();
  const own = { ...policy, byRange: { mn: { main: 3 } }, byConfig: { [tp.id]: { main: 5 } } };
  assert.equal(
    positionConfigEval(tp, T, { ...o, gates: { ...o.gates, positionWindows: own } }, "A", 1).ok,
    false,
  );
  const merged = mergeGateSettings(o.gates, { positionWindows: { entry: 3 } });
  assert.equal(merged.positionWindows!.main, 4);
  assert.equal(merged.positionWindows!.entry, 3);
  for (const main of [0, 1.5, 501, NaN]) assert.throws(() => checkPositionWindows({ main }));
  assert.throws(() => checkPositionWindows({ byRange: { bad: { main: 5 } } }));
  assert.equal(positionStats([0.1, -0.01, 0.02], 3).maxDrawdownPositions, 1);
});

test("continuous Evals and configured Last-N use counts, scoped configs and strict prior settlement", async () => {
  const { evaluateConfig } = await import("../evals/evaluator.ts"),
    { optimizeLastN, gatedTrades } = await import("../lastn/optimizer.ts");
  const o = options(),
    rows = fixture(Array(20).fill(0.02));
  const a = evaluateConfig(id, rows, {
    gates: o.gates,
    nowT: T,
    timeWindowsH: [1],
    tradeWindows: [2],
  });
  assert.ok(a.windows.length && a.windows.every((w) => w.kind === "trades"));
  assert.equal(a.success, true);
  assert.deepEqual(
    evaluateConfig(id, rows, { gates: o.gates, nowT: T, timeWindowsH: [72], tradeWindows: [500] }),
    a,
  );
  const future = { ...rows.at(-1)!, entryT: T + M, exitT: T + 2 * M, r: -99 };
  assert.deepEqual(evaluateConfig(id, [...rows, future], { gates: o.gates, nowT: T }), a);
  const last = optimizeLastN(id, rows, { gates: o.gates, nowT: T });
  assert.equal(last.bestN, 2);
  assert.equal(last.gateOpen, true);
  assert.deepEqual(optimizeLastN(id, [...rows, future], { gates: o.gates, nowT: T }), last);
  const mixed = [...rows, ...fixture(Array(20).fill(-0.02), "B", -1)];
  assert.ok(gatedTrades(mixed, 2, o.gates).every((t) => t.sym === "A" && t.side === 1));
});

test("cached Base samples cannot substitute a different requested N", () => {
  const gates = options().gates;
  assert.equal(
    passesBase(
      { n: 2, pf: 4, net: 4, mdd: 0, baseLast: baseLastNOf(fixture([0.02, 0.02]), 2, 1) },
      gates,
    ),
    false,
  );
});

test("Base config counts freeze exact-config N and ignore old unknowns and simultaneous/future closes",()=>{
 const own={...policy,byConfig:{[id]:{base:2}}};
 const counter=new BaseConfigCounter({gates:{...options().gates,positionWindows:own},cost:DEFAULT_SETTINGS.cost,fromT:0,cutT:T});
 own.byConfig[id].base=4;
 const rows=fixture([NaN,.02,.02]);
 rows.push({...rows[0],r:-10,entryT:T-M,exitT:T}, {...rows[0],r:-10,entryT:T,exitT:T+M});
 counter.record("follow",ind,p,"normal",rows);
 const [row]=counter.rows();
 assert.equal(row.passed,1);assert.equal(row.closes,2);assert.ok(row.gp>0);assert.equal(row.gl,0);
});

test("Base failure diagnostics use the exact same complete count sample as admission", () => {
  const g = options().gates;
  const runs = [2, 4].map((n) => ({
    ind,
    full: {
      ...statsOf(fixture(Array(n).fill(0.02)), T),
      n,
      pf: 999,
      net: 4,
      mdd: 0,
      baseLast: baseLastNOf(fixture(Array(n).fill(0.02)), 4, 1),
    },
  }));
  const counts = baseRangeCounts(runs, g, [])[0],
    why = baseRangeWhy(runs, g, [])[0];
  assert.equal(counts.passed, 1);
  assert.equal(why.passed, counts.passed);
  assert.equal(why.first.closes, 1);
  assert.equal(why.first.windows, undefined);
});

test("durable stability partitions complete positions rather than clock blocks", () => {
  const tp = tape([-0.001, -0.001, -0.001, -0.001, ...Array(8).fill(0.02)]),
    base = options();
  const o = {
    ...base,
    gates: { ...base.gates, positionWindows: { ...policy, main: 12, maxDrawdownPositions: 40 } },
  };
  assert.equal(positionConfigEval(tp, T, o, "A", 1).ok, true);
  assert.equal(
    positionConfigEval(tp, T, { ...o, mode: "durable", durableSplits: 3, durableFrac: 1 }, "A", 1)
      .ok,
    false,
  );
});

test("Signal ranking and activation refresh from count windows rather than complete hours", () => {
  const tp = tape([0.02, 0.02, 0.02, -0.001], [], "sig-ema-cross-s@m1"),
    o = options();
  const sig = { ...DEFAULT_SETTINGS.signals, rank: "net" as const, count: 0, minTrades: 20 };
  const before = tp.exitT[tp.n - 1];
  assert.equal(
    activeSignalsAt([tp], before, sig, 0.001, o).size,
    0,
    "a simultaneous fourth close is still unknown",
  );
  const active = activeSignalsAt([tp], before + 1, sig, 0.001, o);
  assert.equal(active.size, 1, "four own positions qualify despite an empty hourly window");
  assert.deepEqual(activeSignalsAt([tp], T, sig, 100, o), activeSignalsAt([tp], T, sig, 0.001, o));
  const book = new SignalActivationBook(signalIndex([tp]), sig, 0.001, o);
  const at = (t: number) => {
    const g = book.at(t);
    for (;;) {
      const x = g.next();
      if (x.done) return x.value;
    }
  };
  assert.equal(at(before).size, 0);
  assert.deepEqual(at(before + 1), active);
  assert.deepEqual(at(T), active);
});

test("source stability retains its last-N accepted losses across idle gaps", () => {
  const gate = { days: 1, minShare: 0.5, minTrades: 2, lastN: 2 };
  const rows = [
    { exitT: 1, r: -0.02 },
    { exitT: 2, r: 0.001 },
  ];
  assert.equal(sourceUnstable(rows, 3, gate), true);
  assert.equal(sourceUnstable(rows, T, gate), true);
  assert.equal(
    sourceUnstable(
      [
        { exitT: 1, r: 0.02 },
        { exitT: 2, r: NaN },
      ],
      3,
      gate,
    ),
    true,
  );
});
