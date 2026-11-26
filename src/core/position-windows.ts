import {blockPrefix,blockRequired,checkBlockPolicy,evaluateBlocks,type BlockPolicy} from "../../shared/cts-lastn/blocks.ts";
import { SIGNAL_EVALUATION_LAST_N } from "./signal-policy.ts";
import { immutableHistoryGeneration } from "./sim/immutable-history-generation.ts";
/** Position-count evaluation policy. Time controls data availability, never membership of these samples. */
export interface PositionCounts {
  base: number;
  main: number;
  real: number;
  entry: number;
}
/** Which closes a position window holds (see PositionWindows.scope). */
export type PositionScope = "context" | "config" | "auto" | "both";
export interface PositionWindows extends PositionCounts {
  blocks?: Partial<Record<keyof PositionCounts,BlockPolicy>>;
  /** Longest unresolved drawdown in completed positions, independent of wall-clock gaps. */
  maxDrawdownPositions: number;
  byRange?: Record<string, Partial<PositionCounts> & { scope?: PositionScope }>;
  byConfig?: Record<string, Partial<PositionCounts>>;
  /**
   * true: a window must hold exactly the requested number of own closes, whatever gates.lastNFloor says (the native
   * mainnet minimums use it). Absent or false: gates.lastNFloor applies as it does everywhere else — a window with fewer
   * closes than requested but at least lastNFloor is judged on the closes it has (PF, net and every other gate unchanged).
   */
  strictCounts?: boolean;
  /**
   * Which closes a window holds. "config" (default since 17 Nov): the config's own closes on every symbol and side.
   * "context": the exact config × symbol × direction's own closes. "config": the
   * config's own closes on every symbol and side (its last N settled positions), as before the 11 Nov count policy —
   * long-hold ranges (General, Long) rarely fill a per-context window and stopped executing. "auto": each context is
   * its own lane once it holds its own floor of closes (gates.lastNFloor), and until then is judged on its own config's
   * record across symbols and sides (never another config's).
   */
  scope?: PositionScope;
}
export const DEFAULT_POSITION_WINDOWS: PositionWindows = {
  base: 40,
  main: 40,
  real: 12,
  entry: 12,
  maxDrawdownPositions: 40,
  // Micro judges each lane on both its own symbol × side window and its config's record (operator, 17 Nov: Micro
  // performed per context, PF 1.43, and not config-wide, 0.21, on the same replay)
  // Signals keep their own independent count windows (operator: independent configs and counts, positive-coordinations.md)
  byRange: { mc: { base: 30, scope: "both" }, mn: { base: 30 }, sig: {
    base: SIGNAL_EVALUATION_LAST_N, main: SIGNAL_EVALUATION_LAST_N,
    real: SIGNAL_EVALUATION_LAST_N, entry: SIGNAL_EVALUATION_LAST_N,
  } },
  // operator, 17 Nov 2026: config-wide windows are the systemwide default (docs/positive-coordinations.md, "Config-wide
  // own-close windows"): per context, long-hold ranges starved (PF 0.56 → 1.33 on the same replay)
  scope: "config",
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
// A live stored-tape wrapper must not pin an evicted decompressed arena through
// validation metadata. Weak column identities still invalidate on replacement
// or reloading, and the ordinary in-memory owner retains its own columns.
type SourceCheck = { n: number; valid: boolean } & (
  | { kind: "stored"; generation: object; symbols: WeakRef<object>; buffer: WeakRef<object> }
  | { kind: "ordinary"; columns: WeakRef<object>[] }
);
const sourceChecks = new WeakMap<object, SourceCheck>();
/** Published columns are immutable. Unknown ownership or chronology anywhere makes the last N unknowable. */
export function positionTapeValid(tp: PositionTapeColumns): boolean {
  const generation = immutableHistoryGeneration(tp);
  const cached = sourceChecks.get(tp);
  if (generation && cached?.kind === "stored" && cached.n === tp.n && cached.generation === generation &&
      cached.symbols.deref() === tp.syms) {
    // A stored tape's non-configurable column getters all view one checksummed immutable arena. Reading one
    // still verifies an evicted/corrupted disk record, without retaining six separate column WeakRefs per tape.
    const exit = tp.exitT;
    if (ArrayBuffer.isView(exit) && cached.buffer.deref() === exit.buffer) return cached.valid;
  }
  const columns = [tp.syms, tp.exitT, tp.entryT, tp.symI, tp.side, tp.r];
  if (!generation && cached?.kind === "ordinary" && cached.n === tp.n &&
      columns.every((v, i) => v !== undefined && v === cached.columns[i].deref())) return cached.valid;
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
  // Malformed/null columns are not cacheable WeakRef targets. Keep their
  // fail-closed verdict, without retaining them or changing the next check.
  if (generation && Array.isArray(tp.syms) && ArrayBuffer.isView(tp.exitT))
    sourceChecks.set(tp, { n: tp.n, kind: "stored", generation, symbols: new WeakRef(tp.syms),
      buffer: new WeakRef(tp.exitT.buffer), valid });
  else if (!generation && columns.every((v) => v !== null && (typeof v === 'object' || typeof v === 'function')))
    sourceChecks.set(tp, { n: tp.n, kind: "ordinary", columns: columns.map((v) => new WeakRef(v as object)), valid });
  else sourceChecks.delete(tp);
  return valid;
}
export function checkPositionWindows(p: Partial<PositionWindows>): void {
  if (!p || typeof p !== "object" || Array.isArray(p))
    throw new Error("Position windows require an object");
  const count = (n: unknown) =>
    Number.isSafeInteger(n) && (n as number) >= 1 && (n as number) <= 500;
  if (p.strictCounts !== undefined && typeof p.strictCounts !== "boolean")
    throw new Error("strictCounts: true or false required");
  const scopes = ["context", "config", "auto", "both"];
  if (p.scope !== undefined && !scopes.includes(p.scope))
    throw new Error('scope: "context", "config", "auto" or "both" required');
  for (const [tag, r] of Object.entries(p.byRange ?? {}))
    if (r?.scope !== undefined && !scopes.includes(r.scope)) throw new Error(`byRange.${tag}.scope: invalid`);
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
          ([k, n]) => name === "byRange" && k === "scope" ? !scopes.includes(n as unknown as string)
            : !stages.includes(k as (typeof stages)[number]) || !count(n),
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
/**
 * The shortest window that is judged on the closes it has: gates.lastNFloor, unless the policy is strict (0 = a window
 * must be complete). Only a window shorter than requested ever uses it.
 */
export function partialFloorOf(policy: Pick<PositionWindows, "strictCounts"> | null | undefined, lastNFloor: number | undefined): number {
  return policy?.strictCounts ? 0 : Math.max(0, Math.floor(lastNFloor ?? 0));
}

export function positionStats(values: readonly number[], requested: number, partialFloor = 0) {
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
  for (const value of selected) {
    // Restored JSON may contain null for an unavailable return; never coerce it to a flat close.
    const r = typeof value === "number" && Number.isFinite(value) ? value : NaN;
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
    // complete = the requested closes, or (partialFloor) at least that many when fewer exist yet
    complete: n === requested || (partialFloor > 0 && n >= partialFloor && n < requested),
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
    // the native mainnet minimums are exact sample sizes: no partial window may stand in for them
    strictCounts: true,
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
export function positionStageStats(values:readonly number[],requested:number,blocks?:BlockPolicy,minPf=1.05,partialFloor=0){
 if(!blocks)return {...positionStats(values,requested,partialFloor),blocksPassed:true};
 const total=blockRequired(blocks),v=evaluateBlocks(blockPrefix(values.slice(-total).reverse(),total),blocks,Math.max(1.000001,minPf));
 const stats=positionStats(values,total);
 return {...stats,blocksPassed:v.state==="qualified"&&stats.net>0&&stats.gp>=stats.gl*minPf};
}
