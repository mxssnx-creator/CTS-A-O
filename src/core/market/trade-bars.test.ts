import assert from "node:assert/strict";
import { it } from "node:test";
import { TradeBars, type RecordedTradeBar } from "./trade-bars.ts";
const start = Date.UTC(2026, 9, 1);
it("records event-time OHLCV, volume and quantities, preserving reordered trades and unique IDs", () => {
  const rows: RecordedTradeBar[] = [];
  const bars = new TradeBars(5000, 2000, (b) => rows.push(b));
  const put = (offset: number, price: number, id: string) =>
    bars.put({ sym: "BTC-USDT", t: start + offset, price, quantity: 2, id });
  put(3000, 100, "a");
  put(1000, 98, "b");
  put(4000, 102, "c");
  assert.equal(put(4000, 102, "c"), false);
  bars.flush(start + 6999);
  assert.equal(rows.length, 0);
  bars.flush(start + 7000);
  assert.deepEqual(rows, [
    {
      sym: "BTC-USDT",
      t: start,
      o: 98,
      h: 102,
      l: 98,
      c: 102,
      v: 6,
      intervalMs: 5000,
      trades: 3,
      source: "bingx-trades",
    },
  ]);
  assert.equal(put(2000, 99, "late"), false);
  assert.equal(bars.stats.late, 1);
  assert.equal(bars.pending(), 0);
});
it("leaves data gaps empty, never closes a forming bar, and bounds future/invalid data", () => {
  const rows: RecordedTradeBar[] = [],
    bars = new TradeBars(5000, 0, (b) => rows.push(b));
  bars.put({ sym: "ETH-USDT", t: start, price: 10, quantity: 1 });
  bars.put({ sym: "ETH-USDT", t: start + 20_000, price: 11, quantity: 1 });
  bars.flush(start + 21_000);
  assert.equal(rows.length, 1);
  assert.equal(bars.pending(), 1);
  bars.flush(start + 25_000);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].t - rows[0].t, 20_000);
  assert.equal(
    bars.put({ sym: "ETH-USDT", t: start + 60_000, price: 1, quantity: 1 }, start),
    false,
  );
  assert.equal(bars.put({ sym: "ETH-USDT", t: start, price: NaN, quantity: 1 }), false);
  assert.equal(bars.put({ sym: "ETH-USDT", t: start, price: 1, quantity: -1 }), false);
});
