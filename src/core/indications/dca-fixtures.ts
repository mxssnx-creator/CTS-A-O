import type { DcaTacticConfig } from "./dca-tactic.ts";
export const START = 1_700_006_400_000;
export function waveBars(n = 720) {
  return Array.from({ length: n }, (_, i) => {
    const close = 100 + 4 * Math.sin(i / 11) + 2 * Math.sin(i / 43),
      open = 100 + 4 * Math.sin((i - 1) / 11) + 2 * Math.sin((i - 1) / 43);
    return {
      timestamp: START + i * 60000,
      open,
      high: Math.max(open, close) + 0.12,
      low: Math.min(open, close) - 0.12,
      close,
      volume: 100 + (i % 17),
    };
  });
}
export function declineBars(mirror = false) {
  const values = [...Array(8).fill(98.5), 101, 100.8, 100.5, 100.2, 100, 100, 100, 100, 100.6];
  return values.map((v, i) => {
    const c = mirror ? 200 - v : v;
    return {
      timestamp: START + i * 60000,
      open: i === 16 ? 100 : c,
      close: c,
      high: i === 16 && mirror ? 100.1 : c + 0.05,
      low: i === 16 && !mirror ? 99.9 : c - 0.05,
      volume: 10,
    };
  });
}

/** A causal closed-bar regime for an exact decline cell; no strategy result is asserted. */
export function declineCellBars(c: DcaTacticConfig, mirrored = false) {
  if (c.basis === "atr" && c.level * c.spacing > c.lookback) throw new Error("Unreachable ATR depth");
  const depth = Math.min(c.level + 0.5, c.basis === "atr" ? c.lookback / c.spacing : Infinity);
  const range = c.basis === "atr" ? 0.1 : c.spacing * depth;
  const high = 100 + range, low = 100, observedRange = high - low;
  const firstJump = c.basis === "atr" ? Math.max(0, observedRange * c.lookback / (c.spacing * depth) - observedRange) : 0;
  const before = high - firstJump;
  const values = [...Array(c.lookback - 1).fill(Math.min(90, before - 1)), before,
    high, ...Array(c.lookback - 1).fill(low), high + 1];
  return values.map((value, i) => {
    const last = i === values.length - 1;
    const row = {timestamp: START + i * 60000, open: last ? low : value, close: value,
      high: value, low: last ? low - 0.01 : value, volume: 10};
    return mirrored ? {...row, open: 200-row.open, close: 200-row.close, high: 200-row.low, low: 200-row.high} : row;
  });
}
