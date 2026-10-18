#!/usr/bin/env node
// Inventory and cost planning only. Does not compute signals, fit exits, or score trades.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { allCombos, microLaneFloor } from "../src/core/pipeline/pipeline.ts";
import { baseFocus, normalizeLanes } from "../src/core/server/runtime.server.ts";
import { INDICATION_BY_ID, laneOf, isSignalInd } from "../src/core/indications/registry.ts";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const stem = "docs/sims/exit-validation-20261017-broad-inventory";
const s = normalizeLanes(structuredClone(DEFAULT_SETTINGS));
const focus = baseFocus(s);
const summarize = (pairs) => {
  const byBot = {}, byLane = {}, byKind = {};
  for (const pair of pairs) {
    const lane = laneOf(pair.ind);
    const key = `${lane.tf ?? "plain"}${lane.combined ? "c" : ""}`;
    const kind = lane.base === "none" ? "none" : INDICATION_BY_ID.get(lane.base)?.kind;
    assert.ok(kind, `actual registry definition: ${pair.ind}`);
    byBot[pair.bot] = (byBot[pair.bot] ?? 0) + 1;
    byLane[key] = (byLane[key] ?? 0) + 1;
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }
  return { pairs: pairs.length, uniquePairs: new Set(pairs.map((pair) => `${pair.bot}|${pair.ind}`)).size, baseIds: new Set(pairs.map((pair) => laneOf(pair.ind).base)).size, signalPairs: pairs.filter((pair) => isSignalInd(pair.ind)).length, byBot, byLane, byKind };
};
const defaultPairs = allCombos(focus, s.disabledKinds, s.tfs);
const fullPairs = allCombos([], s.disabledKinds, s.tfs);
const initialProtocol = JSON.parse(readFileSync("docs/sims/exit-validation-20261017-protocol.json"));
const reference = JSON.parse(readFileSync("docs/sims/exit-validation-20261017-default168h-result.json"));
const sourceProtocol = "/workspace/scratch/7b916fb11a8d/cts-ao/runs/symbols22-study-20261017-v2/protocol.json";
const cachedProtocol = JSON.parse(readFileSync(sourceProtocol));
const cached = cachedProtocol.cases.find((candidate) => candidate.id === "baseline-20");
assert.equal(cached.feedSha256, initialProtocol.source.sha256, "same previously hashed public input");
const endT = Math.min(...Object.values(cached.quality).map((row) => row.lastT + 60_000));
const firstT = Math.max(...Object.values(cached.quality).map((row) => row.firstT));
const selectedSymbols = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT"];
const H = 3_600_000;
const proposedWindow = { endT, tradingFromT: endT - 24 * H, evaluationFromT: endT - (24 + 168) * H, indicatorFromT: endT - (24 + 168 + 72) * H, evaluatedPrehistoryH: 168, tradingH: 24, indicatorOnlyWarmupH: 72, totalLoadedH: 264 };
assert.ok(proposedWindow.indicatorFromT >= firstT);
const coarseEstimateMs = (pairs, symbols) => reference.elapsedMs * pairs / 16 * symbols / 4 * 264 / 246;
// Dense per-bar entries are a theoretical capacity bound, not an expected workload or measured memory.
const theoreticalTapeRows = defaultPairs.reduce((n, pair) => n + 192 * 60 / (laneOf(pair.ind).tf ?? 1), 0) * selectedSymbols.length * s.exitStrategy.maxConfigsPerPair;
const result = {
  classification: "Inventory and coarse resource planning only; no new strategy scoring or market performance evidence",
  actualDefaults: { tfs: s.tfs, focusCount: s.focus.length, pinnedCount: s.pinned.length, disabledKinds: s.disabledKinds, baseFocusCount: focus.length, microRangeFloorIfApplied: microLaneFloor(s.grid), maxConfigsPerPair: s.exitStrategy.maxConfigsPerPair, lookbackH: s.exitStrategy.lookbackH },
  defaultExitWithoutRangeFloor: summarize(defaultPairs), defaultWithRangeFloorDiagnostic: summarize(allCombos(focus, s.disabledKinds, s.tfs, microLaneFloor(s.grid))), unrestrictedAllRegistryCombos: summarize(fullPairs),
  defaultPairInventory: defaultPairs.map((pair) => `${pair.bot}|${pair.ind}`),
  cachedFeed: { ...initialProtocol.source, provenanceProtocol: sourceProtocol, provenanceProtocolSha256: hash(readFileSync(sourceProtocol)), symbols: cached.symbols, symbolsCount: cached.symbols.length, commonFirstT: firstT, commonEndT: endT, commonHorizonH: (endT - firstT) / H, quality: cached.quality, dataNewlyRead: false },
  proposedWindow, proposedSelectedSymbols: selectedSymbols,
  costEstimate: {
    status: "Unmeasured linear planning estimate; combined/active indications, cache behavior and candidate density can materially increase it",
    measuredReference: { pairCount: 16, symbols: 4, evaluatedPrehistoryH: 168, tradingH: 6, loadedH: 246, elapsedMs: reference.elapsedMs, maxRssMiB: reference.maxRssMiB },
    default794Pairs4SymbolsLinearSeconds: coarseEstimateMs(defaultPairs.length, 4) / 1000,
    default794Pairs20SymbolsLinearSeconds: coarseEstimateMs(defaultPairs.length, 20) / 1000,
    unrestricted30062Pairs4SymbolsLinearSeconds: coarseEstimateMs(fullPairs.length, 4) / 1000,
    maxCandidatesDefaultInventory: defaultPairs.length * s.exitStrategy.maxConfigsPerPair,
    maxCandidatesUnrestrictedInventory: fullPairs.length * s.exitStrategy.maxConfigsPerPair,
    theoreticalDenseTradeRowsDefault4Symbols: theoreticalTapeRows,
    theoreticalDenseTapeBytesDefault4Symbols: theoreticalTapeRows * 75 + defaultPairs.length * s.exitStrategy.maxConfigsPerPair * 32,
    proposedBudget: "Wait until full npm test completes; one process, four fixed symbols, one pair in memory at a time, fixed168h prehistory+24h trading, bounded cache eviction, maximum768MiB heap and an explicit RSS guard. Do not retain all tapes. Pair-at-a-time execution requires documented proof that enabled cross-config controls are inactive or equivalent; otherwise retain the production global coordinator.",
  },
  sourceHashes: ["src/core/config.ts", "src/core/pipeline/pipeline.ts", "src/core/server/runtime.server.ts", "src/core/indications/registry.ts"].map((path) => ({ path, sha256: hash(readFileSync(path)) })),
};
writeFileSync(`${stem}.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ path: `${stem}.json`, defaultPairs: defaultPairs.length, allRegistryPairs: fullPairs.length, cachedHorizonH: result.cachedFeed.commonHorizonH, proposedWindow, coarseSeconds: result.costEstimate.default794Pairs4SymbolsLinearSeconds, maxCandidates: result.costEstimate.maxCandidatesDefaultInventory }));
