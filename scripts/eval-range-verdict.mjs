#!/usr/bin/env node
// The per-range verdict of an eval lever against its baseline (the PF-search protocol, 14 Oct; scripts/lib/eval-verdict.mjs)
// on the outputs of scripts/eval-gate.mjs (runs/eval/gate/<label>.json). Per range, as summary.funnel names them
// (Signals = sig- indications, Wide = untagged): orders and events (distinct symbol × side × entry time), PF (the orders
// still open at a window's end counted) and pfClosed over D1, D1a and D1b; each window's PF and events with its flags
// (memory fallback level, short warm-up, unscored); then the decision rule (valid, choose, judge), the forward check
// on F and the target ("works").
//
//   nice -n 10 node --max-old-space-size=2048 --experimental-strip-types --no-warnings scripts/eval-range-verdict.mjs
//     --base pfr-b0 --variant pfr-<x> [--forward-base pfr-fwd-b0 --forward pfr-fwd-combo] [--matched-mirror] [--kind axis]
//     [--json: the verdict as JSON] [--beside-eval]
//
// - --matched-mirror: the variant is an invertSeats run; a baseline engine order counts only in a window where the
//   variant traded its config's mirror (an inverted entry exists only where the mirror pair has a tape: the whole
//   baseline is not the same seats); its Signals orders always count (signals are not inverted)
// - runs on another span, split, windows or feed (summary.feed / feedStart) are refused (exit 2)
// - --kind K: a range's orders of kind K (normal, trailing, dca, dca-active, axis) as a row of their own ("Wide · axis")
// - a label ending in .json is a path
// It reads one output at a time (a D1 output is 40-60 MB of JSON) with a 2 GB heap, at nice 10 (it restarts itself under
// that heap when its limit is higher: the container's NODE_OPTIONS give 8 GB), and never while an eval runs: an
// eval-gate / eval-families process or a session child of one (--dump-only) makes it stop before reading anything
// (--beside-eval reads anyway). A reader only: it writes nothing.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { getPriority, setPriority } from "node:os";
import { join } from "node:path";
import { getHeapStatistics } from "node:v8";
import { KINDS, RULE, forwardRow, judgeRow, matchedKeep, mirroredSeats, reduceRun, rowNames, rowOf, sameFeed, sameWindows, targetRow } from "./lib/eval-verdict.mjs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const flag = (k) => process.argv.includes(`--${k}`);

// nice 10 (inherited by the restart below); a higher niceness already set is kept
try {
  if (getPriority() < 10) setPriority(10);
} catch {
  // (not permitted: the run goes on at its priority)
}
const HEAP_MB = 2048;
if (getHeapStatistics().heap_size_limit > (HEAP_MB + 256) * 2 ** 20 && !process.env.CTS_VERDICT_HEAP) {
  const execArgv = [...process.execArgv.filter((a) => !a.startsWith("--max-old-space-size")), `--max-old-space-size=${HEAP_MB}`];
  const r = spawnSync(process.execPath, [...execArgv, process.argv[1], ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, CTS_VERDICT_HEAP: "1" } });
  process.exit(r.status ?? 1);
}

const BASE = arg("base", "");
const VARIANT = arg("variant", "");
const FWD_BASE = arg("forward-base", "");
const FWD = arg("forward", "");
const MATCHED = flag("matched-mirror");
const KIND = arg("kind", "");
const JSON_OUT = flag("json");
if (!BASE || !VARIANT || !FWD_BASE !== !FWD) {
  console.error("--base <label> and --variant <label> are required (runs/eval/gate/<label>.json); --forward-base and --forward go together");
  process.exit(2);
}
if (KIND && !KINDS.includes(KIND)) {
  console.error(`--kind: one of ${KINDS.join(", ")} (${KIND})`);
  process.exit(2);
}

