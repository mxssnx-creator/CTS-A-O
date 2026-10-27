import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS, SHORT_RANGE } from "../config.ts";
import { presetActionData, presetActionInput, saveCoreSettingsData, saveCoreSettingsInput } from "../api-data.ts";
import { lowRangeGridProtects } from "../indications/low-range.ts";
import { checkMerged, checkSettings } from "../settings-check.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_LIVE = "0";
process.env.CTS_CORE_PRIMARY_CONN = DEFAULT_SETTINGS.live.connId;
const G = globalThis as unknown as { __ctsCoreRuntime?: CoreRuntime };

test("partial Low-Range API saves preserve every configured sibling, reject invalid leaves and materialize executable cells", async () => {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  rt.stop();
  const previous = G.__ctsCoreRuntime;
  G.__ctsCoreRuntime = rt;
  try {
    const custom = { enabled: false, step: 0.003, steps: [2, 4, 6],
      slRatios: [0.5, 1.25, 3.5], trailRatios: [0, 0.5], maxHoldMin: 90 };
    rt.updateSettings({ grid: { lowRange: custom } });
    const input = saveCoreSettingsInput({ settings: { grid: { lowRange: { enabled: true } } } });
    await saveCoreSettingsData(input);
    assert.deepEqual(rt.settings.grid.lowRange, { ...custom, enabled: true });
    const cells = lowRangeGridProtects(rt.settings.grid.lowRange, rt.settings.cost, 15);
    assert.ok(cells.length > 0);
    assert.ok(cells.some((p) => Math.abs(p.tp - (rt.settings.cost + 2 * custom.step)) < 1e-9));

    await saveCoreSettingsData(saveCoreSettingsInput({ settings: { grid: { lowRange: { steps: [3, 5], maxHoldMin: 75 } } } }));
    assert.deepEqual(rt.settings.grid.lowRange, { ...custom, enabled: true, steps: [3, 5], maxHoldMin: 75 });
    assert.deepEqual(db.kvGet<{ grid: { lowRange: unknown } }>("settings")?.grid.lowRange, rt.settings.grid.lowRange);
    const before = structuredClone(rt.settings.grid.lowRange);
    for (const patch of [{ step: 0 }, { maxHoldMin: 1.5 }, { steps: [2.5] }, { slRatios: [0.49] },
      { trailRatios: [1.01] }, { enabled: "yes" }, { steps: [] }, { slRatios: ["1"] }, null]) {
      assert.throws(() => saveCoreSettingsInput({ settings: { grid: { lowRange: patch as never } } }));
      assert.deepEqual(rt.settings.grid.lowRange, before);
    }
    assert.throws(() => rt.updateSettings({ grid: { lowRange: { slRatios: [0.4] } } }));
    assert.deepEqual(rt.settings.grid.lowRange, before, "an invalid direct update is atomic");

    // The new targeted merge does not change the documented one-level replacement of other range objects.
    const short = { ...SHORT_RANGE, minTf: 5, tp: [0.012] };
    await saveCoreSettingsData(saveCoreSettingsInput({ settings: { grid: { short } } }));
    assert.deepEqual(rt.settings.grid.short, short);
    assert.deepEqual(rt.settings.grid.lowRange, before);
    await saveCoreSettingsData(saveCoreSettingsInput({ settings: { grid: { short: false } } }));
    assert.equal(rt.settings.grid.short, false);
    assert.deepEqual(rt.settings.grid.lowRange, before);
    for (const range of ["micro", "minimal", "short", "general", "long"] as const) {
      const previousRange = structuredClone(rt.settings.grid[range]);
      const incomplete = { grid: { [range]: { minTf: 5 } } };
      const parsed = saveCoreSettingsInput({ settings: incomplete as never });
      await assert.rejects(() => saveCoreSettingsData(parsed), new RegExp(`${range} range replaces.*complete`));
      assert.throws(() => rt.updateSettings(incomplete as never), new RegExp(`${range} range replaces.*complete`));
      assert.deepEqual(rt.settings.grid[range], previousRange, `${range} remains intact after rejection`);
    }
  } finally {
    if (previous) G.__ctsCoreRuntime = previous; else delete G.__ctsCoreRuntime;
    rt.dispose(); db.db.close();
  }
});

test("an enabling-only patch checks the complete merged grid budget before publishing settings", async () => {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  rt.stop();
  const previous = G.__ctsCoreRuntime;
  G.__ctsCoreRuntime = rt;
  try {
    const many = Array<number>(64).fill(2), stops = Array<number>(64).fill(0.5), trails = Array<number>(64).fill(0.5);
    rt.updateSettings({ grid: { lowRange: { enabled: false, steps: many, slRatios: stops, trailRatios: trails } } });
    const before = structuredClone(rt.settings.grid.lowRange);
    const patch = { grid: { lowRange: { enabled: true } } };
    assert.doesNotThrow(() => checkSettings(patch), "a valid partial patch is independently accepted");
    assert.throws(() => checkMerged(rt.settings, patch), /grid too large/);
    await assert.rejects(() => saveCoreSettingsData(saveCoreSettingsInput({ settings: patch })), /grid too large/);
    assert.throws(() => rt.updateSettings(patch), /grid too large/);
    assert.deepEqual(rt.settings.grid.lowRange, before, "rejected merged combinations never publish");
    rt.updateSettings({ grid: { trailingOnly: false,
      lowRange: { enabled: true, steps: many, slRatios: stops.slice(0, 32), trailRatios: trails.slice(0, 32) } } });
    const accepted = structuredClone(rt.settings.grid);
    await assert.rejects(() => saveCoreSettingsData(saveCoreSettingsInput({ settings: { grid: { trailingOnly: true } } })), /grid too large/);
    assert.deepEqual(rt.settings.grid, accepted, "an unrelated grid lever cannot bypass the merged Low-Range budget");
  } finally {
    if (previous) G.__ctsCoreRuntime = previous; else delete G.__ctsCoreRuntime;
    rt.dispose(); db.db.close();
  }
});

test("editing and applying a preset merges Low-Range leaves while preserving its other grid settings", async () => {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  rt.stop();
  const previous = G.__ctsCoreRuntime;
  G.__ctsCoreRuntime = rt;
  try {
    const template = rt.findPreset("live-all-independent");
    assert.ok(template);
    const custom = { enabled: false, step: 0.003, steps: [2, 6], slRatios: [0.5, 2], trailRatios: [0, 0.5], maxHoldMin: 90 };
    const short = { ...SHORT_RANGE, tp: [0.012], minTf: 5 };
    const saved = { ...structuredClone(template), id: "saved-low-range-settings", kind: "saved" as const,
      settings: { grid: { ...DEFAULT_SETTINGS.grid, short, lowRange: custom } } };
    db.kvSet("presets", [saved]);
    const updated = (await presetActionData(presetActionInput({ action: "update", id: saved.id,
      settings: { grid: { lowRange: { enabled: true } } }, wf: {} })) as unknown as { preset: typeof saved }).preset;
    assert.deepEqual(updated.settings.grid?.lowRange, { ...custom, enabled: true });
    assert.deepEqual(updated.settings.grid?.short, short);
    assert.deepEqual(updated.settings.grid?.tp, saved.settings.grid.tp);
    await presetActionData(presetActionInput({ action: "apply", id: saved.id }));
    assert.deepEqual(rt.settings.grid.lowRange, { ...custom, enabled: true });
    assert.deepEqual(rt.settings.grid.short, short);
  } finally {
    if (previous) G.__ctsCoreRuntime = previous; else delete G.__ctsCoreRuntime;
    rt.dispose(); db.db.close();
  }
});
