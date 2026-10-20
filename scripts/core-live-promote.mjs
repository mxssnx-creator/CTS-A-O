#!/usr/bin/env node
// CTS-A-O — exact engine-lane promotion from complete post-Base and verified owned-execution evidence. The legacy
// live_lane_trades table lacks funded quantities: its row count is diagnostic only. No artifact means all managed
// engine lanes are OFF, including lanes enabled by old pooled range state. Signals retain their target kinds policy.
//
//   node --experimental-strip-types scripts/core-live-promote.mjs --ref-db runs/x02-live2/core.sqlite \
//     --patch runs/x01-desk.json --state runs/x01-promote.json \
//     [--evidence verified-promotion.json --reference-id x02] [--last-n 30] [--min-n 20] [--on-pf 1.2] [--off-pf 1.0]
//
// Evidence contract and exported types: src/core/live-promote.ts (cts-live-promotion/v2). The original bytes are
// SHA-256-bound into every resulting lane proof. Producer-supplied validUntilT is explicit; no default expiry is
// invented. The reader verifies structure/arithmetic/completeness declarations, not authenticity of an external
// producer: an actual owned-execution exporter must supply the original fill and settled-slice provenance.
// First axis: settled post-Base qualified virtual orders BEFORE allocation, using unit net returns. Second axis:
// funded owned-execution settled slices, labeled owned-paper or verified-venue. Neither axis is raw Base PF.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const { DEFAULT_PROMOTE, promoteDecide, promoteLive } = await import("../src/core/live-promote.ts");
const { OWN_CLOSE_SQL } = await import("../src/core/relation.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const refDb = arg("ref-db");
const patchPath = arg("patch");
const statePath = arg("state");
const evidencePath = arg("evidence");
const referenceId = arg("reference-id");
if (!refDb || !patchPath || !statePath) throw new Error("--ref-db, --patch and --state are required");
const dry = argv.includes("--dry");
const o = {
  lastN: Number(arg("last-n", DEFAULT_PROMOTE.lastN)),
  minN: Number(arg("min-n", DEFAULT_PROMOTE.minN)),
  onPf: Number(arg("on-pf", DEFAULT_PROMOTE.onPf)),
  offPf: Number(arg("off-pf", DEFAULT_PROMOTE.offPf)),
};

const db = new DatabaseSync(refDb, { readOnly: true });
let nominalCloses;
try {
  // the reference's own closes only (relation.ts): a manual close or the restart window is not counted
  nominalCloses = db.prepare(`SELECT COUNT(*) AS n FROM live_lane_trades WHERE ${OWN_CLOSE_SQL}`).get().n;
} finally {
  db.close();
}
let evidence;
let proofId;
let evidenceError;
if (evidencePath) {
  try {
    const bytes = readFileSync(evidencePath);
    proofId = createHash("sha256").update(bytes).digest("hex");
    evidence = JSON.parse(bytes.toString("utf8"));
  } catch {
    evidenceError = "evidence artifact unreadable or invalid JSON";
  }
}
let prev = {};
if (existsSync(statePath)) {
  try {
    const value = JSON.parse(readFileSync(statePath, "utf8"));
    if (value && typeof value === "object" && !Array.isArray(value)) prev = value;
  } catch { /* Corrupt old state never grants permission. */ }
}
const priorIdentities = prev.schema === "cts-live-promotion-state/v2" && prev.byIdentity
  && typeof prev.byIdentity === "object" && !Array.isArray(prev.byIdentity) ? prev.byIdentity : {};
const decision = promoteDecide(priorIdentities, evidence, o,
  { referenceId, proofId, nowT: Date.now() });
if (evidenceError) decision.lines.push(evidenceError);
const why = `${decision.lines.join("; ")}; nominal reference own rows ${nominalCloses} (not funded-execution proof)`;
const patch = JSON.parse(readFileSync(patchPath, "utf8"));
const live = patch.settings?.live ?? {};
const next = promoteLive(live, decision);
const key = (l) => JSON.stringify([l.source ?? "all", l.kinds ?? [], l.excludeRanges ?? [], l.promotedLanes]);
const write = key(live) !== key(next);
const atomic = (path, doc) => {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
};
if (!dry) {
  if (write) {
    // the desk prints the patch's why when it applies it: the promoter's decision first, the desk's own reasons after
    const own = String(patch.why ?? "").replace(/^promoter[^|]*\| /, "");
    atomic(patchPath, { ...patch, why: `promoter (exact post-Base + owned execution): ${why} | ${own}`, settings: { ...patch.settings, live: next } });
  }
  atomic(statePath, { schema: "cts-live-promotion-state/v2", at: new Date().toISOString(), opts: o,
    on: decision.on, byIdentity: decision.byIdentity, promotedLanes: decision.promotedLanes,
    proofId, referenceId, why, nominalCloses });
}
console.log(`${new Date().toISOString().slice(11, 19)} ${write ? (dry ? "would write the patch" : "patch written") : "unchanged"} · ${why}`);
