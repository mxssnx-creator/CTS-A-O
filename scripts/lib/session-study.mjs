import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const H = 3_600_000;
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
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

/** The requested research window must agree with the normalized runtime before any compute can start. */
export function validateFrozenSessionTiming(p) {
  const expected = { preH: p.window?.preH, simH: p.window?.runH, longH: p.window?.preH };
  if (Object.entries(expected).some(([key, value]) => !Number.isFinite(value) || value <= 0 || p.actualWf?.[key] !== value))
    throw new Error("Frozen session walk-forward timing differs from its declared window");
}

/** Seal economic source and the common report instrumentation separately for each arm. */
export function sessionStudySourceFiles(root = defaultRoot) {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(resolve(dir, e.name)) : /\.(?:ts|tsx|mjs|cjs)$/.test(e.name) && !/\.test\.[^.]+$/.test(e.name) && e.name !== "test-support.ts" ? [resolve(dir, e.name)] : []);
  return [...walk(resolve(root, "src/core")), ...walk(resolve(root, "scripts/lib")), resolve(root, "scripts/core-session.mjs"), resolve(root, "package.json")].sort().map((file) => ({ path: relative(root, file), sha256: studySha256(readFileSync(file)) }));
}

export function readSessionStudy(protocolPath, root = defaultRoot) {
  const bytes = readFileSync(protocolPath), p = JSON.parse(bytes);
  if (p.schema !== "cts-session-study-v1" || !p.id || !Array.isArray(p.symbols) || !p.symbols.length || new Set(p.symbols).size !== p.symbols.length)
    throw new Error("Invalid frozen session study identity/symbols");
  if (!p.window || !Number.isFinite(p.window.evaluationFromT) || !Number.isFinite(p.window.tradeStartT) || !Number.isFinite(p.window.endT) || p.window.tradeStartT - p.window.evaluationFromT !== p.window.preH * H || p.window.endT - p.window.tradeStartT !== p.window.runH * H)
    throw new Error("Invalid frozen session study windows");
  validateFrozenSessionTiming(p);
  if (!p.feed?.sha256 || !p.actualSettings || !p.actualWf || !Array.isArray(p.source?.files) || !p.source.files.length || studySha256(studyExactJson(p.source.files)) !== p.source.sha256)
    throw new Error("Missing frozen session settings/feed/source seal");
  for (const f of p.source.files) {
    const file = resolve(root, f.path);
    if (!file.startsWith(root + sep) || studySha256(readFileSync(file)) !== f.sha256)
      throw new Error(`Session source changed after freeze: ${f.path}`);
  }
  return { protocol: p, protocolSha256: studySha256(bytes) };
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
  const sealed = readSessionStudy(protocolPath, root), p = sealed.protocol;
  const expected = studyExactJson([...p.symbols].sort());
  if (studyExactJson([...(raw.symbols ?? [])].sort()) !== expected || studyExactJson([...(raw.engine?.universe ?? [])].sort()) !== expected)
    throw new Error("Completed study did not process the exact frozen symbol universe");
  if (raw.window?.startT !== p.window.tradeStartT || raw.window?.endT !== p.window.endT) throw new Error("Completed study execution window differs");
  if (p.liveSinceT !== undefined && raw.settings?.live?.replaySinceT !== p.liveSinceT) throw new Error("Completed study omitted its frozen paper Live evaluation boundary");
  if (p.account && (raw.settings?.book?.balance !== p.account.balance || raw.settings?.book?.leverage !== p.account.leverage || studyExactJson(raw.settings?.book?.sizing) !== studyExactJson(p.account.sizing)))
    throw new Error("Report funding/sizing differs from the frozen study account");
  const mem = raw.engine?.mem;
  if (!mem || !['computeLevel', 'fallback', 'aborts'].every((k) => mem[k] === 0))
    throw new Error("Degraded or unrecorded memory coverage cannot certify a completed study");
  const coverage = raw.engine?.coverage;
  if (!coverage || !Number.isFinite(coverage.expectedCombos) || coverage.expectedCombos <= 0 || coverage.evaluated !== coverage.expectedCombos)
    throw new Error("Study is missing complete processing coverage evidence");
  for (const x of [...(raw.trades ?? []), ...(raw.openEnd ?? [])]) {
    if (!p.symbols.includes(x.sym) || x.entryT < p.window.tradeStartT || x.entryT > p.window.endT || (x.exitT !== undefined && x.exitT > p.window.endT))
      throw new Error("Study trade lies outside its frozen symbol/time scope");
  }
  raw.study = { id: p.id, protocolSha256: sealed.protocolSha256, feedSha256: p.feed.sha256, sourceSha256: p.source.sha256, sourceCheckpoint: p.source.checkpoint, symbols: p.symbols, window: p.window, scope: "Base-qualified engine execution and separately qualified exact-config Signals; combined funded account reported separately" };
  return raw.study;
}
