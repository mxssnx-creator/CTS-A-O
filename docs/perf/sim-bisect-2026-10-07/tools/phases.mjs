// per-compute phase seconds from the [N s] <state> <phase> progress lines (30 s sampling: ±30 s each)
import { readFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split("\n");
const rows = []; let comp = 0; const out = [];
for (const l of lines) {
  const m = l.match(/^\s+\[(\d+) s\] (\S+) (\S+)/); if (!m) continue;
  const t = +m[1]; let state = m[2], phase = m[3];
  if (state === "backfill") phase = "backfill";
  if (state === "running") phase = "running";
  const c = +(l.match(/computes (\d+)/)?.[1] ?? 0);
  rows.push({ t, phase, c, cores: l.match(/on (\d+) cores/)?.[1], combos: l.match(/(\d+) combos/)?.[1], pairs: l.match(/(\d+) pairs/)?.[1] });
}
// phase spans: from first sample of a phase to first sample of the next phase
const spans = [];
for (let i = 0; i < rows.length; i++) {
  const r = rows[i], p = spans[spans.length - 1];
  if (p && p.phase === r.phase && p.c === r.c) { p.end = rows[i + 1]?.t ?? r.t; Object.assign(p.info, Object.fromEntries(Object.entries({ cores: r.cores, combos: r.combos, pairs: r.pairs }).filter(([, v]) => v))); continue; }
  spans.push({ phase: r.phase, c: r.c, start: r.t, end: rows[i + 1]?.t ?? r.t, info: Object.fromEntries(Object.entries({ cores: r.cores, combos: r.combos, pairs: r.pairs }).filter(([, v]) => v)) });
}
for (const s of spans) console.log(`compute#${s.c + (s.phase === "running" ? 0 : 1)}\t${s.phase}\t${s.start}-${s.end}\t${s.end - s.start} s\t${JSON.stringify(s.info)}`);
