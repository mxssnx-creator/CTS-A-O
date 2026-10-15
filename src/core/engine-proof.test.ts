// The engine proof (live.engineProofN, operator 13 Oct: "signals + engine above PF 1"): an engine config reaches the
// exchange only once its own forward closes — the exchange record once that holds N, else the paper book's — number N
// and their last N hold PF ≥ engineProofPf; until then it trades on paper only. Signals are not judged by it.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ENGINE_PROOF_PF, engineProven } from "./live-validation.ts";
import { liveRecords } from "./live-record.ts";
import { liveLaneFilter, stepLive, type ExchangeClient } from "./server/live.server.ts";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { checkSettings } from "./settings-check.ts";
import { fakeRt, rng, SimExchange } from "./test-support.ts";

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

  it("the live filter sends an engine lane only when proven; signals are not judged; off = unchanged", () => {
    const s = { ...DEFAULT_SETTINGS.live };
    const off = liveLaneFilter(s, null, null, null).sendable;
    assert.equal(off({ cfg: ENG, vol: 1 }), true);
    const on = liveLaneFilter(s, null, null, new Set([ENG2])).sendable;
    assert.equal(on({ cfg: ENG, vol: 1 }), false, "not proven: paper only");
    assert.equal(on({ cfg: ENG2, vol: 1 }), true);
    assert.equal(on({ cfg: SIG, vol: 1 }), true, "signals are not judged by the engine proof");
  });

  it("the live step: an unproven engine config opens nothing on the exchange, a proven one and a signal do", async () => {
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
    rt.paper.positions = [lane(SIG, 17)] as never;
    await stepLive(rt as never, [], 1, ex as unknown as ExchangeClient);
    const one = await qty();
    assert.ok(one > 0, "the signal opened");
    // the unproven engine config joins the held key on paper: the exchange position stays the signal's
    rt.paper.positions = [lane(SIG, 17), lane(ENG, 17)] as never;
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
        "INSERT INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, unit_r) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        "INSERT INTO paper_book_trades (cfg, sym, side, entry_t, exit_t, r, vol, reason, held_at, at, unit_r) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        "EXPLAIN QUERY PLAN SELECT cfg, exit_t, r FROM paper_book_trades WHERE reason != 'dropped' AND r IS NOT NULL",
      )
      .map((x) => x.detail)
      .join(" ");
    assert.match(plan, /paper_book_trades_closed/, plan);
  });
});
