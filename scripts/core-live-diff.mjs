#!/usr/bin/env node
// CTS-A-O — live vs system from a desk's database snapshot (CTS_CORE_SNAPSHOT, e.g. runs/x01-live/core.sqlite): every
// own exchange lane next to the same position in the paper book's own record (paper_book_trades), per lane and per
// real position, per range, per hour, worst gaps (src/core/relation.ts, docs/execution-fidelity.md). Read-only.
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

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const file = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
if (!file) throw new Error("usage: core-live-diff.mjs <core.sqlite> [--hours N | --since ISO] [--tag T] [--out file.md] [--json]");
const hours = Number(arg("hours", 0));
const sinceArg = arg("since", "");
const since = sinceArg ? Date.parse(sinceArg) : hours > 0 ? Date.now() - hours * 3_600_000 : 0;
if (!Number.isFinite(since)) throw new Error(`--since ${sinceArg}: not a time`);
const cost = Number(arg("cost", 0.002));
const db = new DatabaseSync(file, { readOnly: true });
let rel;
try {
  const cols = new Set(db.prepare("SELECT name FROM pragma_table_info('paper_book_trades')").all().map((x) => String(x.name)));
  const ledger = db.prepare(RELATION_LEDGER_SQL).all(Math.max(0, since - RELATION_LEDGER_LOOKBACK_MS));
  // the paper positions still open (an exchange lane closed while its paper position runs: "system open")
  const openIds = () => db.prepare("SELECT cfg, sym, side, entry_t FROM paper_positions").all().map(laneIdOfRow);
  // the tag: given, else the own ids' prefix (the opens' client ids, up to and with the first "_")
  const tag = arg("tag", "") || (/^[^_]+_/.exec(String(ledger.find((x) => x.kind === "O")?.coid ?? ""))?.[0] ?? "");
  rel = relationOf({
    system: db.prepare(relationSystemSql(cols)).all(Math.max(0, since - RELATION_SYSTEM_SLACK_MS)),
    lanes: db.prepare(RELATION_LANES_SQL).all(since),
    trades: liveTrades(ledger, tag.length, cost),
    open: openIds(),
    from: since,
    to: Date.now(),
    coverageFrom: db.prepare(RELATION_COVERAGE_SQL).get()?.t ?? null,
  });
} finally {
  db.close();
}
const chk = relationCheck(rel);
const md = `${relationMd(rel)}\n\nCheck: ${chk.judged ? (chk.alarms.length ? chk.alarms.map((a) => `${a.kind}: ${a.msg}`).join("; ") : "ok") : `not judged (${chk.why})`}`;
const out = arg("out", "");
if (out) writeFileSync(out, `${md}\n`);
process.stdout.write(argv.includes("--json") ? `${JSON.stringify({ relation: rel, check: chk }, null, 2)}\n` : `${md}\n`);
