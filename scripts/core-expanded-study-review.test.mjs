import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { orderKey } from "../src/core/sizing.ts";
import { CASES, reduceStudyCase, buildExpandedReview, expandedReviewMarkdown, loadCompletedCase, assertCompletedCaseSet, reviewHash } from "./core-expanded-study-review.mjs";

const H = 3_600_000, CFG = "follow|break-mc-rel-don8-5-dd24-balanced@m5|tp0.4|sl1|tr0|h192|mc";
const OTHER = "follow|other@m5|tp0.4|sl1|tr0|h192|mc";
const canonical = (x) => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canonical(x[k])])) : x;
const json = (x) => JSON.stringify(canonical(x), null, 2) + "\n";
function trade(cfg, i, h, r, startT = 0, rest = {}) { return { cfg, sym: "FIXTURE-USDT", side: 1, entryT: startT + i + 1, exitT: startT + (h + 1) * H, r, mult: 1, vol: 1, kind: "normal", reason: "sl", ...rest }; }
function evidence(trades, startT = 0) {
  const raw = { window: { startT, endT: startT + 24 * H }, trades, engine: { baseWhy: [{ tag: "mc", first: { closes: 3 } }], skips: { symPf: 2 } }, tapeAgg: { evalFails: { Micro: { net: 4 } } }, openEnd: [{ cfg: CFG, r: 999 }] };
  const book = { sizedOrders: trades.map((x, closeIndex) => ({ closeIndex, key: orderKey(x), cfg: x.cfg, exitT: x.exitT, unitNotional: 1, allocatedNotional: x.vol ?? 1, volume: x.vol ?? 1, sizedPnl: x.r })) };
  const summary = { hourly: Array.from({ length: 24 }, () => ({ validation: { checked: 2, passed: 1 }, stages: { afterBase: { n: 4 } } })), performance: { computeMs: 5, peakRssMb: 12 }, equityDrawdown: { maxPct: 0.01 } };
  return { raw, book, summary };
}
const reduce = (f) => reduceStudyCase(f.raw, f.book, f.summary);
function caseFixture(n, candidate, startT = 0, count = 50) {
  const trades = Array.from({ length: count }, (_, i) => trade(CFG, i, i % 6, i % 6 < 4 ? -0.02 : 0.01, startT));
  // The scope makes a positive contribution in hour4 while the shared portfolio loses.
  trades.push(trade(OTHER, 100, 4, -1, startT));
  const f = evidence(trades, startT), symbols = Array.from({ length: n }, (_, i) => `FIXTURE-${i}`);
  return { ...reduce(f), symbolCount: n, symbols, variant: candidate ? "reclaim8" : "baseline", settings: { focus: ["follow|base@m5", ...(candidate ? Array.from({ length: 12 }, (_, i) => `follow|break-mc-rel-reclaim8-${i}-dd24-balanced@m5`) : [])], cost: 0.0015, sizing: { mode: "equityPct", pct: 0.001 } }, wf: { preH: 24 }, bookSettings: { balance: 1000, pct: 0.001 }, provenance: { feed: `feed-${n}`, sourceManifest: "fixed-source" } };
}
function casesFixture() { return Object.fromEntries(CASES.map((key) => [key, caseFixture(key.endsWith("20") ? 20 : 22, key.startsWith("reclaim"), key.endsWith("20") ? 0 : 24 * H)])); }

test("canonical unit returns, exact close-index allocations, zero funding and endpoints stay separate", () => {
  const f = evidence([trade(CFG, 0, 0, 0.04, 0, { mult: 4, vol: 2 }), trade(CFG, 1, 1, -0.01), trade(CFG, 2, 2, 100)]);
  Object.assign(f.book.sizedOrders[0], { unitNotional: 5, allocatedNotional: 10, sizedPnl: 0.2 });
  Object.assign(f.book.sizedOrders[2], { unitNotional: 0, allocatedNotional: 0, sizedPnl: 0 });
  f.book.sizedOrders.reverse();
  const r = reduce(f);
  assert.equal(r.total.n, 2); assert.equal(r.total.pf, 1); assert.ok(Math.abs(r.total.cashPf - 20) < 1e-12);
  assert.equal(r.zeroAllocations, 1); assert.equal(r.endpointMarks.open, 1); assert.equal(r.hours.length, 24);
  assert.equal(r.hours[0].n, 1, "close exactly at01:00 belongs to00:00 hour");
  assert.equal(r.hours[23].pf, null); assert.equal(r.hours[23].net, 0);
  assert.equal(r.accountingComplete, true);
});

