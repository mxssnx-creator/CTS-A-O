// Session report: enabled / disabled overviews. Two pure pieces the session script (scripts/core-session.mjs) runs
// after its main run:
//   1. walk-forward variants on the session's final tapes — every strategy type and every cheap adjustment flipped one
//      at a time against the desk's own options (the baseline), each summarized to per-hour aggregates and a trade-set
//      fingerprint, so the report can say which switch changes results and which is a no-op;
//   2. a live sizing replay — the live control's own sizing functions (topConfigLanes → controlTargets →
//      scaleToExposure → scaleToRisk ×2 → planControl) applied to the baseline's open positions over time, per sizing
//      variant (rebalance threshold, exposure scaler, position cap, risk budgets, volume factor, top configs).
// Neither builds tapes: tactics that shape tapes at build time are listed as "needs a recompute".
import type { Trade, StrategyToggles, RangeCoord } from "../domain/types.ts";
import { crowdRangeOf, type WalkForwardOptions, type CoordSettings } from "./walkforward.ts";
import { profitFactor } from "../metrics/stats.ts";
import { typeOf } from "../statistics.ts";
import {
  controlTargets,
  planControl,
  positionCapFor,
  scaleToExposure,
  scaleToRisk,
  stateHash,
  topConfigLanes,
  type ControlContribution,
  isMinAboveCapSkip,
} from "../server/live.ts";

const H = 3_600_000;

// ── 1. walk-forward variants ─────────────────────────────────────────────────────────────────────────────────

export type VariantStatus = "run" | "na" | "recompute";
export interface VariantSpec {
  id: string;
  group: "types" | "signals" | "coordination" | "block" | "gates" | "tactics";
  label: string;
  /** what the variant changes against the baseline, in words */
  change: string;
  /** the baseline's value of the switch, in words */
  asRun: string;
  status: VariantStatus;
  /** why a variant is not run (n/a: the switch has nothing to act on; recompute: it shapes tapes) */
  why?: string;
  opts?: WalkForwardOptions;
}

const TOGGLE_LABEL: Record<keyof StrategyToggles, string> = {
  normal: "Normal",
  trailing: "Trailing",
  block: "Block",
  blockActive: "Block Active",
  dca: "DCA",
  dcaActive: "DCA Active",
  axis: "Axis",
};
/** the tape kinds a toggle needs to act on anything (turning it on without them changes nothing) */
const TOGGLE_KINDS: Partial<Record<keyof StrategyToggles, string[]>> = {
  normal: ["normal", "trailing"],
  trailing: ["trailing"],
  dca: ["dca", "dca-active"],
  dcaActive: ["dca-active"],
  axis: ["axis"],
};
const onOff = (v: unknown) => (v ? "on" : "off");

export interface VariantContext {
  /** tapes per kind (normal / trailing / dca / dca-active / axis) and signal tapes */
  kinds: Readonly<Record<string, number>>;
  signalTapes: number;
  /** the compute's tactics (they shape tapes at build time: listed, never run) */
  tactics?: Readonly<Record<string, unknown>> | null;
}

/**
 * Every variant of the baseline options: each strategy toggle flipped, signals / confirmation / engine direction
 * acceptance, the coordination switches, Block mode and steps, the last-N / symbol / direction gates and the position
 * cap. A variant identical to the baseline is not listed; one whose switch has nothing to act on is "na"; tactics are
 * "recompute" rows. ~30 runs for a desk with signals and Block on.
 */
