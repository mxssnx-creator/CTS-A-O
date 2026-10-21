import type { CoreDb } from "./db.server.ts";

/** A late commission only certifies the exact owned cumulative quantity and fill price it describes. */
export function reconcileVenueFees(db: CoreDb, response: unknown, own: (coid: string) => boolean): number {
  const body = response as { orders?: unknown; data?: unknown } | null;
  const rows = Array.isArray(response) ? response : Array.isArray(body?.orders) ? body.orders
    : Array.isArray(body?.data) ? body.data : [];
  const receipts = new Map<string, Record<string, unknown>>();
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const coid = String(row.clientOrderId ?? row.clientOrderID ?? "");
    if (!own(coid)) continue;
    const prev = receipts.get(coid.toUpperCase());
    if (!prev || Number(row.updateTime ?? row.time ?? 0) >= Number(prev.updateTime ?? prev.time ?? 0))
      receipts.set(coid.toUpperCase(), row);
  }
  let updated = 0;
  const unknown = db.all<{ coid: string; sym: string; side: number; qty: number; fill_px: number }>(
    "SELECT coid,sym,side,qty,fill_px FROM live_fills WHERE COALESCE(fee_known,0)=0 AND qty>0 ORDER BY at DESC LIMIT 1000",
  );
  for (const fill of unknown) {
    const row = receipts.get(fill.coid.toUpperCase());
    if (!row || !own(fill.coid)) continue;
    const symbol = String(row.symbol ?? "").replaceAll("-", "");
    if (symbol !== fill.sym.replaceAll("-", "")) continue;
    const ps = String(row.positionSide ?? "").toUpperCase();
    if ((ps === "LONG" && fill.side !== 1) || (ps === "SHORT" && fill.side !== -1)) continue;
    const qty = Number(row.executedQty ?? row.executedVolume);
    const px = Number(row.avgPrice ?? row.price);
    const rawFee = row.commission ?? row.fee;
    const fee = rawFee === undefined || rawFee === null || rawFee === "" ? NaN : Math.abs(Number(rawFee));
    if (!(qty > 0 && qty === fill.qty && px > 0 && Number.isFinite(px) && Number.isFinite(fee)) ||
      Math.abs(px - fill.fill_px) > 1e-12 * Math.max(1, Math.abs(fill.fill_px))) continue;
    // The request may have raced a cumulative fill update. Its old scope cannot certify the new row.
    const change = db.runDurable("UPDATE live_fills SET fee=?,fee_known=1 WHERE coid=? AND qty=? AND fill_px=? AND COALESCE(fee_known,0)=0",
      fee, fill.coid, fill.qty, fill.fill_px);
    updated += Number(change.changes);
  }
  return updated;
}
