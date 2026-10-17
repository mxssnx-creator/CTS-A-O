import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, type MarketFeed } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { syntheticCandles } from "../market/bars.ts";

const M = 60_000;
const endT = Date.UTC(2026, 9, 16, 21);
const symbols = Array.from({ length: 8 }, (_, i) => `PRE${i}-USDT`);
const settings = {
  symbols: symbols.length,
  forceSymbols: symbols,
  symbolRank: "volume" as const,
  historyDays: 1,
  tfDays: { "1": 1, "5": 1, "15": 1, "30": 1 },
};
function source() {
  let inFlight = 0,
    maxInFlight = 0;
  const requested: string[] = [];
  const feed: Partial<MarketFeed> = {
    tickers: async () =>
      symbols.map((sym, i) => ({ sym, last: 1, quoteVol: 1e9 - i, changePct: 0 })),
    history: async (sym, tf, count) => {
      requested.push(sym);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight--;
      return syntheticCandles(sym, tf, Math.min(count, 300), endT - M);
    },
    klines: async () => [],
  };
  return { feed, requested, maxInFlight: () => maxInFlight };
}
const sync = (rt: CoreRuntime) =>
  (rt as unknown as { gen: number; syncMarket(gen: number): Promise<boolean> }).syncMarket(
    (rt as unknown as { gen: number }).gen,
  );
const pending = (rt: CoreRuntime) =>
  (rt as unknown as { prehistPending: boolean }).prehistPending;

describe("offline replay startup", () => {
  it("loads the entire forced universe before its first compute while retaining four concurrent loads", async () => {
    const data = source();
    const rt = new CoreRuntime(new CoreDb(":memory:"), settings, {
      market: "bingx",
      replay: true,
      replayPreloadAll: true,
      evaluationFromT: endT - 2 * 3_600_000,
      feed: data.feed,
      priceStream: null,
    });
    try {
      assert.equal(rt.status.computes, 0);
      await sync(rt);
      assert.equal(rt.status.computes, 0, "loading never starts a partial indication computation");
      assert.equal(rt.replayPreloadAll, true);
      assert.deepEqual([...rt.candles.keys()], symbols);
      assert.deepEqual(data.requested, symbols);
      assert.equal(data.maxInFlight(), 4, "preloading retains the existing bounded loader");
      assert.equal(pending(rt), false);
      for (const cs of rt.candles.values()) {
        assert.equal(cs.n, 300);
        assert.equal(cs.lastT(), endT - M, "the supplied completed-bar cutoff is preserved");
      }
    } finally {
      rt.dispose();
      rt.db.db.close();
    }
  });

  it("keeps progressive startup for ordinary runtimes and replays without the explicit option", async () => {
    for (const replay of [false, true]) {
      const data = source();
      const rt = new CoreRuntime(new CoreDb(":memory:"), settings, {
        market: "bingx",
        replay,
        feed: data.feed,
        priceStream: null,
      });
      try {
        await sync(rt);
        assert.equal(rt.replayPreloadAll, false);
        assert.equal(rt.candles.size, 5);
        assert.equal(pending(rt), true);
        assert.deepEqual(data.requested, symbols.slice(0, 5));
      } finally {
        rt.dispose();
        rt.db.db.close();
      }
    }
  });

  it("rejects preloading on a non-replay or connected runtime before startup", () => {
    for (const options of [{ replay: false }, { replay: true, conn: "bingx-x01" as const }]) {
      const db = new CoreDb(":memory:");
      try {
        assert.throws(
          () =>
            new CoreRuntime(db, settings, {
              ...options,
              replayPreloadAll: true,
              priceStream: null,
            }),
          /restricted to unconnected replays/,
        );
      } finally {
        db.db.close();
      }
    }
  });
});
