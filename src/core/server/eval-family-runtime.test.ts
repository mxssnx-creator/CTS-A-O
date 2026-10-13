// A signal family's evaluation run (CTS_CORE_FAMILY): signal confirmation needs the engine's candidates, so the engine
// pairs pass Base and take their seats as on the desk, and the family applies at execution only. Before, the family
// narrowed Base to no engine pair at all: no engine candidate existed and confirmation refused every signal entry.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { signalSettings } from "../signals.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_SNAPSHOT = "";
// the memory guard never decides anything here (the host's free memory varies with the other suites)
process.env.CTS_CORE_MEM_SOFT_MB = "1";
process.env.CTS_CORE_MEM_HARD_MB = "1";

const until = async (cond: () => boolean, ms = 900_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

describe("evaluation families in the runtime", { timeout: 1_200_000 }, () => {
  it("a signal family keeps the engine's Base and seats; only the family executes", async () => {
    const FAMILY = "sig follow ema-cross medium";
    process.env.CTS_CORE_FAMILY = FAMILY;
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      {
        symbols: 1,
        historyDays: 6,
        tfDays: { "1": 2, "5": 3, "15": 6, "30": 6 },
        mainTop: 6,
        refineTop: 3,
        evalTop: 4,
        cycleMs: 60_000,
        // one engine indication and one signal source keep the compute light
        focus: ["follow|ema-21-55", "revert|ema-21-55"],
        pinned: [],
        gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
        tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
        signals: signalSettings({ sources: { "ema-cross": true }, sourcesMode: "allow" }),
      } as never,
      { market: "synthetic" },
    );
    // seats from the first closes: the engine's candidates reach the executor on a short synthetic history
    rt.wf.validLastN = 0;
    rt.wf.lastN = 0;
    try {
      rt.start();
      await until(() => rt.status.computes >= 1 && rt.status.state === "running");
      rt.stop();
      // the engine pairs passed Base as on the desk (the family did not narrow it to none)
      const engine = [...(rt.wf.basePassed ?? [])].filter((k) => !k.includes("|sig-"));
      assert.ok(engine.length > 0, `engine pairs in Base: ${engine.length}`);
      assert.ok(rt.tapes.some((t) => !t.ind.startsWith("sig-")), "engine tapes built");
      // the family decides what executes: the engine's candidates are processed (they confirm signals) and skipped
      // under "family"; every executed order is the family's
      assert.deepEqual(rt.wf.family, [FAMILY]);
      assert.ok((rt.sim!.skips.family ?? 0) > 0, JSON.stringify(rt.sim!.skips));
      assert.deepEqual(
        [...new Set(rt.sim!.trades.map((t) => t.cfg.split("|").slice(0, 2).join("|")))].filter((p) => !p.includes("|sig-ema-cross-m")),
        [],
      );
    } finally {
      rt.stop();
      delete process.env.CTS_CORE_FAMILY;
    }
  });
});
