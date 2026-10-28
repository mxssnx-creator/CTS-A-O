// Independently qualified, prehistory-derived exit configs for initialized engine indications.
// Candidate MFE is fitted on the older segment only; every protect is then judged on the later completed-bar holdout.
import { createHash } from "node:crypto";
import type { Bars, BotType, ExitConfigSet, Protect, Stats, Tactics, Trade } from "./domain/types.ts";
import type { ComboRun } from "./pipeline/pipeline.ts";
import type { ExitStrategySettings } from "./config.ts";
import { entrySignal } from "./bots/bots.ts";
import {
  INDICATION_BY_ID,
  isSignalInd,
  laneOf,
} from "./indications/registry.ts";
import { isMicroCalculationInd as isMicroFamilyInd, microAnchorTf } from "./indications/micro-family.ts";
import { isLowRangeInd } from "./indications/low-range.ts";
import { isRelateInd, relateAnchorTf } from "./indications/relate.ts";
import { breakAnchorTf, isBreakRelInd } from "./indications/break-config.ts";
import { ddrFails, statsOf } from "./metrics/stats.ts";
import {
  configId,
  evaluationSignal,
  laneProtect,
  parseConfigId,
  passesBase,
  REF_TF,
  seriesOf,
  type Universe,
} from "./pipeline/pipeline.ts";
import { quantileSorted } from "./signal-hist.ts";
import { simulate } from "./sim/backtest.ts";
import { filterEntries, type EntryFilter } from "./sim/walkforward.ts";
import { adjustProtect } from "./adjust.ts";
import { distanceAtFloor } from "./minimal-coord.ts";
import { capSignalProtect, capTrailingOnlyProtect } from "./sim/trailing.ts";

const H = 3_600_000;
/** The shared runtime/worker contract bounds per-message indicator-cache lifetime. */
export const EXIT_HISTORY_MAX_PAIRS = 16;
export const EXIT_BOT = "exit" as const;

export interface ExitStrategyValidation {
  cost: number;
  minPf: number;
  minTrades: number;
  maxDdr?: number;
  /** Same global floors applied by the tape builder to untagged engine cells. */
  minSl: number;
  minTrail: number;
  /** Require hourly consistency only when the holdout has enough active UTC hours to measure it. */
  minGreenHourShare?: number;
  /** Signal Exit keeps the Signals' trailing/stop ceiling during holdout scoring and tape construction. */
  signalTrailMax?: number;
}

export interface ExitStrategyDiagnostics {
  pairs: number;
  baseEvaluated: number;
  basePassed: number;
  baseRejected: number;
  noPrehistory: number;
  insufficientEntries: number;
  candidates: number;
  capped: number;
  evaluated: number;
  trailTooShort: number;
  insufficientTrades: number;
  pfRejected: number;
  greenHourRejected: number;
  ddrRejected: number;
  stabilityRejected: number;
  qualified: number;
}

export const emptyExitStrategyDiagnostics = (): ExitStrategyDiagnostics => ({
  pairs: 0,
  baseEvaluated: 0,
  basePassed: 0,
  baseRejected: 0,
  noPrehistory: 0,
  insufficientEntries: 0,
  candidates: 0,
  capped: 0,
  evaluated: 0,
  trailTooShort: 0,
  insufficientTrades: 0,
  pfRejected: 0,
  greenHourRejected: 0,
  ddrRejected: 0,
  stabilityRejected: 0,
  qualified: 0,
});

/** A sparse holdout has no useful hourly ratio; otherwise require the configured share of positive exit hours. */
export function passesExitHourlyConsistency(
  stats: Pick<Stats, "hours" | "greenHours">,
  minShare: number,
): boolean {
  return minShare <= 0 || stats.hours < 6 || stats.greenHours / stats.hours >= minShare;
}

