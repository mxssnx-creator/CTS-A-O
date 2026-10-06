// The market cut of a simulated session (scripts/core-session.mjs): the engine sees only candles closed before it.
const H = 3_600_000;

/**
 * The cut time of a session run: `--end-at` (floored to the hour), else `--end-ago` hours before the current hour,
 * else the current hour itself — never "now". Run up to now, the walk-forward floors its start to the hour and a
 * "3 h" run spanned 3 h 57 min (four hour rows, the last one partial). `toNow` keeps the old behaviour (0 = no cut).
 */
export function sessionCutT(o: { endAt?: string; endAgo?: number; toNow?: boolean; now: number }): number {
  const at = o.endAt ? Date.parse(o.endAt) : NaN;
  if (Number.isFinite(at) && at > 0) return Math.floor(at / H) * H;
  const hour = Math.floor(o.now / H) * H;
  if ((o.endAgo ?? 0) > 0) return hour - (o.endAgo as number) * H;
  return o.toNow ? 0 : hour;
}
