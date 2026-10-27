import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GATES, DEFAULT_SETTINGS } from "./config.ts";
import type { Protect, Trade } from "./domain/types.ts";
import { minPfOf } from "./minimal-coord.ts";
import { statsOf } from "./metrics/stats.ts";
import {
  baseGateSensitivity,
  basePassTags,
  baseRangeCounts,
  baseRangeWhy,
  baseSetsGates,
  configId,
  rangeCellPass,
} from "./pipeline/pipeline.ts";
import {
  configEval,
  defaultWalkForward,
  execDecision,
  makeTape,
  selectAt,
  selectDurable,
  selectFixed,
} from "./sim/walkforward.ts";

const NOW = Date.UTC(2026, 9, 15);
const IND = "tactic-trend-s@m15";
const OTHER = "rsi-mom-14-20@m15";
const P: Protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const G = {
  ...DEFAULT_GATES,
  minPf: 1.05,
  minTrades: 2,
  maxDdr: 0,
  maxDdtH: 1000,
  minDdtH: 0,
  rangeMinPf: { micro: 1.05, short: 1.08, general: 1.3 },
  lossPrior: false,
  minGreen: 0,
  stableBlocks: 0,
};
const sample = (pf: number) =>
  statsOf(
    [
      { r: pf * 0.01, entryT: 0, exitT: 1 },
      { r: -0.01, entryT: 2, exitT: 3 },
    ],
    4,
  );

function tape(ind: string, pf: number, protect: Protect = P, otherSymbolPf?: number) {
  const id = configId("follow", ind, protect);
  const trades: Trade[] = Array.from({ length: 2000 }, (_, i) => ({
    cfg: id,
    sym: "A",
    side: 1,
    entryT: NOW - (2100 - i) * 60_000,
    exitT: NOW - (2100 - i) * 60_000 + 30_000,
    entry: 100,
    exit: 100,
    r: i % 2 ? -0.01 : pf * 0.01,
    mult: 1,
    kind: "normal",
    reason: i % 2 ? "sl" : "tp",
    bars: 1,
    mfe: 0,
    mae: 0,
  }));
  if (otherSymbolPf !== undefined) trades.push(...trades.map(t => ({ ...t, sym: "B", r: t.r > 0 ? otherSymbolPf * 0.01 : t.r })));
  return makeTape(id, "follow", ind, protect, "normal", otherSymbolPf === undefined ? ["A"] : ["A", "B"], trades, [], []);
}

const OPTIONS = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  gates: G,
  longH: 48,
  preH: 48,
  preGate: false,
  rank: "net" as const,
  seatPer: "config" as const,
  portfolio: 0,
  robustFrac: 0,
  lastN: 20,
  lastNMinPf: 1,
  validLastN: 0,
  symGate: "off" as const,
  normalBaseMinPf: 0,
  toggles: { ...DEFAULT_SETTINGS.toggles, normal: true, block: false, blockActive: false },
  engineSideAccept: undefined,
};

