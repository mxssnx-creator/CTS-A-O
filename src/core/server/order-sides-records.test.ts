// Order sides in the records and the PF: a LONG (side 1) and a SHORT (side -1) of one config are two positions, and each
// side's closes, flat markers, reconciled exits, validation record and gate keep their own side. Layer: the ledger's
// closes and P&L (statistics.ts liveLedger), the lane closes (live-record.ts attributeLanes), the live record and its
// gate (live-record.ts liveRecords, live-validation.ts liveGate / liveEntryOk), the stop and the take-profit a flat
// marker is priced at (one control step of live.server.ts on the simulated venue, stopPxOf and tpPxOf) and the lane
// exits reconciled to the venue's fills (live.server.ts reconcileLaneCloses). Plan items: 13 (the live gate pools LONG
// and SHORT closes), 14 ("(unverified X)" reads as a stop-out), 15 (a stale stop or take-profit prices a new position).
// Group (d) runs with live.sideGates on (its cells pass the option); its control cells run with the option off and pin
// the pooled verdict, which stays as it was.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { liveLaneFilter, reconcileLaneCloses, resetLiveBackoff, stepLive } from "./live.server.ts";
import { liveTag, stateHash } from "./live.ts";
import {
  LV_SIDES_APART,
  LV_SIDES_POOLED,
  lvSideOfEntry,
  type CoreRuntime,
} from "./runtime.server.ts";
import {
  attributeLanes,
  laneKeyOf,
  liveRecords,
  recordKeyOf,
  sideOfRow,
  splitRecordKey,
  type LiveRecord,
} from "../live-record.ts";
import {
  engineProven,
  liveEntryOk,
  liveGate,
  liveGroupGates,
  liveGroupKeyOf,
  liveGroupOf,
  sideTapeOf,
  signalProven,
  signalUnitOf,
  type LiveGate,
  type SideTapeMemo,
} from "../live-validation.ts";
import { liveLedger, type LedgerRow } from "../statistics.ts";
import { CandleSeries } from "../market/candle-series.ts";
import type { Candle, Trade } from "../domain/types.ts";
import { makeTape } from "../sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { checkSettings } from "../settings-check.ts";
import { fakeRt, SimExchange } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";
const H = 3_600_000;
const T = 1_790_000_000_000;
const SYM = "S1-USDT";
const CFG = "b|ema|a";
const near = (a: number, b: number, eps = 1e-12) => Math.abs(a - b) < eps;

// ── the ledger's closes: P&L sign, fees, flat markers (statistics.ts liveLedger) ─────────────────────────────────────
// the tag is 7 characters: the id letter after it names the range (E: wide). A LONG bought at 100 gains at 105 and loses
// at 95; a SHORT sold at 100 gains at 95 and loses at 105.
const TAG = "CTSBV2_";
const SIDES = [
  { name: "LONG", side: 1 as const, win: 105, loss: 95 },
  { name: "SHORT", side: -1 as const, win: 95, loss: 105 },
];
/** one position: an own open of 1 at 100 (a fee of 0 is unmeasured: the model share is charged) */
const opened = (side: 1 | -1, fee = 0): LedgerRow => ({
  coid: `${TAG}Ea1`, sym: SYM, side, kind: "O", qty: 1, px: 100, status: "ok", at: T, fillPx: 100, fee,
});
/** the position closed by its own close order at px */
const closedOwn = (side: 1 | -1, px: number, fee = 0): LedgerRow => ({
  coid: `${TAG}Ca2`, sym: SYM, side, kind: "X", qty: 1, px, status: "ok", at: T + H, fillPx: px, fee,
});
/** the position the exchange closed: the flat marker the desk wrote, priced at px, with its note */
const flatOf = (side: 1 | -1, px: number, msg: string): LedgerRow => ({
  coid: "flat-1", sym: SYM, side, kind: "F", qty: 0, px, status: "ok", at: T + H, fillPx: null, fee: 0, msg,
});
const closesOf = (rows: LedgerRow[], modelCost = 0) => liveLedger(rows, TAG.length, modelCost).closed;

describe("ledger closes: the P&L sign on each side (statistics.ts liveLedger)", () => {
  for (const s of SIDES) {
    it(`(a) ${s.name}: a gain to ${s.win} books +5 % of the notional, a loss to ${s.loss} books -5 %, before fees`, () => {
      const [w] = closesOf([opened(s.side), closedOwn(s.side, s.win)]);
      assert.equal(w.side, s.side);
      assert.equal(w.notional, 100);
      assert.ok(near(w.r, 0.05), `win r ${w.r}`);
      const [l] = closesOf([opened(s.side), closedOwn(s.side, s.loss)]);
      assert.ok(near(l.r, -0.05), `loss r ${l.r}`);
    });

    it(`(a) ${s.name}: measured commissions (0.1 open, 0.2 close) lower the same gain by 0.3 % of the notional`, () => {
      const [w] = closesOf([opened(s.side, 0.1), closedOwn(s.side, s.win, 0.2)]);
      assert.ok(near(w.r, 0.047), `r ${w.r}`);
    });

    it(`(a) ${s.name}: the model share (0.1 % per side on each fill's notional) is charged with the same sign`, () => {
      const [w] = closesOf([opened(s.side), closedOwn(s.side, s.win)], 0.002);
      // open 100 × 0.1 % = 0.1 ; close at the win price × 0.1 % — the gross 5 less both shares, over 100
      assert.ok(near(w.r, (5 - 0.1 - s.win * 0.001) / 100), `r ${w.r}`);
    });
  }
});

