// Live-feedback auto-adjuster. Per strategy config set (bot | indication | sub-strategy) the last `window`
// executed positions are re-scored with the MEASURED live cost (exchange fees + slippage, when enough fills were
// measured). A set whose PF falls below `triggerPf` gets a wider minimum stop and a wider minimum trailing distance,
// one step at a time up to the configured maxima; at the maximum it is paused for `pauseH`. A recovered set
// (PF ≥ recoverPf) steps back. Only new evidence (a newer closed position) moves a set, so a set is never stepped
// twice on the same trades.
import { profitFactor } from "./metrics/stats.ts";
import type { Protect, StratKind } from "./domain/types.ts";
import type { AdjustSettings } from "./config.ts";
export { DEFAULT_ADJUST, type AdjustSettings } from "./config.ts";

export interface SetAdjust {
  set: string;
  level: number;
  minSl: number;
  minTrail: number;
  pausedUntil: number;
  /** PF of the judged window (live cost applied) */
  pf: number;
  n: number;
  lastExitT: number;
  at: number;
  note: string;
}

export type AdjustState = Record<string, SetAdjust>;

const kindOf = (cfg: string): StratKind =>
  cfg.endsWith("|axis")
    ? "axis"
    : cfg.endsWith("|dcaA")
      ? "dca-active"
      : cfg.endsWith("|dca")
        ? "dca"
        : /\|tr0\|/.test(cfg)
          ? "normal"
          : "trailing";

/**
 * The adjuster's evidence per set: the exchange's own closes (live record) once a set has a full window of them, the
 * paper book's until then — never both mixed in one window.
 */
export function adjustTrades(
  paper: ReadonlyArray<{ cfg: string; r: number; exitT: number }>,
  exchange: ReadonlyArray<{ cfg: string; r: number; exitT: number }>,
  window: number,
): Array<{ cfg: string; r: number; exitT: number; net?: boolean }> {
  const exN = new Map<string, number>();
  for (const t of exchange) exN.set(setKeyOf(t.cfg), (exN.get(setKeyOf(t.cfg)) ?? 0) + 1);
  const onEx = (cfg: string) => (exN.get(setKeyOf(cfg)) ?? 0) >= window;
  return [
    ...paper.filter((t) => !onEx(t.cfg)),
    ...exchange.filter((t) => onEx(t.cfg)).map((t) => ({ ...t, net: true })),
  ];
}

/** "bot|ind|kind" of a config id. */
export function setKeyOf(cfg: string): string {
  const [bot, ind] = cfg.split("|");
  return `${bot}|${ind}|${kindOf(cfg)}`;
}

export function evaluateAdjust(
  prev: AdjustState,
  /** `net`: an exchange close (live_lane_trades) — its fees and slippage are real, no cost excess on top */
  trades: ReadonlyArray<{ cfg: string; r: number; exitT: number; net?: boolean }>,
  a: AdjustSettings,
  base: { minSl: number; minTrail: number },
  /** measured live round-trip cost above the modelled one (fraction; 0 when not measured) */
  costExcess: number,
  now = Date.now(),
): { state: AdjustState; changed: string[] } {
  const state: AdjustState = { ...prev };
  const changed: string[] = [];
  const bySet = new Map<string, Array<{ r: number; exitT: number; net?: boolean }>>();
  for (const t of trades) {
    const k = setKeyOf(t.cfg);
    (bySet.get(k) ?? bySet.set(k, []).get(k)!).push({ r: t.r, exitT: t.exitT, net: t.net });
  }
  const levels = Math.max(
    1,
    Math.ceil(
      Math.max(
        (a.slMax - base.minSl) / Math.max(a.slStep, 1e-9),
        (a.trailMax - base.minTrail) / Math.max(a.trailStep, 1e-9),
      ),
    ),
  );
  for (const [set, xs] of bySet) {
    xs.sort((x, y) => x.exitT - y.exitT);
    const w = xs.slice(-a.window);
    if (w.length < a.window) continue;
    const last = w[w.length - 1].exitT;
    const cur: SetAdjust = state[set] ?? {
      set,
      level: 0,
      minSl: base.minSl,
      minTrail: base.minTrail,
      pausedUntil: 0,
      pf: 0,
      n: 0,
      lastExitT: 0,
      at: 0,
      note: "",
    };
    if (last <= cur.lastExitT) continue; // no new evidence
    let gp = 0;
    let gl = 0;
    for (const x of w) {
      const r = x.net ? x.r : x.r - costExcess;
      if (r > 0) gp += r;
      else gl -= r;
    }
    const pf = profitFactor(gp, gl);
    const next: SetAdjust = { ...cur, pf, n: w.length, lastExitT: last, at: now };
    if (pf < a.triggerPf) {
      if (cur.level < levels) {
        next.level = cur.level + 1;
        next.note = `PF ${pf.toFixed(2)} < ${a.triggerPf} → wider SL / trail (level ${next.level})`;
      } else {
        next.pausedUntil = now + a.pauseH * 3_600_000;
        next.note = `PF ${pf.toFixed(2)} at the caps → paused ${a.pauseH} h`;
      }
    } else if (pf >= a.recoverPf && cur.level > 0) {
      next.level = cur.level - 1;
      next.note = `PF ${pf.toFixed(2)} ≥ ${a.recoverPf} → step back (level ${next.level})`;
    } else next.note = `PF ${pf.toFixed(2)} — unchanged`;
    next.minSl = Math.min(a.slMax, base.minSl + next.level * a.slStep);
    next.minTrail = Math.min(a.trailMax, base.minTrail + next.level * a.trailStep);
    if (next.level !== cur.level || next.pausedUntil !== cur.pausedUntil) changed.push(set);
    state[set] = next;
  }
  return { state, changed };
}

/** A protect with the set's adjusted minimum stop / trailing distance. */
export function adjustProtect(
  p: Protect,
  adj?: { minSl: number; minTrail: number } | null,
): Protect {
  if (!adj) return p;
  const out: Protect = {
    ...p,
    sl: +Math.max(p.sl, adj.minSl).toFixed(4),
    // the floor is on the trailing distance (trail × trailStep), not on the arming move
    trail: p.trail > 0 ? +Math.max(p.trail, adj.minTrail / (p.trailStep ?? 1)).toFixed(4) : 0,
  };
  // an ATR protect: the floors apply to the distances resolved at every entry
  if (p.atr)
    // never lowers a floor set before (the configured stop / trailing floors, then live feedback)
    out.atr = {
      ...p.atr,
      minSl: Math.max(p.atr.minSl ?? 0, adj.minSl),
      ...(p.atr.trail ? { minTrail: Math.max(p.atr.minTrail ?? 0, adj.minTrail) } : {}),
    };
  return out;
}

/** Sets paused right now. */
export function pausedSets(state: AdjustState | undefined, now = Date.now()): Set<string> {
  const out = new Set<string>();
  for (const s of Object.values(state ?? {})) if (s.pausedUntil > now) out.add(s.set);
  return out;
}
