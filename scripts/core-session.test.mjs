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
function replay({ caps = false, weighted = false, invalidReturn = false, qualification, thresholds, variants, presets, exhaustedCap = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cts-session-report-"));
  try {
    const raw = {
      at: "2026-10-14T00:00:00.000Z", symbols: ["TEST-USDT"],
      settings: {
        preH: 1, runH: 1, tactics: "off", signals: false, toggles: {}, block: {},
        wf: {}, gates: { minPf: 1.1 }, lanes: [1], cost: 0, focus: 0, disabledKinds: [], ranges: {},
        live: { maxPositionX: 0.75, maxExposureX: 7 },
        book: { balance: 100, notional: 5, sizing: { mode: "equityPct", pct: 0.25 }, leverage: 10 },
      },
      window: { startT: H, endT: 2 * H },
      trades: [
        { cfg: "combo|ema-9-21@m1|win", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 2 * M, entry: 100, exit: 150, r: 0.5, reason: "tp", vol: 1, mult: 1 },
        { cfg: "combo|ema-9-21@m1|loss", sym: "TEST-USDT", side: 1, entryT: H + 3 * M, exitT: H + 4 * M, entry: 150, exit: 120, r: -0.2, reason: "sl", vol: 1, mult: 1 },
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
        { cfg: "follow|ema-9-21@m1|a", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 10 * M, entry: 100, exit: 100, r: 0, vol: 1, mult: 1 },
        { cfg: "follow|ema-9-21@m1|b", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 20 * M, entry: 100, exit: 100, r: 0, vol: 2, mult: 2 },
        { cfg: "follow|ema-9-21@m1|ghost", sym: "TEST-USDT", side: 1, entryT: H + 2 * M, exitT: H + 15 * M, entry: 100, exit: 110, r: 0.1, vol: 1, mult: 1 },
      ];
      raw.closes = { "TEST-USDT": Array.from({ length: 60 }, (_, i) => [H + i * M, 100]) };
    }
    if (qualification) raw.qualification = qualification;
    if (variants) raw.variants = variants;
    if (presets) raw.presets = presets;
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
  it("zeros floating-point cap residue before cash/unit allocation and records the original ghost amount", () => {
    const { data } = replay({ caps: true, exhaustedCap: true });
    const ghost = data.sizedOrders.find((x) => x.cfg.endsWith("|ghost"));
    assert.ok(ghost.rawGot > 0 && ghost.rawGot <= 1e-9);
    assert.equal(ghost.unitNotional, 0); assert.equal(ghost.sizedPnl, 0); assert.equal(ghost.roundoffZeroed, true);
    assert.ok(data.ownershipPrecision.capped.roundoffZeroed > 0);
    assert.equal(data.ownershipPrecision.epsilonUsd, 1e-9);
    assert.equal(data.total.balanceEnd, 1);
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
    assert.match(md, /Return PF 2\.50.*cash PF diagnostic 2\.22/);
    assert.match(md, /\| Return PF \| cash PF diagnostic \|/);
    assert.match(writeup, /\| Return PF \| cash PF diagnostic \|/);
    assert.match(writeup, /2\.50 \| 2\.22/);
    assert.match(md, /no exchange execution proof/);
    assert.doesNotMatch(md, /PF \$|ate the edge|sizing.*flattered/);
    const summary = summaryOf(html);
    assert.match(summary, /Return PF<\/div>\s*<div class="v[^"]*">2\.50/);
    assert.match(summary, /cash PF diagnostic 2\.22/);
    assert.match(summary, /no exchange execution proof/);
  });

  it("the uncapped comparison uses return PF first on the same closed-order sample", () => {
    const { data, md, html } = replay({ caps: true });
    assert.equal(data.total.uncapped.n, data.total.orders);
    assert.equal(data.total.uncapped.pf, data.total.pf);
    assert.equal(data.total.uncapped.gpR, data.total.gpR);
    assert.equal(data.total.uncapped.glR, data.total.glR);
    assert.match(md, /Without the caps:[^\n]*Return PF 2\.50.*cash PF diagnostic 2\.22/);
    assert.match(summaryOf(html), /Without the caps:[^\n]*Return PF 2\.50.*cash PF diagnostic 2\.22/);
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
    assert.match(md, /Return PF 2\.50/);
    assert.match(summaryOf(html), /Return PF<\/div>\s*<div class="v[^"]*">2\.50/);
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
