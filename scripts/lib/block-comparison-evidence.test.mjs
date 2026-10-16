import { it } from "node:test";
import assert from "node:assert/strict";
import {
  blockBookRisk,
  blockComparisonEvidence,
  compareBlockEvidence,
} from "./block-comparison-evidence.mjs";
import { orderKey } from "../../src/core/sizing.ts";

const H = 3_600_000,
  startT = 10 * H,
  endT = 16 * H;
const meta = {
  fold: "development1",
  arm: "cap2",
  protocolSha256: "a".repeat(64),
  sourceSha256: "b".repeat(64),
};
const cfg = (ind = "sig-ema-cross-s@m5", suffix = "") => `follow|${ind}|tp1|sl2|tr0|h60${suffix}`;
const trade = (r, extra = {}) => ({
  cfg: cfg(),
  sym: "BTC-USDT",
  side: 1,
  entryT: startT + 1,
  exitT: startT + 2,
  r,
  mult: 1,
  vol: 1,
  kind: "normal",
  reason: r < 0 ? "sl" : "tp",
  ...extra,
});
function fixture(trades = [], units = trades.map(() => 1)) {
  const raw = {
    window: { startT, endT },
    symbols: ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT"],
    settings: { cost: 0.002, block: { maxMult: 2 }, toggles: { block: true } },
    trades,
    openEnd: [],
    engine: { coverage: { complete: false }, mem: { computeLevel: 0 }, skips: {} },
    frozenBlockComparison: {
      fold: meta.fold,
      arm: { id: meta.arm },
      protocolSha256: meta.protocolSha256,
      sourceSha256: meta.sourceSha256,
      builtCatalog: [],
    },
    signalProgress: { configs: [] },
  };
  const book = {
    window: { startT, endT },
    sizedOrders: trades.map((x, closeIndex) => ({
      closeIndex,
      key: orderKey(x),
      cfg: x.cfg,
      sym: x.sym,
      side: x.side,
      entryT: x.entryT,
      exitT: x.exitT,
      unitNotional: units[closeIndex],
      volume: x.vol ?? 1,
      allocatedNotional: units[closeIndex] * (x.vol ?? 1),
      sizedReturn: x.r,
      sizedPnl: x.r * units[closeIndex],
    })),
    total: {
      orders: trades.length,
      net: -999,
      balanceEnd: 1,
      equityEnd: 0,
      equityMaxDd: 999,
      equityMaxDdPct: 0.999,
      equityDdtMaxH: 6,
    },
    checks: [{ name: "strategy activity", ok: false }],
    hours: [],
  };
  return { raw, book };
}
const reduce = (f, options = meta) => blockComparisonEvidence(f.raw, f.book, options);

it("uses the same positive-owned settled cohort for strict unit PF and cash, retaining zero allocations separately", () => {
  const f = fixture(
    [
      trade(0.02, { mult: 2, vol: 6, legs: { axis: 1 } }),
      trade(-0.01, { side: -1, entryT: startT + 3, exitT: startT + 4 }),
      trade(-0.5, { cfg: cfg("sig-ema-cross-m@m5"), entryT: startT + 5, exitT: startT + 6 }),
    ],
    [10, 1, 0],
  );
  const before = JSON.stringify(f),
    r = reduce(f);
  assert.equal(JSON.stringify(f), before, "reduction must not mutate native inputs");
  assert.equal(r.total.n, 2);
  assert.equal(r.total.ownedCloses, 2);
  assert.equal(r.total.zeroAllocations, 1);
  assert.equal(r.total.pf, 1);
  assert.equal(r.total.exactPf, 1);
  assert.equal(r.total.noLoss, false);
  assert.equal(r.total.cashPfDiagnostic, 20);
  assert.equal(r.total.cashGp, 0.2);
  assert.equal(r.total.cashGl, 0.01);
  assert.equal(r.total.maxActualMult, 2);
  assert.equal(r.total.maxActualVolume, 6);
  assert.equal(r.virtual.n, 3);
  assert.equal(r.slices[2].allocation, "zero");
  assert.equal(r.byRange.find((x) => x.key === "signal:short").funded.pf, 1);
  assert.equal(r.byRange.find((x) => x.key === "signal:medium").funded.n, 0);
  assert.equal(r.slices[0].blockLegs.axis, 1);
  assert.equal(
    r.book.nativeNet,
    -999,
    "native account diagnostic cannot replace slice reconciliation",
  );
  assert.equal(r.book.failedChecks.length, 1);
});

