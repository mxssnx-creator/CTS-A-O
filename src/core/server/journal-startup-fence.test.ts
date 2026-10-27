import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { stepLive } from "./live.server.ts";
import { fakeRt, SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const fixture = () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-startup-journal-")); dirs.push(dir);
  return { snapshot: join(dir, "core.sqlite"), state: join(dir, "state.json") };
};
const put = (db: CoreDb, id: string) => db.runDurable(
  "INSERT OR REPLACE INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
  id, "control|S1-USDT|1", "S1-USDT", 1, "O", 1, 17, "ok", "", 100);
const boot = (snapshot: string, state: string) => {
  const db = new CoreDb(":memory:", { statePath: state });
  const runtime = new CoreRuntime(db, { symbols: 1 }, { market: "synthetic", priceStream: null, snapshotPath: snapshot });
  runtime.start(); runtime.stop(); // stop scheduled compute before any network or worker can run
  return { db, runtime };
};
const close = (db: CoreDb, runtime: CoreRuntime) => { runtime.dispose(); db.db.close(); };
const ids = (db: CoreDb) => db.all<{ coid: string }>("SELECT coid FROM live_orders ORDER BY coid").map((r) => r.coid);

async function assertLiveHeld(db: CoreDb) {
  const { rt } = fakeRt(db), ex = new SimExchange();
  ex.positions.set("S1-USDT|LONG", 1);
  ex.orders.push({ id: "existing-stop", symbol: "S1-USDT", venueSymbol: "S1-USDT", positionSide: "LONG",
    type: "STOP_MARKET", clientOrderId: "external-protection", qty: 1, stopPrice: 16 });
  let cancelled = 0;
  ex.cancel = async () => { cancelled++; return true; };
  for (const mode of ["overall", "entries"] as const) {
    rt.settings.live.mode = mode;
    const st = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.equal(st.enabled, false);
    assert.match(st.reason, /journal unavailable.*reconciliation required/);
    assert.equal(st.placed + st.closed + st.cancelled, 0);
  }
  assert.equal(cancelled, 0);
  assert.equal(ex.log.length, 0);
  assert.equal(ex.positions.get("S1-USDT|LONG"), 1);
  assert.equal(ex.orders[0]?.id, "existing-stop");
}

test("a pristine startup without snapshot or journal artifacts is not fenced", () => {
  const { snapshot, state } = fixture(), { db, runtime } = boot(snapshot, state);
  assert.equal(db.lastJournalError, "");
  assert.deepEqual(ids(db), []);
  close(db, runtime);
});

test("a validated snapshot and journal replay all records on startup", () => {
  const { snapshot, state } = fixture(), writer = new CoreDb(":memory:");
  writer.journalPath = `${snapshot}.journal`; put(writer, "baseline");
  assert.equal(writer.snapshot(snapshot), true); put(writer, "after-snapshot"); writer.db.close();
  const { db, runtime } = boot(snapshot, state);
  assert.equal(db.lastJournalError, "");
  assert.deepEqual(ids(db), ["after-snapshot", "baseline"]);
  close(db, runtime);
});

for (const corrupt of ["torn", "malformed-middle"] as const)
  test(`${corrupt} journal replay is atomic and holds live on both modes`, async () => {
    const { snapshot, state } = fixture(), writer = new CoreDb(":memory:");
    writer.journalPath = `${snapshot}.journal`; put(writer, "baseline");
    assert.equal(writer.snapshot(snapshot), true); put(writer, "after-snapshot");
    appendFileSync(`${snapshot}.journal`, corrupt === "torn" ? '["INSERT INTO live_or' : "not-json\n");
    if (corrupt === "malformed-middle") put(writer, "following-bad-record");
    writer.db.close();
    const snapshotBytes = readFileSync(snapshot), journalBytes = readFileSync(`${snapshot}.journal`);
    const { db, runtime } = boot(snapshot, state);
    assert.match(db.lastJournalError, /malformed record/);
    assert.deepEqual(ids(db), ["baseline"], "no apparently good journal prefix is accepted");
    await assertLiveHeld(db);
    assert.equal(runtime.shutdown().snapshot, false);
    assert.deepEqual(readFileSync(snapshot), snapshotBytes, "shutdown preserves the recoverable snapshot");
    assert.deepEqual(readFileSync(`${snapshot}.journal`), journalBytes, "shutdown preserves the journal for reconciliation");
    close(db, runtime);
  });

for (const damage of ["missing-snapshot", "corrupt-snapshot", "rotated-journal"] as const)
  test(`${damage} with a journal and state cannot be adopted as a fresh ledger`, async () => {
    const { snapshot, state } = fixture(), writer = new CoreDb(":memory:", { statePath: state });
    writer.journalPath = `${snapshot}.journal${damage === "rotated-journal" ? ".prev" : ""}`;
    writer.kvSet("liveLaneOpen", { a: { cfg: "a", sym: "S1-USDT", side: 1, t: 1, px: 17 } });
    assert.equal(writer.flushState(), true); put(writer, "unknown-suffix"); writer.db.close();
    if (damage === "corrupt-snapshot") writeFileSync(snapshot, "not a sqlite snapshot");
    const { db, runtime } = boot(snapshot, state);
    assert.match(db.lastJournalError, /snapshot unavailable.*reconciliation/);
    assert.deepEqual(ids(db), [], "an unproven journal suffix is not replayed");
    assert.ok(db.kvGet("liveLaneOpen"), "existing state remains available for reconciliation");
    await assertLiveHeld(db);
    const journalPath = `${snapshot}.journal${damage === "rotated-journal" ? ".prev" : ""}`;
    const before = readFileSync(journalPath);
    assert.equal(runtime.shutdown().snapshot, false);
    assert.deepEqual(readFileSync(journalPath), before);
    if (damage === "missing-snapshot" || damage === "rotated-journal") assert.equal(existsSync(snapshot), false);
    else assert.equal(readFileSync(snapshot, "utf8"), "not a sqlite snapshot");
    close(db, runtime);
  });

test("a leftover unfinished snapshot also holds live on startup", async () => {
  const { snapshot, state } = fixture();
  writeFileSync(`${snapshot}.tmp`, "unfinished backup");
  const { db, runtime } = boot(snapshot, state);
  assert.match(db.lastJournalError, /snapshot unavailable.*reconciliation/);
  await assertLiveHeld(db);
  runtime.start(); runtime.stop();
  assert.match(db.lastJournalError, /snapshot unavailable.*reconciliation/, "restarting cannot silently release the fence");
  close(db, runtime);
});
