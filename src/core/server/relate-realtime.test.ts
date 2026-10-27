import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RELATE_ADJUSTMENT, DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, RelateParts, Trade } from "../domain/types.ts";
import { orderKey } from "../sizing.ts";
import { defaultWalkForward, makeTape, type BlockFeedEntry, type ConfigTape, type WalkForwardResult } from "../sim/walkforward.ts";
import type { RelateBook } from "../sim/relate-volume.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const H = 3_600_000;
const id = { cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc", sym: "AAA-USDT", side: 1 as const,
  ind: "ema-9-21@m1", strategy: "normal", coordination: "ordinary", range: "mc" };
const sources = { config: true, overall: false, symbol: false, direction: false, indication: false,
  strategy: false, coordination: false, range: false };
const config = { ...DEFAULT_RELATE_ADJUSTMENT, enabled: true, auto: false, ratio: 0.2, steps: 5,
  minTrades: 60, lastN: 250, activeStep: 2, sources };
const feed = (count: number, lastLoss = false): BlockFeedEntry[] => Array.from({ length: count }, (_, i) => ({
  cfg: id.cfg, sym: id.sym, side: 1, ind: id.ind, type: "normal", kind: "none",
  entryT: i * H, exitT: i * H + H / 2, r: lastLoss && i === count - 1 ? -0.01 : 0.01,
  accepted: true, relateMeasured: true, relateBase: 1,
}));
const trade = (entryT: number): Trade => ({ cfg: id.cfg, sym: id.sym, side: 1, entryT,
  exitT: entryT + H / 2, entry: 100, exit: 101, r: 0.01, reason: "tp", bars: 2,
  mfe: 0, mae: 0, kind: "normal" });
const tape = (row: Trade): ConfigTape => makeTape(id.cfg, "follow", id.ind,
  { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag: "mc" }, "normal", [id.sym], [row], [], []);
type Hooks = {
  wf: ReturnType<typeof defaultWalkForward>;
  sim: WalkForwardResult | null;
  tapes: ConfigTape[];
  paper: { positions: Array<OpenPosition & { vol?: number }>; selected: string[] };
  realtimeLearning: { sim: WalkForwardResult; feed: BlockFeedEntry[]; accepted: Trade[] } | null;
  relateShadowPending: Map<string, { entryT: number; base: number; parts: RelateParts }>;
  lastSelection: { picks: Array<{ id: string; score: number; window: { n: number; net: number; pf: number; ddt: number } }>; eligible: number } | null;
  stepPaperGen(fast: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld?: boolean }): Generator<number, void>;
  booksAt(): ((t: number) => { relate: RelateBook | null });
  appendRealtimeLearningGen(tapes: readonly ConfigTape[]): Generator<number, void>;
};
function fixture(rows: BlockFeedEntry[]) {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, { relate: config } as never, { market: "synthetic", priceStream: null });
  const hooks = rt as unknown as Hooks;
  hooks.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), relate: config };
  hooks.sim = { feed: rows } as unknown as WalkForwardResult;
  hooks.tapes = [];
  hooks.paper.positions = [];
  return { rt, db, hooks };
}
const drain = (g: Generator<number, void>) => { for (let r = g.next(); !r.done; r = g.next()) { /* drain */ } };

