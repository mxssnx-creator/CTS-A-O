// The system ↔ exchange relation (docs/execution-fidelity.md): one predicate for "an own exchange close", and one
// comparison of the exchange record (live_lane_trades) with the paper book's own record (paper_book_trades) — the
// same lanes, the same window, one sign. Every reader of the exchange record goes through here.
//
// 14 Oct: the desk reported a real PF of 0.20 against the system's 1.36. Nothing traded that badly: the comparison
// read the trimmed paper_trades (46 of 126 exchange rows matched), counted the operator's manual closes as the desk's
// own, and booked the 11 Oct 01:06 relaunch closes at stop prices the market never reached. Own lanes only, matched
// against the paper book's record: 38 of 38 signal lanes since 13 Oct 18:55, exchange PF 2.39 vs system 1.27.
import { profitFactor } from "./metrics/stats.ts";
// (a leaf of the simulation's import graph: bot-stats.ts, which the walk-forward imports, takes the predicate from here —
// nothing heavier than live-validation's group labels; the real positions come in as statistics.liveTrades' closes)
import { liveGroupOf } from "./live-validation.ts";

/**
 * The 01:06 UTC restart (11 Oct) booked 99 stops at trigger prices: their exit times fall in these windows. Not own
 * closes — excluded from every judgement, counted apart.
 */
export const RESTART_WINDOWS: ReadonlyArray<{ from: number; to: number }> = [{ from: 1791680800000, to: 1791680801000 }];

/**
 * How an exchange lane left that the desk owns: its own exit, its stop, its take-profit, a liquidation of its own
 * quantity. Not own: "hand" (an order that is not ours closed it — the operator's quantity is never the desk's),
 * "unverified" (a stop or target the bars cannot prove was reached), the restart window's stops.
 */
export const OWN_REASONS: ReadonlyArray<string> = ["exit", "stop", "target", "liq"];

/** the SQL form of isOwnClose on live_lane_trades' own columns (reason, exit_t), constants inlined (no parameters) */
export const OWN_CLOSE_SQL = `(reason IN (${OWN_REASONS.map((r) => `'${r}'`).join(", ")}) AND NOT (${RESTART_WINDOWS.map(
  (w) => `(reason = 'stop' AND exit_t BETWEEN ${w.from} AND ${w.to})`,
).join(" OR ")}))`;

export type CloseClass = "own" | "hand" | "unverified" | "restart" | "other";

function inRestart(exitT: number): boolean {
  return RESTART_WINDOWS.some((w) => exitT >= w.from && exitT <= w.to);
}

/**
 * The class of a closed row: own, hand, unverified, restart — or "other", a reason no exchange lane carries (a
 * simulated row's tp / sl / trail …: not an exchange close, readers of simulated rows count it as before).
 */
export function closeClassOf(x: { reason: string; exit_t?: number; exitT?: number }): CloseClass {
  const t = x.exit_t ?? x.exitT ?? NaN;
  if (x.reason === "stop" && inRestart(t)) return "restart";
  if (OWN_REASONS.includes(x.reason)) return "own";
  if (x.reason === "hand") return "hand";
  if (x.reason === "unverified") return "unverified";
  return "other";
}

/** an own exchange close (OWN_CLOSE_SQL in SQL): the only rows that judge, accept, prove or adjust anything */
export function isOwnClose(x: { reason: string; exit_t?: number; exitT?: number }): boolean {
  return closeClassOf(x) === "own";
}

// ── the readers' queries ──────────────────────────────────────

/** the exchange lanes closed since `?` */
// relation: all rows — relationOf classifies every row and counts hand / unverified / restart apart
export const RELATION_LANES_SQL = "SELECT id, cfg, sym, side, entry_t, entry, exit, exit_t, r, reason FROM live_lane_trades WHERE exit_t >= ?";

/** the paper book's record starts here (its oldest close): exchange rows before it are outside the coverage */
export const RELATION_COVERAGE_SQL = "SELECT MIN(exit_t) AS t FROM paper_book_trades";

/** the own ledger with its fills since `?` (statistics.liveTrades: the real positions in money) */
export const RELATION_LEDGER_SQL =
  "SELECT o.coid, o.sym, o.side, o.kind, o.qty, o.px, o.status, o.msg, o.at, f.fill_px AS fillPx, f.fee FROM live_orders o LEFT JOIN live_fills f ON f.coid = o.coid WHERE o.at >= ? ORDER BY o.at";
