// Regression tests of the live control's sizing and ownership (audit of 6 Oct): blocked targets and budget drops
// take no position-cap slot, fresh (lagging) opens rank as held, an increase is never raised past its target, a
// missing price never closes a position, a one-side foreign position never freezes our other side, the scalers
// respect a minimum the venue named, and the status says when the volume factor has no effect.
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { liveKv, liveUnitPeek, resetAccountSeen, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import { budgetBase, controlOwnership, controlTargets, planControl, type ControlTarget } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { SimExchange, fakeRt, lane, type FakeRt } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";

const step = (rt: FakeRt, ex: ExchangeClient) => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
const skippedOf = (rt: FakeRt) =>
  liveKv<{ skipped: Array<{ sym: string; why: string }>; reason: string }>(rt.db, "liveStatus")!;
const ctl = (rt: FakeRt) =>
  liveKv<{
    targets: ControlTarget[];
    actions: Array<{ kind: string; key: string; ok: boolean; msg?: string }>;
  }>(rt.db, "controlStatus")!;

describe("control sizing: slots go to targets that can open", () => {
  beforeEach(() => resetLiveBackoff());

  it("C1 (planner): a blocked key that is not held takes no slot; a held one is never left out", () => {
    const prices = new Map(["A", "B", "C"].map((x) => [`${x}-USDT`, 10] as const));
    const lanes = [
      { cfg: "e1", sym: "A-USDT", side: 1 as const, vol: 3, sl: 0.02 },
      { cfg: "e2", sym: "B-USDT", side: 1 as const, vol: 2, sl: 0.02 },
      { cfg: "e3", sym: "C-USDT", side: 1 as const, vol: 1, sl: 0.02 },
    ];
    const cs = {
      notionalUsd: 10,
      ratio: 1,
      maxNotionalUsd: 100,
      rebalancePct: 0.25,
      maxPositions: 2,
    };
    const blocked = (k: string) => k === "A-USDT|1";
    const r = controlTargets(lanes, prices, { ...cs, blocked });
    assert.deepEqual(
      r.targets.map((t) => t.key),
      ["B-USDT|1", "C-USDT|1"],
      "A's slot goes to C",
    );
    assert.equal(r.skipped.find((x) => x.sym === "A-USDT")?.why, "open waiting after a failure");
    // a named reason is shown as it is
    assert.equal(
      controlTargets(lanes, prices, {
        ...cs,
        blocked: (k) => (k === "A-USDT|1" ? "risk budget" : null),
      }).skipped[0].why,
      "risk budget",
    );
    // held: kept and counted (a held position is managed whatever its open backoff)
    const h = controlTargets(lanes, prices, { ...cs, blocked, heldKeys: new Set(["A-USDT|1"]) });
    assert.deepEqual(
      h.targets.map((t) => t.key),
      ["A-USDT|1", "B-USDT|1"],
    );
  });

  it("C1 (live step): an open the exchange refused waits — and the next target opens in its slot", async () => {
    const ex = new SimExchange();
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxPositions: 1 };
    rt.paper.positions = [lane("a", "S1-USDT", 1, 17, 2), lane("b", "S2-USDT", 1, 24, 1)];
    ex.refuse.add("S1-USDT");
    await step(rt, ex);
    assert.equal(ex.opens("S1-USDT").length, 1, "S1 tried once, refused");
    assert.equal(ex.positions.size, 0);
    await step(rt, ex);
    assert.ok(ex.positions.has("S2-USDT|LONG"), "S2 opened in the slot S1 cannot use");
    assert.equal(ex.opens("S1-USDT").length, 1, "S1 not re-sent while it waits");
    assert.ok(
      skippedOf(rt).skipped.some(
        (x) => x.sym === "S1-USDT" && x.why.startsWith("open waiting after a failure"),
      ),
    );
  });

  it("C1: an offline symbol (margin-mode backoff for hours) does not hold a slot", async () => {
    const ex = new SimExchange();
    let marginCalls = 0;
    ex.setMarginMode = async (sym: string) => {
      marginCalls++;
      if (sym === "S1-USDT") throw new Error("this symbol is offline currently");
    };
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxPositions: 1 };
    rt.paper.positions = [lane("a", "S1-USDT", 1, 17, 2), lane("b", "S2-USDT", 1, 24, 1)];
    await step(rt, ex);
    await step(rt, ex);
    assert.ok(ex.positions.has("S2-USDT|LONG"));
    assert.equal(ex.opens("S1-USDT").length, 0);
    assert.equal(marginCalls, 2, "S1 asked once, S2 once");
  });

  it("C2: a target the worst-case budget drops gives its slot to the next one and is reported", async () => {
    const ex = new SimExchange().withEquity(10);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    // budget 0.3 USD if every backstop fills; B (stop 1 %) ranks first, A's 15 % stop is 0.36 USD even at the
    // exchange minimum (2 USD × 18 %), C (stop 1 %) waits behind the cap of 2
    rt.settings.live = { ...rt.settings.live, maxPositions: 2, maxBackstopLossPct: 0.03 };
    rt.paper.positions = [
      lane("b", "S2-USDT", 1, 24, 3, 0.008),
      lane("a", "S1-USDT", 1, 17, 2, 0.15),
      lane("c", "S3-USDT", 1, 31, 1, 0.008),
    ];
    await step(rt, ex);
    assert.ok(ex.positions.has("S2-USDT|LONG"));
    assert.ok(ex.positions.has("S3-USDT|LONG"), "C took the slot A could not use");
    assert.ok(!ex.positions.has("S1-USDT|LONG"));
    assert.ok(
      skippedOf(rt).skipped.some((x) => x.sym === "S1-USDT" && x.why === "worst-case budget"),
    );
    const worst = liveKv<{ dropped: string[] }>(rt.db, "controlWorstCase");
    assert.deepEqual(worst?.dropped, ["S1-USDT|1"]);
    // every position within the budget at its backstop
    const t = ctl(rt).targets;
    assert.ok(t.reduce((a, x) => a + x.notional * x.stopDist, 0) <= 0.3 * 1.0001);
  });

  it("C2: without a slot cap a drop is reported once (one pass)", async () => {
    const ex = new SimExchange().withEquity(10);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxPositions: 0, maxBackstopLossPct: 0.03 };
    rt.paper.positions = [
      lane("b", "S2-USDT", 1, 24, 3, 0.008),
      lane("a", "S1-USDT", 1, 17, 2, 0.15),
    ];
    await step(rt, ex);
    assert.equal(skippedOf(rt).skipped.filter((x) => x.why === "worst-case budget").length, 1);
    assert.ok(!ex.positions.has("S1-USDT|LONG"));
  });

  it("C3: a position opened moments ago that the read does not show yet ranks as held — not displaced", async () => {
    const ex = new SimExchange();
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, maxPositions: 1 };
    rt.paper.positions = [lane("a", "S1-USDT", 1, 17, 1)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"));
    // the read lags: S1 is not shown; a stronger target arrives
    ex.hide.add("S1-USDT|LONG");
    rt.paper.positions.push(lane("b", "S2-USDT", 1, 24, 3));
    await step(rt, ex);
    assert.ok(!ex.positions.has("S2-USDT|LONG"), "S2 does not take S1's slot");
    assert.deepEqual(
      ctl(rt).targets.map((t) => t.key),
      ["S1-USDT|1"],
    );
    // the read catches up: S1 is still the one position, nothing is closed
    ex.hide.clear();
    await step(rt, ex);
    assert.ok(ex.positions.has("S1-USDT|LONG"), "never closed for the newcomer");
    assert.ok(!ex.positions.has("S2-USDT|LONG"));
  });
});

