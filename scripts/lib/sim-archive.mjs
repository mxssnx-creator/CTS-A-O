// Durable, comparable record of a simulated trading session, and the diff between two of them.
//
// A session report (data.json of scripts/core-session.mjs, or an older docs/session-*.json) is reduced to a compact record:
// window, symbols, settings (long lists shortened), total, per-strategy and per-lane results, one row per hour and the
// engine's stage counts. Records are saved under docs/sim-results/ with an index, so any later run can be compared against
// an earlier one (scripts/sim-compare.mjs). Nothing here changes a session's result; it only reads the finished report.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const ARCHIVE_SCHEMA = 1;
const TOTAL_KEYS = ["orders", "positions", "pf", "net", "wr", "ddtH", "balanceEnd", "equityMaxDd", "equityMaxDdPct",
  "avgOpenOrders", "maxOpenOrders", "avgOpenPositions", "maxOpenPositions"];
const GROUP_KEYS = ["n", "pf", "net", "wr", "wins", "losses", "ddtH"];
const HOUR_KEYS = ["t", "orders", "positions", "pf", "wr", "wins", "losses", "net", "eqEnd", "eqMin", "maxDdPct", "ddNowH",
  "marginMax", "openEnd", "openPosEnd", "partial"];
const ENGINE_KEYS = ["computeMs", "baseEvaluated", "basePassed", "mainPairs", "tapes", "real"];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o && o[k] !== undefined).map((k) => [k, o[k]]));

/** Long lists (a 2,500-entry focus) are kept as their length; everything else is copied. */
export function compact(v, depth = 0) {
  if (Array.isArray(v)) return v.length > 50 || depth > 6 ? { length: v.length } : v.map((x) => compact(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 6) return { keys: Object.keys(v).length };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, compact(x, depth + 1)]));
  }
  return v;
}

function groups(v) {
  if (!v) return {};
  const rows = Array.isArray(v) ? v.map((x, i) => [x?.name ?? x?.key ?? String(i), x]) : Object.entries(v);
  return Object.fromEntries(rows.map(([k, x]) => [k, pick(x, GROUP_KEYS)]));
}

/** @param {object} data a session report (core-session data.json or an older docs/session-*.json) */
export function summarize(data, meta = {}) {
  if (!data || typeof data !== "object" || !data.total) throw new Error("sim-archive: not a session report (no total)");
  return {
    schema: ARCHIVE_SCHEMA,
    label: meta.label ?? "",
    savedAt: meta.savedAt ?? new Date().toISOString(),
    commit: meta.commit ?? null,
    command: meta.command ?? null,
    source: meta.source ?? null,
    at: data.at ?? null,
    window: data.window ?? null,
    symbols: Array.isArray(data.symbols) ? data.symbols : [],
    marketData: data.marketDataLabel ?? null,
    settings: compact(data.settings ?? {}),
    total: pick(data.total, TOTAL_KEYS),
    strategies: groups(data.strategies),
    lanes: groups(data.lanes),
    hours: (data.hours ?? []).map((h) => pick(h, HOUR_KEYS)),
    engine: pick(data.engine, ENGINE_KEYS),
    checks: data.checks ? { ok: data.checks.filter((c) => c.ok).length, n: data.checks.length } : null,
  };
}

function flatten(o, prefix = "", out = {}) {
  if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = JSON.stringify(o);
  return out;
}
const finite = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const delta = (a, b) => ({ a, b, d: finite(a) !== null && finite(b) !== null ? b - a : null });

/** Difference of two records (or of anything summarize() accepts). Hours are aligned by index, not by date. */
export function compareRecords(a, b) {
  const A = a?.schema ? a : summarize(a), B = b?.schema ? b : summarize(b);
  const keys = (x, y) => [...new Set([...Object.keys(x), ...Object.keys(y)])];
  const group = (x, y) => Object.fromEntries(keys(x, y).map((k) => [k, Object.fromEntries(GROUP_KEYS.map((g) => [g, delta(x[k]?.[g], y[k]?.[g])]))]));
  const fa = flatten(A.settings), fb = flatten(B.settings);
  return {
    a: { label: A.label, commit: A.commit, window: A.window, symbols: A.symbols.length, checks: A.checks },
    b: { label: B.label, commit: B.commit, window: B.window, symbols: B.symbols.length, checks: B.checks },
    total: Object.fromEntries(keys(A.total, B.total).map((k) => [k, delta(A.total[k], B.total[k])])),
    strategies: group(A.strategies, B.strategies),
    lanes: group(A.lanes, B.lanes),
    engine: Object.fromEntries(keys(A.engine, B.engine).map((k) => [k, delta(A.engine[k], B.engine[k])])),
    hours: Array.from({ length: Math.max(A.hours.length, B.hours.length) }, (_, i) => ({
      hour: i, pf: delta(A.hours[i]?.pf, B.hours[i]?.pf), net: delta(A.hours[i]?.net, B.hours[i]?.net),
      orders: delta(A.hours[i]?.orders, B.hours[i]?.orders), eqEnd: delta(A.hours[i]?.eqEnd, B.hours[i]?.eqEnd),
    })),
    settings: keys(fa, fb).filter((k) => fa[k] !== fb[k]).map((k) => ({ key: k, a: fa[k] ?? null, b: fb[k] ?? null })),
  };
}

