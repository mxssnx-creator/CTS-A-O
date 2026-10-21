// Replays score one frozen universe. Unlike a live desk's progressive start, they must not run the
// memory-heavy strategy calculation again after each quarter-universe backfill batch.
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { CandleSeries } from "../market/candle-series.ts";
import { syntheticCandles, resample } from "../market/bars.ts";
import { trackRuntimes } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const tracked = trackRuntimes();
afterEach(() => tracked.disposeAll());

const universe = Array.from({ length: 22 }, (_, i) => `LOAD${i}-USDT`);
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 5_000;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error("runtime did not reach the expected backfill state");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

function fixture(replay: boolean, firstFailure?: "reject" | "short") {
  // Fresh closed bars avoid incremental/gap repair calls; only the injected historical feed is involved.
  const end = Math.floor(Date.now() / 60_000) * 60_000;
  const bars = new Map(universe.map((sym) => [sym, syntheticCandles(sym, 1, 240, end)]));
  const attempts: string[] = [];
  const computed: string[][] = [];
  const failed = universe[8];
  let fail = !!firstFailure;
  const rt = tracked.track(new CoreRuntime(new CoreDb(":memory:"), {
    symbols: universe.length,
    symbolRank: "volume",
    historyDays: 1,
    tfMin: 1,
    cycleMs: 60_000,
    tickMs: 60_000,
  }, {
    replay,
    snapshotPath: "",
    priceStream: null,
    feed: {
      tickers: async () => universe.map((sym, i) => ({
        sym, last: 100, quoteVol: 10_000_000 - i, changePct: 1,
      })),
      history: async (sym) => {
        attempts.push(sym);
        if (sym === failed && fail) {
          fail = false;
          if (firstFailure === "reject") throw new Error("one transient cached-feed read failure");
          return bars.get(sym)!.slice(0, 10);
        }
        return bars.get(sym)!;
      },
      klines: async () => [],
    },
  }));
  // Exercise the real start → scheduled cycle → syncMarket path, while replacing only the expensive
  // strategy computation. Stopping here also prevents any paper, comparison, or live work afterward.
  (rt as unknown as { compute: (gen: number) => Promise<void> }).compute = async () => {
    computed.push([...rt.candles.keys()]);
    rt.stop();
  };
  return { rt, attempts, computed, failed };
}

describe("offline replay universe backfill", { timeout: 20_000 }, () => {
  it("starts a past 5m-distance replay through the actual ranker and keeps the clock replay-only", async () => {
    const cut = Date.UTC(2026, 9, 19, 12);
    const syms = ["PASTA-USDT", "PASTB-USDT"];
    const cs = syntheticCandles("past-rank", 1, 240, cut);
    const calls: number[] = [], computed: string[][] = [];
    const rt = tracked.track(new CoreRuntime(new CoreDb(":memory:"), {
      symbols: 2, symbolRank: "change1h5m", historyDays: 1, tfMin: 1,
      cycleMs: 60_000, tickMs: 60_000,
    }, { replay: true, snapshotPath: "", priceStream: null, feed: {
      rankingAt: cut,
      tickers: async () => syms.map((sym) => ({ sym, last: 100, quoteVol: 1e8, changePct: 0 })),
      history: async () => cs,
      klines: async (_sym, tf, opt) => {
        assert.equal(tf, 5); assert.equal(opt!.nowT, cut); calls.push(tf);
        return resample(cs, 1, 5).slice(-13);
      },
    } }));
    (rt as unknown as { compute: () => Promise<void> }).compute = async () => {
      computed.push([...rt.candles.keys()]); rt.stop();
    };
    rt.start(); await until(() => computed.length > 0);
    assert.deepEqual(computed[0].sort(), syms); assert.equal(calls.length, 2);
    const db = new CoreDb(":memory:");
    try {
      assert.throws(() => new CoreRuntime(db, {}, { feed: { rankingAt: cut } }), /unconnected replays only/);
      assert.throws(() => new CoreRuntime(db, {}, { replay: true, feed: { rankingAt: NaN } }), /finite historical clock/);
    } finally { db.db.close(); }
  });
  it("loads all 22 replay symbols before the first strategy compute", async () => {
    const { rt, attempts, computed } = fixture(true);
    rt.start();
    await until(() => computed.length > 0);
    assert.deepEqual(computed, [universe]);
    assert.deepEqual(attempts, universe);
  });

  it("keeps live start progressive: the first compute sees only the first six symbols", async () => {
    const { rt, attempts, computed } = fixture(false);
    rt.start();
    await until(() => computed.length > 0);
    assert.deepEqual(computed, [universe.slice(0, 6)]);
    assert.deepEqual(attempts, universe.slice(0, 6));
  });

  it("extends every existing short-history cache across progressive batches, including young symbols", async () => {
    const { rt, attempts } = fixture(false);
    const end = Math.floor(Date.now() / 60_000) * 60_000;
    for (const sym of universe)
      rt.candles.set(sym, CandleSeries.fromCandles(syntheticCandles(sym, 1, 200, end)));
    const sync = () => (rt as unknown as { syncMarket(gen: number): Promise<boolean> }).syncMarket(rt.generation);
    await sync();
    assert.equal(attempts.length, 6);
    assert.equal((rt as unknown as { prehistPending: boolean }).prehistPending, true, "existing symbols do not mark the history extension complete after one batch");
    await sync(); await sync(); await sync();
    assert.deepEqual(attempts, universe, "short but usable venue histories are not requested repeatedly ahead of later symbols");
    await sync();
    assert.deepEqual(attempts, universe, "completed span is not downloaded repeatedly");
  });

  for (const failure of ["reject", "short"] as const) {
    it(`does not compute a partial replay after a ${failure} history and retries only the missing symbol`, async () => {
      const { rt, attempts, computed, failed } = fixture(true, failure);
      rt.start();
      await until(() => rt.status.state === "error");
      assert.equal(rt.candles.size, 21);
      assert.deepEqual(computed, [], "an incomplete replay must not publish a strategy compute");
      assert.deepEqual(attempts, universe, "all requested cached histories are attempted before retry");
      assert.match(rt.status.error ?? "", /history|backfill|replay/i);

      // The scheduled retry uses backoff in production. Run that same cycle immediately in the fixture.
      await rt.cycle();
      assert.equal(computed.length, 1);
      assert.deepEqual([...computed[0]].sort(), [...universe].sort());
      assert.deepEqual(attempts, [...universe, failed]);
    });
  }
});
