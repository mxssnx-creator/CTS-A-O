// The realtime market loop: while a compute runs (minutes), newly closed bars are still pulled every cycle — the
// paper / live side and the realtime entry step see the current market, and the next cycle computes on them.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, realtimeBarDue, type MarketFeed } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { syntheticCandles } from "../market/bars.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { blockingBanUntil, clearRateLimit, KLINES, noteRateLimit, rateLimitedUntil, TICKERS } from "../exchange/bingx.server.ts";

const M = 60_000;

describe("realtime market loop", () => {
  it("polls a finalized candle after a short publication grace, not after a second full timeframe", () => {
    const t = Date.UTC(2026, 9, 16, 12, 0);
    assert.equal(realtimeBarDue(t, t + M + 1_999, 1), false);
    assert.equal(realtimeBarDue(t, t + M + 2_000, 1), true);
    assert.equal(realtimeBarDue(t, t + 2 * M, 1), true);
    assert.equal(realtimeBarDue(t, t + 60_000 + 2_000, 5), false);
    assert.equal(realtimeBarDue(t, t + 5 * M + 2_000, 5), true);
    assert.equal(realtimeBarDue(t, t + M + 2_000, 0), false);
  });

  it("pulls closed bars during a compute, marks them for the next cycle, and never two pulls at once", async () => {
    const now = Math.floor(Date.now() / M) * M;
    let calls = 0;
    const feed: Partial<MarketFeed> = {
      tickers: async () => [{ sym: "AAA-USDT", last: 1, quoteVol: 1e9, changePct: 0 }],
      klines: async (_sym, _tf, o) => {
        calls++;
        await new Promise((r) => setTimeout(r, 30));
        const out = [];
        for (let t = (o?.startT ?? 0) - 1 + M; t <= now - 2 * M; t += M) out.push({ t, o: 1, h: 1, l: 1, c: 1, v: 1 });
        return out;
      },
    };
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1, cycleMs: 250 } as never, {
      market: "bingx",
      priceStream: null,
      feed,
    });
    const R = rt as unknown as Record<string, unknown> & { candles: Map<string, CandleSeries> };
    // one symbol, five bars behind; the cycle is in a compute (room for the new bars after the old ones: they are
    // written in place, past every bar the compute's series covers)
    const old = CandleSeries.fromCandles(
      Array.from({ length: 50 }, (_, i) => ({ t: now - (56 - i) * M, o: 1, h: 1, l: 1, c: 1, v: 1 })),
      50,
      64,
    );
    R.candles.set("AAA-USDT", old);
    rt.status.source = "bingx";
    rt.status.state = "computing";
    R.busy = true;
    R.backfillKey = "set";
    R.barsPending = false;
    await rt.tick();
    await rt.tick();
    // the pull is in flight: a second tick starts no second one
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(calls, 1, "one pull, not one per tick");
    const cs = R.candles.get("AAA-USDT")!;
    assert.ok(cs.n > old.n, `bars added (${cs.n})`);
    assert.equal(cs.lastT(), now - 2 * M);
    assert.ok(CandleSeries.sharesBuffer(old, cs), "appended in place");
    assert.ok(old.n === 50 && old.lastT()! === now - 7 * M && old.lastT()! < cs.lastT()!, "the compute's series is unchanged");
    assert.equal(R.barsPending, true, "the next cycle computes on them");
    // not computing: the cycle pulls itself, the loop stays out
    rt.status.state = "running";
    R.marketPullAt = 0;
    await rt.tick();
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(calls, 1);
    rt.stop();
  });

  it("progressive start: a loaded batch's bars keep up while the next batch loads", async () => {
    // until the last batch was loaded every cycle took the backfill branch (missing symbols only) and the market loop
    // waited for the whole universe: the first batch's bars stayed at its load time, its tapes took no new entry
    const now = Math.floor(Date.now() / M) * M;
    const syms = Array.from({ length: 8 }, (_, i) => `S${String.fromCharCode(65 + i)}-USDT`);
    // 8 symbols: batches of 5 and 3; the first batch loaded six bars ago, the second loads current bars
    let historyEnd = now - 6 * M;
    const feed: Partial<MarketFeed> = {
      tickers: async () => syms.map((sym, i) => ({ sym, last: 1, quoteVol: 1e9 - i, changePct: 0 })),
      history: async (sym, tf, bars) => syntheticCandles(sym, tf, bars, historyEnd),
      klines: async (_sym, _tf, o) => {
        const out = [];
        for (let t = (o?.startT ?? 0) - 1 + M; t <= now - 2 * M; t += M) out.push({ t, o: 1, h: 1, l: 1, c: 1, v: 1 });
        return out;
      },
    };
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { symbols: 8, historyDays: 1, symbolRank: "volume", cycleMs: 60_000 } as never,
      { market: "bingx", priceStream: null, feed },
    );
    const R = rt as unknown as { gen: number; syncMarket(gen: number): Promise<boolean> };
    await R.syncMarket(R.gen);
    assert.equal(rt.candles.size, 5, "the first batch");
    const first = [...rt.candles.keys()][0];
    assert.equal(rt.candles.get(first)!.lastT(), now - 6 * M);
    historyEnd = now - M;
    await R.syncMarket(R.gen);
    assert.equal(rt.candles.size, 8, "the second batch");
    assert.equal(rt.candles.get(first)!.lastT(), now - 2 * M, "the first batch caught up to the last closed bar");
    assert.equal(rt.candles.get(syms[7])!.lastT(), now - M, "the new batch is current already");
    rt.stop();
  });

  it("a klines ban is held to the klines endpoint: the pull waits it out, the live step goes on", async () => {
    // x01, 14 Oct: the klines endpoint answered 100410 "请稍后重试" (no end, no endpoint) 7–13 times an hour; noted as
    // "*", every ban paused the whole live step for ~2 min
    const now = Math.floor(Date.now() / M) * M;
    let calls = 0;
    let tickerCalls = 0;
    const feed: Partial<MarketFeed> = {
      tickers: async () => {
        tickerCalls++;
        throw new Error("BingX 100410: 请稍后重试");
      },
      klines: async () => {
        calls++;
        throw new Error("BingX 100410: 请稍后重试");
      },
    };
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 2, cycleMs: 250 } as never, {
      market: "bingx",
      priceStream: null,
      feed,
    });
    const R = rt as unknown as { gen: number; candles: Map<string, CandleSeries>; pullNewBars(gen: number): Promise<number> };
    for (const sym of ["AAA-USDT", "BBB-USDT"])
      R.candles.set(sym, CandleSeries.fromCandles(Array.from({ length: 50 }, (_, i) => ({ t: now - (56 - i) * M, o: 1, h: 1, l: 1, c: 1, v: 1 }))));
    rt.status.source = "bingx";
    try {
      assert.equal(await R.pullNewBars(R.gen), 0);
      // (asks already in flight when the ban came back are answered; none starts after it)
      const asked = calls;
      assert.ok(asked >= 1 && asked <= 2);
      const t = Date.now();
      assert.ok(rateLimitedUntil(t, KLINES) > t + 60_000, "held to the klines endpoint");
      assert.equal(rateLimitedUntil(t, "*"), 0, "not a ban of every call");
      assert.equal(blockingBanUntil(t), 0, "the live step goes on");
      await R.pullNewBars(R.gen);
      assert.equal(calls, asked, "nothing is asked during the ban");
      // a ticker ban (the live prices' REST fallback) is held to the ticker endpoint the same way
      await rt.freshTickers();
      assert.equal(tickerCalls, 1);
      assert.ok(rateLimitedUntil(Date.now(), TICKERS) > Date.now());
      assert.equal(blockingBanUntil(), 0);
      (rt as unknown as { restTickersAt: number }).restTickersAt = 0;
      await rt.freshTickers();
      assert.equal(tickerCalls, 1, "no ticker read during its ban");
    } finally {
      clearRateLimit();
      rt.stop();
    }
  });

  it("paces the bar pull: two asks at a time, a symbol with no new bar backed off, a ban's end not a burst", async () => {
    // x01, 14 Oct: 60 symbols × 1m all asked at second 0, re-asked every second while the bar was not published,
    // 6 at a time, and all again the instant a ban lifted — 7–13 klines bans an hour
    const now = Math.floor(Date.now() / M) * M;
    let calls = 0;
    let inFlight = 0;
    let peak = 0;
    let ban = false;
    const feed: Partial<MarketFeed> = {
      tickers: async () => [],
      klines: async () => {
        calls++;
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 20));
        inFlight--;
        if (ban) throw new Error("BingX 100410: 请稍后重试");
        return []; // the bar is not published yet
      },
    };
    const syms = Array.from({ length: 8 }, (_, i) => `P${String.fromCharCode(65 + i)}-USDT`);
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 8, cycleMs: 250 } as never, {
      market: "bingx",
      priceStream: null,
      feed,
    });
    const R = rt as unknown as { gen: number; candles: Map<string, CandleSeries>; pullNewBars(gen: number): Promise<number> };
    // five bars behind: due at once, whatever their offsets
    for (const sym of syms)
      R.candles.set(sym, CandleSeries.fromCandles(Array.from({ length: 50 }, (_, i) => ({ t: now - (55 - i) * M, o: 1, h: 1, l: 1, c: 1, v: 1 }))));
    rt.status.source = "bingx";
    try {
      assert.equal(await R.pullNewBars(R.gen), 0);
      assert.equal(calls, syms.length, "every due symbol asked once");
      assert.ok(peak <= 2, `${peak} asks in flight at once`);
      assert.equal(rt.status.marketCalls?.klines, syms.length);
      assert.equal(rt.status.marketCalls?.empty, syms.length);
      // nothing new: not asked again within the 2 s backoff (the old gate re-asked after 1 s)
      await new Promise((r) => setTimeout(r, 1_100));
      await R.pullNewBars(R.gen);
      assert.equal(calls, syms.length, "backed off");
      await new Promise((r) => setTimeout(r, 1_000));
      // a ban comes back: noted under klines, counted
      ban = true;
      await R.pullNewBars(R.gen);
      const asked = calls;
      assert.ok(asked > syms.length && asked <= syms.length + 2, `${asked - syms.length} asked into the ban`);
      assert.equal(rt.status.marketCalls?.bans, 1);
      assert.ok(rateLimitedUntil(Date.now(), KLINES) > Date.now());
      // the ban is gone (here: cleared), but the pull resumes at its end plus each symbol's offset — not at once
      ban = false;
      clearRateLimit();
      await R.pullNewBars(R.gen);
      assert.equal(calls, asked, "no burst at the ban's end");
    } finally {
      clearRateLimit();
      rt.stop();
    }
  });

  it("the gap repair sends nothing during a klines ban (its history pages are the klines endpoint)", async () => {
    const now = Math.floor(Date.now() / M) * M;
    let history = 0;
    const feed: Partial<MarketFeed> = {
      tickers: async () => [],
      klines: async () => [],
      history: async () => {
        history++;
        return [];
      },
    };
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1, cycleMs: 250 } as never, {
      market: "bingx",
      priceStream: null,
      feed,
    });
    const R = rt as unknown as {
      gen: number;
      backfillKey: string;
      settings: { symbols: number; tfMin: number; historyDays: number; symbolRank: string; symbolOffset?: number; forceSymbols?: string[] };
      candles: Map<string, CandleSeries>;
      syncMarket(gen: number): Promise<boolean>;
    };
    // 400 bars behind: the gap repair's case
    R.candles.set("GAP-USDT", CandleSeries.fromCandles(Array.from({ length: 60 }, (_, i) => ({ t: now - (460 - i) * M, o: 1, h: 1, l: 1, c: 1, v: 1 }))));
    const s = R.settings;
    R.backfillKey = `${s.symbols}|${s.tfMin}|${s.historyDays}|${s.symbolRank}|${s.symbolOffset ?? 0}|${(s.forceSymbols ?? []).join(",")}`;
    rt.status.source = "bingx";
    try {
      noteRateLimit("BingX 100410: 请稍后重试", Date.now(), KLINES);
      await R.syncMarket(R.gen);
      assert.equal(history, 0, "no history page during the klines ban");
      clearRateLimit();
      await R.syncMarket(R.gen);
      assert.equal(history, 1, "repaired once the ban is over");
    } finally {
      clearRateLimit();
      rt.stop();
    }
  });
});
