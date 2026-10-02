// Statistics: one complete report of a trade book — the time line (balance, equity marked to market, margin used,
// open config sets, positions, orders), every breakdown (type and sub-type, range, lane, indication kind, bot,
// symbol, exit reason, hour of day, weekday × hour), every config with its parameters and dates, and the execution
// presets computed on the same tapes (with / without Block, Block Active, DCA, DCA Active, Axis, Trailing).
// Pure: the server function hands in the trades, the sizing and a price lookup.
import { profitFactor, statsOf } from "./metrics/stats.ts";
import { closedPositions } from "./positions.ts";
import { parseConfigId, kindOfId } from "./pipeline/pipeline.ts";
import { rangeOfId, RANGE_LABEL } from "./minimal-coord.ts";
import { INDICATION_BY_ID, isSignalInd, laneLabel, laneOf } from "./indications/registry.ts";
import type { Stats, StratKind } from "./domain/types.ts";

const H = 3_600_000;
const M = 60_000;

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
  coordVol?: number;
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
  /** close price of a symbol at or before t (null = unknown: the order is held at its entry) */
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

/** Balance / equity / margin / open book over [startT, endT], swept in time order (no per-step rescans). */
export function timeline(trades: readonly StatTrade[], o: TimelineOpts): Timeline {
  const span = Math.max(M, o.endT - o.startT);
  const stepMs = Math.max(M, Math.ceil(span / Math.max(2, o.points ?? 600) / M) * M);
  const byEntry = [...trades].sort((a, b) => a.entryT - b.entryT);
  const byExit = [...trades].sort((a, b) => a.exitT - b.exitT);
  const open = new Set<StatTrade>();
  let ei = 0;
  let xi = 0;
  let realized = 0;
  // results closed before the window count into the starting balance of the window
  while (xi < byExit.length && byExit[xi].exitT <= o.startT) {
    const x = byExit[xi++];
    realized += x.r * o.unit(x);
  }
  while (ei < byEntry.length && byEntry[ei].entryT <= o.startT) {
    if (byEntry[ei].exitT > o.startT) open.add(byEntry[ei]);
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
  for (let t = o.startT; ; t = Math.min(o.endT, t + stepMs)) {
    while (ei < byEntry.length && byEntry[ei].entryT <= t) {
      const x = byEntry[ei++];
      if (x.exitT > t) open.add(x);
    }
    while (xi < byExit.length && byExit[xi].exitT <= t) {
      const x = byExit[xi++];
      realized += x.r * o.unit(x);
      open.delete(x);
    }
    let mtm = 0;
    let margin = 0;
    const pos = new Set<string>();
    const sets = new Set<string>();
    for (const x of open) {
      const u = o.unit(x);
      const vol = x.vol ?? 1;
      const p = o.price(x.sym, t);
      if (p !== null && x.entry > 0) mtm += ((x.side * (p - x.entry)) / x.entry - o.cost) * u * vol;
      margin += (u * vol) / Math.max(1, o.leverage);
      pos.add(`${x.sym}|${x.side > 0 ? 1 : -1}`);
      sets.add(x.cfg);
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
    positionsMax = Math.max(positionsMax, pos.size);
    setsMax = Math.max(setsMax, sets.size);
    out.push({ t, balance, equity, margin, sets: sets.size, positions: pos.size, orders: open.size, ddPct });
    if (t >= o.endT) break;
  }
  return { points: out, stepMs, peak, maxDd, maxDdPct, maxDdH, marginMax, ordersMax, positionsMax, setsMax };
}

export interface GroupRow {
  key: string;
  n: number;
  wins: number;
  losses: number;
  wr: number;
  pf: number;
  /** summed result, % of one unit */
  net: number;
  /** result in USD at the book's sizing */
  usd: number;
  avg: number;
  ddt: number;
  gh: number;
  positions: number;
  avgHoldMin: number;
  firstT: number;
  lastT: number;
}

/** One row of statistics for a set of trades (trades in any order). */
export function rowOf(key: string, xs: readonly StatTrade[], unit: (x: StatTrade) => number): GroupRow {
  const sorted = [...xs].sort((a, b) => a.exitT - b.exitT);
  const s: Stats = statsOf(sorted);
  return {
    key,
    n: s.n,
    wins: s.wins,
    losses: s.losses,
    wr: s.wr,
    pf: s.pf,
    net: s.net,
    usd: xs.reduce((a, x) => a + x.r * unit(x), 0),
    avg: s.avg,
    ddt: s.ddt,
    gh: s.gh,
    positions: closedPositions(xs),
    avgHoldMin: s.avgHoldMin,
    firstT: s.firstT,
    lastT: s.lastT,
  };
}

/** Rows per key (a trade may fall into several keys); sorted by the key order given, else by trade count. */
export function groupBy(
  trades: readonly StatTrade[],
  keys: (x: StatTrade) => string | readonly string[] | null,
  unit: (x: StatTrade) => number,
  order?: readonly string[],
): GroupRow[] {
  const by = new Map<string, StatTrade[]>();
  for (const x of trades) {
    const k = keys(x);
    if (k === null) continue;
    for (const key of typeof k === "string" ? [k] : k) {
      let xs = by.get(key);
      if (!xs) by.set(key, (xs = []));
      xs.push(x);
    }
  }
  const rows = [...by.entries()].map(([k, xs]) => rowOf(k, xs, unit));
  if (order) {
    const rank = new Map(order.map((k, i) => [k, i]));
    return rows.sort((a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99) || b.n - a.n);
  }
  return rows.sort((a, b) => b.n - a.n);
}

export const TYPE_ORDER = ["Normal", "Trailing", "Axis", "DCA", "DCA Active", "Signals"] as const;
export const KIND_LABEL: Record<StratKind, string> = {
  normal: "Normal",
  trailing: "Trailing",
  axis: "Axis",
  dca: "DCA",
  "dca-active": "DCA Active",
};

const indOf = (cfg: string) => cfg.split("|")[1] ?? "";
export const kindOfTrade = (x: StatTrade): StratKind => x.kind ?? kindOfId(x.cfg);
/** Block volume of a trade (coordination volume taken out); 1 = not raised */
export const blockMult = (x: StatTrade) => (x.mult ?? 1) / (x.coordVol ?? 1);

/** Main type of a trade: Signals, or its sub-strategy. */
export function typeOf(x: StatTrade): string {
  return isSignalInd(indOf(x.cfg)) ? "Signals" : KIND_LABEL[kindOfTrade(x)];
}

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
      out.push((x.level ?? 0) >= Math.max(1, minActiveLevel) ? "Block Active level" : "Block below Active level");
      // Block type overall: each raising source is its own position
      for (const [src, v] of Object.entries(x.legs ?? {})) if ((v ?? 0) > 0) out.push(`Block ${src}`);
    } else out.push("Base (unit volume)");
  } else if (k === "dca") out.push("DCA");
  else if (k === "dca-active") out.push("DCA Active");
  else if (k === "axis") out.push("Axis");
  return out;
}

