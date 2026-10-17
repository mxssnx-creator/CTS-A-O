#!/usr/bin/env node
// Read-only reduction of four already-completed frozen engine cases; never calculates strategies.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
import { orderKey } from "../src/core/sizing.ts";
import { BOOK_NOTIONAL_EPS_USD } from "./lib/book-notional.mjs";

const H = 3_600_000, ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CASES = ["baseline20", "reclaim20", "baseline22", "reclaim22"];
const canonical = (x) => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canonical(x[k])])) : x;
const json = (x) => JSON.stringify(canonical(x), null, 2) + "\n";
export const reviewHash = (x) => createHash("sha256").update(x).digest("hex");
const equal = (a, b) => json(a) === json(b);
const finite = (x) => typeof x === "number" && Number.isFinite(x);
const close = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
const empty = () => ({ n: 0, wins: 0, losses: 0, breakeven: 0, gp: 0, gl: 0, unknown: 0, cashGp: 0, cashGl: 0, unknownCash: 0 });
function add(b, r, cash) {
  b.n++;
  if (!finite(r)) b.unknown++;
  else if (r > 0) { b.wins++; b.gp += r; }
  else if (r < 0) { b.losses++; b.gl -= r; }
  else b.breakeven++;
  if (!finite(cash)) b.unknownCash++; else if (cash > 0) b.cashGp += cash; else b.cashGl -= cash;
}
function finish(b) {
  const known = !b.unknown && [b.gp, b.gl, b.gp - b.gl].every(finite) && (b.gl === 0 || finite(b.gp / b.gl)), cashKnown = !b.unknownCash && [b.cashGp, b.cashGl, b.cashGp - b.cashGl].every(finite);
  return { ...b, knownReturnCloses: b.wins + b.losses + b.breakeven, winRate: !b.unknown && b.n > 0 ? b.wins / b.n : null,
    pf: known && b.gl > 0 && finite(b.gp / b.gl) ? b.gp / b.gl : null,
    noLoss: known && b.n > 0 && b.gp > 0 && b.gl === 0, net: known ? b.gp - b.gl : null,
    cashNet: cashKnown ? b.cashGp - b.cashGl : null, cashPf: cashKnown && b.cashGl > 0 && finite(b.cashGp / b.cashGl) ? b.cashGp / b.cashGl : null,
    cashNoLoss: cashKnown && b.n > 0 && b.cashGp > 0 && b.cashGl === 0, known };
}
const utcHour = (exitT, startT) => Math.ceil((exitT - startT) / H) - 1;
function description(cfg) {
  const [bot, ind] = cfg.split("|"), lane = ind?.match(/@m\d+c?$/)?.[0] ?? "@m1";
  return { cfg, bot, ind, lane, indicationLane: `${bot}|${ind}`, reclaim8: /-reclaim8-/.test(ind ?? "") };
}

