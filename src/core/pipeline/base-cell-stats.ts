import { profitFactor } from "../metrics/stats.ts";

export interface BaseCellStat {
  n: number;
  pf: number;
  net: number;
  mdd: number;
  gp?: number;
  gl?: number;
  /** Invalid/overflowed executed returns: never qualify the Base cell. */
  invalid?: true;
}

/**
 * Reused only by synchronous Base cells of one immutable Universe job. Each simulator emits a chronological
 * run; merge those runs stably, preserving the original symbol/direction order when exit and entry times tie.
 * Returned statistics contain no references to these buffers. Unordered or nonfinite times use the original
 * stable comparator instead, so this optimization never relies on unverified caller ordering.
 */
export class BaseCellAccumulator {
  private rr = new Float64Array(256);
  private en = new Float64Array(256);
  private ex = new Float64Array(256);
  private order = new Int32Array(256);
  private spare = new Int32Array(256);
  private ends: number[] = [];
  private n = 0;
  private runStart = 0;
  private ordered = true;

  reset(): void {
    this.n = this.runStart = 0;
    this.ends.length = 0;
    this.ordered = true;
  }

  beginRun(): void {
    if (this.n > this.runStart) this.ends.push(this.n);
    this.runStart = this.n;
  }

  readonly push = (r: number, entryT: number, exitT: number): void => {
    if (this.n === this.rr.length) {
      const capacity = this.rr.length * 2;
      const grow = (a: Float64Array) => {
        const b = new Float64Array(capacity);
        b.set(a);
        return b;
      };
      this.rr = grow(this.rr);
      this.en = grow(this.en);
      this.ex = grow(this.ex);
      this.order = new Int32Array(capacity);
      this.spare = new Int32Array(capacity);
    }
    if (
      !Number.isFinite(entryT) || !Number.isFinite(exitT) ||
      (this.n > this.runStart && (
        exitT < this.ex[this.n - 1] ||
        (exitT === this.ex[this.n - 1] && entryT < this.en[this.n - 1])
      ))
    ) this.ordered = false;
    this.rr[this.n] = r;
    this.en[this.n] = entryT;
    this.ex[this.n] = exitT;
    this.n++;
  };

  stats(): BaseCellStat {
    const n = this.n;
    if (!n) return { n: 0, pf: 0, net: 0, mdd: 0 };
    if (n > this.runStart) {
      this.ends.push(n);
      this.runStart = n;
    }
    let indices: Int32Array | number[] | undefined;
    if (!this.ordered) {
      indices = Array.from({ length: n }, (_, i) => i).sort(
        (a, b) => this.ex[a] - this.ex[b] || this.en[a] - this.en[b],
      );
    } else if (this.ends.length > 1) {
      for (let i = 0; i < n; i++) this.order[i] = i;
      let src = this.order;
      let dest = this.spare;
      const count = this.ends.length;
      for (let width = 1; width < count; width *= 2) {
        for (let run = 0; run < count; run += width * 2) {
          const lo = run ? this.ends[run - 1] : 0;
          const mid = this.ends[Math.min(run + width, count) - 1];
          const hi = this.ends[Math.min(run + width * 2, count) - 1];
          let a = lo;
          let b = mid;
          let at = lo;
          while (a < mid && b < hi) {
            const ia = src[a];
            const ib = src[b];
            if (
              this.ex[ia] < this.ex[ib] ||
              (this.ex[ia] === this.ex[ib] && this.en[ia] <= this.en[ib])
            ) dest[at++] = src[a++];
            else dest[at++] = src[b++];
          }
          while (a < mid) dest[at++] = src[a++];
          while (b < hi) dest[at++] = src[b++];
        }
        const prev = src;
        src = dest;
        dest = prev;
      }
      this.order = src;
      this.spare = dest;
      indices = src;
    }
    let gp = 0;
    let gl = 0;
    let sum = 0;
    let cum = 0;
    let peak = 0;
    let mdd = 0;
    for (let j = 0; j < n; j++) {
      const r = this.rr[indices ? indices[j] : j];
      if (r > 0) gp += r;
      else gl -= r;
      sum += r;
      cum += r;
      if (cum < peak) {
        if (peak - cum > mdd) mdd = peak - cum;
      } else peak = cum;
    }
    const pf = profitFactor(gp, gl);
    // A malformed fill, fee or extreme numerical overflow cannot become an apparently winning Base cell.
    // Preserve the settled sample count for diagnostics, but never expose a qualifying PF or net return.
    if (!(Number.isFinite(gp) && Number.isFinite(gl) && Number.isFinite(sum) &&
      Number.isFinite(cum) && Number.isFinite(peak) && Number.isFinite(mdd) && Number.isFinite(pf) &&
      Number.isFinite(sum * 100) && Number.isFinite(mdd * 100) &&
      Number.isFinite(gp * 100) && Number.isFinite(gl * 100)))
      return { n, pf: 0, net: 0, mdd: 0, gp: 0, gl: 0, invalid: true };
    return { n, pf, net: sum * 100, mdd: mdd * 100, gp: gp * 100, gl: gl * 100 };
  }
}

const cells = new WeakMap<object, BaseCellAccumulator>();
export function baseCellAccumulator(job: object): BaseCellAccumulator {
  let cell = cells.get(job);
  if (!cell) cells.set(job, (cell = new BaseCellAccumulator()));
  cell.reset();
  return cell;
}
