import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const H = 3_600_000;
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const SESSION_STUDY_SOURCE_SCOPE = "engine-shared-manifests-v1";
export const studySha256 = (value) => createHash("sha256").update(value).digest("hex");
export function studyCanonical(value) {
  if (value instanceof Set) return [...value].sort().map(studyCanonical);
  if (value instanceof Map) return Object.fromEntries([...value].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([k, v]) => [k, studyCanonical(v)]));
  if (ArrayBuffer.isView(value)) return [...value].map(studyCanonical);
  if (Array.isArray(value)) return value.map(studyCanonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => [k, studyCanonical(value[k])]));
  return value;
}
export const studyExactJson = (value) => JSON.stringify(studyCanonical(value));
/** The run's requested boundaries always win over a desk snapshot's stale WF hours. */
export function studyWithRequestedWindow(wf, preH, simH) {
  return { ...wf, preH, simH };
}

/** Seal economic source and the common report instrumentation separately for each arm. */
export function sessionStudySourceFiles(root = defaultRoot) {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(resolve(dir, e.name)) :
    (/\.(?:ts|tsx|js|mjs|cjs)$/.test(e.name) || e.name === "package.json") && !/\.test\.[^.]+$/.test(e.name) && e.name !== "test-support.ts" ? [resolve(dir, e.name)] : []);
  // The engine imports shared Last-N, volume and Relate modules; a changed dependency must invalidate the seal too.
  return [...walk(resolve(root, "src/core")), ...walk(resolve(root, "shared")), ...walk(resolve(root, "scripts/lib")),
    resolve(root, "scripts/core-session.mjs"), resolve(root, "package.json"), resolve(root, "package-lock.json")]
    .sort().map((file) => ({ path: relative(root, file), sha256: studySha256(readFileSync(file)) }));
}

export function readSessionStudy(protocolPath, root = defaultRoot) {
  const bytes = readFileSync(protocolPath), p = JSON.parse(bytes);
  if (p.schema !== "cts-session-study-v1" || !p.id || !Array.isArray(p.symbols) || !p.symbols.length || new Set(p.symbols).size !== p.symbols.length)
    throw new Error("Invalid frozen session study identity/symbols");
  const stageH = p.window?.processedWarmupH ?? 0;
  if (!p.window || !Number.isSafeInteger(stageH) || stageH < 0 || stageH > 240 ||
      !Number.isFinite(p.window.evaluationFromT) || !Number.isFinite(p.window.tradeStartT) || !Number.isFinite(p.window.endT) || p.window.tradeStartT - p.window.evaluationFromT !== (p.window.preH + stageH) * H || p.window.endT - p.window.tradeStartT !== p.window.runH * H)
    throw new Error("Invalid frozen session study windows");
  if (!p.feed?.sha256 || !p.actualSettings || !p.actualWf || !Array.isArray(p.source?.files) || !p.source.files.length || studySha256(studyExactJson(p.source.files)) !== p.source.sha256)
    throw new Error("Missing frozen session settings/feed/source seal");
  if (p.actualWf.preH !== p.window.preH || p.actualWf.simH !== p.window.runH)
    throw new Error("Frozen session walk-forward window differs from protocol window");
  const warmup = p.actualWf.processedWarmup;
  if (stageH ? !warmup || warmup.fromT !== p.window.tradeStartT - stageH * H || warmup.untilT !== p.window.tradeStartT ||
      warmup.baseCutT !== warmup.fromT || !p.actualWf.causalBase || !p.actualWf.processedStages : !!warmup)
    throw new Error("Frozen modeled-stage warmup differs from protocol boundaries or causal Base proof");
  if (p.source.scope === SESSION_STUDY_SOURCE_SCOPE &&
      studyExactJson(sessionStudySourceFiles(root)) !== studyExactJson(p.source.files))
    throw new Error("Session source changed after freeze: engine/shared inventory");
  if (p.source.scope !== undefined && p.source.scope !== SESSION_STUDY_SOURCE_SCOPE)
    throw new Error("Unsupported frozen session source scope");
  for (const f of p.source.files) {
    const file = resolve(root, f.path);
    if (!file.startsWith(root + sep) || studySha256(readFileSync(file)) !== f.sha256)
      throw new Error(`Session source changed after freeze: ${f.path}`);
  }
  return { protocol: p, protocolSha256: studySha256(bytes) };
}

