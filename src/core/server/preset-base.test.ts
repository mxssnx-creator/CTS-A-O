// The preset backtest's Base (presetBase, on the bars before its window) and its tapes: the pairs entering Main pass
// the Base gate on the worker cores exactly as in-process — the worker messages carried no gates, so every combo with a
// run entered — and the tapes are built under the engine's rules: only the ranges a pair passed (basePass, shared with
// the compute) and the Micro indication rule (the backtest built every range of every pair, Micro cells for all).
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { basePass, CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { closePool } from "./pool.server.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { allCombos, type ComboRun } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS, type CoreSettings } from "../config.ts";
import { MICRO_RANGE } from "../minimal-coord.ts";
import { isMicroInd } from "../indications/micro.ts";
import { laneOf } from "../indications/registry.ts";
import { EXIT_BOT } from "../exit-strategy.ts";
import type { Bars } from "../domain/types.ts";
import type { ConfigTape } from "../sim/walkforward.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);

const END = Date.UTC(2026, 8, 20);
const BARS = 1500;
// the pool test's fixture: three synthetic symbols, 15m, the first 60 combos (every one of them has a run)
const bars = ["A", "B", "C"].map((s) => barsFromCandles(`${s}-USDT`, 15, syntheticCandles(s, 15, BARS, END)));
const combos = allCombos().slice(0, 60);

type BaseOut = {
  main: Set<string>;
  pairTags: Record<string, string[]>;
  pairTps: Record<string, Record<string, readonly number[]>>;
  exitBasePassed: Set<string>;
  exitBaseEvaluated: number;
};
type Inner = {
  presetBase(
    job: unknown,
    s: CoreSettings,
    combos: unknown[],
    lookBars: Bars[],
    exitCombos?: unknown[],
    exitLookBars?: Bars[],
    signalExitCombos?: unknown[],
    signalExitLookBars?: Bars[],
  ): Promise<BaseOut>;
  runPresetBacktest(p: unknown, days: number, job: unknown): Promise<void>;
  sliced(g: Generator<unknown, unknown>, f: (v: unknown) => void): Promise<unknown>;
};
const job = () => ({ id: "t", label: "t", days: 1, state: "running", stage: "Base", progress: 0, startedAt: Date.now() });
/** with CTS_CORE_WORKERS=1 (the worker path) or =0 (in-process) for the duration of fn */
async function withWorkers<T>(workers: boolean, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.CTS_CORE_WORKERS;
  process.env.CTS_CORE_WORKERS = workers ? "1" : "0";
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.CTS_CORE_WORKERS;
    else process.env.CTS_CORE_WORKERS = prev;
  }
}
const mk = () => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic" });
  rt.stop();
  return rt;
};
/** the backtest's Main on workers or in-process */
const mainOf = (gates: Partial<CoreSettings["gates"]>, workers: boolean) =>
  withWorkers(workers, async () => {
    const s = { ...DEFAULT_SETTINGS, mainTop: 0, gates: { ...DEFAULT_SETTINGS.gates, ...gates } };
    return (await (mk() as unknown as Inner).presetBase(job(), s, combos, bars)).main;
  });

describe("preset backtest Base", { timeout: 300_000 }, () => {
  after(() => closePool());

  it("a pair that fails the Base gate never enters Main on the workers", async () => {
    // 3 symbols × 1,500 bars: no pair can close 10,000 trades, so nothing passes — on either path
    const none = { minTrades: 10_000 };
    assert.deepEqual([...(await mainOf(none, false))], []);
    assert.deepEqual([...(await mainOf(none, true))], [], "the worker path gates as the in-process one");
  });

  it("the worker path and the in-process path give the same Main", async () => {
    const lenient = { minPf: 1.05, minTrades: 6, maxDdr: 0 };
    const local = await mainOf(lenient, false);
    const remote = await mainOf(lenient, true);
    assert.ok(local.size > 0 && local.size < combos.length, `${local.size} of ${combos.length} pass`);
    assert.deepEqual([...remote].sort(), [...local].sort());
  });

  it("evaluates Signal Exit sources through the independent Exit Base stage on workers and locally", async () => {
    const ind = "sig-ema-cross-s@m15";
    const settings = {
      ...DEFAULT_SETTINGS,
      exitStrategy: { ...DEFAULT_SETTINGS.exitStrategy, enabled: true },
      gates: { ...DEFAULT_SETTINGS.gates, minTrades: 100_000 },
    };
    const run = (workers: boolean) => withWorkers(workers, async () => {
      const rt = mk() as unknown as Inner;
      return rt.presetBase(
        job(),
        settings,
        [],
        [],
        [],
        [],
        [{ bot: EXIT_BOT, ind }],
        bars,
      );
    });
    const local = await run(false);
    const worker = await run(true);
    assert.equal(local.exitBaseEvaluated, 1, "the configured Signal source is scored as its own Exit Base pair");
    assert.deepEqual(local.exitBasePassed, new Set(), "the intentionally strict gate rejects the pair");
    assert.deepEqual(worker.exitBasePassed, local.exitBasePassed);
    assert.equal(worker.exitBaseEvaluated, local.exitBaseEvaluated);
  });
});

