// Axis and Block work for each config / Set independently and correctly (operator, 17 Nov):
// - Block's shipped default reads only the config's own record, config-wide (its own closes on every symbol and side):
//   no other config, symbol pool, direction, indication or type moves a config's raise, and the level equals a plain
//   reading of its own closes;
// - every Axis config (mode × range × ladder depth) is its own pair event and its own live-feedback record.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, execDecision, makeTape, pairEventKey, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { blockBookOf, sourceKey, type BlockBookEntry } from "./block.ts";
import { DEFAULT_ADJUST, evaluateAdjust, setKeyOf } from "../adjust.ts";
import { DEFAULT_BLOCK, DEFAULT_SETTINGS as FACTORY_SETTINGS } from "../config.ts";
import type { StratKind, Trade } from "../domain/types.ts";

const DEFAULT_SETTINGS = { ...FACTORY_SETTINGS, gates: { ...FACTORY_SETTINGS.gates, positionWindows: null } };
const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const IND = "rsi-mom-14-20@m15";
const id = (tp: number, kind = "") => `follow|${IND}|tp${tp}|sl1|tr0|h32${kind ? `|${kind}` : ""}`;
const ax = (tag: string) => `follow|${IND}|tp1|sl1|tr0|h32|${tag}|axis`;

function trades(cfg: string, lose: number, win = 0.01, kind: StratKind = "normal"): Trade[] {
  const mk = (r: number, entryT: number): Trade =>
    ({ cfg, sym: "AAA-USDT", side: 1, entryT, exitT: entryT + 30 * 60_000, entry: 100, exit: 100 * (1 + r), r,
      unitR: r, reason: r > 0 ? "tp" : "sl", bars: 2, mfe: 0, mae: 0, kind }) as Trade;
  const out: Trade[] = [];
  const every = lose > 0 ? Math.floor(100 / lose) : Infinity;
  for (let i = 0; i < 100; i++) out.push(mk(i % every === every - 1 ? -0.01 : win, NOW - 120 * H + i * H));
  out.push(mk(win, NOW - 2 * H + 10 * 60_000));
  return out;
}
const tape = (cfg: string, lose: number, win = 0.01, kind: StratKind = "normal") =>
  makeTape(cfg, "follow", IND, P, kind, ["AAA-USDT"], trades(cfg, lose, win, kind), [], []);

const shipped = defaultWalkForward(DEFAULT_SETTINGS);
const o: WalkForwardOptions = {
  ...shipped,
  toggles: { normal: true, trailing: true, block: true, blockActive: false, dca: true, dcaActive: false, axis: true },
  symGate: undefined,
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 6,
  preH: 336,
  longH: 336,
  seatPer: "config",
};
const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;
const at = NOW - 2 * H + 10 * 60_000;
const ctx = { sym: "AAA-USDT", side: 1 };
const close = (cfg: string, r: number, sym = "AAA-USDT", side = 1, type = "normal", ind = IND): BlockBookEntry =>
  ({ cfg, sym, side, kind: "osc", ind, r, type, accepted: true });

