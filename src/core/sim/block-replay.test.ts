// The self-audit's replay of Block volumes and levels with the pooled window chosen by results (block.windowAuto).
// The simulation feeds an AutoBlockBook (blockBookOf); the replay has to judge every entry with the same book, or
// it re-derives the levels at the configured fallback window and flags the volumes the auto window produced
// (x01 since 3 Oct: "replay … volume ≠ 1665 · level ≠ 453 · … vol 4 ≠ 7").
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditState } from "../audit.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { AutoBlockBook } from "./block.ts";
import {
  defaultWalkForward,
  feedBooks,
  makeTape,
  walkForward,
  type ConfigTape,
  type WalkForwardOptions,
} from "./walkforward.ts";
import type { BlockConfig, StratKind, Trade } from "../domain/types.ts";

const H = 3_600_000;
const M = 60_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const SYMS = ["AAA-USDT", "BBB-USDT", "CCC-USDT", "DDD-USDT"];
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const COST = DEFAULT_SETTINGS.cost;

/** Engine, signal and Axis configs on four symbols, long and short, with day-long winning / losing regimes. */
function tapesOf(seed: number): ConfigTape[] {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out: ConfigTape[] = [];
  let k = 0;
  for (const ind of ["rsi-mom-14-20@m15", "sig-ema-cross-s@m15", "trend-ema-5-20@m5c"])
    for (let c = 0; c < 3; c++)
      for (const kind of ["normal", "trailing", "axis"] as StratKind[]) {
        k++;
        const cfg = `follow|${ind}|tp${1 + c * 0.2}|sl1|tr0|h32${kind === "normal" ? "" : `|${kind}`}`;
        const trades: Trade[] = [];
        for (const sym of SYMS)
          for (const side of [1, -1])
            for (
              let e = T0 + Math.floor(rnd() * 4) * 15 * M;
              e < NOW - 2 * H;
              e += (15 + 15 * Math.floor(rnd() * 3)) * M
            ) {
              const phase = Math.sin((e - T0) / (7 * H) + k + side);
              const r = rnd() < 0.56 + 0.25 * phase ? 0.01 : -0.01;
              const hold = (15 + Math.floor(rnd() * 6) * 15) * M;
              trades.push({
                cfg,
                sym,
                side,
                entryT: e,
                exitT: e + hold,
                entry: 100,
                exit: 100 * (1 + side * (r + COST)),
                r,
                reason: r > 0 ? "tp" : "sl",
                bars: 2,
                mfe: 0,
                mae: 0,
                kind,
              } as Trade);
            }
        out.push(makeTape(cfg, "follow", ind, P, kind, SYMS, trades, [], []));
      }
  return out;
}

const base = defaultWalkForward(DEFAULT_SETTINGS);
/** x01: Block overall over the pooled sources, ratio 0.5, 7 steps, max 4×, Block Active from level 5, auto window. */
const x01Block: BlockConfig = {
  ...base.block,
  sources: { config: false, overall: true, symbol: true, direction: true, indication: true, type: false },
  mode: "overall",
  ratio: 0.5,
  maxLevel: 8,
  minActiveLevel: 5,
  maxMult: 4,
  pause: 0,
  steps: 7,
  window: 5,
  windowAuto: true,
  windowCandidates: [5, 10, 15, 25, 35],
  excludeKinds: ["axis"],
};
const x01 = (block: Partial<BlockConfig> = {}): WalkForwardOptions => ({
  ...base,
  toggles: { normal: true, trailing: true, block: true, blockActive: true, dca: false, dcaActive: false, axis: true },
  block: { ...x01Block, ...block },
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  symGate: "provenSide",
  simH: 48,
  validLastN: 25,
  lastN: 35,
  signalValidLastN: 10,
  normalBaseMinPf: 1.05,
  signalOwnBase: true,
  robustFrac: 0,
  maxPositions: 0,
  seatPer: "config",
  cost: COST,
});
const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;
const vols = (xs: readonly Trade[]) => xs.map((x) => `${x.cfg}|${x.sym}|${x.entryT}|${x.mult ?? 1}|${x.level ?? 0}`);

describe("audit replay with the Block window chosen by results (windowAuto)", () => {
  const tapes = tapesOf(7);

  it("the auto window moves away from the fallback: its volumes differ from the fixed window's", () => {
    const auto = walkForward(u, tapes, x01());
    const fixed = walkForward(u, tapes, x01({ windowAuto: false }));
    assert.ok(auto.trades.some((x) => (x.mult ?? 1) > 1), "Block raises entries");
    assert.notDeepEqual(vols(auto.trades), vols(fixed.trades));
    // the feed alone picks a window other than the fallback 5 during the run
    const book = new AutoBlockBook(x01Block);
    const picked = new Set<number>();
    for (const e of auto.feed) {
      feedBooks(e, book);
      picked.add(book.window);
    }
    assert.ok([...picked].some((w) => w !== 5), `windows ${[...picked]}`);
  });

  for (const mode of ["overall", "shared", "additive"] as const)
    for (const pause of [0, 2])
      it(`${mode}, pause ${pause}: every trade replays with its recorded Block volume and level`, () => {
        const o = x01({ mode, pause });
        const sim = walkForward(u, tapes, o);
        assert.ok(sim.trades.length > 0);
        const audit = auditState({ sim, tapes, cost: COST });
        const replay = audit.checks.find((c) => c.name.startsWith("replay"));
        assert.ok(replay, "the replay check runs");
        assert.ok(replay.ok, replay.detail);
        assert.deepEqual(
          audit.checks.filter((c) => !c.ok),
          [],
        );
      });

  it("a fixed window still replays clean", () => {
    const sim = walkForward(u, tapes, x01({ windowAuto: false, window: 25 }));
    const audit = auditState({ sim, tapes, cost: COST });
    assert.deepEqual(
      audit.checks.filter((c) => !c.ok),
      [],
    );
  });
});
