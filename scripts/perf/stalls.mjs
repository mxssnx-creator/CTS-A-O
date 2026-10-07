// Usage: node stalls.mjs <file.cpuprofile> [minMs]
// Finds runs of consecutive non-idle main-thread samples longer than minMs and prints, per stall, the
// functions with the most self time (with url:line) plus the stack of the heaviest one; then an aggregate.
const [file, minArg] = process.argv.slice(2);
const minMs = Number(minArg ?? 150);
const p = JSON.parse((await import("node:fs")).readFileSync(file, "utf8"));
const nodes = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const name = (n) => {
  const f = n.callFrame;
  const u = (f.url || "").replace(/^file:\/\/.*?\/(src|scripts|node_modules)\//, "$1/");
  return `${f.functionName || "(anon)"} ${u}:${f.lineNumber + 1}`;
};
const idle = (n) => ["(idle)", "(program)"].includes(n.callFrame.functionName);
const stack = (id) => {
  const s = [];
  for (let x = id; x !== undefined; x = parent.get(x)) s.push(nodes.get(x));
  return s;
};
let t = p.startTime;
const runs = [];
let cur = null;
for (let i = 0; i < p.samples.length; i++) {
  t += p.timeDeltas[i];
  const n = nodes.get(p.samples[i]);
  const dt = (p.timeDeltas[i + 1] ?? 0) / 1000;
  if (idle(n)) {
    if (cur && cur.ms >= minMs) runs.push(cur);
    cur = null;
    continue;
  }
  cur ??= { start: t, ms: 0, self: new Map(), incl: new Map() };
  cur.ms += dt;
  cur.self.set(n.id, (cur.self.get(n.id) ?? 0) + dt);
  for (const s of new Set(stack(n.id).map(name))) cur.incl.set(s, (cur.incl.get(s) ?? 0) + dt);
}
if (cur && cur.ms >= minMs) runs.push(cur);
const agg = new Map();
console.log(`${runs.length} stalls ≥ ${minMs} ms over ${((t - p.startTime) / 1e6).toFixed(0)} s`);
for (const r of runs.sort((a, b) => b.ms - a.ms).slice(0, 25)) {
  const top = [...r.self].sort((a, b) => b[1] - a[1]).slice(0, 4);
  // the deepest app frame with most inclusive time, excluding the generic driver frames
  const incl = [...r.incl].filter(([k]) => /src\/|scripts\//.test(k)).sort((a, b) => b[1] - a[1]);
  const at = new Date(r.start / 1000).toISOString().slice(11, 19);
  console.log(`\n${r.ms.toFixed(0)} ms at ${at}`);
  for (const [id, ms] of top) console.log(`   self ${ms.toFixed(0)} ms  ${name(nodes.get(id))}`);
  console.log(`   app frames: ${incl.slice(0, 8).map(([k, v]) => `${k.split(" ")[0]}@${k.split("/").pop()} ${v.toFixed(0)}`).join(" > ")}`);
  for (const [k, v] of incl.slice(0, 12)) agg.set(k, (agg.get(k) ?? 0) + v);
}
console.log("\naggregate app frames over the top stalls:");
for (const [k, v] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${v.toFixed(0).padStart(7)} ms  ${k}`);
