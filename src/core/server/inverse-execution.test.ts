// Deterministic adapter integration, not real venue/PF evidence.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { fakeRt, lane, rng, SimExchange, PINNED_END } from "../test-support.ts";
import { stepLive, liveKv, resetLiveBackoff } from "./live.server.ts";
import { CoreDb } from "./db.server.ts";

for (const symbols of [12, 20]) test(`Inverse preserves ${symbols}-symbol long/short identities through native open, stop updates and close`, async () => {
  const prev = process.env.CTS_CORE_LIVE;
  process.env.CTS_CORE_LIVE = "1";
  // Each scenario owns its clock and retry state. Resetting a wall-clock mock after a +61s
  // step must not leave a future account backoff in the next independent exchange fixture.
  resetLiveBackoff();
  mock.timers.enable({ apis: ["Date"], now: PINNED_END + symbols * 3_600_000 });
  const db = new CoreDb(":memory:");
  try {
    const { rt, prices } = fakeRt(db, symbols);
    rt.settings.live.maxNotionalUsd = 1000;
    const cfg = (side: number) =>
      `follow|inverse-known-trend-ema@m${side === 1 ? 5 : 15}|tp2|sl1|tr0|h24|mn`;
    rt.paper.positions = prices.flatMap((p) =>
      ([1, -1] as const).map((side) => ({
        ...lane(cfg(side), p.sym, side, p.last, 1, 0.02),
        target: p.last * (1 + side * 0.02),
      })),
    );
    const ex = new SimExchange(rng(17), { symbols }).withEquity(10_000);
    for (const p of prices) ex.px.set(p.sym, p.last);
    await stepLive(rt as never, [], 1, ex);
    const initial = await ex.book();
    assert.equal(initial.positions.length, symbols * 2, JSON.stringify(liveKv(rt.db, "controlStatus")));
    for (const p of prices)
      for (const ps of ["LONG", "SHORT"]) {
        assert.ok(
          initial.positions.some(
            (x) => x.venueSymbol === p.sym && x.side === ps.toLowerCase() && x.qty > 0,
          ),
        );
        assert.ok(
          initial.orders.some(
            (o) => o.venueSymbol === p.sym && o.positionSide === ps && o.type === "STOP_MARKET",
          ),
        );
        const takeProfit = initial.orders.find(
          (o) => o.venueSymbol === p.sym && o.positionSide === ps && o.type === "TAKE_PROFIT_MARKET",
        );
        const side = ps === "LONG" ? 1 : -1;
        const target = rt.paper.positions.find((lane) => lane.sym === p.sym && lane.side === side)!.target!;
        assert.ok(takeProfit?.stopPrice && side * (takeProfit.stopPrice - target) > 0,
          `${p.sym} ${ps}: native take-profit stays beyond the exact owned lane target`);
      }
    const owned = new Map(initial.positions.map((p) => [`${p.venueSymbol}|${p.side}`, p.qty]));
    for (const p of rt.paper.positions) p.stop = p.entry * (1 - p.side * 0.01);
    mock.timers.tick(61_000); // venue control repricing interval
    await stepLive(rt as never, [], 1, ex);
    const updated = await ex.book();
    assert.deepEqual(
      new Map(updated.positions.map((p) => [`${p.venueSymbol}|${p.side}`, p.qty])),
      owned,
    );
    for (const p of rt.paper.positions) {
      const matches = (o: (typeof initial.orders)[number]) =>
        o.venueSymbol === p.sym &&
        o.positionSide === (p.side === 1 ? "LONG" : "SHORT") &&
        o.type === "STOP_MARKET";
      const before = initial.orders.find(matches)?.stopPrice;
      const after = updated.orders.find(matches)?.stopPrice;
      assert.ok(
        before && after && p.side * (after - before) > 0,
        `${p.sym} ${p.side}: ${before} → ${after}`,
      );
      // The venue backstop sits outside the exact per-lane stop (1.2× with venue floors).
      assert.ok(p.side * (p.stop - after!) >= -0.001);
    }
    rt.paper.positions = [];
    await stepLive(rt as never, [], 1, ex);
    assert.equal((await ex.book()).positions.length, 0);
    assert.equal((await ex.book()).orders.length, 0);
    assert.equal(ex.fills.filter((f) => f.into).length, symbols * 2);
    assert.equal(ex.fills.filter((f) => !f.into).length, symbols * 2);
  } finally {
    resetLiveBackoff();
    mock.timers.reset();
    if (prev === undefined) delete process.env.CTS_CORE_LIVE;
    else process.env.CTS_CORE_LIVE = prev;
  }
});
