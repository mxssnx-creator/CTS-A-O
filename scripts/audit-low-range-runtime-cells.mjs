#!/usr/bin/env node
// Recalculate the exact frozen Base cells and prove each simulated order came from a passing cell.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { allCombos, baseRangeProtects, baseRuns, completeBaseRangeProtects, makeUniverse,
  microLaneFloor, parseConfigId, protectCellKey } from "../src/core/pipeline/pipeline.ts";
import { rangeMinTfOf } from "../src/core/minimal-coord.ts";
import { baseFocus, basePass } from "../src/core/server/runtime.server.ts";
import { readSessionDump } from "./lib/session-dump.mjs";
import { readSessionStudy } from "./lib/session-study.mjs";

const dir = process.argv[2]; if (!dir) throw new Error("Expected frozen runtime study directory");
const { protocol: p } = readSessionStudy(`${dir}/protocol.json`), s = p.actualSettings;
const raw = await readSessionDump(`${dir}/raw.json`, { fields: ["trades"] });
const feed = JSON.parse(readFileSync(p.feed.path));
const lane = p.lane ?? 15;
assert.ok([1, 5, 15].includes(lane));
const bars = p.symbols.map((sym) => {
  const minute = feed.candles[`${sym}|1`].filter((c) => c.t < p.window.tradeStartT);
  return barsFromCandles(sym, lane, lane === 1 ? minute : resample(minute, 1, lane));
});
const expectedBars = (p.window.tradeStartT - p.window.indicatorStartT) / (lane * 60_000);
assert.ok(Number.isInteger(expectedBars) && bars.every((b) => b.n === expectedBars));
const u = makeUniverse(bars, p.window.evaluationFromT);
const combos = allCombos(baseFocus(s), s.disabledKinds, s.tfs, microLaneFloor(s.grid),
  s.grid.lowRange?.enabled === true && !!s.grid.short, rangeMinTfOf(s.grid).sh ?? 0);
const runs = baseRuns(u, combos, s.cost, s.tactics, false, false, undefined, baseRangeProtects(s.grid, s.cost),
  rangeMinTfOf(s.grid), false, s.gates, completeBaseRangeProtects(s.grid, s.cost), false);
const b = basePass(runs, s);
const actual = new Set(raw.basePairs.filter((x) => x.passed).map((x) => x.pair));
const recomputed = new Set(b.qualified.map((x) => `${x.bot}|${x.ind}`));
assert.deepEqual([...recomputed].sort(), [...actual].sort(), "Base pair membership must match the recorded run");
let checked = 0;
for (const tr of raw.trades) {
  const parsed = parseConfigId(tr.cfg);
  assert.ok(parsed && parsed.ind.startsWith("low-range-") && parsed.protect.tag === "sh", `invalid config ${tr.cfg}`);
  const cells = b.qualifiedCells[`${parsed.bot}|${parsed.ind}`];
  assert.ok(cells?.includes(protectCellKey(parsed.protect)), `order outside exact Base-passed cells: ${tr.cfg}`);
  checked++;
}
assert.equal(checked, raw.engine?.simTrades ?? raw.trades.length);
const receipt = { status: "passed", symbols: p.symbols.length, combos: combos.length, basePairs: actual.size,
  exactBaseCells: Object.values(b.qualifiedCells).reduce((n, x) => n + x.length, 0), ordersChecked: checked,
  scope: "Independently recalculated Base-cell membership of every modeled settled order; no live execution claim.",
  sourceSha256: p.source.sha256 };
writeFileSync(`${dir}/base-cell-audit.json`, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(receipt));
