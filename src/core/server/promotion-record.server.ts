import type { CoreDb } from "./db.server.ts";
import { executionRecordKey, ownedPaperExecutionRecords, type LiveRecord } from "../live-record.ts";
import { executableR } from "../relation.ts";
import { kindOfId } from "../pipeline/pipeline.ts";

export type OwnedPaperRow = { cfg: string; sym: string; side: number; entry_t: number; exit_t: number; unit_r: number | null;
  owned_notional_usd: number | null; held_at: number | null; held_px: number | null; entry: number | null;
  exit: number | null; vol: number | null };
type Row = OwnedPaperRow;
const columns = "cfg,sym,side,entry_t,exit_t,unit_r,owned_notional_usd,held_at,held_px,entry,exit,vol";
const invalidIdentity = "(trim(cfg)='' OR trim(sym)='' OR coalesce(side,0) NOT IN (-1,1))";
const ambiguous = new WeakMap<CoreDb, { version: number; rows: Row[] }>();
const identities = new WeakMap<CoreDb, { version: number; keys: Set<string>; ambiguous: boolean }>();
type Records = { at: number; until: number; unit: LiveRecord | undefined; effective: LiveRecord | undefined; cash: LiveRecord | undefined };
const memo = new WeakMap<CoreDb, {version: number; records: Map<string, Records>}>();

/** Skip per-lane SQL for known empty identities, unless an ambiguous row could belong to that lane. */
export function ownedPromotionIdentities(db: CoreDb): { keys: ReadonlySet<string>; ambiguous: boolean } {
  const version = db.version("paper_book_trades"), old = identities.get(db);
  if (old?.version === version) return old;
  const rows = db.all<{ cfg: string; sym: string; side: number }>(
    `SELECT DISTINCT cfg,sym,side FROM paper_book_trades WHERE reason != 'dropped' AND exit_t IS NOT NULL AND NOT ${invalidIdentity}`,
  );
  const bad = !!db.get<{n:number}>(`SELECT 1 AS n FROM paper_book_trades INDEXED BY paper_book_trades_ambiguous WHERE reason != 'dropped' AND exit_t IS NOT NULL AND ${invalidIdentity} LIMIT 1`);
  const next = { version, keys: new Set(rows.map((x) => executionRecordKey(x.cfg, x.sym, x.side))), ambiguous: bad };
  identities.set(db, next);
  return next;
}

/**
 * Dollar P&L of a simple paper close using the adopted price and frozen owned notional. This is a paper-price
 * approximation with the original modeled cost, never an exchange fill. A ladder, late/unknown adoption,
 * ambiguous allocation or missing price remains unknown rather than inheriting the simulated entry's return.
 */
