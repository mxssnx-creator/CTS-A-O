import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BLOCK } from "../config.ts";
import { AutoBlockBook, sourceKey } from "./block.ts";

const policy = { ...DEFAULT_BLOCK, holdUntilNet: false, window: 1, windowAuto: true,
  windowIndependent: true, windowMinSamples: 30, windowLookback: 30, windowCandidates: [1, 2],
  sources: { config: false, overall: false, symbol: true, direction: false, indication: false, type: false } };
const entry = (sym: string, r: number, i: number) => ({ sym, side: 1, kind: "trend", cfg: `cfg-${sym}`,
  type: "normal", r, accepted: true, autoRaise: 1 << i, autoSources: i === 0 ? [4, 0] : [0, 4] });

test("auto Block chooses each symbol's window using only its own 30 attributed closes", () => {
  const book = new AutoBlockBook(policy, false);
  const a = sourceKey("symbol", entry("A", 1, 0));
  const b = sourceKey("symbol", entry("B", 1, 0));
  for (let i = 0; i < 29; i++) {
    book.add(entry("A", .01, 0)); book.add(entry("A", -.01, 1));
    book.add(entry("B", -.01, 0)); book.add(entry("B", .01, 1));
  }
  assert.equal(book.windowOf(b, 1), 1, "29 results cannot change the fallback");
  book.add(entry("A", .01, 0)); book.add(entry("A", -.01, 1));
  book.add(entry("B", -.01, 0)); book.add(entry("B", .01, 1));
  assert.equal(book.windowOf(a, 1), 1);
  assert.equal(book.windowOf(b, 1), 2, "B's best count does not overwrite A's");
  assert.deepEqual(book.sourceScores(a).map(x => x.n), [30, 30]);
  assert.deepEqual(book.sourceScores(b).map(x => x.n), [30, 30]);
});

test("unstamped or rejected closes cannot create source-specific evidence", () => {
  const book = new AutoBlockBook(policy, false);
  const own = entry("A", .01, 0), key = sourceKey("symbol", own);
  for (let i = 0; i < 40; i++) {
    book.add({ ...own, autoSources: undefined });
    book.add({ ...own, accepted: false });
  }
  assert.deepEqual(book.sourceScores(key).map(x => x.n), [0, 0]);
  assert.equal(book.windowOf(key, 1), 1);
});

test("candidate source masks are captured at entry even with no pause", () => {
  const book = new AutoBlockBook({ ...policy, windowCandidates: [1], maxLevel: 1, pause: 0 }, false);
  book.add(entry("A", .01, 0));
  const next = { ...entry("A", .01, 0), autoRaise: undefined as number | undefined,
    autoSources: undefined as number[] | undefined };
  book.stampEntry(next);
  assert.deepEqual(next.autoSources, [4]);
});

test("a measured losing source stops adding volume and can recover on later attributed evidence", () => {
  const book = new AutoBlockBook(policy, false);
  const key = sourceKey("symbol", entry("A", 1, 0));
  for (let i = 0; i < 30; i++) book.add(entry("A", -.01, 0));
  // Unstamped profitable closes can update ordinary levels but cannot turn the measured losing source into a winner.
  for (let i = 0; i < 5; i++) book.add({ ...entry("A", .01, 0), autoSources: undefined });
  assert.equal(book.level(key, 1), 0);
  for (let i = 0; i < 30; i++) book.add(entry("A", .01, 1));
  assert.equal(book.windowOf(key, 1), 2);
  assert.equal(book.level(key, 1), 1);
});

test("unknown settled returns cannot turn an already measured source into a winning one", () => {
  const book = new AutoBlockBook(policy, false);
  const key = sourceKey("symbol", entry("A", 1, 0));
  for (let i = 0; i < 30; i++) book.add(entry("A", .01, 0));
  book.add(entry("A", NaN, 0));
  assert.equal(book.sourceScores(key)[0].pf, null);
  assert.equal(book.level(key, 1), 0);
});
