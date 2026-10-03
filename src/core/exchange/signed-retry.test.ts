// A signed request BingX refuses as stale ("timestamp is invalid": it left this process seconds after it was
// signed, behind a blocked event loop) executed nothing: it is signed again with a fresh timestamp and sent once
// more. Any other refusal is thrown as it is; a second stale refusal too (one retry).
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ExchangeRejected, signed, staleTimestamp } from "./bingx.server.ts";

describe("signed requests: stale timestamp", () => {
  const orig = globalThis.fetch;
  let urls: string[] = [];
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
    process.env.BINGX_X02_API_KEY = "k";
    process.env.BINGX_X02_SECRET = "s";
  });
  afterEach(() => {
    globalThis.fetch = orig;
    delete process.env.BINGX_X02_API_KEY;
    delete process.env.BINGX_X02_SECRET;
  });

  it("re-signs once with a fresh timestamp and returns the answer", async () => {
    reply({ code: 100421, msg: "timestamp is invalid" }, { code: 0, data: { orders: [] } });
    const out = await signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/trade/allOrders");
    assert.deepEqual(out, { orders: [] });
    assert.equal(urls.length, 2);
    assert.ok(ts(urls[1]) >= ts(urls[0]), "signed again, not resent as it was");
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

  it("recognises the stale-timestamp refusals", () => {
    assert.equal(staleTimestamp("timestamp is invalid"), true);
    assert.equal(staleTimestamp("Null timestamp or timestamp mismatch"), true);
    assert.equal(staleTimestamp("Insufficient margin"), false);
    assert.equal(staleTimestamp(undefined), false);
  });
});
