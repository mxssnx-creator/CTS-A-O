import { unitReturn } from "../../src/core/metrics/stats.ts";
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
const finished = (x) => ({ ...x, ...finishReturnEvidence(x) });
const csvCell = (x) => `"${String(x ?? "").replaceAll('"', '""')}"`;
export const signalRowsCsv = (rows, keys) => [keys.join(","), ...rows.map((r) => keys.map((k) => csvCell(r[k])).join(","))].join("\n") + "\n";

export function signalWindowReport(raw, book, protocol) {
  const { startT, endT } = raw.window;
  if (startT !== protocol.tradeStartT || endT !== protocol.endT || endT - startT !== 6 * H)
    throw new Error("The actual engine window differs from the frozen six-hour protocol");
  if (!raw.settings.wf?.causalBase || !raw.signalProgress) throw new Error("Causal Signal progress capture is required");
  const signalTrades = raw.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? ""));
  if (signalTrades.length !== raw.trades.length) throw new Error("Signals-only protocol contains engine executions");
  const hourly = new Map(), totals = new Map();
  for (const kind of SIGNAL_REPORT_TYPES) for (const range of ["short", "medium"]) for (const lane of protocol.settings.signals.lanes) for (const side of ["long", "short"]) {
    const d = { kind, range, lane, side };
    totals.set(keyOf(d), empty(d));
    for (let t = startT; t < endT; t += H) hourly.set(`${t}|${keyOf(d)}`, empty({ t, endT: t + H, ...d }));
  }
  const total = returnBucket(), marks = returnBucket();
  const trades = [];
  for (const x of signalTrades) {
    if (x.markedOpen || x.reason === "end" || x.reason === "open") throw new Error("Endpoint mark found in settled execution sample");
    if (x.entryT < startT || x.entryT >= endT || x.exitT <= startT || x.exitT > endT || x.exitT < x.entryT)
      throw new Error("Settled execution is outside the frozen run");
    const d = details(x), r = unitReturn(x);
    const t = startT + Math.floor((x.exitT - 1 - startT) / H) * H;
    const key = keyOf(d);
    if (!totals.has(key)) throw new Error(`Unexpected executed type/range/lane/side ${key}`);
    addReturnEvidence(total, r, null); addReturnEvidence(totals.get(key), r, null); addReturnEvidence(hourly.get(`${t}|${key}`), r, null);
    trades.push({ ...d, cfg: x.cfg, sym: x.sym, entryT: x.entryT, exitT: x.exitT, unitR: Number.isFinite(r) ? r : null,
      sizedReturn: x.r, externalMult: x.mult ?? null, reason: x.reason, entry: x.entry, exit: x.exit,
      tp: d.protect?.tp ?? null, sl: d.protect?.sl ?? null, trail: d.protect?.trail ?? null, trailStep: d.protect?.trailStep ?? 1, holdBars: d.protect?.hold ?? null });
  }
  for (const x of raw.openEnd ?? []) addReturnEvidence(marks, unitReturn({ r: x.mtmR, mult: x.mult }), null);
  const rows = [...totals.values()].map(finished), hourlyRows = [...hourly.values()].map(finished);
  const types = SIGNAL_REPORT_TYPES.map((kind) => {
    const b = returnBucket();
    for (const x of signalTrades) if (details(x).kind === kind) addReturnEvidence(b, unitReturn(x), null);
    const xs = rows.filter((r) => r.kind === kind);
    return { kind, label: SIGNAL_REPORT_LABELS[kind], ...finishReturnEvidence(b), long: xs.filter((r) => r.side === "long").reduce((n, x) => n + x.n, 0), short: xs.filter((r) => r.side === "short").reduce((n, x) => n + x.n, 0) };
  });
  const cfg = raw.signalProgress.configs;
  const progress = SIGNAL_REPORT_TYPES.map((kind) => {
    const xs = cfg.filter((r) => r.kind === kind);
    return { kind, configured: xs.filter((r) => r.origin === "configured").length, historicOrRetained: xs.filter((r) => r.origin !== "configured").length,
      built: xs.filter((r) => r.built).length, preWithCloses: xs.filter((r) => Object.values(r.sides).some((s) => s.pre.n > 0)).length,
      candidateConfigs: xs.filter((r) => Object.values(r.sides).some((s) => s.runCandidates.n > 0)).length,
      unitActiveCandidateConfigs: xs.filter((r) => Object.values(r.sides).some((s) => s.unitActiveCandidates.n > 0)).length,
      executedConfigs: xs.filter((r) => Object.values(r.sides).some((s) => s.executed.n > 0)).length };
  });
  const hours = Array.from({ length: 6 }, (_, i) => {
    const t = startT + i * H;
    const h = book.hours.find((x) => x.t === t);
    if (!h) throw new Error(`Book report is missing hour ${t}`);
    const b = returnBucket();
    for (const x of signalTrades) if (x.exitT > t && x.exitT <= t + H) addReturnEvidence(b, unitReturn(x), null);
    return { ...h, ...finishReturnEvidence(b), t, endT: t + H, cashPfDiagnostic: h.cashPf,
      bookBalance: h.balance, bookEquity: h.equity ?? h.eqEnd, bookNet: h.net, bookDrawdownPct: h.maxDdPctSoFar ?? h.maxDdPct };
  });
  const configRows = cfg.flatMap((c) => [1, -1].map((side) => ({ cfg: c.id, kind: c.kind, source: c.source, range: c.range, lane: c.lane, side: side > 0 ? "long" : "short",
    origin: c.origin, built: c.built, tp: c.protect.tp, sl: c.protect.sl, trail: c.protect.trail, trailStep: c.protect.trailStep ?? 1,
    holdBars: c.protect.hold, holdMinutes: c.holdMinutes, preCloses: c.sides[side].pre.n, prePf: c.sides[side].pre.pf,
    preNoLoss: c.sides[side].pre.noLoss, candidates: c.sides[side].runCandidates.n, activeCandidates: c.sides[side].unitActiveCandidates.n,
    executedCloses: c.sides[side].executed.n, returnPf: c.sides[side].executed.pf, noLoss: c.sides[side].executed.noLoss,
    unknownReturns: c.sides[side].executed.unknownReturns, status: c.status })));
  const sumN = (xs) => xs.reduce((n, x) => n + x.n, 0);
  const all = finishReturnEvidence(total);
  if (sumN(rows) !== all.n || sumN(hourlyRows) !== all.n || sumN(hours) !== all.n || types.reduce((n, x) => n + x.n, 0) !== all.n)
    throw new Error("Signal partitions do not reconcile to settled closes");
  return { schema: "cts-signal-six-hour-report-v1", evidence: "Offline real-market simulation; no exchange fills or live-account evidence", protocol,
    total: all, endpointMarks: finishReturnEvidence(marks), book: book.total, hours, types, progress, cells: rows, hourlyCells: hourlyRows,
    configurations: configRows, trades, basePairs: raw.basePairs, engine: raw.engine, steps: raw.signalProgress.steps,
    skips: raw.engine.skips, skipsByRange: raw.engine.skipsByRange, definitions: raw.signalProgress.definitions,
    coverage: { bothDirectionsEligible: true, longCloses: rows.filter((x) => x.side === "long").reduce((n, x) => n + x.n, 0), shortCloses: rows.filter((x) => x.side === "short").reduce((n, x) => n + x.n, 0),
      allTypeRangeLaneSidesTraded: rows.every((x) => x.n > 0), inactiveCells: rows.filter((x) => !x.n).length, cells: rows.length,
      note: "Zero cells remain visible. Eligibility does not imply a qualifying signal or an executed order. Disabled sources and unsupported combined lanes are recorded in the frozen protocol." } };
}