describe("flat markers: the reason each one books (statistics.ts liveLedger)", () => {
  for (const s of SIDES) {
    it(`(b) ${s.name}: "flat on the exchange (unverified ${s.loss})" is not an own stop-out: it books "flat", out of PF (plan item 14)`, () => {
      const [x] = closesOf([opened(s.side), flatOf(s.side, s.loss, `flat on the exchange (unverified ${s.loss})`)]);
      // statistics.ts:460-463 keeps "flat" (a cause not proven) out of every PF, as "hand"; the unverified close is that case
      assert.equal(x.reason, "flat", `reason ${x.reason}`);
    });

    it(`(b) ${s.name}: "(stop X)", "(target X)" and "(hand X)" book sl, tp and hand`, () => {
      const got = ["stop", "target", "hand"].map(
        (why) => closesOf([opened(s.side), flatOf(s.side, s.loss, `flat on the exchange (${why} ${s.loss})`)])[0].reason,
      );
      assert.deepEqual(got, ["sl", "tp", "hand"]);
    });

    it(`(c) ${s.name}: "(liq X)" is an own loss counted like a stop: reason sl, inside the PF`, () => {
      const [x] = closesOf([opened(s.side), flatOf(s.side, s.loss, `flat on the exchange (liq ${s.loss})`)]);
      // live.ts outsideCloseOf: "liq … an own loss, counted like a stop" — so the reason is sl and it is not apart
      assert.equal(x.reason, "sl", `reason ${x.reason}`);
      assert.ok(near(x.r, -0.05), `r ${x.r}`);
    });
  }
});

// ── the live record and its gate, per side (live-record.ts liveRecords, live-validation.ts liveGate) ──────────────────
// 20 closes of one config, one every 2 h, alternating a LONG (even) and a SHORT (odd): the last 10 hold five of each
const N = 10;
const MIN_PF = 1.05;
const NOW = T + 40 * H;
const alternating = (longR: number, shortR: number) =>
  Array.from({ length: 20 }, (_, i) => ({
    cfg: CFG,
    sym: SYM,
    side: i % 2 === 0 ? 1 : -1,
    exitT: T + 2 * i * H,
    r: i % 2 === 0 ? longR : shortR,
  }));
/** the record a side is judged by: its own when the record is kept per side, else the config's (pooled) record */
const recordOf = (recs: Map<string, LiveRecord>, side: 1 | -1) => recs.get(`${CFG}|${side}`) ?? recs.get(CFG);
/** a side's gate on the record kept per side (live.sideGates on: the default of these cells) or on the pooled one */
const gateOf = (rows: ReturnType<typeof alternating>, side: 1 | -1, bySide = true) =>
  liveGate(recordOf(liveRecords(rows, { bySide }), side)!, 0, NOW, N, MIN_PF);

describe("live validation per side (live-record.ts liveRecords, live-validation.ts liveGate)", () => {
  it("(d) plan item 13: with live.sideGates on, the record keeps a config's LONG and SHORT closes apart (one record per config and side)", () => {
    assert.equal(liveRecords(alternating(-0.02, 0.01), { bySide: true }).size, 2, "one record per config and side");
  });

  it("(d) plan item 13: with live.sideGates on, a SHORT is not refused by the LONG closes of its config (its own 10 closes all win; the pooled 10 lose)", () => {
    // the longs lose 2 % each, the shorts win 1 % each: the pooled last 10 are PF 0.5, the shorts' own PF is no loss
    const g = gateOf(alternating(-0.02, 0.01), -1);
    assert.equal(liveEntryOk(g, undefined), true, `short judged ${JSON.stringify(g)}`);
  });

  it("(d) plan item 13: with live.sideGates on, a SHORT is refused by its own 10 losing closes though the LONG closes of its config win", () => {
    // the longs win 5 % each, the shorts lose 1 % each: the pooled last 10 are PF 5, the shorts' own PF is 0
    const g = gateOf(alternating(0.05, -0.01), -1);
    assert.equal(liveEntryOk(g, undefined), false, `short judged ${JSON.stringify(g)}`);
  });

  it("(d) a LONG is judged on its own closes both ways (pass: the pooled record gives the same verdict here)", () => {
    assert.equal(liveEntryOk(gateOf(alternating(-0.02, 0.01), 1), undefined), false, "its own 10 losses");
    assert.equal(liveEntryOk(gateOf(alternating(0.05, -0.01), 1), undefined), true, "its own 10 wins");
  });

  it("(d) control: with live.sideGates off the record stays one pooled record per config, and a SHORT gets the pooled verdict (pass)", () => {
    assert.equal(liveRecords(alternating(-0.02, 0.01)).size, 1, "one pooled record");
    assert.equal(liveRecords(alternating(-0.02, 0.01), { bySide: false }).size, 1, "bySide false is the pooled record too");
    // the pooled last 10 are PF 0.5 (five LONG losses of 2 %, five SHORT wins of 1 %): refused
    assert.equal(liveEntryOk(gateOf(alternating(-0.02, 0.01), -1, false), undefined), false, "pooled PF 0.5");
    // the pooled last 10 are PF 5 (five LONG wins of 5 %, five SHORT losses of 1 %): admitted
    assert.equal(liveEntryOk(gateOf(alternating(0.05, -0.01), -1, false), undefined), true, "pooled PF 5");
  });

  it("(d) live.sideGates: a side is +1 or -1 only, so a close with side 0, null or 2 is in neither record", () => {
    const noSide = [
      { cfg: CFG, exitT: T, r: -0.02, side: 0 },
      { cfg: CFG, exitT: T + 1, r: -0.02, side: null },
      { cfg: CFG, exitT: T + 2, r: -0.02 },
      { cfg: CFG, exitT: T + 3, r: -0.02, side: 2 },
    ];
    assert.equal(liveRecords(noSide, { bySide: true }).size, 0, "no side of its own: in neither record");
    assert.equal(liveRecords(noSide).size, 1, "the pooled record keeps every close");
    assert.deepEqual(
      [1, -1, 0, 2, null, undefined].map((s) => sideOfRow(s)),
      [1, -1, undefined, undefined, undefined, undefined],
    );
  });
});

