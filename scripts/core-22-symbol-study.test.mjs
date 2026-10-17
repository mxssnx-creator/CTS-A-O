import { test } from "node:test";
import assert from "node:assert/strict";
import { STUDY_SYMBOLS, studyWindow, trimStudyFeed, validateStudyFeed, studyCommand, studyEnvironment, studyRuntimeSettings, studyHour, summarizeStudy, studyMarkdown, finishStudyReturns } from "./core-22-symbol-study.mjs";

const H = 3_600_000;
test("study freezes24h evaluated prehistory,24h trade and separate205h indicator warmup", () => {
  const w = studyWindow();
  assert.equal(w.endT - w.tradeStartT, 24 * H);
  assert.equal(w.tradeStartT - w.evaluationFromT, 24 * H);
  assert.equal(w.evaluationFromT - w.indicatorStartT, 205 * H);
  assert.equal(w.endT - w.indicatorStartT, 253 * H);
  assert.equal(w.selectionH, 24);
  assert.equal(STUDY_SYMBOLS.length, 22);
  assert.equal(STUDY_SYMBOLS[17], "ETC-USDT");
  assert.throws(() => studyWindow(123), /complete UTC hour/);
});

test("case feed trims397h and derives each ranking solely from its prior24h", () => {
  const end = Date.parse("2026-10-17T21:00:00Z"), from = end - 397 * H, symbols = STUDY_SYMBOLS.slice(0, 20);
  const cs = Array.from({ length: 397 * 60 }, (_, i) => { const p = 100 + i; return { t: from + i * 60_000, o: p, h: p + 1, l: p - 1, c: p, v: 1 }; });
  const source = { tickers: [{ sym: "FAKE-FUTURE", last: -1 }], candles: Object.fromEntries(symbols.map((s) => [`${s}|1`, cs])) };
  const dev = studyWindow(end - 24 * H), final = studyWindow(end), d = trimStudyFeed(source, symbols, dev), f = trimStudyFeed(source, symbols, final);
  assert.equal(d.candles[`${symbols[0]}|1`].length, 253 * 60);
  assert.equal(d.candles[`${symbols[0]}|60`].length, 253);
  assert.equal(d.candles[`${symbols[0]}|1`].at(-1).t, dev.endT - 60_000);
  assert.equal(d.tickers[0].last, cs.find((c) => c.t === dev.tradeStartT - 60_000).c);
  assert.equal(f.tickers[0].last, cs.find((c) => c.t === final.tradeStartT - 60_000).c);
  assert.notEqual(d.tickers[0].quoteVol, f.tickers[0].quoteVol);
  // A future score window mutation cannot change development input or development ranking.
  const changed = structuredClone(source);
  for (const rows of Object.values(changed.candles)) for (const c of rows) if (c.t >= dev.endT) c.c = c.o = c.h = c.l = 999999;
  assert.deepEqual(trimStudyFeed(changed, symbols, dev), d);
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
  const x = await studyRuntimeSettings(STUDY_SYMBOLS, studyWindow());
  assert.deepEqual(x.settings.grid, DEFAULT_SETTINGS.grid);
  assert.deepEqual(x.settings.gates, DEFAULT_SETTINGS.gates);
  assert.deepEqual(x.settings.tfDays, { 1: 11, 5: 11, 15: 11, 30: 11 });
  assert.deepEqual(x.settings.forceSymbols, STUDY_SYMBOLS);
  assert.deepEqual(x.settings.sizing, { mode: "equityPct", pct: 0.001 });
  assert.equal(x.settings.cost, 0.0015);
  assert.deepEqual(x.settings.fees, { ...DEFAULT_SETTINGS.fees, slippage: 0.00025 });
  assert.equal(x.wf.preH, 24); assert.equal(x.wf.longH, 24); assert.equal(x.wf.simH, 24);
  assert.equal(x.wf.validLastN, 15); assert.equal(x.wf.signalValidLastN, 25);
  assert.equal(x.wf.causalBase, true); assert.equal(x.wf.recordValidation, true);
  assert.ok(JSON.stringify(x.wf).length > 131072, "full default protection cells exceed one Linux argument");
  assert.ok(JSON.stringify(x.commandWf).length < 1024, "derived grid stays in frozen evidence rather than oversized argv");
  await assert.rejects(studyRuntimeSettings(STUDY_SYMBOLS, studyWindow(), 10), /at least11/);
  await assert.rejects(studyRuntimeSettings(STUDY_SYMBOLS, studyWindow(), undefined, { cost: 0.0009 }), /taker fees/);
  const reclaim = await studyRuntimeSettings(STUDY_SYMBOLS, studyWindow(), undefined, { variant: "reclaim8" });
  assert.equal(reclaim.settings.focus.length, x.settings.focus.length + 12);
  assert.deepEqual(reclaim.settings.focus.slice(0, x.settings.focus.length), x.settings.focus);
  assert.ok(reclaim.settings.focus.slice(x.settings.focus.length).every((id) => id.includes("-reclaim8-") && /@m(?:5|15)$/.test(id)));
});