/** Only accepted settled closes with positive normalized native allocations enter primary PF. */
export function reduceStudyCase(raw, book, summary) {
  const { startT, endT } = raw.window ?? {};
  if (!Number.isSafeInteger(startT) || startT % H || endT - startT !== 24 * H) throw new Error("Expected complete aligned24h window");
  const allocations = new Map(), seen = new Set(), groups = new Map();
  for (const a of book.sizedOrders ?? []) {
    if (!Number.isSafeInteger(a.closeIndex) || a.closeIndex < 0) throw new Error("Invalid allocation closeIndex");
    allocations.set(a.closeIndex, allocations.has(a.closeIndex) ? null : a);
  }
  const total = empty(), reclaim = empty(), hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, startT: startT + hour * H, ...empty() }));
  let zeroAllocations = 0, unknownAllocations = 0;
  const group = (scope, key, d) => {
    const id = `${scope}:${key}`;
    if (!groups.has(id)) groups.set(id, { scope, key, ...(scope === "config" ? d : { bot: d.bot, ind: d.ind, lane: d.lane }), ...empty(), hours: new Map() });
    return groups.get(id);
  };
  for (const [i, x] of (raw.trades ?? []).entries()) {
    const h = utcHour(x.exitT, startT);
    if (h < 0 || h >= 24 || !finite(x.entryT) || !finite(x.exitT) || x.entryT < startT || x.entryT >= endT || x.exitT < x.entryT || x.markedOpen || ["end", "open"].includes(x.reason)) throw new Error("Prewindow/endpoint/invalid close in settled sample");
    const identity = `${orderKey(x)}|${x.exitT}|${x.kind ?? ""}`;
    if (seen.has(identity)) throw new Error("Duplicate settled close identity");
    seen.add(identity);
    const d = description(x.cfg), targets = [group("config", x.cfg, d), group("indication-lane", d.indicationLane, d)], a = allocations.get(i), vol = x.vol ?? 1;
    const valid = a && a.key === orderKey(x) && a.exitT === x.exitT && (!a.cfg || a.cfg === x.cfg) && finite(a.unitNotional) && a.unitNotional >= 0 && finite(a.allocatedNotional) && a.allocatedNotional >= 0 && finite(vol) && vol > 0 && (a.volume === undefined || a.volume === vol) && close(a.allocatedNotional, a.unitNotional * vol);
    if (valid && a.allocatedNotional <= BOOK_NOTIONAL_EPS_USD) { zeroAllocations++; continue; }
    if (!valid) unknownAllocations++;
    const r = valid ? modeledUnitReturn(x) : NaN, computedCash = valid && finite(x.r) ? x.r * a.unitNotional : NaN;
    const cash = a?.sizedPnl === undefined ? computedCash : close(computedCash, a.sizedPnl) ? a.sizedPnl : NaN;
    add(total, r, cash); add(hourly[h], r, cash);
    if (d.reclaim8) add(reclaim, r, cash);
    for (const g of targets) {
      add(g, r, cash);
      if (!g.hours.has(h)) g.hours.set(h, empty());
      add(g.hours.get(h), r, cash);
    }
  }
  if (allocations.size !== (raw.trades ?? []).length || [...allocations.keys()].some((i) => i >= raw.trades.length)) throw new Error("Allocation count/index coverage differs from settled sample");
  const hours = hourly.map(finish), aggregate = finish(total);
  const scopes = [...groups.values()].map((g) => {
    const active = [...g.hours].sort(([a], [b]) => a - b).map(([hour, b]) => ({ hour, ...finish(b) }));
    return { ...g, ...finish(g), hours: active, activeHours: active.length, negativeHours: active.filter((x) => x.net !== null && x.net < 0).length,
      positiveContributionsInPortfolioLosingHours: active.filter((x) => x.net > 0 && (hours[x.hour].net < 0 || hours[x.hour].cashNet < 0)).map((x) => ({ hour: x.hour, startT: hours[x.hour].startT, orders: x.n, unitNet: x.net, cashNet: x.cashNet, portfolioUnitNet: hours[x.hour].net, portfolioCashNet: hours[x.hour].cashNet, portfolioUnitLosing: hours[x.hour].net < 0, portfolioCashLosing: hours[x.hour].cashNet < 0 })) };
  });
  if (summary.fundedModeledSettled && (summary.fundedModeledSettled.n !== aggregate.n || !close(summary.fundedModeledSettled.gp, aggregate.gp) || !close(summary.fundedModeledSettled.gl, aggregate.gl))) throw new Error("Recomputed funded cohort differs from completed summary");
  if (book.total?.fundedOrders !== undefined && book.total.fundedOrders !== aggregate.n) throw new Error("Recomputed funded count differs from native book");
  const stages = summary.hourly ?? [];
  return { window: raw.window, total: aggregate, reclaim8: finish(reclaim), zeroAllocations, unknownAllocations,
    accountingComplete: unknownAllocations === 0 && aggregate.known && !aggregate.unknownCash && finite(aggregate.cashNet),
    hours: hours.map((x, i) => ({ ...x, validation: stages[i]?.validation ?? null, stages: stages[i]?.stages ?? null })), scopes,
    positiveHours: hours.filter((x) => x.net > 0).length, negativeHours: hours.filter((x) => x.net < 0).length, flatHours: hours.filter((x) => x.net === 0).length,
    positiveCashHours: hours.filter((x) => x.cashNet > 0).length, negativeCashHours: hours.filter((x) => x.cashNet < 0).length,
    progression: summary.progression ?? {}, continuousValidation: summary.continuousValidation ?? {},
    baseRejections: raw.engine?.baseWhy ?? summary.progression?.baseRejections ?? [],
    configGateRejections: raw.tapeAgg?.evalFails ?? summary.progression?.strategyGateFailures ?? {},
    entryRejections: raw.engine?.skips ?? summary.progression?.entryRejections ?? {},
    performance: summary.performance ?? {}, equityDrawdown: summary.equityDrawdown ?? {}, endpointMarks: { open: raw.openEnd?.length ?? 0, excluded: true } };
}

