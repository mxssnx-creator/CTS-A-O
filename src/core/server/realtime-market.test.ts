// The realtime market loop: while a compute runs (minutes), newly closed bars are still pulled every cycle — the
// paper / live side and the realtime entry step see the current market, and the next cycle computes on them.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, type MarketFeed } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

const M = 60_000;

describe("realtime market loop", () => {
  it("pulls closed bars during a compute, marks them for the next cycle, and never two pulls at once", async () => {
    const now = Math.floor(Date.now() / M) * M;
    let calls = 0;
    const feed: Partial<MarketFeed> = {
      tickers: async () => [{ sym: "AAA-USDT", last: 1, quoteVol: 1e9, changePct: 0 }],
      klines: async (_sym, _tf, o) => {
        calls++;
        await new Promise((r) => setTimeout(r, 30));
        const out = [];
        for (let t = (o?.startT ?? 0) - 1 + M; t <= now - 2 * M; t += M) out.push({ t, o: 1, h: 1, l: 1, c: 1, v: 1 });
        return out;
      },
    };
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1, cycleMs: 250 } as never, {
      market: "bingx",
      priceStream: null,
      feed,
    });
    const R = rt as unknown as Record<string, unknown> & { candles: Map<string, Array<{ t: number }>> };
    // one symbol, five bars behind; the cycle is in a compute
    const old = Array.from({ length: 50 }, (_, i) => ({ t: now - (56 - i) * M, o: 1, h: 1, l: 1, c: 1, v: 1 }));
    R.candles.set("AAA-USDT", old);
    rt.status.source = "bingx";
    rt.status.state = "computing";
    R.busy = true;
    R.backfillKey = "set";
    R.barsPending = false;
    await rt.tick();
    await rt.tick();
    // the pull is in flight: a second tick starts no second one
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(calls, 1, "one pull, not one per tick");
    const cs = R.candles.get("AAA-USDT")!;
    assert.ok(cs.length > old.length, `bars added (${cs.length})`);
    assert.equal(cs[cs.length - 1].t, now - 2 * M);
    assert.ok(old.length === 50 && old[old.length - 1].t < cs[cs.length - 1].t, "the compute's array is not changed in place");
    assert.equal(R.barsPending, true, "the next cycle computes on them");
    // not computing: the cycle pulls itself, the loop stays out
    rt.status.state = "running";
    R.marketPullAt = 0;
    await rt.tick();
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(calls, 1);
    rt.stop();
  });
});
