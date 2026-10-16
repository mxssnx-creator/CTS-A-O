import { it } from "node:test";
import assert from "node:assert/strict";
import {
  assessBlockPerformance,
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
    settings: {
      balance0: 1000,
      leverage: 10,
      notional: 2,
      sizing: { mode: "equityPct", pct: 0.02 },
      caps: { on: true, maxPositionX: 0.75, maxExposureX: 7 },
    },
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

it("retains independent indication × symbol × direction groups including zero-activity siblings", () => {
  const f = fixture([
    trade(0.03),
    trade(-0.01, { side: -1, exitT: startT + 3 }),
    trade(-0.05, { sym: "ETH-USDT", exitT: startT + 4 }),
  ]);
  f.raw.frozenBlockComparison.builtCatalog = [{ id: cfg(), kind: "normal" }];
  const r = reduce(f),
    relation = (sym, side) => r.byRelation.find((x) => x.sym === sym && x.side === side);
  assert.equal(r.byRelation.length, 8);
  assert.equal(relation("BTC-USDT", 1).funded.noLoss, true);
  assert.equal(relation("BTC-USDT", -1).funded.pf, 0);
  assert.equal(relation("ETH-USDT", 1).funded.pf, 0);
  assert.equal(relation("ETH-USDT", -1).funded.n, 0);
  assert.equal(relation("ETH-USDT", -1).funded.pf, null);
});

it("separates native minute equity risk from sampled display ratios without inventing liquidation or stop proof", () => {
  const book = {
    settings: { leverage: 10 },
    total: {
      marginMax: 300,
      eqMin: 750,
      equityMaxDd: 250,
      equityMaxDdPct: 0.25,
      equityDdtMaxH: 2,
      feasible: true,
      marginOver: { minutes: 0 },
      maxOpenOrders: 7,
      maxOpenPositions: 4,
      caps: { maxExposureX: 7 },
    },
    curve: [
      { eq: 1000, margin: 0 },
      { eq: 800, margin: 200 },
    ],
  };
  const r = blockBookRisk(book);
  assert.equal(r.equityMaxDrawdownFraction, 0.25);
  assert.equal(r.peakGrossNotionalUsd, 3000);
  assert.equal(r.grossToEquityUpperBound, 4);
  assert.equal(r.sampledCurve.grossToEquityMax, 2.5);
  assert.equal(r.sampledCurve.marginToEquityMax, 0.25);
  assert.match(r.limits, /five-minute/);
  book.curve.push({ eq: 0, margin: 20 });
  assert.equal(blockBookRisk(book).sampledCurve.grossToEquityMax, null);
  assert.equal(blockBookRisk(book).sampledCurve.unknownSamples, 1);
  assert.equal(blockBookRisk({}).equityMaxDrawdownFraction, null);
  assert.equal(blockBookRisk({}).feasible, null);
});

it("audits the base plus all Overall source legs against one external stack cap", () => {
  const f = fixture([trade(0.02, { mult: 2, vol: 6, legs: { symbol: 0.4, indication: 0.6 } })]);
  let r = reduce(f);
  assert.equal(r.risk.stack.knownCapSatisfied, true);
  assert.equal(r.risk.stack.maxBasePlusSourceLegs, 2);
  assert.equal(
    r.total.maxActualVolume,
    6,
    "intrinsic ladder volume is not an external cap violation",
  );
  f.raw.trades[0].legs.direction = 0.2;
  r = reduce(f);
  assert.equal(r.risk.stack.knownCapSatisfied, false);
  assert.equal(r.risk.stack.violations[0].reason, "base-plus-all-source-legs-cap");
  f.raw.trades[0].legs.direction = NaN;
  assert.equal(reduce(f).risk.stack.unknownLegs, 1);
  delete f.raw.trades[0].mult;
  assert.equal(reduce(f).risk.stack.unknownMult, 1);
});

it("requires actual return-PF improvement and bounded equity drawdown instead of a cash-weighted improvement", () => {
  const policy = {
    minOwnedEntryOrders: 2,
    minReturnPf: 1.1,
    minPairedPfImprovement: 0.1,
    maxEquityDrawdownFraction: 0.1,
    maxEquityDrawdownIncreaseFraction: 0.02,
  };
  const make = (arm, win, dd, newWinIdentity = false) => {
    const f = fixture([
      trade(win, newWinIdentity ? { entryT: startT + 8, exitT: startT + 9 } : {}),
      trade(-0.01, { entryT: startT + 3, exitT: startT + 4 }),
    ]);
    f.raw.frozenBlockComparison.arm.id = arm;
    f.book.total.equityMaxDdPct = dd;
    f.book.total.feasible = true;
    f.book.checks = [{ name: "native accounting", ok: true }];
    f.raw.engine.coverage.complete = true;
    return reduce(f, { ...meta, arm });
  };
  const off = make("off", 0.012, 0.02),
    weighted = make("shared", 0.012, 0.02);
  weighted.total.cashPfDiagnostic = 100;
  let r = assessBlockPerformance([off, weighted], policy);
  assert.equal(r.rows[0].primaryPfImprovement, 0);
  assert.ok(r.rows[0].failedChecks.some((x) => x.name === "paired-return-pf-improvement"));
  assert.equal(r.arms[0].passesEveryDeclaredFold, false);
  const corrupted = make("overall", 0.014, 0.04);
  assert.ok(
    assessBlockPerformance([off, corrupted], policy).rows[0].failedChecks.some(
      (x) => x.name === "matched-unit-return-invariance",
    ),
  );
  const better = make("overall", 0.014, 0.04, true);
  r = assessBlockPerformance([off, better], policy);
  assert.equal(r.rows[0].retrospectivePolicyPassed, true);
  assert.equal(r.noLivePromotion, true);
  better.risk.equityMaxDrawdownFraction = 0.041;
  assert.ok(
    assessBlockPerformance([off, better], policy).rows[0].failedChecks.some(
      (x) => x.name === "paired-equity-drawdown",
    ),
  );
  better.risk.equityMaxDrawdownFraction = 0.03;
  better.total.exactPf = null;
  better.total.noLoss = true;
  better.total.pf = 4;
  assert.equal(
    assessBlockPerformance([off, better], policy).rows[0].retrospectivePolicyPassed,
    false,
  );
  assert.throws(() => assessBlockPerformance([off, weighted], {}), /prespecified/);
  const changedCapital = structuredClone(weighted);
  changedCapital.settings.allocation.balance = 5000;
  assert.throws(() => compareBlockEvidence([off, changedCapital]), /allocation/);
});
