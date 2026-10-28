import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { DEFAULT_SETTINGS, SHORT_RANGE } from "../config.ts";
import { checkSettings } from "../settings-check.ts";
import { statsOf } from "../metrics/stats.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import {
  allCombos, basePassTags, baseRangeProtects, baseRuns, completeBaseRangeProtects, configId, laneProtect,
  makeUniverse, parseConfigId, protectCellKey, rangeAppliesTo, REF_TF,
} from "../pipeline/pipeline.ts";
import { basePass } from "../server/runtime.server.ts";
import { buildTapes, cellAllowed, gridVariants, orderCfgKey, passedCellsOf, protectGrid } from "../sim/walkforward.ts";
import { DEFAULT_LOW_RANGE_GRID, LOW_RANGE_IDS, lowRangeGridProtects } from "./low-range.ts";
import { INDICATIONS } from "./registry.ts";
import { exitStrategyPairs } from "../exit-strategy.ts";
import { SeriesCache } from "./cache.ts";
import { LOW_RANGE_METHODS, LOW_RANGE_RELATIONS, LOW_RANGE_WINDOWS, lowRangeState } from "./low-range-research.ts";
import { controlledLowRange } from "./test-support.ts";
import { closePool, runOnWorkers } from "../server/pool.server.ts";
import { adjustProtect, type AdjustState } from "../adjust.ts";
import { trailingOnlyProtects } from "../sim/trailing.ts";

after(() => closePool());

const IND = "low-range-12-breakout-standalone";
const cost = DEFAULT_SETTINGS.cost;
const lowRange = { ...DEFAULT_LOW_RANGE_GRID, enabled: true, steps: [2], slRatios: [0.5, 1, 2], trailRatios: [0, 0.25] };
const grid = { ...DEFAULT_SETTINGS.grid, tp: [], slOfTp: [1], trailOfTp: [0], holdH: [3], trailingOnly: false,
  short: { ...SHORT_RANGE, minTf: 1 },
  micro: false as const, minimal: false as const, general: false as const, long: false as const, lowRange };
const u = makeUniverse([
  barsFromCandles("A-USDT", 1, syntheticCandles("A-USDT", 1, 1800, Date.UTC(2026, 9, 1), 3)),
  barsFromCandles("B-USDT", 1, syntheticCandles("B-USDT", 1, 1800, Date.UTC(2026, 9, 1), 5)),
]);

