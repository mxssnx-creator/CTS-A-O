// Session report variants (report-variants.ts), the cases report-variants.test.ts does not cover: across a desk-like
// baseline, a bare one and the code default, EVERY variant row the list defines either runs — its options go through a
// real walk-forward on a tiny synthetic input and summarize to finite numbers — or states why it is not run; ids are
// unique, labels and descriptions present, and no "run" row repeats the baseline. The sizing variants all replay.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWalkForward,
  makeTape,
  walkForward,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { DEFAULT_SIGNALS } from "../signal-config.ts";
import type { Trade } from "../domain/types.ts";
import {
  effectOf,
  sizingReplay,
  sizingVariants,
  summarizeRun,
  walkForwardVariants,
  type ReplayPosition,
  type SizingSpec,
  type VariantContext,
  type VariantSpec,
} from "./report-variants.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const SYM = "AAA-USDT";

/** 60 hourly closes (every third a loser, alternating long / short) and one entry inside the simulated window */
function trades(cfg: string, kind: Trade["kind"]): Trade[] {
  const mk = (r: number, entryT: number, side: 1 | -1): Trade =>
    ({
      cfg,
      sym: SYM,
      side,
      entryT,
      exitT: entryT + 30 * 60_000,
      entry: 100,
      exit: 100 * (1 + side * r),
      r,
      reason: r > 0 ? "tp" : "sl",
      bars: 2,
      mfe: 0,
      mae: 0,
      kind,
    }) as Trade;
  const out: Trade[] = [];
  for (let i = 0; i < 60; i++)
    out.push(mk(i % 3 === 2 ? -0.01 : 0.01, NOW - 70 * H + i * H, i % 2 ? -1 : 1));
  out.push(mk(0.01, NOW - 2 * H + 10 * 60_000, 1));
  out.push(mk(0.01, NOW - 1 * H + 10 * 60_000, -1));
  return out;
}
const ENG = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
const SIG = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32";
const tapes = () => [
  makeTape(ENG, "follow", "rsi-mom-14-20@m15", P, "normal", [SYM], trades(ENG, "normal"), [], []),
  makeTape(SIG, "follow", "sig-ema-cross-s@m15", P, "normal", [SYM], trades(SIG, "normal"), [], []),
];
const u = {
  bars: [],
  caches: [],
  startT: T0,
  endT: NOW,
  splitT: T0,
  nowT: NOW,
  baseTf: 60,
} as never;

const code: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  protects: [],
  dcaProtects: [],
  simH: 6,
};
const ALL_ON = {
  normal: true,
  trailing: true,
  block: true,
  blockActive: true,
  dca: true,
  dcaActive: true,
  axis: true,
};
const ALL_OFF = {
  normal: false,
  trailing: false,
  block: false,
  blockActive: false,
  dca: false,
  dcaActive: false,
  axis: false,
};

/** the baselines: a desk with every switch on, a bare one with every switch off and no tapes, the code default */
const CASES: Array<{ name: string; base: WalkForwardOptions; ctx: VariantContext }> = [
  {
    name: "desk",
    base: {
      ...code,
      toggles: ALL_ON,
      coord: {
        enabled: true,
        hourLock: 1,
        cooldown: "signals",
        conflict: true,
        confirm: true,
        s2Windows: true,
        hedge: true,
      },
      signalRank: DEFAULT_SIGNALS,
      signalActive: new Set([`follow|sig-ema-cross-s@m15|${SYM}|1`]),
      engineSideAccept: { enabled: true, minPf: 1.05, hours: 3, minTrades: 30 },
      signalAccept: { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 },
      block: { ...code.block, mode: "additive", steps: 4 },
      rangeGate: { lastN: 50, minPf: 1.1 },
      symGate: "proven",
      symMinN: 5,
      sideGateN: 10,
      maxPositions: 12,
      gates: { ...code.gates, warmup: false, lastNFloor: 5, minGreen: 0.4 },
    },
    ctx: {
      kinds: { normal: 2, trailing: 2, dca: 1, "dca-active": 1, axis: 1 },
      signalTapes: 1,
      tactics: {
        session: true,
        volRegime: true,
        trendStrength: true,
        chopRegime: true,
        cooldown: true,
      },
    },
  },
  {
    name: "bare",
    base: {
      ...code,
      toggles: ALL_OFF,
      coord: undefined,
      signalRank: undefined,
      signalActive: undefined,
      rangeGate: undefined,
      symGate: "off",
      lastN: 0,
      validLastN: 0,
      signalValidLastN: undefined,
      sideGateN: 0,
      maxPositions: 0,
    },
    ctx: { kinds: {}, signalTapes: 0, tactics: null },
  },
  {
    name: "code default",
    base: code,
    ctx: { kinds: { normal: 2, trailing: 2, dca: 0, "dca-active": 0, axis: 0 }, signalTapes: 1 },
  },
];
const GROUPS = new Set(["types", "signals", "coordination", "block", "gates", "tactics"]);

