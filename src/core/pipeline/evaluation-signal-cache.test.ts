import { test } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { evaluationSignal } from "./pipeline.ts";
import { bothSides, nextEntryIndex, simulate, splitSides } from "../sim/backtest.ts";
import type { Bars, Protect } from "../domain/types.ts";

const END = Date.UTC(2026, 9, 17, 12);
const bars = () => barsFromCandles("CACHE-USDT", 5, syntheticCandles("CACHE", 5, 600, END));
const signals = (n: number) => Int8Array.from({ length: n }, (_, i) => i % 9 === 0 ? (i % 2 ? 1 : -1) : 0);
function reference(b: Bars, sig: Int8Array, cut: number): Int8Array {
  return Int8Array.from(sig, (value, i) => (i + 1 < b.n ? b.t[i + 1] : b.t[i] + b.tfMin * 60_000) < cut ? 0 : value);
}
const protects: Protect[] = [0.003, 0.01, 0.03].map((tp) => ({ tp, sl: 1.5 * tp, trail: 0, hold: 20 }));
const trades = (b: Bars, sig: Int8Array, p: Protect) => bothSides(sig, (side) => simulate("cache-test", b, side, p, { cost: 0.002 }))
  .flatMap((result) => result.trades).sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || b.side - a.side);

test("replay clipping reuses downstream caches for the same immutable bars, raw signal and exact cut", () => {
  const b = bars(), sig = signals(b.n), original = sig.slice(), cut = b.t[200], job = { evaluationFromT: cut };
  const first = evaluationSignal(job, b, sig);
  const again = evaluationSignal(job, b, sig);
  assert.equal(again, first, "each protection cell must reuse the same clipped signal array");
  const firstSides = splitSides(first), againSides = splitSides(again);
  assert.equal(againSides, firstSides);
  for (let i = 0; i < firstSides.length; i++) assert.equal(nextEntryIndex(againSides[i]), nextEntryIndex(firstSides[i]));
  assert.deepEqual(first, reference(b, sig, cut)); assert.deepEqual(sig, original);
  assert.equal(evaluationSignal({}, b, sig), sig, "unbounded behavior keeps its original array");
});

test("cache identity separates markets, raw signals and exact cuts, including a changed boundary", () => {
  const b = bars(), sig = signals(b.n), cut = b.t[200], u = { evaluationFromT: cut };
  const first = evaluationSignal(u, b, sig);
  const otherBars = { ...b, t: Float64Array.from(b.t, (t) => t + 5 * 60_000) };
  const otherSignal = sig.slice(); otherSignal[300] = 1;
  for (const [market, raw, boundary] of [[otherBars, sig, cut], [b, otherSignal, cut], [b, sig, cut + 1]] as const) {
    u.evaluationFromT = boundary;
    const clipped = evaluationSignal(u, market, raw);
    assert.notEqual(clipped, first); assert.deepEqual(clipped, reference(market, raw, boundary));
  }
  u.evaluationFromT = b.t[300];
  const changed = evaluationSignal(u, b, sig);
  assert.notEqual(changed, first); assert.deepEqual(changed, reference(b, sig, u.evaluationFromT));
  u.evaluationFromT = cut;
  const revisited = evaluationSignal(u, b, sig);
  assert.notEqual(revisited, changed); assert.deepEqual(revisited, first);
  assert.notEqual(revisited, first, "only the latest cut is retained per immutable input");
});

test("a new Universe job observes in-place raw signal and bar-time changes without inheriting an old clip", () => {
  const b = bars(), sig = signals(b.n), cut = b.t[200], firstJob = { evaluationFromT: cut };
  const first = evaluationSignal(firstJob, b, sig), snapshot = first.slice();
  sig[300] = 1;
  for (let i = 0; i < b.n; i++) b.t[i] += 5 * 60_000;
  const nextJob = { evaluationFromT: cut };
  const next = evaluationSignal(nextJob, b, sig);
  assert.notEqual(next, first); assert.deepEqual(first, snapshot, "the earlier clip is an unchanged snapshot");
  assert.deepEqual(next, reference(b, sig, cut)); assert.notDeepEqual(next, first);
  assert.equal(evaluationSignal(nextJob, b, sig), next, "only this new immutable job reuses its clipped input");
});

test("cached clipping preserves exact trade outcomes and causality when future bars and signals are poisoned", () => {
  const b = bars(), sig = signals(b.n), cut = b.t[200], decisionT = b.t[400];
  const poisoned = { ...b, o: b.o.slice(), h: b.h.slice(), l: b.l.slice(), c: b.c.slice() }, future = sig.slice();
  const job = { evaluationFromT: cut }, poisonJob = { evaluationFromT: cut };
  for (let i = 400; i < b.n; i++) {
    for (const column of ["o", "h", "l", "c"] as const) poisoned[column][i] *= i % 2 ? 1.4 : 0.6;
    future[i] = i % 3 ? -1 : 1;
  }
  let closes = 0, changed = false;
  for (const p of protects) {
    const normal = trades(b, evaluationSignal(job, b, sig), p);
    const poison = trades(poisoned, evaluationSignal(poisonJob, poisoned, future), p);
    assert.deepEqual(normal, trades(b, reference(b, sig, cut), p));
    assert.deepEqual(poison, trades(poisoned, reference(poisoned, future, cut), p));
    const before = normal.filter((trade) => trade.exitT <= decisionT);
    closes += before.length;
    assert.deepEqual(poison.filter((trade) => trade.exitT <= decisionT), before, "future changes cannot alter already closed trades");
    changed ||= JSON.stringify(normal) !== JSON.stringify(poison);
  }
  assert.ok(closes > 0); assert.equal(changed, true, "the poisoned future must exercise different later outcomes");
});
