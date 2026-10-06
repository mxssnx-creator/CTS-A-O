// A request that never settles must never stop the live step (x01, 6 Oct): the contracts read stayed pending for
// 2.5 h under memory pressure — its abort did not settle it — and every live step waited on the same shared promise
// until the watchdog abandoned it ("waiting on: contracts", 48 times). Each read is now raced against a hard
// deadline, a shared load that outlived it is dropped, and the cached client serves the last good contract list
// when a refresh fails.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { deadline, fetchContracts } from "./bingx.server.ts";
import { fetchTickers } from "../market/bingx.ts";
import { cachedClient, type ExchangeClient } from "../server/live.server.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
/** a fetch that never answers and ignores its abort signal (the failure x01 ran into) */
const stuckFetch = () => {
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    return new Promise<Response>(() => {});
  }) as typeof fetch;
  return () => calls;
};
const settlesWithin = async <T>(p: Promise<T>, ms: number) => {
  const t0 = Date.now();
  const r = await p.then(
    (v) => ({ ok: true as const, v }),
    (e: unknown) => ({ ok: false as const, e }),
  );
  return { ...r, ms: Date.now() - t0, within: Date.now() - t0 <= ms };
};

describe("stuck requests never stop the live step", { timeout: 120_000 }, () => {
  it("deadline: a promise that never settles rejects after the limit; a fast one passes through", async () => {
    const r = await settlesWithin(deadline(new Promise(() => {}), 200, "x"), 2_000);
    assert.equal(r.ok, false);
    assert.match(String((r as { e: Error }).e.message), /x: no answer within/);
    assert.equal(await deadline(Promise.resolve(7), 200, "y"), 7);
  });

  it("contracts: a read that never settles rejects (each host within its deadline), and the next call starts anew", async () => {
    const calls = stuckFetch();
    const r = await settlesWithin(fetchContracts("testnet"), 60_000);
    assert.ok(r.within, `settled after ${r.ms} ms`);
    // every host failed: an empty map (an outage), never a pending promise
    assert.equal(r.ok ? r.v.size : 0, 0);
    const n = calls();
    assert.ok(n >= 1);
    // the next call is a new load, not the old pending one
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ code: 0, data: [{ symbol: "AB-USDT", quantityPrecision: 2, size: 0.01, pricePrecision: 4 }] }))) as typeof fetch;
    const m = await fetchContracts("testnet");
    assert.equal(m.get("AB-USDT")?.step, 0.01);
  });

  it("tickers: a market read that never settles rejects within its deadline", async () => {
    stuckFetch();
    const r = await settlesWithin(fetchTickers("https://open-api.example"), 30_000);
    assert.equal(r.ok, false);
    assert.ok(r.within, `settled after ${r.ms} ms`);
  });

  it("cached client: a failed contracts refresh serves the last good list", async () => {
    let fail = false;
    const specs = new Map([["AB-USDT", { symbol: "AB-USDT", minQty: 0.01, step: 0.01, qtyPrec: 2, pxPrec: 4, minUsdt: 2 }]]);
    const ex = {
      hasKeys: () => true,
      fingerprint: () => "stuck-test|cached-client",
      book: async () => ({ positions: [], orders: [] }),
      contracts: async () => {
        if (fail) throw new Error("contracts: no answer within 12 s");
        return specs;
      },
      setMarginMode: async () => {},
      order: async () => undefined,
      cancel: async () => true,
    } as unknown as ExchangeClient;
    const c = cachedClient(ex, 1_000);
    assert.equal((await c.contracts()).size, 1);
    // the cached list ages out (10 min) and the refresh fails: the old list still serves
    const realNow = Date.now;
    Date.now = () => realNow() + 11 * 60_000;
    try {
      fail = true;
      assert.equal((await c.contracts()).get("AB-USDT")?.step, 0.01);
    } finally {
      Date.now = realNow;
    }
  });
});
