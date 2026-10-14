// The system↔exchange relation, own side (relation-design A2–A4): a close the desk did not see is believed only as far
// as the venue's history or the bars prove it (R-b, R-c), and the desk's own quantity is only what its own fills prove —
// the operator's manual quantity is never own, never closed, never re-stopped and never shapes own exits (R-d,
// decision of 14 Oct: "don't affect, let it independent").
import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./server/db.server.ts";
import { entryExitOrder, entryFilledQty, reconcileLaneCloses, stepLive, type ExchangeClient } from "./server/live.server.ts";
import { capHeldToOwn, liveTag, outsideCloseOf, outsideReduction, ownLedger, resizeExits, verifyClose } from "./server/live.ts";
import { liveTrades } from "./statistics.ts";
import { fakeRt, rng, SimExchange } from "./test-support.ts";

process.env.CTS_CORE_LIVE = "1";

const SIG = "follow|sig-ema-cross-s@m15|tp1|sl2|tr0|h192";
const K = "S1-USDT|LONG";
const lanePos = () => ({ cfg: SIG, sym: "S1-USDT", side: 1, entry: 17, stop: 17 * 0.97, target: 17 * 1.03, entryT: Date.now() - 60_000, vol: 1 });

// the desk's clock: each step 20 s after the last, so an own order is never younger than the read-lag window (LAG_MS)
// when the next step reads the book (a real desk's steps see the same after 15 s)
afterEach(() => mock.timers.reset());

/** a runtime with one signal lane long on S1 (price 17), a simulated hedge-mode venue, and one step */
function desk(seed = 1, live: Record<string, unknown> = {}) {
  mock.timers.reset();
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  rt.settings.live = { ...rt.settings.live, ...live } as typeof rt.settings.live;
  rt.paper.positions = [lanePos()] as never;
  const ex = new SimExchange(rng(seed));
  ex.px.set("S1-USDT", 17);
  ex.px.set("S2-USDT", 24);
  const step = () => {
    mock.timers.tick(20_000);
    return stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
  };
  return { rt, ex, step };
}
const laneRows = (rt: { db: CoreDb }) =>
  rt.db.all<{ reason: string; px_src: string | null; exit: number; r: number }>(
    "SELECT reason, px_src, exit, r FROM live_lane_trades ORDER BY exit_t",
  );
