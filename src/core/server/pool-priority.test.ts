// The worker pool's priority lane: a priority message (the realtime entry step) never waits behind a compute's long
// messages — it may start one worker beyond the cores — and routine messages never run on more workers than the cores.
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { closePool, poolWorkers, runOnWorkers } from "./pool.server.ts";

process.env.CTS_CORE_WORKERS = "1";
after(() => closePool());

describe("worker pool priority lane", () => {
  it("a priority message runs beside a long routine one; routine work stays on the cores", async () => {
    const t0 = Date.now();
    const long = runOnWorkers([{ type: "sleep", ms: 1500 }], 1);
    await new Promise((r) => setTimeout(r, 300));
    await runOnWorkers([{ type: "sleep", ms: 50 }], 1, 60_000, undefined, true);
    const prioMs = Date.now() - t0;
    assert.ok(prioMs < 1200, `the priority message waited ${prioMs} ms behind the routine one`);
    assert.equal(poolWorkers(), 2, "one extra worker for the priority message");
    // the extra worker is idle now; a second routine message waits for the core (never two routine at once)
    const t1 = Date.now();
    await Promise.all([long, runOnWorkers([{ type: "sleep", ms: 100 }], 1)]);
    const both = Date.now() - t1;
    assert.ok(both >= 1100, `the second routine message ran on the extra worker (${both} ms)`);
  });
});
