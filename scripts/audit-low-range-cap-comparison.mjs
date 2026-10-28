#!/usr/bin/env node
// Compare the original and capped run's exact pre-allocation evidence.
// Identical modeled paths do not imply identical funded cohorts or venue fills.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOriginal, verifyReplayContinuity, verifyReplayFeed } from "./low-range-runtime-5m-balance-caps-study.mjs";
import { readSessionDump } from "./lib/session-dump.mjs";
import { readSessionStudy, studyExactJson } from "./lib/session-study.mjs";

const dir = resolve(process.argv[2] ?? "runs/low-range-continuity-195-oct19-5m-balance-caps-20261027");
const originalDir = resolve(process.argv[3] ?? "runs/low-range-continuity-195-oct19-5m-20261027");
const out = process.argv[4] ?? `${dir}/preallocation-comparison.json`;
const { protocol: p, protocolSha256 } = readSessionStudy(`${dir}/protocol.json`);
const old = loadOriginal(`${originalDir}/protocol.json`);
assert.equal(old.protocolSha256, p.parent.protocolSha256);
assert.equal(old.protocol.feed.sha256, p.feed.sha256);
const settingsCompatibility = verifyReplayContinuity(old.protocol, p);
verifyReplayFeed(old.protocol, p);
const digest = (value) => createHash("sha256").update(studyExactJson(value)).digest("hex");
const snapshot = async (path) => {
  const x = await readSessionDump(path, { fields: ["trades", "validation"] });
  return { virtualCloses: x.trades.length, tradesSha256: digest(x.trades),
    basePairs: x.basePairs.length, basePairsSha256: digest(x.basePairs),
    validationSteps: x.validation.length, validationSha256: digest(x.validation),
    endpointVirtualOrders: x.openEnd.length, endpointSha256: digest(x.openEnd) };
};
// Sequential loading avoids retaining two complete trade tapes at once.
const original = await snapshot(`${originalDir}/raw.json`), capped = await snapshot(`${dir}/raw.json`);
const keys = Object.keys(original), checks = Object.fromEntries(keys.map((key) => [key, original[key] === capped[key]]));
const result = { status: Object.values(checks).every(Boolean) ? "passed" : "different", checks, original, capped,
  parentProtocolSha256: old.protocolSha256, cappedProtocolSha256: protocolSha256,
  settingsCompatibility,
  originalSourceSha256: old.protocol.source.sha256, cappedSourceSha256: p.source.sha256,
  scope: "Exact ordered virtual trades, Base rows, recorded validation steps and virtual endpoint orders before account allocation; later funding and returns require their own audits. Distinct source seals and unmodeled venue execution remain explicit." };
writeFileSync(out, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: result.status, checks, virtualCloses: capped.virtualCloses,
  validationSteps: capped.validationSteps, endpointVirtualOrders: capped.endpointVirtualOrders }));
if (result.status !== "passed") process.exitCode = 1;
