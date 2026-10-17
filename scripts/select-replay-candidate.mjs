#!/usr/bin/env node
// Select one predeclared development policy for an untouched final check. No final outcomes or live settings are read.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEVELOPMENT_PROFILES = Object.freeze(["full", "entry25", "expanded"]);
export const REFINEMENT_PROFILES = Object.freeze(["entry5strict", "entry25strict", "entry25plain"]);
export const DEVELOPMENT_PROFILE_GROUPS = Object.freeze({ initial: DEVELOPMENT_PROFILES, refinement: REFINEMENT_PROFILES });
export const DEVELOPMENT_SYMBOLS = Object.freeze(["BTC-USDT", "ETH-USDT", "BNB-USDT", "SOL-USDT", "XRP-USDT", "DOGE-USDT", "ADA-USDT", "AVAX-USDT",
  "LINK-USDT", "LTC-USDT", "DOT-USDT", "ATOM-USDT", "APT-USDT", "NEAR-USDT", "SUI-USDT", "TRX-USDT", "UNI-USDT", "FIL-USDT", "ETC-USDT", "ARB-USDT"]);
export const DEVELOPMENT_FEED_SCOPE = Object.freeze({ schema: "cts-verified-public-feed-v1", collector: "binance-usdm-public-archives",
  from: "2026-09-24T00:00:00.000Z", to: "2026-10-17T00:00:00.000Z", symbols: Object.freeze([...DEVELOPMENT_SYMBOLS, "OP-USDT", "XLM-USDT"]),
  tfs: Object.freeze([1, 5, 15, 30, 60]), verifiedArchives: 506, checksumsVerified: true, gaps: 0, duplicates: 0 });
export const DEVELOPMENT_WINDOW = Object.freeze({ evaluationFromT: Date.UTC(2026, 9, 12, 3), tradeStartT: Date.UTC(2026, 9, 12, 9),
  endT: Date.UTC(2026, 9, 12, 15), preH: 6, runH: 6 });
const finite = (x) => typeof x === "number" && Number.isFinite(x);
const count = (x) => Number.isInteger(x) && x >= 0;
const hash = (x, length) => typeof x === "string" && new RegExp(`^[a-f0-9]{${length}}$`).test(x);
const sameSet = (xs, expected) => Array.isArray(xs) && xs.length === expected.length && new Set(xs).size === xs.length && xs.every((x) => expected.includes(x));
const verifiedFeed = (value, studySha) => !!value && hash(value.sha256, 64) && value.sha256 === studySha &&
  Object.entries(DEVELOPMENT_FEED_SCOPE).every(([key, expected]) => Array.isArray(expected) ? sameSet(value[key], expected) : value[key] === expected);
const evidenceFailures = new Set(["audit.schema", "purpose", "audit.strict", "audit.checks-present", "report.strict", "report.checks-present",
  "ownership", "base-policy", "full-compute", "report-hash", "scope", "protocol", "modeled-cost", "account-caps", "combined-sample", "starting-balance", "engine-hours-evidence"]);
const isEvidenceFailure = (x) => evidenceFailures.has(x.id) || x.id.startsWith("audit.check.") || x.id.startsWith("report.check.");
const metricFields = { engine: ["fundedCloses", "symbols", "returnPf", "firstHalfUnitNet", "secondHalfUnitNet", "greenHours", "redHours", "flatActiveHours"],
  combined: ["returnPf", "closedNetUsd"], account: ["startingBalance", "markedEndingEquity", "minimumEquity", "maximumDrawdown"] };

/**
 * Input is exactly three CI compact objects:
 * { profile, status:'complete', commit, study:audit.provenance.study, auditChecksOk, feedEvidence,
 *   assessment:{researchCandidate,metrics,failedCriteria,automaticPromotion:false,defaultsChanged:false} }.
 * Null PF may describe empty/no-loss noncandidates; a zero-close engine may also have null chronological halves.
 * Missing account telemetry, counts or nonempty chronological evidence is incomplete.
 */
