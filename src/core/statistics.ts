// Statistics: one complete report of a trade book — the time line (balance, equity marked to market, margin used,
// open config sets, positions, orders), every breakdown (type and sub-type, range, lane, indication kind, bot,
// symbol, exit reason, hour of day, weekday × hour), every config with its parameters and dates, and the execution
// presets computed on the same tapes (with / without Block, Block Active, DCA, DCA Active, Axis, Trailing).
// Pure: the server function hands in the trades, the sizing and a price lookup.
import {
  profitFactor,
  statsOf,
  modeledUnitStatsOf as unitStatsOf,
  type UnitStats,
} from "./metrics/stats.ts";
import { closedPositions } from "./positions.ts";
import { parseConfigId, kindOfId } from "./pipeline/pipeline.ts";
import { rangeOfId, RANGE_LABEL } from "./minimal-coord.ts";
import { liveGroupOf } from "./live-validation.ts";
import { INDICATION_BY_ID, isSignalInd, laneLabel, laneOf } from "./indications/registry.ts";
import { isSignalCoordinationInd } from "./signal-coordination.ts";
import type { Stats, StratKind } from "./domain/types.ts";
import { RT_COST } from "./model-cost.ts";

const H = 3_600_000;
const M = 60_000;

/** Latest one-minute candle close available at `t` (candle timestamps are their open times). */
export function minuteCloseAtOrBefore(closes: ReadonlyMap<number, number>, t: number): number | null {
  const lastClosedOpen = Math.floor(t / M) * M - M;
  for (let k = 0; k < 5; k++) {
    const value = closes.get(lastClosedOpen - k * M);
    if (value !== undefined) return value;
  }
  return null;
}

/** The trade fields the statistics read (simulated trades carry all of them; paper closes only some). */
export interface StatTrade {
  cfg: string;
  sym: string;
  side: number;
  entryT: number;
  exitT: number;
  entry: number;
  r: number;
  reason?: string;
  kind?: StratKind;
  vol?: number;
  level?: number;
  mult?: number;
  /** Exact Block multiplier before coordination, strategy, range and additive Relate sizing. */
  blockVol?: number;
  /** Persisted unit net return; explicit null marks a legacy close whose execution weighting is unknown. */
  unitR?: number | null;
  coordVol?: number;
  relateVol?: number;
  volFactor?: number;
  hedgeVol?: number;
  rangeVol?: number;
  /** Block type overall: the extra volume of every raising source */
  legs?: Partial<Record<string, number>>;
}

export interface TimelinePoint {
  t: number;
  /** start balance + realized P&L */
  balance: number;
  /** balance + open orders marked to market (cost included) */
  equity: number;
  /** margin of the open orders (notional × volume ÷ leverage) */
  margin: number;
  /** distinct config sets with an open order */
  sets: number;
  /** distinct symbol × direction */
  positions: number;
  orders: number;
  /** drawdown of the equity from its peak, % */
  ddPct: number;
}

export interface TimelineOpts {
  startT: number;
  endT: number;
  balance: number;
  /** unit notional (USD) of an order */
  unit: (x: StatTrade) => number;
  /** latest fully closed one-minute price at t (null = unknown: no MTM is added for that symbol) */
  price: (sym: string, t: number) => number | null;
  cost: number;
  leverage: number;
  /** at most this many points (the step is at least one minute) */
  points?: number;
}

export interface Timeline {
  points: TimelinePoint[];
  stepMs: number;
  peak: number;
  maxDd: number;
  maxDdPct: number;
  /** longest time the equity stayed below a prior peak, hours */
  maxDdH: number;
  marginMax: number;
  ordersMax: number;
  positionsMax: number;
  setsMax: number;
}

/**
 * Balance / equity / margin / open book over [startT, endT]. Equity-risk extrema are measured at each minute
 * (and each trade event); `points` only controls chart sampling. Margin is tracked separately and never enters DD.
 * Active orders are aggregated by symbol so a 90-day window does not rescan every order at every minute.
 */
