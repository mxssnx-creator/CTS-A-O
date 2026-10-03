import {
  coordVariants,
  forEachCoord,
  forEachMicro,
  plusVariants,
  RANGE_TAGS,
  rangeGateOf,
  minPfOf,
  rangeGated,
  type CoordTag,
} from "../minimal-coord.ts";
import type { RangeTag } from "../domain/types.ts";
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
import type { SymStat, Universe } from "../pipeline/pipeline.ts";
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
  Bars,
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
import type { SeriesCache } from "../indications/cache.ts";
import { hourlyNet, profitFactor, scoreStats, statsOf } from "../metrics/stats.ts";
import { ATR_PERIOD, simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";
import { adjustProtect, setKeyOf, type AdjustState } from "../adjust.ts";
import { BlockBook, blockBookOf, blockDecide, bookLevels, sourceKey, type BlockSource } from "./block.ts";
import { S2Coord } from "./s2coord.ts";
import { INDICATION_BY_ID, isSignalInd, laneOf, signalSourceOf } from "../indications/registry.ts";
import { isMicroInd } from "../indications/micro.ts";
import { acceptKey, activeSignals, guardKey, SignalGuard } from "../signals.ts";
import type {
  SignalAccept,
  SignalClusterSettings,
  SignalSettings,
  SignalSourceGate,
} from "../signal-config.ts";

const H = 3_600_000;

/**
 * Coordination tactics: portfolio-level rules on the realized results of the executed orders (causal: only orders
 * closed before an entry count) and on the positions open at that moment. Each can be switched on or off.
 */
export interface CoordSettings {
  enabled: boolean;
  /** hour profit lock: no new entries for the rest of a clock hour once its realized Σ trade % reaches this (0 = off) */
  hourLock: number;
  /** after a clock hour that closed negative: "signals" = no signal entries, "all" = no entries, "off" */
  cooldown: "off" | "signals" | "all";
  /** no entry against a position open on the same symbol in the other direction */
  conflict: boolean;
  /** a signal enters only while an engine position is open on its symbol in its direction */
  confirm: boolean;
  /** Stable-02 last-N windows: a symbol whose last window lost (or PF < 1) takes no entries for its next N closes */
  s2Windows?: boolean;
  /** window length (steps). Default 6. */
  s2Steps?: number;
  /** pause length in closes. Default: the window length. */
  s2Pause?: number;
  /** volume added per passing relation. Default 0.4. */
  s2Increase?: number;
  /** Stable-02 relation volume: winning relations add volume (0.4 each, ≤ 1.8×), re-evaluated every 2 h */
  s2RelVolume?: boolean;
  /**
   * negative-hour hedge: signals whose own results were positive in the past hours the executed book lost trade
   * (without confirmation) while the book is losing — the current or the previous hour negative
   */
  hedge?: boolean;
  /** hedge selection: PF of a signal in the book's losing hours (default 1.3) and results needed (default 5) */
  hedgeMinPf?: number;
  hedgeMinN?: number;
  /** hedge only after a losing previous hour (default false: also while the current hour is negative) */
  hedgePrevOnly?: boolean;
}

// causal validation, 8 days × 12 symbols (docs/signals-validation.md): confirmation PF 1.32 → 1.58, drawdown halved;
// the hour lock and the cooldown cost net on every variant; opposite-entry blocking mixed
export const DEFAULT_COORD: CoordSettings = {
  enabled: true,
  hourLock: 0,
  cooldown: "off",
  conflict: false,
  confirm: true,
};

/** strict negative-hour hedge selection (the loose PF 1.3 / 5 lost on 8 days, docs/signals-validation.md) */
export const HEDGE_DEFAULTS = { minPf: 2, minN: 10 } as const;
const numOr = (v: unknown, d: number, lo: number, hi: number) =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v))
    ? d
    : Math.min(hi, Math.max(lo, Number(v)));

export function coordSettings(c?: Partial<CoordSettings> | null): CoordSettings {
  const hl = Number(c?.hourLock);
  return {
    enabled: c?.enabled !== false,
    hourLock: Number.isFinite(hl) ? Math.min(100, Math.max(0, hl)) : DEFAULT_COORD.hourLock,
    cooldown:
      c?.cooldown === "signals" || c?.cooldown === "all" || c?.cooldown === "off"
        ? c.cooldown
        : DEFAULT_COORD.cooldown,
    conflict: c?.conflict === undefined ? DEFAULT_COORD.conflict : Boolean(c.conflict),
    confirm: c?.confirm === undefined ? DEFAULT_COORD.confirm : Boolean(c.confirm),
    s2Windows: c?.s2Windows === true,
    s2Steps: c?.s2Steps,
    s2Pause: c?.s2Pause,
    s2Increase: c?.s2Increase,
    s2RelVolume: c?.s2RelVolume === true,
    hedge: c?.hedge === true,
    hedgeMinPf: numOr(c?.hedgeMinPf, HEDGE_DEFAULTS.minPf, 1, 5),
    hedgeMinN: numOr(c?.hedgeMinN, HEDGE_DEFAULTS.minN, 1, 100),
    hedgePrevOnly: c?.hedgePrevOnly === true,
  };
}

/**
 * The coordination verdict for one entry (null = allowed). `hourNet` = realized Σ trade % per clock hour of the
 * executed orders closed so far; `open` = executed orders open at the entry.
 */
export function coordBlock(
  c: CoordSettings | undefined,
  tr: { cfg: string; sym: string; side: number; entryT: number },
  hourNet: ReadonlyMap<number, number>,
  open: ReadonlyArray<{ cfg: string; sym: string; side: number }>,
): string | null {
  if (!c?.enabled) return null;
  const hk = Math.floor(tr.entryT / H);
  const signal = sigCfg(tr.cfg);
  if (c.hourLock > 0 && (hourNet.get(hk) ?? 0) >= c.hourLock) return "hourLock";
  if (c.cooldown !== "off" && (hourNet.get(hk - 1) ?? 0) < 0 && (c.cooldown === "all" || signal))
    return "cooldown";
  if (c.conflict && open.some((x) => x.sym === tr.sym && x.side !== tr.side)) return "conflict";
  if (
    c.confirm &&
    signal &&
    !open.some((x) => x.sym === tr.sym && x.side === tr.side && !sigCfg(x.cfg))
  )
    return "confirm";
  return null;
}