// ── live.sideGates: the engine proof, the simulated fallback and the settings path (engine-proof, sideTapeOf, checkSettings)
describe("live.sideGates: the engine proof, the simulated fallback and the settings path (d)", () => {
  // six closes of one engine config, one a minute, alternating LONG (even) and SHORT (odd): the LONG wins 5 %, the SHORT loses 1 %
  const six = Array.from({ length: 6 }, (_, i) => ({
    cfg: CFG,
    sym: SYM,
    side: i % 2 === 0 ? 1 : -1,
    exitT: T + i * 60_000,
    r: i % 2 === 0 ? 0.05 : -0.01,
  }));

  it("(d) plan item 13: with live.sideGates on, the engine proof keys each side: the LONG is proven, the SHORT is not (its own last 3 lose)", () => {
    const paper = liveRecords(six, { bySide: true });
    assert.deepEqual([...engineProven(paper, new Map(), T + 60 * 60_000, 3, 1.2).proven].sort(), [`${CFG}|1`]);
  });

  it("(d) control: with live.sideGates off the engine proof judges the config as one, on the pooled last 3 (pass)", () => {
    // the pooled last 3 are SHORT −1 %, LONG +5 %, SHORT −1 %: PF 2.5
    assert.deepEqual([...engineProven(liveRecords(six), new Map(), T + 60 * 60_000, 3, 1.2).proven], [CFG]);
  });

  // a simulated tape of the same six closes (the LONG wins 5 %, the SHORT loses 1 %), as the paper step's fallback reads it
  const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
  const trades = Array.from({ length: 6 }, (_, i) =>
    ({
      cfg: CFG,
      sym: SYM,
      side: i % 2 === 0 ? 1 : -1,
      entryT: T + i * H,
      exitT: T + i * H + 30 * 60_000,
      entry: 100,
      exit: 100,
      r: i % 2 === 0 ? 0.05 : -0.01,
      reason: i % 2 === 0 ? "tp" : "sl",
      bars: 2,
      mfe: 0,
      mae: 0,
      kind: "normal",
    }) as Trade,
  );
  const tape = makeTape(CFG, "follow", CFG.split("|")[1], P, "normal", [SYM], trades, [], []);

  it("(d) with live.sideGates on, a side's simulated closes judge it alone: the SHORT's last 3 lose, the LONG's win (id kept)", () => {
    assert.equal(liveGate(sideTapeOf(tape, -1), 0, NOW, 3, MIN_PF).ok, false, "the SHORT's own 3 losses");
    assert.equal(liveGate(sideTapeOf(tape, 1), 0, NOW, 3, MIN_PF).ok, true, "the LONG's own 3 wins");
    assert.equal(sideTapeOf(tape, -1).id, CFG);
  });

  it("(d) control: the pooled simulated tape judges the config as one, on its last 3 (pass)", () => {
    // the pooled last 3 are SHORT −1 %, LONG +5 %, SHORT −1 %: PF 2.5
    assert.equal(liveGate(tape, 0, NOW, 3, MIN_PF).ok, true);
  });

  it("(d) sideTapeOf builds a side once per memo; without one each call builds its own copy", () => {
    const memo: SideTapeMemo = new Map();
    const a = sideTapeOf(tape, -1, memo);
    assert.equal(sideTapeOf(tape, -1, memo).exitT, a.exitT, "the memo's copy is reused");
    assert.notEqual(sideTapeOf(tape, -1).exitT, a.exitT, "no memo: a copy of its own");
    assert.deepEqual([...sideTapeOf(tape, -1).exitT], [...a.exitT], "the same closes");
    assert.equal(memo.size, 1, "one tape in the memo");
  });

  it("(d) live.sideGates is a boolean: true and false are accepted, anything else is refused by the settings path", () => {
    for (const v of [true, false])
      assert.doesNotThrow(() => checkSettings({ live: { ...DEFAULT_SETTINGS.live, sideGates: v } } as never));
    for (const v of ["yes", 1, null])
      assert.throws(() => checkSettings({ live: { ...DEFAULT_SETTINGS.live, sideGates: v } } as never), /side gates/);
  });

  it("(d) control: DEFAULT_SETTINGS leaves live.sideGates unset: the default is one pooled record per config, holding both sides' closes (pass)", () => {
    assert.equal(DEFAULT_SETTINGS.live.sideGates, undefined, "unset by default");
    // the default reads as the pooled path (the runtime's `sideGates === true` is false for it)
    const recs = liveRecords(alternating(-0.02, 0.01), { bySide: DEFAULT_SETTINGS.live.sideGates === true });
    assert.deepEqual([...recs.keys()], [CFG], "one record, keyed by the config alone");
    const rec = recs.get(CFG)!;
    assert.equal(rec.side, undefined, "not kept per side");
    assert.equal(rec.exitT.length, 20, "the LONG and the SHORT closes are both in it");
    // ten LONG losses of 2 % and ten SHORT wins of 1 %: the gains are 10 × 1 %, the losses 10 × 2 %
    assert.ok(near(rec.gp[20], 0.1) && near(rec.gl[20], 0.2), `gains ${rec.gp[20]} losses ${rec.gl[20]}`);
  });

  it("(d) live.sideGates: a live group's gate key carries its side (group|1, group|-1); unset, the key is the group alone (the pooled key)", () => {
    assert.equal(liveGroupKeyOf("Micro", 1), "Micro|1");
    assert.equal(liveGroupKeyOf("Micro", -1), "Micro|-1");
    assert.equal(liveGroupKeyOf("Micro"), "Micro", "the pooled key");
    assert.equal(liveGroupKeyOf("Micro", undefined), "Micro", "the pooled key");
  });

  // the side selectors the runtime's live validation compute reads (runtime.server.ts: the sides a count runs over, and
  // the side an entry is judged on); the closures lvOf and groupsAt that call them are not run
  it("(d) live.sideGates: the sides a live count runs over are LONG and SHORT apart, keyed group|1 and group|-1 (LV_SIDES_APART)", () => {
    assert.deepEqual(
      LV_SIDES_APART.map((s) => liveGroupKeyOf("Micro", s)),
      ["Micro|1", "Micro|-1"],
    );
  });

  it("(d) live.sideGates: an entry is judged on its own side (+1 or -1); an entry with no side of its own has none (lvSideOfEntry)", () => {
    assert.equal(lvSideOfEntry(true, 1), 1, "a LONG entry");
    assert.equal(lvSideOfEntry(true, -1), -1, "a SHORT entry");
    assert.equal(lvSideOfEntry(true, 0), undefined, "a side-0 entry has no side");
    assert.equal(lvSideOfEntry(true, undefined), undefined, "an entry with no side");
  });

  it("(d) control: with live.sideGates unset the count runs over the pooled side (keyed by the group alone) and no entry has a side (pass)", () => {
    assert.deepEqual(LV_SIDES_POOLED.map((s) => liveGroupKeyOf("Micro", s)), ["Micro"]);
    assert.equal(lvSideOfEntry(false, 1), undefined, "a LONG entry is judged pooled");
    assert.equal(lvSideOfEntry(false, -1), undefined, "a SHORT entry is judged pooled");
  });

  it("(d) live.sideGates: a group's last N are judged per side: the SHORT group is refused by its own losses while its pooled last N pass (the helpers the runtime's groupsAt composes; groupsAt itself is not run)", () => {
    // `tape`'s six closes: the LONG wins 5 %, the SHORT loses 1 %. The pooled last 3 are PF 2.5; each side's own last 3
    // are all wins (PF no loss) and all losses (PF 0)
    const group = liveGroupOf(CFG);
    const pooled = liveGroupGates([tape], 0, NOW, 3, MIN_PF).get(group)!;
    assert.equal(pooled.ok, true, `pooled ${JSON.stringify(pooled)}`);
    const perSide = new Map<string, LiveGate>();
    for (const s of [1, -1] as const)
      perSide.set(liveGroupKeyOf(group, s), liveGroupGates([sideTapeOf(tape, s)], 0, NOW, 3, MIN_PF).get(group)!);
    assert.equal(perSide.get(`${group}|1`)!.ok, true, "the LONG group's own last 3 win");
    assert.equal(perSide.get(`${group}|-1`)!.ok, false, "the SHORT group's own last 3 lose");
    // an entry whose own gate is not judged takes its side's group gate
    const unjudged: LiveGate = { ok: true, n: 0, pf: null };
    assert.equal(liveEntryOk(unjudged, perSide.get(liveGroupKeyOf(group, 1))), true, "a LONG entry is admitted");
    assert.equal(liveEntryOk(unjudged, perSide.get(liveGroupKeyOf(group, -1))), false, "a SHORT entry is refused");
  });

  it("(d) live.sideGates: a proven key is its config and its side (recordKeyOf read back by splitRecordKey); a config id with a '|' is split at its last '|'", () => {
    assert.deepEqual(splitRecordKey(recordKeyOf(CFG, -1)), { cfg: CFG, side: -1 });
    assert.deepEqual(splitRecordKey(recordKeyOf(CFG, 1)), { cfg: CFG, side: 1 });
    assert.deepEqual(splitRecordKey(recordKeyOf("b|ema|a|h16", 1)), { cfg: "b|ema|a|h16", side: 1 });
  });
});

