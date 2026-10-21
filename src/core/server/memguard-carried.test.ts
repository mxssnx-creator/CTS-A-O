import { PREVIOUS_DEFAULT_FOCUS_17OCT as LEGACY_FIXTURE_FOCUS } from "../config.ts";
// Memory fallback, partial processing: a carried range is not rebuilt in a compute, and its tapes of the previous
// compute end at that compute's last bar. The configs paper holds in it (seated or with an open position) are rebuilt
// on the current bars, so they keep taking entries and closing on new bars (frozen, a carried Micro / Minimal took no entry
// for as long as the fallback held); the rest of the range stays carried (not rebuilt). The realtime entry step
// builds the seated configs of every range, a carried one's included.
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { MEM_FALLBACK_MAX } from "./memguard.server.ts";
import type { Candle, Protect } from "../domain/types.ts";
import type { CandleSeries } from "../market/candle-series.ts";
import type { ConfigTape } from "../sim/walkforward.ts";
import { runtimeFixtureGrid, trackRuntimes } from "../test-support.ts";

const tracked = trackRuntimes();
after(() => tracked.disposeAll());

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);

const small = {
  // Preserve this generic lifecycle fixture's original source scope. Exhaustive new-family grids are
  // covered separately by Micro/Inverse parity, the 20-symbol replay and 120-symbol load test.
  focus: [...LEGACY_FIXTURE_FOCUS],
  pinned: [],
  symbols: 3,
  historyDays: 6,
  tfDays: { "1": 2, "5": 3, "15": 6, "30": 6 },
  mainTop: 8,
  refineTop: 3,
  evalTop: 4,
  cycleMs: 60_000,
  grid: { ...runtimeFixtureGrid(), short: false as const },
  signals: { enabled: false },
  exitStrategy: { enabled: false },
  tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
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
  tapes: ConfigTape[];
  candles: Map<string, CandleSeries>;
  memComputeLevel: number;
  fastArgs: { main: { protects: readonly Protect[] } } | null;
  compute(gen?: number): Promise<void>;
  storeCandles(sym: string, cs: Candle[], append?: boolean): Promise<void>;
};

/** a tape's closes and open positions (what the new bars change) */
const sig = (t: ConfigTape) =>
  JSON.stringify([t.n, [...t.exitT], [...t.r], t.open.map((o) => [o.sym, o.side, o.entryT])]);

describe("memory fallback: carried range on new bars", { timeout: 900_000 }, () => {
  it("the held configs of a carried range are rebuilt on the new bars, the rest stays carried", async () => {
    const rt = tracked.track(new CoreRuntime(new CoreDb(":memory:"), small as never, { market: "synthetic" }));
    const R = rt as unknown as Inner;
    try {
      rt.wf.validLastN = 0;
      rt.wf.lastN = 0;
      rt.start();
      await until(() => rt.status.computes >= 1 && rt.status.state === "running" && (rt.status.paperSteps ?? 0) >= 1);
    } finally {
      rt.stop();
    }
    // three hours of new bars after the compute's last one
    const end0 = rt.status.lastBarT;
    for (const [sym, cs] of R.candles) {
      const last = cs.bar(cs.n - 1);
      const step = last.t - cs.t[cs.n - 2];
      const add: Candle[] = [];
      let px = last.c;
      for (let i = 1; i <= Math.round((3 * 3_600_000) / step); i++) {
        const o = px;
        px = o * (1 + 0.004 * Math.sin(i / 5));
        add.push({ t: last.t + i * step, o, h: Math.max(o, px) * 1.001, l: Math.min(o, px) * 0.999, c: px, v: 100 });
      }
      await R.storeCandles(sym, add, true);
    }
    assert.ok(rt.status.lastBarT > end0);
    // the previous compute's tapes, and every Minimal config rebuilt in full on the new bars (the reference)
    const prev = R.tapes;
    const before = new Map(prev.filter((t) => t.protect.tag === "mn").map((t) => [t.id, sig(t)] as const));
    await R.compute(R.gen);
    const ref = new Map(R.tapes.filter((t) => t.protect.tag === "mn").map((t) => [t.id, sig(t)] as const));
    // Minimal (on by default; Micro is off): carried at the lightest level, as on x01 — two configs the new bars
    // change, one of them held by paper
    const moved = [...before.keys()].filter((id) => ref.has(id) && ref.get(id) !== before.get(id));
    assert.ok(moved.length >= 2, `Minimal configs the new bars change (${moved.length} of ${before.size})`);
    const [held, carried] = moved;
    R.tapes = prev;
    rt.paper.selected = [...rt.paper.selected.filter((id) => id !== carried), held];
    rt.paper.positions = rt.paper.positions.filter((p) => p.cfg !== carried);
    rt.memFallback = MEM_FALLBACK_MAX;
    await R.compute(R.gen);
    assert.equal(R.memComputeLevel, MEM_FALLBACK_MAX, "computed at the fallback level");
    const now = new Map(R.tapes.map((t) => [t.id, t] as const));
    assert.ok(now.has(held) && now.has(carried), "both stay in the set");
    assert.equal(sig(now.get(carried)!), before.get(carried), "an unheld carried config keeps its previous tape (not rebuilt)");
    assert.equal(sig(now.get(held)!), ref.get(held), "a held carried config is rebuilt on the current bars");
    assert.ok(
      R.fastArgs?.main.protects.some((p) => p.tag === "mn"),
      "the realtime entry step builds the seated configs of a carried range too",
    );
  });
});
