import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { iterateSessionValidation, iterateSessionTapeTrades } from "./lib/session-dump.mjs";
import { scalarEval } from "../.github/audits/hourly-progress.mjs";
import { parseConfigId, kindOfId } from "../src/core/pipeline/pipeline.ts";
export async function rankOrderAudit(dir) {
  const cases = ["volatility1h", "change1h5m"],
    checks = [];
  for (const rank of cases) {
    for await (const step of iterateSessionValidation(`${dir}/${rank}/raw.json`)) {
      checks.push(new Map(step.checks.map((r) => [r[0], r])));
      break;
    }
  }
  const onlyA = [...checks[0].keys()].filter((k) => !checks[1].has(k)),
    onlyB = [...checks[1].keys()].filter((k) => !checks[0].has(k));
  const changed = [...checks[0].keys()].filter(
    (k) => checks[1].has(k) && checks[0].get(k)[1] !== checks[1].get(k)[1],
  );
  const ids = changed,
    maps = [];
  for (const rank of cases) {
    const m = new Map();
    for await (const row of iterateSessionTapeTrades(`${dir}/${rank}/raw.json`)) {
      if (ids.includes(row.id)) m.set(row.id, row.trades);
      if (m.size === ids.length) break;
    }
    maps.push(m);
  }
  const sha = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
  const canonical = (rows) =>
    [...rows].sort(
      (a, b) =>
        a[3] - b[3] || a[2] - b[2] || a[0].localeCompare(b[0]) || a[1] - b[1] || a[4] - b[4],
    );
  const p = JSON.parse(fs.readFileSync(`${dir}/volatility1h/protocol.json`));
  const examples = [];
  for (const id of ids) {
    const [a, b] = maps.map((m) => m.get(id));
    assert.ok(a && b);
    const [ca, cb] = [canonical(a), canonical(b)];
    assert.equal(sha(ca), sha(cb), "shared config histories differ beyond row order");
    const protect = parseConfigId(id).protect,
      kind = kindOfId(id),
      t = p.window.tradeStartT;
    const ea = scalarEval(a, t, p.actualWf, protect, kind),
      eb = scalarEval(b, t, p.actualWf, protect, kind);
    const eca = scalarEval(ca, t, p.actualWf, protect, kind),
      ecb = scalarEval(cb, t, p.actualWf, protect, kind);
    assert.deepEqual(eca, ecb);
    assert.notEqual(ea.ok, eb.ok);
    examples.push({
      id,
      rows: a.length,
      orderedHistorySame: sha(a) === sha(b),
      sameIdentityReturnMultiset: true,
      canonicalReferenceDecisionsEqual: true,
      recorded: checks.map((m) => m.get(id)),
      actualScalar: [ea, eb],
      canonicalDiagnostic: eca,
    });
  }
  const cov = cases.map(
    (rank) => JSON.parse(fs.readFileSync(`${dir}/${rank}/report/data.json`)).coverage.sets,
  );
  const key = (r) => [r.ind, r.tag, r.kind].join("|");
  const cm = cov.map((rows) => new Map(rows.map((r) => [key(r), r])));
  const differences = [...cm[0].keys()]
    .filter((k) => JSON.stringify(cm[0].get(k)) !== JSON.stringify(cm[1].get(k)))
    .map((k) => ({ key: k, rows: cm.map((m) => m.get(k)) }));
  const result = {
    schema: "cts-rank-order-diagnostic-v1",
    sourceSha256: p.source.sha256,
    initialChecked: checks.map((m) => m.size),
    onlyCheckedA: onlyA.length,
    onlyCheckedB: onlyB.length,
    commonInitialGateDecisionsChanged: changed.length,
    coverageDifferences: differences,
    examples,
    policy:
      "Production compareTapeTrades preserves ranked universe source order for equal exit/entry timestamps. symbol-directions and signal-gates regressions explicitly retain this policy. Canonical sorting here is a post-hoc diagnostic only; neither saved execution nor historical gate sample is altered. Shared source rows and returns match; ordering can change Last-N boundary membership and chronological drawdown.",
  };
  return result;
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const result = await rankOrderAudit(process.argv[2]);
  fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + "\n");
  console.log(
    JSON.stringify({
      changed: result.commonInitialGateDecisionsChanged,
      proved: result.examples.length,
      coverageDifferences: result.coverageDifferences.length,
    }),
  );
}