test("hourly engine validations and Signal ranking activity retain separate source scopes and unknown samples", () => {
  const f = evidence([trade(CFG, 0, 0, 0.01)]);
  f.summary.hourly[0].validation = { steps: 1, checked: 7, passed: 3, seatedConfigs: 2 };
  f.raw.stepsByRange = [{ t: 0, byRange: { mc: { tapes: 20, validated: 2, candidates: 6, taken: 1 }, sig: { tapes: 9, validated: 4, candidates: 6, taken: 2 } } }];
  f.summary.hourly[1].rangeProgress = { sig: { tapes: 9, validated: 0, candidates: 0, taken: 0 } };
  delete f.summary.hourly[3].validation;
  f.summary.hourly[4].rangeProgress = { sig: { tapes: 9, validated: 1.5, candidates: -1 } };
  const before = json(f), r = reduce(f);
  assert.equal(json(f), before, "read-only extraction must preserve raw evidence");
  assert.equal(r.total.n, 1); assert.equal(r.total.net, 0.01);
  assert.equal(r.hours[0].engineValidation.scope, "engine-configs-only");
  assert.equal(r.hours[0].engineValidation.checked, 7); assert.equal(r.hours[0].engineValidation.passed, 3);
  assert.equal(r.hours[0].engineValidation.seatedConfigs, 2);
  assert.deepEqual(r.hours[0].validation, r.hours[0].engineValidation);
  assert.equal(r.hours[0].signalActivity.activeGroups, 4);
  assert.equal(r.hours[0].signalActivity.candidates, 6); assert.equal(r.hours[0].signalActivity.taken, 2);
  assert.match(r.hours[0].signalActivity.basis, /not per-config validation passes/);
  assert.equal(r.hours[1].signalActivity.activeGroups, 0); assert.equal(r.hours[1].signalActivity.taken, 0);
  assert.equal(r.hours[2].signalActivity, null, "missing Signal stage is unknown, not zero activity");
  assert.equal(r.hours[3].engineValidation, null, "missing engine checks remain unknown");
  assert.equal(r.hours[4].signalActivity.activeGroups, null); assert.equal(r.hours[4].signalActivity.candidates, null);
});

test("review labels run-start all-cell and post-Base gate denominators separately and displays24 parallel hourly rows", () => {
  const f = evidence([trade(CFG, 0, 0, 0.01)]);
  // These are the actual raw field shapes: configs counts every engine tape, evaluatedN counts only
  // Base/type-admitted cells, and evalAfterBase retains Base-qualified cells including type rejects.
  f.raw.tapeAgg.evalFails = { Micro: { configs: 10, evaluatedN: 6, passed: 3, "base off": 2, "type off": 2, net: 3 } };
  f.raw.tapeAgg.evalAfterBase = { "Micro|normal": { configs: 8, passed: 3, "type off": 2, net: 3 } };
  f.summary.hourly[0].validation = { steps: 1, checked: 6, passed: 3, seatedConfigs: 2 };
  f.summary.hourly[0].rangeProgress = { sig: { tapes: 9, validated: 4, candidates: 6, taken: 2 } };
  const reduced = reduce(f), r = buildExpandedReview(casesFixture());
  Object.assign(r.windows[0].baseline, { hours: reduced.hours, configGateRejections: reduced.configGateRejections, afterBaseConfigGates: reduced.afterBaseConfigGates });
  const markdown = expandedReviewMarkdown(r);
  assert.match(markdown, /engine config validations passed/);
  assert.match(markdown, /Sampled peak RSS MB \(500ms\)/);
  assert.match(markdown, /\|Baseline\|Micro\|10\/6\/3\|net: 3, type off: 2, base off: 2\|/);
  assert.match(markdown, /\|Baseline\|Micro\\\|normal\|8\/3\|net: 3, type off: 2\|/);
  assert.match(markdown, /\|1970-01-01T00:00:00\.000Z\|6\/3\/2\|2\/1\/—\|9\/4\/6\/2\|—\/—\/—\/—\|/);
  const tables = markdown.split("| UTC hour | Baseline engine checked/passed/seated configs").slice(1);
  assert.equal(tables.length, 2);
  for (const table of tables) assert.equal(table.split("Reclaim8-only candidate contribution:")[0].split("\n").filter((line) => /^\|\d{4}-/.test(line)).length, 24);
  delete f.raw.tapeAgg;
  const missing = reduce(f);
  assert.equal(missing.configGateRejections, null); assert.equal(missing.afterBaseConfigGates, null);
});

