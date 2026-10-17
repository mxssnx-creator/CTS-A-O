import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { assessReplayCandidate } from "./assess-replay-candidate.mjs";
import { DEVELOPMENT_PROFILES, REFINEMENT_PROFILES, DEVELOPMENT_SYMBOLS, DEVELOPMENT_WINDOW, selectReplayCandidate } from "./select-replay-candidate.mjs";

const COMMIT = "1".repeat(40), SOURCE = "a".repeat(64), H = 3_600_000;
const FEED = "f".repeat(64);
const sha = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function summary(closes, gp, gl, cash = .2) {
  return { closes, symbols: closes ? 3 : 0, entryGroups: closes ? 10 : 0, unknownReturns: 0, unknownCash: 0,
    state: !closes ? "empty" : gl > 0 ? "measured" : "no-loss", noLoss: closes > 0 && gl === 0,
    unitGp: gp, unitGl: gl, unitNet: gp - gl, exactPf: !closes || gl === 0 ? null : gp / gl, sizedNetUsd: cash };
}

// Exercise the real assessor-to-CI compact contract, rather than inventing assessment flags/metric shapes.
function compact(profile, { pf = 1.2, drawdown = .05, closes = 120, empty = false, noLoss = false, cashNet } = {}) {
  const n = empty ? 0 : closes, gl = empty || noLoss ? 0 : .1, gp = empty ? 0 : noLoss ? .12 : pf * gl;
  const cash = cashNet ?? (empty ? 0 : gp - gl), reportedCash = cashNet === undefined ? cash : +cash.toFixed(6);
  const markedEnd = cashNet === undefined ? 10 + cash : +(10 + cash).toFixed(6);
  const total = summary(n, gp, gl, cash), engine = { key: "Engine", ...total };
  const protocol = { schema: "cts-session-study-v1", id: `verified-${profile}-dev20`,
    source: { sha256: SOURCE, checkpoint: COMMIT }, feed: { sha256: FEED }, symbols: [...DEVELOPMENT_SYMBOLS], window: { ...DEVELOPMENT_WINDOW },
    account: { balance: 10 }, actualSettings: { cost: .0015, live: { maxPositionX: .75, maxExposureX: 7 } }, actualWf: { cost: .0015 } };
  const protocolSha256 = sha(protocol);
  const study = { id: protocol.id, sourceCheckpoint: COMMIT, sourceSha256: SOURCE, feedSha256: FEED,
    protocolSha256, symbols: [...protocol.symbols], window: { ...protocol.window } };
  const startT = DEVELOPMENT_WINDOW.tradeStartT, endT = DEVELOPMENT_WINDOW.endT;
  const data = { study, symbols: protocol.symbols, window: { startT, endT, preStartT: DEVELOPMENT_WINDOW.evaluationFromT, preH: 6, runH: 6 }, checksOk: true, checks: [{ name: "report arithmetic", ok: true }],
    settings: { balance0: 10, cost: .0015 }, total: { fundedOrders: n, gpR: gp, glR: gl, pf: total.exactPf, pfBasis: "unit-net-returns", noLoss: total.noLoss,
      unknownReturns: 0, unknownReturnTotals: 0, net: reportedCash, equityEnd: markedEnd, feasible: true, marginOver: { minutes: 0, firstT: null, maxRatio: .2 },
      eqMin: 10 * (1 - drawdown), ruinT: null, equityMaxDdPct: drawdown, caps: { on: true, maxPositionX: .75, maxExposureX: 7 } } };
  const reportSha256 = sha(data);
  const audit = { schema: "cts-session-study-audit-v1", purpose: "development", checksOk: true,
    checks: [{ name: "independent funded reconciliation", ok: true }],
    provenance: { study, actualExecution: false, missingAllocationRows: false, inputSha256: { allocationReport: reportSha256, protocol: protocolSha256 } },
    window: { startT, endT, hours: 6, symbols: protocol.symbols }, total, cohorts: [engine],
    cells: empty ? [] : [{ key: "exact-engine-config", ...total, cohort: "Engine", firstHalf: summary(n / 2, gp / 2, gl / 2, cash / 2), secondHalf: summary(n / 2, gp / 2, gl / 2, cash / 2) }],
    hours: Array.from({ length: 6 }, (_, i) => ({ t: startT + i * H, engine: summary(n / 6, gp / 6, gl / 6, cash / 6) })),
    eligibility: { basePolicyVerified: true }, performance: { mem: { computeLevel: 0, fallback: 0, aborts: 0 }, coverage: { expectedCombos: 100, evaluated: 100 } },
    account: { startingBalance: 10, unknownAllocations: 0, closedNetUsd: reportedCash, markedEndingEquity: markedEnd, equityMaxDdPct: drawdown } };
  const assessment = assessReplayCandidate(audit, data, { protocol, protocolSha256, reportSha256 });
  const feedEvidence = { schema: "cts-verified-public-feed-v1", sha256: FEED, collector: "binance-usdm-public-archives",
    from: "2026-09-24T00:00:00.000Z", to: "2026-10-17T00:00:00.000Z", symbols: [...DEVELOPMENT_SYMBOLS, "OP-USDT", "XLM-USDT"],
    tfs: [1, 5, 15, 30, 60], verifiedArchives: 506, checksumsVerified: true, gaps: 0, duplicates: 0 };
  return { profile, status: "complete", commit: COMMIT, study: audit.provenance.study, auditChecksOk: audit.checksOk, feedEvidence,
    assessment: { researchCandidate: assessment.researchCandidate, metrics: assessment.metrics, failedCriteria: assessment.failedCriteria,
      automaticPromotion: assessment.automaticPromotion, defaultsChanged: assessment.defaultsChanged } };
}
const inputs = () => DEVELOPMENT_PROFILES.map((profile) => compact(profile));
const select = (rows) => selectReplayCandidate(rows, { expectedCommit: COMMIT });
const hasFailure = (decision, suffix) => decision.failures.some((x) => x.id === suffix || x.id.endsWith(`.${suffix}`));

