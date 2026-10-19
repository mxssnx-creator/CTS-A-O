import { PF_NO_LOSS } from "../../src/core/config.ts";
import { hourlyNet, settledHourT, statsOf, modeledUnitReturn as unitReturn, modeledUnitStatsOf as unitStatsOf } from "../../src/core/metrics/stats.ts";

const H = 3_600_000;
const pfConvention = `Shared engine no-loss sentinel ${PF_NO_LOSS}; no finite measured ratio when GP > 0 and GL = 0.`;

function summarize(trades, nowT, sized = false) {
  const s = sized ? statsOf(trades, nowT) : unitStatsOf(trades, nowT);
  if (s.pfBasis === "unavailable")
    return {
      ...Object.fromEntries(
        Object.entries(s).map(([k, v]) => [k, typeof v === "number" ? null : v]),
      ),
      n: trades.length,
      unknownReturns: s.unknownReturns,
      noLoss: false,
      exactRatio: null,
      pfConvention,
    };
  return {
    ...s,
    noLoss: s.gp > 0 && s.gl === 0,
    exactRatio: s.gl > 0 ? s.gp / s.gl : s.gp > 0 ? null : 0,
    pfConvention,
  };
}

/**
 * Report ONLY a direct walkForward result: its executed modeled r is tape r × mult.
 * Undo that execution multiplier once for the primary one-unit net-return sample.
 * This is not an actual-account/ledger return normalizer: a live return with size
 * metadata may already be on its owned notional and must never be divided again.
 * Primary totals, kinds and clock hours use the same settled closes. Endpoint
 * marks and size-weighted modeled returns remain separate diagnostics.
 */
export function walkForwardHourlyReport(run) {
  const { startT, endT } = run;
  if (!Number.isFinite(startT) || !Number.isFinite(endT) || endT < startT)
    throw new RangeError("Invalid walk-forward report bounds");
  const entered = (t) => t.entryT >= startT && t.entryT < endT;
  const closed = (run.trades ?? [])
    .filter((t) => !t.markedOpen && entered(t) && t.exitT > startT && t.exitT <= endT)
    .sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  const marks = (run.openAtEnd ?? [])
    .filter((t) => entered(t) && t.exitT === endT)
    .sort((a, b) => a.entryT - b.entryT);
  const unit = (xs) => xs.map((t) => ({ entryT: t.entryT, exitT: t.exitT, r: unitReturn(t) }));
  const unitClosed = unit(closed);
  const rawByKind = new Map();
  const rawByHour = new Map();
  for (const raw of closed) {
    const kind = raw.kind ?? "normal";
    if (!rawByKind.has(kind)) rawByKind.set(kind, []);
    rawByKind.get(kind).push(raw);
    const h = settledHourT(raw.exitT);
    if (!rawByHour.has(h)) {
      rawByHour.set(h, []);
    }
    rawByHour.get(h).push(raw);
  }
  // Use the same exit-bar-end convention as statsOf, including an exit at endT.
  const netByHour = hourlyNet(unitClosed);
  const hourly = [];
  for (let t = Math.floor(startT / H) * H; t < endT; t += H) {
    hourly.push({
      t,
      trades: rawByHour.get(t) ?? [],
      stats: summarize(rawByHour.get(t) ?? [], endT),
      net: Number.isFinite(netByHour.get(t)?.net ?? 0) ? (netByHour.get(t)?.net ?? 0) : null,
      n: netByHour.get(t)?.n ?? 0,
    });
  }
  return {
    startT,
    endT,
    basis: "settled-net-unit-simulated-returns",
    returnUnits: "percentage points; net of the simulator's configured costs",
    stats: summarize(closed, endT),
    byKind: Object.fromEntries([...rawByKind].map(([k, xs]) => [k, summarize(xs, endT)])),
    hourly,
    endpointMarks: summarize(marks, endT),
    withEndpointMarks: summarize(
      [...closed, ...marks].sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT),
      endT,
    ),
    sizedSimulation: {
      basis: "settled-size-weighted-simulated-returns",
      ...summarize(closed, endT, true),
    },
  };
}
