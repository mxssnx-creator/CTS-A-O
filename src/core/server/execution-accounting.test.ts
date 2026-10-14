import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { cachedClient, liveKv, resetLiveBackoff, stepLive, type LiveStatus } from "./live.server.ts";
import { SimExchange, fakeRt, lane } from "../test-support.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";

describe("execution accounting integrity", () => {
  afterEach(() => { resetLiveBackoff(); mock.timers.reset(); });

  it("an account snapshot keeps its original read time while the control and caches keep running", async () => {
    const now = 1_790_000_000_000;
    mock.timers.enable({ apis: ["Date"], now });
    const rt = fakeRt(new CoreDb(":memory:")).rt as unknown as CoreRuntime;
    const raw = new SimExchange().withEquity(100);
    let reads = 0;
    raw.account = async () => {
      reads++;
      return { at: now - 10_000, wallet: 100, equity: 100, unrealized: 0, realized: -2, usedMargin: 0, availableMargin: 100 };
    };
    const ex = cachedClient({
      hasKeys: () => raw.hasKeys(), fingerprint: () => raw.fingerprint(), book: () => raw.book(),
      contracts: () => raw.contracts(), order: (p) => raw.order(p), cancel: (s, id) => raw.cancel(s, id),
      account: raw.account,
    }, 1000);
    await stepLive(rt, [], 1, ex);
    mock.timers.tick(20_000);
    await stepLive(rt, [], 1, ex);
    assert.equal(reads, 1);
    const a = liveKv<LiveStatus>(rt.db, "liveStatus")?.account;
    assert.equal(a?.at, now - 10_000, "the same cached balance must not acquire a newer timestamp");
    assert.equal(a?.source, "exchange");
    assert.equal(a?.wallet, 100);
    assert.equal(a?.realized, -2, "the account's cumulative realized number stays distinct from ledger P&L");
  });

  it("the real fill price and commission survive a crash between snapshots with the order ledger", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-execution-"));
    try {
      const db = new CoreDb(":memory:");
      db.journalPath = join(dir, "orders.journal");
      const rt = fakeRt(db).rt;
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const ex = new SimExchange();
      const order = ex.order.bind(ex);
      ex.order = async (p) => {
        await order(p);
        return p.type === "MARKET" ? { order: { avgPrice: 10.2, executedQty: p.quantity, commission: -.017 } } : undefined;
      };
      await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
      const actual = db.all("SELECT coid, qty, ref_px, fill_px, fee FROM live_fills");
      assert.equal(actual.length, 1);
      const restored = new CoreDb(":memory:");
      restored.journalPath = db.journalPath;
      restored.replayJournal();
      assert.deepEqual(restored.all("SELECT coid, qty, ref_px, fill_px, fee FROM live_fills"), actual);
      assert.ok(restored.get("SELECT coid FROM live_orders WHERE kind = 'O' AND status = 'ok'"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
