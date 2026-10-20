// Process only the validated sets after Base: the Base cell level (grid.baseCells), the validated set V
// (wf.seatSet "validated"), and the cell-keyed Base pass. Executed ids ⊆ V ⊆ Base cells, per side.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { baseRangeProtects, baseRuns, makeUniverse, protectCellKey, REF_TF } from "../pipeline/pipeline.ts";
import { basePass } from "../server/runtime.server.ts";
import { buildTapes, protectGrid } from "./walkforward.ts";
import type { Protect } from "../domain/types.ts";

const T_END = Date.UTC(2026, 9, 1);
const u = makeUniverse([
  barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3)),
  barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 1800, T_END, 5)),
]);
const IND = "rsi-mom-14-20";
const pair = `follow|${IND}`;
const grid = { ...DEFAULT_SETTINGS.grid, holdH: [16] };
const settings = (g: object = {}) => ({
  ...DEFAULT_SETTINGS,
  gates: { ...DEFAULT_SETTINGS.gates, minPf: 0.5, baseSetsMinPf: 0.5, minTrades: 1, maxDdr: 0 },
  grid: { ...grid, ...g },
});

describe("B1: Base cells", () => {
  it("the tape stage builds only the passed cells of a range, not every stop of a passed target", () => {
    const protects: Protect[] = [
      { tp: 0.012, sl: 0.012, trail: 0, hold: 64, tag: "mn" },
      { tp: 0.012, sl: 0.018, trail: 0, hold: 64, tag: "mn" },
      { tp: 0.012, sl: 0.018, trail: 0.006, hold: 64, tag: "mn" },
      { tp: 0.012, sl: 0.03, trail: 0, hold: 128, tag: "mn" },
    ];
    const floors = { minSl: 0, minTrail: 0, pairTags: { [pair]: ["mn"] }, pairTps: { [pair]: { mn: [0.012] } } };
    const build = (extra: object) =>
      buildTapes(u, protects, 0.002, undefined, new Set([pair]), null, undefined, { ...floors, ...extra }).map((t) => protectCellKey(t.protect));
    assert.equal(build({}).length, 4, "target level: every cell of the target");
    const keep = [protectCellKey(protects[1]), protectCellKey(protects[2])];
    assert.deepEqual(build({ pairCells: { [pair]: keep } }).sort(), [...keep].sort());
    // a range without an entry in the cells keeps the target level
    assert.equal(build({ pairCells: { [pair]: ["sh|0.1|0.1|0|8"] } }).length, 4);
  });

  it("Base measures exactly cells the grid builds (every hold, every trail ratio with baseTrailCells)", () => {
    const g = { ...DEFAULT_SETTINGS.grid, holdH: [8, 16], baseCells: true, baseTrailCells: true };
    const cells = baseRangeProtects(g, 0.002);
    const gridKeys = new Set(protectGrid(REF_TF, g, 0.002).map(protectCellKey));
    assert.ok(cells.length > 0);
    const off = baseRangeProtects({ ...g, baseCells: false, baseTrailCells: false }, 0.002);
    assert.ok(cells.length > off.length, "more cells measured than the representative ones");
    assert.ok(cells.some((c) => c.trail > 0), "trailed cells measured");
    for (const c of cells) assert.ok(gridKeys.has(protectCellKey(c)), `Base cell ${protectCellKey(c)} is a grid cell`);
    // without baseTrailCells no trailed cell
    assert.ok(baseRangeProtects({ ...g, baseTrailCells: false }, 0.002).every((c) => c.trail === 0));
  });

  it("passed cells ⊆ Base cells, and the tapes built from them ⊆ passed cells", () => {
    const s = settings({ baseCells: true, baseTrailCells: true, short: false, general: false, long: false, micro: false });
    const rp = baseRangeProtects(s.grid, s.cost);
    const runs = baseRuns(u, [{ bot: "follow", ind: IND }], s.cost, s.tactics, false, false, undefined, rp, undefined, false, s.gates, true);
    assert.ok(runs.length === 1 && runs[0].rangeCells?.length, "some cells passed");
    const bp = basePass(runs, s as never);
    const cells = bp.pairCells[pair];
    assert.ok(cells?.length);
    const measured = new Set(rp.map(protectCellKey));
    for (const k of cells) assert.ok(measured.has(k), `${k} measured`);
    const protects = protectGrid(REF_TF, s.grid, s.cost);
    const tapes = buildTapes(u, protects, s.cost, undefined, new Set([pair]), null, undefined, {
      minSl: 0,
      minTrail: 0,
      pairTags: bp.pairTags,
      pairTps: bp.pairTps,
      pairCells: bp.pairCells,
    });
    const passed = new Set(cells);
    const tagged = tapes.filter((t) => t.protect.tag === "mn" && !t.heldOnly);
    assert.ok(tagged.length > 0);
    for (const t of tagged) assert.ok(passed.has(protectCellKey(t.protect)), `${t.id} built from a passed cell`);
    const wide = buildTapes(u, protects, s.cost, undefined, new Set([pair]), null, undefined, { minSl: 0, minTrail: 0, pairTags: bp.pairTags, pairTps: bp.pairTps });
    assert.ok(wide.length > tapes.length, "the cell level builds fewer tapes");
  });
});

