#!/usr/bin/env node
// Reproduce the current registry and protect-grid catalog, without a market or runtime.
import { readFileSync, writeFileSync } from "node:fs";
import { INDICATIONS } from "../src/core/indications/registry.ts";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { defaultWalkForward, protectGrid } from "../src/core/sim/walkforward.ts";
import { minPfOf } from "../src/core/minimal-coord.ts";
const out = "docs/combined-verification-2026-10-21";
const sourceSha256 = JSON.parse(readFileSync(`${out}/source-manifest-v4.json`)).sourceSha256;
const save = (name, value) =>
  writeFileSync(`${out}/${name}.json`, JSON.stringify(value, null, 2) + "\n");
const byKind = {};
for (const spec of INDICATIONS) byKind[spec.kind] = (byKind[spec.kind] ?? 0) + 1;
save("source-catalog", {
  sourceSha256,
  registeredSpecs: INDICATIONS.length,
  byKind,
  specs: INDICATIONS.map(({ id, kind, label }) => ({ id, kind, label })),
});
const s = DEFAULT_SETTINGS;
save("default-config", {
  sourceSha256,
  classification:
    "Current factory defaults; historical benchmark settings and deployed connections are separate",
  tfs: s.tfs,
  toggles: s.toggles,
  grid: s.grid,
  gates: s.gates,
  signals: s.signals,
  axis: s.axis,
  dca: s.dca,
  focusCount: s.focus.length,
  wf: defaultWalkForward(s),
});
const cells = protectGrid(15, s.grid, s.cost);
const span = (values) =>
  values.length
    ? { min: Math.min(...values), max: Math.max(...values), unique: new Set(values).size }
    : null;
save("range-configs", {
  sourceSha256,
  classification:
    "Static default protect cells at 15m, before bot/source/strategy permutations; Minimal Plus fits dynamically",
  rows: ["wide", "mc", "mn", "mp", "sh", "gn", "lg"].map((tag) => {
    const p = cells.filter((x) => (x.tag ?? "wide") === tag);
    return {
      tag,
      cells: p.length,
      normal: p.filter((x) => !x.trailOnly && x.trail === 0).length,
      trailing: p.filter((x) => !x.trailOnly && x.trail > 0).length,
      trailingOnly: p.filter((x) => x.trailOnly).length,
      tp: span(p.map((x) => x.tp)),
      sl: span(p.map((x) => x.sl)),
      trail: span(p.map((x) => x.trail)),
      holdBars15m: span(p.map((x) => x.hold)),
      floor: minPfOf(s.gates, tag),
      inverseFloor: minPfOf(s.gates, tag, "inverse-known-rsi"),
    };
  }),
});
console.log(
  JSON.stringify({ sourceSha256, specs: INDICATIONS.length, protectCells: cells.length }),
);