/** Every disjoint completed-close slice must pass; one old winning cluster cannot mask a losing recent slice. */
export function passesExitValidationSlices(
  trades: readonly Trade[], fromT: number, toT: number, parts: number,
  minTrades: number, minPf: number, maxDdr?: number,
): boolean {
  if (parts === 1) return true;
  if (!Number.isInteger(parts) || parts < 1 || parts > 4 || !(toT > fromT)) return false;
  const slices: Trade[][] = Array.from({ length: parts }, () => []);
  for (const trade of trades) {
    if (trade.exitT <= fromT || trade.exitT > toT) return false;
    const index = Math.max(0, Math.min(parts - 1, Math.ceil((trade.exitT - fromT) * parts / (toT - fromT)) - 1));
    slices[index].push(trade);
  }
  return slices.every(rows => {
    const stats = statsOf(rows);
    return stats.n >= minTrades && stats.net > 0 && stats.pf >= minPf && !ddrFails(stats.mdd, stats.net, maxDdr);
  });
}

const rounded = (x: number) => +x.toFixed(4);
const sideKey = (side: 1 | -1) => (side === 1 ? "long" : "short");

/**
 * Build bot-free Exit relations only for configured, explicit entry-source lanes. A source from one timeframe or
 * family must not silently create a different entry source. Each resulting Exit pair still passes its own Base and
 * holdout gates; appearing here is not evidence that a source is effective.
 */
export function exitStrategyPairs(
  runs: Iterable<Pick<ComboRun, "ind">>,
  u: Universe,
  settings?: Pick<
    ExitStrategySettings,
    "timeframes" | "includeTactics" | "includeRelations" | "includeMicro" | "includeCombined"
  >,
  disabledKinds: readonly string[] = [],
): string[] {
  const pairs = new Set<string>();
  const disabled = new Set(disabledKinds);
  const tfs = settings?.timeframes?.length ? settings.timeframes : [1, 5, 15];
  for (const { ind } of runs) {
    const { base, tf, combined } = laneOf(ind);
    // A legacy source with no lane cannot establish an exact timeframe; never invent one for a fresh Exit.
    if (!base || base === "none" || tf === null || !tfs.includes(tf) ||
      isSignalInd(base) || isLowRangeInd(base) || !seriesOf(u, ind).length) continue;
    const kind = INDICATION_BY_ID.get(base)?.kind;
    if (!kind || disabled.has(kind) || (combined && settings?.includeCombined === false)) continue;
    if (isMicroFamilyInd(base) && (settings?.includeMicro !== true || combined || microAnchorTf(base) !== tf)) continue;
    if (kind === "tactic" && settings?.includeTactics === false) continue;
    if ((isRelateInd(base) || isBreakRelInd(base)) &&
      (settings?.includeRelations === false || combined || (relateAnchorTf(base) ?? breakAnchorTf(base)) !== tf)) continue;
    pairs.add(`${EXIT_BOT}|${ind}`);
  }
  return [...pairs].sort();
}

/**
 * Exit sources for Signals keep the configured source lane exactly. Unlike engine indications, Signals already carry
 * their short/medium source range and lane in the indication id; synthesizing sibling lanes would change identity.
 */
export function exitSignalStrategyPairs(
  runs: Iterable<Pick<ComboRun, "ind">>,
  u: Universe,
  settings?: Pick<ExitStrategySettings, "timeframes" | "includeCombined">,
): string[] {
  const inds = new Set<string>();
  for (const run of runs) {
    const { tf, combined } = laneOf(run.ind);
    if (isSignalInd(run.ind) && tf !== null &&
      (!settings?.timeframes?.length || settings.timeframes.includes(tf)) &&
      (!combined || settings?.includeCombined !== false) && seriesOf(u, run.ind).length) inds.add(run.ind);
  }
  return [...inds].sort().map((ind) => `${EXIT_BOT}|${ind}`);
}

