import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
const T = Date.parse("2026-10-14T00:00:00Z");
const cfg = "follow|ema-9-21@m1|tp1|sl1|tr0|h4";
function run(legacy = false, missing = false) {
  const dir = mkdtempSync(join(tmpdir(), "cts-live-diff-"));
  try {
    const file = join(dir, "2026-paper.sqlite");
    const db = new DatabaseSync(file);
    db.exec(`CREATE TABLE paper_trades(cfg TEXT,sym TEXT,side INTEGER,entry_t INTEGER,exit_t INTEGER,r REAL${legacy ? "" : ",unit_r REAL"}); CREATE TABLE live_lane_trades(id TEXT,cfg TEXT,sym TEXT,side INTEGER,entry_t INTEGER,entry REAL,exit REAL,exit_t INTEGER,r REAL,reason TEXT); ALTER TABLE paper_trades ADD COLUMN entry REAL; ALTER TABLE paper_trades ADD COLUMN exit REAL; CREATE TABLE paper_book_trades(cfg TEXT,sym TEXT,side INTEGER,entry_t INTEGER,exit_t INTEGER,r REAL,vol REAL,reason TEXT,held_at INTEGER,at INTEGER,held_px REAL,entry REAL,exit REAL,mult REAL,unit_r REAL,owned_notional_usd REAL); CREATE TABLE paper_positions(cfg TEXT,sym TEXT,side INTEGER,entry_t INTEGER,entry REAL,stop REAL,target REAL,mtm REAL,at INTEGER); CREATE TABLE live_orders(coid TEXT,cfg TEXT,sym TEXT,side INTEGER,kind TEXT,qty REAL,px REAL,status TEXT,msg TEXT,at INTEGER); CREATE TABLE live_fills(coid TEXT,sym TEXT,side INTEGER,kind TEXT,qty REAL,ref_px REAL,fill_px REAL,fee REAL,fee_known INTEGER,at INTEGER)`);
    const put = db.prepare(`INSERT INTO paper_trades(cfg,sym,side,entry_t,exit_t,r${legacy ? "" : ",unit_r"}) VALUES (${legacy ? "?,?,?,?,?,?" : "?,?,?,?,?,?,?"})`);
    for (const [i, r, u] of [[0, 0.0136, 0.0136], [1, -0.068, -0.01]]) {
      const row = [cfg, "A", 1, T + i * 600_000, T + i * 600_000 + 60_000, r];
      put.run(...(legacy ? row : [...row, missing && i === 1 ? null : u]));
      db.prepare("INSERT INTO live_lane_trades(id,cfg,sym,exit_t,r,reason) VALUES(?,?,?,?,?,?)").run(`${cfg}|A|1|${row[3]}`, cfg, "A", row[4], u, "exit");
    }
    db.close();
    return spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", new URL("./core-live-diff.mjs", import.meta.url).pathname, file, "--legacy"], { encoding: "utf8", timeout: 10_000 });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test("snapshot report uses verified paper unit returns while venue returns remain unchanged", () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\| total \| 2 \| 1\.36 \| 0\.4 \| 2 \| 1\.36 \|/);
  assert.match(r.stdout, /not account cash PF or execution-profitability proof/);
});
test("legacy snapshots and mixed unknown paper samples keep their identities but have no primary ratio", () => {
  for (const r of [run(true), run(false, true)]) {
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /\| total \| 2 \| Unit basis unavailable \| – \| 2 \| 1\.36 \|/);
  }
});