export function walkForwardVariants(base: WalkForwardOptions, ctx: VariantContext): VariantSpec[] {
  const out: VariantSpec[] = [];
  const tg = base.toggles;
  const coord: CoordSettings = base.coord ?? {
    enabled: false,
    hourLock: 0,
    cooldown: "off",
    conflict: false,
    confirm: false,
  };
  const signalsOn = ctx.signalTapes > 0 && (!!base.signalRank || (base.signalActive?.size ?? 0) > 0);
  const blockOn = tg.block || tg.blockActive;
  const push = (v: Omit<VariantSpec, "status"> & { status?: VariantStatus }) =>
    out.push({ status: "run", ...v, ...(v.status && v.status !== "run" ? { opts: undefined } : {}) });
  const withCoord = (c: Partial<CoordSettings>): WalkForwardOptions => ({ ...base, coord: { ...coord, ...c } });

  // strategy types: each toggle flipped
  for (const k of Object.keys(TOGGLE_LABEL) as Array<keyof StrategyToggles>) {
    const on = !!tg[k];
    const need = TOGGLE_KINDS[k];
    const have = need ? need.reduce((a, x) => a + (ctx.kinds[x] ?? 0), 0) : 1;
    const v: Parameters<typeof push>[0] = {
      id: `type:${k}`,
      group: "types",
      label: `${TOGGLE_LABEL[k]} ${on ? "off" : "on"}`,
      change: `${TOGGLE_LABEL[k]} ${on ? "on → off" : "off → on"}`,
      asRun: onOff(on),
      opts: { ...base, toggles: { ...tg, [k]: !on } },
    };
    if (!on && have === 0)
      Object.assign(v, { status: "recompute", why: `no ${need!.join(" / ")} tapes in this compute` });
    else if (k === "dcaActive" && !tg.dca) Object.assign(v, { status: "na", why: "DCA is off: DCA Active only picks which DCA tapes trade" });
    push(v);
  }
  // entry crowding: at most K configs of a range on one symbol × side × bar (best first). 24 h, 6 Oct: one LYN bar
  // entered 229 Micro configs, all stopped — Micro's whole loss
  // (Wide: every untagged config — the default grid, Axis and DCA. One Axis trade executed up to 79 times across its
  // variants on micro20, 369 orders for 28 positions)
  for (const [tag, name] of [["mc", "Micro"], ["sh", "Short"], ["gn", "General"], ["lg", "Long"], ["sig", "Signals"], ["wide", "Wide (incl. Axis, DCA)"]] as const) {
    const cur = base.entryCrowd?.[tag] ?? 0;
    for (const k of cur ? [1, 3, 10, 0] : [1, 3, 10]) {
      if (k === cur) continue;
      push({
        id: `type:crowd-${tag}-${k}`,
        group: "types",
        label: k ? `${name}: at most ${k} per bar` : `${name}: no crowding cap`,
        change: `${name} configs per symbol × side × bar ${cur || "unlimited"} → ${k || "unlimited"}`,
        asRun: cur ? String(cur) : "unlimited",
        opts: { ...base, entryCrowd: { ...base.entryCrowd, [tag]: k } },
      });
    }
  }
  // Axis / DCA only beside their pair's validated base: with every config its own seat a ladder traded on its own
  // window alone, beside Normal configs of its pair that lost (micro20: DCA PF 0.56, Axis 0.77 vs grid 0.96)
  {
    const ladders = (ctx.kinds.axis ?? 0) + (ctx.kinds.dca ?? 0) + (ctx.kinds["dca-active"] ?? 0);
    push({
      id: "type:ladder-needs-base",
      group: "types",
      label: "Axis / DCA only beside their pair's seated Normal",
      change: "an Axis or DCA config takes a seat only while a Normal / Trailing config of its pair holds one",
      asRun: base.ladderNeedsBase ? "on" : "off",
      ...(ladders > 0
        ? { opts: { ...base, ladderNeedsBase: !base.ladderNeedsBase } }
        : { status: "na" as const, why: "no Axis or DCA tapes in this compute" }),
    });
  }
  // ranges off, one at a time (no new entry from that range; it keeps computing): what live.excludeRanges sends.
  // 24 h, 6 Oct — Micro lost in both measurements (PF 0.35, 0.47) while its Base cells passed at PF 2.9
  const exR = base.excludeRanges ?? [];
  for (const [tag, name] of [["mc", "Micro"], ["mn", "Minimal"], ["mp", "Minimal plus"], ["sh", "Short"], ["gn", "General"], ["lg", "Long"]] as const) {
    if (exR.includes(tag)) continue;
    push({
      id: `type:range-off-${tag}`,
      group: "types",
      label: `${name} off`,
      change: `${name} opens nothing new (excludeRanges + ${tag})`,
      asRun: exR.length ? `excluded: ${exR.join(", ")}` : "every range",
      opts: { ...base, excludeRanges: [...exR, tag] },
    });
  }

  // signals
  if (ctx.signalTapes === 0)
    push({
      id: "sig:signals",
      group: "signals",
      label: "Signals on",
      change: "signals off → on",
      asRun: "off",
      status: "recompute",
      why: "no signal tapes in this compute (signals were off when the tapes were built)",
    });
  else
    push({
      id: "sig:signals",
      group: "signals",
      label: signalsOn ? "Signals off" : "Signals on (every signal tape)",
      change: signalsOn ? "signal orders excluded (no active signal)" : "every signal tape trades",
      asRun: onOff(signalsOn),
      opts: signalsOn
        ? { ...base, signalRank: undefined, signalActive: new Set<string>() }
        : { ...base, signalActive: undefined },
    });
  const confirmOn = !!(coord.enabled && coord.confirm);
  push({
    id: "sig:confirm",
    group: "signals",
    label: `Signal confirmation ${confirmOn ? "off" : "on"}`,
    change: confirmOn ? "confirmation on → off" : `confirmation off → on${coord.enabled ? "" : " (coordination on)"}`,
    asRun: onOff(confirmOn),
    opts: withCoord({ enabled: true, confirm: !confirmOn }),
    ...(signalsOn ? {} : { status: "na" as const, why: "no signal orders to confirm" }),
  });
  const esa = base.engineSideAccept;
  push({
    id: "sig:engineSide",
    group: "signals",
    label: `Engine direction acceptance ${esa?.enabled ? "off" : "on"}`,
    change: esa?.enabled
      ? "engine direction acceptance on → off"
      : "off → on (PF ≥ 1.05 over 24 h, ≥ 30 closes per family × range × side)",
    asRun: esa?.enabled ? `on (PF ${esa.minPf} · ${esa.hours} h · ${esa.minTrades} closes)` : "off",
    opts: {
      ...base,
      engineSideAccept: esa?.enabled
        ? { ...esa, enabled: false }
        : { enabled: true, minPf: 1.05, hours: 24, minTrades: 30 },
    },
  });
  // engine direction acceptance: every parameter one at a time around the as-run setting (operator, 6 Oct: on, and
  // every possibility shown with / without)
  if (esa?.enabled) {
    const alts: Array<[string, Partial<typeof esa>]> = [
      ...[3, 12, 48].filter((h) => h !== esa.hours).map((h) => [`window ${h} h`, { hours: h }] as [string, Partial<typeof esa>]),
      ...[1.2, 1.3].filter((x) => x !== esa.minPf).map((x) => [`PF ${x}`, { minPf: x }] as [string, Partial<typeof esa>]),
      ...[10, 60].filter((n) => n !== esa.minTrades).map((n) => [`${n} closes`, { minTrades: n }] as [string, Partial<typeof esa>]),
    ];
    for (const [what, ch] of alts)
      push({
        id: `sig:engineSide-${Object.entries(ch).map(([k, v]) => `${k}${v}`).join("")}`,
        group: "signals",
        label: `Engine direction acceptance ${what}`,
        change: `engine direction acceptance ${what} (as run: PF ${esa.minPf} · ${esa.hours} h · ${esa.minTrades} closes)`,
        asRun: `PF ${esa.minPf} · ${esa.hours} h · ${esa.minTrades} closes`,
        opts: { ...base, engineSideAccept: { ...esa, ...ch } },
      });
    // per indication: a range's direction group split by indication (with its lane). 6 Oct, two 24 h windows: the
    // pooled Micro group (PF 0.3–0.5) blocked mc-rsi3-10@m5c, PF 4.0 in both
    const cur = esa.perInd ?? [];
    for (const [id, what, ranges] of [
      ["mc", "Micro", ["mc"]],
      ["all", "every range", ["mc", "mn", "mp", "sh", "gn", "lg", "wide"]],
      ["off", "pooled per range", []],
    ] as const) {
      if ([...ranges].sort().join() === [...cur].sort().join()) continue;
      push({
        id: `sig:engineSidePerInd-${id}`,
        group: "signals",
        label: `Engine direction acceptance per indication: ${what}`,
        change: `direction groups split by indication on ${ranges.length ? ranges.join(", ") : "no range"} (as run: ${cur.length ? cur.join(", ") : "none"})`,
        asRun: cur.length ? cur.join(", ") : "pooled per range",
        opts: { ...base, engineSideAccept: { ...esa, perInd: [...ranges] } },
      });
    }
  }
  const sa = base.signalAccept;
  push({
    id: "sig:accept",
    group: "signals",
    label: `Signal acceptance ${sa?.enabled ? "off" : "on"}`,
    change: sa?.enabled ? "per-group signal acceptance on → off" : "off → on (PF ≥ 1.3 over 48 h, ≥ 6 closes)",
    asRun: sa?.enabled ? `on (PF ${sa.minPf} · ${sa.hours} h · ${sa.minTrades} closes)` : "off",
    opts: {
      ...base,
      signalAccept: sa?.enabled ? { ...sa, enabled: false } : { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 },
    },
    ...(signalsOn ? {} : { status: "na" as const, why: "no signal orders" }),
  });
  // both together: each was measured alone (7 Oct, six 24 h windows: acceptance off better in 6, confirmation off in
  // 5 and equal in 1, net with the open book) — whether they add up is its own question
  if (sa?.enabled && confirmOn)
    push({
      id: "sig:accept-confirm",
      group: "signals",
      label: "Signal acceptance and confirmation off",
      change: "per-group signal acceptance and signal confirmation on → off, together",
      asRun: "both on",
      opts: { ...withCoord({ enabled: true, confirm: false }), signalAccept: { ...sa, enabled: false } },
      ...(signalsOn ? {} : { status: "na" as const, why: "no signal orders" }),
    });
  // the per-step active ranking: how many signals (pair × symbol) are active and how they are ranked. Measured, not
  // applied: 6 Oct, 12 symbols, the 50 best by net ÷ drawdown² were signals that barely fire (a few clean wins
  // over 14 days score highest) — 3,334 signal candidates in 3 h, every one outside the active set
  const sr = base.signalRank;
  const rankNa = signalsOn && sr ? {} : { status: "na" as const, why: "no ranked signals" };
  for (const count of [0, 100, 200]) {
    if (sr && count === sr.count) continue;
    push({
      id: `sig:count-${count}`,
      group: "signals",
      label: count ? `Active signals ${count}` : "Active signals: every validated one",
      change: `active signals ${sr?.count || "all"} → ${count || "all (no cap)"}`,
      asRun: sr ? String(sr.count || "all") : "–",
      opts: sr ? { ...base, signalRank: { ...sr, count } } : undefined,
      ...rankNa,
    });
  }
  for (const rank of ["drawdown", "lowdd", "net"] as const) {
    if (sr && rank === sr.rank) continue;
    push({
      id: `sig:rank-${rank}`,
      group: "signals",
      label: `Signal ranking ${rank}`,
      change: `ranked by ${sr?.rank ?? "–"} → ${rank} (${rank === "drawdown" ? "net ÷ drawdown" : rank === "lowdd" ? "net ÷ drawdown²" : "net, then PF"})`,
      asRun: sr?.rank ?? "–",
      opts: sr ? { ...base, signalRank: { ...sr, rank } } : undefined,
      ...rankNa,
    });
  }

  // coordination
  push({
    id: "coord:all",
    group: "coordination",
    label: coord.enabled ? "Coordination off" : "Coordination on (defaults)",
    change: coord.enabled ? "every coordination rule off" : "coordination on: confirmation on, the rest off",
    asRun: onOff(coord.enabled),
    opts: coord.enabled
      ? withCoord({ enabled: false })
      : { ...base, coord: { enabled: true, hourLock: 0, cooldown: "off", conflict: false, confirm: true } },
  });
  const pre = coord.enabled ? "" : "coordination on · ";
  push({
    id: "coord:hourLock",
    group: "coordination",
    label: coord.hourLock > 0 ? "Hour lock off" : "Hour lock 1 %",
    change: `${pre}hour lock ${coord.hourLock > 0 ? `${coord.hourLock} % → off` : "off → 1 % (Σ trade %)"}`,
    asRun: coord.enabled && coord.hourLock > 0 ? `${coord.hourLock} %` : "off",
    opts: withCoord({ enabled: true, hourLock: coord.hourLock > 0 ? 0 : 1 }),
  });
  for (const cd of ["off", "signals", "all"] as const) {
    if (cd === coord.cooldown) continue;
    push({
      id: `coord:cooldown-${cd}`,
      group: "coordination",
      label: `Cooldown ${cd}`,
      change: `${pre}cooldown ${coord.cooldown} → ${cd}`,
      asRun: coord.enabled ? coord.cooldown : "off",
      opts: withCoord({ enabled: true, cooldown: cd }),
    });
  }
  push({
    id: "coord:conflict",
    group: "coordination",
    label: `Conflict block ${coord.conflict ? "off" : "on"}`,
    change: `${pre}no entry against an open opposite position ${coord.conflict ? "on → off" : "off → on"}`,
    asRun: onOff(coord.enabled && coord.conflict),
    opts: withCoord({ enabled: true, conflict: !coord.conflict }),
  });
  push({
    id: "coord:s2Windows",
    group: "coordination",
    label: `Stable-02 windows ${coord.s2Windows ? "off" : "on"}`,
    change: `${pre}symbol last-N window pause ${coord.s2Windows ? "on → off" : "off → on"}`,
    asRun: onOff(coord.enabled && coord.s2Windows),
    opts: withCoord({ enabled: true, s2Windows: !coord.s2Windows }),
  });
  push({
    id: "coord:hedge",
    group: "coordination",
    label: `Negative-hour hedge ${coord.hedge ? "off" : "on"}`,
    change: `${pre}hedge signals while the book loses ${coord.hedge ? "on → off" : "off → on"}`,
    asRun: onOff(coord.enabled && coord.hedge),
    opts: withCoord({ enabled: true, hedge: !coord.hedge }),
    ...(signalsOn && base.signalRank ? {} : { status: "na" as const, why: "no ranked signals to hedge with" }),
  });

  // Block
  const mode = base.block.mode ?? "shared";
  const blockNa = blockOn ? {} : { status: "na" as const, why: "Block and Block Active are off" };
  // Block off on one range at a time (its entries at their unit volume): 24 h, 6 Oct — Micro's Block-raised ×8
  // orders traded PF 0.36 while its unit orders did not lose
  const ex = base.block.excludeRanges ?? [];
  for (const [tag, name] of [["mc", "Micro"], ["mn", "Minimal"], ["sh", "Short"], ["gn", "General"], ["lg", "Long"]] as const) {
    if (ex.includes(tag)) continue;
    push({
      id: `block:off-${tag}`,
      group: "block",
      label: `Block off on ${name}`,
      change: `Block excludes ${name} (block.excludeRanges + ${tag})`,
      asRun: ex.length ? `excluded: ${ex.join(", ")}` : "every range",
      opts: { ...base, block: { ...base.block, excludeRanges: [...ex, tag] } },
      ...blockNa,
    });
  }
  for (const m of ["shared", "additive", "overall"] as const) {
    if (m === mode) continue;
    push({
      id: `block:mode-${m}`,
      group: "block",
      label: `Block mode ${m}`,
      change: `Block mode ${mode} → ${m}`,
      asRun: mode,
      opts: { ...base, block: { ...base.block, mode: m } },
      ...blockNa,
    });
  }
  const steps = base.block.steps ?? 0;
  push({
    id: "block:steps",
    group: "block",
    label: steps > 0 ? "Block steps continuous" : "Block steps 4",
    change: `Block volume steps ${steps > 0 ? `${steps} → continuous` : "continuous → 4"}`,
    asRun: steps > 0 ? String(steps) : "continuous",
    opts: { ...base, block: { ...base.block, steps: steps > 0 ? 0 : 4 } },
    ...blockNa,
  });

  // gates
  // entry last-N windows: dense from 5 to 50 so the curve between them is visible, not just two or three points
  for (const n of [0, 5, 10, 15, 20, 25, 30, 35, 50, 75]) {
    if (n === (base.lastN ?? 0)) continue;
    push({
      id: `gate:lastN-${n}`,
      group: "gates",
      label: n ? `Entry last ${n}` : "Entry last-N off",
      change: `entry last-N ${base.lastN || "off"} → ${n || "off"}`,
      asRun: String(base.lastN || "off"),
      opts: { ...base, lastN: n },
    });
  }
  for (const n of [0, 10, 15, 20, 25, 35, 50, 75, 100]) {
    if (n === (base.validLastN ?? 0)) continue;
    push({
      id: `gate:validLastN-${n}`,
      group: "gates",
      label: n ? `Validation last ${n}` : "Validation last-N off",
      change: `seat validation last-N ${base.validLastN || "off"} → ${n || "off"}`,
      asRun: String(base.validLastN || "off"),
      opts: { ...base, validLastN: n },
    });
  }
  // signals: their own last-N at validation and entry (0 / unset = the engine's validLastN / lastN do not apply)
  const sv = base.signalValidLastN;
  for (const n of [0, 5, 10, 15, 25]) {
    if (n === (sv ?? -1)) continue;
    push({
      id: `gate:signalLastN-${n}`,
      group: "gates",
      label: n ? `Signals last ${n}` : "Signals last-N off",
      change: `signal validation and entry last-N ${sv === undefined ? "as engine" : sv || "off"} → ${n || "off"}`,
      asRun: sv === undefined ? "as engine" : String(sv || "off"),
      opts: { ...base, signalValidLastN: n },
    });
  }
  const sg = base.symGate ?? "off";
  for (const g of ["veto", "proven", "off"] as const) {
    if (g === sg) continue;
    push({
      id: `gate:symGate-${g}`,
      group: "gates",
      label: `Symbol gate ${g}`,
      change: `symbol gate ${sg} → ${g}`,
      asRun: sg,
      opts: { ...base, symGate: g },
    });
  }
  // every other last-N check and the sample warm-up (operator, 5 Oct: "test all last-N checks and evals and adjust")
  const warm = base.gates.warmup !== false;
  push({
    id: "gate:warmup",
    group: "gates",
    label: warm ? "Sample warm-up off (strict)" : "Sample warm-up on",
    change: `a check it cannot compute yet (short last-N drawdown, an unseen symbol, one stability block) ${warm ? "valid → fails" : "fails → valid"}`,
    asRun: onOff(warm),
    opts: { ...base, gates: { ...base.gates, warmup: !warm } },
  });
  const floor = base.gates.lastNFloor ?? 0;
  for (const f of [0, 3, 5, 8, 10, 15, 25]) {
    if (f === floor) continue;
    push({
      id: `gate:lastNFloor-${f}`,
      group: "gates",
      label: f ? `Last-N floor ${f}` : "Last-N floor off",
      change: `smallest last-N sample judged ${floor || "off"} → ${f || "off"}`,
      asRun: String(floor || "off"),
      opts: { ...base, gates: { ...base.gates, lastNFloor: f } },
    });
  }
  const rg = base.rangeGate;
  if (rg) {
    push({
      id: "gate:rangeGate-off",
      group: "gates",
      label: "Range gate off",
      change: `the per-range last-${rg.lastN} PF ${rg.minPf.toFixed(2)} gate off`,
      asRun: `last ${rg.lastN} at PF ${rg.minPf.toFixed(2)}`,
      opts: { ...base, rangeGate: undefined },
    });
    for (const n of [15, 25, 35, 50, 75, 100]) {
      if (n === rg.lastN) continue;
      push({
        id: `gate:rangeGate-n${n}`,
        group: "gates",
        label: `Range gate last ${n}`,
        change: `range gate closes ${rg.lastN} → ${n}`,
        asRun: String(rg.lastN),
        opts: { ...base, rangeGate: { ...rg, lastN: n } },
      });
    }
    for (const pf of [1.05, 1.2, 1.35]) {
      if (Math.abs(pf - rg.minPf) < 1e-9) continue;
      push({
        id: `gate:rangeGate-pf${pf}`,
        group: "gates",
        label: `Range gate PF ${pf.toFixed(2)}`,
        change: `range gate PF ${rg.minPf.toFixed(2)} → ${pf.toFixed(2)}`,
        asRun: rg.minPf.toFixed(2),
        opts: { ...base, rangeGate: { ...rg, minPf: pf } },
      });
    }
    // the range gate on its full sample: gates.lastNFloor shrank the last-75 gate to as few as 5 closes, so a range
    // cell passed on a handful of fast wins (micro20: passed Micro configs traded PF 0.11–0.13 vs the grid's 0.3)
    const fl = base.gates.lastNFloor ?? 0;
    if (fl > 0 && rg.floor === undefined)
      push({
        id: "gate:rangeGate-strict",
        group: "gates",
        label: "Range gate on its full last N",
        change: `range gate judged on its last ${rg.lastN} closes only (the last-N floor ${fl} no longer shrinks it)`,
        asRun: `floor ${fl}`,
        opts: { ...base, rangeGate: { ...rg, floor: 0 } },
      });
    // General and Long are judged by the stage gates and validation only: the range gate on them as well
    if (!rg.ranges)
      push({
        id: "gate:rangeGate-allRanges",
        group: "gates",
        label: "Range gate on General and Long too",
        change: "the range gate also judges General and Long cells (as run: Micro, Minimal, Short, Minimal plus)",
        asRun: "mc · mn · sh · mp",
        opts: { ...base, rangeGate: { ...rg, ranges: ["mc", "mn", "sh", "mp", "gn", "lg"] } },
      });
  }
  // the loss prior: every evaluation PF counts one virtual stop-out at the config's own stop (a loss-free sample
  // scored PF 4 and passed every gate; a wide stop pays for the tail it has not shown yet)
  if (!base.gates.lossPrior) {
    push({
      id: "gate:lossPrior",
      group: "gates",
      label: "Loss prior on",
      change: "every evaluation PF (window gates, validation, entry last-N, range gate) counts one virtual stop-out at the config's stop",
      asRun: "off",
      opts: { ...base, gates: { ...base.gates, lossPrior: true } },
    });
    if (rg && (base.gates.lastNFloor ?? 0) > 0)
      push({
        id: "gate:lossPrior-strictRange",
        group: "gates",
        label: "Loss prior on, range gate on its full last N",
        change: "the loss prior together with the range gate judged on its full last-N sample",
        asRun: "off · range gate with floor",
        opts: { ...base, gates: { ...base.gates, lossPrior: true }, rangeGate: { ...rg, floor: 0 } },
      });
  }
  const smn = base.symMinN ?? 2;
  for (const n of [1, 2, 5, 10]) {
    if (n === smn || !base.symGate || base.symGate === "off") continue;
    push({
      id: `gate:symMinN-${n}`,
      group: "gates",
      label: `Symbol gate closes ${n}`,
      change: `closes a symbol is judged on ${smn} → ${n}`,
      asRun: String(smn),
      opts: { ...base, symMinN: n },
    });
  }
  const mg = base.gates.minGreen ?? 0.5;
  for (const g of [0, 0.4, 0.5, 0.6]) {
    if (Math.abs(g - mg) < 1e-9) continue;
    push({
      id: `gate:minGreen-${g}`,
      group: "gates",
      label: g ? `Green hours ≥ ${(g * 100).toFixed(0)} %` : "Green-hour gate off",
      change: `minimum green-hour share ${mg || "off"} → ${g || "off"}`,
      asRun: String(mg || "off"),
      opts: { ...base, gates: { ...base.gates, minGreen: g } },
    });
  }
  const sgn = base.sideGateN ?? 0;
  push({
    id: "gate:sideGateN",
    group: "gates",
    label: sgn > 0 ? "Direction gate off" : "Direction gate 10",
    change: `direction gate (last N candidates of the side) ${sgn || "off"} → ${sgn > 0 ? "off" : 10}`,
    asRun: String(sgn || "off"),
    opts: { ...base, sideGateN: sgn > 0 ? 0 : 10 },
  });
  const mp = base.maxPositions ?? 0;
  push({
    id: "gate:maxPositions",
    group: "gates",
    label: mp > 0 ? "Position cap off" : "Position cap 12",
    change: `max open positions (symbol × side) ${mp || "none"} → ${mp > 0 ? "none" : 12}`,
    asRun: String(mp || "none"),
    opts: { ...base, maxPositions: mp > 0 ? 0 : 12 },
  });

  // tactics: they filter entries when the tapes are built — a variant needs a recompute
  const tc = ctx.tactics ?? {};
  for (const [k, l] of [
    ["session", "Session tactic"],
    ["volRegime", "Volatility regime"],
    ["trendStrength", "Trend strength"],
    ["chopRegime", "Choppiness regime"],
    ["cooldown", "Tactic cooldown"],
  ] as const)
    push({
      id: `tactic:${k}`,
      group: "tactics",
      label: `${l} ${tc[k] ? "off" : "on"}`,
      change: `${l.toLowerCase()} ${tc[k] ? "on → off" : "off → on"}`,
      asRun: onOff(tc[k]),
      status: "recompute",
      why: "shapes the tapes at build time (needs a recompute)",
    });
  return out;
}

