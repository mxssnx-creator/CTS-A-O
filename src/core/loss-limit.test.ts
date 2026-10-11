// The desk's loss limit: fixed, balance-relative (re-read at every check), or both — the larger holds.
import { describe, it, test } from "node:test";
import assert from "node:assert/strict";
import { lossLimitText, lossLimitUsd, sessionBaseline } from "./loss-limit.ts";

describe("loss limit", () => {
  it("a share of the wallet follows the balance; the fixed amount is a floor", () => {
    assert.equal(lossLimitUsd({ fixed: 2, pct: 25, wallet: 34 }), 8.5);
    // a deposit or a profit raises it, a drawdown lowers it — never below the fixed amount
    assert.equal(lossLimitUsd({ fixed: 2, pct: 25, wallet: 60 }), 15);
    assert.equal(lossLimitUsd({ fixed: 2, pct: 25, wallet: 6 }), 2);
  });

  it("an unread balance keeps the fixed amount; nothing set is no limit", () => {
    assert.equal(lossLimitUsd({ fixed: 2, pct: 25, wallet: null }), 2);
    assert.equal(lossLimitUsd({ fixed: 0, pct: 25, wallet: undefined }), 0);
    assert.equal(lossLimitUsd({ fixed: 0, pct: 0, wallet: 34 }), 0);
    assert.equal(lossLimitUsd({ fixed: 0, pct: 25, wallet: 40 }), 10);
  });

  it("reads with its basis", () => {
    assert.equal(lossLimitText({ fixed: 2, pct: 25, wallet: 34 }), "8.50 USDT (25 % of wallet 34.00)");
    assert.equal(lossLimitText({ fixed: 2, pct: 25, wallet: 6 }), "2.00 USDT");
    assert.equal(lossLimitText({ fixed: 3, pct: 0, wallet: 34 }), "3.00 USDT");
  });
});

test("the loss budget counts from this session's start, every session (systemwide)", () => {
  // a session is one process's life: its budget starts at its own launch (a restart or a relaunch after a stop too)
  const launched = Date.UTC(2026, 9, 11, 11, 53, 20);
  assert.equal(sessionBaseline(launched), launched);
});

test("the 80 % limit is taken of the session's starting wallet, not of a later balance", () => {
  // the operator's case: 2.62 USDT at the session start → 2.10 USDT; the caller passes the session's wallet
  assert.ok(Math.abs(lossLimitUsd({ fixed: 0, pct: 80, wallet: 2.62 }) - 2.096) < 1e-9);
  // no session wallet read and no fixed part: no limit (the desk reads the wallet at its first check, so this is a gap
  // only before that read)
  assert.equal(lossLimitUsd({ fixed: 0, pct: 80, wallet: null }), 0);
});
