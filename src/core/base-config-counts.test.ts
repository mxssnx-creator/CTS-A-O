import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BaseConfigCounter, type BaseConfigCountOptions } from "./base-config-counts.ts";
import type { Protect } from "./domain/types.ts";
import { statsOf, type TradeLike } from "./metrics/stats.ts";
import { passesBase } from "./pipeline/pipeline.ts";

const P: Protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const options = (patch: Partial<BaseConfigCountOptions> = {}): BaseConfigCountOptions => ({
  gates: { minPf: 1.05, minTrades: 2, maxDdr: 0 },
  cost: 0.002,
  fromT: 0,
  cutT: 100,
  ...patch,
});
const trades = (returns: readonly number[], offset = 0): TradeLike[] =>
  returns.map((r, i) => ({ r, entryT: offset + i * 10, exitT: offset + i * 10 + 5 }));

describe("full Base configured-cell counts", () => {
  it("uses each cell's recent Base closes without borrowing an older winning history", () => {
    const count = new BaseConfigCounter(options({ cutT: 1000,
      gates: { minPf: 1.1, minTrades: 2, maxDdr: 0, baseLastN: 4, lastNFloor: 2 } }));
    const oldWinners = [0.1, 0.1, 0.1, 0.1];
    count.record("follow", "ema-9-21@m15", P, "normal", trades([...oldWinners, -.01, -.01, -.01, -.01]));
    count.record("follow", "ema-9-21@m15", { ...P, tp: .02 }, "normal", trades([-.01, -.01, .02, .02, .02, .02]));
    const row = count.rows()[0];
    assert.equal(row.evaluated, 2);
    assert.equal(row.pfPassed, 2, "both full samples clear the separate raw PF floor");
    assert.equal(row.passed, 1, "only the config with its own passing recent closes qualifies");
  });

  it("counts Micro and Minimal using their own Base window, including their Last-N failures", () => {
    const count = new BaseConfigCounter(options({ cutT: 1000,
      gates: { minPf: 1.1, minTrades: 9, maxDdr: 0, baseLastN: 40, lastNFloor: 9,
        baseRangeLastN: { micro: 30, minimal: 30 } } }));
    const xs = trades([...Array(10).fill(.03), ...Array(30).fill(-.005)]);
    for (const tag of ["mc", "mn", "sh"] as const)
      count.record("follow", "ema-9-21@m1", { ...P, tag }, "normal", xs);
    const rows = Object.fromEntries(count.rows().map((r) => [r.tag, r]));
    for (const tag of ["mc", "mn"]) {
      assert.equal(rows[tag].evaluated, 1);
      assert.equal(rows[tag].passed, 0);
    }
    assert.equal(rows.sh.passed, 1, "Short uses the passing Last-40 instead of the losing Last-30");
  });

  it("starts empty and counts every raw configured cell independently rather than one pair's best protect", () => {
    const count = new BaseConfigCounter(options());
    assert.deepEqual(count.rows(), []);
    count.record("follow", "tactic-trend-s@m15", P, "normal", trades([0.02, -0.01]));
    count.record(
      "follow",
      "tactic-trend-s@m15",
      { ...P, tp: 0.02 },
      "normal",
      trades([0.01, -0.02]),
    );
    const [row] = count.rows();
    assert.equal(row.configured, 2);
    assert.equal(row.evaluated, 2);
    assert.equal(row.pfPassed, 1);
    assert.equal(row.passed, 1);
    assert.equal(row.closes, 4);
    assert.equal(row.gp, 3);
    assert.equal(row.gl, 3);
    assert.equal(row.firstEntryT, 0);
    assert.equal(row.lastExitT, 15);
    assert.equal(row.floorPf, 1.1);
    assert.equal(row.minPf, 1.1);
    assert.equal(row.cost, 0.002);
    assert.equal(row.cutT, 100);
    assert.equal(row.fromT, 0);
    assert.deepEqual(row.notEvaluated, {});
  });

  it("matches manual return PF and shared Base gates across two ranges and every strategy kind", () => {
    const count = new BaseConfigCounter(
      options({
        gates: { minPf: 1.05, minTrades: 2, maxDdr: 0, rangeMinPf: { micro: 1.05, general: 1.4 } },
      }),
    );
    const samples = [trades([0.03, -0.02]), trades([0.01, -0.02]), trades([0.02, -0.01])];
    for (const tag of ["mc", "gn"] as const)
      for (const kind of [
        "normal",
        "trailing",
        "block",
        "block-active",
        "dca",
        "dca-active",
        "axis",
      ])
        for (const [i, xs] of samples.entries())
          count.record(
            "follow",
            "tactic-adaptive-s@m5",
            { ...P, tag, tp: 0.01 * (i + 1) },
            kind,
            xs,
          );
    const rows = count.rows();
    assert.equal(rows.length, 14);
    for (const row of rows) {
      const floor = row.tag === "gn" ? 1.4 : 1.05;
      const manuallyPassed = samples.filter((xs) =>
        passesBase(statsOf(xs, 100), { minPf: floor, minTrades: 2, maxDdr: 0 }),
      ).length;
      assert.equal(row.configured, 3);
      assert.equal(row.evaluated, 3);
      assert.equal(row.pfPassed, 2);
      assert.equal(row.passed, manuallyPassed);
      assert.equal(row.minPf, floor);
      assert.equal(row.gp, 6);
      assert.equal(row.gl, 5);
    }
  });

  it("includes the exact 1.1 floor and excludes a configuration just below it", () => {
    const count = new BaseConfigCounter(options());
    count.record("follow", "tactic-trend-s@m15", P, "normal", trades([1.1 * 0.01, -0.01]));
    count.record("follow", "tactic-trend-s@m15", P, "normal", trades([1.1 * 0.01 - 1e-10, -0.01]));
    const [row] = count.rows();
    assert.equal(row.configured, 2);
    assert.equal(row.pfPassed, 1);
    assert.equal(row.passed, 1);
  });

  it("reports floor PF passes separately from a stricter range or stage minimum", () => {
    const count = new BaseConfigCounter(
      options({ gates: { minPf: 1.8, minTrades: 2, rangeMinPf: { long: 2 } } }),
    );
    for (const tag of [undefined, "lg"] as const)
      count.record("follow", "tactic-trend-s@m15", { ...P, tag }, "normal", trades([0.015, -0.01]));
    const rows = count.rows();
    assert.deepEqual(rows.map((r) => r.minPf).sort(), [1.8, 2]);
    for (const row of rows) {
      assert.equal(row.pfPassed, 1);
      assert.equal(row.passed, 0);
    }
  });

  it("separates return-PF qualification from the minimum close count and drawdown ratio", () => {
    const sample = new BaseConfigCounter(
      options({ gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 } }),
    );
    sample.record("follow", "tactic-trend-s@m15", P, "normal", trades([0.03, -0.01]));
    assert.equal(sample.rows()[0].pfPassed, 1);
    assert.equal(sample.rows()[0].passed, 0);
    const ddr = new BaseConfigCounter(
      options({ gates: { minPf: 1.05, minTrades: 2, maxDdr: 0.5 } }),
    );
    ddr.record("follow", "tactic-trend-s@m15", P, "normal", trades([-0.02, 0.03]));
    assert.equal(ddr.rows()[0].pfPassed, 1);
    assert.equal(ddr.rows()[0].passed, 0, "2% drawdown / 1% net exceeds 0.5");
  });

  it("keeps full bot, indication range, technique, timeframe, combined lane and type identities separate", () => {
    const count = new BaseConfigCounter(options());
    const keys = [
      ["follow", "tactic-trend-s@m1", "normal"],
      ["revert", "tactic-trend-s@m1", "normal"],
      ["follow", "tactic-trend-m@m1", "normal"],
      ["follow", "tactic-pullback-s@m1", "normal"],
      ["follow", "tactic-trend-s@m5", "normal"],
      ["follow", "tactic-trend-s@m1c", "normal"],
      ["follow", "tactic-trend-s@m1", "trailing"],
    ];
    for (const [bot, ind, kind] of keys) count.record(bot, ind, P, kind, trades([0.02, -0.01]));
    assert.equal(count.rows().length, keys.length);
    for (const row of count.rows()) {
      assert.equal(row.configured, 1);
      assert.equal(row.passed, 1);
    }
  });

  it("uses only settled closes whose entry and exit fall inside the declared causal window", () => {
    const count = new BaseConfigCounter(options({ fromT: 10, cutT: 30 }));
    count.record("follow", "tactic-trend-s@m15", P, "normal", [
      { r: -10, entryT: 0, exitT: 15 },
      { r: 0.03, entryT: 10, exitT: 20 },
      { r: -0.02, entryT: 20, exitT: 30 },
      { r: -10, entryT: 25, exitT: 31 },
    ]);
    const [row] = count.rows();
    assert.equal(row.closes, 2);
    assert.equal(row.gp, 3);
    assert.equal(row.gl, 2);
    assert.equal(row.firstEntryT, 10);
    assert.equal(row.lastExitT, 30);
    assert.equal(row.passed, 1);
  });

  it("sorts closes before computing the shared equity and drawdown gates without mutating input", () => {
    const xs = trades([-0.02, 0.03]).reverse();
    const saved = xs.slice();
    const count = new BaseConfigCounter(
      options({ gates: { minPf: 1.1, minTrades: 2, maxDdr: 0.5 } }),
    );
    count.record("follow", "tactic-trend-s@m15", P, "normal", xs);
    assert.deepEqual(xs, saved);
    assert.equal(count.rows()[0].passed, 0);
    assert.equal(count.rows()[0].lastExitT, 15);
  });

  it("counts explicit skipped or duplicate cells once without treating them as evaluated", () => {
    const count = new BaseConfigCounter(options());
    for (const reason of ["duplicate", "duplicate", "lane-ineligible", "held-only"])
      count.record("follow", "tactic-trend-s@m15", P, "normal", trades([1]), reason);
    count.record("follow", "tactic-trend-s@m15", P, "normal", trades([0.02, -0.01]));
    const [row] = count.rows();
    assert.equal(row.configured, 5);
    assert.equal(row.evaluated, 1);
    assert.equal(row.passed, 1);
    assert.equal(row.closes, 2);
    assert.deepEqual(row.notEvaluated, { duplicate: 2, "lane-ineligible": 1, "held-only": 1 });
    assert.equal(
      row.configured,
      row.evaluated + Object.values(row.notEvaluated).reduce((a, b) => a + b, 0),
    );
  });

  it("records an evaluated empty or all-zero sample honestly with no qualifying config", () => {
    const count = new BaseConfigCounter(options());
    count.record("follow", "tactic-trend-s@m15", P, "normal", []);
    const empty = count.rows()[0];
    assert.equal(empty.evaluated, 1);
    assert.equal(empty.closes, 0);
    assert.equal(empty.pfPassed, 0);
    assert.equal(empty.passed, 0);
    assert.equal(empty.firstEntryT, null);
    assert.equal(empty.lastExitT, null);
    count.record("follow", "tactic-trend-s@m15", P, "normal", trades([0, 0]));
    assert.equal(count.rows()[0].evaluated, 2);
    assert.equal(count.rows()[0].passed, 0);
  });

  it("keeps net returns and floor qualification while matching the engine's stricter no-loss gate convention", () => {
    const gates = { minPf: 5, minTrades: 2 };
    const count = new BaseConfigCounter(options({ cost: 0.02, gates }));
    const closes = trades([0.001, 0.001]);
    count.record("follow", "tactic-trend-s@m15", P, "normal", closes);
    const [row] = count.rows();
    assert.equal(row.gp, 0.2);
    assert.equal(row.gl, 0);
    assert.equal(row.pfPassed, 1);
    const engine = statsOf(closes, 100);
    assert.equal(engine.pf, 4, "the existing engine uses its disclosed no-loss score convention");
    assert.equal(row.passed, Number(passesBase(engine, gates)));
    assert.equal(row.passed, 0, "a stricter engine minimum above that score still holds the config back");
  });

  it("rejects invalid in-window returns or timestamps as an explicit unevaluated cell", () => {
    const count = new BaseConfigCounter(options());
    const good = trades([0.03, -0.01]);
    for (const bad of [
      { r: NaN, entryT: 20, exitT: 25 },
      { r: Infinity, entryT: 20, exitT: 25 },
      { r: -Infinity, entryT: 20, exitT: 25 },
      { r: 0.1, entryT: NaN, exitT: 25 },
      { r: 0.1, entryT: 20, exitT: Infinity },
      { r: 0.1, entryT: 25, exitT: 20 },
    ])
      count.record("follow", "tactic-trend-s@m15", P, "normal", [...good, bad]);
    const [row] = count.rows();
    assert.equal(row.configured, 6);
    assert.equal(row.evaluated, 0);
    assert.equal(row.pfPassed, 0);
    assert.equal(row.passed, 0);
    assert.equal(row.closes, 0);
    assert.deepEqual(row.notEvaluated, { "invalid-trades": 6 });
    const outside = new BaseConfigCounter(options());
    outside.record("follow", "tactic-trend-s@m15", P, "normal", [
      ...good,
      { r: NaN, entryT: 110, exitT: 120 },
    ]);
    assert.equal(outside.rows()[0].passed, 1);
  });

  it("returns detached deterministic rows and freezes the options used throughout a count", () => {
    const original = options({ gates: { minPf: 1.1, minTrades: 2, rangeMinPf: { long: 1.4 } } });
    const count = new BaseConfigCounter(original);
    original.gates.minPf = 9;
    original.gates.rangeMinPf!.long = 9;
    original.cost = 9;
    count.record(
      "revert",
      "tactic-trend-s@m15",
      { ...P, tag: "lg" },
      "normal",
      trades([0.03, -0.01]),
    );
    count.record("follow", "tactic-trend-s@m15", P, "normal", [], "duplicate");
    const rows = count.rows();
    assert.deepEqual(
      rows.map((r) => r.bot),
      ["follow", "revert"],
    );
    rows[0].configured = 999;
    rows[0].notEvaluated.duplicate = 999;
    assert.equal(count.rows()[0].configured, 1);
    assert.equal(count.rows()[0].notEvaluated.duplicate, 1);
    assert.equal(count.rows()[1].minPf, 1.4);
    assert.equal(count.rows()[1].cost, 0.002);
  });
});
