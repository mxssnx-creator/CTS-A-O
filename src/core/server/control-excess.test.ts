// Someone else adds to a symbol × side the desk holds (the venue merges both into one position): the desk's stop there
// closes only the desk's own quantity — in hedge mode every exit order is quantity-bounded from the open on (no
// closePosition: one would close the operator's part too, also while the desk is away; bug hunt 13 Oct, PUMP 14 Oct),
// and no take-profit rests on the merged key. Once the key is wholly the desk's again, it stays bounded.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stepLive, type ExchangeClient } from "./live.server.ts";
import { CoreDb } from "./db.server.ts";
import { fakeRt, rng, SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";

const SIG = "follow|sig-ema-cross-s@m15|tp1|sl2|tr0|h192";
const K = "S1-USDT|LONG";

describe("control: someone else's quantity on a held key", () => {
  it("the desk's stop there closes only the desk's quantity, no take-profit; every desk exit order triggers → the operator's 10 stay", async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [
      { cfg: SIG, sym: "S1-USDT", side: 1, entry: 17, stop: 17 * 0.97, target: 17 * 1.03, entryT: Date.now() - 60_000, vol: 1 },
    ] as never;
    const ex = new SimExchange(rng(1));
    const step = () => stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    await step();
    const own = ex.positions.get(K) ?? 0;
    assert.ok(own > 0, "the desk opened");
    const exits = () => ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.positionSide === "LONG");
    assert.ok(exits().some((o) => o.type === "STOP_MARKET"), "its stop");
    assert.ok(exits().every((o) => !o.closePosition && Math.abs((o.qty ?? 0) - own) < 1e-9), "bounded from the open on");
    // the operator buys 10 by hand: one merged position
    ex.positions.set(K, own + 10);
    await step();
    await step();
    const stops = exits().filter((o) => o.type === "STOP_MARKET");
    assert.ok(stops.length > 0, "the desk's part keeps a stop");
    assert.ok(stops.every((o) => !o.closePosition && Math.abs((o.qty ?? 0) - own) < 1e-9), JSON.stringify(stops));
    assert.ok(!exits().some((o) => o.type === "TAKE_PROFIT_MARKET"), "no take-profit on the merged position");
    assert.ok(ex.log.every((o) => o.closePosition === undefined), "no closePosition order ever sent in hedge mode");
    // every desk exit order triggers: the operator's 10 stay
    for (const o of exits()) ex.triggerOrder(o.id);
    assert.ok(Math.abs((ex.positions.get(K) ?? 0) - 10) < 1e-9, `left ${ex.positions.get(K)}`);
  });

  it("the operator's part is gone again: one bounded stop for the desk's quantity", async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.paper.positions = [
      { cfg: SIG, sym: "S1-USDT", side: 1, entry: 17, stop: 17 * 0.97, target: 17 * 1.03, entryT: Date.now() - 60_000, vol: 1 },
    ] as never;
    const ex = new SimExchange(rng(2));
    const step = () => stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    await step();
    const own = ex.positions.get(K) ?? 0;
    ex.positions.set(K, own + 10);
    await step();
    ex.positions.set(K, own);
    await step();
    await step();
    const stops = ex.orders.filter((o) => o.venueSymbol === "S1-USDT" && o.positionSide === "LONG" && o.type === "STOP_MARKET");
    assert.equal(stops.length, 1, JSON.stringify(stops));
    assert.ok(!stops[0].closePosition && Math.abs((stops[0].qty ?? 0) - own) < 1e-9, JSON.stringify(stops));
  });
});

