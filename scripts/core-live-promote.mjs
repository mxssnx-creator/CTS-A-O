#!/usr/bin/env node
// CTS-A-O — promotes engine ranges from a reference desk (the demo twin) to a target desk (real money): reads the
// reference's exchange record (live_lane_trades in its core.sqlite, read-only), decides per range
// (src/core/live-promote.ts: a range goes on once its last closes on the reference's exchange clear --on-pf, off again
// under --off-pf) and writes the target's live.source / kinds / excludeRanges into its --patch-file, which the desk
// applies while running. Signals are not ranges: they stay as the target's own gates judge them. Writes the patch only
// when the target's live settings change; the decision is kept in --state; prints one line. --dry: print only.
//
//   node --experimental-strip-types scripts/core-live-promote.mjs --ref-db runs/x02-live2/core.sqlite \
//     --patch runs/x01-desk.json --state runs/x01-promote.json [--last-n 30] [--min-n 20] [--on-pf 1.2] [--off-pf 1.0]
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const { DEFAULT_PROMOTE, promoteDecide, promoteLive } = await import("../src/core/live-promote.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const refDb = arg("ref-db");
const patchPath = arg("patch");
const statePath = arg("state");
if (!refDb || !patchPath || !statePath) throw new Error("--ref-db, --patch and --state are required");
const dry = argv.includes("--dry");
const o = {
  lastN: Number(arg("last-n", DEFAULT_PROMOTE.lastN)),
  minN: Number(arg("min-n", DEFAULT_PROMOTE.minN)),
  onPf: Number(arg("on-pf", DEFAULT_PROMOTE.onPf)),
  offPf: Number(arg("off-pf", DEFAULT_PROMOTE.offPf)),
};

const db = new DatabaseSync(refDb, { readOnly: true });
let closes;
try {
  closes = db
    .prepare("SELECT cfg, r, exit_t FROM live_lane_trades")
    .all()
    .map((x) => ({ cfg: String(x.cfg), r: Number(x.r), exitT: Number(x.exit_t) }));
} finally {
  db.close();
}
const prev = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { on: {} };
const { on, lines } = promoteDecide(prev.on ?? {}, closes, o);
const why = lines.join("; ") || "no reference closes yet";
const patch = JSON.parse(readFileSync(patchPath, "utf8"));
const live = patch.settings?.live ?? {};
const next = promoteLive(live, on);
const key = (l) => JSON.stringify([l.source ?? "all", l.kinds ?? [], l.excludeRanges ?? []]);
const write = key(live) !== key(next);
const atomic = (path, doc) => {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
};
if (!dry) {
  if (write) {
    // the desk prints the patch's why when it applies it: the promoter's decision first, the desk's own reasons after
    const own = String(patch.why ?? "").replace(/^promoter[^|]*\| /, "");
    atomic(patchPath, { ...patch, why: `promoter (reference exchange record): ${why} | ${own}`, settings: { ...patch.settings, live: next } });
  }
  atomic(statePath, { at: new Date().toISOString(), opts: o, on, why, closes: closes.length });
}
console.log(`${new Date().toISOString().slice(11, 19)} ${write ? (dry ? "would write the patch" : "patch written") : "unchanged"} · ${why}`);
