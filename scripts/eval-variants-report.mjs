#!/usr/bin/env node
// Per-variant min-PF table of a saved eval (runs/eval/gate/<label>.json), rescored offline with the current rules
// (scripts/lib/eval-variants.mjs): a window the run did not compute for a range (memory fallback level, short warm-up) is
// unscored; --score-short counts the short warm-up windows' trades instead. Prints the variants that pass, then all.
//   node --experimental-strip-types scripts/eval-variants-report.mjs --file runs/eval/gate/grid-h24.json [--score-short] [--min-n 0] [--top 30]
import { readFileSync } from "node:fs";
import { variantScores } from "./lib/eval-variants.mjs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const file = arg("file", "");
if (!file) {
  console.error("--file is required (a runs/eval/gate/<label>.json)");
  process.exit(2);
}
const out = JSON.parse(readFileSync(file, "utf8"));
const scoreShort = process.argv.includes("--score-short");
const minN = Number(arg("min-n", "0"));
const top = Number(arg("top", "30"));

// each window's trades: the orders whose entry falls in the window (scripts/lib/eval-orders.mjs), with the window's
// fallback level and warm-up flag as saved by eval-gate
const windows = out.windows.map((w) => {
  const from = Date.parse(w.from);
  const to = Date.parse(w.to);
  const lvl = w.memLevel ?? 0;
  const uncomputed = [...(lvl >= 1 ? ["Micro"] : []), ...(lvl >= 2 ? ["Minimal"] : [])];
  if (w.warmup?.short && !scoreShort) uncomputed.push("Micro", "Minimal", "Minimal plus", "Short", "General", "Long", "Wide", "Signals");
  return {
    name: w.from.slice(0, 16),
    trades: out.trades.filter((t) => t.entryT >= from && t.entryT < to).map((t) => ({ cfg: t.cfg, r: t.r })),
    uncomputed: [...new Set(uncomputed)],
    memLevel: lvl,
    short: !!w.warmup?.short,
  };
});

const vs = variantScores(windows, { floor: 1.2, minN });
const fmt = (p) => (p.status === "unscored" ? "unscored" : `${p.pf.toFixed(2)} (${p.n})`);
console.log(`${file}: ${windows.length} windows · ${windows.map((w) => `${w.name} lvl ${w.memLevel}${w.short ? " short" : ""}`).join(" · ")}`);
console.log(`scoring: ${scoreShort ? "short warm-up windows counted" : "short warm-up windows unscored"}, minN ${minN}, floor 1.2`);
const pass = vs.filter((v) => v.pass);
console.log(`passing every window: ${pass.length} of ${vs.length} variants`);
const head = `| range | pair | trail | hold h | atr | status | min PF | ${windows.map((w) => w.name).join(" | ")} |`;
console.log(head);
console.log(`|${"---|".repeat(7 + windows.length)}`);
for (const v of vs.slice(0, top)) {
  console.log(
    `| ${v.range} | ${v.pair || "–"} | ${v.trail} | ${Number.isFinite(v.hold) ? v.hold : "–"} | ${v.atr || "–"} | ${v.status} | ${Number.isFinite(v.minPf) ? v.minPf.toFixed(2) : "–"} | ${v.perWindow.map(fmt).join(" | ")} |`,
  );
}