describe("Base pass (the compute's and the preset backtest's rule)", () => {
  const stat = (pf: number, net: number) => ({ n: 20, pf, net, mdd: 1 });
  const run = (ind: string, full: ReturnType<typeof stat>, ranges: Record<string, ReturnType<typeof stat>>, tps = {}) =>
    ({ bot: "follow", ind, full, ranges, rangeTps: tps, score: 1 }) as unknown as ComboRun;

  it("a pair builds the ranges and targets it passed, and Micro only on its own indications", () => {
    // Micro on, Minimal's micro indications on (the "minimal" rule); the sets gates: PF ≥ 1, 12 closes, DDR ≤ 1
    const s = { ...DEFAULT_SETTINGS, grid: { ...DEFAULT_SETTINGS.grid, micro: MICRO_RANGE } };
    const out = basePass(
      [
        // fails at the default protect (net −1), passes Minimal (PF 1.4, net 3, DDR 1/3), fails General (PF 0.9)
        run("ema-21-55@m15", stat(0.8, -1), { mn: stat(1.4, 3), gn: stat(0.9, -1) }, { mn: [0.008] }),
        // a Micro cell passed by an indication that is not Micro's: Micro takes only its own indications
        run("ema-9-21@m15", stat(0.8, -1), { mc: stat(2, 4) }, { mc: [0.001] }),
        // a Micro indication: its Micro and Minimal cells pass and count; the default cell and General do not apply
        run("mc-tpull-13@m15", stat(1.5, 2), { mc: stat(1.6, 2), mn: stat(1.3, 2), gn: stat(2, 4) }, { mc: [0.001, 0.002], mn: [0.006] }),
      ],
      s,
    );
    assert.deepEqual(
      out.passed.map((r) => r.ind),
      ["ema-21-55@m15", "mc-tpull-13@m15"],
    );
    assert.deepEqual(out.pairTags, { "follow|ema-21-55@m15": ["mn"], "follow|mc-tpull-13@m15": ["mc", "mn"] });
    assert.deepEqual(out.pairTps, {
      "follow|ema-21-55@m15": { mn: [0.008] },
      "follow|mc-tpull-13@m15": { mc: [0.001, 0.002], mn: [0.006] },
    });
  });
});

describe("preset backtest combos", { timeout: 300_000 }, () => {
  // the engine's Base takes microLaneFloor (base-paths.test.ts); the backtest's Base took Micro's own 5m floor under
  // both rules, so with Minimal on Micro's indications (no lane floor) a Micro pair on 1m never reached its Minimal cells
  const preset = (minimal: object) => ({
    id: "t-micro-lanes",
    label: "t",
    info: "",
    kind: "research",
    at: 0,
    settings: {
      symbols: 1,
      tfs: [1, 5],
      tfDays: { "1": 1, "5": 2 },
      focus: ["follow|mc-tpull-8"],
      grid: { ...DEFAULT_SETTINGS.grid, micro: MICRO_RANGE, minimal: { ...DEFAULT_SETTINGS.grid.minimal, ...minimal } },
      signals: { ...DEFAULT_SETTINGS.signals, enabled: false },
    },
    wf: { mode: "durable", longH: 24 },
    metrics: {},
  });
  /** the combos the backtest hands its Base (the run stops there) */
  const baseCombos = async (minimal: object) => {
    const rt = mk() as unknown as Inner;
    let got: string[] = [];
    rt.presetBase = async (_job, _s, combos) => {
      got = (combos as Array<{ bot: string; ind: string }>).map((c) => `${c.bot}|${c.ind}`);
      throw new Error("stop after the combos");
    };
    await assert.rejects(rt.runPresetBacktest(preset(minimal), 1, job()), /stop after the combos/);
    return got;
  };

  it("Minimal on Micro's indications: every lane of a Micro pair; Micro alone: its 5m floor", async () => {
    // lanes [1, 5]: 1m, 1m combined (agrees with 5m), 5m
    assert.deepEqual(await baseCombos({}), ["follow|mc-tpull-8@m1", "follow|mc-tpull-8@m1c", "follow|mc-tpull-8@m5"]);
    assert.deepEqual(await baseCombos({ microInds: false }), ["follow|mc-tpull-8@m5"]);
  });
});