describe("walk-forward variants: every row runs or says why", () => {
  const lists = CASES.map((c) => ({ ...c, vs: walkForwardVariants(c.base, c.ctx) }));

  it("ids are unique, every row is labelled and described, status and options agree", () => {
    for (const { name, vs } of lists) {
      const ids = vs.map((v) => v.id);
      assert.equal(
        new Set(ids).size,
        ids.length,
        `${name}: duplicate ids ${ids.filter((x, i) => ids.indexOf(x) !== i)}`,
      );
      for (const v of vs) {
        const at = `${name} ${v.id}`;
        assert.match(v.id, /^(type|sig|coord|block|gate|tactic):[A-Za-z0-9.-]+$/, at);
        assert.ok(GROUPS.has(v.group), `${at}: group ${v.group}`);
        assert.ok(v.label.trim().length > 0, `${at}: label`);
        assert.ok(v.change.trim().length > 0, `${at}: change`);
        assert.ok(typeof v.asRun === "string" && v.asRun.trim().length > 0, `${at}: asRun`);
        if (v.status === "run") {
          assert.ok(v.opts, `${at}: a run row carries its options`);
          assert.equal(v.why, undefined, `${at}: a run row needs no reason`);
        } else {
          assert.ok(v.status === "na" || v.status === "recompute", `${at}: status ${v.status}`);
          assert.ok((v.why ?? "").trim().length > 10, `${at}: a ${v.status} row states why`);
          assert.equal(v.opts, undefined, `${at}: a ${v.status} row is never run`);
        }
      }
      // labels tell rows apart within a group
      const labels = vs.map((v) => `${v.group}|${v.label}`);
      assert.equal(new Set(labels).size, labels.length, `${name}: duplicate labels`);
    }
  });

  it("no run row repeats the baseline's options", () => {
    for (const { name, base, vs } of lists)
      for (const v of vs.filter((x) => x.status === "run"))
        assert.notDeepStrictEqual(v.opts, base, `${name} ${v.id} equals the baseline`);
  });

  it("every family of rows appears in some baseline, the not-run ones with their reason", () => {
    const all = lists.flatMap((l) => l.vs);
    const ids = new Set(all.map((v) => v.id));
    for (const id of [
      "type:normal",
      "type:trailing",
      "type:block",
      "type:blockActive",
      "type:dca",
      "type:dcaActive",
      "type:axis",
      "sig:signals",
      "sig:confirm",
      "sig:engineSide",
      "sig:accept",
      "coord:all",
      "coord:hourLock",
      "coord:cooldown-off",
      "coord:cooldown-signals",
      "coord:cooldown-all",
      "coord:conflict",
      "coord:s2Windows",
      "coord:hedge",
      "block:mode-shared",
      "block:mode-additive",
      "block:mode-overall",
      "block:steps",
      "gate:lastN-0",
      "gate:validLastN-0",
      "gate:signalLastN-0",
      "gate:symGate-veto",
      "gate:symGate-proven",
      "gate:symGate-off",
      "gate:warmup",
      "gate:lastNFloor-0",
      "gate:rangeGate-off",
      "gate:rangeGate-n100",
      "gate:rangeGate-pf1.35",
      "gate:symMinN-1",
      "gate:minGreen-0",
      "gate:sideGateN",
      "gate:maxPositions",
      "tactic:session",
      "tactic:volRegime",
      "tactic:trendStrength",
      "tactic:chopRegime",
      "tactic:cooldown",
    ])
      assert.ok(ids.has(id), `${id} is listed for some baseline`);
    // the not-run statuses each occur, so their reasons are checked above
    const st = new Set(all.map((v) => v.status));
    assert.deepEqual([...st].sort(), ["na", "recompute", "run"]);
    // the bare baseline: no signal tapes → signals need a recompute; no Block → Block rows n/a; no tapes → toggles
    // turned on need a recompute
    const bare = lists.find((l) => l.name === "bare")!.vs;
    const of = (id: string) => bare.find((v) => v.id === id)!;
    assert.equal(of("sig:signals").status, "recompute");
    assert.equal(of("sig:confirm").status, "na");
    assert.equal(of("sig:accept").status, "na");
    assert.equal(of("coord:hedge").status, "na");
    assert.equal(of("block:steps").status, "na");
    assert.equal(of("type:axis").status, "recompute");
    // the desk baseline: every Block row runs, DCA Active runs with DCA on
    const desk = lists.find((l) => l.name === "desk")!.vs;
    assert.ok(desk.filter((v) => v.group === "block").every((v) => v.status === "run"));
    assert.equal(desk.find((v) => v.id === "type:dcaActive")!.status, "run");
    assert.equal(desk.find((v) => v.id === "coord:hedge")!.status, "run");
  });

  it(
    "every run row's options run a walk-forward on a tiny synthetic input",
    { timeout: 300_000 },
    () => {
      const ts = tapes();
      let runs = 0;
      const bad: string[] = [];
      const fin = (n: number) => Number.isFinite(n);
      // per baseline: its closed orders and the effect of each run row against it
      const baseOrders = new Map<string, number>();
      const effects = new Map<string, Set<string>>();
      for (const { name, base, vs } of lists) {
        let ref: ReturnType<typeof summarizeRun> | null = null;
        const rows: Array<Pick<VariantSpec, "id" | "opts">> = [
          { id: "baseline", opts: base },
          ...vs.filter((v) => v.status === "run"),
        ];
        for (const v of rows) {
          try {
            const res = walkForward(u, ts, v.opts!);
            const s = summarizeRun(res, NOW - v.opts!.simH * H, NOW);
            if (
              ![
                s.orders,
                s.net,
                s.gp,
                s.gl,
                s.pf,
                s.mdd,
                s.openNet,
                ...s.hourN,
                ...s.hourNet,
              ].every(fin)
            )
              bad.push(`${name} ${v.id}: non-finite summary`);
            if (s.hourN.length !== v.opts!.simH)
              bad.push(`${name} ${v.id}: ${s.hourN.length} hours`);
            if (!/\S/.test(s.fp) || !/\S/.test(s.fpOrders))
              bad.push(`${name} ${v.id}: no fingerprint`);
            if (v.id === "baseline") {
              ref = s;
              baseOrders.set(name, s.orders);
            } else if (ref) {
              const e = effects.get(name) ?? effects.set(name, new Set()).get(name)!;
              e.add(effectOf(s, ref));
            }
            runs++;
          } catch (e) {
            bad.push(`${name} ${v.id}: ${(e as Error).message}`);
          }
        }
      }
      assert.deepEqual(bad, []);
      assert.ok(runs > 100, `${runs} walk-forwards`);
      // the input is not empty for the code default: its baseline trades, and some of its switches change the orders
      assert.ok(baseOrders.get("code default")! > 0, "the code default trades the tiny input");
      // the code default's Block book now starts with the record of the warm-up before the run (run-start defect D2),
      // so on this input a switch resizes the orders it used to drop: a size change counts as a change of what it trades
      assert.ok(
        effects.get("code default")!.has("orders") || effects.get("code default")!.has("volume"),
        "some switch changes what the code default trades",
      );
      assert.ok(effects.get("code default")!.has("none"), "and some switch has nothing to act on");
    },
  );
});

