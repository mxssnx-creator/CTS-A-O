import { readFileSync } from "node:fs";
const [a, b, kind, la = "A", lb = "B"] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a))[kind], B = JSON.parse(readFileSync(b))[kind];
// key by function name + file (line numbers shift between commits)
const norm = (fn) => fn.replace(/:\d+$/, "");
const sum = (r) => { const m = new Map(); for (const x of r.all) { const k = norm(x.fn); const e = m.get(k) ?? { self: 0, total: 0, at: x.fn }; e.self += x.selfMs; e.total = Math.max(e.total, x.totalMs); m.set(k, e); } return m; };
const ma = sum(A), mb = sum(B);
const rows = [...new Set([...ma.keys(), ...mb.keys()])].map((k) => ({ k, a: ma.get(k)?.self ?? 0, b: mb.get(k)?.self ?? 0, at: mb.get(k)?.at ?? ma.get(k).at, onlyB: !ma.has(k) }))
  .filter((x) => x.k !== "(idle) ");
console.log(`${kind}: sampled ${la} ${A.sampledMs} ms · ${lb} ${B.sampledMs} ms; GC ${la} ${A.gcMs} · ${lb} ${B.gcMs} ms\n`);
console.log(`| function (${lb} file:line) | ${la} self ms | ${lb} self ms | Δ ms | × |\n|---|---:|---:|---:|---:|`);
for (const x of rows.sort((p, q) => (q.b - q.a) - (p.b - p.a)).slice(0, 20)) console.log(`| \`${x.at}\`${x.onlyB ? " (only " + lb + ")" : ""} | ${x.a} | ${x.b} | ${x.b - x.a >= 0 ? "+" : ""}${x.b - x.a} | ${x.a ? (x.b / x.a).toFixed(2) : "new"} |`);
console.log(`\nlargest decreases:\n\n| function | ${la} | ${lb} | Δ |\n|---|---:|---:|---:|`);
for (const x of rows.sort((p, q) => (p.b - p.a) - (q.b - q.a)).slice(0, 8)) console.log(`| \`${x.at}\` | ${x.a} | ${x.b} | ${x.b - x.a} |`);
const only = rows.filter((x) => x.onlyB && x.b >= 200).sort((p, q) => q.b - p.b);
console.log(`\nonly in ${lb} (≥ 200 ms self): ` + (only.map((x) => `\`${x.at}\` ${x.b} ms`).join(" · ") || "none"));
