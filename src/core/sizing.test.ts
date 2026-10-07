// Order sizing: fixed % of equity per order compounds causally from the starting balance; fixed notional is the
// former behaviour; live reads the account equity (paper balance as fallback).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SIZING, orderKey, sizeBook, sizingSettings, unitNotional } from "./sizing.ts";
import { parseAccount, parseEquity } from "./exchange/bingx.server.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { checkMerged, checkSettings } from "./settings-check.ts";
import { presetSettings } from "./presets.ts";

const H = 3_600_000;
const tr = (cfg: string, entryH: number, exitH: number, r: number) => ({
  cfg,
  sym: "A",
  side: 1,
  entryT: entryH * H,
  exitT: exitH * H,
  r,
});

/** the former sizing walk: every event an object, sorted with a comparator */
function sizeBookObjects(
  trades: ReadonlyArray<{ cfg: string; sym: string; side: number; entryT: number; exitT: number; r: number }>,
  open: ReadonlyArray<{ cfg: string; sym: string; side: number; entryT: number }>,
  opt: Parameters<typeof sizeBook>[2],
) {
  type Ev = { t: number; kind: 0 | 1; i: number; open: boolean };
  const ev: Ev[] = [];
  trades.forEach((x, i) => {
    ev.push({ t: x.entryT, kind: 1, i, open: false });
    ev.push({ t: x.exitT, kind: 0, i, open: false });
  });
  open.forEach((x, i) => ev.push({ t: x.entryT, kind: 1, i, open: true }));
  ev.sort((a, b) => a.t - b.t || a.kind - b.kind || Number(a.open) - Number(b.open) || a.i - b.i);
  const units = new Map<string, number>();
  const unitOf: number[] = new Array(trades.length).fill(0);
  let pnl = 0;
  for (const e of ev) {
    if (e.kind === 1) {
      const u = unitNotional(opt.sizing, opt.balance + pnl, opt.fixedNotional);
      if (e.open) units.set(orderKey(open[e.i]), u);
      else {
        unitOf[e.i] = u;
        units.set(orderKey(trades[e.i]), u);
      }
    } else pnl += trades[e.i].r * unitOf[e.i];
  }
  return { units, realized: opt.balance + pnl, pnl };
}

describe("sizing: packed event order", () => {
  it("sizes exactly as the sorted event objects did (ties: exit before entry, closed before open, index)", () => {
    let s = 3;
    const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (const mode of ["equityPct", "minQty", "fixed"] as const) {
      const t0 = Date.UTC(2026, 9, 1);
      const trades = Array.from({ length: 3000 }, (_, i) => {
        const entryT = t0 + Math.floor(r() * 300) * 60_000;
        return { cfg: `c${i % 41}`, sym: `S${i % 7}`, side: 1, entryT, exitT: entryT + Math.floor(r() * 40) * 60_000, r: r() - 0.48 };
      });
      const open = Array.from({ length: 500 }, (_, i) => ({ cfg: `o${i % 13}`, sym: `S${i % 7}`, side: 1, entryT: t0 + Math.floor(r() * 300) * 60_000 }));
      const opt = { balance: 1000, sizing: sizingSettings({ mode, pct: 0.02 }), fixedNotional: 5 };
      const a = sizeBook(trades, open, opt);
      const b = sizeBookObjects(trades, open, opt);
      assert.equal(a.pnl, b.pnl, mode);
      assert.equal(a.realized, b.realized);
      assert.deepEqual([...a.units.entries()], [...b.units.entries()]);
    }
    // a span too large to pack (or a fractional time): the object sort, same result
    const far = [
      { cfg: "a", sym: "X", side: 1, entryT: 0, exitT: 2 ** 52, r: 0.1 },
      { cfg: "b", sym: "X", side: 1, entryT: 1.5, exitT: 3, r: -0.05 },
    ];
    const opt = { balance: 1000, sizing: sizingSettings({ mode: "equityPct", pct: 0.02 }), fixedNotional: 5 };
    assert.deepEqual(sizeBook(far, [], opt), sizeBookObjects(far, [], opt));
  });
});

