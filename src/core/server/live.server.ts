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
import { signalRangeOf } from "../signal-config.ts";
import { kindOfId, parseConfigId } from "../pipeline/pipeline.ts";
import { signalStopAt, isSignalConfig, SIGNAL_STOP_MAX } from "../sim/trailing.ts";
import { positionMult, runSubset, type WalkForwardResult } from "../sim/walkforward.ts";
import type { CoreRuntime, LiveIntent } from "./runtime.server.ts";
import type { CoreDb } from "./db.server.ts";
import { attributeLanes, laneKeyOf, type LaneOpen, type LaneStepInput, type LaneTrade } from "../live-record.ts";
import {
  coveredLanes,
  goneOrderOf,
  planLaneOrders,
  swapCount,
  trimLaneOrders,
  type LaneOrder,
  type LaneWant,
} from "./lane-orders.ts";
import * as bx from "../exchange/bingx.server.ts";
import { exchangePositionLimit, type LiveSettings } from "../config.ts";
import { promoteLaneKey, validPromotedLaneProof } from "../live-promote.ts";
import { promotionStatus, type LiveGate } from "../live-validation.ts";
import {
  BACKSTOP_MAX_DIST,
  controlOwnership,
  capHeldToOwn,
  ownLedger,
  controlTargets,
  externalCloses,
  isForeign,
  isOwnCoid,
  ownCoidKind,
  tpDistFor,
  tpFits,
  closedBy,
  laneCountsByKey,
  liveNetwork,
  entryCoidKind,
  makeCoid,
  MIN_RAISE_UNIT_X,
  minRaiseBlock,
  ownSymbols,
  outsideCloseOf,
  planControl,
  planLive,
  scaleToBudgets,
  scaleToExposure,
  scaleToRisk,
  positionCapFor,
  accountGrowthBlock,
  topConfigLanes,
  stateHash,
  type BookView,
  type ControlAction,
  type ControlContribution,
  type ControlTarget,
} from "./live.ts";

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
 * live.plainOnly (only lanes Block did not raise) and live.source. `validLane`: sendable, and a validated config —
 * an engine config of the current selection, or a signal active on its symbol (no selection yet = every lane).
 */
