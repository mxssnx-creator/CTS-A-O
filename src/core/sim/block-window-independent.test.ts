import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BLOCK } from "../config.ts";
import { AutoBlockBook, BLOCK_SOURCES, type BlockBookEntry } from "./block.ts";

const bit = (source: (typeof BLOCK_SOURCES)[number]) => 1 << BLOCK_SOURCES.indexOf(source);
const policy = {
  ...DEFAULT_BLOCK, windowAuto: true, windowIndependent: true, window: 1, windowCandidates: [1, 2],
  windowMinSamples: 35, windowLookback: 35, maxLevel: 2, holdUntilNet: false,
  auto: { enabled: false }, sources: { config: true, symbol: true }, historySource: "accepted-orders" as const,
};
const row = (sym: string, cfg: string, r: number, masks: number[], at: number): BlockBookEntry => ({
  sym, cfg, side: 1, kind: "trend", ind: "ema@m1", type: "normal", r, entryT: at * 2, exitT: at * 2 + 1,
  accepted: true, autoRaise: 3, autoSources: masks, autoWindowVersion: 1,
});

test("automatic counts use each relation key's own attributed, bounded sample and configured minimum", () => {
  const book = new AutoBlockBook(policy, false), mask = bit("symbol") | bit("config");
  const a = row("A", "cfg-A", 1, [mask, 0], 0), b = row("B", "cfg-B", 1, [0, mask], 0);
  const as = book.keyOf("symbol", a), bs = book.keyOf("symbol", b);
  const ac = book.keyOf("config", a), bc = book.keyOf("config", b);
  for (let i = 0; i < 30; i++) {
    book.add(row("A", "cfg-A", 1, [mask, 0], i * 4));
    book.add(row("A", "cfg-A", -1, [0, mask], i * 4 + 1));
    book.add(row("B", "cfg-B", 1, [0, mask], i * 4 + 2));
    book.add(row("B", "cfg-B", -1, [mask, 0], i * 4 + 3));
  }
  assert.deepEqual(book.scoresForKey(bs).map(x => [x.n, x.pf]), [[30, null], [30, null]]);
  assert.equal(book.windowOf(bs, 2), 1, "30 rows cannot satisfy a configured 35-row minimum");
  for (let i = 0; i < 5; i++) {
    book.add(row("A", "cfg-A", 1, [mask, 0], 200 + i * 4));
    book.add(row("A", "cfg-A", -1, [0, mask], 201 + i * 4));
    book.add(row("B", "cfg-B", 1, [0, mask], 202 + i * 4));
    book.add(row("B", "cfg-B", -1, [mask, 0], 203 + i * 4));
  }
  for (const key of [as, ac]) assert.equal(book.windowOf(key, 2), 1);
  for (const key of [bs, bc]) assert.equal(book.windowOf(key, 2), 2);
  assert.equal(book.sampleCount(bc, 2), 4, "the independently chosen window applies to a config's own count");
  book.add(row("B", "cfg-B", NaN, [0, mask], 300));
  assert.equal(book.scoresForKey(bs)[1].pf, null, "unknown results remain in the exact window");
  assert.equal(book.windowOf(bs, 2), 1, "an invalid selected window falls back rather than reusing stale PF");
  assert.equal(book.windowOf(as, 2), 1, "a sibling's unknown outcome cannot change this key");
  for (let i = 0; i < 100; i++) book.add(row("B", "cfg-B", 1, [0, mask], 400 + i));
  assert.equal(book.scoresForKey(bs)[1].n, 35, "each candidate's retention is bounded to last-N");
});

test("independent scores stay exact after repeated slots, wraparound, unknown results and returned-value mutation", () => {
  const book = new AutoBlockBook({ ...policy, windowMinSamples: 30, windowLookback: 30 }, false);
  const mask = bit("symbol"), sample = row("A", "cfg-A", 0, [], 0), key = book.keyOf("symbol", sample);
  const rings = [0, 1].map(() => ({ values: [] as number[], next: 0 }));
  const pf = (xs: number[]): number | null => {
    if (xs.length < 30) return null;
    let gp = 0, gl = 0;
    for (const x of xs) {
      if (!Number.isFinite(x)) return null;
      if (x > 0) gp += x; else gl -= x;
    }
    if (!Number.isFinite(gp) || !Number.isFinite(gl) || (gp === 0 && gl === 0)) return null;
    const value = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0;
    return gl > 0 && !Number.isFinite(value) ? null : value;
  };
  for (let i = 0; i < 260; i++) {
    const value = i === 120 ? NaN : i === 165 ? Infinity : i >= 190 && i < 225 ? 1e308 : i % 30 < 20 ? .01 : -.02;
    const masks = [mask, i % 3 ? mask : 0];
    book.add(row("A", "cfg-A", value, masks, i));
    for (let j = 0; j < rings.length; j++) if (masks[j]) {
      const ring = rings[j];
      if (ring.values.length < 30) ring.values.push(value);
      else { ring.values[ring.next] = value; ring.next = (ring.next + 1) % 30; }
    }
    const expected = rings.map((ring, j) => ({ window: j + 1, n: ring.values.length, pf: pf(ring.values) }));
    const scores = book.scoresForKey(key);
    assert.deepEqual(scores, expected, `score mismatch after close ${i}`);
    scores[0].pf = -99;
    assert.deepEqual(book.scoresForKey(key), expected, "caller-owned result cannot mutate a stored score");
  }
});

