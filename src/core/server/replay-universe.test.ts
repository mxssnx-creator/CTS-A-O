import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, type MarketFeed } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { syntheticCandles } from "../market/bars.ts";

const END = Date.UTC(2026, 9, 17, 12);
const SYMBOLS = Array.from({ length: 12 }, (_, i) => `S${String.fromCharCode(65 + i)}-USDT`);
const settings = { symbols: 12, historyDays: 1, symbolRank: "volume" as const, cycleMs: 60_000 };

function fixture(completeReplayUniverse?: boolean) {
  const requested: string[] = [];
  const feed: Partial<MarketFeed> = {
    tickers: async () => SYMBOLS.map((sym, i) => ({ sym, last: 1, quoteVol: 1e9 - i, changePct: 0 })),
    history: async (sym, tf, bars) => {
      requested.push(sym);
      return syntheticCandles(sym, tf, bars, END);
    },
    klines: async () => [],
  };
  const runtime = new CoreRuntime(new CoreDb(":memory:"), settings, {
    market: "bingx", priceStream: null, feed, replay: true,
    ...(completeReplayUniverse === undefined ? {} : { completeReplayUniverse }),
  });
  return { runtime, requested, internals: runtime as unknown as {
    gen: number;
    prehistPending: boolean;
    syncMarket(gen: number): Promise<boolean>;
  } };
}

describe("complete frozen replay universe", () => {
  it("loads all twelve injected-feed symbols in the first backfill without an intermediate compute", async () => {
    const { runtime, requested, internals } = fixture(true);
    try {
      assert.equal(await internals.syncMarket(internals.gen), true);
      assert.equal(runtime.candles.size, 12);
      assert.deepEqual(new Set(requested), new Set(SYMBOLS));
      assert.equal(internals.prehistPending, false);
      assert.equal(runtime.status.computes, 0, "market loading alone never starts a partial-universe compute");
      assert.ok([...runtime.candles.values()].every((bars) => bars.n > 50 && bars.lastT() === END));
    } finally {
      runtime.dispose();
    }
  });

  for (const [mode, count] of [[undefined, 12], [false, 5]] as const) {
    it(`loads ${count} symbols on the first backfill when completeReplayUniverse is ${String(mode)}`, async () => {
      const { runtime, requested, internals } = fixture(mode);
      try {
        await internals.syncMarket(internals.gen);
        assert.equal(runtime.candles.size, count);
        assert.equal(requested.length, count);
        assert.equal(internals.prehistPending, count === 5);
        assert.equal(runtime.status.computes, 0);
      } finally {
        runtime.dispose();
      }
    });
  }

  it("rejects complete-universe loading on ordinary and connected runtimes", () => {
    assert.throws(() => new CoreRuntime(new CoreDb(":memory:"), settings, {
      completeReplayUniverse: true,
    }), /unconnected replays only/);
    assert.throws(() => new CoreRuntime(new CoreDb(":memory:"), settings, {
      replay: true, conn: "bingx-vst-02", completeReplayUniverse: true,
    }), /unconnected replays only/);
  });
});
