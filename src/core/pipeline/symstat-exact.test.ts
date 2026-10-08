// symStat counts the positive 4-hour blocks of the exits: a list in exit order is summed run by run, and any other list
// keeps the map. The reference below is the original map-only function; the two must agree on every field.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { symStat } from "./pipeline.ts";
import { statsOf } from "../metrics/stats.ts";
import type { Trade } from "../domain/types.ts";

function symStatReference(trades: readonly Trade[], nowT?: number) {
  const st = statsOf(trades);
  let cum = 0;
  let peak = 0;
  let dd = 0;
  const blocks = new Map<number, number>();
  for (const x of trades) {
    cum += x.r * 100;
    if (cum > peak) peak = cum;
    if (peak - cum > dd) dd = peak - cum;
    const b = Math.floor(x.exitT / (4 * 3_600_000));
    blocks.set(b, (blocks.get(b) ?? 0) + x.r);
  }
  let ok = 0;
  for (const v of blocks.values()) if (v > 0) ok++;
  let recentN = 0;
  let recentNet = 0;
  if (nowT !== undefined)
    for (const x of trades)
      if (x.exitT > nowT - 24 * 3_600_000) {
        recentN++;
        recentNet += x.r * 100;
      }
  return {
    n: st.n,
    net: st.net,
    pf: st.pf,
    dd,
    okShare: blocks.size ? ok / blocks.size : 0,
    recentN,
    recentNet,
  };
}

function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

/** trades with exits spread over ~3 days, some sharing a block, some losing */
function randomTrades(seed: number, n: number): Trade[] {
  const r = rng(seed);
  const out: Trade[] = [];
  let t = Date.UTC(2026, 8, 1);
  for (let i = 0; i < n; i++) {
    t += Math.floor(r() * 3 * 3_600_000);
    const hold = Math.floor(r() * 2 * 3_600_000);
    const rr = (r() - 0.45) * 0.02;
    out.push({
      cfg: "c",
      sym: "S",
      side: r() < 0.5 ? 1 : -1,
      entryT: t - hold,
      exitT: t,
      entry: 1,
      exit: 1,
      r: rr,
      reason: "tp",
      bars: 1,
      mfe: 0,
      mae: 0,
    } as Trade);
  }
  return out;
}

describe("symStat: the positive-block share equals the map reference", () => {
  const sorted = randomTrades(4, 400);
  const byExit = [...sorted].sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  const shuffled = [...byExit].reverse();
  const cases: Array<[string, Trade[]]> = [
    ["in exit order", byExit],
    ["out of order", shuffled],
    ["one block", byExit.slice(0, 3).map((x) => ({ ...x, exitT: byExit[0].exitT }))],
    ["empty", []],
    ["one trade", byExit.slice(0, 1)],
  ];
  for (const [name, xs] of cases)
    it(name, () => {
      const now = byExit[byExit.length - 1]?.exitT ?? 0;
      assert.deepEqual(symStat(xs, now), symStatReference(xs, now));
      assert.deepEqual(symStat(xs), symStatReference(xs));
    });
});
