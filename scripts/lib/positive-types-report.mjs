import { botFamilyOf, botStatsFromRows } from "../../src/core/bot-stats.ts";
import { unitReturn } from "../../src/core/metrics/stats.ts";

const H = 3_600_000;

function summarize(xs, returnOf, pfBasis = "unit-net-returns") {
  let gp = 0,
    gl = 0;
  let unknownReturns = 0;
  for (const t of xs) {
    const r = returnOf(t);
    if (!Number.isFinite(r)) {
      unknownReturns++;
      continue;
    }
    if (r > 0) gp += r;
    else gl -= r;
  }
  return {
    n: xs.length,
    pfBasis: unknownReturns ? "unavailable" : pfBasis,
    unknownReturns,
    pf: unknownReturns ? null : gl > 0 ? gp / gl : gp > 0 ? Infinity : 0,
    gp: unknownReturns ? null : gp * 100,
    gl: unknownReturns ? null : gl * 100,
    net: unknownReturns ? null : (gp - gl) * 100,
    noLoss: !unknownReturns && gp > 0 && gl === 0,
    pfConvention: "Infinity with profit and no loss; zero for an empty or zero-return sample.",
  };
}

/** Only direct core-session modeled order dumps: r includes the recorded Block × coordination mult. */
export function positiveTypesReport(raw) {
  const { startT, endT } = raw.window ?? {};
  if (!Number.isFinite(startT) || !Number.isFinite(endT) || endT < startT)
    throw new RangeError("Invalid session report bounds");
  const trades = (raw.trades ?? [])
    .filter(
      (t) =>
        !t.markedOpen &&
        t.entryT >= startT &&
        t.entryT < endT &&
        t.exitT > startT &&
        t.exitT <= endT,
    )
    .sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  const byFamily = new Map(),
    byHour = new Map();
  for (const t of trades) {
    const family = botFamilyOf(t.cfg);
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family).push(t);
    const h = Math.floor((t.exitT - 1) / H) * H;
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h).push(t);
  }
  // botStats repricing consumes per-order net return, never the execution-sized projection.
  const rows = trades.map((t) => ({
    id: `${t.cfg}|${t.sym}|${t.side}|${t.entryT}`,
    cfg: t.cfg,
    sym: t.sym,
    side: t.side,
    entry: t.entry,
    exit: t.exit,
    exit_t: t.exitT,
    r: unitReturn(t),
    reason: t.reason,
  }));
  const total = summarize(trades, unitReturn);
  return {
    startT,
    endT,
    basis: "settled-net-unit-simulated-returns",
    total,
    byFamily: [...byFamily].map(([family, xs]) => ({ family, ...summarize(xs, unitReturn) })),
    byHour: [...byHour]
      .sort(([a], [b]) => a - b)
      .map(([t, xs]) => ({ t, ...summarize(xs, unitReturn) })),
    familyStats: total.unknownReturns ? [] : botStatsFromRows(rows).families,
    familyStatsState: total.unknownReturns ? "unavailable" : "unit-net-returns",
    sizedSimulation: {
      basis: "settled-size-weighted-simulated-returns",
      ...summarize(trades, (t) => t.r, "size-weighted-simulated-returns"),
    },
  };
}
