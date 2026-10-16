import { profitFactor, modeledUnitReturn as unitReturn } from "../../src/core/metrics/stats.ts";
import { orderKey } from "../../src/core/sizing.ts";
import { isSignalInd, laneOf, signalSourceOf } from "../../src/core/indications/registry.ts";
import { kindOfId, parseConfigId } from "../../src/core/pipeline/pipeline.ts";
import { addReturnEvidence, finishReturnEvidence, returnBucket, returnEvidenceText } from "./return-evidence.mjs";
const H = 3_600_000;
export const SIGNAL_REPORT_TYPES = ["normal", "trailing", "trailing-only"];
export const SIGNAL_REPORT_LABELS = { normal: "Normal (TP + SL)", trailing: "Normal + trailing (TP + SL + peak trail)", "trailing-only": "Trailing only (SL + peak trail; no TP)" };
const details = (trade) => {
  const parsed = parseConfigId(trade.cfg);
  const ind = parsed?.ind ?? trade.cfg.split("|")[1] ?? "";
  const lane = laneOf(ind);
  return { kind: trade.kind ?? kindOfId(trade.cfg), source: signalSourceOf(ind), range: /-s$/.test(lane.base) ? "short" : "medium", lane: lane.tf, side: trade.side > 0 ? "long" : "short", protect: parsed?.protect ?? null };
};
const keyOf = (x) => `${x.kind}|${x.range}|${x.lane}|${x.side}`;
const empty = (x) => ({ ...x, ...returnBucket() });
const add = (bucket, r, pnl) => {
  addReturnEvidence(bucket, r, pnl);
  if (typeof pnl === "number" && Number.isFinite(pnl)) {
    bucket.cashGp = (bucket.cashGp ?? 0) + Math.max(0, pnl);
    bucket.cashGl = (bucket.cashGl ?? 0) + Math.max(0, -pnl);
  }
};
const finished = (x) => ({ ownedCloses: 0, unknownAllocations: 0, zeroAllocations: 0, ...x, ...finishReturnEvidence(x), cashGp: x.unknownSizedPnl ? null : x.cashGp ?? 0,
  cashGl: x.unknownSizedPnl ? null : x.cashGl ?? 0,
  cashPfDiagnostic: x.n && !x.unknownSizedPnl ? profitFactor(x.cashGp ?? 0, x.cashGl ?? 0) : null,
  cashNoLoss: x.n > 0 && !x.unknownSizedPnl && (x.cashGp ?? 0) > 0 && !(x.cashGl > 0) });
const evidenceColumns = (prefix, x) => Object.fromEntries(["n", "w", "gp", "gl", "pf", "noLoss", "unknownReturns", "pfBasis"].map((k) => [`${prefix}${k[0].toUpperCase()}${k.slice(1)}`, x[k]]));
const csvCell = (x) => `"${String(x ?? "").replaceAll('"', '""')}"`;
export const signalRowsCsv = (rows, keys) => [keys.join(","), ...rows.map((r) => keys.map((k) => csvCell(r[k])).join(","))].join("\n") + "\n";

function allocationReader(book) {
  const byEntry = new Map(), byIndex = new Map();
  for (const row of book.sizedOrders ?? []) {
    if (Number.isSafeInteger(row.closeIndex)) byIndex.set(row.closeIndex, byIndex.has(row.closeIndex) ? null : row);
    if (!byEntry.has(row.key)) byEntry.set(row.key, []);
    byEntry.get(row.key).push(row);
  }
  return (x, closeIndex) => {
    const exact = byIndex.get(closeIndex);
    const rows = byIndex.has(closeIndex) ? exact && exact.key === orderKey(x) && exact.exitT === x.exitT ? [exact] : [] : byEntry.get(orderKey(x)) ?? [];
    const values = rows.map((r) => r.unitNotional);
    if (!values.length || values.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0 || v !== values[0]))
      return { status: "unknown", unitNotional: null, pnl: null };
    const unitNotional = values[0];
    // Legacy dumps stored entry-scoped allocations without a close index. Partial slices share that unit;
    // their own raw sized returns retain their own P&L, instead of taking another slice's last-written P&L.
    const modeledPnl = typeof x.r === "number" && Number.isFinite(x.r) ? x.r * unitNotional : null;
    const pnl = exact ? typeof exact.sizedPnl === "number" && Number.isFinite(exact.sizedPnl) && modeledPnl !== null && Math.abs(exact.sizedPnl - modeledPnl) <= 1e-10 * Math.max(1, Math.abs(modeledPnl)) ? exact.sizedPnl : null : modeledPnl;
    return { status: unitNotional > 0 ? "positive" : "zero", unitNotional, pnl,
      rawUnitNotional: rows[0].rawUnitNotional ?? null, rawGot: rows[0].rawGot ?? null,
      roundoffZeroed: rows.some((row) => row.roundoffZeroed === true) };
  };
}

