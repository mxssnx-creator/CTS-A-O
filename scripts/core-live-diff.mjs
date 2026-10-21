#!/usr/bin/env node
// CTS-A-O — live vs system from a desk's database snapshot (CTS_CORE_SNAPSHOT, e.g. runs/x01-live/core.sqlite): every
// own exchange lane next to the same position in the paper book's own record (paper_book_trades), per lane and per
// real position, per range, per hour, worst gaps (src/core/relation.ts, docs/execution-fidelity.md). Read-only.
// The per-lane side is a normalized attributed return (not account cash PF); the per-position side is USD from own fills.
//
//   node --experimental-strip-types scripts/core-live-diff.mjs runs/x01-live/core.sqlite [--hours 6 | --since ISO]
//     [--tag CTSX01S_] [--cost 0.002] [--out file.md] [--json]
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  RELATION_COVERAGE_SQL,
  RELATION_LANES_SQL,
  RELATION_LEDGER_LOOKBACK_MS,
  RELATION_LEDGER_SQL,
  RELATION_SYSTEM_SLACK_MS,
  laneIdOfRow,
  relationCheck,
  relationMd,
  relationOf,
  relationSystemSql,
} from "../src/core/relation.ts";
import { liveTrades } from "../src/core/statistics.ts";
import { liveDiff, liveDiffMd } from "../src/core/live-diff.ts";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const file = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
if (!file) throw new Error("usage: core-live-diff.mjs <core.sqlite> [--hours N | --since ISO] [--tag T] [--out file.md] [--json]");
const hours = Number(arg("hours", 0));
if (!Number.isFinite(hours) || hours < 0) throw new Error("--hours must be a finite nonnegative number");
const sinceArg = arg("since", "");
const since = sinceArg ? Date.parse(sinceArg) : hours > 0 ? Date.now() - hours * 3_600_000 : 0;
if (!Number.isFinite(since)) throw new Error(`--since ${sinceArg}: not a time`);
const cost = Number(arg("cost", 0.002));
const db = new DatabaseSync(file, { readOnly: true });
let rel, legacy;
try {
  const cols = new Set(db.prepare("SELECT name FROM pragma_table_info('paper_book_trades')").all().map((x) => String(x.name)));
  if (!cols.size) {
    // Older snapshots carry virtual paper history and attributed lane returns, not funded book/fill evidence.
    // Preserve that diagnostic format and its unknown unit returns; never promote it into the modern relation.
    const paperCols = new Set(db.prepare("PRAGMA table_info(paper_trades)").all().map((x) => x.name));
    const laneCols = new Set(db.prepare("PRAGMA table_info(live_lane_trades)").all().map((x) => x.name));
    const system = paperCols.size ? db.prepare(`SELECT cfg, sym, side, entry_t, exit_t, ${paperCols.has("unit_r") ? "unit_r" : "NULL"} AS r FROM paper_trades WHERE exit_t IS NOT NULL`).all() : [];
    const lanes = laneCols.size ? db.prepare(`SELECT id, cfg, sym, exit_t, r, ${laneCols.has("reason") ? "reason" : "'unverified' AS reason"} FROM live_lane_trades`).all() : [];
    legacy = liveDiff(system.map((x) => ({ cfg: x.cfg, sym: x.sym, side: x.side, entryT: x.entry_t, exitT: x.exit_t, r: x.r })),
      lanes.map((x) => ({ id: x.id, cfg: x.cfg, sym: x.sym, exitT: x.exit_t, r: x.r, reason: x.reason })), since);
  } else {
    const hasLedger = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('live_orders','live_fills')").get().n === 2;
    const ledger = hasLedger ? db.prepare(RELATION_LEDGER_SQL).all(Math.max(0, since - RELATION_LEDGER_LOOKBACK_MS)) : undefined;
    // the paper positions still open (an exchange lane closed while its paper position runs: "system open")
    const openIds = () => db.prepare("SELECT cfg, sym, side, entry_t FROM paper_positions").all().map(laneIdOfRow);
    // the tag: given, else the own ids' prefix (the opens' client ids, up to and with the first "_")
    const tag = arg("tag", "") || (/^[^_]+_/.exec(String(ledger?.find((x) => x.kind === "O")?.coid ?? ""))?.[0] ?? "");
    rel = relationOf({
      system: db.prepare(relationSystemSql(cols)).all(Math.max(0, since - RELATION_SYSTEM_SLACK_MS)),
      lanes: db.prepare(RELATION_LANES_SQL).all(since),
      trades: ledger ? liveTrades(ledger, tag.length, cost) : undefined,
      open: openIds(),
      from: since,
      to: Date.now(),
      coverageFrom: db.prepare(RELATION_COVERAGE_SQL).get()?.t ?? null,
    });
  }
} finally {
  db.close();
}
const chk = rel ? relationCheck(rel) : { judged: false, why: "legacy attributed-return diagnostic; no funded book/fill comparison" };
const md = rel ? `${relationMd(rel)}\n\nCheck: ${chk.judged ? (chk.alarms.length ? chk.alarms.map((a) => `${a.kind}: ${a.msg}`).join("; ") : "ok") : `not judged (${chk.why})`}` : `Legacy snapshot diagnostic — virtual/attributed records; no funded execution proof.\n\n${liveDiffMd(legacy)}\n\nCheck: not judged (${chk.why})`;
const out = arg("out", "");
if (out) writeFileSync(out, `${md}\n`);
process.stdout.write(argv.includes("--json") ? `${JSON.stringify({ ...(rel ? { relation: rel } : { legacy }), check: chk }, null, 2)}\n` : `${md}\n`);
