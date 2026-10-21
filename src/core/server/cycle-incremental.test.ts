// runtime.cycle "incremental" against a full recompute, on a fixed synthetic fixture and several T (one heavy compute,
// then light cycles after each new closed bar): the continued tapes of the validated set equal the tapes the builder
// gives for the same configs on the full history up to that T; the seats of the hour are the ones a selection over the
// continued tapes picks; and the paper step on the continued tapes takes the decisions it takes on the recomputed ones.
// Run with CTS_CORE_WORKERS=1 (one small runtime: 3 symbols, 1 day).
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime as BaseRuntime, laneSeriesFrom, laneSeriesOf, signalDataHours } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { signalSettings } from "../signals.ts";
import { SIGNAL_SOURCES } from "../signal-config.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapes, selectFixedGen, type ConfigTape } from "../sim/walkforward.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { isSignalInd } from "../indications/registry.ts";
import { isSignalCoordinationInd } from "../signal-coordination.ts";
import { trackRuntimes } from "../test-support.ts";
import type { Bars } from "../domain/types.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);

const settings = {
  symbols: 3,
  historyDays: 1,
  tfDays: { "1": 1, "5": 1, "15": 1, "30": 1 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  grid: { short: false as const },
  tactics: {
    session: false,
    volRegime: false,
    trendStrength: false,
    cooldown: false,
    cooldownBars: 4,
  },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  signals: signalSettings({
    exits: "pct",
    sources: Object.fromEntries(
      SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false]),
    ),
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
    const R = rt as any;
    await rt.cycle(); // the heavy compute
    // (the auto-adjust of the first book may ask for one more compute)
    for (let i = 0; i < 3 && R.dirty; i++) await rt.cycle();
    assert.ok(R.inc, "the heavy compute captured the validated set");
    const ids: Set<string> = R.inc.ids;
    assert.ok(ids.size > 50, `validated ${ids.size}`);
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
      const heavyTapes: ConfigTape[] = R.tapes;
      await rt.cycle();
      assert.equal(
        rt.status.cycleMode?.mode,
        "light",
        `cycle ${k} is light: ${rt.status.cycleMode?.why}`,
      );
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
      for (const kind of ["main", "sig", "coord"] as const) {
        const want = new Set<string>();
        const pairs = new Set<string>();
        for (const tp of A.tapes)
          if (ids.has(tp.id) && (isSignalCoordinationInd(tp.ind) ? "coord" : isSignalInd(tp.ind) ? "sig" : "main") === kind) {
            want.add(tp.id);
            pairs.add(`${tp.bot}|${tp.ind}`);
          }
        if (!want.size) continue;
        for (const tp of buildTapes(
          kind === "main" ? u : signalU,
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
      for (const id of ids) {
        const got = byId.get(id);
        const want = ref.get(id);
        if (!got || !want) continue;
        sameTape(
          got,
          want,
          `${id} @${k} entry=${R.inc.state.entries.has(id)} other=${R.inc.others.has(id)}`,
        );
        compared++;
      }

      // the seats of the hour: a selection over the continued tapes picks what the last full step seated
      const t = Math.min(Math.floor(Date.now() / 3_600_000) * 3_600_000, R.sim.endT);
      const engine = A.tapes.filter((tp) => !isSignalInd(tp.ind) && ids.has(tp.id));
      if (R.wf.mode === "fixed") {
        const g = selectFixedGen(engine, t, R.wf);
        let r = g.next();
        while (!r.done) r = g.next();
        const picked = new Set(r.value.picks.map((p) => p.id));
        const seated = new Set<string>(R.lastSelection.picks.map((p: { id: string }) => p.id));
        for (const id of seated)
          if (!isSignalInd(id.split("|")[1] ?? ""))
            assert.ok(picked.has(id) || !engine.some((tp) => tp.id === id), `seat ${id} @${k}`);
      }

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
    assert.ok(compared > 500, `compared ${compared} tapes`);
    console.log(`compared ${compared} tape states, ${decided} open positions`);
  });
});