export function timeline(trades: readonly StatTrade[], o: TimelineOpts): Timeline {
  const span = Math.max(M, o.endT - o.startT);
  const stepMs = Math.max(M, Math.ceil(span / Math.max(2, o.points ?? 600) / M) * M);
  const byEntry = [...trades].sort((a, b) => a.entryT - b.entryT);
  const byExit = [...trades].sort((a, b) => a.exitT - b.exitT);
  type OpenOrder = { sym: string; pos: string; cfg: string; slope: number; intercept: number; margin: number };
  type Exposure = { slope: number; intercept: number; margin: number; orders: number };
  const open = new Map<StatTrade, OpenOrder>();
  const exposure = new Map<string, Exposure>();
  const posCounts = new Map<string, number>();
  const cfgCounts = new Map<string, number>();
  let margin = 0;
  const addCount = (map: Map<string, number>, key: string, delta: number) => {
    const next = (map.get(key) ?? 0) + delta;
    if (next) map.set(key, next);
    else map.delete(key);
  };
  const changeOpen = (x: StatTrade, direction: 1 | -1) => {
    if (direction > 0) {
      const notional = o.unit(x) * (x.vol ?? 1);
      const slope = x.entry > 0 ? (x.side * notional) / x.entry : 0;
      const intercept = x.entry > 0 ? -x.side * notional - o.cost * notional : 0;
      const m = notional / Math.max(1, o.leverage);
      const row = { sym: x.sym, pos: `${x.sym}|${x.side > 0 ? 1 : -1}`, cfg: x.cfg, slope, intercept, margin: m };
      open.set(x, row);
      const e = exposure.get(x.sym) ?? { slope: 0, intercept: 0, margin: 0, orders: 0 };
      e.slope += slope;
      e.intercept += intercept;
      e.margin += m;
      e.orders++;
      exposure.set(x.sym, e);
      addCount(posCounts, row.pos, 1);
      addCount(cfgCounts, row.cfg, 1);
      margin += m;
      return;
    }
    const row = open.get(x);
    if (!row) return;
    const e = exposure.get(row.sym)!;
    e.slope -= row.slope;
    e.intercept -= row.intercept;
    e.margin -= row.margin;
    e.orders--;
    if (!e.orders) exposure.delete(row.sym);
    addCount(posCounts, row.pos, -1);
    addCount(cfgCounts, row.cfg, -1);
    margin -= row.margin;
    open.delete(x);
  };
  let ei = 0;
  let xi = 0;
  let realized = 0;
  // results closed before the window count into the starting balance of the window
  while (xi < byExit.length && byExit[xi].exitT <= o.startT) {
    const x = byExit[xi++];
    realized += x.r * o.unit(x);
  }
  while (ei < byEntry.length && byEntry[ei].entryT <= o.startT) {
    if (byEntry[ei].exitT > o.startT) changeOpen(byEntry[ei], 1);
    ei++;
  }
  const out: TimelinePoint[] = [];
  let peak = -Infinity;
  let peakT = o.startT;
  let maxDd = 0;
  let maxDdPct = 0;
  let maxDdH = 0;
  let marginMax = 0;
  let ordersMax = 0;
  let positionsMax = 0;
  let setsMax = 0;
  let nextMinute = Math.min(o.endT, o.startT + M);
  let nextPlot = Math.min(o.endT, o.startT + stepMs);
  let t = o.startT;
  let initialSample = true;
  for (;;) {
    const entryT = byEntry[ei]?.entryT ?? Infinity;
    const exitT = byExit[xi]?.exitT ?? Infinity;
    const isInitial = initialSample;
    const sampleT = initialSample
      ? o.startT
      : Math.min(nextMinute, nextPlot, entryT > t ? entryT : Infinity, exitT > t ? exitT : Infinity, o.endT);
    initialSample = false;
    t = sampleT;
    // Settle first, then admit same-time entries only when they remain open after this instant.
    while (xi < byExit.length && byExit[xi].exitT <= t) {
      const x = byExit[xi++];
      realized += x.r * o.unit(x);
      changeOpen(x, -1);
    }
    while (ei < byEntry.length && byEntry[ei].entryT <= t) {
      const x = byEntry[ei++];
      if (x.exitT > t) changeOpen(x, 1);
    }
    let mtm = 0;
    for (const [sym, e] of exposure) {
      const p = o.price(sym, t);
      if (p !== null) mtm += e.slope * p + e.intercept;
    }
    const balance = o.balance + realized;
    const equity = balance + mtm;
    if (equity >= peak) {
      peak = equity;
      peakT = t;
    }
    const dd = peak - equity;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    maxDd = Math.max(maxDd, dd);
    maxDdPct = Math.max(maxDdPct, ddPct);
    maxDdH = Math.max(maxDdH, (t - peakT) / H);
    marginMax = Math.max(marginMax, margin);
    ordersMax = Math.max(ordersMax, open.size);
    positionsMax = Math.max(positionsMax, posCounts.size);
    setsMax = Math.max(setsMax, cfgCounts.size);
    if (isInitial || t === nextPlot || t === o.endT) {
      out.push({ t, balance, equity, margin, sets: cfgCounts.size, positions: posCounts.size, orders: open.size, ddPct });
      if (t === nextPlot && nextPlot < o.endT) nextPlot = Math.min(o.endT, nextPlot + stepMs);
    }
    if (t >= o.endT) break;
    if (t === nextMinute && nextMinute < o.endT) nextMinute = Math.min(o.endT, nextMinute + M);
  }
  return {
    points: out,
    stepMs,
    peak,
    maxDd,
    maxDdPct,
    maxDdH,
    marginMax,
    ordersMax,
    positionsMax,
    setsMax,
  };
}

export interface GroupRow {
  key: string;
  n: number;
  wins: number;
  losses: number;
  wr: number;
  /** PF of normalized returns; use cashPf for the money actually earned / lost. */
  pf: number | null;
  pfBasis: UnitStats["pfBasis"];
  unknownReturns: number;
  /** Gross normalized returns in percentage points, the same sums behind `pf`. */
  returnGp: number | null;
  returnGl: number | null;
  /** No losing return: numeric PF uses the shared engine sentinel, not an exact finite ratio. */
  noLoss: boolean | null;
  pfConvention: "gross-return-ratio" | "no-loss-sentinel" | "unavailable";
  /** Dollar gains / dollar losses at this book's actual order notionals. */
  cashPf: number;
  /** Explicit cash no-loss convention; numeric cash PF alone cannot identify a sentinel. */
  cashNoLoss: boolean;
  /** Sum of recorded volume-weighted return points; neither normalized unit net nor actual dollar P&L. */
  net: number;
  /** result in USD at the book's sizing */
  usd: number;
  /** Mean and path diagnostics from the recorded volume-weighted return stream. */
  avg: number;
  ddt: number;
  gh: number;
  positions: number;
  avgHoldMin: number;
  firstT: number;
  lastT: number;
}

/** One row of statistics for a set of trades (trades in any order). */
export function rowOf(
  key: string,
  xs: readonly StatTrade[],
  unit: (x: StatTrade) => number,
): GroupRow {
  const sorted = [...xs].sort((a, b) => a.exitT - b.exitT);
  const s: Stats = statsOf(sorted);
  const primary = unitStatsOf(sorted);
  const knownBasis = primary.pfBasis === "unit-net-returns";
  let cashGp = 0;
  let cashGl = 0;
  for (const x of xs) {
    const pnl = x.r * unit(x);
    if (pnl > 0) cashGp += pnl;
    else cashGl -= pnl;
  }
  return {
    key,
    n: s.n,
    wins: s.wins,
    losses: s.losses,
    wr: s.wr,
    pf: knownBasis ? primary.pf : null,
    pfBasis: primary.pfBasis,
    unknownReturns: primary.unknownReturns,
    returnGp: knownBasis ? primary.gp : null,
    returnGl: knownBasis ? primary.gl : null,
    noLoss: knownBasis ? primary.gp > 0 && primary.gl === 0 : null,
    pfConvention: !knownBasis
      ? "unavailable"
      : primary.gp > 0 && primary.gl === 0
        ? "no-loss-sentinel"
        : "gross-return-ratio",
    cashPf: !Number.isFinite(cashGp) || !Number.isFinite(cashGl) ? NaN : xs.length ? profitFactor(cashGp, cashGl) : 0,
    cashNoLoss: cashGp > 0 && cashGl === 0,
    net: s.net,
    usd: cashGp - cashGl,
    avg: s.avg,
    ddt: s.ddt,
    gh: s.gh,
    positions: closedPositions(xs),
    avgHoldMin: s.avgHoldMin,
    firstT: s.firstT,
    lastT: s.lastT,
  };
}

/**
 * Rows per key (a trade may fall into several keys); sorted by the key order given, else by trade count. `share`: the
 * part of a trade a key carries (1 = the whole trade; a Block Overall source row carries its own leg).
 */
export function groupBy(
  trades: readonly StatTrade[],
  keys: (x: StatTrade) => string | readonly string[] | null,
  unit: (x: StatTrade) => number,
  order?: readonly string[],
  share?: (x: StatTrade, key: string) => number,
): GroupRow[] {
  const by = new Map<string, StatTrade[]>();
  for (const x of trades) {
    const k = keys(x);
    if (k === null) continue;
    for (const key of typeof k === "string" ? [k] : k) {
      let xs = by.get(key);
      if (!xs) by.set(key, (xs = []));
      const f = share ? share(x, key) : 1;
      xs.push(f === 1 ? x : { ...x, r: x.r * f, ...(x.vol !== undefined ? { vol: x.vol * f } : {}) });
    }
  }
  const rows = [...by.entries()].map(([k, xs]) => rowOf(k, xs, unit));
  if (order) {
    const rank = new Map(order.map((k, i) => [k, i]));
    return rows.sort((a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99) || b.n - a.n);
  }
  return rows.sort((a, b) => b.n - a.n);
}

