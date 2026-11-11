import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { fakeRt } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, liveKv, stepLive } from "./live.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";

afterEach(() => mock.timers.reset());

for (const explicitFlush of [false, true]) {
  test(`delayed live state cannot write to a closed handle (explicit flush ${explicitFlush})`, async () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"], now: 100_000 });
    const previous = process.env.CTS_CORE_LIVE;
    process.env.CTS_CORE_LIVE = "0";
    const db = new CoreDb(":memory:"),
      { rt } = fakeRt(db);
    try {
      await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
      mock.timers.tick(10);
      await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
      assert.equal(liveKv<{ at: number }>(db, "liveStatus")?.at, 100_010);
      assert.equal(
        db.kvGet<{ at: number }>("liveStatus")?.at,
        100_000,
        "second value is debounced",
      );
      if (explicitFlush) {
        flushLiveKv(db);
        assert.equal(
          db.kvGet<{ at: number }>("liveStatus")?.at,
          100_010,
          "shutdown persists the latest value",
        );
      }
      db.db.close();
      assert.doesNotThrow(() => mock.timers.tick(1_001));
      assert.doesNotThrow(() => flushLiveKv(db));
    } finally {
      if (db.db.isOpen) db.db.close();
      if (previous === undefined) delete process.env.CTS_CORE_LIVE;
      else process.env.CTS_CORE_LIVE = previous;
    }
  });
}
