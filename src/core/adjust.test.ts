import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adjustProtect, evaluateAdjust, pausedSets, setKeyOf, DEFAULT_ADJUST, type AdjustState } from "./adjust.ts";
import { execDecision } from "./sim/walkforward.ts";
import { parseFill } from "./server/live.server.ts";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";

const A = {
  ...DEFAULT_ADJUST,
  window: 5,
  slStep: 0.002,
  slMax: 0.016,
  trailStep: 0.001,
  trailMax: 0.008,
  pauseH: 12,
};
const base = { minSl: 0.01, minTrail: 0.006 };
const cfg = "follow|rsi-mom-14-25|tp5|sl5|tr2.5|h24"; // trailing
const mk = (rs: number[], t0 = 0) =>
  rs.map((r, i) => ({ cfg, r, exitT: t0 + (i + 1) * 3_600_000 }));

describe("auto-adjust", () => {
  it("keys sets by bot | indication | sub-strategy", () => {
    assert.equal(setKeyOf(cfg), "follow|rsi-mom-14-25|trailing");
    assert.equal(setKeyOf("pivot|cci-40-200@x4|tp5|sl5|tr0|h24|axis"), "pivot|cci-40-200@x4|axis");
    assert.equal(setKeyOf("pivot|x|tp5|sl5|tr0|h24"), "pivot|x|normal");
  });

  it("widens SL / trail after a losing window, pauses at the caps, steps back on recovery", () => {
    let st = {};
    let t = 0;
    const lose = [-0.01, -0.01, 0.005, -0.01, 0.004];
    for (let i = 0; i < 3; i++) {
      const r = evaluateAdjust(st, mk(lose, (t += 10) * 3_600_000), A, base, 0);
      st = r.state;
    }
    const s1 = (
      st as Record<string, { level: number; minSl: number; minTrail: number; pausedUntil: number }>
    )["follow|rsi-mom-14-25|trailing"];
    assert.equal(s1.level, 3);
    assert.ok(Math.abs(s1.minSl - 0.016) < 1e-12);
    assert.ok(Math.abs(s1.minTrail - 0.008) < 1e-12);
    assert.equal(s1.pausedUntil, 0);
    const r = evaluateAdjust(st, mk(lose, (t += 10) * 3_600_000), A, base, 0, 1_000);
    assert.ok(r.state["follow|rsi-mom-14-25|trailing"].pausedUntil > 1_000, "paused at the caps");
    assert.ok(pausedSets(r.state, 2_000).has("follow|rsi-mom-14-25|trailing"));
    const win = [0.02, 0.02, -0.005, 0.02, 0.02];
    const back = evaluateAdjust(r.state, mk(win, (t += 10) * 3_600_000), A, base, 0).state[
      "follow|rsi-mom-14-25|trailing"
    ];
    assert.equal(back.level, 2);
  });

  it("never steps twice on the same positions, and needs a full window", () => {
    const one = evaluateAdjust({}, mk([-0.01, -0.01, -0.01, -0.01, -0.01]), A, base, 0);
    const again = evaluateAdjust(one.state, mk([-0.01, -0.01, -0.01, -0.01, -0.01]), A, base, 0);
    assert.deepEqual(again.changed, []);
    assert.deepEqual(evaluateAdjust({}, mk([-0.01, -0.01]), A, base, 0).changed, []);
  });

  it("relative steps widen a set's own stop and trail, beyond the absolute minimum, up to scaleMax", () => {
    // x02, 7 Oct: stops of 1.6–6.4 % sat above the 1.2–1.4 % floors of levels 1–4 — nothing the set traded changed
    const R = { ...A, slScale: 0.25, trailScale: 0.5, scaleMax: 2 };
    const lose = [-0.01, -0.01, 0.005, -0.01, 0.004];
    let st: AdjustState = {};
    for (let i = 0; i < 2; i++) st = evaluateAdjust(st, mk(lose, (i + 1) * 10 * 3_600_000), R, base, 0).state;
    const s = st["follow|rsi-mom-14-25|trailing"];
    assert.equal(s.level, 2);
    assert.equal(s.slMult, 1.5);
    assert.equal(s.trailMult, 2, "capped at scaleMax");
    const p = adjustProtect({ tp: 0.05, sl: 0.036, trail: 0.02, hold: 24 }, { minSl: 0.014, minTrail: 0.008, slMult: 1.5, trailMult: 2 });
    assert.deepEqual(p, { tp: 0.05, sl: 0.054, trail: 0.04, hold: 24 }, "own distances × the step, target kept");
    // the absolute floor still wins for a set whose own stop is tight
    assert.equal(adjustProtect({ tp: 0.05, sl: 0.004, trail: 0, hold: 24 }, { minSl: 0.012, minTrail: 0.006, slMult: 1.5 }).sl, 0.012);
    // an ATR protect: the stop's ATR multiple widens, the target stays (ratio ÷ the step)
    const atr = adjustProtect({ tp: 0, sl: 0, trail: 0, hold: 24, atr: { sl: 1, tpRatio: 2 } }, { minSl: 0.01, minTrail: 0.006, slMult: 1.25 });
    assert.deepEqual(atr.atr, { sl: 1.25, tpRatio: 1.6, minSl: 0.01 });
    // without the scales nothing changes (the default)
    const plain = evaluateAdjust({}, mk(lose, 10 * 3_600_000), A, base, 0).state["follow|rsi-mom-14-25|trailing"];
    assert.equal(plain.slMult, undefined);
    assert.equal(plain.trailMult, undefined);
  });

  it("stepEvery: after a step, a set waits for that many new closes before the next one", () => {
    const R = { ...A, stepEvery: 3 };
    const lose = [-0.01, -0.01, -0.01, -0.01, -0.01];
    const one = evaluateAdjust({}, mk(lose), R, base, 0).state;
    assert.equal(one["follow|rsi-mom-14-25|trailing"].level, 1);
    // one and two new losing closes: the window still holds the closes that moved it — no second step yet
    const two = evaluateAdjust(one, mk([...lose, -0.01]), R, base, 0);
    assert.deepEqual(two.changed, []);
    assert.match(two.state["follow|rsi-mom-14-25|trailing"].note, /1 of 3 new closes/);
    const three = evaluateAdjust(two.state, mk([...lose, -0.01, -0.01]), R, base, 0);
    assert.deepEqual(three.changed, []);
    // the third new close: the next step
    const four = evaluateAdjust(three.state, mk([...lose, -0.01, -0.01, -0.01]), R, base, 0);
    assert.equal(four.state["follow|rsi-mom-14-25|trailing"].level, 2);
  });

  it("the measured live cost excess turns a marginal set into an adjusted one", () => {
    const marginal = mk([0.004, -0.003, 0.004, -0.003, 0.004]);
    assert.deepEqual(evaluateAdjust({}, marginal, A, base, 0).changed, []);
    assert.deepEqual(evaluateAdjust({}, marginal, A, base, 0.003).changed, [
      "follow|rsi-mom-14-25|trailing",
    ]);
  });

  it("adjusted protects and paused sets reach tapes and execution", () => {
    const p = adjustProtect(
      { tp: 0.05, sl: 0.008, trail: 0.004, hold: 24 },
      { minSl: 0.012, minTrail: 0.006 },
    );
    assert.deepEqual(p, { tp: 0.05, sl: 0.012, trail: 0.006, hold: 24 });
    assert.equal(
      adjustProtect({ tp: 0.05, sl: 0.02, trail: 0, hold: 24 }, { minSl: 0.012, minTrail: 0.006 })
        .trail,
      0,
      "no trail stays no trail",
    );
    const tape = {
      id: cfg,
      kind: "trailing",
      n: 0,
      exitT: new Float64Array(0),
      gp: new Float64Array(1),
      gl: new Float64Array(1),
    } as never;
    const o = {
      toggles: {
        normal: true,
        trailing: true,
        block: false,
        blockActive: false,
        dca: false,
        dcaActive: false,
        axis: false,
      },
      lastN: 0,
      lastNMinPf: 1,
      block: { ratio: 0.2, maxLevel: 6, minActiveLevel: 1, maxMult: 2.5 },
      paused: new Set(["follow|rsi-mom-14-25|trailing"]),
    } as never;
    assert.deepEqual(execDecision(tape, 0, o), { ok: false, why: "adjustPause" });
  });

  it("reads fills and measures the live round-trip cost (fees + adverse slippage)", () => {
    assert.deepEqual(parseFill({ order: { avgPrice: "101.5", commission: "-0.05" } }), {
      px: 101.5,
      fee: 0.05,
      qty: 0, // no executed quantity in the reply: the caller keeps what it sent
    });
    assert.deepEqual(parseFill({ order: { avgPrice: "101.5", commission: "-0.05", executedQty: "2" } }), {
      px: 101.5,
      fee: 0.05,
      qty: 2,
    });
    assert.equal(parseFill({ order: {} }), null);
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 2 }, { market: "synthetic" });
    assert.equal(rt.liveCost(), null, "not enough fills");
    for (let i = 0; i < 40; i++) {
      // long entry filled 0.05 % above the reference, exit 0.05 % below; fee 0.05 % of notional each
      rt.db.run(
        "INSERT INTO live_fills (coid, sym, side, kind, qty, ref_px, fill_px, fee, at) VALUES (?, 'X', 1, ?, 1, 100, ?, ?, ?)",
        `c${i}`,
        i % 2 ? "X" : "O",
        i % 2 ? 99.95 : 100.05,
        (i % 2 ? 99.95 : 100.05) * 0.0005,
        i,
      );
    }
    const lc = rt.liveCost()!;
    assert.ok(Math.abs(lc.rt - 0.002) < 2e-5, `rt ${lc.rt}`);
  });
});
