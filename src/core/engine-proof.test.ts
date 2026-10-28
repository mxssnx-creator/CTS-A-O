// The engine proof (live.engineProofN, operator 13 Oct: "signals + engine above PF 1"): an engine config reaches the
// exchange only once its own forward closes — the exchange record once that holds N, else the paper book's — number N
// and their last N hold PF ≥ engineProofPf; until then it trades on paper only. Signals are not judged by it.
// The signal proof (live.signalProofN, operator 14 Oct: built, off): the same rule per signal unit (indicator × side),
// whose last N closes must also span signalProofEvents distinct events (symbol × side × entry bar).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ENGINE_PROOF_PF,
  SIGNAL_PROOF_EVENTS,
  SIGNAL_PROOF_PF,
  engineProven,
  lastNProven,
  liveGate,
  signalProven,
} from "./live-validation.ts";
import { isSignalInd } from "./indications/registry.ts";
import { liveRecords, type LiveRecord } from "./live-record.ts";
import { liveLaneFilter, stepLive, type ExchangeClient } from "./server/live.server.ts";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { checkSettings } from "./settings-check.ts";
import { authorizeSyntheticLanes, fakeRt, rng, SimExchange } from "./test-support.ts";

process.env.CTS_CORE_LIVE = "1";

const ENG = "follow|rsi-mom-14-25@m15c|tp1.3|sl3.9|tr0|h96|sh";
const ENG2 = "revert|ema-21-55@m15|tp2|sl2|tr0|h96|gn";
const SIG = "follow|sig-ema-cross-s@m15|tp1|sl2|tr0|h192";
const rec = (cfg: string, rs: number[], t0 = 1_000) => rs.map((r, i) => ({ cfg, exitT: t0 + i * 60_000, r }));