test("the explicitly shared policy also honors a configured minimum above 30", () => {
  const book = new AutoBlockBook({ ...policy, windowIndependent: false, windowCandidates: [1] }, false);
  for (let i = 0; i < 34; i++) book.add(row("A", "cfg-A", 1, [bit("symbol")], i));
  assert.equal(book.scores()[0].n, 34);
  assert.equal(book.scores()[0].pf, null);
  book.add(row("A", "cfg-A", 1, [bit("symbol")], 34));
  assert.equal(book.scores()[0].pf, Infinity);
});

test("flat samples have unavailable PF in both independent and shared selection", () => {
  for (const windowIndependent of [false, true]) {
    const book = new AutoBlockBook({ ...policy, windowIndependent, windowCandidates: [1], windowMinSamples: 30 }, false);
    for (let i = 0; i < 30; i++) book.add(row("A", "cfg-A", 0, [bit("symbol")], i));
    const key = book.keyOf("symbol", row("A", "cfg-A", 0, [], 50));
    assert.equal((windowIndependent ? book.scoresForKey(key) : book.scores())[0].pf, null);
  }
});

test("candidate source masks are frozen at entry and cannot borrow a later close", () => {
  const book = new AutoBlockBook({ ...policy, window: 1, windowCandidates: [1], windowMinSamples: 30,
    windowLookback: 30, maxLevel: 1, sources: { config: false, symbol: true } }, false);
  const first = row("A", "cfg-A", 1, [], 1);
  delete first.autoRaise; delete first.autoSources;
  book.stampEntry(first); book.add(first);
  const opened = row("A", "cfg-A", 1, [], 2);
  opened.exitT = 20;
  delete opened.autoRaise; delete opened.autoSources;
  book.stampEntry(opened);
  assert.ok((opened.autoSources?.[0] ?? 0) & bit("symbol"));
  const later = row("A", "cfg-A", -1, [], 3);
  delete later.autoRaise; delete later.autoSources;
  book.stampEntry(later); book.add(later);
  book.add(opened);
  assert.equal(book.scoresForKey(book.keyOf("symbol", opened))[0].n, 2,
    "the entry keeps its stamped hypothetical source after a later close changes the level");
});

test("a legacy stamped close without source masks is not borrowed as independent evidence", () => {
  const book = new AutoBlockBook(policy, false);
  const old = row("A", "cfg-A", 1, [bit("symbol"), bit("symbol")], 1);
  delete old.autoWindowVersion;
  book.add(old);
  assert.equal(book.scoresForKey(book.keyOf("symbol", old))[0].n, 0);
});

test("per-count Auto records the packed entry-time level after intervening closes and JSON replay", () => {
  const cfg = { ...policy, window: 1, windowCandidates: [1, 2], maxLevel: 2,
    auto: { enabled: true, n: 3, min: 2, pf: 1.1, scope: "key" as const }, sources: { config: false, symbol: true } };
  const book = new AutoBlockBook(cfg, false);
  const first = row("A", "cfg-A", 1, [], 1);
  first.entryT = 1; first.exitT = 2;
  book.stampEntry(first); book.add(first);
  const open = row("A", "cfg-A", -1, [], 2);
  open.entryT = 3; open.exitT = 9;
  book.stampEntry(open);
  const sibling = row("A", "cfg-A", 1, [], 3);
  sibling.entryT = 4; sibling.exitT = 5;
  book.stampEntry(sibling); book.add(sibling);
  book.add(JSON.parse(JSON.stringify(open)));
  const key = book.keyOf("symbol", open);
  assert.equal(book.auto!.verdict("symbol", key, 1).n, 2);
  assert.equal(book.auto!.verdict("symbol", key, 2).n, 0, "the later sibling cannot change the open order's entry level");
});

