// Last-N validation and window numbers against brute-force references on random tapes: which closes count (closed
// at or before the entry), PF over exactly the last N, drawdown depth and drawdown time (open dips up to the entry),
// DDR (drawdown ÷ net, same unit), and the Base gate on statsOf numbers (PF, net, drawdown in %).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeTape, lastNOk, winDd, ddrFails } from "./walkforward.ts";
import { passesBase } from "../pipeline/pipeline.ts";
import { profitFactor, statsOf } from "../metrics/stats.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

function randomTrades(r: () => number, n: number): Trade[] {
  const out: Trade[] = [];
  let t = T0;
  for (let i = 0; i < n; i++) {
    // ties on exit time and zero-length gaps on purpose
    t += r() < 0.15 ? 0 : Math.floor(r() * 3 * H);
    const hold = Math.floor(r() * 4 * H) + 60_000;
    const kind = r();
    const ret = kind < 0.08 ? 0 : (r() - 0.45) * 0.04;
    out.push({
      cfg: "c",
      sym: "S1-USDT",
      side: 1,
      entryT: t - hold,
      exitT: t,
      entry: 1,
      exit: 1,
      r: ret,
      reason: "tp",
      bars: 1,
      mfe: 0,
      mae: 0,
      kind: "normal",
      vol: 1,
      level: 0,
    } as Trade);
  }
  return out;
}

const tapeOf = (trades: Trade[]) =>
  makeTape("c", "follow" as never, "ema", { tp: 0.01, sl: 0.01, trail: 0, hold: 16 }, "normal", ["S1-USDT"], trades, [], []);

/** Brute force: the closes with exitT ≤ t, in exit order (makeTape's order), the last n of them. */
function lastClosed(sorted: Trade[], t: number, n: number): Trade[] | null {
  const xs = sorted.filter((x) => x.exitT <= t);
  return xs.length < n ? null : xs.slice(xs.length - n);
}
/** Brute-force drawdown of a close sequence: depth (fraction) and longest time under a peak (hours, open to nowT). */
function ddRef(xs: Trade[], nowT: number) {
  let cum = 0;
  let peak = 0;
  let peakT = xs.length ? xs[0].entryT : 0;
  let under = false;
  let mdd = 0;
  let ddt = 0;
  for (const x of xs) {
    cum += x.r;
    if (cum < peak) {
      under = true;
      mdd = Math.max(mdd, peak - cum);
    } else {
      if (under) ddt = Math.max(ddt, x.exitT - peakT);
      under = false;
      peak = cum;
      peakT = x.exitT;
    }
  }
  if (under) ddt = Math.max(ddt, nowT - peakT);
  return { mdd, ddtH: ddt / H };
}
function lastNRef(sorted: Trade[], t: number, n: number, minPf: number, maxDdtH: number, maxDdr: number) {
  if (n <= 0) return true;
  const xs = lastClosed(sorted, t, n);
  if (!xs) return false;
  let gp = 0;
  let gl = 0;
  let net = 0;
  for (const x of xs) {
    if (x.r > 0) gp += x.r;
    else gl -= x.r;
    net += x.r;
  }
  if (profitFactor(gp, gl) < minPf) return false;
  const dd = ddRef(xs, t);
  if (maxDdtH > 0 && dd.ddtH > maxDdtH) return false;
  if (maxDdr > 0 && (!(net > 0) || dd.mdd / net > maxDdr)) return false;
  return true;
}

