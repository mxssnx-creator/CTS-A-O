// Lane control orders (live.laneOrders): every lane the exchange holds carries its own exit orders on the venue — a
// partial STOP_MARKET at the lane's own stop (kind V; a trailing lane's stop is moved as the desk trails it, bar by
// bar like the simulation) and a partial TAKE_PROFIT_MARKET at its own target (kind Y), each for the lane's quantity
// (one exchange minimum). The position is the sum of its lanes; the closePosition backstop (kind S) stays behind them
// all. The venue executes each lane's exit at its level, whatever the desk is doing (a compute, a stall, a restart).
//
// This module plans; live.server.ts sends. A lane order that left the book filled is the lane's exit on the exchange
// (its sibling is cancelled — the venue links nothing); a lane that leaves the paper book has its orders cancelled
// before any reduce, and a cancel the venue refuses because the order filled is that exit, never a second one.

/** One lane on the exchange and its two orders (coid = client id, oid = venue id, px = trigger price). */
export interface LaneOrder {
  /** the lane's identity (live-record laneKeyOf: cfg|sym|side|entryT) */
  id: string;
  key: string;
  sym: string;
  side: 1 | -1;
  /** the lane's quantity on the exchange */
  qty: number;
  s?: { coid: string; oid?: string; px: number };
  t?: { coid: string; oid?: string; px: number };
  /** when the lane joined the exchange (its orders are placed in this order) */
  at: number;
}

/** A lane the exchange should hold this step, with its own exit levels. */
export interface LaneWant {
  id: string;
  key: string;
  sym: string;
  side: 1 | -1;
  /** its stop and target prices (target 0 / unset: none — no take-profit order) */
  stop: number;
  target?: number;
  /** its entry time (new lanes are covered in this order) */
  entryT: number;
}

export type LaneAction =
  | { kind: "placeStop"; lane: string; px: number }
  | { kind: "placeTarget"; lane: string; px: number }
  | { kind: "moveStop"; lane: string; from: number; px: number }
  | { kind: "moveTarget"; lane: string; from: number; px: number }
  | { kind: "dropTarget"; lane: string };

/**
 * The lanes of one key the position covers: the ones already on the exchange first (oldest first), then new ones
 * (by entry time) — as long as their quantities fit into the held quantity. A lane on the exchange counts with the
 * quantity it entered with (the exchange minimum is min-notional ÷ price: it moves with the price, and measured at
 * today's price a held lane no longer "fit" — its orders were dropped), a new one with today's `laneQty`. A partial
 * fill or a scaled-down position leaves the newest lanes uncovered: they get no orders until the position holds them.
 */
export function coveredLanes(
  wants: readonly LaneWant[],
  map: Readonly<Record<string, LaneOrder>>,
  held: number,
  laneQty: number,
): LaneWant[] {
  if (!(laneQty > 0) || !(held > 0)) return [];
  const on = wants.filter((w) => map[w.id]).sort((a, b) => map[a.id].at - map[b.id].at || (a.id < b.id ? -1 : 1));
  const fresh = wants.filter((w) => !map[w.id]).sort((a, b) => a.entryT - b.entryT || (a.id < b.id ? -1 : 1));
  const out: LaneWant[] = [];
  let sum = 0;
  for (const w of [...on, ...fresh]) {
    const q = map[w.id]?.qty ?? laneQty;
    if (sum + q > held * (1 + 1e-9) + 1e-12) break;
    sum += q;
    out.push(w);
  }
  return out;
}

/**
 * The orders the covered lanes need this step. The venue caps the open TP/SL orders of an account (BingX: 200, every
 * symbol together), so new orders go to the levels nearest to triggering first — the exits most likely to happen
 * soon — up to `slots` new orders (the budget left after every position's backstop); a lane without a venue order
 * still exits through the desk (a market reduce when its level is crossed), as before. A trailed stop moves toward
 * the price only (a move keeps its slot). `budget` caps the requests of the step (the venue's rate limit). A lane
 * whose price already passed its level is left to the desk's exit (the venue refuses a trigger on the wrong side).
 * `px(sym)` the price now; `stopPx` / `targetPx` snap a level to what the venue accepts (0 = cannot); `skip` holds a
 * lane back (a refusal backing off).
 */
