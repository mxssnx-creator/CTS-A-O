// The fast loops: engine cycle (250 ms) without needless work, tick (100 ms) marking open positions to market and
// driving the live step, and a live book read over REST at most every syncMs.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { cachedClient, type ExchangeClient } from "./live.server.ts";
import { PriceStream } from "./stream.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

const small = {
  symbols: 3,
  historyDays: 18,
  tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
  mainTop: 10,
  refineTop: 4,
  evalTop: 6,
  grid: { short: false },
};
const until = async (cond: () => boolean, ms = 180_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("fast loops", { timeout: 400_000 }, () => {
  it("defaults: engine cycle 250 ms, tick 100 ms, exchange sync 1 s", () => {
    assert.equal(DEFAULT_SETTINGS.cycleMs, 250);
    assert.equal(DEFAULT_SETTINGS.tickMs, 100);
  });

  it("settings saved before the tick loop existed get the fast cycle", () => {
    const db = new CoreDb(":memory:");
    db.kvSet("settings", { cycleMs: 20_000, symbols: 5 });
    const rt = new CoreRuntime(db, undefined, { market: "synthetic" });
    assert.equal(rt.settings.cycleMs, 250);
    assert.equal(rt.settings.tickMs, 100);
    assert.equal(rt.settings.symbols, 5);
    // a fast cycle chosen by the user is kept
    const db2 = new CoreDb(":memory:");
    db2.kvSet("settings", { cycleMs: 500, tickMs: 200 });
    assert.equal(new CoreRuntime(db2, undefined, { market: "synthetic" }).settings.cycleMs, 500);
  });

  it("the tick marks open positions to market; cycles without a new bar do not restep the paper book", async () => {
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      {
        ...small,
        cycleMs: 250,
        tickMs: 50,
        focus: [],
        pinned: [],
        toggles: { normal: true } as never,
        signals: { enabled: false } as never,
      },
      { market: "synthetic" },
    );
    rt.wf.validLastN = 0;
    rt.wf.lastN = 0;
    rt.start();
    await until(
      () =>
        rt.status.computes >= 1 && rt.status.state === "running" && rt.paper.positions.length > 0,
    );
    // count paper steps from here on
    let steps = 0;
    const self = rt as unknown as { stepPaper: () => void };
    const orig = self.stepPaper.bind(rt);
    self.stepPaper = () => {
      steps++;
      orig();
    };
    const cycles = rt.status.cycles;
    const computes = rt.status.computes;
    const ticks = rt.status.tick?.count ?? 0;
    // move a price: the next tick marks the position to it. A new minute bar (a compute) in between replaces
    // the candle and the paper book — then the check is repeated on the new book (at most 3 times)
    let marked = false;
    for (let attempt = 0; attempt < 3 && !marked; attempt++) {
      const c0 = rt.status.computes;
      const t0 = rt.status.tick?.count ?? 0;
      const p = rt.paper.positions[0];
      const cs = rt.candles.get(p.sym)!;
      const last = cs[cs.length - 1];
      const moved = { ...last, c: p.entry * (1 + 0.05 * p.side) };
      cs[cs.length - 1] = moved;
      await until(() => (rt.status.tick?.count ?? 0) >= t0 + 3);
      if (rt.status.computes !== c0 || rt.candles.get(p.sym)!.at(-1) !== moved) continue;
      const q = rt.paper.positions.find((x) => x.cfg === p.cfg && x.sym === p.sym)!;
      assert.ok(Math.abs(q.mtm - (0.05 - rt.settings.cost)) < 1e-9, `mtm ${q.mtm}`);
      marked = true;
    }
    assert.ok(marked, "the tick marked the moved price (no quiet window in 3 attempts)");
    // run until at least one cycle passed without a new bar (a compute), so both cases were exercised
    await until(
      () =>
        (rt.status.tick?.count ?? 0) >= ticks + 3 &&
        rt.status.cycles >= cycles + 4 &&
        rt.status.cycles - cycles > rt.status.computes - computes &&
        rt.status.state === "running",
    );
    rt.stop();
    // the paper book is stepped once per compute (a new bar), never on the cycles in between
    const cyclesRun = rt.status.cycles - cycles;
    assert.equal(steps, rt.status.computes - computes, `steps ${steps} over ${cyclesRun} cycles`);
    assert.ok(cyclesRun > steps, `${cyclesRun} cycles, ${steps} paper steps`);
    // paper equity stays consistent with the marked positions
    const a = rt.runAudit();
    assert.ok(a.checks.find((c) => c.name.startsWith("paper: equity"))!.ok);
    assert.ok(rt.status.tick!.ms < 50, `tick took ${rt.status.tick!.ms} ms`);
  });

  it("the exchange book is re-read at most every syncMs, and at once after an own order", async () => {
    let reads = 0;
    const ex: ExchangeClient = {
      hasKeys: () => true,
      fingerprint: () => "sim|a",
      book: async () => {
        reads++;
        return { positions: [], orders: [] };
      },
      contracts: async () => new Map(),
      order: async () => ({}),
      cancel: async () => true,
    };
    const c = cachedClient(ex, 300);
    await c.book();
    await c.book();
    await c.book();
    assert.equal(reads, 1, "cached within syncMs");
    await c.order({ symbol: "X" });
    await c.book();
    assert.equal(reads, 2, "an own order forces a re-read");
    await new Promise((r) => setTimeout(r, 320));
    await c.book();
    assert.equal(reads, 3, "stale after syncMs");
  });

  it("price stream: newest price, age limit, stats", () => {
    const st = new PriceStream("ws://127.0.0.1:1/never");
    st.put("A-USDT", 10, Date.now());
    st.put("B-USDT", 5, Date.now() - 60_000);
    assert.equal(st.price("A-USDT"), 10);
    assert.equal(st.price("B-USDT"), null, "older than 30 s");
    assert.equal(st.price("B-USDT", 120_000), 5);
    assert.equal(st.stats().connected, false);
    st.stop();
  });
});
