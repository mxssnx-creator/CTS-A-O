#!/usr/bin/env node
// One predeclared causal focus/entry-gate experiment; no account access or retrospective trade deletion.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { studyJson, studyHash, studyCommand, studyEnvironment, studyChild, summarizeStudy, studyMarkdown, verifyStudySources } from "./core-22-symbol-study.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = fileURLToPath(import.meta.url);
const read = (file) => { const b = fs.readFileSync(file); return { data: JSON.parse(b), sha256: studyHash(b) }; };
const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, studyJson(data), { flag: "wx" }); };
const equal = (a, b) => studyJson(a) === studyJson(b);
export const PRUNE_POLICY = {
  schema: "cts-causal-prune-policy-v3", variant: "initial-engine-qualifiers-safe-range-crop-plus-causal-entry-last15",
  prerequisites: "A structurally complete22-symbol24h baseline must exist before deriving any focus or running this trial.",
  training: "Use only the earliest recorded runtime validation step at the exact simulated tradeStartT. Include an engine bot|ind pair iff at least one of its config checks passed at that step. Ignore later checks, run-window trades, PF, hourly returns and filled PnL.",
  scope: "Keep each original case's complete normalized settings and nested grid, costs, all Signals sources/voting/configs/ranges, strategy toggles and PF/DDT/DDR/partial-history floors. Replace engine focus, clear pinned pairs, and apply only the predeclared engine-only Micro/Minimal crop. Set native global entry wf.lastN15: engine entry15; preserve the baseline's own Signal validation and native direction-entry policy (current default Last-8).",
  rangeCrop: "At only the earliest exact tradeStart validation step, an engine-only mc/mn range may be disabled iff >=25 distinct engine configs have n>=current production gates.minTrades(12) and zero engine configs in that range passed. Fewer scored checks retain the range. Never cut sh/gn/lg or any Signal range/source/voting/config based on engine failures; assert signalCombos, standard Signal protections and coordinator effective protection grid unchanged.",
  runtimeCaveats: "Production baseFocus may automatically retain default Micro pairs; report actual expanded combo reduction. Global lastN15 follows the native Signal entry minimum with its own validation setting; preserve the frozen baseline's Signal policy, source voting/configs/ranges.",
  failClosed: "No empty focus (which production interprets as all). Reject if zero eligible engine pairs, an unknown pair, or no reduction in actual expanded engine combos. Missing history never qualifies through an invented sample.",
  comparisons: "Freeze20-symbol and optional22-symbol variants before their outcomes. Rerun the actual engine with unchanged shared-book sizing. Retain every executed loss, empty result, failed run and endpoint separately. No posthoc trade removal or tuning against test-period outcomes.",
  entryLastN: 15, signalValidLastN: "preserve-baseline", actualExecution: false, live: false,
};

export function initialPruneFocus(validation, tradeStartT, isSignal, rangeOf = (id) => id.split("|").at(-1), minTrades = 12) {
  const first = [...(validation ?? [])].sort((a, b) => a.t - b.t)[0];
  if (first?.t !== tradeStartT || !Array.isArray(first.checks)) throw new Error("Earliest validation must be recorded at exact trade start");
  const focus = new Set(), configs = [], ranges = new Map(["mc", "mn"].map((tag) => [tag, { tag, key: tag === "mc" ? "micro" : "minimal", scored: new Set(), passed: new Set() }]));
  for (const [id, ok, n] of first.checks) {
    const [bot, ind] = String(id).split("|");
    if (!bot || !ind) throw new Error("Invalid config identity in initial validation");
    if (ok && !isSignal(ind)) { focus.add(`${bot}|${ind}`); configs.push(id); }
    const r = !isSignal(ind) ? ranges.get(rangeOf(id)) : null;
    if (r) { if (n >= minTrades) r.scored.add(id); if (ok) r.passed.add(id); }
  }
  if (!focus.size) throw new Error("No initially qualified engine pair; refusing empty focus fallback");
  return { focus: [...focus].sort(), passedConfigs: configs.sort(), trainingT: first.t, checkedConfigs: first.checks.length,
    ranges: [...ranges.values()].map((r) => ({ tag: r.tag, key: r.key, scoredConfigsWithMinimumHistory: r.scored.size, passedConfigs: r.passed.size, minTrades, minimumScored: 25, disable: r.scored.size >= 25 && r.passed.size === 0 })) };
}

