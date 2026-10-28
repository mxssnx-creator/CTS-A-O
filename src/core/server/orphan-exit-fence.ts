import { exactVenueOrderId, exactVenueOrderIds } from "../exchange/venue-order-id.ts";
import { isOwnCoid, ownCoidKind, type BookView } from "./live.ts";
import type { LiveSettings } from "../config.ts";

/** Observed unlinked conditional, including its exact venue and client identity. */
export interface OrphanExitFence {
  conn: string;
  sym: string;
  coid: string;
  oid: string;
  positionSide: "LONG" | "SHORT" | "BOTH";
  type: "STOP_MARKET" | "TAKE_PROFIT_MARKET" | "UNKNOWN";
  /** Set before a cancel is dispatched; even a still-visible order may be in flight toward cancellation. */
  cancelPending?: boolean;
}

export const orphanObservationId = (x: Pick<OrphanExitFence, "conn" | "sym" | "coid" | "oid">): string =>
  JSON.stringify([x.conn, x.sym, x.coid.toUpperCase(), x.oid]);
export const orphanFenceId = (x: OrphanExitFence): string =>
  JSON.stringify([x.conn, x.sym, x.coid.toUpperCase(), x.oid, x.positionSide, x.type]);

export function orphanFenceKeys(x: OrphanExitFence): string[] {
  return x.positionSide === "LONG" ? [`${x.sym}|1`] : x.positionSide === "SHORT" ? [`${x.sym}|-1`]
    : [`${x.sym}|1`, `${x.sym}|-1`];
}

/** Capture owned aggregate conditionals and unlinked native orders, even while a position exists. */
export function observedUnlinkedExits(
  book: BookView, conn: string, connId: LiveSettings["connId"], linkedIds: ReadonlySet<string>,
): OrphanExitFence[] {
  const out: OrphanExitFence[] = [];
  for (const o of book.orders) {
    if (!isOwnCoid(o.clientOrderId, connId)) continue;
    const coid = o.clientOrderId!;
    const kind = ownCoidKind(coid, connId);
    if (!["S", "T", "V", "Y"].includes(kind)) continue;
    const raw = String(o.positionSide ?? "").toUpperCase();
    const side = raw === "LONG" || raw === "SHORT" ? raw : "BOTH";
    const reportedType = String(o.type ?? "").toUpperCase();
    const expectedType = kind === "S" || kind === "V" ? "STOP_MARKET" : "TAKE_PROFIT_MARKET";
    // Some books omit type altogether. Our own S/T/V/Y tag names the requested conditional, while an explicitly
    // contradictory type is never inferred away and remains a separate unresolved reservation.
    const type = reportedType === "" ? expectedType :
      reportedType === "STOP_MARKET" || reportedType === "TAKE_PROFIT_MARKET" ? reportedType : "UNKNOWN";
    if (type === expectedType &&
      linkedIds.has(JSON.stringify([o.venueSymbol, coid.toUpperCase(), exactVenueOrderId(o.id), side, type]))) continue;
    out.push({ conn, sym: o.venueSymbol, coid, oid: exactVenueOrderId(o.id), positionSide: side, type });
  }
  return out;
}

/** A missing book row is not terminal. Accept only an exact terminal order with explicit, consistent zero fills. */
export function orphanCancelledZero(x: OrphanExitFence, reply: unknown): boolean {
  if (!x.oid || !reply || typeof reply !== "object") return false;
  const raw = (reply as { order?: unknown }).order ?? reply;
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (exactVenueOrderIds(o.orderID, o.orderId) !== x.oid) return false;
  const matches = (v: unknown, expected: string) => v === undefined || v === null || String(v).toUpperCase() === expected;
  if (!matches(o.symbol, x.sym.toUpperCase()) || !matches(o.clientOrderId, x.coid.toUpperCase()) ||
      !matches(o.clientOrderID, x.coid.toUpperCase())) return false;
  if (x.type !== "UNKNOWN" && !matches(o.type, x.type)) return false;
  if (x.type === "UNKNOWN" && o.type !== undefined && o.type !== null &&
      !["STOP_MARKET", "TAKE_PROFIT_MARKET"].includes(String(o.type).toUpperCase())) return false;
  const ps = String(o.positionSide ?? "").toUpperCase();
  if (ps && x.positionSide !== "BOTH" && ps !== x.positionSide) return false;
  if (ps && x.positionSide === "BOTH" && ps !== "BOTH") return false;
  const side = String(o.side ?? "").toUpperCase();
  if (side && x.positionSide !== "BOTH" && side !== (x.positionSide === "LONG" ? "SELL" : "BUY")) return false;
  const st = String(o.status ?? "").toUpperCase();
  if (!(["CANCELLED", "CANCELED", "EXPIRED", "REJECTED"].includes(st))) return false;
  const quantities = [o.executedQty, o.executedVolume, o.cumExecQty, o.filledQty]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN);
  return quantities.length > 0 && quantities.every((q) => Number.isFinite(q) && q === 0);
}

/** A filled order is separate from a zero-fill cancel: release it only after the caller reconciles its parent. */
export function orphanFilled(x: OrphanExitFence, reply: unknown): { qty: number; px: number } | null {
  if (!x.oid || !reply || typeof reply !== "object") return null;
  const raw = (reply as { order?: unknown }).order ?? reply;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (exactVenueOrderIds(o.orderID, o.orderId) !== x.oid) return null;
  const matches = (v: unknown, expected: string) => v === undefined || v === null || String(v).toUpperCase() === expected;
  if (!matches(o.symbol, x.sym.toUpperCase()) || !matches(o.clientOrderId, x.coid.toUpperCase()) ||
      !matches(o.clientOrderID, x.coid.toUpperCase())) return null;
  if (x.type !== "UNKNOWN" && !matches(o.type, x.type)) return null;
  if (x.type === "UNKNOWN" && o.type !== undefined && o.type !== null &&
      !["STOP_MARKET", "TAKE_PROFIT_MARKET"].includes(String(o.type).toUpperCase())) return null;
  const ps = String(o.positionSide ?? "").toUpperCase();
  if (ps && x.positionSide !== "BOTH" && ps !== x.positionSide) return null;
  if (ps && x.positionSide === "BOTH" && ps !== "BOTH") return null;
  const side = String(o.side ?? "").toUpperCase();
  if (side && x.positionSide !== "BOTH" && side !== (x.positionSide === "LONG" ? "SELL" : "BUY")) return null;
  if (String(o.status ?? "").toUpperCase() !== "FILLED") return null;
  const quantities = [o.executedQty, o.executedVolume, o.cumExecQty, o.filledQty]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN);
  if (!quantities.length || quantities.some((q) => !Number.isFinite(q) || q <= 0) ||
      quantities.some((q) => Math.abs(q - quantities[0]) > 1e-10 * Math.max(1, Math.abs(q)))) return null;
  const prices = [o.avgPrice, o.avgFillPrice, o.fillPrice]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN);
  if (!prices.length || prices.some((p) => !Number.isFinite(p) || p <= 0)) return null;
  return { qty: quantities[0], px: prices[0] };
}