const num = (x, d = 3) => typeof x === "number" && Number.isFinite(x) ? x.toFixed(d) : "unavailable";
export function signalWindowMarkdown(r) {
  const pf = (x) => returnEvidenceText(x);
  const lines = ["# Signals: six hours prehistory + six hours simulated trading", "", r.evidence + ".", "",
    `Frozen trade window: **${new Date(r.protocol.tradeStartT).toISOString()} → ${new Date(r.protocol.endT).toISOString()}** (Vienna 00:00–06:00, 15 October 2026). Prehistory: 14 October 16:00–22:00 UTC (18:00–00:00 Vienna).`, "",
    `Settled unit-return PF **${pf(r.total)}**, ${r.total.n} closes. ${r.coverage.longCloses} long / ${r.coverage.shortCloses} short. Endpoint marks: ${r.endpointMarks.n}, PF ${pf(r.endpointMarks)}; excluded from settled PF.`, "",
    "The existing gates were retained. Six available prehistory hours do not create the longer default 24/48-hour evidence. Natural zero activity is reported without adding trades or relaxing qualification. Cash/equity below are a modeled report book, separate from unit-return PF and from a real exchange account.", "",
    "| Strategy | Settled closes | Long | Short | Unit-return PF |", "|---|---:|---:|---:|---:|",
    ...r.types.map((t) => `| ${t.label} | ${t.n} | ${t.long} | ${t.short} | ${pf(t)} |`), "",
    "| Hour UTC | Closes | Unit-return PF | Cash PF diagnostic | Net $ | Balance $ | Equity $ | Equity max DD % so far |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...r.hours.map((h) => `| ${new Date(h.t).toISOString().slice(0, 16).replace("T", " ")} | ${h.n} | ${pf(h)} | ${h.n ? num(h.cashPfDiagnostic) : "–"} | ${num(h.bookNet, 2)} | ${num(h.bookBalance, 2)} | ${num(h.bookEquity, 2)} | ${num(h.bookDrawdownPct * 100, 2)} |`), "",
    "| Strategy | Configured cells | Built | Prehistory closes in cells | Run candidate cells | Active-unit candidate cells | Executed cells |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...r.progress.map((p) => `| ${SIGNAL_REPORT_LABELS[p.kind]} | ${p.configured} | ${p.built} | ${p.preWithCloses} | ${p.candidateConfigs} | ${p.unitActiveCandidateConfigs} | ${p.executedConfigs} |`), "",
    "A built/calculated cell is not a PF-qualified or all-gates-passed cell. Active-unit candidates can still be rejected by the remaining entry and account coordination gates.", "",
    `Both directions are eligible. Every type × source-range × lane × direction traded: **${r.coverage.allTypeRangeLaneSidesTraded ? "yes" : "no"}**; ${r.coverage.inactiveCells}/${r.coverage.cells} aggregate cells had no settled execution.`, "",
    "| Strategy | Source range | Lane min | Side | Closes | Unit-return PF |", "|---|---|---:|---|---:|---:|",
    ...r.cells.map((c) => `| ${SIGNAL_REPORT_LABELS[c.kind]} | ${c.range} | ${c.lane} | ${c.side} | ${c.n} | ${pf(c)} |`), "",
    "Full hourly type/range/lane/direction rows, every protection cell (TP, SL, trail, trail step, hold) and settled trade details are provided in the CSV/JSON outputs. No-loss samples are labeled; a runtime no-loss sentinel is not an exact finite PF. No live deployment or execution-PF claim follows from this simulation.", ""];
  return lines.join("\n");
}
