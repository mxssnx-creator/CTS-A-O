// The live append path of the columnar candles (memory, 14 Oct). Golden (synthetic: one store per symbol) and the
// eval replays (no new bar after the cut) never append; the desk appends every minute. Here the runtime's own
// storeCandles runs 400 seeded appends per symbol — through in-place writes, copies past the headroom and the trim to
// the history — beside a verbatim copy of the Candle[] code it replaced. At every step the bars, the last bar time,
// the lanes, the backtest's prices and the SQLite rows are the same; every series taken earlier is unchanged at the end.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, laneBars, laneSeriesFrom, marketHistoryBars } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { barsFromCandles, resample } from "../market/bars.ts";
import { CandleSeries } from "../market/candle-series.ts";
import type { Bars, Candle } from "../domain/types.ts";
import type { CoreSettings } from "../config.ts";
import { rng } from "../test-support.ts";

const M = 60_000;
// ── the Candle[] code before 14 Oct (runtime.server.ts), verbatim apart from its runtime fields ──
function refStore(ref: { candles: Map<string, Candle[]>; lastBarT: number; db: CoreDb }, want: number, sym: string, cs: Candle[], append: boolean) {
  const arr = append ? [...(ref.candles.get(sym) ?? []), ...cs] : [...cs];
  const trimmed = arr.slice(Math.max(0, arr.length - want));
  ref.candles.set(sym, trimmed);
  const last = trimmed[trimmed.length - 1]?.t ?? 0;
  if (last > ref.lastBarT) ref.lastBarT = last;
  const rows = cs.length > want ? cs.slice(cs.length - want) : cs;
  ref.db.tx(() => {
    for (const c of rows) ref.db.run("INSERT OR REPLACE INTO candles (sym, t, o, h, l, c, v) VALUES (?, ?, ?, ?, ?, ?, ?)", sym, c.t, c.o, c.h, c.l, c.c, c.v);
  });
  if (trimmed.length) ref.db.run("DELETE FROM candles WHERE sym = ? AND t < ?", sym, trimmed[0].t);
}
function refResampleTail(cs: readonly Candle[], srcMin: number, tf: number, n: number): Candle[] {
  if (!cs.length) return [];
  const tfMs = tf * 60_000;
  const from = Math.floor(cs[cs.length - 1].t / tfMs) * tfMs - (n + 1) * tfMs;
  let lo = 0;
  let hi = cs.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (cs[m].t < from) lo = m + 1;
    else hi = m;
  }
  return resample(lo > 0 ? cs.slice(lo) : cs, srcMin, tf);
}
function refLanes(candles: ReadonlyMap<string, Candle[]>, s: CoreSettings, extraDays = 0): Bars[] {
  const out: Bars[] = [];
  const lanes = Object.freeze([...(s.tfs ?? [s.tfMin])]);
  for (const [sym, cs] of candles)
    for (const tf of lanes) {
      const n = laneBars(s, tf) + Math.round((extraDays * 24 * 60) / tf);
      const c = tf === s.tfMin ? cs : refResampleTail(cs, s.tfMin, tf, n);
      const b = barsFromCandles(sym, tf, c.length > n ? c.slice(c.length - n) : c);
      b.lanes = lanes;
      out.push(b);
    }
  return out;
}
const bytes = (a: Float64Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
function sameLanes(got: Bars[], want: Bars[], msg: string) {
  assert.equal(got.length, want.length, msg);
  for (let i = 0; i < got.length; i++) {
    assert.equal(got[i].sym, want[i].sym, msg);
    assert.equal(got[i].tfMin, want[i].tfMin, msg);
    assert.equal(got[i].n, want[i].n, `${msg}: ${got[i].sym} ${got[i].tfMin}m n`);
    assert.deepEqual(got[i].lanes, want[i].lanes, msg);
    for (const k of ["t", "o", "h", "l", "c", "v"] as const)
      assert.equal(Buffer.compare(bytes(got[i][k]), bytes(want[i][k])), 0, `${msg}: ${got[i].sym} ${got[i].tfMin}m ${k}`);
  }
}

describe("columnar candles: the append path against the Candle[] code", () => {
  it("400 appends per symbol: the same bars, last bar, lanes, prices and SQLite rows at every step", async (t) => {
    // This case verifies actual SQLite parity; the offline suite may inherit the deliberate no-SQL memory mode.
    const previousState = process.env.CTS_CORE_STATE;
    t.after(() => {
      if (previousState === undefined) delete process.env.CTS_CORE_STATE;
      else process.env.CTS_CORE_STATE = previousState;
    });
    delete process.env.CTS_CORE_STATE;
    // a short 1 m history: the headroom (90–179 bars) runs out every 30–60 steps, so the run copies many times
    const settings = { symbols: 3, historyDays: 0.5, tfDays: { "1": 0.25, "5": 0.5, "15": 0.5, "30": 0.5 }, tfs: [1, 5, 15, 30],
      signals: { enabled: false }, tactics: { volRegime: false, trendStrength: false, chopRegime: false } };
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, settings as never, { market: "synthetic" });
    const R = rt as unknown as { storeCandles(sym: string, cs: Candle[], append?: boolean): Promise<void> };
    const s = rt.settings;
    // No engine runs here: explicitly retain a 24h append buffer so 400 appends
    // exercise both headroom copies and trimming. Long strategy/Signal histories
    // are verified independently, and must not silently change this algorithm fixture.
    rt.wf = { ...rt.wf, preH: 0, longH: 0, symH: 0, simH: 0 };
    const want = marketHistoryBars(s, rt.wf);
    // (the runtime keeps at least a day: 1440 bars; 600 + ~1,500 appended cross the trim)
    assert.ok(want <= 1440, `want ${want}`);
    const ref = { candles: new Map<string, Candle[]>(), lastBarT: rt.status.lastBarT, db: new CoreDb(":memory:") };
    const r = rng(41);
    const syms = ["AAA-USDT", "BBB-USDT", "CCC-USDT"];
    const px = new Map(syms.map((x) => [x, 10 + r() * 50]));
    const next = new Map(syms.map((x, i) => [x, 1_790_000_000_000 + i * 3 * M]));
    const bars = (sym: string, n: number) =>
      Array.from({ length: n }, () => {
        const t = next.get(sym)!;
        next.set(sym, t + M);
        const o = px.get(sym)!;
        const c = o * (1 + (r() - 0.5) / 100);
        px.set(sym, c);
        return { t, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: r() * 100 };
      });
    const captured: Array<[CandleSeries, Candle[]]> = [];
    let inPlace = 0;
    let copies = 0;
    try {
      for (const sym of syms) {
        const cs = bars(sym, 600);
        await R.storeCandles(sym, cs, false);
        refStore(ref, want, sym, cs, false);
      }
      for (let step = 0; step < 400; step++) {
        for (const sym of syms) {
          const add = bars(sym, step === 200 ? 300 : 1 + Math.floor(r() * 5));
          const prev = rt.candles.get(sym)!;
          await R.storeCandles(sym, add, true);
          refStore(ref, want, sym, add, true);
          const got = rt.candles.get(sym)!;
          if (CandleSeries.sharesBuffer(prev, got)) inPlace++;
          else copies++;
          assert.deepEqual(got.toCandles(), ref.candles.get(sym), `step ${step} ${sym}`);
          if (r() < 0.05) captured.push([got, got.toCandles()]);
        }
        assert.equal(rt.status.lastBarT, ref.lastBarT, `step ${step}: last bar`);
        if (step % 10 === 0) {
          sameLanes(laneSeriesFrom(rt.candles, s), refLanes(ref.candles, s), `step ${step}: lanes`);
          sameLanes(laneSeriesFrom(rt.candles, s, 0.1), refLanes(ref.candles, s, 0.1), `step ${step}: lanes + a backtest window`);
          // the backtest's prices (backtestSeries reads closeAtOrBefore): against the old binary search
          for (const sym of syms) {
            const cs = ref.candles.get(sym)!;
            for (let q = 0; q < 20; q++) {
              const t = cs[0].t - 2 * M + r() * (cs.at(-1)!.t - cs[0].t + 4 * M);
              let want: number | null = null;
              if (cs[0].t <= t) {
                let lo = 0;
                let hi = cs.length - 1;
                while (lo < hi) {
                  const m = (lo + hi + 1) >> 1;
                  if (cs[m].t <= t) lo = m;
                  else hi = m - 1;
                }
                want = cs[lo].c;
              }
              assert.equal(rt.candles.get(sym)!.closeAtOrBefore(t), want, `price ${sym} ${t}`);
            }
          }
          const rows = (d: CoreDb) => d.all("SELECT sym, t, o, h, l, c, v FROM candles ORDER BY sym, t");
          assert.deepEqual(rows(rt.db), rows(ref.db), `step ${step}: SQLite rows`);
        }
      }
      // the runtime's own copies happened (the headroom ran out) and in-place appends happened
      for (const [x, want] of captured) assert.deepEqual(x.toCandles(), want, "a series taken earlier is unchanged");
      assert.ok(captured.length > 20, `captured ${captured.length}`);
      assert.ok(inPlace > 800 && copies > 20, `${inPlace} appends in place, ${copies} copies`);
    } finally {
      rt.dispose();
    }
  });

  it("an earlier version's Candle[] map is converted by ensureFields into a new map: the same order and bars; the old map keeps its arrays", () => {
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 2 } as never, { market: "synthetic" });
    try {
      const old = new Map<string, Candle[]>([
        ["ZZZ-USDT", [{ t: 1, o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }]],
        ["AAA-USDT", [{ t: 2, o: 2, h: 3, l: 1, c: 2.5, v: 4 }, { t: 3, o: 2.5, h: 3, l: 2, c: 2.7, v: 1 }]],
      ]);
      const held = new Map<string, unknown>(old);
      (rt as unknown as { candles: Map<string, unknown> }).candles = held;
      rt.ensureFields();
      assert.deepEqual([...rt.candles.keys()], ["ZZZ-USDT", "AAA-USDT"]);
      for (const [k, cs] of old) {
        assert.ok(rt.candles.get(k) instanceof CandleSeries);
        assert.deepEqual(rt.candles.get(k)!.toCandles(), cs);
        // the earlier module's code still holding the old map reads its arrays as before
        assert.equal(held.get(k), cs);
      }
      assert.notEqual(rt.candles as unknown, held);
      // converted once: a second call changes nothing
      const now = rt.candles;
      rt.ensureFields();
      assert.equal(rt.candles, now);
    } finally {
      rt.dispose();
    }
  });
});
