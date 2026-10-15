import { PF_NO_LOSS } from "../../src/core/config.ts";
import { statsOf, unitStatsOf } from "../../src/core/metrics/stats.ts";

export const COMPARISON_BASIS = "settled-net-unit-simulated-returns";
const RETURN_UNITS =
  "percentage points; net of the simulator's configured costs; intrinsic tape legs retained";
const ordered = (trades) => [...trades].sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);

function finishStats(stats, n, unknownReturns, pfBasis) {
  if (unknownReturns) {
    return {
      ...Object.fromEntries(
        Object.entries(stats).map(([k, v]) => [k, typeof v === "number" ? null : v]),
      ),
      n,
      pfBasis: "unavailable",
      unknownReturns,
      noLoss: null,
      exactRatio: null,
      pfConvention: "unavailable",
    };
  }
  const noLoss = stats.gp > 0 && stats.gl === 0;
  return {
    ...stats,
    pfBasis,
    unknownReturns: 0,
    noLoss,
    exactRatio: noLoss ? null : stats.pf,
    pfConvention: noLoss ? "no-loss-sentinel" : "gross-return-ratio",
  };
}

/** Direct modeled executions only: canonical helpers remove their recorded external multiplier once. */
export function comparisonStats(trades, nowT) {
  const s = unitStatsOf(ordered(trades), nowT);
  return finishStats(s, trades.length, s.unknownReturns, s.pfBasis);
}

function sizedSimulation(trades, nowT) {
  const unknown = trades.filter((t) => !Number.isFinite(t.r)).length;
  return {
    basis: "settled-size-weighted-simulated-returns",
    ...finishStats(
      statsOf(ordered(trades), nowT),
      trades.length,
      unknown,
      "size-weighted-simulated-returns",
    ),
  };
}

/** Keep the primary sample settled; endpoint marks and the engine's marked stability stay explicit diagnostics. */
export function comparisonRunReport(run) {
  const { startT, endT } = run;
  if (!Number.isFinite(startT) || !Number.isFinite(endT) || endT < startT)
    throw new RangeError("Invalid walk-forward comparison bounds");
  const entered = (t) => t.entryT >= startT && t.entryT < endT;
  const trades = ordered(
    (run.trades ?? []).filter(
      (t) => !t.markedOpen && entered(t) && t.exitT > startT && t.exitT <= endT,
    ),
  );
  const marks = (run.openAtEnd ?? []).filter((t) => entered(t) && t.exitT === endT);
  const byKind = new Map();
  for (const trade of trades) {
    const kind = trade.kind ?? "normal";
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(trade);
  }
  return {
    trades,
    detail: {
      start: new Date(startT).toISOString().slice(0, 13),
      startT,
      endT,
      basis: COMPARISON_BASIS,
      returnUnits: RETURN_UNITS,
      ...comparisonStats(trades, endT),
      byKind: Object.fromEntries(
        [...byKind].map(([kind, xs]) => [kind, comparisonStats(xs, endT)]),
      ),
      endpointMarks: {
        basis: "endpoint-mark-unit-simulated-returns",
        ...comparisonStats(marks, endT),
      },
      withEndpointMarks: {
        basis: "settled-plus-endpoint-mark-unit-simulated-returns",
        ...comparisonStats([...trades, ...marks], endT),
        engineStable: typeof run.stable === "boolean" ? run.stable : null,
      },
      sizedSimulation: sizedSimulation(trades, endT),
    },
  };
}

export function comparisonAggregate(trades, detail) {
  const endT = detail.length ? Math.max(...detail.map((r) => r.endT)) : undefined;
  const stats = comparisonStats(trades, endT);
  const unavailableRuns = detail.filter(
    (r) => r.pfBasis !== "unit-net-returns" || r.unknownReturns !== 0,
  ).length;
  const days = detail.reduce((sum, r) => sum + (r.endT - r.startT) / 86_400_000, 0);
  return {
    basis: COMPARISON_BASIS,
    returnUnits: RETURN_UNITS,
    ...stats,
    runs: detail.length,
    positiveRuns: unavailableRuns ? null : detail.filter((r) => r.net > 0).length,
    unavailableRuns,
    withEndpointMarksStableRuns: detail.some((r) => r.withEndpointMarks.engineStable === null)
      ? null
      : detail.filter((r) => r.withEndpointMarks.engineStable).length,
    perDay: days > 0 ? trades.length / days : null,
    sizedSimulation: sizedSimulation(trades, endT),
    detail,
  };
}

/** The engine's no-loss score can rank, but an unknown or empty primary sample cannot. */
export function rankableComparison(row, minTrades = 0) {
  return (
    row.pfBasis === "unit-net-returns" &&
    row.unknownReturns === 0 &&
    row.n > 0 &&
    row.n >= minTrades &&
    Number.isFinite(row.pf)
  );
}

export function compareComparisonPf(a, b) {
  const aKnown = rankableComparison(a);
  const bKnown = rankableComparison(b);
  return aKnown && bKnown ? b.pf - a.pf : Number(bKnown) - Number(aKnown);
}

export function comparisonPfText(stats) {
  const unavailable =
    stats.basis === "settled-size-weighted-simulated-returns"
      ? "sized return unavailable"
      : "unit basis unavailable";
  if (stats.pfBasis === "unavailable" || stats.unknownReturns > 0) return unavailable;
  if (!stats.n) return "–";
  if (stats.noLoss) return `No losses (score ${PF_NO_LOSS})`;
  return Number.isFinite(stats.pf) ? stats.pf.toFixed(2) : unavailable;
}
