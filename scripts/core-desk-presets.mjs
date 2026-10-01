#!/usr/bin/env node
// Builds the desk presets (src/core/presets.desk.ts) from complete simulated trading sessions on real BingX data.
// Every candidate (settings + walk-forward patch) runs the ENGINE itself (scripts/core-session.mjs) over several
// separate windows (--windows "0,24,48" = the last 24 h, the 24 h before, …). A candidate is kept when it is
// positive (PF ≥ --min-pf, net > 0) over the windows together; its measured results travel with the preset.
//
//   node scripts/core-desk-presets.mjs --candidates docs/desk-candidates.json [--symbols 16] [--pre 12] [--run 24]
//        [--windows 0,24,48] [--out docs/desk-presets] [--min-pf 1.0]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const candidates = JSON.parse(readFileSync(arg("candidates", "docs/desk-candidates.json"), "utf8"));
const symbols = arg("symbols", "16");
const pre = arg("pre", "12");
const run = Number(arg("run", 24));
const windows = arg("windows", "0,24,48").split(",").map(Number);
const out = arg("out", "docs/desk-presets");
const minPf = Number(arg("min-pf", 1.3));
const cache = arg("cache-dir", "runs/desk");
mkdirSync(cache, { recursive: true });

const results = [];
for (const c of candidates) {
  const per = [];
  for (const ago of windows) {
    const file = `${cache}/${c.id}-ago${ago}`;
    if (!existsSync(`${file}.json`)) {
      process.stderr.write(`${c.id} · window ending ${ago} h ago …\n`);
      try {
        execFileSync(
          process.execPath,
          [
            "--experimental-strip-types",
            "--no-warnings",
            "scripts/core-session.mjs",
            "--symbols",
            String(c.symbols ?? symbols),
            "--pre",
            pre,
            "--run",
            String(run),
            ...(ago ? ["--end-ago", String(ago)] : []),
            "--settings",
            JSON.stringify(c.settings ?? {}),
            "--wf",
            JSON.stringify(c.wf ?? {}),
            "--out",
            file,
          ],
          { stdio: ["ignore", "ignore", "inherit"], maxBuffer: 1 << 26 },
        );
      } catch (err) {
        process.stderr.write(`  failed: ${err instanceof Error ? err.message.split("\n")[0] : err}\n`);
        continue;
      }
    }
    const r = JSON.parse(readFileSync(`${file}.json`, "utf8"));
    const hours = r.hours.filter((h) => !h.partial);
    per.push({
      ago,
      from: r.window.startT,
      to: r.window.endT,
      pf: r.total.pf,
      n: r.total.orders,
      wr: r.total.wr,
      netPct: ((r.total.balanceEnd - r.settings.balance0) / r.settings.balance0) * 100,
      ddPct: r.total.equityMaxDdPct * 100,
      ddtH: r.total.ddtH,
      greenHours: hours.length ? hours.filter((h) => h.net > 0).length / hours.length : 0,
      gp: r.hours.reduce((a, h) => a + h.gp, 0),
      gl: r.hours.reduce((a, h) => a + h.gl, 0),
      ranges: r.ranges,
      rssMb: r.engine.rssMaxMb,
      computeMs: r.engine.computeMs,
    });
  }
  if (!per.length) continue;
  const gp = per.reduce((a, x) => a + x.gp, 0);
  const gl = per.reduce((a, x) => a + x.gl, 0);
  const n = per.reduce((a, x) => a + x.n, 0);
  const spanH = per.length * run;
  const agg = {
    pf: gl > 1e-12 ? gp / gl : gp > 0 ? 99 : 0,
    n,
    perDay: (n * 24) / spanH,
    wr: per.reduce((a, x) => a + x.wr * x.n, 0) / Math.max(1, n),
    netPct: per.reduce((a, x) => a + x.netPct, 0),
    worstPf: Math.min(...per.map((x) => x.pf)),
    maxDdPct: Math.max(...per.map((x) => x.ddPct)),
    greenHours: per.reduce((a, x) => a + x.greenHours, 0) / per.length,
    positiveRuns: per.filter((x) => x.netPct > 0).length,
    runs: per.length,
    ddtH: Math.max(...per.map((x) => x.ddtH)),
  };
  // kept: PF over the windows together at least min PF, net positive, positive in at least 2 of 3 windows;
  // experiments (e.g. a stop-floor variant) are measured and reported, never offered as a preset
  const kept =
    !c.experiment && agg.pf >= minPf && agg.netPct > 0 && agg.positiveRuns >= Math.ceil((agg.runs * 2) / 3);
  results.push({ ...c, per, agg, kept });
}