it("retains unknown return provenance in its own exact type, direction, config and hourly samples", () => {
  const f = fixture([trade(0.02), trade(-0.01, { mult: undefined, side: -1, exitT: startT + H })]);
  const r = reduce(f);
  assert.equal(r.total.n, 2);
  assert.equal(r.total.unknownReturns, 1);
  assert.equal(r.total.pf, null);
  assert.equal(r.total.unitDrawdownPctPoints, null);
  assert.equal(r.total.unitDdtH, null);
  assert.equal(
    r.total.cashPfDiagnostic,
    2,
    "known cash is still a same-cohort diagnostic, never a replacement PF",
  );
  assert.equal(r.hourly[0].funded.unknownReturns, 1);
  assert.equal(
    r.hourly[1].funded.n,
    0,
    "right-closed exact hourly boundary belongs to the earlier hour",
  );
  assert.equal(r.bySide.find((x) => x.key === -1).funded.pf, null);
  assert.equal(
    r.byIdentity.find((x) => x.side === -1 && x.cfg === cfg() && x.sym === "BTC-USDT").funded
      .unknownReturns,
    1,
  );
  f.raw.trades[1].unitR = -0.01;
  assert.equal(
    reduce(f).total.pf,
    2,
    "explicit persisted unit return is valid without an external multiplier",
  );
  f.raw.trades[1].unitR = null;
  f.raw.trades[1].mult = 1;
  assert.equal(reduce(f).total.pf, null, "explicit unknown cannot be repaired using a multiplier");
});

it("retains missing, mismatched and duplicate allocation slices rather than replacing them with older winning evidence", () => {
  const f = fixture([trade(0.03), trade(-0.02, { entryT: startT + 3, exitT: startT + 4 })]);
  f.book.sizedOrders.pop();
  let r = reduce(f);
  assert.equal(r.total.n, 2);
  assert.equal(r.total.unknownAllocations, 1);
  assert.equal(r.total.pf, null);
  assert.equal(r.total.cashPfDiagnostic, null);
  assert.equal(r.slices[1].allocationReason, "missing-close-allocation");
  const g = fixture(f.raw.trades);
  g.book.sizedOrders[1].sym = "ETH-USDT";
  r = reduce(g);
  assert.equal(r.slices[1].allocationReason, "close-identity-mismatch");
  g.book.sizedOrders[1].sym = "BTC-USDT";
  g.book.sizedOrders.push({ ...g.book.sizedOrders[1] });
  r = reduce(g);
  assert.equal(r.total.unknownAllocations, 1);
  assert.equal(r.slices[1].allocationReason, "duplicate-close-index");
  const h = fixture(f.raw.trades);
  h.book.sizedOrders[1].volume = 2;
  r = reduce(h);
  assert.equal(r.total.unknownAllocations, 1);
});

it("preserves partial close slices and makes unreconciled cash unknown without deleting known owned returns", () => {
  const f = fixture([trade(0.01), trade(-0.02, { exitT: startT + 3 })], [10, 10]);
  let r = reduce(f);
  assert.equal(r.total.n, 2);
  assert.equal(r.total.uniqueEntryOrders, 1);
  assert.equal(r.total.pf, 0.5);
  assert.equal(r.total.cashPfDiagnostic, 0.5);
  assert.equal(r.total.unitDrawdownPctPoints, 2);
  assert.equal(r.total.unitDdtH, (endT - (startT + 2)) / H);
  f.book.sizedOrders[1].sizedPnl = 0.1;
  r = reduce(f);
  assert.equal(r.total.n, 2);
  assert.equal(r.total.pf, 0.5);
  assert.equal(r.total.ownedCloses, 2);
  assert.equal(r.total.unknownSizedPnl, 1);
  assert.equal(r.total.cashPfDiagnostic, null);
  assert.equal(r.total.cashNet, null);
});

