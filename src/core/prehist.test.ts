// Pre-historic stats: the most orders open at once, from natively sorted entries and exits merged (closes first at
// the same instant), equals the count over one event list sorted by time then close before open.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prehistStats } from "./prehist.ts";
import type { Trade } from "./domain/types.ts";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** the former computation: every entry and exit as an event, sorted by time, then close (−1) before open (+1) */
function maxOpenByEvents(trades: readonly Trade[]): number {
  const ev: Array<[number, number]> = [];
  for (const t of trades) ev.push([t.entryT, 1], [t.exitT, -1]);
  ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let cur = 0;
  let max = 0;
  for (const [, d] of ev) {
    cur += d;
    if (cur > max) max = cur;
  }
  return max;
}

describe("pre-historic stats", () => {
  it("reports unit PF independently of external execution weights and labels unknown basis", () => {
    const rows = [
      { cfg: "a", sym: "A-USDT", side: 1, r: 0.016, mult: 2, entryT: 1000, exitT: 2000 },
      { cfg: "a", sym: "A-USDT", side: 1, r: -0.01, mult: 1, entryT: 3000, exitT: 4000 },
    ] as Trade[];
    const result = prehistStats(rows, 0, 5000);
    assert.equal(result.pf, 0.8); assert.equal(result.perSymbol[0].pf, 0.8);
    assert.equal(result.pfBasis, "unit-net-returns");
    const unknown = prehistStats([...rows, { ...rows[1], r: -1, unitR: null } as Trade], 0, 5000);
    assert.equal(unknown.pfBasis, "unavailable"); assert.equal(unknown.unknownReturns, 1);
    assert.equal(unknown.perSymbol[0].pfBasis, "unavailable");
  });
  it("the most orders open at once matches the event count (ties: a close before an open)", () => {
    for (const seed of [1, 5, 9, 77]) {
      const r = rng(seed);
      const trades: Trade[] = [];
      for (let i = 0; i < 2000; i++) {
        // coarse minutes: many entries and exits at the same instant, some closing in the minute they opened
        const entryT = Math.floor(r() * 600) * 60_000;
        const exitT = entryT + Math.floor(r() * 30) * 60_000;
        trades.push({
          cfg: `c${i % 17}`,
          sym: `S${i % 5}`,
          side: r() < 0.5 ? 1 : -1,
          entryT,
          exitT,
          entry: 1,
          exit: 1,
          r: r() - 0.5,
          reason: "tp",
          bars: 1,
          mfe: 0,
          mae: 0,
        } as Trade);
      }
      const st = prehistStats(trades, 0, 700 * 60_000);
      assert.equal(st.maxOpen, maxOpenByEvents(trades), `seed ${seed}`);
      assert.equal(st.n, trades.length);
    }
  });
});