/** The General and Long ranges (tags gn, lg): their own levers, each applied to both together (the range sweep). */
export const RANGE_LEVER_TAGS = ["gn", "lg"] as const;

/**
 * One lever at a time around the baseline, for the General and Long ranges together (the range sweep, Stage A). Each
 * variant is a walk-forward re-run on the baseline's own tapes: the levers are gates (seat validation window, execution
 * window, symbol gate, engine direction acceptance, the range minimum PF, the crowding cap), so no tape is rebuilt. A
 * lever already at the baseline's value is not listed. Per range results come from `byRange` of each row.
 */
export function rangeLeverVariants(base: WalkForwardOptions): VariantSpec[] {
  const out: VariantSpec[] = [];
  const coordWith = (patch: Partial<RangeCoord>) => {
    const rc: Partial<Record<string, RangeCoord>> = { ...(base.rangeCoord ?? {}) };
    for (const t of RANGE_LEVER_TAGS) rc[t] = { ...(rc[t] ?? {}), ...patch };
    return rc;
  };
  const add = (id: string, label: string, change: string, asRun: string, opts: WalkForwardOptions) =>
    out.push({ id, group: "gates", label, change, asRun, status: "run", opts });
  const vl = base.rangeCoord?.gn?.validLastN ?? base.validLastN ?? 0;
  for (const n of [5, 10, 20].filter((x) => x !== vl))
    add(`range:validLastN-${n}`, `Seat validation last ${n} (gn, lg)`, `seat validation window ${vl} → ${n}`, String(vl), {
      ...base,
      rangeCoord: coordWith({ validLastN: n }),
    });
  const ln = base.rangeCoord?.gn?.lastN ?? base.lastN;
  for (const n of [10, 25].filter((x) => x !== ln))
    add(`range:lastN-${n}`, `Execution last ${n} (gn, lg)`, `execution window ${ln} → ${n}`, String(ln), {
      ...base,
      rangeCoord: coordWith({ lastN: n }),
    });
  const sg = base.rangeCoord?.gn?.symGate ?? base.symGate ?? "off";
  if (sg !== "off")
    add("range:symGate-off", "Symbol gate off (gn, lg)", `symbol gate ${sg} → off`, String(sg), {
      ...base,
      rangeCoord: coordWith({ symGate: "off" }),
    });
  const es = base.rangeCoord?.gn?.engineSide ?? base.engineSideAccept?.enabled ?? false;
  if (es)
    add("range:engineSide-off", "Engine direction acceptance off (gn, lg)", "engine direction acceptance on → off", "on", {
      ...base,
      rangeCoord: coordWith({ engineSide: false }),
    });
  const mp = base.gates.rangeMinPf?.general ?? base.gates.minPf;
  for (const m of [1.12, 1.18].filter((x) => x !== mp))
    add(`range:minPf-${m}`, `Range minimum PF ${m} (gn, lg)`, `range minimum PF ${mp} → ${m}`, String(mp), {
      ...base,
      gates: { ...base.gates, rangeMinPf: { ...base.gates.rangeMinPf, general: m, long: m } },
    });
  const cap = base.entryCrowd?.gn ?? 0;
  for (const k of [1, 3].filter((x) => x !== cap))
    add(`range:crowd-${k}`, `Crowding cap ${k} (gn, lg)`, `configs per symbol × side × bar ${cap || "unlimited"} → ${k}`, cap ? String(cap) : "unlimited", {
      ...base,
      entryCrowd: { ...base.entryCrowd, gn: k, lg: k },
    });
  // the bots and the indication families the two ranges may build (their own allow-lists, RangeCoord.bots and
  // indFamilies): candidates outside them are not configs of the range at all
  const bots: Array<[string, string, Array<"follow" | "revert">]> = [
    ["bots-follow", "Follow bot only", ["follow"]],
    ["bots-revert", "Revert bot only", ["revert"]],
    ["bots-follow-revert", "Follow and revert bots", ["follow", "revert"]],
  ];
  for (const [id, label, list] of bots)
    add(`range:${id}`, `${label} (gn, lg)`, `bots of gn and lg: every bot → ${list.join(" + ")}`, "every bot", {
      ...base,
      rangeCoord: coordWith({ bots: list }),
    });
  for (const f of ["trend", "reversion", "breakout"] as const)
    add(`range:family-${f}`, `${f[0].toUpperCase()}${f.slice(1)} indications only (gn, lg)`, `indication families of gn and lg: every family → ${f}`, "every family", {
      ...base,
      rangeCoord: coordWith({ indFamilies: [f] }),
    });
  return out;
}

