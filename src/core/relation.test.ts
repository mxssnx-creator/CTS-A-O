// The system ↔ exchange relation (relation.ts, docs/execution-fidelity.md). 14 Oct: the desk reported a real PF of
// 0.20 against the system's 1.36 — the comparison read the trimmed paper_trades, counted the operator's manual closes
// as own and booked the 01:06 relaunch closes at stop prices never reached. One case per defect: R-a (every reader
// counts own closes only, and the source scan keeps it so), R-f (one window, coverage, per lane and per real position,
// one sign, a decomposition that sums exactly, the trim keeps the counterparts), R-g (the executable record), and the
// standing check (A7).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  OWN_CLOSE_SQL,
  RELATION_CHECK,
  RESTART_WINDOWS,
  closeClassOf,
  executableR,
  gapParts,
  isOwnClose,
  laneIdOfRow,
  relationCheck,
  relationLine,
  relationMd,
  relationOf,
  relationWarnsDue,
  type RelLaneRow,
  type RelSystemRow,
} from "./relation.ts";
import { RESTART_WINDOWS as BOT_RESTART_WINDOWS, botStatsFromRows, type LaneRow } from "./bot-stats.ts";
import { buildStatistics, liveTrades } from "./statistics.ts";
import { sideAcceptKey } from "./signals.ts";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { DEFAULT_SETTINGS } from "./config.ts";

const H = 3_600_000;
const T0 = 1_791_900_000_000; // 13 Oct 2026, after the restart window
const RESTART_T = RESTART_WINDOWS[0].from + 500;
const SIG = "follow|sig-ema-cross-s@m15|tp1|sl2|tr0|h192";
const ENG = "follow|rsi-mom-14-25@m15c|tp1.3|sl3.9|tr0|h96|sh";

/** a live_lane_trades row (the paper position cfg|sym|side|entryT; the exchange joined it a minute later) */
function laneRow(cfg: string, i: number, r: number, reason: string, exitT = T0 + i * H, side = 1): RelLaneRow & LaneRow {
  const sym = `S${i % 7}-USDT`;
  const entryT = exitT - 2 * H;
  return {
    id: `${cfg}|${sym}|${side}|${entryT}`,
    cfg,
    sym,
    side,
    entry_t: entryT + 60_000,
    entry: 100,
    exit: 100 * (1 + side * (r + 0.002)),
    exit_t: exitT,
    r,
    reason,
  };
}
const insLane = (db: CoreDb, x: RelLaneRow) =>
  db.run(
    "INSERT INTO live_lane_trades (id, exit_t, cfg, sym, side, entry_t, entry, exit, r, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    x.id, x.exit_t, x.cfg, x.sym, x.side, x.entry_t ?? null, x.entry, x.exit, x.r, x.reason,
  );

/** own closes of every own kind, and beside them the rows that are not the desk's */
const OWN = [
  ...[0.02, -0.01, 0.015, -0.005, 0.01].map((r, i) => laneRow(SIG, i, r, ["exit", "stop", "target", "liq", "exit"][i])),
  ...[0.01, 0.012, -0.004].map((r, i) => laneRow(ENG, 10 + i, r, "exit")),
];
const NOT_OWN = [
  // the operator's manual close (a big loss that is not the desk's), an unverified stop, the 01:06 relaunch's stops
  laneRow(SIG, 20, -0.3, "hand"),
  laneRow(ENG, 21, -0.2, "hand"),
  laneRow(SIG, 22, -0.1, "unverified"),
  laneRow(SIG, 23, -0.5, "stop", RESTART_T),
  laneRow(ENG, 24, -0.6, "stop", RESTART_T + 100),
];