/** Execution presets compared on the same tapes: [label, with, without]. */
export const WITH_WITHOUT: ReadonlyArray<[string, string, string]> = [
  ["Trailing", "normal-trailing", "normal"],
  ["Block", "block", "normal-trailing"],
  ["Block Active", "block-active", "block"],
  ["DCA", "all-on", "block"],
  ["DCA Active", "normal+dca-active", "normal"],
  ["DCA Active vs DCA", "dca-active", "dca"],
  ["Axis", "normal+axis", "normal"],
  ["Axis on all", "all-on+axis", "all-on"],
  ["Block Active + DCA Active", "block-active+dca-active", "block-active"],
];

type PresetSim = {
  label?: string;
  toggles?: Record<string, boolean>;
  stats?: Partial<Stats>;
  byKind?: Record<string, { n: number; net: number; pf: number }>;
};

export interface WithWithout {
  label: string;
  with: { id: string; label: string; n: number; pf: number; net: number; ddt: number; wr: number; gh: number };
  without: { id: string; label: string; n: number; pf: number; net: number; ddt: number; wr: number; gh: number };
  dPf: number;
  dNet: number;
  dDdt: number;
}

export function withWithout(presets: Record<string, PresetSim> | null | undefined): WithWithout[] {
  if (!presets) return [];
  const side = (id: string) => {
    const p = presets[id];
    const s = p?.stats ?? {};
    return {
      id,
      label: p?.label ?? id,
      n: s.n ?? 0,
      pf: s.pf ?? 0,
      net: s.net ?? 0,
      ddt: s.ddt ?? 0,
      wr: s.wr ?? 0,
      gh: s.gh ?? 0,
    };
  };
  return WITH_WITHOUT.filter(([, a, b]) => presets[a] && presets[b]).map(([label, a, b]) => {
    const w = side(a);
    const wo = side(b);
    return { label, with: w, without: wo, dPf: w.pf - wo.pf, dNet: w.net - wo.net, dDdt: w.ddt - wo.ddt };
  });
}

