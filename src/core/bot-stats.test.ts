// The per-bot exchange statistics and their verdicts against the frozen criteria (docs/bot-stability-criteria.md).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { botFamilyOf, botStatsFromRows, eventBar, repriced, type LaneRow } from "./bot-stats.ts";

const H = 3_600_000;
const T0 = 1_791_000_000_000; // a Monday-ish epoch; blocks are 8 h
/** one config's paper position closed on the exchange: entry 100, exit at `move` (fraction) gross, stored cost `cost` */
function row(i: number, o: { cfg?: string; side?: number; move?: number; cost?: number; reason?: string; t?: number } = {}): LaneRow {
  const side = o.side ?? (i % 2 ? 1 : -1);
  const move = o.move ?? 0.01;
  const exit = 100 * (1 + side * move);
  const cost = o.cost ?? 0.002;
  const sym = `S${i % 40}`;
  return {
    id: `${o.cfg ?? "follow|ema|tp1|sl1|tr0|h16|mn"}|${sym}|${side}|${T0 + (i % 40) * 900_000}`,
    cfg: o.cfg ?? "follow|ema|tp1|sl1|tr0|h16|mn",
    sym,
    side,
    entry: 100,
    exit,
    exit_t: o.t ?? T0 + i * H,
    // (the exit is already on the side's favourable move: side × (exit − entry) / entry = move)
    r: move - cost,
    reason: o.reason ?? "exit",
  };
}

describe("bot statistics: families, sample floors and the frozen verdict", () => {
  it("a family is a bot × range; signal configs are named apart", () => {
    assert.equal(botFamilyOf("follow|ema|tp1|sl1|tr0|h16|mn"), "eng follow mn");
    assert.equal(botFamilyOf("revert|ema|tp1|sl1|tr0|h16"), "eng revert wide");
    // a signal family is its source × range (the range is the -s / -m of the indication)
    assert.equal(botFamilyOf("follow|sig-sar-m@m5|tp2|sl2|tr0|h96"), "sig follow sar medium");
    assert.equal(botFamilyOf("follow|sig-rsi-14-30-s@m15|tp2|sl2|tr0|h96"), "sig follow rsi-14-30 short");
    // the lanes of one source and range are one family (the lane suffix is not part of it)
    assert.equal(botFamilyOf("follow|sig-sar-m@m15|tp2|sl2|tr0|h96"), "sig follow sar medium");
  });

  it("a stored return with no fee is re-priced: only the missing part of the round trip is taken off", () => {
    // the 11 Oct fills carried no fee: the stored r is the gross move (cost 0) and is re-priced at 0.2 %
    const unmeasured = row(1, { move: 0.01, cost: 0 });
    assert.ok(Math.abs(repriced(unmeasured, 0.002) - 0.008) < 1e-12);
    // a row recorded with the model cost is not charged twice
    const modelled = row(2, { move: 0.01, cost: 0.002 });
    assert.ok(Math.abs(repriced(modelled, 0.002) - 0.008) < 1e-12);
  });

  it("a small sample is not judged, never a pass", () => {
    const rows = Array.from({ length: 40 }, (_, i) => row(i, { move: 0.02 }));
    const f = botStatsFromRows(rows).families[0];
    assert.equal(f.verdict, "not judged");
    assert.ok(f.why.some((w) => w.startsWith("trades 40 of 150")));
  });

  it("a family with enough trades, events, sides and blocks that stays above PF 1 at both costs passes", () => {
    const rows = Array.from({ length: 200 }, (_, i) => row(i, { move: 0.02 }));
    const f = botStatsFromRows(rows).families[0];
    assert.equal(f.trades, 200);
    assert.equal(f.events, 40);
    assert.equal(f.verdict, "pass", f.why.join("; "));
    assert.ok(f.pf02 >= 1 && f.pf04 >= 1);
    assert.ok(f.blockPassRate >= 2 / 3);
  });

  it("the same family losing at 0.2 % fails, and names the failing test", () => {
    const rows = Array.from({ length: 200 }, (_, i) => row(i, { move: -0.001 }));
    const f = botStatsFromRows(rows).families[0];
    assert.equal(f.verdict, "fail");
    assert.ok(f.why.some((w) => w.startsWith("PF at 0.2%")));
  });

  it("the 01:06 restart's stops are excluded from every judgement and counted apart", () => {
    const inc = 1_791_680_800_500;
    const rows = [
      ...Array.from({ length: 200 }, (_, i) => row(i, { move: 0.02 })),
      ...Array.from({ length: 30 }, (_, i) => row(500 + i, { move: -0.05, reason: "stop", t: inc })),
    ];
    const out = botStatsFromRows(rows);
    assert.equal(out.restart, 30);
    assert.equal(out.families[0].trades, 200, "the restart rows are not trades");
    assert.equal(out.families[0].verdict, "pass");
  });

  it("an event is one symbol, side and 15-minute entry bar: entries inside one bar are one event", () => {
    const bar = 1_791_677_700_000; // a 15-minute boundary
    assert.equal(eventBar(`x|S1-USDT|1|${bar + 4 * 60_000}`), String(bar));
    assert.equal(eventBar(`x|S1-USDT|1|${bar}`), String(bar));
    assert.equal(eventBar(`x|S1-USDT|1|${bar + 900_000}`), String(bar + 900_000));
    assert.equal(eventBar("x|S1-USDT|1|not-a-time"), "not-a-time");
  });
});
