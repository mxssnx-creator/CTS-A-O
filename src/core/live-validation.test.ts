// Live validation: a config is judged on its own last N closes since the desk went live — not judged below N,
// paused while its last N miss the minimum PF, back as soon as they recover; closes before the live start never count.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { liveEntryOk, liveGate, liveGroupGates, liveGroupOf } from "./live-validation.ts";
import { makeTape } from "./sim/walkforward.ts";
import type { Trade } from "./domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 1);
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const CFG = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
/** one close per hour from T0 (+ `offMin` minutes), results as given */
const tape = (rs: number[], cfg = CFG, offMin = 0) =>
  makeTape(
    cfg,
    "follow",
    cfg.split("|")[1],
    P,
    "normal",
    ["AAA-USDT"],
    rs.map(
      (r, i) =>
        ({
          cfg,
          sym: "AAA-USDT",
          side: 1,
          entryT: T0 + i * H,
          exitT: T0 + i * H + (30 + offMin) * 60_000,
          entry: 100,
          exit: 100 * (1 + r),
          r,
          reason: r > 0 ? "tp" : "sl",
          bars: 2,
          mfe: 0,
          mae: 0,
          kind: "normal",
        }) as Trade,
    ),
    [],
    [],
  );
const now = T0 + 100 * H;

describe("live validation (live last N)", () => {
  it("below N live closes: not judged, the simulated validation decides", () => {
    const g = liveGate(tape(Array(10).fill(-0.01)), T0, now, 20, 1.05);
    assert.deepEqual(g, { ok: true, n: 10, pf: null });
  });

  it("N live closes: opens while their PF clears the minimum, paused below it", () => {
    const good = liveGate(tape([...Array(14).fill(0.01), ...Array(6).fill(-0.01)]), T0, now, 20, 1.05);
    assert.equal(good.ok, true);
    assert.ok(Math.abs((good.pf ?? 0) - 14 / 6) < 1e-9);
    const bad = liveGate(tape([...Array(8).fill(0.01), ...Array(12).fill(-0.01)]), T0, now, 20, 1.05);
    assert.equal(bad.ok, false);
  });

  it("only the last N count, so a paused config comes back when its live closes recover", () => {
    const rs = [...Array(20).fill(-0.01), ...Array(20).fill(0.01)];
    assert.equal(liveGate(tape(rs), T0, T0 + 20 * H, 20, 1.05).ok, false, "paused after 20 losses");
    assert.equal(liveGate(tape(rs), T0, now, 20, 1.05).ok, true, "back after 20 wins");
  });

  it("closes before the live start never count", () => {
    const rs = [...Array(30).fill(-0.01), ...Array(5).fill(0.01)];
    // live since hour 30: only 5 live closes — not judged
    assert.deepEqual(liveGate(tape(rs), T0 + 30 * H, now, 20, 1.05), { ok: true, n: 5, pf: null });
    // off at 0
    assert.equal(liveGate(tape(rs), T0, now, 0, 1.05).ok, true);
  });
});

describe("group live validation (range / signals, pooled last N)", () => {
  const LONG_A = "follow|rsi-mom-14-20@m15|lg|tp1|sl1|tr0|h32";
  const LONG_B = "follow|ema-cross-9-21@m5|lg|tp2|sl1|tr0|h32";
  const SHORT_A = "follow|rsi-mom-14-20@m15|sh|tp1|sl1|tr0|h32";
  const SIG = "follow|sig-ema-cross-s@m5|tp1|sl1|tr0|h32";

  it("groups: signals apart, engine configs by their range tag, Wide without one", () => {
    assert.equal(liveGroupOf(LONG_A), "Long");
    assert.equal(liveGroupOf(SHORT_A), "Short");
    assert.equal(liveGroupOf(SIG), "Signals");
    assert.equal(liveGroupOf(CFG), "Wide");
  });

  it("pools the configs of a group: judged at N pooled closes although no config has N of its own", () => {
    // two Long configs with 6 closes each (12 pooled), one Short config with 6
    const tapes = [
      tape([0.01, 0.01, 0.01, 0.01, 0.01, -0.01], LONG_A),
      tape([0.01, 0.01, 0.01, 0.01, 0.01, -0.01], LONG_B, 5),
      tape([-0.01, -0.01, -0.01, -0.01, -0.01, 0.01], SHORT_A),
    ];
    const g = liveGroupGates(tapes, T0, now, 10, 1.05);
    const long = g.get("Long")!;
    assert.equal(long.n, 10);
    assert.equal(long.ok, true);
    // the 10 latest of 12 pooled: the two earliest (both wins at hour 0) drop out → 8 wins, 2 losses
    assert.ok(Math.abs((long.pf ?? 0) - 8 / 2) < 1e-9, `pf ${long.pf}`);
    assert.deepEqual(g.get("Short"), { ok: true, n: 6, pf: null }, "6 < 10: not judged");
    assert.equal(liveGroupGates(tapes, T0, now, 6, 1.05).get("Short")!.ok, false, "judged at 6: losing");
  });

  it("each group can be held to its own floor (a range's minimum PF)", () => {
    // Long: 8 wins / 2 losses in the last 10 → PF 4
    const tapes = [
      tape([0.01, 0.01, 0.01, 0.01, 0.01, -0.01], LONG_A),
      tape([0.01, 0.01, 0.01, 0.01, 0.01, -0.01], LONG_B, 5),
    ];
    assert.equal(liveGroupGates(tapes, T0, now, 10, (g) => (g === "Long" ? 3 : 1.05)).get("Long")!.ok, true);
    assert.equal(liveGroupGates(tapes, T0, now, 10, (g) => (g === "Long" ? 5 : 1.05)).get("Long")!.ok, false);
  });

  it("only closes since the live start and up to now count", () => {
    const tapes = [tape([-0.01, -0.01, -0.01, 0.01, 0.01, 0.01], LONG_A)];
    assert.equal(liveGroupGates(tapes, T0 + 3 * H, now, 3, 1.05).get("Long")!.ok, true, "the 3 losses before the start");
    assert.equal(liveGroupGates(tapes, T0, T0 + 3 * H, 3, 1.05).get("Long")!.ok, false, "the 3 wins after now");
    assert.equal(liveGroupGates(tapes, T0, now, 0, 1.05).size, 0, "off at 0");
  });

  it("a config's own last N win over its group; before them its group decides", () => {
    const judgedOk = { ok: true, n: 25, pf: 1.4 };
    const judgedBad = { ok: false, n: 25, pf: 0.7 };
    const notJudged = { ok: true, n: 3, pf: null };
    const groupBad = { ok: false, n: 100, pf: 0.6 };
    const groupOk = { ok: true, n: 100, pf: 1.3 };
    assert.equal(liveEntryOk(judgedOk, groupBad), true, "an earning config in a losing group trades");
    assert.equal(liveEntryOk(judgedBad, groupOk), false, "a losing config in an earning group is paused");
    assert.equal(liveEntryOk(notJudged, groupBad), false, "unjudged config in a losing group: paused");
    assert.equal(liveEntryOk(notJudged, groupOk), true);
    assert.equal(liveEntryOk(notJudged, { ok: true, n: 40, pf: null }), true, "group not judged yet");
    assert.equal(liveEntryOk(notJudged, undefined), true);
  });
});
