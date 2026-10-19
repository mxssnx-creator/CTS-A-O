// Someone else adds to a symbol × side the desk holds (the venue merges both into one position): the desk's stop and
// take-profit there close only the desk's own quantity — a closePosition order would close the operator's part too
// (bug hunt, 13 Oct). Once the key is wholly the desk's again, they go back to closePosition.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stepLive, type ExchangeClient } from "./live.server.ts";
import { CoreDb } from "./db.server.ts";
import { fakeRt, rng, SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";

const SIG = "follow|sig-ema-cross-s@m15|tp1|sl2|tr0|h192";
const K = "S1-USDT|LONG";

describe("control: someone else's quantity on a held key", () => {
  it("the desk's stop and take-profit there close only the desk's quantity; wholly ours again → closePosition", async () => {
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
    assert.ok(exits().some((o) => o.type === "STOP_MARKET" && o.closePosition), "its closePosition stop");
    // the operator buys 10 by hand: one merged position
    ex.positions.set(K, own + 10);
    await step();
    await step();
    const stops = exits().filter((o) => o.type === "STOP_MARKET");
    assert.ok(stops.length > 0, "the desk's part keeps a stop");
    assert.ok(stops.every((o) => !o.closePosition && Math.abs((o.qty ?? 0) - own) < 1e-9), JSON.stringify(stops));
    assert.ok(exits().every((o) => !o.closePosition), "no closePosition order on the merged position");
    // every desk exit order triggers: the operator's 10 stay
    for (const o of exits()) ex.triggerOrder(o.id);
    assert.ok(Math.abs((ex.positions.get(K) ?? 0) - 10) < 1e-9, `left ${ex.positions.get(K)}`);
  });

  it("the operator's part is gone again: the bounded stop goes back to closePosition", async () => {
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
    assert.ok(stops[0].closePosition);
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
});
