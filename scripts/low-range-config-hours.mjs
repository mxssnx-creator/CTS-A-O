#!/usr/bin/env node
// Descriptive, funded-model config × direction and close-hour analysis.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { settledHourT } from "../src/core/metrics/stats.ts";
import { iterateSessionArray, readSessionDump } from "./lib/session-dump.mjs";

const H = 3_600_000, MIN_CLOSES = 20, MIN_ACTIVE_HOURS = 3, MIN_PF = 1.1;
const blank = () => ({ n: 0, gp: 0, gl: 0, cash: 0 });
const add = (x, r, cash) => { x.n++; x.gp += Math.max(0, r); x.gl += Math.max(0, -r); x.cash += cash; };
const sum = (a, b) => { a.n += b.n; a.gp += b.gp; a.gl += b.gl; a.cash += b.cash; };
export function pfState(x) {
  if (!x.n) return "empty";
  if (x.gl > 0) return x.gp / x.gl;
  return x.gp > 0 ? "no-loss" : "flat";
}
export function createAnalysis({ startT, endT, symbols, configIds }) {
  assert.ok(Number.isFinite(startT) && endT - startT === 24 * H, "exactly 24 hours required");
  assert.ok(Array.isArray(symbols) && symbols.length && new Set(symbols).size === symbols.length);
  const ids = [...configIds]; assert.ok(ids.length && ids.every((x) => typeof x === "string" && x));
  assert.equal(new Set(ids).size, ids.length, "duplicate configuration identity");
  const contexts = new Map(ids.map(id => [id, new Map([1, -1].map(side => [side, { total: blank(), hours: new Map() }]))]));
  return { startT, endT, symbols: new Set(symbols), contexts, closeIndices: new Set(), zeroAllocated: 0, total: blank() };
}
export function addOrder(a, tr) {
  assert.ok(Number.isSafeInteger(tr.closeIndex) && tr.closeIndex >= 0 && !a.closeIndices.has(tr.closeIndex), "duplicate or unknown close index");
  a.closeIndices.add(tr.closeIndex);
  assert.ok(Number.isFinite(tr.allocatedNotional) && tr.allocatedNotional >= 0, "unknown or invalid allocation");
  if (tr.allocatedNotional === 0) { a.zeroAllocated++; return; }
  assert.ok(tr.side === 1 || tr.side === -1, "unknown direction");
  const ctx = a.contexts.get(tr.cfg)?.get(tr.side); assert.ok(ctx, "funded close lacks exact config identity");
  assert.ok(a.symbols.has(tr.sym), "funded close has unknown symbol");
  assert.ok(Number.isFinite(tr.unitR) && Number.isFinite(tr.sizedPnl), "funded return or cash unknown");
  assert.ok(Number.isFinite(tr.entryT) && Number.isFinite(tr.exitT) && tr.entryT >= a.startT && tr.entryT < a.endT &&
    tr.exitT >= tr.entryT && tr.exitT <= a.endT, "invalid close clock");
  const t = settledHourT(tr.exitT), i = (t - a.startT) / H;
  assert.ok(Number.isInteger(i) && i >= 0 && i < 24, "settlement outside the 24 close-hour bins");
  const hour = ctx.hours.get(i) ?? blank(); ctx.hours.set(i, hour);
  for (const x of [a.total, ctx.total, hour]) add(x, tr.unitR, tr.sizedPnl);
}
export function finishAnalysis(a, audit, expectedZero) {
  assert.equal(audit.checksOk, true, "passing funded audit required");
  assert.equal(a.zeroAllocated, expectedZero, "known-zero allocation count differs");
  const near = (actual, expected, label) => assert.ok(Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${label} differs from funded audit`);
  assert.equal(a.total.n, audit.total.closes, "funded close count differs");
  near(a.total.gp, audit.total.unitGp, "unit profit"); near(a.total.gl, audit.total.unitGl, "unit loss");
  near(a.total.cash, audit.total.sizedNetUsd, "sized cash");
  assert.equal(audit.total.unknownReturns, 0); assert.equal(audit.total.unknownCash, 0);
  const rows = [], check = blank(), hourCheck = blank();
  let eligible = 0, consistent = 0;
  const allHours = Array.from({ length: 24 }, blank);
  for (const [id, sides] of a.contexts) for (const [side, ctx] of sides) {
    sum(check, ctx.total);
    const hours = [...ctx.hours].sort(([i], [j]) => i - j).map(([i, x]) => {
      sum(hourCheck, x); sum(allHours[i], x);
      return [i, x.n, x.gp, x.gl, x.cash];
    });
    const qualifies = ctx.total.n >= MIN_CLOSES && hours.length >= MIN_ACTIVE_HOURS && hours.every(([, n, gp, gl]) => {
      const state = pfState({ n, gp, gl }); return state === "no-loss" || (typeof state === "number" && state >= MIN_PF);
    });
    if (ctx.total.n >= MIN_CLOSES && hours.length >= MIN_ACTIVE_HOURS) { eligible++; if (qualifies) consistent++; }
    // Sparse hours: omitted bins are empty, not zero PF. No-loss and flat are computed from gain/loss evidence.
    rows.push([id, side, ctx.total.n, ctx.total.gp, ctx.total.gl, ctx.total.cash, hours, qualifies]);
  }
  for (const [label, x] of [["contexts", check], ["hours", hourCheck]]) {
    assert.equal(x.n, a.total.n, `${label} close count differs`); near(x.gp, a.total.gp, `${label} profit`);
    near(x.gl, a.total.gl, `${label} loss`); near(x.cash, a.total.cash, `${label} cash`);
  }
  for (const [side, key] of [[1, "Long"], [-1, "Short"]]) {
    const actual = blank();
    for (const sides of a.contexts.values()) sum(actual, sides.get(side).total);
    const expected = audit.byDirection.find(x => x.key === key);
    if (!expected) { assert.equal(actual.n, 0, `missing nonempty ${key} audit`); continue; }
    assert.equal(actual.n, expected.closes); near(actual.gp, expected.unitGp, `${key} profit`);
    near(actual.gl, expected.unitGl, `${key} loss`); near(actual.cash, expected.sizedNetUsd, `${key} cash`);
  }
  return { status: "passed", startT: a.startT, endT: a.endT, symbols: [...a.symbols],
    total: a.total, zeroAllocated: a.zeroAllocated, contexts: rows.length, rows,
    hourlyTotals: allHours.map((x, i) => [i, x.n, x.gp, x.gl, x.cash]),
    exploratory: { minCloses: MIN_CLOSES, minActiveHours: MIN_ACTIVE_HOURS, minHourlyPf: MIN_PF,
      eligible, consistent, percent: eligible ? 100 * consistent / eligible : null },
    scope: "Funded-model settled orders grouped by exact configuration and long/short direction, pooled across the indicated symbols. All recorded config identities × both directions are shown, even without closes. Empty, flat and no-loss differ. Historical direction-level Base validation is unavailable. Exploratory hourly consistency is not promotion, a holdout, venue execution or future-profit proof." };
}

async function main(dir, out) {
  assert.ok(dir, "usage: low-range-config-hours.mjs STUDY_DIR [OUTPUT_JSON]");
  dir = resolve(dir); const read = p => readFileSync(`${dir}/${p}`), sha = b => createHash("sha256").update(b).digest("hex");
  const protocolBytes = read("protocol.json"), protocol = JSON.parse(protocolBytes);
  const audit = JSON.parse(read("audit.json")), detail = JSON.parse(read("runtime-step-detail.json"));
  assert.equal(detail.status, "passed"); assert.equal(detail.sourceSha256, protocol.source.sha256);
  assert.equal(audit.provenance?.study?.sourceSha256, protocol.source.sha256);
  const recorded = audit.provenance?.inputSha256;
  assert.equal(recorded?.protocol, sha(protocolBytes), "audited protocol changed");
  assert.equal(recorded?.raw, sha(read("raw.json")), "audited raw header changed");
  assert.equal(recorded?.allocationReport, sha(read("report/data.json")), "audited allocation header changed");
  assert.equal(detail.startT, protocol.window.tradeStartT); assert.equal(detail.endT, protocol.window.endT);
  assert.deepEqual(detail.symbols, protocol.symbols);
  const ids = new Set();
  for await (const step of iterateSessionArray(`${dir}/raw.json`, "validation"))
    for (const check of step.checks) { assert.ok(typeof check[0] === "string" && check[0]); ids.add(check[0]); }
  const analysis = createAnalysis({ startT: detail.startT, endT: detail.endT, symbols: protocol.symbols, configIds: ids });
  // Read the same session-dump format as readSessionDump, then stream its
  // checksum-verified sizedOrders sidecar to keep memory bounded.
  const header = await readSessionDump(`${dir}/report/data.json`, { loadSidecars: false });
  assert.ok(header.arraySidecars?.sizedOrders || Array.isArray(header.sizedOrders), "missing allocation report");
  for await (const order of iterateSessionArray(`${dir}/report/data.json`, "sizedOrders")) addOrder(analysis, order);
  const result = finishAnalysis(analysis, audit, detail.zeroAllocated);
  result.provenance = { protocolSha256: sha(protocolBytes), sourceSha256: protocol.source.sha256,
    rawHeaderSha256: recorded.raw, reportHeaderSha256: recorded.allocationReport,
    analyzerSha256: sha(readFileSync(new URL(import.meta.url))) };
  writeFileSync(out ?? `${dir}/config-direction-hours.json`, JSON.stringify(result) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: result.status, contexts: result.contexts, fundedSettled: result.total.n,
    zeroAllocated: result.zeroAllocated, exploratory: result.exploratory }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main(process.argv[2], process.argv[3]);