describe("sizing", () => {
  it("defaults: minimum quantity live (paper 2 % of equity per order), paper balance 1,000", () => {
    assert.deepEqual(DEFAULT_SIZING, { mode: "minQty", pct: 0.02 });
    // paper / simulation size the minimum-quantity mode like % of equity
    assert.equal(unitNotional(DEFAULT_SIZING, 1000, 6), 20);
    assert.equal(sizingSettings({ mode: "minQty" }).mode, "minQty");
    assert.deepEqual(DEFAULT_SETTINGS.sizing, DEFAULT_SIZING);
    assert.equal(DEFAULT_SETTINGS.paperBalance, 1000);
    assert.equal(sizingSettings({ pct: 9 }).pct, 0.25, "clamped");
    assert.equal(sizingSettings({ mode: "fixed" }).mode, "fixed");
    assert.throws(() => checkSettings({ sizing: { mode: "equityPct", pct: 0.5 } }));
    assert.throws(() => checkSettings({ sizing: { mode: "x" as never, pct: 0.02 } }));
    assert.doesNotThrow(() =>
      checkSettings({ sizing: { mode: "equityPct", pct: 0.05 }, paperBalance: 50 }),
    );
  });

  it("each order takes its unit from the realized equity at its entry (a loss shrinks the next)", () => {
    const opt = { balance: 1000, sizing: DEFAULT_SIZING, fixedNotional: 100 };
    const trades = [
      tr("a", 0, 1, -0.1), // unit 20 → −2
      tr("b", 2, 3, 0.1), // equity 998 → unit 19.96 → +1.996
      tr("c", 2.5, 4, 0.05), // entered before b closed: equity still 998 → unit 19.96
    ];
    const s = sizeBook(trades, [{ cfg: "o", sym: "A", side: 1, entryT: 5 * H }], opt);
    assert.equal(s.units.get(orderKey(trades[0])), 20);
    assert.ok(Math.abs(s.units.get(orderKey(trades[1]))! - 19.96) < 1e-9);
    assert.ok(Math.abs(s.units.get(orderKey(trades[2]))! - 19.96) < 1e-9);
    const pnl = -2 + 0.1 * 19.96 + 0.05 * 19.96;
    assert.ok(Math.abs(s.pnl - pnl) < 1e-9);
    assert.ok(Math.abs(s.realized - (1000 + pnl)) < 1e-9);
    // the open order is sized at its entry, from everything closed before it
    assert.ok(
      Math.abs(
        s.units.get(orderKey({ cfg: "o", sym: "A", side: 1, entryT: 5 * H }))! - 0.02 * (1000 + pnl),
      ) < 1e-9,
    );
  });

  it("a close at the same instant as an entry is counted first", () => {
    const opt = { balance: 1000, sizing: DEFAULT_SIZING, fixedNotional: 100 };
    const t = [tr("a", 0, 1, 0.5), tr("b", 1, 2, 0)];
    assert.equal(sizeBook(t, [], opt).units.get(orderKey(t[1])), 0.02 * 1010);
  });

  it("fixed mode is the former flat notional", () => {
    const opt = {
      balance: 1000,
      sizing: { mode: "fixed" as const, pct: 0.02 },
      fixedNotional: 100,
    };
    const t = [tr("a", 0, 1, -0.5), tr("b", 2, 3, 0.1)];
    const s = sizeBook(t, [], opt);
    assert.equal(s.units.get(orderKey(t[1])), 100);
    assert.ok(Math.abs(s.pnl - (-50 + 10)) < 1e-9);
    assert.equal(unitNotional(opt.sizing, 5, 100), 100);
  });

  it("a preset never carries sizing, balance, costs, loop timing, the adjuster or the Live stage", () => {
    const p = presetSettings({ ...DEFAULT_SETTINGS, symbols: 7 });
    for (const k of [
      "live",
      "sizing",
      "paperBalance",
      "cost",
      "fees",
      "cycleMs",
      "tickMs",
      "adjust",
    ])
      assert.ok(!(k in p), k);
    assert.equal(p.symbols, 7);
  });

  it("cross-field rules hold against the merged settings", () => {
    const cur = {
      ...DEFAULT_SETTINGS,
      adjust: { ...DEFAULT_SETTINGS.adjust, triggerPf: 1, recoverPf: 1.2 },
    };
    assert.throws(() => checkMerged(cur, { adjust: { recoverPf: 0.9 } as never }));
    assert.doesNotThrow(() => checkMerged(cur, { adjust: { recoverPf: 1.1 } as never }));
    const off = { ...cur, signals: { ...cur.signals, ranges: { short: false, medium: true } } };
    assert.throws(() => checkMerged(off, { signals: { ranges: { medium: false } } as never }));
  });

  it("reads the account equity from BingX balance replies", () => {
    assert.equal(
      parseEquity({ balance: { asset: "USDT", balance: "10.5", equity: "11.25" } }),
      11.25,
    );
    assert.equal(
      parseEquity({
        balance: [
          { asset: "BTC", equity: "0.1" },
          { asset: "USDT", equity: "42" },
        ],
      }),
      42,
    );
    assert.equal(parseEquity({ balance: { asset: "USDT", equity: "0" } }), null);
    assert.equal(parseEquity(null), null);
    const acct = parseAccount({
      balance: {
        asset: "USDT",
        balance: "0.6872",
        equity: "0.6706",
        unrealizedProfit: "-0.0166",
        realisedProfit: "-0.3337",
        usedMargin: "0.6132",
      },
    });
    assert.equal(acct?.unrealized, -0.0166);
    assert.equal(acct?.realized, -0.3337);
    assert.equal(acct?.usedMargin, 0.6132);
    assert.ok(Math.abs((acct?.realized ?? 0) + (acct?.unrealized ?? 0) + 0.3503) < 1e-9);
  });
});

describe("sizing: long and short of one config are separate orders", () => {
  it("a long and a short entered on the same bar each keep their own unit", () => {
    const opt = { balance: 1000, sizing: DEFAULT_SIZING, fixedNotional: 100 };
    const long = { ...tr("a", 0, 2, 0.1), side: 1 };
    const short = { ...tr("a", 0, 1, -0.1), side: -1 };
    const later = tr("b", 1.5, 3, 0);
    const s = sizeBook([long, short, later], [], opt);
    assert.equal(s.units.size, 3);
    assert.notEqual(orderKey(long), orderKey(short));
    // the short closed at −0.1 × 20 before b entered: b's unit is from 998
    assert.ok(Math.abs(s.units.get(orderKey(later))! - 0.02 * 998) < 1e-9);
    assert.ok(Math.abs(s.pnl - (0.1 * 20 - 0.1 * 20)) < 1e-9);
  });
});
