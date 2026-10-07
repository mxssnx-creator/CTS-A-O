// In-memory SQLite (node:sqlite) for Core v2. One process-wide instance (HMR-safe via globalThis).
// Optional snapshot: VACUUM INTO a file on an interval, restored on boot (CTS_CORE_SNAPSHOT=path).
import { DatabaseSync, backup, type StatementSync } from "node:sqlite";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS symbols (sym TEXT PRIMARY KEY, last REAL, quote_vol REAL, change_pct REAL, bars INTEGER DEFAULT 0, first_t INTEGER, last_t INTEGER, at INTEGER);
CREATE TABLE IF NOT EXISTS candles (sym TEXT NOT NULL, t INTEGER NOT NULL, o REAL, h REAL, l REAL, c REAL, v REAL, PRIMARY KEY (sym, t)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY, stage INTEGER, bot TEXT, ind TEXT, tp REAL, sl REAL, trail REAL, hold INTEGER,
  n INTEGER, pf REAL, net REAL, wr REAL, mdd REAL, ddt REAL, gh REAL, tph REAL,
  is_n INTEGER, is_pf REAL, is_net REAL, score REAL, rank INTEGER, armed INTEGER DEFAULT 0,
  best_n INTEGER, oos_n INTEGER, oos_pf REAL, oos_net REAL, oos_ddt REAL, lastn_ok INTEGER, eval_pass REAL, eval_ok INTEGER,
  by_sym TEXT, at INTEGER);
