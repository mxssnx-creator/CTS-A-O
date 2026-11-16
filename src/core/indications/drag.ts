/** BTC-relative, completed-bar research signals. Each profile is evaluated as its own config. */
import type { IndicationSpec } from "./registry.ts";
import type { SeriesCache } from "./cache.ts";

export const DRAG_REFERENCE = "BTC-USDT";
export const DRAG_TIMEFRAMES = [1, 5, 15] as const;
export const DRAG_WINDOWS = [20, 40] as const;
export const DRAG_RATIOS = [0.5, 0.75] as const;
export const DRAG_METHODS = ["catchup", "confirmed"] as const;
export type DragMethod = (typeof DRAG_METHODS)[number];
export const DRAG_IDS = DRAG_WINDOWS.flatMap(window => DRAG_RATIOS.flatMap(ratio =>
  DRAG_METHODS.map(method => `drag-${method}-${window}-r${Math.round(ratio * 100)}`)));
export const isDragInd = (id: string) => id.startsWith("drag-");

/**
 * The fit uses only the previous `window` aligned returns. A three-bar BTC move and
 * the symbol's contemporaneous move are observed on the closed signal bar. A gap or
 * unavailable BTC bar invalidates the entire fit; BTC itself cannot trade against itself.
 */
export function dragState(k: SeriesCache, window: number, ratio: number, method: DragMethod): Int8Array {
  const name = `drag:${window}:${ratio}:${method}`;
  return k.memo(name, () => {
    const b = k.b;
    const peer = k.reference(DRAG_REFERENCE);
    if (!peer) return new Int8Array(b.n);
    const returns = k.memo("drag:returns", () => {
      const calc = (i: number) => i && b.t[i] - b.t[i - 1] === b.tfMin * 60_000 &&
        b.c[i] > 0 && b.c[i - 1] > 0 ? Math.log(b.c[i] / b.c[i - 1]) : NaN;
      return k.streamMath ? k.streamMath.vector("drag:returns", b.n, () => 0, (i, out) => { out[i] = calc(i); })
        : Float64Array.from({ length: b.n }, (_, i) => calc(i));
    });
    type State = { sx: number; sy: number; sxx: number; syy: number; sxy: number; count: number };
    const init = (): State => ({ sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0, count: 0 });
    const frame = k.streamMath?.frame<{ value: Int8Array }, State>(name, b.n, ["value"], init, ["value"]);
    const out = frame?.cols.value ?? new Int8Array(b.n);
    const s = frame?.state ?? init();
    const add = (i: number, direction: number) => {
      if (i < 0) return;
      const x = peer.ret[i], y = returns[i];
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      s.sx += direction * x; s.sy += direction * y; s.sxx += direction * x * x;
      s.syy += direction * y * y; s.sxy += direction * x * y; s.count += direction;
    };
    for (let i = frame?.from ?? 0; i < b.n; i++) {
      add(i - 1, 1); add(i - window - 1, -1);
      if (s.count !== window || i < 2) continue;
      const vx = s.sxx - s.sx * s.sx / window;
      const vy = s.syy - s.sy * s.sy / window;
      const cov = s.sxy - s.sx * s.sy / window;
      if (!(vx > 1e-16 && vy > 1e-16 && cov > 0)) continue;
      const beta = cov / vx, corr = cov / Math.sqrt(vx * vy);
      if (!(beta >= 0.1 && beta <= 4 && corr >= 0.3)) continue;
      const btc = peer.ret[i] + peer.ret[i - 1] + peer.ret[i - 2];
      const alt = returns[i] + returns[i - 1] + returns[i - 2];
      if (!Number.isFinite(btc) || !Number.isFinite(alt) || Math.abs(btc) < 0.0005) continue;
      const expected = beta * btc, side = Math.sign(expected);
      if (method === "catchup") {
        // Only a same-direction lag (or an opposite move) with room to catch up.
        if (side * alt < ratio * Math.abs(expected)) out[i] = side;
      } else if (side * alt >= ratio * Math.abs(expected) && side * alt <= 2 * Math.abs(expected)) {
        out[i] = side;
      }
    }
    frame?.commit(s);
    return out;
  });
}
export function dragSpecs(): IndicationSpec[] {
  return DRAG_WINDOWS.flatMap(window => DRAG_RATIOS.flatMap(ratio => DRAG_METHODS.map(method => ({
    id: `drag-${method}-${window}-r${Math.round(ratio * 100)}`,
    kind: "drag" as const,
    label: `Drag · BTC ${method} · ${window} bars · ${ratio} ratio`,
    params: { window, ratio },
    fn: (k: SeriesCache) => dragState(k, window, ratio, method),
  }))));
}