test("commands run the causal runtime offline with variants off and immutable replay output", () => {
  const p = { window: studyWindow(), budget: { heapMb: 4096, timeoutMinutes: 180 }, book: { balance: 1000, pct: 0.001, leverage: 10 } };
  const c = { feed: "/frozen/feed20.json", symbols: STUDY_SYMBOLS.slice(0, 20), runtime: { settings: { symbols: 20, forceSymbols: STUDY_SYMBOLS.slice(0, 20), grid: { short: { tpOfCost: [9, 10], slOfTp: [1], trailOfTp: [0] } } }, commandWf: { causalBase: true, recordValidation: true } } };
  const cmd = studyCommand(p, c, "/result");
  assert.ok(cmd.includes("--dump-only")); assert.ok(cmd.includes("--tape-trades"));
  assert.equal(cmd[cmd.indexOf("--symbols") + 1], "20");
  assert.equal(cmd[cmd.indexOf("--pre") + 1], "24");
  assert.equal(cmd[cmd.indexOf("--selection-hours") + 1], "24");
  assert.equal(cmd[cmd.indexOf("--pct") + 1], "0.001");
  assert.deepEqual(JSON.parse(cmd[cmd.indexOf("--settings") + 1]), c.runtime.settings);
  assert.deepEqual(JSON.parse(cmd[cmd.indexOf("--wf") + 1]), c.runtime.commandWf);
  assert.ok(studyCommand(p, c, "/result", "render").includes("--replay"));
  const env = studyEnvironment();
  assert.equal(env.CTS_CORE_VARIANTS, "0"); assert.equal(env.CTS_CORE_LIVE, "0");
  assert.match(env.NODE_OPTIONS, /core-test-offline-guard/);
  assert.equal(env.BINGX_API_KEY, undefined);
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
  const wf = { causalBase: true, recordValidation: true, preH: 24, simH: 24, longH: 24, validLastN: 15, signalValidLastN: 25 };
  const settings = { cost: 0.0015, gates: { minPf: 1.1 }, tfs: [1, 5, 15, 30], toggles: { normal: true }, sizing: { mode: "equityPct", pct: 0.001 }, disabledKinds: [], focus: ["follow|test"] };
  const runtime = { settings, wf, settingsSha256: "test" }, studyCase = { symbols, runtime }, protocol = { window, sources: [], book: { balance: 1000, pct: 0.001, leverage: 10 } };
  const rows = [{ cfg: "follow|ema-9-21@m1|tp3|sl3|tr0|h24|gn", sym: symbols[0], side: 1, entryT: window.tradeStartT + 1, exitT: window.tradeStartT + H, r: 0.04, mult: 2, vol: 2, kind: "normal", reason: "tp" },
    { cfg: "follow|ema-9-21@m1|tp3|sl3|tr0|h24|gn", sym: symbols[1], side: -1, entryT: window.tradeStartT + 2, exitT: window.tradeStartT + H + 1, r: -0.01, mult: 1, vol: 1, kind: "normal", reason: "sl" }];
  const raw = { runSeconds: 5, window: { startT: window.tradeStartT, endT: window.endT }, settings: { ...settings, effective: settings, effectiveWf: { ...wf, basePassed: ["follow|ema-9-21@m1"], basePassedRanges: { "follow|ema-9-21@m1": ["gn"] } }, book: { balance: 1000, sizing: settings.sizing, leverage: 10 }, replaySelectionHours: 24, wf, symbolsAsked: 20, lanes: settings.tfs, focus: 1, evaluationFromT: window.evaluationFromT },
    engine: { universe: symbols, computeMs: 500, rssMaxMb: 123, mem: { computeLevel: 0, fallback: 0, lastAbort: null }, coverage: { expectedCombos: 1, evaluated: 1 }, baseEvaluated: 1, basePassed: 1, tapes: 1 },
    validation: Array.from({ length: 24 }, (_, i) => ({ t: window.tradeStartT + i * H, checks: [[rows[0].cfg, i % 2 === 0, 25, 1.2, 0.12, 0.1]] })), trades: rows };
  const book = { checks: [{ name: "native accounting", ok: true }], settings: { balance0: 1000, sizing: settings.sizing, leverage: 10 }, total: { equityMaxDd: 5, equityMaxDdPct: 0.005, equityDdtMaxH: 2, eqMin: 995 }, sizedOrders: rows.map((x, closeIndex) => ({ key: orderKey(x), closeIndex, cfg: x.cfg, exitT: x.exitT, unitNotional: closeIndex === 0 ? 5 : 0, allocatedNotional: closeIndex === 0 ? 10 : 0 })) };
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
  assert.equal(s.continuousValidation.afterBaseChecked, 24);
  assert.equal(s.performance.computeMs, 500); assert.equal(s.performance.peakRssMb, 123);
  assert.equal(s.equityDrawdown.maxPct, 0.005);
  assert.equal(s.hourly[0].validation.checked, 1); assert.equal(s.hourly[0].stages.afterBase.n, null);
  assert.equal(s.hourly[0].stages.afterBase.sampleRecorded, false);
  assert.equal(s.pruning.performed, false);
});