describe("predeclared refinement cohort", () => {
  const rows = () => REFINEMENT_PROFILES.map((profile) => compact(profile));
  const refine = (input, group = "refinement") => selectReplayCandidate(input, { expectedCommit: COMMIT, group });
  it("qualifies and ranks actual assessor outputs for the declared refinement arms", () => {
    const input = rows(), result = refine(input);
    assert.equal(result.validationOk, true, JSON.stringify(result.failures));
    assert.equal(result.selected, "entry25plain");
    assert.equal(result.group, "refinement");
    assert.equal(result.automaticPromotion, false);
    assert.equal(result.defaultsChanged, false);
  });
  it("keeps complete losing refinement outcomes and leaves the final closed", () => {
    const result = refine(REFINEMENT_PROFILES.map((profile) => compact(profile, { pf: .8 })));
    assert.equal(result.validationOk, true, JSON.stringify(result.failures));
    assert.equal(result.selected, null);
    assert.equal(result.results.length, 3);
  });
  it("rejects both directions of group mixing and unknown profile groups", () => {
    for (const [input, group] of [[inputs(), "refinement"], [rows(), "initial"], [rows(), "other"]]) {
      const result = refine(input, group);
      assert.equal(result.validationOk, false);
      assert.equal(result.selected, null);
      assert.ok(hasFailure(result, "exact-three-profiles"));
    }
    const mixed = rows(); mixed[1] = compact("entry25");
    assert.equal(refine(mixed).validationOk, false);
  });
  it("cannot substitute a renamed initial study for a refinement protocol identity", () => {
    const input = rows(); input[0].study.id = "verified-full-dev20";
    const result = refine(input);
    assert.equal(result.validationOk, false);
    assert.ok(hasFailure(result, "profile-study-identity"));
  });
});

