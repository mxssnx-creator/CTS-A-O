#!/usr/bin/env node
// Category runs against the combined run (8 Oct): a run restricted to one range category must produce the same orders
// as that category's rows in the combined run. This compares them order by order.
//
//   node --experimental-strip-types scripts/category-merge.mjs combined.raw.json --run signals=signals.raw.json \
//        --run micro=micro.raw.json [--run short=short.raw.json ...]
//
// For each category C: the combined run's closed and open orders of C against the run's orders. Identical means the
// same closed orders (config, symbol, side, entry, exit, r) and the same open orders (config, symbol, side, entry, mtmR),
// and no order of another category in the run (a foreign order means the run was not restricted). Exits 1 when any
// category is not identical, so a report cannot publish an independent result that is not.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { categoryOfConfig } from "../src/core/range-category.ts";

const EPS = 1e-9;
const pf = (gp, gl) => (gl > 0 ? gp / gl : gp > 0 ? Infinity : 0);

/** The orders of a dump: closed (with r) and open (with mtmR), each tagged with its category. */
export function ordersOf(dump) {
  const closed = (dump.trades ?? []).map((t) => ({
    cat: categoryOfConfig(t.cfg),
    key: `${t.cfg}|${t.sym}|${t.side}|${t.entryT}|${t.exitT}`,
    value: t.r,
  }));
  const open = (dump.openEnd ?? []).map((o) => ({
    cat: categoryOfConfig(o.cfg),
    key: `${o.cfg}|${o.sym}|${o.side}|${o.entryT}|open`,
    value: o.mtmR,
  }));
  return { closed, open };
}

/** Sums of one set of orders: count, PF closed and PF including the open orders' marks. */
function measure(orders) {
  let gp = 0, gl = 0, ogp = 0, ogl = 0;
  for (const c of orders.closed) (c.value > 0 ? (gp += c.value) : (gl -= c.value));
  for (const o of orders.open) (o.value > 0 ? (ogp += o.value) : (ogl -= o.value));
  return {
    closed: orders.closed.length,
    open: orders.open.length,
    pfClosed: pf(gp, gl),
    pfInclOpen: pf(gp + ogp, gl + ogl),
  };
}

/** Compare two order lists as multisets of (key, value); returns the missing and extra keys (values within EPS). */
function diff(a, b) {
  const bucket = new Map();
  for (const x of b) {
    const xs = bucket.get(x.key) ?? [];
    xs.push(x.value);
    bucket.set(x.key, xs);
  }
  const missing = [];
  for (const x of a) {
    const xs = bucket.get(x.key);
    const at = xs ? xs.findIndex((v) => Math.abs(v - x.value) <= EPS) : -1;
    if (at < 0) missing.push(x.key);
    else xs.splice(at, 1);
  }
  const extra = [];
  for (const [key, xs] of bucket) for (let i = 0; i < xs.length; i++) extra.push(key);
  return { missing, extra };
}

/**
 * The comparison of one category run with the combined run. `runs` maps a category name to its dump.
 * Returns one row per category: identical, the counts, the first differing orders and the foreign orders.
 */
export function mergeCheck(combined, runs) {
  const all = ordersOf(combined);
  const rows = [];
  for (const [cat, dump] of Object.entries(runs)) {
    const want = { closed: all.closed.filter((o) => o.cat === cat), open: all.open.filter((o) => o.cat === cat) };
    const got = ordersOf(dump);
    const foreign = [...got.closed, ...got.open].filter((o) => o.cat !== cat).length;
    const cc = diff(want.closed, got.closed);
    const oo = diff(want.open, got.open);
    const identical = cc.missing.length + cc.extra.length + oo.missing.length + oo.extra.length === 0 && foreign === 0;
    rows.push({
      cat,
      identical,
      combined: measure(want),
      run: measure(got),
      missing: cc.missing.length + oo.missing.length,
      extra: cc.extra.length + oo.extra.length,
      foreign,
      first: [...cc.missing.map((k) => `- ${k}`), ...cc.extra.map((k) => `+ ${k}`)].slice(0, 3),
    });
  }
  return rows;
}

const fmt = (x) => (Number.isFinite(x) ? x.toFixed(3) : "inf");

function main(argv) {
  const runs = {};
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--run") {
      const [cat, path] = argv[++i].split("=");
      runs[cat] = JSON.parse(readFileSync(path, "utf8"));
    } else files.push(argv[i]);
  }
  if (files.length !== 1 || !Object.keys(runs).length) {
    console.error("usage: category-merge.mjs combined.raw.json --run <category>=<dump> [--run ...]");
    return 2;
  }
  const combined = JSON.parse(readFileSync(files[0], "utf8"));
  const rows = mergeCheck(combined, runs);
  console.log("| category | identical | orders closed combined / run | open combined / run | PF closed combined / run | PF incl. open combined / run | missing | extra | foreign |");
  console.log("|---|---|---|---|---|---|---:|---:|---:|");
  for (const r of rows) {
    console.log(
      `| ${r.cat} | ${r.identical ? "yes" : "NO"} | ${r.combined.closed} / ${r.run.closed} | ${r.combined.open} / ${r.run.open} | ` +
        `${fmt(r.combined.pfClosed)} / ${fmt(r.run.pfClosed)} | ${fmt(r.combined.pfInclOpen)} / ${fmt(r.run.pfInclOpen)} | ${r.missing} | ${r.extra} | ${r.foreign} |`,
    );
    for (const line of r.first) console.log(`  ${line}`);
  }
  return rows.every((r) => r.identical) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