function signalFlows(entries, startT, endT, funded, signalsOnly = true) {
  const orders = new Map();
  for (const e of entries) {
    if (signalsOnly && !isSignalInd(e.x.cfg.split("|")[1] ?? "")) continue;
    const key = orderKey(e.x), old = orders.get(key), known = !funded || e.allocation.status === "positive";
    if (old) { old.exitT = Math.max(old.exitT, e.x.exitT); old.known ||= known; }
    else orders.set(key, { ...e.x, kind: details(e.x).kind, known });
  }
  const rows = [];
  for (let t = startT; t < endT; t += H) for (const kind of [null, ...SIGNAL_REPORT_TYPES]) {
    const xs = [...orders.values()].filter((x) => !kind || x.kind === kind), entered = xs.filter((x) => x.entryT >= t && x.entryT < t + H), open = xs.filter((x) => x.entryT <= t + H && x.exitT > t + H);
    rows.push({ t, endT: t + H, kind: kind ?? "all", entryOrders: entered.filter((x) => x.known).length,
      unknownEntryOrders: entered.filter((x) => !x.known).length,
      longEntryOrders: entered.filter((x) => x.known && x.side > 0).length, shortEntryOrders: entered.filter((x) => x.known && x.side < 0).length,
      openOrdersEnd: open.filter((x) => x.known).length, unknownOpenOrdersEnd: open.filter((x) => !x.known).length,
      openPositionsEnd: new Set(open.filter((x) => x.known).map((x) => `${x.sym}|${x.side > 0 ? 1 : -1}`)).size });
  }
  return rows;
}

