// Independently qualified, prehistory-derived exit configs for Base-passed strategy pairs.
// Candidate MFE is fitted on the older segment only; every protect is then judged on the later completed-bar holdout.
import { createHash } from "node:crypto";
import type { Bars, BotType, Protect, RangeTag, Tactics } from "./domain/types.ts";
import type { ExitStrategySettings } from "./config.ts";
import { entrySignal } from "./bots/bots.ts";
import { isSignalInd, laneOf } from "./indications/registry.ts";
import { tacticCooldown } from "./indications/filters.ts";
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
import { entryMfes, quantileSorted } from "./signal-hist.ts";
import { simulate } from "./sim/backtest.ts";
import { filterEntries, type EntryFilter } from "./sim/walkforward.ts";
import { adjustProtect } from "./adjust.ts";

const H = 3_600_000;

/** A target already admitted by Base for this pair and range, with the exact grid floors retained. */
export interface ExitCandidateTarget {
  tp: number;
  tag?: RangeTag;
  minSl: number;
  minTrail: number;
}

/** Match target eligibility to the engine tape builder's pairTags / pairTps rules. */
export function exitTargetsForPair(
  tags: readonly string[],
  passedTps: Readonly<Record<string, readonly number[]>> | undefined,
  protects: readonly Protect[],
  options: {
    baseRanges: boolean;
    minTrailByTag: Readonly<Partial<Record<RangeTag, number>>>;
    defaultMinTrail: number;
  },
): ExitCandidateTarget[] {
  const targets: ExitCandidateTarget[] = [];
  for (const tag of tags) {
    const rangeProtects = protects.filter((p) => (p.tag ?? "") === tag);
    const passed = tag ? passedTps?.[tag] : undefined;
    const allowedTps = tag
      ? (passed ?? (options.baseRanges ? [] : rangeProtects.map((p) => p.tp)))
      : rangeProtects.map((p) => p.tp);
    for (const tp of new Set(allowedTps)) {
      const matching = rangeProtects.filter((p) => p.tp === tp);
      const minSl = matching.reduce((best, p) => Math.min(best, p.sl), Infinity);
      if (!Number.isFinite(minSl)) continue;
      const rangeTag = tag as RangeTag;
      targets.push({
        tp,
        ...(tag ? { tag: rangeTag } : {}),
        minSl,
        minTrail: tag ? (options.minTrailByTag[rangeTag] ?? options.defaultMinTrail) : 0,
      });
    }
  }
  return targets;
}

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

/** Deterministically spread a per-pair cap over passed range × direction groups. */
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
  const series = new Set<number>();
  for (const pair of pairs) {
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

function sideSignal(sig: Int8Array, side: 1 | -1): Int8Array {
  const out = new Int8Array(sig.length);
  for (let i = 0; i < sig.length; i++) if (sig[i] === side) out[i] = side;
  return out;
}

function protectCandidates(
  mfe: readonly number[],
  targets: readonly ExitCandidateTarget[],
  side: 1 | -1,
  hold: number,
  settings: ExitStrategySettings,
): Protect[] {
  const out: Protect[] = [];
  const seen = new Set<string>();
  const sorted = [...targets].filter((x) => x.tp > 0).sort((a, b) => a.tp - b.tp);
  for (const q of settings.quantiles) {
    const raw = quantileSorted(mfe, q);
    if (!Number.isFinite(raw)) continue;
    const target = sorted.reduce<ExitCandidateTarget | null>((best, x) => {
      if (!best) return x;
      const dx = Math.abs(x.tp - raw);
      const db = Math.abs(best.tp - raw);
      return dx < db || (dx === db && x.tp < best.tp) ? x : best;
    }, null);
    if (!target) continue;
    for (const trailShare of settings.trailShares)
      for (const stopMultiple of settings.stopMultiples) {
        const trail = rounded(Math.max(target.tp * trailShare, target.minTrail));
        const sl = rounded(Math.max(target.tp * stopMultiple, target.minSl));
        // A trail at or beyond the TP creates same-bar ordering ambiguity and is never a useful independent exit.
        if (!(trail > 0 && trail < target.tp && sl > 0)) continue;
        const p: Protect = {
          tp: target.tp,
          sl,
          trail,
          hold,
          ...(target.tag ? { tag: target.tag } : {}),
          exitType: "historic",
          exitSide: side,
        };
        const key = `${p.tag ?? ""}|${p.tp}|${p.sl}|${p.trail}|${p.hold}|${sideKey(side)}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(p);
        }
      }
  }
  return out;
}

/**
 * For each Base-passed engine pair, fit candidate exits only on the older prehistory and validate on its later part.
 * Each range × direction receives its own bounded candidate sets and exact `exit` identity.
 */
export function* exitStrategyProtectsGen(
  u: Universe,
  pairs: Iterable<string>,
  targetsByPair: Readonly<Record<string, readonly ExitCandidateTarget[]>>,
  settings: ExitStrategySettings,
  tactics: Tactics | null | undefined,
  cutT: number,
  validation: ExitStrategyValidation,
  diagnostics: ExitStrategyDiagnostics = emptyExitStrategyDiagnostics(),
  entryFilters?: Readonly<Record<string, EntryFilter>>,
): Generator<void, Record<string, Protect[]>> {
  const out: Record<string, Protect[]> = {};
  if (!settings.enabled) return out;
  for (const pair of pairs) {
    const [botRaw, ind] = pair.split("|");
    if (!botRaw || !ind || !targetsByPair[pair]?.length) continue;
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
    const validationSignals: Array<{
      s: number;
      bars: Bars;
      long: Int8Array;
      short: Int8Array;
    }> = [];
    for (const s of series) {
      yield;
      const b = u.bars[s];
      let sig = entrySignal(bot, ind, u.caches[s], tactics);
      if (!sig) continue;
      if (isSignalInd(ind) && entryFilter && (entryFilter.trendH > 0 || entryFilter.volFloor > 0))
        sig = filterEntries(sig, b, u.caches[s], entryFilter);
      sig = evaluationSignal(u, b, sig);
      const holdBars = laneProtect({ tp: 0, sl: 0, trail: 0, hold: holdRef }, ind).hold;
      for (const side of [1, -1] as const)
        entryMfes(b, sideSignal(sig, side), holdBars, fitCutT, mfeBySide[side], fromT);
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
    const byTag = new Map<string, ExitCandidateTarget[]>();
    for (const target of targetsByPair[pair]) {
      const key = target.tag ?? "";
      const list = byTag.get(key) ?? [];
      list.push(target);
      byTag.set(key, list);
    }
    for (const tagTargets of byTag.values()) {
      for (const side of [1, -1] as const) {
        const mfe = mfeBySide[side].sort((a, b) => a - b);
        if (mfe.length < settings.minEntries) continue;
        const candidates = protectCandidates(mfe, tagTargets, side, holdRef, settings);
        if (candidates.length) groups.push(candidates);
      }
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
      const cooldown = tacticCooldown(tactics);
      yield;
      for (const { s, bars: b, long, short } of validationSignals) {
        if (b.n < 2) continue;
        const result = simulate(
          configId(bot, ind, lane),
          b,
          side === 1 ? long : short,
          actual,
          { cost: validation.cost, cooldown, atr: actual.atr ? u.caches[s].atrEma(14) : undefined },
        );
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
  if (!p.tag) {
    for (const f of ["tp", "sl", "trail"] as const) {
      const target = parsed.protect[f];
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