import { defaultWalkForward, selectFixed, selectFixedGen, validatedSetGen, walkForward, type ConfigTape } from "./walkforward.ts";

const H = 3_600_000;
describe("B2: the validated set V", () => {
  const u2 = makeUniverse([
    barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3)),
    barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 1800, T_END, 5)),
    barsFromCandles("C-USDT", 15, syntheticCandles("C-USDT", 15, 1800, T_END, 9)),
  ]);
  const s = { ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.0, minTrades: 3, maxDdr: 0 } };
  const tapes: ConfigTape[] = buildTapes(u2, protectGrid(15, { ...DEFAULT_SETTINGS.grid, holdH: [16] }), 0.002, undefined, new Set(["follow|ema-21-55", "follow|rsi-mom-14-20", "revert|z-50-2", "revert|ema-21-55"]));
  const base = { ...defaultWalkForward(s), longH: 96, preH: 20, simH: 48, stepH: 1 };
  const vset = (o = base) => {
    const g = validatedSetGen(tapes, u2.nowT - 48 * H, o);
    for (let r = g.next(); ; r = g.next()) if (r.done) return r.value;
  };

  it("V is non-empty and a strict subset of the pool (the comparison is not vacuous)", () => {
    const v = vset();
    assert.ok(v.size > 0 && v.size < tapes.length, `${v.size} of ${tapes.length}`);
  });

  it("every step selects only from V, and exactly the pool's picks that are in V (gates may drop, never add)", () => {
    const v = vset();
    const ov = { ...base, seatSet: "validated" as const, validated: v };
    let compared = 0;
    for (let i = 1; i <= 24; i++) {
      const t = u2.nowT - (48 - i) * H;
      const pool = selectFixed(tapes.slice(), t, base).picks.map((p) => p.id);
      const val = selectFixed(tapes.slice(), t, ov).picks.map((p) => p.id);
      assert.deepEqual(val.sort(), pool.filter((id) => v.has(id)).sort(), `step ${i}`);
      for (const id of val) assert.ok(v.has(id));
      compared += val.length;
    }
    assert.ok(compared > 0, "some seats");
  });

  it("a run's executed ids ⊆ result.validated ⊆ the tapes, per side; the default path is unchanged", () => {
    const pool = walkForward(u2, tapes, base);
    const pool2 = walkForward(u2, tapes, { ...base, seatSet: "pool" });
    assert.equal(JSON.stringify(pool.trades), JSON.stringify(pool2.trades), '"pool" is today');
    assert.equal(pool.validated, undefined);
    const r = walkForward(u2, tapes, { ...base, seatSet: "validated" });
    assert.ok(r.validated && r.validated.length > 0);
    const v = new Set(r.validated);
    const ids = new Set(tapes.map((t) => t.id));
    for (const id of v) assert.ok(ids.has(id));
    const sides = new Set<number>();
    for (const tr of r.trades) {
      assert.ok(v.has(tr.cfg), `${tr.cfg} executed outside V`);
      sides.add(tr.side);
    }
    assert.ok(r.trades.length > 0, "the run executed trades");
    assert.ok(sides.size === 2, "both sides executed");
    // the pool executes configs outside V (the restriction is real)
    assert.ok(pool.trades.some((tr) => !v.has(tr.cfg)), "the pool executes outside V");
  });

  it("probe and invertSeats are refused under seatSet validated", () => {
    assert.throws(() => walkForward(u2, tapes, { ...base, seatSet: "validated", invertSeats: true }), /invertSeats/);
    assert.throws(() => walkForward(u2, tapes, { ...base, seatSet: "validated", probe: { perRange: 2 } }), /probe/);
  });

  it("selectFixedGen under V scans only V's tapes when given the compacted list (same picks)", () => {
    const v = vset();
    const ov = { ...base, seatSet: "validated" as const, validated: v };
    const t = u2.nowT - 10 * H;
    const full = selectFixed(tapes.slice(), t, ov);
    const g = selectFixedGen(tapes.filter((tp) => v.has(tp.id)), t, ov);
    let r = g.next();
    while (!r.done) r = g.next();
    assert.equal(JSON.stringify(r.value.picks), JSON.stringify(full.picks));
  });
});
