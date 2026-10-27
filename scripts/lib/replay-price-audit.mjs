import { modeledUnitReturn } from "../../src/core/metrics/stats.ts";

/** Independent minute-candle and recorded-price check for plain Normal/Trailing modeled session dumps. */
export function auditReplayPrices(feed, session) {
  const source = feed?.candles, cost = session?.settings?.cost;
  if (!source || typeof source !== "object" || Array.isArray(source) || !Number.isFinite(cost) || cost < 0 ||
      !Array.isArray(session?.trades) || !Array.isArray(session?.openEnd))
    throw new TypeError("A candle feed, explicit cost, settled orders and open orders are required");
  const bars = new Map();
  let candleCount = 0, gaps = 0, duplicateBars = 0, invalidBars = 0, series = 0;
  for (const [key, candles] of Object.entries(source)) {
    if (!key.endsWith("|1") || !Array.isArray(candles)) { invalidBars++; continue; }
    series++;
    let previous;
    for (const c of candles) {
      candleCount++;
      if (previous !== undefined) {
        if (c?.t === previous) duplicateBars++;
        else if (c?.t - previous !== 60_000) gaps++;
      }
      previous = c?.t;
      if (![c?.t, c?.o, c?.h, c?.l, c?.c, c?.v].every(Number.isFinite) ||
          !(c.o > 0 && c.c > 0 && c.l > 0 && c.h >= Math.max(c.o, c.c) &&
            c.l <= Math.min(c.o, c.c) && c.h >= c.l && c.v >= 0)) invalidBars++;
      bars.set(`${key}|${c?.t}`, c);
    }
  }
  const validations = Array.isArray(session.validation) ? session.validation : [];
  let invalidValidationSteps = 0, invalidValidationChecks = 0, duplicateChecks = 0, invalidSelections = 0,
    duplicateSelections = 0, missingSeatChecks = 0, failedSeatChecks = 0, seats = 0;
  const steps = [];
  for (const step of validations) {
    if (!Number.isFinite(step?.t) || !Array.isArray(step.real) || !Array.isArray(step.checks) ||
        (steps.length && step.t <= steps.at(-1).t)) { invalidValidationSteps++; continue; }
    const selected = new Set(step.real), checks = new Map();
    for (const row of step.checks) {
      if (!Array.isArray(row) || typeof row[0] !== "string" || !row[0] || ![0, 1].includes(row[1])) {
        invalidValidationChecks++;
        continue;
      }
      if (checks.has(row[0])) duplicateChecks++;
      checks.set(row[0], row[1]);
    }
    duplicateSelections += step.real.length - selected.size;
    for (const id of step.real) {
      seats++;
      if (typeof id !== "string" || !id) { invalidSelections++; continue; }
      if (!checks.has(id)) missingSeatChecks++;
      else if (checks.get(id) !== 1) failedSeatChecks++;
    }
    steps.push({ t: step.t, selected });
  }
  let unsupportedOrders = 0, missingEntryBars = 0, badEntryPrices = 0, badEntryOpens = 0, missingExitBars = 0,
    badExitPrices = 0, invalidOrderTimes = 0, unknownReturns = 0, badReturns = 0, notSelected = 0, noSelectionTime = 0, maxReturnError = 0;
  for (const [index, order] of [...session.trades, ...session.openEnd].entries()) {
    const lane = typeof order?.cfg === "string" ? order.cfg.match(/@m(\d+)/) : null;
    const tf = lane ? Number(lane[1]) : 0;
    const size = order?.mult, volume = order?.vol;
    // Plain strategies have no intrinsic ladder: their total volume must match the captured external multiplier.
    // A missing size or an adjusted order with no measured volume cannot prove normalization.
    const sizeKnown = Number.isFinite(size) && size > 0 &&
      (volume === undefined ? size === 1 : Number.isFinite(volume) && volume > 0 &&
        Math.abs(volume - size) <= 1e-8 * Math.max(1, Math.abs(size)));
    if (!Number.isInteger(tf) || tf < 1 || tf > 1440 || !["normal", "trailing", "trailing-only"].includes(order?.kind) ||
        ![1, -1].includes(order.side) || !Number.isFinite(order.entryT) || !Number.isFinite(order.entry) || !(order.entry > 0) ||
        !sizeKnown) {
      unsupportedOrders++;
      continue;
    }
    // Binary search: the last published selection at or before the order's entry time.
    let lo = 0, hi = steps.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (steps[mid].t <= order.entryT) lo = mid + 1; else hi = mid; }
    const selection = steps[lo - 1];
    if (!selection) noSelectionTime++;
    else if (!selection.selected.has(order.cfg)) notSelected++;
    const key = `${order.sym}|1`, entry = bars.get(`${key}|${order.entryT}`);
    if (!entry) missingEntryBars++;
    else {
      if (order.entry < entry.l * (1 - 2e-6) || order.entry > entry.h * (1 + 2e-6)) badEntryPrices++;
      // These supported plain simulated entries fill on the next lane bar's open, which is also the first
      // minute's open. Merely being inside the candle range could conceal an intrabar/lookahead price.
      if (Math.abs(order.entry - entry.o) > 2e-6 * entry.o) badEntryOpens++;
    }
    if (index >= session.trades.length) continue;
    if (!Number.isFinite(order.exitT) || !Number.isFinite(order.exit)) { missingExitBars++; continue; }
    if (order.exitT < order.entryT) invalidOrderTimes++;
    let low = Infinity, high = -Infinity, count = 0;
    for (let t = order.exitT - tf * 60_000; t < order.exitT; t += 60_000) {
      const b = bars.get(`${key}|${t}`);
      if (b) { low = Math.min(low, b.l); high = Math.max(high, b.h); count++; }
    }
    if (count !== tf) missingExitBars++;
    else if (order.exit < low * (1 - 2e-6) || order.exit > high * (1 + 2e-6)) badExitPrices++;
    const r = modeledUnitReturn(order);
    if (!Number.isFinite(r)) unknownReturns++;
    else {
      const expected = order.side * (order.exit - order.entry) / order.entry - cost;
      const error = Math.abs(r - expected);
      maxReturnError = Math.max(maxReturnError, error);
      if (error > 1e-6) badReturns++;
    }
  }
  const failures = { gaps, duplicateBars, invalidBars, invalidValidationSteps, invalidValidationChecks, duplicateChecks,
    invalidSelections, duplicateSelections, missingSeatChecks, failedSeatChecks, unsupportedOrders, missingEntryBars,
    badEntryPrices, badEntryOpens, missingExitBars, badExitPrices, invalidOrderTimes,
    unknownReturns, badReturns, notSelected, noSelectionTime };
  return { scope: "plain modeled orders against 1m candles and hourly selections; not actual fills or per-entry Last-N proof",
    ok: series > 0 && steps.length > 0 && Object.values(failures).every(n => n === 0),
    candleSeries: series, candleCount, settledOrders: session.trades.length, openOrders: session.openEnd.length,
    validationSteps: steps.length, selectedSeats: seats, cost, failures, maxReturnError };
}