/** how far before the window the ledger is read: a position closed in it opened before it */
export const RELATION_LEDGER_LOOKBACK_MS = 7 * 24 * 3_600_000;

/**
 * The paper book's closes since `?`, with the prices of the executable record: the sim entry and exit (the book's own
 * columns, else the same tape order's in paper_trades — rows written before the columns existed) and the price at
 * adoption. `cols`: the columns paper_book_trades has (an older snapshot lacks the new ones: read as NULL).
 */
export function relationSystemSql(cols: ReadonlySet<string> = new Set(["held_px", "entry", "exit"])): string {
  const own = (c: string) => (cols.has(c) ? `b.${c}` : "NULL");
  return (
    `SELECT b.cfg, b.sym, b.side, b.entry_t, b.exit_t, b.r, b.vol, b.reason, b.held_at, ${own("held_px")} AS held_px, ` +
    `COALESCE(${own("entry")}, p.entry) AS entry, COALESCE(${own("exit")}, p.exit) AS exit FROM paper_book_trades b ` +
    "LEFT JOIN paper_trades p ON p.cfg = b.cfg AND p.sym = b.sym AND p.side = b.side AND p.entry_t = b.entry_t WHERE b.exit_t >= ?"
  );
}

/**
 * How far before the window the system rows are read: a lane is matched by its identity whatever its system exit, and
 * the paper book closes a lane's position before (or as) the exchange does.
 */
export const RELATION_SYSTEM_SLACK_MS = 48 * 3_600_000;

// ── the executable record ─────────────────────────────────────

/** the paper position's identity, as the exchange lane carries it (live-record.ts laneKeyOf) */
export const laneIdOfRow = (x: { cfg: string; sym: string; side: number; entry_t: number }) =>
  `${x.cfg}|${x.sym}|${x.side > 0 ? 1 : -1}|${x.entry_t}`;

/**
 * An exchange lane's paper position (its id without a Block leg's "|blk:<src>"): the key it is matched on. A lane's
 * Block legs each compare with the same system close (each is an exchange order of its own).
 */
export const lanePositionOf = (id: string) => {
  const i = id.indexOf("|blk:");
  return i < 0 ? id : id.slice(0, i);
};

/**
 * A paper book close re-priced at the price the book adopted it (held_px): the same exit and the same cost, entered
 * where the book could have entered. Single-leg rows only (vol 1 — a ladder's r is Σ legs at their own prices): null
 * otherwise, and when a price is missing.
 */
export function executableR(x: {
  side: number;
  r: number | null;
  vol?: number | null;
  held_px?: number | null;
  entry?: number | null;
  exit?: number | null;
}): number | null {
  if ((x.vol ?? 1) !== 1 || x.r === null || !(x.held_px! > 0) || !(x.entry! > 0) || !(x.exit! > 0)) return null;
  const side = x.side > 0 ? 1 : -1;
  const cost = side * (x.exit! / x.entry! - 1) - x.r;
  return side * (x.exit! / x.held_px! - 1) - cost;
}

// ── relationOf ────────────────────────────────────────────────

/** a paper_book_trades row (relationSystemSql) */
export interface RelSystemRow {
  cfg: string;
  sym: string;
  side: number;
  entry_t: number;
  exit_t: number | null;
  r: number | null;
  reason: string;
  vol?: number | null;
  held_at?: number | null;
  held_px?: number | null;
  entry?: number | null;
  exit?: number | null;
}
/** a live_lane_trades row (RELATION_LANES_SQL) */
export interface RelLaneRow {
  id: string;
  cfg: string;
  sym: string;
  side: number;
  entry_t?: number | null;
  entry: number;
  exit: number;
  exit_t: number;
  r: number;
  reason: string;
}

/** one close of the own ledger (statistics.liveTrades: a reduce or the close of a symbol × side position) */
export interface RelPositionTrade {
  sym: string;
  side: number;
  entryT: number;
  exitT: number;
  /** the return on its notional, after fees */
  r: number;
  notional: number;
  /** "hand": an order not ours ended the position */
  reason?: string;
}

export interface RelationInput {
  system: readonly RelSystemRow[];
  lanes: readonly RelLaneRow[];
  /**
   * the real positions in money: statistics.liveTrades over the own ledger (RELATION_LEDGER_SQL, the tag's length, the
   * model cost); omitted = per lane only
   */
  trades?: readonly RelPositionTrade[];
  /** the paper positions still open (laneIdOfRow keys): an exchange lane closed while its paper position runs */
  open?: Iterable<string>;
  from: number;
  to: number;
  /** the paper book record's oldest close (RELATION_COVERAGE_SQL); the oldest of `system` when omitted */
  coverageFrom?: number | null;
}

