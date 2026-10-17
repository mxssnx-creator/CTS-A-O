import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { waitForSessionHeadroom, runSessionChild, reserveSessionAttempt, frozenSessionInvocation,
  assertSessionCompletion, verifySessionAttempt, runFrozenSessions, frozenSessionMain } from "./run-frozen-session.mjs";
import { studyExactJson, validateFrozenSessionResult } from "./lib/session-study.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const H = 3_600_000;
const sha = (x) => createHash("sha256").update(x).digest("hex");
function temp(t) {
  const dir = mkdtempSync(join(tmpdir(), "cts-frozen-launcher-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function fixture(t) {
  const root = temp(t), job = join(root, "job");
  for (const dir of ["scripts/lib", "job"]) mkdirSync(join(root, dir), { recursive: true });
  for (const name of ["scripts/lib/session-study.mjs", "scripts/lib/core-test-offline-guard.cjs", "scripts/audit-session-study.mjs"])
    copyFileSync(join(ROOT, name), join(root, name));
  writeFileSync(join(root, "strategy.ts"), "// synthetic fixture only\n");
  writeFileSync(join(root, "feed.json"), "fixture bytes, not a market feed");
  const files = [{ path: "strategy.ts", sha256: sha(readFileSync(join(root, "strategy.ts"))) }];
  const account = { balance: 10, leverage: 10, sizing: { mode: "equityPct", pct: .001 } };
  const actualSettings = { symbols: 1, forceSymbols: ["A-USDT"], cost: .0015,
    live: { enabled: false, maxPositionX: .75, maxExposureX: 7 }, signals: { enabled: true }, grid: { baseRanges: true, allSets: false } };
  const actualWf = { preH: 6, simH: 6, longH: 6, causalBase: true };
  const protocol = { schema: "cts-session-study-v1", id: "synthetic-launch-fixture", symbols: ["A-USDT"],
    window: { evaluationFromT: 0, tradeStartT: 6 * H, endT: 12 * H, preH: 6, runH: 6 }, liveSinceT: 6 * H,
    source: { files, sha256: sha(studyExactJson(files)), checkpoint: "fixture" },
    feed: { path: join(root, "feed.json"), sha256: sha(readFileSync(join(root, "feed.json"))) }, actualSettings, actualWf, account };
  writeFileSync(join(job, "protocol.json"), JSON.stringify(protocol));
  writeFileSync(join(job, "desk.json"), JSON.stringify({ settings: actualSettings, wf: actualWf }));
  const raw = { symbols: protocol.symbols, window: { startT: 6 * H, endT: 12 * H }, trades: [], openEnd: [], basePairs: [],
    settings: { book: account, cost: .0015, live: { replaySinceT: 6 * H, maxPositionX: .75, maxExposureX: 7 } },
    engine: { universe: protocol.symbols, computes: 1, mem: { computeLevel: 0, fallback: 0, aborts: 0 },
      coverage: { expectedCombos: 1, evaluated: 1 }, paperSelectionAfterCompute: { complete: true } } };
  validateFrozenSessionResult(raw, join(job, "protocol.json"), root);
  const report = { symbols: protocol.symbols, window: raw.window, study: raw.study, sizedOrders: [],
    checksOk: true, checks: [{ name: "synthetic fixture consistency", ok: true }],
    total: { caps: { on: true, maxPositionX: .75, maxExposureX: 7 }, fundedOrders: 0, gpR: 0, glR: 0, net: 0 },
    hours: Array.from({ length: 6 }, (_, i) => ({ t: (6 + i) * H })) };
  return { root, job, protocol, raw, report };
}
function outputFixture(attempt, raw, report) {
  mkdirSync(join(attempt, "html"), { recursive: true });
  writeFileSync(join(attempt, "raw.json"), JSON.stringify(raw));
  writeFileSync(join(attempt, "html/data.json"), JSON.stringify(report));
}

test("headroom must remain known and sufficient for three separated samples, with timeout and cancellation", async () => {
  const readings = [4000, 4000, 3400, null, 4000, 4000, 4000], seen = [];
  let clock = 0;
  const result = await waitForSessionHeadroom({ available: () => readings.shift(), onStatus: (x) => seen.push(x.stable),
    pollMs: 1, timeoutMs: 100, now: () => clock, sleep: async (ms) => { clock += ms; } });
  assert.deepEqual(seen, [1, 2, 0, 0, 1, 2, 3]); assert.equal(result.waitedMs, 6);
  clock = 0;
  await assert.rejects(waitForSessionHeadroom({ available: () => 3499, pollMs: 1, timeoutMs: 3,
    now: () => clock, sleep: async (ms) => { clock += ms; } }), /admission deadline/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(waitForSessionHeadroom({ signal: controller.signal }), { code: "CTS_SESSION_CANCELLED" });
  await assert.rejects(waitForSessionHeadroom({ minFreeMb: 1 }), /3500 MB/);
});

test("child success preserves its immutable log and clears its monitor", async (t) => {
  const dir = temp(t), logPath = join(dir, "child.log");
  let polls = 0;
  const result = await runSessionChild({ logPath, args: ["-e", "console.log('fixture success')"],
    deadlineMs: 3000, graceMs: 50, pollMs: 10, monitor: () => { polls++; } });
  assert.equal(result.code, 0); assert.equal(result.failure, null);
  assert.match(readFileSync(logPath, "utf8"), /fixture success/);
  const before = polls;
  await new Promise((r) => setTimeout(r, 30)); assert.equal(polls, before, "completed child's polling stops");
  await assert.rejects(runSessionChild({ logPath }), { code: "EEXIST" });
  assert.match(readFileSync(logPath, "utf8"), /fixture success/);
});

test("an active child has a hard deadline even when no compute finishes", async (t) => {
  const dir = temp(t), started = Date.now();
  const result = await runSessionChild({ logPath: join(dir, "deadline.log"), args: ["-e", "setInterval(()=>{},1000)"],
    deadlineMs: 150, graceMs: 50, pollMs: 10 });
  assert.equal(result.failure.kind, "deadline"); assert.ok(Date.now() - started < 4000);
});

test("cancellation escalates SIGINT to SIGKILL for a child that ignores interruption", async (t) => {
  const dir = temp(t), logPath = join(dir, "cancel.log"), controller = new AbortController();
  const result = await runSessionChild({ logPath, signal: controller.signal,
    args: ["-e", "process.on('SIGINT',()=>{});console.log('READY');setInterval(()=>{},1000)"],
    deadlineMs: 4000, graceMs: 50, pollMs: 10,
    monitor: () => { if (readFileSync(logPath, "utf8").includes("READY")) controller.abort(); } });
  assert.equal(result.failure.kind, "cancelled"); assert.equal(result.forcedKill, true); assert.equal(result.signal, "SIGKILL");
});

test("spawn and monitor failures terminate cleanly and retain their original reason", async (t) => {
  const dir = temp(t);
  const missing = await runSessionChild({ command: join(dir, "missing-command"), logPath: join(dir, "spawn.log"),
    deadlineMs: 1000, graceMs: 50, pollMs: 10 });
  assert.equal(missing.failure.kind, "spawn-error");
  const monitored = await runSessionChild({ logPath: join(dir, "monitor.log"), args: ["-e", "setInterval(()=>{},1000)"],
    deadlineMs: 2000, graceMs: 50, pollMs: 10, monitor: () => { throw new Error("fixture monitor failure"); } });
  assert.equal(monitored.failure.kind, "monitor-error"); assert.equal(monitored.failure.message, "fixture monitor failure");
  rmSync(join(dir, "spawn.log")); rmSync(join(dir, "monitor.log"));
});

test("attempts never replace existing job results even at the same timestamp", (t) => {
  const dir = temp(t), at = new Date("2026-10-18T00:00:00Z");
  const first = reserveSessionAttempt(dir, at); writeFileSync(join(first, "run.log"), "older evidence");
  const second = reserveSessionAttempt(dir, at); assert.notEqual(first, second);
  assert.equal(readFileSync(join(first, "run.log"), "utf8"), "older evidence");
});

test("frozen invocation retains economics, forces one guarded offline worker and drops inherited runtime overrides", (t) => {
  const { root, job, protocol } = fixture(t);
  const invocation = frozenSessionInvocation(root, job, protocol, { NODE_OPTIONS: "--inspect", NODE_TEST_CONTEXT: "child-v8",
    CTS_CORE_FAMILY: "narrowed", CTS_CORE_SYNTHETIC: "1", CTS_CORE_WORKERS: "9", BINGX_API_KEY: "fixture-only" });
  assert.equal(invocation.env.CTS_CORE_WORKERS, "1"); assert.equal(invocation.env.CTS_CORE_MEM_HARD_MB, "1200");
  assert.equal(invocation.env.BINGX_API_KEY, undefined); assert.equal(invocation.env.CTS_CORE_FAMILY, undefined);
  assert.equal(invocation.env.CTS_CORE_SYNTHETIC, undefined); assert.equal(invocation.env.NODE_TEST_CONTEXT, undefined);
  assert.match(invocation.env.NODE_OPTIONS, /core-test-offline-guard.cjs/);
  assert.equal(invocation.args[invocation.args.indexOf("--pct") + 1], "0.001");
  assert.ok(invocation.args.includes("--signal-progress")); assert.ok(invocation.args.includes(join(job, "protocol.json")));
});

test("completion requires explicit full memory/compute/universe/report/hourly evidence", (t) => {
  const { raw, report, protocol } = fixture(t);
  assert.doesNotThrow(() => assertSessionCompletion(raw, report, protocol));
  const missing = structuredClone(raw); delete missing.engine.mem.aborts;
  assert.throws(() => assertSessionCompletion(missing, report, protocol), /unknown/);
  const partial = structuredClone(raw); partial.engine.coverage.evaluated = 0;
  assert.throws(() => assertSessionCompletion(partial, report, protocol), /combo coverage/);
  assert.throws(() => assertSessionCompletion(raw, { ...report, checksOk: false }, protocol), /consistency/);
  assert.throws(() => assertSessionCompletion(raw, { ...report, hours: [] }, protocol), /Hourly/);
});

test("independent audit and frozen result validation both gate completion; empty evidence is retained honestly", async (t) => {
  const { root, job, raw, report } = fixture(t);
  outputFixture(job, raw, report);
  const evidence = await verifySessionAttempt(root, job);
  assert.equal(evidence.fullFrozenCoverage, true); assert.equal(evidence.independentAudit, true);
  assert.equal(evidence.fundedCloses, 0); assert.equal(evidence.unitPf, null); assert.equal(evidence.strategyPromotion, false);
  assert.equal(JSON.parse(readFileSync(join(job, "audit.json"))).checksOk, true);
});

test("a zero child exit cannot complete a job without verified output, and failed attempts/locks remain correct", async (t) => {
  const { root, job } = fixture(t), statusFile = join(root, "status.json");
  const child = (options) => runSessionChild({ ...options, args: ["-e", "console.log('zero exit, no market evidence')"] });
  await assert.rejects(runFrozenSessions({ root, jobs: [job], statusFile }, { admit: async () => {}, child }), /raw.json/);
  const status = JSON.parse(readFileSync(statusFile));
  assert.equal(status.state, "failed"); assert.equal(status.child.code, 0);
  assert.equal(JSON.parse(readFileSync(join(status.attempt, "outcome.json"))).state, "failed");
  assert.match(readFileSync(join(status.attempt, "run.log"), "utf8"), /no market evidence/);
  assert.equal(existsSync(join(root, "runs/frozen-session-launcher.lock")), false);
});

test("job execution is serial and retries preserve earlier complete attempt files", async (t) => {
  const { root, job } = fixture(t), statusFile = join(root, "status.json");
  const events = [], controls = { admit: async () => { events.push("admit"); },
    child: async (options) => { events.push("child"); writeFileSync(options.logPath, "small injected child fixture", { flag: "wx" }); return { code: 0 }; },
    verify: async () => { events.push("verify"); return { fullFrozenCoverage: true, independentAudit: true }; } };
  const results = await runFrozenSessions({ root, jobs: [job, job], statusFile }, controls);
  assert.deepEqual(events, ["admit", "child", "verify", "admit", "child", "verify"]);
  assert.notEqual(results[0].attempt, results[1].attempt); assert.equal(readdirSync(join(job, "attempts")).length, 2);
  for (const result of results) assert.equal(JSON.parse(readFileSync(join(result.attempt, "outcome.json"))).state, "complete");
  assert.equal(JSON.parse(readFileSync(statusFile)).state, "complete");
});

test("resource admission expires with a terminal resource-blocked result and never starts a child", async (t) => {
  const { root, job } = fixture(t), statusFile = join(root, "status.json");
  let started = false;
  await assert.rejects(runFrozenSessions({ root, jobs: [job], statusFile, waitMs: 3 }, {
    admit: (options) => waitForSessionHeadroom({ ...options, available: () => 500, pollMs: 1 }),
    child: async () => { started = true; throw new Error("child must not start"); },
  }), { code: "CTS_SESSION_RESOURCE_BLOCKED" });
  const status = JSON.parse(readFileSync(statusFile));
  assert.equal(status.state, "failed"); assert.equal(status.resourceBlocked, true); assert.equal(started, false);
  assert.equal(JSON.parse(readFileSync(join(status.attempt, "outcome.json"))).resourceBlocked, true);
  assert.equal(existsSync(join(root, "runs/frozen-session-launcher.lock")), false);
});

test("bad CLI arguments and empty queues never claim completion", async () => {
  await assert.rejects(frozenSessionMain([]), /--job/);
  await assert.rejects(frozenSessionMain(["--job", "--root"]), /Missing value/);
  await assert.rejects(frozenSessionMain(["--deadline-min", "NaN"]), /Invalid deadlineMs/);
});
