import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb, upgradeShared } from "./db.server.ts";

const LEGACY_SCHEMA = `
CREATE TABLE paper_trades (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, entry REAL, exit REAL, r REAL, pnl REAL, reason TEXT, first_at INTEGER, PRIMARY KEY (cfg, sym, side, entry_t)) WITHOUT ROWID;
CREATE TABLE paper_book_trades (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, r REAL, vol REAL, reason TEXT, held_at INTEGER, at INTEGER, PRIMARY KEY (cfg, sym, side, entry_t)) WITHOUT ROWID;
PRAGMA user_version = 41;
`;
const PAPER_INSERT = "INSERT OR REPLACE INTO paper_trades (cfg, sym, side, entry_t, exit_t, entry, exit, r, pnl, reason, first_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const BOOK_INSERT = "INSERT OR REPLACE INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const PAPER_UNIT_INSERT = "INSERT OR REPLACE INTO paper_trades (cfg, sym, side, entry_t, exit_t, entry, exit, r, pnl, reason, first_at, unit_r) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const BOOK_UNIT_INSERT = "INSERT OR REPLACE INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, unit_r) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const legacyPaper = (cfg: string) => [cfg, "A-USDT", 1, 100, 200, 100, 103, .12, 12, "tp", 101];
const legacyBook = (cfg: string) => [cfg, "A-USDT", 1, 100, 200, .12, 400, "tp", 101, 201];
const paperRows = (db: DatabaseSync) => db.prepare("SELECT * FROM paper_trades ORDER BY cfg").all().map((row) => ({ ...row }));
const bookRows = (db: DatabaseSync) => db.prepare("SELECT * FROM paper_book_trades ORDER BY cfg").all().map((row) => ({ ...row }));
const values = (db: DatabaseSync) => ({ paper: paperRows(db), book: bookRows(db) });

function putLegacy(db: DatabaseSync, cfg = "legacy") {
  db.prepare(PAPER_INSERT).run(...legacyPaper(cfg));
  db.prepare(BOOK_INSERT).run(...legacyBook(cfg));
}

function putUnit(db: CoreDb, cfg: string, unitR: number | null) {
  const paper = legacyPaper(cfg);
  const book = legacyBook(cfg);
  if (unitR === 0) {
    paper[7] = 0;
    paper[8] = 0;
    book[5] = 0;
  }
  db.run(PAPER_UNIT_INSERT, ...paper, unitR);
  db.run(BOOK_UNIT_INSERT, ...book, unitR);
}

function legacyFile(path: string) {
  const db = new DatabaseSync(path);
  try {
    db.exec(LEGACY_SCHEMA);
    putLegacy(db);
    return values(db);
  } finally {
    db.close();
  }
}

