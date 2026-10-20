#!/usr/bin/env node
// Repeat the frozen default24h economics after the completed-flat-bar runtime.tick correction, without changing the original evidence.
// Infrastructure-only source bindings reuse the original runner's exact economic implementation.
// Seal only after both narrowly changed production source hashes are final:
//   node --expose-gc --max-old-space-size=512 --experimental-strip-types --no-warnings scripts/exit-validation-20261018-runtime-regression.mjs --seal --exit-source-sha SHA --runtime-source-sha SHA
//   node --expose-gc --max-old-space-size=512 --experimental-strip-types --no-warnings scripts/exit-validation-20261018-runtime-regression.mjs --run
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const originalStem = resolve(root, "docs/sims/exit-validation-20261017-default24h");
const stem = resolve(root, "docs/sims/exit-validation-20261018-runtime-regression");
const originalRunner = "scripts/exit-validation-20261017-default24h.mjs";
const wrapperPath = "scripts/exit-validation-20261018-runtime-regression.mjs";
const originalProtocolSha256 = "679862904ce7f5197a8ce9ce998dfb876f5162b3723bd128973b9f427fe896cf";
const originalResultGzipSha256 = "edd76f2185630a94addd0b92bfd77d03b5f6ba84f0400fdd84f9f123a2e036e8";
const previousProtocolPath = resolve(root, "docs/sims/exit-validation-20261017-cache-regression-protocol.json");
const previousProtocolSha256 = "57d220904b462fe4457068012e719eb61e48f82c3087742a3be7faa26fc36d34";
const derivedFromWrapper = "scripts/exit-validation-20261017-cache-regression.mjs";
const changedPaths = ["src/core/exit-strategy.ts", "src/core/server/runtime.server.ts"];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const originalBytes = readFileSync(`${originalStem}-protocol.json`);
assert.equal(hash(originalBytes), originalProtocolSha256, "unchanged original frozen protocol");
const original = JSON.parse(originalBytes);
const previousProtocolBytes = readFileSync(previousProtocolPath);
assert.equal(hash(previousProtocolBytes), previousProtocolSha256, "unchanged preceding final-source protocol");
const previousProtocol = JSON.parse(previousProtocolBytes);
const derivationSha256 = hash(readFileSync(resolve(root, derivedFromWrapper)));
assert.equal(derivationSha256, previousProtocol.sources.find((source) => source.path === derivedFromWrapper)?.sha256, "unchanged prior infrastructure wrapper");
const originalSource = readFileSync(resolve(root, originalRunner), "utf8");
assert.equal(hash(originalSource), original.sources.find((source) => source.path === originalRunner)?.sha256, "unchanged frozen economic runner");

function reboundSource() {
  let source = originalSource;
  const edits = [];
  const once = (from, to, purpose) => {
    assert.equal(source.split(from).length - 1, 1, `one exact infrastructure binding: ${purpose}`);
    source = source.replace(from, to);
    edits.push({ purpose, from, to });
  };
  once('const stem = resolve(root, `docs/sims/exit-validation-20261017-${attempt}`);', 'const stem = resolve(root, `docs/sims/exit-validation-20261018-${attempt}`);', "new dated output prefix");
  once('const runDir = resolve(root, `runs/exit-validation-20261017-${attempt}`);', 'const runDir = resolve(root, `runs/exit-validation-20261018-${attempt}`);', "new dated progress prefix");
  once('const attempt = "default24h";', 'const attempt = "runtime-regression";', "independent evidence/output prefix");
  once('const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");', 'const root = globalThis.__CTS_EXIT_RUNTIME_TICK_REGRESSION.root;', "repository root for source-loaded module");
  once('"scripts/exit-validation-20261017-default24h.mjs"];', '"scripts/exit-validation-20261017-default24h.mjs", "scripts/exit-validation-20261018-runtime-regression.mjs"];', "include regression wrapper in the new source snapshot");
  let imports = 0;
  source = source.replace(/import\("(\.\.\/src\/core\/[^"]+)"\)/g, (_match, path) => {
    imports++;
    return `import(globalThis.__CTS_EXIT_RUNTIME_TICK_REGRESSION.coreUrl(${JSON.stringify(path)}))`;
  });
  assert.equal(imports, 8, "only the original eight core module URL bindings change");
  return { source, edits, reboundCoreImports: imports, originalRunnerSha256: hash(originalSource), reboundRunnerSha256: hash(source) };
}

function sourceSnapshot() {
  return [...original.sources.map(({ path }) => path), wrapperPath].sort().map((path) => ({ path, sha256: hash(readFileSync(resolve(root, path))) }));
}

