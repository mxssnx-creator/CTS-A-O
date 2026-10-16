// Tag-scoped closes on a shared account: a tag closes its own part of a merged position, never another system's.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closableQty, historyWith, netByTag } from "./core-live-report.mjs";
import { buildStatistics, liveTrades } from "../src/core/statistics.ts";

const o = (coid, side, positionSide, qty, symbol = "SAND-USDT") => ({
  clientOrderId: coid,
  side,
  positionSide,
  executedQty: String(qty),
  symbol,
});

describe("tag-scoped close", () => {
  it("an own net overstated by untagged closes never reaches the other systems' part", () => {
    // CTS-A opened 900, a manual close took 500 of it (no tag); the twin holds 462 on the same short
    const orders = [
      o("ctsav2_e1", "SELL", "SHORT", 900),
      o("", "BUY", "SHORT", 500),
      o("ctsv2t_e1", "SELL", "SHORT", 462),
    ];
    const { own, others } = netByTag(orders, "CTSAV2_");
    assert.equal(own.get("SAND-USDT|SHORT"), 900);
    // the exchange shows 862 (400 CTS-A + 462 twin): only 400 may close
    assert.equal(closableQty(862, own.get("SAND-USDT|SHORT"), others.get("SAND-USDT|SHORT")), 400);
  });

  it("a tag alone on a position closes its whole net; a net below the position closes only the net", () => {
    const { own, others } = netByTag([o("ctsv2t_e1", "BUY", "LONG", 10), o("ctsv2t_x1", "SELL", "LONG", 4)], "CTSV2T_");
    assert.equal(closableQty(6, own.get("SAND-USDT|LONG"), others.get("SAND-USDT|LONG") ?? 0), 6);
    assert.equal(closableQty(9, own.get("SAND-USDT|LONG"), 0), 6);
  });

  it("another system's closed-out history counts as zero, not negative", () => {
    const { others } = netByTag([o("ctsbx1_e1", "BUY", "LONG", 5), o("ctsbx1_x1", "SELL", "LONG", 8)], "CTSV2T_");
    assert.equal(others.get("SAND-USDT|LONG"), 0);
  });
});

describe("order history paging", () => {
  it("a busy range (more than one 500-order page) is read in full, whichever 500 the exchange returns", async () => {
    // 1,800 orders in one hour; the fake exchange answers a full range with its NEWEST 500, as a busy CTS-A hour did
    const t0 = 1_790_000_000_000;
    const all = Array.from({ length: 1800 }, (_, i) => ({ orderId: String(i), time: t0 + i * 2000 }));
    const signed = async (_n, _c, _m, _p, q) => {
      const xs = all.filter((o) => o.time >= q.startTime && o.time <= q.endTime);
      return { orders: xs.slice(-q.limit) };
    };
    const got = await historyWith(signed, "mainnet", "x", t0, t0 + 3_600_000);
    assert.equal(got.length, 1800);
  });

  it("retains distinct client ids when venue ids round to the same number or are missing", async () => {
    const t = 1_790_000_000_000;
    const first = Number(1_900_000_000_000_000_001n);
    const second = Number(1_900_000_000_000_000_002n);
    assert.equal(first, second, "the JavaScript number collision is real");
    const snapshots = [
      { orderId: first, clientOrderId: "TEST_E1", executedQty: .5, updateTime: t },
      { orderId: second, clientOrderId: "TEST_E2", executedQty: 2, updateTime: t },
      { clientOrderId: "TEST_E3", executedQty: 3, updateTime: t },
      { clientOrderId: "TEST_E4", executedQty: 4, updateTime: t },
      { orderId: first, clientOrderId: "TEST_E1", executedQty: 1, updateTime: t + 1 },
    ];
    const got = await historyWith(async () => ({ orders: snapshots }), "mainnet", "x", t, t + 2);
    assert.equal(got.length, 4);
    assert.deepEqual(got.map((x) => [x.clientOrderId, x.executedQty]),
      [["TEST_E1", 1], ["TEST_E2", 2], ["TEST_E3", 3], ["TEST_E4", 4]]);
    await assert.rejects(historyWith(async () => ({ orders: [{ orderId: first }] }), "mainnet", "x", t, t + 2), /unsafe numeric order id/);
    await assert.rejects(historyWith(async () => ({ orders: [{}] }), "mainnet", "x", t, t + 2), /stable order identity/);
  });

  it("counts the latest cumulative fill of a client order once in a supplied history", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const t = 1_790_000_000_000;
    const entry = { clientOrderId: "TEST_G1", symbol: "A-USDT", positionSide: "LONG", side: "BUY",
      executedQty: .5, avgPrice: 100, profit: 0, commission: 0, time: t, updateTime: t };
    const result = await ownResults({ tag: "TEST_", from: t, to: t + 2, modelCost: 0, all: [
      entry, { ...entry, executedQty: 1, updateTime: t + 1 },
      { ...entry, clientOrderId: "TEST_C1", side: "SELL", executedQty: 1, avgPrice: 110,
        profit: 10, time: t + 2, updateTime: t + 2 },
    ] });
    assert.equal(result.orders, 2);
    assert.equal(result.n, 1);
    assert.equal(result.closes[0].notional, 100);
    assert.equal(result.closes[0].r, .1);
    assert.equal(result.byKind.General.net, 10);
  });
});