test("the eighth source's entry-time level survives unsigned 32-bit serialization", () => {
  const cfg = { ...policy, window: 1, windowCandidates: [1], maxLevel: 12,
    auto: { enabled: true, n: 30, min: 30, pf: 1.1, scope: "key" as const }, sources: { config: false, range: true } };
  const book = new AutoBlockBook(cfg, false);
  for (let i = 0; i < 10; i++) {
    const item = row("A", "cfg-A", 1, [], i);
    book.stampEntry(item); book.add(item);
  }
  const open = row("A", "cfg-A", 1, [], 20);
  book.stampEntry(open);
  const roundTrip = JSON.parse(JSON.stringify(open));
  assert.equal((roundTrip.autoLevels >>> 28) & 15, 10);
  book.add(roundTrip);
  assert.equal(book.auto!.verdict("range", book.keyOf("range", open), 10).n, 1);
});

test("types and ranges excluded from Block do not score hypothetical source raises", () => {
  const book = new AutoBlockBook({ ...policy, windowCandidates: [1], excludeKinds: ["axis"],
    excludeRanges: ["wide"], sources: { config: false, symbol: true } }, false);
  const warm = row("A", "follow|ema@m1|tp1|sl1|tr0|h4|mc", 1, [], 1);
  book.stampEntry(warm); book.add(warm);
  const axis = { ...warm, type: "axis" };
  book.stampEntry(axis);
  assert.equal(axis.autoRaise, 0);
  const wide = { ...warm, type: "normal", cfg: "follow|ema@m1|tp1|sl1|tr0|h4" };
  book.stampEntry(wide);
  assert.equal(wide.autoRaise, 0);
});

test("independent count choices and per-count Auto reconstruct exactly from the accepted stamped feed", () => {
  const cfg = { ...policy, windowMinSamples: 30, windowLookback: 40, windowCandidates: [1, 2],
    auto: { enabled: true, n: 30, min: 30, pf: 1.1, scope: "key" as const },
    sources: { config: true, symbol: true, overall: true } };
  const actual = new AutoBlockBook(cfg, false), replay = new AutoBlockBook(cfg, false);
  const feed: BlockBookEntry[] = [];
  for (let i = 0; i < 160; i++) {
    const item = row(i % 2 ? "A" : "B", i % 2 ? "cfg-A" : "cfg-B", i % 5 ? .01 : -.02, [], i);
    actual.stampEntry(item); actual.add(item);
    feed.push(JSON.parse(JSON.stringify(item)));
  }
  for (const item of feed) replay.add(item);
  for (const item of [feed[0], feed[1]]) for (const source of ["config", "symbol", "overall"] as const) {
    const key = actual.keyOf(source, item);
    assert.deepEqual(replay.scoresForKey(key), actual.scoresForKey(key));
    assert.equal(replay.windowOf(key, 2), actual.windowOf(key, 2));
    assert.equal(replay.level(key, 2), actual.level(key, 2));
    for (const count of [1, 2]) assert.deepEqual(replay.auto!.verdict(source, key, count), actual.auto!.verdict(source, key, count));
  }
});

test("actual entry stamps can select different counts for two symbols without cross-contamination", () => {
  const cfg = { ...policy, windowMinSamples: 30, windowLookback: 300, windowCandidates: [1, 2], maxLevel: 1,
    minActiveLevel: 1, ratio: .5, steps: 0, sources: { config: false, symbol: true } };
  const book = new AutoBlockBook(cfg, false);
  for (let i = 0; i < 400; i++) {
    const a = row("A", "cfg-A", Math.floor(i / 10) % 2 === 0 ? .01 : -.01, [], i * 2);
    const b = row("B", "cfg-B", i % 2 === 0 ? .03 : -.01, [], i * 2 + 1);
    book.stampEntry(a); book.add(a);
    book.stampEntry(b); book.add(b);
  }
  const a = row("A", "cfg-A", 0, [], 1000), b = row("B", "cfg-B", 0, [], 1001);
  assert.equal(book.windowOf(book.keyOf("symbol", a), 1), 1);
  assert.equal(book.windowOf(book.keyOf("symbol", b), 1), 2);
  assert.ok(book.scoresForKey(book.keyOf("symbol", a)).every(x => x.n >= 30));
  assert.ok(book.scoresForKey(book.keyOf("symbol", b)).every(x => x.n >= 30));
});
