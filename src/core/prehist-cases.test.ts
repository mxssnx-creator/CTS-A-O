// Pre-historic stats (prehist.ts) on hand-built trades: every field against a hand computation, the empty input, the
// window boundaries of the time-weighted averages, and the sliced generator. (prehist.test.ts covers the most orders
// open at once against the event-list computation on random trades; this file adds the cases it does not have.)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prehistStats, prehistStatsGen, type PrehistStats } from "./prehist.ts";
import type { Trade } from "./domain/types.ts";
import { PF_NO_LOSS } from "./config.ts";

const H = 3_600_000;
/** r values are binary fractions so every sum below is exact */
const tr = (sym: string, side: 1 | -1, eH: number, xH: number, r: number): Trade => ({
  cfg: `b|ind|${sym}`,
  sym,
  side,
  entryT: eH * H,
  exitT: xH * H,
  entry: 1,
  exit: 1,
  r,
  reason: r > 0 ? "tp" : "sl",
  bars: 1,
  mfe: 0,
  mae: 0,
});

describe("pre-historic stats: hand-computed cases", () => {
  // A long 0–2 h +1/32, A long 1–3 h −1/64 (overlaps the first), B short 3–4 h +1/64 (opens as A's second closes),
  // B short 9–12 h −1/128 (runs past the window end at 10 h)
  const trades = [
    tr("A", 1, 0, 2, 1 / 32),
    tr("A", 1, 1, 3, -1 / 64),
    tr("B", -1, 3, 4, 1 / 64),
    tr("B", -1, 9, 12, -1 / 128),
  ];

  it("every field on a known input", () => {
    const s = prehistStats(trades, 0, 10 * H);
    assert.equal(s.n, 4);
    assert.equal(s.wr, 0.5);
    // gp 3/64, gl 3/128 → PF 2; net (1/32 − 1/64 + 1/64 − 1/128) × 100
    assert.equal(s.pf, 2);
    assert.equal(s.net, (1 / 32 - 1 / 128) * 100);
    // the curve peaks at 2 h, regains the peak at 4 h (2 h under water), dips at 12 h and is still under at the last
    // exit: the open drawdown counts to the last exit, 12 − 4 = 8 h
    assert.equal(s.ddtH, 8);
    // green-hour SHARE (statsOf's gh, shown as a ratio): hours of exit 1, 2, 3, 11 → green 1 and 3 → 0.5
    assert.equal(s.greenHours, 0.5);
    // order-hours inside [0, 10 h): 2 + 2 + 1 + 1 (the last clipped at 10 h) = 6 h over 10 h
    assert.ok(Math.abs(s.avgOpen - 0.6) < 1e-12);
    // two orders at once (A's two); B's first opens exactly as A's second closes (a close frees first)
    assert.equal(s.maxOpen, 2);
    // positions: A long one episode (overlap), B short two (a gap 4–9 h)
    assert.equal(s.positions, 3);
    // position-hours inside the window: A 0–3, B 3–4 and 9–10 → 5 h over 10 h; never two at once
    assert.ok(Math.abs(s.avgPositions - 0.5) < 1e-12);
    assert.equal(s.maxPositions, 1);
    assert.deepEqual(s.perSymbol, [
      { sym: "A", n: 2, pf: 2, net: (1 / 32 - 1 / 64) * 100 },
      { sym: "B", n: 2, pf: 2, net: (1 / 64 - 1 / 128) * 100 },
    ]);
  });

  it("the input order does not matter and the input is not reordered", () => {
    const rev = [...trades].reverse();
    const copy = [...rev];
    assert.deepEqual(prehistStats(rev, 0, 10 * H), prehistStats(trades, 0, 10 * H));
    assert.deepEqual(rev, copy);
  });

  it("per symbol: sorted by count, a symbol without losses gets the no-loss PF, one without wins PF 0", () => {
    const s = prehistStats(
      [tr("W", 1, 0, 1, 1 / 64), tr("L", -1, 0, 1, -1 / 64), tr("L", -1, 1, 2, -1 / 64)],
      0,
      2 * H,
    );
    assert.deepEqual(
      s.perSymbol.map((x) => [x.sym, x.n, x.pf]),
      [
        ["L", 2, 0],
        ["W", 1, PF_NO_LOSS],
      ],
    );
  });

  it("empty input: zeros everywhere, no NaN", () => {
    const s = prehistStats([], 0, 10 * H);
    const want: PrehistStats = {
      pf: 0,
      ddtH: 0,
      n: 0,
      wr: 0,
      greenHours: 0,
      net: 0,
      avgOpen: 0,
      maxOpen: 0,
      positions: 0,
      avgPositions: 0,
      maxPositions: 0,
      perSymbol: [],
    };
    assert.deepEqual(s, want);
  });

  it("window boundaries: open time is clipped to [start, end), outside trades add none", () => {
    // exactly the window: open the whole span
    assert.equal(prehistStats([tr("A", 1, 2, 6, 0.0625)], 2 * H, 6 * H).avgOpen, 1);
    assert.equal(prehistStats([tr("A", 1, 2, 6, 0.0625)], 2 * H, 6 * H).avgPositions, 1);
    // straddling the start and the end: only the inside counts (2 h of a 4 h window)
    const s = prehistStats([tr("A", 1, 0, 3, 0.0625), tr("B", -1, 5, 9, 0.0625)], 2 * H, 6 * H);
    assert.equal(s.avgOpen, 0.5);
    assert.equal(s.avgPositions, 0.5);
    // entirely before or after the window: no open time, no open position-time
    const out = prehistStats([tr("A", 1, 0, 1, 0.0625), tr("B", 1, 7, 8, 0.0625)], 2 * H, 6 * H);
    assert.equal(out.avgOpen, 0);
    assert.equal(out.avgPositions, 0);
    assert.equal(out.maxPositions, 0);
    // an exit exactly at the start / an entry exactly at the end: zero-length inside the window
    const edge = prehistStats([tr("A", 1, 0, 2, 0.0625), tr("B", 1, 6, 8, 0.0625)], 2 * H, 6 * H);
    assert.equal(edge.avgOpen, 0);
    assert.equal(edge.avgPositions, 0);
  });

  it("an empty or inverted window does not divide by zero", () => {
    for (const [a, b] of [
      [5 * H, 5 * H],
      [6 * H, 2 * H],
    ]) {
      const s = prehistStats(trades, a, b);
      assert.equal(s.avgOpen, 0);
      assert.equal(s.avgPositions, 0);
      assert.ok(Object.values(s).every((v) => typeof v !== "number" || Number.isFinite(v)));
    }
  });

  it("the generator yields its five slices in order and returns what prehistStats returns", () => {
    const g = prehistStatsGen(trades, 0, 10 * H);
    const ys: number[] = [];
    let r = g.next();
    while (!r.done) {
      ys.push(r.value);
      r = g.next();
    }
    assert.deepEqual(ys, [0, 1, 2, 3, 4]);
    assert.deepEqual(r.value, prehistStats(trades, 0, 10 * H));
  });
});