describe("exchange report PF", () => {
  it("uses return PF as primary, reports cash PF separately, retains open realized money and recognizes every range", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const t = 1_790_000_000_000;
    const fill = (id, sym, into, profit, qty, at) => ({
      orderId: id, clientOrderId: `TEST_${id}`, symbol: sym, side: into ? "BUY" : "SELL",
      positionSide: "LONG", status: "FILLED", executedQty: qty,
      avgPrice: into ? 100 : 100 + profit / qty, time: at, updateTime: at, profit, commission: 0,
    });
    const r = await ownResults({ tag: "TEST_", from: t, to: t + 100, modelCost: 0, all: [
      fill("G1", "A-USDT", true, 0, 1, t), fill("C1", "A-USDT", false, 1.36, 1, t + 1),
      fill("L1", "B-USDT", true, 0, 6.8, t + 2), fill("C2", "B-USDT", false, -6.8, 6.8, t + 3),
      fill("Q1", "C-USDT", true, 0, 2, t + 4), fill("C3", "C-USDT", false, 100, 1, t + 5),
    ] });
    assert.equal(r.pfBasis, "settled-owned-close-net-return");
    assert.equal(r.cashPfBasis, "settled-owned-close-net-usdt");
    assert.equal(r.byKind.General.closedPositions, 1);
    assert.equal(r.byKind.Long.closedPositions, 1);
    assert.equal(r.byKind.Signals.openPositions, 1);
    assert.equal(r.byKind.Signals.gp, 1, "settled partial closes enter the same primary sample as the live ledger");
    assert.equal(r.byKind.Signals.net, 100, "its realized money still counts toward account loss checks");
    const gs = Object.values(r.byKind);
    assert.ok(Math.abs(gs.reduce((a, x) => a + x.gp, 0) / gs.reduce((a, x) => a + x.gl, 0) - 101.36) < 1e-12);
    assert.ok(Math.abs(r.pf - 101.36) < 1e-12, "settled partial closes are included, even while an episode is open");
    assert.ok(Math.abs(r.episodePf - 1.36) < 1e-12, "whole-episode PF remains a named secondary diagnostic");
    assert.ok(Math.abs(r.cashPf - (101.36 / 6.8)) < 1e-12, "the cash diagnostic uses the same settled close sample");
    assert.equal(r.positions[0].r, 1.36 / 100);
    assert.equal(r.positions[1].r, -6.8 / 680);
    assert.equal(r.byKind.Signals.cashGp, 100);
  });

  it("per-range return PF uses position returns and cannot turn a dollar-only orphan exit into a return", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const t = 1_790_000_000_000;
    const fill = (id, symbol, into, profit, qty, time) => ({
      orderId: id, clientOrderId: `TEST_${id}`, symbol, side: into ? "BUY" : "SELL", positionSide: "LONG",
      status: "FILLED", executedQty: qty, avgPrice: into ? 100 : 100 + profit / qty, time, profit, commission: 0,
    });
    const r = await ownResults({ tag: "TEST_", from: t, to: t + 100, modelCost: 0, all: [
      fill("G1", "A-USDT", true, 0, 1, t), fill("C1", "A-USDT", false, 1.36, 1, t + 1),
      fill("G2", "B-USDT", true, 0, 6.8, t + 2), fill("C2", "B-USDT", false, -6.8, 6.8, t + 3),
      fill("C3", "C-USDT", false, 10, 1, t + 4),
    ] });
    assert.ok(Math.abs(r.byKind.General.pf - 1.36) < 1e-12);
    assert.ok(Math.abs(r.byKind.General.cashPf - .2) < 1e-12);
    assert.equal(r.byKind.General.returnCloses, 2);
    assert.equal(r.byKind.unknown.unpricedPositions, 1);
    assert.equal(r.byKind.unknown.net, 10, "the account-loss guard still receives every reported dollar");
    assert.ok(Math.abs(r.pf - 1.36) < 1e-12);
  });
});

