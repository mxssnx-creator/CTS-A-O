import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, type CoreSettings } from "../config.ts";
import type { StratKind, Trade } from "../domain/types.ts";
import { basePass, CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { baseAllowsTape, configEval, defaultWalkForward, execDecision, makeTape, selectAt, selectDurable, selectFixed } from "../sim/walkforward.ts";
import { basePairRows, type ComboRun } from "../pipeline/pipeline.ts";
import { trackRuntimes } from "../test-support.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { CandleSeries } from "../market/candle-series.ts";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 17, 12);
const IND = "ema-21-55@m15";
const BAD = "ema-9-21@m15";
const pair = (ind: string) => `follow|${ind}`;
const good = { n: 20, pf: 2, net: 5, mdd: 1, baseLast: { requested: 40, n: 20, gp: 2, gl: 1, stop: 1 } };
const bad = { n: 20, pf: 0.5, net: -1, mdd: 1, baseLast: { requested: 40, n: 20, gp: .5, gl: 1, stop: 1 } };
const run = (ind: string, ranges: object) => ({ bot: "follow", ind, full: bad, ranges, score: 1 }) as unknown as ComboRun;
const s = {
  ...DEFAULT_SETTINGS,
  gates: { ...DEFAULT_SETTINGS.gates, baseRangeLastN: { micro: 40, minimal: 40 }, minPf: 1.1, minTrades: 3, maxDdr: 0 },
  grid: { ...DEFAULT_SETTINGS.grid, allSets: true, baseRanges: true },
};
const applies = { enabled: (tag: string) => tag === "mn" || tag === "sh" };
function fixture() {
  return basePass([run(IND, { mn: good, sh: bad }), run(BAD, { mn: bad, sh: bad })], s, applies);
}
function tape(ind: string, tag: "mn" | "sh" | undefined, kind: StratKind = "normal") {
  const protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag };
  const id = `${pair(ind)}|tp1|sl1|tr0|h32${tag ? `|${tag}` : ""}${kind === "normal" ? "" : `|${kind}`}`;
  const trades = Array.from({ length: 30 }, (_, i): Trade => ({
    cfg: id, sym: "AAA-USDT", side: 1, entryT: NOW - (31 - i) * H,
    exitT: NOW - (30 - i) * H, entry: 100, exit: 101, r: 0.01,
    reason: "tp", bars: 1, mfe: 0.01, mae: 0, kind,
  }));
  return makeTape(id, "follow", ind, protect, kind, ["AAA-USDT"], trades, [], []);
}
function options() {
  const base = fixture();
  return {
    ...defaultWalkForward(s), preH: 30, longH: 30, validLastN: 0, lastN: 0,
    rangeGate: undefined, durableFrac: 0, preGate: false, seatPer: "config" as const,
    gates: { ...s.gates, maxDdtH: 0, minDdtH: 0, minGreen: 0, stableBlocks: 0 },
    basePassed: new Set(base.qualified.map((r) => pair(r.ind))),
    basePassedRanges: base.qualifiedTags,
    baseWideLadderPairs: base.wideLadderPairs,
  };
}
const tracked = trackRuntimes();
afterEach(() => tracked.disposeAll());

