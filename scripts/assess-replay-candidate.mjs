#!/usr/bin/env node
// Read-only research assessment of an already reconciled frozen replay. This never changes defaults or promotes live trading.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const H = 3_600_000;
const finite = (x) => typeof x === "number" && Number.isFinite(x);
const count = (x) => Number.isInteger(x) && x >= 0;
const near = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const canonical = (x) => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object"
  ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, canonical(x[key])])) : x;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashKnown = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const symbolsKnown = (xs) => Array.isArray(xs) && xs.length > 0 && xs.every((x) => typeof x === "string" && x.length > 0) && new Set(xs).size === xs.length;
const sameSymbols = (a, b) => symbolsKnown(a) && symbolsKnown(b) && same([...a].sort(), [...b].sort());
const summaryKnown = (x) => !!x && count(x.closes) && x.unknownReturns === 0 && finite(x.unitGp) && x.unitGp >= 0 &&
  finite(x.unitGl) && x.unitGl >= 0 && near(x.unitNet, x.unitGp - x.unitGl) && (x.closes > 0 || x.unitGp + x.unitGl === 0);
const measuredPf = (x) => summaryKnown(x) && x.state === "measured" && x.noLoss === false && x.unitGl > 0 &&
  finite(x.exactPf) && near(x.exactPf, x.unitGp / x.unitGl);

export const REPLAY_CANDIDATE_POLICY = Object.freeze({ engineCloses: 100, engineSymbols: 3, enginePf: 1.10,
  combinedPf: 1.05, maxEquityDrawdown: 0.10, cost: 0.0015, maxPositionX: 0.75, maxExposureX: 7 });

const developmentSymbols = Object.freeze(["BTC-USDT", "ETH-USDT", "BNB-USDT", "SOL-USDT", "XRP-USDT", "DOGE-USDT", "ADA-USDT", "AVAX-USDT",
  "LINK-USDT", "LTC-USDT", "DOT-USDT", "ATOM-USDT", "APT-USDT", "NEAR-USDT", "SUI-USDT", "TRX-USDT", "UNI-USDT", "FIL-USDT", "ETC-USDT", "ARB-USDT"]);
// Predeclared in docs/simulations/exact-signal-22-study-20261017.md. A shorter final run is not final evidence.
export const REPLAY_CANDIDATE_SCOPES = Object.freeze({
  development: Object.freeze({ symbols: developmentSymbols, window: Object.freeze({ evaluationFromT: Date.UTC(2026, 9, 12, 3),
    tradeStartT: Date.UTC(2026, 9, 12, 9), endT: Date.UTC(2026, 9, 12, 15), preH: 6, runH: 6 }) }),
  final: Object.freeze({ symbols: Object.freeze([...developmentSymbols, "OP-USDT", "XLM-USDT"]), window: Object.freeze({ evaluationFromT: Date.UTC(2026, 9, 15, 15),
    tradeStartT: Date.UTC(2026, 9, 15, 21), endT: Date.UTC(2026, 9, 16, 21), preH: 6, runH: 24 }) }),
});

