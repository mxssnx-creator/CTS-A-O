// The range sweep's levers (General and Long together, one at a time) and the per-range run summary: each lever moves
// only its own gate for both ranges, a lever at the baseline's value is not listed, and a range's profit factor counts
// its open orders as if closed.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { profitFactor } from "../metrics/stats.ts";
import type { Trade } from "../domain/types.ts";
import { RANGE_LEVER_TAGS, rangeLeverVariants, rangePfIncl, summarizeRun } from "./report-variants.ts";

const H = 3_600_000;
const T0 = 1_000 * H;
const tr = (cfg: string, r: number, eH: number, xH: number, open = false): Trade => ({
  cfg,
  sym: "A",
  side: 1,
  entryT: T0 + eH * H,
  exitT: open ? Infinity : T0 + xH * H,
  entry: 1,
  exit: 1,
  r,
  reason: r > 0 ? "tp" : "sl",
  bars: 1,
  mfe: 0,
  mae: 0,
  kind: "normal",
  vol: 1,
});

describe("range sweep levers", () => {
  // Micro carries its own coordination: every lever must leave it as it is. The sweep's baseline is the R1 desk, whose
  // minimum PF for General and Long is 1.05 (the production default is 1.12, so 1.12 would not be a lever there)
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  const base = {
    ...d,
    protects: [],
    dcaProtects: [],
    rangeCoord: { mc: { validLastN: 9 } },
    gates: { ...d.gates, rangeMinPf: { ...d.gates.rangeMinPf, general: 1.05, long: 1.05 } },
  };

  it("moves the lever for General and Long together and leaves every other range and option alone", () => {
    const specs = rangeLeverVariants(base);
    assert.ok(specs.length >= 6, "the lever list is not empty");
    assert.equal(new Set(specs.map((s) => s.id)).size, specs.length, "every row has its own id");
    for (const s of specs) {
      assert.equal(s.status, "run");
      assert.deepEqual(s.opts!.rangeCoord?.mc, { validLastN: 9 }, `${s.id}: Micro keeps its coordination`);
    }
    // building the list does not mutate the baseline
    assert.deepEqual(base.rangeCoord, { mc: { validLastN: 9 } });
  });

  it("lists a lever only when it differs from the baseline", () => {
    const ids = (o: Parameters<typeof rangeLeverVariants>[0]) => rangeLeverVariants(o).map((s) => s.id);
    const five = ids({ ...base, rangeCoord: { ...base.rangeCoord, gn: { validLastN: 5 }, lg: { validLastN: 5 } } });
    assert.ok(!five.includes("range:validLastN-5"), "the baseline value is not a variant");
    assert.ok(five.includes("range:validLastN-10") && five.includes("range:validLastN-20"));
    const off = ids({ ...base, rangeCoord: { ...base.rangeCoord, gn: { engineSide: false }, lg: { engineSide: false } } });
    assert.ok(!off.includes("range:engineSide-off"), "engine direction acceptance already off");
  });

  it("applies each lever to General and Long only, not to the global options", () => {
    const byId = new Map(rangeLeverVariants(base).map((s) => [s.id, s.opts!]));
    const v = byId.get("range:validLastN-10")!;
    assert.equal(v.rangeCoord?.gn?.validLastN, 10);
    assert.equal(v.rangeCoord?.lg?.validLastN, 10);
    assert.equal(v.validLastN, base.validLastN, "the global seat window is unchanged");
    const l = byId.get("range:lastN-25")!;
    assert.equal(l.rangeCoord?.gn?.lastN, 25);
    assert.equal(l.lastN, base.lastN, "the global execution window is unchanged");
    const m = byId.get("range:minPf-1.12")!;
    assert.equal(m.gates.rangeMinPf?.general, 1.12);
    assert.equal(m.gates.rangeMinPf?.long, 1.12);
    assert.equal(m.gates.rangeMinPf?.micro, base.gates.rangeMinPf?.micro, "Micro's minimum is unchanged");
    const c = byId.get("range:crowd-3")!;
    assert.equal(c.entryCrowd?.gn, 3);
    assert.equal(c.entryCrowd?.lg, 3);
    assert.equal(c.entryCrowd?.mc, base.entryCrowd?.mc, "Micro's crowding cap is unchanged");
  });
});

describe("per-range run summary", () => {
  it("counts closed and open orders per range; a range's PF counts its open orders as if closed", () => {
    const trades = [
      tr("b|ema|gn", 0.03, 0, 2),
      tr("b|rsi|gn", -0.01, 1, 3),
      tr("b|ema|lg", 0.02, 0, 4),
      tr("b|rsi|wide", -0.02, 0, 2),
    ];
    const openAtEnd = [tr("b|ema|gn", 0.04, 5, 0, true), tr("b|ema|gn", -0.02, 6, 0, true)];
    const s = summarizeRun({ trades, openAtEnd }, T0, T0 + 12 * H);
    const gn = s.byRange.gn!;
    assert.equal(gn.n, 2, "closed General orders");
    assert.equal(gn.openN, 2, "open General orders");
    assert.equal(s.byRange.lg!.n, 1);
    assert.equal(s.byRange.lg!.openN, 0);
    assert.equal(s.byRange.wide!.n, 1, "Wide: untagged configs");
    // trade % (r × 100): closed gains 3, losses 1; open marks +4 and −2 added as if closed
    assert.ok(Math.abs(rangePfIncl(gn) - profitFactor(3 + 4, 1 + 2)) < 1e-9);
    // no losing order: the profit factor is the no-loss value of the library
    assert.equal(rangePfIncl(s.byRange.lg!), profitFactor(2, 0));
  });
});
