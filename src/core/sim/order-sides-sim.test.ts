// Order sides: LONG (side 1) and SHORT (side -1) behaviour per strategy type, at the simulation layer (sim/backtest.ts
// simulate, sim/dca.ts, sim/axis.ts, sim/block.ts and sim/walkforward.ts execDecision / blockLevel).
// Per type and side: (a) the stop sits on the losing side of entry, and a gap through it fills at the worse of open
// and stop; (b) the target sits on the winning side, and a gap through it fills at the better of open and target;
// (c) a trailing stop moves only favourably; (d) a ladder add goes in the adverse direction; (e) Block: one direction's
// level or pause never changes the other direction's decision (long and short run independently, 6 Oct in
// docs/positive-coordinations.md). A cell another test already states exactly is not repeated here.
// Plan items 3 (Block config level and pause, block.sideKeys) and 4 (seat cool-off, wf.seatSideCooloff) run their cells
// with the option on; each has an option-off control that pins the default result.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";
import { barsFromCandles } from "../market/bars.ts";
import { DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "../config.ts";
import { defaultWalkForward, execDecision, makeTape } from "./walkforward.ts";
import { BlockBook, blockDecide, bookLevels, sourceKey, type BlockSource } from "./block.ts";
import { INDICATIONS } from "../indications/registry.ts";
import type { AxisConfig, Bars, BlockConfig, DcaConfig, Protect, Side, Trade } from "../domain/types.ts";

const M = 60_000;
const H = 3_600_000;
const SIDES = [
  ["LONG", 1],
  ["SHORT", -1],
] as const;
type Row = [o: number, h: number, l: number, c: number];

/** Bars of 5 minutes from OHLC rows: row i opens at i × 5 minutes. */
const bars = (rows: Row[]): Bars =>
  barsFromCandles("X", 5, rows.map(([o, h, l, c], i) => ({ t: i * 5 * M, o, h, l, c, v: 1 })));
/** One bar in side terms: `adv` is the extreme against the position (a long's low, a short's high), `fav` the one for it. */
const bar = (s: Side, o: number, adv: number, fav: number, c: number): Row =>
  s === 1 ? [o, fav, adv, c] : [o, adv, fav, c];
/** The price `pct` against the position from `base` (below a long's entry, above a short's). */
const against = (s: Side, base: number, pct: number) => base * (1 - s * pct);
/** The price `pct` for the position from `base` (above a long's entry, below a short's). */
const forPos = (s: Side, base: number, pct: number) => base * (1 + s * pct);
/** A bar inside the stop, the target and the first level at `base` (0.3 % either way). */
const quiet = (s: Side, base: number): Row => bar(s, base, against(s, base, 0.003), forPos(s, base, 0.003), base);
const signalAt0 = (s: Side, n: number) => {
  const sig = new Int8Array(n);
  sig[0] = s;
  return sig;
};
const near = (got: number, want: number, what: string) =>
  assert.ok(Math.abs(got - want) < 1e-9, `${what}: got ${got}, want ${want}`);
const pick = <T>(s: Side, long: T, short: T): T => (s === 1 ? long : short);
const opposite = (s: Side) => (-s) as Side;

// ── Normal (simulate, no trail) ──────────────────────────────────────────────────────────────────────────────────
const PN: Protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 50 };

describe("order sides: Normal (simulate, no trail)", () => {
  it("SHORT (a): the stop sits above entry; a dip below the entry is no stop, the high at the stop is", () => {
    const b = bars([
      [100, 100, 100, 100],
      quiet(-1, 100),
      bar(-1, 100, 100.2, 99.5, 99.5), // a favourable dip to 99.5 (above the 99 target): nothing fills
      bar(-1, 100.5, 101.2, 99.6, 101), // the high reaches the stop at 101
    ]);
    const res = simulate("c", b, signalAt0(-1, b.n), PN, { cost: 0 });
    assert.equal(res.trades.length, 1);
    assert.equal(res.trades[0].reason, "sl");
    near(res.trades[0].exit, 101, "stop");
    near(res.trades[0].r, -0.01, "r");
  });
});

// ── Trailing (simulate, the trail armed at 1 %) ──────────────────────────────────────────────────────────────────
const PT: Protect = { tp: 0.05, sl: 0.02, trail: 0.01, hold: 50 };
/** A 2 % favourable peak arms the 1 % trail; then a pullback that makes no new peak and does not reach the stop. */
const trailPath = (s: Side): Row[] => [
  [100, 100, 100, 100],
  quiet(s, 100),
  bar(s, 100, against(s, 100, 0.001), forPos(s, 100, 0.02), forPos(s, 100, 0.015)),
  bar(s, forPos(s, 100, 0.015), forPos(s, 100, 0.012), forPos(s, 100, 0.018), forPos(s, 100, 0.015)),
];
/** The trailed stop: the peak (102 long, 98 short) trailed 1 % back toward the entry (100.98 long, 98.98 short). */
const trailedStop = (s: Side) => forPos(s, 100, 0.02) * (1 - s * 0.01);