/** Apply the Normal system's Base return-PF gate to standalone Exit pairs. */
export function qualifyExitBase(
  runs: Iterable<{
    bot: string;
    ind: string;
    full: Pick<Stats, "n" | "pf" | "net" | "mdd">;
  }>,
  settings: Pick<ExitStrategySettings, "minPf">,
  gates: { minPf: number; minTrades: number; maxDdr?: number },
): { evaluated: Set<string>; passed: Set<string>; rejected: number } {
  const evaluated = new Set<string>();
  const passed = new Set<string>();
  for (const run of runs) {
    if (run.bot !== EXIT_BOT) continue;
    const pair = `${EXIT_BOT}|${run.ind}`;
    evaluated.add(pair);
    const minPf = Math.max(gates.minPf, settings.minPf, 1.1);
    if (passesBase(run.full, { ...gates, minPf })) passed.add(pair);
  }
  return { evaluated, passed, rejected: evaluated.size - passed.size };
}

/** Deterministically spread a per-pair cap across independent tactic and direction groups. */
export function capExitCandidates<T>(groups: readonly (readonly T[])[], max: number): T[] {
  const out: T[] = [];
  const offsets = groups.map(() => 0);
  while (out.length < max) {
    let added = false;
    for (let i = 0; i < groups.length && out.length < max; i++) {
      const item = groups[i][offsets[i]++];
      if (item === undefined) continue;
      out.push(item);
      added = true;
    }
    if (!added) break;
  }
  return out;
}

function barsViewThroughCut(b: Bars, cutT: number): Bars {
  let n = 0;
  const tf = b.tfMin * 60_000;
  while (n < b.n && b.t[n] + tf <= cutT) n++;
  if (n === b.n) return b;
  return {
    ...b,
    n,
    t: b.t.subarray(0, n),
    o: b.o.subarray(0, n),
    h: b.h.subarray(0, n),
    l: b.l.subarray(0, n),
    c: b.c.subarray(0, n),
    v: b.v.subarray(0, n),
  };
}

/** Fingerprint only the closed prehistory each exit fit can read; future bars cannot invalidate a causal result. */
export function exitHistoryFingerprint(u: Universe, pairs: Iterable<string>, cutT: number): string {
  const hash = createHash("sha256");
  const identities = [...new Set(pairs)].sort();
  // Exact pair inventory is an input too: different bots/indications can reference identical candle series.
  hash.update(JSON.stringify(identities));
  hash.update("\0");
  const series = new Set<number>();
  for (const pair of identities) {
    const ind = pair.split("|")[1];
    if (ind) for (const s of seriesOf(u, ind)) series.add(s);
  }
  for (const s of [...series].sort((x, y) => x - y)) {
    const bars = u.bars[s];
    if (!bars) continue;
    let n = 0;
    const tfMs = bars.tfMin * 60_000;
    while (n < bars.n && bars.t[n] + tfMs <= cutT) n++;
    hash.update(`${bars.sym}\0${bars.tfMin}\0${n}\0`);
    for (const col of [bars.t, bars.o, bars.h, bars.l, bars.c, bars.v])
      hash.update(Buffer.from(col.buffer, col.byteOffset, n * Float64Array.BYTES_PER_ELEMENT));
  }
  return hash.digest("hex");
}

