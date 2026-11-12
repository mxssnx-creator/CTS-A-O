import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import { DEFAULT_LOW_RANGE_GRID } from "./indications/low-range.ts";
import { completeBaseRangeProtects, configId, laneProtect, parseConfigId, protectCellKey, REF_TF } from "./pipeline/pipeline.ts";
import { protectGrid } from "./sim/walkforward.ts";
import { minimumStopFraction } from "./protection-policy.ts";
import { orderCfgKey } from "./sim/walkforward.ts";

// Operator, 11 Nov 2026: "für jede configuration possibility own sets". Every distinct TP × SL × trail × hold cell of
// the Micro and Low-Range ladders is one config with its own identity from the Base grid to the order key; requests
// that resolve to the same distances (the initial-stop floor, the trail floor) are one cell, never two ids.
const cost = DEFAULT_SETTINGS.cost;
const grid = { ...DEFAULT_SETTINGS.grid, minimal: false as const, short: false as const, general: false as const,
  long: false as const, lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true } };

for (const [tag, ind] of [["mc", "micro-5-drawdown-turn-fast@m5"], ["lr", "low-range-12-breakout-standalone@m5"]] as const)
  test(`${tag}: Base and executable grids hold the same cells, each with one distinct, round-tripping config id`, () => {
    const base = completeBaseRangeProtects(grid, cost).filter((p) => p.tag === tag);
    const exec = protectGrid(REF_TF, grid, cost).filter((p) => p.tag === tag);
    assert.ok(base.length > 0);
    assert.deepEqual(base.map(protectCellKey).sort(), exec.map(protectCellKey).sort(), "Base validates exactly what trades");
    assert.equal(new Set(base.map(protectCellKey)).size, base.length, "no cell twice");
    const ids = exec.map((p) => configId("follow", ind, laneProtect(p, ind)));
    assert.equal(new Set(ids).size, ids.length, "every cell has its own config id");
    assert.equal(new Set(ids.map((id) => orderCfgKey(id))).size, ids.length, "and its own order key");
    for (const id of ids) {
      const parsed = parseConfigId(id);
      assert.ok(parsed, id);
      assert.equal(configId("follow", ind, parsed.protect), id, "the id carries the whole protection");
    }
    const floor = minimumStopFraction(cost);
    const plain = exec.filter((p) => !p.trailOnly);
    for (const p of plain) {
      assert.ok(p.sl + 1e-12 >= floor, "no initial stop inside cost + the minimum net distance");
      assert.ok(p.sl <= p.tp * 1.6 + 1e-6 || Math.abs(p.sl - floor) < 1e-9, `stop ${p.sl} beyond 1.6× target ${p.tp}`);
      if (p.trail > 0) assert.ok(p.trail * (p.trailStep ?? 1) <= p.tp * 0.6 + cost + 1e-6, `trail ${p.trail} of target ${p.tp}`);
    }
    // the ladder is really there: the widest target carries every requested ratio above the floor as its own stop
    const tpMax = Math.max(...plain.map((p) => p.tp));
    const stops = new Set(plain.filter((p) => p.tp === tpMax && p.trail === 0).map((p) => p.sl));
    assert.ok(stops.size >= 14, `${stops.size} distinct stops on the widest target`);
    const trails = new Set(plain.filter((p) => p.tp === tpMax).map((p) => p.trail));
    assert.equal(trails.size, 7, "plain plus six trailing distances on the widest target");
  });

test("at the runtime's normalized floors every range's executable cell carries the key Base proved (float-sum floors included)", async () => {
  const { normalizeLanes } = await import("./server/runtime.server.ts");
  // 0.00176 + 0.001 and 0.0011 + 0.001 are not exact binary sums; 0.002 + 0.001 is
  for (const c of [DEFAULT_SETTINGS.cost, 0.0011, 0.0014, 0.002]) {
    const s = normalizeLanes({ ...DEFAULT_SETTINGS, cost: c,
      grid: { ...DEFAULT_SETTINGS.grid, lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true } } });
    const base = completeBaseRangeProtects(s.grid, c), exec = protectGrid(REF_TF, s.grid, c);
    for (const tag of ["mc", "mn", "sh", "gn", "lg", "lr"] as const) {
      const b = base.filter((p) => p.tag === tag).map(protectCellKey).sort();
      const e = exec.filter((p) => p.tag === tag).map(protectCellKey).sort();
      assert.ok(b.length > 0, `${tag} at cost ${c}`);
      assert.deepEqual(e, b, `${tag} at cost ${c}: a cell on the stop floor must match its Base proof`);
    }
    assert.ok(exec.every((p) => p.sl + 1e-12 >= (p.tag === "mc" && s.grid.micro ? s.grid.micro.minSlEval ?? s.grid.minSl : s.grid.minSl)), "each range retains its own floor");
  }
});

test("each range's own minimum net stop distance replaces the global one for that range only, in Base and in the grid", async () => {
  const { normalizeLanes } = await import("./server/runtime.server.ts");
  const c = DEFAULT_SETTINGS.cost;
  const base = normalizeLanes({ ...DEFAULT_SETTINGS, grid: { ...DEFAULT_SETTINGS.grid, lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true } } });
  const own = normalizeLanes({ ...DEFAULT_SETTINGS, grid: { ...DEFAULT_SETTINGS.grid,
    micro: { ...DEFAULT_SETTINGS.grid.micro!, minSlDistancePct: 0.4 } as never,
    short: { ...DEFAULT_SETTINGS.grid.short!, minSlDistancePct: 0.2 } as never,
    lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true, minSlDistancePct: 0.5 } } });
  const floor = (pct: number) => minimumStopFraction(c, pct);
  const minSl = (cells: ReturnType<typeof protectGrid>, tag: string) => Math.min(...cells.filter((p) => p.tag === tag).map((p) => p.sl));
  const e0 = protectGrid(REF_TF, base.grid, c), e1 = protectGrid(REF_TF, own.grid, c);
  assert.ok(Math.abs(minSl(e0, "mc") - (base.microMinSlDistancePct ?? .1) / 100) < 1e-9, "Micro uses its independent absolute default floor");
  assert.ok(Math.abs(minSl(e1, "mc") - floor(0.4)) < 1e-9, "Micro: own 0.4 %");
  assert.ok(minSl(e1, "sh") >= floor(0.2) - 1e-9, "Short: never inside its own 0.2 % floor (its 0.25 x ladder is already wider)");
  assert.ok(Math.abs(minSl(e1, "lr") - floor(0.5)) < 1e-9, "Low-Range: own 0.5 %");
  assert.equal(minSl(e1, "mn"), minSl(e0, "mn"), "Minimal is unchanged by the other ranges' own values");
  for (const tag of ["mc", "mn", "sh", "gn", "lg", "lr"]) {
    const b = completeBaseRangeProtects(own.grid, c).filter((p) => p.tag === tag).map(protectCellKey).sort();
    assert.deepEqual(protectGrid(REF_TF, own.grid, c).filter((p) => p.tag === tag).map(protectCellKey).sort(), b, `${tag}: Base proves what trades`);
  }
});