const bindings = reboundSource();
if (process.argv.includes("--seal")) {
  assert.ok(!existsSync(`${stem}-protocol.json`), "preserve existing regression attempt before sealing another");
  const allowed = new Map([
    [changedPaths[0], arg("--exit-source-sha")],
    [changedPaths[1], arg("--runtime-source-sha")],
  ]);
  for (const [path, expected] of allowed) {
    assert.match(expected ?? "", /^[a-f0-9]{64}$/, `explicit frozen final hash: ${path}`);
    assert.equal(hash(readFileSync(resolve(root, path))), expected, `frozen final source: ${path}`);
  }
  const sources = sourceSnapshot();
  const differences = [];
  for (const previous of original.sources) {
    const current = sources.find((source) => source.path === previous.path);
    if (current.sha256 === previous.sha256) continue;
    assert.equal(current.sha256, allowed.get(previous.path), `only the two named source corrections may differ: ${previous.path}`);
    differences.push({ path: previous.path, originalSha256: previous.sha256, finalSha256: current.sha256 });
  }
  assert.deepEqual(differences.map((source) => source.path).sort(), [...changedPaths].sort(), "exactly the declared source corrections are included");
  const sincePrevious = [];
  for (const previous of previousProtocol.sources.filter((source) => source.path.startsWith("src/core/"))) {
    const current = sources.find((source) => source.path === previous.path);
    assert.ok(current, `same production source inventory: ${previous.path}`);
    if (current.sha256 === previous.sha256) continue;
    assert.equal(previous.path, "src/core/server/runtime.server.ts", "only runtime source changes since the preceding checkpoint");
    sincePrevious.push({ path: previous.path, previousSha256: previous.sha256, finalSha256: current.sha256 });
  }
  assert.equal(sincePrevious.length, 1, "one new runtime.tick source correction");
  const feed = readFileSync(resolve(root, original.feed.path));
  assert.equal(hash(feed), original.feed.sha256, "identical original bounded public input");
  const snapshot = gzipSync(JSON.stringify(Object.fromEntries(changedPaths.map((path) => [path, readFileSync(resolve(root, path), "utf8")]))), { level: 9, mtime: 0 });
  const snapshotPath = "docs/sims/exit-validation-20261018-runtime-regression-changed-source.json.gz";
  writeFileSync(resolve(root, snapshotPath), snapshot);
  const protocol = {
    ...structuredClone(original),
    attempt: "runtime-regression",
    frozenAt: new Date().toISOString(),
    classification: "Runtime flat-bar correctness regression on the original reused retrospective24h window; not new or unseen alpha evidence",
    regression: {
      originalProtocolSha256, originalResultGzipSha256,
      previousFinalSourceProtocolSha256: previousProtocolSha256,
      wrapperDerivation: { path: derivedFromWrapper, sha256: derivationSha256, scope: "Same transparent infrastructure-only original-runner rebinding and exact economic comparison; new dated prefix and narrow runtime.tick checkpoint provenance" },
      sincePreviousFinalSourceDifferences: sincePrevious,
      purpose: "Verify exactly unchanged direct replay economics after completed-flat-bar runtime.tick correction; direct replay does not exercise runtime.tick, whose separate actual-tick regression establishes the fix",
      unchangedEconomics: ["settings", "pairs", "symbols", "tfs", "window", "feed", "wfPatch", "resourceBudget", "overrides"],
      sourceDifferences: differences,
      changedSourceSnapshot: { path: snapshotPath, bytes: snapshot.length, sha256: hash(snapshot) },
      runnerBindings: { ...bindings, source: undefined },
      ignoredResultMetadata: ["attempt", "classification", "chunkTimings", "completedAt", "protocolSha256", "elapsedMs", "maxRssMiB"],
    },
    sources,
  };
  for (const key of protocol.regression.unchangedEconomics) assert.deepEqual(protocol[key], original[key], `identical frozen economics: ${key}`);
  writeJson(`${stem}-protocol.json`, protocol);
  console.log(JSON.stringify({ sealed: `${stem}-protocol.json`, sha256: hash(readFileSync(`${stem}-protocol.json`)), differences }));
  process.exit(0);
}

if (!process.argv.includes("--run")) {
  console.log("Use --seal with both final source hashes after the runtime.tick fix freezes, then --run on GO. Existing sealed evidence remains unchanged.");
  process.exit(0);
}

