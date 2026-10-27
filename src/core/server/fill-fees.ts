import type { CoreDb } from "./db.server.ts";

/** A late commission only certifies the exact owned cumulative quantity and fill price it describes. */
export function reconcileVenueFees(db: CoreDb, response: unknown, own: (coid: string) => boolean): number {
  const body = response as { orders?: unknown; data?: unknown } | null;
  const rows = Array.isArray(response) ? response : Array.isArray(body?.orders) ? body.orders
    : Array.isArray(body?.data) ? body.data : [];
  const receipts = new Map<string, Array<Record<string, unknown>>>();
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const coid = String(row.clientOrderId ?? row.clientOrderID ?? "");
    if (!own(coid)) continue;
    const found = receipts.get(coid.toUpperCase()) ?? [];
    found.push(row);
    receipts.set(coid.toUpperCase(), found);
  }
  let updated = 0;
  const unknown = db.all<{ coid: string; sym: string; side: number; qty: number; fill_px: number }>(
    "SELECT coid,sym,side,qty,fill_px FROM live_fills WHERE COALESCE(fee_known,0)=0 AND qty>0 ORDER BY at DESC LIMIT 1000",
  );
  for (const fill of unknown) {
    // Native partial exits are booked as one idempotent local R row keyed by the original venue coid.
    // Venue history carries the original client id, not that local reduction prefix.
    const native = fill.coid.startsWith("lanefill-");
    const source = native ? fill.coid.slice("lanefill-".length) : fill.coid;
    const found = receipts.get(source.toUpperCase());
    if (!found?.length || !own(source)) continue;
    const time = (x: Record<string, unknown>) => {
      const v = x.updateTime ?? x.time;
      return (typeof v === "number" || (typeof v === "string" && v.trim() !== "")) && Number.isFinite(Number(v))
        ? Number(v) : null;
    };
    // Multiple unordered or same-time contradictory receipts are not a measured commission.
    if (found.length > 1 && found.some((x) => time(x) === null)) continue;
    const ordered = [...found].sort((a, b) => (time(b) ?? 0) - (time(a) ?? 0));
    const row = ordered[0];
    const norm = (v: unknown) => (typeof v === "number" || (typeof v === "string" && v.trim() !== "")) && Number.isFinite(Number(v))
      ? Number(v) : String(v ?? "").toUpperCase();
    const signature = (x: Record<string, unknown>) => JSON.stringify([
      x.symbol, x.positionSide, x.side, x.type, x.status, x.executedQty, x.executedVolume, x.cumExecQty,
      x.filledQty, x.avgPrice, x.price, x.commission, x.fee,
    ].map(norm));
    if (ordered.slice(1).some((x) => time(x) === time(row) && signature(x) !== signature(row))) continue;
    if (ordered.slice(1).some((x) => {
      const values = [x.executedQty, x.executedVolume, x.cumExecQty, x.filledQty].filter((v) => v !== undefined && v !== null);
      if (!values.length) return false;
      const quantities = values.map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN);
      return quantities.some((q) => !Number.isFinite(q) || q < 0 || q !== quantities[0] || q > fill.qty);
    })) continue;
    const symbol = String(row.symbol ?? "").replaceAll("-", "");
    if (symbol !== fill.sym.replaceAll("-", "")) continue;
    const ps = String(row.positionSide ?? "").toUpperCase();
    if ((ps === "LONG" && fill.side !== 1) || (ps === "SHORT" && fill.side !== -1)) continue;
    if (native) {
      const original = db.get<{ kind: string; sym: string; side: number }>(
        "SELECT kind,sym,side FROM live_orders WHERE coid=? COLLATE NOCASE", source);
      const expectedType = original?.kind === "V" ? "STOP_MARKET" : original?.kind === "Y" ? "TAKE_PROFIT_MARKET" : "";
      if (!original || original.sym !== fill.sym || original.side !== fill.side || !expectedType ||
        !(ps === "BOTH" || ps === (fill.side === 1 ? "LONG" : "SHORT")) ||
        String(row.side ?? "").toUpperCase() !== (fill.side === 1 ? "SELL" : "BUY") ||
        String(row.type ?? "").toUpperCase() !== expectedType) continue;
      if (ordered.some((x) => {
        const optional = (value: unknown, want: string) => value === undefined || value === null || String(value).toUpperCase() === want;
        const symbol = x.symbol === undefined || x.symbol === null ? fill.sym.replaceAll("-", "") : String(x.symbol).replaceAll("-", "");
        return symbol.toUpperCase() !== fill.sym.replaceAll("-", "").toUpperCase() ||
          !optional(x.positionSide, ps) || !optional(x.side, fill.side === 1 ? "SELL" : "BUY") || !optional(x.type, expectedType);
      })) continue;
    }
    const rawQty = [row.executedQty, row.executedVolume, row.cumExecQty, row.filledQty]
      .filter((x) => x !== undefined && x !== null);
    const quantities = rawQty.map((x) => typeof x === "number" || (typeof x === "string" && x.trim() !== "") ? Number(x) : NaN);
    if (!quantities.length || quantities.some((q) => !Number.isFinite(q) || q < 0 || q !== quantities[0])) continue;
    const qty = quantities[0];
    const px = Number(row.avgPrice ?? row.price);
    const rawFees = [row.commission, row.fee].filter((v) => v !== undefined && v !== null);
    const fees = rawFees.map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Math.abs(Number(v)) : NaN);
    const fee = fees.length && fees.every((v) => Number.isFinite(v) && v === fees[0]) ? fees[0] : NaN;
    if (!(qty > 0 && qty === fill.qty && px > 0 && Number.isFinite(px) && Number.isFinite(fee)) ||
      Math.abs(px - fill.fill_px) > 1e-12 * Math.max(1, Math.abs(fill.fill_px))) continue;
    // The request may have raced a cumulative fill update. Its old scope cannot certify the new row.
    const change = db.runDurable("UPDATE live_fills SET fee=?,fee_known=1 WHERE coid=? AND qty=? AND fill_px=? AND COALESCE(fee_known,0)=0",
      fee, fill.coid, fill.qty, fill.fill_px);
    updated += Number(change.changes);
  }
  return updated;
}
