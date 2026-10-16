// Pure reduction of frozen native simulation output. This module never calculates strategies or changes gates.
import { modeledUnitReturn, profitFactor, statsOf } from "../../src/core/metrics/stats.ts";
import { isSignalInd, laneOf, signalSourceOf } from "../../src/core/indications/registry.ts";
import { kindOfId, parseConfigId } from "../../src/core/pipeline/pipeline.ts";
import { rangeOfId, RANGE_LABEL } from "../../src/core/minimal-coord.ts";
import { orderKey } from "../../src/core/sizing.ts";
import { BOOK_NOTIONAL_EPS_USD } from "./book-notional.mjs";

const H = 3_600_000;
const TYPES = ["normal", "trailing", "trailing-only", "axis", "dca", "dca-active"];
// Shared compact empty cells keep full config × symbol × direction inventories bounded in memory and JSON.
const EMPTY_CELL = Object.freeze({
  n: 0,
  pf: null,
  exactPf: null,
  noLoss: null,
  ownedCloses: 0,
  zeroAllocations: 0,
  unknownAllocations: 0,
  unknownReturns: 0,
  unknownSizedPnl: 0,
  cashPfDiagnostic: null,
});
const finite = (x) => typeof x === "number" && Number.isFinite(x);
const positive = (x) => finite(x) && x > 0;
const numberOrNull = (x) => (finite(x) ? x : null);
const sliceKey = (x) => JSON.stringify([x.cfg, x.sym, x.side, x.entryT, x.exitT, kindOfId(x.cfg)]);

/** A modeled parent close is one sample; source legs and allocation row indices are not independent fills. */
function requireUniqueModeledCloses(rows, scope) {
  const seen = new Map();
  for (let i = 0; i < rows.length; i++) {
    const key = sliceKey(rows[i]);
    if (seen.has(key))
      throw new Error(
        `Duplicate canonical modeled close identity in ${scope}: rows ${seen.get(key)} and ${i}. ` +
          "Block source legs cannot create additional close samples; preserve the raw evidence for inspection.",
      );
    seen.set(key, i);
  }
}

function details(cfg, kind) {
  const parsed = parseConfigId(cfg),
    ind = parsed?.ind ?? cfg.split("|")[1] ?? "unknown";
  const lane = laneOf(ind),
    rangeTag = rangeOfId(cfg);
  const signal = isSignalInd(ind),
    parameterRange = signal ? (/-s$/.test(lane.base) ? "short" : "medium") : null;
  return {
    cfg,
    indication: ind,
    indicationBase: lane.base,
    lane: lane.tf,
    combined: lane.combined,
    laneKey: lane.tf === null ? "unmarked" : `${lane.tf}${lane.combined ? "c" : ""}`,
    indicationSource: signal ? signalSourceOf(ind) : null,
    parameterRange,
    rangeTag,
    rangeKey: signal ? `signal:${parameterRange}` : `engine:${rangeTag || "wide"}`,
    range: signal ? parameterRange : RANGE_LABEL[rangeTag],
    kind: kind ?? kindOfId(cfg),
    configParsed: parsed !== null,
  };
}

function allocationReader(book) {
  const index = new Map();
  for (const a of book.sizedOrders ?? []) {
    if (!Number.isSafeInteger(a.closeIndex) || a.closeIndex < 0) continue;
    index.set(a.closeIndex, index.has(a.closeIndex) ? null : a);
  }
  return (x, i) => {
    const a = index.get(i);
    const unknown = (reason) => ({
      status: "unknown",
      reason,
      unitNotional: null,
      allocatedNotional: null,
      sizedPnl: null,
      rawUnitNotional: a?.rawUnitNotional ?? null,
      rawGot: a?.rawGot ?? null,
    });
    if (a === null) return unknown("duplicate-close-index");
    if (!a) return unknown("missing-close-allocation");
    if (
      a.key !== orderKey(x) ||
      a.cfg !== x.cfg ||
      a.sym !== x.sym ||
      a.side !== x.side ||
      a.entryT !== x.entryT ||
      a.exitT !== x.exitT
    )
      return unknown("close-identity-mismatch");
    const volume = x.vol ?? 1;
    if (
      !finite(a.unitNotional) ||
      a.unitNotional < 0 ||
      !finite(a.allocatedNotional) ||
      a.allocatedNotional < 0 ||
      !positive(a.volume) ||
      !positive(volume) ||
      a.volume !== volume ||
      a.allocatedNotional !== a.unitNotional * a.volume
    )
      return unknown("invalid-allocation-or-volume");
    const expected = x.r * a.unitNotional;
    const cashKnown =
      finite(x.r) &&
      finite(expected) &&
      a.sizedPnl === expected &&
      (a.sizedReturn === undefined || a.sizedReturn === x.r);
    return {
      status: a.allocatedNotional > BOOK_NOTIONAL_EPS_USD ? "positive" : "zero",
      reason: null,
      unitNotional: a.unitNotional,
      allocatedNotional: a.allocatedNotional,
      sizedPnl: cashKnown ? a.sizedPnl : null,
      cashUnknownReason: cashKnown ? null : "cash-return-mismatch-or-unknown",
      rawUnitNotional: a.rawUnitNotional ?? null,
      rawGot: a.rawGot ?? null,
      roundoffZeroed: a.roundoffZeroed ?? false,
    };
  };
}