export interface WalkForwardOptions {
  preH: number;
  simH: number;
  stepH: number;
  /** simulation start; default = end - simH */
  startT?: number;
  portfolio: number;
  /**
   * fixed selection: how seats are ranked (the order `portfolio` keeps and the live top-config fill uses).
   * score (default): lower-confidence bound × (0.5 + hourly success); green: hourly success first (the share of a
   * config's exit-hours that ended positive), the lower-confidence bound only breaking ties
   */
  rankBy?: "score" | "green";
  /** Real / Live execution: last this-many closes must clear min PF and the DDT gate. 0 = off */
  lastN: number;
  lastNMinPf: number;
  /**
   * Normal on: a Normal / Trailing entry Block does not raise trades at its unit only when the config's own last
   * lastN (25 when off) closes clear this PF (and the DDT / DDR gates); Block Active does not skip it then. Unset =
   * the base trades on the stage gates alone (and Block Active skips it below its level, as before).
   */
  normalBaseMinPf?: number;
  /**
   * Pre-historic validation: last this-many closes must clear min PF and the DDT gate before a config
   * can take a seat (Base / Main / best-set). Additional strategies still pass the stage gates after it.
   * Real and Live check `lastN` again at the entry. 0 = off.
   */
  validLastN?: number;
  /**
   * Signals: the closes their validation and entry last-N look at (instead of validLastN / lastN). A signal config
   * closes ~10 times in a 48 h window, so the engine's 50 / 25 could never pass and signals never traded. Unset =
   * the engine's values.
   */
  signalValidLastN?: number;
  /**
   * Range cells (micro, minimal, short, minimal plus): before a seat, the last `lastN` closes must also clear this
   * higher PF. Causal (only closes before the step). Unset = the ranges pass the same gates as the wide grid.
   */
  rangeGate?: { lastN: number; minPf: number } | null;
  /** each range takes its own seat per pair instead of competing with the wide cells of that pair */
  rangeSeats?: boolean;
  /**
   * Demo probe (never on mainnet): besides the normal picks, the best `perRange` range tapes of each range
   * (micro / minimal / short / plus) by window result are seated even when they fail the gates, and their
   * entries skip the last-N and symbol gates — live fills per range for a test account.
   */
  /**
   * pairs ("bot|ind") that passed the Base gate in the current compute: only they take a seat (a pair held for an
   * open position stays to manage it, but opens nothing new). Unset = no Base restriction (tests, research tools).
   */
  basePassed?: ReadonlySet<string>;
  probe?: {
    perRange: number;
    /**
     * heatmap probe: the best `perCell` tapes of every protect cell (TP × SL × trailing, any range or the wide grid)
     * are seated, also a cell without closes yet (its tape with the most closes) — every cell trades
     */
    perCell?: number;
  } | null;
  maxPerSymbol: number;
  maxOpen: number;
  guardPct: number;
  /** coordination tactics across every order (engine and signals); absent = all off */
  coord?: CoordSettings;
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
  /** best first at the same entry time (default); false = by config id (the former order) */
  bestFirst?: boolean;
  /** DCA / Axis need a base (Normal / Trailing) result on the same pair to beat (default); false = pass when none */
  familyNeedsBase?: boolean;
  /**
   * "config": every config is its own seat — each one that clears its own evaluation trades, independent of the
   * other configs of its pair (TP / SL / trailing variants, strategy types); DCA / Axis are judged on their own
   * results, not against the pair's base. "pair" (default): one config per pair × family (the best scored).
   */
  seatPer?: "pair" | "config";
  /** minimum Real seats per timeframe lane group (validated configs only); the portfolio grows to fit */
  laneSeats?: number;
  /** signals that trade: "bot|ind|sym" (Signals processing); unset = every signal */
  signalActive?: ReadonlySet<string>;
  /**
   * causal signal activation: when set, the active signals are re-ranked at every step from the signal tapes'
   * results closed before it (activeSignals rules on the last longH hours); signalActive is then ignored
   */
  signalRank?: SignalSettings;
  /** source stability gate on the executed signal orders (signals.sourceGate) */
  signalSourceGate?: SignalSourceGate;
  /** signal guard window (last N closed results; 0 = off) */
  signalGuardN?: number;
  /** signal loss-cluster guard (unset / disabled = off) */
  signalCluster?: SignalClusterSettings;
  /** only signal groups (source × symbol × direction × type) with a recent PF above the minimum trade */
  signalAccept?: SignalAccept;
  /** signals' Normal / Trailing trade on their own: Normal off and Block Active's skip do not apply (Block raises) */
  signalOwnBase?: boolean;
  /** signal orders have order caps of their own (per symbol, open); positions (symbol × direction) share maxPositions with the engine */
  signalPerSymbol?: number;
  signalMaxOpen?: number;
  /** max open signal POSITIONS (distinct symbol × direction, long and short counted apart); 0 / unset = no limit */
  signalMaxPositions?: number;
  toggles: StrategyToggles;
  block: BlockConfig;
  dca: DcaConfig;
  gates: Gates;
  /**
   * Real stage, per symbol of the config: closes of that symbol before the entry, inside the lookback.
   * veto — a sample of symMinN that misses min PF or is net-negative does not open.
   * proven — the symbol must already clear min PF (a quiet symbol does not open).
   * *Side — the same, on this direction only. Signals keep their own accept gate. Unset = off.
   */
  symGate?: "veto" | "proven" | "vetoSide" | "provenSide";
  /** closes on that symbol before the symbol gate judges it. Default 2. */
  symMinN?: number;
  /** symbol-gate lookback in hours. Unset = the selection window (max of longH and preH). */
  symH?: number;
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

/** Upper bound on protect variants (wide grid plus the optional short range). Dedup can only make it smaller. */
export function gridVariants(g: ProtectGridSpec): number {
  const hold = g.holdH.length || 1;
  const main = g.tp.length * g.slOfTp.length * g.trailOfTp.length * hold;
  const plus = g.minimalPlus;
  const plusN = plus
    ? plusVariants(plus.enabled === true, plus.cells?.length ?? 0, hold)
    : 0;
  return (
    main +
    coordVariants(hold, g.short) +
    coordVariants(hold, g.minimal) +
    coordVariants(hold, g.general) +
    coordVariants(hold, g.long) +
    coordVariants(hold, g.micro) +
    plusN
  );
}

/** Every protect variant of a grid (hold converted to bars). Each variant is computed independently. */
export function protectGrid(tfMin: number, g: ProtectGridSpec = DEFAULT_GRID): Protect[] {
  const out: Protect[] = [];
  const seen = new Set<string>();
  const push = (p: Protect) => {
    if (p.trail > 0) {
      p.trailStep = g.trailStep ?? 1;
      p.trailFree = g.trailFree ?? false;
    }
    const key = `${p.tp}|${p.sl}|${p.trail}|${p.hold}|${p.tag ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  };
  const cell = (
    tp: number,
    k: number,
    tr: number,
    h: number,
    minSl: number,
    minTrail: number,
    tag?: CoordTag,
  ) => {
    const p: Protect = {
      tp,
      sl: +Math.max(minSl, tp * k).toFixed(4),
      trail: tr > 0 ? +Math.max(minTrail, tp * tr).toFixed(4) : 0,
      hold: Math.max(2, Math.round((h * 60) / tfMin)),
      ...(tag ? { tag } : {}),
    };
    push(p);
  };
  for (const tp of g.tp)
    for (const k of g.slOfTp)
      for (const tr of g.trailOfTp)
        for (const h of g.holdH) cell(tp, k, tr, h, g.minSl, g.minTrail);
  forEachCoord(g, (tp, k, tr, h, minSl, minTrail, tag) => cell(tp, k, tr, h, minSl, minTrail, tag));
  forEachMicro(g, (tp, k, tr, h, minSl, minTrail) => {
    push({
      tp: +tp.toFixed(6),
      sl: +Math.max(minSl, tp * k).toFixed(6),
      trail: tr > 0 ? +Math.max(minTrail, tp * tr).toFixed(6) : 0,
      hold: Math.max(2, Math.round((h * 60) / tfMin)),
      tag: "mc",
    });
  });
  const plus = g.minimalPlus;
  if (plus && plus.enabled === true && plus.cells?.length) {
    for (const c of plus.cells)
      for (const h of g.holdH)
        push({
          tp: c.tp,
          sl: c.sl,
          trail: c.trail,
          hold: Math.max(2, Math.round((h * 60) / tfMin)),
          tag: "mp",
          ...(c.trail > 0 ? { trailStep: g.trailStep ?? 1, trailFree: g.trailFree ?? false } : {}),
        });
  }
  return out;
}

export function dcaProtectGrid(tfMin: number, dca?: Partial<DcaConfig> | null): Protect[] {
  const hold = Math.max(4, Math.round(480 / tfMin));
  // targets: the configured ones, else short adds (4× and 6× the position cost) and two wide ones; the stop a
  // multiple of the target (configured, else 2× for the short adds and 1.5× for the wide ones)
  const tps = dca?.tp?.length ? dca.tp : [0.008, 0.012, 0.026, 0.035];
  return tps.map((tp) => ({
    tp,
    sl: +(tp * (dca?.slOfTp ?? (tp < 0.02 ? 2 : 1.5))).toFixed(4),
    trail: 0,
    hold,
  }));
}

export function defaultWalkForward(s: CoreSettings): WalkForwardOptions {
  return {
    preH: 20,
    simH: 48,
    stepH: 1,
    // Real seats per strategy family: 0 = no limit — every config that passes the evaluation (PF, DDT, DDR,
    // validation) trades (12 windows × 12 symbols: PF 1.223 → 1.226, orders +5 % vs 16 seats; docs/block-sweep.md)
    portfolio: 0,
    lastN: 25,
    lastNMinPf: PF_NEUTRAL,
    // best-set validation: last 50 closes must clear min PF and the DDT gate before a seat
    validLastN: 50,
    // signals validate on their last 10 closes (a signal config's activity in the window), on top of their own
    // acceptance gate (PF over 48 h per source × symbol × side)
    signalValidLastN: 10,
    // range cells: their own, higher last-N gate (grid.rangeGate)
    rangeGate: rangeGateOf(s.grid),
    rangeSeats: s.grid?.rangeSeats === true,
    // unlimited working orders on one symbol (0 = no limit)
    maxPerSymbol: 0,
    maxOpen: 0,
    // hour-loss stop off: with signal confirmation PF 1.49 → 1.63 and drawdown 490 → 442 (8 causal days)
    guardPct: 0,
    coord: {
      ...DEFAULT_COORD,
      s2Steps: s.block?.steps,
      s2Pause: s.block?.pause,
      s2Increase: s.block?.increase,
    },
    longH: 336,
    robustFrac: 0.6,
    rank: "lcb",
    bots: [],
    mode: "fixed",
    durableSplits: 4,
    durableFrac: 0.75,
    preGate: true,
    maxPerSide: 0,
    // positions (symbol × direction): capped — unlimited seats / positions cost PF (6 h, 12 symbols: 1,288 orders
    // PF 1.31 vs 719 orders PF 2.45 capped); 0 = no limit
    maxPositions: 12,
    // family seats: Normal / Trailing, DCA and Axis each take their own seats (independent books) and a DCA / Axis
    // set needs no base to beat — with every config evaluated and unlimited seats the highest PF (12 windows:
    // 1.253 vs 1.226 one seat per pair, net ÷ drawdown 0.52 vs 0.43; docs/block-sweep.md, stage 7)
    familySeats: true,
    familyNeedsBase: false,
    laneSeats: 3,
    // Real, per symbol: open only where this config's own closes already clear min PF
    symGate: "proven",
    symMinN: 2,
    toggles: { ...DEFAULT_TOGGLES, ...(s.toggles ?? {}) },
    block: { ...DEFAULT_BLOCK, ...(s.block ?? {}) },
    dca: { ...DEFAULT_DCA, ...(s.dca ?? {}) },
    gates: s.gates,
    cost: s.cost,
    // with timeframe lanes the grid is expressed on the 15m reference and every lane scales it (laneProtect)
    protects: protectGrid(s.tfs?.length ? REF_TF : s.tfMin, s.grid ?? DEFAULT_GRID),
    dcaProtects: dcaProtectGrid(s.tfs?.length ? REF_TF : s.tfMin, s.dca),
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
  /** `protect`: an ATR protect's distances resolved for that entry (live / paper get concrete prices) */
  pending: Array<{ sym: string; side: 1 | -1; protect?: Protect }>;
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

/** Whether a tape's columns sit in one buffer in the tapeViews layout from its exitT column (makeTape / packArena). */
export function inTapeLayout(t: ConfigTape): boolean {
  const src = t.exitT.buffer;
  const base = t.exitT.byteOffset;
  const bytes = tapeBytes(t.n);
  return (
    t.level.buffer === src &&
    t.level.byteOffset === base + bytes - t.n &&
    src.byteLength >= base + bytes
  );
}

/**
 * Every tape of a worker reply in ONE buffer (each in the tapeViews layout at an 8-byte aligned offset): the main
 * thread then receives one ArrayBuffer per reply instead of one per tape. Each received or allocated ArrayBuffer
 * costs the main thread ~20 µs plus collector work — at 100k tapes per compute that was seconds of native time and
 * the longest event-loop stalls. The tapes' views are moved onto the arena (same values); a tape not in the layout
 * keeps its own buffer. Returns the arena and the buffers that stay separate.
 */
export function packArena(tapes: ConfigTape[]): { arena: ArrayBuffer | null; others: ArrayBuffer[] } {
  const align = (x: number) => Math.ceil(x / 8) * 8;
  const packed = tapes.filter(inTapeLayout);
  const others = new Set<ArrayBuffer>();
  for (const t of tapes) if (!inTapeLayout(t)) for (const k of TAPE_COLUMNS) others.add(t[k].buffer as ArrayBuffer);
  let total = 0;
  for (const t of packed) total = align(total) + tapeBytes(t.n);
  if (!packed.length) return { arena: null, others: [...others] };
  const arena = new ArrayBuffer(Math.max(8, align(total)));
  let off = 0;
  for (const t of packed) {
    off = align(off);
    const bytes = tapeBytes(t.n);
    new Uint8Array(arena, off, bytes).set(new Uint8Array(t.exitT.buffer, t.exitT.byteOffset, bytes));
    Object.assign(t, tapeViews(arena, off, t.n));
    off += bytes;
  }
  return { arena, others: [...others] };
}

const TAPE_COLUMNS = [
  "exitT",
  "entryT",
  "r",
  "entry",
  "exit",
  "symI",
  "side",
  "reason",
  "bars",
  "vol",
  "level",
  "gp",
  "gl",
  "rs",
  "r2",
] as const;

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
  const g = packTapesGen(tapes);
  for (let r = g.next(); ; r = g.next()) if (r.done) return r.value;
}

/** packTapes in slices (tens of thousands of tapes took seconds in one piece). */
export function* packTapesGen(tapes: readonly ConfigTape[]): Generator<number, PackedTapes> {
  const align = (x: number) => Math.ceil(x / 8) * 8;
  let total = 0;
  for (const t of tapes) total = align(total) + tapeBytes(t.n);
  const sab = new SharedArrayBuffer(Math.max(8, align(total)));
  const symTables: Array<readonly string[]> = [];
  const symIdx = new Map<readonly string[], number>();
  const rows: unknown[] = [];
  // metadata serialised per slice (one JSON.stringify over every row blocked too)
  const chunks: string[] = [];
  let off = 0;
  let k = 0;
  for (const t of tapes) {
    if (++k % 1000 === 0) {
      chunks.push(JSON.stringify(rows).slice(1, -1));
      rows.length = 0;
      yield k;
    }
    off = align(off);
    const src = t.exitT.buffer;
    // a makeTape tape (own buffer) or a packArena tape (a region of its reply's arena): the tapeViews layout from
    // its exitT column
    if (!inTapeLayout(t)) throw new Error("tape not in the packed layout");
    // a single Uint8Array over the whole pack throws once the book is past ~2GB
    const bytes = tapeBytes(t.n);
    const srcU = new Uint8Array(src, t.exitT.byteOffset, bytes);
    const CHUNK = 32 * 1024 * 1024;
    for (let i = 0; i < bytes; i += CHUNK) {
      const n = Math.min(CHUNK, bytes - i);
      new Uint8Array(sab, off + i, n).set(srcU.subarray(i, i + n));
    }
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
  if (rows.length) chunks.push(JSON.stringify(rows).slice(1, -1));
  return {
    sab,
    meta: `{"syms":${JSON.stringify(symTables)},"rows":[${chunks.filter((c) => c).join(",")}]}`,
  };
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
/** Drawdown of a tape's closes [a, b): longest time under a prior peak (hours, open until nowT) and the max depth. */
export function winDd(tp: ConfigTape, a: number, b: number, nowT: number): { ddtH: number; mdd: number } {
  if (b <= a) return { ddtH: 0, mdd: 0 };
  let cum = 0;
  let peak = 0;
  let peakT = tp.entryT[a];
  let dipped = false;
  let ddt = 0;
  let mdd = 0;
  for (let i = a; i < b; i++) {
    cum += tp.r[i];
    if (cum < peak) {
      dipped = true;
      if (peak - cum > mdd) mdd = peak - cum;
    } else {
      if (dipped && tp.exitT[i] - peakT > ddt) ddt = tp.exitT[i] - peakT;
      dipped = false;
      peak = cum;
      peakT = tp.exitT[i];
    }
  }
  if (dipped && nowT - peakT > ddt) ddt = nowT - peakT;
  return { ddtH: ddt / H, mdd };
}
const winDdt = (tp: ConfigTape, a: number, b: number, nowT: number) => winDd(tp, a, b, nowT).ddtH;

/** Max drawdown ratio gate: drawdown ÷ net result above the limit (or nothing earned) fails; off at 0. Both in
 *  the same unit (the window net of win() is in %: pass the drawdown × 100). */
export function ddrFails(mdd: number, net: number, maxDdr: number | undefined): boolean {
  if (!(maxDdr && maxDdr > 0)) return false;
  return !(net > 0) || mdd / net > maxDdr;
}

/**
 * Entry filters of the signal tapes (causal: bar i only looks at bars up to i): `trendH` keeps a signal only in
 * the direction of the EMA over that many hours (long above, short below); `volFloor` drops signals while
 * ATR(14) ÷ close is below it (the expected move must be worth the round-trip cost).
 */
export interface EntryFilter {
  trendH: number;
  volFloor: number;
}
export type EntryFloors = {
  minSl: number;
  minTrail: number;
  entry?: EntryFilter | null;
  /** range cells fitted to each indication's horizon (rangeFit); unset = every range cell on every indication */
  rangeFit?: RangeFit | null;
  /** range tapes with fewer closes can never take a seat and are not kept (3, or the range gate's last N) */
  rangeMinN?: number;
  /** shortest lane (minutes) per range tag: a range cell is not computed on a faster lane (rangeMinTfOf) */
  rangeMinTf?: Partial<Record<string, number>>;
  /**
   * per pair ("bot|ind"), the ranges it passed in Base ("" = the wide grid): only their cells are computed. A pair
   * not listed (held for an open position) computes every cell.
   */
  pairTags?: Record<string, readonly string[]>;
  /** Micro cells only on Micro indications ("mc-…") and Micro indications only on Micro cells (grid.micro.ownInds) */
  microOwnInds?: boolean;
};

/**
 * Range cells (micro / minimal / short / plus) are fitted to the indication that trades them: an indication over
 * `p` bars of a `tf`-minute lane moves about σ₁ₘ · √(p · tf) (σ₁ₘ = median 1-minute volatility of the universe).
 * A cell is computed when its target is within [lo, hi] × that move; at least `keep` targets per range stay (the
 * nearest ones), so every indication keeps range coverage. Example: a 1m RSI-14 (≈ 0.7 %) keeps micro / minimal
 * targets, a 30m Supertrend-10 (≈ 3.5 %) keeps the short targets.
 */
export interface RangeFit {
  lo: number;
  hi: number;
  keep: number;
}
export const DEFAULT_RANGE_FIT: RangeFit = { lo: 0.2, hi: 2.5, keep: 2 };

/** Lookback in bars of an indication (its main period parameter; 14 when none). */
export function indHorizonBars(ind: string): number {
  const spec = INDICATION_BY_ID.get(laneOf(ind).base);
  const p = spec?.params ?? {};
  for (const k of ["p", "slow", "s", "look", "n", "w", "bars", "rsi", "bb", "cci", "atr", "c", "b"]) {
    const v = p[k];
    if (Number.isFinite(v) && v >= 2) return Math.min(200, v);
  }
  return 14;
}

/** Median per-minute volatility (std of log returns / √tf) over the universe's series. */
export function universeSigma1m(bars: readonly Bars[]): number {
  const xs: number[] = [];
  for (const b of bars) {
    const n = b.n ?? b.c.length;
    if (n < 30) continue;
    let s = 0;
    let s2 = 0;
    let k = 0;
    for (let i = Math.max(1, n - 2000); i < n; i++) {
      const a = b.c[i - 1];
      const c = b.c[i];
      if (!(a > 0 && c > 0)) continue;
      const r = Math.log(c / a);
      s += r;
      s2 += r * r;
      k++;
    }
    if (k < 20) continue;
    const sd = Math.sqrt(Math.max(0, s2 / k - (s / k) ** 2));
    xs.push(sd / Math.sqrt(Math.max(1, b.tfMin)));
  }
  if (!xs.length) return 0.002;
  xs.sort((a, b) => a - b);
  return xs[xs.length >> 1];
}

/**
 * Targets of each range kept for one indication (keys `${tag}|${tp}`); null = keep everything.
 * Wide-grid cells are never filtered.
 */
export function fittedRangeTps(
  ind: string,
  laneTf: number,
  protects: readonly Protect[],
  sigma1m: number,
  fit: RangeFit | null | undefined,
): Set<string> | null {
  if (!fit || !(sigma1m > 0)) return null;
  const move = sigma1m * Math.sqrt(indHorizonBars(ind) * Math.max(1, laneTf));
  const byTag = new Map<string, Set<number>>();
  for (const p of protects) if (p.tag) (byTag.get(p.tag) ?? byTag.set(p.tag, new Set()).get(p.tag)!).add(p.tp);
  const keep = new Set<string>();
  for (const [tag, tps] of byTag) {
    const xs = [...tps];
    const inside = xs.filter((tp) => tp >= fit.lo * move && tp <= fit.hi * move);
    // coverage: the targets nearest to the band (log distance) when fewer than `keep` are inside
    const dist = (tp: number) =>
      tp < fit.lo * move ? Math.log((fit.lo * move) / tp) : tp > fit.hi * move ? Math.log(tp / (fit.hi * move)) : 0;
    const picked =
      inside.length >= fit.keep ? inside : xs.sort((a, b) => dist(a) - dist(b)).slice(0, Math.max(fit.keep, inside.length));
    for (const tp of picked) keep.add(`${tag}|${tp}`);
  }
  return keep;
}

export function filterEntries(sig: Int8Array, b: Bars, k: SeriesCache, f: EntryFilter): Int8Array {
  const out = Int8Array.from(sig);
  const e = f.trendH > 0 ? k.ema(Math.max(2, Math.round((f.trendH * 60) / (b.tfMin || 1)))) : null;
  const a = f.volFloor > 0 ? k.atr(14) : null;
  for (let i = 0; i < out.length; i++) {
    if (out[i] === 0) continue;
    if (e && !(out[i] > 0 ? b.c[i] > e[i] : b.c[i] < e[i])) out[i] = 0;
    else if (a && !(a[i] / b.c[i] >= f.volFloor)) out[i] = 0;
  }
  return out;
}

/** Base: causal tapes for every combo × protect × sub-strategy. Generator so callers can time-slice. */
export function* buildTapesGen(
  u: Universe,
  protects: readonly Protect[],
  cost: number,
  dcaOpt?: { protects: readonly Protect[]; dca: DcaConfig; axis?: AxisConfig; noDca?: boolean },
  /** Main candidates as "bot|ind"; undefined = every combo */
  only?: ReadonlySet<string>,
  /** engine-wide entry tactics (session, volatility, trend strength, cooldown) */
  tactics?: Tactics | null,
  /** live-feedback adjustments per set (wider min SL / trailing distance) */
  adjust?: AdjustState | null,
  /** hard floors of every config's stop and trailing distance, after lane scaling (fractions of price) */
  floors?: EntryFloors | null,
): Generator<{ done: number; total: number }, ConfigTape[]> {
  // a range cell keeps its own minimum stop / trail (set when the grid was built), not the wide-grid floor
  const adj = (bot: string, ind: string, kind: StratKind, p: Protect) =>
    adjustProtect(p.tag ? p : adjustProtect(p, floors), adjust?.[`${bot}|${ind}|${kind}`]);
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
  // range cells fitted to each indication's horizon, and range tapes that could never seat dropped
  const sigma1m = floors?.rangeFit ? universeSigma1m(u.bars) : 0;
  const rangeMinN = Math.max(0, floors?.rangeMinN ?? 0);
  const axisN = !dcaOpt?.axis
    ? 0
    : dcaOpt.axis.exits === "fixed" && dcaOpt.axis.mode !== "desk"
      ? dcaOpt.protects.length
      : (dcaOpt.axis.ranges?.length || 1) * (dcaOpt.axis.levelsSet?.length || 1);
  const per =
    protects.length + (dcaOpt ? (dcaOpt.noDca ? 0 : dcaOpt.protects.length * 2) + axisN : 0);
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
      if (floors?.entry && sigs[s] && isSignalInd(c.ind))
        sigs[s] = filterEntries(sigs[s]!, u.bars[s], u.caches[s], floors.entry);
      // signal series for one symbol can be heavy on first use; let the caller yield per symbol
      yield { done, total };
    }
    if (!series.length || series.some((s) => sigs[s] === null)) {
      done += per;
      continue;
    }
    // short-lane floors can map two grid configs onto one: each config id is built once
    const built = new Set<string>();
    const fitted = fittedRangeTps(
      c.ind,
      laneOf(c.ind).tf ?? u.bars[series[0]]?.tfMin ?? 1,
      protects,
      sigma1m,
      floors?.rangeFit,
    );
    const laneTf = laneOf(c.ind).tf ?? u.bars[series[0]]?.tfMin ?? 1;
    const tagsOk = floors?.pairTags?.[`${c.bot}|${c.ind}`];
    const microInd = isMicroInd(laneOf(c.ind).base);
    for (const p0 of protects) {
      if (floors?.microOwnInds && (p0.tag === "mc") !== microInd) {
        done++;
        continue;
      }
      if (tagsOk && !tagsOk.includes(p0.tag ?? "")) {
        done++;
        continue;
      }
      if (p0.tag && fitted && !fitted.has(`${p0.tag}|${p0.tp}`)) {
        done++;
        continue;
      }
      if (p0.tag && laneTf < (floors?.rangeMinTf?.[p0.tag] ?? 0)) {
        done++;
        continue;
      }
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
        const res = simulate(id, u.bars[s], sigs[s]!, p, {
          cost,
          cooldown,
          atr: p.atr ? u.caches[s].atrEma(ATR_PERIOD) : undefined,
        });
        for (const tr of res.trades) {
          tr.kind = kind;
          trades.push(tr);
        }
        if (res.open) open.push(res.open);
        if (res.pending)
          pending.push(
            res.pendingProtect
              ? { sym: u.bars[s].sym, side: res.pending, protect: res.pendingProtect }
              : { sym: u.bars[s].sym, side: res.pending },
          );
      }
      // a range tape with fewer closes than its gate needs can never take a seat: not kept (memory)
      if (!rangeGated(p.tag) || trades.length >= rangeMinN)
        out.push(atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, open, pending)));
      done++;
      yield { done, total };
    }
    // a Micro indication trades Micro cells only: no DCA / Axis sets
    if (floors?.microOwnInds && microInd) {
      done += per - protects.length;
      continue;
    }
    if (dcaOpt) {
      for (const p0 of dcaOpt.noDca ? [] : dcaOpt.protects) {
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
        const desk = ax0.mode === "desk";
        // every Axis set: range type × ladder depth (managed exits / desk mode), each its own tape; fixed exits:
        // per protect. Desk sets carry their own tag (…|axd-atr3[h]) so they never share an id with revert sets
        const variants =
          ax0.exits === "fixed" && !desk
            ? dcaOpt.protects.map((p0) => ({ p0, ax: ax0, tag: "" }))
            : (ax0.ranges?.length ? ax0.ranges : [ax0.range ?? "atr"]).flatMap((range) =>
                (ax0.levelsSet?.length ? ax0.levelsSet : [ax0.levels]).map((levels) => ({
                  p0: dcaOpt.protects[0],
                  ax: { ...ax0, range, levels },
                  tag: desk
                    ? `|axd-${range}${levels}${ax0.hybrid ? "h" : ""}`
                    : `|ax-${range}${levels}`,
                })),
              );
        // desk stops / trails: the configured floors and the set's live-feedback floors (as adjustProtect)
        const af = adjust?.[`${c.bot}|${c.ind}|axis`];
        const deskFloor = {
          minSl: Math.max(floors?.minSl ?? 0, af?.minSl ?? 0),
          minTrail: Math.max(floors?.minTrail ?? 0, af?.minTrail ?? 0),
        };
        for (const { p0, ax, tag } of variants) {
          const p = adj(c.bot, c.ind, "axis", laneProtect(p0, c.ind));
          const id = configId(c.bot, c.ind, p, "axis").replace(/\|axis$/, `${tag}|axis`);
          if (built.has(id)) {
            done++;
            continue;
          }
          built.add(id);
          const trades: Trade[] = [];
          const open: OpenPosition[] = [];
          const pending: ConfigTape["pending"] = [];
          for (const s of series) {
            const k = u.caches[s];
            const centerS = k.ema(
              Math.max(
                2,
                Math.round(ax.centerMin ? ax.centerMin / (u.bars[s].tfMin || 1) : ax.center),
              ),
            );
            if (desk) {
              const res = simulateAxisDesk(
                id,
                u.bars[s],
                sigs[s]!,
                p,
                ax,
                centerS,
                k.atr(14),
                cost,
                cooldown,
                deskFloor,
              );
              for (const tr of res.trades) trades.push(tr);
              // open desk positions carry their average entry, stop and target (paper / live get a concrete stop)
              if (res.open) open.push(res.open);
              if (res.pending)
                pending.push(
                  res.pendingProtect
                    ? { sym: u.bars[s].sym, side: res.pending, protect: res.pendingProtect }
                    : { sym: u.bars[s].sym, side: res.pending },
                );
              continue;
            }
            const res = simulateAxis(
              id,
              u.bars[s],
              sigs[s]!,
              p,
              ax,
              centerS,
              k.atr(14),
              cost,
              cooldown,
            );
            for (const tr of res.trades) trades.push(tr);
            if (res.pending) pending.push({ sym: u.bars[s].sym, side: res.pending });
          }
          out.push(atFrom(makeTape(id, c.bot, c.ind, p, "axis", syms, trades, open, pending)));
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
  dcaOpt?: { protects: readonly Protect[]; dca: DcaConfig; axis?: AxisConfig; noDca?: boolean },
  only?: ReadonlySet<string>,
  tactics?: Tactics | null,
  adjust?: AdjustState | null,
  floors?: EntryFloors | null,
): ConfigTape[] {
  const gen = buildTapesGen(u, protects, cost, dcaOpt, only, tactics, adjust, floors);
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

/**
 * Whether a sub-strategy may execute at all under the toggles (Block may still veto per trade).
 *   Normal off   the plain base (Normal and Trailing entries) is off: only Block-raised Normal / Trailing entries
 *                execute (with Block on); DCA, DCA Active and Axis keep processing on their own
 *   Trailing off no trailing anywhere (also not Block-raised)
 * Toggles never stop the processing itself: every tape is still built and evaluated (Base / Main, the Block
 * feed, the base PF DCA / Axis must beat) — they only decide what executes.
 */
export function kindExecutable(kind: StratKind, tg: StrategyToggles): boolean {
  switch (kind) {
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

/**
 * Whether a config of this tape trades under the toggles: kindExecutable, except a signal's own base (signalOwnBase)
 * — its Normal always, its Trailing with the Trailing switch — whatever the engine's Normal / Block switches say.
 */
export function tapeExecutable(
  tp: Pick<ConfigTape, "kind" | "ind">,
  o: Pick<WalkForwardOptions, "toggles" | "signalOwnBase">,
): boolean {
  if (o.signalOwnBase && (tp.kind === "normal" || tp.kind === "trailing") && isSignalInd(tp.ind))
    return tp.kind === "normal" || o.toggles.trailing;
  return kindExecutable(tp.kind, o.toggles);
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
  /** causal signal activation: the active set of every step, and the set at the end (paper / live use it) */
  signalSteps?: Array<{ t: number; keys: string[] }>;
  signalActiveEnd?: string[];
  /** Stable-02 coordination state at the end of the run (paper / live: relation factor, held-back symbols) */
  s2?: { factor: number; paused: string[] };
  /** negative-hour hedge signals at the end of the run (paper / live) */
  hedgeEnd?: string[];
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
  /** set when the candidate was executed raised: the Block sources that raised it (they pause on a positive close) */
  bsrc?: BlockSource[];
}

/** Feed one closed candidate into the Block book and, for a signal, into the signal guard. */
export function feedBooks(e: BlockFeedEntry, book: BlockBook | null, guard?: SignalGuard | null) {
  book?.add(e);
  // keyed by the candidate's config (the same key execDecision checks); the exit time feeds the loss-cluster guard
  if (guard && e.ind && isSignalInd(e.ind)) {
    guard.add(guardKey(e.cfg ?? e.ind, e.sym, e.side, e.type ?? "normal"), e.r, e.exitT);
    guard.addAccept(acceptKey(e.ind, e.sym, e.side, e.type ?? "normal"), e.r, e.exitT);
  }
}

export interface Selection {
  id: string;
  score: number;
  window: { n: number; net: number; pf: number; ddt: number };
}

/** Share of exit-hours in [a, b) with a positive summed return. */
function greenShare(tp: ConfigTape, a: number, b: number): number {
  if (b <= a) return 0;
  let curH = -1;
  let cur = 0;
  let hours = 0;
  let green = 0;
  const flush = () => {
    if (curH < 0) return;
    hours++;
    if (cur > 0) green++;
  };
  for (let i = a; i < b; i++) {
    const h = Math.floor(tp.exitT[i] / H);
    if (h !== curH) {
      flush();
      curH = h;
      cur = tp.r[i];
    } else cur += tp.r[i];
  }
  flush();
  return hours ? green / hours : 0;
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

/** Strategy family. Trailing is not part of the plain base: it is seated and executed on its own. */
export const familyOf = (kind: string) =>
  kind === "axis"
    ? "axis"
    : kind === "dca" || kind === "dca-active"
      ? "dca"
      : kind === "trailing"
        ? "trailing"
        : "base";

/** Seat key of a tape: its pair, per family when every family has its own seats.
 *  A micro cell is its own seat, so it is not dropped for the wide cell of the same strategy. */
const seatKey = (
  tp: ConfigTape,
  o: Pick<WalkForwardOptions, "familySeats" | "rangeSeats" | "seatPer">,
) => {
  const tag = tp.protect.tag;
  // independent configs: the config id is the seat (its family and range stay readable for the seat counts)
  if (o.seatPer === "config")
    return `${tag ? `${tag}|` : ""}${tp.bot}|${tp.ind}|${familyOf(tp.kind)}#${tp.id.replaceAll("|", "~")}${
      tp.kind === "trailing" ? "|tr" : ""
    }`;
  if (tag === "mc") return `mc|${tp.id}`;
  const trail = tp.kind === "trailing" ? "|tr" : "";
  const key = o.familySeats ? `${tp.bot}|${tp.ind}|${familyOf(tp.kind)}${trail}` : `${tp.bot}|${tp.ind}${trail}`;
  // range seats: short / minimal / plus each hold a seat of their own per pair
  return o.rangeSeats && tag ? `${tag}|${key}` : key;
};
const MICRO_SEATS = 200;
/** range tag of a range seat key ("mc", "mn", "sh", "gn", "lg", "mp"), "" otherwise */
const rangeSeat = (pair: string) => (/^(mc|sh|mn|mp|gn|lg)\|/.exec(pair)?.[1] ?? "") as "" | RangeTag;
const seatFamily = (pair: string, familySeats: boolean | undefined) => {
  const r = rangeSeat(pair);
  if (r === "mc") return "micro";
  if (r) return r;
  return pair.endsWith("|tr") ? "trailing" : familySeats ? famOfKey(pair) : "base";
};
const famOfKey = (pair: string) => (pair.split("|")[2] ?? "base").split("#")[0];

/**
 * Additional strategies (DCA, Axis) must beat the base: a candidate of another family stays only when its window
 * PF is at least the best base-family (Normal / Trailing) PF of the same pair in that window.
 */
function beatsBase<T extends { pair: string; window: { pf: number } }>(
  xs: T[],
  basePf: ReadonlyMap<string, number>,
  o: Pick<WalkForwardOptions, "familySeats" | "familyNeedsBase" | "seatPer">,
): T[] {
  if (!o.familySeats || o.seatPer === "config") return xs;
  return xs.filter((c) => {
    const f = famOfKey(c.pair);
    if (f === "base" || f === "trailing") return true;
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
  o: Pick<WalkForwardOptions, "familySeats" | "laneSeats" | "rangeSeats">,
): Selection[] {
  const ls = o.laneSeats ?? 0;
  // ranges: micro per cell (MICRO_SEATS); short / minimal / plus with seats of their own when range seats are on
  const rangeOut: Selection[] = [];
  for (const r of RANGE_TAGS) {
    const xs = cands.filter((c) => rangeSeat(c.pair) === r);
    const held = picks.filter((p) => rangeSeat(p.pair ?? "") === r);
    if (xs.length || held.length)
      rangeOut.push(...pickByLane(xs, r === "mc" ? MICRO_SEATS : seats, held, pairs, r === "mc" ? 0 : ls));
  }
  const plain = cands.filter((c) => !rangeSeat(c.pair));
  const plainHeld = picks.filter((p) => !rangeSeat(p.pair ?? ""));
  const trail = plain.filter((c) => c.pair.endsWith("|tr"));
  const rest = plain.filter((c) => !c.pair.endsWith("|tr"));
  const trailHeld = plainHeld.filter((p) => (p.pair ?? "").endsWith("|tr"));
  const restHeld = plainHeld.filter((p) => !(p.pair ?? "").endsWith("|tr"));
  const trailOut = pickByLane(trail, seats, trailHeld, pairs, ls);
  if (!o.familySeats) return [...pickByLane(rest, seats, restHeld, pairs, ls), ...trailOut, ...rangeOut];
  const fams = new Map<string, Array<Selection & { pair: string }>>();
  for (const c of rest) {
    const f = famOfKey(c.pair);
    let xs = fams.get(f);
    if (!xs) fams.set(f, (xs = []));
    xs.push(c);
  }
  const held = new Map<string, Selection[]>();
  for (const p of restHeld) {
    const f = famOfKey(p.pair ?? "");
    let xs = held.get(f);
    if (!xs) held.set(f, (xs = []));
    xs.push(p);
  }
  const out: Selection[] = [];
  for (const f of ["base", "dca", "axis", "trailing"])
    out.push(...pickByLane(fams.get(f) ?? [], seats, held.get(f) ?? [], pairs, ls));
  return [...out, ...trailOut, ...rangeOut];
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
  const laneKey = (pair: string) => {
    const ind = pair.split("|")[1] ?? "";
    const l = laneOf(ind);
    // signals are a share of their own (they compete with each other, not with the engine's lanes)
    return isSignalInd(ind)
      ? "signal"
      : l.tf === null
        ? "plain"
        : `${l.tf}${l.combined ? "c" : ""}`;
  };
  const byLane = new Map<string, Array<Selection & { pair: string }>>();
  for (const c of cands) {
    const k = laneKey(c.pair);
    let xs = byLane.get(k);
    if (!xs) byLane.set(k, (xs = []));
    xs.push(c);
  }
  // held seats count toward their own lane's minimum: a lane short of laneSeats gets the missing seats even when
  // held seats of other lanes fill the portfolio (they no longer starve a fast lane for as long as they hold)
  const heldBy = new Map<string, number>();
  for (const p of picks) {
    const pair = (p as Selection & { pair?: string }).pair;
    if (pair) heldBy.set(laneKey(pair), (heldBy.get(laneKey(pair)) ?? 0) + 1);
  }
  let deficit = 0;
  for (const k of byLane.keys()) deficit += Math.max(0, laneSeats - (heldBy.get(k) ?? 0));
  const seats = Math.max(seats0, laneSeats * byLane.size, picks.length + deficit);
  const free = seats - picks.length;
  if (free <= 0) return picks;
  const take = (c: Selection & { pair: string }) => {
    if (picks.length >= seats || pairs.has(c.pair)) return;
    pairs.add(c.pair);
    picks.push(c);
  };
  const sorted = new Map(
    [...byLane].map(([k, xs]) => [k, [...xs].sort((x, y) => y.score - x.score)]),
  );
  const fill = (k: string, upTo: number) => {
    // seats of lane k up to `upTo` in total (held included), best first
    let n = heldBy.get(k) ?? 0;
    for (const c of sorted.get(k) ?? []) {
      if (n >= upTo) break;
      if (pairs.has(c.pair)) continue;
      const before = picks.length;
      take(c);
      if (picks.length > before) {
        n++;
        heldBy.set(k, n);
      }
    }
  };
  if (byLane.size > 1) {
    // 1) every lane its missing minimum, 2) up to an even share of all seats (held included); 3) best of the rest
    for (const k of sorted.keys()) fill(k, laneSeats);
    const even = Math.floor(seats / byLane.size);
    for (const k of sorted.keys()) fill(k, Math.max(laneSeats, even));
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
    if (o.basePassed && !o.basePassed.has(`${tp.bot}|${tp.ind}`)) continue;
    const a = lowerBound(tp.exitT, fromLong);
    const b = lowerBound(tp.exitT, t);
    if (b - a < minLong) continue;
    const pair = seatKey(tp, o);
    pairTotal.set(pair, (pairTotal.get(pair) ?? 0) + 1);
    const w = win(tp, a, b);
    noteBase(basePf, tp, w);
    if (w.net <= 0 || w.pf < minPfOf(o.gates, tp.protect.tag)) continue;
    const dd = winDd(tp, a, b, t);
    const ddt = dd.ddtH;
    if (ddt > ddtMax || ddrFails(dd.mdd * 100, w.net, o.gates.maxDdr)) continue;
    pairOk.set(pair, (pairOk.get(pair) ?? 0) + 1);
    if (!tapeExecutable(tp, o)) continue;
    const pa = lowerBound(tp.exitT, fromPre);
    const pre = win(tp, pa, b);
    if (o.preGate && pre.n >= 3 && (pre.pf < PF_NEUTRAL || pre.net < 0)) continue;
    if (!validOk(tp, t, o)) continue;
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
    o.seatPer === "config" ||
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
    if (o.basePassed && !o.basePassed.has(`${tp.bot}|${tp.ind}`)) continue;
    // the window a tape can be judged on: the long window, clipped to where its lane's data begins (at least
    // the pre-calc window, so a lane with too little history is not judged on a sliver)
    const from = Math.min(t - o.preH * H, Math.max(from0, tp.fromT ?? from0));
    const span = (t - from) / k;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    const w = win(tp, a, b);
    const pair = seatKey(tp, o);
    // the base is evaluated whatever the toggles: DCA / Axis still have to beat it with Normal off
    noteBase(basePf, tp, w);
    if (!tapeExecutable(tp, o)) continue;
    if (held.has(tp.id)) {
      // sticky: stay while the long window still pays (PF >= neutral)
      if (w.n >= 3 && w.pf >= PF_NEUTRAL && w.net > 0)
        keep.push({ id: tp.id, score: w.net, window: { ...w, ddt: 0 }, pair });
      continue;
    }
    if (w.n < minLong || w.net <= 0 || w.pf < minPfOf(o.gates, tp.protect.tag)) continue;
    if (o.gates.maxDdr && ddrFails(winDd(tp, a, b, t).mdd * 100, w.net, o.gates.maxDdr)) continue;
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
    if (!validOk(tp, t, o)) continue;
    cand0.push({ id: tp.id, score: lcbFast(tp, a, b), window: { ...w, ddt: 0 }, pair });
  }
  const cand = beatsBase(cand0, basePf, o);
  const pairs = new Set<string>();
  const picks: Array<Selection & { pair: string }> = [];
  const perFam = new Map<string, number>();
  for (const s of keep.sort((x, y) => y.score - x.score)) {
    const f = seatFamily(s.pair, o.familySeats);
    const cap = f === "micro" ? MICRO_SEATS : seatsOf(o);
    if (pairs.has(s.pair) || (perFam.get(f) ?? 0) >= cap) continue;
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
 * Fixed set: the focus pairs were validated offline, but each protect still has to clear the same evals as the
 * other modes. A variant is eligible only with enough closes, net > 0, PF ≥ min PF, drawdown time inside the
 * gate, a positive lower-confidence bound, and (when the pre-gate is on) a pre-window that also clears min PF.
 * The seat goes to the eligible variant with the best green-hour-weighted score. Pairs with nothing eligible
 * do not trade. Last-N, Block and the caps still apply at execution.
 */
export function selectFixed(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): { picks: Selection[]; eligible: number } {
  const g = selectFixedGen(tapes, t, o);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/** The stage evaluation gates in the order the engine applies them (configEval's failing reason). */
export const EVAL_GATES = ["closes", "net", "pf", "ddt", "ddr", "pre", "lastN", "rangeGate", "lcb", "green"] as const;
export type EvalGate = (typeof EVAL_GATES)[number];
export type ConfigEval =
  | { ok: true; lcb: number; gh: number; ddt: number; pf: number; n: number; net: number }
  | { ok: false; fail: EvalGate; pf: number; n: number; net: number };

/**
 * Stage Base evaluation of one config at time t, on its own closes only (every config independent): over the
 * selection window (max of long and pre-historic hours) at least max(3, minTrades) closes, positive net, PF ≥ its
 * range's minimum, drawdown time ≤ maxDdtH × window / 72 h, drawdown ratio ≤ maxDdr; the pre-historic window not
 * negative (preGate); its last validLastN closes clear the same PF / DDT / DDR (and a range cell its range gate);
 * positive lower-confidence bound; green hours ≥ minGreen. The engine's seat selection and every report use this.
 */
export function configEval(tp: ConfigTape, t: number, o: WalkForwardOptions): ConfigEval {
  const a = lowerBound(tp.exitT, t - Math.max(o.longH, o.preH) * H);
  const b = lowerBound(tp.exitT, t);
  return configEvalAt(tp, t, o, a, b, win(tp, a, b), (o.gates.maxDdtH * Math.max(o.longH, o.preH)) / 72);
}

function configEvalAt(
  tp: ConfigTape,
  t: number,
  o: WalkForwardOptions,
  a: number,
  b: number,
  w: { n: number; net: number; pf: number },
  ddtMax: number,
): ConfigEval {
  const base = { pf: w.pf, n: w.n, net: w.net };
  const no = (fail: EvalGate): ConfigEval => ({ ok: false, fail, ...base });
  const minPf = minPfOf(o.gates, tp.protect.tag);
  if (w.n < Math.max(3, o.gates.minTrades ?? 0)) return no("closes");
  if (w.net <= 0) return no("net");
  if (w.pf < minPf) return no("pf");
  const dd = winDd(tp, a, b, t);
  if (dd.ddtH > ddtMax) return no("ddt");
  if (ddrFails(dd.mdd * 100, w.net, o.gates.maxDdr)) return no("ddr");
  if (o.preGate) {
    const pre = win(tp, lowerBound(tp.exitT, t - o.preH * H), b);
    if (pre.n >= 3 && (pre.pf < minPf || pre.net < 0)) return no("pre");
  }
  // best-set validation: last validLastN closes clear min PF and the drawdown-time gate; a range cell its range gate
  if (!lastNOk(tp, t, o.validLastN ?? 0, minPf, o.gates.maxDdtH, o.gates.maxDdr ?? 0)) return no("lastN");
  const g = o.rangeGate;
  if (g && rangeGated(tp.protect.tag) && !lastNOk(tp, t, g.lastN, g.minPf)) return no("rangeGate");
  const lcb = lcbFast(tp, a, b);
  if (!(lcb > 0)) return no("lcb");
  const gh = greenShare(tp, a, b);
  // a variant that is red most hours is not what we run, even if a few large wins clear PF (gates.minGreen)
  if (gh < (o.gates.minGreen ?? 0.5)) return no("green");
  return { ok: true, lcb, gh, ddt: dd.ddtH, ...base };
}

/** selectFixed in slices: yields −1 every 2,000 tapes (with every config its own seat, ~100k tapes per step). */
export function* selectFixedGen(
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): Generator<number, { picks: Selection[]; eligible: number }> {
  const from = t - Math.max(o.longH, o.preH) * H;
  let seen = 0;
  const botOk = o.bots.length ? new Set<string>(o.bots) : null;
  const best = new Map<string, Selection>();
  const basePf = new Map<string, number>();
  const ddtMax = (o.gates.maxDdtH * Math.max(o.longH, o.preH)) / 72;
  for (const tp of tapes) {
    if (++seen % 2000 === 0) yield -1;
    if (botOk && !botOk.has(tp.bot)) continue;
    if (o.basePassed && !o.basePassed.has(`${tp.bot}|${tp.ind}`)) continue;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    const w = win(tp, a, b);
    const pair = seatKey(tp, o);
    // the base is evaluated whatever the toggles: DCA / Axis still have to beat it with Normal off
    noteBase(basePf, tp, w);
    if (!tapeExecutable(tp, o)) continue;
    const ev = configEvalAt(tp, t, o, a, b, w, ddtMax);
    if (!ev.ok) continue;
    const { lcb, gh, ddt } = ev;
    const score = o.rankBy === "green" ? gh + Math.min(1, Math.max(0, lcb)) * 1e-6 : lcb * (0.5 + gh);
    const cur = best.get(pair);
    if (!cur || score > cur.score) best.set(pair, { id: tp.id, score, window: { ...w, ddt } });
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
      const f = seatFamily(pair, o.familySeats);
      const n = perFam.get(f) ?? 0;
      perFam.set(f, n + 1);
      return n < (f === "micro" ? MICRO_SEATS : seatsOf(o));
    })
    .map(([, v]) => v);
  return { picks, eligible: best.size };
}

/** Closed results of one symbol (side 0 = both directions) with exit in [from, entryT). */
function symStats(tp: ConfigTape, sym: string, side: number, from: number, entryT: number) {
  // syms is one slot per series (symbol x timeframe); the same name sits at several indexes
  const mask = new Uint8Array(tp.syms.length);
  let any = false;
  for (let s = 0; s < tp.syms.length; s++)
    if (tp.syms[s] === sym) {
      mask[s] = 1;
      any = true;
    }
  if (!any) return { n: 0, net: 0, pf: 0 };
  const b = lowerBound(tp.exitT, entryT + 1);
  let n = 0;
  let gp = 0;
  let gl = 0;
  let net = 0;
  for (let i = b - 1; i >= 0; i--) {
    if (tp.exitT[i] < from) break;
    if (!mask[tp.symI[i]]) continue;
    if (side !== 0 && tp.side[i] !== side) continue;
    n++;
    const r = tp.r[i];
    net += r;
    if (r > 0) gp += r;
    else gl -= r;
  }
  return { n, net: net * 100, pf: profitFactor(gp, gl) };
}

/** The probe's extra seats: per range, the best tapes by window result (closes inside the window). */
export function probePicks(
  tapes: readonly ConfigTape[],
  t: number,
  o: Pick<WalkForwardOptions, "probe" | "longH" | "preH">,
  taken: ReadonlySet<string>,
): Selection[] {
  const n = Math.max(0, Math.floor(o.probe?.perRange ?? 0));
  const nc = Math.max(0, Math.floor(o.probe?.perCell ?? 0));
  if (!n && !nc) return [];
  const from = t - Math.max(o.longH, o.preH) * H;
  const by = new Map<string, Selection[]>();
  if (nc) {
    // heatmap probe: per cell (TP × SL × trailing), the best tapes by window result; a cell without closes in the
    // window still seats its tape with the most closes. Only plain / trailing tapes of the reference lane: there
    // a cell's distances are exactly the grid's (other lanes are scaled, DCA / Axis carry their own exits)
    const cells = new Map<string, Array<{ sel: Selection; closed: number; all: number }>>();
    for (const tp of tapes) {
      if (taken.has(tp.id)) continue;
      if (tp.kind !== "normal" && tp.kind !== "trailing") continue;
      if ((laneOf(tp.ind).tf ?? REF_TF) !== REF_TF) continue;
      const key = `${tp.protect.tp}|${tp.protect.sl}|${tp.protect.trail}`;
      const a = lowerBound(tp.exitT, from);
      const b = lowerBound(tp.exitT, t);
      const w = win(tp, a, b);
      let xs = cells.get(key);
      if (!xs) cells.set(key, (xs = []));
      xs.push({ sel: { id: tp.id, score: w.net, window: { ...w, ddt: 0 } }, closed: b - a, all: b });
    }
    const out: Selection[] = [];
    for (const xs of cells.values())
      out.push(
        ...xs
          .sort((x, y) => Number(y.closed > 0) - Number(x.closed > 0) || y.sel.score - x.sel.score || y.all - x.all)
          .slice(0, nc)
          .map((x) => x.sel),
      );
    return out;
  }
  for (const tp of tapes) {
    const tag = tp.protect.tag;
    if (!tag || taken.has(tp.id)) continue;
    const a = lowerBound(tp.exitT, from);
    const b = lowerBound(tp.exitT, t);
    if (b - a < 1) continue;
    const w = win(tp, a, b);
    let xs = by.get(tag);
    if (!xs) by.set(tag, (xs = []));
    xs.push({ id: tp.id, score: w.net, window: { ...w, ddt: 0 } });
  }
  const out: Selection[] = [];
  for (const xs of by.values()) out.push(...xs.sort((x, y) => y.score - x.score).slice(0, n));
  return out;
}

/** Picks plus the probe's seats (none unless o.probe is set). */
export function withProbe<T extends { picks: Selection[]; eligible: number }>(
  r: T,
  tapes: readonly ConfigTape[],
  t: number,
  o: WalkForwardOptions,
): T {
  if (!o.probe?.perRange && !o.probe?.perCell) return r;
  const extra = probePicks(tapes, t, o, new Set(r.picks.map((p) => p.id)));
  return extra.length ? { ...r, picks: [...r.picks, ...extra], eligible: r.eligible + extra.length } : r;
}

/** Seat validation: last validLastN closes at min PF; a small-range cell also its range gate (higher PF). */
function validOk(
  tp: ConfigTape,
  t: number,
  o: Pick<WalkForwardOptions, "validLastN" | "gates" | "rangeGate">,
): boolean {
  if (!lastNOk(tp, t, o.validLastN ?? 0, minPfOf(o.gates, tp.protect.tag), o.gates.maxDdtH, o.gates.maxDdr ?? 0))
    return false;
  const g = o.rangeGate;
  return !g || !rangeGated(tp.protect.tag) || lastNOk(tp, t, g.lastN, g.minPf);
}

export function lastNOk(
  tp: ConfigTape,
  entryT: number,
  n: number,
  minPf: number,
  maxDdtH = 0,
  maxDdr = 0,
): boolean {
  if (n <= 0) return true;
  const b = lowerBound(tp.exitT, entryT + 1); // closed at or before entry
  if (b < n) return false;
  if (profitFactor(tp.gp[b] - tp.gp[b - n], tp.gl[b] - tp.gl[b - n]) < minPf) return false;
  // the same closes have to come back inside the drawdown-time gate and keep their drawdown ratio
  if (maxDdtH > 0 || maxDdr > 0) {
    const dd = winDd(tp, b - n, b, entryT);
    if (maxDdtH > 0 && dd.ddtH > maxDdtH) return false;
    if (ddrFails(dd.mdd, tp.rs[b] - tp.rs[b - n], maxDdr)) return false;
  }
  return true;
}

export type ExecDecision =
  | {
      ok: true;
      level: number;
      vol: number;
      /** Block type overall: the extra volume of every raising source (its own position) */
      legs?: Partial<Record<BlockSource, number>>;
      /** the Block sources that raised this entry (paused after it closes positive) */
      src?: BlockSource[];
    }
  | { ok: false; why: string };

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

const OWN_SOURCES = { config: true, overall: false, symbol: false, direction: false, indication: false, type: false };

/** Real-stage execution rules for one candidate entry (toggles, last-N, Block / Block Active). */

export function execDecision(
  tp: ConfigTape,
  entryT: number,
  o: WalkForwardOptions,
  ctx?: { book?: BlockBook | null; guard?: SignalGuard | null; sym: string; side: number },
): ExecDecision {
  const tg = o.toggles;
  if (!tapeExecutable(tp, o)) return { ok: false, why: "toggle" };
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
    if (o.signalCluster?.enabled && ctx.guard?.clustered(entryT, o.signalCluster))
      return { ok: false, why: "signalCluster" };
    if (
      o.signalAccept?.enabled &&
      ctx.guard &&
      // the signal source's record on this symbol, direction and type (one exit config alone rarely has the
      // closes the acceptance needs: keyed per config, no signal would ever be accepted)
      !ctx.guard.accepts(acceptKey(tp.ind, ctx.sym, ctx.side, tp.kind), entryT, o.signalAccept)
    )
      return { ok: false, why: "signalPf" };
    // the validation an engine config needs for its seat (min PF, DDT and DDR), on the signal's own last N
    if (
      !o.probe?.perRange &&
      !o.probe?.perCell &&
      !validOk(tp, entryT, o.signalValidLastN === undefined ? o : { ...o, validLastN: o.signalValidLastN })
    )
      return { ok: false, why: "signalValid" };
  }
  if (o.paused?.size && o.paused.has(setKeyOf(tp.id))) return { ok: false, why: "adjustPause" };
  // last-N uses the stricter of its own floor and the stage min PF, so a pass below min PF cannot enter
  // a demo probe seat (a range tape) trades without the last-N and symbol gates: that is what it measures
  const probed = (!!o.probe?.perRange && !!tp.protect.tag) || !!o.probe?.perCell;
  // end stage / Live: the recent closes must clear min PF and the DDT gate again
  // signals: their own last N (never more than the engine's)
  const lastN =
    o.signalValidLastN !== undefined && isSignalInd(tp.ind) ? Math.min(o.lastN, o.signalValidLastN) : o.lastN;
  if (
    !probed &&
    !lastNOk(
      tp,
      entryT,
      lastN,
      Math.max(o.lastNMinPf, minPfOf(o.gates, tp.protect.tag)),
      o.gates.maxDdtH,
      o.gates.maxDdr ?? 0,
    )
  )
    return { ok: false, why: "lastN" };
  // the config can clear min PF overall and still be the wrong set on this symbol. Judge that symbol alone.
  if (!probed && ctx?.sym && o.symGate && !isSignalInd(tp.ind)) {
    const bySide = o.symGate === "vetoSide" || o.symGate === "provenSide";
    const proven = o.symGate === "proven" || o.symGate === "provenSide";
    const lookH = o.symH && o.symH > 0 ? o.symH : Math.max(o.longH, o.preH);
    const w = symStats(tp, ctx.sym, bySide ? ctx.side : 0, entryT - lookH * H, entryT);
    const minN = o.symMinN ?? 2;
    const fails = w.net <= 0 || w.pf < minPfOf(o.gates, tp.protect.tag);
    if (proven ? w.n < minN || fails : w.n >= minN && fails) return { ok: false, why: "symPf" };
  }
  // Normal off: the plain base (Normal and Trailing) executes only Block-raised — a signal's own base aside
  const plain = tp.kind === "normal" || tp.kind === "trailing";
  const sigBase = plain && !!o.signalOwnBase && isSignalInd(tp.ind);
  // Normal on with a base PF: the unraised base trades on the config's own recent record
  const gatedBase = plain && tg.normal && !sigBase && (o.normalBaseMinPf ?? 0) > 0;
  const baseOk = () =>
    lastNOk(tp, entryT, o.lastN > 0 ? o.lastN : 25, o.normalBaseMinPf ?? 0, o.gates.maxDdtH, o.gates.maxDdr ?? 0);
  if (!tg.block) {
    if (plain && !tg.normal && !sigBase) return { ok: false, why: "normalOff" };
    if (gatedBase && !baseOk()) return { ok: false, why: "normalPf" };
    return { ok: true, level: 0, vol: 1 };
  }
  // a type Block never raises trades at its own volume (and Block Active does not skip it)
  if (o.block.excludeKinds?.includes(tp.kind)) return { ok: true, level: 0, vol: 1 };
  // a range Block never raises: its unit, on its own record (the Normal base PF still applies)
  if (tp.protect.tag && o.block.excludeRanges?.includes(tp.protect.tag)) {
    if (gatedBase && !baseOk()) return { ok: false, why: "normalPf" };
    return { ok: true, level: 0, vol: 1 };
  }
  const t = { sym: ctx?.sym ?? "", side: ctx?.side ?? 0, kind: kindOfInd(tp.ind), type: tp.kind, cfg: tp.id };
  // a signal on its own record: only its config source counts (no pooled book)
  const own = !!o.block.signalsOwn && isSignalInd(tp.ind);
  const blk = own ? { ...o.block, sources: OWN_SOURCES } : o.block;
  const book = own ? null : ctx?.book;
  const d = blockDecide(
    { config: blockLevel(tp, entryT, blk), ...bookLevels(book, t, blk.maxLevel) },
    blk,
    !!tg.blockActive,
    (src) => !!book?.paused(sourceKey(src, t)),
  );
  // Block Active: only entries at the minimum level or above are opened — every lower entry is skipped; a signal's
  // own base trades at its unit then
  if (!d.adjusted && gatedBase) return baseOk() ? { ok: true, level: 0, vol: 1 } : { ok: false, why: "normalPf" };
  if (tg.blockActive && !d.adjusted && !sigBase) return { ok: false, why: "blockActive" };
  // Normal off: a plain Normal / Trailing entry needs Block (DCA / Axis are not plain and run on their own)
  if (plain && !tg.normal && !d.adjusted && !sigBase) return { ok: false, why: "normalOff" };
  if (!d.adjusted) return { ok: true, level: 0, vol: 1 };
  return { ok: true, level: d.level, vol: d.vol, src: d.src, ...(d.legs ? { legs: d.legs } : {}) };
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

/**
 * True when opening `sym` × `side` would exceed the cap on POSITIONS (distinct symbol × direction, long and short
 * independent; every order or partial on a position counts once). Engine and signal positions are capped apart
 * (engine: maxPositions, signals: signalMaxPositions); 0 / unset = no limit.
 */
export function positionsFull(
  open: ReadonlyArray<{ sym: string; side: number; cfg: string }>,
  sym: string,
  side: number,
  signal: boolean,
  cap: number | undefined,
): boolean {
  if (!cap || cap <= 0) return false;
  const seen = new Set<string>();
  for (const x of open) {
    if (sigCfg(x.cfg) !== signal) continue;
    if (x.sym === sym && x.side === side) return false;
    seen.add(`${x.sym}|${x.side}`);
  }
  return seen.size >= cap;
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
 * Negative-hour hedge candidates at t: signals (pair × symbol) whose tape results in the hours the executed book
 * lost (complete hours before t, within `windowH`) were positive — at least `minN` results (per config), net > 0
 * and PF ≥ `minPf`. Keys "bot|ind|sym".
 */
export function hedgeSignalsAt(
  groups: readonly SignalGroup[],
  t: number,
  negHours: ReadonlySet<number>,
  windowH: number,
  opt: { minN: number; minPf: number } = HEDGE_DEFAULTS,
): Set<string> {
  const out = new Set<string>();
  if (!negHours.size) return out;
  const endB = Math.floor(t / H);
  const fromB = endB - windowH;
  for (const g of groups) {
    let lo = 0;
    let hi = g.h.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (g.h[m] < fromB) lo = m + 1;
      else hi = m;
    }
    let n = 0;
    let net = 0;
    let gp = 0;
    let gl = 0;
    for (let j = lo; j < g.h.length && g.h[j] < endB; j++) {
      if (!negHours.has(g.h[j])) continue;
      n += g.n[j];
      net += g.net[j];
      gp += g.gp[j];
      gl += g.gl[j];
    }
    if (n >= opt.minN && net > 0 && profitFactor(gp, gl) >= opt.minPf)
      out.add(`${g.pair}|${g.sym}`);
  }
  return out;
}

/**
 * Hourly index of the signal tapes' closed results per signal (pair × symbol), averaged over the signal's configs
 * (15 Normal + 15 Trailing): built once per tape set, so ranking at every step scans hour buckets, not trades.
 */
interface SignalGroup {
  pair: string;
  sym: string;
  /** signal source ("ema-cross") */
  src: string;
  /** hour bucket ids (floor(exitT / H)), ascending */
  h: Float64Array;
  /** per bucket: Σ r·100 / configs, Σ gains, Σ losses (r), trade count / configs */
  net: Float64Array;
  gp: Float64Array;
  gl: Float64Array;
  n: Float64Array;
}
const signalIndexCache = new WeakMap<object, SignalGroup[]>();
export function signalIndex(sigTapes: readonly ConfigTape[], cacheKey?: object): SignalGroup[] {
  const g = signalIndexGen(sigTapes, cacheKey);
  for (let r = g.next(); ; r = g.next()) if (r.done) return r.value;
}

/** signalIndex in slices (yields every few tapes, so a large index never blocks the event loop). */
export function* signalIndexGen(
  sigTapes: readonly ConfigTape[],
  cacheKey?: object,
): Generator<number, SignalGroup[]> {
  const hit = cacheKey && signalIndexCache.get(cacheKey);
  if (hit) return hit;
  const cfgs = new Map<string, number>();
  for (const tp of sigTapes) {
    const pair = `${tp.bot}|${tp.ind}`;
    cfgs.set(pair, (cfgs.get(pair) ?? 0) + 1);
  }
  const acc = new Map<string, Map<number, [number, number, number, number]>>();
  let done = 0;
  // slices by trades, not tapes (a signal tape holds thousands: 100 tapes were one 0.8 s step at 21 symbols); the
  // key and its bucket map are resolved once per symbol slot of the tape, not per trade (same insertion order)
  let work = 0;
  for (const tp of sigTapes) {
    done++;
    const pair = `${tp.bot}|${tp.ind}`;
    const k = cfgs.get(pair)!;
    const slot: Array<Map<number, [number, number, number, number]> | undefined> = new Array(tp.syms.length);
    for (let i = 0; i < tp.n; i++) {
      const si = tp.symI[i];
      let m = slot[si];
      if (!m) {
        const key = `${pair}|${tp.syms[si]}`;
        m = acc.get(key);
        if (!m) acc.set(key, (m = new Map()));
        slot[si] = m;
      }
      const hb = Math.floor(tp.exitT[i] / H);
      let x = m.get(hb);
      if (!x) m.set(hb, (x = [0, 0, 0, 0]));
      const r = tp.r[i];
      x[0] += (r * 100) / k;
      if (r > 0) x[1] += r;
      else x[2] -= r;
      x[3] += 1 / k;
    }
    work += tp.n + 1;
    if (work >= 20_000) {
      work = 0;
      yield done;
    }
  }
  const out: SignalGroup[] = [];
  let built = 0;
  for (const [key, m] of acc) {
    if (++built % 200 === 0) yield done;
    const i2 = key.lastIndexOf("|");
    const hs = [...m.keys()].sort((x, y) => x - y);
    const g: SignalGroup = {
      pair: key.slice(0, i2),
      src: signalSourceOf(key.slice(key.indexOf("|") + 1, i2)),
      sym: key.slice(i2 + 1),
      h: new Float64Array(hs),
      net: new Float64Array(hs.length),
      gp: new Float64Array(hs.length),
      gl: new Float64Array(hs.length),
      n: new Float64Array(hs.length),
    };
    hs.forEach((hb, j) => {
      const x = m.get(hb)!;
      g.net[j] = x[0];
      g.gp[j] = x[1];
      g.gl[j] = x[2];
      g.n[j] = x[3];
    });
    out.push(g);
  }
  if (cacheKey) signalIndexCache.set(cacheKey, out);
  return out;
}

/**
 * Source stability on its executed (taken) signal orders: the orders of the source closed in the `days` × 24 h
 * before t, in 24-hour buckets counted back from t. Unstable = at least `minTrades` of them and negative in sum,
 * or positive in fewer than `minShare` of the buckets it traded in. A source without enough executed history is
 * not judged (it trades).
 */
export function sourceUnstable(
  closed: ReadonlyArray<{ exitT: number; r: number }> | undefined,
  t: number,
  gate: { days: number; minShare: number; minTrades?: number },
): boolean {
  if (!closed?.length) return false;
  const from = t - gate.days * 24 * H;
  const buckets = new Map<number, number>();
  let n = 0;
  let sum = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    const x = closed[i];
    if (x.exitT > t) continue;
    if (x.exitT <= from) break;
    n++;
    sum += x.r;
    const b = Math.floor((t - x.exitT) / (24 * H));
    buckets.set(b, (buckets.get(b) ?? 0) + x.r);
  }
  if (n < (gate.minTrades ?? 5)) return false;
  let pos = 0;
  for (const v of buckets.values()) if (v > 0) pos++;
  return sum < 0 || pos < gate.minShare * buckets.size;
}

/**
 * The active signals at time t, causally: every signal (pair × symbol) judged on its tapes' results in the hours
 * that closed completely in the `windowH` hours before t (hourly resolution: drawdown over hourly steps), averaged
 * over the signal's configs, then ranked by the same rules as the Base ranking (activeSignals: drawdown /
 * consistency / latest-24 h validation, the best `count`).
 */
export function activeSignalsAt(
  sigTapes: readonly ConfigTape[] | SignalGroup[],
  t: number,
  sig: SignalSettings,
  windowH: number,
): Set<string> {
  const groups =
    sigTapes.length && "h" in sigTapes[0]
      ? (sigTapes as SignalGroup[])
      : signalIndex(sigTapes as readonly ConfigTape[]);
  const endB = Math.floor(t / H); // buckets < endB closed completely by t
  const fromB = endB - windowH;
  const recentB = endB - (sig.validateH ?? 24);

  const byPair = new Map<string, Record<string, SymStat>>();
  const hb = (x: Float64Array, v: number) => {
    let lo = 0;
    let hi = x.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (x[m] < v) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  for (const g of groups) {
    const a = hb(g.h, fromB);
    const b = hb(g.h, endB);
    if (a >= b) continue;
    let cum = 0;
    let peak = 0;
    let dd = 0;
    let gp = 0;
    let gl = 0;
    let n = 0;
    let recentN = 0;
    let recentNet = 0;
    let blocks = 0;
    let ok = 0;
    let blk = NaN;
    let blkSum = 0;
    for (let j = a; j < b; j++) {
      cum += g.net[j];
      if (cum > peak) peak = cum;
      if (peak - cum > dd) dd = peak - cum;
      gp += g.gp[j];
      gl += g.gl[j];
      n += g.n[j];
      if (g.h[j] >= recentB) {
        recentN += g.n[j];
        recentNet += g.net[j];
      }
      const bk = Math.floor(g.h[j] / 4);
      if (bk !== blk) {
        if (blocks && blkSum > 0) ok++;
        blocks++;
        blk = bk;
        blkSum = 0;
      }
      blkSum += g.net[j];
    }
    if (blocks && blkSum > 0) ok++;
    let rec = byPair.get(g.pair);
    if (!rec) byPair.set(g.pair, (rec = {}));
    rec[g.sym] = {
      n,
      net: cum,
      pf: profitFactor(gp, gl),
      dd,
      okShare: blocks ? ok / blocks : 0,
      recentN,
      recentNet,
    };
  }
  const pairs = [...byPair];
  return activeSignals(
    pairs.map(([pair, bySym]) => {
      const i = pair.indexOf("|");
      return { bot: pair.slice(0, i), ind: pair.slice(i + 1), bySym };
    }),
    sig,
  );
}

/**
 * Best-first order of candidates entering at the same time (lower = earlier): engine sets before signals (engine
 * PF 2.4–2.8 vs signals 1.0–1.5 on real data); engine sets by their selection score, best first; signals by their
 * active ranking (the order of `signalActive`: recovery factor), best first.
 */
export function bestFirst(
  picks: ReadonlyArray<{ id: string; score: number }>,
  o: Pick<WalkForwardOptions, "signalActive" | "bestFirst">,
): (tp: ConfigTape, sym: string) => number {
  if (o.bestFirst === false) return () => 0;
  const rank = new Map(
    [...picks].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1)).map((p, i) => [p.id, i]),
  );
  const sigRank = new Map([...(o.signalActive ?? [])].map((k, i) => [k, i]));
  const E = rank.size + 1;
  return (tp, sym) => {
    const r = rank.get(tp.id);
    if (r !== undefined) return r;
    if (isSignalInd(tp.ind)) return E + (sigRank.get(`${tp.bot}|${tp.ind}|${sym}`) ?? sigRank.size);
    return E - 1; // held / unranked engine set
  };
}

/**
 * Engine tapes (selected into Real seats) and signal tapes (every config of an active signal runs on its own;
 * none when signals are off).
 */
export function splitSignalTapes(
  tapes: readonly ConfigTape[],
  o: Pick<WalkForwardOptions, "signalActive" | "signalRank">,
): { engine: readonly ConfigTape[]; signal: ConfigTape[] } {
  if (!tapes.some((t) => isSignalInd(t.ind))) return { engine: tapes, signal: [] };
  // ranked per step: every signal tape is a candidate, the step's active set gates it
  if (o.signalRank)
    return {
      engine: tapes.filter((t) => !isSignalInd(t.ind)),
      signal: tapes.filter((t) => isSignalInd(t.ind)),
    };
  const pairs = new Set([...(o.signalActive ?? [])].map((k) => k.split("|").slice(0, 2).join("|")));
  return {
    engine: tapes.filter((t) => !isSignalInd(t.ind)),
    signal: o.signalActive
      ? tapes.filter((t) => isSignalInd(t.ind) && pairs.has(`${t.bot}|${t.ind}`))
      : [],
  };
}

/** The active signal set a step recorded for an entry at t (the last step starting at or before t). */
export function signalSetAt(
  steps: ReadonlyArray<{ t: number; keys: readonly string[] }>,
  t: number,
): ReadonlySet<string> | undefined {
  let lo = 0;
  let hi = steps.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (steps[m].t <= t) lo = m + 1;
    else hi = m;
  }
  return lo ? new Set(steps[lo - 1].keys) : undefined;
}

/**
 * Min-heap by (exit time, insertion order): pops in exactly the order a stable insertion sort by exit time gives,
 * at O(log n) per change. The walk-forward kept its open orders and pending candidates in sorted arrays (a linear
 * insertion and an O(n) shift per close): with every config its own seat that was tens of thousands of entries
 * moved per candidate. `items` is the heap's own array (heap order) for order-free scans.
 */
export class ExitHeap<T> {
  readonly items: T[] = [];
  private ts: number[] = [];
  private ss: number[] = [];
  private seq = 0;
  get size() {
    return this.items.length;
  }
  /** the smallest exit time (Infinity when empty) */
  peekT(): number {
    return this.items.length ? this.ts[0] : Infinity;
  }
  push(t: number, v: T) {
    let i = this.items.length;
    this.items.push(v);
    this.ts.push(t);
    this.ss.push(this.seq++);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): T | undefined {
    const n = this.items.length;
    if (!n) return undefined;
    const top = this.items[0];
    const v = this.items.pop()!;
    const t = this.ts.pop()!;
    const s = this.ss.pop()!;
    if (n > 1) {
      this.items[0] = v;
      this.ts[0] = t;
      this.ss[0] = s;
      const m = n - 1;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let b = i;
        if (l < m && this.less(l, b)) b = l;
        if (r < m && this.less(r, b)) b = r;
        if (b === i) break;
        this.swap(i, b);
        i = b;
      }
    }
    return top;
  }
  private less(a: number, b: number) {
    return this.ts[a] < this.ts[b] || (this.ts[a] === this.ts[b] && this.ss[a] < this.ss[b]);
  }
  private swap(a: number, b: number) {
    const v = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = v;
    const t = this.ts[a];
    this.ts[a] = this.ts[b];
    this.ts[b] = t;
    const s = this.ss[a];
    this.ss[a] = this.ss[b];
    this.ss[b] = s;
  }
}

const bump = (m: Map<string, number>, k: string, d: number) => {
  const v = (m.get(k) ?? 0) + d;
  if (v) m.set(k, v);
  else m.delete(k);
};

/**
 * Counts of the executed open orders the caps read, kept as orders open and close: O(1) per candidate instead of
 * four scans of every open order (dupe, per symbol, total, per side) and a fifth for the position cap.
 * Engine and signal orders are counted apart (each class has its own caps).
 */
export class OpenCounts {
  private keys = new Map<string, number>();
  private sym = new Map<string, number>();
  private side = new Map<string, number>();
  private pos = new Map<string, number>();
  private all = [0, 0];
  private positions = [0, 0];
  add(x: { cfg: string; sym: string; side: number }, d: 1 | -1) {
    const c = sigCfg(x.cfg) ? 1 : 0;
    bump(this.keys, `${x.sym}|${x.cfg}`, d);
    bump(this.sym, `${c}|${x.sym}`, d);
    bump(this.side, `${c}|${x.side}`, d);
    const pk = `${c}|${x.sym}|${x.side}`;
    const before = this.pos.get(pk) ?? 0;
    bump(this.pos, pk, d);
    if (d > 0 && before === 0) this.positions[c]++;
    else if (d < 0 && before === 1) this.positions[c]--;
    this.all[c] += d;
  }
  /** the same config already holds an order on the symbol */
  dupe(sym: string, cfg: string) {
    return this.keys.has(`${sym}|${cfg}`);
  }
  perSymbol(sym: string, signal: boolean) {
    return this.sym.get(`${signal ? 1 : 0}|${sym}`) ?? 0;
  }
  open(signal: boolean) {
    return this.all[signal ? 1 : 0];
  }
  perSide(side: number, signal: boolean) {
    return this.side.get(`${signal ? 1 : 0}|${side}`) ?? 0;
  }
  /** positionsFull on the counts: opening sym × side would exceed the cap on distinct positions of its class */
  positionsFull(sym: string, side: number, signal: boolean, cap: number | undefined) {
    if (!cap || cap <= 0) return false;
    const c = signal ? 1 : 0;
    if (this.pos.has(`${c}|${sym}|${side}`)) return false;
    return this.positions[c] >= cap;
  }
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
  const open = new ExitHeap<Trade>(); // taken, by exit
  const counts = new OpenCounts(); // the caps' counts of the taken orders still open
  const hourNet = new Map<number, number>();
  const skips: Record<string, number> = {};
  const skip = (why: string) => (skips[why] = (skips[why] ?? 0) + 1);
  // Block sources: every Real candidate's simulated result, entered into the book when it closes (causal)
  const book = blockBookOf(o.block);
  const guard = new SignalGuard();
  // every candidate in exit order, collected as they settle (the heap pops in the order of a stable sort by exit:
  // sorting the whole feed at the end was one long slice)
  const feed: BlockFeedEntry[] = [];
  const vopen = new ExitHeap<BlockFeedEntry>(); // candidates not closed yet, by exit
  const seen = new Map<string, BlockFeedEntry>();
  // Stable-02 Block coordination on every closed candidate (the Block feed)
  const s2 =
    o.coord?.enabled && (o.coord.s2Windows || o.coord.s2RelVolume)
      ? new S2Coord({
          windows: !!o.coord.s2Windows,
          windowN: o.coord.s2Steps ?? 6,
          pauseN: o.coord.s2Pause ?? o.coord.s2Steps ?? 6,
          relVolume: !!o.coord.s2RelVolume,
          ratio: o.coord.s2Increase ?? 0.4,
          minPf: 1.25,
          maxMult: 1.8,
          evalH: 2,
        })
      : null;
  // executed signal orders per source, in exit order (source stability gate)
  const srcClosed = new Map<string, Array<{ exitT: number; r: number }>>();
  const settle = (t: number) => {
    while (vopen.size && vopen.peekT() <= t) {
      const fx = vopen.pop()!;
      feed.push(fx);
      feedBooks(fx, book, guard);
      s2?.close(fx);
    }
    while (open.size && open.peekT() <= t) {
      const x = open.pop()!;
      counts.add(x, -1);
      const k = Math.floor(x.exitT / H);
      hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
      if (sigCfg(x.cfg)) {
        const src = signalSourceOf(x.cfg.split("|")[1]);
        let l = srcClosed.get(src);
        if (!l) srcClosed.set(src, (l = []));
        l.push({ exitT: x.exitT, r: x.r });
      }
    }
  };

  // (tape, trade index) by entry time; ranked per step: only the step's active signals are materialised
  const sigCands: Array<{ e: number; i: number; tp: ConfigTape; key: string }> = [];
  let built = 0;
  for (const tp of sigTapes) {
    if (++built % 200 === 0) yield -1; // (a slice, not a simulated step)
    const pair = `${tp.bot}|${tp.ind}|`;
    for (let i = 0; i < tp.n; i++) {
      const e = tp.entryT[i];
      if (e < startT || e >= stopT) continue;
      const key = pair + tp.syms[tp.symI[i]];
      if (o.signalRank || !o.signalActive || o.signalActive.has(key))
        sigCands.push({ e, i, tp, key });
    }
  }
  sigCands.sort((a, b) => a.e - b.e);
  let sp = 0;
  let held = new Set<string>();
  // re-evaluating more often than one bar cannot change anything: the step is at least one bar
  const barH = (u.baseTf ?? u.bars[0]?.tfMin ?? 60) / 60;
  const stepH = Math.max(o.stepH, barH);
  const signalSteps: Array<{ t: number; keys: string[] }> = [];
  // the hourly signal index, shared by every run over the same tape set
  // (its slices yield −1: not a simulated step)
  let sigIdx: SignalGroup[] = [];
  if (o.signalRank && sigTapes.length) {
    const ig = signalIndexGen(sigTapes, tapes);
    for (let r = ig.next(); ; r = ig.next()) {
      if (r.done) {
        sigIdx = r.value;
        break;
      }
      yield -1;
    }
  }
  let stepOpts: WalkForwardOptions = o;
  // the step's hedge-only signals (negative-hour hedge; outside the ranked set)
  let hedgeKeys = new Set<string>();
  for (let t = startT; t < stopT; t += stepH * H) {
    // every order closed before the step counts for this step's decisions (hedge hours, coordination state)
    settle(t);
    if (o.signalRank && sigTapes.length) {
      const act = activeSignalsAt(sigIdx, t, o.signalRank, Math.max(o.longH, o.preH));
      hedgeKeys = new Set();
      if (o.coord?.enabled && o.coord.hedge) {
        const neg = new Set<number>();
        for (const [h, v] of hourNet) if (v < 0 && h < Math.floor(t / H)) neg.add(h);
        for (const k of hedgeSignalsAt(sigIdx, t, neg, Math.max(o.longH, o.preH), {
          minN: o.coord.hedgeMinN ?? HEDGE_DEFAULTS.minN,
          minPf: o.coord.hedgeMinPf ?? HEDGE_DEFAULTS.minPf,
        }))
          if (!act.has(k)) hedgeKeys.add(k);
      }
      const all = hedgeKeys.size ? new Set([...act, ...hedgeKeys]) : act;
      stepOpts = { ...o, signalActive: all };
      signalSteps.push({ t, keys: [...all] });
      yield -1; // (a slice: the ranking and the step's executions are separate pieces of work)
    }
    // fixed mode in slices (the selection scores every tape)
    const sel = o.mode === "fixed" ? yield* selectFixedGen(selTapes, t, o) : null;
    const { picks, eligible } = withProbe(
      o.mode === "durable"
        ? selectDurable(selTapes, t, o, held)
        : o.mode === "fixed"
          ? sel!
          : selectAt(selTapes, t, o),
      selTapes,
      t,
      o,
    );
    held = new Set(picks.map((p) => p.id));
    const cands: Array<{ tr: Trade; tp: ConfigTape }> = [];
    let pi = 0;
    for (const p of picks) {
      if (++pi % 500 === 0) yield -1;
      const tp = byId.get(p.id)!;
      // a trade entering in [t, t + step) exits at or after t: the scan starts at the first exit ≥ t (exit order)
      for (let i = lowerBound(tp.exitT, t); i < tp.n; i++) {
        const e = tp.entryT[i];
        if (e >= t && e < t + stepH * H && e < stopT) cands.push({ tr: tradeAt(tp, i), tp });
      }
    }
    while (sp < sigCands.length && sigCands[sp].e < t + stepH * H) {
      const c = sigCands[sp++];
      if (o.signalRank && !stepOpts.signalActive?.has(c.key)) continue;
      cands.push({ tr: tradeAt(c.tp, c.i), tp: c.tp });
    }
    // best first: at the same entry time the better candidate takes a capped slot first
    const prio = bestFirst(picks, stepOpts);
    cands.sort(
      (a, b) =>
        a.tr.entryT - b.tr.entryT ||
        prio(a.tp, a.tr.sym) - prio(b.tp, b.tr.sym) ||
        a.tr.cfg.localeCompare(b.tr.cfg),
    );
    let taken = 0;
    let skipped = 0;
    let net = 0;
    let ci = 0;
    for (const { tr, tp } of cands) {
      // a busy step is worked through in slices
      if (++ci % 300 === 0) yield -1;
      settle(tr.entryT);
      // the candidate's own result feeds the Block sources when it closes, whether it executes or not
      const fk = `${tr.cfg}|${tr.sym}|${tr.entryT}`;
      let fx = seen.get(fk);
      if (!fx) {
        const fe = blockEntryOf(tr);
        fx = { exitT: tr.exitT, ...fe };
        seen.set(fk, fx);
        vopen.push(fx.exitT, fx);
      }
      const hourKey = Math.floor(tr.entryT / H);
      let why = "";
      // engine orders and signal orders are capped each on their own (same class only)
      const cls = sigCfg(tr.cfg);
      const caps = capsOf(o, cls);
      const gateOn = cls && o.signalSourceGate?.enabled;
      // hedge-only signal: trades while the book is losing (this or the previous hour), without confirmation
      const hedging =
        cls &&
        hedgeKeys.size > 0 &&
        hedgeKeys.has(`${tr.cfg.split("|").slice(0, 2).join("|")}|${tr.sym}`);
      const bookLosing =
        (!o.coord?.hedgePrevOnly && (hourNet.get(hourKey) ?? 0) < 0) ||
        (hourNet.get(hourKey - 1) ?? 0) < 0;
      const coordRaw = coordBlock(o.coord, tr, hourNet, open.items);
      const coordWhy =
        (hedging
          ? bookLosing
            ? coordRaw === "confirm"
              ? null
              : coordRaw
            : "hedgeIdle"
          : coordRaw) ??
        s2?.blocked(tr.sym) ??
        (gateOn &&
        sourceUnstable(
          srcClosed.get(signalSourceOf(tr.cfg.split("|")[1])),
          tr.entryT,
          o.signalSourceGate!,
        )
          ? "sourceUnstable"
          : null);
      if (o.guardPct > 0 && (hourNet.get(hourKey) ?? 0) <= -o.guardPct) why = "hourGuard";
      else if (coordWhy) why = coordWhy;
      else if (counts.dupe(tr.sym, tr.cfg)) why = "dupe";
      else if (counts.perSymbol(tr.sym, cls) >= caps.perSymbol) why = "perSymbol";
      else if (counts.open(cls) >= caps.maxOpen) why = "maxOpen";
      else if (counts.perSide(tr.side, cls) >= caps.perSide) why = "perSide";
      else if (counts.positionsFull(tr.sym, tr.side, cls, cls ? o.signalMaxPositions : o.maxPositions))
        why = "maxPositions";
      const dec = why
        ? null
        : execDecision(tp, tr.entryT, stepOpts, { book, guard, sym: tr.sym, side: tr.side });
      if (dec && !dec.ok) why = dec.why;
      if (why || !dec || !dec.ok) {
        skipped++;
        skip(why);
        continue;
      }
      // the sources that raised it pause once it closes positive (the feed entry carries them into the book)
      if (dec.vol > 1 && dec.src?.length) fx.bsrc = dec.src;
      // Stable-02 relation volume on top of the Block volume (the stack stays within the Block maximum)
      const stackCap = o.block.mode === "overall" ? 8 : o.block.maxMult;
      const cv = s2 ? Math.min(s2.volume(tr.entryT), Math.max(1, stackCap / dec.vol)) : 1;
      const x: Trade = {
        ...tr,
        r: tr.r * dec.vol * cv,
        vol: (tr.vol ?? 1) * dec.vol * cv,
        mult: dec.vol * cv,
        ...(cv !== 1 ? { coordVol: cv } : {}),
        ...(hedging ? { hedge: true } : {}),
        level: tp.kind.startsWith("dca") || tp.kind === "axis" ? tr.level : dec.level,
        ...(dec.legs ? { legs: dec.legs } : {}),
      };
      trades.push(x);
      taken++;
      net += x.r * 100;
      open.push(x.exitT, x);
      counts.add(x, 1);
    }
    steps.push({ t, main: eligible, real: picks.map((p) => p.id), taken, skipped, net });
    yield t;
  }

  trades.sort((a, b) => a.exitT - b.exitT);
  yield -1; // (summary slices, not simulated steps)
  const stats = statsOf(trades, stopT);
  yield -1;
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
  yield -1;
  const blockH = 8;
  const blocks: WalkForwardResult["blocks"] = [];
  for (let b = startT; b < stopT; b += blockH * H) {
    const s = statsOf(trades.filter((x) => x.exitT >= b && x.exitT < b + blockH * H));
    blocks.push({ t: b, n: s.n, pf: s.pf, net: s.net });
  }
  yield -1;
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
  // the end-of-run state paper / live continue from: every order closed by the end counts
  settle(stopT);
  // candidates still open at the end close the feed, in exit order (they never reached the books)
  while (vopen.size) feed.push(vopen.pop()!);
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
    feed,
    ...(s2 ? { s2: s2.snapshot(stopT) } : {}),
    ...(o.coord?.enabled && o.coord.hedge && sigIdx.length
      ? {
          hedgeEnd: [
            ...hedgeSignalsAt(
              sigIdx,
              stopT,
              new Set(
                [...hourNet].filter(([h, v]) => v < 0 && h < Math.floor(stopT / H)).map(([h]) => h),
              ),
              Math.max(o.longH, o.preH),
              {
                minN: o.coord.hedgeMinN ?? HEDGE_DEFAULTS.minN,
                minPf: o.coord.hedgeMinPf ?? HEDGE_DEFAULTS.minPf,
              },
            ),
          ],
        }
      : {}),
    ...(o.signalRank
      ? {
          signalSteps,
          signalActiveEnd: sigTapes.length
            ? [...activeSignalsAt(sigIdx, stopT, o.signalRank, Math.max(o.longH, o.preH))]
            : [],
        }
      : {}),
  };
}
