import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStatistics, presetSeries, subTypeOf, timeline, typeOf, withWithout, type StatTrade } from "./statistics.ts";
import { statsOf, unitStatsOf } from "./metrics/stats.ts";

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
  assert.deepEqual(subTypeOf(tr({ mult: 3, coordVol: 1.5, hedgeVol: 2 }), 2), ["Base (unit volume)"]);
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
    normal: { label: "Normal only", stats: { n: 10, pf: 1.2, gp: 18, gl: 15, net: 3, ddt: 4, wr: 0.6, gh: 0.5, pfBasis: "unit-net-returns" as const, unknownReturns: 0 } },
    "normal-trailing": { label: "Normal + Trailing", stats: { n: 12, pf: 1.4, gp: 17.5, gl: 12.5, net: 5, ddt: 3, wr: 0.6, gh: 0.6, pfBasis: "unit-net-returns" as const, unknownReturns: 0 } },
    block: { label: "Block", stats: { n: 12, pf: 1.6, gp: 56 / 3, gl: 35 / 3, net: 7, ddt: 3, wr: 0.6, gh: 0.6, pfBasis: "unit-net-returns" as const, unknownReturns: 0 } },
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
  // every hour of the day is a row (3 with closes), every UTC day of the window too
  assert.equal(r.hourOfDay.length, 24);
  assert.deepEqual(
    r.hourOfDay.filter((x) => x.n > 0).map((x) => x.key),
    ["00", "01", "02"],
  );
  assert.deepEqual(r.daily.map((x) => x.key), ["2026-09-30"]);
  assert.equal(r.configCount, 3);
  assert.equal(r.balanceStart, 100);
  assert.ok(r.detail.blockDetail);
  const ww = withWithout(presets);
  assert.deepEqual(
    ww.map((x) => { assert.ok(typeof x.dPf === "number"); return [x.label, +x.dPf.toFixed(2)]; }),
    [
      ["Trailing", 0.2],
      ["Block", 0.2],
    ],
  );
  assert.equal(r.presets[0].gp, 18);
  assert.equal(r.presets[0].gl, 15);
  assert.equal(r.presets[0].noLoss, false);
  assert.equal(r.presets[0].pfConvention, "gross-return-ratio");
});

test("with/without return PF never subtracts no-loss scores or an empty sample as finite ratios", () => {
  const of = (returns: number[]) => unitStatsOf(returns.map((r, i) => ({ entryT: i * H, exitT: (i + 1) * H, r })));
  const noLoss = of([0.01]);
  const four = of([0.04, -0.01]);
  const five = of([0.05, -0.01]);
  for (const [withStats, withoutStats, expected] of [[noLoss, five, null], [five, noLoss, null], [noLoss, noLoss, null], [of([]), five, null], [four, five, -1]] as const) {
    const [row] = withWithout({ normal: { stats: withoutStats }, "normal-trailing": { stats: withStats } });
    assert.equal(row.dPf, expected);
    assert.equal(row.with.gp, withStats.gp);
    assert.equal(row.with.gl, withStats.gl);
    assert.equal(row.with.noLoss, withStats.gp > 0 && withStats.gl === 0);
    assert.equal(row.with.pfConvention, row.with.noLoss ? "no-loss-sentinel" : "gross-return-ratio");
  }
  assert.equal(noLoss.pf, four.pf, "equal engine scores have different measured ratio provenance");
});

