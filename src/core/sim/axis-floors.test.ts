// Managed revert Axis (the default Axis mode, x01's) honours the stop floors and the live-feedback adjuster: its
// derived stop (≈ 0.2-0.3 % of price at a low ATR) is floored at max(EVAL_MIN_SL, protectFloor.minSl, the set's
// adjust minSl) and widened by the set's slMult, as desk mode floors its stops (bug hunt, 13 Oct).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulateAxis } from "./axis.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import type { AdjustState } from "../adjust.ts";
import type { Candle } from "../domain/types.ts";
import { allCombos, makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapes, defaultWalkForward, type ConfigTape } from "./walkforward.ts";
import { DEFAULT_AXIS, DEFAULT_SETTINGS } from "../config.ts";

const mk = (rows: Array<[number, number, number, number]>): Candle[] =>
  rows.map(([o, h, l, c], i) => ({ t: i * 900_000, o, h, l, c, v: 1 }));
const P = { tp: 0.02, sl: 0.01, trail: 0, hold: 20 };
const REV = { ...DEFAULT_AXIS, levels: 1, range: "atr" as const, ranges: undefined, levelsSet: undefined };

describe("axis revert (managed): stop floors and the live-feedback adjuster", () => {
  // the finding's scenario: close 100, axis 100.6, ATR 0.3 → derived stop 99.79 (0.21 %); the next bar dips to 99.7
  const b = barsFromCandles(
    "X",
    15,
    mk([
      [100, 100.05, 99.95, 100],
      [100, 100.05, 99.7, 99.8],
      [99.8, 99.85, 99.3, 99.4],
      [99.4, 99.45, 99.3, 99.4],
    ]),
  );
  const center = new Float64Array(4).fill(100.6);
  const atr = new Float64Array(4).fill(0.3);
  const sig = new Int8Array([1, 0, 0, 0]);

  it("without a floor the derived stop is 0.21 % (the unfloored geometry is unchanged)", () => {
    const r = simulateAxis("c", b, sig, P, REV, center, atr, 0.002);
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 99.79) < 1e-9, `${r.trades[0].exit}`);
  });

  it("the stop is floored at minSl of the average entry", () => {
    const r = simulateAxis("c", b, sig, P, REV, center, atr, 0.002, 0, { minSl: 0.005 });
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 99.5) < 1e-9, `${r.trades[0].exit}`);
  });

  it("slMult widens the derived stop (floor still applies on top)", () => {
    const r = simulateAxis("c", b, sig, P, REV, center, atr, 0.002, 0, { minSl: 0.001, slMult: 2 });
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 99.58) < 1e-9, `${r.trades[0].exit}`);
  });

  // the tapes: every revert stop-out lies at least the floor away from its average entry, and an adjust step changes
  // the tapes (it used to be bit-identical, so each logged "wider SL" level changed nothing)
  const candles = syntheticCandles("A", 15, 700, Date.UTC(2026, 8, 20));
  const u = makeUniverse([barsFromCandles("A-USDT", 15, candles)]);
  const wf = defaultWalkForward({ ...DEFAULT_SETTINGS, tfMin: 15 });
  const combos = allCombos().slice(0, 3);
  const only = new Set(combos.map((c) => `${c.bot}|${c.ind}`));
  const floors = { minSl: DEFAULT_SETTINGS.protectFloor.minSl, minTrail: DEFAULT_SETTINGS.protectFloor.minTrail };
  const revert = (adjust: AdjustState | null) =>
    buildTapes(u, [], 0.001, { protects: wf.dcaProtects, dca: wf.dca, axis: DEFAULT_AXIS }, only, null, adjust, floors)
      .filter((t) => t.kind === "axis")
      .sort((a, b) => a.id.localeCompare(b.id));
  const slDists = (ts: ConfigTape[]) => {
    const out: number[] = [];
    for (const t of ts)
      for (let i = 0; i < t.n; i++)
        // one-leg stop-outs: a rung that fills on the bar that hits the stop moves the average toward the stop in
        // force (placed from the average before that fill, never re-derived by it — the conservative intrabar order)
        if (t.reason[i] === 1 /* "sl" */ && t.level[i] === 0) out.push((t.side[i] * (t.entry[i] - t.exit[i])) / t.entry[i]);
    return out;
  };

  it("buildTapes: every managed revert stop-out (one leg) is at least the stop floor (0.5 %) from the average entry", () => {
    const ts = revert(null);
    assert.ok(ts.length > 0 && ts.every((t) => t.id.includes("|ax-")), ts[0]?.id);
    const d = slDists(ts);
    assert.ok(d.length > 0, "some stop-outs");
    const below = d.filter((x) => x < 0.005 - 1e-6);
    assert.equal(below.length, 0, `stop-outs below the floor: ${below.slice(0, 5).map((x) => x.toFixed(5))}`);
    for (const t of ts)
      for (const o of t.open) {
        const sd = o.side * (o.entry - o.stop);
        assert.ok(sd <= 0 || sd >= 0.005 * o.entry - 1e-9, `open stop ${sd}`);
      }
  });

  it("buildTapes: a live-feedback step (minSl 2 %) reaches the managed revert tapes", () => {
    const base = revert(null);
    const adjust: AdjustState = {};
    for (const c of combos)
      adjust[`${c.bot}|${c.ind}|axis`] = {
        set: `${c.bot}|${c.ind}|axis`,
        level: 9,
        minSl: 0.02,
        minTrail: 0.01,
        pausedUntil: 0,
        pf: 0.5,
        n: 15,
        lastExitT: 0,
        at: 0,
        note: "",
      };
    const wide = revert(adjust);
    // same configs (the id never carries the adjusted placeholder), different trades
    assert.deepEqual(
      wide.map((t) => t.id),
      base.map((t) => t.id),
    );
    const d = slDists(wide);
    assert.ok(d.every((x) => x >= 0.02 - 1e-6), `stop-outs below the adjusted floor: ${d.filter((x) => x < 0.02)}`);
    const sig = (ts: ConfigTape[]) => ts.map((t) => `${t.n}:${Array.from(t.r).join(",")}`).join("|");
    assert.notEqual(sig(wide), sig(base), "the adjust step changed nothing");
  });
});
