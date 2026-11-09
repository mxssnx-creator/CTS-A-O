import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

// Exercise the actual compute -> Base worker path. A deliberately unfinished Base part makes a leaked
// worker deterministic; ten hours of synthetic bars test lifecycle mechanics, not strategy profitability.
for (const action of ["stop", "settings", "resync", "dispose"] as const) {
  test(`replacing research cancels running and queued Base jobs (${action})`, { timeout: 15_000 }, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "cts-compute-cancel-"));
    const worker = join(dir, "held-base.worker.mjs");
    writeFileSync(worker, `import { parentPort } from 'node:worker_threads';
parentPort.on('message', m => {
  parentPort.postMessage({ id: m.id, progress: 1, total: 10 });
  if (m.type === 'peer') setTimeout(() => parentPort.postMessage({ id: m.id, ok: true, owner: 'peer' }), 2500);
});
`);
    const url = (file: string) => JSON.stringify(new URL(file, import.meta.url).href);
    const child = `
import assert from 'node:assert/strict';
import { CoreRuntime } from ${url("./runtime.server.ts")};
import { CoreDb } from ${url("./db.server.ts")};
import { CandleSeries } from ${url("../market/candle-series.ts")};
import { syntheticCandles } from ${url("../market/bars.ts")};
import { closePool, poolQueue, runOnWorkers, workerActivity } from ${url("./pool.server.ts")};
const until = async (predicate, ms = 2000) => {
  const end = Date.now() + ms;
  while (!predicate()) {
    assert.ok(Date.now() < end, 'fixture did not reach the expected worker boundary');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};
const rt = new CoreRuntime(new CoreDb(':memory:'), {
  symbols: 1, historyDays: 1, tfs: [1], tfDays: { '1': 1 }, pinned: [],
  focus: ['follow|ema-9-21@m1', 'follow|rsi-mom-14-20@m1'], disabledKinds: ['micro', 'inverse'],
  refineTop: 1, mainTop: 1, evalTop: 1, signals: { enabled: false }, exitStrategy: { enabled: false },
  grid: { tp: [0.01], slOfTp: [1], trailOfTp: [0], holdH: [1], micro: false, minimal: false,
    short: false, general: false, long: false, minimalPlus: false, baseBest: false },
}, { market: 'synthetic' });
rt.stop(); // No scheduler or account is started by this fixture.
rt.wf.simH = 1; rt.wf.preH = 1;
rt.candles.set('CANCEL-USDT', CandleSeries.fromCandles(syntheticCandles('CANCEL', 1, 600, Date.UTC(2026, 10, 9))));
const held = { cfg: 'held-own-config', sym: 'CANCEL-USDT', entryT: 1, qty: 2, slPx: 99, tpPx: 103 };
rt.paper.positions.push(held);
const before = structuredClone(held);
let peerStarted = false, peerSettled = false;
const peer = runOnWorkers([{ type: 'peer' }], 1, 5000, () => { peerStarted = true; }, false, undefined, {});
peer.then(() => { peerSettled = true; }, () => { peerSettled = true; });
let task;
try {
  await until(() => peerStarted);
  task = rt.compute();
  task.catch(() => {});
  await until(() => rt.status.stage === 'Base' && rt.status.progress > 0 && poolQueue() > 0);
  const generation = rt.gen;
  // A timing-only edit must not starve useful discovery or change the held protection.
  rt.updateSettings({ cycleMs: rt.settings.cycleMs + 100 });
  assert.equal(workerActivity().inFlight, 2);
  assert.ok(poolQueue() > 0);
  assert.equal(rt.gen, generation);
  const began = performance.now();
  if (${JSON.stringify(action)} === 'settings') rt.updateSettings({ gates: { minPf: rt.settings.gates.minPf + 0.01 } });
  else if (${JSON.stringify(action)} === 'resync') rt.requestResync();
  else if (${JSON.stringify(action)} === 'dispose') rt.dispose();
  else rt.stop();
  let timer;
  try {
    await Promise.race([task, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('obsolete Base work was not canceled')), 1000);
    })]);
  } finally { clearTimeout(timer); }
  const cancelMs = performance.now() - began;
  assert.ok(cancelMs < 1000, 'replacement must not wait for the Base timeout');
  assert.equal(peerSettled, false, 'the unrelated owner stays active');
  assert.equal(poolQueue(), 0, 'obsolete queued parts must be removed');
  assert.equal(workerActivity().inFlight, 1, 'only the unrelated call remains');
  assert.equal(rt.workersBroken, false, 'intentional cancellation is not a worker failure or local fallback');
  assert.equal(rt.status.computes, 0, 'no partial cohort can publish');
  assert.equal(rt.paper.positions[0], held);
  assert.deepEqual(held, before, 'cancellation leaves owned quantities and stops intact');
  if (${JSON.stringify(action)} === 'settings' || ${JSON.stringify(action)} === 'resync')
    assert.equal(rt.gen, generation, 'research replacement does not reset the live generation');
  assert.equal((await peer)[0].owner, 'peer');
  console.log(JSON.stringify({ action: ${JSON.stringify(action)}, cancelMs }));
  console.log('owned compute cancellation passed');
} finally {
  rt.stop(); rt.dispose();
  await closePool();
  await Promise.allSettled([task, peer]);
}
`;
    try {
      const { stdout } = await promisify(execFile)(process.execPath,
        ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", child],
        { env: { ...process.env, CTS_CORE_WORKER: worker, CTS_CORE_WORKERS: "2", CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_LIVE: "0" }, timeout: 12_000, maxBuffer: 40_000 });
      assert.match(stdout, /owned compute cancellation passed/);
      t.diagnostic(stdout.trim());
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
