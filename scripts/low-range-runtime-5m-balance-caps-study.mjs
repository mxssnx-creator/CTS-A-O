#!/usr/bin/env node
// Post-hoc, balance-capped follow-up to the Oct 19 Low-Range 5m replay.
// Prepare only after the final economic source and its guard are committed.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { sessionStudySourceFiles, studyCanonical, studyExactJson, studySha256, readSessionStudy } from "./lib/session-study.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const mode = process.argv[2], out = resolve(arg("out", "runs/low-range-oct19-5m-balance-caps"));
const defaultParent = "runs/low-range-continuity-195-oct19-5m-20261027/protocol.json";
const originalProtocolSha256 = "6ee855cf2bebff9e0f353f135560148b9b2bccb633271fd53c010fe669c87be9";
const positionCap = 0.5, grossCap = 1;
// This is a protocol migration, not a general permission to accept new defaults.
const inactiveRelateMaxSl = 0.0075;

/** No in-flight, uncommitted economic source can become the frozen study. */
function requireCommittedSources(files) {
  const paths = ["src/core", "scripts/lib", "scripts/core-session.mjs", "package.json"];
  try {
    execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...paths], { cwd: root, stdio: "pipe" });
  } catch {
    throw new Error("Commit the complete economic source, including the source guard, before study preparation");
  }
  // git diff omits new untracked files. Check the exact sealed source list too.
  const sealed = new Set(files.map((file) => file.path));
  const changed = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "--no-renames", "--", ...paths],
    { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean).map((line) => line.slice(3));
  const unresolved = changed.filter((path) => sealed.has(path));
  if (unresolved.length) throw new Error(`Uncommitted sealed source files: ${unresolved.join(", ")}`);
}

function loadOriginal(path, expectedProtocolSha256 = originalProtocolSha256) {
  const bytes = readFileSync(path), p = JSON.parse(bytes), w = p.window;
  assert.equal(studySha256(bytes), expectedProtocolSha256, "original protocol bytes changed");
  assert.equal(p.schema, "cts-session-study-v1");
  assert.ok(Array.isArray(p.source?.files) && p.source.files.length > 0, "original source seal is missing");
  assert.equal(studySha256(studyExactJson(p.source.files)), p.source.sha256, "original source manifest is invalid");
  assert.equal(p.lane, 5);
  assert.equal(p.sourceCount, 195);
  assert.equal(p.symbols.length, 20);
  assert.equal(new Set(p.symbols).size, 20);
  assert.equal(w.indicatorStartT, Date.parse("2026-10-18T00:00:00Z"));
  assert.equal(w.evaluationFromT, Date.parse("2026-10-18T12:00:00Z"));
  assert.equal(w.tradeStartT, Date.parse("2026-10-19T00:00:00Z"));
  assert.equal(w.endT, Date.parse("2026-10-20T00:00:00Z"));
  assert.equal(w.warmH, 12); assert.equal(w.preH, 12); assert.equal(w.runH, 24);
  assert.equal(p.tacticMode, "off");
  assert.equal(p.actualSettings.grid.short.minTf, 5);
  assert.equal(p.actualSettings.cost, 0.0015);
  assert.equal(p.actualSettings.live.enabled, false);
  assert.equal(p.actualSettings.live.maxPositionX, 0);
  assert.equal(p.actualSettings.live.maxExposureX, 0);
  assert.equal(p.actualSettings.focus.length, 195);
  assert.equal(p.account.balance, 10); assert.equal(p.account.leverage, 10);
  const feedBytes = readFileSync(p.feed.path);
  assert.equal(studySha256(feedBytes), p.feed.sha256, "original feed bytes changed");
  const feed = JSON.parse(feedBytes), actualSymbols = feed.tickers.map((x) => x.sym).sort();
  assert.deepEqual(actualSymbols, [...p.symbols].sort());
  for (const sym of p.symbols) for (const tf of [1, 60]) {
    const bars = feed.candles[`${sym}|${tf}`] ?? [];
    assert.equal(bars.length, (w.warmH + w.preH + w.runH) * 60 / tf, `${sym}/${tf} length`);
    assert.ok(bars.every((bar, i) => bar.t === w.indicatorStartT + i * tf * 60_000), `${sym}/${tf} continuity`);
  }
  return { protocol: p, protocolSha256: studySha256(bytes), feedBytes };
}

