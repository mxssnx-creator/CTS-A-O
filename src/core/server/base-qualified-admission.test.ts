import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS, type CoreSettings } from "../config.ts";
import type { Bars, StratKind, Trade } from "../domain/types.ts";
import { auditState } from "../audit.ts";
import { syntheticCandles, barsFromCandles } from "../market/bars.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { basePairRows, type ComboRun } from "../pipeline/pipeline.ts";
import { baseAllowsTape, configEval, defaultWalkForward, execDecision, makeTape, selectAt, selectDurable, selectFixed } from "../sim/walkforward.ts";
import { basePass, CoreRuntime } from "./runtime.server.ts";

const H = 3_600_000;
const NOW = Math.floor(Date.now() / H) * H;
const IND = "ema-21-55@m15", BAD = "ema-9-21@m15";
const pair = (ind = IND) => `follow|${ind}`;
const good = { n: 30, pf: 2, net: 1, mdd: 0 }, bad = { n: 30, pf: .5, net: -1, mdd: 1 };
const run = (ind: string) => ({ bot: "follow", ind, score: 1, full: bad,
  ranges: { mn: ind === IND ? good : bad, sh: bad } }) as unknown as ComboRun;
const settings: CoreSettings = { ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.1, minTrades: 3, maxDdr: 0 },
  grid: { ...DEFAULT_SETTINGS.grid, allSets: true, baseRanges: true } };
const applies = { enabled: (tag: string) => tag === "mn" || tag === "sh" };
const cohort = () => basePass([run(IND), run(BAD)], settings, applies);
function tape(ind = IND, tag: "" | "mn" | "sh" = "mn", kind: StratKind = "normal") {
  const protect = { tp: .01, sl: .01, trail: 0, hold: 32, tag: tag || undefined };
  const id = `${pair(ind)}|tp1|sl1|tr0|h32${tag ? `|${tag}` : ""}${kind === "normal" ? "" : `|${kind}`}`;
  const trades: Trade[] = Array.from({ length: 30 }, (_, i) => ({ cfg: id, sym: "AAA-USDT", side: 1,
    entryT: NOW - (31 - i) * H, exitT: NOW - (30 - i) * H, entry: 100, exit: 101,
    r: .01, reason: "tp", bars: 1, mfe: .01, mae: 0, kind }));
  return makeTape(id, "follow", ind, protect, kind, ["AAA-USDT"], trades, [], []);
}
function options() {
  const base = cohort();
  return { ...defaultWalkForward(settings), preH: 30, longH: 30, validLastN: 0, lastN: 0,
    rangeGate: undefined, durableFrac: 0, preGate: false, seatPer: "config" as const,
    gates: { ...settings.gates, maxDdtH: 0, minDdtH: 0, minGreen: 0, stableBlocks: 0 },
    basePassed: new Set(base.qualified.map((r) => pair(r.ind))), basePassedRanges: base.qualifiedTags,
    baseWideLadderPairs: base.wideLadderPairs,
    toggles: { ...settings.toggles, normal: true, trailing: true, block: false, dca: true, axis: true },
  };
}