describe("control orders: increases, stop repair, ownership", () => {
  beforeEach(() => resetLiveBackoff());

  it("C4: an increase under the exchange minimum is not raised to it — the position is kept as it is", async () => {
    const ex = new SimExchange();
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, rebalancePct: 0.1 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1)];
    await step(rt, ex);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1);
    // target 1.15: the delta 0.15 is 1.5 USDT, under the 2 USDT minimum — raised, it ended at 1.2 above the target
    rt.paper.positions[0].vol = 1.15;
    await step(rt, ex);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1, "kept, not raised past the target");
    const inc = ctl(rt).actions.find((a) => a.kind === "increase");
    assert.equal(inc?.msg, "increase under the exchange minimum — kept");
    assert.equal(inc?.ok, false);
    // a delta at or above the minimum is sent as it is (snapped down to the lot)
    rt.paper.positions[0].vol = 1.5;
    await step(rt, ex);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 1.5);
  });

  it("C5: a missing stop with the symbol missing from the tickers waits — the position is never closed for it", async () => {
    const ex = new SimExchange();
    const { rt, prices } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S3-USDT", 1, 31, 1)];
    await step(rt, ex);
    const q = ex.positions.get("S3-USDT|LONG");
    assert.ok(q);
    for (const o of ex.orders) ex.done.set(o.id, { status: "CANCELLED", qty: 0 });
    ex.orders = []; // the stop is gone (cancelled by hand)
    rt.freshTickers = async () => {
      rt.tickersAt = Date.now();
      return prices.filter((p) => p.sym !== "S3-USDT");
    };
    await step(rt, ex);
    assert.equal(ex.positions.get("S3-USDT|LONG"), q, "not closed");
    assert.ok(skippedOf(rt).skipped.some((x) => x.sym === "S3-USDT" &&
      /stop repair waits for a price|no fresh price|orphan exit awaits exact zero-fill/.test(x.why)),
      JSON.stringify(skippedOf(rt)));
    // the price returns: the stop is repaired, the position stays
    await new Promise<void>((resolve) => setImmediate(resolve));
    rt.freshTickers = async () => {
      rt.tickersAt = Date.now();
      return prices;
    };
    await step(rt, ex);
    assert.equal(ex.positions.get("S3-USDT|LONG"), q);
    assert.ok(ex.orders.some((o) => o.venueSymbol === "S3-USDT" && o.type === "STOP_MARKET"));
  });

  it("C6: ownership per side in hedge mode; the whole symbol in one-way mode or for an order without a side", () => {
    const book = {
      positions: [
        { symbol: "A", venueSymbol: "A-USDT", side: "long" as const, qty: 2 },
        { symbol: "A", venueSymbol: "A-USDT", side: "short" as const, qty: 7 },
      ],
      orders: [
        {
          symbol: "A",
          venueSymbol: "A-USDT",
          clientOrderId: "CTSBX1_S1",
          positionSide: "LONG" as const,
        },
      ],
    };
    const h = controlOwnership(book, "bingx-x01", new Set());
    assert.deepEqual([...h.held], [["A-USDT|1", 2]], "our long stays ours");
    assert.deepEqual([...h.foreign], ["A-USDT|-1"], "only the foreign short is frozen");
    const o = controlOwnership(book, "bingx-x01", new Set(), new Set(), "oneway");
    assert.equal(o.held.size, 0);
    assert.deepEqual([...o.foreign], ["A-USDT"]);
    // a foreign order on the short side freezes the short side only; one without a side freezes the symbol
    const fo = {
      positions: [book.positions[0]],
      orders: [
        ...book.orders,
        {
          symbol: "A",
          venueSymbol: "A-USDT",
          clientOrderId: "OTHER",
          positionSide: "SHORT" as const,
        },
      ],
    };
    assert.deepEqual([...controlOwnership(fo, "bingx-x01", new Set()).foreign], ["A-USDT|-1"]);
    const nos = {
      positions: [book.positions[0]],
      orders: [...book.orders, { symbol: "A", venueSymbol: "A-USDT", clientOrderId: "OTHER" }],
    };
    const ns = controlOwnership(nos, "bingx-x01", new Set());
    assert.deepEqual([...ns.foreign], ["A-USDT"]);
    assert.equal(ns.held.size, 0);
    // planControl: our long is closed when its lanes end; the foreign short is never touched
    const plan = planControl({ targets: [], held: h.held, foreign: h.foreign, rebalancePct: 0.25 });
    assert.deepEqual(
      plan.actions.map((a) => `${a.kind}:${a.key}`),
      ["close:A-USDT|1"],
    );
  });

  it("C6 (live step): a foreign short never freezes our long — it is closed when its lanes end; the short is untouched", async () => {
    const ex = new SimExchange();
    const calls: string[] = [];
    ex.leverage = async () => ({ long: 5, short: 5, maxLong: 50, maxShort: 50 });
    ex.setLeverage = async (sym, side) => {
      calls.push(`${sym}|${side}`);
    };
    ex.positions.set("S4-USDT|SHORT", 3); // someone else's
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S4-USDT", 1, 38, 1), lane("b", "S4-USDT", -1, 38, 1)];
    await step(rt, ex);
    assert.ok(ex.positions.has("S4-USDT|LONG"), "our long opens beside the foreign short");
    assert.equal(
      ex.positions.get("S4-USDT|SHORT"),
      3,
      "the foreign short is untouched (no short lane sent)",
    );
    assert.deepEqual(calls, ["S4-USDT|LONG"], "only our side's leverage is set");
    rt.paper.positions = [];
    await step(rt, ex);
    assert.ok(!ex.positions.has("S4-USDT|LONG"), "our long closed when its lanes ended");
    assert.equal(ex.positions.get("S4-USDT|SHORT"), 3);
    assert.ok(!ex.log.some((p) => p.positionSide === "SHORT"), "nothing sent on the foreign side");
  });

  it("C7: the scalers never size under a minimum the venue named — a minimum that breaks the exposure cap is dropped", async () => {
    const ex = new SimExchange().withEquity(10);
    const db = new CoreDb(":memory:");
    db.kvSet("controlVenueMin", { "S0-USDT": { qty: 0.5 } });
    const { rt } = fakeRt(db);
    // exposure cap 2 USD: 10 USD at S0 scales to 0.2 units, and the venue's 0.5-unit minimum (5 USD) would take the
    // gross past the cap — rounded up it does not fit, so the target is dropped and reported, never sent
    rt.settings.live = { ...rt.settings.live, maxPositionX: 50, maxExposureX: 0.2 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1)];
    await step(rt, ex);
    assert.equal(ctl(rt).targets.find((t) => t.key === "S0-USDT|1"), undefined);
    assert.equal(ex.positions.get("S0-USDT|LONG"), undefined);
    assert.ok(
      skippedOf(rt).skipped.some((x) => x.sym === "S0-USDT" && x.why === "gross exposure cap"),
      "the drop is reported with its reason",
    );
    // the same minimum fits a 5 USD cap (0.5 units): the venue minimum is sent as it is, never undercut
    rt.settings.live = { ...rt.settings.live, maxPositionX: 50, maxExposureX: 0.5 };
    await step(rt, ex);
    assert.equal(ctl(rt).targets.find((t) => t.key === "S0-USDT|1")?.qty, 0.5);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 0.5);
    // the next step plans nothing (no reduce under the venue minimum)
    await step(rt, ex);
    assert.equal(ctl(rt).actions.length, 0);
  });

  it("the live status says when the volume factor has no effect, and from which factor it would size", async () => {
    const ex = new SimExchange().withEquity(10);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    // unit 10 × factor 10 = 100 USD, the supported 4× equity cap is 40: the factor sizes only below 4.
    // Legacy fixed-USD ceilings are intentionally ignored by live sizing.
    rt.settings.live = { ...rt.settings.live, ratio: 10, maxPositionX: 4, maxNotionalUsd: 0 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1), lane("b", "S1-USDT", 1, 17, 1)];
    const st = await step(rt, ex);
    assert.match(st.reason, /volume factor 10 has no effect.*cap 40\.00 USD.*below 4\.00/);
    assert.equal(liveKv<{ ratioMatters: number }>(rt.db, "controlSizing")?.ratioMatters, 4);
    rt.settings.live = { ...rt.settings.live, ratio: 2 };
    assert.doesNotMatch((await step(rt, ex)).reason, /no effect/);
  });

  it("the hint names a budget that scales every position (it cancels the volume factor too), not only the cap", async () => {
    const ex = new SimExchange().withEquity(100);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    // no per-position cap in play (50 × equity), the worst case (every backstop filling) held to 2 % of equity: one
    // shared factor sizes every position whatever the volume factor asks for
    rt.settings.live = { ...rt.settings.live, ratio: 3, maxPositionX: 50, maxNotionalUsd: 0, maxRiskPct: 0, maxBackstopLossPct: 0.02 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1), lane("b", "S1-USDT", 1, 17, 1)];
    const st = await step(rt, ex);
    assert.match(st.reason, /volume factor 3 has no effect: the worst-case budget scales every position.*maxBackstopLossPct/);
    const sz = liveKv<{ scaledBy?: Array<{ knob: string; factor: number }> }>(rt.db, "controlSizing");
    assert.equal(sz?.scaledBy?.[0]?.knob, "maxBackstopLossPct");
    assert.ok((sz?.scaledBy?.[0]?.factor ?? 1) < 1);
    // a budget that holds every position whole: no hint
    rt.settings.live = { ...rt.settings.live, maxBackstopLossPct: 1 };
    assert.doesNotMatch((await step(rt, ex)).reason, /no effect/);
  });
});

