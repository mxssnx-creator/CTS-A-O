import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  blockLevel,
  defaultWalkForward,
  execDecision,
  kindExecutable,
  makeTape,
  selectDurable,
  selectFixed,
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
  // these fixtures are short on purpose; the 50-close validation is covered on its own
  validLastN: 0,
  gates: { ...DEFAULT_SETTINGS.gates, minTrades: 12 },
  // these tests judge the config set's own levels (the default source is direction)
  // shared, continuous, ratio 0.2: the volumes below are 1 + 0.2 · level
  block: {
    ...DEFAULT_SETTINGS.block,
    sources: { config: true },
    mode: "shared" as const,
    ratio: 0.2,
    maxMult: 2.5,
    steps: 0,
    maxLevel: 6,
    minActiveLevel: 1,
  },
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
  it("Normal off still executes Block-adjusted entries; Active skips every entry below its min level", () => {
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
    assert.deepEqual(execDecision(t, 3 * H + 1, oo), { ok: true, level: 2, vol: 1.4, src: ["config"] });
    assert.deepEqual(execDecision(t, 5 * H + 1, oo), { ok: false, why: "normalOff" });
    // Block Active: below the min level the entry is skipped — also with Normal on
    const active = { ...oo, toggles: { ...tg, normal: true, blockActive: true } };
    assert.deepEqual(execDecision(t, 5 * H + 1, active), { ok: false, why: "blockActive" });
    // … and only levels ≥ min execute (Normal on or off)
    const activeOff = {
      ...oo,
      toggles: { ...tg, normal: false, blockActive: true },
      block: { ...o.block, minActiveLevel: 3 },
    };
    assert.deepEqual(execDecision(t, 3 * H + 1, activeOff), { ok: false, why: "blockActive" });
    assert.deepEqual(
      execDecision(t, 3 * H + 1, { ...activeOff, toggles: { ...activeOff.toggles, normal: true } }),
      { ok: false, why: "blockActive" },
    );
    assert.deepEqual(
      execDecision(t, 3 * H + 1, {
        ...activeOff,
        block: { ...activeOff.block, minActiveLevel: 2 },
      }),
      { ok: true, level: 2, vol: 1.4, src: ["config"] },
    );
    assert.equal(kindExecutable("dca", { ...tg, dca: true, dcaActive: true }), false);
    assert.equal(kindExecutable("dca-active", { ...tg, dca: true, dcaActive: true }), true);
  });

  it("Normal off: Normal and Trailing execute only Block-raised; Trailing off is global; DCA / Axis run on", () => {
    const tg = { ...DEFAULT_TOGGLES, normal: false, block: true, blockActive: false };
    const t = tape("b", [
      [0, 0.01],
      [2, 0.01],
      [4, -0.03],
    ]);
    const tr = { ...t, kind: "trailing" as const };
    const oo = { ...o, lastN: 0, toggles: tg };
    // Normal off: an unraised trailing entry is skipped like an unraised plain one
    assert.deepEqual(execDecision(tr, 5 * H + 1, oo), { ok: false, why: "normalOff" });
    // a Block-raised trailing entry still executes, with the Block size
    assert.deepEqual(execDecision(tr, 3 * H + 1, oo), { ok: true, level: 2, vol: 1.4, src: ["config"] });
    // Normal on: trailing runs beside the plain book, raised or not
    const on = { ...oo, toggles: { ...tg, normal: true } };
    assert.deepEqual(execDecision(tr, 5 * H + 1, on), { ok: true, level: 0, vol: 1 });
    // Normal off and Block off: no plain base at all (Normal and Trailing); DCA, DCA Active and Axis still run
    const bare = { ...tg, block: false, dca: true, dcaActive: true, axis: true };
    assert.equal(kindExecutable("normal", bare), false);
    assert.equal(kindExecutable("trailing", bare), false);
    assert.equal(kindExecutable("dca", { ...tg, block: false }), true, "desk DCA (not Active) still runs");
    assert.equal(kindExecutable("dca-active", { ...tg, block: false }), false);
    assert.equal(kindExecutable("dca-active", bare), true);
    assert.equal(kindExecutable("axis", bare), true);
    assert.deepEqual(execDecision(tr, 3 * H + 1, { ...oo, toggles: bare }), { ok: false, why: "toggle" });
    // Normal on, Block off: trailing runs unraised
    assert.equal(kindExecutable("trailing", { ...bare, normal: true }), true);
    // Trailing off: no trailing anywhere, whatever else is on (also not Block-raised)
    assert.equal(kindExecutable("trailing", { ...DEFAULT_TOGGLES, trailing: false }), false);
    assert.equal(kindExecutable("trailing", { ...DEFAULT_TOGGLES, normal: true, block: true, trailing: false }), false);
    assert.deepEqual(
      execDecision(tr, 3 * H + 1, { ...oo, toggles: { ...DEFAULT_TOGGLES, trailing: false } }),
      {
        ok: false,
        why: "toggle",
      },
    );
  });

  it("Normal off does not stop the base evaluation: DCA / Axis still beat the Normal base and take seats", () => {
    // a pair with a plain tape (the base) and a DCA tape that beats it
    const mk = (id: string, kind: "normal" | "dca", rs: Array<[number, number]>) =>
      makeTape(id, "magnet", "ind-x", P, kind, ["A"], rs.map(([h, r]) => tr(h, r)), [], []);
    const base = mk("base", "normal", Array.from({ length: 30 }, (_, i) => [i * 10, i % 3 === 0 ? -0.01 : 0.008] as [number, number]));
    const dca = mk("dca", "dca", Array.from({ length: 30 }, (_, i) => [i * 10 + 1, i % 4 === 0 ? -0.01 : 0.012] as [number, number]));
    const opt = {
      ...o,
      familySeats: true,
      familyNeedsBase: true,
      toggles: { ...DEFAULT_TOGGLES, normal: false, trailing: false, block: false, blockActive: false, dca: true, dcaActive: false, axis: false },
    };
    const T = 320 * H;
    for (const sel of [selectFixed, (tt: never, t: number, oo: never) => selectDurable(tt, t, oo, new Set())] as const) {
      const ids = (sel as (a: unknown, b: number, c: unknown) => { picks: Array<{ id: string }> })([base, dca], T, opt).picks.map((p) => p.id);
      assert.ok(ids.includes("dca"), `DCA seated with Normal off (${ids.join(",")})`);
      assert.ok(!ids.includes("base"), "the disabled base itself takes no seat");
    }
  });
});

