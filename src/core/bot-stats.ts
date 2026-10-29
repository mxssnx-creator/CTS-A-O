import { signalSourceOf } from "./indications/registry.ts";
import { closeClassOf } from "./relation.ts";
import { POSITION_COST_RT, POSITION_COST_STRESS_RT } from "./model-cost.ts";
import { profitFactorRatio } from "./metrics/profit-factor.mjs";

// Per-bot exchange statistics: every config's closed trade on the exchange (live_lane_trades), judged against the frozen
// criteria in docs/bot-stability-criteria.md. Pure functions: the desk's status and any statistics view read the same
// numbers. A family is a bot × range (e.g. "eng follow mn", "sig follow wide"); a trade is one config's paper position
// closed on the exchange; an event is a distinct (symbol, side, paper entry bar) — configs that enter the same bar are
// one event, so events are the independent sample.

/** the model round trip the stored returns are judged at (0.2 %) and the stress round trip (0.4 %) */
export const COST_RT = POSITION_COST_RT;
export const STRESS_RT = POSITION_COST_STRESS_RT;
/** frozen sample floors (docs/bot-stability-criteria.md) */
export const MIN_TRADES = 150;
export const MIN_EVENTS = 30;
export const MIN_SIDE_TRADES = 30;
/** 8 h blocks with at least this many trades are judged for consistency */
export const BLOCK_MIN_TRADES = 3;
export const BLOCK_MS = 8 * 3_600_000;
/** the 01:06 UTC restart's windows (relation.ts: excluded from every judgement, counted apart) */
export { RESTART_WINDOWS } from "./relation.ts";

/** the 15-minute bar a paper entry belongs to (the id's entry time floored to the bar; non-numeric ids kept as they are) */
export const EVENT_BAR_MS = 900_000;
export function eventBar(id: string): string {
  const t = Number(id.slice(id.lastIndexOf("|") + 1));
  return Number.isFinite(t) ? String(Math.floor(t / EVENT_BAR_MS) * EVENT_BAR_MS) : id.slice(id.lastIndexOf("|") + 1);
}

/** one row of live_lane_trades (one config's paper position, closed on the exchange) */
export interface LaneRow {
  id: string;
  cfg: string;
  sym: string;
  side: number;
  entry: number;
  exit: number;
  exit_t: number;
  r: number;
  reason: string;
}

export interface FamilyStats {
  family: string;
  /** trades counted (rows that are not own closes excluded) and rows in all */
  trades: number;
  raw: number;
  /** excluded, counted apart (relation.ts): the restart window's stops, closes by an order not ours, unverified closes */
  restart: number;
  hand: number;
  unverified: number;
  /** distinct (symbol, side, paper entry bar) */
  events: number;
  winRate: number;
  /** PF as the rows stored them (fees unmeasured on most fills: a stored return may carry no cost) */
  pfStored: number;
  /** PF with every trade at the 0.2 % and the 0.4 % round trip */
  pf02: number;
  pf04: number;
  /** mean return per trade at 0.2 %, SQN (√n · mean / sd) at 0.2 %, max drawdown (summed trade returns) at 0.2 % */
  expectancy: number;
  sqn: number;
  maxDrawdown: number;
  /** 8 h blocks with 3+ trades, and the share of them with PF ≥ 1 (NaN when none is judged) */
  blocksJudged: number;
  blockPassRate: number;
  long: { n: number; pf02: number };
  short: { n: number; pf02: number };
  verdict: "pass" | "fail" | "not judged";
  /** what failed, or what is still missing for a verdict */
  why: string[];
}

/** a family's name: engine (eng) or signal (sig), its bot, and its range tag ("wide" when untagged) */
export function botFamilyOf(cfg: string): string {
  const bot = cfg.split("|")[0] ?? "";
  if (cfg.includes("|sig-")) {
    // a signal family is its source × range: the indication "sig-<source>-<s|m>@m<tf>" (the range is the -s / -m
    // before the lane suffix, s = short, m = medium)
    const ind = cfg.split("|")[1] ?? "";
    const range = /-([sm])(?=@|$)/.exec(ind)?.[1] === "s" ? "short" : "medium";
    return `sig ${bot} ${signalSourceOf(ind)} ${range}`;
  }
  const tag = /\|(mc|mp|mn|sh|gn|lg)(?=\||$)/.exec(cfg)?.[1] ?? "wide";
  return `eng ${bot} ${tag}`;
}

/** profit factor of returns (∞ with no loss, 0 with no gain) */
export function profitFactor(xs: readonly number[]): number {
  let gp = 0;
  let gl = 0;
  for (const x of xs) {
    if (x > 0) gp += x;
    else gl -= x;
  }
  return profitFactorRatio(gp, gl);
}

function sqnOf(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1));
  return sd > 0 ? (Math.sqrt(n) * m) / sd : 0;
}

/**
 * A stored return, re-priced at a round trip of `cost`. The stored row carries the cost it was recorded with (the
 * implied cost is the gross move minus r); a row recorded without a measured fee carries none, so only the missing
 * part of `cost` is taken off.
 */
export function repriced(x: Pick<LaneRow, "side" | "entry" | "exit" | "r">, cost: number): number {
  // a row with no exit price (open at the end of a window, marked) has no gross move to derive its cost from: with exit 0
  // a LONG read as a −100 % move and was re-priced to about −1.00 (a PF artifact); its stored r stands as it is
  if (!(x.exit > 0) || !(x.entry > 0)) return x.r;
  const implied = (x.side * (x.exit - x.entry)) / x.entry - x.r;
  return x.r - Math.max(0, cost - implied);
}