export interface RelSide {
  n: number;
  pf: number;
  /** Σ r × 100 (trade %) */
  net: number;
}

/**
 * The gap of matched lanes, Σ (exchange r − system r) × 100, trade %; negative = the exchange did worse. Split where
 * the system's prices are known (single-leg rows): E_s sim entry, E_h book adoption, E_e exchange join, X_s system
 * exit, X_e exchange exit —
 *   entry (adoption) = side · (X_s/E_h − X_s/E_s)        what the book's late adoption costs
 *   entry (join)     = side · (X_s/E_e − X_s/E_h)        the exchange joining later still (the timing share)
 *   exit             = side · (X_e − X_s) / E_e
 *   fees             = −(measured cost − model cost)
 * which sum to r_ex − r_sys exactly. Without an adoption price the whole entry share is the join's; a row without the
 * system's prices is "undecomposed". entryAdoption + entryJoin + exit + fees + undecomposed = total.
 */
export interface RelGap {
  total: number;
  decomposed: number;
  entryAdoption: number;
  entryJoin: number;
  exit: number;
  fees: number;
  undecomposed: number;
}

export interface RelationGroup {
  key: string;
  matched: number;
  /** the matched lanes as the exchange recorded them, and as the system closed them (ideal: the tape's r) */
  exchange: RelSide;
  system: RelSide;
  /** the system re-priced at the book's adoption / at the exchange's join price (the lanes with those prices) */
  systemAtAdoption: RelSide;
  systemAtJoin: RelSide;
  /** the exchange PF over the lanes systemAtJoin covers (the alarm compares these two) */
  exchangeAtJoinLanes: RelSide;
  gap: RelGap;
  /** own exchange lanes with no system close: none on record / its paper position still open / dropped from the book */
  exchangeOnly: number;
  systemOpen: number;
  systemDropped: number;
  /** system closes in the window the exchange never held */
  systemOnly: number;
}

export interface RelationLane {
  id: string;
  sym: string;
  side: number;
  exitT: number;
  reason: string;
  /** trade % */
  system: number;
  exchange: number;
  gap: number;
  parts: { entryAdoption: number | null; entryJoin: number; exit: number; fees: number } | null;
}

export interface RelationPosition {
  sym: string;
  side: number;
  entryT: number;
  exitT: number;
  /** USD after fees (own fills) */
  usd: number;
  /** the own lanes closed on this position and matched, and their mean r (trade %) on either side */
  lanes: number;
  systemMeanR: number | null;
  exchangeMeanR: number | null;
}

export interface Relation {
  from: number;
  to: number;
  /** the paper book record's oldest close (null: no record) */
  coverageFrom: number | null;
  counts: {
    /** exchange rows in [from, to] */
    rows: number;
    own: number;
    matched: number;
    exchangeOnly: number;
    systemOpen: number;
    systemDropped: number;
    /** own exchange rows before the paper book's record starts: never "exchange only" */
    outsideCoverage: number;
    systemOnly: number;
    excluded: { hand: number; unverified: number; restart: number; other: number };
  };
  /** distinct symbol × side × 15-minute paper entry bar of the matched lanes (the independent sample) */
  events: number;
  /** every own exchange lane in the window, matched or not (the per-lane PF beside the per-position one) */
  ownLanes: RelSide;
  total: RelationGroup;
  byRange: RelationGroup[];
  byHour: RelationGroup[];
  worst: RelationLane[];
  /** exchange stop-outs of lanes the system closed in profit */
  stopMismatch: number;
  /** the real positions (own fills, USD), positions ended by an order not ours left out; null without a ledger */
  positions: {
    n: number;
    pf: number;
    usd: number;
    hand: { n: number; usd: number };
    list: RelationPosition[];
  } | null;
}

const H = 3_600_000;
/** the 15-minute bar a paper entry belongs to (an event: bot-stats eventBar) */
const EVENT_BAR_MS = 900_000;
const LANE_TOLERANCE_MS = 5 * 60_000;