describe("order sides: Trailing (simulate, trail armed at 1 %)", () => {
  for (const [name, s] of SIDES) {
    it(`${name} (a): before the trail arms the stop is the losing-side stop at 2 %`, () => {
      const b = bars([
        [100, 100, 100, 100],
        quiet(s, 100),
        bar(s, 100, against(s, 100, 0.021), forPos(s, 100, 0.002), 100),
      ]);
      const res = simulate("c", b, signalAt0(s, b.n), PT, { cost: 0 });
      assert.equal(res.trades[0].reason, "sl");
      near(res.trades[0].exit, against(s, 100, 0.02), "stop");
    });

    it(`${name} (b): the 5 % target sits on the winning side and takes the position while the trail is not armed`, () => {
      const b = bars([
        [100, 100, 100, 100],
        quiet(s, 100),
        bar(s, 100, against(s, 100, 0.001), forPos(s, 100, 0.051), 100),
      ]);
      const res = simulate("c", b, signalAt0(s, b.n), PT, { cost: 0 });
      assert.equal(res.trades[0].reason, "tp");
      near(res.trades[0].exit, forPos(s, 100, 0.05), "target");
    });

    it(`${name} (c): the trail moves the stop only favourably; a pullback that makes no new peak leaves it where it was`, () => {
      const b = bars(trailPath(s));
      const open = simulate("c", b, signalAt0(s, b.n), PT, { cost: 0 }).open;
      assert.ok(open, "the position is still open");
      assert.equal(open.trailOn, true, "the trail is armed");
      near(open.stop, trailedStop(s), "trailed stop");
      assert.ok(s * (open.stop - 100) > 0, "the stop is on the winning side of entry");
    });

    it(`${name} (c): the trailed stop exits the position at its own level`, () => {
      const b = bars([
        ...trailPath(s),
        bar(s, forPos(s, 100, 0.012), forPos(s, 100, 0.009), forPos(s, 100, 0.013), forPos(s, 100, 0.01)),
      ]);
      const res = simulate("c", b, signalAt0(s, b.n), PT, { cost: 0 });
      assert.equal(res.trades[0].reason, "trail");
      near(res.trades[0].exit, trailedStop(s), "exit");
    });

    it(`${name} (c): a gap through the trailed stop fills at the worse of open and stop`, () => {
      const gapOpen = pick(s, 100.5, 99.2);
      const b = bars([
        ...trailPath(s),
        bar(s, gapOpen, pick(s, 100.3, 99.4), pick(s, 100.6, 99.1), pick(s, 100.4, 99.3)),
      ]);
      const res = simulate("c", b, signalAt0(s, b.n), PT, { cost: 0 });
      assert.equal(res.trades[0].reason, "trail");
      near(res.trades[0].exit, gapOpen, "the open");
    });
  }
});

// ── DCA (simulateDca: base and one level, stop 1.5 steps beyond the base) ────────────────────────────────────────
const PD: Protect = { tp: 0.02, sl: 0.01, trail: 0, hold: 50 };
/** two stages: the base and one level 1 % away on the adverse side; the stop 1.5 steps (1.5 %) beyond the base */
const DD: DcaConfig = { levels: 1, step: 0.01, stopGap: 0.5 };

