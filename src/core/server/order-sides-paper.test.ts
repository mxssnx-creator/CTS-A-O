// The paper book's order sides, LONG (side 1) and SHORT (side -1), as one matrix. A position held from the tape keeps
// its side and its key (cfg|sym|side|entryT); the trailing stop only moves favourably; a stop or a target exits at its
// level; a closed position books the r of its own side. Two plan items are pinned here: item 1, the paper step's tape
// scan matched a held position by config, symbol and entry time only, now by its side too (the heldSide check in the
// scan); and item 2, the Stable-02 pause (entryHeldBack, runtime.server.ts:5246-5248) compares the bare symbol with
// keys that are sym|±1 while coord.s2Side is off (the default), and the entry's own symbol × direction when it is on.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, crossedExit, sanitizeWf, tickTrail, type TickTrail } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { SIGNAL_SOURCES, signalSettings } from "../signal-config.ts";
import { fakeRt, pinSyntheticEnd, trackRuntimes } from "../test-support.ts";
import { coordSettings, DEFAULT_COORD, makeTape, type ConfigTape, type CoordSettings } from "../sim/walkforward.ts";
import { simulate } from "../sim/backtest.ts";
import { S2Coord } from "../sim/s2coord.ts";
import type { Bars, OpenPosition, Protect, Trade } from "../domain/types.ts";

pinSyntheticEnd();
const H = 3_600_000;
const M = 60_000;
const TF = 15 * M;
const PROTECT = { tp: 0.02, sl: 0.02, trail: 0, hold: 16 } as unknown as Protect;
// an engine config (its indication is not a signal's, so no confirmation or signal gate applies)
const ENG = "follow|ind-syn|tp1|sl1|tr0|h16|syn";

/** the setup runs once, when the first cell asks for it */
function memo<T>(f: () => T): () => T {
  let done = false;
  let v!: T;
  return () => {
    if (!done) {
      v = f();
      done = true;
    }
    return v;
  };
}

/** a closed trade of one config, symbol and side, with the r the simulator books */
const tradeOf = (
  cfg: string,
  sym: string,
  side: 1 | -1,
  entryT: number,
  exitT: number,
  entry: number,
  exit: number,
  r: number,
  reason: Trade["reason"],
) =>
  ({ cfg, sym, side, entryT, exitT, entry, exit, r, reason, bars: 2, mfe: 0, mae: 0, kind: "normal", vol: 1, level: 0 }) as unknown as Trade;

/** an open position of a tape: entered at `entry`, held to its stop and target */
const openOf = (cfg: string, sym: string, side: 1 | -1, entryT: number, entry: number, stop: number, target: number): OpenPosition => ({
  cfg,
  sym,
  side,
  entryT,
  entryI: 0,
  entry,
  stop,
  target,
  peak: entry,
  trailOn: false,
  mtm: 0,
});

/** a tape of one config on one symbol (makeTape keeps the rows in exit order) */
const tapeOf = (cfg: string, sym: string, trades: Trade[], open: OpenPosition[]): ConfigTape =>
  makeTape(cfg, "follow" as never, cfg.split("|")[1], PROTECT, "normal" as never, [sym], trades, open, []);

/** 15-minute bars from t0, each row [open, high, low, close] */
const barsOf = (sym: string, t0: number, rows: number[][]): Bars => {
  const n = rows.length;
  return {
    sym,
    tfMin: 15,
    n,
    t: Float64Array.from(rows, (_, i) => t0 + i * TF),
    o: Float64Array.from(rows, (r) => r[0]),
    h: Float64Array.from(rows, (r) => r[1]),
    l: Float64Array.from(rows, (r) => r[2]),
    c: Float64Array.from(rows, (r) => r[3]),
    v: new Float64Array(n),
  };
};

/** the paper book's identity of a position, as the paper step keys it */
const keyOf = (p: { cfg: string; sym: string; side: number; entryT: number }) => `${p.cfg}|${p.sym}|${p.side}|${p.entryT}`;

const small = {
  symbols: 4,
  historyDays: 18,
  tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  grid: { short: false as const },
  gates: { minPf: 1.0, minTrades: 3, maxDdr: 0 },
  signals: signalSettings({
    exits: "pct",
    sources: Object.fromEntries(SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false])),
  }),
};

