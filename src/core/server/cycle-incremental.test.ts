// runtime.cycle "incremental" against a full recompute, on a fixed synthetic fixture and several T (one heavy compute,
// then light cycles after each new closed bar): the continued tapes of the validated set equal the tapes the builder
// gives for the same configs on the full history up to that T; light cycles retain the hour's existing seats;
// and the paper step on the continued tapes takes the decisions it takes on the recomputed ones.
// Run with CTS_CORE_WORKERS=1 (3 symbols; 6h evaluation + 6h simulation, independent Signal history 72h).
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime as BaseRuntime, laneSeriesOf, laneSeriesFrom, signalDataHours } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { signalSettings } from "../signals.ts";
import { PREVIOUS_DEFAULT_FOCUS_17OCT } from "../config.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapes, type ConfigTape } from "../sim/walkforward.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { isSignalInd } from "../indications/registry.ts";
import { isSignalCoordinationInd } from "../signal-coordination.ts";
import { runtimeFixtureGrid, trackRuntimes } from "../test-support.ts";
import type { Bars } from "../domain/types.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);

const settings = {
  // Preserve the original lifecycle fixture's source universe when unrelated families are registered.
  // Complete Micro/Inverse grids have dedicated full-family and stress coverage.
  focus: [...PREVIOUS_DEFAULT_FOCUS_17OCT], pinned: [], exitStrategy: { includeMicro: false },
  symbols: 3,
  historyDays: 1,
  tfDays: { "1": 1, "5": 1, "15": 1, "30": 1 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  grid: { ...runtimeFixtureGrid(), short: false as const },
  tactics: {
    session: false,
    volRegime: false,
    trendStrength: false,
    cooldown: false,
    cooldownBars: 4,
  },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  signals: signalSettings({
    sourcesMode: "allow", sources: { "ema-cross": true, "rsi-reversal": true }, lanes: [1, 5, 15, 30],
    exits: "pct", normal: { tp: [0.01, 0.02, 0.03, 0.04], slOfTp: [1, 2] },
    trailing: { tp: [0.02, 0.03], trailOfTp: [0.33, 0.66], slOfTp: 1 },
    trailRatios: [0.5, 1, 1.5], hist: { ...signalSettings().hist, enabled: false },
  }),
  runtime: { cycle: "incremental" as const, heavyEveryBars: 60 },
};

const tracked = trackRuntimes();
class CoreRuntime extends BaseRuntime {
  constructor(...a: ConstructorParameters<typeof BaseRuntime>) {
    super(...a);
    tracked.track(this);
  }
}
afterEach(() => tracked.disposeAll());

const COLS = [
  "exitT",
  "entryT",
  "r",
  "entry",
  "exit",
  "symI",
  "side",
  "reason",
  "bars",
  "vol",
  "level",
  "gp",
  "gl",
  "rs",
  "r2",
] as const;
function sameTape(a: ConfigTape, b: ConfigTape, what: string) {
  assert.equal(a.n, b.n, `${what}: n`);
  for (const c of COLS) assert.deepEqual(Array.from(a[c]), Array.from(b[c]), `${what}: ${c}`);
  // (entryI indexes the series: the fixture's candle store trims its first bar per append, so a rebuild from the stored
  // candles starts later than the continued series; the entry time and prices are the comparison)
  const noI = (o: ConfigTape["open"]) => o.map(({ entryI: _i, ...x }) => x);
  assert.deepEqual(noI(a.open), noI(b.open), `${what}: open`);
  assert.deepEqual(a.pending, b.pending, `${what}: pending`);
}
const posKey = (p: {
  cfg: string;
  sym: string;
  side: number;
  entryT: number;
  entry: number;
  stop: number;
  target: number;
}) => `${p.cfg}|${p.sym}|${p.side}|${p.entryT}|${p.entry}|${p.stop}|${p.target}`;

describe("runtime.cycle incremental equals a full recompute", { timeout: 600_000 }, () => {
  it("default is full", async () => {
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { ...settings, runtime: undefined } as never,
      { market: "synthetic" },
    );
    assert.equal(rt.settings.runtime?.cycle ?? "full", "full");
  });

  it("continued tapes, seats and paper decisions at several T", async () => {
    const rt = new CoreRuntime(new CoreDb(":memory:"), settings as never, { market: "synthetic" });
    // Bound the lifecycle fixture instead of inheriting the production 336h Signal / 48h simulation defaults.
    // Signals still have substantially longer history than strategies, exercising the independent rebuild.
    rt.updateSettings({}, { preH: 6, longH: 6, symH: 6, simH: 6, signalLongH: 72 });
    assert.equal(rt.executionEntryBlocked(), true, "changed settings fence old entries until publication and paper completion");
    const R = rt as any;
    await rt.cycle(); // the heavy compute
    // (the auto-adjust of the first book may ask for one more compute)
    for (let i = 0; i < 3 && R.dirty; i++) await rt.cycle();
    assert.equal(R.settingsStale, false, "successful exact-revision publication clears stale settings");
    assert.equal(rt.executionEntryBlocked(), false, "the completed matching paper step releases new entry admission");
    assert.ok(R.inc, "the heavy compute captured the validated set");
    const ids: Set<string> = R.inc.ids;
    assert.ok(ids.size > 50, `validated ${ids.size}`);
    // Explicitly exercise a held position whose exact tape is unavailable. Do not rely on an unrelated
    // enabled strategy or on a particular synthetic market outcome to happen to leave such a position behind.
    const missingId = "follow|ema-9-21@m15|tp17|sl18|tr0|h32";
    assert.ok(!rt.tapes.some((t) => t.id === missingId));
    assert.ok(!R.lastSelection.picks.some((p: { id: string }) => p.id === missingId));
    rt.paper.positions.push({ cfg: missingId, sym: "SYN0-USDT", side: 1,
      entryT: Math.floor(Date.now() / 3_600_000) * 3_600_000 - 6 * 3_600_000,
      entryI: 0, entry: 100, stop: 98, target: 102, peak: 100, trailOn: false, mtm: 0, vol: 1, level: 0 });
    ids.add(missingId);
    const selectedOrHeld = new Set<string>([
      ...R.lastSelection.picks.map((p: { id: string }) => p.id),
      ...rt.paper.selected,
      ...rt.paper.positions.map((p) => p.cfg),
    ]);
    assert.deepEqual([...ids].sort(), [...selectedOrHeld].sort(), "incremental work contains only selected or held configs");
    const rejectedSignals = rt.tapes.filter((tp) => tp.ind.startsWith("sig-") && !selectedOrHeld.has(tp.id));
    assert.ok(rejectedSignals.length > 0, "fixture includes nonselected Signal configs");
    assert.ok(rejectedSignals.every((tp) => !ids.has(tp.id)), "failed Signal candidates are not seeded into foreground work");

    const starts = new Map<string, number>(
      R.inc.state.universe.series.map((b: Bars) => [`${b.sym}@${b.tfMin}`, b.t[0]]),
    );
    // the candles untrimmed (the runtime's store drops its first bar per append, which would move a rebuilt window's start)
    const all = new Map<string, any[]>(
      [...(R.candles as Map<string, any>)].map(([sym, cs]) => [sym, cs.toCandles()]),
    );
    let seed = 99;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    let compared = 0;
    let expectedCompared = 0;
    let carriedCompared = 0;
    let decided = 0;
    for (let k = 1; k <= 3; k++) {
      for (const [sym, cs] of R.candles as Map<string, any>) {
        const o = cs.lastC();
        const c = o * (1 + (rnd() - 0.5) * 0.003);
        await R.storeCandles(
          sym,
          [
            {
              t: cs.lastT() + 60_000,
              o,
              h: Math.max(o, c) * 1.0005,
              l: Math.min(o, c) * 0.9995,
              c,
              v: 1000,
            },
          ],
          true,
        );
      }
      R.barsPending = true;
      const before = structuredClone(R.paper);
      const seats = structuredClone(R.lastSelection);
      const heavyTapes: ConfigTape[] = R.tapes;
      const heavyTapeIds = new Set(heavyTapes.map((tp) => tp.id));
      expectedCompared += [...ids].filter((id) => heavyTapeIds.has(id)).length;
      await rt.cycle();
      assert.equal(
        rt.status.cycleMode?.mode,
        "light",
        `cycle ${k} is light: ${rt.status.cycleMode?.why}`,
      );
      assert.deepEqual(R.lastSelection, seats, `light cycle retains the hour's exact seats @${k}`);
      // (the synthetic market may add a bar of its own in a cycle: the reference history follows the store)
      for (const [sym, cs] of R.candles as Map<string, any>) {
        const list = all.get(sym)!;
        for (let i = cs.lowerBound(list.at(-1).t + 1); i < cs.n; i++) list.push(cs.bar(i));
      }
      for (const b of R.inc.state.universe.series)
        if (b.sym === "SYN0-USDT" && b.tfMin === 1)
          assert.equal(b.t[b.n - 1], all.get("SYN0-USDT")!.at(-1).t, `grown 1m last bar @${k}`);
      const A = { paper: R.paper, tapes: R.tapes as ConfigTape[] };

      // the full recompute of the validated configs at this T: every lane series from the start the heavy tail had
      const s = rt.settings;
      const lanes: Bars[] = [];
      for (const [sym, list] of all)
        for (const b of laneSeriesOf(sym, CandleSeries.fromCandles(list), {
          ...s,
          tfDays: {},
          historyDays: 100,
        } as never)) {
          const t0 = starts.get(`${b.sym}@${b.tfMin}`)!;
          let i = 0;
          while (i < b.n && b.t[i] < t0) i++;
          const cut = (a: Float64Array) => a.slice(i);
          lanes.push({
            ...b,
            n: b.n - i,
            t: cut(b.t),
            o: cut(b.o),
            h: cut(b.h),
            l: cut(b.l),
            c: cut(b.c),
            v: cut(b.v),
          });
        }
      const u = makeUniverse(lanes);
      // Signals rebuild from their independent configured history; ordinary resumable tapes retain
      // the heavy tail's start. Reusing u for Signals would certify the old truncated-history bug.
      const signalU = makeUniverse(
        laneSeriesFrom(R.candles, s, 0, signalDataHours(s, R.wf)),
        R.inc.state.universe.evaluationFromT,
      );
      const a = R.fastArgs;
      const ref = new Map<string, ConfigTape>();
      for (const kind of ["main", "sig", "coord", "exit", "exitSig"] as const) {
        const want = new Set<string>();
        const pairs = new Set<string>();
        for (const tp of A.tapes) {
          const family = tp.kind === "exit"
            ? isSignalInd(tp.ind) ? "exitSig" : "exit"
            : isSignalCoordinationInd(tp.ind) ? "coord" : isSignalInd(tp.ind) ? "sig" : "main";
          if (ids.has(tp.id) && family === kind) {
            want.add(tp.id);
            pairs.add(`${tp.bot}|${tp.ind}`);
          }
        }
        if (!want.size) continue;
        for (const tp of buildTapes(
          kind === "main" || kind === "exit" ? u : signalU,
          a[kind].protects,
          s.cost,
          a[kind].dcaFor,
          pairs,
          s.tactics,
          a.adjust,
          { ...a[kind].floors, onlyIds: want },
        ))
          ref.set(tp.id, tp);
      }
      const byId = new Map(A.tapes.map((t) => [t.id, t]));
      let comparedAtT = 0;
      for (const id of ids) {
        const got = byId.get(id);
        const want = ref.get(id);
        if (!heavyTapeIds.has(id)) {
          // A carried paper position can outlive the exact tape that created it. The book keeps its
          // own stop/trail for that order; it is not part of this cycle's tape continuation cohort.
          const old = before.positions.find((p: { cfg: string }) => p.cfg === id);
          assert.ok(old, `only a held position may lack a source tape: ${id}`);
          assert.equal(seats.picks.some((p: { id: string }) => p.id === id), false,
            `a tape-less carried position cannot receive a fresh seat: ${id}`);
          const retained = A.paper.positions.find((p: {
            cfg: string; sym: string; side: number; entryT: number; entry: number; stop: number; target: number;
          }) =>
            `${p.cfg}|${p.sym}|${p.side}|${p.entryT}|${p.entry}` ===
            `${old.cfg}|${old.sym}|${old.side}|${old.entryT}|${old.entry}`,
          );
          assert.ok(retained, `paper retains tape-less held order @${k}: ${id}`);
          assert.ok(retained!.stop > 0 && retained!.target > 0,
            `carried order retains its own stop and target @${k}: ${id}`);
          carriedCompared++;
          continue;
        }
        assert.ok(got, `selected or held incremental tape ${id} exists @${k}`);
        assert.ok(want, `full recompute rebuilds selected or held tape ${id} @${k}`);
        sameTape(
          got!,
          want!,
          `${id} @${k} entry=${R.inc.state.entries.has(id)} other=${R.inc.others.has(id)}`,
        );
        compared++;
        comparedAtT++;
      }
      assert.equal(comparedAtT, [...ids].filter((id) => heavyTapeIds.has(id)).length,
        `every selected/held tape with a source tape is compared @${k}`);

      // the decisions: the paper step on the recomputed tapes, from the same book, takes the same positions
      const posA = A.paper.positions.map(posKey).sort();
      const selA = [...A.paper.selected].sort();
      R.paper = before;
      R.tapes = A.tapes.filter((tp) => ids.has(tp.id)).map((tp) => ref.get(tp.id) ?? tp);
      R.tapeIdx = null;
      for (const g = R.stepPaperGen(undefined, true); !g.next().done;);
      assert.deepEqual(R.paper.positions.map(posKey).sort(), posA, `positions @${k}`);
      assert.deepEqual([...R.paper.selected].sort(), selA, `selected @${k}`);
      decided += posA.length;
      // continue from the light cycle's state
      R.paper = A.paper;
      R.tapes = A.tapes;
      R.tapeIdx = null;
      void heavyTapes;
    }
    assert.equal(compared, expectedCompared, `compared every selected/held tape with a source tape (${compared})`);
    assert.ok(carriedCompared > 0, `fixture exercised carried tape-less positions (${carriedCompared})`);
    console.log(`compared ${compared} tape states, carried ${carriedCompared} tape-less positions, ${decided} open positions`);
  });
});
