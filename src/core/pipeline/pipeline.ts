// Progressive pipeline over a universe of symbols:
//   S1 coarse    every bot × indication with the default protect
//   S2 refine    TP/SL/trail grid on the S1 leaders
//   S3 last-N    walk-forward gate optimisation (N chosen in-sample, reported out-of-sample)
//   S4 evals     continuous independent window evals
//   S5 arm       configs that pass both S3 and S4 are armed for paper (and optionally live)
// Selection in S1/S2 uses in-sample trades only, so S3's out-of-sample numbers stay honest.
// Implemented as a generator so the runtime can time-slice it.
import { BOTS, entrySignal } from "../bots/bots.ts";
import { tacticCooldown } from "../indications/filters.ts";
import { DEFAULT_PROTECT, PROTECT_GRID, type CoreSettings } from "../config.ts";
import type {
  Bars,
  BotType,
  EvalResult,
  LastNResult,
  OpenPosition,
  Protect,
  Side,
  Stats,
  StratKind,
  Tactics,
  Trade,
} from "../domain/types.ts";
import { evaluateConfig } from "../evals/evaluator.ts";
import { SeriesCache } from "../indications/cache.ts";
import { INDICATIONS, TF_LADDER, higherFactors, laneInd, laneOf } from "../indications/registry.ts";
import { optimizeLastN } from "../lastn/optimizer.ts";
import { scoreStats, statsOf } from "../metrics/stats.ts";
import { simulate } from "../sim/backtest.ts";
import { buildPortfolio, type Portfolio } from "./portfolio.ts";

export interface Universe {
  bars: Bars[];
  caches: SeriesCache[];
  startT: number;
  endT: number;
  splitT: number;
  /** close time of the last bar */
  nowT: number;
  /** finest timeframe of the series (the base data timeframe) */
  baseTf: number;
}

export function makeUniverse(bars: Bars[]): Universe {
  const ok = bars.filter((b) => b.n >= 120);
  let startT = Infinity;
  let endT = 0;
  let nowT = 0;
  let baseTf = Infinity;
  for (const b of ok) {
    startT = Math.min(startT, b.t[0]);
    endT = Math.max(endT, b.t[b.n - 1]);
    nowT = Math.max(nowT, b.t[b.n - 1] + b.tfMin * 60_000);
    baseTf = Math.min(baseTf, b.tfMin);
  }
  if (!ok.length) startT = endT = nowT = 0;
  return {
    bars: ok,
    caches: ok.map((b) => new SeriesCache(b)),
    startT,
    endT,
    splitT: startT + (endT - startT) / 2,
    nowT,
    baseTf: Number.isFinite(baseTf) ? baseTf : 5,
  };
}

/**
 * Series of the universe a combo runs on: a lane indication ("…@m15") only on its timeframe's series, a plain
 * indication on every series.
 */
export function seriesOf(u: Universe, ind: string): number[] {
  const tf = laneOf(ind).tf;
  const out: number[] = [];
  for (let s = 0; s < u.bars.length; s++) if (tf === null || u.bars[s].tfMin === tf) out.push(s);
  return out;
}

/** Protect values are tuned on this timeframe; lanes scale them (volatility √t, hold in equal time). */
export const REF_TF = 15;

/** The protect a lane actually trades: TP / SL / trail × √(tf / 15m), hold in the same time. Plain: unchanged. */
export function laneProtect(p: Protect, ind: string): Protect {
  const tf = laneOf(ind).tf;
  if (tf === null || tf === REF_TF) return p;
  const k = Math.sqrt(tf / REF_TF);
  const r4 = (x: number) => +(x * k).toFixed(4);
  return {
    ...p,
    tp: r4(p.tp),
    sl: r4(p.sl),
    trail: p.trail > 0 ? r4(p.trail) : 0,
    hold: Math.max(2, Math.round((p.hold * REF_TF) / tf)),
  };
}

/**
 * Main candidates with a share per timeframe lane: every lane gets floor(mainTop / lanes) of its best Base
 * passers, so fast lanes (1m / 5m, lower scores) reach the continuous stages too; seats a lane cannot fill go to
 * the best remaining passers of any lane. Returns "bot|ind" pairs.
 */
