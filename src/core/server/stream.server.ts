// Live prices by WebSocket (BingX swap market, public): one connection, `<SYM>@lastPrice` per symbol of the
// universe. The 100 ms tick loop reads the newest price per symbol from here instead of polling REST (which the
// exchange rate-limits far below 10 requests per second). Reconnects with backoff and re-subscribes; a REST
// ticker poll (≥ 2 s apart) covers a stream that is down.
import { gunzipSync } from "node:zlib";

const URL_MAINNET = "wss://open-api-swap.bingx.com/swap-market";

export interface StreamStats {
  connected: boolean;
  symbols: number;
  /** price updates received in the last 10 s, per second */
  rate: number;
  /** age of the newest price across all symbols, ms */
  ageMs: number;
  reconnects: number;
  lastError: string | null;
}

export class PriceStream {
  private ws: WebSocket | null = null;
  private prices = new Map<string, { px: number; at: number }>();
  private want = new Set<string>();
  private subscribed = new Set<string>();
  private closed = true;
  private backoff = 1_000;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private recent: number[] = [];
  private reconnects = 0;
  private lastError: string | null = null;
  private seq = 0;

  private url: string;
  constructor(url = URL_MAINNET) {
    this.url = url;
  }

  /** Start (idempotent) and follow this symbol list. */
  follow(symbols: readonly string[]) {
    this.want = new Set(symbols);
    if (this.closed) {
      this.closed = false;
      this.connect();
    } else this.sync();
  }

  stop() {
    this.closed = true;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.subscribed.clear();
  }

  /** Newest price of a symbol if not older than maxAgeMs. */
  price(sym: string, maxAgeMs = 30_000): number | null {
    const p = this.prices.get(sym);
    return p && Date.now() - p.at <= maxAgeMs ? p.px : null;
  }

  /** Feed a price from another source (REST fallback). */
  put(sym: string, px: number, at = Date.now()) {
    if (px > 0) this.prices.set(sym, { px, at });
  }

  stats(): StreamStats {
    const now = Date.now();
    this.recent = this.recent.filter((t) => now - t <= 10_000);
    let newest = 0;
    for (const p of this.prices.values()) newest = Math.max(newest, p.at);
    return {
      connected: !!this.ws && this.ws.readyState === 1,
      symbols: this.subscribed.size,
      rate: this.recent.length / 10,
      ageMs: newest ? now - newest : Infinity,
      reconnects: this.reconnects,
      lastError: this.lastError,
    };
  }

  private connect() {
    if (this.closed || typeof WebSocket === "undefined") return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch (err) {
      this.fail(err);
      return;
    }
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 1_000;
      this.subscribed.clear();
      this.sync();
    };
    ws.onmessage = (e) => {
      let txt: string;
      try {
        txt =
          typeof e.data === "string"
            ? e.data
            : gunzipSync(Buffer.from(e.data as ArrayBuffer)).toString();
      } catch {
        return;
      }
      if (txt === "Ping") {
        ws.send("Pong");
        return;
      }
      const m = /"s":"([A-Z0-9-]+)","c":"([0-9.]+)"/.exec(txt);
      if (m) {
        this.prices.set(m[1], { px: Number(m[2]), at: Date.now() });
        this.recent.push(Date.now());
        if (this.recent.length > 20_000) this.recent.splice(0, 10_000);
      }
    };
    ws.onerror = (e) => {
      this.lastError = (e as { message?: string }).message ?? "stream error";
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.subscribed.clear();
      if (!this.closed) this.scheduleReconnect();
    };
  }

  private fail(err: unknown) {
    this.lastError = err instanceof Error ? err.message : String(err);
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.retry || this.closed) return;
    this.reconnects++;
    const ms = this.backoff;
    this.backoff = Math.min(60_000, this.backoff * 2);
    this.retry = setTimeout(() => {
      this.retry = null;
      this.connect();
    }, ms);
    (this.retry as { unref?: () => void }).unref?.();
  }

  /** Subscribe what is wanted, unsubscribe what is not. */
  private sync() {
    const ws = this.ws;
    if (!ws || ws.readyState !== 1) return;
    for (const s of this.want)
      if (!this.subscribed.has(s)) {
        ws.send(
          JSON.stringify({ id: String(++this.seq), reqType: "sub", dataType: `${s}@lastPrice` }),
        );
        this.subscribed.add(s);
      }
    for (const s of [...this.subscribed])
      if (!this.want.has(s)) {
        ws.send(
          JSON.stringify({ id: String(++this.seq), reqType: "unsub", dataType: `${s}@lastPrice` }),
        );
        this.subscribed.delete(s);
        this.prices.delete(s);
      }
  }
}
