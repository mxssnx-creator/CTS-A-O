#!/usr/bin/env node
// The 12-hour test trade simulation of the families with a positive D1 profit factor (runs/eval/*.json, PF at 0.2 % > 1):
// one causal session (6 h pre-calculated, 12 h simulated) with every positive family on, then the trades by hour and by
// family. The window ends at the last closed hour of the feed (2026-10-11T12:00Z by default), so it runs partly after the
// freeze: it is a test of the positive types, not a holdout verdict.
//
//   node --experimental-strip-types scripts/sim-positive-types.mjs [--end-at 2026-10-11T12:00:00Z] [--pre 6] [--run 12]
//        [--feed runs/eval/feed.json] [--min-pf 1] [--min-trades 1] [--out docs/sims/positive-types-12h-2026-10-11]
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { admit, availMb } from "./lib/mem-admission.mjs";
import { join } from "node:path";
import { positiveTypesReport } from "./lib/positive-types-report.mjs";
import { readSessionDump } from "./lib/session-dump.mjs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const END = arg("end-at", "2026-10-11T12:00:00Z");
const PRE = arg("pre", "6");
const RUN = arg("run", "12");
const FEED = arg("feed", "runs/eval/feed.json");
const MIN_PF = Number(arg("min-pf", "1"));
const MIN_TRADES = Number(arg("min-trades", "1"));
const OUT = arg("out", "docs/sims/positive-types-12h-2026-10-11");
const DUMP = join("runs", "sim12h", "positive-types.json");

// 1. the positive families from the D1 evaluation
// (the family files only: a feed is not a family — feed120.json, 318 MB, was parsed here and held through the session)
const fams = readdirSync("runs/eval")
  .filter((f) => f.endsWith(".json") && !f.startsWith("feed"))
  .map((f) => JSON.parse(readFileSync(join("runs/eval", f), "utf8")))
  .filter((x) => x.stress?.available === true && x.pfBasis === "unit-net-returns" && x.stats && Number.isFinite(x.stats.pf02) && x.stats.pf02 > MIN_PF && x.stats.trades >= MIN_TRADES)
  .sort((a, b) => b.stats.pf02 - a.stats.pf02);
if (!fams.length) {
  console.log("no family has a positive D1 PF with available stress price-basis evidence: nothing to simulate");
  process.exit(0);
}
const labels = fams.map((f) => f.label);
console.log(
  `positive families (D1 PF at 0.2% > ${MIN_PF}, ≥ ${MIN_TRADES} trades): ${labels.length}`,
);

