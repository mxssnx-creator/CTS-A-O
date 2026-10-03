// Live validation: a config is judged on its own last N closes since the desk went live — not judged below N,
// paused while its last N miss the minimum PF, back as soon as they recover; closes before the live start never count.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { liveGate } from "./live-validation.ts";
import { makeTape } from "./sim/walkforward.ts";
import type { Trade } from "./domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 1);
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const CFG = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
/** one close per hour from T0, results as given */
const tape = (rs: number[]) =>
  makeTape(
    CFG,
    "follow",
    "rsi-mom-14-20@m15",
    P,
    "normal",
    ["AAA-USDT"],
    rs.map(
      (r, i) =>
        ({
          cfg: CFG,
          sym: "AAA-USDT",
          side: 1,
          entryT: T0 + i * H,
          exitT: T0 + i * H + 30 * 60_000,
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
