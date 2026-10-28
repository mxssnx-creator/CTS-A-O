import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { AdjustState } from "../adjust.ts";
import type { Protect, StratKind } from "../domain/types.ts";
import { lowRangeGridProtects, DEFAULT_LOW_RANGE_GRID } from "../indications/low-range.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { configId, laneProtect, makeUniverse, protectCellKey, rangeBaseStats } from "../pipeline/pipeline.ts";
import { baseAllowsTape, buildTapes, cellAllowed, defaultWalkForward, execDecision, passedCellsOf } from "./walkforward.ts";
import { trailingOnlyProtects } from "./trailing.ts";

const cost = DEFAULT_SETTINGS.cost;
const tf = 1;
const ind = "low-range-12-failed-break-standalone@m1";
const pair = `follow|${ind}`;
const u = makeUniverse([
  barsFromCandles("A", tf, syntheticCandles("A", tf, 1800, Date.UTC(2026, 9, 1), 1)),
  barsFromCandles("B", tf, syntheticCandles("B", tf, 1800, Date.UTC(2026, 9, 1), 5)),
]);
const grid = { ...DEFAULT_LOW_RANGE_GRID, enabled: true, steps: [2], slRatios: [1, 2], trailRatios: [0, 1] };
const all = lowRangeGridProtects(grid, cost);

function variant(kind: StratKind): [Protect, Protect] {
  const candidate = kind === "trailing-only" ? trailingOnlyProtects(all) :
    all.filter((p) => kind === "normal" ? p.trail === 0 : p.trail > 0);
  const [a, b] = [...candidate].sort((x, y) => x.sl - y.sl);
  assert.ok(a && b && a.sl < b.sl, `${kind} source cells`);
  return [a, b];
}

function adjustFor(kind: StratKind, a: Protect, b: Protect): AdjustState {
  const set = `${pair}|${kind}`;
  return { [set]: { set, level: 1, minSl: 0, minTrail: 0, pausedUntil: 0,
    pf: 0, n: 1, lastExitT: 0, at: 0, note: "fixture", slMult: b.sl / a.sl } };
}

function make(kind: StratKind, ps: Protect[], cells: string[], adjust?: AdjustState, heldIds = new Set<string>()) {
  return buildTapes(u, ps, cost, undefined, new Set([pair]), null, adjust, {
    minSl: 0, minTrail: 0, pairTags: { [pair]: ["sh"] },
    pairTps: { [pair]: { sh: [...new Set(ps.map((p) => p.tp))] } },
    pairCells: { [pair]: cells }, heldIds,
  });
}