describe("predeclared development replay candidate selector", () => {
  it("accepts actual assessor qualifying outputs without mutating inputs or authorizing promotion", () => {
    const rows = inputs(), before = structuredClone(rows);
    assert.equal(rows.every((x) => x.assessment.researchCandidate), true);
    const result = select(rows);
    assert.equal(result.validationOk, true, JSON.stringify(result.failures));
    assert.equal(result.selected, "entry25", "lexical profile name resolves an exact tie");
    assert.deepEqual(result.ranking.map((x) => x.profile), ["entry25", "expanded", "full"]);
    assert.equal(result.automaticPromotion, false);
    assert.equal(result.defaultsChanged, false);
    assert.deepEqual(rows, before);
    assert.match(result.nextStep, /final criteria still required/);
  });

  it("ranks higher engine Return PF before dollar/account results or close count", () => {
    const rows = [compact("full", { pf: 1.5, drawdown: .09, closes: 120 }), compact("entry25", { pf: 1.4, drawdown: .01, closes: 240 }), compact("expanded", { pf: 1.2 })];
    rows[2].assessment.metrics.combined.returnPf = 100;
    rows[2].assessment.metrics.combined.closedNetUsd = 1000;
    assert.equal(select(rows).selected, "full");
  });
  it("uses lower drawdown, then more funded engine closes, then lexical profile name", () => {
    const rows = [compact("full", { drawdown: .07 }), compact("entry25", { drawdown: .05 }), compact("expanded", { drawdown: .05, closes: 180 })];
    assert.equal(select(rows).selected, "expanded");
    rows[2].assessment.metrics.engine.fundedCloses = 120;
    assert.equal(select(rows).selected, "entry25");
    for (const permutation of [rows, [...rows].reverse(), [rows[1], rows[0], rows[2]]]) assert.equal(select(permutation).selected, "entry25");
  });
  it("retains complete losing, empty and no-loss arms without treating them as qualifying", () => {
    for (const options of [{ pf: .8 }, { empty: true }, { noLoss: true }]) {
      const rows = [compact("full"), compact("entry25", options), compact("expanded", { pf: .9 })];
      const before = structuredClone(rows[1].assessment.failedCriteria), result = select(rows);
      assert.equal(rows[1].assessment.researchCandidate, false);
      assert.equal(result.validationOk, true, JSON.stringify(result.failures));
      assert.equal(result.selected, "full");
      assert.deepEqual(result.results[1].failedCriteria, before);
      assert.equal(result.ranking.length, 1);
    }
  });
  it("returns no selected policy for three complete nonqualifying arms", () => {
    const result = select(DEVELOPMENT_PROFILES.map((profile) => compact(profile, { empty: true })));
    assert.equal(result.validationOk, true, JSON.stringify(result.failures));
    assert.equal(result.status, "no-qualifying-profile");
    assert.equal(result.selected, null);
    assert.equal(result.results.every((x) => x.failedCriteria.length > 0), true);
  });
  it("uses the actual assessor's exact tiny cash metric when its report rounds to zero", () => {
    for (const cashNet of [.4e-6, -.4e-6]) {
      const rows = [compact("full", { cashNet }), compact("entry25", { pf: .9 }), compact("expanded", { pf: .9 })];
      assert.equal(rows[0].assessment.metrics.combined.closedNetUsd, cashNet);
      assert.equal(rows[0].assessment.metrics.combined.reportedClosedNetUsd === 0, true, "zero and displayed negative zero cannot decide exact cash profitability");
      const result = select(rows);
      assert.equal(result.validationOk, true, JSON.stringify(result.failures));
      assert.equal(result.selected, cashNet > 0 ? "full" : null);
    }
  });
  it("accepts the verified extended feed's unknown-in-advance SHA and retains its public scope", () => {
    const result = select(inputs());
    assert.equal(result.validationOk, true);
    assert.equal(result.feedSha256, FEED);
    assert.equal(result.feedEvidence.from, "2026-09-24T00:00:00.000Z");
    assert.equal(result.feedEvidence.symbols.length, 22);
    assert.equal(result.feedEvidence.verifiedArchives, 506);
  });

  for (const [label, mutate, failure] of [
    ["missing result", (r) => r.pop(), "exact-three-profiles"],
    ["duplicate result", (r) => { r[2] = structuredClone(r[0]); }, "exact-three-profiles"],
    ["unexpected final result", (r) => { r[2].profile = "final"; }, "exact-three-profiles"],
    ["incomplete status", (r) => { r[2].status = "failed"; }, "completed"],
    ["failed strict audit", (r) => { r[2].auditChecksOk = false; }, "strict-audit"],
    ["other source commit", (r) => { r[2].commit = "2".repeat(40); }, "current-source-commit"],
    ["stale frozen checkpoint", (r) => { r[2].study.sourceCheckpoint = "2".repeat(40); }, "current-source-commit"],
    ["other economic source", (r) => { r[2].study.sourceSha256 = "b".repeat(64); }, "identical-economic-source"],
    ["missing source seal", (r) => { delete r[2].study.sourceSha256; }, "source-seal"],
    ["missing protocol seal", (r) => { delete r[2].study.protocolSha256; }, "protocol-seal"],
    ["same copied protocol", (r) => { r[2].study.protocolSha256 = r[0].study.protocolSha256; }, "distinct-profile-protocols"],
    ["wrong profile protocol identity", (r) => { r[2].study.id = "verified-full-dev20"; }, "profile-study-identity"],
    ["other feed", (r) => { r[2].study.feedSha256 = "b".repeat(64); }, "frozen-feed"],
    ["different verified feed between profiles", (r) => { r[2].study.feedSha256 = r[2].feedEvidence.sha256 = "b".repeat(64); }, "identical-public-feed"],
    ["missing public feed evidence", (r) => { delete r[2].feedEvidence; }, "public-feed-evidence"],
    ["wrong feed evidence schema", (r) => { r[2].feedEvidence.schema = "unverified"; }, "public-feed-evidence"],
    ["unverified feed collector", (r) => { r[2].feedEvidence.collector = "custom-cache"; }, "public-feed-evidence"],
    ["old truncated feed source", (r) => { r[2].feedEvidence.from = "2026-09-26T00:00:00.000Z"; r[2].feedEvidence.verifiedArchives = 462; }, "public-feed-evidence"],
    ["short public feed endpoint", (r) => { r[2].feedEvidence.to = "2026-10-16T00:00:00.000Z"; }, "public-feed-evidence"],
    ["missing feed symbol", (r) => { r[2].feedEvidence.symbols.pop(); }, "public-feed-evidence"],
    ["undeclared feed symbol", (r) => { r[2].feedEvidence.symbols[21] = "OTHER-USDT"; }, "public-feed-evidence"],
    ["duplicate feed symbol", (r) => { r[2].feedEvidence.symbols[21] = r[2].feedEvidence.symbols[0]; }, "public-feed-evidence"],
    ["missing feed timeframe", (r) => { r[2].feedEvidence.tfs.pop(); }, "public-feed-evidence"],
    ["duplicate feed timeframe", (r) => { r[2].feedEvidence.tfs[4] = 30; }, "public-feed-evidence"],
    ["unexpected feed timeframe", (r) => { r[2].feedEvidence.tfs[4] = 120; }, "public-feed-evidence"],
    ["missing archive verification", (r) => { delete r[2].feedEvidence.verifiedArchives; }, "public-feed-evidence"],
    ["incomplete archive verification", (r) => { r[2].feedEvidence.verifiedArchives = 505; }, "public-feed-evidence"],
    ["unverified archive checksums", (r) => { r[2].feedEvidence.checksumsVerified = false; }, "public-feed-evidence"],
    ["feed gaps", (r) => { r[2].feedEvidence.gaps = 1; }, "public-feed-evidence"],
    ["feed duplicate bars", (r) => { r[2].feedEvidence.duplicates = 1; }, "public-feed-evidence"],
    ["unrecorded feed continuity", (r) => { delete r[2].feedEvidence.gaps; }, "public-feed-evidence"],
    ["missing symbol", (r) => { r[2].study.symbols.pop(); }, "development-symbols"],
    ["unexpected symbol", (r) => { r[2].study.symbols[19] = "OTHER-USDT"; }, "development-symbols"],
    ["duplicate symbol", (r) => { r[2].study.symbols[19] = r[2].study.symbols[0]; }, "development-symbols"],
    ["shifted trade window", (r) => { r[2].study.window.tradeStartT += H; }, "development-window"],
    ["expanded performance history", (r) => { r[2].study.window.evaluationFromT -= H; }, "development-window"],
    ["missing prehistory boundary", (r) => { delete r[2].study.window.preH; }, "development-window"],
    ["missing assessment", (r) => { delete r[2].assessment; }, "assessment-state"],
    ["missing failed criteria", (r) => { delete r[2].assessment.failedCriteria; }, "assessment-state"],
    ["contradictory qualifying flag", (r) => { r[2].assessment.researchCandidate = false; }, "assessment-state"],
    ["automatic promotion", (r) => { r[2].assessment.automaticPromotion = true; }, "assessment-state"],
    ["defaults change", (r) => { r[2].assessment.defaultsChanged = true; }, "assessment-state"],
    ["missing ranking PF", (r) => { delete r[2].assessment.metrics.engine.returnPf; }, "complete-metrics"],
    ["infinite PF", (r) => { r[2].assessment.metrics.engine.returnPf = Infinity; }, "complete-metrics"],
    ["unknown close count", (r) => { r[2].assessment.metrics.engine.fundedCloses = null; }, "complete-metrics"],
    ["invalid symbol count", (r) => { r[2].assessment.metrics.engine.symbols = 21; }, "complete-metrics"],
    ["missing marked equity", (r) => { r[2].assessment.metrics.account.markedEndingEquity = null; }, "complete-metrics"],
    ["candidate with insufficient sample", (r) => { r[2].assessment.metrics.engine.fundedCloses = 99; }, "candidate-metrics"],
    ["candidate with low PF", (r) => { r[2].assessment.metrics.engine.returnPf = 1.09; }, "candidate-metrics"],
    ["candidate with negative half", (r) => { r[2].assessment.metrics.engine.secondHalfUnitNet = -.01; }, "candidate-metrics"],
    ["candidate with more red hours", (r) => { Object.assign(r[2].assessment.metrics.engine, { greenHours: 2, redHours: 4 }); }, "candidate-metrics"],
    ["candidate with excessive drawdown", (r) => { r[2].assessment.metrics.account.maximumDrawdown = .11; }, "candidate-metrics"],
  ]) it(`blocks the entire comparison for ${label}`, () => {
    const rows = inputs(); mutate(rows); const result = select(rows);
    assert.equal(result.validationOk, false);
    assert.equal(result.selected, null);
    assert.deepEqual(result.ranking, []);
    assert.equal(hasFailure(result, failure), true, JSON.stringify(result.failures));
  });

  it("rejects absent current-commit authority and nonarray input", () => {
    assert.equal(selectReplayCandidate(inputs()).selected, null);
    assert.equal(hasFailure(selectReplayCandidate(inputs()), "current-commit"), true);
    assert.equal(select({ full: compact("full") }).validationOk, false);
  });
  it("permits the same complete symbol set in a different order", () => {
    const rows = inputs(); rows[2].study.symbols.reverse(); rows[2].feedEvidence.symbols.reverse(); rows[2].feedEvidence.tfs.reverse();
    assert.equal(select(rows).validationOk, true);
  });
  for (const id of ["audit.strict", "protocol", "account-caps", "modeled-cost", "full-compute", "report.check.2", "engine-hours-evidence"]) {
    it(`blocks failed evidence criterion ${id} on a noncandidate sibling`, () => {
      const rows = inputs(); rows[2].assessment.researchCandidate = false;
      rows[2].assessment.failedCriteria = [{ id, ok: false, actual: false }];
      const result = select(rows);
      assert.equal(result.selected, null);
      assert.equal(hasFailure(result, "strict-evidence-criteria"), true);
      assert.deepEqual(result.results[2].failedCriteria, rows[2].assessment.failedCriteria);
    });
  }
  for (const [id, actual] of [["feasible", null], ["margin-shortfall", 0], ["no-ruin", { present: false }]]) {
    it(`rejects missing/malformed ${id} telemetry on a noncandidate sibling`, () => {
      const rows = inputs(); rows[2].assessment.researchCandidate = false;
      rows[2].assessment.failedCriteria = [{ id, ok: false, actual }];
      assert.equal(hasFailure(select(rows), "recorded-account-telemetry"), true);
    });
  }
  it("distinguishes missing nonempty chronological evidence from a genuine empty engine", () => {
    const rows = inputs(); rows[2].assessment.researchCandidate = false;
    rows[2].assessment.failedCriteria = [{ id: "engine-halves-evidence", ok: false, actual: { cells: 0, engineCloses: 120 } }];
    rows[2].assessment.metrics.engine.firstHalfUnitNet = null;
    const result = select(rows);
    assert.equal(result.selected, null);
    assert.equal(hasFailure(result, "nonempty-chronological-evidence"), true);
    assert.equal(hasFailure(result, "complete-metrics"), true);
  });
  for (const group of ["engine", "combined"]) it(`rejects unexplained null ${group} PF on a noncandidate sibling`, () => {
    const rows = inputs(); rows[2].assessment.researchCandidate = false;
    rows[2].assessment.metrics[group].returnPf = null;
    rows[2].assessment.failedCriteria = [{ id: `${group}-pf`, ok: false, actual: { state: "measured", noLoss: false, pf: null } }];
    const result = select(rows);
    assert.equal(result.selected, null);
    assert.equal(hasFailure(result, "explained-null-pf"), true);
  });
});

