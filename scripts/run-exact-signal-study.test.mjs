import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { FEED_SHA256, SYMBOLS, studyCase, sessionArguments, assertProtocolPair, assertSelectionConclusion, assertEconomicSource, foldDesk, studyExecutionEnvironment } from "./run-exact-signal-study.mjs";

test("research disables both optional report variants and background preset comparisons regardless of parent environment", () => {
  const env = studyExecutionEnvironment({ CTS_CORE_COMPARE: "1", CTS_CORE_VARIANTS: "1", CTS_CORE_AUTOSTART: "1", CTS_CORE_WORKERS: "32", PRESERVED: "yes" });
  assert.equal(env.CTS_CORE_COMPARE, "0"); assert.equal(env.CTS_CORE_VARIANTS, "0"); assert.equal(env.CTS_CORE_AUTOSTART, "0");
  assert.equal(env.CTS_CORE_WORKERS, "4"); assert.equal(env.PRESERVED, "yes"); assert.equal(env.CTS_CORE_LIVE, "0");
});

test("fixed chronological folds preserve20/22symbols and six evaluated prehistory hours", () => {
  for (const id of ["baseline20", "corrected20", "dev20-entry5", "dev20-entry15", "selection22", "final22"]) {
    const x = studyCase(id);
    assert.equal(x.symbols.length, x.count);
    assert.equal(Date.parse(x.start) - Date.parse(x.evaluationFrom), 6 * 3_600_000);
    assert.equal(Date.parse(x.end) - Date.parse(x.start), x.runH * 3_600_000);
  }
  assert.deepEqual(studyCase("baseline20").symbols, SYMBOLS.slice(0, 20));
  assert.ok(Date.parse(studyCase("selection22").end) < Date.parse(studyCase("final22").evaluationFrom));
  assert.throws(() => studyCase("injected-case"));
});
test("24h folds cannot inherit the development desk's6h simulation, and entry research preserves other gates", () => {
  const original = { settings: { gates: { minPf: 1.1 }, grid: { micro: true } }, wf: { preH: 6, longH: 6, simH: 6, lastN: 0, lastNMinPf: 1.1, validLastN: 15, liveLastN: 25 } };
  const selection = foldDesk(original, studyCase("selection22"));
  assert.equal(selection.wf.simH, 24); assert.equal(selection.wf.recordValidation, true); assert.equal(original.wf.simH, 6);
  for (const n of [5, 15]) {
    const x = foldDesk(original, studyCase(`dev20-entry${n}`));
    assert.deepEqual(x.settings, original.settings); assert.equal(x.wf.validLastN, 15); assert.equal(x.wf.liveLastN, 25);
    assert.equal(x.wf.lastN, n); assert.equal(x.wf.lastNMinPf, 1.2); assert.equal(x.wf.simH, 6);
  }
});
test("simulation keeps exact source bounds/account and full progress while splitting report memory", () => {
  const x = studyCase("selection22"), args = sessionArguments(x, { feed: "feed", desk: "desk", protocol: "protocol", evidence: "evidence" });
  const value = (k) => args[args.indexOf(k) + 1];
  for (const [key, wanted] of [["--symbols", "22"], ["--pre", "6"], ["--run", "24"], ["--selection-hours", "6"], ["--balance", "10"], ["--pct", "0.001"], ["--leverage", "10"], ["--live-since", x.start]]) assert.equal(value(key), wanted);
  for (const flag of ["--signal-progress", "--dump-only", "--tape-trades", "--frozen-session"]) assert.ok(args.includes(flag));
  assert.ok(!args.includes("--all-on") && !args.includes("--lookahead"));
});
test("development arms reject even one changed range, gate or walk-forward setting", () => {
  const p = { actualSettings: { cost: 0.0015, signals: { count: 0 }, live: { enabled: false, maxPositions: 100 }, grid: { micro: { tp: [1, 2], sl: [1] } } }, actualWf: { preH: 6, longH: 6, causalBase: true, lastN: 25 }, symbols: ["BTC-USDT"], window: {}, account: {}, feed: {} };
  assert.equal(assertProtocolPair(p, structuredClone(p)), true);
  for (const change of [(x) => x.actualSettings.grid.micro.tp.pop(), (x) => x.actualWf.lastN--, (x) => x.actualSettings.signals.count = 1]) {
    const other = structuredClone(p); change(other); assert.throws(() => assertProtocolPair(p, other));
  }
});
test("final window remains locked until exact matching selection conclusion exists", () => {
  const fold = studyCase("selection22"), a = { purpose: "selection", checksOk: true, pruning: { assessmentAllowed: true }, window: { startT: Date.parse(fold.start), endT: Date.parse(fold.end), symbols: fold.symbols }, provenance: { study: { feedSha256: FEED_SHA256, sourceSha256: "source" } } };
  assert.equal(assertSelectionConclusion(a, "source"), true);
  for (const mutate of [(x) => x.checksOk = false, (x) => x.pruning.assessmentAllowed = false, (x) => x.window.symbols.pop(), (x) => x.purpose = "final"]) { const b = structuredClone(a); mutate(b); assert.throws(() => assertSelectionConclusion(b, "source")); }
  assert.throws(() => assertSelectionConclusion(a, "changed-economic-source"));
});
test("economic source proof rejects drift and unsealed new files", () => {
  const root = mkdtempSync(join(tmpdir(), "cts-exact-source-"));
  try {
    mkdirSync(join(root, "src/core"), { recursive: true }); writeFileSync(join(root, "src/core/strategy.ts"), "frozen");
    const manifest = { files: [{ path: "src/core/strategy.ts", correctedSha256: createHash("sha256").update("frozen").digest("hex"), baselineSha256: null }] };
    assertEconomicSource(root, manifest, "corrected");
    writeFileSync(join(root, "src/core/strategy.ts"), "changed"); assert.throws(() => assertEconomicSource(root, manifest, "corrected"));
    writeFileSync(join(root, "src/core/strategy.ts"), "frozen"); writeFileSync(join(root, "src/core/unsealed.ts"), "new"); assert.throws(() => assertEconomicSource(root, manifest, "corrected"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
