// The trade statistics, pinned by hand (the values below are worked out on paper, not read from the code).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PF_NO_LOSS } from "../config.ts";
import { profitFactor, scoreStats, statsOf } from "./stats.ts";

const H = 3_600_000;
// four trades, one per hour, returns +2 %, −1 %, +3 %, −2 % of notional
const trades = [0.02, -0.01, 0.03, -0.02].map((r, i) => ({ r, entryT: (i + 1) * H - 1000, exitT: (i + 1) * H }));

describe("trade statistics", () => {
  it("profit factor: gross profit over gross loss; no loss is the capped PF; nothing is zero", () => {
    assert.equal(profitFactor(3, 1), 3);
    assert.equal(profitFactor(3, 0), PF_NO_LOSS);
    assert.equal(profitFactor(0, 0), 0);
  });

  it("the sample statistics of four trades (+2, −1, +3, −2 %)", () => {
    const s = statsOf(trades);
    assert.equal(s.n, 4);
    assert.equal(s.wins, 2);
    assert.equal(s.losses, 2);
    assert.equal(s.wr, 0.5);
    assert.ok(Math.abs(s.gp - 5) < 1e-9, "gross profit 5 %");
    assert.ok(Math.abs(s.gl - 3) < 1e-9, "gross loss 3 %");
    assert.ok(Math.abs(s.pf - 5 / 3) < 1e-12);
    assert.ok(Math.abs(s.net - 2) < 1e-9, "net +2 %");
    // equity 2, 1, 4, 2: the worst fall from a peak of 4 is to 2
    assert.ok(Math.abs(s.mdd - 2) < 1e-9, `mdd ${s.mdd}`);
    assert.ok(Math.abs(s.avg - 0.5) < 1e-9, "mean 0.5 %");
    assert.ok(Math.abs(s.expectancy - 0.5) < 1e-9);
    // sample standard deviation (n − 1) of the four returns: sqrt(0.0017 / 3); SQN = mean / sd × √n
    const sd = Math.sqrt(0.0017 / 3);
    assert.ok(Math.abs(s.sqn - ((0.005 / sd) * Math.sqrt(4))) < 1e-9, `sqn ${s.sqn}`);
  });

  it("no trades is the empty record", () => {
    const s = statsOf([]);
    assert.equal(s.n, 0);
    assert.equal(s.pf, 0);
    assert.equal(s.sqn, 0);
  });

  it("the composite score: a sample below its minimum is never positive; a profitable sample scores by net, PF, hours and drawdown", () => {
    // below the minimum sample: the net, and one more point against it
    const small = statsOf(trades);
    assert.ok(scoreStats(small, 8) <= -1 + 1e-12);
    // worked out by hand: net 10, PF 2 (capped at 3), 20 trades → sample 1, green hours 0.5 → hourly 0.35+0.5 squared,
    // mdd 2, ddt 24 h: 10 × (2 − 0.8) × 1 × 0.7225 / (1 + 2/4) / (1 + 24/48) = 3.8533…
    const s = { ...statsOf(trades), n: 20, net: 10, pf: 2, gh: 0.5, mdd: 2, ddt: 24 };
    assert.ok(Math.abs(scoreStats(s, 8) - 3.85333333) < 1e-6, `score ${scoreStats(s, 8)}`);
  });
});
