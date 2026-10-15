// Read-only evidence reduction. No strategy calculation, market acquisition or gate override occurs here.
import { unitReturn } from "../../src/core/metrics/stats.ts";
import { minPfOf, rangeOfId, RANGE_LABEL } from "../../src/core/minimal-coord.ts";
import { orderKey } from "../../src/core/sizing.ts";
import { addReturnEvidence, finishReturnEvidence, returnBucket } from "./return-evidence.mjs";
import { BOOK_NOTIONAL_EPS_USD } from "./book-notional.mjs";

const H = 3_600_000;
const finish = (x) => { const { onsets, ...plain } = x; const out = finishReturnEvidence(plain); return { ...out, pf: out.noLoss ? null : out.pf, cashPf: x.unknownSizedPnl || !x.cashGl ? null : x.cashGp / x.cashGl,
  cashNoLoss: !x.unknownSizedPnl && x.cashGp > 0 && x.cashGl === 0, uniqueSettledOnsets: onsets.size }; };
const bucket = () => ({ ...returnBucket(), cashGp: 0, cashGl: 0, onsets: new Set() });
const onset = (x) => `${x.cfg}|${x.sym}|${x.side > 0 ? 1 : -1}|${x.entryT}`;
function add(b, r, pnl, key) {
  addReturnEvidence(b, r, pnl);
  if (typeof pnl === "number" && Number.isFinite(pnl)) { if (pnl > 0) b.cashGp += pnl; else b.cashGl -= pnl; }
  if (key !== null) b.onsets.add(key);
}
export function studyConfigDetails(id, fallbackKind) {
  const [bot, ind] = id.split("|"), value = (p) => Number(id.match(new RegExp(`\\|${p}([0-9.]+)`))?.[1]);
  const lane = Number(ind.match(/@m(\d+)/)?.[1] ?? 1), tag = rangeOfId(id);
  return { id, bot, ind, tag, range: RANGE_LABEL[tag], lane, combined: /@m\d+c/.test(ind), tp: value("tp") / 100, sl: value("sl") / 100,
    trail: value("tr") / 100, hold: value("h"), holdMinutes: value("h") * lane, kind: fallbackKind ?? (value("tr") > 0 ? "trailing" : "normal") };
}
function allocations(book) {
  const index = new Map();
  for (const x of book.sizedOrders ?? []) if (Number.isSafeInteger(x.closeIndex)) index.set(x.closeIndex, index.has(x.closeIndex) ? null : x);
  return (x, i) => {
    const a = index.get(i);
    if (!a || a.key !== orderKey(x) || a.exitT !== x.exitT || typeof a.unitNotional !== "number" || !Number.isFinite(a.unitNotional) || a.unitNotional < 0 ||
      typeof a.allocatedNotional !== "number" || !Number.isFinite(a.allocatedNotional) || a.allocatedNotional < 0 ||
      typeof a.volume !== "number" || !Number.isFinite(a.volume) || a.volume <= 0 ||
      Math.abs(a.allocatedNotional - a.unitNotional * a.volume) > 1e-10 * Math.max(1, a.allocatedNotional))
      return { status: "unknown", unitNotional: null, pnl: null };
    const pnl = typeof x.r === "number" && Number.isFinite(x.r) && typeof a.sizedPnl === "number" && Number.isFinite(a.sizedPnl) &&
      Math.abs(x.r * a.unitNotional - a.sizedPnl) <= 1e-10 * Math.max(1, Math.abs(x.r * a.unitNotional)) ? a.sizedPnl : null;
    return { status: a.allocatedNotional > BOOK_NOTIONAL_EPS_USD ? "positive" : "zero", unitNotional: a.unitNotional, allocatedNotional: a.allocatedNotional, pnl };
  };
}