const read = (file) => { const bytes = fs.readFileSync(file); return { data: JSON.parse(bytes), hash: reviewHash(bytes) }; };
export function assertCompletedCaseSet(directories) {
  // Inspect completion envelopes for all four cases before opening any final-day trade file.
  for (const key of CASES) {
    if (!directories[key]) throw new Error(`Complete verified ${key} required before comparison or exclusion review`);
    const s = read(path.join(directories[key], "summary.json")), r = read(path.join(directories[key], "run-result.json"));
    if (s.data.complete !== true || r.data.complete !== true || r.data.summarySha256 !== s.hash) throw new Error(`Complete verified ${key} required before comparison or exclusion review`);
  }
}
/** Load only one case at a time; discard raw tapes before opening the next case. */
export function loadCompletedCase(directory, { sourceRoot = ROOT } = {}) {
  const dir = path.resolve(directory), s = read(path.join(dir, "summary.json")), result = read(path.join(dir, "run-result.json")), p = read(path.join(dir, "..", "protocol.json"));
  if (s.data.complete !== true || result.data.complete !== true || s.data.structural?.some((x) => x.ok !== true) || result.data.summarySha256 !== s.hash) throw new Error("Incomplete/stale case summary");
  const c = p.data.cases?.find((x) => x.id === path.basename(dir));
  if (!c || s.data.provenance?.protocolSha256 !== p.hash || s.data.provenance.feedSha256 !== c.feedSha256 || s.data.sourceSha256 !== reviewHash(json(p.data.sources))) throw new Error("Protocol/source/feed provenance mismatch");
  if (s.data.symbolCount !== undefined && s.data.symbolCount !== c.symbols.length || s.data.variant !== undefined && s.data.variant !== c.variant || s.data.settingsSha256 !== undefined && s.data.settingsSha256 !== c.runtime.settingsSha256) throw new Error("Summary identity/settings provenance differs from protocol");
  const checks = { protocol: p.hash, summary: s.hash, sourceManifest: s.data.sourceSha256, feed: c.feedSha256, feedAvailable: fs.existsSync(c.feed), sourceFilesChecked: 0, unavailableSources: [] };
  if (checks.feedAvailable && reviewHash(fs.readFileSync(c.feed)) !== c.feedSha256) throw new Error("Frozen feed hash mismatch");
  for (const f of p.data.sources ?? []) {
    if (path.isAbsolute(f.path) || f.path.split(/[\\/]/).includes("..")) throw new Error("Unsafe source manifest path");
    const file = path.join(sourceRoot, f.path);
    if (!fs.existsSync(file)) { checks.unavailableSources.push(f.path); continue; }
    if (reviewHash(fs.readFileSync(file)) !== f.sha256) throw new Error(`Frozen source changed: ${f.path}`);
    checks.sourceFilesChecked++;
  }
  const raw = read(path.join(dir, "raw.json")), book = read(path.join(dir, "book", "data.json"));
  if (raw.hash !== s.data.provenance.rawSha256 || book.hash !== s.data.provenance.bookSha256) throw new Error("Raw/book hash mismatch");
  if (!book.data.checks?.length || book.data.checks.some((x) => x.ok !== true)) throw new Error("Native book accounting incomplete");
  if (!equal(raw.data.window, s.data.window) || raw.data.window.startT !== p.data.window.tradeStartT || raw.data.window.endT !== p.data.window.endT || raw.data.engine?.universe?.length !== c.symbols.length || !equal([...(raw.data.engine?.universe ?? [])].sort(), [...c.symbols].sort()) || !equal(raw.data.settings?.effective, c.runtime.settings)) throw new Error("Actual window/universe/settings differ from frozen protocol");
  return { ...reduceStudyCase(raw.data, book.data, s.data), symbolCount: c.symbols.length, symbols: c.symbols, variant: c.variant, settings: c.runtime.settings, wf: c.runtime.wf, bookSettings: p.data.book, provenance: checks };
}

