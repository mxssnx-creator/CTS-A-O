// Pure reduction of frozen native simulation output. This module never calculates strategies or changes gates.
// Overall's admitted-order history, auxiliary candidate histories and Config's own tape are Block inputs;
// none substitutes for the positive-owned settled-slice cohort used by this reducer's primary return PF.
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
const sliceKey = (x) => JSON.stringify([x.cfg, x.sym, x.side, x.entryT, x.exitT, x.kind]);

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
  const hourTypeSides = new Map();
  for (const h of out.hourly)
    for (const kind of TYPES)
      for (const side of [1, -1])
        hourTypeSides.set(`${h.hour}|${kind}|${side}`, {
          hour: h.hour,
          startT: h.startT,
          endT: h.endT,
          kind,
          side,
          rows: [],
        });
  for (const x of rows) {
    const hour = Math.ceil((x.exitT - window.startT) / H) - 1;
    hourTypeSides.get(`${hour}|${x.kind}|${x.side}`).rows.push(x);
  }
  out.byHourTypeSide = [...hourTypeSides.values()].map(({ rows: xs, ...scope }) => ({
    ...scope,
    virtual: summarize(xs, scope, false),
    funded: summarize(xs, scope, true),
  }));
  return out;
}

/** Count simulated ownership without converting endpoint marks into settled return evidence. */
function orderCounts(raw, book, slices) {
  const opens = raw.openEnd ?? [],
    readOpen = allocationReader({
      sizedOrders: (book.sizedOpenOrders ?? []).map((x) => ({ ...x, closeIndex: x.openIndex })),
    });
  const keys = new Set(slices.map((x) => x.orderKey));
  const openStatus = { positive: 0, zero: 0, unknown: 0 };
  let unknownOpenIdentityOrders = 0;
  for (let i = 0; i < opens.length; i++) {
    const x = opens[i];
    if (
      typeof x.cfg !== "string" ||
      typeof x.sym !== "string" ||
      ![1, -1].includes(x.side) ||
      !finite(x.entryT)
    ) {
      unknownOpenIdentityOrders++;
      openStatus.unknown++;
      continue;
    }
    keys.add(orderKey(x));
    openStatus[readOpen({ ...x, exitT: undefined, r: x.mtmR }, i).status]++;
  }
  return {
    modeledUniqueEntryOrders: unknownOpenIdentityOrders ? null : keys.size,
    knownModeledUniqueEntryOrders: keys.size,
    modeledSettledCloseSlices: slices.length,
    modeledOpenOrders: opens.length,
    positiveOwnedSettledCloseSlices: slices.filter((x) => x.allocation === "positive").length,
    zeroAllocatedSettledCloseSlices: slices.filter((x) => x.allocation === "zero").length,
    unknownAllocatedSettledCloseSlices: slices.filter((x) => x.allocation === "unknown").length,
    positiveOwnedOpenOrders: openStatus.positive,
    zeroAllocatedOpenOrders: openStatus.zero,
    unknownAllocatedOpenOrders: openStatus.unknown,
    unknownOpenIdentityOrders,
  };
}

function hourlyStageSnapshots(raw, hourly) {
  return hourly.map(({ hour, startT, endT }) => ({
    hour,
    startT,
    endT,
    validation: (raw.validation ?? []).filter((x) => x.t >= startT && x.t < endT),
    stepsByRange: (raw.stepsByRange ?? []).filter((x) => x.t >= startT && x.t < endT),
  }));
}

