// Memory held between and inside computes (14 Oct): what a compute is done with is released when it is done with it,
// and every release keeps the same results (scripts/core-golden.mjs digests the engine's results across computes).
//   - the stage universe's indicator memos are cleared after the signal history (held through lastUniverse until the
//     next compute's Base), also when the signal history aborts;
//   - the previous tape set's index and the live books of the previous run are released at the swap;
//   - results.by_sym (per-symbol JSON nobody reads) is not stored;
//   - the status' tape size memo holds the tape set by a weak reference;
//   - the candles are columns (market/candle-series.ts), not an object per bar;
//   - the boot loader streams the candles and builds the same map, in the same symbol order;
//   - the signal acceptance record's counts are 4-byte integers and every query answers as before.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { memInfo, type MemInfo } from "./memguard.server.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { setImmediate as tick } from "node:timers/promises";
import { SignalAcceptIndex, acceptKey, type AcceptTape } from "../signals.ts";
import { pinSyntheticEnd, rng, trackRuntimes } from "../test-support.ts";

pinSyntheticEnd();

const tiny = {
  symbols: 2,
  historyDays: 6,
  tfDays: { "1": 2, "5": 3, "15": 6, "30": 6 },
  mainTop: 6,
  refineTop: 2,
  evalTop: 4,
  cycleMs: 60_000,
  grid: { short: false as const },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
};
const until = async (cond: () => boolean, ms = 600_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};
type Inner = {
  gen: number;
  compute(gen?: number): Promise<void>;
  tapeIdx: unknown;
  liveBooks: unknown;
  loadCandlesFromDb(): void;
};

