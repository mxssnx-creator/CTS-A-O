#!/usr/bin/env node
// Save and compare simulated trading sessions (see scripts/lib/sim-archive.mjs).
//
//   node scripts/sim-compare.mjs archive REPORT.json [--label NAME] [--dir docs/sim-results]
//       reduce a session report (core-session data.json, or an older docs/session-*.json) to a record and save it
//   node scripts/sim-compare.mjs compare A.json B.json [--out FILE.md]
//       difference of two reports or records: total, per strategy, per lane, hour by hour, engine counts, settings
//   node scripts/sim-compare.mjs list [--dir docs/sim-results]
//       the saved records, oldest first
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { archiveSession, compareRecords, renderComparison, summarize } from "./lib/sim-archive.mjs";

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const files = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[++i];
  else files.push(rest[i]);
}
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
/** A saved record as is; a raw report is reduced and named after its file. */
const record = (p) => {
  const j = read(p);
  return j.schema ? j : summarize(j, { label: basename(p, ".json"), source: p });
};
const dir = flags.dir ?? "docs/sim-results";

if (cmd === "archive" && files.length === 1) {
  const file = archiveSession(read(files[0]), { label: flags.label ?? "", dir, source: files[0] });
  console.log(`saved ${file}`);
} else if (cmd === "compare" && files.length === 2) {
  const text = renderComparison(compareRecords(record(files[0]), record(files[1])));
  if (flags.out) writeFileSync(flags.out, text);
  else process.stdout.write(text);
} else if (cmd === "list") {
  let index = [];
  try { index = read(`${dir}/index.json`); } catch { /* none saved yet */ }
  for (const e of index)
    console.log(`${e.file}  ${e.symbols} symbols  orders ${e.orders ?? "–"}  PF ${e.pf ?? "–"}  net ${e.net ?? "–"}  ${e.label}`);
  if (!index.length) console.log("no saved records");
} else {
  console.error("usage: sim-compare.mjs archive REPORT.json [--label N] | compare A.json B.json [--out F] | list");
  process.exit(2);
}