test("summary rejects absent or malformed Base coverage and a reordered forced universe", async () => {
  for (const coverage of [undefined, {}, { expectedCombos: -1, evaluated: -1 }, { expectedCombos: 1.5, evaluated: 1.5 }, { expectedCombos: 2, evaluated: 1 }]) {
    const f = await fixture(); f.raw.engine.coverage = coverage;
    const s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "paper step on compute #2:1 Real seats");
    assert.equal(s.complete, false);
    assert.ok(s.structural.some((x) => x.name === "full Base processing coverage" && !x.ok));
  }
  const f = await fixture(); f.raw.engine.universe = [...f.raw.engine.universe].reverse();
  const s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "paper step on compute #2:1 Real seats");
  assert.equal(s.complete, false);
  assert.ok(s.structural.some((x) => x.name === "exact forced symbol universe and order" && !x.ok));
});

test("Base hourly placeholder zeroes remain unavailable while recorded config progress remains visible", async () => {
  const f = await fixture(), zeroes = () => Array.from({ length: 24 }, () => ({ n: 0, gp: 0, gl: 0 }));
  f.raw.funnel = { beforeBase: zeroes(), afterBase: zeroes(), seated: zeroes(), pool: zeroes() };
  f.raw.funnel.seated[0] = { n: 3, gp: 0.06, gl: 0.02 };
  f.raw.stepsByRange = [{ t: f.protocol.window.tradeStartT, byRange: { gn: { tapes: 10, validated: 2, candidates: 3, taken: 1 } } }];
  const s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "paper step on compute #2:1 Real seats");
  assert.equal(s.complete, true);
  assert.equal(s.progression.hourlyCandidateDiagnostics.beforeBase.sampleRecorded, false);
  assert.equal(s.progression.hourlyCandidateDiagnostics.afterBase.n, null);
  assert.equal(s.hourly[0].stages.afterBase.sampleRecorded, false);
  assert.equal(s.hourly[0].stages.seated.sampleRecorded, true);
  assert.equal(s.hourly[0].stages.seated.n, 3);
  assert.equal(s.hourly[0].rangeProgress.gn.taken, 1);
  assert.match(studyMarkdown(s), /\|1 \/ 1\|0\|—\|3\|1\|/);
  assert.match(s.ranking.membershipAndOrder, /cannot change this forced universe/);
});

test("summary rejects a winning diagnostic config outside its independently admitted Base range", async () => {
  const f = await fixture();
  f.raw.settings.effectiveWf.basePassedRanges["follow|ema-9-21@m1"] = ["mc"];
  const s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "paper step on compute #2:1 Real seats");
  assert.equal(s.complete, false);
  assert.equal(s.continuousValidation.afterBasePassed, 0);
  assert.equal(s.continuousValidation.afterBaseChecked, 0);
  assert.equal(s.validationRows[0].baseQualified, false);
  assert.ok(s.structural.some((x) => x.name.includes("matching Base range") && !x.ok));
});

test("summary detects nested settings, book sizing and missing performance evidence", async () => {
  const f = await fixture();
  f.raw.settings.effective = { ...f.raw.settings.effective, grid: { micro: { tpOfCost: [99] } } };
  f.book.settings.sizing = { mode: "equityPct", pct: 0.02 };
  delete f.raw.engine.rssMaxMb;
  const s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "paper step on compute #2:1 Real seats");
  assert.equal(s.complete, false);
  assert.ok(s.structural.filter((x) => !x.ok).length >= 3);
});

test("summary fails closed when independent WF controls or native accounting checks change", async () => {
  const f = await fixture();
  f.raw.settings.effectiveWf.validLastN = 1;
  f.book.checks[0].ok = false;
  const s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "paper step on compute #2:1 Real seats");
  assert.equal(s.complete, false);
  assert.ok(s.structural.some((x) => x.name.includes("frozen WF") && !x.ok));
  assert.ok(s.structural.some((x) => x.name.includes("native report accounting") && !x.ok));
});

test("summary fails closed on memory fallback, partial universe, missing validation or unknown allocations", async () => {
  const f = await fixture(); f.raw.engine.mem.computeLevel = 1; f.raw.engine.universe.pop(); f.raw.validation.pop(); f.book.sizedOrders.pop();
  const s = await summarizeStudy(f.raw, f.book, f.protocol, f.studyCase, "universe not complete");
  assert.equal(s.complete, false); assert.equal(s.fundedModeledSettled.pf, null);
  assert.ok(s.structural.filter((x) => !x.ok).length >= 5);
  assert.equal(s.unknownAllocations, 1);
});
