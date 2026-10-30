// Incremental tapes equal a full recompute: a tape seeded at T0 and extended to T1, T2, T3 is, column by column, the
// tape buildTapes gives on the series cut at that T (same trades in order, prefix sums, open positions, pending
// entries). Also pins which kinds resume and which are rebuilt on a tail.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { barsFromCandles, headBars, resample, syntheticCandles } from "../market/bars.ts";
import { buildTapes, defaultWalkForward, type ConfigTape } from "./walkforward.ts";
import {
  extendTape,
  isResumable,
  RESUME_KINDS,
  seedTape,
  TAIL_REBUILD_KINDS,
  type TapeResume,
} from "./tape-extend.ts";
import type { Bars, Tactics } from "../domain/types.ts";
import { runtimeFixtureGrid } from "../test-support.ts";

const LANES = [1, 5, 15] as const;
function lanes(seed: number, syms: number): Bars[] {
  const out: Bars[] = [];
  for (let s = 0; s < syms; s++) {
    const c1 = syntheticCandles(`S${s}`, 1, 3 * 24 * 60, seed + s) as any;
    for (const tf of LANES) {
      const b = barsFromCandles(`S${s}`, tf, tf === 1 ? c1 : resample(c1, 1, tf));
      b.lanes = LANES;
      out.push(b);
    }
  }
  return out;
}

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
function same(a: ConfigTape, b: ConfigTape, what: string) {
  assert.equal(a.n, b.n, `${what}: n`);
  for (const c of COLS) assert.deepEqual(Array.from(a[c]), Array.from(b[c]), `${what}: ${c}`);
  assert.deepEqual(a.open, b.open, `${what}: open`);
  assert.deepEqual(a.pending, b.pending, `${what}: pending`);
  assert.deepEqual(a.protect, b.protect, `${what}: protect`);
  assert.equal(a.fromT, b.fromT, `${what}: fromT`);
}

describe("kind policy", () => {
  it("resume kinds and tail-rebuild kinds are explicit", () => {
    assert.deepEqual([...RESUME_KINDS], ["normal", "trailing", "trailing-only"]);
    assert.deepEqual([...TAIL_REBUILD_KINDS], ["dca", "dca-active", "axis"]);
    assert.equal(isResumable({ kind: "normal", ind: "trend-ema@m15" }), true);
    assert.equal(isResumable({ kind: "trailing", ind: "trend-ema@m15" }), true);
    assert.equal(isResumable({ kind: "trailing-only", ind: "trend-ema@m15" }), true);
    assert.equal(isResumable({ kind: "dca", ind: "trend-ema@m15" }), false);
    assert.equal(isResumable({ kind: "axis", ind: "trend-ema@m15" }), false);
    assert.equal(isResumable({ kind: "normal", ind: "sig-x" }), false);
  });
});

const tacticVariants: Array<[string, Tactics]> = [
  ["default tactics", DEFAULT_SETTINGS.tactics],
  [
    "cooldown 3 + onRun",
    { ...DEFAULT_SETTINGS.tactics, cooldown: true, cooldownBars: 3, onRun: true },
  ],
  [
    "no tactics",
    { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 0 },
  ],
];

for (const [name, tactics] of tacticVariants)
  describe(`seed + extend equals a full recompute (${name})`, () => {
    const all = lanes(7, 3);
    const full = makeUniverse(all);
    const span = full.nowT - full.startT;
    const at = (f: number) => Math.floor((full.startT + span * f) / 900_000) * 900_000;
    const cuts = [0.7, 0.85, 1].map(at);
    const uAt = (t: number) => makeUniverse(all.map((b) => headBars(b, t)));
    // Bound the Cartesian fixture while preserving every range and both endpoints per parameter. Full current
    // grids have dedicated completeness/stress coverage; this suite compares every byte of each resumed tape.
    const wf = defaultWalkForward({ ...DEFAULT_SETTINGS, grid: runtimeFixtureGrid() });
    const only = new Set(
      ["mc-tpull-8@m5", "trend-ema@m15", "mc-rsi3-10@m1"].flatMap((i) =>
        ["follow", "revert"].map((b) => `${b}|${i}`),
      ),
    );
    const floors = { minSl: 0, minTrail: 0 };
    const build = (u: ReturnType<typeof uAt>) =>
      buildTapes(u, wf.protects, DEFAULT_SETTINGS.cost, undefined, only, tactics, null, floors);

    it("every resumable tape matches at each of several T", () => {
      const u0 = uAt(cuts[0]);
      const t0 = build(u0);
      const state = new Map<string, { tape: ConfigTape; resume: TapeResume }>();
      let seeded = 0;
      for (const tp of t0) {
        if (!isResumable(tp)) continue;
        const s = seedTape(tp, u0, DEFAULT_SETTINGS.cost, tactics);
        assert.ok(s, `seed ${tp.id}`);
        same(s.tape, tp, `seed ${tp.id}`);
        state.set(tp.id, s);
        seeded++;
      }
      assert.ok(seeded > 100, `seeded ${seeded}`);
      let trades = 0;
      let opens = 0;
      for (const t of cuts.slice(1)) {
        const u = uAt(t);
        const ref = new Map(build(u).map((x) => [x.id, x]));
        for (const [id, cur] of state) {
          const want = ref.get(id);
          // a config the full build drops at this T (too few closes) has no reference: skip it
          if (!want) continue;
          const nx = extendTape(cur.tape, cur.resume, u, DEFAULT_SETTINGS.cost, tactics);
          assert.ok(nx, `extend ${id}`);
          same(nx.tape, want, `${id} @${t}`);
          state.set(id, nx);
          trades += want.n;
          opens += want.open.length;
        }
      }
      assert.ok(trades > 1000, `compared ${trades} trades`);
      assert.ok(opens > 0, "some open positions were compared");
    });

    it("one bar at a time (15m steps) equals the full build", () => {
      const t = at(0.9);
      const u0 = uAt(t);
      const t0 = build(u0).filter(isResumable).slice(0, 25);
      const st = t0.map((tp) => seedTape(tp, u0, DEFAULT_SETTINGS.cost, tactics)!);
      let last = t;
      for (let k = 1; k <= 2; k++) {
        const tt = t + k * 900_000;
        if (tt > full.nowT) break;
        const u = uAt(tt);
        const ref = new Map(build(u).map((x) => [x.id, x]));
        st.forEach((s, i) => {
          const want = ref.get(s.tape.id);
          if (!want) return;
          const nx = extendTape(s.tape, s.resume, u, DEFAULT_SETTINGS.cost, tactics)!;
          assert.ok(nx);
          same(nx.tape, want, `${s.tape.id} +${k}`);
          st[i] = nx;
        });
        last = tt;
      }
      assert.ok(last > t);
    });

    it("a series whose start moved cannot be continued (null: rebuild)", () => {
      const u0 = uAt(cuts[0]);
      const tp = build(u0).find(isResumable)!;
      const s = seedTape(tp, u0, DEFAULT_SETTINGS.cost, tactics)!;
      const slid = makeUniverse(
        all
          .map((b) => headBars(b, cuts[1]))
          .map((b) => ({
            ...b,
            t: b.t.slice(10),
            o: b.o.slice(10),
            h: b.h.slice(10),
            l: b.l.slice(10),
            c: b.c.slice(10),
            v: b.v.slice(10),
            n: b.n - 10,
          })),
      );
      assert.equal(extendTape(s.tape, s.resume, slid, DEFAULT_SETTINGS.cost, tactics), null);
    });
  });
