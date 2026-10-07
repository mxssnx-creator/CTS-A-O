// Every self-audit check can fail. For each check in audit.ts a valid input (a real walk-forward run with stages and
// a paper book, every check ok) is corrupted in exactly the field that check guards, and that check — by name —
// fails while every other check keeps its verdict. Where two checks judge the same quantity (the replay re-applies
// the toggles and the Block volume), the second one is named as an expected co-failure with the reason.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditState, type AuditInput } from "./audit.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { sigActiveKey } from "./signals.ts";
import {
  defaultWalkForward,
  makeTape,
  sigCfg,
  walkForward,
  type ConfigTape,
  type WalkForwardOptions,
  type WalkForwardResult,
} from "./sim/walkforward.ts";
import type { StrategyToggles, StratKind, Trade } from "./domain/types.ts";

const H = 3_600_000;
const M = 60_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYMS = ["AAA-USDT", "BBB-USDT", "CCC-USDT", "DDD-USDT"];
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const COST = DEFAULT_SETTINGS.cost;
const ENGINE = "rsi-mom-14-20@m15";
const SIGNAL = "sig-ema-cross-s@m15";

/** Engine and signal configs (Normal, Trailing, Axis) on four symbols, long and short, with winning / losing regimes. */
function tapesOf(seed: number): ConfigTape[] {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out: ConfigTape[] = [];
  let k = 0;
  for (const ind of [ENGINE, SIGNAL, "trend-ema-5-20@m5c"])
    for (let c = 0; c < 3; c++)
      for (const kind of ["normal", "trailing", "axis"] as StratKind[]) {
        k++;
        const cfg = `follow|${ind}|tp${1 + c * 0.2}|sl1|tr0|h32${kind === "normal" ? "" : `|${kind}`}`;
        const trades: Trade[] = [];
        for (const sym of SYMS)
          for (const side of [1, -1] as const)
            for (
              let e = T0 + Math.floor(rnd() * 4) * 15 * M;
              e < NOW - 2 * H;
              e += (15 + 15 * Math.floor(rnd() * 3)) * M
            ) {
              const phase = Math.sin((e - T0) / (7 * H) + k + side);
              const r = rnd() < 0.56 + 0.25 * phase ? 0.01 : -0.01;
              const hold = (15 + Math.floor(rnd() * 6) * 15) * M;
              trades.push({
                cfg,
                sym,
                side,
                entryT: e,
                exitT: e + hold,
                entry: 100,
                exit: 100 * (1 + side * (r + COST)),
                r,
                reason: r > 0 ? "tp" : "sl",
                bars: 2,
                mfe: 0,
                mae: 0,
                kind,
              });
            }
        out.push(makeTape(cfg, "follow", ind, P, kind, SYMS, trades, [], []));
      }
  return out;
}

const TAPES = tapesOf(7);
const PAIRS = new Set(TAPES.map((t) => `${t.bot}|${t.ind}`));
const ACTIVE = new Set(
  SYMS.flatMap((sym) => [1, -1].map((side) => sigActiveKey("follow", SIGNAL, sym, side))),
);
const base = defaultWalkForward(DEFAULT_SETTINGS);
const toggles = (x: Partial<StrategyToggles> = {}): StrategyToggles => ({
  normal: true,
  trailing: true,
  block: true,
  blockActive: false,
  dca: false,
  dcaActive: false,
  axis: true,
  ...x,
});
const opts = (x: Partial<WalkForwardOptions> = {}): WalkForwardOptions => ({
  ...base,
  toggles: toggles(),
  block: { ...base.block, mode: "overall", maxMult: 4, minActiveLevel: 2 },
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 48,
  validLastN: 25,
  lastN: 35,
  signalValidLastN: 10,
  normalBaseMinPf: 1.05,
  signalOwnBase: true,
  robustFrac: 0,
  // every cap set (finite) so every cap check runs, none of them reached
  maxPositions: 40,
  signalMaxPositions: 40,
  maxOpen: 500,
  maxPerSymbol: 200,
  maxPerSide: 300,
  signalMaxOpen: 500,
  signalPerSymbol: 200,
  signalActive: ACTIVE,
  seatPer: "config",
  cost: COST,
  ...x,
});
const u = {
  bars: [],
  caches: [],
  startT: T0,
  endT: NOW,
  splitT: T0,
  nowT: NOW,
  baseTf: 60,
} as never;

