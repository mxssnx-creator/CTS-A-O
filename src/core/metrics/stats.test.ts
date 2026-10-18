// The trade statistics, pinned by hand (the values below are worked out on paper, not read from the code).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PF_NO_LOSS } from "../config.ts";
import { hourlyNet, profitFactor, scoreStats, settledHourT, statsOf } from "./stats.ts";

const H = 3_600_000;
// four trades, one per hour, returns +2 %, −1 %, +3 %, −2 % of notional
const trades = [0.02, -0.01, 0.03, -0.02].map((r, i) => ({ r, entryT: (i + 1) * H - 1000, exitT: (i + 1) * H }));

describe("trade statistics", () => {
  it("uses the completed exit-bar hour just before, exactly at, and after each hourly boundary", () => {
    const exits = [H - 1, H, H + 1, 2 * H];
    assert.deepEqual(exits.map(settledHourT), [0, 0, H, H]);
    const rows = exits.map((exitT, i) => ({ entryT: 1, exitT, r: [0.02, -0.01, -0.01, 0.03][i] }));
    const hours = hourlyNet(rows);
    assert.deepEqual([...hours].map(([t, x]) => [t, x.n]), [[0, 2], [H, 2]]);
    const ordered = statsOf(rows, 2 * H);
    const unordered = statsOf([...rows].reverse(), 2 * H);
    assert.equal(ordered.hours, 2);
    assert.equal(ordered.greenHours, 2);
    assert.equal(unordered.hours, ordered.hours);
    assert.equal(unordered.greenHours, ordered.greenHours);
    assert.equal([...hours.values()].reduce((n, x) => n + x.n, 0), rows.length);
  });

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
