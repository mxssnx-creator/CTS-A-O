// scripts/lib/mem-admission.mjs: an eval child starts only when the host can give it its expected peak and keep the
// desk's reserve; past the wait limit it runs alone; the readings of /proc are parsed exactly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { admit, admitter, availMb, childHwmMb, guardChild, parseMemAvailableMb, parseVmHwmMb } from "./mem-admission.mjs";

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

test("workers that ask at once are admitted one at a time: each child counts as running from its admission", async () => {
  // 12 GB available, 7 GB per child, 3 GB reserve: room for one child, not two
  let t = 0;
  const sleep = async (ms) => {
    t += ms;
  };
  // the race this replaces: two workers asking in the same tick before either counted itself — both admitted
  let running = 0;
  const ask = () => admit({ needMb: () => 7000 * (running + 1), reserveMb: 3000, avail: () => 12_000, running: () => running, now: () => t, sleep });
  const racy = await Promise.all([ask().then(() => running++), ask().then(() => running++)]);
  assert.deepEqual(racy, [0, 1], "(the race: both admitted)");
  // the admitter: the second waits until the first is released
  t = 0;
  const gate = admitter({ perChildMb: 7000, reserveMb: 3000, avail: () => 12_000, now: () => t, sleep: async (ms) => {
    t += ms;
    if (t >= 120_000 && gate.running === 1 && !released) {
      released = true;
      gate.release();
    }
  } });
  let released = false;
  const order = [];
  const [a, b] = await Promise.all([
    gate.acquire().then((r) => (order.push(["first", t, gate.running]), r)),
    gate.acquire().then((r) => (order.push(["second", t, gate.running]), r)),
  ]);
  assert.equal(a.waitedMs, 0);
  assert.ok(b.waitedMs >= 120_000, `the second waited ${b.waitedMs} ms`);
  assert.deepEqual(order.map((x) => x[0]), ["first", "second"]);
  assert.equal(order[0][2], 1, "the first counts as running at its admission");
  assert.equal(order[1][2], 1, "the second runs once the first was released");
  // with room for two, both start at once
  const wide = admitter({ perChildMb: 4000, reserveMb: 3000, avail: () => 12_000, now: () => 0, sleep: async () => {} });
  const both = await Promise.all([wide.acquire(), wide.acquire()]);
  assert.deepEqual(both.map((x) => x.waitedMs), [0, 0]);
  assert.equal(wide.running, 2);
});

test("a running child is stopped when the host falls under the floor (the desk's memory comes first)", async () => {
  const kills = [];
  const child = { kill: (sig) => kills.push(sig) };
  let a = 6000;
  const g = guardChild(child, { floorMb: 2800, avail: () => a, everyMs: 5 });
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(kills, [], "above the floor: left running");
  a = 2500;
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(kills, ["SIGKILL"], "stopped once");
  const st = g.stop();
  assert.equal(st.availMb, 2500);
  // no reading at all: never stops
  const k2 = [];
  const g2 = guardChild({ kill: (s) => k2.push(s) }, { floorMb: 2800, avail: () => null, everyMs: 5 });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(g2.stop(), null);
  assert.deepEqual(k2, []);
});
