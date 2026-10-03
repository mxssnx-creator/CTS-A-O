// No per-position cap (0): volume from the factors and relations alone. A snapshot from before a column was added
// still restores. The paper record keeps when each trade was first recorded (forward vs back-filled).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CoreDb } from "./db.server.ts";
import { controlSettingsOf, positionCapOf } from "./live.server.ts";
import { controlTargets } from "./live.ts";
import { checkSettings } from "../settings-check.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

describe("position cap off and snapshot restore", () => {
  it("maxNotionalUsd 0 = no per-position cap: the volume factor sizes alone", () => {
    assert.equal(positionCapOf({ maxNotionalUsd: 0, notionalUsd: 1 }), Infinity);
    assert.equal(positionCapOf({ maxNotionalUsd: 25, notionalUsd: 1 }), 25);
    assert.doesNotThrow(() =>
      checkSettings({ live: { ...DEFAULT_SETTINGS.live, maxNotionalUsd: 0 } } as never),
    );
    const lanes = [
      { id: "a", cfg: "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32|1", sym: "A-USDT", side: 1 as const, vol: 8, sl: 0.02 },
      { id: "b", cfg: "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32|2", sym: "A-USDT", side: 1 as const, vol: 4, sl: 0.02 },
    ];
    const prices = new Map([["A-USDT", 1]]);
    const capped = controlTargets(lanes, prices, controlSettingsOf({ ...DEFAULT_SETTINGS.live, maxNotionalUsd: 25 }, 10));
    const free = controlTargets(lanes, prices, controlSettingsOf({ ...DEFAULT_SETTINGS.live, maxNotionalUsd: 0 }, 10));
    const q = (r: typeof capped) => r.targets.find((t) => t.key === "A-USDT|1")?.qty ?? 0;
    assert.ok(q(capped) <= 25 * 2 + 1e-9, `capped ${q(capped)}`);
    assert.ok(q(free) >= 120 - 1e-9, `uncapped: 10 × (8 + 4) = 120, got ${q(free)}`);
  });

  it("a snapshot without paper_trades.first_at restores (the new column stays empty); new rows record it", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-restore-"));
    try {
      const old = join(dir, "old.sqlite");
      const o = new DatabaseSync(old);
      o.exec(
        "CREATE TABLE paper_trades (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, entry REAL, exit REAL, r REAL, pnl REAL, reason TEXT, PRIMARY KEY (cfg, sym, entry_t)) WITHOUT ROWID;",
      );
      o.prepare("INSERT INTO paper_trades VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("c", "A-USDT", 1, 1, 2, 1, 1.01, 0.01, 0.1, "tp");
      o.close();
      const db = new CoreDb(":memory:");
      assert.equal(db.restore(old), true);
      const r = db.get<{ n: number; f: number | null }>("SELECT COUNT(*) AS n, MAX(first_at) AS f FROM paper_trades");
      assert.equal(r?.n, 1);
      assert.equal(r?.f, null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the background snapshot (online backup) restores the same rows", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-snap-"));
    try {
      const a = new CoreDb(":memory:");
      a.kvSet("probe", { n: 42 });
      a.event("info", "before the snapshot");
      const path = join(dir, "snap.sqlite");
      assert.equal(await a.snapshotAsync(path), true);
      const b = new CoreDb(":memory:");
      assert.equal(b.restore(path), true);
      assert.deepEqual(b.kvGet("probe"), { n: 42 });
      // one at a time: a second call while the first runs is refused, not interleaved
      const [x, y] = await Promise.all([a.snapshotAsync(path), a.snapshotAsync(path)]);
      assert.deepEqual([x, y].sort(), [false, true]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