describe("order sides: DCA (simulateDca, base and one level)", () => {
  it("SHORT (a): a rise through the level and the stop exits at the stop 1.5 % above the base", () => {
    const b = bars([
      [100, 100, 100, 100],
      [100, 102, 99.9, 101.2],
    ]);
    const r = simulateDca("c", b, signalAt0(-1, b.n), PD, DD, false, 0);
    assert.equal(r.trades.length, 1);
    assert.equal(r.trades[0].reason, "sl");
    near(r.trades[0].exit, 101.5, "stop");
    assert.equal(r.trades[0].vol, 2, "the level filled first");
  });

  for (const [name, s] of SIDES) {
    it(`${name} (a): a gap through the stop fills at the worse of open and stop`, () => {
      const b = bars([
        [100, 100, 100, 100],
        quiet(s, 100),
        bar(s, pick(s, 98, 102), pick(s, 97.5, 102.5), pick(s, 98.2, 101.8), pick(s, 97.8, 102.2)),
      ]);
      const r = simulateDca("c", b, signalAt0(s, b.n), PD, DD, false, 0);
      assert.equal(r.trades[0].reason, "sl");
      near(r.trades[0].exit, pick(s, 98, 102), "the open");
    });
  }

  it("SHORT (b): the target 2 % below the base takes the position when no level filled", () => {
    const b = bars([
      [100, 100, 100, 100],
      quiet(-1, 100),
      bar(-1, 100, 100.2, 97.9, 98),
    ]);
    const r = simulateDca("c", b, signalAt0(-1, b.n), PD, DD, false, 0);
    assert.equal(r.trades[0].reason, "tp");
    near(r.trades[0].exit, 98, "target");
    assert.equal(r.trades[0].vol, 1);
  });

  for (const [name, s] of SIDES) {
    it(`${name} (b): a gap through the target fills at the open (the better price)`, () => {
      const b = bars([
        [100, 100, 100, 100],
        quiet(s, 100),
        bar(s, pick(s, 103, 97), pick(s, 99.5, 100.5), pick(s, 103.5, 96.5), pick(s, 103.2, 97.2)),
      ]);
      const r = simulateDca("c", b, signalAt0(s, b.n), PD, DD, false, 0);
      assert.equal(r.trades[0].reason, "tp");
      near(r.trades[0].exit, pick(s, 103, 97), "the open");
    });
  }

  it("SHORT (d): the level adds on a rise to 101, never on a fall", () => {
    const up = simulateDca(
      "c",
      bars([
        [100, 100, 100, 100],
        bar(-1, 100, 101.2, 99.8, 100.5),
      ]),
      signalAt0(-1, 2),
      PD,
      DD,
      false,
      0,
    );
    assert.ok(up.open, "the ladder is still open");
    assert.equal(up.open.w, 2, "the base and the level");
    near(up.open.entry, 100.5, "average of 100 and 101");
    const down = simulateDca(
      "c",
      bars([
        [100, 100, 100, 100],
        bar(-1, 100, 100.2, 98.9, 99.2),
      ]),
      signalAt0(-1, 2),
      PD,
      DD,
      false,
      0,
    );
    assert.equal(down.open?.w, 1, "a fall fills no short level");
  });
});

// ── DCA Active (the base leg skipped; the level fill is the only leg) ────────────────────────────────────────────
describe("order sides: DCA Active (simulateDca, the level fill only)", () => {
  // row 2 fills the level: a long at 99 (the low reaches it), a short at 101 (the high reaches it); the stop is 1.5 %
  // from the reference (98.5 long, 101.5 short) and the target 2 % from the fill
  const fillRow = (s: Side): Row => bar(s, pick(s, 99.5, 100.5), pick(s, 98.9, 101.1), pick(s, 99.8, 100.2), pick(s, 99.2, 100.8));

  for (const [name, s] of SIDES) {
    it(`${name} (a): a gap through the stop fills at the open (the stop is anchored to the reference)`, () => {
      const b = bars([
        [100, 100, 100, 100],
        quiet(s, 100),
        fillRow(s),
        bar(s, pick(s, 98, 102), pick(s, 97.8, 102.2), pick(s, 98.2, 101.8), pick(s, 97.9, 102.1)),
      ]);
      const r = simulateDca("c", b, signalAt0(s, b.n), PD, DD, true, 0);
      assert.equal(r.trades.length, 1);
      assert.equal(r.trades[0].reason, "sl");
      near(r.trades[0].exit, pick(s, 98, 102), "the open");
    });

    it(`${name} (b): the target sits 2 % on the winning side of the fill; a gap through it fills at the open`, () => {
      const b = bars([
        [100, 100, 100, 100],
        quiet(s, 100),
        fillRow(s),
        bar(s, pick(s, 101.5, 98.5), pick(s, 100.9, 99.1), pick(s, 101.6, 98.4), pick(s, 101.4, 98.6)),
      ]);
      const r = simulateDca("c", b, signalAt0(s, b.n), PD, DD, true, 0);
      assert.equal(r.trades[0].reason, "tp");
      near(r.trades[0].exit, pick(s, 101.5, 98.5), "the open");
    });
  }

  it("SHORT (b): the target 2 % below the fill exits at 98.98 when the open is still above it", () => {
    const b = bars([
      [100, 100, 100, 100],
      quiet(-1, 100),
      fillRow(-1),
      bar(-1, 100, 100.5, 98.5, 98.7),
    ]);
    const r = simulateDca("c", b, signalAt0(-1, b.n), PD, DD, true, 0);
    assert.equal(r.trades[0].reason, "tp");
    near(r.trades[0].exit, 98.98, "target: 101 × (1 − 2 %)");
  });

  it("SHORT (d): the single level fills on the rise to 101 only; a fall never fills it", () => {
    const up = simulateDca(
      "c",
      bars([
        [100, 100, 100, 100],
        quiet(-1, 100),
        fillRow(-1),
      ]),
      signalAt0(-1, 3),
      PD,
      DD,
      true,
      0,
    );
    assert.ok(up.open, "filled");
    assert.equal(up.open.side, -1);
    near(up.open.entry, 101, "the fill");
    assert.equal(up.open.w, 1, "one leg: the base is skipped");
    const down = simulateDca(
      "c",
      bars([
        [100, 100, 100, 100],
        quiet(-1, 100),
        bar(-1, 100, 100.4, 98.5, 98.7),
      ]),
      signalAt0(-1, 3),
      PD,
      DD,
      true,
      0,
    );
    assert.equal(down.open, undefined, "no fill while the price falls away");
    assert.equal(down.trades.length, 0);
  });
});

