import type { CoreDb } from "./db.server.ts";

const HOUR = 3_600_000, LIMIT = 1000;
type Window = [number, number];
interface Progress {
  from: number; through: number | null; target: number; pending: Window[];
  checkedAt: number; error: string | null;
  lastFullAt?: number; fullScan?: boolean;
}
export type IncomeReader = (from: number, to: number, limit: number) => Promise<unknown>;
const tasks = new WeakMap<CoreDb, { scope: string; at: number; promise: Promise<void> | null }>();
const keyOf = (scope: string) => `venueIncome:${scope}`;
function saveProgress(db: CoreDb, scope: string, state: Progress) {
  db.runDurable("INSERT INTO kv(k,v,at) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v,at=excluded.at",
    keyOf(scope),JSON.stringify(state),state.checkedAt);
}

function rowsOf(reply: unknown) {
  if ((reply as { code?: number })?.code !== undefined && Number((reply as {code:number}).code) !== 0)
    throw new Error("Venue rejected the income history request");
  const data = (reply as { data?: unknown })?.data ?? reply;
  if (!Array.isArray(data)) throw new Error("Venue income history is not a complete array");
  return data.map((row: Record<string, unknown>) => {
    const id = row.tranId;
    if (!(typeof id === "string" && id.length) && !(typeof id === "number" && Number.isSafeInteger(id)))
      throw new Error("Venue income transaction identity is missing or imprecise");
    const amount = row.income === null || row.income === "" ? NaN : Number(row.income);
    const at = Number(row.time);
    if (!Number.isFinite(amount) || !Number.isSafeInteger(at) || at < 0 ||
      typeof row.asset !== "string" || !row.asset || typeof row.incomeType !== "string" || !row.incomeType)
      throw new Error("Venue income row has unknown amount, asset, type or time");
    return { id: String(id), amount, at, asset: row.asset, type: row.incomeType,
      sym: typeof row.symbol === "string" ? row.symbol : "", tradeId: typeof row.tradeId === "string" ? row.tradeId : null };
  });
}

/** Bounded, idempotent reads. A saturated millisecond remains an explicit gap, never silent truncation. */
export async function syncVenueIncome(
  db: CoreDb, scope: string, read: IncomeReader, alive: () => boolean,
  now = Date.now(), maxRequests = 4,
): Promise<void> {
  const saved = db.kvGet<Progress>(keyOf(scope));
  const state: Progress = saved ? structuredClone(saved) : {
    from: now - 150 * HOUR, through: null, target: now, pending: [[now - 150 * HOUR, now]], checkedAt: 0, error: null, fullScan:true,
  };
  if (!state.pending.length) {
    state.target = now;
    state.fullScan = now - (state.lastFullAt ?? 0) >= HOUR;
    state.pending = [[Math.max(state.from, state.fullScan ? now - 150 * HOUR : (state.through ?? state.from) - 10 * 60_000), now]];
  }
  try {
    for (let requests = 0; requests < maxRequests && state.pending.length && alive(); requests++) {
      const [from, to] = state.pending[0];
      const response = await read(from, to, LIMIT);
      if (!alive()) return;
      const rows = rowsOf(response);
      if (rows.some((row) => row.at < from || row.at > to)) throw new Error("Venue income response is outside its requested window");
      if (rows.length >= LIMIT) {
        if (from === to) throw new Error("Venue income history saturated one millisecond; coverage incomplete");
        const middle = Math.floor((from + to) / 2);
        state.pending.splice(0, 1, [middle + 1, to], [from, middle]);
      } else {
        // Publish the complete window and its cursor together. Repeated/late records update the same identity.
        db.tx(() => {
          for (const row of rows) db.runDurable(
            "INSERT INTO venue_income(scope,id,asset,type,sym,trade_id,at,amount) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(scope,asset,type,id) DO UPDATE SET sym=excluded.sym,trade_id=excluded.trade_id,at=excluded.at,amount=excluded.amount",
            scope, row.id, row.asset, row.type, row.sym, row.tradeId, row.at, row.amount,
          );
          state.pending.shift();
          if (!state.pending.length) {
            state.through = state.target;
            if (state.fullScan) state.lastFullAt = now;
          }
          state.error = null; state.checkedAt = now;
          saveProgress(db,scope,state);
        });
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  }
  if (alive()) { state.checkedAt = now; saveProgress(db,scope,state); }
}

/** Start after protection without awaiting history; at most one bounded job per DB and one refresh per 30s. */
export function requestVenueIncome(db: CoreDb, scope: string, read: IncomeReader, alive: () => boolean, now = Date.now()): void {
  const current = tasks.get(db);
  if (current && (current.promise || current.scope === scope && now - current.at < 30_000)) return;
  const task: { scope: string; at: number; promise: Promise<void> | null } = { scope, at: now, promise: null };
  task.promise = syncVenueIncome(db, scope, read, alive, now).catch(() => {
    // Disposal can close the DB after a read; it must not reject an unrelated foreground control step.
  }).finally(() => {
    if (tasks.get(db) === task) task.promise = null;
  });
  tasks.set(db, task);
}

/** Actual signed cash flows, by settlement asset. They do not identify config ownership or define return PF. */
export function venueIncomeSummary(db: CoreDb, scope: string, from: number, to: number) {
  const progress = db.kvGet<Progress>(keyOf(scope));
  const rows = db.all<{ asset: string; type: string; n: number; amount: number }>(
    "SELECT asset,type,COUNT(*) AS n,SUM(amount) AS amount FROM venue_income WHERE scope=? AND at>=? AND at<=? GROUP BY asset,type ORDER BY asset,type", scope, from, to,
  );
  const assets = new Map<string, { asset: string; realized: number; tradingFees: number; funding: number; otherTrading: number; other: number; transfers: number; records: number }>();
  for (const row of rows) {
    const a = assets.get(row.asset) ?? { asset: row.asset, realized: 0, tradingFees: 0, funding: 0, otherTrading:0, other: 0, transfers: 0, records: 0 };
    const field = row.type === "REALIZED_PNL" ? "realized" : row.type === "TRADING_FEE" ? "tradingFees"
      : row.type === "FUNDING_FEE" ? "funding" : row.type === "TRANSFER" || row.type === "TRIAL_FUND" ? "transfers"
        : ["INSURANCE_CLEAR","ADL","SYSTEM_DEDUCTION","GTD_PRICE"].includes(row.type) ? "otherTrading" : "other";
    a[field] += row.amount; a.records += row.n; assets.set(row.asset, a);
  }
  return {
    basis: "venue-account-income" as const, ownership: "whole-selected-account; not-per-config" as const,
    from, to, coveredFrom: progress?.from ?? null, coveredThrough: progress?.through ?? null,
    pendingWindows: progress?.pending.length ?? 0, checkedAt: progress?.checkedAt ?? null,
    complete: !!progress && !progress.error && from >= progress.from && to <= (progress.through ?? -Infinity),
    error: progress?.error ?? null,
    assets: [...assets.values()].map(a => ({ ...a, tradingNet: a.realized + a.tradingFees + a.funding + a.otherTrading,
      accountChange: a.realized + a.tradingFees + a.funding + a.otherTrading + a.other + a.transfers })),
  };
}
