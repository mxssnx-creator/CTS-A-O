// The per-range MAXIMUM position hold time (RangeGrid.maxHoldMin, minutes): a range's cells close by time after at most that long, in place of
// the grid's holdH. Unset leaves every cell as it was. (x01, 20 Oct: Micro 15 min, Minimal its own.)
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import {
  coordVariants,
  forEachCoord,
  forEachMicro,
  MICRO_RANGE,
  MINIMAL_RANGE,
  rangeHolds,
} from "./minimal-coord.ts";
import { laneProtect } from "./pipeline/pipeline.ts";
import { protectGrid } from "./sim/walkforward.ts";
import { checkSettings } from "./settings-check.ts";

const grid = (over: object = {}) => ({
  ...DEFAULT_SETTINGS.grid,
  holdH: [16, 24],
  micro: { ...MICRO_RANGE },
  minimal: { ...MINIMAL_RANGE },
  ...over,
});

test("without a hold limit every Micro and Minimal cell holds as before (16 h and 24 h = 64 and 96 bars of 15m)", () => {
  const cells = protectGrid(15, grid(), 0.002);
  for (const tag of ["mc", "mn"]) {
    const holds = new Set(cells.filter((p) => p.tag === tag).map((p) => p.hold));
    assert.deepEqual(
      [...holds].sort((a, b) => a - b),
      [64, 96],
      tag,
    );
  }
});

test("Micro maxHoldMin 15 builds one hold of 15 minutes per cell: 1 bar on the 15m grid, nothing else changes", () => {
  const off = protectGrid(15, grid(), 0.002).filter((p) => p.tag === "mc");
  const on = protectGrid(15, grid({ micro: { ...MICRO_RANGE, maxHoldMin: 15 } }), 0.002).filter(
    (p) => p.tag === "mc",
  );
  assert.ok(on.length > 0);
  assert.ok(
    on.every((p) => p.hold === 1),
    "every Micro cell holds one 15m bar",
  );
  // one hold instead of two: half the cells (the same distances, one hold each)
  assert.equal(on.length * 2, off.length);
  // Minimal is untouched
  const mn = protectGrid(15, grid({ micro: { ...MICRO_RANGE, maxHoldMin: 15 } }), 0.002).filter(
    (p) => p.tag === "mn",
  );
  assert.deepEqual(
    [...new Set(mn.map((p) => p.hold))].sort((a, b) => a - b),
    [64, 96],
  );
});

test("a hold limit is the same time on every lane: Micro 15 min is 15 bars of 1m, 3 of 5m, 1 of 15m", () => {
  const p = { tp: 0.004, sl: 0.004, trail: 0, hold: 1, tag: "mc" as const };
  assert.equal(laneProtect(p, "rsi-mom-14-20@m1").hold, 15);
  assert.equal(laneProtect(p, "rsi-mom-14-20@m5").hold, 3);
  assert.equal(laneProtect(p, "rsi-mom-14-20").hold, 1);
  // a default cell keeps its floor of 2 bars
  assert.equal(laneProtect({ ...p, hold: 2 }, "rsi-mom-14-20@m30").hold, 2);
});

test("Minimal maxHoldMin 60 holds 4 bars of 15m; rangeHolds and coordVariants follow the limit", () => {
  const mn = protectGrid(15, grid({ minimal: { ...MINIMAL_RANGE, maxHoldMin: 60 } }), 0.002).filter(
    (p) => p.tag === "mn",
  );
  assert.ok(mn.length > 0 && mn.every((p) => p.hold === 4));
  assert.deepEqual([...rangeHolds({ maxHoldMin: 60 }, [16, 24])], [1]);
  assert.deepEqual([...rangeHolds({ maxHoldMin: undefined }, [16, 24])], [16, 24]);
  assert.deepEqual([...rangeHolds(undefined, [16])], [16]);
  assert.equal(
    coordVariants(2, { ...MINIMAL_RANGE, maxHoldMin: 60 }) * 2,
    coordVariants(2, MINIMAL_RANGE),
  );
  const seen: number[] = [];
  forEachMicro({ holdH: [16, 24], micro: { ...MICRO_RANGE, maxHoldMin: 15 } }, (_tp, _k, _tr, h) =>
    seen.push(h),
  );
  assert.deepEqual([...new Set(seen)], [0.25]);
  const mnSeen: number[] = [];
  forEachCoord(
    {
      ...grid(),
      minimal: { ...MINIMAL_RANGE, maxHoldMin: 30 },
      short: false,
      general: false,
      long: false,
    },
    (_tp, _k, _tr, h, _a, _b, tag) => {
      if (tag === "mn") mnSeen.push(h);
    },
  );
  assert.deepEqual([...new Set(mnSeen)], [0.5]);
});

