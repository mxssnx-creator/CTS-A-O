// Functional model fixture only: planted returns are not market profitability or funded/venue evidence.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, Trade } from "../domain/types.ts";
import { configId, protectCellKey } from "../pipeline/pipeline.ts";
import { modeledUnitStatsOf } from "../metrics/stats.ts";
import { defaultWalkForward, makeTape, passedCellsOf, walkForward } from "./walkforward.ts";
const M = 60000,
  H = 60 * M,
  FIRST = Date.UTC(2026, 9, 8, 12),
  START = FIRST + 12 * H,
  END = START + 12 * H;
const symbols = ["ADA", "APT", "ARB", "ATOM", "AVAX", "BCH", "BNB", "BTC"].map((x) => x + "-USDT");
const ind = "low-range-1-breakout-standalone@m1",
  pair = `follow|${ind}`;
function run(losing = false) {
  const protects: Protect[] = [
    { tp: 0.03, sl: 0.02, trail: 0, hold: 5, tag: "lr" },
    { tp: 0.03, sl: 0.02, trail: 0.005, hold: 5, tag: "lr" },
    { tp: 0, sl: 0.02, trail: 0.005, trailOnly: true, hold: 5, tag: "lr" },
  ];
  const tapes = protects.map((p, k) => {
    const id = configId("follow", ind, p),
      kind = k === 0 ? "normal" : k === 1 ? "trailing" : "trailing-only";
    const rows: Trade[] = [];
    for (const sym of symbols)
      for (const side of [1, -1] as const) {
        for (let i = 0; i < 92; i++) {
          const entryT = i < 80 ? FIRST + (i + 1) * 8 * M : START + (i - 80) * H + M;
          const r = i < 80 ? 0.02 : losing ? -0.02 : i % 2 ? 0.005 * -1 : 0.02;
          rows.push({
            cfg: id,
            sym,
            side,
            entryT,
            exitT: entryT + M,
            entry: 100,
            exit: 100 * (1 + side * (r + DEFAULT_SETTINGS.cost)),
            r,
            mult: 1,
            kind,
            reason: r > 0 ? "tp" : "sl",
            bars: 1,
            mfe: Math.max(0, r),
            mae: Math.max(0, -r),
          });
        }
      }
    rows.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
    return makeTape(id, "follow", ind, p, kind, symbols, rows, [], []);
  });
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  return walkForward(
    {
      bars: [],
      caches: [],
      startT: FIRST,
      endT: END,
      splitT: START,
      nowT: END,
      baseTf: 1,
    } as never,
    tapes,
    {
      ...d,
      startT: START,
      preH: 12,
      longH: 12,
      simH: 12,
      stepH: 1,
      recordValidation: true,
      gates: { ...d.gates, maxDdr: 0, minGreen: 0, stableBlocks: 0, lossPrior: false },
      rangeGate: undefined,
      symGate: "off",
      preGate: false,
      portfolio: 0,
      seatPer: "config",
      robustFrac: 0,
      basePassed: new Set([pair]),
      basePassedRanges: { [pair]: ["lr"] },
      basePassedCells: passedCellsOf({ [pair]: protects.map(protectCellKey) }),
      basePassedTrailingOnlyCells: passedCellsOf({
        [pair]: protects.filter((p) => p.trailOnly).map(protectCellKey),
      }),
      toggles: {
        ...d.toggles,
        normal: true,
        trailing: true,
        block: false,
        dca: false,
        axis: false,
      },
    },
  );
}

test("8-symbol 12+12h planted model executes Normal, Trailing and no-TP independently on both sides", () => {
  const result = run();
  assert.ok(result.trades.length > 0);
  assert.equal(new Set(result.trades.map((x) => x.sym)).size, 8);
  assert.deepEqual(new Set(result.trades.map((x) => x.side)), new Set([1, -1]));
  assert.deepEqual(
    new Set(result.trades.map((x) => x.kind)),
    new Set(["normal", "trailing", "trailing-only"]),
  );
  const stats = modeledUnitStatsOf(result.trades, END);
  assert.ok(stats.gl > 0, "settled losses remain in the executed cohort");
  assert.ok(stats.pf > 1, "planted positive behavior is reachable with the count gates active");
  assert.ok(result.trades.every((t) => t.entryT >= START && t.exitT <= END));
});

test("high initial validation never rewrites later model losses as positive execution", () => {
  const result = run(true),
    stats = modeledUnitStatsOf(result.trades, END);
  assert.ok(result.trades.length > 0, "initially qualified sets may subsequently lose");
  assert.equal(stats.gp, 0);
  assert.ok(stats.gl > 0);
  assert.equal(stats.pf, 0);
  assert.ok(
    result.skips.configValidation > 0 || result.trades.length < 3 * 8 * 2 * 12,
    "deteriorating own samples stop further entries",
  );
});