export const TYPE_ORDER = [
  "Normal",
  "Trailing",
  "Trailing only",
  "Historic Exit",
  "Axis",
  "DCA",
  "DCA Active",
  "Signals",
  "Signals Coordination",
] as const;
export const KIND_LABEL: Record<StratKind, string> = {
  normal: "Normal",
  trailing: "Trailing",
  "trailing-only": "Trailing only",
  exit: "Historic Exit",
  axis: "Axis",
  dca: "DCA",
  "dca-active": "DCA Active",
};

const indOf = (cfg: string) => cfg.split("|")[1] ?? "";
export const kindOfTrade = (x: StatTrade): StratKind => x.kind ?? kindOfId(x.cfg);
/** Block multiple before independent coordination, strategy, range, hedge and additive Relate sizing. */
export const blockMult = (x: StatTrade) => x.blockVol ??
  (x.mult ?? 1) / ((x.coordVol ?? 1) * (x.relateVol ?? 1) * (x.volFactor ?? 1) * (x.hedgeVol ?? 1) * (x.rangeVol ?? 1));

/** Main type of a trade: Signals, or its sub-strategy. */
export function typeOf(x: StatTrade): string {
  const ind = indOf(x.cfg);
  return isSignalCoordinationInd(ind)
    ? "Signals Coordination"
    : isSignalInd(ind)
      ? "Signals"
      : KIND_LABEL[kindOfTrade(x)];
}

const indKindOf = (ind: string) => isSignalCoordinationInd(ind)
  ? "signal-coordination"
  : INDICATION_BY_ID.get(laneOf(ind).base)?.kind ?? (isSignalInd(ind) ? "signal" : "none");

/**
 * Sub-types: Block-raised (volume above 1), at a Block Active level (level ≥ min active level, raised) or a plain
 * entry; DCA and DCA Active; Axis. Only trades that carry Block / DCA detail (the simulated run) are split.
 */
export function subTypeOf(x: StatTrade, minActiveLevel: number): string[] {
  const out: string[] = [];
  const k = kindOfTrade(x);
  if (k === "normal" || k === "trailing") {
    const m = blockMult(x);
    if (x.mult === undefined) out.push("Base (no Block detail)");
    else if (m > 1 + 1e-9) {
      out.push("Block raised");
      out.push(
        (x.level ?? 0) >= Math.max(1, minActiveLevel)
          ? "Block Active level"
          : "Block below Active level",
      );
      // Block type overall: each raising source is its own position
      for (const [src, v] of Object.entries(x.legs ?? {}))
        if ((v ?? 0) > 0) out.push(`Block ${src}`);
    } else out.push("Base (unit volume)");
  } else if (k === "dca") out.push("DCA");
  else if (k === "dca-active") out.push("DCA Active");
  else if (k === "axis") out.push("Axis");
  return out;
}

/**
 * The part of a trade a sub-type row carries: a Block Overall source row ("Block overall", "Block symbol" …) its own
 * original-base leg. The row's P&L share accounts for fixed factors and any common stack cap; additive Relate volume
 * is separate and does not inflate the Block leg. Every other row carries the whole trade.
 */
export function subTypeShare(x: StatTrade, key: string): number {
  if (!key.startsWith("Block ") || !x.legs) return 1;
  const v = (x.legs as Record<string, number | undefined>)[key.slice(6)];
  if (v === undefined) return 1;
  const fixed = (x.coordVol ?? 1) * (x.volFactor ?? 1) * (x.hedgeVol ?? 1) * (x.rangeVol ?? 1);
  const blockBase = blockMult(x) * fixed;
  const total = x.mult ?? (blockBase + Math.max(0, (x.relateVol ?? 1) - 1));
  if (!(total > 0) || !(blockBase > 0)) return 0;
  const baseScale = Math.min(1, total / blockBase);
  const relationScale = (x.relateVol ?? 1) < 1 ? (x.relateVol ?? 1) : 1;
  return Math.min(1, Math.max(0, v) * fixed * baseScale * relationScale / total);
}

/** Execution presets compared on the same tapes: [label, with, without]. */
export const WITH_WITHOUT: ReadonlyArray<[string, string, string]> = [
  ["Trailing", "normal-trailing", "normal"],
  ["Block", "block", "normal-trailing"],
  ["Block Active", "block-active", "block"],
  ["DCA", "all-on", "block"],
  // the "Normal + DCA Active" preset switches DCA and DCA Active on together: the row measures both
  ["DCA + DCA Active", "normal+dca-active", "normal"],
  ["DCA Active vs DCA", "dca-active", "dca"],
  ["Axis", "normal+axis", "normal"],
  ["Axis on all", "all-on+axis", "all-on"],
  ["Block Active + DCA Active", "block-active+dca-active", "block-active"],
];

type PresetSim = {
  label?: string;
  toggles?: Record<string, boolean>;
  stats?: Partial<UnitStats>;
  byKind?: Record<string, { n: number; net: number; pf: number }>;
};

export interface PresetPerformance {
  id: string;
  label: string;
  n: number;
  pf: number | null;
  pfBasis: UnitStats["pfBasis"];
  unknownReturns: number | null;
  /** Net-return percentage points; null for older cached presets without gross-return provenance. */
  gp: number | null;
  gl: number | null;
  noLoss: boolean | null;
  pfConvention: "gross-return-ratio" | "no-loss-sentinel" | "unavailable";
  net: number;
  ddt: number;
  wr: number;
  gh: number;
}

function presetPerformance(id: string, preset?: PresetSim): PresetPerformance {
  const s = preset?.stats ?? {};
  // New simulations normalize each executed trade before aggregation. An older weighted aggregate cannot be
  // divided safely afterward, and a unit-basis aggregate must never be normalized a second time.
  const knownBasis =
    s.pfBasis === "unit-net-returns" && s.unknownReturns === 0 && Number.isFinite(s.pf);
  const validGross = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  const gp = knownBasis && validGross(s.gp) ? s.gp : null;
  const gl = knownBasis && validGross(s.gl) ? s.gl : null;
  const noLoss = gp !== null && gl !== null ? gp > 0 && gl === 0 : null;
  return {
    id,
    label: preset?.label ?? id,
    n: s.n ?? 0,
    pf: knownBasis && typeof s.pf === "number" ? s.pf : null,
    pfBasis: knownBasis ? "unit-net-returns" : "unavailable",
    unknownReturns: typeof s.unknownReturns === "number" ? s.unknownReturns : null,
    gp,
    gl,
    noLoss,
    pfConvention:
      noLoss === null ? "unavailable" : noLoss ? "no-loss-sentinel" : "gross-return-ratio",
    net: s.net ?? 0,
    ddt: s.ddt ?? 0,
    wr: s.wr ?? 0,
    gh: s.gh ?? 0,
  };
}

