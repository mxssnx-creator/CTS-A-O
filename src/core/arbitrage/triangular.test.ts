import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ARBITRAGE_POLICY, findTriangularPlans, type ArbitrageQuote } from "./triangular.ts";

const now = 1_000_000;
const q = (symbol: string, base: string, quote: string, bid: number, ask: number): ArbitrageQuote => ({
  venue: "paper", symbol, base, quote, timestamp: now, bid, ask, bidSize: 100_000, askSize: 100_000,
  takerFee: .001, quantityStep: .00000001, minQuantity: .00000001, minNotional: .00001,
});
const pack = () => [q("BTC-USDT", "BTC", "USDT", 99, 100), q("ETH-BTC", "ETH", "BTC", .019, .02),
  q("ETH-USDT", "ETH", "USDT", 2.2, 2.21)];
const noSlip = { ...DEFAULT_ARBITRAGE_POLICY, slippage: 0, minNetReturn: 0 };

test("three executable legs charge one fee each and retain independent ordered currencies", () => {
  const [p] = findTriangularPlans(pack(), "USDT", 1000, now, noSlip);
  assert.ok(p);
  assert.equal(p.status, "quote-only");
  assert.deepEqual(p.legs.map(l => [l.symbol, l.side, l.from, l.to]), [
    ["BTC-USDT", "buy", "USDT", "BTC"], ["ETH-BTC", "buy", "BTC", "ETH"],
    ["ETH-USDT", "sell", "ETH", "USDT"],
  ]);
  assert.ok(p.endAmount <= 1100 * .999 ** 3 + 1e-9);
  assert.ok(p.endAmount > 1096);
  assert.equal(p.netReturn, p.endAmount / 1000 - 1);
  for (let i = 1; i < 3; i++) assert.equal(p.legs[i].input, p.legs[i - 1].output);
});

test("discovers reverse cycles without borrowing another venue", () => {
  const reverse = pack();
  reverse[2] = q("ETH-USDT", "ETH", "USDT", 1.79, 1.8);
  const p = findTriangularPlans(reverse, "USDT", 1000, now, noSlip)[0];
  assert.deepEqual(p.legs.map(l => l.side), ["buy", "sell", "sell"]);
  reverse[2].venue = "other";
  assert.deepEqual(findTriangularPlans(reverse, "USDT", 1000, now, noSlip), []);
});

test("fees, per-leg slippage, rounding and minimum edge can eliminate an apparent opportunity", () => {
  const base = findTriangularPlans(pack(), "USDT", 1000, now, noSlip)[0];
  const slipped = findTriangularPlans(pack(), "USDT", 1000, now, { ...noSlip, slippage: .005 })[0];
  assert.ok(slipped.endAmount < base.endAmount);
  assert.deepEqual(findTriangularPlans(pack(), "USDT", 1000, now, { ...noSlip, minNetReturn: .2 }), []);
  const largeStep = pack(); largeStep[1].quantityStep = 10;
  assert.ok(findTriangularPlans(largeStep, "USDT", 1000, now, noSlip)[0].endAmount < base.endAmount);
  const min = pack(); min[0].minNotional = 2000;
  assert.deepEqual(findTriangularPlans(min, "USDT", 1000, now, noSlip), []);
});

test("stale, crossed, unsynchronized, future, missing and ambiguous markets fail closed", () => {
  for (const change of [
    (p: ArbitrageQuote[]) => { p[0].timestamp = now - 1001; },
    (p: ArbitrageQuote[]) => { p[0].timestamp = now + 1; },
    (p: ArbitrageQuote[]) => { p[0].timestamp = now - 251; },
    (p: ArbitrageQuote[]) => { p[0].bid = p[0].ask + 1; },
    (p: ArbitrageQuote[]) => { p[0].ask = NaN; },
    (p: ArbitrageQuote[]) => { p[0].takerFee = NaN; },
    (p: ArbitrageQuote[]) => { p[1].askSize = .1; },
    (p: ArbitrageQuote[]) => { p.pop(); },
    (p: ArbitrageQuote[]) => { p.push({ ...p[0] }); },
  ]) { const p = pack(); change(p); assert.deepEqual(findTriangularPlans(p, "USDT", 1000, now, noSlip), []); }
});

test("config and account inputs fail closed", () => {
  for (const p of [{ ...noSlip, slippage: 1 }, { ...noSlip, maxAgeMs: -1 },
    { ...noSlip, minNetReturn: NaN }])
    assert.deepEqual(findTriangularPlans(pack(), "USDT", 1000, now, p), []);
  assert.deepEqual(findTriangularPlans(pack(), "USDT", NaN, now, noSlip), []);
  assert.deepEqual(findTriangularPlans(pack(), "USDT", 1000, NaN, noSlip), []);
});


test("one ambiguous pack does not disable an independent venue's valid pack", () => {
  const duplicate = [...pack(), { ...pack()[0] }];
  const independent = pack().map(x => ({ ...x, venue: "other" }));
  const plans = findTriangularPlans([...duplicate, ...independent], "USDT", 1000, now, noSlip);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].venue, "other");
  assert.deepEqual(findTriangularPlans([null as never, ...pack()], "USDT", 1000, now, noSlip).map(x => x.venue), ["paper"]);
});
