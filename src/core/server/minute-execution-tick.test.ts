import assert from "node:assert/strict";
import { test } from "node:test";
import { TickMathBook, carryTrail, type TickPosition } from "./tick-math.ts";

const M = 60_000;
const position = (): TickPosition => ({
  cfg: "follow|ema-9-21@m30|t0.05|s0.02|r0.005|h0|hm15|mc",
  sym: "CLOCK-USDT", side: 1, entryT: 0, entryI: 0, entry: 100,
  stop: 98, target: 105, peak: 100, trailOn: false, trail: .005,
  trailDist: .005, mtm: -.0015,
});

test("a capped position advances its realtime trail on its execution clock and preserves the legacy lane clock", () => {
  const minute = { ...position(), executionTfMin: 1 }, legacy = position();
  const book = new TickMathBook([minute, legacy], Float64Array.of(1, 1), .0015, 1, false);
  book.advance({ "CLOCK-USDT": 101 }, M);
  book.advance({ "CLOCK-USDT": 101 }, 2 * M);
  assert.ok(minute.stop > 100, "the closed minute must arm/ratchet the validated minute trail");
  assert.equal(legacy.stop, 98, "an unstamped legacy/native position still owns its30m clock");
  const closed = book.advance({ "CLOCK-USDT": 100 }, 2 * M + 1);
  assert.ok(minute.stopHit, "a reversal hits the actual ratcheted minute stop");
  assert.equal(legacy.stopHit, undefined);
  assert.equal(Object.keys(closed.hits ?? {}).length, 1);
});

test("rebuilding a position cannot reinterpret retained tick indices using a different clock", () => {
  const old = { ...position(), tkBar: 5, tkHi: 101, tkLo: 100, tkClose: 101 };
  const now = { ...position(), executionTfMin: 1 };
  const carried = carryTrail(now, old);
  assert.equal(carried.tkBar, undefined);
  assert.equal(carried.stop, 98, "price protection remains monotone independently of bar provenance");
});

test("a flat quote closes at the captured hold deadline without waiting for a compute or indication bar", () => {
  const p = { ...position(), trail: 0, holdEndT: 15 * M }, other = { ...position(), side: -1 as const,
    stop: 102, target: 95, trail: 0 };
  const book = new TickMathBook([p, other], Float64Array.of(1, 1), .0015, 1, false);
  book.advance({ "CLOCK-USDT": 100 }, M);
  assert.equal(p.stopHit, undefined);
  book.advance({ "CLOCK-USDT": 100 }, 15 * M - 1);
  assert.equal(p.stopHit, undefined, "the last price before expiry cannot trigger an early close");
  const due = book.advance({ "CLOCK-USDT": 100 }, 15 * M);
  assert.equal(p.stopHit, 15 * M); assert.equal(p.hitPx, 100);
  assert.equal(p.hitReason, "time"); assert.equal(other.stopHit, undefined, "legacy expiry cannot be inferred");
  assert.equal(Object.values(due.hits ?? {})[0]?.reason, "time");
  assert.equal(book.advance({ "CLOCK-USDT": 100 }, 16 * M).hits, null, "no duplicate close on a later tick");
});

test("expiry without a valid quote stays unresolved and later closes at observed time, never a fabricated earlier price", () => {
  const p = { ...position(), trail: 0, holdEndT: 15 * M };
  const book = new TickMathBook([p], Float64Array.of(1), .0015, 1, false);
  book.advance({}, 16 * M); assert.equal(p.stopHit, undefined);
  book.advance({ "CLOCK-USDT": 0 }, 16 * M); assert.equal(p.stopHit, undefined);
  book.advance({ "CLOCK-USDT": 100.1 }, 17 * M);
  assert.equal(p.stopHit, 17 * M); assert.equal(p.hitPx, 100.1); assert.equal(p.hitReason, "time");
});

test("a captured deadline cannot overwrite an already observed TP/SL instruction", () => {
  for (const px of [98, 105]) {
    const p = { ...position(), trail: 0, holdEndT: 15 * M };
    const book = new TickMathBook([p], Float64Array.of(1), .0015, 1, false);
    book.advance({ "CLOCK-USDT": px }, M);
    assert.equal(p.stopHit, M); assert.equal(p.hitPx, px);
    book.advance({ "CLOCK-USDT": 100 }, 15 * M);
    assert.equal(p.stopHit, M); assert.equal(p.hitPx, px); assert.equal(p.hitReason, undefined);
  }
});