describe("diagnostic allSets retains the Base-qualified cohort", () => {
  it("keeps diagnostic construction separate from exact qualified pairs and ranges", () => {
    const out = fixture();
    assert.equal(out.passed.length, 2, "both indications still build measurement tapes");
    assert.equal(out.added, 1);
    assert.deepEqual(out.qualified.map((r) => r.ind), [IND]);
    assert.deepEqual(out.qualifiedTags, { [pair(IND)]: ["mn"] });
    assert.deepEqual([...out.wideLadderPairs], [pair(IND)], "independent wide ladders retain only actually qualified pairs");
    assert.deepEqual(out.pairTags, { [pair(IND)]: ["mn", "sh"], [pair(BAD)]: ["mn", "sh"] });
    out.pairTags[pair(IND)].push("gn");
    assert.deepEqual(out.qualifiedTags[pair(IND)], ["mn"], "build expansion cannot mutate qualification");
    const rows = basePairRows(out.passed, { ...out.qualifiedTags, [pair(BAD)]: [] });
    assert.deepEqual(rows.map((r) => [r.pair, r.passed, r.tags]), [[pair(IND), true, ["mn"]], [pair(BAD), false, []]],
      "a failed pair retained with explicit empty tags never reports a pass");
  });

  for (const [name, select] of Object.entries({ fixed: selectFixed, hourly: selectAt,
    durable: (tapes: ReturnType<typeof tape>[], t: number, o: ReturnType<typeof options>) => selectDurable(tapes, t, o, new Set()) })) {
    it(`${name}: profitable measurement tapes cannot borrow another pair or range's Base pass`, () => {
      const tapes = [tape(IND, "mn"), tape(IND, "sh"), tape(BAD, "mn")];
      const o = options();
      assert.ok(tapes.every((tp) => configEval(tp, NOW, o).ok), "every independent config has a winning validation window");
      assert.deepEqual(select(tapes, NOW, o).picks.map((p) => p.id), [tapes[0].id]);
      assert.equal(execDecision(tapes[0], NOW, o).ok, true);
      for (const tp of tapes.slice(1)) assert.deepEqual(execDecision(tp, NOW, o), { ok: false, why: "base" });
      assert.equal(tapes[1].heldOnly, undefined, "a measurement tape retains its independent diagnostic identity");
    });
  }

  it("fails closed for a supplied empty range map and invalidates the selector cache when that map changes", () => {
    const tapes = [tape(IND, "mn"), tape(IND, "sh")], o = options();
    assert.equal(baseAllowsTape(tapes[0], {}), true, "legacy research callers without Base metadata keep their existing scope");
    assert.equal(baseAllowsTape(tapes[0], { basePassedRanges: {} }), false);
    assert.deepEqual(selectFixed(tapes, NOW, o).picks.map((p) => p.id), [tapes[0].id]);
    assert.deepEqual(selectFixed(tapes, NOW, { ...o, basePassedRanges: { [pair(IND)]: ["sh"] } }).picks.map((p) => p.id), [tapes[1].id]);
  });

  for (const perRange of [false, true]) {
    it(`Axis perRange ${perRange}: independently admits only the builder's eligible untagged ladders`, () => {
      const out = basePass([run(IND, { mn: good, sh: bad }), run(BAD, { mn: bad, sh: bad })],
        { ...s, axis: { ...s.axis, perRange } }, applies);
      assert.deepEqual([...out.wideLadderPairs], perRange ? [] : [pair(IND)]);
      for (const kind of ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis"] as const) {
        const tp = tape(IND, undefined, kind), tagged = tape(IND, "mn", kind), failedRange = tape(IND, "sh", kind);
        const o = { ...options(), baseWideLadderPairs: out.wideLadderPairs,
          toggles: { ...s.toggles, normal: true, trailing: true, block: false, dca: true, dcaActive: kind === "dca-active", axis: true } };
        const ladder = kind === "dca" || kind === "dca-active" || kind === "axis";
        const admitted = ladder && !perRange;
        assert.equal(configEval(tp, NOW, o).ok, true, "the independent config's own evaluation passes");
        assert.equal(baseAllowsTape(tp, o), admitted, kind);
        assert.equal(baseAllowsTape(tagged, o), true, "tagged configs retain their own admitted range");
        assert.equal(baseAllowsTape(failedRange, o), false, "wide ladder permission never expands a tagged range");
        assert.equal(baseAllowsTape(tape(BAD, undefined, kind), o), false, "measurement-only failed pairs remain excluded");
        assert.equal(execDecision(tp, NOW, o).ok, admitted);
        for (const select of [selectFixed, selectAt]) assert.equal(select([tp], NOW, o).picks.length, Number(admitted));
        assert.equal(selectDurable([tp], NOW, o, new Set()).picks.length, Number(admitted));
      }
    });
  }

  it("preserves the exact Wide pass with perRange on and invalidates cached ladder permission independently", () => {
    const wide = run(IND, { mn: bad, sh: bad });
    wide.full = { ...wide.full, ...good };
    const out = basePass([wide], { ...s, axis: { ...s.axis, perRange: true } }, { enabled: (tag) => ["", "mn", "sh"].includes(tag) });
    assert.ok(out.wideLadderPairs.has(pair(IND)));
    const tp = tape(IND, undefined, "axis"), tapes = [tp], o = { ...options(), toggles: { ...s.toggles, axis: true } };
    assert.equal(selectFixed(tapes, NOW, { ...o, baseWideLadderPairs: new Set() }).picks.length, 0);
    assert.equal(selectFixed(tapes, NOW, o).picks.length, 1);
    assert.equal(baseAllowsTape(tp, { basePassedRanges: {}, baseWideLadderPairs: new Set([pair(IND)]) }), false,
      "a contradictory allowlist cannot invent the required qualified pair");
  });

  it("preserves explicit baseRanges off while allSets alone cannot expand admission", () => {
    const out = basePass([run(IND, { mn: good, sh: bad })], { ...s, grid: { ...s.grid, baseRanges: false } }, applies);
    assert.deepEqual(out.qualifiedTags[pair(IND)], ["mn", "sh"], "the independently configured range-expansion policy remains explicit");
  });

  for (const allSets of [false, true]) it(`retains exact Base targets through selection, entry and cache updates (allSets ${allSets})`, () => {
    const row = { ...run(IND, { mn: good, sh: bad }), rangeTps: { mn: [0.01] } };
    const base = basePass([row], { ...s, grid: { ...s.grid, allSets } }, applies);
    assert.deepEqual(base.qualifiedTps, { [pair(IND)]: { mn: [0.01] } });
    assert.equal(base.pairTps[pair(IND)]?.mn?.length ?? 0, allSets ? 0 : 1);
    const allowed = tape(IND, "mn");
    const other = tape(IND, "mn");
    other.id += "|diagnostic-target";
    other.protect = { ...other.protect, tp: 0.02 };
    const tapes = [allowed, other];
    const o = { ...options(), basePassedTargets: base.qualifiedTps };
    assert.ok(configEval(other, NOW, o).ok, "profitable diagnostic history cannot replace Base target proof");
    for (const select of [selectFixed, selectAt])
      assert.deepEqual(select(tapes, NOW, o).picks.map(p => p.id), [allowed.id]);
    assert.deepEqual(selectDurable(tapes, NOW, o, new Set([other.id])).picks.map(p => p.id), [allowed.id]);
    assert.equal(execDecision(allowed, NOW, o).ok, true);
    assert.equal(execDecision(other, NOW, o).ok, false);
    assert.deepEqual(selectFixed(tapes, NOW, { ...o, basePassedTargets: { [pair(IND)]: { mn: [0.02] } } }).picks.map(p => p.id), [other.id],
      "the cached selector observes replacement qualification");
    if (!allSets) base.pairTps[pair(IND)].mn = [0.02];
    assert.deepEqual(base.qualifiedTps[pair(IND)].mn, [0.01], "builder maps cannot mutate target proof");
  });

  it("runtime compute carries measurement tapes without marking their failed Base cohort qualified", async () => {
    const rt = tracked.track(new CoreRuntime(new CoreDb(":memory:"), {
      focus: [pair(IND)], pinned: [], tfs: [15], symbols: 1, historyDays: 4,
      tfDays: { "1": 4, "15": 4 }, mainTop: 0,
      signals: { enabled: false },
      grid: { allSets: true, micro: false, minimal: false, short: false, general: false, long: false },
      gates: { minTrades: 10_000 },
      tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false },
    }, { market: "synthetic", priceStream: null }));
    rt.stop();
    rt.candles.set("AAA-USDT", CandleSeries.fromCandles(syntheticCandles("AAA-USDT", 1, 4000, NOW, 7)));
    Object.assign(rt, { workersBroken: true, workersBrokenAt: Date.now() });
    rt.wf = { ...rt.wf, preH: 6, simH: 6, longH: 24,
      protects: [{ tp: .01, sl: .01, trail: 0, hold: 32 }],
      dcaProtects: [{ tp: .01, sl: .01, trail: 0, hold: 32 }] };
    await rt.compute();
    assert.equal(rt.status.basePassed, 0);
    assert.equal(rt.status.baseBuilt, 1);
    assert.ok(rt.tapes.length > 0, "the full independent measurement tape remains available");
    assert.deepEqual([...(rt.wf.basePassed ?? [])], []);
    assert.deepEqual(rt.wf.basePassedRanges, {});
    assert.deepEqual([...(rt.wf.baseWideLadderPairs ?? [])], []);
    assert.equal(rt.sim?.trades.length, 0);
    assert.deepEqual([...rt.stageSets!.passed], []);
    assert.deepEqual([...rt.stageSets!.measured!], [pair(IND)]);
    const map = rt.wf.basePassedRanges;
    const ladderPairs = rt.wf.baseWideLadderPairs;
    rt.updateSettings({ cycleMs: rt.settings.cycleMs + 1000 });
    assert.equal(rt.wf.basePassedRanges, map, "settings changes retain the current compute's exact range gate");
    assert.equal(rt.wf.baseWideLadderPairs, ladderPairs, "settings changes retain the independent ladder policy until recomputed");
  });

  it("preset Base returns diagnostic construction and a separate empty admission cohort on both calculation paths", async () => {
    const rt = tracked.track(new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic", priceStream: null }));
    rt.stop();
    const settings: CoreSettings = { ...s, mainTop: 0, gates: { ...s.gates, minTrades: 10_000 } };
    const bars = [barsFromCandles("AAA-USDT", 15, syntheticCandles("AAA-USDT", 15, 160, NOW, 7))];
    const inner = rt as unknown as { presetBase(job: unknown, s: CoreSettings, combos: unknown[], bars: unknown[]): Promise<{
      main: Set<string>; qualified: Set<string>; qualifiedTags: Record<string, string[]>; wideLadderPairs: Set<string>;
    }> };
    const previous = process.env.CTS_CORE_WORKERS;
    try {
      for (const workers of ["0", "1"]) {
        process.env.CTS_CORE_WORKERS = workers;
        const result = await inner.presetBase({ id: "cohort", state: "running", progress: 0 }, settings, [{ bot: "follow", ind: IND }], bars);
        assert.ok(result.main.has(pair(IND)), "the failed pair is still available for measurement");
        assert.deepEqual([...result.qualified], []);
        assert.deepEqual(result.qualifiedTags, {});
        assert.deepEqual([...result.wideLadderPairs], []);
      }
    } finally {
      if (previous === undefined) delete process.env.CTS_CORE_WORKERS;
      else process.env.CTS_CORE_WORKERS = previous;
    }
  });

  it("fixed-focus saved, auto and research preset backtests all apply Base before constructing config seats", async () => {
    const previous = process.env.CTS_CORE_WORKERS;
    try {
      for (const workers of ["0", "1"]) for (const kind of ["saved", "auto", "research"]) {
        process.env.CTS_CORE_WORKERS = workers;
        const rt = tracked.track(new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic", priceStream: null }));
        rt.stop();
        type Result = { main: Set<string>; qualified: Set<string>; qualifiedTags: Record<string, string[]>; wideLadderPairs: Set<string> };
        const inner = rt as unknown as {
          presetBase(...args: unknown[]): Promise<Result>;
          runPresetBacktest(p: unknown, days: number, job: unknown): Promise<void>;
        };
        const presetBase = inner.presetBase.bind(inner);
        const captured: { base?: Result } = {};
        inner.presetBase = async (...args) => (captured.base = await presetBase(...args));
        const id = `fixed-${kind}-${workers}`;
        await inner.runPresetBacktest({ id, label: id, info: "", kind, at: 0, metrics: {},
          settings: {
            symbols: 1, tfs: [15], tfDays: { "1": 3, "15": 3 }, focus: [pair(IND)], pinned: [],
            gates: { ...s.gates, minTrades: 10_000 }, signals: { ...DEFAULT_SETTINGS.signals, enabled: false },
            grid: { ...DEFAULT_SETTINGS.grid, allSets: false, micro: false, minimal: false, short: false, general: false, long: false },
          }, wf: { mode: "fixed", longH: 24, preH: 6 },
        }, 1, { id, state: "running", progress: 0, startedAt: Date.now() });
        const base = captured.base;
        assert.ok(base, `${kind} fixed-focus preset must calculate Base (workers ${workers})`);
        assert.equal(base.main.size, 0);
        assert.equal(base.qualified.size, 0);
        assert.deepEqual(base.qualifiedTags, {});
        assert.deepEqual([...base.wideLadderPairs], []);
        const report = rt.db.kvGet<Record<string, Array<{ n: number; pass: boolean }>>>("presetBacktests")?.[id]?.[0];
        assert.ok(report);
        assert.equal(report.n, 0, "a focused pair that failed Base has no post-Base executed sample");
        assert.equal(report.pass, false);
        await tracked.release(rt);
      }
    } finally {
      if (previous === undefined) delete process.env.CTS_CORE_WORKERS;
      else process.env.CTS_CORE_WORKERS = previous;
    }
  });
});
