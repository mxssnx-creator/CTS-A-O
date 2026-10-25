import type { CoreDb } from "./db.server.ts";
import { executionRecordKey, ownedPaperExecutionRecords, type LiveRecord } from "../live-record.ts";

type Row = { cfg: string; sym: string; side: number; exit_t: number; unit_r: number | null; owned_notional_usd: number | null };
const columns = "cfg,sym,side,exit_t,unit_r,owned_notional_usd";
const invalidIdentity = "(trim(cfg)='' OR trim(sym)='' OR coalesce(side,0) NOT IN (-1,1))";
const ambiguous = new WeakMap<CoreDb, { version: number; rows: Row[] }>();
const memo = new WeakMap<CoreDb, {version: number; records: Map<string, {at:number; until:number; record:LiveRecord|undefined}>}>();

/** Read only this lane's chronological Last-N. An unrelated book never needs to be materialized for admission. */
export function ownedPromotionRecord(db: CoreDb, lane: {cfg: string; sym: string; side: number}, n: number, now: number) {
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(now)) return undefined;
  const version = db.version("paper_book_trades"), key = JSON.stringify([lane.cfg,lane.sym,lane.side,n]);
  let cached = memo.get(db);
  if (!cached || cached.version !== version) {
    cached = {version,records:new Map()}; memo.set(db,cached);
  }
  const hit = cached.records.get(key);
  if (hit && now >= hit.at && now < hit.until) return hit.record;
  const rows = db.all<Row>(
    `SELECT ${columns} FROM paper_book_trades WHERE reason != 'dropped' AND cfg=? AND sym=? AND side=? AND exit_t>=0 AND exit_t<=? ORDER BY exit_t DESC,entry_t DESC LIMIT ?`,
    lane.cfg, lane.sym, lane.side, now, n,
  ).reverse();
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
  if (marker !== undefined) rows.push({...lane, exit_t:marker, unit_r:null, owned_notional_usd:null});
  const record = ownedPaperExecutionRecords(rows.map(row => ({cfg:row.cfg,sym:row.sym,side:row.side,
    exitT:row.exit_t,unitR:row.unit_r,ownedNotionalUsd:row.owned_notional_usd})))
    .get(executionRecordKey(lane.cfg,lane.sym,lane.side));
  if (cached.records.size >= 4096) cached.records.clear();
  cached.records.set(key,{at:now,until,record});
  return record;
}
