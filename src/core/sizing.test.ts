// Order sizing: fixed % of equity per order compounds causally from the starting balance; fixed notional is the
// former behaviour; live reads the account equity (paper balance as fallback).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SIZING, orderKey, sizeBook, sizingSettings, unitNotional } from "./sizing.ts";
import { parseEquity } from "./exchange/bingx.server.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { checkSettings } from "./settings-check.ts";

const H = 3_600_000;
const tr = (cfg: string, entryH: number, exitH: number, r: number) => ({
  cfg,
  sym: "A",
  entryT: entryH * H,
  exitT: exitH * H,
  r,
});

describe("sizing", () => {
  it("defaults: 2 % of equity per order, paper balance 1,000", () => {
    assert.deepEqual(DEFAULT_SIZING, { mode: "equityPct", pct: 0.02 });
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
    const s = sizeBook(trades, [{ cfg: "o", sym: "A", entryT: 5 * H }], opt);
    assert.equal(s.units.get(orderKey(trades[0])), 20);
    assert.ok(Math.abs(s.units.get(orderKey(trades[1]))! - 19.96) < 1e-9);
    assert.ok(Math.abs(s.units.get(orderKey(trades[2]))! - 19.96) < 1e-9);
    const pnl = -2 + 0.1 * 19.96 + 0.05 * 19.96;
    assert.ok(Math.abs(s.pnl - pnl) < 1e-9);
    assert.ok(Math.abs(s.realized - (1000 + pnl)) < 1e-9);
    // the open order is sized at its entry, from everything closed before it
    assert.ok(
      Math.abs(
        s.units.get(orderKey({ cfg: "o", sym: "A", entryT: 5 * H }))! - 0.02 * (1000 + pnl),
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
  });
});