function matched(a, b) {
  const withoutFocus = ({ focus: _focus, ...rest }) => rest;
  if (!equal(a.window, b.window) || !equal(a.symbols, b.symbols) || a.provenance.feed !== b.provenance.feed || a.provenance.sourceManifest !== b.provenance.sourceManifest || !equal(withoutFocus(a.settings), withoutFocus(b.settings)) || !equal(a.wf, b.wf) || !equal(a.bookSettings, b.bookSettings)) throw new Error("Baseline/candidate settings, source, feed, sizing or window are not matched");
  const oldFocus = new Set(a.settings.focus ?? []), added = (b.settings.focus ?? []).filter((x) => !oldFocus.has(x));
  if ([...oldFocus].some((x) => !b.settings.focus.includes(x)) || added.length !== 12 || new Set(added).size !== 12 || added.some((x) => !/-reclaim8-/.test(x))) throw new Error("Candidate focus must add the12 unique opt-in reclaim8 identities only");
}
const pruneEligible = (s) => s && s.n >= 50 && s.activeHours >= 6 && s.known && !s.unknown && finite(s.pf) && s.pf < 1 && s.negativeHours * 3 >= s.activeHours * 2;

/** Prospective candidates only, selected after both full22 cases and both development cases complete. */
export function buildExpandedReview(cases) {
  for (const key of CASES) if (!cases[key]?.accountingComplete) throw new Error(`Complete verified ${key} required before comparison or exclusion review`);
  if (cases.baseline20.symbolCount !== 20 || cases.reclaim20.symbolCount !== 20 || cases.baseline22.symbolCount !== 22 || cases.reclaim22.symbolCount !== 22) throw new Error("Exact20/22 symbol cases required");
  if ([20, 22].some((n) => cases[`baseline${n}`].variant !== "baseline" || cases[`reclaim${n}`].variant !== "reclaim8")) throw new Error("Baseline/reclaim variants mislabeled");
  matched(cases.baseline20, cases.reclaim20); matched(cases.baseline22, cases.reclaim22);
  for (const policy of ["baseline", "reclaim"]) {
    const dev = cases[`${policy}20`], final = cases[`${policy}22`];
    if (dev.window.endT !== final.window.startT || !equal(dev.symbols, final.symbols.slice(0, 20)) || dev.provenance.sourceManifest !== final.provenance.sourceManifest) throw new Error("Development/final split or frozen source differs");
    const withoutUniverse = ({ symbols: _symbols, forceSymbols: _forceSymbols, ...rest }) => rest;
    if (!equal(withoutUniverse(dev.settings), withoutUniverse(final.settings)) || !equal(dev.wf, final.wf) || !equal(dev.bookSettings, final.bookSettings)) throw new Error("Development/final policy settings or sizing differ");
  }
  const qualifying = [];
  for (const policy of ["baseline", "reclaim"]) {
    const dev = cases[`${policy}20`], final = cases[`${policy}22`], lookup = new Map(final.scopes.map((x) => [`${x.scope}:${x.key}`, x]));
    for (const a of dev.scopes) {
      const b = lookup.get(`${a.scope}:${a.key}`);
      if (pruneEligible(a) && pruneEligible(b)) qualifying.push({ policy, scope: a.scope, key: a.key, development: a, final: b });
    }
  }
  const windows = [20, 22].map((n) => {
    const baseline = cases[`baseline${n}`], candidate = cases[`reclaim${n}`];
    return { role: n === 20 ? "development" : "final", symbols: n, window: baseline.window, baseline, candidate,
      delta: { orders: candidate.total.n - baseline.total.n, cashNet: candidate.total.cashNet - baseline.total.cashNet, unitNet: candidate.total.net - baseline.total.net, positiveHours: candidate.positiveHours - baseline.positiveHours },
      note: "Reclaim8 contribution is a subset of the candidate shared book. Its contribution is not the policy difference; allocation and accepted membership can change." };
  });
  return { schema: "cts-expanded-study-review-v1", complete: true, windows, exclusions: { schema: "cts-prospective-exclusion-candidates-v1", applied: false,
    rule: "Same exact config or indication/lane scope in both windows of the same policy; >=50 funded closes and >=6 active hours each, complete known unit returns, PF<1 each and negative unit net in >=2/3 active hours each. Overlapping config and indication scopes are not additive independent evidence.",
    qualificationRequires: CASES, qualifying, note: "Candidate exclusions require a new prospective replay. No config/default is changed and no after-prune PF is inferred from the scored final day." } };
}

