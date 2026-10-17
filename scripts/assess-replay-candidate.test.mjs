import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { assessReplayCandidate, renderReplayCandidateAssessment } from "./assess-replay-candidate.mjs";

const H = 3_600_000;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function summary(closes, unitGp, unitGl, sizedNetUsd = .12) {
  const noLoss = unitGp > 0 && unitGl === 0;
  return { closes, symbols: closes ? 3 : 0, entryGroups: closes ? Math.max(1, Math.floor(closes / 10)) : 0, configs: closes ? 2 : 0, unknownReturns: 0, unknownCash: 0,
    state: closes === 0 ? "empty" : noLoss ? "no-loss" : unitGp + unitGl === 0 ? "flat" : "measured",
    unitGp, unitGl, unitNet: unitGp - unitGl, exactPf: closes === 0 ? null : unitGl > 0 ? unitGp / unitGl : noLoss ? null : 0,
    noLoss, noLossGateScore: noLoss ? 4 : null, sizedNetUsd: closes ? sizedNetUsd : 0 };
}
function fixture({ purpose = "development", engineCloses = 120, enginePf = 1.2, combinedPf, runH = purpose === "final" ? 24 : 6 } = {}) {
  const startT = Date.parse(purpose === "final" ? "2026-10-15T21:00:00Z" : "2026-10-12T09:00:00Z"), endT = startT + runH * H;
  const symbols = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "LTC", "DOT", "ATOM", "APT", "NEAR", "SUI", "TRX", "UNI", "FIL", "ETC", "ARB",
    ...(purpose === "final" ? ["OP", "XLM"] : [])].map((base) => `${base}-USDT`);
  const window = { evaluationFromT: startT - 6 * H, tradeStartT: startT, endT, preH: 6, runH };
  const engineGl = .06, engineGp = engineGl * enginePf, signalGl = .02;
  const signalGp = combinedPf === undefined ? .028 : combinedPf * (engineGl + signalGl) - engineGp;
  const engine = { key: "Engine", ...summary(engineCloses, engineGp, engineGl) };
  const signals = { key: "Signals", ...summary(60, signalGp, signalGl, .08) };
  const combined = summary(engineCloses + 60, engineGp + signalGp, engineGl + signalGl, .2);
  const protocol = { schema: "cts-session-study-v1", id: `synthetic-${purpose}`, source: { sha256: "a".repeat(64) }, feed: { sha256: "b".repeat(64) },
    symbols, window: { ...window }, account: { balance: 10 },
    actualSettings: { cost: .0015, live: { maxPositionX: .75, maxExposureX: 7 } }, actualWf: { cost: .0015 } };
  const study = { id: protocol.id, sourceSha256: protocol.source.sha256, feedSha256: protocol.feed.sha256, symbols: [...symbols], window: { ...window } };
  const cells = [0, 1].map((i) => ({ key: `cell${i}`, cohort: "Engine", ...summary(engineCloses / 2, engineGp / 2, engineGl / 2, .06),
    firstHalf: summary(engineCloses / 4, engineGp / 4, engineGl / 4, .03), secondHalf: summary(engineCloses / 4, engineGp / 4, engineGl / 4, .03) }));
  const hours = Array.from({ length: runH }, (_, i) => ({ t: startT + i * H,
    engine: summary(Math.floor(engineCloses / runH) + (i < engineCloses % runH ? 1 : 0), engineGp / runH, engineGl / runH, .12 / runH) }));
  const audit = { schema: "cts-session-study-audit-v1", purpose, checksOk: true,
    checks: [{ name: "funded return arithmetic", ok: true }, { name: "complete frozen execution coverage", ok: true }],
    provenance: { study: { ...study }, actualExecution: false, missingAllocationRows: false, inputSha256: {} },
    window: { startT, endT, hours: runH, symbols }, total: combined, cohorts: [engine, signals], cells, hours,
    eligibility: { basePolicyVerified: true }, performance: { mem: { computeLevel: 0, fallback: 0, aborts: 0 }, coverage: { expectedCombos: 100, evaluated: 100 } },
    account: { startingBalance: 10, unknownAllocations: 0, closedNetUsd: .2, endingBalance: 10.2, markedEndingEquity: 10.15, equityMaxDdPct: .05 } };
  const data = { study: { ...study }, symbols, window: { startT, endT, preStartT: window.evaluationFromT, preH: 6, runH }, settings: { balance0: 10, cost: .0015 },
    checksOk: true, checks: [{ name: "report consistency", ok: true }],
    total: { fundedOrders: combined.closes, gpR: combined.unitGp, glR: combined.unitGl, pf: combined.exactPf,
      pfBasis: "unit-net-returns", noLoss: false, unknownReturns: 0, unknownReturnTotals: 0, net: .2,
      balanceEnd: 10.2, equityEnd: 10.15, feasible: true, marginOver: { minutes: 0, firstT: null, maxRatio: .2 }, eqMin: 9.5, ruinT: null, equityMaxDdPct: .05,
      caps: { on: true, maxPositionX: .75, maxExposureX: 7 } } };
  return { audit, data, protocol };
}
function seal(f) {
  const protocolBytes = JSON.stringify(f.protocol), protocolSha256 = hash(protocolBytes);
  f.audit.provenance.study.protocolSha256 = f.data.study.protocolSha256 = protocolSha256;
  const reportBytes = JSON.stringify(f.data), reportSha256 = hash(reportBytes);
  f.audit.provenance.inputSha256 = { allocationReport: reportSha256, protocol: protocolSha256 };
  return { options: { protocol: f.protocol, reportSha256, protocolSha256 }, protocolBytes, reportBytes };
}
function assess(f, options = {}) { return assessReplayCandidate(f.audit, f.data, { ...seal(f).options, ...options }); }
const engineOf = (f) => f.audit.cohorts[0];
const failed = (result, id) => result.failedCriteria.some((x) => x.id === id);