/** Only these three settings differ; the report book uses realized balance, not marked equity. */
function cappedSettings(original) {
  const settings = structuredClone(original);
  settings.live = { ...settings.live, maxPositionX: positionCap, maxExposureX: grossCap, exposureScaler: true };
  return settings;
}

/**
 * Compare the entire original frozen object, permitting only the saved cap
 * patch plus a newly materialized maxSl default in *both* Relate objects.
 * Relate must be explicitly disabled on both sides of that migration. Older
 * protocols with no migration remain valid when their settings match exactly.
 */
function settingsCompatibility(parent, actualSettings, actualWf) {
  const expectedSettings = cappedSettings(parent.actualSettings);
  const expectedWf = structuredClone(parent.actualWf);
  const same = (a, b) => studyExactJson(a) === studyExactJson(b);
  if (same(actualSettings, expectedSettings) && same(actualWf, expectedWf)) return "exact";
  for (const [label, original, actual] of [["settings", expectedSettings, actualSettings], ["walk-forward", expectedWf, actualWf]]) {
    assert.equal(original.relate?.enabled, false, `original ${label} Relate must be explicitly disabled`);
    assert.equal(actual.relate?.enabled, false, `actual ${label} Relate must remain disabled`);
    assert.equal(Object.hasOwn(original.relate, "maxSl"), false, `original ${label} maxSl already exists`);
    assert.equal(actual.relate?.maxSl, inactiveRelateMaxSl, `actual ${label} maxSl is not the frozen inactive default`);
    original.relate.maxSl = inactiveRelateMaxSl;
  }
  assert.equal(studyExactJson(actualSettings), studyExactJson(expectedSettings), "normalization changed another original setting");
  assert.equal(studyExactJson(actualWf), studyExactJson(expectedWf), "normalization changed original walk-forward economics");
  return "inactive-relate-maxsl-default";
}

function verifySettingsCompatibility(parent, frozen) {
  const compatibility = settingsCompatibility(parent, frozen.actualSettings, frozen.actualWf);
  if (frozen.parent?.settingsCompatibility === undefined) {
    // Pre-migration protocols did not record this metadata and can only be
    // accepted on the old exact path, never on an unrecorded migration.
    assert.equal(compatibility, "exact", "inactive Relate migration was not recorded");
  } else assert.equal(frozen.parent.settingsCompatibility, compatibility, "recorded normalization compatibility differs");
  return compatibility;
}

/** Reject any unrecorded changes to the parent universe, data or funding. */
function verifyReplayContinuity(parent, frozen) {
  const same = (a, b, label) => assert.equal(studyExactJson(a), studyExactJson(b), `${label} differs from original`);
  for (const key of ["lane", "sourceCount", "symbols", "window", "tacticMode"]) same(frozen[key], parent[key], key);
  assert.equal(frozen.parent?.id, parent.id, "original study identity changed");
  assert.equal(frozen.parent?.sourceSha256, parent.source.sha256, "original source seal changed");
  assert.equal(frozen.parent?.feedSha256, parent.feed.sha256, "recorded original feed seal changed");
  assert.equal(frozen.feed?.sha256, parent.feed.sha256, "capped feed seal differs from original");
  assert.equal(frozen.feed?.parentSha256, parent.feed.sha256, "capped feed parent seal differs from original");
  const feedMetadata = feed => Object.fromEntries(Object.entries(feed).filter(([key]) => key !== "path" && key !== "parentSha256"));
  same(feedMetadata(frozen.feed), feedMetadata(parent.feed), "feed metadata");
  same(frozen.account, { ...parent.account, maxPositionX: positionCap, maxExposureX: grossCap,
    capBasis: "realized balance", perPositionKey: "symbol × side", exposureBasis: "gross long plus short notional" }, "account");
  return verifySettingsCompatibility(parent, frozen);
}

