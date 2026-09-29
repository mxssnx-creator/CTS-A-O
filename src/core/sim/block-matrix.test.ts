// Block at the Real stage for every source alone, in pairs and all together, shared and additive, with Block
// Active on / off and Normal on / off: every run replays clean through the self-audit (each trade's level and
// volume re-derived from the causal book), volumes stay within the 8× stack, and Normal off only ever removes
// unadjusted base entries.
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
      },
      { market: "synthetic" },
    );
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
    for (const mode of ["shared", "additive"] as const)
      it(`${name} · ${mode}: audit clean, stack ≤ 8×, levels and volumes consistent`, () => {
        const block = { ...b, mode, minActiveLevel: 2, maxLevel: 6, ratio: 0.5, maxMult: 8 };
        const { sim, audit } = run({ block, toggles: { block: true, blockActive: false } });
        const bad = audit.checks.filter((c) => !c.ok);
        assert.deepEqual(bad, [], JSON.stringify(bad));
        assert.ok(sim.trades.length > 0);
        for (const x of sim.trades) {
          const m = x.mult ?? 1;
          assert.ok(m >= 1 && m <= 8 + 1e-9, `mult ${m}`);
          // an unadjusted entry is volume 1 at level 0; an adjusted one is 1 + ratio · level (capped)
          if (x.kind === "normal" || x.kind === "trailing") {
            const lv = x.level ?? 0;
            assert.ok(
              Math.abs(m - Math.min(8, 1 + 0.5 * lv)) < 1e-9,
              `${x.cfg} level ${lv} mult ${m}`,
            );
          }
        }
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

  it("Normal off removes exactly the unadjusted base; Block Active raises only from its min level", () => {
    for (const blockActive of [false, true]) {
      const block = { sources: only("config", "direction"), maxLevel: 10, minActiveLevel: 6 };
      const on = run({ block, toggles: { block: true, blockActive, normal: true } });
      const off = run({ block, toggles: { block: true, blockActive, normal: false } });
      for (const r of [on, off])
        assert.deepEqual(
          r.audit.checks.filter((c) => !c.ok),
          [],
          `Active ${blockActive}`,
        );
      const min = blockActive ? 6 : 1;
      const base = (k?: string) => k === "normal" || k === "trailing";
      // Normal off: no unadjusted base entry executes
      assert.ok(
        off.sim.trades.every((x) => !base(x.kind) || (x.level ?? 0) >= min),
        `Active ${blockActive}: a base entry below level ${min} executed with Normal off`,
      );
      // Normal on: unadjusted base entries do execute, at volume 1
      const plain = on.sim.trades.filter((x) => base(x.kind) && (x.level ?? 0) === 0);
      assert.ok(plain.every((x) => (x.mult ?? 1) === 1));
      // with Normal on nothing is skipped for Block: the same entries as Block off (Block only sets volume;
      // the hour guard, which depends on volume, is off for this comparison)
      const noGuard = { guardPct: 0 };
      const onNg = run({ block, toggles: { block: true, blockActive, normal: true }, wf: noGuard });
      const offBlock = run({
        toggles: { block: false, blockActive: false, normal: true },
        wf: noGuard,
      });
      const keys = (t: typeof onNg.sim.trades) =>
        t.map((x) => `${x.cfg}|${x.sym}|${x.entryT}`).sort();
      assert.deepEqual(keys(onNg.sim.trades), keys(offBlock.sim.trades), `Active ${blockActive}`);
      assert.ok(off.sim.trades.length <= on.sim.trades.length);
      // Block Active: every raised entry is at or above the min level
      if (blockActive)
        assert.ok(
          on.sim.trades.every((x) => !base(x.kind) || (x.mult ?? 1) === 1 || (x.level ?? 0) >= 6),
        );
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