describe("memory released after use, results unchanged", { timeout: 900_000 }, () => {
  it("after a compute: no indicator memo left on the universe, the swap released the old index and books, no by_sym", async () => {
    const t = trackRuntimes();
    const rt = t.track(new CoreRuntime(new CoreDb(":memory:"), tiny as never, { market: "synthetic" }));
    try {
      rt.wf.validLastN = 0;
      rt.wf.lastN = 0;
      rt.start();
      await until(() => rt.status.computes >= 1 && (rt.status.paperSteps ?? 0) >= 1);
      rt.stop();
      const R = rt as unknown as Inner;
      await R.compute(R.gen);
      // (right after the compute: no pending-entries call has rebuilt them yet)
      assert.equal(R.tapeIdx, null, "the previous set's index is released at the swap");
      assert.equal(R.liveBooks, null, "the previous run's live books are released at the swap");
      const memo = (rt.lastUniverse?.caches ?? []).reduce((a, c) => a + (c as unknown as { m: Map<string, unknown> }).m.size, 0);
      assert.equal(memo, 0, "the universe's indicator memos are cleared after the signal history");
      const rows = rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM results")?.n ?? 0;
      assert.ok(rows > 0, "results were stored");
      assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM results WHERE by_sym IS NOT NULL")?.n, 0);
      // a detail page still recomputes a Base config's trades on the cleared universe
      const id = rt.db.get<{ id: string }>("SELECT id FROM results WHERE stage = 1 AND id NOT LIKE '%|dca%' AND id NOT LIKE '%axis%' LIMIT 1")?.id;
      if (id) assert.ok(Array.isArray(rt.comboTrades(id)));
    } finally {
      await t.disposeAll();
    }
  });

  it("a compute aborted in the signal history still clears the memos (they were held through the retry's peak)", async () => {
    const t = trackRuntimes();
    const rt = t.track(new CoreRuntime(new CoreDb(":memory:"), tiny as never, { market: "synthetic" }));
    try {
      rt.wf.validLastN = 0;
      rt.wf.lastN = 0;
      rt.start();
      await until(() => rt.status.computes >= 1 && (rt.status.paperSteps ?? 0) >= 1);
      rt.stop();
      const R = rt as unknown as Inner & { drive: (name: string, g: Generator, ...a: unknown[]) => Promise<unknown> };
      const drive0 = R.drive.bind(rt);
      const memoOf = () => (rt.lastUniverse?.caches ?? []).reduce((a, c) => a + (c as unknown as { m: Map<string, unknown> }).m.size, 0);
      let atAbort = -1;
      // the signal history runs until it has filled memos of its own, then the compute's check aborts it, as memory
      // pressure or a newer loop generation does
      R.drive = async (name, g, ...a) => {
        if (name !== "Signal history") return drive0(name, g, ...a);
        for (let i = 0; i < 1_000_000 && memoOf() === 0; i++) if (g.next().done) break;
        atAbort = memoOf();
        throw new Error("memory pressure: compute aborted (test)");
      };
      await assert.rejects(R.compute(R.gen), /memory pressure/);
      assert.ok(atAbort > 0, `the signal history ran and filled memos before the abort (${atAbort})`);
      assert.equal(memoOf(), 0, "the aborted compute's memos are cleared");
    } finally {
      await t.disposeAll();
    }
  });

  it("the status' tape size memo does not hold a tape set the runtime replaced", async () => {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (!gc) return assert.fail("needs --expose-gc (npm run test:core passes it)");
    const rt = new CoreRuntime(new CoreDb(":memory:"), tiny as never, { market: "synthetic" });
    try {
      const R = rt as unknown as { tapes: unknown[]; memStatus(m: MemInfo): void };
      const tapeMb = (): number => (rt.status.mem as { tapeMb?: number } | undefined)?.tapeMb ?? -1;
      // (in a plain function: an async function's suspended frame keeps its block locals)
      const install = () => {
        const old = [{ id: "a", n: 1_000_000 }];
        R.tapes = old;
        R.memStatus(memInfo());
        const mb = tapeMb();
        // the swap replaces the set; the status is not read again before the next collection
        R.tapes = [];
        return { ref: new WeakRef(old), mb };
      };
      const { ref, mb } = install();
      assert.ok(mb > 0, "the set's size is read");
      let gone = false;
      for (let i = 0; i < 6 && !gone; i++) {
        await tick();
        gc();
        gone = ref.deref() === undefined;
      }
      assert.ok(gone, "the replaced set is collectable");
      R.memStatus(memInfo());
      assert.equal(tapeMb(), 0, "the new set's size is read");
    } finally {
      rt.dispose();
    }
  });

  it("the runtime's candles are columns: 4 × 25,920 bars add under 4 MB of heap (17 MB as objects)", async () => {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (!gc) return assert.fail("needs --expose-gc (npm run test:core passes it)");
    const prevState = process.env.CTS_CORE_STATE;
    process.env.CTS_CORE_STATE = "off"; // (no SQLite copy: the heap of the bars alone)
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 4 } as never, { market: "synthetic" });
    try {
      const R = rt as unknown as { storeCandles(sym: string, cs: unknown[], append?: boolean): Promise<void> };
      const want = Math.round((rt.settings.historyDays * 24 * 60) / rt.settings.tfMin);
      // the input bars are made and dropped one symbol at a time, so only what the runtime keeps remains
      const store = async (sym: string) => {
        const r = rng(sym.length);
        const cs = Array.from({ length: want }, (_, i) => ({ t: 1_790_000_000_000 + i * 60_000, o: 1 + r(), h: 2, l: 0.5, c: 1 + r(), v: r() }));
        await R.storeCandles(sym, cs);
      };
      gc();
      const h0 = process.memoryUsage().heapUsed;
      for (const sym of ["A-USDT", "B-USDT", "C-USDT", "D-USDT"]) await store(sym);
      await new Promise((r) => setImmediate(r));
      gc();
      const mb = (process.memoryUsage().heapUsed - h0) / 1048576;
      assert.equal(rt.candles.size, 4);
      assert.equal(rt.candles.get("A-USDT")!.n, want);
      assert.ok(mb < 4, `the bars added ${mb.toFixed(1)} MB of heap`);
      // a one-bar append writes past the old bars in place; the series taken before still ends where it ended
      const before = rt.candles.get("A-USDT")!;
      const lastT = before.lastT()!;
      await R.storeCandles("A-USDT", [{ t: lastT + 60_000, o: 1, h: 1, l: 1, c: 1, v: 1 }], true);
      const after = rt.candles.get("A-USDT")!;
      assert.ok(CandleSeries.sharesBuffer(before, after), "in place");
      assert.equal(before.n, want);
      assert.equal(before.lastT(), lastT);
      assert.equal(after.lastT(), lastT + 60_000);
      assert.equal(after.n, want);
    } finally {
      if (prevState === undefined) delete process.env.CTS_CORE_STATE;
      else process.env.CTS_CORE_STATE = prevState;
      rt.dispose();
    }
  });

  it("the boot loader streams the candles: the same map, the same symbol order, the same values", () => {
    const db = new CoreDb(":memory:");
    const r = rng(7);
    const syms = ["ZZZ-USDT", "AAA-USDT", "MMM-USDT"];
    const ins = db.prep("INSERT INTO candles (sym, t, o, h, l, c, v) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const sym of syms)
      for (let i = 0; i < 500; i++) {
        const o = 1 + r();
        ins.run(sym, 1_790_000_000_000 + i * 60_000, o, o * 1.01, o * 0.99, o + (r() - 0.5) / 100, Math.round(r() * 1000));
      }
    // the previous loader, as a reference
    const ref = new Map<string, Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>>();
    for (const x of db.all<{ sym: string; t: number; o: number; h: number; l: number; c: number; v: number }>(
      "SELECT sym, t, o, h, l, c, v FROM candles ORDER BY sym, t",
    )) {
      const arr = ref.get(x.sym) ?? [];
      arr.push({ t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v });
      ref.set(x.sym, arr);
    }
    const rt = new CoreRuntime(db, tiny as never, { market: "synthetic" });
    try {
      rt.candles.clear();
      (rt as unknown as Inner).loadCandlesFromDb();
      assert.deepEqual([...rt.candles.keys()], [...ref.keys()], "symbol order");
      assert.deepEqual(new Map([...rt.candles].map(([k, cs]) => [k, cs.toCandles()])), ref);
    } finally {
      rt.dispose();
    }
  });
});