export function rangeStudyEvidence(raw, book, p, fold, profile, universe) {
  if (raw.window.startT !== fold.tradeStartT || raw.window.endT !== fold.endT || !raw.settings.wf?.causalBase) throw new Error("Actual window or causal qualification differs from the frozen study");
  const known = new Map(universe.configurations.map((x) => [x.id, x]));
  const records = new Map(), sums = new Map(), outside = new Set();
  const get = (key) => { if (!sums.has(key)) sums.set(key, bucket()); return sums.get(key); };
  for (let hour = 0; hour < Math.ceil((fold.endT - fold.tradeStartT) / H); hour++)
    for (const tag of ["mc", "mn", "sh"]) for (const kind of ["normal", "trailing"]) for (const side of [1, -1])
      for (const scope of ["virtual", "funded"]) get(`hour-${scope}|${hour}|${tag}|${kind}|${side}`);
  const rec = (id) => {
    if (!known.has(id)) outside.add(id);
    if (!records.has(id)) records.set(id, { ...studyConfigDetails(id), initial: null, retainedTapeKnown: false, sides: {
      1: { pre: bucket(), symbolPre: new Map(), virtual: bucket(), funded: bucket(), unknownAllocations: 0, zeroAllocations: 0 },
      "-1": { pre: bucket(), symbolPre: new Map(), virtual: bucket(), funded: bucket(), unknownAllocations: 0, zeroAllocations: 0 },
    } });
    return records.get(id);
  };
  for (const id of known.keys()) rec(id);
  const initialValidation = (raw.validation ?? []).find((x) => x.t === fold.tradeStartT);
  for (const [id, ok, n, pf, gp, gl] of initialValidation?.checks ?? []) rec(id).initial = { ok: !!ok, n, pf: gl > 0 ? gp / gl : null, noLoss: n > 0 && gp > 0 && gl === 0, gateScore: pf, gp, gl };
  for (const tp of raw.tapeTrades ?? []) {
    const r = rec(tp.id); r.retainedTapeKnown = true;
    for (const [sym, side, entryT, exitT, value] of tp.trades) if (entryT >= fold.evaluationFromT && entryT < raw.window.startT && exitT < raw.window.startT) {
      const s = r.sides[side > 0 ? 1 : -1], key = `${tp.id}|${sym}|${side > 0 ? 1 : -1}|${entryT}`;
      if (!s.symbolPre.has(sym)) s.symbolPre.set(sym, bucket());
      add(s.pre, value, null, key); add(s.symbolPre.get(sym), value, null, key);
    }
  }
  const read = allocations(book), stillOpen = new Set((raw.openEnd ?? []).map(onset));
  let positive = 0, zero = 0, unknown = 0;
  const fundedTrades = [], virtualTrades = [];
  for (let i = 0; i < raw.trades.length; i++) {
    const x = raw.trades[i];
    if (x.entryT < fold.tradeStartT || x.entryT >= fold.endT || x.exitT <= fold.tradeStartT || x.exitT > fold.endT || x.markedOpen || ["end", "open"].includes(x.reason))
      throw new Error("Endpoint/prewindow close entered the settled sample");
    const r = rec(x.cfg), side = x.side > 0 ? 1 : -1, s = r.sides[side], a = read(x, i), unitR = unitReturn(x), key = stillOpen.has(onset(x)) ? null : onset(x);
    const hour = Math.ceil((x.exitT - fold.tradeStartT) / H) - 1;
    const row = { ...studyConfigDetails(x.cfg, x.kind), closeIndex: i, side, sym: x.sym, entryT: x.entryT, exitT: x.exitT, unitR: Number.isFinite(unitR) ? unitR : null, allocation: a.status, unitNotional: a.unitNotional, allocatedNotional: a.allocatedNotional ?? null, sizedPnl: a.pnl, hour };
    virtualTrades.push(row); add(s.virtual, unitR, a.pnl, key);
    for (const k of [`virtual|${r.tag}`, `virtual-side|${r.tag}|${side}`, `hour-virtual|${hour}|${r.tag}|${r.kind}|${side}`]) add(get(k), unitR, a.pnl, key);
    if (a.status === "zero") { zero++; s.zeroAllocations++; continue; }
    if (a.status === "unknown") { unknown++; s.unknownAllocations++; } else positive++;
    const value = a.status === "unknown" ? NaN : unitR;
    fundedTrades.push({ ...row, unitR: Number.isFinite(value) ? value : null }); add(s.funded, value, a.pnl, a.status === "positive" ? key : null);
    for (const k of [`funded|${r.tag}`, `funded-side|${r.tag}|${side}`, `hour-funded|${hour}|${r.tag}|${r.kind}|${side}`]) add(get(k), value, a.pnl, a.status === "positive" ? key : null);
  }
  const configSides = [], configSymbolProof = [], proofIds = new Set();
  for (const r of records.values()) for (const side of [1, -1]) {
    const s = r.sides[side], pre = finish(s.pre), minPf = Math.max(1.1, minPfOf(p.gates, r.tag, r.ind));
    const provenSymbols = [];
    for (const sym of p.symbols) {
      const own = r.retainedTapeKnown ? finish(s.symbolPre.get(sym) ?? bucket()) : null;
      const proof = !!r.initial?.ok && own !== null && !own.unknownReturns && own.uniqueSettledOnsets >= 30 && (own.noLoss || own.pf >= minPf);
      if (proof) { proofIds.add(`${r.id}|symbol:${sym}|side:${side}`); provenSymbols.push(sym); }
      configSymbolProof.push({ id: r.id, ind: r.ind, tag: r.tag, side, sym, initialConfigEvalPass: r.initial?.ok ?? null, historyKnown: own !== null, minPf, historical: own, researchProof: proof });
    }
    configSides.push({ ...r, sides: undefined, side, builtOrChecked: r.initial !== null || r.retainedTapeKnown, preSideKnown: r.retainedTapeKnown,
      preSidePooledDiagnostic: r.retainedTapeKnown ? pre : null, proofMinPf: minPf, researchProvenSymbols: provenSymbols, researchProofUnits: provenSymbols.length,
      virtual: finish(s.virtual), funded: finish(s.funded), zeroAllocations: s.zeroAllocations, unknownAllocations: s.unknownAllocations });
  }
  const ranges = ["mc", "mn", "sh"].map((tag) => ({ tag, range: RANGE_LABEL[tag], configured: universe.configurations.filter((x) => x.protect.tag === tag).length,
    evaluatedConfigsAtStart: [...records.values()].filter((x) => x.tag === tag && x.initial !== null).length,
    qualifiedConfigsAtStart: [...records.values()].filter((x) => x.tag === tag && x.initial?.ok).length,
    acceptedVirtualConfigs: new Set(virtualTrades.filter((x) => x.tag === tag).map((x) => x.id)).size,
    fundedOwnedConfigs: new Set(fundedTrades.filter((x) => x.tag === tag && x.allocation === "positive").map((x) => x.id)).size,
    base: raw.engine.baseByRange?.find((x) => x.tag === tag) ?? null, baseRejections: raw.engine.baseWhy?.find((x) => x.tag === tag) ?? null,
    build: raw.engine.coverage?.sets?.filter((x) => x.tag === tag) ?? [], initialEvaluation: raw.tapeAgg?.evalFails?.[RANGE_LABEL[tag]] ?? null,
    virtualQualified: finish(get(`virtual|${tag}`)), funded: finish(get(`funded|${tag}`)),
    directions: [1, -1].map((side) => ({ side, virtualQualified: finish(get(`virtual-side|${tag}|${side}`)), funded: finish(get(`funded-side|${tag}|${side}`)), researchProofConfigSymbolSides: configSymbolProof.filter((x) => x.tag === tag && x.side === side && x.researchProof).length })),
    proofConfigSymbolSides: configSymbolProof.filter((x) => x.tag === tag && x.researchProof).length }));
  const checks = book.checks ?? [];
  return { schema: "cts-engine-range-study-evidence-v1", profile: profile.id, fold: fold.id, scope: p.classification,
    settingsVersion: universe.settingsVersion, window: raw.window, configured: known.size, requested: universe.requestedCells,
    initialValidationRecorded: initialValidation !== undefined,
    ownership: { positiveCloseSlices: positive, zeroCloseSlices: zero, unknownAllocationSlices: unknown }, outsideConfiguredUniverse: [...outside],
    ranges, configSides, configSymbolProof, historicalProofIds: [...proofIds].sort(), virtualTrades, fundedTrades,
    hourly: [...sums].filter(([k]) => k.startsWith("hour-")).map(([key, b]) => ({ key, ...finish(b) })),
    validation: raw.validation ?? [], stepsByRange: raw.stepsByRange ?? [], checks, failedChecks: checks.filter((x) => !x.ok),
    endpoints: { planned: raw.openEnd ?? [], allocations: book.sizedOpenOrders ?? [], settledPfExcluded: true },
    notes: ["Virtual accepted-order PF is before allocation and after runtime gates; qualified/unfiltered tape candidates cannot substitute for it.",
      "Primary execution PF is positive-owned settled close-slice unit-return PF. Unknown allocations remain unknown in that primary sample.",
      "Unique settled onsets deduplicate config/symbol/direction/entry time and exclude an onset still present at the endpoint. They are distinct observations, not a claim of uncorrelated market events.",
      "Research proof uses >=30 exact config/symbol/direction historical onsets plus actual initial evaluation pass; neither pooled config-side nor range aggregates qualify an unproven symbol.",
      "Ownership uses normalized allocated total USD >1e-9, not per-unit/share notional, and validates its volume consistency."] };
}