/** Unknown allocation rows stay in the conservative primary sample; a known zero allocation is kept outside it. */
function summarize(rows, window, funded) {
  if (!rows.length) return EMPTY_CELL;
  const sample = funded ? rows.filter((x) => x.allocation !== "zero") : rows;
  let gp = 0,
    gl = 0,
    cashGp = 0,
    cashGl = 0,
    wins = 0,
    losses = 0,
    flat = 0;
  let unknownReturns = 0,
    unknownSizedPnl = 0,
    unknownMult = 0,
    unknownVolume = 0;
  let maxMult = 0,
    maxVolume = 0;
  const normalized = [],
    orders = new Set();
  for (const x of sample) {
    const r = funded && x.allocation === "unknown" ? null : x.unitR;
    const pnl = x.allocation === "unknown" ? null : x.sizedPnl;
    if (!finite(r)) unknownReturns++;
    else if (r > 0) {
      gp += r;
      wins++;
    } else if (r < 0) {
      gl -= r;
      losses++;
    } else flat++;
    if (!finite(pnl)) unknownSizedPnl++;
    else if (pnl > 0) cashGp += pnl;
    else cashGl -= pnl;
    if (!positive(x.mult)) unknownMult++;
    else maxMult = Math.max(maxMult, x.mult);
    if (!positive(x.volume)) unknownVolume++;
    else maxVolume = Math.max(maxVolume, x.volume);
    normalized.push({ r, entryT: Math.max(window.startT, x.entryT), exitT: x.exitT });
    orders.add(x.orderKey);
  }
  const ordered = normalized.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  const totalsKnown = !unknownReturns && finite(gp) && finite(gl) && finite(gp - gl);
  const cashKnown = !unknownSizedPnl && finite(cashGp) && finite(cashGl) && finite(cashGp - cashGl);
  const st = totalsKnown && sample.length ? statsOf(ordered, window.endT) : null;
  const noLoss = totalsKnown && sample.length > 0 ? gp > 0 && gl === 0 : null;
  const cashNoLoss = cashKnown && sample.length > 0 ? cashGp > 0 && cashGl === 0 : null;
  const knownPositive = sample.filter((x) => x.allocation === "positive");
  return {
    sample: funded
      ? "positive-owned-settled-slices-with-unknown-ownership-retained"
      : "all-virtual-settled-slices",
    n: sample.length,
    uniqueEntryOrders: orders.size,
    ownedCloses: knownPositive.length,
    zeroAllocations: rows.filter((x) => x.allocation === "zero").length,
    unknownAllocations: sample.filter((x) => x.allocation === "unknown").length,
    unknownReturns,
    unknownSizedPnl,
    unknownReturnTotals: !unknownReturns && !totalsKnown ? 1 : 0,
    wins,
    losses,
    flat,
    gp: totalsKnown ? gp : null,
    gl: totalsKnown ? gl : null,
    net: totalsKnown ? gp - gl : null,
    pf: totalsKnown && sample.length ? profitFactor(gp, gl) : null,
    exactPf: totalsKnown && gl > 0 ? gp / gl : null,
    noLoss,
    pfBasis: totalsKnown ? "unit-net-returns" : "unavailable",
    pfConvention:
      !totalsKnown || !sample.length
        ? "unavailable"
        : noLoss
          ? "no-loss-sentinel"
          : "gross-return-ratio",
    unitDrawdownPctPoints: st && finite(st.mdd) ? st.mdd : null,
    unitDdtH: st && finite(st.ddt) ? st.ddt : null,
    unitDdtNowH: st && finite(st.ddtNow) ? st.ddtNow : null,
    cashGp: cashKnown ? cashGp : null,
    cashGl: cashKnown ? cashGl : null,
    cashNet: cashKnown ? cashGp - cashGl : null,
    cashPfDiagnostic: cashKnown && cashGl > 0 ? cashGp / cashGl : null,
    cashNoLoss,
    cashBasis: cashKnown ? "same-slices-native-sized-pnl" : "unavailable",
    maxActualMult: sample.length && !unknownMult ? maxMult : null,
    maxActualVolume: sample.length && !unknownVolume ? maxVolume : null,
    knownMaxMult: maxMult || null,
    knownMaxActualVolume: maxVolume || null,
    unknownMult,
    unknownVolume,
  };
}

