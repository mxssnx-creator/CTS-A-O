// Block's automatic evaluation per relation × block count (operator, 17 Nov: "auto eval system detailed and also for
// block counts"). Each count (a relation at a level) is judged on its own newest results: the unit results of the
// accepted positions that entered while that relation stood at that level (from the closes before the entry), whether
// it raised them or only observed. Checked against a plain reading, for causality, per-count independence, the manual
// fallback, the key scope, and the decision the walk-forward takes.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BlockAutoEval, BLOCK_SOURCES, blockBookOf, DEFAULT_BLOCK_AUTO, levelOfTail, type BlockBookEntry, type BlockSource } from "./block.ts";
import { DEFAULT_BLOCK } from "../config.ts";
import type { BlockConfig } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 1);
const cfgA = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32";
const cfgB = "revert|ema-21-55@m15|tp2|sl1|tr0|h32";
const policy = (auto: BlockConfig["auto"] = { enabled: true, n: 10, min: 4, pf: 1.1, scope: "rule" }): BlockConfig =>
  ({ ...DEFAULT_BLOCK, auto, historySource: "accepted-orders" });
const row = (cfg: string, sym: string, side: number, entryT: number, exitT: number, r: number): BlockBookEntry =>
  ({ cfg, sym, side, kind: "osc", ind: cfg.split("|")[1], type: "normal", r, entryT, exitT, accepted: true });