// 2. one causal session with all of them on: 6 h pre, 12 h run, the windows ending at END
mkdirSync(join("runs", "sim12h"), { recursive: true });
const env = {
  ...process.env,
  CTS_CORE_FAMILY: labels.join(";"),
  CTS_CORE_VARIANTS: "0",
  CTS_CORE_COMPARE: "0",
  CTS_CORE_WORKERS: "2",
  MALLOC_ARENA_MAX: "2",
  MALLOC_MMAP_THRESHOLD_: "1048576",
};
// the session starts once the host can give it its expected peak and keep CTS_EVAL_RESERVE_MB for the live desk
// (scripts/lib/mem-admission.mjs)
{
  const { cgroupAvailMb } = await import("../src/core/server/memguard.server.ts");
  const adm = await admit({
    needMb: statSync(FEED).size > 250e6 ? 7000 : 4000,
    reserveMb: Number(process.env.CTS_EVAL_RESERVE_MB || 3000),
    avail: () => availMb(undefined, cgroupAvailMb),
  });
  if (adm.waitedMs > 1000)
    console.log(
      `waited ${Math.round(adm.waitedMs / 1000)} s for memory (${adm.availMb} MB available)`,
    );
}
const t0 = Date.now();
const r = spawnSync(
  process.execPath,
  [
    "--max-old-space-size=3072",
    "--heap-growing-percent=50",
    "--experimental-strip-types",
    "--no-warnings",
    process.env.CTS_EVAL_SESSION || "scripts/core-session.mjs",
    "--feed",
    FEED,
    "--end-at",
    END,
    "--pre",
    PRE,
    "--run",
    RUN,
    "--symbols",
    "60",
    "--signals",
    labels.some((l) => l.startsWith("sig ")) ? "on" : "off",
    "--toggles",
    JSON.stringify({ dca: false, dcaActive: false, block: false, blockActive: false, axis: false }),
    "--dump",
    DUMP,
    "--dump-only",
    "--quiet",
  ],
  { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
if (r.status !== 0 || !existsSync(DUMP)) {
  console.error(`session failed (exit ${r.status}): ${(r.stderr || "").slice(-400)}`);
  process.exit(1);
}
const sec = (Date.now() - t0) / 1000;

// 3. the trades: by family, and by the hour they exited
const raw = await readSessionDump(DUMP, { loadTapeTrades: false, loadValidation: false, verifyUnloaded: true });
const report = positiveTypesReport(raw);
const f2 = (x) => (x === Infinity ? "∞" : Number.isFinite(x) ? x.toFixed(2) : "unavailable");

const lines = [];
lines.push(
  `# Positive-PF types: 12-hour test simulation (${END} window, ${PRE} h pre, ${RUN} h run)`,
);
lines.push("");
lines.push(
  `Generated ${new Date().toISOString()} · ${labels.length} positive families (D1 PF at 0.2 % > ${MIN_PF}) · ${report.total.n} settled trades · wall ${sec.toFixed(0)} s.`,
);
lines.push("");
lines.push(
  "This is a test simulation, not a holdout verdict: the families were chosen on D1, and the window overlaps the freeze (2026-10-11T11:03Z). Trades are not judged against the criteria; the report's own coverage checks do not apply to a filtered run.",
);
lines.push("");
lines.push(
  `**Overall:** return PF ${f2(report.total.pf)} at the stored cost · net ${f2(report.total.net)} % of notional (sum of one-unit modeled trade returns) · GP ${f2(report.total.gp)} / GL ${f2(report.total.gl)} percentage points.`,
);
lines.push("");
lines.push(
  `All primary summaries use the same settled close sample, with recorded execution multipliers removed once. Endpoint marks are excluded. No-loss return PF is ∞, not a finite measured ratio. Size-weighted simulated diagnostic: PF ${f2(report.sizedSimulation.pf)} · net ${f2(report.sizedSimulation.net)}%. This is simulated evidence; D1 screening statistics are archived inputs, not requalified execution evidence.`,
);
if (report.total.unknownReturns)
  lines.push(
    `Primary return statistics unavailable: ${report.total.unknownReturns} of ${report.total.n} settled closes have unknown unit returns; no subset is substituted.`,
  );
lines.push("");
lines.push("## By family");
lines.push("");
lines.push("| family | D1 PF 0.2 % | D1 trades | 12 h trades | 12 h PF | 12 h net % |");
lines.push("|---|---:|---:|---:|---:|---:|");
for (const f of fams) {
  const s = report.byFamily.find((x) => x.family === f.label);
  lines.push(
    `| ${f.label} | ${f2(f.stats.pf02)} | ${f.stats.trades} | ${s?.n ?? 0} | ${s?.n ? f2(s.pf) : "–"} | ${f2(s ? s.net : 0)} |`,
  );
}
lines.push("");
lines.push("## By hour (exit bar end, UTC; a boundary exit belongs to the preceding hour)");
lines.push("");
lines.push("| hour | trades | PF | net % |");
lines.push("|---|---:|---:|---:|");
for (const s of report.byHour) {
  lines.push(
    `| ${new Date(s.t).toISOString().slice(0, 13)}:00 | ${s.n} | ${f2(s.pf)} | ${f2(s.net)} |`,
  );
}
lines.push("");
lines.push("## Families by 12-hour statistics (botStats)");
lines.push("");
if (report.familyStatsState === "unavailable")
  lines.push(
    `Family stress statistics unavailable for the complete settled sample: ${report.familyStress.reason}. No closed or priceable subset is substituted.`,
  );
lines.push("| family | trades | events | PF 0.2 % | PF 0.4 % | expectancy % | SQN | verdict |");
lines.push("|---|---:|---:|---:|---:|---:|---:|---|");
for (const x of report.familyStats)
  lines.push(
    `| ${x.family} | ${x.trades} | ${x.events} | ${f2(x.pf02)} | ${f2(x.pf04)} | ${(100 * x.expectancy).toFixed(2)} | ${x.sqn.toFixed(2)} | ${x.verdict} |`,
  );
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "README.md"), lines.join("\n") + "\n");
console.log(
  `wrote ${OUT}/README.md: ${report.total.n} trades in ${report.byHour.length} hours, overall return PF ${f2(report.total.pf)}`,
);
