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

  it("a zero gap sends at once (the bound is off with gapMs 0)", async () => {
    fakeKlines();
    const t0 = Date.now();
    await Promise.all(
      [1, 2, 3].map((i) => fetchKlines(`Z${i}-USDT`, 1, { nowT: Date.UTC(2026, 9, 1), gapMs: 0 })),
    );
    assert.ok(Date.now() - t0 < 1000, `took ${Date.now() - t0} ms`);
  });
});
