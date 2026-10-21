// Incremental tapes: a config's tape continued from the last processed bar instead of rebuilt (the incremental cycle,
// runtime.cycle "incremental"). Only the kinds in RESUME_KINDS continue from a stored simulation state; every other
// kind is rebuilt on a bounded tail (the realtime entry step's path) — the lists are explicit and pinned by
// tape-extend.test.ts.
//
// Contract: on a series that only GROWS at the end (same first bar, the earlier bars unchanged — closed bars never
// change) and an entry signal that is causal (prefix-stable: tape-prefix-causal.test.ts), seedTape + extendTape give
// the tape buildTapes gives on the grown series: the same trades in the same order, the same open positions and
// pending entries. A series whose start moved (a sliding tail) or whose stored bars changed cannot be continued:
// extendTape returns null and the caller rebuilds.
import type { OpenPosition, Protect, StratKind, Tactics, Trade } from "../domain/types.ts";
import type { Universe } from "../pipeline/pipeline.ts";
import { evaluationSignal, seriesOf } from "../pipeline/pipeline.ts";
import { entrySignal } from "../bots/bots.ts";
import { isSignalInd } from "../indications/registry.ts";
import { tacticCooldown } from "../indications/filters.ts";
import { ATR_PERIOD, simulateFrom, splitSides, type SimState } from "./backtest.ts";
import {
  makeTape,
  REASONS,
  symbolIndex,
  tapeBytes,
  tapeViews,
  type ConfigTape,
} from "./walkforward.ts";

/** Tape kinds that continue from a stored simulation state (Normal, Trailing and their ATR protects). */
export const RESUME_KINDS: readonly StratKind[] = ["normal", "trailing"];
/** Tape kinds rebuilt on a bounded tail in the incremental cycle (DCA, Axis; signal indications and Exit by their ind). */
export const TAIL_REBUILD_KINDS: readonly StratKind[] = ["dca", "dca-active", "axis"];

/** Whether a tape continues from stored state: a Normal / Trailing config of an engine indication (not a signal). */
export function isResumable(tp: Pick<ConfigTape, "kind" | "ind">): boolean {
  return RESUME_KINDS.includes(tp.kind) && !isSignalInd(tp.ind);
}

/** One simulated run's end: the series it ran on (to prove the continuation is on the same bars) and its state. */
export interface RunState {
  firstT: number;
  n: number;
  lastT: number;
  sim: SimState;
}
/** A resumable tape's runs, by `symbol@tf:direction`. */
export interface TapeResume {
  runs: Map<string, RunState>;
  /** Indicator-only warmup must never become evaluated entry history during continuation. */
  evaluationFromT?: number;
}

interface Run {
  trades: Trade[];
  open: OpenPosition[];
  pending: ConfigTape["pending"];
  resume: TapeResume;
}

/** The runs of one config on `u` (all bars, or only those after the stored state). Null: cannot continue. */
function runConfig(
  tp: Pick<ConfigTape, "id" | "bot" | "ind" | "protect" | "kind">,
  u: Universe,
  cost: number,
  tactics: Tactics | null | undefined,
  prev: TapeResume | null,
): Run | null {
  if (prev && prev.evaluationFromT !== u.evaluationFromT) return null;
  const trades: Trade[] = [];
  const open: OpenPosition[] = [];
  const pending: ConfigTape["pending"] = [];
  const runs = new Map<string, RunState>();
  const cooldown = tacticCooldown(tactics);
  const p: Protect = tp.protect;
  for (const s of seriesOf(u, tp.ind)) {
    const bars = u.bars[s];
    const raw = entrySignal(tp.bot, tp.ind, u.caches[s], tactics);
    if (!raw) return null;
    const sig = evaluationSignal(u, bars, raw);
    // one run per direction (as buildTapes: long and short each their own slot); a one-sided signal is its own run
    const sides = splitSides(sig);
    const dirs: Array<[number, Int8Array]> =
      sides.length === 2
        ? [
            [1, sides[0]],
            [-1, sides[1]],
          ]
        : [[firstSide(sig), sig]];
    for (const [d, sg] of dirs) {
      if (d === 0) continue; // no entry at all: nothing to run
      const key = `${bars.sym}@${bars.tfMin}:${d}`;
      const was = prev?.runs.get(key);
      if (was) {
        // the continuation must be on the very bars it stopped on
        if (bars.n < was.n || bars.t[0] !== was.firstT || bars.t[was.n - 1] !== was.lastT)
          return null;
      }
      const res = simulateFrom(
        tp.id,
        bars,
        sg,
        p,
        { cost, cooldown, atr: p.atr ? u.caches[s].atrEma(ATR_PERIOD) : undefined },
        was?.sim ?? null,
      );
      for (const tr of res.trades) {
        tr.kind = tp.kind;
        trades.push(tr);
      }
      if (res.open) open.push(res.open);
      if (res.pending)
        pending.push(
          res.pendingProtect
            ? { sym: bars.sym, side: res.pending, protect: res.pendingProtect }
            : { sym: bars.sym, side: res.pending },
        );
      runs.set(key, { firstT: bars.t[0], n: bars.n, lastT: bars.t[bars.n - 1], sim: res.state });
    }
  }
  return { trades, open, pending, resume: { runs, evaluationFromT: u.evaluationFromT } };
}

