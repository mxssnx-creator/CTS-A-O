// Live and paper confirm signals on the simulation's engine confirmation index (B1). The index is built from the run's
// range-neutral confirmation pool, not from the range-gated Real-stage feed, so no range setting moves it: two option
// sets that differ only in range settings give the same index, and the runtime's index (coordOf) is the simulation's.
// After the run's end (8 Oct) the live tapes of the pool's configs answer, and no range setting or book position does.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWalkForward,
  engineConfirmIndex,
  makeTape,
  walkForward,
  type ConfigTape,
  type ConfirmIndex,
  type ConfirmPool,
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
const flat = (m: ConfirmIndex) => JSON.stringify([...m].map(([k, v]) => [k, Array.from(v.e), Array.from(v.mx)]));

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
      const coordOf = (rt as unknown as { coordOf: (sim: unknown) => { engineIv: ConfirmIndex } }).coordOf.bind(rt);
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

/** The Micro engine config the held candidate belongs to. */
const HELD_ID = `follow|${ENG_IND}|tp1|sl1|tr0|h32|mc`;
/** The held candidate's entry: 30 min before the run's end, and the held order's exit on the live tape after it. */
const OPEN_ENTRY = NOW - 30 * 60_000;
const CLOSE_T = NOW + 20 * 60_000;
/** An order of the held config entered after the run's end. */
const NEW_ENTRY = NOW + 5 * 60_000;
/** A symbol no candidate names: never confirmed. */
const OTHER = "BBB-USDT";

/** A position of the held config, entered at entryT and not closed on its tape. */
function openAt(entryT: number): OpenPosition {
  return {
    cfg: HELD_ID,
    sym: SYM,
    side: 1,
    entryT,
    entryI: 0,
    entry: 100,
    stop: 99,
    target: 101,
    peak: 100,
    trailOn: false,
    mtm: 0,
  };
}

/**
 * The Micro config's tape: its history, and the held order either still open on the tape (no closeT) or closed at
 * closeT; plus an order entered at newEntryT that is still open on the tape.
 */
function tapeOf(o: { closeT?: number; newEntryT?: number }) {
  const xs: Trade[] = [];
  for (let i = 0; i < 300; i++) xs.push(trade(HELD_ID, NOW - 330 * H + i * H, i % 5 < 2 ? -0.01 : 0.01));
  xs.push(trade(HELD_ID, IN_RUN - 5 * 60_000, 0.01));
  const open: OpenPosition[] = [];
  if (o.closeT === undefined) open.push(openAt(OPEN_ENTRY));
  else xs.push({ ...trade(HELD_ID, OPEN_ENTRY, 0.01), exitT: o.closeT });
  if (o.newEntryT !== undefined) open.push(openAt(o.newEntryT));
  return makeTape(HELD_ID, "follow", ENG_IND, { ...P, tag: "mc" }, "normal", [SYM], xs, open, []);
}

/** The snapshot's tapes: the held candidate still open at the run's end (marked to market at NOW), and the signal. */
const snapshotTapes = () => [tapeOf({}), sigTape()];

/** The runtime's confirmation pool of a run, built through its private coordOf and confirmPoolOf. */
type PoolOf = (sim: WalkForwardResult, byId: ReadonlyMap<string, ConfigTape>) => ConfirmPool;
async function withPool<T>(fn: (pool: PoolOf) => T): Promise<T> {
  const { CoreRuntime } = await import("../server/runtime.server.ts");
  const { CoreDb } = await import("../server/db.server.ts");
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 } as never, { market: "synthetic" });
  try {
    const coordOf = (rt as unknown as {
      coordOf: (sim: WalkForwardResult) => { engineIv: ConfirmIndex; neutral: ReadonlySet<string> };
    }).coordOf.bind(rt);
    const confirmPoolOf = (rt as unknown as {
      confirmPoolOf: (
        engineIv: ConfirmIndex,
        live: { endT: number; neutral: ReadonlySet<string>; byId: ReadonlyMap<string, ConfigTape> },
      ) => ConfirmPool;
    }).confirmPoolOf.bind(rt);
    return fn((sim, byId) => {
      const c = coordOf(sim);
      return confirmPoolOf(c.engineIv, { endT: sim.endT, neutral: c.neutral, byId });
    });
  } finally {
    rt.stop();
  }
}

describe("the walk index closes a candidate still open at the walk end at the run's end (8 Oct)", () => {
  it("the held candidate keeps its exit at the run's end and names its configuration", () => {
    const sim = walkForward(U, snapshotTapes(), base("fixed"));
    const c = sim.confirmCands.find((x) => x.entryT === OPEN_ENTRY);
    assert.ok(c, "the held candidate is a confirmation candidate (the scenario's premise)");
    assert.equal(c.exitT, NOW, "marked to market at the run's end");
    assert.equal(c.cfg, HELD_ID, "the candidate names its configuration (the live tapes of the neutral set are read by it)");
    const iv = engineConfirmIndex(sim).get(`${SYM}|1`);
    assert.equal(iv?.mx[iv.mx.length - 1], NOW, "the running maximum exit is the run's end, not an open-forever mark");
  });
});

