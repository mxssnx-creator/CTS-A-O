import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, RangeTag, StratKind, Trade } from "../domain/types.ts";
import { defaultWalkForward, makeTape, modeGroups, selectAt, selectDurable, selectFixed } from "./walkforward.ts";

const H = 3_600_000, now = 400 * H, ind = "ema-21-55@m15";
function tape(k: number, kind: StratKind, tag?: RangeTag, lose = false) {
  const cfg = `follow|${ind}|tp${k}|sl1|tr0|h32${tag ? `|${tag}` : ""}${kind === "exit" ? "|hxL0" : ""}`;
  const p: Protect = { tp: 0.01 * k, sl: 0.01, trail: kind === "trailing" ? 0.003 : 0,
    hold: 32, ...(tag ? { tag } : {}),
    ...(kind === "exit" ? { exitType: "historic", exitSide: 1, exitSet: "static-sl" } : {}) };
  const trades: Trade[] = Array.from({ length: 80 }, (_, i) => {
    const r = lose || i % 10 === 0 ? -0.005 : 0.02;
    return { cfg, sym: "A", side: 1, entryT: now - (162 - i * 2) * H, exitT: now - (161 - i * 2) * H,
      entry: 100, exit: 100 * (1 + r), r, unitR: r, reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0, kind };
  });
  return makeTape(cfg, "follow", ind, p, kind, ["A"], trades, [], []);
}
const defaults = defaultWalkForward(DEFAULT_SETTINGS);
const options = { ...defaults, seatPer: "pair" as const, rangeSeats: false, familySeats: false,
  longH: 336, preH: 6, validLastN: 0, lastN: 0, preGate: false, durableFrac: 0, robustFrac: 0.75,
  portfolio: 0, rangeGate: undefined, familyNeedsBase: false, ladderNeedsBase: false,
  gates: { ...defaults.gates, minTrades: 3, minGreen: 0, maxDdr: 0, maxDdtH: 1000, stableBlocks: 0, lossPrior: false },
  toggles: { ...defaults.toggles, normal: true, trailing: true, exit: true, axis: true, block: false, blockActive: false },
};

test("legacy pair selection preserves each range/type and each Historic Exit config in every selection mode", () => {
  const normalShort = tape(1, "normal", "sh"), normalMinimal = tape(2, "normal", "mn");
  const trailingShort = tape(3, "trailing", "sh"), axisShort = tape(4, "axis", "sh");
  const exitOne = tape(5, "exit"), exitTwo = tape(6, "exit"), losingExit = tape(7, "exit", undefined, true);
  const all = [normalShort, normalMinimal, trailingShort, axisShort, exitOne, exitTwo, losingExit];
  for (const [name, select] of Object.entries({
    fixed: () => selectFixed(all, now, options),
    hourly: () => selectAt(all, now, options),
    durable: () => selectDurable(all, now, options, new Set()),
  })) {
    const ids = select().picks.map((p) => p.id);
    for (const tp of [normalShort, normalMinimal, trailingShort, axisShort, exitOne, exitTwo])
      assert.ok(ids.includes(tp.id), `${name} lost independent ${tp.id}`);
    assert.ok(!ids.includes(losingExit.id), `${name} admitted a losing Exit`);
  }
  const groups = modeGroups(all, { ...options, mode: "fixed", rangeOpts: { sh: { mode: "durable" } } });
  assert.ok(groups?.some((g) => g.mode === "durable" && g.tapes.includes(normalShort)));
  assert.ok(groups?.some((g) => g.mode === "fixed" && g.tapes.includes(exitOne)));
});

test("opt-in family comparison only uses a Normal base from the same economic range", () => {
  const shortBase = tape(1, "normal", "sh"), minimalBase = tape(2, "normal", "mn"), minimalAxis = tape(3, "axis", "mn");
  const own = { ...options, familySeats: true, familyNeedsBase: true, robustFrac: 0 };
  for (const [name, select] of Object.entries({
    fixed: (xs: ReturnType<typeof tape>[]) => selectFixed(xs, now, own),
    hourly: (xs: ReturnType<typeof tape>[]) => selectAt(xs, now, own),
    durable: (xs: ReturnType<typeof tape>[]) => selectDurable(xs, now, own, new Set()),
  })) {
    assert.ok(!select([shortBase, minimalAxis]).picks.some((p) => p.id === minimalAxis.id),
      `${name}: a Short base cannot satisfy a Minimal comparison`);
    assert.ok(select([shortBase, minimalBase, minimalAxis]).picks.some((p) => p.id === minimalAxis.id),
      `${name}: a matching Minimal base satisfies the comparison`);
  }
});
