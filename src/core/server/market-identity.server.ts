import type { CoreDb } from "./db.server.ts";

/** Never relabel legacy candles or erase execution/ownership records on a venue change. */
export function pinMarketHistory(db: CoreDb, host: string): void {
  const previous = db.kvGet<string>("marketEnvironment");
  if (previous === host) return;
  const existing = db.get<{ n: number }>("SELECT COUNT(*) AS n FROM candles")?.n ?? 0;
  if (existing > 0) throw new Error("Stored candle market environment is unverified or different; preserve this state and rebuild in a fresh state path");
  db.kvSet("marketEnvironment", host);
}
