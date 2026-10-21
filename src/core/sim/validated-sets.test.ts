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

import { cellAllowed, passedCellsOf } from "./walkforward.ts";
import { withCarried } from "../server/runtime.server.ts";

describe("B3: Base pass keyed by cell", () => {
  const u3 = makeUniverse([barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3))]);
  const p3 = "follow|rsi-mom-14-20";
  const s3 = { ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, minPf: 0.5, baseSetsMinPf: 0.5, minTrades: 1, maxDdr: 0 } };
  const tp3 = buildTapes(u3, protectGrid(15, { ...DEFAULT_SETTINGS.grid, holdH: [16] }), 0.002, undefined, new Set([p3]), null, undefined, { minSl: 0, minTrail: 0 });
  const ranged = tp3.filter((t) => t.protect.tag);

  it("a tape of a range whose cell Base did not pass is not allowed; a range or pair without cells keeps the pair level", () => {
    assert.ok(ranged.length > 4);
    const keep = ranged.slice(0, 2);
    const cells = passedCellsOf({ [p3]: keep.map((t) => protectCellKey(t.protect)) });
    const o = { basePassedCells: cells };
    for (const t of keep) assert.equal(cellAllowed(t, o), true);
    const sameTag = ranged.filter((t) => t.protect.tag === keep[0].protect.tag && !keep.includes(t));
    assert.ok(sameTag.length > 0);
    for (const t of sameTag) assert.equal(cellAllowed(t, o), false, t.id);
    for (const t of tp3.filter((x) => !x.protect.tag || !cells[p3].tags.has(x.protect.tag))) assert.equal(cellAllowed(t, o), true);
    assert.equal(cellAllowed(sameTag[0], {}), true, "off without the option");
  });

  it("the selection seats no tape outside the passed cells, whatever built it", () => {
    const u4 = makeUniverse([
      barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3)),
      barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 1800, T_END, 5)),
      barsFromCandles("C-USDT", 15, syntheticCandles("C-USDT", 15, 1800, T_END, 9)),
    ]);
    const all = buildTapes(u4, protectGrid(15, { ...DEFAULT_SETTINGS.grid, holdH: [16] }), 0.002, undefined, new Set(["follow|ema-21-55", "revert|z-50-2"]));
    const byId = new Map(all.map((x) => [x.id, x]));
    const o = { ...defaultWalkForward(s3), longH: 96, preH: 20, gates: { ...s3.gates, minPf: 1.0, minTrades: 3, maxDdr: 0 } };
    let checked = 0;
    for (let i = 1; i <= 40 && !checked; i++) {
      const t = u4.nowT - (40 - i) * 6 * H;
      const picks = selectFixed(all.slice(), t, o).picks.map((p) => byId.get(p.id)!);
      const victim = picks.find((x) => x.protect.tag);
      if (!victim) continue;
      const pair = `${victim.bot}|${victim.ind}`;
      // Base passed every cell of the pair's ranges but the victim's
      const cells = passedCellsOf({ [pair]: all.filter((x) => `${x.bot}|${x.ind}` === pair && x.protect.tag && x !== victim).map((x) => protectCellKey(x.protect)) });
      const ov = { ...o, basePassedCells: cells };
      assert.equal(cellAllowed(victim, ov), false);
      const after = selectFixed(all.slice(), t, ov).picks.map((p) => p.id);
      assert.ok(!after.includes(victim.id), "the cell Base did not pass takes no seat");
      for (const id of after) assert.ok(cellAllowed(byId.get(id)!, ov), `${id} seated outside the passed cells`);
      checked++;
    }
    assert.ok(checked > 0, "a range config was seated in the pool (the check is not vacuous)");
  });

  it("a carried tape outside the current passed cells becomes held-only; the others stay seat-able", () => {
    const cells = passedCellsOf({ [p3]: ranged.slice(0, 2).map((t) => protectCellKey(t.protect)) });
    const tag = ranged[0].protect.tag!;
    const out = withCarried([], tp3, new Set([tag]), (t) => cellAllowed(t, { basePassedCells: cells }));
    assert.ok(out.length > 2);
    for (const t of out) assert.equal(!!t.heldOnly, !cellAllowed(t, { basePassedCells: cells }), t.id);
    assert.ok(out.some((t) => t.heldOnly) && out.some((t) => !t.heldOnly));
    assert.ok(withCarried([], tp3, new Set([tag])).every((t) => !t.heldOnly), "no allow: as today");
  });

  it("grid.allSets pairs are reported apart (addedKeys) and carry no cells", () => {
    const g = { ...grid, baseCells: true, allSets: true };
    const s = { ...s3, grid: g };
    const runs = baseRuns(u3, [{ bot: "follow", ind: IND }], s.cost, s.tactics, false, false, undefined, baseRangeProtects(g, s.cost), undefined, false, s.gates, true);
    const bp = basePass(runs, s as never);
    assert.equal(bp.pairCells[p3], undefined);
    assert.equal(bp.added, bp.addedKeys.size);
  });
});

