import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, StratKind, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { defaultWalkForward, execDecision, makeTape, selectFixed, validatedSetGen, walkForward } from "./walkforward.ts";
import { positionOrderCounts } from "../positions.ts";

const H = 3_600_000, T = Date.UTC(2026, 9, 28);
const sym = "A-USDT", ind = "ema-9-21@m5";
const p: Protect = { tp: .01, sl: .01, trail: 0, hold: 3, tag: "sh" };
const options = () => ({ ...defaultWalkForward(DEFAULT_SETTINGS), validLastN: 12, signalValidLastN: 12,
  lastN: 0, lastNMinPf: 1.1, rangeGate: undefined, exitMinTrades: 12, exitMinPf: 1.1,
  symGate: "off" as const, seatPer: "config" as const, portfolio: 0, bots: [],
  toggles: { ...DEFAULT_SETTINGS.toggles, normal: true, trailing: true, exit: true, block: false,
    blockActive: false, dca: true, dcaActive: true, axis: true },
  gates: { ...DEFAULT_SETTINGS.gates, minTrades: 9, minPf: 1.1, baseLastN: 40, lastNOnly: true } });
const tape = (kind: StratKind, protect: Protect, rows: Array<{ sym: string; side: 1 | -1; r: number; entryT?: number; exitT?: number }>, source = ind) => {
  const id = configId("follow", source, protect, kind);
  const trades: Trade[] = rows.map((row, i) => ({ ...row, cfg: id, kind,
    entryT: row.entryT ?? T - (rows.length - i) * H, exitT: row.exitT ?? T - (rows.length - i) * H + 1000,
    entry: 100, exit: 100 * (1 + row.side * row.r), reason: row.r > 0 ? "tp" : "sl",
    bars: 1, mfe: 0, mae: 0 }));
  return makeTape(id, "follow", source, protect, kind, [...new Set(rows.map((x) => x.sym))], trades, [], []);
};
function validated(tapes: ReturnType<typeof tape>[], o = options()) {
  const gen = validatedSetGen(tapes, T, o);
  for (;;) { const x = gen.next(); if (x.done) return x.value; }
}

for (const kind of ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis", "exit"] as StratKind[]) {
  test(`${kind}: Validation cannot pick a sibling cell that failed its own Base Last-40`, () => {
    const good = tape(kind, p, Array.from({ length: 40 }, () => ({ sym, side: 1, r: .01 })));
    const bad = tape(kind, { ...p, sl: .02 }, Array.from({ length: 40 }, (_, i) =>
      ({ sym, side: 1, r: i < 28 ? -.02 : .01 })));
    const o = options(); o.toggles.dcaActive = kind === "dca-active";
    const v = validated([good, bad], o);
    assert.ok(v.has(good.id));
    assert.ok(!v.has(bad.id), "recent Validation wins cannot replace this config's failed Base proof");
    const selected = selectFixed([good, bad], T, o).picks.map((x) => x.id);
    assert.ok(selected.includes(good.id));
    assert.ok(!selected.includes(bad.id));
    assert.equal(execDecision(bad, T, o, { sym, side: 1 }).ok, false);
  });
}

test("a Base-qualified sibling symbol cannot qualify an unqualified symbol for the same set", () => {
  const rows = [
    ...Array.from({ length: 40 }, (_, i) => ({ sym, side: 1 as const, r: i < 28 ? -.02 : .01 })),
    ...Array.from({ length: 40 }, () => ({ sym: "B-USDT", side: 1 as const, r: .01 })),
  ];
  const mixed = tape("normal", p, rows), o = options();
  assert.ok(validated([mixed]).has(mixed.id), "B supplies its own valid context, not A's");
  assert.equal(execDecision(mixed, T, o, { sym, side: 1 }).ok, false);
  assert.equal(execDecision(mixed, T, o, { sym: "B-USDT", side: 1 }).ok, true);
});

test("a losing sibling symbol cannot veto a qualified context's execution Last-N", () => {
  const rows = [
    ...Array.from({ length: 40 }, () => ({ sym, side: 1 as const, r: .01 })),
    ...Array.from({ length: 40 }, () => ({ sym: "B-USDT", side: 1 as const, r: -.01 })),
  ];
  const mixed = tape("normal", p, rows);
  const o = { ...options(), lastN: 12, rangeOpts: undefined };
  assert.equal(execDecision(mixed, T, o, { sym, side: 1 }).ok, true,
    "the own Base, Validation and execution samples all pass; the sibling is irrelevant");
  assert.equal(execDecision(mixed, T, o, { sym: "B-USDT", side: 1 }).ok, false);
  assert.equal(execDecision(mixed, T, { ...o, lastN: 0, normalBaseMinPf: 1.1 }, { sym, side: 1 }).ok, true,
    "the optional Normal base filter also uses the winning symbol's own 25 closes");
});