describe('fixed selection respects min PF', () => {
  const row = (id: string, ind: string, rs: Array<[number, number]>) =>
    makeTape(
      id,
      'follow',
      ind,
      P,
      'trailing',
      ['A'],
      rs.map(([h, r]) => tr(h, r)),
      [],
      [],
    );
  const strong = row(
    'strong',
    'pairA',
    Array.from({ length: 24 }, (_, i) => [80 + i * 8, i % 5 === 0 ? -0.004 : 0.02] as [number, number]),
  );
  const weak = row(
    'weak',
    'pairA',
    Array.from({ length: 24 }, (_, i) => [80 + i * 8, i % 4 === 0 ? 0.004 : -0.01] as [number, number]),
  );
  const dead = row(
    'dead',
    'pairB',
    Array.from({ length: 24 }, (_, i) => [80 + i * 8, -0.01] as [number, number]),
  );
  it('keeps the variant that clears min PF and drops the pair that does not', () => {
    const { picks } = selectFixed([strong, weak, dead], 400 * H, { ...o, preGate: true });
    assert.deepEqual(
      picks.map((p) => p.id),
      ['strong'],
    );
    assert.ok(picks[0].window.pf >= o.gates.minPf);
    assert.ok(picks[0].window.net > 0);
  });
  it('last-N uses min PF, not only the neutral floor', () => {
    const tp = row('recent', 'pairA', [
      [1, 0.01],
      [2, 0.01],
      [3, -0.009],
      [4, -0.009],
    ]);
    const pass = execDecision(tp, 10 * H, {
      ...o,
      lastN: 4,
      lastNMinPf: 1,
      toggles: { ...o.toggles, normal: true, block: false },
    });
    assert.equal(pass.ok, true);
    const fail = execDecision(tp, 10 * H, {
      ...o,
      lastN: 4,
      lastNMinPf: 1,
      gates: { ...o.gates, minPf: 1.2 },
      toggles: { ...o.toggles, normal: true, block: false },
    });
    assert.equal(fail.ok, false);
    if (!fail.ok) assert.equal(fail.why, 'lastN');
  });
  it('last-N also rejects a drawdown longer than the gate when PF still passes', () => {
    const tp = row('ddt', 'pairA', [
      [1, 0.05],
      [2, -0.01],
      [40, -0.01],
      [41, 0.05],
    ]);
    const common = {
      ...o,
      lastN: 4,
      lastNMinPf: 1,
      toggles: { ...o.toggles, normal: true, block: false },
    };
    const pass = execDecision(tp, 42 * H, { ...common, gates: { ...o.gates, maxDdtH: 50 } });
    assert.equal(pass.ok, true);
    const fail = execDecision(tp, 42 * H, { ...common, gates: { ...o.gates, maxDdtH: 10 } });
    assert.equal(fail.ok, false);
    if (!fail.ok) assert.equal(fail.why, 'lastN');
  });
  it('validation last-N 50 drops a short tape and keeps one whose last 50 clear PF and DDT', () => {
    const good = row(
      'good',
      'pairA',
      Array.from({ length: 60 }, (_, i) => [i * 2, i % 6 === 0 ? -0.004 : 0.02] as [number, number]),
    );
    const short = row(
      'short',
      'pairB',
      Array.from({ length: 24 }, (_, i) => [i * 2, 0.02] as [number, number]),
    );
    const { picks } = selectFixed([good, short], 200 * H, {
      ...o,
      validLastN: 50,
      preGate: false,
    });
    assert.deepEqual(
      picks.map((p) => p.id),
      ['good'],
    );
  });
});

describe("symbol min PF", () => {
  const row = (sym: string, h: number, r: number) => ({
    cfg: "x",
    sym,
    side: 1 as const,
    entryT: h * H,
    exitT: (h + 1) * H,
    entry: 1,
    exit: 1,
    r,
    reason: (r > 0 ? "tp" : "sl") as "tp" | "sl",
    bars: 4,
    mfe: 0,
    mae: 0,
  });
  const tp = makeTape(
    "sym",
    "follow",
    "pairA",
    P,
    "normal",
    ["A", "B"],
    [row("A", 1, 0.02), row("A", 3, 0.02), row("B", 2, -0.02), row("B", 4, -0.02)],
    [],
    [],
  );
  const oo = {
    ...o,
    lastN: 0,
    symGate: "proven" as const,
    symMinN: 2,
    toggles: { ...o.toggles, normal: true, block: false },
  };
  it("opens a symbol that already clears min PF and skips one that does not", () => {
    const good = execDecision(tp, 10 * H, oo, { sym: "A", side: 1 });
    assert.equal(good.ok, true);
    const bad = execDecision(tp, 10 * H, oo, { sym: "B", side: 1 });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.why, "symPf");
    const thin = execDecision(tp, 3 * H, oo, { sym: "A", side: 1 });
    assert.equal(thin.ok, false);
    if (!thin.ok) assert.equal(thin.why, "symPf");
  });
});
