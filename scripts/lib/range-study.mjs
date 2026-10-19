// A bounded, explicitly retrospective study contract. This module never scores or acquires market data.
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { INDICATIONS } from "../../src/core/indications/registry.ts";
import { allCombos, configId, laneProtect } from "../../src/core/pipeline/pipeline.ts";
import { ENGINE_SIDE_ACCEPT, defaultWalkForward } from "../../src/core/sim/walkforward.ts";
import { normalizeLanes, sanitizeWf } from "../../src/core/server/runtime.server.ts";

export const RANGE_STUDY_MICRO = ["mc-rsi2-15", "mc-rsi2-30", "mc-rsit2-20", "mc-rsi3-20", "mc-mturn-10", "mc-tpull-8"];
export const RANGE_STUDY_TACTIC = ["trend", "pullback", "mean-reversion", "breakout", "adaptive"].flatMap((x) => ["s", "m"].map((r) => `tactic-${x}-${r}`));
export const studySha256 = (x) => createHash("sha256").update(x).digest("hex");
export const studyJson = (x) => JSON.stringify(x, null, 2) + "\n";
export function deepStudyMerge(base, patch) {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && out[key] && typeof out[key] === "object" && !Array.isArray(out[key]))
      out[key] = deepStudyMerge(out[key], value);
    else out[key] = structuredClone(value);
  }
  return out;
}

export function rangeStudyProtocol(frozenAt) {
  if (!Number.isFinite(Date.parse(frozenAt))) throw new Error("A valid explicit freeze timestamp is required");
  const baseIds = [...RANGE_STUDY_MICRO, ...RANGE_STUDY_TACTIC];
  const known = new Set(INDICATIONS.map((x) => x.id));
  if (baseIds.length !== 16 || new Set(baseIds).size !== 16 || baseIds.some((x) => !known.has(x))) throw new Error("Every fixed base ID must exist exactly once");
  if (DEFAULT_SETTINGS.grid.baseTrailCells !== false || ENGINE_SIDE_ACCEPT.enabled !== false) throw new Error("Profile differences no longer match the actual defaults; refuse silently duplicate profiles");
  const focus = baseIds.flatMap((x) => [`follow|${x}@m15`, `follow|${x}@m15c`]);
  // A supporting higher timeframe is required for a real combined15m lane. Exact focus excludes standalone30m configs.
  const combos = allCombos(focus, [], [15, 30], 5);
  if (combos.length !== 32 || combos.some((x) => !focus.includes(`${x.bot}|${x.ind}`))) throw new Error("Fixed focus is missing or expands beyond32 exact lane IDs");
  const H = 3_600_000;
  const folds = ["2026-10-14T04:00:00Z", "2026-10-15T04:00:00Z"].map((end, i) => {
    const endT = Date.parse(end), tradeStartT = endT - 6 * H, evaluationFromT = tradeStartT - 72 * H, indicatorStartT = evaluationFromT - 205 * H;
    return { id: `development-${i + 1}`, endT, tradeStartT, evaluationFromT, indicatorStartT,
      endUtc: new Date(endT).toISOString(), tradeStartUtc: new Date(tradeStartT).toISOString(), evaluationFromUtc: new Date(evaluationFromT).toISOString(), indicatorStartUtc: new Date(indicatorStartT).toISOString() };
  });
  return {
    schema: "cts-engine-range-study-protocol-v1", frozenAt, status: "rules-frozen-awaiting-production-source-freeze",
    classification: "Retrospective development only: both fixed windows have already been accessed. Findings concern one bounded15m study, not all timeframes, the complete production universe or actual live execution.",
    symbols: ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT"], baseIds, focus,
    focusedTimeframes: [15], supportingTimeframes: [15, 30], laneModes: ["regular", "combined"], folds,
    warmup: { hours: 205, completed15mBars: 820, completedSupporting30mBars: 410, excludedFromPerformanceEntries: true }, preH: 72, runH: 6,
    commonSettings: { forceSymbols: ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT"], symbols: 4, symbolRank: "volume", tfs: [15, 30], focus, pinned: [], disabledKinds: [], signals: { enabled: false },
      grid: { micro: { ownInds: false }, general: false, long: false, minimalPlus: { enabled: false } },
      toggles: { normal: true, trailing: true, block: true, blockActive: false, dca: false, dcaActive: false, axis: false } },
    commonWf: { causalBase: true, recordValidation: true },
    fullGridDefaults: { micro: DEFAULT_SETTINGS.grid.micro, minimal: DEFAULT_SETTINGS.grid.minimal, short: DEFAULT_SETTINGS.grid.short,
      holdH: DEFAULT_SETTINGS.grid.holdH, trailStep: DEFAULT_SETTINGS.grid.trailStep, trailFree: DEFAULT_SETTINGS.grid.trailFree,
      rangeGate: DEFAULT_SETTINGS.grid.rangeGate, baseBest: DEFAULT_SETTINGS.grid.baseBest, baseTargets: DEFAULT_SETTINGS.grid.baseTargets, baseRanges: DEFAULT_SETTINGS.grid.baseRanges },
    gates: DEFAULT_SETTINGS.gates, cost: DEFAULT_SETTINGS.cost,
    book: { balance: 1000, pct: 0.02, leverage: 10, positionCapEquityMultiple: 0.75, grossCapEquityMultiple: 7, precisionEpsilonUsd: 1e-9 },
    profiles: [
      { id: "P0", label: "Corrected scoped baseline", settings: {}, wf: {} },
      { id: "P1", label: "Additional causal trailing Base cell", settings: { grid: { baseTrailCells: true } }, wf: {} },
      { id: "P2", label: "Existing independent engine side acceptance", settings: {}, wf: { engineSideAccept: { ...ENGINE_SIDE_ACCEPT, enabled: true } } },
    ],
    invariants: [
      "All16 base IDs and32 exact15m regular/combined lane IDs exist; no focus fallback or Tactic disabling.",
      "All3 complete current range TP/SL/trail/hold ladders, costs and every runtime PF/sample/DDR/last-N/cap gate remain unchanged.",
      "Micro ownInds:false is explicit common study scope: it respects the fixed focus and permits existing Tactic entries on Micro cells at Tactic minimumPF1.1. It is not the production-default scope.",
      "Every profile, direction, empty/losing/unknown/no-loss sample and incomplete run remains in the report. Configured cells are not counted as evaluated or qualified.",
      "Primary modeled execution PF uses matched positive normalized allocations and settled unit returns; cash PF is separate on the same owned sample. Planned candidates and endpoint marks remain separate.",
      "One heavy child only, guard before imports, workers1/heap4096, compare/variants0, memory guard enabled; never waive completeness or fallback guards.",
    ],
    selection: {
      primary: "First axis: settled post-Base accepted virtual-order unit-return PF before account allocation, labeled virtualQualifiedPF. Second primary execution axis: positive-owned funded settled unit-return PF. Both must qualify; unfiltered and initially-seated candidate-tape PF are diagnostic only.",
      configProof: "Additional research proof requires actual initial configEval pass, >=30 unique pre-start settled onsets of that exact config+symbol+direction (deduplicate config/symbol/side/entryT), and own-side prehistory returnPF>=max(1.1,current range/indication minimum). Missing retained side history is unknown. This proof label changes no engine gate and never removes executed losses.",
      profileEligibility: "For a range, both development folds need >=30 distinct funded settled onsets and finite funded returnPF>=1.1; actual settled post-Base accepted virtual orders before allocation also need finite unit-returnPF>=1.1 in each fold. Empty/insufficient folds do not qualify. Initially configEval-qualified tape candidates are diagnostic and cannot select a profile. Both directions are evaluated/reported; a direction lacking its own30-onset proof stays unproven.",
      ranking: "Among eligible profiles maximize number of exact configs meeting research proof in both folds, then minimum per-fold funded returnPF, then preferP0,P1,P2. Select none if no profile qualifies.",
      outer: "Freeze selected profile(s), full configured ID universe, exact IS-proof cohort and source hashes before any new OHLCV request. Outer primary funded book includes every runtime-executed member and loss; frozen IS-proof subsets are additional labeled diagnostics. No OOS profile/member dropping.",
    },
    outerCandidate: { classification: "Newly accessed retrospective3h data, not untouched prospective or complete6h validation. Report Short/config sample insufficiency.",
      tradeStartT: 1792036800000, endT: 1792047600000, runH: 3, expectedNewBarsPerSymbol: 180,
      acquisitionStatus: "HELD until selected profile/ID/source freeze and root acknowledgement",
      endpoint: "https://open-api.bingx.com/openApi/swap/v3/quote/klines", method: "GET", queryPerSymbol: { interval: "1m", startTime: "1792036800000", endTime: "1792047599999", limit: "1440" },
      headers: { accept: "application/json" }, credentials: false, redirect: "error", maxAttempts: 1, maxRequests: 4 },
    budget: { workers: 1, heapMb: 4096, concurrency: 1, developmentRuns: 6, estimatedMinutes: [12, 24], estimatedPeakRssGiB: 5, timeoutMinutesPerRun: 15, memoryGuardEnabled: true },
    sourceFreeze: { requiredBeforeAnyScoring: true, status: "pending promotion/UI/range source freeze", manifest: "source-freeze.json" },
  };
}

