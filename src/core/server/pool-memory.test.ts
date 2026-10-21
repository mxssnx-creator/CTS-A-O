import assert from "node:assert/strict";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { isWorkersAbort, memoryPoolSize, workerFailure, workerHeapMb } from "./pool.server.ts";

test("default parallelism budgets server, priority worker, heap and external buffers", () => {
  assert.equal(memoryPoolSize(32, 8192), 1);
  assert.equal(memoryPoolSize(32, 16384), 3);
  assert.equal(memoryPoolSize(2, 65536), 2);
  assert.equal(memoryPoolSize(100, 999999), 32);
  assert.equal(memoryPoolSize(8, NaN), 1);
  assert.equal(memoryPoolSize(8, 1000), 1);
  assert.equal(workerHeapMb(undefined), 2048);
  assert.equal(workerHeapMb("32"), 32);
  assert.equal(workerHeapMb("4096"), 4096);
  for (const v of ["0", "NaN", "-2", "3.5", "999999"]) assert.equal(workerHeapMb(v), 2048);
  const ordinary = new Error("worker syntax error");
  assert.equal(workerFailure(ordinary), ordinary);
  assert.ok(isWorkersAbort(workerFailure(Object.assign(new Error("heap"), {code:"ERR_WORKER_OUT_OF_MEMORY"}))));
});

test("a real worker heap OOM drains its call, survives in the parent and preserves another owner", async () => {
  const directory = mkdtempSync(join(tmpdir(), "cts-worker-oom-"));
  const path = join(directory, "oom.mjs");
  writeFileSync(path, `import {parentPort} from 'node:worker_threads';
parentPort.on('message', m => {
  if (m.oom) { const held = []; for (;;) held.push(new Array(250000).fill(1)); }
  else setTimeout(() => parentPort.postMessage({ok:true,id:m.id}), 250);
});`);
  const script = `import assert from 'node:assert/strict';
import {runOnWorkers,closePool,isWorkersAbort,poolWorkers,poolQueue,workerActivity} from ${JSON.stringify(new URL("./pool.server.ts", import.meta.url).href)};
try {
  const unrelated = runOnWorkers([{oom:false}],1,10000);
  const err = await runOnWorkers([{oom:true},{oom:true}],1,10000).then(()=>null,e=>e);
  assert.ok(isWorkersAbort(err)); assert.match(err.message,/memory pressure/);
  assert.equal(err.cause.code,'ERR_WORKER_OUT_OF_MEMORY');
  assert.equal((await unrelated)[0].ok,true);
  assert.equal(poolWorkers(),1); assert.equal(poolQueue(),0); assert.equal(workerActivity().inFlight,0);
  assert.equal((await runOnWorkers([{oom:false}],1,10000))[0].ok,true);
  console.log('parent survived and pool recovered');
} finally { await closePool(); }`;
  try {
    const {stdout} = await promisify(execFile)(process.execPath,
      ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", script],
      {env:{...process.env, CTS_CORE_WORKER:path, CTS_CORE_WORKERS:"2", CTS_CORE_WORKER_HEAP_MB:"32"},
        timeout:20000, maxBuffer:64000});
    assert.match(stdout, /parent survived and pool recovered/);
  } finally { rmSync(directory, {recursive:true,force:true}); }
});
