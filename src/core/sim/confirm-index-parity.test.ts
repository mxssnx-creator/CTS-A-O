// Live and paper confirm signals on the simulation's engine confirmation index (B1). The index is built from the run's
// range-neutral confirmation pool, not from the range-gated Real-stage feed, so no range setting moves it: two option
// sets that differ only in range settings give the same index, and the runtime's index (coordOf) is the simulation's.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWalkForward,
  engineConfirmIndex,
  makeTape,
  sigCfg,
  walkForward,
  type WalkForwardOptions,
  type WalkForwardResult,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYM = "AAA-USDT";
const ENG_IND = "rsi-14-30-70@m15";
const SIG_IND = "sig-ema-cross-s@m15";
const IN_RUN = NOW - 2 * H + 10 * 60_000;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const U = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

const trade = (cfg: string, entryT: number, r: number): Trade =>
  ({
    cfg,
    sym: SYM,
    side: 1,
    entryT,
    exitT: entryT + 30 * 60_000,
    entry: 100,
    exit: 100 * (1 + r),
    r,
    reason: r > 0 ? "tp" : "sl",
    bars: 2,
    mfe: 0,
    mae: 0,
    kind: "normal",
  }) as Trade;

/** A Micro (mc) engine config: 300 hourly closes at PF 1.5 over the long window, and one entry in the run. */
function microTape() {
  const id = `follow|${ENG_IND}|tp1|sl1|tr0|h32|mc`;
  const xs: Trade[] = [];
  for (let i = 0; i < 300; i++) xs.push(trade(id, NOW - 330 * H + i * H, i % 5 < 2 ? -0.01 : 0.01));
  xs.push(trade(id, IN_RUN - 5 * 60_000, 0.01));
  return makeTape(id, "follow", ENG_IND, { ...P, tag: "mc" }, "normal", [SYM], xs, [], []);
}

/** A signal config with one entry in the run, on the same symbol and direction as the Micro candidate. */
function sigTape() {
  const id = `follow|${SIG_IND}|tp1|sl1|tr0|h32`;
  return makeTape(id, "follow", SIG_IND, P, "normal", [SYM], [trade(id, IN_RUN, 0.01)], [], []);
}

const base = (mode: WalkForwardOptions["mode"]): WalkForwardOptions => ({
  ...defaultWalkForward(DEFAULT_SETTINGS),
  mode,
  rangeCoord: undefined,
  toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  symGate: undefined,
  coord: { enabled: true, hourLock: 0, cooldown: "off", conflict: false, confirm: true },
  simH: 6,
  lastN: 0,
  validLastN: 0,
  robustFrac: 0,
  signalValidLastN: 0,
  signalGuardN: 0,
  signalCluster: undefined,
  signalAccept: undefined,
  signalSideAccept: undefined,
  signalActive: new Set([sigActiveKey("follow", SIG_IND, SYM, 1)]),
});

/** The same options with each range setting changed on its own, then all of them together. */
function rangeVariants(o: WalkForwardOptions): Array<[string, WalkForwardOptions]> {
  const rangeMinPf = { ...o.gates.rangeMinPf, micro: 3 };
  const levers = {
    gates: { ...o.gates, rangeMinPf },
    rangeCoord: { mc: { bots: ["snap" as const] } },
    rangeGate: { lastN: 50, minPf: 3 },
    excludeRanges: ["mc"],
    engineSideAccept: o.engineSideAccept ? { ...o.engineSideAccept, enabled: false } : undefined,
    entryCrowd: { mc: 1 },
  };
  return [
    ["rangeMinPf micro 3", { ...o, gates: levers.gates }],
    ["rangeCoord mc bots", { ...o, rangeCoord: levers.rangeCoord }],
    ["rangeGate 50 at PF 3", { ...o, rangeGate: levers.rangeGate }],
    ["excludeRanges mc", { ...o, excludeRanges: levers.excludeRanges }],
    ["engineSideAccept off", { ...o, engineSideAccept: levers.engineSideAccept }],
    ["entryCrowd mc 1", { ...o, entryCrowd: levers.entryCrowd }],
    [
      "all range settings",
      {
        ...o,
        gates: levers.gates,
        rangeCoord: levers.rangeCoord,
        rangeGate: levers.rangeGate,
        excludeRanges: levers.excludeRanges,
        engineSideAccept: levers.engineSideAccept,
        entryCrowd: levers.entryCrowd,
      },
    ],
  ];
}

