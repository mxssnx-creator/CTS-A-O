// Independent configs (wf.seatPer "config"): every config is judged on its own results only. Adding, removing or
// changing a sibling config (another TP / SL / trailing variant or strategy type of the same indication) never
// changes whether a config takes a seat or what it trades. Guards against selection that pools configs together.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWalkForward,
  execDecision,
  makeTape,
  selectAt,
  selectFixed,
  walkForward,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { BlockBook } from "./block.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { StratKind, Trade } from "../domain/types.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const IND = "rsi-mom-14-20@m15";
const id = (tp: number, kind = "") => `follow|${IND}|tp${tp}|sl1|tr0|h32${kind ? `|${kind}` : ""}`;

/** 100 hourly closes (`lose` losers spread evenly, `win` size for winners) and one entry in the simulated window. */
function trades(cfg: string, lose: number, win = 0.01, kind: StratKind = "normal"): Trade[] {
  const mk = (r: number, entryT: number): Trade =>
    ({
      cfg,
      sym: "AAA-USDT",
      side: 1,
      entryT,
      exitT: entryT + 30 * 60_000,
      entry: 100,
      exit: 100 * (1 + r),
      r,
      reason: r > 0 ? "tp" : "sl",
      bars: 2,
      mfe: 0,
      mae: 0,
      kind,
    }) as Trade;
  const out: Trade[] = [];
  const every = lose > 0 ? Math.floor(100 / lose) : Infinity;
  for (let i = 0; i < 100; i++)
    out.push(mk(i % every === every - 1 ? -0.01 : win, NOW - 120 * H + i * H));
  out.push(mk(win, NOW - 2 * H + 10 * 60_000));
  return out;
}
const tape = (cfg: string, lose: number, win = 0.01, kind: StratKind = "normal") =>
  makeTape(cfg, "follow", IND, P, kind, ["AAA-USDT"], trades(cfg, lose, win, kind), [], []);

const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: {
    normal: true,
    trailing: true,
    block: false,
    blockActive: false,
    dca: true,
    dcaActive: false,
    axis: true,
  },
  symGate: undefined,
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 6,
  validLastN: 0,
  lastN: 0,
  robustFrac: 0,
};
const indep: WalkForwardOptions = { ...base, seatPer: "config" };
const u = {
  bars: [],
  caches: [],
  startT: T0,
  endT: NOW,
  splitT: T0,
  nowT: NOW,
  baseTf: 60,
} as never;
const t = NOW - 3 * H;
const ids = (r: { picks: Array<{ id: string }> }) => r.picks.map((p) => p.id).sort();
const selectors = {
  fixed: selectFixed,
  hourly: selectAt,
};

