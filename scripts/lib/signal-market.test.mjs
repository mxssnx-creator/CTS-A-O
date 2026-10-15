import { it } from "node:test";
import assert from "node:assert/strict";
import { SIGNAL_MARKET_ENDPOINT, signalMarketUrl, signalTicker, validateSignalCandles, validateSignalMarketProtocol } from "./signal-market.mjs";
const M = 60_000;
const p = { schema: "cts-signal-six-hour-protocol-v1", endpoint: SIGNAL_MARKET_ENDPOINT, symbols: Array.from({ length: 12 }, (_, i) => `TEST${i}-USDT`), startT: 0, tradeStartT: 360 * M, endT: 720 * M, acquisition: { method: "GET", credentials: false, requestBody: null, interval: "1m", limit: 1440, expectedBarsPerSymbol: 720, maxAttempts: 2, minRequestStartIntervalMs: 1100 } };
const raw = () => Array.from({ length: 720 }, (_, i) => ({ time: i * M, open: "100", high: "102", low: "99", close: "101", volume: "2" }));
it("limits acquisition to frozen public GET OHLCV symbols, endpoint and exact twelve-hour window", () => {
  assert.equal(validateSignalMarketProtocol(p), p);
  const url = new URL(signalMarketUrl(p, p.symbols[0]));
  assert.equal(url.origin + url.pathname, SIGNAL_MARKET_ENDPOINT);
  assert.equal(url.searchParams.get("endTime"), String(p.endT - 1));
  assert.throws(() => signalMarketUrl(p, "OTHER-USDT"), /not frozen/);
  assert.throws(() => validateSignalMarketProtocol({ ...p, endpoint: "https://open-api.bingx.com/private" }), /endpoint/);
  assert.throws(() => validateSignalMarketProtocol({ ...p, acquisition: { ...p.acquisition, credentials: true } }), /public-only/);
  assert.throws(() => validateSignalMarketProtocol({ ...p, endT: p.endT + M }), /exactly six/);
});
it("requires every finite valid completed minute without fills or conflicting duplicate prices", () => {
  const rows = raw();
  assert.equal(validateSignalCandles([...rows].reverse(), p).candles.length, 720);
  assert.equal(validateSignalCandles([...rows, rows[0]], p).identicalDuplicates, 1);
  assert.throws(() => validateSignalCandles(rows.slice(1), p), /Expected 720/);
  assert.throws(() => validateSignalCandles([...rows, { ...rows[0], close: 101.5 }], p), /Conflicting duplicate/);
  assert.throws(() => validateSignalCandles([...rows.slice(0, -1), { ...rows.at(-1), time: p.endT }], p), /Invalid OHLCV/);
  for (const value of [null, "", NaN, -1]) assert.throws(() => validateSignalCandles([{ ...rows[0], low: value }, ...rows.slice(1)], p), /OHLCV/);
});
it("ticker metadata cannot read the trade window", () => {
  const { candles } = validateSignalCandles(raw(), p);
  const before = signalTicker("TEST0-USDT", candles, p.tradeStartT);
  const changed = candles.map((c) => c.t >= p.tradeStartT ? { ...c, c: 1e9, v: 1e9 } : c);
  assert.deepEqual(signalTicker("TEST0-USDT", changed, p.tradeStartT), before);
  assert.equal(before.quoteVol, 360 * 101 * 2);
});