describe("relation: one predicate for an own exchange close (R-a)", () => {
  it("own = exit, stop, target, liq; not hand, unverified, the restart window's stops; SQL and JS agree", () => {
    assert.equal(isOwnClose({ reason: "exit", exit_t: T0 }), true);
    assert.equal(isOwnClose({ reason: "stop", exitT: T0 }), true);
    assert.equal(isOwnClose({ reason: "target", exit_t: T0 }), true);
    assert.equal(isOwnClose({ reason: "liq", exit_t: T0 }), true, "a liquidation of own quantity is an own loss");
    assert.equal(isOwnClose({ reason: "hand", exit_t: T0 }), false);
    assert.equal(isOwnClose({ reason: "unverified", exit_t: T0 }), false);
    assert.equal(closeClassOf({ reason: "stop", exit_t: RESTART_T }), "restart");
    // only the restart window's stops: an own exit at that second is still own
    assert.equal(isOwnClose({ reason: "exit", exit_t: RESTART_T }), true);
    assert.equal(closeClassOf({ reason: "tp", exit_t: T0 }), "other", "a simulated row is not an exchange close");
    assert.equal(BOT_RESTART_WINDOWS, RESTART_WINDOWS, "bot-stats re-exports the one list");
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE live_lane_trades (id TEXT, exit_t INTEGER, reason TEXT)");
    const rows = [...OWN, ...NOT_OWN, laneRow(SIG, 30, 0, "exit", RESTART_T)];
    for (const x of rows) db.prepare("INSERT INTO live_lane_trades VALUES (?, ?, ?)").run(x.id, x.exit_t, x.reason);
    const sql = db
      .prepare(`SELECT id, exit_t FROM live_lane_trades WHERE ${OWN_CLOSE_SQL}`)
      .all()
      .map((x) => `${x.id}@${x.exit_t}`)
      .sort();
    assert.deepEqual(sql, rows.filter((x) => isOwnClose(x)).map((x) => `${x.id}@${x.exit_t}`).sort());
    assert.equal(sql.length, OWN.length + 1);
  });

  it("every runtime reader (live record, acceptance, engine proof, auto-adjust) equals its own-rows-only result", () => {
    const mk = (rows: readonly RelLaneRow[]) => {
      const db = new CoreDb(":memory:");
      for (const x of rows) insLane(db, x);
      const rt = new CoreRuntime(db, { live: { ...DEFAULT_SETTINGS.live, engineProofN: 3 } } as never, {
        market: "synthetic",
      });
      return rt;
    };
    const all = mk([...OWN, ...NOT_OWN]);
    const own = mk(OWN);
    const view = (rt: CoreRuntime) => ({
      records: [...rt.exchangeRecords(0)].map(([k, v]) => [k, JSON.stringify(v)]).sort(),
      accept: [1, -1].map((s) => rt.exchangeAccept().stats(sideAcceptKey(s), T0 + 100 * H, 1_000)),
      proof: (() => {
        const p = rt.engineProof(T0 + 100 * H);
        return p && { proven: [...p.proven].sort(), judged: p.judged };
      })(),
      adjust: rt.adjustExchangeTrades(),
    });
    const a = view(all);
    const b = view(own);
    assert.deepEqual(a, b);
    // and the own rows are really there: the readers are not empty
    assert.ok(a.records.length > 0 && a.accept[0].n > 0 && a.adjust.length === OWN.length);
    assert.deepEqual(a.proof, { proven: [ENG], judged: 1 }, "ENG's own closes PF 5.5: proven (its manual −0.2 is not its own)");
  });

  it("botStatsFromRows: hand / unverified / restart counted apart, the families equal the own rows'", () => {
    const a = botStatsFromRows([...OWN, ...NOT_OWN]);
    const b = botStatsFromRows(OWN);
    assert.equal(a.hand, 2);
    assert.equal(a.unverified, 1);
    assert.equal(a.restart, 2);
    assert.equal(a.rows, OWN.length + NOT_OWN.length);
    const strip = (fs: typeof a.families) => fs.map(({ raw: _r, restart: _s, hand: _h, unverified: _u, ...x }) => x);
    assert.deepEqual(strip(a.families), strip(b.families));
    const sig = a.families.find((f) => f.trades === 5)!;
    assert.deepEqual([sig.hand, sig.unverified, sig.restart, sig.raw], [1, 1, 1, 8]);
  });

  it("statistics.liveTrades: a position an order not ours closed is 'hand' — in the balance, in no PF", () => {
    const T = T0;
    const rows = [
      { coid: "CTSX01S_Qa1", sym: "SOL-USDT", side: 1, kind: "O", qty: 1, px: 100, status: "ok", msg: null, at: T, fillPx: 100, fee: 0.05 },
      { coid: "CTSX01S_Ca2", sym: "SOL-USDT", side: 1, kind: "X", qty: 1, px: 103, status: "ok", msg: null, at: T + H, fillPx: 103, fee: 0.05 },
      { coid: "CTSX01S_Qa3", sym: "ETH-USDT", side: -1, kind: "O", qty: 1, px: 2000, status: "ok", msg: null, at: T + 2 * H, fillPx: 2000, fee: 0.5 },
      { coid: "flat-x", sym: "ETH-USDT", side: -1, kind: "F", qty: 0, px: 2100, status: "ok", msg: "flat on the exchange (hand 2100)", at: T + 3 * H },
    ];
    const xs = liveTrades(rows, "CTSX01S_".length);
    assert.deepEqual(xs.map((x) => x.reason), ["close", "hand"]);
    const st = buildStatistics({
      source: "live",
      trades: xs,
      startT: T - 1,
      endT: T + 4 * H,
      balance: 1_000,
      unit: (x) => (x as { notional?: number }).notional ?? 0,
      price: () => null,
      cost: 0.002,
      leverage: 1,
      minActiveLevel: 0,
    });
    assert.equal(st.total.n, 1, "the manual close is not a result of the desk");
    assert.equal(st.hand.n, 1);
    assert.ok(st.hand.usd < -99, "its money is real (−100 − fees)");
  });

  it("source scan: every SQL read of live_lane_trades uses OWN_CLOSE_SQL / isOwnClose or says why it reads all rows", () => {
    const root = join(import.meta.dirname, "..", "..");
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        if (f === "node_modules" || f.startsWith(".")) continue;
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|mjs|js|cjs)$/.test(f)) files.push(p);
      }
    };
    walk(join(root, "src"));
    walk(join(root, "scripts"));
    const bad: string[] = [];
    let hits = 0;
    for (const p of files) {
      // this file's own fixtures
      if (p.endsWith("relation.test.ts")) continue;
      const lines = readFileSync(p, "utf8").split("\n");
      lines.forEach((l, i) => {
        if (!/\b(FROM|JOIN)\s+live_lane_trades\b/i.test(l) || /^\s*(\/\/|\*|\/\*)/.test(l)) return;
        hits++;
        const near = lines.slice(Math.max(0, i - 8), i + 4).join("\n");
        if (!/OWN_CLOSE_SQL|isOwnClose|closeClassOf|relation: all rows — \S/.test(near)) bad.push(`${p.slice(root.length + 1)}:${i + 1}`);
      });
    }
    assert.ok(hits >= 8, `the scan sees the readers (${hits})`);
    assert.deepEqual(bad, [], "a live_lane_trades reader without the own-close predicate (relation.ts)");
  });
});

