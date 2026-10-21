import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { coreTestInvocation } from "./test-core.mjs";

const runner = resolve("scripts/test-core.mjs");

test("core compute workers default to one and an explicit two leaves serial file execution unchanged", () => {
  const files = ["src/core/sim/symbol-directions.test.ts"];
  const defaults = coreTestInvocation(files, { CTS_CORE_WORKERS: "8" });
  const source = { CTS_CORE_TEST_WORKERS: "2", CTS_CORE_WORKERS: "8" };
  const parallel = coreTestInvocation(files, source);
  assert.equal(defaults.env.CTS_CORE_WORKERS, "1", "unrelated runtime settings cannot change test defaults");
  assert.equal(defaults.workers, 1);
  assert.equal(parallel.env.CTS_CORE_WORKERS, "2");
  assert.equal(parallel.workers, 2);
  assert.equal(parallel.concurrency, 1);
  assert.deepEqual(parallel.files, defaults.files);
  assert.deepEqual(parallel.args, defaults.args, "worker throughput cannot alter test inventory or filters");
  assert.equal(parallel.env.CTS_CORE_LIVE, "0");
  assert.equal(parallel.env.CTS_CORE_COMPARE, "0");
  assert.match(parallel.env.NODE_OPTIONS, /core-test-offline-guard/);
  assert.deepEqual(source, { CTS_CORE_TEST_WORKERS: "2", CTS_CORE_WORKERS: "8" });
});

test("core compute worker selection rejects unsupported values before spawning any test", () => {
  for (const value of ["", "0", "3", "8", "-1", "1.5", "NaN", "yes", "02", "1.0", "2 "])
    assert.throws(() => coreTestInvocation(["fixture.test.mjs"], { CTS_CORE_TEST_WORKERS: value }), /CTS_CORE_TEST_WORKERS must be 1 or 2/);
});

test("the standard core runner installs offline evidence before test imports and preserves failed-test status", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-core-runner-"));
  const run = (body, workers = "1") => {
    const fixture = join(dir, "runner.test.mjs");
    writeFileSync(fixture, body);
    return spawnSync(process.execPath, [runner, fixture], {
      encoding: "utf8",
      timeout: 30_000,
      env: {
        ...process.env,
        BINGX_X01_API_KEY: "fixture-only",
        CTS_CORE_LIVE: "1",
        CTS_CORE_TEST_CONCURRENCY: "1",
        CTS_CORE_TEST_WORKERS: workers,
        CTS_CORE_MEM_SOFT_MB: "2500",
        CTS_CORE_MEM_HARD_MB: "1200",
      },
    });
  };
  try {
    const pass = run(`
      import assert from 'node:assert/strict'; import {test} from 'node:test'; import net from 'node:net';
      assert.equal(globalThis[Symbol.for('cts.core.offline.guard')].nonlocalTransportDenied,true);
      assert.equal(process.env.BINGX_X01_API_KEY,undefined); assert.equal(process.env.CTS_CORE_LIVE,'0');
      assert.equal(process.env.CTS_CORE_WORKERS,'2');
      assert.equal(process.env.CTS_CORE_MEM_SOFT_MB,'1'); assert.equal(process.env.CTS_CORE_MEM_HARD_MB,'1');
      test('guarded before imports',()=>assert.throws(()=>net.connect({host:'198.51.100.1',port:443}),{code:'CTS_OFFLINE_NETWORK_DENIED'}));
    `, "2");
    assert.equal(pass.error, undefined);
    assert.equal(pass.status, 0, pass.stdout + pass.stderr);
    assert.match(pass.stdout, /guarded before imports/);
    const fail = run(
      `import {test} from 'node:test'; test('intentional failure fixture',()=>{throw new Error('expected fixture failure')});`,
    );
    assert.equal(fail.error, undefined);
    assert.equal(fail.status, 1, "a failed child test cannot become a successful verification");
    assert.match(fail.stdout + fail.stderr, /expected fixture failure/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("explicit core test inventory refuses missing paths, directories and duplicate aliases", () => {
  const real = "src/core/sim/symbol-directions.test.ts";
  for (const missing of ["src/core/server/signals-history-matrix.test.ts", "src/core/sim"])
    assert.throws(() => coreTestInvocation([real, missing]), /Missing or non-file core test/);
  assert.throws(() => coreTestInvocation([real, resolve(real)]), /Duplicate core test/);
});