describe("diagnostic construction preserves independent Base admission", () => {
  it("snapshots the qualified pair/range before allSets expands the build inventory", () => {
    const out = cohort();
    assert.equal(out.passed.length, 2); assert.equal(out.added, 1);
    assert.deepEqual(out.qualified.map((r) => r.ind), [IND]);
    assert.deepEqual(out.qualifiedTags, { [pair()]: ["mn"] });
    assert.deepEqual(out.pairTags, { [pair()]: ["mn", "sh"], [pair(BAD)]: ["mn", "sh"] });
    out.pairTags[pair()].push("gn");
    assert.deepEqual(out.qualifiedTags, { [pair()]: ["mn"] });
    assert.deepEqual(basePairRows(out.passed, out.qualifiedTags).map((r) => [r.passed, r.tags]), [[true, ["mn"]], [false, []]]);
    const report = auditState({ sim: null, tapes: [tape(), tape(BAD)], cost: settings.cost,
      stages: { passed: new Set([pair()]), measured: new Set([pair(BAD)]), main: new Set([pair(), pair(BAD)]), held: new Set(), mainTop: 0 } });
    assert.equal(report.ok, true, JSON.stringify(report.checks));
  });

  for (const [name, select] of Object.entries({ fixed: selectFixed, hourly: selectAt,
    durable: (tapes: ReturnType<typeof tape>[], t: number, o: ReturnType<typeof options>) => selectDurable(tapes, t, o, new Set()) })) {
    it(`${name}: profitable diagnostic configs cannot borrow another pair or range's Base pass`, () => {
      const tapes = [tape(), tape(IND, "sh"), tape(BAD)], o = options();
      assert.ok(tapes.every((tp) => configEval(tp, NOW, o).ok), "each config independently passes its own evaluation");
      assert.deepEqual(select(tapes, NOW, o).picks.map((p) => p.id), [tapes[0].id]);
      assert.equal(execDecision(tapes[0], NOW, o).ok, true);
      for (const tp of tapes.slice(1)) assert.deepEqual(execDecision(tp, NOW, o), { ok: false, why: "base" });
    });
  }

  it("invalidates cached selectors when the qualified range cohort changes and fails closed for an empty map", () => {
    const tapes = [tape(), tape(IND, "sh")], o = options();
    assert.equal(baseAllowsTape(tapes[0], {}), true, "callers without Base metadata retain their existing scope");
    assert.equal(baseAllowsTape(tapes[0], { basePassedRanges: {} }), false);
    assert.deepEqual(selectFixed(tapes, NOW, o).picks.map((p) => p.id), [tapes[0].id]);
    assert.deepEqual(selectFixed(tapes, NOW, { ...o, basePassedRanges: { [pair()]: ["sh"] } }).picks.map((p) => p.id), [tapes[1].id]);
  });

  for (const perRange of [false, true]) {
    it(`preserves the builder's independent untagged ladder policy with perRange ${perRange}`, () => {
      const out = basePass([run(IND), run(BAD)], { ...settings, axis: { ...settings.axis, perRange } }, applies);
      assert.deepEqual([...out.wideLadderPairs], perRange ? [] : [pair()]);
      for (const kind of ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis"] as const) {
        const tp = tape(IND, "", kind), o = { ...options(), baseWideLadderPairs: out.wideLadderPairs,
          toggles: { ...options().toggles, dcaActive: kind === "dca-active" } };
        const expected = !perRange && ["dca", "dca-active", "axis"].includes(kind);
        assert.equal(baseAllowsTape(tp, o), expected, kind);
        assert.equal(baseAllowsTape(tape(IND, "mn", kind), o), true);
        assert.equal(baseAllowsTape(tape(IND, "sh", kind), o), false);
        assert.equal(baseAllowsTape(tape(BAD, "", kind), o), false);
        assert.equal(execDecision(tp, NOW, o).ok, expected);
      }
    });
  }

  it("inverted research entries retain source qualification and held-only tapes cannot open new entries", () => {
    const original = tape(), mirror = { ...original, bot: "revert" as const };
    const o = { ...options(), invertSeats: true };
    assert.equal(execDecision(mirror, NOW, o).ok, true, "the mirror executes the admitted source seat");
    assert.deepEqual(execDecision({ ...mirror, protect: { ...mirror.protect, tag: "sh" } }, NOW, o), { ok: false, why: "base" });
    assert.deepEqual(execDecision({ ...original, heldOnly: true }, NOW, options()), { ok: false, why: "heldOnly" });
  });

  it("preserves explicit baseRanges off and Wide qualification without letting allSets expand admission", () => {
    const expanded = basePass([run(IND)], { ...settings, grid: { ...settings.grid, baseRanges: false } }, applies);
    assert.deepEqual(expanded.qualifiedTags[pair()], ["mn", "sh"]);
    const wide = { ...run(IND), full: good };
    const out = basePass([wide], { ...settings, axis: { ...settings.axis, perRange: true } }, { enabled: () => true });
    assert.ok(out.wideLadderPairs.has(pair()));
  });

  it("keeps current range qualification across settings changes and tightens carried ladder permission immediately", () => {
    const o = options(), ranges = o.basePassedRanges;
    const rt = Object.assign(Object.create(CoreRuntime.prototype) as CoreRuntime, {
      settings, wf: o, status: {}, db: { kvSet() {}, event() {} }, baseConfigRunner: { cancel() {} }, emit() {}, kick() {},
    });
    rt.updateSettings({ cycleMs: settings.cycleMs + 1 });
    assert.equal(rt.wf.basePassedRanges, ranges);
    assert.equal(rt.wf.baseWideLadderPairs, o.baseWideLadderPairs);
    rt.updateSettings({ axis: { perRange: true } });
    assert.deepEqual([...(rt.wf.baseWideLadderPairs ?? [])], []);
    rt.updateSettings({ axis: { perRange: false } });
    assert.deepEqual([...(rt.wf.baseWideLadderPairs ?? [])], [], "relaxing a policy waits for a fresh qualified compute");
  });
});

