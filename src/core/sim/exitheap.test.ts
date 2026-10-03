// The walk-forward's open orders and pending candidates: a heap by (exit, insertion order) pops exactly as the
// sorted arrays did (a stable insertion sort by exit, shifted from the front), and the caps' counters answer as the
// scans over every open order did — so the simulated trades stay identical at O(log n) / O(1) per candidate.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ExitHeap,
  OpenCounts,
  inTapeLayout,
  makeTape,
  packArena,
  packTapes,
  positionsFull,
  sigCfg,
  unpackTapes,
  type ConfigTape,
} from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";

/** deterministic pseudo-random numbers */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("walk-forward open book", () => {
  it("the heap pops in the order of a stable insertion sort by exit (ties first in, first out)", () => {
    for (const seed of [1, 2, 3, 42]) {
      const r = rng(seed);
      const heap = new ExitHeap<number>();
      const sorted: Array<{ t: number; v: number }> = [];
      const popped: number[] = [];
      const expected: number[] = [];
      let v = 0;
      let clock = 0;
      for (let step = 0; step < 3000; step++) {
        // a batch of inserts with coarse exit times (many ties), then everything up to the clock is settled
        for (let k = Math.floor(r() * 6); k > 0; k--) {
          const t = clock + Math.floor(r() * 20);
          heap.push(t, v);
          // the former array: insertion from the end, after the entries with the same exit
          let j = sorted.length;
          sorted.push({ t, v });
          while (j > 0 && sorted[j - 1].t > t) {
            sorted[j] = sorted[j - 1];
            j--;
          }
          sorted[j] = { t, v };
          v++;
        }
        clock += Math.floor(r() * 4);
        while (heap.size && heap.peekT() <= clock) popped.push(heap.pop()!);
        while (sorted.length && sorted[0].t <= clock) expected.push(sorted.shift()!.v);
      }
      while (heap.size) popped.push(heap.pop()!);
      while (sorted.length) expected.push(sorted.shift()!.v);
      assert.deepEqual(popped, expected, `seed ${seed}`);
    }
  });

  it("the counters answer as the scans over every open order did", () => {
    const r = rng(7);
    const syms = ["A", "B", "C", "D"];
    const cfgs = ["follow|rsi-14@m5|tp1", "pulse|ema-20@m1|tp2", "follow|sig-rel@m15|tp1", "pulse|sig-vol@m5|tp2"];
    assert.deepEqual(cfgs.map(sigCfg), [false, false, true, true], "both classes are exercised");
    const open: Array<{ cfg: string; sym: string; side: number }> = [];
    const counts = new OpenCounts();
    for (let step = 0; step < 4000; step++) {
      if (open.length && r() < 0.45) {
        const x = open.splice(Math.floor(r() * open.length), 1)[0];
        counts.add(x, -1);
      } else {
        const x = {
          cfg: cfgs[Math.floor(r() * cfgs.length)],
          sym: syms[Math.floor(r() * syms.length)],
          side: r() < 0.5 ? 1 : -1,
        };
        open.push(x);
        counts.add(x, 1);
      }
      const q = { cfg: cfgs[Math.floor(r() * cfgs.length)], sym: syms[Math.floor(r() * syms.length)], side: r() < 0.5 ? 1 : -1 };
      const cls = sigCfg(q.cfg);
      assert.equal(counts.dupe(q.sym, q.cfg), open.some((x) => x.sym === q.sym && x.cfg === q.cfg));
      assert.equal(
        counts.perSymbol(q.sym, cls),
        open.reduce((a, x) => a + (x.sym === q.sym && sigCfg(x.cfg) === cls ? 1 : 0), 0),
      );
      assert.equal(counts.open(cls), open.reduce((a, x) => a + (sigCfg(x.cfg) === cls ? 1 : 0), 0));
      assert.equal(
        counts.perSide(q.side, cls),
        open.reduce((a, x) => a + (x.side === q.side && sigCfg(x.cfg) === cls ? 1 : 0), 0),
      );
      for (const cap of [0, 1, 2, 3, 5])
        assert.equal(counts.positionsFull(q.sym, q.side, cls, cap), positionsFull(open, q.sym, q.side, cls, cap));
    }
  });

  it("a reply's tapes packed into one arena keep every column, the layout and the pack round trip", () => {
    const r = rng(11);
    const syms = ["AAA-USDT", "BBB-USDT", "CCC-USDT"];
    const mk = (k: number, n: number) =>
      makeTape(
        `follow|rsi-14@m5|tp1|sl${k}`,
        "follow",
        "rsi-14@m5",
        { tp: 0.01, sl: 0.01, trail: 0, hold: 32 },
        "normal",
        syms,
        Array.from({ length: n }, (_, i) => ({
          cfg: `c${k}`,
          sym: syms[i % 3],
          side: r() < 0.5 ? 1 : -1,
          entryT: 1e12 + i * 6e4,
          exitT: 1e12 + i * 6e4 + Math.floor(r() * 10) * 6e4,
          entry: 1 + r(),
          exit: 1 + r(),
          r: r() - 0.5,
          reason: "tp",
          bars: 1 + Math.floor(r() * 9),
          mfe: 0,
          mae: 0,
          kind: "normal",
        })) as Trade[],
        [],
        [],
      );
    // odd lengths: every tape region starts 8-byte aligned in the arena
    const tapes: ConfigTape[] = [mk(1, 7), mk(2, 0), mk(3, 133), mk(4, 1)];
    const cols = ["exitT", "entryT", "r", "entry", "exit", "symI", "side", "reason", "bars", "vol", "level", "gp", "gl", "rs", "r2"] as const;
    const before = tapes.map((t) => cols.map((k) => Array.from(t[k] as ArrayLike<number>)));
    const { arena, others } = packArena(tapes);
    assert.ok(arena);
    assert.equal(others.length, 0);
    for (const t of tapes) {
      assert.equal(t.exitT.buffer, arena, "every tape on the one arena");
      assert.equal(t.exitT.byteOffset % 8, 0);
      assert.ok(inTapeLayout(t));
    }
    assert.deepEqual(
      tapes.map((t) => cols.map((k) => Array.from(t[k] as ArrayLike<number>))),
      before,
      "the same values",
    );
    // the pack posted to workers (preset comparison) reads tapes at any offset
    const back = unpackTapes(packTapes(tapes));
    assert.deepEqual(
      back.map((t) => cols.map((k) => Array.from(t[k] as ArrayLike<number>))),
      before,
    );
  });
});
