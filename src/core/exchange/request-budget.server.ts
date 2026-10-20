// Official BingX swap limits, checked 20 October 2026:
// https://bingx.com/en/support/articles/31103871611289
// https://github.com/BingX-API/api-ai-skills/blob/main/skills/swap-trade/api-reference.md
// Where those tables differ, use the lower value. All credentials on this host share the budget:
// different API keys may belong to the same venue UID. No credentials are persisted here.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

export const REQUEST_WINDOW_MS = 1050; // rolling second plus clock/dispatch margin
export function signedRequestsPerSecond(method: string, path: string): number {
  const trader = process.env.CTS_BINGX_TRADER_RATE_LIMITS === "1";
  if (path === "/openApi/swap/v2/trade/order") return method === "POST" ? (trader ? 1 : 10) : (method === "DELETE" && trader ? 1 : 5);
  if (path === "/openApi/swap/v2/trade/batchOrders") return trader ? 1 : 5;
  if (/\/positionSide\/dual$|\/marginType$|\/positionMargin$/.test(path)) return 2;
  if (/\/trade\/leverage$/.test(path)) return method === "POST" ? 2 : 5;
  if (/\/user\/(?:balance|positions|income|commissionRate)$|\/trade\/(?:openOrders|allOrders|allFillOrders|allOpenOrders|closeAllPositions)$/.test(path)) return 5;
  return 2; // unknown endpoints are conservative, never inferred unlimited
}

export const requestBudgetFile = () => process.env.CTS_BINGX_RATE_BUDGET_FILE?.trim() ||
  join(tmpdir(), `cts-bingx-api-${process.getuid?.() ?? "app"}`, "requests.sqlite");

/** Atomic, nonblocking admission: no delayed order queue can outlive its caller's execution epoch. */
export class RequestBudget {
  file: string;
  private db: DatabaseSync | null = null;
  constructor(file: string) { this.file = file; }
  take(endpoint: string, limit: number, now = Date.now(), reserve = 0): { until: number; unavailable?: boolean } {
    let transaction = false;
    try {
      if (!this.db) {
        if (this.file !== ":memory:") mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
        const db = new DatabaseSync(this.file);
        try {
          db.exec("PRAGMA busy_timeout=0; CREATE TABLE IF NOT EXISTS requests (endpoint TEXT NOT NULL, at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS requests_endpoint ON requests(endpoint,at)");
        } catch (err) { db.close(); throw err; }
        this.db = db;
      }
      this.db.exec("BEGIN IMMEDIATE");
      transaction = true;
      this.db.prepare("DELETE FROM requests WHERE at <= ?").run(now - REQUEST_WINDOW_MS);
      const row = this.db.prepare("SELECT COUNT(*) AS n, MIN(at) AS first FROM requests WHERE endpoint = ?").get(endpoint) as { n: number; first: number | null };
      const threshold = Math.max(1, limit - reserve);
      const until = row.n >= threshold ? Math.max(now + 1, (row.first ?? now) + REQUEST_WINDOW_MS) : 0;
      if (!until) this.db.prepare("INSERT INTO requests(endpoint,at) VALUES (?,?)").run(endpoint, now);
      this.db.exec("COMMIT");
      transaction = false;
      return { until };
    } catch {
      if (transaction) { try { this.db?.exec("ROLLBACK"); } catch { /* retained fail-closed admission */ } }
      return { until: now + 100, unavailable: true };
    }
  }
  close() { this.db?.close(); this.db = null; }
}
const budgets = new Map<string, RequestBudget>();
export function takeSignedRequestSlot(method: string, path: string, params: Record<string, string | number>, now = Date.now()) {
  const file = requestBudgetFile();
  let budget = budgets.get(file);
  if (!budget) budgets.set(file, budget = new RequestBudget(file));
  const limit = signedRequestsPerSecond(method, path);
  const grows = method === "POST" && path.endsWith("/trade/order") && params.type === "MARKET" &&
    params.reduceOnly !== "true" && params.closePosition !== "true" &&
    (params.positionSide === "BOTH" || (params.positionSide === "LONG" && params.side === "BUY") ||
      (params.positionSide === "SHORT" && params.side === "SELL"));
  return budget.take(`${method} ${path}`, limit, now, grows ? Math.min(2, limit - 1) : 0);
}