// ── a lane or an entry with no side of its own, on the per-side path (live.server.ts liveLaneFilter, runtime lvOf) ──────
describe("live.sideGates: a lane or an entry with no side of its own (g)", () => {
  // an engine lane of CFG on a side that is not +1 or -1 (the lane filter takes any number; a position is always +1 or -1)
  const lane = (side: number) => ({ cfg: CFG, vol: 1, side });
  /** the sendable verdict of an engine lane with the given engine proof keys, on the per-side path */
  const sendableOn = (proven: string[]) => liveLaneFilter({ sideGates: true }, null, null, new Set(proven), null).sendable;

  it("(g) live.sideGates: a side-0 engine lane is judged on either side, sendable when its LONG or its SHORT is proven (intended: a lane with no side is proven on either side, as signalOk does)", () => {
    assert.equal(sendableOn([`${CFG}|1`])(lane(0)), true, "its LONG is proven");
    assert.equal(sendableOn([`${CFG}|-1`])(lane(0)), true, "its SHORT is proven");
    assert.equal(sendableOn([])(lane(0)), false, "neither is proven");
  });

  it("(g) live.sideGates: a LONG or a SHORT lane is judged on its own side only, so the side-0 rule does not widen it (a SHORT with only the LONG proven is refused)", () => {
    assert.equal(sendableOn([`${CFG}|1`])(lane(1)), true, "a LONG with its LONG proven");
    assert.equal(sendableOn([`${CFG}|1`])(lane(-1)), false, "a SHORT with only the LONG proven");
  });

  it("(g) control: with live.sideGates off the side-0 lane takes the pooled proof of its config (pass)", () => {
    const off = liveLaneFilter({}, null, null, new Set([CFG]), null).sendable;
    assert.equal(off(lane(0)), true, "the config is proven");
    assert.equal(liveLaneFilter({}, null, null, new Set<string>(), null).sendable(lane(0)), false, "not proven");
  });

  it("(g) live.sideGates: an entry with no side of its own is not judged and is admitted, as no side's group gate applies to it (the entry gate's composition: lvOf's unjudged gate, the group key without a side; the runtime closure itself is not run)", () => {
    const unjudged: LiveGate = { ok: true, n: 0, pf: null };
    const group = liveGroupOf(CFG);
    // under the option each group's gate is keyed by its side, so the key of a side-less entry names no gate
    const refused: LiveGate = { ok: false, n: 10, pf: 0.5 };
    const groups = new Map([
      [liveGroupKeyOf(group, 1), refused],
      [liveGroupKeyOf(group, -1), refused],
    ]);
    assert.equal(liveEntryOk(unjudged, groups.get(liveGroupKeyOf(group, sideOfRow(0)))), true, "an entry with side 0 is admitted");
    assert.equal(liveEntryOk(unjudged, groups.get(liveGroupKeyOf(group, sideOfRow(-1)))), false, "a SHORT entry takes its side's group gate");
  });

  // the signal readers: the lane filter's signal proof (live.server.ts signalOk) and the proof's unit of a close
  // (live-validation.ts signalUnitOf, signalProven). A side that is not +1 or -1 is judged on either side by the lane
  // filter; ungated the lane filter reads it as a SHORT, and the unit reader keeps the old mapping of a side 2 close
  it("(g) live.sideGates: a signal lane with side 0 is judged on either side, so its LONG unit proven makes it sendable; ungated the same lane is a SHORT and is held back (the readers differ on purpose)", () => {
    const sig = { cfg: "b|sig-ema|x", vol: 1, side: 0 };
    const longOnly = new Set(["sig-ema|1"]);
    assert.equal(liveLaneFilter({ sideGates: true }, null, null, null, longOnly).sendable(sig), true, "per-side path: either side, the LONG unit is proven");
    assert.equal(liveLaneFilter({}, null, null, null, longOnly).sendable(sig), false, "ungated: read as a SHORT, whose unit is not proven");
    assert.equal(liveLaneFilter({}, null, null, null, longOnly).unproven(sig), true, "ungated: held back by the signal proof");
    assert.equal(liveLaneFilter({ sideGates: true }, null, null, null, longOnly).unproven(sig), false, "per-side path: not held back by it");
    assert.equal(liveLaneFilter({ sideGates: true }, null, null, null, longOnly).sendable({ ...sig, side: -1 }), false, "a SHORT lane is still judged on its own side");
  });

  // the active signal set (validLane): a side-less signal lane is active on either of its symbol's sides on the per-side
  // path. validLane's type names only +1 / -1, so the lane is cast (the lane filter takes any number, as lane() above)
  type ValidLane = Parameters<ReturnType<typeof liveLaneFilter>["validLane"]>[0];
  const sigLane = (side: number) => ({ cfg: "b|sig-ema|tp1|sl1|tr0|h32", vol: 1, sym: SYM, side }) as ValidLane;
  it("(g) live.sideGates: a side-0 signal lane is valid when its LONG or its SHORT is active on its symbol, as signalOk judges it; a LONG or a SHORT lane needs its own", () => {
    const on = (active: string[]) => liveLaneFilter({ sideGates: true }, new Set([CFG]), new Set(active), null, null);
    assert.equal(on([`b|sig-ema|${SYM}|1|normal|cfg=${encodeURIComponent(sigLane(1).cfg)}`]).validLane(sigLane(0)), true, "its LONG is active");
    assert.equal(on([`b|sig-ema|${SYM}|-1|normal|cfg=${encodeURIComponent(sigLane(-1).cfg)}`]).validLane(sigLane(0)), true, "its SHORT is active");
    assert.equal(on([]).validLane(sigLane(0)), false, "neither is active");
    assert.equal(on([`b|sig-ema|${SYM}|-1|normal|cfg=${encodeURIComponent(sigLane(-1).cfg)}`]).validLane(sigLane(1)), false, "a LONG lane with only its SHORT active");
    assert.equal(on([`b|sig-ema|${SYM}|1|normal|cfg=${encodeURIComponent(sigLane(1).cfg)}`]).validLane(sigLane(-1)), false, "a SHORT lane with only its LONG active");
  });

  it("(g) control: ungated, a malformed side-0 Signal lane cannot borrow a valid SHORT active key", () => {
    const off = (active: string[]) => liveLaneFilter({}, new Set([CFG]), new Set(active), null, null);
    assert.equal(off([`b|sig-ema|${SYM}|-1|normal|cfg=${encodeURIComponent(sigLane(-1).cfg)}`]).validLane(sigLane(0)), false, "a malformed direction is not an executable short");
    assert.equal(off([`b|sig-ema|${SYM}|1|normal|cfg=${encodeURIComponent(sigLane(1).cfg)}`]).validLane(sigLane(0)), false, "only the LONG is active");
  });

  it("(g) live.sideGates: a close whose side is not +1 or -1 is in no signal unit (signalUnitOf); ungated, a side-2 close keeps the LONG unit it always had", () => {
    const cfg = "b|sig-ema|x";
    assert.equal(signalUnitOf(cfg, 0), null, "side 0, ungated: no unit");
    assert.equal(signalUnitOf(cfg, 0, true), null, "side 0, per-side path: no unit");
    assert.equal(signalUnitOf(cfg, 2), "sig-ema|1", "side 2, ungated: the LONG unit, as it always was");
    assert.equal(signalUnitOf(cfg, 2, true), null, "side 2, per-side path: no side, in no unit");
    assert.equal(signalUnitOf(cfg, -1, true), "sig-ema|-1", "a SHORT keeps its unit on the per-side path");
    assert.equal(signalUnitOf("b|ema|a", 1, true), null, "an engine config has no signal unit");
  });

  it("(g) live.sideGates: the signal proof reads a side-2 close as no side (its unit is not judged); ungated the same close proves the LONG unit", () => {
    const close = { id: "7", cfg: "b|sig-ema|x", sym: SYM, side: 2, exitT: T, r: 0.05 };
    const o = { n: 1, minPf: 1.2, minEvents: 1 };
    assert.deepEqual([...signalProven([close], [], NOW, o).proven], ["sig-ema|1"], "ungated: the side-2 close is a LONG unit");
    assert.deepEqual([...signalProven([close], [], NOW, { ...o, bySide: true }).proven], [], "per-side path: no side, no unit");
  });
});