/** Shared completed-bar extrema for both directions; each bar enters/leaves each O(hold) deque once. */
export function entryExcursions(
  b: Bars,
  sig: Int8Array,
  hold: number,
  cutT: number,
  fromT: number,
  mfeBySide: Record<1 | -1, number[]>,
  maeBySide: Record<1 | -1, number[]>,
): void {
  if (!Number.isInteger(hold) || hold < 1 || hold >= b.n) return;
  const tfMs = b.tfMin * 60_000;
  const highs = new Int32Array(hold);
  const lows = new Int32Array(hold);
  let highHead = 0;
  let highSize = 0;
  let lowHead = 0;
  let lowSize = 0;
  let finiteLows = 0;
  let lastBar = 0;
  let dequeFrom = 1;
  for (let i = 0; i + hold < b.n; i++) {
    const side = sig[i];
    if (side !== 1 && side !== -1) continue;
    const first = i + 1;
    const end = i + hold;
    if (b.t[first] < fromT) continue;
    if (b.t[end] + tfMs > cutT) break;
    const entry = b.o[first];
    if (!(entry > 0)) continue;
    if (first > lastBar) {
      // Non-overlapping signal windows need no work on the bars between them.
      highHead = highSize = lowHead = lowSize = finiteLows = 0;
      lastBar = first - 1;
      dequeFrom = first;
    }
    for (let j = lastBar + 1; j <= end; j++) {
      const windowFirst = j - hold + 1;
      while (highSize && highs[highHead] < windowFirst) {
        highHead = (highHead + 1) % hold;
        highSize--;
      }
      while (lowSize && lows[lowHead] < windowFirst) {
        lowHead = (lowHead + 1) % hold;
        lowSize--;
      }
      if (!Number.isNaN(b.h[j])) {
        while (highSize && b.h[highs[(highHead + highSize - 1) % hold]] <= b.h[j]) highSize--;
        highs[(highHead + highSize) % hold] = j;
        highSize++;
      }
      if (!Number.isNaN(b.l[j])) {
        while (lowSize && b.l[lows[(lowHead + lowSize - 1) % hold]] >= b.l[j]) lowSize--;
        lows[(lowHead + lowSize) % hold] = j;
        lowSize++;
      }
      if (Number.isFinite(b.l[j])) finiteLows++;
      if (j - hold >= dequeFrom && Number.isFinite(b.l[j - hold])) finiteLows--;
    }
    lastBar = end;
    // Preserve the original comparison semantics for missing/extreme prices too: NaN contributes nothing.
    const up = entry === Infinity ? 0 : highSize ? b.h[highs[highHead]] / entry - 1 : 0;
    const down =
      entry === Infinity ? Number(finiteLows > 0) : lowSize ? 1 - b.l[lows[lowHead]] / entry : 0;
    const favorable = side === 1 ? up : down;
    const adverse = side === 1 ? down : up;
    mfeBySide[side].push(favorable > 0 ? favorable : 0);
    maeBySide[side].push(adverse > 0 ? adverse : 0);
  }
}

