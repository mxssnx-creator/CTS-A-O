import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { DEFAULT_GATES, DEFAULT_SETTINGS } from "../src/core/config.ts";
import { statsOf } from "../src/core/metrics/stats.ts";
import { rangeCellPass } from "../src/core/pipeline/pipeline.ts";
import { ALL_RANGE_TAGS, basePass } from "../src/core/server/runtime.server.ts";
import {
  SESSION_QUALIFICATION,
  recordSessionMinimum,
  sessionBaseTags,
  sessionOwnRangePassed,
  sessionQualificationEvidence,
  sessionReturnEvidence,
} from "./lib/session-qualification.mjs";

const H = 3_600_000;
const M = 60_000;
const script = new URL("./core-session.mjs", import.meta.url).pathname;
function replay({ caps = false, weighted = false, invalidReturn = false, qualification, thresholds, variants, presets, exhaustedCap = false, noBase = false, legacyRangeRows = false, baseNoLoss = false, signalCoverage = false, liveValidation, selectionPhases = false, marketData } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cts-session-report-"));
  try {
    const raw = {
      at: "2026-10-14T00:00:00.000Z", symbols: ["TEST-USDT"],
      settings: {
        preH: 1, runH: 1, tactics: "off", signals: false, toggles: {}, block: {},
        wf: { longH: 1 }, gates: { minPf: 1.1 }, lanes: [1], cost: 0, focus: 0, disabledKinds: [], ranges: {},
        live: { maxPositionX: 0.75, maxExposureX: 7 },
        book: { balance: 100, notional: 5, sizing: { mode: "equityPct", pct: 0.25 }, leverage: 10 },
      },
      window: { startT: H, endT: 2 * H },
      trades: [
        { cfg: "combo|ema-9-21@m1|win", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 2 * M, entry: 100, exit: 150, r: 0.5, reason: "tp", vol: 1, mult: 1, kind: "normal" },
        { cfg: "combo|ema-9-21@m1|loss", sym: "TEST-USDT", side: 1, entryT: H + 3 * M, exitT: H + 4 * M, entry: 150, exit: 120, r: -0.2, reason: "sl", vol: 1, mult: 1, kind: "normal" },
      ],
      closes: { "TEST-USDT": Array.from({ length: 60 }, (_, i) => [H + i * M, i < 1 ? 100 : i < 3 ? 150 : 120]) },
      openEnd: [], engine: { basePassed: 0, baseEvaluated: 0, mainPairs: 0, tapes: 0, real: 0, computeMs: 0 },
    };
    if (weighted) {
      // The engine stores execution r already multiplied by Block/coordination volume.
      raw.trades[0] = { ...raw.trades[0], r: 1, mult: 2, vol: 2 };
      raw.trades[1].mult = 1;
      raw.settings.book.sizing = { mode: "fixed" };
      raw.executionReturns = { version: 1, encoding: "tape-return-times-execution-mult" };
    }
    if (invalidReturn) raw.trades[0].mult = 0;
    if (exhaustedCap) {
      raw.settings.book = { balance: 1, notional: 0.1, sizing: { mode: "fixed" }, leverage: 10 };
      raw.settings.live = { maxPositionX: 0.3, maxExposureX: 0 };
      raw.trades = [
        { cfg: "follow|ema-9-21@m1|a", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 10 * M, entry: 100, exit: 100, r: 0, vol: 1, mult: 1, kind: "normal" },
        { cfg: "follow|ema-9-21@m1|b", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 20 * M, entry: 100, exit: 100, r: 0, vol: 2, mult: 2, kind: "normal" },
        { cfg: "follow|ema-9-21@m1|ghost", sym: "TEST-USDT", side: 1, entryT: H + 2 * M, exitT: H + 15 * M, entry: 100, exit: 110, r: 0.1, vol: 1, mult: 1, kind: "normal" },
      ];
      raw.closes = { "TEST-USDT": Array.from({ length: 60 }, (_, i) => [H + i * M, 100]) };
    }
    if (marketData) {
      raw.settings.marketDataSource = marketData.source;
      raw.settings.marketDataDetails = marketData.details;
    }
    if (selectionPhases) {
      raw.engine.real = 9;
      raw.engine.realEngine = 8;
      raw.engine.realSignal = 1;
      raw.engine.realPhase = "paper-current-after-compute";
      raw.engine.realFirstStep = { t: H, ids: ["first-a", "first-b"], configs: 2, engineConfigs: 2, signalConfigs: 0 };
      raw.engine.paperSelectionAfterCompute = { t: 2 * H, ids: ["current-a"], configs: 1, engineConfigs: 1,
        signalConfigs: 0, phase: "paper-current-after-compute", capturedAt: "2026-10-14T00:00:00.000Z", compute: 1, complete: true };
      raw.engine.configEvalPhase = { phase: "run-start", t: H, evaluated: 3, passed: 2 };
      raw.tapeAgg = { evalStats: { configs: 3, evaluated: 3, passed: 2, signalTapes: 0, signalActive: 0 }, evalRule: { preH: 336 } };
    }
    if (qualification) raw.qualification = qualification;
    if (liveValidation) raw.engine.liveValidation = liveValidation;
    if (variants) raw.variants = variants;
    if (presets) raw.presets = presets;
    if (thresholds) {
      raw.engine.baseByRange = [{ tag: "sh", range: "Short", enabled: true, passed: 2, evaluated: 3, pfPassedPooled: 1.2 }];
      raw.tapeAgg = { evalAfterBase: { "Short|normal": thresholds } };
    }
    if (baseNoLoss) {
      raw.settings.ranges.micro = true;
      raw.settings.replaySelectionHours = 1;
      raw.settings.replayMinGreen = 1;
      raw.settings.live = { ...raw.settings.live, liveLastN: 25, liveGroupLastN: 0, replaySinceT: H };
      raw.trades = [
        { cfg: "follow|break-mc-rel-don8-5-dd24-balanced@m5|tp0.7|sl2.5|tr0.75|h1|mc", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 2 * M, entry: 100, exit: 102, r: 0.02, reason: "tp", vol: 1, mult: 1, kind: "normal" },
      ];
      raw.engine.baseEvaluated = 3;
      raw.engine.basePassed = 1;
      raw.engine.baseByRange = [
        { tag: "mc", range: "Micro", enabled: true, evaluated: 3, passed: 1, pfPassedPooled: null, pfPassedMedian: 4, passedGp: 0.02, passedGl: 0, ownCells: 1 },
      ];
      raw.tapeAgg = {
        evalStats: { signalUnitsRun: 0 },
        evalAfterBase: { "Micro|normal": { configs: 2, passed: 1, okGp: 0.02, okGl: 0, minPf: 1.1, minPfMax: 1.1 } },
      };
      const empty = { n: 0, w: 0, gp: 0, gl: 0 };
      raw.funnel = {
        nH: 1,
        pool: [{ n: 1, w: 1, gp: 0.02, gl: 0 }],
        poolNormal: [{ n: 1, w: 1, gp: 0.02, gl: 0 }],
        poolTrailing: [empty],
        poolTrailingOnly: [empty],
        seated: [{ n: 1, w: 1, gp: 0.02, gl: 0 }],
        counts: { basePairs: 3, basePassed: 1, poolConfigs: 2, seatedConfigs: 1, causalBase: true },
      };
    }
    if (noBase) {
      raw.trades = [];
      raw.openEnd = [];
      raw.settings.signals = signalCoverage ? { enabled: true, trailingOnly: { enabled: false } } : false;
      raw.settings.toggles = { normal: true, block: false, trailing: true, dca: true, dcaActive: false, axis: false };
      const engineTape = { configs: 1, activeConfigs: 1, closes: 0 };
      const signalTape = { configs: 1, activeConfigs: 1, closes: 0 };
      raw.engine.coverage = {
        expectedCombos: signalCoverage ? 2 : 1, evaluated: signalCoverage ? 2 : 1,
        kindsAll: signalCoverage ? ["break", "signal"] : ["break"],
        byKind: signalCoverage
          ? { break: { evaluated: 1, passed: 0 }, signal: { evaluated: 1, passed: 0 } }
          : { break: { evaluated: 1, passed: 0 } },
        toggles: raw.settings.toggles, ranges: { mc: true },
        sets: signalCoverage ? [{ ind: "break-x", tag: "wide", kind: "normal", lanes: 1, grid: 1, built: 1, kept: 1, few: 0, skip: {} }] : [],
        noSets: [],
        tapes: signalCoverage ? { "normal|wide": { configs: 2, activeConfigs: 2, closes: 0 } } : {},
        ...(signalCoverage ? { engineTapes: { "normal|wide": engineTape }, signalTapes: { "normal|wide": signalTape }, signalCombos: 1 } : {}),
      };
      raw.engine.baseEvaluated = 1;
      raw.engine.basePassed = 0;
      raw.engine.baseBuilt = 0;
      raw.engine.baseByRange = [
        { tag: "", range: "Wide", enabled: true, evaluated: 1, passed: 0, ownCells: legacyRangeRows ? undefined : 1 },
        { tag: "mc", range: "Micro", enabled: true, evaluated: 1, passed: 0, ownCells: legacyRangeRows ? undefined : 1 },
      ];
    }
    writeFileSync(join(dir, "raw.json"), JSON.stringify(raw));
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", script,
      "--replay", join(dir, "raw.json"), "--caps", caps ? "on" : "off", "--out", join(dir, "report"),
      ...(exhaustedCap ? ["--signal-progress"] : []),
      "--html", join(dir, "html"), "--writeup", join(dir, "writeup.md"), "--quiet", "true"], {
      encoding: "utf8", timeout: 15_000, env: { ...process.env, CTS_CORE_VARIANTS: "0" },
    });
    assert.equal(result.status, invalidReturn ? 1 : 0, result.stderr || result.stdout);
    return {
      data: JSON.parse(readFileSync(join(dir, "html/data.json"), "utf8")),
      report: JSON.parse(readFileSync(join(dir, "report.json"), "utf8")),
      md: readFileSync(join(dir, "report.md"), "utf8"),
      writeup: readFileSync(join(dir, "writeup.md"), "utf8"),
      html: readFileSync(join(dir, "html/index.html"), "utf8"),
    };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function summaryOf(html) {
  const done = new Error("summary captured");
  let summary;
  const app = { set innerHTML(value) { summary = value; throw done; } };
  const document = { documentElement: { dataset: {} }, querySelector: () => app, getElementById: () => app };
  const client = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  try { runInNewContext(client, { document, localStorage: { getItem: () => null }, matchMedia: () => ({ matches: false }) }, { timeout: 2_000 }); }
  catch (error) { if (error !== done) throw error; }
  assert.ok(summary, "generated client rendered its summary");
  return summary;
}

