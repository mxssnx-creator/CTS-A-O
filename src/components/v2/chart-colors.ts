import { PF_NEUTRAL } from "../../core/metrics/profit-factor.mjs";

/** PF uses one; explicitly signed metrics such as net return may choose zero. */
export function divergeFill(value: number, neutral = PF_NEUTRAL, span = 1): string {
  if (!Number.isFinite(value) || !Number.isFinite(neutral) || !Number.isFinite(span) || span <= 0 || value === neutral)
    return "var(--v-grid)";
  const distance = Math.max(-1, Math.min(1, (value - neutral) / span));
  const percent = Math.round(Math.abs(distance) * 85 + 10);
  return `color-mix(in srgb, ${distance > 0 ? "var(--v-up)" : "var(--v-down)"} ${percent}%, var(--v-grid))`;
}