export function exitProtectCandidates(
  mfe: readonly number[],
  mae: readonly number[],
  side: 1 | -1,
  hold: number,
  settings: ExitStrategySettings,
  validation: ExitStrategyValidation,
): Record<ExitConfigSet, Protect[]> {
  if (!(Number.isFinite(validation.minTrail) && validation.minTrail >= 0))
    throw new RangeError("Exit trailing floor must be finite and nonnegative");
  // Config IDs retain six decimal places. Round upward so the captured entry floor cannot be understated.
  const exitTrailFloor = validation.minTrail > 0 ? distanceAtFloor(validation.minTrail, validation.minTrail, 6) : 0;
  const bySet: Record<ExitConfigSet, Protect[]> = {
    "static-sl": [],
    "adaptive-sl": [],
    trailing: [],
    breakeven: [],
    "trailing-only": [],
  };
  const seen = new Set<string>();
  const adverseStops = settings.stopQuantiles
    .map((q) => quantileSorted(mae, q))
    .filter(Number.isFinite);
  const add = (exitSet: ExitConfigSet, tp: number, slRaw: number, trail: number) => {
    if (!(tp > 0 && slRaw > 0 && slRaw >= validation.minSl && slRaw <= settings.maxSl)) return;
    if (trail > 0 && !(trail >= validation.minTrail && trail < tp)) return;
    const p: Protect = {
      tp,
      sl: rounded(slRaw),
      trail: rounded(trail),
      hold,
      exitType: "historic",
      exitSide: side,
      exitSet,
      ...(trail > 0 && exitTrailFloor > 0 ? { exitTrailFloor } : {}),
    };
    const key = `${exitSet}|${p.tp}|${p.sl}|${p.trail}|${p.trailStep ?? 1}|${p.hold}|${sideKey(side)}`;
    if (seen.has(key)) return;
    seen.add(key);
    bySet[exitSet].push(p);
  };
  for (const q of settings.quantiles) {
    const tp = rounded(Math.min(settings.maxTp, Math.max(settings.minTp, quantileSorted(mfe, q))));
    if (!Number.isFinite(tp) || tp <= 0) continue;
    // Static SL candidates use a TP-relative distance. Adaptive SL candidates derive their initial
    // distance from historical MAE; the independent dynamic Exit controls manage later adjustments.
    for (const stopMultiple of settings.stopMultiples) {
      const sl = Math.min(settings.maxSl, Math.max(validation.minSl, tp * stopMultiple));
      add("static-sl", tp, sl, 0);
      add("breakeven", tp, sl, 0);
    }
    for (let i = 0; i < settings.stopQuantiles.length; i++) {
      const sl = Math.min(settings.maxSl, Math.max(validation.minSl, adverseStops[i] ?? 0));
      add("adaptive-sl", tp, sl, 0);
      for (const trailShare of settings.trailShares) {
        const trail = Math.max(tp * trailShare, validation.minTrail);
        add("trailing", tp, sl, trail);
      }
    }
  }
  // The fitted MFE quantile is the no-TP trail activation distance; trailShare independently controls the gap.
  for (const q of settings.quantiles) {
    const activation = rounded(
      Math.min(settings.maxTp, Math.max(settings.minTp, quantileSorted(mfe, q))),
    );
    if (!(activation > 0) || !Number.isFinite(activation)) continue;
    for (let i = 0; i < settings.stopQuantiles.length; i++) {
      const sl = Math.min(settings.maxSl, Math.max(validation.minSl, adverseStops[i] ?? 0));
      if (!(sl > 0 && sl >= validation.minSl && sl <= settings.maxSl)) continue;
      for (const share of settings.trailShares) {
        const trail = Math.max(activation, validation.minTrail);
        if (!(trail > 0)) continue;
        const p: Protect = {
          tp: 0,
          sl: rounded(sl),
          trail: rounded(trail),
          trailStep: share,
          trailOnly: true,
          hold,
          exitType: "historic",
          exitSide: side,
          exitSet: "trailing-only",
          ...(exitTrailFloor > 0 ? { exitTrailFloor } : {}),
        };
        const key = `trailing-only|${p.sl}|${p.trail}|${p.trailStep}|${p.hold}|${sideKey(side)}`;
        if (!seen.has(key)) {
          seen.add(key);
          bySet["trailing-only"].push(p);
        }
      }
    }
  }
  return bySet;
}

/**
 * For each initialized engine pair, fit TP/SL candidates only on older prehistory and validate on its later part.
 * Five range-independent Exit sets × both directions receive independent fits, identities and holdout evaluations.
 */
