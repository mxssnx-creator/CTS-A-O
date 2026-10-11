// Shared by the runtime test files: the synthetic settings, a runtime that is stopped after each test, and the waits.
// Each test file registers `afterEach(stopStarted)` itself (node runs the files in parallel processes).
import { CoreRuntime as BaseRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { SIGNAL_SOURCES } from "../signal-config.ts";
import { signalSettings } from "../signals.ts";

// the synthetic market ends on the hour: the same bars, lane buckets and hourly windows on every run (ending at
// the current minute, the minute decided whether any entry was Block-raised — the self-audit tests failed at random)
process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);

export const small = {
  symbols: 4,
  historyDays: 18,
  // lanes over a shorter history keep each synthetic engine light (the suite runs several in parallel)
  tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  // the short order range is covered by the protect-grid test; these runs stay on the wide grid only
  grid: { short: false as const },
  // runtime mechanics, not the entry tactics (tactics.test / processing.test cover them): no entry filter, so
  // every synthetic minute has trades to audit
  tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
  // the synthetic feed has no edge: lenient gates so Base passes pairs and there are tapes, seats and trades to
  // publish and audit (the gates themselves: gating.test, walkforward.test, lastn-calc.test)
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  // runtime mechanics, not signal quality (signals.test covers the full signal defaults): percent exits and the
  // classic sources only keep each engine light enough to run several in parallel
  signals: signalSettings({
    exits: "pct",
    sources: Object.fromEntries(
      SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false]),
    ),
  }),
};
/**
 * Every runtime a test starts is stopped after it — also when the test failed or was cancelled by its suite's limit:
 * a cancelled test's runtime kept computing, loaded the CPU and sent its events into the next suites' listeners.
 */
const started = new Set<BaseRuntime>();
export class CoreRuntime extends BaseRuntime {
  constructor(...a: ConstructorParameters<typeof BaseRuntime>) {
    super(...a);
    started.add(this);
  }
}
export const stopStarted = () => {
  for (const r of started) r.stop();
  started.clear();
};
export { BaseRuntime };

export const mk = () => new CoreRuntime(new CoreDb(":memory:"), small, { market: "synthetic" });
export const until = async (cond: () => boolean, ms = 120_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 20));
  }
};