import { dcaProtectGrid } from "./walkforward.ts";

describe("B6: skip what cannot seat", () => {
  const u6 = makeUniverse([barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3))]);
  const pr = "follow|rsi-mom-14-20";
  const other = "revert|z-50-2";
  const protects: Protect[] = [
    { tp: 0.012, sl: 0.012, trail: 0, hold: 64, tag: "mn" },
    { tp: 0.02, sl: 0.02, trail: 0, hold: 64 },
  ];
  const dcaOpt = { protects: dcaProtectGrid(15), dca: DEFAULT_SETTINGS.dca, axis: { ...DEFAULT_SETTINGS.axis, enabled: true } as never };
  const build = (floors: object, pairs = [pr, other]) =>
    buildTapes(u6, protects, 0.002, dcaOpt as never, new Set(pairs), null, undefined, { minSl: 0, minTrail: 0, ...floors });
  const kinds = (ts: ConfigTape[]) => [...new Set(ts.map((t) => t.kind))].sort();

  it("a DCA / Axis set is not built while its toggle is off, except a held id", () => {
    const all = build({});
    assert.ok(kinds(all).includes("dca") && kinds(all).includes("axis"), kinds(all).join());
    const noDca = build({ skipDca: true });
    assert.ok(!kinds(noDca).includes("dca") && !kinds(noDca).includes("dca-active") && kinds(noDca).includes("axis"));
    const noAxis = build({ skipAxis: true });
    assert.ok(!kinds(noAxis).includes("axis") && kinds(noAxis).includes("dca"));
    const held = all.find((t) => t.kind === "dca")!.id;
    assert.ok(build({ skipDca: true, heldIds: new Set([held]) }).some((t) => t.id === held), "the held id keeps its tape");
  });

  it("a held pair that did not pass Base builds only its held ids; a passed pair is untouched", () => {
    const all = build({});
    const held = all.find((t) => t.ind === "z-50-2" && t.kind === "normal")!.id;
    const got = build({ heldPairsOnly: new Set([other]), heldIds: new Set([held]) });
    assert.deepEqual(got.filter((t) => `${t.bot}|${t.ind}` === other).map((t) => t.id), [held]);
    assert.equal(got.filter((t) => `${t.bot}|${t.ind}` === pr).length, all.filter((t) => `${t.bot}|${t.ind}` === pr).length);
    assert.ok(got.find((t) => t.id === held)!.heldOnly, "held-only: no new seat");
    assert.equal(build({ heldPairsOnly: new Set([other]) }).filter((t) => `${t.bot}|${t.ind}` === other).length, 0);
  });
});

import { sanitizeWf } from "../server/runtime.server.ts";
describe("wf.seatSet reaches the engine", () => {
  it("sanitizeWf keeps validated / pool and drops anything else", () => {
    assert.equal(sanitizeWf({ seatSet: "validated" }).seatSet, "validated");
    assert.equal(sanitizeWf({ seatSet: "pool" }).seatSet, "pool");
    assert.equal(sanitizeWf({ seatSet: "x" as never }).seatSet, undefined);
  });
});
