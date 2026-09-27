import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  blockLevel,
  defaultWalkForward,
  execDecision,
  kindExecutable,
  makeTape,
  selectDurable,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "../config.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const P = { tp: 0.02, sl: 0.02, trail: 0, hold: 32 };
const tr = (h: number, r: number): Trade => ({
  cfg: "x",
  sym: "A",
  side: 1,
  entryT: h * H,
  exitT: (h + 1) * H,
  entry: 1,
  exit: 1,
  r,
  reason: r > 0 ? "tp" : "sl",
  bars: 4,
  mfe: 0,
  mae: 0,
});
const tape = (id: string, rs: Array<[number, number]>) =>
  makeTape(
    id,
    "magnet",
    id,
    P,
    "normal",
    ["A"],
    rs.map(([h, r]) => tr(h, r)),
    [],
    [],
  );

// 336h window split in 4: steady wins everywhere vs. one lucky burst
const steady = tape(
  "steady",
  Array.from({ length: 80 }, (_, i) => [i * 4, i % 3 === 0 ? -0.01 : 0.012] as [number, number]),
);
const burst = tape("burst", [
  ...Array.from({ length: 60 }, (_, i) => [i * 5, -0.004] as [number, number]),
  ...Array.from({ length: 20 }, (_, i) => [300 + i, 0.03] as [number, number]),
]);
const o = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  preGate: false,
  gates: { ...DEFAULT_SETTINGS.gates, minTrades: 12 },
  // these tests judge the config set's own levels (the default source is direction)
  block: { ...DEFAULT_SETTINGS.block, sources: { config: true }, maxLevel: 6, minActiveLevel: 1 },
};

describe("durable selection", () => {
  it("keeps configs positive across sub-windows and rejects a single burst", () => {
    const { picks } = selectDurable([steady, burst], 336 * H, o, new Set());
    assert.deepEqual(
      picks.map((p) => p.id),
      ["steady"],
    );
  });

  it("holds a picked config while PF >= 1 and drops it when it stops paying", () => {
    const fading = tape("fading", [
      ...Array.from({ length: 40 }, (_, i) => [i * 4, 0.01] as [number, number]),
      ...Array.from({ length: 60 }, (_, i) => [170 + i * 2, -0.01] as [number, number]),
    ]);
    const held = new Set(["fading"]);
    assert.equal(selectDurable([fading], 200 * H, o, held).picks.length, 1);
    assert.equal(selectDurable([fading], 300 * H, o, held).picks.length, 0);
  });
});

describe("toggles and Block", () => {
  it("Normal off still executes Block-adjusted entries; Active adjusts only from its min level", () => {
    const tg = { ...DEFAULT_TOGGLES, normal: false, block: true, blockActive: false };
    assert.ok(kindExecutable("normal", tg));
    const t = tape("b", [
      [0, 0.01],
      [2, 0.01],
      [4, -0.03],
    ]);
    assert.equal(blockLevel(t, 3 * H + 1, o.block), 2);
    assert.equal(blockLevel(t, 5 * H + 1, o.block), 0);
    const oo = { ...o, lastN: 0, toggles: tg };
    assert.deepEqual(execDecision(t, 3 * H + 1, oo), { ok: true, level: 2, vol: 1.4 });
    assert.deepEqual(execDecision(t, 5 * H + 1, oo), { ok: false, why: "normalOff" });
    // Block Active: below the min level the entry is the plain base — executed with Normal on (volume 1)
    const active = { ...oo, toggles: { ...tg, normal: true, blockActive: true } };
    assert.deepEqual(execDecision(t, 5 * H + 1, active), { ok: true, level: 0, vol: 1 });
    // … and with Normal off, only levels ≥ min execute
    const activeOff = {
      ...oo,
      toggles: { ...tg, normal: false, blockActive: true },
      block: { ...o.block, minActiveLevel: 3 },
    };
    assert.deepEqual(execDecision(t, 3 * H + 1, activeOff), { ok: false, why: "normalOff" });
    assert.deepEqual(
      execDecision(t, 3 * H + 1, {
        ...activeOff,
        block: { ...activeOff.block, minActiveLevel: 2 },
      }),
      {
        ok: true,
        level: 2,
        vol: 1.4,
      },
    );
    assert.equal(kindExecutable("dca", { ...tg, dca: true, dcaActive: true }), false);
    assert.equal(kindExecutable("dca-active", { ...tg, dca: true, dcaActive: true }), true);
  });

  it("Normal off covers the whole base (Normal and Trailing); DCA / Axis keep running; Trailing off is global", () => {
    const tg = { ...DEFAULT_TOGGLES, normal: false, block: true, blockActive: false };
    const t = tape("b", [
      [0, 0.01],
      [2, 0.01],
      [4, -0.03],
    ]);
    const tr = { ...t, kind: "trailing" as const };
    const oo = { ...o, lastN: 0, toggles: tg };
    // unadjusted trailing entries are part of the base: not executed with Normal off
    assert.deepEqual(execDecision(tr, 5 * H + 1, oo), { ok: false, why: "normalOff" });
    // Block-raised ones still are
    assert.deepEqual(execDecision(tr, 3 * H + 1, oo), { ok: true, level: 2, vol: 1.4 });
    // Normal off and Block off: no base at all, the additional strategies still run
    const bare = { ...tg, block: false };
    assert.equal(kindExecutable("normal", bare), false);
    assert.equal(kindExecutable("trailing", bare), false);
    assert.equal(kindExecutable("dca-active", bare), true);
    assert.equal(kindExecutable("axis", bare), true);
    // Trailing off: no trailing anywhere, whatever else is on
    assert.equal(kindExecutable("trailing", { ...DEFAULT_TOGGLES, trailing: false }), false);
    assert.deepEqual(
      execDecision(tr, 3 * H + 1, { ...oo, toggles: { ...DEFAULT_TOGGLES, trailing: false } }),
      {
        ok: false,
        why: "toggle",
      },
    );
  });
});