// ── Axis revert (simulateAxis: the axis at 100, ATR 1; the signal bar closes 1.5 ATR on the reverting side) ──────
const PA: Protect = { tp: 0.02, sl: 0.01, trail: 0, hold: 20 };
const REV_FIXED: AxisConfig = {
  levels: 2,
  spacing: 1,
  ratio: 1,
  minDisp: 0.35,
  maxDisp: 2.6,
  center: 50,
  exits: "fixed",
};
const REV_MANAGED: AxisConfig = { levels: 1, spacing: 1, ratio: 1, minDisp: 0.35, maxDisp: 2.6, center: 50 };
/** signal bar, then the entry bar (quiet), then the given rows; the reference is 98.5 long, 101.5 short */
const axisBars = (s: Side, rest: Row[]) => {
  const ref = pick(s, 98.5, 101.5);
  return bars([
    [ref, ref, ref, ref],
    quiet(s, ref),
    ...rest,
  ]);
};
const runRevert = (s: Side, rest: Row[], ax: AxisConfig) => {
  const b = axisBars(s, rest);
  return simulateAxis(
    "c",
    b,
    signalAt0(s, b.n),
    PA,
    ax,
    new Float64Array(b.n).fill(100),
    new Float64Array(b.n).fill(1),
    0,
  );
};

describe("order sides: Axis revert (simulateAxis)", () => {
  it("SHORT (a): the stop beyond the last level sits above entry; the level fills first, then the stop exits at 1 % past it", () => {
    // the level at 102.5 fills on the high, the stop 1 % beyond the deepest level (103.525) exits the ladder
    const res = runRevert(-1, [bar(-1, 101.7, 103.8, 101.6, 103)], REV_FIXED);
    assert.equal(res.trades.length, 1);
    assert.equal(res.trades[0].reason, "sl");
    near(res.trades[0].exit, 103.525, "stop");
    assert.equal(res.trades[0].vol, 2, "base and level");
    near(res.trades[0].entry, 102, "average entry");
  });

  for (const [name, s] of SIDES) {
    it(`${name} (a): a gap through the stop fills at the worse of open and stop`, () => {
      const res = runRevert(
        s,
        [bar(s, pick(s, 96, 104), pick(s, 95.8, 104.2), pick(s, 96.3, 103.8), pick(s, 96.1, 104))],
        REV_FIXED,
      );
      assert.equal(res.trades[0].reason, "sl");
      near(res.trades[0].exit, pick(s, 96, 104), "the open");
    });
  }

  it("SHORT (b): the target is the axis price on the winning side and takes the position without a gap", () => {
    const res = runRevert(-1, [bar(-1, 101.2, 101.4, 99.8, 100)], REV_FIXED);
    assert.equal(res.trades[0].reason, "tp");
    near(res.trades[0].exit, 100, "axis");
  });

  for (const [name, s] of SIDES) {
    it(`${name} (d): a level fills on the adverse move (the add), and not on a favourable one`, () => {
      const adverse = runRevert(
        s,
        [pick<Row>(s, bar(1, 98.3, 97.4, 98.5, 97.6), bar(-1, 101.7, 102.6, 101.6, 102.4))],
        REV_FIXED,
      );
      assert.ok(adverse.open, "still open");
      assert.equal(adverse.open.w, 2, "base and the add");
      near(adverse.open.entry, pick(s, 98, 102), "average of the two legs");
      const favourable = runRevert(
        s,
        [pick<Row>(s, bar(1, 98.6, 98.3, 99.5, 99.4), bar(-1, 101.4, 101.7, 100.5, 100.6))],
        REV_FIXED,
      );
      assert.ok(favourable.open);
      assert.equal(favourable.open.w, 1, "no add on the favourable move");
    });
  }
});