export interface WithWithout {
  label: string;
  with: PresetPerformance;
  without: PresetPerformance;
  /** Only two nonempty, measured finite return ratios have a finite PF difference. */
  dPf: number | null;
  dNet: number;
  dDdt: number;
}

export function withWithout(presets: Record<string, PresetSim> | null | undefined): WithWithout[] {
  if (!presets) return [];
  const finiteRatio = (side: PresetPerformance): number | null =>
    side.n > 0 &&
    side.gl !== null &&
    side.gl > 0 &&
    side.noLoss === false &&
    side.pf !== null &&
    Number.isFinite(side.pf)
      ? side.pf
      : null;
  return WITH_WITHOUT.filter(([, a, b]) => presets[a] && presets[b]).map(([label, a, b]) => {
    const w = presetPerformance(a, presets[a]);
    const wo = presetPerformance(b, presets[b]);
    const wPf = finiteRatio(w);
    const woPf = finiteRatio(wo);
    return {
      label,
      with: w,
      without: wo,
      dPf: wPf !== null && woPf !== null ? wPf - woPf : null,
      dNet: w.net - wo.net,
      dDdt: w.ddt - wo.ddt,
    };
  });
}

export interface ConfigRow extends GroupRow {
  group: string;
  range: string;
  bot: string;
  ind: string;
  lane: string;
  kind: string;
  type: string;
  indKind: string;
  tp: number;
  /** Micro: the net target after the round-trip cost (price target − cost); absent for the other ranges */
  tpNet?: number;
  sl: number;
  trail: number;
  holdBars: number;
  syms: number;
}

export interface StatisticsReport {
  source: string;
  startT: number;
  endT: number;
  balance0: number;
  /** balance at the window's start (the timeline's first point: balance0 + closes before the window) */
  balanceStart: number;
  total: GroupRow & { usdEnd: number; mdd: number; expectancy: number; sqn: number; tph: number };
  /** live closes an order not ours made: in the balance, not in any PF or breakdown */
  hand: { n: number; usd: number };
  /**
   * live closes whose cause is not proven: a flat marker priced from the attributed lane exit or the 1m close at its
   * time, or the unverified marker booked at the ticker; kept in the balance, out of every PF, counted apart from hand
   */
  flat: { n: number; usd: number };
  /** positions open at the window's end (marked to market in the timeline, never a close) */
  open: { n: number; positions: number; notional: number };
  timeline: Timeline;
  types: GroupRow[];
  subTypes: GroupRow[];
  ranges: GroupRow[];
  strategyGroups: GroupRow[];
  lanes: GroupRow[];
  indKinds: GroupRow[];
  bots: GroupRow[];
  symbols: GroupRow[];
  reasons: GroupRow[];
  sides: GroupRow[];
  hourOfDay: GroupRow[];
  /** weekday (0 = Sunday) × hour (UTC): net %, closes */
  heat: Array<{ d: number; h: number; net: number; n: number }>;
  /** every UTC day of the window (empty days with n 0) */
  daily: GroupRow[];
  /** the configs listed: all of them, or the best and worst `maxConfigs` by USD result */
  configs: ConfigRow[];
  /** every config with a close in the window (configs.length may be fewer) */
  configCount: number;
  withWithout: WithWithout[];
  presets: PresetPerformance[];
  detail: { blockDetail: boolean; kindDetail: boolean };
}