// Budget base (operator, 14 Oct): every account budget and equity-scaled cap is sized on B = min(wallet, equity) from
// the account read, so open profit never inflates a budget; the read is cached for every sizing mode, so the preview
// and the statistics show the account and never the paper balance.
describe("control sizing: the budget base B = min(wallet, equity)", () => {
  beforeEach(() => {
    resetLiveBackoff();
    resetAccountSeen();
  });

  it("budgetBase: the smaller of wallet and equity; either alone; null without a read", () => {
    assert.equal(budgetBase({ equity: 12, wallet: 10 }), 10, "open profit never raises B");
    assert.equal(budgetBase({ equity: 8, wallet: 10 }), 8, "an open loss lowers B");
    assert.equal(budgetBase({ equity: null, wallet: 10 }), 10);
    assert.equal(budgetBase({ equity: 7, wallet: null }), 7);
    assert.equal(budgetBase({ equity: 0, wallet: -1 }), null);
    assert.equal(budgetBase(null), null);
  });

  it("the per-position cap (maxPositionX × B) uses the wallet when open profit lifts the equity above it", async () => {
    const ex = new SimExchange().withEquity(100);
    // equity 100 (wallet 50 + 50 open profit): the cap is 0.5 × 50 = 25, not 0.5 × 100 = 50
    ex.account = async () => ({ equity: 100, wallet: 50, unrealized: 50, realized: 0, usedMargin: 0, availableMargin: 100 });
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, ratio: 10, maxNotionalUsd: 1000, maxPositionX: 0.5 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1)];
    await step(rt, ex);
    const t = ctl(rt).targets.find((x) => x.key === "S0-USDT|1")!;
    assert.ok(t.notional <= 25 * 1.0001, `notional ${t.notional} over 0.5 × wallet`);
    assert.ok(t.notional > 20, `notional ${t.notional}`);
    const st = liveKv<{ account?: { wallet: number; equity: number; base: number; availableMargin: number; readAt: number } }>(rt.db, "liveStatus")!;
    assert.equal(st.account?.wallet, 50);
    assert.equal(st.account?.equity, 100);
    assert.equal(st.account?.base, 50);
    assert.equal(st.account?.availableMargin, 100);
    assert.ok((st.account?.readAt ?? 0) > 0);
  });

  it("%-of-equity sizing takes its unit from B too: open profit never sizes a unit up", async () => {
    const ex = new SimExchange().withEquity(100);
    ex.account = async () => ({ equity: 100, wallet: 50, unrealized: 50, realized: 0, usedMargin: 0, availableMargin: 100 });
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.sizing = { mode: "equityPct", pct: 0.1 } as never;
    rt.settings.live = { ...rt.settings.live, maxNotionalUsd: 1000, ratio: 1 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1)];
    await step(rt, ex);
    const t = ctl(rt).targets.find((x) => x.key === "S0-USDT|1")!;
    assert.ok(Math.abs(t.notional - 5) < 0.02, `notional ${t.notional}: 10 % of B = 50, not of the equity 100`);
  });

  it("the account read is cached in minimum-quantity sizing too: liveUnitPeek reads it (never the paper balance)", async () => {
    const ex = new SimExchange().withEquity(6);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.sizing = { mode: "minQty", pct: 0.02 } as never;
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1)];
    await step(rt, ex);
    const u = liveUnitPeek(rt as unknown as CoreRuntime);
    assert.equal(u.from, "minQty");
    assert.equal(u.equity, 6);
    assert.equal(u.wallet, 6);
    assert.equal(u.base, 6);
    assert.ok((u.at ?? 0) > 0);
  });

  it("a step that ends before its account read carries the last account with its read time", async () => {
    const ex = new SimExchange().withEquity(9);
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1)];
    await step(rt, ex);
    rt.settings.live = { ...rt.settings.live, enabled: false };
    await step(rt, ex);
    const st = liveKv<{ account?: { base: number; carried?: boolean; readAt: number } }>(rt.db, "liveStatus")!;
    assert.equal(st.account?.base, 9);
    assert.equal(st.account?.carried, true);
  });
});

