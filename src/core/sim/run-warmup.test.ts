// Run start: the records the signal rules read (the direction acceptance, the loss-cluster and per-config guards, the
// confirmation pool) are fed from a warm-up that begins before the run's start, so a run that starts 24 h later sees
// the same record at its start as the earlier run did. Execution still starts at the run's start.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const SYM = "AAA-USDT";
const IND = "sig-ema-cross-s@m15";
const CFG = `follow|${IND}|tp1|sl1|tr0|h32`;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const S = Date.UTC(2026, 8, 1, 6); // the early run's start
const S24 = S + 24 * H; // the late run's start
const END = S + 36 * H;

const trade = (r: number, entryT: number): Trade =>
  ({
    cfg: CFG,
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

// one signal close per hour from S: the long side wins for its first twenty closes and loses from then on (9 Oct: a set
// is judged on its own closes, so the first entries trade only once the record holds; the losing run refuses later ones)
const tape = makeTape(
  CFG,
  "follow",
  IND,
  P,
  "normal",
  [SYM],
  Array.from({ length: 36 }, (_, i) => trade(i < 20 ? 0.01 : -0.01, S + i * H + 10 * 60_000)),
  [],
  [],
);

const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: {
    normal: true,
    trailing: true,
    block: false,
    blockActive: false,
    dca: false,
    dcaActive: false,
    axis: false,
  },
  symGate: undefined,
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  engineSideAccept: undefined,
  lastN: 0,
  validLastN: 0,
  signalValidLastN: 0,
  signalGuardN: 0,
  signalCluster: undefined,
  signalAccept: undefined,
  signalSideAccept: { enabled: true, minPf: 1.3, hours: 24, minTrades: 20 },
  // the one signal unit on the one symbol, long side (a signal tape is a candidate only while its unit is active)
  signalActive: new Set([`follow|${IND}|${SYM}|1`]),
  stepH: 1,
};
const u = { bars: [], caches: [], startT: S, endT: END, splitT: S, nowT: END, baseTf: 60 } as never;

const key = (x: Trade) => `${x.entryT}|${x.exitT}|${x.r}|${x.cfg}|${x.side}`;

describe("run start: the signal records warm up before the run", () => {
  it("a run starting 24 h later trades the same signals from its start as the earlier run does", () => {
    const early = walkForward(u, [tape], { ...base, startT: S, simH: 36 });
    const late = walkForward(u, [tape], { ...base, startT: S24, simH: 12 });
    // the early run trades while its window holds the winners, and its direction gate refuses the entries after they age out
    assert.ok(early.trades.length > 0, "the early run trades its first entries");
    assert.ok((early.skips["sig:signalSide"] ?? 0) > 0, "the early run's direction gate refuses later entries");
    const fromLate = early.trades.filter((x) => x.entryT >= S24).map(key);
    assert.deepEqual(
      late.trades.map(key),
      fromLate,
      "the late run's signal trades equal the early run's from the late start",
    );
  });

  it("the loss-cluster guard counts the losses that closed before a later start", () => {
    // twelve losing signal entries in the hour before the late start; the cluster pauses the signals while nine of
    // them are inside its last hour, so the candidate at 10 min past the late start is refused by an earlier run
    const burst = makeTape(
      CFG,
      "follow",
      IND,
      P,
      "normal",
      [SYM],
      [
        ...Array.from({ length: 12 }, (_, k) => trade(-0.01, S + 23 * H + k * 5 * 60_000)),
        trade(0.01, S24 + 10 * 60_000),
      ],
      [],
      [],
    );
    const cluster: WalkForwardOptions = {
      ...base,
      signalSideAccept: undefined,
      signalCluster: { enabled: true, windowMin: 60, minLosses: 8, lossShare: 0.6 },
    };
    const early = walkForward(u, [burst], { ...cluster, startT: S, simH: 36 });
    const late = walkForward(u, [burst], { ...cluster, startT: S24, simH: 12 });
    assert.ok((early.skips["sig:signalCluster"] ?? 0) > 0, "the early run's cluster pauses the signals");
    assert.deepEqual(
      late.trades.map(key),
      early.trades.filter((x) => x.entryT >= S24).map(key),
      "the late run is paused by the same losses",
    );
  });

  it("execution starts at the run's start: no trade before it, warm-up or not", () => {
    const late = walkForward(u, [tape], { ...base, startT: S24, simH: 12 });
    assert.ok(late.trades.every((x) => x.entryT >= S24));
    const early = walkForward(u, [tape], { ...base, startT: S, simH: 36 });
    assert.ok(early.trades.every((x) => x.entryT >= S && x.entryT < END));
  });
});
