// Durable state: settings, presets and backtest results survive a restart; other kv keys do not.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, chmodSync, mkdirSync } from "node:fs";
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