// Risk-based sizing (operator decision, 14 Oct): each position risks B × 1 % × the volume factor at its stop —
// notional = B × riskPerPositionPct × ratio / riskDist; the venue minimum only while its risk is ≤ 2 × that.
describe("control sizing: risk-based (positionSize \"risk\")", () => {
  beforeEach(() => {
    resetLiveBackoff();
    resetAccountSeen();
  });
  const prices = new Map([["A-USDT", 10]]);
  const lanesA = [{ cfg: "e1", sym: "A-USDT", side: 1 as const, vol: 3, sl: 0.02 }];
  const snapMin = (minQ: number) => (_s: string, q: number) =>
    q >= minQ ? { qty: Math.round(q * 1000) / 1000, raised: false } : { qty: minQ, raised: true };
  const cs = (base: number, ratio = 1, cap = 1000) => ({
    notionalUsd: 10,
    ratio,
    maxNotionalUsd: cap,
    rebalancePct: 0.25,
    maxPositions: 0,
    riskSizing: { base, pct: 0.01 },
  });

  it("notional = B × 1 % × ratio / riskDist, whatever the lanes' volume; the stop risk is B × 1 % × ratio", () => {
    const r = controlTargets(lanesA, prices, cs(100), snapMin(0.001));
    const t = r.targets[0];
    assert.equal(t.riskDist, 0.02);
    assert.ok(Math.abs(t.notional - 50) < 0.01, `notional ${t.notional}`);
    assert.ok(Math.abs(t.notional * t.riskDist! - 1) < 0.001, "risks 1 % of B");
    const r2 = controlTargets(lanesA, prices, cs(100, 2), snapMin(0.001));
    assert.ok(Math.abs(r2.targets[0].notional - 100) < 0.01, "the volume factor multiplies the risk");
  });

  it("capped by the per-position cap (min(maxNotionalUsd, maxPositionX × B) is passed in as the cap)", () => {
    const r = controlTargets(lanesA, prices, cs(100, 4, 80), snapMin(0.001));
    assert.ok(r.targets[0].notional <= 80 * 1.0001);
    assert.equal(r.targets[0].capped, true);
  });

  it("the venue minimum: raised while its risk ≤ 2 × the per-position risk, else skipped with its reason", () => {
    // B 50: risk 0.50 USD, want 25 USD; minimum 4 (40 USD) risks 0.80 ≤ 1.00 → raised to the minimum
    const ok = controlTargets(lanesA, prices, cs(50), snapMin(4));
    assert.equal(ok.targets[0]?.qty, 4);
    assert.equal(ok.targets[0]?.raised, true);
    // B 30: risk 0.30, minimum risk 0.80 > 0.60 → skipped, a held key kept as it is
    const no = controlTargets(lanesA, prices, { ...cs(30), heldKeys: new Set(["A-USDT|1"]) }, snapMin(4));
    assert.equal(no.targets.length, 0);
    assert.match(no.skipped[0].why, /^exchange minimum risk 0\.8000 USD over 2 × the per-position risk 0\.3000 USD/);
    assert.equal(no.skipped[0].keep, "A-USDT|1");
  });

  it("end to end: the live step sizes on B = min(wallet, equity); unknown B opens nothing", async () => {
    const ex = new SimExchange().withEquity(200);
    ex.account = async () => ({ equity: 200, wallet: 100, unrealized: 100, realized: 0, usedMargin: 0, availableMargin: 200 });
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, positionSize: "risk", riskPerPositionPct: 0.01, ratio: 1, maxNotionalUsd: 1000 };
    // stop 4 % → risk distance 4 %: 100 × 1 % / 4 % = 25 USD
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 5, 0.04)];
    await step(rt, ex);
    const t = ctl(rt).targets.find((x) => x.key === "S0-USDT|1")!;
    assert.ok(Math.abs(t.notional * t.riskDist! - 1) < 0.02, `risk ${t.notional * t.riskDist!} = 1 % of B (wallet 100)`);
    assert.ok(ex.positions.get("S0-USDT|LONG")! > 0);
    // no account read: nothing opens
    const ex2 = new SimExchange();
    ex2.account = async () => null; // explicit unavailable account; a reader-less simulated venue uses its declared paper balance
    // (the first run's account read is remembered per connection: forget it, so this run really has no account read)
    resetAccountSeen();
    const { rt: rt2 } = fakeRt(new CoreDb(":memory:"));
    // (another connection id: a read that fails may fall back to the same connection's snapshot of the last 75 s)
    rt2.settings.live = { ...rt2.settings.live, positionSize: "risk", connId: "bingx-vst-01" };
    rt2.paper.positions = [lane("a", "S0-USDT", 1, 10, 5, 0.04)];
    await step(rt2, ex2);
    assert.equal(ex2.positions.size, 0);
  });
});

