// Read-only stage evidence. Passed historical config windows and subsequent funded model closes are different samples.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { iterateSessionValidation, readSessionDump } from "./lib/session-dump.mjs";
import { modeledUnitReturn, settledHourT } from "../src/core/metrics/stats.ts";
import { rangeOfId } from "../src/core/minimal-coord.ts";

export const emptyCohort = () => ({ configs: 0, closes: 0, gp: 0, gl: 0, unknownReturns: 0 });
export function addValidation(target, checks, admitted = null) {
  for (const [id, ok, n, _pf, gp, gl] of checks) {
    if (!ok || (admitted && !admitted.has(id))) continue;
    target.configs++;
    target.closes += n;
    target.gp += gp;
    target.gl += gl;
  }
  return target;
}
export function cohortPf(x) {
  return {
    ...x,
    pf: x.unknownReturns || !x.closes || !x.gl ? null : x.gp / x.gl,
    pfState: x.unknownReturns
      ? "unknown"
      : !x.closes
        ? "empty"
        : !x.gl
          ? "no-loss-gate-score-4"
          : "measured",
  };
}
export async function stageAudit(dir) {
  const protocol = JSON.parse(readFileSync(`${dir}/protocol.json`));
  const raw = await readSessionDump(`${dir}/raw.json`, { fields: ["trades"] });
  const perRange = {},
    steps = [];
  const row = (tag) =>
    (perRange[tag] ??= {
      initialPassed: emptyCohort(),
      initialSeated: emptyCohort(),
      executed: emptyCohort(),
    });
  let initial;
  for await (const step of iterateSessionValidation(`${dir}/raw.json`)) {
    const accepted = cohortPf(addValidation(emptyCohort(), step.checks));
    const seated = cohortPf(addValidation(emptyCohort(), step.checks, new Set(step.real)));
    steps.push({ t: step.t, evaluated: step.checks.length, passed: accepted, seated });
    if (!initial) {
      initial = steps.at(-1);
      const seats = new Set(step.real);
      for (const check of step.checks) {
        const r = row(rangeOfId(check[0]) || "wide");
        addValidation(r.initialPassed, [check]);
        addValidation(r.initialSeated, [check], seats);
      }
    }
  }
  const executed = emptyCohort(),
    ids = new Set(),
    ranges = new Map(),
    byInd = new Map();
  for (const trade of raw.trades) {
    const ind = trade.cfg.split("|")[1],
      tag = rangeOfId(trade.cfg) || "wide";
    const x = byInd.get(ind) ?? {
      ...emptyCohort(),
      ids: new Set(),
      onsets: new Set(),
      hours: new Map(),
    };
    byInd.set(ind, x);
    const r = modeledUnitReturn(trade);
    const dest = row(tag).executed;
    const rs = ranges.get(tag) ?? new Set();
    ranges.set(tag, rs);
    ids.add(trade.cfg);
    rs.add(trade.cfg);
    x.ids.add(trade.cfg);
    x.onsets.add(`${trade.sym}|${trade.side}|${trade.entryT}`);
    const h = settledHourT(trade.exitT);
    const hour = x.hours.get(h) ?? emptyCohort();
    x.hours.set(h, hour);
    for (const a of [executed, dest, x, hour]) {
      a.closes++;
      if (!Number.isFinite(r)) a.unknownReturns++;
      else {
        a.gp += Math.max(0, r);
        a.gl += Math.max(0, -r);
      }
    }
  }
  executed.configs = ids.size;
  for (const [tag, r] of Object.entries(perRange)) {
    r.executed.configs = ranges.get(tag)?.size ?? 0;
    for (const key of Object.keys(r)) r[key] = cohortPf(r[key]);
  }
  const sourceRows = [...byInd].map(([id, x]) => {
    const { ids, onsets, hours, ...s } = x;
    return {
      id,
      ...cohortPf({ ...s, configs: ids.size }),
      distinctOnsets: onsets.size,
      activeHours: hours.size,
      positiveHours: [...hours.values()].filter((h) => h.gp > h.gl).length,
    };
  });
  return {
    schema: "cts-micro-filtered-stages-v1",
    sourceSha256: protocol.source.sha256,
    window: protocol.window,
    modelRoundTripCost: (protocol.actualSettings ?? protocol.settings).cost,
    basis: "unit-net-returns after one modeled round trip",
    base: {
      evaluatedPairsIncludingExit: raw.engine.baseEvaluated,
      passedPairsIncludingExit: raw.engine.basePassed,
      ordinaryPassedPairs: raw.funnel.counts.basePassed,
      mainPairs: raw.engine.mainPairs,
      rangeRepresentativeEvidence: raw.engine.baseByRange
        .filter((r) => r.enabled)
        .map((r) => ({
          range: r.range,
          tag: r.tag || "wide",
          evaluatedPairs: r.evaluated,
          passedPairs: r.passed,
          minimumPf: r.minPf,
          passedPooledPf: r.pfPassedPooled,
          passedMedianPf: r.pfPassedMedian,
          gp: r.passedGp,
          gl: r.passedGl,
        })),
    },
    postBaseBuiltConfigs: raw.funnel.counts.poolConfigs,
    initial,
    rollingValidation: steps,
    fundedModeledExecution: cohortPf(executed),
    perRange,
    perIndication: sourceRows,
    notes: [
      "Base range rows are pair-level representative evidence, not counts or PF of every configured TP/SL cell.",
      "Validation PF pools only configs passing their own recorded configEval. Seated PF uses that step's actual Real IDs too.",
      "Historical validation windows overlap across steps and configurations; never sum them as distinct executed orders.",
      "Execution contains only funded modeled settled closes after Base, own config validation, entry context and execution filters. It is not venue-owned execution.",
      "The baseline all-config capital requirement is infeasible. This audit does not certify live sizing or profitability.",
      "No-loss rows have no finite measured PF; the existing qualifying gate uses score 4. Empty/unknown cohorts remain unavailable.",
    ],
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) throw new Error("audit-micro-stages.mjs SESSION_DIR");
  const result = await stageAudit(dir);
  writeFileSync(`${dir}/filtered-stages.json`, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      base: result.base.rangeRepresentativeEvidence,
      postBase: result.initial,
      executed: result.fundedModeledExecution,
      perRange: result.perRange,
    }),
  );
}