function firstSide(sig: Int8Array): number {
  for (let i = 0; i < sig.length; i++) if (sig[i] !== 0) return sig[i] > 0 ? 1 : -1;
  return 0;
}

/**
 * The tape of a config built from scratch on `u` together with its resumable state. Same trades / open / pending as
 * the tape buildTapes gives for it (its fromT and heldOnly are copied from `like`, when given).
 */
export function seedTape(
  like: Pick<ConfigTape, "id" | "bot" | "ind" | "protect" | "kind" | "syms" | "fromT" | "heldOnly">,
  u: Universe,
  cost: number,
  tactics?: Tactics | null,
): { tape: ConfigTape; resume: TapeResume } | null {
  if (!isResumable(like)) return null;
  const r = runConfig(like, u, cost, tactics, null);
  if (!r) return null;
  const tape = makeTape(
    like.id,
    like.bot,
    like.ind,
    like.protect,
    like.kind,
    like.syms,
    r.trades,
    r.open,
    r.pending,
  );
  if (like.fromT !== undefined) tape.fromT = like.fromT;
  if (like.heldOnly) tape.heldOnly = true;
  return { tape, resume: r.resume };
}

/**
 * `tp` continued over the bars `u` has gained since `resume`: only the new bars are simulated (the entry signal is
 * recomputed on the grown series, as it is shared by every config of the indication). The returned tape is a new
 * object (columns copied, new trades appended, prefix sums extended); `tp` is untouched. Null: the series is not an
 * extension of the stored one — rebuild.
 */
export function extendTape(
  tp: ConfigTape,
  resume: TapeResume,
  u: Universe,
  cost: number,
  tactics?: Tactics | null,
): { tape: ConfigTape; resume: TapeResume } | null {
  const r = runConfig(tp, u, cost, tactics, resume);
  if (!r) return null;
  const add = r.trades;
  // every new trade closes after every stored one (it closes on a bar the stored run had not seen)
  add.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  const last = tp.n ? tp.exitT[tp.n - 1] : -Infinity;
  if (add.length && add[0].exitT < last) return null;
  const m = add.length;
  const n = tp.n + m;
  const buf = new ArrayBuffer(tapeBytes(n));
  const v = tapeViews(buf, 0, n);
  const k = tp.n;
  v.exitT.set(tp.exitT.subarray(0, k));
  v.entryT.set(tp.entryT.subarray(0, k));
  v.r.set(tp.r.subarray(0, k));
  v.entry.set(tp.entry.subarray(0, k));
  v.exit.set(tp.exit.subarray(0, k));
  v.symI.set(tp.symI.subarray(0, k));
  v.side.set(tp.side.subarray(0, k));
  v.reason.set(tp.reason.subarray(0, k));
  v.bars.set(tp.bars.subarray(0, k));
  v.vol.set(tp.vol.subarray(0, k));
  v.level.set(tp.level.subarray(0, k));
  v.gp.set(tp.gp.subarray(0, k + 1));
  v.gl.set(tp.gl.subarray(0, k + 1));
  v.rs.set(tp.rs.subarray(0, k + 1));
  v.r2.set(tp.r2.subarray(0, k + 1));
  const symIdx = symbolIndex(tp.syms);
  for (let j = 0; j < m; j++) {
    const t = add[j];
    const i = k + j;
    v.exitT[i] = t.exitT;
    v.entryT[i] = t.entryT;
    v.r[i] = t.r;
    v.entry[i] = t.entry;
    v.exit[i] = t.exit;
    v.symI[i] = symIdx.get(t.sym) ?? 0;
    v.side[i] = t.side;
    v.reason[i] = Math.max(0, REASONS.indexOf(t.reason));
    v.bars[i] = Math.min(65535, t.bars);
    v.vol[i] = t.vol ?? 1;
    v.level[i] = Math.min(255, t.level ?? 0);
    const x = t.r;
    v.gp[i + 1] = v.gp[i] + (x > 0 ? x : 0);
    v.gl[i + 1] = v.gl[i] + (x < 0 ? -x : 0);
    v.rs[i + 1] = v.rs[i] + x;
    v.r2[i + 1] = v.r2[i] + x * x;
  }
  const tape: ConfigTape = { ...tp, n, ...v, open: r.open, pending: r.pending };
  return { tape, resume: r.resume };
}