it("seeds empty built and requested Signal identities on all symbols and both sides without manufacturing PF passes", () => {
  const f = fixture();
  f.raw.frozenBlockComparison.builtCatalog = [
    { id: cfg(), kind: "normal" },
    { id: cfg("ema-9-21@m15c", "|sh|axis"), kind: "axis" },
  ];
  f.raw.signalProgress.configs = [{ id: cfg("sig-ema-cross-m@m15"), kind: "normal", built: false }];
  const r = reduce(f);
  assert.equal(r.byIdentity.length, 3 * 4 * 2);
  assert.equal(r.byConfig.length, 3);
  assert.equal(r.bySymbol.length, 4);
  assert.equal(r.bySide.length, 2);
  assert.equal(r.byType.length, 6);
  assert.equal(r.hourly.length, 6);
  assert.ok(
    r.byIdentity.every(
      (x) => x.virtual.n === 0 && x.funded.pf === null && x.funded.noLoss === null,
    ),
  );
  assert.equal(r.byConfig.find((x) => x.cfg === cfg("sig-ema-cross-m@m15")).built, false);
  assert.ok(r.byLane.some((x) => x.key === "15c"));
  assert.ok(r.byRange.some((x) => x.key === "engine:sh"));
  assert.ok(r.byRange.some((x) => x.key === "signal:medium"));
});

it("keeps empty, flat, no-loss sentinel and exact measured PF 4 distinct, and excludes endpoint marks", () => {
  assert.equal(reduce(fixture()).total.pf, null);
  const win = fixture([trade(0.04)]),
    r = reduce(win);
  assert.equal(r.total.pf, 4);
  assert.equal(r.total.noLoss, true);
  assert.equal(r.total.exactPf, null);
  assert.equal(r.total.pfConvention, "no-loss-sentinel");
  assert.equal(r.total.cashPfDiagnostic, null);
  const ratio = reduce(fixture([trade(0.04), trade(-0.01, { exitT: startT + 3 })]));
  assert.equal(ratio.total.pf, 4);
  assert.equal(ratio.total.noLoss, false);
  assert.equal(ratio.total.exactPf, 4);
  const flat = reduce(fixture([trade(0)]));
  assert.equal(flat.total.pf, 0);
  assert.equal(flat.total.noLoss, false);
  assert.equal(flat.total.flat, 1);
  win.raw.openEnd = [{ ...trade(-1), mtmR: -1 }];
  win.book.sizedOpenOrders = [{ sizedPnl: -999 }];
  assert.equal(reduce(win).total.pf, 4);
  assert.equal(reduce(win).endpoints.planned.length, 1);
  win.raw.trades[0].markedOpen = true;
  assert.throws(() => reduce(win), /Endpoint/);
});

it("uses only unique exact positive-owned common slices and preserves full-arm losses, zeros and unknowns", () => {
  const common = trade(0.02),
    loss = trade(-0.1, { entryT: startT + 3, exitT: startT + 4 });
  const f = fixture([common, loss, trade(-0.2, { sym: "ETH-USDT" })], [1, 1, 0]);
  const first = reduce(f);
  const g = fixture([{ ...common, r: 0.01 }, trade(0.5, { sym: "SOL-USDT" })]);
  g.raw.frozenBlockComparison.arm.id = "off";
  g.book.sizedOrders.pop();
  const second = reduce(g, { ...meta, arm: "off" });
  const cmp = compareBlockEvidence([first, second]).folds[0];
  assert.equal(cmp.commonOwnedSliceCount, 1);
  assert.equal(cmp.arms[0].wholeArm.pf, 0.02 / 0.1);
  assert.equal(cmp.arms[0].common.noLoss, true);
  assert.equal(cmp.arms[1].wholeArm.pf, null);
  assert.equal(cmp.arms[1].unknownOwnershipOutsideIntersection, 1);
  assert.equal(cmp.arms[0].positiveOwnedSlicesOutsideIntersection, 1);
  const d = fixture([common, { ...common }]);
  d.raw.frozenBlockComparison.arm.id = "off";
  const duplicate = reduce(d, { ...meta, arm: "off" });
  const ambiguous = compareBlockEvidence([first, duplicate]).folds[0];
  assert.equal(ambiguous.commonOwnedSliceCount, 0);
  assert.equal(ambiguous.arms[1].ambiguousSlicesExcluded, 2);
  assert.equal(ambiguous.arms[1].wholeArm.n, 2);
});