test("hourly, config and reclaim win rates include exactly flat funded closes and retain unknown denominators", () => {
  const cfg = "follow|break-mc-rel-reclaim8-5-dd24-balanced@m5|tp0.4|sl1|tr0|h192|mc";
  const f = evidence([trade(cfg, 0, 0, 0.02), trade(cfg, 1, 0, -0.01), trade(cfg, 2, 0, 0)]);
  const r = reduce(f);
  const scopes = [r.total, r.hours[0], r.reclaim8, ...r.scopes, ...r.scopes.flatMap((x) => x.hours)];
  for (const x of scopes) {
    assert.equal(x.n, 3); assert.equal(x.wins, 1); assert.equal(x.losses, 1); assert.equal(x.breakeven, 1);
    assert.equal(x.knownReturnCloses, 3); assert.equal(x.unknown, 0); assert.equal(x.winRate, 1 / 3);
    assert.equal(x.pf, 2); assert.equal(x.cashPf, 2); assert.equal(x.net, 0.01);
  }
  assert.equal(r.hours[1].winRate, null, "empty hours have no measured win rate");
  const unknown = trade(cfg, 3, 0, -0.5); delete unknown.mult;
  f.raw.trades.push(unknown);
  f.book.sizedOrders.push({ closeIndex: 3, key: orderKey(unknown), cfg, exitT: unknown.exitT, unitNotional: 1, allocatedNotional: 1, volume: 1, sizedPnl: unknown.r });
  const bad = reduce(f);
  for (const x of [bad.total, bad.hours[0], bad.reclaim8, ...bad.scopes, ...bad.scopes.flatMap((x) => x.hours)]) {
    assert.equal(x.n, 4); assert.equal(x.knownReturnCloses, 3); assert.equal(x.unknown, 1);
    assert.equal(x.wins, 1); assert.equal(x.losses, 1); assert.equal(x.breakeven, 1);
    assert.equal(x.winRate, null, "unknown fourth close must not report1/3 as a complete win rate");
    assert.equal(x.pf, null);
  }
});

test("unit-return signs preserve the smallest nonzero gains and losses without an epsilon", () => {
  const f = evidence([trade(CFG, 0, 0, Number.MIN_VALUE), trade(CFG, 1, 0, -Number.MIN_VALUE), trade(CFG, 2, 0, -0)]);
  const r = reduce(f);
  assert.equal(r.total.wins, 1); assert.equal(r.total.losses, 1); assert.equal(r.total.breakeven, 1);
  assert.equal(r.total.winRate, 1 / 3); assert.equal(r.total.gp, Number.MIN_VALUE); assert.equal(r.total.gl, Number.MIN_VALUE);
  assert.equal(r.total.pf, 1); assert.equal(r.total.cashPf, 1);
});

test("unknown unit evidence and mismatched or duplicate allocations cannot drop losses to improve PF", () => {
  const f = evidence([trade(CFG, 0, 0, 0.01), trade(CFG, 1, 1, -0.02)]);
  f.book.sizedOrders[1].key = "wrong-loss-key";
  const bad = reduce(f); assert.equal(bad.total.n, 2); assert.equal(bad.total.pf, null); assert.equal(bad.total.unknown, 1); assert.equal(bad.accountingComplete, false);
  f.book.sizedOrders[1].key = orderKey(f.raw.trades[1]); delete f.raw.trades[1].mult;
  assert.equal(reduce(f).total.pf, null);
  f.raw.trades[1].mult = 1; f.book.sizedOrders.push({ ...f.book.sizedOrders[1] });
  assert.equal(reduce(f).unknownAllocations, 1);
  f.raw.trades[1] = { ...f.raw.trades[0] };
  assert.throws(() => reduce(f), /Duplicate settled/);
});