describe("order sides: Axis managed exits (the stop at the derived distance, breakeven after 0.85 risk)", () => {
  it("SHORT (a): the derived stop sits above entry and the target below it, both after the first closed bar", () => {
    const res = runRevert(-1, [], REV_MANAGED);
    assert.ok(res.open, "the single leg is open");
    near(res.open.stop, 102.5, "stop: one step above the 101.5 entry");
    near(res.open.target, 99.8, "target: tightened toward the axis at 99.8");
    assert.ok(res.open.stop > res.open.entry && res.open.target < res.open.entry);
  });

  it("SHORT (a): a high through the derived stop exits at it", () => {
    const res = runRevert(-1, [bar(-1, 101.4, 102.6, 101.2, 102.4)], REV_MANAGED);
    assert.equal(res.trades[0].reason, "sl");
    near(res.trades[0].exit, 102.5, "stop");
  });

  for (const [name, s] of SIDES) {
    it(`${name} (a): a gap through the derived stop fills at the open`, () => {
      const res = runRevert(
        s,
        [bar(s, pick(s, 97.0, 103.0), pick(s, 96.8, 103.2), pick(s, 97.2, 102.8), pick(s, 97.0, 103.0))],
        REV_MANAGED,
      );
      assert.equal(res.trades[0].reason, "sl");
      near(res.trades[0].exit, pick(s, 97.0, 103.0), "the open");
    });
  }

  it("SHORT (b): the tightened target takes the position at 99.8 when the low reaches it", () => {
    const res = runRevert(-1, [bar(-1, 100.4, 100.6, 99.7, 99.9)], REV_MANAGED);
    assert.equal(res.trades[0].reason, "tp");
    near(res.trades[0].exit, 99.8, "target");
  });

  for (const [name, s] of SIDES) {
    it(`${name} (b): a gap through the target fills at the open (the better price)`, () => {
      const res = runRevert(
        s,
        [bar(s, pick(s, 100.5, 99.5), pick(s, 99.9, 100.1), pick(s, 100.6, 99.7), pick(s, 100.4, 99.6))],
        REV_MANAGED,
      );
      assert.equal(res.trades[0].reason, "tp");
      near(res.trades[0].exit, pick(s, 100.5, 99.5), "the open");
    });
  }

  it("SHORT (c): breakeven once the close is 0.85 risk in profit; a bounce back never loosens the stop", () => {
    const res = runRevert(
      -1,
      [
        bar(-1, 101.4, 101.6, 100.4, 100.5), // close 1.0 below entry ≥ 0.85 risk: the stop moves to entry
        bar(-1, 100.6, 101.4, 100.3, 100.9), // bounce to 101.4: below the stop at entry, no breakeven move back
      ],
      REV_MANAGED,
    );
    assert.ok(res.open, "still open");
    near(res.open.stop, 101.5, "breakeven stop at the entry");
  });
});

// ── Axis desk (simulateAxisDesk: rungs at axis ∓ k × spacing, stop 0.42 from the fill, target 2 × stop) ─────────
const DK: AxisConfig = {
  levels: 2,
  spacing: 1,
  ratio: 1,
  minDisp: 0.35,
  maxDisp: 2.6,
  center: 50,
  mode: "desk",
  range: "atr",
  slAtr: 0.7,
  tpRatio: 2,
};
/** the first rung fills: 99 long (stop 98.58, target 99.84), 101 short (stop 101.42, target 100.16) */
const DESK_FILL = (s: Side): Row => pick<Row>(s, [100, 100.1, 98.9, 99.2], [100, 101.1, 99.9, 100.8]);

const runDesk = (s: Side, rest: Row[], ax: Partial<AxisConfig> = {}) => {
  // the signal bar closes at 100: both ladders rest beyond it (99 / 98 long, 101 / 102 short)
  const b = bars([[100, 100.2, 99.8, 100], ...rest]);
  return simulateAxisDesk(
    "c",
    b,
    signalAt0(s, b.n),
    PA,
    { ...DK, ...ax },
    new Float64Array(b.n).fill(100),
    new Float64Array(b.n).fill(1),
    0,
  );
};

