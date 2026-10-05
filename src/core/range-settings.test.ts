// Every range takes every lever. The five position-cost ranges (Micro, Minimal, Short, General, Long) share one
// settings type (`RangeGrid`), the Micro-only levers live on `MicroGrid`, and a Micro-only lever set on another
// range is refused rather than silently ignored.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type CoreSettings, DEFAULT_SETTINGS } from "./config.ts";
import { checkSettings } from "./settings-check.ts";
import type { MicroGrid, RangeGrid } from "./domain/types.ts";
import { baseRangeProtects } from "./pipeline/pipeline.ts";
import { EVAL_MIN_SL } from "./minimal-coord.ts";

/** the four ranges that are not Micro */
const PLAIN = ["minimal", "short", "general", "long"] as const;
const ALL = ["micro", ...PLAIN] as const;

const cell = (tp: number): RangeGrid => ({
  tp: [tp, tp * 1.25],
  slOfTp: [1, 1.5],
  trailOfTp: [0, 0.5],
});
/** a target inside each range's own band, so the grid checks pass */
const TP: Record<(typeof ALL)[number], number> = {
  micro: 0.003,
  minimal: 0.008,
  short: 0.016,
  general: 0.032,
  long: 0.044,
};

const withRange = (name: string, r: RangeGrid | MicroGrid) =>
  ({ grid: { ...DEFAULT_SETTINGS.grid, [name]: r } }) as unknown as CoreSettings;

describe("range settings are complete and the same for every range", () => {
  it("every range accepts every shared lever", () => {
    for (const name of ALL) {
      const r: RangeGrid = {
        ...cell(TP[name]),
        trailSlOfTp: 1.5,
        minSl: 0.004,
        minTrail: 0.001,
        minTf: 15,
        ownBase: true,
        baseBest: false,
        minSlEval: 0.0025,
      };
      checkSettings(withRange(name, r));
    }
  });

  it("the Micro-only levers are refused on every other range, never ignored", () => {
    for (const name of PLAIN)
      for (const extra of [{ ownInds: true }, { tpNetOfCost: false }, { minNetOfCost: 1 }]) {
        const key = Object.keys(extra)[0];
        assert.throws(
          () => checkSettings(withRange(name, { ...cell(TP[name]), ...extra } as MicroGrid)),
          new RegExp(`${name} ${key}`),
          `${name}.${key} must be refused`,
        );
      }
    // on Micro itself all three are settings, not errors
    checkSettings(
      withRange("micro", { ...cell(TP.micro), ownInds: false, tpNetOfCost: false, minNetOfCost: 1 }),
    );
  });

  it("an out-of-range shared lever is refused the same way on every range, Micro included", () => {
    for (const name of ALL) {
      assert.throws(() => checkSettings(withRange(name, { ...cell(TP[name]), minSlEval: 0.1 })), /evaluation min SL/);
      assert.throws(() => checkSettings(withRange(name, { ...cell(TP[name]), minTf: 1000 })), /shortest lane/);
      assert.throws(
        () => checkSettings(withRange(name, { ...cell(TP[name]), ownBase: 1 as unknown as boolean })),
        /own Base cell/,
      );
    }
  });

  it("a range's own evaluation stop floor builds the cells the global floor forbids", () => {
    const tp = 0.004;
    const grid = {
      ...DEFAULT_SETTINGS.grid,
      micro: false as const,
      minimal: false as const,
      general: false as const,
      long: false as const,
      // a 0.4 % target with stops at 0.5x and 1x: the 0.5x cell is 0.2 %, under the 0.5 % global floor
      short: { tp: [tp], slOfTp: [0.5, 1], trailOfTp: [0], minSl: 0.002, minTrail: 0.001 },
    };
    const holdH = [16];
    const blanket = baseRangeProtects({ ...grid, holdH }, 0.002);
    const own = baseRangeProtects(
      { ...grid, holdH, short: { ...grid.short, minSlEval: 0.002 } },
      0.002,
    );
    const stopsOf = (ps: readonly { sl: number }[]) => [...new Set(ps.map((p) => p.sl))].sort((a, b) => a - b);
    // with the global floor every stop sits at or above it, so both cells collapse onto one
    assert.ok(
      stopsOf(blanket).every((sl) => sl >= EVAL_MIN_SL - 1e-9),
      `global floor kept ${stopsOf(blanket)}`,
    );
    // with the range's own floor the tighter cell is buildable, so the range has a stop under the global floor
    assert.ok(
      stopsOf(own).some((sl) => sl < EVAL_MIN_SL - 1e-9),
      `own floor kept ${stopsOf(own)}`,
    );
  });

  it("the shipped defaults still pass, and no default range carries a Micro-only lever", () => {
    checkSettings(DEFAULT_SETTINGS);
    for (const name of PLAIN) {
      const r = DEFAULT_SETTINGS.grid[name];
      if (!r) continue;
      for (const k of ["ownInds", "tpNetOfCost", "minNetOfCost"] as const)
        assert.equal((r as MicroGrid)[k], undefined, `${name}.${k}`);
    }
  });
});
