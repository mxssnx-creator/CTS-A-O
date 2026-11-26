import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BLOCK } from "../config.ts";
import { BlockAutoEval, blockBookOf, type BlockBookEntry } from "./block.ts";

test("Block Auto requires 30 samples for each independent config and block count by default", () => {
  assert.deepEqual(DEFAULT_BLOCK.auto, { enabled: true, n: 30, min: 30, pf: 1.1, scope: "key" });
  const a = new BlockAutoEval(DEFAULT_BLOCK.auto!, 8);
  for (let i = 0; i < 29; i++) {
    a.record("config", "c:A", 1, -.01);
    a.record("config", "c:B", 1, .01);
    a.record("config", "c:A", 2, .01);
  }
  assert.equal(a.verdict("config", "c:A", 1).raise, null);
  a.record("config", "c:A", 1, -.01);
  a.record("config", "c:B", 1, .01);
  assert.equal(a.verdict("config", "c:A", 1).raise, false);
  assert.equal(a.verdict("config", "c:B", 1).raise, true);
  assert.equal(a.verdict("config", "c:A", 2).raise, null);
});

test("an accepted close with unknown unit return remains in its actual Block Auto window", () => {
  const book = blockBookOf({ ...DEFAULT_BLOCK, maxLevel: 1, historySource: "accepted-orders",
    auto: { enabled: true, n: 3, min: 2, pf: 1.1, scope: "key" } });
  const close = (i: number, r: number): BlockBookEntry => ({ cfg: "follow|test|tp1", sym: "A", side: 1,
    kind: "trend", type: "normal", entryT: i * 2 + 1, exitT: i * 2 + 2, r, accepted: true });
  book.add(close(0, .01));
  book.add(close(1, .01));
  book.add(close(2, .01));
  const key = book.keyOf("config", close(2, .01));
  assert.equal(book.auto!.verdict("config", key, 1).raise, true);
  book.add(close(3, NaN));
  const verdict = book.auto!.verdict("config", key, 1);
  assert.equal(verdict.n, 3, "unknown close must occupy the newest chronological window");
  assert.equal(verdict.state, "unknown");
  assert.equal(verdict.pf, null);
  assert.equal(verdict.raise, false);
});

test("automatic count evaluation learns accepted closes even when recovery holding is disabled", () => {
  const book = blockBookOf({ ...DEFAULT_BLOCK, maxLevel: 1, historySource: "accepted-orders",
    windowAuto: true, window: 1, windowCandidates: [1, 2], holdUntilNet: false,
    auto: { enabled: true, n: 3, min: 2, pf: 1.1, scope: "key" } });
  const close = (i: number, r: number): BlockBookEntry => ({ cfg: "follow|test|tp1", sym: "A", side: 1,
    kind: "trend", type: "normal", entryT: i * 2 + 1, exitT: i * 2 + 2, r, accepted: true });
  book.add(close(0, .01)); book.add(close(1, .01)); book.add(close(2, .01));
  const key = book.keyOf("config", close(2, .01));
  assert.equal(book.auto!.verdict("config", key, 1).n, 2);
  assert.equal(book.auto!.verdict("config", key, 1).raise, true);
});

test("unknown and overflowing Block Auto returns never become a winning no-loss PF", () => {
  const a = new BlockAutoEval({ enabled: true, n: 3, min: 2, pf: 1.1, scope: "key" }, 8);
  a.record("config", "c:A", 1, 1);
  a.record("config", "c:A", 1, Number.NaN);
  assert.equal(a.verdict("config", "c:A", 1).pf, null);
  assert.equal(a.verdict("config", "c:A", 1).raise, false);
  assert.equal(a.verdict("config", "c:A", 1).state, "unknown");
  assert.equal(a.table()[0].pf, null);
  for (let i = 0; i < 3; i++) a.record("config", "c:A", 1, 1);
  assert.equal(a.verdict("config", "c:A", 1).raise, true, "the window can recover after the unknown close expires");
  a.record("config", "c:B", 1, Number.MAX_VALUE);
  a.record("config", "c:B", 1, Number.MAX_VALUE);
  assert.equal(a.verdict("config", "c:B", 1).pf, null);
  assert.equal(a.verdict("config", "c:B", 1).raise, false);
  assert.equal(a.verdict("config", "c:B", 1).state, "overflow");
  a.record("config", "c:C", 1, 1);
  a.record("config", "c:C", 1, -Number.MIN_VALUE);
  assert.equal(a.verdict("config", "c:C", 1).state, "overflow", "a ratio overflow is not a no-loss result");
  assert.equal(a.verdict("config", "c:C", 1).raise, false);
  assert.equal(a.verdict("config", "c:empty", 1).state, "empty");
  a.record("config", "c:flat", 1, 0);
  a.record("config", "c:flat", 1, 0);
  assert.equal(a.verdict("config", "c:flat", 1).state, "flat");
  assert.equal(a.verdict("config", "c:flat", 1).pf, null);
  assert.equal(a.verdict("config", "c:flat", 1).raise, false);
});
