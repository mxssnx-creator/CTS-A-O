// The seat selection's indexes give the same picks as the plain evaluation: the cached per-tape infos and the forward
// window cursors (selectFixedGen), the cheap-gates-first verdict (configPassAt) against configEvalAt's report, the
// per-symbol trade index of the symbol gate (symStats) against a full scan, and a run against a run without them.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { profitFactor } from "../metrics/stats.ts";
import { buildTapes, defaultWalkForward, protectGrid, selectFixed, symStats, walkForward, type ConfigTape } from "./walkforward.ts";

const H = 3_600_000;
const T_END = Date.UTC(2026, 9, 1);
const universe = () =>
  makeUniverse([
    barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3)),
    barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 1800, T_END, 5)),
    barsFromCandles("C-USDT", 15, syntheticCandles("C-USDT", 15, 1800, T_END, 9)),
    barsFromCandles("A-USDT", 5, syntheticCandles("A-USDT", 5, 3600, T_END, 7)),
    barsFromCandles("B-USDT", 5, syntheticCandles("B-USDT", 5, 3600, T_END, 11)),
  ]);
const u = universe();
const settings = { ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.0, minTrades: 3, maxDdr: 0 } };
const tapes: ConfigTape[] = buildTapes(u, protectGrid(15, { ...DEFAULT_SETTINGS.grid, holdH: [16] }), 0.002, undefined, new Set(["follow|ema-21-55", "follow|rsi-mom-14-20", "revert|z-50-2", "revert|ema-21-55"]));
const o = { ...defaultWalkForward(settings), longH: 96, preH: 20 };
const steps = Array.from({ length: 40 }, (_, i) => u.nowT - (40 - i) * 6 * H);
const key = (r: ReturnType<typeof selectFixed>) => JSON.stringify(r.picks);

describe("selection indexes", () => {
  it("the synthetic book has validated and failing configs at every step (the comparison is not vacuous)", () => {
    assert.ok(tapes.length > 50, `${tapes.length} tapes`);
    let picks = 0;
    for (const t of steps) picks += selectFixed(tapes.slice(), t, o).picks.length;
    assert.ok(picks > steps.length, `${picks} picks over ${steps.length} steps`);
  });

  it("the cheap-gates-first verdict picks exactly what configEvalAt's report picks (same scores and windows)", () => {
    for (const t of steps) {
      const fast = selectFixed(tapes.slice(), t, o);
      const report = selectFixed(tapes.slice(), t, { ...o, recordValidation: true });
      assert.equal(key(fast), key(report), `step ${new Date(t).toISOString()}`);
      assert.equal(fast.eligible, report.eligible);
    }
  });

  it("forward cursors on one tape list give the binary searches' picks, also after a jump back and with other options", () => {
    const same = tapes.slice();
    for (const t of steps) assert.equal(key(selectFixed(same, t, o)), key(selectFixed(tapes.slice(), t, o)));
    // back to an earlier time (a new run on the same list): binary searches, then forward again
    for (const t of [steps[5], steps[6], steps[30], steps[2], steps[39]])
      assert.equal(key(selectFixed(same, t, o)), key(selectFixed(tapes.slice(), t, o)));
    // other options on the same list rebuild the cached infos
    const o2 = { ...o, gates: { ...o.gates, minPf: 1.3 } };
    for (const t of steps.slice(10, 20)) assert.equal(key(selectFixed(same, t, o2)), key(selectFixed(tapes.slice(), t, o2)));
  });

  it("the symbol gate's per-symbol index counts exactly the full scan's closes, in the same order", () => {
    // the scan before the index: every close of every symbol in the look-back, the symbol's slots masked
    const scan = (tp: ConfigTape, sym: string, side: number, from: number, entryT: number) => {
      const mask = tp.syms.map((s) => s === sym);
      if (!mask.some(Boolean)) return { n: 0, net: 0, pf: 0 };
      let b = 0;
      while (b < tp.n && tp.exitT[b] <= entryT) b++;
      let n = 0;
      let gp = 0;
      let gl = 0;
      let net = 0;
      for (let i = b - 1; i >= 0; i--) {
        if (tp.exitT[i] < from) break;
        if (!mask[tp.symI[i]]) continue;
        if (side !== 0 && tp.side[i] !== side) continue;
        n++;
        const r = tp.r[i];
        net += r;
        if (r > 0) gp += r;
        else gl -= r;
      }
      return { n, net: net * 100, pf: profitFactor(gp, gl) };
    };
    let compared = 0;
    for (const tp of tapes.slice(0, 120))
      for (const sym of ["A-USDT", "B-USDT", "C-USDT", "Z-USDT"])
        for (const side of [0, 1, -1])
          for (const t of [steps[3], steps[20], steps[39], u.nowT]) {
            const got = symStats(tp, sym, side, t - 72 * H, t);
            assert.deepEqual(got, scan(tp, sym, side, t - 72 * H, t), `${tp.id} ${sym} ${side}`);
            compared += got.n;
          }
    assert.ok(compared > 1000, `${compared} closes compared`);
  });

  it("a walk-forward run with the indexes equals the run on fresh tape lists (no cache carried between them)", () => {
    const wf = { ...o, simH: 48, stepH: 1 };
    const a = walkForward(u, tapes, wf);
    const b = walkForward(u, tapes.slice(), wf);
    assert.equal(JSON.stringify(a.trades), JSON.stringify(b.trades));
    assert.equal(JSON.stringify(a.skips), JSON.stringify(b.skips));
    assert.ok(a.trades.length > 0, "the run executed trades");
  });
});

describe("paper step: an entry is judged on the seats of its own step", () => {
  it("before the step's time on its step's seats, at or after it on the seats picked now", async () => {
    const { seatedForEntry, stepSeats } = await import("./walkforward.ts");
    const T0 = Date.UTC(2026, 9, 13, 15);
    const seats = stepSeats([
      { t: T0, real: ["D"] },
      { t: T0 + H, real: ["C"] },
    ]);
    const now = new Set(["C"]);
    const t = T0 + H;
    // C seated only at t (on closes after its 15:15 entry): not taken; D seated at 15:00, dropped at t: taken
    assert.equal(seatedForEntry("C", T0 + 15 * 60_000, t, 1, seats, now), false);
    assert.equal(seatedForEntry("D", T0 + 15 * 60_000, t, 1, seats, now), true);
    // at or after t: the seats picked at t
    assert.equal(seatedForEntry("C", t + 60_000, t, 1, seats, now), true);
    assert.equal(seatedForEntry("D", t + 60_000, t, 1, seats, now), false);
    // a step the run does not hold: the seats picked at t
    assert.equal(seatedForEntry("C", T0 - 5 * H, t, 1, seats, now), true);
  });
});
