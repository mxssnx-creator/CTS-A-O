// Independently reconstruct the fixed cohort already selected by a verified coordinator replay.
// Offline only: full frozen indicator context, unchanged protections, no new selection or parameter tuning.
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_SETTINGS, DEFAULT_TACTICS } from "../src/core/config.ts";
import { DEFAULT_SIGNALS } from "../src/core/signal-config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { entrySignal } from "../src/core/bots/bots.ts";
import { tacticCooldown } from "../src/core/indications/filters.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { signalCombos } from "../src/core/signals.ts";
import { simulate } from "../src/core/sim/backtest.ts";
import { filterEntries, compareTapeTrades } from "../src/core/sim/walkforward.ts";
import { symbolDirections } from "../src/core/sim/symbol-directions.ts";
import { profitFactor, settledHourT } from "../src/core/metrics/stats.ts";
import { evidenceHash, readReplayEvidence } from "./lib/replay-evidence.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const H = 3_600_000;
const near = (actual, expected, label) => assert.ok(
  Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(actual), Math.abs(expected)),
  `${label}: ${actual} differs from ${expected}`,
);
function aggregate(trades) {
  const a = { n: 0, wins: 0, losses: 0, zero: 0, gp: 0, gl: 0 };
  for (const t of trades) {
    assert.ok(Number.isFinite(t.unitR), "finite modeled unit return required");
    a.n++;
    if (t.unitR > 0) { a.wins++; a.gp += t.unitR; }
    else if (t.unitR < 0) { a.losses++; a.gl -= t.unitR; }
    else a.zero++;
  }
  return { ...a, pf: a.n ? profitFactor(a.gp, a.gl) : null, netPoints: (a.gp - a.gl) * 100 };
}
function assertAggregate(actual, expected, label) {
  for (const k of ["n", "wins", "losses", "zero", "gp", "gl", "pf", "netPoints"])
    if (actual[k] === null || expected[k] === null) assert.equal(actual[k], expected[k], `${label}.${k}`);
    else near(actual[k], expected[k], `${label}.${k}`);
}
function trimThrough(b, endT) {
  let n = 0;
  while (n < b.n && b.t[n] + b.tfMin * 60_000 <= endT) n++;
  return n === b.n ? b : { ...b, n, t: b.t.slice(0, n), o: b.o.slice(0, n), h: b.h.slice(0, n), l: b.l.slice(0, n), c: b.c.slice(0, n), v: b.v.slice(0, n) };
}
function directionalAfter(signal, bars, boundary, side) {
  const out = new Int8Array(signal.length);
  for (let i = 0; i + 1 < signal.length; i++)
    if (bars.t[i + 1] >= boundary && signal[i] * side > 0) out[i] = signal[i];
  return out;
}

