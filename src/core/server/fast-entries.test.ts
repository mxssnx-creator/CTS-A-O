// The realtime entry step (stepPaperGen fast mode): between computes the paper book takes the seated configs' new tape
// positions with the same entry rules as the full paper step — and changes nothing the full step already decided.
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { SIGNAL_SOURCES, signalSettings } from "../signal-config.ts";
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