/** the eval processes on the host: eval-gate / eval-families and their session children (--dump-only) */
function evalProcesses() {
  let pids;
  try {
    pids = readdirSync("/proc").filter((d) => /^\d+$/.test(d) && Number(d) !== process.pid && Number(d) !== process.ppid);
  } catch {
    return [];
  }
  const found = [];
  for (const pid of pids) {
    let argv;
    try {
      argv = readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0");
    } catch {
      continue;
    }
    if (argv.includes("--dump-only") || argv.some((a) => /(^|\/)eval-(gate|families)\.mjs$/.test(a))) found.push(`${pid} ${argv.filter(Boolean).slice(0, 5).join(" ")}`);
  }
  return found;
}
if (!flag("beside-eval")) {
  const running = evalProcesses();
  if (running.length) {
    console.error(`an eval runs (${running.length} process(es)): its memory comes first, read between evals (--beside-eval reads anyway)\n  ${running.slice(0, 5).join("\n  ")}`);
    process.exit(3);
  }
}

const fileOf = (label) => (label.endsWith(".json") ? label : join("runs/eval", "gate", `${label}.json`));
/** one output read, reduced and dropped; with seats, the configs whose mirror it traded per window (--matched-mirror) */
function load(label, { keep = null, seats = false } = {}) {
  const file = fileOf(label);
  let out;
  try {
    out = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`${file}: ${e.code === "ENOENT" ? "no such output" : e.message}`);
    process.exit(2);
  }
  const s = out.summary;
  const run = reduceRun(out, { kind: KIND, keep });
  run.label = label;
  run.meta = { toggles: s.toggles ?? null, settings: s.settings ?? null, wf: s.wf ?? null, windowH: s.windowH ?? null };
  if (MATCHED && seats && !s.wf?.invertSeats) run.problems.push("--matched-mirror on a run without wf.invertSeats");
  return { run, seats: seats ? mirroredSeats(out) : null };
}
/** a baseline and its lever on the same windows: the lever first (its mirrored seats filter the baseline) */
function pairOf(baseLabel, varLabel) {
  const v = load(varLabel, { seats: MATCHED });
  const b = load(baseLabel, { keep: MATCHED ? matchedKeep(v.seats) : null });
  if (!sameWindows(b.run, v.run)) {
    console.error(`${baseLabel} and ${varLabel} are not on the same span, split and windows: a verdict compares the same windows only`);
    process.exit(2);
  }
  if (!sameFeed(b.run, v.run)) {
    console.error(
      `${baseLabel} and ${varLabel} read different feeds (${b.run.feed} B from ${b.run.feedStart} against ${v.run.feed} B from ${v.run.feedStart}): a verdict compares the same market only`,
    );
    process.exit(2);
  }
  return { b: b.run, v: v.run };
}
const d1 = pairOf(BASE, VARIANT);
const fwd = FWD ? pairOf(FWD_BASE, FWD) : null;
const problemsOf = (p) => [...p.b.problems.map((x) => `${p.b.label}: ${x}`), ...p.v.problems.map((x) => `${p.v.label}: ${x}`)];
const PROBLEMS = problemsOf(d1);
const FWD_PROBLEMS = fwd ? problemsOf(fwd) : [];

const rows = rowNames(d1.b, d1.v).map((name) => {
  const b = rowOf(d1.b, name);
  const v = rowOf(d1.v, name);
  const fb = fwd ? rowOf(fwd.b, name) : null;
  const fv = fwd ? rowOf(fwd.v, name) : null;
  const rule = judgeRow(b, v, { problems: PROBLEMS });
  const forward = fwd ? forwardRow(fb, fv, { problems: FWD_PROBLEMS }) : null;
  // an invalid run (D1's pair or F's) never "works"
  const target = targetRow(v, fv, { problems: [...PROBLEMS, ...FWD_PROBLEMS] });
  // works (the target), or kept (and holding on F when read) without it; else the range keeps today's setting
  const outcome = rule.verdict === "rerun" ? "" : target.ok ? "works" : rule.keep && (!forward || forward.ok) ? "improved, not working" : "";
  return { name, range: b.range, verdict: rule.verdict, keep: rule.keep, outcome, base: b, variant: v, forwardBase: fb, forward: fv, rule, forwardRule: forward, target };
});

