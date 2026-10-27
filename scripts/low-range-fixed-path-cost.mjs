#!/usr/bin/env node
// Read-only decomposition of a saved Low-Range session. It does not rerun the
// strategy with different fees or alter its entries, exits, gates or sizing.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseConfigId } from "../src/core/pipeline/pipeline.ts";
import { iterateSessionArray } from "./lib/session-dump.mjs";

export const GROUPS = ["2", "3", "4", "5", "6", "noTP"];
const fresh = () => ({ settled: 0, long: 0, short: 0, gp: 0, gl: 0, cash: 0 });
export function makeAnalysis(cost) {
  assert.ok(Number.isFinite(cost) && cost >= 0, "cost must be a known nonnegative fraction");
  return { cost, zeroAllocated: 0, total: fresh(), byStep: Object.fromEntries(GROUPS.map(x => [x, fresh()])),
    byDirection: { long: fresh(), short: fresh() },
    byStepDirection: Object.fromEntries(GROUPS.map(x => [x, { long: fresh(), short: fresh() }])) };
}
export function stepOf(protect, cost, step) {
  assert.ok(protect && protect.lowRangeOnly && Number.isFinite(cost) && Number.isFinite(step) && step > 0);
  if (protect.trailOnly) return "noTP";
  assert.ok(Number.isFinite(protect.tp), "target must be known");
  const n = Math.round((protect.tp - cost) / step);
  assert.ok(GROUPS.includes(String(n)) && Math.abs(protect.tp - (cost + n * step)) < 1e-6, "invalid target step");
  return String(n);
}
export function addRow(analysis, group, row) {
  assert.ok(GROUPS.includes(group));
  assert.ok(Number.isFinite(row.allocatedNotional) && row.allocatedNotional >= 0, "allocation is unknown or negative");
  if (row.allocatedNotional === 0) { analysis.zeroAllocated++; return; }
  assert.ok(row.side === 1 || row.side === -1, "direction is unknown");
  assert.ok(Number.isFinite(row.unitR) && Number.isFinite(row.sizedPnl), "funded return or cash is unknown");
  const direction = row.side === 1 ? "long" : "short";
  for (const x of [analysis.total, analysis.byStep[group], analysis.byDirection[direction], analysis.byStepDirection[group][direction]]) {
    x.settled++; x[direction]++; x.gp += Math.max(0, row.unitR); x.gl += Math.max(0, -row.unitR); x.cash += row.sizedPnl;
  }
}
export function reconcile(analysis, detail) {
  assert.equal(detail.status, "passed");
  assert.equal(analysis.zeroAllocated, detail.zeroAllocated);
  const near = (a, b, field) => assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(b)), `${field}: ${a} != ${b}`);
  for (const group of GROUPS) {
    const a = analysis.byStep[group], b = detail.byStep[group];
    assert.ok(b, `missing ${group}`);
    for (const key of ["settled", "long", "short"]) assert.equal(a[key], b[key], `${group}.${key}`);
    for (const key of ["gp", "gl", "cash"]) near(a[key], b[key], `${group}.${key}`);
  }
}
export function results(analysis) {
  const pack = x => ({ ...x, net: x.gp - x.gl, netPf: x.gl > 0 ? x.gp / x.gl : x.gp > 0 ? "no-loss" : null,
    meanNetBp: x.settled ? (x.gp - x.gl) / x.settled * 10_000 : null,
    meanGrossFrozenPathBp: x.settled ? ((x.gp - x.gl) / x.settled + analysis.cost) * 10_000 : null });
  return { costFraction: analysis.cost, zeroAllocated: analysis.zeroAllocated, total: pack(analysis.total),
    byStep: Object.fromEntries(GROUPS.map(g => [g, pack(analysis.byStep[g])])),
    byDirection: Object.fromEntries(["long", "short"].map(d => [d, pack(analysis.byDirection[d])])),
    byStepDirection: Object.fromEntries(GROUPS.map(g => [g,
      Object.fromEntries(["long", "short"].map(d => [d, pack(analysis.byStepDirection[g][d])]))])) };
}