// ── the stop a flat marker is priced at (live.server.ts stepLive, stopPxOf) ───────────────────────────────────────────
/**
 * One control step on a desk whose key S0 holds nothing on the venue. The key carries an earlier position of this side,
 * opened at 10 and closed by its stop at `oldStop` (a flat marker); then a new position (opened 3 h ago, so not a recent
 * open) with `newStop` as its own stop row (null: no stop row at all). The 1-minute bars of the last 30 minutes are `bars`
 * (their highs and lows). Returns the flat marker the step wrote for the new position.
 */
async function closedOutside(side: 1 | -1, oldStop: number, newStop: number | null, bars: Array<Pick<Candle, "h" | "l">>) {
  resetLiveBackoff();
  const { rt } = fakeRt(new CoreDb(":memory:"));
  const tag = liveTag(rt.settings.live.connId);
  const key = `S0-USDT|${side}`;
  const at = Date.now();
  const put = (coid: string, kind: string, qty: number, px: number, t: number, msg = "") =>
    rt.db.run(
      "INSERT INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ok', ?, ?)",
      coid,
      `control|${key}`,
      "S0-USDT",
      side,
      kind,
      qty,
      px,
      msg,
      t,
    );
  put(`${tag}Ea1`, "O", 1, 10, at - 5 * H);
  put(`${tag}Sa2`, "S", 0, oldStop, at - 5 * H + 1);
  put("flat-old", "F", 0, oldStop, at - 4 * H, `flat on the exchange (stop ${oldStop})`);
  put(`${tag}Ea3`, "O", 1, 10, at - 3 * H);
  if (newStop !== null) put(`${tag}Sa4`, "S", 0, newStop, at - 3 * H + 1);
  const candles: Candle[] = bars.map((b, i) => ({ t: at - (30 - i) * 60_000, o: 10, h: b.h, l: b.l, c: 10, v: 1 }));
  // (the bars the desk reads for a key: rt.candles, one series per symbol)
  Object.assign(rt, { candles: new Map([["S0-USDT", CandleSeries.fromCandles(candles)]]) });
  await stepLive(rt as unknown as CoreRuntime, [], 1, new SimExchange());
  const flats = rt.db.all<{ px: number; msg: string | null }>(
    "SELECT px, msg FROM live_orders WHERE cfg = ? AND kind = 'F' ORDER BY at, rowid",
    `control|${key}`,
  );
  return flats.at(-1)!;
}

