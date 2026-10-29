import assert from "node:assert/strict";
import { test } from "node:test";
import { StageWindowIndex } from "./stage-window-index.ts";
import { stageWindow, type StageObservation } from "./stage-policy.ts";

const observation = (i: number, unitReturn: number | null, delay = 0): StageObservation =>
  ({ orderId: `o-${i}`, entryT: 3 * i, exitT: 3 * i + 1, knownT: 3 * i + 1 + delay, unitReturn });
function same(rows: StageObservation[], indices: number[], ns: number[], decisionSeq?: number) {
  const index = new StageWindowIndex(rows);
  for (const t of indices) for (const n of ns) for (const minPf of [1.1, 1.5]) {
    const a = index.window(n, minPf, t, decisionSeq), { rows: _rows, ...b } = stageWindow(rows, n, minPf, t, decisionSeq);
    assert.equal(a.state, b.state); assert.equal(a.n, b.n);
    for (const k of ["gp", "gl", "pf", "mean"] as const) {
      if (b[k] === null) assert.equal(a[k], null);
      else assert.ok(a[k] !== null && Math.abs(a[k]! - b[k]!) <= 2e-12 * Math.max(1, Math.abs(b[k]!)), `${k} at${t}/N${n}`);
    }
  }
}

test("indexed windows match scalar own-set decisions across boundaries, signs and unknown/late results", () => {
  const rs = Array.from({ length: 160 }, (_, i) => observation(i, i % 19 === 0 ? null : ((i * 31) % 21 - 9) / 1000));
  same(rs, Array.from({ length: 490 }, (_, i) => i), [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50]);
  same(rs.map((r, i) => ({ ...r, knownT: r.knownT + (i % 7 === 0 ? 75 : 0) })), [50, 100, 250, 400, 500, 600], [1, 5, 15, 50]);
});

test("indexed event-order windows match scalar decisions before, during and after late observations", () => {
  const rows = Array.from({ length: 120 }, (_, i) => ({ ...observation(i,
    i % 17 === 0 ? null : ((i * 17) % 23 - 10) / 1000, i % 11 === 0 ? 17 : 0),
    knownSeq: i % 13 === 0 ? undefined : (i * 7) % 19 }));
  // Reuse an index across different sequences at the same timestamp too: a time-only cache must not leak a pass.
  for (const seq of [0, 1, 5, 10, 20, 100]) same(rows,
    Array.from({ length: 380 }, (_, i) => i), [1, 2, 3, 5, 15, 25, 50], seq);
  const index = new StageWindowIndex(rows);
  for (const t of [4, 20, 100, 200, 358]) for (const seq of [100, 0, 10, 1, 20]) {
    assert.equal(index.window(5, 1.1, t, seq).state, stageWindow(rows, 5, 1.1, t, seq).state);
  }
});

test("large expired gains and near-floor/tiny tails cannot change a gate through prefix cancellation", () => {
  for (const tail of [[.0011, -.001], [.0011 - 1e-15, -.001], [.0011 + 1e-15, -.001],
    [1e-20, -1e-21], [0, 0], [.01, .01], [-.01, -.01]]) {
    const source = [...Array.from({ length: 50 }, (_, i) => observation(i, 1e100)),
      ...tail.map((r, i) => observation(50 + i, r))];
    same(source, [154, 155, 156, 160], [1, 2, 3, 50]);
  }
});

test("index ownership is immutable and malformed/duplicated evidence cannot create a passing window", () => {
  const rows = [observation(0, .01), observation(1, -.001)], index = new StageWindowIndex(rows);
  rows[1].unitReturn = -10;
  assert.equal(index.window(2, 1.1, 7).state, "qualified");
  assert.throws(() => { (index.window(2, 1.1, 7) as { pf: number }).pf = 100; });
  assert.equal(new StageWindowIndex([observation(0, .01), observation(0, .01)]).window(2, 1.1, 7).state, "unknown");
  assert.equal(new StageWindowIndex([{ ...observation(0, .01), exitT: NaN }]).window(1, 1.1, 7).state, "unknown");
});
