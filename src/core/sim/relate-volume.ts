import type { Protect, RelateAdjustmentConfig, RelateParts, RelateSource, StratKind } from "../domain/types.ts";
import { MAX_EXTERNAL_STACK } from "../config.ts";

/** Validated Axis settings bound its deepest ladder to eight legs of at most five base units each. */
export const AXIS_MAX_LEVELS = 8;
export const AXIS_MAX_RUNG_RATIO = 5;
/** Legacy DCA ladders lack immutable economics, so reserve the largest supported five-stage ladder. */
const DCA_MAX_INTRINSIC = 1 + 4 * 2.5;

/**
 * A raise may use an existing fixed stop only when the replay knows that stop at entry and its
 * simulator never widens it. This deliberately does not tighten stops or qualify ATR / ladder
 * paths: changing those exits after tapes were built would make their returns and re-entry times false.
 */
export function relateFixedStopWithinLimit(kind: StratKind, protect: Protect, maxSl: number): boolean {
  if (kind !== "normal" && kind !== "trailing" && kind !== "trailing-only" && kind !== "exit") return false;
  if (protect.atr || protect.dca) return false;
  return Number.isFinite(maxSl) && maxSl >= 0.0025 && maxSl <= 0.015 &&
    Number.isFinite(protect.sl) && protect.sl > 0 && protect.sl <= maxSl + 1e-12;
}

/**
 * Reserve capacity for every possible intrinsic ladder fill at entry. Tapes cannot change their leg weights after
 * admission without replaying prices and exits, so this conservative bound preserves their original per-leg math
 * without using the eventually observed number of fills. Existing held entries keep their captured multiplier.
 */
export function relateExternalStackCap(maxStack: number, kind: StratKind, protect: Protect): number {
  const cap = boundedStack(maxStack);
  if (kind === "dca") {
    const dca = protect.dca;
    const levels = dca?.levels;
    const ratio = dca?.addRatio ?? 1;
    const known = Number.isInteger(levels) && levels! >= 1 && levels! <= 4 &&
      Number.isFinite(ratio) && ratio > 0 && ratio <= 2.5;
    const weight = known ? 1 + levels! * ratio : DCA_MAX_INTRINSIC;
    // Tape volumes are stored as float32. An upward rounding of the deepest weight must not take the
    // reconstructed model over the cap even though the original per-leg weight was within it.
    return cap / Math.max(weight, Math.fround(weight));
  }
  if (kind === "axis") return cap / (1 + (AXIS_MAX_LEVELS - 1) * AXIS_MAX_RUNG_RATIO);
  return cap;
}

/**
 * Combine independent relation additions with the already sized base in original-base units.
 * Raises add their extra volume once; they do not multiply the Block / coordination stack again. A sub-unit
 * relation reservation (used for DCA / Axis intrinsic ladder capacity) scales the base down to fit its reserve.
 */
export function combineRelateStack(
  base: number,
  relation: number,
  cap: number,
): { volume: number; relation: number } {
  if (!(Number.isFinite(base) && base > 0) || !(Number.isFinite(relation) && relation > 0) ||
      !(Number.isFinite(cap) && cap > 0))
    return { volume: 0, relation: 1 };
  const boundedCap = Math.min(MAX_EXTERNAL_STACK, cap);
  if (relation < 1) return { volume: Math.round(Math.min(boundedCap, base * relation) * 1e12) / 1e12, relation };
  if (base >= boundedCap) return { volume: boundedCap, relation: 1 };
  const applied = Math.min(relation, 1 + boundedCap - base);
  return { volume: Math.round(Math.min(boundedCap, base + applied - 1) * 1e12) / 1e12, relation: applied };
}

export const RELATE_SOURCES: readonly RelateSource[] = [
  "config", "overall", "symbol", "direction", "indication", "strategy", "coordination", "range",
];

export interface RelateIdentity {
  cfg: string;
  sym: string;
  side: number;
  ind: string;
  strategy: string;
  coordination: string;
  range: string;
}

export interface RelateBookEntry extends RelateIdentity {
  r: number;
  accepted?: boolean;
  /** True only when the entry's relation parts were captured, including an explicitly neutral entry. */
  relateMeasured?: boolean;
  /** Actual entry-time base multiplier in original-base units, after any total-stack cap. */
  relateBase?: number;
  relateParts?: RelateParts;
}

