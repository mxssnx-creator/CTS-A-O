// Reconcile every funded modeled entry with exact source closes and independent causal own-side qualification.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { readFundedSession } from "../../scripts/lib/session-funded-cohort.mjs";
import { iterateSessionTapeTrades } from "../../scripts/lib/session-dump.mjs";
import { scalarDirectionEval } from "./hourly-progress.mjs";
import { parseConfigId, kindOfId } from "../../src/core/pipeline/pipeline.ts";
const [dir, out] = process.argv.slice(2);
assert.ok(dir && out);
const { raw, trades, funding } = await readFundedSession(`${dir}/raw.json`),
  p = JSON.parse(readFileSync(`${dir}/protocol.json`));
const byCfg = new Map();
for (const x of trades) {
  const xs = byCfg.get(x.cfg) ?? [];
  xs.push(x);
  byCfg.set(x.cfg, xs);
}
const stats = {
  funding,
  orders: trades.length,
  matchedSourceCloses: 0,
  missingSourceCloses: 0,
  failedOwnDirectionAtEntry: 0,
  maxCostError: 0,
  maxSourceUnitReturnError: 0,
  unknownReturns: 0,
};
const violations = [],
  add = (x) => {
    if (violations.length < 100) violations.push(x);
  };
for await (const row of iterateSessionTapeTrades(`${dir}/raw.json`)) {
  const orders = byCfg.get(row.id);
  if (!orders) continue;
  byCfg.delete(row.id);
  const cfg = parseConfigId(row.id);
  assert.ok(cfg);
  const key = (x) => JSON.stringify([x[0], x[1], x[2], x[3]]),
    candidates = new Map(row.trades.map((x) => [key(x), x]));
  for (const x of orders) {
    const unit =
      x.unitR !== undefined
        ? x.unitR
        : typeof x.mult === "number" && Number.isFinite(x.mult) && x.mult > 0
          ? x.r / x.mult
          : NaN;
    if (!Number.isFinite(unit)) {
      stats.unknownReturns++;
      add({ type: "unknown-return", x });
      continue;
    }
    const own = row.trades.filter((y) => y[1] === x.side),
      expected = scalarDirectionEval(
        own,
        x.entryT,
        p.actualWf,
        cfg.protect,
        kindOfId(row.id),
        cfg.ind,
      );
    if (!expected.ok) {
      stats.failedOwnDirectionAtEntry++;
      add({ type: "unqualified-own-direction", x, expected });
    }
    const source = candidates.get(key([x.sym, x.side, x.entryT, x.exitT]));
    if (!source) {
      stats.missingSourceCloses++;
      add({ type: "missing-source-close", x });
    } else {
      stats.matchedSourceCloses++;
      const err = Math.abs(source[4] - unit);
      stats.maxSourceUnitReturnError = Math.max(stats.maxSourceUnitReturnError, err);
      if (err > 2e-7) add({ type: "source-return-mismatch", x, source });
    }
    const err = Math.abs((x.side * (x.exit - x.entry)) / x.entry - unit - p.actualSettings.cost);
    stats.maxCostError = Math.max(stats.maxCostError, err);
    if (err > 2e-7) add({ type: "cost-price-mismatch", x, err });
  }
}
for (const orders of byCfg.values()) {
  stats.missingSourceCloses += orders.length;
  add({ type: "missing-config", id: orders[0].cfg });
}
writeFileSync(
  out,
  JSON.stringify(
    {
      classification:
        "Exact funded modeled entries against saved candidate net closes and independent own-side historical PF/Last-N gates. This does not reconstruct unexported Base cell metadata or venue-owned fills.",
      study: raw.study,
      stats,
      violations,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(stats));
assert.equal(violations.length, 0, "Funded entry qualification/source reconciliation failed");
