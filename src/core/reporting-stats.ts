// Reporting keeps real sample counts even when the conservative engine statistic cannot certify unit returns.
import { unitStatsOf, type TradeLike, type UnitReturnLike, type UnitStats } from "./metrics/stats.ts";

const RETURN_FIELDS = ["pf", "gp", "gl", "net", "wins", "losses", "wr", "avg", "mdd", "ddt", "ddtNow", "expectancy", "sqn", "recovery", "greenHours", "gh", "worstHour", "avgHoldMin"] as const;
type ReturnField = (typeof RETURN_FIELDS)[number];
export type ReturnStatsReport = Omit<UnitStats, ReturnField | "n"> & Record<ReturnField, number | null> & {
  n: number;
  noLoss: boolean | null;
  pfConvention: "gross-return-ratio" | "no-loss-sentinel" | "unavailable";
};

/** Missing evidence invalidates the whole primary result; never omit its closes or turn an unknown loss into zero. */
export function unitStatsReport(stats: UnitStats, actualN = stats.n): ReturnStatsReport {
  const known = stats.pfBasis === "unit-net-returns" && stats.unknownReturns === 0;
  const noLoss = known ? stats.gp > 0 && stats.gl === 0 : null;
  const fields = Object.fromEntries(RETURN_FIELDS.map((key) => [key, known ? stats[key] : null])) as Record<ReturnField, number | null>;
  return { ...stats, ...fields, n: actualN, noLoss, pfConvention: !known ? "unavailable" : noLoss ? "no-loss-sentinel" : "gross-return-ratio" };
}

export function unitReturnReport(trades: readonly (TradeLike & UnitReturnLike)[], nowT?: number): ReturnStatsReport {
  return unitStatsReport(unitStatsOf(trades, nowT), trades.length);
}

/** Compact metadata for a chart, lane, config or side; every primary figure describes the same close sample. */
export function returnGroup(report: ReturnStatsReport) {
  const { n, pf, net, wr, gp, gl, noLoss, pfConvention, pfBasis, unknownReturns } = report;
  return { n, pf, net, wr, gp, gl, noLoss, pfConvention, pfBasis, unknownReturns };
}