export function effectivePaperPnl(row: Row): number | null {
  if (row.side !== 1 && row.side !== -1) return null;
  if (![row.entry_t, row.exit_t, row.held_at, row.held_px, row.entry, row.exit, row.vol,
    row.unit_r, row.owned_notional_usd].every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  // Block/Relate can scale a single-entry order's owned notional; ladder entries need leg-level prices and sizes.
  const kind = kindOfId(row.cfg);
  if (kind === "dca" || kind === "dca-active" || kind === "axis") return null;
  if (row.held_at! < row.entry_t || row.held_at! > row.exit_t || row.vol! <= 0 || row.owned_notional_usd! <= 1e-9)
    return null;
  const unit = executableR({ side: row.side, r: row.unit_r, vol: 1,
    held_px: row.held_px, entry: row.entry, exit: row.exit });
  if (unit === null) return null;
  const modeledCost = row.side * (row.exit! / row.entry! - 1) - row.unit_r!;
  const pnl = unit * row.owned_notional_usd!;
  return Number.isFinite(modeledCost) && modeledCost >= -1e-12 && Number.isFinite(pnl) ? pnl : null;
}

/** Read only this lane's chronological Last-N. An unrelated book never needs to be materialized for admission. */
export function ownedPromotionRecord(db: CoreDb, lane: {cfg: string; sym: string; side: number}, n: number, now: number,
  basis: "unit" | "effective" | "cash" = "unit", pending: readonly OwnedPaperRow[] = []) {
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(now)) return undefined;
  const version = db.version("paper_book_trades"), key = JSON.stringify([lane.cfg,lane.sym,lane.side,n]);
  let cached = memo.get(db);
  if (!cached || cached.version !== version) {
    cached = {version,records:new Map()}; memo.set(db,cached);
  }
  const hit = cached.records.get(key);
  if (!pending.length && hit && now >= hit.at && now < hit.until) return hit[basis];
  const rows = db.all<Row>(
    `SELECT ${columns} FROM paper_book_trades WHERE reason != 'dropped' AND cfg=? AND sym=? AND side=? AND exit_t>=0 AND exit_t<=? ORDER BY exit_t DESC,entry_t DESC LIMIT ?`,
    lane.cfg, lane.sym, lane.side, now, n,
  ).reverse();
  // A held order can close earlier in this paper step than a new entry, before its row is flushed below. Merge
  // those exact closes only as of their own exit; they never borrow another lane, duplicate a persisted row or
  // replace conflicting evidence with a more favorable observation.
  const pendingIds = new Set<number>();
  for (const row of pending) {
    if (row.cfg !== lane.cfg || row.sym !== lane.sym || row.side !== lane.side) continue;
    if (!Number.isFinite(row.entry_t) || !Number.isFinite(row.exit_t) || row.exit_t < row.entry_t)
      throw new Error("invalid pending paper close");
    if (row.exit_t > now) continue;
    const prior = db.get<Row>(`SELECT ${columns} FROM paper_book_trades WHERE cfg=? AND sym=? AND side=? AND entry_t=?`,
      lane.cfg, lane.sym, lane.side, row.entry_t);
    const duplicate = pendingIds.has(row.entry_t);
    pendingIds.add(row.entry_t);
    if (prior || duplicate) {
      const fields = ["cfg", "sym", "side", "entry_t", "exit_t", "unit_r", "owned_notional_usd", "held_at", "held_px", "entry", "exit", "vol"] as const;
      if (!duplicate && prior && fields.every((field) => Object.is(row[field], prior[field]))) continue;
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].entry_t === row.entry_t) rows.splice(i, 1);
      rows.push({ ...row, unit_r: null, owned_notional_usd: null });
    } else rows.push(row);
  }
  rows.sort((a, b) => a.exit_t - b.exit_t || a.entry_t - b.entry_t);
  if (rows.length > n) rows.splice(0, rows.length - n);
  // Corrupt identities must not disappear in favor of older winning closes. The partial index is empty on a
  // valid book; cache only these exceptional rows, never all configurations' historical executions.
  let bad = ambiguous.get(db);
  if (!bad || bad.version !== version) {
    const hasAmbiguous = db.get<{n:number}>(`SELECT 1 AS n FROM paper_book_trades INDEXED BY paper_book_trades_ambiguous WHERE reason != 'dropped' AND exit_t IS NOT NULL AND ${invalidIdentity} LIMIT 1`);
    bad = { version, rows: hasAmbiguous ? db.all<Row>(
      `SELECT ${columns} FROM paper_book_trades INDEXED BY paper_book_trades_ambiguous WHERE reason != 'dropped' AND exit_t IS NOT NULL AND ${invalidIdentity}`,
    ) : [] };
    ambiguous.set(db, bad);
  }
  let marker: number | undefined;
  let until = db.get<{at:number|null}>(
    "SELECT MIN(exit_t) AS at FROM paper_book_trades WHERE reason != 'dropped' AND cfg=? AND sym=? AND side=? AND exit_t>?",
    lane.cfg,lane.sym,lane.side,now,
  )?.at ?? Infinity;
  for (const row of bad.rows) {
    if ((row.cfg.trim() && row.cfg !== lane.cfg) || (row.sym.trim() && row.sym !== lane.sym) ||
      ((row.side === -1 || row.side === 1) && row.side !== lane.side)) continue;
    if (!Number.isFinite(row.exit_t)) { marker = NaN; break; }
    if (row.exit_t > now) until = Math.min(until,row.exit_t);
    if (row.exit_t <= now && (marker === undefined || row.exit_t > marker)) marker = row.exit_t;
  }
  // SQLite can retain infinities or non-numeric legacy timestamps. They are unknown evidence, not ignorable.
  const invalid = db.get<{n:number}>(
    "SELECT 1 AS n FROM paper_book_trades INDEXED BY paper_book_trades_invalid_clock WHERE reason != 'dropped' AND cfg=? AND sym=? AND side=? AND exit_t IS NOT NULL AND (typeof(exit_t) NOT IN ('integer','real') OR exit_t NOT BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308) LIMIT 1",
    lane.cfg, lane.sym, lane.side,
  );
  if (invalid) marker = NaN;
  if (marker !== undefined) rows.push({...lane, entry_t:0, exit_t:marker, unit_r:null, owned_notional_usd:null,
    held_at:null,held_px:null,entry:null,exit:null,vol:null});
  const toRecord = (basis: "unit" | "effective" | "cash") => ownedPaperExecutionRecords(rows.map(row => {
    const pnl = basis === "unit" ? null : effectivePaperPnl(row);
    const r = basis === "unit" ? row.unit_r : pnl === null ? null
      : basis === "cash" ? pnl : pnl / row.owned_notional_usd!;
    return {cfg:row.cfg,sym:row.sym,side:row.side,
      exitT:row.exit_t,unitR:r,ownedNotionalUsd:row.owned_notional_usd};
  }))
    .get(executionRecordKey(lane.cfg,lane.sym,lane.side));
  const records = { at:now, until, unit:toRecord("unit"), effective:toRecord("effective"), cash:toRecord("cash") };
  if (!pending.length) {
    if (cached.records.size >= 4096) cached.records.clear();
    cached.records.set(key,records);
  }
  return records[basis];
}