it("retains unknown unit evidence inside the common owned intersection and rejects cash sign changes below a tolerance", () => {
  const f = fixture([trade(0.02), trade(-0.01, { exitT: startT + 3, mult: undefined })]);
  const a = reduce(f);
  const g = fixture([trade(0.02), trade(-0.01, { exitT: startT + 3 })]);
  g.raw.frozenBlockComparison.arm.id = "off";
  const b = reduce(g, { ...meta, arm: "off" });
  const cmp = compareBlockEvidence([a, b]).folds[0];
  assert.equal(cmp.commonOwnedSliceCount, 2);
  assert.equal(cmp.arms[0].common.unknownReturns, 1);
  assert.equal(cmp.arms[0].common.pf, null);
  assert.equal(cmp.arms[1].common.pf, 2);
  const dust = fixture([trade(-1e-14)]);
  dust.book.sizedOrders[0].sizedPnl = 1e-14;
  const r = reduce(dust);
  assert.equal(r.total.pf, 0);
  assert.equal(r.total.unknownSizedPnl, 1);
  assert.equal(r.total.cashPfDiagnostic, null);
});

it("rejects relabeled windows, source, costs and duplicate arms before comparing results", () => {
  const f = fixture([trade(-0.01)]);
  const unsealed = fixture();
  delete unsealed.raw.frozenBlockComparison;
  assert.throws(() => reduce(unsealed), /provenance header/);
  assert.throws(() => reduce(f, { ...meta, protocolSha256: "c".repeat(64) }), /provenance/);
  f.book.window.endT++;
  assert.throws(() => reduce(f), /windows/);
  const a = reduce(fixture([trade(0.01)]));
  assert.throws(() => compareBlockEvidence([a, a]), /duplicate/);
  const b = { ...a, arm: "off", sourceSha256: "c".repeat(64) };
  assert.throws(() => compareBlockEvidence([a, b]), /provenance/);
  b.sourceSha256 = a.sourceSha256;
  b.settings = { ...a.settings, cost: 0.001 };
  assert.throws(() => compareBlockEvidence([a, b]), /costs/);
});

it("retains exact indication/symbol/direction relations without letting a winning sibling qualify an empty or losing identity", () => {
  const other = cfg("sig-ema-cross-s@m5", "|axis");
  const f = fixture([trade(0.02), trade(-0.03, { cfg: other, kind: "axis", side: -1 })]);
  f.raw.frozenBlockComparison.builtCatalog = [
    { id: cfg(), kind: "normal" },
    { id: other, kind: "axis" },
  ];
  const r = reduce(f);
  const long = r.byRelation.find(
    (x) => x.indication === "sig-ema-cross-s@m5" && x.sym === "BTC-USDT" && x.side === 1,
  );
  const short = r.byRelation.find(
    (x) => x.indication === long.indication && x.sym === long.sym && x.side === -1,
  );
  const empty = r.byRelation.find(
    (x) => x.indication === long.indication && x.sym === "ETH-USDT" && x.side === 1,
  );
  assert.equal(long.funded.noLoss, true);
  assert.equal(short.funded.pf, 0);
  assert.equal(empty.funded.pf, null);
  assert.equal(
    r.byRelation.length,
    8,
    "same indication shares a descriptive relation, without duplicating it for each type",
  );
  assert.equal(
    r.byIdentity.find((x) => x.cfg === other && x.sym === "BTC-USDT" && x.side === 1).funded.pf,
    null,
  );
});

