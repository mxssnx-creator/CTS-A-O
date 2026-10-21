#!/usr/bin/env node
// Frozen rule consumes settled funded Micro-range TRAINING outcomes only; later validation is never an input.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFundedSession } from "./lib/session-funded-cohort.mjs";
import { parseConfigId } from "../src/core/pipeline/pipeline.ts";
import { modeledUnitReturn, settledHourT } from "../src/core/metrics/stats.ts";
const [dir, output] = process.argv.slice(2);
assert.ok(dir && output, "Training directory and a fresh selection directory required");
assert.ok(
  !existsSync(`${output}/selection.json`),
  "Never replace a sealed selection with later outcomes",
);
const protocolBytes = readFileSync(`${dir}/protocol.json`),
  p = JSON.parse(protocolBytes);
assert.equal(
  p.window.endT,
  Date.parse("2026-10-20T00:00:00Z"),
  "Only the preregistered training period is eligible",
);
const { trades, funding } = await readFundedSession(`${dir}/raw.json`);
assert.equal(funding.unknownAllocations, 0);
const rule = {
  minimumCloses: 100,
  minimumDistinctOnsets: 12,
  minimumActiveHours: 6,
  minimumPositiveHourShare: 0.6,
  minimumUnitReturnPf: 1.35,
  maximumIndications: 24,
};
const sources = new Map(),
  configs = new Map();
for (const t of trades) {
  let cfg = configs.get(t.cfg);
  if (!cfg) {
    cfg = parseConfigId(t.cfg);
    configs.set(t.cfg, cfg);
  }
  assert.ok(cfg);
  if (cfg.protect.tag !== "mc") continue;
  assert.ok(/^(inverse-)?micro-/.test(cfg.ind));
  const r = modeledUnitReturn(t);
  assert.ok(Number.isFinite(r));
  let x = sources.get(cfg.ind);
  if (!x) {
    x = { id: cfg.ind, n: 0, gp: 0, gl: 0, onsets: new Set(), hours: new Map() };
    sources.set(cfg.ind, x);
  }
  x.n++;
  x.gp += Math.max(0, r);
  x.gl += Math.max(0, -r);
  x.onsets.add(JSON.stringify([t.sym, t.side, t.entryT]));
  const h = settledHourT(t.exitT);
  x.hours.set(h, (x.hours.get(h) ?? 0) + r);
}
const evidence = [...sources.values()].map(({ onsets, hours, ...x }) => ({
  ...x,
  pf: x.gl > 0 ? x.gp / x.gl : null,
  noLoss: x.gp > 0 && x.gl === 0,
  distinctOnsets: onsets.size,
  activeHours: hours.size,
  positiveHours: [...hours.values()].filter((x) => x > 0).length,
}));
const eligible = evidence
  .filter(
    (x) =>
      x.n >= rule.minimumCloses &&
      x.distinctOnsets >= rule.minimumDistinctOnsets &&
      x.activeHours >= rule.minimumActiveHours &&
      x.positiveHours / x.activeHours >= rule.minimumPositiveHourShare &&
      (x.noLoss ? 4 : (x.pf ?? 0)) >= rule.minimumUnitReturnPf,
  )
  .sort(
    (a, b) =>
      (b.noLoss ? 4 : b.pf) - (a.noLoss ? 4 : a.pf) ||
      b.distinctOnsets - a.distinctOnsets ||
      a.id.localeCompare(b.id),
  );
const selected = eligible.slice(0, rule.maximumIndications);
const focus = selected.map((x) => x.id.replace(/@m\d+c?$/, ""));
assert.equal(new Set(focus).size, focus.length);
mkdirSync(output, { recursive: true });
const result = {
  schema: "cts-micro-24-training-selection-v1",
  rule,
  trainingSource: p.source.sha256,
  protocolSha256: createHash("sha256").update(protocolBytes).digest("hex"),
  trainingWindow: p.window,
  funding,
  focus,
  eligible: focus.length > 0,
  selected,
  evidence,
  scope:
    "Micro range only, settled funded unit returns after one cost. A source shortlist never qualifies any config, direction, range or strategy; all production Base and later gates remain independent. No-loss gate score 4 is not a measured finite PF. No holdout outcomes were read.",
};
writeFileSync(`${output}/selection.json`, JSON.stringify(result, null, 2) + "\n");
writeFileSync(`${output}/focus.json`, JSON.stringify(focus, null, 2) + "\n");
console.log(JSON.stringify({ selected: focus.length, rule, trainingSource: p.source.sha256 }));