export async function verifySelected({ evidenceRoot, cachePath, outDir }) {
  const verified = await readReplayEvidence(evidenceRoot, ROOT);
  const { report, pointer } = verified;
  const selected = report.rows.filter((r) => r.isQualified);
  const configs = [...new Map(selected.map((r) => [r.cfg, r])).values()];
  assert.equal(selected.length, report.qualifiedConfigSides);
  assert.equal(configs.length, report.runtimeSelection.configEvalPasses);
  assert.equal(configs.length, report.runtimeSelection.selectFixedPicks);
  assert.equal(DEFAULT_SETTINGS.cost, report.model.cost);
  const cacheBytes = await readFile(cachePath);
  assert.equal(evidenceHash(cacheBytes), report.market.cacheSha256, "frozen cache hash");
  const market = JSON.parse(cacheBytes.toString("utf8"));
  assert.deepEqual(Object.keys(market).sort(), report.market.symbols);
  assert.equal(Object.values(market).reduce((n, cs) => n + cs.length, 0), report.market.totalCandles);
  const fullBars = report.market.symbols.map((sym) => {
    const candles = market[sym];
    assert.equal(candles[0].t, report.market.startT);
    assert.equal(candles.at(-1).t + 60_000, report.market.endT);
    const bars = trimThrough(barsFromCandles(sym, 15, resample(candles, 1, 15)), report.market.endT);
    bars.lanes = [1, 5, 15, 30];
    return bars;
  });
  const universe = makeUniverse(fullBars);
  assert.equal(universe.bars.length, report.market.symbols.length);
  // Register exactly the frozen default source-pool identities, as the full-grid replay does.
  const knownPairs = new Set(signalCombos(DEFAULT_SIGNALS, [15]).map((p) => `${p.bot}|${p.ind}`));
  const entries = new Map();
  for (const config of configs) {
    const bot = config.cfg.split("|")[0];
    const key = `${bot}|${config.ind}`;
    assert.ok(knownPairs.has(key), `unknown frozen pair ${key}`);
    if (entries.has(key)) continue;
    entries.set(key, universe.bars.map((bars, s) => {
      const raw = entrySignal(bot, config.ind, universe.caches[s], DEFAULT_TACTICS);
      assert.ok(raw, `missing entry signal ${key}`);
      const filtered = filterEntries(raw, bars, universe.caches[s], DEFAULT_SIGNALS.filter);
      return { bars, signals: { 1: directionalAfter(filtered, bars, report.market.splitT, 1), "-1": directionalAfter(filtered, bars, report.market.splitT, -1) } };
    }));
  }
  const trades = [];
  const marks = [];
  const cooldown = tacticCooldown(DEFAULT_TACTICS);
  const rows = [];
  for (const config of configs) {
    const bot = config.cfg.split("|")[0];
    const expectedSides = new Map(selected.filter((r) => r.cfg === config.cfg).map((r) => [r.side, r]));
    assert.equal(expectedSides.size, 2, "fixed cohort keeps its two recorded sides");
    for (const { symbol: entry, direction: side } of symbolDirections(entries.get(`${bot}|${config.ind}`), () => [1, -1])) {
      const expected = expectedSides.get(side);
      const result = simulate(expected.id, entry.bars, entry.signals[side], config.protect, { cost: report.model.cost, cooldown });
      for (const tr of result.trades) {
        assert.ok(tr.entryT >= report.market.splitT && tr.exitT <= report.market.endT, "OOS close boundary");
        assert.equal(tr.side, side);
        trades.push({ cfg: config.cfg, configSideId: expected.id, ind: config.ind, kind: config.kind, range: config.range, sym: tr.sym, side: tr.side, entryT: tr.entryT, exitT: tr.exitT, unitR: tr.r, reason: tr.reason, settledHourT: settledHourT(tr.exitT) });
      }
      if (result.open) marks.push({ cfg: config.cfg, configSideId: expected.id, sym: entry.bars.sym, side, entryT: result.open.entryT, exitT: report.market.endT, unitR: result.open.mtm });
    }
    for (const expected of expectedSides.values()) {
      const closed = aggregate(trades.filter((t) => t.configSideId === expected.id));
      const endpointMarks = aggregate(marks.filter((t) => t.configSideId === expected.id));
      assertAggregate(closed, expected.oos.closed, expected.id);
      assertAggregate(endpointMarks, expected.oos.endpointMarks, `${expected.id} endpoint marks`);
      rows.push({ id: expected.id, cfg: config.cfg, kind: config.kind, range: config.range, side: expected.side, closed, endpointMarks });
    }
  }
  trades.sort(compareTapeTrades);
  const total = aggregate(trades);
  assertAggregate(total, report.cohorts.isQualifiedPool.closed, "selected total");
  const byDirection = Object.fromEntries([["long", 1], ["short", -1]].map(([name, side]) => [name, aggregate(trades.filter((t) => t.side === side))]));
  const byStrategy = Object.fromEntries([...new Set(trades.map((t) => t.kind))].map((kind) => [kind, aggregate(trades.filter((t) => t.kind === kind))]));
  for (const [k, v] of Object.entries(byDirection)) assertAggregate(v, report.byDirection[k], `direction ${k}`);
  for (const [k, v] of Object.entries(byStrategy)) assertAggregate(v, report.byStrategy[k], `strategy ${k}`);
  const hourly = [];
  for (let t = Math.floor(report.market.splitT / H) * H; t < report.market.endT; t += H)
    hourly.push({ t, at: new Date(t).toISOString(), ...aggregate(trades.filter((tr) => tr.settledHourT === t)) });
  const active = hourly.filter((h) => h.n);
  const green = active.filter((h) => h.netPoints > 0);
  const sortedPfs = active.map((h) => h.pf).sort((a, b) => a - b);
  const middle = sortedPfs.length >> 1;
  const median = sortedPfs.length % 2 ? sortedPfs[middle] : (sortedPfs[middle - 1] + sortedPfs[middle]) / 2;
  const worst = active.reduce((a, h) => !a || h.netPoints < a.netPoints ? h : a, null);
  assert.equal(active.length, report.hourly.activeHours);
  assert.equal(green.length, report.hourly.greenHours);
  near(green.length / active.length, report.hourly.greenShare, "hour green share");
  near(median, report.hourly.medianActiveHourPf, "hour median PF");
  assert.equal(worst.at, report.hourly.worstActiveHour.at);
  assert.equal(worst.n, report.hourly.worstActiveHour.closes);
  near(worst.pf, report.hourly.worstActiveHour.pf, "worst hour PF");
  near(worst.netPoints, report.hourly.worstActiveHour.netPoints, "worst hour net");
  assert.equal(hourly.reduce((n, h) => n + h.n, 0), trades.length);
  const raw = { schema: "cts-coordinator-selected-tape-v1", basis: report.model.returnBasis, sourceReport: verified.path, sourceReportSha256: pointer.sha256, sourceFingerprint: report.sourceFingerprint, cacheSha256: report.market.cacheSha256, trades, endpointMarks: marks };
  const bytes = JSON.stringify(raw, null, 2) + "\n";
  const summary = { schema: "cts-coordinator-selected-reverification-v1", generatedAt: new Date().toISOString(), status: "PASS", semantics: "Retrospective fixed IS-cutoff cohort; overlapping configs, not causal entry-gated execution or funded account returns.", sourceReport: verified.path, sourceReportSha256: pointer.sha256, sourceFingerprint: report.sourceFingerprint, cacheSha256: report.market.cacheSha256, verificationScriptSha256: evidenceHash(await readFile(fileURLToPath(import.meta.url))), rawTapeSha256: evidenceHash(bytes), selectedConfigs: configs.length, selectedSides: selected.length, closed: total, byDirection, byStrategy, rows, hourly: { activeHours: active.length, greenHours: green.length, greenShare: green.length / active.length, medianActiveHourPf: median, worstActiveHour: worst, rows: hourly } };
  // Re-read source fingerprints before publishing; concurrent source changes cannot certify this rerun.
  await readReplayEvidence(evidenceRoot, ROOT);
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "selected-tape.json"), bytes, { flag: "wx" });
  await writeFile(resolve(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
  return { outDir, closed: total, byDirection, byStrategy, selectedConfigs: configs.length, selectedSides: selected.length, activeHours: active.length, greenHours: green.length, rawTapeSha256: summary.rawTapeSha256 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
  const evidenceRoot = resolve(ROOT, args.get("evidence") ?? "runs/coordinator-v5-corrected-20261017");
  verifySelected({ evidenceRoot, cachePath: resolve(ROOT, args.get("cache") ?? "runs/recovered-signals-cache-20261017/market-cache.json"), outDir: resolve(ROOT, args.get("out") ?? `${evidenceRoot}/selected-reverification`) })
    .then((r) => process.stdout.write(JSON.stringify(r, null, 2) + "\n"))
    .catch((e) => { process.stderr.write(String(e?.stack ?? e) + "\n"); process.exitCode = 1; });
}
