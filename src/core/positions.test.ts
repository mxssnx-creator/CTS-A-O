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

describe("positions vs orders", () => {
  it("a position is symbol × direction; each direction counts once; orders are the partials", () => {
    const book = openBook([
      { sym: "BTC", side: 1 },
      { sym: "BTC", side: 1 },
      { sym: "BTC", side: -1 },
      { sym: "ETH", side: 1 },
    ]);
    assert.deepEqual(book, { positions: 3, orders: 4, long: 2, short: 1 });
    assert.deepEqual(openBook([]), { positions: 0, orders: 0, long: 0, short: 0 });
  });
  it("overlapping partials of one symbol and side are one closed position; a gap starts a new one", () => {
    const trades = [
      o("BTC", 1, 0, 10),
      o("BTC", 1, 5, 20),
      o("BTC", 1, 20, 30),
      o("BTC", 1, 40, 50),
      o("BTC", -1, 5, 8),
    ];
    // BTC long: 0–10 and 5–20 overlap (one position); 20–30 starts as the last one closes at 20 (a new
    // position); 40–50 another; BTC short 5–8 is its own position → 3 long + 1 short
    assert.equal(closedPositions(trades), 4);
    assert.equal(closedPositions([o("A", 1, 0, 10), o("A", 1, 2, 5)]), 1);
    assert.equal(closedPositions([]), 0);
  });
  it("time-weighted open positions and orders", () => {
    const tl = openTimeline([o("A", 1, 0, 10), o("A", 1, 0, 10), o("B", -1, 5, 10)], 0, 10 * M);
    assert.equal(tl.maxOrders, 3);
    assert.equal(tl.maxPositions, 2);
    assert.ok(Math.abs(tl.avgOrders - 2.5) < 1e-9);
    assert.ok(Math.abs(tl.avgPositions - 1.5) < 1e-9);
  });
});

describe("position episodes", () => {
  it("a position with an order still open at the end never closes (it was counted closed and open at once)", async () => {
    const { positionEpisodes } = await import("./positions.ts");
    const closed = [
      { sym: "A", side: 1, entryT: 0, exitT: 10 },
      { sym: "A", side: 1, entryT: 5, exitT: 20 },
      { sym: "A", side: -1, entryT: 3, exitT: 4 },
      // re-entry at the instant the position closed: a new position
      { sym: "A", side: 1, entryT: 20, exitT: 30 },
    ];
    const open = [{ sym: "A", side: 1, entryT: 25 }];
    const eps = positionEpisodes(closed, open);
    assert.deepEqual(
      eps.map((e) => [e.key, e.start, e.end, e.orders]),
      [
        ["A|1", 0, 20, 2],
        ["A|-1", 3, 4, 1],
        ["A|1", 20, Infinity, 2],
      ],
    );
    // the closed orders alone: the last position looked closed at 30
    assert.equal(positionEpisodes(closed).at(-1)!.end, 30);
  });
});
