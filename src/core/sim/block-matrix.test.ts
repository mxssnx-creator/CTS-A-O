// Block at the Real stage for every source alone, in pairs and all together, shared, additive and overall, with
// Block Active on / off, Normal on / off, volume steps and the pause after a win: every run replays clean through
// the self-audit (each trade's level and volume re-derived from the causal book), volumes stay within the 8× stack,
// Normal off only ever removes unadjusted base entries, and Block Active only ever removes entries below its level.
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "../server/runtime.server.ts";
import { CoreDb } from "../server/db.server.ts";
import { auditState } from "../audit.ts";
import { walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { BLOCK_SOURCES, type BlockSource } from "./block.ts";
import type { BlockConfig } from "../domain/types.ts";

let rt: CoreRuntime;
const until = async (cond: () => boolean, ms = 300_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 20));
  }
};

const only = (...xs: BlockSource[]) =>
  Object.fromEntries(BLOCK_SOURCES.map((k) => [k, xs.includes(k)])) as Record<BlockSource, boolean>;

function run(patch: {
  block?: Partial<BlockConfig>;
  toggles?: Partial<WalkForwardOptions["toggles"]>;
  wf?: Partial<WalkForwardOptions>;
}) {
  const base = rt.wf;
  const o: WalkForwardOptions = {
    ...base,
    ...(patch.wf ?? {}),
    toggles: { ...base.toggles, ...(patch.toggles ?? {}) },
    block: { ...base.block, ...(patch.block ?? {}) },
  };
  const sim = walkForward(rt.lastUniverse!, rt.tapes, o);
  const audit = auditState({ sim, tapes: rt.tapes, cost: rt.settings.cost });
  return { sim, o, audit };
}

