import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROMOTE, PROMOTE_EVIDENCE_SCHEMA, PROMOTE_GROUPS, PROMOTE_RANGES, promoteDecide, promoteLaneKey,
  promoteLive, promoteGroupOf, promoteRangeOf, validPromotedLaneProof,
} from "./live-promote.ts";
import type { PromoteEvidence, PromoteEvidenceLane, PromoteOpts } from "./live-promote.ts";
import { kindOfId } from "./pipeline/pipeline.ts";
import { liveLaneFilter } from "./server/live.server.ts";

const NOW = 1_800_000_000_000;
const SH = "sweep|trend-adx@m15c|tp6|sl4.5|tr0|h64|sh";
const TO = "sweep|trend-adx@m15c|tp0|sl4.5|tr2|h64|sh|to";
const WIDE = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
const EXIT = "follow|ema-9-21@m15|tp1|sl1|tr0|h32|hxL0";
const SIG = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32";
const AXIS = "pivot|cci-40-200@x4|tp5|sl5|tr0|h24|axis";
const O: PromoteOpts = { lastN: 10, minN: 6, onPf: 1.2, offPf: 1.0 };
const CONTEXT = { referenceId: "cts-ao-reference", proofId: "a".repeat(64), nowT: NOW };
const WIN = Array.from({ length: 10 }, (_, i) => i % 2 ? -0.01 : 0.02);
const LOSE = WIN.map((r) => -r);

function lane(cfg = SH, modelR: number[] = WIN, executionR: number[] = WIN, sym = "A-USDT", side: 1 | -1 = 1): PromoteEvidenceLane {
  const id = { cfg, sym, side };
  const base = (i: number) => ({ ...id, id: `slice-${i}`, entryT: NOW - 800_000 + i * 10_000,
    exitT: NOW - 799_000 + i * 10_000, eligibilityId: "qualified-1" });
  const window = { complete: true as const, fromT: NOW - 1_000_000, toT: NOW, asOf: NOW };
  return { ...id, source: cfg.split("|")[1], group: promoteGroupOf(cfg)!, kind: kindOfId(cfg) as PromoteEvidenceLane["kind"],
    eligibility: { id: "qualified-1", stage: "after-base", passed: true, at: NOW - 2_000_000 },
    model: { ...window, basis: "unit-net-returns", closes: modelR.map((unitR, i) => ({ ...base(i), unitR })) },
    execution: { ...window, basis: "owned-net-returns", executionSource: "verified-venue", closes: executionR.map((netReturn, i) => ({ ...base(i),
      ownedQty: 2, entryNotional: 100, entryFillIds: ["entry-1"], exitFillIds: [`exit-${i}`],
      grossPnl: netReturn * 100 + 0.2, fees: 0.2, funding: 0, netPnl: netReturn * 100, netReturn })) } };
}
function evidence(lanes = [lane()]): PromoteEvidence {
  return { schema: PROMOTE_EVIDENCE_SCHEMA, referenceId: CONTEXT.referenceId, complete: true,
    fromT: NOW - 1_000_000, toT: NOW, asOf: NOW, validUntilT: NOW + 600_000, lanes };
}
const decide = (e: unknown = evidence(), prev: Record<string, boolean> = {}, o = O) => promoteDecide(prev, e, o, CONTEXT);
const off = (e: unknown, prev: Record<string, boolean> = {}) => {
  const d = decide(e, prev);
  assert.equal(d.promotedLanes.length, 0);
  assert.ok(PROMOTE_GROUPS.every((r) => !d.on[r]));
  return d;
};

