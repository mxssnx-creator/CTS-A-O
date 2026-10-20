#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { readSessionDump, iterateSessionTapeTrades } from "./lib/session-dump.mjs";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
import { parseConfigId } from "../src/core/pipeline/pipeline.ts";
import { makeTape, configEval, engineContextValid } from "../src/core/sim/walkforward.ts";
const dir = resolve("runs/micro-legacy-comparison"),
  out = resolve("docs/micro-legacy-2026-10-20");
const paths = {
  original:
    "/workspace/scratch/74aec7d6017a/CTS-A-O/runs/postbase-default-focus-24h-pre-6h-run-20261019-raw.json",
  reference: `${dir}/reference/raw.json`,
  current: `${dir}/current/raw.json`,
};
const cohort = (trades) => {
  let gp = 0,
    gl = 0;
  for (const t of trades) {
    const r = modeledUnitReturn(t);
    assert.ok(Number.isFinite(r));
    gp += Math.max(r, 0);
    gl += Math.max(-r, 0);
  }
  return {
    closes: trades.length,
    gp,
    gl,
    pf: trades.length && gl ? gp / gl : null,
    pfState: !trades.length ? "empty" : !gl ? "no-loss-gate-score-4" : "measured",
  };
};
const key = (t) => JSON.stringify([t.cfg, t.sym, t.side, t.entryT, t.exitT, t.reason]);
const sources = {};
for (const [name, path] of Object.entries(paths)) {
  const meta = JSON.parse(readFileSync(path));
  for (const sidecar of [
    meta.tapeTradesSidecar,
    meta.validationSidecar,
    ...Object.values(meta.arraySidecars ?? {}),
  ])
    for (const chunk of sidecar?.chunks ?? []) {
      const bytes = readFileSync(resolve(dirname(path), chunk.path));
      assert.equal(bytes.length, chunk.bytes);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), chunk.sha256);
    }
  const raw = await readSessionDump(path, { fields: ["trades"] });
  sources[name] = {
    raw,
    receipt: {
      rawSha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
      cost: raw.settings.effective.cost,
      window: raw.window,
      all: cohort(raw.trades),
      ordinary: cohort(raw.trades.filter((t) => t.kind !== "exit")),
      exit: cohort(raw.trades.filter((t) => t.kind === "exit")),
    },
  };
}
const a = new Map(sources.reference.raw.trades.map((t) => [key(t), t])),
  b = new Map(sources.current.raw.trades.map((t) => [key(t), t]));
const shared = [],
  added = [],
  removed = [];
for (const [k, t] of b) {
  const old = a.get(k);
  if (!old) added.push(t);
  else {
    assert.ok(Math.abs(modeledUnitReturn(t) - modeledUnitReturn(old)) < 1e-9, k);
    shared.push(t);
  }
}
for (const [k, t] of a) if (!b.has(k)) removed.push(t);
const p = JSON.parse(readFileSync(`${dir}/current/protocol.json`));
const current = sources.current.raw,
  executed = new Map(current.trades.map((t) => [t.cfg, t.kind])),
  tapes = new Map();
for await (const row of iterateSessionTapeTrades(paths.current)) {
  if (!executed.has(row.id)) continue;
  const cfg = parseConfigId(row.id);
  assert.ok(cfg);
  const trades = row.trades.map(([sym, side, entryT, exitT, r]) => ({
    cfg: row.id,
    sym,
    side,
    entryT,
    exitT,
    r,
    entry: 1,
    exit: 1,
    reason: "time",
    bars: 1,
    mfe: 0,
    mae: 0,
  }));
  tapes.set(
    row.id,
    makeTape(
      row.id,
      cfg.bot,
      cfg.ind,
      cfg.protect,
      executed.get(row.id),
      [...new Set(trades.map((t) => t.sym))],
      trades,
      [],
      [],
    ),
  );
}
const checks = [];
for (const t of current.trades) {
  const tape = tapes.get(t.cfg);
  assert.ok(tape);
  const ev = configEval(tape, t.entryT, p.wf);
  const ctx = engineContextValid(tape, t.entryT, p.wf, t.sym, t.side);
  checks.push({
    cfg: t.cfg,
    sym: t.sym,
    side: t.side,
    entryT: t.entryT,
    ok: ev.ok && ctx,
    config: ev.ok,
    context: ctx,
    fail: ev.ok ? null : ev.fail,
  });
}
const removedOrdinaryDecisions = removed
  .filter((t) => t.kind !== "exit")
  .map((t) => {
    const tp = tapes.get(t.cfg);
    const ev = tp ? configEval(tp, t.entryT, p.wf) : null;
    return {
      cfg: t.cfg,
      sym: t.sym,
      side: t.side,
      entryT: t.entryT,
      config: ev,
      context: tp ? engineContextValid(tp, t.entryT, p.wf, t.sym, t.side) : null,
    };
  });
const result = {
  schema: "cts-micro-legacy-comparison-v1",
  feedSha256: p.feed.sha256,
  verifiedOriginalClosePrices: 3330,
  referenceCheckpoint: "15c31e5ea86d930c6c25c25bf9c51801ba15382b",
  currentSourceSha256: p.source.sha256,
  sources: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v.receipt])),
  paired: {
    identicalTradeKeysAndUnitReturns: shared.length,
    shared: cohort(shared),
    added: cohort(added),
    removed: cohort(removed),
    addedOrdinary: cohort(added.filter((t) => t.kind !== "exit")),
    removedOrdinary: cohort(removed.filter((t) => t.kind !== "exit")),
    addedKinds: [...new Set(added.map((t) => t.kind))],
    removedKinds: [...new Set(removed.map((t) => t.kind))],
  },
  removedOrdinaryDecisions,
  currentEntryChecks: { checked: checks.length, violations: checks.filter((t) => !t.ok) },
  notes: [
    "Original report used 0.20% modeled costs. Both reconstructed source runs use identical 0.15% costs, fixed original Focus/settings and identical native prices/window; lowering costs also changes target discovery and therefore selection.",
    "The original report lacks a source manifest. The handoff checkpoint is a reconstructed reference, not authentication of the original source bytes.",
    "Current independent Historic Exit discovery and qualification differ from the earlier checkpoint; report ordinary and Exit samples separately.",
    "Original and paired runs use the original uncapped 2% account fraction for comparison only. They exceed margin/equity and are not feasible deployment sizing.",
    "Neither aggregate positive PF nor individual config selection on an already examined six-hour window establishes profitability on another window.",
  ],
};
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/comparison.json`, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
assert.equal(
  result.currentEntryChecks.violations.length,
  0,
  "current own-config/context gate violation",
);
