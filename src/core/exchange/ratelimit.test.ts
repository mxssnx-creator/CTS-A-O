// BingX rate-limit bans: nothing is sent while banned, and with CTS_BINGX_BAN_FILE a ban one process receives
// pauses every process on the account (desks of a live test share one key).
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blockingBanUntil, clearRateLimit, fetchBook, noteRateLimit, parseExact, rateLimitedUntil, signed } from "./bingx.server.ts";

describe("rate-limit bans", () => {
  afterEach(() => {
    delete process.env.CTS_BINGX_BAN_FILE;
    clearRateLimit();
  });

  it("a ban pauses until its end plus this process's jitter; a local refusal does not extend it", () => {
    const now = Date.now();
    const end = now + 120_000;
    const until = noteRateLimit(`code:100410 rule triggered, unblocked after ${end}`, now);
    assert.ok(until >= end + 5_000 && until <= end + 60_000);
    assert.equal(rateLimitedUntil(now), until);
    // the refusal message of a call made during the ban leaves the pause as it is
    assert.equal(noteRateLimit(`frequency limit pause (not sent), unblocked after ${until} [GET /x]`, now), until);
    assert.equal(rateLimitedUntil(until + 1), 0);
  });

  it("nothing reaches the exchange while banned", async () => {
    process.env.BINGX_X02_API_KEY = "k";
    process.env.BINGX_X02_SECRET = "s";
    try {
      noteRateLimit(`unblocked after ${Date.now() + 60_000}`);
      const orig = globalThis.fetch;
      let calls = 0;
      globalThis.fetch = (async () => {
        calls++;
        throw new Error("sent");
      }) as typeof fetch;
      try {
        await assert.rejects(signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/trade/openOrders"), /not sent/);
      } finally {
        globalThis.fetch = orig;
      }
      assert.equal(calls, 0);
    } finally {
      delete process.env.BINGX_X02_API_KEY;
      delete process.env.BINGX_X02_SECRET;
    }
  });

  it("a ban names its endpoint: only that endpoint is held back, the live step pauses on any ban", async () => {
    const now = Date.now();
    noteRateLimit(`code:100410 disabled period, unblocked after ${now + 60_000} [GET /openApi/swap/v2/trade/openOrders]`, now);
    assert.ok(rateLimitedUntil(now, "GET /openApi/swap/v2/trade/openOrders") > now + 60_000);
    assert.equal(rateLimitedUntil(now, "GET /openApi/swap/v2/trade/allOrders"), 0);
    assert.ok(rateLimitedUntil(now) > now + 60_000);
    // the live step goes on through open-orders and cancel bans, not through others
    noteRateLimit(`unblocked after ${now + 60_000} [DELETE /openApi/swap/v2/trade/order]`, now);
    assert.equal(blockingBanUntil(now), 0);
    // a report's order-history read (allOrders) never stops trading
    noteRateLimit(`code:100410 unblocked after ${now + 300_000} [GET /openApi/swap/v2/trade/allOrders]`, now);
    assert.equal(blockingBanUntil(now), 0);
    assert.ok(rateLimitedUntil(now, "GET /openApi/swap/v2/trade/allOrders") > now + 300_000);
    noteRateLimit(`unblocked after ${now + 60_000} [GET /openApi/swap/v2/user/positions]`, now);
    assert.ok(blockingBanUntil(now) > now + 60_000);
  });

  it("with a shared ban file, a ban of one process pauses the others", () => {
    const f = join(mkdtempSync(join(tmpdir(), "cts-ban-")), "ban");
    process.env.CTS_BINGX_BAN_FILE = f;
    const now = Date.now();
    const end = now + 90_000;
    noteRateLimit(`unblocked after ${end}`, now);
    assert.equal(JSON.parse(readFileSync(f, "utf8"))["*"], end, "the exchange's end is shared, without jitter");
    // another process wrote a later ban: this one pauses until then (plus its jitter) once it re-reads the file
    clearRateLimit();
    writeFileSync(f, JSON.stringify({ "*": end + 60_000 }));
    const until = rateLimitedUntil(now + 2_000);
    assert.ok(until >= end + 65_000 && until <= end + 120_000);
    // an earlier ban never overwrites a later one
    noteRateLimit(`unblocked after ${now + 30_000}`, now + 2_000);
    assert.equal(JSON.parse(readFileSync(f, "utf8"))["*"], end + 60_000);
  });

  it("a shared book is reused only when read after the desk's own last change and within its age", async () => {
    const base = join(mkdtempSync(join(tmpdir(), "cts-book-")), "book");
    process.env.CTS_BINGX_BOOK_FILE = base;
    process.env.BINGX_X02_API_KEY = "k";
    process.env.BINGX_X02_SECRET = "s";
    const orig = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      throw new Error("sent");
    }) as typeof fetch;
    try {
      const now = Date.now();
      const book = { positions: [], orders: [{ id: "1", symbol: "SOLUSDT", venueSymbol: "SOL-USDT" }] };
      writeFileSync(`${base}.bingx-vst-02`, JSON.stringify({ startedAt: now - 1_000, book }));
      // read by another desk 1 s ago, after this desk's last order: reused, nothing sent
      assert.deepEqual(await fetchBook("testnet", "bingx-vst-02", { notBefore: now - 5_000, maxAgeMs: 5_000 }), book);
      assert.equal(calls, 0);
      // this desk sent an order after that read: the shared book predates it and is not used
      await assert.rejects(fetchBook("testnet", "bingx-vst-02", { notBefore: now - 500, maxAgeMs: 5_000 }));
      // too old for this desk's sync period
      await assert.rejects(fetchBook("testnet", "bingx-vst-02", { notBefore: 0, maxAgeMs: 800 }));
      assert.ok(calls > 0);
    } finally {
      globalThis.fetch = orig;
      delete process.env.CTS_BINGX_BOOK_FILE;
      delete process.env.BINGX_X02_API_KEY;
      delete process.env.BINGX_X02_SECRET;
    }
  });

  it("open orders rate limited: fresh positions with the open orders last read, marked with their time", async () => {
    const base = join(mkdtempSync(join(tmpdir(), "cts-book-")), "book");
    process.env.CTS_BINGX_BOOK_FILE = base;
    process.env.BINGX_X02_API_KEY = "k";
    process.env.BINGX_X02_SECRET = "s";
    const orig = globalThis.fetch;
    const paths: string[] = [];
    globalThis.fetch = (async (url: string) => {
      const path = new URL(url).pathname;
      paths.push(path);
      const data = path.endsWith("/user/positions") ? [{ symbol: "SOL-USDT", positionAmt: "2", positionSide: "LONG" }] : [];
      return { text: async () => JSON.stringify({ code: 0, data }) };
    }) as unknown as typeof fetch;
    try {
      const now = Date.now();
      const orders = [{ id: "9", symbol: "SOLUSDT", venueSymbol: "SOL-USDT", clientOrderId: "CTSBV2_Sx" }];
      writeFileSync(`${base}.bingx-vst-02`, JSON.stringify({ startedAt: now - 300_000, book: { positions: [], orders } }));
      noteRateLimit(`code:100410 disabled period, unblocked after ${now + 120_000} [GET /openApi/swap/v2/trade/openOrders]`, now);
      const book = await fetchBook("testnet", "bingx-vst-02", { notBefore: now, maxAgeMs: 5_000 });
      assert.deepEqual(paths, ["/openApi/swap/v2/user/positions"], "the open orders are not asked");
      assert.equal(book.positions[0]?.qty, 2);
      assert.deepEqual(book.orders, orders);
      assert.equal(book.ordersAt, now - 300_000);
      // the positions read is shared with the other desks, still marked with the open orders' time
      const shared = JSON.parse(readFileSync(`${base}.bingx-vst-02`, "utf8"));
      assert.equal(shared.book.ordersAt, now - 300_000);
      assert.ok(shared.startedAt >= now);
      paths.length = 0;
      const again = await fetchBook("testnet", "bingx-vst-02", { notBefore: now - 1, maxAgeMs: 5_000 });
      assert.deepEqual(paths, [], "another desk reuses it");
      assert.equal(again.ordersAt, now - 300_000);
    } finally {
      globalThis.fetch = orig;
      delete process.env.CTS_BINGX_BOOK_FILE;
      delete process.env.BINGX_X02_API_KEY;
      delete process.env.BINGX_X02_SECRET;
    }
  });

  it("a ban the exchange answers is recorded for its endpoint only", async () => {
    process.env.BINGX_X02_API_KEY = "k";
    process.env.BINGX_X02_SECRET = "s";
    const orig = globalThis.fetch;
    const end = Date.now() + 120_000;
    globalThis.fetch = (async () => ({
      text: async () => JSON.stringify({ code: 100410, msg: `code:100410 disabled period, will be unblocked after ${end}` }),
    })) as unknown as typeof fetch;
    try {
      await assert.rejects(signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/trade/openOrders"), /unblocked after/);
      assert.ok(rateLimitedUntil(Date.now(), "GET /openApi/swap/v2/trade/openOrders") > end);
      assert.equal(rateLimitedUntil(Date.now(), "GET /openApi/swap/v2/user/positions"), 0, "other endpoints stay usable");
      assert.equal(rateLimitedUntil(Date.now(), "*"), 0, "public market data is not paused");
    } finally {
      globalThis.fetch = orig;
      delete process.env.BINGX_X02_API_KEY;
      delete process.env.BINGX_X02_SECRET;
    }
  });

  it("19-digit order ids stay exact (a JSON number rounds them and a cancel by id then misses)", () => {
    const r = parseExact(
      '{"code":0,"data":{"orders":[{"orderId":2105841389262167937,"time":1790914120429,"price":"0.5","qty":12.5,"ids":[2105841389262167938]}]}}',
    ) as { data: { orders: Array<{ orderId: string; time: number; qty: number; ids: string[] }> } };
    const o = r.data.orders[0];
    assert.equal(o.orderId, "2105841389262167937");
    assert.deepEqual(o.ids, ["2105841389262167938"]);
    assert.equal(o.time, 1790914120429, "13-digit times stay numbers");
    assert.equal(o.qty, 12.5);
  });
});
