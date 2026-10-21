#!/usr/bin/env node
// Top functions of V8 .cpuprofile files by self time (and by file), merged over the files given.
//   node scripts/cpuprof-top.mjs [--n 40] [--by fn|file] [--incl name] dir-or-file...
// --incl NAME: also prints the inclusive time of every function whose name contains NAME.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  if (i < 0) return d;
  return argv.splice(i, 2)[1];
};
const N = Number(opt("n", 40));
const BY = opt("by", "fn");
const INCL = opt("incl", null);
const LINES = opt("lines", null);
const files = [];
for (const a of argv) {
  if (statSync(a).isDirectory()) {
    for (const f of readdirSync(a)) {
      if (f.endsWith(".cpuprofile")) files.push(join(a, f));
    }
  } else files.push(a);
}
const self = new Map();
const incl = new Map();
const lines = new Map();
let total = 0;
for (const f of files) {
  const p = JSON.parse(readFileSync(f, "utf8"));
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  if (LINES !== null)
    for (const n of p.nodes) {
      if (!n.callFrame.functionName.includes(LINES)) continue;
      const file = n.callFrame.url.replace(/^.*\/(src|scripts)\//, "$1/");
      for (const { line, ticks } of n.positionTicks ?? []) {
        const k = `${file}:${line}`;
        lines.set(k, (lines.get(k) ?? 0) + ticks);
      }
    }
  const dt = new Map();
  for (let i = 0; i < p.samples.length; i++) dt.set(p.samples[i], (dt.get(p.samples[i]) ?? 0) + (p.timeDeltas[i] ?? 0));
  const parent = new Map();
  for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const key = (n) => {
    const cf = n.callFrame;
    const file = cf.url.replace(/^.*\/(src|scripts)\//, "$1/").replace("file://", "");
    return BY === "file" ? file : `${cf.functionName || "(anon)"} ${file}:${cf.lineNumber + 1}`;
  };
  for (const [id, t] of dt) {
    const n = byId.get(id);
    total += t;
    const k = key(n);
    self.set(k, (self.get(k) ?? 0) + t);
    if (INCL !== null) {
      const seen = new Set();
      for (let c = id; c != null; c = parent.get(c)) {
        const nn = byId.get(c);
        if (!nn.callFrame.functionName.includes(INCL)) continue;
        const kk = key(nn);
        if (seen.has(kk)) continue;
        seen.add(kk);
        incl.set(kk, (incl.get(kk) ?? 0) + t);
      }
    }
  }
}
const row = ([k, t]) => `${(t / 1000).toFixed(0).padStart(8)} ms ${((100 * t) / total).toFixed(1).padStart(5)} %  ${k}`;
console.log(`${files.length} profile(s), ${(total / 1000).toFixed(0)} ms sampled`);
for (const e of [...self].sort((a, b) => b[1] - a[1]).slice(0, N)) console.log(row(e));
if (INCL !== null) {
  console.log(`\ninclusive, functions containing "${INCL}":`);
  for (const e of [...incl].sort((a, b) => b[1] - a[1]).slice(0, N)) console.log(row(e));
}
if (LINES !== null) {
  console.log(`\nself ticks by line, functions containing "${LINES}" (1 tick ~ sampling interval):`);
  for (const [k, v] of [...lines].sort((a, b) => b[1] - a[1]).slice(0, N)) console.log(`${String(v).padStart(8)}  ${k}`);
}
