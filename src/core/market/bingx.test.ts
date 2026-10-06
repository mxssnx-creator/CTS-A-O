// BingX public market data (bingx.ts) parsed from fixture JSON: no network. globalThis.fetch is replaced inside each
// test by a fake BingX that answers from fixtures and records the requested URLs, and restored afterwards (the test
// preload's network guard wraps fetch, so the fake is set on globalThis directly).
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { BINGX_HOSTS, fetchHistory, fetchKlines, fetchTickers } from "./bingx.ts";

const M = 60_000;
const NOW = Date.UTC(2026, 9, 1, 12, 30, 20); // 20 s into a minute
const realFetch = globalThis.fetch;
let urls: URL[] = [];

/** Serve `handler(url)` as BingX's JSON envelope ({ code: 0, data }), or the envelope itself when it has `code`. */
function fakeBingx(handler: (u: URL) => unknown) {
  urls = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const u = new URL(
      typeof input === "string" || input instanceof URL ? String(input) : input.url,
    );
    assert.ok(
      u.origin === BINGX_HOSTS.mainnet || u.origin === BINGX_HOSTS.testnet,
      `BingX host only: ${u}`,
    );
    urls.push(u);
    const out = handler(u);
    const body = out && typeof out === "object" && "code" in out ? out : { code: 0, data: out };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** a kline row as BingX v3 sends it (strings) */
const row = (
  t: number,
  o: number | string,
  h: number | string,
  l: number | string,
  c: number | string,
  v: unknown = "10",
) => ({
  open: String(o),
  close: String(c),
  high: String(h),
  low: String(l),
  volume: v,
  time: t,
});
const ok = (t: number, px = 100, v: unknown = "10") => row(t, px, px + 1, px - 1, px + 0.5, v);

describe("fetchKlines", () => {
  const minute = Math.floor(NOW / M) * M; // the forming 1m bar's open

  it("asks for the symbol, interval, limit (capped at 1440) and range on the host given", async () => {
    fakeBingx(() => []);
    await fetchKlines("BTC-USDT", 15, {
      startT: 1000,
      endT: 2000,
      limit: 5000,
      host: BINGX_HOSTS.testnet,
      nowT: NOW,
    });
    assert.equal(urls.length, 1);
    const u = urls[0];
    assert.equal(u.origin, BINGX_HOSTS.testnet);
    assert.equal(u.pathname, "/openApi/swap/v3/quote/klines");
    assert.deepEqual(Object.fromEntries(u.searchParams), {
      symbol: "BTC-USDT",
      interval: "15m",
      limit: "1440",
      startTime: "1000",
      endTime: "2000",
    });
    // defaults: mainnet, 1440, no range
    fakeBingx(() => []);
    await fetchKlines("ETH-USDT", 60, { nowT: NOW });
    assert.equal(urls[0].origin, BINGX_HOSTS.mainnet);
    assert.deepEqual(Object.fromEntries(urls[0].searchParams), {
      symbol: "ETH-USDT",
      interval: "1h",
      limit: "1440",
    });
  });

  it("an unsupported timeframe throws before any request", async () => {
    fakeBingx(() => []);
    await assert.rejects(fetchKlines("BTC-USDT", 7, { nowT: NOW }), /unsupported timeframe 7m/);
    assert.equal(urls.length, 0);
  });

  it("a BingX error code rejects with its message", async () => {
    fakeBingx(() => ({ code: 109400, msg: "symbol not exist" }));
    await assert.rejects(
      fetchKlines("NOPE-USDT", 1, { nowT: NOW }),
      /BingX 109400: symbol not exist/,
    );
  });

  it("drops the forming bar, keeps the bar that closed exactly now", async () => {
    fakeBingx(() => [ok(minute), ok(minute - M), ok(minute - 2 * M)]);
    const cs = await fetchKlines("BTC-USDT", 1, { nowT: NOW });
    assert.deepEqual(
      cs.map((c) => c.t),
      [minute - 2 * M, minute - M],
    );
    // now exactly at a bar's close: that bar is closed
    fakeBingx(() => [ok(minute - M)]);
    assert.equal((await fetchKlines("BTC-USDT", 1, { nowT: minute })).length, 1);
    // a 5m bar that opened 4 minutes ago is still forming
    fakeBingx(() => [ok(minute - 4 * M), ok(minute - 9 * M)]);
    assert.deepEqual(
      (await fetchKlines("BTC-USDT", 5, { nowT: NOW })).map((c) => c.t),
      [minute - 9 * M],
    );
  });

  it("drops rows with a missing, non-numeric, zero or negative price, or a bad time", async () => {
    const t = (i: number) => minute - (i + 1) * M;
    fakeBingx(() => [
      ok(t(0)),
      row(t(1), "NaN", 101, 99, 100),
      row(t(2), 100, "abc", 99, 100),
      row(t(3), 100, 101, 0, 100),
      row(t(4), 100, 101, 99, -1),
      { ...ok(t(5)), low: undefined },
      row(t(6), "", 101, 99, 100),
      row(t(7), 100, "Infinity", 99, 100),
      { ...ok(t(8)), time: "not a time" },
      ok(t(9)),
    ]);
    const cs = await fetchKlines("BTC-USDT", 1, { nowT: NOW });
    assert.deepEqual(
      cs.map((c) => c.t),
      [t(9), t(0)],
    );
    assert.deepEqual(cs[1], { t: t(0), o: 100, h: 101, l: 99, c: 100.5, v: 10 });
  });

  it("a missing, non-numeric or negative volume is 0, never NaN; a numeric volume is kept", async () => {
    const t = (i: number) => minute - (i + 1) * M;
    fakeBingx(() => [
      ok(t(0), 100, "NaN"),
      { ...ok(t(1)), volume: undefined },
      ok(t(2), 100, "-5"),
      ok(t(3), 100, "x"),
      ok(t(4), 100, 7.5),
      ok(t(5), 100, "0"),
    ]);
    const cs = await fetchKlines("BTC-USDT", 1, { nowT: NOW });
    assert.deepEqual(
      cs.map((c) => [c.t, c.v]),
      [
        [t(5), 0],
        [t(4), 7.5],
        [t(3), 0],
        [t(2), 0],
        [t(1), 0],
        [t(0), 0],
      ],
    );
  });

  it("sorts ascending (BingX sends newest first) and keeps one bar per open time", async () => {
    const t = (i: number) => minute - (i + 1) * M;
    fakeBingx(() => [
      ok(t(0), 100),
      ok(t(2), 102),
      ok(t(1), 101),
      ok(t(1), 999),
      ok(t(2), 998),
      ok(t(3), 103),
    ]);
    const cs = await fetchKlines("BTC-USDT", 1, { nowT: NOW });
    assert.deepEqual(
      cs.map((c) => [c.t, c.o]),
      [
        [t(3), 103],
        [t(2), 102],
        [t(1), 101],
        [t(0), 100],
      ],
    );
  });
});

describe("fetchHistory", () => {
  /** a fake venue with 1m bars from `first` on: answers [startTime, endTime] newest first, at most `limit` */
  const venue =
    (first: number, opts: { forming?: boolean; overlap?: number } = {}) =>
    (u: URL) => {
      const s = Number(u.searchParams.get("startTime"));
      const e = Number(u.searchParams.get("endTime"));
      const lim = Number(u.searchParams.get("limit"));
      const out = [];
      // a venue that also returns the forming bar (the first page, whose endTime is just before it), or a few bars past
      // endTime (each page overlapping the previous one)
      const forming = Math.floor(NOW / M) * M;
      const top = opts.forming && e === forming - 1 ? forming : e + (opts.overlap ?? 0) * M;
      for (let t = Math.floor(top / M) * M; t >= Math.max(s, first) && out.length < lim; t -= M)
        out.push(ok(t, 100 + ((t / M) % 50)));
      return out;
    };
  const lastClosed = Math.floor(NOW / M) * M - M;

  it("pages backward 1440 at a time until it has the bars, ending at the last closed bar", async () => {
    fakeBingx(venue(0));
    const cs = await fetchHistory("BTC-USDT", 1, 3000, { nowT: NOW });
    assert.equal(cs.length, 3000);
    assert.equal(cs[cs.length - 1].t, lastClosed);
    for (let i = 1; i < cs.length; i++)
      assert.equal(cs[i].t - cs[i - 1].t, M, `contiguous at ${i}`);
    // three pages: 1440, 1440, 120 bars, each ending just before the previous page's first bar
    assert.deepEqual(
      urls.map((u) => Number(u.searchParams.get("limit"))),
      [1440, 1440, 120],
    );
    const ends = urls.map((u) => Number(u.searchParams.get("endTime")));
    const starts = urls.map((u) => Number(u.searchParams.get("startTime")));
    assert.equal(ends[0], lastClosed + M - 1);
    assert.equal(ends[1], lastClosed - 1439 * M - 1);
    assert.equal(ends[2], lastClosed - 2879 * M - 1);
    for (let i = 0; i < 3; i++)
      assert.equal(starts[i], ends[i] - Number(urls[i].searchParams.get("limit")) * M + 1);
  });

  it("stops on an empty page and returns what the venue has", async () => {
    const first = lastClosed - 1999 * M; // 2000 bars of history
    fakeBingx(venue(first));
    const cs = await fetchHistory("BTC-USDT", 1, 5000, { nowT: NOW });
    assert.equal(cs.length, 2000);
    assert.equal(cs[0].t, first);
    assert.equal(cs[cs.length - 1].t, lastClosed);
    // 1440, then 560 of the next 1440 asked, then an empty page
    assert.equal(urls.length, 3);
  });

  it("a venue that returns the forming bar: it is dropped and the history still has every bar asked", async () => {
    fakeBingx(venue(0, { forming: true }));
    const cs = await fetchHistory("BTC-USDT", 1, 2000, { nowT: NOW });
    assert.equal(cs.length, 2000);
    assert.equal(cs[cs.length - 1].t, lastClosed);
    for (let i = 1; i < cs.length; i++)
      assert.equal(cs[i].t - cs[i - 1].t, M, `contiguous at ${i}`);
  });

  it("a venue whose pages overlap (bars past endTime): closed, unique, ascending bars", async () => {
    fakeBingx(venue(0, { overlap: 3 }));
    const cs = await fetchHistory("BTC-USDT", 1, 2000, { nowT: NOW });
    assert.equal(cs[cs.length - 1].t, lastClosed);
    for (let i = 1; i < cs.length; i++)
      assert.ok(cs[i].t > cs[i - 1].t, `ascending, no duplicate at ${i}`);
    // (the page count includes the overlapping bars, so the result can fall a few bars short of the 2000 asked —
    // only against a venue that ignores endTime; BingX honours it)
    assert.ok(cs.length <= 2000 && cs.length >= 2000 - 3, `${cs.length} bars`);
  });

  it("gives up after 20 pages of a venue that answers one bar at a time", async () => {
    fakeBingx((u) => {
      const e = Number(u.searchParams.get("endTime"));
      return [ok(Math.floor(e / M) * M)];
    });
    const cs = await fetchHistory("BTC-USDT", 1, 100, { nowT: NOW });
    assert.equal(urls.length, 20);
    assert.equal(cs.length, 20);
    assert.equal(cs[cs.length - 1].t, lastClosed);
  });

  it("a 15m history asks the 15m interval and aligns the end to the last closed 15m bar", async () => {
    fakeBingx(() => []);
    await fetchHistory("BTC-USDT", 15, 10, { nowT: NOW, host: BINGX_HOSTS.testnet });
    assert.equal(urls[0].searchParams.get("interval"), "15m");
    assert.equal(urls[0].origin, BINGX_HOSTS.testnet);
    assert.equal(
      Number(urls[0].searchParams.get("endTime")),
      Math.floor(NOW / (15 * M)) * 15 * M - 1,
    );
  });
});

describe("fetchTickers", () => {
  it("keeps USDT perpetuals with a positive finite price and a finite volume", async () => {
    fakeBingx(() => [
      {
        symbol: "BTC-USDT",
        lastPrice: "65000.5",
        quoteVolume: "1.5e9",
        priceChangePercent: "-1.25",
      },
      { symbol: "ETH-USDC", lastPrice: "3000", quoteVolume: "1e8", priceChangePercent: "2" },
      { symbol: "ETHUSDT", lastPrice: "3000", quoteVolume: "1e8", priceChangePercent: "2" },
      { symbol: "BAD-USDT", lastPrice: "NaN", quoteVolume: "1e6", priceChangePercent: "0" },
      { symbol: "ZERO-USDT", lastPrice: "0", quoteVolume: "1e6", priceChangePercent: "0" },
      { symbol: "NEG-USDT", lastPrice: "-3", quoteVolume: "1e6", priceChangePercent: "0" },
      { symbol: "NOVOL-USDT", lastPrice: "1", quoteVolume: "n/a", priceChangePercent: "0" },
      { symbol: "MISSING-USDT", quoteVolume: "1e6", priceChangePercent: "0" },
      { symbol: "SOL-USDT", lastPrice: "150", quoteVolume: "2e8", priceChangePercent: "3.5" },
    ]);
    const ts = await fetchTickers();
    assert.equal(
      urls[0].origin + urls[0].pathname,
      `${BINGX_HOSTS.mainnet}/openApi/swap/v2/quote/ticker`,
    );
    assert.deepEqual(ts, [
      { sym: "BTC-USDT", last: 65000.5, quoteVol: 1.5e9, changePct: -1.25 },
      { sym: "SOL-USDT", last: 150, quoteVol: 2e8, changePct: 3.5 },
    ]);
  });

  it("asks the host given and rejects on a BingX error", async () => {
    fakeBingx(() => []);
    assert.deepEqual(await fetchTickers(BINGX_HOSTS.testnet), []);
    assert.equal(urls[0].origin, BINGX_HOSTS.testnet);
    fakeBingx(() => ({ code: 100001, msg: "signature error" }));
    await assert.rejects(fetchTickers(), /BingX 100001/);
  });
});