export interface ConfigRow extends GroupRow {
  bot: string;
  ind: string;
  lane: string;
  kind: string;
  type: string;
  range: string;
  indKind: string;
  tp: number;
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
  total: GroupRow & { usdEnd: number; mdd: number; expectancy: number; sqn: number; tph: number };
  timeline: Timeline;
  types: GroupRow[];
  subTypes: GroupRow[];
  ranges: GroupRow[];
  lanes: GroupRow[];
  indKinds: GroupRow[];
  bots: GroupRow[];
  symbols: GroupRow[];
  reasons: GroupRow[];
  sides: GroupRow[];
  hourOfDay: GroupRow[];
  /** weekday (0 = Sunday) × hour (UTC): net %, closes */
  heat: Array<{ d: number; h: number; net: number; n: number }>;
  daily: GroupRow[];
  configs: ConfigRow[];
  withWithout: WithWithout[];
  presets: Array<{ id: string; label: string; n: number; pf: number; net: number; ddt: number; wr: number; gh: number }>;
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
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildStatistics(i: StatisticsInput): StatisticsReport {
  const trades = i.trades.filter((x) => x.exitT > i.startT && x.exitT <= i.endT);
  const unit = i.unit;
  const all = rowOf("All", trades, unit);
  const s = statsOf([...trades].sort((a, b) => a.exitT - b.exitT));
  const tl = timeline(i.trades, {
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
      range: RANGE_LABEL[rangeOfId(r.key)],
      indKind: INDICATION_BY_ID.get(laneOf(ind).base)?.kind ?? (isSignalInd(ind) ? "signal" : "none"),
      tp: p?.protect.tp ?? 0,
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
    ? Object.entries(i.presets).map(([id, p]) => ({
        id,
        label: p.label ?? id,
        n: p.stats?.n ?? 0,
        pf: p.stats?.pf ?? 0,
        net: p.stats?.net ?? 0,
        ddt: p.stats?.ddt ?? 0,
        wr: p.stats?.wr ?? 0,
        gh: p.stats?.gh ?? 0,
      }))
    : [];
  return {
    source: i.source,
    startT: i.startT,
    endT: i.endT,
    balance0: i.balance,
    total: {
      ...all,
      usdEnd: tl.points.at(-1)?.balance ?? i.balance,
      mdd: s.mdd,
      expectancy: s.expectancy,
      sqn: s.sqn,
      tph: s.tph,
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
    ]),
    ranges: groupBy(trades, (x) => RANGE_LABEL[rangeOfId(x.cfg)], unit, Object.values(RANGE_LABEL)),
    lanes: groupBy(trades, (x) => laneLabel(indOf(x.cfg)) || "plain", unit),
    indKinds: groupBy(
      trades,
      (x) => INDICATION_BY_ID.get(laneOf(indOf(x.cfg)).base)?.kind ?? (isSignalInd(indOf(x.cfg)) ? "signal" : "none"),
      unit,
    ),
    bots: groupBy(trades, (x) => x.cfg.split("|")[0] ?? "", unit),
    symbols: groupBy(trades, (x) => x.sym, unit),
    reasons: groupBy(trades, (x) => x.reason ?? "close", unit, ["tp", "sl", "trail", "time", "disarm", "close"]),
    sides: groupBy(trades, (x) => (x.side > 0 ? "Long" : "Short"), unit, ["Long", "Short"]),
    hourOfDay: groupBy(
      trades,
      (x) => String(new Date(x.exitT - 1).getUTCHours()).padStart(2, "0"),
      unit,
      Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")),
    ),
    heat: [...heat.values()],
    daily: groupBy(trades, (x) => new Date(x.exitT - 1).toISOString().slice(0, 10), unit).sort((a, b) =>
      a.key.localeCompare(b.key),
    ),
    configs: shown,
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
  sym: string;
  side: number;
  kind: string;
  qty: number;
  px: number;
  status: string;
  at: number;
  fillPx?: number | null;
  fee?: number | null;
}

const RANGE_OF_LETTER: Record<string, string> = { U: "|mc", N: "|mn", H: "|sh", G: "|gn", L: "|lg", M: "|mp", E: "" };

/**
 * Live closes from the connection's own ledger: per symbol × side, the own opens / increases (O, I, E) build the
 * position at their fill prices, the own reduces / closes (R, X, C) realize it. The range comes from the client
 * id's letter after the tag (U micro, N minimal, H short, M plus, E wide / mixed). `r` is the result per unit of
 * the closed notional after fees; `notional` is that notional in USD. A position closed by its exchange stop has
 * no own close order and stays open here.
 */
export function liveTrades(rows: readonly LedgerRow[], tagLen: number): Array<StatTrade & { notional: number }> {
  const open = new Map<string, { qty: number; cost: number; fees: number; t: number; range: string }>();
  const out: Array<StatTrade & { notional: number }> = [];
  for (const x of [...rows].sort((a, b) => a.at - b.at)) {
    if (x.status !== "ok" || !(x.qty > 0)) continue;
    const k = `${x.sym}|${x.side > 0 ? 1 : -1}`;
    const px = x.fillPx && x.fillPx > 0 ? x.fillPx : x.px;
    if (!(px > 0)) continue;
    const fee = Math.abs(x.fee ?? 0);
    if (x.kind === "O" || x.kind === "I" || x.kind === "E") {
      const p = open.get(k) ?? { qty: 0, cost: 0, fees: 0, t: x.at, range: "" };
      if (!p.qty) {
        p.t = x.at;
        p.range = RANGE_OF_LETTER[x.coid.slice(tagLen, tagLen + 1).toUpperCase()] ?? "";
      }
      p.qty += x.qty;
      p.cost += x.qty * px;
      p.fees += fee;
      open.set(k, p);
    } else if (x.kind === "R" || x.kind === "X" || x.kind === "C") {
      const p = open.get(k);
      if (!p || !(p.qty > 0)) continue;
      const q = Math.min(p.qty, x.qty);
      const entry = p.cost / p.qty;
      const share = q / p.qty;
      const notional = q * entry;
      const side = x.side > 0 ? 1 : -1;
      const pnl = side * (px - entry) * q - p.fees * share - fee;
      out.push({
        cfg: `live|${x.sym}|tp0|sl0|tr0|h0${p.range}`,
        sym: x.sym,
        side,
        entryT: p.t,
        exitT: x.at,
        entry,
        r: notional > 0 ? pnl / notional : 0,
        reason: x.kind === "X" || x.kind === "C" ? "close" : "reduce",
        notional,
      });
      p.qty -= q;
      p.cost -= q * entry;
      p.fees -= p.fees * share;
      if (p.qty <= 1e-12) open.delete(k);
    }
  }
  return out;
}
