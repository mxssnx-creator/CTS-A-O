#!/usr/bin/env node
// CTS-A-O — the final report of a live test run: one complete section per config set (desk), independent of the
// others. Reads every desk's status.json (scripts/core-live-test.mjs), its settings, and its exchange result by
// its own client ids (scripts/core-live-report.mjs --out <dir>/exchange-<tag>.json).
//
//   node scripts/core-live-final.mjs --dir runs/full --out docs/live-vst-full.md [--notes notes.md]
// With started.log in the run directory (one line per desk launch, "--- reason" lines for restarts of every desk)
// the report lists the run history; --notes appends a markdown file (e.g. the issues found and fixed).
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const dir = arg("dir", "runs/full");
const out = arg("out", "docs/live-vst-full.md");
const f2 = (x) => (typeof x === "number" && Number.isFinite(x) ? x.toFixed(2) : "–");
const pct = (x) => (typeof x === "number" && Number.isFinite(x) ? `${(x * 100).toFixed(0)} %` : "–");
const d = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace("T", " ") : "–");
const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

const names = readdirSync(dir)
  .filter((x) => x.startsWith("live-") && existsSync(join(dir, x, "status.json")))
  .map((x) => x.slice(5));
const lines = [
  `# Live test on BingX VST (x02) — every config set, independently`,
  ``,
  `Each config set ran as its own desk with its own tracking tag, on its own slice of the symbol ranking, at minimum volume (each order at the contract's exchange minimum, at most $10 per position). The desks were checked every 10 minutes. Exchange results are read back by each tag's own client ids (fills, realized profit, fees). Simulation numbers use the engine's 0.20 % round-trip cost.`,
  ``,
  `What each number covers:`,
  ``,
  `- **Live** (own orders, positions, won, live PF, net, fees, and the exchange tables): every own order of the tag on the exchange over the whole run, across restarts, including the closes at the end.`,
  `- **Paper** (paper PF · closes): the paper book's closes since the desk's last start.`,
  `- **Simulated**: the last compute — the simulated run PF and orders, the seats, and the indication-type tables over the simulated window.`,
  `- **Hours**: the desk's last process segment (see the run history).`,
  ``,
  `## Overview`,
  ``,
  `| desk | tag | symbols | last segment h | computes | sim PF · orders | seats | paper PF · closes | live PF | own orders | positions (open) | won | live net USDT | fees USDT |`,
  `|---|---|---|---:|---:|---|---:|---|---:|---:|---:|---:|---:|---:|`,
];
const sections = [];
for (const name of names) {
  const s = read(join(dir, `live-${name}`, "status.json"));
  const cfg = read(join(dir, `${name}.json`)) ?? {};
  const ex = read(join(dir, `exchange-${s.tag}.json`)) ?? s.exchange ?? null;
  const k = ex?.byKind ?? {};
  const tot = Object.values(k).reduce(
    (a, v) => ({ pos: a.pos + v.positions, won: a.won + v.wins, gp: a.gp + v.gp, gl: a.gl + v.gl, net: a.net + v.net, fee: a.fee - v.fee }),
    { pos: 0, won: 0, gp: 0, gl: 0, net: 0, fee: 0 },
  );
  const open = (ex?.positions ?? []).filter((x) => x.open).length;
  const exPf = tot.gl > 1e-12 ? tot.gp / tot.gl : tot.gp > 0 ? Infinity : 0;
  // paper: every range's closes of this desk together
  const pp = Object.values(s.paper ?? {}).reduce((a, v) => ({ n: a.n + v.n, gp: a.gp + v.gp, gl: a.gl + v.gl }), { n: 0, gp: 0, gl: 0 });
  const paperPf = pp.gl > 1e-12 ? pp.gp / pp.gl : pp.gp > 0 ? Infinity : 0;
  lines.push(
    `| ${name} | ${s.tag} | ${(s.symbols ?? []).length} (${cfg.symbolOffset ?? 0}+) | ${f2(s.hours)} | ${s.engine?.computes ?? 0} | ${f2(s.engine?.sim?.pf)} · ${s.engine?.sim?.n ?? 0} | ${s.engine?.real ?? 0} | ${pp.n ? `${Number.isFinite(paperPf) ? f2(paperPf) : "∞"} · ${pp.n}` : "–"} | ${tot.pos ? (Number.isFinite(exPf) ? f2(exPf) : "∞") : "–"} | ${ex?.orders ?? 0} | ${tot.pos} (${open}) | ${tot.won} | ${f2(tot.net)} | ${f2(tot.fee)} |`,
  );
  const g = cfg.grid ?? {};
  const ranges = [
    g.tp?.length ? `wide TP ${g.tp.map((x) => (x * 100).toFixed(1)).join("/")} %` : "wide off",
    g.short ? `short ${g.short.tp.length}×${g.short.slOfTp.length}×${g.short.trailOfTp.length}` : null,
    g.minimal ? `minimal ${g.minimal.tp.length}×${g.minimal.slOfTp.length}×${g.minimal.trailOfTp.length}` : null,
    g.micro ? `micro ${g.micro.tp.length}×${g.micro.slOfTp.length}×${g.micro.trailOfTp.length}` : null,
    g.minimalPlus?.enabled ? `plus ${g.minimalPlus.cells?.length ?? 0} cells` : null,
  ].filter(Boolean);
  const ind = s.indications;
  const kinds = ind ? [...new Set([...Object.keys(ind.base ?? {}), ...Object.keys(ind.executed ?? {})])].sort() : [];
  sections.push(
    `## ${name} (${s.tag})`,
    ``,
    `**Settings.** ${(s.symbols ?? []).length} symbols (${(s.symbols ?? []).join(", ")}); focus ${cfg.focus === undefined ? "default set" : cfg.focus.length ? `${cfg.focus.length} pairs` : "every indication × bot"}; ${ranges.join(", ")}; range gate ${g.rangeGate?.enabled === false ? "off" : "on"}, fit ${g.rangeFit?.enabled === false ? "off" : "on"}, range seats ${g.rangeSeats ? "on" : "off"}; toggles ${Object.entries(cfg.toggles ?? {}).filter(([, v]) => v).map(([x]) => x).join(", ") || "default"}; min PF ${cfg.gates?.minPf ?? "default"}; probe ${s.probe ? `top ${s.probe.perRange} per range` : "off"}; cycle ${cfg.cycleMs ?? 250} ms.`,
    ``,
    `**Engine.** ${s.engine?.computes ?? 0} computes (last ${Math.round((s.engine?.lastComputeMs ?? 0) / 1000)} s), state ${s.engine?.state}, simulated run PF ${f2(s.engine?.sim?.pf)} over ${s.engine?.sim?.n ?? 0} orders, ${s.engine?.real ?? 0} seats; memory ${s.mem?.rssMb ?? "–"} MB; live step: ${s.live?.reason ?? "–"}.`,
    ``,
    `### By indication type (simulated window ${d(ind?.window?.startT)} → ${d(ind?.window?.endT)} UTC)`,
    ``,
    ind
      ? [
          `| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |`,
          `|---|---|---|---|---:|---:|---:|`,
          ...kinds.map((t) => {
            const b = ind.base?.[t];
            const e = ind.evaluated?.[t];
            const x = ind.executed?.[t];
            return `| ${t} | ${b ? `${b.configs} · ${b.positive} · ${b.closes} · ${f2(b.pf)}` : "–"} | ${e ? `${e.configs} · ${e.closes} · ${f2(e.pf)}` : "–"} | ${x ? `${x.orders} · ${x.positions} · ${f2(x.pf)} · ${pct(x.wr)}` : "–"} | ${x ? pct(x.greenHours) : "–"} | ${x ? `${f2(x.ddtH)} h` : "–"} | ${x ? f2(x.equityDdPct) : "–"} |`;
          }),
        ].join("\n")
      : `No simulated run yet.`,
    ``,
    `### Exchange, by own client ids`,
    ``,
    Object.keys(k).length
      ? [
          `| range (id letter) | positions | won | PF | net USDT | fees USDT | fee % of notional |`,
          `|---|---:|---:|---:|---:|---:|---:|`,
          ...Object.entries(k).map(
            ([r, v]) => `| ${r} | ${v.positions} | ${v.wins} | ${f2(v.pf)} | ${f2(v.net)} | ${f2(-v.fee)} | ${f2(v.feePct)} |`,
          ),
        ].join("\n")
      : `No own order reached the exchange.`,
    ``,
    (ex?.positions ?? []).length
      ? [
          `| symbol | side | range | opened | last | orders | net USDT | open |`,
          `|---|---|---|---|---|---:|---:|---|`,
          ...ex.positions.map(
            (p) => `| ${p.sym} | ${p.side} | ${p.kind} | ${d(p.first)} | ${d(p.last)} | ${p.orders} | ${f2(p.net)} | ${p.open ? "yes" : "no"} |`,
          ),
        ].join("\n")
      : ``,
    ``,
    `**Paper closes during the run (range: closes · PF · $ at the live unit).** ${
      Object.entries(s.paper ?? {})
        .map(([r, a]) => `${r}: ${a.n} · ${f2(a.pf)} · ${f2(a.usd)}`)
        .join("; ") || "none"
    }.`,
    ``,
  );
}
const started = existsSync(join(dir, "started.log")) ? readFileSync(join(dir, "started.log"), "utf8") : "";
const restarts = [...started.matchAll(/^(\d\d:\d\d:\d\d) --- (.+)$/gm)].map((m) => `- ${m[1]} UTC — ${m[2]}`);
const single = [...started.matchAll(/^(\d\d:\d\d:\d\d) restarted (\S+) \((\S+)\) pid \d+ heap (\d+) \((.+)\)$/gm)].map(
  (m) => `- ${m[1]} UTC — ${m[2]} (${m[3]}) alone, heap ${m[4]} MB: ${m[5]}`,
);
const notesPath = arg("notes", "");
const notes = notesPath && existsSync(notesPath) ? readFileSync(notesPath, "utf8").trim() : "";
const monitor = existsSync(join(dir, "monitor.md")) ? readFileSync(join(dir, "monitor.md"), "utf8") : "";
const problems = [...monitor.matchAll(/^- (.+)$/gm)].map((m) => m[1]);
writeFileSync(
  out,
  [
    ...lines,
    ``,
    ...sections,
    ...(restarts.length || single.length
      ? [
          `## Run history`,
          ``,
          `Every desk keeps its state and order ledger across a restart (its own client ids stay the same tag).`,
          ``,
          ...(restarts.length ? [`Restarts of every desk:`, ``, ...restarts, ``] : []),
          ...(single.length ? [`Restarts of one desk:`, ``, ...single, ``] : []),
        ]
      : []),
    ...(notes ? [notes, ``] : []),
    `## Monitoring`,
    ``,
    `${(monitor.match(/^## /gm) ?? []).length} rounds (every 10 min). ${problems.length ? `Problems reported:` : `No problem reported.`}`,
    ``,
    ...[...new Set(problems)].map((x) => `- ${x}`),
    ``,
  ].join("\n"),
);
console.log(`wrote ${out}: ${names.length} desks`);