describe("strict exact-lane reference promotion", () => {
  it("preserves the existing thresholds and recognizes every independent engine range/kind", () => {
    assert.deepEqual(DEFAULT_PROMOTE, { lastN: 30, minN: 20, onPf: 1.2, offPf: 1.0 });
    for (const range of PROMOTE_RANGES) assert.equal(promoteRangeOf(range === "wide" ? WIDE : SH.replace(/\|sh$/, `|${range}`)), range);
    assert.equal(promoteRangeOf(TO), "sh");
    assert.equal(promoteRangeOf(EXIT), null, "Historic Exit is never assigned the Wide range");
    assert.equal(promoteGroupOf(EXIT), "exit");
    assert.equal(promoteRangeOf(SIG), null);
    assert.equal(promoteRangeOf(AXIS), null);
    assert.equal(promoteRangeOf(`${AXIS}|sh`), null);
  });

  it("admits only the matching identity when BOTH measured post-Base and owned-return PFs pass", () => {
    const e = evidence();
    const d = decide({ ...e, unfilteredBasePf: 0.2 });
    assert.equal(d.on.sh, true);
    assert.equal(d.promotedLanes.length, 1);
    const p = d.promotedLanes[0];
    assert.equal(p.modelPf, 2);
    assert.equal(p.executionPf, 2);
    assert.equal(p.modelN, 10);
    assert.equal(p.executionN, 10);
    assert.equal(p.proofId, CONTEXT.proofId);
    assert.equal(p.afterBase, true);
    assert.ok(validPromotedLaneProof(p, NOW));
    assert.equal(d.byIdentity[promoteLaneKey(e.lanes[0])], true);
    off(evidence([lane(SH, LOSE, WIN)]));
    off(evidence([lane(SH, WIN, LOSE)]));
  });

  it("promotes Historic Exit only in its own group and exact-lane allowlist", () => {
    const exit = lane(EXIT);
    const d = decide(evidence([exit]));
    assert.equal(d.on.exit, true);
    assert.ok(PROMOTE_RANGES.every((r) => !d.on[r]));
    assert.deepEqual(d.promotedLanes.map(promoteLaneKey), [promoteLaneKey(exit)]);
    const live = promoteLive({ excludeRanges: [] as string[] }, d);
    assert.deepEqual(live.excludeRanges, [...PROMOTE_RANGES]);
    assert.deepEqual(live.promotedLanes.map(promoteLaneKey), [promoteLaneKey(exit)]);
  });

  it("cannot borrow a winner across protect, range, lane, type, symbol or side aliases", () => {
    const siblings = [
      lane(SH.replace("tp6", "tp7"), LOSE), lane(SH.replace(/\|sh$/, "|mn"), LOSE),
      lane(SH.replace("@m15c", "@m15"), LOSE), lane(SH.replace("@m15c", "@m5c"), LOSE),
      lane(TO, LOSE), lane(SH, LOSE, WIN, "B-USDT"), lane(SH, LOSE, WIN, "A-USDT", -1),
    ];
    const d = decide(evidence([lane(), ...siblings]));
    assert.deepEqual(d.promotedLanes.map(promoteLaneKey), [promoteLaneKey(lane())]);
    for (const s of siblings) assert.equal(d.byIdentity[promoteLaneKey(s)], false);
    assert.equal(d.on.mn, false);
  });

  it("hysteresis belongs to exact identities and cannot migrate from old range ON state", () => {
    const between = WIN.map((r) => r > 0 ? 0.011 : r);
    const e = evidence([lane(SH, between, between)]);
    off(e, { sh: true });
    const key = promoteLaneKey(lane());
    const held = decide(e, { [key]: true });
    assert.equal(held.promotedLanes.length, 1);
    assert.equal(held.promotedLanes[0].minPf, 1);
    assert.equal(held.changed, false);
    assert.equal(off(evidence([lane(SH, WIN, LOSE)]), held.byIdentity).changed, true);
    off(evidence([lane(SH, WIN.slice(0, 5))]), held.byIdentity);
    off(null, held.byIdentity);
  });

  it("nominal legacy rows never qualify even when previous range state was ON", () => {
    const old = WIN.map((r, i) => ({ cfg: SH, r, exitT: NOW - i }));
    off(old, { sh: true });
  });

  it("requires explicit reader SHA/reference binding, complete artifact/tapes and eligibility provenance", () => {
    assert.equal(promoteDecide({ sh: true }, evidence(), O).promotedLanes.length, 0);
    for (const edit of [
      (e: any) => { e.complete = false; },
      (e: any) => { e.schema = "legacy"; },
      (e: any) => { e.referenceId = "other-account"; },
      (e: any) => { e.lanes[0].model.complete = false; },
      (e: any) => { e.lanes[0].execution.complete = false; },
      (e: any) => { e.lanes[0].model.basis = "raw-sized-returns"; },
      (e: any) => { e.lanes[0].execution.basis = "nominal-lane-returns"; },
      (e: any) => { delete e.lanes[0].execution.executionSource; },
      (e: any) => { e.lanes[0].eligibility.stage = "base"; },
      (e: any) => { e.lanes[0].eligibility.passed = false; },
      (e: any) => { e.lanes[0].eligibility.at = NOW + 1; },
      (e: any) => { e.lanes[0].model.closes[0].eligibilityId = "different-qualification"; },
    ]) { const e = evidence(); edit(e); off(e); }
  });

  it("keeps unknown/nonfinite returns in the current chronological window and turns previous ON off", () => {
    for (const value of [null, undefined, NaN, Infinity, -Infinity, "0.01"]) {
      for (const tape of ["model", "execution"] as const) {
        const e = evidence();
        const c = e.lanes[0][tape].closes.at(-1)! as unknown as Record<string, unknown>;
        c[tape === "model" ? "unitR" : "netReturn"] = value;
        off(e, { [promoteLaneKey(lane())]: true });
      }
    }
    const e = evidence([lane(SH, [...Array(10).fill(-0.01), ...WIN])]);
    e.lanes[0].model.closes[0].unitR = null;
    assert.equal(decide(e).promotedLanes.length, 1, "old unknowns outside the declared last-N sample need not veto it");
    e.lanes[0].model.closes.at(-1)!.unitR = null;
    off(e);
  });

  it("requires settled funded slices with recomputable costs/net returns, never accepted/zero orders", () => {
    for (const edit of [
      (c: any) => { c.ownedQty = 0; }, (c: any) => { c.ownedQty = null; },
      (c: any) => { c.entryNotional = 0; }, (c: any) => { c.entryNotional = NaN; },
      (c: any) => { c.entryFillIds = []; }, (c: any) => { c.exitFillIds = []; },
      (c: any) => { c.netPnl += 1; }, (c: any) => { c.grossPnl += 1; },
      (c: any) => { c.fees = -0.2; }, (c: any) => { c.funding = Infinity; },
      (c: any) => { c.netReturn = 0.9; },
      (c: any) => { c.grossPnl = 1e308; c.funding = 1e308; },
    ]) { const e = evidence(); edit(e.lanes[0].execution.closes.at(-1)); off(e); }
    const e = evidence();
    for (const c of e.lanes[0].execution.closes) {
      c.funding = -0.1;
      c.grossPnl += 0.1;
    }
    assert.equal(decide(e).promotedLanes.length, 1, "signed funding is reconciled, not omitted");
  });

  it("keeps current numerical funding dust in the window and rejects it for both owned execution sources", () => {
    for (const source of ["owned-paper", "verified-venue"] as const) for (const notional of [1e-12, 1e-9]) {
      const e = evidence();
      e.lanes[0].execution.executionSource = source;
      const c = e.lanes[0].execution.closes.at(-1)!;
      c.ownedQty = 1e-14;
      c.entryNotional = notional;
      c.fees = 0;
      c.funding = 0;
      c.netPnl = c.netReturn! * notional;
      c.grossPnl = c.netPnl;
      off(e, { [promoteLaneKey(lane())]: true });
    }
  });

  it("scores canonical owned net returns and never turns a reconciled zero/loss into a declared tiny gain", () => {
    for (const actualNet of [0, -5e-11]) {
      const e = evidence();
      for (const c of e.lanes[0].execution.closes) {
        c.grossPnl = 0.2 + actualNet;
        c.fees = 0.2;
        c.funding = 0;
        c.netPnl = actualNet;
        c.netReturn = 5e-11;
      }
      off(e, { [promoteLaneKey(lane())]: true });
    }
    const e = evidence();
    const c = e.lanes[0].execution.closes[0];
    c.netReturn! += 5e-11;
    const p = decide(e).promotedLanes[0];
    assert.equal(p.executionCloses[0].unitR, 0.02);
    assert.equal(p.executionPf, 2, "PF uses cost-derived returns instead of tolerance-adjusted declared values");
  });

  it("rejects a changed identity anywhere in either evidence tape", () => {
    for (const tape of ["model", "execution"] as const) for (const [key, value] of [["cfg", TO], ["sym", "B-USDT"], ["side", -1]]) {
      const e = evidence();
      (e.lanes[0][tape].closes[0] as unknown as Record<string, unknown>)[key as string] = value;
      off(e);
    }
    for (const [key, value] of [["group", "mn"], ["kind", "trailing-only"], ["source", "trend-adx@m5"]]) {
      const e = evidence();
      (e.lanes[0] as unknown as Record<string, unknown>)[key] = value;
      off(e);
    }
    const legacyRangeLane = evidence();
    (legacyRangeLane.lanes[0] as unknown as Record<string, unknown>).range = "sh";
    off(legacyRangeLane);
    const historicWithRange = evidence([lane(`${EXIT}|sh`)]);
    off(historicWithRange);
  });

  it("rejects expired/future/mismatched windows, out-of-window closes and pre-qualification entries", () => {
    for (const edit of [
      (e: any) => { e.validUntilT = NOW - 1; }, (e: any) => { delete e.validUntilT; },
      (e: any) => { e.asOf = NOW + 1; e.toT = NOW + 1; },
      (e: any) => { e.asOf--; }, (e: any) => { e.fromT = e.toT; },
      (e: any) => { e.lanes[0].model.toT--; },
      (e: any) => { e.lanes[0].execution.closes[0].exitT = NOW + 1; },
      (e: any) => { e.lanes[0].execution.closes[0].exitT = e.fromT - 1; },
      (e: any) => { e.lanes[0].model.closes[0].entryT = e.lanes[0].eligibility.at - 1; },
    ]) { const e = evidence(); edit(e); off(e); }
    const p = decide().promotedLanes[0];
    assert.ok(validPromotedLaneProof(p, p.validUntilT));
    assert.equal(validPromotedLaneProof(p, p.validUntilT + 1), false);
    assert.equal(validPromotedLaneProof(p, p.asOf - 1), false);
  });

  it("cannot duplicate a passing identity or close to reach minimum samples", () => {
    off(evidence([lane(), lane()]));
    for (const tape of ["model", "execution"] as const) {
      const e = evidence(); e.lanes[0][tape].closes[1].id = e.lanes[0][tape].closes[0].id; off(e);
    }
    const clonedFill = evidence();
    clonedFill.lanes[0].execution.closes[1].exitFillIds = clonedFill.lanes[0].execution.closes[0].exitFillIds;
    off(clonedFill, { [promoteLaneKey(lane())]: true });
    off(evidence([lane(SH, [], [])]));
    off(evidence([lane(SH, Array(10).fill(0), Array(10).fill(0))]));
  });

  it("retains exact owned execution returns so a current last-N cannot inherit a larger passing PF", () => {
    const rs = [...Array(5).fill(0.1), ...Array(25).fill(-0.01)];
    const d = decide(evidence([lane(SH, [...WIN, ...WIN, ...WIN], rs)]), {}, { ...O, lastN: 30, minN: 20 });
    const p = d.promotedLanes[0];
    assert.equal(p.executionN, 30);
    assert.ok(Math.abs(p.executionPf - 2) < 1e-12);
    assert.equal(p.executionCloses.length, 30);
    assert.ok(p.executionCloses.slice(-25).every((c) => c.unitR === -0.01));
    assert.ok(validPromotedLaneProof(p, NOW));
  });

  it("labels no-loss scores and keeps exact windows deterministic under input order", () => {
    const e = evidence([lane(SH, Array(10).fill(0.01), Array(10).fill(0.01))]);
    const d = decide(e);
    assert.equal(d.promotedLanes[0].modelNoLoss, true);
    assert.equal(d.promotedLanes[0].executionNoLoss, true);
    assert.match(d.lines[0], /no-loss score/);
    e.lanes[0].model.closes.reverse(); e.lanes[0].execution.closes.reverse();
    assert.deepEqual(decide(e), d);
  });

  it("keeps modeled owned-paper execution distinct from verified venue execution", () => {
    const e = evidence();
    e.lanes[0].execution.executionSource = "owned-paper";
    const d = decide(e);
    assert.equal(d.promotedLanes[0].executionSource, "owned-paper");
    assert.match(d.lines[0], /owned paper execution PF/);
    assert.doesNotMatch(d.lines[0], /owned venue/);
  });

  it("rejects malformed embedded proofs and invalid thresholds", () => {
    const p = decide().promotedLanes[0];
    for (const change of [{ proofId: "fake" }, { minN: 0 }, { modelN: 5 }, { modelPf: NaN }, { executionPf: 0.2 },
      { executionBasis: "paper" }, { executionSource: "nominal" }, { afterBase: false }, { side: 0 }, { cfg: SIG },
      { executionCloses: [] }, { executionN: 9 }, { executionPf: 3 }, { executionNoLoss: true }, { modelNoLoss: true }]) {
      assert.equal(validPromotedLaneProof({ ...p, ...change }, NOW), false);
    }
    for (const edit of [
      (xs: any[]) => { xs[1].id = xs[0].id; },
      (xs: any[]) => { xs[0].exitT = NOW + 1; },
      (xs: any[]) => { xs[0].exitT = NOW - 1_000_001; },
      (xs: any[]) => { xs[0].unitR = NaN; },
      (xs: any[]) => { xs[0].unitR = 0.5; },
      (xs: any[]) => { xs.reverse(); },
    ]) {
      const changed = structuredClone(p);
      edit(changed.executionCloses);
      assert.equal(validPromotedLaneProof(changed, NOW), false);
    }
    for (const change of [{ lastN: 0 }, { minN: 11 }, { minN: 1.5 }, { onPf: NaN }, { offPf: 2 }]) {
      assert.throws(() => decide(evidence(), {}, { ...O, ...change }), /Invalid promotion thresholds/);
    }
  });

  it("always emits the exact allowlist and preserves explicitly selected trailing-only kinds", () => {
    const d = decide(evidence([lane(TO)]));
    const live = promoteLive({ source: "signals", kinds: ["trailing-only"], ratio: 3 }, d);
    assert.equal(live.source, "all");
    assert.deepEqual(live.kinds, ["trailing-only"]);
    assert.equal(live.ratio, 3);
    assert.deepEqual(live.promotedLanes.map(promoteLaneKey), [promoteLaneKey(lane(TO))]);
    assert.equal(promoteLive({}, d).kinds, undefined);
    assert.deepEqual(promoteLive({ kinds: [] }, d).kinds, []);
    const blocked = promoteLive(live, off(null));
    assert.deepEqual(blocked.promotedLanes, []);
    assert.deepEqual(blocked.excludeRanges, [...PROMOTE_RANGES]);
    assert.deepEqual(blocked.kinds, ["trailing-only"]);
  });

  it("the signal proof is the operator's: promoteLive never sets it, and signals are sendable while it is off", () => {
    const on = { mc: false, mn: false, mp: false, sh: true, gn: false, lg: false, wide: false, exit: false };
    const dec = { on, promotedLanes: decide(evidence([lane(SH)])).promotedLanes };
    const live = promoteLive({ source: "signals" }, dec);
    for (const k of ["signalProofN", "signalProofPf", "signalProofEvents"]) assert.ok(!(k in live), `${k} is never set`);
    // the operator's own signal proof passes through as it is
    const kept = promoteLive({ source: "signals", signalProofN: 30, signalProofPf: 1.5, signalProofEvents: 4 }, dec);
    assert.deepEqual([kept.signalProofN, kept.signalProofPf, kept.signalProofEvents], [30, 1.5, 4]);
    // off (no proven units): the promoted desk sends signals of either side, as before
    const off = liveLaneFilter({ ...live, promotedLanes: undefined } as never, null, null, null, null).sendable;
    assert.deepEqual([off({ cfg: SIG, vol: 1, side: 1 }), off({ cfg: SIG, vol: 1, side: -1 })], [true, true]);
    // on: only a proven unit's side; the promoted engine range is not judged by it
    const g = liveLaneFilter({ ...live, promotedLanes: undefined } as never, null, null, null, new Set(["sig-ema-cross-s@m15|-1"])).sendable;
    assert.deepEqual(
      [g({ cfg: SIG, vol: 1, side: 1 }), g({ cfg: SIG, vol: 1, side: -1 }), g({ cfg: SH, vol: 1, side: 1 })],
      [false, true, true],
    );
  });
});
