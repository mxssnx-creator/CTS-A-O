// Scratch research harness. The native tapes, qualification and market window are common to every arm.
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { walkForward } from "../../src/core/sim/walkforward.ts";
import { modeledUnitReturn } from "../../src/core/metrics/stats.ts";

const sourcesConfig = { config: true, overall: false, symbol: false, direction: false,
  indication: false, strategy: false, coordination: false, range: false };
const sourcesAll = Object.fromEntries(Object.keys(sourcesConfig).map(k => [k, true]));
const sourcesOverall = { ...sourcesConfig, config: false, overall: true };
const arms = [
  { id: "off", enabled: false },
  ...[2, 3, 4, 5, 10].map(steps => ({ id: `config-r02-s${steps}`, enabled: true, auto: false, ratio: 0.2, steps, sources: sourcesConfig })),
  { id: "config-r06-s5", enabled: true, auto: false, ratio: 0.6, steps: 5, sources: sourcesConfig },
  { id: "config-r26-s5", enabled: true, auto: false, ratio: 2.6, steps: 5, sources: sourcesConfig },
  ...[2, 3, 4, 5, 10].map(steps => ({ id: `overall-r02-s${steps}`, enabled: true, auto: false,
    ratio: 0.2, steps, sources: sourcesOverall })),
  ...[2, 3, 4, 10].map(steps => ({ id: `additive-all-r02-s${steps}`, enabled: true, auto: false,
    ratio: 0.2, steps, sources: sourcesAll, mode: "additive" })),
  ...[0.6, 2.6].map(ratio => ({ id: `additive-all-r${String(ratio).replace(".", "")}-s5`, enabled: true,
    auto: false, ratio, steps: 5, sources: sourcesAll, mode: "additive" })),
  { id: "additive-all-r02-s5", enabled: true, auto: false, ratio: 0.2, steps: 5, sources: sourcesAll, mode: "additive" },
  { id: "shared-all-r02-s5", enabled: true, auto: false, ratio: 0.2, steps: 5, sources: sourcesAll, mode: "shared" },
  { id: "config-active2-r02-s5", enabled: true, auto: false, ratio: 0.2, steps: 5, sources: sourcesConfig, activeStep: 2 },
  { id: "auto-all", enabled: true, auto: true, sources: sourcesAll },
];
const digest = x => createHash("sha256").update(JSON.stringify({ trades: x.trades, open: x.openAtEnd ?? [],
  steps: x.steps, skips: x.skips })).digest("hex");
const stats = rows => {
  let gp = 0, gl = 0, wins = 0, unknown = 0;
  for (const row of rows) {
    const r = modeledUnitReturn(row);
    if (!Number.isFinite(r)) { unknown++; continue; }
    if (r > 0) { gp += r; wins++; }
    else gl -= r;
  }
  return { n: rows.length, wins, positiveRate: rows.length && !unknown ? wins / rows.length : null,
    pf: rows.length && !unknown && gl > 0 ? gp / gl : null,
    pfState: unknown ? "unavailable" : !rows.length ? "empty" : gl ? "ratio" : gp ? "no-loss" : "flat", unknown };
};

export async function captureRelateExperiment(rt, sim, raw, out) {
  if (raw.engine.universe?.length !== 12 || rt.candles.size !== 12 || sim.endT - sim.startT !== 24 * 3600000)
    throw new Error("Relate experiment requires the complete twelve-symbol, 24-hour session");
  const mem = raw.engine.mem;
  if (!mem || (mem.computeLevel ?? 0) !== 0 || (mem.fallback ?? 0) !== 0 || (mem.aborts ?? 0) !== 0)
    throw new Error("Relate experiment refuses missing or degraded memory coverage");
  const base = sim.opts;
  const u = { bars: [], caches: [], startT: 0, endT: 0, splitT: 0,
    nowT: base.startT === undefined ? sim.endT : (rt.lastUniverse?.nowT ?? sim.endT),
    baseTf: rt.lastUniverse?.baseTf ?? 1 };
  const replay = walkForward(u, rt.tapes, { ...base, protects: [], dcaProtects: [] });
  if (digest(replay) !== digest(sim)) throw new Error("Frozen tape replay did not reproduce the native off baseline");
  const rows = [];
  for (const arm of arms) {
    const start = performance.now();
    const relate = { ...base.relate, ...arm, lastN: 250, minTrades: 60, minPf: 1.5, maxStack: 250 };
    delete relate.id;
    const opts = { ...base, protects: [], dcaProtects: [], relate };
    const variant = arm.id === "off" ? replay : walkForward(u, rt.tapes, opts);
    const highest = !arm.enabled || arm.auto ? null : stats(variant.trades.filter(t =>
      Object.values(t.relateParts ?? {}).some(p => !p.shadow && p.level === arm.steps)));
    const row = { arm: arm.id, relate, settledVirtual: stats(variant.trades), highestStepVirtual: highest,
      openVirtual: variant.openAtEnd?.length ?? 0, ms: +(performance.now() - start).toFixed(2),
      shadowCloses: variant.relate?.shadowCloses ?? 0 };
    rows.push(row);
    const armRaw = { ...raw,
      settings: { ...raw.settings, relate, effective: { ...raw.settings.effective, relate } },
      trades: [...variant.trades].sort((a, b) => a.exitT - b.exitT),
      openEnd: (variant.openAtEnd ?? []).map(x => ({ cfg: x.cfg, sym: x.sym, side: x.side,
        entryT: x.entryT, entry: x.entry, mtmR: x.r, kind: x.kind, vol: x.vol, mult: x.mult,
        level: x.level, legs: x.legs, src: x.src, coordVol: x.coordVol,
        ...(x.unitR !== undefined ? { unitR: x.unitR } : {}) })),
      validation: (variant.steps ?? []).filter(x => x.checks).map(x => ({ t: x.t, real: x.real, checks: x.checks })),
      stepsByRange: (variant.steps ?? []).map(x => ({ t: x.t, byRange: x.byRange ?? null })),
      tapeTrades: [], variants: null,
      engine: { ...raw.engine, skips: variant.skips, skipsByRange: variant.skipsByRange, skipPf: variant.skipPf },
      relateExperiment: { ...row, baselineDigest: digest(sim), replayDigest: digest(replay),
        note: "Exploratory native modeled execution on common frozen tapes. Common Base and coverage diagnostics; no venue fills or independent holdout." } };
    mkdirSync(join(out, arm.id), { recursive: true });
    writeFileSync(join(out, arm.id, "raw.json"), JSON.stringify(armRaw));
    writeFileSync(join(out, "arms-progress.json"), JSON.stringify(rows, null, 2));
    process.stderr.write(`Relate ${arm.id}: ${row.settledVirtual.n} virtual closes, ${row.openVirtual} open, ${row.ms}ms\n`);
  }
  writeFileSync(join(out, "arms-complete.json"), JSON.stringify({ baselineDigest: digest(sim), rows }, null, 2));
}