describe("Block auto evaluation per relation × count", () => {
  it("ships on, every relation observed, both own-config records and the pooled relations switched on", () => {
    assert.deepEqual(DEFAULT_BLOCK.auto, { enabled: true, n: 30, min: 30, pf: 1.1, scope: "key" });
    for (const s of BLOCK_SOURCES) assert.equal((DEFAULT_BLOCK.sources as Record<string, boolean>)[s], true, s);
    assert.equal(DEFAULT_BLOCK_AUTO.pf, 1.1);
    assert.equal(blockBookOf(DEFAULT_BLOCK).auto?.n, 30);
    assert.equal(blockBookOf({ ...DEFAULT_BLOCK, auto: { enabled: false } }).auto, null);
  });

  it("every count's record equals a plain reading: the levels at entry from the closes before it, then PF of the newest n", () => {
    let seed = 5;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const b = policy({ enabled: true, n: 12, min: 3, pf: 1.1, scope: "rule" });
    const book = blockBookOf(b);
    // closes in exit order; each entered some hours before it closed
    const rows: BlockBookEntry[] = [];
    for (let i = 0; i < 600; i++) {
      const exitT = T0 + i * 60_000;
      rows.push(row(rnd() < 0.5 ? cfgA : cfgB, rnd() < 0.5 ? "A" : "B", rnd() < 0.5 ? 1 : -1,
        exitT - Math.floor(rnd() * 90) * 60_000, exitT, Math.round((rnd() - 0.47) * 200) / 10_000));
    }
    // plain reading: for each key, its closes in exit order; the level at an entry from those with exit ≤ entry
    const keyOf = (s: BlockSource, t: BlockBookEntry) => book.keyOf(s, t);
    const lists = new Map<string, Array<{ exitT: number; r: number }>>();
    const plain = new Map<string, number[]>();
    for (const t of rows) {
      for (const s of BLOCK_SOURCES) {
        const k = keyOf(s, t);
        const before = (lists.get(k) ?? []).filter((x) => x.exitT <= t.entryT!).map((x) => x.r);
        const w = s === "config" || s === "lane" ? 1 : book.window;
        const level = levelOfTail(before, b.maxLevel, w);
        if (level >= 1) {
          const pk = `${s}#${level}`;
          (plain.get(pk) ?? plain.set(pk, []).get(pk)!).push(t.r);
        }
      }
      book.add(t);
      for (const s of BLOCK_SOURCES) {
        const k = keyOf(s, t);
        (lists.get(k) ?? lists.set(k, []).get(k)!).push({ exitT: t.exitT!, r: t.r });
      }
    }
    const auto = book.auto!;
    let compared = 0;
    for (const [pk, rs] of plain) {
      const [s, lv] = pk.split("#") as [BlockSource, string];
      const last = rs.slice(-12);
      const gp = last.filter((r) => r > 0).reduce((a, r) => a + r, 0), gl = -last.filter((r) => r < 0).reduce((a, r) => a + r, 0);
      const pf = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0;
      const v = auto.verdict(s, "", Number(lv));
      assert.equal(v.n, last.length, pk);
      if (v.pf === null) throw new Error(`${pk}: finite sample unexpectedly has no PF`);
      assert.ok(Math.abs(v.pf - pf) < 1e-9 || v.pf === pf, `${pk}: ${v.pf} vs ${pf}`);
      assert.equal(v.raise, last.length < 3 ? null : pf >= 1.1, pk);
      compared++;
    }
    assert.ok(compared >= 12, `${compared} counts compared`);
  });

  it("is causal: a close after the entry never changes that entry's level or the count it is recorded under", () => {
    const b = policy({ enabled: true, n: 10, min: 1, pf: 1.1, scope: "rule" });
    const book = blockBookOf(b);
    // config A: two winners closing before the entry at t = 10 h (level 2 config-wide at entry)
    book.add(row(cfgA, "A", 1, T0, T0 + 1 * H, 0.01));
    book.add(row(cfgA, "B", -1, T0, T0 + 2 * H, 0.01));
    // a close at 11 h of a position that entered at 10 h; a sibling closing at 10.5 h after its entry must not count
    book.add(row(cfgA, "A", 1, T0 + 9 * H, T0 + 10.5 * H, -0.05));
    book.add(row(cfgA, "A", 1, T0 + 10 * H, T0 + 11 * H, 0.02));
    // the 11 h close entered at 10 h: config level then was from the 1 h, 2 h closes only (10.5 h is after) = 2
    assert.equal(book.levelAt(book.keyOf("config", row(cfgA, "A", 1, 0, 0, 0)), T0 + 10 * H, b.maxLevel), 2);
    const v2 = book.auto!.verdict("config", "", 2);
    // results at config level 2: the 10.5 h close (entered 9 h: level 2) and the 11 h close (entered 10 h: level 2)
    assert.equal(v2.n, 2);
  });

  it("one count's results never move another count's verdict; an observed count is recorded like a raising one", () => {
    const auto = new BlockAutoEval({ n: 10, min: 3, pf: 1.1, scope: "rule" }, 8);
    for (let i = 0; i < 5; i++) auto.record("symbol", "s:A|1", 1, 0.01);
    const before = auto.verdict("symbol", "s:A|1", 1);
    for (let i = 0; i < 50; i++) {
      auto.record("symbol", "s:A|1", 2, -0.02);
      auto.record("overall", "all", 1, -0.02);
    }
    assert.deepEqual(auto.verdict("symbol", "s:A|1", 1), before, "level 2 and another relation leave level 1 alone");
    assert.equal(before.raise, true);
    assert.equal(auto.verdict("symbol", "s:A|1", 2).raise, false);
    assert.equal(auto.verdict("type", "t:normal", 1).raise, null, "a count without results is not decided");
  });

  it("scope key: one config's record never moves another config's count", () => {
    const auto = new BlockAutoEval({ n: 10, min: 2, pf: 1.1, scope: "key" }, 8);
    for (let i = 0; i < 6; i++) auto.record("config", `c:${cfgA}`, 1, -0.01);
    for (let i = 0; i < 6; i++) auto.record("config", `c:${cfgB}`, 1, 0.01);
    assert.equal(auto.verdict("config", `c:${cfgA}`, 1).raise, false);
    assert.equal(auto.verdict("config", `c:${cfgB}`, 1).raise, true);
  });

  it("the walk-forward applies the verdicts: below min the manual switch holds, then Auto decides each count", async () => {
    const { execDecision, makeTape, defaultWalkForward } = await import("./walkforward.ts");
    const { DEFAULT_SETTINGS } = await import("../config.ts");
    const NOW = T0 + 400 * H;
    const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
    // 100 hourly closes (5 losers) and one entry in the window: every gate before Block passes
    const trades = Array.from({ length: 101 }, (_, i) => {
      const entryT = i < 100 ? NOW - 120 * H + i * H : NOW - 2 * H + 10 * 60_000;
      const r = i < 100 && i % 20 === 19 ? -0.01 : 0.01;
      return { cfg: cfgA, sym: "A", side: 1, entryT, exitT: entryT + 30 * 60_000, entry: 100, exit: 100 * (1 + r), r,
        unitR: r, reason: r > 0 ? "tp" : "sl", bars: 2, mfe: 0, mae: 0, kind: "normal" };
    }) as never[];
    const tp = makeTape(cfgA, "follow", "rsi-mom-14-20@m15", P, "normal", ["A"], trades, [], []);
    const settings = { ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, positionWindows: null } };
    const base = { ...defaultWalkForward(settings), wideEnabled: true };
    const o = {
      ...base,
      toggles: { normal: true, trailing: true, block: true, blockActive: false, dca: true, dcaActive: false, axis: true },
      symGate: undefined,
      coord: { enabled: false, hourLock: 0, cooldown: "off" as const, conflict: false, confirm: false },
      simH: 6,
      preH: 336,
      longH: 336,
      seatPer: "config" as const,
      // only the overall relation switched on manually; Auto decides each count once it has 4 results
      block: { ...base.block, sources: { config: false, overall: true }, auto: { enabled: true, n: 10, min: 4, pf: 1.1 } },
      blockTrace: true,
    };
    const at = NOW - 2 * H + 10 * 60_000;
    const book = blockBookOf(o.block);
    // another config's three winners: overall level 3 at the entry; the overall counts hold no results yet
    for (let i = 0; i < 3; i++) book.add(row(cfgB, "B", 1, T0 + i * H - 1, T0 + i * H, 0.01));
    const manualHolds = execDecision(tp, at, o, { sym: "A", side: 1, book });
    assert.ok(manualHolds.ok && (manualHolds.vol ?? 1) > 1, `manual overall raises: ${JSON.stringify(manualHolds)}`);
    assert.equal((manualHolds as { blockDecidedBy?: Record<string, string> }).blockDecidedBy?.overall, "manual");
    // positions that entered at overall level 3 (after the three winners) and lost: that count now holds 4 losers
    for (let i = 0; i < 4; i++) book.add(row(cfgB, "B", 1, T0 + 3 * H, T0 + (4 + i) * H, -0.01));
    // three small winners entering after them (overall level 0 then: not recorded) put the level back at exactly 3
    for (let i = 0; i < 3; i++) book.add(row(cfgB, "B", 1, T0 + 8 * H, T0 + (9 + i) * H, 0.002));
    const v = book.auto!.verdict("overall", "all", 3);
    assert.deepEqual([v.n, v.raise], [4, false], JSON.stringify(v));
    const d = execDecision(tp, at, o, { sym: "A", side: 1, book });
    assert.equal((d as { blockLevels?: Record<string, number> }).blockLevels?.overall, 3);
    assert.equal((d as { blockDecidedBy?: Record<string, string> }).blockDecidedBy?.overall, "auto");
    assert.ok(d.ok && (d.vol ?? 1) === 1, `Auto switched the losing count off: ${JSON.stringify(d)}`);
    book.auto!.record("overall", "all", 3, NaN);
    const unknown = execDecision(tp, at, o, { sym: "A", side: 1, book });
    assert.equal(book.auto!.verdict("overall", "all", 3).state, "unknown");
    assert.equal((unknown as { blockDecidedBy?: Record<string, string> }).blockDecidedBy?.overall, "auto");
    assert.ok(unknown.ok && (unknown.vol ?? 1) === 1, "unknown evidence must not fall back to the enabled manual raise");
    // the same count winning instead: Auto raises it even with the relation switched off manually
    const offBlock = { ...o.block, sources: { config: false, overall: false } };
    const win = blockBookOf(offBlock);
    for (let i = 0; i < 3; i++) win.add(row(cfgB, "B", 1, T0 + i * H - 1, T0 + i * H, 0.01));
    for (let i = 0; i < 4; i++) win.add(row(cfgB, "B", 1, T0 + 3 * H, T0 + (4 + i) * H, 0.01));
    // a loser that entered before any close (level 0: not recorded), then three small winners: level 3 again
    win.add(row(cfgB, "B", 1, T0 - 5 * H, T0 + 8 * H, -0.05));
    for (let i = 0; i < 3; i++) win.add(row(cfgB, "B", 1, T0 + 8.5 * H, T0 + (9 + i) * H, 0.002));
    const w = win.auto!.verdict("overall", "all", 3);
    assert.equal(w.raise, true, JSON.stringify(w));
    const up = execDecision(tp, at, { ...o, block: offBlock }, { sym: "A", side: 1, book: win });
    assert.equal((up as { blockLevels?: Record<string, number> }).blockLevels?.overall, 3);
    assert.ok(up.ok && (up.vol ?? 1) > 1, `Auto switched the winning count on: ${JSON.stringify(up)}`);
  });
});