test("the settings check accepts a hold limit of 1–1440 minutes and refuses others", () => {
  const ok = checkSettings({
    grid: { ...DEFAULT_SETTINGS.grid, micro: { ...MICRO_RANGE, maxHoldMin: 15 } },
  });
  assert.ok(ok !== null);
  assert.throws(
    () =>
      checkSettings({
        grid: { ...DEFAULT_SETTINGS.grid, micro: { ...MICRO_RANGE, maxHoldMin: 0.5 } },
      }),
    /max hold time/,
  );
  assert.throws(
    () =>
      checkSettings({
        grid: { ...DEFAULT_SETTINGS.grid, minimal: { ...MINIMAL_RANGE, maxHoldMin: 5000 } },
      }),
    /max hold time/,
  );
  assert.doesNotThrow(() =>
    checkSettings({
      grid: { ...DEFAULT_SETTINGS.grid, minimal: { ...MINIMAL_RANGE, maxHoldMin: 60 } },
    }),
  );
});

test("maximum hold minutes are never rounded up on a slower lane", async () => {
  const { baseRangeProtects } = await import("./pipeline/pipeline.ts");
  for (const minutes of [10, 15]) {
    const g = grid({ micro: { ...MICRO_RANGE, maxHoldMin: minutes } });
    const cells = [...baseRangeProtects(g, 0.002), ...protectGrid(15, g, 0.002)]
      .filter(p => p.tag === "mc");
    assert.ok(cells.length > 0);
    for (const tf of [1, 5, 15, 30]) for (const cell of cells) {
      const scaled = laneProtect(cell, `mc-rsi2-5@m${tf}`);
      assert.equal(scaled.hold, Math.floor(minutes / tf));
      assert.ok(scaled.hold * tf <= minutes);
    }
  }
});

test("Base judges a range at its own maximum hold: Micro 15 min is 1 bar, Minimal 60 min 4 bars; others keep the grid hold", async () => {
  const { baseRangeProtects } = await import("./pipeline/pipeline.ts");
  const g = {
    holdH: [16, 24],
    baseBest: true,
    micro: { ...MICRO_RANGE, maxHoldMin: 15 },
    minimal: { ...MINIMAL_RANGE, maxHoldMin: 60 },
    short: DEFAULT_SETTINGS.grid.short,
    general: false as const,
    long: false as const,
  };
  const cells = baseRangeProtects(g, 0.002);
  const holds = (tag: string) => [
    ...new Set(cells.filter((p) => p.tag === tag).map((p) => p.hold)),
  ];
  assert.deepEqual(holds("mc"), [1]);
  assert.deepEqual(holds("mn"), [4]);
  assert.deepEqual(holds("sh"), [64]);
  // and the Base cells are among the cells the grid builds for the same range
  const grid = protectGrid(15, { ...DEFAULT_SETTINGS.grid, ...g }, 0.002);
  const key = (p: { tp: number; sl: number; hold: number; tag?: string }) =>
    `${p.tag}|${p.tp}|${p.sl}|${p.hold}`;
  const built = new Set(grid.map(key));
  for (const p of cells.filter((c) => c.tag === "mc" || c.tag === "mn"))
    assert.ok(built.has(key(p)), key(p));
});
