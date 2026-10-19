import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POSITION_COST_STRESS_RT } from "../src/core/model-cost.ts";
import { positiveTypesReport } from "./lib/positive-types-report.mjs";

const H = 3_600_000,
  START = Date.UTC(2026, 8, 1);
const cfg = "follow|ema-9-21@m15|tp1|sl1|tr0|h32";
const trade = (r, mult, i) => ({
  cfg,
  sym: "TEST-USDT",
  side: 1,
  entry: 100,
  exit: 100 * (1 + r + 0.002),
  entryT: START + 1 + i * H,
  exitT: START + (i + 1) * H,
  r: r * mult,
  mult,
  reason: r > 0 ? "tp" : "sl",
});
const dump = (trades) => ({ window: { startT: START, endT: START + 2 * H }, trades });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} ≠ ${b}`);

describe("positive family simulation unit-return reporting", () => {
  it("honors verified unit overrides and withholds the whole primary/stress sample on unknown unit rows", () => {
    const overridden = positiveTypesReport(
      dump([{ ...trade(0.9, 3, 0), unitR: 0.02 }, trade(-0.01, 1, 1)]),
    );
    near(overridden.total.pf, 2);
    for (const extra of [{ unitR: null }, { mult: 0 }, { mult: NaN }]) {
      const report = positiveTypesReport(
        dump([trade(0.02, 1, 0), { ...trade(-0.01, 1, 1), ...extra }]),
      );
      assert.equal(report.total.n, 2);
      assert.equal(report.total.pfBasis, "unavailable");
      assert.equal(report.total.unknownReturns, 1);
      assert.equal(report.total.pf, null);
      assert.equal(report.total.net, null);
      assert.equal(report.familyStatsState, "unavailable");
      assert.deepEqual(report.familyStats, []);
      near(report.sizedSimulation.pf, 2);
    }
  });
  it("uses return PF 1.36 for total/family/botStats while exposing unequal-size PF 0.20 separately", () => {
    const raw = dump([trade(0.0136, 1, 0), trade(-0.01, 6.8, 1)]);
    const copy = structuredClone(raw),
      report = positiveTypesReport(raw);
    near(report.total.pf, 1.36);
    near(report.total.net, 0.36);
    near(report.byFamily[0].pf, 1.36);
    near(report.familyStats[0].pfStored, 1.36);
    near(report.familyStats[0].pf02, 1.36);
    // the fixture's exits embed 0.2 % of cost; the stress run deducts the rest of POSITION_COST_STRESS_RT
    const stressExtra = POSITION_COST_STRESS_RT - 0.002;
    near(report.familyStats[0].pf04, (0.0136 - stressExtra) / (0.01 + stressExtra));
    near(report.sizedSimulation.pf, 0.2);
    near(report.sizedSimulation.net, -5.44);
    assert.equal(report.total.n, 2);
    assert.deepEqual(raw, copy);
  });

  it("assigns both boundary exits including final close to their completed hours with reconciled counts/net", () => {
    const report = positiveTypesReport(dump([trade(0.02, 1, 0), trade(-0.01, 2, 1)]));
    assert.deepEqual(
      report.byHour.map(({ t, n }) => [t, n]),
      [
        [START, 1],
        [START + H, 1],
      ],
    );
    assert.equal(
      report.byHour.reduce((n, s) => n + s.n, 0),
      report.total.n,
    );
    near(
      report.byHour.reduce((n, s) => n + s.net, 0),
      report.total.net,
    );
    assert.equal(
      report.byFamily.reduce((n, s) => n + s.n, 0),
      report.total.n,
    );
  });

  it("does not mix old entries, future exits, endpoint marks or siblings from another sample", () => {
    const a = trade(0.02, 1, 0),
      b = trade(-0.01, 1, 1);
    const report = positiveTypesReport({
      ...dump([
        a,
        b,
        { ...a, entryT: START - 1 },
        { ...b, exitT: START + 2 * H + 1 },
        { ...b, markedOpen: true },
      ]),
      openEnd: [{ ...b, mtmR: -0.5 }],
      stats: { pf: 999 },
    });
    assert.equal(report.total.n, 2);
    near(report.total.pf, 2);
  });

  it("keeps full Signal source/range families and empty/no-loss results honest", () => {
    const short = trade(0.02, 1, 0),
      medium = trade(-0.01, 1, 1);
    short.cfg = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32";
    medium.cfg = "follow|sig-ema-cross-m@m15|tp1|sl1|tr0|h32";
    const report = positiveTypesReport(dump([short, medium]));
    assert.equal(report.byFamily.length, 2);
    assert.equal(report.byFamily[0].noLoss, true);
    assert.equal(report.byFamily[0].pf, Infinity);
    assert.match(report.byFamily[0].pfConvention, /Infinity/);
    assert.equal(report.byFamily[1].pf, 0);
    const empty = positiveTypesReport(dump([]));
    assert.equal(empty.total.n, 0);
    assert.equal(empty.total.pf, 0);
    assert.equal(empty.total.noLoss, false);
    assert.deepEqual(empty.byHour, []);
    assert.throws(() => positiveTypesReport({ trades: [] }), /bounds/);
  });
});