interface Acc {
  ex: number[];
  sys: number[];
  adopt: number[];
  join: number[];
  exJoin: number[];
  gap: RelGap;
  eo: number;
  so: number;
  sd: number;
  sysOnly: number;
}
const acc = (): Acc => ({
  ex: [],
  sys: [],
  adopt: [],
  join: [],
  exJoin: [],
  gap: { total: 0, decomposed: 0, entryAdoption: 0, entryJoin: 0, exit: 0, fees: 0, undecomposed: 0 },
  eo: 0,
  so: 0,
  sd: 0,
  sysOnly: 0,
});
const sideOf = (rs: readonly number[]): RelSide => {
  let gp = 0;
  let gl = 0;
  for (const r of rs) {
    if (r > 0) gp += r;
    else gl -= r;
  }
  return { n: rs.length, pf: rs.length ? profitFactor(gp, gl) : 0, net: (gp - gl) * 100 };
};
const groupOf = (k: string, a: Acc): RelationGroup => ({
  key: k.replace(/^[rh]:/, ""),
  matched: a.ex.length,
  exchange: sideOf(a.ex),
  system: sideOf(a.sys),
  systemAtAdoption: sideOf(a.adopt),
  systemAtJoin: sideOf(a.join),
  exchangeAtJoinLanes: sideOf(a.exJoin),
  gap: a.gap,
  exchangeOnly: a.eo,
  systemOpen: a.so,
  systemDropped: a.sd,
  systemOnly: a.sysOnly,
});

/** a matched lane's gap parts (trade fractions); null without the system's prices */
export function gapParts(
  lane: Pick<RelLaneRow, "side" | "entry" | "exit" | "r">,
  sys: Pick<RelSystemRow, "r" | "vol" | "held_px" | "entry" | "exit">,
): { entryAdoption: number | null; entryJoin: number; exit: number; fees: number; rJoin: number; rAdopt: number | null } | null {
  const Es = sys.entry ?? 0;
  const Xs = sys.exit ?? 0;
  const Ee = lane.entry;
  const Xe = lane.exit;
  if ((sys.vol ?? 1) !== 1 || sys.r === null || !(Es > 0) || !(Xs > 0) || !(Ee > 0) || !(Xe > 0)) return null;
  const s = lane.side > 0 ? 1 : -1;
  const Eh = sys.held_px! > 0 ? sys.held_px! : null;
  const model = s * (Xs / Es - 1) - sys.r;
  const measured = s * (Xe / Ee - 1) - lane.r;
  const entryAdoption = Eh ? s * (Xs / Eh - Xs / Es) : null;
  const entryJoin = s * (Xs / Ee - Xs / (Eh ?? Es));
  return {
    entryAdoption,
    entryJoin,
    exit: (s * (Xe - Xs)) / Ee,
    fees: -(measured - model),
    // the system's close entered at the exchange's join price / at the book's adoption price (same exit, same cost)
    rJoin: s * (Xs / Ee - 1) - model,
    rAdopt: Eh ? s * (Xs / Eh - 1) - model : null,
  };
}

/**
 * The relation of the exchange record and the paper book's own record over one window. The window starts where both
 * records exist (max(from, the paper book's oldest close)); own exchange lanes before it are "outside the coverage",
 * never "exchange only". Lanes that are not own closes (hand, unverified, the restart window) are counted apart and
 * compared with nothing. Per lane (trade %, the matched lanes) and per real position (USD, own fills).
 */
