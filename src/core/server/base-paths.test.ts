// The engine's Base evaluates the same combos on the worker cores as in-process (its fallback while the workers are
// down). The worker Base dropped the Micro indications on lanes under Micro's 5m floor and the in-process one kept
// them; with Minimal running Micro's indications (grid.minimal.microInds, no lane floor) they can pass Base in
// Minimal, so which Minimal configs traded depended on whether the workers ran. Each tape message carries only its
// own pairs' share of the floors.
import { after, afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { closePool } from "./pool.server.ts";
import { allCombos, microLaneFloor } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS, MINIMAL_RANGE } from "../config.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);
after(() => closePool());

// Micro on its own indications and Minimal running them too (x01's grid: rule "minimal"), small grids
const micro = { tp: [0.002], slOfTp: [1], trailOfTp: [0], trailSlOfTp: 1, minSl: 0.001, minTrail: 0.0005 };
const grid = { micro, minimal: { ...MINIMAL_RANGE, tp: [0.008] }, short: false as const, general: false as const, long: false as const };
const settings = {
  symbols: 2,
  historyDays: 2,
  tfs: [1, 5],
  tfDays: { "1": 1, "5": 2 },
  // one Micro pair in every lane (1m, 1m combined, 5m); Base adds every Micro indication on Micro's lanes (5m)
  focus: ["follow|mc-tpull-8"],
  pinned: [],
  mainTop: 4,
  refineTop: 2,
  evalTop: 2,
  cycleMs: 60_000,
  grid,
  tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  signals: { enabled: false },
};
const until = async (cond: () => boolean, ms = 240_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};
const started: CoreRuntime[] = [];
afterEach(() => {
  for (const rt of started.splice(0)) rt.stop();
});

/** the pairs of one compute's Base, on the workers or in-process */
async function basePairs(inProcess: boolean): Promise<string[]> {
  const rt = new CoreRuntime(new CoreDb(":memory:"), settings as never, { market: "synthetic" });
  started.push(rt);
  if (inProcess) Object.assign(rt, { workersBroken: true, workersBrokenAt: Date.now() });
  rt.start();
  await until(() => rt.status.computes >= 1);
  rt.stop();
  assert.match(rt.status.workers ?? "", inProcess ? /in-process/ : /cores/);
  return rt.pipeline!.s1.map((r) => `${r.bot}|${r.ind}`).sort();
}

describe("engine Base: the worker and the in-process path", { timeout: 600_000 }, () => {
  it("the lane floor: Micro's under its own rule, none with Minimal on Micro's indications, none without the rule", () => {
    assert.equal(microLaneFloor({ ...DEFAULT_SETTINGS.grid, micro }), 0, "Minimal (every lane) runs them");
    assert.equal(microLaneFloor({ ...DEFAULT_SETTINGS.grid, micro, minimal: { ...MINIMAL_RANGE, minTf: 15 } }), 5);
    assert.equal(microLaneFloor({ ...DEFAULT_SETTINGS.grid, micro, minimal: { ...MINIMAL_RANGE, microInds: false } }), 5);
    assert.equal(microLaneFloor({ ...DEFAULT_SETTINGS.grid, micro: { ...micro, ownInds: false } }), 0);
    assert.equal(microLaneFloor(DEFAULT_SETTINGS.grid), 0, "the code defaults (no Micro): unchanged, every lane");
    // the default lanes, every combo: the 2,560 Micro pairs on 1m (independent and combined) that Micro's floor drops
    const tfs = [1, 5, 15, 30];
    assert.equal(allCombos([], [], tfs).length - allCombos([], [], tfs, 5).length, 2560);
  });

  it("evaluates the same combos on both paths: the Micro indications on 1m included under the Minimal rule", async () => {
    const workers = await basePairs(false);
    const local = await basePairs(true);
    for (const k of ["follow|mc-tpull-8@m1", "follow|mc-tpull-8@m1c", "follow|mc-tpull-8@m5"])
      assert.ok(local.includes(k), `in-process: ${k}`);
    // the 128 Micro indications on 5m (the exhaustion family included) (the focus pair's 5m lane among them) + the focus pair on 1m and 1m combined
    assert.equal(local.length, 130);
    assert.deepEqual(workers, local);
  });
});

describe("engine tapes on the worker cores", { timeout: 600_000 }, () => {
  it("each tape message carries only its own pairs' floors (every message cloned every pair's)", async () => {
    type Floors = { pairTags?: Record<string, unknown>; pairTps?: Record<string, unknown>; heldIds?: ReadonlySet<string> };
    const sent: Array<{ pairs: string[]; floors: Floors }> = [];
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, m: unknown, transfer?: never) {
      const x = m as { type?: string; pairs?: string[]; floors?: Floors };
      if (x?.type === "tapes" && x.floors) sent.push({ pairs: x.pairs ?? [], floors: x.floors });
      return post.call(this, m, transfer);
    };
    const rt = new CoreRuntime(new CoreDb(":memory:"), settings as never, { market: "synthetic" });
    started.push(rt);
    try {
      rt.start();
      await until(() => rt.status.computes >= 1);
      rt.stop();
    } finally {
      Worker.prototype.postMessage = post;
    }
    assert.match(rt.status.workers ?? "", /cores/);
    const tagged = new Set(sent.flatMap((m) => Object.keys(m.floors.pairTags ?? {})));
    assert.ok(sent.length >= 2 && tagged.size >= 2, `${sent.length} tape messages, ${tagged.size} pairs with Base ranges`);
    for (const m of sent) {
      const own = new Set(m.pairs);
      const keys: Array<[string, string[]]> = [
        ["pairTags", Object.keys(m.floors.pairTags ?? {})],
        ["pairTps", Object.keys(m.floors.pairTps ?? {})],
        ["heldIds", [...(m.floors.heldIds ?? [])].map((id) => id.split("|").slice(0, 2).join("|"))],
      ];
      for (const [what, ks] of keys)
        for (const k of ks) assert.ok(own.has(k), `${what}: ${k} rides along a message for ${m.pairs.join(", ")}`);
    }
  });
});