export interface StatisticsInput {
  source: string;
  trades: readonly StatTrade[];
  startT: number;
  endT: number;
  balance: number;
  unit: (x: StatTrade) => number;
  price: (sym: string, t: number) => number | null;
  cost: number;
  leverage: number;
  minActiveLevel: number;
  presets?: Record<string, PresetSim> | null;
  /** most configs listed (best and worst by result) */
  maxConfigs?: number;
  /**
   * positions still open at endT (live: the own ledger's open positions): marked to market in the timeline only,
   * never a close; `exitT` is ignored
   */
  open?: readonly StatTrade[];
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

/** An empty row (no closes) for a key. */
export const emptyRow = (key: string): GroupRow => ({
  key,
  n: 0,
  wins: 0,
  losses: 0,
  wr: 0,
  pf: 0,
  pfBasis: "unit-net-returns",
  unknownReturns: 0,
  returnGp: 0,
  returnGl: 0,
  noLoss: false,
  pfConvention: "gross-return-ratio",
  cashPf: 0,
  cashNoLoss: false,
  net: 0,
  usd: 0,
  avg: 0,
  ddt: 0,
  gh: 0,
  positions: 0,
  avgHoldMin: 0,
  firstT: 0,
  lastT: 0,
});

/** The rows in the order of `keys`, an empty row for every key without closes (rows of other keys are appended). */
export function fillKeys(rows: readonly GroupRow[], keys: readonly string[]): GroupRow[] {
  const by = new Map(rows.map((r) => [r.key, r]));
  const out = keys.map((k) => by.get(k) ?? emptyRow(k));
  const known = new Set(keys);
  for (const r of rows) if (!known.has(r.key)) out.push(r);
  return out;
}

/** Every UTC day (YYYY-MM-DD) a close in (startT, endT] can fall on, oldest first (at most 400). */
export function daysOf(startT: number, endT: number): string[] {
  if (!(endT > startT)) return [];
  const out: string[] = [];
  const D = 86_400_000;
  const last = Math.floor((endT - 1) / D);
  for (let d = Math.max(Math.floor(startT / D), last - 399); d <= last; d++)
    out.push(new Date(d * D).toISOString().slice(0, 10));
  return out;
}

export function buildStatistics(i: StatisticsInput): StatisticsReport {
  // a live close an order not ours made ("hand", relation.ts) is money, not a result: in the balance (the timeline
  // reads every trade), left out of every PF and breakdown, and counted apart
  const inWindow = i.trades.filter((x) => x.exitT > i.startT && x.exitT <= i.endT);
  // a live close whose cause is not proven ("flat": the unverified marker at the ticker, or a marker priced from the
  // attributed lane exit or the 1m close at its time, the order that ended it unknown) is counted the same way, apart
  // from hand
  const apart = (x: StatTrade) => x.reason === "hand" || x.reason === "flat";
  const trades = inWindow.filter((x) => !apart(x));
  const unit = i.unit;
  const handTrades = inWindow.filter((x) => x.reason === "hand");
  const hand = { n: handTrades.length, usd: handTrades.reduce((a, x) => a + x.r * unit(x), 0) };
  const flatTrades = inWindow.filter((x) => x.reason === "flat");
  const flat = { n: flatTrades.length, usd: flatTrades.reduce((a, x) => a + x.r * unit(x), 0) };
  const openNow = (i.open ?? []).map((x) => ({ ...x, exitT: Infinity, r: 0 }));
  const all = rowOf("All", trades, unit);
  const s = statsOf([...trades].sort((a, b) => a.exitT - b.exitT));
  const tl = timeline(openNow.length ? [...i.trades, ...openNow] : i.trades, {
    startT: i.startT,
    endT: i.endT,
    balance: i.balance,
    unit,
    price: i.price,
    cost: i.cost,
    leverage: i.leverage,
  });
  const configs = groupBy(trades, (x) => x.cfg, unit).map((r): ConfigRow => {
    const p = parseConfigId(r.key);
    const ind = indOf(r.key);
    const xs = trades.filter((x) => x.cfg === r.key);
    const first = xs[0];
    return {
      ...r,
      bot: r.key.split("|")[0] ?? "",
      ind,
      lane: laneLabel(ind) || "plain",
      kind: KIND_LABEL[first ? kindOfTrade(first) : kindOfId(r.key)],
      type: first ? typeOf(first) : "Normal",
      // source signals and range-tagged coordination configs each retain their own live/statistics group
      group: liveGroupOf(r.key),
      range: liveGroupOf(r.key),
      indKind: indKindOf(ind),
      tp: p?.protect.tp ?? 0,
      ...(p && rangeOfId(r.key) === "mc" ? { tpNet: +(p.protect.tp - i.cost).toFixed(6) } : {}),
      sl: p?.protect.sl ?? 0,
      trail: p?.protect.trail ?? 0,
      holdBars: p?.protect.hold ?? 0,
      syms: new Set(xs.map((x) => x.sym)).size,
    };
  });
  const maxConfigs = i.maxConfigs ?? 300;
  const byUsd = [...configs].sort((a, b) => b.usd - a.usd);
  const shown =
    byUsd.length <= maxConfigs
      ? byUsd
      : [...byUsd.slice(0, Math.ceil(maxConfigs / 2)), ...byUsd.slice(-Math.floor(maxConfigs / 2))];
  const heat = new Map<string, { d: number; h: number; net: number; n: number }>();
  for (const x of trades) {
    const dt = new Date(x.exitT - 1);
    const k = `${dt.getUTCDay()}|${dt.getUTCHours()}`;
    const c = heat.get(k) ?? { d: dt.getUTCDay(), h: dt.getUTCHours(), net: 0, n: 0 };
    c.net += x.r * 100;
    c.n++;
    heat.set(k, c);
  }
  const presets = i.presets
    ? Object.entries(i.presets).map(([id, p]) => presetPerformance(id, p))
    : [];
  return {
    source: i.source,
    startT: i.startT,
    endT: i.endT,
    balance0: i.balance,
    balanceStart: tl.points[0]?.balance ?? i.balance,
    total: {
      ...all,
      usdEnd: tl.points.at(-1)?.balance ?? i.balance,
      mdd: s.mdd,
      expectancy: s.expectancy,
      sqn: s.sqn,
      tph: s.tph,
    },
    hand,
    flat,
    open: {
      n: openNow.length,
      positions: new Set(openNow.map((x) => `${x.sym}|${x.side > 0 ? 1 : -1}`)).size,
      notional: openNow.reduce((a, x) => a + unit(x) * (x.vol ?? 1), 0),
    },
    timeline: tl,
    types: groupBy(trades, typeOf, unit, TYPE_ORDER),
    subTypes: groupBy(trades, (x) => subTypeOf(x, i.minActiveLevel), unit, [
      "Base (unit volume)",
      "Block raised",
      "Block Active level",
      "Block below Active level",
      "Block config",
      "Block overall",
      "Block symbol",
      "Block direction",
      "Block indication",
      "Block type",
      "DCA",
      "DCA Active",
      "Axis",
      "Base (no Block detail)",
    ], subTypeShare),
    ranges: groupBy(
      trades.filter((x) => Object.values(RANGE_LABEL).includes(liveGroupOf(x.cfg) as never)),
      (x) => liveGroupOf(x.cfg),
      unit,
      Object.values(RANGE_LABEL),
    ),
    strategyGroups: groupBy(
      trades.filter((x) => ["Signals", "Signals Coordination", "Historic Exit"].includes(liveGroupOf(x.cfg))),
      (x) => liveGroupOf(x.cfg),
      unit,
      ["Signals", "Signals Coordination", "Historic Exit"],
    ),
    lanes: groupBy(trades, (x) => laneLabel(indOf(x.cfg)) || "plain", unit),
    indKinds: groupBy(
      trades,
      (x) => indKindOf(indOf(x.cfg)),
      unit,
    ),
    bots: groupBy(trades, (x) => x.cfg.split("|")[0] ?? "", unit),
    symbols: groupBy(trades, (x) => x.sym, unit),
    reasons: groupBy(trades, (x) => x.reason ?? "close", unit, [
      "tp",
      "sl",
      "be",
      "trail",
      "time",
      "disarm",
      "close",
    ]),
    sides: groupBy(trades, (x) => (x.side > 0 ? "Long" : "Short"), unit, ["Long", "Short"]),
    // every hour of the day, an hour without closes as an empty row (bars are not skipped)
    hourOfDay: fillKeys(
      groupBy(trades, (x) => String(new Date(x.exitT - 1).getUTCHours()).padStart(2, "0"), unit),
      HOURS,
    ),
    heat: [...heat.values()],
    // every UTC day of the window, an empty day as an empty row
    daily: fillKeys(
      groupBy(trades, (x) => new Date(x.exitT - 1).toISOString().slice(0, 10), unit),
      daysOf(i.startT, i.endT),
    ),
    configs: shown,
    configCount: configs.length,
    withWithout: withWithout(i.presets),
    presets,
    detail: {
      blockDetail: trades.some((x) => x.mult !== undefined),
      kindDetail: trades.some((x) => x.kind !== undefined),
    },
  };
}

export const weekdayLabel = (d: number) => WEEKDAY[d] ?? String(d);
export { profitFactor };

/** A row of the live ledger (live_orders) with its fill (live_fills), by own client id. */
export interface LedgerRow {
  coid: string;
  /** Exact config written with the entry; used to preserve type and range in merged live positions. */
  cfg?: string | null;
  sym: string;
  side: number;
  kind: string;
  qty: number;
  px: number;
  status: string;
  at: number;
  fillPx?: number | null;
  fee?: number | null;
  /** New parser-confirmed measurement; legacy zero without this flag stays unknown. */
  feeKnown?: number | boolean | null;
  /** the row's note (live_orders.msg): a flat marker's "(stop | target | hand <price>)", an own close's "already flat" */
  msg?: string | null;
}

/**
 * The config-id suffix per client-id letter (after the tag): U micro, N minimal, H short, G general, L long, M plus,
 * E wide / mixed; Q a signal config — mapped to "@sig", which builds a cfg whose indication is a signal one, so
 * liveGroupOf files it under Signals. An unknown letter (older ids) stays Wide.
 */
const RANGE_OF_LETTER: Record<string, string> = {
  U: "|mc",
  N: "|mn",
  H: "|sh",
  G: "|gn",
  L: "|lg",
  M: "|mp",
  E: "",
  Q: "@sig",
};

/**
 * Live closes from the connection's own ledger: per symbol × side, the own opens / increases (O, I, E) build the
 * position at their fill prices, the own reduces / closes (R, X, C) realize it. The range comes from the client
 * id's letter after the tag (RANGE_OF_LETTER). `r` is the result per unit of the closed notional after fees;
 * `notional` is that notional in USD. A position closed by its exchange stop, its take-profit or by hand has no own
 * close order: the ledger's flat marker ("F", qty 0) ends it. The desk prices the marker with the close it attributed
 * (the venue's history, else the resting stop / take-profit that filled — live_lane_trades holds the same price):
 * with a price the rest of the position is realized there (an unmeasured exit pays the model fee share); without one
 * (px 0) it ends without a close row — no price is invented. An own close the venue answered "already flat" did not
 * fill (the side was already gone): the flat marker after it books the exit. An own open ("O") always starts a fresh
 * position — a ghost left open would otherwise absorb the next position's fills and skew its P&L.
 * A position an order not ours closed (the flat marker's "(hand <price>)") is booked with reason "hand": its money is
 * real, its result is not the desk's (relation.ts) — buildStatistics leaves it out of every PF and keeps it in the
 * balance. A position the exchange ended on a stop or take-profit the bars cannot prove (the marker's "(unverified
 * <price>)") is booked "flat": its cause is not proven, so it too is left out of every PF, not counted as an own stop-out.
 */
// Positive recorded fees retain their historical interpretation. Zero is free
// only with the new durable measurement flag; old zero placeholders keep the model share.
export function feeOf(
  x: { fee?: number | null; feeKnown?: number | boolean | null; qty: number },
  px: number,
  modelCost: number,
): number {
  return x.fee != null &&
    Number.isFinite(x.fee) &&
    (x.fee !== 0 || x.feeKnown === 1 || x.feeKnown === true)
    ? Math.abs(x.fee)
    : x.qty * px * (modelCost / 2);
}

export function measuredFee(x: { fee?: number | null; feeKnown?: number | boolean | null }): boolean {
  return typeof x.fee === "number" && Number.isFinite(x.fee) &&
    (x.fee !== 0 || x.feeKnown === 1 || x.feeKnown === true);
}

/** @param modelCost the round-trip cost charged to an unmeasured fill (the desk's settings.cost by default) */
export function liveTrades(rows: readonly LedgerRow[], tagLen: number, modelCost = RT_COST): LiveClose[] {
  return liveLedger(rows, tagLen, modelCost).closed;
}

/** A live close with its notional (USD) and the own row that closed it (the flat marker's id for an exchange exit). */
export type LiveClose = StatTrade & { notional: number; coid?: string; pxFrom?: string; feesMeasured?: boolean; pricesMeasured?: boolean };

/**
 * The own ledger as closes, the positions still open, and the flat markers that could not be priced.
 * `flatPx`: the verifiable price of a flat marker that holds none (px 0) — the attributed lane exit, else the 1m bar
 * close at the marker's time — with where it came from. A marker priced that way is booked with reason
 * "flat": its cause is not proven (stop, target or an order not ours), so like "hand" it stays in the balance and out of
 * every PF. Without a price the position ends unbooked and is counted under `unpriced` (never dropped silently).
 */
export function liveLedger(
  rows: readonly LedgerRow[],
  tagLen: number,
  modelCost = RT_COST,
  opts: { flatPx?: (sym: string, side: 1 | -1, at: number) => { px: number; from: string } | null } = {},
): {
  closed: LiveClose[];
  open: Array<{ sym: string; side: 1 | -1; qty: number; entry: number; entryT: number; cfg: string; notional: number }>;
  unpriced: Array<{ sym: string; side: 1 | -1; at: number; qty: number; notional: number }>;
} {
  const open = new Map<string, { qty: number; cost: number; fees: number; t: number; range: string; cfg: string; feesMeasured: boolean; pricesMeasured: boolean }>();
  const out: LiveClose[] = [];
  const unpriced: Array<{ sym: string; side: 1 | -1; at: number; qty: number; notional: number }> = [];
  // `q` of the position `p` realized at `px`, with its share of the opening fees and the exit's own fee
  const closeOf = (
    p: { qty: number; cost: number; fees: number; t: number; range: string; cfg: string; feesMeasured: boolean; pricesMeasured: boolean },
    x: LedgerRow,
    q: number,
    px: number,
    fee: number,
    reason: string,
  ): LiveClose => {
    const entry = p.cost / p.qty;
    const notional = q * entry;
    const side = x.side > 0 ? 1 : -1;
    const pnl = side * (px - entry) * q - p.fees * (q / p.qty) - fee;
    const feesMeasured = p.feesMeasured && measuredFee(x);
    const pricesMeasured = p.pricesMeasured && Number.isFinite(x.fillPx) && (x.fillPx ?? 0) > 0;
    return {
      // a signal position: "live|sig-SYM|…" (a signal indication: liveGroupOf → Signals); a range: "live|SYM|…|<tag>"
      cfg: p.cfg || (p.range === "@sig" ? `live|sig-${x.sym}|tp0|sl0|tr0|h0` : `live|${x.sym}|tp0|sl0|tr0|h0${p.range}`),
      sym: x.sym,
      side,
      entryT: p.t,
      exitT: x.at,
      entry,
      r: notional > 0 ? pnl / notional : 0,
      // Estimated fees/marker prices remain a labeled cash diagnostic, never verified net-return PF evidence.
      unitR: notional > 0 && feesMeasured && pricesMeasured ? pnl / notional : null,
      feesMeasured,
      pricesMeasured,
      reason,
      notional,
      coid: x.coid,
    };
  };
  for (const x of [...rows].sort((a, b) => a.at - b.at)) {
    if (x.status !== "ok") continue;
    const k = `${x.sym}|${x.side > 0 ? 1 : -1}`;
    // flat on the exchange (a stop-out, a take-profit, closed by hand, or unverified — the bars reached neither its stop
    // nor its take-profit alone): the position is gone — realized at the close the desk attributed to it when the
    // marker holds one. An unverified close has no proven cause: booked "flat", out of every PF, not an own stop-out
    if (x.kind === "F") {
      const p = open.get(k);
      open.delete(k);
      if (p && p.qty > 0 && x.px > 0) {
        const why = /\((stop|target|hand|unverified) /.exec(x.msg ?? "")?.[1];
        // the marker's measured commission when it carries one; unmeasured, the model share, as an unmeasured open pays
        const fee = feeOf({ ...x, qty: p.qty }, x.px, modelCost);
        const reason = why === "target" ? "tp" : why === "hand" ? "hand" : why === "unverified" ? "flat" : "sl";
        out.push(closeOf(p, x, p.qty, x.px, fee, reason));
      } else if (p && p.qty > 0) {
        const side: 1 | -1 = x.side > 0 ? 1 : -1;
        const v = opts.flatPx?.(x.sym, side, x.at) ?? null;
        if (v && v.px > 0) {
          const c = closeOf(p, x, p.qty, v.px, feeOf({ fee: null, qty: p.qty }, v.px, modelCost), "flat");
          out.push({ ...c, pxFrom: v.from });
        } else unpriced.push({ sym: x.sym, side, at: x.at, qty: p.qty, notional: p.cost });
      }
      continue;
    }
    // our close into a side already emptied (a stop filled first): nothing filled — the flat marker books the exit
    if (
      (x.kind === "X" || x.kind === "R") &&
      !(x.fillPx && x.fillPx > 0) &&
      (x.msg ?? "").startsWith("already flat")
    )
      continue;
    if (!(x.qty > 0)) continue;
    const px = x.fillPx && x.fillPx > 0 ? x.fillPx : x.px;
    if (!(px > 0)) continue;
    // an outside reduction the desk took from its own quantity first (H: an order not ours closed it) — no exit fee is
    // known: none is charged
    const fee = x.kind === "H" ? 0 : feeOf(x, px, modelCost);
    if (x.kind === "O" || x.kind === "I" || x.kind === "E") {
      // an open means the key held nothing of ours: whatever is still counted there is dropped
      if (x.kind === "O") open.delete(k);
      const p = open.get(k) ?? { qty: 0, cost: 0, fees: 0, t: x.at, range: "", cfg: "", feesMeasured: true, pricesMeasured: true };
      if (!p.qty) {
        p.t = x.at;
        p.range = RANGE_OF_LETTER[x.coid.slice(tagLen, tagLen + 1).toUpperCase()] ?? "";
        p.cfg = x.cfg ?? "";
      } else if (p.cfg !== (x.cfg ?? "")) {
        // One merged position cannot assign every sibling's cash to its first config. Without allocated lots,
        // retain the actual account return under an explicit mixed identity, never a false per-config result.
        p.cfg = "live|venue-merged|tp0|sl0|tr0|h0";
        p.range = "";
      }
      p.qty += x.qty;
      p.cost += x.qty * px;
      p.fees += fee;
      p.feesMeasured &&= measuredFee(x);
      p.pricesMeasured &&= Number.isFinite(x.fillPx) && (x.fillPx ?? 0) > 0;
      open.set(k, p);
    } else if (x.kind === "R" || x.kind === "X" || x.kind === "C" || x.kind === "H") {
      const p = open.get(k);
      if (!p || !(p.qty > 0)) continue;
      const q = Math.min(p.qty, x.qty);
      const entry = p.cost / p.qty;
      const share = q / p.qty;
      // an oversized exit charges only the owned quantity's share of its fee
      out.push(
        closeOf(
          p,
          x,
          q,
          px,
          fee * (q / x.qty),
          x.kind === "H" ? "hand" : x.kind === "X" || x.kind === "C" ? "close" : "reduce",
        ),
      );
      p.qty -= q;
      p.cost -= q * entry;
      p.fees -= p.fees * share;
      if (p.qty <= 1e-12) open.delete(k);
    }
  }
  const stillOpen = [...open].map(([k, p]) => {
    const [sym, sd] = k.split("|");
    const side: 1 | -1 = Number(sd) > 0 ? 1 : -1;
    return {
      sym,
      side,
      qty: p.qty,
      entry: p.cost / p.qty,
      entryT: p.t,
      cfg: p.cfg || (p.range === "@sig" ? `live|sig-${sym}|tp0|sl0|tr0|h0` : `live|${sym}|tp0|sl0|tr0|h0${p.range}`),
      notional: p.cost,
    };
  });
  return { closed: out, open: stillOpen, unpriced };
}

/** A preset's cached diagrams over its backtest window: one shared time axis, down-sampled. */
export interface PresetSeries {
  from: number;
  to: number;
  days: number;
  at: number;
  stepMs: number;
  t: number[];
  balance: number[];
  equity: number[];
  ddPct: number[];
  positions: number[];
  orders: number[];
  /** realized P&L (USD) per strategy type, cumulative */
  kinds: Record<"Normal" | "Trailing" | "Trailing only" | "Historic Exit" | "Axis" | "Block" | "DCA", number[]>;
  info: PresetInfo;
}

export interface PresetInfo {
  /** closed positions (symbol × direction episodes) */
  positions: number;
  hours: number;
  posPerHour: number;
  /** PF of the last 12 / 25 / 75 positions on the unit return (null = fewer positions); the cash episodes: cashPositionLast */
  pfLast12: number | null;
  pfLast25: number | null;
  pfLast75: number | null;
  cashPositionLast: Record<12 | 25 | 75, CashPfDiagnostic | null>;
  /** longest drawdown time of the equity, hours */
  ddtH: number;
  /**
   * Profit factor on the unit return (unitR, else r ÷ mult per order) of the settled closes inside (from, to]: the
   * basis of every stage (Base, validation, orders), independent of execution volume and account size (null = an
   * unknown unit return in the sample).
   */
  pf: number | null;
  /** the same on cash (r × position size in USD): sizing, compounding and Block's raised volume weigh a trade by its size */
  pfCash: number;
  pfBasis: UnitStats["pfBasis"];
  unknownReturns: number;
  gp: number | null;
  gl: number | null;
  noLoss: boolean | null;
  pfConvention: "gross-return-ratio" | "no-loss-sentinel" | "unavailable";
  sample: "settled-closes";
  cash: CashPfDiagnostic;
  n: number;
  /** realized P&L, USD and % of the start balance */
  netUsd: number;
  netPct: number;
  maxDdPct: number;
  /** max drawdown ratio: the largest equity drawdown ÷ the net result (null = nothing earned) */
  ddr: number | null;
}

export interface CashPfDiagnostic {
  n: number;
  pf: number;
  gp: number;
  gl: number;
  noLoss: boolean;
  pfConvention: "gross-return-ratio" | "no-loss-sentinel";
}

/** Closed positions in exit order with their summed P&L (orders of one symbol × direction that overlap = one). */
export function positionResults(
  trades: readonly StatTrade[],
  unit: (x: StatTrade) => number,
): Array<{ endT: number; pnl: number }> {
  const by = new Map<string, StatTrade[]>();
  for (const t of trades) {
    const k = `${t.sym}|${t.side > 0 ? 1 : -1}`;
    let xs = by.get(k);
    if (!xs) by.set(k, (xs = []));
    xs.push(t);
  }
  const out: Array<{ endT: number; pnl: number }> = [];
  for (const xs of by.values()) {
    xs.sort((a, b) => a.entryT - b.entryT);
    let cur: { endT: number; pnl: number } | null = null;
    for (const x of xs) {
      if (!cur || x.entryT >= cur.endT) {
        if (cur) out.push(cur);
        cur = { endT: x.exitT, pnl: 0 };
      }
      cur.endT = Math.max(cur.endT, x.exitT);
      cur.pnl += x.r * unit(x);
    }
    if (cur) out.push(cur);
  }
  return out.sort((a, b) => a.endT - b.endT);
}

const cashPfDetails = (n: number, gp: number, gl: number): CashPfDiagnostic => {
  const noLoss = gp > 0 && gl === 0;
  return {
    n,
    pf: profitFactor(gp, gl),
    gp,
    gl,
    noLoss,
    pfConvention: noLoss ? "no-loss-sentinel" : "gross-return-ratio",
  };
};

const cashPfOfLast = (ps: ReadonlyArray<{ pnl: number }>, n: number): CashPfDiagnostic | null => {
  if (ps.length < n) return null;
  let gp = 0;
  let gl = 0;
  for (const p of ps.slice(-n)) {
    if (p.pnl > 0) gp += p.pnl;
    else gl -= p.pnl;
  }
  return cashPfDetails(n, gp, gl);
};

/** Diagrams and info of a backtest: balance / equity / drawdown / open book, P&L per type, positions per hour. */
export function presetSeries(
  trades: readonly StatTrade[],
  o: TimelineOpts & { days: number; at?: number },
): PresetSeries {
  const tl = timeline(trades, { ...o, points: o.points ?? 400 });
  const pts = tl.points;
  const kinds: PresetSeries["kinds"] = {
    Normal: [],
    Trailing: [],
    "Trailing only": [],
    "Historic Exit": [],
    Axis: [],
    Block: [],
    DCA: [],
  };
  const byExit = [...trades].sort((a, b) => a.exitT - b.exitT);
  const acc = { Normal: 0, Trailing: 0, "Trailing only": 0, "Historic Exit": 0, Axis: 0, Block: 0, DCA: 0 };
  let xi = 0;
  for (const p of pts) {
    while (xi < byExit.length && byExit[xi].exitT <= p.t) {
      const x = byExit[xi++];
      const v = x.r * o.unit(x);
      const k = kindOfTrade(x);
      if (k === "normal") acc.Normal += v;
      else if (k === "trailing") acc.Trailing += v;
      else if (k === "trailing-only") acc["Trailing only"] += v;
      else if (k === "exit") acc["Historic Exit"] += v;
      else if (k === "axis") acc.Axis += v;
      else if (k === "dca" || k === "dca-active") acc.DCA += v;
      if (blockMult(x) > 1 + 1e-9) acc.Block += v;
    }
    for (const k of Object.keys(acc) as Array<keyof typeof acc>) kinds[k].push(+acc[k].toFixed(4));
  }
  // PF is judged on the unit return (r ÷ mult, as unitR of the eval), never on cash: a cash PF weighs a trade by its size
  const unitOf = (x: StatTrade) => (x.mult && x.mult > 0 ? 1 / x.mult : 1);
  // positions on the unit return (pfLast*); the cash episodes apart (cashPositionLast, diagnostic)
  const ps = positionResults(trades, unitOf);
  const psCash = positionResults(trades, o.unit);
  const settled = trades.filter((trade) => trade.exitT > o.startT && trade.exitT <= o.endT);
  // a persisted unit return (unitR; explicit null = unknown) stands; otherwise r ÷ mult (unitOf)
  const primary = unitStatsOf(
    settled.map((x) => (x.unitR !== undefined ? x : { ...x, unitR: x.r * unitOf(x) })),
    o.endT,
  );
  const knownBasis = primary.pfBasis === "unit-net-returns";
  const noLoss = knownBasis ? primary.gp > 0 && primary.gl === 0 : null;
  const cashPositionLast = {
    12: cashPfOfLast(psCash, 12),
    25: cashPfOfLast(psCash, 25),
    75: cashPfOfLast(psCash, 75),
  };
  const hours = Math.max(1e-9, (o.endT - o.startT) / 3_600_000);
  let gp = 0;
  let gl = 0;
  let gpCash = 0;
  let glCash = 0;
  let net = 0;
  for (const x of trades) {
    const v = x.r * o.unit(x);
    net += v;
    if (v > 0) gpCash += v;
    else glCash -= v;
    const u = x.r * unitOf(x);
    if (u > 0) gp += u;
    else gl -= u;
  }
  const r2 = (x: number) => +x.toFixed(2);
  return {
    from: o.startT,
    to: o.endT,
    days: o.days,
    at: o.at ?? Date.now(),
    stepMs: tl.stepMs,
    t: pts.map((p) => p.t),
    balance: pts.map((p) => r2(p.balance)),
    equity: pts.map((p) => r2(p.equity)),
    ddPct: pts.map((p) => r2(p.ddPct)),
    positions: pts.map((p) => p.positions),
    orders: pts.map((p) => p.orders),
    kinds,
    info: {
      positions: ps.length,
      hours: r2(hours),
      posPerHour: +(ps.length / hours).toFixed(3),
      pfLast12: cashPfOfLast(ps, 12)?.pf ?? null,
      pfLast25: cashPfOfLast(ps, 25)?.pf ?? null,
      pfLast75: cashPfOfLast(ps, 75)?.pf ?? null,
      cashPositionLast,
      ddtH: r2(tl.maxDdH),
      pf: knownBasis ? primary.pf : null,
      pfCash: profitFactor(gpCash, glCash),
      pfBasis: primary.pfBasis,
      unknownReturns: primary.unknownReturns,
      gp: knownBasis ? primary.gp : null,
      gl: knownBasis ? primary.gl : null,
      noLoss,
      pfConvention: !knownBasis
        ? "unavailable"
        : noLoss
          ? "no-loss-sentinel"
          : "gross-return-ratio",
      sample: "settled-closes",
      cash: cashPfDetails(trades.length, gpCash, glCash),
      n: settled.length,
      netUsd: r2(net),
      netPct: r2((net / Math.max(1e-9, o.balance)) * 100),
      maxDdPct: r2(tl.maxDdPct),
      ddr: net > 0 ? +(tl.maxDd / net).toFixed(3) : null,
    },
  };
}
