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
  Gates,
  LastNResult,
  OpenPosition,
  Protect,
  RangeTag,
  Side,
  Stats,
  StratKind,
  Tactics,
  Trade,
} from "../domain/types.ts";
import { evaluateConfig } from "../evals/evaluator.ts";
import {
  EVAL_MIN_SL,
  microNetTps,
  microPriceTp,
  microSlFloor,
  minPfOf,
  RANGE_OWN_BASE,
  rangeMinTfOf,
  microIndRule,
} from "../minimal-coord.ts";
import { isMicroInd, microIndFits, type MicroIndRule } from "../indications/micro.ts";
import { SeriesCache } from "../indications/cache.ts";
import { MarketSource } from "../indications/market.ts";
import {
  INDICATIONS,
  TF_LADDER,
  higherFactors,
  isSignalInd,
  laneInd,
  laneOf,
} from "../indications/registry.ts";
import { signalCombos, signalSettings } from "../signals.ts";
import { optimizeLastN } from "../lastn/optimizer.ts";
import { scoreStats, statsOf } from "../metrics/stats.ts";
import { ATR_PERIOD, LANE_MIN, REF_TF, simulate } from "../sim/backtest.ts";
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
  // the market reference per timeframe (market.ts), built lazily on the first relation indication: from EVERY series
  // given (a short one too), so a universe cut at any time sees the same market up to the cut
  const market = new MarketSource(bars);
  const caches = ok.map((b) => {
    const k = new SeriesCache(b);
    k.setMarket(market);
    return k;
  });
  return {
    bars: ok,
    caches,
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

export { LANE_MIN, REF_TF };

/**
 * The protect a lane actually trades: TP / SL / trail × √(tf / 15m), hold in the same time. Plain: unchanged.
 * An ATR protect keeps its ATR multiples (the lane's own ATR scales it); only its nominal values and hold move.
 */
export function laneProtect(p: Protect, ind: string): Protect {
  const tf = laneOf(ind).tf;
  if (tf === null || tf === REF_TF) return p;
  // a range cell (micro, minimal, short, general, long, plus) is a fixed price distance on every lane; its hold is
  // the same time on every lane (the grid gives it in 15m bars: 64 bars = 16 h, which is 64 minutes on a 1m lane)
  if (p.tag) return { ...p, hold: Math.max(2, Math.round((p.hold * REF_TF) / tf)) };
  const k = Math.sqrt(tf / REF_TF);
  const r4 = (x: number) => +(x * k).toFixed(4);
  // short lanes: a scaled target never below 3 × the round-trip cost, stops / trails never inside the noise.
  // A soft floor √(x² + lo²): never below lo, every grid config stays distinct and in order, ≈ x when x ≫ lo
  const floor = (x: number, lo: number) => (tf < REF_TF ? +Math.hypot(x, lo).toFixed(4) : x);
  return {
    ...p,
    tp: floor(r4(p.tp), LANE_MIN.tp),
    sl: floor(r4(p.sl), LANE_MIN.sl),
    // the lane floor is on the trailing distance (trail × trailStep), not on the arming move
    trail: p.trail > 0 ? floor(r4(p.trail), LANE_MIN.trail / (p.trailStep ?? 1)) : 0,
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
  if (!byLane.size) return out;
  // 0 = every validated pair
  if (mainTop <= 0) {
    for (const r of passed) out.add(`${r.bot}|${r.ind}`);
    return out;
  }
  // at least one seat per lane: a quota of 0 (mainTop < lanes) collapsed the per-lane share into a global top-N
  const quota = Math.max(1, Math.floor(mainTop / byLane.size));
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
  st: { n: number; pf: number; net: number; mdd?: number },
  g: { minPf: number; minTrades: number; maxDdr?: number },
): boolean {
  // a floor below PF 1 (the sets pre-filter, Gates.baseSetsMinPf) cannot also ask for a positive net
  if (!(st.n >= g.minTrades && (st.net > 0 || g.minPf < 1) && st.pf >= g.minPf)) return false;
  // max drawdown ratio: drawdown ÷ net of the Base window (off at 0)
  return !(g.maxDdr && g.maxDdr > 0 && st.mdd !== undefined && st.mdd / st.net > g.maxDdr);
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
  /**
   * shortest lane a Micro indication can trade (grid.micro.minTf, default 5m): on a faster lane a Micro pair can
   * pass nothing — with Micro on its own indications it is eligible for the Micro column only, and that column is
   * not computed below the lane floor — so those combos were pure Base work counted as "evaluated".
   */
  microMinTf = 0,
): Combo[] {
  const off = new Set(disabledKinds ?? []);
  const plain: Combo[] = [];
  for (const b of BOTS) {
    if (b.type !== "follow" && b.type !== "revert") plain.push({ bot: b.type, ind: "none" });
    // signal sources ("sig-…") are processed by Signals processing, not as engine combos; the Stable-02 ports
    // ("s2-…") run as signal sources only (as engine combos they added 26 % Base work)
    for (const ind of INDICATIONS)
      if (!off.has(ind.kind) && !ind.id.startsWith("sig-") && !ind.id.startsWith("s2-"))
        plain.push({ bot: b.type, ind: ind.id });
  }
  const out = tfs?.length
    ? plain.flatMap((c) =>
        laneInds(c.ind, tfs)
          .filter((ind) => !(microMinTf > 0 && isMicroInd(laneOf(ind).base) && (laneOf(ind).tf ?? 0) < microMinTf))
          .map((ind) => ({ bot: c.bot, ind })),
      )
    : plain;
  if (!focus?.length) return out;
  const f = new Set(focus);
  // a focus that matches nothing stays empty: falling back to every combo turned a typo (or a kind disabled in the
  // same settings) into a 50x Base with no sign of it
  return out.filter((c) => f.has(`${c.bot}|${c.ind}`) || f.has(`${c.bot}|${laneOf(c.ind).base}`));
}

const pct = (x: number) => Math.round(x * 1e6) / 10000;
/** "|atr<sl>x<tpRatio>[t<trail %>]" of an ATR protect ("" otherwise). */
const atrTag = (p: Protect) =>
  p.atr ? `|atr${p.atr.sl}x${p.atr.tpRatio}${p.atr.trail ? `t${p.atr.trail}` : ""}` : "";
export function configId(bot: BotType, ind: string, p: Protect, kind?: StratKind): string {
  const base = `${bot}|${ind}|tp${pct(p.tp)}|sl${pct(p.sl)}|tr${pct(p.trail)}|h${p.hold}${atrTag(p)}${p.tag ? `|${p.tag}` : ""}`;
  return kind === "dca"
    ? `${base}|dca`
    : kind === "dca-active"
      ? `${base}|dcaA`
      : kind === "axis"
        ? `${base}|axis`
        : base;
}

export function kindOfId(id: string): StratKind {
  const core = id.replace(/\|(?:mp|mc|mn|sh|gn|lg)(?=\||$)/g, "");
  if (core.endsWith("|axis")) return "axis";
  if (core.endsWith("|dcaA")) return "dca-active";
  if (core.endsWith("|dca")) return "dca";
  return /\|tr0\|/.test(core) ? "normal" : "trailing";
}

const fromPct = (s: string) => +(Number(s) / 100).toFixed(6);

export function parseConfigId(id: string): { bot: BotType; ind: string; protect: Protect } | null {
  const m =
    // (the Axis variant tag — "|ax-atr2", "|axd-fib3h" from axisVariants — is matched and ignored: without the group
    // every managed / desk Axis id failed to parse and its report rows showed tp / sl / trail / hold 0)
    /^([a-z]+)\|([a-z0-9.@-]+)\|tp([\d.]+)\|sl([\d.]+)\|tr([\d.]+)\|h(\d+)(?:\|atr([\d.]+)x([\d.]+)(?:t([\d.]+))?)?(\|mc|\|mp|\|mn|\|sh|\|gn|\|lg)?(?:\|axd?-[a-z0-9]+)?(\|dcaA?|\|axis)?$/.exec(
      id,
    );
  if (!m) return null;
  const protect: Protect = {
    tp: fromPct(m[3]),
    sl: fromPct(m[4]),
    trail: fromPct(m[5]),
    hold: +m[6],
  };
  if (m[7] !== undefined)
    protect.atr = { sl: +m[7], tpRatio: +m[8], ...(m[9] !== undefined ? { trail: +m[9] } : {}) };
  if (m[10] !== undefined) protect.tag = m[10].slice(1) as RangeTag;
  return { bot: m[1] as BotType, ind: m[2], protect };
}

export interface SymStat {
  n: number;
  net: number;
  pf: number;
  /** max drawdown of the cumulative result (same units as net: %) */
  dd?: number;
  /** share of the 4-hour blocks with trades that ended positive */
  okShare?: number;
  /** trades and net over the most recent 24 h of the history (automatic validation) */
  recentN?: number;
  recentNet?: number;
}

/** Per-symbol stats of a trade list (exit order): n, net, PF, max drawdown, positive 4-hour block share. */
export function symStat(trades: readonly Trade[], nowT?: number): SymStat {
  const st = statsOf(trades);
  let cum = 0;
  let peak = 0;
  let dd = 0;
  const blocks = new Map<number, number>();
  for (const x of trades) {
    cum += x.r * 100;
    if (cum > peak) peak = cum;
    if (peak - cum > dd) dd = peak - cum;
    const b = Math.floor(x.exitT / (4 * 3_600_000));
    blocks.set(b, (blocks.get(b) ?? 0) + x.r);
  }
  let ok = 0;
  for (const v of blocks.values()) if (v > 0) ok++;
  let recentN = 0;
  let recentNet = 0;
  if (nowT !== undefined)
    for (const x of trades)
      if (x.exitT > nowT - 24 * 3_600_000) {
        recentN++;
        recentNet += x.r * 100;
      }
  return {
    n: st.n,
    net: st.net,
    pf: st.pf,
    dd,
    okShare: blocks.size ? ok / blocks.size : 0,
    recentN,
    recentNet,
  };
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
  /** per symbol; a worker sends it pre-serialized (a JSON string is cheap to receive, 50 objects per run are not) */
  bySym: Record<string, SymStat> | string;
  open: OpenPosition[];
  pending: Array<{ sym: string; side: Side }>;
  /**
   * Base: the pair's result at one representative cell of each enabled target range (mc / mn / sh / gn / lg), so a
   * pair is judged at its own range's distances, not only at the default protect (TP 2.6 %)
   */
  ranges?: Record<string, RangeBaseStat>;
  /**
   * Base: the targets of each range whose cells PASSED. The tape stage builds only their cells, so a pair never
   * trades a target Base never validated (rangeBaseStats).
   */
  rangeTps?: Record<string, number[]>;
}

/** Base result of a pair at one range's representative cell (full history). */
export interface RangeBaseStat {
  n: number;
  pf: number;
  net: number;
  mdd: number;
}

/**
 * One representative cell per enabled range for the Base stage: the middle TP and the middle stop ratio, no trail,
 * the first hold (15m-reference bars; every lane holds the same time). Wide grid: the default protect alone.
 */
export function baseRangeProtects(
  g: {
    // (ranges whose ownBase is off, by default Short / General / Long, are judged at the default protect)
    holdH?: readonly number[];
    baseBest?: boolean;
    minSlEval?: number;
    /** grid.baseTrailCells: also measure one trailed cell per range target (off = every Base cell at trail 0) */
    baseTrailCells?: boolean;
    /** the grid's trailing step and trail-free switch: a Base trailed cell is the cell the grid builds */
    trailStep?: number;
    trailFree?: boolean;
    micro?: CoordRangeLike | false;
    minimal?: CoordRangeLike | false;
    short?: CoordRangeLike | false;
    general?: CoordRangeLike | false;
    long?: CoordRangeLike | false;
  },
  /** round-trip cost (settings.cost): Micro's net targets become price targets (tpNetOfCost) */
  cost?: number,
): Protect[] {
  const slFloor = g.minSlEval ?? EVAL_MIN_SL;
  const mid = <T,>(xs: readonly T[]) => xs[Math.floor((xs.length - 1) / 2)];
  const hold = Math.max(2, Math.round(((g.holdH?.[0] ?? 16) * 60) / REF_TF));
  const out: Protect[] = [];
  for (const [tag, r] of [
    ["mc", g.micro],
    ["mn", g.minimal],
    ["sh", g.short],
    ["gn", g.general],
    ["lg", g.long],
  ] as const) {
    if (!r || !r.tp?.length || !r.slOfTp?.length) continue;
    // the range's own evaluation stop floor when it sets one (e.g. micro.minSlEval), else the global one
    // Micro's minSlNet: net floor + the round-trip cost, in place of minSl and minSlEval (as the grid)
    const net = tag === "mc" ? microSlFloor(r as { minSlNet?: number }, cost) : undefined;
    const floorR = net ?? (r as { minSlEval?: number }).minSlEval ?? slFloor;
    const minSlR = net ?? r.minSl ?? 0;
    // every-config Base (grid.baseBest, default on) judges each range on its own cells; ownBase false keeps a
    // range on the default protect
    const best = r.baseBest ?? g.baseBest ?? true;
    if (!(r.ownBase ?? RANGE_OWN_BASE[tag] ?? best)) continue;
    if (best) {
      // every config of the range: each target × each stop (Micro: MICRO_BASE_SL, a spread of its 17 stops); no trail.
      // rangeBaseStats keeps the range's best cell
      const ks = tag === "mc" ? MICRO_BASE_SL : [...new Set(r.slOfTp)].sort((a, b) => a - b);
      for (const tp0 of [...new Set(r.tp)].sort((a, b) => a - b)) {
        const tp = tag === "mc" ? microPriceTp(tp0, r, cost) : tp0;
        // the Base cells are held to the same stop floor as the grid (EVAL_MIN_SL): a pair is never validated at a
        // stop no config may trade
        for (const k of ks)
          out.push({ tp, sl: +Math.max(floorR, minSlR, tp * k).toFixed(6), trail: 0, hold, tag });
        // grid.baseTrailCells: one trailed cell per target as well (the middle non-zero trail ratio at the middle
        // stop). Base measured every cell at trail 0, so a target whose edge needs a trailing stop never passed and
        // its trailing configs were never built — with grid.baseTargets on, the whole target was dropped.
        if (g.baseTrailCells && r.trailOfTp?.length) {
          const trs = [...new Set(r.trailOfTp)].filter((x) => x > 0).sort((a, b) => a - b);
          const tr = mid(trs);
          if (tr !== undefined && tr > 0) {
            // the trailed cell exactly as the grid builds it (protectGrid / forEachCoord): the stop at least the
            // range's trailing stop (trailSlOfTp, default 2×; Micro keeps its stated ratio), the trail floor on the
            // trailing distance (minTrail ÷ trailStep), the grid's trailStep and trailFree. Measured without them,
            // Base validated a trailing cell no config trades (a tighter stop, the target still taken once armed)
            const k0 = mid([...new Set(ks)].sort((a, b) => a - b));
            const k = tag === "mc" ? k0 : Math.max(k0, (r as { trailSlOfTp?: number }).trailSlOfTp ?? 2);
            const step = g.trailStep ?? 1;
            out.push({
              tp,
              sl: +Math.max(floorR, minSlR, tp * k).toFixed(6),
              trail: +Math.max((r.minTrail ?? 0) / (tag === "mc" ? 1 : step), tp * tr).toFixed(6),
              hold,
              tag,
              trailStep: step,
              trailFree: g.trailFree ?? false,
            });
          }
        }
      }
      continue;
    }
    const tp0 = mid([...(tag === "mc" ? microNetTps(r, cost) : r.tp)].sort((a, b) => a - b));
    if (tp0 === undefined) continue;
    const tp = tag === "mc" ? microPriceTp(tp0, r, cost) : tp0;
    const k = mid([...r.slOfTp].sort((a, b) => a - b));
    out.push({ tp, sl: +Math.max(floorR, minSlR, tp * k).toFixed(6), trail: 0, hold, tag });
  }
  return out;
}
type CoordRangeLike = {
  tp: readonly number[];
  slOfTp: readonly number[];
  trailOfTp?: readonly number[];
  minSl?: number;
  minTrail?: number;
  minNetOfCost?: number;
  minSlEval?: number;
  ownBase?: boolean;
  tpNetOfCost?: boolean;
  minSlNet?: number;
  baseBest?: boolean;
};
/**
 * The stops (× target) Micro's best-cell Base tries at every target: 1 / 1.75 / 2.5 / 3.5 / 5 (its 17 MICRO_SL
 * ratios 1–5 would be 119 cells per pair at the 7 targets). Every ratio here is one MICRO_SL actually offers
 * (operator, 5 Oct: Micro stops start at 1.0): a Base cell at a ratio no Micro config can trade validated targets on
 * a stop that never reaches the tape stage. 5× since MICRO_SL
 * reaches 5 (operator, 6 Oct): Micro earned only with stops well beyond its target (reward:risk 0.29–0.36).
 */
export const MICRO_BASE_SL: readonly number[] = [1, 1.75, 2.5, 3.5, 5];

/**
 * Whether a pair passes Base: at the default protect (the wide grid), or at any range's representative cell against
 * that range's own minimum PF. Returns the passing range tags ("" = the default / wide grid).
 */
export function basePassTags(
  r: Pick<ComboRun, "full" | "ranges">,
  g: { minPf: number; minTrades: number; maxDdr?: number; rangeMinPf?: Gates["rangeMinPf"] },
  /** every range tag of the grid; one without its own Base cell passes with the default protect */
  allTags: readonly string[] = [],
): string[] {
  const out: string[] = [];
  const own = new Set(Object.keys(r.ranges ?? {}));
  if (passesBase(r.full, g)) {
    out.push("");
    // a range without its own Base cell is judged on the default cell, but against its own range minimum
    for (const t of allTags)
      if (t && !own.has(t) && passesBase(r.full, { ...g, minPf: minPfOf(g, t) })) out.push(t);
  }
  for (const [tag, st] of Object.entries(r.ranges ?? {}))
    if (passesBase(st, { ...g, minPf: minPfOf(g, tag) })) out.push(tag);
  return out;
}

/**
 * The gates Base computes a pair's sets on: the stage gates, or with Gates.baseSetsMinPf one floor for every range (a
 * wider pre-filter; each set is still judged at its own stage / range minimum before it can trade).
 */
/** The Base pass of one range cell, exactly as basePassTags judges it (the sets gates, the range's own minimum). */
export function rangeCellPass(gates: Gates): (tag: string, st: RangeBaseStat) => boolean {
  const g = baseSetsGates(gates);
  return (tag, st) => passesBase(st, { ...g, minPf: tag ? minPfOf(g, tag) : g.minPf });
}

export function baseSetsGates<G extends Gates>(g: G): G {
  return g.baseSetsMinPf === undefined ? g : { ...g, minPf: g.baseSetsMinPf, rangeMinPf: undefined };
}

/** Per range: the config sets (pairs) Base evaluated and passed against that range's own minimum PF. */
export interface BaseRangeCount {
  /** "" = the default / wide grid */
  tag: string;
  evaluated: number;
  passed: number;
  /** the minimum PF the range is held to */
  minPf: number;
  /** median PF of the evaluated sets / of the passed sets (null without any) */
  pfMedian: number | null;
  pfPassedMedian: number | null;
  /**
   * How many of the `evaluated` pairs were judged at THIS range's own Base cell. The rest were judged at the
   * default protect, so their PF figures are the default protect's — the same numbers the Wide row carries. A row
   * with `ownCells: 0` is therefore a copy of the Wide row and must be read, and reported, as "judged at the
   * default cell", never as a measurement of the range's own distances. Before this, a range that builds no cell of
   * its own (minimal-plus with an empty `cells`, or any range with `ownBase: false`) printed Wide's counts under its
   * own name — byte-identical figures for a range that traded nothing.
   */
  ownCells: number;
}

/**
 * Base result per range type: each engine pair is judged at the default protect (Wide) and at every range's
 * representative cell (its own, else the default) against that range's own minimum, exactly as basePassTags.
 * A range counts only the pairs it builds sets for (`eligible`: the range is on, the lane is not faster than the
 * range's shortest lane, Micro only with the Micro indications and they only in Micro); a range that is off
 * evaluates nothing.
 */
export function baseRangeCounts(
  runs: readonly Pick<ComboRun, "full" | "ranges" | "ind">[],
  g: { minPf: number; minTrades: number; maxDdr?: number; rangeMinPf?: Gates["rangeMinPf"] },
  allTags: readonly string[],
  eligible: (ind: string, tag: string) => boolean = () => true,
): BaseRangeCount[] {
  const median = (xs: number[]) => {
    const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
    return v.length ? v[v.length >> 1] : null;
  };
  return ["", ...allTags].map((tag) => {
    const pf: number[] = [];
    const pfOk: number[] = [];
    const minPf = tag ? minPfOf(g, tag) : g.minPf;
    let evaluated = 0;
    let ownCells = 0;
    for (const r of runs) {
      if (!eligible(r.ind, tag)) continue;
      evaluated++;
      const own = tag ? r.ranges?.[tag] : undefined;
      // no own cell: the pair is judged at the default protect, so these are the DEFAULT protect's figures, not the
      // range's. ownCells records how many rows carry the range's own distances, so a report can say which it is.
      if (own) ownCells++;
      const st = own ?? r.full;
      pf.push(st.pf);
      const ok = own
        ? passesBase(own, { ...g, minPf })
        : passesBase(r.full, g) && (!tag || passesBase(r.full, { ...g, minPf }));
      if (ok) pfOk.push(st.pf);
    }
    return {
      tag,
      evaluated,
      passed: pfOk.length,
      minPf,
      pfMedian: median(pf),
      pfPassedMedian: median(pfOk),
      // the default / wide row is always its own cell
      ownCells: tag ? ownCells : evaluated,
    };
  });
}

export interface BaseGateRow {
  /** the gate this row varies, in words */
  change: string;
  minPf: number;
  minTrades: number;
  maxDdr: number;
  /** pairs passing Base at the default protect (no range tag) */
  passed: number;
  /** pairs passing in at least one range (the tape stage's real input) */
  passedAnyRange: number;
  /** the share of the evaluated pairs that passed in at least one range */
  share: number;
  /** median PF of the pairs that passed at the default protect */
  pfPassedMedian: number | null;
}

/**
 * Base-gate sensitivity, from Base results already computed: how many pairs would pass under each variation of the
 * gate (PF, minimum closes, DDR). No recompute — it re-reads the same ComboRun stats, so a report can answer "what
 * would let more sets through at Base, and at what median PF" without another run.
 */
export function baseGateSensitivity(
  runs: readonly Pick<ComboRun, "full" | "ranges" | "ind">[],
  g: { minPf: number; minTrades: number; maxDdr?: number; rangeMinPf?: Gates["rangeMinPf"] },
  allTags: readonly string[],
  variants: ReadonlyArray<{ change: string; minPf?: number; minTrades?: number; maxDdr?: number }> = [],
  eligible: (ind: string, tag: string) => boolean = () => true,
): BaseGateRow[] {
  const median = (xs: number[]) => {
    const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
    return v.length ? v[v.length >> 1] : null;
  };
  const rows: BaseGateRow[] = [];
  const all = [{ change: "as run" }, ...variants];
  for (const v of all) {
    const gg = {
      ...g,
      minPf: v.minPf ?? g.minPf,
      minTrades: v.minTrades ?? g.minTrades,
      maxDdr: v.maxDdr ?? g.maxDdr,
    };
    let passed = 0;
    let anyRange = 0;
    let evaluated = 0;
    const pf: number[] = [];
    for (const r of runs) {
      evaluated++;
      const atDefault = passesBase(r.full, gg);
      if (atDefault) {
        passed++;
        pf.push(r.full.pf);
      }
      const inAny =
        (atDefault && allTags.some((t) => !t || (eligible(r.ind, t) && passesBase(r.full, { ...gg, minPf: minPfOf(gg, t) })))) ||
        Object.entries(r.ranges ?? {}).some(
          ([t, st]) => eligible(r.ind, t) && passesBase(st, { ...gg, minPf: minPfOf(gg, t) }),
        );
      if (inAny) anyRange++;
    }
    rows.push({
      change: v.change,
      minPf: gg.minPf,
      minTrades: gg.minTrades,
      maxDdr: gg.maxDdr ?? 0,
      passed,
      passedAnyRange: anyRange,
      share: evaluated ? anyRange / evaluated : 0,
      pfPassedMedian: median(pf),
    });
  }
  return rows;
}

/** The Base-gate variations a report sweeps by default: each gate on its own, then the pair that matters most. */
export const BASE_GATE_VARIANTS: ReadonlyArray<{ change: string; minPf?: number; minTrades?: number; maxDdr?: number }> = [
  { change: "PF ≥ 1.00", minPf: 1 },
  { change: "PF ≥ 1.05", minPf: 1.05 },
  { change: "PF ≥ 1.20", minPf: 1.2 },
  { change: "closes ≥ 6", minTrades: 6 },
  { change: "closes ≥ 20", minTrades: 20 },
  { change: "closes ≥ 30", minTrades: 30 },
  { change: "DDR off", maxDdr: 0 },
  { change: "DDR ≤ 2", maxDdr: 2 },
  { change: "DDR ≤ 0.5", maxDdr: 0.5 },
  { change: "PF ≥ 1.00 · DDR off", minPf: 1, maxDdr: 0 },
  { change: "PF ≥ 1.00 · DDR off · closes ≥ 6", minPf: 1, maxDdr: 0, minTrades: 6 },
];

/**
 * Whether a range builds sets for a pair's indication (the tape builder's own rules): the range is on, its lane is not
 * faster than the range's shortest lane, and with Micro on its own indications Micro takes exactly those.
 */
export function rangeAppliesTo(
  ind: string,
  tag: string,
  o: {
    enabled: (tag: string) => boolean;
    minTf?: Partial<Record<string, number>>;
    microOwnInds?: MicroIndRule;
    /** the timeframe of a plain (lane-less) indication: the base bars' */
    baseTf?: number;
  },
): boolean {
  if (!o.enabled(tag)) return false;
  if (!microIndFits(o.microOwnInds, tag, isMicroInd(laneOf(ind).base))) return false;
  const tf = laneOf(ind).tf ?? o.baseTf ?? 1;
  // Wide ("" ) reads its own "wide" entry (grid.wideMinTf)
  return !(tf < (o.minTf?.[tag || "wide"] ?? 0));
}

/** Range stats of a pair at each representative cell (a lane faster than a range's shortest lane skips it). */
export function rangeBaseStats(
  u: Universe,
  bot: BotType,
  ind: string,
  protects: readonly Protect[],
  cost: number,
  tactics?: Tactics | null,
  minTf?: Partial<Record<string, number>>,
  microOwnInds: MicroIndRule = false,
  /**
   * whether a cell passes its range's Base gate: several cells of one range (Base at every config) keep a passing
   * cell before a failing one, then the higher net — the best by net alone could fail PF / DDR / min trades while
   * another cell of the range passed, and the pair was blocked from the range
   */
  pass?: (tag: string, st: RangeBaseStat) => boolean,
  /** base timeframe of the universe, for an indication without a lane */
  baseTf?: number,
  /**
   * filled with the range targets that PASSED (per tag): the tape stage builds only their cells, so a pair never
   * trades a target Base never validated. Base tries each target at MICRO_BASE_SL / the range's stop ratios, so a
   * target passes when any of its cells does — the selection is best-of-4 per target instead of best-of-28 per
   * range, which is what let ~95 % of the built Micro cells fail the Real net gate.
   */
  tpsOut?: Record<string, number[]>,
): Record<string, RangeBaseStat> | undefined {
  if (!protects.length) return undefined;
  // a lane-less indication (a research tool, a legacy preset) trades the base timeframe: the same expression
  // rangeAppliesTo uses, so the Base-by-range counts match the cells actually computed
  const laneTf = laneOf(ind).tf ?? baseTf ?? 1;
  const microInd = isMicroInd(laneOf(ind).base);
  const out: Record<string, RangeBaseStat> = {};
  for (const p of protects) {
    if (p.tag && laneTf < (minTf?.[p.tag] ?? 0)) continue;
    if (!microIndFits(microOwnInds, p.tag, microInd)) continue;
    const r = runCombo(u, bot, ind, p, cost, 1, tactics);
    if (!r) continue;
    // several cells of one range (Base at every config): a passing cell first, then the higher net
    const k = p.tag ?? "";
    const prev = out[k];
    const cand = { n: r.full.n, pf: r.full.pf, net: r.full.net, mdd: r.full.mdd };
    if (tpsOut && k && pass && pass(k, cand)) {
      const xs = (tpsOut[k] ??= []);
      if (!xs.includes(p.tp)) xs.push(p.tp);
    }
    if (!prev) {
      out[k] = cand;
      continue;
    }
    const pc = pass ? pass(k, cand) : false;
    const pp = pass ? pass(k, prev) : false;
    if (pc !== pp ? pc : cand.net > prev.net) out[k] = cand;
  }
  return out;
}


export function runCombo(
  u: Universe,
  bot: BotType,
  ind: string,
  protect: Protect,
  cost: number,
  stage: 1 | 2,
  tactics?: Tactics | null,
  /** the protect is already the lane's (e.g. parsed from a config id): do not scale it again */
  laneScaled = false,
): ComboRun | null {
  const gen = runComboSteps(u, bot, ind, protect, cost, stage, tactics, laneScaled);
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
  laneScaled = false,
): Generator<void, ComboRun | null> {
  const cooldown = tacticCooldown(tactics);
  if (!laneScaled) protect = laneProtect(protect, ind);
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
    const res = simulate(id, u.bars[s], sig, protect, {
      cost,
      cooldown,
      atr: protect.atr ? u.caches[s].atrEma(ATR_PERIOD) : undefined,
    });
    for (const tr of res.trades) trades.push(tr);
    if (res.open) open.push(res.open);
    if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
    if (res.trades.length) bySym[u.bars[s].sym] = symStat(res.trades, u.nowT);
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
  /** serialize bySym (for a worker reply) */
  packed = false,
  /** release every cached series after each indication group (workers: bounded memory) */
  release = false,
  /** cumulative combos finished, so a worker can report progress before the final reply */
  onStep?: (done: number, total: number) => void,
  /** one representative cell per range (baseRangeProtects): each pair is also judged at its ranges' distances */
  rangeProtects: readonly Protect[] = [],
  rangeMinTf?: Partial<Record<string, number>>,
  /** Micro cells judged only for Micro indications ("mc-…"), and Minimal cells too under "minimal" (microIndRule) */
  microOwnInds: MicroIndRule = false,
  /** the stage gates: a range keeps a passing cell first (rangeCellPass) */
  gates?: Gates,
): ComboRun[] {
  const pass = gates ? rangeCellPass(gates) : undefined;
  const out: ComboRun[] = [];
  // grouped by indication: its indicator series are computed once for every bot, then released before the
  // next indication (a worker holding every indicator of every lane and symbol grew to gigabytes)
  const groups = new Map<string, Array<{ bot: string; ind: string }>>();
  for (const c of combos) {
    const k = laneOf(c.ind).base;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(c);
  }
  let done = 0;
  const total = combos.length;
  const step = Math.max(1, Math.floor(total / 20));
  for (const g of groups.values()) {
    for (const c of g) {
      const r = runCombo(u, c.bot as BotType, c.ind, DEFAULT_PROTECT, cost, 1, tactics);
      if (r) {
        // signal pairs never use range cells (they take their own configs): no range runs for them
        const tps: Record<string, number[]> = {};
        const ranges = isSignalInd(c.ind)
          ? undefined
          : rangeBaseStats(
              u,
              c.bot as BotType,
              c.ind,
              rangeProtects,
              cost,
              tactics,
              rangeMinTf,
              microOwnInds,
              pass,
              u.baseTf,
              tps,
            );
        if (ranges) r.ranges = ranges;
        if (Object.keys(tps).length) r.rangeTps = tps;
        out.push(packed ? { ...slim(r), bySym: JSON.stringify(r.bySym) } : slim(r));
      }
      done++;
      if (onStep && (done === total || done % step === 0)) onStep(done, total);
    }
    // bot triggers are reused by every indication: kept; the indication's own series are released
    if (release) for (const k of u.caches) k.clear(["bot:"]);
    else for (const c of g) forgetCombo(u, c.bot, c.ind);
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
  const combos = pre
    ? []
    : [
        ...allCombos(s.focus, s.disabledKinds, s.tfs),
        ...signalCombos(signalSettings(s.signals), s.tfs ?? []),
      ];
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
    if (r && !isSignalInd(c.ind)) {
      const g = s.grid ?? {};
      const microOwn = microIndRule(g);
      const tps: Record<string, number[]> = {};
      const ranges = rangeBaseStats(
        u,
        c.bot,
        c.ind,
        baseRangeProtects(g, cost),
        cost,
        s.tactics,
        rangeMinTfOf(g),
        microOwn,
        s.gates ? rangeCellPass(s.gates) : undefined,
        u.baseTf,
        tps,
      );
      if (ranges) r.ranges = ranges;
      if (Object.keys(tps).length) r.rangeTps = tps;
    }
    if (r) s1.push(slim(r));
    forgetCombo(u, c.bot, c.ind);
    yield { stage: "S1", done: i + 1, total: combos.length, label: `${c.bot} × ${c.ind}` };
  }
  s1.sort((a, b) => b.score - a.score);
  timings.S1 = performance.now() - t0;

  // S2
  t0 = performance.now();
  const leaders = s1.filter((r) => r.is.n >= 4 && !isSignalInd(r.ind)).slice(0, s.refineTop);
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
    // each config is held to its own range's minimum PF (as at Base), not the stage minimum alone
    const gr = { ...g, minPf: minPfOf(g, r.protect.tag) };
    const ln = optimizeLastN(r.id, r.trades, { gates: gr, splitT: u.splitT, nowT: u.nowT });
    const ev = evaluateConfig(r.id, r.trades, { gates: gr, nowT: u.nowT, bestN: ln.bestN });
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
    const ok = x.lastN && x.lastN.is.net > 0 && x.lastN.is.pf >= minPfOf(g, x.protect.tag) ? 1 : 0;
    return ok * 1000 + is;
  };
  ranked.sort((a, b) => finalScore(b) - finalScore(a));
  ranked.forEach((x, i) => (x.rank = i + 1));
  // Portfolio of bots: validated configs, combined greedily for green hours at a high order count.
  const cands = ranked
    .filter((x) => x.lastN && x.lastN.is.net > 0 && x.lastN.is.pf >= minPfOf(g, x.protect.tag))
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