describe("preset Base qualification", () => {
  it("returns the diagnostic build cohort separately from an empty qualified cohort without constructing a runtime", async () => {
    const rt = Object.assign(Object.create(CoreRuntime.prototype) as CoreRuntime, {
      checkBacktest() {}, onWorkers: async () => false,
      sliced: async (g: Generator<unknown, unknown>) => { for (;;) { const r = g.next(); if (r.done) return r.value; } },
    });
    const s = { ...settings, mainTop: 0, gates: { ...settings.gates, minTrades: 10_000 } };
    const bars = [barsFromCandles("AAA-USDT", 15, syntheticCandles("AAA-USDT", 15, 160, NOW, 7))];
    const inner = rt as unknown as { presetBase(job: unknown, s: CoreSettings, combos: unknown[], bars: Bars[]): Promise<{
      main: Set<string>; qualified: Set<string>; qualifiedTags: Record<string, string[]>; wideLadderPairs: Set<string>;
    }> };
    const out = await inner.presetBase({}, s, [{ bot: "follow", ind: IND }], bars);
    assert.ok(out.main.has(pair()), "allSets keeps the failed pair for diagnostics");
    assert.equal(out.qualified.size, 0); assert.deepEqual(out.qualifiedTags, {}); assert.equal(out.wideLadderPairs.size, 0);
  });

  for (const kind of ["saved", "auto", "research"] as const) {
    it(`${kind}: fixed-focus preset dispatches Base using only completed pre-window history`, async () => {
      const sentinel = new Error("captured causal Base before tape construction");
      let called = false;
      const rt = Object.assign(Object.create(CoreRuntime.prototype) as CoreRuntime, {
        settings: { ...DEFAULT_SETTINGS, symbols: 1, tfs: [15], tfDays: { "15": 3 } },
        candles: new Map([["AAA-USDT", CandleSeries.fromCandles(syntheticCandles("AAA-USDT", 1, 6000, NOW, 7))]]),
        checkBacktest() {}, btCandles: new Map(), market: "synthetic",
        presetBase: async (_job: unknown, _s: CoreSettings, combos: Array<{ ind: string }>, bars: Bars[]) => {
          called = true;
          assert.ok(combos.some((c) => c.ind === IND));
          assert.ok(bars.length && bars.some((b) => b.n > 0));
          const startT = NOW - 24 * H;
          for (const b of bars) for (let i = 0; i < b.n; i++) assert.ok(b.t[i] + b.tfMin * 60_000 <= startT);
          throw sentinel;
        },
      });
      const inner = rt as unknown as { runPresetBacktest(p: unknown, days: number, job: unknown): Promise<void> };
      await assert.rejects(inner.runPresetBacktest({ id: kind, kind, settings: { focus: [pair()], signals: { enabled: false },
        tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false } }, wf: { mode: "fixed", longH: 24, preH: 6 } }, 1, {}),
      (err) => err === sentinel);
      assert.equal(called, true);
    });
  }
});