/**
 * One combination of the General and Long levers, as data (the range sweep's later stages): `coord` is merged into both
 * ranges' coordination, `minPf` sets both ranges' minimum PF, `crowd` both crowding caps (0 = no cap).
 */
export interface RangeComboSpec {
  id: string;
  label?: string;
  coord?: Partial<RangeCoord>;
  minPf?: number;
  crowd?: number;
}
/** Walk-forward variants of the given combinations (on the baseline's tapes, like rangeLeverVariants). */
export function rangeComboVariants(base: WalkForwardOptions, combos: readonly RangeComboSpec[]): VariantSpec[] {
  return combos.map((c) => {
    const rangeCoord: Partial<Record<string, RangeCoord>> = { ...(base.rangeCoord ?? {}) };
    for (const t of RANGE_LEVER_TAGS) rangeCoord[t] = { ...(rangeCoord[t] ?? {}), ...(c.coord ?? {}) };
    const opts: WalkForwardOptions = { ...base, rangeCoord };
    if (c.minPf !== undefined)
      opts.gates = { ...base.gates, rangeMinPf: { ...base.gates.rangeMinPf, general: c.minPf, long: c.minPf } };
    if (c.crowd !== undefined) opts.entryCrowd = { ...base.entryCrowd, gn: c.crowd, lg: c.crowd };
    return {
      id: `combo:${c.id}`,
      group: "gates",
      label: c.label ?? c.id,
      change: c.label ?? c.id,
      asRun: "baseline",
      status: "run",
      opts,
    };
  });
}

