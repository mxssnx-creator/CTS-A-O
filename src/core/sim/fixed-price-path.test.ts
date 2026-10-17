import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars, Candle, Protect } from "../domain/types.ts";
import { barsFromCandles, headBars, mulberry32 } from "../market/bars.ts";
import { statsOf, type TradeLike } from "../metrics/stats.ts";
import { simulate, splitSides, type SimOptions } from "./backtest.ts";

const M = 60_000;
const P: Protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 12 };
const make = (rows: Array<[number, number, number, number]>, sym = "A"): Bars =>
  barsFromCandles(
    sym,
    1,
    rows.map(([o, h, l, c], i) => ({ t: i * M, o, h, l, c, v: 1 })),
  );
const flat = (n: number): Bars => make(Array.from({ length: n }, () => [100, 100.1, 99.9, 100]));

function parity(
  b: Bars,
  sig: Int8Array,
  p: Protect,
  opt: SimOptions = { cost: 0.002 },
  scope?: object,
) {
  // No sink: the unchanged bar-by-bar Trade simulator is the independent oracle.
  const expected = simulate("fixed-parity", b, sig, p, opt);
  const settled: Array<TradeLike & { mult: 1 }> = [];
  const actual = simulate("fixed-parity", b, sig, p, {
    ...opt,
    fixedPathScope: scope,
    sink: (r, entryT, exitT) => settled.push({ r, entryT, exitT, mult: 1 }),
  });
  assert.deepEqual(
    settled,
    expected.trades.map(({ r, entryT, exitT }) => ({ r, entryT, exitT, mult: 1 })),
  );
  assert.deepEqual(actual, { ...expected, trades: [] });
  assert.deepEqual(statsOf(settled, b.t[b.n - 1] + M), statsOf(expected.trades, b.t[b.n - 1] + M));
  return { expected, settled };
}