describe("after the snapshot's end, confirmation reads the live tapes of the neutral configs (8 Oct)", () => {
  it("(0) up to the snapshot's end the simulation's index decides, whatever the live tapes hold", async () => {
    await withPool((pool) => {
      const sim = walkForward(U, snapshotTapes(), base("fixed"));
      const p = pool(sim, new Map([[HELD_ID, tapeOf({ closeT: OPEN_ENTRY + 60_000 })]]));
      assert.equal(
        p.confirms(SYM, 1, OPEN_ENTRY + 5 * 60_000),
        true,
        "the held candidate was open then (the live tape closed it a minute after its entry)",
      );
      assert.equal(p.confirms(SYM, -1, OPEN_ENTRY + 5 * 60_000), false, "the other direction");
    });
  });

  it("(1) a neutral candidate open at the snapshot and closed on the live tape by t does not confirm", async () => {
    await withPool((pool) => {
      const sim = walkForward(U, snapshotTapes(), base("fixed"));
      assert.ok(
        sim.confirmCands.some((c) => c.entryT === OPEN_ENTRY),
        "the premise: the held candidate is in the snapshot's pool",
      );
      const p = pool(sim, new Map([[HELD_ID, tapeOf({ closeT: CLOSE_T })]]));
      assert.equal(p.confirms(SYM, 1, NOW + 10 * 60_000), true, "still open on the live tape at +10 min");
      assert.equal(p.confirms(SYM, 1, CLOSE_T + 5 * 60_000), false, "closed on the live tape at +20 min: not open at +25 min");
    });
  });

  it("(2) a neutral candidate still open at t on the live tape confirms", async () => {
    await withPool((pool) => {
      const p = pool(walkForward(U, snapshotTapes(), base("fixed")), new Map([[HELD_ID, tapeOf({})]]));
      assert.equal(p.confirms(SYM, 1, CLOSE_T + 5 * 60_000), true, "still open on the live tape at +25 min");
    });
  });

  it("(3) a neutral configuration whose live tape holds an order entered after the snapshot confirms while it is open", async () => {
    await withPool((pool) => {
      // the held candidate closed before the run's end here, so only the live order can confirm after it
      const sim = walkForward(U, [tapeOf({ closeT: NOW - 60_000 }), sigTape()], base("fixed"));
      const p = pool(sim, new Map([[HELD_ID, tapeOf({ closeT: NOW - 60_000, newEntryT: NEW_ENTRY })]]));
      assert.equal(p.confirms(SYM, 1, NEW_ENTRY - 60_000), false, "before its entry");
      assert.equal(p.confirms(SYM, 1, NEW_ENTRY + 5 * 60_000), true, "entered after the snapshot and still open");
      assert.equal(p.confirms(SYM, -1, NEW_ENTRY + 5 * 60_000), false, "the other direction");
    });
  });

  it("(4) across range variants the answers are identical, and they are the simulation's before the end and the live tape's after it", async () => {
    await withPool((pool) => {
      const grid: number[] = [];
      for (let t = IN_RUN - H; t <= NOW + 2 * H; t += 5 * 60_000) grid.push(t);
      const keys = grid.flatMap((t) => [SYM, OTHER].flatMap((s) => [1, -1].map((side) => ({ t, s, side }))));
      const answers = (o: WalkForwardOptions) => {
        const p = pool(walkForward(U, snapshotTapes(), o), new Map([[HELD_ID, tapeOf({ closeT: CLOSE_T })]]));
        return keys.map(({ t, s, side }) => p.confirms(s, side, t));
      };
      const ref = answers(base("fixed"));
      // each range variant is held to the run with the same global gates; a range minimum under a global one is held
      // to the global minimum alone (the global minimum itself is not a range setting, so it is not compared to base)
      const minPf16 = { ...base("fixed"), gates: { ...base("fixed").gates, minPf: 1.6 } };
      const cases: Array<[string, WalkForwardOptions, WalkForwardOptions]> = [
        ...rangeVariants(base("fixed")).map(([name, o]): [string, WalkForwardOptions, WalkForwardOptions] => [
          name,
          o,
          base("fixed"),
        ]),
        [
          "micro minimum 1.05 under a global 1.6",
          { ...minPf16, gates: { ...minPf16.gates, rangeMinPf: { ...minPf16.gates.rangeMinPf, micro: 1.05 } } },
          minPf16,
        ],
      ];
      const differ = cases
        .filter(([, o, same]) => {
          const want = answers(same);
          return answers(o).some((v, i) => v !== want[i]);
        })
        .map(([name]) => name);
      assert.deepEqual(differ, [], "a range setting changed a confirmation answer");
      // the simulation's own candidates up to the run's end (warm-up candidates included; a candidate marked open at the
      // end closes at it), and the live tape's after it: the held order is open from its entry until its close at CLOSE_T
      const sim = walkForward(U, snapshotTapes(), base("fixed"));
      const simOpen = (s: string, side: number, t: number) =>
        sim.confirmCands.some((c) => c.sym === s && (c.side > 0 ? 1 : -1) === side && c.entryT <= t && c.exitT > t);
      const truth = keys.map(({ t, s, side }) => (t <= NOW ? simOpen(s, side, t) : s === SYM && side === 1 && t < CLOSE_T));
      const wrong = keys
        .map((k, i) => (ref[i] !== truth[i] ? `${k.s} ${k.side > 0 ? "long" : "short"} t ${(k.t - NOW) / 60_000} min` : null))
        .filter((x): x is string => x !== null);
      assert.deepEqual(wrong.slice(0, 8), [], "the answer is not the simulation's before the end and the live tape's after it");
    });
  });
});