export interface SideAgg {
  n: number;
  net: number;
  gp: number;
  gl: number;
}
/** A range's closed orders (SideAgg) and its orders still open at the end: their marks as if closed */
export interface RangeAgg extends SideAgg {
  openN: number;
  openGp: number;
  openGl: number;
}
/** profit factor of a range including its open orders (their marks as if closed); the unit basis of the sweep */
export const rangePfIncl = (a: RangeAgg): number => profitFactor(a.gp + a.openGp, a.gl + a.openGl);
export interface VariantSummary {
  /** closed orders in the run */
  orders: number;
  wins: number;
  /** Σ r × 100 of the closed orders (trade %), gross profit / loss in the same unit */
  net: number;
  gp: number;
  gl: number;
  pf: number;
  /** max drawdown of the closed Σ trade % curve (by exit), trade % */
  mdd: number;
  /** orders still open at the end: count and their mark (Σ r × 100) */
  openEnd: number;
  openNet: number;
  longs: SideAgg;
  shorts: SideAgg;
  /** per type (Normal / Trailing / Axis / DCA / DCA Active / Signals) */
  byType: Record<string, SideAgg>;
  /** per range: a tag (mc, mn, mp, sh, gn, lg), "sig" for signals, "wide" for Wide, Axis and DCA (crowdRangeOf) */
  byRange: Record<string, RangeAgg>;
  /** per hour of the run (by exit, (h, h + 1 h]): closed orders and Σ trade % */
  hourN: number[];
  hourNet: number[];
  /** the walk-forward's skip reasons, largest first (top 8) */
  skips: Array<[string, number]>;
  /** fingerprints: every order with its result and volume; the orders alone (cfg, symbol, side, entry, exit) */
  fp: string;
  fpOrders: string;
}