describe("fixed-exit sink price paths", () => {
  it("matches complete settled statistics, opens and pending across seeded prices, signals and cells", () => {
    let closes = 0;
    let opens = 0;
    let pending = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const rnd = mulberry32(seed);
      const n = 97 + seed * 17;
      let px = 100;
      const rows: Candle[] = Array.from({ length: n }, (_, i) => {
        const o = px * (1 + (rnd() - 0.5) * 0.018);
        const c = o * (1 + (rnd() - 0.5) * 0.014);
        px = c;
        return {
          t: i * M,
          o,
          h: Math.max(o, c) * (1 + rnd() * 0.008),
          l: Math.min(o, c) * (1 - rnd() * 0.008),
          c,
          v: 1,
        };
      });
      const b = barsFromCandles(`R${seed}`, 1, rows);
      const sig = Int8Array.from(rows, () => (rnd() < 0.35 ? (rnd() < 0.5 ? 1 : -1) : 0));
      const scope = {};
      for (const sg of [sig, ...splitSides(sig)])
        for (const cooldown of [0, 1, 4])
          for (const p of [
            P,
            { ...P, tp: 0.004, sl: 0.006, hold: 1, tag: "mc" },
            { ...P, tp: 0.03, sl: 0.02, hold: 40, tag: "gn" },
            { ...P, tp: 0, hold: n * 2 },
            { ...P, trailOnly: true, hold: 7 },
          ]) {
            const { expected } = parity(b, sg, p, { cost: seed % 2 ? 0.002 : 0, cooldown }, scope);
            closes += expected.trades.length;
            opens += expected.open ? 1 : 0;
            pending += expected.pending ? 1 : 0;
          }
    }
    assert.ok(closes > 1_000);
    assert.ok(opens > 0);
    assert.ok(pending > 0);
  });

  it("preserves first-bar ambiguity, both gap fills, earliest touch and barrier priority at the hold deadline", () => {
    const cases: Array<{
      rows: Array<[number, number, number, number]>;
      hold?: number;
      reason: string;
      exit: number;
    }> = [
      {
        rows: [
          [100, 100, 100, 100],
          [100, 102, 98, 100],
        ],
        reason: "sl",
        exit: 99,
      },
      {
        rows: [
          [100, 100, 100, 100],
          [100, 100.2, 99.8, 100],
          [97, 98, 96, 97],
        ],
        reason: "sl",
        exit: 97,
      },
      {
        rows: [
          [100, 100, 100, 100],
          [100, 100.2, 99.8, 100],
          [103, 104, 102, 103],
        ],
        reason: "tp",
        exit: 103,
      },
      {
        rows: [
          [100, 100, 100, 100],
          [100, 100.2, 99.8, 100],
          [100, 101, 99.8, 100],
          [98, 99, 97, 98],
        ],
        reason: "tp",
        exit: 101,
      },
      {
        rows: [
          [100, 100, 100, 100],
          [100, 100.2, 99.8, 100],
          [100, 101, 99.8, 100],
        ],
        hold: 2,
        reason: "tp",
        exit: 101,
      },
      {
        rows: [
          [100, 100, 100, 100],
          [100, 100.2, 99.8, 100],
          [100, 102, 98, 100],
        ],
        hold: 2,
        reason: "sl",
        exit: 99,
      },
      {
        rows: [
          [100, 100, 100, 100],
          [100, 100.2, 99.8, 100],
          [100, 100.4, 99.8, 100.3],
        ],
        hold: 2,
        reason: "time",
        exit: 100.3,
      },
    ];
    for (const row of cases)
      for (const side of [1, -1]) {
        // Reflect prices about entry=100 so the short fixtures exercise the corresponding exact barriers.
        const rows =
          side === 1
            ? row.rows
            : row.rows.map(
                ([o, h, l, c]) =>
                  [200 - o, 200 - l, 200 - h, 200 - c] as [number, number, number, number],
              );
        const b = make(rows);
        const sig = new Int8Array(b.n);
        sig[0] = side;
        const { expected } = parity(b, sig, { ...P, hold: row.hold ?? 12 }, { cost: 0.002 }, {});
        assert.equal(expected.trades[0].reason, row.reason);
        assert.equal(expected.trades[0].exit, side === 1 ? row.exit : 200 - row.exit);
      }
  });

  it("keeps cooldown re-entry, unfinished positions, disabled targets and last-bar pending exact", () => {
    const b = flat(23);
    const sig = new Int8Array(b.n).fill(1);
    const scope = {};
    for (const side of [1, -1])
      for (const cooldown of [0, 1, 4])
        for (const p of [
          { ...P, tp: 0, hold: 4 },
          { ...P, trailOnly: true, hold: 100 },
          { ...P, tp: 2, sl: 2, hold: 3 },
          { ...P, tp: 0, sl: 0, hold: 1 },
        ])
          parity(
            b,
            Int8Array.from(sig, () => side),
            p,
            { cost: 0.002, cooldown },
            scope,
          );
    const pending = new Int8Array(b.n);
    pending[b.n - 1] = -1;
    assert.equal(parity(b, pending, P, { cost: 0.002 }, scope).expected.pending, -1);
    assert.ok(
      parity(b, sig, { ...P, trailOnly: true, hold: 100 }, { cost: 0.002 }, scope).expected.open,
    );
  });

  it("isolates clipped causal extents and poisoned futures even when price arrays share their backing", () => {
    const b = make([
      [100, 100, 100, 100],
      [100, 100.2, 99.8, 100],
      [100, 100.2, 99.8, 100],
      [100, 100.2, 99.8, 100],
      [90, 91, 89, 90],
      [90, 91, 89, 90],
    ]);
    const sig = Int8Array.of(1, 0, 0, 0, 0, 0);
    const scope = {};
    assert.equal(parity(b, sig, P, { cost: 0.002 }, scope).settled.length, 1);
    const sharedHead = { ...b, n: 4 };
    const causalHead = headBars(b, 4 * M);
    for (const clipped of [sharedHead, causalHead]) {
      const result = parity(clipped, sig, P, { cost: 0.002 }, scope);
      assert.equal(result.settled.length, 0);
      assert.ok(result.expected.open);
      assert.equal(result.expected.open.mtm, -0.002);
    }
    const past = Int8Array.of(0, 0, 1, 0);
    parity(causalHead, past, { ...P, hold: 1 }, { cost: 0.002 }, scope);
  });

  it("does not reuse prices across jobs, and generic mutable sink callers keep the scanner", () => {
    const b = flat(4);
    const sig = Int8Array.of(1, 0, 0, 0);
    assert.equal(parity(b, sig, P, { cost: 0.002 }, {}).settled.length, 0);
    b.l[2] = 98;
    assert.equal(parity(b, sig, P, { cost: 0.002 }, {}).settled.length, 1);
    b.l[2] = 99.9;
    assert.equal(parity(b, sig, P, { cost: 0.002 }, {}).settled.length, 0);
    b.h[2] = 102;
    assert.equal(parity(b, sig, P, { cost: 0.002 }, {}).settled.length, 1);
    b.h[2] = 100.1;
    assert.equal(parity(b, sig, P).settled.length, 0);
    b.l[2] = 98;
    assert.equal(parity(b, sig, P).settled.length, 1);
  });

  it("retains scanner behavior for malformed/nonfinite prices, distances and holds", () => {
    const sig = Int8Array.of(1, 0, 0, 0, 0, -1);
    for (const field of ["t", "o", "h", "l", "c"] as const)
      for (const value of [NaN, Infinity, -Infinity]) {
        const b = flat(6);
        b[field][2] = value;
        parity(b, sig, { ...P, hold: 2 }, { cost: 0.002 }, {});
      }
    for (const p of [
      { ...P, hold: NaN },
      { ...P, hold: Infinity },
      { ...P, hold: 0 },
      { ...P, hold: 2.5 },
      { ...P, tp: NaN },
      { ...P, sl: Infinity },
      { ...P, sl: -0.01 },
    ])
      parity(flat(6), sig, p, { cost: 0.002 }, {});
    const malformed = flat(6);
    malformed.h[2] = 90;
    parity(malformed, sig, P, { cost: 0.002 }, {});
    parity({ ...flat(6), n: 0 }, new Int8Array(), P, { cost: 0.002 }, {});
  });

  it("keeps trailing and ATR histories on their original scanner, including pending protection", () => {
    const b = make([
      [100, 100, 100, 100],
      [100, 100.8, 99.9, 100.7],
      [100.6, 100.7, 100.2, 100.3],
      [100.3, 102, 100.2, 101.5],
      [101.5, 102, 100, 100.5],
      [100.5, 100.7, 100.4, 100.6],
    ]);
    const scope = {};
    const sig = Int8Array.of(1, -1, 1, -1, 0, 1);
    parity(b, sig, P, { cost: 0.002 }, scope);
    for (const sg of splitSides(sig))
      for (const p of [
        { ...P, tp: 0.05, trail: 0.005 },
        { ...P, trail: 0.005, trailOnly: true, trailFree: true },
        { ...P, atr: { sl: 1.15, tpRatio: 2 } },
        { ...P, atr: { sl: 1.15, tpRatio: 2, trail: 0.8 } },
      ])
        parity(b, sg, p, { cost: 0.002 }, scope);
    const pending = Int8Array.of(0, 0, 0, 0, 0, -1);
    assert.ok(
      parity(b, pending, { ...P, atr: { sl: 1.15, tpRatio: 2 } }, { cost: 0.002 }, scope).expected
        .pendingProtect,
    );
  });

  it("retains caller symbol/side ordering for simultaneous closes", () => {
    const scope = {};
    const settled: Array<TradeLike & { sym: string; side: number }> = [];
    const expected: typeof settled = [];
    for (const sym of ["Z", "A"])
      for (const side of [1, -1]) {
        const b = make(
          [
            [100, 100, 100, 100],
            [100, 102, 98, 100],
          ],
          sym,
        );
        const sig = Int8Array.of(side, 0);
        const ref = simulate("ordered", b, sig, P, { cost: 0.002 });
        expected.push(
          ...ref.trades.map(({ r, entryT, exitT }) => ({ r, entryT, exitT, sym, side })),
        );
        simulate("ordered", b, sig, P, {
          cost: 0.002,
          fixedPathScope: scope,
          sink: (r, entryT, exitT) => settled.push({ r, entryT, exitT, sym, side }),
        });
      }
    assert.deepEqual(settled, expected);
  });
});
