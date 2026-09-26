// Self-healing / recovery tests with an injected market feed (no network).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, type MarketFeed } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { syntheticCandles } from "../market/bars.ts";

const small = {
  symbols: 3,
  historyDays: 18,
  mainTop: 10,
  refineTop: 4,
  evalTop: 6,
  cycleMs: 60_000,
};
const until = async (cond: () => boolean, ms = 180_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

function fakeFeed(state: { up: boolean; historyCalls: number }): Partial<MarketFeed> {
  return {
    tickers: async () => {
      if (!state.up) throw new Error("ECONNREFUSED");
      return ["AAA-USDT", "BBB-USDT", "CCC-USDT"].map((sym, i) => ({
        sym,
        last: 1,
        quoteVol: 1e9 - i,
        changePct: 0,
      }));
    },
    history: async (sym, tf, bars) => {
      state.historyCalls++;
      if (!state.up) throw new Error("ECONNREFUSED");
      return syntheticCandles(sym, tf, bars, Date.now() - tf * 60_000);
    },
    klines: async () => [],
  };
}

describe("self-healing", { timeout: 600_000 }, () => {
  it("uses no mock data when BingX is down, retries with backoff and recovers with real data", async () => {
    const st = { up: false, historyCalls: 0 };
    const rt = new CoreRuntime(new CoreDb(":memory:"), small, {
      market: "bingx",
      feed: fakeFeed(st),
    });
    rt.start();
    await until(() => rt.status.errorsInRow >= 1);
    assert.equal(rt.status.state, "error");
    assert.equal(rt.status.source, "none");
    assert.equal(rt.candles.size, 0, "no mock candles");
    assert.match(rt.status.error ?? "", /no mock data/);
    st.up = true;
    rt.kick();
    await until(() => rt.status.source === "bingx" && rt.status.computes >= 1);
    assert.ok(rt.status.symbols.every((s) => /^(AAA|BBB|CCC)-USDT$/.test(s)));
    assert.match(rt.status.lastHeal, /recovered after/);
    rt.stop();
  });

  it("backs off on repeated cycle failures and recovers", async () => {
    const st = { up: true, historyCalls: 0 };
    const rt = new CoreRuntime(new CoreDb(":memory:"), small, {
      market: "bingx",
      feed: fakeFeed(st),
    });
    const real = rt.compute.bind(rt);
    let fail = 2;
    rt.compute = async (gen?: number) => {
      if (fail-- > 0) throw new Error("injected compute failure");
      return real(gen);
    };
    rt.start();
    await until(() => rt.status.errorsInRow === 1);
    const wait1 = rt.status.nextCycleAt - Date.now();
    assert.ok(wait1 > 3_000 && wait1 <= 5_000, `first backoff ${wait1} ms`);
    assert.equal(rt.status.state, "error");
    // don't wait out the backoff in the test: kick the next attempts
    rt.kick();
    await until(() => rt.status.errorsInRow === 2);
    assert.ok(rt.status.nextCycleAt - Date.now() > 8_000, "second backoff doubles");
    rt.kick();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    assert.equal(rt.status.errorsInRow, 0);
    assert.match(rt.status.lastHeal, /recovered after 2 failed cycle/);
    rt.stop();
  });

  it("reschedules a lost timer and repairs a symbol gap by re-backfilling it", async () => {
    const st = { up: true, historyCalls: 0 };
    const rt = new CoreRuntime(new CoreDb(":memory:"), small, {
      market: "bingx",
      feed: fakeFeed(st),
    });
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    // lose the timer
    const priv = rt as unknown as { timer: ReturnType<typeof setTimeout> | null };
    if (priv.timer) clearTimeout(priv.timer);
    priv.timer = null;
    const calls = st.historyCalls;
    // make one symbol 400 bars stale
    const cs = rt.candles.get("AAA-USDT")!;
    rt.candles.set("AAA-USDT", cs.slice(0, cs.length - 400));
    await rt.heal();
    assert.match(rt.status.lastHeal, /rescheduling/);
    await until(() => st.historyCalls > calls && rt.status.computes >= 2);
    const events = rt.db
      .all<{ msg: string }>("SELECT msg FROM events WHERE msg LIKE 'self-heal%'")
      .map((e) => e.msg);
    assert.ok(
      events.some((m) => /re-backfilled 1 symbol/.test(m)),
      events.join(" | "),
    );
    assert.ok(Date.now() - rt.candles.get("AAA-USDT")!.at(-1)!.t < 60 * 60_000);
    rt.stop();
  });

  it("a halted symbol (far behind, no new bars) does not force a recompute every cycle", async () => {
    const H = 3_600_000;
    let historyCalls = 0;
    const feed: Partial<MarketFeed> = {
      tickers: async () =>
        ["AAA-USDT", "BBB-USDT", "HALT-USDT"].map((sym, i) => ({
          sym,
          last: 1,
          quoteVol: 1e9 - i,
          changePct: 0,
        })),
      history: async (sym, tf, bars) => {
        historyCalls++;
        // HALT stopped trading 5 days ago; the others are current
        return syntheticCandles(
          sym,
          tf,
          bars,
          sym === "HALT-USDT" ? Date.now() - 120 * H : Date.now() - tf * 60_000,
        );
      },
      klines: async () => [],
    };
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { ...small, cycleMs: 300 },
      { market: "bingx", feed },
    );
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    const computes = rt.status.computes;
    const calls = historyCalls;
    // natural cycles (kick() would force a recompute on purpose)
    const c0 = rt.status.cycles;
    await until(() => rt.status.cycles >= c0 + 5 && rt.status.state === "running");
    rt.stop();
    assert.equal(rt.status.computes, computes, "no recompute without new bars");
    assert.ok(
      historyCalls - calls <= 1,
      `re-backfill of the halted symbol is not repeated every cycle (${historyCalls - calls})`,
    );
  });

  it("a backfill interrupted by stop is completed on the next start (no partial universe)", async () => {
    let gate = 0;
    const feed: Partial<MarketFeed> = {
      tickers: async () =>
        ["AAA-USDT", "BBB-USDT", "CCC-USDT", "DDD-USDT"].map((sym, i) => ({
          sym,
          last: 1,
          quoteVol: 1e9 - i,
          changePct: 0,
        })),
      history: async (sym, tf, bars) => {
        gate++;
        await new Promise((r) => setTimeout(r, 150));
        return syntheticCandles(sym, tf, bars, Date.now() - tf * 60_000);
      },
      klines: async () => [],
    };
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { ...small, symbols: 4 },
      { market: "bingx", feed },
    );
    rt.start();
    await until(() => gate >= 1);
    rt.stop();
    await new Promise((r) => setTimeout(r, 400));
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    assert.equal(rt.candles.size, 4);
    assert.equal(rt.status.symbols.length, 4);
    assert.equal(rt.status.source, "bingx");
  });

  it("small history settings still run (no stall below 200 bars)", async () => {
    const st = { up: true, historyCalls: 0 };
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { ...small, tfMin: 60, historyDays: 7 },
      { market: "bingx", feed: fakeFeed(st) },
    );
    rt.start();
    await until(() => rt.status.computes >= 1 || rt.status.errorsInRow >= 2);
    rt.stop();
    assert.equal(rt.status.errorsInRow, 0, rt.status.error ?? "");
    assert.ok(rt.candles.size > 0);
  });

  it("progressive prehistoric start: realtime runs after the first batch, every batch is computed completely", async () => {
    const syms = Array.from({ length: 12 }, (_, i) => `S${String.fromCharCode(65 + i)}-USDT`);
    const feed: Partial<MarketFeed> = {
      tickers: async () =>
        syms.map((sym, i) => ({ sym, last: 1, quoteVol: 1e9 - i, changePct: 0 })),
      history: async (sym, tf, bars) => syntheticCandles(sym, tf, bars, Date.now() - tf * 60_000),
      klines: async () => [],
    };
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { ...small, symbols: 12, symbolRank: "volume" },
      { market: "bingx", feed },
    );
    let paperBeforeAll = false;
    rt.start();
    await until(() => {
      const p = rt.status.prehistoric;
      if (p && !p.complete && rt.status.computes >= 1 && rt.candles.size < 12)
        paperBeforeAll = true;
      return !!p?.complete && rt.status.state === "running";
    }, 400_000);
    rt.stop();
    const p = rt.status.prehistoric!;
    assert.ok(paperBeforeAll, "realtime (computes / paper) started before every symbol was loaded");
    assert.ok(rt.status.computes >= 3, `one complete compute per batch (${rt.status.computes})`);
    assert.equal(p.total, 12);
    assert.equal(p.ready, 12);
    assert.ok(p.stats && Number.isFinite(p.stats.avgOpen));
    assert.ok(p.counts.base > 0 && p.counts.sets >= 0);
    assert.equal(p.hours, rt.wf.preH);
    assert.ok(
      (rt.status.basePassed ?? -1) >= 0 &&
        (rt.status.basePassed ?? 0) <= (rt.status.baseEvaluated ?? 0),
    );
  });
});
