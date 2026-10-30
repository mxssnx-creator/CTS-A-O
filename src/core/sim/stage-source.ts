import type { AxisConfig, Bars, DcaConfig, OpenPosition, Protect, Side, Trade } from "../domain/types.ts";
import { simulate, type SimOptions } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";
import type { SimulationEntry } from "./entry-admission.ts";
import type { StageSet } from "./stage-chain.ts";

interface SourceBase {
  cfg: string;
  bars: Bars;
  /** Original Base direction. Each processed context owns only this source direction. */
  side: Side;
  signal: Int8Array;
  protect: Protect;
  cost: number;
  cooldown?: number;
}
export type StageSource = SourceBase & (
  | { kind: "normal" | "trailing" | "trailing-only" | "exit"; options?: Omit<SimOptions, "cost" | "cooldown" | "admitEntry" | "sink" | "cursor"> }
  | { kind: "dca" | "dca-active"; dca: DcaConfig }
  | { kind: "axis"; axis: AxisConfig; center: Float64Array; atr: Float64Array;
      floor?: { minSl: number; minTrail?: number; maxSl?: number; slMult?: number } }
);
export interface StageSourceResult {
  /** Required wrapper provenance: these orders must never be pooled by their Base cfg alone. */
  setId: string;
  baseConfigId: string;
  parentSetId: string | null;
  admissionPolicy: string;
  trades: Trade[];
  open: OpenPosition | null;
  pending: Side | 0;
  pendingProtect?: Protect;
  /** A signal intent is not a filled or held order. No next-open price is fabricated for its qualification. */
  pendingIntent?: StagePendingIntent & { state: "awaiting-validation" | "rejected" | "qualified" };
}
export type StageSourceAdmission = (entry: SimulationEntry & { readonly setId: string }) => boolean;
export interface StagePendingIntent {
  readonly setId: string;
  readonly cfg: string;
  readonly sym: string;
  readonly side: Side;
  readonly signalCloseT: number;
  /** Expected decision clock; actual fill ownership and entry price are still unknown. */
  readonly entryT: number;
}
export type StagePendingAdmission = (intent: StagePendingIntent) => boolean;

/**
 * Re-run the actual strategy and protection rules on the set's direction, prices and cost.
 * Inverse means invert the source intent before simulation, never negate a settled return or copy an exit.
 * Rejected entries cannot hold the stage's position, waiting-limit or resting-rung slot.
 * This constructor is an adapter primitive, not proof of production admission or exchange execution.
 */
export function simulateStageSource(set: StageSet, source: StageSource, admit: StageSourceAdmission,
  admitPending?: StagePendingAdmission): StageSourceResult {
  if (!["main", "real"].includes(set.stage) || set.identity.baseConfigId !== source.cfg ||
    set.identity.symbol !== source.bars.sym || set.identity.kind !== source.kind ||
    !["normal", "trailing", "trailing-only", "exit", "dca", "dca-active", "axis"].includes(source.kind) ||
    !["direct", "inverse"].includes(set.variant) ||
    set.identity.side !== (set.variant === "inverse" ? -source.side : source.side) ||
    (source.side !== 1 && source.side !== -1) || source.signal.length < source.bars.n ||
    !Number.isFinite(source.cost) || source.cost < 0 || typeof admit !== "function")
    throw new TypeError("processed source requires its exact set, direction, prices, strategy and cost");
  const signal = new Int8Array(source.bars.n);
  for (let i = 0; i < source.bars.n; i++) {
    const s = source.signal[i];
    if (s !== 0 && s !== source.side) throw new TypeError("processed source cannot borrow another Base direction");
    signal[i] = s === 0 ? 0 : set.identity.side;
  }
  const admitEntry = (entry: SimulationEntry) => admit({ ...entry, setId: set.id });
  let result: { trades: Trade[]; open?: OpenPosition | null; pending: Side | 0; pendingProtect?: Protect };
  if ("dca" in source) {
    result = simulateDca(source.cfg, source.bars, signal, source.protect, source.dca, source.kind === "dca-active",
      source.cost, source.cooldown, undefined, admitEntry);
  } else if ("axis" in source) {
    if (source.center.length < source.bars.n || source.atr.length < source.bars.n)
      throw new TypeError("processed Axis source is missing its independent price calculations");
    result = source.axis.mode === "desk"
      ? simulateAxisDesk(source.cfg, source.bars, signal, source.protect, source.axis, source.center, source.atr,
        source.cost, source.cooldown, source.floor ? { minSl: source.floor.minSl, minTrail: source.floor.minTrail ?? 0,
          ...(source.floor.maxSl !== undefined ? { maxSl: source.floor.maxSl } : {}) } : undefined, undefined, admitEntry)
      : simulateAxis(source.cfg, source.bars, signal, source.protect, source.axis, source.center, source.atr,
        source.cost, source.cooldown, source.floor, undefined, admitEntry);
  } else {
    result = simulate(source.cfg, source.bars, signal, source.protect,
      { ...source.options, cost: source.cost, cooldown: source.cooldown, admitEntry });
  }
  let pending = result.pending, pendingIntent: StageSourceResult["pendingIntent"];
  if (pending) {
    const t = source.bars.t[source.bars.n - 1] + source.bars.tfMin * 60_000;
    const intent: StagePendingIntent = { setId: set.id, cfg: source.cfg, sym: source.bars.sym,
      side: pending, signalCloseT: t, entryT: t };
    const allowed = admitPending ? admitPending(intent) : false;
    if (typeof allowed !== "boolean") throw new TypeError("pending stage admission must return a boolean");
    pendingIntent = { ...intent, state: !admitPending ? "awaiting-validation" : allowed ? "qualified" : "rejected" };
    if (!allowed) pending = 0;
  }
  return { setId: set.id, baseConfigId: source.cfg, parentSetId: set.parentSetId, admissionPolicy: set.admissionPolicy, ...result,
    pending, ...(pendingIntent ? { pendingIntent } : {}),
    trades: result.trades.map((t) => ({ ...t, kind: source.kind, mult: 1 })), open: result.open ?? null };
}