describe("settings check: position size \"risk\" and its risk per position", () => {
  it("accepts risk with 0.05 % – 5 %, refuses other values and the lane-orders combination", async () => {
    const { checkSettings } = await import("../settings-check.ts");
    const { DEFAULT_SETTINGS } = await import("../config.ts");
    const live = (x: Record<string, unknown>) => ({ ...DEFAULT_SETTINGS, live: { ...DEFAULT_SETTINGS.live, ...x } });
    assert.doesNotThrow(() => checkSettings(live({ positionSize: "risk", riskPerPositionPct: 0.01 })));
    assert.throws(() => checkSettings(live({ positionSize: "risky" })), /"lanes", "min" or "risk"/);
    assert.throws(() => checkSettings(live({ positionSize: "risk", riskPerPositionPct: 0.2 })), /risk per position/);
    assert.throws(() => checkSettings(live({ positionSize: "risk", laneOrders: true })), /laneOrders off/);
    assert.equal(DEFAULT_SETTINGS.live.positionSize, undefined, "the code default stays lanes");
  });
});

describe("size labels: one wording of the live sizing on every page", () => {
  it("names the unit per mode and the cap min(maxNotionalUsd, maxPositionX × B)", async () => {
    const { sizeText, ageOf } = await import("../live-labels.ts");
    const live = { notionalUsd: 6, ratio: 2, maxNotionalUsd: 200, maxPositionX: 5 };
    assert.equal(sizeText(live, "minQty"), "venue minimum × lane volume × 2 · cap min($200, 5× B)");
    assert.equal(sizeText({ ...live, positionSize: "min" }, "minQty"), "venue minimum × 2 per position · cap min($200, 5× B)");
    assert.equal(sizeText({ ...live, positionSize: "min" }, "fixed"), "$6 × 2 per position · cap min($200, 5× B)");
    assert.equal(
      sizeText({ ...live, positionSize: "risk", riskPerPositionPct: 0.01, maxNotionalUsd: 0 }, "minQty"),
      "risk B × 1% × 2 at the stop (B = min(wallet, equity)) · cap 5× B",
    );
    assert.equal(ageOf(null, 1000), null);
    assert.deepEqual(ageOf(1000, 1000 + 130_000), { ms: 130_000, text: "2m ago", stale: true });
  });
});
