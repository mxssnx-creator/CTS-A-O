import assert from "node:assert/strict";
import { test } from "node:test";
import { EvalMemo, type ConfigTape } from "./walkforward.ts";

const finish = (g: Generator<number, void>) => { while (!g.next().done) {} };

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
    for (const at of [4, 5, 6, 9, 9, 12, 18, 25, 26, 30]) {
      assert.equal(memo.advance(at), true);
      const expected = tapes.filter((tp) => [...tp.exitT].some((t) => t >= before && t < at && t < 26));
      assert.deepEqual(new Set(memo.dirty), new Set(expected), `trial ${trial}, ${before} to ${at}`);
      memo.dirty.clear();
      before = at;
    }
    assert.equal(memo.advance(29), false, "a backward clock cannot consume or invent events");
  }
});
