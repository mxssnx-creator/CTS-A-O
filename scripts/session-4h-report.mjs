#!/usr/bin/env node
// Roll a session report's hourly rows (data.json "hours") into 4-hour blocks, one line per block, with the same
// measures the hourly table carries: balance, equity, drawdown, margin, orders, positions, wins, PF (sized and unit),
// net, and cumulative totals. Every block is a sum or an end/min/max of its hours; no figure is recomputed from
// anything else. Writes Markdown (one line per block) and optionally JSON.
//
//   node scripts/session-4h-report.mjs docs/session-5d/data.json [--block-h 4] [--md out.md] [--json out.json]
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
if (!file) {
  process.stderr.write("usage: session-4h-report.mjs data.json [--block-h 4] [--md out.md] [--json out.json]\n");
  process.exit(2);
}
const blockH = Number(opt("block-h", 4));
const H = 3_600_000;
const data = JSON.parse(readFileSync(file, "utf8"));
const hours = (data.hours ?? []).filter((h) => !h.partial || h.minutes > 0);

const sum = (xs) => xs.reduce((a, x) => a + (Number.isFinite(x) ? x : 0), 0);
const last = (xs) => xs[xs.length - 1];
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "–");
const money = (n) => (Number.isFinite(n) ? `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}` : "–");
const pct = (n) => (Number.isFinite(n) ? `${n.toFixed(2)} %` : "–");
const pfOf = (gp, gl, n) => (gl > 0 ? gp / gl : gp > 0 ? Infinity : n > 0 ? null : null);
const pfText = (v, gp, gl) => (v === null ? "–" : v === Infinity ? "∞ (no loss)" : fmt(v, 2));
const iso = (t) => new Date(t).toISOString().replace(".000Z", "Z");

const start = hours.length ? hours[0].t : 0;
const blocks = [];
for (const h of hours) {
  const idx = Math.floor((h.t - start) / (blockH * H));
  (blocks[idx] ??= { idx, hours: [] }).hours.push(h);
}

const rows = [];
for (const b of blocks) {
  if (!b) continue;
  const hs = b.hours;
  const t0 = hs[0].t;
  const t1 = t0 + blockH * H;
  const gp = sum(hs.map((h) => h.gp));
  const gl = sum(hs.map((h) => h.gl));
  const gpR = sum(hs.map((h) => h.gpR));
  const glR = sum(hs.map((h) => h.glR));
  const wins = sum(hs.map((h) => h.wins));
  const losses = sum(hs.map((h) => h.losses));
  const orders = sum(hs.map((h) => h.orders));
  const opened = sum(hs.map((h) => h.ordersOpened));
  const net = sum(hs.map((h) => h.net));
  const lastH = last(hs);
  rows.push({
    from: iso(t0),
    to: iso(t1),
    hoursCount: hs.length,
    partialHours: hs.filter((h) => h.partial).length,
    balanceStart: hs[0].balance - hs[0].net,
    balanceEnd: lastH.balance,
    net,
    netPct: ((lastH.balance - (hs[0].balance - hs[0].net)) / (hs[0].balance - hs[0].net)) * 100,
    equityEnd: lastH.equity,
    equityMin: Math.min(...hs.map((h) => h.eqMin)),
    equityMax: Math.max(...hs.map((h) => h.eqMax)),
    ddEndPct: lastH.ddEndPct,
    ddMaxPctInBlock: Math.max(...hs.map((h) => h.ddMaxHourPct)),
    maxDdPctSoFar: lastH.maxDdPctSoFar,
    marginMax: Math.max(...hs.map((h) => h.marginMax)),
    marginEnd: lastH.marginEnd,
    ordersOpened: opened,
    fundedOrdersOpened: sum(hs.map((h) => h.fundedOrdersOpened)),
    ordersClosed: orders,
    ordersOpenEnd: lastH.ordersOpenEnd,
    posOpened: sum(hs.map((h) => h.posOpened)),
    posClosed: sum(hs.map((h) => h.posClosed)),
    posOpenEnd: lastH.posOpenEnd,
    wins,
    losses,
    wr: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null,
    gp,
    gl,
    pf: pfOf(gp, gl, gp + gl),
    gpR,
    glR,
    unitPf: pfOf(gpR, glR, gpR + glR),
    greenHours: hs.filter((h) => h.net > 0).length,
    redHours: hs.filter((h) => h.net < 0).length,
    flatHours: hs.filter((h) => h.net === 0).length,
    ddtNowH: lastH.ddtNowH,
    cumNet: lastH.cumNet,
    cumPf: pfOf(lastH.cumGp, lastH.cumGl, 1),
    cumOrders: lastH.cumOrders,
  });
}

const md = [];
md.push(`# ${data.title ?? "Session"} — ${blockH}-hour blocks`);
md.push("");
md.push(
  "| # | from (UTC) | to (UTC) | balance end | net | net % | equity end | equity min | equity max | DD end | DD max in block | margin max | opened | closed | open at end | pos opened / closed / open | wins / losses | WR | PF | unit PF | green / red / flat h | cum net | cum PF | cum orders |",
);
md.push("|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---|---:|---:|---:|");
rows.forEach((r, i) => {
  md.push(
    `| ${i + 1} | ${r.from} | ${r.to} | ${money(r.balanceEnd)} | ${money(r.net)} | ${pct(r.netPct)} | ${money(r.equityEnd)} | ${money(r.equityMin)} | ${money(r.equityMax)} | ${pct(r.ddEndPct)} | ${pct(r.ddMaxPctInBlock)} | ${money(r.marginMax)} | ${r.ordersOpened} | ${r.ordersClosed} | ${r.ordersOpenEnd} | ${r.posOpened} / ${r.posClosed} / ${r.posOpenEnd} | ${r.wins} / ${r.losses} | ${r.wr === null ? "–" : pct(r.wr)} | ${pfText(r.pf)} | ${pfText(r.unitPf)} | ${r.greenHours} / ${r.redHours} / ${r.flatHours} | ${money(r.cumNet)} | ${pfText(r.cumPf)} | ${r.cumOrders} |`,
  );
});
const text = md.join("\n") + "\n";
const mdOut = opt("md");
if (mdOut) writeFileSync(mdOut, text);
const jsonOut = opt("json");
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ blockH, rows }, null, 2));
process.stdout.write(text);
