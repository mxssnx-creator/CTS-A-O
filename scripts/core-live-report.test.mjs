// Tag-scoped closes on a shared account: a tag closes its own part of a merged position, never another system's.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closableQty, historyWith, netByTag } from "./core-live-report.mjs";

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
});

describe("exchange report PF", () => {
  it("uses return PF as primary, reports cash PF separately, retains open realized money and recognizes every range", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const t = 1_790_000_000_000;
    const fill = (id, sym, into, profit, qty, at) => ({
      orderId: id, clientOrderId: `TEST_${id}`, symbol: sym, side: into ? "BUY" : "SELL",
      positionSide: "LONG", status: "FILLED", executedQty: qty,
      avgPrice: 100, time: at, updateTime: at, profit, commission: 0,
    });
    const r = await ownResults({ tag: "TEST_", from: t, to: t + 100, all: [
      fill("G1", "A-USDT", true, 0, 1, t), fill("C1", "A-USDT", false, 1.36, 1, t + 1),
      fill("L1", "B-USDT", true, 0, 6.8, t + 2), fill("C2", "B-USDT", false, -6.8, 6.8, t + 3),
      fill("Q1", "C-USDT", true, 0, 2, t + 4), fill("C3", "C-USDT", false, 100, 1, t + 5),
    ] });
    assert.equal(r.pfBasis, "closed-position-net-return");
    assert.equal(r.cashPfBasis, "closed-position-net-usdt");
    assert.equal(r.byKind.General.closedPositions, 1);
    assert.equal(r.byKind.Long.closedPositions, 1);
    assert.equal(r.byKind.Signals.openPositions, 1);
    assert.equal(r.byKind.Signals.gp, 0, "the open episode does not boost closed-position PF");
    assert.equal(r.byKind.Signals.net, 100, "its realized money still counts toward account loss checks");
    const gs = Object.values(r.byKind);
    assert.ok(Math.abs(gs.reduce((a, x) => a + x.gp, 0) / gs.reduce((a, x) => a + x.gl, 0) - 1.36) < 1e-12);
    assert.ok(Math.abs(r.pf - 1.36) < 1e-12, "closed position returns, independent of dollar size");
    assert.ok(Math.abs(r.cashPf - .2) < 1e-12, "the separate dollar-weighted diagnostic");
    assert.equal(r.positions[0].r, 1.36 / 100);
    assert.equal(r.positions[1].r, -6.8 / 680);
    assert.equal(r.byKind.Signals.cashGp, 0);
  });

  it("per-range return PF uses position returns and cannot turn a dollar-only orphan exit into a return", async () => {
    const { ownResults } = await import("./core-live-report.mjs");
    const t = 1_790_000_000_000;
    const fill = (id, symbol, into, profit, qty, time) => ({
      orderId: id, clientOrderId: `TEST_${id}`, symbol, side: into ? "BUY" : "SELL", positionSide: "LONG",
      status: "FILLED", executedQty: qty, avgPrice: 100, time, profit, commission: 0,
    });
    const r = await ownResults({ tag: "TEST_", from: t, to: t + 100, all: [
      fill("G1", "A-USDT", true, 0, 1, t), fill("C1", "A-USDT", false, 1.36, 1, t + 1),
      fill("G2", "B-USDT", true, 0, 6.8, t + 2), fill("C2", "B-USDT", false, -6.8, 6.8, t + 3),
      fill("C3", "C-USDT", false, 10, 1, t + 4),
    ] });
    assert.ok(Math.abs(r.byKind.General.pf - 1.36) < 1e-12);
    assert.ok(Math.abs(r.byKind.General.cashPf - .2) < 1e-12);
    assert.equal(r.byKind.General.returnPositions, 2);
    assert.equal(r.byKind.unknown.unpricedPositions, 1);
    assert.equal(r.byKind.unknown.net, 10, "the account-loss guard still receives every reported dollar");
    assert.ok(Math.abs(r.pf - 1.36) < 1e-12);
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
  it("shows return PF, preserves no-loss infinity, and refuses to relabel legacy cash sums", async () => {
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
        const stats = { positions: 2, wins: 1, gp: .0136, gl: .01, pf: 1.36, net: -5.44, fee: 0, notional: 780, feePct: 0 };
        const report = { pfBasis: "closed-position-net-return", orders: 4, positions: [], byKind: { General: stats } };
        writeFileSync(exchangeFile, JSON.stringify(report));
        let md = format(script, out);
        assert.ok(md.includes("return PF"));
        assert.ok(md.includes("| 1.36 |"));
        assert.ok(md.includes("-5.44"));
        writeFileSync(exchangeFile, JSON.stringify({ ...report, byKind: { General: { ...stats, gp: .0136, gl: 0, pf: Infinity } } }));
        md = format(script, out);
        assert.ok(md.includes("| ∞ |"), "JSON null never changes a win-only PF into zero or a fake cap");
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