describe("exchange and UI ledger compare identical settled owned close samples", () => {
  const t = 1_790_000_000_000;
  const rows = [
    { coid: "TEST_G1", kind: "O", qty: 2, px: 100, fee: -.2, at: t, profit: 0 },
    { coid: "TEST_C1", kind: "R", qty: .5, px: 110, fee: -.055, at: t + 1, profit: 5 },
    { coid: "TEST_G2", kind: "I", qty: 1, px: 120, fee: -.12, at: t + 2, profit: 0 },
    { coid: "TEST_C2", kind: "R", qty: 1, px: 90, fee: -.09, at: t + 3, profit: -18 },
    { coid: "TEST_C3", kind: "X", qty: 1.5, px: 114, fee: -.171, at: t + 4, profit: 9 },
  ];
  const ledgerRows = (xs) => xs.map((x) => ({ ...x, sym: "A-USDT", side: 1, status: "ok", fillPx: x.px }));
  const exchangeRows = (xs) => xs.map((x) => ({
    orderId: x.coid, clientOrderId: x.coid, symbol: "A-USDT", positionSide: "LONG",
    side: x.kind === "O" || x.kind === "I" ? "BUY" : "SELL", executedQty: x.qty,
    avgPrice: x.px, commission: x.fee, time: x.at, updateTime: x.at, profit: x.profit, status: "FILLED",
  }));
  const expected = (xs, from, to, modelCost = .002) => {
    const trades = liveTrades(ledgerRows(xs), 5, modelCost).map((x) => ({ ...x, pnl: x.r * x.notional }));
    const report = buildStatistics({
      source: "live", trades, startT: from, endT: to, balance: 0,
      unit: (x) => x.notional, price: () => null, cost: modelCost, leverage: 10,
    });
    return { trades: trades.filter((x) => x.exitT > from && x.exitT <= to), report };
  };

  it("allocates signed entry fees and variable partial quantities identically after an increase", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const x = await ownResults({ tag: "TEST_", from: t, to: t + 4, all: exchangeRows(rows) });
    const ui = expected(rows, t, t + 4);
    assert.equal(x.pfBasis, "settled-owned-close-net-return");
    assert.equal(x.n, ui.report.total.n);
    assert.equal(x.n, 3);
    assert.ok(Math.abs(x.pf - (.0979 + .0535) / .1685) < 1e-12, "manually computed net close-slice returns");
    assert.ok(Math.abs(x.pf - ui.report.total.pf) < 1e-12);
    assert.ok(Math.abs(x.cashPf - ui.report.total.cashPf) < 1e-12);
    assert.ok(Math.abs(x.closesNet - -4.636) < 1e-10);
    assert.ok(Math.abs(x.closesNet - ui.report.total.usd) < 1e-12);
    assert.deepEqual(x.closes.map(({ cfg, sym, side, entryT, exitT, entry, r, notional }) =>
      ({ cfg, sym, side, entryT, exitT, entry, r, notional })),
    ui.trades.map(({ cfg, sym, side, entryT, exitT, entry, r, notional }) =>
      ({ cfg, sym, side, entryT, exitT, entry, r, notional })));
    assert.equal(x.byKind.General.returnCloses, 3);
    assert.equal(x.netBasis, "realized-order-profit-and-commission");
    assert.ok(Math.abs(x.byKind.General.net - -4.636) < 1e-10, "realized-money guard fields stay unchanged");
  });

  it("matches the UI's exclusive start/inclusive end, using earlier supplied fills only as inventory", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const x = await ownResults({ tag: "TEST_", from: t + 1, to: t + 3, all: exchangeRows(rows) });
    const ui = expected(rows, t + 1, t + 3);
    assert.equal(x.n, 1);
    assert.equal(x.pf, ui.report.total.pf);
    assert.equal(x.closes[0].exitT, t + 3);
    assert.ok(Math.abs(x.closes[0].r + .1685) < 1e-12, "earlier reduce and later increase give the same $108 cost basis");
    assert.ok(Math.abs(x.closesNet - ui.report.total.usd) < 1e-12);
    assert.deepEqual(x.sampleWindow, { fromExclusive: t + 1, toInclusive: t + 3 });
  });

  it("discloses model fees and uses the same configured cost as the UI for missing commissions", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const missing = rows.map((x) => ({ ...x, fee: null }));
    const x = await ownResults({ tag: "TEST_", from: t, to: t + 4, all: exchangeRows(missing), modelCost: .004 });
    const ui = expected(missing, t, t + 4, .004);
    assert.equal(x.n, ui.report.total.n);
    assert.ok(Math.abs(x.pf - ui.report.total.pf) < 1e-12);
    assert.ok(Math.abs(x.closesNet - ui.report.total.usd) < 1e-12);
    assert.equal(x.costs.modelRoundTrip, .004);
    assert.equal(x.costs.estimatedFeeOrders, 5);
    assert.equal(x.byKind.General.net, -4, "raw venue profit/commission remains separate from modeled close money");
  });

  it("preserves finite explicit zero commissions while missing or legacy zero evidence retains the configured estimate", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const fills = [{ ...rows[0], qty: 1, fee: 0 }, { ...rows[1], qty: 1, fee: 0, profit: 10 }];
    const legacy = liveTrades(ledgerRows(fills), 5, .004)[0];
    assert.ok(Math.abs(legacy.r - .0958) < 1e-12, "an old unmarked ledger zero remains unknown");
    for (const commission of [0, "0"]) {
      const x = await ownResults({ tag: "TEST_", from: t, to: t + 1, modelCost: .004,
        all: exchangeRows(fills).map((o) => ({ ...o, commission })) });
      assert.equal(x.costs.estimatedFeeOrders, 0);
      assert.equal(x.closes[0].r, .1);
      assert.equal(x.closesNet, 10);
    }
    for (const commission of [undefined, null, "", " ", "invalid", Infinity]) {
      const x = await ownResults({ tag: "TEST_", from: t, to: t + 1, modelCost: .004,
        all: exchangeRows(fills).map((o) => ({ ...o, commission })) });
      assert.equal(x.costs.estimatedFeeOrders, 2);
      assert.equal(x.closes[0].r, legacy.r);
      assert.ok(Math.abs(x.closesNet - 9.58) < 1e-12);
    }
  });

  it("shares the numeric no-loss sentinel and explicitly marks its convention on the same sample", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const win = [rows[0], { ...rows[1], qty: 2, profit: 20 }];
    const x = await ownResults({ tag: "TEST_", from: t, to: t + 1, all: exchangeRows(win) });
    const ui = expected(win, t, t + 1);
    assert.equal(x.pf, ui.report.total.pf);
    assert.equal(x.pf, 4);
    assert.equal(x.noLoss, true);
    assert.equal(x.pfConvention, "no-loss-sentinel");
    assert.equal(x.noLoss, ui.report.total.noLoss);
    assert.equal(x.pfConvention, ui.report.total.pfConvention);
    assert.equal(x.byKind.General.noLoss, true);
    assert.equal(x.episodePf, Infinity, "mathematical episode ratio is explicitly secondary");
  });
});

