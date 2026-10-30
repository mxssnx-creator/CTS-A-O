import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { effectivePaperPnl, ownedPromotionRecord } from "./promotion-record.server.ts";
import { promotionGate } from "../live-validation.ts";

const lane = { cfg: "follow|rsi@m1|tp1|sl2|tr0|h15|mc", sym: "A-USDT", side: 1 };
const row = { ...lane, entry_t: 10, held_at: 20, exit_t: 30, entry: 100, held_px: 101,
  exit: 102, vol: 1, unit_r: .0185, owned_notional_usd: 100 };

test("effective paper P&L prices the adopted entry, frozen notional and original cost once", () => {
  const pnl = effectivePaperPnl(row)!;
  assert.ok(Math.abs(pnl - ((102 / 101 - 1) - .0015) * 100) < 1e-10);
  assert.ok(pnl < row.unit_r * row.owned_notional_usd, "a late entry cannot inherit the larger model profit");
  assert.ok(Math.abs(effectivePaperPnl({ ...row, vol: 2, owned_notional_usd: 200 })! - 2 * pnl) < 1e-10,
    "a known Block-scaled single-leg notional is applied once");
  const short = { ...row, side: -1, held_px: 99, exit: 98 };
  assert.ok(Math.abs(effectivePaperPnl(short)! - ((1 - 98 / 99) - .0015) * 100) < 1e-10);
  for (const change of [{ held_px: null }, { held_at: null }, { held_at: 31 }, { held_at: 9 },
    { owned_notional_usd: null }, { owned_notional_usd: 0 }, { unit_r: null }, { vol: null }, { vol: 0 },
    { cfg: `${lane.cfg}|dca` }, { cfg: `${lane.cfg}|dcaA` }, { cfg: `${lane.cfg}|axis` },
    { entry: Infinity }, { exit: 0 }, { side: 0 }, { unit_r: .04 }])
    assert.equal(effectivePaperPnl({ ...row, ...change }), null, JSON.stringify(change));
});

test("effective last-N uses exact funded paper outcomes, prices, costs and causal time", () => {
  const db = new CoreDb(":memory:");
  try {
    const add = (i: number, win: boolean, sym = lane.sym) => {
      const exit = win ? 103 : 99;
      const r = (exit / 100 - 1) - .0015;
      db.run("INSERT INTO paper_book_trades(cfg,sym,side,entry_t,held_at,exit_t,entry,held_px,exit,vol,unit_r,owned_notional_usd,reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        lane.cfg, sym, 1, 100 + i * 10, 101 + i * 10, 102 + i * 10, 100, 100.5, exit, 1, r, 100, "time");
    };
    for (let i = 0; i < 35; i++) add(i, i >= 20 && i < 33);
    for (let i = 0; i < 40; i++) add(i, true, "B-USDT");
    const record = ownedPromotionRecord(db, lane, 35, 10_000, "effective")!;
    const win = ((103 / 100.5 - 1) - .0015) * 100;
    const loss = -((99 / 100.5 - 1) - .0015) * 100;
    for (const [n, wins, losses] of [[5, 3, 2], [8, 6, 2], [10, 8, 2], [12, 10, 2], [15, 13, 2],
      [20, 13, 7], [25, 13, 12], [30, 13, 17], [35, 13, 22]]) {
      const window = promotionGate(undefined, record, 0, 10_000, n, 1.1).execution!;
      assert.equal(window.n, n);
      assert.ok(Math.abs(window.pf! - wins * win / (losses * loss)) < 1e-10, `Last-${n}: ${window.pf}`);
    }
    db.run("UPDATE paper_book_trades SET owned_notional_usd=1000 WHERE cfg=? AND sym=? AND exit<100", lane.cfg, lane.sym);
    const returnRecord = ownedPromotionRecord(db, lane, 35, 10_000, "effective")!;
    const cashRecord = ownedPromotionRecord(db, lane, 35, 10_000, "cash")!;
    const returnPf = promotionGate(undefined, returnRecord, 0, 10_000, 12, 1.1).execution!.pf!;
    const cashPf = promotionGate(undefined, cashRecord, 0, 10_000, 12, 1.1).execution!.pf!;
    assert.ok(Math.abs(returnPf - 10 * win / (2 * loss)) < 1e-10);
    assert.ok(Math.abs(cashPf - returnPf / 10) < 1e-10, "cash weighting is a separate reconciliation only");
    assert.equal(promotionGate(undefined, record, 0, 101, 12, 1.1).execution?.n, 0, "future closes are excluded");
    db.run("UPDATE paper_book_trades SET held_px=NULL WHERE cfg=? AND sym=? AND entry_t=?", lane.cfg, lane.sym, 440);
    const changed = ownedPromotionRecord(db, lane, 35, 10_000, "effective")!;
    const g = promotionGate(undefined, changed, 0, 10_000, 12, 1.1);
    assert.equal(g.execution?.unknown, 1, "an unknown recent fill cannot be replaced with an older winner");
    assert.equal(g.execution?.pf, null);
  } finally { db.db.close(); }
});
