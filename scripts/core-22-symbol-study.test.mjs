import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STUDY_SYMBOLS, studyWindow, validateStudyFeed, studyCommand, studyEnvironment, studyRuntimeSettings, studyHour, summarizeStudy, studyEntryHistoryAudit, finishStudyReturns, studyMemoryAbort, studyChild } from "./core-22-symbol-study.mjs";

const H = 3_600_000;
test("study freezes24h trading with24h evaluated prehistory; older candles only warm indicators", () => {
  const w = studyWindow();
  assert.equal(w.endT - w.tradeStartT, 24 * H);
  assert.equal(w.tradeStartT - w.evaluationFromT, 24 * H);
  assert.equal(w.evaluationFromT - w.indicatorStartT, 349 * H);
  assert.equal(studyWindow(w.endT, 168).indicatorWarmupH, 205);
  assert.equal(STUDY_SYMBOLS.length, 22);
  assert.ok(STUDY_SYMBOLS.includes("ETC-USDT")); assert.ok(!STUDY_SYMBOLS.includes("TON-USDT"));
  assert.throws(() => studyWindow(123), /complete UTC hour/);
});

test("feed validation rejects missing bars, extra symbols and omitted ranking history", () => {
  const symbols = STUDY_SYMBOLS.slice(0, 20), w = { indicatorStartT: 0, endT: H };
  const c = (t) => ({ t, o: 100, h: 101, l: 99, c: 100, v: 1 });
  const f = { tickers: symbols.map((symbol) => ({ symbol })), candles: Object.fromEntries(symbols.flatMap((s) => [[`${s}|1`, Array.from({ length: 60 }, (_, i) => c(i * 60_000))], [`${s}|60`, [c(0)]]])) };
  assert.equal(Object.keys(validateStudyFeed(f, symbols, w)).length, 20);
  const gap = structuredClone(f); gap.candles[`${symbols[0]}|1`][2].t++;
  assert.throws(() => validateStudyFeed(gap, symbols, w), /gapped/);
  const noRanking = structuredClone(f); delete noRanking.candles[`${symbols[0]}|60`];
  assert.throws(() => validateStudyFeed(noRanking, symbols, w), /ranking feed/);
  const extra = structuredClone(f); extra.tickers.push({ symbol: "EXTRA-USDT" });
  assert.throws(() => validateStudyFeed(extra, symbols, w), /Ticker symbols/);
});

test("preflight uses production complete nested ladders and unchanged gates with explicit loading coverage", async () => {
  const { DEFAULT_SETTINGS } = await import("../src/core/config.ts");
  const x = await studyRuntimeSettings(STUDY_SYMBOLS, studyWindow(), 18);
  assert.deepEqual(x.settings.grid, DEFAULT_SETTINGS.grid);
  assert.deepEqual(x.settings.gates, DEFAULT_SETTINGS.gates);
  assert.deepEqual(x.settings.tfDays, { 1: 18, 5: 18, 15: 18, 30: 18 });
  assert.deepEqual(x.settings.forceSymbols, STUDY_SYMBOLS);
  assert.equal(x.wf.validLastN, 15); assert.equal(x.wf.signalValidLastN, 25);
  assert.equal(x.wf.causalBase, true); assert.equal(x.wf.recordValidation, true);
  assert.ok(JSON.stringify(x.wf).length > 131072, "full default protection cells exceed one Linux argument");
  assert.ok(JSON.stringify(x.commandWf).length < 1024, "derived grid stays in frozen evidence rather than oversized argv");
  const production = await studyRuntimeSettings(STUDY_SYMBOLS, studyWindow());
  assert.deepEqual(production.settings.tfDays, DEFAULT_SETTINGS.tfDays, "default run preserves shorter production lane loading");
});