/** Native minute-book risk, separate from the closed unit-return curve and five-minute display samples. */
export function blockBookRisk(book, expected) {
  const rounded = book.total ?? {},
    exact = book.frozenBlockRiskExact;
  const exactMinuteTotals = !!(
    exact &&
    expected &&
    typeof expected.fold === "string" &&
    typeof expected.arm === "string" &&
    /^[0-9a-f]{64}$/.test(expected.protocolSha256) &&
    /^[0-9a-f]{64}$/.test(expected.sourceSha256) &&
    finite(expected.window?.startT) &&
    finite(expected.window?.endT) &&
    expected.window.endT > expected.window.startT &&
    exact.schema === "cts-block-native-minute-risk-v1" &&
    exact.fold === expected.fold &&
    exact.arm === expected.arm &&
    exact.protocolSha256 === expected.protocolSha256 &&
    exact.sourceSha256 === expected.sourceSha256 &&
    exact.window?.startT === expected.window?.startT &&
    exact.window?.endT === expected.window?.endT &&
    exact.window?.startT === book.window?.startT &&
    exact.window?.endT === book.window?.endT
  );
  const t = exactMinuteTotals ? exact : rounded,
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
    const marginRatio = x.margin / x.eq,
      grossRatio = leverage === null ? null : (x.margin * leverage) / x.eq;
    if (!finite(marginRatio) || (leverage !== null && !finite(grossRatio))) {
      unknownCurveSamples++;
      continue;
    }
    sampledMarginRatio = Math.max(sampledMarginRatio, marginRatio);
    if (leverage !== null) sampledGrossRatio = Math.max(sampledGrossRatio, grossRatio);
  }
  return {
    basis: exactMinuteTotals
      ? "native-minute-close"
      : "native-simulated-minute-book-rounded-report-fields",
    exactMinuteTotals,
    exactMinuteTotalsStatus: exactMinuteTotals
      ? "verified"
      : exact
        ? "provenance-mismatch-or-unverified"
        : "missing",
    roundedNativeTotals: {
      equityMaxDd: numberOrNull(rounded.equityMaxDd),
      equityMaxDdPct: numberOrNull(rounded.equityMaxDdPct),
      eqMin: numberOrNull(rounded.eqMin),
      marginMax: numberOrNull(rounded.marginMax),
      equityDdtMaxH: numberOrNull(rounded.equityDdtMaxH),
    },
    leverage,
    marginMax,
    equityMin: eqMin,
    equityMaxDrawdownUsd: numberOrNull(t.equityMaxDd),
    equityMaxDrawdownFraction: numberOrNull(t.equityMaxDdPct),
    equityDdtMaxH: numberOrNull(t.equityDdtMaxH),
    peakGrossNotionalUsd:
      marginMax !== null && leverage !== null ? numberOrNull(marginMax * leverage) : null,
    grossToEquityUpperBound:
      marginMax !== null && leverage !== null && eqMin > 0
        ? numberOrNull((marginMax * leverage) / eqMin)
        : null,
    marginToEquityUpperBound:
      marginMax !== null && eqMin > 0 ? numberOrNull(marginMax / eqMin) : null,
    feasible: typeof rounded.feasible === "boolean" ? rounded.feasible : null,
    marginOver: rounded.marginOver ?? null,
    maxOpenOrders: numberOrNull(rounded.maxOpenOrders),
    maxOpenPositions: numberOrNull(rounded.maxOpenPositions),
    caps: rounded.caps ?? null,
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
  if (!frozen) throw new Error("Native frozen Block comparison provenance header is required");
  if (
    frozen.fold !== meta.fold ||
    frozen.arm?.id !== arm ||
    frozen.protocolSha256 !== meta.protocolSha256 ||
    frozen.sourceSha256 !== meta.sourceSha256
  )
    throw new Error("Raw comparison provenance differs from requested provenance");
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
      blockLevels: x.blockLevels ?? null,
      blockEffectiveLevels: x.blockEffectiveLevels ?? null,
      blockSampleCounts: x.blockSampleCounts ?? null,
      blockTraceStatus: [x.blockLevels, x.blockEffectiveLevels, x.blockSampleCounts].every(
        (v) => v !== undefined && v !== null,
      )
        ? "recorded"
        : [x.blockLevels, x.blockEffectiveLevels, x.blockSampleCounts].every((v) => v === undefined)
          ? "not-computed"
          : "partial-or-unknown",
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
    counts: orderCounts(raw, book, slices),
    hourlyStageSnapshots: hourlyStageSnapshots(raw, groups.hourly),
    stagePfAvailability: {
      ownHourlyBasePf: null,
      ownHourlyMainPf: null,
      reason:
        "Exact own config/symbol/direction hourly Base/Main return cohorts are not recorded. Shared hypothetical funnel samples and prior-window selection checks are retained separately; their aggregate PF cannot substitute.",
    },
    slices,
    risk: blockBookRisk(book, { ...meta, arm, window }),
    settings: {
      cost: raw.settings?.cost ?? null,
      block: raw.settings?.block ?? null,
      toggles: raw.settings?.toggles ?? null,
      axisConfiguredEnabled:
        typeof raw.settings?.toggles?.axis === "boolean" ? raw.settings.toggles.axis : null,
    },
    provenance: {
      frozenBlockComparison: raw.frozenBlockComparison ?? null,
      sourceBookEvidence: raw.frozenBlockComparison.sourceBookEvidence ?? null,
      coverage: raw.engine?.coverage ?? null,
      memory: raw.engine?.mem ?? null,
      skips: raw.engine?.skips ?? null,
      sharedBase: raw.engine?.sharedBase ?? null,
      validation: raw.validation ?? [],
      stepsByRange: raw.stepsByRange ?? [],
      funnel: raw.funnel ?? null,
      basePairs: raw.basePairs ?? null,
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
        "Native allocation matched by closeIndex plus complete order/exit identity, volume and total allocated notional. Positive total allocated USD > 1e-9. Zero slices retained outside funded PF; unknown ownership remains inside and invalidates it.",
      cash: "Native sizedPnl reconciled to recorded sized return times unitNotional on precisely the same settled slices as each return summary. Cash PF is a separate diagnostic. No-loss cash ratios are unavailable.",
      volume:
        "maxActualMult is the external Block × coordination mult. maxActualVolume is native total vol including intrinsic Axis/DCA legs and external weighting; it is not multiplied by mult again and intrinsic volume above the external cap is not a cap failure. Per-slice Block legs retain their source weights. Native level is intrinsic ladder level for Axis/DCA and Block level otherwise; it cannot universally be labeled a Block level.",
      blockTrace:
        "Native blockLevels, blockEffectiveLevels and blockSampleCounts are preserved without filling missing values. Missing OFF/excluded traces mean not computed, never zero. Effective levels use enabled/unpaused sources; Signal-own policy can restrict them to config. Sample counts are inspected source-specific closed-history tails: admitted modeled orders for Overall, Real-selected candidates for auxiliary sources and exact own tape closes for Config. They are not counts of funded execution or PF-qualified observations; repeated snapshots are not summed as independent observations.",
      sourceBooks:
        "Overall learns only settled final modeled-Real-entry-admitted orders, before native cash allocation. Symbol, Direction, Indication and Type retain closed Real-selected candidates, including later entry rejects and unfunded candidates. Config retains its exact own cfg/symbol/side tape. These Block input histories are separate from the owned funded settled-slice cohort used for primary return PF; neither admitted model orders nor auxiliary candidates establish funded ownership. Accepted modeled orders also do not establish venue-owned fills.",
      drawdown:
        "Canonical cumulative unit-return closed-slice curve, in percentage points; DDT in hours through bucket end. Entry time is clipped to bucket start. This is not account equity drawdown.",
      partitions:
        "Descriptive separate own-slice groups. Pooled PF never qualifies an empty, losing or unknown config/symbol/direction sibling. Every built config and requested effective Signal config has all requested symbol/direction cells; unbuilt engine coverage remains aggregate and is never invented as a config result. All six native trade types remain visible.",
      hourlyTypes:
        "byHourTypeSide retains every close-hour × native type × direction cell, including zero allocations and unknown evidence; virtual/funded summaries use the same settled-slice math as the whole arm. Close hours are (startT,endT]; hour-level DDT ends at that hour's end.",
      stages:
        "hourlyStageSnapshots groups recorded validation and range steps by their step-start time [startT,endT), preserving checks unchanged. Validation checks describe prior selection windows pooled over symbols/sides, not universally Main or own-side proof; overlapping n values are not summed. Range validated counts are engine configs or Signal active units. Native funnel/basePairs are shared baseline engine diagnostics: beforeBase/afterBase are hypothetical representatives, pool and seated are distinct hypothetical config samples. They are not arm-owned Main PF or per-symbol/direction execution evidence.",
      counts:
        "Modeled unique entry orders deduplicate cfg/symbol/direction/entry time across settled slices and endpoint opens; a partial close and its remaining open order share one entry. Settled slices and modeled open orders are separate counts. Positive/zero/unknown ownership counts use matching native allocations; unknown open identities are retained as unknown. Endpoint marks never enter settled PF. These are simulated allocations, not venue fills. Axis configured state is explicit; a disabled zero sample is not a PF pass.",
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
        if (
          names.has(r.arm) ||
          r.window.startT !== reference.window.startT ||
          r.window.endT !== reference.window.endT ||
          r.protocolSha256 !== reference.protocolSha256 ||
          r.sourceSha256 !== reference.sourceSha256 ||
          !finite(r.settings?.cost) ||
          r.settings.cost !== reference.settings?.cost
        )
          throw new Error(
            "Comparison arms have duplicate identities or incompatible frozen windows/provenance/costs",
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
    note: "Intersection requires one unique exact config/symbol/direction/entry/exit/type close slice in every arm with positive native ownership. Duplicate identities, unknown and zero ownership never borrow matching evidence. Whole-arm losses and unknowns remain in wholeArm; common slices never replace the primary full-arm result.",
  };
}