export function relationOf(i: RelationInput): Relation {
  let coverageFrom = i.coverageFrom ?? null;
  if (i.coverageFrom === undefined)
    for (const s of i.system) if (s.exit_t !== null && (coverageFrom === null || s.exit_t < coverageFrom)) coverageFrom = s.exit_t;
  const from = coverageFrom === null ? Infinity : Math.max(i.from, coverageFrom);
  const sys = new Map<string, RelSystemRow>();
  for (const s of i.system) sys.set(laneIdOfRow(s), s);
  const open = new Set(i.open ?? []);
  const groups = new Map<string, Acc>();
  const at = (k: string) => {
    let a = groups.get(k);
    if (!a) groups.set(k, (a = acc()));
    return a;
  };
  const hourOf = (t: number) => `h:${new Date(Math.floor(t / H) * H).toISOString().slice(0, 13)}:00Z`;
  const counts: Relation["counts"] = {
    rows: 0,
    own: 0,
    matched: 0,
    exchangeOnly: 0,
    systemOpen: 0,
    systemDropped: 0,
    outsideCoverage: 0,
    systemOnly: 0,
    excluded: { hand: 0, unverified: 0, restart: 0, other: 0 },
  };
  const ownRs: number[] = [];
  const events = new Set<string>();
  const lanes: RelationLane[] = [];
  const matchedLanes: Array<{ l: RelLaneRow; rSys: number }> = [];
  let stopMismatch = 0;
  const laneIds = new Set<string>();
  for (const l of i.lanes) laneIds.add(lanePositionOf(l.id));
  for (const l of i.lanes) {
    if (!(l.exit_t >= i.from && l.exit_t <= i.to)) continue;
    counts.rows++;
    const cls = closeClassOf(l);
    if (cls !== "own") {
      counts.excluded[cls]++;
      continue;
    }
    if (!(l.exit_t >= from)) {
      counts.outsideCoverage++;
      continue;
    }
    counts.own++;
    ownRs.push(l.r);
    const keys = ["total", `r:${liveGroupOf(l.cfg)}`, hourOf(l.exit_t)];
    const s = sys.get(lanePositionOf(l.id));
    if (s && s.reason === "dropped") {
      counts.systemDropped++;
      for (const k of keys) at(k).sd++;
      continue;
    }
    if (!s || s.r === null || s.exit_t === null) {
      if (open.has(lanePositionOf(l.id))) {
        counts.systemOpen++;
        for (const k of keys) at(k).so++;
      } else {
        counts.exchangeOnly++;
        for (const k of keys) at(k).eo++;
      }
      continue;
    }
    counts.matched++;
    const rSys = s.r;
    events.add(`${l.sym}|${l.side > 0 ? 1 : -1}|${Math.floor(s.entry_t / EVENT_BAR_MS)}`);
    matchedLanes.push({ l, rSys });
    if (l.reason === "stop" && rSys > 0) stopMismatch++;
    const p = gapParts(l, s);
    const g = l.r - rSys;
    for (const k of keys) {
      const a = at(k);
      a.ex.push(l.r);
      a.sys.push(rSys);
      a.gap.total += g * 100;
      if (p) {
        a.gap.decomposed++;
        a.gap.entryAdoption += (p.entryAdoption ?? 0) * 100;
        a.gap.entryJoin += p.entryJoin * 100;
        a.gap.exit += p.exit * 100;
        a.gap.fees += p.fees * 100;
        a.join.push(p.rJoin);
        a.exJoin.push(l.r);
        if (p.rAdopt !== null) a.adopt.push(p.rAdopt);
      } else a.gap.undecomposed += g * 100;
    }
    lanes.push({
      id: l.id,
      sym: l.sym,
      side: l.side,
      exitT: l.exit_t,
      reason: l.reason,
      system: rSys * 100,
      exchange: l.r * 100,
      gap: g * 100,
      parts: p
        ? {
            entryAdoption: p.entryAdoption === null ? null : p.entryAdoption * 100,
            entryJoin: p.entryJoin * 100,
            exit: p.exit * 100,
            fees: p.fees * 100,
          }
        : null,
    });
  }
  // system closes in the window the exchange never held (no lane row of any kind on record)
  for (const s of i.system) {
    if (s.reason === "dropped" || s.exit_t === null || !(s.exit_t >= from && s.exit_t <= i.to)) continue;
    if (laneIds.has(laneIdOfRow(s))) continue;
    counts.systemOnly++;
    for (const k of ["total", `r:${liveGroupOf(s.cfg)}`]) at(k).sysOnly++;
  }
  lanes.sort((a, b) => a.gap - b.gap);
  return {
    from,
    to: i.to,
    coverageFrom,
    counts,
    events: events.size,
    ownLanes: sideOf(ownRs),
    total: groupOf("total", groups.get("total") ?? acc()),
    byRange: [...groups.keys()].filter((k) => k.startsWith("r:")).sort().map((k) => groupOf(k, groups.get(k)!)),
    byHour: [...groups.keys()].filter((k) => k.startsWith("h:")).sort().map((k) => groupOf(k, groups.get(k)!)),
    worst: lanes.slice(0, 10),
    stopMismatch,
    positions: i.trades ? positionsOf(i.trades, from, i.to, matchedLanes) : null,
  };
}

/**
 * The real positions: the own ledger's closes (statistics.liveTrades), one position per symbol × side episode (its
 * reduces and its close), closed in [from, to]. A position an order not ours ended ("hand") is money, not the desk's result:
 * left out of the PF and counted apart. Beside each, its matched lanes (closed on that symbol × side while it ran).
 */
