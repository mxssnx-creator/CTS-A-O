// Selection consumes training receipts only. Validation and confirmation are not inputs to this program.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { stageAudit } from "./audit-micro-stages.mjs";

const out = process.argv[2] ?? "docs/micro-optimization-2026-10-20";
const plan = JSON.parse(readFileSync(`${out}/plan.json`));
const rule = plan.selection;
if (existsSync(`${out}/selection.json`)) throw new Error("Selection is already sealed; never reselect from validation outcomes");
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const pfScore = (x) => x.pfState === "no-loss-gate-score-4" ? 4 : x.pf ?? -Infinity;
const arms = [];
for (const name of Object.keys(plan.arms)) {
  const dir = plan.trainingCases[name];
  const protocol = JSON.parse(readFileSync(`${dir}/protocol.json`));
  assert.equal(protocol.window.endT, plan.trainingEndT);
  assert.equal(protocol.source.sha256, plan.sourceSha256);
  assert.equal(protocol.optimization.hold, name);
  const result = await stageAudit(dir);
  writeFileSync(`${dir}/filtered-stages.json`, JSON.stringify(result, null, 2));
  const eligible = result.perIndication.filter((x) => !x.unknownReturns &&
    x.closes >= rule.minimumCloses && x.distinctOnsets >= rule.minimumDistinctOnsets &&
    x.activeHours >= rule.minimumActiveHours && x.positiveHours / x.activeHours >= rule.minimumPositiveHourShare &&
    pfScore(x) >= rule.minimumUnitReturnPf);
  eligible.sort((a, b) => pfScore(b) - pfScore(a) || b.distinctOnsets - a.distinctOnsets || a.id.localeCompare(b.id));
  const selected = eligible.slice(0, rule.maximumIndications);
  const total = selected.reduce((s, x) => ({ closes: s.closes + x.closes, gp: s.gp + x.gp, gl: s.gl + x.gl }), { closes: 0, gp: 0, gl: 0 });
  arms.push({ name, eligible: eligible.length, selected, selectedTraining: { ...total,
    pf: total.closes && total.gl ? total.gp / total.gl : null,
    pfState: !total.closes ? "empty" : !total.gl ? "no-loss-gate-score-4" : "measured" },
    fullTraining: result.fundedModeledExecution, protocolSha256: sha(`${dir}/protocol.json`),
    stageReceiptSha256: sha(`${dir}/filtered-stages.json`) });
}
arms.sort((a, b) => pfScore(b.selectedTraining) - pfScore(a.selectedTraining) || b.selectedTraining.closes - a.selectedTraining.closes || a.name.localeCompare(b.name));
const winner = arms[0], focus = winner.selected.map((x) => x.id.replace(/@m\d+c?$/, ""));
assert.equal(new Set(focus).size, focus.length);
mkdirSync(out, { recursive: true });
const selection = { schema: "cts-micro-sealed-selection-v1", at: new Date().toISOString(), planSha256: sha(`${out}/plan.json`),
  sourceSha256: plan.sourceSha256, trainingEndT: plan.trainingEndT, hold: winner.name,
  focus, eligible: focus.length > 0, arms,
  classification: "Training selection only; validation/confirmation have not been used. A positive training PF is not forward or native proof." };
writeFileSync(`${out}/selection.json`, JSON.stringify(selection, null, 2));
writeFileSync(`${out}/selected-focus.json`, JSON.stringify(focus, null, 2));
console.log(JSON.stringify({ hold: selection.hold, focus: focus.length, selectedTraining: winner.selectedTraining,
  arms: arms.map((x) => ({ name: x.name, eligible: x.eligible, fullTraining: x.fullTraining, selectedTraining: x.selectedTraining })) }));
