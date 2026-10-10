// A symbol the exchange refuses during the backfill (BingX 100410 "retry later", a timeout) is loaded again on the next
// cycles. A short history (a new listing) is not an error and is not retried for ever. 10 Oct, local run: SAFE, STRK and S
// were refused in the last batch of a 50-symbol start; the batch skipped them, the start was declared complete, and the
// engine ran on 47 symbols for as long as the process lived.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { syntheticCandles } from "../market/bars.ts";
import { CoreRuntime, small, stopStarted } from "./runtime-harness.ts";

afterEach(stopStarted);

describe("the backfill loads a symbol the exchange refused again", { timeout: 300_000 }, () => {
  const tickers = Array.from({ length: 20 }, (_, i) => ({
    sym: `T${String(i).padStart(2, "0")}-USDT`,
    last: 1,
    quoteVol: 1e9 - i,
    changePct: 0,
  }));
  const end = Math.floor(Date.now() / 60_000) * 60_000 - 60_000;
  /** failFirst: the first N history calls of a symbol throw; short: symbols whose history is too short to use */
  const make = (failFirst: Record<string, number>, short: string[] = []) => {
    const calls: Record<string, number> = {};
    const feed = {
      tickers: async () => tickers,
      history: async (sym: string, tf: number, bars: number) => {
        calls[sym] = (calls[sym] ?? 0) + 1;
        if (calls[sym] <= (failFirst[sym] ?? 0)) throw new Error("BingX 100410: retry later");
        const cs = syntheticCandles(sym.replace("-USDT", ""), tf, bars, end);
        return short.includes(sym) ? cs.slice(-10) : cs;
      },
      klines: async () => [],
    };
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { ...small, historyDays: 1, symbolRank: "volume", symbols: 12 },
      { market: "bingx", feed },
    );
    // a few ms between the retry rounds in a test (the wait loop still runs: round n waits n × 5 ms)
    (rt as unknown as { backfillRetryMs: number }).backfillRetryMs = 5;
    return { rt, calls };
  };
  const sync = (rt: CoreRuntime) =>
    (rt as unknown as { syncMarket: (gen: number) => Promise<boolean> }).syncMarket(rt.generation);
  const pending = (rt: CoreRuntime) => (rt as unknown as { prehistPending: boolean }).prehistPending;
  const retries = (rt: CoreRuntime) => (rt as unknown as { prehistRetries: number }).prehistRetries;
  /** syncs until the start has nothing left to load (or the cap); what each sync reported (new data or not) */
  const run = async (rt: CoreRuntime, cap = 16) => {
    const returns: boolean[] = [];
    do {
      returns.push(await sync(rt));
    } while (pending(rt) && returns.length < cap);
    return returns;
  };

  it("symbols refused in the middle batches and in the last one all end up loaded", async () => {
    // T03 fails twice, T07 three times: the last batch still holds T07 (the old code skipped it for good)
    const { rt } = make({ "T03-USDT": 2, "T07-USDT": 3 });
    await run(rt);
    rt.stop();
    const loaded = [...rt.candles.keys()].sort();
    assert.equal(rt.candles.size, 12, `loaded ${loaded.length}: missing ${tickers.slice(0, 12).map((t) => t.sym).filter((s) => !rt.candles.has(s)).join(",")}`);
    assert.equal(pending(rt), false);
  });

  it("a short history is skipped, and does not keep the start open for ever", async () => {
    const { rt, calls } = make({}, ["T11-USDT"]);
    const returns = await run(rt);
    rt.stop();
    assert.equal(rt.candles.size, 11);
    assert.ok(!rt.candles.has("T11-USDT"));
    assert.equal(pending(rt), false, "the start is complete");
    assert.ok(returns.length <= 6, `${returns.length} cycles`);
    assert.ok(calls["T11-USDT"] <= 2, `the short symbol was asked ${calls["T11-USDT"]} times`);
  });

  it("a symbol that never answers is retried a bounded number of times, then the start completes without it", async () => {
    const { rt, calls } = make({ "T05-USDT": 1e9 });
    const returns = await run(rt, 30);
    rt.stop();
    assert.equal(rt.candles.size, 11);
    assert.ok(!rt.candles.has("T05-USDT"));
    assert.equal(pending(rt), false, "the start is complete");
    assert.ok(returns.length < 30, "the retries stopped on their own");
    // the batches that still held it plus the retry rounds, never an endless loop
    assert.ok(calls["T05-USDT"] >= 3 && calls["T05-USDT"] <= 10, `asked ${calls["T05-USDT"]} times`);
    // the rounds spent, the count starts over (a later backfill does not inherit the waits)
    assert.equal(retries(rt), 0);
    // a round that loaded nothing reports no new data (no recompute on identical candles); the one that ends the start does
    assert.ok(returns.filter((r) => r === false).length >= 3, `empty rounds: ${returns.join(",")}`);
    assert.equal(returns[returns.length - 1], true, "the round that ends the start reports data");
  });

  it("a universe change during a retry wait ends the wait at once", async () => {
    const { rt } = make({ "T05-USDT": 1e9 });
    // batches until the first retry round is due
    while (retries(rt) === 0) await sync(rt);
    assert.equal(retries(rt), 1);
    (rt as unknown as { backfillRetryMs: number }).backfillRetryMs = 30_000;
    (rt as unknown as { prehistRetries: number }).prehistRetries = 1; // the next round would wait 30 s
    const t0 = Date.now();
    setTimeout(() => ((rt as unknown as { resetUniverse: boolean }).resetUniverse = true), 150);
    const reported = await sync(rt);
    rt.stop();
    assert.equal(reported, false);
    assert.ok(Date.now() - t0 < 5_000, `waited ${Date.now() - t0} ms`);
  });
});