const number = (x, digits = 3) => finite(x) ? x.toFixed(digits) : "—";
const pf = (x) => x.noLoss ? "no losses" : number(x.pf);
const rate = (x) => number(finite(x.winRate) ? x.winRate * 100 : null, 2);
export function expandedReviewMarkdown(r) {
  const rows = ["# Expanded post-Base study review", "", "Funded settled modeled closes use canonical unit returns after costs. Wins/losses use the exact return sign; flat means exactly zero. Win rate is wins divided by all funded closes, including flats, and is unavailable for empty or unknown-return samples. Sized cash results and endpoint equity remain separate. Every UTC trading hour is retained.", ""];
  for (const w of r.windows) {
    rows.push(`## ${w.role} — ${w.symbols} symbols`, "", "| Policy | Funded orders | Wins/losses/flat | Win rate % | Return PF | Sized net $ | Unit net | Positive/negative/flat hours | Max equity DD % | Compute ms | Peak RSS MB |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const [label, x] of [["Baseline", w.baseline], ["Reclaim8 candidate", w.candidate]]) rows.push(`|${label}|${x.total.n}|${x.total.wins}/${x.total.losses}/${x.total.breakeven}|${rate(x.total)}|${pf(x.total)}|${number(x.total.cashNet, 6)}|${number(x.total.net, 6)}|${x.positiveHours}/${x.negativeHours}/${x.flatHours}|${number(finite(x.equityDrawdown.maxPct) ? x.equityDrawdown.maxPct * 100 : null)}|${number(x.performance.computeMs, 0)}|${number(x.performance.peakRssMb, 0)}|`);
    rows.push("", "| UTC hour | Baseline orders | PF | Sized net $ | Candidate orders | PF | Sized net $ | Win rate % baseline/candidate | Wins/losses/flat baseline; candidate | Baseline/candidate config validations passed |", "|---|---:|---:|---:|---:|---:|---:|---:|---|---:|");
    for (let i = 0; i < 24; i++) { const a = w.baseline.hours[i], b = w.candidate.hours[i]; rows.push(`|${new Date(a.startT).toISOString()}|${a.n}|${pf(a)}|${number(a.cashNet, 6)}|${b.n}|${pf(b)}|${number(b.cashNet, 6)}|${rate(a)}/${rate(b)}|${a.wins}/${a.losses}/${a.breakeven}; ${b.wins}/${b.losses}/${b.breakeven}|${a.validation?.passed ?? "—"}/${b.validation?.passed ?? "—"}|`); }
    rows.push("", `Reclaim8-only candidate contribution: ${w.candidate.reclaim8.n} funded closes; ${w.candidate.reclaim8.wins}/${w.candidate.reclaim8.losses}/${w.candidate.reclaim8.breakeven} wins/losses/flat; win rate ${rate(w.candidate.reclaim8)}%; PF ${pf(w.candidate.reclaim8)}; sized net $${number(w.candidate.reclaim8.cashNet, 6)}. ${w.note}`, "", "Base rejection reasons, config first failures, entry rejections, stage progress, exact identities and positive contributions during portfolio losing hours are retained in review.json.", "");
    rows.push("| Policy | Base range | Evaluated / passed | First rejects: closes / net / PF / DDR |", "|---|---|---:|---|");
    for (const [label, x] of [["Baseline", w.baseline], ["Candidate", w.candidate]]) for (const b of x.baseRejections) rows.push(`|${label}|${b.tag || "wide"}|${b.evaluated ?? "—"}/${b.passed ?? "—"}|${["closes", "net", "pf", "ddr"].map((key) => b.first?.[key] ?? 0).join(" / ")}|`);
    rows.push("", "| Policy | Config range | Evaluated / passed | First gate rejects |", "|---|---|---:|---|");
    const gates = ["closes", "net", "pf", "ddt", "ddr", "pre", "lastN", "rangeGate", "lcb", "green", "stable", "type off", "pair not Base-passed"];
    for (const [label, x] of [["Baseline", w.baseline], ["Candidate", w.candidate]]) for (const [range, b] of Object.entries(x.configGateRejections)) rows.push(`|${label}|${range}|${b.evaluatedN ?? "—"}/${b.passed ?? "—"}|${gates.filter((key) => b[key] > 0).map((key) => `${key}: ${b[key]}`).join(", ") || "none"}|`);
    rows.push("");
  }
  rows.push("## Prospective exclusion candidates", "", `${r.exclusions.qualifying.length} matching scopes meet the prewritten rule. No exclusion was applied; config and indication scopes can overlap.`, "", "| Policy | Scope | Exact identity | Dev/final orders | Dev/final PF | Dev/final negative/active hours | Positive contributions in losing hours |", "|---|---|---|---:|---:|---:|---:|");
  for (const x of r.exclusions.qualifying) rows.push(`|${x.policy}|${x.scope}|${x.key.replaceAll("|", "\\|")}|${x.development.n}/${x.final.n}|${pf(x.development)}/${pf(x.final)}|${x.development.negativeHours}/${x.development.activeHours}; ${x.final.negativeHours}/${x.final.activeHours}|${x.development.positiveContributionsInPortfolioLosingHours.length}/${x.final.positiveContributionsInPortfolioLosingHours.length}|`);
  rows.push("", r.exclusions.note, ""); return rows.join("\n");
}

export function expandedReviewMain(argv) {
  const arg = (key) => { const i = argv.indexOf(`--${key}`); return i < 0 ? undefined : argv[i + 1]; };
  if (argv.includes("--help")) { console.log("Usage: node --experimental-strip-types scripts/core-expanded-study-review.mjs --baseline20 CASE_DIR --reclaim20 CASE_DIR --baseline22 CASE_DIR --reclaim22 CASE_DIR --out NEW_DIRECTORY"); return; }
  if (CASES.some((key) => !arg(key)) || !arg("out")) throw new Error("All four completed case directories and --out required");
  const output = path.resolve(arg("out")); if (fs.existsSync(output)) throw new Error("Preserve previous evidence: --out must be a new directory");
  assertCompletedCaseSet(Object.fromEntries(CASES.map((key) => [key, arg(key)])));
  const cases = {};
  for (const key of CASES) cases[key] = loadCompletedCase(arg(key));
  const review = buildExpandedReview(cases);
  fs.mkdirSync(output, { recursive: true });
  for (const [name, data] of [["review.json", json(review)], ["review.md", expandedReviewMarkdown(review)], ["prospective-exclusion-candidates.json", json(review.exclusions)]]) fs.writeFileSync(path.join(output, name), data, { flag: "wx" });
  console.log(json({ complete: true, output, prospectiveScopes: review.exclusions.qualifying.length, configurationsChanged: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) expandedReviewMain(process.argv.slice(2));