describe("order sides: Axis desk (simulateAxisDesk)", () => {
  it("LONG (a): the desk stop sits below the fill; a bar that reaches it exits there", () => {
    const res = runDesk(1, [DESK_FILL(1), bar(1, 99, 98.5, 99.2, 98.6)]);
    assert.equal(res.trades[0].reason, "sl");
    near(res.trades[0].entry, 99, "fill");
    near(res.trades[0].exit, 98.58, "stop");
  });

  for (const [name, s] of SIDES) {
    it(`${name} (a): a gap through the desk stop fills at the open`, () => {
      const res = runDesk(s, [DESK_FILL(s), bar(s, pick(s, 98.2, 101.8), pick(s, 98.1, 101.9), pick(s, 98.5, 101.7), pick(s, 98.3, 101.8))]);
      assert.equal(res.trades[0].reason, "sl");
      near(res.trades[0].exit, pick(s, 98.2, 101.8), "the open");
    });
  }

  it("LONG (b): a gap through the target fills at the open (the better price)", () => {
    const res = runDesk(1, [DESK_FILL(1), bar(1, 100.2, 99.9, 100.4, 100.1)]);
    assert.equal(res.trades[0].reason, "tp");
    near(res.trades[0].exit, 100.2, "the open");
  });

  it("SHORT (b): the target 0.84 below the fill takes the position when the low reaches it", () => {
    const res = runDesk(-1, [DESK_FILL(-1), bar(-1, 100.9, 101, 100, 100.1)]);
    assert.equal(res.trades[0].reason, "tp");
    near(res.trades[0].exit, 100.16, "target");
  });

  it("SHORT (b): a gap through the target fills at the open (the better price)", () => {
    const res = runDesk(-1, [DESK_FILL(-1), bar(-1, 99.9, 100.6, 99.7, 99.8)]);
    assert.equal(res.trades[0].reason, "tp");
    near(res.trades[0].exit, 99.9, "the open");
  });

  it("SHORT (c): the hybrid trail arms once the move reaches 0.95 of the stop distance and exits at its own level", () => {
    const res = runDesk(
      -1,
      [
        DESK_FILL(-1),
        [100.8, 100.9, 100.3, 100.4], // close 0.6 below the fill ≥ 0.399: the trail arms at 100.4 + 0.42
        [100.4, 100.9, 100.4, 100.7], // the high reaches the trailed stop 100.82
      ],
      { hybrid: true, trailPct: 0.8 },
    );
    assert.equal(res.trades.length, 1);
    assert.equal(res.trades[0].reason, "trail");
    near(res.trades[0].exit, 100.82, "trailed stop");
  });

  it("SHORT (c): the trail keeps its gap and never loosens: a pullback leaves the stop at 100.67", () => {
    const res = runDesk(
      -1,
      [
        DESK_FILL(-1),
        [100.8, 100.9, 100.3, 100.4],
        [100.4, 100.45, 100.2, 100.25], // stop tightened to 100.25 + 0.42 = 100.67
        [100.25, 100.55, 100.25, 100.4], // a 0.3 pullback stays below the stop (100.67): the stop does not move back
      ],
      { hybrid: true, trailPct: 0.8 },
    );
    assert.equal(res.trades.length, 0, `exited at ${res.trades[0]?.exit} (${res.trades[0]?.reason})`);
    assert.ok(res.open, "still open");
    near(res.open.stop, 100.67, "stop");
  });
});

// ── Block (e): one direction's level or pause never changes the other direction's decision ───────────────────────
// Block sizes an entry only (blockDecide returns the volume), so (a) to (d) belong to the type it raises: none here.
const BB: BlockConfig = { ratio: 0.2, maxLevel: 3, minActiveLevel: 1, maxMult: 3 };
const IND = INDICATIONS[0];
const srcOnly = (src: BlockSource): BlockConfig => ({ ...BB, sources: { [src]: true } }) as BlockConfig;