try {
  const protocol = readJson(`${stem}-protocol.json`);
  assert.equal(protocol.regression.originalProtocolSha256, originalProtocolSha256);
  assert.deepEqual(sourceSnapshot(), protocol.sources, "final frozen source snapshot");
  const runnerBindings = { ...bindings, source: undefined };
  assert.deepEqual(JSON.parse(JSON.stringify(runnerBindings)), protocol.regression.runnerBindings, "identical infrastructure-only source rebinding");
  for (const key of protocol.regression.unchangedEconomics) assert.deepEqual(protocol[key], original[key], `identical frozen economics: ${key}`);
  const snapshot = readFileSync(resolve(root, protocol.regression.changedSourceSnapshot.path));
  assert.equal(hash(snapshot), protocol.regression.changedSourceSnapshot.sha256);
  const archived = JSON.parse(gunzipSync(snapshot));
  for (const [path, source] of Object.entries(archived)) assert.equal(source, readFileSync(resolve(root, path), "utf8"), `exact final changed-source archive: ${path}`);
  globalThis.__CTS_EXIT_RUNTIME_TICK_REGRESSION = { root, coreUrl: (path) => new URL(path, pathToFileURL(resolve(root, originalRunner))).href };
  try {
    await import(`data:text/javascript;base64,${Buffer.from(bindings.source).toString("base64")}`);
  } finally {
    delete globalThis.__CTS_EXIT_RUNTIME_TICK_REGRESSION;
  }
  const previousGzip = readFileSync(`${originalStem}-result.json.gz`);
  assert.equal(hash(previousGzip), originalResultGzipSha256, "unchanged original result gzip");
  const previous = JSON.parse(gunzipSync(previousGzip));
  const currentBytes = readFileSync(`${stem}-result.json`);
  const current = JSON.parse(currentBytes);
  const ignored = new Set(protocol.regression.ignoredResultMetadata);
  const economic = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => !ignored.has(key)));
  assert.deepEqual(economic(current), economic(previous), "every economic result exactly matches the original frozen24h replay");
  const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
  const previousEconomicSha256 = hash(JSON.stringify(canonical(economic(previous))));
  const currentEconomicSha256 = hash(JSON.stringify(canonical(economic(current))));
  assert.equal(currentEconomicSha256, previousEconomicSha256);
  const resultGzip = gzipSync(currentBytes, { level: 9, mtime: 0 });
  writeFileSync(`${stem}-result.json.gz`, resultGzip);
  assert.deepEqual(gunzipSync(resultGzip), currentBytes);
  const comparison = {
    schema: "cts-exit-runtime-tick-economic-regression-v1", status: "exact economic equality",
    originalProtocolSha256, previousFinalSourceProtocolSha256: previousProtocolSha256, currentProtocolSha256: hash(readFileSync(`${stem}-protocol.json`)),
    previousEconomicSha256, currentEconomicSha256, ignoredResultMetadata: [...ignored],
    settled: current.settled, endpointMarks: current.endpointMarks, markedCombinedDiagnostic: current.markedCombinedDiagnostic,
    sourceDifferences: protocol.regression.sourceDifferences,
    sincePreviousFinalSourceDifferences: protocol.regression.sincePreviousFinalSourceDifferences,
    resultGzipSha256: hash(resultGzip), resultJsonSha256: hash(currentBytes),
    maxRssMiBAfterComparison: process.resourceUsage().maxRSS / 1024,
  };
  assert.ok(comparison.maxRssMiBAfterComparison <= protocol.resourceBudget.maxRssMiB, "same explicit process RSS budget includes exact comparison");
  writeJson(`${stem}-comparison.json`, comparison);
  const report = [
    "# Completed-flat-bar runtime source regression", "",
    "This repeats the same reused retrospective24h sample under the final corrected source. It is a correctness regression, not new market-performance evidence. Original protocols, runners and results are preserved unchanged.", "",
    `**Every economic result matches exactly.** Canonical economic SHA-256: \`${currentEconomicSha256}\`. Comparison includes all settled trades, open marks, per-config evaluations, per-step checks, hourly/family returns, skips, and qualification diagnostics. Only the explicitly recorded timing/provenance fields are excluded.`, "",
    `The unchanged result remains **${current.settled.n} settled orders**, settled unit-return PF **${current.settled.exactPf.toFixed(3)}**. **${current.endpointMarks.n} open marks** reduce the endpoint-inclusive diagnostic to PF **${current.markedCombinedDiagnostic.exactPf.toFixed(6)}**, net **${current.markedCombinedDiagnostic.netReturnPoints.toFixed(3)} return points**. The endpoint-inclusive result is losing. This regression does not establish consistent profitability.`, "",
    "Settings, costs, gates, formulas,794 configured pairs, four symbols,72h indicator-only warmup,168h evaluated prehistory,24h trading, and unified default WF controls are identical to the original frozen replay. The exact same bounded public input is reused. Sixteen-pair fitting/build chunks still retain all qualified tapes for one unified WF.", "",
    "Exactly two cumulative source differences versus the original baseline are admitted: prior Exit cache/preset corrections and the current completed-flat-bar runtime.tick gate correction. Only runtime.server.ts changes since the preceding final-source checkpoint. Their exact final source is archived separately. This direct replay does not execute runtime.tick, runtime fit caching, continuous runtime fallback, or the saved-preset launch path; separate actual-path regressions establish those behaviors. This replay verifies unchanged direct economics under their imported source.", "",
    `Model runtime ${current.elapsedMs}ms; maximum RSS through comparison ${comparison.maxRssMiBAfterComparison.toFixed(1)}MiB. Frozen protocol SHA-256: \`${comparison.currentProtocolSha256}\`. Lossless result gzip SHA-256: \`${comparison.resultGzipSha256}\`.`, "",
    "Reproduce from the final source snapshot:", "", "```sh",
    "node --expose-gc --max-old-space-size=512 --experimental-strip-types --no-warnings scripts/exit-validation-20261018-runtime-regression.mjs --run",
    "```", "",
  ];
  writeFileSync(`${stem}.md`, report.join("\n"));
  console.log(JSON.stringify(comparison));
} catch (error) {
  writeJson(`${stem}-comparison-failure.json`, { status: "failed/incomplete; no economic equality claim", at: new Date().toISOString(), error: error.stack ?? String(error) });
  throw error;
}