export interface RelateSourceStats {
  n: number;
  /** Settled observations whose unit return is unavailable; they remain in the chronological window. */
  unknown: number;
  gp: number;
  gl: number;
  pf: number;
  positiveRate: number;
  net: number;
}

export interface RelateAutoChoice {
  ratio: number;
  steps: number;
  activeStep: number;
  /** Return PF of the selected unit-return sample. */
  pf: number;
  /** Hypothetical size-weighted PF on that sample; not a funded cash or exchange result. */
  sizedPf: number;
  positiveRate: number;
  n: number;
}

export interface RelateDecision {
  /** Total Relate stack multiplier; this is capped together with Block/coordination volume at maxStack downstream. */
  volume: number;
  /** false only when Active requires a qualified step and no enabled relation reached it. */
  allowed: boolean;
  level: number;
  levels: Partial<Record<RelateSource, number>>;
  stats: Partial<Record<RelateSource, RelateSourceStats>>;
  choices: Partial<Record<RelateSource, RelateAutoChoice>>;
  /** Logical entry-time relation portions after the Relate-only cap. */
  parts: RelateParts;
  maxStack: number;
}

const sideId = (side: number) => (side > 0 ? 1 : -1);

function sourceKeys(x: RelateIdentity): Partial<Record<RelateSource, string>> {
  const side = sideId(x.side);
  return {
    config: `c:${x.cfg}|${x.sym}|${side}`,
    overall: "o:all",
    symbol: `s:${x.sym}|${side}`,
    direction: `d:${side}`,
    indication: `i:${x.ind}|${side}`,
    strategy: `t:${x.strategy}|${side}`,
    coordination: `co:${x.coordination}|${side}`,
    range: `r:${x.range || "wide"}|${side}`,
  };
}

export function relateStats(rows: readonly number[]): RelateSourceStats {
  let gp = 0;
  let gl = 0;
  let wins = 0;
  let net = 0;
  let unknown = 0;
  for (const r of rows) {
    if (!Number.isFinite(r)) { unknown++; continue; }
    net += r;
    if (r > 0) { gp += r; wins++; }
    else if (r < 0) gl -= r;
  }
  // A partial known subset cannot stand in for the full last-N evidence, and overflowing totals cannot qualify.
  if (unknown || !Number.isFinite(gp) || !Number.isFinite(gl) || !Number.isFinite(net))
    return { n: rows.length, unknown, gp: NaN, gl: NaN, pf: NaN, positiveRate: NaN, net: NaN };
  return {
    n: rows.length,
    unknown,
    gp,
    gl,
    pf: gl > 0 ? gp / gl : gp > 0 ? Infinity : 0,
    positiveRate: rows.length ? wins / rows.length : 0,
    net,
  };
}

function boundedStack(x: number): number {
  return Number.isFinite(x) ? Math.max(1, Math.min(MAX_EXTERNAL_STACK, x)) : 1;
}

/** Allocate a capped total among independent relation portions without increasing the requested total. */
export function capRelateParts(parts: RelateParts, total: number, shadowCap = MAX_EXTERNAL_STACK, base = 1): RelateParts {
  if (!Number.isFinite(base) || !(base > 0)) return {};
  // A reserved external ceiling can be less than one base unit when a ladder may later add legs.
  const cap = Math.min(MAX_EXTERNAL_STACK, base * shadowCap);
  if (!Number.isFinite(cap) || !(cap > 0)) return {};
  const totalUnits = Math.max(0, Math.min(cap,
    Math.round(base * (Number.isFinite(total) ? total : 1) * 1e12) / 1e12));
  const baseUnits = Math.min(base, totalUnits);
  const entries = RELATE_SOURCES.flatMap((source) => {
    const part = parts[source];
    return part && !part.shadow && Number.isFinite(part.volume) && part.volume > 0 && Number.isInteger(part.level) && part.level > 0
      ? [{ source, part }] : [];
  });
  const requested = entries.reduce((sum, x) => sum + Math.max(0, x.part.volume - base), 0);
  let left = Math.max(0, totalUnits - baseUnits);
  const scale = requested > 0 ? Math.min(1, left / requested) : 0;
  const out: RelateParts = {};
  for (const { source, part } of entries) {
    const extra = Math.min(left, Math.round(Math.max(0, part.volume - base) * scale * 1e12) / 1e12);
    out[source] = { volume: Math.min(totalUnits, Math.round((baseUnits + extra) * 1e12) / 1e12), level: part.level };
    left = Math.max(0, left - extra);
  }
  for (const source of RELATE_SOURCES) {
    const part = parts[source];
    if (part?.shadow && Number.isFinite(part.volume) && part.volume > 0 &&
        Number.isInteger(part.level) && part.level >= 0 && part.level <= 15)
      out[source] = { volume: Math.max(baseUnits, Math.min(cap, part.volume)), level: part.level, shadow: true };
  }
  return out;
}

