// worker self time split by phase: samples under baseRuns (Base) / buildTapesGen (Tapes) / other
import { readFileSync, readdirSync } from "node:fs";
const [dir, label] = process.argv.slice(2);
const phases = { Base: new Map(), Tapes: new Map(), other: new Map() }; const tot = { Base: 0, Tapes: 0, other: 0 };
for (const f of readdirSync(dir).filter((f) => f.endsWith(".cpuprofile") && Number(f.split(".")[4]) > 0)) {
  const p = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  const byId = new Map(p.nodes.map((n) => [n.id, n])); const parent = new Map();
  for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const phaseOf = new Map();
  const ph = (id) => { if (phaseOf.has(id)) return phaseOf.get(id); const n = byId.get(id); const fn = n.callFrame.functionName; const r = fn === "baseRuns" ? "Base" : fn === "buildTapesGen" ? "Tapes" : parent.has(id) ? ph(parent.get(id)) : "other"; phaseOf.set(id, r); return r; };
  for (let i = 0; i < p.samples.length; i++) { const id = p.samples[i]; const n = byId.get(id); const fn = n.callFrame.functionName; if (fn === "(idle)") continue; const k = `${fn || "(anonymous)"} ${(n.callFrame.url || "").replace(/^file:\/\/\/tmp\/wt-[0-9a-f]+\//, "")}${n.callFrame.url ? ":" + (n.callFrame.lineNumber + 1) : ""}`; const P = ph(id); const us = p.timeDeltas[i] ?? 0; tot[P] += us; phases[P].set(k, (phases[P].get(k) ?? 0) + us); }
}
for (const P of ["Base", "Tapes"]) {
  console.log(`\n${label} workers · ${P}: ${Math.round(tot[P] / 1000)} ms CPU (non-idle samples)\n\n| function | self ms | share |\n|---|---:|---:|`);
  for (const [k, v] of [...phases[P]].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`| \`${k}\` | ${Math.round(v / 1000)} | ${(100 * v / tot[P]).toFixed(1)} % |`);
}
console.log(`\n${label} workers · other (signal tapes, GC outside a phase, messaging): ${Math.round(tot.other / 1000)} ms`);
