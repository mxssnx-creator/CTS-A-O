// One runtime per connection: own database / settings / live state, forced connection, shared pool with a cap.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "cts-conns-"));
process.env.CTS_CORE_STATE = join(dir, "state.json");
process.env.CTS_CORE_SNAPSHOT = "";
process.env.CTS_CORE_PRIMARY_CONN = "bingx-vst-02";
process.env.CTS_CORE_CONNS = "bingx-vst-02";
process.env.CTS_CORE_WORKERS = "2";

const rtm = await import("./runtime.server.ts");
const { connPath } = await import("./db.server.ts");
const { closePool, poolQueue, poolWorkers, runOnWorkers } = await import("./pool.server.ts");
const { SharedFeed } = await import("../market/shared-feed.ts");

describe("connections", { timeout: 120_000 }, () => {
  after(async () => {
    for (const r of rtm.allRuntimes()) r.stop();
    await closePool();
    rmSync(dir, { recursive: true, force: true });
  });

  it("each connection has its own runtime, database and state file; Live always points at it", () => {
    const a = rtm.runtimeFor("bingx-vst-02", { start: false });
    const b = rtm.runtimeFor("bingx-x01", { start: false });
    const c = rtm.runtimeFor("bingx-vst-01", { start: false });
    assert.notEqual(a, b);
    assert.notEqual(a.db, b.db);
    assert.notEqual(b.db, c.db);
    assert.equal(a.settings.live.connId, "bingx-vst-02");
    assert.equal(b.settings.live.connId, "bingx-x01");
    // a new connection starts from the primary's settings, never with Live on
    assert.equal(b.settings.live.enabled, false);
    assert.equal(b.settings.symbols, a.settings.symbols);
    // the connection cannot be changed from its own settings
    b.updateSettings({ live: { ...b.settings.live, connId: "bingx-vst-02", enabled: false } });
    assert.equal(b.settings.live.connId, "bingx-x01");
    // a settings change on one connection does not reach another
    b.updateSettings({ symbols: a.settings.symbols + 3 });
    assert.equal(a.settings.symbols + 3, b.settings.symbols);
    // the same runtime comes back for the same connection
    assert.equal(rtm.runtimeFor("bingx-x01", { start: false }), b);
    assert.equal(connPath(join(dir, "state.json"), "bingx-x01"), join(dir, "state.bingx-x01.json"));
    assert.equal(connPath(null, "bingx-x01"), null);
  });

  it("only enabled connections run; the primary cannot be switched off", () => {
    assert.deepEqual(rtm.enabledConns(), ["bingx-vst-02"]);
    assert.throws(() => rtm.setConnEnabled("bingx-vst-02", false), /primary/);
    assert.equal(rtm.isConnId("bingx-x01"), true);
    assert.equal(rtm.isConnId("nope"), false);
  });

  it("events carry their connection", () => {
    const seen: string[] = [];
    const off = rtm.onCoreEvent((e) => seen.push(`${e.conn}:${e.type}`));
    const b = rtm.runtimeFor("bingx-x01", { start: false });
    b.updateSettings({ symbols: b.settings.symbols });
    off();
    assert.ok(seen.includes("bingx-x01:settings"), seen.join(","));
  });

  it("the shared feed sends one request for identical concurrent asks and copies the candles", async () => {
    let calls = 0;
    const candles = [{ t: 1, o: 1, h: 1, l: 1, c: 1, v: 1 }];
    const feed = new SharedFeed({
      tickers: async () => [],
      klines: async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 20));
        return candles;
      },
      history: async () => candles,
    });
    const [x, y, z] = await Promise.all([1, 2, 3].map(() => feed.klines("A-USDT", 1, { limit: 5 })));
    assert.equal(calls, 1);
    x[0].c = 99;
    assert.equal(y[0].c, 1);
    assert.equal(z[0].c, 1);
    // a different request is its own
    await feed.klines("B-USDT", 1, { limit: 5 });
    assert.equal(calls, 2);
  });

  it("parallel worker calls share one pool capped at the cores (queued, never more workers)", async () => {
    let peak = 0;
    const watch = setInterval(() => (peak = Math.max(peak, poolWorkers())), 5);
    const msgs = () => Array.from({ length: 4 }, () => ({ type: "ping" }));
    const res = await Promise.allSettled([runOnWorkers(msgs(), 2, 60_000), runOnWorkers(msgs(), 2, 60_000), runOnWorkers(msgs(), 2, 60_000)]);
    clearInterval(watch);
    assert.ok(peak <= 2, `peak workers ${peak}`);
    assert.equal(poolQueue(), 0);
    // every call settled (a worker may answer an unknown message with an error; nothing hangs)
    assert.equal(res.length, 3);
  });

  it("a priority call (a backtest someone waits for) is served before queued background work", async () => {
    const msgs = (n: number) => Array.from({ length: n }, () => ({ type: "ping" }));
    const order: string[] = [];
    const run = (name: string, n: number, priority: boolean) =>
      runOnWorkers(msgs(n), 2, 60_000, undefined, priority)
        .catch(() => undefined)
        .finally(() => order.push(name));
    // the background call holds both workers; the other two queue behind it
    const busy = run("busy", 8, false);
    const background = run("background", 2, false);
    const backtest = run("backtest", 2, true);
    await Promise.all([busy, background, backtest]);
    assert.ok(order.indexOf("backtest") < order.indexOf("background"), order.join(" → "));
    assert.equal(poolQueue(), 0);
  });
});