function positionsOf(
  trades: readonly RelPositionTrade[],
  from: number,
  to: number,
  matched: ReadonlyArray<{ l: RelLaneRow; rSys: number }>,
): NonNullable<Relation["positions"]> {
  const by = new Map<string, { sym: string; side: number; entryT: number; exitT: number; usd: number; hand: boolean }>();
  for (const x of trades) {
    const k = `${x.sym}|${x.side}|${x.entryT}`;
    const p = by.get(k) ?? { sym: x.sym, side: x.side, entryT: x.entryT, exitT: x.exitT, usd: 0, hand: false };
    p.usd += x.r * x.notional;
    p.exitT = Math.max(p.exitT, x.exitT);
    if (x.reason === "hand") p.hand = true;
    by.set(k, p);
  }
  const list: RelationPosition[] = [];
  const hand = { n: 0, usd: 0 };
  let gp = 0;
  let gl = 0;
  let usd = 0;
  for (const p of [...by.values()].sort((a, b) => a.exitT - b.exitT)) {
    if (!(p.exitT >= from && p.exitT <= to)) continue;
    if (p.hand) {
      hand.n++;
      hand.usd += p.usd;
      continue;
    }
    const ls = matched.filter(
      (m) => m.l.sym === p.sym && (m.l.side > 0 ? 1 : -1) === p.side && m.l.exit_t >= p.entryT && m.l.exit_t <= p.exitT + LANE_TOLERANCE_MS,
    );
    const mean = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length) * 100 : null);
    list.push({
      sym: p.sym,
      side: p.side,
      entryT: p.entryT,
      exitT: p.exitT,
      usd: p.usd,
      lanes: ls.length,
      systemMeanR: mean(ls.map((m) => m.rSys)),
      exchangeMeanR: mean(ls.map((m) => m.l.r)),
    });
    usd += p.usd;
    if (p.usd > 0) gp += p.usd;
    else gl -= p.usd;
  }
  return { n: list.length, pf: list.length ? profitFactor(gp, gl) : 0, usd, hand, list };
}

// ── the report ────────────────────────────────────────────────

const f = (x: number | null | undefined, k = 2) => (x === null || x === undefined ? "–" : Number.isFinite(x) ? x.toFixed(k) : "∞");
const iso = (t: number | null) => (t === null || !Number.isFinite(t) ? "–" : new Date(t).toISOString().slice(0, 16).replace("T", " "));
const pfOf = (s: RelSide) => (s.n ? f(s.pf) : "–");

