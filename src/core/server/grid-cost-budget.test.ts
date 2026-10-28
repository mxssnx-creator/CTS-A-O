import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { DEFAULT_LOW_RANGE_GRID } from "../indications/low-range.ts";
import { checkMerged, checkSettings } from "../settings-check.ts";
import { checkGridVariantBudget, gridVariants, protectGrid } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const grid = () => ({ ...structuredClone(DEFAULT_SETTINGS.grid), trailingOnly: true,
  lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true, step: .0000013 } });

test("variant budget counts the actual modeled cost including fractional Low-Range and no-TP deduplication", () => {
  const g = grid();
  assert.doesNotThrow(() => checkSettings({ cost: .0001, grid: g }));
  for (const cost of [0, .0001, .0011, .0014, .0015])
    assert.equal(gridVariants(g, cost), protectGrid(15, g, cost).length, `cost ${cost}`);
  assert.equal(gridVariants(g), gridVariants(g, DEFAULT_SETTINGS.cost));
  assert.equal(gridVariants(g, .0015), 4158);
  assert.equal(gridVariants(g, .0001), 4212);
  assert.equal(checkGridVariantBudget(g, .0015, 4200), 4158);
  assert.throws(() => checkGridVariantBudget(g, .0001, 4200), /4212 variants, max 4200/);
  assert.throws(() => checkGridVariantBudget(g, NaN), /finite nonnegative/);
  const ordinary = { ...g, trailingOnly: false };
  for (const cost of [.0001, .0015])
    assert.ok(gridVariants(ordinary, cost) >= protectGrid(15, ordinary, cost).length);
});

test("merged settings, fee-only changes and preset application retain effective cost and held protection after reload", () => {
  const db = new CoreDb(":memory:"), first = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  first.stop(); let restored: CoreRuntime | undefined;
  try {
    first.updateSettings({ grid: { lowRange: { enabled: true, step: .0000013 } }, cost: .0014 });
    assert.equal(first.settings.cost, .0014);
    assert.equal(gridVariants(first.settings.grid, first.settings.cost), protectGrid(15, first.settings.grid, first.settings.cost).length);
    const fees = { taker: .00005, slippage: 0 };
    assert.doesNotThrow(() => checkMerged(first.settings, { fees }));
    first.updateSettings({ fees });
    assert.equal(first.settings.cost, .0001, "fee-only patch derives and validates merged effective cost");
    assert.equal(gridVariants(first.settings.grid, first.settings.cost), 4212);
    assert.equal(first.wf.protects.length, 4212);
    const source = first.findPreset("live-all-independent"); assert.ok(source);
    const saved = { ...structuredClone(source), id: "grid-cost-budget-preset", kind: "saved" as const,
      settings: { grid: { lowRange: { enabled: true, step: .0000013 } } } };
    db.kvSet("presets", [saved]);
    first.updatePreset(saved.id, { grid: { trailingOnly: true } }, {});
    first.applyPreset(saved.id);
    assert.equal(first.settings.cost, .0001, "preset cannot reset the desk cost");
    assert.equal(gridVariants(first.settings.grid, first.settings.cost), protectGrid(15, first.settings.grid, first.settings.cost).length);
    const held = { cfg: "follow|ema-9-21@m5|tp1|sl1|tr0|h32", sym: "AAA-USDT", side: 1,
      entryT: Date.now() - 60_000, entryI: 0, entry: 10, stop: 9, target: 11, peak: 10, trailOn: false, mtm: 0, vol: 1, level: 0 };
    db.kvSet("paperBook", { startedAt: Date.now() - 60_000, selected: [held.cfg], positions: [held] });
    first.dispose();
    restored = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null }); restored.stop();
    assert.equal(restored.settings.cost, .0001);
    assert.equal(gridVariants(restored.settings.grid, restored.settings.cost), protectGrid(15, restored.settings.grid, restored.settings.cost).length);
    assert.equal(restored.paper.positions.length, 1);
    assert.equal(restored.paper.positions[0].stop, 9, "restart preserves the held position's own stop");
  } finally { first.dispose(); restored?.dispose(); db.db.close(); }
});