/**
 * A relaunch: the desk was down, its previous step (30 min ago) saw the side held. The own stop of the position it opened
 * 3 h ago filled 1 h ago; someone else holds the side now. The venue history since the previous step does not show the
 * fill (it precedes that step), so only the desk's own stop price can book the close. The 1-minute bars of the last 30
 * minutes are `bars`. `side` is the side of the position: 1 LONG, -1 SHORT. With `tp` the position's take-profit filled
 * instead of its stop (the stop stays on the record, untouched, and the history row is the take-profit's fill).
 */
async function closedOnRelaunch(side: 1 | -1, ownStop: number, bars: Array<Pick<Candle, "h" | "l">>, tp: number | null = null) {
  resetLiveBackoff();
  const ex = new SimExchange();
  const { rt } = fakeRt(new CoreDb(":memory:"));
  const tag = liveTag(rt.settings.live.connId);
  const key = `S0-USDT|${side}`;
  const ps = side === 1 ? "LONG" : "SHORT";
  const at = Date.now();
  const put = (coid: string, kind: string, qty: number, px: number, t: number) =>
    rt.db.run(
      "INSERT INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ok', '', ?)",
      coid,
      `control|${key}`,
      "S0-USDT",
      side,
      kind,
      qty,
      px,
      t,
    );
  put(`${tag}Ea1`, "O", 1, 10, at - 3 * H);
  put(`${tag}Sa2`, "S", 0, ownStop, at - 3 * H + 1);
  if (tp !== null) put(`${tag}Ta3`, "T", 0, tp, at - 3 * H + 2);
  rt.db.kvSet("controlStatus", {
    at: at - H / 2,
    connHash: stateHash([ex.fingerprint()]),
    targetsHash: "",
    bookHash: "",
    planHash: "",
    reconnected: false,
    unchanged: false,
    steps: 1,
    changes: 0,
    targets: [],
    held: [{ key, qty: 1 }],
    actions: [],
  });
  ex.positions.set(`S0-USDT|${ps}`, 1);
  ex.history.push({
    symbol: "S0-USDT",
    positionSide: ps,
    side: side === 1 ? "SELL" : "BUY",
    type: tp === null ? "STOP_MARKET" : "TAKE_PROFIT_MARKET",
    status: "FILLED",
    avgPrice: tp ?? ownStop,
    executedQty: 1,
    clientOrderId: tp === null ? `${tag}Sa2` : `${tag}Ta3`,
    updateTime: at - H,
  });
  const candles: Candle[] = bars.map((b, i) => ({ t: at - (30 - i) * 60_000, o: 10, h: b.h, l: b.l, c: 10, v: 1 }));
  Object.assign(rt, { candles: new Map([["S0-USDT", CandleSeries.fromCandles(candles)]]) });
  await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
  const flats = rt.db.all<{ px: number; msg: string | null }>(
    "SELECT px, msg FROM live_orders WHERE cfg = ? AND kind = 'F' ORDER BY at, rowid",
    `control|${key}`,
  );
  return flats.at(-1)!;
}