/** The relation as Markdown (live-vs-system.md, core-live-diff.mjs). */
export function relationMd(rel: Relation): string {
  const c = rel.counts;
  const head =
    "| | matched | exchange PF | system PF (ideal) | system PF at adoption (n) | system PF at join (n) | exchange net % | system net % | gap % | entry (adoption) % | entry (join) % | exit % | fees % | undecomposed % | exchange only | system open | system dropped | system only |\n" +
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|";
  const line = (g: RelationGroup) =>
    `| ${g.key} | ${g.matched} | ${pfOf(g.exchange)} | ${pfOf(g.system)} | ${pfOf(g.systemAtAdoption)} (${g.systemAtAdoption.n}) | ` +
    `${pfOf(g.systemAtJoin)} (${g.systemAtJoin.n}) | ${f(g.exchange.net, 1)} | ${f(g.system.net, 1)} | ${f(g.gap.total, 2)} | ` +
    `${f(g.gap.entryAdoption, 2)} | ${f(g.gap.entryJoin, 2)} | ${f(g.gap.exit, 2)} | ${f(g.gap.fees, 2)} | ${f(g.gap.undecomposed, 2)} | ` +
    `${g.exchangeOnly} | ${g.systemOpen} | ${g.systemDropped} | ${g.systemOnly} |`;
  const pos = rel.positions;
  return [
    "### Live vs system (own exchange lanes against the paper book's own record)",
    `Window ${iso(rel.from)} → ${iso(rel.to)} UTC; the paper book's record starts ${iso(rel.coverageFrom)}. ` +
      "gap = exchange − system, trade % summed over the matched lanes: negative = the exchange did worse. " +
      "entry (adoption) + entry (join) + exit + fees + undecomposed = gap (a lane without the book's adoption price " +
      "has its whole entry share in entry (join); one without the system's prices is undecomposed).",
    "",
    `Own exchange lanes: ${c.own} · matched ${c.matched} (${rel.events} events) · exchange only ${c.exchangeOnly} · ` +
      `system open ${c.systemOpen} · system dropped ${c.systemDropped} · outside the coverage ${c.outsideCoverage}. ` +
      `Not own closes (compared with nothing): hand ${c.excluded.hand} · unverified ${c.excluded.unverified} · ` +
      `restart ${c.excluded.restart}${c.excluded.other ? ` · other ${c.excluded.other}` : ""}. ` +
      `System closes the exchange never held: ${c.systemOnly}.`,
    "",
    head,
    line(rel.total),
    ...rel.byRange.map(line),
    "",
    "### Per real position (own fills, USD; positions an order not ours ended are left out)",
    pos
      ? `Positions ${pos.n} · PF ${pfOf({ n: pos.n, pf: pos.pf, net: 0 })} · net $${f(pos.usd, 2)} — per lane (every own lane): ` +
        `${rel.ownLanes.n} lanes PF ${pfOf(rel.ownLanes)}. Ended by an order not ours: ${pos.hand.n} ($${f(pos.hand.usd, 2)}).`
      : "No ledger.",
    ...(pos && pos.list.length
      ? [
          "",
          "| position | opened | closed | USD | matched lanes | mean exchange r % | mean system r % |\n|---|---|---|---:|---:|---:|---:|",
          ...pos.list.map(
            (p) =>
              `| ${p.sym} ${p.side > 0 ? "long" : "short"} | ${iso(p.entryT)} | ${iso(p.exitT)} | ${f(p.usd, 3)} | ${p.lanes} | ${f(p.exchangeMeanR, 3)} | ${f(p.systemMeanR, 3)} |`,
          ),
        ]
      : []),
    "",
    "### Per hour (exchange exit hour)",
    head,
    ...rel.byHour.map(line),
    "",
    `Exchange stop-outs of lanes the system closed in profit: ${rel.stopMismatch}`,
    "",
    "### Worst matched lanes (exchange − system, trade %)",
    "| lane | system % | exchange % | gap % | entry (adoption) | entry (join) | exit | fees | exchange exit |\n|---|---:|---:|---:|---:|---:|---:|---:|---|",
    ...rel.worst.map(
      (w) =>
        `| ${w.id} | ${f(w.system, 3)} | ${f(w.exchange, 3)} | ${f(w.gap, 3)} | ${f(w.parts?.entryAdoption, 3)} | ${f(w.parts?.entryJoin, 3)} | ${f(w.parts?.exit, 3)} | ${f(w.parts?.fees, 3)} | ${w.reason} |`,
    ),
  ].join("\n");
}

// ── the standing guard ────────────────────────────────────────

export type RelationAlarmKind = "pf-ratio" | "unmatched" | "unit-disagree";
export interface RelationAlarm {
  kind: RelationAlarmKind;
  msg: string;
}
export interface RelationCheck {
  /** judged once the window holds ≥ minMatched matched lanes from ≥ minEvents events */
  judged: boolean;
  why: string;
  matched: number;
  events: number;
  /** exchange PF / system PF at the join price, over the lanes with the system's prices (else the ideal system PF) */
  pfExchange: number | null;
  pfSystem: number | null;
  basis: "at join" | "ideal";
  ratio: number | null;
  /** (exchange only + unverified) / (own + unverified) */
  unmatchedShare: number | null;
  positionsPf: number | null;
  lanesPf: number | null;
  /** the entry-timing share: Σ entry (join), trade %, and its share of the gap (reported, never an alarm) */
  timing: { entryJoin: number; share: number | null };
  alarms: RelationAlarm[];
}

export const RELATION_CHECK = {
  windowH: 48,
  minMatched: 20,
  minEvents: 3,
  /** PF exchange / PF system at join outside [low, high] */
  low: 0.67,
  high: 1.5,
  maxUnmatched: 0.2,
  /** at most one warn event per alarm kind in this time */
  warnEveryMs: H,
} as const;

/**
 * The relation's standing check (each desk report over the last 48 h): an alarm when the exchange and the system
 * part ways — PF exchange / PF system at the join price outside 0.67–1.5, more than 20 % of the own rows unmatched or
 * unverified, or the real positions (USD) and the lanes disagree about PF 1. Alarm only: no trading effect.
 */
