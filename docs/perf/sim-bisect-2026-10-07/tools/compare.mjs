import { readFileSync } from "node:fs";
const runs = process.argv.slice(2).map((p) => { const [name, dir] = p.split("="); const r = JSON.parse(readFileSync(`${dir}/raw.json`, "utf8")); r.__dir = dir; return { name, r }; });
const rangeOf = (cfg) => { if (/sig-|\|h192$/.test(cfg) && !/\|(mc|sh|gn|lg)$/.test(cfg)) return "Signals"; const t = cfg.split("|").pop(); return { mc: "Micro", sh: "Short", gn: "General", lg: "Long" }[t] ?? "Wide"; };
const isSig = (cfg) => cfg.includes("sig-");
const typeOf = (x) => (x.kind === "axis" ? "axis" : (isSig(x.cfg) ? "signal·" : "") + x.kind);
const cost = 0.002;
const agg = (trades, open, key) => { const m = new Map(); const g = (k) => m.get(k) ?? (m.set(k, { n: 0, gp: 0, gl: 0, net: 0, on: 0, ogp: 0, ogl: 0 }), m.get(k));
  for (const t of trades) for (const k of [key(t), "total"]) { const a = g(k); const u = t.r; a.n++; a.net += u; if (u > 0) a.gp += u; else a.gl -= u; }
  for (const t of open) for (const k of [key(t), "total"]) { const a = g(k); const u = t.mtmR; a.on++; if (u > 0) a.ogp += u; else a.ogl -= u; }
  return m; };
const f = (x, d = 2) => (x == null || !isFinite(x) ? "–" : x.toFixed(d));
const table = (title, key, order) => {
  console.log(`\n#### ${title}\n`);
  console.log(`| ${title.split(" ")[1] ?? "group"} | ` + runs.map((x) => `${x.name} orders | ${x.name} PF unit | ${x.name} PF incl. open | ${x.name} net (units)`).join(" | ") + " |");
  console.log("|---|" + runs.map(() => "---:|---:|---:|---:").join("|") + "|");
  const ms = runs.map((x) => agg(x.r.trades, x.r.openEnd, key));
  const keys = order ?? [...new Set(ms.flatMap((m) => [...m.keys()]))].sort((a, b) => (a === "total") - (b === "total") || a.localeCompare(b));
  for (const k of keys) console.log(`| ${k} | ` + ms.map((m) => { const a = m.get(k); if (!a) return "0 | – | – | –"; return `${a.n} | ${f(a.gp / a.gl)} | ${f((a.gp + a.ogp) / (a.gl + a.ogl))} | ${f(a.net, 2)}`; }).join(" | ") + " |");
};
// sanity: total unit PF vs the session's own
for (const x of runs) { const a = agg(x.r.trades, x.r.openEnd, () => "t").get("total"); console.log(`${x.name}: trades ${x.r.trades.length}, unit PF ${f(a.gp / a.gl)}, open at end ${x.r.openEnd.length}, runSeconds ${x.r.runSeconds}`); }
console.log("\n#### Engine stages per range\n");
console.log("| range | " + runs.map((x) => `${x.name} Base eval / passed`).join(" | ") + " | " + runs.map((x) => `${x.name} seated`).join(" | ") + " |");
console.log("|---|" + runs.map(() => "---:").join("|") + "|" + runs.map(() => "---:").join("|") + "|");
const seated = (r) => { const m = new Map(); const md = readFileSync(r.__dir + "/session.md", "utf8"); const sec = md.split("## Seated configs over the run window")[1].split("\n\n")[2]; for (const l of sec.split("\n")) { const c = l.split("|").map((x) => x.trim()); if (c.length > 4 && /^\d+$/.test(c[3])) m.set(c[1], (m.get(c[1]) ?? 0) + +c[3]); } return m; };
for (const rg of ["Micro", "Short", "General", "Long", "Wide", "Signals"]) {
  console.log(`| ${rg} | ` + runs.map((x) => { const b = x.r.engine.baseByRange.find((y) => y.range === rg); return b ? `${b.evaluated} / ${b.passed}` : "–"; }).join(" | ") + " | " + runs.map((x) => seated(x.r).get(rg) ?? "?").join(" | ") + " |");
}
console.log(`| total | ` + runs.map((x) => `${x.r.engine.baseEvaluated} / ${x.r.engine.basePassed}`).join(" | ") + " | " + runs.map((x) => `${x.r.engine.real} (eng ${x.r.engine.realEngine} + sig ${x.r.engine.realSignal}); main pairs ${x.r.engine.mainPairs}; tapes ${x.r.engine.tapes}`).join(" | ") + " |");
table("by range", (t) => rangeOf(t.cfg), ["Micro", "Short", "General", "Long", "Wide", "Signals", "total"]);
table("by type", typeOf);
table("by side", (t) => (t.side > 0 ? "long" : "short"));
console.log("\n#### Engine phases of the last compute (engine.phases, ms)\n");
const ph = [...new Set(runs.flatMap((x) => Object.keys(x.r.engine.phases ?? {})))];
console.log("| phase | " + runs.map((x) => x.name).join(" | ") + " |\n|---|" + runs.map(() => "---:").join("|") + "|");
for (const p of ph) console.log(`| ${p} | ` + runs.map((x) => { const v = x.r.engine.phases?.[p]; return v ? `${Math.round(v.ms)}${v.mainMs ? ` (main ${Math.round(v.mainMs)})` : ""}` : "–"; }).join(" | ") + " |");
console.log("| compute (last) | " + runs.map((x) => Math.round(x.r.engine.computeMs)).join(" | ") + " |");