describe("signal acceptance record", () => {
  // the record as it was built before (Float64 counts, the scratch columns kept to the end), for the comparison
  function referenceStats(tapes: readonly AcceptTape[]) {
    const groups = new Map<string, Array<{ t: number; r: number; e: number; ii: number }>>();
    const inds = new Map<string, number>();
    for (const tp of tapes) {
      let ix = inds.get(tp.ind);
      if (ix === undefined) inds.set(tp.ind, (ix = inds.size));
      for (let i = 0; i < tp.n; i++) {
        const k = acceptKey(tp.ind, tp.syms[tp.symI[i]], tp.side[i], tp.kind);
        (groups.get(k) ?? groups.set(k, []).get(k)!).push({ t: tp.exitT[i], r: tp.r[i], e: tp.entryT ? tp.entryT[i] : 0, ii: tp.entryT ? ix : -1 });
      }
    }
    const out = new Map<string, { t: number[]; gp: number[]; gl: number[]; cn: number[] }>();
    for (const [k, xs] of groups) {
      const order = xs.map((_, i) => i).sort((a, b) => xs[a].t - xs[b].t);
      const g = { t: [] as number[], gp: [0], gl: [0], cn: [0] };
      const seen = new Map<number, Set<number>>();
      for (const i of order) {
        const x = xs[i];
        g.t.push(x.t);
        g.gp.push(g.gp.at(-1)! + (x.r > 0 ? x.r : 0));
        g.gl.push(g.gl.at(-1)! + (x.r > 0 ? 0 : -x.r));
        let first = true;
        if (x.ii >= 0) {
          let es = seen.get(x.ii);
          if (!es) seen.set(x.ii, (es = new Set()));
          if (es.has(x.e)) first = false;
          else es.add(x.e);
        }
        g.cn.push(g.cn.at(-1)! + (first ? 1 : 0));
      }
      out.set(k, g);
    }
    return out;
  }

  it("counts are 4-byte integers and every query answers as the reference does", () => {
    const r = rng(11);
    const tapes: AcceptTape[] = [];
    for (let k = 0; k < 12; k++) {
      const n = 200 + Math.floor(r() * 300);
      const exitT = new Float64Array(n);
      const entryT = new Float64Array(n);
      const rr = new Float64Array(n);
      const symI = new Uint16Array(n);
      const side = new Int8Array(n);
      for (let i = 0; i < n; i++) {
        entryT[i] = 1_790_000_000_000 + Math.floor(r() * 400) * 900_000;
        exitT[i] = entryT[i] + Math.floor(1 + r() * 20) * 900_000;
        rr[i] = (r() - 0.45) / 50;
        symI[i] = Math.floor(r() * 3);
        side[i] = r() < 0.5 ? 1 : -1;
      }
      tapes.push({ ind: `sig-ema-cross-${k % 3 ? "s" : "m"}@m15`, kind: k % 2 ? "normal" : "trailing", n, syms: ["A-USDT", "B-USDT", "C-USDT"], symI, side, exitT, r: rr, entryT });
    }
    const idx = new SignalAcceptIndex(tapes);
    const groups = (idx as unknown as { groups: Map<string, { cn: unknown }> }).groups;
    assert.ok(groups.size > 0);
    for (const g of groups.values()) assert.ok(g.cn instanceof Int32Array, "counts as Int32Array");
    const ref = referenceStats(tapes);
    for (const [k, g] of ref) {
      for (const hours of [6, 24, 48, 336])
        for (let q = 0; q < 40; q++) {
          const t = g.t[0] + r() * (g.t.at(-1)! - g.t[0] + 3_600_000);
          const above = (x: number) => g.t.filter((y) => y <= x).length;
          const b = above(t);
          const a = above(t - hours * 3_600_000);
          const gp = g.gp[b] - g.gp[a];
          const gl = g.gl[b] - g.gl[a];
          const want = { n: g.cn[b] - g.cn[a], pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
          assert.deepEqual(idx.stats(k, t, hours), want, `${k} t ${t} hours ${hours}`);
        }
    }
  });
});