export function* exitStrategyProtectsGen(
  u: Universe,
  pairs: Iterable<string>,
  settings: ExitStrategySettings,
  _tactics: Tactics | null | undefined,
  cutT: number,
  validation: ExitStrategyValidation,
  diagnostics: ExitStrategyDiagnostics = emptyExitStrategyDiagnostics(),
  entryFilters?: Readonly<Record<string, EntryFilter>>,
): Generator<void, Record<string, Protect[]>> {
  const out: Record<string, Protect[]> = {};
  if (!settings.enabled) return out;
  for (const pair of pairs) {
    const [botRaw, ind] = pair.split("|");
    if (!botRaw || !ind) continue;
    const bot = botRaw as BotType;
    diagnostics.pairs++;
    const series = seriesOf(u, ind);
    const earliest = series.reduce((t, s) => Math.min(t, u.bars[s].t[0] ?? Infinity), Infinity);
    const fromT = Math.max(
      u.evaluationFromT ?? earliest,
      settings.lookbackH > 0 ? cutT - settings.lookbackH * H : -Infinity,
    );
    if (!Number.isFinite(fromT) || fromT >= cutT) {
      diagnostics.noPrehistory++;
      continue;
    }
    const availableH = (cutT - fromT) / H;
    const fitCutT = fromT + availableH * settings.trainFraction * H;
    const laneTf = laneOf(ind).tf ?? REF_TF;
    const fitH = (fitCutT - fromT) / H;
    const profiles = [
      { holdH: settings.holdH, distance: 1, basis: "extrema" as const },
      ...(isSignalInd(ind) ? settings.signalRanges ?? [] : []),
    ];
    const fits = profiles.map((profile) => ({
      ...profile,
      holdRef: Math.max(2, Math.round((Math.max((2 * laneTf) / 60,
        Math.min(profile.holdH, fitH / 4)) * 60) / REF_TF)),
      mfe: { 1: [], [-1]: [] } as Record<1 | -1, number[]>,
      mae: { 1: [], [-1]: [] } as Record<1 | -1, number[]>,
    }));
    const entryFilter = entryFilters?.[pair];
    const validationSignals: Array<{
      s: number;
      bars: Bars;
      long: Int8Array;
      short: Int8Array;
    }> = [];
    for (const s of series) {
      yield;
      const b = u.bars[s];
      // Exit qualifies its own complete indication history; range-engine remove-only tactics cannot pre-admit it.
      let sig = entrySignal(bot, ind, u.caches[s], null);
      if (!sig) continue;
      if (isSignalInd(ind) && entryFilter && (entryFilter.trendH > 0 || entryFilter.volFloor > 0))
        sig = filterEntries(sig, b, u.caches[s], entryFilter);
      sig = evaluationSignal(u, b, sig);
      for (const fit of fits) {
        const holdBars = laneProtect({ tp: 0, sl: 0, trail: 0, hold: fit.holdRef }, ind).hold;
        // Close-change structure uses real entry opens and completed closes only. Validation below
        // always uses the real OHLC bars, including adverse wicks and gaps.
        const fitBars = fit.basis === "close" ? { ...b, h: b.c, l: b.c } : b;
        entryExcursions(fitBars, sig, holdBars, fitCutT, fromT, fit.mfe, fit.mae);
        yield;
      }
      const validationBars = barsViewThroughCut(b, cutT);
      const long = new Int8Array(validationBars.n);
      const short = new Int8Array(validationBars.n);
      for (let i = 0; i < validationBars.n; i++) {
        const entryT =
          i + 1 < validationBars.n
            ? validationBars.t[i + 1]
            : validationBars.t[i] + validationBars.tfMin * 60_000;
        if (i + 1 >= validationBars.n || entryT < fitCutT || entryT >= cutT) continue;
        if (sig[i] === 1) long[i] = 1;
        else if (sig[i] === -1) short[i] = -1;
      }
      validationSignals.push({ s, bars: validationBars, long, short });
    }
    if (fits.every((fit) => fit.mfe[1].length < settings.minEntries && fit.mfe[-1].length < settings.minEntries)) {
      diagnostics.insufficientEntries++;
      continue;
    }
    const groups: Protect[][] = [];
    const fitted = fits.map((fit) => {
      const bySide: Partial<Record<1 | -1, Record<ExitConfigSet, Protect[]>>> = {};
      for (const side of [1, -1] as const) {
        const mfe = fit.mfe[side].map((v) => v * fit.distance).sort((a, b) => a - b);
        const mae = fit.mae[side].map((v) => v * fit.distance).sort((a, b) => a - b);
        if (mfe.length >= settings.minEntries && mae.length >= settings.minEntries)
          bySide[side] = exitProtectCandidates(mfe, mae, side, fit.holdRef, settings, validation);
      }
      return bySide;
    });
    for (const exitSet of ["static-sl", "adaptive-sl", "trailing", "breakeven", "trailing-only"] as const)
      for (const side of [1, -1] as const) {
        // Round-robin profiles inside every tactic/side so a bounded cap cannot spend all slots
        // on the original horizon. Economically identical fits consume one slot only.
        const variants = fitted.map((fit) => fit[side]?.[exitSet] ?? []);
        const merged = capExitCandidates(variants, variants.reduce((n, xs) => n + xs.length, 0));
        const seen = new Set<string>();
        groups.push(merged.filter((p) => {
          const id = configId(bot, ind, p);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        }));
      }
    // Failed fits must not consume the executable-config budget. Qualify every bounded
    // generated cell first, then share the retained budget across tactic/direction groups.
    const candidates = capExitCandidates(groups, groups.reduce((n, xs) => n + xs.length, 0));
    diagnostics.candidates += candidates.length;
    const kept: Protect[] = [];
    const ids = new Set<string>();
    for (const p of candidates) {
      const qualifiedProtect = entryFilter
        ? capSignalProtect({ ...p, trailMax: validation.signalTrailMax ?? p.trailMax })
        : p;
      const lane = laneProtect(qualifiedProtect, ind);
      // Match historical Signal tape eligibility before scoring. The gap (activation ×
      // trailStep), not just activation, must meet the floor. Otherwise a qualified fit
      // disappears when the executable catalog rejects it.
      if (isSignalInd(ind) && lane.trail > 0 &&
          lane.trail * (lane.trailStep ?? 1) + 1e-12 < validation.minTrail) {
        diagnostics.trailTooShort++;
        continue;
      }
      const adjusted = lane.tag ? lane : adjustProtect(lane, validation);
      const actual = entryFilter
        ? capSignalProtect({ ...adjusted, trailMax: validation.signalTrailMax ?? qualifiedProtect.trailMax })
        : adjusted;
      // Signal and no-TP ceilings can conflict with the candidate's own floor. Never qualify a protection that
      // the executable simulator would cap below it; report the conflict instead of silently changing the contract.
      const capped = isSignalInd(ind) ? capSignalProtect(actual) : capTrailingOnlyProtect(actual);
      if (capped.exitTrailFloor !== undefined &&
          capped.trail * (capped.trailStep ?? 1) + 1e-12 < capped.exitTrailFloor) {
        diagnostics.trailTooShort++;
        continue;
      }
      const side = p.exitSide!;
      const trades: import("./domain/types.ts").Trade[] = [];
      yield;
      for (const { s, bars: b, long, short } of validationSignals) {
        if (b.n < 2) continue;
        const result = simulate(configId(bot, ind, lane), b, side === 1 ? long : short, actual, {
          cost: validation.cost,
          cooldown: 0,
          atr: actual.atr ? u.caches[s].atrEma(14) : undefined,
        });
        trades.push(...result.trades);
      }
      trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || b.side - a.side);
      const stats = statsOf(trades);
      diagnostics.evaluated++;
      if (stats.n < Math.max(settings.minValidationTrades, validation.minTrades)) {
        diagnostics.insufficientTrades++;
        continue;
      }
      // Avoid qualifying candidates whose pooled edge comes from a small cluster of winning hours.
      // Sparse holdouts (<6 active hours) retain the existing PF/DDR gates because hourly ratios are noisy there.
      const minGreenHourShare = Math.max(
        settings.minGreenHourShare ?? 0,
        validation.minGreenHourShare ?? 0,
      );
      if (!passesExitHourlyConsistency(stats, minGreenHourShare)) {
        diagnostics.greenHourRejected++;
        continue;
      }
      if (!(stats.net > 0 && stats.pf >= Math.max(settings.minPf, validation.minPf))) {
        diagnostics.pfRejected++;
        continue;
      }
      const maxDdr =
        validation.maxDdr && validation.maxDdr > 0
          ? Math.min(settings.maxDdr || Infinity, validation.maxDdr)
          : settings.maxDdr || undefined;
      if (ddrFails(stats.mdd, stats.net, maxDdr)) {
        diagnostics.ddrRejected++;
        continue;
      }
      if (!passesExitValidationSlices(trades, fitCutT, cutT, settings.validationSlices ?? 1,
        Math.max(settings.minValidationTrades, validation.minTrades), Math.max(settings.minPf, validation.minPf), maxDdr)) {
        diagnostics.stabilityRejected++;
        continue;
      }
      const id = configId(bot, ind, qualifiedProtect);
      if (!ids.has(id)) {
        ids.add(id);
        kept.push(qualifiedProtect);
      }
    }
    const retained = capExitCandidates(groups.map(group => {
      const groupIds = new Set(group.map(p => configId(bot, ind, entryFilter
        ? capSignalProtect({ ...p, trailMax: validation.signalTrailMax ?? p.trailMax }) : p)));
      return kept.filter(p => groupIds.has(configId(bot, ind, p)));
    }), settings.maxConfigsPerPair);
    diagnostics.capped += kept.length - retained.length;
    diagnostics.qualified += retained.length;
    if (retained.length) out[pair] = retained;
  }
  return out;
}