/**
 * Per-relation auto search over 30 ratios × 14 step depths × 7 Active thresholds. The scoring pass groups
 * historical positive/negative returns by their causal preceding win streak, so candidate scoring is bounded and
 * does not replay every candidate against every order. A candidate must clear the configured PF and sample floor.
 */
function chooseAuto(rows: readonly number[], c: RelateAdjustmentConfig): RelateAutoChoice | null {
  const tail = rows.slice(-Math.min(c.lastN, rows.length));
  if (tail.length < c.minTrades || !(relateStats(tail).pf >= c.minPf)) return null;

  const gpByStage = Array<number>(16).fill(0);
  const glByStage = Array<number>(16).fill(0);
  const nByStage = Array<number>(16).fill(0);
  const winByStage = Array<number>(16).fill(0);
  let priorStreak = 0;
  for (const r of tail) {
    const stage = Math.min(15, priorStreak);
    nByStage[stage]++;
    if (r > 0) { gpByStage[stage] += r; winByStage[stage]++; }
    else if (r < 0) glByStage[stage] -= r;
    priorStreak = r > 0 ? Math.min(15, priorStreak + 1) : 0;
  }

  const gpSuffix = Array<number>(17).fill(0);
  const glSuffix = Array<number>(17).fill(0);
  const nSuffix = Array<number>(17).fill(0);
  const winSuffix = Array<number>(17).fill(0);
  for (let stage = 15; stage >= 0; stage--) {
    gpSuffix[stage] = gpSuffix[stage + 1] + gpByStage[stage];
    glSuffix[stage] = glSuffix[stage + 1] + glByStage[stage];
    nSuffix[stage] = nSuffix[stage + 1] + nByStage[stage];
    winSuffix[stage] = winSuffix[stage + 1] + winByStage[stage];
  }

  let best: RelateAutoChoice | null = null;
  const stackCap = boundedStack(c.maxStack);
  // For this existing unit-return scoring rule, ratio never changes PF, positive rate or sample size. The tie
  // break always prefers 0.2, and all weighted sums are nonnegative and monotone in ratio: if the 0.2 candidate
  // overflows, a larger ratio cannot make that same candidate finite. Fold those dominated ratio iterations while
  // retaining the exact same winner and its separate hypothetical sized-PF diagnostic. This is not a causal
  // funded-feedback search; a future causal scorer must evaluate each ratio independently.
  const ratio = 0.2;
  const ladder = Array<number>(16).fill(1);
  for (let stage = 1; stage <= 15; stage++)
    ladder[stage] = Math.min(stackCap, ladder[stage - 1] * (1 + ratio));
  for (let steps = 2; steps <= 15; steps++) {
    const sizedGp = Array<number>(17).fill(0);
    const sizedGl = Array<number>(17).fill(0);
    for (let stage = 15; stage >= 0; stage--) {
      const volume = ladder[Math.min(stage, steps)];
      sizedGp[stage] = sizedGp[stage + 1] + gpByStage[stage] * volume;
      sizedGl[stage] = sizedGl[stage + 1] + glByStage[stage] * volume;
    }
    for (let activeStep = 0; activeStep <= Math.min(6, steps); activeStep++) {
      const n = nSuffix[activeStep];
      const gp = gpSuffix[activeStep];
      const gl = glSuffix[activeStep];
      const weightedGp = sizedGp[activeStep];
      const weightedGl = sizedGl[activeStep];
      if (n < c.minTrades || !Number.isFinite(gp) || !Number.isFinite(gl) ||
          !Number.isFinite(weightedGp) || !Number.isFinite(weightedGl)) continue;
      const pf = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0;
      const positiveRate = winSuffix[activeStep] / n;
      if (!(pf >= c.minPf) || !(gp - gl > 0)) continue;
      const sizedPf = weightedGl > 0 ? weightedGp / weightedGl : weightedGp > 0 ? Infinity : 0;
      const candidate = { ratio, steps, activeStep, pf, sizedPf, positiveRate, n };
      const stepDistance = Math.abs(steps - c.steps);
      const bestDistance = best ? Math.abs(best.steps - c.steps) : Infinity;
      if (
        !best || pf > best.pf ||
        (pf === best.pf && positiveRate > best.positiveRate) ||
        (pf === best.pf && positiveRate === best.positiveRate && ratio < best.ratio) ||
        (pf === best.pf && positiveRate === best.positiveRate && ratio === best.ratio && stepDistance < bestDistance) ||
        (pf === best.pf && positiveRate === best.positiveRate && ratio === best.ratio && stepDistance === bestDistance && steps < best.steps) ||
        (pf === best.pf && positiveRate === best.positiveRate && ratio === best.ratio && steps === best.steps && activeStep < best.activeStep)
      ) best = candidate;
    }
  }
  return best;
}