test("older preset caches keep missing return provenance explicit and have no ratio delta", () => {
  const legacy = { n: 3, pf: 4, net: 1 };
  const [row] = withWithout({ normal: { stats: legacy }, "normal-trailing": { stats: legacy } });
  assert.equal(row.with.gp, null);
  assert.equal(row.with.gl, null);
  assert.equal(row.with.noLoss, null);
  assert.equal(row.with.pf, null);
  assert.equal(row.with.pfBasis, "unavailable");
  assert.equal(row.with.pfConvention, "unavailable");
  assert.equal(row.dPf, null);
  assert.deepEqual(JSON.parse(JSON.stringify(row)), row);
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

test("live closes: signal entries (client-id letter Q) land in Signals, the range letters stay as they were", async () => {
  const { liveTrades } = await import("./statistics.ts");
  const { liveGroupOf } = await import("./live-validation.ts");
  const { entryCoidKind } = await import("./server/live.ts");
  // the entry letter of a signal config is Q; engine configs keep their range letter (or E)
  assert.equal(entryCoidKind("follow|sig-cci-m@m15|tp3|sl3|tr0|h64"), "Q");
  assert.equal(entryCoidKind("follow|x|tp0.2|sl0.2|tr0|h16|mc"), "U");
  assert.equal(entryCoidKind("follow|rsi|tp1|sl1|tr0|h16"), "E");
  const T = 1_790_000_000_000;
  const row = (coid: string, sym: string, kind: string, qty: number, px: number, at: number) => ({
    coid, sym, side: 1, kind, qty, px, status: "ok", at, fillPx: px, fee: 0,
  });
  const rows = [
    row("CTSBV2_Qa1", "SOL-USDT", "O", 1, 100, T),
    row("CTSBV2_Ca2", "SOL-USDT", "X", 1, 101, T + 1),
    row("CTSBV2_Ha3", "ETH-USDT", "O", 1, 100, T + 2),
    row("CTSBV2_Ca4", "ETH-USDT", "X", 1, 101, T + 3),
    row("CTSBV2_Ea5", "BTC-USDT", "O", 1, 100, T + 4),
    row("CTSBV2_Ca6", "BTC-USDT", "X", 1, 101, T + 5),
    // an older id with an unknown letter: Wide, as before
    row("CTSBV2_Za7", "XRP-USDT", "O", 1, 100, T + 6),
    row("CTSBV2_Ca8", "XRP-USDT", "X", 1, 101, T + 7),
  ];
  const xs = liveTrades(rows, "CTSBV2_".length);
  assert.deepEqual(
    xs.map((x) => [x.sym, liveGroupOf(x.cfg)]),
    [
      ["SOL-USDT", "Signals"],
      ["ETH-USDT", "Short"],
      ["BTC-USDT", "Wide"],
      ["XRP-USDT", "Wide"],
    ],
  );
  assert.equal(typeOf(xs[0]), "Signals");
});

test("live closes: an exchange stop-out (flat marker F, qty 0) ends the position; the next open starts afresh", async () => {
  const { liveTrades } = await import("./statistics.ts");
  const T = 1_790_000_000_000;
  const row = (coid: string, kind: string, qty: number, px: number, at: number) => ({
    coid, sym: "SOL-USDT", side: 1, kind, qty, px, status: "ok", at, fillPx: px, fee: 0,
  });
  const rows = [
    row("CTSBV2_Ea1", "O", 1, 100, T),
    // stopped out on the exchange: no own close, the ledger marks the key flat
    row("flat-1", "F", 0, 0, T + 1),
    row("CTSBV2_Ea2", "O", 2, 200, T + 2),
    row("CTSBV2_Ca3", "X", 2, 210, T + 3),
  ];
  const xs = liveTrades(rows, "CTSBV2_".length);
  assert.equal(xs.length, 1);
  // the second position alone: entry 200 (not the ghost's blended 166.7), opened at T + 2, +5 %
  assert.equal(xs[0].entry, 200);
  assert.equal(xs[0].entryT, T + 2);
  // the fills carry no measured fee (0 = unmeasured): the model's 0.1 % per side is charged — open 2 × 200 × 0.001 = 0.4,
  // close 2 × 210 × 0.001 = 0.42 — on a gross +20 over a notional of 400: r = (20 − 0.82) / 400
  assert.ok(Math.abs(xs[0].r - 0.04795) < 1e-12, `r ${xs[0].r}`);
  // without the F marker an own open ("O") still starts a fresh position
  const ys = liveTrades([rows[0], rows[2], rows[3]], "CTSBV2_".length);
  assert.equal(ys.length, 1);
  assert.equal(ys[0].entry, 200);
});

test("live closes: a position the exchange closed (its stop, its take-profit) is booked at the price the flat marker holds", async () => {
  const { liveTrades } = await import("./statistics.ts");
  const T = 1_790_000_000_000;
  const row = (sym: string, coid: string, kind: string, qty: number, px: number, at: number, msg?: string) => ({
    coid, sym, side: 1, kind, qty, px, status: "ok", at, fillPx: kind === "F" || msg === "already flat" ? null : px, fee: 0, msg,
  });
  const rows = [
    // three positions stopped out on the exchange at -2 %: the desk prices each flat marker at the stop
    row("A-USDT", "CTSBV2_Ea1", "O", 1, 100, T),
    row("A-USDT", "flat-1", "F", 0, 98, T + 1, "flat on the exchange (stop 98)"),
    row("B-USDT", "CTSBV2_Ea2", "O", 1, 100, T + 2),
    row("B-USDT", "flat-2", "F", 0, 98, T + 3, "flat on the exchange (stop 98)"),
    row("C-USDT", "CTSBV2_Ea3", "O", 1, 100, T + 4),
    // our own close sent into a side the stop had already emptied: no fill, not the exit — the marker is
    row("C-USDT", "CTSBV2_Ca4", "X", 1, 101, T + 5, "already flat"),
    row("C-USDT", "flat-3", "F", 0, 98, T + 6, "already flat (stop 98)"),
    // one closed by its take-profit
    row("D-USDT", "CTSBV2_Ea5", "O", 1, 100, T + 7),
    row("D-USDT", "flat-4", "F", 0, 103, T + 8, "flat on the exchange (target 103)"),
    // one the desk closed itself at +1 %
    row("E-USDT", "CTSBV2_Ea6", "O", 1, 100, T + 9),
    row("E-USDT", "CTSBV2_Ca7", "X", 1, 101, T + 10),
    // a flat marker whose price is not known (px 0): no close is invented
    row("F-USDT", "CTSBV2_Ea8", "O", 1, 100, T + 11),
    row("F-USDT", "flat-5", "F", 0, 0, T + 12, "flat on the exchange"),
  ];
  const xs = liveTrades(rows, "CTSBV2_".length);
  assert.deepEqual(
    xs.map((x) => [x.sym, +x.r.toFixed(9), x.reason]),
    // Every unmeasured exit pays the model fee share, including the exchange's protective orders.
    [
      ["A-USDT", -0.02198, "sl"],
      ["B-USDT", -0.02198, "sl"],
      ["C-USDT", -0.02198, "sl"],
      ["D-USDT", 0.02797, "tp"],
      ["E-USDT", 0.00799, "close"],
    ],
  );
  // All the stops and both fee shares count in PF.
  const gp = xs.reduce((a, x) => a + Math.max(0, x.r), 0);
  const gl = xs.reduce((a, x) => a - Math.min(0, x.r), 0);
  assert.ok(Math.abs(gp / gl - 0.03596 / 0.06594) < 1e-9);
});

test("fillKeys / daysOf: every hour and every UTC day of the window", async () => {
  const { daysOf, fillKeys, emptyRow } = await import("./statistics.ts");
  assert.deepEqual(daysOf(Date.UTC(2026, 9, 1, 20), Date.UTC(2026, 9, 3, 0)), ["2026-10-01", "2026-10-02"]);
  assert.deepEqual(daysOf(5, 5), []);
  const rows = fillKeys([{ ...emptyRow("02"), n: 3 }], ["01", "02", "03"]);
  assert.deepEqual(rows.map((r) => [r.key, r.n]), [["01", 0], ["02", 3], ["03", 0]]);
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

test("ranges: a signal config is its own group, never counted as Wide", () => {
  const r = buildStatistics({
    source: "sim",
    trades: [tr({}), tr({ cfg: "follow|sig-cci-m@m15|tp3|sl3|tr0|h64", exitT: T0 + 2 * H })],
    startT: T0,
    endT: T0 + 4 * H,
    balance: 100,
    unit: () => 10,
    price: () => null,
    cost: 0.002,
    leverage: 10,
    minActiveLevel: 2,
    presets: {},
  });
  assert.deepEqual(
    r.ranges.map((x) => [x.key, x.n]),
    [
      ["Wide", 1],
      ["Signals", 1],
    ],
  );
  assert.equal(r.configs.find((c) => c.key.includes("sig-"))?.range, "Signals");
});

test("preset diagrams use settled unit PF and keep cash episode PF explicitly diagnostic", () => {
  const trades = Array.from({ length: 12 }, (_, i) => tr({
    entryT: T0 + i * H,
    exitT: T0 + i * H + H / 2,
    r: i % 2 ? -0.068 : 0.0136,
    mult: i % 2 ? 6.8 : 1,
    ...(i === 0 ? { kind: "trailing-only" as const, cfg: "follow|sig-rsi-s@m15|tp0|sl1.5|tr0.5|h32|to" } : {}),
  }));
  const series = presetSeries(trades, { startT: T0, endT: T0 + 12 * H, balance: 1000, unit: () => 100, price: () => null, cost: 0.002, leverage: 10, days: 0.5 });
  assert.ok(Math.abs(series.info.pf! - 1.36) < 1e-10);
  assert.equal(series.info.pfBasis, "unit-net-returns");
  assert.equal(series.info.sample, "settled-closes");
  assert.equal(series.info.noLoss, false);
  assert.ok(Math.abs(series.info.cash.pf - 0.2) < 1e-10);
  assert.ok(Math.abs(series.info.cashPositionLast[12]!.pf - 0.2) < 1e-10);
  assert.equal(series.info.cashPositionLast[12]!.noLoss, false);
  assert.equal(series.info.cashPositionLast[25], null);
  assert.ok(Math.abs(series.info.netUsd + 32.64) < 1e-8);
  assert.ok(Math.abs(series.balance.at(-1)! - 967.36) < 1e-8);
  assert.equal(series.kinds["Trailing only"].at(-1), 1.36);
});

test("preset diagrams preserve unknown losing closes and disclose no-loss scores without changing cash", () => {
  const options = { startT: T0, endT: T0 + 3 * H, balance: 1000, unit: () => 100, price: () => null, cost: 0.002, leverage: 10, days: 0.125 };
  const known = tr({ r: 0.0136, mult: 1 });
  const unknown = tr({ entryT: T0 + H, exitT: T0 + 2 * H, r: -0.068, unitR: null });
  const series = presetSeries([known, unknown], options);
  assert.equal(series.info.pf, null);
  assert.equal(series.info.n, 2);
  assert.equal(series.info.unknownReturns, 1);
  assert.equal(series.info.noLoss, null);
  assert.equal(series.info.gp, null);
  assert.equal(series.info.gl, null);
  assert.equal(series.info.pfConvention, "unavailable");
  assert.ok(Math.abs(series.info.cash.pf - 0.2) < 1e-10);
  assert.ok(Math.abs(series.info.netUsd + 5.44) < 1e-10);
  const wins = presetSeries([known], options).info;
  const measuredFour = presetSeries([tr({ r: 0.04, mult: 1 }), tr({ r: -0.01, mult: 1, exitT: T0 + 2 * H })], options).info;
  assert.equal(wins.pf, 4);
  assert.equal(wins.noLoss, true);
  assert.equal(wins.pfConvention, "no-loss-sentinel");
  assert.equal(measuredFour.pf, 4);
  assert.equal(measuredFour.noLoss, false);
  assert.equal(measuredFour.pfConvention, "gross-return-ratio");
  const boundary = presetSeries([tr({ exitT: T0, r: 1, mult: 1 }), tr({ exitT: options.endT, r: -0.01, mult: 1 })], options).info;
  assert.equal(boundary.n, 1, "primary sample is (from, to] settled closes");
  assert.equal(boundary.pf, 0);
});

test("an unmeasured fill is charged the model round-trip fee share, never zero", async () => {
  const { liveTrades, feeOf } = await import("./statistics.ts");
  // the share of a 2 × 50 notional at 0.2 % round trip (0.1 % per side)
  assert.equal(feeOf({ fee: null, qty: 2 }, 50, 0.002), 0.1);
  assert.equal(feeOf({ fee: 0, qty: 2 }, 50, 0.002), 0.1);
  assert.equal(feeOf({ fee: 0.05, qty: 2 }, 50, 0.002), 0.05, "a measured commission is used as it is");
  const T = 1_790_000_000_000;
  const rows = [
    { coid: "CTSBV2_Ua1", sym: "SOL-USDT", side: 1, kind: "O", qty: 1, px: 100, status: "ok", at: T, fillPx: 100, fee: null },
    { coid: "CTSBV2_Ca2", sym: "SOL-USDT", side: 1, kind: "X", qty: 1, px: 110, status: "ok", at: T + 1, fillPx: 110, fee: 0.05 },
  ];
  const xs = liveTrades(rows, "CTSBV2_".length);
  assert.equal(xs.length, 1);
  // +10 gross, −0.1 model fee on the open, −0.05 measured on the close → 9.85 on a notional of 100
  assert.ok(Math.abs(xs[0].r - 0.0985) < 1e-12, `r ${xs[0].r}`);
});

test("cash PF uses actual dollars: normalized PF 1.36 can be cash PF 0.20", () => {
  const win = tr({ r: 0.0136, unitR: 0.0136 });
  const loss = tr({ sym: "BTC-USDT", r: -0.01, unitR: -0.01, exitT: T0 + 2 * H });
  const r = buildStatistics({
    source: "live", trades: [win, loss], startT: T0, endT: T0 + 3 * H,
    balance: 1000, unit: (x) => x.sym === "BTC-USDT" ? 680 : 100,
    price: () => null, cost: 0, leverage: 10, minActiveLevel: 1,
  });
  assert.ok(r.total.pf !== null && Math.abs(r.total.pf - 1.36) < 1e-12);
  assert.ok(Math.abs(r.total.cashPf - 0.20) < 1e-12);
  assert.ok(Math.abs(r.total.usd + 5.44) < 1e-12);
  assert.ok(Math.abs(r.types[0].cashPf - 0.20) < 1e-12, "breakdowns use the same money basis");
});

test("cash no-loss provenance distinguishes the sentinel from an actual cash ratio of four", () => {
  const win = tr({ r: 0.04, unitR: 0.04 });
  const loss = tr({ r: -0.01, unitR: -0.01, exitT: T0 + 2 * H });
  const report = (trades: StatTrade[]) => buildStatistics({ source: "live", trades, startT: T0, endT: T0 + 3 * H,
    balance: 1000, unit: () => 100, price: () => null, cost: 0, leverage: 10, minActiveLevel: 1 });
  const noLoss = report([win]);
  assert.equal(noLoss.total.cashPf, 4);
  assert.equal(noLoss.total.cashNoLoss, true);
  assert.equal(noLoss.types[0].cashNoLoss, true);
  const measured = report([win, loss]);
  assert.equal(measured.total.cashPf, 4);
  assert.equal(measured.total.cashNoLoss, false);
  assert.equal(measured.types[0].cashNoLoss, false);
  assert.equal(report([]).total.cashNoLoss, false);
});

test("modeled execution multipliers change cash PF, never the primary unit-return PF", () => {
  const trades = [tr({ r: 0.0136, mult: 1 }), tr({ r: -0.068, mult: 6.8, sym: "BTC-USDT", exitT: T0 + 2 * H })];
  const report = (xs: StatTrade[]) => buildStatistics({ source: "sim", trades: xs, startT: T0, endT: T0 + 3 * H,
    balance: 1000, unit: () => 100, price: () => null, cost: 0, leverage: 10, minActiveLevel: 1 });
  const r = report(trades);
  assert.ok(r.total.pf !== null && Math.abs(r.total.pf - 1.36) < 1e-12);
  assert.ok(Math.abs(r.total.cashPf - 0.20) < 1e-12);
  assert.equal(r.total.pfBasis, "unit-net-returns");
  assert.equal(r.total.unknownReturns, 0);
  assert.ok(r.total.returnGp !== null && Math.abs(r.total.returnGp - 1.36) < 1e-12);
  assert.equal(r.total.returnGl, 1);
  assert.ok(Math.abs(r.total.usd + 5.44) < 1e-12);
  assert.ok(Math.abs(r.total.net + 5.44) < 1e-12, "sized net keeps the actual executed weighting");
  assert.ok(Math.abs(r.total.usdEnd - 994.56) < 1e-12);
  assert.equal(r.types[0].pf, r.total.pf);
  const persisted = report(trades.map((x) => ({ ...x, unitR: x.r / (x.mult ?? 1) })));
  assert.equal(persisted.total.pf, r.total.pf, "persisted unit returns are not divided by the multiplier again");
  assert.equal(persisted.total.usd, r.total.usd);
});

test("an unknown legacy paper unit return invalidates the complete primary sample without hiding cash losses", () => {
  const r = buildStatistics({ source: "paper", trades: [tr({ r: 0.0136, unitR: 0.0136 }), tr({ r: -0.068, unitR: null, exitT: T0 + 2 * H })],
    startT: T0, endT: T0 + 3 * H, balance: 1000, unit: () => 100, price: () => null, cost: 0, leverage: 10, minActiveLevel: 1 });
  assert.equal(r.total.n, 2);
  assert.equal(r.total.pf, null);
  assert.equal(r.total.returnGp, null);
  assert.equal(r.total.returnGl, null);
  assert.equal(r.total.noLoss, null);
  assert.equal(r.total.pfConvention, "unavailable");
  assert.equal(r.total.pfBasis, "unavailable");
  assert.equal(r.total.unknownReturns, 1);
  assert.ok(Math.abs(r.total.cashPf - 0.20) < 1e-12);
  assert.ok(Math.abs(r.total.usd + 5.44) < 1e-12);
  assert.ok(Math.abs(r.total.usdEnd - 994.56) < 1e-12);
});

test("preset comparisons require a unit-basis aggregate and never divide that aggregate a second time", () => {
  const weighted = [tr({ r: 0.0136, mult: 1 }), tr({ r: -0.068, mult: 6.8, exitT: T0 + 2 * H })];
  const baseline = unitStatsOf([tr({ r: 0.01 }), tr({ r: -0.01, exitT: T0 + 2 * H })]);
  const [known] = withWithout({ normal: { stats: baseline }, "normal-trailing": { stats: unitStatsOf(weighted) } });
  assert.ok(known.with.pf !== null && Math.abs(known.with.pf - 1.36) < 1e-12);
  assert.ok(known.dPf !== null && Math.abs(known.dPf - 0.36) < 1e-12);
  const [legacy] = withWithout({ normal: { stats: baseline }, "normal-trailing": { stats: statsOf(weighted) } });
  assert.equal(legacy.with.pf, null, "old gp/gl could be weighted, even when present");
  assert.equal(legacy.with.gp, null);
  assert.equal(legacy.with.gl, null);
  assert.equal(legacy.with.pfBasis, "unavailable");
  assert.equal(legacy.dPf, null);
});

test("return gross sums distinguish a no-loss sentinel from a measured return PF of four", async () => {
  const { rowOf, emptyRow } = await import("./statistics.ts");
  const base = { cfg: "a", sym: "A-USDT", side: 1, entryT: 1, exitT: 2, entry: 100, r: .01, mult: 1 };
  const noLoss = rowOf("win", [base], () => 100);
  const measured = rowOf("ratio", [{ ...base, r: .04 }, { ...base, r: -.01, exitT: 3 }], () => 100);
  assert.equal(noLoss.pf, measured.pf);
  assert.equal(noLoss.pf, 4);
  assert.equal(noLoss.noLoss, true);
  assert.equal(noLoss.pfConvention, "no-loss-sentinel");
  assert.equal(noLoss.returnGp, 1);
  assert.equal(noLoss.returnGl, 0);
  assert.equal(measured.noLoss, false);
  assert.equal(measured.pfConvention, "gross-return-ratio");
  assert.equal(measured.returnGp, 4);
  assert.equal(measured.returnGl, 1);
  assert.equal(emptyRow("empty").noLoss, false);
});

test("an oversized exit charges only the owned quantity's share of its measured fee", async () => {
  const { liveTrades, feeOf } = await import("./statistics.ts");
  const rows = [
    { coid: "CTSBV2_Ua1", sym: "SOL-USDT", side: 1, kind: "O", qty: 1, px: 100, status: "ok", at: T0, fillPx: 100, fee: 0.05 },
    { coid: "CTSBV2_Ca2", sym: "SOL-USDT", side: 1, kind: "X", qty: 2, px: 110, status: "ok", at: T0 + 1, fillPx: 110, fee: 0.20 },
  ];
  const xs = liveTrades(rows, "CTSBV2_".length);
  assert.equal(xs.length, 1);
  assert.ok(Math.abs(xs[0].r * xs[0].notional - 9.85) < 1e-12);
  assert.equal(feeOf({ fee: -0.07, qty: 1 }, 100, 0.002), 0.07, "signed venue commissions are measured");
});

test("partial live closes retain measured free entry fees and estimate only an unmeasured exit slice", async () => {
  const { liveTrades } = await import("./statistics.ts");
  const rows = [
    {
      coid: "TAGUa",
      sym: "SOL-USDT",
      side: 1,
      kind: "O",
      qty: 2,
      px: 100,
      fillPx: 100,
      fee: 0,
      feeKnown: 1,
      status: "ok",
      at: 1,
    },
    {
      coid: "TAGCb",
      sym: "SOL-USDT",
      side: 1,
      kind: "R",
      qty: 1,
      px: 100,
      fillPx: 100,
      fee: 0,
      feeKnown: null,
      status: "ok",
      at: 2,
    },
    {
      coid: "TAGCc",
      sym: "SOL-USDT",
      side: 1,
      kind: "X",
      qty: 1,
      px: 100,
      fillPx: 100,
      fee: 0,
      feeKnown: 1,
      status: "ok",
      at: 3,
    },
  ];
  const original = structuredClone(rows);
  const measured = liveTrades(rows, 3, 0.002);
  assert.equal(measured.length, 2, "both actual settled partial-close slices remain in the sample");
  assert.deepEqual(
    measured.map((x) => x.notional),
    [100, 100],
  );
  assert.deepEqual(
    measured.map((x) => x.unitR),
    [-0.001, 0],
    "only the first exit has an estimated fee",
  );
  const legacy = liveTrades(
    rows.map((x) => ({ ...x, feeKnown: null })),
    3,
    0.002,
  );
  assert.deepEqual(
    legacy.map((x) => x.unitR),
    [-0.002, -0.002],
    "legacy zero placeholders cannot become measured free fills",
  );
  assert.deepEqual(rows, original, "reconstruction does not rewrite fee provenance");
});
