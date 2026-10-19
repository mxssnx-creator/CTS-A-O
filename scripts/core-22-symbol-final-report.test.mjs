import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { finalReportMain, verifyFinalSummary, finalReportHtml, verifyFrozenFeedBytes, verifyFrozenSourceBytes, comparisonCases } from "./core-22-symbol-final-report.mjs";

const H = 3_600_000;
const sha = (x) => createHash("sha256").update(x).digest("hex");
function fixture() {
  const zero = { n: 0, gp: 0, gl: 0, unknown: 0, pf: null, net: 0, noLoss: false };
  const win = { n: 1, gp: 0.02, gl: 0, unknown: 0, pf: null, net: 0.02, noLoss: true };
  const p = { sources: [], window: { tradeStartT: H, endT: 25 * H, preH: 24, indicatorWarmupH: 349 } };
  const c = { symbols: Array(20).fill("TEST"), feedSha256: "feed", runtime: { settingsSha256: "settings", settings: { cost: 0.002 } } };
  const s = { schema: "cts-causal-22-symbol-results-v1", complete: true, structural: [{ name: "coverage", ok: true }], provenance: { protocolSha256: "protocol", feedSha256: "feed" }, sourceSha256: sha("[]\n"), settingsSha256: "settings", symbolCount: 20, window: { startT: H, endT: 25 * H }, cost: 0.002,
    dataCoverage: { evaluatedPrehistoryHoursRequested: 24, indicatorWarmupHoursSeparate: 349 }, acceptedVirtualSettled: { ...win }, fundedModeledSettled: { ...win },
    hourly: Array.from({ length: 24 }, (_, i) => ({ startT: (i + 1) * H, funded: { ...(i ? zero : win) }, virtual: { ...(i ? zero : win) } })) };
  return { p, c, s };
}

test("final reducer verifies hourly sums, explicit costs and frozen provenance", () => {
  const { p, c, s } = fixture(); assert.deepEqual(verifyFinalSummary(s, p, c, "protocol"), []);
  s.hourly[0].funded.gp += 0.5; s.cost = 0.0015; s.provenance.feedSha256 = "stale";
  const reasons = verifyFinalSummary(s, p, c, "protocol");
  assert(reasons.some((x) => /reconciliation/.test(x))); assert(reasons.some((x) => /cost mismatch/.test(x))); assert(reasons.some((x) => /fingerprint/.test(x)));
});

test("final reducer rejects shifted/missing hours and incorrect measured PF", () => {
  const { p, c, s } = fixture(); s.hourly[0].startT++;
  s.fundedModeledSettled.gl = 0.01; s.hourly[0].funded.gl = 0.01; s.fundedModeledSettled.pf = 9;
  const reasons = verifyFinalSummary(s, p, c, "protocol");
  assert(reasons.includes("missing or shifted hourly cells")); assert(reasons.some((x) => /PF arithmetic/.test(x)));
});

test("invalid run never parses or reports its stale summary PF", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cts-final-report-"));
  try {
    const study = path.join(dir, "study"), prune = path.join(dir, "prune"), output = path.join(dir, "report"); fs.mkdirSync(path.join(study, "baseline-20"), { recursive: true }); fs.mkdirSync(prune);
    const protocol = { schema: "cts-causal-22-symbol-study-v1", sources: [], cases: [20, 22].map((n) => ({ id: `baseline-${n}`, symbols: Array(n).fill("TEST"), feedSha256: "feed" })), window: { preH: 24, indicatorWarmupH: 349, runH: 24, evaluationFromT: 0, tradeStartT: 24 * H, endT: 48 * H } };
    fs.writeFileSync(path.join(study, "protocol.json"), JSON.stringify(protocol));
    fs.writeFileSync(path.join(prune, "protocol.json"), JSON.stringify(protocol));
    fs.writeFileSync(path.join(study, "baseline-20/run-result.json"), JSON.stringify({ complete: false, error: "deliberate failure" }));
    // Parsing this unfinished/stale evidence would fail the report. Invalid output remains quarantined.
    fs.writeFileSync(path.join(study, "baseline-20/summary.json"), "{unfinished, pf:999999");
    await finalReportMain(["--study", study, "--prune", prune, "--out", output, "--base-zip", path.join(dir, "absent.zip"), "--history", path.join(dir, "absent-summary.json")]);
    const report = JSON.parse(fs.readFileSync(path.join(output, "report.json")));
    assert.equal(report.complete, false); assert.deepEqual(report.cases.map((x) => x.status), ["invalid", "pending", "pending", "pending"]);
    assert.deepEqual(report.cases.filter((x) => x.label === "prune-variant").map((x) => x.symbolCount), [20, 22]);
    assert(report.cases.every((x) => x.results === undefined)); assert(!fs.readFileSync(path.join(output, "report.html"), "utf8").includes("999999"));
    const plan = JSON.parse(fs.readFileSync(path.join(output, "packaging-plan.json"))); assert(plan.additions.every((x) => !x.archivePath.startsWith("..")));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("actual feed byte tampering fails even with unchanged recorded links", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cts-feed-seal-"));
  try {
    const file = path.join(dir, "feed.json"), original = '{"candles":"original"}'; fs.writeFileSync(file, original);
    assert.equal((await verifyFrozenFeedBytes(file, sha(original))).sha256, sha(original));
    fs.writeFileSync(file, '{"candles":"tampered"}');
    await assert.rejects(verifyFrozenFeedBytes(file, sha(original)), /Actual frozen feed bytes differ/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("actual source byte tampering fails and valid files produce an explicit archive snapshot", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cts-source-seal-"));
  try {
    const file = path.join(dir, "source.ts"), original = 'export const answer = 42;'; fs.writeFileSync(file, original);
    const sources = [{ path: "source.ts", sha256: sha(original) }], files = await verifyFrozenSourceBytes(sources, dir);
    assert.equal(files[0].role, "frozen-source"); assert.equal(files[0].sourcePath, "source.ts"); assert.equal(files[0].bytes, original.length);
    fs.writeFileSync(file, 'export const answer = 0;');
    await assert.rejects(verifyFrozenSourceBytes(sources, dir), /Actual frozen source bytes differ/);
    await assert.rejects(verifyFrozenSourceBytes([{ path: "../escape.ts", sha256: "unused" }], dir), /escapes repository/);
    assert.deepEqual(comparisonCases({ cases: [{ symbols: Array(20) }, { symbols: Array(22) }] }).map((x) => x.symbols.length), [20, 22]);
    assert.throws(() => comparisonCases({ cases: [{ symbols: Array(22) }] }), /one20-symbol and one22-symbol/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("empty final report does not imply completed tests or hourly profitability", () => {
  const html = finalReportHtml({ scope: "fixture", complete: false, cases: [], historyScope: { evaluatedPrehistoryHours: 24, indicatorOnlyWarmupHours: 349, simulatedHours: 24 }, historicalCoordinator: { status: "unavailable" }, invalidOrSupersededAttempts: [] });
  assert.match(html, /No final test manifest supplied/); assert.match(html, /incomplete/); assert.match(html, /cannot establish untouched held-out performance/);
  assert.match(html, /<!doctype html>/);
});
