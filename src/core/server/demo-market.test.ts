import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { trackRuntimes } from "../test-support.ts";
import { pinMarketHistory } from "./market-identity.server.ts";

const tracked = trackRuntimes();
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; tracked.disposeAll(); });

it("a connected x02 runtime obtains tickers, candles and price streams from VST", async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (url) => {
    urls.push(String(url));
    const ticker = String(url).includes("/ticker");
    return new Response(JSON.stringify({ code: 0, data: ticker
      ? [{ symbol: "BTC-USDT", lastPrice: "100", quoteVolume: "10000000" }] : [] }));
  }) as typeof fetch;
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 }, { conn: "bingx-vst-02" });
  tracked.track(rt);
  const internals = rt as unknown as {
    feed: { klines: (s: string, tf: number, opt: { limit: number }) => Promise<unknown> };
    priceStream: () => { url: string };
  };
  await rt.freshTickers();
  await internals.feed.klines("BTC-USDT", 1, { limit: 2 });
  assert.equal(urls.length, 2);
  assert.ok(urls.every(url => new URL(url).hostname === "open-api-vst.bingx.com"), urls.join("\n"));
  assert.equal(internals.priceStream().url, "wss://vst-open-api-ws.bingx.com/swap-market");
});

it("legacy candles cannot be relabeled as VST, and remain intact", () => {
  const db = new CoreDb(":memory:");
  try {
    db.run("INSERT INTO candles (sym,t,o,h,l,c,v) VALUES (?,?,?,?,?,?,?)", "BTC-USDT", 60000, 100, 101, 99, 100, 1);
    db.kvSet("paperBook", { positions: [{ id: "preserved" }] });
    assert.throws(() => pinMarketHistory(db, "https://open-api-vst.bingx.com"), /market environment/);
    assert.equal(db.get<{ n: number }>("SELECT COUNT(*) AS n FROM candles")?.n, 1);
    assert.deepEqual(db.kvGet("paperBook"), { positions: [{ id: "preserved" }] });
  } finally { db.db.close(); }
});

it("fresh market state retains its exact source across reuse", () => {
  const db = new CoreDb(":memory:");
  try {
    const host = "https://open-api-vst.bingx.com";
    pinMarketHistory(db, host);
    db.run("INSERT INTO candles (sym,t,o,h,l,c,v) VALUES (?,?,?,?,?,?,?)", "BTC-USDT", 60000, 100, 101, 99, 100, 1);
    pinMarketHistory(db, host);
    assert.equal(db.kvGet("marketEnvironment"), host);
    assert.throws(() => pinMarketHistory(db, "https://open-api.bingx.com"), /market environment/);
  } finally { db.db.close(); }
});
