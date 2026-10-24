// Positions vs orders, systemwide.
//   order     one lane's entry (a partial): every config set trades its own orders independently
//   position  symbol × direction: all orders on the same symbol and side form ONE position (long and short of a
//             symbol count as two); a closed position is one continuous episode in which at least one order of
//             that symbol and side was open (overlapping partials merge)

export interface OrderLike {
  sym: string;
  side: number;
}

export interface OpenBook {
  positions: number;
  orders: number;
  long: number;
  short: number;
}

/** Open positions (distinct symbol × direction) and orders (partials) of a book. */
export function openBook(orders: readonly OrderLike[]): OpenBook {
  const keys = new Set<string>();
  let long = 0;
  let short = 0;
  for (const o of orders) {
    const k = `${o.sym}|${o.side > 0 ? 1 : -1}`;
    if (keys.has(k)) continue;
    keys.add(k);
    if (o.side > 0) long++;
    else short++;
  }
  return { positions: keys.size, orders: orders.length, long, short };
}

/** Closed positions: per symbol × direction, the number of episodes of overlapping orders. */
export function closedPositions(
  trades: ReadonlyArray<OrderLike & { entryT: number; exitT: number }>,
): number {
  const by = new Map<string, Array<[number, number]>>();
  for (const t of trades) {
    const k = `${t.sym}|${t.side > 0 ? 1 : -1}`;
    let xs = by.get(k);
    if (!xs) by.set(k, (xs = []));
    xs.push([t.entryT, t.exitT]);
  }
  let n = 0;
  for (const xs of by.values()) {
    xs.sort((a, b) => a[0] - b[0]);
    let end = -Infinity;
    for (const [a, b] of xs) {
      if (a >= end) n++; // a new episode starts when the previous one has closed (an exit at t frees the slot)
      end = Math.max(end, b);
    }
  }
  return n;
}

/**
 * Time-weighted average and peak of open positions and open orders over [startT, endT).
 */
export function openTimeline(
  trades: ReadonlyArray<OrderLike & { entryT: number; exitT: number }>,
  startT: number,
  endT: number,
): { avgPositions: number; maxPositions: number; avgOrders: number; maxOrders: number } {
  const span = Math.max(1, endT - startT);
  const ev: Array<[number, number, string]> = [];
  for (const t of trades) {
    const a = Math.max(startT, t.entryT);
    const b = Math.min(endT, t.exitT);
    if (b <= a) continue;
    const k = `${t.sym}|${t.side > 0 ? 1 : -1}`;
    ev.push([a, 1, k], [b, -1, k]);
  }
  // exits before entries at the same instant
  ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const per = new Map<string, number>();
  let orders = 0;
  let positions = 0;
  let maxO = 0;
  let maxP = 0;
  let areaO = 0;
  let areaP = 0;
  let last = ev.length ? ev[0][0] : startT;
  for (const [t, d, k] of ev) {
    areaO += orders * (t - last);
    areaP += positions * (t - last);
    last = t;
    orders += d;
    const c = (per.get(k) ?? 0) + d;
    if (d > 0 && c === 1) positions++;
    if (d < 0 && c === 0) positions--;
    per.set(k, c);
    if (orders > maxO) maxO = orders;
    if (positions > maxP) maxP = positions;
  }
  return {
    avgPositions: areaP / span,
    maxPositions: maxP,
    avgOrders: areaO / span,
    maxOrders: maxO,
  };
}

export interface PositionEpisode {
  key: string;
  sym: string;
  side: 1 | -1;
  start: number;
  /** Infinity while an order of it is still open */
  end: number;
  orders: number;
}

/**
 * Positions as episodes: one symbol × direction from its first order's entry until no order of it is open any more
 * (overlapping orders merge; an entry at the instant the last one closed starts a new episode). `open` are the
 * orders still open at the end: their episode never ends. Built from the closed orders alone, a position whose last
 * order was still open counted as closed while the hour-end count held it open.
 */
export function positionEpisodes(
  closed: ReadonlyArray<{ sym: string; side: number; entryT: number; exitT: number }>,
  open: ReadonlyArray<{ sym: string; side: number; entryT: number }> = [],
): PositionEpisode[] {
  const all = [...closed, ...open.map((o) => ({ ...o, exitT: Infinity }))].sort((a, b) => a.entryT - b.entryT);
  const out: PositionEpisode[] = [];
  const by = new Map<string, PositionEpisode>();
  for (const x of all) {
    const side = x.side > 0 ? 1 : -1;
    const k = `${x.sym}|${side}`;
    let e = by.get(k);
    if (!e || x.entryT >= e.end) {
      e = { key: k, sym: x.sym, side, start: x.entryT, end: x.exitT, orders: 0 };
      out.push(e);
      by.set(k, e);
    }
    e.end = Math.max(e.end, x.exitT);
    e.orders++;
  }
  return out;
}

/** Compare positions and orders on the same book, retaining endpoint-open siblings in their episode. */
export function positionOrderCounts(
  closed: ReadonlyArray<{ sym: string; side: number; entryT: number; exitT: number }>,
  open: ReadonlyArray<{ sym: string; side: number; entryT: number }> = [],
) {
  const episodes = positionEpisodes(closed, open);
  return {
    openedPositions: episodes.length,
    closedPositions: episodes.filter((e) => Number.isFinite(e.end)).length,
    openPositions: openBook(open).positions,
    openedOrders: closed.length + open.length,
    settledOrders: closed.length,
    openOrders: open.length,
  };
}

/** End-of-interval snapshots use (t, end], matching settled closes and minute marks; start entries join interval 0. */
export function positionOrderLedger(
  closed: ReadonlyArray<{ sym: string; side: number; entryT: number; exitT: number }>,
  open: ReadonlyArray<{ sym: string; side: number; entryT: number }>,
  startT: number, endT: number, intervalMs: number,
) {
  if (![startT, endT, intervalMs].every(Number.isFinite) || endT < startT || intervalMs <= 0)
    throw new Error("Invalid position/order ledger window");
  const episodes = positionEpisodes(closed, open);
  const orders = [...closed, ...open.map((x) => ({ ...x, exitT: Infinity }))];
  const startedBefore = (start: number, end: number) => start < startT && end > startT;
  let positions = episodes.filter((e) => startedBefore(e.start, e.end)).length;
  let orderCount = orders.filter((x) => startedBefore(x.entryT, x.exitT)).length;
  const rows = [];
  for (let t = startT; t < endT; t += intervalMs) {
    const until = Math.min(endT, t + intervalMs);
    const entered = (at: number) => (at > t || (t === startT && at === t)) && at <= until;
    const exited = (at: number) => at > t && at <= until;
    const row = {
      t, endT: until, positionsAtStart: positions, ordersAtStart: orderCount,
      openedPositions: episodes.filter((e) => entered(e.start)).length,
      closedPositions: episodes.filter((e) => exited(e.end)).length,
      openedOrders: orders.filter((x) => entered(x.entryT)).length,
      settledOrders: closed.filter((x) => exited(x.exitT)).length,
      openPositions: episodes.filter((e) => e.start <= until && e.end > until).length,
      openOrders: orders.filter((x) => x.entryT <= until && x.exitT > until).length,
    };
    if (positions + row.openedPositions - row.closedPositions !== row.openPositions ||
      orderCount + row.openedOrders - row.settledOrders !== row.openOrders)
      throw new Error("Position/order ledger does not reconcile");
    rows.push(row);
    positions = row.openPositions;
    orderCount = row.openOrders;
  }
  return rows;
}