export async function materializePruneCase(baseCase, focus, rangeDecisions = []) {
  process.env.CTS_CORE_STATE = "off"; process.env.CTS_CORE_AUTOSTART = "0"; process.env.CTS_CORE_LIVE = "0";
  await import("./lib/core-test-offline-guard.cjs");
  const [{ CoreRuntime, baseFocus, signalCoordinationProtects }, { CoreDb }, { allCombos, microLaneFloor }, { signalCombos, signalProtects }, { signalSettings }, { defaultWalkForward }] = await Promise.all([import("../src/core/server/runtime.server.ts"), import("../src/core/server/db.server.ts"), import("../src/core/pipeline/pipeline.ts"), import("../src/core/signals.ts"), import("../src/core/signal-config.ts"), import("../src/core/sim/walkforward.ts")]);
  const original = baseCase.runtime, settings = { ...structuredClone(original.settings), focus: [...focus], pinned: [] };
  for (const r of rangeDecisions) {
    if (!["mc", "mn"].includes(r.tag) || r.key !== (r.tag === "mc" ? "micro" : "minimal")) throw new Error("Only predeclared engine Micro/Minimal crop is permitted");
    if (r.disable) { if (r.scoredConfigsWithMinimumHistory < 25 || r.passedConfigs !== 0 || r.minTrades !== original.settings.gates.minTrades) throw new Error("Range crop lacks initial-history evidence"); settings.grid[r.key] = false; }
  }
  const combos = (s) => allCombos(baseFocus(s), s.disabledKinds, s.tfs, microLaneFloor(s.grid)).map((x) => `${x.bot}|${x.ind}`);
  const before = combos(original.settings), known = new Set(before);
  if (!focus.length || focus.some((x) => !known.has(x))) throw new Error("Empty/unknown engine focus cannot be scored");
  const runtime = new CoreRuntime(new CoreDb(":memory:"), { symbols: baseCase.symbols.length, signals: { enabled: true } }, { replay: true, priceStream: null });
  try {
    runtime.updateSettings(settings, { ...original.commandWf, lastN: PRUNE_POLICY.entryLastN });
    const actual = { settings: structuredClone(runtime.settings), wf: structuredClone(runtime.wf) }, after = combos(actual.settings);
    if (after.length >= before.length || after.some((x) => !known.has(x))) throw new Error("No actual engine combo reduction; trial rejected");
    const restore = { ...actual.settings, focus: original.settings.focus, pinned: original.settings.pinned, grid: original.settings.grid };
    if (!equal(restore, original.settings) || !equal(actual.settings.grid, settings.grid)) throw new Error("Unexpected settings change outside predeclared scope");
    const derived = defaultWalkForward(actual.settings), restoredWf = { ...actual.wf, lastN: original.wf.lastN, protects: original.wf.protects, rangeGate: original.wf.rangeGate, rangeSeats: original.wf.rangeSeats };
    if (!equal(restoredWf, original.wf) || !equal(actual.wf.protects, derived.protects) || !equal(actual.wf.rangeGate, derived.rangeGate) || actual.wf.validLastN !== 15 || actual.wf.signalValidLastN !== original.wf.signalValidLastN) throw new Error("Unexpected WF change outside native entry lastN15 and derived engine grids");
    const signalIdentity = (s) => { const sig = signalSettings(s.signals); return { combos: signalCombos(sig, s.tfs), protects: signalProtects(sig), coordinators: signalCoordinationProtects(s.grid, s.cost, sig.coordination.ranges) }; };
    const signals = signalIdentity(original.settings); if (!equal(signals, signalIdentity(actual.settings))) throw new Error("Signals voting or protection configuration changed");
    return { ...baseCase, baselineRuntime: original, id: `causal-prune-${baseCase.symbols.length}`, runtime: { ...actual, commandWf: { ...original.commandWf, lastN: PRUNE_POLICY.entryLastN }, settingsSha256: studyHash(studyJson(actual)), laneHistoryDays: original.laneHistoryDays, scope: PRUNE_POLICY.scope },
      focusEvidence: { requestedPairs: focus.length, baselineExpandedPairs: before.length, trialExpandedPairs: after.length, automaticallyRetainedPairs: after.filter((x) => !focus.includes(x)), removedEnginePairs: before.filter((x) => !after.includes(x)), rangeDecisions,
        unchangedSignals: { combos: signals.combos.length, standardProtects: signals.protects.length, coordinatorProtects: signals.coordinators.length, identitySha256: studyHash(studyJson(signals)) } } };
  } finally { runtime.dispose(); }
}