function partitions(rows, window, inventory = [], symbols = []) {
  const configs = new Map(inventory.map((x) => [x.cfg, x]));
  const dimensions = [
    ["byType", (x) => x.kind, TYPES],
    ["byIndication", (x) => x.indication, inventory.map((x) => x.indication)],
    ["byLane", (x) => x.laneKey, inventory.map((x) => x.laneKey)],
    ["byRange", (x) => x.rangeKey, inventory.map((x) => x.rangeKey)],
    ["bySide", (x) => x.side, [1, -1]],
    ["byConfig", (x) => x.cfg, inventory.map((x) => x.cfg)],
    ["bySymbol", (x) => x.sym, symbols],
    [
      "byIdentity",
      (x) => JSON.stringify([x.cfg, x.sym, x.side]),
      inventory.flatMap((x) =>
        symbols.flatMap((sym) => [1, -1].map((side) => JSON.stringify([x.cfg, sym, side]))),
      ),
    ],
    [
      "byRelation",
      (x) => JSON.stringify([x.indication, x.sym, x.side]),
      inventory.flatMap((x) =>
        symbols.flatMap((sym) => [1, -1].map((side) => JSON.stringify([x.indication, sym, side]))),
      ),
    ],
  ];
  const out = {};
  for (const [name, keyOf, seeds] of dimensions) {
    const groups = new Map([...new Set(seeds)].map((k) => [k, []]));
    for (const x of rows) {
      const k = keyOf(x);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(x);
    }
    out[name] = [...groups]
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([key, xs]) => {
        let scope = {};
        if (name === "byIdentity") {
          const [cfg, sym, side] = JSON.parse(key),
            info = configs.get(cfg) ?? xs[0];
          scope = {
            cfg,
            sym,
            side,
            indication: info.indication,
            lane: info.lane,
            combined: info.combined,
            rangeKey: info.rangeKey,
            kind: info.kind,
            built: info.built ?? null,
          };
        } else if (name === "byRelation") {
          const [indication, sym, side] = JSON.parse(key);
          scope = { indication, sym, side };
        } else if (name === "byConfig") scope = configs.get(key) ?? details(key, xs[0]?.kind);
        return {
          key,
          ...scope,
          virtual: summarize(xs, window, false),
          funded: summarize(xs, window, true),
        };
      });
  }
  out.hourly = Array.from({ length: Math.ceil((window.endT - window.startT) / H) }, (_, hour) => {
    const startT = window.startT + hour * H,
      endT = Math.min(startT + H, window.endT);
    const xs = rows.filter((x) => x.exitT > startT && x.exitT <= endT),
      period = { startT, endT };
    return {
      hour,
      ...period,
      virtual: summarize(xs, period, false),
      funded: summarize(xs, period, true),
    };
  });
  return out;
}

/** Native minute-book risk, separate from the closed unit-return curve and five-minute display samples. */
export function blockBookRisk(book) {
  const exact = book.frozenBlockRiskExact;
  if (
    exact !== undefined &&
    (exact.schema !== "cts-block-native-minute-risk-v1" ||
      !["equityMaxDd", "equityMaxDdPct", "eqMin", "marginMax", "equityDdtMaxH"].every((key) =>
        finite(exact[key]),
      ) ||
      ["equityMaxDd", "equityMaxDdPct", "marginMax", "equityDdtMaxH"].some((key) => exact[key] < 0))
  )
    throw new Error("Invalid exact native minute risk evidence");
  const t = exact === undefined ? (book.total ?? {}) : { ...book.total, ...exact },
    leverage = positive(book.settings?.leverage) ? book.settings.leverage : null;
  const marginMax = finite(t.marginMax) && t.marginMax >= 0 ? t.marginMax : null;
  const eqMin = numberOrNull(t.eqMin),
    curve = Array.isArray(book.curve) ? book.curve : [];
  let sampledMarginRatio = 0,
    sampledGrossRatio = 0,
    unknownCurveSamples = 0;
  for (const x of curve) {
    if (!positive(x.eq) || !finite(x.margin) || x.margin < 0) {
      unknownCurveSamples++;
      continue;
    }
    sampledMarginRatio = Math.max(sampledMarginRatio, x.margin / x.eq);
    if (leverage !== null)
      sampledGrossRatio = Math.max(sampledGrossRatio, (x.margin * leverage) / x.eq);
  }
  return {
    basis:
      exact === undefined
        ? "native-simulated-minute-book-rounded-report-fields"
        : "native-simulated-minute-book-unrounded-risk-fields",
    exactMinuteEvidence: exact ?? null,
    leverage,
    marginMax,
    equityMin: eqMin,
    equityMaxDrawdownUsd: numberOrNull(t.equityMaxDd),
    equityMaxDrawdownFraction: numberOrNull(t.equityMaxDdPct),
    equityDdtMaxH: numberOrNull(t.equityDdtMaxH),
    peakGrossNotionalUsd: marginMax !== null && leverage !== null ? marginMax * leverage : null,
    grossToEquityUpperBound:
      marginMax !== null && leverage !== null && eqMin > 0 ? (marginMax * leverage) / eqMin : null,
    marginToEquityUpperBound: marginMax !== null && eqMin > 0 ? marginMax / eqMin : null,
    feasible: typeof t.feasible === "boolean" ? t.feasible : null,
    marginOver: t.marginOver ?? null,
    maxOpenOrders: numberOrNull(t.maxOpenOrders),
    maxOpenPositions: numberOrNull(t.maxOpenPositions),
    caps: t.caps ?? null,
    sampledCurve: {
      sampleCount: curve.length,
      unknownSamples: unknownCurveSamples,
      marginToEquityMax: curve.length && !unknownCurveSamples ? sampledMarginRatio : null,
      grossToEquityMax:
        curve.length && !unknownCurveSamples && leverage !== null ? sampledGrossRatio : null,
    },
    limits:
      "Minute equity drawdown/margin extrema come from native totals. Display-curve ratios use five-minute/hour-end samples and may miss peaks; upper bounds use separate minute extrema. These are gross exposure and margin measures, not venue liquidation or dynamically ratcheted stop-risk proof.",
  };
}

