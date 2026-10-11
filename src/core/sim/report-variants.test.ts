// Session report variants: the variant list against a baseline, the run summary / fingerprints, and the live sizing
// replay on a few synthetic positions (no tapes, no engine run).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import {
  effectOf,
  sizingReplay,
  sizingVariants,
  summarizeRun,
  walkForwardVariants,
  type ReplayPosition,
  type SizingSpec,
} from "./report-variants.ts";

const H = 3_600_000;
const T0 = 1_000 * H;
const tr = (cfg: string, sym: string, side: 1 | -1, eH: number, xH: number, r: number, vol = 1): Trade => ({
  cfg,
  sym,
  side,
  entryT: T0 + eH * H,
  exitT: T0 + xH * H,
  entry: 1,
  exit: 1,
  r,
  reason: "tp",
  bars: 1,
  mfe: 0,
  mae: 0,
  kind: "normal",
  vol,
});

describe("walk-forward variants", () => {
  const base = { ...defaultWalkForward(DEFAULT_SETTINGS), protects: [], dcaProtects: [] };
  const kinds = { normal: 10, trailing: 10, dca: 0, "dca-active": 0, axis: 4 };

  it("flips every toggle once and marks the ones without tapes as recompute", () => {
    const vs = walkForwardVariants(
      { ...base, toggles: { ...base.toggles, dca: false, axis: false } },
      { kinds, signalTapes: 0, tactics: { session: false, volRegime: true, trendStrength: true, cooldown: false } },
    );
    // the strategy toggles (the range-off and crowding rows share the group: ids with a hyphen)
    const types = vs.filter((v) => /^type:[A-Za-z]+$/.test(v.id));
    assert.equal(types.length, 7);
    assert.equal(vs.find((v) => v.id === "type:dca")!.status, "recompute");
    assert.equal(vs.find((v) => v.id === "type:axis")!.status, "run");
    assert.equal(vs.find((v) => v.id === "type:axis")!.opts!.toggles.axis, true);
    // no signal tapes: signals on needs a recompute, confirmation has nothing to act on
    assert.equal(vs.find((v) => v.id === "sig:signals")!.status, "recompute");
    assert.equal(vs.find((v) => v.id === "sig:confirm")!.status, "na");
    // tactics are listed, never run
    assert.ok(vs.filter((v) => v.group === "tactics").every((v) => v.status === "recompute" && !v.opts));
    // no variant equals the baseline value it flips
    assert.ok(!vs.some((v) => v.id === `gate:symGate-${base.symGate}`));
    assert.ok(!vs.some((v) => v.id === `gate:lastN-${base.lastN}`));
    // the gate rows cover every gate the stages apply, the sample warm-up and the last-N floor among them
    for (const id of ["gate:warmup", "gate:lastNFloor-0", "gate:rangeGate-off", "gate:sideGateN"])
      assert.equal(vs.find((v) => v.id === id)?.status, "run", id);
    const runs = vs.filter((v) => v.status === "run").length;
    // bounded: every run costs one walk-forward (~10 s at 24 h × 30 symbols). The last-N windows are dense on purpose
    // (operator, 5 Oct: "test completely with multiple different last-N windows"); the range-off and crowding rows
    // (6 Oct) take the list past 80
    assert.ok(runs >= 35 && runs <= 110, `${runs} runs`);
    // every row is its own variant: no id is listed twice
    const ids = vs.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("signals off empties the active set and drops the ranking", () => {
    const vs = walkForwardVariants(
      { ...base, signalActive: new Set(["b|sig-x|A"]) },
      { kinds, signalTapes: 3 },
    );
    const off = vs.find((v) => v.id === "sig:signals")!;
    assert.equal(off.label, "Signals off");
    assert.equal(off.opts!.signalActive!.size, 0);
    assert.equal(off.opts!.signalRank, undefined);
    assert.equal(vs.find((v) => v.id === "sig:confirm")!.status, "run");
  });

  it("engine direction acceptance (on by default): the off row and each parameter around the as-run one", () => {
    const vs = walkForwardVariants(base, { kinds, signalTapes: 0 });
    const off = vs.find((v) => v.id === "sig:engineSide")!;
    assert.equal(off.label, "Engine direction acceptance off");
    assert.equal(off.opts!.engineSideAccept!.enabled, false);
    const alts = vs.filter((v) => v.id.startsWith("sig:engineSide-"));
    // per indication: Micro alone and every range (pooled is the as-run value here)
    assert.deepEqual(
      vs.filter((v) => v.id.startsWith("sig:engineSidePerInd-")).map((v) => v.opts!.engineSideAccept!.perInd),
      [["mc"], ["mc", "mn", "mp", "sh", "gn", "lg", "wide"]],
    );
    // windows 3 / 12 / 48 h, PF 1.2 / 1.3, 10 / 60 closes
    assert.equal(alts.length, 7, alts.map((v) => v.label).join(", "));
    assert.ok(alts.every((v) => v.status === "run" && v.opts!.engineSideAccept!.enabled));
    assert.deepEqual(alts.map((v) => v.opts!.engineSideAccept!.hours).sort((a, b) => a - b), [3, 12, 24, 24, 24, 24, 48]);
  });

  it("each range off once (a range already excluded is not listed): no new entry from it, the tapes unchanged", () => {
    const vs = walkForwardVariants({ ...base, excludeRanges: ["mp"] }, { kinds, signalTapes: 0 });
    const rows = vs.filter((v) => v.id.startsWith("type:range-off-"));
    assert.deepEqual(rows.map((v) => v.id), [
      "type:range-off-mc",
      "type:range-off-mn",
      "type:range-off-sh",
      "type:range-off-gn",
      "type:range-off-lg",
    ]);
    assert.deepEqual(rows[0].opts!.excludeRanges, ["mp", "mc"]);
    assert.ok(rows.every((v) => v.status === "run" && v.group === "types"));
  });

  it("Block off on one range at a time, never on a range the desk already excludes", () => {
    const b = { ...base, toggles: { ...base.toggles, block: true }, block: { ...base.block, excludeRanges: ["gn", "lg"] } };
    const vs = walkForwardVariants(b, { kinds, signalTapes: 0 });
    const rows = vs.filter((v) => v.id.startsWith("block:off-"));
    assert.deepEqual(rows.map((v) => v.id), ["block:off-mc", "block:off-mn", "block:off-sh"]);
    assert.deepEqual(rows[0].opts!.block.excludeRanges, ["gn", "lg", "mc"]);
  });

  it("measures the active signal ranking: count and rank, never the as-run value", async () => {
    const { signalSettings } = await import("../signal-config.ts");
    const sr = signalSettings({ enabled: true });
    const vs = walkForwardVariants({ ...base, signalRank: sr }, { kinds, signalTapes: 3 });
    const counts = vs.filter((v) => v.id.startsWith("sig:count-"));
    assert.deepEqual(
      counts.map((v) => v.opts!.signalRank!.count),
      [0, 100, 200].filter((c) => c !== sr.count),
    );
    assert.ok(counts.every((v) => v.status === "run"));
    const ranks = vs.filter((v) => v.id.startsWith("sig:rank-"));
    assert.equal(ranks.length, 2);
    assert.ok(!ranks.some((v) => v.opts!.signalRank!.rank === sr.rank));
    // everything else of the ranking stays as run
    assert.equal(ranks[0].opts!.signalRank!.count, sr.count);
    // no ranking (signals off or a fixed active set): nothing to vary
    const none = walkForwardVariants(base, { kinds, signalTapes: 3 });
    assert.ok(none.filter((v) => /^sig:(count|rank)-/.test(v.id)).every((v) => v.status === "na" && !v.opts));
  });
});

describe("run summary", () => {
  const trades = [tr("b|ema|wide", "A", 1, 0, 0.5, 0.01), tr("b|ema|wide", "B", -1, 0.5, 1.5, -0.005)];
  it("hourly buckets, sides, drawdown and the effect against a baseline", () => {
    const s = summarizeRun({ trades, openAtEnd: [], skips: { dupe: 2, "": 1 } }, T0, T0 + 3 * H);
    assert.equal(s.orders, 2);
    assert.deepEqual(s.hourN, [1, 1, 0]);
    assert.ok(Math.abs(s.net - 0.5) < 1e-9);
    assert.ok(Math.abs(s.mdd - 0.5) < 1e-9);
    assert.equal(s.longs.n, 1);
    assert.equal(s.shorts.n, 1);
    assert.equal(s.byType.Normal.n, 2);
    assert.deepEqual(s.skips, [["dupe", 2]]);
    // the same orders in another order: no effect; another volume: volume only; another order: orders
    const same = summarizeRun({ trades: [...trades].reverse() }, T0, T0 + 3 * H);
    assert.equal(effectOf(same, s), "none");
    const vol = summarizeRun({ trades: [trades[0], { ...trades[1], r: -0.01, vol: 2 }] }, T0, T0 + 3 * H);
    assert.equal(effectOf(vol, s), "volume");
    const fewer = summarizeRun({ trades: [trades[0]] }, T0, T0 + 3 * H);
    assert.equal(effectOf(fewer, s), "orders");
  });
});

describe("live sizing replay", () => {
  const ref: SizingSpec = {
    id: "ref",
    label: "ref",
    unitUsd: 2,
    minUsd: 2,
    ratio: 1,
    maxPositionX: 0.25,
    maxNotionalUsd: Infinity,
    maxExposureX: 7,
    maxRiskPct: 0.35,
    maxBackstopLossPct: 0.5,
    top: "fill",
    rebalancePct: 0.25,
    maxPositions: 12,
    minStopPct: 0.01,
  };
  const pos: ReplayPosition[] = [
    { cfg: "b|ema|wide", sym: "A", side: 1, entryT: T0, exitT: T0 + 2 * H, vol: 1, sl: 0.02 },
    { cfg: "b|rsi|wide", sym: "A", side: 1, entryT: T0 + H, exitT: T0 + 3 * H, vol: 3, sl: 0.02 },
    { cfg: "b|rsi|wide", sym: "B", side: -1, entryT: T0, exitT: Infinity, vol: 1, sl: 0.03 },
  ];
  const samples = [0, 1, 2, 3].map((h) => ({ t: T0 + h * H, eq: 20 }));
  const score = (c: string) => (c.includes("ema") ? 2 : 1);

  it("caps a position at the equity multiple and counts the exchange orders", () => {
    const r = sizingReplay(pos, samples, ref, score, T0);
    assert.equal(r.samples, 4);
    assert.equal(r.hours.length, 4);
    // hour 0: A long (1 unit = $2) and B short ($2): two opens
    assert.equal(r.hours[0].opens, 2);
    // hour 1: A long asks 4 units = $8 > the 0.25 × $20 = $5 cap → capped at $5, one increase
    assert.equal(r.hours[1].capped, 1);
    assert.equal(r.hours[1].increases, 1);
    assert.equal(r.summary.sizeMax, 5);
    // hour 2: A long back to 3 units = $6 → still capped at $5: no order; hour 3: A closes
    assert.equal(r.hours[2].increases + r.hours[2].reduces, 0);
    assert.equal(r.hours[3].closes, 1);
    assert.equal(r.summary.orders, 4);
  });

  it("a higher cap lets the volume factor size up; a rebalance threshold suppresses small resizes", () => {
    const loose = sizingReplay(pos, samples, { ...ref, maxPositionX: 1, ratio: 2 }, score, T0);
    assert.equal(loose.summary.sizeMax, 16);
    assert.equal(loose.summary.cappedAvg, 0);
    const moves: ReplayPosition[] = [
      { cfg: "c|x|wide", sym: "A", side: 1, entryT: T0, exitT: Infinity, vol: 10, sl: 0.01 },
      { cfg: "c|y|wide", sym: "A", side: 1, entryT: T0 + H, exitT: Infinity, vol: 1, sl: 0.01 },
    ];
    const wide = { ...ref, maxPositionX: 0, maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0 };
    const r25 = sizingReplay(moves, samples, wide, score, T0);
    const r0 = sizingReplay(moves, samples, { ...wide, rebalancePct: 0 }, score, T0);
    // $20 → $22 is a 9 % change: below 25 % no order, at 0 an increase
    assert.equal(r25.summary.increases, 0);
    assert.equal(r0.summary.increases, 1);
    assert.notEqual(r25.fp, sizingReplay(moves, samples, { ...wide, ratio: 2 }, score, T0).fp);
    // the rebalance threshold changes the orders, not the targets: a different fingerprint all the same
    assert.notEqual(r25.fp, r0.fp);
  });

  it("variants around a reference leave out the ones equal to it", () => {
    const vs = sizingVariants(ref);
    assert.equal(vs[0].id, "ref");
    assert.ok(!vs.some((v) => v.id === "rebal25" || v.id === "exp7" || v.id === "cap025" || v.id === "vf1"));
    assert.ok(vs.some((v) => v.id === "rebal0") && vs.some((v) => v.id === "vf5") && vs.some((v) => v.id === "topAll"));
    // the x01 volume factor asked for on 10 Oct (1 → 1.5): a sizing-replay variant, read from a saved dump with --replay
    assert.ok(vs.some((v) => v.id === "vf15" && v.ratio === 1.5));
  });
});