describe("session reports: return PF primary, simulated provenance", () => {
  it("prints CLI help without starting a simulated session", () => {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", script, "--help"], {
      encoding: "utf8",
      timeout: 5_000,
      env: { ...process.env, CTS_CORE_VARIANTS: "0" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Usage: node .*core-session\.mjs/);
    assert.doesNotMatch(result.stdout, /computing Base|session: \d+ symbols/);
  });

  it("keeps first simulated-step seats distinct from the later paper selection in every output", () => {
    const { data, report, md, writeup, html } = replay({ selectionPhases: true });
    for (const d of [data, report]) {
      assert.deepEqual(d.engine.realFirstStep.ids, ["first-a", "first-b"]);
      assert.equal(d.engine.realFirstStep.t, H);
      assert.equal(d.engine.realFirstStep.engineConfigs, 2);
      assert.equal(d.engine.paperSelectionAfterCompute.engineConfigs, 1);
      assert.equal(d.engine.configEvalPhase.t, H);
      assert.equal(d.engine.configEvalPhase.passed, 2);
      assert.equal(d.engine.realEngine, 8, "legacy snapshot is retained without reinterpreting its phase");
    }
    for (const text of [md, writeup, summaryOf(html)]) {
      assert.match(text, /First simulated step at 1970-01-01T01:00:00.000Z: 2 engine configs selected/);
      assert.match(text, /Paper selection after compute as of 1970-01-01T02:00:00.000Z: 1 engine configs/);
      assert.doesNotMatch(text, /initial[^\n]*8 engine/i);
    }
    assert.equal(data.configEvaluationHistoryH, 336, "recorded actual history takes precedence over an incomplete legacy WF snapshot");
    assert.match(writeup, /separately recorded 336 h selection lookback/);
    assert.match(writeup, /Config evaluation at run start \| 3 engine configs \| 2 passed/);
    assert.match(writeup, /First simulated-step selection \| – \| 2 engine configs/);
  });

  it("reports offline source metadata and never invents a provider for legacy dumps", () => {
    const details = { provider: "Binance USD-M archives", venueParity: "Distinct source from BingX; not venue-owned execution evidence", sha256: "source-checksum" };
    const current = replay({ marketData: { source: "offline-cached-feed", details } });
    assert.deepEqual(current.report.settings.marketDataDetails, details);
    assert.deepEqual(current.data.settings.marketDataDetails, details);
    for (const text of [current.md, current.writeup, summaryOf(current.html)]) {
      assert.match(text, /Offline replay from the supplied cached candle feed/);
      assert.match(text, /no market-data requests; source: Binance USD-M archives/);
      assert.match(text, /Distinct source from BingX/);
      assert.doesNotMatch(text, /Simulated orders on real BingX 1m market data/);
    }
    const legacy = replay();
    for (const text of [legacy.md, legacy.writeup, summaryOf(legacy.html)]) {
      assert.match(text, /Market-data source not recorded/);
      assert.match(text, /initial selection not recorded/);
      assert.doesNotMatch(text, /Simulated orders on real BingX 1m market data/);
    }
  });

  it("reports an empty Base run as unavailable PF with passing consistency checks", () => {
    const { data, md } = replay({ noBase: true });
    assert.equal(data.total.orders, 0);
    assert.equal(data.total.pf, null);
    assert.equal(data.checksOk, true);
    assert.ok(data.checks.find((x) => x.name === "coverage: strategy type normal active tapes match kept sets")?.ok);
    assert.ok(data.checks.find((x) => x.name === "execution: strategy type normal output has config tapes")?.ok);
    assert.match(md, /Return PF –/);
    assert.doesNotMatch(md, /checks: [^\n]*FAILED/);
  });

  it("checks engine config sets separately from active Signal tapes", () => {
    const { data } = replay({ noBase: true, signalCoverage: true });
    const check = data.checks.find((x) => x.name === "coverage: strategy type normal active tapes match kept sets");
    assert.equal(check?.ok, true);
    assert.equal(check?.expected, 1);
    assert.equal(check?.actual, 1);
    assert.equal(data.coverage.tapes["normal|wide"].activeConfigs, 2, "combined rows still report both populations");
    assert.equal(data.coverage.engineTapes["normal|wide"].activeConfigs, 1);
    assert.equal(data.coverage.signalTapes["normal|wide"].activeConfigs, 1);
  });

  it("reports measured no-loss PF separately from the finite Base gate score and labels later funnel stages", () => {
    const { data, md, html } = replay({ baseNoLoss: true });
    assert.equal(data.total.orders, 1);
    assert.equal(data.total.pf, 4, "the JSON gate-score convention remains finite");
    assert.equal(data.settings.wf.longH, 1, "reports preserve the actual config-selection history");
    assert.match(md, /\| Micro \| ∞ \(no loss\) \| 1 of 3 \| 1\.10 \| ∞ \(no loss\) \| 1 of 2 \| ∞ \(no loss\) \| 1 \|/);
    assert.match(md, /Micro min PF.*pooled PF ∞ \(no loss\), median gate score 4\.00/);
    assert.match(md, /candidate pool \(pre-validation\)/);
    assert.match(md, /post-Base config-pass instances \(hourly; may repeat\)/);
    assert.match(md, /post-gate virtual closes \(pre-funding\)/);
    assert.match(md, /funded settled orders and their PF are reported separately/);
    assert.match(md, /additional per-config entry last-N check is off \(wf\.lastN = 0\)/);
    assert.match(md, /Config-evaluation history is 1 h \(max of longH and preH\)/);
    assert.match(md, /Replay-only selection-window override: 1 h; it does not change normal runtime settings/);
    assert.match(md, /normal runtime settings\. The additional per-config entry last-N check/);
    assert.match(md, /Replay-only minimum green-hour fraction for config selection: 100% of the selection window/);
    assert.match(md, /Separate post-Base paper Live-entry replay: last 25 closes per config/);
    assert.doesNotMatch(md, /Native liveLastN is not replayed/);
    assert.match(html, /pooled PF ∞ \(no loss\)/);
  });

  it("reports the paper Live last-N gate separately from walk-forward order results", () => {
    const { md } = replay({ liveValidation: {
      lastN: 3, minPf: 1.1, since: H, judged: 4, passing: 3, paused: 1, skipped: 7,
      onExchange: 0, exchangeCloses: 0, groupLastN: 0, groups: [],
    } });
    assert.match(md, /## Post-Base paper Live gate/);
    assert.match(md, /4 config windows had enough closes to be judged: 3 passed and 1 were paused; 7 new entry candidates were rejected/);
    assert.match(md, /hourly order and PF tables above describe the causal walk-forward simulation/);
  });

  it("keeps equal current range counts labeled as independent measurements", () => {
    const { md, writeup, html } = replay({ noBase: true });
    for (const text of [md, writeup, summaryOf(html)]) {
      assert.match(text, /Wide min PF – · 0\/1 · Micro min PF – · 0\/1/);
      assert.doesNotMatch(text, /no per-range split/);
    }
  });

  it("marks equal legacy counts as copied when range provenance is absent", () => {
    const { md } = replay({ noBase: true, legacyRangeRows: true });
    assert.match(md, /no per-range split/);
  });

  it("zeros floating-point cap residue before cash/unit allocation and records the original ghost amount", () => {
    const { data, report, md, writeup, html } = replay({ caps: true, exhaustedCap: true });
    const ghost = data.sizedOrders.find((x) => x.cfg.endsWith("|ghost"));
    assert.ok(ghost.rawGot > 0 && ghost.rawGot <= 1e-9);
    assert.equal(ghost.unitNotional, 0); assert.equal(ghost.sizedPnl, 0); assert.equal(ghost.roundoffZeroed, true);
    assert.ok(data.ownershipPrecision.capped.roundoffZeroed > 0);
    assert.equal(data.ownershipPrecision.epsilonUsd, 1e-9);
    assert.equal(data.total.balanceEnd, 1);
    assert.equal(data.total.orders, 2);
    assert.equal(data.total.fundedOrders, 2);
    assert.equal(data.total.zeroAllocatedOrders, 1);
    assert.equal(data.total.pf, 0, "unfunded winner does not manufacture funded return evidence");
    assert.equal(data.total.virtual.n, 3);
    assert.equal(data.total.virtual.pf, 4);
    assert.equal(data.total.virtual.noLoss, true, "the numeric4 is explicitly the no-loss sentinel");
    assert.equal(report.strategies.total.n, 2);
    assert.equal(data.hours[0].orders, 2); assert.equal(data.hours[0].virtual.n, 3);
    assert.equal(data.hours[0].pf, 0); assert.equal(data.typeHours[0].closes, 2);
    assert.equal(data.typeHours[0].pf, 0); assert.equal(data.types[0].n, 2);
    assert.equal(data.types[0].avgHoldMin, 14, "funded hold average excludes the unfunded ghost duration");
    assert.equal(data.types[0].mddU, 0);
    assert.equal(data.total.cashBasis, "funded-modeled-allocations");
    assert.equal(data.total.uncapped.n, 3); assert.equal(data.total.uncapped.pf, 4);
    assert.equal(data.checksOk, true);
    assert.ok(data.checks.find((x) => x.name === "hour × type: funded type columns add up to funded orders closed, every hour")?.ok);
    assert.ok(data.checks.find((x) => x.name === "hour × type: type columns add up to virtual closes, every hour")?.ok);
    assert.match(md, /\| hour \(UTC\) \| funded orders closed \| virtual closes \|/);
    assert.match(md, /\| 01:00 \| 2 \| 3 \| 2 · – · 0 % · \$0\.00/);
    assert.match(md, /2 funded orders · 3 virtual closes/);
    assert.match(md, /Virtual diagnostic:.*3 closes · Return PF ∞ \(no loss\)/);
    assert.match(writeup, /Separate virtual diagnostic: 3 closes/);
    assert.match(summaryOf(html), /Separate virtual diagnostic:<\/b> 3 closes/);
    assert.match(summaryOf(html), /Virtual positions/);
    assert.match(md, /virtual positions \/ owned orders closed/);

  });
  it("keeps return PF primary across JSON, Markdown, write-up and the rendered HTML headline", () => {
    const { data, report, md, writeup, html } = replay();
    assert.equal(data.total.orders, 2);
    assert.equal(data.total.pf, 2.5);
    assert.equal(data.total.cashPf, 2.5, "equal $1 notional cash PF matches unit-return PF");
    assert.ok(Math.abs(data.total.cashPfDiagnostic - 12.5 / 5.625) < 1e-6, "sized-dollar PF keeps the actual allocation result");
    assert.equal(report.total.pf, 2.5);
    assert.equal(report.strategies.total.pf, 2.5);
    assert.equal(data.hours[0].pf, 2.5);
    assert.equal(data.hours[0].cashPf, 2.5);
    assert.ok(Math.abs(data.hours[0].cashPfDiagnostic - 12.5 / 5.625) < 1e-6);
    assert.equal(data.hours[0].cumCashPf, 2.5);
    assert.ok(Math.abs(data.hours[0].cumCashPfDiagnostic - 12.5 / 5.625) < 1e-6);
    assert.equal(data.typeHours[0].pf, 2.5);
    assert.equal(data.evidence.actualExecution, false);
    assert.equal(data.evidence.pfBasis, "net-returns");
    assert.equal(data.evidence.statisticsScope.primary, "all funded settled simulated book orders, including separately qualified Signals");
    assert.equal(data.evidence.statisticsScope.benchmark, "engine-only funded settled orders from the post-Base validated Base cohort; Signal orders are reported separately");
    assert.match(md, /Base-to-execution benchmark is engine-only, and Signal PF is separate/);
    assert.match(md, /Diagnostic: every config over the run window/);
    assert.match(md, /This all-candidate table is diagnostic only: it is not the PF benchmark/);
    assert.match(writeup, /Base-to-execution benchmark below isolates engine orders from Base-qualified pairs whose configs passed post-Base validation/);
    assert.match(md, /Return PF 2\.50.*cash PF \(base \$1\) 2\.50.*sized \$ PF diagnostic 2\.22/);
    assert.match(md, /\| Return PF \| cash PF \(base \$1\) \| sized \$ PF diagnostic \|/);
    assert.match(writeup, /\| Return PF \| cash PF \(base \$1\) \| sized \$ PF diagnostic \|/);
    assert.match(writeup, /2\.50 \| 2\.50 \| 2\.22/);
    assert.match(md, /no exchange execution proof/);
    assert.doesNotMatch(md, /PF \$|ate the edge|sizing.*flattered/);
    const summary = summaryOf(html);
    assert.match(summary, /Return PF<\/div>\s*<div class="v[^"]*">2\.50/);
    assert.match(summary, /Cash PF \(base \$1\)<\/div>\s*<div class="v[^\"]*">2\.50/);
    assert.match(summary, /Sized \$ PF diagnostic<\/div>\s*<div class="v[^\"]*">2\.22/);
    assert.match(summary, /no exchange execution proof/);
    assert.match(html, /cum sized \$ PF diagnostic/);
  });

  it("the uncapped comparison uses return PF first on the same closed-order sample", () => {
    const { data, md, html } = replay({ caps: true });
    assert.equal(data.total.uncapped.n, data.total.orders);
    assert.equal(data.total.uncapped.pf, data.total.pf);
    assert.equal(data.total.uncapped.gpR, data.total.gpR);
    assert.equal(data.total.uncapped.glR, data.total.glR);
    assert.match(md, /Without the caps:[^\n]*Return PF 2\.50.*cash PF \(base \$1\) 2\.50.*sized \$ PF diagnostic 2\.22/);
    assert.match(summaryOf(html), /Without the caps:[^\n]*Return PF 2\.50.*cash PF \(base \$1\) 2\.50.*sized \$ PF diagnostic 2\.22/);
  });

  it("removes the execution volume multiple from primary PF while retaining sized cash results", () => {
    const { data, report, md, html } = replay({ weighted: true, caps: true });
    assert.equal(data.total.pf, 2.5);
    assert.equal(data.total.gpR, 0.5);
    assert.equal(data.total.glR, 0.2);
    assert.equal(report.total.pf, 2.5);
    assert.equal(data.hours[0].pf, 2.5);
    assert.equal(data.typeHours[0].pf, 2.5);
    assert.equal(data.types[0].pf, 2.5);
    assert.equal(data.total.uncapped.pf, 2.5);
    assert.equal(data.evidence.returns.state, "recorded");
    assert.match(data.evidence.returns.note, /ladder\/tape leg semantics remain/);
    assert.equal(data.total.cashPf, 2.5, "normalized base-one PF removes execution volume like Return PF");
    assert.equal(data.total.cashPfDiagnostic, 5, "sized-dollar PF retains the raised winning order");
    assert.match(md, /Return PF 2\.50/);
    assert.match(summaryOf(html), /Return PF<\/div>\s*<div class="v[^"]*">2\.50/);
  });

  it("does not report a fabricated primary PF when an execution multiplier is invalid", () => {
    const { data, report, md, html } = replay({ weighted: true, invalidReturn: true });
    assert.equal(data.total.pf, null);
    assert.equal(data.total.pfR, null);
    assert.equal(report.total.pf, null);
    assert.equal(data.hours[0].pf, null);
    assert.equal(data.total.cashPf, null);
    assert.equal(data.total.cashPfDiagnostic, 5);
    assert.equal(data.total.pfBasis, "unavailable");
    assert.equal(data.evidence.returns.unknownReturns, 1);
    assert.equal(data.evidence.returns.state, "unavailable");
    assert.equal(data.checksOk, false, "unknown primary returns do not become a passing verified report");
    assert.match(md, /Return PF unavailable/);
    assert.match(summaryOf(html), /Return PF<\/div>\s*<div class="v[^"]*">unavailable/);
  });
});

describe("session qualification matches the runtime's full indication rules", () => {
  const tactic = "tactic-trend-s@m15";
  const other = "rsi-mom-14-20@m15";
  const gates = { ...DEFAULT_GATES, minPf: 1.05, minTrades: 2, maxDdr: 0, baseSetsMinPf: undefined, rangeMinPf: { short: 1.05, general: 1.4 } };
  const sample = (pf) => statsOf([{ r: pf * 0.01, entryT: 0, exitT: 1 }, { r: -0.01, entryT: 2, exitT: 3 }], 4);
  const run = (ind, pf) => ({ bot: "follow", ind, full: sample(pf), ranges: { sh: sample(pf), gn: sample(pf) }, score: 1 });
  const applies = { enabled: () => true };
  const runtimeTags = (r, g = gates) => {
    const settings = { ...DEFAULT_SETTINGS, gates: g, grid: { ...DEFAULT_SETTINGS.grid, baseRanges: true, allSets: false } };
    return basePass([r], settings, applies).pairTags[`${r.bot}|${r.ind}`] ?? [];
  };

  it("matches actual runtime admission, Tactic 1.1, range floors and absent own-cell fallback", () => {
    for (const ind of [tactic, other]) for (const pf of [1.04, 1.08, 1.1, 1.45]) {
      const r = run(ind, pf);
      assert.deepEqual(sessionBaseTags(r, gates, applies, ALL_RANGE_TAGS), runtimeTags(r), `${ind} PF ${pf}`);
      assert.equal(sessionOwnRangePassed(r, gates), Object.entries(r.ranges).some(([tag, st]) => rangeCellPass(gates, ind)(tag, st)));
    }
    assert.deepEqual(runtimeTags(run(tactic, 1.08)), []);
    assert.ok(runtimeTags(run(other, 1.08)).includes("sh"));
    assert.ok(!runtimeTags(run(tactic, 1.1)).includes("gn"), "stricter range minimum stays in force");
    const fallback = { ...run(tactic, 1.45), ranges: undefined };
    assert.deepEqual(sessionBaseTags(fallback, gates, applies, ALL_RANGE_TAGS), runtimeTags(fallback));
    assert.ok(runtimeTags(fallback).includes("gn"));
  });

  it("uses runtime Base-set gates, sample/DD gates and the no-loss score rather than infinity", () => {
    const setsGates = { ...gates, minPf: 1.3, baseSetsMinPf: 1.05 };
    for (const ind of [tactic, other]) {
      const r = run(ind, 1.2);
      assert.deepEqual(sessionBaseTags(r, setsGates, applies, ALL_RANGE_TAGS), runtimeTags(r, setsGates));
      assert.ok(runtimeTags(r, setsGates).includes(""));
      const few = { ...r, full: { ...r.full, n: 1 }, ranges: {} };
      assert.deepEqual(sessionBaseTags(few, gates, applies, ALL_RANGE_TAGS), runtimeTags(few));
      assert.deepEqual(runtimeTags(few), []);
      const ddGates = { ...gates, maxDdr: 0.5 };
      const dd = { ...r, full: { ...r.full, mdd: r.full.net }, ranges: {} };
      assert.deepEqual(sessionBaseTags(dd, ddGates, applies, ALL_RANGE_TAGS), runtimeTags(dd, ddGates));
      assert.deepEqual(runtimeTags(dd, ddGates), []);
      const noLoss = { ...r, full: statsOf([{ r: 0.01, entryT: 0, exitT: 1 }, { r: 0.01, entryT: 2, exitT: 3 }], 4), ranges: {} };
      const strict = { ...gates, minPf: 5, rangeMinPf: {} };
      assert.equal(noLoss.full.pf, SESSION_QUALIFICATION.noLossGateScore);
      assert.deepEqual(sessionBaseTags(noLoss, strict, applies, ALL_RANGE_TAGS), runtimeTags(noLoss, strict));
      assert.deepEqual(runtimeTags(noLoss, strict), []);
    }
  });

  it("records every full indication's effective validation minimum without first-row bias", () => {
    for (const inds of [[tactic, other], [other, tactic]]) {
      const row = {};
      for (const ind of inds) recordSessionMinimum(row, gates, "sh", ind);
      assert.equal(row.minPf, 1.05);
      assert.equal(row.minPfMax, 1.1);
      assert.deepEqual(row.minPfByInd, { [tactic]: 1.1, [other]: 1.05 });
      const strict = {};
      for (const ind of inds) recordSessionMinimum(strict, gates, "gn", ind);
      assert.equal(strict.minPf, 1.4);
      assert.equal(strict.minPfMax, 1.4);
    }
  });

  it("renders mixed current thresholds and marks historical aggregates as unverified without requalifying them", () => {
    const thresholds = { configs: 7, passed: 3, minPf: 1.05, minPfMax: 1.1, minPfByInd: { [tactic]: 1.1, [other]: 1.05 }, okGp: 0.12, okGl: 0.1 };
    const current = replay({ qualification: SESSION_QUALIFICATION, thresholds });
    assert.deepEqual(current.report.evalAfterBase["Short|normal"], thresholds);
    assert.equal(current.data.evidence.qualification.state, "recorded");
    assert.match(current.md, /1\.05–1\.10 \(varies by indication\)/);
    assert.match(current.writeup, /Tactic minimum return PF 1\.1/);
    assert.match(summaryOf(current.html), /Tactic minimum return PF 1\.1/);
    const legacy = replay({ thresholds });
    assert.deepEqual(legacy.report.evalAfterBase["Short|normal"], thresholds);
    assert.equal(legacy.data.evidence.qualification.state, "legacy-unverified");
    assert.match(legacy.md, /Archived qualification counts and thresholds are retained, not recomputed/);
    assert.match(legacy.writeup, /Historical dump/);
    assert.match(summaryOf(legacy.html), /Historical dump/);
    assert.equal(legacy.data.evidence.returns.state, "legacy-unverified");
    assert.match(legacy.md, /Historical source encoding was not recorded/);
    assert.equal(sessionQualificationEvidence({}).state, "legacy-unverified");
  });

  it("discloses partial return normalization without changing or certifying missing multipliers", () => {
    const evidence = sessionReturnEvidence({ trades: [{ r: 0.2, mult: 2 }, { r: -0.1 }] });
    assert.equal(evidence.state, "unavailable");
    assert.equal(evidence.missingMultRows, 1);
    assert.equal(evidence.unknownReturns, 1);
    assert.match(evidence.note, /1 of 2 closed orders lack a valid execution multiplier/);
    assert.match(evidence.note, /Archived coverage, variant and preset aggregates are retained, not recomputed/);
    const verified = sessionReturnEvidence({ trades: [{ r: 1, unitR: .02 }, { r: -1, unitR: -.01 }] });
    assert.equal(verified.state, "recorded");
    assert.equal(verified.unknownReturns, 0);
    assert.equal(verified.verifiedUnitRows, 2);
  });

  it("retains legacy variant/preset aggregates while withholding an unrecorded primary unit PF", () => {
    const old = { orders: 2, pf: 5, net: 80, gp: 100, gl: 20, byType: {}, hourN: [2], hourNet: [80], longs: { n: 1, net: 100 }, shorts: { n: 1, net: -20 }, skips: [], openEnd: 0, openNet: 0, mdd: 20 };
    const variants = { v: 1, tapes: 1, signalTapes: 0, reproduces: true, totalMs: 1, session: { orders: 2, pf: 5, net: 80 }, rows: [{ id: "baseline", group: "baseline", label: "Baseline", status: "run", ms: 1, summary: old }] };
    const presets = { old: { label: "Archived", stats: { n: 2, gp: 100, gl: 20, pf: 5, net: 80 } } };
    const result = replay({ variants, presets });
    assert.equal(result.data.variants.rows[0].summary.pfBasis, "legacy-unverified");
    assert.equal(result.data.variants.rows[0].summary.pf, 5, "archived value retained, not reconstructed");
    assert.equal(result.report.presets.old.stats.pfBasis, "legacy-unverified");
    assert.equal(result.report.presets.old.stats.pf, 5);
    assert.match(result.md, /Archived \| 2 \| unit basis not recorded \| 80\.00/);
    assert.match(result.md, /stored preset sample may include endpoint marks/);
    assert.match(summaryOf(result.html), /Archived variants without recorded unit gross sums/);
  });
});