describe("development selection CLI", () => {
  it("honors the refinement group and emits its selected profile for the final job", () => {
    const dir = mkdtempSync(join(tmpdir(), "replay-refinement-"));
    try {
      const input = join(dir, "three.json"), out = join(dir, "decision.json"), githubOutput = join(dir, "github-output");
      writeFileSync(input, JSON.stringify(REFINEMENT_PROFILES.map(profile => compact(profile))));
      const run = spawnSync(process.execPath, ["scripts/select-replay-candidate.mjs", "--inputs", input, "--out", out, "--group", "refinement"],
        { encoding: "utf8", env: { ...process.env, GITHUB_SHA: COMMIT, GITHUB_OUTPUT: githubOutput } });
      assert.equal(run.status, 0, run.stderr);
      const decision = JSON.parse(readFileSync(out, "utf8"));
      assert.equal(decision.group, "refinement");
      assert.equal(decision.selected, "entry25plain");
      assert.equal(readFileSync(githubOutput, "utf8"), "selected=entry25plain\n");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("writes a validated JSON decision and a simple selected GitHub output from compact evidence only", () => {
    const dir = mkdtempSync(join(tmpdir(), "replay-selection-"));
    try {
      const input = join(dir, "three.json"), out = join(dir, "decision.json"), githubOutput = join(dir, "github-output");
      const rows = inputs(), original = JSON.stringify(rows); writeFileSync(input, original);
      const run = spawnSync(process.execPath, ["scripts/select-replay-candidate.mjs", "--inputs", input, "--out", out],
        { encoding: "utf8", env: { ...process.env, GITHUB_SHA: COMMIT, GITHUB_OUTPUT: githubOutput } });
      assert.equal(run.status, 0, run.stderr);
      assert.equal(JSON.parse(readFileSync(out, "utf8")).selected, "entry25");
      assert.equal(readFileSync(githubOutput, "utf8"), "selected=entry25\n");
      assert.equal(readFileSync(input, "utf8"), original);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("writes every failure, clears selected and fails the command for an incomplete arm", () => {
    const dir = mkdtempSync(join(tmpdir(), "replay-selection-"));
    try {
      const input = join(dir, "three.json"), out = join(dir, "decision.json"), githubOutput = join(dir, "github-output");
      const rows = inputs(); rows[1].status = "failed"; rows[2].study.feedSha256 = "bad";
      writeFileSync(input, JSON.stringify(rows));
      const run = spawnSync(process.execPath, ["scripts/select-replay-candidate.mjs", "--inputs", input, "--out", out, "--commit", COMMIT],
        { encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: githubOutput } });
      assert.equal(run.status, 1, run.stderr);
      const result = JSON.parse(readFileSync(out, "utf8"));
      assert.equal(result.selected, null);
      assert.equal(hasFailure(result, "completed"), true);
      assert.equal(hasFailure(result, "frozen-feed"), true);
      assert.equal(readFileSync(githubOutput, "utf8"), "selected=\n");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