export function relationCheck(rel: Relation, o: Partial<typeof RELATION_CHECK> = {}): RelationCheck {
  const k = { ...RELATION_CHECK, ...o };
  const t = rel.total;
  const atJoin = t.systemAtJoin.n >= k.minMatched;
  const pfExchange = t.matched ? (atJoin ? t.exchangeAtJoinLanes.pf : t.exchange.pf) : null;
  const pfSystem = t.matched ? (atJoin ? t.systemAtJoin.pf : t.system.pf) : null;
  const ratio = pfExchange !== null && pfSystem !== null && pfSystem > 0 ? pfExchange / pfSystem : null;
  const claimed = rel.counts.own + rel.counts.excluded.unverified;
  const unmatchedShare = claimed ? (rel.counts.exchangeOnly + rel.counts.excluded.unverified) / claimed : null;
  const positionsPf = rel.positions?.n ? rel.positions.pf : null;
  const lanesPf = rel.ownLanes.n ? rel.ownLanes.pf : null;
  const timing = { entryJoin: t.gap.entryJoin, share: Math.abs(t.gap.total) > 1e-12 ? t.gap.entryJoin / t.gap.total : null };
  const judged = t.matched >= k.minMatched && rel.events >= k.minEvents;
  const why = judged ? "" : `matched ${t.matched} of ${k.minMatched}, events ${rel.events} of ${k.minEvents}`;
  const alarms: RelationAlarm[] = [];
  if (judged) {
    if (ratio !== null && (ratio < k.low || ratio > k.high))
      alarms.push({
        kind: "pf-ratio",
        msg: `exchange PF ${f(pfExchange)} vs system PF ${atJoin ? "at the join price" : "(ideal)"} ${f(pfSystem)}: ratio ${f(ratio)} outside ${k.low}–${k.high} (${t.matched} matched lanes)`,
      });
    if (unmatchedShare !== null && unmatchedShare > k.maxUnmatched)
      alarms.push({
        kind: "unmatched",
        msg: `${rel.counts.exchangeOnly} exchange-only + ${rel.counts.excluded.unverified} unverified of ${claimed} own rows (${(100 * unmatchedShare).toFixed(0)} % > ${100 * k.maxUnmatched} %)`,
      });
    if (positionsPf !== null && lanesPf !== null && positionsPf >= 1 !== lanesPf >= 1)
      alarms.push({
        kind: "unit-disagree",
        msg: `the real positions (USD) PF ${f(positionsPf)} and the lanes PF ${f(lanesPf)} disagree about PF 1`,
      });
  }
  return { judged, why, matched: t.matched, events: rel.events, pfExchange, pfSystem, basis: atJoin ? "at join" : "ideal", ratio, unmatchedShare, positionsPf, lanesPf, timing, alarms };
}

/** The alarms due for a warn event now (≤ once per `everyMs` per kind); `last` (kind → last warned) is updated. */
export function relationWarnsDue(
  alarms: readonly RelationAlarm[],
  last: Map<string, number>,
  now: number,
  everyMs: number = RELATION_CHECK.warnEveryMs,
): RelationAlarm[] {
  const due: RelationAlarm[] = [];
  for (const a of alarms) {
    const t = last.get(a.kind);
    if (t !== undefined && now - t < everyMs) continue;
    last.set(a.kind, now);
    due.push(a);
  }
  return due;
}

/** One line for the desk's stderr. */
export function relationLine(rel: Relation, chk: RelationCheck): string {
  const pct = (x: number | null) => (x === null ? "–" : `${(100 * x).toFixed(0)} %`);
  return (
    `relation ${RELATION_CHECK.windowH} h: ${chk.matched} matched lanes (${chk.events} events) · exchange PF ${f(chk.pfExchange)} vs system ${chk.basis} ${f(chk.pfSystem)}` +
    ` · unmatched ${pct(chk.unmatchedShare)} · positions PF ${f(chk.positionsPf)} / lanes PF ${f(chk.lanesPf)}` +
    ` · entry timing ${f(chk.timing.entryJoin, 1)} % of gap ${f(rel.total.gap.total, 1)} %` +
    ` · not own: hand ${rel.counts.excluded.hand}, unverified ${rel.counts.excluded.unverified}` +
    (chk.judged ? (chk.alarms.length ? ` · ALARM ${chk.alarms.map((a) => a.kind).join(", ")}` : " · ok") : ` · not judged (${chk.why})`)
  );
}