describe("independent configs (seatPer config)", () => {
  for (const [name, select] of Object.entries(selectors)) {
    it(`${name}: every passing variant of one indication takes its own seat`, () => {
      const a = tape(id(1), 5);
      const b = tape(id(2), 10, 0.02);
      // pair seats keep one config of the pair (the best scored): the other is dropped although it passed
      assert.equal(select([a, b], t, base).picks.length, 1);
      assert.deepEqual(ids(select([a, b], t, indep)), [id(1), id(2)].sort());
    });

    it(`${name}: a sibling never changes another config's seat`, () => {
      const a = tape(id(1), 5);
      const alone = ids(select([a], t, indep));
      assert.deepEqual(alone, [id(1)]);
      // a better sibling, a losing sibling, many siblings: the config keeps its seat
      for (const sibs of [
        [tape(id(2), 0, 0.03)],
        [tape(id(3), 70)],
        [2, 3, 4, 5, 6].map((k) => tape(id(k), 2, 0.02)),
      ]) {
        assert.ok(
          ids(select([a, ...sibs], t, indep)).includes(id(1)),
          `with ${sibs.length} sibling(s)`,
        );
      }
      // a losing config stays out whatever its siblings do
      const bad = tape(id(9), 70);
      assert.equal(ids(select([bad, tape(id(2), 0, 0.03)], t, indep)).includes(id(9)), false);
    });
  }

  it("DCA / Axis are judged on their own results, not against the pair's base", () => {
    const dca = tape(id(1, "dca"), 5, 0.01, "dca");
    // the pair's base is far better: pair seats drop the DCA config (it must beat the base)
    const strongBase = tape(id(2), 2, 0.05);
    assert.equal(ids(selectFixed([dca, strongBase], t, base)).includes(id(1, "dca")), false);
    assert.ok(ids(selectFixed([dca, strongBase], t, indep)).includes(id(1, "dca")));
    // no base at all: still seated on its own
    assert.deepEqual(ids(selectFixed([dca], t, indep)), [id(1, "dca")]);
  });

  it("a config's trades are the same with and without its siblings", () => {
    const a = tape(id(1), 5);
    const mine = (tps: ReturnType<typeof tape>[]) =>
      walkForward(u, tps, indep)
        .trades.filter((x) => x.cfg === id(1))
        .map((x) => `${x.entryT}|${x.exitT}|${x.r}`);
    const alone = mine([a]);
    assert.ok(alone.length > 0, "the config trades");
    assert.deepEqual(
      mine([a, tape(id(2), 0, 0.03), tape(id(3), 70), tape(id(4), 10, 0.02)]),
      alone,
    );
  });

  it("Block on the config's own results: the decision ignores every other position", () => {
    const o: WalkForwardOptions = {
      ...indep,
      toggles: { ...indep.toggles, block: true, blockActive: false },
      block: {
        ...indep.block,
        sources: {
          config: true,
          overall: false,
          symbol: false,
          direction: false,
          indication: false,
          type: false,
        },
      },
    };
    const a = tape(id(1), 5);
    const at = NOW - 2 * H + 10 * 60_000;
    const alone = execDecision(a, at, o, { sym: "AAA-USDT", side: 1, book: null });
    // a book full of other configs' wins (every pooled level at its top) does not move it
    const book = new BlockBook(0);
    for (let i = 0; i < 20; i++)
      book.add({ sym: "AAA-USDT", side: 1, kind: "osc", r: 0.02, type: "normal", cfg: id(2) });
    const withBook = execDecision(a, at, o, { sym: "AAA-USDT", side: 1, book });
    assert.deepEqual(withBook, alone);
    // the pooled sources would raise it: the config-only Block is what keeps it independent
    const pooled = { ...o, block: { ...o.block, sources: { ...o.block.sources, overall: true } } };
    assert.notDeepEqual(execDecision(a, at, pooled, { sym: "AAA-USDT", side: 1, book }), alone);
  });

  it("signals on their own Block record (signalsOwn): the pooled book never raises or skips a signal", () => {
    const SIG = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32";
    const sig = makeTape(SIG, "follow", "sig-ema-cross-s@m15", P, "normal", ["AAA-USDT"], trades(SIG, 5), [], []);
    const pooledSources = { config: false, overall: true, symbol: true, direction: true, indication: true, type: false };
    const o: WalkForwardOptions = {
      ...indep,
      signalValidLastN: 0,
      toggles: { ...indep.toggles, block: true, blockActive: false },
      block: { ...indep.block, sources: pooledSources, signalsOwn: true },
    };
    const at = NOW - 2 * H + 10 * 60_000;
    const book = new BlockBook(0);
    for (let i = 0; i < 20; i++)
      book.add({ sym: "AAA-USDT", side: 1, kind: "osc", r: 0.02, type: "normal", cfg: id(2) });
    const ctx = { sym: "AAA-USDT", side: 1 };
    const own = execDecision(sig, at, o, { ...ctx, book });
    assert.deepEqual(own, execDecision(sig, at, o, { ...ctx, book: null }), "the book does not move it");
    // its own record decides: the same as config-only sources
    const cfgOnly = { ...o, block: { ...o.block, signalsOwn: false, sources: { config: true } } };
    assert.deepEqual(own, execDecision(sig, at, cfgOnly, { ...ctx, book }));
  });
});
