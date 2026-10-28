#!/usr/bin/env node
// Secondary, retrospective filter study over an already selected list of completed modeled orders.
// This does not replay candidate construction, selection, funding, held endpoint orders or exchange fills.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { ProcessedSetBook, processedSetKey } from "../src/core/sim/processed-set.ts";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
import { positionOrderCounts } from "../src/core/positions.ts";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("usage: study-processed-set-replay.mjs COMPLETED_ORDERS.jsonl OUTPUT.json");
const bytes = readFileSync(input), sha256 = createHash("sha256").update(bytes).digest("hex");
const rows = bytes.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const identityOf = (tr) => ({ baseConfigId: tr.cfg, symbol: tr.sym, side: tr.side, kind: tr.kind ?? "normal",
  lane: "previously-selected-model", economicRevision: `source-sha256:${sha256}` });
const orderId = (tr) => JSON.stringify([tr.cfg, tr.sym, tr.side, tr.entryT]);
const seen = new Set();
for (const tr of rows) {
  if (!Number.isFinite(tr.entryT) || !Number.isFinite(tr.exitT) || tr.exitT < tr.entryT ||
    !Number.isFinite(modeledUnitReturn(tr))) throw new Error("invalid or unknown modeled close");
  processedSetKey(identityOf(tr));
  const key = orderId(tr);
  if (seen.has(key)) throw new Error("duplicate exact order identity");
  seen.add(key);
}
const times = new Map();
for (const tr of rows) {
  const e = times.get(tr.entryT) ?? { entries: [], exits: [] };
  e.entries.push(tr); times.set(tr.entryT, e);
  const x = times.get(tr.exitT) ?? { entries: [], exits: [] };
  x.exits.push(tr); times.set(tr.exitT, x);
}
const samples = [10, 12, 15, 20, 25, 30, 35];
const cases = [];
for (const validationN of samples) for (const realN of samples) {
  const book = new ProcessedSetBook("model", 35), contexts = new Map(), admissions = new Map(), details = [];
  const stages = { postBase: [], validated: [], active: [] };
  const onClose = (tr) => {
    const identity = identityOf(tr), id = orderId(tr), opened = admissions.get(id);
    if (!opened) throw new Error(`missing entry ${id}`);
    book.close(identity, id, tr.entryT, "complete", tr.exitT, modeledUnitReturn(tr), true);
    stages.postBase.push(tr);
    if (opened.stage !== "postBase") stages.validated.push(tr);
    if (opened.stage === "active") stages.active.push(tr);
    if (validationN === 12 && realN === 12)
      details.push({ ...tr, returnUnit: modeledUnitReturn(tr), stage: opened.stage,
        validation: opened.validation, real: opened.real });
  };
  for (const [t, events] of [...times.entries()].sort((a, b) => a[0] - b[0])) {
    const ordered = (arr) => arr.sort((a, b) => orderId(a).localeCompare(orderId(b)));
    for (const tr of ordered(events.exits.filter((tr) => tr.entryT < t))) onClose(tr);
    for (const tr of ordered(events.entries)) {
      const identity = identityOf(tr), key = processedSetKey(identity), id = orderId(tr);
      contexts.set(key, identity);
      admissions.set(id, book.acceptPostBase(identity, id, t, { validationN, realN, minPf: 1.1 }));
    }
    for (const tr of ordered(events.exits.filter((tr) => tr.entryT === t))) onClose(tr);
  }
  const sums = Object.fromEntries(["postBase", "validated", "active"].map((stage) => [stage,
    { openedOrders: 0, closedOrders: 0, heldOrders: 0, settledSlices: 0, grossProfit: 0, grossLoss: 0, unknownReturns: 0 }]));
  const evaluations = { validation: { insufficient: 0, unknown: 0, failed: 0, qualified: 0 },
    real: { insufficient: 0, unknown: 0, failed: 0, qualified: 0 } };
  const sets = [];
  for (const identity of contexts.values()) {
    const summary = book.summary(identity);
    if (!summary) throw new Error("missing processed-set summary");
    sets.push(summary);
    for (const stage of ["postBase", "validated", "active"]) for (const field of Object.keys(sums[stage]))
      sums[stage][field] += summary.stages[stage][field];
    for (const gate of ["validation", "real"]) for (const state of Object.keys(evaluations[gate]))
      evaluations[gate][state] += summary.evaluations[gate][state];
  }
  for (const stage of ["postBase", "validated", "active"]) {
    const s = sums[stage];
    s.returnPf = s.unknownReturns || !s.settledSlices || !s.grossLoss ? null : s.grossProfit / s.grossLoss;
    s.noLoss = s.settledSlices > 0 && s.unknownReturns === 0 && s.grossProfit > 0 && s.grossLoss === 0;
    s.positionOrderCounts = positionOrderCounts(stages[stage], []);
  }
  const fraction = (v) => { const n = Object.values(v).reduce((a, x) => a + x, 0); return n ? 100 * v.qualified / n : null; };
  cases.push({ validationN, realN, contexts: contexts.size, evaluations, validationPctOfProcessedOrders: fraction(evaluations.validation),
    realPctOfValidatedOrders: fraction(evaluations.real), stages: sums,
    ...(validationN === 12 && realN === 12 ? { sets, orders: details } : {}) });
}
writeFileSync(output, JSON.stringify({
  scope: "Retrospective secondary filter of completed, previously selected modeled closes only; no endpoint-held orders, funding, exchange fills, stage construction or new forward holdout. Empty stage PF is unavailable. This is not a systemwide backtest.",
  inputSha256: sha256, inputCompletedOrders: rows.length,
  unsupported: "Last-5 is below the project's minimum nine samples.",
  ordering: "At each timestamp, earlier orders' closes are applied first, then entries, then same-time closes.",
  cases,
}, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ inputCompletedOrders: rows.length, cases: cases.length, output }));