/** A run over fresh tapes (the tapes are built in place by a run). */
const run = (o: WalkForwardOptions) => walkForward(U, [microTape(), sigTape()], o);

/** The index as a comparable string: each key with its entries and running maximum exits. */
const flat = (m: ReturnType<typeof engineConfirmIndex>) =>
  JSON.stringify([...m].map(([k, v]) => [k, Array.from(v.e), Array.from(v.mx)]));

describe("the engine confirmation index is range independent (B1)", () => {
  for (const mode of ["fixed", "durable", "hourly"] as const) {
    it(`no range setting changes the index (mode ${mode})`, () => {
      const ref = engineConfirmIndex(run(base(mode)));
      assert.ok((ref.get(`${SYM}|1`)?.e.length ?? 0) >= 1, "the reference index holds the Micro candidate");
      const differ: string[] = [];
      for (const [name, o] of rangeVariants(base(mode))) {
        const idx = engineConfirmIndex(run(o));
        if (flat(idx) !== flat(ref))
          differ.push(`${name}: ${idx.get(`${SYM}|1`)?.e.length ?? 0} entries; reference ${ref.get(`${SYM}|1`)?.e.length ?? 0}`);
      }
      assert.deepEqual(differ, [], "a range setting changed the engine confirmation index");
    });
  }
});

describe("live and paper read the simulation's index (B1)", () => {
  it("the runtime's index of a run is the simulation's index, whatever range settings the run used", async () => {
    const { CoreRuntime } = await import("../server/runtime.server.ts");
    const { CoreDb } = await import("../server/db.server.ts");
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 } as never, { market: "synthetic" });
    try {
      // the runtime's index of a compute's simulation (the private coordOf every confirm read goes through)
      const coordOf = (rt as unknown as { coordOf: (sim: unknown) => { engineIv: ReturnType<typeof engineConfirmIndex> } })
        .coordOf.bind(rt);
      const differ: string[] = [];
      for (const mode of ["fixed", "durable", "hourly"] as const) {
        const ref = engineConfirmIndex(run(base(mode)));
        for (const [name, o] of rangeVariants(base(mode))) {
          if (flat(coordOf(run(o)).engineIv) !== flat(ref)) differ.push(`${mode} · ${name}`);
        }
      }
      assert.deepEqual(differ, [], "the runtime's confirmation index differs from the simulation's");
    } finally {
      rt.stop();
    }
  });
});

/** The Micro engine config's position still open at the run's end: entered 30 min before NOW, closed by no order. */
const OPEN_ENTRY = NOW - 30 * 60_000;

/** The microTape history with that one position still open at the end (a held engine position the run marks to market). */
function heldTape() {
  const id = `follow|${ENG_IND}|tp1|sl1|tr0|h32|mc`;
  const xs: Trade[] = [];
  for (let i = 0; i < 300; i++) xs.push(trade(id, NOW - 330 * H + i * H, i % 5 < 2 ? -0.01 : 0.01));
  xs.push(trade(id, IN_RUN - 5 * 60_000, 0.01));
  const open: OpenPosition = {
    cfg: id,
    sym: SYM,
    side: 1,
    entryT: OPEN_ENTRY,
    entryI: 0,
    entry: 100,
    stop: 99,
    target: 101,
    peak: 100,
    trailOn: false,
    mtm: 0,
  };
  return makeTape(id, "follow", ENG_IND, { ...P, tag: "mc" }, "normal", [SYM], xs, [open], []);
}

/** The variants the live path is held to: no range setting changed, each range setting alone, all together, and a range minimum under the global one. */
function liveVariants(o: WalkForwardOptions): Array<[string, WalkForwardOptions]> {
  return [
    ["no range setting changed", o],
    ...rangeVariants(o),
    ["micro minimum 1.05 under a global 1.6", { ...o, gates: { ...o.gates, minPf: 1.6 } }],
  ];
}