/** Hash arguments refer to the original report/protocol bytes, not a reserialized parsed object. */
export function assessReplayCandidate(audit, data, { protocol = null, reportSha256 = null, protocolSha256 = null } = {}) {
  const p = REPLAY_CANDIDATE_POLICY, criteria = [];
  const check = (id, label, ok, actual = null, required = true) => criteria.push({ id, label, ok: ok === true, actual: actual ?? null, required });
  const sourceChecks = (name, value) => {
    check(`${name}.checks-present`, `${name} has a complete nonempty check list`, Array.isArray(value) && value.length > 0, Array.isArray(value) ? value.length : null, "> 0");
    for (const [i, row] of (Array.isArray(value) ? value : []).entries())
      check(`${name}.check.${i}`, `${name}: ${row?.name ?? `check ${i + 1}`}`, row?.ok === true, row, true);
  };
  const engineRows = Array.isArray(audit?.cohorts) ? audit.cohorts.filter((x) => x?.key === "Engine") : [];
  const engine = engineRows.length === 1 ? engineRows[0] : null, combined = audit?.total;
  const startT = audit?.window?.startT, endT = audit?.window?.endT;
  const windowKnown = finite(startT) && finite(endT) && endT > startT;
  const cells = Array.isArray(audit?.cells) ? audit.cells.filter((x) => x?.cohort === "Engine") : [];
  const cellKeys = cells.map((x) => x.key);
  const cellsKnown = cells.length > 0 && cellKeys.every((x) => typeof x === "string" && x.length > 0) && new Set(cellKeys).size === cells.length &&
    cells.every((x) => summaryKnown(x) && summaryKnown(x.firstHalf) && summaryKnown(x.secondHalf) &&
      x.firstHalf.closes + x.secondHalf.closes === x.closes && near(x.firstHalf.unitGp + x.secondHalf.unitGp, x.unitGp) &&
      near(x.firstHalf.unitGl + x.secondHalf.unitGl, x.unitGl) && near(x.firstHalf.unitNet + x.secondHalf.unitNet, x.unitNet));
  const sumCells = (get) => cellsKnown ? cells.reduce((sum, x) => sum + get(x), 0) : null;
  const firstHalf = sumCells((x) => x.firstHalf.unitNet), secondHalf = sumCells((x) => x.secondHalf.unitNet);
  const cellsReconcile = cellsKnown && summaryKnown(engine) && sumCells((x) => x.closes) === engine.closes &&
    near(sumCells((x) => x.unitGp), engine.unitGp) && near(sumCells((x) => x.unitGl), engine.unitGl);
  const hours = Array.isArray(audit?.hours) ? audit.hours : [];
  const hoursKnown = windowKnown && hours.length === Math.ceil((endT - startT) / H) && hours.every((x, i) =>
    x.t === startT + i * H && summaryKnown(x.engine));
  const hourSum = (get) => hoursKnown ? hours.reduce((sum, x) => sum + get(x.engine), 0) : null;
  const hoursReconcile = hoursKnown && summaryKnown(engine) && hourSum((x) => x.closes) === engine.closes &&
    near(hourSum((x) => x.unitGp), engine.unitGp) && near(hourSum((x) => x.unitGl), engine.unitGl);
  const green = hoursKnown ? hours.filter((x) => x.engine.closes > 0 && x.engine.unitNet > 0).length : null;
  const red = hoursKnown ? hours.filter((x) => x.engine.closes > 0 && x.engine.unitNet < 0).length : null;
  const flat = hoursKnown ? hours.filter((x) => x.engine.closes > 0 && x.engine.unitNet === 0).length : null;
  const total = data?.total, account = audit?.account, study = audit?.provenance?.study;
  const declaredScope = audit?.purpose === "development" ? REPLAY_CANDIDATE_SCOPES.development : audit?.purpose === "final" ? REPLAY_CANDIDATE_SCOPES.final : null;
  const declaredWindow = !!declaredScope && Object.entries(declaredScope.window).every(([key, value]) => study?.window?.[key] === value);

  check("audit.schema", "Independent audit schema is supported", audit?.schema === "cts-session-study-audit-v1", audit?.schema);
  check("purpose", "Assessment is a development or final research window", ["development", "final"].includes(audit?.purpose), audit?.purpose, "development | final");
  check("audit.strict", "Independent reconciliation passed", audit?.checksOk === true, audit?.checksOk);
  sourceChecks("audit", audit?.checks);
  check("report.strict", "Report consistency checks passed", data?.checksOk === true, data?.checksOk);
  sourceChecks("report", data?.checks);
  check("ownership", "Funded ownership and unit returns are fully recorded", audit?.provenance?.actualExecution === false &&
    audit?.provenance?.missingAllocationRows === false && account?.unknownAllocations === 0 && combined?.unknownReturns === 0 && combined?.unknownCash === 0,
    { actualExecution: audit?.provenance?.actualExecution, missingAllocationRows: audit?.provenance?.missingAllocationRows, unknownAllocations: account?.unknownAllocations,
      unknownReturns: combined?.unknownReturns, unknownCash: combined?.unknownCash });
  check("base-policy", "Causal Base and independent range qualification are verified", audit?.eligibility?.basePolicyVerified === true, audit?.eligibility?.basePolicyVerified);
  const mem = audit?.performance?.mem, coverage = audit?.performance?.coverage;
  check("full-compute", "Complete configured coverage without memory degradation", !!mem && ["computeLevel", "fallback", "aborts"].every((k) => mem[k] === 0) &&
    count(coverage?.expectedCombos) && coverage.expectedCombos > 0 && coverage.evaluated === coverage.expectedCombos,
    { computeLevel: mem?.computeLevel, fallback: mem?.fallback, aborts: mem?.aborts, expectedCombos: coverage?.expectedCombos, evaluated: coverage?.evaluated });
  check("report-hash", "Allocation report is the exact independently audited file", hashKnown(reportSha256) && audit?.provenance?.inputSha256?.allocationReport === reportSha256,
    { reportSha256, auditedSha256: audit?.provenance?.inputSha256?.allocationReport });
  check("scope", "Audit and report match the predeclared purpose's frozen symbol/time window", windowKnown && declaredWindow &&
    startT === declaredScope.window.tradeStartT && endT === declaredScope.window.endT && audit.window.hours === declaredScope.window.runH && same(study, data?.study) &&
    same(study.window, protocol?.window) && data?.window?.startT === startT && data?.window?.endT === endT &&
    data.window.preStartT === declaredScope.window.evaluationFromT && data.window.preH === declaredScope.window.preH && data.window.runH === declaredScope.window.runH &&
    sameSymbols(study.symbols, declaredScope.symbols) && sameSymbols(audit?.window?.symbols, declaredScope.symbols) && sameSymbols(audit?.window?.symbols, data?.symbols),
    { purpose: audit?.purpose, study: study?.id, frozenWindow: study?.window, auditWindow: audit?.window, symbols: study?.symbols }, declaredScope);
  check("protocol", "Protocol identity, checksum, source and feed match the audited study", protocol?.schema === "cts-session-study-v1" &&
    hashKnown(protocolSha256) && protocolSha256 === study?.protocolSha256 && protocolSha256 === audit?.provenance?.inputSha256?.protocol &&
    protocol?.id === study?.id && hashKnown(study?.sourceSha256) && protocol?.source?.sha256 === study.sourceSha256 &&
    hashKnown(study?.feedSha256) && protocol?.feed?.sha256 === study.feedSha256 && protocol?.window?.tradeStartT === startT &&
    protocol?.window?.endT === endT && sameSymbols(protocol?.symbols, audit?.window?.symbols), { protocol: protocol?.id, protocolSha256 });
  check("modeled-cost", "Frozen settings, walk-forward and report use 0.15% modeled cost", protocol?.actualSettings?.cost === p.cost &&
    protocol?.actualWf?.cost === p.cost && data?.settings?.cost === p.cost,
    { settings: protocol?.actualSettings?.cost, walkForward: protocol?.actualWf?.cost, report: data?.settings?.cost }, p.cost);
  check("account-caps", "Frozen and applied account caps are 0.75 position / 7 gross", protocol?.actualSettings?.live?.maxPositionX === p.maxPositionX &&
    protocol?.actualSettings?.live?.maxExposureX === p.maxExposureX && total?.caps?.on === true && total.caps.maxPositionX === p.maxPositionX && total.caps.maxExposureX === p.maxExposureX,
    { frozen: { maxPositionX: protocol?.actualSettings?.live?.maxPositionX, maxExposureX: protocol?.actualSettings?.live?.maxExposureX },
      applied: { on: total?.caps?.on, maxPositionX: total?.caps?.maxPositionX, maxExposureX: total?.caps?.maxExposureX } },
    { maxPositionX: p.maxPositionX, maxExposureX: p.maxExposureX });

  check("engine-sample", "Post-Base engine has at least 100 funded settled closes", count(engine?.closes) && engine.closes >= p.engineCloses, engine?.closes, p.engineCloses);
  check("engine-symbols", "Engine funded cohort spans at least three symbols", count(engine?.symbols) && engine.symbols >= p.engineSymbols, engine?.symbols, p.engineSymbols);
  check("engine-pf", "Engine has measured finite Return PF at least 1.10", measuredPf(engine) && engine.exactPf >= p.enginePf,
    { state: engine?.state, noLoss: engine?.noLoss, pf: engine?.exactPf, gp: engine?.unitGp, gl: engine?.unitGl }, p.enginePf);
  check("engine-halves-evidence", "Exact engine cells and chronological halves reconcile to the funded cohort", cellsReconcile, { cells: cells.length, engineCloses: engine?.closes });
  check("engine-first-half", "Engine unit net is positive in the first chronological half", cellsReconcile && finite(firstHalf) && firstHalf > 0, firstHalf, "> 0");
  check("engine-second-half", "Engine unit net is positive in the second chronological half", cellsReconcile && finite(secondHalf) && secondHalf > 0, secondHalf, "> 0");
  check("engine-hours-evidence", "Every engine hour is recorded and reconciles to its funded cohort", hoursReconcile, { hours: hours.length, startT, endT });
  check("engine-green-hours", "Engine green hours are at least red active hours using unit net", hoursReconcile && green >= red, { green, red, flat }, "green >= red");
  check("combined-sample", "Combined funded count reconciles and contains the engine cohort", count(combined?.closes) && combined.closes === total?.fundedOrders &&
    count(engine?.closes) && engine.closes <= combined.closes && symbolsKnown(audit?.window?.symbols) && count(engine?.symbols) && engine.symbols <= audit.window.symbols.length,
    { combined: combined?.closes, report: total?.fundedOrders, engine: engine?.closes });
  check("combined-pf", "Combined book has measured finite Return PF at least 1.05", measuredPf(combined) && combined.exactPf >= p.combinedPf &&
    total?.pfBasis === "unit-net-returns" && total?.noLoss === false && total?.unknownReturns === 0 && total?.unknownReturnTotals === 0 &&
    near(total?.gpR, combined.unitGp) && near(total?.glR, combined.unitGl) && near(total?.pf, combined.exactPf),
    { state: combined?.state, noLoss: combined?.noLoss, pf: combined?.exactPf, reportPf: total?.pf }, p.combinedPf);
  check("combined-cash-net", "Combined funded closed cash net is positive and reconciled", finite(total?.net) && total.net > 0 && near(total.net, account?.closedNetUsd) &&
    near(total.net, combined?.sizedNetUsd), { report: total?.net, account: account?.closedNetUsd, audited: combined?.sizedNetUsd }, "> 0");
  const balance = account?.startingBalance;
  check("starting-balance", "Starting balance is positive and matches report and protocol", finite(balance) && balance > 0 &&
    near(balance, data?.settings?.balance0) && near(balance, protocol?.account?.balance), { audit: balance, report: data?.settings?.balance0, protocol: protocol?.account?.balance });
  check("ending-equity", "Marked ending equity is at least starting balance", finite(balance) && balance > 0 && finite(total?.equityEnd) && total.equityEnd >= balance &&
    near(total.equityEnd, account?.markedEndingEquity), { startingBalance: balance, markedEndingEquity: total?.equityEnd }, ">= starting balance");
  check("feasible", "Modeled account is explicitly feasible", total?.feasible === true, total?.feasible);
  // core-session's primary account telemetry is an object. marginOverMinutes belongs to its separate
  // alternate-book diagnostic and cannot replace missing primary-account coverage.
  const marginOver = total?.marginOver;
  const marginKnown = !!marginOver && typeof marginOver === "object" && !Array.isArray(marginOver) && count(marginOver.minutes) &&
    (marginOver.firstT === null || finite(marginOver.firstT)) && finite(marginOver.maxRatio) && marginOver.maxRatio >= 0;
  check("margin-shortfall", "No modeled margin-shortfall minutes", marginKnown && marginOver.minutes === 0 && marginOver.firstT === null,
    marginOver, { minutes: 0, firstT: null, maxRatio: "finite nonnegative ratio" });
  check("positive-equity", "Marked equity remains strictly positive", finite(total?.eqMin) && total.eqMin > 0, total?.eqMin, "> 0");
  check("no-ruin", "Ruin was explicitly checked and not recorded", total?.ruinT === null,
    { present: !!total && Object.hasOwn(total, "ruinT"), ruinT: total?.ruinT }, "explicit null");
  check("max-drawdown", "Marked equity drawdown is at most 10%", finite(total?.equityMaxDdPct) && total.equityMaxDdPct >= 0 && total.equityMaxDdPct <= p.maxEquityDrawdown &&
    near(total.equityMaxDdPct, account?.equityMaxDdPct), total?.equityMaxDdPct, p.maxEquityDrawdown);

  const failedCriteria = criteria.filter((x) => !x.ok), researchCandidate = failedCriteria.length === 0;
  return { schema: "cts-replay-candidate-assessment-v1", purpose: audit?.purpose ?? null, studyId: study?.id ?? null,
    researchCandidate, status: researchCandidate ? "research-candidate" : "not-qualified", automaticPromotion: false, defaultsChanged: false,
    policy: p, metrics: { engine: { fundedCloses: engine?.closes ?? null, symbols: engine?.symbols ?? null, returnPf: engine?.exactPf ?? null,
      entryGroups: engine?.entryGroups ?? null, firstHalfUnitNet: firstHalf, secondHalfUnitNet: secondHalf, greenHours: green, redHours: red, flatActiveHours: flat },
      combined: { returnPf: combined?.exactPf ?? null, closedNetUsd: total?.net ?? null },
      account: { startingBalance: balance ?? null, markedEndingEquity: total?.equityEnd ?? null, minimumEquity: total?.eqMin ?? null, maximumDrawdown: total?.equityMaxDdPct ?? null } },
    requirementsRemaining: audit?.purpose === "final"
      ? ["Compare this untouched final evidence with the declared development policy; passing criteria alone never authorizes promotion."]
      : ["The same criteria must also pass on the untouched final window before any promotion can be considered."],
    limitations: ["Offline modeled funded execution only; no venue fills are established.", "Config close counts and entry groups do not establish statistical independence.",
      "Sized-dollar PF cannot replace unit-return PF. No indication, range, setting or default is changed."],
    criteria, failedCriteria };
}

