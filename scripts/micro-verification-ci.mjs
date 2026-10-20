#!/usr/bin/env node
// Runner-isolated, serial heavy jobs. Frozen chronology and complete production grids remain unchanged.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { studyExactJson } from "./lib/session-study.mjs";
const docs = "docs/micro-optimization-2026-10-20",
  plan = JSON.parse(readFileSync(`${docs}/plan.json`));
const feed = `${docs}/reproduction-feed.json.gz`,
  meta = JSON.parse(readFileSync(`${docs}/reproduction-feed.json`));
assert.equal(createHash("sha256").update(readFileSync(feed)).digest("hex"), meta.sha256);
const logDir = "runs/micro-ci-study";
mkdirSync(logDir, { recursive: true });
function run(label, ...args) {
  console.log(`START ${label}`);
  const x = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", ...args], {
    env: process.env,
    stdio: "inherit",
  });
  if (x.status !== 0) throw Error(`${label}: ${x.error ?? x.signal ?? x.status}`);
  console.log(`PASS ${label}`);
}
for (const hold of Object.keys(plan.arms)) {
  const out = plan.trainingCases[hold];
  run(
    `prepare ${hold}`,
    "scripts/micro-optimization-study.mjs",
    "prepare",
    "--feed",
    feed,
    "--out",
    out,
    "--end",
    String(plan.trainingEndT),
    "--hold",
    hold,
    "--label",
    `micro-optimization-training-${hold}`,
  );
  const p = JSON.parse(readFileSync(`${out}/protocol.json`)),
    frozen = JSON.parse(readFileSync(`${docs}/train-${hold}-${plan.caseRevision}-protocol.json`));
  assert.equal(p.source.sha256, plan.sourceSha256);
  assert.equal(p.feed.sha256, frozen.feed.sha256);
  assert.equal(studyExactJson(p.actualSettings), studyExactJson(frozen.actualSettings));
  assert.equal(studyExactJson(p.actualWf), studyExactJson(frozen.actualWf));
  run(
    `score ${hold}`,
    "scripts/micro-optimization-study.mjs",
    "run",
    "--out",
    out,
    "--workers",
    "2",
  );
  run(`audit ${hold}`, "scripts/audit-micro-execution.mjs", out);
  run(
    `parity ${hold}`,
    "scripts/audit-simulation-parity.mjs",
    `${out}/raw.json`,
    `${out}/simulation-parity.json`,
  );
}
run("seal training selection", "scripts/select-micro-optimization.mjs", docs);
const selection = JSON.parse(readFileSync(`${docs}/selection.json`));
if (selection.eligible)
  for (const [label, end] of [
    ["validation", plan.validationEndT],
    ["confirmation", plan.confirmationEndT],
  ]) {
    const out = `runs/micro-opt-${label}-${plan.caseRevision}`;
    run(
      `prepare ${label}`,
      "scripts/micro-optimization-study.mjs",
      "prepare",
      "--feed",
      feed,
      "--out",
      out,
      "--end",
      String(end),
      "--hold",
      selection.hold,
      "--label",
      `micro-optimization-${label}`,
      "--focus-file",
      `${docs}/selected-focus.json`,
    );
    run(
      `score ${label}`,
      "scripts/micro-optimization-study.mjs",
      "run",
      "--out",
      out,
      "--workers",
      "2",
    );
    run(`audit ${label}`, "scripts/audit-micro-execution.mjs", out);
    run(`stages ${label}`, "scripts/audit-micro-stages.mjs", out);
    run(
      `parity ${label}`,
      "scripts/audit-simulation-parity.mjs",
      `${out}/raw.json`,
      `${out}/simulation-parity.json`,
    );
  }
writeFileSync(
  `${logDir}/completion.json`,
  JSON.stringify(
    {
      complete: true,
      sourceSha256: plan.sourceSha256,
      eligibleSelection: selection.eligible,
      validationPerformed: selection.eligible,
      rule: "No candidate means no unselected fallback or validation retuning.",
    },
    null,
    2,
  ) + "\n",
);
