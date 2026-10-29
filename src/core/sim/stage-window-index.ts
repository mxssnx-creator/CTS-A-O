import { profitFactor } from "../metrics/stats.ts";
import { compareStageObservation, stageWindow, type StageObservation, type StageWindow } from "./stage-policy.ts";

export type CompactStageWindow = Readonly<Omit<StageWindow, "rows">>;
/**
 * Index one immutable exact-set history. Prefix subtraction handles ordinary windows; a scalar fallback preserves
 * the reference decision near floating-point boundaries and whenever a result became known after its exit.
 * Economic equivalence is not permission to pool different sets. Each caller supplies its own processed rows.
 */
export class StageWindowIndex {
  private readonly rows: StageObservation[];
  private readonly gain: Float64Array;
  private readonly loss: Float64Array;
  private readonly unknown: Uint32Array;
  private readonly knownMax: Float64Array;
  private readonly cache = new Map<number, CompactStageWindow>();
  private cachePf = NaN;
  private invalid = false;

  constructor(input: readonly StageObservation[]) {
    this.rows = input.map((x) => ({ ...x }));
    const ids = new Set<string>();
    for (const r of this.rows) {
      const key = JSON.stringify([r.orderId, r.entryT]);
      if (!r || typeof r.orderId !== "string" || !r.orderId.trim() || ids.has(key) ||
          ![r.entryT, r.exitT, r.knownT].every((n) => Number.isFinite(n) && n >= 0) ||
          r.exitT < r.entryT || r.knownT < r.exitT) this.invalid = true;
      ids.add(key);
    }
    if (!this.invalid) this.rows.sort(compareStageObservation);
    const size = this.rows.length + 1;
    this.gain = new Float64Array(size); this.loss = new Float64Array(size);
    this.unknown = new Uint32Array(size); this.knownMax = new Float64Array(size);
    if (this.invalid) return;
    for (let i = 0; i < this.rows.length; i++) {
      const r = this.rows[i], known = r.unitReturn !== null && Number.isFinite(r.unitReturn);
      this.gain[i + 1] = this.gain[i] + (known ? Math.max(0, r.unitReturn!) : 0);
      this.loss[i + 1] = this.loss[i] + (known ? Math.max(0, -r.unitReturn!) : 0);
      this.unknown[i + 1] = this.unknown[i] + Number(!known);
      this.knownMax[i + 1] = Math.max(this.knownMax[i], r.knownT);
    }
  }
  private scalar(n: number, minPf: number, beforeT: number): CompactStageWindow {
    const { rows: _rows, ...w } = stageWindow(this.rows, n, minPf, beforeT);
    return Object.freeze(w);
  }
  window(n: number, minPf: number, beforeT: number): CompactStageWindow {
    if (!Number.isSafeInteger(n) || n < 1 || n > 500 || !Number.isFinite(minPf) || minPf <= 1 ||
        !Number.isFinite(beforeT) || beforeT < 0) throw new RangeError("invalid indexed stage window");
    if (this.invalid) return Object.freeze({ requestedN: n, n: Math.min(this.rows.length, n),
      state: "unknown", pf: null, mean: null, gp: 0, gl: 0 });
    let low = 0, high = this.rows.length;
    while (low < high) { const mid = (low + high) >>> 1; if (this.rows[mid].exitT < beforeT) low = mid + 1; else high = mid; }
    const b = low;
    if (b && this.knownMax[b] >= beforeT) return this.scalar(n, minPf, beforeT);
    if (this.cachePf !== minPf) { this.cache.clear(); this.cachePf = minPf; }
    const key = n * (this.rows.length + 1) + b, cached = this.cache.get(key);
    if (cached) return cached;
    const a = Math.max(0, b - n), count = b - a, unknown = this.unknown[b] !== this.unknown[a];
    let gp = this.gain[b] - this.gain[a], gl = this.loss[b] - this.loss[a];
    // Reconstruct only this bounded window when prefix roundoff could change its sign, PF verdict or zero-loss state.
    const error = Number.EPSILON * 8 * (this.gain[b] + this.loss[b] + this.gain[a] + this.loss[a]) * (n + 2);
    if (!Number.isFinite(error) || gp <= error || gl <= error || Math.abs(gp - minPf * gl) <= error || Math.abs(gp - gl) <= error) {
      gp = 0; gl = 0;
      for (let i = a; i < b; i++) {
        const r = this.rows[i].unitReturn;
        if (r !== null && Number.isFinite(r)) { if (r > 0) gp += r; else gl -= r; }
      }
    }
    const unavailable = unknown || !Number.isFinite(gp) || !Number.isFinite(gl), ready = count === n;
    const pf = unavailable || !ready ? null : profitFactor(gp, gl);
    const mean = unavailable || !ready ? null : (gp - gl) / n;
    const state = unavailable ? "unknown" : !ready ? "insufficient"
      : pf !== null && Number.isFinite(pf) && gp > gl && pf >= minPf ? "qualified" : "failed";
    const value: CompactStageWindow = Object.freeze({ requestedN: n, n: count, state, pf, mean, gp, gl });
    this.cache.set(key, value);
    return value;
  }
}
