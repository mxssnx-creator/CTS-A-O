// A signed request BingX refuses as stale ("timestamp is invalid": it left this process seconds after it was
// signed, behind a blocked event loop) executed nothing: it is signed again with a fresh timestamp and sent once
// more. Any other refusal is thrown as it is; a second stale refusal too (one retry).
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ExchangeRejected, signed, staleTimestamp, stopAlreadyExists } from "./bingx.server.ts";

describe("signed requests: stale timestamp", () => {
  const orig = globalThis.fetch;
  let urls: string[] = [];
  let originalEnv: Record<string, string | undefined> = {};
  /** the exchange's replies, in order */
  const reply = (...bodies: object[]) => {
    globalThis.fetch = (async (url: string | URL) => {
      urls.push(String(url));
      return new Response(JSON.stringify(bodies.shift() ?? { code: 0, data: null }));
    }) as typeof fetch;
  };
  const ts = (u: string) => Number(new URL(u).searchParams.get("timestamp"));
  beforeEach(() => {
    urls = [];
    originalEnv = {
      BINGX_X02_API_KEY: process.env.BINGX_X02_API_KEY,
      BINGX_X02_SECRET: process.env.BINGX_X02_SECRET,
      CTS_BINGX_RATE_BUDGET_FILE: process.env.CTS_BINGX_RATE_BUDGET_FILE,
    };
    process.env.BINGX_X02_API_KEY = "k";
    process.env.BINGX_X02_SECRET = "s";
    process.env.CTS_BINGX_RATE_BUDGET_FILE = ":memory:";
  });
  afterEach(() => {
    globalThis.fetch = orig;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it("re-signs once with a fresh timestamp and returns the answer", async () => {
    reply({ code: 100421, msg: "timestamp is invalid" }, { code: 0, data: { orders: [] } });
    const out = await signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/trade/allOrders");
    assert.deepEqual(out, { orders: [] });
    assert.equal(urls.length, 2);
    assert.ok(ts(urls[1]) >= ts(urls[0]), "signed again, not resent as it was");
    for (const url of urls) assert.equal(new URL(url).searchParams.get("recvWindow"), "5000");
  });

  it("uses BingX's documented maximum receive window for a slow request", async () => {
    globalThis.fetch = (async (input: string | URL) => {
      const url = new URL(String(input));
      urls.push(String(input));
      const transitMs = 4_900;
      return new Response(JSON.stringify(transitMs <= Number(url.searchParams.get("recvWindow"))
        ? { code: 0, data: { orders: [] } }
        : { code: 109400, msg: "timestamp is invalid" }));
    }) as typeof fetch;
    assert.deepEqual(await signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/trade/openOrders"), { orders: [] });
    assert.equal(urls.length, 1, "slow but in-window delivery needs no duplicate request");
    assert.equal(new URL(urls[0]).searchParams.get("recvWindow"), "5000");
  });

  it("re-signs a write only after BingX explicitly refuses its expired timestamp", async () => {
    let requests = 0;
    globalThis.fetch = (async (input: string | URL) => {
      const url = new URL(String(input));
      urls.push(String(input));
      requests++;
      assert.equal(url.searchParams.get("recvWindow"), "5000");
      const transitMs = requests === 1 ? 5_400 : 250;
      return new Response(JSON.stringify(transitMs <= Number(url.searchParams.get("recvWindow"))
        ? { code: 0, data: { orderId: "safe-after-explicit-refusal" } }
        : { code: 109400, msg: "timestamp is invalid" }));
    }) as typeof fetch;
    assert.deepEqual(
      await signed("testnet", "bingx-vst-02", "POST", "/openApi/swap/v2/trade/order", { symbol: "X-USDT" }),
      { orderId: "safe-after-explicit-refusal" },
    );
    assert.equal(urls.length, 2, "only the explicit stale-timestamp refusal permits re-signing a write");
    assert.ok(ts(urls[1]) >= ts(urls[0]));
  });

  it("a second stale refusal is thrown (one retry), and other refusals are never retried", async () => {
    reply({ code: 100421, msg: "timestamp is invalid" }, { code: 100421, msg: "timestamp is invalid" });
    await assert.rejects(
      signed("testnet", "bingx-vst-02", "POST", "/openApi/swap/v2/trade/order", { symbol: "X-USDT" }),
      (e: unknown) => e instanceof ExchangeRejected && /timestamp/.test(e.message),
    );
    assert.equal(urls.length, 2);
    urls = [];
    reply({ code: 101204, msg: "Insufficient margin" });
    await assert.rejects(
      signed("testnet", "bingx-vst-02", "POST", "/openApi/swap/v2/trade/order", { symbol: "X-USDT" }),
      /Insufficient margin/,
    );
    assert.equal(urls.length, 1);
  });

  it("a reply without a code is an unknown outcome, never a refusal (an executed order is not sent again)", async () => {
    reply({ message: "Bad Gateway" });
    await assert.rejects(
      signed("testnet", "bingx-vst-02", "POST", "/openApi/swap/v2/trade/order", { symbol: "X-USDT" }),
      (e: unknown) => !(e instanceof ExchangeRejected) && /outcome unknown/.test((e as Error).message),
    );
    // a numeric code in a string is still read
    reply({ code: "0", data: { ok: 1 } });
    assert.deepEqual(await signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/user/balance"), { ok: 1 });
    reply({ code: "101204", msg: "Insufficient margin" });
    await assert.rejects(
      signed("testnet", "bingx-vst-02", "POST", "/openApi/swap/v2/trade/order", { symbol: "X-USDT" }),
      (e: unknown) => e instanceof ExchangeRejected && e.code === 101204,
    );
  });

  it("recognises the stale-timestamp refusals", () => {
    assert.equal(staleTimestamp("timestamp is invalid"), true);
    assert.equal(staleTimestamp("Null timestamp or timestamp mismatch"), true);
    assert.equal(staleTimestamp("Insufficient margin"), false);
    assert.equal(staleTimestamp(undefined), false);
  });

  it("fails over only a transport-failed read to the same network, while an unknown write is sent once", async () => {
    globalThis.fetch = (async (input: string | URL) => {
      urls.push(String(input));
      if(new URL(String(input)).host==="open-api-vst.bingx.com")throw new Error("transport unavailable");
      return new Response(JSON.stringify({code:0,data:{orders:[]}}));
    }) as typeof fetch;
    assert.deepEqual(await signed("testnet","bingx-vst-02","GET","/openApi/swap/v2/trade/openOrders"),{orders:[]});
    assert.deepEqual(urls.map(u=>new URL(u).host),["open-api-vst.bingx.com","open-api-vst.bingx.pro"]);
    urls=[];
    await assert.rejects(signed("testnet","bingx-vst-02","POST","/openApi/swap/v2/trade/order"),/transport unavailable/);
    assert.equal(urls.length,1);
    assert.equal(stopAlreadyExists("109400 timestamp is invalid"),false);
    assert.equal(stopAlreadyExists("109400 invalid quantity"),false);
    assert.equal(stopAlreadyExists("SL order already exists"),true);
  });
});