describe("first-class indication minimum return PF is consistent from Base through entry", () => {
  it("applies the 1.1 floor to Tactic, Relate and Break identities while preserving stricter stage/range minima", () => {
    for (const ind of [
      "tactic-trend-s",
      IND,
      "tactic-adaptive-m@m1c",
      "tactic-mean-reversion-s@m30",
      "relate-1-trend-guarded@m1",
      "break-rel-don-5-dd24-guarded@m5",
      "break-mc-rel-retest-15-dd48-balanced@m15",
    ])
      for (const tag of [undefined, "mc", "sh"]) assert.equal(minPfOf(G, tag, ind), 1.1);
    assert.equal(minPfOf(G, "gn", IND), 1.3);
    assert.equal(minPfOf({ ...G, minPf: 1.4 }, undefined, IND), 1.4);
    assert.equal(minPfOf(G, "mc", OTHER), 1.05);
    assert.equal(minPfOf(G, "sh", "sig-ema-cross-s@m15"), 1.5);
    assert.equal(minPfOf(G, undefined), 1.05);
  });

  it("holds Base pair tags and representative range-cell selection to the same Tactic floor", () => {
    const low = sample(1.08);
    const g = baseSetsGates({ ...G, baseSetsMinPf: 1 });
    const lowRun = { ind: IND, full: low, ranges: { mc: low, sh: low } };
    assert.deepEqual(basePassTags(lowRun, g, ["mc", "sh", "gn"]), []);
    assert.deepEqual(
      basePassTags({ ...lowRun, ind: OTHER }, g, ["mc", "sh", "gn"]).sort(),
      ["", "mc"].sort(),
    );
    for (const tag of ["", "mc", "sh"]) {
      assert.equal(rangeCellPass({ ...G, baseSetsMinPf: 1 }, IND)(tag, low), false);
      assert.equal(rangeCellPass({ ...G, baseSetsMinPf: 1 }, OTHER)(tag, low), tag !== "sh",
        "ordinary Short also keeps the 1.1 range floor");
      assert.equal(rangeCellPass({ ...G, baseSetsMinPf: 1 }, OTHER)(tag, sample(1.12)), true);
      assert.equal(rangeCellPass({ ...G, baseSetsMinPf: 1 }, IND)(tag, sample(1.12)), true);
    }
    assert.equal(rangeCellPass({ ...G, baseSetsMinPf: undefined }, IND)("gn", sample(1.2)), false);
  });

  it("reports matching Base passed counts and PF failure reasons instead of reporting the old lower floor", () => {
    const runs = [1.08, 1.12].map((pf) => ({
      ind: IND,
      full: sample(pf),
      ranges: { mc: sample(pf) },
    }));
    const count = baseRangeCounts(runs, G, ["mc"]);
    for (const row of count) {
      assert.equal(row.passed, 1);
      assert.equal(row.minPf, 1.1);
    }
    const why = baseRangeWhy(runs, G, ["mc"]);
    for (const row of why) {
      assert.equal(row.passed, 1);
      assert.equal(row.first.pf, 1);
    }
    const sensitivity = baseGateSensitivity(
      runs,
      G,
      ["mc"],
      [{ change: "lower configured gate", minPf: 1 }],
    );
    for (const row of sensitivity) {
      assert.equal(row.passed, 1);
      assert.equal(row.passedAnyRange, 1);
    }
  });

  it("rejects PF 1.08 at config evaluation and all seat selectors, including a previously held durable seat", () => {
    const weak = tape(IND, 1.08);
    const legacy = tape(OTHER, 1.08);
    const strong = tape(IND, 1.2);
    const ev = configEval(weak, NOW, OPTIONS);
    assert.equal(ev.ok, false);
    if (!ev.ok) assert.equal(ev.fail, "pf");
    assert.equal(configEval(strong, NOW, OPTIONS).ok, true);
    assert.equal(selectFixed([weak], NOW, OPTIONS).picks.length, 0);
    assert.equal(selectFixed([strong], NOW, OPTIONS).picks.length, 1);
    assert.equal(selectAt([weak], NOW, OPTIONS).picks.length, 0);
    assert.equal(
      selectAt([legacy], NOW, OPTIONS).picks.length,
      1,
      "existing non-Tactic gate remains 1.05",
    );
    assert.equal(selectDurable([weak], NOW, OPTIONS, new Set([weak.id])).picks.length, 0);
    assert.equal(selectDurable([legacy], NOW, OPTIONS, new Set([legacy.id])).picks.length, 1);
    const stricter = { ...OPTIONS, gates: { ...G, minPf: 1.3 } };
    assert.equal(selectFixed([strong], NOW, stricter).picks.length, 0);
  });

  it("uses the same 1.1 minimum for the exact config's per-side entry and symbol gates", () => {
    const weak = tape(IND, 1.08);
    const strong = tape(IND, 1.2);
    const legacy = tape(OTHER, 1.08);
    const ctx = { sym: "A", side: 1 };
    assert.deepEqual(execDecision(weak, NOW, OPTIONS, ctx), { ok: false, why: "directionValidation" });
    assert.equal(execDecision(strong, NOW, OPTIONS, ctx).ok, true);
    assert.equal(execDecision(legacy, NOW, OPTIONS, ctx).ok, true);
    const symbolOnly = { ...OPTIONS, lastN: 0, symGate: "vetoSide" as const };
    const symbolWeak = tape(IND, 1.08, P, 1.2); // B qualifies the direction, while A must pass its own symbol gate.
    assert.deepEqual(execDecision(symbolWeak, NOW, symbolOnly, ctx), { ok: false, why: "symPf" });
    assert.equal(execDecision(strong, NOW, symbolOnly, ctx).ok, true);
  });
});
