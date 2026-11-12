import {blockPrefix,blockRequired,checkBlockPolicy,evaluateBlocks,type BlockPolicy} from "../../shared/cts-lastn/blocks.ts";
/** Position-count evaluation policy. Time controls data availability, never membership of these samples. */
export interface PositionCounts {
  base: number;
  main: number;
  real: number;
  entry: number;
}
export interface PositionWindows extends PositionCounts {
  blocks?: Partial<Record<keyof PositionCounts,BlockPolicy>>;
  /** Longest unresolved drawdown in completed positions, independent of wall-clock gaps. */
  maxDrawdownPositions: number;
  byRange?: Record<string, Partial<PositionCounts>>;
  byConfig?: Record<string, Partial<PositionCounts>>;
}
export const DEFAULT_POSITION_WINDOWS: PositionWindows = {
  base: 40,
  main: 40,
  real: 12,
  entry: 12,
  maxDrawdownPositions: 40,
  byRange: { mc: { base: 30 }, mn: { base: 30 } },
};
const stages = ["base", "main", "real", "entry"] as const;

interface PositionTapeColumns {
  n: number;
  syms: readonly string[];
  exitT: ArrayLike<number>;
  entryT: ArrayLike<number>;
  symI: ArrayLike<number>;
  side: ArrayLike<number>;
  r: ArrayLike<number>;
}
const sourceChecks = new WeakMap<object, { n: number; columns: unknown[]; valid: boolean }>();
/** Published columns are immutable. Unknown ownership or chronology anywhere makes the last N unknowable. */
export function positionTapeValid(tp: PositionTapeColumns): boolean {
  const columns = [tp.syms, tp.exitT, tp.entryT, tp.symI, tp.side, tp.r];
  const cached = sourceChecks.get(tp);
  if (cached?.n === tp.n && columns.every((v, i) => v === cached.columns[i])) return cached.valid;
  let valid =
    Number.isSafeInteger(tp.n) &&
    tp.n >= 0 &&
    Array.isArray(tp.syms) &&
    [tp.exitT, tp.entryT, tp.symI, tp.side, tp.r].every((a) => a && a.length >= tp.n);
  if (valid)
    for (let i = 0; i < tp.n; i++) {
      const symbol = tp.symI[i],
        exit = tp.exitT[i],
        entry = tp.entryT[i];
      if (
        !Number.isInteger(symbol) ||
        symbol < 0 ||
        symbol >= tp.syms.length ||
        !tp.syms[symbol] ||
        ![1, -1].includes(tp.side[i]) ||
        !Number.isFinite(exit) ||
        !Number.isFinite(entry) ||
        exit < entry ||
        (i > 0 &&
          (exit < tp.exitT[i - 1] || (exit === tp.exitT[i - 1] && entry < tp.entryT[i - 1])))
      ) {
        valid = false;
        break;
      }
    }
  sourceChecks.set(tp, { n: tp.n, columns, valid });
  return valid;
}
export function checkPositionWindows(p: Partial<PositionWindows>): void {
  if (!p || typeof p !== "object" || Array.isArray(p))
    throw new Error("Position windows require an object");
  const count = (n: unknown) =>
    Number.isSafeInteger(n) && (n as number) >= 1 && (n as number) <= 500;
  for (const k of [...stages, "maxDrawdownPositions"] as const)
    if (p[k] !== undefined && !count(p[k]))
      throw new Error(`${k}: 1–500 complete positions required`);
  if(p.blocks){for(const [stage,b] of Object.entries(p.blocks)){if(!stages.includes(stage as keyof PositionCounts))throw new Error("Unknown block stage");checkBlockPolicy(b);}}
  for (const name of ["byRange", "byConfig"] as const) {
    const map = p[name];
    if (map === undefined) continue;
    if (!map || typeof map !== "object" || Array.isArray(map) || Object.keys(map).length > 4096)
      throw new Error(`${name}: bounded position-count map required`);
    for (const [key, value] of Object.entries(map)) {
      if (
        !key.trim() ||
        (name === "byRange" &&
          !["wide", "mc", "mn", "mp", "sh", "gn", "lg", "lr", "sig", "exit"].includes(key)) ||
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.entries(value).some(
          ([k, n]) => !stages.includes(k as (typeof stages)[number]) || !count(n),
        )
      )
        throw new Error(`Invalid ${name} position window`);
    }
  }
}
export function positionCounts(
  p: PositionWindows,
  range = "wide",
  config?: string,
): PositionCounts {
  return {
    base: p.base,
    main: p.main,
    real: p.real,
    entry: p.entry,
    ...p.byRange?.[range],
    ...(config ? p.byConfig?.[config] : {}),
  };
}
/** A scalar oracle also used by Base. Unknown values stay in the last-N sample and cannot pass. */
export function positionStats(values: readonly number[], requested: number) {
  const selected = values.slice(-requested);
  let gp = 0,
    gl = 0,
    sum = 0,
    sum2 = 0,
    equity = 0,
    peak = 0,
    mdd = 0,
    drawdown = 0,
    maxDrawdownPositions = 0,
    wins = 0;
  for (const r of selected) {
    gp += Math.max(r, 0);
    gl += Math.max(-r, 0);
    sum += r;
    sum2 += r * r;
    if (r > 0) wins++;
    equity += r;
    peak = Math.max(peak, equity);
    mdd = Math.max(mdd, peak - equity);
    drawdown = equity < peak ? drawdown + 1 : 0;
    maxDrawdownPositions = Math.max(maxDrawdownPositions, drawdown);
  }
  const known = [gp, gl, sum, sum2, mdd].every(Number.isFinite),
    n = selected.length;
  const mean = n ? sum / n : 0,
    variance = n > 1 ? Math.max(0, (sum2 - (sum * sum) / n) / (n - 1)) : 0;
  return {
    n,
    requested,
    complete: n === requested,
    known,
    gp,
    gl,
    net: sum,
    mdd,
    maxDrawdownPositions,
    positiveShare: n ? wins / n : 0,
    lcb: mean - 1.64 * Math.sqrt(variance / Math.max(n, 1)),
  };
}