for (const kind of ["normal", "trailing", "trailing-only"] as const) describe(`Low-Range ${kind} feedback Base-cell parity`, () => {
  const [a, b] = variant(kind);
  const ps = [a, b], ak = protectCellKey(laneProtect(a, ind)), bk = protectCellKey(laneProtect(b, ind));
  const feedback = adjustFor(kind, a, b);
  const proof = (cells: string[]) => ({ basePassed: new Set([pair]), basePassedRanges: { [pair]: ["sh"] },
    basePassedCells: passedCellsOf({ [pair]: cells }) });

  it("does not build an adjusted new tape on only the source cell's Base proof", () => {
    const unchanged = make(kind, ps, [ak]);
    assert.equal(unchanged.length, 1);
    assert.equal(protectCellKey(unchanged[0].protect), ak);
    assert.equal(cellAllowed(unchanged[0], proof([ak])), true);
    const adjusted = make(kind, ps, [ak], feedback);
    assert.equal(adjusted.length, 0, "the adjusted cell itself has no proof");
  });

  it("builds an adjusted cell only when its own cell was independently measured and passed", () => {
    const passed: string[] = [];
    const ranges = rangeBaseStats(u, "follow", ind, ps, cost, null, undefined, false,
      (_tag, stat) => stat.n > 0, tf, undefined, undefined, passed);
    assert.ok(ranges?.sh?.n, "real Base simulation produced settled observations");
    assert.ok(passed.includes(bk), "the exact adjusted distance is a separately measured grid cell");
    const adjusted = make(kind, ps, [bk], feedback);
    assert.equal(adjusted.length, 1);
    assert.equal(protectCellKey(adjusted[0].protect), bk);
    assert.equal(adjusted[0].heldOnly, undefined);
    assert.equal(cellAllowed(adjusted[0], proof([bk])), true);
    assert.equal(baseAllowsTape(adjusted[0], proof([bk])), true);
    assert.equal(baseAllowsTape(adjusted[0], proof([ak])), false);
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    const options = { ...defaults, ...proof([bk]), probe: { perRange: 0, perCell: 1 },
      normalBaseMinPf: 0, rangeOpts: undefined,
      toggles: { ...defaults.toggles, normal: true, trailing: true, block: false, blockActive: false } };
    for (const side of [1, -1]) {
      assert.equal(execDecision(adjusted[0], u.nowT, options, { sym: "A", side }).ok, true);
      assert.deepEqual(execDecision(adjusted[0], u.nowT, { ...options, ...proof([ak]) }, { sym: "A", side }),
        { ok: false, why: "base" }, "the downstream guard rejects the wrong proof on either side");
    }
  });

  it("retains an unproven held adjusted position by its own exact identity without a new seat", () => {
    const heldProtect = laneProtect(b, ind);
    const held = configId("follow", ind, heldProtect);
    const tapes = make(kind, ps, [ak], feedback, new Set([held]));
    assert.equal(tapes.length, 1);
    assert.equal(tapes[0].id, held);
    assert.equal(protectCellKey(tapes[0].protect), bk);
    assert.equal(tapes[0].heldOnly, true);
    assert.equal(baseAllowsTape(tapes[0], proof([ak])), false);
    assert.deepEqual(execDecision(tapes[0], u.nowT, { ...defaultWalkForward(DEFAULT_SETTINGS), ...proof([ak]) },
      { sym: "A", side: 1 }), { ok: false, why: "heldOnly" });
  });

  it("fails closed on a cell list with no Short proof and ignores another type's feedback", () => {
    assert.equal(make(kind, ps, ["gn|0.01|0.01|0|180"], feedback).length, 0);
    const other = kind === "normal" ? "trailing" : "normal";
    const onlySiblingFeedback = adjustFor(other, a, b);
    const own = make(kind, ps, [ak], onlySiblingFeedback);
    assert.equal(own.length, 1);
    assert.equal(protectCellKey(own[0].protect), ak);
  });
});

for (const kind of ["trailing", "trailing-only"] as const)
  it(`Low-Range ${kind} checks the effective trailing distance after feedback`, () => {
    const raw = lowRangeGridProtects({ ...grid, steps: [6], slRatios: [1], trailRatios: [.5, 1] }, cost);
    const candidates = (kind === "trailing-only" ? trailingOnlyProtects(raw) : raw).sort((x, y) => x.trail - y.trail);
    const [a, b] = candidates;
    assert.ok(a && b && a.trail < b.trail);
    const ak = protectCellKey(laneProtect(a, ind)), bk = protectCellKey(laneProtect(b, ind));
    const state = adjustFor(kind, a, b);
    state[`${pair}|${kind}`].slMult = 1;
    state[`${pair}|${kind}`].trailMult = b.trail / a.trail;
    const measured: string[] = [];
    rangeBaseStats(u, "follow", ind, candidates, cost, null, undefined, false,
      (_tag, stat) => stat.n > 0, tf, undefined, undefined, measured);
    assert.ok(measured.includes(bk), "the resulting trailing cell was independently measured");
    assert.equal(make(kind, candidates, [ak], state).length, 0, "source proof cannot qualify changed trailing");
    const adjusted = make(kind, candidates, [bk], state);
    assert.equal(adjusted.length, 1);
    assert.equal(protectCellKey(adjusted[0].protect), bk);
  });