export function mainByLane(
  passed: ReadonlyArray<{ bot: string; ind: string; score: number }>,
  mainTop: number,
): Set<string> {
  const byLane = new Map<string, Array<{ bot: string; ind: string; score: number }>>();
  for (const r of passed) {
    const l = laneOf(r.ind);
    const k = l.tf === null ? "plain" : `${l.tf}${l.combined ? "c" : ""}`;
    let xs = byLane.get(k);
    if (!xs) byLane.set(k, (xs = []));
    xs.push(r);
  }
  const out = new Set<string>();
  if (!byLane.size || mainTop <= 0) return out;
  const quota = Math.floor(mainTop / byLane.size);
  for (const xs of byLane.values()) {
    xs.sort((a, b) => b.score - a.score);
    for (const r of xs.slice(0, quota)) out.add(`${r.bot}|${r.ind}`);
  }
  for (const r of [...passed].sort((a, b) => b.score - a.score)) {
    if (out.size >= mainTop) break;
    out.add(`${r.bot}|${r.ind}`);
  }
  return out;
}

/** True when the base bar opening at `baseOpenT` is the last base bar of a lane bar (the lane bar closes with it). */
export const laneClosesWith = (baseOpenT: number, baseTf: number, laneTf: number) =>
  (baseOpenT + baseTf * 60_000) % (laneTf * 60_000) === 0;

/** Timeframe lanes of every indication: independent per timeframe, combined where higher timeframes exist. */
export function laneInds(base: string, tfs: readonly number[]): string[] {
  const out: string[] = [];
  for (const tf of tfs) {
    out.push(laneInd(base, tf));
    if (base !== "none" && higherFactors(tf, tfs.length ? tfs : TF_LADDER).length)
      out.push(laneInd(base, tf, true));
  }
  return out;
}

/**
 * Base scores every combo once: its entry signal (and tactic-filtered copy) is dropped afterwards so the cache
 * holds only the shared indicator series, not one signal per combo × series (memory stays bounded).
 */
export function forgetCombo(u: Universe, bot: string, ind: string) {
  for (const s of seriesOf(u, ind)) {
    const k = u.caches[s];
    k.forgetSuffix(`combo:${bot}:${ind}`);
    k.forgetSuffix(`:${bot}:${ind}`);
  }
}

export interface Combo {
  bot: BotType;
  ind: string;
}

/** Base gate: a config set is evaluated and promoted to Main only with PF ≥ min PF, positive net and enough trades. */
export function passesBase(
  st: { n: number; pf: number; net: number },
  g: { minPf: number; minTrades: number },
): boolean {
  return st.n >= g.minTrades && st.net > 0 && st.pf >= g.minPf;
}

/** Every bot × indication combo; `focus` ("bot|indication" pairs) narrows it when non-empty. */
/**
 * Every bot × indication combo. With `tfs`, every combo in each timeframe lane (independent and combined);
 * without, plain indications (research tools on a single series). A focus pair "bot|ind" selects the combo in
 * every lane; a lane pair "bot|ind@m15" selects that lane only.
 */
export function allCombos(
  focus?: readonly string[],
  disabledKinds?: readonly string[],
  tfs?: readonly number[],
): Combo[] {
  const off = new Set(disabledKinds ?? []);
  const plain: Combo[] = [];
  for (const b of BOTS) {
    if (b.type !== "follow" && b.type !== "revert") plain.push({ bot: b.type, ind: "none" });
    for (const ind of INDICATIONS) if (!off.has(ind.kind)) plain.push({ bot: b.type, ind: ind.id });
  }
  const out = tfs?.length
    ? plain.flatMap((c) => laneInds(c.ind, tfs).map((ind) => ({ bot: c.bot, ind })))
    : plain;
  if (!focus?.length) return out;
  const f = new Set(focus);
  const narrowed = out.filter(
    (c) => f.has(`${c.bot}|${c.ind}`) || f.has(`${c.bot}|${laneOf(c.ind).base}`),
  );
  return narrowed.length ? narrowed : out;
}