function verifyReplayFeed(parent, frozen) {
  assert.equal(studySha256(readFileSync(frozen.feed.path)), parent.feed.sha256, "capped feed bytes changed");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
if (mode === "prepare") {
  if (existsSync(`${out}/protocol.json`)) throw new Error("Use a fresh output directory");
  const parentPath = resolve(arg("parent", defaultParent));
  const { protocol: parent, protocolSha256, feedBytes } = loadOriginal(parentPath);
  const files = sessionStudySourceFiles(root);
  requireCommittedSources(files);
  const expected = cappedSettings(parent.actualSettings), w = parent.window;
  const make = () => {
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 20, signals: { enabled: false } },
      { market: "bingx", replay: true, priceStream: null, evaluationFromT: w.evaluationFromT, replayPreloadAll: true,
        feed: { history: async () => [], klines: async () => [], tickers: async () => [] } });
    rt.updateSettings(expected); rt.updateSettings({ symbols: 20 });
    rt.updateSettings({}, { ...parent.actualWf, preH: w.preH, simH: w.runH, causalBase: true, recordValidation: true });
    rt.wf = { ...rt.wf, longH: parent.actualWf.longH };
    return rt;
  };
  const rt = make();
  const actualSettings = studyCanonical(rt.settings), actualWf = studyCanonical(rt.wf);
  rt.dispose();
  const compatibility = settingsCompatibility(parent, actualSettings, actualWf);
  assert.equal(actualSettings.live.maxPositionX, positionCap);
  assert.equal(actualSettings.live.maxExposureX, grossCap);
  assert.equal(actualSettings.live.exposureScaler, true);
  mkdirSync(out, { recursive: true });
  const feedPath = `${out}/feed.json`;
  writeFileSync(feedPath, feedBytes, { flag: "wx" });
  const protocol = {
    schema: "cts-session-study-v1", id: "low-range-20-symbol-5m-24h-balance-caps-posthoc", symbols: parent.symbols,
    lane: 5, sourceCount: parent.sourceCount, window: w,
    feed: { ...parent.feed, path: feedPath, sha256: studySha256(feedBytes), parentSha256: parent.feed.sha256 },
    source: { checkpoint: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      files, sha256: studySha256(studyExactJson(files)) },
    parent: { protocolPath: parentPath, protocolSha256, sourceSha256: parent.source.sha256, settingsCompatibility: compatibility,
      id: parent.id, feedSha256: parent.feed.sha256, note: "Original uncapped result is retained separately." },
    actualSettings, actualWf, tacticMode: parent.tacticMode,
    account: { ...parent.account, maxPositionX: positionCap, maxExposureX: grossCap,
      capBasis: "realized balance", perPositionKey: "symbol × side", exposureBasis: "gross long plus short notional" },
    policy: "Post-hoc offline comparison with original 5m 20-symbol window, signals, gates, costs, protections and account sizing preserved. Only the balance-relative position and gross allocation caps differ economically. When recorded, the inactive Relate maxSl default is an explicitly checked schema-only normalization. Capped allocation changes funded membership and possibly PF; this is not an independent holdout or venue execution. Margin feasibility remains an output, not an assumption.",
    harnessSha256: studySha256(readFileSync(new URL(import.meta.url))),
  };
  verifyReplayContinuity(parent, protocol);
  writeFileSync(`${out}/desk.json`, JSON.stringify({ settings: actualSettings, wf: actualWf }, null, 2), { flag: "wx" });
  writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ status: "prepared", symbols: protocol.symbols.length, sourceSha256: protocol.source.sha256,
    parentProtocolSha256: protocol.parent.protocolSha256, account: protocol.account, window: w }));
} else if (mode === "run") {
  const { protocol: p } = readSessionStudy(`${out}/protocol.json`, root);
  if (p.harnessSha256 !== studySha256(readFileSync(new URL(import.meta.url)))) throw new Error("Study harness changed after freeze");
  if (existsSync(`${out}/raw.json`)) throw new Error("Measured output already exists");
  const { protocol: parent, protocolSha256 } = loadOriginal(p.parent.protocolPath);
  assert.equal(protocolSha256, p.parent.protocolSha256, "original protocol changed after freeze");
  verifyReplayContinuity(parent, p);
  verifyReplayFeed(parent, p);
  assert.equal(p.account.capBasis, "realized balance");
  assert.equal(p.account.maxPositionX, positionCap); assert.equal(p.account.maxExposureX, grossCap);
  assert.equal(p.actualSettings.live.maxPositionX, positionCap);
  assert.equal(p.actualSettings.live.maxExposureX, grossCap);
  assert.equal(p.actualSettings.live.exposureScaler, true);
  const w = p.window;
  const args = ["--expose-gc", "--max-old-space-size=3072", "--experimental-strip-types", "--no-warnings",
    "scripts/core-session.mjs", "--feed", p.feed.path, "--desk", `${out}/desk.json`, "--symbols", "20",
    "--pre", String(w.preH), "--run", String(w.runH), "--end-at", new Date(w.endT).toISOString(),
    "--evaluation-from", new Date(w.evaluationFromT).toISOString(), "--selection-hours", String(w.preH),
    "--replay-preload-all", "--signals", "off", "--tactics", p.tacticMode, "--balance", String(p.account.balance),
    "--leverage", String(p.account.leverage), "--pct", String(p.account.sizing.pct),
    "--frozen-session", `${out}/protocol.json`, "--chunk-allocations", "--tape-trades-all", "--dump", `${out}/raw.json`,
    "--out", `${out}/session`, "--html", `${out}/report`, "--quiet", "true"];
  writeFileSync(`${out}/command.json`, JSON.stringify({ executable: process.execPath, args }, null, 2), { flag: "wx" });
  const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit",
    env: { ...process.env, CTS_CORE_VARIANTS: "0", CTS_CORE_WORKERS: "1", CTS_CORE_COMPARE: "0" } });
  process.exitCode = await new Promise((done) => { child.on("error", () => done(1)); child.on("exit", (code) => done(code ?? 1)); });
} else if (mode === "verify") {
  const { protocol: p } = readSessionStudy(`${out}/protocol.json`, root);
  const report = JSON.parse(readFileSync(`${out}/session.json`));
  assert.equal(p.harnessSha256, studySha256(readFileSync(new URL(import.meta.url))), "study harness changed after freeze");
  const { protocol: parent, protocolSha256 } = loadOriginal(p.parent.protocolPath);
  assert.equal(protocolSha256, p.parent.protocolSha256, "original protocol changed after freeze");
  verifyReplayContinuity(parent, p);
  verifyReplayFeed(parent, p);
  assert.equal(report.study?.protocolSha256, studySha256(readFileSync(`${out}/protocol.json`)));
  for (const settings of [p.actualSettings.live, report.settings?.effective?.live, report.settings?.live]) {
    assert.equal(settings?.maxPositionX, positionCap, "position cap missing from recorded settings");
    assert.equal(settings?.maxExposureX, grossCap, "gross cap missing from recorded settings");
    assert.equal(settings?.exposureScaler, true, "exposure scaler not explicitly enabled");
  }
  assert.equal(report.total?.caps?.on, true);
  assert.equal(report.total.caps.maxPositionX, positionCap);
  assert.equal(report.total.caps.maxExposureX, grossCap);
  assert.equal(report.total.caps.source, "dump (settings.live)");
  assert.ok(Number.isFinite(report.total?.marginOver?.minutes), "margin feasibility evidence unavailable");
  assert.ok(Number.isFinite(report.total?.unknownAllocations) && report.total.unknownAllocations === 0,
    "unknown funded allocations cannot certify the result");
  console.log(JSON.stringify({ status: "verified", protocol: p.id, capSource: report.total.caps.source,
    maxPositionX: report.total.caps.maxPositionX, maxExposureX: report.total.caps.maxExposureX,
    capBasis: p.account.capBasis, scaled: report.total.caps.scaled, zeroAllocated: report.total.caps.capped,
    fundedSettled: report.total.fundedOrders, modeledReturnPf: report.total.pfR ?? null,
    marginOverMinutes: report.total.marginOver.minutes,
    feasibility: report.total.marginOver.minutes > 0 ? "infeasible" : "no margin exceedance observed" }));
} else throw new Error("Usage: low-range-runtime-5m-balance-caps-study.mjs prepare|run|verify [--parent ORIGINAL_PROTOCOL] [--out FRESH_DIR]");
}

export { cappedSettings, loadOriginal, requireCommittedSources, settingsCompatibility, verifySettingsCompatibility, verifyReplayContinuity, verifyReplayFeed };
