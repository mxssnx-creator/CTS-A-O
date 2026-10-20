import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars, Protect, Trade } from "../domain/types.ts";
import { barsFromCandles, mulberry32 } from "../market/bars.ts";
import { DEFAULT_AXIS, DEFAULT_DCA } from "../config.ts";
import { SeriesCache } from "../indications/cache.ts";
import { SimulationCursor } from "./cursor.ts";
import { simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";

const prefix = (b: Bars, n: number): Bars => ({
  ...b,
  n,
  t: b.t.subarray(0, n),
  o: b.o.subarray(0, n),
  h: b.h.subarray(0, n),
  l: b.l.subarray(0, n),
  c: b.c.subarray(0, n),
  v: b.v.subarray(0, n),
});
const P: Protect = { tp: 0.012, sl: 0.009, trail: 0, hold: 13 };

describe("append-only simulator cursors", () => {
  it("preserves every close, open, pending signal, protection and cooldown over arbitrary chunks", () => {
    let verified = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const rnd = mulberry32(seed);
      let px = 100;
      const b = barsFromCandles(
        "CURSOR",
        1,
        Array.from({ length: 240 }, (_, i) => {
          const o = px * (1 + (rnd() - 0.5) * 0.025);
          const c = o * (1 + (rnd() - 0.5) * 0.02);
          px = c;
          return {
            t: i * 60_000,
            o,
            c,
            h: Math.max(o, c) * (1 + rnd() * 0.012),
            l: Math.min(o, c) * (1 - rnd() * 0.012),
            v: 100 + rnd() * 30,
          };
        }),
      );
      const signal = Int8Array.from(b.t, (_, i) => (i % 3 ? 0 : rnd() < 0.5 ? 1 : -1));
      for (const cfg of ["follow|trend-ema|test", "follow|sig-rsi|test"]) {
        const runs: Array<
          (
            b: Bars,
            s: Int8Array,
            cursor?: SimulationCursor,
          ) => {
            trades: Trade[];
            open?: unknown;
            pending: number;
            pendingProtect?: Protect;
          }
        > = [
          (b, s, cursor) => simulate(cfg, b, s, P, { cost: 0.0015, cooldown: 3, cursor }),
          (b, s, cursor) =>
            simulate(cfg, b, s, { ...P, trail: 0.005, trailStep: 0.6 }, { cost: 0.0015, cursor }),
          (b, s, cursor) =>
            simulate(cfg, b, s, { ...P, trail: 0.005, trailOnly: true }, { cost: 0.0015, cursor }),
          (b, s, cursor) =>
            simulate(
              cfg,
              b,
              s,
              { ...P, atr: { sl: 1, tpRatio: 1.5, trail: 0.6 } },
              { cost: 0.0015, cursor },
            ),
          ...[false, true].map(
            (active) => (b: Bars, s: Int8Array, cursor?: SimulationCursor) =>
              simulateDca(cfg, b, s, P, { ...DEFAULT_DCA, step: 0.004 }, active, 0.0015, 2, cursor),
          ),
          ...["fixed", "managed"].map(
            (exits) => (b: Bars, s: Int8Array, cursor?: SimulationCursor) => {
              const k = new SeriesCache(b);
              return simulateAxis(
                cfg,
                b,
                s,
                P,
                { ...DEFAULT_AXIS, exits: exits as "fixed" | "managed" },
                k.ema(20),
                k.atr(14),
                0.0015,
                2,
                { minSl: 0.003 },
                cursor,
              );
            },
          ),
          (b, s, cursor) => {
            const k = new SeriesCache(b);
            return simulateAxisDesk(
              cfg,
              b,
              s,
              P,
              { ...DEFAULT_AXIS, mode: "desk", hybrid: true },
              k.ema(20),
              k.atr(14),
              0.0015,
              2,
              { minSl: 0.003, minTrail: 0.002 },
              cursor,
            );
          },
        ];
        for (const run of runs) {
          const cursor = new SimulationCursor();
          const trades: Trade[] = [];
          for (let n = 1; n <= b.n; n += n % 7 === 0 ? 4 : 1) {
            const cut = prefix(b, n);
            const s = signal.slice(0, n);
            const actual = run(cut, s, cursor);
            trades.push(...actual.trades);
            const expected = run(cut, s);
            assert.deepEqual({ ...actual, trades }, expected, `${cfg} seed ${seed} prefix ${n}`);
            verified++;
          }
        }
      }
    }
    assert.ok(verified > 10_000);
  });

  it("refuses a repeated, shortened, shifted or different-symbol series", () => {
    const b = barsFromCandles(
      "A",
      1,
      Array.from({ length: 4 }, (_, i) => ({ t: i * 60_000, o: 100, h: 101, l: 99, c: 100, v: 1 })),
    );
    for (const bad of [
      prefix(b, 2),
      prefix(b, 1),
      { ...b, sym: "B" },
      { ...b, t: Float64Array.from([1, 60_000, 120_000, 180_000]) },
    ]) {
      const cursor = new SimulationCursor();
      simulate("x", prefix(b, 2), new Int8Array(2), P, { cost: 0.0015, cursor });
      assert.throws(
        () => simulate("x", bad, new Int8Array(bad.n), P, { cost: 0.0015, cursor }),
        /strictly appended/,
      );
    }
  });
});
