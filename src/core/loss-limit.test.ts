// The desk's loss limit: fixed, balance-relative (re-read at every check), or both — the larger holds.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lossLimitText, lossLimitUsd } from "./loss-limit.ts";

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
