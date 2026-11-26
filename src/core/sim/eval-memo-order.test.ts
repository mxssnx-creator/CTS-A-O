import assert from "node:assert/strict";
import { test } from "node:test";
import { EvalMemo, type ConfigTape } from "./walkforward.ts";

const finish = (g: Generator<number, void>) => { while (!g.next().done) { /* drain yielded slices */ } };

test("the bounded close index matches a scalar chronology across ties and strict boundaries", () => {
  let seed = 13579;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let trial = 0; trial < 30; trial++) {
    const tapes = Array.from({ length: 25 }, () => {
      const xs = Array.from({ length: Math.floor(random() * 35) }, () => Math.floor(random() * 30)).sort((a, b) => a - b);
      return { exitT: Float64Array.from(xs), n: xs.length } as ConfigTape;
    });
    const memo = new EvalMemo();
    finish(memo.attach(tapes, 4, 26));
    let before = 4;
    for (const at of [4, 5, 6, 9, 9, 12, 18, 25, 26]) {
      assert.equal(memo.advance(at), true);
      const expected = tapes.filter((tp) => [...tp.exitT].some((t) => t >= before && t < at && t < 26));
      assert.deepEqual(new Set(memo.dirty), new Set(expected), `trial ${trial}, ${before} to ${at}`);
      memo.dirty.clear();
      before = at;
    }
    assert.equal(memo.advance(30), false, "a clock past the index cannot claim complete change coverage");
    assert.equal(memo.advance(25), false, "a backward clock cannot consume or invent events");
  }
});

test("minute buckets and irregular fallback both preserve the exact stable event order", () => {
  let seed = 44173;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const M = 60_000;
  for (const irregular of [false, true]) for (let trial = 0; trial < 40; trial++) {
    const tapes = Array.from({ length: 50 }, (_, tape) => {
      const xs = Array.from({ length: Math.floor(random() * 35) }, () =>
        (Math.floor(random() * 50) - 10) * M,
      );
      if (irregular && tape === 0) xs.push(7 * M + 1);
      xs.sort((a, b) => a - b);
      return { exitT: Float64Array.from(xs), n: xs.length } as ConfigTape;
    });
    const from = -3 * M + 1, to = 31 * M + 1;
    const expected = tapes.flatMap((tp, owner) => [...tp.exitT]
      .filter(t => t >= from && t < to).map(time => ({ time, owner })))
      .sort((a, b) => a.time - b.time);
    const memo = new EvalMemo();
    finish(memo.attach(tapes, from, to));
    const actual = memo as unknown as { times: Float64Array; owner: Int32Array };
    assert.deepEqual([...actual.times], expected.map(x => x.time), `${irregular} trial ${trial} times`);
    assert.deepEqual([...actual.owner], expected.map(x => x.owner), `${irregular} trial ${trial} owners`);
    for (const t of [from, -M, 0, 5 * M, 6 * M + 1, 31 * M, to]) {
      assert.equal(memo.advance(t), true);
      const expectedDirty = new Set(expected.filter(x => x.time < t).map(x => tapes[x.owner]));
      assert.deepEqual(memo.dirty, expectedDirty, `${irregular} trial ${trial} at ${t}`);
    }
  }
});

test("a large close-index advance yields, preserves strict boundaries, and recovers after cancellation", () => {
  const tapes = Array.from({ length: 3000 }, () => ({ exitT: new Float64Array(100).fill(10), n: 100 }) as ConfigTape);
  const memo = new EvalMemo();
  finish(memo.attach(tapes, 0, 20));
  assert.equal(memo.advance(10), true);
  assert.equal(memo.dirty.size, 0, "closes at the decision time are not yet evidence");
  const g = memo.advanceGen(11);
  assert.equal(g.next().done, false);
  assert.throws(() => memo.advance(11), /advance already in progress/);
  for (let i = 0; i < Math.floor(tapes.length * 100 / 2048); i++)
    assert.equal(g.next().done, false, "the scan and publishing pass both yield");
  g.return(false);
  assert.equal(memo.advance(11), true, "an interrupted scan can be retried");
  assert.deepEqual(memo.dirty, new Set(tapes));
  memo.dirty.clear();
  assert.equal(memo.advance(12), true);
  assert.equal(memo.dirty.size, 0, "completed events are not consumed twice");
});
