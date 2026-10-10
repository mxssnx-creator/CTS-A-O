// simulate keeps the exits, the excursions (mfe / mae) and the open and pending state of the original per-bar code. The
// reference below is that code (the mfe / mae were updated bar by bar, with a division each); the two must agree on
// every field of every trade, on random bars with gaps, long and short, fixed and trailing exits, time exits,
// cooldowns and ATR protects.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { atrEma } from "../math/indicators.ts";
import type { AtrProtect, Bars, OpenPosition, Protect, Side, Trade } from "../domain/types.ts";
import { ATR_PERIOD, nextEntryIndex, resolveAtrProtect, simulate, type SimOptions, type SimResult } from "./backtest.ts";

function simulateReference(
  cfg: string,
  bars: Bars,
  sig: Int8Array,
  p: Protect,
  opt: SimOptions,
): SimResult {
  const { n, t, o, h, l, c, sym } = bars;
  const cost = opt.cost;
  const cooldown = opt.cooldown ?? 0;
  const trades: Trade[] = [];
  let inPos = false;
  let side: Side = 1;
  let entryI = 0;
  let entry = 0;
  let stop = 0;
  let target = 0;
  let peak = 0;
  let trailOn = false;
  let mfe = 0;
  let mae = 0;
  let nextAllowed = 0;
  // the distances in force (an ATR protect resolves them at every entry)
  let q: Protect = p;
  let dist = p.trail * (p.trailStep ?? 1);
  const atr = p.atr ? (opt.atr ?? atrEma(h, l, c, ATR_PERIOD)) : null;
  const resolve = (i: number) => resolveAtrProtect(p, atr![i] / c[i], bars.tfMin);
  const nx = nextEntryIndex(sig);

  const close = (i: number, exit: number, reason: Trade["reason"], exitT: number) => {
    const r = (side * (exit - entry)) / entry - cost;
    trades.push({
      cfg,
      sym,
      side,
      entryT: t[entryI],
      exitT,
      entry,
      exit,
      r,
      reason,
      bars: i - entryI + 1,
      mfe,
      mae,
    });
    inPos = false;
    nextAllowed = i + cooldown;
  };

  for (let i = 0; i < n; i++) {
    if (inPos && i >= entryI) {
      const gap = i > entryI;
      const barEnd = t[i] + bars.tfMin * 60_000;
      if (side === 1) {
        const up = (h[i] - entry) / entry;
        const dn = (entry - l[i]) / entry;
        if (up > mfe) mfe = up;
        if (dn > mae) mae = dn;
        if (l[i] <= stop) {
          close(i, gap ? Math.min(o[i], stop) : stop, trailOn ? "trail" : "sl", barEnd);
        } else if (h[i] >= target && !(trailOn && q.trailFree)) {
          close(i, gap ? Math.max(o[i], target) : target, "tp", barEnd);
        }
      } else {
        const up = (entry - l[i]) / entry;
        const dn = (h[i] - entry) / entry;
        if (up > mfe) mfe = up;
        if (dn > mae) mae = dn;
        if (h[i] >= stop) {
          close(i, gap ? Math.max(o[i], stop) : stop, trailOn ? "trail" : "sl", barEnd);
        } else if (l[i] <= target && !(trailOn && q.trailFree)) {
          close(i, gap ? Math.min(o[i], target) : target, "tp", barEnd);
        }
      }
      if (inPos) {
        if (i - entryI + 1 >= p.hold) {
          close(i, c[i], "time", barEnd);
        } else if (q.trail > 0) {
          if (side === 1) {
            if (h[i] > peak) peak = h[i];
            if ((peak - entry) / entry >= q.trail) {
              trailOn = true;
              const lvl = peak * (1 - dist);
              if (lvl > stop) stop = lvl;
            }
          } else {
            if (l[i] < peak) peak = l[i];
            if ((entry - peak) / entry >= q.trail) {
              trailOn = true;
              const lvl = peak * (1 + dist);
              if (lvl < stop) stop = lvl;
            }
          }
        }
      }
    }
    if (!inPos) {
      // flat: a bar without an entry changes nothing, so go straight to the next entry the cooldown allows (or stop:
      // none is left) — the same trades as visiting every bar
      const j = nx[i >= nextAllowed ? i : Math.min(nextAllowed, n)];
      if (j + 1 >= n) break;
      i = j;
      const s = sig[i];
      {
        inPos = true;
        side = s > 0 ? 1 : -1;
        entryI = i + 1;
        entry = o[i + 1];
        if (atr) {
          // ATR of the signal bar (known at its close), as a fraction of its close
          q = resolve(i);
          dist = q.trail * (q.trailStep ?? 1);
        }
        stop = side === 1 ? entry * (1 - q.sl) : entry * (1 + q.sl);
        target = side === 1 ? entry * (1 + q.tp) : entry * (1 - q.tp);
        peak = entry;
        trailOn = false;
        mfe = 0;
        mae = 0;
      }
    }
  }

  let open: OpenPosition | null = null;
  if (inPos) {
    const last = c[n - 1];
    open = {
      cfg,
      sym,
      side,
      entryT: t[entryI],
      entryI,
      entry,
      stop,
      target,
      peak,
      trailOn,
      mtm: (side * (last - entry)) / entry - cost,
      // the trail in force (an ATR protect resolved it at the entry): the live tick advances it bar by bar
      ...(q.trail > 0 ? { trail: q.trail, trailDist: dist } : {}),
    };
  }
  const lastSig = n > 0 ? sig[n - 1] : 0;
  const pending: Side | 0 =
    !inPos && n > 0 && n - 1 >= nextAllowed && lastSig !== 0 ? (lastSig > 0 ? 1 : -1) : 0;
  if (pending && atr) return { trades, open, pending, pendingProtect: resolve(n - 1) };
  return { trades, open, pending };
}


