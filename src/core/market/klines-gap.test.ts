// fetchKlines spaces every kline request from this process by one gap, whichever caller asks (the backfill, the gap
// repair and the realtime pull share the endpoint): x01, 20 Oct, a ban on GET klines every ~5 minutes.
// The fake BingX answers from memory: no network.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { BINGX_HOSTS, fetchKlines } from "./bingx.ts";

const realFetch = globalThis.fetch;
const sentAt: number[] = [];

function fakeKlines() {
  sentAt.length = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const u = new URL(typeof input === "string" || input instanceof URL ? String(input) : input.url);
    assert.equal(u.origin, BINGX_HOSTS.mainnet);
    sentAt.push(Date.now());
    return new Response(JSON.stringify({ code: 0, data: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("kline requests are spaced across callers", () => {
  it("five concurrent requests start at least one gap apart", async () => {
    fakeKlines();
    const gap = 60;
    await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        fetchKlines(`S${i}-USDT`, 1, { nowT: Date.UTC(2026, 9, 1), gapMs: gap }),
      ),
    );
    assert.equal(sentAt.length, 5);
    for (let i = 1; i < sentAt.length; i++) {
      // a timer may wake a few ms early on some hosts: allow 5 ms of slack
      assert.ok(sentAt[i] - sentAt[i - 1] >= gap - 5, `gap ${i}: ${sentAt[i] - sentAt[i - 1]} ms`);
    }
  });

  it("still spaces actual dispatches after the event loop stalls past multiple reserved slots", async () => {
    fakeKlines();
    const gap = 35;
    const stall = setTimeout(() => {
      const until = performance.now() + 180;
      while (performance.now() < until) { /* simulate a delayed event loop */ }
    }, 5);
    try {
      await Promise.all([1, 2, 3, 4, 5].map((i) =>
        fetchKlines(`L${i}-USDT`, 1, { nowT: Date.UTC(2026, 9, 1), gapMs: gap })));
    } finally { clearTimeout(stall); }
    assert.equal(sentAt.length, 5);
    for (let i = 1; i < sentAt.length; i++)
      assert.ok(sentAt[i] - sentAt[i - 1] >= gap - 5, `gap ${i}: ${sentAt[i] - sentAt[i - 1]} ms`);
  });

  it("releases the dispatch queue when an earlier request fails", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      if (++calls === 1) throw new Error("simulated failure");
      return new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 });
    }) as typeof fetch;
    const result = await Promise.allSettled([1, 2].map((i) =>
      fetchKlines(`E${i}-USDT`, 1, { nowT: Date.UTC(2026, 9, 1), gapMs: 10 })));
    assert.deepEqual(result.map((x) => x.status), ["rejected", "fulfilled"]);
    assert.equal(calls, 2);
  });

  it("does not wait for an earlier response before dispatching the next request", async () => {
    let calls = 0;
    let finishFirst: (() => void) | undefined;
    const response = () => new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 });
    globalThis.fetch = (async () => {
      if (++calls === 1) return new Promise<Response>((resolve) => { finishFirst = () => resolve(response()); });
      finishFirst?.();
      return response();
    }) as typeof fetch;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.all([1, 2].map((i) => fetchKlines(`N${i}-USDT`, 1,
          { nowT: Date.UTC(2026, 9, 1), gapMs: 10 }))),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("dispatch waited for a response")), 2000); }),
      ]);
      assert.equal(calls, 2);
    } finally { clearTimeout(timeout); finishFirst?.(); }
  });

  it("a zero gap sends at once (the bound is off with gapMs 0)", async () => {
    fakeKlines();
    const t0 = Date.now();
    await Promise.all(
      [1, 2, 3].map((i) => fetchKlines(`Z${i}-USDT`, 1, { nowT: Date.UTC(2026, 9, 1), gapMs: 0 })),
    );
    assert.ok(Date.now() - t0 < 1000, `took ${Date.now() - t0} ms`);
  });
});
