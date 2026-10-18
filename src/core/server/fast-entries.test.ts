// The realtime entry step (stepPaperGen fast mode): between computes the paper book takes the seated configs' new tape
// positions with the same entry rules as the full paper step — and changes nothing the full step already decided.
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { fastBarFresh, fastEntryLaneDue, fastEntryMode, mergeFastTapes } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { SIGNAL_SOURCES, signalSettings } from "../signal-config.ts";
import { laneInd } from "../indications/registry.ts";
import { signalCoordinationId } from "../signal-coordination.ts";
import type { OpenPosition } from "../domain/types.ts";

process.env.CTS_CORE_SYNTHETIC_END ??= String(Math.floor(Date.now() / 3_600_000) * 3_600_000);
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
const rts: CoreRuntime[] = [];
after(() => rts.forEach((r) => r.stop()));
const until = async (c: () => boolean, ms = 900_000) => {
  const t0 = Date.now();
  while (!c()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

describe("realtime entry step", { timeout: 1_200_000 }, () => {
  it("defaults to selected Break only and gates 5m/15m refreshes on their own closes", () => {
    const t0 = Date.UTC(2026, 9, 16, 12, 0);
    assert.equal(fastEntryMode(""), "break");
    assert.equal(fastEntryMode("break"), "break");
    assert.equal(fastEntryMode("1"), "all");
    assert.equal(fastEntryMode("off"), "off");
    assert.equal(fastBarFresh(t0, t0), true);
    assert.equal(fastBarFresh(t0, t0 + 15_000), true);
    assert.equal(fastBarFresh(t0, t0 + 15_001), false, "late closed bars are not entered after the live window");
    assert.equal(fastBarFresh(t0, t0 - 1), false, "future close timestamps are ignored");
    assert.equal(fastEntryLaneDue("break-rel-don-1-dd24-guarded@m1", t0, 1, "break"), true);
    assert.equal(fastEntryLaneDue("break-rel-don-5-dd24-guarded@m5", t0 + 3 * 60_000, 1, "break"), false);
    assert.equal(fastEntryLaneDue("break-rel-don-5-dd24-guarded@m5", t0 + 4 * 60_000, 1, "break"), true);
    assert.equal(
      fastEntryLaneDue("break-mc-rel-don8-5-dd24-guarded@m5", t0 + 4 * 60_000, 1, "break"),
      true,
      "new Micro Break IDs use the same seconds refresh at their anchor close",
    );
    assert.equal(fastEntryLaneDue("break-rel-don-15-dd24-guarded@m15", t0 + 13 * 60_000, 1, "break"), false);
    assert.equal(fastEntryLaneDue("break-rel-don-15-dd24-guarded@m15", t0 + 14 * 60_000, 1, "break"), true);
    assert.equal(fastEntryLaneDue("trend-ema@m1", t0, 1, "break"), false);
    assert.equal(fastEntryLaneDue("trend-ema@m1", t0, 1, "all"), true);
    const coordinator = laneInd(
      signalCoordinationId(["ema-cross", "macd-cross", "rsi-reversal"], 0.6, 3, 3),
      15,
    );
    assert.equal(fastEntryLaneDue(coordinator, t0 + 14 * 60_000, 1, "break"), false);
    assert.equal(
      fastEntryLaneDue(coordinator, t0 + 14 * 60_000, 1, "all"),
      true,
      "the all-entry mode schedules a coordinator refresh on its own 15m close",
    );
  });

  it("publishes refreshed pending tapes without replacing unrelated identities", () => {
    const pendingA = { id: "follow|break-rel-don-1-dd24-guarded", pending: [{ sym: "AAA-USDT", side: 1 }] };
    const oldA = { ...pendingA, pending: [] };
    const keep = { id: "follow|ema-21-55", pending: [] };
    const current = [oldA, keep];
    const refreshed = { ...pendingA, pending: [{ sym: "AAA-USDT", side: -1 }] };
    const next = mergeFastTapes(current, [refreshed]);
    assert.equal(next[0], refreshed);
    assert.equal(next[1], keep);
    assert.equal(oldA.pending.length, 0, "the in-flight full compute's tape stays immutable");
    assert.deepEqual(next[0].pending, [{ sym: "AAA-USDT", side: -1 }], "Entries mode reads the newest closed-bar signal");
    assert.equal(mergeFastTapes(current, []).length, current.length);
  });

  it("adds nothing the full step decided, and re-takes a fresh position with the same rules", async () => {
    const rt = new CoreRuntime(new CoreDb(":memory:"), small as never, { market: "synthetic" });
    rts.push(rt);
    rt.wf.validLastN = 0;
    rt.wf.lastN = 0;
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running" && (rt.status.paperSteps ?? 0) >= 1);
    rt.stop();
    const R = rt as unknown as {
      stepPaperGen(fast?: { opens: ReadonlyMap<string, readonly OpenPosition[]>; t: number }): Generator<number, void>;
      tapes: Array<{ id: string; open: OpenPosition[] }>;
      sim: { endT: number };
    };
    const drain = (g: Generator<number, void>) => {
      for (let r = g.next(); !r.done; r = g.next());
    };
    // the full step's own tape positions as the realtime step's input, at the full step's time
    const t = Math.min(Math.floor(Date.now() / 3_600_000) * 3_600_000, R.sim.endT);
    const opens = new Map(R.tapes.map((tp) => [tp.id, tp.open] as const));
    const book = rt.paper.positions.map((p) => `${p.cfg}|${p.sym}|${p.side}|${p.entryT}`).sort();
    drain(R.stepPaperGen({ opens, t }));
    const after1 = rt.paper.positions.map((p) => `${p.cfg}|${p.sym}|${p.side}|${p.entryT}`).sort();
    assert.deepEqual(after1, book, "the realtime step on the full step's input changes nothing");
    // a held, freshly entered position removed from the book: the realtime step takes it again (same rules)
    const fresh = rt.paper.positions.filter((p) => p.entryT >= t - 3_600_000 && !p.stopHit);
    if (fresh.length) {
      const gone = fresh[0];
      rt.paper.positions = rt.paper.positions.filter((p) => p !== gone);
      drain(R.stepPaperGen({ opens, t }));
      assert.ok(
        rt.paper.positions.some((p) => p.cfg === gone.cfg && p.sym === gone.sym && p.side === gone.side && p.entryT === gone.entryT),
        "the fresh position is taken again",
      );
    }
    // a held position the realtime input does not carry stays (closing is the full step's)
    const n = rt.paper.positions.length;
    drain(R.stepPaperGen({ opens: new Map(), t }));
    assert.equal(rt.paper.positions.length, n, "no held position is dropped by the realtime step");
  });
});