const RUNS = {
  overall: walkForward(u, TAPES, opts()),
  shared: walkForward(
    u,
    TAPES,
    opts({ block: { ...base.block, mode: "shared", maxMult: 4, minActiveLevel: 2 } }),
  ),
  blockOff: walkForward(u, TAPES, opts({ toggles: toggles({ block: false }) })),
  trailingOff: walkForward(u, TAPES, opts({ toggles: toggles({ trailing: false }) })),
};
type Run = keyof typeof RUNS;

const paperClose = (i: number, r: number): Trade => ({
  cfg: TAPES[0].id,
  sym: SYMS[0],
  side: 1,
  entryT: NOW - (10 - i) * H,
  exitT: NOW - (9 - i) * H,
  entry: 100,
  exit: 100 * (1 + r + COST),
  r,
  reason: r > 0 ? "tp" : "sl",
  bars: 4,
  mfe: 0,
  mae: 0,
});
/** The valid input: the run, its stages (every tape pair passed and in Main), the Base counts and a paper book. */
function inputOf(sim: WalkForwardResult): AuditInput {
  return {
    sim,
    tapes: TAPES,
    cost: COST,
    base: { evaluated: 10, passed: 5 },
    stages: {
      passed: new Set(PAIRS),
      main: new Set(PAIRS),
      held: new Set(),
      mainTop: 0,
      signalActive: new Set(ACTIVE),
    },
    paper: {
      selected: TAPES.map((t) => t.id),
      // fixed sizing at 100 per unit: closed 100 × (0.02 − 0.01) = 1, open 100 × 0.01 × 2 = 2, carried 5 → 8
      positions: [{ cfg: TAPES[0].id, sym: SYMS[0], side: 1, entryT: NOW - H, mtm: 0.01, vol: 2 }],
      trades: [paperClose(0, 0.02), paperClose(1, -0.01)],
      equity: 8,
      carried: 5,
      sizing: { balance: 1005, sizing: { mode: "fixed", pct: 0.02 }, fixedNotional: 100 },
    },
  };
}
const verdicts = (inp: AuditInput) =>
  new Map(auditState(inp).checks.map((c) => [c.name, c] as const));
const cleanMemo = new Map<Run, ReturnType<typeof verdicts>>();
const cleanOf = (run: Run) => {
  if (!cleanMemo.has(run)) cleanMemo.set(run, verdicts(inputOf(RUNS[run])));
  return cleanMemo.get(run)!;
};

