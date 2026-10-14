// Stage consistency (operator, 13 Oct: "strategies base evals with PF, DDT and ensure consistency completely until
// execution"; "make sure calcs and ranges are correct and each is continuously processing"). One config is the same
// thing at every stage: its distances (grid → Base cell → tape → config id → order exits), its record (Base's stats =
// the tape's over the same history: n, PF, net, max drawdown, DDT), its validation (configEval = the window by hand), its
// orders (each executed order is its tape's trade, entered while the config was validated) — every range, Micro included.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, RT_COST } from "./config.ts";
import { GENERAL_RANGE, LONG_RANGE, MICRO_RANGE, MINIMAL_RANGE, SHORT_RANGE, rangeOfId } from "./minimal-coord.ts";
import { baseRangeProtects, cellStats, configId, laneProtect, makeUniverse, parseConfigId } from "./pipeline/pipeline.ts";
import { buildTapes, configEval, defaultWalkForward, protectGrid, walkForward, winDd } from "./sim/walkforward.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { statsOf } from "./metrics/stats.ts";
import { signalHistProtects } from "./signal-hist.ts";
import { signalSettings } from "./signal-config.ts";
import type { ConfigTape } from "./sim/walkforward.ts";
import type { Protect } from "./domain/types.ts";

const H = 3_600_000;
const T_END = Date.UTC(2026, 9, 1);
const grid = { ...DEFAULT_SETTINGS.grid, holdH: [16] };
const universe = () =>
  makeUniverse([
    barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3)),
    barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 1800, T_END, 5)),
    barsFromCandles("A-USDT", 5, syntheticCandles("A-USDT", 5, 3600, T_END, 7)),
    barsFromCandles("B-USDT", 5, syntheticCandles("B-USDT", 5, 3600, T_END, 11)),
  ]);
/** the tape's whole-record stats, from its own arrays */
const tapeStats = (tp: ConfigTape, nowT: number) => {
  const dd = winDd(tp, 0, tp.n, nowT);
  let gp = 0;
  let gl = 0;
  for (let i = 0; i < tp.n; i++) {
    if (tp.r[i] > 0) gp += tp.r[i];
    else gl -= tp.r[i];
  }
  return { n: tp.n, pf: gl > 1e-12 ? gp / gl : gp > 0 ? Infinity : 0, net: tp.rs[tp.n] * 100, mdd: dd.mdd * 100, ddt: dd.ddtH };
};
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

