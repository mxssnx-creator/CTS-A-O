import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Protect, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, type WalkForwardResult } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
const H = 3_600_000;
const M = 60_000;
const SYM = "AAA-USDT";
const IND = "ema-9-21@m1";
const base: Protect = { tp: .01, sl: .01, trail: 0, hold: 60 };
const cells: Protect[] = [
  { ...base, tag: "mn" },
  { ...base, tag: "sh" },
  { ...base, exitType: "historic", exitSide: 1, exitSet: "static-sl" },
  { ...base, trail: .005, tag: "gn" },
];
const ids = cells.map((p) => configId("follow", IND, p));
const drain = (g: Generator<number, void>) => { while (!g.next().done) { /* run all slices */ } };

describe("paper reconciles only the held order's own exit", () => {
  for (const mode of ["full", "fast"] as const) {
    it(`${mode} keeps missing entries, including old and tick-crossed ones, until their exact close is available`, () => {
      const db = new CoreDb(":memory:");
      const rt = new CoreRuntime(db, { live: { enabled: false } }, { market: "synthetic", replay: true, priceStream: null });
      rt.stop();
      const end = Math.floor(Date.now() / H) * H, entryT = end - 72 * H;
      const positions: OpenPosition[] = ids.map((cfg, i) => ({
        cfg, sym: SYM, side: 1, entryT, entryI: 0, entry: 100, stop: 99,
        target: 101, peak: 100, trailOn: false, mtm: 0,
        ...(i === 3 ? { trail: .005, trailDist: .005 } : {}),
      }));
      const close = (i: number, side: 1 | -1, exit: number): Trade => ({
        cfg: ids[i], sym: SYM, side, entryT, exitT: entryT + M, entry: 100, exit,
        r: side * (exit - 100) / 100 - .0015, reason: exit > 100 ? "tp" : "sl",
        bars: 1, mfe: 0, mae: 0, kind: i === 2 ? "exit" : "normal",
      });
      const tape = (i: number, rows: Trade[]) => makeTape(ids[i], "follow", IND, cells[i],
        i === 2 ? "exit" : i === 3 ? "trailing" : "normal", [SYM], rows, [], []);
      rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), lastN: 0, validLastN: 0, basePassed: undefined,
        rangeOpts: undefined, coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false } };
      const future = { ...close(1, 1, 101), exitT: end + H, vol: 1, mult: 1 };
      rt.sim = { startT: end - 12 * H, endT: end, trades: [future], feed: [], steps: [] } as unknown as WalkForwardResult;
      // An existing tape with the opposite side is not proof of this side's close; one tape is absent altogether.
      rt.tapes = [tape(0, []), tape(1, [close(1, -1, 99), future]), tape(2, [close(2, 1, 101)])];
      rt.paper.startedAt = end - 73 * H;
      rt.paper.trades = [future];
      rt.paper.positions = positions.map((p, i) => ({ ...p, vol: i + 1, level: 0,
        ...(i === 0 ? { stopHit: end - M, hitPx: 99 } : {}) }));
      const hooks = rt as unknown as {
        lastSelection: unknown;
        stepPaperGen(fast?: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number; refreshHeld?: boolean }, reuse?: boolean): Generator<number, void>;
      };
      hooks.lastSelection = { picks: [], eligible: 0 };
      const step = () => drain(mode === "full" ? hooks.stepPaperGen(undefined, true)
        : hooks.stepPaperGen({ opens: new Map(ids.map((id) => [id, []])), t: end, refreshHeld: true }));
      try {
        step();
        assert.deepEqual(rt.paper.positions.map((p) => p.cfg).sort(), [ids[0], ids[1], ids[3]].sort());
        assert.equal(rt.paper.positions.find((p) => p.cfg === ids[0])?.stopHit, end - M);
        assert.equal(rt.paper.positions.find((p) => p.cfg === ids[3])?.trailDist, .005);
        const initial = db.all<{ cfg: string; reason: string }>("SELECT cfg,reason FROM paper_book_trades ORDER BY cfg");
        assert.deepEqual(initial.map((r) => [r.cfg, r.reason]), [[ids[2], "tp"]]);
        // Later the Short lane's own close is available. The fresh simulation uses a different multiplier;
        // the owned paper record must keep the volume captured when the position opened.
        const own = { ...close(1, 1, 101), vol: 1, mult: 1 };
        rt.tapes = [tape(0, []), tape(1, [close(1, -1, 99), own]), tape(2, [close(2, 1, 101)])];
        rt.sim!.trades = [own];
        rt.paper.trades = [own];
        step();
        assert.deepEqual(rt.paper.positions.map((p) => p.cfg).sort(), [ids[0], ids[3]].sort());
        const settled = db.all<{ cfg: string; reason: string }>("SELECT cfg,reason FROM paper_book_trades ORDER BY cfg");
        assert.deepEqual(settled.map((r) => r.cfg), [ids[1], ids[2]].sort());
        assert.ok(settled.every((r) => r.reason === "tp"));
        const captured = db.get<{ r: number; vol: number; mult: number }>(
          "SELECT r,vol,mult FROM paper_book_trades WHERE cfg=?", ids[1]);
        assert.ok(captured);
        assert.ok(Math.abs(captured.r - own.r * 2) < 1e-12);
        assert.equal(captured.vol, 2);
        assert.equal(captured.mult, 2);
      } finally { rt.dispose(); db.db.close(); }
    });
  }

  it("an exact pre-window close is recorded without inventing a temporary gain in current equity", () => {
    const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, { live: { enabled: false } },
      { market: "synthetic", replay: true, priceStream: null });
    rt.stop();
    const end = Math.floor(Date.now() / H) * H, entryT = end - 72 * H, cfg = ids[1];
    const closed: Trade = { cfg, sym: SYM, side: 1, entryT, exitT: entryT + M, entry: 100, exit: 101,
      r: .0085, reason: "tp", bars: 1, mfe: 0, mae: 0, kind: "normal" };
    rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), lastN: 0, validLastN: 0, basePassed: undefined,
      rangeOpts: undefined, coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false } };
    rt.sim = { startT: end - 12 * H, endT: end, trades: [], feed: [], steps: [] } as unknown as WalkForwardResult;
    rt.tapes = [makeTape(cfg, "follow", IND, cells[1], "normal", [SYM], [closed], [], [])];
    rt.paper.startedAt = end - H;
    rt.paper.positions = [{ cfg, sym: SYM, side: 1, entryT, entryI: 0, entry: 100, stop: 99,
      target: 101, peak: 100, trailOn: false, mtm: 0, vol: 2, level: 0 }];
    const hooks = rt as unknown as { lastSelection: unknown; stepPaperGen(f?: undefined, reuse?: boolean): Generator<number, void> };
    hooks.lastSelection = { picks: [], eligible: 0 };
    try {
      drain(hooks.stepPaperGen(undefined, true));
      assert.equal(rt.paper.positions.length, 0);
      assert.equal(rt.paper.equity, 0, "pre-window funding is unavailable and must not become current P&L");
      assert.equal(db.get<{ reason: string }>("SELECT reason FROM paper_book_trades WHERE cfg=?", cfg)?.reason, "tp");
      drain(hooks.stepPaperGen(undefined, true));
      assert.equal(rt.paper.equity, 0, "the next step uses the same accounting window");
    } finally { rt.dispose(); db.db.close(); }
  });

  it("does not assign a legacy side-less crossing to the opposite held direction", () => {
    const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, { live: { enabled: false } },
      { market: "synthetic", replay: true, priceStream: null });
    rt.stop();
    const end = Math.floor(Date.now() / H) * H, entryT = end - H, cfg = ids[1];
    const opens: OpenPosition[] = ([1, -1] as const).map((side) => ({ cfg, sym: SYM, side, entryT,
      entryI: 0, entry: 100, stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0 }));
    rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), lastN: 0, validLastN: 0, basePassed: undefined,
      rangeOpts: undefined, coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false } };
    rt.sim = { startT: end - 12 * H, endT: end, trades: [], feed: [], steps: [] } as unknown as WalkForwardResult;
    rt.tapes = [makeTape(cfg, "follow", IND, cells[1], "normal", [SYM], [], opens, [])];
    rt.paper.positions = opens.map((p) => ({ ...p, vol: 1, level: 0 }));
    const legacy = `${cfg}|${SYM}|${entryT}`, long = `${cfg}|${SYM}|1|${entryT}`;
    db.kvSet("stopHits", { [legacy]: { at: end - M, stop: 99 }, [long]: { at: end - M, stop: 99 } });
    const hooks = rt as unknown as { lastSelection: unknown; stepPaperGen(f?: undefined, reuse?: boolean): Generator<number, void> };
    hooks.lastSelection = { picks: [], eligible: 0 };
    try {
      drain(hooks.stepPaperGen(undefined, true));
      assert.equal(rt.paper.positions.find((p) => p.side === 1)?.stopHit, end - M);
      assert.equal(rt.paper.positions.find((p) => p.side === -1)?.stopHit, undefined);
    } finally { rt.dispose(); db.db.close(); }
  });
});
