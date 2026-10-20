import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

const M = 60_000;
const T = Date.parse("2026-10-14T00:00:00Z");
const script = new URL("./core-live-group-replay.mjs", import.meta.url).pathname;
const tactic = "follow|tactic-trend-s@m5|tp1|sl1|tr0|h4";
const ema = "follow|ema-9-21@m5|tp1|sl1|tr0|h4";
const row = (cfg, i, r, unit = r) => [cfg, T + i * 3 * M, T + (i * 3 + 1) * M, r, T + (i * 3 + 1) * M + 1, unit];
function run(rows, { legacy = false, specs = "cfg:2", gates, min = "1.05" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cts-group-replay-"));
  try {
    const file = join(dir, "paper.sqlite");
    const db = new DatabaseSync(file);
    db.exec(`CREATE TABLE paper_trades (cfg TEXT, entry_t INTEGER, exit_t INTEGER, r REAL, first_at INTEGER${legacy ? "" : ", unit_r REAL"})`);
    const put = db.prepare(`INSERT INTO paper_trades VALUES (${legacy ? "?,?,?,?,?" : "?,?,?,?,?,?"})`);
    for (const r of rows) put.run(...(legacy ? r.slice(0, 5) : r));
    db.close();
    const args = ["--experimental-strip-types", "--no-warnings", script, file, specs, min];
    if (gates) {
      writeFileSync(join(dir, "gates.json"), JSON.stringify(gates));
      args.push(join(dir, "gates.json"));
    }
    return spawnSync(process.execPath, args, { encoding: "utf8", timeout: 10_000 });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("Tactic uses its full-indication minimum and warmup is not reported as PF-qualified", () => {
  const trades = (cfg) => [row(cfg, 0, 0.0108), row(cfg, 1, -0.01), row(cfg, 2, 0.005)];
  const t = run(trades(tactic));
  const e = run(trades(ema));
  assert.equal(t.status, 0, t.stderr);
  assert.equal(e.status, 0, e.stderr);
  assert.match(t.stdout, /taken 2 of 3; warmup 2, PF-qualified 0/);
  assert.match(e.stdout, /taken 3 of 3; warmup 2, PF-qualified 1/);
  assert.match(t.stdout, /Counterfactual diagnostic only/);
});

test("provided stricter range minima apply and known unit returns are independent of stored sized r", () => {
  const cfg = `${ema}|sh`;
  const rows = [row(cfg, 0, 0.0136, 0.0136), row(cfg, 1, -0.068, -0.01), row(cfg, 2, 0.001, 0.001)];
  const r = run(rows, { gates: { rangeMinPf: { short: 1.5 } } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /taken 2 of 3; warmup 2, PF-qualified 0/);
  assert.match(r.stdout, /all return PF 1\.46/);
});

test("unknown legacy returns are retained as unknown, block the causal window and never become positive proof", () => {
  const rows = [row(ema, 0, 0.02), row(ema, 1, -0.05, null), row(ema, 2, 0.01)];
  const r = run(rows);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /2 verified unit returns · 1 unknown unit basis/);
  assert.match(r.stdout, /all return PF unavailable \(1 unknown unit returns; 2 verified\)/);
  assert.match(r.stdout, /PF-qualified 0, blocked by unknown history 1/);
  const old = run(rows, { legacy: true });
  assert.equal(old.status, 0, old.stderr);
  assert.match(old.stdout, /0 verified unit returns · 3 unknown unit basis/);
  assert.match(old.stdout, /taken 0 of 3/);
});

test("only finite complete nonnegative-delay forward records enter a window", () => {
  const good = row(ema, 0, -0.01);
  const early = row(ema, 1, 0.5); early[4] = early[2] - 1;
  const late = row(ema, 2, 0.5); late[4] = late[2] + 16 * M;
  const incomplete = row(ema, 3, null, 0.5);
  const inverted = row(ema, 4, 0.5); inverted[1] = inverted[2] + 1;
  const r = run([good, early, late, incomplete, inverted]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 forward closes/);
  assert.match(r.stdout, /4 invalid\/backfilled excluded/);
  assert.match(r.stdout, /all return PF 0\.00/);
});

test("a close simultaneous with entry is not visible to that decision and invalid windows fail clearly", () => {
  const rows = [row(ema, 0, 0.01), row(ema, 1, -0.1)];
  rows[1][1] = rows[0][2];
  const r = run(rows, { specs: "cfg:1" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /warmup 2, PF-qualified 0/);
  const bad = run(rows, { specs: "cfg:0" });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /invalid close window/);
});
