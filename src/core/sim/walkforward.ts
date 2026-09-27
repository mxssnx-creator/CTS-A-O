// Walk-forward trade simulation ("simulated trade runs") — the Base → Main → Real → Live coordination.
//
//   Base  every indication × bot type × protect × sub-strategy (normal, trailing, DCA, DCA Active) has a
//         causal tape, always computed (intern), independent of execution toggles.
//   Main  at each step t, configs whose LONG window (closed before t) passes min PF / DDT and whose
//         bot × indication pair is parameter-robust.
//   Real  Main configs that are still working in the PRE-HISTORIC window (default 20h) and are allowed by
//         the toggles; ranked, one per pair, top `portfolio`. Their entries are executed on paper:
//           - last-N check (last N closes before the entry must hold PF >= neutral)
//           - Block: last-N windows 1..maxLevel checked independently; level = passing windows;
//             volume = 1 + ratio·level (capped); Block Active executes only level >= minActiveLevel
//           - Normal off: plain normal entries only execute when Block-adjusted (level >= 1)
//           - max positions per symbol / total, honest hour guard
//   Live  the Real entries due now are handed to the live adapter (gated, off by default).
import { allCombos, configId, laneProtect, REF_TF, seriesOf } from "../pipeline/pipeline.ts";
import type { Universe } from "../pipeline/pipeline.ts";
import { entrySignal } from "../bots/bots.ts";
import { tacticCooldown } from "../indications/filters.ts";
import {
  DEFAULT_BLOCK,
  DEFAULT_DCA,
  DEFAULT_TOGGLES,
  PF_NEUTRAL,
  type CoreSettings,
} from "../config.ts";
import type {
  AxisConfig,
  BlockConfig,
  BotType,
  ProtectGridSpec,
  DcaConfig,
  Gates,
  OpenPosition,
  Protect,
  Stats,
  StratKind,
  StrategyToggles,
  Tactics,
  Trade,
} from "../domain/types.ts";
import { hourlyNet, profitFactor, scoreStats, statsOf } from "../metrics/stats.ts";
import { simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis } from "./axis.ts";
import { adjustProtect, setKeyOf, type AdjustState } from "../adjust.ts";
import { BlockBook, bookLevels, combineLevels } from "./block.ts";
import { INDICATION_BY_ID, isSignalInd, laneOf } from "../indications/registry.ts";
import { guardKey, SignalGuard } from "../signals.ts";

const H = 3_600_000;

export interface WalkForwardOptions {
  preH: number;
  simH: number;
  stepH: number;
  /** simulation start; default = end - simH */
  startT?: number;
  portfolio: number;
  /** last-N check; 0 = off */
  lastN: number;
  lastNMinPf: number;
  maxPerSymbol: number;
  maxOpen: number;
  guardPct: number;
  /** long (Main) window in hours */
  longH: number;
  /** share of a pair's variants that must pass the long window */
  robustFrac: number;
  rank: "score" | "lcb" | "net";
  /**
   * Selection mode.
   *  hourly  — re-rank every step on the long + pre-historic windows
   *  durable — keep durable winners: a config must be positive in >= durableFrac of `durableSplits`
   *            sub-windows of the long window (PF >= min overall); once held it stays until its long-window
   *            PF drops below neutral 1.0 (sticky, low churn)
   *  fixed   — every focus pair trades continuously (validated offline); best protect per pair
   */
  mode: "hourly" | "durable" | "fixed";
  /** strategy config sets paused by the live-feedback adjuster ("bot|ind|kind") */
  paused?: ReadonlySet<string>;
  durableSplits: number;
  durableFrac: number;
  /** require the pre-historic window to still work (PF >= neutral) */
  preGate: boolean;
  /** restrict Main to these bot types (empty = all) */
  bots: readonly BotType[];
  /** max open positions per side (long / short) across the book: limits correlated stop-outs */
  maxPerSide: number;
  /**
   * max open POSITIONS (distinct symbol × direction); an order on a symbol and side that is already open does
   * not add a position, so orders stay many while positions stay few
   */
  maxPositions?: number;
  /**
   * seats per strategy family: Normal/Trailing, DCA and Axis each get their own `portfolio` seats (one config
   * per pair and family), so the additional strategies run next to the base instead of competing for its seat
   */
  familySeats?: boolean;
  /** DCA / Axis need a base (Normal / Trailing) result on the same pair to beat (default); false = pass when none */
  familyNeedsBase?: boolean;
  /** minimum Real seats per timeframe lane group (validated configs only); the portfolio grows to fit */
  laneSeats?: number;
  /** signals that trade: "bot|ind|sym" (Signals processing); unset = every signal */
  signalActive?: ReadonlySet<string>;
  /** signal guard window (last N closed results; 0 = off) */
  signalGuardN?: number;
  /** signal orders have caps of their own (they add orders, never take the engine's): per symbol, open */
  signalPerSymbol?: number;
  signalMaxOpen?: number;
  toggles: StrategyToggles;
  block: BlockConfig;
  dca: DcaConfig;
  gates: Gates;
  cost: number;
  protects: readonly Protect[];
  dcaProtects: readonly Protect[];
}

export const DEFAULT_GRID: ProtectGridSpec = {
  tp: [0.026, 0.035, 0.05, 0.07],
  slOfTp: [1, 1.5, 2, 2.5],
  trailOfTp: [0, 0.5],
  minTrail: 0.006,
  minSl: 0.01,
  holdH: [8, 24],
  trailStep: 1,
  trailFree: false,
};

