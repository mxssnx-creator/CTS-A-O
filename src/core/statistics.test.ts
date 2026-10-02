import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStatistics, subTypeOf, timeline, typeOf, withWithout, type StatTrade } from "./statistics.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 30, 0);
const tr = (o: Partial<StatTrade>): StatTrade => ({
  cfg: "follow|rsi-mom-14-20@m15|tp3|sl3|tr0|h64",
  sym: "SOL-USDT",
  side: 1,
  entryT: T0,
  exitT: T0 + H,
  entry: 100,
  r: 0.01,
  reason: "tp",
  ...o,
});

test("timeline: balance steps at each close, equity marks open orders, margin and the open book follow", () => {
  const trades = [
    tr({ entryT: T0, exitT: T0 + 2 * H, r: 0.02 }),
    tr({ sym: "BTC-USDT", side: -1, entryT: T0 + H, exitT: T0 + 3 * H, r: -0.01, cfg: "revert|z-50-2.5@m5|tp1|sl1|tr0|h64" }),
  ];
  const price = (sym: string, t: number) => (sym === "SOL-USDT" ? 100 + (t - T0) / H : 100);
  const tl = timeline(trades, {
    startT: T0,
    endT: T0 + 4 * H,
    balance: 1000,
    unit: () => 100,
    price,
    cost: 0,
    leverage: 10,
    points: 4,
  });
  assert.equal(tl.stepMs, H);
  assert.equal(tl.points.length, 5);
  const at = (h: number) => tl.points[h];
  // 1 h: SOL long marked +1 %, BTC short just opened
  assert.equal(at(1).orders, 2);
  assert.equal(at(1).positions, 2);
  assert.equal(at(1).sets, 2);
  assert.ok(Math.abs(at(1).equity - 1001) < 1e-9);
  assert.ok(Math.abs(at(1).margin - 20) < 1e-9);
  // 2 h: SOL closed at +2 % (r × unit = 2)
  assert.ok(Math.abs(at(2).balance - 1002) < 1e-9);
  // 3 h: BTC closed at −1 %
  assert.ok(Math.abs(at(4).balance - 1001) < 1e-9);
  assert.equal(at(4).orders, 0);
  assert.ok(tl.maxDd > 0);
  assert.equal(tl.ordersMax, 2);
});

test("types and sub-types: Block raised / Active level, DCA vs DCA Active, Axis, Signals", () => {
  assert.equal(typeOf(tr({ kind: "trailing" })), "Trailing");
  assert.equal(typeOf(tr({ cfg: "follow|sig-cci-m@m15|tp3|sl3|tr0|h64" })), "Signals");
  assert.equal(typeOf(tr({ cfg: "follow|x|tp3|sl3|tr0|h64|dcaA" })), "DCA Active");
  assert.deepEqual(subTypeOf(tr({ mult: 1 }), 2), ["Base (unit volume)"]);
  assert.deepEqual(subTypeOf(tr({ mult: 1.4, level: 2 }), 2), ["Block raised", "Block Active level"]);
  assert.deepEqual(subTypeOf(tr({ mult: 1.2, level: 1 }), 2), ["Block raised", "Block below Active level"]);
  // coordination volume alone is not a Block raise
  assert.deepEqual(subTypeOf(tr({ mult: 1.5, coordVol: 1.5 }), 2), ["Base (unit volume)"]);
  assert.deepEqual(subTypeOf(tr({ kind: "axis" }), 2), ["Axis"]);
  assert.deepEqual(subTypeOf(tr({}), 2), ["Base (no Block detail)"]);
});

test("the report groups every dimension and compares presets with and without each sub-strategy", () => {
  const trades = [
    tr({ r: 0.02, mult: 1 }),
    tr({ r: -0.01, exitT: T0 + 2 * H, mult: 1.5, level: 3, cfg: "follow|rsi-mom-14-20@m15|tp0.8|sl0.8|tr0|h64|sh" }),
    tr({ r: 0.005, exitT: T0 + 3 * H, kind: "dca", cfg: "follow|rsi-mom-14-20@m15|tp3|sl3|tr0|h64|dca" }),
  ];
  const presets = {
    normal: { label: "Normal only", stats: { n: 10, pf: 1.2, net: 3, ddt: 4, wr: 0.6, gh: 0.5 } },
    "normal-trailing": { label: "Normal + Trailing", stats: { n: 12, pf: 1.4, net: 5, ddt: 3, wr: 0.6, gh: 0.6 } },
    block: { label: "Block", stats: { n: 12, pf: 1.6, net: 7, ddt: 3, wr: 0.6, gh: 0.6 } },
  };
  const r = buildStatistics({
    source: "sim",
    trades,
    startT: T0,
    endT: T0 + 4 * H,
    balance: 100,
    unit: () => 10,
    price: () => null,
    cost: 0.002,
    leverage: 10,
    minActiveLevel: 2,
    presets,
  });
  assert.equal(r.total.n, 3);
  assert.ok(Math.abs(r.total.usd - 0.15) < 1e-9);
  assert.deepEqual(
    r.ranges.map((x) => [x.key, x.n]),
    [
      ["Wide", 2],
      ["Short", 1],
    ],
  );
  assert.equal(r.types.find((x) => x.key === "DCA")?.n, 1);
  assert.equal(r.subTypes.find((x) => x.key === "Block Active level")?.n, 1);
  assert.equal(r.configs.length, 3);
  assert.equal(r.configs.find((c) => c.range === "Short")?.tp, 0.008);
  assert.equal(r.hourOfDay.length, 3);
  assert.ok(r.detail.blockDetail);
  const ww = withWithout(presets);
  assert.deepEqual(
    ww.map((x) => [x.label, +x.dPf.toFixed(2)]),
    [
      ["Trailing", 0.2],
      ["Block", 0.2],
    ],
  );
});

