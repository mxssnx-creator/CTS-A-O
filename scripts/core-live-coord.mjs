#!/usr/bin/env node
// CTS-A-O — coordinates a desk's optional ranges from a reference desk's live results. The reference (a twin on the
// demo account, same settings with every range on) trades each range on live prices; a range is switched on for the
// target desk once its live PF clears --on-pf over at least --min-n closes, and off again when it falls below
// --off-pf. The decision is written as a settings patch the target desk applies while running
// (scripts/core-live-test.mjs --patch-file). Writes only when a decision changes; prints one line per range.
//
// --gate: the target desk opens only while the reference's live book of the ranges it trades (every range switched
// on, and every range this coordinator does not manage) clears --on-pf (paused below --off-pf, and until it has
// --gate-n closes): a real-money desk follows a demo twin that proves the configs live first, and a range that
// loses on the twin is switched off instead of holding the whole desk closed.
//
// micro / minimal start off (opt-in ranges); short / general / long start on and are switched off once proven
// losing.
//
//   node --experimental-strip-types scripts/core-live-coord.mjs --ref runs/x02/live-twin/status.json \
//     --patch runs/x01/patch.json [--ranges micro,minimal,short,general,long] [--min-n 10] [--on-pf 1.1] \
//     [--off-pf 1.0] \
//     [--gate --gate-n 15]
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const { MICRO_RANGE, MINIMAL_RANGE, SHORT_RANGE, GENERAL_RANGE, LONG_RANGE } = await import(
  "../src/core/minimal-coord.ts"
);

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
const gate = argv.includes("--gate");
const gateN = Number(arg("gate-n", 15));
const RANGES = {
  micro: { label: "Micro", value: MICRO_RANGE, start: false },
  minimal: { label: "Minimal", value: MINIMAL_RANGE, start: false },
  short: { label: "Short", value: SHORT_RANGE, start: true },
  general: { label: "General", value: GENERAL_RANGE, start: true },
  long: { label: "Long", value: LONG_RANGE, start: true },
};

// no reference yet (still computing its first window): nothing is proven, so the gate stays closed
const ref = existsSync(refPath) ? JSON.parse(readFileSync(refPath, "utf8")) : { paper: {} };
const prev = existsSync(patchPath) ? JSON.parse(readFileSync(patchPath, "utf8")) : null;
const on = { ...(prev?.on ?? {}) };
const lines = [];
let changed = !prev;
for (const k of ranges) {
  const r = RANGES[k];
  if (!r) throw new Error(`unknown range ${k}`);
  const a = ref.paper?.[r.label] ?? { n: 0, gp: 0, gl: 0 };
  const pf = a.gl > 1e-12 ? a.gp / a.gl : a.gp > 0 ? Infinity : 0;
  const was = on[k] ?? r.start;
  let now = was;
  if (a.n >= minN && pf >= onPf) now = true;
  else if (a.n >= minN && pf < offPf) now = false;
  if (now !== was) changed = true;
  on[k] = now;
  lines.push(
    `${k}: ${a.n} live closes on the reference, PF ${pf === Infinity ? "∞" : pf.toFixed(2)} → ${now ? "on" : "off"}${now !== was ? " (changed)" : ""}`,
  );
}
let paused = prev?.paused ?? true;
let pausedReason = prev?.reason ?? null;
if (gate) {
  // the book of the ranges the target trades: a managed range only while it is on
  const off = new Set(ranges.filter((k) => !on[k]).map((k) => RANGES[k].label));
  const t = Object.entries(ref.paper ?? {})
    .filter(([label]) => !off.has(label))
    .reduce((a, [, v]) => ({ n: a.n + v.n, gp: a.gp + v.gp, gl: a.gl + v.gl }), { n: 0, gp: 0, gl: 0 });
  const pf = t.gl > 1e-12 ? t.gp / t.gl : t.gp > 0 ? Infinity : 0;
  const was = paused;
  if (t.n >= gateN && pf >= onPf) paused = false;
  else if (t.n < gateN || pf < offPf) paused = true;
  const reason = t.n < gateN ? `reference has ${t.n} of ${gateN} live closes` : `reference live PF ${pf === Infinity ? "∞" : pf.toFixed(2)} over ${t.n} closes`;
  // a decision that flips is written; a reason that only counts closes (2 of 15 → 3 of 15) is not, since every
  // patch the desk applies is a settings update
  if (paused !== was || !prev) changed = true;
  lines.push(`opening: ${reason} → ${paused ? "paused" : "open"}${paused !== was ? " (changed)" : ""}`);
  pausedReason = reason;
}
const why = lines.join("; ");
if (changed) {
  const grid = {};
  for (const k of ranges) grid[k] = on[k] ? RANGES[k].value : false;
  // the coordinator owns only its keys (the ranges, the opening gate): everything else in the patch (caps,
  // disabled families, a walk-forward patch) is kept as it is
  const ps = prev?.settings ?? {};
  const settings = {
    ...ps,
    grid: { ...(ps.grid ?? {}), ...grid },
    ...(gate ? { live: { ...(ps.live ?? {}), openPaused: paused ? pausedReason : false } } : {}),
  };
  const tmp = `${patchPath}.tmp`;
  writeFileSync(
    tmp,
    JSON.stringify(
      { ...(prev ?? {}), at: new Date().toISOString(), why, on, paused, reason: gate ? pausedReason : null, settings },
      null,
      1,
    ),
  );
  renameSync(tmp, patchPath);
}
console.log(`${changed ? "patch written" : "unchanged"} · ${why}`);
