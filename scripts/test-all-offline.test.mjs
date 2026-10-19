import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { testAllInvocation } from "./lib/test-all-invocation.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marker = "globalThis[Symbol.for('cts.core.offline.guard')]";
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "cts-test-all-offline-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ["scripts/lib", "src/core/server"]) mkdirSync(join(root, dir), { recursive: true });
  for (const name of ["scripts/test-all.mjs", "scripts/test-core.mjs", "scripts/lib/test-all-invocation.mjs", "scripts/lib/core-test-offline-guard.cjs"])
    copyFileSync(join(ROOT, name), join(root, name));
  const legacy = readFileSync(join(ROOT, "scripts/test-preload.mjs"), "utf8");
  writeFileSync(join(root, "scripts/test-preload.mjs"), `if (!${marker}) throw Error('legacy preload ran before portable guard');\n${legacy}`);
  // Deterministic headroom isolates the runner governor; no host allocation or market/exchange code runs here.
  writeFileSync(join(root, "src/core/server/memguard.server.ts"), "export const cgroupAvailMb = () => 10000;\n");
  writeFileSync(join(root, "src/core/proof.ts"), "export function fixtureValue(input: boolean) {\n  if (input) return 7;\n  return 9;\n}\n");
  writeFileSync(join(root, "scripts/fixture.test.mjs"), `
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {fixtureValue} from '../src/core/proof.ts';
test('lightweight all-runner offline proof', async () => {
  assert.equal(${marker}.nonlocalTransportDenied, true);
  assert.equal(process.env.NODE_TEST_CONTEXT, undefined);
  assert.equal(process.env.CTS_CORE_LIVE, '0');
  assert.equal(process.env.BINGX_API_KEY, undefined);
  assert.equal(process.env.CTS_CORE_SLOW, process.env.EXPECT_SLOW ?? '0');
  assert.equal(process.env.CTS_CORE_SYNTHETIC_END, process.env.EXPECT_END ?? String(Date.UTC(2026,8,30,12)));
  assert.match(process.env.NODE_OPTIONS, /--require/);
  assert.ok(process.execArgv.indexOf('--require') < process.execArgv.indexOf('--import'));
  assert.equal(fixtureValue(true), 7);
  const worker = new Worker("require('node:worker_threads').parentPort.postMessage(!!globalThis[Symbol.for('cts.core.offline.guard')])", {eval:true,execArgv:[],env:{}});
  const guarded = await new Promise((resolve,reject) => {worker.once('message',resolve);worker.once('error',reject)});
  await worker.terminate();
  assert.equal(guarded, true, 'CommonJS worker is guarded even with explicit empty argv/environment');
  if (process.env.FIXTURE_MODE === 'fail') assert.fail('intentional fixture failure');
  if (process.env.FIXTURE_MODE === 'hold') {setInterval(() => {},1000);await new Promise(() => {});}
});
`);
  return root;
}
function runAll(root, { mode, slow, end, killBelow = 1600 } = {}) {
  const env = { ...process.env, BINGX_API_KEY: "fixture-only", CTS_CORE_LIVE: "1", CTS_TEST_NETWORK: "1", FIXTURE_MODE: mode ?? "pass" };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  delete env.NODE_V8_COVERAGE;
  delete env.CTS_CORE_SLOW;
  delete env.CTS_CORE_SYNTHETIC_END;
  if (slow !== undefined) { env.CTS_CORE_SLOW = slow; env.EXPECT_SLOW = slow === "1" ? "1" : "0"; }
  if (end !== undefined) { env.CTS_CORE_SYNTHETIC_END = end; env.EXPECT_END = end; }
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", join(root, "scripts/test-all.mjs"),
    "--files", "scripts/fixture.test.mjs", "--min-free", "0", "--kill-below", String(killBelow), "--out", "report", "--logs", join(root, "logs")],
  { cwd: root, env, encoding: "utf8", timeout: 20000 });
  assert.equal(result.error, undefined, result.error?.message);
  const reports = readdirSync(join(root, "report")).filter((name) => name.endsWith(".json"));
  assert.equal(reports.length, 1, result.stderr + result.stdout);
  return { result, report: JSON.parse(readFileSync(join(root, "report", reports[0]), "utf8")) };
}

test("all-runner invocation cleans nested test context and credentials, preserves explicit slow policy, and guards caller preloads first", (t) => {
  const root = fixture(t);
  const observe = join(root, "observe.cjs");
  writeFileSync(observe, `if (!${marker}) throw Error('caller preload ran before portable guard');`);
  const source = { NODE_TEST_CONTEXT: "child-v8", BINGX_API_KEY: "fixture-only", CTS_CORE_LIVE: "1", CTS_CORE_SLOW: "1", NODE_OPTIONS: `--require ${JSON.stringify(observe)}`, EXPECT_SLOW: "1" };
  const invocation = testAllInvocation("scripts/fixture.test.mjs", source, root);
  assert.equal(invocation.env.NODE_TEST_CONTEXT, undefined);
  assert.equal(invocation.env.BINGX_API_KEY, undefined);
  assert.equal(invocation.env.CTS_CORE_SLOW, "1");
  assert.equal(testAllInvocation("scripts/fixture.test.mjs", {}, root).env.CTS_CORE_SLOW, "0");
  assert.equal(testAllInvocation("scripts/fixture.test.mjs", { CTS_CORE_SLOW: "yes" }, root).env.CTS_CORE_SLOW, "0");
  assert.equal(source.NODE_TEST_CONTEXT, "child-v8", "caller environment is not mutated");
  const run = spawnSync(invocation.command, invocation.args, { cwd: root, env: invocation.env, encoding: "utf8", timeout: 15000 });
  assert.equal(run.status, 0, run.stderr + run.stdout);
  assert.match(run.stdout, /pass 1/);
});

test("real all-runner preserves coverage, pinned END and CommonJS worker protection for one lightweight fixture", (t) => {
  const root = fixture(t);
  const { result, report } = runAll(root, { slow: "1", end: String(Date.UTC(2026, 9, 1)) });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(report.totals.files, 1); assert.equal(report.totals.tests, 1); assert.equal(report.totals.pass, 1);
  assert.equal(report.files[0].status, "pass"); assert.equal(report.files[0].coverage, true);
  const proof = report.coverage.modules.find((entry) => entry.module === "src/core/proof.ts");
  assert.equal(proof.loaded, true); assert.ok(proof.linesCovered > 0);
});

test("real all-runner retains a fixture's failing exit status and failure report", (t) => {
  const root = fixture(t);
  const { result, report } = runAll(root, { mode: "fail" });
  assert.equal(result.status, 1, result.stderr + result.stdout);
  assert.equal(report.totals.filesFailed, 1); assert.equal(report.totals.fail, 1);
  assert.equal(report.files[0].status, "fail"); assert.equal(report.files[0].code, 1);
  assert.match(report.files[0].tail, /intentional fixture failure/);
});

test("real all-runner retains its memory kill governor and reports the killed file", (t) => {
  const root = fixture(t);
  const { result, report } = runAll(root, { mode: "hold", killBelow: 10001 });
  assert.equal(result.status, 1, result.stderr + result.stdout);
  assert.equal(report.totals.filesFailed, 1);
  assert.equal(report.files[0].status, "killed");
  assert.match(report.files[0].reason, /memory: container had 10000 MB available/);
});
