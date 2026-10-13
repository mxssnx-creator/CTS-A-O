// The evaluated span of scripts/eval-gate.mjs, its windows and the history each window's session has before its start.
//
// - Each window is its own causal session over exactly that window (`runH`): a short last window (a span that is not a
//   multiple of 48 h) ran a 48 h session before, and its gate drops, Base survivors and validated sets were counted
//   over 48 h that overlapped the previous window.
// - The span's choose / judge split defaults to the D1 split only on the D1 span; another span is cut at its middle
//   hour (a fixed 10-04 split put every trade of a pre-D1 span in one half and a measured PF of 0 in the other).
// - The engine loads every bar of the feed before a window (tfDays, up to 18 days per lane): what limits a window's
//   warm-up is the feed's own start. A window whose start lies inside the longest warm-up (the volatility-regime rank on
//   the slowest lane, plus the signal hold the historic configs need) builds no entry on that lane and no historic
//   config: such a variant reads as a measured null result.

const H = 3_600_000;

/** The default evaluated span (D1) and its split. */
export const D1_DEFAULT = Object.freeze({ from: "2026-09-29T11:00:00Z", to: "2026-10-09T11:00:00Z", split: "2026-10-04T11:00:00Z" });

/**
 * @param {{ from?: string, to?: string, split?: string }} a the command line's --from / --to / --split (undefined = not given)
 * @returns {{ from: number, to: number, split: number }}
 */
export function resolveSpan({ from, to, split } = {}) {
  const f = Date.parse(from ?? D1_DEFAULT.from);
  const t = Date.parse(to ?? D1_DEFAULT.to);
  if (!Number.isFinite(f) || !Number.isFinite(t)) throw new Error(`--from / --to: not a date (${from} / ${to})`);
  if (!(t > f)) throw new Error("--to must lie after --from");
  // a session's run is whole hours ending on the hour (core-session --end-at, --run)
  if (f % H || t % H) throw new Error("--from / --to must fall on the hour");
  const isD1 = f === Date.parse(D1_DEFAULT.from) && t === Date.parse(D1_DEFAULT.to);
  const s =
    split !== undefined ? Date.parse(split) : isD1 ? Date.parse(D1_DEFAULT.split) : f + Math.max(1, Math.floor((t - f) / H / 2)) * H;
  if (!(s > f && s < t)) throw new Error(`--split ${split ?? new Date(s).toISOString()} lies outside the span (${new Date(f).toISOString()} to ${new Date(t).toISOString()})`);
  return { from: f, to: t, split: s };
}

/**
 * Consecutive windows of `lenH` hours over the span, the last one cut at the span's end; each with the run length its
 * own session gets (`runH`, whole hours).
 * @param {{ from: number, to: number }} span
 */
export function evalWindows(span, lenH = 48) {
  const out = [];
  for (let t = span.from; t < span.to; t += lenH * H) {
    const to = Math.min(span.to, t + lenH * H);
    out.push({ from: t, to, runH: Math.round((to - t) / H) });
  }
  return out;
}

/**
 * Hours of history a window needs before its start: the tactics' warm-up bars on the slowest lane, and with signals
 * whose historic configs are on, one signal hold more (an entry counts only once its hold closed before the cut).
 * @param {{ tfs: number[], warmupBars: number, signals: boolean, hist: boolean, holdH: number }} o
 */
export function warmupNeedH({ tfs, warmupBars, signals, hist, holdH }) {
  const maxTf = Math.max(1, ...tfs);
  const engine = (warmupBars * maxTf) / 60;
  return Math.ceil(signals && hist ? engine + holdH : engine);
}

/**
 * The feed's start: the median first bar over its candle series (a symbol listed later does not move it). Scans the
 * raw JSON text for each series' first bar, so the parent never parses the whole feed.
 * @param {string} text the feed file (core-session --record-feed: { tickers, candles: { "SYM|tf": [{ t, … }] } })
 */
export function feedStartT(text) {
  const re = /"[^"|]+\|\d+":\[\{"t":(\d+)/g;
  const starts = [];
  for (let m; (m = re.exec(text)); ) starts.push(Number(m[1]));
  if (!starts.length) return null;
  starts.sort((a, b) => a - b);
  return starts[starts.length >> 1];
}

/** Each window's history before its start against the warm-up it needs (null feed start: unknown, never short). */
export function warmupOf(windows, feedStart, needH) {
  return windows.map((w) => {
    const haveH = feedStart == null ? null : Math.floor((w.from - feedStart) / H);
    return { haveH, needH, short: haveH != null && haveH < needH };
  });
}