/** Local fitting has the same bounded indicator-cache lifetime as a worker's maximum-size message. */
export function* exitStrategyProtectsBoundedGen(
  u: Universe,
  pairs: Iterable<string>,
  settings: ExitStrategySettings,
  tactics: Tactics | null | undefined,
  cutT: number,
  validation: ExitStrategyValidation,
  diagnostics: ExitStrategyDiagnostics = emptyExitStrategyDiagnostics(),
  entryFilters?: Readonly<Record<string, EntryFilter>>,
): Generator<void, Record<string, Protect[]>> {
  const out: Record<string, Protect[]> = {};
  if (!settings.enabled) return out;
  function* fit(chunk: string[]): Generator<void> {
    try {
      Object.assign(
        out,
        yield* exitStrategyProtectsGen(
          u,
          chunk,
          settings,
          tactics,
          cutT,
          validation,
          diagnostics,
          entryFilters,
        ),
      );
    } finally {
      for (const cache of u.caches) cache.clear();
    }
  }
  let chunk: string[] = [];
  for (const pair of pairs) {
    chunk.push(pair);
    if (chunk.length === EXIT_HISTORY_MAX_PAIRS) {
      yield* fit(chunk);
      chunk = [];
    }
  }
  if (chunk.length) yield* fit(chunk);
  return out;
}

