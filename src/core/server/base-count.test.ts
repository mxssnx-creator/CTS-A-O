// The Base-stage count of validated pairs: the pairs grid.allSets builds for measurement are reported apart
// (status.baseBuilt), never as passed; and the passed count is recorded per compute (status.baseHistory) so its
// continuity can be read without the events table (13 Oct).
process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { signalSettings, SIGNAL_SOURCES } from "../signal-config.ts";
import { trackRuntimes } from "../test-support.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

// This fixture tests count provenance across computes, not full-catalog fitting.
// Full-grid/range execution is covered by book-coverage and processing.test.ts.
const countGrid = {
  ...DEFAULT_SETTINGS.grid,
  holdH: [4],
  ...Object.fromEntries(["micro", "minimal", "general", "long"].map((key) => {
    const r = DEFAULT_SETTINGS.grid[key as "micro" | "minimal" | "general" | "long"];
    return [key, r && { ...r, tp: [r.tp[0], r.tp.at(-1)!], slOfTp: [r.slOfTp[0], r.slOfTp.at(-1)!],
      trailOfTp: [0, r.trailOfTp.at(-1)!] }];
  })),
  short: false as const,
};

const small = {
  symbols: 2,
  focus: ["follow|ema-9-21@m15", "revert|ema-9-21@m15", "follow|rsi-mom-14-20@m15", "revert|rsi-mom-14-20@m15"],
  historyDays: 18,
  tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  grid: countGrid,
  exitStrategy: { enabled: false },
  tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  signals: signalSettings({
    enabled: false,
    exits: "pct",
    sources: Object.fromEntries(SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false])),
  }),
};
const tracked = trackRuntimes();
const mk = (extra: Record<string, unknown> = {}) =>
  tracked.track(new CoreRuntime(new CoreDb(":memory:"), { ...small, ...extra } as never, { market: "synthetic" }));
const until = async (cond: () => boolean, ms = 240_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 50));
  }
};
afterEach(() => tracked.disposeAll());

describe("Base-stage validated count", { timeout: 600_000 }, () => {
  it("grid.allSets reports its measurement pairs apart: the passed count is the same as without it", async () => {
    // the plain runtime's count, read and the runtime released before the allSets one computes (both in memory at once
    // was this test's peak; a helper, so no frame of this test still holds it)
    const plainPassed = async () => {
      const plain = mk();
      plain.start();
      await until(() => plain.status.computes >= 1);
      const n = plain.status.basePassed ?? -1;
      assert.ok(n > 0, `passed ${n}`);
      assert.equal(plain.status.baseBuilt ?? 0, 0, "nothing built for measurement without allSets");
      await tracked.release(plain);
      return n;
    };
    const passed = await plainPassed();
    const all = mk({ grid: { ...small.grid, allSets: true } });
    all.start();
    await until(() => all.status.computes >= 1);
    assert.equal(all.status.basePassed, passed, "the validated count does not move with allSets");
    assert.ok((all.status.baseBuilt ?? 0) > 0, "allSets built pairs for measurement");
    assert.ok((all.status.baseEvaluated ?? 0) >= passed + (all.status.baseBuilt ?? 0));
  });

  it("the passed count is recorded per compute, per range, in order", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 2, 480_000);
    const h = rt.status.baseHistory ?? [];
    assert.ok(h.length >= 2, `history ${h.length}`);
    for (let i = 1; i < h.length; i++) assert.ok(h[i].compute > h[i - 1].compute, "one entry per compute, in order");
    const last = h[h.length - 1];
    assert.equal(last.passed, rt.status.basePassed, "the newest entry is the status count");
    // per range (a pair can pass more than one range): every enabled range's count is there, none negative
    const enabled = (rt.status.baseByRange ?? []).filter((r) => r.enabled).map((r) => r.tag || "wide");
    assert.ok(enabled.length > 0);
    for (const tag of enabled) assert.ok((last.byRange[tag] ?? -1) >= 0, `range ${tag} recorded`);
  });
});