test("live closes are built from the own ledger: opens at their fills, reduces / closes realize, range from the id", async () => {
  const { liveTrades } = await import("./statistics.ts");
  const T = 1_790_000_000_000;
  const rows = [
    { coid: "CTSBV2_Ua1", sym: "SOL-USDT", side: 1, kind: "O", qty: 1, px: 100, status: "ok", at: T, fillPx: 100.1, fee: 0.05 },
    { coid: "CTSBV2_Sa2", sym: "SOL-USDT", side: 1, kind: "S", qty: 1, px: 95, status: "ok", at: T + 1 },
    { coid: "CTSBV2_Ea3", sym: "SOL-USDT", side: 1, kind: "I", qty: 1, px: 102, status: "ok", at: T + 2, fillPx: 102.1, fee: 0.05 },
    { coid: "CTSBV2_Ca4", sym: "SOL-USDT", side: 1, kind: "R", qty: 1, px: 104, status: "ok", at: T + 3, fillPx: 104, fee: 0.05 },
    { coid: "CTSBV2_Ca5", sym: "SOL-USDT", side: 1, kind: "X", qty: 1, px: 99, status: "ok", at: T + 4, fillPx: 99, fee: 0.05 },
    // a refused order never counts
    { coid: "CTSBV2_Na6", sym: "ETH-USDT", side: -1, kind: "O", qty: 1, px: 2000, status: "error", at: T + 5 },
  ];
  const xs = liveTrades(rows, "CTSBV2_".length);
  assert.equal(xs.length, 2);
  assert.ok(xs.every((x) => x.cfg.endsWith("|mc")), "the range of the opening id");
  const entry = (100.1 + 102.1) / 2;
  assert.ok(Math.abs(xs[0].entry - entry) < 1e-9);
  // first reduce: half the position, half the opening fees and its own fee
  const pnl1 = (104 - entry) * 1 - 0.05 - 0.05;
  assert.ok(Math.abs(xs[0].r * xs[0].notional - pnl1) < 1e-9);
  const pnl2 = (99 - entry) * 1 - 0.05 - 0.05;
  assert.ok(Math.abs(xs[1].r * xs[1].notional - pnl2) < 1e-9);
  assert.equal(xs[1].reason, "close");
});

test("preset diagrams and info: positions per hour, PF of the last 12 / 25 / 75 positions, P&L per type, DDT", async () => {
    const { presetSeries, positionResults } = await import("./statistics.ts");
    const H = 3_600_000;
    const T0 = Date.UTC(2026, 9, 1);
    const trades = [];
    // 30 positions on one symbol, one hour each; every third loses; two overlapping orders form one position
    for (let i = 0; i < 30; i++)
      trades.push({
        cfg: `b|ema-9-21|tp2|sl2|tr0|h16${i % 2 ? "" : "|trailing"}`,
        sym: "A-USDT",
        side: 1,
        entryT: T0 + i * H,
        exitT: T0 + i * H + H / 2,
        entry: 100,
        r: i % 3 === 2 ? -0.02 : 0.01,
        kind: (i % 2 ? "normal" : "trailing") as never,
        ...(i === 4 ? { mult: 2 } : {}),
      });
    trades.push({ ...trades[0], cfg: "b|x|dca", kind: "dca" as never, entryT: T0 + 10 * 60_000, exitT: T0 + 20 * 60_000, r: 0.005 });
    const unit = () => 100;
    const ps = positionResults(trades, unit);
    assert.equal(ps.length, 30, "the overlapping DCA order joins the first position");
    const s = presetSeries(trades, {
      startT: T0,
      endT: T0 + 30 * H,
      balance: 1000,
      unit,
      price: () => 100,
      cost: 0.002,
      leverage: 10,
      days: 1.25,
      points: 120,
    });
    assert.equal(s.info.positions, 30);
    assert.equal(s.info.posPerHour, 1);
    // last 12 positions: 8 wins × 1 USD vs 4 losses × 2 USD
    assert.ok(Math.abs((s.info.pfLast12 ?? 0) - 1) < 1e-9, String(s.info.pfLast12));
    assert.ok(s.info.pfLast25 !== null && s.info.pfLast75 === null);
    assert.equal(s.t.length, s.balance.length);
    assert.equal(s.kinds.DCA.at(-1), 0.5);
    assert.equal(s.kinds.Block.at(-1), 1, "the raised order counts into Block");
    const last = s.t.length - 1;
    assert.ok(Math.abs(s.kinds.Normal[last] + s.kinds.Trailing[last] + s.kinds.DCA[last] - s.info.netUsd) < 1e-6);
    assert.ok(s.info.ddtH > 0);
});
