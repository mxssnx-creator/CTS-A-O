// Independently qualified, prehistory-derived exit configs for initialized engine indications.
// Candidate MFE is fitted on the older segment only; every protect is then judged on the later completed-bar holdout.
import { createHash } from "node:crypto";
import type { Bars, BotType, ExitConfigSet, Protect, Tactics } from "./domain/types.ts";
import type { ComboRun } from "./pipeline/pipeline.ts";
import type { ExitStrategySettings } from "./config.ts";
import { entrySignal } from "./bots/bots.ts";
import { isSignalInd, laneOf } from "./indications/registry.ts";
import { ddrFails, statsOf } from "./metrics/stats.ts";
import {
  configId,
  evaluationSignal,
  laneProtect,
  parseConfigId,
  REF_TF,
  seriesOf,
  type Universe,
} from "./pipeline/pipeline.ts";
import { quantileSorted } from "./signal-hist.ts";
import { simulate } from "./sim/backtest.ts";
import { filterEntries, type EntryFilter } from "./sim/walkforward.ts";
import { adjustProtect } from "./adjust.ts";

const H = 3_600_000;
/** The shared runtime/worker contract bounds per-message indicator-cache lifetime. */
export const EXIT_HISTORY_MAX_PAIRS = 16;

export interface ExitStrategyValidation {
  cost: number;
  minPf: number;
  minTrades: number;
  maxDdr?: number;
  /** Same global floors applied by the tape builder to untagged engine cells. */
  minSl: number;
  minTrail: number;
}

export interface ExitStrategyDiagnostics {
  pairs: number;
  noPrehistory: number;
  insufficientEntries: number;
  candidates: number;
  capped: number;
  evaluated: number;
  insufficientTrades: number;
  pfRejected: number;
  ddrRejected: number;
  qualified: number;
}

export const emptyExitStrategyDiagnostics = (): ExitStrategyDiagnostics => ({
  pairs: 0,
  noPrehistory: 0,
  insufficientEntries: 0,
  candidates: 0,
  capped: 0,
  evaluated: 0,
  insufficientTrades: 0,
  pfRejected: 0,
  ddrRejected: 0,
  qualified: 0,
});

const rounded = (x: number) => +x.toFixed(4);
const sideKey = (side: 1 | -1) => (side === 1 ? "long" : "short");

/** Every initialized engine pair is eligible for independent Exit history, regardless of Base PF or range tags. */
export function exitStrategyPairs(
  runs: Iterable<Pick<ComboRun, "bot" | "ind">>,
  u: Universe,
): string[] {
  const pairs = new Set<string>();
  for (const run of runs) if (!isSignalInd(run.ind)) pairs.add(`${run.bot}|${run.ind}`);
  return [...pairs]
    .filter((pair) => seriesOf(u, pair.slice(pair.indexOf("|") + 1)).length > 0)
    .sort();
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
  const bySet: Record<ExitConfigSet, Protect[]> = {
    "static-sl": [],
    "adaptive-sl": [],
    trailing: [],
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
    };
    const key = `${exitSet}|${p.tp}|${p.sl}|${p.trail}|${p.hold}|${sideKey(side)}`;
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
  return bySet;
}

/**
 * For each initialized engine pair, fit TP/SL candidates only on older prehistory and validate on its later part.
 * Three range-independent Exit sets × both directions receive independent fits, identities and holdout evaluations.
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
    const holdH = Math.max((2 * laneTf) / 60, Math.min(settings.holdH, fitH / 4));
    const holdRef = Math.max(2, Math.round((holdH * 60) / REF_TF));
    const entryFilter = entryFilters?.[pair];
    const mfeBySide: Record<1 | -1, number[]> = { 1: [], [-1]: [] };
    const maeBySide: Record<1 | -1, number[]> = { 1: [], [-1]: [] };
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
      const holdBars = laneProtect({ tp: 0, sl: 0, trail: 0, hold: holdRef }, ind).hold;
      entryExcursions(b, sig, holdBars, fitCutT, fromT, mfeBySide, maeBySide);
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
    if (mfeBySide[1].length < settings.minEntries && mfeBySide[-1].length < settings.minEntries) {
      diagnostics.insufficientEntries++;
      continue;
    }
    const groups: Protect[][] = [];
    const candidatesBySide: Partial<Record<1 | -1, Record<ExitConfigSet, Protect[]>>> = {};
    for (const side of [1, -1] as const) {
      const mfe = mfeBySide[side].sort((a, b) => a - b);
      const mae = maeBySide[side].sort((a, b) => a - b);
      if (mfe.length >= settings.minEntries && mae.length >= settings.minEntries)
        candidatesBySide[side] = exitProtectCandidates(
          mfe,
          mae,
          side,
          holdRef,
          settings,
          validation,
        );
    }
    for (const exitSet of ["static-sl", "adaptive-sl", "trailing"] as const)
      for (const side of [1, -1] as const) {
        const candidates = candidatesBySide[side]?.[exitSet];
        if (candidates?.length) groups.push(candidates);
      }
    const candidates = capExitCandidates(groups, settings.maxConfigsPerPair);
    diagnostics.candidates += candidates.length;
    diagnostics.capped += groups.reduce((n, xs) => n + xs.length, 0) - candidates.length;
    const kept: Protect[] = [];
    const ids = new Set<string>();
    for (const p of candidates) {
      const lane = laneProtect(p, ind);
      const actual = lane.tag ? lane : adjustProtect(lane, validation);
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
      const id = configId(bot, ind, p);
      if (!ids.has(id)) {
        ids.add(id);
        kept.push(p);
        diagnostics.qualified++;
      }
    }
    if (kept.length) out[pair] = kept;
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