export function assertPruneFullCompute(raw) {
  const mem = raw.engine?.mem, level = mem?.computeLevel ?? mem?.fallback;
  if (level !== 0) throw new Error(`Incomplete full grid: memory compute level ${level ?? "unknown"}; ${mem?.lastAbort ?? "memory provenance unavailable"}`);
  if (raw.engine?.coverage?.expectedCombos !== raw.engine?.coverage?.evaluated) throw new Error("Incomplete full grid: not every configured Base combo was evaluated");
}

export async function pruneStudyMain(argv) {
  const [mode, ...args] = argv, arg = (name, d) => { const i = args.indexOf(`--${name}`); return i < 0 ? d : args[i + 1]; };
  if (!["policy", "prepare", "run"].includes(mode)) throw new Error("Usage: core-causal-prune-study.mjs policy|prepare|run --baseline-protocol file --policy policy.json [--out NEW_DIR] [--protocol trial.json --case causal-prune-20]");
  if (mode === "policy") {
    const baseline = read(path.resolve(arg("baseline-protocol"))), dest = path.resolve(arg("policy")); verifyStudySources(baseline.data);
    write(dest, { frozenAt: new Date().toISOString(), baselineProtocolSha256: baseline.sha256, baselineSourceSha256: studyHash(studyJson(baseline.data.sources)), supersedesPolicySha256: arg("supersedes") ? read(path.resolve(arg("supersedes"))).sha256 : null, policy: PRUNE_POLICY });
    console.log(studyJson({ policyFrozen: true, path: dest, sha256: read(dest).sha256, noOutcomeRead: true })); return;
  }
  if (mode === "prepare") {
    const baselineFile = path.resolve(arg("baseline-protocol")), baseline = read(baselineFile), seal = read(path.resolve(arg("policy"))), output = path.resolve(arg("out"));
    verifyStudySources(baseline.data);
    if (!equal(seal.data.policy, PRUNE_POLICY) || seal.data.baselineProtocolSha256 !== baseline.sha256 || fs.existsSync(output)) throw new Error("Policy/baseline mismatch or output already exists");
    const baselineDir = path.dirname(baselineFile), complete = read(path.join(baselineDir, "baseline-22/run-result.json")).data;
    if (!complete.complete) throw new Error("Complete22-symbol baseline required before pruning");
    const training = read(path.join(baselineDir, "baseline-22/raw.json")), [{ isSignalInd }, { rangeOfId }] = await Promise.all([import("../src/core/indications/registry.ts"), import("../src/core/minimal-coord.ts")]);
    const initial = initialPruneFocus(training.data.validation, baseline.data.window.tradeStartT, isSignalInd, rangeOfId, baseline.data.cases[0].runtime.settings.gates.minTrades);
    if (Date.parse(seal.data.frozenAt) >= Date.parse(training.data.at)) throw new Error("Policy was not frozen before the baseline outcome");
    const cases = []; for (const c of baseline.data.cases) cases.push(await materializePruneCase(c, initial.focus, initial.ranges));
    const protocol = { ...baseline.data, classification: "Predeclared retrospective causal optimization experiment; not independent future profitability proof", frozenAt: new Date().toISOString(), cases,
      prune: { policySha256: seal.sha256, policy: PRUNE_POLICY, baselineProtocolSha256: baseline.sha256, baselineRawSha256: training.sha256, initial, launcherSha256: studyHash(fs.readFileSync(SELF)) } };
    write(path.join(output, "protocol.json"), protocol); console.log(studyJson({ prepared: true, protocol: path.join(output, "protocol.json"), focus: initial.focus.length, cases: cases.map(({ id, focusEvidence }) => ({ id, ...focusEvidence })) })); return;
  }
  const file = path.resolve(arg("protocol")), frozen = read(file), p = frozen.data, c = p.cases.find((x) => x.id === arg("case"));
  verifyStudySources(p);
  if (!c || !equal(p.prune?.policy, PRUNE_POLICY) || p.prune.launcherSha256 !== studyHash(fs.readFileSync(SELF))) throw new Error("Unknown case or changed frozen prune policy/source");
  if (studyHash(fs.readFileSync(c.feed)) !== c.feedSha256) throw new Error("Frozen feed changed");
  const again = await materializePruneCase({ ...c, runtime: c.baselineRuntime }, p.prune.initial.focus, p.prune.initial.ranges);
  if (!equal(again.runtime, c.runtime) || !equal(again.focusEvidence, c.focusEvidence)) throw new Error("Actual prune runtime differs from frozen settings");
  const dest = path.join(path.dirname(file), c.id), lock = path.join(ROOT, "runs/core-22-symbol-study.lock");
  if (fs.existsSync(dest)) throw new Error("Preserve existing attempt; never overwrite a trial");
  const lockFd = fs.openSync(lock, "wx"); fs.writeFileSync(lockFd, String(process.pid)); fs.mkdirSync(dest);
  const command = { engine: studyCommand(p, c, dest), render: studyCommand(p, c, dest, "render"), environment: studyEnvironment(p.budget.workers), protocolSha256: frozen.sha256 };
  write(path.join(dest, "command.json"), command); const result = { id: c.id, complete: false };
  try {
    result.engine = await studyChild(command.engine, path.join(dest, "engine.log"), p.budget.timeoutMinutes * 60_000, { workers: p.budget.workers, watchMemory: true });
    if (result.engine.exitCode !== 0 || result.engine.timedOut || result.engine.memoryAbort || result.engine.interrupted) throw new Error("Engine incomplete; no counterfactual PF can be inferred");
    const raw = read(path.join(dest, "raw.json")); assertPruneFullCompute(raw.data);
    result.render = await studyChild(command.render, path.join(dest, "render.log"), p.budget.timeoutMinutes * 60_000, { workers: p.budget.workers });
    if (![0, 1].includes(result.render.exitCode) || result.render.timedOut || result.render.interrupted) throw new Error("Report incomplete");
    verifyStudySources(p);
    const book = read(path.join(dest, "book/data.json")), summary = await summarizeStudy(raw.data, book.data, p, c, fs.readFileSync(path.join(dest, "engine.log"), "utf8"));
    summary.prune = { ...p.prune, focusEvidence: c.focusEvidence, limitations: "Engine focus reduction and native lastN15 change together; this one trial cannot attribute their individual effects or guarantee profit." };
    summary.provenance = { protocolSha256: frozen.sha256, feedSha256: c.feedSha256, rawSha256: raw.sha256, bookSha256: book.sha256 };
    write(path.join(dest, "summary.json"), summary); fs.writeFileSync(path.join(dest, "summary.md"), studyMarkdown(summary), { flag: "wx" });
    result.complete = summary.complete; result.summarySha256 = read(path.join(dest, "summary.json")).sha256; result.structuralFailures = summary.structural.filter((x) => !x.ok);
  } catch (e) { result.error = String(e); }
  finally { write(path.join(dest, "run-result.json"), result); fs.closeSync(lockFd); fs.unlinkSync(lock); }
  console.log(studyJson(result)); if (!result.complete) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === SELF) await pruneStudyMain(process.argv.slice(2));