// ── relationOf ────────────────────────────────────────────────

/** a system close of the lane's paper position, its prices known (single leg) */
function sysOf(l: RelLaneRow, r: number, o: Partial<RelSystemRow> = {}): RelSystemRow {
  const [cfg, sym, side, entryT] = [l.cfg, l.sym, l.side, Number(l.id.slice(l.id.lastIndexOf("|") + 1))];
  return {
    cfg,
    sym,
    side,
    entry_t: entryT,
    exit_t: l.exit_t - 60_000,
    r,
    vol: 1,
    reason: "tp",
    held_at: entryT + 35 * 60_000,
    entry: 100,
    // the exit the system r implies at the model cost 0.002
    exit: 100 * (1 + side * (r + 0.002)),
    ...o,
  };
}

describe("relationOf: one window, own lanes against the paper book's own record (R-f)", () => {
  it("coverage, matched / exchange only / system open / dropped / system only, hand excluded, sign", () => {
    const cov = T0 + 2 * H;
    const before = laneRow(SIG, 0, 0.01, "exit", T0 + H); // before the paper book's record starts
    const m1 = laneRow(SIG, 1, -0.01, "exit", T0 + 3 * H);
    const m2 = laneRow(SIG, 2, 0.02, "stop", T0 + 4 * H);
    const eo = laneRow(SIG, 3, 0.005, "exit", T0 + 5 * H);
    const so = laneRow(SIG, 4, 0.005, "exit", T0 + 6 * H);
    const sd = laneRow(SIG, 5, 0.005, "exit", T0 + 7 * H);
    const hand = laneRow(SIG, 6, -0.4, "hand", T0 + 8 * H);
    const blk = { ...laneRow(SIG, 1, -0.012, "exit", T0 + 3 * H), id: `${m1.id}|blk:a` };
    const lanes = [before, m1, m2, eo, so, sd, hand, blk];
    const unheld = { ...sysOf(laneRow(ENG, 9, 0, "exit", T0 + 9 * H), 0.01), sym: "Z-USDT" };
    const system = [
      { ...sysOf(before, 0.01), exit_t: cov },
      sysOf(m1, 0.01),
      sysOf(m2, 0.01),
      { ...sysOf(sd, 0.0), reason: "dropped" },
      sysOf(hand, 0.02),
      unheld,
    ];
    const rel = relationOf({ system, lanes, open: [laneIdOfRow(sysOf(so, 0))], from: T0, to: T0 + 10 * H });
    assert.equal(rel.from, cov, "the window starts where the paper book's record does");
    assert.deepEqual(rel.counts, {
      rows: 8,
      own: 6,
      matched: 3,
      exchangeOnly: 1,
      systemOpen: 1,
      systemDropped: 1,
      outsideCoverage: 1,
      systemOnly: 1,
      excluded: { hand: 1, unverified: 0, restart: 0, other: 0 },
    });
    // the manual −40 % never reaches a PF; the exchange did worse on m1 (−1 % vs +1 %): a negative gap
    assert.ok(Math.abs(rel.total.exchange.net - (-1 + 2 - 1.2)) < 1e-9);
    assert.ok(Math.abs(rel.total.system.net - 3) < 1e-9);
    assert.ok(Math.abs(rel.total.gap.total - (rel.total.exchange.net - rel.total.system.net)) < 1e-9);
    assert.ok(rel.total.gap.total < 0, "gap = exchange − system: negative, the exchange did worse");
    assert.equal(rel.worst[0].id, blk.id, "the Block leg is matched on its lane's paper position");
    assert.equal(rel.byRange.find((g) => g.key === "Signals")!.matched, 3);
    assert.match(relationMd(rel), /gap = exchange − system/);
  });

  it("the gap's parts sum exactly to exchange − system, per lane and per group (property)", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const lanes: RelLaneRow[] = [];
    const system: RelSystemRow[] = [];
    for (let i = 0; i < 300; i++) {
      const side = rnd() < 0.5 ? 1 : -1;
      const l = laneRow(SIG, i, (rnd() - 0.5) * 0.1, "exit", T0 + i * 60_000, side);
      l.entry = 100 * (1 + (rnd() - 0.5) * 0.06);
      l.exit = 100 * (1 + (rnd() - 0.5) * 0.2);
      const s = sysOf(l, (rnd() - 0.5) * 0.1, {
        entry: 100 * (1 + (rnd() - 0.5) * 0.06),
        exit: 100 * (1 + (rnd() - 0.5) * 0.2),
        // a third without an adoption price, a tenth a ladder (undecomposed)
        held_px: i % 3 ? 100 * (1 + (rnd() - 0.5) * 0.06) : null,
        vol: i % 10 ? 1 : 2,
      });
      lanes.push(l);
      system.push(s);
      const p = gapParts(l, s);
      if (s.vol !== 1) assert.equal(p, null);
      else {
        const sum = (p!.entryAdoption ?? 0) + p!.entryJoin + p!.exit + p!.fees;
        assert.ok(Math.abs(sum - (l.r - s.r!)) < 1e-12, `lane ${i}: ${sum} vs ${l.r - s.r!}`);
      }
    }
    const rel = relationOf({ system, lanes, from: 0, to: Infinity, coverageFrom: 0 });
    const g = rel.total.gap;
    assert.equal(rel.total.matched, 300);
    assert.equal(g.decomposed, 270);
    assert.ok(Math.abs(g.entryAdoption + g.entryJoin + g.exit + g.fees + g.undecomposed - g.total) < 1e-9);
    assert.ok(Math.abs(g.total - (rel.total.exchange.net - rel.total.system.net)) < 1e-9);
  });

  it("per real position (own fills, USD) beside per lane; a position an order not ours ended is left out", () => {
    const T = T0;
    const ledger = [
      { coid: "CTSX01S_Qa1", sym: "S1-USDT", side: 1, kind: "O", qty: 1, px: 100, status: "ok", msg: null, at: T, fillPx: 100, fee: 0.05 },
      { coid: "CTSX01S_Ca2", sym: "S1-USDT", side: 1, kind: "X", qty: 1, px: 102, status: "ok", msg: null, at: T + 3 * H, fillPx: 102, fee: 0.05 },
      { coid: "CTSX01S_Qa3", sym: "S2-USDT", side: 1, kind: "O", qty: 1, px: 100, status: "ok", msg: null, at: T, fillPx: 100, fee: 0.05 },
      { coid: "flat-1", sym: "S2-USDT", side: 1, kind: "F", qty: 0, px: 90, status: "ok", msg: "flat on the exchange (hand 90)", at: T + 3 * H },
    ];
    const l1 = laneRow(SIG, 1, 0.019, "exit", T + 3 * H);
    const rel = relationOf({
      system: [sysOf(l1, 0.01)],
      lanes: [l1],
      trades: liveTrades(ledger, "CTSX01S_".length),
      from: T - 1,
      to: T + 4 * H,
      coverageFrom: 0,
    });
    const pos = rel.positions!;
    assert.equal(pos.n, 1);
    assert.ok(Math.abs(pos.usd - (2 - 0.1)) < 1e-9);
    assert.equal(pos.hand.n, 1);
    // its money (−10 − the opening fee − the exit's model fee share: the venue's exit reports no commission), apart
    assert.ok(Math.abs(pos.hand.usd - (-10 - 0.05 - 0.09)) < 1e-9, "its money, counted apart");
    assert.equal(pos.list[0].lanes, 1);
    assert.ok(Math.abs(pos.list[0].systemMeanR! - 1) < 1e-9);
  });

  it("db.trim keeps every paper book close an exchange lane has (and a Block leg's), trims the rest", () => {
    const db = new CoreDb(":memory:");
    const N = 50_000 + 6;
    db.tx(() => {
      for (let i = 0; i < N; i++)
        db.run(
          "INSERT INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          SIG, "S1-USDT", i % 2 ? 1 : -1, i, 1_000 + i, 0.01, 1, "tp", i, i,
        );
    });
    const keep = [0, 3];
    insLane(db, { ...laneRow(SIG, 0, 0.01, "exit"), id: `${SIG}|S1-USDT|-1|0`, sym: "S1-USDT", side: -1 });
    insLane(db, { ...laneRow(SIG, 0, 0.01, "hand"), id: `${SIG}|S1-USDT|1|3|blk:a`, sym: "S1-USDT", side: 1 });
    db.trim();
    const left = db.all<{ entry_t: number }>("SELECT entry_t FROM paper_book_trades WHERE entry_t < 6 ORDER BY entry_t").map((x) => x.entry_t);
    assert.deepEqual(left, [...keep, 5].sort((a, b) => a - b), "the oldest rows go, the lanes' counterparts stay");
  });
});