it("reconciles native book risk separately from sampled ratios, closed-unit drawdown and strategy return PF", () => {
  const f = fixture([trade(0.02)]);
  f.book.settings = { leverage: 10 };
  Object.assign(f.book.total, {
    marginMax: 20,
    eqMin: 80,
    equityMaxDd: 20,
    equityMaxDdPct: 0.2,
    equityDdtMaxH: 3,
    maxOpenOrders: 8,
    maxOpenPositions: 3,
    feasible: true,
    marginOver: { minutes: 0 },
  });
  f.book.curve = [
    { eq: 100, margin: 10 },
    { eq: 100, margin: 15 },
  ];
  const r = reduce(f),
    risk = r.risk;
  assert.equal(r.total.pf, 4);
  assert.equal(r.total.unitDrawdownPctPoints, 0);
  assert.equal(risk.equityMaxDrawdownUsd, 20);
  assert.equal(risk.equityMaxDrawdownFraction, 0.2);
  assert.equal(risk.equityDdtMaxH, 3);
  assert.equal(risk.peakGrossNotionalUsd, 200);
  assert.equal(risk.grossToEquityUpperBound, 2.5);
  assert.equal(risk.marginToEquityUpperBound, 0.25);
  assert.equal(risk.sampledCurve.grossToEquityMax, 1.5);
  assert.equal(risk.sampledCurve.marginToEquityMax, 0.15);
  assert.equal(risk.maxOpenOrders, 8);
  assert.match(risk.limits, /may miss peaks/);
  f.book.curve.push({ eq: 0, margin: 20 });
  assert.equal(blockBookRisk(f.book).sampledCurve.unknownSamples, 1);
  assert.equal(blockBookRisk(f.book).sampledCurve.grossToEquityMax, null);
  const unknown = blockBookRisk({ total: { marginMax: 10, eqMin: 0 }, curve: [] });
  assert.equal(unknown.peakGrossNotionalUsd, null);
  assert.equal(unknown.grossToEquityUpperBound, null);
  assert.equal(unknown.sampledCurve.marginToEquityMax, null);
  const overflow = blockBookRisk({
    settings: { leverage: 10 },
    total: { marginMax: 1e308, eqMin: 1e-308 },
    curve: [{ eq: 1e-308, margin: 1e308 }],
  });
  assert.equal(overflow.peakGrossNotionalUsd, null);
  assert.equal(overflow.grossToEquityUpperBound, null);
  assert.equal(overflow.sampledCurve.unknownSamples, 1);
});

it("preserves native Block levels and source-specific inspected history counts, and never turns an absent trace into zero evidence", () => {
  const blockLevels = { overall: 7, symbol: 3, direction: 2, indication: 1, config: 6, type: 4 };
  const blockEffectiveLevels = {
    overall: 7,
    symbol: 3,
    direction: 2,
    indication: 1,
    config: 0,
    type: 0,
  };
  const blockSampleCounts = {
    overall: 140,
    symbol: 60,
    direction: 40,
    indication: 20,
    config: 120,
    type: 80,
  };
  const f = fixture([
    trade(0.02, { blockLevels, blockEffectiveLevels, blockSampleCounts, legs: { overall: 0.2 } }),
    trade(-0.01, { side: -1, exitT: startT + 3 }),
  ]);
  const r = reduce(f);
  assert.deepEqual(r.slices[0].blockLevels, blockLevels);
  assert.deepEqual(r.slices[0].blockEffectiveLevels, blockEffectiveLevels);
  assert.deepEqual(r.slices[0].blockSampleCounts, blockSampleCounts);
  assert.deepEqual(r.slices[0].blockSources, ["overall"]);
  assert.equal(r.slices[0].blockTraceStatus, "recorded");
  assert.equal(r.slices[1].blockTraceStatus, "not-computed");
  assert.equal(r.slices[1].blockLevels, null);
  assert.equal(r.slices[1].blockSampleCounts, null);
  assert.equal(r.total.n, 2);
  assert.match(r.definitions.blockTrace, /not counts of funded execution or PF-qualified/);
});

it("preserves source-book provenance and labels admitted, auxiliary candidate and owned funded histories separately", () => {
  const f = fixture([trade(0.02)]);
  const sourceBookEvidence = {
    overall: "settled-final-real-admitted-before-allocation",
    auxiliary: "closed-real-selected-candidates",
    config: "exact-cfg-symbol-side-tape",
    counts: { overall: 0, auxiliary: 12 },
  };
  f.raw.frozenBlockComparison.sourceBookEvidence = sourceBookEvidence;
  const r = reduce(f);
  assert.deepEqual(r.provenance.sourceBookEvidence, sourceBookEvidence);
  assert.deepEqual(r.provenance.frozenBlockComparison.sourceBookEvidence, sourceBookEvidence);
  assert.match(
    r.definitions.sourceBooks,
    /Overall learns only settled final modeled-Real-entry-admitted orders, before native cash allocation/,
  );
  assert.match(r.definitions.sourceBooks, /later entry rejects and unfunded candidates/);
  assert.match(r.definitions.sourceBooks, /Config retains its exact own cfg\/symbol\/side tape/);
  assert.match(
    r.definitions.sourceBooks,
    /neither admitted model orders nor auxiliary candidates establish funded ownership/,
  );
  assert.equal(r.total.n, 1);
  assert.equal(
    r.total.noLoss,
    true,
    "source-book diagnostics cannot replace the owned return sample",
  );
  delete f.raw.frozenBlockComparison.sourceBookEvidence;
  assert.equal(reduce(f).provenance.sourceBookEvidence, null);
});