function signalCohort(entries, book, protocol, funded, openEntries = []) {
  const startT = protocol.tradeStartT, endT = protocol.endT;
  const hourly = new Map(), totals = new Map(), total = returnBucket(), engine = returnBucket(), whole = returnBucket();
  for (const kind of SIGNAL_REPORT_TYPES) for (const range of ["short", "medium"]) for (const lane of protocol.settings.signals.lanes) for (const side of ["long", "short"]) {
    const d = { kind, range, lane, side };
    totals.set(keyOf(d), empty(d));
    for (let t = startT; t < endT; t += H) hourly.set(`${t}|${keyOf(d)}`, empty({ t, endT: t + H, ...d }));
  }
  const included = entries.filter((e) => !funded || e.allocation.status !== "zero");
  const put = (bucket, e) => {
    const { status, pnl } = e.allocation;
    add(bucket, funded && status === "unknown" ? NaN : unitReturn(e.x), pnl);
    bucket.ownedCloses = (bucket.ownedCloses ?? 0) + Number(status === "positive");
    bucket.unknownAllocations = (bucket.unknownAllocations ?? 0) + Number(status === "unknown");
    bucket.zeroAllocations = (bucket.zeroAllocations ?? 0) + Number(status === "zero");
  };
  const trades = [];
  for (const e of included) {
    const x = e.x;
    put(whole, e);
    if (!isSignalInd(x.cfg.split("|")[1] ?? "")) { put(engine, e); continue; }
    const d = details(x), t = startT + Math.floor((x.exitT - 1 - startT) / H) * H, key = keyOf(d);
    if (!totals.has(key)) throw new Error(`Unexpected executed type/range/lane/side ${key}`);
    put(total, e); put(totals.get(key), e); put(hourly.get(`${t}|${key}`), e);
    const r = funded && e.allocation.status === "unknown" ? NaN : unitReturn(x);
    trades.push({ ...d, closeIndex: e.closeIndex, cfg: x.cfg, sym: x.sym, entryT: x.entryT, exitT: x.exitT, unitR: Number.isFinite(r) ? r : null,
      modeledUnitR: Number.isFinite(unitReturn(x)) ? unitReturn(x) : null, sizedReturn: x.r, externalMult: x.mult ?? null,
      reason: x.reason, entry: x.entry, exit: x.exit, tp: d.protect?.tp ?? null, sl: d.protect?.sl ?? null,
      trail: d.protect?.trail ?? null, trailStep: d.protect?.trailStep ?? 1, holdBars: d.protect?.hold ?? null,
      allocationStatus: e.allocation.status, unitNotional: e.allocation.unitNotional, sizedPnl: e.allocation.pnl,
      rawUnitNotional: e.allocation.rawUnitNotional, rawGot: e.allocation.rawGot, roundoffZeroed: e.allocation.roundoffZeroed });
  }
  const rows = [...totals.values()].map(finished), hourlyRows = [...hourly.values()].map(finished);
  const types = SIGNAL_REPORT_TYPES.map((kind) => {
    const b = returnBucket();
    for (const e of included) if (isSignalInd(e.x.cfg.split("|")[1] ?? "") && details(e.x).kind === kind) put(b, e);
    const xs = rows.filter((r) => r.kind === kind);
    return { kind, label: SIGNAL_REPORT_LABELS[kind], ...finished(b), long: xs.filter((r) => r.side === "long").reduce((n, x) => n + (funded ? x.ownedCloses : x.n), 0), short: xs.filter((r) => r.side === "short").reduce((n, x) => n + (funded ? x.ownedCloses : x.n), 0) };
  });
  const includedOpen = openEntries.filter((e) => !funded || e.allocation.status !== "zero");
  const flows = signalFlows([...included, ...includedOpen], startT, endT, funded);
  const wholeSystemFlows = signalFlows([...included, ...includedOpen], startT, endT, funded, false).filter((x) => x.kind === "all");
  const hours = Array.from({ length: 6 }, (_, i) => {
    const t = startT + i * H, h = book.hours.find((x) => x.t === t);
    if (!h) throw new Error(`Book report is missing hour ${t}`);
    const b = returnBucket(), w = returnBucket();
    for (const e of included) if (e.x.exitT > t && e.x.exitT <= t + H) {
      put(w, e); if (isSignalInd(e.x.cfg.split("|")[1] ?? "")) put(b, e);
    }
    const wholeFlow = wholeSystemFlows.find((x) => x.t === t);
    return { ...h, ...finished(b), ...flows.find((x) => x.t === t && x.kind === "all"), t, endT: t + H, bookWholeSystem: finished(w), bookCashPfDiagnostic: finished(w).cashPfDiagnostic,
      bookEntryOrders: wholeFlow.entryOrders, bookOpenOrdersEnd: wholeFlow.openOrdersEnd,
      bookOpenPositionsEnd: wholeFlow.openPositionsEnd, bookUnknownOpenOrdersEnd: wholeFlow.unknownOpenOrdersEnd,
      bookBalance: h.balance, bookEquity: h.equity ?? h.eqEnd, bookNet: h.net, bookDrawdownPct: h.maxDdPctSoFar ?? h.maxDdPct };
  });
  const all = finished(total), sumN = (xs) => xs.reduce((n, x) => n + x.n, 0);
  if (sumN(rows) !== all.n || sumN(hourlyRows) !== all.n || sumN(hours) !== all.n || sumN(types) !== all.n)
    throw new Error("Signal partitions do not reconcile to settled closes");
  const marks = returnBucket(), endpointTrades = [];
  for (const e of includedOpen) if (isSignalInd(e.x.cfg.split("|")[1] ?? "")) {
    put(marks, e);
    endpointTrades.push({ ...details(e.x), cfg: e.x.cfg, sym: e.x.sym, entryT: e.x.entryT, unitR: funded && e.allocation.status === "unknown" ? null : unitReturn(e.x),
      allocationStatus: e.allocation.status, unitNotional: e.allocation.unitNotional, sizedPnl: e.allocation.pnl,
      rawUnitNotional: e.allocation.rawUnitNotional, rawGot: e.allocation.rawGot, roundoffZeroed: e.allocation.roundoffZeroed });
  }
  return { sample: funded ? "PRIMARY: positive-notional modeled owned close slices; unknown allocations invalidate return PF" : "DIAGNOSTIC: all virtual walk-forward planned close slices before account sizing, including zero allocations",
    total: all, engineExecutions: finished(engine), wholeSystem: finished(whole), wholeSystemFlows, hours, types, cells: rows, hourlyCells: hourlyRows, trades, flows,
    endpointMarks: finished(marks), endpointTrades };
}