export function renderReplayCandidateAssessment(result) {
  const display = (x) => x === null || x === undefined ? "unavailable" : JSON.stringify(x).replaceAll("|", "\\|");
  const lines = ["# Frozen replay research candidate assessment", "", `Study: ${result.studyId ?? "unknown"} · ${result.purpose ?? "unknown"}.`, "",
    `Result: **${result.researchCandidate ? "research candidate" : "not qualified"}**. Automatic promotion: **disabled**. Defaults changed: **no**.`, "",
    "| Criterion | Result | Observed | Required |", "|---|---|---|---|"];
  for (const row of result.criteria) lines.push(`| ${row.label.replaceAll("|", "\\|")} | ${row.ok ? "PASS" : "FAIL / unavailable"} | ${display(row.actual)} | ${display(row.required)} |`);
  lines.push("", ...result.requirementsRemaining, "", ...result.limitations.map((x) => `- ${x}`));
  return lines.join("\n") + "\n";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), usage = "Usage: node scripts/assess-replay-candidate.mjs --audit audit.json --data html/data.json [--protocol protocol.json] [--out assessment-stem]";
  if (args.includes("--help")) { process.stdout.write(usage + "\nAn omitted protocol produces an unqualified assessment; no defaults or live settings are changed.\n"); }
  else {
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!["--audit", "--data", "--protocol", "--out"].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith("--") || options[args[i]]) throw new Error(usage);
      options[args[i]] = args[i + 1];
    }
    if (!options["--audit"] || !options["--data"]) throw new Error(usage);
    if (options["--out"]) {
      const inputs = new Set([options["--audit"], options["--data"], options["--protocol"]].filter(Boolean).map((file) => resolve(file)));
      if ([".json", ".md"].some((suffix) => inputs.has(resolve(options["--out"] + suffix))))
        throw new Error("Assessment output cannot overwrite an input audit, report or frozen protocol");
    }
    const auditBytes = readFileSync(options["--audit"]), reportBytes = readFileSync(options["--data"]);
    const protocolBytes = options["--protocol"] ? readFileSync(options["--protocol"]) : null;
    const result = assessReplayCandidate(JSON.parse(auditBytes), JSON.parse(reportBytes), { protocol: protocolBytes ? JSON.parse(protocolBytes) : null,
      reportSha256: sha(reportBytes), protocolSha256: protocolBytes ? sha(protocolBytes) : null });
    result.inputSha256 = { audit: sha(auditBytes), report: sha(reportBytes), protocol: protocolBytes ? sha(protocolBytes) : null };
    if (options["--out"]) {
      mkdirSync(dirname(options["--out"]), { recursive: true });
      writeFileSync(`${options["--out"]}.json`, JSON.stringify(result, null, 2) + "\n");
      writeFileSync(`${options["--out"]}.md`, renderReplayCandidateAssessment(result));
    }
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exitCode = result.researchCandidate ? 0 : 1;
  }
}