describe("the stop a flat marker is priced at: a new position's own stop only (live.server.ts stepLive)", { timeout: 60_000 }, () => {
  it("(e) LONG: a new position with no stop row of its own is not closed at the earlier position's stop 9.7 (plan item 15)", async () => {
    const m = await closedOutside(1, 9.7, null, [{ h: 10.1, l: 9.4 }]);
    assert.ok(!String(m.msg).includes("(stop"), `booked at a stop it never had: "${m.msg}" at ${m.px}`);
    assert.notEqual(m.px, 9.7);
  });

  it("(e) SHORT: a new position with no stop row of its own is not closed at the earlier stop 10.3 (plan item 15)", async () => {
    const m = await closedOutside(-1, 10.3, null, [{ h: 10.6, l: 9.9 }]);
    assert.ok(!String(m.msg).includes("(stop"), `booked at a stop it never had: "${m.msg}" at ${m.px}`);
    assert.notEqual(m.px, 10.3);
  });

  it("(e) LONG control: the position's own stop 9.5 is the one priced (pass)", async () => {
    const m = await closedOutside(1, 9.7, 9.5, [{ h: 10.1, l: 9.4 }]);
    assert.deepEqual([m.px, m.msg], [9.5, "flat on the exchange (stop 9.5)"]);
  });

  it("(e) SHORT control: the position's own stop 10.1 is the one priced (pass)", async () => {
    const m = await closedOutside(-1, 10.3, 10.1, [{ h: 10.6, l: 9.9 }]);
    assert.deepEqual([m.px, m.msg], [10.1, "flat on the exchange (stop 10.1)"]);
  });

  it("(e) relaunch LONG: our stop filled while the desk was away and the history read finds nothing: the close is booked at that stop 9.5", async () => {
    const m = await closedOnRelaunch(1, 9.5, [{ h: 10.1, l: 9.4 }]);
    assert.deepEqual([m.px, m.msg], [9.5, "own exit filled while away — the position there is not ours (stop 9.5)"]);
  });

  it("(e) relaunch SHORT: our stop filled while the desk was away and the history read finds nothing: the close is booked at that stop 10.5", async () => {
    const m = await closedOnRelaunch(-1, 10.5, [{ h: 10.6, l: 9.9 }]);
    assert.deepEqual([m.px, m.msg], [10.5, "own exit filled while away — the position there is not ours (stop 10.5)"]);
  });

  it("(e) relaunch take-profit LONG: our take-profit filled while the desk was away with the stop untouched, and the history read finds nothing: the close is booked at that take-profit 10.5", async () => {
    // the bars reach the take-profit (high 10.6) and not the stop (low 9.9 against 9.5)
    const m = await closedOnRelaunch(1, 9.5, [{ h: 10.6, l: 9.9 }], 10.5);
    assert.deepEqual([m.px, m.msg], [10.5, "own exit filled while away — the position there is not ours (target 10.5)"]);
  });

  it("(e) relaunch take-profit SHORT: our take-profit filled while the desk was away with the stop untouched, and the history read finds nothing: the close is booked at that take-profit 9.5", async () => {
    // the mirror: the bars reach the take-profit (low 9.4) and not the stop (high 10.1 against 10.5)
    const m = await closedOnRelaunch(-1, 10.5, [{ h: 10.1, l: 9.4 }], 9.5);
    assert.deepEqual([m.px, m.msg], [9.5, "own exit filled while away — the position there is not ours (target 9.5)"]);
  });
});

/**
 * One control step on a desk whose key S0 holds a position of this side, opened 3 h ago at 10 with its own stop and its
 * own take-profit, and no order history: the venue shows the side flat, so the position closed outside this system. The
 * 1-minute bars of the last 30 minutes are `bars`. `stopRests`: the venue leaves the stop on the book after the take-profit
 * filled. Returns the flat marker the step wrote.
 */
async function closedAtTarget(side: 1 | -1, stop: number, tp: number, bars: Array<Pick<Candle, "h" | "l">>, stopRests = false) {
  resetLiveBackoff();
  const { rt } = fakeRt(new CoreDb(":memory:"));
  const tag = liveTag(rt.settings.live.connId);
  const key = `S0-USDT|${side}`;
  const at = Date.now();
  const put = (coid: string, kind: string, qty: number, px: number, t: number) =>
    rt.db.run(
      "INSERT INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ok', '', ?)",
      coid,
      `control|${key}`,
      "S0-USDT",
      side,
      kind,
      qty,
      px,
      t,
    );
  put(`${tag}Ea1`, "O", 1, 10, at - 3 * H);
  put(`${tag}Sa2`, "S", 0, stop, at - 3 * H + 1);
  put(`${tag}Ta3`, "T", 0, tp, at - 3 * H + 2);
  const ex = new SimExchange();
  if (stopRests)
    ex.orders.push({
      id: "stop-resting",
      venueSymbol: "S0-USDT",
      symbol: "S0-USDT",
      clientOrderId: `${tag}Sa2`,
      positionSide: side === 1 ? "LONG" : "SHORT",
      type: "STOP_MARKET",
      stopPrice: stop,
      qty: 1,
    });
  const candles: Candle[] = bars.map((b, i) => ({ t: at - (30 - i) * 60_000, o: 10, h: b.h, l: b.l, c: 10, v: 1 }));
  Object.assign(rt, { candles: new Map([["S0-USDT", CandleSeries.fromCandles(candles)]]) });
  await stepLive(rt as unknown as CoreRuntime, [], 1, ex);
  const flats = rt.db.all<{ px: number; msg: string | null }>(
    "SELECT px, msg FROM live_orders WHERE cfg = ? AND kind = 'F' ORDER BY at, rowid",
    `control|${key}`,
  );
  return flats.at(-1)!;
}