describe("last-N validation and window numbers", () => {
  it("lastNOk equals the brute-force reference over random tapes, entries, N and gates", () => {
    const r = rng(11);
    let checked = 0;
    let passed = 0;
    for (let k = 0; k < 120; k++) {
      const trades = randomTrades(r, 5 + Math.floor(r() * 80));
      const tp = tapeOf(trades.map((x) => ({ ...x })));
      const sorted = [...trades].sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
      for (let q = 0; q < 40; q++) {
        // entries before, between, exactly on and after the closes
        const pick = sorted[Math.floor(r() * sorted.length)];
        const t = r() < 0.3 ? pick.exitT : pick.exitT + Math.floor((r() - 0.3) * 6 * H);
        const n = [0, 1, 3, 5, 8, 12, 20, 50][Math.floor(r() * 8)];
        const minPf = [1, 1.1, 1.35, 1.5][Math.floor(r() * 4)];
        const maxDdtH = [0, 2, 8, 24][Math.floor(r() * 4)];
        const maxDdr = [0, 0.5, 1, 2][Math.floor(r() * 4)];
        const got = lastNOk(tp, t, n, minPf, maxDdtH, maxDdr);
        const want = lastNRef(sorted, t, n, minPf, maxDdtH, maxDdr);
        assert.equal(got, want, `k ${k} q ${q}: n ${n} at ${t - T0} minPf ${minPf} ddt ${maxDdtH} ddr ${maxDdr}`);
        checked++;
        if (got) passed++;
      }
    }
    // both outcomes are exercised
    assert.ok(passed > checked * 0.05 && passed < checked * 0.95, `${passed} of ${checked} passed`);
  });

  it("a close exactly at the entry time counts; one a millisecond later does not", () => {
    const base = randomTrades(rng(3), 1)[0];
    const mk = (exitT: number, ret: number) => ({ ...base, entryT: exitT - H, exitT, r: ret });
    const tp = tapeOf([mk(T0, 0.01), mk(T0 + H, 0.01), mk(T0 + 2 * H, -0.05)]);
    assert.equal(lastNOk(tp, T0 + H, 2, 1.1), true, "the two wins closed at or before the entry");
    assert.equal(lastNOk(tp, T0 + 2 * H, 2, 1.1), false, "the loss closed exactly at the entry: counted");
    assert.equal(lastNOk(tp, T0 + 2 * H - 1, 2, 1.1), true, "one ms before the loss closed");
    assert.equal(lastNOk(tp, T0 - 1, 1, 1.1), false, "nothing closed yet: never validated");
  });

  it("winDd equals the brute-force drawdown on any window [a, b)", () => {
    const r = rng(29);
    for (let k = 0; k < 200; k++) {
      const trades = randomTrades(r, 3 + Math.floor(r() * 60));
      const tp = tapeOf(trades.map((x) => ({ ...x })));
      const sorted = [...trades].sort((x, y) => x.exitT - y.exitT || x.entryT - y.entryT);
      const a = Math.floor(r() * tp.n);
      const b = a + Math.floor(r() * (tp.n - a + 1));
      const nowT = (sorted[Math.max(0, b - 1)]?.exitT ?? T0) + Math.floor(r() * 5 * H);
      const got = winDd(tp, a, b, nowT);
      const want = b <= a ? { mdd: 0, ddtH: 0 } : ddRef(sorted.slice(a, b), nowT);
      assert.ok(Math.abs(got.mdd - want.mdd) < 1e-12, `mdd ${got.mdd} vs ${want.mdd}`);
      assert.ok(Math.abs(got.ddtH - want.ddtH) < 1e-9, `ddt ${got.ddtH} vs ${want.ddtH}`);
    }
  });

  it("DDR compares drawdown and net in the same unit; nothing earned always fails", () => {
    assert.equal(ddrFails(0.02, 0.04, 1), false);
    assert.equal(ddrFails(0.05, 0.04, 1), true);
    assert.equal(ddrFails(0, 0, 1), true, "no net result");
    assert.equal(ddrFails(0.5, -1, 0), false, "off at 0");
  });

  it("the Base gate on statsOf numbers: PF ≥ min, net > 0, enough trades, drawdown ÷ net (both %) ≤ DDR", () => {
    const r = rng(41);
    const both = [0, 0];
    for (let k = 0; k < 300; k++) {
      const trades = randomTrades(r, 2 + Math.floor(r() * 40)).sort((a, b) => a.exitT - b.exitT);
      const st = statsOf(trades);
      let gp = 0;
      let gl = 0;
      let net = 0;
      for (const x of trades) {
        if (x.r > 0) gp += x.r;
        else gl -= x.r;
        net += x.r;
      }
      const dd = ddRef(trades, trades[trades.length - 1].exitT);
      assert.ok(Math.abs(st.pf - profitFactor(gp, gl)) < 1e-9);
      assert.ok(Math.abs(st.net - net * 100) < 1e-9, "net in %");
      assert.ok(Math.abs(st.mdd - dd.mdd * 100) < 1e-9, "drawdown in %");
      const g = { minPf: 1.1, minTrades: 5, maxDdr: 1 };
      const want = trades.length >= 5 && net > 0 && profitFactor(gp, gl) >= 1.1 && !(dd.mdd / net > 1);
      const got = passesBase(st, g);
      assert.equal(got, want);
      both[got ? 1 : 0]++;
    }
    assert.ok(both[0] > 10 && both[1] > 10, `pass ${both[1]} / fail ${both[0]}`);
  });
});
