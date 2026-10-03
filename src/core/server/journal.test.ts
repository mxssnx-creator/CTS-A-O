// Ledger durability: the in-memory database is snapshotted every 10 min; the ledger writes in between go to a journal
// that a restore replays, so a crash loses none of them (before or after a snapshot, during its rotation).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";

const put = (db: CoreDb, coid: string, qty: number) =>
  db.runDurable(
    "INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    coid,
    "control|A-USDT|1",
    "A-USDT",
    1,
    "O",
    qty,
    1,
    "ok",
    "",
    Date.now(),
  );
const coids = (db: CoreDb) =>
  db.all<{ coid: string }>("SELECT coid FROM live_orders ORDER BY coid").map((r) => r.coid);

describe("ledger journal", () => {
  it("a crash after a snapshot loses no ledger write", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-journal-"));
    try {
      const snap = join(dir, "core.sqlite");
      const a = new CoreDb(":memory:");
      a.journalPath = `${snap}.journal`;
      put(a, "c1", 1);
      assert.equal(await a.snapshotAsync(snap), true);
      assert.equal(existsSync(`${snap}.journal.prev`), false, "the rotated journal goes once the snapshot holds it");
      put(a, "c2", 2);
      put(a, "c1", 3); // an update after the snapshot
      // crash: a new process restores the snapshot and replays the journal
      const b = new CoreDb(":memory:");
      b.journalPath = `${snap}.journal`;
      assert.equal(b.restore(snap), true);
      assert.equal(b.replayJournal(), 2);
      assert.deepEqual(coids(b), ["c1", "c2"]);
      assert.equal(b.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid = ?", "c1")?.qty, 3);
      // a clean shutdown snapshot holds everything: the journal starts over
      assert.equal(b.snapshot(snap), true);
      assert.equal(existsSync(`${snap}.journal`), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a torn last line (crash mid-append) is skipped, the rest replays", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-journal-"));
    try {
      const snap = join(dir, "core.sqlite");
      const a = new CoreDb(":memory:");
      a.journalPath = `${snap}.journal`;
      put(a, "c1", 1);
      const { appendFileSync } = await import("node:fs");
      appendFileSync(`${snap}.journal`, '["INSERT OR REPLACE INTO live_or');
      const b = new CoreDb(":memory:");
      b.journalPath = `${snap}.journal`;
      assert.equal(b.replayJournal(), 1);
      assert.deepEqual(coids(b), ["c1"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