function stackEvidence(raw) {
  const configured = raw.settings?.block?.maxMult;
  const cap = finite(configured) ? Math.min(8, Math.max(1, configured)) : null;
  const rows = [...raw.trades, ...(raw.openEnd ?? [])];
  let unknownMult = 0,
    unknownLegs = 0,
    maxMult = 0,
    maxLegsTotal = 1;
  const violations = [];
  for (let index = 0; index < rows.length; index++) {
    const x = rows[index];
    if (!positive(x.mult)) unknownMult++;
    else {
      maxMult = Math.max(maxMult, x.mult);
      if (cap !== null && x.mult > cap + 1e-10)
        violations.push({
          index,
          cfg: x.cfg,
          sym: x.sym,
          side: x.side,
          reason: "external-stack-cap",
          observed: x.mult,
          cap,
        });
    }
    if (x.legs !== undefined) {
      const legs = Object.values(x.legs ?? {});
      if (!x.legs || !legs.every((v) => finite(v) && v >= 0)) unknownLegs++;
      else {
        const total = 1 + legs.reduce((sum, n) => sum + n, 0);
        maxLegsTotal = Math.max(maxLegsTotal, total);
        if (cap !== null && total > cap + 1e-10)
          violations.push({
            index,
            cfg: x.cfg,
            sym: x.sym,
            side: x.side,
            reason: "base-plus-all-source-legs-cap",
            observed: total,
            cap,
          });
      }
    }
  }
  return {
    scope: "all-virtual-settled-closes-and-open-endpoints",
    cap,
    recordCount: rows.length,
    unknownMult,
    unknownLegs,
    maxExternalMult: rows.length && !unknownMult ? maxMult : null,
    maxBasePlusSourceLegs: rows.length && !unknownLegs ? maxLegsTotal : null,
    violations,
    knownCapSatisfied: cap !== null && !unknownMult && !unknownLegs && violations.length === 0,
    note: "The external Block × coordination stack is bounded including the base and every source addition. Intrinsic ladder volume is separate. Empty records are vacuously cap-consistent and never performance evidence.",
  };
}

function validateInputs(raw, book, meta) {
  if (!Array.isArray(raw.trades) || !Array.isArray(book.sizedOrders))
    throw new Error("Native trades and unrounded sizedOrders are required");
  const w = raw.window;
  if (
    !w ||
    !finite(w.startT) ||
    !finite(w.endT) ||
    w.endT <= w.startT ||
    book.window?.startT !== w.startT ||
    book.window?.endT !== w.endT
  )
    throw new Error("Raw and book execution windows differ or are invalid");
  if (!finite(raw.settings?.cost) || raw.settings.cost < 0)
    throw new Error("Explicit modeled source cost is required");
  if (
    !meta ||
    !meta.fold ||
    !(typeof meta.arm === "string" ? meta.arm : meta.arm?.id) ||
    !/^[0-9a-f]{64}$/.test(meta.protocolSha256) ||
    !/^[0-9a-f]{64}$/.test(meta.sourceSha256)
  )
    throw new Error("Frozen fold, arm, protocol SHA and source SHA are required");
  const frozen = raw.frozenBlockComparison;
  const arm = typeof meta.arm === "string" ? meta.arm : meta.arm.id;
  if (
    frozen &&
    (frozen.fold !== meta.fold ||
      frozen.arm?.id !== arm ||
      frozen.protocolSha256 !== meta.protocolSha256 ||
      frozen.sourceSha256 !== meta.sourceSha256)
  )
    throw new Error("Raw comparison provenance differs from requested provenance");
  const exact = book.frozenBlockRiskExact;
  if (
    exact !== undefined &&
    (exact.window?.startT !== w.startT ||
      exact.window?.endT !== w.endT ||
      exact.fold !== meta.fold ||
      exact.arm !== arm ||
      exact.protocolSha256 !== meta.protocolSha256 ||
      exact.sourceSha256 !== meta.sourceSha256)
  )
    throw new Error("Exact native minute risk provenance differs from frozen comparison");
  return arm;
}