describe("Relate realtime learning", () => {
  it("keeps a DCA entry's reserved multiplier as later ladder legs fill", () => {
    for (const tag of ["mc", "mn"] as const) {
      const { rt, db, hooks } = fixture([]);
      try {
        const cfg = id.cfg.replace(/\|mc$/, `|${tag}|dc2s1q0g0.5r2.5|dca`);
        const protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag,
          dca: { levels: 2, step: 0.01, addRatio: 2.5 } };
        const row: Trade = { ...trade(61 * H), cfg, kind: "dca" };
        const tp = makeTape(cfg, "follow", id.ind, protect, "dca", [id.sym], [row], [], []);
        hooks.wf = { ...hooks.wf, lastN: 0, validLastN: 0, basePassed: undefined, rangeOpts: undefined,
          probe: { perRange: 0, perCell: 1 },
          relate: { ...config, activeStep: 0, maxStack: 2 },
          toggles: { ...hooks.wf.toggles, normal: false, block: false, dca: true, dcaActive: false },
          coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false } };
        rt.settings.live.liveLastN = 0;
        hooks.sim = { ...hooks.sim!, startT: 0, endT: 60 * H, trades: [],
          steps: [{ t: 60 * H, real: [cfg] }] } as unknown as WalkForwardResult;
        hooks.tapes = [tp];
        hooks.paper.selected = [cfg];
        hooks.lastSelection = { picks: [{ id: cfg, score: 1, window: { n: 60, net: 1, pf: 2, ddt: 0 } }], eligible: 1 };
        const open: OpenPosition = { ...row, entryI: 0, stop: 99, target: 101, peak: 100,
          trailOn: false, mtm: 0, w: 1 };
        drain(hooks.stepPaperGen({ opens: new Map([[cfg, [open]]]), t: row.entryT }));
        assert.equal(hooks.paper.positions.length, 1, `${tag}: ${JSON.stringify(rt.status.paperSkips)}`);
        assert.ok(Math.abs(hooks.paper.positions[0].vol! - 1 / 3) < 1e-10);
        drain(hooks.stepPaperGen({ opens: new Map([[cfg, [{ ...open, w: 6 }]]]), t: row.entryT + H, refreshHeld: true }));
        assert.equal(hooks.paper.positions.length, 1);
        assert.ok(Math.abs(hooks.paper.positions[0].vol! - 2) < 1e-10,
          `${tag}: all later filled legs fit the original two-unit ceiling, got ${hooks.paper.positions[0].vol}`);
      } finally { rt.dispose(); db.db.close(); }
    }
  });
  it("creates Active shadow entries through the real paper step and recovers after their closes", () => {
    const { rt, db, hooks } = fixture(feed(60, true));
    try {
      hooks.wf = { ...hooks.wf, lastN: 0, validLastN: 0, basePassed: undefined, rangeOpts: undefined,
        probe: { perRange: 0, perCell: 1 },
        toggles: { ...hooks.wf.toggles, normal: true, block: false, blockActive: false },
        coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false } };
      rt.settings.live.liveLastN = 0;
      hooks.sim = { ...hooks.sim!, startT: 0, endT: 60 * H, trades: [],
        steps: [{ t: 60 * H, real: [id.cfg] }] } as unknown as WalkForwardResult;
      hooks.realtimeLearning = { sim: hooks.sim, feed: [...hooks.sim.feed], accepted: [] };
      hooks.tapes = [tape(trade(61 * H))];
      hooks.paper.selected = [id.cfg];
      hooks.lastSelection = { picks: [{ id: id.cfg, score: 1, window: { n: 60, net: 1, pf: 2, ddt: 0 } }], eligible: 1 };
      for (let i = 0; i < 2; i++) {
        const row = trade((61 + i) * H);
        const open: OpenPosition = { ...row, entryI: 0, stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0 };
        drain(hooks.stepPaperGen({ opens: new Map([[id.cfg, [open]]]), t: row.entryT }));
        assert.equal(hooks.paper.positions.length, 0, "Active-only entry is skipped");
        assert.ok(hooks.relateShadowPending.has(orderKey(row)), JSON.stringify(rt.status.paperSkips));
        drain(hooks.appendRealtimeLearningGen([tape(row)]));
      }
      const row = trade(63 * H);
      const open: OpenPosition = { ...row, entryI: 0, stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0 };
      drain(hooks.stepPaperGen({ opens: new Map([[id.cfg, [open]]]), t: row.entryT }));
      assert.equal(hooks.paper.positions.length, 1, JSON.stringify(rt.status.paperSkips));
      assert.equal(hooks.paper.positions[0].relateVol, 1.44);
      const book = hooks.booksAt()(64 * H).relate!;
      assert.equal(book.summary().closes, 60);
      assert.equal(book.summary().shadowCloses, 2);
    } finally {
      rt.dispose();
      db.db.close();
    }
  });

  it("does not carry pending shadow entries across an economic settings revision", () => {
    const { rt, db, hooks } = fixture(feed(60, true));
    try {
      const row = trade(61 * H);
      hooks.relateShadowPending.set(orderKey(row), { entryT: row.entryT, base: 1,
        parts: { config: { volume: 1, level: 0, shadow: true } } });
      rt.updateSettings({ live: { minFreeMargin: 1 } } as never);
      assert.equal(hooks.relateShadowPending.size, 1, "a live-only cap edit does not alter the relation policy");
      rt.updateSettings({ relate: { activeStep: 1 } } as never);
      assert.equal(hooks.relateShadowPending.size, 0, "a changed policy cannot consume a prior skipped entry");
      drain(hooks.appendRealtimeLearningGen([tape(row)]));
      assert.equal(hooks.realtimeLearning!.feed.at(-1)!.relateShadow, undefined);
    } finally {
      rt.dispose();
      db.db.close();
    }
  });

  it("replays Active-only shadow closes without adding them to accepted PF", () => {
    const { rt, db, hooks } = fixture(feed(60, true));
    try {
      for (let i = 0; i < 2; i++) {
        const row = trade((61 + i) * H);
        const before = hooks.booksAt()(row.entryT).relate!.decide(id);
        assert.equal(before.allowed, false);
        hooks.relateShadowPending.set(orderKey(row), { entryT: row.entryT, base: 1, parts: before.parts });
        drain(hooks.appendRealtimeLearningGen([tape(row)]));
        const added = hooks.realtimeLearning!.feed.at(-1)!;
        assert.equal(added.accepted, false);
        assert.equal(added.relateShadow, true);
        assert.equal(hooks.relateShadowPending.has(orderKey(row)), false);
      }
      const book = hooks.booksAt()(64 * H).relate!;
      const next = book.decide(id);
      assert.equal(next.allowed, true);
      assert.equal(next.volume, 1.44);
      assert.equal(book.summary().closes, 60);
      assert.equal(book.summary().shadowCloses, 2);
      assert.equal(hooks.realtimeLearning!.accepted.length, 0);
    } finally {
      rt.dispose();
      db.db.close();
    }
  });

  it("continues from a held paper entry's captured relation portion after it settles", () => {
    const { rt, db, hooks } = fixture(feed(59));
    try {
      hooks.wf = { ...hooks.wf, relate: { ...config, activeStep: 0 } };
      const row = trade(61 * H);
      hooks.paper.positions = [{ ...row, entryI: 0, stop: 99, target: 101, peak: 100,
        trailOn: false, mtm: 0, vol: 3.6, relateVol: 1.2, relateMeasured: true,
        relateBase: 3, relateParts: { config: { volume: 3.6, level: 1 } } }];
      drain(hooks.appendRealtimeLearningGen([tape(row)]));
      const stored = hooks.realtimeLearning!.feed.at(-1)!;
      assert.equal(stored.accepted, true);
      assert.equal(stored.relateBase, 3);
      assert.equal(stored.relateParts?.config?.volume, 3.6);
      const next = hooks.booksAt()(63 * H).relate!.decide(id, 2);
      assert.equal(next.volume, 2.16);
      assert.equal(hooks.realtimeLearning!.accepted[0].mult, 3.6);
    } finally {
      rt.dispose();
      db.db.close();
    }
  });
});