describe("stage consistency: one config, the same at every stage", () => {
  it("each range's cell, hand-computed, is the grid's, Base's and the config id's; lanes keep a range cell's distances", () => {
    const cells = protectGrid(15, grid, RT_COST);
    const has = (p: Protect) =>
      cells.some((c) => c.tag === p.tag && close(c.tp, p.tp) && close(c.sl, p.sl) && close(c.trail, p.trail) && c.hold === p.hold);
    const hold = (16 * 60) / 15;
    // Minimal: 4× cost = 0.8 %, stop 1.5× = 1.2 %, trail ¼ = 0.2 % under its 0.3 % trail floor
    const mn: Protect = { tp: 0.008, sl: 0.012, trail: 0.003, hold, tag: "mn" };
    // Short: 9× = 1.8 %, stop 1× = 1.8 %, trail ½ = 0.9 %
    const sh: Protect = { tp: 0.018, sl: 0.018, trail: 0.009, hold, tag: "sh" };
    // General: 15× = 3 %, stop 0.25× = 0.75 % under its 1 % floor, trail ¼ = 0.75 %
    const gn: Protect = { tp: 0.03, sl: 0.01, trail: 0.0075, hold, tag: "gn" };
    // Long: 23× = 4.6 %, stop 0.25× = 1.15 % under its 1.6 % floor, trail ¾ = 3.45 %
    const lg: Protect = { tp: 0.046, sl: 0.016, trail: 0.0345, hold, tag: "lg" };
    // Micro (2–5× cost): net 0.2 % + 0.2 % cost = 0.4 % price target (2× cost), stop 1× = 0.4 % on its 0.4 % net floor,
    // trail ¼ = 0.1 % on its 0.1 % trail floor
    const mc: Protect = { tp: 0.004, sl: 0.004, trail: 0.001, hold, tag: "mc" };
    for (const p of [mn, sh, gn, lg, mc]) assert.ok(has(p), `${p.tag} ${JSON.stringify(p)} in the grid`);
    // the floors used above are the ranges' own
    assert.deepEqual(
      [MINIMAL_RANGE.minTrail, SHORT_RANGE.minSl, GENERAL_RANGE.minSl, LONG_RANGE.minSl, MICRO_RANGE.minSlNet, MICRO_RANGE.minTrail],
      [0.003, 0.006, 0.01, 0.016, 0.002, 0.001],
    );
    // Base's plain cells are the grid's plain cells (same rounding): Minimal 0.8 % at 1.5×, Micro 0.4 % at 1×
    const base = baseRangeProtects(grid, RT_COST);
    for (const p of [{ ...mn, trail: 0 }, { ...mc, trail: 0 }])
      assert.ok(base.some((c) => c.tag === p.tag && close(c.tp, p.tp) && close(c.sl, p.sl) && c.trail === 0), `Base ${p.tag}`);
    for (const c of base.filter((x) => x.trail === 0)) assert.ok(has({ ...c, hold }), `Base cell ${JSON.stringify(c)} is a grid cell`);
    // the config id carries exactly the distances; on a 5m lane a range cell keeps them (hold in the lane's bars)
    for (const p of [mn, sh, gn, lg, mc]) {
      const ind = p.tag === "mc" ? "mc-rsi2-5@m5" : "rsi-mom-14-20@m5";
      const lp = laneProtect(p, ind);
      assert.deepEqual([lp.tp, lp.sl, lp.trail, lp.hold], [p.tp, p.sl, p.trail, (hold * 15) / 5]);
      const back = parseConfigId(configId("follow", ind, lp))!.protect;
      assert.ok(close(back.tp, lp.tp) && close(back.sl, lp.sl) && close(back.trail, lp.trail) && back.hold === lp.hold, p.tag);
      assert.equal(back.tag, p.tag);
    }
    // an untagged (signal / Wide) cell scales with √(tf / 15m) on another lane
    const sig: Protect = { tp: 0.03, sl: 0.09, trail: 0.012, hold: 192 };
    const s30 = laneProtect(sig, "sig-ema-cross-s@m30");
    assert.ok(close(s30.tp, +(0.03 * Math.SQRT2).toFixed(4)) && s30.hold === 96);
  });

  it("Base's cell stats are the tape's record of the same cell: n, PF, net, max drawdown, DDT (every range, a signal's historic config)", () => {
    const u = universe();
    const cases: Array<[string, string, Protect[]]> = [
      ["follow", "rsi-mom-14-20@m15", baseRangeProtects(grid, RT_COST).filter((p) => p.tag !== "mc").filter((_, i) => i % 9 === 0)],
      ["follow", "mc-rsi2-5@m5", baseRangeProtects(grid, RT_COST).filter((p) => p.tag === "mc").filter((_, i) => i % 5 === 0)],
      ["follow", "tactic-trend-s@m15", [{ tp: 0.008, sl: 0.012, trail: 0, hold: 64, tag: "mn" }]],
      ["follow", "tactic-mean-reversion-m@m5", [{ tp: 0.018, sl: 0.018, trail: 0.009, hold: 64, tag: "sh" }]],
    ];
    // a signal pair with its historic trailing configs (the Base calc is the same simulation)
    const sigPair = "follow|sig-ema-cross-s@m15";
    const hist = signalHistProtects(u, [sigPair], signalSettings({ enabled: true, hist: { ...signalSettings({}).hist, minN: 5 } }), null, u.nowT)[sigPair] ?? [];
    assert.ok(hist.length > 0, "the signal has historic configs");
    cases.push(["follow", "sig-ema-cross-s@m15", hist.slice(0, 4)]);
    let compared = 0;
    for (const [bot, ind, ps] of cases)
      for (const p of ps) {
        const base = cellStats(u, bot as "follow", ind, p, RT_COST, null);
        if (ind.startsWith("tactic-")) assert.ok(base && base.n > 0, `${ind}: nonempty Tactic accounting fixture`);
        const tapes = buildTapes(u, [p], RT_COST, undefined, new Set([`${bot}|${ind}`]), null, undefined, {
          minSl: 0,
          minTrail: 0,
          rangeMinN: 0,
        }).filter((t) => t.kind === "normal" || t.kind === "trailing");
        if (!base || !base.n) continue;
        assert.equal(tapes.length, 1, `${bot}|${ind} ${JSON.stringify(p)}: one tape`);
        const t = tapeStats(tapes[0], u.nowT);
        assert.equal(t.n, base.n, `${ind} n`);
        assert.ok(close(t.net, base.net, 1e-7), `${ind} net ${t.net} vs ${base.net}`);
        assert.ok(t.pf === base.pf || close(t.pf, base.pf, 1e-7), `${ind} PF ${t.pf} vs ${base.pf}`);
        assert.ok(close(t.mdd, base.mdd, 1e-7), `${ind} max drawdown ${t.mdd} vs ${base.mdd}`);
        // DDT: the validation's winDd and Base's statsOf are one definition
        const trades = Array.from({ length: tapes[0].n }, (_, i) => ({ entryT: tapes[0].entryT[i], exitT: tapes[0].exitT[i], r: tapes[0].r[i] }));
        assert.ok(close(t.ddt, statsOf(trades, u.nowT).ddt, 1e-9), `${ind} DDT`);
        compared++;
      }
    assert.ok(compared >= 10, `${compared} cells compared`);
  });

  it("the validation reads the window by hand: closes, net and PF over the lookback before t", () => {
    const u = universe();
    const tapes = buildTapes(u, protectGrid(15, grid, RT_COST).filter((_, i) => i % 40 === 0), RT_COST, undefined, new Set(["follow|rsi-mom-14-20@m15", "follow|mc-rsi2-5@m5"]), null, undefined, { minSl: 0, minTrail: 0, rangeMinN: 0 });
    const o = defaultWalkForward(DEFAULT_SETTINGS);
    const t = Math.floor((u.nowT - 24 * H) / H) * H;
    const look = Math.max(o.longH, o.preH) * H;
    let checked = 0;
    for (const tp of tapes) {
      let n = 0;
      let gp = 0;
      let gl = 0;
      let net = 0;
      for (let i = 0; i < tp.n; i++)
        if (tp.exitT[i] >= t - look && tp.exitT[i] < t) {
          n++;
          net += tp.r[i] * 100;
          if (tp.r[i] > 0) gp += tp.r[i];
          else gl -= tp.r[i];
        }
      const ev = configEval(tp, t, o);
      assert.equal(ev.n, n, tp.id);
      assert.ok(close(ev.net, net, 1e-7), `${tp.id} net`);
      if (gl > 1e-12) assert.ok(close(ev.pf, gp / gl, 1e-7), `${tp.id} PF`);
      checked++;
    }
    assert.ok(checked >= 5);
  });

  it("every executed order is its tape's trade, entered while its config was validated; each step's range record adds up", () => {
    const u = universe();
    const tapes = buildTapes(u, protectGrid(15, grid, RT_COST).filter((_, i) => i % 6 === 0), RT_COST, undefined, new Set(["follow|rsi-mom-14-20@m15", "revert|z-50-2.5@m15", "follow|mc-rsi2-5@m5"]), null, undefined, { minSl: 0, minTrail: 0, rangeMinN: 0 });
    const o = {
      ...defaultWalkForward({ ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.0, minTrades: 3, maxDdr: 0 } }),
      // the record gates judge results; this checks the bookkeeping, so they let the configs through
      validLastN: 0,
      lastN: 0,
      symGate: "off" as const,
      rangeGate: undefined,
    };
    const sim = walkForward(u, tapes, o);
    assert.ok(sim.trades.length > 0, "orders executed");
    const byId = new Map(tapes.map((t) => [t.id, t]));
    const stepOf = (e: number) => {
      let at = sim.steps[0];
      for (const s of sim.steps) if (s.t <= e) at = s;
      return at;
    };
    for (const x of sim.trades) {
      const tp = byId.get(x.cfg);
      assert.ok(tp, `${x.cfg}: an executed order has its tape`);
      let found = false;
      for (let i = 0; i < tp.n && !found; i++)
        found =
          tp.entryT[i] === x.entryT && tp.exitT[i] === x.exitT && tp.syms[tp.symI[i]] === x.sym && tp.side[i] === x.side && close(tp.r[i], x.r / (x.mult ?? 1), 1e-9);
      assert.ok(found, `${x.cfg} ${x.sym} @ ${x.entryT}: the tape's own trade`);
      assert.ok(stepOf(x.entryT).real.includes(x.cfg), `${x.cfg}: validated at the step it entered in`);
    }
    // every step: the per-range record sums to the step's own counts; every range with tapes is in every step
    const ranges = new Set(tapes.map((t) => rangeOfId(t.id)));
    for (const s of sim.steps) {
      const br = s.byRange!;
      for (const r of ranges) assert.ok(br[r] && br[r].tapes > 0, `step ${s.t}: range ${r || "wide"} processed`);
      assert.equal(Object.values(br).reduce((a, v) => a + v.taken, 0), s.taken);
      assert.equal(Object.values(br).reduce((a, v) => a + v.validated, 0), s.real.length);
    }
    assert.equal(sim.steps.reduce((a, s) => a + s.taken, 0), sim.trades.length + (sim.openAtEnd?.length ?? 0));
    // every skip is tallied with its candidate's result
    const skipped = Object.values(sim.skips).reduce((a, v) => a + v, 0);
    assert.equal(Object.values(sim.skipPf ?? {}).reduce((a, v) => a + v.n, 0), skipped);
  });
});
