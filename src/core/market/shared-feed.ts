// One market feed for every runtime in the process (one runtime per exchange connection). The connections trade
// the same BingX market data: identical requests made at the same time are sent once and the answer is shared,
// so running x01, vst-01 and vst-02 side by side does not triple the REST load (and the exchange's IP limits).
// Every caller gets its own copy of the candles (a runtime appends to its arrays).
import { fetchHistory, fetchKlines, fetchTickers } from "./bingx.ts";
import type { Candle } from "../domain/types.ts";

type Entry<T> = { at: number; p: Promise<T> };

export class SharedFeed {
  private cache = new Map<string, Entry<unknown>>();
  private hits = 0;
  private misses = 0;

  private readonly src: { tickers: typeof fetchTickers; history: typeof fetchHistory; klines: typeof fetchKlines };
  private readonly ttl: { tickers: number; klines: number; history: number };

  constructor(
    src: { tickers: typeof fetchTickers; history: typeof fetchHistory; klines: typeof fetchKlines } = {
      tickers: fetchTickers,
      history: fetchHistory,
      klines: fetchKlines,
    },
    ttl = { tickers: 1_500, klines: 2_000, history: 60_000 },
  ) {
    this.src = src;
    this.ttl = ttl;
  }

  private once<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const e = this.cache.get(key) as Entry<T> | undefined;
    if (e && now - e.at < ttlMs) {
      this.hits++;
      return e.p;
    }
    this.misses++;
    const p = load();
    this.cache.set(key, { at: now, p });
    // a failed request is not shared with later callers
    p.catch(() => {
      if (this.cache.get(key)?.p === p) this.cache.delete(key);
    });
    if (this.cache.size > 2_000) this.prune(now);
    return p;
  }

  private prune(now: number) {
    for (const [k, e] of this.cache) if (now - e.at > this.ttl.history) this.cache.delete(k);
  }

  stats() {
    return { hits: this.hits, misses: this.misses, entries: this.cache.size };
  }

  readonly tickers: typeof fetchTickers = (host) =>
    this.once(`t|${host ?? ""}`, this.ttl.tickers, () => this.src.tickers(host)).then((xs) =>
      xs.map((x) => ({ ...x })),
    );

  readonly klines: typeof fetchKlines = (sym, tf, opt = {}) =>
    this.once(
      `k|${sym}|${tf}|${opt.startT ?? ""}|${opt.endT ?? ""}|${opt.limit ?? ""}|${opt.host ?? ""}|${opt.nowT ?? ""}`,
      this.ttl.klines,
      () => this.src.klines(sym, tf, opt),
    ).then(copy);

  readonly history: typeof fetchHistory = (sym, tf, bars, opt = {}) =>
    this.once(
      // the same minute's history is the same answer
      `h|${sym}|${tf}|${bars}|${opt.host ?? ""}|${Math.floor((opt.nowT ?? Date.now()) / 60_000)}`,
      this.ttl.history,
      () => this.src.history(sym, tf, bars, opt),
    ).then(copy);
}

const copy = (xs: Candle[]) => xs.map((c) => ({ ...c }));

const G = globalThis as unknown as { __ctsSharedFeed?: SharedFeed };
/** The process-wide feed every connection's runtime reads the market from. */
export function sharedFeed(): SharedFeed {
  return (G.__ctsSharedFeed ??= new SharedFeed());
}
