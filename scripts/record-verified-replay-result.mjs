#!/usr/bin/env node
// Compact reconciled metrics only. Raw tapes, caches and allocation reports stay on the runner.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const value = (key) => { const i = args.indexOf(key); return i < 0 ? null : args[i + 1]; };
const profile = value("--profile"), purpose = value("--purpose") ?? "development";
if (!["full", "entry25", "expanded", "entry5strict", "entry25strict", "entry25plain"].includes(profile) || !["development", "final"].includes(purpose))
  throw new Error("Supply a registered replay --profile and --purpose development|final");
const statusPath = "runs/frozen-session-launcher-status.json";
if (!existsSync(statusPath)) throw new Error("Replay did not start; no performance result");
const status = JSON.parse(readFileSync(statusPath));
if (status.state !== "complete" || status.jobs?.length !== 1) {
  console.log(JSON.stringify(status));
  throw new Error("Frozen replay is incomplete; no performance result");
}
const attempt = status.jobs[0].attempt;
const result = spawnSync(process.execPath, ["scripts/assess-replay-candidate.mjs", "--audit", `${attempt}/audit.json`,
  "--data", `${attempt}/html/data.json`, "--protocol", `${attempt}/protocol.json`, "--out", `${attempt}/assessment`],
  { encoding: "utf8", timeout: 120000, maxBuffer: 1048576 });
if (![0, 1].includes(result.status) || !existsSync(`${attempt}/assessment.json`))
  throw new Error(result.stderr || "Candidate assessment did not finish");
const assessment = JSON.parse(readFileSync(`${attempt}/assessment.json`));
const a = JSON.parse(readFileSync(`${attempt}/audit.json`));
const study = a.provenance?.study;
if (!process.env.GITHUB_SHA || study?.sourceCheckpoint !== process.env.GITHUB_SHA || a.purpose !== purpose || a.checksOk !== true)
  throw new Error("Replay does not match the checked-out source and independently audited purpose");
if (purpose === "final" && (study.id !== `verified-${profile}-final22` || study.symbols?.length !== 22 ||
  study.window?.evaluationFromT !== Date.parse("2026-10-15T15:00:00Z") ||
  study.window?.tradeStartT !== Date.parse("2026-10-15T21:00:00Z") ||
  study.window?.endT !== Date.parse("2026-10-16T21:00:00Z")))
  throw new Error("Untouched final window differs from the predeclared 22-symbol / 24-hour study");
const feedEvidence = JSON.parse(readFileSync("runs/public-source/feed-evidence.json"));
if (feedEvidence.schema !== "cts-verified-public-feed-v1" || feedEvidence.sha256 !== study.feedSha256)
  throw new Error("Frozen replay differs from the verified complete public source");
const compact = { profile, feedEvidence, status: "complete", commit: process.env.GITHUB_SHA, study, auditChecksOk: true,
  assessment: { researchCandidate: assessment.researchCandidate, metrics: assessment.metrics,
    failedCriteria: assessment.failedCriteria, automaticPromotion: false, defaultsChanged: false } };
const capitalIds = new Set(["ending-equity", "feasible", "margin-shortfall", "positive-equity", "no-ruin", "max-drawdown"]);
const cellView = ({ cfg, side, cohort, range, closes, entryGroups, symbols, state, noLoss, exactPf, unitNet, sizedNetUsd, firstHalf, secondHalf }) =>
  ({ cfg, side, cohort, range, closes, entryGroups, symbols, state, noLoss, exactPf, unitNet, sizedNetUsd,
    firstHalfUnitNet: firstHalf.unitNet, secondHalfUnitNet: secondHalf.unitNet });
const cells = a.cells.filter(x => x.cohort === "Engine");
const weakest = field => cells.filter(x => Number.isFinite(x[field])).sort((x, y) => x[field] - y[field]).slice(0, 10).map(cellView);
console.log("CTS_REPLAY_RESULT=" + JSON.stringify({ schema: "cts-verified-replay-ci-v1", ...compact,
  total: a.total, cohorts: a.cohorts, ranges: a.byRange, types: a.byType, directions: a.byDirection,
  hours: a.hours, account: a.account, performance: a.performance, base: a.eligibility.base,
  configRunStart: a.eligibility.configRunStart,
  capitalEvidence: assessment.criteria.filter(x => capitalIds.has(x.id)),
  diagnosticCells: { automaticPruning: false, lowestCash: weakest("sizedNetUsd"), lowestUnitNet: weakest("unitNet") } }));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${profile}=${JSON.stringify(compact)}\n`);
if (purpose === "final" && !assessment.researchCandidate) process.exitCode = 1;
