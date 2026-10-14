// Memory held between and inside computes (14 Oct): what a compute is done with is released when it is done with it,
// and every release keeps the same results (scripts/core-golden.mjs digests the engine's results across computes).
//   - the stage universe's indicator memos are cleared after the signal history (held through lastUniverse until the
//     next compute's Base);
//   - the previous tape set's index and the live books of the previous run are released at the swap;
//   - results.by_sym (per-symbol JSON nobody reads) is not stored;
//   - the boot loader streams the candles and builds the same map, in the same symbol order;
//   - the signal acceptance record's counts are 4-byte integers and every query answers as before.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
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
      assert.deepEqual(rt.candles, ref);
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
