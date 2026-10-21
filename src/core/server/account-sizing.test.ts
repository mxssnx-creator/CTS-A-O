import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { laneContributions, liveKv, liveUnit, liveUnitPeek, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import { SimExchange, fakeRt, lane } from "../test-support.ts";
import { unitNotional, type SizingSettings } from "../sizing.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
const core = (rt: unknown) => rt as CoreRuntime;
const setup = () => {
  const rt = fakeRt(new CoreDb(":memory:")).rt;
  return rt as Omit<typeof rt, "settings"> & {
    settings: Omit<typeof rt.settings, "sizing"> & { sizing: SizingSettings };
  };
};

describe("live account sizing: one actual balance for sizing, budgets and preview", () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());

  it("sizes from the account snapshot used for budgets, without a conflicting second equity read", async () => {
    const rt = setup();
    rt.settings.sizing = { mode: "equityPct", pct: 0.1 };
    rt.settings.live = { ...rt.settings.live, ratio: 2 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    let duplicateReads = 0;
    const ex = Object.assign(new SimExchange().withEquity(100), {
      equity: async () => { duplicateReads++; return 10_000; },
    });
    await stepLive(core(rt), [], 1, ex);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 2, "100 balance × 10 % × factor 2 / price 10");
    assert.equal(duplicateReads, 0);
    assert.deepEqual(liveUnitPeek(core(rt)), { unit: 10, from: "balance", balance: 100, equity: 100, wallet: 100, base: 100, at: liveUnitPeek(core(rt)).at });
  });

  it("sizes and applies ratio caps from wallet balance, not unrealized equity", async () => {
    const rt = setup();
    rt.settings.sizing = { mode: "equityPct", pct: 0.25 };
    rt.settings.live = { ...rt.settings.live, maxPositionX: 0.1, maxNotionalUsd: 5000 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange().withEquity(100);
    ex.account = async () => ({
      equity: 100,
      wallet: 40,
      unrealized: 60,
      realized: 0,
      usedMargin: 0,
      availableMargin: 40,
    });
    await stepLive(core(rt), [], 1, ex);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 0.4, "per-position limit is 0.1 × $40 wallet, not 0.1 × $100 equity or the $5,000 legacy cap");
    assert.deepEqual(liveUnitPeek(core(rt)), { unit: 10, from: "balance", balance: 40, equity: 100, wallet: 40, base: 40, at: liveUnitPeek(core(rt)).at });
  });

  it("projects the range factors captured at entry exactly once despite later settings changes", () => {
    const rt = setup();
    rt.settings.grid.micro = { ...rt.settings.grid.micro, volumeFactor: 2.5 } as never;
    rt.settings.signals.rangeVolumeFactors = { ...rt.settings.signals.rangeVolumeFactors, short: 1.8 };
    rt.paper.positions = [
      lane("follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc", "MICRO-USDT", 1, 10, 5),
      lane("follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32", "SIGNAL-USDT", 1, 10, 3.6),
    ];
    const contributions = laneContributions(core(rt));
    assert.equal(contributions.find((x) => x.sym === "MICRO-USDT")?.vol, 5);
    assert.equal(contributions.find((x) => x.sym === "SIGNAL-USDT")?.vol, 3.6);
    Object.assign(rt.settings.grid.micro as object, { volumeFactor: 4 });
    rt.settings.signals.rangeVolumeFactors.short = 3;
    assert.deepEqual(laneContributions(core(rt)).map((x) => x.vol), [5, 3.6]);
  });

  it("an account-only client uses actual equity, and fixed/minimum sizing previews keep that equity too", async () => {
    const rt = setup();
    const ex = new SimExchange().withEquity(0.5);
    rt.settings.sizing = { mode: "equityPct", pct: 0.1 };
    assert.equal(await liveUnit(core(rt), ex), 0.05, "never the 1,000 paper balance");
    for (const mode of ["fixed", "minQty"] as const) {
      rt.settings.sizing.mode = mode;
      await liveUnit(core(rt), ex, await ex.account!());
      assert.equal(liveUnitPeek(core(rt)).equity, 0.5);
      assert.equal(liveUnitPeek(core(rt)).from, mode);
    }
    rt.settings.live.connId = "bingx-x01";
    assert.equal(liveUnitPeek(core(rt)).equity, null, "a different connection never inherits the previous balance");
  });

  it("an unread real balance stays unknown in the preview; only explicit simulated clients use paper", async () => {
    const rt = setup();
    rt.settings.sizing = { mode: "equityPct", pct: 0.1 };
    assert.deepEqual(liveUnitPeek(core(rt)), { unit: 0, from: "unknown", balance: null, equity: null, wallet: null, base: null, at: null });
    assert.equal(await liveUnit(core(rt), new SimExchange()), rt.settings.paperBalance * 0.1);
    assert.equal(liveUnitPeek(core(rt)).from, "paper");
    const failed = new SimExchange().withEquity(50);
    failed.account = async () => { throw new Error("unavailable"); };
    assert.equal(await liveUnit(core(rt), failed), null);
    assert.deepEqual(liveUnitPeek(core(rt)), { unit: 0, from: "unknown", balance: null, equity: null, wallet: null, base: null, at: null });
  });

  it("zero, negative and nonfinite wallet balances never become order sizes", async () => {
    const rt = setup();
    rt.settings.sizing = { mode: "equityPct", pct: 0.1 };
    for (const eq of [0, -1, NaN, Infinity, -Infinity]) {
      assert.equal(await liveUnit(core(rt), new SimExchange().withEquity(eq)), null);
      assert.equal(liveUnitPeek(core(rt)).from, "unknown");
      assert.equal(unitNotional(rt.settings.sizing, eq, 10), 0);
    }
  });

  it("a failed equity refresh cannot keep an old high balance alive indefinitely", async () => {
    const rt = setup();
    rt.settings.sizing = { mode: "equityPct", pct: 0.1 };
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    let reads = 0;
    const ex: ExchangeClient = Object.assign(new SimExchange(), {
      equity: async () => { if (++reads > 1) throw new Error("down"); return 1_000; },
    });
    assert.equal(await liveUnit(core(rt), ex), 100);
    mock.timers.tick(31_000);
    assert.equal(await liveUnit(core(rt), ex), 100, "brief outage retains the recent successful read");
    mock.timers.tick(31_000);
    assert.equal(await liveUnit(core(rt), ex), 100);
    mock.timers.tick(14_000);
    assert.equal(await liveUnit(core(rt), ex), null, "75 s measured from success, never from a failed retry");
    assert.equal(liveUnitPeek(core(rt)).from, "unknown");
  });

  it("a stale account snapshot cannot refresh its own age just by passing through another cache", async () => {
    const rt = setup();
    rt.settings.sizing = { mode: "equityPct", pct: 0.1 };
    const ex = new SimExchange().withEquity(1_000);
    const snap = { ...(await ex.account!())!, at: Date.now() - 76_000 };
    assert.equal(await liveUnit(core(rt), ex, snap), null);
    assert.equal(liveUnitPeek(core(rt)).from, "unknown");
    rt.settings.sizing.mode = "fixed";
    rt.settings.live.maxBackstopLossPct = 0.1;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    ex.account = async () => snap;
    await stepLive(core(rt), [], 1, ex);
    assert.equal(ex.opens("S0-USDT").length, 0, "fixed sizes still need fresh equity for their account budgets");
    rt.settings.live = { ...rt.settings.live, maxBackstopLossPct: 0, minFreeMargin: 10 };
    await stepLive(core(rt), [], 1, ex);
    assert.equal(ex.opens("S0-USDT").length, 0, "a stale margin snapshot cannot fund a guarded order either");
  });

  it("the worst-case budget alone still requires known, finite account balance", async () => {
    for (const balance of [null, 0, Infinity]) {
      resetLiveBackoff();
      const rt = setup();
      rt.settings.sizing.mode = "minQty";
      rt.settings.live = { ...rt.settings.live, maxPositionX: 0, maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0.1 };
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const ex = new SimExchange().withEquity(100);
      const snap = await ex.account!();
      ex.account = async () => ({ ...snap!, wallet: balance });
      const status = await stepLive(core(rt), [], 1, ex);
      assert.equal(ex.opens("S0-USDT").length, 0, `no unbudgeted open with balance ${balance}`);
      assert.match(status.reason, /balance unknown/);
    }
  });

  it("a nonfinite free margin cannot bypass the account's free-margin floor", async () => {
    const rt = setup();
    rt.settings.live = { ...rt.settings.live, minFreeMargin: 2 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
    const ex = new SimExchange().withEquity(100);
    const snap = await ex.account!();
    ex.account = async () => ({ ...snap!, availableMargin: NaN });
    await stepLive(core(rt), [], 1, ex);
    assert.equal(ex.opens("S0-USDT").length, 0);
    assert.match(liveKv<{ reason: string }>(rt.db, "liveStatus")!.reason, /free margin unknown/);
  });

  it("a larger venue-minimum retry is rechecked against the free margin and every account budget", async () => {
    const cases = [
      { name: "free margin", live: { minFreeMargin: 85 } },
      { name: "gross exposure", live: { maxExposureX: 0.15 } },
      { name: "stop risk", live: { maxRiskPct: 0.005 } },
      { name: "worst-case", live: { maxBackstopLossPct: 0.006 } },
    ];
    for (const test of cases) {
      resetLiveBackoff();
      const rt = setup();
      rt.settings.live = { ...rt.settings.live, ...test.live };
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const ex = new SimExchange().withEquity(100);
      const place = ex.order.bind(ex);
      let attempts = 0;
      ex.order = async (p) => {
        if (p.type === "MARKET" && ++attempts === 1)
          throw new ExchangeRejected("The minimum order amount is 2 S0", 101400);
        return place(p);
      };
      await stepLive(core(rt), [], 1, ex);
      assert.equal(attempts, 1, `${test.name}: retry would turn a 10 USD target into 20 USD, exceeding the budget`);
      assert.equal(ex.positions.size, 0);
    }
  });

  it("a minimum retry that fits remains allowed, and reserves its larger amount for the next retry", async () => {
    const rt = setup();
    rt.settings.live.maxExposureX = 0.35;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10), lane("b", "S1-USDT", 1, 17)];
    const ex = new SimExchange().withEquity(100);
    const place = ex.order.bind(ex);
    const tried = new Set<string>();
    ex.order = async (p) => {
      const sym = String(p.symbol);
      if (p.type === "MARKET" && !tried.has(sym)) {
        tried.add(sym);
        throw new ExchangeRejected(`The minimum order amount is ${sym === "S0-USDT" ? 2 : 1.177} ${sym}`, 101400);
      }
      return place(p);
    };
    await stepLive(core(rt), [], 1, ex);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 2, "20 USD retry fits beside the other 10 USD target");
    assert.equal(ex.positions.get("S1-USDT|LONG"), undefined, "a second 20 USD retry would exceed the 35 USD account budget");
  });

  it("an equity-only client keeps its verified equity for minimum retries and per-position caps", async () => {
    const cases = [
      { name: "position cap", live: { maxPositionX: 0.15 } },
      { name: "gross exposure", live: { maxExposureX: 0.15 } },
      { name: "stop risk", live: { maxRiskPct: 0.005 } },
      { name: "worst-case", live: { maxBackstopLossPct: 0.006 } },
    ];
    for (const test of cases) {
      resetLiveBackoff();
      const rt = setup();
      rt.settings.sizing = { mode: "equityPct", pct: 0.1 };
      rt.settings.live = { ...rt.settings.live, ...test.live };
      rt.paper.positions = [lane("a", "S0-USDT", 1, 10)];
      const ex = Object.assign(new SimExchange(), { equity: async () => 100 });
      const place = ex.order.bind(ex);
      let attempts = 0;
      ex.order = async (p) => {
        if (p.type === "MARKET" && ++attempts === 1)
          throw new ExchangeRejected("The minimum order amount is 2 S0", 101400);
        return place(p);
      };
      await stepLive(core(rt), [], 1, ex);
      assert.equal(liveUnitPeek(core(rt)).equity, 100);
      assert.equal(attempts, 1, `${test.name}: retry must use verified equity even without an account snapshot`);
      assert.equal(ex.positions.size, 0);
    }
  });
});