const agg0 = (): SideAgg => ({ n: 0, net: 0, gp: 0, gl: 0 });
const addAgg = (a: SideAgg, r: number) => {
  a.n++;
  a.net += r;
  if (r > 0) a.gp += r;
  else a.gl -= r;
};

/** Per-hour aggregates and fingerprints of one walk-forward result (its trades can be dropped afterwards). */
export function summarizeRun(
  res: { trades: readonly Trade[]; openAtEnd?: readonly Trade[]; skips?: Readonly<Record<string, number>> },
  startT: number,
  endT: number,
): VariantSummary {
  const nH = Math.max(0, Math.ceil((endT - startT) / H));
  const hourN = new Array<number>(nH).fill(0);
  const hourNet = new Array<number>(nH).fill(0);
  const tot = agg0();
  const longs = agg0();
  const shorts = agg0();
  const byType: Record<string, SideAgg> = {};
  const byRange: Record<string, RangeAgg> = {};
  const rangeOf = (cfg: string): RangeAgg => (byRange[crowdRangeOf(cfg)] ??= { ...agg0(), openN: 0, openGp: 0, openGl: 0 });
  const xs = [...res.trades].sort((a, b) => a.exitT - b.exitT);
  let cum = 0;
  let pk = 0;
  let mdd = 0;
  const keys: string[] = [];
  const okeys: string[] = [];
  for (const x of xs) {
    const r = x.r * 100;
    addAgg(tot, r);
    addAgg(x.side > 0 ? longs : shorts, r);
    addAgg((byType[typeOf(x)] ??= agg0()), r);
    addAgg(rangeOf(x.cfg), r);
    const i = Math.floor((x.exitT - 1 - startT) / H);
    if (i >= 0 && i < nH) {
      hourN[i]++;
      hourNet[i] += r;
    }
    cum += r;
    pk = Math.max(pk, cum);
    mdd = Math.max(mdd, pk - cum);
    const ok = `${x.cfg}|${x.sym}|${x.side}|${x.entryT}|${x.exitT}`;
    okeys.push(ok);
    keys.push(`${ok}|${x.r.toFixed(9)}|${(x.vol ?? 1).toFixed(6)}`);
  }
  let openNet = 0;
  for (const x of res.openAtEnd ?? []) {
    openNet += x.r * 100;
    const a = rangeOf(x.cfg);
    a.openN++;
    if (x.r > 0) a.openGp += x.r * 100;
    else a.openGl -= x.r * 100;
    const ok = `${x.cfg}|${x.sym}|${x.side}|${x.entryT}|open`;
    okeys.push(ok);
    keys.push(`${ok}|${x.r.toFixed(9)}|${(x.vol ?? 1).toFixed(6)}`);
  }
  keys.sort();
  okeys.sort();
  return {
    orders: tot.n,
    wins: xs.filter((x) => x.r > 0).length,
    net: tot.net,
    gp: tot.gp,
    gl: tot.gl,
    pf: profitFactor(tot.gp, tot.gl),
    mdd,
    openEnd: res.openAtEnd?.length ?? 0,
    openNet,
    longs,
    shorts,
    byType,
    byRange,
    hourN,
    hourNet,
    skips: Object.entries(res.skips ?? {})
      .filter(([k]) => k)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8),
    fp: stateHash(keys),
    fpOrders: stateHash(okeys),
  };
}

/**
 * The variant's effect against the baseline: "none" = the identical trade set (every order, result and volume);
 * "volume" = the same orders at other volumes / results; "orders" = a different order set.
 */
export function effectOf(v: Pick<VariantSummary, "fp" | "fpOrders">, base: Pick<VariantSummary, "fp" | "fpOrders">) {
  return v.fp === base.fp ? "none" : v.fpOrders === base.fpOrders ? "volume" : "orders";
}

// ── 2. live sizing replay ────────────────────────────────────────────────────────────────────────────────────

/** one lane position of the baseline run (a closed order, or one still open at the end: exitT = Infinity) */
export interface ReplayPosition {
  cfg: string;
  sym: string;
  side: 1 | -1;
  entryT: number;
  exitT: number;
  /** volume in lane units (Block multiple × DCA / Axis legs) */
  vol: number;
  /** stop distance of the config's protect (fraction of the entry) */
  sl: number;
}

export interface SizingSpec {
  id: string;
  label: string;
  /** USD of one lane volume unit (the exchange minimum in minimum-quantity sizing, or a fixed notional) */
  unitUsd: number;
  /** the exchange minimum notional per position (a smaller target is raised to it) */
  minUsd: number;
  /** volume factor (control volume per lane volume unit) */
  ratio: number;
  /** per-position cap as a multiple of equity (0 = off) and the fixed USD cap (Infinity = none) */
  maxPositionX: number;
  maxNotionalUsd: number;
  /** exposure scaler: gross ≤ maxExposureX × equity (0 = scaler off) */
  maxExposureX: number;
  /** stop-risk budget: Σ notional × planned loss ≤ maxRiskPct × equity (0 = off) */
  maxRiskPct: number;
  /** worst-case budget: Σ notional × backstop distance ≤ maxBackstopLossPct × equity (0 = off) */
  maxBackstopLossPct: number;
  /** top configs: "fill" the budget, "all" (every lane), or a number of configs */
  top: "fill" | "all" | number;
  /** an existing position is only resized when its target moved by more than this share */
  rebalancePct: number;
  /** max control positions (symbol × side), 0 = no limit */
  maxPositions: number;
  minStopPct: number;
}

