// scripts/lib/mem-admission.mjs: an eval child starts only when the host can give it its expected peak and keep the
// desk's reserve; past the wait limit it runs alone; the readings of /proc are parsed exactly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { admit, availMb, childHwmMb, parseMemAvailableMb, parseVmHwmMb } from "./mem-admission.mjs";

test("the /proc readings: MemAvailable and VmHWM in MB, null when the line is missing", () => {
  assert.equal(parseMemAvailableMb("MemTotal: 16479232 kB\nMemAvailable:    5242880 kB\n"), 5120);
  assert.equal(parseMemAvailableMb("MemTotal: 1 kB\n"), null);
  assert.equal(parseVmHwmMb("Name:\tnode\nVmHWM:\t 3145728 kB\nVmRSS:\t1 kB\n"), 3072);
  assert.equal(parseVmHwmMb("Name:\tnode\n"), null);
  // the tighter of the host's and the cgroup's
  const meminfo = () => "MemAvailable:    8388608 kB\n";
  assert.equal(availMb(meminfo, () => null), 8192);
  assert.equal(availMb(meminfo, () => 6000), 6000);
  assert.equal(availMb(meminfo, () => 9000), 8192);
  assert.equal(childHwmMb(123, () => null), null, "an exited child has no status");
});

test("a child is admitted at once when the memory is there, after the others' need when it is not", async () => {
  let t = 0;
  const now = () => t;
  const sleep = async (ms) => {
    t += ms;
  };
  // 10 GB available, 3 GB reserve, 6 GB expected: admitted at once
  assert.deepEqual(await admit({ needMb: 6000, reserveMb: 3000, avail: () => 10_000, now, sleep }), { waitedMs: 0, alone: false, availMb: 10_000 });
  // a child already running: two children's need (12 GB + 3 GB) is not there — it waits until memory frees
  let avail = 10_000;
  let running = 1;
  const p = admit({ needMb: () => 6000 * (running + 1), reserveMb: 3000, avail: () => avail, running: () => running, now, sleep: async (ms) => {
    t += ms;
    if (t >= 60_000) running = 0; // the other child finished
  } });
  const r = await p;
  assert.equal(r.alone, false);
  assert.ok(r.waitedMs >= 60_000, `waited ${r.waitedMs}`);
  // no reading at all (no /proc): never blocks
  assert.equal((await admit({ needMb: 1e9, avail: () => null, now, sleep })).alone, false);
});

test("past the wait limit a child runs alone, but only once no other child of the runner runs", async () => {
  let t = 0;
  let running = 1;
  const r = await admit({
    needMb: 8000,
    reserveMb: 3000,
    avail: () => 4000,
    running: () => running,
    timeoutMs: 600_000,
    now: () => t,
    sleep: async (ms) => {
      t += ms;
      if (t >= 900_000) running = 0;
    },
  });
  assert.equal(r.alone, true);
  assert.ok(r.waitedMs >= 900_000, "not before the other child finished");
});