describe("Block on each config's own record (shipped default)", () => {
  it("the shipped Block reads the config source alone, config-wide", () => {
    assert.deepEqual(o.block.sources, { config: true, overall: false, symbol: false, direction: false, indication: false, type: false });
    assert.equal(o.block.configScope, "config");
    assert.equal(DEFAULT_BLOCK.configScope, "config");
  });

  it("no other config's closes move a config's raise: other configs, symbols, sides, types and Axis siblings", () => {
    const a = tape(id(1), 5);
    const empty = execDecision(a, at, o, { ...ctx, book: blockBookOf(o.block) });
    const crowd = blockBookOf(o.block);
    // the same pair's other variants, other symbols and sides, other types (an Axis depth of the same pair), the same
    // indication: winners and losers, enough to put every pooled source at its top level
    for (let i = 0; i < 30; i++) {
      crowd.add(close(id(2), 0.02));
      crowd.add(close(id(3), -0.02, "BBB-USDT", -1));
      crowd.add(close(ax("ax-linear2"), 0.03, "AAA-USDT", 1, "axis"));
      crowd.add(close(id(4, "trailing"), 0.01, "CCC-USDT", 1, "trailing"));
    }
    assert.deepEqual(execDecision(a, at, o, { ...ctx, book: crowd }), empty);
    // the opt-in pooled sources do read them: that is the difference the default removes
    const pooled = { ...o, block: { ...o.block, sources: { ...o.block.sources, overall: true, symbol: true } } };
    assert.notDeepEqual(
      execDecision(a, at, pooled, { ...ctx, book: crowd }),
      execDecision(a, at, pooled, { ...ctx, book: blockBookOf(pooled.block) }),
    );
  });

  it("its own closes raise it config-wide: closes on another symbol and side count, under 'context' they do not", () => {
    const a = tape(id(1), 5);
    const own = blockBookOf(o.block);
    for (let i = 0; i < 4; i++) own.add(close(a.id, 0.01, "BBB-USDT", -1));
    const d = execDecision(a, at, o, { ...ctx, book: own });
    assert.ok(d.ok && (d.level ?? 0) >= 1 && (d.vol ?? 1) > 1, JSON.stringify(d));
    const ctxScope = { ...o, block: { ...o.block, configScope: "context" as const } };
    const exact = blockBookOf(ctxScope.block);
    for (let i = 0; i < 4; i++) exact.add(close(a.id, 0.01, "BBB-USDT", -1));
    const e = execDecision(a, at, ctxScope, { ...ctx, book: exact });
    assert.ok(e.ok && (e.level ?? 0) === 0, `the exact symbol × side record holds none of those closes: ${JSON.stringify(e)}`);
  });

  it("the config-wide level equals a plain reading of the config's own closes in exit order", () => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const book = blockBookOf(o.block);
    const mine: number[] = [];
    const t = { sym: "AAA-USDT", side: 1, kind: "osc", ind: IND, type: "normal", cfg: id(1) };
    for (let i = 0; i < 400; i++) {
      const r = Math.round((rnd() - 0.48) * 400) / 10_000;
      const ownClose = rnd() < 0.35;
      const sym = rnd() < 0.5 ? "AAA-USDT" : "BBB-USDT", side = rnd() < 0.5 ? 1 : -1;
      book.add(close(ownClose ? id(1) : id(2 + (i % 3)), r, sym, side));
      if (ownClose) mine.push(r);
      // plain reading: level n counts when the sum of the config's last n closes is positive
      let level = 0, sum = 0;
      for (let n = 1; n <= o.block.maxLevel && n <= mine.length; n++) {
        sum += mine[mine.length - n];
        if (sum > 0) level++;
      }
      assert.equal(book.level(book.keyOf("config", t), o.block.maxLevel), level, `close ${i}`);
    }
    assert.equal(book.keyOf("config", t), `c:${id(1)}`);
    assert.equal(sourceKey("config", t), `c:${id(1)}|AAA-USDT|1`, "an object without configScope keeps the exact key");
  });
});

describe("Axis: every config its own pair event and its own feedback record", () => {
  const axTape = (cfg: string) =>
    makeTape(cfg, "follow", IND, P, "axis", ["AAA-USDT"], trades(cfg, 5, 0.01, "axis"), [], []);
  const wf: WalkForwardOptions = { ...o, toggles: { ...o.toggles, block: false }, onePerPairEvent: true };

  it("two Axis depths of one pair entering the same minute both execute under the pair-event rule", () => {
    assert.equal(shipped.onePerPairEvent, true);
    const two = axTape(ax("ax-linear2")), three = axTape(ax("ax-linear3"));
    const alone = walkForward(u, [two], wf);
    assert.ok(alone.trades.length > 0);
    const both = walkForward(u, [two, three], wf);
    assert.equal(both.trades.length, alone.trades.length * 2, "each Axis config trades its own entries");
    // removal: depth 2's orders are the same with or without its sibling
    assert.deepEqual(both.trades.filter((x) => x.cfg === two.id), alone.trades);
    // the earlier shared event (pairEventAxisOwn false) executes one of them per event
    const shared = walkForward(u, [two, three], { ...wf, pairEventAxisOwn: false });
    assert.equal(shared.trades.length, alone.trades.length);
    // other types keep one order per pair event
    assert.equal(pairEventKey(id(1), "A", 1, "normal", 0), pairEventKey(id(2), "A", 1, "normal", 0));
    assert.notEqual(pairEventKey(ax("ax-linear2"), "A", 1, "axis", 0), pairEventKey(ax("ax-linear3"), "A", 1, "axis", 0));
  });

  it("one Axis variant's losses never move another variant's feedback record", () => {
    const k2 = setKeyOf(ax("ax-linear2")), k3 = setKeyOf(ax("axd-fib3h"));
    assert.notEqual(k2, k3);
    assert.equal(k2, `follow|${IND}|axis|ax-linear2`);
    const a = { ...DEFAULT_ADJUST, enabled: true, window: 5 };
    const losses = Array.from({ length: 20 }, (_, i) => ({ cfg: ax("ax-linear2"), r: -0.01, exitT: T0 + i * H }));
    const { state } = evaluateAdjust({}, losses, a, { minSl: 0.005, minTrail: 0.005 }, 0, NOW);
    assert.ok(state[k2], "the losing variant has its own record");
    assert.equal(state[k3], undefined, "its sibling depth is untouched");
    assert.equal(state[`follow|${IND}|axis`], undefined, "no pair-level Axis record");
  });
});