export interface SizingHour {
  t: number;
  eq: number;
  /** averages over the hour's samples (positions, gross, capped, raised, at minimum, kept configs) */
  positions: number;
  gross: number;
  capped: number;
  raised: number;
  atMin: number;
  kept: number;
  /** maxima over the hour's samples */
  grossMax: number;
  worstMax: number;
  /** worst-case loss ÷ its cap (maxBackstopLossPct × equity), max over the hour (null: no budget) */
  worstRatioMax: number | null;
  /** exchange orders sent in the hour: opens, increases, reduces, closes */
  opens: number;
  increases: number;
  reduces: number;
  closes: number;
}

export interface SizingResult {
  id: string;
  label: string;
  spec: SizingSpec;
  samples: number;
  hours: SizingHour[];
  summary: {
    positionsAvg: number;
    positionsMax: number;
    grossAvg: number;
    grossMax: number;
    /** gross ÷ equity, max */
    grossXMax: number;
    orders: number;
    ordersPerHour: number;
    opens: number;
    increases: number;
    reduces: number;
    closes: number;
    /** share of position-samples at the per-position cap / raised to the exchange minimum / sitting at it */
    cappedAvg: number;
    cappedShare: number;
    raisedAvg: number;
    raisedShare: number;
    atMinAvg: number;
    worstMax: number;
    /** worst-case loss ÷ equity, max */
    worstPctMax: number;
    /** samples whose worst case stayed above its budget (the minimums could not shrink) */
    worstOverSamples: number;
    sizeMin: number | null;
    sizeMedian: number | null;
    sizeMax: number | null;
    /** lanes offered and configs kept by the top-config fill (averages) */
    keptAvg: number;
    ofAvg: number;
    /** targets the controller refused (exchange minimum above the position cap, position cap reached) */
    refusedMinAboveCap: number;
    refusedMaxPositions: number;
    droppedByRisk: number;
  };
  /** fingerprint of every sample's targets and orders (equal = the same sizing and orders as the reference) */
  fp: string;
}

/**
 * Replay the live control's sizing over the baseline's open positions: at every sample time t (with the balance as
 * equity) the positions open at t (entry ≤ t < exit) become lanes, sized exactly as live sizes them — top configs, the
 * per-position cap, the exchange minimum, the exposure scaler, the stop-risk and worst-case budgets — and the targets
 * are compared with the previous sample's held book to count the exchange orders (rebalance threshold applied).
 * Sizing only: every price is 1 (notional = quantity), no fills, slippage or stop exits of the control positions.
 */
