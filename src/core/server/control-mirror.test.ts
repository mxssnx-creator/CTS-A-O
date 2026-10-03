// The control rows mirror (no SQL read per live tick) yields exactly the ledger a fresh read of live_orders gives.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { controlRows, type ControlRow } from "./live.server.ts";
import { ownLedger } from "./live.ts";

const sqlRows = (db: CoreDb) =>
  db.all<ControlRow>(
    "SELECT substr(cfg, 9) AS k, kind, status, qty, at FROM live_orders WHERE cfg LIKE 'control|%' ORDER BY at, rowid",
  );
const put = (db: CoreDb, coid: string, key: string, kind: string, qty: number, st = "ok") =>
  db.run(
    "INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    coid,
    `control|${key}`,
    key.split("|")[0],
    Number(key.split("|")[1]),
    kind,
    qty,
    1,
    st,
    "",
    Date.now(),
  );

describe("control rows mirror", () => {
  it("loads the table once and matches a fresh SQL read", () => {
    const db = new CoreDb(":memory:");
    const rt = { db };
    put(db, "c1", "A-USDT|1", "O", 10);
    put(db, "c2", "A-USDT|1", "I", 5);
    put(db, "c3", "B-USDT|-1", "O", 3, "pending");
    const m = controlRows(rt);
    assert.deepEqual([...ownLedger([...m.values()])], [...ownLedger(sqlRows(db))]);
    // the mirror is not re-read within the minute: a row written outside record() is not seen yet
    put(db, "c4", "B-USDT|-1", "R", 3);
    assert.equal(controlRows(rt).has("c4"), false);
  });
});
