import assert from "node:assert/strict";
import { test } from "node:test";
import type { Trade } from "../domain/types.ts";
import { runBlocks, runSubset } from "./walkforward.ts";
import { liveReadiness } from "../server/live.server.ts";

const H = 3_600_000;
const START = Date.UTC(2026, 9, 14);
const close = (r: number, exitT: number, mult = 1): Trade => ({
  cfg: "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32",
  sym: "AAA-USDT",
  side: 1,
  entryT: exitT - 60_000,
  exitT,
  entry: 100,
  exit: 100 * (1 + r),
  r: r * mult,
  mult,
  reason: r > 0 ? "tp" : "sl",
  bars: 1,
  mfe: 0,
  mae: 0,
  kind: "normal",
});

test("a terminal settled loss cannot disappear from stability and qualify a losing final block", () => {
  const endT = START + 16 * H;
  const trades = [
    close(0.1, START + H, 2),
    close(0.1, START + 2 * H),
    close(0.1, START + 3 * H),
    close(-0.01, START + 9 * H),
    close(-0.01, START + 10 * H),
    close(-0.1, endT, 4),
  ];
  const run = { startT: START, endT, trades, openAtEnd: [] };
  const result = runSubset(run, () => true, 1.1);
  assert.ok(
    Math.abs(result.stats.pf - 2.5) < 1e-12,
    "overall unit PF remains positive despite execution weights",
  );
  assert.ok(result.stats.net > 0);
  assert.deepEqual(
    runBlocks(trades, START, endT).map(({ n, pf }) => ({ n, pf })),
    [
      { n: 3, pf: 4 },
      { n: 3, pf: 0 },
    ],
  );
  assert.equal(
    result.stable,
    false,
    "the final block has three losses, including the terminal close",
  );
  const staleSummary = { ...run, stats: result.stats, stable: true };
  const readiness = liveReadiness(staleSummary, {}, 1.1);
  assert.equal(readiness.ok, false);
  assert.match(readiness.why, /not stable/);
});

test("consecutive and partial blocks count each (start, end] close once and exclude later history", () => {
  const endT = START + 12 * H;
  const trades = [
    close(-1, START),
    close(0.01, START + 8 * H - 1),
    close(-0.01, START + 8 * H),
    close(0.01, START + 8 * H + 1),
    close(-0.01, endT),
    close(-1, endT + 1),
  ];
  const blocks = runBlocks(trades, START, endT);
  assert.deepEqual(
    blocks.map(({ t, n, pf }) => ({ t, n, pf })),
    [
      { t: START, n: 2, pf: 1 },
      { t: START + 8 * H, n: 2, pf: 1 },
    ],
  );
  assert.equal(
    blocks.reduce((sum, block) => sum + block.n, 0),
    4,
  );
});

test("invalid block widths fail explicitly rather than hanging or manufacturing empty stability evidence", () => {
  for (const width of [0, -1, NaN, Infinity])
    assert.throws(() => runBlocks([], START, START + H, width), RangeError);
  assert.deepEqual(runBlocks([], START, START), []);
});
