import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { syntheticCandles } from "../market/bars.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime, type MarketFeed } from "./runtime.server.ts";

const END = Date.UTC(2026, 9, 12, 15);
const SYMS = Array.from({ length: 20 }, (_, i) => `S${String(i).padStart(2, "0")}-USDT`);
const runtimes: CoreRuntime[] = [];
afterEach(() => { for (const rt of runtimes.splice(0)) rt.dispose(); });

type Internals = {
  dirty: boolean;
  gen: number;
  compute(gen: number): Promise<void>;
  stepPaperGen(): Generator<number, void>;
  runAuditAsync(): Promise<void>;
  runCompare(): Promise<void>;
  runAdjust(): void;
  buildListings(): void;
  schedule(ms: number): void;
  memStartBlocked(): boolean;
  memGuardStart(gen: number): void;
  memGuardStop(gen: number): void;
  memAfterCompute(): void;
};
function fixture({ replay = true, conn, fail = new Set<string>(), onHistory, forced = true, tickers = SYMS }:
  { replay?: boolean; conn?: "bingx-vst-02"; fail?: Set<string>; onHistory?: (rt: CoreRuntime, sym: string) => void; forced?: boolean; tickers?: string[] } = {}) {
  const calls: string[] = [], computes: string[][] = [], papers: string[][] = [];
  const feed: Partial<MarketFeed> = {
    tickers: async () => tickers.map((sym, i) => ({ sym, last: 1, quoteVol: 1e9 - i, changePct: 0 })),
    history: async (sym, tf, bars) => {
      calls.push(sym);
      onHistory?.(rt, sym);
      if (fail.has(sym)) throw new Error("fixture unavailable");
      return syntheticCandles(sym, tf, bars, END);
    },
    klines: async () => [],
  };
  const rt = new CoreRuntime(new CoreDb(":memory:"), {
    symbols: 20, historyDays: 1, tfMin: 1, tfs: [1], tfDays: { "1": 1 }, symbolRank: "volume",
    forceSymbols: forced ? SYMS : [], cycleMs: 60_000,
  }, { market: "bingx", priceStream: null, replay, conn, feed });
  runtimes.push(rt);
  const r = rt as unknown as Internals;
  // Keep the real cycle/backfill/paper publication orchestration; replace strategy computation and comparison.
  r.compute = async () => { computes.push([...rt.candles.keys()]); rt.status.computes++; r.dirty = false; };
  r.stepPaperGen = function* () { papers.push([...rt.candles.keys()]); };
  r.runAuditAsync = async () => {};
  r.runCompare = async () => {};
  r.runAdjust = r.buildListings = () => {};
  r.schedule = () => {};
  r.memStartBlocked = () => false;
  r.memGuardStart = r.memGuardStop = r.memAfterCompute = () => {};
  return { rt, calls, computes, papers };
}

