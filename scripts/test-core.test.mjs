import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { coreTestInvocation } from "./test-core.mjs";

const runner = resolve("scripts/test-core.mjs");

test("core runner enables GC tracing only for explicit diagnostic invocations", () => {
  const normal = coreTestInvocation(["src/core/server/runtime.test.ts"], { CTS_CORE_TEST_CONCURRENCY: "1" });
  const traced = coreTestInvocation(["src/core/server/runtime.test.ts"], { CTS_CORE_TEST_CONCURRENCY: "1", CTS_CORE_TRACE_GC: "1" });
  assert.equal(normal.args.includes("--trace-gc"), false);
  assert.equal(traced.args.includes("--trace-gc"), true);
});

test("the standard core runner installs offline evidence before test imports and preserves failed-test status", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-core-runner-"));
  const run = (body) => {
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
      },
    });
  };
  try {
    const pass = run(`
      import assert from 'node:assert/strict'; import {test} from 'node:test'; import net from 'node:net';
      assert.equal(globalThis[Symbol.for('cts.core.offline.guard')].nonlocalTransportDenied,true);
      assert.equal(process.env.BINGX_X01_API_KEY,undefined); assert.equal(process.env.CTS_CORE_LIVE,'0');
      test('guarded before imports',()=>assert.throws(()=>net.connect({host:'198.51.100.1',port:443}),{code:'CTS_OFFLINE_NETWORK_DENIED'}));
    `);
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