test("commands run the causal runtime offline with variants off and immutable replay output", () => {
  const p = { window: studyWindow(), budget: { heapMb: 4096, timeoutMinutes: 180 }, book: { balance: 1000, mode: "equityPct", pct: 0.001, leverage: 10 } };
  const c = { feed: "/frozen/feed20.json", symbols: STUDY_SYMBOLS.slice(0, 20), runtime: { settings: { symbols: 20, forceSymbols: STUDY_SYMBOLS.slice(0, 20), grid: { short: { tpOfCost: [9, 10], slOfTp: [1], trailOfTp: [0] } } }, commandWf: { causalBase: true, recordValidation: true } } };
  const cmd = studyCommand(p, c, "/result");
  assert.ok(cmd.includes("--dump-only")); assert.ok(cmd.includes("--tape-trades"));
  assert.equal(cmd[cmd.indexOf("--symbols") + 1], "20");
  assert.deepEqual(JSON.parse(cmd[cmd.indexOf("--settings") + 1]), c.runtime.settings);
  assert.deepEqual(JSON.parse(cmd[cmd.indexOf("--wf") + 1]), c.runtime.commandWf);
  assert.equal(cmd[cmd.indexOf("--pct") + 1], "0.001");
  assert.ok(studyCommand(p, c, "/result", "render").includes("--replay"));
  const env = studyEnvironment();
  assert.equal(env.CTS_CORE_VARIANTS, "0"); assert.equal(env.CTS_CORE_LIVE, "0");
  assert.equal(env.CTS_CORE_WORKERS, "2"); assert.equal(studyEnvironment(1).CTS_CORE_WORKERS, "1");
  assert.throws(() => studyEnvironment(3), /worker count/);
  assert.match(env.NODE_OPTIONS, /core-test-offline-guard/);
  assert.equal(env.BINGX_API_KEY, undefined);
});

