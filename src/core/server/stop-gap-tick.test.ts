import assert from "node:assert/strict";
import { test } from "node:test";
import { TickMathBook, type TickPosition } from "./tick-math.ts";

const M = 60_000;
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);
const position = (side: 1 | -1, tag: string, stopDistance = .02, tf = 1): TickPosition => ({
  cfg: `follow|ema-9-21@m${tf}|t0.05|s${stopDistance}|r0|h20|${tag}`,
  sym: "A-USDT", side, entryT: 0, entryI: 0, entry: 100,
  stop: 100 * (1 - side * stopDistance), target: 100 * (1 + side * .05),
  peak: 100, trailOn: false, trail: 0, mtm: 0,
});

test("stop gaps use the adverse observed quote for each independent range and charge one cost", () => {
  for (const cost of [.0012, .0015]) for (const side of [1, -1] as const) {
    for (const tag of ["mc", "mn", "sh", "gn", "lg", "wide"]) {
      const first = position(side, tag), sibling = position(side, `${tag}-sibling`, .04);
      const book = new TickMathBook([first, sibling], Float64Array.of(1, 1), cost, 1, false);
      book.advance({ "A-USDT": 100 }, M);
      const price = 100 - side * 3;
      const hit = book.advance({ "A-USDT": price }, M + 1);
      assert.equal(first.hitPx, price, `${tag}/${side}: do not assume a fill at an unobserved stop`);
      assert.equal(sibling.stopHit, undefined, `${tag}/${side}: sibling retains its own stop`);
      close(first.mtm, -.03 - cost);
      assert.equal(Object.keys(hit.hits ?? {}).length, 1);
      assert.equal(Object.values(hit.hits ?? {})[0].px, price);
      const later = book.advance({ "A-USDT": 100 - side * 5 }, M + 2);
      assert.equal(first.hitPx, price, "the first instruction cannot be repriced by a later tick");
      assert.equal(sibling.hitPx, 100 - side * 5);
      close(sibling.mtm, -.05 - cost);
      assert.equal(Object.keys(later.hits ?? {}).length, 1);
      assert.equal(book.advance({ "A-USDT": 100 }, M + 3).hits, null);
    }
  }
});

test("targets remain at their own trigger when price jumps through them", () => {
  for (const side of [1, -1] as const) {
    const p = position(side, "mn"), cost = .0012;
    const book = new TickMathBook([p], Float64Array.of(1), cost, 1, false);
    book.advance({ "A-USDT": 100 }, M);
    book.advance({ "A-USDT": 100 + side * 6 }, M + 1);
    close(p.hitPx!, 100 + side * 5);
    close(p.mtm, .05 - cost);
  }
});

test("normal trailing and trailing-only advance on their completed lane bars and use adverse observed stops", () => {
  for (const cost of [.0012, .0015]) for (const side of [1, -1] as const) {
    for (const trailingOnly of [false, true]) for (const tf of [1, 5, 15]) {
      const p = { ...position(side, trailingOnly ? "trail-only" : "trail", .02, tf), trail: .01,
        trailDist: .01, trailOnly: trailingOnly, target: trailingOnly ? 0 : 100 + side * 5 };
      const book = new TickMathBook([p], Float64Array.of(1), cost, 1, false);
      book.advance({ "A-USDT": 100 }, tf * M);
      book.advance({ "A-USDT": 100 + side * 3 }, tf * M + 1);
      assert.equal(p.stop, 100 * (1 - side * .02), "an unfinished bar cannot ratchet");
      book.advance({ "A-USDT": 100 + side * 3 }, 2 * tf * M);
      assert.ok(side * (p.stop - 100) > 0, "the closed-bar peak moves the stop into profit");
      const stop = p.stop;
      book.advance({ "A-USDT": 100 + side * 2.2 }, 2 * tf * M + 1);
      assert.equal(p.stop, stop, "a reversal within a bar cannot loosen the stop");
      const adverse = 100;
      book.advance({ "A-USDT": adverse }, 2 * tf * M + 2);
      assert.equal(p.hitPx, adverse);
      close(p.mtm, -cost);
      assert.equal(book.advance({ "A-USDT": 100 + side * 4 }, 3 * tf * M).hits, null);
    }
  }
});
