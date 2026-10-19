// Counterfactual PF-filter diagnostic on a copied forward paper record. This is not a replay of the
// complete Base/live gates or account execution: group mode deliberately pools configs, and warmup is retained.
// Unit-return qualification requires verified paper_trades.unit_r. Legacy sized r is never guessed or scored.
// usage: node --experimental-strip-types --no-warnings scripts/core-live-group-replay.mjs core.sqlite [N,N,…] [minPf] [gates.json]
// N="all": whole prior record, from 200 closes; cfg:N: each full config independently.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const { liveGroupOf } = await import("../src/core/live-validation.ts");
const { minPfOf, rangeOfId } = await import("../src/core/minimal-coord.ts");
const { profitFactor } = await import("../src/core/metrics/stats.ts");
const [file, ns = "50,100,200,400,all,cfg:25", minArg, gatesFile] = process.argv.slice(2);
if (!file) throw new Error("usage: core-live-group-replay.mjs core.sqlite [N,N,…] [minPf] [gates.json]");
const saved = gatesFile ? JSON.parse(readFileSync(gatesFile, "utf8")) : {};
const sourceGates = saved.settings?.gates ?? saved.gates ?? saved;
const MIN = Number(minArg ?? sourceGates.minPf ?? 1.05);
if (!Number.isFinite(MIN) || MIN < 0) throw new Error("minPf must be a finite nonnegative number");
const gates = { ...sourceGates, minPf: MIN };
const specs = ns.split(",").map((spec) => {
  const perCfg = spec.startsWith("cfg:");
  const raw = perCfg ? spec.slice(4) : spec;
  const n = raw === "all" ? Number.MAX_SAFE_INTEGER : Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`invalid close window: ${spec}`);
  return { perCfg, raw, n, from: raw === "all" ? 200 : n };
});
const FORWARD_MS = 15 * 60_000;
const db = new DatabaseSync(file, { readOnly: true });
let all;
try {
  const hasUnit = db.prepare("PRAGMA table_info(paper_trades)").all().some((x) => x.name === "unit_r");
  all = db.prepare(`SELECT cfg, entry_t, exit_t, r, first_at, ${hasUnit ? "unit_r" : "NULL AS unit_r"} FROM paper_trades ORDER BY exit_t`).all();
} finally { db.close(); }
// Negative recording delays, null/malformed returns and inverted timestamps are not forward-close evidence.
const rows = all.filter((x) => typeof x.cfg === "string" && x.cfg.length > 0 &&
  Number.isSafeInteger(x.entry_t) && x.entry_t > 0 && Number.isSafeInteger(x.exit_t) && x.exit_t >= x.entry_t &&
  Number.isSafeInteger(x.first_at) && x.first_at >= x.exit_t && x.first_at - x.exit_t <= FORWARD_MS &&
  typeof x.r === "number" && Number.isFinite(x.r));
const known = (x) => typeof x.unit_r === "number" && Number.isFinite(x.unit_r);
const hours = rows.length ? (rows.at(-1).exit_t - rows[0].exit_t) / 3_600_000 : 0;
console.log(`${rows.length} forward closes over ${hours.toFixed(1)} h · ${rows.filter(known).length} verified unit returns · ${rows.filter((x) => !known(x)).length} unknown unit basis · ${all.length - rows.length} invalid/backfilled excluded`);
console.log(`Counterfactual diagnostic only; not complete runtime qualification or actual exchange execution. Group mode pools configs. Warmup is retained, not PF-qualified. Global minimum ${MIN}; each config retains its indication/range minimum (Tactic >= 1.1). Unknown returns never qualify or fill a missing window.`);
const acc = () => ({ p: 0, l: 0, n: 0, unknown: 0 });
const add = (a, r) => { a.n++; if (r > 0) a.p += r; else a.l -= r; };
const fmt = (a) => a.unknown ? `return PF unavailable (${a.unknown} unknown unit returns; ${a.n} verified)` : !a.n ? "return PF unavailable (0 verified returns)" :
  `return PF ${a.p > 0 && a.l <= 0 ? "No losses (engine score convention)" : profitFactor(a.p, a.l).toFixed(2)} Σr ${((a.p - a.l) * 100).toFixed(2)} points (${a.n} verified)`;
function replay(keyOf, n, from) {
  const by = new Map();
  for (const x of rows) {
    const k = keyOf(x.cfg);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(x);
  }
  const out = [];
  for (const [k, xs] of by) {
    const p = new Float64Array(xs.length + 1);
    const l = new Float64Array(xs.length + 1);
    const unknown = new Uint32Array(xs.length + 1);
    for (let i = 0; i < xs.length; i++) {
      const r = known(xs[i]) ? xs[i].unit_r : 0;
      p[i + 1] = p[i] + Math.max(0, r);
      l[i + 1] = l[i] + Math.max(0, -r);
      unknown[i + 1] = unknown[i] + (known(xs[i]) ? 0 : 1);
    }
    const a = acc();
    a.unknown = unknown[xs.length];
    const t = acc();
    let warmup = 0;
    let blockedUnknown = 0;
    for (const x of xs) {
      if (!known(x)) continue;
      add(a, x.unit_r);
      // Only closes strictly before entry can affect the decision. Prefix sums keep "all" O(N log N).
      let lo = 0;
      let hi = xs.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (xs[m].exit_t < x.entry_t) lo = m + 1;
        else hi = m;
      }
      const start = Math.max(0, lo - n);
      if (unknown[lo] !== unknown[start]) { blockedUnknown++; continue; }
      const warming = lo < from;
      const need = minPfOf(gates, rangeOfId(x.cfg), x.cfg.split("|")[1]);
      if (!warming && profitFactor(p[lo] - p[start], l[lo] - l[start]) < need) continue;
      add(t, x.unit_r);
      if (warming) warmup++;
    }
    out.push({ k, a, t, warmup, blockedUnknown, n: xs.length });
  }
  return out.sort((x, y) => y.n - x.n);
}
for (const { perCfg, raw, n, from } of specs) {
  const res = replay(perCfg ? (c) => c : liveGroupOf, n, from);
  const total = res.reduce((s, x) => ({
    a: { p: s.a.p + x.a.p, l: s.a.l + x.a.l, n: s.a.n + x.a.n, unknown: s.a.unknown + x.a.unknown },
    t: { p: s.t.p + x.t.p, l: s.t.l + x.t.l, n: s.t.n + x.t.n, unknown: 0 },
    warmup: s.warmup + x.warmup, blockedUnknown: s.blockedUnknown + x.blockedUnknown,
  }), { a: acc(), t: acc(), warmup: 0, blockedUnknown: 0 });
  console.log(`\n${perCfg ? `per config, last ${raw}` : raw === "all" ? "pooled group, whole prior record (from 200)" : `pooled group, last ${raw}`}: all ${fmt(total.a)} · retained ${fmt(total.t)} · taken ${total.t.n} of ${rows.length}; warmup ${total.warmup}, PF-qualified ${total.t.n - total.warmup}, blocked by unknown history ${total.blockedUnknown}`);
  if (!perCfg) for (const x of res)
    console.log(`  ${x.k.padEnd(8)} ${String(x.n).padStart(6)} closes · all ${fmt(x.a)} · retained ${fmt(x.t)} (${x.t.n} taken; ${x.warmup} warmup)`);
  else console.log(`  ${res.length} configs, most closes per config ${res.reduce((a, x) => Math.max(a, x.n), 0)}`);
}