describe("fixed replay startup universe", () => {
  it("loads all twenty symbols before its first compute and paper publication", async () => {
    const { rt, calls, computes, papers } = fixture();
    await rt.cycle();
    assert.equal(rt.status.error, null);
    assert.deepEqual(calls.slice().sort(), SYMS);
    assert.deepEqual(computes.map((xs) => xs.slice().sort()), [SYMS]);
    assert.deepEqual(papers.map((xs) => xs.slice().sort()), [SYMS]);
    assert.equal(rt.status.paperSteps, 1);
    assert.equal(rt.status.prehistoric?.total, 20);
    assert.equal(rt.status.prehistoric?.loaded, 20);
    assert.equal(rt.status.prehistoric?.complete, false, "loading alone never claims completed strategy evaluation");
  });

  it("retains the live and connected desks' progressive five-symbol first batch", async () => {
    for (const opts of [{ replay: false }, { replay: true, conn: "bingx-vst-02" as const }]) {
      const { rt, calls, computes, papers } = fixture(opts);
      await rt.cycle();
      assert.equal(calls.length, 5);
      assert.deepEqual(computes.map((xs) => xs.length), [5]);
      assert.deepEqual(papers.map((xs) => xs.length), [5]);
      assert.equal(rt.status.prehistoric?.complete, false);
    }
  });

  it("publishes no partial book when a symbol fails and retries only that symbol", async () => {
    const fail = new Set([SYMS[19]]);
    const { rt, calls, computes, papers } = fixture({ fail });
    await rt.cycle();
    assert.match(rt.status.error ?? "", /Replay universe incomplete: 19\/20.*missing S19-USDT/);
    assert.equal(rt.status.state, "error");
    assert.equal(rt.status.prehistoric?.loaded, 19);
    assert.equal(rt.status.prehistoric?.total, 20);
    assert.equal(rt.status.prehistoric?.symbols[SYMS[19]].state, "skipped");
    assert.equal(rt.status.prehistoric?.complete, false);
    assert.equal(computes.length, 0);
    assert.equal(papers.length, 0);
    assert.equal(rt.status.paperSteps, 0);
    fail.clear();
    await rt.cycle();
    assert.equal(calls.length, 21);
    assert.equal(calls[20], SYMS[19]);
    assert.equal(rt.status.error, null);
    assert.deepEqual(computes.map((xs) => xs.slice().sort()), [SYMS]);
    assert.deepEqual(papers.map((xs) => xs.slice().sort()), [SYMS]);
  });

  it("keeps cancellation from publishing a partial replay", async () => {
    const { rt, calls, computes, papers } = fixture({ onHistory: (runtime) => runtime.stop() });
    await rt.cycle();
    assert.equal(rt.status.state, "stopped");
    assert.ok(calls.length <= 4, "only the already scheduled fetch workers can start");
    assert.equal(rt.candles.size, 0, "canceled fetches cannot publish loaded candles");
    assert.deepEqual(computes, []);
    assert.deepEqual(papers, []);
    assert.equal(rt.status.paperSteps, 0);
  });

  it("reuses usable cached symbols while refetching an incomplete symbol before any compute", async () => {
    const { rt, calls, computes, papers } = fixture();
    const want = rt.settings.historyDays * 24 * 60;
    for (const sym of SYMS)
      rt.candles.set(sym, CandleSeries.fromCandles(syntheticCandles(sym, 1, sym === SYMS[19] ? 3 : want, END), want));
    await rt.cycle();
    assert.deepEqual(calls, [SYMS[19]], "a count-complete cache must still validate each replay symbol's history");
    assert.equal(rt.candles.get(SYMS[19])?.n, want);
    assert.deepEqual(computes.map((xs) => xs.slice().sort()), [SYMS]);
    assert.deepEqual(papers.map((xs) => xs.slice().sort()), [SYMS]);
  });

  it("rejects unexpected cached symbols without computing or discarding cached holdings", async () => {
    for (const count of [19, 20]) {
      const { rt, calls, computes, papers } = fixture();
      const cached = [...SYMS.slice(0, count), "EXTRA-USDT"];
      const want = rt.settings.historyDays * 24 * 60;
      for (const sym of cached)
        rt.candles.set(sym, CandleSeries.fromCandles(syntheticCandles(sym, 1, 200, END), want));
      const extra = rt.candles.get("EXTRA-USDT");
      const held = { cfg: "follow|ema-9-21@m15|tp2|sl2|tr0|h64", sym: "EXTRA-USDT", side: 1 as const,
        entryT: END - 3_600_000, entryI: 0, entry: 100, peak: 100, trailOn: false, stop: 98, target: 102, mtm: -.01, vol: 1, level: 0 };
      rt.paper.positions = [held];
      rt.paper.selected = [held.cfg];
      await rt.cycle();
      assert.match(rt.status.error ?? "", /Replay universe mismatch: unexpected cached symbols EXTRA-USDT.*requested 20-symbol universe.*separate empty replay database/);
      assert.equal(rt.status.state, "error");
      assert.equal(rt.status.prehistoric?.complete, false);
      assert.equal(rt.candles.size, cached.length, "the mismatched cache remains available for recovery");
      assert.equal(rt.candles.get("EXTRA-USDT"), extra);
      assert.deepEqual(rt.paper.positions, [held], "held identity, stop and target cannot be pruned with the cache");
      assert.deepEqual(rt.paper.selected, [held.cfg]);
      assert.deepEqual(calls, [], "reject before fetching a missing ranked symbol into a larger universe");
      assert.deepEqual(computes, []);
      assert.deepEqual(papers, []);
      assert.equal(rt.status.paperSteps, 0);
    }
  });

  it("does not certify a smaller ranked universe as the requested twenty symbols", async () => {
    const { rt, computes, papers } = fixture({ forced: false, tickers: SYMS.slice(0, 19) });
    await rt.cycle();
    assert.match(rt.status.error ?? "", /Replay universe incomplete: 19\/20/);
    assert.equal(rt.status.prehistoric?.total, 20);
    assert.equal(rt.status.prehistoric?.loaded, 19);
    assert.equal(rt.status.prehistoric?.complete, false);
    assert.deepEqual(computes, []);
    assert.deepEqual(papers, []);
  });
});