describe("dense order history", () => {
  it("reads a burst above 500 orders within one minute without silently dropping fills", async () => {
    const t = 1_790_000_000_000;
    const all = Array.from({ length: 1200 }, (_, i) => ({ orderId: String(i), time: t + i * 20 }));
    const signed = async (_n, _c, _m, _p, q) => ({ orders: all.filter((x) => x.time >= q.startTime && x.time <= q.endTime).slice(-q.limit) });
    assert.equal((await historyWith(signed, "mainnet", "x", t, t + 60_000)).length, 1200);
  });

  it("refuses an incomplete instant instead of issuing an apparently complete PF report", async () => {
    const t = 1_790_000_000_000;
    await assert.rejects(historyWith(async () => ({ orders: Array.from({ length: 500 }, (_, i) => ({ orderId: String(i), time: t })) }), "mainnet", "x", t, t + 1), /truncated/);
    await assert.rejects(historyWith(async () => ({}), "mainnet", "x", t, t + 1), /completeness unknown/);
  });
});

describe("saved exchange report formatting", () => {
  it("shows shared return PF, labels no-loss sentinel, and refuses legacy cash or episode sums", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { execFileSync } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const dir = mkdtempSync(join(tmpdir(), "cts-return-report-"));
    try {
      const desk = join(dir, "live-demo");
      mkdirSync(desk);
      writeFileSync(join(desk, "status.json"), JSON.stringify({ tag: "TEST_", at: "2026-10-14T12:00:00Z", hours: 1, symbols: [] }));
      const exchangeFile = join(dir, "exchange-TEST_.json");
      const format = (script, out) => {
        const args = script === "core-live-final.mjs"
          ? ["--dir", dir, "--out", out]
          : ["--desk", `Demo:${desk}:${exchangeFile}`, "--out", out];
        execFileSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...args], { stdio: "pipe" });
        return readFileSync(out, "utf8");
      };
      for (const script of ["core-live-final.mjs", "core-live-block-doc.mjs"]) {
        const out = join(dir, `${script}.md`);
        const stats = { positions: 2, returnCloses: 2, wins: 1, gp: .0136, gl: .01, pf: 1.36, net: -5.44, fee: 0, notional: 780, feePct: 0 };
        const report = { pfBasis: "settled-owned-close-net-return", orders: 4, positions: [], byKind: { General: stats } };
        writeFileSync(exchangeFile, JSON.stringify(report));
        let md = format(script, out);
        assert.ok(md.includes("return PF"));
        assert.ok(md.includes("| 1.36 |"));
        assert.ok(md.includes("-5.44"));
        writeFileSync(exchangeFile, JSON.stringify({ ...report, byKind: { General: { ...stats, gp: .0136, gl: 0, pf: Infinity } } }));
        md = format(script, out);
        assert.ok(md.includes("| 4.00 (no losses; sentinel) |"), "the primary no-loss convention matches the shared engine and ledger helper");
        report.pfBasis = "closed-position-net-return";
        writeFileSync(exchangeFile, JSON.stringify(report));
        md = format(script, out);
        assert.ok(md.includes("Return PF unavailable"), "whole-episode return sums are not mislabeled settled-close returns");
        delete report.pfBasis;
        report.byKind.General = { ...stats, gp: 1.36, gl: 6.8, pf: .2 };
        writeFileSync(exchangeFile, JSON.stringify(report));
        md = format(script, out);
        assert.ok(md.includes("Return PF unavailable"));
        assert.ok(!md.includes("| 0.20 |"), "legacy cash PF must not be labeled return PF");
        assert.ok(md.includes("-5.44"), "legacy dollar net remains available");
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
