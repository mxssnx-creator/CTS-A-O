// Genuine trade-price OHLCV, with event-time boundaries, bounded lateness and explicit gaps.
import type { Candle } from "../domain/types.ts";

export interface MarketTrade {
  sym: string;
  t: number;
  price: number;
  quantity: number;
  id?: string;
}
export interface RecordedTradeBar extends Candle {
  sym: string;
  intervalMs: number;
  trades: number;
  source: "bingx-trades";
}
type Bucket = RecordedTradeBar & { firstT: number; lastT: number };

export class TradeBars {
  private readonly buckets = new Map<string, Map<number, Bucket>>();
  private readonly seen = new Map<string, number>();
  private watermark = -Infinity;
  readonly intervalMs: number;
  readonly latenessMs: number;
  private readonly emit: (bar: RecordedTradeBar) => void;
  readonly stats = { accepted: 0, invalid: 0, late: 0, duplicates: 0, emitted: 0 };
  constructor(
    intervalMs = 5000,
    latenessMs = 2000,
    emit: (bar: RecordedTradeBar) => void = () => {},
  ) {
    if (
      !Number.isSafeInteger(intervalMs) ||
      intervalMs < 1 ||
      !Number.isSafeInteger(latenessMs) ||
      latenessMs < 0
    )
      throw new RangeError("invalid trade-bar interval/lateness");
    this.intervalMs = intervalMs;
    this.latenessMs = latenessMs;
    this.emit = emit;
  }
  put(trade: MarketTrade, receivedAt = trade.t): boolean {
    const { sym, t, price, quantity, id } = trade;
    if (
      !/^[A-Z0-9]+-USDT$/.test(sym) ||
      !Number.isSafeInteger(t) ||
      t <= 0 ||
      !Number.isFinite(receivedAt) ||
      t > receivedAt + 30_000 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      this.stats.invalid++;
      return false;
    }
    const start = Math.floor(t / this.intervalMs) * this.intervalMs;
    if (start + this.intervalMs <= this.watermark) {
      this.stats.late++;
      return false;
    }
    const key = id ? `${sym}|${id}` : null;
    if (key && this.seen.has(key)) {
      this.stats.duplicates++;
      return false;
    }
    if (key) {
      this.seen.set(key, t);
      if (this.seen.size > 100_000) this.seen.delete(this.seen.keys().next().value!);
    }
    let buckets = this.buckets.get(sym);
    if (!buckets) {
      buckets = new Map();
      this.buckets.set(sym, buckets);
    }
    let bar = buckets.get(start);
    if (!bar) {
      bar = {
        sym,
        t: start,
        o: price,
        h: price,
        l: price,
        c: price,
        v: 0,
        intervalMs: this.intervalMs,
        trades: 0,
        source: "bingx-trades",
        firstT: t,
        lastT: t,
      };
      buckets.set(start, bar);
    }
    if (t < bar.firstT) {
      bar.o = price;
      bar.firstT = t;
    }
    if (t >= bar.lastT) {
      bar.c = price;
      bar.lastT = t;
    }
    bar.h = Math.max(bar.h, price);
    bar.l = Math.min(bar.l, price);
    bar.v += quantity;
    bar.trades++;
    this.stats.accepted++;
    return true;
  }
  /** Flush only buckets closed by the event watermark. No invented bars across disconnects or idle periods. */
  flush(nowT: number): void {
    if (!Number.isFinite(nowT)) throw new RangeError("finite trade watermark required");
    this.watermark = Math.max(this.watermark, nowT - this.latenessMs);
    for (const [sym, buckets] of this.buckets) {
      for (const [start, bar] of [...buckets].sort(([a], [b]) => a - b)) {
        if (start + this.intervalMs > this.watermark) continue;
        const { firstT: _first, lastT: _last, ...closed } = bar;
        this.emit(closed);
        buckets.delete(start);
        this.stats.emitted++;
      }
      if (!buckets.size) this.buckets.delete(sym);
    }
    for (const [key, t] of this.seen)
      if (t < this.watermark - this.intervalMs) this.seen.delete(key);
  }
  pending(): number {
    return [...this.buckets.values()].reduce((n, bars) => n + bars.size, 0);
  }
}
