import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BaseCellAccumulator, baseCellAccumulator } from "./base-cell-stats.ts";
import { cellStats, makeUniverse, passesBase, runCombo } from "./pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { statsOf, type TradeLike } from "../metrics/stats.ts";

type Row = [r: number, entryT: number, exitT: number];
const oracle = (runs: readonly (readonly Row[])[]) => {
  const rows: TradeLike[] = runs.flatMap((run) => run.map(([r, entryT, exitT]) => ({ r, entryT, exitT })));
  rows.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  const st = statsOf(rows);
  return rows.length
    ? { n: st.n, pf: st.pf, net: st.net, mdd: st.mdd, gp: st.gp, gl: st.gl }
    : { n: 0, pf: st.pf, net: 0, mdd: 0 };
};
const collect = (cell: BaseCellAccumulator, runs: readonly (readonly Row[])[]) => {
  cell.reset();
  for (const run of runs) {
    cell.beginRun();
    for (const row of run) cell.push(...row);
  }
  return cell.stats();
};

describe("Base cell chronological statistics buffer", () => {
  it("preserves exact return accumulation and drawdown across stable timestamp ties", () => {
    const runs: Row[][] = [
      [[0.01, 1, 10], [-0.02, 2, 20], [0.03, 3, 30]],
      [],
      [[-0.005, 1, 10], [1e-18, 2, 20], [-0.01, 3, 30]],
      [[0.02, 1, 10], [-1e-18, 2, 20], [0.001, 3, 30]],
      [[1e16, 4, 40]], [[-1e16, 4, 40]], [[1, 4, 40]],
    ];
    const cell = new BaseCellAccumulator();
    assert.deepEqual(collect(cell, runs), oracle(runs));
    assert.deepEqual(cell.stats(), oracle(runs), "reading twice does not duplicate run boundaries");
  });

  it("matches stable sort for arbitrary unsorted or nonfinite-time runs", () => {
    const cell = new BaseCellAccumulator();
    const cases: Row[][][] = [
      [[[0.01, 6, 30], [-0.02, 1, 10], [0.03, 4, 20]], [[-0.01, 3, 20]]],
      [[[0.01, 6, 20], [-0.02, 1, 20]], [[0.03, 4, 20]]],
      [[[0.01, 6, NaN], [-0.02, 1, 10]], [[0.03, 4, Infinity]]],
    ];
    for (const runs of cases) assert.deepEqual(collect(cell, runs), oracle(runs));
  });

  it("fails closed for nonfinite returns and overflowed return-PF cells", () => {
    const rejected = { n: 2, pf: 0, net: 0, mdd: 0, gp: 0, gl: 0, invalid: true };
    for (const bad of [NaN, Infinity, -Infinity]) {
      const got = collect(new BaseCellAccumulator(), [[[0.02, 0, 1], [bad, 1, 2]]]);
      assert.deepEqual(got, rejected, `invalid return ${bad} cannot qualify`);
    }
    for (const rows of [
      [[1e308, 0, 1], [-1, 1, 2]], // gross-profit and net percentage overflow
      [[1, 0, 1], [-Number.MIN_VALUE, 1, 2]], // PF quotient overflow
    ] satisfies Row[][]) {
      const got = collect(new BaseCellAccumulator(), [rows]);
      assert.deepEqual(got, rejected, "finite inputs whose primary totals overflow cannot qualify");
    }
    assert.deepEqual(collect(new BaseCellAccumulator(), [[[0.02, 0, 1], [-0.01, 1, 2]]]),
      oracle([[[0.02, 0, 1], [-0.01, 1, 2]]]), "ordinary Base outcomes retain exact parity");
  });

  it("refuses nonfinite PF, net and drawdown in every Base pass, even with DDR disabled", () => {
    const g = { minPf: 1.1, minTrades: 2, maxDdr: 0 };
    const st = { n: 2, pf: 2, net: 1, mdd: 0.5 };
    assert.equal(passesBase(st, g), true);
    assert.equal(passesBase({ n: 2, pf: 2, net: 1 }, g), true, "disabled DDR keeps legacy missing-drawdown cells");
    for (const n of [NaN, Infinity, -Infinity, 1.5])
      assert.equal(passesBase({ ...st, n }, g), false, "count must be an actual settled trade count");
    for (const pf of [NaN, Infinity, -Infinity])
      assert.equal(passesBase({ ...st, pf }, g), false, "unmeasured PF cannot qualify");
    for (const net of [NaN, Infinity, -Infinity])
      assert.equal(passesBase({ ...st, net }, g), false, "invalid net return cannot qualify");
    for (const mdd of [NaN, Infinity, -Infinity, -0.5])
      assert.equal(passesBase({ ...st, mdd }, g), false, "invalid MDD cannot be bypassed by disabling DDR");
  });

  it("grows, reuses and clears buffers without changing prior returned cells", () => {
    const cell = new BaseCellAccumulator();
    const runs = Array.from({ length: 7 }, (_, j) => Array.from({ length: 211 }, (_, i): Row => [
      ((i + j) % 3 ? 1 : -1) * (0.002 + i * 1e-7), i * 5 + j, i * 7 + j,
    ]));
    const before = collect(cell, runs);
    assert.deepEqual(before, oracle(runs));
    assert.deepEqual(collect(cell, [[]]), oracle([[]]));
    const next: Row[][] = [[[0.01, 1, 10], [-0.004, 2, 20]]];
    assert.deepEqual(collect(cell, next), oracle(next));
    assert.deepEqual(before, oracle(runs), "returned stats are detached from reused scratch");
  });

  it("matches stable sort over varied odd and even chronological run counts", () => {
    const cell = new BaseCellAccumulator();
    for (let seed = 1; seed <= 31; seed++) {
      const runs = Array.from({ length: seed }, (_, j) => Array.from({ length: (j * 17 + seed) % 73 }, (_, i): Row => [
        ((i + j) % 3 ? 1 : -1) * (0.002 + i * 1e-7), Math.floor(i / 3) * 5, Math.floor(i / 3) * 7,
      ]));
      assert.deepEqual(collect(cell, runs), oracle(runs));
    }
  });

  it("keeps scratch independent between immutable Universe jobs", () => {
    const a = {};
    const b = {};
    const ca = baseCellAccumulator(a);
    ca.beginRun();
    ca.push(0.01, 1, 2);
    const cb = baseCellAccumulator(b);
    cb.beginRun();
    cb.push(-0.02, 1, 2);
    assert.deepEqual(ca.stats(), oracle([[[0.01, 1, 2]]]));
    assert.deepEqual(cb.stats(), oracle([[[-0.02, 1, 2]]]));
    assert.equal(baseCellAccumulator(a), ca);
    assert.deepEqual(ca.stats(), oracle([]), "next cell resets only its job scratch");
    assert.deepEqual(cb.stats(), oracle([[[-0.02, 1, 2]]]));
  });

  it("retains zero-close cells for empty and last-bar-only pending signals", () => {
    const end = Date.UTC(2026, 9, 17);
    const p = { tp: 0.008, sl: 0.014, trail: 0, hold: 24, tag: "mn" as const };
    for (const side of [0, 1, -1]) {
      const b = barsFromCandles("EMPTY", 15, syntheticCandles("EMPTY", 15, 200, end));
      const u = makeUniverse([b]);
      const sig = new Int8Array(b.n);
      sig[b.n - 1] = side;
      u.caches[0].memo("combo:follow:rsi-mid@m15", () => sig);
      assert.deepEqual(cellStats(u, "follow", "rsi-mid@m15", p, 0.002), { n: 0, pf: 0, net: 0, mdd: 0 });
      const ordinary = runCombo(u, "follow", "rsi-mid@m15", p, 0.002, 1)!;
      assert.equal(ordinary.full.n, 0);
      assert.equal(ordinary.pending.length, side ? 1 : 0, "pending entries remain independent of Base settled counts");
    }
  });

  it("matches ordinary Trade-mode Base stats across configs, lanes, directions and causal windows", () => {
    const end = Date.UTC(2026, 9, 17);
    const bars = [5, 15].flatMap((tf) => ["A", "B", "C"].map((s, i) =>
      barsFromCandles(s, tf, syntheticCandles(s, tf, 800, end, 3 + i))));
    const protects = [
      { tp: 0.008, sl: 0.014, trail: 0, hold: 24, tag: "mn" as const },
      { tp: 0.02, sl: 0.03, trail: 0.005, hold: 32, tag: "gn" as const },
      { tp: 0, sl: 0.02, trail: 0.004, trailOnly: true, trailStep: 0.5, hold: 24, tag: "sh" as const },
      { tp: 0.02, sl: 0.02, trail: 0, hold: 32, atr: { sl: 1.5, tpRatio: 2 } },
    ];
    let closes = 0;
    for (const fromT of [undefined, end - 24 * 3_600_000]) {
      const u = makeUniverse(bars, fromT);
      for (const bot of ["follow", "revert", "sandwich"] as const)
        for (const tf of [5, 15])
          for (const p of protects) {
            const ind = `rsi-mid@m${tf}`;
            const actual = cellStats(u, bot, ind, p, 0.002, { ...DEFAULT_SETTINGS.tactics, cooldown: true });
            const expected = runCombo(u, bot, ind, p, 0.002, 1, { ...DEFAULT_SETTINGS.tactics, cooldown: true })!.full;
            closes += expected.n;
            assert.deepEqual(actual, expected.n
              ? { n: expected.n, pf: expected.pf, net: expected.net, mdd: expected.mdd, gp: expected.gp, gl: expected.gl }
              : { n: 0, pf: expected.pf, net: 0, mdd: 0 });
          }
    }
    assert.ok(closes > 100, "parity exercises settled trades as well as empty cells");
  });
});
