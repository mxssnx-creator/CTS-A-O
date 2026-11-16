import assert from "node:assert/strict";
import { test } from "node:test";
import { memInfo, memRssHardMb, memRssSoftMb, rssMemLevel } from "./memguard.server.ts";

test("RSS thresholds include native memory and worker threads even when host RAM is available", () => {
  assert.equal(rssMemLevel(1000), "ok");
  assert.equal(rssMemLevel(999, 1000, 1200), "ok");
  assert.equal(rssMemLevel(1000, 1000, 1200), "soft");
  assert.equal(rssMemLevel(1200, 1000, 1200), "hard");
  assert.equal(rssMemLevel(Infinity, 1000, 1200), "ok");
});

test("an explicit RSS limit reaches the runtime guard and its diagnostic status", async () => {
  const { CoreRuntime } = await import("./runtime.server.ts");
  const { CoreDb } = await import("./db.server.ts");
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 }, { market: "synthetic" });
  const oldHard = process.env.CTS_CORE_MEM_RSS_HARD_MB, oldSoft = process.env.CTS_CORE_MEM_RSS_SOFT_MB;
  try {
    process.env.CTS_CORE_MEM_RSS_HARD_MB = "1";
    delete process.env.CTS_CORE_MEM_RSS_SOFT_MB;
    assert.equal(memRssHardMb(), 1); assert.equal(memRssSoftMb(), .85);
    const m = memInfo(Date.now(), true);
    assert.equal(m.level, "hard"); assert.equal(m.rssHardMb, 1);
    rt.memGuardTick(true);
    assert.equal(rt.status.mem?.level, "hard"); assert.equal(rt.status.mem?.rssHardMb, 1);
    assert.match(rt.status.mem?.lastAbort ?? "", /RSS hard 1 MB/);
    process.env.CTS_CORE_MEM_RSS_HARD_MB = "invalid";
    assert.throws(() => memRssHardMb(), /positive number/);
  } finally {
    if (oldHard === undefined) delete process.env.CTS_CORE_MEM_RSS_HARD_MB;
    else process.env.CTS_CORE_MEM_RSS_HARD_MB = oldHard;
    if (oldSoft === undefined) delete process.env.CTS_CORE_MEM_RSS_SOFT_MB;
    else process.env.CTS_CORE_MEM_RSS_SOFT_MB = oldSoft;
    memInfo(Date.now(), true);
    rt.dispose();
  }
});