/**
 * The per-family statistics of the exchange record, judged against the frozen criteria. Only own closes are trades
 * (relation.ts): the restart window's stops, the closes an order not ours made ("hand") and the unverified ones are
 * counted apart. A simulated row (tp / sl / trail …) is not an exchange close and counts as it always did.
 */
export function botStatsFromRows(rows: readonly LaneRow[]): {
  families: FamilyStats[];
  restart: number;
  hand: number;
  unverified: number;
  rows: number;
} {
  const byFam = new Map<string, LaneRow[]>();
  const apart = { restart: 0, hand: 0, unverified: 0 };
  const apartByFam = new Map<string, { restart: number; hand: number; unverified: number }>();
  const rawByFam = new Map<string, number>();
  for (const x of rows) {
    const f = botFamilyOf(x.cfg);
    rawByFam.set(f, (rawByFam.get(f) ?? 0) + 1);
    const cls = closeClassOf(x);
    if (cls === "restart" || cls === "hand" || cls === "unverified") {
      apart[cls]++;
      const a = apartByFam.get(f) ?? apartByFam.set(f, { restart: 0, hand: 0, unverified: 0 }).get(f)!;
      a[cls]++;
      continue;
    }
    (byFam.get(f) ?? byFam.set(f, []).get(f)!).push(x);
  }
  const families: FamilyStats[] = [];
  for (const [family, xs] of byFam) {
    const r02 = xs.map((x) => repriced(x, COST_RT));
    const r04 = xs.map((x) => repriced(x, STRESS_RT));
    const stored = xs.map((x) => x.r);
    const events = new Set(xs.map((x) => `${x.sym}|${x.side}|${eventBar(x.id)}`)).size;
    const sideOf = (s: number) => xs.filter((x) => x.side === s).map((x) => repriced(x, COST_RT));
    const long = sideOf(1);
    const short = sideOf(-1);
    // consistency: 8 h blocks (by exit time) with 3+ trades, the share with PF ≥ 1
    const blocks = new Map<number, number[]>();
    const sorted = xs.map((x, i) => ({ t: x.exit_t, r: r02[i] })).sort((a, b) => a.t - b.t);
    for (const { t, r } of sorted) {
      const k = Math.floor(t / BLOCK_MS);
      (blocks.get(k) ?? blocks.set(k, []).get(k)!).push(r);
    }
    const judged = [...blocks.values()].filter((v) => v.length >= BLOCK_MIN_TRADES);
    const blockPassRate = judged.length ? judged.filter((v) => profitFactor(v) >= 1).length / judged.length : NaN;
    // drawdown: cumulative 0.2 % returns in exit order
    let cum = 0;
    let peak = 0;
    let maxDrawdown = 0;
    for (const { r } of sorted) {
      cum += r;
      peak = Math.max(peak, cum);
      maxDrawdown = Math.max(maxDrawdown, peak - cum);
    }
    const pf02 = profitFactor(r02);
    const pf04 = profitFactor(r04);
    const longPf = profitFactor(long);
    const shortPf = profitFactor(short);
    const why: string[] = [];
    const judgeable = xs.length >= MIN_TRADES && events >= MIN_EVENTS && long.length >= MIN_SIDE_TRADES && short.length >= MIN_SIDE_TRADES && judged.length > 0;
    if (xs.length < MIN_TRADES) why.push(`trades ${xs.length} of ${MIN_TRADES}`);
    if (events < MIN_EVENTS) why.push(`events ${events} of ${MIN_EVENTS}`);
    if (long.length < MIN_SIDE_TRADES) why.push(`long trades ${long.length} of ${MIN_SIDE_TRADES}`);
    if (short.length < MIN_SIDE_TRADES) why.push(`short trades ${short.length} of ${MIN_SIDE_TRADES}`);
    if (!judged.length) why.push("no 8 h block with 3 trades yet");
    let verdict: FamilyStats["verdict"] = "not judged";
    if (judgeable) {
      const fails: string[] = [];
      if (pf02 < 1) fails.push(`PF at 0.2% ${pf02.toFixed(2)} < 1`);
      if (pf04 < 1) fails.push(`PF at 0.4% ${pf04.toFixed(2)} < 1`);
      if (longPf < 1) fails.push(`long PF ${longPf.toFixed(2)} < 1`);
      if (shortPf < 1) fails.push(`short PF ${shortPf.toFixed(2)} < 1`);
      if (blockPassRate < 2 / 3) fails.push(`blocks passing ${(100 * blockPassRate).toFixed(0)}% < 67%`);
      verdict = fails.length ? "fail" : "pass";
      why.push(...fails);
    }
    families.push({
      family,
      trades: xs.length,
      raw: rawByFam.get(family) ?? xs.length,
      restart: apartByFam.get(family)?.restart ?? 0,
      hand: apartByFam.get(family)?.hand ?? 0,
      unverified: apartByFam.get(family)?.unverified ?? 0,
      events,
      winRate: xs.length ? r02.filter((r) => r > 0).length / xs.length : 0,
      pfStored: profitFactor(stored),
      pf02,
      pf04,
      expectancy: xs.length ? r02.reduce((a, b) => a + b, 0) / xs.length : 0,
      sqn: sqnOf(r02),
      maxDrawdown,
      blocksJudged: judged.length,
      blockPassRate,
      long: { n: long.length, pf02: longPf },
      short: { n: short.length, pf02: shortPf },
      verdict,
      why,
    });
  }
  families.sort((a, b) => b.trades - a.trades);
  return { families, ...apart, rows: rows.length };
}
