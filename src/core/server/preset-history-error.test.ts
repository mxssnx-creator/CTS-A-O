import assert from "node:assert/strict";
import { test } from "node:test";
import type { Candle } from "../domain/types.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

test("a preset history error stays visible and stops dispatching the remaining symbol batches", async () => {
  const symbols = Array.from({ length: 16 }, (_, i) => `S${i}-USDT`);
  const started: string[] = [];
  const waiting: Array<(value: Candle[]) => void> = [];
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, { symbols: symbols.length, signals: { enabled: false }, exitStrategy: { enabled: false } } as never,
    { market: "bingx", priceStream: null, feed: { history: (async (sym: string) => {
      started.push(sym);
      if (sym === symbols[0]) throw new Error("rate limit 429");
      return new Promise<Candle[]>((resolve) => waiting.push(resolve));
    }) as never } });
  rt.stop();
  rt.status.symbols = symbols;
  const inner = rt as unknown as { runPresetBacktest(p: unknown, days: number, job: unknown): Promise<void>;
    btCandles: Map<string, unknown> };
  const job = { id: "test", label: "test", days: 1, state: "running", stage: "market data", progress: 0, startedAt: Date.now() };
  const preset = { id: "test", label: "test", kind: "research", at: 0, settings: { symbols: symbols.length }, wf: {}, metrics: {} };
  const run = inner.runPresetBacktest(preset, 1, job);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      run.then(() => "unexpected success", (error: unknown) => error instanceof Error ? error.message : String(error)),
      new Promise<string>((resolve) => { timer = setTimeout(() => resolve("timed out"), 1000); }),
    ]);
    assert.match(result, /preset market history S0-USDT: rate limit 429/);
    assert.equal(started.length, 8, "only the already-started bounded batch may remain in flight");
    for (const resolve of waiting) resolve([]);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(started.length, 8, "an error cannot trigger further requests as the in-flight batch settles");
    assert.equal(inner.btCandles.size, 0, "partial history is not cached as a completed preset input");
  } finally {
    if (timer) clearTimeout(timer);
    for (const resolve of waiting) resolve([]);
    await run.catch(() => undefined);
    rt.dispose();
    db.db.close();
  }
});
