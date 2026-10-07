// Regression tests of the live control's sizing and ownership (audit of 6 Oct): blocked targets and budget drops
// take no position-cap slot, fresh (lagging) opens rank as held, an increase is never raised past its target, a
// missing price never closes a position, a one-side foreign position never freezes our other side, the scalers
// respect a minimum the venue named, and the status says when the volume factor has no effect.
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { liveKv, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import { controlOwnership, controlTargets, planControl, type ControlTarget } from "./live.ts";
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
    ex.orders = []; // the stop is gone (cancelled by hand)
    rt.freshTickers = async () => {
      rt.tickersAt = Date.now();
      return prices.filter((p) => p.sym !== "S3-USDT");
    };
    await step(rt, ex);
    assert.equal(ex.positions.get("S3-USDT|LONG"), q, "not closed");
    assert.ok(
      skippedOf(rt).skipped.some(
        (x) => x.sym === "S3-USDT" && x.why === "stop repair waits for a price",
      ),
    );
    // the price returns: the stop is repaired, the position stays
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

  it("C7: the scalers never size under a minimum the venue named", async () => {
    const ex = new SimExchange().withEquity(10);
    const db = new CoreDb(":memory:");
    db.kvSet("controlVenueMin", { "S0-USDT": { qty: 0.5 } });
    const { rt } = fakeRt(db);
    // exposure cap 2 USD: 10 USD at S0 scales to 0.2 — the venue named 0.5 as its minimum
    rt.settings.live = { ...rt.settings.live, maxExposureX: 0.2 };
    rt.paper.positions = [lane("a", "S0-USDT", 1, 10, 1)];
    await step(rt, ex);
    assert.equal(ctl(rt).targets.find((t) => t.key === "S0-USDT|1")?.qty, 0.5);
    assert.equal(ex.positions.get("S0-USDT|LONG"), 0.5);
    // the next step plans nothing (no reduce under the venue minimum)
    await step(rt, ex);
    assert.equal(ctl(rt).actions.length, 0);
  });

  it("the live status says when the volume factor has no effect, and from which factor it would size", async () => {
    const ex = new SimExchange();
    const { rt } = fakeRt(new CoreDb(":memory:"));
    // unit 10 × factor 10 = 100 USD, cap 40: every position capped; the factor sizes only below 40 / (10 × 1) = 4
    rt.settings.live = { ...rt.settings.live, ratio: 10 };
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
