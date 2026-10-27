import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition } from "../domain/types.ts";
import { defaultWalkForward, makeTape, type WalkForwardResult } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
const H = 3_600_000;
const CFG = "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc";
const SYM = "AAA-USDT";
const position = (entryT: number): OpenPosition => ({ cfg: CFG, sym: SYM, side: 1, entryI: 0,
  entryT, entry: 100, stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0 });
const drain = (g: Generator<number, void>) => { for (let x = g.next(); !x.done; x = g.next()) { /* drain */ } };

function fixture(replay: boolean, entryT: number, endT: number) {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "bingx", replay, priceStream: null });
  rt.stop();
  const op = position(entryT);
  rt.wf = { ...defaultWalkForward(DEFAULT_SETTINGS), lastN: 0, validLastN: 0, basePassed: undefined,
    rangeOpts: undefined, probe: { perRange: 0, perCell: 1 },
    toggles: { ...rt.wf.toggles, normal: true, block: false },
    coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false } };
  rt.sim = { startT: endT - 12 * H, endT, trades: [], feed: [],
    steps: [{ t: Math.floor(entryT / H) * H, real: [CFG] }] } as unknown as WalkForwardResult;
  rt.tapes = [makeTape(CFG, "follow", "ema-9-21@m1", { tp: .01, sl: .01, trail: 0, hold: 32, tag: "mc" },
    "normal", [SYM], [], [op], [])];
  rt.paper.selected = [CFG];
  const hooks = rt as unknown as {
    lastSelection: unknown;
    stepPaperGen(fast?: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number }, reuse?: boolean): Generator<number, void>;
  };
  hooks.lastSelection = { picks: [{ id: CFG, score: 1, window: { n: 60, net: 1, pf: 2, ddt: 0 } }], eligible: 1 };
  return { rt, db, op, hooks };
}

describe("paper entry age after a delayed computation", () => {
  for (const mode of ["full", "fast"] as const) {
    const run = (f: ReturnType<typeof fixture>, t: number) => drain(mode === "full"
      ? f.hooks.stepPaperGen(undefined, true)
      : f.hooks.stepPaperGen({ opens: new Map([[CFG, [f.op]]]), t }));

    it(`${mode}: an old market snapshot cannot open an hours-old position`, () => {
      const now = Math.floor(Date.now() / H) * H, old = now - 3 * H + H / 2, end = now - 2 * H;
      const f = fixture(false, old, end);
      try {
        run(f, end);
        assert.equal(f.rt.paper.positions.length, 0);
        assert.equal(f.rt.status.paperSkips?.stale, 1);
      } finally { f.rt.dispose(); f.db.db.close(); }
    });

    it(`${mode}: current entries and already held positions still proceed`, () => {
      const now = Math.floor(Date.now() / H) * H;
      const recent = fixture(false, now - H / 4, now);
      const held = fixture(false, now - 3 * H + H / 2, now - 2 * H);
      try {
        run(recent, now);
        assert.equal(recent.rt.paper.positions.length, 1, JSON.stringify(recent.rt.status.paperSkips));
        held.rt.paper.positions = [{ ...held.op, vol: 1, level: 0 }];
        run(held, now - 2 * H);
        assert.equal(held.rt.paper.positions.length, 1, "existing protection remains managed");
      } finally { recent.rt.dispose(); recent.db.db.close(); held.rt.dispose(); held.db.db.close(); }
    });

    it(`${mode}: a sliced paper step rechecks the clock if it is delayed`, () => {
      const now = Math.floor(Date.now() / H) * H;
      const f = fixture(false, now - H / 4, now), originalNow = Date.now;
      let clock = now + H / 2;
      try {
        Date.now = () => clock;
        const work = mode === "full" ? f.hooks.stepPaperGen(undefined, true)
          : f.hooks.stepPaperGen({ opens: new Map([[CFG, [f.op]]]), t: now });
        assert.equal(work.next().done, false);
        clock += 3 * H;
        drain(work);
        assert.equal(f.rt.paper.positions.length, 0);
        assert.equal(f.rt.status.paperSkips?.stale, 1);
      } finally { Date.now = originalNow; f.rt.dispose(); f.db.db.close(); }
    });

    it(`${mode}: a candidate that ages out during book preparation is not adopted`, () => {
      const now = Math.floor(Date.now() / H) * H;
      const f = fixture(false, now - H / 4, now), originalNow = Date.now;
      const books = f.rt as unknown as { booksAt(): unknown; realtimeBooksAt(at: number): unknown };
      let clock = now + H / 2;
      const fullBooks = books.booksAt.bind(f.rt), fastBooks = books.realtimeBooksAt.bind(f.rt);
      books.booksAt = () => { clock += 3 * H; return fullBooks(); };
      books.realtimeBooksAt = (at) => { clock += 3 * H; return fastBooks(at); };
      try {
        Date.now = () => clock;
        run(f, now);
        assert.equal(f.rt.paper.positions.length, 0);
        assert.equal(f.rt.status.paperSkips?.stale, 1);
      } finally { Date.now = originalNow; f.rt.dispose(); f.db.db.close(); }
    });

    it(`${mode}: an explicit historical replay retains its own clock`, () => {
      const now = Math.floor(Date.now() / H) * H, old = now - 3 * H + H / 2, end = now - 2 * H;
      const f = fixture(true, old, end);
      try {
        run(f, end);
        assert.equal(f.rt.paper.positions.length, 1, JSON.stringify(f.rt.status.paperSkips));
      } finally { f.rt.dispose(); f.db.db.close(); }
    });
  }
});
