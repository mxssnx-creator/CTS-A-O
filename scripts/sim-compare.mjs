#!/usr/bin/env node
// Compare session dumps (core-session --dump raw.json) on one measure: PF including the open orders at the run end.
// Per group (Signals, and each engine range), per strategy kind, and total; the hourly success of the run (hours with
// closed orders: positive net share; net of closed orders by exit hour). Unit basis: r is one unit per order, net in %.
//
//   node scripts/sim-compare.mjs <raw.json> [<raw.json> ...]
//
// PF closed = Σ r+ / Σ |r−| over closed orders. PF incl. open adds each open order's mark (mtmR) as if closed.
import { readFileSync } from "node:fs";

const RANGES = ["mc", "mn", "mp", "sh", "gn", "lg"];
const rangeOf = (cfg) => {
  for (const t of RANGES) if (cfg.includes(`|${t}`)) return t;
  return "wide";
};
const groupOf = (cfg) => (cfg.includes("|sig-") ? "Signals" : "Engine");

function acc() {
  return { n: 0, gp: 0, gl: 0, net: 0, open: 0, ogp: 0, ogl: 0, onet: 0 };
}
const add = (a, r, closed) => {
  if (closed) {
    a.n++;
    a.net += r;
    if (r > 0) a.gp += r;
    else a.gl -= r;
  } else {
    a.open++;
    a.onet += r;
    if (r > 0) a.ogp += r;
    else a.ogl -= r;
  }
};
const pf = (gp, gl) => (gl > 0 ? gp / gl : gp > 0 ? Infinity : 0);
const row = (a) => ({
  orders: a.n,
  open: a.open,
  pfClosed: +pf(a.gp, a.gl).toFixed(3),
  pfInclOpen: +pf(a.gp + a.ogp, a.gl + a.ogl).toFixed(3),
  netClosedPct: +(a.net * 100).toFixed(1),
  netInclOpenPct: +((a.net + a.onet) * 100).toFixed(1),
});

for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const groups = new Map();
  const kinds = new Map();
  const ranges = new Map();
  const total = acc();
  const hours = new Map(); // exit hour -> net r (closed)
  const groupHours = new Map(); // group -> exit hour -> net r (closed)
  const H = 3_600_000;
  for (const t of d.trades ?? []) {
    const g = groupOf(t.cfg);
    const rg = rangeOf(t.cfg);
    const k = t.kind ?? "normal";
    for (const [map, key] of [
      [groups, g],
      [kinds, k],
      [ranges, rg],
    ]) {
      if (!map.has(key)) map.set(key, acc());
      add(map.get(key), t.r, true);
    }
    add(total, t.r, true);
    const h = Math.floor(t.exitT / H);
    hours.set(h, (hours.get(h) ?? 0) + t.r);
    if (!groupHours.has(g)) groupHours.set(g, new Map());
    const gh = groupHours.get(g);
    gh.set(h, (gh.get(h) ?? 0) + t.r);
  }
  for (const o of d.openEnd ?? []) {
    const g = groupOf(o.cfg);
    const rg = rangeOf(o.cfg);
    const k = o.kind ?? "normal";
    for (const [map, key] of [
      [groups, g],
      [kinds, k],
      [ranges, rg],
    ]) {
      if (!map.has(key)) map.set(key, acc());
      add(map.get(key), o.mtmR, false);
    }
    add(total, o.mtmR, false);
  }
  const hourRows = [...hours.entries()].sort((a, b) => a[0] - b[0]);
  const pos = hourRows.filter(([, v]) => v > 0).length;
  console.log(`== ${file}`);
  console.log(`window ${new Date(d.window.startT).toISOString()} → ${new Date(d.window.endT).toISOString()} · symbols ${(d.symbols ?? []).length}`);
  console.log("total", JSON.stringify(row(total)));
  for (const [name, map] of [
    ["group", groups],
    ["kind", kinds],
    ["range", ranges],
  ])
    for (const [key, a] of [...map.entries()].sort()) console.log(`${name} ${key.padEnd(9)} ${JSON.stringify(row(a))}`);
  console.log(`hourly: ${hourRows.length} hours with closed orders, ${pos} positive (${((100 * pos) / Math.max(1, hourRows.length)).toFixed(0)} %)`);
  // hourly success per group: the hours with closed orders in that group, and the share of them with a positive net
  for (const [g, gh] of [...groupHours.entries()].sort()) {
    const vals = [...gh.values()];
    const p = vals.filter((v) => v > 0).length;
    console.log(`hourly ${g.padEnd(8)} ${vals.length} hours with closed orders, ${p} positive (${((100 * p) / Math.max(1, vals.length)).toFixed(0)} %)`);
  }
}