test("cash inconsistencies invalidate completeness and sub-epsilon funding does not invent an order", () => {
  const f = evidence([trade(CFG, 0, 0, -0.01)]);
  f.book.sizedOrders[0].sizedPnl = 99;
  assert.equal(reduce(f).accountingComplete, false);
  Object.assign(f.book.sizedOrders[0], { unitNotional: 1e-10, allocatedNotional: 1e-10, sizedPnl: -1e-12 });
  const r = reduce(f); assert.equal(r.total.n, 0); assert.equal(r.zeroAllocations, 1); assert.equal(r.total.pf, null);
});

test("exclusion rule needs both complete22 cases and matches each scope within the same policy", () => {
  const cases = casesFixture(), r = buildExpandedReview(cases);
  const cfg = r.exclusions.qualifying.find((x) => x.policy === "baseline" && x.scope === "config" && x.key === CFG);
  assert.ok(cfg); assert.equal(cfg.development.n, 50); assert.equal(cfg.development.activeHours, 6); assert.equal(cfg.development.negativeHours, 4);
  assert.equal(cfg.development.wins, 16); assert.equal(cfg.development.losses, 34); assert.equal(cfg.development.winRate, 16 / 50);
  assert.ok(Math.abs(cfg.development.pf - 0.16 / 0.68) < 1e-12); assert.equal(cfg.development.pf, cfg.development.cashPf);
  assert.equal(cfg.development.positiveContributionsInPortfolioLosingHours[0].hour, 4);
  assert.equal(r.exclusions.applied, false); assert.equal(r.windows[0].baseline.hours.length, 24); assert.equal(r.windows[1].candidate.hours.length, 24);
  assert.deepEqual(r.windows[0].baseline.baseRejections[0].first, { closes: 3 });
  const before = json(cases); expandedReviewMarkdown(r); assert.equal(json(cases), before, "review must not change configs or cases");
  const missing = { ...cases }; delete missing.reclaim22;
  assert.throws(() => buildExpandedReview(missing), /reclaim22 required/);
  assert.match(expandedReviewMarkdown(r), /new prospective replay/);
  assert.match(expandedReviewMarkdown(r), /Win rate % baseline\/candidate/);
  assert.ok(!Object.hasOwn(r.exclusions, "afterPrunePf"));
});

test("minimum samples, unknown returns and exact identity cannot borrow qualification from siblings", () => {
  const cases = casesFixture(); cases.baseline22 = caseFixture(22, false, 24 * H, 49);
  let r = buildExpandedReview(cases);
  assert.ok(!r.exclusions.qualifying.some((x) => x.policy === "baseline" && x.scope === "config" && x.key === CFG));
  cases.baseline22 = caseFixture(22, false, 24 * H);
  const exact = cases.baseline22.scopes.find((x) => x.scope === "config" && x.key === CFG); exact.key += "-different";
  r = buildExpandedReview(cases);
  assert.ok(!r.exclusions.qualifying.some((x) => x.policy === "baseline" && x.scope === "config" && x.key === CFG));
  cases.baseline22.accountingComplete = false;
  assert.throws(() => buildExpandedReview(cases), /baseline22 required/);
});

test("matched comparisons reject sizing, source, feed and chronological split changes", () => {
  for (const mutate of [
    (c) => { c.reclaim20.settings.sizing.pct = 0.02; },
    (c) => { c.reclaim22.provenance.feed = "other-feed"; },
    (c) => { c.reclaim22.provenance.sourceManifest = "different-source"; },
    (c) => { c.baseline22.window.startT++; c.reclaim22.window.startT++; },
    (c) => { c.baseline22.settings.cost = c.reclaim22.settings.cost = 0.002; },
  ]) { const c = casesFixture(); mutate(c); assert.throws(() => buildExpandedReview(c), /not matched|split|policy settings/); }
});