export function liveLaneFilter(
  s: Pick<LiveSettings, "kinds" | "source" | "excludeRanges" | "excludeConfigs" | "plainOnly" | "promotedLanes">,
  selected: ReadonlySet<string> | null,
  sigActive: { has(k: string): boolean } | null | undefined,
  /** live.engineProofN: the engine configs proven by their own closes (null = the proof is off) */
  proven: ReadonlySet<string> | null = null,
  promotion?: (l: Pick<ControlContribution, "cfg" | "sym" | "side">) => boolean,
): {
  sendable: (
    l: Pick<ControlContribution, "cfg" | "vol" | "blockVol"> &
      Partial<Pick<ControlContribution, "sym" | "side">>,
  ) => boolean;
  validLane: (l: Pick<ControlContribution, "cfg" | "vol" | "blockVol" | "sym" | "side">) => boolean;
  /** live.excludeConfigs names the lane's family: its lanes never add volume, and a held key of them is closed */
  closedConfig: (l: Pick<ControlContribution, "cfg">) => boolean;
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
  const closedConfig = (l: Pick<ControlContribution, "cfg">) =>
    !!exConfigs && configExcluded(l.cfg, exConfigs);
  const sendable = (
    l: Pick<ControlContribution, "cfg" | "vol" | "blockVol"> &
      Partial<Pick<ControlContribution, "sym" | "side">>,
  ) => {
    const c = cfgInfo(l.cfg);
    if (liveKinds && !liveKinds.has(c.kind)) return false;
    if (exRanges && rangeExcluded(l.cfg, exRanges)) return false;
    if (closedConfig(l)) return false;
    if (s.plainOnly && (l.blockVol ?? l.vol ?? 1) > 1 + 1e-9) return false;
    if (src !== "all" && c.isSig !== (src === "signals")) return false;
    if (!c.isSig && s.promotedLanes !== undefined) {
      const proof = l.sym && l.side ? referenceProofs?.get(promoteLaneKey({ cfg: l.cfg, sym: l.sym, side: l.side })) : undefined;
      if (!validPromotedLaneProof(proof)) return false;
    }
    // the engine proof: an engine config not proven by its own closes trades on paper only
    if (proven && !c.isSig && !proven.has(l.cfg)) return false;
    return true;
  };
  const validLane = (l: Pick<ControlContribution, "cfg" | "vol" | "blockVol" | "sym" | "side">) => {
    if (!sendable(l)) return false;
    if (promotion && !promotion(l)) return false;
    const c = cfgInfo(l.cfg);
    // A Signal needs its exact config × symbol × direction evidence even without an engine selection filter.
    return c.isSig
      ? !sigActive || signalActiveHas(sigActive, c.bot, c.ind, l.sym, l.side, c.kind, l.cfg)
      : !selected || selected.has(l.cfg);
  };
  return { sendable, validLane, closedConfig };
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
      const { sendable } = liveLaneFilter(s, null, null);
      const sub = runSubset(
        { ...sim, openAtEnd: [] },
        (t) =>
          !narrowed ||
          sendable({
            cfg: t.cfg,
            sym: t.sym,
            side: t.side,
            vol: t.mult ?? 1,
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

/** Everything the executor needs from an exchange. The default is BingX; tests inject a simulated exchange. */
export interface ExchangeClient {
  hasKeys(): boolean;
  /** identity of the connection: conn id, network, host and a one-way fingerprint of the API key (never the key) */
  fingerprint(): string;
  /** `fresh`: a book shared with other processes is only reused when read after `notBefore` and within `maxAgeMs` */
  book(fresh?: { notBefore: number; maxAgeMs: number }): Promise<BookView>;
  contracts(): Promise<Map<string, bx.ContractSpec>>;
  order(p: Record<string, string | number>): Promise<unknown>;
  cancel(venueSymbol: string, orderId: string): Promise<boolean>;
  setPositionMode?(mode: "hedge" | "oneway"): Promise<void>;
  setMarginMode?(venueSymbol: string, mode: "cross" | "isolated"): Promise<void>;
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
  const feeRaw = o.commission ?? o.fee;
  const feeNum = feeRaw === undefined || feeRaw === null || feeRaw === "" ? NaN : Math.abs(Number(feeRaw));
  const fee = Number.isFinite(feeNum) ? feeNum : null;
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
const executionMsg = (resp: unknown, sentQty: number, positionSeen = false): string | null => {
  const o = orderReply(resp);
  const status = String(o?.status ?? "").toUpperCase();
  const terminal = /^(FILLED|CANCELLED|CANCELED|REJECTED|EXPIRED)$/.test(status);
  // MARKET accepted without fill fields is unresolved, not an open/closed full-sized venue position.
  const measuredQty = replyQty(o);
  return pendingExecution(resp) || (!terminal && (measuredQty === null || measuredQty === 0))
    ? PENDING_EXECUTION + JSON.stringify({ oid: String(o?.orderId ?? ""), sentQty, positionSeen })
    : null;
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
  { at: number; book: BookView; dirty: boolean; touchedAt: number }
>();
const contractCache = new Map<string, { at: number; specs: Map<string, bx.ContractSpec> }>();
const accountCache = new Map<string, { at: number; snap: bx.AccountSnapshot | null }>();
/** the account balance (sizing, status) is re-read at most once a minute */
const ACCOUNT_MS = 60_000;
export function cachedClient(ex: ExchangeClient, syncMs: number): ExchangeClient {
  const key = () => ex.fingerprint();
  const touch = () => {
    const c = bookCache.get(key());
    if (c) {
      c.dirty = true;
      c.touchedAt = Date.now();
    }
  };
  return {
    ...ex,
    book: async (fresh) => {
      const c = bookCache.get(key());
      // a caller may ask for a fresher book than syncMs (orders about to go out): the cache serves only within both
      const maxAge = Math.min(syncMs, fresh?.maxAgeMs ?? Infinity);
      const notBefore = Math.max(c?.touchedAt ?? 0, fresh?.notBefore ?? 0);
      if (c && !c.dirty && Date.now() - c.at < maxAge && c.at >= notBefore) return c.book;
      // a book another process read is fine when it was read after our own last order or cancel
      const touchedAt = c?.touchedAt ?? 0;
      const book = await ex.book({ notBefore, maxAgeMs: maxAge });
      bookCache.set(key(), { at: Date.now(), book, dirty: false, touchedAt });
      return book;
    },
    ...(ex.account
      ? {
          account: async () => {
            const c = accountCache.get(key());
            if (c && Date.now() - c.at < ACCOUNT_MS) return c.snap;
            const snap = await ex.account!();
            accountCache.set(key(), { at: snap?.at ?? Date.now(), snap });
            return snap;
          },
        }
      : {}),
    contracts: async () => {
      const c = contractCache.get(key());
      if (c && Date.now() - c.at < 600_000) return c.specs;
      let specs: Map<string, bx.ContractSpec>;
      try {
        specs = await ex.contracts();
      } catch (err) {
        // a failed or late refresh never stops the step: the last good list serves (lot steps and minimums change
        // rarely); without one the step reports the error as before
        if (c) return c.specs;
        throw err;
      }
      // an empty list is an outage (every host failed), not "no contracts": never cached, the last good list serves
      if (specs.size) contractCache.set(key(), { at: Date.now(), specs });
      else if (c) return c.specs;
      return specs;
    },
    order: async (p) => {
      touch();
      try {
        return await ex.order(p);
      } finally {
        touch();
      }
    },
    cancel: async (sym, id) => {
      touch();
      try {
        return await ex.cancel(sym, id);
      } finally {
        touch();
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
    book: (fresh) => bx.fetchBook(network, connId, fresh),
    contracts: () => bx.fetchContracts(network),
    order: (p) => bx.signed(network, connId, "POST", "/openApi/swap/v2/trade/order", p),
    cancel: (sym, id) => bx.cancelOrder(network, connId, sym, id),
    setPositionMode: (mode) => bx.setPositionMode(network, connId, mode),
    setMarginMode: (sym, mode) => bx.setMarginMode(network, connId, sym, mode),
    leverage: (sym) => bx.fetchLeverage(network, connId, sym),
    setLeverage: (sym, side, lev) => bx.setLeverage(network, connId, sym, side, lev),
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
  };
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
let observedAccount = new WeakMap<CoreRuntime, { connId: string; at: number; balance: number | null; equity: number | null; paper: boolean }>();
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
  const sz = sizingSettings(rt.settings.sizing);
  const paper = !ex.account && !ex.equity;
  const observe = (balance: number | null, equity: number | null, at = Date.now()) => {
    if (!Number.isFinite(at) || Date.now() - at > EQUITY_MAX_AGE) {
      balance = null;
      equity = null;
    }
    observedAccount.set(rt, { connId: s.connId, at, balance, equity, paper });
    if (sz.mode !== "equityPct") return s.notionalUsd;
    return balance === null ? null : unitNotional(sz, balance, s.notionalUsd);
  };
  // Overall mode already read this snapshot. Reading equity again could size at yesterday's high balance while
  // the budgets use today's smaller account (and left minQty/fixed previews showing the paper balance).
  if (snapshot !== undefined && ex.account)
    return observe(usableBalance(snapshot?.wallet), usableEquity(snapshot?.equity), snapshot?.at ?? accountCache.get(ex.fingerprint())?.at ?? Date.now());
  if (paper) {
    const balance = usableBalance(rt.settings.paperBalance);
    return observe(balance, balance ?? null);
  }
  if (sz.mode !== "equityPct") return s.notionalUsd;
  if (ex.account) {
    try {
      const account = await ex.account();
      return observe(usableBalance(account?.wallet), usableEquity(account?.equity), account?.at ?? accountCache.get(ex.fingerprint())?.at ?? Date.now());
    } catch {
      return observe(null, null);
    }
  }
  const k = ex.fingerprint();
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
} {
  const s = rt.settings.live;
  const sz = sizingSettings(rt.settings.sizing);
  const seen = observedAccount.get(rt);
  const current = seen && seen.connId === s.connId && Date.now() - seen.at <= EQUITY_MAX_AGE ? seen : null;
  const balance = current?.balance ?? null;
  const equity = current?.equity ?? null;
  if (sz.mode === "minQty") return { unit: s.notionalUsd, from: "minQty", balance, equity };
  if (sz.mode !== "equityPct") return { unit: s.notionalUsd, from: "fixed", balance, equity };
  if (balance !== null)
    return { unit: unitNotional(sz, balance, s.notionalUsd), from: current?.paper ? "paper" : "balance", balance, equity };
  return { unit: 0, from: "unknown", balance: null, equity };
}

/** The control sizing of the live settings for one lane unit — shared by the live step and the preview. */
/** Legacy USD ceilings are intentionally ignored; only optional balance-relative limits can constrain sizing. */
export function positionCapOf(_s: Pick<LiveSettings, "maxNotionalUsd" | "notionalUsd">): number {
  return Infinity;
}

export function controlSettingsOf(s: LiveSettings, unit: number) {
  return {
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
  /** own stops / take-profits placed quantity-bounded (no closePosition) on a key holding someone else's excess */
  bounded: Set<string>;
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
  msg?: string | null;
}
const CTL_RELOAD_MS = 60_000;
/** The control rows (memory mirror of live_orders, re-read every minute). */
export function controlRows(rt: { db: CoreDb }): Map<string, ControlRow> {
  const L = local(rt);
  if (!L.ctl || Date.now() - L.ctl.at > CTL_RELOAD_MS) {
    const rows = new Map<string, ControlRow>();
    for (const r of rt.db.all<ControlRow & { coid: string }>(
      "SELECT coid, substr(cfg, 9) AS k, kind, status, qty, px, at, msg FROM live_orders WHERE cfg LIKE 'control|%' ORDER BY at, rowid",
    ))
      rows.set(r.coid, { k: r.k, kind: r.kind, status: r.status, qty: r.qty, px: r.px, at: r.at, msg: r.msg });
    L.ctl = { at: Date.now(), rows };
  }
  return L.ctl.rows;
}
/** A control row written: the mirror follows the table (INSERT OR REPLACE moves the row to the end). */
function noteControlRow(rt: { db: CoreDb }, coid: string, row: ControlRow) {
  const L = local(rt);
  if (!L.ctl) return;
  // A cumulative execution update keeps its original order time and sequence; polling is not a new entry.
  if (L.ctl.rows.get(coid)?.at !== row.at) L.ctl.rows.delete(coid);
  L.ctl.rows.set(coid, row);
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
      bounded: new Set(),
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
/**
 * lane orders are trimmed for room only this many orders above the line new ones are placed up to: one over it (a
 * new position's backstop, an order the book read showed before its cancel) trimmed one order every step and the
 * next step placed it again — x02, 7 Oct: a cancel and a place every second
 */
const VENUE_TRIM_SLACK = 2;
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
  /** The exchange's USDT account fields; null when no account snapshot is available. */
  wallet: number | null;
  equity: number | null;
  availableMargin: number | null;
  realized: number | null;
  source: "exchange" | "positions";
  /** unrealized PnL of the positions actually open, USDT */
  openNet: number;
  /** margin those positions are using, USDT */
  margin: number;
  /** realized + open, USDT; null until a balance read */
  overall: number | null;
  positions: number;
  orders: number;
  at: number;
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
): Promise<bx.AccountSnapshot | null> {
  let snap: bx.AccountSnapshot | null = null;
  if (ex.account) {
    try {
      snap = await ex.account();
    } catch {
      /* the position sums still describe the open book */
    }
  }
  status.account = liveAccount(book, snap, snap?.at ?? (snap ? accountCache.get(ex.fingerprint())?.at : undefined) ?? Date.now());
  return snap;
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
  const next: Promise<LiveStatus> = prev.then(() =>
    (rt.settings.live.mode ?? "overall") === "overall"
      ? runControl(
          rt,
          gen,
          client ??
            cachedClient(bingxClient(rt.settings.live.connId), rt.settings.live.syncMs ?? 1000),
        )
      : runStep(rt, intents, gen),
  );
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

const intentKey = (i: { cfg: string; sym: string; barT: number }) => `${i.cfg}|${i.sym}|${i.barT}`;

async function runStep(rt: CoreRuntime, intents: LiveIntent[], gen: number): Promise<LiveStatus> {
  const s = rt.settings.live;
  // entries mode reads the book over REST: with nothing new to send it runs at most every syncMs, not every tick
  const L = local(rt);
  const fresh = intents.filter((i) => !L.entriesSent.has(intentKey(i)));
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
  const alive = () => rt.generation === gen && (rt.liveEpoch ?? 0) === epoch;
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
  type EntryExecution = { oid: string; cfg: string; sym: string; side: number; kind: "E" | "C"; sentQty: number; px: number; key: string; at: number; stopDist?: number; terminal?: boolean; closedQty?: number; polledAt?: number; positionSeen?: boolean; wasFlat?: boolean; unresolved?: boolean };
  const pendingKey = `entriesPendingExecutions|${s.connId}`;
  const pending = { ...(liveKv<Record<string, EntryExecution>>(rt.db, pendingKey) ?? {}) };
  const pendingJson = () => JSON.stringify(Object.fromEntries(Object.entries(pending).map(([coid, { polledAt: _poll, ...p }]) => [coid, p])));
  let savedPending = pendingJson();
  const savePending = () => {
    const json = pendingJson();
    if (json !== savedPending) {
      // The in-memory DB may crash between snapshots. This metadata is part of the order journal, written before
      // MARKET submission, so the restored qty=0 intent can recover sentQty and query its original client id.
      rt.db.runDurable("INSERT OR REPLACE INTO kv (k, v, at) VALUES (?, ?, ?)", pendingKey, json, Date.now());
      savedPending = json;
    }
    liveKvSet(rt.db, pendingKey, pending);
  };
  const settled = (
    coid: string, cfg: string, sym: string, side: number, kind: "E" | "C", sentQty: number,
    px: number, key: string, at: number, resp: unknown,
  ) => {
    const previousClose = kind === "C" ? rt.db.get<{ qty: number; status: string }>("SELECT qty,status FROM live_orders WHERE coid=?", coid) : null;
    const qty = executedQty(resp, sentQty);
    const waiting = pendingExecution(resp);
    const venueAt = Number(orderReply(resp)?.updateTime ?? orderReply(resp)?.time);
    let executedAt = at;
    if (kind === "C" && qty > 0) executedAt = Number.isFinite(venueAt) && venueAt >= at ? venueAt : Date.now();
    record(coid, cfg, sym, side, kind, qty, px, qty > 0 ? "ok" : waiting ? "pending" : "error", key, executedAt);
    if (kind === "C") {
      let closed = Math.max(0, qty - (previousClose && (previousClose.status === "ok" || previousClose.status === "pending") ? previousClose.qty : 0));
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
    const f = qty > 0 ? parseFill(resp) : null;
    if (f) {
      const fee = cumulativeFillFee(rt.db, coid, sym, side, kind, qty, f);
      rt.db.runDurable(
        "INSERT OR REPLACE INTO live_fills (coid, sym, side, kind, qty, ref_px, fill_px, fee, fee_known, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        coid, sym, side, kind, qty, px, f.px,
        fee.fee, fee.known, executedAt,
      );
    }
    // A terminal fill can precede the position endpoint too. Retain its known ownership until first observed;
    // terminal means there is no unfilled remainder to reserve or poll, rather than pretending it never filled.
    const awaitingPosition = kind === "E" && qty > 0 && !pending[coid]?.positionSeen && !pending[coid]?.wasFlat;
    if (waiting || awaitingPosition) pending[coid] = { ...pending[coid], terminal: !waiting,
      oid: String(orderReply(resp)?.orderId ?? pending[coid]?.oid ?? ""), cfg, sym, side, kind, sentQty, px, key, at, polledAt: Date.now() };
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
    let book: BookView | null = null;
    let account: bx.AccountSnapshot | null = null;
    if (s.enabled && envArmed && hasKeys) {
      try {
        book = await bx.fetchBook(network, s.connId);
        account = await stampAccount(status, bingxClient(s.connId), book);
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
            if (visible) delete pending[coid];
            continue; // terminal fill: no venue remainder, and a lagging book is never proof of closure
          }
        }
        if (Date.now() - (p.polledAt ?? 0) < 1_000) continue;
        p.polledAt = Date.now();
        try {
          const resp = await bx.signed(network, s.connId, "GET", "/openApi/swap/v2/trade/order", {
            symbol: p.sym, ...(p.oid ? { orderId: p.oid } : { clientOrderID: coid }),
          });
          const reply = orderReply(resp);
          // A MARKET acknowledgement has a legacy missing-quantity fallback; an unmeasured GET response is
          // never proof that a pending order filled. A lagging cumulative read must not erase an earlier fill.
          if (replyQty(reply) === null && String(reply?.status ?? "").toUpperCase() !== "FILLED") continue;
          const cumulative = executedQty(resp, p.sentQty);
          if (cumulative < before - 1e-12) continue;
          if (p.kind === "E" && p.wasFlat && (cumulative > before + 1e-12 || !pendingExecution(resp))) {
            p.unresolved = true;
            continue; // keep the known partial and its price; the missing close chronology must be reconciled
          }
          const got = settled(coid, p.cfg, p.sym, p.side, p.kind, p.sentQty, p.px, p.key, p.at, resp);
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
      if (changed) book = await bx.fetchBook(network, s.connId, { notBefore: Date.now(), maxAgeMs: 0 });
      for (const [coid, p] of Object.entries(pending))
        if (p.terminal && book.positions.some((b) => b.venueSymbol === p.sym &&
          (oneway || (p.side > 0) === (b.side === "long")) && b.qty > 0)) delete pending[coid];
      savePending();
    }
    const sim = rt.sim;
    const minPf = rt.settings.gates.minPf;
    const ready = !sim
      ? { ok: false, why: "no simulated run yet" }
      : s.requireReady === false
        ? { ok: true, why: "" }
        : liveReadiness(sim, s, minPf);
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
    // every intent ever recorded (pending, ok or error) is never sent again
    const sent = new Set(
      rt.db.all<{ k: string }>("SELECT msg AS k FROM live_orders WHERE kind = 'E'").map((r) => r.k),
    );
    const L = local(rt);
    for (const i of intents) if (sent.has(intentKey(i))) L.entriesSent.add(intentKey(i));
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
        managed: i.protect.trail > 0 || (i.kind !== undefined && i.kind !== "normal"),
        coordVol: i.coordVol,
        hedge: i.hedge,
        hedgeVol: i.hedgeVol,
      })),
    });
    status.enabled = plan.enabled;
    status.reason = plan.reason;
    status.skipped = plan.skipped;
    const unresolved = new Set(Object.values(pending).filter((p) => p.unresolved).map((p) => `${p.sym}|${oneway ? 0 : p.side > 0 ? 1 : -1}`));
    if (unresolved.size) {
      status.reason += " — execution chronology unresolved; key held";
      for (const key of unresolved) status.skipped.push({ sym: key.split("|")[0], why: "execution chronology unresolved; key held" });
      plan.entries = plan.entries.filter((e) => !unresolved.has(`${e.sym}|${oneway ? 0 : e.side}`));
    }
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
    // clean-up: own stop/target orders on a (symbol, side) that is flat now
    for (const o of book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId)) continue;
      if (!o.id || book.positions.some((p) => p.venueSymbol === o.venueSymbol && sameSide(o, p))) continue;
      if ([...unseenPartial].some(([key, qty]) => {
        const [sym, side] = key.split("|");
        return qty > 0 && sym === o.venueSymbol && (oneway || !o.positionSide || (o.positionSide === "LONG") === (Number(side) > 0));
      })) continue; // confirmed fills keep their protection while their position endpoint has never shown them
      if (await bx.cancelOrder(network, s.connId, o.venueSymbol, o.id)) status.cancelled++;
    }

    // protection pass: an own position without own stop (e.g. an entry whose reply timed out) gets a
    // protective close at market — entries mode never leaves a position unprotected across steps
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
      const c = makeCoid(s.connId, "C");
      const closeAt = Date.now();
      try {
        record(c, "protect", p.venueSymbol, p.side === "long" ? 1 : -1, "C", 0, 0, "pending", "unprotected position closed", closeAt);
        pending[c] = { oid: "", cfg: "protect", sym: p.venueSymbol, side: p.side === "long" ? 1 : -1,
          kind: "C", sentQty: p.qty, px: 0, key: "unprotected position closed", at: closeAt, polledAt: Date.now() };
        savePending();
        const resp = await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
          symbol: p.venueSymbol,
          side: p.side === "long" ? "SELL" : "BUY",
          positionSide: oneway ? "BOTH" : p.side === "long" ? "LONG" : "SHORT",
          type: "MARKET",
          quantity: p.qty,
          clientOrderID: c,
          ...reduceOnly,
        });
        const got = settled(c, "protect", p.venueSymbol, p.side === "long" ? 1 : -1, "C", p.qty, 0, "unprotected position closed", closeAt, resp);
        if (got.qty >= p.qty - 1e-12) status.closed++;
      } catch (err) {
        record(c, "protect", p.venueSymbol, p.side === "long" ? 1 : -1, "C", 0, 0,
          err instanceof bx.ExchangeRejected ? "error" : "pending", "unprotected position closed", closeAt);
        if (!(err instanceof bx.ExchangeRejected)) {
          pending[c] = { oid: "", cfg: "protect", sym: p.venueSymbol, side: p.side === "long" ? 1 : -1,
            kind: "C", sentQty: p.qty, px: 0, key: "unprotected position closed", at: closeAt, polledAt: Date.now() };
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
      const signalRange = isSignalInd(ind) ? signalRangeOf(ind) : null;
      const rangeFactor = signalRange
        ? rt.settings.signals.rangeVolumeFactors[signalRange] ?? 1
        : rangeVolumeFactors[rangeOfId(e.cfg) || "wide"] ?? 1;
      // Apply the per-range multiplier before the same per-position, account, and aggregate-risk checks as normal size.
      const coordFactor = e.coordVol ?? 1;
      const hedgeFactor = e.hedge ? (e.hedgeVol ?? 1) : 1;
      // Coordination multipliers are captured when the intent is validated; all account and position caps still gate size.
      const unit = Math.min(raw * rangeFactor * coordFactor * hedgeFactor, cap);
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
        ? Math.min(22, Math.max(1, Math.round(e.volFactor!)))
        : 1;
      const intentUnit = Math.min(unit * intentFactor, cap);
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
      const signalEntry = isSignalConfig(e.cfg);
      const stopPx = bx.stopPxExchange(px, e.side, signalEntry ? Math.min(e.sl, SIGNAL_STOP_MAX) : e.sl, spec, venueMins(rt).get(e.sym)?.stop ?? 0, signalEntry ? SIGNAL_STOP_MAX : Infinity);
      const stopDist = Math.max(0, e.side * (px - stopPx) / px);
      if (signalEntry && (!(Number.isFinite(stopPx) && stopPx > 0) || stopDist > SIGNAL_STOP_MAX + 1e-12)) {
        status.skipped.push({ sym: e.sym, why: "Signal venue stop minimum exceeds the 2% entry cap" });
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
      const key = `${e.cfg}|${e.sym}|${e.barT}`;
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
        savePending();
        const resp = await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
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
          err instanceof bx.ExchangeRejected ? "error" : "pending",
          key,
          entryAt,
        );
        if (!(err instanceof bx.ExchangeRejected)) {
          pending[coid] = { oid: "", cfg: e.cfg, sym: e.sym, side: e.side, kind: "E", sentQty: qty,
            px, key, at: entryAt, stopDist, polledAt: Date.now() };
        } else delete pending[coid];
        savePending();
        rt.db.event(
          "error",
          `live entry ${e.sym}: ${err instanceof Error ? err.message : err} — state unknown, re-checked next step`,
        );
        continue;
      }
      // the stop at a distance the venue accepts (its own tick, at least), the target by precision alone
      const sl = bx.stopPxExchange(entryPx, e.side, signalEntry ? Math.min(e.sl, SIGNAL_STOP_MAX) : e.sl, spec, venueMins(rt).get(e.sym)?.stop ?? 0, signalEntry ? SIGNAL_STOP_MAX : Infinity);
      const tp = bx.snapPx(e.side === 1 ? entryPx * (1 + e.tp) : entryPx * (1 - e.tp), spec);
      let protectedOk = true;
      for (const [kind, type, stopPrice] of [
        ["S", "STOP_MARKET", sl],
        ["T", "TAKE_PROFIT_MARKET", tp],
      ] as const) {
        let c = makeCoid(s.connId, kind);
        let sp = stopPrice;
        const placeExit = (cc: string, p: number) =>
          bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
            symbol: e.sym,
            side: exitSide,
            positionSide,
            type,
            quantity: qty,
            stopPrice: p,
            closePosition: "true",
            workingType: "MARK_PRICE",
            clientOrderID: cc,
          });
        try {
          if (kind === "T" && !(e.tp > 0)) continue;
          if (kind === "S" && signalEntry &&
            (!(Number.isFinite(sp) && sp > 0) || e.side * (entryPx - sp) / entryPx > SIGNAL_STOP_MAX + 1e-12))
            throw new Error("Signal actual-fill stop cannot meet the 2% entry cap");
          try {
            await placeExit(c, sp);
          } catch (err) {
            // too close to the mark: widen once. Below, a failed protective order closes the position we have just
            // opened, so one retry here is the difference between a protected entry and a round trip paid for nothing.
            const msg = err instanceof Error ? err.message : String(err);
            if (kind !== "S" || !bx.stopTooClose(msg)) throw err;
            const wider = bx.widenStopDist(signalEntry ? Math.min(e.sl, SIGNAL_STOP_MAX) : e.sl, entryPx, spec);
            learnVenueMin(rt, e.sym, "stop", wider);
            record(c, e.cfg, e.sym, e.side, kind, qty, sp, "error", key);
            sp = bx.stopPxExchange(entryPx, e.side, wider, spec, wider, signalEntry ? SIGNAL_STOP_MAX : Infinity);
            if (signalEntry && (!(Number.isFinite(sp) && sp > 0) || e.side * (entryPx - sp) / entryPx > SIGNAL_STOP_MAX + 1e-12))
              throw new Error("Signal stop retry would exceed the 2% entry cap");
            c = makeCoid(s.connId, kind);
            await placeExit(c, sp);
            rt.db.event(
              "warn",
              `live S ${e.sym}: stop was too close — placed at ${sp} (${(wider * 100).toFixed(2)} %)`,
            );
          }
          record(c, e.cfg, e.sym, e.side, kind, qty, sp, "ok", key);
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
          const resp = await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
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
  /** a kind / range the operator does not send (live.kinds, live.excludeRanges, live.plainOnly, live.source) */
  notSent: number;
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
}

/** The completeness summary of a control step: every paper key, with the reason the ones without a target lack it. */
export function keyFunnel(
  funnel: ReadonlyMap<string, KeyFunnel>,
  targets: ReadonlyArray<{ key: string }>,
  skipped: ReadonlyArray<{ sym: string; why: string }>,
): KeyFunnel[] {
  const tk = new Set(targets.map((t) => t.key));
  const skipWhy = new Map(skipped.map((x) => [x.sym, x.why] as const));
  const out: KeyFunnel[] = [];
  for (const f of funnel.values()) {
    const x: KeyFunnel = { ...f, target: tk.has(f.key) };
    if (!x.target && !x.why) {
      const kept = x.sent - x.budget;
      x.why =
        x.sent === 0
          ? x.notSent >= Math.max(x.chased, x.notSelected, x.suppressed)
            ? "not sent (live kinds / ranges)"
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
  // a lane whose stop was crossed at tick time no longer asks for its volume (its stop executes live now)
  const out: ControlContribution[] = [];
  const rangeVolumeFactors = rangeVolumeFactorsOf(rt.settings.grid);
  for (const p of positions) {
    // Preserve the immutable position identity used by laneStringsOf's hot-path cache.
    // Projection is read-only; legacy wide Signal stops are bounded without cloning every lane per tick.
    const stop = isSignalConfig(p.cfg) ? signalStopAt(p.entry, p.side, p.stop) : p.stop;
    if (p.stopHit) continue;
    const ls = laneStringsOf(p);
    const id = ls.id;
    const ind = p.cfg.split("|")[1] ?? "";
    const signalRange = isSignalInd(ind) ? signalRangeOf(ind) : null;
    const rangeFactor = signalRange
      ? rt.settings.signals.rangeVolumeFactors[signalRange] ?? 1
      : rangeVolumeFactors[rangeOfId(p.cfg) || "wide"] ?? 1;
    const vol = (p.vol ?? 1) * rangeFactor;
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
    const externalUnits = legsN > 0 || (p.level ?? 0) > 0 || p.w !== undefined;
    const intrinsic = p.w ?? 1;
    const multiplier = positionMult(p);
    const unitsKnown = Number.isFinite(intrinsic) && intrinsic > 0 && Number.isFinite(multiplier) && multiplier > 0;
    const c = (lid: string, v: number, legacy: string): ControlContribution => {
      const x: ControlContribution = {
        id: lid,
        cfg: p.cfg,
        sym: p.sym,
        side: p.side,
        vol: v,
        blockVol: v / (p.volFactor ?? 1),
        sl,
        risk,
        chase,
      };
      if (externalUnits) x.laneUnits = unitsKnown ? v / intrinsic : NaN;
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

/** The position's backstop: an own order that is not a take-profit (T) nor a lane order (V / Y). */
export const isBackstopKind = (kind: string) => !!kind && kind !== "T" && kind !== "V" && kind !== "Y";

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
      "INSERT OR REPLACE INTO live_lane_trades (id, exit_t, cfg, sym, side, entry_t, entry, exit, r, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
    );
  liveKvSet(rt.db, "liveLaneOpen", open, true);
  return closed;
}

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
  const alive = () => rt.generation === gen && (rt.liveEpoch ?? 0) === epoch;
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
  // the keys of `external` closed by the exchange's take-profit or by hand (the rest: by its stop)
  const externalWhy = new Map<string, "target" | "hand">();
  // this step's flat markers per key: priced at the close the step attributes to the key (`external`) once known, so
  // the ledger's statistics book the exit the exchange made (statistics.ts liveTrades)
  const flatRows = new Map<string, { coid: string; msg: string }>();
  const pendingKeys = new Set<string>();
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
  ) => {
    if (!(qty > 0)) return;
    const f = parseFill(resp);
    if (f && f.px > 0) (kind === "O" || kind === "I" ? grew : shrank).set(`${a.sym}|${a.side}`, f.px);
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
      Date.now(),
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
    noteControlRow(rt, coid, { k: a.key, kind, status: st, qty, px, at, msg });
  };
  const protectiveCloseResult = (
    coid: string, a: { key: string; sym: string; side: number }, qty: number, px: number, reply: unknown, why: string, seen = false,
  ) => {
    const got = executedQty(reply, qty);
    const pending = executionMsg(reply, qty, seen);
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
    if (!s.enabled) return done(rt, status, "live disabled in settings");
    if (!envArmed) return done(rt, status, "CTS_CORE_LIVE=1 not set on the host");
    if (!ex.hasKeys()) return done(rt, status, `no API keys for ${s.connId}`);
    const banned = bx.blockingBanUntil();
    if (banned)
      return done(rt, status, `exchange rate limit until ${new Date(banned).toISOString()}`);
    // readiness (rolling simulated run PF ≥ min and stable) can be waived per connection, e.g. on a testnet. Not
    // ready only blocks opening and increasing: positions already held are still closed, reduced and protected.
    const readiness = sim && s.requireReady !== false ? liveReadiness(sim, s, minPf) : null;
    const notReady = !sim
      ? "not ready: no simulated run yet"
      : readiness && !readiness.ok
        ? `not ready: ${readiness.why}`
        : null;
    const connHash = stateHash([ex.fingerprint()]);
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
    let executionChanged = false;
    for (const [coid, row] of [...ctlRows]) {
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
      try {
        const oid = pending.oid || book.orders.find((o) => (o.clientOrderId ?? "").toUpperCase() === coid.toUpperCase())?.id;
        let reply: unknown = null;
        if (oid && ex.orderStatus) reply = await ex.orderStatus(sym, oid);
        else if (ex.ordersSince) {
          const history = await ex.ordersSince(sym, row.at - 60_000);
          const orders = Array.isArray(history) ? history : (history as { orders?: unknown[] } | null)?.orders;
          reply = orders?.find((o) => String((o as Record<string, unknown>).clientOrderId ?? "").toUpperCase() === coid.toUpperCase());
        }
        const state = orderReply(reply);
        if (!state || (replyQty(state) === null && String(state.status ?? "").toUpperCase() !== "FILLED")) continue;
        const got = executedQty(reply, pending.sentQty);
        if (got < row.qty) continue; // an older cumulative reply cannot take an already-booked fill away
        const venuePending = pendingExecution(reply);
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
          ? PENDING_EXECUTION + JSON.stringify({ ...pending, oid: String(orderReply(reply)?.orderId ?? oid ?? pending.oid), positionSeen, wasFlat })
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
        // Unknown is still pending: the key cannot submit another order while the first may execute.
      }
    }
    if (executionChanged) book = await ex.book({ notBefore: Date.now(), maxAgeMs: 0 });
    for (const key of pendingKeys)
      status.skipped.push({ sym: key.split("|")[0], why: "accepted order execution pending — no duplicate action" });
    phase("account");
    const acct = await stampAccount(status, ex, book);
    // positions we opened in the last 10 minutes may not carry their stop yet (also a fill whose reply timed out);
    // with open orders from an earlier read (rate limited), every position opened since that read
    const ordersStale = book.ordersAt !== undefined;
    const recentFrom = Math.min(Date.now() - 600_000, book.ordersAt ?? Infinity);
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
    const { held, foreign } = controlOwnership(
      book,
      s.connId,
      recent,
      new Set([...ledger].filter(([, q]) => q > 0).map(([k]) => k)),
      posOneway ? "oneway" : "hedge",
    );
    // flat markers: a key the ledger still counts as ours, flat on the exchange and not opened recently (a stop-out,
    // a manual close, an open that never filled) — the ledger restarts from 0 there, so it never only grows
    const onExchange = new Set(
      book.positions.map((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`),
    );
    const stopPxOf = (k: string) => {
      let px: number | null = null;
      for (const r of ctlRows.values()) if (r.k === k && r.kind === "S" && r.status === "ok" && (r.px ?? 0) > 0) px = r.px!;
      return px;
    };
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
    // own close orders resting on a key at this step's read: its stop(s) and its take-profit(s)
    const restingOf = (k: string) => {
      const [rsym, rsd] = k.split("|");
      const out = { stopLeft: false, tpLeft: false };
      if (ordersStale) return out;
      for (const o of book.orders) {
        if (o.venueSymbol !== rsym || !isOwnCoid(o.clientOrderId, s.connId)) continue;
        if (o.positionSide && (o.positionSide === "LONG") !== (Number(rsd) === 1)) continue;
        const kind = ownCoidKind(o.clientOrderId, s.connId);
        if (kind === "T") out.tpLeft = true;
        else if (isBackstopKind(kind)) out.stopLeft = true;
      }
      return out;
    };
    // what the venue's order history says closed a side found flat (outsideCloseOf): read once per key and step, from
    // just before the previous step; null when it cannot be read (no history, a refused read)
    const outsideFrom = (prev?.at ?? Date.now() - 24 * 3_600_000) - 60_000;
    const outsideSeen = new Map<string, Promise<ReturnType<typeof outsideCloseOf>>>();
    const outsideOf = (k: string) => {
      let p = outsideSeen.get(k);
      if (!p) {
        const [osym, osd] = k.split("|");
        p = (async () => {
          if (!ex.ordersSince) return null;
          try {
            const r = await ex.ordersSince(osym, Math.min(outsideFrom, settledFlat.get(k) ?? Infinity));
            const rows = Array.isArray(r) ? r : ((r as { orders?: unknown } | null)?.orders ?? []);
            return Array.isArray(rows) ? outsideCloseOf(rows as Array<Record<string, unknown>>, Number(osd), s.connId) : null;
          } catch {
            return null;
          }
        })();
        outsideSeen.set(k, p);
      }
      return p;
    };
    // a key the exchange closed outside this system: by its stop, its take-profit or by hand — from the venue's own
    // history when it shows it (`found`), else inferred from what is left resting (closedBy) — the price the live
    // record closes its lanes at, and the reason
    const noteExternal = (
      k: string,
      px: number,
      override = false,
      found?: { why: "stop" | "target" | "hand"; px: number } | null,
    ) => {
      const by = found ?? closedBy({ ...restingOf(k), stopPx: stopPxOf(k), tpPx: tpPxOf(k), px });
      if (override || !external.has(k)) {
        external.set(k, by.px);
        if (by.why === "stop") externalWhy.delete(k);
        else externalWhy.set(k, by.why);
      }
      return by;
    };
    // (attributed once the prices are read: with both close orders gone the price tells which one filled)
    const flatKeys: string[] = [];
    for (const [k, q] of ledger)
      if (q > 0 && !onExchange.has(k) && !recent.has(k) && !pendingKeys.has(k)) {
        flatKeys.push(k);
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
        const vps = Number(vsd) === 1 ? "LONG" : "SHORT";
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
        if (ex.ordersSince)
          try {
            const r = await ex.ordersSince(vsym, openAt - 60_000);
            const rows = Array.isArray(r) ? r : ((r as { orders?: unknown } | null)?.orders ?? []);
            gone = Array.isArray(rows)
              ? (rows as Array<Record<string, unknown>>).some((o) => {
                  const coid = String(o.clientOrderId ?? "");
                  if (!isOwnCoid(coid, s.connId)) return false;
                  // the position's own closePosition stop / take-profit (a lane order or a market reduce takes a part)
                  const kd = ownCoidKind(coid, s.connId);
                  if (kd !== "T" && !isBackstopKind(kd)) return false;
                  if (!/^(STOP|TAKE_PROFIT)/.test(String(o.type ?? "").toUpperCase())) return false;
                  if (String(o.positionSide ?? "").toUpperCase() !== vps) return false;
                  if (String(o.side ?? "").toUpperCase() !== (vps === "LONG" ? "SELL" : "BUY")) return false;
                  if (!String(o.status ?? "").toUpperCase().includes("FILLED")) return false;
                  const at = Number(o.updateTime ?? o.time ?? 0);
                  return !(at > 0) || at >= openAt;
                })
              : null;
          } catch {
            gone = null;
          }
        if (gone === false) {
          Lv.ledgerVerified.add(ck);
          if (Lv.ledgerVerified.size > 2_000) Lv.ledgerVerified.clear();
          continue;
        }
        held.delete(k);
        foreign.add(posOneway ? vsym : k);
        if (gone) {
          const fid = `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
          record(fid, { key: k, sym: vsym, side: Number(vsd) }, "F", 0, 0, "ok", "own exit filled while away — the position there is not ours");
          ledger.set(k, 0);
          rt.db.event("warn", `live: ${k} — our exit filled while the desk was away; the position there now is someone else's and is never touched`);
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
              (!o.positionSide || (o.positionSide === "LONG") === (Number(lsd) === 1)),
          )
        )
          lagging.add(k);
      }
    // keys where someone else added to our position (the venue merges both into one): our stop and take-profit there
    // close only our quantity — a closePosition order would close theirs too (bug hunt, 13 Oct)
    const excessKeys = new Set<string>();
    for (const x of capHeldToOwn(held, ledger)) {
      // nothing of it is ours (our part closed): that side (one-way: the symbol) is someone else's this step — never
      // touched; our position on the other side of a hedge-mode symbol is still managed
      if (x.own === 0) foreign.add(posOneway ? x.key.split("|")[0] : x.key);
      else excessKeys.add(x.key);
      const mk = `foreign-excess|${x.key}|${x.exchange}`;
      const W = local(rt).warnedExcess;
      if (!W.has(mk)) {
        W.add(mk);
        if (W.size > 500) W.clear();
        rt.db.event(
          "warn",
          `live: ${x.key} holds ${x.exchange} on the exchange but this system opened ${x.own} — the excess is not ours and is never touched`,
        );
      }
    }
    // a closePosition stop on an excess key is replaced by a quantity-bounded one (the stop repair below places it
    // this step) and its take-profit is cancelled (none rests there: see the take-profit upkeep); a bounded stop on a
    // key that is wholly ours again goes back to closePosition the same way. Removed from this step's book so the repair sees the key without its stop.
    const Lx = local(rt);
    const cpKind = (coid: string | undefined) => {
      const k = ownCoidKind(coid, s.connId);
      return k === "T" || isBackstopKind(k);
    };
    if (!book.ordersAt)
      for (let i = book.orders.length - 1; i >= 0; i--) {
        const o = book.orders[i];
        if (!o.clientOrderId || !isOwnCoid(o.clientOrderId, s.connId) || !cpKind(o.clientOrderId)) continue;
        const key = `${o.symbol}|${o.positionSide === "SHORT" ? -1 : 1}`;
        const bounded = Lx.bounded.has(o.clientOrderId.toUpperCase());
        // (one-way mode keeps closePosition: its BOTH side does not say which of the two keys an order belongs to)
        const swap = posOneway ? false : excessKeys.has(key) ? !bounded : bounded && held.has(key);
        if (!swap || !o.id) continue;
        if (await ex.cancel(o.symbol, o.id)) {
          Lx.bounded.delete(o.clientOrderId.toUpperCase());
          book.orders.splice(i, 1);
          rt.db.event(
            "info",
            `live: ${key} ${excessKeys.has(key) ? "holds someone else's quantity too — our stop / take-profit is re-placed for our quantity only" : "is wholly ours again — our stop / take-profit is re-placed as closePosition"}`,
          );
        }
      }
    // the exit-order fields for a key: closePosition on a key wholly ours, our quantity only on an excess key
    const cpOf = (key: string, coid: string): Record<string, string> => {
      if (posOneway || !excessKeys.has(key)) return { closePosition: "true" };
      Lx.bounded.add(coid.toUpperCase());
      if (Lx.bounded.size > 5_000) Lx.bounded.clear();
      return {};
    };
    phase("contracts");
    const specs = await ex.contracts();
    phase("tickers");
    const prices = new Map((await rt.freshTickers()).map((t) => [t.sym, t.last] as const));
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
    for (const k of flatKeys) noteExternal(k, prices.get(k.split("|")[0]) ?? 0, false, await outsideOf(k));
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
    const allLanes = laneContributions(rt, prices, ps);
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
    if (!reconnected) {
      const outside = new Map(externalCloses(prev, held).map((x) => [x.key, x]));
      for (const key of settledFlat.keys()) if (!held.has(key)) outside.set(key, { key, lanes: 0 });
      for (const x of outside.values()) {
        if (lagging.has(x.key) || pendingKeys.has(x.key) || keyState.get(x.key) === "closed") continue;
        const [xsym, xsd] = x.key.split("|");
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
        const by = noteExternal(x.key, prices.get(xsym) ?? 0, true, await outsideOf(x.key));
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
          if (l.id && `${l.sym}|${l.side}` === x.key) {
            suppressed[l.id] = { key: x.key, at: nowSup };
            n++;
          }
        rt.db.event(
          by.why === "stop" ? "warn" : "info",
          `live: ${x.key} was closed ${
            by.why === "hand"
              ? `by hand (an order that is not ours: in the venue, or another system${by.px ? `; at ${by.px}` : ""})`
              : by.why === "target"
                ? `by its exchange take-profit${by.px ? ` (${by.px})` : ""}`
                : `by its exchange stop${by.px ? ` (${by.px})` : ""}`
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
    const laneMode = s.laneOrders === true;
    const laneMap: Record<string, LaneOrder> = laneMode
      ? { ...(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {}) }
      : {};
    const laneExit = new Map<string, { px: number; reason: "stop" | "target" }>();
    const laneBusy = new Set<string>();
    const laneCaps: Record<string, number> = { ...(liveKv<Record<string, number>>(rt.db, "laneQuantityCaps") ?? {}) };
    const laneStat = { onExchange: 0, placed: 0, moved: 0, cancelled: 0, filled: 0, pending: 0 };
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
    const goneOf = async (sym: string, oid?: string) => {
      if (!oid || !ex.orderStatus) return { status: "unknown" } as const;
      try {
        const reply = await ex.orderStatus(sym, oid);
        const result = goneOrderOf(reply);
        if (result.status === "cancelled") {
          const order = ((reply as { order?: unknown })?.order ?? reply) as Record<string, unknown> | null;
          const raw = order?.executedQty ?? order?.cumExecQty ?? order?.filledQty;
          // Terminal status alone does not prove that a conditional exited zero quantity before cancellation.
          if (!(typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "")) ||
            !Number.isFinite(Number(raw)) || Number(raw) < 0)
            return { status: "unknown" } as const;
        }
        return result;
      } catch {
        return { status: "unknown" } as const;
      }
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
    const cancelLaneOrders = async (lo: LaneOrder, ids: ReadonlyMap<string, string | undefined>) => {
      let cleared = true;
      for (const which of ["s", "t"] as const) {
        const o = lo[which];
        if (!o) continue;
        const oid = o.oid ?? ids.get(o.coid.toUpperCase());
        if (!oid) { cleared = false; continue; }
        if (await ex.cancel(lo.sym, oid)) {
          status.cancelled++;
          laneStat.cancelled++;
          // A successful cancel can terminate a partially filled conditional. Reconcile its measured cumulative
          // quantity before forgetting the identity or following it with a market reduction.
          const result = ex.orderStatus ? await goneOf(lo.sym, oid) : { status: "cancelled" } as const;
          if (result.status === "unknown" || (result.status === "filled" &&
            (result.qty === undefined || result.qty > (o.filledQty ?? 0) + 1e-12))) {
            cleared = false;
            continue;
          }
          delete lo[which];
          continue;
        }
        const gone = await goneOf(lo.sym, oid);
        if (gone.status === "cancelled") delete lo[which];
        else cleared = false; // filled or unresolved: retain it for canonical fill/restart reconciliation
      }
      if (!cleared) laneBusy.add(lo.key);
      return cleared;
    };
    if (laneMode && !ordersStale) {
      const resting = ownResting(book);
      const tracked = new Map<string, number>();
      for (const lo of Object.values(laneMap)) tracked.set(lo.key, (tracked.get(lo.key) ?? 0) + lo.qty);
      const actual = new Map(book.positions.map((p) => [`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`, p.qty]));
      for (const lo of Object.values(laneMap)) {
        if (!alive()) break;
        for (const which of ["s", "t"] as const) {
          const o = lo[which];
          if (!o) continue;
          o.oid ??= orderIdOf.get(o.coid.toUpperCase());
          // A partial conditional fill may remain in openOrders. Poll it when measured holdings shrank, or
          // while a previously observed partial is unresolved. A healthy steady book does not poll every lane.
          if (resting.has(o.coid.toUpperCase()) && !(o.filledQty && o.filledQty > 0) &&
            (actual.get(lo.key) ?? 0) >= (tracked.get(lo.key) ?? 0) - 1e-12) continue;
          const g = await goneOf(lo.sym, o.oid ?? orderIdOf.get(o.coid.toUpperCase()));
          if (g.status === "cancelled") { delete lo[which]; continue; }
          if (g.status !== "filled" || g.qty === undefined) { laneBusy.add(lo.key); continue; }
          const sent = o.qty ?? lo.qty + (o.filledQty ?? 0);
          if (g.qty > sent + 1e-9 || g.qty < (o.filledQty ?? 0) - 1e-12) { laneBusy.add(lo.key); continue; }
          const id = `lanefill-${o.coid}`;
          const prior = controlRows(rt).get(id);
          const cumulative = Math.max(prior?.qty ?? 0, g.qty);
          const delta = Math.min(lo.qty, Math.max(0, cumulative - (o.filledQty ?? 0)));
          if (delta > 0) {
            // One cumulative durable record per actual conditional order makes stale polls/restarts idempotent.
            record(id, { key: lo.key, sym: lo.sym, side: lo.side }, "R", cumulative, g.px, "ok",
              `lane ${lo.id}: measured conditional ${which === "s" ? "stop" : "target"} fill` +
                (g.t === undefined ? "; venue exit timestamp unverified (observation time only)" : ""),
              g.t ?? prior?.at ?? Date.now());
            lo.qty = Math.max(0, lo.qty - delta);
            o.filledQty = cumulative;
            // The paper parent still includes this filled share; do not buy it back while that same entry lives.
            laneCaps[lo.id] = lo.qty;
            // Persist the reduced identity/cap before cancelling or placing anything asynchronously. A crash
            // between conditional cancellation and replacement must not restore the already exited share.
            persistLaneState();
            laneStat.filled++;
          }
          if (g.complete) delete lo[which];
          if (!(lo.qty > 1e-12)) {
            lo.closed = { px: g.px, reason: which === "s" ? "stop" : "target" };
            laneExit.set(lo.id, lo.closed);
          }
          // Cancel any unfilled conditional remainder and its sibling before changing their quantities.
          if (!(await cancelLaneOrders(lo, orderIdOf))) laneBusy.add(lo.key);
        }
        if (lo.closed) {
          for (const lid of laneIdByKey.get(lo.id) ?? []) suppressed[lid] = { key: lo.key, at: nowSup };
          laneExit.set(lo.id, lo.closed);
          if (await cancelLaneOrders(lo, orderIdOf)) delete laneMap[lo.id];
        }
      }
      // the venue's TP/SL cap (one count for the whole account): every position's backstop comes first — when the
      // own orders leave no room for a missing backstop (and a few new positions), the lane orders farthest from
      // triggering go (they act last; their lanes still exit through the desk)
      const cap = s.maxVenueOrders ?? VENUE_ORDERS_MAX;
      const missingBackstops = [...held.keys()].filter(
        (k) =>
          !book.orders.some(
            (o) =>
              `${o.venueSymbol}|${o.positionSide === "SHORT" ? -1 : 1}` === k &&
              isBackstopKind(ownCoidKind(o.clientOrderId, s.connId)),
          ),
      ).length;
      const ownCount = book.orders.filter((o) => isOwnCoid(o.clientOrderId, s.connId)).length;
      const keep = cap - missingBackstops - VENUE_ORDERS_RESERVE;
      const trims =
        ownCount > keep + VENUE_TRIM_SLACK
          ? trimLaneOrders(laneMap, resting, (sym) => prices.get(sym) ?? 0, ownCount, keep)
          : [];
      for (const x of trims) {
        if (!alive()) break;
        const lo = laneMap[x.lane];
        const o = lo?.[x.which];
        const oid = o ? (o.oid ?? orderIdOf.get(o.coid.toUpperCase())) : undefined;
        if (lo && oid && (await ex.cancel(lo.sym, oid))) {
          status.cancelled++;
          laneStat.cancelled++;
          delete lo[x.which];
        }
      }
      if (trims.length)
        rt.db.event(
          "info",
          `lane orders: ${trims.length} farthest from triggering cancelled — the venue's TP/SL cap (${cap}) keeps room for ${missingBackstops} missing backstop(s)`,
        );
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
          const k = `${o.venueSymbol}|${o.positionSide === "SHORT" ? -1 : 1}`;
          const lo = { id: o.clientOrderId ?? "", key: k, sym: o.venueSymbol, side: (o.positionSide === "SHORT" ? -1 : 1) as 1 | -1, qty: 0, at: 0 };
          const row = ctlByUpper().get((o.clientOrderId ?? "").toUpperCase());
          laneFilled({ ...lo, qty: row?.qty ?? 0 }, g.px, ownCoidKind(o.clientOrderId, s.connId) === "V" ? "s" : "t");
        }
      }
      if (left.length && left.length <= LANE_ORDERS_PER_STEP) liveKvSet(rt.db, "laneOrders", {});
      if (n) rt.db.event("info", `control orders overall: ${n} lane order(s) of a partials run cancelled${left.length > n ? ` (${left.length - n} left for the next steps)` : ""}`);
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
    const promotionEvidence = new Map<string, { cfg: string; sym: string; side: number } & LiveGate>();
    const { sendable, validLane, closedConfig } = liveLaneFilter(s, selected, sigActive, null,
      (lane) => {
        const key = promoteLaneKey(lane);
        let evidence = promotionEvidence.get(key);
        if (!evidence) {
          evidence = { ...lane, ...(rt.livePromotionGate?.(lane) ?? { required: true, ok: false, n: 0, pf: null, state: "execution-insufficient" }) };
          promotionEvidence.set(key, evidence);
        }
        return evidence.ok;
      });
    const promotionHeldKeys = new Set<string>();
    let notSent = 0;
    // signal lanes of a unit not active (and no position held): they keep paper-trading, counted beside notSent
    let inactiveSignal = 0;
    // no chasing: a lane joins the exchange only while the price is within maxChase of its target distance from the
    // paper entry (in the trade's direction; a cheaper entry is fine). The paper book adopts a position after its
    // compute — minutes after the bar — and a late entry at a run-away price lost what the simulation booked (x02,
    // 7 Oct: 45 adopted lanes, PF 0.38). A lane already on the exchange stays whatever the price does.
    const maxChase = s.maxChase ?? 0.25;
    const onExchangeLanes = new Set(Object.keys(liveKvView<Record<string, unknown>>(rt.db, "liveLaneOpen") ?? {}));
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
    const lanes = allLanes.filter((l) => {
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
        // a lane of an excluded config never asks for volume, even on a held key: dropped here, its key has no target
        // left for it and the control closes its share. Other lanes left out (kind, range, source) stay while their
        // own share is held.
        const keepHeld = isHeld && !closedConfig(l);
        if (keepHeld) f.sent++;
        return keepHeld;
      }
      f.notSelected++;
      if (!isHeld && cfgInfo(l.cfg).isSig) inactiveSignal++;
      if (isHeld) f.sent++;
      return isHeld;
    });
    rt.status.livePromotion = promotionStatus([...promotionEvidence.values()]);
    // one lane volume unit: fixed % of account balance (or the fixed notional); unknown balance → nothing is
    // sized: held positions are kept as they are (closes of lanes that ended still run), nothing opens or grows
    phase("sizing");
    const unitRaw = await liveUnit(rt, ex, acct);
    // account-balance ratio budgets need a fresh wallet balance; unknown balance never lifts a cap
    // the exposure scaler switched off: maxExposureX bounds nothing (neither the fill budget nor the targets)
    const maxExposureX = s.exposureScaler === false ? 0 : (s.maxExposureX ?? 0);
    const balanceCapped = (s.maxPositionX ?? 0) > 0 || maxExposureX > 0 || (s.maxRiskPct ?? 0) > 0 || (s.maxBackstopLossPct ?? 0) > 0;
    const balanceNow = liveUnitPeek(rt).balance;
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
          return Math.max(bx.exchangeMinNotional(spec, px), Math.min(posCap, units * ratio * u));
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
          ...controlSettingsOf(s, unit ?? 0),
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
        const u = minQty ? bx.minQtyExchange(px, specs.get(t.sym) ?? null) * px : (unit ?? 0);
        const v = s.positionSize === "min" ? 1 : t.vol;
        if (u > 0 && v > 0) starts = Math.max(starts, posCapNow / (u * v));
      }
      const sizing = {
        at: Date.now(),
        ratio,
        posCap: posCapNow,
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
    const keep = new Set(skipped.flatMap((x) => (x.keep ? [x.keep] : [])));
    if (unit === null) for (const l of lanes) keep.add(`${l.sym}|${l.side}`);
    // no contract specs (an outage): nothing can be sized or rounded — every held position is kept as it is
    const noSpecs = specs.size === 0;
    if (noSpecs) for (const k of held.keys()) keep.add(k);
    // free-margin floor: an unknown free margin counts as below it (never open blind on a guarded account)
    const floor = s.minFreeMargin ?? 0;
    const accountAt = acct?.at ?? accountCache.get(ex.fingerprint())?.at;
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
    if (laneMode) {
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
      sizedVol: s.positionSize === "min" && s.laneOrders !== true ? undefined : Lm.sizedVol,
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
      keys: keyFunnel(funnel, plan.targets, skipped),
      ...(ordersStale ? {} : { protect: protectOf(book, held, targetOf, s.connId, posOneway, s.laneOrders === true) }),
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
    // leverage once per symbol (and setting): "max" = each side's exchange maximum, so a position at the minimum
    // quantity ties up the least margin. Set before the first open; a refusal blocks opening only.
    const levSetting = s.leverage ?? "max";
    const ensureLeverage = async (sym: string, ourSide: 1 | -1) => {
      if (!ex.leverage || !ex.setLeverage) return;
      // hedge mode: a side another system holds (or has orders on) is never touched — not even its leverage, which
      // would change that position's margin. Only our side is set then, and remembered per side.
      const otherSide = (-ourSide) as 1 | -1;
      const otherForeign = !oneway && foreign.has(`${sym}|${otherSide}`);
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

    // own orders left on a (symbol, side) that is flat now: cancel (not from open orders of an earlier read)
    for (const o of ordersStale ? [] : book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId) || !o.id) continue;
      // the fresh stop of a position the read does not show yet: not left behind
      const onLagging = ([1, -1] as const).some(
        (sd) =>
          lagging.has(`${o.venueSymbol}|${sd}`) &&
          (!o.positionSide || (o.positionSide === "LONG") === (sd === 1)),
      );
      if (onLagging) continue;
      const flat = !book.positions.some(
        (p) =>
          p.venueSymbol === o.venueSymbol &&
          (!o.positionSide || (p.side === "long") === (o.positionSide === "LONG")),
      );
      if (flat && (await ex.cancel(o.venueSymbol, o.id))) status.cancelled++;
    }

    // ── a position's close orders: its stop (kind S, any own order but a take-profit) and its take-profit (kind T)
    const isStopOrder = (coid: string | undefined) => isBackstopKind(ownCoidKind(coid, s.connId));
    // the stop distance the exchange leaves the position: never past its liquidation price (a stop out there never
    // fires — the position is liquidated first, and pays the liquidation fee); LIQ_STOP_SHARE of the way at most.
    // Unknown liquidation (cross margin on a large account reports none, or far away): the distance as it is.
    const allowedStopDist = (key: string, px: number, dist: number) => {
      const [lsym, lsd] = key.split("|");
      const side = Number(lsd) === 1 ? 1 : -1;
      const liq =
        book.positions.find((x) => x.venueSymbol === lsym && (x.side === "long") === (side === 1))?.liq ?? 0;
      if (!(liq > 0) || !(px > 0)) return dist;
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
    // places a position's take-profit (closePosition, like its stop). A refusal for being too close is widened once;
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
          // BingX requires the quantity with closePosition too
          quantity: qty,
          stopPrice: p,
          ...cpOf(a.key, c),
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
      if (closing.has(key)) continue;
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
      const dist = allowedStopDist(key, px, targetOf.get(key)?.stopDist ?? 0.05);
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
      const sc = makeCoid(s.connId, "S");
      try {
        let stopPrice = bx.stopPxExchange(px, side, dist, spec, venueMins(rt).get(sym)?.stop ?? 0);
        if (!(qty > 0) || !(stopPrice > 0)) throw new Error("stop needs a quantity and a price");
        const placeRepair = (c: string, sp: number) =>
          ex.order({
            symbol: sym,
            side: side === 1 ? "SELL" : "BUY",
            positionSide,
            type: "STOP_MARKET",
            quantity: qty,
            stopPrice: sp,
            ...cpOf(key, c),
            workingType: "MARK_PRICE",
            clientOrderID: c,
          });
        let sc2 = sc;
        try {
          await placeRepair(sc2, stopPrice);
        } catch (err) {
          // too close to the mark: widen once. The fallback below closes the position, so a retry here is the
          // difference between a protected position and a closed one.
          const msg = err instanceof Error ? err.message : String(err);
          if (!bx.stopTooClose(msg)) throw err;
          const wider = bx.widenStopDist(dist, px, spec);
          learnVenueMin(rt, sym, "stop", wider);
          record(sc2, a, "S", qty, stopPrice, "error", msg);
          stopPrice = bx.stopPxExchange(px, side, wider, spec, wider);
          sc2 = makeCoid(s.connId, "S");
          await placeRepair(sc2, stopPrice);
        }
        record(sc2, a, "S", qty, stopPrice, "ok", "repair");
        cleared(repairKey);
        rt.db.event("warn", `control ${key}: protective stop was missing — re-placed`);
      } catch (err) {
        record(sc, a, "S", qty, 0, "error", "repair");
        // lane orders: the lanes' own stops rest on the side — the position is protected without its backstop, so a
        // backstop the venue refuses is retried after a backoff, never answered by closing the position
        const laneStops = book.orders.some(
          (o) =>
            o.venueSymbol === sym &&
            ownCoidKind(o.clientOrderId, s.connId) === "V" &&
            (oneway || !o.positionSide || o.positionSide === positionSide),
        );
        if (s.laneOrders === true && laneStops) {
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
          const result = protectiveCloseResult(cc, a, qty, px, reply, "protective close (stop repair failed)", true);
          if (result.full) held.delete(key);
          else held.set(key, Math.max(0, qty - result.got));
          repairClosed.add(key);
          if (!result.full) throw new Error(`protective close incomplete: ${result.got} of ${qty} executed`);
          // the lanes would reopen it next tick: opening on this key waits (the stop may keep failing)
          failed(`${connHash}|open|${key}`, `stop repair failed: ${errText(err)}`, ...OPEN_BACKOFF);
          cleared(repairKey);
        } catch (e2) {
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
      if (closing.has(key) || repairClosed.has(key)) continue;
      const t = targetOf.get(key);
      const sym = key.split("|")[0];
      const px = prices.get(sym) ?? 0;
      if (!t || !(px > 0) || !(qty > 0)) continue;
      const side = t.side;
      const positionSide = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
      const spec = specs.get(sym) ?? null;
      const stopDist = allowedStopDist(key, px, t.stopDist);
      const want = bx.stopPxExchange(px, side, stopDist, spec, venueMins(rt).get(sym)?.stop ?? 0);
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
            ...cpOf(key, coid),
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
          if (bx.stopTooClose(msg)) {
            const wider = bx.widenStopDist(stopDist, px, spec);
            learnVenueMin(rt, sym, "stop", wider);
            const wide = bx.stopPxExchange(px, side, wider, spec, wider);
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
            }
          }
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

    // take-profit upkeep (kind T): every held position whose lanes all have a target carries one closePosition
    // take-profit beyond the farthest target (tpDistFor) — placed when missing (refused at the open, a position held
    // from before), re-placed when the farthest target moved past it or it was left far out (tpFits; at most every
    // RESTOP_MIN_MS), cancelled when a lane without a target joined (it would cut that lane's run).
    for (const [key, qty] of ordersStale || !pricesFresh || noSpecs ? [] : held) {
      if (!alive() || bx.blockingBanUntil()) break;
      if (closing.has(key) || repairClosed.has(key)) continue;
      // someone else's quantity on the key: no take-profit (a quantity-bounded one beside the bounded stop would stay
      // after the stop filled and later close their part); the control closes ours at the lanes' exits
      if (excessKeys.has(key)) continue;
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
      if (left > 0 || !alive()) continue;
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
        if (want.has(lo.id) && !reducing.has(lo.key)) continue;
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
          await ensureMargin(a.sym);
          await ensureLeverage(a.sym, a.side);
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
          const got = executedQty(resp, qty);
          const pending = executionMsg(resp, qty, book.positions.some((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}` === a.key));
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
            let stopPrice = bx.stopPxExchange(fpx, a.side, a.stopDist, spec, learned());
            let sc = makeCoid(s.connId, "S");
            const placeStop = (c: string, sp: number) =>
              ex.order({
                symbol: a.sym,
                side: out,
                positionSide,
                type: "STOP_MARKET",
                // BingX still requires quantity even when closePosition closes the whole side
                quantity: qty,
                stopPrice: sp,
                ...cpOf(a.key, c),
                workingType: "MARK_PRICE",
                clientOrderID: c,
              });
            try {
              if (!(qty > 0) || !(stopPrice > 0))
                throw new Error("stop needs a quantity and a price");
              try {
                await placeStop(sc, stopPrice);
              } catch (err) {
                // refused for being too close to the mark: widen once and try again. Closing the position is the
                // last resort, not the first answer — a refused stop used to cost the whole position.
                let msg = err instanceof Error ? err.message : String(err);
                if (bx.stopAlreadyExists(msg)) {
                  // a leftover stop of ours on this side (BingX keeps one per side): read the orders now, cancel our
                  // own on this symbol × side and place the new one. A stop that is not ours stays — and the
                  // protective close below remains the answer to it.
                  record(sc, a, "S", qty, stopPrice, "error", msg);
                  const fresh = await ex.book({ notBefore: Date.now(), maxAgeMs: 0 });
                  let gone = 0;
                  for (const o of fresh.orders)
                    if (
                      o.id &&
                      o.venueSymbol === a.sym &&
                      isOwnCoid(o.clientOrderId, s.connId) &&
                      (oneway || !o.positionSide || o.positionSide === positionSide) &&
                      (await ex.cancel(o.venueSymbol, o.id))
                    )
                      gone++;
                  if (!gone) throw err;
                  status.cancelled += gone;
                  rt.db.event("warn", `control ${a.key}: a leftover stop of ours held the side — cancelled, stop placed`);
                  sc = makeCoid(s.connId, "S");
                  try {
                    await placeStop(sc, stopPrice);
                    msg = "";
                  } catch (err2) {
                    msg = err2 instanceof Error ? err2.message : String(err2);
                    if (!bx.stopTooClose(msg)) throw err2;
                  }
                }
                // (msg empty: the leftover was cancelled and the stop is placed)
                if (msg) {
                  if (!bx.stopTooClose(msg)) throw err;
                  const wider = bx.widenStopDist(a.stopDist, fpx, spec);
                  learnVenueMin(rt, a.sym, "stop", wider);
                  record(sc, a, "S", qty, stopPrice, "error", msg);
                  stopPrice = bx.stopPxExchange(fpx, a.side, wider, spec, wider);
                  sc = makeCoid(s.connId, "S");
                  await placeStop(sc, stopPrice);
                  rt.db.event(
                    "warn",
                    `control ${a.key}: stop refused as too close — re-placed at ${(wider * 100).toFixed(2)} % (${stopPrice})`,
                  );
                }
              }
              record(sc, a, "S", qty, stopPrice, "ok");
              // the take-profit beside it (a refusal is retried by the upkeep: never a reason to close)
              const tpPx = targetOf.get(a.key)?.tpPx;
              if (tpPx && tpWantOf(a.sym, a.side, tpPx, fpx) && (await setTp(a, qty, fpx, tpPx, "open")) === 0)
                failed(`${connHash}|tp|${a.key}`, "take-profit not placed at the open", 30_000, 10 * 60_000);
            } catch (err) {
              // never leave a control position without its protective stop: close it again
              record(
                sc,
                a,
                "S",
                qty,
                stopPrice,
                "error",
                String(err instanceof Error ? err.message : err),
              );
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
          const got = executedQty(resp, qty);
          const pending = executionMsg(resp, qty, true);
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
                (oneway || !o.positionSide || o.positionSide === positionSide) &&
                (await ex.cancel(o.venueSymbol, o.id))
              )
                status.cancelled++;
          }
        }
        res.ok = true;
        cleared(waitKey);
      } catch (err) {
        res.msg = errText(err);
        // the side is already flat: a stop filled, or a close of ours landed after the book read this step used.
        // The exit it asked for has happened — the row is recorded as done and the ledger restarts from flat, so
        // the step does not back off and retry a close against nothing.
        if (!grows && err instanceof bx.ExchangeRejected && bx.alreadyFlat(res.msg)) {
          if (sent) record(sent.coid, a, sent.kind, sent.qty, sent.px, "ok", "already flat");
          noteExternal(a.key, prices.get(a.sym) ?? 0, false, await outsideOf(a.key));
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
    if (laneMode && alive()) {
      phase("lane orders");
      const sent = control.actions.some((x) => x.ok);
      const b2 = sent ? await ex.book({ notBefore: Date.now(), maxAgeMs: 0 }) : book;
      if (b2.ordersAt === undefined) {
        const resting = ownResting(b2);
        const ids2 = new Map(b2.orders.map((o) => [(o.clientOrderId ?? "").toUpperCase(), o.id] as const));
        const qtyOn = new Map<string, number>();
        for (const p of b2.positions) qtyOn.set(`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`, p.qty);
        // what this system holds of it (the ledger, after this step's orders)
        const own = ownLedger([...controlRows(rt).values()]);
        const byKey = new Map<string, Map<string, LaneWant & { units: number }>>();
        for (const l of liveLanes) {
          if (!l.id || !(l.stopPx !== undefined && l.stopPx > 0)) continue;
          const id = (l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side }));
          const k = `${l.sym}|${l.side}`;
          const group = byKey.get(k) ?? new Map<string, LaneWant & { units: number }>();
          if (!byKey.has(k)) byKey.set(k, group);
          const prior = group.get(id);
          if (prior) {
            prior.units += l.laneUnits ?? 1;
            (prior.weights ??= {})[l.id] = l.laneUnits ?? 1;
            continue;
          }
          const w: LaneWant = {
            id,
            key: k,
            sym: l.sym,
            side: l.side,
            stop: l.stopPx,
            ...(l.tgt !== undefined && l.tgt > 0 ? { target: l.tgt } : {}),
            entryT: Number(id.slice(id.lastIndexOf("|") + 1)) || 0,
          };
          group.set(id, { ...w, units: l.laneUnits ?? 1, weights: { [l.id]: l.laneUnits ?? 1 } });
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
              laneMap[w.id] = { id: w.id, key, sym: w.sym, side: w.side, qty: w.qty ?? laneQty,
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
              (o) =>
                `${o.venueSymbol}|${o.positionSide === "SHORT" ? -1 : 1}` === k &&
                isBackstopKind(ownCoidKind(o.clientOrderId, s.connId)),
            ),
        ).length;
        const Lc = local(rt);
        const capWait = (Lc.laneCapUntil ?? 0) > Date.now();
        let slots = capWait ? 0 : Math.max(0, cap - ownNow - noBackstop - VENUE_ORDERS_RESERVE);
        const planOpts = {
          px: (sym: string) => prices.get(sym) ?? 0,
          stopPx: (w: LaneWant, px: number) => levelPx(w, w.stop, px, w.side),
          targetPx: (w: LaneWant, px: number) => levelPx(w, w.target ?? 0, px, w.side === 1 ? -1 : 1),
          budget: LANE_ORDERS_PER_STEP,
          skip: (lane: string) => !!waiting(`${connHash}|lane|${lane}`),
        };
        // a full cap: the farthest resting lane orders give their slot to candidates less than half as far from
        // triggering (a few a step) — the budget moves toward the exits most likely to happen soon
        if (!capWait && slots === 0) {
          const want = planLaneOrders(covered, laneMap, resting, { ...planOpts, budget: Infinity });
          const dist = (sym: string, p: number) => {
            const px = prices.get(sym) ?? 0;
            return px > 0 ? Math.abs(p - px) / px : Infinity;
          };
          const cands = want
            .filter((x) => x.kind === "placeStop" || x.kind === "placeTarget")
            .map((x) => dist(laneMap[x.lane]?.sym ?? "", x.px));
          const rest: number[] = [];
          for (const lo of Object.values(laneMap))
            for (const o of [lo.s, lo.t]) if (o && resting.has(o.coid.toUpperCase())) rest.push(dist(lo.sym, o.px));
          const n = swapCount(cands, rest);
          if (n > 0) {
            for (const x of trimLaneOrders(laneMap, resting, (sym) => prices.get(sym) ?? 0, rest.length, rest.length - n)) {
              const lo = laneMap[x.lane];
              const o = lo?.[x.which];
              const oid = o ? (o.oid ?? ids2.get(o.coid.toUpperCase())) : undefined;
              if (lo && oid && (await ex.cancel(lo.sym, oid))) {
                status.cancelled++;
                laneStat.cancelled++;
                delete lo[x.which];
                slots++;
              }
            }
          }
        }
        const acts = planLaneOrders(covered, laneMap, resting, { ...planOpts, slots });
        let capHit = false;
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
            const oid = o?.oid ?? ids2.get(o?.coid.toUpperCase() ?? "");
            if (oid && !(await ex.cancel(lo.sym, oid))) {
              // gone already: a fill is the lane's exit (booked next step, from the book); otherwise placed anew
              const g = await goneOf(lo.sym, oid);
              if (g.status !== "cancelled") return;
            } else if (oid) {
              status.cancelled++;
              laneStat.cancelled++;
              const g = ex.orderStatus ? await goneOf(lo.sym, oid) : { status: "cancelled" } as const;
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
          if (!alive() || bx.blockingBanUntil() || capHit) break;
          const batch: typeof acts = [];
          const lanesIn = new Set<string>();
          while (i < acts.length && batch.length < LANE_ORDER_CONCURRENCY && !lanesIn.has(acts[i].lane)) {
            lanesIn.add(acts[i].lane);
            batch.push(acts[i++]);
          }
          await Promise.all(batch.map(run));
        }
        laneStat.onExchange = Object.keys(laneMap).length;
        laneStat.pending = covered.filter((w) => {
          const lo = laneMap[w.id];
          return !lo?.s || ((w.target ?? 0) > 0 && !lo.t);
        }).length;
      }
    }
    if (laneMode) {
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
    for (const [k, v] of keyState) if (v === "open") heldAfter.add(k);
    else heldAfter.delete(k);
    // the flat markers carry the close the exchange made (its stop, its take-profit, by hand) at the price its lanes are
    // booked at below; an unknown price stays 0 (the marker then books nothing — no price is invented). Time and order
    // of the row are kept: a reopen later in this step still follows it.
    for (const [k, f] of flatRows) {
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
    recordLanes(rt, { lanes: liveLanes, heldAfter, grew, shrank, external, externalWhy, laneExit, prices });
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
    const until = bx.noteRateLimit(status.error);
    if (until) {
      status.reason = `exchange rate limit until ${new Date(until).toISOString()}`;
      const L = local(rt);
      if (L.rateLimitLogged !== until) {
        L.rateLimitLogged = until;
        rt.db.event("warn", `live control paused: ${status.reason}`);
      }
    } else rt.db.event("error", `live control step: ${status.error}`);
  }
  liveKvSet(rt.db, "liveStatus", status);
  rt.emit?.("live");
  return status;
}

function done(rt: CoreRuntime, status: LiveStatus, reason: string): LiveStatus {
  status.reason = reason;
  liveKvSet(rt.db, "liveStatus", status);
  rt.emit?.("live");
  return status;
}