describe("paper unit-return storage", () => {
  it("migrates existing files without inferring unit returns or changing weighted/cash fields", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-paper-unit-"));
    try {
      const path = join(dir, "legacy.sqlite");
      const original = legacyFile(path);
      const db = new CoreDb(path);
      let expected: ReturnType<typeof values>;
      try {
        assert.deepEqual(values(db.db), {
          paper: original.paper.map((row) => ({ ...row, unit_r: null })),
          book: original.book.map((row) => ({ ...row, unit_r: null })),
        });
        assert.equal(db.get<{ user_version: number }>("PRAGMA user_version")?.user_version, 41);
        putUnit(db, "verified", .03);
        expected = values(db.db);
      } finally {
        db.db.close();
      }
      const reopened = new CoreDb(path);
      try {
        assert.deepEqual(values(reopened.db), expected, "reopening must preserve both return bases and cash");
        assert.equal(reopened.get<{ user_version: number }>("PRAGMA user_version")?.user_version, 41);
        for (const table of ["paper_trades", "paper_book_trades"]) {
          const columns = reopened.all<{ name: string; type: string; notnull: number; dflt_value: unknown }>("SELECT * FROM pragma_table_info(?)", table);
          assert.deepEqual(columns.filter((column) => column.name === "unit_r").map(({ type, notnull, dflt_value }) => ({ type, notnull, dflt_value })), [
            { type: "REAL", notnull: 0, dflt_value: null },
          ]);
        }
      } finally {
        reopened.db.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("upgrades retained legacy databases on hot reload and is idempotent", () => {
    const raw = new DatabaseSync(":memory:");
    try {
      raw.exec(LEGACY_SCHEMA);
      putLegacy(raw);
      const original = values(raw);
      const retained = { db: raw, stmts: new Map(), versions: new Map() } as unknown as CoreDb;
      upgradeShared(retained);
      upgradeShared(retained);
      assert.deepEqual(values(raw), {
        paper: original.paper.map((row) => ({ ...row, unit_r: null })),
        book: original.book.map((row) => ({ ...row, unit_r: null })),
      });
      assert.equal(retained.get<{ user_version: number }>("PRAGMA user_version")?.user_version, 41);
      putUnit(retained, "verified", .03);
      assert.equal(retained.get<{ unit_r: number }>("SELECT unit_r FROM paper_trades WHERE cfg = 'verified'")?.unit_r, .03);
    } finally {
      raw.close();
    }
  });

  it("restores legacy snapshots with NULL unit returns, including replacement of a known row", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-paper-unit-"));
    const db = new CoreDb();
    try {
      const path = join(dir, "legacy.sqlite");
      const original = legacyFile(path);
      putUnit(db, "legacy", .03);
      assert.equal(db.restore(path), true);
      assert.deepEqual(values(db.db), {
        paper: original.paper.map((row) => ({ ...row, unit_r: null })),
        book: original.book.map((row) => ({ ...row, unit_r: null })),
      });
      const unchanged = new DatabaseSync(path, { readOnly: true });
      try {
        assert.deepEqual(values(unchanged), original, "restore must not migrate or modify its source snapshot");
        assert.equal(unchanged.prepare("PRAGMA user_version").get()?.user_version, 41);
      } finally {
        unchanged.close();
      }
    } finally {
      db.db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const mode of ["sync", "async"] as const) {
    it(`${mode} snapshots restore and reopen both return fields, NULL history and original cash`, async () => {
      const dir = mkdtempSync(join(tmpdir(), "cts-paper-unit-"));
      const source = new CoreDb();
      const restored = new CoreDb();
      try {
        const path = join(dir, "snapshot.sqlite");
        putLegacy(source.db);
        putUnit(source, "verified", .03);
        putUnit(source, "verified-zero", 0);
        const expected = values(source.db);
        assert.equal(mode === "sync" ? source.snapshot(path) : await source.snapshotAsync(path), true);
        assert.equal(restored.restore(path), true);
        assert.deepEqual(values(restored.db), expected);
        const reopened = new CoreDb(path);
        try {
          assert.deepEqual(values(reopened.db), expected);
        } finally {
          reopened.db.close();
        }
      } finally {
        source.db.close();
        restored.db.close();
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it("replays old and new journals over a legacy snapshot without guessing or losing unit returns", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-paper-unit-"));
    const writer = new CoreDb();
    const restored = new CoreDb();
    try {
      const snapshot = join(dir, "legacy.sqlite");
      legacyFile(snapshot);
      const journal = `${snapshot}.journal`;
      for (const [sql, params] of [[PAPER_INSERT, legacyPaper("old-journal")], [BOOK_INSERT, legacyBook("old-journal")]])
        appendFileSync(journal, `${JSON.stringify([sql, params])}\n`);
      writer.journalPath = journal;
      writer.runDurable(PAPER_UNIT_INSERT, ...legacyPaper("new-journal"), .03);
      writer.runDurable(BOOK_UNIT_INSERT, ...legacyBook("new-journal"), .03);
      restored.journalPath = journal;
      assert.equal(restored.restore(snapshot), true);
      assert.equal(restored.replayJournal(), 4);
      const expected = values(restored.db);
      assert.deepEqual(expected.paper.map(({ cfg, r, unit_r, pnl }) => ({ cfg, r, unit_r, pnl })), [
        { cfg: "legacy", r: .12, unit_r: null, pnl: 12 },
        { cfg: "new-journal", r: .12, unit_r: .03, pnl: 12 },
        { cfg: "old-journal", r: .12, unit_r: null, pnl: 12 },
      ]);
      assert.deepEqual(expected.book.map(({ cfg, r, unit_r, vol }) => ({ cfg, r, unit_r, vol })), [
        { cfg: "legacy", r: .12, unit_r: null, vol: 400 },
        { cfg: "new-journal", r: .12, unit_r: .03, vol: 400 },
        { cfg: "old-journal", r: .12, unit_r: null, vol: 400 },
      ]);
      assert.equal(restored.replayJournal(), 4);
      assert.deepEqual(values(restored.db), expected, "repeated crash recovery remains idempotent");
      assert.equal(restored.snapshot(snapshot), true);
      const reopened = new CoreDb(snapshot);
      try {
        assert.deepEqual(values(reopened.db), expected);
      } finally {
        reopened.db.close();
      }
    } finally {
      writer.db.close();
      restored.db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