/** Rebuild exactly the 15m-reference protect represented by a held historic exit id. */
export function heldExitProtect(id: string): { pair: string; protect: Protect } | null {
  const parsed = parseConfigId(id);
  if (
    !parsed ||
    parsed.protect.exitType !== "historic" ||
    !parsed.protect.exitSide ||
    parsed.protect.atr
  )
    return null;
  const tf = laneOf(parsed.ind).tf ?? REF_TF;
  const p: Protect = {
    ...parsed.protect,
    hold: Math.max(2, Math.round((parsed.protect.hold * tf) / REF_TF)),
  };
  if (!p.tag && !p.exitSet) {
    for (const f of ["tp", "sl", "trail"] as const) {
      const target = parsed.protect[f];
      if (target <= 0) {
        p[f] = 0;
        continue;
      }
      let lo = 0;
      let hi = Math.max(target * 4, 0.01);
      const image = (ref: number) => laneProtect({ ...p, [f]: ref }, parsed.ind)[f];
      while (image(hi) < target - 1e-9) hi *= 2;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (image(mid) < target) lo = mid;
        else hi = mid;
      }
      if (Math.abs(image(hi) - target) >= 1e-4) return null;
      p[f] = hi;
    }
  }
  const outId = configId(parsed.bot, parsed.ind, laneProtect(p, parsed.ind));
  return outId === id ? { pair: `${parsed.bot}|${parsed.ind}`, protect: p } : null;
}
