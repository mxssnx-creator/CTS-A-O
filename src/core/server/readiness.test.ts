// The live readiness check judges what the desk sends: a desk that sends Signals only is held to the Signals' own
// simulated run, not to engine ranges it never trades (x01, 7 Oct: whole run PF 0.73, its Signals 1.58 — the desk
// opened nothing). The subset uses the run's own measures: closed orders and the ones open at the end marked to
// market, the closed ones per 8-hour block for stability.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { liveReadiness } from "./live.server.ts";
import { defaultWalkForward, makeTape, runSubset, walkForward, type WalkForwardOptions } from "../sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 6, 4);
const END = T0 + 24 * H;
const MIN_PF = 1.05;
const SIG = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32";
const ENG_LG = "sweep|trend-adx@m15c|tp6|sl4.5|tr0|h64|lg";
const ENG_WIDE = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";

const mk = (cfg: string, r: number, exitT: number, open = false): Trade =>
  ({
    cfg,
    sym: "AAA-USDT",
    side: 1,
    entryT: exitT - 30 * 60_000,
    exitT,
    entry: 100,
    exit: 100 * (1 + r),
    r,
    reason: r > 0 ? "tp" : "sl",
    bars: 2,
    mfe: 0,
    mae: 0,
    kind: "normal",
    ...(open ? { markedOpen: true } : {}),
  }) as Trade;

/** `n` closes of `cfg` spread evenly over the 24 h run: every `loseEvery`-th a loser of `-lose`, the rest `+win`. */
function closes(cfg: string, n: number, win: number, lose: number, loseEvery: number): Trade[] {
  return Array.from({ length: n }, (_, i) =>
    mk(cfg, i % loseEvery === 0 ? -lose : win, T0 + Math.round(((i + 0.5) / n) * 24 * H)),
  );
}

/** A run as the runtime holds it: its own stats and stability are the measures over every order. */
function run(trades: Trade[], openAtEnd: Trade[] = []) {
  trades.sort((a, b) => a.exitT - b.exitT);
  const r = { startT: T0, endT: END, trades, openAtEnd };
  const all = runSubset(r, () => true, MIN_PF);
  return { ...r, stats: all.stats, stable: all.stable };
}

// engine ranges losing (Long and the untagged Wide grid), Signals winning — the whole run under 1
const engine = [...closes(ENG_LG, 60, 0.004, 0.012, 2), ...closes(ENG_WIDE, 60, 0.004, 0.012, 2)];
const signals = closes(SIG, 60, 0.006, 0.01, 4);

describe("live readiness: judged on what the desk sends", () => {
  it("a losing engine and winning Signals: not ready for the whole system, ready for a Signals-only desk", () => {
    const sim = run([...engine, ...signals]);
    assert.ok(sim.stats.pf < MIN_PF, `whole run PF ${sim.stats.pf}`);
    const all = liveReadiness(sim, {}, MIN_PF);
    assert.equal(all.ok, false);
    assert.match(all.why, /^simulated run PF 0\.\d\d \(min 1\.05\)/);
    const sig = liveReadiness(sim, { source: "signals" }, MIN_PF);
    assert.deepEqual(sig, { ok: true, why: "" });
    const eng = liveReadiness(sim, { source: "engine" }, MIN_PF);
    assert.equal(eng.ok, false);
    assert.match(eng.why, /of what this desk sends \(engine: 120 orders\) PF 0\.\d\d/);
  });

  it("excluded ranges leave the check too — Wide is the untagged grid, never the Signals", () => {
    const sim = run([...engine, ...signals]);
    assert.equal(liveReadiness(sim, { excludeRanges: ["lg"] }, MIN_PF).ok, false);
    const r = liveReadiness(sim, { excludeRanges: ["lg", "wide"] }, MIN_PF);
    assert.deepEqual(r, { ok: true, why: "" });
    // only Signals left: the same as source "signals"
    const sub = runSubset(sim, (t) => t.cfg === SIG, MIN_PF);
    assert.ok(sub.stable && sub.stats.pf >= MIN_PF);
  });

  it("orders still open at the end count, marked to market", () => {
    const sim = run([...engine, ...signals], [mk(SIG, -0.2, END, true)]);
    const r = liveReadiness(sim, { source: "signals" }, MIN_PF);
    assert.equal(r.ok, false);
    assert.match(r.why, /signals: 61 orders/);
  });

  it("a clearly losing 8-hour block of the Signals makes them not stable", () => {
    // the first 8 hours lose (10 losers), the rest win big: PF over the run above the minimum, one block under
    const bad = Array.from({ length: 10 }, (_, i) => mk(SIG, -0.01, T0 + (i + 1) * 40 * 60_000));
    const good = Array.from({ length: 20 }, (_, i) => mk(SIG, 0.02, T0 + 9 * H + i * 40 * 60_000));
    const sim = run([...engine, ...bad, ...good]);
    const sub = runSubset(sim, (t) => t.cfg === SIG, MIN_PF);
    assert.ok(sub.stats.pf >= MIN_PF && sub.stats.net > 0, `signals PF ${sub.stats.pf}`);
    const r = liveReadiness(sim, { source: "signals" }, MIN_PF);
    assert.equal(r.ok, false);
    assert.match(r.why, /, not stable$/);
  });

  it("the subset over every order is the run's own PF and stability (one rule, the walk-forward's)", () => {
    const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
    const NOW = T0 + 400 * H;
    const hist = Array.from({ length: 100 }, (_, i) => {
      const t = mk(SIG, i < 10 ? -0.01 : 0.01, NOW - 120 * H + i * H + 30 * 60_000);
      return t;
    });
    hist.push(mk(SIG, 0.01, NOW - 2 * H + 40 * 60_000));
    const tp = makeTape(SIG, "follow", "sig-ema-cross-s@m15", P, "normal", ["AAA-USDT"], hist, [], []);
    const o: WalkForwardOptions = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      lastN: 25,
      validLastN: 50,
      signalValidLastN: 0,
      gates: { ...defaultWalkForward(DEFAULT_SETTINGS).gates, lastNFloor: 0 },
      toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
      symGate: undefined,
      coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
      simH: 6,
      signalActive: new Set(["follow|sig-ema-cross-s@m15|AAA-USDT|1"]),
    };
    const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;
    const r = walkForward(u, [tp], o);
    assert.ok(r.trades.length + (r.openAtEnd?.length ?? 0) > 0, "the run executed the entry");
    const sub = runSubset(r, () => true, o.gates.minPf);
    assert.deepEqual(sub.stats, r.stats);
    assert.equal(sub.stable, r.stable);
  });
});