export function sizingReplay(
  positions: readonly ReplayPosition[],
  samples: ReadonlyArray<{ t: number; eq: number }>,
  spec: SizingSpec,
  scoreOf: (cfg: string) => number | undefined,
  startT: number,
): SizingResult {
  const byEntry = [...positions].sort((a, b) => a.entryT - b.entryT);
  const prices = new Map<string, number>();
  for (const p of positions) prices.set(p.sym, 1);
  const raise = (q: number) => (q > 0 ? Math.max(q, spec.minUsd) : 0);
  const snapNum = (_s: string, q: number) => raise(q);
  const snapCt = (_s: string, q: number) => ({ qty: raise(q), raised: q > 0 && q < spec.minUsd * (1 - 1e-9) });
  let open: ReplayPosition[] = [];
  let ei = 0;
  let held = new Map<string, number>();
  let prevKept = new Set<string>();
  const hours = new Map<number, SizingHour & { n: number }>();
  const sizes: number[] = [];
  const fps: string[] = [];
  const S = {
    posSum: 0,
    posMax: 0,
    grossSum: 0,
    grossMax: 0,
    grossXMax: 0,
    cappedN: 0,
    raisedN: 0,
    atMinN: 0,
    worstMax: 0,
    worstPctMax: 0,
    worstOver: 0,
    keptSum: 0,
    ofSum: 0,
    minAboveCap: 0,
    maxPos: 0,
    dropped: 0,
    opens: 0,
    increases: 0,
    reduces: 0,
    closes: 0,
    n: 0,
  };
  for (const { t, eq } of samples) {
    while (ei < byEntry.length && byEntry[ei].entryT <= t) open.push(byEntry[ei++]);
    open = open.filter((p) => p.exitT > t);
    const lanes: ControlContribution[] = open.map((p) => ({
      id: `${p.cfg}|${p.sym}|${p.side > 0 ? 1 : -1}|${p.entryT}`,
      cfg: p.cfg,
      sym: p.sym,
      side: p.side,
      vol: p.vol,
      sl: p.sl,
      risk: p.sl,
    }));
    const posCap = positionCapFor(spec.maxNotionalUsd, eq, spec.maxPositionX);
    let liveLanes = lanes;
    let kept = 0;
    let of = 0;
    // unknown / no equity: nothing is sized (live keeps the held book; the replay holds nothing)
    if (!(eq > 0)) liveLanes = [];
    else if (spec.top !== "all") {
      let lw = 0;
      let lr = 0;
      let ls = 0;
      for (const l of lanes) {
        const w = Math.max(0, l.vol);
        lw += w;
        lr += w * Math.max(0, l.risk ?? l.sl);
        ls += w * Math.min(0.2, Math.max(spec.minStopPct, l.sl * 1.2));
      }
      const meanRisk = Math.max(spec.minStopPct, lw > 0 ? lr / lw : 0.01);
      const meanStop = Math.max(spec.minStopPct, lw > 0 ? ls / lw : 0.012);
      const budget = Math.min(
        spec.maxExposureX > 0 ? spec.maxExposureX * eq : Infinity,
        spec.maxRiskPct > 0 ? (spec.maxRiskPct * eq) / meanRisk : Infinity,
        spec.maxBackstopLossPct > 0 ? (spec.maxBackstopLossPct * eq) / meanStop : Infinity,
      );
      const r = topConfigLanes(lanes, scoreOf, {
        top: spec.top,
        budget,
        prefer: prevKept,
        posCost: (_sym, v) => Math.max(spec.minUsd, Math.min(posCap, v * spec.ratio * spec.unitUsd)),
      });
      liveLanes = r.lanes;
      kept = r.kept;
      of = r.of;
      prevKept = new Set(r.cfgs);
    } else {
      const cfgs = new Set(lanes.map((l) => l.cfg));
      kept = of = cfgs.size;
    }
    const { targets, skipped } = controlTargets(
      liveLanes,
      prices,
      {
        notionalUsd: spec.unitUsd,
        ratio: spec.ratio,
        maxNotionalUsd: posCap,
        maxPositions: spec.maxPositions,
        rebalancePct: spec.rebalancePct,
        positionMode: "hedge",
        minStopPct: spec.minStopPct,
        heldKeys: new Set(held.keys()),
      },
      snapCt,
    );
    for (const x of skipped) {
      if (isMinAboveCapSkip(x.why)) S.minAboveCap++;
      else if (x.why.startsWith("max ")) S.maxPos++;
    }
    const heldKeys = new Set(held.keys());
    scaleToExposure(targets, eq, spec.maxExposureX, snapNum);
    const risk = scaleToRisk(targets, eq, spec.maxRiskPct, snapNum, heldKeys);
    const worstR = scaleToRisk(targets, eq, spec.maxBackstopLossPct, snapNum, heldKeys, (x) => x.stopDist);
    S.dropped += (risk?.dropped.length ?? 0) + (worstR?.dropped.length ?? 0);
    // the exchange orders this step: the planner's minimal actions against the held book
    const plan = planControl({ targets, held, foreign: new Set(), rebalancePct: spec.rebalancePct });
    const next = new Map(held);
    const tq = new Map(targets.map((x) => [x.key, x.qty]));
    let o = 0;
    let inc = 0;
    let red = 0;
    let cl = 0;
    for (const a of plan.actions) {
      if (a.kind === "close") {
        next.delete(a.key);
        cl++;
      } else {
        next.set(a.key, tq.get(a.key) ?? 0);
        if (a.kind === "open") o++;
        else if (a.kind === "increase") inc++;
        else red++;
      }
    }
    held = next;
    // the sample's figures
    let gross = 0;
    let worst = 0;
    let capped = 0;
    let raisedN = 0;
    let atMin = 0;
    for (const x of targets) {
      gross += x.notional;
      worst += x.notional * x.stopDist;
      if (x.capped) capped++;
      if (x.raised) raisedN++;
      if (x.notional <= spec.minUsd * 1.0001) atMin++;
      sizes.push(x.notional);
    }
    // the sample's targets and the exchange orders sent (a rebalance threshold changes the orders, not the targets)
    fps.push(
      stateHash([
        ...targets.map((x) => `${x.key}:${x.qty.toFixed(6)}`),
        ...plan.actions.map((a) => `${a.kind}:${a.key}:${a.qty.toFixed(6)}`),
      ]),
    );
    const worstCap = spec.maxBackstopLossPct > 0 && eq > 0 ? spec.maxBackstopLossPct * eq : null;
    S.n++;
    S.posSum += targets.length;
    S.posMax = Math.max(S.posMax, targets.length);
    S.grossSum += gross;
    S.grossMax = Math.max(S.grossMax, gross);
    if (eq > 0) S.grossXMax = Math.max(S.grossXMax, gross / eq);
    S.cappedN += capped;
    S.raisedN += raisedN;
    S.atMinN += atMin;
    S.worstMax = Math.max(S.worstMax, worst);
    if (eq > 0) S.worstPctMax = Math.max(S.worstPctMax, worst / eq);
    if (worstCap !== null && worst > worstCap * 1.0001) S.worstOver++;
    S.keptSum += kept;
    S.ofSum += of;
    S.opens += o;
    S.increases += inc;
    S.reduces += red;
    S.closes += cl;
    const hk = startT + Math.floor((t - startT) / H) * H;
    let h = hours.get(hk);
    if (!h) {
      h = {
        t: hk,
        eq,
        positions: 0,
        gross: 0,
        capped: 0,
        raised: 0,
        atMin: 0,
        kept: 0,
        grossMax: 0,
        worstMax: 0,
        worstRatioMax: worstCap === null ? null : 0,
        opens: 0,
        increases: 0,
        reduces: 0,
        closes: 0,
        n: 0,
      };
      hours.set(hk, h);
    }
    h.n++;
    h.positions += targets.length;
    h.gross += gross;
    h.capped += capped;
    h.raised += raisedN;
    h.atMin += atMin;
    h.kept += kept;
    h.grossMax = Math.max(h.grossMax, gross);
    h.worstMax = Math.max(h.worstMax, worst);
    if (worstCap !== null) h.worstRatioMax = Math.max(h.worstRatioMax ?? 0, worst / worstCap);
    h.opens += o;
    h.increases += inc;
    h.reduces += red;
    h.closes += cl;
  }
  const hs: SizingHour[] = [...hours.values()]
    .sort((a, b) => a.t - b.t)
    .map(({ n, ...h }) => ({
      ...h,
      positions: h.positions / n,
      gross: h.gross / n,
      capped: h.capped / n,
      raised: h.raised / n,
      atMin: h.atMin / n,
      kept: h.kept / n,
    }));
  sizes.sort((a, b) => a - b);
  const n = Math.max(1, S.n);
  const orders = S.opens + S.increases + S.reduces + S.closes;
  return {
    id: spec.id,
    label: spec.label,
    spec,
    samples: S.n,
    hours: hs,
    summary: {
      positionsAvg: S.posSum / n,
      positionsMax: S.posMax,
      grossAvg: S.grossSum / n,
      grossMax: S.grossMax,
      grossXMax: S.grossXMax,
      orders,
      ordersPerHour: orders / Math.max(1, hs.length),
      opens: S.opens,
      increases: S.increases,
      reduces: S.reduces,
      closes: S.closes,
      cappedAvg: S.cappedN / n,
      cappedShare: S.posSum ? S.cappedN / S.posSum : 0,
      raisedAvg: S.raisedN / n,
      raisedShare: S.posSum ? S.raisedN / S.posSum : 0,
      atMinAvg: S.atMinN / n,
      worstMax: S.worstMax,
      worstPctMax: S.worstPctMax,
      worstOverSamples: S.worstOver,
      sizeMin: sizes.length ? sizes[0] : null,
      sizeMedian: sizes.length ? sizes[sizes.length >> 1] : null,
      sizeMax: sizes.length ? sizes[sizes.length - 1] : null,
      keptAvg: S.keptSum / n,
      ofAvg: S.ofSum / n,
      refusedMinAboveCap: S.minAboveCap,
      refusedMaxPositions: S.maxPos,
      droppedByRisk: S.dropped,
    },
    fp: stateHash(fps),
  };
}

/**
 * The sizing variants around a reference (the desk's live settings): rebalance threshold 0 / 0.25, exposure scaler
 * on (7×) / off, position cap 0.25× / 1× equity, stop-risk budget 0.35 / off, worst-case budget 0.5 / off, volume
 * factor 1 / 2 / 5, top fill / all. A variant equal to the reference is left out (the reference row is it).
 */
export function sizingVariants(ref: SizingSpec): SizingSpec[] {
  const out: SizingSpec[] = [{ ...ref, id: "ref", label: "reference (desk)" }];
  const seen = new Set<string>([JSON.stringify({ ...ref, id: "", label: "" })]);
  const add = (id: string, label: string, p: Partial<SizingSpec>) => {
    const s = { ...ref, ...p };
    const k = JSON.stringify({ ...s, id: "", label: "" });
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ ...s, id, label });
  };
  add("rebal0", "rebalance 0", { rebalancePct: 0 });
  add("rebal25", "rebalance 0.25", { rebalancePct: 0.25 });
  add("expOff", "exposure scaler off", { maxExposureX: 0 });
  add("exp7", "exposure scaler 7×", { maxExposureX: 7 });
  add("cap025", "position cap 0.25×", { maxPositionX: 0.25 });
  add("cap1", "position cap 1×", { maxPositionX: 1 });
  add("riskOff", "stop-risk budget off", { maxRiskPct: 0 });
  add("risk35", "stop-risk budget 0.35", { maxRiskPct: 0.35 });
  add("worstOff", "worst-case budget off", { maxBackstopLossPct: 0 });
  add("worst50", "worst-case budget 0.5", { maxBackstopLossPct: 0.5 });
  add("vf1", "volume factor 1", { ratio: 1 });
  add("vf2", "volume factor 2", { ratio: 2 });
  add("vf5", "volume factor 5", { ratio: 5 });
  add("topAll", "top: all configs", { top: "all" });
  add("topFill", "top: fill", { top: "fill" });
  return out;
}