describe("sizing variants: every row replays", () => {
  const ref: SizingSpec = {
    id: "desk",
    label: "desk",
    unitUsd: 2,
    minUsd: 2,
    ratio: 3,
    maxPositionX: 0.5,
    maxNotionalUsd: Infinity,
    maxExposureX: 5,
    maxRiskPct: 0.2,
    maxBackstopLossPct: 0.3,
    top: 3,
    rebalancePct: 0.1,
    maxPositions: 6,
    minStopPct: 0.01,
  };
  const pos: ReplayPosition[] = [
    { cfg: "b|ema|wide", sym: "A", side: 1, entryT: T0, exitT: T0 + 2 * H, vol: 1, sl: 0.02 },
    { cfg: "b|rsi|wide", sym: "A", side: -1, entryT: T0, exitT: T0 + 3 * H, vol: 2, sl: 0.02 },
    { cfg: "b|rsi|wide", sym: "B", side: -1, entryT: T0 + H, exitT: Infinity, vol: 1, sl: 0.03 },
  ];
  const samples = [0, 1, 2, 3].map((h) => ({ t: T0 + h * H, eq: 50 }));

  it("a reference off every grid point lists every variant once, labelled, and each replays", () => {
    const vs = sizingVariants(ref);
    const ids = vs.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids[0], "ref");
    // the reference matches none of the variant values, so all 15 are listed
    assert.equal(vs.length, 16);
    for (const v of vs) {
      assert.ok(v.label.trim().length > 0, v.id);
      const r = sizingReplay(pos, samples, v, () => 1, T0);
      assert.equal(r.id, v.id);
      assert.equal(r.samples, samples.length);
      assert.ok(Number.isFinite(r.summary.grossMax) && Number.isFinite(r.summary.orders), v.id);
      assert.ok(r.fp.length > 0, v.id);
    }
    // each variant differs from the reference in exactly the one field its id names
    const strip = (s: SizingSpec) => JSON.stringify({ ...s, id: "", label: "" });
    for (const v of vs.slice(1)) assert.notEqual(strip(v), strip(ref), v.id);
  });

  it("variants equal to the reference are left out", () => {
    const onGrid: SizingSpec = {
      ...ref,
      rebalancePct: 0,
      maxExposureX: 0,
      maxPositionX: 1,
      maxRiskPct: 0,
      maxBackstopLossPct: 0,
      ratio: 5,
      top: "all",
    };
    const ids = sizingVariants(onGrid).map((v) => v.id);
    for (const gone of ["rebal0", "expOff", "cap1", "riskOff", "worstOff", "vf5", "topAll"])
      assert.ok(!ids.includes(gone), gone);
    assert.equal(ids.length, 16 - 7);
  });
});
