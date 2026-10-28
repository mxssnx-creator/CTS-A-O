// Shared nonblocking Bybit HTTP budget. One host's workers share this SQLite file, including different keys:
// they may belong to the same UID. The global cap also leaves substantial headroom below the documented IP limit.
import { DatabaseSync } from "node:sqlite";
import { closeSync, mkdirSync, openSync, readdirSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
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
  private readonly localPauses = new Map<string, number>();
  constructor(privateFile: string) { this.file = privateFile; }
  readonly file: string;

  // A separate atomic marker survives SQLite write contention. The deadline and endpoint are encoded in the
  // name so a concurrent reader never observes a partly written record. Markers are unique: two writers cannot
  // overwrite a longer ban with a shorter one. Never include credentials or account identifiers here.
  private markerPause(endpoint: string, now: number): number {
    let until = Math.max(this.localPauses.get("*") ?? 0, this.localPauses.get(endpoint) ?? 0);
    if (this.file === ":memory:") return until > now ? until : 0;
    const dir = `${this.file}.pauses`;
    let names: string[];
    try { names = readdirSync(dir); }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return until > now ? until : 0;
      throw e;
    }
    for (const name of names) {
      const match = /^(\d+)\.([A-Za-z0-9_-]+)\.([0-9a-f-]{36})$/.exec(name);
      if (!match) throw new Error("Invalid Bybit cooldown marker");
      const deadline = Number(match[1]);
      if (!Number.isSafeInteger(deadline)) throw new Error("Invalid Bybit cooldown deadline");
      if (deadline <= now) {
        try { unlinkSync(join(dir, name)); }
        catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
        continue;
      }
      const scope = Buffer.from(match[2], "base64url").toString("utf8");
      if (scope === "*" || scope === endpoint) until = Math.max(until, deadline);
    }
    return until > now ? until : 0;
  }

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
      const marker = this.markerPause(endpoint, now);
      if (marker) return { until: marker };
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
      // A cooldown can arrive while this transaction owns SQLite's writer lock. Recheck its independent marker
      // before authorizing dispatch; consuming an unused slot is safer than sending through the new cooldown.
      return { until: Math.max(until, this.markerPause(endpoint, now)) };
    } catch {
      if (db && transaction) { try { db.exec("ROLLBACK"); } catch { /* admission remains closed */ } }
      return { until: now + 100, unavailable: true };
    }
  }

  pause(endpoint: string, until: number): void {
    if (!Number.isSafeInteger(until) || until < 0 || !endpoint || Buffer.byteLength(endpoint) > 128)
      throw new Error("Invalid Bybit rate-limit deadline or endpoint");
    this.localPauses.set(endpoint, Math.max(this.localPauses.get(endpoint) ?? 0, until));
    let recorded = false;
    if (this.file !== ":memory:") {
      try {
        const dir = `${this.file}.pauses`;
        mkdirSync(dir, { recursive: true, mode: 0o700 });
        const marker = `${until}.${Buffer.from(endpoint).toString("base64url")}.${randomUUID()}`;
        closeSync(openSync(join(dir, marker), "wx", 0o600));
        recorded = true;
      } catch { /* SQLite may still durably publish the pause. */ }
    }
    try {
      const db = this.open();
      db.prepare("INSERT INTO pauses(endpoint,until_ms) VALUES (?,?) ON CONFLICT(endpoint) DO UPDATE SET until_ms=MAX(until_ms,excluded.until_ms)").run(endpoint, until);
      recorded = true;
    } catch { /* A lock cannot suppress a successfully published marker. */ }
    if (!recorded) throw new Error("Bybit cooldown could not be shared; local dispatch remains blocked");
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