/** Retain the existing native mainnet sample floors under count-based evaluation. */
export function mainnetPositionWindows(
  p: PositionWindows,
  real: number,
  entry: number,
  signal: number,
): PositionWindows {
  const clamp = (counts: Partial<PositionCounts>, sig = false) => ({
    ...counts,
    real: Math.max(counts.real ?? p.real, sig ? signal : real),
    entry: Math.max(counts.entry ?? p.entry, sig ? signal : entry),
  });
  return {
    ...p,
    ...clamp(p),
    byRange: {
      ...Object.fromEntries(
        Object.entries(p.byRange ?? {}).map(([key, value]) => [key, clamp(value, key === "sig")]),
      ),
      sig: clamp(p.byRange?.sig ?? {}, true),
    },
    byConfig: Object.fromEntries(
      Object.entries(p.byConfig ?? {}).map(([key, value]) => [
        key,
        clamp(value, key.split("|")[1]?.startsWith("sig-") ?? false),
      ]),
    ),
  };
}

/** Statistics describe the independent long block; coverage describes all requested positions. */
export function positionStageStats(values:readonly number[],requested:number,blocks?:BlockPolicy,minPf=1.05){
 if(!blocks)return {...positionStats(values,requested),blocksPassed:true};
 const total=blockRequired(blocks),v=evaluateBlocks(blockPrefix(values.slice(-total).reverse(),total),blocks,Math.max(1.000001,minPf));
 const end=Math.max(0,values.length-blocks.short-blocks.minimal),stats=positionStats(values.slice(Math.max(0,end-blocks.long),end),blocks.long);
 return {...stats,n:v.count,requested:total,complete:v.count===total,known:v.state!=="unknown",blocksPassed:v.state==="qualified"};
}