/** Every protect variant of a grid (hold converted to bars). Each variant is computed independently. */
export function protectGrid(tfMin: number, g: ProtectGridSpec = DEFAULT_GRID): Protect[] {
  const out: Protect[] = [];
  const seen = new Set<string>();
  for (const tp of g.tp)
    for (const k of g.slOfTp)
      for (const tr of g.trailOfTp)
        for (const h of g.holdH) {
          const p: Protect = {
            tp,
            sl: +Math.max(g.minSl, tp * k).toFixed(4),
            trail: tr > 0 ? +Math.max(g.minTrail, tp * tr).toFixed(4) : 0,
            hold: Math.max(2, Math.round((h * 60) / tfMin)),
          };
          // Evidence (60 days of 15m): a trail at half the activation move that drops the target is better per raw
          // trade (−0.185 % → −0.166 %, 173 → 202 combos with PF ≥ 1.1) but WORSE after walk-forward selection
          // (All on PF 1.07 → 1.00, with the direction Block 1.16 → 1.05). Default stays the plain trail; both
          // are settings (trailStep, trailFree).
          if (p.trail > 0) {
            p.trailStep = g.trailStep ?? 1;
            p.trailFree = g.trailFree ?? false;
          }
          const key = `${p.tp}|${p.sl}|${p.trail}|${p.hold}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push(p);
          }
        }
  return out;
}

export function dcaProtectGrid(tfMin: number): Protect[] {
  const hold = Math.max(4, Math.round(480 / tfMin));
  return [0.026, 0.035].map((tp) => ({ tp, sl: +(tp * 1.5).toFixed(4), trail: 0, hold }));
}

export function defaultWalkForward(s: CoreSettings): WalkForwardOptions {
  return {
    preH: 20,
    simH: 48,
    stepH: 1,
    // Real seats per strategy family (0 = no limit)
    portfolio: 12,
    lastN: 12,
    lastNMinPf: PF_NEUTRAL,
    // order caps: 0 = no limit (every order works; positions stay capped by maxPositions)
    maxPerSymbol: 0,
    maxOpen: 0,
    guardPct: 1,
    longH: 336,
    robustFrac: 0.6,
    rank: "lcb",
    bots: [],
    mode: "durable",
    durableSplits: 4,
    durableFrac: 0.75,
    preGate: true,
    maxPerSide: 0,
    // positions (symbol × direction): capped — unlimited seats / positions cost PF (6 h, 12 symbols: 1,288 orders
    // PF 1.31 vs 719 orders PF 2.45 capped); 0 = no limit
    maxPositions: 12,
    // one Real seat per pair: DCA / Axis trade only when they outscore Normal / Trailing on that pair. Separate
    // family seats lowered PF on real data (4 days, 12 symbols: 1.25 / 0.93 / 1.01 / 1.77 vs 1.39 / 1.16 / 1.01 /
    // 1.77 without): DCA / Axis tapes that pass their own window gate lost forward (Axis PF 0.13–0.51 on 3 days)
    familySeats: false,
    laneSeats: 3,
    toggles: { ...DEFAULT_TOGGLES, ...(s.toggles ?? {}) },
    block: { ...DEFAULT_BLOCK, ...(s.block ?? {}) },
    dca: { ...DEFAULT_DCA, ...(s.dca ?? {}) },
    gates: s.gates,
    cost: s.cost,
    // with timeframe lanes the grid is expressed on the 15m reference and every lane scales it (laneProtect)
    protects: protectGrid(s.tfs?.length ? REF_TF : s.tfMin, s.grid ?? DEFAULT_GRID),
    dcaProtects: dcaProtectGrid(s.tfs?.length ? REF_TF : s.tfMin),
  };
}

export interface ConfigTape {
  id: string;
  bot: BotType;
  ind: string;
  protect: Protect;
  kind: StratKind;
  /** number of closed trades; columns below are ordered by exit time */
  n: number;
  syms: readonly string[];
  exitT: Float64Array;
  entryT: Float64Array;
  r: Float64Array;
  entry: Float32Array;
  exit: Float32Array;
  symI: Uint16Array;
  side: Int8Array;
  reason: Uint8Array;
  bars: Uint16Array;
  vol: Float32Array;
  level: Uint8Array;
  /** prefix sums over trades (length n+1): gross profit, gross loss, r, r² */
  gp: Float64Array;
  gl: Float64Array;
  rs: Float64Array;
  r2: Float64Array;
  /** positions still open at the last bar (normal / trailing only) */
  open: OpenPosition[];
  /** signals on the last closed bar (enter at the next open) */
  pending: Array<{ sym: string; side: 1 | -1 }>;
  /**
   * First time the tape's series can produce a trade (its lane's history start + a day of indicator warm-up).
   * Selection windows start here at the earliest: a lane with a shorter history (1m: days) is judged on what
   * it has, not on empty weeks before its data.
   */
  fromT?: number;
}

const REASONS: Trade["reason"][] = ["tp", "sl", "trail", "time", "disarm"];

/** Bytes of one tape's backing buffer: 9 float64 columns (3 × n, 4 × n+1), 3 float32, 2 uint16, 3 int8/uint8. */
export const tapeBytes = (n: number) => (3 * n + 4 * (n + 1)) * 8 + n * 4 * 3 + n * 2 * 2 + n * 3;

/** The column views of a tape of `n` trades laid out at `off` in `buf` (the one layout, used everywhere). */
export function tapeViews(buf: ArrayBufferLike, off0: number, n: number) {
  let off = off0;
  const F = (len: number) => {
    const a = new Float64Array(buf, off, len);
    off += len * 8;
    return a;
  };
  const exitT = F(n),
    entryT = F(n),
    r = F(n),
    gp = F(n + 1),
    gl = F(n + 1),
    rs = F(n + 1),
    r2 = F(n + 1);
  const entry = new Float32Array(buf, off, n);
  off += n * 4;
  const exit = new Float32Array(buf, off, n);
  off += n * 4;
  const vol = new Float32Array(buf, off, n);
  off += n * 4;
  const symI = new Uint16Array(buf, off, n);
  off += n * 2;
  const bars = new Uint16Array(buf, off, n);
  off += n * 2;
  const side = new Int8Array(buf, off, n);
  off += n;
  const reason = new Uint8Array(buf, off, n);
  off += n;
  const level = new Uint8Array(buf, off, n);
  return { exitT, entryT, r, gp, gl, rs, r2, entry, exit, vol, symI, bars, side, reason, level };
}

/**
 * All tapes in ONE shared buffer plus one metadata string (symbol lists stored once): posting this to a worker
 * clones a buffer handle and a string, not tens of thousands of objects (that clone stalled the event loop for
 * seconds per worker at 40+ symbols).
 */
export interface PackedTapes {
  sab: SharedArrayBuffer;
  meta: string;
}
export function packTapes(tapes: readonly ConfigTape[]): PackedTapes {
  const align = (x: number) => (x + 7) & ~7;
  let total = 0;
  for (const t of tapes) total = align(total) + tapeBytes(t.n);
  const sab = new SharedArrayBuffer(Math.max(8, align(total)));
  const dst = new Uint8Array(sab);
  const symTables: Array<readonly string[]> = [];
  const symIdx = new Map<readonly string[], number>();
  const rows: unknown[] = [];
  let off = 0;
  for (const t of tapes) {
    off = align(off);
    const src = t.exitT.buffer;
    // a makeTape tape: one backing buffer, columns in the tapeViews layout from its start
    if (t.exitT.byteOffset !== 0 || src.byteLength < tapeBytes(t.n))
      throw new Error("tape not in the packed layout");
    dst.set(new Uint8Array(src, 0, tapeBytes(t.n)), off);
    let si = symIdx.get(t.syms);
    if (si === undefined) {
      si = symTables.length;
      symTables.push(t.syms);
      symIdx.set(t.syms, si);
    }
    rows.push([
      t.id,
      t.bot,
      t.ind,
      t.protect,
      t.kind,
      t.n,
      si,
      off,
      t.open,
      t.pending,
      t.fromT ?? null,
    ]);
    off += tapeBytes(t.n);
  }
  return { sab, meta: JSON.stringify({ syms: symTables, rows }) };
}
export function unpackTapes(p: PackedTapes): ConfigTape[] {
  const { syms, rows } = JSON.parse(p.meta) as { syms: string[][]; rows: unknown[][] };
  return rows.map((x) => {
    const [id, bot, ind, protect, kind, n, si, off, open, pending, fromT] = x as [
      string,
      BotType,
      string,
      Protect,
      StratKind,
      number,
      number,
      number,
      OpenPosition[],
      ConfigTape["pending"],
      number | null,
    ];
    const t: ConfigTape = {
      id,
      bot,
      ind,
      protect,
      kind,
      n,
      syms: syms[si],
      ...tapeViews(p.sab, off, n),
      open,
      pending,
    };
    if (fromT !== null) t.fromT = fromT;
    return t;
  });
}

export function makeTape(
  id: string,
  bot: BotType,
  ind: string,
  protect: Protect,
  kind: StratKind,
  syms: readonly string[],
  trades: Trade[],
  open: OpenPosition[],
  pending: ConfigTape["pending"],
): ConfigTape {
  trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  const n = trades.length;
  const symIdx = new Map(syms.map((s, i) => [s, i]));
  const buf = new ArrayBuffer(tapeBytes(n));
  const { exitT, entryT, r, gp, gl, rs, r2, entry, exit, vol, symI, bars, side, reason, level } =
    tapeViews(buf, 0, n);
  const tp: ConfigTape = {
    id,
    bot,
    ind,
    protect,
    kind,
    n,
    syms,
    exitT,
    entryT,
    r,
    entry,
    exit,
    symI,
    side,
    reason,
    bars,
    vol,
    level,
    gp,
    gl,
    rs,
    r2,
    open,
    pending,
  };
  for (let i = 0; i < n; i++) {
    const t = trades[i];
    tp.exitT[i] = t.exitT;
    tp.entryT[i] = t.entryT;
    tp.r[i] = t.r;
    tp.entry[i] = t.entry;
    tp.exit[i] = t.exit;
    tp.symI[i] = symIdx.get(t.sym) ?? 0;
    tp.side[i] = t.side;
    tp.reason[i] = Math.max(0, REASONS.indexOf(t.reason));
    tp.bars[i] = Math.min(65535, t.bars);
    tp.vol[i] = t.vol ?? 1;
    tp.level[i] = Math.min(255, t.level ?? 0);
    const r = t.r;
    tp.gp[i + 1] = tp.gp[i] + (r > 0 ? r : 0);
    tp.gl[i + 1] = tp.gl[i] + (r < 0 ? -r : 0);
    tp.rs[i + 1] = tp.rs[i] + r;
    tp.r2[i + 1] = tp.r2[i] + r * r;
  }
  return tp;
}

/** Materialise one trade of a compact tape. */
export function tradeAt(tp: ConfigTape, i: number): Trade {
  return {
    cfg: tp.id,
    sym: tp.syms[tp.symI[i]],
    side: tp.side[i] as 1 | -1,
    entryT: tp.entryT[i],
    exitT: tp.exitT[i],
    entry: tp.entry[i],
    exit: tp.exit[i],
    r: tp.r[i],
    reason: REASONS[tp.reason[i]],
    bars: tp.bars[i],
    mfe: 0,
    mae: 0,
    kind: tp.kind,
    vol: tp.vol[i],
    level: tp.level[i],
  };
}

export function tapeTrades(tp: ConfigTape, from = 0, to = tp.n): Trade[] {
  const out: Trade[] = [];
  for (let i = from; i < to; i++) out.push(tradeAt(tp, i));
  return out;
}

/** O(1) window numbers from prefix sums (net in percent). */
function win(tp: ConfigTape, a: number, b: number) {
  const gp = tp.gp[b] - tp.gp[a];
  const gl = tp.gl[b] - tp.gl[a];
  return { n: b - a, net: (tp.rs[b] - tp.rs[a]) * 100, pf: profitFactor(gp, gl) };
}

/** Longest time under the running peak inside [a, b), counting an open dip up to nowT (hours). */
function winDdt(tp: ConfigTape, a: number, b: number, nowT: number): number {
  if (b <= a) return 0;
  let cum = 0;
  let peak = 0;
  let peakT = tp.entryT[a];
  let dipped = false;
  let ddt = 0;
  for (let i = a; i < b; i++) {
    cum += tp.r[i];
    if (cum < peak) dipped = true;
    else {
      if (dipped && tp.exitT[i] - peakT > ddt) ddt = tp.exitT[i] - peakT;
      dipped = false;
      peak = cum;
      peakT = tp.exitT[i];
    }
  }
  if (dipped && nowT - peakT > ddt) ddt = nowT - peakT;
  return ddt / H;
}

/** Base: causal tapes for every combo × protect × sub-strategy. Generator so callers can time-slice. */
export function* buildTapesGen(
  u: Universe,
  protects: readonly Protect[],
  cost: number,
  dcaOpt?: { protects: readonly Protect[]; dca: DcaConfig; axis?: AxisConfig },
  /** Main candidates as "bot|ind"; undefined = every combo */
  only?: ReadonlySet<string>,
  /** engine-wide entry tactics (session, volatility, trend strength, cooldown) */
  tactics?: Tactics | null,
  /** live-feedback adjustments per set (wider min SL / trailing distance) */
  adjust?: AdjustState | null,
): Generator<{ done: number; total: number }, ConfigTape[]> {
  const adj = (bot: string, ind: string, kind: StratKind, p: Protect) =>
    adjustProtect(p, adjust?.[`${bot}|${ind}|${kind}`]);
  const cooldown = tacticCooldown(tactics);
  // Main candidates are "bot|ind" pairs (lane indications included); without them every plain combo
  const combos = only
    ? [...only].map((k) => {
        const [bot, ind] = k.split("|");
        return { bot: bot as BotType, ind };
      })
    : allCombos();
  const syms = u.bars.map((b) => b.sym);
  const out: ConfigTape[] = [];
  const axisN = !dcaOpt?.axis
    ? 0
    : dcaOpt.axis.exits === "fixed"
      ? dcaOpt.protects.length
      : (dcaOpt.axis.ranges?.length || 1) * (dcaOpt.axis.levelsSet?.length || 1);
  const per = protects.length + (dcaOpt ? dcaOpt.protects.length * 2 + axisN : 0);
  const total = combos.length * per;
  let done = 0;
  for (const c of combos) {
    // a lane indication runs only on its timeframe's series
    const series = seriesOf(u, c.ind);
    let fromT = Infinity;
    for (const s of series) fromT = Math.min(fromT, (u.bars[s].t[0] ?? Infinity) + 24 * H);
    const atFrom = (t: ConfigTape) => {
      if (Number.isFinite(fromT)) t.fromT = fromT;
      return t;
    };
    const sigs: Array<Int8Array | null> = new Array(u.bars.length).fill(null);
    for (const s of series) {
      sigs[s] = entrySignal(c.bot, c.ind, u.caches[s], tactics);
      // signal series for one symbol can be heavy on first use; let the caller yield per symbol
      yield { done, total };
    }
    if (!series.length || series.some((s) => sigs[s] === null)) {
      done += per;
      continue;
    }
    // short-lane floors can map two grid configs onto one: each config id is built once
    const built = new Set<string>();
    for (const p0 of protects) {
      const kind: StratKind = p0.trail > 0 ? "trailing" : "normal";
      const p = adj(c.bot, c.ind, kind, laneProtect(p0, c.ind));
      const id = configId(c.bot, c.ind, p);
      if (built.has(id)) {
        done++;
        continue;
      }
      built.add(id);
      const trades: Trade[] = [];
      const open: OpenPosition[] = [];
      const pending: ConfigTape["pending"] = [];
      for (const s of series) {
        const res = simulate(id, u.bars[s], sigs[s]!, p, { cost, cooldown });
        for (const tr of res.trades) {
          tr.kind = kind;
          trades.push(tr);
        }
        if (res.open) open.push(res.open);
        if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
      }
      out.push(atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, open, pending)));
      done++;
      yield { done, total };
    }
    if (dcaOpt) {
      for (const p0 of dcaOpt.protects) {
        for (const active of [false, true]) {
          const kind: StratKind = active ? "dca-active" : "dca";
          const p = adj(c.bot, c.ind, kind, laneProtect(p0, c.ind));
          const id = configId(c.bot, c.ind, p, kind);
          if (built.has(id)) {
            done++;
            continue;
          }
          built.add(id);
          const trades: Trade[] = [];
          const pending: ConfigTape["pending"] = [];
          for (const s of series) {
            const res = simulateDca(id, u.bars[s], sigs[s]!, p, dcaOpt.dca, active, cost, cooldown);
            for (const tr of res.trades) trades.push(tr);
            if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
          }
          out.push(atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, [], pending)));
          done++;
          yield { done, total };
        }
      }
      if (dcaOpt.axis) {
        const ax0 = dcaOpt.axis;
        // every Axis set: range type × ladder depth (managed exits), each its own tape; fixed exits: per protect
        const variants =
          ax0.exits === "fixed"
            ? dcaOpt.protects.map((p0) => ({ p0, ax: ax0, tag: "" }))
            : (ax0.ranges?.length ? ax0.ranges : [ax0.range ?? "atr"]).flatMap((range) =>
                (ax0.levelsSet?.length ? ax0.levelsSet : [ax0.levels]).map((levels) => ({
                  p0: dcaOpt.protects[0],
                  ax: { ...ax0, range, levels },
                  tag: `|ax-${range}${levels}`,
                })),
              );
        for (const { p0, ax, tag } of variants) {
          const p = adj(c.bot, c.ind, "axis", laneProtect(p0, c.ind));
          const id = configId(c.bot, c.ind, p, "axis").replace(/\|axis$/, `${tag}|axis`);
          if (built.has(id)) {
            done++;
            continue;
          }
          built.add(id);
          const trades: Trade[] = [];
          const pending: ConfigTape["pending"] = [];
          for (const s of series) {
            const k = u.caches[s];
            const res = simulateAxis(
              id,
              u.bars[s],
              sigs[s]!,
              p,
              ax,
              k.ema(
                Math.max(
                  2,
                  Math.round(ax.centerMin ? ax.centerMin / (u.bars[s].tfMin || 1) : ax.center),
                ),
              ),
              k.atr(14),
              cost,
              cooldown,
            );
            for (const tr of res.trades) trades.push(tr);
            if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
          }
          out.push(atFrom(makeTape(id, c.bot, c.ind, p, "axis", syms, trades, [], pending)));
          done++;
          yield { done, total };
        }
      }
    }
  }
  return out;
}

export function buildTapes(
  u: Universe,
  protects: readonly Protect[],
  cost: number,
  dcaOpt?: { protects: readonly Protect[]; dca: DcaConfig; axis?: AxisConfig },
  only?: ReadonlySet<string>,
  tactics?: Tactics | null,
  adjust?: AdjustState | null,
): ConfigTape[] {
  const gen = buildTapesGen(u, protects, cost, dcaOpt, only, tactics, adjust);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/** First index with exitT >= t. */
function lowerBound(a: Float64Array, t: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] < t) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/** Whether a sub-strategy may execute at all under the toggles (Block may still veto per trade). */
export function kindExecutable(kind: StratKind, tg: StrategyToggles): boolean {
  switch (kind) {
    // Normal = the base sets (Normal and Trailing): off, only their Block-adjusted entries execute;
    // DCA / Axis keep running on them. Trailing off = no trailing anywhere.
    case "normal":
      return tg.normal || tg.block;
    case "trailing":
      return tg.trailing && (tg.normal || tg.block);
    case "dca":
      return tg.dca && !tg.dcaActive;
    case "dca-active":
      return tg.dca && tg.dcaActive;
    case "axis":
      return tg.axis !== false;
  }
}

/** Block level from the config's own closes before `entryT`: independent last-n windows, n = 1..maxLevel. */
export function blockLevel(tp: ConfigTape, entryT: number, b: BlockConfig): number {
  const end = lowerBound(tp.exitT, entryT + 1);
  let level = 0;
  let sum = 0;
  for (let n = 1; n <= b.maxLevel && n <= end; n++) {
    sum += tp.r[end - n];
    if (sum > 0) level++;
  }
  return level;
}

export interface StepLog {
  t: number;
  main: number;
  real: string[];
  taken: number;
  skipped: number;
  net: number;
}

export interface WalkForwardResult {
  startT: number;
  endT: number;
  opts: Omit<WalkForwardOptions, "protects" | "dcaProtects">;
  trades: Trade[];
  stats: Stats;
  hourly: Array<{ t: number; net: number; n: number; pf: number }>;
  /** PF per consecutive 8h block: stability view */
  blocks: Array<{ t: number; n: number; pf: number; net: number }>;
  steps: StepLog[];
  byConfig: Array<{ id: string; n: number; net: number; pf: number }>;
  byKind: Record<string, { n: number; net: number; pf: number }>;
  skips: Record<string, number>;
  stable: boolean;
  /**
   * Block feed: every Real-stage candidate position (taken or not) with its simulated unit result, by exit time.
   * The overall / symbol / direction / indication Block sources judge this, like the config level judges its tape.
   */
  feed: BlockFeedEntry[];
}

export interface BlockFeedEntry {
  exitT: number;
  sym: string;
  side: number;
  kind: string;
  r: number;
  /** lane indication of the candidate (signals guard) */
  ind?: string;
  /** sub-strategy of the candidate (normal / trailing / …) */
  type?: string;
  /** config id of the candidate (signals guard: each config judged on its own) */
  cfg?: string;
}

/** Feed one closed candidate into the Block book and, for a signal, into the signal guard. */
export function feedBooks(e: BlockFeedEntry, book: BlockBook | null, guard?: SignalGuard | null) {
  book?.add(e);
  if (guard && e.ind && isSignalInd(e.ind))
    guard.add(guardKey(e.ind, e.sym, e.side, e.type ?? "normal"), e.r);
}

export interface Selection {
  id: string;
  score: number;
  window: { n: number; net: number; pf: number; ddt: number };
}

/** Lower confidence bound (≈ 1σ) of the summed return over [a, b): mean·n − sd·√n, in percent. */
function lcbFast(tp: ConfigTape, a: number, b: number): number {
  const n = b - a;
  if (n < 2) return 0;
  const s = tp.rs[b] - tp.rs[a];
  const s2 = tp.r2[b] - tp.r2[a];
  const m = s / n;
  const sd = Math.sqrt(Math.max(0, (s2 - n * m * m) / (n - 1)));
  return (m * n - sd * Math.sqrt(n)) * 100;
}

/**
 * Main + Real selection at time t (only trades closed before t count).
 * Main: long window passes PF/DDT (DDT limit scales per 72h) and the pair is parameter-robust.
 * Real: still working over the pre-historic window (PF >= neutral, net >= 0; < 3 closes = quiet, allowed)
 *       and executable under the toggles. Best variant per pair, top `portfolio` by rank.
 */
/** Real seats per family: `portfolio`, 0 = no limit. */
const seatsOf = (o: Pick<WalkForwardOptions, "portfolio">) =>
  o.portfolio > 0 ? o.portfolio : Infinity;

/** Strategy family of a sub-strategy: base (Normal / Trailing), DCA (both variants), Axis. */
export const familyOf = (kind: string) =>
  kind === "axis" ? "axis" : kind === "dca" || kind === "dca-active" ? "dca" : "base";

/** Seat key of a tape: its pair, per family when every family has its own seats. */
const seatKey = (tp: ConfigTape, o: Pick<WalkForwardOptions, "familySeats">) =>
  o.familySeats ? `${tp.bot}|${tp.ind}|${familyOf(tp.kind)}` : `${tp.bot}|${tp.ind}`;
const famOfKey = (pair: string) => pair.split("|")[2] ?? "base";

/**
 * Additional strategies (DCA, Axis) must beat the base: a candidate of another family stays only when its window
 * PF is at least the best base-family (Normal / Trailing) PF of the same pair in that window.
 */
function beatsBase<T extends { pair: string; window: { pf: number } }>(
  xs: T[],
  basePf: ReadonlyMap<string, number>,
  o: Pick<WalkForwardOptions, "familySeats" | "familyNeedsBase">,
): T[] {
  if (!o.familySeats) return xs;
  return xs.filter((c) => {
    const f = famOfKey(c.pair);
    if (f === "base") return true;
    const b = basePf.get(c.pair.split("|").slice(0, 2).join("|"));
    // no base to beat in the window: rejected (unless the gate is relaxed) — nothing shows DCA / Axis improve it
    if (b === undefined) return o.familyNeedsBase === false;
    return c.window.pf >= b;
  });
}
const noteBase = (m: Map<string, number>, tp: ConfigTape, w: { n: number; pf: number }) => {
  if (w.n < 3 || familyOf(tp.kind) !== "base") return;
  const k = `${tp.bot}|${tp.ind}`;
  m.set(k, Math.max(m.get(k) ?? -Infinity, w.pf));
};

/** pickByLane per strategy family (each with `seats` of its own) when family seats are on. */
function pickSeats(
  cands: ReadonlyArray<Selection & { pair: string }>,
  seats: number,
  picks: Array<Selection & { pair?: string }>,
  pairs: Set<string>,
  o: Pick<WalkForwardOptions, "familySeats" | "laneSeats">,
): Selection[] {
  const ls = o.laneSeats ?? 0;
  if (!o.familySeats) return pickByLane(cands, seats, picks, pairs, ls);
  const fams = new Map<string, Array<Selection & { pair: string }>>();
  for (const c of cands) {
    const f = famOfKey(c.pair);
    let xs = fams.get(f);
    if (!xs) fams.set(f, (xs = []));
    xs.push(c);
  }
  const held = new Map<string, Selection[]>();
  for (const p of picks) {
    const f = famOfKey(p.pair ?? "");
    let xs = held.get(f);
    if (!xs) held.set(f, (xs = []));
    xs.push(p);
  }
  const out: Selection[] = [];
  for (const f of ["base", "dca", "axis"])
    out.push(...pickByLane(fams.get(f) ?? [], seats, held.get(f) ?? [], pairs, ls));
  return out;
}

/**
 * Real seats with a share per timeframe lane: `picks` (held) first, then floor(free / lanes) of each lane's best
 * candidates, then the best remaining — one config per bot × indication pair. Without it the slower lanes
 * (longer history, bigger windows, higher scores) take every seat and the fast lanes never trade.
 */
function pickByLane(
  cands: ReadonlyArray<Selection & { pair: string }>,
  seats0: number,
  picks: Selection[],
  pairs: Set<string>,
  /** minimum seats per lane group (short lanes get more than a sliver of the portfolio) */
  laneSeats = 0,
): Selection[] {
  const byLane = new Map<string, Array<Selection & { pair: string }>>();
  for (const c of cands) {
    const ind = c.pair.split("|")[1] ?? "";
    const l = laneOf(ind);
    // signals are a share of their own (they compete with each other, not with the engine's lanes)
    const k = isSignalInd(ind)
      ? "signal"
      : l.tf === null
        ? "plain"
        : `${l.tf}${l.combined ? "c" : ""}`;
    let xs = byLane.get(k);
    if (!xs) byLane.set(k, (xs = []));
    xs.push(c);
  }
  const seats = Math.max(seats0, laneSeats * byLane.size);
  const free = seats - picks.length;
  if (free <= 0) return picks;
  const quota = byLane.size > 1 ? Math.max(laneSeats, Math.floor(free / byLane.size)) : free;
  const take = (c: Selection & { pair: string }) => {
    if (picks.length >= seats || pairs.has(c.pair)) return;
    pairs.add(c.pair);
    picks.push(c);
  };
  if (quota > 0)
    for (const xs of byLane.values()) {
      let n = 0;
      for (const c of [...xs].sort((x, y) => y.score - x.score)) {
        if (n >= quota) break;
        if (pairs.has(c.pair)) continue;
        take(c);
        n++;
      }
    }
  for (const c of [...cands].sort((x, y) => y.score - x.score)) take(c);
  return picks;
}

export function selectAt(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): { picks: Selection[]; eligible: number } {
  const longH = Math.max(o.longH, o.preH);
  const fromLong = t - longH * H;
  const fromPre = t - o.preH * H;
  const minLong = Math.max(8, o.gates.minTrades);
  const ddtMax = (o.gates.maxDdtH * longH) / 72;
  const pairTotal = new Map<string, number>();
  const pairOk = new Map<string, number>();
  const basePf = new Map<string, number>();
  const cand: Array<Selection & { pair: string }> = [];
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  for (const tp of tapes) {
    if (botOk && !botOk.has(tp.bot)) continue;
    const a = lowerBound(tp.exitT, fromLong);
    const b = lowerBound(tp.exitT, t);
    if (b - a < minLong) continue;
    const pair = seatKey(tp, o);
    pairTotal.set(pair, (pairTotal.get(pair) ?? 0) + 1);
    const w = win(tp, a, b);
    noteBase(basePf, tp, w);
    if (w.net <= 0 || w.pf < o.gates.minPf) continue;
    const ddt = winDdt(tp, a, b, t);
    if (ddt > ddtMax) continue;
    pairOk.set(pair, (pairOk.get(pair) ?? 0) + 1);
    if (!kindExecutable(tp.kind, o.toggles)) continue;
    const pa = lowerBound(tp.exitT, fromPre);
    const pre = win(tp, pa, b);
    if (o.preGate && pre.n >= 3 && (pre.pf < PF_NEUTRAL || pre.net < 0)) continue;
    const score =
      o.rank === "lcb"
        ? lcbFast(tp, a, b)
        : o.rank === "net"
          ? w.net
          : scoreStats(statsOf(tapeTrades(tp, a, b), t), minLong);
    if (!(score > 0)) continue;
    cand.push({ id: tp.id, score, window: { ...w, ddt }, pair });
  }
  const robust = (pair: string) =>
    (pairOk.get(pair) ?? 0) / Math.max(1, pairTotal.get(pair) ?? 0) >= o.robustFrac;
  const scored = beatsBase(
    cand.filter((c) => robust(c.pair)),
    basePf,
    o,
  ).sort((x, y) => y.score - x.score);
  const picks = pickSeats(scored, seatsOf(o), [], new Set<string>(), o).map((x) => ({
    id: x.id,
    score: x.score,
    window: x.window,
  }));
  return { picks, eligible: scored.length };
}

/** Durable winners at t: consistent across sub-windows of the long window. */
export function selectDurable(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
  held: ReadonlySet<string>,
): { picks: Selection[]; eligible: number } {
  const longH = Math.max(o.longH, o.preH);
  const from0 = t - longH * H;
  const minLong = Math.max(8, o.gates.minTrades);
  const k = Math.max(2, o.durableSplits);
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  const keep: Array<Selection & { pair: string }> = [];
  const cand0: Array<Selection & { pair: string }> = [];
  const basePf = new Map<string, number>();
  for (const tp of tapes) {
    if (botOk && !botOk.has(tp.bot)) continue;
    if (!kindExecutable(tp.kind, o.toggles)) continue;
    // the window a tape can be judged on: the long window, clipped to where its lane's data begins (at least
    // the pre-calc window, so a lane with too little history is not judged on a sliver)
    const from = Math.min(t - o.preH * H, Math.max(from0, tp.fromT ?? from0));
    const span = (t - from) / k;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    const w = win(tp, a, b);
    const pair = seatKey(tp, o);
    noteBase(basePf, tp, w);
    if (held.has(tp.id)) {
      // sticky: stay while the long window still pays (PF >= neutral)
      if (w.n >= 3 && w.pf >= PF_NEUTRAL && w.net > 0)
        keep.push({ id: tp.id, score: w.net, window: { ...w, ddt: 0 }, pair });
      continue;
    }
    if (w.n < minLong || w.net <= 0 || w.pf < o.gates.minPf) continue;
    let pos = 0;
    for (let i = 0; i < k; i++) {
      const sa = lowerBound(tp.exitT, from + i * span);
      const sb = lowerBound(tp.exitT, from + (i + 1) * span);
      if (sb > sa && tp.rs[sb] - tp.rs[sa] > 0) pos++;
    }
    if (pos / k < o.durableFrac) continue;
    if (o.preGate) {
      const pre = win(tp, lowerBound(tp.exitT, t - o.preH * H), b);
      if (pre.n >= 3 && (pre.pf < PF_NEUTRAL || pre.net < 0)) continue;
    }
    cand0.push({ id: tp.id, score: lcbFast(tp, a, b), window: { ...w, ddt: 0 }, pair });
  }
  const cand = beatsBase(cand0, basePf, o);
  const pairs = new Set<string>();
  const picks: Array<Selection & { pair: string }> = [];
  const perFam = new Map<string, number>();
  for (const s of keep.sort((x, y) => y.score - x.score)) {
    const f = o.familySeats ? famOfKey(s.pair) : "all";
    if (pairs.has(s.pair) || (perFam.get(f) ?? 0) >= seatsOf(o)) continue;
    pairs.add(s.pair);
    perFam.set(f, (perFam.get(f) ?? 0) + 1);
    picks.push(s);
  }
  const out = pickSeats(cand, seatsOf(o), picks, pairs, o);
  return {
    picks: out.map((x) => ({ id: x.id, score: x.score, window: x.window })),
    eligible: keep.length + cand.length,
  };
}

/**
 * Fixed set: every focus pair trades continuously (no PF / durability gate — the set was validated offline, see
 * the research presets). Per pair the protect × sub-strategy with the best lower-confidence score over the long
 * window is used; last-N, Block and the caps still apply at execution.
 */
export function selectFixed(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): { picks: Selection[]; eligible: number } {
  const from = t - Math.max(o.longH, o.preH) * H;
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  const best = new Map<string, Selection>();
  const basePf = new Map<string, number>();
  for (const tp of tapes) {
    if (botOk && !botOk.has(tp.bot)) continue;
    if (!kindExecutable(tp.kind, o.toggles)) continue;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    const w = win(tp, a, b);
    const score = w.n >= 3 ? lcbFast(tp, a, b) : -1e9;
    const pair = seatKey(tp, o);
    noteBase(basePf, tp, w);
    const cur = best.get(pair);
    if (!cur || score > cur.score) best.set(pair, { id: tp.id, score, window: { ...w, ddt: 0 } });
  }
  const ok = new Set(
    beatsBase(
      [...best.entries()].map(([pair, v]) => ({ pair, window: v.window })),
      basePf,
      o,
    ).map((x) => x.pair),
  );
  const perFam = new Map<string, number>();
  const picks = [...best.entries()]
    .filter(([pair]) => ok.has(pair))
    .sort((x, y) => y[1].score - x[1].score)
    .filter(([pair]) => {
      const f = o.familySeats ? famOfKey(pair) : "all";
      const n = perFam.get(f) ?? 0;
      perFam.set(f, n + 1);
      return n < seatsOf(o);
    })
    .map(([, v]) => v);
  return { picks, eligible: best.size };
}

function lastNOk(tp: ConfigTape, entryT: number, n: number, minPf: number): boolean {
  if (n <= 0) return true;
  const b = lowerBound(tp.exitT, entryT + 1); // closed at or before entry
  if (b < n) return false;
  return profitFactor(tp.gp[b] - tp.gp[b - n], tp.gl[b] - tp.gl[b - n]) >= minPf;
}

export type ExecDecision = { ok: true; level: number; vol: number } | { ok: false; why: string };

/** Indication type of a tape (Block "indication" source). */
export const kindOfInd = (ind: string) => INDICATION_BY_ID.get(laneOf(ind).base)?.kind ?? "none";

/** Block book entry of a position: its unit result (without the Block multiplier, like the config level). */
export const blockEntryOf = (x: Trade) => ({
  sym: x.sym,
  side: x.side,
  kind: kindOfInd(x.cfg.split("|")[1] ?? ""),
  r: x.r / (x.mult || 1),
  ind: x.cfg.split("|")[1] ?? "",
  type: x.kind ?? "normal",
  cfg: x.cfg,
});

/** Real-stage execution rules for one candidate entry (toggles, last-N, Block / Block Active). */

export function execDecision(
  tp: ConfigTape,
  entryT: number,
  o: WalkForwardOptions,
  ctx?: { book?: BlockBook | null; guard?: SignalGuard | null; sym: string; side: number },
): ExecDecision {
  const tg = o.toggles;
  if (!kindExecutable(tp.kind, tg)) return { ok: false, why: "toggle" };
  // signals: only the active ones (source × lane × symbol) trade, and a config set of source × symbol ×
  // direction × type whose last N closed results average below zero is disabled
  if (ctx && isSignalInd(tp.ind)) {
    if (o.signalActive && !o.signalActive.has(`${tp.bot}|${tp.ind}|${ctx.sym}`))
      return { ok: false, why: "signalInactive" };
    if (
      o.signalGuardN &&
      ctx.guard?.disabled(guardKey(tp.id, ctx.sym, ctx.side, tp.kind), o.signalGuardN)
    )
      return { ok: false, why: "signalGuard" };
  }
  if (o.paused?.size && o.paused.has(setKeyOf(tp.id))) return { ok: false, why: "adjustPause" };
  if (!lastNOk(tp, entryT, o.lastN, o.lastNMinPf)) return { ok: false, why: "lastN" };
  const level = tg.block
    ? combineLevels(
        {
          config: blockLevel(tp, entryT, o.block),
          ...bookLevels(
            ctx?.book,
            { sym: ctx?.sym ?? "", side: ctx?.side ?? 0, kind: kindOfInd(tp.ind), type: tp.kind },
            o.block.maxLevel,
          ),
        },
        o.block,
      )
    : 0;
  // Block-adjusted: Block raises the volume from level 1, or (Block Active) only from its minimum level
  const adjusted = tg.block && level >= (tg.blockActive ? Math.max(1, o.block.minActiveLevel) : 1);
  // Normal = the unadjusted base (Normal and Trailing at volume 1): off, only Block-adjusted base entries
  // execute; DCA / Axis always run (with Block volume when adjusted)
  if ((tp.kind === "normal" || tp.kind === "trailing") && !tg.normal && !adjusted)
    return { ok: false, why: "normalOff" };
  if (!adjusted) return { ok: true, level: 0, vol: 1 };
  // the Block stack is capped (maxMult, never above 8×)
  const vol = Math.min(Math.min(8, o.block.maxMult), 1 + o.block.ratio * level);
  return { ok: true, level, vol };
}

/** Synchronous wrapper (CLI / tests). The runtime drives walkForwardGen so it can yield between hours. */
export function walkForward(
  u: Universe,
  tapes: readonly ConfigTape[],
  o: WalkForwardOptions,
): WalkForwardResult {
  const gen = walkForwardGen(u, tapes, o);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

const sigCfgMemo = new Map<string, boolean>();
/** Whether a config id ("bot|ind|…") is a signal config (memoised: called per open order per candidate). */
export function sigCfg(cfg: string): boolean {
  let v = sigCfgMemo.get(cfg);
  if (v === undefined) {
    v = isSignalInd(cfg.split("|")[1] ?? "");
    if (sigCfgMemo.size > 200_000) sigCfgMemo.clear();
    sigCfgMemo.set(cfg, v);
  }
  return v;
}

/** Order caps for engine orders, or for signal orders (their own budget); 0 / unset = no limit. */
export function capsOf(
  o: Pick<
    WalkForwardOptions,
    "maxPerSymbol" | "maxOpen" | "maxPerSide" | "signalPerSymbol" | "signalMaxOpen"
  >,
  signal: boolean,
): { perSymbol: number; maxOpen: number; perSide: number } {
  const lim = (x: number | undefined) => (x && x > 0 ? x : Infinity);
  if (!signal)
    return { perSymbol: lim(o.maxPerSymbol), maxOpen: lim(o.maxOpen), perSide: lim(o.maxPerSide) };
  const maxOpen = lim(o.signalMaxOpen);
  return { perSymbol: lim(o.signalPerSymbol), maxOpen, perSide: maxOpen };
}

/**
 * Engine tapes (selected into Real seats) and signal tapes (every config of an active signal runs on its own;
 * none when signals are off).
 */
export function splitSignalTapes(
  tapes: readonly ConfigTape[],
  o: Pick<WalkForwardOptions, "signalActive">,
): { engine: readonly ConfigTape[]; signal: ConfigTape[] } {
  if (!tapes.some((t) => isSignalInd(t.ind))) return { engine: tapes, signal: [] };
  const pairs = new Set([...(o.signalActive ?? [])].map((k) => k.split("|").slice(0, 2).join("|")));
  return {
    engine: tapes.filter((t) => !isSignalInd(t.ind)),
    signal: o.signalActive
      ? tapes.filter((t) => isSignalInd(t.ind) && pairs.has(`${t.bot}|${t.ind}`))
      : [],
  };
}

export function* walkForwardGen(
  u: Universe,
  tapes: readonly ConfigTape[],
  o: WalkForwardOptions,
): Generator<number, WalkForwardResult> {
  const byId = new Map(tapes.map((t) => [t.id, t]));
  // signals: not selected into seats; every config of an active signal is a candidate on its own symbol and
  // direction (the Real gate checks active + guard per config × symbol × direction)
  const { engine: selTapes, signal: sigTapes } = splitSignalTapes(tapes, o);
  const endT = u.nowT;
  const startT = o.startT ?? Math.floor((endT - o.simH * H) / H) * H;
  // without an explicit start the run reaches the newest bar (the last partial hour included)
  const stopT = o.startT === undefined ? endT : Math.min(endT, startT + o.simH * H);
  const steps: StepLog[] = [];
  const trades: Trade[] = [];
  const open: Trade[] = []; // taken, sorted by exit
  const hourNet = new Map<number, number>();
  const skips: Record<string, number> = {};
  const skip = (why: string) => (skips[why] = (skips[why] ?? 0) + 1);
  // Block sources: every Real candidate's simulated result, entered into the book when it closes (causal)
  const book = new BlockBook();
  const guard = new SignalGuard();
  const feed: BlockFeedEntry[] = [];
  const vopen: BlockFeedEntry[] = []; // candidates not closed yet, sorted by exit
  const seen = new Set<string>();
  const settle = (t: number) => {
    while (vopen.length && vopen[0].exitT <= t) feedBooks(vopen.shift()!, book, guard);
    while (open.length && open[0].exitT <= t) {
      const x = open.shift()!;
      const k = Math.floor(x.exitT / H);
      hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
    }
  };

  const sigCands: Array<{ tr: Trade; tp: ConfigTape }> = [];
  for (const tp of sigTapes)
    for (let i = 0; i < tp.n; i++) {
      const e = tp.entryT[i];
      if (e < startT || e >= stopT) continue;
      const tr = tradeAt(tp, i);
      if (!o.signalActive || o.signalActive.has(`${tp.bot}|${tp.ind}|${tr.sym}`))
        sigCands.push({ tr, tp });
    }
  sigCands.sort((a, b) => a.tr.entryT - b.tr.entryT);
  let sp = 0;
  let held = new Set<string>();
  // re-evaluating more often than one bar cannot change anything: the step is at least one bar
  const barH = (u.baseTf ?? u.bars[0]?.tfMin ?? 60) / 60;
  const stepH = Math.max(o.stepH, barH);
  for (let t = startT; t < stopT; t += stepH * H) {
    const { picks, eligible } =
      o.mode === "durable"
        ? selectDurable(selTapes, t, o, held)
        : o.mode === "fixed"
          ? selectFixed(selTapes, t, o)
          : selectAt(selTapes, t, o);
    held = new Set(picks.map((p) => p.id));
    const cands: Array<{ tr: Trade; tp: ConfigTape }> = [];
    for (const p of picks) {
      const tp = byId.get(p.id)!;
      for (let i = 0; i < tp.n; i++) {
        const e = tp.entryT[i];
        if (e >= t && e < t + stepH * H && e < stopT) cands.push({ tr: tradeAt(tp, i), tp });
      }
    }
    while (sp < sigCands.length && sigCands[sp].tr.entryT < t + stepH * H)
      cands.push(sigCands[sp++]);
    cands.sort((a, b) => a.tr.entryT - b.tr.entryT || a.tr.cfg.localeCompare(b.tr.cfg));
    let taken = 0;
    let skipped = 0;
    let net = 0;
    for (const { tr, tp } of cands) {
      settle(tr.entryT);
      // the candidate's own result feeds the Block sources when it closes, whether it executes or not
      const fk = `${tr.cfg}|${tr.sym}|${tr.entryT}`;
      if (!seen.has(fk)) {
        seen.add(fk);
        const fe = blockEntryOf(tr);
        const fx: BlockFeedEntry = { exitT: tr.exitT, ...fe };
        feed.push(fx);
        let j = vopen.length;
        vopen.push(fx);
        while (j > 0 && vopen[j - 1].exitT > fx.exitT) {
          vopen[j] = vopen[j - 1];
          j--;
        }
        vopen[j] = fx;
      }
      const hourKey = Math.floor(tr.entryT / H);
      let why = "";
      // engine orders and signal orders are capped each on their own (same class only)
      const cls = sigCfg(tr.cfg);
      const caps = capsOf(o, cls);
      if (o.guardPct > 0 && (hourNet.get(hourKey) ?? 0) <= -o.guardPct) why = "hourGuard";
      else if (open.some((x) => x.sym === tr.sym && x.cfg === tr.cfg)) why = "dupe";
      else if (
        open.reduce((a, x) => a + (x.sym === tr.sym && sigCfg(x.cfg) === cls ? 1 : 0), 0) >=
        caps.perSymbol
      )
        why = "perSymbol";
      else if (open.reduce((a, x) => a + (sigCfg(x.cfg) === cls ? 1 : 0), 0) >= caps.maxOpen)
        why = "maxOpen";
      else if (
        open.reduce((a, x) => a + (x.side === tr.side && sigCfg(x.cfg) === cls ? 1 : 0), 0) >=
        caps.perSide
      )
        why = "perSide";
      else if (
        o.maxPositions &&
        !open.some((x) => x.sym === tr.sym && x.side === tr.side) &&
        new Set(open.map((x) => `${x.sym}|${x.side}`)).size >= o.maxPositions
      )
        why = "maxPositions";
      const dec = why
        ? null
        : execDecision(tp, tr.entryT, o, { book, guard, sym: tr.sym, side: tr.side });
      if (dec && !dec.ok) why = dec.why;
      if (why || !dec || !dec.ok) {
        skipped++;
        skip(why);
        continue;
      }
      const x: Trade = {
        ...tr,
        r: tr.r * dec.vol,
        vol: (tr.vol ?? 1) * dec.vol,
        mult: dec.vol,
        level: tp.kind.startsWith("dca") || tp.kind === "axis" ? tr.level : dec.level,
      };
      trades.push(x);
      taken++;
      net += x.r * 100;
      let j = open.length;
      open.push(x);
      while (j > 0 && open[j - 1].exitT > x.exitT) {
        open[j] = open[j - 1];
        j--;
      }
      open[j] = x;
    }
    steps.push({ t, main: eligible, real: picks.map((p) => p.id), taken, skipped, net });
    yield t;
  }

  trades.sort((a, b) => a.exitT - b.exitT);
  const stats = statsOf(trades, stopT);
  const hn = hourlyNet(trades);
  const perHour = new Map<number, { gp: number; gl: number }>();
  for (const x of trades) {
    const k = Math.floor((x.exitT - 1) / H) * H;
    const e = perHour.get(k) ?? { gp: 0, gl: 0 };
    if (x.r > 0) e.gp += x.r;
    else e.gl -= x.r;
    perHour.set(k, e);
  }
  const hourly = [...hn.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, e]) => ({
      t,
      net: e.net,
      n: e.n,
      pf: profitFactor(perHour.get(t)?.gp ?? 0, perHour.get(t)?.gl ?? 0),
    }));
  const blockH = 8;
  const blocks: WalkForwardResult["blocks"] = [];
  for (let b = startT; b < stopT; b += blockH * H) {
    const s = statsOf(trades.filter((x) => x.exitT >= b && x.exitT < b + blockH * H));
    blocks.push({ t: b, n: s.n, pf: s.pf, net: s.net });
  }
  const group = (key: (t: Trade) => string) => {
    const m = new Map<string, Trade[]>();
    for (const tr of trades) {
      const k = key(tr);
      (m.get(k) ?? m.set(k, []).get(k)!).push(tr);
    }
    return m;
  };
  const byConfig = [...group((t) => t.cfg).entries()]
    .map(([id, xs]) => {
      const s = statsOf(xs);
      return { id, n: s.n, net: s.net, pf: s.pf };
    })
    .sort((a, b) => b.net - a.net);
  const byKind: WalkForwardResult["byKind"] = {};
  for (const [k, xs] of group((t) => t.kind ?? "normal")) {
    const s = statsOf(xs);
    byKind[k] = { n: s.n, net: s.net, pf: s.pf };
  }
  const activeBlocks = blocks.filter((b) => b.n >= 3);
  const stable =
    stats.pf >= o.gates.minPf &&
    stats.net > 0 &&
    activeBlocks.every((b) => b.pf >= PF_NEUTRAL * 0.9);
  const { protects: _p, dcaProtects: _d, ...rest } = o;
  return {
    startT,
    endT: stopT,
    opts: rest,
    trades,
    stats,
    hourly,
    blocks,
    steps,
    byConfig,
    byKind,
    skips,
    stable,
    feed: feed.sort((a, b) => a.exitT - b.exitT),
  };
}
