import { profitFactorRatio } from "./metrics/profit-factor.mjs";
export interface CountSource {
  n: number;
  exitT: ArrayLike<number>;
  r: ArrayLike<number>;
  side?: ArrayLike<number>;
  wantSide?: number;
}
/** Immutable source columns; a heap merges only the requested last N closes, without copying full histories. */
export class CountAcceptanceIndex {
  private groups = new Map<string, readonly (CountSource & { invalid?: true })[]>();
  private clocks = new WeakMap<object, { n: number; valid: boolean }>();
  private memo = new Map<string, { n: number; pf: number }>();
  fork() {
    const out = new CountAcceptanceIndex();
    out.groups = new Map(this.groups);
    return out;
  }
  add(key: string, source: CountSource) {
    let valid =
      Number.isSafeInteger(source.n) &&
      source.n >= 0 &&
      source.n <= source.exitT.length &&
      source.n <= source.r.length &&
      (!source.side || (source.n <= source.side.length && [1, -1].includes(source.wantSide ?? 0)));
    let clock = this.clocks.get(source.exitT);
    if (!clock || clock.n !== source.n) {
      let ordered = true;
      for (let i = 0; i < source.n; i++)
        if (!Number.isFinite(source.exitT[i]) || (i > 0 && source.exitT[i] < source.exitT[i - 1])) {
          ordered = false;
          break;
        }
      clock = { n: source.n, valid: ordered };
      this.clocks.set(source.exitT, clock);
    }
    valid &&= clock.valid;
    this.groups.set(key, [
      ...(this.groups.get(key) ?? []),
      { ...source, ...(!valid ? { invalid: true as const } : {}) },
    ]);
    this.memo.clear();
  }
  stats(key: string, t: number, n: number): { n: number; pf: number } {
    if (!Number.isSafeInteger(n) || n < 1 || n > 500 || !Number.isFinite(t))
      return { n: 0, pf: NaN };
    const cache = JSON.stringify([key, t, n]),
      hit = this.memo.get(cache);
    if (hit) return hit;
    type Head = { source: CountSource; i: number; order: number };
    const heap: Head[] = [];
    const newer = (a: Head, b: Head) =>
      a.source.exitT[a.i] > b.source.exitT[b.i] ||
      (a.source.exitT[a.i] === b.source.exitT[b.i] &&
        (a.order > b.order || (a.order === b.order && a.i > b.i)));
    const push = (x: Head) => {
      let i = heap.length;
      heap.push(x);
      while (i) {
        const p = (i - 1) >> 1;
        if (!newer(heap[i], heap[p])) break;
        [heap[i], heap[p]] = [heap[p], heap[i]];
        i = p;
      }
    };
    const pop = () => {
      const out = heap[0],
        last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          let c = i * 2 + 1;
          if (c >= heap.length) break;
          if (c + 1 < heap.length && newer(heap[c + 1], heap[c])) c++;
          if (!newer(heap[c], heap[i])) break;
          [heap[i], heap[c]] = [heap[c], heap[i]];
          i = c;
        }
      }
      return out;
    };
    const before = (s: CountSource, i: number) => {
      while (i >= 0 && s.side && s.side[i] !== s.wantSide) i--;
      return i;
    };
    let order = 0;
    for (const source of this.groups.get(key) ?? []) {
      if (source.invalid) return { n: 0, pf: NaN };
      let lo = 0,
        hi = source.n;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (source.exitT[mid] < t) lo = mid + 1;
        else hi = mid;
      }
      const i = before(source, lo - 1);
      if (i >= 0) push({ source, i, order });
      order++;
    }
    const values: number[] = [];
    while (heap.length && values.length < n) {
      const h = pop();
      values.push(h.source.r[h.i]);
      const i = before(h.source, h.i - 1);
      if (i >= 0) push({ ...h, i });
    }
    let gp = 0,
      gl = 0;
    for (let i = values.length - 1; i >= 0; i--) {
      gp += Math.max(0, values[i]);
      gl += Math.max(0, -values[i]);
    }
    const out = { n: values.length, pf: profitFactorRatio(gp, gl) };
    if (this.memo.size > 10000) this.memo.clear();
    this.memo.set(cache, out);
    return out;
  }
}