export function planLaneOrders(
  covered: readonly LaneWant[],
  map: Readonly<Record<string, LaneOrder>>,
  resting: ReadonlySet<string>,
  o: {
    px: (sym: string) => number;
    stopPx: (w: LaneWant, px: number) => number;
    targetPx: (w: LaneWant, px: number) => number;
    moveMin?: number;
    budget: number;
    /** new orders allowed (the venue's cap left); unset = no cap */
    slots?: number;
    skip?: (lane: string) => boolean;
  },
): LaneAction[] {
  const moveMin = o.moveMin ?? 0.0005;
  const fresh: Array<{ a: LaneAction; dist: number }> = [];
  const moves: LaneAction[] = [];
  for (const w of covered) {
    const px = o.px(w.sym);
    if (!(px > 0) || o.skip?.(w.id)) continue;
    const lo = map[w.id];
    const has = (x?: { coid: string }) => !!x && resting.has(x.coid.toUpperCase());
    // the stop: on the losing side of the price
    const live = w.side * (px - w.stop) > 0;
    const sp = live && w.stop > 0 ? o.stopPx(w, px) : 0;
    if (sp > 0) {
      if (!has(lo?.s)) fresh.push({ a: { kind: "placeStop", lane: w.id, px: sp }, dist: Math.abs(px - sp) / px });
      // a trailed stop moves toward the price only (the lane's own stop never loosens)
      else if (lo?.s && w.side * (sp - lo.s.px) > moveMin * px)
        moves.push({ kind: "moveStop", lane: w.id, from: lo.s.px, px: sp });
    }
    const tgt = w.target ?? 0;
    if (!(tgt > 0)) {
      if (has(lo?.t)) moves.push({ kind: "dropTarget", lane: w.id });
      continue;
    }
    const tp = w.side * (tgt - px) > 0 ? o.targetPx(w, px) : 0;
    if (!(tp > 0)) continue;
    if (!has(lo?.t)) fresh.push({ a: { kind: "placeTarget", lane: w.id, px: tp }, dist: Math.abs(tp - px) / px });
    else if (lo?.t && Math.abs(tp - lo.t.px) > moveMin * px)
      moves.push({ kind: "moveTarget", lane: w.id, from: lo.t.px, px: tp });
  }
  // nearest to triggering first; within the venue's cap
  fresh.sort((x, y) => x.dist - y.dist);
  const take = fresh.slice(0, Math.max(0, o.slots ?? Infinity)).map((x) => x.a);
  return [...moves, ...take].slice(0, Math.max(0, o.budget));
}

/**
 * Lane orders to cancel so the account's open TP/SL orders come down to `keep` (the venue's cap less the backstops
 * every position needs): the ones farthest from triggering first (the least likely to act soon).
 */
export function trimLaneOrders(
  map: Readonly<Record<string, LaneOrder>>,
  resting: ReadonlySet<string>,
  px: (sym: string) => number,
  count: number,
  keep: number,
): Array<{ lane: string; which: "s" | "t" }> {
  if (count <= keep) return [];
  const xs: Array<{ lane: string; which: "s" | "t"; dist: number }> = [];
  for (const lo of Object.values(map))
    for (const which of ["s", "t"] as const) {
      const o = lo[which];
      const p = px(lo.sym);
      if (!o || !resting.has(o.coid.toUpperCase())) continue;
      xs.push({ lane: lo.id, which, dist: p > 0 ? Math.abs(o.px - p) / p : Infinity });
    }
  xs.sort((a, b) => b.dist - a.dist);
  return xs.slice(0, count - keep).map(({ lane, which }) => ({ lane, which }));
}

/** A lane order that left the book: what the venue says happened to it. */
export type GoneOrder = { status: "filled"; px: number } | { status: "cancelled" } | { status: "unknown" };

/** Read an order-status reply (BingX: data.order.{status, avgPrice, stopPrice}). */
export function goneOrderOf(resp: unknown): GoneOrder {
  const o = ((resp as { order?: unknown })?.order ?? resp) as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return { status: "unknown" };
  const st = String(o.status ?? "").toUpperCase();
  if (st === "FILLED" || st === "PARTIALLY_FILLED") {
    const px = Number(o.avgPrice) > 0 ? Number(o.avgPrice) : Number(o.stopPrice ?? 0);
    return px > 0 ? { status: "filled", px } : { status: "unknown" };
  }
  if (st.startsWith("CANCEL") || st === "EXPIRED" || st === "FAILED" || st === "REJECTED") return { status: "cancelled" };
  return { status: "unknown" };
}
