import assert from "node:assert/strict";
import { test } from "node:test";
import { configId } from "../pipeline/pipeline.ts";
import { fakeRt } from "../test-support.ts";
import { CoreRuntime } from "./runtime.server.ts";

test("compact coordination intervals retain exact ordering and Signal confirmation boundaries", () => {
  const { rt } = fakeRt();
  Object.setPrototypeOf(rt, CoreRuntime.prototype);
  const x = rt as unknown as {
    sim: unknown; coordCache: unknown; realtimeLearning: unknown;
    coordOf(sim: unknown): { engineIv: Map<string, { e: Float64Array; mx: Float64Array }> };
    confirmPoolOf(iv: Map<string, { e: Float64Array; mx: Float64Array }>, open: () => Map<string, number>, positions: unknown[]):
      { confirms(sym: string, side: number, t: number): boolean };
  };
  const protect = { tp: .01, sl: .01, trail: 0, hold: 4 };
  const normal = configId("follow", "ema-9-21@m15", protect);
  const signal = configId("follow", "sig-ema-cross-s@m15", protect);
  const exit = configId("exit", "ema-9-21@m15", { ...protect, exitType: "historic", exitSet: "static-sl", exitSide: 1 });
  const feed = Array.from({ length: 8000 }, (_, i) => ({
    cfg: i % 19 === 0 ? signal : i % 23 === 0 ? exit : normal,
    sym: i % 2 ? "A" : "B", side: i % 3 ? 1 : -1, entryT: Math.floor((i * 97) % 1200 / 3),
    exitT: Math.floor((i * 97) % 1200 / 3) + (i % 17), r: .01,
  }));
  const sim = { trades: [], feed };
  Object.assign(x, { sim, coordCache: null, realtimeLearning: null });
  try {
    const actual = x.coordOf(sim);
    const expected = new Map<string, Array<[number, number]>>();
    for (const f of feed) {
      if (f.cfg !== normal) continue;
      const key = `${f.sym}|${f.side}`;
      const rows = expected.get(key) ?? [];
      rows.push([f.entryT, f.exitT]);
      expected.set(key, rows);
    }
    assert.equal(actual.engineIv.size, expected.size);
    for (const [key, rows] of expected) {
      rows.sort((a, b) => a[0] - b[0]);
      let max = -Infinity;
      const e = rows.map(row => row[0]);
      const mx = rows.map(row => max = Math.max(max, row[1]));
      assert.deepEqual(Array.from(actual.engineIv.get(key)!.e), e);
      assert.deepEqual(Array.from(actual.engineIv.get(key)!.mx), mx);
    }
    const pool = x.confirmPoolOf(actual.engineIv, () => new Map(), []);
    for (const sym of ["A", "B", "C"]) for (const side of [1, -1]) for (let t = 0; t < 430; t++)
      assert.equal(pool.confirms(sym, side, t), feed.some(f => f.cfg === normal && f.sym === sym &&
        f.side === side && f.entryT <= t && f.exitT > t), `${sym}|${side}|${t}`);
    assert.equal(x.coordOf(sim), actual, "the same published cohort reuses its completed index");
  } finally { rt.db.db.close(); }
});