export function selectReplayCandidate(inputs, { expectedCommit, group = "initial" } = {}) {
  const checks = [], check = (id, ok, actual = null, expected = true, profile = null) =>
    checks.push({ id, profile, ok: ok === true, actual: actual ?? null, expected });
  const rows = Array.isArray(inputs) ? inputs : [];
  const profiles = DEVELOPMENT_PROFILE_GROUPS[group] ?? [];
  check("predeclared-profile-group", profiles.length === 3, group, Object.keys(DEVELOPMENT_PROFILE_GROUPS));
  check("current-commit", hash(expectedCommit, 40), expectedCommit, "full current Git commit SHA");
  check("exact-three-profiles", Array.isArray(inputs) && rows.length === 3 && profiles.length === 3 && profiles.every((profile) => rows.filter((x) => x?.profile === profile).length === 1),
    rows.map((x) => x?.profile ?? null), profiles);
  const results = rows.map((row, index) => {
    const profile = row?.profile, study = row?.study, a = row?.assessment, m = a?.metrics;
    const own = (id, ok, actual = null, expected = true) => check(`${index}.${id}`, ok, actual, expected, profile ?? null);
    own("profile", profiles.includes(profile), profile, profiles);
    own("completed", row?.status === "complete", row?.status, "complete");
    own("strict-audit", row?.auditChecksOk === true, row?.auditChecksOk);
    own("current-source-commit", hash(row?.commit, 40) && row.commit === expectedCommit && study?.sourceCheckpoint === expectedCommit,
      { commit: row?.commit, sourceCheckpoint: study?.sourceCheckpoint }, expectedCommit);
    own("source-seal", hash(study?.sourceSha256, 64), study?.sourceSha256, "SHA256");
    own("protocol-seal", hash(study?.protocolSha256, 64), study?.protocolSha256, "SHA256");
    own("profile-study-identity", study?.id === `verified-${profile}-dev20`, study?.id, `verified-${profile}-dev20`);
    own("frozen-feed", hash(study?.feedSha256, 64) && row?.feedEvidence?.sha256 === study.feedSha256, study?.feedSha256, "valid SHA256 bound to the independently verified public feed");
    own("public-feed-evidence", verifiedFeed(row?.feedEvidence, study?.feedSha256), row?.feedEvidence, DEVELOPMENT_FEED_SCOPE);
    own("development-symbols", sameSet(study?.symbols, DEVELOPMENT_SYMBOLS), study?.symbols, DEVELOPMENT_SYMBOLS);
    own("development-window", Object.entries(DEVELOPMENT_WINDOW).every(([key, value]) => study?.window?.[key] === value), study?.window, DEVELOPMENT_WINDOW);
    const failuresKnown = Array.isArray(a?.failedCriteria) && a.failedCriteria.every((x) => x && typeof x.id === "string" && x.id.length > 0 && x.ok === false);
    own("assessment-state", typeof a?.researchCandidate === "boolean" && a?.automaticPromotion === false && a?.defaultsChanged === false && failuresKnown &&
      a.researchCandidate === (a.failedCriteria.length === 0),
      { researchCandidate: a?.researchCandidate, automaticPromotion: a?.automaticPromotion, defaultsChanged: a?.defaultsChanged, failedCriteria: a?.failedCriteria });
    own("strict-evidence-criteria", failuresKnown && !a.failedCriteria.some(isEvidenceFailure), failuresKnown ? a.failedCriteria.filter(isEvidenceFailure) : null, []);
    const fieldsKnown = Object.entries(metricFields).every(([group, fields]) => !!m?.[group] && fields.every((field) =>
      Object.hasOwn(m[group], field) && (m[group][field] === null || finite(m[group][field]))));
    const metricsKnown = fieldsKnown && ["fundedCloses", "symbols", "greenHours", "redHours", "flatActiveHours"].every((key) => count(m.engine[key])) &&
      m.engine.symbols <= Math.min(DEVELOPMENT_SYMBOLS.length, m.engine.fundedCloses) &&
      m.engine.greenHours + m.engine.redHours + m.engine.flatActiveHours <= DEVELOPMENT_WINDOW.runH &&
      [m.engine.returnPf, m.combined.returnPf].every((pf) => pf === null || pf >= 0) &&
      [m.engine.firstHalfUnitNet, m.engine.secondHalfUnitNet].every((net) => finite(net) || (m.engine.fundedCloses === 0 && net === null)) &&
      finite(m.combined.closedNetUsd) && metricFields.account.every((key) => finite(m.account[key]));
    own("complete-metrics", metricsKnown, m);
    const pfFailure = (id) => failuresKnown ? a.failedCriteria.find((x) => x.id === id)?.actual : null;
    const enginePfFailure = pfFailure("engine-pf"), combinedPfFailure = pfFailure("combined-pf");
    const explainedNullPf = metricsKnown && (m.engine.returnPf !== null || m.engine.fundedCloses === 0 ||
      (enginePfFailure?.state === "no-loss" && enginePfFailure.noLoss === true && enginePfFailure.gl === 0 && finite(enginePfFailure.gp) && enginePfFailure.gp > 0)) &&
      (m.combined.returnPf !== null || (combinedPfFailure?.state === "empty" && combinedPfFailure.noLoss === false) ||
        (combinedPfFailure?.state === "no-loss" && combinedPfFailure.noLoss === true));
    own("explained-null-pf", explainedNullPf, { engine: enginePfFailure, combined: combinedPfFailure }, "null PF has recorded empty/no-loss evidence");
    own("nonempty-chronological-evidence", failuresKnown && (m?.engine?.fundedCloses === 0 || !a.failedCriteria.some((x) => x.id === "engine-halves-evidence")),
      failuresKnown ? a.failedCriteria.filter((x) => x.id === "engine-halves-evidence") : null, []);
    const telemetryKnown = failuresKnown && a.failedCriteria.every((x) => {
      if (x.id === "feasible") return typeof x.actual === "boolean";
      if (x.id === "no-ruin") return x.actual?.present === true && finite(x.actual.ruinT);
      if (x.id === "margin-shortfall") return count(x.actual?.minutes) && (x.actual.firstT === null || finite(x.actual.firstT)) &&
        finite(x.actual.maxRatio) && x.actual.maxRatio >= 0;
      return true;
    });
    own("recorded-account-telemetry", telemetryKnown, failuresKnown ? a.failedCriteria.filter((x) => ["feasible", "no-ruin", "margin-shortfall"].includes(x.id)) : null);
    // An assessment flag cannot substitute for its recorded positive criteria or missing ranking metrics.
    const candidateMetrics = metricsKnown && count(m.engine.fundedCloses) && m.engine.fundedCloses >= 100 && count(m.engine.symbols) && m.engine.symbols >= 3 &&
      finite(m.engine.returnPf) && m.engine.returnPf >= 1.10 && finite(m.engine.firstHalfUnitNet) && m.engine.firstHalfUnitNet > 0 &&
      finite(m.engine.secondHalfUnitNet) && m.engine.secondHalfUnitNet > 0 && count(m.engine.greenHours) && count(m.engine.redHours) &&
      m.engine.greenHours >= m.engine.redHours && finite(m.combined.returnPf) && m.combined.returnPf >= 1.05 &&
      finite(m.combined.closedNetUsd) && m.combined.closedNetUsd > 0 && finite(m.account.startingBalance) && m.account.startingBalance > 0 &&
      finite(m.account.markedEndingEquity) && m.account.markedEndingEquity >= m.account.startingBalance && finite(m.account.minimumEquity) &&
      m.account.minimumEquity > 0 && finite(m.account.maximumDrawdown) && m.account.maximumDrawdown >= 0 && m.account.maximumDrawdown <= .10;
    own("candidate-metrics", a?.researchCandidate === false || candidateMetrics, m, "qualifying assessment metrics when researchCandidate=true");
    return { profile: profile ?? null, status: row?.status ?? null, researchCandidate: a?.researchCandidate ?? null,
      metrics: m ?? null, failedCriteria: Array.isArray(a?.failedCriteria) ? a.failedCriteria : null };
  });
  const sourceSeals = rows.map((x) => x?.study?.sourceSha256), protocolSeals = rows.map((x) => x?.study?.protocolSha256), feedSeals = rows.map((x) => x?.study?.feedSha256);
  check("identical-economic-source", rows.length === 3 && sourceSeals.every((x) => hash(x, 64)) && new Set(sourceSeals).size === 1, sourceSeals, "one shared source SHA256");
  check("distinct-profile-protocols", rows.length === 3 && protocolSeals.every((x) => hash(x, 64)) && new Set(protocolSeals).size === 3, protocolSeals, "three distinct frozen profile protocols");
  check("identical-public-feed", rows.length === 3 && feedSeals.every((x) => hash(x, 64)) && new Set(feedSeals).size === 1, feedSeals, "one shared independently verified public feed SHA256");
  const valid = checks.every((x) => x.ok);
  const ranked = valid ? results.filter((x) => x.researchCandidate === true).sort((a, b) => b.metrics.engine.returnPf - a.metrics.engine.returnPf ||
    a.metrics.account.maximumDrawdown - b.metrics.account.maximumDrawdown || b.metrics.engine.fundedCloses - a.metrics.engine.fundedCloses ||
    (a.profile < b.profile ? -1 : a.profile > b.profile ? 1 : 0)) : [];
  return { schema: "cts-development-replay-selection-v1", validationOk: valid,
    status: !valid ? "incomplete-or-mismatched" : ranked.length ? "selected-for-final-check" : "no-qualifying-profile",
    selected: ranked[0]?.profile ?? null, group, automaticPromotion: false, defaultsChanged: false, selectionScope: "predeclared development only",
    expectedCommit: expectedCommit ?? null, sourceSha256: valid ? sourceSeals[0] : null, feedSha256: valid ? feedSeals[0] : null,
    feedEvidence: valid ? rows[0].feedEvidence : null, requiredFeedScope: DEVELOPMENT_FEED_SCOPE,
    window: DEVELOPMENT_WINDOW, symbols: DEVELOPMENT_SYMBOLS,
    ranking: ranked.map((x) => ({ profile: x.profile, engineReturnPf: x.metrics.engine.returnPf, maximumDrawdown: x.metrics.account.maximumDrawdown, fundedEngineCloses: x.metrics.engine.fundedCloses })),
    rankingRule: "Higher finite post-Base engine Return PF, then lower marked equity drawdown, then more funded engine closes, then lexical profile name.",
    results, checks, failures: checks.filter((x) => !x.ok),
    nextStep: ranked.length ? "Run only the selected unchanged policy on the untouched final 22-symbol window; final criteria still required and no automatic promotion follows."
      : !valid ? "Complete and reconcile all three matching development results before selecting any final-check policy."
        : "No policy qualifies for the untouched final check; retain every losing or empty result without changing defaults." };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), usage = "Usage: node scripts/select-replay-candidate.mjs --inputs three-results.json --out decision.json [--commit CURRENT_SHA] [--group initial|refinement]";
  if (args.length === 1 && args[0] === "--help") process.stdout.write(usage + "\nExpected commit defaults to GITHUB_SHA. GITHUB_OUTPUT receives one validated profile from the requested predeclared group, or an empty value.\n");
  else {
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!["--inputs", "--out", "--commit", "--group"].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith("--") || options[args[i]]) throw new Error(usage);
      options[args[i]] = args[i + 1];
    }
    if (!options["--inputs"] || !options["--out"]) throw new Error(usage);
    const input = resolve(options["--inputs"]), output = resolve(options["--out"]), githubOutput = process.env.GITHUB_OUTPUT && resolve(process.env.GITHUB_OUTPUT);
    if (input === output || githubOutput === input || githubOutput === output) throw new Error("Decision and GitHub outputs must not overwrite development input evidence");
    const result = selectReplayCandidate(JSON.parse(readFileSync(input, "utf8")), { expectedCommit: options["--commit"] ?? process.env.GITHUB_SHA, group: options["--group"] ?? "initial" });
    mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
    if (githubOutput) appendFileSync(githubOutput, `selected=${result.selected ?? ""}\n`);
    process.stdout.write(JSON.stringify({ out: output, validationOk: result.validationOk, selected: result.selected, status: result.status, failures: result.failures }) + "\n");
    process.exitCode = result.validationOk ? 0 : 1;
  }
}
