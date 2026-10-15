// Exact Signal config identities and samples captured while the runtime's tapes still exist.
// Active units are a ranking stage, not proof that every protection cell passed all execution gates.
import { isSignalInd, laneOf, signalSourceOf } from "../../src/core/indications/registry.ts";
import { signalSettings, SIGNAL_SOURCES } from "../../src/core/signal-config.ts";
import { signalCombos, signalProtects, signalActiveHas } from "../../src/core/signals.ts";
import { configId, laneProtect, protectKind } from "../../src/core/pipeline/pipeline.ts";
import { unitReturn } from "../../src/core/metrics/stats.ts";
import { adjustProtect } from "../../src/core/adjust.ts";
import { addReturnEvidence, finishReturnEvidence, returnBucket } from "./return-evidence.mjs";

export function signalConfigDetails(id, protect, kind) {
  const ind = id.split("|")[1] ?? "";
  const lane = laneOf(ind);
  return { id, ind, source: signalSourceOf(ind), range: /-s$/.test(lane.base) ? "short" : "medium", lane: lane.tf,
    combined: lane.combined, kind, protect: { ...protect }, holdMinutes: protect.hold * (lane.tf ?? 15) };
}

export function captureSignalProgress(rt, sim, startT, endT) {
  const sig = signalSettings(rt.settings.signals);
  const combos = signalCombos(sig, rt.settings.tfs);
  const configured = new Map();
  const requestedConfigs = [];
  const floors = rt.fastArgs?.sig?.floors ?? { minSl: sig.minSl, minTrail: sig.minTrail };
  const feedback = rt.fastArgs?.adjust;
  for (const combo of combos) for (const ref of signalProtects(sig)) {
    const requested = laneProtect(ref, combo.ind), kind = protectKind(requested);
    const protect = adjustProtect(adjustProtect(requested, floors), feedback?.[`${combo.bot}|${combo.ind}|${kind}`]);
    const id = configId(combo.bot, combo.ind, protect);
    const requestedId = configId(combo.bot, combo.ind, requested);
    const alias = { requestedId, effectiveId: id, requestedProtect: { ...requested }, effectiveProtect: { ...protect } };
    requestedConfigs.push({ ...signalConfigDetails(requestedId, requested, kind), ...alias });
    if (!configured.has(id)) configured.set(id, { ...signalConfigDetails(id, protect, kind), origin: "configured", requestedAliases: [] });
    configured.get(id).requestedAliases.push(alias);
  }
  const built = new Map(rt.tapes.filter((tp) => isSignalInd(tp.ind)).map((tp) => [tp.id, tp]));
  for (const tp of built.values()) if (!configured.has(tp.id))
    configured.set(tp.id, { ...signalConfigDetails(tp.id, tp.protect, tp.kind), origin: "historic-or-retained", requestedAliases: [] });
  const steps = (sim.signalSteps ?? []).map((s) => ({ t: s.t, keys: [...s.keys] }));
  const stepSets = steps.map((s) => new Set(s.keys));
  const fallback = new Set(rt.wf.signalActive ?? []);
  const activeAt = (t) => {
    let lo = 0, hi = steps.length;
    while (lo < hi) { const m = (lo + hi) >>> 1; if (steps[m].t <= t) lo = m + 1; else hi = m; }
    return lo ? stepSets[lo - 1] : steps.length ? new Set() : fallback;
  };
  const settled = new Map();
  for (const x of sim.trades ?? []) {
    if (!isSignalInd(x.cfg.split("|")[1] ?? "")) continue;
    const key = `${x.cfg}|${x.side > 0 ? 1 : -1}`;
    if (!settled.has(key)) settled.set(key, returnBucket());
    addReturnEvidence(settled.get(key), unitReturn(x), null);
  }
  const hourMs = 3_600_000;
  const hourly = new Map();
  const hourlyKey = (info, side, hour) => `${info.kind}|${info.range}|${info.lane}|${info.combined}|${side}|${hour}`;
  for (const info of configured.values()) for (const side of [1, -1]) for (let hour = 0; startT + hour * hourMs < endT; hour++) {
    const key = hourlyKey(info, side, hour);
    if (!hourly.has(key)) hourly.set(key, { hour, startT: startT + hour * hourMs, endT: Math.min(endT, startT + (hour + 1) * hourMs),
      kind: info.kind, range: info.range, lane: info.lane, combined: info.combined, side, evidence: returnBucket() });
  }
  const rows = [];
  for (const info of configured.values()) {
    const tp = built.get(info.id);
    const sides = {};
    for (const side of [1, -1]) sides[side] = { pre: returnBucket(), runCandidates: returnBucket(), unitActiveCandidates: returnBucket(), symbols: new Set() };
    if (tp) for (let i = 0; i < tp.n; i++) {
      const side = tp.side[i] > 0 ? 1 : -1;
      const row = sides[side];
      const entryT = tp.entryT[i], exitT = tp.exitT[i], r = tp.r[i];
      if (exitT <= startT) addReturnEvidence(row.pre, r, null);
      if (entryT >= startT && entryT < endT && exitT > startT && exitT <= endT) {
        addReturnEvidence(row.runCandidates, r, null);
        const hour = Math.ceil((exitT - startT) / hourMs) - 1;
        addReturnEvidence(hourly.get(hourlyKey(info, side, hour)).evidence, r, null);
        row.symbols.add(tp.syms[tp.symI[i]]);
        const active = activeAt(entryT);
        if (signalActiveHas(active, tp.bot, tp.ind, tp.syms[tp.symI[i]], side, tp.kind))
          addReturnEvidence(row.unitActiveCandidates, r, null);
      }
    }
    rows.push({ ...info, built: !!tp, historyCalculated: !!tp,
      status: tp ? "built; unit ranking and entry gates apply independently" : "not built; see pair discovery and aggregate build skip evidence",
      sides: Object.fromEntries(Object.entries(sides).map(([side, r]) => [side, {
        pre: finishReturnEvidence(r.pre), runCandidates: finishReturnEvidence(r.runCandidates), unitActiveCandidates: finishReturnEvidence(r.unitActiveCandidates),
        executed: finishReturnEvidence(settled.get(`${info.id}|${side}`) ?? returnBucket()), candidateSymbols: [...r.symbols].sort(),
      }])) });
  }
  return { version: 2, settings: sig, catalog: SIGNAL_SOURCES.map((s) => ({ name: s.name, enabled: sig.enabled && (sig.sourcesMode === "allow" ? sig.sources[s.name] === true : sig.sources[s.name] !== false) })),
    combos, requestedConfigs, configs: rows, steps, endActive: [...(sim.signalActiveEnd ?? [])],
    hourlyCandidates: [...hourly.values()].map(({ evidence, ...info }) => ({ ...info, ...finishReturnEvidence(evidence) })),
    build: (rt.buildStats ?? []).filter((s) => isSignalInd(s.ind)),
    definitions: { requested: "Every requested source × short/medium range × lane × raw protection cell, including cells that share one effective protection after required floors",
      configured: "Distinct effective configured source × short/medium range × lane × protection cells after the same lane, hard-floor and saved-feedback adjustments as the actual builder; requestedAliases preserves every original cell; historic/retained additions listed separately",
      historyCalculated: "A full tape exists; this is calculation coverage, not a PF pass",
      pre: "Tape settled unit returns closed at or before trade start; available prehistory only, no trade-window returns",
      runCandidates: "Independent tape candidates entered during the trade window and settled by its end; diagnostic, before activation and execution gates",
      hourlyCandidates: "The same runCandidates grouped by right-closed close hour (startT, endT], type, range, lane and direction; all source/protection candidates are pooled with overlapping variants, and zero cells are retained; diagnostic, before activation, coordination and allocation",
      unitActiveCandidates: "Tape candidates whose source/range/lane/type/symbol/direction unit was active at entry; later acceptance, risk and execution gates still apply",
      executed: "Actual settled modeled execution closes after all runtime gates, unit returns excluding external execution multipliers",
      sizedPnl: "Not calculated in this stage capture; use the separate report book for cash/equity diagnostics",
      missing: "No tape is not a failing measured PF and is never counted as a pass; aggregate build skip evidence is not an exact per-cell rejection reason" } };
}
