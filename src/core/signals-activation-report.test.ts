// The activation report: activeSignals can say, per unit, which test removed it. It must not change the decisions, and a
// long and a short unit with the same record must get the same verdict (x01, 20 Oct: no long unit was active and the
// failing test could not be read).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activationEnd, activeSignals, sigActiveKey, summarizeActivation, type SignalUnitReport } from "./signals.ts";
import { DEFAULT_SIGNALS } from "./signal-config.ts";

const sig = { ...DEFAULT_SIGNALS, count: 0, minTrades: 3, rank: "lowdd" as const, validate: true, minBlockShare: 0.6 };
const good = { n: 9, net: 20, pf: 1.6, dd: 5, okShare: 0.9, recentN: 3, recentNet: 2 };
const units: Record<string, typeof good> = {
  active: good,
  few: { ...good, n: 1 },
  stale: { ...good, recentN: 0 },
  negative: { ...good, net: -3 },
  choppy: { ...good, okShare: 0.2 },
  deep: { ...good, net: 2, dd: 5 },
};
const runs = Object.entries(units).map(([name, st]) => ({
  bot: "follow",
  ind: `sig-${name}-s@m15`,
  bySym: { A: { ...st, sides: { "1": st, "-1": st } } },
}));

describe("activeSignals report", () => {
  it("the active set is the same with and without the collector", () => {
    const plain = activeSignals(runs, sig);
    const report: SignalUnitReport[] = [];
    const withReport = activeSignals(runs, sig, report);
    assert.deepEqual([...withReport].sort(), [...plain].sort());
  });

  it("each test is reported for its unit, on both sides", () => {
    const report: SignalUnitReport[] = [];
    activeSignals(runs, sig, report);
    const want: Record<string, string> = {
      active: "active",
      few: "minTrades",
      stale: "recent",
      negative: "net",
      choppy: "block",
      deep: "lowdd",
    };
    for (const [name, reason] of Object.entries(want))
      for (const side of [1, -1] as const) {
        const u = report.find((x) => x.key === sigActiveKey("follow", `sig-${name}-s@m15`, "A", side));
        assert.equal(u?.reason, reason, `${name} side ${side}`);
        assert.equal(u?.side, side);
      }
  });

  it("a long and a short with the same record get the same verdict; a ranked-out unit is 'cap'", () => {
    const report: SignalUnitReport[] = [];
    activeSignals(runs, { ...sig, count: 1 }, report);
    const l = report.find((x) => x.key === sigActiveKey("follow", "sig-active-s@m15", "A", 1));
    const s = report.find((x) => x.key === sigActiveKey("follow", "sig-active-s@m15", "A", -1));
    assert.ok(l && s);
    // count 1 keeps one unit; the other side of the same record is ranked out with the same numbers
    assert.deepEqual([l.reason, s.reason].sort(), ["active", "cap"]);
    assert.equal(l.net, s.net);
  });

  it("summarizeActivation counts per direction and per reason", () => {
    const report: SignalUnitReport[] = [];
    activeSignals(runs, sig, report);
    const sum = summarizeActivation(report);
    for (const dir of ["long", "short"] as const) {
      assert.equal(sum[dir].active, 1);
      assert.equal(sum[dir].minTrades, 1);
      assert.equal(sum[dir].recent, 1);
      assert.equal(sum[dir].net, 1);
      assert.equal(sum[dir].block, 1);
      assert.equal(sum[dir].lowdd, 1);
    }
    assert.equal(sum.pooled.active, 0);
  });

  it("a pooled record (no sides) is one unit with side 0", () => {
    const report: SignalUnitReport[] = [];
    const pooled = [{ bot: "follow", ind: "sig-p-s@m15", bySym: { A: good } }];
    const set = activeSignals(pooled, sig, report);
    assert.equal(set.size, 2);
    assert.equal(report.length, 1);
    assert.equal(report[0].side, 0);
    assert.equal(report[0].reason, "active");
  });

  it("activationEnd keeps counts and the ten long units with the most net, best first", () => {
    const report: SignalUnitReport[] = [];
    const many = Array.from({ length: 14 }, (_, i) => ({
      bot: "follow",
      ind: `sig-m${i}-s@m15`,
      bySym: { A: { ...good, net: 10 + i, sides: { "1": { ...good, net: 10 + i }, "-1": { ...good, net: 10 + i } } } },
    }));
    activeSignals(many, sig, report);
    const end = activationEnd(report);
    assert.equal(end.counts.long.active, 14);
    assert.equal(end.topLong.length, 10);
    assert.ok(end.topLong.every((u) => u.side === 1));
    assert.deepEqual(
      end.topLong.map((u) => u.net),
      [23, 22, 21, 20, 19, 18, 17, 16, 15, 14],
    );
  });
});