/** Causal settled-order history for the Relate volume adjustment. Only accepted, closed entries are admitted. */
export class RelateBook {
  private readonly histories = new Map<string, number[]>();
  private readonly previous = new Map<string, { volume: number; level: number; positive: boolean }>();
  private readonly autoCache = new Map<string, { revision: number; choice: RelateAutoChoice | null }>();
  private readonly keyRevisions = new Map<string, number>();
  private shadowCloses = 0;
  private readonly config: RelateAdjustmentConfig;

  constructor(config: RelateAdjustmentConfig) {
    this.config = config;
  }

  private recordPrevious(key: string, r: number, part: RelateParts[RelateSource], measured: boolean, base: number | undefined): void {
    if (!Number.isFinite(r)) this.previous.delete(key);
    else if (r <= 0) this.previous.set(key, { volume: 1, level: 0, positive: false });
    else {
      const recorded = part ?? { volume: base ?? NaN, level: 0 };
      const tolerance = Number.isFinite(base) ? Math.max(1, Math.abs(base!)) * 1e-10 : 0;
      if (measured && Number.isFinite(base) && (base ?? 0) > 0 && (base ?? 0) <= MAX_EXTERNAL_STACK &&
          Number.isFinite(recorded.volume) && recorded.volume > 0 &&
          recorded.volume <= MAX_EXTERNAL_STACK && Number.isInteger(recorded.level) && recorded.level >= 0 && recorded.level <= 15 &&
          recorded.volume + tolerance >= (base ?? Infinity) &&
          (recorded.level > 0 || Math.abs(recorded.volume - base!) <= tolerance))
        this.previous.set(key, { volume: recorded.volume, level: recorded.level, positive: true });
      else this.previous.delete(key);
    }
  }

  add(e: RelateBookEntry): void {
    if (e.accepted !== true) return;
    const keys = sourceKeys(e);
    for (const source of RELATE_SOURCES) {
      if (this.config.sources[source] === false) continue;
      const key = keys[source];
      if (!key) continue;
      let rows = this.histories.get(key);
      if (!rows) this.histories.set(key, (rows = []));
      rows.push(Number.isFinite(e.r) ? e.r : NaN);
      if (rows.length > this.config.lastN) rows.splice(0, rows.length - this.config.lastN);
      this.recordPrevious(key, e.r, e.relateParts?.[source], e.relateMeasured === true, e.relateBase);
      const revision = (this.keyRevisions.get(key) ?? 0) + 1;
      this.keyRevisions.set(key, revision);
      this.autoCache.delete(key);
    }
  }

  /** An entry skipped only by Relate Active advances its hypothetical steps, never accepted PF evidence. */
  advanceShadow(e: RelateBookEntry): void {
    if (e.accepted === true || e.relateMeasured !== true) return;
    const keys = sourceKeys(e);
    let observed = false;
    for (const source of RELATE_SOURCES) {
      const key = keys[source];
      const part = e.relateParts?.[source];
      if (this.config.sources[source] === false || !key || !part?.shadow) continue;
      this.recordPrevious(key, e.r, part, true, e.relateBase);
      observed = true;
    }
    if (observed) this.shadowCloses++;
  }

  private auto(key: string, rows: readonly number[]): RelateAutoChoice | null {
    const cached = this.autoCache.get(key);
    const revision = this.keyRevisions.get(key) ?? 0;
    if (cached?.revision === revision) return cached.choice;
    const choice = chooseAuto(rows, this.config);
    this.autoCache.set(key, { revision, choice });
    return choice;
  }