/** a seeded generator, so the bars and the signals are the same on every run */
function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

/** random bars: a walk with gaps (the open away from the last close), wicks, and a flat stretch now and then */
function randomBars(seed: number, n: number, tfMin: number): Bars {
  const r = rng(seed);
  const t = new Float64Array(n);
  const o = new Float64Array(n);
  const h = new Float64Array(n);
  const l = new Float64Array(n);
  const c = new Float64Array(n);
  const v = new Float64Array(n);
  let px = 100;
  const T0 = Date.UTC(2026, 8, 1);
  for (let i = 0; i < n; i++) {
    t[i] = T0 + i * tfMin * 60_000;
    const gap = r() < 0.05 ? (r() - 0.5) * 0.02 : 0;
    o[i] = px * (1 + gap);
    const move = r() < 0.1 ? 0 : (r() - 0.5) * 0.012;
    c[i] = o[i] * (1 + move);
    h[i] = Math.max(o[i], c[i]) * (1 + r() * 0.004);
    l[i] = Math.min(o[i], c[i]) * (1 - r() * 0.004);
    v[i] = 1 + r() * 100;
    px = c[i];
  }
  return { sym: "R", tfMin, n, t, o, h, l, c, v } as Bars;
}

function randomSignal(seed: number, n: number, density: number, mode: "both" | "long" | "short"): Int8Array {
  const r = rng(seed);
  const sig = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    if (r() >= density) continue;
    const s = mode === "both" ? (r() < 0.5 ? 1 : -1) : mode === "long" ? 1 : -1;
    sig[i] = s;
  }
  return sig;
}

const PROTECTS: Protect[] = [
  { tp: 0.02, sl: 0.01, trail: 0, hold: 40 },
  { tp: 0.03, sl: 0.012, trail: 0.01, trailStep: 0.5, hold: 120 },
  { tp: 0.05, sl: 0.02, trail: 0.02, trailStep: 1, trailFree: true, hold: 200 },
  { tp: 0.004, sl: 0.003, trail: 0, hold: 3 },
  { tp: 0.015, sl: 0.006, trail: 0.004, trailStep: 0.25, hold: 60 },
  { tp: 0.01, sl: 0.005, trail: 0.02, trailStep: 1, hold: 500 },
];
const ATR_PROTECTS: AtrProtect[] = [
  { sl: 1.5, tpRatio: 2, trail: 0 },
  { sl: 2, tpRatio: 3, trail: 3, minSl: 0.004, minTrail: 0.002 },
] as AtrProtect[];

describe("simulate: every trade field equals the per-bar reference", () => {
  const bars = [randomBars(3, 2600, 15), randomBars(9, 1800, 5)];
  const modes = ["both", "long", "short"] as const;
  let checked = 0;
  let trailed = 0;
  let shorts = 0;
  for (const b of bars)
    for (const mode of modes)
      for (const density of [0.02, 0.2])
        for (const [pi, p] of PROTECTS.entries()) {
          it(`${b.tfMin}m ${mode} density ${density} protect ${pi}`, () => {
            const sig = randomSignal(100 + pi * 7 + Math.round(density * 100), b.n, density, mode);
            for (const cooldown of [0, 3]) {
              const opt: SimOptions = { cost: 0.002, cooldown };
              const got = simulate("cfg", b, sig, p, opt);
              const want: SimResult = simulateReference("cfg", b, sig, p, opt);
              assert.deepEqual(got, want);
              checked += got.trades.length;
              trailed += got.trades.filter((x) => x.reason === "trail").length;
              shorts += got.trades.filter((x) => x.side === -1).length;
            }
          });
        }
  it("the cases exercise trailing exits and short trades (the checks above are not vacuous)", () => {
    const b = bars[0];
    const got = simulate("cfg", b, randomSignal(5, b.n, 0.2, "both"), PROTECTS[2], { cost: 0.002 });
    assert.ok(got.trades.some((x) => x.reason === "trail") || checked > 0);
    assert.ok(checked > 1000, `trades checked ${checked}`);
    assert.ok(trailed > 0 && shorts > 0, `trailing ${trailed}, short ${shorts}`);
  });
  for (const [ai, a] of ATR_PROTECTS.entries())
    it(`ATR protect ${ai} (resolved at each entry)`, () => {
      const b = bars[0];
      const p = { tp: 0, sl: 0, trail: 0, hold: 150, atr: a } as Protect;
      const sig = randomSignal(40 + ai, b.n, 0.05, "both");
      const opt: SimOptions = { cost: 0.002, cooldown: 1 };
      assert.deepEqual(simulate("atr", b, sig, p, opt), simulateReference("atr", b, sig, p, opt));
      const atr = atrEma(b.h, b.l, b.c, ATR_PERIOD);
      assert.deepEqual(
        simulate("atr", b, sig, p, { ...opt, atr }),
        simulateReference("atr", b, sig, p, { ...opt, atr }),
      );
    });
});

describe("simulate: the flat-skip index", () => {
  it("nextEntryIndex points at the next entry bar (or n)", () => {
    const sig = Int8Array.from([0, 0, 1, 0, -1, 0]);
    assert.deepEqual([...nextEntryIndex(sig)], [2, 2, 2, 4, 4, 6, 6]);
  });
});
