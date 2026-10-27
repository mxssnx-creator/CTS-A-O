// Live stage executor (BingX perpetual swap, self-contained client in ../exchange). Own CTSB tags only, so other
// sessions on the same account (e.g. CTSA) never see these tickets as theirs and this adapter never touches theirs.
//
// Safety:
//  - one live step at a time (module mutex); abandoned when the runtime generation changes (stop / watchdog)
//  - every request has a timeout; an entry is recorded as `pending` BEFORE it is sent, so a hung / retried
//    cycle can never send the same intent twice
//  - size never exceeds the configured notional (entry skipped if the exchange minimum is larger)
//  - SL/TP are priced from a fresh ticker; if protection cannot be placed, the position is closed at market
//  - own stop/target orders left behind on a flat symbol are cancelled
import { sizingSettings, unitNotional } from "../sizing.ts";
import { createHash } from "node:crypto";
import { isSignalInd } from "../indications/registry.ts";
import { signalActiveHas } from "../signals.ts";
import { rangeOfId, rangeVolumeFactorsOf } from "../minimal-coord.ts";
import { kindOfId, parseConfigId } from "../pipeline/pipeline.ts";
import { signalStopAt, isSignalConfig, signalTrailMax, isBoundedTrailingPosition, positionTrailMax } from "../sim/trailing.ts";
import { positionMult, runSubset, rangeVolumeFactorFor, type WalkForwardResult } from "../sim/walkforward.ts";
import type { CoreRuntime, LiveIntent } from "./runtime.server.ts";
import type { CoreDb } from "./db.server.ts";
import { reconcileVenueFees } from "./fill-fees.ts";
import { foreignExhaustionProof } from "./foreign-exit-cleanup.ts";
import { requestVenueIncome, venueIncomeSummary } from "./venue-history.server.ts";
import {
  attributeLanes,
  laneKeyOf,
  recordKeyOf,
  sideOfRow,
  type LaneOpen,
  type LaneStepInput,
  type LaneTrade,
  type OutsideWhy,
  type PxSrc,
} from "../live-record.ts";
import type { CandleSeries } from "../market/candle-series.ts";
import {
  coveredLanes,
  goneOrderOf,
  planLaneOrders,
  type LaneAction,
  type LaneOrder,
  type LaneWant,
} from "./lane-orders.ts";
import * as bx from "../exchange/bingx.server.ts";
import { exactVenueOrderId, exactVenueOrderIds } from "../exchange/venue-order-id.ts";
import { exchangePositionLimit, type LiveSettings } from "../config.ts";
import { promoteLaneKey, validPromotedLaneProof } from "../live-promote.ts";
import { promotionStatus, type LiveGate } from "../live-validation.ts";
import { isolateNewParents } from "./live-parent-isolation.ts";
import { observedUnlinkedExits, orphanCancelledZero, orphanFenceId, orphanFenceKeys, orphanObservationId,
  type OrphanExitFence } from "./orphan-exit-fence.ts";
import {
  BACKSTOP_MAX_DIST,
  controlOwnership,
  capHeldToOwn,
  closeFillsOf,
  outsideReduction,
  resizeExits,
  MERGED_TOL,
  ownLedger,
  controlTargets,
  externalCloses,
  isForeign,
  isOwnCoid,
  ownCoidKind,
  tpDistFor,
  tpFits,
  closedBy,
  verifyClose,
  isLiquidationType,
  laneCountsByKey,
  laneUnits,
  liveNetwork,
  entryCoidKind,
  makeCoid,
  MIN_RAISE_UNIT_X,
  minRaiseBlock,
  entryIntentKey,
  ownSymbols,
  outsideCloseOf,
  planControl,
  planLive,
  scaleToBudgets,
  scaleToExposure,
  scaleToRisk,
  positionCapFor,
  budgetBase,
  accountPositions,
  type AccountPosition,
  riskNotional,
  symRiskDist,
  RISK_PER_POSITION_DEFAULT,
  accountGrowthBlock,
  topConfigLanes,
  stateHash,
  type BookView,
  type ControlAction,
  type ControlContribution,
  type ControlTarget,
} from "./live.ts";

// Last status lookup is process-local; durable fences stay authoritative across restart.
const orphanFencePollAt = new WeakMap<CoreDb, Map<string, number>>();
const orphanFenceReplies = new WeakMap<CoreDb, Map<string, unknown>>();
const orphanFenceInFlight = new WeakMap<CoreDb, Set<string>>();

/**
 * Whether live.excludeRanges leaves this lane's config out. A range is a target band of Normal / Trailing configs:
 * "wide" is their untagged default-protect grid. Historic Exit, Signal, Axis and DCA configs are range-independent,
 * carry no range tag either but are not the Wide grid — signals are narrowed by live.source, Axis / DCA by
 * live.kinds — so excluding "wide" never stops them (it did: x01's "wide" exclusion silenced every signal lane).
 */
export function rangeExcluded(cfg: string, exRanges: ReadonlySet<string>): boolean {
  const c = cfgInfo(cfg);
  if (c.kind === "exit") return false;
  if (c.tag) return exRanges.has(c.tag);
  if (c.isSig) return false;
  if (
    c.kind !== "normal" &&
    c.kind !== "trailing" &&
    c.kind !== "trailing-only"
  )
    return false;
  return exRanges.has("wide");
}

/**
 * Whether live.excludeConfigs names this config's family (`bot|range`, the range "wide" when untagged). Signal configs
 * have no family here: live.source narrows them.
 */
export function configExcluded(cfg: string, exConfigs: ReadonlySet<string>): boolean {
  const c = cfgInfo(cfg);
  if (c.kind === "exit") return exConfigs.has(`${c.bot}|exit`);
  return !c.isSig && exConfigs.has(`${c.bot}|${c.tag || "wide"}`);
}

/**
 * A config id's parts the live filters read for every lane on every control step — its bot, indication, signal flag,
 * strategy kind and range tag — derived once per id (a split, a regex replace and a regex test per lane per step
 * before). Bounded: cleared past 200,000 ids.
 */
type CfgInfo = { bot: string; ind: string; isSig: boolean; kind: ReturnType<typeof kindOfId>; tag: string };
const cfgInfoMemo = new Map<string, CfgInfo>();
export function cfgInfo(cfg: string): CfgInfo {
  let x = cfgInfoMemo.get(cfg);
  if (!x) {
    if (cfgInfoMemo.size > 200_000) cfgInfoMemo.clear();
    const i1 = cfg.indexOf("|");
    const i2 = i1 < 0 ? -1 : cfg.indexOf("|", i1 + 1);
    const bot = i1 < 0 ? cfg : cfg.slice(0, i1);
    const ind = i1 < 0 ? "" : i2 < 0 ? cfg.slice(i1 + 1) : cfg.slice(i1 + 1, i2);
    x = { bot, ind, isSig: isSignalInd(ind), kind: kindOfId(cfg), tag: rangeOfId(cfg) || "" };
    cfgInfoMemo.set(cfg, x);
  }
  return x;
}

/**
 * What the operator lets reach the exchange, and which lanes ask for volume — shared by the live step and the
 * control preview. `sendable`: the strategy kinds of live.kinds (unset / empty = every kind), live.excludeRanges,
 * live.plainOnly (only lanes Block did not raise), live.source and the engine / signal proofs. `validLane`: sendable,
 * and a validated config — an engine config of the current selection, or a signal active on its symbol (no selection
 * yet = every lane).
 */
export function liveLaneFilter(
  s: Pick<
    LiveSettings,
    "kinds" | "source" | "excludeRanges" | "excludeConfigs" | "plainOnly" | "sideGates" | "promotedLanes"
  >,
  selected: ReadonlySet<string> | null,
  sigActive: { has(k: string): boolean } | null | undefined,
  /** live.engineProofN: the engine configs proven by their own closes (null = the proof is off) */
  proven: ReadonlySet<string> | null = null,
  /** live.signalProofN: the signal units (`ind|1`, `ind|-1`) proven by their own closes (null = the proof is off) */
  signalProven: ReadonlySet<string> | null = null,
  /** the exact post-Base / owned execution promotion gate of a lane (unset = no gate) */
  promotion?: (l: Pick<ControlContribution, "cfg" | "sym" | "side">) => boolean,
): {
  /** (a lane's side picks its signal unit; without one a signal config is proven on either side — never a control lane) */
  sendable: (
    l: Pick<ControlContribution, "cfg" | "vol"> &
      Partial<Pick<ControlContribution, "mult" | "blockVol">> & { sym?: string; side?: number },
  ) => boolean;
  validLane: (
    l: Pick<ControlContribution, "cfg" | "vol" | "sym" | "side"> &
      Partial<Pick<ControlContribution, "mult" | "blockVol">>,
  ) => boolean;
  /** live.excludeConfigs names the lane's family: its lanes never add volume, and a held key of them is closed */
  closedConfig: (l: Pick<ControlContribution, "cfg">) => boolean;
  /**
   * held back by the signal proof alone (every other filter lets it through): the funnel's reason. Lanes the engine
   * proof holds back are not counted here (the engine proof's funnel stays as it was).
   */
  unproven: (
    l: Pick<ControlContribution, "cfg" | "vol"> &
      Partial<Pick<ControlContribution, "mult" | "blockVol">> & { sym?: string; side?: number },
  ) => boolean;
} {
  const liveKinds = s.kinds?.length ? new Set<string>(s.kinds) : null;
  const src = s.source ?? "all";
  // ranges left out of live ("wide" = the default-protect grid, whose id carries no range tag)
  const exRanges = s.excludeRanges?.length ? new Set<string>(s.excludeRanges) : null;
  // engine families left out of live (bot|range, live.excludeConfigs)
  const exConfigs = s.excludeConfigs?.length ? new Set<string>(s.excludeConfigs) : null;
  const referenceProofs = s.promotedLanes
    ? new Map(s.promotedLanes.map((p) => [promoteLaneKey(p), p]))
    : null;
  const closedConfig = (l: Pick<ControlContribution, "cfg">) => !!exConfigs && configExcluded(l.cfg, exConfigs);
  type SendLane = Pick<ControlContribution, "cfg" | "vol"> &
    Partial<Pick<ControlContribution, "mult" | "blockVol">> & { sym?: string; side?: number };
  // every filter but the proofs
  const allowed = (l: SendLane) => {
    const c = cfgInfo(l.cfg);
    // the whole position's Block multiple (a Block Overall leg or the base lane beside it asks for one unit or less,
    // while the position is raised: judged lane by lane, plainOnly let every Overall position through), without the
    // indication volume factor (blockVol, when the lane carries no whole-position multiple)
    if (s.plainOnly && (l.mult ?? l.blockVol ?? l.vol ?? 1) > 1 + 1e-9) return false;
    if (liveKinds && !liveKinds.has(c.kind)) return false;
    if (exRanges && rangeExcluded(l.cfg, exRanges)) return false;
    if (closedConfig(l)) return false;
    if (src !== "all" && c.isSig !== (src === "signals")) return false;
    if (!c.isSig && s.promotedLanes !== undefined) {
      const side = l.side === 1 || l.side === -1 ? l.side : undefined;
      const proof = l.sym && side ? referenceProofs?.get(promoteLaneKey({ cfg: l.cfg, sym: l.sym, side })) : undefined;
      if (!validPromotedLaneProof(proof)) return false;
    }
    return true;
  };
  // the engine proof: an engine config not proven by its own closes trades on paper only. With live.sideGates the proof
  // is per side (keys cfg|1 / cfg|-1): a lane is judged on its own side (+1 / -1), a lane with no side on either
  const engineOk = (l: Pick<ControlContribution, "cfg"> & { side?: number }) => {
    if (!proven || cfgInfo(l.cfg).isSig) return true;
    if (s.sideGates !== true) return proven.has(l.cfg);
    const side = sideOfRow(l.side);
    if (side === undefined) return proven.has(recordKeyOf(l.cfg, 1)) || proven.has(recordKeyOf(l.cfg, -1));
    return proven.has(recordKeyOf(l.cfg, side));
  };
  // the signal proof: a signal unit (indicator × side) not proven by its own closes trades on paper only. With
  // live.sideGates a side that is not +1 or -1 is no side, judged on either (as engineOk does); ungated, a side that is
  // not positive is SHORT, as it always was
  const signalOk = (l: Pick<ControlContribution, "cfg"> & { side?: number }) => {
    if (!signalProven) return true;
    const c = cfgInfo(l.cfg);
    if (!c.isSig) return true;
    const side =
      s.sideGates === true
        ? sideOfRow(l.side)
        : l.side === undefined
          ? undefined
          : l.side > 0
            ? 1
            : -1;
    if (side === undefined)
      return signalProven.has(`${c.ind}|1`) || signalProven.has(`${c.ind}|-1`);
    return signalProven.has(`${c.ind}|${side}`);
  };
  const sendable = (l: SendLane) => allowed(l) && engineOk(l) && signalOk(l);
  const unproven = (l: SendLane) => allowed(l) && engineOk(l) && !signalOk(l);
  const validLane = (
    l: Pick<ControlContribution, "cfg" | "vol" | "sym" | "side"> &
      Partial<Pick<ControlContribution, "mult" | "blockVol">>,
  ) => {
    if (!sendable(l)) return false;
    if (promotion && !promotion(l)) return false;
    const c = cfgInfo(l.cfg);
    if (!c.isSig) return !selected || selected.has(l.cfg);
    // A Signal needs its exact config × symbol × direction evidence even without an engine selection filter. With
    // live.sideGates a lane with no side of its own is active on either side (as signalOk judges it)
    if (!sigActive) return true;
    if (s.sideGates === true && sideOfRow(l.side) === undefined) {
      return [1, -1].some((side) => signalActiveHas(sigActive, c.bot, c.ind, l.sym, side, c.kind, l.cfg));
    }
    return signalActiveHas(sigActive, c.bot, c.ind, l.sym, l.side, c.kind, l.cfg);
  };
  return { sendable, validLane, closedConfig, unproven };
}

const readyMemo = new WeakMap<object, { trades: WalkForwardResult["trades"]; open: WalkForwardResult["openAtEnd"]; n: number; openN: number;
  values: Map<string, { pf: number; n: number; stable: boolean; unknownReturns?: number }> }>();

/**
 * The readiness check (simulated run PF ≥ min and stable) on what this desk sends: when live.source, kinds,
 * excludeRanges or plainOnly narrow the configs that reach the exchange, the desk is judged on those configs' orders
 * settled accepted orders in the simulated run (before allocation), never configs it does not send or endpoint
 * marks. This is the first evidence axis; strict exact-lane owned execution proof is checked again at admission.
 */
export function liveReadiness(
  sim: Pick<WalkForwardResult, "stats" | "stable" | "startT" | "endT" | "trades" | "openAtEnd">,
  s: Pick<LiveSettings, "kinds" | "source" | "excludeRanges" | "excludeConfigs" | "plainOnly" | "promotedLanes">,
  minPf: number,
): { ok: boolean; why: string } {
  const referenceSelection = s.promotedLanes?.filter((p) => validPromotedLaneProof(p)).map(promoteLaneKey).sort().join(";");
  const parts = [
    s.source && s.source !== "all" ? s.source : "",
    s.kinds?.length ? `kinds ${s.kinds.join("/")}` : "",
    s.excludeRanges?.length ? `without ${s.excludeRanges.join("/")}` : "",
    s.excludeConfigs?.length ? `without ${s.excludeConfigs.join("/")}` : "",
    s.plainOnly ? "plain lanes" : "",
    s.promotedLanes !== undefined ? "exact reference proof lanes" : "",
  ].filter(Boolean);
  let r: { pf: number; n: number; stable: boolean; unknownReturns?: number };
  // a run without its orders (a summary) cannot be narrowed: it is judged whole
  const narrowed = parts.length > 0 && Array.isArray(sim.trades);
  if (Array.isArray(sim.trades)) {
    const key = `settled-unit-net-returns|${parts.join("|")}|${minPf}|${referenceSelection ?? "unmanaged"}`;
    let memo = readyMemo.get(sim);
    if (!memo || memo.trades !== sim.trades || memo.open !== sim.openAtEnd || memo.n !== sim.trades.length || memo.openN !== (sim.openAtEnd?.length ?? 0)) {
      memo = { trades: sim.trades, open: sim.openAtEnd, n: sim.trades.length, openN: sim.openAtEnd?.length ?? 0, values: new Map() };
      readyMemo.set(sim, memo);
    }
    const m = memo.values;
    const hit = m.get(key);
    if (hit) r = hit;
    else {
      // (no proofs: they judge forward closes config by config, the readiness the simulated run of what is sent)
      const { sendable } = liveLaneFilter(s, null, null, null, null);
      const sub = runSubset(
        { ...sim, openAtEnd: [] },
        (t) =>
          !narrowed ||
          sendable({
            cfg: t.cfg,
            sym: t.sym,
            side: t.side,
            vol: t.mult ?? 1,
            // (the order's whole multiple without the indication factor: the same basis as the lanes' `mult`)
            mult: (t.mult ?? 1) / (t.volFactor ?? 1),
            blockVol: (t.mult ?? 1) / (t.volFactor ?? 1),
          }),
        minPf,
      );
      r = {
        pf: sub.stats.pf,
        n: sub.stats.n,
        stable: sub.stable,
        unknownReturns: sub.stats.unknownReturns,
      };
      m.set(key, r);
    }
  } else return { ok: false, why: "settled post-Base accepted-return basis unavailable; recompute before live readiness" };
  if ((r.unknownReturns ?? 0) > 0) return { ok: false, why: `simulated run has ${r.unknownReturns} unknown unit return(s)` };
  if (r.n === 0) return { ok: false, why: "no settled post-Base execution closes; endpoint marks cannot prove live readiness" };
  const scope = narrowed ? ` of what this desk sends (${parts.join(", ")}: ${r.n} orders)` : "";
  return r.pf < minPf || !r.stable
    ? { ok: false, why: `simulated run${scope} PF ${r.pf.toFixed(2)} (min ${minPf})${r.stable ? "" : ", not stable"}` }
    : { ok: true, why: "" };
}

/** Native admission judges every exact lane again. A pooled sibling PF must not veto a proven lane. */
export function liveEntryReadiness(
  sim: Parameters<typeof liveReadiness>[0] | null | undefined,
  s: Parameters<typeof liveReadiness>[1] & Pick<LiveSettings, "requireReady">,
  minPf: number,
  exactPromotion: boolean,
): { ok: boolean; why: string } {
  if (!sim) return { ok: false, why: "no simulated run yet" };
  if (exactPromotion || s.requireReady === false) return { ok: true, why: "" };
  return liveReadiness(sim, s, minPf);
}

/** Everything the executor needs from an exchange. The default is BingX; tests inject a simulated exchange. */
export interface ExchangeClient {
  hasKeys(): boolean;
  /** identity of the connection: conn id, network, host and a one-way fingerprint of the API key (never the key) */
  fingerprint(): string;
  /** Full-strength identity for durable ownership; older short fingerprints remain for legacy cache keys. */
  accountFingerprint?(): string;
  /** `fresh`: a book shared with other processes is only reused when read after `notBefore` and within `maxAgeMs` */
  book(fresh?: { notBefore: number; maxAgeMs: number }): Promise<BookView>;
  contracts(): Promise<Map<string, bx.ContractSpec>>;
  order(p: Record<string, string | number>): Promise<unknown>;
  cancel(venueSymbol: string, orderId: string): Promise<boolean>;
  setPositionMode?(mode: "hedge" | "oneway"): Promise<void>;
  setMarginMode?(venueSymbol: string, mode: "cross" | "isolated"): Promise<void>;
  /** the margin mode in force on a symbol (a read: nothing changes); null when the venue names none */
  marginMode?(venueSymbol: string): Promise<"cross" | "isolated" | null>;
  /** current and maximum leverage of a symbol (absent on a simulated exchange) */
  leverage?(venueSymbol: string): Promise<bx.LeverageInfo | null>;
  setLeverage?(
    venueSymbol: string,
    side: "LONG" | "SHORT" | "BOTH",
    leverage: number,
  ): Promise<void>;
  /** legacy numeric account-balance reader (USDT); null = unknown, never the paper balance */
  equity?(): Promise<number | null>;
  /** balance snapshot (open PnL, realized, margin); absent on a simulated exchange */
  account?(): Promise<bx.AccountSnapshot | null>;
  /** one order's state by its venue id (lane orders: a stop or take-profit that left the book — filled or not) */
  orderStatus?(venueSymbol: string, orderId: string): Promise<unknown>;
  /** a symbol's order history since a time, every order of the account (BingX allOrders): what closed a side */
  ordersSince?(venueSymbol: string, startTime: number): Promise<unknown>;
  /** Settled order history including cumulative commissions; read after position protection, never before it. */
  feeHistory?(venueSymbol: string, startTime: number): Promise<unknown>;
  incomeHistory?(from: number, to: number, limit: number): Promise<unknown>;
}

const orderReply = (resp: unknown): Record<string, unknown> | null => {
  const o = ((resp as { order?: unknown })?.order ?? resp) as Record<string, unknown> | null;
  return o && typeof o === "object" ? o : null;
};
const replyQty = (o: Record<string, unknown> | null): number | null => {
  if (!o || (o.executedQty === undefined && o.executedVolume === undefined)) return null;
  const raw = o.executedQty ?? o.executedVolume;
  const q = raw === null || raw === "" ? NaN : Number(raw);
  // An explicitly invalid quantity is not evidence that the whole request executed.
  return Number.isFinite(q) && q >= 0 ? q : 0;
};
const pendingExecution = (resp: unknown): boolean =>
  /^(NEW|PENDING|PENDING_NEW|ACCEPTED|CREATED|PARTIALLY_FILLED)$/i.test(String(orderReply(resp)?.status ?? ""));
/**
 * Measured fill price / commission / quantity. An explicit zero execution or unknown fill price returns null.
 * `qty` is 0 only when the reply omitted execution quantity; executedQty independently applies the legacy fallback.
 */
export function parseFill(resp: unknown): { px: number; fee: number | null; qty: number } | null {
  const o = orderReply(resp);
  if (!o || typeof o !== "object") return null;
  if (replyQty(o) === 0) return null;
  const px = Number(o.avgPrice ?? o.price ?? 0);
  // a reply without a commission field is UNMEASURED (null), never a zero: a zero would read as a measured fee-free
  // fill and cost every lane nothing (every fill of 11 Oct read 0 that way)
  const rawFees = [o.commission, o.fee].filter((v) => v !== undefined && v !== null);
  const fees = rawFees.map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Math.abs(Number(v)) : NaN);
  const fee = fees.length && fees.every((v) => Number.isFinite(v) && v === fees[0]) ? fees[0] : null;
  return Number.isFinite(px) && px > 0 ? { px, fee, qty: replyQty(o) ?? 0 } : null;
}

/** A sparse status poll cannot erase a measured commission for the same cumulative fill. */
function cumulativeFillFee(
  db: CoreDb, coid: string, sym: string, side: number, kind: string, qty: number,
  fill: { px: number; fee: number | null; qty: number },
): { fee: number | null; known: number } {
  if (fill.fee !== null)
    return { fee: fill.fee * (fill.qty > qty ? qty / fill.qty : 1), known: 1 };
  const prior = db.get<{ qty: number; fill_px: number; fee: number | null; fee_known: number | null }>(
    "SELECT qty,fill_px,fee,fee_known FROM live_fills WHERE coid=? AND sym=? AND side=? AND kind=?",
    coid, sym, side, kind,
  );
  if (prior && prior.qty === qty && Number.isFinite(prior.fill_px) &&
    Math.abs(prior.fill_px - fill.px) <= 1e-12 * Math.max(1, Math.abs(fill.px)) &&
    prior.fee !== null && Number.isFinite(prior.fee) && (prior.fee_known === 1 || prior.fee !== 0))
    return { fee: Math.abs(prior.fee), known: 1 };
  // A changed quantity or price is a different measurement scope; the old fee cannot certify the whole update.
  return { fee: null, known: 0 };
}


/**
 * An exchange acknowledgement is not a fill. Only explicit executed quantity or an authoritative FILLED status
 * can establish ownership; an unknown acknowledgement remains pending until venue reconciliation.
 */
export function executedQty(resp: unknown, sentQty: number): number {
  const sent = Number.isFinite(sentQty) && sentQty > 0 ? sentQty : 0;
  const o = orderReply(resp);
  const q = replyQty(o);
  if (q !== null) return Math.min(sent, q);
  return String(o?.status ?? "").toUpperCase() === "FILLED" ? sent : 0;
}

interface PendingExecution {
  oid: string; sentQty: number; positionSeen?: boolean; wasFlat?: boolean; flatAt?: number; flatBooked?: boolean;
  unresolved?: boolean; late?: Record<string, unknown>;
}
const PENDING_EXECUTION = "execution-pending ";
const overallCumulativeQty = (o: Record<string, unknown> | null): { qty: number | null; invalid: boolean } => {
  if (!o) return { qty: null, invalid: false };
  const raw = [o.executedQty, o.executedVolume, o.cumExecQty, o.filledQty].filter((v) => v !== undefined);
  if (!raw.length) return { qty: null, invalid: false };
  const present = raw.filter((v) => v !== null);
  if (!present.length) return { qty: null, invalid: true };
  const nums = present.map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN);
  if (nums.some((q) => !Number.isFinite(q) || q < 0 || q !== nums[0])) return { qty: null, invalid: true };
  return { qty: nums[0], invalid: false };
};
const overallExecutedQty = (resp: unknown, sentQty: number): number => {
  const cumulative = overallCumulativeQty(orderReply(resp));
  if (cumulative.invalid) return 0;
  const sent = Number.isFinite(sentQty) && sentQty > 0 ? sentQty : 0;
  return cumulative.qty === null ? executedQty(resp, sent) : Math.min(sent, cumulative.qty);
};
const exactExecutionOrderId = (value: unknown): string =>
  typeof value === "string" ? value.trim()
    : typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? String(value) : "";
const executionOrderIds = (values: unknown[]): { id: string; invalid: boolean } => {
  const present = values.filter((value) => value !== undefined && value !== null);
  if (!present.length) return { id: "", invalid: false };
  const ids = present.map(exactExecutionOrderId).filter(Boolean);
  if (!ids.length || ids.some((id) => id !== ids[0])) return { id: "", invalid: true };
  const id = ids[0];
  // BingX may supply a rounded unsafe numeric alias beside the exact string. Its rounded value must still agree.
  const compatible = present.every((value) => exactExecutionOrderId(value) === id ||
    (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value) && value >= 0 &&
      /^\d+$/.test(id) && Number(id) === value));
  return compatible ? { id, invalid: false } : { id: "", invalid: true };
};
const executionResponseId = (o: Record<string, unknown> | null): string => {
  if (!o) return "";
  return executionOrderIds([o.orderId, o.orderID]).id;
};
/** Validate identity and every supplied side/type field before using a pending MARKET receipt. */
const matchesOverallExecution = (o: Record<string, unknown> | null, x: {
  oid: string; coid: string; sym: string; side: string; positionSide: string; sentQty: number; requireIdentity?: boolean;
}): boolean => {
  if (!o) return false;
  const venue = executionOrderIds([o.orderId, o.orderID]);
  if (venue.invalid || (x.oid && venue.id && venue.id !== x.oid)) return false;
  const clientIds = [o.clientOrderId, o.clientOrderID].filter((v) => v !== undefined && v !== null);
  const equal = (value: unknown, expected: string) => typeof value === "string" && value.trim().toUpperCase() === expected.toUpperCase();
  if (clientIds.some((id) => !equal(id, x.coid))) return false;
  if (x.requireIdentity !== false && (x.oid ? !venue.id && !clientIds.length : !clientIds.length)) return false;
  if (o.origQty != null) {
    const q = typeof o.origQty === "number" || (typeof o.origQty === "string" && o.origQty.trim() !== "")
      ? Number(o.origQty) : NaN;
    if (!Number.isFinite(q) || q !== x.sentQty) return false;
  }
  return (o.symbol == null || equal(o.symbol, x.sym)) && (o.side == null || equal(o.side, x.side)) &&
    (o.positionSide == null || equal(o.positionSide, x.positionSide)) && (o.type == null || equal(o.type, "MARKET"));
};
/** A measured partial is not evidence that an unrecognized venue status ended the order's remainder. */
const overallExecutionPending = (resp: unknown, sentQty: number): boolean => {
  const o = orderReply(resp);
  const status = String(o?.status ?? "").toUpperCase();
  const cumulative = overallCumulativeQty(o);
  if (cumulative.invalid) return true;
  const qty = cumulative.qty;
  // An explicit FILLED quantity that differs from the original request contradicts its terminal status.
  // Keep its identity and remainder reserved until a consistent cumulative receipt arrives.
  if (status === "FILLED") return qty !== null && qty !== sentQty;
  if (/^(CANCELLED|CANCELED|REJECTED|EXPIRED)$/.test(status)) return qty === null || qty > sentQty;
  // Some MARKET acknowledgements omit status but explicitly measure the entire requested quantity. Only this
  // legacy sparse full-fill form resolves without a terminal status; a partial or named unknown status does not.
  return !(status === "" && Number.isFinite(sentQty) && sentQty > 0 && qty === sentQty);
};
const executionMsg = (resp: unknown, sentQty: number, positionSeen = false): string | null => {
  const o = orderReply(resp);
  return overallExecutionPending(resp, sentQty)
    ? PENDING_EXECUTION + JSON.stringify({ oid: executionResponseId(o), sentQty, positionSeen })
    : null;
};
/** A direct response is correlated with its request, but any supplied contradictory fields invalidate it. */
const overallExecutionAck = (resp: unknown, x: {
  coid: string; sym: string; side: string; positionSide: string; sentQty: number; positionSeen: boolean;
}): { got: number; pending: string | null } => {
  const state = orderReply(resp);
  if (!matchesOverallExecution(state, { ...x, oid: "", requireIdentity: false }))
    return { got: 0, pending: PENDING_EXECUTION + JSON.stringify({ oid: "", sentQty: x.sentQty, positionSeen: x.positionSeen }) };
  return { got: overallExecutedQty(resp, x.sentQty), pending: executionMsg(resp, x.sentQty, x.positionSeen) };
};
const pendingOf = (msg?: string | null): PendingExecution | null => {
  if (!msg?.startsWith(PENDING_EXECUTION)) return null;
  try {
    const p = JSON.parse(msg.slice(PENDING_EXECUTION.length));
    return typeof p.oid === "string" && Number.isFinite(p.sentQty) && p.sentQty > 0 ? p : null;
  } catch { return null; }
};
const executionPolls = new WeakMap<object, Map<string, number>>();

/** isolated margin: leverage at most this, so liquidation (≈ 1 / leverage away) stays behind the widest stop (20 %) */
export const ISOLATED_MAX_LEVERAGE = 4;

/** "already in that mode" replies are success */
const alreadySet = (msg: string) => /no need|already|not modified|same|repeat/i.test(msg);

/**
 * The exchange book is re-read over REST at most every `syncMs` (the live step runs every tick, 100 ms); an own
 * order or cancel forces the next read, so decisions never act on a book that predates our own change.
 * Contract specs change rarely: cached 10 minutes.
 */
const bookCache = new Map<
  string,
  { at: number; book: BookView; revision: number; notBefore: number; maxAgeMs: number }
>();
const bookChanges = new Map<string, { revision: number; at: number }>();
const bookReads = new Map<string, {
  revision: number; notBefore: number; maxAgeMs: number; promise: Promise<BookView>;
}>();
const contractCache = new Map<string, { at: number; specs: Map<string, bx.ContractSpec> }>();
const accountCache = new Map<string, { at: number; snap: bx.AccountSnapshot | null }>();
const contractReads = new Map<string, Promise<Map<string, bx.ContractSpec>>>();
const accountReads = new Map<string, Promise<bx.AccountSnapshot | null>>();
/** Concurrent callers share one read per connection; rejection releases the slot for a later retry. */
function sharedRead<T>(reads: Map<string, Promise<T>>, id: string, read: () => Promise<T>): Promise<T> {
  const pending = reads.get(id);
  if (pending) return pending;
  const promise = Promise.resolve().then(read).finally(() => {
    if (reads.get(id) === promise) reads.delete(id);
  });
  reads.set(id, promise);
  return promise;
}
/** the account balance (sizing, status) is re-read at most once a minute */
const ACCOUNT_MS = 60_000;
const clientCacheFingerprint = (ex: ExchangeClient) => ex.accountFingerprint?.() ?? ex.fingerprint();
export function cachedClient(ex: ExchangeClient, syncMs: number): ExchangeClient {
  const key = () => clientCacheFingerprint(ex);
  const checkKey = (id: string) => { if (key() !== id) throw new Error("cached venue read superseded by an account change"); };
  const touch = (id: string) => {
    const c = bookChanges.get(id);
    bookChanges.set(id, { revision: (c?.revision ?? 0) + 1, at: Date.now() });
  };
  return {
    ...ex,
    ...(ex.accountFingerprint ? { accountFingerprint: () => ex.accountFingerprint!() } : {}),
    book: async (fresh) => {
      const id = key();
      for (;;) {
        const change = bookChanges.get(id);
        const revision = change?.revision ?? 0;
        const c = bookCache.get(id);
        // A stricter caller must never inherit an older shared-file read from a looser caller.
        const maxAgeMs = Math.min(syncMs, fresh?.maxAgeMs ?? Infinity);
        const notBefore = Math.max(change?.at ?? 0, fresh?.notBefore ?? 0);
        if (c && c.revision === revision && Date.now() - c.at < maxAgeMs && c.at >= notBefore &&
            c.notBefore >= notBefore && c.maxAgeMs <= maxAgeMs) return c.book;
        const pending = bookReads.get(id);
        if (pending) {
          const book = await pending.promise;
          checkKey(id);
          if (pending.revision === (bookChanges.get(id)?.revision ?? 0) &&
              pending.notBefore >= notBefore && pending.maxAgeMs <= maxAgeMs) return book;
          continue;
        }
        const startedAt = Date.now();
        const read = { revision, notBefore, maxAgeMs, promise: null as unknown as Promise<BookView> };
        read.promise = Promise.resolve().then(() => ex.book({ notBefore, maxAgeMs })).then((book) => {
          checkKey(id);
          // Even the very first read may race an order. Never mark its pre-order snapshot clean.
          if ((bookChanges.get(id)?.revision ?? 0) === revision)
            bookCache.set(id, { at: startedAt, book, revision, notBefore, maxAgeMs });
          return book;
        }).finally(() => {
          if (bookReads.get(id) === read) bookReads.delete(id);
        });
        bookReads.set(id, read);
        const book = await read.promise;
        if ((bookChanges.get(id)?.revision ?? 0) === revision) return book;
      }
    },
    ...(ex.account
      ? {
          account: async () => {
            const id = key();
            const c = accountCache.get(id);
            if (c && Date.now() - c.at < ACCOUNT_MS) return c.snap;
            return sharedRead(accountReads, id, async () => {
              const snap = await ex.account!();
              checkKey(id);
              accountCache.set(id, { at: snap?.at ?? Date.now(), snap });
              return snap;
            });
          },
        }
      : {}),
    contracts: async () => {
      const id = key();
      const c = contractCache.get(id);
      if (c && Date.now() - c.at < 600_000) return c.specs;
      return sharedRead(contractReads, id, async () => {
        let specs: Map<string, bx.ContractSpec>;
        try {
          specs = await ex.contracts();
          checkKey(id);
        } catch (err) {
          checkKey(id);
          // a failed or late refresh never stops the step: the last good list serves (lot steps and minimums change
          // rarely); without one the step reports the error as before
          if (c) return c.specs;
          throw err;
        }
        // an empty list is an outage (every host failed), not "no contracts": never cached, the last good list serves
        if (specs.size) contractCache.set(id, { at: Date.now(), specs });
        else if (c) return c.specs;
        return specs;
      });
    },
    order: async (p) => {
      const id = key();
      touch(id);
      try {
        return await ex.order(p);
      } finally {
        touch(id);
      }
    },
    cancel: async (sym, id) => {
      const connection = key();
      touch(connection);
      try {
        return await ex.cancel(sym, id);
      } finally {
        touch(connection);
      }
    },
  };
}

export function bingxClient(connId: LiveSettings["connId"]): ExchangeClient {
  const network = liveNetwork(connId);
  return {
    hasKeys: () => {
      const k = bx.keysFor(connId);
      return !!(k.apiKey && k.secret);
    },
    fingerprint: () => {
      const k = bx.keysFor(connId).apiKey;
      const fp = k ? createHash("sha256").update(k).digest("hex").slice(0, 10) : "nokey";
      return `${connId}|${network}|${bx.HOSTS[network][0]}|${fp}`;
    },
    accountFingerprint: () => {
      const k = bx.keysFor(connId).apiKey;
      const fp = k ? createHash("sha256").update(k).digest("hex") : "nokey";
      return `${connId}|${network}|${bx.HOSTS[network][0]}|${fp}`;
    },
    book: (fresh) => bx.fetchBook(network, connId, fresh),
    contracts: () => bx.fetchContracts(network),
    order: (p) => bx.signed(network, connId, "POST", "/openApi/swap/v2/trade/order", p),
    cancel: (sym, id) => bx.cancelOrder(network, connId, sym, id, { propagateNotSent: true }),
    setPositionMode: (mode) => bx.setPositionMode(network, connId, mode),
    setMarginMode: (sym, mode) => bx.setMarginMode(network, connId, sym, mode),
    leverage: (sym) => bx.fetchLeverage(network, connId, sym),
    setLeverage: (sym, side, lev) => bx.setLeverage(network, connId, sym, side, lev),
    marginMode: (sym) => bx.fetchMarginMode(network, connId, sym),
    equity: () => bx.fetchEquity(network, connId),
    account: () => bx.fetchAccount(network, connId),
    orderStatus: (sym, orderId) =>
      bx.signed(network, connId, "GET", "/openApi/swap/v2/trade/order", { symbol: sym, orderId }),
    // the venue answers at most 7 days back
    ordersSince: (sym, from) =>
      bx.signed(network, connId, "GET", "/openApi/swap/v2/trade/allOrders", {
        symbol: sym,
        startTime: Math.max(from, Date.now() - 6.9 * 24 * 3_600_000),
        endTime: Date.now(),
        limit: 500,
      }),
    feeHistory: (sym, from) => bx.signed(network, connId, "GET", "/openApi/swap/v2/trade/allOrders", {
      symbol: sym, startTime: Math.max(from, Date.now() - 6.9 * 24 * 3_600_000), endTime: Date.now(), limit: 500,
    }),
    incomeHistory: (from, to, limit) => bx.signed(network, connId, "GET", "/openApi/swap/v2/user/income", {
      startTime: from, endTime: to, limit,
    }),
  };
}

/** Read-only account history; independently scheduled so a slow history page cannot delay protection. */
export function refreshVenueHistory(rt: CoreRuntime, client?: ExchangeClient) {
  if (rt.status.source !== "bingx") return null;
  const conn = rt.settings.live.connId, ex = client ?? bingxClient(conn);
  if (!ex.incomeHistory || !ex.hasKeys()) return null;
  const scope = ex.fingerprint?.() ?? conn;
  const generation = rt.generation, epoch = rt.liveEpoch ?? 0;
  requestVenueIncome(rt.db, scope, (from, to, limit) => ex.incomeHistory!(from, to, limit),
    () => rt.generation === generation && (rt.liveEpoch ?? 0) === epoch && rt.settings.live.connId === conn &&
      (ex.fingerprint?.() ?? conn) === scope);
  return scope;
}

export function liveVenueHistory(rt: CoreRuntime, from: number, to: number) {
  const scope = refreshVenueHistory(rt);
  return scope ? venueIncomeSummary(rt.db, scope, from, to) : null;
}

/**
 * Notional of one live order unit: fixed % of account wallet balance, or the fixed notional. Account snapshots are
 * read at most every 30 s; a failed refresh keeps a successful read for at most 75 s, never indefinitely. null in the
 * %-of-balance mode while wallet balance is unknown: nothing opens or grows then — never sized from the paper balance on a real
 * account. A client without an equity read (paper / simulated exchange) sizes from the paper balance.
 * Optional account-balance ratio budgets still apply; legacy fixed-USD position ceilings are ignored.
 */
const EQUITY_MAX_AGE = ACCOUNT_MS + 15_000;
const balanceCache = new Map<string, { at: number; goodAt: number; balance: number | null }>();
let observedAccount = new WeakMap<CoreRuntime, { connId: string; scope: string; scopeNow: () => string; at: number; balance: number | null; equity: number | null; paper: boolean }>();
const usableEquity = (eq: number | null | undefined): number | null =>
  typeof eq === "number" && Number.isFinite(eq) && eq > 0 ? eq : null;
const usableBalance = (balance: number | null | undefined): number | null =>
  typeof balance === "number" && Number.isFinite(balance) && balance > 0 ? balance : null;
export async function liveUnit(
  rt: CoreRuntime,
  ex: ExchangeClient,
  snapshot?: bx.AccountSnapshot | null,
): Promise<number | null> {
  const s = rt.settings.live;
  const conn = s.connId, scope = ownershipFingerprint(conn, ex), scopeNow = () => ownershipFingerprint(conn, ex);
  const sz = sizingSettings(rt.settings.sizing);
  const paper = !ex.account && !ex.equity;
  const observe = (balance: number | null, equity: number | null, at = Date.now()) => {
    if (rt.settings.live.connId !== conn || scopeNow() !== scope) return null;
    if (!Number.isFinite(at) || Date.now() - at > EQUITY_MAX_AGE) {
      balance = null;
      equity = null;
    }
    observedAccount.set(rt, { connId: conn, scope, scopeNow, at, balance, equity, paper });
    if (sz.mode !== "equityPct") return s.notionalUsd;
    // the %-of-balance unit on B = min(wallet, equity): open profit never sizes a unit up, an open loss sizes it down
    const base = balance === null ? null : (budgetBase({ equity, wallet: balance }) ?? balance);
    return base === null ? null : unitNotional(sz, base, s.notionalUsd);
  };
  // Overall mode already read this snapshot. Reading equity again could size at yesterday's high balance while
  // the budgets use today's smaller account (and left minQty/fixed previews showing the paper balance).
  if (snapshot !== undefined && ex.account)
    return observe(usableBalance(snapshot?.wallet), usableEquity(snapshot?.equity), snapshot?.at ?? accountCache.get(clientCacheFingerprint(ex))?.at ?? Date.now());
  if (paper) {
    const balance = usableBalance(rt.settings.paperBalance);
    return observe(balance, balance ?? null);
  }
  if (sz.mode !== "equityPct") return s.notionalUsd;
  if (ex.account) {
    try {
      const account = await ex.account();
      return observe(usableBalance(account?.wallet), usableEquity(account?.equity), account?.at ?? accountCache.get(clientCacheFingerprint(ex))?.at ?? Date.now());
    } catch {
      return observe(null, null);
    }
  }
  const k = clientCacheFingerprint(ex);
  let c = balanceCache.get(k);
  if (!c || Date.now() - c.at > 30_000) {
    let balance: number | null = null;
    let goodAt = 0;
    try {
      // Legacy numeric-only clients expose their account balance through the old `equity` method.
      balance = usableBalance(await ex.equity!());
      if (balance !== null) goodAt = Date.now();
    } catch {
      if (c && Date.now() - c.goodAt <= EQUITY_MAX_AGE) {
        balance = c.balance;
        goodAt = c.goodAt;
      }
    }
    c = { at: Date.now(), goodAt, balance };
    balanceCache.set(k, c);
  }
  const balance = Date.now() - c.goodAt <= EQUITY_MAX_AGE ? c.balance : null;
  return observe(balance, balance, c.goodAt || c.at);
}

/**
 * The unit the control preview shows: this runtime's latest account snapshot, including fixed/minQty modes.
 * Unknown/stale account balance never becomes a paper balance. Paper is used only for an explicitly simulated
 * exchange with no account/equity reader. Minimum-quantity sizing sizes each symbol at its exchange minimum lot.
 */
export function liveUnitPeek(rt: CoreRuntime): {
  unit: number;
  from: "balance" | "paper" | "fixed" | "minQty" | "unknown";
  balance: number | null;
  equity: number | null;
  /** the last account read of the connection (every sizing mode): wallet, B = min(wallet, equity), its time */
  wallet: number | null;
  base: number | null;
  at: number | null;
} {
  const s = rt.settings.live;
  const sz = sizingSettings(rt.settings.sizing);
  const seen = observedAccount.get(rt);
  const current = seen && seen.connId === s.connId && seen.scopeNow() === seen.scope &&
    Date.now() - seen.at <= EQUITY_MAX_AGE ? seen : null;
  const balance = current?.balance ?? null;
  const equity = current?.equity ?? null;
  const base = budgetBase({ equity, wallet: balance });
  const acct = { wallet: balance, base, at: current && (balance !== null || equity !== null) ? current.at : null };
  if (sz.mode === "minQty") return { unit: s.notionalUsd, from: "minQty", balance, equity, ...acct };
  if (sz.mode !== "equityPct") return { unit: s.notionalUsd, from: "fixed", balance, equity, ...acct };
  if (balance !== null)
    return {
      unit: unitNotional(sz, base ?? balance, s.notionalUsd),
      from: current?.paper ? "paper" : "balance",
      balance,
      equity,
      ...acct,
    };
  return { unit: 0, from: "unknown", balance: null, equity, ...acct };
}

/** Legacy USD ceilings are intentionally ignored; only optional balance-relative limits can constrain sizing. */
export function positionCapOf(_s: Pick<LiveSettings, "maxNotionalUsd" | "notionalUsd">): number {
  return Infinity;
}

/** The control sizing of the live settings for one lane unit — shared by the live step and the preview. */
/**
 * `_signalMaxPositions`: kept for callers only — the exchange limit is one pool of occupied symbol × direction slots
 * shared by every strategy lane (exchangePositionLimit); signal evaluation limits stay separate.
 */
export function controlSettingsOf(s: LiveSettings, unit: number, _signalMaxPositions = 0, base?: number | null) {
  return {
    // risk-based: every position risks B × riskPerPositionPct × ratio at its stop (B = min(wallet, equity))
    ...(s.positionSize === "risk" && s.laneOrders !== true && base != null && base > 0
      ? { riskSizing: { base, pct: s.riskPerPositionPct ?? RISK_PER_POSITION_DEFAULT } }
      : {}),
    notionalUsd: unit,
    ratio: s.ratio ?? 1,
    signalWeight: s.signalWeight ?? 1,
    maxNotionalUsd: positionCapOf(s),
    maxPositions: exchangePositionLimit(s.maxPositions),
    rebalancePct: s.rebalancePct ?? 0.25,
    positionMode: s.positionMode ?? "hedge",
    minStopPct: s.minStopPct ?? 0.01,
    minSize: s.positionSize === "min",
    laneMode: s.laneOrders === true,
  } as const;
}

// ── failure backoff ────────────────────────────────────────────────────────────────────────────────────────
// A request the exchange refuses (or that times out) is not re-sent on the next 100 ms tick: each key waits
// base × 2^(failures − 1), up to max. Success clears it. Opens after a protective close wait the same way, so a
// stop the exchange keeps refusing never turns into buy-sell-repeat.
const backoff = new Map<string, { n: number; until: number; msg: string }>();
/**
 * Live state of ONE runtime (one connection): the serialised step chain, the entries already sent, the last
 * entries-mode status and the warnings already reported. Each connection's runtime has its own, so parallel
 * connections never wait on each other's steps or suppress each other's entries.
 */
interface LiveLocal {
  running: Promise<unknown> | null;
  /** the live epoch of the step `running` belongs to: a step of an older (abandoned) epoch holds up nothing */
  runningEpoch?: number;
  lastEntries: { at: number; status: LiveStatus } | null;
  /** entry keys already recorded (sent or tried): an intent stays pending for its whole bar but is sent once */
  entriesSent: Set<string>;
  /** foreign excess already reported (one event per position size) */
  warnedExcess: Set<string>;
  /** ledger-only keys whose ownership the venue history confirmed (key|open time) */
  ledgerVerified: Set<string>;
  rateLimitLogged: number;
  /** margin of own opens the account snapshot may not show yet (free-margin floor): USDT, time */
  marginSpent: Array<{ at: number; usd: number }>;
  /** leverage in force per symbol × side (LONG / SHORT / BOTH), as set or read */
  levVal: Map<string, number>;
  /**
   * the control rows of live_orders in memory (coid → row, in write order like ORDER BY at, rowid): the
   * own-quantity ledger is rebuilt from them every step without a SQL read per tick; re-read from the table
   * every minute (the trim drops only rows before a flat marker, which never change the ledger)
   */
  ctl: { at: number; rows: Map<string, ControlRow> } | null;
  /** last backstop re-pricing per control key (RESTOP_MIN_MS apart) */
  restopAt: Map<string, number>;
  /** last take-profit re-pricing per control key (RESTOP_MIN_MS apart) */
  retpAt: Map<string, number>;
  feeSyncAt?: number;
  feeCursor?: number;
  /** lane orders: no new one before this (the venue said its TP/SL order cap is reached) */
  laneCapUntil?: number;
  /** the paper lanes the last control step planned on (a change asks for a fresh exchange book) */
  lanesHash?: string;
  /** what the last lanes hash was computed on (the paper book, its crossed stops and volume) */
  lanesKey?: { ps: readonly unknown[]; n: number; hits: number; vsum: number; hash: string };
  /** the lanes' id lookups of that lane set (laneMapsOf) */
  laneMaps?: { hash: string } & ReturnType<typeof laneMapsOf>;
  /**
   * the lanes' volume each control key was last brought to (its target's vol after a step that left nothing to do
   * there or did it): a key whose lanes changed since is resized whatever the rebalance band (planControl sizedVol)
   */
  sizedVol: Map<string, number>;
  /** last "volume factor has no effect" warning (at most hourly) */
  sizingWarnAt: number;
  /**
   * keys whose open the free-margin floor refused moments ago (until when, why): left out of the targets before the
   * position cap for FLOOR_WAIT_MS, so the slot goes to the next (possibly smaller) target
   */
  floorRefused: Map<string, { until: number; msg: string }>;
  /**
   * minimums the VENUE itself named, per symbol: `qty` in base units ("The minimum order amount is 476.53 SOLV"),
   * `stop` as a stop distance fraction that was refused for being too close. Our contract snapshot can sit a hair
   * under the live minimum, and a minimum learned once must not be re-learned by paying another rejection, so these
   * are loaded from `controlVenueMin` on first use and written back whenever one changes.
   */
  venueMin: Map<string, { qty?: number; stop?: number }> | null;
}
export interface ControlRow {
  k: string;
  kind: string;
  status: string;
  qty: number;
  /** order price (a stop row: its stop price) */
  px?: number;
  at: number;
  /** Journaled pre-dispatch order sequence, absent for legacy records and local flat markers. */
  submissionSeq?: number | null;
  msg?: string | null;
}
const CTL_RELOAD_MS = 60_000;
/** The control rows (memory mirror of live_orders, re-read every minute). */
export function controlRows(rt: { db: CoreDb }): Map<string, ControlRow> {
  const L = local(rt);
  if (!L.ctl || Date.now() - L.ctl.at > CTL_RELOAD_MS) {
    const rows = new Map<string, ControlRow>();
    for (const r of rt.db.all<ControlRow & { coid: string }>(
      "SELECT o.coid, substr(o.cfg, 9) AS k, o.kind, o.status, o.qty, o.px, o.at, o.msg, s.seq AS submissionSeq FROM live_orders o LEFT JOIN live_submission_sequence s ON s.coid=o.coid AND s.k=substr(o.cfg,9) AND s.kind=o.kind WHERE o.cfg LIKE 'control|%' ORDER BY o.at, o.rowid",
    ))
      rows.set(r.coid, { k: r.k, kind: r.kind, status: r.status, qty: r.qty, px: r.px, at: r.at, msg: r.msg, submissionSeq: r.submissionSeq });
    L.ctl = { at: Date.now(), rows };
  }
  return L.ctl.rows;
}

/** A stop belongs to the current episode only when its ordering against all opens / flats is proven. */
export function controlStopPxOf(rows: Iterable<ControlRow>, key: string): number | null {
  const events: ControlRow[] = [];
  for (const r of rows) if (r.k === key && (r.kind === "O" || r.kind === "F" || r.kind === "S")) events.push(r);
  if (events.some((r) => !Number.isFinite(r.at))) return null;
  const sequenced = events.filter((r) => typeof r.submissionSeq === "number" &&
    Number.isSafeInteger(r.submissionSeq) && r.submissionSeq > 0)
    .sort((a, b) => a.submissionSeq! - b.submissionSeq!);
  if (new Set(sequenced.map((r) => r.submissionSeq)).size !== sequenced.length) return null;
  let price: number | null = null, opened = false;
  const apply = (r: ControlRow) => {
    if (r.kind === "O") {
      price = null;
      opened = (r.status === "ok" || r.status === "pending") && Number.isFinite(r.qty) && r.qty > 0;
    } else if (r.kind === "F") { price = null; opened = false; }
    else if (opened && r.status === "ok" && Number.isFinite(r.px) && (r.px ?? 0) > 0) price = r.px!;
  };
  // If every event has a durable sequence, it also handles clock adjustments: submission order, not wall clock,
  // determines the episode. With unsequenced records, a demonstrated backwards clock makes their relation to the
  // sequenced orders unprovable, so do not use either timestamps or rowids as a substitute.
  if (sequenced.length === events.length) {
    for (const r of sequenced) apply(r);
    return price;
  }
  if (sequenced.some((r, i) => i > 0 && r.at < sequenced[i - 1].at)) return null;
  events.sort((a, b) => a.at - b.at);
  for (let i = 0; i < events.length;) {
    let end = i + 1;
    while (end < events.length && events[end].at === events[i].at) end++;
    const group = events.slice(i, end);
    if (group.length > 1) {
      const sequences = group.map((r) => r.submissionSeq);
      const proven = sequences.every((n) => typeof n === "number" && Number.isSafeInteger(n) && n > 0) &&
        new Set(sequences).size === group.length;
      if (!proven) {
        // Legacy rowids can change on cumulative execution updates. Any same-time tie involving a stop has
        // no proven episode or latest price. A later unambiguous open and stop can establish it afresh.
        price = null;
        if (group.some((r) => r.kind === "O" || r.kind === "F")) opened = false;
        i = end;
        continue;
      }
      group.sort((a, b) => a.submissionSeq! - b.submissionSeq!);
    }
    for (const r of group) apply(r);
    i = end;
  }
  return price;
}
/** A control row written: the mirror follows the table (INSERT OR REPLACE moves the row to the end). */
function noteControlRow(rt: { db: CoreDb }, coid: string, row: ControlRow) {
  const L = local(rt);
  if (!L.ctl) return;
  // A cumulative execution update keeps its original order time and sequence; polling is not a new entry.
  if (L.ctl.rows.get(coid)?.at !== row.at) L.ctl.rows.delete(coid);
  L.ctl.rows.set(coid, row);
}
const conditionalReconciliations = new WeakMap<CoreDb, Promise<number>>();
const conditionalCursor = new WeakMap<CoreDb, number>();
const conditionalNext = new WeakMap<CoreDb, number>();

/** Reconcile only exact pending stop/TP identities with explicit terminal zero-fill history. */
export async function reconcilePendingConditionals(
  rt: CoreRuntime,
  ex: ExchangeClient,
  book: BookView,
  alive: () => boolean = () => true,
): Promise<number> {
  if (!alive()) return 0;
  const conn = rt.settings.live.connId, oneway = (rt.settings.live.positionMode ?? "hedge") === "oneway";
  const pendingRows = [...controlRows(rt)].filter(([id, row]) => row.status === "pending" &&
    (row.kind === "S" || row.kind === "T") && isOwnCoid(id, conn));
  if (!pendingRows.length) { conditionalCursor.delete(rt.db); return 0; }
  const start = (conditionalCursor.get(rt.db) ?? 0) % pendingRows.length;
  const candidates = Array.from({ length: Math.min(4, pendingRows.length) }, (_, i) => pendingRows[(start + i) % pendingRows.length]);
  conditionalCursor.set(rt.db, (start + candidates.length) % pendingRows.length);
  const earliest = new Map<string, number>();
  for (const [, row] of candidates) {
    const sym = row.k.split("|")[0];
    earliest.set(sym, Math.min(earliest.get(sym) ?? Infinity, row.at - 60_000));
  }
  const history = new Map<string, Promise<Array<Record<string, unknown>> | null>>();
  const measuredQty = (row: Record<string, unknown>): number | null => {
    const values = [row.executedQty, row.cumExecQty, row.filledQty].filter((v) => v !== undefined && v !== null);
    if (!values.length) return null;
    const nums = values.map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN);
    if (nums.some((n) => !Number.isFinite(n) || n < 0 || n !== nums[0])) return null;
    return nums[0];
  };
  const historyTime = (row: Record<string, unknown>): number | null => {
    const raw = row.updateTime ?? row.time;
    const n = typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "") ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const historyOf = (sym: string, from: number) => {
    let pending = history.get(sym);
    if (!pending) {
      pending = (async () => {
        if (!ex.ordersSince) return null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1_000); });
          const result = await Promise.race([ex.ordersSince(sym, from).catch(() => null), timeout]);
          const rows = Array.isArray(result) ? result : ((result as { orders?: unknown } | null)?.orders ?? null);
          return Array.isArray(rows) ? rows as Array<Record<string, unknown>> : null;
        } finally { if (timer) clearTimeout(timer); }
      })();
      history.set(sym, pending);
    }
    return pending;
  };
  let changed = 0;
  for (const [coid, row] of candidates) {
    if (!alive()) break;
    const [sym, sd] = row.k.split("|");
    if (!sym || (sd !== "1" && sd !== "-1")) continue;
    const expectedSide = oneway ? "BOTH" : sd === "1" ? "LONG" : "SHORT";
    const expectedType = row.kind === "S" ? "STOP_MARKET" : "TAKE_PROFIT_MARKET";
    const match = (id: unknown, symbol: unknown, side: unknown, type: unknown) =>
      String(id ?? "").toUpperCase() === coid.toUpperCase() && String(symbol ?? "") === sym &&
      String(side ?? "").toUpperCase() === expectedSide && String(type ?? "").toUpperCase() === expectedType;
    const namedResting = book.ordersAt === undefined
      ? book.orders.filter((o) => String(o.clientOrderId ?? "").toUpperCase() === coid.toUpperCase()) : [];
    if (namedResting.some((o) => !match(o.clientOrderId, o.venueSymbol, o.positionSide, o.type))) continue;
    // The book exposes neither executed nor remaining quantity: resting alone cannot disprove a partial fill.
    if (namedResting.length) continue;
    let status: "gone" | undefined;
    {
      const rows = await historyOf(sym, earliest.get(sym) ?? row.at - 60_000);
      if (!alive()) break;
      const named = (rows ?? []).filter((x) => String(x.clientOrderId ?? x.clientOrderID ?? "").toUpperCase() === coid.toUpperCase());
      const exitSide = sd === "1" ? "SELL" : "BUY";
      if (named.some((x) => !match(x.clientOrderId ?? x.clientOrderID, x.symbol, x.positionSide, x.type) ||
        String(x.side ?? "").toUpperCase() !== exitSide)) continue;
      const found = named;
      if (found.some((x) => [x.executedQty, x.cumExecQty, x.filledQty].some((v) => v !== undefined && v !== null) &&
        measuredQty(x) === null)) continue;
      // Conflicting duplicate snapshots with no ordering evidence remain unknown.
      if (found.length > 1 && found.some((x) => historyTime(x) === null)) continue;
      found.sort((a, b) => (historyTime(b) ?? 0) - (historyTime(a) ?? 0));
      const snapshots = new Map<number | null, { status: string; qty: number | null }>();
      let conflict = false;
      for (const x of found) {
        const time = historyTime(x), state = { status: String(x.status).toUpperCase(), qty: measuredQty(x) };
        const previous = snapshots.get(time);
        if (previous && (previous.status !== state.status || previous.qty !== state.qty)) { conflict = true; break; }
        snapshots.set(time, state);
      }
      if (conflict) continue;
      const latest = found[0];
      const zero = latest && measuredQty(latest) === 0;
      if (latest && zero && found.slice(1).some((x) => (measuredQty(x) ?? 0) > 0)) continue;
      if (latest && /^(CANCELLED|CANCELED|EXPIRED|REJECTED)$/i.test(String(latest.status)) && zero) status = "gone";
    }
    if (!status || !alive()) continue;
    const current = controlRows(rt).get(coid);
    if (!current || current.status !== "pending" || current.at !== row.at || current.k !== row.k || current.kind !== row.kind) continue;
    const qty = 0;
    const msg = "conditional cancellation confirmed with zero execution";
    const result = rt.db.runDurable("UPDATE live_orders SET status=?,qty=?,msg=? WHERE coid=? AND status='pending'",
      status, qty, msg, coid);
    if (Number(result.changes) > 0) { noteControlRow(rt, coid, { ...current, status, qty, msg }); changed++; }
  }
  return changed;
}
const locals = new WeakMap<object, LiveLocal>();
const allLocals = new Set<LiveLocal>();
function local(rt: object): LiveLocal {
  let l = locals.get(rt);
  if (!l) {
    l = {
      running: null,
      lastEntries: null,
      entriesSent: new Set(),
      warnedExcess: new Set(),
      ledgerVerified: new Set(),
      rateLimitLogged: 0,
      marginSpent: [],
      levVal: new Map(),
      ctl: null,
      restopAt: new Map(),
      retpAt: new Map(),
      sizedVol: new Map(),
      sizingWarnAt: 0,
      floorRefused: new Map(),
      venueMin: null,
    };
    locals.set(rt, l);
    allLocals.add(l);
  }
  return l;
}
/**
 * The minimums the venue has named for a symbol, as a map that is read from `controlVenueMin` once per process and
 * written back on every change. Learning them matters because each one was paid for with a rejected order.
 */
function venueMins(rt: { db: CoreDb }): Map<string, { qty?: number; stop?: number }> {
  const L = local(rt);
  if (!L.venueMin) {
    L.venueMin = new Map();
    const kv = liveKv<Record<string, { qty?: number; stop?: number }>>(rt.db, "controlVenueMin");
    if (kv && typeof kv === "object") for (const [k, v] of Object.entries(kv)) L.venueMin.set(k, v);
  }
  return L.venueMin;
}
/** The quantity minimum the venue has named for a symbol (0 = none learned): every sizing snap floors at it. */
export function venueMinQty(rt: { db: CoreDb }, sym: string): number {
  return venueMins(rt).get(sym)?.qty ?? 0;
}
/** Remember a minimum the venue named. Only ever raises: a minimum is not forgotten because one order was smaller. */
function learnVenueMin(rt: { db: CoreDb }, sym: string, what: "qty" | "stop", v: number) {
  if (!(v > 0)) return;
  const m = venueMins(rt);
  const cur = m.get(sym) ?? {};
  if ((cur[what] ?? 0) >= v) return;
  m.set(sym, { ...cur, [what]: v });
  liveKvSet(rt.db, "controlVenueMin", Object.fromEntries(m));
  rt.db.event("info", `live: ${sym} venue minimum ${what} learned: ${v} (from the exchange's own refusal)`);
}

function waiting(k: string): string | null {
  const b = backoff.get(k);
  return b && Date.now() < b.until ? b.msg : null;
}
function failed(k: string, msg: string, baseMs: number, maxMs: number) {
  if (/request budget (?:pause|unavailable) \(not sent\)/.test(msg)) return;
  const n = (backoff.get(k)?.n ?? 0) + 1;
  backoff.set(k, { n, until: Date.now() + Math.min(maxMs, baseMs * 2 ** (n - 1)), msg });
}
const cleared = (k: string) => backoff.delete(k);
/** tests: forget every backoff */
export function resetLiveBackoff() {
  backoff.clear();
  balanceCache.clear();
  observedAccount = new WeakMap();
  for (const l of allLocals) {
    l.entriesSent.clear();
    l.rateLimitLogged = 0;
    l.lastEntries = null;
    l.restopAt.clear();
    l.retpAt.clear();
    l.floorRefused.clear();
  }
  bx.clearRateLimit();
}
const OPEN_BACKOFF = [60_000, 30 * 60_000] as const;
/** own stop / take-profit groups re-sized in one control step at most (each one or two orders) */
const EXIT_SIZES_PER_STEP = 20;
/** an own open this recent that the position read does not show yet is held-unknown (the read lags) */
const LAG_MS = 15_000;
/** lane orders held back after an exchange stop fill count again after this at the latest */
const SUPPRESS_MAX_MS = 60 * 60_000;
/** a backstop is re-priced at most this often per position (a price wiggling at the band edge never churns it) */
const RESTOP_MIN_MS = 60_000;
/** backstop re-pricing band, in shares of the target stop distance: tighter by more / wider by more → re-placed */
const RESTOP_INSIDE = 0.05;
const RESTOP_BEYOND = 0.25;
/** a stop is kept this share of the way from the price to the position's liquidation price at most */
const LIQ_STOP_SHARE = 0.8;
/** the open TP/SL orders a lane-orders desk keeps at most (BingX: 200 per account); live.maxVenueOrders overrides */
const VENUE_ORDERS_MAX = 190;
/** room always kept free under that cap: backstops of positions opening this step */
const VENUE_ORDERS_RESERVE = 5;
/** after the venue answered "the number of your TP/SL orders has exceeded the limit": no new lane order this long */
const LANE_CAP_WAIT_MS = 120_000;
/** lane orders placed, moved or dropped in one control step at most (the venue's rate limit); the rest follow */
const LANE_ORDERS_PER_STEP = 60;
/**
 * lane orders in flight at once: each lane's orders are its own, so different lanes go side by side (one at a time,
 * x02's ~2,000 lane orders took about an hour at ≈ 0.6 s an order); a rate-limit answer stops the batch
 */
const LANE_ORDER_CONCURRENCY = 4;
const EXIT_BACKOFF = [5_000, 60_000] as const;
/** a key the free-margin floor refused stays out of the targets this long (its slot goes to the next target) */
const FLOOR_WAIT_MS = 60_000;
/** an action held back by a condition that clears by itself (not a failure: no backoff, no error event) */
const holdOn = (msg: string) => Object.assign(new Error(msg), { hold: true });
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export interface ControlStatus {
  at: number;
  connHash: string;
  targetsHash: string;
  bookHash: string;
  planHash: string;
  /** set when the connection identity changed since the previous step (keys rotated, other account / network) */
  reconnected: boolean;
  /** the targets and the book were unchanged since the last successful step: nothing sent */
  unchanged: boolean;
  steps: number;
  changes: number;
  targets: ControlTarget[];
  held: Array<{ key: string; qty: number }>;
  /** Occupied/reserved account slots, including foreign positions and unresolved entries. */
  exchangeSlots?: string[];
  actions: Array<ControlAction & { ok: boolean; msg?: string }>;
  /** lane orders per control key (reported with a position closed outside this system) */
  laneCounts?: Record<string, number>;
  /** (older states: the lane order ids themselves) */
  lanes?: Record<string, string[]>;
  /**
   * lane orders held back after their position was closed by its exchange stop (no reopen until each exits, at most
   * SUPPRESS_MAX_MS); a manual close does not hold anything back
   */
  suppressed?: number;
  /** lane orders the live kind list / plain-only filter does not send to the exchange (they keep paper-trading) */
  notSent?: number;
  /** new lane orders held back this step: the price had run past live.maxChase of their target distance */
  chased?: number;
  /** control completeness: every paper symbol × side and why the ones without an exchange target lack it */
  keys?: KeyFunnel[];
  /**
   * the quantity someone else holds per (symbol, side) as this step estimated it (the exchange quantity beyond the own
   * part; carried over while an own order of the last LAG_MS may not show yet): what the next step expects there beside
   * the own quantity (own-first attribution, outsideReduction)
   */
  foreignQty?: Record<string, number>;
  /** Frozen sides whose foreign estimate was carried from a previously owned, non-frozen snapshot. */
  foreignQtyFrozen?: string[];
  /** Foreign/own mix cannot be derived safely; hold the key until ownership reconciliation. */
  foreignQtyUnknown?: string[];
  /**
   * the exchange orders on the positions at this step's read: positions held, how many carry their own stop and
   * their own take-profit, how many carry no take-profit by design (a lane without a target); stopsMissing and
   * tpsMissing name the keys (the repair and the upkeep place them this step)
   */
  protect?: {
    positions: number;
    stops: number;
    tps: number;
    noTarget: number;
    stopsMissing?: string[];
    tpsMissing?: string[];
    /** lane orders resting (live.laneOrders): each lane's own stop (V) and take-profit (Y) */
    laneStops?: number;
    laneTps?: number;
  };
  /** lane orders: lanes on the exchange, and what the step did to their orders */
  laneOrders?: { onExchange: number; placed: number; moved: number; cancelled: number; filled: number; pending: number };
  /** signal lane orders of a unit not active now and holding no position: not sent (they keep paper-trading) */
  inactiveSignal?: number;
}

export interface LiveAccount {
  /** The exchange's USDT account fields (wallet balance, equity = wallet + unrealized, free margin); null when no account snapshot is available. */
  wallet: number | null;
  equity: number | null;
  availableMargin: number | null;
  realized: number | null;
  source: "exchange" | "positions";
  /** unrealized PnL of every position the account holds (own and foreign), USDT */
  openNet: number;
  /** B = min(wallet, equity): the base of every account budget and equity-scaled cap (budgetBase) */
  base?: number | null;
  /** when the account was read (ms); `at` is when this status was stamped */
  readAt?: number | null;
  /** margin those positions are using, USDT */
  margin: number;
  /** realized + open, USDT; null until a balance read */
  overall: number | null;
  positions: number;
  orders: number;
  at: number;
  /** carried from an earlier step (this step ended before its account read): its numbers are `readAt` old */
  carried?: boolean;
  /**
   * the exchange positions, own and foreign apart (accountPositions): own sums from the own quantity only — the
   * operator's or another system's positions are shown, never counted in the own numbers
   */
  positionsDetail?: AccountPosition[];
  own?: { n: number; upnl: number; margin: number; notional: number };
  foreign?: { n: number; upnl: number; margin: number };
  /** Unresolved physical rows and unresolved keys with no physical row; excluded from both totals. */
  ownershipUnknown?: { n: number; pendingKeys?: number };
  /** Known own/foreign shares whose venue position uPnL was absent or invalid. */
  markUnknown?: { own: number; foreign: number };
}

export function liveAccount(book: BookView, snap: bx.AccountSnapshot | null, at = Date.now()): LiveAccount {
  let openNet = 0;
  let margin = 0;
  for (const p of book.positions) {
    openNet += p.upnl ?? 0;
    margin += p.margin ?? 0;
  }
  if (snap) {
    openNet = snap.unrealized;
    margin = snap.usedMargin;
  }
  return {
    wallet: snap?.wallet ?? null,
    equity: snap?.equity ?? null,
    availableMargin: snap?.availableMargin ?? null,
    realized: snap?.realized ?? null,
    source: snap ? "exchange" : "positions",
    openNet,
    margin,
    base: budgetBase(snap),
    readAt: snap ? at : null,
    overall: snap ? snap.realized + snap.unrealized : null,
    positions: book.positions.length,
    orders: book.orders.length,
    at,
  };
}

async function stampAccount(
  status: LiveStatus,
  ex: ExchangeClient,
  book: BookView,
  checkCurrent?: () => void,
): Promise<bx.AccountSnapshot | null> {
  let snap: bx.AccountSnapshot | null = null;
  if (ex.account) {
    try {
      snap = await ex.account();
    } catch {
      /* the position sums still describe the open book */
    }
  }
  checkCurrent?.();
  status.account = liveAccount(book, snap, snap?.at ?? (snap ? accountCache.get(clientCacheFingerprint(ex))?.at : undefined) ?? Date.now());
  // the last account read, per connection, for every sizing mode: the preview and the statistics read it (never the
  // paper balance for a live number); a failed read keeps the last one, with its age
  const scope = ownershipFingerprint(connIdOf(ex), ex);
  if (snap) accountSeen.set(scope, { at: status.account.readAt ?? Date.now(), snap });
  else {
    const last = accountSeen.get(scope);
    if (last) {
      status.account.wallet = last.snap.wallet;
      status.account.equity = last.snap.equity;
      status.account.availableMargin = last.snap.availableMargin;
      status.account.base = budgetBase(last.snap);
      status.account.readAt = last.at;
    }
  }
  return snap;
}

/** the connection id of a client (its fingerprint starts with it) */
const connIdOf = (ex: ExchangeClient) => ex.fingerprint().split("|")[0];

/** The last account read is scoped to the full current credential identity, not merely its connection label. */
const accountSeen = new Map<string, { at: number; snap: bx.AccountSnapshot }>();
export function lastAccount(connId: string): { at: number; snap: bx.AccountSnapshot } | null {
  const ex = bingxClient(connId as LiveSettings["connId"]);
  return accountSeen.get(ownershipFingerprint(connId, ex)) ?? null;
}
/** tests: forget every account read */
export function resetAccountSeen() {
  accountSeen.clear();
}

export interface LiveStatus {
  at: number;
  enabled: boolean;
  reason: string;
  placed: number;
  closed: number;
  cancelled: number;
  skipped: Array<{ sym: string; why: string }>;
  error: string | null;
  mode?: "overall" | "entries";
  control?: ControlStatus;
  account?: LiveAccount;
}

/** Serialised entry point (per runtime): overlapping calls wait for that runtime's running step instead of racing it. */
export function stepLive(
  rt: CoreRuntime,
  intents: LiveIntent[],
  gen: number,
  client?: ExchangeClient,
): Promise<LiveStatus> {
  // the live state is persisted at most once a second: the runtime flushes it on shutdown
  rt.flushLive ??= () => flushLiveKv(rt.db);
  const L = local(rt);
  // steps never overlap — except behind a step the watchdog abandoned (its epoch is gone): that one may never return
  // (an await without its own limit), and every later step queued behind it would wait forever ("waiting on: start");
  // it checks alive() before every order, so it sends nothing more and the new step runs at once
  const epoch = rt.liveEpoch ?? 0;
  const prev = L.running && L.runningEpoch === epoch ? L.running : Promise.resolve(null);
  const next: Promise<LiveStatus> = prev.then(() => {
    // A missing/invalid recovery baseline or journal makes every ownership-dependent action unsafe. Keep
    // existing exchange orders untouched and expose the error for reconciliation before either live mode runs.
    if (rt.db.lastJournalError) {
      const reason = `live ownership journal unavailable — reconciliation required: ${rt.db.lastJournalError}`;
      return done(rt, { at: Date.now(), enabled: false, reason, placed: 0, closed: 0, cancelled: 0,
        skipped: [], error: reason, mode: rt.settings.live.mode ?? "overall" }, reason);
    }
    return (rt.settings.live.mode ?? "overall") === "overall"
      ? runControl(
          rt,
          gen,
          client ??
            cachedClient(bingxClient(rt.settings.live.connId), rt.settings.live.syncMs ?? 1000),
        )
      : runStep(rt, intents, gen);
  });
  // the chain itself never rejects (callers get `next`, which may); no unhandled rejection can end the process
  const tail: Promise<unknown> = next
    .then(
      () => undefined,
      () => undefined,
    )
    .finally(() => {
      if (L.running === tail) L.running = null;
    });
  L.running = tail;
  L.runningEpoch = epoch;
  return next;
}

/** A measured cumulative entry quantity; a nonterminal partial is not proof that the remainder is gone. */
export function entryFilledQty(resp: unknown, sent: number): number | null {
  const o = orderReply(resp);
  const status = String(o?.status ?? "").toUpperCase();
  if (!/^(FILLED|PARTIALLY_FILLED|CANCELED|CANCELLED|EXPIRED|FAILED|REJECTED)$/.test(status)) return null;
  return entryCumulativeQty(o, sent);
}

/** Strictly measured cumulative quantities, including conflicting aliases and an oversized receipt. */
function entryCumulativeQty(o: Record<string, unknown> | null, sent: number): number | null {
  if (!o || !Number.isFinite(sent) || !(sent > 0)) return null;
  const raw = ["executedQty", "executedVolume", "cumExecQty", "filledQty"]
    .filter((key) => o[key] !== undefined).map((key) => o[key]);
  if (!raw.length) return null;
  const values = raw.map((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN);
  const tolerance = Math.max(1e-12, sent * 1e-12);
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > sent + tolerance || Math.abs(v - values[0]) > tolerance))
    return null;
  if (o.origQty !== undefined) {
    const v = o.origQty;
    const orig = typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN;
    if (!Number.isFinite(orig) || Math.abs(orig - sent) > tolerance) return null;
  }
  return Math.min(values[0], sent);
}

/** A poll must identify the original request; a direct POST response is tied to its request by the transport. */
function entryExecutionReceipt(resp: unknown, expected: {
  coid: string; oid: string; sym: string; side: number; kind: "E" | "C"; sentQty: number; oneway: boolean; poll: boolean;
}): { qty: number | null; terminal: boolean; oid: string } | null {
  const o = orderReply(resp);
  if (!o) return null;
  const rawIds = [o.orderId, o.orderID].filter((v) => v !== undefined && v !== null);
  const ids = rawIds.map((v) =>
    typeof v === "string" ? v.trim() : typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? String(v) : "");
  // The exchange may include an imprecise numeric alias beside the exact string ID. Ignore only that
  // numeric alias when a string is present; two conflicting exact strings still remain unresolved.
  const precise = ids.filter(Boolean);
  if (rawIds.some((v, index) => !ids[index] && !(typeof v === "number" && Number.isInteger(v) && v > 0 &&
    !Number.isSafeInteger(v) && rawIds.some((candidate) => typeof candidate === "string" && candidate.trim() !== "" &&
      Number(candidate) === v)))) return null;
  const clients = [o.clientOrderId, o.clientOrderID].filter((v) => v !== undefined && v !== null).map((v) =>
    typeof v === "string" ? v.trim().toUpperCase() : "");
  const client = expected.coid.toUpperCase();
  if (precise.some((v) => v !== precise[0]) || clients.some((v) => !v || v !== client) ||
      (expected.oid && precise.some((v) => v !== expected.oid))) return null;
  if (expected.poll && !((expected.oid && precise.includes(expected.oid)) || clients.includes(client))) return null;
  if (o.symbol !== undefined && String(o.symbol).toUpperCase() !== expected.sym.toUpperCase()) return null;
  const positionSide = expected.oneway ? "BOTH" : expected.side > 0 ? "LONG" : "SHORT";
  if (o.positionSide !== undefined && String(o.positionSide).toUpperCase() !== positionSide) return null;
  const side = (expected.kind === "E") === (expected.side > 0) ? "BUY" : "SELL";
  if (o.side !== undefined && String(o.side).toUpperCase() !== side) return null;
  if (o.type !== undefined && String(o.type).toUpperCase() !== "MARKET") return null;
  const qty = entryCumulativeQty(o, expected.sentQty);
  const status = String(o.status ?? "").toUpperCase();
  const full = qty !== null && Math.abs(qty - expected.sentQty) <= Math.max(1e-12, expected.sentQty * 1e-12);
  const terminal = qty !== null && (/^(CANCELED|CANCELLED|EXPIRED|FAILED|REJECTED)$/.test(status) ||
    (status === "FILLED" && full));
  return { qty, terminal, oid: precise[0] ?? expected.oid };
}

/**
 * An entries-mode exit order (an entry's stop or take-profit, BingX POST /openApi/swap/v2/trade/order): hedge mode bounds
 * it to the entry's own quantity — a closePosition order would also close someone else's quantity merged into the side
 * later (the operator's manual trade); one-way mode keeps closePosition (its BOTH side does not say whose part is whose).
 */
export function entryExitOrder(x: {
  sym: string;
  exitSide: "BUY" | "SELL";
  positionSide: "LONG" | "SHORT" | "BOTH";
  type: "STOP_MARKET" | "TAKE_PROFIT_MARKET";
  qty: number;
  stopPrice: number;
  coid: string;
  oneway: boolean;
}): Record<string, string | number> {
  return {
    symbol: x.sym,
    side: x.exitSide,
    positionSide: x.positionSide,
    type: x.type,
    quantity: x.qty,
    stopPrice: x.stopPrice,
    ...(x.oneway ? { closePosition: "true" } : {}),
    workingType: "MARK_PRICE",
    clientOrderID: x.coid,
  };
}

async function runStep(rt: CoreRuntime, intents: LiveIntent[], gen: number): Promise<LiveStatus> {
  const s = rt.settings.live;
  // entries mode reads the book over REST: with nothing new to send it runs at most every syncMs, not every tick
  const L = local(rt);
  if (rt.executionEntryBlocked?.()) intents = [];
  const fresh = intents.filter((i) => !L.entriesSent.has(entryIntentKey(i)));
  if (!fresh.length && L.lastEntries && Date.now() - L.lastEntries.at < (s.syncMs ?? 1000))
    return L.lastEntries.status;
  const st = await runStepNow(rt, intents, gen);
  L.lastEntries = { at: Date.now(), status: st };
  return st;
}

async function runStepNow(
  rt: CoreRuntime,
  intents: LiveIntent[],
  gen: number,
): Promise<LiveStatus> {
  const s = rt.settings.live;
  const status: LiveStatus = {
    at: Date.now(),
    enabled: false,
    reason: "",
    placed: 0,
    closed: 0,
    cancelled: 0,
    skipped: [],
    error: null,
  };
  const finish = () => {
    liveKvSet(rt.db, "liveStatus", status);
    rt.emit?.("live");
    return status;
  };
  // the step's epoch: abandoned by the watchdog (stuck too long), it sends nothing more
  const epoch = rt.liveEpoch ?? 0;
  const entryConn = s.connId, entryExchange = bingxClient(entryConn);
  const entryFingerprint = ownershipFingerprint(entryConn, entryExchange);
  const alive = () => rt.generation === gen && (rt.liveEpoch ?? 0) === epoch && rt.settings.live.connId === entryConn &&
    ownershipFingerprint(entryConn, entryExchange) === entryFingerprint;
  // Disabled or unauthenticated steps cannot recover or mutate account-specific pending state.
  if (!s.enabled) { status.reason = "live disabled in settings"; return finish(); }
  if (process.env.CTS_CORE_LIVE !== "1") { status.reason = "CTS_CORE_LIVE=1 not set on the host"; return finish(); }
  if (!entryExchange.hasKeys()) { status.reason = `no API keys for ${entryConn}`; return finish(); }
  const why = ensureLiveOwnershipAccount(rt, entryConn, entryExchange);
  if (why) { status.reason = why; status.error = why; return finish(); }
  const checkAccount = () => { if (!alive()) throw new Error("live entry step superseded by an account change"); };
  const signed: typeof bx.signed = async (...args) => { checkAccount(); const reply = await bx.signed(...args); checkAccount(); return reply; };
  const fetchBook: typeof bx.fetchBook = async (...args) => { checkAccount(); const reply = await bx.fetchBook(...args); checkAccount(); return reply; };
  const cancelOrder: typeof bx.cancelOrder = async (...args) => { checkAccount(); const reply = await bx.cancelOrder(...args); checkAccount(); return reply; };
  let entryBudgetQty: Map<string, number> | null = null;
  let entryBudgetStops: Map<string, number> | null = null;
  const record = (
    coid: string,
    cfg: string,
    sym: string,
    side: number,
    kind: string,
    qty: number,
    px: number,
    st: string,
    key: string,
    at = Date.now(),
  ) => {
    if (!alive()) throw new Error("entry ledger update superseded by an account change");
    const old = kind === "E" || kind === "C"
      ? rt.db.get<{ qty: number; status: string }>("SELECT qty,status FROM live_orders WHERE coid=?", coid) : null;
    const known = (status: string, q: number) => (status === "ok" || status === "pending") && q > 0 ? q : 0;
    const delta = known(st, qty) - (old ? known(old.status, old.qty) : 0);
    if (entryBudgetQty && (kind === "E" || kind === "C")) {
      const k = `${sym}|${side}`;
      entryBudgetQty.set(k, Math.max(0, (entryBudgetQty.get(k) ?? 0) + (kind === "E" ? delta : -delta)));
    }
    if (entryBudgetStops && kind === "S" && st === "ok" && px > 0) entryBudgetStops.set(`${sym}|${side}`, px);
    if (kind === "E" && delta > 0 && px > 0) {
      const spent = local(rt).marginSpent;
      while (spent.length && Date.now() - spent[0].at >= ACCOUNT_MS + 15_000) spent.shift();
      spent.push({ at: Date.now(), usd: delta * px });
    }
    rt.db.runDurable(
      "INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      coid,
      cfg,
      sym,
      side,
      kind,
      qty,
      px,
      st,
      key,
      at,
    );
  };
  // Entries keep msg as the intent's dedupe key. Accepted MARKET orders therefore keep their reconciliation
  // metadata separately, rather than replacing that key or treating an acknowledgement as a completed fill.
  type EntryExecution = { oid: string; cfg: string; sym: string; side: number; kind: "E" | "C"; sentQty: number; px: number; key: string; at: number; stopDist?: number; terminal?: boolean; closedQty?: number; polledAt?: number; positionSeen?: boolean; wasFlat?: boolean; unresolved?: boolean;
    knownQty?: number; fill?: { qty: number; px: number; fee: number | null; known: number; at: number }; stop?: { coid: string; qty: number } };
  const pendingKey = `entriesPendingExecutions|${s.connId}`;
  // A watermark keeps one latest submitted bar per exact config/symbol/direction rather than one tombstone per order.
  // Pending request records remain separate and are never compacted by this watermark.
  type SentMarks = { watermarks: Record<string, number>; ambiguous: Record<string, true>; symbols: Record<string, true>; global?: true };
  const sentField = "__sentIntentWatermarks";
  const stored = { ...(liveKv<Record<string, unknown>>(rt.db, pendingKey) ?? {}) };
  const rawMarks = stored[sentField];
  delete stored[sentField];
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const validMarks = rawMarks === undefined || (object(rawMarks) && object(rawMarks.watermarks) && object(rawMarks.ambiguous) &&
    object(rawMarks.symbols) && Object.values(rawMarks.watermarks).every((v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0) &&
    Object.values(rawMarks.ambiguous).every((v) => v === true) && Object.values(rawMarks.symbols).every((v) => v === true) &&
    (rawMarks.global === undefined || rawMarks.global === true));
  const marks: SentMarks = validMarks && object(rawMarks)
    ? { watermarks: { ...rawMarks.watermarks as Record<string, number> }, ambiguous: { ...rawMarks.ambiguous as Record<string, true> },
        symbols: { ...rawMarks.symbols as Record<string, true> }, ...(rawMarks.global ? { global: true as const } : {}) }
    : { watermarks: {}, ambiguous: {}, symbols: {}, ...(!validMarks ? { global: true as const } : {}) };
  const pending = stored as Record<string, EntryExecution>;
  const scopeOf = (cfg: string, sym: string, side: number) => JSON.stringify([cfg, sym, side]);
  const pairOf = (cfg: string, sym: string) => JSON.stringify([cfg, sym]);
  const stateOf = (poll: boolean): Record<string, unknown> => {
    const state: Record<string, unknown> = Object.fromEntries(Object.entries(pending).map(([coid, p]) => {
      if (poll) return [coid, p];
      const { polledAt: _poll, ...rest } = p;
      return [coid, rest];
    }));
    if (Object.keys(marks.watermarks).length || Object.keys(marks.ambiguous).length || Object.keys(marks.symbols).length || marks.global)
      state[sentField] = marks;
    return state;
  };
  const pendingJson = () => JSON.stringify(stateOf(false));
  let savedPending = pendingJson();
  const savePending = () => {
    if (!alive()) throw new Error("entry pending update superseded by an account change");
    const json = pendingJson();
    const changed = json !== savedPending;
    if (changed) {
      // The in-memory DB may crash between snapshots. This metadata is part of the order journal, written before
      // MARKET submission, so the restored qty=0 intent can recover sentQty and query its original client id.
      rt.db.runDurable("INSERT OR REPLACE INTO kv (k, v, at) VALUES (?, ?, ?)", pendingKey, json, Date.now());
      savedPending = json;
    }
    liveKvSet(rt.db, pendingKey, stateOf(true));
    if (changed) {
      // The JSON state must also contain this reservation before a possible dispatch. A journal remains
      // an independent recovery path when configured; the live cache can otherwise defer its kv write.
      flushLiveKv(rt.db);
      rt.db.flushState();
    }
    if (rt.db.lastStateError || rt.db.lastJournalError) {
      status.error ??= `pending ownership checkpoint unavailable: ${rt.db.lastStateError || rt.db.lastJournalError}`;
      return false;
    }
    return true;
  };
  // A crash may follow the durable non-dispatch marker but precede removal of its request metadata.
  // That marker is authoritative: never poll it into ownership or dedupe it as sent.
  let retiredUnsent = false;
  for (const coid of Object.keys(pending))
    if (rt.db.get<{ status: string }>("SELECT status FROM live_orders WHERE coid=?", coid)?.status === "not-sent") {
      delete pending[coid]; retiredUnsent = true;
    }
  if (retiredUnsent) savePending();
  // A state-only restart has no SQLite journal. Recover only the last explicitly measured cumulative execution;
  // the reservation itself was checkpointed before dispatch and remains in force even when the venue is unreadable.
  for (const [coid, p] of Object.entries(pending)) {
    const known = p.knownQty;
    if (known === undefined || !Number.isFinite(known) || known < 0 || known > p.sentQty + 1e-12) continue;
    const row = rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid=?", coid);
    if (!row || row.qty < known - 1e-12) record(coid, p.cfg, p.sym, p.side, p.kind, known, p.px, known > 0 ? "ok" : "pending", p.key, p.at);
    const f = p.fill;
    if (f && f.qty === known && f.qty > 0 && Number.isFinite(f.px) && f.px > 0 && !rt.db.get("SELECT coid FROM live_fills WHERE coid=?", coid))
      rt.db.runDurable("INSERT OR REPLACE INTO live_fills (coid,sym,side,kind,qty,ref_px,fill_px,fee,fee_known,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        coid, p.sym, p.side, p.kind, f.qty, p.px, f.px, f.fee, f.known, f.at);
  }
  const settled = (
    coid: string, cfg: string, sym: string, side: number, kind: "E" | "C", sentQty: number,
    px: number, key: string, at: number, resp: unknown, poll = false,
  ) => {
    const previous = rt.db.get<{ qty: number; status: string }>("SELECT qty,status FROM live_orders WHERE coid=?", coid);
    const before = previous && (previous.status === "ok" || previous.status === "pending") ? previous.qty : 0;
    const current = pending[coid];
    const receipt = entryExecutionReceipt(resp, { coid, oid: current?.oid ?? "", sym, side, kind, sentQty,
      oneway: (s.positionMode ?? "hedge") === "oneway", poll });
    const measured = receipt?.qty !== null && receipt?.qty !== undefined && receipt.qty >= before - 1e-12;
    const qty = measured ? Math.max(before, receipt!.qty!) : before;
    const waiting = !measured || !receipt!.terminal;
    const venueAt = Number(orderReply(resp)?.updateTime ?? orderReply(resp)?.time);
    let executedAt = at;
    if (kind === "C" && qty > 0) executedAt = Number.isFinite(venueAt) && venueAt >= at ? venueAt : Date.now();
    record(coid, cfg, sym, side, kind, qty, px, qty > 0 ? "ok" : waiting ? "pending" : "error", key, executedAt);
    if (kind === "C") {
      let closed = Math.max(0, qty - before);
      for (const [entryId, entry] of Object.entries(pending).sort((a, b) => a[1].at - b[1].at)) {
        if (!(closed > 0)) break;
        if (entry.kind !== "E" || entry.sym !== sym || entry.side !== side || entry.at > at) continue;
        const known = rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid=?", entryId)?.qty ?? 0;
        const took = Math.min(closed, Math.max(0, known - (entry.closedQty ?? 0)));
        entry.closedQty = (entry.closedQty ?? 0) + took;
        closed -= took;
        if (known > 0 && entry.closedQty >= known - 1e-12) {
          if (entry.terminal) delete pending[entryId];
          else entry.wasFlat = true;
        }
      }
    }
    const order = orderReply(resp);
    const f = measured && qty > 0 && order ? parseFill({ order: { ...order, executedQty: qty } }) : null;
    let savedFill = current?.fill;
    if (f) {
      const fee = cumulativeFillFee(rt.db, coid, sym, side, kind, qty, f);
      rt.db.runDurable(
        "INSERT OR REPLACE INTO live_fills (coid, sym, side, kind, qty, ref_px, fill_px, fee, fee_known, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        coid, sym, side, kind, qty, px, f.px,
        fee.fee, fee.known, executedAt,
      );
      savedFill = { qty, px: f.px, fee: fee.fee, known: fee.known, at: executedAt };
    } else if (qty > before + 1e-12) {
      // A previously priced partial is not a measured price for a larger cumulative fill.
      rt.db.runDurable("DELETE FROM live_fills WHERE coid=?", coid);
      savedFill = undefined;
    }
    // A terminal fill can precede the position endpoint too. Retain its known ownership until first observed;
    // terminal means there is no unfilled remainder to reserve or poll, rather than pretending it never filled.
    // A terminal entry remains reserved until a fresh book observes both its position and its recorded stop;
    // a later partial fill may otherwise release the parent while the original stop covers only the first slice.
    const awaitingProtection = kind === "E" && qty > 0 && !pending[coid]?.wasFlat;
    if (waiting || awaitingProtection) pending[coid] = { ...pending[coid], terminal: !waiting,
      oid: receipt?.oid ?? current?.oid ?? "", cfg, sym, side, kind, sentQty, px, key, at,
      knownQty: qty, fill: savedFill, polledAt: Date.now() };
    else delete pending[coid];
    savePending();
    return { qty, waiting, px: f?.px ?? px };
  };
  try {
    const network = liveNetwork(s.connId);
    // one-way accounts: one BOTH position per symbol, exits reduce-only (hedge: LONG / SHORT sides)
    const oneway = (s.positionMode ?? "hedge") === "oneway";
    const reduceOnly: Record<string, string> = oneway ? { reduceOnly: "true" } : {};
    const keys = bx.keysFor(s.connId);
    const hasKeys = !!(keys.apiKey && keys.secret);
    const envArmed = process.env.CTS_CORE_LIVE === "1";
    const recordedStopCovers = (coid: string, p: EntryExecution, b: BookView): boolean => {
      if (b.ordersAt !== undefined) return false;
      const known = rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid=?", coid)?.qty ?? p.knownQty ?? 0;
      const held = Math.max(0, known - (p.closedQty ?? 0));
      if (!(held > 0)) return true;
      const stops = new Map<string, number>();
      if (p.stop && Number.isFinite(p.stop.qty) && p.stop.qty > 0) stops.set(p.stop.coid.toUpperCase(), p.stop.qty);
      for (const row of rt.db.all<{ coid: string; qty: number }>(
        "SELECT coid,qty FROM live_orders WHERE kind='S' AND status='ok' AND msg=? AND sym=? AND side=?", p.key, p.sym, p.side,
      )) if (Number.isFinite(row.qty) && row.qty > 0) stops.set(row.coid.toUpperCase(), row.qty);
      let covered = 0;
      for (const [id, qty] of stops) {
        const order = b.orders.find((o) => o.venueSymbol === p.sym &&
          String(o.clientOrderId ?? "").toUpperCase() === id && isOwnCoid(o.clientOrderId, s.connId) &&
          !!o.type && /STOP|TRAIL/i.test(o.type) && (oneway || o.positionSide === (p.side > 0 ? "LONG" : "SHORT")));
        if (order?.remainingQty !== undefined && Number.isFinite(order.remainingQty) && order.remainingQty >= 0)
          covered += Math.min(qty, order.remainingQty);
      }
      return covered + Math.max(1e-12, held * 1e-12) >= held;
    };
    let book: BookView | null = null;
    let account: bx.AccountSnapshot | null = null;
    if (s.enabled && envArmed && hasKeys) {
      try {
        book = await fetchBook(network, s.connId);
        account = await stampAccount(status, entryExchange, book, checkAccount);
      } catch (err) {
        rt.db.event("warn", `live book: ${err instanceof Error ? err.message : err}`);
      }
    }
    // Reconcile cumulative execution on the original client id. Neither an explicit zero nor a partial reply
    // resubmits the intent's remainder, and replacing its quantity never books a partial fill twice.
    if (book && s.enabled && envArmed && hasKeys) {
      let changed = false;
      for (const [coid, p] of Object.entries(pending)) {
        if (!alive()) break;
        const before = rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid = ?", coid)?.qty ?? 0;
        if (p.kind === "E") {
          const visible = before > 0 && book.positions.some((b) => b.venueSymbol === p.sym && (oneway || (p.side > 0) === (b.side === "long")) && b.qty > 0);
          // Latch the lifecycle on every book read, including inside the status-poll throttle. A partial entry's
          // stop may flatten it before the remaining entry fills; merging those episodes invents execution history.
          if (visible) {
            if (p.wasFlat) p.unresolved = true;
            p.positionSeen = true;
          } else if (p.positionSeen) p.wasFlat = true;
          if (p.unresolved) continue;
          if (p.terminal) {
            if (visible && recordedStopCovers(coid, p, book)) delete pending[coid];
            continue; // terminal fill: no venue remainder, and a lagging book is never proof of closure
          }
        }
        if (Date.now() - (p.polledAt ?? 0) < 1_000) continue;
        p.polledAt = Date.now();
        try {
          const resp = await signed(network, s.connId, "GET", "/openApi/swap/v2/trade/order", {
            symbol: p.sym, ...(p.oid ? { orderId: p.oid } : { clientOrderID: coid }),
          });
          const receipt = entryExecutionReceipt(resp, { coid, oid: p.oid, sym: p.sym, side: p.side,
            kind: p.kind, sentQty: p.sentQty, oneway, poll: true });
          // A contradictory, missing or older cumulative reading is not a terminal receipt.
          if (!receipt || receipt.qty === null || receipt.qty < before - 1e-12) continue;
          if (p.kind === "E" && p.wasFlat && (receipt.qty > before + 1e-12 || receipt.terminal)) {
            p.unresolved = true;
            continue; // keep the known partial and its price; the missing close chronology must be reconciled
          }
          const got = settled(coid, p.cfg, p.sym, p.side, p.kind, p.sentQty, p.px, p.key, p.at, resp, true);
          if (got.qty > before + 1e-12) {
            changed = true;
            if (p.kind === "E" && !(before > 0)) status.placed++;
            if (p.kind === "C" && got.qty >= p.sentQty - 1e-12) status.closed++;
          }
        } catch (err) {
          rt.db.event("warn", `live pending ${p.sym}: ${err instanceof Error ? err.message : err}`);
        }
      }
      savePending();
      if (changed) book = await fetchBook(network, s.connId, { notBefore: Date.now(), maxAgeMs: 0 });
      for (const [coid, p] of Object.entries(pending))
        if (p.kind === "E" && p.terminal && book.positions.some((b) => b.venueSymbol === p.sym &&
          (oneway || (p.side > 0) === (b.side === "long")) && b.qty > 0) && recordedStopCovers(coid, p, book)) delete pending[coid];
      savePending();
    }
    const sim = rt.sim;
    const minPf = rt.settings.gates.minPf;
    const ready = liveEntryReadiness(sim, s, minPf, typeof rt.livePromotionGate === "function");
    const dayAgo = Date.now() - 24 * 3_600_000;
    const recent = new Set(
      rt.db
        .all<{ sym: string }>(
          "SELECT DISTINCT sym FROM live_orders WHERE kind = 'E' AND qty > 0 AND status IN ('ok', 'pending') AND at > ?",
          dayAgo,
        )
        .map((r) => r.sym),
    );
    const own = book ? ownSymbols(book, s.connId, recent) : new Set<string>();
    // the (symbol, side) keys of those recent own entries: in hedge mode a position is only ours to protect on a side
    // we entered — the other side of an own symbol may be someone else's
    const recentKeys = new Set(
      rt.db
        .all<{ sym: string; side: number }>(
          "SELECT DISTINCT sym, side FROM live_orders WHERE kind = 'E' AND qty > 0 AND status IN ('ok', 'pending') AND at > ?",
          dayAgo,
        )
        .map((r) => `${r.sym}|${Number(r.side) === 1 ? 1 : -1}`),
    );
    // A long-lived pending request can fill after the ordinary recent-entry lookback. Its measured quantity
    // remains eligible for bounded protection until the exact order is reconciled, regardless of age.
    for (const [coid, p] of Object.entries(pending)) if (p.kind === "E") {
      const known = rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid=?", coid)?.qty ?? p.knownQty ?? 0;
      if (known > (p.closedQty ?? 0) + 1e-12) { own.add(p.sym); recentKeys.add(`${p.sym}|${p.side}`); }
    }
    // Every dispatched intent (pending, ok or refused) is never sent again. Explicit local non-dispatch
    // is the only exception, retained durably so a restart can retry it with a fresh request identity.
    const sentRows = rt.db.all<{ coid: string; cfg: string | null; sym: string | null; side: number | null; k: string | null }>(
      "SELECT coid,cfg,sym,side,msg AS k FROM live_orders WHERE kind='E' AND status <> 'not-sent'",
    );
    let marksChanged = false;
    const setMark = (cfg: string, sym: string, side: 1 | -1, bar: number) => {
      const scope = scopeOf(cfg, sym, side), old = marks.watermarks[scope];
      if (old === undefined || bar > old) { marks.watermarks[scope] = bar; marksChanged = true; }
    };
    for (const row of sentRows) {
      // Other known connections have their own intent histories, even when a test shares an in-memory DB.
      if (!isOwnCoid(row.coid, s.connId) && (["bingx-x01", "bingx-vst-01", "bingx-vst-02"] as const)
        .some((conn) => conn !== s.connId && isOwnCoid(row.coid, conn))) continue;
      if (!row.sym) { if (!marks.global) { marks.global = true; marksChanged = true; } continue; }
      if (!row.cfg) { if (!marks.symbols[row.sym]) { marks.symbols[row.sym] = true; marksChanged = true; } continue; }
      const prefix = `${row.cfg}|${row.sym}|`, tail = row.k?.startsWith(prefix) ? row.k.slice(prefix.length) : "";
      const match = /^(\d+)(?:\|side=(-?1))?$/.exec(tail);
      const bar = match ? Number(match[1]) : NaN;
      if (!match || !Number.isSafeInteger(bar) || String(bar) !== match[1]) {
        const pair = pairOf(row.cfg, row.sym);
        if (!marks.ambiguous[pair]) { marks.ambiguous[pair] = true; marksChanged = true; }
        if (!marks.symbols[row.sym]) { marks.symbols[row.sym] = true; marksChanged = true; }
        continue;
      }
      const side = row.side === 1 || row.side === -1 ? row.side : null;
      const embedded = match[2] === undefined ? null : Number(match[2]);
      if (side === null || (embedded !== null && embedded !== side)) {
        if (!marks.symbols[row.sym]) { marks.symbols[row.sym] = true; marksChanged = true; }
        setMark(row.cfg, row.sym, 1, bar); setMark(row.cfg, row.sym, -1, bar);
      } else setMark(row.cfg, row.sym, side, bar);
    }
    if (marksChanged) savePending();
    const sent = new Set(intents.filter((i) => {
      const mark = marks.watermarks[scopeOf(i.cfg, i.sym, i.side)];
      return mark !== undefined && Number.isSafeInteger(i.barT) && i.barT <= mark;
    }).map(entryIntentKey));
    const L = local(rt);
    for (const i of intents) if (sent.has(entryIntentKey(i))) L.entriesSent.add(entryIntentKey(i));
    if (L.entriesSent.size > 20_000) L.entriesSent.clear();
    const plan = planLive({
      ready,
      settings: s,
      envArmed,
      hasKeys,
      book,
      ownSyms: own,
      sent,
      newestBarT: rt.status.lastBarT,
      intents: intents.map((i) => ({
        cfg: i.cfg,
        sym: i.sym,
        side: i.side,
        tp: i.protect.tp,
        // never a stop closer than the minimum (a lane's scaled stop on 1m can be a fraction of a percent)
        sl: Math.max(i.protect.sl, s.minStopPct ?? 0.01),
        barT: i.barT,
        volFactor: i.volFactor,
        rangeVol: i.rangeVol,
        managed: i.protect.trail > 0 || (i.kind !== undefined && i.kind !== "normal"),
        coordVol: i.coordVol,
        blockVol: i.blockVol,
        relateVol: i.relateVol,
        maxStack: i.maxStack,
        hedge: i.hedge,
        hedgeVol: i.hedgeVol,
      })),
    });
    status.enabled = plan.enabled;
    status.reason = plan.reason;
    status.skipped = plan.skipped;
    plan.entries = plan.entries.filter((e) => {
      if (!Number.isSafeInteger(e.barT) || e.barT < 0 || marks.global || marks.symbols[e.sym] || marks.ambiguous[pairOf(e.cfg, e.sym)]) {
        status.skipped.push({ sym: e.sym, why: "ambiguous legacy entry identity or invalid bar — entry held" });
        return false;
      }
      return true;
    });
    const unresolved = new Set(Object.values(pending).filter((p) => p.unresolved).map((p) => `${p.sym}|${oneway ? 0 : p.side > 0 ? 1 : -1}`));
    if (unresolved.size) {
      status.reason += " — execution chronology unresolved; key held";
      for (const key of unresolved) status.skipped.push({ sym: key.split("|")[0], why: "execution chronology unresolved; key held" });
      plan.entries = plan.entries.filter((e) => !unresolved.has(`${e.sym}|${oneway ? 0 : e.side}`));
    }
    let incompleteStop = false;
    if (book) for (const [coid, p] of Object.entries(pending)) {
      const known = rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid=?", coid)?.qty ?? p.knownQty ?? 0;
      if (p.kind !== "E" || known <= (p.closedQty ?? 0) + 1e-12 || recordedStopCovers(coid, p, book)) continue;
      if (!incompleteStop) status.reason += " — confirmed entry stop coverage incomplete or unverified; key held";
      incompleteStop = true;
      status.skipped.push({ sym: p.sym, why: "confirmed entry stop coverage incomplete or unverified; key held" });
    }
    // A pending / partial entry or reduction remains an ownership reservation even when the venue's book does
    // not yet list it. In one-way mode no opposite parent can enter the symbol while that reservation exists.
    const pendingReservations = new Set(Object.values(pending).map((p) => `${p.sym}|${oneway ? 0 : p.side}`));
    // Older pending rows may predate the reservation metadata. They remain ambiguous, not vacant capacity.
    for (const row of rt.db.all<{ coid: string; sym: string; side: number }>(
      "SELECT coid,sym,side FROM live_orders WHERE kind IN ('E','C') AND status='pending'",
    )) if (!pending[row.coid] && isOwnCoid(row.coid, s.connId)) pendingReservations.add(`${row.sym}|${oneway ? 0 : row.side}`);
    if (pendingReservations.size) plan.entries = plan.entries.filter((e) => {
      if (!pendingReservations.has(`${e.sym}|${oneway ? 0 : e.side}`)) return true;
      status.skipped.push({ sym: e.sym, why: "accepted entry or reduction is pending — ownership reserved" });
      return false;
    });
    if (!plan.enabled || !book) return finish();

    const ownOrderSides = new Set<string>();
    for (const order of book.orders)
      if (isOwnCoid(order.clientOrderId, s.connId))
        for (const side of [1, -1])
          if (!order.positionSide || (order.positionSide === "LONG") === (side > 0)) ownOrderSides.add(`${order.venueSymbol}|${side}`);
    entryBudgetQty = new Map(book.positions
      .filter((p) => own.has(p.venueSymbol) && (oneway || recentKeys.has(`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`) ||
        ownOrderSides.has(`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`)))
      .map((p) => [`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`, p.qty]));
    // Recent confirmed entries can precede the venue's position endpoint. Keep their unobserved quantity reserved
    // for the same bounded lag window as Overall; old flat history is not a permanently held position.
    const recentLedger = new Map<string, number>();
    for (const row of rt.db.all<{ coid: string; sym: string; side: number; kind: string; qty: number; status: string }>(
      "SELECT coid,sym,side,kind,qty,status FROM live_orders WHERE kind IN ('E','C') AND at>? ORDER BY at,rowid", Date.now() - LAG_MS,
    )) {
      if (!isOwnCoid(row.coid, s.connId) || (row.status !== "ok" && row.status !== "pending")) continue;
      const key = `${row.sym}|${row.side}`;
      recentLedger.set(key, Math.max(0, (recentLedger.get(key) ?? 0) + (row.kind === "E" ? row.qty : -row.qty)));
    }
    for (const [key, qty] of recentLedger) entryBudgetQty.set(key, Math.max(entryBudgetQty.get(key) ?? 0, qty));
    const visibleKeys = new Set(book.positions.filter((p) => p.qty > 0)
      .map((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`));
    const unseenPartial = new Map<string, number>();
    for (const [coid, p] of Object.entries(pending)) {
      if (p.kind !== "E" || p.wasFlat || p.unresolved) continue; // these reserve the full request below
      const key = `${p.sym}|${p.side}`;
      if (visibleKeys.has(key)) continue;
      const known = rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid=?", coid)?.qty ?? 0;
      unseenPartial.set(key, (unseenPartial.get(key) ?? 0) + Math.max(0, known - (p.closedQty ?? 0)));
    }
    // A never-observed partial remains owned while the remainder is executing, even after the ordinary lag
    // window. An empty position endpoint cannot release the known part and spend that capacity twice.
    for (const [key, qty] of unseenPartial) entryBudgetQty.set(key, Math.max(entryBudgetQty.get(key) ?? 0, qty));
    entryBudgetStops = new Map();
    for (const order of book.orders) {
      if (ownCoidKind(order.clientOrderId, s.connId) !== "S" || (order.type && !/STOP|TRAIL/i.test(order.type))) continue;
      const row = rt.db.get<{ sym: string; side: number; px: number; kind: string; status: string }>(
        "SELECT sym,side,px,kind,status FROM live_orders WHERE upper(coid)=?", order.clientOrderId!.toUpperCase());
      if (row?.kind === "S" && row.status === "ok" && row.px > 0) entryBudgetStops.set(`${row.sym}|${row.side}`, row.px);
    }

    // an own order belongs to the position on its position side (hedge mode); one without a side, or in one-way
    // mode, to the symbol's position
    const sameSide = (o: { positionSide?: "LONG" | "SHORT" }, p: { side: "long" | "short" }) =>
      oneway || !o.positionSide || (o.positionSide === "LONG") === (p.side === "long");
    // clean-up: own stop/target orders on a (symbol, side) that is flat now — and (hedge mode, quantity-bounded exits)
    // the one left of an entry's stop / take-profit pair whose other half left the book: that entry's quantity is gone,
    // and left resting beside someone else's quantity it would close theirs
    const pairs = new Map<string, string[]>();
    if (!oneway)
      for (const r of rt.db.all<{ coid: string; msg: string }>(
        // (older than a minute: an order placed moments ago may not show in the open orders yet)
        "SELECT coid, msg FROM live_orders WHERE kind IN ('S', 'T') AND status = 'ok' AND at > ? AND at < ? AND cfg != 'protect'",
        dayAgo,
        Date.now() - 60_000,
      ))
        (pairs.get(r.msg) ?? pairs.set(r.msg, []).get(r.msg)!).push(r.coid.toUpperCase());
    const restingIds = new Set(book.orders.map((o) => (o.clientOrderId ?? "").toUpperCase()));
    const halfGone = new Set<string>();
    for (const ids of pairs.values())
      if (ids.length >= 2 && ids.some((c) => !restingIds.has(c))) for (const c of ids) halfGone.add(c);
    for (const o of book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId) || !o.id) continue;
      const id = (o.clientOrderId ?? "").toUpperCase();
      const stopRow = ownCoidKind(o.clientOrderId, s.connId) === "S"
        ? rt.db.get<{ msg: string }>("SELECT msg FROM live_orders WHERE upper(coid)=? AND kind='S'", id) : null;
      if (Object.values(pending).some((p) => p.kind === "E" && p.sym === o.venueSymbol &&
        (oneway || !o.positionSide || o.positionSide === (p.side > 0 ? "LONG" : "SHORT")) &&
        (p.stop?.coid.toUpperCase() === id || stopRow?.msg === p.key))) continue;
      const flat = !book.positions.some((p) => p.venueSymbol === o.venueSymbol && sameSide(o, p));
      if (!flat && !halfGone.has((o.clientOrderId ?? "").toUpperCase())) continue;
      if (flat && [...unseenPartial].some(([key, qty]) => {
        const [sym, side] = key.split("|");
        return qty > 0 && sym === o.venueSymbol && (oneway || !o.positionSide || (o.positionSide === "LONG") === (Number(side) > 0));
      })) continue; // confirmed fills keep their protection while their position endpoint has never shown them
      if (await cancelOrder(network, s.connId, o.venueSymbol, o.id)) status.cancelled++;
    }

    // Protection pass: an own entry without its own stop can receive a bounded market close for its measured
    // remaining quantity. Exact pending receipts were reconciled above; an unreadable or unmeasured entry waits.
    // A prior terminal partial close subtracts only what it actually filled, so a later protective action can
    // address the remainder without resending an unresolved close. Exchange races can still leave protection uncertain.
    const unprotected = new Map<string, { qty: number; keys: string[] }>();
    for (const r of rt.db.all<{ coid: string; cfg: string; sym: string; side: number; qty: number; px: number; status: string; k: string }>(
      `SELECT e.coid, e.cfg, e.sym, e.side, e.qty, e.px, e.status, e.msg AS k FROM live_orders e
        WHERE e.kind = 'E' AND e.status IN ('ok', 'pending')
          AND (e.at > ? OR e.coid IN (SELECT value FROM json_each(?)))
          AND NOT EXISTS (SELECT 1 FROM live_orders x WHERE x.kind = 'S' AND x.status = 'ok' AND x.msg = e.msg
            AND x.sym=e.sym AND x.side=e.side)`,
      Date.now() - 600_000, JSON.stringify(Object.entries(pending).filter(([, p]) => p.kind === "E").map(([coid]) => coid)),
    )) {
      const closed = rt.db.get<{ qty: number | null }>(
        "SELECT SUM(qty) AS qty FROM live_orders WHERE kind='C' AND status IN ('ok','pending') AND msg=? AND sym=? AND side=?",
        r.k, r.sym, Number(r.side),
      )?.qty ?? 0;
      const qty = Math.max(0, (Number(r.qty) || 0) - Math.max(0, Number(closed) || 0));
      // A live remainder is reconciled only by its exact reservation above. A legacy row without metadata
      // cannot turn a partial or a cancel-pending status into a terminal result; its known qty stays protectable.
      if (r.status === "pending" && !(qty > 0))
        status.skipped.push({ sym: r.sym, why: "an entry's fill is unconfirmed — the protective close waits" });
      if (!(qty > 0)) continue;
      const k = `${r.sym}|${Number(r.side) === 1 ? 1 : -1}`;
      const u = unprotected.get(k) ?? unprotected.set(k, { qty: 0, keys: [] }).get(k)!;
      u.qty += qty;
      u.keys.push(r.k);
    }
    for (const p of book.positions) {
      if (!alive()) break;
      if (!own.has(p.venueSymbol)) continue;
      if (unresolved.has(`${p.venueSymbol}|${oneway ? 0 : p.side === "long" ? 1 : -1}`)) continue;
      // protected only by an own order on THIS position's side: a stop on the other side does not cover it. A side
      // without an own order that we did not enter recently is not ours (hedge mode): never closed here.
      if (!oneway && !recentKeys.has(`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`)) continue;
      if (
        book.orders.some(
          (o) => o.venueSymbol === p.venueSymbol && isOwnCoid(o.clientOrderId, s.connId) && sameSide(o, p),
        )
      )
        continue;
      if (Object.values(pending).some((x) => x.kind === "C" && x.sym === p.venueSymbol && (oneway || (x.side > 0) === (p.side === "long"))))
        continue; // an accepted protective close is still executing; never send it again
      const u = unprotected.get(`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`);
      // the own unprotected quantity only, in both modes: a one-way BOTH position may hold someone else's quantity too, and
      // this bound keeps that part out. A reduce-only close caps the close only at the BOTH net, which holds that part too
      const qty = Math.min(p.qty, u?.qty ?? 0);
      if (!(qty > 0)) continue;
      // one row per entry it protects (msg: the entry's key), so none of them is closed a second time (the extra rows
      // are local: an id outside the own tag, never looked for on the exchange)
      const ks = u?.keys.length ? u.keys : ["unprotected position closed"];
      const c = makeCoid(s.connId, "C");
      const closeAt = Date.now();
      try {
        record(c, "protect", p.venueSymbol, p.side === "long" ? 1 : -1, "C", 0, 0, "pending", ks[0], closeAt);
        pending[c] = { oid: "", cfg: "protect", sym: p.venueSymbol, side: p.side === "long" ? 1 : -1,
          kind: "C", sentQty: qty, px: 0, key: ks[0], at: closeAt, polledAt: Date.now() };
        savePending();
        const resp = await signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
          symbol: p.venueSymbol,
          side: p.side === "long" ? "SELL" : "BUY",
          positionSide: oneway ? "BOTH" : p.side === "long" ? "LONG" : "SHORT",
          type: "MARKET",
          quantity: qty,
          clientOrderID: c,
          ...reduceOnly,
        });
        const got = settled(c, "protect", p.venueSymbol, p.side === "long" ? 1 : -1, "C", qty, 0, ks[0], closeAt, resp);
        if (got.qty > 0)
          ks.forEach((k, i) => {
            if (i) record(`protected-${i}-${c}`, "protect", p.venueSymbol, p.side === "long" ? 1 : -1, "C", 0, 0, "ok", k);
          });
        if (got.qty >= qty - 1e-12) status.closed++;
      } catch (err) {
        record(c, "protect", p.venueSymbol, p.side === "long" ? 1 : -1, "C", 0, 0,
          err instanceof bx.ExchangeRejected ? "error" : "pending", ks[0], closeAt);
        if (!(err instanceof bx.ExchangeRejected)) {
          pending[c] = { oid: "", cfg: "protect", sym: p.venueSymbol, side: p.side === "long" ? 1 : -1,
            kind: "C", sentQty: qty, px: 0, key: ks[0], at: closeAt, polledAt: Date.now() };
        } else delete pending[c];
        savePending();
        rt.db.event(
          "error",
          `live protective close ${p.venueSymbol} FAILED: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (!plan.entries.length || !alive()) return finish();
    const specs = await bx.fetchContracts(network);
    const ticks = await rt.freshTickers();
    if (Date.now() - rt.tickersAt > 30_000) {
      status.skipped.push({ sym: "*", why: "prices older than 30 s — no entries this step" });
      return finish();
    }
    const fresh = new Map(ticks.map((t) => [t.sym, t.last]));
    // balance-% sizing, never above an explicitly configured balance-ratio cap; unknown balance → no entries
    const raw = await liveUnit(rt, bingxClient(s.connId), account);
    const balance = liveUnitPeek(rt).balance;
    const maxExposureX = s.exposureScaler === false ? 0 : s.maxExposureX ?? 0;
    const needsBalance = (s.maxPositionX ?? 0) > 0 || maxExposureX > 0 || (s.maxRiskPct ?? 0) > 0 || (s.maxBackstopLossPct ?? 0) > 0;
    if (raw === null || (needsBalance && balance === null)) {
      status.skipped.push({ sym: "*", why: "account balance unknown — no entries this step" });
      return finish();
    }
    // Entries intentionally uses one fixed/balance-% unit per intent; live.ratio is an Overall-only control.
    const cap = positionCapFor(positionCapOf(s), balance, s.maxPositionX);
    const rangeVolumeFactors = rangeVolumeFactorsOf(rt.settings.grid);
    const accountFresh = account && (account.at === undefined ||
      (Number.isFinite(account.at) && Date.now() - account.at <= EQUITY_MAX_AGE));
    const floor = s.minFreeMargin ?? 0;
    const free = accountFresh && account && typeof account.availableMargin === "number" && Number.isFinite(account.availableMargin)
      ? account.availableMargin : null;
    const entryBudgetUse = (key: string, q: number, plannedStop?: number | null) => {
      const [sym, sd] = key.split("|");
      const px = fresh.get(sym) ?? 0;
      const stop = entryBudgetStops!.get(key);
      const distance = plannedStop !== undefined ? plannedStop
        : stop && stop > 0 && px > 0 ? Math.max(0, Number(sd) * (px - stop) / px) : null;
      const notional = px > 0 && Number.isFinite(px) ? q * px : null;
      const risk = notional !== null && distance !== null ? notional * distance : null;
      return { notional, risk, worst: risk };
    };
    const checkEntryBudget = (e: { sym: string; side: number; sl: number }, qty: number, stopDist: number) => {
      const used = [...entryBudgetQty!].filter(([, q]) => q > 0).map(([key, q]) => entryBudgetUse(key, q));
      let pendingMargin = 0;
      let marginUnknown = false;
      for (const [coid, p] of Object.entries(pending)) {
        if (p.kind !== "E") continue;
        const got = rt.db.get<{ qty: number }>("SELECT qty FROM live_orders WHERE coid=?", coid)?.qty ?? 0;
        const remaining = p.terminal ? 0 : p.wasFlat || p.unresolved ? p.sentQty : Math.max(0, p.sentQty - got);
        if (!(remaining > 0)) continue;
        const basis = p.stopDist ?? parseConfigId(p.cfg)?.protect.sl ?? null;
        const reserved = entryBudgetUse(`${p.sym}|${p.side}`, remaining, basis);
        used.push(reserved);
        if (reserved.notional === null) marginUnknown = true;
        else pendingMargin += reserved.notional;
      }
      const addition = entryBudgetUse(`${e.sym}|${e.side}`, qty, stopDist);
      const blocked = accountGrowthBlock(used, addition, balance, {
        maxExposureX, maxRiskPct: s.maxRiskPct, maxBackstopLossPct: s.maxBackstopLossPct,
      });
      if (blocked) return blocked;
      if (floor > 0) {
        const spent = local(rt).marginSpent;
        while (spent.length && Date.now() - spent[0].at >= ACCOUNT_MS + 15_000) spent.shift();
        // This legacy path does not set/read leverage: reserve full notional (1×), never invent leverage capacity.
        const room = free === null || marginUnknown ? null : free - floor - pendingMargin - spent.reduce((sum, p) => sum + p.usd, 0);
        if (room === null || addition.notional === null || addition.notional > room + 1e-9)
          return `free-margin floor: ${room === null ? "unknown" : Math.max(0, room).toFixed(2)} USDT left after owned / pending entries`;
      }
      return null;
    };
    for (const e of plan.entries) {
      if (!alive()) break;
      const ind = e.cfg.split("|")[1] ?? "";
      const configuredRangeFactor = rangeVolumeFactorFor({ind,protect:{tag:rangeOfId(e.cfg)||undefined,
        exitType:kindOfId(e.cfg)==="exit"?"historic":undefined}},{rangeVolumeFactors,
        signalRangeVolumeFactors:rt.settings.signals.rangeVolumeFactors,
        exitVolumeFactor:rt.settings.exitStrategy.volumeFactor});
      const rangeFactor = e.rangeVol === undefined ? configuredRangeFactor : e.rangeVol;
      // Every supplied factor is entry-time evidence; invalid values cannot silently become neutral sizing.
      if ([rangeFactor, e.coordVol === undefined ? 1 : e.coordVol, e.blockVol === undefined ? 1 : e.blockVol,
          e.relateVol === undefined ? 1 : e.relateVol, e.hedge ? (e.hedgeVol === undefined ? 1 : e.hedgeVol) : 1,
          e.volFactor === undefined ? 1 : e.volFactor].some((x) => !Number.isFinite(x) || !(x > 0)) ||
          (e.maxStack !== undefined && (!Number.isFinite(e.maxStack) || e.maxStack < 1 || e.maxStack > 250))) {
        status.skipped.push({ sym: e.sym, why: "invalid captured execution sizing" });
        continue;
      }
      // Combine the captured sizing factors before the Real stack and account caps.
      const coordFactor = e.coordVol ?? 1;
      const blockFactor = e.blockVol ?? 1;
      const relateFactor = e.relateVol ?? 1;
      const hedgeFactor = e.hedge ? (e.hedgeVol ?? 1) : 1;
      // Real-stage Block, Relate and coordination multipliers are captured at validation; account and position caps
      // still gate the resulting size.
      const promotion = rt.livePromotionGate?.(e);
      rt.status.livePromotion = promotionStatus([{ cfg: e.cfg, sym: e.sym, side: e.side,
        ...(promotion ?? { required: true, ok: false, n: 0, pf: null, state: "execution-insufficient" }) }]);
      if (!promotion?.ok) {
        status.skipped.push({ sym: e.sym, why: `live promotion: ${promotion?.state ?? "execution evidence unavailable"}` });
        continue;
      }
      const spec = specs.get(e.sym) ?? null;
      const px = fresh.get(e.sym) ?? 0;
      if (!(px > 0)) {
        status.skipped.push({ sym: e.sym, why: "no fresh price" });
        continue;
      }
      // the exchange minimum above our notional is not a reason to skip the entry: it IS the smallest tradable size,
      // so the entry is sent at it — while it is at most MIN_RAISE_UNIT_X times our notional and still fits the
      // per-position cap (and the equity caps of the last read). Past either the symbol is too large for this
      // account: skipped with the reason (minRaiseBlock).
      const intentFactor = Number.isFinite(e.volFactor)
        ? Math.min(110, Math.max(0.01, e.volFactor!))
        : 1;
      const stack = rangeFactor * coordFactor * blockFactor * relateFactor * hedgeFactor * intentFactor;
      const maxStack = Number.isFinite(e.maxStack) ? Math.max(1, Math.min(250, e.maxStack!)) : Infinity;
      // Reapply the captured stack ceiling, then the venue-account position cap.
      const intentUnit = Math.min(raw * Math.min(stack, maxStack), cap);
      const minNotional = bx.exchangeMinNotional(spec, px);
      const blockedMin =
        minNotional > intentUnit * MIN_RAISE_UNIT_X
          ? `exchange minimum $${minNotional.toFixed(2)} is over ${MIN_RAISE_UNIT_X}x the notional $${intentUnit.toFixed(2)}`
          : minRaiseBlock(minNotional, cap);
      if (blockedMin) {
        status.skipped.push({ sym: e.sym, why: blockedMin });
        continue;
      }
      const sized = bx.snapQtyExchange(
        intentUnit / px,
        px,
        spec,
        venueMins(rt).get(e.sym)?.qty ?? 0,
      );
      let qty = sized.qty;
      if (!(qty > 0)) {
        status.skipped.push({ sym: e.sym, why: "size rounds to zero" });
        continue;
      }
      // Lot/minimum rounding may increase the requested size. The captured stack ceiling applies to the
      // quantity sent to the venue as well as the pre-rounding intent; do not trade above it to meet a minimum.
      const stackLimitUsd = raw * maxStack;
      if (Number.isFinite(stackLimitUsd) && qty * px > stackLimitUsd + Math.max(1e-9, stackLimitUsd * 1e-9)) {
        status.skipped.push({ sym: e.sym, why: "exchange minimum exceeds the captured Max stack" });
        continue;
      }
      const signalEntry = isSignalConfig(e.cfg);
      const signalMax = signalEntry ? signalTrailMax(e) : Infinity;
      const stopPx = bx.stopPxExchange(px, e.side, signalEntry ? Math.min(e.sl, signalMax) : e.sl, spec, venueMins(rt).get(e.sym)?.stop ?? 0, signalEntry ? signalMax : Infinity);
      const stopDist = Math.max(0, e.side * (px - stopPx) / px);
      if (signalEntry && (!(Number.isFinite(stopPx) && stopPx > 0) || stopDist > signalMax + 1e-12)) {
        status.skipped.push({ sym: e.sym, why: "Signal venue stop minimum exceeds the configured entry cap" });
        continue;
      }
      const admission = minRaiseBlock(qty * px, cap) ?? checkEntryBudget(e, qty, stopDist);
      if (admission) {
        status.skipped.push({ sym: e.sym, why: admission });
        continue;
      }
      const side = e.side === 1 ? "BUY" : "SELL";
      const exitSide = e.side === 1 ? "SELL" : "BUY";
      const positionSide = oneway ? "BOTH" : e.side === 1 ? "LONG" : "SHORT";
      const key = entryIntentKey(e);
      const markScope = scopeOf(e.cfg, e.sym, e.side), oldMark = marks.watermarks[markScope];
      const undoMark = () => { if (oldMark === undefined) delete marks.watermarks[markScope]; else marks.watermarks[markScope] = oldMark; };
      const ek = entryCoidKind(e.cfg);
      const coid = makeCoid(s.connId, ek);
      const entryAt = Date.now();
      let entryPx = px;
      // ledger kind "E" for every entry (the range is in the client id): sent / recent entries are read by it
      record(coid, e.cfg, e.sym, e.side, "E", 0, px, "pending", key, entryAt);
      L.entriesSent.add(key);
      try {
        pending[coid] = { oid: "", cfg: e.cfg, sym: e.sym, side: e.side, kind: "E", sentQty: qty,
          px, key, at: entryAt, stopDist, polledAt: Date.now() };
        setMark(e.cfg, e.sym, e.side, e.barT);
        if (!savePending()) {
          delete pending[coid]; undoMark(); savePending();
          record(coid, e.cfg, e.sym, e.side, "E", 0, px, "not-sent", key, entryAt);
          L.entriesSent.delete(key);
          status.skipped.push({ sym: e.sym, why: "entry not sent: ownership checkpoint unavailable" });
          continue;
        }
        const resp = await signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
          symbol: e.sym,
          side,
          positionSide,
          type: "MARKET",
          quantity: qty,
          clientOrderID: coid,
        });
        const got = settled(coid, e.cfg, e.sym, e.side, "E", qty, px, key, entryAt, resp);
        qty = got.qty;
        entryPx = got.px;
        if (!(qty > 0)) {
          status.skipped.push({ sym: e.sym, why: got.waiting ? "entry accepted, awaiting execution" : "entry executed zero — no position opened" });
          continue;
        }
        status.placed++;
      } catch (err) {
        // refused by the exchange: nothing filled. Otherwise it may still have filled (time-out after fill): keep it
        // "pending" so the symbol stays ours; the next step protects any position found on it (protection pass)
        record(
          coid,
          e.cfg,
          e.sym,
          e.side,
          "E",
          0,
          px,
          err instanceof bx.RequestBudgetDeferred ? "not-sent" : err instanceof bx.ExchangeRejected ? "error" : "pending",
          key,
          entryAt,
        );
        if (err instanceof bx.RequestBudgetDeferred) {
          delete pending[coid]; undoMark();
        } else if (!(err instanceof bx.ExchangeRejected)) {
          pending[coid] = { oid: "", cfg: e.cfg, sym: e.sym, side: e.side, kind: "E", sentQty: qty,
            px, key, at: entryAt, stopDist, polledAt: Date.now() };
        } else delete pending[coid];
        savePending();
        if (err instanceof bx.RequestBudgetDeferred) {
          L.entriesSent.delete(key);
          status.skipped.push({ sym: e.sym, why: err.message });
          break;
        }
        rt.db.event(
          "error",
          `live entry ${e.sym}: ${err instanceof Error ? err.message : err} — state unknown, re-checked next step`,
        );
        continue;
      }
      // the stop at a distance the venue accepts (its own tick, at least), the target by precision alone
      const sl = bx.stopPxExchange(entryPx, e.side, signalEntry ? Math.min(e.sl, signalMax) : e.sl, spec, venueMins(rt).get(e.sym)?.stop ?? 0, signalEntry ? signalMax : Infinity);
      const tp = bx.snapPx(e.side === 1 ? entryPx * (1 + e.tp) : entryPx * (1 - e.tp), spec);
      let protectedOk = true;
      for (const [kind, type, stopPrice] of [
        ["S", "STOP_MARKET", sl],
        ["T", "TAKE_PROFIT_MARKET", tp],
      ] as const) {
        let c = makeCoid(s.connId, kind);
        let sp = stopPrice;
        const placeExit = (cc: string, p: number) =>
          signed(
            network,
            s.connId,
            "POST",
            "/openApi/swap/v2/trade/order",
            entryExitOrder({ sym: e.sym, exitSide, positionSide, type, qty, stopPrice: p, coid: cc, oneway }),
          );
        try {
          if (kind === "T" && !(e.tp > 0)) continue;
          if (kind === "S" && signalEntry &&
            (!(Number.isFinite(sp) && sp > 0) || e.side * (entryPx - sp) / entryPx > signalMax + 1e-12))
            throw new Error("Signal actual-fill stop cannot meet the configured entry cap");
          try {
            await placeExit(c, sp);
          } catch (err) {
            // too close to the mark: widen once. Below, a failed protective order closes the position we have just
            // opened, so one retry here is the difference between a protected entry and a round trip paid for nothing.
            const msg = err instanceof Error ? err.message : String(err);
            if (kind !== "S" || !bx.stopTooClose(msg)) throw err;
            const wider = bx.widenStopDist(signalEntry ? Math.min(e.sl, signalMax) : e.sl, entryPx, spec);
            learnVenueMin(rt, e.sym, "stop", wider);
            record(c, e.cfg, e.sym, e.side, kind, qty, sp, "error", key);
            sp = bx.stopPxExchange(entryPx, e.side, wider, spec, wider, signalEntry ? signalMax : Infinity);
            if (signalEntry && (!(Number.isFinite(sp) && sp > 0) || e.side * (entryPx - sp) / entryPx > signalMax + 1e-12))
              throw new Error("Signal stop retry would exceed the configured entry cap");
            c = makeCoid(s.connId, kind);
            await placeExit(c, sp);
            rt.db.event(
              "warn",
              `live S ${e.sym}: stop was too close — placed at ${sp} (${(wider * 100).toFixed(2)} %)`,
            );
          }
          record(c, e.cfg, e.sym, e.side, kind, qty, sp, "ok", key);
          if (kind === "S" && pending[coid]) {
            pending[coid].stop = { coid: c, qty };
            savePending();
          }
        } catch (err) {
          protectedOk = false;
          record(c, e.cfg, e.sym, e.side, kind, qty, sp, "error", key);
          rt.db.event(
            "error",
            `live ${kind} ${e.sym}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
      if (!protectedOk) {
        // never leave an unprotected position: close it at market (own qty only)
        const c = makeCoid(s.connId, "C");
        const closeAt = Date.now();
        try {
          record(c, e.cfg, e.sym, e.side, "C", 0, px, "pending", key, closeAt);
          pending[c] = { oid: "", cfg: e.cfg, sym: e.sym, side: e.side, kind: "C", sentQty: qty,
            px, key, at: closeAt, polledAt: Date.now() };
          savePending();
          const resp = await signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
            symbol: e.sym,
            side: exitSide,
            positionSide,
            type: "MARKET",
            quantity: qty,
            clientOrderID: c,
            ...reduceOnly,
          });
          const got = settled(c, e.cfg, e.sym, e.side, "C", qty, px, key, closeAt, resp);
          if (got.qty >= qty - 1e-12) status.closed++;
        } catch (err) {
          record(c, e.cfg, e.sym, e.side, "C", 0, px, err instanceof bx.ExchangeRejected ? "error" : "pending", key, closeAt);
          if (!(err instanceof bx.ExchangeRejected)) {
            pending[c] = { oid: "", cfg: e.cfg, sym: e.sym, side: e.side, kind: "C", sentQty: qty,
              px, key, at: closeAt, polledAt: Date.now() };
          } else delete pending[c];
          savePending();
          rt.db.event(
            "error",
            `live protective close ${e.sym} FAILED: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
  }
  return finish();
}

// ── live state: in memory, persisted at most once a second ─────────────────────────────────────────────────
// The live step runs every 100 ms tick; parsing and rewriting its state (control memory, suppressed lane orders,
// status) as JSON in SQLite on every tick cost more than the decision itself at scale. Readers in this process
// get the newest value from memory (liveKv); the database copy is at most ~1 s behind and flushed on shutdown.
const liveMem = new WeakMap<CoreDb, Map<string, { v: unknown; wroteAt: number; dirty: boolean }>>();
const flushTimers = new WeakMap<CoreDb, ReturnType<typeof setTimeout>>();
function memOf(db: CoreDb) {
  let m = liveMem.get(db);
  if (!m) liveMem.set(db, (m = new Map()));
  return m;
}
/** Newest live state value (memory first, else the persisted copy). */
export function liveKv<T>(db: CoreDb, key: string): T | null {
  const e = memOf(db).get(key);
  // a copy, like a database read: the caller may change it freely
  if (e) return structuredClone(e.v) as T;
  const v = db.kvGet<T>(key) ?? null;
  if (v !== null) memOf(db).set(key, { v: structuredClone(v), wroteAt: Date.now(), dirty: false });
  return v;
}
/**
 * The newest value without a copy, for a reader that never changes it (the stored object is shared). The lane record
 * of a 2,000-position book was deep-copied on every read and every write of every step (x02, 7 Oct allocation profile).
 */
function liveKvView<T>(db: CoreDb, key: string): Readonly<T> | null {
  const e = memOf(db).get(key);
  if (e) return e.v as T;
  const v = db.kvGet<T>(key) ?? null;
  if (v !== null) memOf(db).set(key, { v, wroteAt: Date.now(), dirty: false });
  return v;
}
/** `owned`: the caller built `v0` fresh for the store and never changes it afterwards — kept without a copy. */
function liveKvSet(db: CoreDb, key: string, v0: unknown, owned = false) {
  // a snapshot, like a database write: later changes to the caller's objects never leak into the stored state
  const v = owned ? v0 : structuredClone(v0);
  const m = memOf(db);
  const e = m.get(key);
  const now = Date.now();
  if (!e || now - e.wroteAt >= 1_000) {
    db.kvSet(key, v);
    m.set(key, { v, wroteAt: now, dirty: false });
    return;
  }
  m.set(key, { v, wroteAt: e.wroteAt, dirty: true });
  if (!flushTimers.has(db)) {
    const t = setTimeout(() => {
      flushTimers.delete(db);
      flushLiveKv(db);
    }, 1_000);
    (t as { unref?: () => void }).unref?.();
    flushTimers.set(db, t);
  }
}
/** Persist every live state value changed since its last write (shutdown, snapshot). */
export function flushLiveKv(db: CoreDb) {
  const m = liveMem.get(db);
  if (!m) return;
  for (const [k, e] of m)
    if (e.dirty) {
      db.kvSet(k, e.v);
      m.set(k, { v: e.v, wroteAt: Date.now(), dirty: false });
    }
}

/** The durable account binding prevents a ledger from being used under a different API-key account. */
function ownershipFingerprint(conn: string, ex: ExchangeClient): string {
  const identity = ex.accountFingerprint ? ex.accountFingerprint() : ex.fingerprint();
  return createHash("sha256").update(conn).update("\0").update(identity).digest("hex");
}
function ensureLiveOwnershipAccount(rt: CoreRuntime, conn: string, ex: ExchangeClient): string | null {
  const db = rt.db;
  const current = ownershipFingerprint(conn, ex);
  // Only the explicit synthetic fixture opts into ephemeral ownership. An arbitrary injected client is not proof
  // that a venue is simulated; real execution requires a configured, successfully checkpointed state file.
  const fixtureMemory = (rt as CoreRuntime & { testOnlyAllowMemoryLive?: boolean }).testOnlyAllowMemoryLive === true;
  if (!db.hasStateStore() && !fixtureMemory)
    return "live ownership account checkpoint unavailable: no durable state file configured";
  // A failed configured checkpoint is sticky. A binding cached before that failure is not durable evidence.
  if (db.lastStateError || db.lastJournalError)
    return `live ownership account checkpoint unavailable: ${db.lastStateError || db.lastJournalError}`;
  // Presence is distinct from value: persisted null, arrays, and malformed bindings are not an empty store.
  // Check both the live cache and SQLite because a debounced write may currently live only in memory.
  const present = memOf(db).has("liveOwnershipAccount") || !!db.get("SELECT 1 FROM kv WHERE k=?", "liveOwnershipAccount");
  const binding = liveKv<unknown>(db, "liveOwnershipAccount");
  if (present) {
    if (!binding || typeof binding !== "object" || Array.isArray(binding) ||
      (binding as { version?: unknown }).version !== 1 ||
      (binding as { fingerprint?: unknown }).fingerprint !== current)
      return "live ownership account differs or is invalid — existing positions and orders require reconciliation";
    return null;
  }
  // Legacy live data has no cryptographic account provenance. Neither the short UI connHash nor an API-key name
  // can prove which account created it; never assign existing orders or pending executions to the current key.
  const rows = db.get("SELECT 1 FROM live_orders LIMIT 1") || db.get("SELECT 1 FROM live_fills LIMIT 1") ||
    db.get("SELECT 1 FROM live_lane_trades LIMIT 1") || db.get("SELECT 1 FROM live_submission_sequence LIMIT 1");
  const hasKey = (key: string) => memOf(db).has(key) || !!db.get("SELECT 1 FROM kv WHERE k=?", key);
  const hasOwnershipState = (key: string) => {
    if (!hasKey(key)) return false;
    const value = liveKv<unknown>(db, key);
    // Only an actual, valid empty object proves that this particular store has no reservations.
    return !value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 0;
  };
  const pendingPrefix = "entriesPendingExecutions|";
  const pendingKeys = new Set([
    ...db.all<{ k: string }>("SELECT k FROM kv WHERE substr(k,1,?)=? AND length(k)>?", pendingPrefix.length, pendingPrefix, pendingPrefix.length).map((r) => r.k),
    ...[...memOf(db).keys()].filter((k) => k.startsWith(pendingPrefix) && k.length > pendingPrefix.length),
  ]);
  const stored = ["liveLaneOpen", "laneOrders", "laneQuantityCaps", "positionExitCleanup", "orphanExitFences", "controlSuppressed", ...pendingKeys]
    .some(hasOwnershipState);
  // A persisted control status, including a partial or empty object, shows that this store has prior control
  // history but supplies no cryptographic account provenance. Its latest held/actions snapshot cannot prove that
  // older or lost orders never existed, so it cannot make an unbound ledger pristine.
  const statusEvidence = hasKey("controlStatus");
  if (rows || stored || statusEvidence)
    return "legacy live ownership has no account fingerprint — existing positions and orders require reconciliation";
  liveKvSet(db, "liveOwnershipAccount", { version: 1, fingerprint: current });
  flushLiveKv(db);
  if (!db.flushState() || db.lastJournalError)
    return `live ownership account checkpoint unavailable: ${db.lastStateError || db.lastJournalError}`;
  return null;
}

// ── Overall control orders ─────────────────────────────────────────────────────

/** One paper symbol × side on its way to the exchange: its lanes at each filter and whether it got a target. */
export interface KeyFunnel {
  key: string;
  /** the paper book's lanes on it (open, not stopped at tick) */
  paper: number;
  /** held back after their position was closed outside the desk */
  suppressed: number;
  /** held back by live.maxChase (the price ran past their entry) */
  chased: number;
  /**
   * a kind / range the operator does not send (live.kinds, live.excludeRanges, live.plainOnly, live.source), or a
   * config / signal unit the engine or the signal proof holds back
   */
  notSent: number;
  /** of notSent: held back by the signal proof alone (live.signalProofN; unset while it holds nothing back) */
  unproven?: number;
  /** not a selected config / not an active signal unit (kept paper-trading) */
  notSelected: number;
  /** lanes the step sends */
  sent: number;
  /** of those, left out by the budget fill (live.top) */
  budget: number;
  /** the key has an exchange target this step */
  target: boolean;
  /** why it has none: the dominant filter, or the target planner's reason (cap, venue minimum, foreign …) */
  why?: string;
  /** of the sent lanes, the positions Block raised (whole-position multiple above 1; Overall legs count once) */
  raised?: number;
  /**
   * set when the sizing ignores the volume the lanes ask for (live.positionSize "min" without lane orders: every
   * position is one exchange minimum): Block raised lanes here, and the exchange gets none of it
   */
  blockNote?: string;
}

/** The completeness summary of a control step: every paper key, with the reason the ones without a target lack it. */
export function keyFunnel(
  funnel: ReadonlyMap<string, KeyFunnel>,
  targets: ReadonlyArray<{ key: string }>,
  skipped: ReadonlyArray<{ sym: string; why: string }>,
  /** sizeMin: live.positionSize "min" sizes every position at one minimum (Block's volume never reaches the exchange) */
  opts: { sizeMin?: boolean } = {},
): KeyFunnel[] {
  const tk = new Set(targets.map((t) => t.key));
  const skipWhy = new Map(skipped.map((x) => [x.sym, x.why] as const));
  const sidesBySymbol = new Map<string, number>();
  for (const f of funnel.values()) {
    const sym = f.key.split("|")[0];
    sidesBySymbol.set(sym, (sidesBySymbol.get(sym) ?? 0) + 1);
  }
  const out: KeyFunnel[] = [];
  for (const f of funnel.values()) {
    const x: KeyFunnel = { ...f, target: tk.has(f.key) };
    const sym = x.key.split("|")[0];
    // The reservation describes blocked sibling parents, not why the surviving parent lacks a target.
    // Planner skips currently identify a symbol only; do not project one onto an ambiguous hedge side.
    if (!x.target && x.why === "aggregate position reserved for another parent" && x.sent > x.budget &&
      sidesBySymbol.get(sym) === 1 && skipWhy.has(sym)) x.why = skipWhy.get(sym);
    if (opts.sizeMin && (x.raised ?? 0) > 0)
      x.blockNote = `Block raised ${x.raised} position(s); live.positionSize "min" sends one exchange minimum — Block does nothing on the exchange`;
    if (!x.target && !x.why) {
      const kept = x.sent - x.budget;
      x.why =
        x.sent === 0
          ? x.notSent >= Math.max(x.chased, x.notSelected, x.suppressed)
            ? x.unproven && x.unproven * 2 >= x.notSent
              ? "not proven (live.signalProofN)"
              : "not sent (live kinds / ranges)"
            : x.chased >= Math.max(x.notSelected, x.suppressed)
              ? "chased (live.maxChase)"
              : x.notSelected >= x.suppressed
                ? "not selected / signal unit inactive"
                : "held back after an outside close"
          : kept <= 0
            ? "budget (live.top fill)"
            : (skipWhy.get(f.key.split("|")[0]) ?? "no target (sized to nothing)");
    }
    out.push(x);
  }
  return out.sort((a, b) => Number(a.target) - Number(b.target) || b.paper - a.paper);
}

/**
 * The lanes' id lookups: every lane id; a held-back lane recorded by an earlier build (id without the side:
 * cfg|sym|entryT) found by that id and its key (symbol|side); and the lane id by its lane key (laneKeyOf).
 */
function laneMapsOf(lanes: readonly ControlContribution[]) {
  const laneIds = new Set<string>();
  const legacyIds = new Map<string, string>();
  const laneIdByKey = new Map<string, string[]>();
  for (const l of lanes) {
    if (!l.id) continue;
    laneIds.add(l.id);
    const parent = l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side });
    const ids = laneIdByKey.get(parent) ?? [];
    ids.push(l.id);
    laneIdByKey.set(parent, ids);
    if (l.legacy) {
      legacyIds.set(l.legacy, l.id);
      continue;
    }
    const blk = l.id.indexOf("|blk:");
    const base = blk < 0 ? l.id : l.id.slice(0, blk);
    legacyIds.set(
      `${l.cfg}|${l.sym}|${base.slice(base.lastIndexOf("|") + 1)}${blk < 0 ? "" : l.id.slice(blk)}#${l.sym}|${l.side}`,
      l.id,
    );
  }
  return { laneIds, legacyIds, laneIdByKey };
}

/** a paper position's lane strings (ids and keys), built once per position: positions keep their identity */
type LaneStrings = { id: string; key: string; legacy: string };
const laneStrings = new WeakMap<object, LaneStrings>();
function laneStringsOf(p: { cfg: string; sym: string; side: number; entryT: number }): LaneStrings {
  let x = laneStrings.get(p);
  if (!x) {
    const sd = p.side > 0 ? 1 : -1;
    // the position's identity with its direction (laneKeyOf, the runtime's posId): a long and a short of one config
    // can enter on the same bar — without the side, holding back one held back both
    x = {
      id: `${p.cfg}|${p.sym}|${sd}|${p.entryT}`,
      key: `${p.sym}|${sd}`,
      // the id of the build before the side was part of it (cfg|sym|entryT), with its key
      legacy: `${p.cfg}|${p.sym}|${p.entryT}#${p.sym}|${sd}`,
    };
    laneStrings.set(p, x);
  }
  return x;
}

/** Runs a generator to its end, giving the loop back (setImmediate) whenever a slice has taken over ~12 ms. */
export async function sliced<R>(g: Generator<void, R>, sliceMs = 12): Promise<R> {
  let t = performance.now();
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
    if (performance.now() - t > sliceMs) {
      await new Promise<void>((res) => setImmediate(res));
      t = performance.now();
    }
  }
}

/**
 * Paper positions of every lane → contributions (one per lane position, with its Block volume). Runs on every control
 * step over the whole book: no string is built per step (laneStringsOf) and one object per lane. `positions`: the
 * book's positions (default the current book; the control step passes the book it hashed).
 */
export function laneContributions(
  rt: CoreRuntime,
  prices?: ReadonlyMap<string, number>,
  positions: CoreRuntime["paper"]["positions"] = rt.paper.positions,
): ControlContribution[] {
  const g = laneContributionsGen(rt, prices, positions);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/** Positions per slice of laneContributionsGen (~1 ms per 250 positions: 20 k positions took 55–95 ms in one piece). */
const LANE_SLICE = 2048;

/** laneContributions in slices: yields every LANE_SLICE positions (the live step gives the loop back between them). */
export function* laneContributionsGen(
  rt: CoreRuntime,
  prices?: ReadonlyMap<string, number>,
  positions: CoreRuntime["paper"]["positions"] = rt.paper.positions,
): Generator<void, ControlContribution[]> {
  // a lane whose stop was crossed at tick time no longer asks for its volume (its stop executes live now)
  const out: ControlContribution[] = [];
  let seen = 0;
  for (const p of positions) {
    if (++seen % LANE_SLICE === 0) yield;
    // Preserve the immutable position identity used by laneStringsOf's hot-path cache.
    // Projection is read-only; legacy wide Signal stops are bounded without cloning every lane per tick.
    const stop = isBoundedTrailingPosition(p) ? signalStopAt(p.entry, p.side, p.stop, positionTrailMax(p)) : p.stop;
    if (p.stopHit) continue;
    const ls = laneStringsOf(p);
    const id = ls.id;
    // Paper captures all external factors at entry. Reapplying today's range setting doubles it and resizes
    // held positions after edits. The recorded volume already includes the Axis set factor and ladder weight.
    const vol = p.vol ?? 1;
    // the backstop sits at the current price minus this distance: measure it from the current price, so a stop
    // trailed far past the entry does not widen the backstop by its whole run (|entry − stop| did)
    const px = prices?.get(p.sym) ?? 0;
    const sl =
      px > 0 && stop > 0
        ? Math.max(0.001, (p.side * (px - stop)) / px)
        : Math.abs(p.entry - stop) / p.entry || 0.05;
    // Budgets use current equity: giving back unrealized profit is a current account loss too. A late live
    // adoption must reserve mark→stop, even when the paper stop has already moved beyond its original entry.
    const risk = sl;
    // the run since the paper entry, in units of the target distance (a late exchange entry would pay it)
    const tpDist = p.entry > 0 && p.target > 0 ? Math.abs(p.target - p.entry) / p.entry : 0;
    const chase = px > 0 && tpDist > 0 ? Math.max(0, (p.side * (px - p.entry)) / p.entry) / tpDist : 0;
    // the lane's own exit levels: its target (the position's exchange take-profit sits beyond the farthest one) and
    // its stop (a moving price never loosens the exchange stop while it lies beyond the widest one)
    const protect = parseConfigId(p.cfg)?.protect;
    const trailOnly = p.trailOnly ?? protect?.trailOnly ?? false;
    // Every new position carries its own mode. Legacy Signal sets stay capped; the global engine switch must
    // never remove a Signal target. Explicit per-config modes also survive a settings reload.
    const trailFree = p.trailFree ?? (!cfgInfo(p.cfg).isSig && rt.settings.grid?.trailFree === true);
    const tgt = !trailOnly && p.target > 0 && !(trailFree && p.trailOn) ? p.target : undefined;
    const stopPx = stop > 0 ? stop : undefined;
    let legsN = 0;
    let legsSum = 0;
    if (p.legs)
      for (const k in p.legs) {
        const v = p.legs[k] ?? 0;
        if (v > 0) {
          legsN++;
          legsSum += v;
        }
      }
    // Minimum-lane units remove intrinsic DCA / Axis ladder weight for every Block mode. A legacy unraised
    // ordinary parent with no ladder/external provenance retains its documented single-unit rule.
    const externalUnits = legsN > 0 || (p.level ?? 0) > 0 || p.w !== undefined || p.volFactor !== undefined ||
      p.coordVol !== undefined || p.relateVol !== undefined || p.rangeVol !== undefined || p.hedgeVol !== undefined;
    const intrinsic = p.w ?? 1;
    const multiplier = positionMult(p);
    const unitsKnown = Number.isFinite(intrinsic) && intrinsic > 0 && Number.isFinite(multiplier) && multiplier > 0;
    // the position's whole execution multiple (Block × relation volume, without an Axis ladder's weight and without the
    // indication volume factor): every lane of it carries it, so live.plainOnly judges the position, not each Overall leg
    const mult = multiplier / (p.volFactor ?? 1);
    const c = (lid: string, v: number, legacy: string): ControlContribution => {
      const x: ControlContribution = {
        id: lid,
        cfg: p.cfg,
        sym: p.sym,
        side: p.side,
        vol: v,
        mult,
        blockVol: v / (p.volFactor ?? 1),
        sl,
        risk,
        chase,
        ...(isBoundedTrailingPosition(p) ? { stopMax: positionTrailMax(p) } : {}),
      };
      x.laneUnits = externalUnits ? (unitsKnown ? v / intrinsic : NaN) : 1;
      if (tgt !== undefined) x.tgt = tgt;
      if (stopPx !== undefined) x.stopPx = stopPx;
      x.key = ls.key;
      x.lk = id;
      x.legacy = legacy;
      return x;
    };
    if (!legsN) {
      out.push(c(id, vol, ls.legacy));
      continue;
    }
    // Block type overall: every raising source is its own lane order (own id), beside the base position;
    // together they ask for exactly the position's volume
    const scale = vol / (1 + legsSum);
    out.push(c(id, scale, ls.legacy));
    const hash = ls.legacy.indexOf("#");
    for (const src in p.legs) {
      const v = p.legs[src] ?? 0;
      if (!(v > 0)) continue;
      out.push(c(`${id}|blk:${src}`, scale * v, `${ls.legacy.slice(0, hash)}|blk:${src}${ls.legacy.slice(hash)}`));
    }
  }
  return out;
}

/** The exchange orders on the held positions (ControlStatus.protect): own stops and take-profits per key. */
export function protectOf(
  book: BookView,
  held: ReadonlyMap<string, number>,
  targetOf: ReadonlyMap<string, ControlTarget>,
  connId: LiveSettings["connId"],
  oneway: boolean,
  laneMode = false,
): NonNullable<ControlStatus["protect"]> {
  const kinds = new Map<string, { s: boolean; t: boolean }>();
  let laneStops = 0;
  let laneTps = 0;
  for (const o of book.orders) {
    const kind = ownCoidKind(o.clientOrderId, connId);
    if (!kind) continue;
    if (kind === "V") laneStops++;
    if (kind === "Y") laneTps++;
    if (kind === "V" || kind === "Y") continue;
    if (kind !== "S" && kind !== "T") continue;
    for (const sd of [1, -1] as const) {
      if (!oneway && o.positionSide && (o.positionSide === "LONG") !== (sd === 1)) continue;
      const k = `${o.venueSymbol}|${sd}`;
      const x = kinds.get(k) ?? { s: false, t: false };
      if (kind === "T") x.t = true;
      else x.s = true;
      kinds.set(k, x);
    }
  }
  const out: NonNullable<ControlStatus["protect"]> = { positions: 0, stops: 0, tps: 0, noTarget: 0 };
  const stopsMissing: string[] = [];
  const tpsMissing: string[] = [];
  for (const [key, qty] of held) {
    if (!(qty > 0)) continue;
    out.positions++;
    const x = kinds.get(key);
    if (x?.s) out.stops++;
    else stopsMissing.push(key);
    const t = targetOf.get(key);
    // (lane orders: the take-profits are the lanes' own — no position-wide one is wanted)
    if (laneMode) continue;
    if (t && !t.tpPx) out.noTarget++;
    else if (x?.t) out.tps++;
    else if (t) tpsMissing.push(key);
  }
  if (stopsMissing.length) out.stopsMissing = stopsMissing;
  if (tpsMissing.length) out.tpsMissing = tpsMissing;
  if (laneStops || laneTps) {
    out.laneStops = laneStops;
    out.laneTps = laneTps;
  }
  return out;
}

/** Only the explicit position-stop tag is evidence of a backstop; entries and closes are not protection. */
export const isBackstopKind = (kind: string) => kind === "S";

/**
 * The live record: one control step's attribution of the exchange position to its lanes (live-record.ts). Lanes that
 * left are written to live_lane_trades with the exchange's prices; the open ones persist across restarts. The fees
 * are the measured ones (slippage is in the fill prices already); before any are measured, the engine's cost model.
 */
export function recordLanes(
  rt: Pick<CoreRuntime, "db" | "settings">,
  x: Omit<LaneStepInput, "cost" | "now"> & { now?: number },
): LaneTrade[] {
  const lc = rt.db.kvGet<{ fee?: number }>("liveCost");
  // the measured round trip only once fees are measured (a stored zero is the unmeasured state, not a fee-free venue)
  const cost = lc && typeof lc.fee === "number" && lc.fee > 0 ? 2 * lc.fee : rt.settings.cost;
  // (attributeLanes never changes the record it reads; the next one is built fresh, sharing the unchanged lanes)
  const prev = liveKvView<Record<string, LaneOpen>>(rt.db, "liveLaneOpen") ?? {};
  const { open, closed } = attributeLanes(prev, { ...x, cost, now: x.now ?? Date.now() });
  for (const t of closed)
    rt.db.runDurable(
      "INSERT OR REPLACE INTO live_lane_trades (id, exit_t, cfg, sym, side, entry_t, entry, exit, r, reason, px_src) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      t.id,
      t.exitT,
      t.cfg,
      t.sym,
      t.side,
      t.entryT,
      t.entry,
      t.exit,
      t.r,
      t.reason,
      t.pxSrc ?? null,
    );
  liveKvSet(rt.db, "liveLaneOpen", open, true);
  return closed;
}

/**
 * The lane closes of the last day whose exit price is not the venue's — booked from the bars or the ticker, or
 * "unverified" (verifyClose) — re-priced from the account's order history the desk's loss check reads every minute
 * anyway (BingX allOrders rows: no extra exchange call). Per row: the last closing fills on its symbol × side up to a
 * minute after the close (and after the lane's entry) — one fill group, within CLOSE_GROUP_MS of the last — give the
 * exit (quantity-weighted), the reason (our backstop / take-profit → stop / target, the liquidation engine → liq, an
 * order not ours → hand, our own market order → exit) and px_src "history"; r follows at the row's own cost. Rows
 * without such a fill stay as they are. Returns the rows re-priced. The primary key is unchanged; the table's version
 * moves with the UPDATE, so memoized readers rebuild.
 */
export function reconcileLaneCloses(
  rt: { db: CoreDb; settings: { live: { connId: LiveSettings["connId"] } } },
  history: ReadonlyArray<Record<string, unknown>>,
  now = Date.now(),
): number {
  const rows = rt.db.all<{ id: string; exit_t: number; sym: string; side: number; entry_t: number; entry: number; exit: number; r: number }>(
    // relation: all rows — the reconciliation of unverified / bar / ticker prices itself
    "SELECT id, exit_t, sym, side, entry_t, entry, exit, r FROM live_lane_trades WHERE exit_t > ? AND (px_src IN ('bar', 'ticker') OR reason = 'unverified')",
    now - 24 * 3_600_000,
  );
  if (!rows.length || !history.length) return 0;
  const connId = rt.settings.live.connId;
  const closingOf = new Map<string, Array<{ t: number; q: number; px: number; why: LaneTrade["reason"] }>>();
  // a venue flag that reads on: the history row carries it as a boolean or as its text
  const flagOn = (v: unknown) => v === true || String(v ?? "").toLowerCase() === "true";
  for (const o of history) {
    const ps = String(o.positionSide ?? "").toUpperCase();
    const osd = String(o.side ?? "").toUpperCase();
    if (ps !== "LONG" && ps !== "SHORT" && ps !== "BOTH") continue;
    // a one-way (BOTH) row is the symbol's one position: the side it closes is the one its order side closes
    const isLong = ps === "BOTH" ? osd === "SELL" : ps === "LONG";
    if (osd !== (isLong ? "SELL" : "BUY")) continue;
    if (!String(o.status ?? "").toUpperCase().includes("FILLED")) continue;
    const q = Number(o.executedQty);
    const px = Number(o.avgPrice);
    const t = Number(o.updateTime ?? o.time ?? 0);
    if (!(q > 0) || !(px > 0) || !(t > 0)) continue;
    const coid = String(o.clientOrderId ?? "");
    const type = String(o.type ?? "").toUpperCase();
    // a one-way (BOTH) row counts only when it is a close: an own stop or take-profit, an order the venue flags
    // reduce-only or closePosition, or a liquidation / auto-deleverage fill (the engine took the position, so it closed
    // it whatever flags the row carries). The desk's own entry of the other side carries none of these, so it never
    // re-prices a close. An unflagged close by hand is left out too, until the venue's echo of its flags is confirmed
    const ownExit = isOwnCoid(coid, connId) && (type.startsWith("STOP") || type.startsWith("TAKE_PROFIT"));
    if (
      ps === "BOTH" &&
      !ownExit &&
      !isLiquidationType(o.type) &&
      !flagOn(o.reduceOnly) &&
      !flagOn(o.closePosition)
    )
      continue;
    let why: LaneTrade["reason"];
    if (isOwnCoid(coid, connId)) why = type.startsWith("TAKE_PROFIT") ? "target" : type.startsWith("STOP") ? "stop" : "exit";
    else why = isLiquidationType(o.type) ? "liq" : "hand";
    const k = `${String(o.symbol ?? "")}|${isLong ? 1 : -1}`;
    (closingOf.get(k) ?? closingOf.set(k, []).get(k)!).push({ t, q, px, why });
  }
  let n = 0;
  for (const r of rows) {
    const fills = (closingOf.get(`${r.sym}|${Number(r.side) === 1 ? 1 : -1}`) ?? []).filter(
      (f) => f.t <= r.exit_t + 60_000 && f.t > Math.max(r.entry_t, r.exit_t - 24 * 3_600_000),
    );
    if (!fills.length || !(r.entry > 0)) continue;
    const last = Math.max(...fills.map((f) => f.t));
    const group = fills.filter((f) => f.t >= last - CLOSE_GROUP_MS);
    const q = group.reduce((a, f) => a + f.q, 0);
    const px = group.reduce((a, f) => a + f.q * f.px, 0) / q;
    // the reason of the group's largest fill
    const why = group.reduce((a, f) => (f.q > a.q ? f : a)).why;
    const side = Number(r.side) === 1 ? 1 : -1;
    const cost = (side * (r.exit - r.entry)) / r.entry - r.r;
    const newR = (side * (px - r.entry)) / r.entry - (Number.isFinite(cost) ? cost : 0);
    rt.db.run(
      "UPDATE live_lane_trades SET exit = ?, r = ?, reason = ?, px_src = 'history' WHERE id = ? AND exit_t = ?",
      px,
      newR,
      why,
      r.id,
      r.exit_t,
    );
    n++;
  }
  return n;
}

/** closing fills this close to the last one belong to the same close (a market order filled in parts) */
const CLOSE_GROUP_MS = 5_000;

async function runControl(rt: CoreRuntime, gen: number, ex: ExchangeClient): Promise<LiveStatus> {
  const s = rt.settings.live;
  const status: LiveStatus = {
    at: Date.now(),
    enabled: false,
    reason: "",
    placed: 0,
    closed: 0,
    cancelled: 0,
    skipped: [],
    error: null,
    mode: "overall",
  };
  // the step's epoch: abandoned by the watchdog (stuck too long), it sends nothing more
  const epoch = rt.liveEpoch ?? 0;
  const initialConn = s.connId, initialFingerprint = ownershipFingerprint(initialConn, ex);
  const observed = observedAccount.get(rt);
  if (observed && observed.scope !== initialFingerprint) observedAccount.delete(rt);
  const alive = () => rt.generation === gen && (rt.liveEpoch ?? 0) === epoch && rt.settings.live.connId === initialConn &&
    ownershipFingerprint(initialConn, ex) === initialFingerprint;
  const checkAccount = () => { if (!alive()) throw new Error("live control step superseded by an account change"); };
  const phase = (p: string) => {
    if (alive()) rt.livePhase = p;
  };
  // read-only (no deep copy of the whole control record on every step: ~340 MB of garbage in 5 min on x02, 8 Oct)
  const prev = liveKvView<ControlStatus>(rt.db, "controlStatus") as ControlStatus | null;
  // the live record (live-record.ts): this step's fill prices per key, the keys it opened or closed, and the keys the
  // exchange closed on its own (→ the stop price when known)
  const grew = new Map<string, number>();
  const shrank = new Map<string, number>();
  const keyState = new Map<string, "open" | "closed">();
  const external = new Map<string, number | null>();
  // the keys of `external` closed by the exchange's take-profit, by hand, by a liquidation or unverified (the rest: by
  // its stop), and where each known price comes from
  const externalWhy = new Map<string, OutsideWhy>();
  const externalSrc = new Map<string, PxSrc>();
  // this step's flat markers per key: priced at the close the step attributes to the key (`external`) once known, so
  // the ledger's statistics book the exit the exchange made (statistics.ts liveTrades)
  const flatRows = new Map<string, { coid: string; msg: string }>();
  const pendingKeys = new Set<string>();
  const unverifiedOwnership = new Set<string>();
  const settledFlat = new Map<string, number>();
  const pendingFlat = new Map<string, { coid: string; qty: number; from: number; to: number }>();
  // Initialised from the reconciled owned book below, then changed only by confirmed cumulative fills.
  // A refusal or an unfilled reduction never releases another Signal set's account capacity.
  let budgetQty: Map<string, number> | null = null;
  let budgetStops: Map<string, number | null> | null = null;
  let budgetPending: Map<string, ControlRow> | null = null;
  // the real cost of every control fill: reference price at sending vs fill price, plus commission
  const fill = (
    coid: string,
    a: { sym: string; side: number },
    kind: string,
    qty: number,
    refPx: number,
    resp: unknown,
    at = Date.now(),
    trackMovement = true,
  ) => {
    if (!alive()) throw new Error("fill update superseded by an account change");
    if (!(qty > 0)) return;
    const f = parseFill(resp);
    if (trackMovement && f && f.px > 0) (kind === "O" || kind === "I" ? grew : shrank).set(`${a.sym}|${a.side}`, f.px);
    if (!f || !(refPx > 0)) return;
    const fee = cumulativeFillFee(rt.db, coid, a.sym, a.side, kind, qty, f);
    // The order ledger is journaled too: losing just its fill between snapshots would replace the real price and
    // commission with the reference price and modeled cost after a crash, changing the same trade's P&L.
    rt.db.runDurable(
      "INSERT OR REPLACE INTO live_fills (coid, sym, side, kind, qty, ref_px, fill_px, fee, fee_known, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      coid,
      a.sym,
      a.side,
      kind,
      qty,
      refPx,
      f.px,
      // Keep an explicit zero distinct from a missing commission across restart.
      fee.fee,
      fee.known,
      at,
    );
  };
  const record = (
    coid: string,
    a: { key: string; sym: string; side: number },
    kind: string,
    qty: number,
    px: number,
    st: string,
    msg = "",
    at = Date.now(),
  ) => {
    if (!alive()) throw new Error("control ledger update superseded by an account change");
    const previousRow = controlRows(rt).get(coid);
    let submissionSeq = previousRow?.submissionSeq ?? null;
    if (st === "pending" && ["O", "I", "S", "T", "V", "Y"].includes(kind) && !previousRow) {
      // This event is written before the order request. It is independent of wall-clock ties and remains stable
      // when the order row is later updated with its receipt. Old orders are never backfilled with guessed order.
      rt.db.runDurable("INSERT OR IGNORE INTO live_submission_sequence (coid, k, kind) VALUES (?, ?, ?)", coid, a.key, kind);
      if (rt.db.lastJournalError) throw new Error(`order submission sequence journal unavailable: ${rt.db.lastJournalError}`);
      submissionSeq = rt.db.get<{ seq: number }>(
        "SELECT seq FROM live_submission_sequence WHERE coid=? AND k=? AND kind=?", coid, a.key, kind)?.seq ?? null;
    }
    if (budgetQty && (kind === "O" || kind === "I" || kind === "R" || kind === "X" || kind === "F")) {
      const old = controlRows(rt).get(coid);
      const known = (status: string, q: number) => (status === "ok" || status === "pending") && q > 0 ? q : 0;
      if (kind === "F" && st === "ok") budgetQty.set(a.key, 0);
      else {
        const delta = known(st, qty) - (old ? known(old.status, old.qty) : 0);
        const direction = kind === "O" || kind === "I" ? 1 : -1;
        budgetQty.set(a.key, Math.max(0, (budgetQty.get(a.key) ?? 0) + direction * delta));
      }
    }
    if (budgetStops && kind === "S") {
      if (st === "pending") budgetStops.set(a.key, null);
      else if (st === "ok" && px > 0) budgetStops.set(a.key, px);
    }
    if (budgetPending && (kind === "O" || kind === "I")) {
      if (pendingOf(msg)) budgetPending.set(coid, { k: a.key, kind, status: st, qty, px, at, msg });
      else budgetPending.delete(coid);
    }
    if (st === "ok" && qty > 0 && (kind === "O" || kind === "I")) keyState.set(a.key, "open");
    if (st === "ok" && (kind === "F" || (kind === "X" && qty > 0 && !msg.startsWith("partial") && !pendingOf(msg)))) keyState.set(a.key, "closed");
    if (st === "ok" && kind === "F") flatRows.set(a.key, { coid, msg });
    rt.db.runDurable(
      "INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      coid,
      `control|${a.key}`,
      a.sym,
      a.side,
      kind,
      qty,
      px,
      st,
      msg,
      at,
    );
    noteControlRow(rt, coid, { k: a.key, kind, status: st, qty, px, at, msg, submissionSeq });
  };
  const protectiveCloseResult = (
    coid: string, a: { key: string; sym: string; side: number }, qty: number, px: number, reply: unknown, why: string, seen = false,
  ) => {
    const positionSide = (s.positionMode ?? "hedge") === "oneway" ? "BOTH" : a.side === 1 ? "LONG" : "SHORT";
    const { got, pending } = overallExecutionAck(reply, { coid, sym: a.sym, side: a.side === 1 ? "SELL" : "BUY",
      positionSide, sentQty: qty, positionSeen: seen });
    const full = !pending && got > 0 && got >= qty - 1e-12;
    record(coid, a, "X", got, px, got > 0 || !pending ? "ok" : "pending",
      pending ?? (full ? why : `partial: ${got} of ${qty}; ${why}`));
    fill(coid, a, "X", got, px, reply);
    if (pending) pendingKeys.add(a.key);
    if (full) status.closed++;
    return { got, full };
  };
  const cancelPendingRemainder = async (key: string) => {
    for (const row of controlRows(rt).values()) {
      if (row.k !== key) continue;
      const pending = pendingOf(row.msg);
      if (pending?.oid && await ex.cancel(key.split("|")[0], pending.oid)) status.cancelled++;
    }
  };
  try {
    const envArmed = process.env.CTS_CORE_LIVE === "1";
    const sim = rt.sim;
    const minPf = rt.settings.gates.minPf;
    if (!s.enabled) return done(rt, status, "live disabled in settings", ex);
    if (!envArmed) return done(rt, status, "CTS_CORE_LIVE=1 not set on the host", ex);
    if (!ex.hasKeys()) return done(rt, status, `no API keys for ${s.connId}`, ex);
    const accountHold = ensureLiveOwnershipAccount(rt, initialConn, ex);
    if (accountHold) { status.error = accountHold; return done(rt, status, accountHold, ex); }
    const banned = bx.blockingBanUntil();
    if (banned)
      return done(rt, status, `exchange rate limit until ${new Date(banned).toISOString()}`, ex);
    // readiness (rolling simulated run PF ≥ min and stable) can be waived per connection, e.g. on a testnet. Not
    // ready only blocks opening and increasing: positions already held are still closed, reduced and protected.
    const readiness = liveEntryReadiness(sim, s, minPf, typeof rt.livePromotionGate === "function");
    const notReady = readiness.ok ? null : `not ready: ${readiness.why}`;
    const connHash = stateHash([ex.fingerprint()]);
    const orphanConnName = s.connId;
    const exchange = ex;
    const orphanConnHash = () => createHash("sha256").update(orphanConnName).update("\0").update(exchange.fingerprint()).digest("hex");
    const orphanConn = orphanConnHash();
    const orphanFences = { ...(liveKv<Record<string, OrphanExitFence>>(rt.db, "orphanExitFences") ?? {}) };
    const persistOrphanFences = () => {
      liveKvSet(rt.db, "orphanExitFences", orphanFences);
      flushLiveKv(rt.db);
      if (!rt.db.flushState() || rt.db.lastJournalError)
        throw new Error(`orphan-exit checkpoint unavailable: ${rt.db.lastStateError || rt.db.lastJournalError}`);
    };
    // A newly placed aggregate stop or target may be accepted even when its acknowledgement is lost. Reserve
    // its client identity durably *before* dispatch, and persist its venue ID on acknowledgement. This covers all
    // aggregate placement, repair, resize and retry paths, including the first stop of a just-opened parent.
    // Native lane orders have their own durable lane map and are reconciled separately.
    const uncertainSubmitted = new Set<string>();
    let reserveCurrentSide: (key: string) => void = () => {};
    const markUncertain = (keys: string[]) => {
      for (const key of keys) { uncertainSubmitted.add(key); reserveCurrentSide(key); }
    };
    ex = new Proxy(exchange, {
      get(target, prop) {
        if (prop === "cancel") return async (sym: string, oid: string) => {
          if (!alive() || rt.settings.live.connId !== orphanConnName || orphanConnHash() !== orphanConn)
            throw new Error("venue cancellation superseded by a generation or connection change");
          // A boolean cancellation reply is not zero-fill evidence. Persist the exact cancellation attempt before
          // dispatch, including while the order still appears in the book; the venue may be about to remove it.
          const matching = Object.entries(orphanFences).filter(([, f]) =>
            f.conn === orphanConn && f.sym === sym && f.oid && f.oid === oid);
          if (matching.length) {
            for (const [, pending] of matching) markUncertain(orphanFenceKeys(pending));
            if (matching.some(([, pending]) => pending.cancelPending)) return false;
            for (const [id, pending] of matching) orphanFences[id] = { ...pending, cancelPending: true };
            persistOrphanFences(); // a failure aborts this venue cancellation before dispatch
          }
          try {
            const reply = await target.cancel(sym, oid);
            if (!alive()) throw new Error("venue cancellation reply superseded by an account change");
            return reply;
          } catch (err) {
            if (err instanceof bx.RequestBudgetDeferred && matching.length && alive() &&
              rt.settings.live.connId === orphanConnName && orphanConnHash() === orphanConn) {
              // This typed deferral is guaranteed not dispatched, so undo only this request's pending marker.
              for (const [id, previous] of matching) orphanFences[id] = previous;
              persistOrphanFences();
              return false;
            }
            throw err; // every transport/venue uncertainty keeps the durable pending identity
          }
        };
        if (prop !== "order") {
          const value = Reflect.get(target, prop, target);
          const guarded = ["book", "contracts", "account", "equity", "leverage", "marginMode", "orderStatus",
            "ordersSince", "feeHistory", "incomeHistory", "setPositionMode", "setMarginMode", "setLeverage"];
          if (guarded.includes(String(prop)) && typeof value === "function")
            return async (...args: unknown[]) => {
              if (!alive()) throw new Error("venue request superseded by an account change");
              const reply = await Reflect.apply(value, target, args);
              if (!alive()) throw new Error("venue reply superseded by an account change");
              return reply;
            };
          return typeof value === "function" ? value.bind(target) : value;
        }
        return async (p: Record<string, string | number>) => {
          if (!alive() || rt.settings.live.connId !== orphanConnName || orphanConnHash() !== orphanConn)
            throw new Error("venue submission superseded by a generation or connection change");
          const coid = String(p.clientOrderID ?? "");
          const kind = ownCoidKind(coid, orphanConnName);
          const type = String(p.type ?? "").toUpperCase();
          if ((kind !== "S" && kind !== "T") || (type !== "STOP_MARKET" && type !== "TAKE_PROFIT_MARKET")) {
            const reply = await target.order(p);
            if (!alive()) throw new Error("venue order reply superseded by an account change");
            return reply;
          }
          const sym = String(p.symbol ?? "");
          const rawSide = String(p.positionSide ?? "").toUpperCase();
          const positionSide = rawSide === "LONG" || rawSide === "SHORT" ? rawSide : "BOTH";
          const pending: OrphanExitFence = { conn: orphanConn, sym, coid, oid: "", positionSide, type };
          const keys = orphanFenceKeys(pending);
          if (!sym || keys.some((key) => uncertainSubmitted.has(key)))
            throw new Error("an uncertain conditional submission must be reconciled before another is sent");
          const pendingId = orphanFenceId(pending);
          orphanFences[pendingId] = pending;
          persistOrphanFences(); // abort before the venue call if durable state is unavailable
          let reply: unknown;
          try {
            reply = await target.order(p);
          } catch (err) {
            if (err instanceof bx.ExchangeRejected && alive() && rt.settings.live.connId === orphanConnName && orphanConnHash() === orphanConn) {
              delete orphanFences[pendingId];
              persistOrphanFences();
            } else {
              markUncertain(keys);
            }
            throw err;
          }
          if (!alive() || rt.settings.live.connId !== orphanConnName || orphanConnHash() !== orphanConn) {
            markUncertain(keys);
            throw new Error("orphan-exit acknowledgement superseded; its unknown identity remains reserved");
          }
          const response = orderReply(reply);
          const oid = exactVenueOrderIds(response?.orderID, response?.orderId);
          const consistent = (value: unknown, expected: string) => value == null || String(value).toUpperCase() === expected.toUpperCase();
          if (oid && consistent(response?.symbol, sym) && consistent(response?.clientOrderId, coid) &&
            consistent(response?.clientOrderID, coid) && consistent(response?.type, type) &&
            consistent(response?.positionSide, positionSide) && consistent(response?.side, String(p.side ?? ""))) {
            const known = { ...pending, oid };
            const knownId = orphanFenceId(known);
            orphanFences[knownId] = known;
            delete orphanFences[pendingId];
            try { persistOrphanFences(); } catch (err) {
              // The old durable unknown-ID reservation remains sufficient to fail closed after a crash.
              delete orphanFences[knownId];
              orphanFences[pendingId] = pending;
              markUncertain(keys);
              throw err;
            }
          } else {
            markUncertain(keys);
          }
          return reply;
        };
      },
    });
    const reconnected = !!prev && prev.connHash !== connHash;
    if (reconnected)
      rt.db.event(
        "warn",
        `live connection changed (${prev!.connHash} → ${connHash}): full re-sync from the exchange book`,
      );
    phase("book");
    // lanes changed since the last step (a config joined, left or resized: orders are about to go out): the book is
    // read now, not from the syncMs cache — an exchange stop that fired inside the cache window was not seen, and an
    // increase sized on the old quantity opened a new position with no stop until the next repair. One read per
    // decision step (lanes change on bar decisions and exits), never per tick
    const Lb = local(rt);
    // (the lanes follow the paper book: rebuilt and hashed only when it was replaced or changed in place — a crossed
    // stop, a volume — not on every step: every lane's string, sorted, on every 100 ms step was most of the garbage)
    // (the step acts on this one book, the one hashed: a book the paper step publishes while the step awaits the
    // exchange goes out on the next step, on a fresh read — its lanes went out on the old lanes' read, cached)
    const paper = rt.paper;
    const ps = paper.positions;
    let hits = 0;
    let vsum = 0;
    for (const p of ps) {
      if (p.stopHit) hits++;
      vsum += p.vol ?? 1;
    }
    const lk = Lb.lanesKey;
    const lanesHash =
      lk && lk.ps === ps && lk.n === ps.length && lk.hits === hits && lk.vsum === vsum
        ? lk.hash
        : stateHash(
            laneContributions(rt, undefined, ps)
              .map((l) => `${l.id}:${l.sym}:${l.side}:${l.vol}`)
              .sort(),
          );
    Lb.lanesKey = { ps, n: ps.length, hits, vsum, hash: lanesHash };
    const lanesChanged = Lb.lanesHash !== lanesHash;
    let book = await ex.book(lanesChanged ? { notBefore: Date.now(), maxAgeMs: 0 } : undefined);
    Lb.lanesHash = lanesHash;
    // Accepted is not executed. Keep the same order identity while a venue reports NEW / partially filled; a later
    // cumulative reply replaces its quantity and fill rather than inventing a second order or counting it twice.
    const ctlRows = controlRows(rt);
    const polls = executionPolls.get(rt.db) ?? new Map<string, number>();
    executionPolls.set(rt.db, polls);
    const executionConn = s.connId, executionFingerprint = ex.fingerprint();
    const executionMode = s.positionMode ?? "hedge", executionProcessing = s.mode ?? "overall";
    const executionContextCurrent = () => alive() && rt.settings.live.connId === executionConn &&
      ex.fingerprint() === executionFingerprint && (rt.settings.live.positionMode ?? "hedge") === executionMode &&
      (rt.settings.live.mode ?? "overall") === executionProcessing;
    let executionChanged = false;
    for (const [coid, row] of [...ctlRows]) {
      if (!executionContextCurrent()) return status;
      const pending = pendingOf(row.msg);
      if (!pending) continue;
      pendingKeys.add(row.k);
      const bookHeld = book.positions.some((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}` === row.k);
      const positionSeen = !!(pending.positionSeen || bookHeld);
      const wasFlat = !!(pending.wasFlat || (positionSeen && !bookHeld));
      if (positionSeen !== !!pending.positionSeen || wasFlat !== !!pending.wasFlat) {
        pending.positionSeen = positionSeen;
        pending.wasFlat = wasFlat;
        if (wasFlat && !pending.flatAt) pending.flatAt = Date.now();
        const [sym, sd] = row.k.split("|");
        record(coid, { key: row.k, sym, side: Number(sd) }, row.kind, row.qty, row.px ?? 0, row.status,
          PENDING_EXECUTION + JSON.stringify(pending), row.at);
      }
      if (wasFlat && !pending.flatBooked && row.qty > 0 && (row.kind === "O" || row.kind === "I"))
        pendingFlat.set(row.k, { coid, qty: row.qty, from: row.at, to: pending.flatAt ?? Date.now() });
      if (Date.now() - (polls.get(coid) ?? -Infinity) < 1_000) continue;
      polls.set(coid, Date.now());
      const [sym, sd] = row.k.split("|");
      if (!sym || (sd !== "1" && sd !== "-1") || !["O", "I", "R", "X"].includes(row.kind)) continue;
      const currentRow = controlRows(rt).get(coid);
      try {
        const named = book.orders.filter((o) => (o.clientOrderId ?? "").toUpperCase() === coid.toUpperCase());
        const expectedPositionSide = (s.positionMode ?? "hedge") === "oneway" ? "BOTH" : sd === "1" ? "LONG" : "SHORT";
        const matchingBook = named.filter((o) => o.venueSymbol === sym && (!o.positionSide || o.positionSide === expectedPositionSide) &&
          (!o.type || String(o.type).toUpperCase() === "MARKET"));
        const bookId = named.length === 1 && matchingBook.length === 1 ? exactExecutionOrderId(matchingBook[0].id) : "";
        const oid = exactExecutionOrderId(pending.oid) || bookId;
        let byVenueId = false;
        let reply: unknown = null;
        if (oid && ex.orderStatus) { byVenueId = true; reply = await ex.orderStatus(sym, oid); }
        else if (ex.ordersSince) {
          const history = await ex.ordersSince(sym, row.at - 60_000);
          const orders = Array.isArray(history) ? history : (history as { orders?: unknown[] } | null)?.orders;
          const matches = orders?.filter((o) => String((o as Record<string, unknown>).clientOrderId ??
            (o as Record<string, unknown>).clientOrderID ?? "").toUpperCase() === coid.toUpperCase()) ?? [];
          if (matches.length === 1) reply = matches[0];
        }
        if (!executionContextCurrent()) return status;
        if (controlRows(rt).get(coid) !== currentRow) continue; // another reconciliation changed this identity
        const state = orderReply(reply);
        const into = row.kind === "O" || row.kind === "I";
        const orderSide = (sd === "1") === into ? "BUY" : "SELL";
        if (!matchesOverallExecution(state, { oid: byVenueId ? oid : "", coid, sym,
          side: orderSide, positionSide: expectedPositionSide, sentQty: pending.sentQty })) continue;
        const cumulative = overallCumulativeQty(state);
        if (!state || cumulative.invalid || (cumulative.qty === null && String(state.status ?? "").toUpperCase() !== "FILLED")) continue;
        const got = overallExecutedQty(reply, pending.sentQty);
        if (got < row.qty) continue; // an older cumulative reply cannot take an already-booked fill away
        const venuePending = overallExecutionPending(reply, pending.sentQty);
        if ((row.kind === "O" || row.kind === "I") && wasFlat && (got > row.qty || bookHeld || pending.unresolved)) {
          // The position was observed then went flat, but cumulative execution has grown since the last known
          // quantity. The reply cannot tell which fill preceded its stop: keep the known entry and hold the key.
          record(coid, { key: row.k, sym, side: Number(sd) }, row.kind, row.qty, row.px ?? 0, row.status,
            PENDING_EXECUTION + JSON.stringify({ ...pending, positionSeen: true, wasFlat: true, unresolved: true,
              late: { executedQty: state.executedQty ?? state.executedVolume, avgPrice: state.avgPrice,
                commission: state.commission ?? state.fee, status: state.status, updateTime: state.updateTime ?? state.time, observedAt: Date.now() } }), row.at);
          status.skipped.push({ sym, why: "late cumulative fill after a flat position — execution chronology unresolved; key held" });
          continue;
        }
        // A confirmed entry and a lagging position endpoint are not permission for another entry. Keep its order
        // identity until the position is observed; a side already held last step can instead have stopped out.
        const awaitingPosition = !venuePending && got > 0 && (row.kind === "O" || row.kind === "I") &&
          !bookHeld && !positionSeen;
        const stillPending = venuePending || awaitingPosition;
        const msg = stillPending
          ? PENDING_EXECUTION + JSON.stringify({ ...pending, oid: executionResponseId(state) || oid || pending.oid, positionSeen, wasFlat })
          : got < pending.sentQty - 1e-12 ? `partial: ${got} of ${pending.sentQty}` : "";
        const a = { key: row.k, sym, side: Number(sd) };
        const actualAt = Number(state.updateTime ?? state.time);
        const at = row.kind === "O" || row.kind === "I" || got === row.qty ? row.at
          : Number.isFinite(actualAt) && actualAt > 0 ? actualAt : Date.now();
        record(coid, a, row.kind, got, row.px ?? 0, got > 0 || !stillPending ? "ok" : "pending", msg, at);
        fill(coid, a, row.kind, got, row.px ?? 0, reply);
        if (got !== row.qty || !venuePending) executionChanged = true;
        if ((row.kind === "O" || row.kind === "I") && row.qty === 0 && got > 0) status.placed++;
        if (!stillPending) {
          pendingKeys.delete(row.k);
          polls.delete(coid);
          if (positionSeen && !bookHeld && ((got > 0 && (row.kind === "O" || row.kind === "I")) ||
            (got < pending.sentQty && (row.kind === "X" || row.kind === "R")))) settledFlat.set(row.k, row.at - 60_000);
          if (row.kind === "X" && got >= pending.sentQty && got > 0) {
            status.closed++;
            rt.db.event("info", `live: ${row.k} was closed by our own close order — confirmed by venue execution`);
          }
        }
      } catch {
        if (!executionContextCurrent()) return status;
        // Unknown is still pending: the key cannot submit another order while the first may execute.
      }
    }
    if (executionChanged) book = await ex.book({ notBefore: Date.now(), maxAgeMs: 0 });
    for (const key of pendingKeys)
      status.skipped.push({ sym: key.split("|")[0], why: "accepted order execution pending — no duplicate action" });
    phase("account");
    const acct = await stampAccount(status, ex, book, checkAccount);
    // B = min(wallet, equity): every account budget and equity-scaled cap is sized on it — open profit never
    // inflates a budget (budgetBase)
    const B = budgetBase(acct);
    // positions we opened in the last 10 minutes may not carry their stop yet (also a fill whose reply timed out);
    // with open orders from an earlier read (rate limited), every position opened since that read
    const ordersStale = book.ordersAt !== undefined;
    const recentFrom = Math.min(Date.now() - 600_000, book.ordersAt ?? Infinity);
    // since when this desk's hedge-mode exits are quantity-bounded: an own stop / take-profit placed before (closePosition,
    // by an earlier version) is replaced by a bounded one at its price (the exit-size pass below)
    let boundedSince = liveKv<number>(rt.db, "liveBoundedSince");
    if (typeof boundedSince !== "number") liveKvSet(rt.db, "liveBoundedSince", (boundedSince = Date.now()));
    // the exchange returns client order ids in lower case (BingX): the ledger is matched case-insensitively — an exact
    // lookup missed every resting stop, so no backstop was ever re-priced on x01
    let ctlUpper: Map<string, ControlRow> | null = null;
    const ctlByUpper = () => (ctlUpper ??= new Map([...ctlRows].map(([k, v]) => [k.toUpperCase(), v])));
    const recent = new Set<string>();
    for (const r of ctlRows.values())
      if ((r.kind === "O" || r.kind === "I") && (r.status === "ok" || r.status === "pending") && r.at > recentFrom)
        recent.add(r.k);
    // only what this system opened: a larger exchange position (someone else added to the same symbol and
    // direction) is partly foreign — its excess is never reduced, closed or rebalanced
    const ledger = ownLedger([...ctlRows.values()]);
    // hedge mode: foreignness is per (symbol, side) — a foreign position on one side never freezes our other side
    const posOneway = (s.positionMode ?? "hedge") === "oneway";
    // live.foreignSides "independent" (hedge mode): someone else's quantity on a side freezes nothing — the desk trades
    // its own quantity there beside it, with quantity-bounded orders only
    const independent = !posOneway && s.foreignSides === "independent";
    const { held, foreign } = controlOwnership(
      book,
      s.connId,
      recent,
      new Set([...ledger].filter(([, q]) => q > 0).map(([k]) => k)),
      posOneway ? "oneway" : "hedge",
      independent,
    );
    const previousUnknownForeign = new Set(!reconnected ? (prev?.foreignQtyUnknown ?? []) : []);
    // Before provenance markers existed a frozen status could have counted the entire mixed side as foreign.
    // A surviving positive estimate with no prior held side or successful entry is not a trusted baseline.
    // Preserve that ambiguity even if the foreign order later disappears or the process restarts.
    if (!reconnected && prev?.foreignQty) for (const key of Object.keys(prev.foreignQty)) {
      if ((ledger.get(key) ?? 0) > 0 && !prev.foreignQtyFrozen?.includes(key) &&
        !prev.held?.some((h) => h.key === key && h.qty > 0) &&
        !prev.actions?.some((a) => a.key === key && a.ok && (a.kind === "open" || a.kind === "increase")))
        previousUnknownForeign.add(key);
    }
    for (const key of previousUnknownForeign) if ((ledger.get(key) ?? 0) > 0) {
      // A legacy frozen snapshot may already have counted unknown owned quantity as foreign. Never promote that
      // estimate into a reduction or a market action just because the operator's resting order disappeared.
      held.delete(key);
      unverifiedOwnership.add(key);
      foreign.add(posOneway ? key.split("|")[0] : key);
      status.skipped.push({ sym: key.split("|")[0], why: "foreign/own quantity provenance unavailable — reconciliation required" });
    }
    // flat markers: a key the ledger still counts as ours, flat on the exchange and not opened recently (a stop-out,
    // a manual close, an open that never filled) — the ledger restarts from 0 there, so it never only grows
    const onExchange = new Set(
      book.positions.map((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`),
    );
    // the stop the key's current position carried (its last S row since its open; null: none, or a flat marker or a new
    // open came after it — a new position never inherits the stop of the one before)
    const stopPxOf = (k: string) => controlStopPxOf(ctlRows.values(), k);
    // the stop each flat marker of this step is priced at, read before the marker is written: a flat row is the key's
    // latest row and clears the memory (as an open does), so a marker written first would never find the stop it closed at
    const stopAtFlat = new Map<string, number | null>();
    const ownedExitAtFlat = new Map<string, { why: "stop" | "target"; px: number }>();
    // the take-profit the key's current position carried (its last T row since its open; null: none, or cancelled
    // without a new one — a "gone" row)
    const tpPxOf = (k: string) => {
      let px: number | null = null;
      for (const r of ctlRows.values()) {
        if (r.k !== k) continue;
        if (r.kind === "O" || r.kind === "F" || (r.kind === "T" && r.status === "gone")) px = null;
        else if (r.kind === "T" && (r.status === "ok" || r.status === "pending") && (r.px ?? 0) > 0) px = r.px!;
      }
      return px;
    };
    // the take-profit each flat marker of this step is priced at, read before the marker is written: the marker is the
    // key's latest row and clears tpPxOf, as it clears stopPxOf (stopAtFlat above)
    const tpAtFlat = new Map<string, number | null>();
    // the position key (`${venueSymbol}|1` long, `|-1` short) an own order belongs to. Hedge mode: its position side.
    // One-way: the order names no side (BOTH; the book reads it as none), so the key its own record was sent for, else
    // the symbol's one net position (one-way holds one position per symbol); neither: null — never a guess
    const keyOfOwn = (o: { venueSymbol: string; positionSide?: string; clientOrderId?: string }, bk: BookView): string | null => {
      const ps = String(o.positionSide ?? "").toUpperCase();
      if (!posOneway) return `${o.venueSymbol}|${ps === "SHORT" ? -1 : 1}`;
      if (ps === "LONG" || ps === "SHORT") return `${o.venueSymbol}|${ps === "LONG" ? 1 : -1}`;
      const [rsym, rsd] = (ctlByUpper().get((o.clientOrderId ?? "").toUpperCase())?.k ?? "").split("|");
      if (rsym === o.venueSymbol && (rsd === "1" || rsd === "-1")) return `${rsym}|${rsd}`;
      const net = bk.positions.find((p) => p.venueSymbol === o.venueSymbol);
      return net ? `${o.venueSymbol}|${net.side === "long" ? 1 : -1}` : null;
    };
    // own close orders resting on a key at this step's read: its stop(s) and its take-profit(s). One-way: the order is
    // the key's when keyOfOwn says so. keyOfOwn is the lane convention: a BOTH order belongs to its own lane (its
    // control record's key, else the symbol's one net position), as its backstop count, lane fill and no-backstop
    // reads take it. noSideOf (the lagging set, the orphan flat tests) counts a BOTH order on either side instead.
    // Hedge: its side
    const restingOf = (k: string) => {
      const [rsym, rsd] = k.split("|");
      const out = { stopLeft: false, tpLeft: false };
      if (ordersStale) return out;
      for (const o of book.orders) {
        if (o.venueSymbol !== rsym || !isOwnCoid(o.clientOrderId, s.connId)) continue;
        if (posOneway) {
          if (keyOfOwn(o, book) !== k) continue;
        } else if (o.positionSide && (o.positionSide === "LONG") !== (Number(rsd) === 1)) continue;
        const kind = ownCoidKind(o.clientOrderId, s.connId);
        if (kind === "T") out.tpLeft = true;
        else if (isBackstopKind(kind)) out.stopLeft = true;
      }
      return out;
    };
    // what the venue's order history says closed a side found flat (outsideCloseOf): read once per key and step, from
    // just before the previous step; null when it cannot be read (no history, a refused read)
    const outsideFrom = (prev?.at ?? Date.now() - 24 * 3_600_000) - 60_000;
    // (the history rows read once per symbol and step: the outside close and the own-first attribution share them)
    const historySeen = new Map<string, Promise<Array<Record<string, unknown>> | null>>();
    const historyOf = (sym: string) => {
      let p = historySeen.get(sym);
      if (!p) {
        p = (async () => {
          if (!ex.ordersSince) return null;
          try {
            // (from the earliest of the step before and an accepted order of the symbol settled flat this step)
            let from = outsideFrom;
            for (const [k, at] of settledFlat) if (k.split("|")[0] === sym && at < from) from = at;
            const r = await ex.ordersSince(sym, from);
            const rows = Array.isArray(r) ? r : ((r as { orders?: unknown } | null)?.orders ?? []);
            return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : null;
          } catch {
            return null;
          }
        })();
        historySeen.set(sym, p);
      }
      return p;
    };
    const outsideOf = async (k: string) => {
      const [osym, osd] = k.split("|");
      const rows = await historyOf(osym);
      return rows ? outsideCloseOf(rows, Number(osd), s.connId) : null;
    };
    // the base bars of a symbol since the step before (the one holding that moment first): what the market reached
    // while the desk was not looking (verifyClose). No candles (a runtime without them): none.
    const barsOf = (sym: string) => {
      const cs = (rt as { candles?: ReadonlyMap<string, CandleSeries> }).candles?.get(sym);
      const out: Array<{ h: number; l: number }> = [];
      if (!cs || !cs.n) return out;
      for (let i = Math.max(0, cs.lowerBound(outsideFrom) - 1); i < cs.n; i++) out.push({ h: cs.h[i], l: cs.l[i] });
      return out;
    };
    // a key the exchange closed outside this system: by its stop, its take-profit, by hand or by a liquidation — from
    // the venue's own history when it shows it (`found`). Without it: both own close orders still resting → by hand (at
    // the market); otherwise only a level the bars since the previous step reached is believed (verifyClose) — neither
    // or both reached → "unverified" at the ticker, never an own close. The price the live record closes its lanes at,
    // the reason and the price's source.
    const noteExternal = (
      k: string,
      px: number,
      override = false,
      found?: { why: "stop" | "target" | "hand" | "liq"; px: number } | null,
    ): { why: OutsideWhy; px: number | null; src: PxSrc } => {
      let by: { why: OutsideWhy; px: number | null; src: PxSrc };
      if (found) by = { ...found, src: "history" };
      else {
        const left = restingOf(k);
        const stopPx = stopAtFlat.has(k) ? (stopAtFlat.get(k) ?? null) : stopPxOf(k);
        const tpPx = tpAtFlat.has(k) ? (tpAtFlat.get(k) ?? null) : tpPxOf(k);
        const inferred = closedBy({ ...left, stopPx, tpPx, px });
        if (inferred.why === "hand") by = { why: "hand", px: null, src: "ticker" };
        else {
          const [vsym, vsd] = k.split("|");
          const v = verifyClose({
            side: Number(vsd) === 1 ? 1 : -1,
            stopPx: left.stopLeft ? null : stopPx,
            tpPx: left.tpLeft ? null : tpPx,
            bars: barsOf(vsym),
            px,
          });
          by = { why: v.why, px: v.px > 0 ? v.px : null, src: v.src };
        }
      }
      if (override || !external.has(k)) {
        external.set(k, by.px);
        if (by.why === "stop") externalWhy.delete(k);
        else externalWhy.set(k, by.why);
        if (by.px !== null) externalSrc.set(k, by.src);
        else externalSrc.delete(k);
      }
      return by;
    };
    // (attributed once the prices are read: with both close orders gone the price tells which one filled)
    const flatKeys: string[] = [];
    const nativeOutstanding = new Set(Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {})
      .filter((lo) => lo.qty > 0 || lo.s || lo.t).map((lo) => lo.key));
    for (const [k, q] of ledger)
      if (q > 0 && !onExchange.has(k) && !pendingKeys.has(k) && !unverifiedOwnership.has(k)) {
        // Flat does not identify which native parent filled or at what price. Preserve the ledger until its
        // exact conditional receipt or another verified reconciliation explains the missing quantity.
        if (nativeOutstanding.has(k)) { unverifiedOwnership.add(k); continue; }
        if (recent.has(k)) continue;
        flatKeys.push(k);
        stopAtFlat.set(k, stopPxOf(k));
        tpAtFlat.set(k, tpPxOf(k));
        const [sym, sd] = k.split("|");
        // a local row (never sent): an id outside the own tag, so no exchange-id check ever looks for it
        const fid = `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
        record(fid, { key: k, sym, side: Number(sd) }, "F", 0, 0, "ok", "flat on the exchange");
        ledger.set(k, 0);
      }
    // adopted through the ledger alone (ours by the ledger, no own order resting, not opened recently): our stop or
    // take-profit may have filled while the desk was down and someone else opened the same side since — the venue's
    // history decides once per open (bug hunt, 13 Oct: a relaunch put a closePosition stop on the operator's
    // position and sold part of it). An own exit filled after our last open → our part is gone: flat marker, the
    // side is someone else's. History unreadable → not touched this step (never managed on a guess).
    if (!ordersStale) {
      const Lv = local(rt);
      for (const k of [...held.keys()]) {
        if (!((ledger.get(k) ?? 0) > 0) || recent.has(k)) continue;
        const [vsym, vsd] = k.split("|");
        // one-way: the venue's one position per symbol is BOTH (the history rows name it so); hedge: the key's side
        const vps = posOneway ? "BOTH" : Number(vsd) === 1 ? "LONG" : "SHORT";
        if (
          book.orders.some(
            (o) => o.venueSymbol === vsym && isOwnCoid(o.clientOrderId, s.connId) && (!o.positionSide || o.positionSide === vps),
          )
        )
          continue;
        let openAt = 0;
        for (const r of ctlRows.values()) if (r.k === k && (r.kind === "O" || r.kind === "I") && r.status === "ok") openAt = r.at;
        const ck = `${k}|${openAt}`;
        if (Lv.ledgerVerified.has(ck)) continue;
        let gone: boolean | null = null;
        let incompleteOwnership = false;
        if (ex.ordersSince)
          try {
            const r = await ex.ordersSince(vsym, openAt - 60_000);
            const rows = Array.isArray(r) ? r : ((r as { orders?: unknown } | null)?.orders ?? []);
            gone = Array.isArray(rows)
              ? (rows as Array<Record<string, unknown>>).some((o) => {
                  const coid = String(o.clientOrderId ?? "");
                  if (!isOwnCoid(coid, s.connId)) return false;
                  // the position's own stop / take-profit (a lane order or a market reduce takes a part)
                  const kd = ownCoidKind(coid, s.connId);
                  if (kd !== "T" && !isBackstopKind(kd)) return false;
                  if (!/^(STOP|TAKE_PROFIT)/.test(String(o.type ?? "").toUpperCase())) return false;
                  if (String(o.positionSide ?? "").toUpperCase() !== vps) return false;
                  if (String(o.side ?? "").toUpperCase() !== (Number(vsd) === 1 ? "SELL" : "BUY")) return false;
                  const state = String(o.status ?? "").toUpperCase();
                  if (state !== "FILLED" && state !== "PARTIALLY_FILLED") return false;
                  const at = Number(o.updateTime ?? o.time ?? 0);
                  const qty = Number(o.executedQty);
                  if (!(Number.isFinite(at) && at >= openAt)) return false;
                  if (state !== "FILLED" || !(Number.isFinite(qty) && qty >= (ledger.get(k) ?? Infinity) - 1e-12)) {
                    incompleteOwnership = true;
                    return false;
                  }
                  const px = Number(o.avgPrice);
                  if (Number.isFinite(px) && px > 0) ownedExitAtFlat.set(k, { why: kd === "T" ? "target" : "stop", px });
                  return true;
                })
              : null;
          } catch {
            gone = null;
          }
        if (gone === false && incompleteOwnership) gone = null;
        if (gone === false) {
          Lv.ledgerVerified.add(ck);
          if (Lv.ledgerVerified.size > 2_000) Lv.ledgerVerified.clear();
          continue;
        }
        held.delete(k);
        if (gone === null) unverifiedOwnership.add(k);
        // our part gone: someone else's ("independent" trades its own beside it); history unreadable: not touched
        if (!gone || !independent) foreign.add(posOneway ? vsym : k);
        if (gone) {
          // the stop and the take-profit it carried, read before this marker clears them (as the flat loop above does)
          stopAtFlat.set(k, stopPxOf(k));
          tpAtFlat.set(k, tpPxOf(k));
          const fid = `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
          record(fid, { key: k, sym: vsym, side: Number(vsd) }, "F", 0, 0, "ok", "own exit filled while away — the position there is not ours");
          flatKeys.push(k);
          ledger.set(k, 0);
          rt.db.event("warn", `live: ${k} — our exit filled while the desk was away; the position there now is someone else's and is never touched${independent ? " (the desk trades its own beside it)" : ""}`);
        } else status.skipped.push({ sym: vsym, why: "ownership unverified (order history unreadable) — not touched this step" });
      }
    }
    // held-unknown: the newest ledger row of a key is an own open / increase of the last LAG_MS, its own stop rests on
    // the exchange, but the position read does not show it yet (the exchange lags right after an open). Never opened
    // a second time, and its fresh stop is never cancelled as left behind on a flat side — until the read shows the
    // position, or the window passes (then a flat key is an external close like any other). A gone stop is not a lag.
    const lastRow = new Map<string, ControlRow>();
    for (const r of ctlRows.values())
      if (r.kind === "O" || r.kind === "I" || r.kind === "X" || r.kind === "R" || r.kind === "F")
        lastRow.set(r.k, r);
    // an order that names no side: BOTH (one-way; the history rows and some venues say so) or none (the book reads it so)
    const noSideOf = (ps: string | undefined) => !ps || ps.toUpperCase() === "BOTH";
    const lagging = new Set<string>();
    if (!ordersStale)
      for (const [k, r] of lastRow) {
        if (
          (r.kind !== "O" && r.kind !== "I") ||
          (r.status !== "ok" && r.status !== "pending") ||
          !(r.at > Date.now() - LAG_MS) ||
          onExchange.has(k)
        )
          continue;
        const [lsym, lsd] = k.split("|");
        if (
          book.orders.some(
            (o) =>
              o.venueSymbol === lsym &&
              isOwnCoid(o.clientOrderId, s.connId) &&
              (noSideOf(o.positionSide) || (o.positionSide === "LONG") === (Number(lsd) === 1)),
          )
        )
          lagging.add(k);
      }
    // own quantity only from own fills: held = min(ledger own, exchange quantity) — whether a key is ours to manage (an
    // own order resting, a recent open, the ledger) never decides how much of it is ours. Keys where someone else's
    // quantity sits beside ours (the venue merges both into one position: `merged`) keep their own part only; a key
    // with nothing of ours is someone else's; a key with an own order resting but no ledger entry is "own quantity
    // unverified" — not touched (bug hunt 13 Oct, PUMP 14 Oct: a manual short of 14,269 was adopted beside our 414)
    const merged = new Set<string>();
    const accountUnresolved = new Set(unverifiedOwnership);
    for (const x of capHeldToOwn(held, ledger)) {
      const [xsym] = x.key.split("|");
      if (x.own === null) {
        accountUnresolved.add(x.key);
        foreign.add(posOneway ? xsym : x.key);
        status.skipped.push({ sym: xsym, why: `${x.key}: own quantity unverified (an own order rests, no own fill proves any quantity) — not touched` });
      } else if (x.own === 0) {
        // nothing of it is ours (our part closed): "avoid" freezes that side (one-way: the symbol) — our position on the
        // other side of a hedge-mode symbol is still managed; "independent" may open its own beside it
        if (!independent) foreign.add(posOneway ? xsym : x.key);
      } else {
        merged.add(x.key);
        // one-way: the one BOTH position holds someone else's quantity beside ours, and no exit order can bound to our part
        // (closePosition would close theirs too): the symbol is frozen, as cpOf below states — anything foreign there freezes
        // it. Our quantity stays in `held` (an unheld key would read as closed outside); the freeze keeps its orders off.
        if (posOneway) foreign.add(xsym);
      }
      const mk = `foreign-excess|${x.key}|${x.exchange}|${x.own}`;
      const W = local(rt).warnedExcess;
      if (!W.has(mk)) {
        W.add(mk);
        if (W.size > 500) W.clear();
        rt.db.event(
          "warn",
          x.own === null
            ? `live: ${x.key} holds ${x.exchange} on the exchange and an own order rests there, but no own fill proves any quantity of ours — own quantity unverified, not touched`
            : `live: ${x.key} holds ${x.exchange} on the exchange but this system opened ${x.own} — the rest is not ours and is never touched`,
        );
      }
    }
    // the exit-order fields: hedge mode bounds every exit order to the own quantity (no closePosition — one would close
    // someone else's quantity merged into the position, also while the desk is away); one-way mode keeps closePosition
    // (its BOTH side does not say which part is whose — anything foreign there freezes the symbol)
    const cpOf = (): Record<string, string> => (posOneway ? { closePosition: "true" } : {});
    phase("contracts");
    const specs = await ex.contracts();
    phase("tickers");
    const prices = new Map((await rt.freshTickers()).map((t) => [t.sym, t.last] as const));
    checkAccount();
    // stale prices: never open or increase (closing / reducing stays allowed)
    const pricesFresh = Date.now() - rt.tickersAt <= 30_000;
    // A known partial entry can stop out while its remaining MARKET quantity is still pending. Book only an own
    // S/T fill proven inside the observed lifetime, at that fill's price; later cumulative quantity stays separate.
    for (const [key, flat] of pendingFlat) {
      const checkKey = `flat:${flat.coid}`;
      if (Date.now() - (polls.get(checkKey) ?? -Infinity) < 1_000 || !ex.ordersSince) continue;
      polls.set(checkKey, Date.now());
      const [sym, sd] = key.split("|");
      try {
        const history = await ex.ordersSince(sym, flat.from - 1_000);
        const rows = Array.isArray(history) ? history : (history as { orders?: unknown[] } | null)?.orders;
        if (!Array.isArray(rows)) continue;
        const exits = (rows as Array<Record<string, unknown>>).filter((o) => {
          const at = Number(o.updateTime ?? o.time);
          const kind = ownCoidKind(String(o.clientOrderId ?? ""), s.connId);
          return (kind === "S" || kind === "T") && String(o.positionSide).toUpperCase() === (Number(sd) > 0 ? "LONG" : "SHORT") &&
            String(o.side).toUpperCase() === (Number(sd) > 0 ? "SELL" : "BUY") && String(o.status).toUpperCase() === "FILLED" &&
            Number(o.executedQty) >= flat.qty - 1e-12 && Number(o.avgPrice) > 0 && at >= flat.from && at <= flat.to;
        }).sort((a, b) => Number(b.updateTime ?? b.time) - Number(a.updateTime ?? a.time));
        const exit = exits[0];
        if (!exit) continue;
        const px = Number(exit.avgPrice);
        const why = ownCoidKind(String(exit.clientOrderId), s.connId) === "T" ? "target" : "stop";
        const a = { key, sym, side: Number(sd) };
        record(`pending-flat-${flat.coid}`, a, "F", 0, px, "ok", "confirmed own close of the known partial entry", Number(exit.updateTime ?? exit.time));
        ledger.set(key, 0);
        held.delete(key);
        external.set(key, px);
        if (why === "target") externalWhy.set(key, "target");
        else externalWhy.delete(key);
        const current = controlRows(rt).get(flat.coid);
        const still = pendingOf(current?.msg);
        if (current && still) record(flat.coid, a, current.kind, current.qty, current.px ?? 0, current.status,
          PENDING_EXECUTION + JSON.stringify({ ...still, flatBooked: true }), current.at);
        keyState.set(key, "closed"); // metadata refresh is not a new opening after its proven exit
      } catch { /* no measured close is invented while its history is unreadable */ }
    }
    for (const k of flatKeys) noteExternal(k, prices.get(k.split("|")[0]) ?? 0, false, ownedExitAtFlat.get(k) ?? await outsideOf(k));
    // A position closed outside this system — by its exchange stop, or by hand — never stops processing, and is
    // never put back. The lane orders that held it at that moment are held back, so the SAME position is not
    // reopened: reopening at market while those lanes are still active only pays a round trip and the slippage
    // again, and on a close by hand it also undoes the operator's own decision. Each held-back lane order counts
    // again once it exits (its id leaves the paper book) or after SUPPRESS_MAX_MS at most, and a lane order that
    // joins the key AFTERWARDS is a new decision that opens and sizes it on its own — so new positions keep
    // arriving on the same symbol and side while the closed one stays closed. Everything else is untouched: the
    // engine keeps computing, the paper book keeps the lane, every other position is still managed. The own stop
    // a close by hand leaves resting is cancelled further down ("own orders left on a (symbol, side) that is flat
    // now"), so it can never catch a later position. With open orders of an earlier read the stop's fate is
    // unknown, which changes only the wording of the event, not the decision.
    // (in slices: 20 k positions took 55–95 ms in one piece)
    phase("lanes");
    const allLanes = await sliced(laneContributionsGen(rt, prices, ps));
    checkAccount();
    const nowSup = Date.now();
    // (the lanes' id lookups change only with the lanes: built once per lane set, not on every step)
    const { laneIds, legacyIds, laneIdByKey } =
      Lb.laneMaps?.hash === lanesHash ? Lb.laneMaps : (Lb.laneMaps = { hash: lanesHash, ...laneMapsOf(allLanes) });
    const suppressed: Record<string, { key: string; at: number }> = {};
    for (const [id, x] of Object.entries(
      liveKv<Record<string, { key: string; at: number }>>(rt.db, "controlSuppressed") ?? {},
    )) {
      const lid = laneIds.has(id) ? id : legacyIds.get(`${id}#${x.key}`);
      if (lid && nowSup - x.at < SUPPRESS_MAX_MS) suppressed[lid] = x;
    }
    const requestedLaneMode = s.laneOrders === true;
    const savedLaneMap = liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {};
    // A settings edit cannot cancel existing independently owned exits. Drain the previously opened native lanes
    // under their original order identities before switching this desk to aggregate control.
    const drainingLaneOrders = !requestedLaneMode && (Object.values(savedLaneMap).some((lo) => lo.qty > 0 || lo.s || lo.t || lo.closed) ||
      book.orders.some((o) => isOwnCoid(o.clientOrderId, s.connId) && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, s.connId))));
    if (!reconnected) {
      const outside = new Map(externalCloses(prev, held).map((x) => [x.key, x]));
      const observedFlat = new Set(flatKeys);
      for (const key of observedFlat) outside.set(key, { key, lanes: 0 });
      for (const key of settledFlat.keys()) if (!held.has(key)) outside.set(key, { key, lanes: 0 });
      for (const x of outside.values()) {
        if (lagging.has(x.key) || pendingKeys.has(x.key) || unverifiedOwnership.has(x.key) || (keyState.get(x.key) === "closed" && !observedFlat.has(x.key))) continue;
        const [xsym, xsd] = x.key.split("|");
        // `held` also excludes a side frozen by a foreign resting order. That is not a flat venue observation:
        // preserve its known own ledger until the separate own-first reduction check can inspect the quantity.
        if (!posOneway && !observedFlat.has(x.key) && isForeign(foreign, x.key) && (ledger.get(x.key) ?? 0) > 0 &&
          book.positions.some((p) => p.venueSymbol === xsym && p.qty > 0 && (p.side === "long") === (xsd === "1")))
          continue;
        // our own close whose reply timed out (its row still pending) is what emptied the side: it filled. Recorded
        // as done — not reported as an exchange stop-out, and no lane order held back (they asked for that close)
        const ownClose = [...ctlRows].filter(
          ([, r]) => r.k === x.key && r.kind === "X" && r.status === "pending" && nowSup - r.at < 600_000,
        );
        if (ownClose.length) {
          const ax = { key: x.key, sym: xsym, side: Number(xsd) };
          for (const [coid, r] of ownClose) record(coid, ax, "X", r.qty, r.px ?? 0, "ok", "filled (reply timed out; the book shows the side flat)");
          rt.db.event("info", `live: ${x.key} was closed by our own close order (its reply timed out) — confirmed by the book`);
          continue;
        }
        // by hand the position went at the market; by its stop or its take-profit, at that order's price (closedBy:
        // the one still resting did not fill)
        const by = noteExternal(x.key, prices.get(xsym) ?? 0, true, ownedExitAtFlat.get(x.key) ?? await outsideOf(x.key));
        // the ledger still counts it (opened within the last 10 minutes: no flat marker above): marked flat now, so
        // the marker carries this close — found minutes later its stop and take-profit are gone and the venue's
        // history window has passed it
        if ((ledger.get(x.key) ?? 0) > 0) {
          record(
            `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
            { key: x.key, sym: xsym, side: Number(xsd) },
            "F",
            0,
            0,
            "ok",
            "flat on the exchange",
          );
          ledger.set(x.key, 0);
        }
        let n = 0;
        for (const l of allLanes)
          if (l.id && `${l.sym}|${l.side}` === x.key && (!drainingLaneOrders ||
            savedLaneMap[l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side })])) {
            suppressed[l.id] = { key: x.key, at: nowSup };
            n++;
          }
        rt.db.event(
          by.why === "stop" || by.why === "liq" || by.why === "unverified" ? "warn" : "info",
          `live: ${x.key} was closed ${
            by.why === "hand"
              ? `by hand (an order that is not ours: in the venue, or another system${by.px ? `; at ${by.px}` : ""})`
              : by.why === "target"
                ? `by its exchange take-profit${by.px ? ` (${by.px})` : ""}`
                : by.why === "liq"
                  ? `by a liquidation of the venue${by.px ? ` (${by.px})` : ""}`
                  : by.why === "unverified"
                    ? `outside the desk — its order history unreadable and the bars reached neither its stop nor its take-profit alone: booked unverified at the ticker${by.px ? ` (${by.px})` : ""}`
                    : `by its exchange stop${by.px ? ` (${by.px}${by.src === "bar" ? ", the bars reached it" : ""})` : ""}`
          }` +
            ` — processing continues; ${n} lane order(s) held back so the same position is not reopened, until they` +
            ` exit (at most ${SUPPRESS_MAX_MS / 60_000} min). A new lane order on ${x.key} opens it again.`,
        );
      }
    }
    // ── lane orders (live.laneOrders, lane-orders.ts) ─────────────────────────────────────────────────────────────
    // A lane's stop (V) or take-profit (Y) that left the book filled is that lane's exit on the exchange: booked at the
    // fill, its sibling cancelled (the venue links nothing — left resting it would close another lane's quantity),
    // and the lane held back like an outside close, so it is never reopened (the paper book exits it at the same
    // level moments later). An order that left the book any other way is placed again below while the lane stays.
    const laneMode = requestedLaneMode || drainingLaneOrders;
    const laneMap: Record<string, LaneOrder> = laneMode ? { ...savedLaneMap } : {};
    const laneExit = new Map<string, { px: number; reason: "stop" | "target" }>();
    const laneBusy = new Set<string>();
    reserveCurrentSide = (key) => laneBusy.add(key);
    if (laneMode && ordersStale) for (const lo of Object.values(laneMap)) laneBusy.add(lo.key);
    if (laneMode) for (const lo of Object.values(laneMap)) {
      if (!(lo.qty > 0)) continue;
      if (!onExchange.has(lo.key)) {
        laneBusy.add(lo.key);
        status.skipped.push({ sym: lo.sym, why: "native parent is flat on venue but its close is awaiting verified reconciliation" });
      } else if ((lo.exitQty ?? 0) > 0) {
        laneBusy.add(lo.key);
        status.skipped.push({ sym: lo.sym, why: "partially filled native parent retained for own-fill reconciliation" });
      }
    }
    // Legacy simultaneous parents cannot be reduced safely by a netted target: a price change can resize a
    // surviving sibling. Freeze any such key through native upkeep until exact fills and cancellation leave
    // only one parent. Existing protection is retained; other symbol/sides continue normally.
    const priorLaneOpen = liveKvView<Record<string, LaneOpen>>(rt.db, "liveLaneOpen") ?? {};
    const parentIds = new Map<string, Set<string>>();
    for (const [id, row] of Object.entries(priorLaneOpen)) {
      const key = `${row.sym}|${row.side}`;
      (parentIds.get(key) ?? parentIds.set(key, new Set()).get(key)!).add(id);
    }
    for (const lo of Object.values(laneMap)) if (lo.qty > 0 || lo.s || lo.t)
      (parentIds.get(lo.key) ?? parentIds.set(lo.key, new Set()).get(lo.key)!).add(lo.id);
    const sharedNativeKeys = new Set([...parentIds].filter(([, ids]) => ids.size > 1).map(([key]) => key));
    if (laneMode) for (const key of sharedNativeKeys) {
      laneBusy.add(key);
      status.skipped.push({ sym: key.split("|")[0], why: "multiple native parents share a netted side; existing exits held for reconciliation" });
    }
    const laneCaps: Record<string, number> = { ...(liveKv<Record<string, number>>(rt.db, "laneQuantityCaps") ?? {}) };
    const laneStat = { onExchange: 0, placed: 0, moved: 0, cancelled: 0, filled: 0, pending: 0 };
    const partialThisStep = new Set<string>();
    const persistLaneState = () => {
      liveKvSet(rt.db, "laneQuantityCaps", laneCaps);
      liveKvSet(rt.db, "laneOrders", laneMap);
      liveKvSet(rt.db, "controlSuppressed", suppressed);
      // liveKvSet normally coalesces one second of UI state; conditional ownership cannot wait for that timer.
      flushLiveKv(rt.db);
      if (!rt.db.flushState() || rt.db.lastJournalError)
        throw new Error(`conditional ownership checkpoint unavailable: ${rt.db.lastStateError || rt.db.lastJournalError}`);
    };
    const ownResting = (b: BookView) =>
      new Set(
        b.orders
          .filter((o) => isOwnCoid(o.clientOrderId, s.connId))
          .map((o) => (o.clientOrderId ?? "").toUpperCase()),
      );
    const orderIdOf = new Map(book.orders.map((o) => [(o.clientOrderId ?? "").toUpperCase(), o.id] as const));
    const goneOf = async (sym: string, oid?: string, expected?: { coid: string; side: 1 | -1; which: "s" | "t"; filledQty?: number }) => {
      if (!oid || !ex.orderStatus) return { status: "unknown" } as const;
      try {
        const reply = await ex.orderStatus(sym, oid);
        const order = ((reply as { order?: unknown })?.order ?? reply) as Record<string, unknown> | null;
        if (!order || String(order.orderId ?? "") !== String(oid) ||
          (order.symbol !== undefined && String(order.symbol) !== sym)) return { status: "unknown" } as const;
        if (expected) {
          const eq = (value: unknown, want: string) => value === undefined || value === null || String(value).toUpperCase() === want;
          const exitSide = expected.side === 1 ? "SELL" : "BUY";
          const positionSide = posOneway ? "BOTH" : expected.side === 1 ? "LONG" : "SHORT";
          const type = expected.which === "s" ? "STOP_MARKET" : "TAKE_PROFIT_MARKET";
          if (!eq(order.clientOrderId, expected.coid.toUpperCase()) || !eq(order.clientOrderID, expected.coid.toUpperCase()) ||
            !eq(order.side, exitSide) || !eq(order.positionSide, positionSide) || !eq(order.type, type))
            return { status: "unknown" } as const;
        }
        const result = goneOrderOf(reply);
        if (result.status !== "unknown") {
          const raw = [order?.executedQty, order?.cumExecQty, order?.filledQty].filter((x) => x !== null && x !== undefined);
          const quantities = raw.map((x) => typeof x === "number" || (typeof x === "string" && x.trim() !== "") ? Number(x) : NaN);
          // Terminal status alone does not prove that a conditional exited zero quantity before cancellation.
          // Conflicting cumulative aliases must not turn an unknown partial fill into a zero-fill replacement.
          if (!quantities.length || quantities.some((q) => !Number.isFinite(q) || q < 0 || q !== quantities[0]) ||
            (result.status === "cancelled" && quantities[0] !== 0)) return { status: "unknown" } as const;
          const previous = expected?.filledQty;
          if (previous !== undefined && (!Number.isFinite(previous) || previous < 0 || quantities[0] + 1e-12 < previous))
            return { status: "unknown" } as const;
        }
        return result.status === "filled" ? { ...result, receipt: reply } : result;
      } catch {
        return { status: "unknown" } as const;
      }
    };
    type ExitCleanup = { key: string; sym: string; side: 1 | -1; coid: string; oid: string; which: "s" | "t"; conn: string };
    const exitCleanup = { ...(liveKv<Record<string, ExitCleanup>>(rt.db, "positionExitCleanup") ?? {}) };
    const persistExitCleanup = () => {
      liveKvSet(rt.db, "positionExitCleanup", exitCleanup);
      flushLiveKv(rt.db);
      if (!rt.db.flushState() || rt.db.lastJournalError)
        throw new Error(`conditional cancellation checkpoint unavailable: ${rt.db.lastStateError || rt.db.lastJournalError}`);
    };
    for (const [id, pending] of Object.entries(exitCleanup)) {
      if (pending.conn === connHash) {
        const result = await goneOf(pending.sym, pending.oid, pending);
        if (result.status === "cancelled") { delete exitCleanup[id]; persistExitCleanup(); continue; }
      }
      laneBusy.add(pending.key);
      status.skipped.push({ sym: pending.sym, why: "position exit cancellation awaiting exact zero-fill confirmation" });
    }
    const cancelPositionExit = async (o: BookView["orders"][number], key: string) => {
      const coid = o.clientOrderId ?? "", kind = ownCoidKind(coid, s.connId);
      const row = ctlByUpper().get(coid.toUpperCase());
      if (!o.id || (kind !== "S" && kind !== "T") || !row || row.k !== key || row.kind !== kind ||
        (row.status !== "ok" && row.status !== "pending")) return;
      // Once dispatched, an ambiguous cancellation is polled by its exact durable identity. Retrying it while
      // still unknown could race a partial execution, even if the exchange continues to list the old order.
      if (exitCleanup[coid.toUpperCase()]) { laneBusy.add(key); return; }
      const [sym, rawSide] = key.split("|"), side = Number(rawSide) as 1 | -1;
      const pending: ExitCleanup = { key, sym, side, coid, oid: o.id, which: kind === "S" ? "s" : "t", conn: connHash };
      exitCleanup[coid.toUpperCase()] = pending;
      persistExitCleanup(); // identity before cancellation, including across process loss or ambiguous reply
      laneBusy.add(key);
      if (await ex.cancel(sym, o.id)) status.cancelled++;
      const result = await goneOf(sym, o.id, pending);
      if (result.status === "cancelled") { delete exitCleanup[coid.toUpperCase()]; persistExitCleanup(); }
      else status.skipped.push({ sym, why: "position exit cancellation awaiting exact zero-fill confirmation" });
    };
    // a lane order the venue filled reduced the position without an order of ours: the own-quantity ledger follows
    // (a local row — never sent — so the ledger keeps matching what the exchange holds of ours)
    const laneFilled = (lo: LaneOrder, px: number, which: "s" | "t") =>
      record(
        `lanefill-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
        { key: lo.key, sym: lo.sym, side: lo.side },
        "R",
        lo.qty,
        px,
        "ok",
        `lane ${lo.id}: its ${which === "s" ? "stop" : "take-profit"} filled on the exchange`,
      );
    const cancelLaneOrder = async (lo: LaneOrder, which: "s" | "t", ids: ReadonlyMap<string, string | undefined>) => {
      const o = lo[which];
      if (!o) return true;
      const oid = o.oid ?? ids.get(o.coid.toUpperCase());
      if (!oid) { laneBusy.add(lo.key); return false; }
      if (await ex.cancel(lo.sym, oid)) { status.cancelled++; laneStat.cancelled++; }
      // Cancellation success alone does not prove zero execution: every trim, swap, replacement and ordinary
      // close retains the identity until an exact terminal receipt accounts for all cumulative quantity.
      const result = await goneOf(lo.sym, oid, { coid: o.coid, side: lo.side, which, filledQty: o.filledQty });
      if (result.status === "cancelled" || (result.status === "filled" && result.complete &&
        result.qty !== undefined && result.qty <= (o.filledQty ?? 0) + 1e-12)) {
        delete lo[which];
        return true;
      }
      laneBusy.add(lo.key);
      return false;
    };
    const cancelLaneOrders = async (lo: LaneOrder, ids: ReadonlyMap<string, string | undefined>) => {
      let cleared = true;
      for (const which of ["s", "t"] as const) if (!(await cancelLaneOrder(lo, which, ids))) cleared = false;
      return cleared;
    };
    const prevForeign = !reconnected ? prev?.foreignQty : undefined;
    const priorFrozenForeign = new Set(!reconnected ? (prev?.foreignQtyFrozen ?? []) : []);
    const trustedPreviousForeign = (key: string) => !!prevForeign && !previousUnknownForeign.has(key) &&
      (priorFrozenForeign.has(key) || !!prev?.held?.some((h) => h.key === key && h.qty > 0) ||
        !!prev?.actions?.some((a) => a.key === key && a.ok && (a.kind === "open" || a.kind === "increase")));
    const retiredAggregateIds = new Set<string>();
    const retireOversizedAggregate = async (key: string, sourceCoid: string) => {
      const entries = [...controlRows(rt)].filter(([, row]) => row.k === key && (row.kind === "O" || row.kind === "I"));
      const rows = [...controlRows(rt).values()];
      const source = ctlByUpper().get(sourceCoid.toUpperCase());
      const unresolved = () => {
        laneBusy.add(key);
        status.skipped.push({ sym: key.split("|")[0], why: "native and aggregate exit chronology unresolved — existing position exit may exceed owned quantity" });
      };
      if (!source || source.k !== key || !["V", "Y"].includes(source.kind) ||
        ownCoidKind(sourceCoid, s.connId) !== source.kind ||
        (source.status !== "ok" && source.status !== "pending") || !Number.isFinite(source.at) ||
        sharedNativeKeys.has(key)) { unresolved(); return; }
      if (pendingKeys.has(key) || !entries.some(([, row]) => row.status === "ok" && row.qty > 0)) { unresolved(); return; }
      type Submission = { seq: number; coid: string; k: string; kind: string };
      const submissions = rt.db.all<Submission>("SELECT seq, coid, k, kind FROM live_submission_sequence WHERE k=?", key);
      const byCoid = new Map(submissions.map((r) => [r.coid.toUpperCase(), r] as const));
      const native = byCoid.get(sourceCoid.toUpperCase());
      if (native && (native.k !== key || native.kind !== source.kind || !Number.isSafeInteger(native.seq))) { unresolved(); return; }
      // New dispatches carry a durable monotonic sequence. Legacy rows have no sequence and must have an
      // unambiguous earlier timestamp; a missing journal row or a tied legacy timestamp never supplies proof.
      if (native) {
        if (submissions.some((r) => (r.kind === "O" || r.kind === "I") && r.seq >= native.seq)) { unresolved(); return; }
        for (const [coid, row] of entries) {
          const order = byCoid.get(coid.toUpperCase());
          if (order ? order.k !== key || order.kind !== row.kind || order.seq >= native.seq
            : !Number.isFinite(row.at) || row.at >= source.at) { unresolved(); return; }
        }
      } else {
        if (submissions.some((r) => (r.kind === "O" || r.kind === "I") &&
          !entries.some(([coid]) => coid.toUpperCase() === r.coid.toUpperCase())) ||
          entries.some(([, row]) => !Number.isFinite(row.at) || row.at >= source.at)) { unresolved(); return; }
      }
      const own = ownLedger(rows).get(key);
      if (own === undefined || !Number.isFinite(own) || !(own > 1e-12)) { unresolved(); return; }
      for (const o of book.orders) {
        if (!alive() || keyOfOwn(o, book) !== key || !o.id) continue;
        const expectedSide = key.endsWith("|1") ? "LONG" : "SHORT";
        if (!posOneway && String(o.positionSide ?? "").toUpperCase() !== expectedSide) continue;
        const kind = ownCoidKind(o.clientOrderId, s.connId), coid = (o.clientOrderId ?? "").toUpperCase();
        if ((kind !== "S" && kind !== "T") || retiredAggregateIds.has(coid)) continue;
        const row = ctlByUpper().get(coid);
        if (!row || row.k !== key || row.kind !== kind || !(row.qty > 0)) { unresolved(); continue; }
        if (row.qty <= own + 1e-12) continue;
        const order = byCoid.get(coid);
        const older = native && order ? order.k === key && order.kind === kind && order.seq < native.seq : row.at < source.at;
        if (!older) { unresolved(); continue; }
        retiredAggregateIds.add(coid);
        laneBusy.add(key);
        status.skipped.push({ sym: o.venueSymbol, why: "oversized position exit after native partial — cancellation or protection requires reconciliation" });
        try { await cancelPositionExit(o, key); }
        catch { status.skipped.push({ sym: o.venueSymbol, why: "position exit cancellation outcome unknown — identity remains reserved" }); }
      }
    };
    // Replay a durably journaled partial before waiting for another native receipt. A crash may have happened
    // between recording its exact R and persisting the reduced lane map or retiring the old aggregate order.
    if (laneMode && !ordersStale) {
      const parents = new Map(Object.values(laneMap).map((lo) => [lo.id, lo] as const));
      const partials = new Map<string, string>();
      const journal = controlRows(rt);
      const mayHavePartial = [...parents.values()].some((lo) => (lo.exitQty ?? 0) > 0 ||
        [lo.s?.coid, lo.t?.coid].some((coid) => !!coid && journal.has(`lanefill-${coid}`)));
      for (const [id, row] of mayHavePartial ? journal : []) {
        if (row.kind !== "R" || row.status !== "ok" || !(row.qty > 0) || !Number.isFinite(row.at)) continue;
        if (!id.startsWith("lanefill-")) continue;
        const match = /^lane (.*): measured conditional (?:stop|target) fill/.exec(row.msg ?? "");
        const lo = match ? parents.get(match[1]) : undefined;
        if (lo && lo.key === row.k && (lo.qty > 0 || lo.s || lo.t))
          partials.set(lo.key, id.slice("lanefill-".length));
      }
      for (const [key, source] of partials) await retireOversizedAggregate(key, source);
    }
    if (laneMode && !ordersStale) {
      const resting = ownResting(book);
      const tracked = new Map<string, number>();
      for (const lo of Object.values(laneMap)) tracked.set(lo.key, (tracked.get(lo.key) ?? 0) + lo.qty);
      const actual = new Map<string, number>();
      for (const p of book.positions) {
        const key = `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`;
        actual.set(key, (actual.get(key) ?? 0) + p.qty);
      }
      for (const lo of Object.values(laneMap)) {
        if (!alive()) break;
        if (lo.s && lo.s.px > 0) lo.drainStopPx = lo.s.px;
        if (lo.t && lo.t.px > 0) lo.drainTargetPx = lo.t.px;
        for (const which of ["s", "t"] as const) {
          const o = lo[which];
          if (!o) continue;
          o.oid ??= orderIdOf.get(o.coid.toUpperCase());
          // A partial conditional fill may remain in openOrders. Poll it when measured holdings shrank, or
          // while a previously observed partial is unresolved. A healthy steady book does not poll every lane.
          const priorForeign = trustedPreviousForeign(lo.key) ? (prevForeign?.[lo.key] ?? 0) : 0;
          if (resting.has(o.coid.toUpperCase()) && !(o.filledQty && o.filledQty > 0) &&
            (actual.get(lo.key) ?? 0) >= (tracked.get(lo.key) ?? 0) + priorForeign - 1e-12) continue;
          const g = await goneOf(lo.sym, o.oid ?? orderIdOf.get(o.coid.toUpperCase()), { coid: o.coid, side: lo.side, which, filledQty: o.filledQty });
          if (g.status === "cancelled") { delete lo[which]; continue; }
          if (g.status !== "filled" || g.qty === undefined) { laneBusy.add(lo.key); continue; }
          const sent = o.qty ?? lo.qty + (o.filledQty ?? 0);
          if (g.qty > sent + 1e-9 || g.qty < (o.filledQty ?? 0) - 1e-12) { laneBusy.add(lo.key); continue; }
          const id = `lanefill-${o.coid}`;
          const prior = controlRows(rt).get(id);
          if ((prior?.qty ?? 0) > g.qty + 1e-12) { laneBusy.add(lo.key); continue; }
          // Older partially settled parents have no proven cumulative notional. A matching journal row cannot
          // tell whether its quantity was already removed from the legacy map, so keep it for reconciliation.
          if (lo.exitQty === undefined || lo.exitNotional === undefined) {
            const older = [...controlRows(rt).values()].some((row) => row.kind === "R" && row.qty > 0 &&
              row.msg?.startsWith(`lane ${lo.id}:`));
            if (older || (o.filledQty ?? 0) > 0) { laneBusy.add(lo.key); continue; }
            lo.exitQty = 0;
            lo.exitNotional = 0;
            persistLaneState(); // initialize before journaling the first execution, including across a crash
          }
          const processed = o.filledQty ?? 0;
          const oldNotional = processed > 0 ? o.filledNotional : 0;
          const cumulative = g.qty;
          const delta = cumulative - processed;
          const notional = cumulative * g.px;
          const increment = notional - (oldNotional ?? NaN);
          if (!Number.isFinite(oldNotional) || !Number.isFinite(lo.exitQty) || !Number.isFinite(lo.exitNotional) ||
            lo.exitQty < processed - 1e-12 || lo.exitQty < 0 || lo.exitNotional < 0 ||
            delta < -1e-12 || delta > lo.qty + 1e-9 || !Number.isFinite(increment) ||
            (delta > 1e-12 && !(increment > 0)) ||
            (delta <= 1e-12 && Math.abs(increment) > 1e-9 * Math.max(1, Math.abs(notional)))) {
            laneBusy.add(lo.key);
            continue;
          }
          if (delta > 0) {
            const receipt = orderReply(g.receipt) ?? {};
            const venueUpdate = Number(receipt.updateTime);
            const knownExecutionTime = Number.isFinite(venueUpdate) && venueUpdate > 0 && venueUpdate <= Date.now() && g.t === venueUpdate;
            // One cumulative durable record per actual conditional order makes stale polls/restarts idempotent.
            record(id, { key: lo.key, sym: lo.sym, side: lo.side }, "R", cumulative, g.px, "ok",
              `lane ${lo.id}: measured conditional ${which === "s" ? "stop" : "target"} fill` +
                (knownExecutionTime ? "; venue exit timestamp verified" : "; venue exit timestamp unverified"),
              g.t ?? prior?.at ?? Date.now());
            lo.qty = Math.max(0, lo.qty - delta);
            o.filledQty = cumulative;
            o.filledNotional = notional;
            lo.exitQty += delta;
            lo.exitNotional += increment;
            // The paper parent still includes this filled share; do not buy it back while that same entry lives.
            laneCaps[lo.id] = lo.qty;
            // Persist the reduced identity/cap before cancelling or placing anything asynchronously. A crash
            // between conditional cancellation and replacement must not restore the already exited share.
            persistLaneState();
            laneStat.filled++;
          }
          if (delta > 0 || (prior && prior.qty === cumulative && cumulative > 0)) {
            // Preserve the native receipt on the canonical reduction record so its real fill and measured fee
            // participate in account statistics. A later same-scope fee update is not another position reduction.
            const receipt = orderReply(g.receipt) ?? {};
            fill(id, { sym: lo.sym, side: lo.side }, "R", cumulative, o.px,
              { order: { ...receipt, executedQty: g.qty, avgPrice: g.px } }, prior?.at ?? g.t ?? Date.now(), delta > 0);
          }
          if (g.complete) delete lo[which];
          if (!(lo.qty > 1e-12)) {
            lo.closed = { px: lo.exitNotional / lo.exitQty, reason: which === "s" ? "stop" : "target" };
            laneExit.set(lo.id, lo.closed);
            // Keep the attribution durable until the live-lane close is also durably recorded.
            persistLaneState();
          } else if (lo.exitQty > 0) {
            // Both old orders were sized to the original quantity. Cancel by exact identity, retaining any
            // unverified fill/cancellation. Only a later fresh book may restore protection for the residual.
            partialThisStep.add(lo.id);
            status.skipped.push({ sym: lo.sym, why: "partial native exit: old orders are being reconciled before residual protection can be restored" });
            persistLaneState();
            const partialRow = controlRows(rt).get(id);
            if (partialRow) await retireOversizedAggregate(lo.key, o.coid);
            await cancelLaneOrders(lo, orderIdOf);
            laneBusy.add(lo.key);
            continue;
          }
          // Cancel any unfilled conditional remainder and its sibling before changing their quantities.
          if (!(await cancelLaneOrders(lo, orderIdOf))) laneBusy.add(lo.key);
        }
        if (lo.closed) {
          for (const lid of laneIdByKey.get(lo.id) ?? []) suppressed[lid] = { key: lo.key, at: nowSup };
          laneExit.set(lo.id, lo.closed);
          // A flat snapshot may still be classified as a lagging entry during the first post-fill step. Keep
          // this proven close until its own journaled position-level exits have been retired or durably reserved;
          // otherwise the next step loses the provenance needed to cancel them and leaves the side blocked.
          const positionExitStillResting = book.orders.some((o) => {
            const coid = o.clientOrderId ?? "", kind = ownCoidKind(coid, s.connId);
            const row = ctlByUpper().get(coid.toUpperCase());
            return (kind === "S" || kind === "T") && row?.kind === kind && row.k === lo.key &&
              keyOfOwn(o, book) === lo.key;
          });
          if ((await cancelLaneOrders(lo, orderIdOf)) &&
            !(liveKvView<Record<string, LaneOpen>>(rt.db, "liveLaneOpen") ?? {})[lo.id] &&
            !positionExitStillResting) delete laneMap[lo.id];
        }
      }
      // Do not trim another parent's protection for capacity. New placements may wait at the venue cap.
    }
    // control orders "overall" (lane orders off): only the position's own orders rest — its backstop at the outer stop
    // range and its take-profit beyond the outer target; every lane's own exit is the desk's. Lane orders left from a
    // "partials" run are cancelled (left resting they would fire and reduce a position the desk manages), a few dozen
    // a step; one that filled meanwhile is that lane's exit (the ledger follows)
    if (!laneMode && !ordersStale) {
      const left = book.orders.filter((o) => {
        const k = ownCoidKind(o.clientOrderId, s.connId);
        return (k === "V" || k === "Y") && !!o.id;
      });
      let n = 0;
      for (const o of left.slice(0, LANE_ORDERS_PER_STEP)) {
        if (!alive()) break;
        if (await ex.cancel(o.venueSymbol, o.id!)) {
          status.cancelled++;
          n++;
          continue;
        }
        const g = await goneOf(o.venueSymbol, o.id);
        if (g.status === "filled") {
          // the key the lane order belonged to; none known (one-way, no record, no position): not booked on a guess
          const k = keyOfOwn(o, book);
          if (k) {
            const lo = { id: o.clientOrderId ?? "", key: k, sym: o.venueSymbol, side: Number(k.split("|")[1]) as 1 | -1, qty: 0, at: 0 };
            const row = ctlByUpper().get((o.clientOrderId ?? "").toUpperCase());
            laneFilled({ ...lo, qty: row?.qty ?? 0 }, g.px, ownCoidKind(o.clientOrderId, s.connId) === "V" ? "s" : "t");
          }
        }
      }
      if (left.length && left.length <= LANE_ORDERS_PER_STEP) liveKvSet(rt.db, "laneOrders", {});
      if (n) rt.db.event("info", `control orders overall: ${n} lane order(s) of a partials run cancelled${left.length > n ? ` (${left.length - n} left for the next steps)` : ""}`);
    }
    // own-first attribution (decision of 14 Oct: the operator's quantity is never own): a key the desk holds whose
    // exchange quantity fell short of the own quantity plus what someone else held at the previous step, by more than a
    // lot (or 0.5 % of ours). The own close orders that filled (the venue's history) explain it first; the unexplained
    // rest is taken from OUR quantity first (ledger kind H), so the desk never sells more than it could own. Either way
    // the own episode ends: its lanes are booked as closed outside (below) and held back, and the plan closes what is left
    // of ours with a quantity-bounded order. Keys with an own order of the last LAG_MS (the read may not show it yet) or
    // one still pending wait. The history is read only for a shortfall.
    const exQty = new Map<string, number>();
    for (const p of book.positions) {
      const k = `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`;
      exQty.set(k, (exQty.get(k) ?? 0) + p.qty);
    }
    const freshKeys = new Set<string>();
    {
      const lagFrom = Date.now() - LAG_MS;
      for (const r of ctlRows.values())
        if (
          (r.at > lagFrom && r.kind !== "S" && r.kind !== "T" && r.kind !== "V" && r.kind !== "Y") ||
          (r.status === "pending" && r.at > recentFrom && (r.kind === "O" || r.kind === "I" || r.kind === "X" || r.kind === "R"))
        )
          freshKeys.add(r.k);
    }
    const nativePendingKeys = new Set(Object.values(laneMap).filter((lo) => lo.qty > 0 || lo.s || lo.t).map((lo) => lo.key));
    for (const o of book.orders) {
      if (!isOwnCoid(o.clientOrderId, s.connId) || !["V", "Y"].includes(ownCoidKind(o.clientOrderId, s.connId))) continue;
      const ps = String(o.positionSide ?? "").toUpperCase();
      if (ps === "LONG" || ps === "SHORT") nativePendingKeys.add(`${o.venueSymbol}|${ps === "LONG" ? 1 : -1}`);
      else for (const side of [1, -1]) nativePendingKeys.add(`${o.venueSymbol}|${side}`);
    }
    const nativeShortfall = new Set<string>();
    let ownFresh: Map<string, number> | null = null;
    const attributed = new Map<string, NonNullable<ReturnType<typeof outsideReduction>> & { ex: number; found: { why: "stop" | "target" | "hand" | "liq"; px: number } | null }>();
    if (prevForeign) {
      const observed = new Set(held.keys());
      // A foreign resting order can freeze an otherwise journal-owned hedge side before `held` is built. The
      // prior foreign estimate plus the fresh physical quantity can still show that our entire known quantity
      // was consumed. Observe only this all-gone case; never adopt or resize a partially owned frozen side.
      if (!posOneway && !ordersStale) for (const [key, qty] of ledger)
        if (qty > 0 && isForeign(foreign, key) && (exQty.get(key) ?? 0) > 0 && !pendingKeys.has(key) &&
          !unverifiedOwnership.has(key)) observed.add(key);
      for (const k of observed) {
        const exk = exQty.get(k) ?? 0;
        // flat: the outside-close path books it; just acted on, or pending: the read may lag
        if (!(exk > 0) || freshKeys.has(k) || lagging.has(k)) continue;
        // the own quantity after this step's lane fills (recorded by the lane pass above: the venue reduced the side by
        // a lane order of ours — no outside reduction)
        const own = (ownFresh ??= ownLedger([...controlRows(rt).values()])).get(k) ?? 0;
        const [asym, asd] = k.split("|");
        const tol = Math.max(specs.get(asym)?.step ?? 0, own * MERGED_TOL) + 1e-9;
        const pf = prevForeign[k] ?? 0;
        const observation = outsideReduction({ own, ex: exk, prevForeign: pf, tol, ownFilled: 0 });
        if (!observation || (!held.has(k) && (observation.own > 0 || !trustedPreviousForeign(k)))) continue;
        if (nativePendingKeys.has(k)) {
          // A V/Y conditional may have partially filled while still in openOrders. On a mixed side the foreign
          // quantity can mask that fill from the native poll. An H guess now could be booked a second time when
          // the exact cumulative native receipt arrives. Reserve the key and its prior foreign baseline instead.
          nativeShortfall.add(k);
          laneBusy.add(k);
          status.skipped.push({ sym: asym, why: "native exit execution may explain the shortfall — awaiting exact receipt" });
          continue;
        }
        if (!held.has(k)) {
          const ps = Number(asd) === 1 ? "LONG" : "SHORT";
          // A native parent or an unverified own MARKET can still change ownership. Do not turn its unknown
          // exposure into an H decision while merely inspecting a side frozen by a foreign operator.
          if (Object.values(savedLaneMap).some((lo) => lo.key === k && (lo.qty > 0 || lo.s || lo.t)) ||
            book.orders.some((o) => o.venueSymbol === asym && isOwnCoid(o.clientOrderId, s.connId) &&
              !["S", "T"].includes(ownCoidKind(o.clientOrderId, s.connId)) &&
              (!o.positionSide || String(o.positionSide) === "BOTH" || o.positionSide === ps))) continue;
        }
        const rows = await historyOf(asym);
        const cf = rows ? closeFillsOf(rows, Number(asd), s.connId) : null;
        const r = outsideReduction({ own, ex: exk, prevForeign: pf, tol, ownFilled: cf?.own.qty ?? 0 })!;
        const a = { key: k, sym: asym, side: Number(asd) };
        const stamp = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
        if (r.explained > 0)
          record(`ownfill-${stamp()}`, a, "R", r.explained, cf!.own.px, "ok", `own ${cf!.own.why === "target" ? "take-profit" : "stop"} filled beside someone else's quantity`);
        if (r.unexplained > 0)
          record(
            `outside-${stamp()}`,
            a,
            "H",
            r.unexplained,
            (cf?.liq.qty ? cf.liq.px : cf?.foreign.px) || prices.get(asym) || 0,
            "ok",
            `outside reduction: ${r.shortfall} gone that no own order closed — taken from the own quantity first`,
          );
        ledger.set(k, r.own);
        if (r.own > 0) {
          held.set(k, Math.min(r.own, exk));
          if (exk > r.own * (1 + MERGED_TOL) + 1e-9) {
            merged.add(k);
            // one-way: freeze the symbol here as the cap's merged branch above does — the BOTH net holds the other owner's
            // part too, so no closePosition or other order goes to it in this step
            if (posOneway) foreign.add(asym);
          }
        } else {
          held.delete(k);
          merged.delete(k);
          // one-way: freeze the symbol, as the cap's own-zero branch does — the BOTH net holds the other owner's part, and an
          // open of the other side in this step would trade on that same net
          if (!independent) foreign.add(posOneway ? asym : k);
        }
        const found = !cf
          ? null
          : cf.own.qty > 0 && r.explained >= r.unexplained
            ? { why: cf.own.why, px: cf.own.px }
            : cf.liq.qty > 0
              ? { why: "liq" as const, px: cf.liq.px }
              : cf.foreign.qty > 0
                ? { why: "hand" as const, px: cf.foreign.px }
                : null;
        attributed.set(k, { ...r, ex: exk, found });
      }
    }
    // what someone else holds per key now, for the next step (an own order of the last LAG_MS may not show yet: the
    // previous estimate is carried — never raised by a read that lags behind our own order)
    const foreignNow: Record<string, number> = {};
    const foreignFrozen = new Set<string>();
    const foreignUnknown = new Set<string>();
    for (const [k, q] of exQty) {
      const knownOwn = ledger.get(k) ?? 0;
      const frozenOwned = knownOwn > 0 && !held.has(k) && (isForeign(foreign, k) || unverifiedOwnership.has(k));
      let est: number;
      if (nativeShortfall.has(k) && prevForeign) {
        est = prevForeign[k] ?? 0;
        if (frozenOwned && trustedPreviousForeign(k)) foreignFrozen.add(k);
        else if (frozenOwned) foreignUnknown.add(k);
      } else if (frozenOwned && trustedPreviousForeign(k)) {
        // The known ledger is an upper bound on our remaining share. Carry the prior estimate through a freeze;
        // q - knownOwn can raise the foreign lower bound, but must not relabel the whole frozen side as foreign.
        est = Math.max(prevForeign?.[k] ?? 0, Math.max(0, q - knownOwn));
        foreignFrozen.add(k);
      } else if (frozenOwned) {
        // Keep the conservative physical amount for margin checks, while preventing it from authorizing H later.
        est = q;
        foreignUnknown.add(k);
      } else est = freshKeys.has(k) && prevForeign ? (prevForeign[k] ?? 0) : Math.max(0, q - (held.get(k) ?? 0));
      if (est > 0) foreignNow[k] = est;
    }
    for (const key of previousUnknownForeign) if ((ledger.get(key) ?? 0) > 0) foreignUnknown.add(key);
    // The book is the pre-action snapshot. Native conditional reconciliation above may have journaled an R fill
    // after the initial ledger cap; refresh a reporting-only copy, including any H just recorded. Never mutate
    // the trading plan to produce a dashboard value. A frozen/pending side has no reliable ownership split.
    const accountLedger = ownLedger([...controlRows(rt).values()]);
    const accountHeld = new Map(held);
    for (const change of capHeldToOwn(accountHeld, accountLedger))
      if (change.own === null) accountUnresolved.add(change.key);
    for (const [key, qty] of accountLedger)
      if (qty > 0 && (!accountHeld.has(key) || isForeign(foreign, key))) accountUnresolved.add(key);
    for (const key of [...pendingKeys, ...laneBusy, ...unverifiedOwnership]) accountUnresolved.add(key);
    if (status.account) {
      const ap = accountPositions(book, accountHeld, foreign, accountUnresolved);
      status.account.positionsDetail = ap.rows.slice(0, 200);
      status.account.own = ap.own;
      status.account.foreign = ap.foreign;
      status.account.ownershipUnknown = { ...ap.ownershipUnknown,
        pendingKeys: [...accountUnresolved].filter((key) => !exQty.has(key)).length };
      status.account.markUnknown = ap.markUnknown;
    }
    // keys holding someone else's quantity now: their leverage and margin mode are never changed
    const foreignQty = new Set(Object.keys(foreignNow));
    // the keys own-first attribution end here: their lanes are booked closed outside and held back like any outside
    // close; what is left of ours is closed by the plan (its lanes no longer ask for it), except on a one-way key merged
    // with someone else's quantity, or whose symbol is frozen in this step: that leftover is held, not closed, until the
    // freeze lifts
    for (const [k, x] of attributed) {
      const [asym] = k.split("|");
      const by = noteExternal(k, prices.get(asym) ?? 0, true, x.found);
      // one-way and frozen (merged, or the symbol frozen in this step): the plan sends nothing for the leftover
      const leftHeld = posOneway && (merged.has(k) || foreign.has(asym));
      let n = 0;
      for (const l of allLanes)
        if (l.id && `${l.sym}|${l.side}` === k) {
          suppressed[l.id] = { key: k, at: nowSup };
          n++;
        }
      rt.db.event(
        "warn",
        `live: ${k} holds ${x.ex} where ${+(x.ex + x.shortfall).toFixed(8)} were expected — ${x.explained} by our own ${
          by.why === "target" ? "take-profit" : "stop"
        }, ${x.unexplained} by an order not ours (${by.why}), taken from our quantity first; ${x.own} of ours left${
          x.own > 0
            ? leftHeld
              ? merged.has(k)
                ? " — held, not closed: the symbol is frozen while the other owner's quantity is on the net"
                : " — held, not closed: the symbol is frozen (someone else's quantity may be on the net)"
              : " — closed now with a quantity-bounded order"
            : ""
        }; ${n} lane order(s) held back (at most ${SUPPRESS_MAX_MS / 60_000} min). Should the other part have been reduced instead, our leftover stays inside it untouched.`,
      );
    }
    liveKvSet(rt.db, "controlSuppressed", suppressed);
    // only validated configs ask for volume: a config the current selection dropped (or a signal no longer
    // active) keeps its lane only while its position is held — it is never reopened or opened anew
    const selected = paper.selected ? new Set(paper.selected) : null;
    const sigActive = rt.wf?.signalActive;
    // what the operator lets reach the exchange: the strategy kinds of live.kinds (unset / empty = every kind), the
    // families of live.excludeConfigs and, with live.plainOnly, only lanes Block did not raise. The engine keeps
    // computing and paper-trading everything. A held position of a kind / range left out is still managed by its
    // lanes until they exit; a held position of an excluded config is closed (its lanes are dropped below).
    // the exchange proofs (live.engineProofN / signalProofN: own exchange closes) and the exact post-Base / owned
    // execution promotion gate (paper book evidence) both hold: a lane reaches the exchange only when each lets it
    const promotionEvidence = new Map<string, { cfg: string; sym: string; side: number } & LiveGate>();
    // the proofs are rebuilt in slices when a close landed (not in one piece inside this step), and read from memo below
    phase("proofs");
    await rt.warmProofs?.();
    checkAccount();
    const { sendable, validLane, closedConfig, unproven } = liveLaneFilter(
      s,
      selected,
      sigActive,
      rt.engineProof?.()?.proven ?? null,
      rt.signalProof?.()?.proven ?? null,
      (lane) => {
        const key = promoteLaneKey(lane);
        let evidence = promotionEvidence.get(key);
        if (!evidence) {
          evidence = { ...lane, ...(rt.livePromotionGate?.(lane) ?? { required: true, ok: false, n: 0, pf: null, state: "execution-insufficient" }) };
          promotionEvidence.set(key, evidence);
        }
        return evidence.ok;
      },
    );
    const promotionHeldKeys = new Set<string>();
    let notSent = 0;
    // signal lanes of a unit not active (and no position held): they keep paper-trading, counted beside notSent
    let inactiveSignal = 0;
    // no chasing: a lane joins the exchange only while the price is within maxChase of its target distance from the
    // paper entry (in the trade's direction; a cheaper entry is fine). The paper book adopts a position after its
    // compute — minutes after the bar — and a late entry at a run-away price lost what the simulation booked (x02,
    // 7 Oct: 45 adopted lanes, PF 0.38). A lane already on the exchange stays whatever the price does.
    const maxChase = s.maxChase ?? 0.25;
    const trackedLanes = priorLaneOpen;
    const onExchangeLanes = new Set(Object.keys(trackedLanes));
    let chased = 0;
    // control completeness: every paper symbol × side, how many of its lanes reach the exchange and why the others
    // do not (ControlStatus.keys)
    const funnel = new Map<string, KeyFunnel>();
    const fk = (l: { sym: string; side: number; key?: string }) => {
      const k = l.key ?? `${l.sym}|${l.side}`;
      let f = funnel.get(k);
      if (!f) funnel.set(k, (f = { key: k, paper: 0, suppressed: 0, chased: 0, notSent: 0, notSelected: 0, sent: 0, budget: 0, target: false }));
      return f;
    };
    const keepLane = (l: (typeof allLanes)[number]): boolean => {
      const f = fk(l);
      f.paper++;
      if (l.id && suppressed[l.id]) {
        f.suppressed++;
        return false;
      }
      if (
        maxChase > 0 &&
        l.id &&
        (l.chase ?? 0) > maxChase &&
        !onExchangeLanes.has((l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side })))
      ) {
        chased++;
        f.chased++;
        return false;
      }
      if (validLane(l)) {
        f.sent++;
        // a raised position counts once (its Overall legs carry the same multiple)
        if ((l.mult ?? l.vol) > 1 + 1e-9 && !(l.id && l.id.includes("|blk:"))) f.raised = (f.raised ?? 0) + 1;
        return true;
      }
      // "held" is per lane: a lane that may not open (unproven engine config, excluded range / kind / source, not
      // selected) keeps only its own share already on the exchange — never one another lane opened on the same
      // symbol × side (that would add volume for a lane kept off the exchange; bug hunt, 13 Oct). Lanes without an
      // id (no lane record) fall back to the key.
      const isHeld = held.has(`${l.sym}|${l.side}`) && (!l.id || onExchangeLanes.has(l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side })));
      if (isHeld) promotionHeldKeys.add(`${l.sym}|${l.side}`);
      if (!sendable(l)) {
        notSent++;
        f.notSent++;
        // (of those, the lanes only the signal proof holds back: the key's reason names the proof)
        if (unproven(l)) f.unproven = (f.unproven ?? 0) + 1;
        // a lane of an excluded config never asks for volume, even on a held key: dropped here, its key has no target
        // left for it and the control closes its share. Other lanes left out (kind, range, source, an unproven
        // config or signal unit) stay while their own share is held.
        const keepHeld = isHeld && !closedConfig(l);
        if (keepHeld) f.sent++;
        return keepHeld;
      }
      f.notSelected++;
      if (!isHeld && cfgInfo(l.cfg).isSig) inactiveSignal++;
      if (isHeld) f.sent++;
      return isHeld;
    };
    // (the filter in slices: every lane is judged against the selection, the proofs and the funnel)
    phase("lane filter");
    let lanes: typeof allLanes = [];
    {
      let t = performance.now();
      for (let i = 0; i < allLanes.length; i++) {
        if ((i & 511) === 511 && performance.now() - t > 12) {
          await new Promise<void>((res) => setImmediate(res));
          checkAccount();
          t = performance.now();
        }
        if (keepLane(allLanes[i])) lanes.push(allLanes[i]);
      }
    }
    const drainUnknown = new Set<string>();
    if (drainingLaneOrders) {
      // An orphan native conditional may still protect a held position even if its local lane map was lost.
      // Keep the side and its old orders untouched until ownership is reconciled; never infer its allocation.
      const nativeIds = new Set(Object.values(laneMap).flatMap((lo) => [lo.s?.coid, lo.t?.coid])
        .filter((id): id is string => !!id).map((id) => id.toUpperCase()));
      for (const order of book.orders) {
        if (!isOwnCoid(order.clientOrderId, s.connId) || !["V", "Y"].includes(ownCoidKind(order.clientOrderId, s.connId)) ||
          nativeIds.has((order.clientOrderId ?? "").toUpperCase())) continue;
        const key = keyOfOwn(order, book);
        if (key) drainUnknown.add(key);
        else for (const heldKey of held.keys()) if (heldKey.startsWith(`${order.venueSymbol}|`)) drainUnknown.add(heldKey);
      }
      const retained: typeof lanes = [];
      for (const lane of lanes) {
        const id = lane.id ? (lane.lk ?? laneKeyOf({ id: lane.id, cfg: lane.cfg, sym: lane.sym, side: lane.side })) : "";
        if (id && laneMap[id] && laneMap[id].qty > 0 && !laneMap[id].closed) { retained.push(lane); continue; }
        const key = `${lane.sym}|${lane.side}`, f = fk(lane);
        f.sent = Math.max(0, f.sent - 1);
        f.notSent++;
        f.why ??= "native lane-order transition is waiting for existing lanes to close";
        status.skipped.push({ sym: lane.sym, why: "native lane-order transition is waiting for existing lanes to close" });
        if (held.has(key) && id && onExchangeLanes.has(id)) drainUnknown.add(key);
      }
      lanes = retained;
    }
    // Venue TP/SL orders are not atomically linked: the sibling can execute before cancellation. A bounded
    // order can still reduce anyone else's quantity on a netted symbol/side, so reserve that entire physical
    // side for one parent in every sizing mode. Keep legacy parents and their protections without reallocating.
    const ownRestingKeys = new Set<string>();
    for (const order of book.orders) {
      if (!isOwnCoid(order.clientOrderId, s.connId)) continue;
      const ps = String(order.positionSide ?? "").toUpperCase();
      if (ps === "LONG" || ps === "SHORT") ownRestingKeys.add(`${order.venueSymbol}|${ps === "LONG" ? 1 : -1}`);
      else for (const side of [1, -1]) ownRestingKeys.add(`${order.venueSymbol}|${side}`);
    }
    // Persist every observed aggregate conditional and every unlinked native exit before it can go missing.
    // A healthy linked order remains usable; a missing or unlinked one cannot authorize another parent.
    let orphanChanged = false;
    const nativeIds = new Set<string>();
    const attachedIds = new Set<string>();
    for (const lo of Object.values(laneMap)) for (const [order, type] of [
      [lo.s, "STOP_MARKET"], [lo.t, "TAKE_PROFIT_MARKET"],
    ] as const) {
      if (!order?.coid || !order.oid) continue;
      const ps = posOneway ? "BOTH" : lo.side === 1 ? "LONG" : "SHORT";
      nativeIds.add(JSON.stringify([lo.sym, order.coid.toUpperCase(), String(order.oid), ps, type]));
    }
    for (const order of book.orders) {
      const coid = order.clientOrderId ?? "", kind = ownCoidKind(coid, s.connId), row = ctlByUpper().get(coid.toUpperCase());
      if ((kind !== "S" && kind !== "T") || !row || row.kind !== kind || row.status !== "ok" || !(row.qty > 0) ||
        row.k !== `${order.venueSymbol}|1` && row.k !== `${order.venueSymbol}|-1`) continue;
      const side = row.k.endsWith("|1") ? "LONG" : "SHORT";
      const ps = String(order.positionSide ?? "").toUpperCase();
      const expectedType = kind === "S" ? "STOP_MARKET" : "TAKE_PROFIT_MARKET";
      if (String(order.type ?? expectedType).toUpperCase() !== expectedType ||
        (posOneway ? ps && ps !== "BOTH" : ps !== side) || !(ledger.get(row.k)! > 0) ||
        !book.positions.some((p) => p.venueSymbol === order.venueSymbol && p.qty > 0 &&
          p.side === (side === "LONG" ? "long" : "short"))) continue;
      attachedIds.add(orphanFenceId({ conn: orphanConn, sym: order.venueSymbol, coid, oid: exactVenueOrderId(order.id),
        positionSide: posOneway ? "BOTH" : side, type: expectedType }));
    }
    if (!ordersStale) for (const observed of observedUnlinkedExits(book, orphanConn, orphanConnName, nativeIds)) {
      const id = orphanFenceId(observed);
      if (!orphanFences[id]) { orphanFences[id] = observed; orphanChanged = true; }
      // A previous snapshot may have omitted only the exchange ID. The same client ID, side and kind can
      // resolve that unknown ID; a conflicting identity remains a separate outstanding fence.
      if (observed.oid) {
        const withoutId = orphanFenceId({ ...observed, oid: "" });
        const old = orphanFences[withoutId];
        if (old && old.positionSide === observed.positionSide && old.type === observed.type) {
          delete orphanFences[withoutId]; orphanChanged = true;
        }
      }
    }
    if (orphanChanged) { persistOrphanFences(); orphanChanged = false; } // durable before any possible new parent order
    const visibleOrphanIds = new Set(book.orders.flatMap((o) => o.clientOrderId
      ? [orphanObservationId({ conn: orphanConn, sym: o.venueSymbol, coid: o.clientOrderId, oid: exactVenueOrderId(o.id) })] : []));
    const orphanKeys = new Set<string>();
    // Bound and rotate status reads; unknown results stay fenced and cannot starve another orphan forever.
    const pollAt = orphanFencePollAt.get(rt.db) ?? new Map<string, number>();
    const replies = orphanFenceReplies.get(rt.db) ?? new Map<string, unknown>();
    const inFlight = orphanFenceInFlight.get(rt.db) ?? new Set<string>();
    orphanFencePollAt.set(rt.db, pollAt); orphanFenceReplies.set(rt.db, replies); orphanFenceInFlight.set(rt.db, inFlight);
    const orderedOrphans = Object.entries(orphanFences).sort(([a], [b]) => (pollAt.get(a) ?? 0) - (pollAt.get(b) ?? 0));
    for (const [id, pending] of orderedOrphans) {
      if (pending.conn !== orphanConn) continue; // another account's identities remain durable, never reused
      const visible = visibleOrphanIds.has(orphanObservationId(pending));
      if (!ordersStale && visible && attachedIds.has(id) && !pending.cancelPending) continue;
      if (!ordersStale && pending.oid && (!visible || pending.cancelPending)) {
        const reply = replies.get(id);
        const terminalZero = orphanCancelledZero(pending, reply);
        if (!visible && terminalZero) {
          replies.delete(id); delete orphanFences[id]; pollAt.delete(id); orphanChanged = true; continue;
        }
        // A terminal reply while the fresh book still shows this order conflicts with the book. Discard it:
        // after a later absent book, obtain a new exact terminal receipt before permitting the side to reopen.
        replies.delete(id);
        if (ex.orderStatus && inFlight.size < 8 && !inFlight.has(id) && Date.now() - (pollAt.get(id) ?? 0) >= 5_000) {
          // Reconciliation is background work: a slow or hung status endpoint must never delay another parent's
          // protection or close. Results are consumed only on a later fresh book, by the active control step.
          inFlight.add(id); pollAt.set(id, Date.now());
          const lookup = ex.orderStatus.bind(ex);
          let timer: ReturnType<typeof setTimeout> | undefined;
          const timeout = new Promise<null>((resolve) => {
            timer = setTimeout(() => resolve(null), 3_000);
            (timer as { unref?: () => void }).unref?.();
          });
          void Promise.race([Promise.resolve().then(() => lookup(pending.sym, pending.oid)).catch(() => null), timeout])
            .then((result) => {
              if (timer) clearTimeout(timer);
              inFlight.delete(id);
              if (result !== null && result !== undefined && alive() && rt.settings.live.connId === orphanConnName &&
                orphanConnHash() === orphanConn) replies.set(id, result);
            });
        }
      }
      for (const key of orphanFenceKeys(pending)) { orphanKeys.add(key); laneBusy.add(key); }
      status.skipped.push({ sym: pending.sym, why: "observed orphan exit awaits exact zero-fill terminal confirmation" });
    }
    if (orphanChanged) persistOrphanFences(); // release is durable before any new parent may enter
    const orphanBlocked = (key: string) => orphanKeys.has(key) || uncertainSubmitted.has(key);
    const trackedKeys = independent ? new Set(Object.values(trackedLanes).map((lane) => `${lane.sym}|${lane.side}`)) : new Set<string>();
    const confirmedFlat = independent ? new Set(flatKeys) : new Set<string>();
    if (independent) for (const p of book.positions) {
      const key = `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`;
      if (!(p.qty > 0) || !trackedKeys.has(key) || confirmedFlat.has(key) || held.has(key) || (ledger.get(key) ?? 0) > 0) continue;
      // A surviving logical parent alone cannot prove whether the observed quantity is ours or foreign. Freeze
      // rather than treating that old parent as an already owned target or allowing a sibling to adopt the side.
      unverifiedOwnership.add(key);
      foreign.add(key);
      status.skipped.push({ sym: p.venueSymbol, why: "tracked parent has no confirmed owned quantity; ownership requires reconciliation" });
    }
    const venueOccupied = book.positions.filter((p) => p.qty > 0)
      .map((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`);
    // An orphan or pending conditional can still fire after a flat snapshot. Do not repurchase even the same
    // logical parent while its exact old exit is outstanding or the order book is stale.
    const venueSet = new Set(venueOccupied);
    for (const key of ownRestingKeys) if (!venueSet.has(key)) laneBusy.add(key);
    if (ordersStale) for (const lane of lanes) laneBusy.add(`${lane.sym}|${lane.side}`);
    const isolated = isolateNewParents(lanes, {
      aggregate: true,
      oneway: posOneway,
      occupied: new Set<string>([...held.keys(), ...pendingKeys, ...lagging, ...unverifiedOwnership,
        ...[...ledger].filter(([, qty]) => qty > 1e-12).map(([key]) => key),
        ...venueOccupied, ...ownRestingKeys, ...orphanKeys, ...Object.values(exitCleanup).map((x) => x.key),
        ...Object.values(laneMap).filter((lo) => lo.qty > 0 || lo.s || lo.t).map((lo) => lo.key)]),
      tracked: trackedLanes,
    });
    lanes = isolated.lanes;
    for (const { lane, why } of isolated.blocked) {
      const f = fk(lane);
      f.sent = Math.max(0, f.sent - 1);
      f.notSent++;
      f.why ??= why;
      status.skipped.push({ sym: lane.sym, why });
    }
    for (const key of isolated.ambiguous) {
      const [sym, side] = key.split("|");
      const why = "existing aggregate position has multiple parents with unverified quantities";
      fk({ sym, side: Number(side), key }).why ??= why;
      status.skipped.push({ sym, why });
    }
    for (const key of isolated.unknown) {
      const [sym, side] = key.split("|");
      const why = "parent ownership unavailable; held quantity kept for reconciliation";
      fk({ sym, side: Number(side), key }).why ??= why;
      status.skipped.push({ sym, why });
    }
    rt.status.livePromotion = promotionStatus([...promotionEvidence.values()]);
    // one lane volume unit: fixed % of account balance (or the fixed notional); unknown balance → nothing is
    // sized: held positions are kept as they are (closes of lanes that ended still run), nothing opens or grows
    phase("sizing");
    const unitRaw = await liveUnit(rt, ex, acct);
    checkAccount();
    // account-balance ratio budgets need a fresh wallet balance; unknown balance never lifts a cap
    // the exposure scaler switched off: maxExposureX bounds nothing (neither the fill budget nor the targets)
    const maxExposureX = s.exposureScaler === false ? 0 : (s.maxExposureX ?? 0);
    // B = min(wallet, equity) of this step's fresh account read: unknown (or stale) wallet balance never lifts a cap.
    // (risk-based sizing is sized on B itself: unknown B sizes nothing either)
    const peekNow = liveUnitPeek(rt);
    const balanceNow = peekNow.balance === null ? null : (peekNow.base ?? peekNow.balance);
    const balanceCapped =
      (s.maxPositionX ?? 0) > 0 ||
      maxExposureX > 0 ||
      (s.maxRiskPct ?? 0) > 0 ||
      (s.maxBackstopLossPct ?? 0) > 0 ||
      s.positionSize === "risk";
    const unit = balanceCapped && balanceNow === null ? null : unitRaw;
    // symbols / sides with a foreign position or order are never touched: their lanes take no share of the budgets
    const lanesOwn = lanes.filter((l) => !isForeign(foreign, `${l.sym}|${l.side}`));
    // minimum-quantity sizing: one unit = the symbol's exchange minimum (its lot), the Block volume in whole lots
    const minQty = sizingSettings(rt.settings.sizing).mode === "minQty";
    // top configs: only the best-ranked engine configs (and every active signal) go to the exchange — as many as
    // the account exposure budget carries ("fill") or a fixed number; the paper book keeps every config
    let liveLanes = lanesOwn;
    const top = s.top;
    if (top === "fill" || (typeof top === "number" && top > 0)) {
      const eq = balanceNow ?? 0;
      // the budget the scalers will allow: the exposure cap, and the risk budget at the lanes' mean planned loss
      // (a fill to the exposure cap alone kept ~8× more configs than the risk budget funds, all squeezed to minimums)
      let lw = 0;
      let lr = 0;
      let ls = 0;
      const minStop = s.minStopPct ?? 0.01;
      for (const l of lanesOwn) {
        const w = Math.max(0, l.vol) * (cfgInfo(l.cfg).isSig ? Math.max(0, s.signalWeight ?? 1) : 1);
        lw += w;
        lr += w * Math.max(0, l.risk ?? l.sl);
        // the backstop distance controlTargets gives the position (widest lane stop × 1.2, min stop … 20 %)
        ls += w * Math.min(0.2, Math.max(minStop, l.sl * 1.2));
      }
      const meanRisk = Math.max(minStop, lw > 0 ? lr / lw : 0.01);
      const meanStop = Math.max(minStop, lw > 0 ? ls / lw : 0.012);
      // (the worst-case budget too: left out, the fill overshot it and its scaler squeezed every position back down)
      const budget = Math.min(
        maxExposureX > 0 && eq > 0 ? maxExposureX * eq : Infinity,
        s.maxRiskPct && s.maxRiskPct > 0 && eq > 0 ? (s.maxRiskPct * eq) / meanRisk : Infinity,
        s.maxBackstopLossPct && s.maxBackstopLossPct > 0 && eq > 0 ? (s.maxBackstopLossPct * eq) / meanStop : Infinity,
      );
      const ratio = s.ratio ?? 1;
      // a position never costs more than the per-position cap: past it, the budget goes to further configs
      const posCap = positionCapFor(positionCapOf(s), eq, s.maxPositionX);
      // the configs kept last step come first: a reshuffled ranking (every compute) must not churn the book
      const prev = liveKv<string[]>(rt.db, "controlTopKept");
      const riskOf = s.positionSize === "risk" ? symRiskDist(lanesOwn, minStop) : null;
      const r = topConfigLanes(lanesOwn, (c) => paper.scores?.get(c), {
        top,
        budget,
        prefer: new Set(Array.isArray(prev) ? prev : []),
        signalWeight: s.signalWeight ?? 1,
        signalsByScore: s.signalsByScore === true,
        posCost: (sym, v) => {
          const px = prices.get(sym) ?? 0;
          const spec = specs.get(sym) ?? null;
          const u = minQty ? bx.minQtyExchange(px, spec) * px : (unit ?? 0);
          // positionSize "min": a position costs its ratio units, however many lanes hold it
          const units = s.positionSize === "min" ? 1 : v;
          // positionSize "risk": B × risk per position × ratio at the symbol's lanes' planned risk
          const want = riskOf
            ? riskNotional(eq, s.riskPerPositionPct ?? RISK_PER_POSITION_DEFAULT, ratio, riskOf.get(sym) ?? minStop)
            : units * ratio * u;
          return Math.max(bx.exchangeMinNotional(spec, px), Math.min(posCap, want));
        },
      });
      liveLanes = r.lanes;
      liveKvSet(rt.db, "controlTopKept", r.cfgs);
      liveKvSet(rt.db, "controlTop", { at: Date.now(), top, kept: r.kept, of: r.of, budget, lanes: r.lanes.length });
    }
    const posCapNow = positionCapFor(positionCapOf(s), balanceNow, s.maxPositionX);
    // held now, and the keys opened moments ago that the position read does not show yet (lagging): a fresh open is
    // ranked as held, so the position cap or a budget scaler never displaces it (and closes it the next step)
    const heldNow = new Set<string>(held.keys());
    for (const p of book.positions) heldNow.add(`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`);
    for (const k of lagging) if (!isForeign(foreign, k)) heldNow.add(k);
    for (const k of pendingKeys) if (!isForeign(foreign, k)) heldNow.add(k);
    // a quantity the venue has already named as its minimum is never undercut again — by the sizing or by a scaler
    const venueQty = (sym: string) => venueMinQty(rt, sym);
    const snapVenue = (sym: string, q: number, px: number) =>
      bx.snapQtyExchange(q, px, specs.get(sym) ?? null, venueQty(sym)).qty;
    // a key that cannot open this step takes no slot under the position cap: its open is waiting after a refusal
    // (open / margin-mode / leverage backoff — an offline symbol waits hours), or the free-margin floor refused it
    // moments ago. Its slot goes to the next target instead. (Lb: this runtime's live memory, read above)
    const openBlocked = (key: string): string | null => {
      const sym = key.split("|")[0];
      const w =
        waiting(`${connHash}|open|${key}`) ??
        waiting(`${connHash}|margin|${sym}`) ??
        waiting(`${connHash}|leverage|${sym}`);
      if (w) return `open waiting after a failure: ${w}`;
      const m = Lb.floorRefused.get(key);
      if (m && m.until > Date.now()) return `open waiting: ${m.msg}`;
      if (m) Lb.floorRefused.delete(key);
      return null;
    };
    // targets dropped by a budget scaler (risk / worst case) are left out of the next pass BEFORE the position cap, so
    // the slot they took goes to the next target; held positions are never dropped. Passes repeat until no scaler
    // drops anything new (bounded: a key once dropped stays out, so each pass removes at least one).
    const budgetDrop = new Map<string, string>();
    // lanes the budget fill (live.top) left out, per key
    {
      const keptIds = new Set(liveLanes.map((l) => l.id ?? `${l.cfg}|${l.sym}|${l.side}`));
      for (const l of lanesOwn) if (!keptIds.has(l.id ?? `${l.cfg}|${l.sym}|${l.side}`)) fk(l).budget++;
      // a symbol another system holds is never touched: its lanes are not sent (no budget question)
      for (const l of lanes) if (isForeign(foreign, `${l.sym}|${l.side}`)) fk(l).why ??= "foreign position or order";
    }
    let targets: ControlTarget[] = [];
    let skipped: ReturnType<typeof controlTargets>["skipped"] = [];
    let exposure: ReturnType<typeof scaleToExposure> = null;
    let risk: ReturnType<typeof scaleToRisk> = null;
    let worst: ReturnType<typeof scaleToRisk> = null;
    for (;;) {
      ({ targets, skipped } = controlTargets(
        liveLanes,
        prices,
        {
          ...controlSettingsOf(drainingLaneOrders ? { ...s, laneOrders: true } : s, unit ?? 0, rt.settings.signals.maxPositions, balanceNow),
          maxNotionalUsd: posCapNow,
          ...(minQty
            ? {
                unitOf: (sym: string, px: number) =>
                  bx.minQtyExchange(px, specs.get(sym) ?? null) * px,
              }
            : {}),
          heldKeys: heldNow,
          blocked: (k: string) => budgetDrop.get(k) ?? openBlocked(k),
          // the venue's own floor under our minStopPct, per symbol and per price (its price tick plus clearance)
          minStopOf: (sym: string, px: number) =>
            bx.minStopDist(px, specs.get(sym) ?? null, venueMins(rt).get(sym)?.stop ?? 0),
        },
        (sym, q, px) => bx.snapQtyExchange(q, px, specs.get(sym) ?? null, venueQty(sym)),
      ));
      // the account budgets, their drops decided across all three at once (in rank order, every target whose
      // exchange minimum fits what each budget has left — a stronger target over a budget never empties the book):
      // account exposure factor: one factor for every target when the gross notional (long and short both counted
      // in full) exceeds the multiple of equity — gross exposure is one account-level bound, so the relations
      // between positions (long vs short among them) stay as they are;
      // stop-risk budget: what every stop hit at once would cost stays within maxRiskPct of the equity;
      // worst case: every exchange backstop filled at once (gaps aside) stays within maxBackstopLossPct of the
      // equity — the cap that keeps a high volume factor from risking the account
      ({ exposure, risk, worst } = scaleToBudgets(
        targets,
        balanceNow,
        { maxExposureX, maxRiskPct: s.maxRiskPct, maxBackstopLossPct: s.maxBackstopLossPct },
        snapVenue,
        heldNow,
      ));
      const fresh: Array<[string, string]> = [
        ...(exposure?.dropped ?? []).map((k) => [k, "gross exposure cap"] as [string, string]),
        ...(risk?.dropped ?? []).map((k) => [k, "risk budget"] as [string, string]),
        ...(worst?.dropped ?? []).map((k) => [k, "worst-case budget"] as [string, string]),
      ];
      for (const [k, why] of fresh) budgetDrop.set(k, why);
      // Exchange slots are filled after selection. If an account budget drops a candidate, the next pass releases
      // that uncommitted slot to the next eligible key; already held exchange positions always keep their slots.
      if (!fresh.length) break;
    }
    if (exposure && exposure.factor < 1)
      liveKvSet(rt.db, "controlExposure", { at: Date.now(), ...exposure });
    const droppedBy = (why: string) => [...budgetDrop].filter(([, w]) => w === why).map(([k]) => k);
    if (risk) liveKvSet(rt.db, "controlRisk", { at: Date.now(), ...risk, dropped: droppedBy("risk budget") });
    if (worst)
      liveKvSet(rt.db, "controlWorstCase", { at: Date.now(), ...worst, dropped: droppedBy("worst-case budget") });
    // volume factor at work: how many positions the per-position cap cut (there a higher factor sizes nothing up)
    // and the size spread after every scaler — all positions at one size means the factor has no effect
    let ratioHint: string | null = null;
    if (targets.length) {
      const ns = targets.map((t) => t.notional).sort((a, b) => a - b);
      const capped = targets.filter((t) => t.capped).length;
      const ratio = s.ratio ?? 1;
      // the factor below which a position is sized by its volume instead of the cap: posCap / (unit × weighted
      // volume), and the largest of those over the targets is where the factor starts to matter at all
      let starts = 0;
      for (const t of targets) {
        const px = t.qty > 0 ? t.notional / t.qty : 0;
        // risk-based: one ratio unit is B × risk per position at the target's risk distance
        const u =
          s.positionSize === "risk"
            ? riskNotional(balanceNow ?? 0, s.riskPerPositionPct ?? RISK_PER_POSITION_DEFAULT, 1, t.riskDist ?? t.stopDist)
            : minQty
              ? bx.minQtyExchange(px, specs.get(t.sym) ?? null) * px
              : (unit ?? 0);
        const v = s.positionSize === "min" || s.positionSize === "risk" ? 1 : t.vol;
        if (u > 0 && v > 0) starts = Math.max(starts, posCapNow / (u * v));
      }
      const sizing = {
        at: Date.now(),
        ratio,
        posCap: posCapNow,
        equity: acct?.equity ?? null,
        wallet: acct?.wallet ?? null,
        base: B,
        balance: balanceNow,
        targets: targets.length,
        capped,
        raised: targets.filter((t) => t.raised).length,
        min: ns[0],
        median: ns[ns.length >> 1],
        max: ns[ns.length - 1],
        ...(capped === targets.length && starts > 0 ? { ratioMatters: starts } : {}),
      };
      // a budget that scales every position by one shared factor cancels the volume factor as well: a higher factor
      // asks for more, the same factor scales it back (x01, 7 Oct: the worst-case budget sized every position while
      // the hint, reading the cap alone, said nothing — or blamed the cap)
      const scaledBy = [
        exposure && exposure.factor < 1 ? { what: "gross exposure cap", knob: "maxExposureX", factor: exposure.factor } : null,
        risk && risk.factor < 1 ? { what: "risk budget", knob: "maxRiskPct", factor: risk.factor } : null,
        worst && worst.factor < 1
          ? { what: "worst-case budget", knob: "maxBackstopLossPct", factor: worst.factor }
          : null,
      ]
        .filter((x): x is { what: string; knob: string; factor: number } => x !== null)
        .sort((a, b) => a.factor - b.factor);
      if (scaledBy.length) (sizing as Record<string, unknown>).scaledBy = scaledBy;
      liveKvSet(rt.db, "controlSizing", sizing);
      if (capped === targets.length && starts > 0 && starts < ratio && !scaledBy.length)
        ratioHint = `volume factor ${ratio} has no effect: every position sits at the per-position cap ${posCapNow.toFixed(2)} USD — it sizes positions only below ${starts < 0.1 ? starts.toPrecision(2) : starts.toFixed(2)} (or with a higher cap)`;
      else if (scaledBy.length)
        ratioHint = `volume factor ${ratio} has no effect: the ${scaledBy[0].what} scales every position (× ${scaledBy[0].factor.toFixed(3)}${
          scaledBy.length > 1 ? `; also ${scaledBy.slice(1).map((x) => `${x.what} × ${x.factor.toFixed(3)}`).join(", ")}` : ""
        }) — raise live.${scaledBy.map((x) => x.knob).join(" / live.")} for larger positions`;
      const Ls = local(rt);
      if (targets.length >= 3 && capped === targets.length && Date.now() - Ls.sizingWarnAt > 3_600_000) {
        Ls.sizingWarnAt = Date.now();
        rt.db.event(
          "warn",
          `live: volume factor ${sizing.ratio} has no effect — all ${capped} positions sit at the optional balance-relative position limit (raise maxPositionX or lower the factor to size by volume${starts > 0 ? `; it starts to matter below ${starts.toFixed(2)}` : ""})`,
        );
      }
    }
    // A partially filled full-close intent remains authoritative even if its old logical lane record was retired.
    // Continue closing only that confirmed remainder; an unknown legacy side without such an intent stays protected.
    const frozenParents = new Set([...isolated.unknown, ...isolated.ambiguous]);
    const lastAction = new Map<string, ControlRow>();
    if (frozenParents.size) for (const row of ctlRows.values()) {
      if (!frozenParents.has(row.k) || !["O", "I", "X", "F"].includes(row.kind) ||
        (row.status !== "ok" && row.status !== "pending" && !(row.kind === "X" && row.status === "error"))) continue;
      const prior = lastAction.get(row.k);
      if (!prior || row.at >= prior.at) lastAction.set(row.k, row);
    }
    const continuingClose = new Set([...lastAction].flatMap(([key, row]) =>
      row.kind === "X" && (ledger.get(key) ?? 0) > 0 ? [key] : []));
    const keep = new Set([...skipped.flatMap((x) => (x.keep ? [x.keep] : [])), ...drainUnknown,
      ...[...frozenParents].filter((key) => !continuingClose.has(key))]);
    if (unit === null) for (const l of lanes) keep.add(`${l.sym}|${l.side}`);
    // no contract specs (an outage): nothing can be sized or rounded — every held position is kept as it is
    const noSpecs = specs.size === 0;
    if (noSpecs) for (const k of held.keys()) keep.add(k);
    // free-margin floor: an unknown free margin counts as below it (never open blind on a guarded account)
    const floor = s.minFreeMargin ?? 0;
    const accountAt = acct?.at ?? accountCache.get(clientCacheFingerprint(ex))?.at;
    const freshAccount = accountAt === undefined || (Number.isFinite(accountAt) && Date.now() - accountAt <= EQUITY_MAX_AGE);
    const free = freshAccount && typeof acct?.availableMargin === "number" && Number.isFinite(acct.availableMargin)
      ? acct.availableMargin : null;
    const marginLow =
      floor > 0 && (free === null || free < floor)
        ? `free margin ${free === null ? "unknown" : `${free.toFixed(2)} USDT`} below the ${floor} USDT floor`
        : null;
    const paused = s.openPaused
      ? `opening paused${typeof s.openPaused === "string" ? `: ${s.openPaused}` : ""}`
      : null;
    const openBlock =
      (rt.executionEntryBlocked?.() ? "settings awaiting computation; existing positions protected" : null) ??
      notReady ?? (unit === null ? "account balance unknown — not sizing" : null) ?? marginLow ?? paused;
    // the room above the floor for this step: the account snapshot can be up to ~75 s old (client cache + exchange
    // read cache), so the margin of own opens in that time is taken off as well (counted twice at worst — safe side)
    const Lm = local(rt);
    Lm.marginSpent = Lm.marginSpent.filter((x) => Date.now() - x.at < ACCOUNT_MS + 15_000);
    let marginRoom =
      floor > 0 && free !== null
        ? free - floor - Lm.marginSpent.reduce((a, x) => a + x.usd, 0)
        : Infinity;
    const bookParts = [
      ...[...held.entries()].sort().map(([k, q]) => `P:${k}:${q}`),
      ...book.orders
        .filter((o) => isOwnCoid(o.clientOrderId, s.connId))
        .map((o) => `O:${o.clientOrderId}`)
        .sort(),
    ];
    const laneRequestedQty = new Map<string, number>();
    const laneReconcileBusy = new Set(laneBusy);
    const drainingWaiting = new Set<string>();
    if (laneMode) {
      const present = new Set(liveLanes.flatMap((l) => l.id
        ? [l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side })] : []));
      // A Paper disappearance does not prove its venue close. Cancelling its only protection before a market
      // exit can leave a partially filled residual and fabricate the whole parent's settled return. Retain the
      // exact native orders and parent until its own fill or explicit reconciliation, even without a mode change.
      for (const lo of Object.values(laneMap)) if (lo.qty > 0 && !present.has(lo.id)) drainingWaiting.add(lo.key);
      for (const [id, lane] of Object.entries(trackedLanes)) {
        const key = `${lane.sym}|${lane.side}`;
        if (!present.has(id) && ((held.get(key) ?? 0) > 0 || (ledger.get(key) ?? 0) > 1e-12 || pendingKeys.has(key)))
          drainingWaiting.add(key);
      }
      for (const key of drainingWaiting) {
        laneBusy.add(key);
        keep.add(key);
        status.skipped.push({ sym: key.split("|")[0], why: "departed native parent awaits its own venue exit or reconciliation" });
      }
    }
    if (drainingLaneOrders) {
      const parents = new Map<string, Set<string>>();
      for (const l of liveLanes) if (l.id) {
        const key = `${l.sym}|${l.side}`;
        const ids = parents.get(key) ?? new Set<string>();
        ids.add(l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side }));
        parents.set(key, ids);
      }
      const tracked = new Map<string, number>();
      for (const lo of Object.values(laneMap)) {
        tracked.set(lo.key, (tracked.get(lo.key) ?? 0) + Math.max(0, lo.qty));
        if (lo.qty > 0 && !parents.get(lo.key)?.has(lo.id)) drainingWaiting.add(lo.key);
      }
      // A market reduction requires cancelling the departing parent's exits first. An exchange refusal or an
      // uncertain partial fill would leave that exact parent exposed, so keep its original orders until a native
      // fill or external reconciliation proves its exit. Do not attribute its quantity to a surviving parent.
      for (const key of drainUnknown) {
        laneBusy.add(key);
        status.skipped.push({ sym: key.split("|")[0], why: "native lane ownership unavailable; existing orders retained for reconciliation" });
      }
      for (const target of targets) {
        const ids = parents.get(target.key) ?? new Set<string>();
        const owned = [...ids].reduce((sum, id) => {
          const qty = Math.max(0, laneMap[id]?.qty ?? 0);
          laneRequestedQty.set(id, qty);
          return sum + qty;
        }, 0);
        const observed = Math.min(held.get(target.key) ?? 0, ledger.get(target.key) ?? 0);
        if ((tracked.get(target.key) ?? 0) > observed + 1e-9) laneBusy.add(target.key);
        target.qty = bx.snapQtyDown(Math.min(owned, observed), specs.get(target.sym) ?? null);
        target.notional = target.qty * (prices.get(target.sym) ?? 0);
      }
    }
    if (laneMode && !drainingLaneOrders) {
      // Conditional partial exits belong to the exact held parent. Its remaining share may shrink further,
      // but a stale paper request cannot repurchase the already exited quantity or hand it to a sibling.
      for (const target of targets) {
        const parents = new Map<string, number>();
        for (const l of liveLanes) {
          if (`${l.sym}|${l.side}` !== target.key || !l.id) continue;
          const id = l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side });
          parents.set(id, (parents.get(id) ?? 0) + (l.laneUnits ?? 1));
        }
        const total = [...parents.values()].reduce((sum, x) => sum + x, 0);
        if (!(total > 0)) continue;
        const qty = [...parents].reduce((sum, [id, w]) => {
          const part = Math.min(target.qty * w / total, laneCaps[id] ?? Infinity);
          laneRequestedQty.set(id, part);
          return sum + part;
        }, 0);
        if (![...parents.keys()].some((id) => laneCaps[id] !== undefined)) continue;
        const spec = specs.get(target.sym) ?? null;
        target.qty = bx.snapQtyDown(qty, spec);
        target.notional = target.qty * (prices.get(target.sym) ?? 0);
      }
    }
    const plan = planControl({
      targets,
      held,
      foreign,
      rebalancePct: s.rebalancePct ?? 0.25,
      // a minimum-size position does not follow its lanes: only the rebalance band resizes it (the venue minimum
      // drifting with the price asked for a held one-lot "increase" on every lane change — PARTI on x02)
      // ("min" and "risk": a position's size does not follow its lane count — a lane joining or leaving forces no resize)
      sizedVol: (s.positionSize === "min" || s.positionSize === "risk") && !laneMode ? undefined : Lm.sizedVol,
      bookParts,
      keep,
      lots: new Map([...specs].map(([sym, spec]) => [sym, spec.step] as const)),
    });
    // one index for the whole step: the stop repair and the backstop re-price each looked a target up with a linear
    // scan per held key (O(held × targets) — hundreds × hundreds since the caps came off)
    const targetOf = new Map(plan.targets.map((t) => [t.key, t] as const));
    budgetQty = new Map(held);
    for (const key of new Set([...lagging, ...pendingKeys]))
      if (!isForeign(foreign, key)) budgetQty.set(key, Math.max(budgetQty.get(key) ?? 0, ledger.get(key) ?? 0));
    budgetStops = new Map();
    // Historical order rows can be large; only unresolved entries participate in each growth recheck.
    budgetPending = new Map([...controlRows(rt)].filter(([, row]) =>
      (row.kind === "O" || row.kind === "I") && pendingOf(row.msg)));
    const rowsByUpper = new Map([...controlRows(rt)].map(([id, row]) => [id.toUpperCase(), row]));
    for (const order of book.orders) {
      if (!isBackstopKind(ownCoidKind(order.clientOrderId, s.connId))) continue;
      const row = rowsByUpper.get((order.clientOrderId ?? "").toUpperCase());
      // openOrders can also contain an unfilled MARKET entry. Its reference price is never stop protection.
      if (!row || row.kind !== "S" || row.status !== "ok" ||
        (order.type && !/STOP|TRAIL/i.test(order.type))) continue;
      const old = budgetStops.get(row.k);
      const side = Number(row.k.split("|")[1]);
      // Multiple resting stops: retain the wider price; an unpriced order is not invented protection.
      budgetStops.set(row.k, row.px && row.px > 0
        ? old && old > 0 ? side > 0 ? Math.min(old, row.px) : Math.max(old, row.px) : row.px
        : null);
    }
    const heldLaneRisk = new Map<string, number>();
    for (const lane of lanesOwn) {
      const key = `${lane.sym}|${lane.side}`;
      // A candidate with a narrow stop must never dilute the quantity already held by a wider independent set.
      heldLaneRisk.set(key, Math.max(heldLaneRisk.get(key) ?? 0, lane.risk ?? lane.sl));
    }
    const budgetUse = (key: string, qty: number, planned: boolean) => {
      const [sym, sd] = key.split("|");
      const px = prices.get(sym) ?? 0;
      const target = targetOf.get(key);
      const stop = budgetStops?.get(key);
      const stopDist = stop && stop > 0 && px > 0 ? Math.max(0, Number(sd) * (px - stop) / px) : null;
      const worst = planned ? target?.stopDist ?? stopDist : stopDist;
      const laneRisk = planned ? target?.riskDist ?? target?.stopDist ?? null : heldLaneRisk.get(key) ?? stopDist;
      const risk = laneRisk === null || worst === null ? null : Math.min(laneRisk, worst);
      const notional = px > 0 && Number.isFinite(px) ? qty * px : null;
      return {
        notional,
        risk: notional !== null && risk !== null ? notional * risk : null,
        worst: notional !== null && worst !== null ? notional * worst : null,
      };
    };
    const checkAccountGrowth = (key: string, qty: number) => {
      if (!(maxExposureX > 0 || (s.maxRiskPct ?? 0) > 0 || (s.maxBackstopLossPct ?? 0) > 0)) return;
      const used = [...budgetQty!].filter(([, q]) => q > 0).map(([k, q]) => budgetUse(k, q, false));
      for (const row of budgetPending!.values()) {
        const pending = pendingOf(row.msg);
        if (!pending) continue;
        const q = pending.unresolved || pending.wasFlat ? pending.sentQty : Math.max(0, pending.sentQty - row.qty);
        if (q > 0) used.push(budgetUse(row.k, q, true));
      }
      const why = accountGrowthBlock(used, budgetUse(key, qty, true), balanceNow, {
        maxExposureX, maxRiskPct: s.maxRiskPct, maxBackstopLossPct: s.maxBackstopLossPct,
      });
      if (why) throw holdOn(why);
    };
    status.enabled = true;
    status.reason =
      (openBlock ? `armed — opening blocked: ${openBlock}` : "armed (overall control orders)") +
      (ratioHint ? ` · ${ratioHint}` : "");
    // (the keys skipped before the plan — own quantity or ownership unverified — stay listed)
    status.skipped = [...status.skipped, ...skipped, ...plan.skipped];
    const unchanged =
      !reconnected &&
      !!prev &&
      prev.targetsHash === plan.hashes.targets &&
      prev.bookHash === plan.hashes.book &&
      plan.actions.length === 0;
    const control: ControlStatus = {
      at: Date.now(),
      connHash,
      targetsHash: plan.hashes.targets,
      bookHash: plan.hashes.book,
      planHash: plan.hashes.plan,
      reconnected,
      unchanged,
      steps: (prev?.steps ?? 0) + 1,
      changes: (prev?.changes ?? 0) + (unchanged ? 0 : 1),
      targets: plan.targets,
      // (a held-unknown key counts as held: once the read shows it flat after the window, it is an external close)
      held: [
        ...[...held.entries()].map(([key, qty]) => ({ key, qty })),
        ...[...lagging]
          .filter((k) => !held.has(k) && !isForeign(foreign, k))
          .map((key) => ({ key, qty: ledger.get(key) ?? 0 })),
      ],
      exchangeSlots: [...heldNow],
      actions: [],
      laneCounts: laneCountsByKey(lanes),
      foreignQty: foreignNow,
      ...(foreignFrozen.size ? { foreignQtyFrozen: [...foreignFrozen] } : {}),
      ...(foreignUnknown.size ? { foreignQtyUnknown: [...foreignUnknown] } : {}),
      keys: keyFunnel(funnel, plan.targets, skipped, { sizeMin: s.positionSize === "min" && !laneMode }),
      ...(ordersStale ? {} : { protect: protectOf(book, held, targetOf, s.connId, posOneway, laneMode) }),
      ...(notSent ? { notSent } : {}),
      ...(inactiveSignal ? { inactiveSignal } : {}),
      suppressed: Object.keys(suppressed).length,
      ...(chased ? { chased } : {}),
    };
    status.control = control;

    // account modes: position mode once per connection + mode; margin mode once per symbol. A mode the exchange
    // refuses blocks opening (closing stays possible) — never trade in a mode other than the configured one.
    const posMode = s.positionMode ?? "hedge";
    const marginMode = s.marginMode ?? "cross";
    const oneway = posMode === "oneway";
    const modes = rt.db.kvGet<{
      key: string;
      margin: Record<string, string>;
      lev?: Record<string, string>;
    }>("liveModes") ?? {
      key: "",
      margin: {},
    };
    modes.lev ??= {};
    let modeError: string | null = null;
    const modeKey = `${connHash}|${posMode}`;
    // a refused mode change (e.g. while positions are open) is retried with backoff, not every tick
    const modeWait = `${connHash}|mode`;
    if (modes.key !== modeKey) {
      modeError = waiting(modeWait);
      if (!modeError) {
        try {
          await ex.setPositionMode?.(posMode);
          modes.key = modeKey;
          modes.margin = {};
          modes.lev = {};
          cleared(modeWait);
        } catch (err) {
          const msg = errText(err);
          if (alreadySet(msg)) {
            modes.key = modeKey;
            modes.margin = {};
            modes.lev = {};
            cleared(modeWait);
          } else {
            modeError = `position mode ${posMode} not applied: ${msg}`;
            failed(modeWait, modeError, ...OPEN_BACKOFF);
            rt.db.event("error", `live: ${modeError}`);
          }
        }
        rt.db.kvSet("liveModes", modes);
      }
    }
    if (modeError) status.reason = `armed — opening blocked: ${modeError}${ratioHint ? ` · ${ratioHint}` : ""}`;
    const ensureMargin = async (sym: string) => {
      if (modes.margin[sym] === marginMode) return;
      const k = `${connHash}|margin|${sym}`;
      const w = waiting(k);
      if (w) throw holdOn(w);
      try {
        await ex.setMarginMode?.(sym, marginMode);
      } catch (err) {
        if (err instanceof bx.RequestBudgetDeferred) throw err;
        const msg = errText(err);
        if (!alreadySet(msg)) {
          const offline = /offline currently|not a valid/i.test(msg);
          const m = offline
            ? `${sym} is offline — not opening`
            : `margin mode ${marginMode} not applied: ${msg}`;
          failed(k, m, ...(offline ? ([30 * 60_000, 6 * 60 * 60_000] as const) : OPEN_BACKOFF));
          if (offline) rt.db.event("warn", `live: ${m}`);
          throw offline ? holdOn(m) : new Error(m);
        }
      }
      cleared(k);
      modes.margin[sym] = marginMode;
      rt.db.kvSet("liveModes", modes);
    };
    // a symbol holding someone else's quantity: its margin mode is read once (never set — that would move
    // their margin) and remembered when it is the configured one; another mode, or a read that fails, holds the open
    // (a failed read is retried after a backoff)
    const verifyMargin = async (sym: string) => {
      if (modes.margin[sym] === marginMode) return;
      const k = `${connHash}|marginread|${sym}`;
      const w = waiting(k);
      if (w) throw holdOn(`margin mode unverified on ${sym}, which holds someone else's quantity: ${w}`);
      let m: "cross" | "isolated" | null = null;
      try {
        m = (await ex.marginMode?.(sym)) ?? null;
      } catch (err) {
        failed(k, errText(err), ...OPEN_BACKOFF);
        throw holdOn(`margin mode unverified on ${sym}, which holds someone else's quantity: ${errText(err)}`);
      }
      if (m !== marginMode) {
        failed(k, `${m ?? "unknown"} in force, ${marginMode} configured`, ...OPEN_BACKOFF);
        throw holdOn(`margin mode ${m ?? "unknown"} on ${sym}, which holds someone else's quantity — not changed, not opening`);
      }
      cleared(k);
      modes.margin[sym] = marginMode;
      rt.db.kvSet("liveModes", modes);
    };
    // leverage once per symbol (and setting): "max" = each side's exchange maximum, so a position at the minimum
    // quantity ties up the least margin. Set before the first open; a refusal blocks opening only.
    const levSetting = s.leverage ?? "max";
    const ensureLeverage = async (sym: string, ourSide: 1 | -1) => {
      if (!ex.leverage || !ex.setLeverage) return;
      // hedge mode: a side another system holds (or has orders on) is never touched — not even its leverage, which
      // would change that position's margin. Only our side is set then, and remembered per side.
      const otherSide = (-ourSide) as 1 | -1;
      const otherForeign =
        !oneway && (foreign.has(`${sym}|${otherSide}`) || foreignQty.has(`${sym}|${otherSide}`));
      const ourPs = ourSide === 1 ? "LONG" : "SHORT";
      // isolated margin: the margin is all a position can lose, so its liquidation sits about 1 / leverage away —
      // at an exchange maximum (50–125×) well inside the protective stop (up to 20 %). Capped so liquidation stays
      // behind the widest stop; cross margin backs a position with the whole account.
      const isoCap = marginMode === "isolated" ? ISOLATED_MAX_LEVERAGE : Infinity;
      const want = `${levSetting}${isoCap < Infinity ? `|iso${isoCap}` : ""}`;
      if (modes.lev?.[sym] === want) return;
      const levKey = otherForeign ? `${sym}|${ourPs}` : sym;
      if (modes.lev?.[levKey] === want) return;
      const k = `${connHash}|leverage|${sym}`;
      const w = waiting(k);
      if (w) throw holdOn(w);
      try {
        const info = await ex.leverage(sym);
        if (!info) throw new Error("no leverage info");
        const target = (max: number) =>
          Math.min(isoCap, levSetting === "max" ? max : Math.min(max, Math.max(1, levSetting)));
        const sides: Array<["LONG" | "SHORT" | "BOTH", number, number]> = oneway
          ? [["BOTH", info.long, Math.min(info.maxLong, info.maxShort)]]
          : ([
              ["LONG", info.long, info.maxLong],
              ["SHORT", info.short, info.maxShort],
            ] as Array<["LONG" | "SHORT" | "BOTH", number, number]>).filter(([ps]) => !otherForeign || ps === ourPs);
        for (const [side, cur, max] of sides) {
          const lev = target(max);
          if (cur !== lev)
            try {
              await ex.setLeverage(sym, side, lev);
            } catch (err) {
              if (!alreadySet(errText(err))) throw err;
            }
          local(rt).levVal.set(`${sym}|${side}`, lev);
        }
      } catch (err) {
        if (err instanceof bx.RequestBudgetDeferred) throw err;
        const m = `leverage ${want} not applied on ${sym}: ${errText(err)}`;
        failed(k, m, ...OPEN_BACKOFF);
        throw new Error(m);
      }
      cleared(k);
      modes.lev![levKey] = want;
      rt.db.kvSet("liveModes", modes);
    };
    // the leverage in force on a side (set this process, else read once); unknown → 1 (the margin is the notional)
    const levOf = async (sym: string, side: 1 | -1): Promise<number> => {
      const ps = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
      const L = local(rt).levVal;
      const hit = L.get(`${sym}|${ps}`);
      if (hit) return hit;
      try {
        const info = ex.leverage ? await ex.leverage(sym) : null;
        const v = info ? (ps === "BOTH" ? info.long : ps === "LONG" ? info.long : info.short) : 0;
        if (v > 0) {
          L.set(`${sym}|${ps}`, v);
          return v;
        }
      } catch {
        /* unknown: counted at 1× */
      }
      return 1;
    };

    // A flat snapshot alone does not prove an orphan is ours to cancel or that its execution was zero. A confirmed
    // native parent close, or a journaled own-first reduction exhausting a side beside physical foreign quantity,
    // may retire its exact old position exits, with a durable cancel receipt.
    const outsideExhausted = foreignExhaustionProof(controlRows(rt).values());
    for (const o of ordersStale ? [] : book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId) || !o.id) continue;
      // the fresh stop of a position the read does not show yet: not left behind
      const onLagging = ([1, -1] as const).some(
        (sd) =>
          lagging.has(`${o.venueSymbol}|${sd}`) &&
          (noSideOf(o.positionSide) || (o.positionSide === "LONG") === (sd === 1)),
      );
      if (onLagging) continue;
      // a one-way order (BOTH) belongs to the symbol's one net position, whichever side it is on: it is not flat
      const flat = !book.positions.some(
        (p) =>
          p.venueSymbol === o.venueSymbol &&
          (noSideOf(o.positionSide) || (p.side === "long") === (o.positionSide === "LONG")),
      );
      const ownGone =
        !oneway && !!o.positionSide && ledger.get(`${o.venueSymbol}|${o.positionSide === "LONG" ? 1 : -1}`) === 0;
      const key = keyOfOwn(o, book);
      const closedParent = key && Object.values(laneMap).some((lo) => lo.key === key && lo.closed && !(lo.qty > 0)) &&
        !Object.values(laneMap).some((lo) => lo.key === key && lo.qty > 0);
      // H is a conservative ownership policy, not proof of a particular venue fill. Only use it while a fresh
      // physical foreign side remains, the own ledger is exactly zero, and no pending entry/native identity
      // could still own quantity. An order after H belongs to a newer or unresolved episode and is not touched.
      const proofAt = key ? outsideExhausted.get(key) : undefined;
      const [sym, sd] = (key ?? "|").split("|");
      const ps = sd === "1" ? "LONG" : sd === "-1" ? "SHORT" : "";
      const row = ctlByUpper().get((o.clientOrderId ?? "").toUpperCase());
      const ownOnSide = key && book.orders.some((x) => {
        if (x.venueSymbol !== sym || !isOwnCoid(x.clientOrderId, s.connId)) return false;
        const kind = ownCoidKind(x.clientOrderId, s.connId), side = String(x.positionSide ?? "").toUpperCase();
        return kind !== "S" && kind !== "T" && (side === ps || !side || side === "BOTH");
      });
      const nativeOnSide = key && Object.values(laneMap).some((lo) => lo.key === key && (lo.qty > 0 || lo.s || lo.t));
      const exhausted = !oneway && !!key && !!ps && proofAt !== undefined && row && row.at < proofAt &&
        String(o.positionSide ?? "").toUpperCase() === ps && (ledger.get(key) ?? NaN) === 0 &&
        book.positions.some((p) => p.venueSymbol === sym && p.qty > 0 && (p.side === "long") === (sd === "1")) &&
        !pendingKeys.has(key) && !unverifiedOwnership.has(key) && !ownOnSide && !nativeOnSide;
      if (key && ((closedParent && (flat || ownGone)) || exhausted)) await cancelPositionExit(o, key);
    }

    // ── a position's close orders: its stop (kind S, any own order but a take-profit) and its take-profit (kind T)
    const isStopOrder = (coid: string | undefined) => isBackstopKind(ownCoidKind(coid, s.connId));
    // the stop distance the exchange leaves the position: never past its liquidation price (a stop out there never
    // fires — the position is liquidated first, and pays the liquidation fee); LIQ_STOP_SHARE of the way at most.
    // Unknown liquidation (cross margin on a large account reports none, or far away): the distance as it is.
    // A merged position's liquidation is the whole position's (someone else's quantity and margin in it): it never moves
    // the own stop (PUMP, 14 Oct: the backstop re-priced to 0.34 % from a merged manual short's liquidation) — one event
    // per key and size says so.
    const allowedStopDist = (key: string, px: number, dist: number) => {
      dist = Math.min(dist, targetOf.get(key)?.stopMax ?? Infinity);
      const [lsym, lsd] = key.split("|");
      const side = Number(lsd) === 1 ? 1 : -1;
      const pos = book.positions.find((x) => x.venueSymbol === lsym && (x.side === "long") === (side === 1));
      const liq = pos?.liq ?? 0;
      if (!(liq > 0) || !(px > 0)) return dist;
      const own = held.get(key) ?? 0;
      if ((pos?.qty ?? 0) > own * 1.05 + 1e-9) {
        const room = (side * (px - liq)) / px;
        const mk = `merged-liq|${key}|${pos?.qty}`;
        const W = local(rt).warnedExcess;
        if (room > 0 && room * LIQ_STOP_SHARE < dist && !W.has(mk)) {
          W.add(mk);
          if (W.size > 500) W.clear();
          rt.db.event(
            "warn",
            `live: ${key} — the merged position's liquidation ${liq} lies inside the own stop distance ${(dist * 100).toFixed(2)} % (${pos?.qty} on the exchange, ${own} ours): the own stop is not moved for it`,
          );
        }
        return dist;
      }
      const room = (side * (px - liq)) / px;
      return room > 0 ? Math.min(dist, room * LIQ_STOP_SHARE) : dist;
    };
    // the take-profit's price: beyond the farthest lane target (tpDistFor), on the far side of the price — priced like
    // a stop of the other direction (snapped away from the mark, with the venue's clearance). null: nothing to place
    // (the price is at or past that target: every lane is taking its profit now)
    const tpWantOf = (sym: string, side: 1 | -1, tpPx: number, px: number, atLeast = 0) => {
      const spec = specs.get(sym) ?? null;
      const learned = venueMins(rt).get(sym)?.stop ?? 0;
      const d = tpDistFor(side, tpPx, px, Math.max(s.minStopPct ?? 0.01, learned, atLeast));
      const p = d > 0 ? bx.stopPxExchange(px, side === 1 ? -1 : 1, d, spec, learned) : 0;
      return p > 0 ? { px: p, dist: d } : null;
    };
    // places a position's take-profit (bounded to the own quantity in hedge mode, like its stop). A refusal for being too close is widened once;
    // any other refusal waits for the upkeep's next try. Never a reason to close anything: the stop protects the
    // position, the take-profit only takes its profit when the desk cannot. Returns the price placed, else 0.
    const setTp = async (
      a: { key: string; sym: string; side: 1 | -1 },
      qty: number,
      px: number,
      tpPx: number,
      why: string,
    ): Promise<number> => {
      let w = tpWantOf(a.sym, a.side, tpPx, px);
      if (!w || !(qty > 0)) return 0;
      const send = (c: string, p: number) =>
        ex.order({
          symbol: a.sym,
          side: a.side === 1 ? "SELL" : "BUY",
          positionSide: oneway ? "BOTH" : a.side === 1 ? "LONG" : "SHORT",
          type: "TAKE_PROFIT_MARKET",
          // the own quantity (BingX requires it with closePosition too, in one-way mode)
          quantity: qty,
          stopPrice: p,
          ...cpOf(),
          workingType: "MARK_PRICE",
          clientOrderID: c,
        });
      let tc = makeCoid(s.connId, "T");
      // pending first: a reply that times out may still have placed it (its row then carries its price)
      record(tc, a, "T", qty, w.px, "pending", why);
      try {
        try {
          await send(tc, w.px);
        } catch (err) {
          const msg = errText(err);
          if (!(err instanceof bx.ExchangeRejected) || !bx.stopTooClose(msg)) throw err;
          record(tc, a, "T", qty, w.px, "error", msg);
          const spec = specs.get(a.sym) ?? null;
          w = tpWantOf(a.sym, a.side, tpPx, px, Math.max(w.dist * 1.5, bx.minStopDist(px, spec) * 2));
          if (!w) throw err;
          tc = makeCoid(s.connId, "T");
          record(tc, a, "T", qty, w.px, "pending", `${why} (widened)`);
          await send(tc, w.px);
        }
        record(tc, a, "T", qty, w.px, "ok", why);
        return w.px;
      } catch (err) {
        const msg = errText(err);
        if (err instanceof bx.ExchangeRejected) record(tc, a, "T", qty, w.px, "error", msg);
        bx.noteRateLimit(msg);
        rt.db.event("warn", `control ${a.key}: take-profit ${w.px} not placed (${why}): ${msg}`);
        return 0;
      }
    };

    // keys the repair closed this step: the plan built before it no longer applies to them
    const repairClosed = new Set<string>();
    // repair: every own position must carry its protective stop (e.g. a fill whose reply timed out before the stop)
    // (a close waiting after a failure does not count: the position stays open meanwhile and needs its stop)
    const closing = new Set(
      plan.actions
        .filter((a) => a.kind === "close" && !waiting(`${connHash}|exit|${a.key}`))
        .map((a) => a.key),
    );
    // (open orders of an earlier read do not show the stops placed since: no repair until they are read again)
    for (const [key, qty] of ordersStale ? [] : held) {
      if (!alive()) break;
      if (laneBusy.has(key) || closing.has(key) || orphanBlocked(key)) continue;
      // a key of a frozen symbol (one-way, merged with someone else's quantity): no stop is placed on it (planControl
      // skips the same key for its orders)
      if (isForeign(foreign, key)) continue;
      const [sym, sd] = key.split("|");
      const side = (Number(sd) === 1 ? 1 : -1) as 1 | -1;
      const positionSide = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
      // (a take-profit resting there is not its stop)
      if (
        book.orders.some(
          (o) =>
            o.venueSymbol === sym &&
            isStopOrder(o.clientOrderId) &&
            (oneway || !o.positionSide || o.positionSide === positionSide),
        )
      )
        continue;
      const px = prices.get(sym) ?? 0;
      const spec = specs.get(sym) ?? null;
      const target = targetOf.get(key);
      // A retained residual may have no active paper target after an outside reduction. Its last journaled
      // stop is the only known parent level; a generic fallback would silently widen that protection.
      const priorStop = target ? null : stopPxOf(key);
      const a = { key, sym, side };
      const repairKey = `${connHash}|repair|${key}`;
      if (waiting(repairKey)) continue;
      // a stop priced from a stale ticker can land on the wrong side of the mark: refused, and the fallback
      // below would close the position at market. Wait for fresh prices (the next step retries). No price at all
      // (the symbol is missing from the tickers) waits the same way: a missing price is never a reason to close.
      if (!(px > 0) || !pricesFresh) {
        status.skipped.push({ sym, why: px > 0 ? "stop repair waits for fresh prices" : "stop repair waits for a price" });
        continue;
      }
      if (!target && !(priorStop !== null && Number.isFinite(priorStop) && priorStop > 0)) {
        status.skipped.push({ sym, why: "prior stop level unavailable — residual protection requires reconciliation" });
        continue;
      }
      const requestedDist = priorStop !== null ? side * (px - priorStop) / px : (target?.stopDist ?? 0.05);
      const dist = allowedStopDist(key, px, requestedDist);
      if (priorStop !== null && (!(requestedDist > 0) || requestedDist + 1e-12 < bx.minStopDist(px, spec, venueMins(rt).get(sym)?.stop ?? 0) ||
        dist + 1e-12 < requestedDist)) {
        status.skipped.push({ sym, why: "prior stop level cannot be restored at the current price or venue limit — reconciliation required" });
        continue;
      }
      if (priorStop !== null && !spec) {
        status.skipped.push({ sym, why: "venue quantity step unavailable — prior stop requires reconciliation" });
        continue;
      }
      let stopQty = priorStop !== null ? bx.snapQtyDown(qty, spec) : qty;
      // The generic snap tolerates floating point noise near a step; never use that tolerance to place a
      // materially larger exit than the residual own quantity on a mixed side.
      const qtyUlps = Number.EPSILON * 8 * Math.max(1, Math.abs(qty));
      if (priorStop !== null && spec && stopQty > qty + qtyUlps)
        stopQty = bx.snapQtyDown(Math.max(0, qty - spec.step * 1e-6), spec);
      if (priorStop !== null && stopQty > qty + qtyUlps) {
        status.skipped.push({ sym, why: "venue step cannot bound the residual quantity — prior stop requires reconciliation" });
        continue;
      }
      if (!(stopQty > 0)) {
        status.skipped.push({ sym, why: "residual quantity is below the venue step — prior stop requires reconciliation" });
        continue;
      }
      const sc = makeCoid(s.connId, "S");
      let attemptedStop = sc;
      try {
        let stopPrice = priorStop ?? bx.stopPxExchange(px, side, dist, spec, venueMins(rt).get(sym)?.stop ?? 0, target?.stopMax ?? Infinity);
        if (!(stopQty > 0) || !(stopPrice > 0)) throw new Error("stop needs a quantity and a price");
        const placeRepair = (c: string, sp: number) => {
          record(c, a, "S", stopQty, sp, "pending", "repair");
          return ex.order({
            symbol: sym,
            side: side === 1 ? "SELL" : "BUY",
            positionSide,
            type: "STOP_MARKET",
            quantity: stopQty,
            stopPrice: sp,
            ...cpOf(),
            workingType: "MARK_PRICE",
            clientOrderID: c,
          });
        };
        try {
          await placeRepair(attemptedStop, stopPrice);
        } catch (err) {
          if (!executionContextCurrent()) return status;
          // too close to the mark: widen once. The fallback below closes the position, so a retry here is the
          // difference between a protected position and a closed one.
          const msg = err instanceof Error ? err.message : String(err);
          if (!(err instanceof bx.ExchangeRejected) || !bx.stopTooClose(msg)) throw err;
          if (priorStop !== null) {
            record(attemptedStop, a, "S", stopQty, stopPrice, "error", msg);
            failed(repairKey, "prior stop level refused", ...EXIT_BACKOFF);
            status.skipped.push({ sym, why: "venue refused the prior stop level — residual protection requires reconciliation" });
            continue;
          }
          const wider = bx.widenStopDist(dist, px, spec);
          learnVenueMin(rt, sym, "stop", wider);
          record(attemptedStop, a, "S", stopQty, stopPrice, "error", msg);
          stopPrice = bx.stopPxExchange(px, side, wider, spec, wider, targetOf.get(key)?.stopMax ?? Infinity);
          attemptedStop = makeCoid(s.connId, "S");
          await placeRepair(attemptedStop, stopPrice);
        }
        if (!executionContextCurrent()) return status;
        record(attemptedStop, a, "S", stopQty, stopPrice, "ok", "repair");
        cleared(repairKey);
        rt.db.event("warn", `control ${key}: protective stop was missing — re-placed`);
      } catch (err) {
        if (!executionContextCurrent()) return status;
        if (rt.db.lastJournalError) throw err;
        const unknownStop = uncertainSubmitted.has(key);
        // The pre-dispatch pending row contains the actual requested level. Keep that evidence when the
        // acknowledgement is ambiguous; no row or invalid price remains explicitly unknown (0).
        const requested = controlRows(rt).get(attemptedStop)?.px;
        const knownPrice = unknownStop && typeof requested === "number" && Number.isFinite(requested) && requested > 0 ? requested : 0;
        record(attemptedStop, a, "S", stopQty, knownPrice, unknownStop ? "pending" : "error", "repair");
        if (unknownStop) {
          status.skipped.push({ sym, why: "stop repair outcome unknown — holding the existing parent until reconciled" });
          failed(repairKey, "stop repair outcome unknown", ...EXIT_BACKOFF);
          continue; // the original stop may be resting; neither duplicate it nor speculate a market close
        }
        if (priorStop !== null) {
          failed(repairKey, errText(err), ...EXIT_BACKOFF);
          status.skipped.push({ sym, why: "prior stop level not restored — residual protection requires reconciliation" });
          continue;
        }

        // lane orders: the lanes' own stops rest on the side — the position is protected without its backstop, so a
        // backstop the venue refuses is retried after a backoff, never answered by closing the position
        const laneStops = book.orders.some(
          (o) =>
            o.venueSymbol === sym &&
            ownCoidKind(o.clientOrderId, s.connId) === "V" &&
            (oneway || !o.positionSide || o.positionSide === positionSide),
        );
        if (laneMode && laneStops) {
          failed(repairKey, errText(err), 30_000, 10 * 60_000);
          rt.db.event(
            "warn",
            `control ${key}: backstop not placed (${errText(err)}) — its lanes' own stops protect it; retried later`,
          );
          continue;
        }
        if (pendingKeys.has(key)) {
          // A pending entry could add more after a close; a pending close could execute twice if resubmitted.
          // Cancel its remainder and wait for its cumulative execution before deciding what quantity remains.
          await cancelPendingRemainder(key);
          failed(repairKey, "execution pending after stop repair failed", ...EXIT_BACKOFF);
          rt.db.event("error", `control ${key}: UNPROTECTED — stop repair failed; pending execution is cancelled / rechecked before another close`);
          continue;
        }
        const cc = makeCoid(s.connId, "C");
        try {
          record(cc, a, "X", 0, px, "pending", PENDING_EXECUTION + JSON.stringify({ oid: "", sentQty: qty, positionSeen: true }));
          const reply = await ex.order({
            symbol: sym,
            side: side === 1 ? "SELL" : "BUY",
            positionSide,
            type: "MARKET",
            quantity: qty,
            clientOrderID: cc,
            ...(oneway ? { reduceOnly: "true" } : {}),
          });
          if (!executionContextCurrent()) return status;
          const result = protectiveCloseResult(cc, a, qty, px, reply, "protective close (stop repair failed)", true);
          if (result.full) held.delete(key);
          else held.set(key, Math.max(0, qty - result.got));
          repairClosed.add(key);
          if (!result.full) throw new Error(`protective close incomplete: ${result.got} of ${qty} executed`);
          // the lanes would reopen it next tick: opening on this key waits (the stop may keep failing)
          failed(`${connHash}|open|${key}`, `stop repair failed: ${errText(err)}`, ...OPEN_BACKOFF);
          cleared(repairKey);
        } catch (e2) {
          if (!executionContextCurrent()) return status;
          if (e2 instanceof bx.ExchangeRejected)
            record(cc, a, "X", 0, px, "error", errText(e2));
          failed(repairKey, errText(e2), ...EXIT_BACKOFF);
          rt.db.event(
            "error",
            `control ${key}: UNPROTECTED — stop repair and close failed: ${e2 instanceof Error ? e2.message : e2} (${err instanceof Error ? err.message : err})`,
          );
        }
      }
    }

    // backstop re-pricing: the stop placed at the open (or by the repair) follows the lanes' widest stop (the target's
    // stopDist). Without it, lanes that join with wider stops sat behind the older, tighter backstop, which filled
    // first (AT-USDT), and the risk guards priced the position at a stop distance it did not carry. A resting stop
    // tighter than the target by more than RESTOP_INSIDE of its distance, or wider by more than RESTOP_BEYOND, is
    // replaced: the off stops are cancelled first and the new one placed right after (BingX keeps one close-position
    // stop per position side: placed first, the new stop was refused every time — "Position SL order already
    // exists" — and x01 sat on stale stops); a new stop the exchange refuses is replaced by one at the old price at
    // once (and the stop repair above covers the next step should that fail too), then retried after a backoff.
    // (open orders of an earlier read do not show the stops placed since; stale prices could misplace the stop)
    for (const [key, qty] of ordersStale || !pricesFresh || noSpecs ? [] : held) {
      if (!alive()) break;
      if (laneBusy.has(key) || closing.has(key) || repairClosed.has(key) || orphanBlocked(key)) continue;
      if (frozenParents.has(key) && !continuingClose.has(key)) continue;
      // a key of a frozen symbol: its stop is not re-priced (no closePosition order on someone else's quantity)
      if (isForeign(foreign, key)) continue;
      const t = targetOf.get(key);
      const sym = key.split("|")[0];
      const px = prices.get(sym) ?? 0;
      if (!t || !(px > 0) || !(qty > 0)) continue;
      const side = t.side;
      const positionSide = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
      const spec = specs.get(sym) ?? null;
      const stopDist = allowedStopDist(key, px, t.stopDist);
      const want = bx.stopPxExchange(px, side, stopDist, spec, venueMins(rt).get(sym)?.stop ?? 0, t.stopMax ?? Infinity);
      const dist = Math.abs(px - want);
      if (!(want > 0) || !(dist > 0)) continue;
      const stops = book.orders
        .filter(
          (o) =>
            o.id &&
            o.venueSymbol === sym &&
            isStopOrder(o.clientOrderId) &&
            (oneway || !o.positionSide || o.positionSide === positionSide),
        )
        .map((o) => ({ id: o.id!, sp: ctlByUpper().get((o.clientOrderId ?? "").toUpperCase())?.px ?? 0 }));
      // none: the repair above places it; a stop of unknown price (no ledger row): left as it is, never guessed
      if (!stops.length || stops.some((x) => !(x.sp > 0))) continue;
      // at the 20 % cap the target is measured from the current price, not from the lanes' stops: it moves with the
      // price, so an outward re-price there follows the price away from the position (x02, 7 Oct, DRIFT short:
      // 0.02363 → 0.0264 as the price rose) — a backstop at the cap is never moved outward
      const atCap = t.stopDist >= BACKSTOP_MAX_DIST - 1e-9;
      const fits = (sp: number) => {
        const d = side * (sp - want); // > 0: tighter than the target
        // tighter than wanted: kept while it lies beyond every lane's own stop (t.stopPx) — the price moving toward
        // it (the 1 % floor, the 20 % cap measured from the price) never loosens a stop; only a lane whose stop lies
        // beyond it does (x02, 7 Oct: AIN's and a trailed position's stops were moved away from a falling price),
        // and not at the cap
        if (d > RESTOP_INSIDE * dist && !atCap && !(t.stopPx !== undefined && side * (sp - t.stopPx) <= 0)) return false;
        return -d <= RESTOP_BEYOND * dist;
      };
      const off = stops.filter((x) => !fits(x.sp));
      if (!off.length) continue;
      if (!stops.some((x) => fits(x.sp))) {
        const reKey = `${connHash}|restop|${key}`;
        const Lr = local(rt).restopAt;
        if (waiting(reKey) || Date.now() - (Lr.get(key) ?? 0) < RESTOP_MIN_MS) continue;
        Lr.set(key, Date.now());
        if (Lr.size > 2_000) Lr.clear();
        const a = { key, sym, side };
        const sc = makeCoid(s.connId, "S");
        const from = off.map((x) => x.sp).join(", ");
        const place = async (coid: string, stopPrice: number) =>
          ex.order({
            symbol: sym,
            side: side === 1 ? "SELL" : "BUY",
            positionSide,
            type: "STOP_MARKET",
            quantity: qty,
            stopPrice,
            ...cpOf(),
            workingType: "MARK_PRICE",
            clientOrderID: coid,
          });
        // the old stops go first (one close-position stop per side on the exchange)
        let gone = 0;
        for (const x of off) {
          if (!alive()) break;
          if (await ex.cancel(sym, x.id)) {
            status.cancelled++;
            gone++;
          }
        }
        if (orphanBlocked(key)) {
          status.skipped.push({ sym, why: "backstop cancellation awaits exact zero-fill confirmation before replacement" });
          continue;
        }
        if (!gone) {
          // no cancel said it went through — but a reply that failed or timed out may still have cancelled it: the
          // side would sit bare until the next step's repair. The orders are read now; only a stop still resting
          // there keeps the re-price for later.
          const fresh = await ex.book({ notBefore: Date.now(), maxAgeMs: 0 });
          if (fresh.orders.some((o) => off.some((x) => x.id === o.id))) continue;
          rt.db.event("warn", `control ${key}: the old backstop is gone although its cancel did not confirm — placing the new one`);
        }
        // pending first: a reply that times out may still have placed it (its row then carries its price)
        record(sc, a, "S", qty, want, "pending", "re-price");
        try {
          await place(sc, want);
          record(sc, a, "S", qty, want, "ok", `re-priced from ${from}`);
          cleared(reKey);
          rt.db.event(
            "info",
            `control ${key}: backstop re-priced ${from} → ${want} (${(stopDist * 100).toFixed(2)} % from ${px}${stopDist < t.stopDist ? ", inside its liquidation price" : ""})`,
          );
        } catch (err) {
          const msg = errText(err);
          if (err instanceof bx.ExchangeRejected) record(sc, a, "S", qty, want, "error", msg);
          failed(reKey, msg, 30_000, 10 * 60_000);
          // refused for being too close: a WIDER stop is tried before the old one goes back. The old price is where
          // the stop already was, so restoring it is the fallback, not the answer — and when the mark has walked onto
          // it, the restore is refused for the same reason and the position is left bare until the repair next step.
          if (err instanceof bx.ExchangeRejected && bx.stopTooClose(msg)) {
            const wider = bx.widenStopDist(stopDist, px, spec);
            learnVenueMin(rt, sym, "stop", wider);
            const wide = bx.stopPxExchange(px, side, wider, spec, wider, t.stopMax ?? Infinity);
            const wc = makeCoid(s.connId, "S");
            record(wc, a, "S", qty, wide, "pending", "re-price widened");
            try {
              await place(wc, wide);
              record(wc, a, "S", qty, wide, "ok", `re-priced wider after a too-close refusal (from ${from})`);
              cleared(reKey);
              rt.db.event(
                "warn",
                `control ${key}: backstop re-price to ${want} was too close — placed at ${wide} (${(wider * 100).toFixed(2)} %)`,
              );
              continue;
            } catch (e3) {
              const m3 = errText(e3);
              if (e3 instanceof bx.ExchangeRejected) record(wc, a, "S", qty, wide, "error", m3);
              else continue; // its outcome is unknown; a second stop could outlive the parent
            }
          }
          if (!(err instanceof bx.ExchangeRejected)) continue; // no restore while the first placement is unknown
          // the position is without its stop now: one at the old price goes straight back
          const back = off[0].sp;
          const bc = makeCoid(s.connId, "S");
          record(bc, a, "S", qty, back, "pending", "re-price restore");
          try {
            await place(bc, back);
            record(bc, a, "S", qty, back, "ok", "restored after a refused re-price");
            rt.db.event("warn", `control ${key}: backstop re-price to ${want} failed (old stop ${back} restored): ${msg}`);
          } catch (e2) {
            const m2 = errText(e2);
            if (e2 instanceof bx.ExchangeRejected) record(bc, a, "S", qty, back, "error", m2);
            rt.db.event(
              "error",
              `control ${key}: backstop re-price to ${want} failed and the old stop ${back} could not be restored (stop repair next step): ${msg} / ${m2}`,
            );
          }
          if (bx.noteRateLimit(msg)) break;
          continue;
        }
        continue;
      }
      // a stop that fits rests on the position: the others go
      for (const x of off) {
        if (!alive()) break;
        if (await ex.cancel(sym, x.id)) status.cancelled++;
      }
    }

    // take-profit upkeep (kind T): every held position whose lanes all have a target carries one (own-quantity)
    // take-profit beyond the farthest target (tpDistFor) — placed when missing (refused at the open, a position held
    // from before), re-placed when the farthest target moved past it or it was left far out (tpFits; at most every
    // RESTOP_MIN_MS), cancelled when a lane without a target joined (it would cut that lane's run).
    for (const [key, qty] of ordersStale || !pricesFresh || noSpecs ? [] : held) {
      if (!alive() || bx.blockingBanUntil()) break;
      if (laneBusy.has(key) || closing.has(key) || repairClosed.has(key) || orphanBlocked(key)) continue;
      if (frozenParents.has(key) && !continuingClose.has(key)) continue;
      // someone else's quantity on the key: no take-profit (one beside the bounded stop would stay after the stop
      // filled and later close their part) — one resting there goes; the control closes ours at the lanes' exits
      if (merged.has(key)) {
        const [msym, msd] = key.split("|");
        const mps = Number(msd) === 1 ? "LONG" : "SHORT";
        let gone = 0;
        for (const o of book.orders)
          if (
            o.id &&
            o.venueSymbol === msym &&
            ownCoidKind(o.clientOrderId, s.connId) === "T" &&
            // one-way: the venue echoes a one-way take-profit as BOTH, which is no side of ours
            (oneway || !o.positionSide || o.positionSide === mps) &&
            alive() &&
            (await ex.cancel(msym, o.id))
          )
            gone++;
        if (gone) {
          status.cancelled += gone;
          record(`tpgone-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`, { key, sym: msym, side: Number(msd) }, "T", 0, 0, "gone", "someone else's quantity on the key");
        }
        continue;
      }
      const t = targetOf.get(key);
      const sym = key.split("|")[0];
      const px = prices.get(sym) ?? 0;
      // no target this step (no price, a close coming): left as it is
      if (!t || !(px > 0) || !(qty > 0)) continue;
      const side = t.side;
      const positionSide = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
      const a = { key, sym, side };
      const tps = book.orders
        .filter(
          (o) =>
            o.id &&
            o.venueSymbol === sym &&
            ownCoidKind(o.clientOrderId, s.connId) === "T" &&
            (oneway || !o.positionSide || o.positionSide === positionSide),
        )
        .map((o) => ({ id: o.id!, px: ctlByUpper().get((o.clientOrderId ?? "").toUpperCase())?.px ?? 0 }));
      if (!t.tpPx) {
        let gone = 0;
        for (const x of tps) if (alive() && (await ex.cancel(sym, x.id))) gone++;
        if (gone) {
          status.cancelled += gone;
          // a local marker (never sent): the position carries no take-profit from here (closedBy reads it)
          record(`tpgone-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`, a, "T", 0, 0, "gone", "a lane without a target");
        }
        continue;
      }
      const w = tpWantOf(sym, side, t.tpPx, px);
      if (!w) continue;
      // a take-profit of unknown price (no ledger row): left as it is, never guessed
      if (tps.some((x) => !(x.px > 0))) continue;
      const fit = tps.find((x) => tpFits(side, x.px, t.tpPx!, w.px, px));
      if (fit) {
        for (const x of tps) if (x !== fit && alive() && (await ex.cancel(sym, x.id))) status.cancelled++;
        continue;
      }
      const tk = `${connHash}|tp|${key}`;
      if (waiting(tk)) continue;
      const Lt = local(rt).retpAt;
      if (tps.length && Date.now() - (Lt.get(key) ?? 0) < RESTOP_MIN_MS) continue;
      Lt.set(key, Date.now());
      if (Lt.size > 2_000) Lt.clear();
      // the off ones go first (the venue keeps one close-position take-profit per side); a cancel that did not
      // confirm leaves it for the next step's read
      let left = tps.length;
      for (const x of tps)
        if (alive() && (await ex.cancel(sym, x.id))) {
          status.cancelled++;
          left--;
        }
      if (left > 0 || !alive() || orphanBlocked(key)) continue;
      const from = tps.map((x) => x.px).join(", ");
      const placed = await setTp(a, qty, px, t.tpPx, from ? `re-priced from ${from}` : "placed");
      if (placed > 0) {
        cleared(tk);
        if (from) rt.db.event("info", `control ${key}: take-profit re-priced ${from} → ${placed} (farthest target ${t.tpPx})`);
      } else failed(tk, "take-profit not placed", 30_000, 10 * 60_000);
    }

    // A quantity change replaces its partial exits only after every old order is confirmed cancelled.
    // A refusal/unknown keeps the durable identity and holds this key; a fill is reconciled by the next fresh
    // book before any market reduction. The position-wide backstop remains throughout.
    if (laneMode && !ordersStale) {
      const want = new Set(
        liveLanes.flatMap((l) => (l.id ? [(l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side }))] : [])),
      );
      // Before reducing a side, its old partial quantities must not remain larger than the residual position.
      // Confirmed cancels remove only the physical exits; attribution still closes from actual fills below.
      const reducing = new Set(plan.actions.filter((a) => a.kind === "reduce" || a.kind === "close").map((a) => a.key));
      for (const lo of Object.values(laneMap)) {
        if (!alive()) break;
        if (laneBusy.has(lo.key) || drainUnknown.has(lo.key)) continue;
        if (want.has(lo.id) && (drainingLaneOrders || !reducing.has(lo.key))) continue;
        if (await cancelLaneOrders(lo, orderIdOf)) delete laneMap[lo.id];
      }
    }

    // one-way: symbols whose close / reduce did not go through this step — an open of the other side there would
    // net through zero into the wrong position (closes run first in the plan)
    const exitBlocked = new Set<string>();
    for (const a of plan.actions) {
      if (!alive()) break;
      phase(`${a.kind} ${a.key}`);
      const spec = specs.get(a.sym) ?? null;
      const px = prices.get(a.sym) ?? 0;
      const positionSide = oneway ? "BOTH" : a.side === 1 ? "LONG" : "SHORT";
      const into = a.side === 1 ? "BUY" : "SELL";
      const out = a.side === 1 ? "SELL" : "BUY";
      const reduceOnly: Record<string, string> = oneway ? { reduceOnly: "true" } : {};
      const res: ControlAction & { ok: boolean; msg?: string } = { ...a, ok: false };
      control.actions.push(res);
      const grows = a.kind === "open" || a.kind === "increase";
      const waitKey = `${connHash}|${grows ? "open" : "exit"}|${a.key}`;
      const w = waiting(waitKey);
      if (pendingKeys.has(a.key) || (oneway && [...pendingKeys].some((k) => k.startsWith(`${a.sym}|`)))) {
        res.msg = "accepted order execution pending — no duplicate action";
        if (!grows) exitBlocked.add(a.sym);
        continue;
      }
      if (w) {
        res.msg = `waiting after a failure: ${w}`;
        if (!grows) exitBlocked.add(a.sym);
        continue;
      }
      if (repairClosed.has(a.key)) {
        res.msg = "closed by the stop repair this step";
        continue;
      }
      if (laneBusy.has(a.key)) {
        res.msg = "a lane order cancellation is unresolved or filled — the book is read again next step";
        if (!grows) exitBlocked.add(a.sym);
        continue;
      }
      if (
        a.kind === "open" &&
        (lagging.has(a.key) || (oneway && (lagging.has(`${a.sym}|1`) || lagging.has(`${a.sym}|-1`))))
      ) {
        res.msg = "opened moments ago — the position read lags; not opened again";
        continue;
      }
      if (grows && oneway && exitBlocked.has(a.sym)) {
        res.msg = "the other side is not closed yet — not opening";
        continue;
      }
      // the order sent in this action (its row turns to "error" when the exchange refuses it)
      let sent: { coid: string; kind: string; qty: number; px: number } | null = null;
      try {
        if (grows) {
          if (rt.db.lastStateError || rt.db.lastJournalError)
            throw holdOn(`ownership durability unavailable: ${rt.db.lastStateError || rt.db.lastJournalError}`);
          if (promotionHeldKeys.has(a.key)) throw holdOn("held lane lacks current promotion proof — no new exposure; exits and protection continue");
          if (!pricesFresh) throw holdOn("prices older than 30 s — not opening / increasing");
          if (openBlock) throw holdOn(openBlock);
          if (modeError) throw holdOn(modeError);
          if (noSpecs) throw holdOn("contract specs unavailable — not opening");
          if (!specs.has(a.sym)) throw holdOn(`${a.sym} is not listed — not opening`);
          // a symbol holding someone else's quantity (a frozen side, or merged into ours) keeps its margin mode and that
          // side its leverage (changing either moves their margin): the open uses what is in force, and waits while the
          // symbol's margin mode is not known to be the configured one (read once, never set)
          const foreignOnSym = foreignQty.has(`${a.sym}|1`) || foreignQty.has(`${a.sym}|-1`);
          if (!foreignOnSym) await ensureMargin(a.sym);
          else await verifyMargin(a.sym);
          if (!foreignQty.has(a.key)) await ensureLeverage(a.sym, a.side);
          if (!(px > 0)) throw new Error("no fresh price");
          const vmin = venueMins(rt).get(a.sym)?.qty ?? 0;
          const minUsd = bx.exchangeMinNotional(spec, px);
          let qty: number;
          if (a.kind === "increase") {
            // an increase is a DELTA: snapped down, never raised. Raised to the exchange minimum, a small delta was
            // sent as a whole minimum, the position ended above its target (and its cap), and the reduce that
            // followed was under the minimum — so the overshoot was kept forever. A delta under the minimum is not
            // sent: the position is kept as it is (never closed for it).
            qty = bx.snapQtyDown(a.qty, spec);
            const have = held.get(a.key) ?? 0;
            const capUsd = positionCapFor(positionCapOf(s), balanceNow, s.maxPositionX);
            if (!(qty > 0) || qty < Math.max(spec?.minQty ?? 0, vmin) - 1e-12 || qty * px < minUsd - 1e-9)
              throw holdOn("increase under the exchange minimum — kept");
            if ((have + qty) * px > Math.max(capUsd, minUsd) * 1.0001)
              throw holdOn("increase would take the position past its cap — kept");
          } else {
            // the plan quantity is already exchange-valid; never floor it again (that drops under the minimum)
            qty = bx.snapQtyExchange(a.qty, px, spec, vmin).qty;
            // holdOn, not Error: this is a sizing fact about the symbol, not a failed order — an Error here armed
            // the open backoff for the key and kept it out of the book long after the price moved
            if (!(qty > 0) || qty * px < minUsd - 1e-9)
              throw holdOn(`${a.sym} cannot be sized to the exchange minimum at ${px}`);
          }
          // free-margin floor within the step: each open takes its margin off the room before it is sent
          const checkMargin = async (q: number) => {
            if (marginRoom === Infinity) return;
            let reserved = 0;
            for (const row of budgetPending!.values()) {
              const pending = pendingOf(row.msg);
              if (!pending) continue;
              const remaining = pending.unresolved || pending.wasFlat ? pending.sentQty : Math.max(0, pending.sentQty - row.qty);
              if (!(remaining > 0)) continue;
              const [sym, sd] = row.k.split("|");
              const mark = prices.get(sym) ?? 0;
              if (!(mark > 0)) throw holdOn("free-margin floor: pending entry exposure unknown — not increasing");
              reserved += remaining * mark / await levOf(sym, Number(sd) === 1 ? 1 : -1);
            }
            const marginNeed = (q * px) / (await levOf(a.sym, a.side));
            const room = marginRoom - reserved;
            if (marginNeed > room) {
              const m = `free-margin floor: ${marginNeed.toFixed(2)} USDT needed, ${Math.max(0, room).toFixed(2)} left after pending entries`;
              // an open the floor refuses leaves the targets for a while: its position-cap slot goes to the next one
              if (a.kind === "open") {
                const F = local(rt).floorRefused;
                F.set(a.key, { until: Date.now() + FLOOR_WAIT_MS, msg: m });
                if (F.size > 2_000) F.clear();
              }
              throw holdOn(m);
            }
          };
          await checkMargin(qty);
          checkAccountGrowth(a.key, qty);
          const ek = entryCoidKind("cfg" in a ? a.cfg : undefined);
          // Check the durable checkpoint before opening exposure which will need a protective conditional.
          // A configured store that cannot write must never authorize a new market parent.
          persistOrphanFences();
          const coid = makeCoid(s.connId, ek);
          // the range is in the client id (ek); the ledger kind stays open / increase, so the own-quantity
          // ledger and the recent-entry check count range positions as ours
          sent = { coid, kind: a.kind === "open" ? "O" : "I", qty, px };
          // an open means the key holds nothing of ours: whatever the ledger still counts there (a stop-out just
          // now) is gone — it restarts from this open
          if (a.kind === "open" && (ledger.get(a.key) ?? 0) > 0) {
            record(
              `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
              a,
              "F",
              0,
              0,
              "ok",
              "reopened",
            );
            ledger.set(a.key, 0);
          }
          record(coid, a, sent.kind, 0, px, "pending", PENDING_EXECUTION + JSON.stringify({ oid: "", sentQty: qty,
            positionSeen: book.positions.some((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}` === a.key) }));
          const place = (c: string, q: number) => {
            if (!executionContextCurrent()) throw new Error("market submission context changed");
            if (rt.db.lastJournalError) throw holdOn(`pending ownership journal unavailable: ${rt.db.lastJournalError}`);
            return ex.order({
              symbol: a.sym,
              side: into,
              positionSide,
              type: "MARKET",
              quantity: q,
              clientOrderID: c,
            });
          };
          let resp: unknown;
          try {
            resp = await place(coid, qty);
          } catch (err) {
            if (!executionContextCurrent()) return status;
            // the cached contract spec can sit a hair under the live minimum ("minimum order amount is X")
            const named = bx.minQtyFromReject(err instanceof Error ? err.message : String(err));
            // the named minimum goes into the snap as a floor, so the retry cannot come back a lot step under the
            // number the exchange just gave us — which is exactly how SOLV was refused twice in a row
            const up = named != null ? bx.snapQtyExchange(qty, px, spec, named).qty : 0;
            // never more than 10× what was asked: a misread amount (USDT read as coins) must not size up.
            // The per-position cap gives way to the CONTRACT's minimum notional — that is the smallest tradable size,
            // so refusing it would mean never trading the symbol — but no further: a named amount past that is a
            // number we cannot corroborate, and a misread must not open a position the cap would never allow. When
            // the contract's own minimum really has moved, the next spec refresh carries it and the target path
            // sizes to it (bounded by the per-position cap, minRaiseBlock) instead.
            const cap = positionCapFor(positionCapOf(s), balanceNow, s.maxPositionX);
            const after = (a.kind === "increase" ? (held.get(a.key) ?? 0) : 0) + up;
            if (
              !(err instanceof bx.ExchangeRejected) ||
              !(up > qty) ||
              up > qty * 10 ||
              after * px > Math.max(cap, bx.exchangeMinNotional(spec, px)) * 1.0001
            )
              throw err;
            if (named != null) learnVenueMin(rt, a.sym, "qty", named);
            record(coid, a, sent.kind, qty, px, "error", err.message);
            // The larger minimum is a NEW size: the original plan checked the smaller one. It must fit the same
            // free-margin and account budgets, and an increase must never raise an existing position past its target.
            const target = targets.find((t) => t.key === a.key);
            if (a.kind === "increase" && target && after > target.qty + 1e-12)
              throw holdOn("minimum-amount retry would increase past the target — kept");
            await checkMargin(up);
            if (!executionContextCurrent()) return status;
            checkAccountGrowth(a.key, up);
            qty = up;
            const retry = makeCoid(s.connId, ek);
            sent = { coid: retry, kind: sent.kind, qty, px };
            record(retry, a, sent.kind, 0, px, "pending", PENDING_EXECUTION + JSON.stringify({ oid: "", sentQty: qty,
              positionSeen: book.positions.some((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}` === a.key) }));
            resp = await place(retry, qty);
            // Reserve the larger accepted size for any later minimum retry in this same step as well.
            if (target) {
              if (target.volEff !== undefined && target.qty > 0) target.volEff *= after / target.qty;
              target.qty = after;
              target.notional = after * px;
            }
          }
          // what executed, not what was asked: a partial entry must not be counted as ours in full, and the
          // stop and the margin that follow are sized to what we actually hold
          if (!executionContextCurrent()) return status;
          const { got, pending } = overallExecutionAck(resp, { coid: sent.coid, sym: a.sym, side: into, positionSide,
            sentQty: qty, positionSeen: book.positions.some((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}` === a.key) });
          const partMsg = got < qty - 1e-12 ? `partial: ${got} of ${qty}` : "";
          qty = got;
          record(sent.coid, a, sent.kind, qty, px, qty > 0 || !pending ? "ok" : "pending", pending ?? partMsg);
          fill(sent.coid, a, sent.kind, qty, px, resp);
          sent = null;
          if (pending) pendingKeys.add(a.key);
          if (!(qty > 0)) {
            res.msg = pending ? "accepted order execution pending — no quantity filled" : "exchange reported zero executed quantity";
            continue; // no ownership, fill, margin debit, protective order or successful-open count for zero
          }
          status.placed++;
          if (marginRoom !== Infinity) {
            const used = (qty * px) / (await levOf(a.sym, a.side));
            marginRoom -= used;
            Lm.marginSpent.push({ at: Date.now(), usd: used });
          }
          if (a.kind === "open") {
            // from the fill, not the reference ticker: a slipped fill would otherwise move the stop by the slip
            const fpx = parseFill(resp)?.px ?? px;
            const learned = () => venueMins(rt).get(a.sym)?.stop ?? 0;
            // snapped AND at least the venue's minimum distance away on the right side of the mark: a stop that
            // lands on the wrong side is refused, and the refusal below closes the position we just opened
            const stopMax = targetOf.get(a.key)?.stopMax ?? Infinity;
            let stopPrice = bx.stopPxExchange(fpx, a.side, a.stopDist, spec, learned(), stopMax);
            let sc = makeCoid(s.connId, "S");
            const placeStop = (c: string, sp: number) => {
              record(c, a, "S", qty, sp, "pending", "open");
              return ex.order({
                symbol: a.sym,
                side: out,
                positionSide,
                type: "STOP_MARKET",
                // the own quantity (BingX still requires it when closePosition closes the whole side, one-way mode)
                quantity: qty,
                stopPrice: sp,
                ...cpOf(),
                workingType: "MARK_PRICE",
                clientOrderID: c,
              });
            };
            try {
              if (!(qty > 0) || !(stopPrice > 0))
                throw new Error("stop needs a quantity and a price");
              try {
                await placeStop(sc, stopPrice);
              } catch (err) {
                if (!executionContextCurrent()) return status;
                // refused for being too close to the mark: widen once and try again. Closing the position is the
                // last resort, not the first answer — a refused stop used to cost the whole position.
                const msg = err instanceof Error ? err.message : String(err);
                // An "already exists" refusal does not establish which order is safe to cancel. In particular,
                // a native parent stop/target or another operator's order is never a stale backstop by inference.
                // Preserve all existing protection and let the bounded emergency close handle this new fill.
                if (!(err instanceof bx.ExchangeRejected) || !bx.stopTooClose(msg)) throw err;
                const wider = bx.widenStopDist(a.stopDist, fpx, spec);
                learnVenueMin(rt, a.sym, "stop", wider);
                record(sc, a, "S", qty, stopPrice, "error", msg);
                stopPrice = bx.stopPxExchange(fpx, a.side, wider, spec, wider, stopMax);
                sc = makeCoid(s.connId, "S");
                await placeStop(sc, stopPrice);
                if (!executionContextCurrent()) return status;
                rt.db.event(
                  "warn",
                  `control ${a.key}: stop refused as too close — re-placed at ${(wider * 100).toFixed(2)} % (${stopPrice})`,
                );
              }
              if (!executionContextCurrent()) return status;
              record(sc, a, "S", qty, stopPrice, "ok");
              // the take-profit beside it (a refusal is retried by the upkeep: never a reason to close)
              const tpPx = targetOf.get(a.key)?.tpPx;
              if (tpPx && tpWantOf(a.sym, a.side, tpPx, fpx) && (await setTp(a, qty, fpx, tpPx, "open")) === 0)
                failed(`${connHash}|tp|${a.key}`, "take-profit not placed at the open", 30_000, 10 * 60_000);
            } catch (err) {
              if (!executionContextCurrent()) return status;
              if (rt.db.lastJournalError) throw err;
              // never leave a control position without its protective stop: close it again
              const unknownStop = uncertainSubmitted.has(a.key);
              record(
                sc,
                a,
                "S",
                qty,
                stopPrice,
                unknownStop ? "pending" : "error",
                String(err instanceof Error ? err.message : err),
              );
              if (unknownStop)
                throw holdOn("protective stop outcome unknown — holding the parent until reconciled");
              if (pendingKeys.has(a.key)) {
                await cancelPendingRemainder(a.key);
                throw new Error(`stop failed; entry execution pending — its remainder is cancelled / rechecked before closing: ${errText(err)}`);
              }
              const cc = makeCoid(s.connId, "C");
              sent = { coid: cc, kind: "X", qty, px };
              record(cc, a, "X", 0, px, "pending", PENDING_EXECUTION + JSON.stringify({ oid: "", sentQty: qty }));
              const reply = await ex.order({
                symbol: a.sym,
                side: out,
                positionSide,
                type: "MARKET",
                quantity: qty,
                clientOrderID: cc,
                ...reduceOnly,
              });
              if (!executionContextCurrent()) return status;
              const result = protectiveCloseResult(cc, a, qty, px, reply, "protective close");
              throw new Error(
                `stop failed, ${result.full ? "position closed" : `protective close incomplete (${result.got} of ${qty})`}: ${err instanceof Error ? err.message : err}`,
              );
            }
          }
        } else {
          // a close sends the whole held size: snapped to the lot step so a float sum (0.30000000000000004) never
          // exceeds the quantity precision, and never to zero while something is held (dust below the step is
          // sent at the precision instead, so the position still gets its close attempt)
          const down = bx.snapQtyDown(a.qty, spec);
          let qty =
            a.kind === "close"
              ? down > 0
                ? down
                : Number(a.qty.toFixed(Math.max(0, spec?.qtyPrec ?? 8)))
              : down;
          if (!(qty > 0)) throw holdOn(`${a.kind} of ${a.qty} is under the lot step — nothing to send`);
          // a reduce under the exchange minimum is rounded UP to it (the same round-up rule as the targets), never past
          // the size held. A reduce only shrinks, so it cannot take a position past a cap, and it lands a minimum under
          // its target instead of keeping an overshoot forever (the refused-every-step reduce that held it there). But
          // the remainder must not be dust: a rest under the minimum is a position no order can cut or manage, so that
          // reduce is kept as it is (as before). A full close is never held back.
          if (a.kind === "reduce" && px > 0 && qty * px < bx.exchangeMinNotional(spec, px) - 1e-9) {
            const vmin = venueMins(rt).get(a.sym)?.qty ?? 0;
            const up = bx.snapQtyExchange(qty, px, spec, vmin).qty;
            const have = held.get(a.key) ?? 0;
            const rest = (have - up) * px;
            if (!(up > 0) || up > have + 1e-12 || (rest > 1e-9 && rest < bx.exchangeMinNotional(spec, px) - 1e-9))
              throw holdOn(
                `reduce of ${(qty * px).toFixed(2)} USDT is under the exchange minimum; rounded up to it, ${
                  up > have + 1e-12
                    ? `it would take more than the ${have} held`
                    : `it would leave ${rest.toFixed(2)} USDT (under the minimum)`
                } — the position is kept as it is`,
              );
            qty = up;
          }
          if (!executionContextCurrent()) return status;
          const coid = makeCoid(s.connId, "C");
          sent = { coid, kind: a.kind === "close" ? "X" : "R", qty, px };
          record(coid, a, sent.kind, 0, px, "pending", PENDING_EXECUTION + JSON.stringify({ oid: "", sentQty: qty, positionSeen: true }));
          const resp = await ex.order({
            symbol: a.sym,
            side: out,
            positionSide,
            type: "MARKET",
            quantity: qty,
            clientOrderID: coid,
            ...reduceOnly,
          });
          // the ledger counts what executed, not what was asked: a partial close that recorded the full size
          // would zero our own quantity and hand the residual to the foreign-position guard, unprotected
          if (!executionContextCurrent()) return status;
          const { got, pending } = overallExecutionAck(resp, { coid, sym: a.sym, side: out, positionSide,
            sentQty: qty, positionSeen: true });
          const part = got < qty - 1e-12 || !!pending;
          record(coid, a, sent.kind, got, px, got > 0 || !pending ? "ok" : "pending", pending ?? (part ? `partial: ${got} of ${qty}` : ""));
          fill(coid, a, sent.kind, got, px, resp);
          sent = null;
          if (pending) pendingKeys.add(a.key);
          if (part) exitBlocked.add(a.sym); // one-way opposite entries wait until the original side really closes
          if (!(got > 0)) {
            res.msg = pending ? "accepted close execution pending — position remains protected" : "exchange reported zero executed quantity";
            continue;
          }
          if (a.kind === "close" && part) {
            // the rest is still open and still ours: its stop stays where it is and the next step closes the
            // remainder (the plan reads the book again)
            rt.db.event("warn", `partial close ${a.key}: ${got} of ${qty} — the rest is closed next step`);
          } else if (a.kind === "close") {
            status.closed++;
            for (const o of book.orders)
              if (
                o.id &&
                o.venueSymbol === a.sym &&
                isOwnCoid(o.clientOrderId, s.connId) &&
                (oneway || !o.positionSide || o.positionSide === positionSide)
              )
                await cancelPositionExit(o, a.key);
          }
        }
        res.ok = true;
        cleared(waitKey);
      } catch (err) {
        if (!executionContextCurrent()) return status;
        res.msg = errText(err);
        // the side is already flat: a stop filled, or a close of ours landed after the book read this step used.
        // The exit it asked for has happened — the row is recorded as done and the ledger restarts from flat, so
        // the step does not back off and retry a close against nothing.
        if (!grows && err instanceof bx.ExchangeRejected && bx.alreadyFlat(res.msg)) {
          const outside = await outsideOf(a.key);
          if (!executionContextCurrent()) return status;
          if (sent) record(sent.coid, a, sent.kind, sent.qty, sent.px, "ok", "already flat");
          noteExternal(a.key, prices.get(a.sym) ?? 0, false, outside);
          record(
            `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
            a,
            "F",
            0,
            0,
            "ok",
            "already flat",
          );
          ledger.set(a.key, 0);
          if (a.kind === "close") status.closed++;
          res.ok = true;
          res.msg = "already flat";
          cleared(waitKey);
          continue;
        }
        const holding = !!(err as { hold?: boolean }).hold;
        // a refused exit leaves the position where it was: in one-way mode the opposite side waits until it is
        // gone. A hold ("nothing to send this step") is not a refusal and never blocks this symbol's opens.
        if (!grows && !holding) exitBlocked.add(a.sym);
        // refused by the exchange: nothing executed, the row is an error (a time-out stays pending: it may have filled)
        if (sent && err instanceof bx.ExchangeRejected)
          record(sent.coid, a, sent.kind, 0, sent.px, "error", res.msg);
        // conditions that clear by themselves (stale prices, not ready, unknown equity, a mode waiting for its
        // retry) are not failures of this action
        if (!holding) {
          const [base, max] = grows ? OPEN_BACKOFF : EXIT_BACKOFF;
          failed(waitKey, res.msg, base, max);
          rt.db.event("error", `control ${a.kind} ${a.key}: ${res.msg}`);
        }
      }
    }
    // lane orders: the lanes the position covers now carry their own orders — a missing stop first, then a missing
    // take-profit, then the stops the lanes trailed (toward the price only) and moved targets; at most
    // LANE_ORDERS_PER_STEP orders a step (the venue's rate limit), protection first
    // the book after this step's orders, read at most once (fresh)
    let bookAfterRead: BookView | null = null;
    const freshBook = async () => (bookAfterRead ??= await ex.book({ notBefore: Date.now(), maxAgeMs: 0 }));
    // hedge mode: every own stop and take-profit is bounded to the own quantity — where their quantity no longer matches
    // it (an increase or a reduce this step, a lane fill, an outside reduction) they are re-sized at their price
    // (resizeExits: a top-up piece, or the new one placed before the old ones go — never without a stop, and never
    // resting for more than ours beside someone else's quantity). The own quantity is the ledger's, never more than the
    // exchange holds; a stop that does not go back is placed by the repair next step.
    // (read fresh only when sizes may be off: an increase or reduce went through, or the step's book shows own exits
    // whose quantity is not the own one — an open, a re-price or a repair this step placed theirs at the own size)
    if (!oneway && !ordersStale && alive() && !bx.blockingBanUntil()) {
      phase("exit sizes");
      type Piece = { id: string; qty: number; px: number };
      // pieces: bounded, of known size; legacy: placed before boundedSince (closePosition); stray: no ledger row
      type Group = { key: string; sym: string; ps: "LONG" | "SHORT"; t: boolean; pieces: Piece[]; legacy: Piece[]; stray: string[] };
      // the own stops / take-profits per key and kind (S: every backstop kind, T: the take-profit) and the own quantity
      // each should cover; a group with one of unknown quantity or price is left as it is
      // (the check on the step's own book uses the step's ledger and row index; the fresh pass reads both again)
      const sizesOf = (b: BookView, ownNow: ReadonlyMap<string, number>, upper: ReadonlyMap<string, ControlRow>) => {
        const exNow = new Map<string, number>();
        for (const p of b.positions) {
          const k = `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`;
          exNow.set(k, (exNow.get(k) ?? 0) + p.qty);
        }
        const groups = new Map<string, Group>();
        for (const o of b.orders) {
          const kind = ownCoidKind(o.clientOrderId, s.connId);
          if (!o.id || !o.positionSide || kind === "V" || kind === "Y" || !(kind === "T" || isBackstopKind(kind))) continue;
          const key = `${o.venueSymbol}|${o.positionSide === "LONG" ? 1 : -1}`;
          // a key not held this step (flat, someone else's, unverified) is the cancel pass's, not this one's
          if (!held.has(key) || repairClosed.has(key) || orphanBlocked(key) || laneBusy.has(key)) continue;
          const gk = `${key}|${kind === "T" ? "T" : "S"}`;
          const g =
            groups.get(gk) ??
            groups.set(gk, { key, sym: o.venueSymbol, ps: o.positionSide, t: kind === "T", pieces: [], legacy: [], stray: [] }).get(gk)!;
          const row = upper.get((o.clientOrderId ?? "").toUpperCase());
          if (!row || !(row.qty > 0) || !((row.px ?? 0) > 0)) g.stray.push(o.id);
          else (row.at < boundedSince! ? g.legacy : g.pieces).push({ id: o.id, qty: row.qty, px: row.px! });
        }
        const out: Array<{ g: Group; want: number; r: NonNullable<ReturnType<typeof resizeExits>> }> = [];
        for (const g of groups.values()) {
          const spec = specs.get(g.sym) ?? null;
          const exk = exNow.get(g.key) ?? 0;
          const want = bx.snapQtyDown(Math.min(ownNow.get(g.key) ?? 0, exk), spec);
          if (!(want > 0)) continue;
          const isMerged = exk > want * (1 + MERGED_TOL) + Math.max(spec?.step ?? 0, 1e-9);
          // the others go once a bounded one of known size rests (a leftover of ours, an earlier version's
          // closePosition one); only legacy ones: a bounded one at their price first; only strays: left as they are
          const extra = [...g.legacy.map((p) => p.id), ...g.stray];
          let r: ReturnType<typeof resizeExits> = null;
          if (g.pieces.length) {
            r = resizeExits(g.pieces, want, isMerged, spec?.step ?? 0);
            if (extra.length) r = r ? { ...r, cancel: [...r.cancel, ...extra] } : { cancel: extra, place: null, placeFirst: false, bare: false };
          } else if (g.legacy.length) {
            const big = g.legacy.reduce((a, p) => (p.qty > a.qty ? p : a));
            r = { cancel: extra, place: { qty: want, px: big.px }, placeFirst: true, bare: false };
          }
          if (r) out.push({ g, want, r });
        }
        return out;
      };
      const resized = control.actions.some((x) => x.ok && (x.kind === "increase" || x.kind === "reduce"));
      const b3 = resized || sizesOf(book, ledger, ctlByUpper()).length ? await freshBook() : null;
      const rowsNow = b3 && b3.ordersAt === undefined ? controlRows(rt) : null;
      const upperNow = new Map<string, ControlRow>();
      if (rowsNow) for (const [c, r] of rowsNow) if (r.kind === "S" || r.kind === "T") upperNow.set(c.toUpperCase(), r);
      if (b3 && rowsNow)
        // (at most EXIT_SIZES_PER_STEP keys a step — the first step after an upgrade replaces every earlier
        // closePosition order; the rest follow on the next steps, within the venue's rate limit)
        for (const { g, want, r } of sizesOf(b3, ownLedger([...rowsNow.values()]), upperNow).slice(0, EXIT_SIZES_PER_STEP)) {
          if (!alive() || bx.blockingBanUntil()) break;
          // Placing a competing replacement before the old exit is retired can leave two orders capable of
          // closing the same netted position. Keep the existing protection until an independently safe resize.
          if (r.placeFirst && r.cancel.length) {
            status.skipped.push({ sym: g.sym, why: "exit resize awaits safe retirement of existing protection" });
            continue;
          }
          const spec = specs.get(g.sym) ?? null;
          const side = (g.ps === "LONG" ? 1 : -1) as 1 | -1;
          const a = { key: g.key, sym: g.sym, side };
          const kd = g.t ? "T" : "S";
          const from = [...g.pieces, ...g.legacy].reduce((x, p) => x + p.qty, 0);
          const place = async () => {
            if (!r.place) return true;
            const q = bx.snapQtyDown(r.place.qty, spec);
            if (!(q > 0)) return true;
            const coid = makeCoid(s.connId, kd);
            const why = `re-sized ${from} → ${want} (own quantity${r.cancel.length ? "" : ": a top-up"})`;
            record(coid, a, kd, q, r.place.px, "pending", why);
            try {
              await ex.order({
                symbol: g.sym,
                side: side === 1 ? "SELL" : "BUY",
                positionSide: g.ps,
                type: g.t ? "TAKE_PROFIT_MARKET" : "STOP_MARKET",
                quantity: q,
                stopPrice: r.place.px,
                workingType: "MARK_PRICE",
                clientOrderID: coid,
              });
              record(coid, a, kd, q, r.place.px, "ok", why);
              return true;
            } catch (err) {
              const msg = errText(err);
              if (err instanceof bx.ExchangeRejected) record(coid, a, kd, q, r.place.px, "error", msg);
              bx.noteRateLimit(msg);
              rt.db.event("warn", `control ${g.key}: ${g.t ? "take-profit" : "stop"} not re-sized ${from} → ${want} (${msg}) — the old one stays; retried next step`);
              return false;
            }
          };
          const cancelOld = async () => {
            for (const id of r.cancel) if (alive() && (await ex.cancel(g.sym, id))) status.cancelled++;
          };
          if (r.placeFirst) {
            // the new piece rests before any old one goes: a refused one leaves the old ones as they are
            if (await place()) await cancelOld();
          } else {
            await cancelOld();
            if (!orphanBlocked(g.key)) await place();
          }
        }
    }
    if (laneMode && alive()) {
      phase("lane orders");
      const b2 = bookAfterRead ?? (control.actions.some((x) => x.ok) ? await freshBook() : book);
      if (b2.ordersAt === undefined) {
        const resting = ownResting(b2);
        const ids2 = new Map(b2.orders.map((o) => [(o.clientOrderId ?? "").toUpperCase(), o.id] as const));
        const qtyOn = new Map<string, number>();
        for (const p of b2.positions) qtyOn.set(`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`, p.qty);
        // what this system holds of it (the ledger, after this step's orders)
        const own = ownLedger([...controlRows(rt).values()]);
        // one want per lane: a Block Overall position's legs (…|blk:src) share its lane id, stop and target — they are
        // one lane order sized by the lane's whole units (as controlTargets sizes the key), never one stop per leg
        // under the same id (the second overwrote the first in the lane map and left an untracked own order)
        const byKey = new Map<string, Map<string, LaneWant & { units: number }>>();
        // a lane's units: its minimum-lane units (Block / ladder provenance), else its volume, rounded, at least one
        const unitsOf = (l: ControlContribution) => l.laneUnits ?? laneUnits(l.vol);
        for (const l of liveLanes) {
          if (!l.id) continue;
          const id = (l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side }));
          const old = drainingLaneOrders ? laneMap[id] : undefined;
          // During a mode transition only a previously proven native level can be restored. A changed Paper
          // level is not a verified replacement for the order whose identity and allocation we are draining.
          const stop = old ? old.drainStopPx : l.stopPx;
          const target = old ? old.drainTargetPx : l.tgt;
          if (!(stop !== undefined && stop > 0) && !(drainingLaneOrders && target !== undefined && target > 0)) continue;
          const k = `${l.sym}|${l.side}`;
          const group = byKey.get(k) ?? new Map<string, LaneWant & { units: number }>();
          if (!byKey.has(k)) byKey.set(k, group);
          const prior = group.get(id);
          if (prior) {
            prior.units += unitsOf(l);
            (prior.weights ??= {})[l.id] = unitsOf(l);
            continue;
          }
          const w: LaneWant = {
            id,
            key: k,
            sym: l.sym,
            side: l.side,
            stop: stop ?? 0,
            ...(target !== undefined && target > 0 ? { target } : {}),
            entryT: Number(id.slice(id.lastIndexOf("|") + 1)) || 0,
          };
          group.set(id, { ...w, units: unitsOf(l), weights: { [l.id]: unitsOf(l) } });
        }
        const covered: LaneWant[] = [];
        for (const [key, group] of byKey) {
          if (isForeign(foreign, key) || laneBusy.has(key)) continue;
          const t = targetOf.get(key);
          const spec = specs.get(key.split("|")[0]) ?? null;
          if (!t || !(t.lanes > 0) || !(t.qty > 0)) continue;
          const precision = Math.max(0, spec?.qtyPrec ?? 8);
          const step = spec?.step ?? 10 ** -precision;
          const q = Math.min(qtyOn.get(key) ?? 0, own.get(key) ?? 0);
          // One-way targets have already netted the opposite side. Divide only among the surviving parents;
          // dividing by the net lane-unit count would allocate the offset quantity a second time.
          const units = [...group.values()].reduce((sum, w) => sum + w.units, 0);
          if (!(units > 0) || !(q > 0)) continue;
          const changed = control.actions.some((a) => a.key === key && a.ok);
          const atTarget = Math.abs(q - t.qty) <= Math.max(1e-12, step * 1e-6);
          // A requested / pending quantity is not owned. Partial fills bound the replaceable allocation too.
          // Ordinary price/equity drift inside the rebalance band keeps the original held lane quantities.
          const reconcile = changed || atTarget;
          const laneQty = Math.min(t.qty, q) / units;
          const ws = [...group.values()].map((w) => ({ ...w,
            qty: bx.snapQtyDown(Math.min(laneRequestedQty.get(w.id) ?? laneQty * w.units, laneCaps[w.id] ?? Infinity) *
              Math.min(1, q / t.qty), spec) }));
          if (reconcile) {
            for (const w of ws) {
              const lo = laneMap[w.id];
              if (!lo) continue;
              if (Math.abs(lo.qty - (w.qty ?? 0)) > Math.max(1e-12, step * 1e-6)) {
                if (await cancelLaneOrders(lo, ids2)) delete laneMap[w.id];
              } else lo.weights = w.weights;
            }
            if (laneBusy.has(key)) continue;
          }
          const cov = coveredLanes(ws, laneMap, q, laneQty);
          const covIds = new Set(cov.map((w) => w.id));
          // lanes the position no longer covers (a partial fill, a scaler): their orders go
          for (const lo of Object.values(laneMap))
            if (lo.key === key && !covIds.has(lo.id)) {
              if (await cancelLaneOrders(lo, ids2)) delete laneMap[lo.id];
            }
          if (laneBusy.has(key)) continue;
          for (const w of cov)
            if (!laneMap[w.id])
              laneMap[w.id] = { id: w.id, key, sym: w.sym, side: w.side, qty: w.qty ?? laneQty, exitQty: 0, exitNotional: 0,
                ...(w.weights ? { weights: w.weights } : {}), at: Date.now() };
          covered.push(...cov);
        }
        const learned = (sym: string) => venueMins(rt).get(sym)?.stop ?? 0;
        // the lane's own level, snapped away from the mark and at least the venue's distance from it
        const levelPx = (w: LaneWant, lvl: number, px: number, exitSide: 1 | -1) => {
          const spec = specs.get(w.sym) ?? null;
          const d = Math.max((exitSide * (px - lvl)) / px, bx.minStopDist(px, spec, learned(w.sym)));
          return bx.stopPxExchange(px, exitSide, d, spec, learned(w.sym));
        };
        // the venue's TP/SL cap: what is left after every own order resting and room for new backstops
        const cap = s.maxVenueOrders ?? VENUE_ORDERS_MAX;
        const ownNow = b2.orders.filter((o) => isOwnCoid(o.clientOrderId, s.connId)).length;
        const noBackstop = [...qtyOn.keys()].filter(
          (k) =>
            (own.get(k) ?? 0) > 0 &&
            !b2.orders.some(
              (o) => keyOfOwn(o, b2) === k && isBackstopKind(ownCoidKind(o.clientOrderId, s.connId)),
            ),
        ).length;
        const Lc = local(rt);
        const capWait = (Lc.laneCapUntil ?? 0) > Date.now();
        const slots = capWait ? 0 : Math.max(0, cap - ownNow - noBackstop - VENUE_ORDERS_RESERVE);
        const planOpts = {
          px: (sym: string) => prices.get(sym) ?? 0,
          stopPx: (w: LaneWant, px: number) => drainingLaneOrders ? w.stop : levelPx(w, w.stop, px, w.side),
          targetPx: (w: LaneWant, px: number) => drainingLaneOrders ? (w.target ?? 0) : levelPx(w, w.target ?? 0, px, w.side === 1 ? -1 : 1),
          budget: LANE_ORDERS_PER_STEP,
          skip: (lane: string) => !!waiting(`${connHash}|lane|${lane}`),
        };
        // Keep all resting native protection at the cap; an unavailable slot stays visibly pending.
        const repairs: LaneAction[] = [];
        // After an accounted partial, restore the original native stop for the confirmed residual only when
        // both former identities are terminal, this is the only parent, and a fresh book and owned ledger
        // agree exactly on its quantity. No simultaneous target is sent until the replacement stop is known.
        if (slots > 0) for (const lo of Object.values(laneMap)) {
          const key = lo.key, px = prices.get(lo.sym) ?? 0, observed = qtyOn.get(key) ?? 0, owned = own.get(key) ?? 0;
          if (!(lo.exitQty && lo.exitQty > 0 && lo.qty > 0) || lo.closed || partialThisStep.has(lo.id) ||
            sharedNativeKeys.has(key) || orphanBlocked(key) || lo.t || pendingKeys.has(key) || lagging.has(key) ||
            unverifiedOwnership.has(key) || isForeign(foreign, key) || !(px > 0) ||
            Math.abs(observed - lo.qty) > 1e-9 || Math.abs(owned - lo.qty) > 1e-9 ||
            waiting(`${connHash}|lane|${lo.id}`)) continue;
          if (!lo.s && Number.isFinite(lo.drainStopPx) && (lo.drainStopPx ?? 0) > 0 && lo.side * (px - lo.drainStopPx!) > 0) {
            repairs.push({ kind: "placeStop", lane: lo.id, px: lo.drainStopPx! });
          } else if (lo.s?.oid && resting.has(lo.s.coid.toUpperCase()) && !(lo.s.filledQty ?? 0) &&
            Math.abs((lo.s.qty ?? 0) - lo.qty) <= 1e-9 && Number.isFinite(lo.drainTargetPx) &&
            (lo.drainTargetPx ?? 0) > 0 && lo.side * (lo.drainTargetPx! - px) > 0) {
            repairs.push({ kind: "placeTarget", lane: lo.id, px: lo.drainTargetPx! });
          }
        }
        if (drainingLaneOrders && slots > 0) {
          const tracked = new Map<string, number>();
          const invalid = new Set<string>();
          for (const lo of Object.values(laneMap)) {
            if (!Number.isFinite(lo.qty) || lo.qty < 0) invalid.add(lo.key);
            else tracked.set(lo.key, (tracked.get(lo.key) ?? 0) + lo.qty);
          }
          // These parents may no longer appear in Paper. Only their own confirmed level and remaining quantity can
          // replace a known-zero cancellation; an unknown order, partial fill or insufficient position stays pending.
          for (const lo of Object.values(laneMap)) {
            const key = lo.key, px = prices.get(lo.sym) ?? 0;
            if (!drainingWaiting.has(key) || drainUnknown.has(key) || orphanBlocked(key) || laneReconcileBusy.has(key) ||
              pendingKeys.has(key) || lagging.has(key) || unverifiedOwnership.has(key) || isForeign(foreign, key) ||
              invalid.has(key) || lo.closed || !(lo.qty > 0) || !(px > 0) ||
              Math.min(qtyOn.get(key) ?? 0, own.get(key) ?? 0) + 1e-9 < (tracked.get(key) ?? 0) ||
              waiting(`${connHash}|lane|${lo.id}`)) continue;
            if (!lo.s && Number.isFinite(lo.drainStopPx) && (lo.drainStopPx ?? 0) > 0 && lo.side * (px - lo.drainStopPx!) > 0)
              repairs.push({ kind: "placeStop", lane: lo.id, px: lo.drainStopPx! });
            if (!lo.t && Number.isFinite(lo.drainTargetPx) && (lo.drainTargetPx ?? 0) > 0 && lo.side * (lo.drainTargetPx! - px) > 0)
              repairs.push({ kind: "placeTarget", lane: lo.id, px: lo.drainTargetPx! });
          }
        }
        repairs.sort((a, b) => Number(a.kind !== "placeStop") - Number(b.kind !== "placeStop"));
        const selectedRepairs = repairs.slice(0, Math.min(slots, LANE_ORDERS_PER_STEP));
        const planned = planLaneOrders(covered, laneMap, resting, { ...planOpts, slots: Math.max(0, slots - selectedRepairs.length) })
          .filter((act) => !drainingLaneOrders || act.kind === "placeStop" || act.kind === "placeTarget");
        const acts = [...selectedRepairs, ...planned].slice(0, LANE_ORDERS_PER_STEP);
        let capHit = false, budgetHit = false;
        const placeLane = async (lo: LaneOrder, which: "s" | "t", px: number) => {
          const kind = which === "s" ? "V" : "Y";
          const coid = makeCoid(s.connId, kind);
          const a = { key: lo.key, sym: lo.sym, side: lo.side };
          record(coid, a, kind, lo.qty, px, "pending", lo.id);
          // Persist the request identity before the await; a timeout can mean the venue accepted this exit.
          lo[which] = { coid, px, qty: lo.qty };
          persistLaneState();
          try {
            const resp = await ex.order({
              symbol: lo.sym,
              side: lo.side === 1 ? "SELL" : "BUY",
              positionSide: oneway ? "BOTH" : lo.side === 1 ? "LONG" : "SHORT",
              type: which === "s" ? "STOP_MARKET" : "TAKE_PROFIT_MARKET",
              quantity: lo.qty,
              stopPrice: px,
              workingType: "MARK_PRICE",
              clientOrderID: coid,
              ...(oneway ? { reduceOnly: "true" } : {}),
            });
            const oid = String(
              ((resp as { order?: { orderId?: unknown } })?.order?.orderId ?? (resp as { orderId?: unknown })?.orderId) ??
                "",
            );
            lo[which] = { coid, ...(oid ? { oid } : {}), px, qty: lo.qty };
            record(coid, a, kind, lo.qty, px, "ok", lo.id);
            return true;
          } catch (err) {
            const msg = errText(err);
            if (err instanceof bx.ExchangeRejected) {
              record(coid, a, kind, lo.qty, px, "error", `${lo.id}: ${msg}`);
              if (lo[which]?.coid === coid) delete lo[which];
              // The failed request identity is definitely not live. Persist its removal with the retained drain
              // level so a restart can retry instead of treating a rejected placement as an unknown venue order.
              persistLaneState();
            }
            if (err instanceof bx.RequestBudgetDeferred) {
              budgetHit = true;
              return false;
            }
            bx.noteRateLimit(msg);
            // the account's TP/SL cap: no new lane order for a while (retrying each step drew BingX's error-rate
            // ban — 110206 — which then refused the backstops too); any other refusal backs this lane off
            if (/number of your TP\/SL orders has exceeded|exceeded the limit/i.test(msg)) {
              capHit = true;
              Lc.laneCapUntil = Date.now() + LANE_CAP_WAIT_MS;
            } else failed(`${connHash}|lane|${lo.id}`, msg, 60_000, 10 * 60_000);
            rt.db.event("warn", `lane ${lo.id}: ${which === "s" ? "stop" : "take-profit"} ${px} not placed: ${msg}`);
            return false;
          }
        };
        const run = async (x: (typeof acts)[number]) => {
          const lo = laneMap[x.lane];
          if (!lo) return;
          const which = x.kind === "placeStop" || x.kind === "moveStop" ? "s" : "t";
          if (x.kind === "moveStop" || x.kind === "moveTarget" || x.kind === "dropTarget") {
            const o = lo[which];
            if (!o) return;
            const oid = o.oid ?? ids2.get(o.coid.toUpperCase());
            if (oid && !(await ex.cancel(lo.sym, oid))) {
              // gone already: a fill is the lane's exit (booked next step, from the book); otherwise placed anew
              const g = await goneOf(lo.sym, oid, { coid: o.coid, side: lo.side, which, filledQty: o.filledQty });
              if (g.status !== "cancelled") return;
            } else if (oid) {
              status.cancelled++;
              laneStat.cancelled++;
              const g = await goneOf(lo.sym, oid, { coid: o.coid, side: lo.side, which, filledQty: o.filledQty });
              if (g.status !== "cancelled") return;
            }
            delete lo[which];
            if (x.kind === "dropTarget") return;
          }
          if (await placeLane(lo, which, x.px)) {
            if (x.kind === "moveStop" || x.kind === "moveTarget") laneStat.moved++;
            else laneStat.placed++;
          }
        };
        // different lanes side by side; one lane's actions (its stop, its take-profit) never in the same batch
        for (let i = 0; i < acts.length; ) {
          if (!alive() || bx.blockingBanUntil() || capHit || budgetHit) break;
          const batch: typeof acts = [];
          const lanesIn = new Set<string>();
          while (i < acts.length && batch.length < LANE_ORDER_CONCURRENCY && !lanesIn.has(acts[i].lane)) {
            lanesIn.add(acts[i].lane);
            batch.push(acts[i++]);
          }
          await Promise.all(batch.map(run));
        }
        laneStat.onExchange = Object.values(laneMap).filter((lo) => lo.qty > 0 && (qtyOn.get(lo.key) ?? 0) > 0).length;
        const pendingIds = new Set(covered.filter((w) => {
          const lo = laneMap[w.id];
          return !lo?.s || ((w.target ?? 0) > 0 && !lo.t);
        }).map((w) => w.id));
        for (const lo of Object.values(laneMap)) if (lo.qty > 0 &&
          ((lo.exitQty ?? 0) > 0 || !(qtyOn.get(lo.key) ?? 0))) pendingIds.add(lo.id);
        laneStat.pending = pendingIds.size;
      }
    }
    if (laneMode) {
      // The earlier protection summary used a pre-cancellation snapshot. Do not show its lane-order counts as
      // current after a partial execution changed the orders during this step.
      if (partialThisStep.size && control.protect) { delete control.protect.laneStops; delete control.protect.laneTps; }
      for (const id of Object.keys(laneCaps)) if (!laneIdByKey.has(id) && !laneMap[id]) delete laneCaps[id];
      persistLaneState();
      control.laneOrders = laneStat;
    }
    // the lane volume each key now stands at: every target with nothing to do, or whose action went through; a key
    // whose resize failed or was held keeps its old volume, so the next step resizes it again
    const acted = new Map(control.actions.map((x) => [x.key, x.ok] as const));
    for (const t of plan.targets) if (acted.get(t.key) ?? true) Lm.sizedVol.set(t.key, t.vol);
    for (const k of [...Lm.sizedVol.keys()]) if (!targetOf.has(k) && !held.has(k)) Lm.sizedVol.delete(k);
    liveKvSet(rt.db, "controlStatus", control);
    // the live record: each lane's exchange entry and exit (live-record.ts)
    const heldAfter = new Set(control.held.filter((h) => h.qty > 0).map((h) => h.key));
    for (const k of external.keys()) heldAfter.delete(k);
    for (const [k, v] of keyState) if (v === "open" || (budgetQty?.get(k) ?? 0) > 1e-12) heldAfter.add(k);
    else heldAfter.delete(k);
    const unresolvedNative = new Set<string>();
    if (laneMode) for (const key of sharedNativeKeys) unresolvedNative.add(key);
    if (laneMode) for (const lo of Object.values(laneMap))
      if (!laneExit.has(lo.id) && (laneBusy.has(lo.key) || (lo.qty > 0 && !onExchange.has(lo.key))))
        unresolvedNative.add(lo.key);
    // A pending native identity remains logically open for attribution even if a venue snapshot is flat.
    // This reserves no new physical quantity; it only prevents an unmeasured exit being booked at the ticker.
    for (const key of unresolvedNative) heldAfter.add(key);
    const recordExternal = unresolvedNative.size
      ? new Map([...external].filter(([key]) => !unresolvedNative.has(key))) : external;
    // the flat markers carry the close the exchange made (its stop, its take-profit, by hand) at the price its lanes are
    // booked at below; an unknown price stays 0 (the marker then books nothing — no price is invented). Time and order
    // of the row are kept: a reopen later in this step still follows it.
    for (const [k, f] of flatRows) {
      if (unresolvedNative.has(k)) continue;
      const px = external.get(k);
      if (!(px && px > 0)) continue;
      rt.db.runDurable(
        "UPDATE live_orders SET px = ?, msg = ? WHERE coid = ?",
        px,
        `${f.msg} (${externalWhy.get(k) ?? "stop"} ${px})`,
        f.coid,
      );
      const row = local(rt).ctl?.rows.get(f.coid);
      if (row) row.px = px;
    }
    // Without lane orders, keep previous parent identities while the owned side still has quantity. A refused or
    // partial reduction must not turn a vanished Paper lane into a fabricated settled close. This also preserves
    // mixed legacy identities across steps/restarts instead of inventing exclusive ownership for the survivor.
    const recordedLanes: LaneStepInput["lanes"] = !laneMode || drainingWaiting.size || drainUnknown.size || unresolvedNative.size
      ? [...liveLanes, ...Object.entries(trackedLanes).flatMap(([id, lane]) => {
          const key = `${lane.sym}|${lane.side}`;
          return !laneExit.has(id) && heldAfter.has(key) && (!laneMode || drainingWaiting.has(key) || drainUnknown.has(key) || unresolvedNative.has(key))
            ? [{ id, lk: id, key, cfg: lane.cfg, sym: lane.sym, side: lane.side }] : [];
        })]
      : liveLanes;
    recordLanes(rt, { lanes: recordedLanes, heldAfter, grew, shrank, external: recordExternal, externalWhy, externalSrc, laneExit, prices });
    // Conditional history is read in the background after protection. A slow or unknown venue response cannot
    // delay this control step or certify a fill; the generation and connection fence each eventual update.
    if (!conditionalReconciliations.has(rt.db) && Date.now() >= (conditionalNext.get(rt.db) ?? 0) && [...ctlRows.values()].some((row) =>
      row.status === "pending" && (row.kind === "S" || row.kind === "T"))) {
      conditionalNext.set(rt.db, Date.now() + 5_000);
      const jobConn = s.connId;
      const job = reconcilePendingConditionals(rt, ex, { ...(bookAfterRead ?? book), ordersAt: Date.now() },
        () => alive() && rt.settings.live.connId === jobConn);
      conditionalReconciliations.set(rt.db, job);
      void job.then(() => conditionalReconciliations.delete(rt.db), (error) => {
        conditionalReconciliations.delete(rt.db);
        if (alive()) try { rt.db.event("warn", `conditional reconciliation: ${errText(error)}`); } catch { /* disposed */ }
      });
    }
    refreshVenueHistory(rt, ex);
    // Market replies often omit commission on VST. Reconcile one symbol per 30s only after all protection and
    // ownership work. Read failures keep the fee explicitly unknown and never reverse a confirmed order fill.
    if (ex.feeHistory && Date.now() - (Lm.feeSyncAt ?? 0) >= 30_000 && alive()) {
      const pendingFees = rt.db.all<{ coid: string; sym: string; at: number }>(
        "SELECT coid,sym,at FROM live_fills WHERE COALESCE(fee_known,0)=0 AND qty>0 ORDER BY at DESC LIMIT 1000",
      ).filter((x) => isOwnCoid(x.coid, s.connId) ||
        (x.coid.startsWith("lanefill-") && isOwnCoid(x.coid.slice("lanefill-".length), s.connId)));
      const symbols = [...new Set(pendingFees.map((x) => x.sym))].sort();
      if (symbols.length) {
        Lm.feeSyncAt = Date.now();
        const sym = symbols[(Lm.feeCursor ?? 0) % symbols.length];
        Lm.feeCursor = (Lm.feeCursor ?? 0) + 1;
        try {
          const history = await ex.feeHistory(sym, Math.min(...pendingFees.filter((x) => x.sym === sym).map((x) => x.at)) - 60_000);
          if (alive()) {
            const updated = reconcileVenueFees(rt.db, history, (coid) => isOwnCoid(coid, s.connId));
            liveKvSet(rt.db,"liveFeeStatus",{at:Date.now(),symbol:sym,updated,pending:pendingFees.length-updated,error:null});
          }
        } catch (error) {
          if (alive()) liveKvSet(rt.db,"liveFeeStatus",{at:Date.now(),symbol:sym,updated:0,pending:pendingFees.length,error:errText(error)});
        }
      }
    }
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
    // a ban pauses the step only through the signed endpoint it names: a public market-data ban (klines, tickers) is
    // held to its own endpoint, and a message naming none is never noted as a ban of every call ("*" — a klines ban
    // stored there paused the whole step, exits and stop repairs included: x01, 14 Oct, 88 bans in 13 h)
    const ep = bx.namedEndpoint(status.error);
    const noted = ep ? bx.noteRateLimit(status.error) : 0;
    const until = ep && !bx.isMarketData(ep) ? noted : 0;
    if (until) {
      status.reason = `exchange rate limit until ${new Date(until).toISOString()}`;
      const L = local(rt);
      if (L.rateLimitLogged !== until) {
        L.rateLimitLogged = until;
        rt.db.event("warn", `live control paused: ${status.reason}`);
      }
    } else rt.db.event("error", `live control step: ${status.error}`);
  }
  if (!alive()) delete status.account;
  carryAccount(rt, status, ex);
  liveKvSet(rt.db, "liveStatus", status);
  rt.emit?.("live");
  return status;
}

/**
 * A step that ended before its account read (gates, errors) still shows the last account read of the connection,
 * with that read's time — never no account, never a stand-in.
 */
function carryAccount(rt: CoreRuntime, status: LiveStatus, ex: ExchangeClient) {
  if (status.account) return;
  const last = accountSeen.get(ownershipFingerprint(rt.settings.live.connId, ex));
  if (!last) return;
  const a = last.snap;
  status.account = {
    openNet: a.unrealized,
    margin: a.usedMargin,
    wallet: a.wallet,
    equity: a.equity,
    availableMargin: a.availableMargin,
    realized: a.realized,
    source: "exchange",
    base: budgetBase(a),
    readAt: last.at,
    overall: a.realized + a.unrealized,
    positions: 0,
    orders: 0,
    at: last.at,
    carried: true,
  };
}

function done(rt: CoreRuntime, status: LiveStatus, reason: string, ex?: ExchangeClient): LiveStatus {
  status.reason = reason;
  if (ex) carryAccount(rt, status, ex);
  liveKvSet(rt.db, "liveStatus", status);
  rt.emit?.("live");
  return status;
}
