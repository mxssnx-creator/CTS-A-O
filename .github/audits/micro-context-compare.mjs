// Exact funded-cohort comparison; keeps every negative/empty hour and every source/config group.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFundedSession } from "../../scripts/lib/session-funded-cohort.mjs";
import { auditSettledHours } from "../../scripts/lib/postbase-hourly.mjs";
import { validateFrozenSessionResult, studyExactJson } from "../../scripts/lib/session-study.mjs";
import { parseConfigId, kindOfId } from "../../src/core/pipeline/pipeline.ts";
const [originalDir, expandedDir, output] = process.argv.slice(2);
assert.ok(originalDir && expandedDir && output);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const unit = (x) =>
  x.unitR !== undefined
    ? x.unitR
    : typeof x.mult === "number" && Number.isFinite(x.mult) && x.mult > 0
      ? x.r / x.mult
      : NaN;
const identity = (x) => JSON.stringify([x.cfg, x.sym, x.side, x.entryT, x.exitT]);
const contexts =
  /-(break-close-tactic|break-retest-tactic|activity-acceleration-relative|break-retest-market)-(fast|selective)@/;
async function arm(dir) {
  const { raw, book, trades, funding } = await readFundedSession(`${dir}/raw.json`);
  const p = JSON.parse(readFileSync(`${dir}/protocol.json`));
  validateFrozenSessionResult(raw, `${dir}/protocol.json`);
  assert.equal(p.actualSettings.grid.micro.maxHoldMin, 15);
  assert.equal(p.actualSettings.live.enabled, false);
  const hourly = auditSettledHours(trades, raw.window.startT, raw.window.endT);
  assert.ok(
    Math.abs(hourly.summary.pf - book.total.pfR) < 5.1e-7,
    "Primary report funded PF differs",
  );
  assert.equal(hourly.summary.n, book.total.orders);
  const groups = new Map(),
    configs = new Map();
  for (const x of trades) {
    const cfg = parseConfigId(x.cfg);
    assert.ok(cfg);
    const r = unit(x);
    assert.ok(Number.isFinite(r));
    const key = [cfg.bot, cfg.ind, kindOfId(x.cfg), cfg.protect.tag ?? "wide", x.side];
    for (const [map, k] of [
      [groups, JSON.stringify(key)],
      [configs, JSON.stringify([x.cfg, x.side])],
    ]) {
      let z = map.get(k);
      if (!z)
        map.set(
          k,
          (z = {
            key: JSON.parse(k),
            n: 0,
            gp: 0,
            gl: 0,
            symbols: new Set(),
            onsets: new Set(),
            hours: new Map(),
          }),
        );
      z.n++;
      z.gp += Math.max(0, r);
      z.gl += Math.max(0, -r);
      z.symbols.add(x.sym);
      z.onsets.add(JSON.stringify([x.sym, x.side, x.entryT]));
      const h = Math.floor((x.exitT - 1) / 3600000) * 3600000;
      z.hours.set(h, (z.hours.get(h) ?? 0) + r);
    }
  }
  const finish = (map) =>
    [...map.values()]
      .map((z) => ({
        ...z,
        net: z.gp - z.gl,
        pf: z.gl > 0 ? z.gp / z.gl : null,
        noLoss: z.gp > 0 && z.gl === 0,
        symbols: [...z.symbols],
        onsets: z.onsets.size,
        hours: [...z.hours].map(([t, net]) => ({ t, net })),
      }))
      .sort((a, b) => b.net - a.net);
  const added = trades.filter((x) => contexts.test(x.cfg)),
    old = trades.filter((x) => !contexts.test(x.cfg));
  return {
    p,
    trades,
    result: {
      protocolSha256: sha(readFileSync(`${dir}/protocol.json`)),
      study: raw.study,
      funding,
      hourly,
      addedContext: auditSettledHours(added, raw.window.startT, raw.window.endT),
      originalComponent: auditSettledHours(old, raw.window.startT, raw.window.endT),
      groups: finish(groups),
      configs: finish(configs),
      stageCounts: {
        basePairsEvaluated: raw.engine.baseEvaluated,
        basePairsPassed: raw.engine.basePassed,
        baseByRange: raw.engine.baseByRange,
        configEvalAtRunStart: raw.engine.configEvalPhase,
        hourlyRangeCounts: raw.stepsByRange,
        configuredAndBuiltCells: raw.engine.coverage.sets,
        perSource: raw.engine.coverage.perInd,
        warning:
          "Base pair/representative counts differ from full protection-cell counts. Built/config evaluation counts do not certify unbuilt Base cells as passing.",
      },
      endpointMarks: { n: raw.openEnd.length, report: book.total.openEnd },
      performance: {
        computeMs: raw.engine.computeMs,
        elapsedSeconds: raw.runSeconds,
        rssMaxMb: raw.engine.rssMaxMb,
        phases: raw.engine.phases,
        memory: raw.engine.mem,
      },
      reportTotal: book.total,
    },
  };
}
const a = await arm(originalDir),
  b = await arm(expandedDir);
assert.equal(a.p.source.sha256, b.p.source.sha256);
assert.equal(a.p.feed.sha256, b.p.feed.sha256);
assert.equal(studyExactJson(a.p.actualWf), studyExactJson(b.p.actualWf));
const settings = (p) => ({ ...p.actualSettings, focus: [] });
assert.equal(studyExactJson(settings(a.p)), studyExactJson(settings(b.p)));
assert.ok(a.p.scope.focus.every((x) => b.p.scope.focus.includes(x)));
const oldA = new Map(a.trades.map((x) => [identity(x), x])),
  oldB = new Map(b.trades.filter((x) => !contexts.test(x.cfg)).map((x) => [identity(x), x]));
const common = [...oldA].filter(([id]) => oldB.has(id));
for (const [id, x] of common)
  assert.equal(unit(x), unit(oldB.get(id)), "Same-cohort return changed");
const result = {
  classification:
    "Preregistered secondary-provider chronological modeled comparison, 24 symbols, 12h evaluated history and 12h execution with older indicator-only warmup. Not venue-owned fills or guaranteed future PF.",
  window: a.p.window,
  sourceSha256: a.p.source.sha256,
  feedSha256: a.p.feed.sha256,
  settingsDifference:
    "Only focused source identities differ; original formulas, prices, gates, holds, sizing, costs and account are identical.",
  original: a.result,
  expanded: b.result,
  originalIdentityComparison: {
    common: common.length,
    missingFromExpanded: [...oldA.keys()].filter((k) => !oldB.has(k)),
    newInExpanded: [...oldB.keys()].filter((k) => !oldA.has(k)),
    sameCohortReturnMismatches: 0,
    explanation:
      "Shared range selection and account/risk coordination can change original membership when sources are added; this comparison preserves the exact membership differences rather than attributing every change to child returns.",
  },
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      original: result.original.hourly,
      expanded: result.expanded.hourly,
      addedContext: result.expanded.addedContext,
      commonOriginalOrders: common.length,
    },
    null,
    2,
  ),
);
