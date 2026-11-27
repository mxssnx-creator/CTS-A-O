// Relate takes Micro and Minimal cells: the indication family (and its Micro aliases) is built, qualified and
// executable in those ranges, with its own Base proof per cell.
import { it, after } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { runtimeFixtureGrid } from "./test-support.ts";
import { signalSettings } from "./signal-config.ts";

let rt: CoreRuntime | undefined;
after(() => { rt?.stop(); rt?.dispose(); });

it("Relate configs build tapes in the Micro and Minimal ranges", async () => {
  rt = new CoreRuntime(new CoreDb(":memory:"), {
    symbols: 2, historyDays: 3, tfs: [5, 15], tfDays: { "5": 3, "15": 3 },
    focus: ["follow|relate-5-trend-guarded@m5", "follow|relate-mc-5-trend-guarded@m5", "follow|relate-5-adaptive-balanced@m5"],
    pinned: [], exitStrategy: { enabled: false }, disabledKinds: ["low-range"],
    grid: { ...runtimeFixtureGrid(), baseRanges: false, allSets: true },
    gates: { positionWindows: null, minPf: 1.0, minTrades: 1, maxDdr: 0 },
    tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false },
    signals: signalSettings({ enabled: false }),
  } as never, { market: "synthetic", priceStream: null });
  await rt.cycle();
  for (let i = 0; i < 3 && (rt as any).dirty; i++) await rt.cycle();
  rt.stop();
  const byTag = new Map<string, Set<string>>();
  for (const t of rt.tapes) {
    if (!t.ind.startsWith("relate-")) continue;
    const tag = t.protect.tag ?? "wide";
    (byTag.get(tag) ?? byTag.set(tag, new Set()).get(tag)!).add(t.ind.replace(/@.*$/, ""));
  }
  assert.ok((byTag.get("mn")?.size ?? 0) > 0, `Minimal Relate tapes: ${JSON.stringify([...byTag].map(([k, v]) => [k, [...v]]))}`);
  assert.ok([...(byTag.get("mc") ?? [])].some((id) => id.startsWith("relate-mc-")), "Micro takes its Relate alias");
});