describe("frozen replay research candidate assessment", () => {
  it("qualifies consistent measured evidence without changing inputs or authorizing promotion", () => {
    for (const purpose of ["development", "final"]) {
      const f = fixture({ purpose }), options = seal(f).options, before = structuredClone(f);
      const result = assessReplayCandidate(f.audit, f.data, options);
      assert.equal(result.researchCandidate, true);
      assert.equal(result.failedCriteria.length, 0);
      assert.equal(result.automaticPromotion, false);
      assert.equal(result.defaultsChanged, false);
      assert.deepEqual(f, before);
      assert.equal(result.metrics.engine.firstHalfUnitNet > 0, true);
      assert.equal(result.metrics.engine.greenHours, purpose === "final" ? 24 : 6);
      assert.match(renderReplayCandidateAssessment(result), /Automatic promotion: \*\*disabled\*\*/);
      assert.match(result.requirementsRemaining[0], purpose === "final" ? /passing criteria alone never authorizes promotion/ : /untouched final window/);
    }
  });

  it("accepts the exact declared numeric boundaries and a real finite PF of four", () => {
    const boundary = fixture({ engineCloses: 100, enginePf: 1.1, combinedPf: 1.05 });
    boundary.data.total.equityMaxDdPct = boundary.audit.account.equityMaxDdPct = .1;
    boundary.data.total.equityEnd = boundary.audit.account.markedEndingEquity = 10;
    assert.equal(assess(boundary).researchCandidate, true);
    const ratioFour = assess(fixture({ enginePf: 4 }));
    assert.equal(ratioFour.metrics.engine.returnPf, 4);
    assert.equal(ratioFour.researchCandidate, true, "a measured ratio of four is distinct from the no-loss score");
  });

  it("accepts exactly 24 final trading hours after six evaluated prehistory hours", () => {
    const f = fixture({ purpose: "final" }), result = assess(f);
    assert.equal(new Date(f.audit.provenance.study.window.evaluationFromT).toISOString(), "2026-10-15T15:00:00.000Z");
    assert.equal(new Date(f.audit.window.startT).toISOString(), "2026-10-15T21:00:00.000Z");
    assert.equal(new Date(f.audit.window.endT).toISOString(), "2026-10-16T21:00:00.000Z");
    assert.equal(f.audit.hours.length, 24);
    assert.equal(f.audit.window.symbols.length, 22);
    assert.equal(result.researchCandidate, true, JSON.stringify(result.failedCriteria));
    assert.equal(result.metrics.engine.greenHours, 24);
  });

  it("rejects an internally reconciled six-hour final fixture even when every performance gate passes", () => {
    const f = fixture({ purpose: "final", runH: 6 }), result = assess(f);
    assert.equal(f.audit.hours.length, 6);
    assert.equal(result.researchCandidate, false);
    assert.deepEqual(result.failedCriteria.map((x) => x.id), ["scope"], "a six-hour final label must fail its declared scope independently of profitability");
  });

  for (const [label, mutate] of [
    ["missing frozen window", (f) => { delete f.audit.provenance.study.window; }],
    ["expanded frozen prehistory", (f) => { f.audit.provenance.study.window.evaluationFromT -= H; }],
    ["different protocol prehistory", (f) => { f.protocol.window.preH = 7; }],
    ["missing frozen symbol list", (f) => { delete f.audit.provenance.study.symbols; }],
    ["incorrect audit duration", (f) => { f.audit.window.hours = 5; }],
    ["incorrect report prehistory boundary", (f) => { f.data.window.preStartT -= H; }],
    ["incorrect report prehistory duration", (f) => { f.data.window.preH = 7; }],
    ["incorrect report trading duration", (f) => { f.data.window.runH = 5; }],
    ["same-count undeclared symbol", (f) => {
      f.audit.provenance.study.symbols[0] = f.data.study.symbols[0] = "OTHER-USDT";
      f.protocol.symbols[0] = f.audit.window.symbols[0] = f.data.symbols[0] = "OTHER-USDT";
    }],
    ["same-count duplicate symbol", (f) => {
      f.audit.provenance.study.symbols[0] = f.data.study.symbols[0] = f.data.symbols[1];
      f.protocol.symbols[0] = f.audit.window.symbols[0] = f.data.symbols[0] = f.data.symbols[1];
    }],
  ]) it(`rejects ${label} for development and final`, () => {
    for (const purpose of ["development", "final"]) {
      const f = fixture({ purpose }); mutate(f); const result = assess(f);
      assert.equal(result.researchCandidate, false);
      assert.equal(failed(result, "scope"), true, JSON.stringify(result.failedCriteria));
    }
  });

  it("rejects an otherwise identical fully reconciled window moved to another date", () => {
    for (const purpose of ["development", "final"]) {
      const f = fixture({ purpose });
      for (const window of [f.protocol.window, f.audit.provenance.study.window])
        for (const key of ["evaluationFromT", "tradeStartT", "endT"]) window[key] += 24 * H;
      // Fixture report/audit study windows share one original stamped study, as production does.
      for (const key of ["startT", "endT"]) { f.audit.window[key] += 24 * H; f.data.window[key] += 24 * H; }
      f.data.window.preStartT += 24 * H;
      for (const hour of f.audit.hours) hour.t += 24 * H;
      const result = assess(f);
      assert.deepEqual(result.failedCriteria.map((x) => x.id), ["scope"]);
    }
  });

  for (const [label, mutate, id] of [
    ["insufficient funded engine closes", (f) => { engineOf(f).closes = 99; }, "engine-sample"],
    ["insufficient engine symbols", (f) => { engineOf(f).symbols = 2; }, "engine-symbols"],
    ["missing engine symbol count", (f) => { delete engineOf(f).symbols; }, "engine-symbols"],
    ["unknown engine return", (f) => { engineOf(f).unknownReturns = 1; }, "engine-pf"],
    ["missing chronological cells", (f) => { delete f.audit.cells; }, "engine-halves-evidence"],
    ["missing engine hour", (f) => { f.audit.hours.pop(); }, "engine-hours-evidence"],
    ["duplicate hour", (f) => { f.audit.hours[1].t = f.audit.hours[0].t; }, "engine-hours-evidence"],
    ["positive cash cannot repair negative closed cash", (f) => { f.data.total.net = f.audit.account.closedNetUsd = f.audit.total.sizedNetUsd = -.1; }, "combined-cash-net"],
    ["missing starting balance", (f) => { delete f.audit.account.startingBalance; }, "starting-balance"],
    ["ending equity below start", (f) => { f.data.total.equityEnd = f.audit.account.markedEndingEquity = 9.99; }, "ending-equity"],
    ["infeasible account", (f) => { f.data.total.feasible = false; }, "feasible"],
    ["unknown feasibility", (f) => { delete f.data.total.feasible; }, "feasible"],
    ["margin shortfall minute", (f) => { f.data.total.marginOver = { minutes: 1, firstT: H, maxRatio: 1.1 }; }, "margin-shortfall"],
    ["unknown margin coverage", (f) => { delete f.data.total.marginOver; }, "margin-shortfall"],
    ["fictional scalar margin coverage", (f) => { f.data.total.marginOver = 0; }, "margin-shortfall"],
    ["missing margin minute count", (f) => { delete f.data.total.marginOver.minutes; }, "margin-shortfall"],
    ["string margin minute count", (f) => { f.data.total.marginOver.minutes = "0"; }, "margin-shortfall"],
    ["missing margin ratio telemetry", (f) => { delete f.data.total.marginOver.maxRatio; }, "margin-shortfall"],
    ["contradictory margin first timestamp", (f) => { f.data.total.marginOver.firstT = H; }, "margin-shortfall"],
    ["alternate-book margin diagnostic cannot replace primary telemetry", (f) => { delete f.data.total.marginOver; f.data.total.marginOverMinutes = 0; }, "margin-shortfall"],
    ["zero minimum equity", (f) => { f.data.total.eqMin = 0; }, "positive-equity"],
    ["missing minimum equity", (f) => { delete f.data.total.eqMin; }, "positive-equity"],
    ["recorded ruin at timestamp zero", (f) => { f.data.total.ruinT = 0; }, "no-ruin"],
    ["missing ruin telemetry", (f) => { delete f.data.total.ruinT; }, "no-ruin"],
    ["drawdown above ten percent", (f) => { f.data.total.equityMaxDdPct = f.audit.account.equityMaxDdPct = .100001; }, "max-drawdown"],
    ["missing drawdown", (f) => { delete f.data.total.equityMaxDdPct; }, "max-drawdown"],
    ["wrong modeled cost", (f) => { f.data.settings.cost = .002; }, "modeled-cost"],
    ["missing walk-forward modeled cost", (f) => { delete f.protocol.actualWf.cost; }, "modeled-cost"],
    ["wrong frozen position cap", (f) => { f.protocol.actualSettings.live.maxPositionX = 1; }, "account-caps"],
    ["wrong applied exposure cap", (f) => { f.data.total.caps.maxExposureX = 0; }, "account-caps"],
    ["caps disabled", (f) => { f.data.total.caps.on = false; }, "account-caps"],
    ["missing caps", (f) => { delete f.data.total.caps; }, "account-caps"],
    ["unknown allocation ownership", (f) => { f.audit.account.unknownAllocations = 1; }, "ownership"],
    ["missing allocation rows", (f) => { f.audit.provenance.missingAllocationRows = true; }, "ownership"],
    ["unverified Base range policy", (f) => { f.audit.eligibility.basePolicyVerified = false; }, "base-policy"],
    ["memory-degraded compute", (f) => { f.audit.performance.mem.fallback = 1; }, "full-compute"],
    ["missing memory telemetry", (f) => { delete f.audit.performance.mem.aborts; }, "full-compute"],
    ["partial configured coverage", (f) => { f.audit.performance.coverage.evaluated--; }, "full-compute"],
    ["audit flag failed", (f) => { f.audit.checksOk = false; }, "audit.strict"],
    ["report flag failed", (f) => { f.data.checksOk = false; }, "report.strict"],
    ["audit checks empty", (f) => { f.audit.checks = []; }, "audit.checks-present"],
    ["report checks missing", (f) => { delete f.data.checks; }, "report.checks-present"],
    ["selection is not development or final", (f) => { f.audit.purpose = "selection"; }, "purpose"],
    ["mismatched report window", (f) => { f.data.window.endT += H; }, "scope"],
    ["mismatched frozen symbols", (f) => { f.protocol.symbols = f.protocol.symbols.slice(1); }, "protocol"],
    ["missing funded report count", (f) => { delete f.data.total.fundedOrders; }, "combined-sample"],
  ]) it(`fails ${label} without suppressing the other criteria`, () => {
    const f = fixture(); mutate(f); const result = assess(f);
    assert.equal(result.researchCandidate, false);
    assert.equal(failed(result, id), true, `${id}: ${JSON.stringify(result.failedCriteria)}`);
    assert.equal(result.criteria.length > 30, true);
    assert.equal(result.automaticPromotion, false);
  });

  it("fails measured PF below each threshold even with strong sized-dollar diagnostics", () => {
    for (const [f, id] of [[fixture({ enginePf: 1.09 }), "engine-pf"], [fixture({ combinedPf: 1.04 }), "combined-pf"]]) {
      f.data.total.cashPfDiagnostic = 99;
      assert.equal(failed(assess(f), id), true);
    }
  });

  it("fails either negative or empty chronological half independently", () => {
    for (const side of ["firstHalf", "secondHalf"]) {
      const f = fixture(), other = side === "firstHalf" ? "secondHalf" : "firstHalf";
      for (const cell of f.audit.cells) {
        cell[side] = summary(cell[side].closes, .014, .015);
        cell[other] = summary(cell[other].closes, cell.unitGp - .014, cell.unitGl - .015);
      }
      const result = assess(f);
      assert.equal(failed(result, side === "firstHalf" ? "engine-first-half" : "engine-second-half"), true);
      assert.equal(failed(result, "engine-halves-evidence"), false, "the losing half is arithmetically reconciled");
    }
    const f = fixture();
    for (const cell of f.audit.cells) { cell.firstHalf = summary(0, 0, 0); cell.secondHalf = summary(cell.closes, cell.unitGp, cell.unitGl); }
    assert.equal(failed(assess(f), "engine-first-half"), true);
  });

  it("counts unit-net active hours rather than account cash hours", () => {
    const f = fixture(), nets = [.008, -.001, -.001, .008, -.001, -.001];
    for (let i = 0; i < 6; i++) f.audit.hours[i].engine = summary(20, .01 + nets[i], .01);
    f.audit.account.greenHours = 6; f.audit.account.redHours = 0;
    const result = assess(f);
    assert.equal(failed(result, "engine-hours-evidence"), false);
    assert.equal(failed(result, "engine-green-hours"), true);
    assert.equal(result.metrics.engine.greenHours, 2);
    assert.equal(result.metrics.engine.redHours, 4);
    assert.equal(result.metrics.engine.firstHalfUnitNet > 0, true);
  });

  it("refuses no-loss gate scores and nonfinite ratios instead of treating four as finite PF", () => {
    for (const cohort of ["Engine", "Combined"]) {
      const f = fixture(), row = cohort === "Engine" ? engineOf(f) : f.audit.total;
      Object.assign(row, { state: "no-loss", noLoss: true, exactPf: 4, unitGl: 0, unitNet: row.unitGp });
      assert.equal(failed(assess(f), cohort === "Engine" ? "engine-pf" : "combined-pf"), true);
    }
    const f = fixture(); engineOf(f).exactPf = Infinity;
    assert.equal(failed(assess(f), "engine-pf"), true);
  });

  it("retains every failed audit/report check and all account failures together", () => {
    const f = fixture();
    f.audit.checks[0].ok = false; f.audit.checks[1].ok = false; f.data.checks[0].ok = false;
    f.data.total.marginOver = { minutes: 2, firstT: H, maxRatio: 1.2 }; f.data.total.feasible = false; f.data.total.eqMin = -1; f.data.total.ruinT = 123;
    const result = assess(f);
    for (const id of ["audit.check.0", "audit.check.1", "report.check.0", "margin-shortfall", "feasible", "positive-equity", "no-ruin"])
      assert.equal(failed(result, id), true, id);
    assert.match(renderReplayCandidateAssessment(result), /funded return arithmetic.*FAIL/);
  });

  it("fails absent/mismatched protocol, exact-file hashes and missing inputs", () => {
    const f = fixture(), options = seal(f).options;
    assert.equal(failed(assessReplayCandidate(f.audit, f.data, { ...options, protocol: null }), "protocol"), true);
    assert.equal(failed(assessReplayCandidate(f.audit, f.data, { ...options, reportSha256: "f".repeat(64) }), "report-hash"), true);
    assert.equal(failed(assessReplayCandidate(f.audit, f.data, { ...options, protocolSha256: "e".repeat(64) }), "protocol"), true);
    const empty = assessReplayCandidate(null, null);
    assert.equal(empty.researchCandidate, false);
    assert.equal(empty.failedCriteria.length > 25, true);
  });

  it("CLI assesses tiny frozen files and writes reviewable results without changing inputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-candidate-assessment-"));
    try {
      const f = fixture(), { reportBytes, protocolBytes } = seal(f), auditBytes = JSON.stringify(f.audit);
      const audit = join(dir, "audit.json"), data = join(dir, "data.json"), protocol = join(dir, "protocol.json"), out = join(dir, "assessment");
      writeFileSync(audit, auditBytes); writeFileSync(data, reportBytes); writeFileSync(protocol, protocolBytes);
      const run = (extra) => spawnSync(process.execPath, ["scripts/assess-replay-candidate.mjs", "--audit", audit, "--data", data, ...extra], { encoding: "utf8", timeout: 10_000 });
      const passing = run(["--protocol", protocol, "--out", out]);
      assert.equal(passing.status, 0, passing.stderr);
      assert.equal(JSON.parse(readFileSync(out + ".json", "utf8")).researchCandidate, true);
      assert.match(readFileSync(out + ".md", "utf8"), /Defaults changed: \*\*no\*\*/);
      assert.equal(readFileSync(audit, "utf8"), auditBytes);
      assert.equal(readFileSync(data, "utf8"), reportBytes);
      assert.equal(readFileSync(protocol, "utf8"), protocolBytes);
      const missingProtocol = run([]);
      assert.equal(missingProtocol.status, 1);
      assert.equal(failed(JSON.parse(missingProtocol.stdout), "protocol"), true);
      const overwrite = run(["--protocol", protocol, "--out", join(dir, "protocol")]);
      assert.notEqual(overwrite.status, 0);
      assert.match(overwrite.stderr, /cannot overwrite an input/);
      assert.equal(readFileSync(protocol, "utf8"), protocolBytes);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("reads the actual primary margin telemetry emitted by a tiny core-session report", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-candidate-producer-contract-"));
    try {
      const M = 60_000, raw = {
        at: "2026-10-14T00:00:00.000Z", symbols: ["TEST-USDT"],
        settings: { preH: 1, runH: 1, tactics: "off", signals: false, toggles: {}, block: {}, wf: { longH: 1 },
          gates: { minPf: 1.1 }, lanes: [1], cost: .0015, focus: 0, disabledKinds: [], ranges: {},
          live: { maxPositionX: .75, maxExposureX: 7 }, book: { balance: 10, notional: .1, sizing: { mode: "fixed" }, leverage: 10 } },
        window: { startT: H, endT: 2 * H }, openEnd: [],
        trades: [
          { cfg: "follow|ema-9-21@m1|win", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 2 * M,
            entry: 100, exit: 101, r: .0085, reason: "tp", vol: 1, mult: 1, kind: "normal" },
          { cfg: "follow|ema-9-21@m1|loss", sym: "TEST-USDT", side: 1, entryT: H + 3 * M, exitT: H + 4 * M,
            entry: 101, exit: 100.5, r: -.00645049504950495, reason: "sl", vol: 1, mult: 1, kind: "normal" },
        ],
        closes: { "TEST-USDT": Array.from({ length: 60 }, (_, i) => [H + i * M, i < 1 ? 100 : i < 3 ? 101 : 100.5]) },
        engine: { basePassed: 0, baseEvaluated: 0, mainPairs: 0, tapes: 0, real: 0, computeMs: 0 },
      };
      const rawPath = join(dir, "raw.json"); writeFileSync(rawPath, JSON.stringify(raw));
      const child = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/core-session.mjs",
        "--replay", rawPath, "--out", join(dir, "report"), "--html", join(dir, "html"), "--quiet", "true"],
      { encoding: "utf8", timeout: 60_000, env: { ...process.env, CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_VARIANTS: "0" } });
      assert.equal(child.status, 0, [child.error?.message, child.stderr, child.stdout].filter(Boolean).join("\n"));
      const produced = JSON.parse(readFileSync(join(dir, "html/data.json"), "utf8"));
      assert.equal(produced.checksOk, true);
      assert.equal(produced.total.feasible, true);
      assert.deepEqual(Object.keys(produced.total.marginOver).sort(), ["firstT", "maxRatio", "minutes"]);
      const result = assessReplayCandidate(null, produced);
      assert.equal(result.criteria.find((x) => x.id === "margin-shortfall").ok, true, "read the producer's object instead of a mirrored scalar fixture");
      assert.equal(result.researchCandidate, false, "two report-fixture closes are not qualifying market evidence");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
