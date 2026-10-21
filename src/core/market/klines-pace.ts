// Pacing of the realtime bar pull (BingX public klines). x01, 14 Oct: 60 symbols × 1m bars were all due at second 0
// of each minute (last + 2·tf), a bar not yet published was re-asked every second, 6 at a time, and after a ban all
// were asked again the instant it lifted — 140 of 179 klines bans (100410 "请稍后重试") fell in seconds 0–4 of a
// minute, 7–13 an hour. Pure: the runtime keeps the per-symbol state and asks this which symbols to fetch now.

/** per symbol: when its klines were last asked, and how many asks in a row brought no new bar */
export interface KlinesPace {
  at: number;
  empty: number;
}

/** asks in flight at once (was 6) */
export const KLINES_CONCURRENCY = 2;
const OFFSET_MIN_MS = 1_500;
const OFFSET_MAX_MS = 20_000;
/** the shortest gap between two asks of one symbol (the old klinesAt gate) */
const MIN_GAP_MS = 1_000;
const BACKOFF_MS = [2_000, 4_000, 8_000, 15_000] as const;

/**
 * The symbol's own wait after a bar's close (and after a ban's end) before it is asked: 1.5–20 s, stable per symbol
 * (FNV-1a of its name), so the universe's asks spread over the window instead of all landing on second 0.
 */
export function klinesOffsetMs(sym: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < sym.length; i++) {
    h ^= sym.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return OFFSET_MIN_MS + (h % (OFFSET_MAX_MS - OFFSET_MIN_MS + 1));
}

/** the wait after `empty` asks in a row brought nothing new (the bar is not published yet, or the symbol is halted) */
export function klinesBackoffMs(empty: number): number {
  return BACKOFF_MS[Math.min(BACKOFF_MS.length, Math.max(1, empty)) - 1];
}

/**
 * The symbols to ask now, in the order given. Due: its next bar closed at least its offset ago, it is at most 300
 * bars behind (further back the gap repair takes it), the last klines ban (`resumeAt`, its end) ended at least its
 * offset ago, and its last ask is older than its backoff (1 s after an answer with new bars).
 */
export function dueKlines(
  items: ReadonlyArray<{ sym: string; last: number }>,
  now: number,
  tfMs: number,
  pace: ReadonlyMap<string, KlinesPace>,
  resumeAt = 0,
): string[] {
  const out: string[] = [];
  for (const { sym, last } of items) {
    const off = klinesOffsetMs(sym);
    if (last + 2 * tfMs + off > now || now - last > 300 * tfMs) continue;
    if (now < resumeAt + off) continue;
    const p = pace.get(sym);
    if (p && now - p.at < (p.empty > 0 ? klinesBackoffMs(p.empty) : MIN_GAP_MS)) continue;
    out.push(sym);
  }
  return out;
}