if (JSON_OUT) {
  const runOf = (r) => ({ label: r.label, problems: r.problems, windows: r.windows, feed: r.feed, feedStart: r.feedStart, ...r.meta });
  console.log(
    JSON.stringify({
      rule: RULE,
      matchedMirror: MATCHED,
      kind: KIND || null,
      span: d1.b.span,
      base: runOf(d1.b),
      variant: runOf(d1.v),
      ...(fwd ? { forwardBase: runOf(fwd.b), forward: runOf(fwd.v), forwardSpan: fwd.b.span } : {}),
      rows,
    }),
  );
  process.exit(0);
}

const f2 = (x) => (x == null ? "–" : x.toFixed(2));
const sg = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}`;
const ok = (x) => (x ? "✓" : "✗");
const at = (s) => s.slice(0, 16);
const need = (x) => Math.ceil(x - 1e-9);
const WIN = d1.b.windows;
console.log(
  `eval-range-verdict · base ${BASE} · variant ${VARIANT}${MATCHED ? " · matched mirror" : ""}${KIND ? ` · kind ${KIND} apart` : ""}\n` +
    `span ${at(d1.b.span.from)} → ${at(d1.b.span.to)}, split ${at(d1.b.span.split)} (D1a: entries before it, chooses; D1b: from it, judges) · ` +
    `${WIN.length} windows: ${WIN.map((w, k) => `w${k + 1} ${at(w.from)}`).join(" · ")}`,
);
const runLine = (r) =>
  `${r.label}: ${r.problems.length ? `NO VERDICT, rerun (${r.problems.join("; ")})` : "valid"}` +
  ` · toggles ${JSON.stringify(r.meta.toggles)} · settings ${JSON.stringify(r.meta.settings)} · wf ${JSON.stringify(r.meta.wf)}`;
console.log(runLine(d1.b));
console.log(runLine(d1.v));
if (fwd) {
  console.log(`F: span ${at(fwd.b.span.from)} → ${at(fwd.b.span.to)}, ${fwd.b.windows.length} window(s)`);
  console.log(`F ${runLine(fwd.b)}`);
  console.log(`F ${runLine(fwd.v)}`);
}

/** a window's flags: the run's memory fallback level and short warm-up, the row unscored there */
const flagsOf = (run, w, k) =>
  [run.windows[k].memLevel ? `lvl ${run.windows[k].memLevel}` : "", run.windows[k].short ? "short" : "", w.unscored ? "unscored" : ""].filter(Boolean).join(" ");
const cell = (x) => `${x.orders} / ${x.events} | ${f2(x.pf)} | ${f2(x.pfClosed)}`;
for (const r of rows) {
  console.log(`\n## ${r.name} → ${r.verdict}${r.forwardRule ? ` · F ${r.forwardRule.ok ? "holds" : "does not hold"}` : ""}${r.outcome ? ` · ${r.outcome}` : ""}`);
  console.log("| run | D1 orders / events | PF | closed | D1a orders / events | PF | closed | D1b orders / events | PF | closed |");
  console.log(`|${"---|".repeat(10)}`);
  for (const [label, x] of [[BASE, r.base], [VARIANT, r.variant]]) console.log(`| ${label} | ${cell(x.d1)} | ${cell(x.d1a)} | ${cell(x.d1b)} |`);
  console.log(`| run | ${WIN.map((_, k) => `w${k + 1} PF (events)`).join(" | ")} |`);
  console.log(`|${"---|".repeat(WIN.length + 1)}`);
  for (const [run, x] of [[d1.b, r.base], [d1.v, r.variant]])
    console.log(`| ${run.label} | ${x.windows.map((w, k) => `${f2(w.pf)} (${w.events})${flagsOf(run, w, k) ? ` ${flagsOf(run, w, k)}` : ""}`).join(" | ")} |`);
  const { valid, choose, judge } = r.rule;
  const half = (h, x) => `${h} ${x.events} events ≥ ${need(x.need)} (${RULE.minEvents}, and ${RULE.minShare * 100} % of b0's ${x.base}) ${ok(x.ok)}`;
  console.log(`1 valid: ${half("D1a", valid.d1a)} · ${half("D1b", valid.d1b)}`);
  console.log(`2 choose: D1a PF ${f2(choose.pf)} ≥ ${f2(choose.need)} (b0 ${f2(choose.base)} + ${RULE.choose}) ${ok(choose.ok)}`);
  const jw = judge.windows;
  console.log(
    `3 judge: D1b PF ${f2(judge.d1b.pf)} ≥ ${f2(judge.d1b.need)} (b0 ${f2(judge.d1b.base)} + ${RULE.judge}) ${ok(judge.d1b.ok)} · ` +
      `higher in ${jw.wins} of ${jw.counted} windows with ≥ ${RULE.winEvents} events in both (≥ ${RULE.winsMin}) ${ok(jw.wins >= RULE.winsMin)} · ` +
      `no window down > ${RULE.maxFall} (${jw.falls.length ? `w${jw.falls.map((k) => k + 1).join(", w")} down` : `largest fall ${jw.worstFall == null ? "–" : sg(-jw.worstFall)}`}) ${ok(!jw.falls.length)}`,
  );
  if (r.forwardRule) {
    const f = r.forwardRule;
    console.log(`F: ${FWD_BASE} ${cell(r.forwardBase.d1).replaceAll(" | ", " · ")} → ${FWD} ${cell(r.forward.d1).replaceAll(" | ", " · ")} · PF ${f2(f.pf)} ≥ b0 ${f2(f.base)} with ${f.events} events (≥ ${RULE.fwdEvents}) ${ok(f.ok)}`);
  }
  const c = r.target.checks;
  console.log(
    `target (works): PF ≥ ${RULE.target} on D1a ${ok(c.d1a)}, D1b ${ok(c.d1b)}${r.target.forward ? `, F ${ok(c.f)}` : ", F not read"} · ≥ ${RULE.targetEvents} D1 events ${ok(c.events)} (${r.variant.d1.events})` +
      `${r.target.forward ? ` · ≥ ${RULE.targetFwdOrders} F orders ${ok(c.fOrders)} (${r.forward.d1.orders})` : ""} · PF ≥ ${RULE.targetWinPf} in every window with ≥ ${RULE.winEvents} events ${ok(c.windows && (c.fWindows ?? true))}`,
  );
}

// the verdicts side by side
console.log(`\n| range | verdict | events D1a / D1b (b0 → L) | PF D1a (b0 → L) | PF D1b (b0 → L) | windows higher | F | outcome |`);
console.log(`|${"---|".repeat(8)}`);
for (const r of rows) {
  const { base: b, variant: v } = r;
  console.log(
    `| ${r.name} | ${r.verdict} | ${b.d1a.events} / ${b.d1b.events} → ${v.d1a.events} / ${v.d1b.events} | ${f2(b.d1a.pf)} → ${f2(v.d1a.pf)} | ${f2(b.d1b.pf)} → ${f2(v.d1b.pf)} | ` +
      `${r.rule.judge.windows.wins} of ${r.rule.judge.windows.counted} | ${r.forwardRule ? `${f2(r.forwardRule.base)} → ${f2(r.forwardRule.pf)} ${ok(r.forwardRule.ok)}` : "–"} | ${r.outcome || "–"} |`,
  );
}
if (PROBLEMS.length) console.log(`\nno verdict: ${PROBLEMS.join("; ")} — rerun (Micro and Minimal are not computed in a fallback window)`);