test("engine memory abort stops only its own child and retains the exact incomplete reason", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-study-memory-"));
  try {
    const line = "  memory: memory pressure:1027 MB available—compute aborted · fallback micro carried";
    assert.equal(studyMemoryAbort(line), line.trim());
    assert.equal(studyMemoryAbort("allocator setting available; regular computation continues"), null);
    const result = await studyChild(["--input-type=module", "-e", `console.error(${JSON.stringify(line)}); setInterval(() => {}, 1000);`], join(dir, "engine.log"), 10_000, { workers: 2, watchMemory: true });
    assert.equal(result.memoryAbort, line.trim()); assert.equal(result.timedOut, false);
    assert.equal(result.signal, "SIGTERM"); assert.notEqual(result.exitCode, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("right-closed hour convention retains exact-hour closes in the preceding hour", () => {
  const w = studyWindow();
  assert.equal(studyHour(w.tradeStartT + H, w), 0);
  assert.equal(studyHour(w.tradeStartT + H + 1, w), 1);
  assert.equal(studyHour(w.endT, w), 23);
  assert.equal(finishStudyReturns({ n: 0, gp: 0, gl: 0, unknown: 0 }).pf, null);
  assert.equal(finishStudyReturns({ n: 1, gp: 1, gl: 0, unknown: 0 }).noLoss, true);
});

async function fixture() {
  const { orderKey } = await import("../src/core/sizing.ts");
  const window = studyWindow(), symbols = STUDY_SYMBOLS.slice(0, 20);
  const wf = { causalBase: true, preH: 24, simH: 24, longH: 24, validLastN: 15, signalValidLastN: 25 };
  const settings = { cost: 0.002, gates: { minPf: 1.1 }, tfs: [1, 5, 15, 30], toggles: { normal: true }, disabledKinds: [], focus: ["follow|test"], sizing: { mode: "equityPct", pct: 0.001 } };
  const runtime = { settings, wf, settingsSha256: "test" }, studyCase = { symbols, runtime }, protocol = { window, sources: [], book: { balance: 1000, mode: "equityPct", pct: 0.001, leverage: 10 } };
  const rows = [{ cfg: "follow|ema-9-21@m1|tp3|sl3|tr0|h24|gn", sym: symbols[0], side: 1, entryT: window.tradeStartT + 1, exitT: window.tradeStartT + H, r: 0.04, mult: 2, vol: 2, kind: "normal", reason: "tp" },
    { cfg: "follow|ema-9-21@m1|tp3|sl3|tr0|h24|gn", sym: symbols[1], side: -1, entryT: window.tradeStartT + 2, exitT: window.tradeStartT + H + 1, r: -0.01, mult: 1, vol: 1, kind: "normal", reason: "sl" }];
  const raw = { window: { startT: window.tradeStartT, endT: window.endT }, settings: { ...settings, wf, symbolsAsked: 20, lanes: settings.tfs, focus: 1, evaluationFromT: window.evaluationFromT, book: { balance: 1000, leverage: 10, sizing: settings.sizing }, live: { sizingMode: settings.sizing.mode } },
    engine: { universe: symbols, mem: { computeLevel: 0 }, coverage: { expectedCombos: 1, evaluated: 1 }, baseEvaluated: 1, basePassed: 1, tapes: 1 },
    validation: Array.from({ length: 24 }, (_, i) => ({ t: window.tradeStartT + i * H, checks: [[rows[0].cfg, i % 2 === 0, 25, 1.2, 0.12, 0.1]] })), trades: rows };
  const book = { sizedOrders: rows.map((x, closeIndex) => ({ key: orderKey(x), closeIndex, cfg: x.cfg, exitT: x.exitT, unitNotional: closeIndex === 0 ? 5 : 0, allocatedNotional: closeIndex === 0 ? 10 : 0 })) };
  return { raw, book, protocol, studyCase };
}

test("summary separates virtual/funded settled cohorts, unscales returns and retains all24 hours", async () => {
  const f = await fixture(), s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "paper step on compute #2:1 Real seats");
  assert.equal(s.complete, true);
  assert.equal(s.acceptedVirtualSettled.n, 2); assert.equal(s.acceptedVirtualSettled.pf, 2);
  assert.equal(s.fundedModeledSettled.n, 1); assert.equal(s.fundedModeledSettled.gp, 0.02);
  assert.equal(s.zeroAllocations, 1); assert.equal(s.hourly.length, 24);
  assert.equal(s.hourly[0].funded.n, 1); assert.equal(s.hourly[1].funded.n, 0);
  assert.equal(s.continuousValidation.failed, 12); assert.equal(s.progression.configsEverQualified, 1);
  assert.equal(s.pruning.performed, false);
});

test("summary fails closed on memory fallback, partial universe, missing validation or unknown allocations", async () => {
  const f = await fixture(); f.raw.engine.mem.computeLevel = 1; f.raw.engine.universe.pop(); f.raw.validation.pop(); f.book.sizedOrders.pop();
  const s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "universe not complete");
  assert.equal(s.complete, false); assert.equal(s.fundedModeledSettled.pf, null);
  assert.ok(s.structural.filter((x) => !x.ok).length >= 5);
  assert.equal(s.unknownAllocations, 1);
});

test("entry audit excludes future/tied history, keeps configured partial floor explicit and deduplicates entry episodes", async () => {
  const f = await fixture(), x = f.raw.trades[0], before = Array.from({ length: 7 }, (_, i) => [x.sym, x.side, x.entryT - 20 - i, x.entryT - 10 + i, 0.01]);
  f.raw.tapeTrades = [{ id: x.cfg, trades: [...before, [x.sym, x.side, x.entryT - 1, x.entryT, -10], [x.sym, x.side, x.entryT, x.entryT + 1, -10]] }];
  f.raw.trades = [x, { ...x, exitT: x.exitT + 1, r: 0.02 }];
  const s = await studyEntryHistoryAudit(f.raw, f.studyCase.runtime.wf, 5);
  assert.equal(s.distinctExecutedEntries, 1); assert.equal(s.repeatedEntryCloseSlices, 1);
  assert.equal(s.partialConfiguredFloorStrictBefore, 1); assert.equal(s.fullTargetStrictBefore, 0);
  const h = s.rows[0].candidateConfigPooled;
  assert.equal(h.availableStrictlyBefore, 7); assert.equal(h.availableAtOrBefore, 8); assert.equal(h.closesAtEntryTimestamp, 1);
  assert.ok(Math.abs(h.lastNStrictBefore.gp - 0.07) < 1e-12); assert.equal(h.lastNStrictBefore.gl, 0);
  assert.equal(h.lastNStrictBefore.n, 7); assert.equal(s.rows[0].previouslyAcceptedExecutionInRun.availableStrictlyBefore, 0);
  f.raw.settings.book.sizing.pct = 0.02;
  const invalidSizing = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "paper step on compute #2:1 Real seats");
  assert.equal(invalidSizing.structural.find((c) => c.name === "actual sizing parity").ok, false);
});