test("loader verifies complete-result and protocol/source/feed/raw/book hashes from tiny synthetic files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cts-study-review-"));
  try {
    const dir = path.join(root, "baseline-20"); fs.mkdirSync(path.join(dir, "book"), { recursive: true });
    const f = evidence([trade(CFG, 0, 0, -0.01)]), symbols = Array.from({ length: 20 }, (_, i) => `FIXTURE-${i}`), settings = { focus: ["fixture"], cost: 0.0015 };
    f.raw.engine.universe = symbols; f.raw.settings = { effective: settings };
    f.book.checks = [{ name: "fixture accounting", ok: true }];
    const feed = path.join(root, "feed.json"), source = path.join(root, "source.mjs");
    fs.writeFileSync(feed, "{}"); fs.writeFileSync(source, "// synthetic only\n");
    const sources = [{ path: "source.mjs", sha256: reviewHash(fs.readFileSync(source)) }];
    const protocol = { cases: [{ id: "baseline-20", variant: "baseline", symbols, feed, feedSha256: reviewHash(fs.readFileSync(feed)), runtime: { settings, wf: {} } }], sources, book: {}, window: { tradeStartT: 0, endT: 24 * H } };
    fs.writeFileSync(path.join(root, "protocol.json"), json(protocol));
    fs.writeFileSync(path.join(dir, "raw.json"), json(f.raw)); fs.writeFileSync(path.join(dir, "book/data.json"), json(f.book));
    const summary = { ...f.summary, complete: true, structural: [{ ok: true }], window: f.raw.window, sourceSha256: reviewHash(json(sources)), fundedModeledSettled: reduce(f).total,
      provenance: { protocolSha256: reviewHash(json(protocol)), feedSha256: protocol.cases[0].feedSha256, rawSha256: reviewHash(json(f.raw)), bookSha256: reviewHash(json(f.book)) } };
    fs.writeFileSync(path.join(dir, "summary.json"), json(summary));
    const resultFile = path.join(dir, "run-result.json"); fs.writeFileSync(resultFile, json({ complete: true, summarySha256: reviewHash(json(summary)) }));
    const loaded = loadCompletedCase(dir, { sourceRoot: root }); assert.equal(loaded.total.n, 1); assert.equal(loaded.provenance.sourceFilesChecked, 1);
    fs.writeFileSync(source, "// changed\n"); assert.throws(() => loadCompletedCase(dir, { sourceRoot: root }), /source changed/);
    fs.writeFileSync(source, "// synthetic only\n"); fs.appendFileSync(feed, " "); assert.throws(() => loadCompletedCase(dir, { sourceRoot: root }), /feed hash/);
    fs.writeFileSync(feed, "{}"); fs.appendFileSync(path.join(dir, "raw.json"), " "); assert.throws(() => loadCompletedCase(dir, { sourceRoot: root }), /Raw\/book hash/);
    fs.writeFileSync(resultFile, json({ complete: false, summarySha256: reviewHash(json(summary)) })); assert.throws(() => loadCompletedCase(dir, { sourceRoot: root }), /Incomplete/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("all four completion envelopes are required before opening any final raw market evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cts-study-envelope-"));
  try {
    const dirs = Object.fromEntries(CASES.map((key) => [key, path.join(root, key)]));
    for (const key of CASES) {
      fs.mkdirSync(dirs[key]); const s = json({ complete: true });
      fs.writeFileSync(path.join(dirs[key], "summary.json"), s);
      fs.writeFileSync(path.join(dirs[key], "run-result.json"), json({ complete: key !== "reclaim22", summarySha256: reviewHash(s) }));
    }
    assert.throws(() => assertCompletedCaseSet(dirs), /reclaim22 required/);
    const s = fs.readFileSync(path.join(dirs.reclaim22, "summary.json"));
    fs.writeFileSync(path.join(dirs.reclaim22, "run-result.json"), json({ complete: true, summarySha256: reviewHash(s) }));
    assert.doesNotThrow(() => assertCompletedCaseSet(dirs));
    assert.ok(!fs.existsSync(path.join(dirs.baseline22, "raw.json")), "envelope preflight does not need or open raw final trades");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
