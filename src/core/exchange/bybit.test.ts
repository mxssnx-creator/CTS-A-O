import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BybitNotSent, BybitOutcomeUnknown, BybitRejected, BybitRest, batchBybitReads, bybitSignature, bybitSymbol, snapBybitDecimal, summarizeBybitExecutions } from "./bybit.server.ts";
import { BybitBudget, type BybitRequestBudget } from "./bybit-budget.server.ts";

type Handler = (url: URL, init: RequestInit) => unknown | Promise<unknown>;
function stub(handler: Handler): typeof fetch {
  return (async (input: string | URL | Request, init: RequestInit = {}) => {
    const result = await handler(new URL(String(input)), init);
    return result instanceof Response ? result : new Response(JSON.stringify({ retCode: 0, retMsg: "OK", result }), { status: 200 });
  }) as typeof fetch;
}
const empty = { list: [], nextPageCursor: "" };
const unlimited: BybitRequestBudget = { take: () => ({ until: 0 }), pause: () => {} };
const creds = { apiKey: "test-key", secret: "test-secret", clock: () => 1700000000000, budget: unlimited };

describe("Bybit V5 primitives (mocked transport only)", () => {
  it("signs the exact encoded GET query and binds credentials to the selected network", async () => {
    let called = 0;
    const client = new BybitRest("testnet", { ...creds, fetcher: stub((url, init) => {
      called++;
      assert.equal(url.hostname, "api-testnet.bybit.com");
      const payload = url.search.slice(1), headers = init.headers as Record<string, string>;
      assert.equal(payload, "category=linear&limit=1000");
      assert.equal(headers["X-BAPI-API-KEY"], undefined, "instruments are public");
      return empty;
    }) });
    await client.instruments();
    assert.equal(called, 1);
    const book = new BybitRest("mainnet", { ...creds, fetcher: stub((url, init) => {
      assert.equal(url.hostname, "api.bybit.com");
      const h = init.headers as Record<string, string>;
      const expected = createHmac("sha256", "test-secret").update(`1700000000000test-key10000${url.search.slice(1)}`).digest("hex");
      assert.equal(h["X-BAPI-SIGN"], expected);
      assert.equal(h["X-BAPI-API-KEY"], "test-key");
      return empty;
    }) });
    assert.deepEqual(await book.book(), { positions: [], orders: [] });
    assert.equal(bybitSignature("test-secret", "1700000000000", "test-key", "10000", "a=1"),
      createHmac("sha256", "test-secret").update("1700000000000test-key10000a=1").digest("hex"));
  });

  it("paginates instruments, filters non-USDT/non-perpetual contracts and keeps fractional tick sizes", async () => {
    const client = new BybitRest("testnet", { budget: unlimited, fetcher: stub((url) => {
      const instrument = (symbol: string) => ({ symbol, status: "Trading", contractType: "LinearPerpetual", settleCoin: "USDT",
        lotSizeFilter: { qtyStep: "0.5", minOrderQty: "1", maxMktOrderQty: "200", minNotionalValue: "5" }, priceFilter: { tickSize: "0.25" } });
      return url.searchParams.has("cursor") ? { list: [instrument("ETHUSDT"), { ...instrument("BTCUSDC"), settleCoin: "USDC" }], nextPageCursor: "" }
        : { list: [instrument("BTCUSDT")], nextPageCursor: "first=one&last=two" };
    }) });
    const specs = await client.instruments();
    assert.deepEqual([...specs.keys()], ["BTCUSDT", "ETHUSDT"]);
    assert.equal(specs.get("BTCUSDT")?.tickSize, "0.25");
    assert.equal(specs.get("BTCUSDT")?.qtyStep, "0.5");
  });

  it("rejects repeated cursors instead of returning a partial book", async () => {
    const client = new BybitRest("testnet", { budget: unlimited, fetcher: stub(() => ({ list: [], nextPageCursor: "repeat" })) });
    await assert.rejects(client.instruments(), /cursor/);
  });

  it("snaps quantities and prices using exact decimal steps", () => {
    assert.equal(snapBybitDecimal("476.53", "0.01", "down"), "476.53");
    assert.equal(snapBybitDecimal("1.49", "0.5", "down"), "1");
    assert.equal(snapBybitDecimal("1.49", "0.5", "up"), "1.5");
    assert.equal(snapBybitDecimal("0.00000003", "0.00000002", "down"), "0.00000002");
    assert.equal(snapBybitDecimal("0", "0.25", "down"), "0");
    assert.throws(() => snapBybitDecimal("1e-8", "0.01", "down"));
    assert.throws(() => snapBybitDecimal("1", "0", "down"));
    assert.equal(bybitSymbol("btc-usdt"), "BTCUSDT");
    assert.throws(() => bybitSymbol("BTCUSD"));
  });

  it("normalizes tickers to engine units and preserves percentage-point changes", async () => {
    const c = new BybitRest("mainnet", { budget: unlimited, fetcher: stub(() => ({ list: [
      { symbol: "BTCUSDT", lastPrice: "100", turnover24h: "2200000", price24hPcnt: "0.025" },
      { symbol: "BTCUSD", lastPrice: "100", turnover24h: "20", price24hPcnt: "0.1" },
    ] })) });
    assert.deepEqual(await c.tickers(), [{ sym: "BTC-USDT", last: 100, quoteVol: 2200000, changePct: 2.5 }]);
  });

  it("returns only closed candles, sorted and without duplicates", async () => {
    const c = new BybitRest("testnet", { budget: unlimited, fetcher: stub(() => ({ list: [
      ["180000", "4", "5", "3", "4", "7"], ["120000", "3", "4", "2", "3", "6"],
      ["60000", "2", "3", "1", "2", "5"], ["120000", "3", "4", "2", "3", "6"],
    ] })) });
    const rows = await c.klines("BTC-USDT", 1, { nowT: 200000 });
    assert.deepEqual(rows.map(x => x.t), [60000, 120000]);
    assert.equal(rows[1].v, 6);
  });

  it("rejects malformed and conflicting bars instead of manufacturing history", async () => {
    const c = new BybitRest("testnet", { budget: unlimited, fetcher: stub(() => ({ list: [
      ["60000", "2", "3", "1", "2", "5"], ["60000", "2", "4", "1", "2", "5"],
    ] })) });
    await assert.rejects(c.klines("BTCUSDT", 1, { nowT: 200000 }), /Conflicting/);
    const broken = new BybitRest("testnet", { budget: unlimited, fetcher: stub(() => ({ list: [["60000", "2", "1", "1", "2", "5"]] })) });
    await assert.rejects(broken.klines("BTCUSDT", 1, { nowT: 200000 }), /values/);
  });

  it("pages historical bars backwards without treating the current candle as completed", async () => {
    const now = 1205 * 60_000;
    const c = new BybitRest("testnet", { budget: unlimited, fetcher: stub((url) => {
      const end = Number(url.searchParams.get("end")), limit = Number(url.searchParams.get("limit"));
      const endMinute = Math.floor(end / 60_000);
      return { list: Array.from({ length: limit }, (_, i) => [String((endMinute - i) * 60_000), "2", "3", "1", "2", "5"]) };
    }) });
    const rows = await c.history("BTC-USDT", 1, 1001, now);
    assert.equal(rows.length, 1001);
    assert.equal(rows[0].t, 204 * 60_000);
    assert.equal(rows.at(-1)?.t, 1204 * 60_000);
  });

  it("reads all open positions and both own and foreign conditional orders", async () => {
    const c = new BybitRest("testnet", { ...creds, fetcher: stub((url) => {
      if (url.pathname.endsWith("position/list")) return { list: [{ symbol: "BTCUSDT", side: "Buy", positionIdx: 1, size: "0.5", avgPrice: "100", markPrice: "101", unrealisedPnl: "0.5" }], nextPageCursor: "" };
      return { list: [
        { symbol: "BTCUSDT", orderId: "0001", orderLinkId: "CTS1_S", positionIdx: 1, side: "Sell", leavesQty: "0.5", reduceOnly: true, triggerPrice: "95", stopOrderType: "Stop" },
        { symbol: "BTCUSDT", orderId: "foreign-id", orderLinkId: "", positionIdx: 0, side: "Buy", leavesQty: "0.3", reduceOnly: false, triggerPrice: "", stopOrderType: "" },
      ], nextPageCursor: "" };
    }) });
    const book = await c.book();
    assert.equal(book.positions[0].side, "long");
    assert.equal(book.positions[0].qty, 0.5);
    assert.deepEqual(book.orders.map(o => o.orderId), ["0001", "foreign-id"]);
    assert.equal(book.orders[1].orderLinkId, null);
    assert.equal(book.orders[0].remainingQty, 0.5);
  });

  it("signs the exact POST body and treats acknowledgements as pending, not fills", async () => {
    const c = new BybitRest("testnet", { ...creds, fetcher: stub((_url, init) => {
      const body = String(init.body), h = init.headers as Record<string, string>;
      assert.equal(h["X-BAPI-SIGN"], createHmac("sha256", "test-secret").update(`1700000000000test-key10000${body}`).digest("hex"));
      const row = JSON.parse(body);
      assert.equal(row.reduceOnly, true);
      assert.equal(row.triggerDirection, 2);
      assert.equal(row.positionIdx, 1);
      return { orderId: "f1", orderLinkId: row.orderLinkId };
    }) });
    const result = await c.placeMarket({ symbol: "BTC-USDT", side: "Sell", positionIdx: 1, qty: "0.5", orderLinkId: "CTS_TEST_1", reduceOnly: true,
      trigger: { price: "95", direction: 2, by: "LastPrice" } });
    assert.deepEqual(result, { orderId: "f1", orderLinkId: "CTS_TEST_1", status: "accepted" });
    assert.equal("qty" in result, false);
  });

  it("does not retry an unknown write outcome, including venue timeout and malformed acknowledgements", async () => {
    for (const result of [new Response("bad gateway", { status: 502 }), { retCode: 10000, retMsg: "timeout", result: {} },
      { retCode: 110072, retMsg: "duplicate order link", result: {} }, { retCode: 0, result: {} }]) {
      let calls = 0;
      const c = new BybitRest("testnet", { ...creds, fetcher: (async () => {
        calls++; return result instanceof Response ? result : new Response(JSON.stringify(result));
      }) as typeof fetch });
      await assert.rejects(c.placeMarket({ symbol: "BTCUSDT", side: "Buy", positionIdx: 0, qty: "1", orderLinkId: "CTS_TEST_2", reduceOnly: false }), BybitOutcomeUnknown);
      assert.equal(calls, 1);
    }
  });

  it("distinguishes a definite venue refusal from an unknown write outcome", async () => {
    const c = new BybitRest("testnet", { ...creds, fetcher: (async () => new Response(JSON.stringify({ retCode: 10001, retMsg: "bad param", result: {} }))) as typeof fetch });
    await assert.rejects(c.placeMarket({ symbol: "BTCUSDT", side: "Buy", positionIdx: 0, qty: "1", orderLinkId: "CTS_TEST_3", reduceOnly: false }), BybitRejected);
  });

  it("rejects hedge-side mismatches before dispatch and requires credentials", async () => {
    let calls = 0;
    const fetcher = stub(() => { calls++; return {}; });
    const c = new BybitRest("testnet", { ...creds, fetcher });
    await assert.rejects(c.placeMarket({ symbol: "BTCUSDT", side: "Buy", positionIdx: 1, qty: "1", orderLinkId: "CTS_TEST", reduceOnly: true }), /Invalid Bybit order/);
    const noKeys = new BybitRest("testnet", { fetcher });
    await assert.rejects(noKeys.book(), /credentials/);
    assert.equal(calls, 0);
  });

  it("reconciles a missing realtime order through history, retaining measured partial quantity", async () => {
    const paths: string[] = [];
    const c = new BybitRest("testnet", { ...creds, fetcher: stub(url => {
      paths.push(url.pathname);
      return url.pathname.endsWith("/realtime") ? empty : { list: [{ symbol: "BTCUSDT", orderId: "one", orderLinkId: "CTS_1",
        orderStatus: "PartiallyFilledCanceled", cumExecQty: "0.2", avgPrice: "100" }], nextPageCursor: "" };
    }) });
    assert.deepEqual(await c.orderStatus("BTC-USDT", "one"), { orderId: "one", orderLinkId: "CTS_1", status: "PartiallyFilledCanceled", executedQty: 0.2, avgPrice: 100 });
    assert.deepEqual(paths, ["/v5/order/realtime", "/v5/order/history"]);
  });

  it("reconciles a timed-out write by its exact client id before attempting another order", async () => {
    const c = new BybitRest("testnet", { ...creds, fetcher: stub(url => {
      assert.equal(url.searchParams.get("orderLinkId"), "CTS_UNKNOWN");
      return { list: [{ symbol: "BTCUSDT", orderId: "venue-1", orderLinkId: "CTS_UNKNOWN", orderStatus: "PartiallyFilled", cumExecQty: "0.3", avgPrice: "100" }], nextPageCursor: "" };
    }) });
    assert.deepEqual(await c.orderByLink("BTCUSDT", "CTS_UNKNOWN"), { orderId: "venue-1", orderLinkId: "CTS_UNKNOWN", status: "PartiallyFilled", executedQty: 0.3, avgPrice: 100 });
  });

  it("reads only the USDT coin balance and leaves absent fields unknown", async () => {
    const c = new BybitRest("testnet", { ...creds, fetcher: stub(() => ({ list: [{ coin: [
      { coin: "BTC", walletBalance: "5" }, { coin: "USDT", walletBalance: "10", equity: "11", unrealisedPnl: "1", cumRealisedPnl: "" },
    ] }] })) });
    assert.deepEqual(await c.usdtBalance(), { wallet: 10, equity: 11, unrealized: 1, realized: null });
  });

  it("deduplicates exact executions and sums measured partial fills without inventing fees", async () => {
    const make = (id: string, qty: string, price: string, fee: string, feeCurrency: string) => ({ execId: id, orderId: "o1", orderLinkId: "CTS_TEST_4", symbol: "BTCUSDT", execType: "Trade", execQty: qty, execPrice: price, execFee: fee, feeCurrency, execTime: "1700000000000" });
    const fill1 = make("a", "0.3", "100", "0.03", "USDT"), fill2 = make("b", "0.2", "110", "0.02", "USDT");
    const c = new BybitRest("testnet", { ...creds, fetcher: stub(url => url.searchParams.has("cursor")
      ? { list: [fill1, fill2], nextPageCursor: "" } : { list: [fill1], nextPageCursor: "next" }) });
    const fills = await c.executions("BTCUSDT", "o1");
    assert.equal(fills.length, 2);
    assert.deepEqual(summarizeBybitExecutions(fills), { qty: 0.5, avgPrice: 104, feeUsdt: 0.05 });
    assert.equal(summarizeBybitExecutions([{ ...fills[0], feeCurrency: null }])?.feeUsdt, null);
    assert.throws(() => summarizeBybitExecutions([fills[0], fills[0]]));
    assert.throws(() => summarizeBybitExecutions([fills[0], { ...fills[1], orderId: "other" }]), /Mixed/);
    assert.equal(summarizeBybitExecutions([]), null);
  });

  it("reserves order capacity for reductions and defers writes without dispatch", async () => {
    const budget = new BybitBudget(":memory:"), now = Date.now();
    try {
      for (let i = 0; i < 8; i++) assert.equal(budget.take("POST /v5/order/create", now, true).until, 0);
      assert.ok(budget.take("POST /v5/order/create", now, true).until > now);
      for (let i = 0; i < 2; i++) assert.equal(budget.take("POST /v5/order/create", now, false).until, 0);
      assert.ok(budget.take("POST /v5/order/create", now, false).until > now);
      const c = new BybitRest("testnet", { ...creds, budget, fetcher: stub(() => { throw new Error("must not send"); }) });
      await assert.rejects(c.placeMarket({ symbol: "BTCUSDT", side: "Buy", positionIdx: 0, qty: "1", orderLinkId: "CTS_DEFER", reduceOnly: false }), BybitNotSent);
      assert.equal(budget.take("POST /v5/order/create", now + 1051, true).until, 0);
    } finally { budget.close(); }
  });

  it("honors IP and endpoint cooldowns and never silently retries a refused order", async () => {
    const pauses: Array<[string, number]> = [];
    const budget: BybitRequestBudget = { take: () => ({ until: 0 }), pause: (key, until) => pauses.push([key, until]) };
    let count = 0;
    const c = new BybitRest("testnet", { ...creds, budget, fetcher: (async () => { count++; return new Response("access too frequent", { status: 403 }); }) as typeof fetch });
    const before = Date.now();
    await assert.rejects(c.placeMarket({ symbol: "BTCUSDT", side: "Buy", positionIdx: 0, qty: "1", orderLinkId: "CTS_BAN", reduceOnly: false }), BybitOutcomeUnknown);
    assert.equal(count, 1);
    assert.equal(pauses[0][0], "*");
    assert.ok(pauses[0][1] >= before + 600_000);
    const b = new BybitBudget(":memory:");
    try {
      b.pause("GET /v5/order/realtime", 2000);
      assert.equal(b.take("GET /v5/order/realtime", 1000, false).until, 2000);
      assert.equal(b.take("GET /v5/position/list", 1000, false).until, 0);
      b.pause("*", 3000);
      assert.equal(b.take("GET /v5/position/list", 1000, false).until, 3000);
    } finally { b.close(); }
  });

  it("reserves global budget for protection while independent read endpoints are busy", () => {
    const budget = new BybitBudget(":memory:"), now = 100_000;
    try {
      for (let i = 0; i < 32; i++) assert.equal(budget.take(`GET /test/${i}`, now, false).until, 0);
      assert.ok(budget.take("GET /another", now, false).until > now);
      assert.equal(budget.take("POST /v5/order/cancel", now, false).until, 0);
      assert.equal(budget.take("POST /v5/order/create", now, false).until, 0);
    } finally { budget.close(); }
  });

  it("shares request slots and cooldowns between independent client instances", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-bybit-budget-")), file = join(dir, "budget.sqlite");
    const a = new BybitBudget(file), b = new BybitBudget(file), now = 200_000;
    try {
      for (let i = 0; i < 5; i++) assert.equal((i % 2 ? a : b).take("GET /v5/position/list", now, false).until, 0);
      assert.ok(a.take("GET /v5/position/list", now, false).until > now);
      b.pause("*", now + 600_000);
      assert.equal(a.take("POST /v5/order/cancel", now, false).until, now + 600_000);
    } finally { a.close(); b.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it("bounds read batches and preserves successes and errors in input order", async () => {
    let active = 0, max = 0;
    const rows = await batchBybitReads([1, 2, 3, 4, 5], 2, async value => {
      active++; max = Math.max(max, active);
      await new Promise(resolve => setImmediate(resolve));
      active--;
      if (value === 3) throw new Error("bad symbol");
      return value * 2;
    });
    assert.equal(max, 2);
    assert.deepEqual(rows.map(r => r.ok ? r.value : "failed"), [2, 4, "failed", 8, 10]);
    await assert.rejects(batchBybitReads([1], 9, async n => n), /concurrency/);
  });
});
