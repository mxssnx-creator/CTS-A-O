import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { modeledUnitReturn, settledHourT } from "../src/core/metrics/stats.ts";
import { auditModeledOrders } from "./lib/modeled-order-audit.mjs";
import { auditReplayPrices } from "./lib/replay-price-audit.mjs";

const dir = process.argv[2];
if (!dir) throw new Error("Provide the directory containing protocol.json and portable-manifest.json");
const read = (path) => readFileSync(path);
const json = (path) => JSON.parse(read(path));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const protocolBytes = read(join(dir, "protocol.json")), protocol = JSON.parse(protocolBytes);
const summary = json(join(dir, "summary.json")), receipt = json(join(dir, "receipt.json"));
const manifest = json(join(dir, "portable-manifest.json"));
assert.equal(receipt.status, "complete", "incomplete study");
assert.equal(hash(protocolBytes), receipt.protocolSha256, "protocol checksum");
assert.equal(summary.protocolSha256, receipt.protocolSha256, "summary protocol checksum");
assert.equal(summary.sourceCommit, protocol.sourceCommit, "recorded economic source");
assert.equal(hash(read(protocol.feed)), protocol.feedSha256, "feed checksum");
assert.equal(hash(read(protocol.desk)), protocol.deskSha256, "desk checksum");
assert.deepEqual(manifest.map((x) => x.id), protocol.cases.map((x) => x.id), "portable case list");
assert.deepEqual(summary.results.map((x) => x.id), protocol.cases.map((x) => x.id), "summary case list");
assert.deepEqual(receipt.cases.map((x) => x.id), protocol.cases.map((x) => x.id), "receipt case list");
const feed = JSON.parse(gunzipSync(read(protocol.feed)));
const start = Date.parse(protocol.start), end = Date.parse(protocol.end), hour = 3_600_000;

function stats(rows) {
  let gp = 0, gl = 0, wins = 0, losses = 0;
  for (const row of rows) {
    const r = modeledUnitReturn(row);
    assert.ok(Number.isFinite(r), "unknown modeled return");
    if (r > 0) { gp += r; wins++; } else if (r < 0) { gl -= r; losses++; }
  }
  return { orders: rows.length, wins, losses, flat: rows.length - wins - losses,
    pf: gl > 0 ? gp / gl : null, noLoss: rows.length > 0 && gp > 0 && gl === 0, gp, gl, net: gp - gl };
}
function equalStats(actual, expected, label) {
  for (const key of ["orders", "wins", "losses", "flat", "noLoss"]) assert.equal(actual[key], expected[key], `${label} ${key}`);
  for (const key of ["pf", "gp", "gl", "net"]) {
    if (actual[key] === null || expected[key] === null) assert.equal(actual[key], expected[key], `${label} ${key}`);
    else assert.ok(Number.isFinite(actual[key]) && Number.isFinite(expected[key]) &&
      Math.abs(actual[key] - expected[key]) <= 1e-9 * Math.max(1, Math.abs(actual[key])), `${label} ${key}`);
  }
}

const results = [];
for (let index = 0; index < protocol.cases.length; index++) {
  const item = protocol.cases[index], entry = manifest[index], expected = summary.results[index], run = receipt.cases[index];
  assert.equal(run.code, 0, `${item.id} run failed`);
  assert.equal(run.reason, null, `${item.id} stopped`);
  assert.deepEqual(run.wf, item.wf, `${item.id} recorded policy`);
  assert.deepEqual(expected.wf, item.wf, `${item.id} summarized policy`);
  assert.equal(entry.file, `${item.id}.json.gz`, `${item.id} unexpected portable filename`);
  const bytes = read(join(dir, entry.file));
  assert.equal(bytes.length, entry.bytes, `${item.id} size`);
  assert.equal(hash(bytes), entry.sha256, `${item.id} checksum`);
  const data = JSON.parse(gunzipSync(bytes));
  assert.equal(data.window.startT, start); assert.equal(data.window.endT, end);
  assert.equal(data.engine.universe.length, protocol.symbols);
  assert.equal(data.settings.wf.lastN, item.wf.lastN ?? 0);
  if (item.wf.maxPerSymbol !== undefined) assert.equal(data.settings.wf.maxPerSymbol, item.wf.maxPerSymbol);
  if (item.wf.entryCrowd) assert.deepEqual(data.settings.effectiveWf.entryCrowd, item.wf.entryCrowd);
  assert.ok(data.engine.mem && data.engine.mem.computeLevel === 0 &&
    data.engine.mem.fallback === 0 && data.engine.mem.aborts === 0, `${item.id} memory coverage`);
  const identities = auditModeledOrders(data), prices = auditReplayPrices(feed, data);
  assert.equal(identities.ok, true, `${item.id} identities`);
  assert.equal(prices.ok, true, `${item.id} prices or selections`);
  assert.deepEqual(identities.counts, expected.counts, `${item.id} counts`);
  assert.equal(prices.validationSteps, 24, `${item.id} validation clocks`);
  const first = data.validation[0], passing = first.checks.filter((x) => x[1] === 1);
  let gp = 0, gl = 0;
  for (const x of passing) {
    assert.ok(Number.isFinite(x[4]) && x[4] >= 0 && Number.isFinite(x[5]) && x[5] >= 0);
    gp += x[4]; gl += x[5];
  }
  assert.equal(first.t, start); assert.equal(expected.validation.passed, passing.length);
  assert.equal(expected.validation.evaluated, first.checks.length);
  assert.equal(expected.validation.at, new Date(first.t).toISOString());
  assert.equal(expected.validation.noLoss, passing.length > 0 && gp > 0 && gl === 0);
  if (gl > 0) assert.ok(Number.isFinite(expected.validation.pf) && Math.abs(expected.validation.pf - gp / gl) < 1e-12);
  else assert.equal(expected.validation.pf, null);
  equalStats(stats(data.trades), expected.settled, `${item.id} settled`);
  const segment = (a, b) => stats(data.trades.filter((x) => {
    const t = settledHourT(x.exitT); return t >= start + a * hour && t < start + b * hour;
  }));
  const middle = expected.periods.hours6to8 !== undefined ? "hours6to8" : "shock2h";
  for (const [name, a, b] of [["first6h", 0, 6], [middle, 6, 8], ["next4h", 8, 12], ["final12h", 12, 24]])
    equalStats(segment(a, b), expected.periods[name], `${item.id} ${name}`);
  assert.equal(expected.hourly.length, 24);
  for (let h = 0; h < 24; h++) {
    assert.equal(expected.hourly[h].at, new Date(start + h * hour).toISOString());
    equalStats(segment(h, h + 1), expected.hourly[h], `${item.id} hour ${h}`);
  }
  results.push({ id: item.id, sha256: entry.sha256, counts: identities.counts,
    settledPf: identities.settledReturnPf, priceAndSelectionAudit: prices.ok, maxReturnError: prices.maxReturnError });
}
console.log(JSON.stringify({ scope: "modeled whole orders, price paths, recorded hourly selections and reported returns; not venue fills or per-entry Last-N proof", results }, null, 2));
