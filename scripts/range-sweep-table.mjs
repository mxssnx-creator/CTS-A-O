#!/usr/bin/env node
// Range sweep table: reads the variant progress lines of two (or more) sessions run with CTS_CORE_VARIANT_SET=ranges
// (one log per window) and prints, per lever, each window's closed orders and PF including open orders for the
// General and Long ranges, and the acceptance per range (operator's rule, 8 Oct): PF including open above 1 in EVERY
// window, and at least 300 closed orders in every window.
//
//   node scripts/range-sweep-table.mjs --min-orders 300 rally=<log> latest=<log> [...]
//
// Only the stderr progress lines are read ("  [k/n] <lever> · N orders · PF … · gn N orders · PF incl. open x · …"),
// so the table needs no raw dump. A lever that is missing from a window is shown as "–" and is not accepted.
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const minOrders = Number(args[args.indexOf("--min-orders") + 1] || 300);
const inputs = args.filter((a, i) => a.includes("=") && args[i - 1] !== "--min-orders");
if (!inputs.length) {
  console.error("usage: range-sweep-table.mjs [--min-orders N] window=<log> [window=<log> …]");
  process.exit(2);
}

const LINE = /^\s+\[(\d+)\/(\d+)\] (.+?) · (\d+) orders · PF ([\d.]+|NaN|Infinity) · net (-?[\d.]+) % · .*?\bgn (\d+) orders · PF incl\. open ([\d.]+|NaN|Infinity|–) · lg (\d+) orders · PF incl\. open ([\d.]+|NaN|Infinity|–)\s*$/;

const windows = new Map();
for (const spec of inputs) {
  const [name, file] = [spec.slice(0, spec.indexOf("=")), spec.slice(spec.indexOf("=") + 1)];
  const rows = new Map();
  let unread = 0;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!/^\s+\[\d+\/\d+\] /.test(line)) continue;
    const m = LINE.exec(line);
    if (!m) {
      unread++;
      continue;
    }
    const [, , , label, orders, pf, net, gnN, gnPf, lgN, lgPf] = m;
    const num = (x) => (x === "–" || x === "NaN" ? null : x === "Infinity" ? Infinity : Number(x));
    rows.set(label, {
      orders: Number(orders),
      pf: num(pf),
      net: Number(net),
      gn: { n: Number(gnN), pf: num(gnPf) },
      lg: { n: Number(lgN), pf: num(lgPf) },
      baseline: label === "baseline",
    });
  }
  if (unread) console.error(`${name}: ${unread} progress line(s) not read (format changed?)`);
  windows.set(name, rows);
}

const names = [...windows.keys()];
const labels = [...new Set(names.flatMap((n) => [...windows.get(n).keys()]))];
const base = labels.find((l) => windows.get(names[0]).get(l)?.baseline) ?? "baseline";
const fmt = (x) => (x === null || x === undefined ? "–" : x === Infinity ? "∞" : Number.isFinite(x) ? x.toFixed(2) : "–");
// the rule is per range: PF including open above 1 in every window, and at least --min-orders closed orders in every window
const passes = (per, range) =>
  per.every((r) => !!r && r[range].pf !== null && r[range].pf > 1 && r[range].n >= minOrders);

const head = ["lever"];
for (const n of names) head.push(`${n} gn n · PF incl.`, `${n} lg n · PF incl.`);
head.push("gn passes", "lg passes");
console.log(`| ${head.join(" | ")} |`);
console.log(`|${head.map((_, i) => (i === 0 ? "---" : ":-:")).join("|")}|`);
const order = [base, ...labels.filter((l) => l !== base)];
for (const lab of order) {
  const per = names.map((n) => windows.get(n).get(lab));
  const cells = [];
  for (const r of per) cells.push(r ? `${r.gn.n} · ${fmt(r.gn.pf)}` : "–", r ? `${r.lg.n} · ${fmt(r.lg.pf)}` : "–");
  const gnOk = lab !== base && passes(per, "gn");
  const lgOk = lab !== base && passes(per, "lg");
  console.log(`| ${lab === base ? "baseline (as run)" : lab} | ${cells.join(" | ")} | ${lab === base ? "–" : gnOk ? "**yes**" : "no"} | ${lab === base ? "–" : lgOk ? "**yes**" : "no"} |`);
}
console.log("");
console.log(`Rule (operator, 8 Oct): per range, PF including open orders > 1 in every window AND at least ${minOrders} closed orders in every window.`);
