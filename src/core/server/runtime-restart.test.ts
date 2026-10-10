// The paper book across a restart on the synthetic feed (runtime.test.ts has the coordination tests).
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreRuntime, small, stopStarted } from "./runtime-harness.ts";

afterEach(stopStarted);

describe("paper book across a restart", () => {
  it("a new runtime on the same store continues the open positions, the selection and the book start", () => {
    const db = new CoreDb(":memory:");
    const pos = {
      cfg: "combo|ema-9-21@m15|tp2|sl2|tr0|h64",
      sym: "AAA-USDT",
      side: 1 as const,
      entryT: Date.now() - 3_600_000,
      entry: 1,
      stop: 0.98,
      target: 1.02,
      mtm: 0.004,
      vol: 2,
      level: 3,
    };
    db.kvSet("paperBook", { at: Date.now(), startedAt: 1234, selected: [pos.cfg], positions: [pos] });
    const rt = new CoreRuntime(db, small, { market: "synthetic" });
    assert.equal(rt.paper.positions.length, 1);
    assert.deepEqual(rt.paper.positions[0], pos);
    assert.deepEqual(rt.paper.selected, [pos.cfg]);
    assert.equal(rt.paper.startedAt, 1234);
    // an empty store starts an empty book
    const fresh = new CoreRuntime(new CoreDb(":memory:"), small, { market: "synthetic" });
    assert.equal(fresh.paper.positions.length, 0);
  });

  it("a desk process restarted on its snapshot continues the book (the book is in the snapshot, not the state file)", () => {
    // x02, 7 Oct 04:42: the book was read before start() restored the snapshot — it started empty, the held configs
    // got no tape and 21 exchange positions were closed after the first compute
    const dir = mkdtempSync(join(tmpdir(), "cts-book-"));
    const prev = process.env.CTS_CORE_SNAPSHOT;
    process.env.CTS_CORE_SNAPSHOT = join(dir, "core.sqlite");
    try {
      const pos = {
        cfg: "combo|ema-9-21@m15|tp2|sl2|tr0|h64",
        sym: "AAA-USDT",
        side: 1 as const,
        entryT: Date.now() - 3_600_000,
        entry: 1,
        stop: 0.98,
        target: 1.02,
        mtm: 0.004,
      };
      const a = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
      a.kvSet("paperBook", { at: Date.now(), startedAt: 1234, selected: [pos.cfg], positions: [pos] });
      assert.equal(a.snapshot(join(dir, "core.sqlite")), true);
      const b = new CoreRuntime(new CoreDb(":memory:", { statePath: join(dir, "state.json") }), small, {
        market: "synthetic",
      });
      assert.equal(b.paper.positions.length, 0, "not in the state file: unknown before the restore");
      b.start();
      try {
        assert.deepEqual(b.paper.positions, [pos]);
        assert.deepEqual(b.paper.selected, [pos.cfg]);
        assert.equal(b.paper.startedAt, 1234);
        assert.ok(b.db.all<{ msg: string }>("SELECT msg FROM events").some((e) => /paper book continued from the snapshot: 1 open/.test(e.msg)));
      } finally {
        b.stop();
      }
    } finally {
      if (prev === undefined) delete process.env.CTS_CORE_SNAPSHOT;
      else process.env.CTS_CORE_SNAPSHOT = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