async function main(dir) {
  assert.ok(dir, "usage: node --experimental-strip-types scripts/low-range-fixed-path-cost.mjs STUDY_DIR");
  dir = resolve(dir);
  const read = p => readFileSync(`${dir}/${p}`), sha = p => createHash("sha256").update(read(p)).digest("hex");
  const protocol = JSON.parse(read("protocol.json")), detail = JSON.parse(read("runtime-step-detail.json"));
  assert.equal(protocol.source.sha256, detail.sourceSha256);
  assert.equal(protocol.window.tradeStartT, detail.startT); assert.equal(protocol.window.endT, detail.endT);
  assert.deepEqual(protocol.symbols, detail.symbols); assert.deepEqual(detail.groups, GROUPS);
  const cost = protocol.actualSettings.cost, step = protocol.actualSettings.grid.lowRange.step;
  const analysis = makeAnalysis(cost), report = `${dir}/report/data.json`;
  const rawTrades = iterateSessionArray(`${dir}/raw.json`, "trades")[Symbol.asyncIterator]();
  let totalRows = 0, maxPriceReconstructionDifference = 0;
  for await (const row of iterateSessionArray(report, "sizedOrders")) {
    const saved = await rawTrades.next(); assert.equal(saved.done, false, "report has more rows than raw trades");
    const trade = saved.value;
    assert.equal(row.closeIndex, totalRows++);
    for (const k of ["cfg", "sym", "side", "entryT", "exitT"]) assert.equal(row[k], trade[k], `raw ${k} mismatch`);
    assert.ok(["normal", "trailing", "trailing-only"].includes(trade.kind), "unsupported strategy type");
    assert.ok(Number.isFinite(trade.entry) && trade.entry > 0 && Number.isFinite(trade.exit) && trade.exit > 0);
    if (row.allocatedNotional > 0) {
      assert.ok(Number.isFinite(row.unitR));
      // The archived tape may have stored price values at lower precision than
      // the return; tolerate that serialization roundoff, not material drift.
      const fromPrices = row.side * (trade.exit - trade.entry) / trade.entry;
      const delta = Math.abs(fromPrices - (row.unitR + cost));
      assert.ok(delta <= 1e-6, `stored price-return mismatch: ${delta}`);
      maxPriceReconstructionDifference = Math.max(maxPriceReconstructionDifference, delta);
    }
    assert.ok(protocol.symbols.includes(row.sym));
    assert.ok(row.exitT > detail.startT && row.exitT <= detail.endT, "settled order outside declared window");
    const parsed = parseConfigId(row.cfg);
    addRow(analysis, stepOf(parsed?.protect, cost, step), row);
  }
  assert.equal((await rawTrades.next()).done, true, "raw trades have extra rows");
  reconcile(analysis, detail);
  return { status: "passed", protocolSha256: sha("protocol.json"), detailSha256: sha("runtime-step-detail.json"),
    reportHeaderSha256: sha("report/data.json"), rawHeaderSha256: sha("raw.json"), sourceCheckpoint: protocol.source.checkpoint,
    sourceSha256: protocol.source.sha256, symbols: protocol.symbols, startT: detail.startT, endT: detail.endT,
    scope: "Known-positive allocations among settled modeled orders; equal order-weighted unit returns; fees added back holding the observed path fixed. This is not a zero-cost rerun, dollar-weighted account return, venue fill or independent holdout.",
    arithmetic: "mean gross bp = 10000 * ((sum net unit gains - sum net unit losses) / settled orders + modeled round-trip cost)",
    independentChecks: { totalRows, fundedPriceRows: analysis.total.settled,
      maxPriceReconstructionDifferenceBp: maxPriceReconstructionDifference * 10_000 },
    ...results(analysis) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await main(process.argv[2]), null, 2)); }
  catch (error) { console.error(error); process.exitCode = 1; }
}