// ── corruption helpers (copies: the runs stay as simulated) ──────────────────────────────────────────────────────
const withSim = (
  inp: AuditInput,
  f: (s: WalkForwardResult) => Partial<WalkForwardResult>,
): AuditInput => ({
  ...inp,
  sim: { ...inp.sim!, ...f(inp.sim!) },
});
const withTrade = (inp: AuditInput, i: number, patch: Partial<Trade>) =>
  withSim(inp, (s) => ({ trades: s.trades.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
const withOpts = (inp: AuditInput, patch: Partial<WalkForwardOptions>) =>
  withSim(inp, (s) => ({ opts: { ...s.opts, ...patch } }));
const tapeOf = (x: Trade) => TAPES.find((t) => t.id === x.cfg)!;
/** an engine Normal trade the cost check covers (plain kind, volume = multiple) */
const plainIdx = (s: WalkForwardResult, unit = false) =>
  s.trades.findIndex(
    (x) =>
      !sigCfg(x.cfg) &&
      tapeOf(x).kind === "normal" &&
      (x.vol ?? 1) === (x.mult ?? 1) &&
      (!unit || (x.mult ?? 1) === 1),
  );
const keyOf = (x: Trade) => `${x.cfg}|${x.sym}|${x.side}`;
/** two trades of one config × symbol × side back to back: [earlier, later] */
function backToBack(s: WalkForwardResult): [number, number] {
  const by = new Map<string, number[]>();
  s.trades.forEach((x, i) => by.set(keyOf(x), [...(by.get(keyOf(x)) ?? []), i]));
  for (const is of by.values()) {
    const sorted = is.sort((a, b) => s.trades[a].entryT - s.trades[b].entryT);
    if (sorted.length >= 2) return [sorted[0], sorted[1]];
  }
  throw new Error("no config × symbol × side with two trades");
}
/** the last trade of a config × symbol × side (nothing of its key enters after it) */
function lastOfKey(s: WalkForwardResult): number {
  const last = new Map<string, number>();
  s.trades.forEach((x, i) => {
    const j = last.get(keyOf(x));
    if (j === undefined || s.trades[j].entryT < x.entryT) last.set(keyOf(x), i);
  });
  return [...last.values()][0];
}

type Corruption = {
  run: Run;
  /** what is corrupted */
  what: string;
  corrupt: (inp: AuditInput) => AuditInput;
  /** checks that judge the same quantity and must fail with it, each with the reason */
  alsoFails?: Record<string, string>;
};
const REPLAY = "replay: every trade passes the Real rules with its recorded Block volume and level";

/** check name → the corruptions that must make it fail */
const CORRUPTIONS: Record<string, Corruption[]> = {
  "stages: Base passed ≤ evaluated": [
    {
      run: "overall",
      what: "Base passed above evaluated",
      corrupt: (i) => ({ ...i, base: { evaluated: 10, passed: 11 } }),
    },
  ],
  "stages: every validated pair has config sets": [
    {
      run: "overall",
      what: "a validated pair without a tape",
      corrupt: (i) => ({
        ...i,
        stages: { ...i.stages!, passed: new Set([...i.stages!.passed, "follow|ghost@m15"]) },
      }),
    },
  ],
  "stages: Main ⊆ Base-validated ∪ held": [
    {
      run: "overall",
      what: "a Main pair neither validated nor held",
      corrupt: (i) => ({
        ...i,
        stages: { ...i.stages!, main: new Set([...i.stages!.main, "follow|stray@m15"]) },
      }),
    },
  ],
  "stages: engine trades come from Main config sets": [
    {
      run: "overall",
      what: "an engine pair that traded dropped from Main",
      corrupt: (i) => ({
        ...i,
        stages: {
          ...i.stages!,
          main: new Set([...i.stages!.main].filter((k) => k !== `follow|${ENGINE}`)),
        },
      }),
    },
  ],
  "stages: signal trades come from active signals": [
    {
      run: "overall",
      what: "a traded signal × symbol × side missing from the compute's active set",
      corrupt: (i) => {
        const x = i.sim!.trades.find((t) => sigCfg(t.cfg))!;
        const drop = sigActiveKey("follow", SIGNAL, x.sym, x.side);
        return {
          ...i,
          stages: { ...i.stages!, signalActive: new Set([...ACTIVE].filter((k) => k !== drop)) },
        };
      },
    },
  ],
  "stages: Real picks are Main tapes": [
    {
      run: "overall",
      what: "a step's Real pick without a tape",
      corrupt: (i) =>
        withSim(i, (s) => ({
          steps: s.steps.map((st, j) => (j === 0 ? { ...st, real: [...st.real, "ghost"] } : st)),
        })),
    },
  ],
  "lanes: trades come from Main tapes": [
    {
      run: "overall",
      what: "a trade whose config has no tape (its pair still in Main)",
      corrupt: (i) => withTrade(i, plainIdx(i.sim!), { cfg: `follow|${ENGINE}|ghost` }),
    },
  ],
  "lanes: only enabled strategies execute": [
    {
      run: "trailingOff",
      what: "a trade booked on a Trailing tape while Trailing is off",
      corrupt: (i) => {
        const k = plainIdx(i.sim!);
        const x = i.sim!.trades[k];
        return withTrade(i, k, { cfg: `${x.cfg}|trailing` });
      },
      alsoFails: {
        [REPLAY]:
          "the replay re-judges the same switch: execDecision refuses a non-executable tape first",
      },
    },
  ],
  "toggles: Normal off → only Block-raised Normal / Trailing; Trailing off → none": [
    {
      run: "trailingOff",
      what: "a trade recorded as Trailing while Trailing is off",
      corrupt: (i) => withTrade(i, plainIdx(i.sim!), { kind: "trailing" }),
    },
  ],
  "numbers: finite results, exit ≥ entry": [
    {
      run: "overall",
      what: "an exit before its entry (the last trade of its key, so no slot overlaps)",
      corrupt: (i) => {
        const k = lastOfKey(i.sim!);
        return withTrade(i, k, { exitT: i.sim!.trades[k].entryT - 1 });
      },
    },
  ],
  [REPLAY]: [
    {
      run: "overall",
      what: "a recorded Block level the rules did not give",
      corrupt: (i) => {
        const k = plainIdx(i.sim!);
        return withTrade(i, k, { level: (i.sim!.trades[k].level ?? 0) + 1 });
      },
    },
    {
      run: "overall",
      what: "a recorded Block volume the rules did not give (still within the caps)",
      corrupt: (i) => {
        const k = i.sim!.trades.findIndex((x) => (x.mult ?? 1) <= 2 && !x.coordVol);
        return withTrade(i, k, { mult: (i.sim!.trades[k].mult ?? 1) + 1 });
      },
    },
  ],
  "block: every source within max multiple, stack ≤ 8×": [
    {
      run: "overall",
      what: "one source's leg at the max multiple (each source may add max − 1)",
      corrupt: (i) => {
        const k = i.sim!.trades.findIndex((x) => x.legs && Object.keys(x.legs).length);
        const x = i.sim!.trades[k];
        const src = Object.keys(x.legs!)[0];
        return withTrade(i, k, { legs: { ...x.legs, [src]: i.sim!.opts.block.maxMult } });
      },
    },
  ],
  "block: volume within [1, max multiple]": [
    {
      run: "shared",
      what: "a multiple above max (its coordination part raised with it: the Block part the replay judges is unchanged)",
      corrupt: (i) => {
        const k = i.sim!.trades.findIndex((x) => (x.mult ?? 1) >= 1);
        const x = i.sim!.trades[k];
        const blockPart = (x.mult ?? 1) / (x.coordVol ?? 1);
        const mult = i.sim!.opts.block.maxMult + 1;
        return withTrade(i, k, { mult, coordVol: mult / blockPart });
      },
    },
  ],
  "block: off → volume 1": [
    {
      run: "blockOff",
      what: "a Block multiple of 2 with Block off",
      corrupt: (i) => withTrade(i, plainIdx(i.sim!, true), { mult: 2 }),
      alsoFails: {
        [REPLAY]: "both judge mult ÷ coordVol: with Block off the replayed volume is 1",
      },
    },
  ],
  "caps: max open": [
    {
      run: "overall",
      what: "the run's own max open below what it held",
      corrupt: (i) => withOpts(i, { maxOpen: 1 }),
    },
    {
      run: "overall",
      what: "the signals' max open below what they held",
      corrupt: (i) => withOpts(i, { signalMaxOpen: 1 }),
      alsoFails: {
        "caps: per symbol / per side":
          "capsOf: a signal side's cap IS the signals' max open (perSide = signalMaxOpen)",
      },
    },
  ],
  "caps: per symbol / per side": [
    { run: "overall", what: "per symbol cap 1", corrupt: (i) => withOpts(i, { maxPerSymbol: 1 }) },
    { run: "overall", what: "per side cap 1", corrupt: (i) => withOpts(i, { maxPerSide: 1 }) },
  ],
  "caps: no duplicate config × symbol open at once": [
    {
      run: "overall",
      what: "a config × symbol × side held twice (the earlier trade's exit moved past the next entry)",
      corrupt: (i) => {
        const [a, b] = backToBack(i.sim!);
        return withTrade(i, a, { exitT: i.sim!.trades[b].entryT + 1 });
      },
    },
  ],
  "caps: max positions (symbol × direction)": [
    {
      run: "overall",
      what: "the engine position cap 1",
      corrupt: (i) => withOpts(i, { maxPositions: 1 }),
    },
  ],
  "caps: max signal positions (symbol × direction)": [
    {
      run: "overall",
      what: "the signal position cap 1",
      corrupt: (i) => withOpts(i, { signalMaxPositions: 1 }),
    },
  ],
  "numbers: stats match the trade list": [
    {
      run: "overall",
      what: "published net off by 1",
      corrupt: (i) => withSim(i, (s) => ({ stats: { ...s.stats, net: s.stats.net + 1 } })),
    },
    {
      run: "overall",
      what: "published PF off",
      corrupt: (i) => withSim(i, (s) => ({ stats: { ...s.stats, pf: s.stats.pf * 1.01 } })),
    },
    {
      run: "overall",
      what: "published count off",
      corrupt: (i) => withSim(i, (s) => ({ stats: { ...s.stats, n: s.stats.n + 1 } })),
    },
  ],
  "numbers: hourly rows add up": [
    {
      run: "overall",
      what: "one hour's count off",
      corrupt: (i) =>
        withSim(i, (s) => ({
          hourly: s.hourly.map((h, j) => (j === 0 ? { ...h, n: h.n + 1 } : h)),
        })),
    },
    {
      run: "overall",
      what: "one hour's net off",
      corrupt: (i) =>
        withSim(i, (s) => ({
          hourly: s.hourly.map((h, j) => (j === 0 ? { ...h, net: h.net + 1 } : h)),
        })),
    },
  ],
  "numbers: per-kind rows add up": [
    {
      run: "overall",
      what: "one kind's count off",
      corrupt: (i) =>
        withSim(i, (s) => ({
          byKind: { ...s.byKind, normal: { ...s.byKind.normal, n: s.byKind.normal.n + 1 } },
        })),
    },
  ],
  "numbers: every plain close pays the round-trip cost": [
    {
      run: "overall",
      what: "a plain close whose prices no longer give its result",
      corrupt: (i) => {
        const k = plainIdx(i.sim!);
        return withTrade(i, k, { exit: i.sim!.trades[k].exit * 1.001 });
      },
    },
  ],
  "stages: Real selection ⊆ Main tapes": [
    {
      run: "overall",
      what: "a selected config without a tape",
      corrupt: (i) => ({ ...i, paper: { ...i.paper!, selected: [...i.paper!.selected, "ghost"] } }),
    },
  ],
  "paper: equity = closed + open mark-to-market": [
    {
      run: "overall",
      what: "published equity off by 1",
      corrupt: (i) => ({ ...i, paper: { ...i.paper!, equity: i.paper!.equity + 1 } }),
    },
  ],
  "paper: position volume within [1, max multiple]": [
    {
      run: "overall",
      what: "a position's source leg at the max multiple",
      corrupt: (i) => ({
        ...i,
        paper: {
          ...i.paper!,
          positions: i.paper!.positions.map((p) => ({
            ...p,
            legs: { symbol: i.sim!.opts.block.maxMult },
          })),
        },
      }),
    },
    {
      run: "overall",
      what: "a position below one unit (marked flat, so the equity is unchanged)",
      corrupt: (i) => ({
        ...i,
        paper: {
          ...i.paper!,
          positions: [
            ...i.paper!.positions,
            { cfg: TAPES[1].id, sym: SYMS[1], side: 1, entryT: NOW - H, mtm: 0, vol: 0.5 },
          ],
        },
      }),
    },
  ],
};

describe("audit: every check can fail", () => {
  it("the table names every check audit.ts can add", () => {
    const src = readFileSync(new URL("./audit.ts", import.meta.url), "utf8");
    const names = new Set(
      [...src.matchAll(/"((?:stages|lanes|toggles|numbers|replay|block|caps|paper): [^"]+)"/g)].map(
        (m) => m[1],
      ),
    );
    assert.deepEqual([...names].sort(), Object.keys(CORRUPTIONS).sort());
  });

  for (const [run, sim] of Object.entries(RUNS))
    it(`the valid input (${run}) passes every check it runs`, () => {
      assert.ok(sim.trades.length > 100, `${run}: ${sim.trades.length} trades`);
      assert.ok(
        sim.trades.some((x) => sigCfg(x.cfg)) && sim.trades.some((x) => !sigCfg(x.cfg)),
        "engine and signal trades",
      );
      const bad = [...cleanOf(run as Run).values()].filter((c) => !c.ok);
      assert.deepEqual(bad, []);
    });

  it("together the valid inputs run every check", () => {
    const ran = new Set((Object.keys(RUNS) as Run[]).flatMap((r) => [...cleanOf(r).keys()]));
    assert.deepEqual(
      Object.keys(CORRUPTIONS).filter((k) => !ran.has(k)),
      [],
    );
  });

  for (const [check, cs] of Object.entries(CORRUPTIONS))
    for (const c of cs)
      it(`${check} ← ${c.what}`, () => {
        const clean = cleanOf(c.run);
        assert.ok(clean.get(check)?.ok, `${check} runs and passes on the valid ${c.run} input`);
        const bad = verdicts(c.corrupt(inputOf(RUNS[c.run])));
        assert.equal(bad.get(check)?.ok, false, `${check} must fail: ${bad.get(check)?.detail}`);
        assert.deepEqual([...bad.keys()].sort(), [...clean.keys()].sort(), "the same checks run");
        const changed = [...bad.values()]
          .filter((x) => x.name !== check && x.ok !== clean.get(x.name)!.ok)
          .map((x) => x.name);
        assert.deepEqual(
          changed.sort(),
          Object.keys(c.alsoFails ?? {}).sort(),
          "no other check changes its verdict",
        );
      });
});