/** Preserve all settled closes. Neither a winning sibling nor a rounded session headline supplies missing evidence. */
export function blockComparisonEvidence(raw, book, meta) {
  const arm = validateInputs(raw, book, meta),
    window = { startT: raw.window.startT, endT: raw.window.endT };
  const readAllocation = allocationReader(book),
    slices = [];
  for (let i = 0; i < raw.trades.length; i++) {
    const x = raw.trades[i];
    if (
      typeof x.cfg !== "string" ||
      typeof x.sym !== "string" ||
      ![1, -1].includes(x.side) ||
      !finite(x.entryT) ||
      !finite(x.exitT) ||
      x.entryT < window.startT ||
      x.entryT >= window.endT ||
      x.exitT <= window.startT ||
      x.exitT > window.endT ||
      x.exitT < x.entryT ||
      x.markedOpen ||
      ["end", "open"].includes(x.reason)
    )
      throw new Error(`Endpoint, prewindow or invalid close entered settled slice ${i}`);
    if (x.kind !== undefined && x.kind !== kindOfId(x.cfg))
      throw new Error(`Close type differs from config identity at slice ${i}`);
    const own = readAllocation(x, i),
      unitR = modeledUnitReturn(x);
    const row = {
      ...details(x.cfg, x.kind),
      closeIndex: i,
      sym: x.sym,
      side: x.side,
      entryT: x.entryT,
      exitT: x.exitT,
      reason: x.reason ?? null,
      orderKey: orderKey(x),
      unitR: numberOrNull(unitR),
      sizedReturn: numberOrNull(x.r),
      mult: numberOrNull(x.mult),
      volume: numberOrNull(x.vol ?? 1),
      level: numberOrNull(x.level),
      coordinationMult: numberOrNull(x.coordVol),
      blockSources: x.src ?? (x.legs ? Object.keys(x.legs).sort() : null),
      blockLegs: x.legs ?? null,
      allocation: own.status,
      allocationReason: own.reason,
      unitNotional: own.unitNotional,
      allocatedNotional: own.allocatedNotional,
      sizedPnl: own.sizedPnl,
      rawUnitNotional: own.rawUnitNotional,
      rawGot: own.rawGot,
      roundoffZeroed: own.roundoffZeroed ?? false,
      cashUnknownReason: own.cashUnknownReason ?? null,
    };
    row.sliceKey = sliceKey(row);
    slices.push(row);
  }
  // Reject ambiguous parents before any PF reduction. Never silently discard a potentially losing duplicate.
  // Different exit times remain distinct settled slices; same-time partial fills need an explicit execution
  // slice schema, which this modeled parent-close export does not provide.
  requireUniqueModeledCloses(slices, "native modeled close export");
  const builtCatalog = raw.frozenBlockComparison?.builtCatalog ?? [];
  const built = new Map(builtCatalog.map((x) => [x.id, x]));
  const requested = new Map((raw.signalProgress?.configs ?? []).map((x) => [x.id, x]));
  const ids = new Set(
    [
      ...slices.map((x) => x.cfg),
      ...built.keys(),
      ...(raw.signalProgress?.configs ?? []).map((x) => x.id),
      ...(raw.validation ?? []).flatMap((x) => (x.checks ?? []).map((c) => c[0])),
    ].filter((x) => typeof x === "string"),
  );
  const configInventory = [...ids].map((cfg) => ({
    ...details(cfg, built.get(cfg)?.kind ?? requested.get(cfg)?.kind),
    built: built.has(cfg) ? true : (requested.get(cfg)?.built ?? null),
    requestedSignal: requested.has(cfg),
  }));
  const symbols = [
    ...new Set([...(raw.symbols ?? raw.engine?.universe ?? []), ...slices.map((x) => x.sym)]),
  ].sort();
  const groups = partitions(slices, window, configInventory, symbols);
  const checks = book.checks ?? [];
  return {
    schema: "cts-block-comparison-evidence-v1",
    classification: "simulated-development-evidence",
    arm,
    fold: meta.fold,
    protocolSha256: meta.protocolSha256,
    sourceSha256: meta.sourceSha256,
    window,
    primarySample: "positive-owned-settled-slices-with-unknown-ownership-retained",
    total: summarize(slices, window, true),
    virtual: summarize(slices, window, false),
    ...groups,
    slices,
    risk: { ...blockBookRisk(book), stack: stackEvidence(raw) },
    settings: {
      cost: raw.settings?.cost ?? null,
      block: raw.settings?.block ?? null,
      toggles: raw.settings?.toggles ?? null,
      allocation: {
        balance: numberOrNull(book.settings?.balance0),
        leverage: numberOrNull(book.settings?.leverage),
        sizingMode: book.settings?.sizing?.mode ?? null,
        pct: numberOrNull(book.settings?.sizing?.pct),
        fixedNotional: numberOrNull(book.settings?.notional),
        caps: book.settings?.caps ?? null,
      },
    },
    provenance: {
      frozenBlockComparison: raw.frozenBlockComparison ?? null,
      coverage: raw.engine?.coverage ?? null,
      memory: raw.engine?.mem ?? null,
      skips: raw.engine?.skips ?? null,
      sharedBase: raw.engine?.sharedBase ?? null,
      validation: raw.validation ?? [],
      stepsByRange: raw.stepsByRange ?? [],
      requestedSignalInventory: [...requested.values()].map(
        ({ id, origin, built, historyCalculated, status, requestedAliases }) => ({
          id,
          origin,
          built,
          historyCalculated,
          status,
          requestedAliases,
        }),
      ),
      configInventory,
    },
    book: {
      scope: "whole-arm-native-simulated-book-including-separate-endpoint-marks",
      roundedNativeSummary: true,
      orders: numberOrNull(book.total?.orders),
      balanceEnd: numberOrNull(book.total?.balanceEnd),
      equityEnd: numberOrNull(book.total?.equityEnd),
      equityMaxDd: numberOrNull(book.total?.equityMaxDd),
      equityMaxDdPct: numberOrNull(book.total?.equityMaxDdPct),
      equityDdtMaxH: numberOrNull(book.total?.equityDdtMaxH),
      closedMdd: numberOrNull(book.total?.closedMdd),
      closedDdtH: numberOrNull(book.total?.ddtH),
      nativeNet: numberOrNull(book.total?.net),
      checks,
      failedChecks: checks.filter((x) => !x.ok),
      hours: book.hours ?? [],
    },
    endpoints: {
      planned: raw.openEnd ?? [],
      allocations: book.sizedOpenOrders ?? [],
      settledPfExcluded: true,
    },
    definitions: {
      primaryPf:
        "GP/GL of strict modeled owned unit-net returns; recorded external Block/coordination multiplier removed. Intrinsic ladder semantics retained. No-loss score is a sentinel, never an exact measured finite ratio.",
      ownership:
        "Native allocation matched by closeIndex plus complete order/exit identity, volume and total allocated notional. One canonical config/symbol/direction/entry/exit/type close is one sample; duplicate identities reject the export before scoring, irrespective of source-leg metadata. Distinct exit times remain separate settled slices. Positive total allocated USD > 1e-9. Zero slices retained outside funded PF; unknown ownership remains inside and invalidates it.",
      cash: "Native sizedPnl reconciled to recorded sized return times unitNotional on precisely the same settled slices as each return summary. Cash PF is a separate diagnostic. No-loss cash ratios are unavailable.",
      volume:
        "maxActualMult is the external Block × coordination mult. maxActualVolume is native total vol including intrinsic Axis/DCA legs and external weighting; it is not multiplied by mult again and intrinsic volume above the external cap is not a cap failure. Per-slice Block legs retain their source weights. Native level is intrinsic ladder level for Axis/DCA and Block level otherwise; it cannot universally be labeled a Block level.",
      drawdown:
        "Canonical cumulative unit-return closed-slice curve, in percentage points; DDT in hours through bucket end. Entry time is clipped to bucket start. This is not account equity drawdown.",
      partitions:
        "Descriptive separate own-slice groups. Pooled PF never qualifies an empty, losing or unknown config/symbol/direction sibling. Every built config and requested effective Signal config has all requested symbol/direction cells; unbuilt engine coverage remains aggregate and is never invented as a config result. All six native trade types remain visible.",
      emptyCells:
        "Compact n=0 cells omit nonapplicable metrics. PF, exact ratio, no-loss state, drawdown and cash ratio are unavailable; all counts are zero. Empty cells never mean measured passes.",
      endpoints: "Open endpoint marks are separate; never settled close or PF evidence.",
    },
  };
}

