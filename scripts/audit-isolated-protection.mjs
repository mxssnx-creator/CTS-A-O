#!/usr/bin/env node
// Audit recorded isolated model closes, not funded paper, native trailing or venue fills.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseConfigId } from "../src/core/pipeline/pipeline.ts";

const root = resolve(process.argv[2] ?? ".."), reports = [];
for (const range of ["mc", "mn", "sh"]) for (const hold of [15, 30, 60]) {
  const dir = `${root}/cts-hold-research-v2-${range}-${hold}-20261028`;
  const protocol = JSON.parse(readFileSync(`${dir}/protocol.json`, "utf8"));
  if (protocol.range !== range || protocol.holdMinutes !== hold || !Number.isFinite(protocol.cost))
    throw new Error(`incorrect protocol ${dir}`);
  const rows = readFileSync(`${dir}/history-84-postbase-entries.jsonl`, "utf8").split("\n").filter(Boolean).map(JSON.parse);
  const result = { range, hold, entries: rows.length, closed: 0, invalid: 0, returnMismatches: 0,
    priceMismatches: 0, overHold: 0, timeMismatches: 0, reasons: {} };
  for (const row of rows) {
    if (!row.closed) continue;
    result.closed++;
    const t = row.trade, p = parseConfigId(t.cfg)?.protect;
    if (!p || (t.side !== 1 && t.side !== -1) ||
        ![t.entry, t.exit, t.r, t.entryT, t.exitT].every(Number.isFinite) || !(t.entry > 0 && t.exit > 0)) {
      result.invalid++; continue;
    }
    const duration = (t.exitT - t.entryT) / 60_000;
    result.reasons[t.reason] = (result.reasons[t.reason] ?? 0) + 1;
    if (Math.abs(t.r - (t.side * (t.exit / t.entry - 1) - protocol.cost)) > 1e-11) result.returnMismatches++;
    if (duration < 0 || duration > hold + 1e-9) result.overHold++;
    if (t.reason === "time" && Math.abs(duration - hold) > 1e-9) result.timeMismatches++;
    if (t.reason === "tp" || t.reason === "sl") {
      const price = t.entry * (1 + t.side * (t.reason === "tp" ? p.tp : -p.sl));
      if (!Number.isFinite(price) || Math.abs(t.exit - price) > 1e-9 * Math.max(1, Math.abs(price))) result.priceMismatches++;
    }
  }
  reports.push(result);
}
const totals = reports.reduce((a, r) => ({ entries: a.entries + r.entries, closed: a.closed + r.closed,
  invalid: a.invalid + r.invalid, returnMismatches: a.returnMismatches + r.returnMismatches,
  priceMismatches: a.priceMismatches + r.priceMismatches, overHold: a.overHold + r.overHold,
  timeMismatches: a.timeMismatches + r.timeMismatches }),
{ entries: 0, closed: 0, invalid: 0, returnMismatches: 0, priceMismatches: 0, overHold: 0, timeMismatches: 0 });
console.log(JSON.stringify({ reports, totals }));
if (totals.invalid || totals.returnMismatches || totals.priceMismatches || totals.overHold || totals.timeMismatches)
  process.exitCode = 1;
