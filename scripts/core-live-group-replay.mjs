// Replay the live validation on a desk's forward paper record: for each live group (Signals, or the config's target
// range) and window N, every forward close is taken only if the group's (or the config's) last N closes that EXITED
// BEFORE ITS ENTRY held PF ≥ min — what the gate sees when it decides. Prints, per group, all closes against the
// taken ones, and the total. Copy the desk's core.sqlite first (the desk keeps writing it).
// usage: node --experimental-strip-types --no-warnings scripts/core-live-group-replay.mjs core.sqlite [N,N,…] [minPf]
//        N = "all": the whole record before the entry, judged from 200 closes; "cfg:N": per config instead of group
import { DatabaseSync } from "node:sqlite";

const { liveGroupOf } = await import("../src/core/live-validation.ts");

const [file, ns = "50,100,200,400,all,cfg:25", minArg = "1.05"] = process.argv.slice(2);
if (!file) {
  console.error("usage: core-live-group-replay.mjs core.sqlite [N,N,…] [minPf]");
  process.exit(2);
}
const MIN = Number(minArg);
// the forward record: closes recorded within 15 min of their exit (a back-filled close is not a live one)
const FORWARD_MS = 15 * 60_000;
const db = new DatabaseSync(file, { readOnly: true });
const rows = db
  .prepare(
    "SELECT cfg, entry_t, exit_t, r FROM paper_trades WHERE first_at IS NOT NULL AND first_at - exit_t <= ? ORDER BY exit_t",
  )
  .all(FORWARD_MS);
const hours = rows.length ? (rows.at(-1).exit_t - rows[0].exit_t) / 3_600_000 : 0;
console.log(`${rows.length} forward closes over ${hours.toFixed(1)} h · min PF ${MIN}`);

const pfOf = (p, l) => (l === 0 ? (p > 0 ? Infinity : 0) : p / l);
const fmt = (p, l) => `PF ${pfOf(p, l).toFixed(2)} Σr ${((p - l) * 100).toFixed(0)} %`;

function replay(keyOf, n, from) {
  const by = new Map();
  for (const x of rows) {
    const k = keyOf(x.cfg);
    let xs = by.get(k);
    if (!xs) by.set(k, (xs = []));
    xs.push(x);
  }
  const out = [];
  for (const [k, xs] of by) {
    const exits = xs.map((x) => x.exit_t);
    const a = { p: 0, l: 0, n: xs.length };
    const t = { p: 0, l: 0, n: 0 };
    for (const x of xs) {
      // closes of the key that exited before this entry
      let lo = 0;
      let hi = exits.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (exits[m] < x.entry_t) lo = m + 1;
        else hi = m;
      }
      let ok = true;
      if (lo >= from) {
        let p = 0;
        let l = 0;
        for (let j = Math.max(0, lo - n); j < lo; j++) {
          if (xs[j].r > 0) p += xs[j].r;
          else l -= xs[j].r;
        }
        ok = pfOf(p, l) >= MIN;
      }
      if (x.r > 0) a.p += x.r;
      else a.l -= x.r;
      if (ok) {
        t.n++;
        if (x.r > 0) t.p += x.r;
        else t.l -= x.r;
      }
    }
    out.push({ k, a, t });
  }
  return out.sort((x, y) => y.a.n - x.a.n);
}

for (const spec of ns.split(",")) {
  const perCfg = spec.startsWith("cfg:");
  const raw = perCfg ? spec.slice(4) : spec;
  const n = raw === "all" ? Number.MAX_SAFE_INTEGER : Number(raw);
  const from = raw === "all" ? 200 : n;
  const res = replay(perCfg ? (c) => c : liveGroupOf, n, from);
  const tot = res.reduce(
    (s, x) => ({ ap: s.ap + x.a.p, al: s.al + x.a.l, tp: s.tp + x.t.p, tl: s.tl + x.t.l, tn: s.tn + x.t.n }),
    { ap: 0, al: 0, tp: 0, tl: 0, tn: 0 },
  );
  console.log(
    `\n${perCfg ? `per config, last ${raw}` : raw === "all" ? "group, whole record (from 200)" : `group, last ${raw}`}: all ${fmt(tot.ap, tot.al)} · gated ${fmt(tot.tp, tot.tl)} · taken ${tot.tn} of ${rows.length}`,
  );
  if (!perCfg)
    for (const x of res)
      console.log(
        `  ${x.k.padEnd(8)} ${String(x.a.n).padStart(6)} closes · all ${fmt(x.a.p, x.a.l)} · gated ${fmt(x.t.p, x.t.l)} (${x.t.n} taken)`,
      );
  else console.log(`  ${res.length} configs, most closes per config ${Math.max(0, ...res.map((x) => x.a.n))}`);
}
