// Memory guard: levels, the compute fallback ladder (lighter computes under pressure, back up when memory has room)
// and the protect variants a lighter compute keeps.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fallbackProtects,
  memInfo,
  memLevel,
  memRetryDelayMs,
  nextFallback,
  parseMemAvailable,
  shouldCollect,
} from "./memguard.server.ts";
import { abortWorkers, runOnWorkers, workersAvailable } from "./pool.server.ts";

describe("memory guard", () => {
  it("reads MemAvailable and grades the pressure", () => {
    assert.equal(parseMemAvailable("MemTotal: 16000000 kB\nMemAvailable:    2097152 kB\n"), 2048);
    assert.equal(parseMemAvailable("MemTotal: 1 kB\n"), null);
    assert.equal(memLevel(5000, 2500, 1200), "ok");
    assert.equal(memLevel(2000, 2500, 1200), "soft");
    assert.equal(memLevel(1000, 2500, 1200), "hard");
    const m = memInfo();
    assert.ok(m.availMb > 0 && m.rssMb > 0);
  });

  it("steps the fallback up under pressure and back down after three clean computes with room", () => {
    let st = { level: 0, clean: 0 };
    st = nextFallback(st.level, st.clean, true, 900, 2500);
    assert.deepEqual(st, { level: 1, clean: 0 });
    st = nextFallback(st.level, st.clean, true, 900, 2500);
    assert.deepEqual(st, { level: 2, clean: 0 });
    st = nextFallback(st.level, st.clean, true, 900, 2500);
    assert.equal(st.level, 2, "capped");
    // clean but tight: stays
    st = nextFallback(st.level, st.clean, false, 3000, 2500);
    assert.deepEqual(st, { level: 2, clean: 0 });
    for (let i = 0; i < 2; i++) st = nextFallback(st.level, st.clean, false, 6000, 2500);
    assert.deepEqual(st, { level: 2, clean: 2 });
    st = nextFallback(st.level, st.clean, false, 6000, 2500);
    assert.deepEqual(st, { level: 1, clean: 0 });
  });

  it("soft pressure: a forced collection at most every 30 s, and only after the heap grew", () => {
    assert.equal(shouldCollect(0, null, 1000), true, "the first one");
    const last = { at: 0, mb: 1000 };
    assert.equal(shouldCollect(1_000, last, 3000), false, "a second later: never, whatever the growth");
    assert.equal(shouldCollect(29_999, last, 3000), false);
    assert.equal(shouldCollect(30_000, last, 1100), false, "grown 100 MB: nothing new to free");
    assert.equal(shouldCollect(30_000, last, 1256), true, "grown 256 MB");
    assert.equal(shouldCollect(30_000, { at: 0, mb: 4000 }, 4800), false, "below a quarter of a large heap");
    assert.equal(shouldCollect(30_000, { at: 0, mb: 4000 }, 5000), true);
  });

  it("after aborts at the lightest level the next compute waits 15 s doubling to 10 min; lighter levels go on", () => {
    assert.equal(memRetryDelayMs(0, 1), 0);
    assert.equal(memRetryDelayMs(1, 3), 0);
    assert.equal(memRetryDelayMs(2, 0), 0);
    assert.equal(memRetryDelayMs(2, 1), 15_000);
    assert.equal(memRetryDelayMs(2, 2), 30_000);
    assert.equal(memRetryDelayMs(2, 6), 480_000);
    assert.equal(memRetryDelayMs(2, 7), 600_000);
    assert.equal(memRetryDelayMs(2, 40), 600_000);
  });

  it("a lighter compute drops micro, then minimal too; other ranges and the wide grid stay", () => {
    const ps = [{ tag: "" }, { tag: "mc" }, { tag: "mn" }, { tag: "sh" }, {}];
    assert.equal(fallbackProtects(ps, 0).length, 5);
    assert.deepEqual(
      fallbackProtects(ps, 1).map((p) => p.tag),
      ["", "mn", "sh", undefined],
    );
    assert.deepEqual(
      fallbackProtects(ps, 2).map((p) => p.tag),
      ["", "sh", undefined],
    );
  });

  it(
    "aborting the workers rejects a running call with the reason",
    { skip: !workersAvailable() },
    async () => {
      const run = runOnWorkers([{ type: "sleep", ms: 5000 }], 1, 60_000);
      await new Promise((r) => setTimeout(r, 300));
      abortWorkers("memory pressure: test");
      await assert.rejects(run, /memory pressure: test|worker/);
    },
  );
});

describe("allocator settings", () => {
  it("warns on Linux when the arena cap or the mmap threshold is missing; quiet when both are set or elsewhere", async () => {
    const { allocatorWarning } = await import("./memguard.server.ts");
    assert.match(allocatorWarning({}, "linux") ?? "", /MALLOC_ARENA_MAX and MALLOC_MMAP_THRESHOLD_/);
    assert.match(allocatorWarning({ MALLOC_ARENA_MAX: "2" }, "linux") ?? "", /MALLOC_MMAP_THRESHOLD_ not set/);
    assert.equal(allocatorWarning({ MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576" }, "linux"), null);
    assert.equal(allocatorWarning({}, "darwin"), null);
  });
});