test("Validation Last-10 remains usable when Base requires at least 12 closes", () => {
  const good = tape("normal", p, Array.from({ length: 40 }, () => ({ sym, side: 1, r: .01 })));
  const o = { ...options(), validLastN: 10, gates: { ...options().gates, minTrades: 12 } };
  assert.ok(validated([good], o).has(good.id));
  assert.equal(execDecision(good, T, o, { sym, side: 1 }).ok, true);
});

test("the actual 12-hour walk-forward selects and counts only Base-validated configuration orders", () => {
  const past = (r: (i: number) => number) => Array.from({ length: 40 }, (_, i) => ({ sym, side: 1 as const, r: r(i) }));
  const future = { sym, side: 1 as const, r: .01, entryT: T + H, exitT: T + 2 * H };
  const good = tape("normal", p, [...past(() => .01), future]);
  const bad = tape("normal", { ...p, sl: .02 }, [...past((i) => i < 28 ? -.02 : .01), future]);
  const o = { ...options(), seatSet: "validated" as const, startT: T, simH: 12, preH: 12, stepH: 1,
    coord: { enabled: false, confirm: false, conflict: false, hourLock: 0, cooldown: "off" as const } };
  const u = { bars: [], caches: [], startT: T - 48 * H, endT: T + 12 * H, splitT: T,
    nowT: T + 12 * H, baseTf: 5 } as never;
  const result = walkForward(u, [good, bad], o);
  assert.deepEqual(result.validated, [good.id]);
  assert.deepEqual(result.trades.map((x) => x.cfg), [good.id]);
  assert.deepEqual(positionOrderCounts(result.trades, result.openAtEnd ?? []), {
    openedPositions: 1, closedPositions: 1, openPositions: 0,
    openedOrders: 1, settledOrders: 1, openOrders: 0,
  });
});

test("continuous validation uses processed closes, not profitable rejected candidates", () => {
  const past = Array.from({ length: 40 }, () => ({ sym, side: 1 as const, r: .01 }));
  const future = Array.from({ length: 12 }, (_, i) => {
    const entryT = T + (i * 4 + 1) * 60_000;
    return [
      { sym, side: 1 as const, r: -.01, entryT, exitT: entryT + 2 * 60_000 },
      // This candidate wins but overlaps the first order and never enters the book.
      { sym, side: 1 as const, r: .10, entryT: entryT + 60_000, exitT: entryT + 3 * 60_000 },
    ];
  }).flat();
  const after = { sym, side: 1 as const, r: .10, entryT: T + 55 * 60_000, exitT: T + 56 * 60_000 };
  const tp = tape("normal", p, [...past, ...future, after]);
  const o = { ...options(), seatSet: "validated" as const, startT: T, simH: 12, preH: 12, stepH: 1,
    coord: { enabled: false, confirm: false, conflict: false, hourLock: 0, cooldown: "off" as const } };
  const u = { bars: [], caches: [], startT: T - 48 * H, endT: T + 12 * H, splitT: T,
    nowT: T + 12 * H, baseTf: 5 } as never;
  const result = walkForward(u, [tp], o);
  assert.equal(result.trades.length, 12, "the thirteenth entry is held after 12 processed losses");
  assert.equal(result.skips.processedValidation, 1);
  assert.ok(result.trades.every((x) => x.r < 0));
});

test("losing rejected candidates cannot deactivate a qualified context with winning processed closes", () => {
  const past = Array.from({ length: 40 }, () => ({ sym, side: 1 as const, r: .01 }));
  const future = Array.from({ length: 12 }, (_, i) => {
    const entryT = T + (i * 4 + 1) * 60_000;
    return [
      { sym, side: 1 as const, r: .02, entryT, exitT: entryT + 2 * 60_000 },
      { sym, side: 1 as const, r: -.10, entryT: entryT + 60_000, exitT: entryT + 3 * 60_000 },
    ];
  }).flat();
  const after = { sym, side: 1 as const, r: .02, entryT: T + 55 * 60_000, exitT: T + 56 * 60_000 };
  const tp = tape("normal", p, [...past, ...future, after]);
  const o = { ...options(), seatSet: "validated" as const, startT: T, simH: 12, preH: 12, stepH: 1,
    coord: { enabled: false, confirm: false, conflict: false, hourLock: 0, cooldown: "off" as const } };
  const u = { bars: [], caches: [], startT: T - 48 * H, endT: T + 12 * H, splitT: T,
    nowT: T + 12 * H, baseTf: 5 } as never;
  const result = walkForward(u, [tp], o);
  assert.equal(result.trades.length, 13, `all 12 winners and the later order pass their processed history: ${JSON.stringify(result.skips)}`);
  assert.ok(result.trades.every((x) => x.r > 0));
});

