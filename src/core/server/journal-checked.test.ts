import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";

const put = (db: CoreDb, coid: string, qty: number) => db.runDurable(
  "INSERT OR REPLACE INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
  coid, "control|A-USDT|1", "A-USDT", 1, "O", qty, 1, "ok", "", 1,
);
const rows = (db: CoreDb) => db.all<{ coid: string; qty: number }>("SELECT coid,qty FROM live_orders ORDER BY coid")
  .map(({ coid, qty }) => ({ coid, qty }));

test("checked replay requires a configured journal, not an implicit memory-only success", () => {
  const db = new CoreDb(":memory:");
  const result = db.replayJournalChecked();
  assert.equal(result.ok, false);
  assert.match(db.lastJournalError, /not configured/);
  db.db.close();
});

test("checked replay preserves previous/current journal order and is idempotent", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-checked-replay-"));
  try {
    const journal = join(dir, "ledger.journal"), source = new CoreDb(":memory:");
    source.journalPath = journal;
    put(source, "a", 1); put(source, "b", 2);
    renameSync(journal, `${journal}.prev`);
    put(source, "a", 3);
    const restored = new CoreDb(":memory:"); restored.journalPath = journal;
    assert.deepEqual(restored.replayJournalChecked(), { ok: true, writes: 3 });
    assert.deepEqual(rows(restored), [{ coid: "a", qty: 3 }, { coid: "b", qty: 2 }]);
    assert.deepEqual(restored.replayJournalChecked(), { ok: true, writes: 3 });
    assert.deepEqual(rows(restored), [{ coid: "a", qty: 3 }, { coid: "b", qty: 2 }]);
    source.db.close(); restored.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("checked replay accepts the production ownership, submission, fill and KV statements", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-real-replay-"));
  try {
    const journal = join(dir, "ledger.journal"), source = new CoreDb(":memory:");
    source.journalPath = journal;
    put(source, "a", 1);
    source.runDurable("INSERT OR IGNORE INTO live_submission_sequence (coid, k, kind) VALUES (?, ?, ?)", "a", "A-USDT|1", "O");
    source.runDurable("UPDATE live_orders SET status=?,qty=?,msg=? WHERE coid=? AND status='pending'", "ok", 1, "", "a");
    source.runDurable("INSERT OR REPLACE INTO live_fills (coid,sym,side,kind,qty,ref_px,fill_px,fee,fee_known,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      "a", "A-USDT", 1, "O", 1, 1, 1, 0, 1, 2);
    source.runDurable("INSERT INTO kv(k,v,at) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v,at=excluded.at", "k", "{}", 2);
    source.runDurable("DELETE FROM live_fills WHERE coid=?", "a");
    const restored = new CoreDb(":memory:"); restored.journalPath = journal;
    assert.deepEqual(restored.replayJournalChecked(), { ok: true, writes: 6 });
    assert.deepEqual(rows(restored), [{ coid: "a", qty: 1 }]);
    assert.equal(restored.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_submission_sequence")?.n, 1);
    assert.equal(restored.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_fills")?.n, 0);
    assert.deepEqual(restored.kvGet("k"), {});
    source.db.close(); restored.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const corruption of ["middle", "blank", "torn-tail", "invalid-shape", "invalid-params", "sql-error"] as const)
test(`checked replay rolls back both generations on ${corruption}`, () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-invalid-replay-"));
  try {
    const journal = join(dir, "ledger.journal"), source = new CoreDb(":memory:");
    source.journalPath = journal;
    put(source, "prior", 1);
    renameSync(journal, `${journal}.prev`);
    put(source, "first", 2);
    const invalid = corruption === "invalid-shape" ? JSON.stringify(["UPDATE live_orders SET qty=2"]) :
      corruption === "invalid-params" ? JSON.stringify(["UPDATE live_orders SET qty=?", [{}]]) :
      corruption === "sql-error" ? JSON.stringify(["UPDATE missing_table SET qty=?", [3]]) :
      corruption === "blank" ? "" : "{corrupt";
    appendFileSync(journal, `${invalid}${corruption === "torn-tail" ? "" : "\n"}`);
    if (corruption !== "torn-tail") put(source, "later", 3);
    const restored = new CoreDb(":memory:");
    put(restored, "baseline", 9);
    restored.journalPath = journal;
    const result = restored.replayJournalChecked();
    assert.equal(result.ok, false);
    assert.equal(result.writes, 0);
    assert.deepEqual(rows(restored), [{ coid: "baseline", qty: 9 }], "no successful prefix survives the rollback");
    assert.ok(restored.lastJournalError, "the recovery error is retained");
    writeFileSync(journal, "");
    assert.equal(restored.replayJournalChecked().ok, false, "a later read cannot erase a prior incomplete recovery");
    source.db.close(); restored.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("checked replay treats an unreadable journal as an error", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-unreadable-replay-"));
  try {
    const journal = join(dir, "ledger.journal");
    mkdirSync(journal); // reading a directory as the journal fails even when the process is privileged
    const db = new CoreDb(":memory:"); db.journalPath = journal;
    const result = db.replayJournalChecked();
    assert.equal(result.ok, false);
    assert.match(db.lastJournalError, /could not be read/);
    db.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("an absent journal is an empty replay, not proof of a valid baseline", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-empty-replay-"));
  try {
    const db = new CoreDb(":memory:"); db.journalPath = join(dir, "missing.journal");
    assert.deepEqual(db.replayJournalChecked(), { ok: true, writes: 0 });
    db.db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
