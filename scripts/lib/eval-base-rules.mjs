// The two-window Base readout of an eval (scripts/eval-gate.mjs run with gates.baseWindows.report): per range × report
// rule, the orders the run would keep had the rule gated Base. A trade is kept when its pair passed the rule in the
// trade's window for the trade's range, at the trade's target (the config id's tp token / 100: a range cell keeps its
// price target on every lane); Wide and a range judged at the default cell keep every target. The configs and ranges
// execute independently (one seat per config, seats per range tag), so the subset is the gated run's orders up to the
// duplicate rule — a choose-only read of D1a; the enforced run (gates.baseWindows.gate) is the evidence.

export const RANGE_NAME = {
  "": "Wide",
  mc: "Micro",
  mn: "Minimal",
  mp: "Minimal plus",
  sh: "Short",
  gn: "General",
  lg: "Long",
};

/** The range tag of a config id ("" = Wide). */
export const tagOf = (cfg) => {
  const m = /\|(mc|mp|mn|sh|gn|lg)(?=\||$)/.exec(cfg);
  return m ? m[1] : "";
};
/** The target of a config id as a fraction (tp1.3 → 0.013), null without one. */
export const tpOf = (cfg) => {
  const m = /\|tp([\d.]+)\|/.exec(cfg);
  return m ? +(Number(m[1]) / 100).toFixed(6) : null;
};
const pairOf = (cfg) => cfg.split("|").slice(0, 2).join("|");
const isSignal = (cfg) => (cfg.split("|")[1] ?? "").startsWith("sig-");

/** Whether one rule's readout of a pair (`{tag: targets | null}`) keeps a trade of this range and target. */
export function ruleKeeps(rule, tag, tp) {
  if (!rule || !Object.hasOwn(rule, tag)) return false;
  const tps = rule[tag];
  return tps === null || (tp != null && tps.some((x) => Math.abs(x - tp) < 5e-7));
}

/** PF at the stored unit returns, as eval-gate: no loss → 9, no gain → 0. */
export function pfOf(rs) {
  let gp = 0;
  let gl = 0;
  for (const v of rs) {
    if (v > 0) gp += v;
    else gl -= v;
  }
  return gl < 1e-12 ? (gp > 0 ? 9 : 0) : gp / gl;
}

/**
 * Per range (engine trades only: the signals have their own Base) × variant ("as run", then each report rule): the
 * pairs kept (summed over the windows), the orders, the events (distinct symbol × side × entry time), the PF over D1,
 * D1a (entries before the split), D1b and per window ({ n, pf }; pf null without orders).
 */
export function baseRuleReadout(out) {
  const rules = out.summary?.baseRules ?? [];
  const windows = out.windows ?? [];
  const split = Date.parse(out.summary?.span?.split ?? "");
  const spans = windows.map((w) => [Date.parse(w.from), Date.parse(w.to)]);
  const winOf = (t) => spans.findIndex(([a, b]) => t >= a && t < b);
  const pairs = windows.map((w) => new Map((w.pairs ?? []).map((p) => [p.pair, p])));
  const variants = [
    { label: "as run", k: -1 },
    ...rules.map((rule, k) => ({ label: `rule ${k + 1}`, k, rule })),
  ];
  const tags = new Set();
  for (const t of out.trades ?? []) if (!isSignal(t.cfg)) tags.add(tagOf(t.cfg));
  for (const m of pairs) for (const p of m.values()) for (const t of p.tags ?? []) tags.add(t);
  const order = Object.keys(RANGE_NAME);
  const rows = [];
  for (const tag of [...tags].sort((a, b) => order.indexOf(a) - order.indexOf(b))) {
    for (const v of variants) {
      let pairsKept = 0;
      for (const m of pairs)
        for (const p of m.values())
          if (v.k < 0 ? (p.tags ?? []).includes(tag) : ruleHasTag(p.rules?.[v.k], tag)) pairsKept++;
      const kept = [];
      for (const t of out.trades ?? []) {
        if (isSignal(t.cfg) || tagOf(t.cfg) !== tag) continue;
        const w = winOf(t.entryT);
        if (v.k >= 0) {
          const p = w >= 0 ? pairs[w].get(pairOf(t.cfg)) : undefined;
          if (!ruleKeeps(p?.rules?.[v.k], tag, tpOf(t.cfg))) continue;
        }
        kept.push({ ...t, w });
      }
      const rs = (xs) => xs.map((t) => t.r);
      const a = kept.filter((t) => t.entryT < split);
      const b = kept.filter((t) => t.entryT >= split);
      rows.push({
        range: RANGE_NAME[tag] ?? tag,
        tag,
        variant: v.label,
        rule: v.rule ?? null,
        pairsKept,
        orders: kept.length,
        events: new Set(kept.map((t) => `${t.sym}|${t.side}|${t.entryT}`)).size,
        pf: {
          d1: kept.length ? pfOf(rs(kept)) : null,
          d1a: a.length ? pfOf(rs(a)) : null,
          d1b: b.length ? pfOf(rs(b)) : null,
        },
        windows: windows.map((_, w) => {
          const xs = kept.filter((t) => t.w === w);
          return { n: xs.length, pf: xs.length ? pfOf(rs(xs)) : null };
        }),
      });
    }
  }
  return { rules, rows };
}

const ruleHasTag = (rule, tag) => !!rule && Object.hasOwn(rule, tag);
