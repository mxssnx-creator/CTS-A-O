// Shared nonblocking Bybit HTTP budget. One host's workers share this SQLite file, including different keys:
// they may belong to the same UID. The global cap also leaves substantial headroom below the documented IP limit.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const WINDOW_MS = 1_050;
const GLOBAL_PER_WINDOW = 40;
const endpointLimit = (endpoint: string) => endpoint === "POST /v5/order/create" || endpoint === "POST /v5/order/cancel" ? 10 : 5;
export interface BybitRequestBudget {
  take(endpoint: string, now: number, growing: boolean): { until: number; unavailable?: boolean };
  pause(endpoint: string, until: number): void;
}

export class BybitBudget implements BybitRequestBudget {
  private db: DatabaseSync | null = null;
  constructor(privateFile: string) { this.file = privateFile; }
  readonly file: string;

  private open(): DatabaseSync {
    if (this.db) return this.db;
    if (this.file !== ":memory:") mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(this.file);
    try {
      db.exec("PRAGMA busy_timeout=0; CREATE TABLE IF NOT EXISTS requests(endpoint TEXT NOT NULL, at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS requests_ep_at ON requests(endpoint,at); CREATE TABLE IF NOT EXISTS pauses(endpoint TEXT PRIMARY KEY, until_ms INTEGER NOT NULL)");
    } catch (e) { db.close(); throw e; }
    return this.db = db;
  }

  take(endpoint: string, now: number, growing: boolean): { until: number; unavailable?: boolean } {
    let db: DatabaseSync | null = null, transaction = false;
    try {
      db = this.open();
      db.exec("BEGIN IMMEDIATE"); transaction = true;
      db.prepare("DELETE FROM requests WHERE at <= ?").run(now - WINDOW_MS);
      db.prepare("DELETE FROM pauses WHERE until_ms <= ?").run(now);
      const pause = db.prepare("SELECT MAX(until_ms) AS until_ms FROM pauses WHERE endpoint IN (?, '*')").get(endpoint) as { until_ms: number | null };
      const own = db.prepare("SELECT COUNT(*) AS n, MIN(at) AS first FROM requests WHERE endpoint = ?").get(endpoint) as { n: number; first: number | null };
      const global = db.prepare("SELECT COUNT(*) AS n, MIN(at) AS first FROM requests").get() as { n: number; first: number | null };
      const limit = endpointLimit(endpoint), threshold = Math.max(1, limit - (growing ? 2 : 0));
      const protection = endpoint === "POST /v5/order/cancel" || (endpoint === "POST /v5/order/create" && !growing);
      // Leave host-wide request capacity for cancel/reduce/protection while public history is backfilling.
      const globalThreshold = GLOBAL_PER_WINDOW - (protection ? 0 : 8);
      const until = Math.max(pause.until_ms ?? 0, own.n >= threshold ? (own.first ?? now) + WINDOW_MS : 0,
        global.n >= globalThreshold ? (global.first ?? now) + WINDOW_MS : 0);
      if (!until) db.prepare("INSERT INTO requests(endpoint, at) VALUES (?,?)").run(endpoint, now);
      db.exec("COMMIT"); transaction = false;
      return { until };
    } catch {
      if (db && transaction) { try { db.exec("ROLLBACK"); } catch { /* admission remains closed */ } }
      return { until: now + 100, unavailable: true };
    }
  }

  pause(endpoint: string, until: number): void {
    if (!Number.isSafeInteger(until) || until < 0) throw new Error("Invalid Bybit rate-limit deadline");
    const db = this.open();
    db.prepare("INSERT INTO pauses(endpoint,until_ms) VALUES (?,?) ON CONFLICT(endpoint) DO UPDATE SET until_ms=MAX(until_ms,excluded.until_ms)").run(endpoint, until);
  }

  close(): void { this.db?.close(); this.db = null; }
}

const budgets = new Map<string, BybitBudget>();
export function sharedBybitBudget(): BybitBudget {
  const file = process.env.CTS_BYBIT_RATE_BUDGET_FILE?.trim() || join(tmpdir(), `cts-bybit-api-${process.getuid?.() ?? "app"}`, "requests.sqlite");
  let budget = budgets.get(file);
  if (!budget) budgets.set(file, budget = new BybitBudget(file));
  return budget;
}
