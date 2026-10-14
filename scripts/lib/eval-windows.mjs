// The evaluated span of scripts/eval-gate.mjs, its windows and the history each window's session has before its start.
//
// - Each window is its own causal session over exactly that window (`runH`): a short last window (a span that is not a
//   multiple of 48 h) ran a 48 h session before, and its gate drops, Base survivors and validated sets were counted
//   over 48 h that overlapped the previous window.
// - The span's choose / judge split defaults to the D1 split only on the D1 span; another span is cut at its middle
//   hour (a fixed 10-04 split put every trade of a pre-D1 span in one half and a measured PF of 0 in the other).
// - The engine loads every bar of the feed before a window (tfDays, up to 18 days per lane): what limits a window's
//   warm-up is the feed's own start. The engine's warm-up is ENGINE_WARMUP_H (100 h); historic signal configs need their
//   lookback (96 h). A lane's volatility rank is valid only after RANK_BARS (336) bars of its own history (168 h on 30 m):
//   before that its volatility-filtered entries are missing, and warmupOf reports those lanes per window (limitedLanes).

import { closeSync, openSync, readSync } from "node:fs";

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

/** Bars of the volatility-regime rank (src/core/indications/filters.ts VOL_RANK_BARS): valid after this many lane bars. */
export const RANK_BARS = 336;

/** The engine's warm-up the eval asks for, hours (operator, 13 Oct: 100 h; the tactics' full need is 178 h). */
export const ENGINE_WARMUP_H = 100;

/**
 * Hours of history a window needs before its start: the engine's warm-up (`engineH`, default ENGINE_WARMUP_H), and with
 * signals whose historic configs are on, the signal lookback (`lookbackH`: the historic entries come from that many hours
 * before the window's start). The lookback replaces the older "one signal hold more" rule: an entry is counted only if its
 * hold closed before the start, and the lookback bounds which entries those are.
 * @param {{ engineH?: number, signals: boolean, hist: boolean, lookbackH?: number }} o
 */
export function warmupNeedH({ engineH = ENGINE_WARMUP_H, signals, hist, lookbackH = 0 }) {
  const need = Math.max(0, Math.ceil(Number(engineH) || 0));
  return signals && hist && lookbackH > 0 ? Math.max(need, Math.ceil(lookbackH)) : need;
}

/** Hours of a lane's own history before its volatility rank is valid (RANK_BARS bars of that lane). */
export function rankValidH(tfMin) {
  return (RANK_BARS * tfMin) / 60;
}

/**
 * The feed's start: the median first bar over its candle series (a symbol listed later does not move it). Scans the
 * raw JSON text for each series' first bar, so the parent never parses the whole feed.
 * @param {string} text the feed file (core-session --record-feed: { tickers, candles: { "SYM|tf": [{ t, … }] } })
 */
export function feedStartT(text) {
  const starts = [];
  for (let m; (m = SERIES_START.exec(text)); ) starts.push(Number(m[1]));
  SERIES_START.lastIndex = 0;
  return medianStart(starts);
}
// a series' first bar: "SYM|tf":[{"t":<ms>
const SERIES_START = /"[^"|]+\|\d+":\[\{"t":(\d+)/g;
const medianStart = (starts) => {
  if (!starts.length) return null;
  starts.sort((a, b) => a - b);
  return starts[starts.length >> 1];
};
/** a series-start match is never longer than this (a symbol name, its timeframe and a millisecond time) */
const START_MAX = 128;

/**
 * feedStartT over a feed file read in chunks (the same matches and the same median): eval-gate held the whole 318 MB
 * feed as a Buffer for the whole eval, and its latin1 copy as a string, only to read this one time.
 * A match is taken from a chunk only when it starts before the chunk's last START_MAX characters; those are carried into
 * the next chunk and scanned there, so a match cut by a chunk boundary is read whole, once.
 */
export function feedStartTFile(path, chunkBytes = 8 << 20) {
  const fd = openSync(path, "r");
  const buf = Buffer.allocUnsafe(chunkBytes);
  const starts = [];
  let carry = "";
  let pos = 0;
  try {
    for (;;) {
      const n = readSync(fd, buf, 0, chunkBytes, pos);
      pos += n;
      const end = n <= 0;
      const text = carry + (end ? "" : buf.toString("latin1", 0, n));
      const cut = end ? Infinity : text.length - START_MAX;
      SERIES_START.lastIndex = 0;
      for (let m; (m = SERIES_START.exec(text)); ) {
        if (m.index >= cut) break;
        starts.push(Number(m[1]));
      }
      SERIES_START.lastIndex = 0;
      if (end) break;
      carry = text.slice(Math.max(0, cut));
    }
  } finally {
    closeSync(fd);
  }
  return medianStart(starts);
}

/**
 * Each window's history before its start against the warm-up it needs (null feed start: unknown, never short), and the
 * lanes whose volatility rank is not yet valid at the window's start (`limitedLanes`: their volatility-filtered entries
 * are missing in the early part of the window). `tfs` are the lanes in minutes.
 */
export function warmupOf(windows, feedStart, needH, tfs = []) {
  return windows.map((w) => {
    const haveH = feedStart == null ? null : Math.floor((w.from - feedStart) / H);
    const limitedLanes = haveH == null ? [] : tfs.filter((tf) => haveH < rankValidH(tf));
    return { haveH, needH, short: haveH != null && haveH < needH, limitedLanes };
  });
}