export function assertStudyProtocol(p) {
  if (p?.schema !== "cts-engine-range-study-protocol-v1" || p.profiles?.length !== 3 || p.folds?.length !== 2 || p.symbols?.length !== 4) throw new Error("Unexpected bounded range-study protocol");
  const expected = rangeStudyProtocol(p.frozenAt);
  if (studyJson(p) !== studyJson(expected)) throw new Error("Frozen protocol differs from its reviewed definition/current defaults");
  return p;
}

/** Exact configured identity universe, computed without reading any market returns. */
export function rangeStudyIdentityUniverse(p, profile) {
  // The runtime always keeps the 1m data lane; exact focus still limits outcomes to the32 fixed15m IDs.
  const settings = normalizeLanes(deepStudyMerge(deepStudyMerge(DEFAULT_SETTINGS, p.commonSettings), profile.settings));
  const wf = deepStudyMerge(defaultWalkForward(settings), sanitizeWf({ preH: p.preH, simH: p.runH, ...p.commonWf, ...profile.wf }));
  const ids = new Map();
  for (const pair of p.focus) {
    const [bot, ind] = pair.split("|");
    for (const ref of wf.protects) {
      const protect = laneProtect(ref, ind);
      const id = configId(bot, ind, protect);
      if (!ids.has(id)) ids.set(id, { id, bot, ind, protect });
    }
  }
  return { settings, wf, settingsVersion: studySha256(studyJson({ settings, wf })), requestedCells: p.focus.length * wf.protects.length, configurations: [...ids.values()] };
}