  decide(x: RelateIdentity, base = 1): RelateDecision {
    const levels: Partial<Record<RelateSource, number>> = {};
    const stats: Partial<Record<RelateSource, RelateSourceStats>> = {};
    const choices: Partial<Record<RelateSource, RelateAutoChoice>> = {};
    const cap = boundedStack(this.config.maxStack);
    if (!Number.isFinite(base) || !(base > 0))
      return { volume: 1, allowed: false, level: 0, levels, stats, choices, parts: {}, maxStack: cap };
    const baseUnits = Math.min(base, cap);
    const extras: Array<{ source: RelateSource; level: number; volume: number; activeStep: number;
      qualified: boolean; previousKnown: boolean }> = [];
    const keys = sourceKeys(x);
    for (const source of RELATE_SOURCES) {
      if (this.config.sources[source] === false) continue;
      const key = keys[source];
      if (!key) continue;
      const rows = this.histories.get(key) ?? [];
      const tail = rows.slice(-Math.min(rows.length, this.config.lastN));
      const recent = relateStats(tail);
      stats[source] = recent;
      const choice = this.config.auto ? this.auto(key, rows) : null;
      if (choice) choices[source] = choice;
      const ratio = choice?.ratio ?? this.config.ratio;
      const steps = choice?.steps ?? this.config.steps;
      const activeStep = choice?.activeStep ?? (this.config.auto ? 0 : this.config.activeStep);
      const qualified = this.config.auto
        ? choice !== null
        : recent.n >= this.config.minTrades && recent.pf >= this.config.minPf;
      const prior = this.previous.get(key);
      const level = qualified && prior?.positive ? Math.min(steps, prior.level + 1) : 0;
      const volume = qualified && prior?.positive
        ? Math.max(baseUnits, Math.min(cap, prior.level < steps ? prior.volume * (1 + ratio) : prior.volume))
        : baseUnits;
      levels[source] = level;
      extras.push({ source, level, volume, activeStep, qualified, previousKnown: !!prior });
    }

    // Before a relation has qualified evidence and a known previous entry, base orders can build that evidence.
    const ready = extras.filter((x) => x.qualified && x.previousKnown);
    const admitted = ready.filter((x) => x.activeStep === 0 || x.level >= x.activeStep);
    const allowed = !this.config.enabled || ready.length === 0 || admitted.length > 0;
    // Shared divides the combined requested additions by the number of independently ready relations. Keep
    // every source's allocated portion, so the next step compounds from its own recorded effective volume.
    const divisor = this.config.mode === "shared" ? Math.max(1, admitted.length) : 1;
    const requested: RelateParts = {};
    for (const x of admitted) if (x.level > 0)
      requested[x.source] = { volume: baseUnits + Math.max(0, x.volume - baseUnits) / divisor, level: x.level };
    for (const x of ready)
      if (x.activeStep > 0 && x.level < x.activeStep)
        requested[x.source] = { volume: x.volume, level: x.level, shadow: true };
    const chosen = admitted.reduce((sum, x) => sum + Math.max(0, x.volume - baseUnits) / divisor, 0);
    const total = Math.min(cap, Math.round((baseUnits + chosen) * 1e12) / 1e12);
    const multiplier = total / base;
    return {
      // The supported ratio grid is in 0.2 increments; summing several independent sources can otherwise expose
      // values such as 2.5999999999999996 in execution and diagnostics. Keep deterministic decimal sizing.
      volume: this.config.enabled ? multiplier : 1,
      allowed,
      level: extras.reduce((sum, x) => sum + x.level, 0),
      levels,
      stats,
      choices,
      parts: this.config.enabled ? capRelateParts(requested, multiplier, cap / base, base) : {},
      maxStack: cap,
    };
  }

  /** Small bounded diagnostics for progress/status displays and deterministic tests. */
  summary(): { relations: number; qualified: number; closes: number; maxSample: number; shadowCloses: number } {
    let qualified = 0;
    let closes = 0;
    let maxSample = 0;
    for (const rows of this.histories.values()) {
      closes += rows.length;
      maxSample = Math.max(maxSample, rows.length);
      if (rows.length >= this.config.minTrades && relateStats(rows).pf >= this.config.minPf) qualified++;
    }
    return { relations: this.histories.size, qualified, closes, maxSample, shadowCloses: this.shadowCloses };
  }
}

export function relateBookOf(config: RelateAdjustmentConfig | undefined): RelateBook | null {
  return config?.enabled ? new RelateBook(config) : null;
}
