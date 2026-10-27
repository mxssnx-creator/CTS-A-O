import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";
import { promisify } from "node:util";

it("extends Base-like worker timeouts only for advancing progress, with a finite hard deadline", { timeout: 25_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-progress-timeout-"));
  const worker = join(dir, "progress.worker.mjs");
  writeFileSync(worker, `import { parentPort } from 'node:worker_threads';
parentPort.on('message', m => {
  let n = 0;
  const timer = setInterval(() => {
    n++;
    parentPort.postMessage({ id: m.wrongId ? m.id + 1 : m.id, progress: m.stagnant ? 1 : n, total: 1000 });
    if (m.finish && n === 7) { clearInterval(timer); parentPort.postMessage({ id: m.id, ok: true }); }
  }, 100);
});
`);
  const moduleUrl = new URL("./pool.server.ts", import.meta.url).href;
  const child = `
import assert from 'node:assert/strict';
import { closePool, isWorkerTimeout, runOnWorkers } from ${JSON.stringify(moduleUrl)};
const run = (message, hard) => runOnWorkers([message], 1, 500, undefined, false, undefined, undefined, undefined, hard);
const timedOut = e => isWorkerTimeout(e) && /worker timed out/.test(String(e));
try {
  assert.equal((await run({ finish: true }, 2000))[0].ok, true);
  await assert.rejects(run({ finish: true }), timedOut);
  await assert.rejects(run({ stagnant: true }, 1500), timedOut);
  await assert.rejects(run({ wrongId: true }, 1500), timedOut);
  await assert.rejects(run({}, 1200), timedOut);
  await assert.rejects(run({}, 500), /deadline/);
  console.log('progress timeout checks passed');
} finally { await closePool(); }
`;
  try {
    const { stdout } = await promisify(execFile)(process.execPath,
      ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", child],
      { env: { ...process.env, CTS_CORE_WORKER: worker, CTS_CORE_WORKERS: "1" }, timeout: 20_000, maxBuffer: 32_000 });
    assert.match(stdout, /progress timeout checks passed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