test("own qualified source keeps learning after its execution gate fails and can recover", () => {
  const past = Array.from({ length: 40 }, (_, i) => ({ sym, side: 1 as const, r: .01,
    entryT: T - (40 - i) * 60_000, exitT: T - (40 - i) * 60_000 + 1000 }));
  const future = Array.from({ length: 24 }, (_, i) => ({ sym, side: 1 as const,
    r: i < 12 ? -.01 : .02, entryT: T + (i * 4 + 1) * 60_000,
    exitT: T + (i * 4 + 3) * 60_000 }));
  const after = { sym, side: 1 as const, r: .02, entryT: T + 110 * 60_000, exitT: T + 112 * 60_000 };
  const tp = tape("normal", p, [...past, ...future, after]);
  const o = { ...options(), seatSet: "validated" as const, startT: T, simH: 12, preH: 12, stepH: 1,
    coord: { enabled: false, confirm: false, conflict: false, hourLock: 0, cooldown: "off" as const } };
  const u = { bars: [], caches: [], startT: T - 48 * H, endT: T + 12 * H, splitT: T,
    nowT: T + 12 * H, baseTf: 5 } as never;
  const result = walkForward(u, [tp], o);
  assert.equal(result.trades.filter((x) => x.r < 0).length, 12, "later failure never erases owned losses");
  assert.ok(!result.trades.some((x) => x.entryT === future[12].entryT), "the first recovery result cannot authorize its own entry");
  assert.ok(result.trades.some((x) => x.entryT === after.entryT), "subsequent own qualified model closes recover the gate without funding rejected entries");
});

test("funding caps cannot hide qualified source losses and leave a context indefinitely warming", () => {
  const history = (s: string) => Array.from({ length: 40 }, (_, i) => ({ sym: s, side: 1 as const, r: .01,
    entryT: T - (40 - i) * 60_000, exitT: T - (40 - i) * 60_000 + 1000 }));
  const busy = tape("normal", { ...p, sl: .02 }, [...history("B-USDT"),
    { sym: "B-USDT", side: 1, r: .01, entryT: T + 60_000, exitT: T + 60 * 60_000 }]);
  const losses = Array.from({ length: 12 }, (_, i) => ({ sym, side: 1 as const, r: -.01,
    entryT: T + (i * 4 + 2) * 60_000, exitT: T + (i * 4 + 4) * 60_000 }));
  const after = { sym, side: 1 as const, r: .02, entryT: T + 70 * 60_000, exitT: T + 72 * 60_000 };
  const target = tape("normal", p, [...history(sym), ...losses, after]);
  const o = { ...options(), maxOpen: 1, seatSet: "validated" as const, startT: T,
    simH: 12, preH: 12, stepH: 1,
    coord: { enabled: false, confirm: false, conflict: false, hourLock: 0, cooldown: "off" as const } };
  const u = { bars: [], caches: [], startT: T - 48 * H, endT: T + 12 * H, splitT: T,
    nowT: T + 12 * H, baseTf: 5 } as never;
  const result = walkForward(u, [busy, target], o);
  assert.deepEqual(result.trades.map((x) => x.cfg), [busy.id], "the freed funding slot cannot qualify the target's losing own source");
  assert.equal(result.skips.maxOpen, 12);
  assert.equal(result.skips.processedValidation, 1);
  const source = result.feed.filter((x) => x.cfg === target.id && x.validationSource);
  assert.equal(source.length, 13, "all nonoverlapping upstream-qualified model orders keep their own stream");
  assert.equal(source.filter((x) => x.accepted).length, 12, "pre-funding Real admissions are separate from the failed downstream gate");
  assert.ok(!source.find((x) => x.entryT === after.entryT)?.accepted,
    "a failed downstream PF gate cannot feed accepted Real/Overall statistics");
});

for (const source of ["sig-ema-cross-s@m5", "sig-coord-v2-r60-n3-i3-br9a60mhgf0326kw8ow07@m5"])
  for (const kind of ["normal", "trailing", "exit"] as StratKind[]) {
    test(`${source}/${kind}: Signal Validation requires its own Base proof`, () => {
      const good = tape(kind, p, Array.from({ length: 40 }, () => ({ sym, side: 1, r: .01 })), source);
      const bad = tape(kind, { ...p, sl: .02 }, Array.from({ length: 40 }, (_, i) =>
        ({ sym, side: 1, r: i < 28 ? -.02 : .01 })), source);
      const o = { ...options(), signalOwnBase: true };
      const v = validated([good, bad], o);
      assert.ok(v.has(good.id)); assert.ok(!v.has(bad.id));
      assert.equal(execDecision(bad, T, o, { sym, side: 1 }).ok, false);
    });
  }

for (const tag of ["mc", "mn"] as const) {
  test(`${tag}: Base Last-30, not its winning Last-40 or Validation Last-12, controls admission`, () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ sym, side: 1 as const,
      r: i < 10 ? .04 : i < 28 ? -.01 : .01 }));
    const exact = tape("normal", { ...p, tag }, rows), o = options();
    assert.ok(!validated([exact], o).has(exact.id));
    assert.equal(execDecision(exact, T, o, { sym, side: 1 }).ok, false);
    const last40 = { ...o, gates: { ...o.gates, baseRangeLastN: { micro: 40, minimal: 40 } } };
    assert.ok(validated([exact], last40).has(exact.id), "the controlled Last-40 comparison is not vacuous");
  });
}