describe("the take-profit a flat marker is priced at: a new position's own take-profit (live.server.ts stepLive, tpPxOf)", { timeout: 60_000 }, () => {
  it("(e) take-profit LONG: a position closed at its take-profit 10.5 with no history is booked at that take-profit, not unverified (plan item 15)", async () => {
    // the bars reach the take-profit (high 10.6) and not the stop (low 9.9 against 9.5)
    const m = await closedAtTarget(1, 9.5, 10.5, [{ h: 10.6, l: 9.9 }]);
    assert.deepEqual([m.px, m.msg], [10.5, "flat on the exchange (target 10.5)"]);
  });

  it("(e) take-profit SHORT: a position closed at its take-profit 9.5 with no history is booked at that take-profit, not unverified (plan item 15)", async () => {
    // the mirror: the bars reach the take-profit (low 9.4) and not the stop (high 10.1 against 10.5)
    const m = await closedAtTarget(-1, 10.5, 9.5, [{ h: 10.1, l: 9.4 }]);
    assert.deepEqual([m.px, m.msg], [9.5, "flat on the exchange (target 9.5)"]);
  });

  it("(e) take-profit with the stop still resting LONG: a take-profit that filled while the venue left our stop on the book, no history: booked at the take-profit 10.5 (plan item 15)", async () => {
    const m = await closedAtTarget(1, 9.5, 10.5, [{ h: 10.6, l: 9.9 }], true);
    assert.deepEqual([m.px, m.msg], [10.5, "flat on the exchange (target 10.5)"]);
  });

  it("(e) take-profit with the stop still resting SHORT: a take-profit that filled while the venue left our stop on the book, no history: booked at the take-profit 9.5 (plan item 15)", async () => {
    const m = await closedAtTarget(-1, 10.5, 9.5, [{ h: 10.1, l: 9.4 }], true);
    assert.deepEqual([m.px, m.msg], [9.5, "flat on the exchange (target 9.5)"]);
  });
});

// ── lane exits name their side (live.server.ts reconcileLaneCloses, live-record.ts attributeLanes) ───────────────────
describe("lane exits name their side: reconciled fills and lane closes (f)", () => {
  it("(f) reconcile: the BUY fill of the SHORT lane's stop is its exit; r is the short's return less the cost; the LONG lane of the symbol is not touched", () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const tag = liveTag(rt.settings.live.connId);
    const t = Date.now() - H;
    const ins = (id: string, side: 1 | -1, exit: number, reason: string, src: string) =>
      rt.db.run(
        "INSERT INTO live_lane_trades (id, exit_t, cfg, sym, side, entry_t, entry, exit, r, reason, px_src) VALUES (?, ?, ?, ?, ?, ?, 10, ?, ?, ?, ?)",
        id,
        t,
        CFG,
        SYM,
        side,
        t - 2 * H,
        exit,
        (side * (exit - 10)) / 10 - 0.002,
        reason,
        src,
      );
    // both lanes were booked at the ticker, 10.5: the SHORT lost 5 %, the LONG gained 5 %
    ins("long", 1, 10.5, "unverified", "ticker");
    ins("short", -1, 10.5, "unverified", "ticker");
    // the venue's stop of the SHORT filled at 9.6: a BUY on the SHORT position side. No LONG fill is in the history.
    const hist = [
      {
        symbol: SYM,
        positionSide: "SHORT",
        side: "BUY",
        status: "FILLED",
        type: "STOP_MARKET",
        avgPrice: 9.6,
        executedQty: 1,
        clientOrderId: `${tag}Sabc`,
        updateTime: t - 30_000,
      },
    ];
    assert.equal(reconcileLaneCloses(rt as never, hist), 1, "only the SHORT lane has a closing fill");
    const got = rt.db.all<{ id: string; side: number; reason: string; px_src: string; exit: number; r: number }>(
      // relation: all rows — the fixture reads back every row it wrote
      "SELECT id, side, reason, px_src, exit, r FROM live_lane_trades ORDER BY id",
    );
    const short = got.find((x) => x.id === "short")!;
    const long = got.find((x) => x.id === "long")!;
    assert.deepEqual([short.side, short.reason, short.px_src, short.exit], [-1, "stop", "history", 9.6]);
    // the short gained 4 % at 9.6 (side × (exit − entry) / entry), less the row's own 0.2 % cost — a positive r
    assert.ok(near(short.r, 0.038), `short r ${short.r}`);
    assert.deepEqual([long.side, long.reason, long.px_src, long.exit], [1, "unverified", "ticker", 10.5]);
    assert.ok(near(long.r, 0.048), `long r ${long.r}`);
  });

  it("(f) attributeLanes: a SHORT lane the desk closes at 95 books +5 % less the cost; one the exchange stops at 105 books the loss", () => {
    const K = `${SYM}|-1`;
    const lane = { id: `${CFG}|${SYM}|${T}`, cfg: CFG, sym: SYM, side: -1 as const };
    const join = attributeLanes(
      {},
      {
        lanes: [lane],
        heldAfter: new Set([K]),
        grew: new Map([[K, 100]]),
        shrank: new Map(),
        external: new Map(),
        prices: new Map([[SYM, 100]]),
        cost: 0.002,
        now: T,
      },
    );
    const open = join.open[laneKeyOf(lane)];
    assert.equal(open?.px, 100, "the short joins at its fill");
    const sold = attributeLanes(join.open, {
      lanes: [],
      heldAfter: new Set(),
      grew: new Map(),
      shrank: new Map([[K, 95]]),
      external: new Map(),
      prices: new Map([[SYM, 95]]),
      cost: 0.002,
      now: T + H,
    });
    assert.equal(sold.closed.length, 1);
    assert.deepEqual([sold.closed[0].side, sold.closed[0].reason, sold.closed[0].exit], [-1, "exit", 95]);
    assert.ok(near(sold.closed[0].r, 0.048), `r ${sold.closed[0].r}`);
    const stopped = attributeLanes(join.open, {
      lanes: [],
      heldAfter: new Set(),
      grew: new Map(),
      shrank: new Map(),
      external: new Map([[K, 105]]),
      prices: new Map([[SYM, 105]]),
      cost: 0.002,
      now: T + H,
    });
    assert.equal(stopped.closed.length, 1);
    assert.deepEqual([stopped.closed[0].side, stopped.closed[0].reason, stopped.closed[0].exit], [-1, "stop", 105]);
    assert.ok(near(stopped.closed[0].r, -0.052), `r ${stopped.closed[0].r}`);
  });
});