const keyOrders = (ex: SimExchange, k = K) => {
  const [sym, ps] = k.split("|");
  return ex.orders.filter((o) => o.venueSymbol === sym && o.positionSide === ps);
};
/** every order the desk sent on a key from log index `from` on */
const sentOn = (ex: SimExchange, from: number, k = K) => {
  const [sym, ps] = k.split("|");
  return ex.log.slice(from).filter((o) => o.symbol === sym && o.positionSide === ps);
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("R-b: a close the desk did not see is believed only as far as it is proven", () => {
  it("verifyClose: a level the bars did not reach is never the exit — unverified at the price now", () => {
    // 11 Oct 01:06: STRK booked at its stop 0.08404 while the low was 0.10073
    const strk = verifyClose({ side: 1, stopPx: 0.08404, tpPx: null, bars: [{ h: 0.1031, l: 0.10073 }], px: 0.1012 });
    assert.deepEqual(strk, { why: "unverified", px: 0.1012, src: "ticker" });
    // reached (within 0.1 %): by its stop at the stop price, from the bars
    assert.deepEqual(verifyClose({ side: 1, stopPx: 9, tpPx: 12, bars: [{ h: 10, l: 9.005 }], px: 9.4 }), { why: "stop", px: 9, src: "bar" });
    assert.deepEqual(verifyClose({ side: -1, stopPx: 11, tpPx: 8, bars: [{ h: 10.2, l: 7.99 }], px: 8.2 }), { why: "target", px: 8, src: "bar" });
    // both reached, or no bars: unverified
    assert.equal(verifyClose({ side: 1, stopPx: 9, tpPx: 11, bars: [{ h: 11.5, l: 8.5 }], px: 10 }).why, "unverified");
    assert.equal(verifyClose({ side: 1, stopPx: 9, tpPx: 11, bars: [], px: 10 }).why, "unverified");
  });

  it("a liquidation or auto-deleverage fill is the venue's engine (an own loss), not a close by hand", () => {
    const row = { positionSide: "LONG", side: "SELL", status: "FILLED", avgPrice: 9.1, executedQty: 2, clientOrderId: "", type: "LIQUIDATION" };
    assert.deepEqual(outsideCloseOf([row], 1, "bingx-vst-02"), { why: "liq", px: 9.1 });
    assert.deepEqual(outsideCloseOf([{ ...row, type: "MARKET" }], 1, "bingx-vst-02"), { why: "hand", px: 9.1 });
  });

  it("a side found flat with its history unreadable and both own exits gone is booked unverified at the ticker", async () => {
    const { rt, ex, step } = desk(11);
    await step();
    assert.ok((ex.positions.get(K) ?? 0) > 0, "the desk opened");
    // the venue closed it while the desk was not looking; its order history cannot be read
    ex.positions.delete(K);
    ex.orders = ex.orders.filter((o) => !(o.venueSymbol === "S1-USDT" && o.positionSide === "LONG"));
    (ex as { ordersSince?: unknown }).ordersSince = undefined;
    await step();
    const rows = laneRows(rt);
    assert.equal(rows.length, 1, JSON.stringify(rows));
    assert.deepEqual({ reason: rows[0].reason, src: rows[0].px_src, exit: rows[0].exit }, { reason: "unverified", src: "ticker", exit: 17 });
  });
});

describe("R-c: by hand without a price → the ticker, then the venue's history re-prices it", () => {
  it("a close by hand the history cannot price is booked at the ticker, marked as such", async () => {
    const { rt, ex, step } = desk(12);
    await step();
    // closed by an order not ours; the own stop still rests (the venue did not cancel it); history unreadable
    ex.positions.delete(K);
    (ex as { ordersSince?: unknown }).ordersSince = undefined;
    await step();
    const rows = laneRows(rt);
    assert.deepEqual(rows.map((r) => [r.reason, r.px_src, r.exit]), [["hand", "ticker", 17]]);
  });

  it("reconcileLaneCloses re-prices bar / ticker / unverified rows from the order history at the closing fill", () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const tag = liveTag(rt.settings.live.connId);
    const t = Date.now() - 3_600_000;
    const ins = (id: string, sym: string, reason: string, src: string | null, exit: number) =>
      rt.db.run(
        "INSERT INTO live_lane_trades (id, exit_t, cfg, sym, side, entry_t, entry, exit, r, reason, px_src) VALUES (?, ?, ?, ?, 1, ?, 10, ?, ?, ?, ?)",
        id,
        t,
        SIG,
        sym,
        t - 7_200_000,
        exit,
        (exit - 10) / 10 - 0.002,
        reason,
        src,
      );
    ins("a", "S1-USDT", "unverified", "ticker", 10.5);
    ins("b", "S2-USDT", "hand", "ticker", 10.2);
    ins("c", "S3-USDT", "stop", "fill", 9.5);
    const hist = [
      { symbol: "S1-USDT", positionSide: "LONG", side: "SELL", status: "FILLED", type: "STOP_MARKET", avgPrice: 9.6, executedQty: 1, clientOrderId: `${tag}Sabc`, updateTime: t - 30_000 },
      { symbol: "S2-USDT", positionSide: "LONG", side: "SELL", status: "FILLED", type: "MARKET", avgPrice: 10.4, executedQty: 1, clientOrderId: "", updateTime: t - 5_000 },
      { symbol: "S3-USDT", positionSide: "LONG", side: "SELL", status: "FILLED", type: "MARKET", avgPrice: 11, executedQty: 1, clientOrderId: "", updateTime: t - 5_000 },
    ];
    assert.equal(reconcileLaneCloses(rt as never, hist), 2);
    const got = rt.db.all<{ id: string; reason: string; px_src: string; exit: number; r: number }>(
      "SELECT id, reason, px_src, exit, r FROM live_lane_trades ORDER BY id",
    );
    assert.deepEqual(got.map((x) => [x.id, x.reason, x.px_src, x.exit]), [
      ["a", "stop", "history", 9.6],
      ["b", "hand", "history", 10.4],
      ["c", "stop", "fill", 9.5],
    ]);
    // the row's own cost is kept
    assert.ok(near(got[0].r, (9.6 - 10) / 10 - 0.002), String(got[0].r));
  });
});