describe("control: restart after the desk's stop filled while it was away", () => {
  it("the operator's new position on that side is not adopted through the old ledger: no order, untouched", async () => {
    const db = new CoreDb(":memory:");
    const { rt } = fakeRt(db);
    const pos = { cfg: SIG, sym: "S1-USDT", side: 1, entry: 17, stop: 17 * 0.97, target: 17 * 1.03, entryT: Date.now() - 60_000, vol: 1 };
    rt.paper.positions = [pos] as never;
    const ex = new SimExchange(rng(3));
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    assert.ok((ex.positions.get(K) ?? 0) > 0, "the desk opened");
    // the desk is down: its stop fills, the operator buys 5 by hand on the same side (no orders)
    ex.triggerStop(K);
    for (const o of ex.orders.filter((x) => x.venueSymbol === "S1-USDT")) await ex.cancel("S1-USDT", o.id);
    ex.positions.set(K, 5);
    const sent = ex.log.length;
    // relaunch, the opens out of the "recent" window: a fresh runtime state on the same database
    db.run("UPDATE live_orders SET at = at - 3600000");
    const { rt: rt2 } = fakeRt(db);
    rt2.paper.positions = [pos] as never;
    await stepLive(rt2 as never, [], 1, ex as unknown as ExchangeClient);
    rt2.paper.positions = [] as never;
    await stepLive(rt2 as never, [], 1, ex as unknown as ExchangeClient);
    assert.equal(ex.positions.get(K), 5, "the operator's 5 untouched");
    const onS1 = ex.log.slice(sent).filter((o) => o.symbol === "S1-USDT" && o.positionSide === "LONG");
    assert.deepEqual(onS1, [], "no order on the operator's side");
  });

  for (const side of [1, -1] as const) it(`foreignSides "independent", side ${side}: restart never adopts or trades into the operator's 5`, async () => {
    const db = new CoreDb(":memory:");
    const { rt } = fakeRt(db);
    rt.settings.live = { ...rt.settings.live, foreignSides: "independent" } as typeof rt.settings.live;
    const ps = side === 1 ? "LONG" : "SHORT", key = `S1-USDT|${ps}`;
    const pos = { cfg: SIG, sym: "S1-USDT", side, entry: 17, stop: 17 * (side === 1 ? 0.97 : 1.03), target: 17 * (side === 1 ? 1.03 : 0.97), entryT: Date.now() - 60_000, vol: 1 };
    rt.paper.positions = [pos] as never;
    const ex = new SimExchange(rng(4));
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    assert.ok((ex.positions.get(key) ?? 0) > 0, "an own parent existed before the restart");
    ex.triggerStop(key);
    for (const o of ex.orders.filter((x) => x.venueSymbol === "S1-USDT")) await ex.cancel("S1-USDT", o.id);
    ex.positions.set(key, 5);
    ex.orders.push({ id: `manual-stop-${ps}`, symbol: "S1-USDT", venueSymbol: "S1-USDT", positionSide: ps,
      type: "STOP_MARKET", stopPrice: side === 1 ? 15 : 19, qty: 5, clientOrderId: `external-${ps}` });
    db.run("UPDATE live_orders SET at = at - 3600000");
    const { rt: rt2 } = fakeRt(db);
    rt2.settings.live = { ...rt2.settings.live, foreignSides: "independent" } as typeof rt2.settings.live;
    rt2.paper.positions = [pos] as never;
    const sent = ex.log.length;
    await stepLive(rt2 as never, [], 1, ex as unknown as ExchangeClient);
    // (the lane that held the stopped-out position stays held back; a new lane is a new decision)
    rt2.paper.positions = [{ ...pos, entryT: Date.now() - 30_000 }] as never;
    await stepLive(rt2 as never, [], 1, ex as unknown as ExchangeClient);
    await stepLive(rt2 as never, [], 1, ex as unknown as ExchangeClient);
    rt2.paper.positions = [] as never;
    await stepLive(rt2 as never, [], 1, ex as unknown as ExchangeClient);
    const onS1 = ex.log.slice(sent).filter((o) => o.symbol === "S1-USDT" && o.positionSide === ps);
    assert.deepEqual(onS1, [], "old and new parents cannot enter the occupied foreign side");
    assert.equal(ex.positions.get(key), 5, "the foreign quantity was not adopted or closed");
    assert.ok(ex.orders.some((o) => o.id === `manual-stop-${ps}` && o.qty === 5), "the foreign protective stop stays untouched");
  });
});
