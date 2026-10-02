#!/usr/bin/env node
// CTS-A-O — coordinates a desk's optional ranges from a reference desk's live results. The reference (a twin on the
// demo account, same settings with every range on) trades each range on live prices; a range is switched on for the
// target desk once its live PF clears --on-pf over at least --min-n closes, and off again when it falls below
// --off-pf. The decision is written as a settings patch the target desk applies while running
// (scripts/core-live-test.mjs --patch-file). Writes only when a decision changes; prints one line per range.
//
//   node --experimental-strip-types scripts/core-live-coord.mjs --ref runs/x02/live-twin/status.json \
//     --patch runs/x01/patch.json [--ranges micro,minimal] [--min-n 10] [--on-pf 1.1] [--off-pf 1.0]
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const { MICRO_RANGE, MINIMAL_RANGE } = await import("../src/core/minimal-coord.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const refPath = arg("ref");
const patchPath = arg("patch");
if (!refPath || !patchPath) throw new Error("--ref and --patch are required");
const ranges = arg("ranges", "micro,minimal").split(",");
const minN = Number(arg("min-n", 10));
const onPf = Number(arg("on-pf", 1.1));
const offPf = Number(arg("off-pf", 1.0));
const RANGES = {
  micro: { label: "Micro", value: MICRO_RANGE },
  minimal: { label: "Minimal", value: MINIMAL_RANGE },
};

const ref = JSON.parse(readFileSync(refPath, "utf8"));
const prev = existsSync(patchPath) ? JSON.parse(readFileSync(patchPath, "utf8")) : null;
const on = { ...(prev?.on ?? {}) };
const lines = [];
let changed = !prev;
for (const k of ranges) {
  const r = RANGES[k];
  if (!r) throw new Error(`unknown range ${k}`);
  const a = ref.paper?.[r.label] ?? { n: 0, gp: 0, gl: 0 };
  const pf = a.gl > 1e-12 ? a.gp / a.gl : a.gp > 0 ? Infinity : 0;
  const was = !!on[k];
  let now = was;
  if (a.n >= minN && pf >= onPf) now = true;
  else if (a.n >= minN && pf < offPf) now = false;
  if (now !== was) changed = true;
  on[k] = now;
  lines.push(
    `${k}: ${a.n} live closes on the reference, PF ${pf === Infinity ? "∞" : pf.toFixed(2)} → ${now ? "on" : "off"}${now !== was ? " (changed)" : ""}`,
  );
}
const why = lines.join("; ");
if (changed) {
  const grid = {};
  for (const k of ranges) grid[k] = on[k] ? RANGES[k].value : false;
  const tmp = `${patchPath}.tmp`;
  writeFileSync(tmp, JSON.stringify({ at: new Date().toISOString(), why, on, settings: { grid } }, null, 1));
  renameSync(tmp, patchPath);
}
console.log(`${changed ? "patch written" : "unchanged"} · ${why}`);
