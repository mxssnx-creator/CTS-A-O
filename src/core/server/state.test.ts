// Durable state: settings, presets and backtest results survive a restart; other kv keys do not.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, chmodSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CoreDb } from "./db.server.ts";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("durable state", () => {
  it("persists durable keys across a restart and ignores the rest", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-state-"));
    const path = join(dir, "sub", "state.json");
    const a = new CoreDb(":memory:", { statePath: path });
    a.kvSet("presets", [{ id: "x" }]);
    a.kvSet("presetBacktests", { x: [{ days: 2, pf: 1.3 }] });
    a.kvSet("pipeline", { big: true });
    await wait(1300);
    assert.ok(existsSync(path));
    const j = JSON.parse(readFileSync(path, "utf8"));
    assert.deepEqual(Object.keys(j).sort(), ["presetBacktests", "presets"]);
    const b = new CoreDb(":memory:", { statePath: path });
    assert.deepEqual(b.kvGet("presets"), [{ id: "x" }]);
    assert.equal(b.kvGet("pipeline"), undefined);
  });

  it("restoring an older snapshot never rolls newer durable keys back", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-snap-"));
    const path = join(dir, "state.json");
    const snap = join(dir, "snap.db");
    const a = new CoreDb(":memory:", { statePath: path });
    a.kvSet("settings", { symbols: 20 });
    a.kvSet("pipeline", { from: "snapshot" });
    assert.ok(a.snapshot(snap));
    // newer settings and a preset saved after the snapshot, then a crash
    a.kvSet("settings", { symbols: 33 });
    a.kvSet("presets", [{ id: "p1" }, { id: "p2" }]);
    a.flushState();
    const b = new CoreDb(":memory:", { statePath: path });
    assert.ok(b.restore(snap));
    assert.deepEqual(b.kvGet("settings"), { symbols: 33 });
    assert.equal((b.kvGet("presets") as unknown[]).length, 2);
    assert.deepEqual(b.kvGet("pipeline"), { from: "snapshot" }, "non-durable keys come back");
    // no state file: the snapshot fills the durable keys too
    const c = new CoreDb(":memory:");
    assert.ok(c.restore(snap));
    assert.deepEqual(c.kvGet("settings"), { symbols: 20 });
  });

  it("persists named per-connection pending executions and preserves newer reservations over old snapshots", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-entry-state-"));
    const path = join(dir, "state.json"), snap = join(dir, "snap.db");
    try {
      const a = new CoreDb(":memory:", { statePath: path });
      const k1 = "entriesPendingExecutions|bingx-vst-01", k2 = "entriesPendingExecutions|bingx-vst-02";
      const entry = { e: { kind: "E", sentQty: 1, oid: "entry-a", unresolved: true } };
      const exit = { c: { kind: "C", sentQty: 2, oid: "exit-b", unresolved: true } };
      a.kvSet(k1, entry); a.kvSet(k2, exit); a.kvSet("entriesPendingExecutions|", { malformed: true });
      a.kvSet("entriesPendingExecutionsX|ignored", { ignored: true });
      assert.ok(a.flushState()); assert.ok(a.snapshot(snap));
      const latestEntry = { e: { ...entry.e, sentQty: .5 } };
      a.kvSet(k1, latestEntry); a.kvSet(k2, {}); a.kvSet("entriesPendingExecutions|third", exit);
      assert.ok(a.flushState());
      const state = JSON.parse(readFileSync(path, "utf8"));
      assert.deepEqual(state[k1], latestEntry); assert.deepEqual(state[k2], {});
      assert.deepEqual(state["entriesPendingExecutions|third"], exit);
      assert.equal(state["entriesPendingExecutions|"], undefined);
      assert.equal(state["entriesPendingExecutionsX|ignored"], undefined);
      const b = new CoreDb(":memory:", { statePath: path });
      assert.ok(b.restore(snap));
      assert.deepEqual(b.kvGet(k1), latestEntry, "older snapshot cannot replace newer connection state");
      assert.deepEqual(b.kvGet(k2), {}, "a completed reservation cannot be resurrected");
      assert.deepEqual(b.kvGet("entriesPendingExecutions|third"), exit, "a newer connection survives restore");
      const c = new CoreDb(":memory:");
      assert.ok(c.restore(snap));
      assert.deepEqual(c.kvGet(k1), entry, "snapshot fills missing connection state");
      assert.deepEqual(c.kvGet(k2), exit);
      a.db.close(); b.db.close(); c.db.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("a read-only location falls back to memory without throwing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-ro-"));
    const ro = join(dir, "ro");
    mkdirSync(ro);
    chmodSync(ro, 0o500);
    const a = new CoreDb(":memory:", { statePath: join(ro, "x", "state.json") });
    a.kvSet("settings", { a: 1 });
    await wait(1300);
    assert.deepEqual(a.kvGet("settings"), { a: 1 });
  });
});