CREATE INDEX IF NOT EXISTS results_stage ON results(stage, score DESC);
CREATE TABLE IF NOT EXISTS lastn (cfg TEXT NOT NULL, n INTEGER NOT NULL, part TEXT NOT NULL, taken INTEGER, pf REAL, net REAL, ddt REAL, score REAL, PRIMARY KEY (cfg, n, part)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS evals (id INTEGER PRIMARY KEY AUTOINCREMENT, cfg TEXT NOT NULL, at INTEGER NOT NULL, win TEXT NOT NULL, n INTEGER, pf REAL, net REAL, ddt REAL, wr REAL, pass INTEGER);
CREATE INDEX IF NOT EXISTS evals_cfg ON evals(cfg, at);
CREATE TABLE IF NOT EXISTS tapes (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, entry REAL, exit REAL, r REAL, reason TEXT, bars INTEGER, PRIMARY KEY (cfg, sym, side, entry_t)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS sim_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, start_t INTEGER, end_t INTEGER, n INTEGER, pf REAL, net REAL, gh REAL, tph REAL, ddt REAL, stable INTEGER, opts TEXT, blocks TEXT, hourly TEXT);
CREATE TABLE IF NOT EXISTS paper_trades (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, entry REAL, exit REAL, r REAL, pnl REAL, reason TEXT, first_at INTEGER, PRIMARY KEY (cfg, sym, side, entry_t)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS paper_book_trades (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, r REAL, vol REAL, reason TEXT, held_at INTEGER, at INTEGER, PRIMARY KEY (cfg, sym, side, entry_t)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS paper_book_trades_exit ON paper_book_trades (exit_t);
CREATE TABLE IF NOT EXISTS paper_positions (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER, entry REAL, stop REAL, target REAL, mtm REAL, at INTEGER, PRIMARY KEY (cfg, sym, side)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS live_orders (coid TEXT PRIMARY KEY, cfg TEXT, sym TEXT, side INTEGER, kind TEXT, qty REAL, px REAL, status TEXT, msg TEXT, at INTEGER);
CREATE INDEX IF NOT EXISTS live_orders_cfg_kind ON live_orders (cfg, kind);
CREATE TABLE IF NOT EXISTS live_fills (coid TEXT PRIMARY KEY, sym TEXT, side INTEGER, kind TEXT, qty REAL, ref_px REAL, fill_px REAL, fee REAL, at INTEGER);
CREATE TABLE IF NOT EXISTS live_lane_trades (id TEXT NOT NULL, exit_t INTEGER NOT NULL, cfg TEXT NOT NULL, sym TEXT, side INTEGER, entry_t INTEGER, entry REAL, exit REAL, r REAL, reason TEXT, PRIMARY KEY (id, exit_t)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS live_lane_trades_exit ON live_lane_trades (exit_t);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, level TEXT NOT NULL, msg TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, started INTEGER, ended INTEGER, items INTEGER, ms REAL, note TEXT);
`;

const TABLES = [
  "kv",
  "symbols",
  "candles",
  "results",
  "lastn",
  "evals",
  "tapes",
  "sim_runs",
  "paper_trades",
  "paper_book_trades",
  "paper_positions",
  "live_orders",
  "live_fills",
  "live_lane_trades",
  "events",
  "runs",
];

export class CoreDb {
  readonly db: DatabaseSync;
  private stmts = new Map<string, StatementSync>();
  /** JSON file holding the durable kv keys (settings, presets, backtests …) across restarts; null = memory only */
  private statePath: string | null = null;
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(path = ":memory:", opts: { statePath?: string | null } = {}) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode = MEMORY; PRAGMA synchronous = OFF; PRAGMA temp_store = MEMORY;",
    );
    this.db.exec(SCHEMA);
    if (opts.statePath) this.loadState(opts.statePath);
  }

  private loadState(path: string) {
    this.statePath = path;
    try {
      if (!existsSync(path)) return;
      const j = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      for (const [k, v] of Object.entries(j)) if (DURABLE_KEYS.has(k)) this.kvWrite(k, v);
    } catch (err) {
      console.warn(
        `[core-v2] state file ${path} not loaded: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** Debounced write of the durable keys; a read-only host disables it quietly. */
  private persistState() {
    if (!this.statePath || this.stateTimer) return;
    this.stateTimer = setTimeout(() => {
      this.stateTimer = null;
      this.flushState();
    }, 1000);
    (this.stateTimer as { unref?: () => void }).unref?.();
  }

  /** Write the durable keys now (shutdown: a pending debounced write would be lost). */
  flushState() {
    if (this.stateTimer) {
      clearTimeout(this.stateTimer);
      this.stateTimer = null;
    }
    {
      if (!this.statePath) return;
      try {
        const out: Record<string, unknown> = {};
        for (const k of DURABLE_KEYS) {
          const v = this.kvGet(k);
          if (v !== undefined) out[k] = v;
        }
        mkdirSync(dirname(this.statePath), { recursive: true });
        const tmp = `${this.statePath}.tmp`;
        writeFileSync(tmp, JSON.stringify(out));
        renameSync(tmp, this.statePath);
      } catch (err) {
        console.warn(
          `[core-v2] state file not writable (${err instanceof Error ? err.message : err}) — memory only`,
        );
        this.statePath = null;
      }
    }
  }
  prep(sql: string): StatementSync {
    let s = this.stmts.get(sql);
    if (!s) {
      s = this.db.prepare(sql);
      this.stmts.set(sql, s);
    }
    return s;
  }
  tx<T>(fn: () => T): T {
    this.db.exec("BEGIN");
    try {
      const r = fn();
      this.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  all<T = Record<string, unknown>>(sql: string, ...p: Array<string | number | null>): T[] {
    return this.prep(sql).all(...p) as T[];
  }
  get<T = Record<string, unknown>>(
    sql: string,
    ...p: Array<string | number | null>
  ): T | undefined {
    return this.prep(sql).get(...p) as T | undefined;
  }
  run(sql: string, ...p: Array<string | number | null>) {
    return this.prep(sql).run(...p);
  }
  /**
   * Journal of the writes a restart must not lose (the live ownership ledger): the database lives in memory and is
   * snapshotted every 10 min, so each such write is also appended to `<snapshot>.journal` (a small synchronous
   * append) and replayed after a restore. The journal rotates at each snapshot (`.prev` until the snapshot is
   * written) — replaying is idempotent (INSERT OR REPLACE with explicit values).
   */
  journalPath: string | null = null;
  runDurable(sql: string, ...p: Array<string | number | null>) {
    const r = this.run(sql, ...p);
    if (this.journalPath)
      try {
        appendFileSync(this.journalPath, `${JSON.stringify([sql, p])}\n`);
      } catch (err) {
        this.lastJournalError = err instanceof Error ? err.message : String(err);
      }
    return r;
  }
  lastJournalError = "";
  /** Re-apply the journal (the rotated one first) after a restore; returns the writes applied. */
  replayJournal(): number {
    if (!this.journalPath) return 0;
    let n = 0;
    for (const f of [`${this.journalPath}.prev`, this.journalPath]) {
      if (!existsSync(f)) continue;
      for (const line of readFileSync(f, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const [sql, p] = JSON.parse(line) as [string, Array<string | number | null>];
          this.run(sql, ...p);
          n++;
        } catch {
          /* a torn last line from a crash */
        }
      }
    }
    return n;
  }
  kvGet<T>(k: string): T | undefined {
    const r = this.get<{ v: string }>("SELECT v FROM kv WHERE k = ?", k);
    return r ? (JSON.parse(r.v) as T) : undefined;
  }
  kvSet(k: string, v: unknown) {
    this.kvWrite(k, v);
    if (DURABLE_KEYS.has(k)) this.persistState();
  }
  private kvWrite(k: string, v: unknown) {
    this.run(
      "INSERT INTO kv (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at",
      k,
      JSON.stringify(v),
      Date.now(),
    );
  }
  event(level: "info" | "warn" | "error", msg: string) {
    this.run(
      "INSERT INTO events (at, level, msg) VALUES (?, ?, ?)",
      Date.now(),
      level,
      msg.slice(0, 500),
    );
  }
  /** Row counts and page usage for the Engine page. */
  tableStats(): Array<{ table: string; rows: number }> {
    return TABLES.map((t) => ({
      table: t,
      rows: Number(this.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)?.n ?? 0),
    }));
  }
  bytes(): number {
    const pc = Number(this.get<{ page_count: number }>("PRAGMA page_count")?.page_count ?? 0);
    const ps = Number(this.get<{ page_size: number }>("PRAGMA page_size")?.page_size ?? 4096);
    return pc * ps;
  }
  trim() {
    this.run("DELETE FROM events WHERE id <= (SELECT MAX(id) - 3000 FROM events)");
    this.run("DELETE FROM evals WHERE id <= (SELECT MAX(id) - 20000 FROM evals)");
    this.run("DELETE FROM runs WHERE id <= (SELECT MAX(id) - 500 FROM runs)");
    this.run("DELETE FROM sim_runs WHERE id <= (SELECT MAX(id) - 200 FROM sim_runs)");
    // bounded history for tables that grow every cycle
    // control rows are the own-quantity ledger: never cut by age (a held position's open row must stay); per key
    // only the rows before its last flat marker go (the ledger restarts there), and only once a day old: the
    // recent ones are the desk's tracking ids (every own exchange order of the day is accounted for)
    this.run(
      "DELETE FROM live_orders WHERE cfg NOT LIKE 'control|%' AND at < (SELECT at FROM live_orders WHERE cfg NOT LIKE 'control|%' ORDER BY at DESC LIMIT 1 OFFSET 20000)",
    );
    this.run(
      "DELETE FROM live_orders WHERE cfg LIKE 'control|%' AND at < ? AND rowid < (SELECT MAX(f.rowid) FROM live_orders f WHERE f.cfg = live_orders.cfg AND f.kind = 'F')",
      Date.now() - 24 * 3_600_000,
    );
    this.run(
      "DELETE FROM live_lane_trades WHERE exit_t < (SELECT exit_t FROM live_lane_trades ORDER BY exit_t DESC LIMIT 1 OFFSET 50000)",
    );
    this.run(
      "DELETE FROM paper_trades WHERE exit_t < (SELECT exit_t FROM paper_trades ORDER BY exit_t DESC LIMIT 1 OFFSET 20000)",
    );
    this.run(
      "DELETE FROM paper_book_trades WHERE exit_t < (SELECT exit_t FROM paper_book_trades ORDER BY exit_t DESC LIMIT 1 OFFSET 50000)",
    );
  }
  /** Create empty shadow copies (same DDL) of tables, e.g. results → results_next. */
  shadowCreate(tables: readonly string[]) {
    for (const t of tables) {
      const m = new RegExp(
        `CREATE TABLE IF NOT EXISTS ${t} \\(([\\s\\S]*?)\\)( WITHOUT ROWID)?;`,
      ).exec(SCHEMA);
      if (!m) throw new Error(`no DDL for ${t}`);
      this.db.exec(
        `DROP TABLE IF EXISTS ${t}_next; CREATE TABLE ${t}_next (${m[1]})${m[2] ?? ""};`,
      );
    }
  }
  /** Atomically replace tables with their shadow copies (readers see old or new, never half). */
  shadowSwap(tables: readonly string[]) {
    this.tx(() => {
      for (const t of tables) {
        this.db.exec(`DROP TABLE ${t}; ALTER TABLE ${t}_next RENAME TO ${t};`);
      }
      this.db.exec(SCHEMA);
    });
    this.stmts.clear();
  }
  snapshot(path: string): boolean {
    try {
      mkdirSync(dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      // a leftover from an interrupted snapshot (and the .old copies older versions kept) is discarded
      for (const f of [tmp, `${tmp}.old`]) if (existsSync(f)) rmSync(f, { force: true });
      this.db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
      renameSync(tmp, path);
      // a synchronous copy holds every write so far: the journal starts over
      if (this.journalPath)
        for (const f of [this.journalPath, `${this.journalPath}.prev`]) if (existsSync(f)) rmSync(f, { force: true });
      return true;
    } catch (err) {
      // never silent: a snapshot that fails leaves the previous one in place, and the reason is on record
      this.lastSnapshotError = err instanceof Error ? err.message : String(err);
      try {
        this.event("error", `snapshot failed: ${this.lastSnapshotError}`);
      } catch {
        /* the event log failed too */
      }
      return false;
    }
  }
  lastSnapshotError = "";
  /**
   * The same snapshot without blocking the event loop: the online backup copies 100 pages per step and yields
   * between steps (VACUUM INTO is one statement: 75–250 ms of a frozen loop on a desk's database). The live tick
   * keeps running; a write during the copy restarts it from that page, as SQLite's backup does.
   */
  async snapshotAsync(path: string): Promise<boolean> {
    if (this.snapshotting) return false;
    this.snapshotting = true;
    const tmp = `${path}.tmp`;
    // the writes from here on go to a fresh journal; the rotated one stays until the snapshot holds its rows
    const jr = this.journalPath;
    if (jr && existsSync(jr) && !existsSync(`${jr}.prev`)) renameSync(jr, `${jr}.prev`);
    try {
      mkdirSync(dirname(path), { recursive: true });
      for (const f of [tmp, `${tmp}.old`]) if (existsSync(f)) rmSync(f, { force: true });
      await backup(this.db, tmp, { rate: 100 });
      renameSync(tmp, path);
      if (jr && existsSync(`${jr}.prev`)) rmSync(`${jr}.prev`, { force: true });
      return true;
    } catch (err) {
      this.lastSnapshotError = err instanceof Error ? err.message : String(err);
      try {
        this.event("error", `snapshot failed: ${this.lastSnapshotError}`);
      } catch {
        /* the event log failed too */
      }
      return false;
    } finally {
      this.snapshotting = false;
    }
  }
  private snapshotting = false;
  restore(path: string): boolean {
    if (!existsSync(path)) return false;
    try {
      this.db.exec(`ATTACH DATABASE '${path.replace(/'/g, "''")}' AS snap`);
      this.tx(() => {
        for (const t of TABLES) {
          const exists = this.get<{ n: number }>(
            "SELECT COUNT(*) AS n FROM snap.sqlite_master WHERE type='table' AND name = ?",
            t,
          );
          if (!exists?.n) continue;
          // the durable keys already loaded from the state file are newer than the snapshot (up to 10 min old):
          // the snapshot only fills the ones the state file lacks
          if (t === "kv")
            this.db
              .prepare(
                `INSERT OR REPLACE INTO main.kv SELECT * FROM snap.kv WHERE k NOT IN (SELECT value FROM json_each(?)) OR k NOT IN (SELECT k FROM main.kv)`,
              )
              .run(JSON.stringify([...DURABLE_KEYS]));
          else {
            // the columns both sides have: a snapshot from before a column was added still restores (the new
            // column stays empty) instead of failing the whole restore
            const cols = (db: string) =>
              this.db
                .prepare("SELECT name FROM pragma_table_info(?, ?)")
                .all(t, db)
                .map((r) => String((r as { name: string }).name));
            const have = new Set(cols("snap"));
            const common = cols("main").filter((c) => have.has(c));
            if (!common.length) continue;
            const list = common.map((c) => `"${c}"`).join(", ");
            this.db.exec(`INSERT OR REPLACE INTO main.${t} (${list}) SELECT ${list} FROM snap.${t}`);
          }
        }
      });
      this.db.exec("DETACH DATABASE snap");
      return true;
    } catch {
      try {
        this.db.exec("DETACH DATABASE snap");
      } catch {
        /* not attached */
      }
      return false;
    }
  }
}

const G = globalThis as unknown as { __ctsCoreDb?: CoreDb; __ctsConnDbs?: Map<string, CoreDb> };
/** kv keys that survive a restart (the market data and results are recomputed) */
const DURABLE_KEYS = new Set([
  "settings",
  "wf",
  "wfCapsV",
  "presets",
  "presetBacktests",
  "presetSeries",
  "activePreset",
  "liveModes",
  "controlStatus",
  "adjust",
  "liveCost",
  "liveLaneOpen",
  "hostSettingsApplied",
  "stopHits",
  "connsEnabled",
]);

export function coreDb(): CoreDb {
  // CTS_CORE_STATE=/path/state.json (default ./.cts-core/state.json); CTS_CORE_STATE=off keeps everything in memory
  const statePath = baseStatePath();
  if (!G.__ctsCoreDb) G.__ctsCoreDb = new CoreDb(":memory:", { statePath });
  else if (!upgraded) upgradeShared(G.__ctsCoreDb, statePath);
  upgraded = true;
  return G.__ctsCoreDb;
}

/** The base state file (CTS_CORE_STATE; null = memory only). */
export function baseStatePath(): string | null {
  const env = (process.env.CTS_CORE_STATE ?? "").trim();
  return env === "off" ? null : env || join(process.cwd(), ".cts-core", "state.json");
}

/** A connection's own file next to a base file: state.json → state.bingx-x01.json (null stays null). */
export function connPath(base: string | null | undefined, conn: string): string | null {
  if (!base) return null;
  return /\.[a-z]+$/i.test(base) ? base.replace(/(\.[a-z]+)$/i, `.${conn}$1`) : `${base}.${conn}`;
}

/**
 * The database of a connection that is not the primary one (the primary keeps coreDb() and its files, so an
 * existing install keeps its state). Each connection has its own tables, ledger and durable state file.
 */
export function connDb(conn: string): CoreDb {
  const map = (G.__ctsConnDbs ??= new Map());
  let db = map.get(conn);
  if (!db) {
    db = new CoreDb(":memory:", { statePath: connPath(baseStatePath(), conn) });
    map.set(conn, db);
  }
  return db;
}

let upgraded = false;
/**
 * A hot-reloaded server module finds the database created by an older module version: give it this version's
 * methods and create the tables added since (the schema is idempotent). Without this a new table is missing
 * until a restart and every cycle that touches it fails.
 */
export function upgradeShared(db: CoreDb, statePath: string | null = null) {
  if (Object.getPrototypeOf(db) !== CoreDb.prototype) Object.setPrototypeOf(db, CoreDb.prototype);
  // a database created before state persistence existed gets it now (without reloading: memory is newer)
  const d = db as unknown as { statePath?: string | null };
  if (!d.statePath && statePath) {
    d.statePath = statePath;
    db.flushState();
  }
  const raw = (db as unknown as { db?: DatabaseSync }).db;
  raw?.exec(SCHEMA);
  (db as unknown as { stmts?: Map<string, unknown> }).stmts?.clear();
}