const tracked = trackRuntimes();
let rt!: CoreRuntime;
const until = async (c: () => boolean, ms = 300_000) => {
  const t0 = Date.now();
  while (!c()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

/** the paper step's view of the runtime (its private state, as the paper tests read it) */
interface Book {
  stepPaper(): void;
  tapes: ConfigTape[];
  sim: { trades: Trade[] } | undefined;
  paper: { positions: OpenPosition[]; trades: Trade[]; startedAt: number };
  db: CoreDb;
}
const book = () => rt as unknown as Book;

/** the first entry time the book can hold a close at: an hour after its start (every exit is later than its window) */
const base = () => (Math.floor(book().paper.startedAt / H) + 1) * H;

/**
 * one paper step over the real book: the given tapes added to it, the simulation's trades replaced, the held positions
 * set as the book's positions (sized at one unit). The tapes and trades are restored after the step.
 */
function paperStep(tapes: ConfigTape[], trades: Trade[], held: OpenPosition[]) {
  const b = book();
  assert.ok(b.sim, "the compute left a simulation");
  const savedTapes = b.tapes;
  const savedTrades = b.sim!.trades;
  b.tapes = [...savedTapes, ...tapes];
  b.sim!.trades = trades;
  b.paper.positions = held.map((p) => ({ ...p, vol: 1, level: 0 }));
  try {
    b.stepPaper();
  } finally {
    b.tapes = savedTapes;
    b.sim!.trades = savedTrades;
  }
}

describe("paper book, order sides, on the real runtime (items 1 and a, d)", { timeout: 900_000 }, () => {
  before(
    async () => {
      rt = tracked.track(new CoreRuntime(new CoreDb(":memory:"), small as never, { market: "synthetic" }));
      rt.start();
      await until(() => rt.status.computes >= 1 && rt.status.state === "running" && (rt.status.paperSteps ?? 0) >= 1);
      rt.stop();
    },
    { timeout: 600_000 },
  );
  after(async () => {
    await tracked.disposeAll();
  });

  // item 1: one config, one symbol, one entry time; a LONG row closes first and a SHORT row later. The SHORT is held
  // and the simulation holds only the LONG. The scan must book the SHORT's own row.
  const ONE = memo(() => {
    const cfg = `${ENG}-one`;
    const sym = "S0-USDT";
    const E = base();
    const long = tradeOf(cfg, sym, 1, E, E + H, 100, 98, -0.02, "sl");
    const short = tradeOf(cfg, sym, -1, E, E + 2 * H, 100, 98, 0.02, "tp");
    paperStep([tapeOf(cfg, sym, [long, short], [])], [{ ...long }], [openOf(cfg, sym, -1, E, 100, 102, 98)]);
    const b = book();
    const mine = b.paper.trades.filter((x) => x.cfg === cfg && x.sym === sym && x.entryT === E);
    const row =
      b.db.get<{ r: number; exit_t: number; reason: string }>(
        "SELECT r, exit_t, reason FROM paper_book_trades WHERE cfg = ? AND sym = ? AND side = ? AND entry_t = ?",
        cfg,
        sym,
        -1,
        E,
      ) ?? undefined;
    return { short, mine, row };
  });

  it("[item 1] the held SHORT books its own close, at its own exit and with its own r", () => {
    const { short, mine } = ONE();
    const own = mine.find((x) => x.side === -1);
    assert.ok(
      own,
      `the held SHORT has no close of its own; the book holds ${JSON.stringify(mine.map((x) => [x.side, x.exitT, x.r]))}`,
    );
    assert.equal(own!.exitT, short.exitT, "the SHORT's own exit time");
    assert.ok(Math.abs(own!.r - short.r) < 1e-12, `the SHORT's own r ${short.r}, booked ${own!.r}`);
  });

  it("[item 1] the LONG of the same entry is counted once", () => {
    const { mine } = ONE();
    const longs = mine.filter((x) => x.side === 1);
    assert.equal(longs.length, 1, `the LONG close is booked ${longs.length} times`);
  });

  it("[item 1] the SHORT's row in paper_book_trades is its own close (the book's record)", () => {
    const { short, row } = ONE();
    assert.ok(row, "the held SHORT has a paper_book_trades row");
    assert.equal(row!.reason, short.reason, `the row's reason ${row!.reason}`);
    assert.equal(row!.exit_t, short.exitT, "the row's exit time");
    assert.ok(Math.abs(row!.r - short.r) < 1e-12, `the row's r ${row!.r}, the SHORT's own ${short.r}`);
  });

  // item 1, the mirror: a LONG held from the tape whose SHORT row of the same entry exits first. The scan takes the held
  // side's row only, so the LONG's own close is booked, and each side of the entry is booked once.
  const MIRROR = memo(() => {
    const cfg = `${ENG}-mirror`;
    const sym = "S3-USDT";
    const E = base();
    const short = tradeOf(cfg, sym, -1, E, E + H, 100, 102, -0.02, "sl");
    const long = tradeOf(cfg, sym, 1, E, E + 2 * H, 100, 102, 0.02, "tp");
    paperStep([tapeOf(cfg, sym, [short, long], [])], [{ ...short }], [openOf(cfg, sym, 1, E, 100, 98, 102)]);
    const b = book();
    const mine = b.paper.trades.filter((x) => x.cfg === cfg && x.sym === sym && x.entryT === E);
    const row =
      b.db.get<{ r: number; exit_t: number; reason: string }>(
        "SELECT r, exit_t, reason FROM paper_book_trades WHERE cfg = ? AND sym = ? AND side = ? AND entry_t = ?",
        cfg,
        sym,
        1,
        E,
      ) ?? undefined;
    return { long, mine, row };
  });

  it("[item 1, mirror] the held LONG books its own close, at its own exit and with its own r", () => {
    const { long, mine } = MIRROR();
    const own = mine.find((x) => x.side === 1);
    assert.ok(
      own,
      `the held LONG has no close of its own; the book holds ${JSON.stringify(mine.map((x) => [x.side, x.exitT, x.r]))}`,
    );
    assert.equal(own!.exitT, long.exitT, "the LONG's own exit time");
    assert.ok(Math.abs(own!.r - long.r) < 1e-12, `the LONG's own r ${long.r}, booked ${own!.r}`);
  });

  it("[item 1, mirror] the held LONG is booked once, and the SHORT of the same entry once too", () => {
    const { mine } = MIRROR();
    const longs = mine.filter((x) => x.side === 1).length;
    const shorts = mine.filter((x) => x.side === -1).length;
    assert.equal(longs, 1, `the LONG close is booked ${longs} times`);
    assert.equal(shorts, 1, `the SHORT close is booked ${shorts} times`);
  });

  it("[item 1, mirror] the LONG's row in paper_book_trades is its own close (the book's record)", () => {
    const { long, row } = MIRROR();
    assert.ok(row, "the held LONG has a paper_book_trades row");
    assert.equal(row!.reason, long.reason, `the row's reason ${row!.reason}`);
    assert.equal(row!.exit_t, long.exitT, "the row's exit time");
    assert.ok(Math.abs(row!.r - long.r) < 1e-12, `the row's r ${row!.r}, the LONG's own ${long.r}`);
  });

  // a: a LONG and a SHORT of one config, symbol and entry, both held from the tape: each keeps its side, prices and key
  const ADOPT = memo(() => {
    const cfg = `${ENG}-adopt`;
    const sym = "S1-USDT";
    const E = base();
    const L = openOf(cfg, sym, 1, E, 100, 98, 102);
    const S = openOf(cfg, sym, -1, E, 100, 102, 98);
    paperStep([tapeOf(cfg, sym, [], [L, S])], [], [L, S]);
    return { cfg, sym, E, kept: book().paper.positions.filter((p) => p.cfg === cfg) };
  });

  it("[a] a LONG held from the tape keeps side 1, its prices and its key", () => {
    const { cfg, sym, E, kept } = ADOPT();
    const p = kept.find((x) => x.side === 1);
    assert.ok(p, `no LONG kept: ${JSON.stringify(kept.map((x) => x.side))}`);
    assert.equal(p!.entry, 100, "its entry");
    assert.equal(p!.stop, 98, "its stop");
    assert.equal(p!.target, 102, "its target");
    assert.equal(keyOf(p!), `${cfg}|${sym}|1|${E}`, "its key sym|+1");
  });

  it("[a] a SHORT held from the tape keeps side -1, its prices and its key", () => {
    const { cfg, sym, E, kept } = ADOPT();
    const p = kept.find((x) => x.side === -1);
    assert.ok(p, `no SHORT kept: ${JSON.stringify(kept.map((x) => x.side))}`);
    assert.equal(p!.entry, 100, "its entry");
    assert.equal(p!.stop, 102, "its stop");
    assert.equal(p!.target, 98, "its target");
    assert.equal(keyOf(p!), `${cfg}|${sym}|-1|${E}`, "its key sym|-1");
  });

  it("[a] the LONG and the SHORT of one entry stay two positions under two keys", () => {
    const { kept } = ADOPT();
    assert.equal(kept.length, 2, "both sides are in the book");
    assert.equal(new Set(kept.map(keyOf)).size, 2, "the keys differ by side");
  });

  // d: a simulated trade on falling and rising bars for each side, held and closed on its tape; the book's own record
  // carries its r, which must take the sign of the price move for the side
  const SIGN_CASES: Array<{ key: string; side: 1 | -1; rows: number[][] }> = [
    {
      key: "long-rise",
      side: 1,
      rows: [
        [100, 100.2, 99.8, 100],
        [100, 100.1, 99.9, 100],
        [100, 102.1, 99.9, 102],
      ],
    },
    {
      key: "short-fall",
      side: -1,
      rows: [
        [100, 100.2, 99.8, 100],
        [100, 100.1, 99.9, 100],
        [100, 100.1, 97.9, 98],
      ],
    },
    {
      key: "long-fall",
      side: 1,
      rows: [
        [100, 100.2, 99.8, 100],
        [100, 100.1, 99.9, 100],
        [100, 100.1, 97.5, 98],
      ],
    },
    {
      key: "short-rise",
      side: -1,
      rows: [
        [100, 100.2, 99.8, 100],
        [100, 100.1, 99.9, 100],
        [100, 102.5, 99.9, 102],
      ],
    },
  ];
  const SIGN = memo(() => {
    const t0 = base();
    const cases = new Map<string, { cfg: string; sym: string; tr: Trade | undefined }>();
    const tapes: ConfigTape[] = [];
    const held: OpenPosition[] = [];
    SIGN_CASES.forEach((c, k) => {
      const cfg = `${ENG}-sign${k}`;
      const sym = `D${k}-USDT`;
      const sig = new Int8Array(c.rows.length);
      sig[0] = c.side;
      const [tr] = simulate(cfg, barsOf(sym, t0, c.rows), sig, PROTECT, { cost: 0 }).trades;
      cases.set(c.key, { cfg, sym, tr });
      if (!tr) return;
      tapes.push(tapeOf(cfg, sym, [tr], []));
      const stop = c.side === 1 ? 98 : 102;
      const target = c.side === 1 ? 102 : 98;
      held.push(openOf(cfg, sym, c.side, tr.entryT, tr.entry, stop, target));
    });
    paperStep(tapes, [], held);
    const b = book();
    const rows = new Map<string, { r: number; exit_t: number; reason: string } | undefined>();
    for (const [key, { cfg, sym, tr }] of cases) {
      if (!tr) continue;
      rows.set(
        key,
        b.db.get<{ r: number; exit_t: number; reason: string }>(
          "SELECT r, exit_t, reason FROM paper_book_trades WHERE cfg = ? AND sym = ? AND side = ? AND entry_t = ?",
          cfg,
          sym,
          tr.side,
          tr.entryT,
        ) ?? undefined,
      );
    }
    return { cases, rows };
  });
  /** the book's record of one held simulated trade: its reason, its exit, and r of the expected sign and size */
  function signCell(key: string, sign: 1 | -1, reason: "tp" | "sl") {
    const { cases, rows } = SIGN();
    const c = cases.get(key)!;
    assert.ok(c.tr, `${key}: the simulator closed no trade`);
    const row = rows.get(key);
    assert.ok(row, `${key}: the held position has no paper_book_trades row`);
    assert.equal(row!.reason, reason, `${key}: reason`);
    assert.equal(row!.exit_t, c.tr!.exitT, `${key}: exit time`);
    assert.equal(Math.sign(row!.r), sign, `${key}: r ${row!.r} has the wrong sign`);
    assert.ok(Math.abs(Math.abs(row!.r) - 0.02) < 1e-9, `${key}: |r| ${Math.abs(row!.r)} is the 2 % move`);
  }

  it("[d] a LONG whose price rises books a positive r", () => signCell("long-rise", 1, "tp"));
  it("[d] a SHORT whose price falls books a positive r", () => signCell("short-fall", 1, "tp"));
  it("[d] a LONG whose price falls books a negative r", () => signCell("long-fall", -1, "sl"));
  it("[d] a SHORT whose price rises books a negative r", () => signCell("short-rise", -1, "sl"));
});

describe("trailing stop moves favourably only (b)", () => {
  // the LONG side is pinned by sim/trail-tick.test.ts (a lower bar never takes the stop back); the SHORT side's
  // reversal is not
  it("[b] a SHORT: adverse bars never take the armed trailing stop back", () => {
    const t0 = 1000 * TF;
    const s: TickTrail = { side: -1, entry: 100, stop: 105, peak: 100, trailOn: false, trail: 0.01, trailDist: 0.02 };
    // the arming of trail-tick.test.ts: the short trails down to 98 × 1.02
    tickTrail(s, 99.5, t0 + M, TF);
    tickTrail(s, 99.4, t0 + TF + M, TF);
    tickTrail(s, 98, t0 + TF + 2 * M, TF);
    tickTrail(s, 98.4, t0 + 2 * TF + M, TF);
    const armed = s.stop;
    assert.ok(Math.abs(armed - 99.96) < 1e-9 && s.trailOn, `armed at ${armed}`);
    // the price turns up over two bars: the stop stays where it is and the peak does not move
    assert.equal(tickTrail(s, 100.5, t0 + 3 * TF + M, TF), false, "the first adverse bar moves nothing");
    assert.equal(tickTrail(s, 100.8, t0 + 4 * TF + M, TF), false, "the second adverse bar moves nothing");
    assert.equal(s.stop, armed, "the stop never moves back up");
    assert.equal(s.peak, 98, "the peak is the lowest low");
  });
});

describe("stop and target levels per side (c)", () => {
  // the level a stop or a target exit books: at the level, inclusive, and not one tick short of it
  it("[c] LONG: a price at the stop exits at the stop; one tick above it does not", () => {
    const p = { side: 1, stop: 95, target: 102 };
    assert.equal(crossedExit(p, 95), 95, "at the stop");
    assert.equal(crossedExit(p, 95.01), 0, "above the stop");
  });
  it("[c] LONG: a price at the target exits at the target; one tick below it does not", () => {
    const p = { side: 1, stop: 95, target: 102 };
    assert.equal(crossedExit(p, 102), 102, "at the target");
    assert.equal(crossedExit(p, 101.99), 0, "below the target");
  });
  it("[c] SHORT: a price at the stop exits at the stop; one tick below it does not", () => {
    const p = { side: -1, stop: 105, target: 98 };
    assert.equal(crossedExit(p, 105), 105, "at the stop");
    assert.equal(crossedExit(p, 104.99), 0, "below the stop");
  });
  it("[c] SHORT: a price at the target exits at the target; one tick above it does not", () => {
    const p = { side: -1, stop: 105, target: 98 };
    assert.equal(crossedExit(p, 98), 98, "at the target");
    assert.equal(crossedExit(p, 98.01), 0, "above the target");
  });
});

describe("Stable-02 paused keys, one side each (item 2)", () => {
  type HeldBack = {
    entryHeldBack(
      op: { cfg: string; sym: string; side: number; entryT: number },
      hourNet: ReadonlyMap<number, number>,
      open: unknown[],
      srcClosed: ReadonlyMap<string, unknown[]>,
      confirmPool: unknown,
      crowdSeats: unknown[],
    ): string | null;
  };
  const T = Date.UTC(2026, 9, 1, 12);
  // the keys come from S2Coord itself: two losing LONGs pause S1-USDT|1, two losing SHORTs pause S2-USDT|-1
  const s2 = new S2Coord({ windows: true, windowN: 2, relVolume: false, ratio: 0, minPf: 1, maxMult: 1, evalH: 1 });
  for (let i = 0; i < 2; i++) {
    s2.close({ cfg: ENG, sym: "S1-USDT", side: 1, r: -0.01 });
    s2.close({ cfg: ENG, sym: "S2-USDT", side: -1, r: -0.01 });
  }
  const snap = s2.snapshot(T);
  const { rt: fake } = fakeRt();
  Object.assign(fake, { hedgeKeys: new Set<string>(), sim: { s2: snap } });
  /** the paper book's entry check on one candidate under the given coordination settings */
  const heldBackWith = (coord: CoordSettings, sym: string, side: 1 | -1) => {
    Object.assign(fake, { wf: { guardPct: 0, coord } });
    return (CoreRuntime.prototype as unknown as HeldBack).entryHeldBack.call(
      fake,
      { cfg: ENG, sym, side, entryT: T },
      new Map<number, number>(),
      [],
      new Map<string, unknown[]>(),
      null,
      [],
    );
  };
  // the cells below run with coord.s2Side on; the control cells further down run the default (off)
  const ON: CoordSettings = { ...DEFAULT_COORD, s2Side: true };
  const heldBack = (sym: string, side: 1 | -1) => heldBackWith(ON, sym, side);

  it("fixture: S2Coord pauses one side of each symbol, keyed sym|±1", () => {
    assert.deepEqual([...snap.paused].sort(), ["S1-USDT|1", "S2-USDT|-1"]);
  });
  it("[item 2] a LONG on the paused S1-USDT|1 side is refused", () => {
    assert.equal(heldBack("S1-USDT", 1), "s2Window", "the paused LONG side");
  });
  it("[item 2] a SHORT on S1-USDT, the other side, is allowed", () => {
    assert.equal(heldBack("S1-USDT", -1), null, "the unpaused SHORT side");
  });
  it("[item 2] a SHORT on the paused S2-USDT|-1 side is refused", () => {
    assert.equal(heldBack("S2-USDT", -1), "s2Window", "the paused SHORT side");
  });
  it("[item 2] a LONG on S2-USDT, the other side, is allowed", () => {
    assert.equal(heldBack("S2-USDT", 1), null, "the unpaused LONG side");
  });
  it("[item 2] control: with coord.s2Side off (the default) the paused LONG is allowed, the old result", () => {
    assert.equal(heldBackWith(DEFAULT_COORD, "S1-USDT", 1), null, "the bare symbol matches no sym|±1 key");
  });
  it("[item 2] control: with coord.s2Side off (the default) the paused SHORT is allowed, the old result", () => {
    assert.equal(heldBackWith(DEFAULT_COORD, "S2-USDT", -1), null, "the bare symbol matches no sym|±1 key");
  });
  it("[item 2] control: with coord.s2Side off the other-side cells are allowed too", () => {
    assert.equal(heldBackWith(DEFAULT_COORD, "S1-USDT", -1), null, "the unpaused SHORT side");
    assert.equal(heldBackWith(DEFAULT_COORD, "S2-USDT", 1), null, "the unpaused LONG side");
  });
  it("[item 2] coord.s2Side is normalised: only a true boolean turns it on, and an unset one adds no key", () => {
    assert.equal(coordSettings({ s2Side: true }).s2Side, true, "a true boolean is on");
    assert.equal(coordSettings({ s2Side: "yes" as never }).s2Side, undefined, "anything else is off");
    assert.equal("s2Side" in coordSettings({}), false, "the default's normalised object gains no key");
    assert.equal(
      sanitizeWf({ coord: { ...DEFAULT_COORD, s2Side: true } }).coord?.s2Side,
      true,
      "the settings path keeps it",
    );
  });
});