it("requires matching exact minute-risk provenance and keeps an unrounded drawdown boundary separate from rounded display", () => {
  const f = fixture([trade(0.02)]);
  f.book.total.equityMaxDdPct = 0.1;
  f.book.frozenBlockRiskExact = {
    schema: "cts-block-native-minute-risk-v1",
    ...meta,
    window: { startT, endT },
    equityMaxDd: 10.000004,
    equityMaxDdPct: 0.10000004,
    eqMin: 89.999996,
    marginMax: 12.0000004,
    equityDdtMaxH: 1.0000004,
  };
  let risk = reduce(f).risk;
  assert.equal(risk.exactMinuteTotals, true);
  assert.equal(risk.basis, "native-minute-close");
  assert.equal(risk.equityMaxDrawdownFraction, 0.10000004);
  assert.equal(risk.roundedNativeTotals.equityMaxDdPct, 0.1);
  assert.equal(risk.marginMax, 12.0000004);
  assert.equal(risk.equityDdtMaxH, 1.0000004);
  f.book.frozenBlockRiskExact.arm = "off";
  risk = reduce(f).risk;
  assert.equal(risk.exactMinuteTotals, false);
  assert.equal(risk.equityMaxDrawdownFraction, 0.1);
  assert.equal(risk.exactMinuteTotalsStatus, "provenance-mismatch-or-unverified");
  f.book.frozenBlockRiskExact.arm = meta.arm;
  f.book.frozenBlockRiskExact.window.endT++;
  assert.equal(reduce(f).risk.exactMinuteTotals, false);
  delete f.book.frozenBlockRiskExact;
  assert.equal(reduce(f).risk.exactMinuteTotalsStatus, "missing");
});

it("retains all hourly native type and direction cells with the same settled virtual/funded math", () => {
  const trailOnly = "follow|sig-ema-cross-s@m5|tp0|sl2|tr1|h60|to";
  const f = fixture(
    [
      trade(0.02, { exitT: startT + H, mult: 2 }),
      trade(-0.01, { entryT: startT + 3, exitT: startT + H + 1, mult: undefined }),
      trade(-0.2, {
        cfg: cfg("ema-9-21@m5", "|axis"),
        kind: "axis",
        side: -1,
        exitT: startT + 3 * H,
      }),
      trade(0.03, { cfg: trailOnly, kind: "trailing-only", side: -1, exitT: endT }),
    ],
    [10, 10, 0, 2],
  );
  const r = reduce(f),
    rows = r.byHourTypeSide;
  assert.equal(rows.length, 6 * 6 * 2);
  assert.equal(
    rows.reduce((s, x) => s + x.virtual.n, 0),
    r.virtual.n,
  );
  assert.equal(
    rows.reduce((s, x) => s + x.funded.n, 0),
    r.total.n,
  );
  assert.equal(
    rows.find((x) => x.hour === 0 && x.kind === "normal" && x.side === 1).funded.noLoss,
    true,
  );
  const unknown = rows.find((x) => x.hour === 1 && x.kind === "normal" && x.side === 1);
  assert.equal(unknown.funded.n, 1);
  assert.equal(unknown.funded.unknownReturns, 1);
  assert.equal(unknown.funded.pf, null);
  const zero = rows.find((x) => x.hour === 2 && x.kind === "axis" && x.side === -1);
  assert.equal(zero.virtual.n, 1);
  assert.equal(zero.virtual.pf, 0);
  assert.equal(zero.funded.n, 0);
  assert.equal(zero.funded.zeroAllocations, 1);
  assert.equal(zero.funded.pf, null);
  assert.equal(
    rows.find((x) => x.hour === 5 && x.kind === "trailing-only" && x.side === -1).funded.noLoss,
    true,
  );
  assert.ok(
    rows
      .filter((x) => x.kind === "dca-active")
      .every((x) => x.funded.n === 0 && x.funded.pf === null),
  );
});