const d = (t) => new Date(t).toISOString().slice(0, 16).replace("T", " ");
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const md = [
  `# Desk presets — measured on complete simulated sessions`,
  ``,
  `${symbols} symbols, ${pre} h pre-historic + ${run} h simulated per window, windows ending ${windows.join(" / ")} h ago. Real BingX 1m data, 0.20 % round-trip cost on every close, $10 balance, 2 % of equity per order at 10×. A preset is kept when the windows together clear PF ${minPf} with a positive net and at least two of three windows are positive; experiments are reported only.`,
  ``,
  `| preset | kept | PF (all) | worst PF | orders / day | WR | net % (sum) | max equity DD % | green hours | positive windows |`,
  `|---|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
  ...results.map(
    (r) =>
      `| ${r.label} | ${r.kept ? "yes" : "no"} | ${f2(r.agg.pf)} | ${f2(r.agg.worstPf)} | ${f2(r.agg.perDay)} | ${f2(r.agg.wr * 100)} % | ${f2(r.agg.netPct)} | ${f2(r.agg.maxDdPct)} | ${Math.round(r.agg.greenHours * 100)} % | ${r.agg.positiveRuns} / ${r.agg.runs} |`,
  ),
  ``,
  ...results.flatMap((r) => [
    `## ${r.label}`,
    ``,
    r.info,
    ``,
    `| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |`,
    `|---|---:|---:|---:|---:|---:|---:|---|---:|---:|`,
    ...r.per.map(
      (x) =>
        `| ${d(x.from)} → ${d(x.to)} | ${f2(x.pf)} | ${x.n} | ${f2(x.wr * 100)} % | ${f2(x.netPct)} | ${f2(x.ddPct)} | ${Math.round(x.greenHours * 100)} % | ${Object.entries(
          x.ranges ?? {},
        )
          .filter(([, v]) => v.n)
          .map(([k, v]) => `${k} ${v.n} · ${f2(v.pf)}`)
          .join(", ") || "–"} | ${x.rssMb} | ${Math.round(x.computeMs / 1000)} |`,
    ),
    ``,
  ]),
].join("\n");
writeFileSync(`${out}.md`, md + "\n");
writeFileSync(`${out}.json`, JSON.stringify(results, null, 2));

const r3 = (x) => Math.round(x * 1000) / 1000;
const presets = results
  .filter((r) => r.kept)
  .map((r) => ({
    id: `desk-${r.id}`,
    label: r.label,
    info: r.info,
    kind: "research",
    at: Date.now(),
    settings: r.settings ?? {},
    wf: r.wf ?? {},
    metrics: {
      pf: r3(r.agg.pf),
      n: r.agg.n,
      perDay: r3(r.agg.perDay),
      wr: r3(r.agg.wr),
      net: r3(r.agg.netPct),
      greenHours: r3(r.agg.greenHours),
      positiveRuns: r.agg.positiveRuns,
      runs: r.agg.runs,
      ddtH: r3(r.agg.ddtH),
      checks: r.per.map((x) => ({
        period: `${d(x.from)} → ${d(x.to)}`,
        label: `${run} h session ending ${x.ago ? `${x.ago} h ago` : "now"}`,
        pf: r3(x.pf),
        n: x.n,
        perDay: r3((x.n * 24) / run),
        greenHours: r3(x.greenHours),
        wr: r3(x.wr),
      })),
      period: `${d(Math.min(...r.per.map((x) => x.from)))} → ${d(Math.max(...r.per.map((x) => x.to)))}`,
      source: `scripts/core-desk-presets.mjs (${symbols} symbols, ${r.per.length} × ${run} h sessions, max equity DD ${f2(r.agg.maxDdPct)} %)`,
    },
  }));
writeFileSync(
  "src/core/presets.desk.ts",
  `// Generated by scripts/core-desk-presets.mjs from ${out}.json — do not edit by hand.\n` +
    `import type { Preset } from "./presets.ts";\n\n` +
    `export const DESK_PRESETS: Preset[] = ${JSON.stringify(presets, null, 2)};\n`,
);
console.log(md);