const f = (x, d = 3) => (finite(x) !== null ? (+x.toFixed(d)).toString() : x === undefined || x === null ? "–" : String(x));
const dd = (c, d = 3) => (c.d === null ? "–" : `${c.d > 0 ? "+" : ""}${+c.d.toFixed(d)}`);
const row = (name, c, d) => `| ${name} | ${f(c.a, d)} | ${f(c.b, d)} | ${dd(c, d)} |`;

export function renderComparison(c) {
  const L = [];
  L.push(`# Session comparison`, ``, `A = ${c.a.label || "(unlabelled)"} ${c.a.commit ?? ""} · ${c.a.symbols} symbols with data · checks ${c.a.checks ? `${c.a.checks.ok}/${c.a.checks.n}` : "–"}`,
    `B = ${c.b.label || "(unlabelled)"} ${c.b.commit ?? ""} · ${c.b.symbols} symbols with data · checks ${c.b.checks ? `${c.b.checks.ok}/${c.b.checks.n}` : "–"}`, ``);
  if (c.a.symbols !== c.b.symbols) L.push(`> The symbol counts differ, so these are not like-for-like results.`, ``);
  L.push(`## Total`, ``, `| metric | A | B | B − A |`, `|---|---:|---:|---:|`, ...Object.entries(c.total).map(([k, v]) => row(k, v)), ``);
  for (const [title, g] of [["Strategies", c.strategies], ["Timeframe lanes", c.lanes]]) {
    L.push(`## ${title}`, ``, `| name | orders A | orders B | PF A | PF B | PF B − A | net A | net B |`, `|---|---:|---:|---:|---:|---:|---:|---:|`,
      ...Object.entries(g).map(([k, v]) => `| ${k} | ${f(v.n.a, 0)} | ${f(v.n.b, 0)} | ${f(v.pf.a)} | ${f(v.pf.b)} | ${dd(v.pf)} | ${f(v.net.a)} | ${f(v.net.b)} |`), ``);
  }
  L.push(`## Hour by hour (aligned by index)`, ``, `| hour | PF A | PF B | net A | net B | orders A | orders B | equity A | equity B |`, `|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...c.hours.map((h) => `| ${h.hour + 1} | ${f(h.pf.a)} | ${f(h.pf.b)} | ${f(h.net.a)} | ${f(h.net.b)} | ${f(h.orders.a, 0)} | ${f(h.orders.b, 0)} | ${f(h.eqEnd.a, 2)} | ${f(h.eqEnd.b, 2)} |`), ``);
  L.push(`## Engine`, ``, `| metric | A | B | B − A |`, `|---|---:|---:|---:|`, ...Object.entries(c.engine).map(([k, v]) => row(k, v, 0)), ``);
  L.push(`## Settings that differ (${c.settings.length})`, ``, ...(c.settings.length ? c.settings.slice(0, 80).map((s) => `- \`${s.key}\`: ${s.a} → ${s.b}`) : ["none"]));
  if (c.settings.length > 80) L.push(`- … ${c.settings.length - 80} more`);
  return L.join("\n") + "\n";
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "session";

/** Save a record under dir/<end date>-<label>-<hash>.json and add it to dir/index.json. Idempotent for identical content. */
export function archiveRecord(record, dir = "docs/sim-results") {
  mkdirSync(dir, { recursive: true });
  const body = JSON.stringify({ ...record, savedAt: undefined }, null, 1);
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 8);
  const end = record.window?.endT ? new Date(record.window.endT).toISOString().slice(0, 13).replace(/[-:T]/g, "") : "undated";
  const name = `${end}-${slug(record.label)}-${hash}.json`;
  const file = join(dir, name);
  if (!existsSync(file)) writeFileSync(file, JSON.stringify(record, null, 1) + "\n");
  const indexFile = join(dir, "index.json");
  let index = [];
  try { index = JSON.parse(readFileSync(indexFile, "utf8")); } catch { /* first record */ }
  if (!index.some((e) => e.file === name))
    index.push({ file: name, label: record.label, savedAt: record.savedAt, commit: record.commit, symbols: record.symbols.length,
      runH: record.settings?.runH ?? null, tactics: record.settings?.tactics ?? null, orders: record.total?.orders ?? null,
      pf: finite(record.total?.pf), net: finite(record.total?.net), balanceEnd: finite(record.total?.balanceEnd) });
  writeFileSync(indexFile, JSON.stringify(index, null, 1) + "\n");
  return file;
}

export function archiveSession(data, { label = "", dir = "docs/sim-results", commit = null, command = null, source = null } = {}) {
  return archiveRecord(summarize(data, { label, commit, command, source }), dir);
}