/**
 * A run over the held-position tapes, with the inputs the live path gives its confirmation pool: the open-now map of
 * the configs the run selected (keep), and the book's engine orders at a time t (entered by t, not closed by it; the
 * orders still open at the run's end count as held).
 */
function heldRun(o: WalkForwardOptions) {
  const tapes = [heldTape(), sigTape()];
  const sim = walkForward(U, tapes, o);
  const keep = new Set(sim.steps.flatMap((s) => s.real));
  const openNow = new Map<string, number>();
  for (const tp of tapes) {
    if (sigCfg(tp.id) || !keep.has(tp.id)) continue;
    for (const op of tp.open) {
      const k = `${op.sym}|${op.side > 0 ? 1 : -1}`;
      if (op.entryT < (openNow.get(k) ?? Infinity)) openNow.set(k, op.entryT);
    }
  }
  const book = (t: number) => [
    ...sim.trades.filter((x) => !sigCfg(x.cfg) && x.entryT <= t && x.exitT > t),
    ...(sim.openAtEnd ?? []).filter((x) => !sigCfg(x.cfg) && x.entryT <= t),
  ];
  return { sim, openNow, book };
}

/**
 * The neutral pool's answer at t, from the simulation's own pool candidates: one entered by t and not closed by it. The
 * held candidate is still open at the run's end (its entry is OPEN_ENTRY), so it stays open from its entry on.
 */
function neutralOpen(sim: WalkForwardResult, sym: string, side: number, t: number): boolean {
  const s = side > 0 ? 1 : -1;
  return sim.confirmCands.some(
    (c) => c.sym === sym && (c.side > 0 ? 1 : -1) === s && c.entryT <= t && (c.entryT === OPEN_ENTRY || c.exitT > t),
  );
}

describe("live confirmation reads only the neutral pool (8 Oct)", () => {
  it("the live pool answers the neutral pool's answer for every range variant and time", async () => {
    const { CoreRuntime } = await import("../server/runtime.server.ts");
    const { CoreDb } = await import("../server/db.server.ts");
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 } as never, { market: "synthetic" });
    try {
      // the runtime's index of a run and its confirmation pool (both private; every confirm read goes through them)
      const coordOf = (rt as unknown as { coordOf: (sim: unknown) => { engineIv: ReturnType<typeof engineConfirmIndex> } })
        .coordOf.bind(rt);
      const confirmPoolOf = (rt as unknown as {
        confirmPoolOf: (...args: unknown[]) => { confirms: (sym: string, side: number, t: number) => boolean };
      }).confirmPoolOf.bind(rt);
      // the scenario holds: the neutral pool has the held candidate, and a range-gated book order it lacks
      const pre = heldRun(base("fixed"));
      assert.ok(
        pre.sim.confirmCands.some((c) => c.entryT === OPEN_ENTRY),
        "the neutral pool holds the held candidate (the scenario's premise)",
      );
      const grid: number[] = [];
      for (let t = IN_RUN - H; t <= NOW; t += 5 * 60_000) grid.push(t);
      const differ: string[] = [];
      let bookOnly = 0;
      for (const mode of ["fixed", "durable", "hourly"] as const) {
        for (const [name, o] of liveVariants(base(mode))) {
          const { sim, openNow, book } = heldRun(o);
          const { engineIv } = coordOf(sim);
          for (const t of grid)
            for (const side of [1, -1]) {
              // the live call: the index, the open-now map and the book the live path holds at t
              const live = confirmPoolOf(engineIv, () => openNow, book(t)).confirms(SYM, side, t);
              const ref = neutralOpen(sim, SYM, side, t);
              if (!ref && book(t).some((x) => x.side === side)) bookOnly++;
              if (live !== ref && differ.length < 8)
                differ.push(
                  `${mode} · ${name} · ${side > 0 ? "long" : "short"} · t ${(t - NOW) / 60_000} min: live ${live}, neutral pool ${ref}`,
                );
            }
        }
      }
      assert.ok(bookOnly > 0, "a range-gated book order the neutral pool lacks is held at some time (the premise)");
      assert.deepEqual(differ, [], "the live confirmation answers from the range-gated book, not the neutral pool");
    } finally {
      rt.stop();
    }
  });
});
