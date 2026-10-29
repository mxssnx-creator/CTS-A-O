import assert from "node:assert/strict";
import { test } from "node:test";
import type { Trade } from "../domain/types.ts";
import { lastNOk, lastNSideOk, makeTape } from "./walkforward.ts";

const M = 60_000, START = Date.UTC(2026, 9, 6, 12);
const rows: Trade[] = Array.from({ length: 160 }, (_, i) => ({
  cfg: "own", sym: i % 3 ? "A" : "B", side: i % 2 ? -1 : 1,
  entryT: START + i * 15 * M, exitT: START + (i + 1) * 15 * M,
  entry: 100, exit: 100, r: i % 7 < 4 ? .004 : -.006, mult: 1,
  reason: "time", bars: 1, mfe: 0, mae: 0,
}));
const tape = (id: string, xs: Trade[]) => makeTape(id, "follow", "ema-9-21@m1",
  { tp: .01, sl: .01, trail: 0, hold: 15, tag: "mc" }, "normal", ["A", "B"], xs, [], []);

test("bounded Last-N and own-side decisions match an independent scalar across requested small and large windows", () => {
  const tp = tape("own", rows);
  let checks = 0, passes = 0;
  for (const n of [1, 2, 3, 5, 8, 9, 10, 12, 15, 20, 25, 30, 35, 40, 50, 75])
    for (const minPf of [1.05, 1.08, 1.12, 1.25, 1.5])
      for (const at of [START + M, ...rows.filter((_, i) => i % 7 === 0).flatMap(x => [x.exitT - 1, x.exitT])])
        for (const side of [0, 1, -1]) {
          const closed = rows.filter(x => x.exitT <= at && (!side || x.side === side)).slice(-n);
          const gp = closed.reduce((s, x) => s + Math.max(0, x.r), 0), gl = closed.reduce((s, x) => s + Math.max(0, -x.r), 0);
          const expected = closed.length === n && gp > gl && gp >= minPf * gl;
          const actual = side ? lastNSideOk(tp, side, at, n, minPf) : lastNOk(tp, at, n, minPf);
          assert.equal(actual, expected, `Last-${n}, PF ${minPf}, side ${side}, clock ${at}`);
          checks++; if (actual) passes++;
        }
  assert.ok(checks > 10_000 && passes > 0 && passes < checks);
  assert.ok(rows.at(-1)!.exitT - START <= 72 * 60 * M, "the whole fixture is at most72h");
});

test("a winning sibling or future close cannot repair the own config's failing recent window", () => {
  const losing = tape("losing", rows.map(x => ({ ...x, cfg: "losing", r: -.01 })));
  const winning = tape("winning", rows.map(x => ({ ...x, cfg: "winning", r: .02 })));
  const at = rows[79].exitT;
  for (const n of [5, 10, 12, 15, 20, 25, 30, 35]) {
    assert.equal(lastNOk(losing, at, n, 1.1), false);
    assert.equal(lastNOk(winning, at, n, 1.1), true);
  }
  assert.equal(lastNOk(winning, rows[8].exitT - 1, 9, 1.1), false, "nine closes cannot be borrowed from the future");
  assert.equal(lastNOk(winning, rows[8].exitT, 9, 1.1), true, "the documented completed-at-entry clock is retained");
});