// ── the executable record (R-g) ────────────────────────────────

describe("the executable system record (R-g)", () => {
  it("executableR: the same exit and cost, entered at the book's adoption price; null for ladders / no price", () => {
    // long: sim entry 100, exit 103, r 0.028 (cost 0.002); adopted at 101 → 103/101 − 1 − 0.002
    const rx = executableR({ side: 1, r: 0.028, vol: 1, held_px: 101, entry: 100, exit: 103 })!;
    assert.ok(Math.abs(rx - (103 / 101 - 1 - 0.002)) < 1e-12);
    const sx = executableR({ side: -1, r: 0.028, vol: 1, held_px: 99, entry: 100, exit: 97 })!;
    assert.ok(Math.abs(sx - (-(97 / 99 - 1) - 0.002)) < 1e-12);
    assert.equal(executableR({ side: 1, r: 0.03, vol: 2, held_px: 101, entry: 100, exit: 103 }), null);
    assert.equal(executableR({ side: 1, r: 0.03, vol: 1, held_px: null, entry: 100, exit: 103 }), null);
  });

  it("heldPxOf: a fresh ticker, else the last bar's close; the schema and an older database carry the new columns", () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, {} as never, { market: "synthetic" });
    const R = rt as unknown as { tickers: Array<{ sym: string; last: number }>; tickersAt: number; stream: unknown };
    R.stream = null;
    R.tickers = [{ sym: "S1-USDT", last: 12.5 }];
    R.tickersAt = Date.now();
    assert.equal(rt.heldPxOf("S1-USDT"), 12.5);
    R.tickersAt = Date.now() - 31_000;
    assert.equal(rt.heldPxOf("S1-USDT"), rt.candles.get("S1-USDT")?.lastC(), "a stale ticker is not used");
    const cols = db.all<{ name: string }>("SELECT name FROM pragma_table_info('paper_book_trades')").map((x) => x.name);
    for (const c of ["held_px", "entry", "exit"]) assert.ok(cols.includes(c), c);
    // a database file from before the columns: opened, it gains them
    const dir = mkdtempSync(join(tmpdir(), "relation-"));
    try {
      const f = join(dir, "old.sqlite");
      const old = new DatabaseSync(f);
      old.exec(
        "CREATE TABLE paper_book_trades (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, r REAL, vol REAL, reason TEXT, held_at INTEGER, at INTEGER, PRIMARY KEY (cfg, sym, side, entry_t)) WITHOUT ROWID",
      );
      old.close();
      const up = new CoreDb(f);
      const c2 = up.all<{ name: string }>("SELECT name FROM pragma_table_info('paper_book_trades')").map((x) => x.name);
      assert.ok(["held_px", "entry", "exit"].every((c) => c2.includes(c)));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the golden digest drops heldPx (a wall-clock price, like heldAt): golden stays byte-identical", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "..", "scripts", "core-golden.mjs"), "utf8");
    const drop = /const DROP = new Set\(\[([^\]]*)\]\)/.exec(src)?.[1] ?? "";
    assert.match(drop, /"heldAt"/);
    assert.match(drop, /"heldPx"/);
  });
});