describe("R-d: own quantity only from own fills; the desk independent beside manual quantity", () => {
  it("held = min(ledger own, exchange); a key without any own fill is unverified and left out", () => {
    const held = new Map([
      ["A|1", 5],
      ["B|1", 4.1],
      ["C|-1", 3],
      ["D|1", 3],
    ]);
    const out = capHeldToOwn(held, new Map([["A|1", 2], ["B|1", 4], ["D|1", 0]]));
    assert.deepEqual([...held], [["A|1", 2], ["B|1", 4]]);
    assert.deepEqual(out, [
      { key: "A|1", exchange: 5, own: 2 },
      { key: "B|1", exchange: 4.1, own: 4 },
      { key: "C|-1", exchange: 3, own: null },
      { key: "D|1", exchange: 3, own: 0 },
    ]);
    // an outside reduction is taken from the own quantity first, explained own fills first; an increase is none
    assert.deepEqual(outsideReduction({ own: 2, ex: 7, prevForeign: 10, tol: 0.01, ownFilled: 0 }), {
      shortfall: 5,
      explained: 0,
      unexplained: 2,
      own: 0,
      foreign: 7,
    });
    assert.equal(outsideReduction({ own: 2, ex: 15, prevForeign: 10, tol: 0.01, ownFilled: 0 }), null);
    assert.equal(outsideReduction({ own: 2, ex: 10, prevForeign: 10, tol: 0.01, ownFilled: 2 })?.explained, 2);
    // the ledger counts the outside reduction (H) off the own quantity; the statistics realize it as "hand"
    assert.equal(ownLedger([{ k: "A|1", kind: "O", status: "ok", qty: 2 }, { k: "A|1", kind: "H", status: "ok", qty: 0.5 }]).get("A|1"), 1.5);
    const tr = liveTrades(
      [
        { coid: "CTSV2T_Ex", sym: "A", side: 1, kind: "O", qty: 2, px: 10, status: "ok", msg: "", at: 1 },
        { coid: "outside-1", sym: "A", side: 1, kind: "H", qty: 0.5, px: 11, status: "ok", msg: "", at: 2 },
      ] as never,
      7,
    );
    assert.deepEqual(tr.map((x) => [x.reason, x.notional]), [["hand", 5]]);
  });

  it("a position with an own order resting but no own fill is not adopted: untouched, said so", async () => {
    const { rt, ex, step } = desk(21);
    rt.paper.positions = [] as never;
    const tag = liveTag(rt.settings.live.connId);
    ex.positions.set(K, 7);
    ex.orders.push({ id: "x1", venueSymbol: "S1-USDT", symbol: "S1-USDT", clientOrderId: `${tag}Sold1`, positionSide: "LONG", type: "STOP_MARKET", stopPrice: 15, qty: 7 });
    await step();
    await step();
    assert.equal(ex.positions.get(K), 7);
    assert.deepEqual(ex.log, [], "no order sent");
    assert.ok(
      rt.db.all<{ msg: string }>("SELECT msg FROM events").some((e) => /own quantity unverified/.test(e.msg)),
      "an event says so",
    );
  });

  it("hedge mode: every own exit order is bounded to the own quantity — from the open on, and beside merged quantity", async () => {
    const { ex, step } = desk(22);
    await step();
    const own = ex.positions.get(K) ?? 0;
    assert.ok(own > 0);
    const exits = () => sentOn(ex, 0).filter((o) => o.type !== "MARKET");
    assert.ok(exits().length > 0);
    assert.ok(exits().every((o) => o.closePosition === undefined && Number(o.quantity) <= own + 1e-9), JSON.stringify(exits()));
    // the operator buys 10 by hand: merged
    const from = ex.log.length;
    ex.foreignFill(K, 10);
    await step();
    await step();
    const after = sentOn(ex, from);
    assert.ok(after.every((o) => o.closePosition === undefined && Number(o.quantity) <= own + 1e-9), JSON.stringify(after));
    assert.ok(!keyOrders(ex).some((o) => o.type === "TAKE_PROFIT_MARKET"), "no take-profit on a merged key");
    assert.ok(keyOrders(ex).some((o) => o.type === "STOP_MARKET"), "the own part keeps its stop");
    // every desk exit order triggers: the operator's 10 stay
    for (const o of keyOrders(ex)) ex.triggerOrder(o.id);
    assert.ok(near(ex.positions.get(K) ?? 0, 10), `left ${ex.positions.get(K)}`);
  });

  it("entries mode: an entry's stop and take-profit are bounded to its quantity in hedge mode", () => {
    const o = entryExitOrder({ sym: "S1-USDT", exitSide: "SELL", positionSide: "LONG", type: "STOP_MARKET", qty: 0.6, stopPrice: 16, coid: "c", oneway: false });
    assert.equal(o.closePosition, undefined);
    assert.equal(o.quantity, 0.6);
    const w = entryExitOrder({ sym: "S1-USDT", exitSide: "SELL", positionSide: "BOTH", type: "TAKE_PROFIT_MARKET", qty: 0.6, stopPrice: 18, coid: "c", oneway: true });
    assert.equal(w.closePosition, "true");
  });

  it("a merged position's liquidation never moves the own stop", async () => {
    const { rt, ex, step } = desk(23);
    await step();
    ex.foreignFill(K, 10);
    // the merged position's liquidation lies inside the own stop (17 × 0.97)
    ex.liq.set(K, 16.9);
    await step();
    await step();
    const stops = keyOrders(ex).filter((o) => o.type === "STOP_MARKET");
    assert.ok(stops.length > 0);
    assert.ok(stops.every((o) => (o.stopPrice ?? 0) < 16.9), JSON.stringify(stops));
    assert.ok(rt.db.all<{ msg: string }>("SELECT msg FROM events").some((e) => /merged position's liquidation/.test(e.msg)));
  });

  it("own-first: a manual partial close is taken from our quantity first; our rest closes bounded, the operator's stays", async () => {
    const { rt, ex, step } = desk(24);
    await step();
    const own = ex.positions.get(K) ?? 0;
    ex.foreignFill(K, 10);
    await step();
    await step();
    // the operator sells less than ours: own-first, the desk's episode ends and its rest is closed
    const cut = Math.round((own / 2) * 1000) / 1000;
    const from = ex.log.length;
    ex.foreignFill(K, cut, false, 16.5);
    await step();
    await step();
    const sent = sentOn(ex, from);
    assert.ok(sent.every((o) => Number(o.quantity) <= own - cut + 1e-9), JSON.stringify(sent));
    assert.ok(near(ex.positions.get(K) ?? 0, 10), `left ${ex.positions.get(K)}`);
    const h = rt.db.all<{ qty: number }>("SELECT qty FROM live_orders WHERE kind = 'H'");
    assert.equal(h.length, 1);
    assert.ok(near(h[0].qty, cut), String(h[0].qty));
    assert.deepEqual(laneRows(rt).map((r) => r.reason), ["hand"]);
    assert.deepEqual(keyOrders(ex), [], "no own order left beside the operator's quantity");
  });

  it("own quantity 0 beside someone else's: the own orders there are cancelled, the rest untouched", async () => {
    const { rt, ex, step } = desk(25);
    await step();
    const own = ex.positions.get(K) ?? 0;
    ex.foreignFill(K, 10);
    await step();
    await step();
    // the operator sells more than ours (own-first: all of ours is gone)
    ex.foreignFill(K, own + 3, false, 16.5);
    const from = ex.log.length;
    await step();
    await step();
    assert.deepEqual(keyOrders(ex), [], "no own order left on the side");
    assert.ok(near(ex.positions.get(K) ?? 0, 7), `left ${ex.positions.get(K)}`);
    assert.deepEqual(sentOn(ex, from), [], "nothing sent on the operator's quantity");
    assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders WHERE kind = 'H'")?.n, 1);
  });

  it('foreignSides "independent": the desk opens its own beside the operator\'s side and never sets that side\'s leverage', async () => {
    const run = async (foreignSides: "avoid" | "independent") => {
      const { rt, ex, step } = desk(26, { foreignSides });
      const lev: string[] = [];
      ex.leverage = async () => ({ long: 5, short: 5, maxLong: 20, maxShort: 20 }) as never;
      ex.setLeverage = async (sym: string, side: string) => {
        lev.push(`${sym}|${side}`);
      };
      // the desk's own long on S1 first (sets the symbol's margin mode and leverage), then the operator shorts S1 by hand
      await step();
      const KS = "S1-USDT|SHORT";
      ex.foreignFill(KS, 5);
      lev.length = 0;
      rt.paper.positions = [lanePos(), { ...lanePos(), side: -1, stop: 17 * 1.03, target: 17 * 0.97 }] as never;
      const from = ex.log.length;
      await step();
      await step();
      return { ex, lev, KS, from };
    };
    const avoid = await run("avoid");
    assert.ok(near(avoid.ex.positions.get(avoid.KS) ?? 0, 5), "avoid: the operator's side frozen");
    assert.deepEqual(sentOn(avoid.ex, avoid.from, avoid.KS), []);
    const ind = await run("independent");
    const opens = sentOn(ind.ex, ind.from, ind.KS).filter((o) => o.type === "MARKET" && o.side === "SELL");
    assert.equal(opens.length, 1, "independent: the desk opened its own short beside the operator's");
    const own = Number(opens[0].quantity);
    assert.ok(near(ind.ex.positions.get(ind.KS) ?? 0, 5 + own));
    assert.ok(!ind.lev.includes("S1-USDT|SHORT"), `leverage set on the operator's side: ${ind.lev}`);
    // every desk order there is bounded to its own quantity; all of them trigger: the operator's 5 stay
    assert.ok(sentOn(ind.ex, ind.from, ind.KS).every((o) => o.closePosition === undefined && Number(o.quantity) <= own + 1e-9));
    for (const o of keyOrders(ind.ex, ind.KS)) ind.ex.triggerOrder(o.id);
    assert.ok(near(ind.ex.positions.get(ind.KS) ?? 0, 5), `left ${ind.ex.positions.get(ind.KS)}`);
  });
  it("a timed-out entry counts only with the fill the venue confirms (never a manual position on its side)", () => {
    assert.equal(entryFilledQty({ order: { status: "FILLED", executedQty: "0.6" } }, 0.6), 0.6);
    assert.equal(entryFilledQty({ order: { status: "FILLED" } }, 0.6), 0.6);
    assert.equal(entryFilledQty({ order: { status: "PARTIALLY_FILLED", executedQty: "0.2" } }, 0.6), 0.2);
    assert.equal(entryFilledQty({ order: { status: "CANCELED", executedQty: "0" } }, 0.6), 0);
    assert.equal(entryFilledQty({ order: { status: "NEW" } }, 0.6), null);
    assert.equal(entryFilledQty(null, 0.6), null);
  });

  it("resizeExits: never without a stop, never resting for more than ours beside someone else's quantity", () => {
    const one = [{ id: "a", qty: 2, px: 9 }];
    // more is ours: a top-up, nothing cancelled
    assert.deepEqual(resizeExits(one, 3, true), { cancel: [], place: { qty: 1, px: 9 }, placeFirst: true, bare: false });
    // less, nobody else's quantity: the new one first
    assert.deepEqual(resizeExits(one, 1, false), { cancel: ["a"], place: { qty: 1, px: 9 }, placeFirst: true, bare: false });
    // less on a merged key: a piece that fits stays while the others go, then the rest is topped up
    assert.deepEqual(resizeExits([{ id: "a", qty: 2, px: 9 }, { id: "b", qty: 1, px: 9 }], 1.5, true), {
      cancel: ["a"],
      place: { qty: 0.5, px: 9 },
      placeFirst: false,
      bare: false,
    });
    assert.equal(resizeExits(one, 1, true)?.bare, true);
    assert.equal(resizeExits(one, 2.0005, false, 0.001), null);
  });

  it("an increase re-sizes the own stop with the new one placed first; beside someone else's quantity a top-up", async () => {
    const run = async (merged: boolean) => {
      const { rt, ex, step } = desk(27);
      await step();
      // whenever a stop of ours is cancelled, another one rests on the key: it is never without a stop
      const cancel = ex.cancel.bind(ex);
      ex.cancel = async (sym: string, id: string) => {
        const o = ex.orders.find((x) => x.id === id);
        if (o?.type === "STOP_MARKET" && o.venueSymbol === "S1-USDT" && (ex.positions.get(K) ?? 0) > 0)
          assert.ok(keyOrders(ex).some((x) => x.type === "STOP_MARKET" && x.id !== id), "another stop rests when one is cancelled");
        return cancel(sym, id);
      };
      const before = ex.positions.get(K) ?? 0;
      if (merged) {
        ex.foreignFill(K, 10);
        await step();
      }
      const first = keyOrders(ex).find((o) => o.type === "STOP_MARKET")!;
      (rt.paper.positions[0] as { vol: number }).vol = 3;
      await step();
      await step();
      const own = (ex.positions.get(K) ?? 0) - (merged ? 10 : 0);
      assert.ok(own > before * 1.5, `increased ${before} → ${own}`);
      const stops = keyOrders(ex).filter((o) => o.type === "STOP_MARKET");
      assert.ok(near(stops.reduce((a, o) => a + (o.qty ?? 0), 0), own), JSON.stringify({ own, stops }));
      return { stops, first };
    };
    const alone = await run(false);
    assert.equal(alone.stops.length, 1, "a key wholly ours keeps one stop");
    const beside = await run(true);
    assert.ok(beside.stops.some((o) => o.id === beside.first.id), "merged: the first stop still rests, topped up");
  });

  it('"independent" opens on a symbol the desk never set: its margin mode is read (never set), another mode holds', async () => {
    const run = async (venueMode: "cross" | "isolated") => {
      const { rt, ex, step } = desk(28, { foreignSides: "independent" });
      ex.margins.set("S2-USDT", venueMode);
      const KS = "S2-USDT|SHORT";
      ex.foreignFill(KS, 5);
      rt.paper.positions = [{ cfg: SIG, sym: "S2-USDT", side: -1, entry: 24, stop: 24 * 1.03, target: 24 * 0.97, entryT: Date.now() - 60_000, vol: 1 }] as never;
      await step();
      await step();
      return { ex, KS };
    };
    const cross = await run("cross");
    assert.equal(sentOn(cross.ex, 0, cross.KS).filter((o) => o.type === "MARKET").length, 1, "opened beside the operator's");
    assert.ok(!cross.ex.marginSet.includes("S2-USDT"), "margin mode never set there");
    const iso = await run("isolated");
    assert.deepEqual(sentOn(iso.ex, 0, iso.KS), [], "another margin mode: not opened");
    assert.ok(!iso.ex.marginSet.includes("S2-USDT"));
    assert.ok(near(iso.ex.positions.get(iso.KS) ?? 0, 5));
  });
  it("a symbol holding someone else's quantity keeps its margin mode and that side its leverage — also when avoided", async () => {
    const { rt, ex, step } = desk(29);
    const lev: string[] = [];
    ex.leverage = async () => ({ long: 5, short: 5, maxLong: 20, maxShort: 20 }) as never;
    ex.setLeverage = async (sym: string, side: string) => {
      lev.push(`${sym}|${side}`);
    };
    // the operator shorts S1 by hand before the desk ever traded it; the desk's lane is long S1
    ex.foreignFill("S1-USDT|SHORT", 5);
    void rt;
    await step();
    await step();
    assert.ok((ex.positions.get(K) ?? 0) > 0, "the desk opened its long (margin mode read: cross)");
    assert.ok(!ex.marginSet.includes("S1-USDT"), "margin mode never set on a symbol holding the operator's short");
    assert.ok(!lev.includes("S1-USDT|SHORT"), `leverage set on the operator's side: ${lev}`);
  });

  it("an own stop placed before quantity-bounded exits (closePosition) is replaced by a bounded one at its price, placed first", async () => {
    const { rt, ex, step } = desk(30);
    await step();
    const own = ex.positions.get(K) ?? 0;
    const old = keyOrders(ex).find((o) => o.type === "STOP_MARKET")!;
    // an earlier version's closePosition stop: placed (in the ledger) before this desk bounded its exits
    old.closePosition = true;
    mock.timers.tick(70_000);
    rt.db.run("UPDATE live_orders SET at = at - 3600000");
    const cancel = ex.cancel.bind(ex);
    ex.cancel = async (sym: string, id: string) => {
      if (id === old.id) assert.ok(keyOrders(ex).some((x) => x.type === "STOP_MARKET" && x.id !== id && !x.closePosition), "the bounded one rests first");
      return cancel(sym, id);
    };
    await step();
    await step();
    const stops = keyOrders(ex).filter((o) => o.type === "STOP_MARKET");
    assert.equal(stops.length, 1, JSON.stringify(stops));
    assert.ok(!stops[0].closePosition && near(stops[0].qty ?? 0, own) && near(stops[0].stopPrice ?? 0, old.stopPrice ?? 0), JSON.stringify(stops));
  });
});