/** A diagnostic common owned slice intersection; full-arm evidence is always retained alongside it. */
export function compareBlockEvidence(arms) {
  if (
    !Array.isArray(arms) ||
    !arms.length ||
    arms.some((x) => x.schema !== "cts-block-comparison-evidence-v1")
  )
    throw new Error("Block comparison arm evidence is required");
  const folds = new Map();
  for (const a of arms) {
    if (!folds.has(a.fold)) folds.set(a.fold, []);
    folds.get(a.fold).push(a);
  }
  return {
    schema: "cts-block-comparison-common-owned-v1",
    diagnosticOnly: true,
    folds: [...folds].map(([fold, reports]) => {
      const reference = reports[0],
        names = new Set();
      for (const r of reports) {
        // Recompute the canonical identity rather than trusting a caller-supplied sliceKey or total.
        requireUniqueModeledCloses(r.slices, `comparison arm ${r.arm}`);
        if (
          names.has(r.arm) ||
          r.window.startT !== reference.window.startT ||
          r.window.endT !== reference.window.endT ||
          r.protocolSha256 !== reference.protocolSha256 ||
          r.sourceSha256 !== reference.sourceSha256 ||
          !finite(r.settings?.cost) ||
          r.settings.cost !== reference.settings?.cost ||
          JSON.stringify(r.settings?.allocation) !== JSON.stringify(reference.settings?.allocation)
        )
          throw new Error(
            "Comparison arms have duplicate identities or incompatible frozen windows/provenance/costs/allocation",
          );
        names.add(r.arm);
      }
      const maps = reports.map((r) => {
        const counts = new Map(),
          map = new Map();
        for (const x of r.slices) counts.set(x.sliceKey, (counts.get(x.sliceKey) ?? 0) + 1);
        for (const x of r.slices)
          if (x.allocation === "positive" && counts.get(x.sliceKey) === 1) map.set(x.sliceKey, x);
        return { map, ambiguousSlices: r.slices.filter((x) => counts.get(x.sliceKey) > 1).length };
      });
      const keys = [...maps[0].map.keys()]
        .filter((key) => maps.every((x) => x.map.has(key)))
        .sort();
      return {
        fold,
        window: reference.window,
        protocolSha256: reference.protocolSha256,
        sourceSha256: reference.sourceSha256,
        comparable: reports.length > 1,
        commonOwnedSliceCount: keys.length,
        commonSliceKeys: keys,
        arms: reports.map((r, i) => {
          const rows = keys.map((key) => maps[i].map.get(key));
          return {
            arm: r.arm,
            wholeArm: r.total,
            common: summarize(rows, r.window, true),
            ...partitions(rows, r.window),
            ambiguousSlicesExcluded: maps[i].ambiguousSlices,
            positiveOwnedSlicesOutsideIntersection: r.total.ownedCloses - rows.length,
            unknownOwnershipOutsideIntersection: r.total.unknownAllocations,
          };
        }),
      };
    }),
    note: "Intersection requires one unique exact config/symbol/direction/entry/exit/type close slice in every arm with positive native ownership. Duplicate canonical identities reject the comparison instead of silently omitting them. Unknown and zero ownership never borrow matching evidence. Whole-arm losses and unknowns remain in wholeArm; common slices never replace the primary full-arm result.",
  };
}