export function signalWindowReport(raw, book, protocol) {
  const { startT, endT } = raw.window;
  if (startT !== protocol.tradeStartT || endT !== protocol.endT || endT - startT !== 6 * H)
    throw new Error("The actual engine window differs from the frozen six-hour protocol");
  if (!raw.settings.wf?.causalBase || !raw.signalProgress) throw new Error("Causal Signal progress capture is required");
  const engineTrades = raw.trades.filter((x) => !isSignalInd(x.cfg.split("|")[1] ?? ""));
  if (engineTrades.length && protocol.scope !== "signals-with-default-engine-coordination")
    throw new Error("Signals-only protocol contains engine executions");
  const readAllocation = allocationReader(book);
  const entries = raw.trades.map((x, closeIndex) => ({ x, closeIndex, allocation: readAllocation(x, closeIndex) }));
  for (const x of raw.trades) {
    if (x.markedOpen || x.reason === "end" || x.reason === "open") throw new Error("Endpoint mark found in settled execution sample");
    if (x.entryT < startT || x.entryT >= endT || x.exitT <= startT || x.exitT > endT || x.exitT < x.entryT)
      throw new Error("Settled execution is outside the frozen run");
  }
  const readOpen = allocationReader({ sizedOrders: (book.sizedOpenOrders ?? []).map((x) => ({ ...x, closeIndex: x.openIndex, exitT: endT })) });
  const openEntries = (raw.openEnd ?? []).map((x, closeIndex) => {
    const mark = { ...x, r: x.mtmR, exitT: endT };
    return { x: { ...mark, exitT: Infinity }, closeIndex, allocation: readOpen(mark, closeIndex) };
  });
  const funded = signalCohort(entries, book, protocol, true, openEntries), planned = signalCohort(entries, book, protocol, false, openEntries);
  const fundedByConfigSide = new Map();
  for (const x of funded.trades) {
    const key = `${x.cfg}|${x.side}`;
    if (!fundedByConfigSide.has(key)) fundedByConfigSide.set(key, returnBucket());
    const b = fundedByConfigSide.get(key);
    add(b, x.unitR, x.sizedPnl);
    b.ownedCloses = (b.ownedCloses ?? 0) + Number(x.allocationStatus === "positive");
    b.unknownAllocations = (b.unknownAllocations ?? 0) + Number(x.allocationStatus === "unknown");
  }
  const cfg = raw.signalProgress.configs;
  const progress = SIGNAL_REPORT_TYPES.map((kind) => {
    const xs = cfg.filter((r) => r.kind === kind);
    const minimum = raw.signalProgress.settings?.minTrades ?? protocol.settings.signals.minTrades ?? 3;
    const samples = xs.flatMap((r) => Object.values(r.sides).map((s) => s.pre));
    const evaluated = samples.filter((s) => s.n >= minimum);
    const finiteRatioPass = evaluated.filter((s) => !s.unknownReturns && !s.noLoss && s.pf >= 1.1).length;
    const positiveNoLossPass = evaluated.filter((s) => !s.unknownReturns && s.noLoss && s.gp > 0).length;
    const requested = (raw.signalProgress.requestedConfigs ?? []).filter((r) => r.kind === kind).length;
    const effective = xs.filter((r) => r.origin === "configured").length;
    return { kind, requested, requestedConfigured: requested, effectiveConfigured: effective,
      configured: xs.filter((r) => r.origin === "configured").length, historicOrRetained: xs.filter((r) => r.origin !== "configured").length,
      built: xs.filter((r) => r.built).length, preWithCloses: xs.filter((r) => Object.values(r.sides).some((s) => s.pre.n > 0)).length,
      candidateConfigs: xs.filter((r) => Object.values(r.sides).some((s) => s.runCandidates.n > 0)).length,
      unitActiveCandidateConfigs: xs.filter((r) => Object.values(r.sides).some((s) => s.unitActiveCandidates.n > 0)).length,
      executedConfigs: xs.filter((r) => Object.values(r.sides).some((s) => s.executed.n > 0)).length,
      preDiagnostic: { minPf: 1.1, minTrades: minimum, evaluatedConfigSides: evaluated.length, finiteRatioPass, positiveNoLossPass,
        passingConfigSides: finiteRatioPass + positiveNoLossPass, unknownConfigSides: evaluated.filter((s) => s.unknownReturns).length,
        actualBaseAllGatesPass: false, sample: "per protection-config and direction, pooled across symbols; prehistory only; post-run descriptive diagnostic, not the runtime Signal unit activation or a Base admission" } };
  });
  const configRows = cfg.flatMap((c) => [1, -1].map((side) => ({ cfg: c.id, kind: c.kind, source: c.source, range: c.range, lane: c.lane, side: side > 0 ? "long" : "short",
    origin: c.origin, requestedAliases: c.requestedAliases ?? [], requestedCellCount: c.requestedAliases?.length ?? (c.origin === "configured" ? 1 : 0),
    built: c.built, tp: c.protect.tp, sl: c.protect.sl, trail: c.protect.trail, trailStep: c.protect.trailStep ?? 1,
    holdBars: c.protect.hold, holdMinutes: c.holdMinutes, preCloses: c.sides[side].pre.n, prePf: c.sides[side].pre.pf,
    preNoLoss: c.sides[side].pre.noLoss, candidates: c.sides[side].runCandidates.n, activeCandidates: c.sides[side].unitActiveCandidates.n,
    executedCloses: c.sides[side].executed.n, returnPf: c.sides[side].executed.pf, noLoss: c.sides[side].executed.noLoss,
    unknownReturns: c.sides[side].executed.unknownReturns, status: c.status,
    pipelineCloses: c.sides[side].executed.n,
    ...evidenceColumns("funded", finished(fundedByConfigSide.get(`${c.id}|${side > 0 ? "long" : "short"}`) ?? returnBucket())),
    fundedCloses: fundedByConfigSide.get(`${c.id}|${side > 0 ? "long" : "short"}`)?.n ?? 0,
    fundedOwnedCloses: fundedByConfigSide.get(`${c.id}|${side > 0 ? "long" : "short"}`)?.ownedCloses ?? 0,
    fundedUnknownAllocations: fundedByConfigSide.get(`${c.id}|${side > 0 ? "long" : "short"}`)?.unknownAllocations ?? 0,
    ...evidenceColumns("pre", c.sides[side].pre), ...evidenceColumns("candidate", c.sides[side].runCandidates),
    ...evidenceColumns("active", c.sides[side].unitActiveCandidates), ...evidenceColumns("executed", c.sides[side].executed) })));
  const rows = funded.cells;
  return { schema: "cts-signal-six-hour-report-v2", evidence: "Offline real-market simulation; no exchange fills or live-account evidence", protocol,
    primarySample: "funded-positive-notional", funded, planned,
    ownershipPrecision: book.ownershipPrecision ?? null,
    total: funded.total, endpointMarks: funded.endpointMarks, plannedEndpointMarks: planned.endpointMarks, endpointTrades: funded.endpointTrades, book: { ...book.total,
      plannedOrders: book.total.orders, plannedReturnPf: book.total.pf, orders: funded.wholeSystem.n,
      pf: funded.wholeSystem.pf, noLoss: funded.wholeSystem.noLoss, unknownReturns: funded.wholeSystem.unknownReturns,
      ownedCloses: funded.wholeSystem.ownedCloses, unknownAllocations: funded.wholeSystem.unknownAllocations,
      zeroAllocatedPlannedCloses: planned.wholeSystem.zeroAllocations,
      cashPf: funded.wholeSystem.cashPfDiagnostic, cashNoLoss: funded.wholeSystem.cashNoLoss },
    bookScope: protocol.scope === "signals-with-default-engine-coordination" ? "whole-system shared capped book; Signals plus engine coordination executions" : "Signals-only shared capped book",
    engineExecutions: funded.engineExecutions, wholeSystem: funded.wholeSystem, hours: funded.hours, types: funded.types, progress, cells: rows, hourlyCells: funded.hourlyCells,
    configurations: configRows, requestedConfigurations: raw.signalProgress.requestedConfigs ?? [], trades: funded.trades,
    basePairs: raw.basePairs, engine: raw.engine, steps: raw.signalProgress.steps,
    sessionChecksOk: book.checksOk, failedSessionChecks: (book.checks ?? []).filter((x) => !x.ok),
    skips: raw.engine.skips, skipsByRange: raw.engine.skipsByRange,
    definitions: { ...raw.signalProgress.definitions, primary: funded.sample, planned: planned.sample,
      quantity: "Positive observed modeled unitNotional establishes simulated ownership, including partial allocations; exact zero allocations remain only in planned diagnostics. Unknown allocations remain visible and invalidate primary PF. No return-sign filtering.",
      configExecuted: "Config executed*/returnPf fields are virtual pre-sizing pipeline close diagnostics. Funded* fields use the positive-notional primary sample." },
    coverage: { bothDirectionsEligible: true, longCloses: rows.filter((x) => x.side === "long").reduce((n, x) => n + x.ownedCloses, 0), shortCloses: rows.filter((x) => x.side === "short").reduce((n, x) => n + x.ownedCloses, 0),
      allTypeRangeLaneSidesTraded: rows.every((x) => x.ownedCloses > 0), inactiveCells: rows.filter((x) => !x.ownedCloses).length, cells: rows.length,
      note: "Zero cells remain visible. Eligibility does not imply a qualifying signal or an owned allocation. Disabled sources and unsupported combined lanes are recorded in the frozen protocol." } };
}