it("preserves prior-window selection, range and shared hypothetical stage evidence without inventing own hourly Base/Main PF", () => {
  const f = fixture();
  f.raw.validation = [
    { t: startT, real: [cfg()], checks: [[cfg(), 1, 100, 2, 0.2, 0.1]] },
    { t: startT + H, real: [], checks: [[cfg(), 0, 100, 0.5, 0.05, 0.1]] },
  ];
  f.raw.stepsByRange = [
    { t: startT, byRange: { sig: { tapes: 4, validated: 2, candidates: 1, taken: 0 } } },
    { t: startT + H, byRange: { mc: { tapes: 7, validated: 3, candidates: 2, taken: 1 } } },
  ];
  f.raw.funnel = {
    nH: 6,
    beforeBase: [{ n: 10, w: 3, gp: 0.02, gl: 0.03 }],
    pool: [{ n: 20, w: 12, gp: 0.4, gl: 0.2 }],
  };
  f.raw.basePairs = [{ bot: "follow", ind: "ema-9-21@m5", tags: ["mc"] }];
  f.raw.settings.toggles.axis = false;
  f.book.hours = [{ t: startT, balance: 100, equity: 90, orders: 2, ordersOpenEnd: 1 }];
  const r = reduce(f);
  assert.equal(r.hourlyStageSnapshots.length, 6);
  assert.deepEqual(r.hourlyStageSnapshots[0].validation, [f.raw.validation[0]]);
  assert.deepEqual(r.hourlyStageSnapshots[1].validation, [f.raw.validation[1]]);
  assert.deepEqual(r.hourlyStageSnapshots[0].stepsByRange, [f.raw.stepsByRange[0]]);
  assert.deepEqual(r.provenance.funnel, f.raw.funnel);
  assert.deepEqual(r.provenance.basePairs, f.raw.basePairs);
  assert.equal(r.stagePfAvailability.ownHourlyBasePf, null);
  assert.equal(r.stagePfAvailability.ownHourlyMainPf, null);
  assert.match(r.stagePfAvailability.reason, /not recorded/);
  assert.match(r.definitions.stages, /overlapping n values are not summed/);
  assert.equal(r.settings.axisConfiguredEnabled, false);
  assert.deepEqual(r.book.hours, f.book.hours);
});

it("distinguishes modeled entries, settled slices and matched positive/zero/unknown open allocations without adding marks to PF", () => {
  const f = fixture([trade(0.01), trade(-0.02, { exitT: startT + 3 })], [10, 10]);
  f.raw.openEnd = [
    trade(-1),
    trade(-2, { sym: "ETH-USDT", entryT: startT + 10, vol: 4 }),
    trade(-3, { sym: "SOL-USDT", entryT: startT + 20 }),
    trade(-4, { sym: "XRP-USDT", entryT: startT + 30 }),
  ].map(({ r, ...x }) => ({ ...x, exitT: undefined, mtmR: r }));
  f.book.sizedOpenOrders = f.raw.openEnd
    .slice(0, 3)
    .map((x, openIndex) => ({
      openIndex,
      key: orderKey(x),
      cfg: x.cfg,
      sym: x.sym,
      side: x.side,
      entryT: x.entryT,
      volume: x.vol,
      unitNotional: [10, 5e-10, 0][openIndex],
      allocatedNotional: [10, 2e-9, 0][openIndex],
      sizedPnl: x.mtmR * [10, 5e-10, 0][openIndex],
    }));
  const r = reduce(f);
  assert.equal(r.counts.modeledUniqueEntryOrders, 4);
  assert.equal(r.counts.modeledSettledCloseSlices, 2);
  assert.equal(r.counts.modeledOpenOrders, 4);
  assert.equal(r.counts.positiveOwnedSettledCloseSlices, 2);
  assert.equal(r.counts.positiveOwnedOpenOrders, 2);
  assert.equal(r.counts.zeroAllocatedOpenOrders, 1);
  assert.equal(r.counts.unknownAllocatedOpenOrders, 1);
  assert.equal(r.total.n, 2);
  assert.equal(r.total.pf, 0.5);
  delete f.raw.openEnd[3].sym;
  assert.equal(reduce(f).counts.modeledUniqueEntryOrders, null);
  assert.equal(reduce(f).counts.unknownOpenIdentityOrders, 1);
});
