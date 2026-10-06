// Positions vs orders (positions.ts) on hand-built inputs: the cases positions.test.ts does not cover — long and
// short of one symbol as two positions in every function, unsorted input, nested and touching orders, and the
// timeline's window clipping and same-instant ordering.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closedPositions, openBook, openTimeline } from "./positions.ts";

const M = 60_000;
const o = (sym: string, side: number, a: number, b: number) => ({
  sym,
  side,
  entryT: a * M,
  exitT: b * M,
});
const near = (a: number, b: number) => Math.abs(a - b) < 1e-12;

describe("positions vs orders: more cases", () => {
  it("openBook: long and short of every symbol are separate positions, counted once each", () => {
    const book = openBook([
      { sym: "A", side: -1 },
      { sym: "A", side: 1 },
      { sym: "A", side: -1 },
      { sym: "B", side: -1 },
      { sym: "B", side: -1 },
    ]);
    assert.deepEqual(book, { positions: 3, orders: 5, long: 1, short: 2 });
    // the side is read by its sign (a volume-scaled side still names its direction)
    assert.deepEqual(
      openBook([
        { sym: "A", side: 2 },
        { sym: "A", side: 1 },
        { sym: "A", side: -3 },
      ]),
      {
        positions: 2,
        orders: 3,
        long: 1,
        short: 1,
      },
    );
  });

  it("closedPositions: unsorted input, nested orders and both sides of one symbol", () => {
    // A long: 0–30 holds 5–10 and 12–20 (nested: one episode); 40–50 a second. A short 5–8 and 7–9: one episode
    const xs = [
      o("A", 1, 40, 50),
      o("A", 1, 12, 20),
      o("A", -1, 7, 9),
      o("A", 1, 0, 30),
      o("A", 1, 5, 10),
      o("A", -1, 5, 8),
    ];
    assert.equal(closedPositions(xs), 3);
    // the same orders mirrored by side: the same count
    assert.equal(closedPositions(xs.map((x) => ({ ...x, side: -x.side }))), 3);
    // touching orders (an exit at t, the next entry at t): the slot is free, a new position
    assert.equal(closedPositions([o("A", 1, 0, 10), o("A", 1, 10, 20)]), 2);
    // overlapping by one minute: one position
    assert.equal(closedPositions([o("A", 1, 0, 10), o("A", 1, 9, 20)]), 1);
    // another symbol on the same side is its own position
    assert.equal(closedPositions([o("A", 1, 0, 10), o("B", 1, 0, 10)]), 2);
    // the input is not reordered
    const copy = xs.map((x) => ({ ...x }));
    closedPositions(xs);
    assert.deepEqual(xs, copy);
  });

  it("openTimeline: empty input and orders outside the window are zero", () => {
    assert.deepEqual(openTimeline([], 0, 10 * M), {
      avgPositions: 0,
      maxPositions: 0,
      avgOrders: 0,
      maxOrders: 0,
    });
    const out = openTimeline(
      [o("A", 1, 0, 5), o("A", 1, 20, 30), o("B", -1, 10, 10)],
      10 * M,
      20 * M,
    );
    assert.deepEqual(out, { avgPositions: 0, maxPositions: 0, avgOrders: 0, maxOrders: 0 });
  });

  it("openTimeline: orders are clipped to the window", () => {
    // A long 0–15 → 10–15 inside [10, 20); B short 18–40 → 18–20
    const tl = openTimeline([o("A", 1, 0, 15), o("B", -1, 18, 40)], 10 * M, 20 * M);
    assert.ok(near(tl.avgOrders, (5 + 2) / 10));
    assert.ok(near(tl.avgPositions, (5 + 2) / 10));
    assert.equal(tl.maxOrders, 1);
    assert.equal(tl.maxPositions, 1);
  });

  it("openTimeline: an exit and an entry at the same instant do not overlap", () => {
    const tl = openTimeline([o("A", 1, 0, 5), o("A", 1, 5, 10)], 0, 10 * M);
    assert.equal(tl.maxOrders, 1);
    assert.equal(tl.maxPositions, 1);
    assert.ok(near(tl.avgOrders, 1));
    assert.ok(near(tl.avgPositions, 1));
  });

  it("openTimeline: long and short of one symbol are two positions; partials of one side are one", () => {
    // 0–10: A long × 2 partials, 2–6: A short → orders peak 3, positions peak 2
    const tl = openTimeline([o("A", 1, 0, 10), o("A", 1, 0, 10), o("A", -1, 2, 6)], 0, 10 * M);
    assert.equal(tl.maxOrders, 3);
    assert.equal(tl.maxPositions, 2);
    assert.ok(near(tl.avgOrders, (2 * 10 + 4) / 10));
    assert.ok(near(tl.avgPositions, (10 + 4) / 10));
    // mirrored by side: the same timeline
    const m = openTimeline([o("A", -1, 0, 10), o("A", -1, 0, 10), o("A", 1, 2, 6)], 0, 10 * M);
    assert.deepEqual(m, tl);
  });

  it("openTimeline: a position stays open while any of its partials is (closing one partial keeps it)", () => {
    // A long 0–4 and 2–8: one position 0–8; orders 2 during 2–4
    const tl = openTimeline([o("A", 1, 0, 4), o("A", 1, 2, 8)], 0, 10 * M);
    assert.equal(tl.maxPositions, 1);
    assert.equal(tl.maxOrders, 2);
    assert.ok(near(tl.avgPositions, 8 / 10));
    assert.ok(near(tl.avgOrders, (4 + 6) / 10));
  });
});