describe("engine proof", () => {
  it("a config is proven by its own last N closes at PF ≥ the floor; fewer than N is not proven (hand-computed)", () => {
    // ENG: last 3 of 4 closes: +0.02, −0.01, +0.01 → PF 3; ENG2: +0.01, −0.01, +0.003 → PF 1.3 (one minute later)
    const paper = liveRecords([
      ...rec(ENG, [-0.05, 0.02, -0.01, 0.01]),
      ...rec(ENG2, [0.01, -0.01, 0.003], 61_000),
      ...rec(SIG, [0.03, 0.03, 0.03]),
    ]);
    const a = engineProven(paper, new Map(), 1e12, 3, 1.2);
    assert.deepEqual([...a.proven].sort(), [ENG, ENG2].sort());
    assert.equal(a.judged, 2, "the signal config is never judged");
    // n = 4: ENG's whole record PF 0.03 / 0.06 = 0.5 → not proven; ENG2 has 3 closes → not judged, not proven
    const b = engineProven(paper, new Map(), 1e12, 4, 1.2);
    assert.deepEqual([...b.proven], []);
    assert.equal(b.judged, 1);
    // closes after `now` are not known yet
    const c = engineProven(paper, new Map(), 1_000 + 2 * 60_000, 3, 1.2);
    assert.deepEqual([...c.proven], [], "ENG by then: −0.05, +0.02, −0.01 (PF 0.33); ENG2 only 2 closes");
    assert.equal(c.judged, 1);
    // a stricter floor: ENG2's 1.3 fails 1.5
    assert.deepEqual([...engineProven(paper, new Map(), 1e12, 3, 1.5).proven], [ENG]);
    // off
    assert.equal(engineProven(paper, new Map(), 1e12, 0, 1.2).proven.size, 0);
    assert.equal(ENGINE_PROOF_PF, 1.2);
  });

  it("the exchange record decides once it holds N closes; the paper book's until then", () => {
    const paper = liveRecords(rec(ENG, [0.01, 0.01, 0.01]));
    // the exchange lost on the same config: its 3 closes decide
    const lost = liveRecords(rec(ENG, [-0.01, -0.01, 0.005]));
    assert.deepEqual([...engineProven(paper, lost, 1e12, 3, 1.2).proven], []);
    // only 2 exchange closes: the paper book decides
    const few = liveRecords(rec(ENG, [-0.01, -0.01]));
    assert.deepEqual([...engineProven(paper, few, 1e12, 3, 1.2).proven], [ENG]);
  });

  it("engineProven is lastNProven on engine configs: the result before the generalization, bit for bit (random records)", () => {
    // the engine proof as it was written before lastNProven generalized it (061eedd): the reference the wrapper keeps
    const before = (
      paper: ReadonlyMap<string, LiveRecord>,
      exchange: ReadonlyMap<string, LiveRecord>,
      now: number,
      n: number,
      minPf: number,
    ) => {
      const proven = new Set<string>();
      let judged = 0;
      if (!(n > 0)) return { proven, judged };
      for (const id of new Set([...paper.keys(), ...exchange.keys()])) {
        if (isSignalInd(id.split("|")[1] ?? "")) continue;
        const ex = exchange.get(id);
        const exG = ex ? liveGate(ex, 0, now, n, minPf) : null;
        const pp = paper.get(id);
        const g = exG && exG.pf !== null ? exG : pp ? liveGate(pp, 0, now, n, minPf) : null;
        if (!g || g.pf === null) continue;
        judged++;
        if (g.ok) proven.add(id);
      }
      return { proven, judged };
    };
    const rand = rng(7);
    const cfgs = [ENG, ENG2, SIG, "follow|ema-21-55@m15|tp1|sl2|tr0|h96|mn", "revert|cci-40-200@m15|tp3|sl3|tr1|h96|lg"];
    const rows = (k: number) =>
      Array.from({ length: k }, () => ({
        cfg: cfgs[Math.floor(rand() * cfgs.length)],
        // ties in exit time on purpose (the same minute)
        exitT: 1_000 + Math.floor(rand() * 40) * 60_000,
        r: (rand() - 0.45) * 0.04,
      }));
    for (let i = 0; i < 40; i++) {
      const paper = liveRecords(rows(Math.floor(rand() * 60)));
      const exchange = liveRecords(rows(Math.floor(rand() * 30)));
      const now = rand() < 0.3 ? 1_000 + Math.floor(rand() * 40) * 60_000 : 1e12;
      const n = Math.floor(rand() * 8);
      const minPf = [0, 1, 1.2, 2][Math.floor(rand() * 4)];
      const a = engineProven(paper, exchange, now, n, minPf);
      const b = before(paper, exchange, now, n, minPf);
      assert.deepEqual([...a.proven], [...b.proven], `case ${i}`);
      assert.equal(a.judged, b.judged, `case ${i}`);
      const c = lastNProven({ paper, exchange }, now, { n, minPf, judge: (id) => !isSignalInd(id.split("|")[1] ?? "") });
      assert.deepEqual(c, a);
    }
  });

  it("the live filter sends an engine lane only when proven; signals are not judged; off = unchanged", () => {
    const s = { ...DEFAULT_SETTINGS.live };
    const off = liveLaneFilter(s, null, null, null).sendable;
    assert.equal(off({ cfg: ENG, vol: 1 }), true);
    const on = liveLaneFilter(s, null, null, new Set([ENG2])).sendable;
    assert.equal(on({ cfg: ENG, vol: 1 }), false, "not proven: paper only");
    assert.equal(on({ cfg: ENG2, vol: 1 }), true);
    assert.equal(on({ cfg: SIG, vol: 1 }), true, "signals are not judged by the engine proof");
  });

  it("the live step: an exact losing owned engine record opens nothing, a proven engine lane and signal do", async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const lane = (cfg: string, sym: string, px: number) => ({
      cfg,
      sym,
      side: 1 as const,
      entry: px,
      stop: px * 0.97,
      target: px * 1.03,
      entryT: Date.now() - 60_000,
      vol: 1,
    });
    rt.paper.positions = [lane(ENG, "S1-USDT", 17), lane(ENG2, "S2-USDT", 24), lane(SIG, "S3-USDT", 31)] as never;
    authorizeSyntheticLanes(rt, [{ cfg: ENG, sym: "S1-USDT", side: 1 }], { ownedReturns: [-.01] });
    (rt as unknown as { engineProof: () => unknown }).engineProof = () => ({ proven: new Set([ENG2]), judged: 2, n: 3, minPf: 1.2 });
    const ex = new SimExchange(rng(1));
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    const held = (await ex.book()).positions.filter((p) => p.qty > 0).map((p) => p.symbol).sort();
    assert.deepEqual(held, ["S2-USDT", "S3-USDT"]);
  });

  it("an unproven engine lane on a key a signal holds adds no volume and does not keep the position after the signal exits", async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const lane = (cfg: string, px: number) => ({
      cfg,
      sym: "S1-USDT",
      side: 1 as const,
      entry: px,
      stop: px * 0.97,
      target: px * 1.03,
      entryT: Date.now() - 60_000,
      vol: 1,
    });
    (rt as unknown as { engineProof: () => unknown }).engineProof = () => ({ proven: new Set<string>(), judged: 1, n: 3, minPf: 1.2 });
    const ex = new SimExchange(rng(1));
    const qty = async () => (await ex.book()).positions.filter((p) => p.symbol === "S1-USDT" && p.qty > 0).reduce((a, p) => a + p.qty, 0);
    const signalLane = lane(SIG, 17);
    rt.paper.positions = [signalLane] as never;
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    const one = await qty();
    assert.ok(one > 0, "the signal opened");
    // the unproven engine config joins the held key on paper: the exchange position stays the signal's
    rt.paper.positions = [signalLane, lane(ENG, 17)] as never;
    authorizeSyntheticLanes(rt, [{ cfg: ENG, sym: "S1-USDT", side: 1 }], { ownedReturns: [-.01] });
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    assert.equal(await qty(), one, "no volume for the unproven lane");
    // the signal exits: nothing is left on the exchange for the unproven lane
    rt.paper.positions = [lane(ENG, 17)] as never;
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    assert.equal(await qty(), 0, "closed with the signal");
  });

  it("the runtime reads the paper book's closes ('dropped' marks left out) and the setting is validated", () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { live: { ...DEFAULT_SETTINGS.live, engineProofN: 2 } } as never, { market: "synthetic" });
    const ins = (cfg: string, entryT: number, r: number, reason = "tp") =>
      db.run(
        "INSERT INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, unit_r, owned_notional_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 20)",
        cfg, "S1-USDT", 1, entryT, entryT + 60_000, r, 1, reason, entryT, entryT, r,
      );
    ins(ENG, 1_000, 0.02);
    ins(ENG, 2_000, -0.01);
    // a dropped position's mark is not a close: with it ENG2 would have 2 closes at PF 1.5
    ins(ENG2, 1_000, 0.03);
    ins(ENG2, 2_000, -0.02, "dropped");
    const p = rt.engineProof(Date.now());
    assert.ok(p);
    assert.deepEqual([...p.proven], [ENG]);
    assert.equal(p.judged, 1);
    assert.equal(p.minPf, ENGINE_PROOF_PF);
    // off: null (the filter sends as before)
    rt.settings.live.engineProofN = 0;
    assert.equal(rt.engineProof(), null);
    assert.doesNotThrow(() => checkSettings({ live: { ...DEFAULT_SETTINGS.live, engineProofN: 25, engineProofPf: 1.2 } } as never));
    assert.throws(() => checkSettings({ live: { ...DEFAULT_SETTINGS.live, engineProofN: 2.5 } } as never), /engine proof/);
    assert.throws(() => checkSettings({ live: { ...DEFAULT_SETTINGS.live, engineProofPf: -1 } } as never), /engine proof PF/);
  });

  it("an unchanged book costs no query (every live control step asks); a new close re-reads it from the partial index", () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { live: { ...DEFAULT_SETTINGS.live, engineProofN: 2 } } as never, { market: "synthetic" });
    const ins = (cfg: string, entryT: number, r: number) =>
      db.run(
        "INSERT INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, unit_r, owned_notional_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 20)",
        cfg, "S1-USDT", 1, entryT, entryT + 60_000, r, 1, "tp", entryT, entryT, r,
      );
    ins(ENG, 1_000, 0.02);
    ins(ENG, 2_000, -0.01);
    const first = rt.engineProof(Date.now());
    let queries = 0;
    const D = db as unknown as { get: (...a: unknown[]) => unknown; all: (...a: unknown[]) => unknown };
    const [get0, all0] = [D.get.bind(db), D.all.bind(db)];
    D.get = (...a) => (queries++, get0(...a));
    D.all = (...a) => (queries++, all0(...a));
    for (let i = 0; i < 50; i++) assert.equal(rt.engineProof(Date.now()), first, "the same memoized result");
    assert.equal(queries, 0, "no query while nothing was written");
    // a new close of ENG2 (and a trim deleting nothing) moves the version: one re-read, ENG2 now judged
    ins(ENG2, 1_000, 0.03);
    ins(ENG2, 2_000, -0.01);
    const second = rt.engineProof(Date.now());
    assert.ok(queries > 0);
    assert.deepEqual([...second!.proven].sort(), [ENG, ENG2].sort());
    // the rebuild query reads the partial covering index, not the table
    const plan = db
      .all<{ detail: string }>(
        "EXPLAIN QUERY PLAN SELECT cfg, exit_t, r / COALESCE(NULLIF(mult, 0), NULLIF(vol, 0), 1) AS r FROM paper_book_trades WHERE reason != 'dropped' AND r IS NOT NULL",
      )
      .map((x) => x.detail)
      .join(" ");
    assert.match(plan, /paper_book_trades_unit/, plan);
  });

  it("judged at one unit: a Block-raised paper close weighs its edge, not its multiple (as the exchange record does)", () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { live: { ...DEFAULT_SETTINGS.live, engineProofN: 2, engineProofPf: 1.2 } } as never, { market: "synthetic" });
    const ins = (cfg: string, entryT: number, r: number, mult: number | null, vol = mult ?? 1) =>
      db.run(
        "INSERT INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, mult) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        cfg, "S1-USDT", 1, entryT, entryT + 60_000, r, vol, "tp", entryT, entryT, mult,
      );
    // ENG: +1 % at 4× (stored +4 %) and −2 % at one unit: sized PF 2, unit PF 0.5 — not proven
    ins(ENG, 1_000, 0.04, 4);
    ins(ENG, 2_000, -0.02, 1);
    // ENG2, rows of an older build: volume alone cannot prove the external return multiplier.
    ins(ENG2, 1_000, 0.03, null, 1);
    ins(ENG2, 2_000, -0.02, null, 2);
    assert.deepEqual([...rt.engineProof(Date.now())!.proven], []);
    // Two explicit older wins cannot replace unknown newer closes in the current Last-2 window.
    ins(ENG2, -100_000, .03, 1); ins(ENG2, -90_000, .03, 1);
    assert.deepEqual([...rt.engineProof(Date.now())!.proven], []);
    db.run("UPDATE paper_book_trades SET mult = vol WHERE cfg = ? AND mult IS NULL", ENG2);
    assert.deepEqual([...rt.engineProof(Date.now())!.proven], [ENG2], "explicit known multipliers restore measured PF3");
    db.run("UPDATE paper_book_trades SET mult = ? WHERE cfg = ? AND entry_t = 2000", Infinity, ENG2);
    assert.deepEqual([...rt.engineProof(Date.now())!.proven], [], "a nonfinite loss multiplier is unknown, not a zero-return winner");
  });

  it("a database of an older build gains paper_book_trades.mult and the unit index on open", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const dir = mkdtempSync(join(tmpdir(), "pbt-"));
    try {
      const file = join(dir, "old.db");
      const old = new DatabaseSync(file);
      old.exec(
        "CREATE TABLE paper_book_trades (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, r REAL, vol REAL, reason TEXT, held_at INTEGER, at INTEGER, PRIMARY KEY (cfg, sym, side, entry_t)) WITHOUT ROWID;" +
          "CREATE INDEX paper_book_trades_closed ON paper_book_trades (cfg, exit_t, r) WHERE reason != 'dropped';" +
          `INSERT INTO paper_book_trades VALUES ('${ENG}', 'S1-USDT', 1, 1000, 61000, 0.02, 1, 'tp', 1000, 1000);`,
      );
      old.close();
      const db = new CoreDb(file);
      const cols = db.all<{ name: string }>("PRAGMA table_info(paper_book_trades)").map((x) => x.name);
      assert.ok(cols.includes("mult"), cols.join(","));
      const idx = db.all<{ name: string }>("PRAGMA index_list(paper_book_trades)").map((x) => x.name);
      assert.ok(idx.includes("paper_book_trades_unit") && !idx.includes("paper_book_trades_closed"), idx.join(","));
      assert.equal(db.get<{ n: number }>("SELECT COUNT(*) AS n FROM paper_book_trades")?.n, 1, "the old rows stay");
      db.db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

const BAR = 900_000; // the event bar (bot-stats EVENT_BAR_MS: configs entering on one 15-minute bar are one event)
const T0 = 2_000 * BAR;
const EMA = "sig-ema-cross-s@m15";
const OBV = "sig-obv-m@m15";
const sigCfg = (ind: string, k: number) => `follow|${ind}|tp${k}|sl2|tr0|h192`;
/** one close of a paper position (cfg, sym, side, paper entry time), its id the lane id cfg|sym|side|entryT */
const close = (cfg: string, sym: string, side: 1 | -1, entryT: number, exitT: number, r: number) => ({
  id: `${cfg}|${sym}|${side}|${entryT}`,
  cfg,
  sym,
  side,
  exitT,
  r,
});
const x = (i: number) => T0 + 10 * BAR + i * 60_000;
/** EMA long: five configs, one entry bar on one symbol — 5 closes, 1 event (PF 0.043 / 0.005 = 8.6) */
const emaLong = [0.01, 0.02, -0.005, 0.01, 0.003].map((r, i) => close(sigCfg(EMA, i + 1), "S1-USDT", 1, T0 + 60_000, x(i), r));
/** OBV short: 3 events (S1 bar 0, S2 bar 0, S1 bar 1) — PF (0.02 + 0.01 + 0.004) / (0.01 + 0.005) = 2.27 */
const obvShort = [
  close(sigCfg(OBV, 1), "S1-USDT", -1, T0 + 60_000, x(0), 0.02),
  close(sigCfg(OBV, 2), "S1-USDT", -1, T0 + 60_000, x(1), -0.01),
  close(sigCfg(OBV, 1), "S2-USDT", -1, T0 + 120_000, x(2), 0.01),
  close(sigCfg(OBV, 1), "S1-USDT", -1, T0 + BAR + 60_000, x(3), -0.005),
  close(sigCfg(OBV, 2), "S1-USDT", -1, T0 + BAR + 60_000, x(4), 0.004),
];
/** OBV long: the same indicator's other side, losing — PF 0.007 / 0.03 = 0.23 */
const obvLong = [-0.01, -0.01, 0.005, -0.01, 0.002].map((r, i) =>
  close(sigCfg(OBV, 1), i < 2 ? "S3-USDT" : "S4-USDT", 1, T0 + 60_000, x(i), r),
);
/** an engine config's winners: never judged by the signal proof */
const engLane = [0.01, 0.01, 0.01, 0.01, 0.01].map((r, i) => close(ENG, `S${i + 1}-USDT`, 1, T0 + i * BAR, x(i), r));
const units = (p: { proven: Set<string> }) => [...p.proven].sort();

describe("signal proof", () => {
  it("a unit (indicator × side) is proven by its last N closes at PF ≥ the floor spanning ≥ minEvents events (hand-computed)", () => {
    assert.equal(SIGNAL_PROOF_PF, 1.2);
    assert.equal(SIGNAL_PROOF_EVENTS, 2);
    const paper = [...emaLong, ...obvShort, ...obvLong, ...engLane];
    const o = { n: 5, minPf: 1.2, minEvents: 2 };
    const a = signalProven(paper, [], 1e15, o);
    // EMA long: PF 8.6 but its 5 closes are one event → not proven; OBV short: PF 2.27 over 3 events → proven; OBV
    // long: PF 0.23 → not proven (each side is its own unit); the engine config is not judged
    assert.deepEqual(units(a), [`${OBV}|-1`]);
    assert.equal(a.judged, 3);
    // one event is enough: EMA long is proven as well
    assert.deepEqual(units(signalProven(paper, [], 1e15, { ...o, minEvents: 1 })), [`${EMA}|1`, `${OBV}|-1`]);
    // a stricter floor: OBV short's 2.27 fails 2.5
    assert.deepEqual(units(signalProven(paper, [], 1e15, { ...o, minPf: 2.5 })), []);
    // fewer than N closes: not judged
    assert.equal(signalProven(paper, [], 1e15, { ...o, n: 6 }).judged, 0);
    // closes after `now` are not known yet: 4 closes per unit by x(3)
    const early = signalProven(paper, [], x(3), o);
    assert.deepEqual([units(early), early.judged], [[], 0]);
    // the events of the last N only: OBV short's last 3 (PF 0.014 / 0.005 = 2.8) span 2 events (S2 bar 0, S1 bar 1)
    assert.deepEqual(units(signalProven(obvShort, [], 1e15, { n: 3, minPf: 1.2, minEvents: 2 })), [`${OBV}|-1`]);
    assert.deepEqual(units(signalProven(obvShort, [], 1e15, { n: 3, minPf: 1.2, minEvents: 3 })), []);
    // a close without a side (a legacy row) counts on neither side
    assert.equal(signalProven(obvShort.map((c) => ({ ...c, side: 0 })), [], 1e15, o).judged, 0);
    // off
    assert.equal(signalProven(paper, [], 1e15, { ...o, n: 0 }).proven.size, 0);
  });

  it("the exchange record decides once the unit holds N closes; its events are the lanes' paper entry bars", () => {
    const o = { n: 5, minPf: 1.2, minEvents: 2 };
    assert.deepEqual(units(signalProven(obvShort, [], 1e15, o)), [`${OBV}|-1`]);
    // the exchange lost on the same unit (5 closes, 2 events): it decides
    const lost = [-0.01, -0.01, 0.005, -0.01, 0.002].map((r, i) =>
      close(sigCfg(OBV, 1), i < 2 ? "S1-USDT" : "S2-USDT", -1, T0 + 60_000, x(i), r),
    );
    const l = signalProven(obvShort, lost, 1e15, o);
    assert.deepEqual([units(l), l.judged], [[], 1]);
    // only 4 exchange closes: the paper book decides
    assert.deepEqual(units(signalProven(obvShort, lost.slice(0, 4), 1e15, o)), [`${OBV}|-1`]);
    // 5 winning exchange closes of one paper entry (lanes of five configs, joined at different times): one event —
    // the exchange decides and the paper book's 3 events do not count
    const oneEvent = [0.01, 0.01, 0.01, 0.01, 0.01].map((r, i) => close(sigCfg(OBV, i + 1), "S1-USDT", -1, T0 + 60_000, x(i), r));
    assert.deepEqual(units(signalProven(obvShort, oneEvent, 1e15, o)), []);
    assert.deepEqual(units(signalProven(obvShort, oneEvent, 1e15, { ...o, minEvents: 1 })), [`${OBV}|-1`]);
    // a Block leg (`…|blk:src`) is its lane: its paper entry bar is the event, not the suffix
    const legs = oneEvent.map((c, i) => (i % 2 ? { ...c, id: `${c.id}|blk:${i}` } : c));
    assert.deepEqual(units(signalProven(obvShort, legs, 1e15, o)), []);
  });

  it("the live filter sends a signal lane only when its unit is proven; engine configs are not judged; off = unchanged", () => {
    const s = { ...DEFAULT_SETTINGS.live };
    const S1 = sigCfg(EMA, 1);
    const off = liveLaneFilter(s, null, null, null, null);
    for (const side of [1, -1] as const) {
      assert.equal(off.sendable({ cfg: S1, vol: 1, side }), true);
      assert.equal(off.unproven({ cfg: S1, vol: 1, side }), false);
    }
    const on = liveLaneFilter(s, null, null, null, new Set([`${EMA}|1`]));
    assert.equal(on.sendable({ cfg: S1, vol: 1, side: 1 }), true);
    assert.equal(on.sendable({ cfg: sigCfg(EMA, 2), vol: 1, side: 1 }), true, "every config of the unit");
    assert.equal(on.sendable({ cfg: S1, vol: 1, side: -1 }), false, "the short side is a unit of its own");
    assert.equal(on.sendable({ cfg: sigCfg(OBV, 1), vol: 1, side: 1 }), false);
    assert.equal(on.sendable({ cfg: ENG, vol: 1, side: 1 }), true, "engine configs are not judged by the signal proof");
    assert.equal(on.sendable({ cfg: S1, vol: 1 }), true, "without a side: proven on either side");
    assert.equal(on.sendable({ cfg: sigCfg(OBV, 1), vol: 1 }), false);
    assert.equal(on.validLane({ cfg: S1, vol: 1, sym: "S1-USDT", side: -1 }), false);
    assert.equal(on.validLane({ cfg: S1, vol: 1, sym: "S1-USDT", side: 1 }), true);
    assert.equal(on.unproven({ cfg: S1, vol: 1, side: -1 }), true, "held back by the proof");
    // both proofs: each judges its own configs
    const both = liveLaneFilter(s, null, null, new Set([ENG2]), new Set([`${EMA}|-1`]));
    const sends = (cfg: string, side: 1 | -1) => both.sendable({ cfg, vol: 1, side });
    assert.deepEqual([sends(ENG, 1), sends(ENG2, 1), sends(S1, 1), sends(S1, -1)], [false, true, false, true]);
    // the funnel's "not proven" counts the signal proof only: the engine proof's funnel is as before this option
    assert.equal(both.unproven({ cfg: ENG, vol: 1, side: 1 }), false);
    assert.equal(both.unproven({ cfg: S1, vol: 1, side: 1 }), true);
    assert.equal(liveLaneFilter(s, null, null, new Set<string>(), null).unproven({ cfg: ENG, vol: 1, side: 1 }), false);
    // a lane another filter holds back is not counted as unproven
    const src = liveLaneFilter({ ...s, source: "engine" }, null, null, null, new Set<string>());
    assert.equal(src.sendable({ cfg: S1, vol: 1, side: 1 }), false);
    assert.equal(src.unproven({ cfg: S1, vol: 1, side: 1 }), false, "left out by live.source, not by the proof");
  });

  it("the live step: an unproven unit opens nothing, a proven one does, a held lane is kept; the funnel names the proof", async () => {
    const { rt } = fakeRt(new CoreDb(":memory:"));
    const lane = (cfg: string, sym: string, side: 1 | -1, px: number) => ({
      cfg,
      sym,
      side,
      entry: px,
      stop: px * (1 - side * 0.03),
      target: px * (1 + side * 0.03),
      entryT: Date.now() - 60_000,
      vol: 1,
    });
    let proven: Set<string> | null = null;
    (rt as unknown as { signalProof: () => unknown }).signalProof = () =>
      proven && { proven, judged: 2, n: 5, minPf: 1.2, minEvents: 2 };
    const ex = new SimExchange(rng(1));
    const step = () => stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    const qty = async (sym: string) =>
      (await ex.book()).positions.filter((p) => p.symbol === sym && p.qty > 0).reduce((a, p) => a + p.qty, 0);
    // off: the signal lane opens as before
    const obv = lane(sigCfg(OBV, 1), "S3-USDT", 1, 31);
    rt.paper.positions = [obv] as never;
    await step();
    const held = await qty("S3-USDT");
    assert.ok(held > 0, "the proof off: the signal opened");
    // on, EMA long proven: EMA long opens, EMA short does not, the held OBV long lane is kept
    proven = new Set([`${EMA}|1`]);
    rt.paper.positions = [obv, lane(sigCfg(EMA, 1), "S1-USDT", 1, 17), lane(sigCfg(EMA, 1), "S2-USDT", -1, 24)] as never;
    const st = await step();
    assert.ok((await qty("S1-USDT")) > 0, "the proven unit opens");
    assert.equal(await qty("S2-USDT"), 0, "the unproven side opens nothing");
    assert.equal(await qty("S3-USDT"), held, "a lane already held is kept");
    const k = st.control?.keys?.find((f) => f.key === "S2-USDT|-1");
    assert.ok(k);
    assert.deepEqual([k.target, k.notSent, k.unproven, k.why], [false, 1, 1, "not proven (live.signalProofN)"]);
    // the held lane exits on paper: closed, and not opened again while its unit is unproven
    rt.paper.positions = [lane(sigCfg(EMA, 1), "S1-USDT", 1, 17)] as never;
    await step();
    assert.equal(await qty("S3-USDT"), 0, "closed with its lane");
    rt.paper.positions = [lane(sigCfg(EMA, 1), "S1-USDT", 1, 17), lane(sigCfg(OBV, 2), "S3-USDT", 1, 31)] as never;
    await step();
    assert.equal(await qty("S3-USDT"), 0, "an unproven unit does not reopen");
  });

  it("the runtime: the paper book ('dropped' left out) until the unit's exchange record holds N; memoized; an event on a change", () => {
    const db = new CoreDb(":memory:");
    const rt = new CoreRuntime(db, { live: { ...DEFAULT_SETTINGS.live, signalProofN: 2 } } as never, { market: "synthetic" });
    const book = (cfg: string, sym: string, side: number, entryT: number, exitT: number, r: number, reason = "tp") =>
      db.run(
        "INSERT INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, unit_r, owned_notional_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 20)",
        cfg, sym, side, entryT, exitT, r, 1, reason, entryT, entryT, r,
      );
    const onExchange = (cfg: string, sym: string, side: number, entryT: number, exitT: number, r: number) =>
      db.run(
        "INSERT INTO live_lane_trades (id, exit_t, cfg, sym, side, entry_t, entry, exit, r, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        `${cfg}|${sym}|${side}|${entryT}`, exitT, cfg, sym, side, exitT - 60_000, 1, 1, r, "exit",
      );
    const events = () => db.all<{ msg: string }>("SELECT msg FROM events WHERE msg LIKE 'signal proof:%' ORDER BY id").map((e) => e.msg);
    // EMA long: 2 closes on 2 events, PF 3 → proven
    book(sigCfg(EMA, 1), "S1-USDT", 1, T0, T0 + BAR, 0.03);
    book(sigCfg(EMA, 1), "S2-USDT", 1, T0, T0 + BAR + 60_000, -0.01);
    // OBV short: 2 closes of one entry bar (two configs) → one event, not proven; a dropped mark on another symbol is
    // not a close (with it the last 2 would span 2 events)
    book(sigCfg(OBV, 1), "S1-USDT", -1, T0, T0 + BAR, 0.02);
    book(sigCfg(OBV, 2), "S1-USDT", -1, T0, T0 + BAR + 60_000, 0.01);
    book(sigCfg(OBV, 3), "S2-USDT", -1, T0, T0 + BAR + 30_000, 0.05, "dropped");
    // an engine config is not judged here
    book(ENG, "S1-USDT", 1, T0, T0 + BAR, 0.02);
    book(ENG, "S2-USDT", 1, T0, T0 + BAR, 0.02);
    const p = rt.signalProof();
    assert.ok(p);
    assert.deepEqual([units(p), p.judged, p.n, p.minPf, p.minEvents], [[`${EMA}|1`], 2, 2, SIGNAL_PROOF_PF, SIGNAL_PROOF_EVENTS]);
    assert.equal(events().length, 1);
    assert.match(events()[0], /1 signal unit\(s\) proven of 2/);
    // memoized: no query while nothing was written
    let queries = 0;
    const D = db as unknown as { get: (...a: unknown[]) => unknown; all: (...a: unknown[]) => unknown };
    const [get0, all0] = [D.get.bind(db), D.all.bind(db)];
    D.get = (...a) => (queries++, get0(...a));
    D.all = (...a) => (queries++, all0(...a));
    for (let i = 0; i < 20; i++) assert.equal(rt.signalProof(), p, "the same memoized result");
    assert.equal(queries, 0, "no query while nothing was written");
    // one exchange close of EMA long: re-read, the paper book still decides (and no event: the count is the same)
    onExchange(sigCfg(EMA, 1), "S3-USDT", 1, T0 + 2 * BAR, T0 + 3 * BAR, -0.02);
    const p1 = rt.signalProof();
    assert.ok(queries > 0, "a new exchange close re-reads");
    assert.notEqual(p1, p);
    assert.deepEqual(units(p1!), [`${EMA}|1`]);
    assert.equal(events().length, 1);
    // the second: the exchange record holds N and decides (PF 0.01 / 0.02 = 0.5) — and the event says so
    onExchange(sigCfg(EMA, 1), "S4-USDT", 1, T0 + 2 * BAR, T0 + 3 * BAR + 60_000, 0.01);
    const p2 = rt.signalProof();
    assert.deepEqual([units(p2!), p2!.judged], [[], 2]);
    assert.equal(events().length, 2);
    assert.match(events()[1], /0 signal unit\(s\) proven of 2/);
    D.get = get0;
    D.all = all0;
    // the engine proof is not touched by it (off), and the signal proof off is null (the filter sends as before)
    assert.equal(rt.engineProof(), null);
    rt.settings.live.signalProofN = 0;
    assert.equal(rt.signalProof(), null);
    // the settings: optional, validated
    const ok = { ...DEFAULT_SETTINGS.live, signalProofN: 25, signalProofPf: 1.2, signalProofEvents: 2 };
    assert.doesNotThrow(() => checkSettings({ live: ok } as never));
    assert.doesNotThrow(() => checkSettings({ live: { ...ok, signalProofN: 0 } } as never));
    assert.throws(() => checkSettings({ live: { ...ok, signalProofN: 2.5 } } as never), /signal proof closes/);
    assert.throws(() => checkSettings({ live: { ...ok, signalProofN: 1001 } } as never), /signal proof closes/);
    assert.throws(() => checkSettings({ live: { ...ok, signalProofPf: -1 } } as never), /signal proof PF/);
    assert.throws(() => checkSettings({ live: { ...ok, signalProofPf: 11 } } as never), /signal proof PF/);
    assert.throws(() => checkSettings({ live: { ...ok, signalProofEvents: 0 } } as never), /signal proof events/);
    assert.throws(() => checkSettings({ live: { ...ok, signalProofEvents: 1.5 } } as never), /signal proof events/);
    assert.throws(() => checkSettings({ live: { ...ok, signalProofEvents: 101 } } as never), /signal proof events/);
    for (const k of ["signalProofN", "signalProofPf", "signalProofEvents"])
      assert.ok(!(k in DEFAULT_SETTINGS.live), `${k} is not a default: the proof stays off`);
  });
});
