#!/usr/bin/env node
// CTS-A-O — live vs system from a desk's database snapshot (CTS_CORE_SNAPSHOT, e.g. runs/x01-live/core.sqlite): every
// order as the exchange executed it next to the same order in the paper book, per range, per hour, worst gaps.
//
//   node --experimental-strip-types scripts/core-live-diff.mjs runs/x01-live/core.sqlite [--hours 6] [--out file.md]
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { liveDiff, liveDiffMd } from "../src/core/live-diff.ts";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const file = argv.find((a) => !a.startsWith("--") && !/^\d/.test(a));
if (!file) throw new Error("usage: core-live-diff.mjs <core.sqlite> [--hours N] [--out file.md]");
const hours = Number(arg("hours", 0));
const since = hours > 0 ? Date.now() - hours * 3_600_000 : 0;
const db = new DatabaseSync(file, { readOnly: true });
const d = liveDiff(
  db
    .prepare("SELECT cfg, sym, entry_t, exit_t, r FROM paper_trades WHERE exit_t IS NOT NULL")
    .all()
    .map((x) => ({ cfg: x.cfg, sym: x.sym, entryT: x.entry_t, exitT: x.exit_t, r: x.r })),
  db
    .prepare("SELECT id, cfg, sym, exit_t, r, reason FROM live_lane_trades")
    .all()
    .map((x) => ({ id: x.id, cfg: x.cfg, sym: x.sym, exitT: x.exit_t, r: x.r, reason: x.reason })),
  since,
);
const md = liveDiffMd(d);
const out = arg("out", "");
if (out) writeFileSync(out, `${md}\n`);
process.stdout.write(`${md}\n`);