describe("Block matrix at the Real stage", { timeout: 400_000 }, () => {
  before(async () => {
    rt = new CoreRuntime(
      new CoreDb(":memory:"),
      {
        symbols: 4,
        historyDays: 18,
        tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
        cycleMs: 60_000,
        grid: { short: false },
        signals: { enabled: false } as never,
        focus: [],
        pinned: [],
        mainTop: 16,
      },
      { market: "synthetic" },
    );
    // the matrix measures Block, not the desk's last-N seat gate
    rt.wf.validLastN = 0;
    rt.wf.lastN = 0;
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
  });

  const cases: Array<[string, Partial<BlockConfig>]> = [
    ...BLOCK_SOURCES.map(
      (k) => [`${k} alone`, { sources: only(k) }] as [string, Partial<BlockConfig>],
    ),
    ["symbol + direction", { sources: only("symbol", "direction") }],
    ["indication + type", { sources: only("indication", "type") }],
    ["config + overall", { sources: only("config", "overall") }],
    ["all", { sources: only(...BLOCK_SOURCES) }],
  ];
  for (const [name, b] of cases)
    for (const mode of ["shared", "additive", "overall"] as const)
      it(`${name} · ${mode}: audit clean, stack ≤ 8×, levels and volumes consistent`, () => {
        const block = { ...b, mode, minActiveLevel: 2, maxLevel: 6, ratio: 0.5, maxMult: 8, steps: 0, pause: 0 };
        const { sim, audit } = run({ block, toggles: { block: true, blockActive: false } });
        const bad = audit.checks.filter((c) => !c.ok);
        assert.deepEqual(bad, [], JSON.stringify(bad));
        assert.ok(sim.trades.length > 0);
        for (const x of sim.trades) {
          const m = x.mult ?? 1;
          assert.ok(m >= 1 && m <= 8 + 1e-9, `mult ${m}`);
          if (x.kind !== "normal" && x.kind !== "trailing") continue;
          const lv = x.level ?? 0;
          if (mode === "overall") {
            // every source its own position: the volume is 1 + the sum of the per-source legs
            const legs = Object.values(x.legs ?? {}).map((v) => v ?? 0);
            assert.ok(legs.every((v) => v > 0 && v <= 7 + 1e-9), `${x.cfg} legs ${JSON.stringify(x.legs)}`);
            assert.ok(Math.abs(m - (1 + legs.reduce((a, v) => a + v, 0))) < 1e-5, `${x.cfg} mult ${m} legs`);
            assert.equal(legs.length > 0, m > 1, `${x.cfg} raised ⇔ legs`);
          } else {
            // an unadjusted entry is volume 1 at level 0; an adjusted one is 1 + ratio · level (capped)
            assert.ok(Math.abs(m - Math.min(8, 1 + 0.5 * lv)) < 1e-9, `${x.cfg} level ${lv} mult ${m}`);
            assert.equal(x.legs, undefined);
          }
        }
      });

  for (const mode of ["shared", "additive", "overall"] as const)
    it(`${mode} with volume steps and the pause after a win: audit clean, steps on the grid`, () => {
      const block = {
        sources: only("config", "overall", "symbol", "direction", "indication"),
        mode,
        maxLevel: 6,
        minActiveLevel: 2,
        ratio: 0.3,
        maxMult: 2.5,
        steps: 6,
        pause: 3,
      };
      for (const blockActive of [false, true]) {
        const { sim, audit } = run({ block, toggles: { block: true, blockActive, normal: true } });
        const bad = audit.checks.filter((c) => !c.ok);
        assert.deepEqual(bad, [], `${mode} Active ${blockActive}: ${JSON.stringify(bad)}`);
        for (const x of sim.trades) {
          if (x.kind !== "normal" && x.kind !== "trailing") continue;
          const m = x.mult ?? 1;
          // every raise is a whole number of 0.25 steps (per source for overall)
          const parts = mode === "overall" ? Object.values(x.legs ?? {}).map((v) => v ?? 0) : [m - 1];
          for (const p of parts) assert.ok(Math.abs(p / 0.25 - Math.round(p / 0.25)) < 1e-6 || m === 8, `${mode} raise ${p}`);
          if (mode !== "overall") assert.ok(m <= 2.5 + 1e-9);
          else assert.ok(parts.every((p) => p <= 1.5 + 1e-9), "every source within max multiple");
        }
      }
      // the pause only ever lowers raises: total extra volume with a pause ≤ without
      const extra = (p: number) =>
        run({ block: { ...block, pause: p }, toggles: { block: true, blockActive: false, normal: true }, wf: { guardPct: 0 } })
          .sim.trades.reduce((a, x) => a + ((x.mult ?? 1) - 1), 0);
      assert.ok(extra(3) <= extra(0) + 1e-9, `${mode}: pause ${extra(3)} vs none ${extra(0)}`);
    });

  it("additive ≥ shared: the sources' levels add up (same entries, bigger or equal volume)", () => {
    const b = { sources: only(...BLOCK_SOURCES), maxLevel: 6, ratio: 0.2, maxMult: 8 };
    const sh = run({
      block: { ...b, mode: "shared" },
      toggles: { block: true, blockActive: false },
    });
    const ad = run({
      block: { ...b, mode: "additive" },
      toggles: { block: true, blockActive: false },
    });
    const volSh =
      sh.sim.trades.reduce((a, x) => a + (x.mult ?? 1), 0) / Math.max(1, sh.sim.trades.length);
    const volAd =
      ad.sim.trades.reduce((a, x) => a + (x.mult ?? 1), 0) / Math.max(1, ad.sim.trades.length);
    assert.ok(volAd >= volSh - 1e-9, `additive ${volAd} vs shared ${volSh}`);
  });

  it("Normal off removes exactly the unadjusted base; Block Active skips every entry below its min level", () => {
    for (const mode of ["shared", "additive", "overall"] as const)
      for (const blockActive of [false, true]) {
        const block = { sources: only("config", "direction"), maxLevel: 10, minActiveLevel: 6, mode };
        const on = run({ block, toggles: { block: true, blockActive, normal: true } });
        const off = run({ block, toggles: { block: true, blockActive, normal: false } });
        for (const r of [on, off])
          assert.deepEqual(
            r.audit.checks.filter((c) => !c.ok),
            [],
            `${mode} Active ${blockActive}`,
          );
        const min = blockActive ? 6 : 1;
        const base = (k?: string) => k === "normal" || k === "trailing";
        // Normal off: no unadjusted plain (normal) entry executes. Trailing runs beside the plain book (an
        // unadjusted trailing entry is allowed without Active), as the execution rule says (execDecision).
        assert.ok(
          off.sim.trades.every((x) => x.kind !== "normal" || (x.level ?? 0) >= min),
          `${mode} Active ${blockActive}: a plain entry below level ${min} executed with Normal off`,
        );
        const noGuard = { guardPct: 0 };
        const onNg = run({ block, toggles: { block: true, blockActive, normal: true }, wf: noGuard });
        const offBlock = run({ toggles: { block: false, blockActive: false, normal: true }, wf: noGuard });
        const keys = (t: typeof onNg.sim.trades) => t.map((x) => `${x.cfg}|${x.sym}|${x.entryT}`).sort();
        if (!blockActive) {
          // Normal on, Active off: nothing is skipped for Block — the same entries as Block off, unadjusted at 1×
          assert.deepEqual(keys(onNg.sim.trades), keys(offBlock.sim.trades), mode);
          assert.ok(on.sim.trades.filter((x) => base(x.kind) && (x.level ?? 0) === 0).every((x) => (x.mult ?? 1) === 1));
        } else {
          // Block Active: every executed plain / trailing entry is at or above the min level (also with Normal on),
          // and Active only removes entries
          assert.ok(
            on.sim.trades.every((x) => !base(x.kind) || (x.level ?? 0) >= 6),
            `${mode}: an entry below level 6 executed with Block Active`,
          );
          assert.ok(on.sim.trades.every((x) => !base(x.kind) || (x.mult ?? 1) > 1), `${mode}: Active entries are raised`);
          assert.ok(onNg.sim.trades.length <= offBlock.sim.trades.length);
        }
        assert.ok(off.sim.trades.length <= on.sim.trades.length);
      }
  });

  it("Block off: every entry at volume 1, level 0", () => {
    const { sim, audit } = run({ toggles: { block: false, blockActive: false } });
    assert.deepEqual(
      audit.checks.filter((c) => !c.ok),
      [],
    );
    assert.ok(sim.trades.every((x) => (x.mult ?? 1) === 1));
  });
});