// ── the standing check (A7) ───────────────────────────────────

describe("relationCheck: the standing guard (alarm only)", () => {
  /** n matched signal lanes over `events` events, exchange r and system r per lane */
  function relWith(n: number, rex: (i: number) => number, rsys: (i: number) => number, extra: RelLaneRow[] = []) {
    const lanes: RelLaneRow[] = [];
    const system: RelSystemRow[] = [];
    for (let i = 0; i < n; i++) {
      const l = laneRow(SIG, i, rex(i), "exit", T0 + i * 60_000);
      lanes.push(l);
      system.push(sysOf(l, rsys(i), { held_px: null }));
    }
    return relationOf({ system, lanes: [...lanes, ...extra], from: 0, to: Infinity, coverageFrom: 0 });
  }

  it("not judged below 20 matched lanes / 3 events; in line → no alarm", () => {
    const few = relationCheck(relWith(10, () => -0.01, () => 0.01));
    assert.equal(few.judged, false);
    assert.deepEqual(few.alarms, []);
    const ok = relationCheck(relWith(30, (i) => (i % 3 ? 0.01 : -0.01), (i) => (i % 3 ? 0.01 : -0.01)));
    assert.equal(ok.judged, true);
    assert.equal(ok.basis, "at join");
    assert.deepEqual(ok.alarms, []);
  });

  it("PF ratio out of 0.67–1.5, unmatched + unverified > 20 %, per position vs per lane about PF 1: each its alarm", () => {
    const bad = relationCheck(relWith(30, (i) => (i % 3 ? 0.005 : -0.02), (i) => (i % 3 ? 0.01 : -0.01)));
    assert.deepEqual(bad.alarms.map((a) => a.kind), ["pf-ratio"]);
    const unv = Array.from({ length: 10 }, (_, i) => laneRow(SIG, 100 + i, -0.01, "unverified", T0 + (100 + i) * 60_000));
    const um = relationCheck(relWith(30, () => 0.01, () => 0.01, unv));
    assert.ok(um.alarms.some((a) => a.kind === "unmatched"));
    const rel = relWith(30, () => 0.01, () => 0.01);
    rel.positions = { n: 2, pf: 0.5, usd: -1, hand: { n: 0, usd: 0 }, list: [] };
    assert.ok(relationCheck(rel).alarms.some((a) => a.kind === "unit-disagree"));
    assert.match(relationLine(rel, relationCheck(rel)), /ALARM unit-disagree/);
  });

  it("a warn event at most once an hour per alarm kind", () => {
    const last = new Map<string, number>();
    const a = [{ kind: "pf-ratio" as const, msg: "x" }];
    assert.equal(relationWarnsDue(a, last, T0).length, 1);
    assert.equal(relationWarnsDue(a, last, T0 + RELATION_CHECK.warnEveryMs - 1).length, 0);
    assert.equal(relationWarnsDue([...a, { kind: "unmatched", msg: "y" }], last, T0 + 10).length, 1);
    assert.equal(relationWarnsDue(a, last, T0 + RELATION_CHECK.warnEveryMs).length, 1);
  });
});