const num = (x, d = 3) => typeof x === "number" && Number.isFinite(x) ? x.toFixed(d) : "unavailable";
export function signalWindowMarkdown(r) {
  const pf = (x) => returnEvidenceText(x);
  const lines = ["# Signals: six hours prehistory + six hours simulated trading", "", r.evidence + ".", "",
    `Frozen trade window: **${new Date(r.protocol.tradeStartT).toISOString()} → ${new Date(r.protocol.endT).toISOString()}** (Vienna 00:00–06:00, 15 October 2026). Prehistory: 14 October 16:00–22:00 UTC (18:00–00:00 Vienna).`, "",
    `Positive-notional simulated owned close-slice return PF **${pf(r.total)}**, ${r.total.ownedCloses} known owned closes (${r.total.unknownAllocations} unknown allocations). ${r.coverage.longCloses} long / ${r.coverage.shortCloses} short. Endpoint marks: ${r.endpointMarks.n}, PF ${pf(r.endpointMarks)}; excluded from settled PF.`, "",
    `All virtual walk-forward planned Signal closes before account allocation: ${r.planned.total.n}, unit PF ${pf(r.planned.total)}; zero allocations ${r.planned.total.zeroAllocations}. This diagnostic is a different sample from the primary owned book.`, "",
    "The existing gates were retained. Six available prehistory hours do not create the longer default 24/48-hour evidence. Natural zero activity is reported without adding trades or relaxing qualification. Cash/equity below are a modeled report book, separate from unit-return PF and from a real exchange account.", "",
    "| Strategy | Settled closes | Long | Short | Unit-return PF |", "|---|---:|---:|---:|---:|",
    ...r.types.map((t) => `| ${t.label} | ${t.n} | ${t.long} | ${t.short} | ${pf(t)} |`), "",
    `Book scope: ${r.bookScope}. Signal cash contributions use this same shared book's actual modeled allocations.`, "",
    "| Hour UTC | Signal closes | Signal unit-return PF | Signal cash PF diagnostic | Book net $ | Book balance $ | Book equity $ | Book equity max DD % so far |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...r.hours.map((h) => `| ${new Date(h.t).toISOString().slice(0, 16).replace("T", " ")} | ${h.n} | ${pf(h)} | ${h.n ? h.cashNoLoss ? "No losses" : num(h.cashPfDiagnostic) : "–"} | ${num(h.bookNet, 2)} | ${num(h.bookBalance, 2)} | ${num(h.bookEquity, 2)} | ${num(h.bookDrawdownPct * 100, 2)} |`), "",
    "| Strategy | Requested raw cells | Distinct effective cells | Built | Prehistory closes in cells | Run candidate cells | Active-unit candidate cells | Executed cells |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...r.progress.map((p) => `| ${SIGNAL_REPORT_LABELS[p.kind]} | ${p.requested} | ${p.configured} | ${p.built} | ${p.preWithCloses} | ${p.candidateConfigs} | ${p.unitActiveCandidateConfigs} | ${p.executedConfigs} |`), "",
    "A built/calculated cell is not a PF-qualified or all-gates-passed cell. Active-unit candidates can still be rejected by the remaining entry and account coordination gates.", "",
    `Both directions are eligible. Every type × source-range × lane × direction traded: **${r.coverage.allTypeRangeLaneSidesTraded ? "yes" : "no"}**; ${r.coverage.inactiveCells}/${r.coverage.cells} aggregate cells had no settled execution.`, "",
    "| Strategy | Source range | Lane min | Side | Closes | Unit-return PF |", "|---|---|---:|---|---:|---:|",
    ...r.cells.map((c) => `| ${SIGNAL_REPORT_LABELS[c.kind]} | ${c.range} | ${c.lane} | ${c.side} | ${c.n} | ${pf(c)} |`), "",
    "Full hourly type/range/lane/direction rows, every protection cell (TP, SL, trail, trail step, hold) and settled trade details are provided in the CSV/JSON outputs. No-loss samples are labeled; a runtime no-loss sentinel is not an exact finite PF. No live deployment or execution-PF claim follows from this simulation.", ""];
  return lines.join("\n");
}