describe("Low-Range Short integration", () => {
  it("defaults the opt-in Low-Range maximum hold to the best tested 5m cap", () => {
    assert.equal(DEFAULT_LOW_RANGE_GRID.enabled, false);
    assert.equal(DEFAULT_LOW_RANGE_GRID.maxHoldMin, 60);
    assert.equal(DEFAULT_SETTINGS.gates.minPf, 1.1);
    assert.equal(DEFAULT_SETTINGS.grid.rangeGate?.enabled, true);
    assert.equal(DEFAULT_SETTINGS.grid.rangeGate?.lastN, 75);
    assert.equal(DEFAULT_SETTINGS.grid.rangeGate?.minPf, 1.35);
  });

  it("keeps all 650 sources and their timeframe identities independent, opt-in, and follow-only", () => {
    assert.equal(LOW_RANGE_IDS.length, 650);
    assert.equal(new Set(LOW_RANGE_IDS).size, 650);
    assert.equal(INDICATIONS.filter((s) => s.kind === "low-range").length, 650);
    const focus = [`follow|${IND}`, `revert|${IND}`];
    assert.deepEqual(allCombos(focus, [], [1, 5, 15, 30]), []);
    const combos = allCombos(focus, [], [1, 5, 15, 30], 0, true);
    assert.equal(combos.length, 5);
    assert.ok(combos.every((c) => c.bot === "follow" && !c.ind.includes("@m30")));
    assert.deepEqual(allCombos(focus, [], [1, 5, 15, 30], 0, true, 15).map((c) => c.ind), [`${IND}@m15`]);
    assert.equal(allCombos(focus, ["low-range"], [1, 5, 15], 0, true).length, 0);
    const p = lowRangeGridProtects(lowRange, cost)[0];
    const a = configId("follow", `${IND}@m1`, laneProtect(p, `${IND}@m1`));
    const b = configId("follow", "low-range-12-breakout-trend@m1", laneProtect(p, `${IND}@m1`));
    assert.notEqual(orderCfgKey(a), orderCfgKey(b));
    const follow = configId("follow", "low-range-12-breakout-trend-move-follow@m1", laneProtect(p, `${IND}@m1`));
    const reverse = configId("follow", "low-range-12-breakout-trend-move-reverse@m1", laneProtect(p, `${IND}@m1`));
    assert.notEqual(orderCfgKey(follow), orderCfgKey(reverse));
    assert.notEqual(orderCfgKey(follow), orderCfgKey(b));
    assert.equal(configId("follow", "low-range-12-breakout-trend-move-follow@m1", parseConfigId(follow)!.protect), follow);
    assert.equal(configId("follow", `${IND}@m1`, parseConfigId(a)!.protect), a);
    assert.equal(parseConfigId(a)!.protect.lowRangeOnly, true);
  });

  it("fires every method, relation and lookback in both directions on a constructed matching regime", () => {
    for (const window of LOW_RANGE_WINDOWS) for (const method of LOW_RANGE_METHODS)
      for (const relation of LOW_RANGE_RELATIONS) for (const side of [1, -1] as const) {
        const candles = controlledLowRange(window, method, relation, side);
        const bars = barsFromCandles("TEST", 1, candles);
        const state = lowRangeState(new SeriesCache(bars), window, method, relation);
        assert.equal(state.at(-1), side, `${window}/${method}/${relation}/${side}`);
      }
  });

  it("builds exactly the same cost-aware Short cells for Base and tapes on every configured step and ratio", () => {
    for (const trailingOnly of [false, true]) {
      const g = { ...DEFAULT_SETTINGS.grid, lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true }, trailingOnly };
      const base = completeBaseRangeProtects(g, cost).filter((p) => p.lowRangeOnly);
      const exec = protectGrid(REF_TF, g, cost).filter((p) => p.lowRangeOnly);
      assert.deepEqual(base.map(protectCellKey).sort(), exec.map(protectCellKey).sort());
      assert.equal(gridVariants(g), protectGrid(REF_TF, g).length);
      assert.ok(base.length >= 208);
      for (const p of base) {
        assert.equal(p.tag, "sh");
        assert.ok(p.sl + 1e-12 >= cost + g.lowRange.step);
        assert.ok(!p.trail || p.trail * (p.trailStep ?? 1) + 1e-12 >= cost + 2 * g.lowRange.step);
      }
    }
    assert.equal(protectGrid(REF_TF, { ...grid, short: false }, cost).filter((p) => p.lowRangeOnly).length, 0);
  });

  it("preserves precise cost-aware Low-Range floors when feedback rounds either distance", () => {
    const fine = { ...lowRange, step: 0.002011, steps: [2], slRatios: [0.5], trailRatios: [0, 0.25] };
    const cells = lowRangeGridProtects(fine, cost);
    const p = cells.find((x) => x.trail > 0)!;
    const noTrail = cells.find((x) => x.trail === 0)!;
    assert.equal(p.sl, 0.003511);
    assert.equal(p.trail, 0.005522);
    const ind = `${IND}@m1`, pair = `follow|${ind}`;
    for (const cell of [p, noTrail, trailingOnlyProtects([p])[0]]) {
      const kind = cell.trailOnly ? "trailing-only" : cell.trail > 0 ? "trailing" : "normal";
      for (const [slMult, trailMult] of [[1, 1.1], [1.1, 1], [1.1, 1.1], [1.5, 1.5]] as const) {
        const adj = { minSl: 0, minTrail: 0, slMult, trailMult };
        const q = adjustProtect(cell, adj);
        assert.ok(q.sl + 1e-12 >= cost + fine.step, `${kind}: stop floor`);
        assert.ok(q.sl + 1e-12 >= cell.sl, `${kind}: feedback cannot narrow the initial stop`);
        if (cell.trail > 0) {
          assert.ok(q.trail * (q.trailStep ?? 1) + 1e-12 >= cost + 2 * fine.step, `${kind}: trail gap floor`);
          assert.ok(q.trail + 1e-12 >= cell.trail, `${kind}: feedback cannot narrow the initial trail`);
        } else assert.equal(q.trail, 0, "feedback must not create a trail on a normal cell");
        // Keep the existing four-decimal result exactly whenever its rounding did not narrow the initial distance.
        const legacySl = +(cell.sl * slMult).toFixed(4);
        const legacyTrail = cell.trail > 0 ? +(cell.trail * trailMult).toFixed(4) : 0;
        if (legacySl >= cell.sl) assert.equal(q.sl, legacySl);
        if (legacyTrail >= cell.trail) assert.equal(q.trail, legacyTrail);
        const set = `${pair}|${kind}`;
        const feedback: AdjustState = { [set]: { set, level: 1, minSl: 0, minTrail: 0, pausedUntil: 0,
          pf: 1, n: 10, lastExitT: 0, at: 0, note: "", slMult, trailMult } };
        const tapes = buildTapes(u, [cell], cost, undefined, new Set([pair]), null, feedback);
        assert.equal(tapes.length, 1);
        assert.deepEqual(tapes[0].protect, laneProtect(q, ind));
        assert.equal(configId("follow", ind, parseConfigId(tapes[0].id)!.protect), tapes[0].id);
      }
    }
    const raised = adjustProtect(p, { minSl: 0.0035555, minTrail: 0.0055555 });
    assert.ok(raised.sl >= 0.0035555 && raised.trail >= 0.0055555, "custom absolute floors round away safely");
    const original = { ...p, lowRangeOnly: undefined };
    assert.equal(adjustProtect(original, { minSl: 0, minTrail: 0, slMult: 1, trailMult: 1.1 }).sl,
      +original.sl.toFixed(4), "non-Low-Range feedback remains unchanged");
    assert.equal(adjustProtect(p, null), p, "without feedback the original protect is not altered");

    // Exercise the full configured ratio/target grid, including the finest accepted step and zero cost.
    for (const step of [0.000001, 0.0000013, 0.000131, 0.002011, 0.007999]) {
      for (const c of [0, 0.000123, 0.0015]) {
        const variants = lowRangeGridProtects({ ...DEFAULT_LOW_RANGE_GRID, enabled: true, step }, c);
        for (const cell of [...variants, ...trailingOnlyProtects(variants)]) {
          for (const [slMult, trailMult] of [[1, 1.1], [1.1, 1], [1.25, 1.25]] as const) {
            const q = adjustProtect(cell, { minSl: 0, minTrail: 0, slMult, trailMult });
            assert.ok(q.sl + 1e-12 >= c + step && q.sl + 1e-12 >= cell.sl);
            if (cell.trail > 0)
              assert.ok(q.trail * (q.trailStep ?? 1) + 1e-12 >= c + 2 * step && q.trail + 1e-12 >= cell.trail);
            else assert.equal(q.trail, 0);
          }
        }
      }
    }
  });

  it("enforces Short-only scope, lane floors, and refuses the default-protect Base fallback", () => {
    const allowed = { enabled: () => true, minTf: { sh: 5 } };
    for (const tag of ["", "mc", "mn", "gn", "lg"]) assert.equal(rangeAppliesTo(`${IND}@m15`, tag, allowed), false);
    assert.equal(rangeAppliesTo(`${IND}@m1`, "sh", allowed), false);
    assert.equal(rangeAppliesTo(`${IND}@m5`, "sh", allowed), true);
    const good = { ...statsOf([], 0), n: 10, pf: 2, net: 1, mdd: 0 };
    assert.deepEqual(basePassTags({ ind: IND, full: good }, { minPf: 1.1, minTrades: 1 }, ["sh"]), []);
    assert.deepEqual(basePassTags({ ind: IND, full: good, ranges: { sh: good } }, { minPf: 1.1, minTrades: 1 }, ["sh"]), ["sh"]);
    const exitPairs = exitStrategyPairs([{ ind: IND }, { ind: "ema-9-21@m1" }] as never, u,
      { timeframes: [1], includeMicro: false, includeTactics: false, includeRelations: false } as never);
    assert.ok(exitPairs.some((p) => p.includes("ema-9-21")));
    assert.ok(exitPairs.every((p) => !p.includes("low-range-")));
  });

  it("propagates exact passing lane cells, and only those cells may take a seat", () => {
    const ind = `${IND}@m1`, pair = `follow|${ind}`;
    const ps = protectGrid(REF_TF, grid, cost).filter((p) => p.lowRangeOnly);
    assert.ok(ps.length >= 3);
    const accepted = protectCellKey(laneProtect(ps[0], ind));
    const stat = { n: 10, pf: 2, net: 1, mdd: 0,
      baseLast: { requested: 40, n: 10, gp: 2, gl: 1, stop: .5 } };
    const s = { ...DEFAULT_SETTINGS, grid, gates: { ...DEFAULT_SETTINGS.gates, minTrades: 1 } };
    const row = { bot: "follow", ind, full: stat, ranges: { sh: stat }, rangeTps: { sh: [ps[0].tp] },
      rangeCells: [accepted], score: 1 };
    const b = basePass([row] as never, s as never);
    assert.deepEqual(b.qualifiedCells[pair], [accepted]);
    const tapes = buildTapes(u, protectGrid(REF_TF, grid, cost), cost, undefined, new Set([pair]), null, undefined,
      { minSl: 0, minTrail: 0, pairTags: b.pairTags, pairTps: b.pairTps, pairCells: b.pairCells });
    assert.equal(tapes.length, 1);
    assert.equal(protectCellKey(tapes[0].protect), accepted);
    const published = { basePassedCells: passedCellsOf(b.qualifiedCells) };
    assert.equal(cellAllowed(tapes[0], published), true);
    assert.equal(cellAllowed({ ...tapes[0], protect: laneProtect(ps[1], ind) }, published), false);
    assert.equal(cellAllowed(tapes[0], { basePassedCells: {} }), false);
    const diagnostic = basePass([row] as never, { ...s, grid: { ...grid, allSets: true } } as never);
    assert.deepEqual(diagnostic.qualifiedCells[pair], [accepted], "diagnostic full-grid construction must not widen admission");
  });

  it("measures real Base cells identically on a worker and locally before building their tapes", async () => {
    const ind = "low-range-12-failed-break-standalone@m1", pair = `follow|${ind}`;
    const bars = [barsFromCandles("A", 1, syntheticCandles("A", 1, 1200, Date.UTC(2026, 9, 1), 1))];
    const g = { ...grid, lowRange: { ...lowRange, steps: [2, 3] } };
    const gates = { ...DEFAULT_SETTINGS.gates, minTrades: 1 };
    const settings = { ...DEFAULT_SETTINGS, grid: g, gates };
    const combos = [{ bot: "follow" as const, ind }];
    const rp = baseRangeProtects(g, cost), complete = completeBaseRangeProtects(g, cost);
    const local = baseRuns(makeUniverse(bars), combos, cost, settings.tactics, false, false, undefined,
      rp, { sh: 1 }, false, gates, complete, false);
    assert.ok(local[0]?.rangeCells?.length, "fixture has genuinely passing cells with baseCells off");
    const remote = await runOnWorkers<{ runsJson: string[] }>([{ type: "s1", bars, combos, cost,
      tactics: settings.tactics, rangeProtects: rp, completeRangeProtects: complete,
      rangeMinTf: { sh: 1 }, microOwnInds: false, gates, cells: false }], 1);
    const worker = remote.flatMap((x) => x.runsJson.flatMap((j) => JSON.parse(j)));
    assert.deepEqual(worker[0].rangeCells, local[0].rangeCells);
    assert.deepEqual(worker[0].ranges.sh, local[0].ranges?.sh);
    const b = basePass(local, settings as never);
    assert.deepEqual(b.qualifiedCells[pair], local[0].rangeCells);
    const tapes = buildTapes(makeUniverse(bars), protectGrid(REF_TF, g, cost), cost, undefined,
      new Set([pair]), settings.tactics, undefined,
      { minSl: 0, minTrail: 0, pairTags: b.pairTags, pairTps: b.pairTps, pairCells: b.pairCells });
    assert.ok(tapes.length > 0);
    const approved = new Set(local[0].rangeCells);
    assert.ok(tapes.every((t) => approved.has(protectCellKey(t.protect))));
  });

  it("rebuilds removed held cells with their exact lane hold and no new seat", () => {
    const ind = `${IND}@m1`, pair = `follow|${ind}`;
    const p = laneProtect(lowRangeGridProtects(lowRange, cost)[0], ind);
    const id = configId("follow", ind, p);
    const tapes = buildTapes(u, [], cost, undefined, new Set([pair]), null, undefined, {
      minSl: 0, minTrail: 0, pairTags: { [pair]: [] }, heldIds: new Set([id]),
    });
    assert.equal(tapes.length, 1);
    assert.equal(tapes[0].id, id);
    assert.equal(tapes[0].protect.hold, p.hold);
    assert.equal(tapes[0].heldOnly, true);
  });

  it("validates complete Low-Range settings and rejects malformed or excessive values", () => {
    assert.doesNotThrow(() => checkSettings({ grid } as never));
    assert.throws(() => checkSettings({ grid: { ...grid, lowRange: { ...lowRange, slRatios: [0.49] } } } as never));
    assert.throws(() => checkSettings({ grid: { ...grid, lowRange: { ...lowRange, steps: [2.5] } } } as never));
    assert.throws(() => checkSettings({ grid: { ...grid, lowRange: { ...lowRange, maxHoldMin: 0 } } } as never));
    assert.throws(() => checkSettings({ grid: { ...grid, lowRange: { ...lowRange, step: NaN } } } as never));
    assert.throws(() => checkSettings({ grid: { ...grid, lowRange: { ...lowRange, slRatios: [undefined] } } } as never));
  });
});
