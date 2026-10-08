// Live and paper confirm signals on the simulation's engine confirmation index (B1). The index is built from the run's
// range-neutral confirmation pool, not from the range-gated Real-stage feed, so no range setting moves it: two option
// sets that differ only in range settings give the same index, and the runtime's index (coordOf) is the simulation's.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, engineConfirmIndex, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
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
