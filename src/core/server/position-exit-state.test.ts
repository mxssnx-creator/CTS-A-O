import assert from "node:assert/strict";
import { it } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";

it("position-exit cleanup identities for separate connections survive the production durable-state restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-exit-cleanup-state-")), path = join(dir, "state.json");
  let db = new CoreDb(":memory:", { statePath: path });
  const pending = {
    first: { conn: "account-a", key: "A|1", sym: "A", side: 1, coid: "first", oid: "101", which: "s" },
    second: { conn: "account-b", key: "A|-1", sym: "A", side: -1, coid: "second", oid: "202", which: "t" },
  };
  try {
    db.kvSet("positionExitCleanup", pending);
    assert.equal(db.flushState(), true);
    db.db.close();
    db = new CoreDb(":memory:", { statePath: path });
    assert.deepEqual(db.kvGet("positionExitCleanup"), pending);
  } finally { db.db.close(); rmSync(dir, { recursive: true, force: true }); }
});
