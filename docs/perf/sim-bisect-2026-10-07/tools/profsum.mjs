// usage: node profsum.mjs <profdir> <out.json>  — sums self/total ms per function key, main vs worker threads
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const [dir, out] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".cpuprofile"));
// main thread profile: the largest-duration file whose name has the lowest thread id; node names CPU.<date>.<pid>.<tid>.<seq>.cpuprofile
const kinds = { main: new Map(), worker: new Map() };
const totals = { main: 0, worker: 0 }, nfiles = { main: 0, worker: 0 };
for (const f of files) {
  const p = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  const tid = Number(f.split(".")[4]);
  const kind = tid === 0 ? "main" : "worker";
  nfiles[kind]++;
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const selfUs = new Map();
  for (let i = 0; i < p.samples.length; i++) selfUs.set(p.samples[i], (selfUs.get(p.samples[i]) ?? 0) + (p.timeDeltas[i] ?? 0));
  const key = (n) => { const c = n.callFrame; const url = (c.url || "").replace(/^file:\/\/\/tmp\/wt-[0-9a-f]+\//, ""); return `${c.functionName || "(anonymous)"} ${url}${url ? ":" + (c.lineNumber + 1) : ""}`; };
  const m = kinds[kind];
  for (const [id, us] of selfUs) {
    totals[kind] += us;
    const k = key(byId.get(id));
    const e = m.get(k) ?? { self: 0, total: 0 }; e.self += us; m.set(k, e);
    // inclusive: credit each distinct key on the stack once
    const seen = new Set(); let cur = id;
    while (cur != null) { const kk = key(byId.get(cur)); if (!seen.has(kk)) { seen.add(kk); const ee = m.get(kk) ?? { self: 0, total: 0 }; ee.total += us; m.set(kk, ee); } cur = parent.get(cur); }
  }
}
const res = {};
for (const kind of ["main", "worker"]) {
  const arr = [...kinds[kind]].map(([k, v]) => ({ fn: k, selfMs: Math.round(v.self / 1000), totalMs: Math.round(v.total / 1000) }));
  res[kind] = { files: nfiles[kind], sampledMs: Math.round(totals[kind] / 1000),
    gcMs: arr.filter((x) => x.fn.startsWith("(garbage collector)")).reduce((a, x) => a + x.selfMs, 0),
    all: arr.filter((x) => x.selfMs >= 1 || x.totalMs >= 50).sort((a, b) => b.selfMs - a.selfMs) };
}
writeFileSync(out, JSON.stringify(res));
for (const kind of ["main", "worker"]) {
  const r = res[kind];
  console.log(`\n## ${kind}: ${r.files} profile(s), ${r.sampledMs} ms sampled, GC ${r.gcMs} ms (${(100 * r.gcMs / r.sampledMs).toFixed(1)} %)`);
  console.log("top 25 self:"); for (const x of r.all.slice(0, 25)) console.log(`${String(x.selfMs).padStart(8)}  ${x.fn}`);
  console.log("top 15 total:"); for (const x of [...r.all].sort((a, b) => b.totalMs - a.totalMs).filter(x=>!x.fn.startsWith("(root)")).slice(0, 15)) console.log(`${String(x.totalMs).padStart(8)}  ${x.fn}`);
}
