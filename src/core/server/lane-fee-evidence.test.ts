import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEFAULT_SETTINGS, RT_COST } from "../config.ts";
import { CoreDb } from "./db.server.ts";
import { parseFill, recordLanes } from "./live.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const runtimes: CoreRuntime[] = [];
afterEach(() => { for (const runtime of runtimes.splice(0)) runtime.dispose(); });
function fixture(commissions: Array<string | null>) {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, { symbols: 1 }, { market: "synthetic", priceStream: null });
  runtimes.push(rt);
  for (let i = 0; i < commissions.length; i++) {
    const commission = commissions[i];
    const fill = parseFill({ order: { avgPrice: "100", executedQty: "1", ...(commission === null ? {} : { commission }) } })!;
    db.run("INSERT INTO live_fills(coid,sym,side,kind,qty,ref_px,fill_px,fee,fee_known,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      `fill-${i}`, "A-USDT", 1, i % 2 ? "X" : "O", fill.qty, 100, fill.px, fill.fee, fill.fee === null ? null : 1, i);
  }
  const lc = rt.liveCost();
  if (lc) db.kvSet("liveCost", lc);
  return { db, rt, lc };
}
function roundTrip(rt: Pick<CoreRuntime, "db" | "settings">, side: 1 | -1 = 1) {
  const key = `A-USDT|${side}`;
  const lane = { id: `cfg|A-USDT|${side}|100`, cfg: "cfg", sym: "A-USDT", side };
  const common = { grew: new Map<string, number>(), shrank: new Map<string, number>(),
    external: new Map<string, number | null>(), prices: new Map([["A-USDT", 100]]) };
  recordLanes(rt, { ...common, lanes: [lane], heldAfter: new Set([key]), grew: new Map([[key, 100]]), now: 100 });
  const closed = recordLanes(rt, { ...common, lanes: [], heldAfter: new Set(), shrank: new Map([[key, 100]]), now: 200 });
  assert.equal(closed.length, 1);
  assert.equal(closed[0].entry, 100);
  assert.equal(closed[0].exit, 100);
  assert.equal(closed[0].side, side);
  const stored = rt.db.get<{ r: number }>("SELECT r FROM live_lane_trades WHERE id=?", lane.id)!;
  assert.equal(stored.r, closed[0].r === 0 ? 0 : closed[0].r, "the durable return agrees (SQLite canonicalizes signed zero)");
  return stored.r;
}

describe("live lane fee measurement provenance", () => {
  it("retains confirmed zero commissions after a sufficient actual receipt sample", () => {
    const { rt, lc } = fixture(Array(40).fill("0"));
    assert.ok(lc);
    assert.equal(lc.fee, 0);
    assert.equal(lc.measuredFeeFills, 40);
    assert.equal(lc.fills, 40);
    assert.equal(roundTrip(rt), 0);
    assert.equal(roundTrip(rt, -1), 0);
  });

  it("accepts the established minimum of twenty measured fee receipts in forty fills", () => {
    const { rt, lc } = fixture([...Array(20).fill("0"), ...Array(20).fill(null)]);
    assert.equal(lc?.measuredFeeFills, 20);
    assert.equal(roundTrip(rt), 0);
  });

  it("keeps positive measured fees unchanged and does not charge price slippage twice", () => {
    const { db, rt, lc } = fixture(Array(40).fill("-0.05"));
    assert.ok(lc);
    assert.ok(Math.abs(lc.fee - .0005) < 1e-12);
    assert.ok(Math.abs(roundTrip(rt) + .001) < 1e-12);
    // Old positive measurements have always been usable without the new zero-fee provenance field.
    db.kvSet("liveCost", { fee: .0004, slip: .01 });
    assert.ok(Math.abs(roundTrip(rt, -1) + .0008) < 1e-12);
  });

  it("falls back to the modeled 0.15% when receipts are unknown or insufficient", () => {
    assert.equal(DEFAULT_SETTINGS.cost, RT_COST);
    assert.equal(RT_COST, .0015);
    for (const commissions of [Array(40).fill(null), Array(39).fill("0"), [...Array(19).fill("0"), ...Array(21).fill(null)]]) {
      const { rt, lc } = fixture(commissions);
      assert.equal(lc, null);
      assert.equal(roundTrip(rt), -RT_COST);
    }
  });

  it("does not let legacy zeros or incomplete cached evidence bypass the model", () => {
    const { db, rt } = fixture([]);
    for (const cache of [{ fee: 0 }, { fee: 0, fills: 40 }, { fee: 0, fills: 40, measuredFeeFills: 19 },
      { fee: 0, fills: 39, measuredFeeFills: 39 }, { fee: 0, fills: 40, measuredFeeFills: 41 },
      { fee: 0, fills: "40", measuredFeeFills: 20 }, { fee: 0, fills: 40, measuredFeeFills: "20" },
      { fee: -1 }, { fee: "0" }]) {
      db.kvSet("liveCost", cache);
      assert.equal(roundTrip(rt), -RT_COST);
    }
    // A deliberately configured model remains the fallback; this fix only changes measured-zero handling.
    rt.settings.cost = .0021;
    db.kvSet("liveCost", { fee: 0 });
    assert.equal(roundTrip(rt), -.0021);
  });
});