const pct = (x: number) => Math.round(x * 10000) / 100;
export function configId(bot: BotType, ind: string, p: Protect, kind?: StratKind): string {
  const base = `${bot}|${ind}|tp${pct(p.tp)}|sl${pct(p.sl)}|tr${pct(p.trail)}|h${p.hold}`;
  return kind === "dca"
    ? `${base}|dca`
    : kind === "dca-active"
      ? `${base}|dcaA`
      : kind === "axis"
        ? `${base}|axis`
        : base;
}

export function kindOfId(id: string): StratKind {
  if (id.endsWith("|axis")) return "axis";
  if (id.endsWith("|dcaA")) return "dca-active";
  if (id.endsWith("|dca")) return "dca";
  return /\|tr0\|/.test(id) ? "normal" : "trailing";
}

const fromPct = (s: string) => +(Number(s) / 100).toFixed(6);

export function parseConfigId(id: string): { bot: BotType; ind: string; protect: Protect } | null {
  const m =
    /^([a-z]+)\|([a-z0-9.@-]+)\|tp([\d.]+)\|sl([\d.]+)\|tr([\d.]+)\|h(\d+)(\|dcaA?|\|axis)?$/.exec(
      id,
    );
  if (!m) return null;
  return {
    bot: m[1] as BotType,
    ind: m[2],
    protect: { tp: fromPct(m[3]), sl: fromPct(m[4]), trail: fromPct(m[5]), hold: +m[6] },
  };
}

export interface SymStat {
  n: number;
  net: number;
  pf: number;
}

export interface ComboRun {
  id: string;
  bot: BotType;
  ind: string;
  protect: Protect;
  stage: 1 | 2;
  trades: Trade[];
  full: Stats;
  is: Stats;
  score: number;
  bySym: Record<string, SymStat>;
  open: OpenPosition[];
  pending: Array<{ sym: string; side: Side }>;
}