describe("order sides: Block sources (book level and pause per direction)", () => {
  for (const src of ["symbol", "direction", "indication"] as const) {
    for (const [name, s] of SIDES) {
      it(`Block ${src} ${name} (e): the opposite direction's closes never raise this direction's decision`, () => {
        const book = new BlockBook(0);
        for (let i = 0; i < 3; i++) book.add({ sym: "A", side: opposite(s), kind: "trend", r: 0.02 });
        const t = { sym: "A", side: s, kind: "trend" };
        const own = blockDecide({ config: 0, ...bookLevels(book, t, 3) }, srcOnly(src), false);
        assert.equal(own.adjusted, false, `raised to level ${own.level} by the other direction`);
        const other = blockDecide(
          { config: 0, ...bookLevels(book, { ...t, side: opposite(s) }, 3) },
          srcOnly(src),
          false,
        );
        assert.equal(other.adjusted, true, "control: the other direction's own decision is raised");
      });

      it(`Block ${src} ${name} (e): a pause on the opposite direction never pauses this one`, () => {
        const book = new BlockBook(2);
        for (let i = 0; i < 3; i++) book.add({ sym: "A", side: s, kind: "trend", r: 0.02 });
        // a raised win on the opposite side pauses that side's source for its next 2 closes
        book.add({ sym: "A", side: opposite(s), kind: "trend", r: 0.02, bsrc: [src] });
        const t = { sym: "A", side: s, kind: "trend" };
        assert.ok(book.paused(sourceKey(src, { ...t, side: opposite(s) })), "control: the opposite source is paused");
        assert.equal(book.paused(sourceKey(src, t)), false, "this direction is not paused");
        const d = blockDecide(
          { config: 0, ...bookLevels(book, t, 3) },
          srcOnly(src),
          false,
          (x) => book.paused(sourceKey(x, t)),
        );
        assert.equal(d.adjusted, true, `paused by the other direction (level ${d.level})`);
      });
    }
  }

  for (const [name, s] of SIDES) {
    it(`Block overall and type ${name} (e): both pool the two directions by definition (6 Oct), so an opposite close raises this one`, () => {
      const book = new BlockBook(0);
      for (let i = 0; i < 3; i++) book.add({ sym: "A", side: opposite(s), kind: "trend", r: 0.02, type: "normal" });
      const t = { sym: "A", side: s, kind: "trend", type: "normal" };
      const lv = bookLevels(book, t, 3);
      assert.equal(lv.overall, 3);
      assert.equal(lv.type, 3);
      for (const src of ["overall", "type"] as const) {
        assert.equal(blockDecide({ config: 0, ...lv }, srcOnly(src), false).adjusted, true, src);
      }
    });
  }
});

// The config source (BlockConfig.sources.config, the default): the config's own closes, judged one by one.
const closeOf = (side: Side, exitT: number, r: number): Trade => ({
  cfg: "x",
  sym: "A",
  side,
  entryT: exitT - H,
  exitT,
  entry: 1,
  exit: 1,
  r,
  reason: r > 0 ? "tp" : "sl",
  bars: 4,
  mfe: 0,
  mae: 0,
});
const cfgTape = (trades: Trade[]) =>
  makeTape("x", "magnet", IND.id, { tp: 0.02, sl: 0.02, trail: 0, hold: 32 }, "normal", ["A"], trades, [], []);
/** the Block base for a block config: BB (block.sideKeys unset) unless another is given */
const blockBase = (block: BlockConfig = BB) => ({
  ...defaultWalkForward(DEFAULT_SETTINGS),
  lastN: 0,
  symGate: undefined,
  normalBaseMinPf: 0,
  seatQuietH: 0,
  block,
  toggles: { ...DEFAULT_TOGGLES, normal: true, block: true, blockActive: false },
});
const BB_SIDE: BlockConfig = { ...BB, sideKeys: true };
/** three winning closes of one direction, the last 1.5 h before the entry at 2 h: the config's level 3 */
const winsAt = (side: Side) => [closeOf(side, 0.5 * H, 0.02), closeOf(side, 1.0 * H, 0.02), closeOf(side, 1.5 * H, 0.02)];