/** Funding is separate from strategy settings; reject mismatched launcher defaults before expensive history work. */
export function validateFrozenSessionBook(book, account) {
  if (account && (book?.balance !== account.balance || book?.leverage !== account.leverage ||
      studyExactJson(book?.sizing) !== studyExactJson(account.sizing)))
    throw new Error("Report funding/sizing differs from the frozen study account; supply matching balance, leverage and sizing/pct flags");
}

/** Called before rt.start(): never score a patch that production normalization silently changed. */
export function validateFrozenSessionRuntime(rt, protocolPath, feedPath, evaluationFromT, cutT, root = defaultRoot) {
  const sealed = readSessionStudy(protocolPath, root), p = sealed.protocol;
  if (rt.status.computes !== 0) throw new Error("Study settings must be validated before compute");
  if (studyExactJson(rt.settings) !== studyExactJson(p.actualSettings)) throw new Error("Actual runtime settings differ from frozen session settings");
  if (studyExactJson(rt.wf) !== studyExactJson(p.actualWf)) throw new Error("Actual walk-forward options differ from frozen session options");
  if (rt.settings.symbols !== p.symbols.length || studyExactJson([...rt.settings.forceSymbols].sort()) !== studyExactJson([...p.symbols].sort())) throw new Error("Frozen session requires its exact symbol count and forceSymbols list");
  if (evaluationFromT !== p.window.evaluationFromT || cutT !== p.window.endT) throw new Error("Session time boundary differs from frozen protocol");
  if (p.liveSinceT !== undefined && rt.db?.kvGet("liveSince") !== p.liveSinceT) throw new Error("Paper Live evaluation boundary differs from frozen protocol");
  if (!feedPath || studySha256(readFileSync(feedPath)) !== p.feed.sha256) throw new Error("Session feed differs from frozen source bytes");
  return sealed;
}

/** Empty/losing results are valid evidence; incomplete universes and degraded runs are not. */
export function validateFrozenSessionResult(raw, protocolPath, root = defaultRoot) {
  if (raw.arraySidecars?.trades || raw.arraySidecars?.openEnd)
    throw new Error('Load execution sidecars before validating the frozen session; unloaded arrays are not empty evidence');
  const sealed = readSessionStudy(protocolPath, root), p = sealed.protocol;
  const expected = studyExactJson([...p.symbols].sort());
  if (studyExactJson([...(raw.symbols ?? [])].sort()) !== expected || studyExactJson([...(raw.engine?.universe ?? [])].sort()) !== expected)
    throw new Error("Completed study did not process the exact frozen symbol universe");
  if (raw.window?.startT !== p.window.tradeStartT || raw.window?.endT !== p.window.endT) throw new Error("Completed study execution window differs");
  if (studyExactJson(raw.processedStageProgress?.warmup ?? null) !== studyExactJson(p.actualWf.processedWarmup ?? null))
    throw new Error("Completed study omitted or changed its modeled-stage warmup");
  if (p.liveSinceT !== undefined && raw.settings?.live?.replaySinceT !== p.liveSinceT) throw new Error("Completed study omitted its frozen paper Live evaluation boundary");
  validateFrozenSessionBook(raw.settings?.book, p.account);
  const mem = raw.engine?.mem;
  if (!mem || (mem.computeLevel ?? 0) !== 0 || (mem.fallback ?? 0) !== 0 || (mem.aborts ?? 0) !== 0)
    throw new Error("Degraded or unrecorded memory coverage cannot certify a completed study");
  if (!raw.engine?.coverage) throw new Error("Study is missing its processing coverage evidence");
  for (const x of [...(raw.trades ?? []), ...(raw.openEnd ?? [])]) {
    if (!p.symbols.includes(x.sym) || x.entryT < p.window.tradeStartT || x.entryT > p.window.endT || (x.exitT !== undefined && x.exitT > p.window.endT))
      throw new Error("Study trade lies outside its frozen symbol/time scope");
  }
  raw.study = { id: p.id, protocolSha256: sealed.protocolSha256, feedSha256: p.feed.sha256, sourceSha256: p.source.sha256, sourceCheckpoint: p.source.checkpoint, symbols: p.symbols, window: p.window, scope: "Base-qualified engine execution and separately qualified exact-config Signals; combined funded account reported separately" };
  return raw.study;
}
