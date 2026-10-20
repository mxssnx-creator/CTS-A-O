import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Worker } from "node:worker_threads";
import { closePool, poolQueue, poolWorkers, retireOwnedIdleWorkers, runOnWorkers, workerActivity } from "./pool.server.ts";

process.env.CTS_CORE_WORKERS = "1";
afterEach(async () => { await closePool(); process.env.CTS_CORE_WORKERS = "1"; });
const slots = () => (globalThis as unknown as { __ctsPool: { slots: Array<{ w: Worker; busy: boolean }> } }).__ctsPool.slots;
const run = (owner?: object, ms = 1) => runOnWorkers<{ ok: boolean }>([{ type: "sleep", ms }], 1, 10_000, undefined, false, undefined, owner);

test("owned idle retirement removes slots synchronously and awaits their physical exit before returning", async () => {
  const owner = {}, nextOwner = {};
  await run(owner);
  const worker = slots()[0].w; let exited = false;
  worker.once("exit", () => { exited = true; });
  const retiring = retireOwnedIdleWorkers(owner);
  assert.equal(poolWorkers(), 0, "a concurrent claim cannot acquire a slot already being retired");
  const next = run(nextOwner);
  assert.notEqual(slots()[0].w, worker, "a subsequent call acquires a fresh worker");
  assert.equal(await retiring, 1);
  assert.equal(exited, true, "retirement waits for actual worker exit");
  assert.equal((await next)[0].ok, true); assert.equal(poolWorkers(), 1);
  assert.equal(await retireOwnedIdleWorkers(owner), 0, "retirement cannot spill into the next owner's slot");
  assert.equal(await retireOwnedIdleWorkers(nextOwner), 1);
});

test("an owner's worker reused by an active foreign call is preserved", async () => {
  const owner = {}, foreign = {};
  await run(owner); const worker = slots()[0].w;
  const active = run(foreign, 50);
  assert.equal(slots()[0].w, worker);
  assert.equal(await retireOwnedIdleWorkers(owner), 0);
  assert.equal(await retireOwnedIdleWorkers(foreign), 0, "even a matching owner cannot retire active work");
  assert.equal((await active)[0].ok, true); assert.equal(poolWorkers(), 1);
  assert.equal(await retireOwnedIdleWorkers(foreign), 1);
});

test("a later foreign or omitted-owner claim replaces ownership even after becoming idle", async () => {
  const owner = {}, foreign = {};
  await run(owner); const worker = slots()[0].w;
  await run(foreign);
  assert.equal(slots()[0].w, worker); assert.equal(await retireOwnedIdleWorkers(owner), 0);
  assert.equal(await retireOwnedIdleWorkers(foreign), 1);
  await run(owner); const reused = slots()[0].w;
  await run();
  assert.equal(slots()[0].w, reused); assert.equal(await retireOwnedIdleWorkers(owner), 0);
  assert.equal(poolWorkers(), 1, "a caller without an explicit owner still replaces the old ownership marker");
});

test("queued handoff claims the slot before the earlier caller can retire it", async () => {
  const owner = {}, foreign = {};
  const first = run(owner, 50);
  const queued = run(foreign, 50);
  assert.equal(poolQueue(), 1);
  assert.equal(await retireOwnedIdleWorkers(owner), 0, "the earlier call is still active");
  assert.equal((await first)[0].ok, true);
  assert.equal(poolQueue(), 0, "the waiter already owns the handoff");
  assert.equal(await retireOwnedIdleWorkers(owner), 0);
  assert.equal((await queued)[0].ok, true);
  assert.equal(await retireOwnedIdleWorkers(owner), 0, "the completed foreign call remains the last owner");
  assert.equal(await retireOwnedIdleWorkers(foreign), 1); assert.equal(workerActivity().inFlight, 0);
});

test("retirement preserves unrelated idle workers and is shared across server module copies", async () => {
  process.env.CTS_CORE_WORKERS = "2";
  const owner = {}, foreign = {};
  const other: typeof import("./pool.server.ts") = await import(new URL("./pool.server.ts?owner-retirement-copy", import.meta.url).href);
  await Promise.all([run(owner, 20), other.runOnWorkers([{ type: "sleep", ms: 1 }], 1, 10_000, undefined, false, undefined, foreign)]);
  assert.equal(poolWorkers(), 2);
  assert.equal(await other.retireOwnedIdleWorkers(owner), 1);
  assert.equal(poolWorkers(), 1); assert.equal(await retireOwnedIdleWorkers(owner), 0);
  assert.equal(await retireOwnedIdleWorkers(foreign), 1);
});

test("invalid runtime tokens cannot retire unowned slots or start work; function identities remain valid", async () => {
  await run();
  for (const token of [undefined, null, false, 0, "", Symbol("invalid")]) {
    await assert.rejects(retireOwnedIdleWorkers(token as unknown as object), TypeError);
    if (token !== undefined) await assert.rejects(run(token as unknown as object), TypeError);
    assert.equal(poolWorkers(), 1, "invalid retirement leaves the unowned idle worker intact");
  }
  const owner = () => undefined;
  await run(owner); assert.equal(await retireOwnedIdleWorkers(owner), 1);
});

test("a bounded private worker cache records actual RSS before and after owned retirement", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "cts-owner-memory-"));
  const workerPath = join(directory, "private-cache.worker.mjs");
  writeFileSync(workerPath, `import { parentPort } from 'node:worker_threads';
const cache = Buffer.alloc(64 * 1024 * 1024, 0xa5);
parentPort.on('message', (m) => parentPort.postMessage({ ok: true, id: m.id, cacheBytes: cache.byteLength }));
`);
  const script = `
import { runOnWorkers, retireOwnedIdleWorkers, poolWorkers } from ${JSON.stringify(new URL("./pool.server.ts", import.meta.url).href)};
const owner = {}, before = process.memoryUsage().rss;
const [ready] = await runOnWorkers([{ type: 'private-cache-fixture' }], 1, 10000, undefined, false, undefined, owner);
const cached = process.memoryUsage().rss;
const retired = await retireOwnedIdleWorkers(owner);
await new Promise(resolve => setTimeout(resolve, 50));
console.log(JSON.stringify({ cacheBytes: ready.cacheBytes, retired, workers: poolWorkers(), beforeRssMb: Math.round(before / 1048576),
  cachedRssMb: Math.round(cached / 1048576), retiredRssMb: Math.round(process.memoryUsage().rss / 1048576) }));
`;
  try {
    const { stdout } = await promisify(execFile)(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", script],
      { env: { ...process.env, CTS_CORE_WORKER: workerPath, CTS_CORE_WORKERS: "1" }, timeout: 20_000, maxBuffer: 64_000 });
    const measurement = JSON.parse(stdout.trim());
    assert.equal(measurement.cacheBytes, 64 * 1024 * 1024); assert.equal(measurement.retired, 1); assert.equal(measurement.workers, 0);
    for (const key of ["beforeRssMb", "cachedRssMb", "retiredRssMb"]) assert.ok(Number.isFinite(measurement[key]));
    t.diagnostic(`Bounded 64 MiB fixture; RSS recovery is measured here, not guaranteed for a study: ${JSON.stringify(measurement)}`);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
