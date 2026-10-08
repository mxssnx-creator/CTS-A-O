// D8: the signal validation (validateH) judges the latest validateH hours of the ranking window, and nothing outside
// it. A validateH beyond the ranking window (max(longH, preH)) judges the whole window, exactly as validateH = window;
// results before the window never count, however large validateH is. The settings clamp keeps validateH in 2–72.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeSignalsAt, makeTape, signalIndex } from "./walkforward.ts";
import { signalSettings } from "../signal-config.ts";
import { sigActiveKey } from "../signals.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const NOW = 100 * H; // buckets below hour 100 are closed at NOW
const WINDOW = 48; // the ranking window (max(longH, preH)): hours 52..99

// one long config on one symbol; hourly closes: 0..51 lose hard (outside the window), 52..75 win (older part of the
// window, net +48), 76..99 lose (latest 24 h, net -24): the whole window is positive, its latest 24 h are not
const trades: Trade[] = [];
const close = (h: number, r: number) =>
  trades.push({
    cfg: "follow|sig-a|x",
    sym: "A",
    side: 1,
    entryT: h * H,
    exitT: h * H + 1000,
    entry: 1,
    exit: 1,
    r,
    reason: r > 0 ? "tp" : "sl",
    bars: 1,
    mfe: 0,
    mae: 0,
  } as Trade);
for (let h = 0; h < 52; h++) close(h, -0.5);
for (let h = 52; h < 76; h++) close(h, 0.02);
for (let h = 76; h < 100; h++) close(h, -0.01);

const tp = makeTape("follow|sig-a|x", "follow", "sig-a", { tp: 0.01, sl: 0.01, trail: 0, hold: 4 }, "normal", ["A"], trades, [], []);
const idx = signalIndex([tp]);
const key = sigActiveKey("follow", "sig-a", "A", 1);
const sigWith = (validateH: number) => ({
  ...signalSettings(undefined),
  count: 0,
  minTrades: 1,
  rank: "drawdown" as const,
  minBlockShare: 0,
  validate: true,
  validateH,
});

describe("signal validation window (D8)", () => {
  it("the recent validation judges the latest validateH hours of the ranking window", () => {
    // the latest 24 h lost: not active
    assert.ok(!activeSignalsAt(idx, NOW, sigWith(24), WINDOW).has(key), "validateH 24 sees only the losing latest 24 h");
    // the latest 48 h (the whole window) net positive: active
    assert.ok(activeSignalsAt(idx, NOW, sigWith(48), WINDOW).has(key), "validateH 48 covers the window: net +24");
  });

  it("validateH beyond the ranking window judges the window only, like validateH = window", () => {
    const beyond = activeSignalsAt(idx, NOW, sigWith(72), WINDOW);
    const atWindow = activeSignalsAt(idx, NOW, sigWith(WINDOW), WINDOW);
    assert.deepEqual([...beyond].sort(), [...atWindow].sort());
    // the hard losses before the window (hours 0..51) never reach the recent validation
    assert.ok(beyond.has(key), "results before the ranking window do not count");
  });

  it("validateH is clamped to 2–72 (the documented range)", () => {
    assert.equal(signalSettings({ validateH: 500 }).validateH, 72);
    assert.equal(signalSettings({ validateH: 1 }).validateH, 2);
    assert.equal(signalSettings({ validateH: 24 }).validateH, 24);
  });
});