export function runCombo(
  u: Universe,
  bot: BotType,
  ind: string,
  protect: Protect,
  cost: number,
  stage: 1 | 2,
  tactics?: Tactics | null,
): ComboRun | null {
  const gen = runComboSteps(u, bot, ind, protect, cost, stage, tactics);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/**
 * One combo over its series, yielding after each series: a 1m lane over 50 symbols is too much work for one
 * uninterrupted slice of the server's event loop.
 */
export function* runComboSteps(
  u: Universe,
  bot: BotType,
  ind: string,
  protect: Protect,
  cost: number,
  stage: 1 | 2,
  tactics?: Tactics | null,
): Generator<void, ComboRun | null> {
  const cooldown = tacticCooldown(tactics);
  protect = laneProtect(protect, ind);
  const id = configId(bot, ind, protect);
  const trades: Trade[] = [];
  const open: OpenPosition[] = [];
  const pending: Array<{ sym: string; side: Side }> = [];
  const bySym: Record<string, SymStat> = {};
  const series = seriesOf(u, ind);
  if (!series.length) return null;
  for (const s of series) {
    const sig = entrySignal(bot, ind, u.caches[s], tactics);
    if (!sig) return null;
    const res = simulate(id, u.bars[s], sig, protect, { cost, cooldown });
    for (const tr of res.trades) trades.push(tr);
    if (res.open) open.push(res.open);
    if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
    if (res.trades.length) {
      const st = statsOf(res.trades);
      bySym[u.bars[s].sym] = { n: st.n, net: st.net, pf: st.pf };
    }
    yield;
  }
  trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  // in-sample = closed before the split (a trade straddling the split is not in-sample)
  const isTrades = trades.filter((t) => t.exitT <= u.splitT);
  const is = statsOf(isTrades, u.splitT);
  return {
    id,
    bot,
    ind,
    protect,
    stage,
    trades,
    full: statsOf(trades, u.nowT),
    is,
    score: scoreStats(is, 8),
    bySym,
    open,
    pending,
  };
}

export interface RankedConfig {
  id: string;
  bot: BotType;
  ind: string;
  protect: Protect;
  stage: 1 | 2;
  full: Stats;
  is: Stats;
  score: number;
  lastN: LastNResult | null;
  evalRes: EvalResult | null;
  rank: number;
  armed: boolean;
}

export interface PipelineProgress {
  stage: "S1" | "S2" | "S3" | "S4" | "S5";
  done: number;
  total: number;
  label: string;
}

export interface PipelineOutput {
  at: number;
  universe: {
    symbols: string[];
    startT: number;
    endT: number;
    splitT: number;
    nowT: number;
    bars: number;
  };
  s1: ComboRun[];
  s2: ComboRun[];
  ranked: RankedConfig[];
  tapes: Map<string, Trade[]>;
  runs: Map<string, ComboRun>;
  armed: string[];
  portfolio: Portfolio;
  timings: Record<string, number>;
}

function refineGrid(): Protect[] {
  const out: Protect[] = [];
  for (const tp of PROTECT_GRID.tp)
    for (const k of PROTECT_GRID.slOfTp)
      for (const trail of PROTECT_GRID.trail)
        for (const hold of PROTECT_GRID.hold) {
          out.push({
            tp,
            sl: Math.round(tp * k * 10000) / 10000,
            trail: Math.round(tp * trail * 10000) / 10000,
            hold,
          });
        }
  return out;
}

export const REFINE_GRID: readonly Protect[] = refineGrid();

/** Strip bulky fields for storage in the S1 list. */
export function slim(r: ComboRun): ComboRun {
  return { ...r, trades: [], open: [], pending: [] };
}

/** Base (S1) for a list of combos — the unit of work a worker thread runs for its share. */
export function baseRuns(
  u: Universe,
  combos: ReadonlyArray<{ bot: string; ind: string }>,
  cost: number,
  tactics?: Tactics | null,
): ComboRun[] {
  const out: ComboRun[] = [];
  for (const c of combos) {
    const r = runCombo(u, c.bot as BotType, c.ind, DEFAULT_PROTECT, cost, 1, tactics);
    if (r) out.push(slim(r));
    forgetCombo(u, c.bot, c.ind);
  }
  return out;
}

export function* runPipeline(
  u: Universe,
  s: CoreSettings,
  /** Base computed elsewhere (worker threads): S1 is taken as given */
  pre?: { s1: ComboRun[] },
): Generator<PipelineProgress, PipelineOutput> {
  const timings: Record<string, number> = {};
  const cost = s.cost;
  const g = s.gates;
  let t0 = performance.now();

  // S1 (every lane when the settings carry timeframe lanes)
  const combos = pre ? [] : allCombos(s.focus, s.disabledKinds, s.tfs);
  const s1: ComboRun[] = pre ? [...pre.s1] : [];
  for (let i = 0; i < combos.length; i++) {
    const c = combos[i];
    const steps = runComboSteps(u, c.bot, c.ind, DEFAULT_PROTECT, cost, 1, s.tactics);
    let r: ComboRun | null = null;
    for (;;) {
      const x = steps.next();
      if (x.done) {
        r = x.value;
        break;
      }
      // a slice boundary between series (same progress; the driver checks its time budget here)
      yield { stage: "S1", done: i, total: combos.length, label: `${c.bot} × ${c.ind}` };
    }
    if (r) s1.push(slim(r));
    forgetCombo(u, c.bot, c.ind);
    yield { stage: "S1", done: i + 1, total: combos.length, label: `${c.bot} × ${c.ind}` };
  }
  s1.sort((a, b) => b.score - a.score);
  timings.S1 = performance.now() - t0;

  // S2
  t0 = performance.now();
  const leaders = s1.filter((r) => r.is.n >= 4).slice(0, s.refineTop);
  const runs = new Map<string, ComboRun>();
  const s2: ComboRun[] = [];
  const grid = REFINE_GRID;
  const total2 = leaders.length * grid.length;
  let done2 = 0;
  for (const L of leaders) {
    for (const p of grid) {
      const steps = runComboSteps(u, L.bot, L.ind, p, cost, 2, s.tactics);
      let r: ComboRun | null = null;
      for (;;) {
        const x = steps.next();
        if (x.done) {
          r = x.value;
          break;
        }
        yield { stage: "S2", done: done2, total: total2, label: `${L.bot} × ${L.ind}` };
      }
      done2++;
      if (!r) continue;
      s2.push(r);
      yield { stage: "S2", done: done2, total: total2, label: r.id };
    }
  }
  s2.sort((a, b) => b.score - a.score);
  timings.S2 = performance.now() - t0;

  // S3 + S4 on the top configs (at most 2 protect variants per bot × indication, keeps diversity)
  t0 = performance.now();
  const perPair = new Map<string, number>();
  const chosen: ComboRun[] = [];
  for (const r of s2) {
    const k = `${r.bot}|${r.ind}`;
    const c = perPair.get(k) ?? 0;
    if (c >= 2) continue;
    perPair.set(k, c + 1);
    chosen.push(r);
    if (chosen.length >= s.evalTop) break;
  }
  const ranked: RankedConfig[] = [];
  const tapes = new Map<string, Trade[]>();
  for (let i = 0; i < chosen.length; i++) {
    const r = chosen[i];
    const ln = optimizeLastN(r.id, r.trades, { gates: g, splitT: u.splitT, nowT: u.nowT });
    const ev = evaluateConfig(r.id, r.trades, { gates: g, nowT: u.nowT, bestN: ln.bestN });
    tapes.set(r.id, r.trades);
    runs.set(r.id, r);
    ranked.push({
      id: r.id,
      bot: r.bot,
      ind: r.ind,
      protect: r.protect,
      stage: 2,
      full: r.full,
      is: r.is,
      score: r.score,
      lastN: ln,
      evalRes: ev,
      rank: 0,
      armed: false,
    });
    yield { stage: "S3", done: i + 1, total: chosen.length, label: r.id };
  }
  timings.S3 = performance.now() - t0;

  // S5: final rank
  // selection uses in-sample data only, so the out-of-sample figures reported afterwards stay honest
  const finalScore = (x: RankedConfig) => {
    const is = x.lastN ? scoreStats(x.lastN.is, 3) : 0;
    const ok = x.lastN && x.lastN.is.net > 0 && x.lastN.is.pf >= g.minPf ? 1 : 0;
    return ok * 1000 + is;
  };
  ranked.sort((a, b) => finalScore(b) - finalScore(a));
  ranked.forEach((x, i) => (x.rank = i + 1));
  // Portfolio of bots: validated configs, combined greedily for green hours at a high order count.
  const cands = ranked
    .filter((x) => x.lastN && x.lastN.is.net > 0 && x.lastN.is.pf >= g.minPf)
    .map((x) => ({ id: x.id, trades: tapes.get(x.id) ?? [], bestN: x.lastN!.bestN }));
  const portfolio = buildPortfolio(cands, {
    gates: g,
    splitT: u.splitT,
    nowT: u.nowT,
    maxSize: s.armTop,
  });
  const armed = portfolio.members;
  for (const x of ranked) x.armed = armed.includes(x.id);
  yield { stage: "S5", done: 1, total: 1, label: `${armed.length} armed` };

  return {
    at: Date.now(),
    universe: {
      symbols: u.bars.map((b) => b.sym),
      startT: u.startT,
      endT: u.endT,
      splitT: u.splitT,
      nowT: u.nowT,
      bars: u.bars.reduce((a, b) => a + b.n, 0),
    },
    s1,
    s2: s2.map(slim),
    ranked,
    tapes,
    runs,
    armed,
    portfolio,
    timings,
  };
}

/** Drive a pipeline generator to completion synchronously (CLI / tests). */
export function runPipelineSync(
  u: Universe,
  s: CoreSettings,
  onProgress?: (p: PipelineProgress) => void,
): PipelineOutput {
  const gen = runPipeline(u, s);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
    onProgress?.(r.value);
  }
}
