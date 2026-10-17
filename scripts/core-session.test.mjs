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
function replay({ caps = false, weighted = false, cashVsUnit = false, signalCoordination = false, rangeType = false, invalidReturn = false, qualification, thresholds, variants, presets, exhaustedCap = false, coverage, signalProgress, live = { maxPositionX: 0.75, maxExposureX: 7 } } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cts-session-report-"));
  try {
    const raw = {
      at: "2026-10-14T00:00:00.000Z", symbols: ["TEST-USDT"],
      settings: {
        preH: 1, runH: 1, tactics: "off", signals: false, toggles: {}, block: {},
        wf: {}, gates: { minPf: 1.1 }, lanes: [1], cost: 0, focus: 0, disabledKinds: [], ranges: {},
        live,
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
    if (cashVsUnit) {
      raw.trades[0] = { ...raw.trades[0], r: 0.1, mult: 1, vol: 1 };
      raw.trades[1] = { ...raw.trades[1], r: -0.8, mult: 10, vol: 10 };
      raw.executionReturns = { version: 1, encoding: "tape-return-times-execution-mult" };
    }
    if (signalCoordination) {
      raw.settings.signals = { enabled: true, ranges: { short: true, medium: true } };
      raw.trades = [
        { cfg: "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 2 * M, entry: 100, exit: 110, r: 0.1, reason: "tp", vol: 1, mult: 1, kind: "normal" },
        { cfg: "follow|sig-ema-cross-m@m15|tp1|sl1|tr0.005|h32", sym: "TEST-USDT", side: -1, entryT: H + 3 * M, exitT: H + 4 * M, entry: 100, exit: 96, r: -0.04, reason: "sl", vol: 1, mult: 1, kind: "trailing" },
      ];
      raw.executionReturns = { version: 1, encoding: "tape-return-times-execution-mult" };
    }
    if (rangeType) {
      raw.trades = [
        { cfg: "combo|ema-9-21@m1|mc|normal-win", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 2 * M, entry: 100, exit: 110, r: 0.1, reason: "tp", vol: 1, mult: 1, kind: "normal" },
        { cfg: "combo|ema-9-21@m1|mc|normal-loss", sym: "TEST-USDT", side: -1, entryT: H + 3 * M, exitT: H + 4 * M, entry: 100, exit: 102, r: -0.02, reason: "sl", vol: 1, mult: 1, kind: "normal" },
        { cfg: "combo|ema-9-21@m15|mn|trailing-loss", sym: "TEST-USDT", side: 1, entryT: H + 5 * M, exitT: H + 6 * M, entry: 100, exit: 104, r: -0.04, reason: "trail", vol: 1, mult: 1, kind: "trailing" },
      ];
      raw.closes = { "TEST-USDT": Array.from({ length: 60 }, () => [H, 100]) };
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
    if (qualification) raw.qualification = qualification;
    if (variants) raw.variants = variants;
    if (presets) raw.presets = presets;
    if (coverage) raw.engine.coverage = coverage;
    if (signalProgress) raw.signalProgress = signalProgress;
    if (thresholds) {
      raw.engine.baseByRange = [{ tag: "sh", range: "Short", enabled: true, passed: 2, evaluated: 3, pfPassedPooled: 1.2 }];
      raw.tapeAgg = { evalAfterBase: { "Short|normal": thresholds } };
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
  it("uses the balance-relative live cap defaults when a saved settings object has no caps", () => {
    const { data } = replay({ caps: true, live: {} });
    assert.equal(data.total.caps.maxPositionX, 0.25);
    assert.equal(data.total.caps.maxExposureX, 2);
    assert.match(data.total.caps.source, /x01 defaults/);
  });

  it("reconciles fresh engine sets separately from held-only and Signal tapes", () => {
    const { data, report } = replay({
      coverage: {
        expectedCombos: 2,
        evaluated: 2,
        kindsAll: ["break", "signal"],
        byKind: { break: { evaluated: 1, passed: 1 }, signal: { evaluated: 1, passed: 1 } },
        toggles: { normal: true, trailing: false, dca: false, dcaActive: false, axis: false },
        ranges: { mc: true },
        noSets: [],
        sets: [{ ind: "break", tag: "mc", kind: "normal", grid: 1, built: 1, kept: 1, few: 0, skip: {} }],
        tapes: {
          "normal|mc": { configs: 2, activeConfigs: 1, engineConfigs: 2, freshEngineConfigs: 1, heldOnlyEngineConfigs: 1, carriedEngineConfigs: 0, signalConfigs: 0, closes: 0 },
          "normal|wide": { configs: 1, activeConfigs: 1, engineConfigs: 0, freshEngineConfigs: 0, heldOnlyEngineConfigs: 0, carriedEngineConfigs: 0, signalConfigs: 1, closes: 0 },
        },
      },
      signalProgress: { configs: [{ built: true }] },
    });
    assert.equal(data.checksOk, true);
    assert.ok(data.checks.find((x) => x.name === "coverage: strategy type normal fresh engine tapes match kept sets")?.ok);
    assert.ok(data.checks.find((x) => x.name === "coverage: range mc fresh engine tapes match kept sets")?.ok);
    assert.ok(data.checks.find((x) => x.name === "coverage: built Signal configs match Signal tapes")?.ok);
    assert.ok(data.checks.find((x) => x.name === "coverage: engine, held-only, carried, and Signal tape inventory reconciles")?.ok);
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
    assert.match(md, /\| 01:00 \| 2 \| 3 \| 2 · – · 0\.00 pp · 0 % · \$0\.00/);
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
    assert.ok(Math.abs(data.total.cashPf - 12.5 / 5.625) < 1e-6);
    assert.equal(report.total.pf, 2.5);
    assert.equal(report.strategies.total.pf, 2.5);
    assert.equal(data.hours[0].pf, 2.5);
    assert.equal(data.typeHours[0].pf, 2.5);
    assert.equal(data.evidence.actualExecution, false);
    assert.equal(data.evidence.pfBasis, "net-returns");
    assert.match(md, /unit-return PF 2\.50.*sized cash PF 2\.22/);
    assert.match(md, /\| unit-return PF \| unit net \(pp\) \| sized cash PF \|/);
    assert.match(writeup, /\| unit-return PF \| unit net \(pp\) \| sized cash PF \|/);
    assert.match(writeup, /2\.50 \| \+30\.00 pp \| 2\.22/);
    assert.match(md, /no exchange execution proof/);
    assert.doesNotMatch(md, /PF \$|ate the edge|sizing.*flattered/);
    const summary = summaryOf(html);
    assert.match(summary, /Unit-return PF<\/div>\s*<div class="v[^"]*">2\.50/);
    assert.match(summary, /sized cash PF 2\.22/);
    assert.match(summary, /no exchange execution proof/);
  });

  it("the uncapped comparison uses return PF first on the same closed-order sample", () => {
    const { data, md, html } = replay({ caps: true });
    assert.equal(data.total.uncapped.n, data.total.orders);
    assert.equal(data.total.uncapped.pf, data.total.pf);
    assert.equal(data.total.uncapped.gpR, data.total.gpR);
    assert.equal(data.total.uncapped.glR, data.total.glR);
    assert.match(md, /Without the caps:[^\n]*unit-return PF 2\.50.*sized cash PF 2\.22/);
    assert.match(summaryOf(html), /Without the caps:[^\n]*unit-return PF 2\.50.*sized cash PF 2\.22/);
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
    assert.equal(data.total.cashPf, 5, "cash result retains the raised winning order");
    assert.match(md, /unit-return PF 2\.50/);
    assert.match(summaryOf(html), /Unit-return PF<\/div>\s*<div class="v[^"]*">2\.50/);
  });

  it("shows positive unit PF and negative sized cash as separate metrics", () => {
    const { data, report, md, writeup, html } = replay({ cashVsUnit: true, caps: true });
    assert.equal(data.total.orders, 2);
    assert.equal(data.total.pf, 1.25);
    assert.ok(Math.abs(data.total.netU - 0.02) < 1e-9);
    assert.ok(data.total.net < 0, `sized cash net must remain negative, got ${data.total.net}`);
    assert.ok(data.total.cashPf < 1);
    assert.equal(report.total.pf, 1.25);
    assert.ok(report.total.net < 0);
    assert.match(md, /unit-return PF 1\.25 · unit net \+2\.00 pp · sized cash PF/);
    assert.match(md, /net cash [-−]\$/);
    assert.match(writeup, /1\.25 \| \+2\.00 pp \| [0-9.]+ \| [-−]\$/);
    assert.match(summaryOf(html), /Unit-return PF<\/div>\s*<div class="v[^"]*">1\.25/);
    assert.match(summaryOf(html), /net cash.*[-−]\$/);
  });

  it("reports each Signal source, short/medium range, lane, type and exact config separately", () => {
    const { data, report, md, html } = replay({ signalCoordination: true });
    assert.equal(data.checksOk, true);
    assert.deepEqual(Object.keys(report.signalRanges), ["short", "medium"]);
    assert.deepEqual(report.signalCoordinations.map((r) => r.key).sort(), [
      "ema-cross|medium|15m|trailing",
      "ema-cross|short|15m|normal",
    ]);
    assert.equal(report.signalConfigs.length, 2);
    assert.ok(data.checks.find((x) => x.name === "Σ Signal coordination unit net = Signal unit net")?.ok);
    assert.ok(data.checks.find((x) => x.name === "Σ exact Signal config unit net = Signal unit net")?.ok);
    assert.match(md, /ema-cross \| medium \| 15m \| Trailing/);
    assert.match(md, /ema-cross \| short \| 15m \| Normal/);
    assert.match(html, /Per coordination: source × range × lane × type/);
  });

  it("reports actual outcomes by protect range × Normal / Trailing and reconciles the partitions", () => {
    const { data, report, md, html } = replay({ rangeType: true });
    assert.equal(data.checksOk, true);
    assert.deepEqual(report.rangeTypes.map((r) => r.key), ["Micro|Normal", "Minimal|Trailing"]);
    assert.equal(report.rangeTypes[0].n, 2);
    assert.equal(report.rangeTypes[0].pf, 5);
    assert.equal(report.rangeTypes[1].n, 1);
    assert.equal(report.rangeTypes[1].pf, 0);
    assert.ok(data.checks.find((x) => x.name === "Σ range × type net = total net")?.ok);
    assert.ok(data.checks.find((x) => x.name === "Micro: range × type orders reconcile")?.ok);
    assert.ok(data.checks.find((x) => x.name === "Trailing: range × type unit net reconciles")?.ok);
    assert.match(md, /\| Micro \| Normal \| 2 \|/);
    assert.match(md, /\| Minimal \| Trailing \| 1 \|/);
    assert.match(html, /By protect range and strategy type/);
  });

  it("does not report a fabricated primary PF when an execution multiplier is invalid", () => {
    const { data, report, md, html } = replay({ weighted: true, invalidReturn: true });
    assert.equal(data.total.pf, null);
    assert.equal(data.total.pfR, null);
    assert.equal(report.total.pf, null);
    assert.equal(data.hours[0].pf, null);
    assert.equal(data.total.cashPf, 5);
    assert.equal(data.total.pfBasis, "unavailable");
    assert.equal(data.evidence.returns.unknownReturns, 1);
    assert.equal(data.evidence.returns.state, "unavailable");
    assert.equal(data.checksOk, false, "unknown primary returns do not become a passing verified report");
    assert.match(md, /unit-return PF unavailable/);
    assert.match(summaryOf(html), /Unit-return PF<\/div>\s*<div class="v[^"]*">unavailable/);
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