/** Prespecified full-arm comparison. Descriptive retrospective passes never authorize live promotion. */
export function assessBlockPerformance(arms, policy) {
  const fields = [
    "minOwnedEntryOrders",
    "minReturnPf",
    "minPairedPfImprovement",
    "maxEquityDrawdownFraction",
    "maxEquityDrawdownIncreaseFraction",
  ];
  if (
    !policy ||
    fields.some((key) => !finite(policy[key]) || policy[key] < 0) ||
    policy.minOwnedEntryOrders < 1
  )
    throw new Error("Explicit finite prespecified Block performance policy required");
  compareBlockEvidence(arms);
  const folds = new Map();
  for (const r of arms) {
    if (!folds.has(r.fold)) folds.set(r.fold, []);
    folds.get(r.fold).push(r);
  }
  const rows = [];
  for (const [fold, reports] of folds) {
    const off = reports.find((r) => r.arm === "off");
    if (!off) throw new Error("Block Off paired reference is required in every fold");
    for (const r of reports.filter((x) => x.arm !== "off")) {
      const p = r.total,
        b = off.total;
      const paired = compareBlockEvidence([off, r]).folds[0];
      const uniqueOwned = (report) => {
        const counts = new Map(),
          map = new Map();
        for (const x of report.slices) counts.set(x.sliceKey, (counts.get(x.sliceKey) ?? 0) + 1);
        for (const x of report.slices)
          if (x.allocation === "positive" && counts.get(x.sliceKey) === 1) map.set(x.sliceKey, x);
        return map;
      };
      const offSlices = uniqueOwned(off),
        candidateSlices = uniqueOwned(r);
      let maxMatchedUnitReturnDifference = 0,
        unknownMatchedUnitReturns = 0;
      for (const key of paired.commonSliceKeys) {
        const before = offSlices.get(key).unitR,
          after = candidateSlices.get(key).unitR;
        if (!finite(before) || !finite(after)) unknownMatchedUnitReturns++;
        else
          maxMatchedUnitReturnDifference = Math.max(
            maxMatchedUnitReturnDifference,
            Math.abs(after - before),
          );
      }
      const delta = finite(p.exactPf) && finite(b.exactPf) ? p.exactPf - b.exactPf : null;
      const dd = r.risk?.equityMaxDrawdownFraction,
        baseDd = off.risk?.equityMaxDrawdownFraction;
      const checks = [
        {
          name: "known-comparison-capital",
          ok: [r, off].every((x) => {
            const a = x.settings?.allocation;
            return (
              a &&
              positive(a.balance) &&
              positive(a.leverage) &&
              ["equityPct", "minQty", "fixed"].includes(a.sizingMode) &&
              positive(a.pct) &&
              (a.sizingMode !== "fixed" || positive(a.fixedNotional)) &&
              typeof a.caps?.on === "boolean" &&
              finite(a.caps.maxPositionX) &&
              finite(a.caps.maxExposureX)
            );
          }),
        },
        {
          name: "candidate-owned-entry-sample",
          ok: p.uniqueEntryOrders >= policy.minOwnedEntryOrders,
        },
        { name: "off-owned-entry-sample", ok: b.uniqueEntryOrders >= policy.minOwnedEntryOrders },
        {
          name: "known-candidate-owned-returns",
          ok: !p.unknownAllocations && !p.unknownReturns && finite(p.exactPf),
        },
        {
          name: "known-off-owned-returns",
          ok: !b.unknownAllocations && !b.unknownReturns && finite(b.exactPf),
        },
        { name: "known-funded-cash-reconciliation", ok: !p.unknownSizedPnl && !b.unknownSizedPnl },
        {
          name: "candidate-min-return-pf",
          ok: finite(p.exactPf) && p.exactPf >= policy.minReturnPf,
        },
        {
          name: "paired-return-pf-improvement",
          ok: delta !== null && delta + 1e-12 >= policy.minPairedPfImprovement,
        },
        {
          name: "matched-unit-return-invariance",
          ok:
            paired.commonOwnedSliceCount === 0 ||
            (!unknownMatchedUnitReturns && maxMatchedUnitReturnDifference <= 1e-10),
        },
        {
          name: "absolute-equity-drawdown",
          ok: finite(dd) && dd <= policy.maxEquityDrawdownFraction,
        },
        {
          name: "paired-equity-drawdown",
          ok:
            finite(dd) &&
            finite(baseDd) &&
            dd <= baseDd + policy.maxEquityDrawdownIncreaseFraction + 1e-12,
        },
        { name: "known-external-stack-cap", ok: r.risk?.stack?.knownCapSatisfied === true },
        { name: "feasible-margin", ok: r.risk?.feasible === true },
        { name: "full-native-coverage", ok: r.provenance?.coverage?.complete === true },
        {
          name: "native-book-checks",
          ok: r.book?.checks?.length > 0 && r.book.failedChecks.length === 0,
        },
      ];
      rows.push({
        fold,
        arm: r.arm,
        fullArm: p,
        off: b,
        pairedCommonOwned: {
          n: paired.commonOwnedSliceCount,
          off: paired.arms[0].common,
          candidate: paired.arms[1].common,
          unknownUnitReturns: unknownMatchedUnitReturns,
          maxUnitReturnDifference:
            paired.commonOwnedSliceCount && !unknownMatchedUnitReturns
              ? maxMatchedUnitReturnDifference
              : null,
          matchedUnitReturnsInvariant:
            paired.commonOwnedSliceCount && !unknownMatchedUnitReturns
              ? maxMatchedUnitReturnDifference <= 1e-10
              : null,
          diagnosticOnly: true,
        },
        primaryPfImprovement: delta,
        cashPfDiagnosticImprovement:
          finite(p.cashPfDiagnostic) && finite(b.cashPfDiagnostic)
            ? p.cashPfDiagnostic - b.cashPfDiagnostic
            : null,
        equityDrawdownFraction: numberOrNull(dd),
        offEquityDrawdownFraction: numberOrNull(baseDd),
        equityDrawdownIncreasePercentagePoints:
          finite(dd) && finite(baseDd) ? (dd - baseDd) * 100 : null,
        risk: r.risk,
        checks,
        failedChecks: checks.filter((x) => !x.ok),
        retrospectivePolicyPassed: checks.every((x) => x.ok),
      });
    }
  }
  const armIds = [...new Set(rows.map((x) => x.arm))];
  return {
    schema: "cts-block-performance-policy-v1",
    policy,
    rows,
    arms: armIds.map((arm) => {
      const own = rows.filter((x) => x.arm === arm);
      return {
        arm,
        folds: own.length,
        passesEveryDeclaredFold:
          own.length === folds.size && own.every((x) => x.retrospectivePolicyPassed),
      };
    }),
    noLivePromotion: true,
    interpretation:
      "Full funded arm cohorts are primary. A higher cash PF caused by sizing is never return-PF improvement. External volume alone cannot raise matched-slice unit PF. This retrospective policy is descriptive and cannot qualify exact config siblings or venue execution.",
  };
}