describe("preset backtest tapes", { timeout: 900_000 }, () => {
  const MICRO = "follow|mc-tpull-13@m15";
  const OTHER = "follow|ema-21-55@m15";
  const preset = (mode: string) => ({
    id: "t-micro",
    label: "t",
    info: "",
    kind: "research",
    at: 0,
    settings: {
      symbols: 2,
      tfs: [15],
      tfDays: { "15": 6 },
      focus: [MICRO, OTHER],
      grid: { ...DEFAULT_SETTINGS.grid, micro: MICRO_RANGE },
      tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
      gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.05, minTrades: 3, maxDdr: 0, baseSetsMinPf: 1 },
      signals: { ...DEFAULT_SETTINGS.signals, enabled: false },
      toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
    },
    wf: { mode, longH: 24 },
    metrics: {},
  });
  /** a 1-day backtest in-process: the tapes it built and its Base */
  const backtest = (mode: string) =>
    withWorkers(false, async () => {
      const rt = mk() as unknown as Inner;
      let tapes: ConfigTape[] | null = null;
      let base: BaseOut | null = null;
      const sliced = rt.sliced.bind(rt);
      rt.sliced = async (g, f) => {
        const r = await sliced(g, f);
        if (Array.isArray(r) && tapes === null) tapes = r as ConfigTape[];
        return r;
      };
      const presetBase = rt.presetBase.bind(rt);
      rt.presetBase = async (...a) => (base = await presetBase(...a));
      await rt.runPresetBacktest(preset(mode), 1, job());
      // the protect grid's cells (Normal / Trailing); DCA and Axis ladders follow their own rules, as in the compute
      const grid = (tapes ?? ([] as ConfigTape[])).filter((t) => t.kind === "normal" || t.kind === "trailing");
      return { tapes: grid, base: base as BaseOut | null };
    });
  const micro = (t: ConfigTape) => isMicroInd(laneOf(t.ind).base);
  // the Micro rule with Minimal's micro indications on: a Micro indication takes Micro and Minimal cells, every other
  // indication none of Micro's
  const fits = (t: ConfigTape) => (micro(t) ? t.protect.tag === "mc" || t.protect.tag === "mn" : t.protect.tag !== "mc");
  const label = (t: ConfigTape) => `${t.bot}|${t.ind} ${t.protect.tag ?? "wide"}`;

  it("a fixed focus set passes Base before building only its admitted ranges, keeping the Micro rule", async () => {
    const { tapes, base } = await backtest("fixed");
    assert.ok(base && base.main.size > 0 && tapes.length > 0, "fixed focus computes Base and builds its qualified cohort");
    assert.ok(tapes.every((t) => base.main.has(`${t.bot}|${t.ind}`)));
    assert.deepEqual([...new Set(tapes.filter((t) => !base.pairTags[`${t.bot}|${t.ind}`]?.includes(t.protect.tag ?? "")).map(label))], []);
    assert.deepEqual([...new Set(tapes.filter((t) => !fits(t)).map(label))], []);
  });

  it("after Base, a pair's tapes are only in the ranges it passed", async () => {
    const { tapes, base } = await backtest("durable");
    assert.ok(base && base.main.size > 0, "a pair passed Base");
    assert.ok(tapes.length > 0, "tapes were built");
    const outside = tapes.filter((t) => !base!.pairTags[`${t.bot}|${t.ind}`]?.includes(t.protect.tag ?? ""));
    assert.deepEqual([...new Set(outside.map(label))], []);
    assert.deepEqual([...new Set(tapes.filter((t) => !fits(t)).map(label))], []);
  });
});