describe("order sides: Block config source (the config's own closes, per direction)", () => {
  for (const [name, s] of SIDES) {
    it(`Block config ${name} (e) control: this direction's own wins raise its config level`, () => {
      const res = execDecision(cfgTape(winsAt(s)), 2 * H, blockBase(), { sym: "A", side: s });
      assert.deepEqual(res.ok ? [true, res.level] : [false], [true, 3]);
    });

    it(`Block config ${name} (e) control: a raised win pauses its own direction's config source`, () => {
      const book = new BlockBook(2);
      book.add({ sym: "A", side: s, kind: IND.kind, r: 0.02, cfg: "x", bsrc: ["config"] });
      assert.equal(book.paused(sourceKey("config", { sym: "A", side: s, kind: IND.kind, cfg: "x" })), true);
    });

    it(`Block config ${name} (e) control, block.sideKeys unset: the opposite direction's wins raise this direction's config level, pooled as before`, () => {
      const res = execDecision(cfgTape(winsAt(opposite(s))), 2 * H, blockBase(), { sym: "A", side: s });
      assert.deepEqual(res, { ok: true, level: 3, vol: 1.6, src: ["config"] });
    });

    it(`Block config ${name} (e) control, block.sideKeys unset: an opposite raised win pauses this direction's config, pooled as before`, () => {
      const book = new BlockBook(2);
      book.add({ sym: "A", side: opposite(s), kind: IND.kind, r: 0.02, cfg: "x", bsrc: ["config"] });
      const res = execDecision(cfgTape(winsAt(s)), 2 * H, blockBase(), { sym: "A", side: s, book });
      assert.deepEqual(res, { ok: true, level: 0, vol: 1 });
    });

    it(`Block config ${name} (e), block.sideKeys on: the opposite direction's wins never raise this direction's config level`, () => {
      const res = execDecision(cfgTape(winsAt(opposite(s))), 2 * H, blockBase(BB_SIDE), { sym: "A", side: s });
      assert.deepEqual(res, { ok: true, level: 0, vol: 1 });
    });

    it(`Block config ${name} (e), block.sideKeys on: an opposite raised win does not pause this direction's config`, () => {
      const book = new BlockBook(2, 1, { sideKeys: true });
      book.add({ sym: "A", side: opposite(s), kind: IND.kind, r: 0.02, cfg: "x", bsrc: ["config"] });
      const res = execDecision(cfgTape(winsAt(s)), 2 * H, blockBase(BB_SIDE), { sym: "A", side: s, book });
      assert.deepEqual(res.ok ? [true, res.level] : [false], [true, 3]);
    });

    it(`Block config ${name} (e) control, block.sideKeys on: an opposite raised win pauses the opposite direction's config only`, () => {
      const book = new BlockBook(2, 1, { sideKeys: true });
      book.add({ sym: "A", side: opposite(s), kind: IND.kind, r: 0.02, cfg: "x", bsrc: ["config"] });
      const t = { sym: "A", side: s, kind: IND.kind, cfg: "x" };
      assert.equal(book.paused(sourceKey("config", { ...t, side: opposite(s) }, true)), true, "the opposite direction is paused");
      assert.equal(book.paused(sourceKey("config", t, true)), false, "this direction is not paused");
    });
  }
});

// ── Seat cool-off (walkforward.ts execDecision: an engine config that closed within H hours waits) ──────────────
/** the seat base: wf.seatQuietH 2 h, wf.seatSideCooloff unset (both directions count) unless `extra` says otherwise */
const seatBase = (extra: { seatSideCooloff?: boolean } = {}) => ({
  ...defaultWalkForward(DEFAULT_SETTINGS),
  lastN: 0,
  symGate: undefined,
  normalBaseMinPf: 0,
  seatQuietH: 2,
  toggles: { ...DEFAULT_TOGGLES, normal: true, block: false, blockActive: false },
  ...extra,
});

describe("order sides: seat cool-off (wf.seatQuietH)", () => {
  for (const [name, s] of SIDES) {
    const other = opposite(s) === 1 ? "LONG" : "SHORT";

    it(`${name} seat control: a ${name.toLowerCase()} close 1.5 h before the entry cools off that direction's seat`, () => {
      const res = execDecision(cfgTape([closeOf(s, 1.5 * H, 0.01)]), 2 * H, seatBase(), { sym: "A", side: s });
      assert.deepEqual(res, { ok: false, why: "seatQuiet" });
    });

    it(`${name} seat control, wf.seatSideCooloff unset: the ${other} close 1.5 h before cools off the ${name} seat, pooled as before`, () => {
      const res = execDecision(cfgTape([closeOf(opposite(s), 1.5 * H, 0.01)]), 2 * H, seatBase(), { sym: "A", side: s });
      assert.deepEqual(res, { ok: false, why: "seatQuiet" });
    });

    it(`${name} seat, wf.seatSideCooloff on: the ${other} close 1.5 h before does not cool off the ${name} seat`, () => {
      const res = execDecision(cfgTape([closeOf(opposite(s), 1.5 * H, 0.01)]), 2 * H, seatBase({ seatSideCooloff: true }), {
        sym: "A",
        side: s,
      });
      assert.deepEqual(res, { ok: true, level: 0, vol: 1 });
    });

    it(`${name} seat, wf.seatSideCooloff on: its own ${name.toLowerCase()} close 1.5 h before still cools off the seat`, () => {
      const res = execDecision(cfgTape([closeOf(s, 1.5 * H, 0.01)]), 2 * H, seatBase({ seatSideCooloff: true }), {
        sym: "A",
        side: s,
      });
      assert.deepEqual(res, { ok: false, why: "seatQuiet" });
    });

    it(`${name} seat, wf.seatSideCooloff on: an own-direction close on another symbol still cools off the seat (across symbols unchanged)`, () => {
      const res = execDecision(
        cfgTape([{ ...closeOf(s, 1.5 * H, 0.01), sym: "B" }]),
        2 * H,
        seatBase({ seatSideCooloff: true }),
        { sym: "A", side: s },
      );
      assert.deepEqual(res, { ok: false, why: "seatQuiet" });
    });
  }
});
