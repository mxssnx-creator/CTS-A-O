// Block at the Real stage for every source alone, in pairs and all together, shared, additive and overall, with
// Block Active on / off, Normal on / off, volume steps and the pause after a win: every run replays clean through
// the self-audit (each trade's level and volume re-derived from the causal book), volumes stay within the 8× stack,
// Normal off only ever removes unadjusted base entries, and Block Active only ever removes entries below its level.
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditState } from "../audit.ts";
import {
  defaultWalkForward,
  makeTape,
  passedCellsOf,
  walkForward,
  type ConfigTape,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { BLOCK_SOURCES, type BlockSource } from "./block.ts";
import type { BlockConfig, Protect, Trade } from "../domain/types.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { configId, protectCellKey } from "../pipeline/pipeline.ts";
// Planted 8-symbol, 12h prehistory + 12h execution fixture. This isolates Block relations from
// catalog discovery profitability; real-runtime Base/book integration is tested separately.
let rt: {
  wf: WalkForwardOptions;
  tapes: ConfigTape[];
  lastUniverse: Parameters<typeof walkForward>[0];
  settings: { cost: number };
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

describe("Block matrix at the Real stage", { timeout: 1_200_000 }, () => {
  before(() => {
    const M = 60_000,
      H = 60 * M,
      first = Date.UTC(2026, 9, 8, 12),
      start = first + 12 * H,
      end = start + 12 * H;
    const syms = Array.from({ length: 8 }, (_, i) => `BLOCK${i}-USDT`);
    const protects: Protect[] = [
      { tp: 0.02, sl: 0.02, trail: 0, hold: 4 },
      { tp: 0.02, sl: 0.02, trail: 0.005, hold: 4 },
      { tp: 0.02, sl: 0.02, trail: 0, hold: 4, tag: "sh" },
      { tp: 0.02, sl: 0.02, trail: 0.005, hold: 4, tag: "sh" },
    ];
    const inds = ["ema-9-21@m1", "rsi-mom-14-20@m5"];
    const tapes = inds.flatMap((ind) =>
      protects.map((p) => {
        const kind = p.trail ? ("trailing" as const) : ("normal" as const),
          id = configId("follow", ind, p);
        const rows: Trade[] = syms.flatMap((sym) =>
          ([1, -1] as const).flatMap((side) =>
            Array.from({ length: 92 }, (_, i) => {
              const entryT = i < 80 ? first + (i + 1) * 8 * M : start + (i - 80) * H + M;
              const r = i < 80 ? 0.02 : i % 3 === 0 ? -0.003 : 0.01;
              return {
                cfg: id,
                sym,
                side,
                entryT,
                exitT: entryT + M,
                entry: 100,
                exit: 100 * (1 + side * (r + DEFAULT_SETTINGS.cost)),
                r,
                mult: 1,
                kind,
                reason: r > 0 ? ("tp" as const) : ("sl" as const),
                bars: 1,
                mfe: Math.max(0, r),
                mae: Math.max(0, -r),
              };
            }),
          ),
        );
        rows.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
        return makeTape(id, "follow", ind, p, kind, syms, rows, [], []);
      }),
    );
    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    rt = {
      tapes,
      settings: { cost: DEFAULT_SETTINGS.cost },
      lastUniverse: {
        bars: [],
        caches: [],
        startT: first,
        endT: end,
        splitT: start,
        nowT: end,
        baseTf: 1,
      } as never,
      wf: {
        ...wf,
        startT: start,
        simH: 12,
        stepH: 1,
        portfolio: 0,
        robustFrac: 0,
        guardPct: 0,
        maxOpen: 0,
        maxPerSide: 0,
        maxPerSymbol: 0,
        maxPositions: 0,
        seatPer: "config",
        symGate: "off",
        rangeGate: undefined,
        preGate: false,
        basePassed: new Set(inds.map((ind) => `follow|${ind}`)),
        basePassedRanges: Object.fromEntries(inds.map((ind) => [`follow|${ind}`, ["", "sh"]])),
        basePassedCells: passedCellsOf(
          Object.fromEntries(inds.map((ind) => [`follow|${ind}`, protects.map(protectCellKey)])),
        ),
        coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
        toggles: {
          ...wf.toggles,
          normal: true,
          trailing: true,
          block: true,
          dca: false,
          axis: false,
        },
      },
    };
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
        const block = {
          ...b,
          mode,
          minActiveLevel: 2,
          maxLevel: 6,
          ratio: 0.5,
          maxMult: 8,
          steps: 0,
          pause: 0,
        };
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
            assert.ok(
              legs.every((v) => v > 0 && v <= 7 + 1e-9),
              `${x.cfg} legs ${JSON.stringify(x.legs)}`,
            );
            assert.ok(
              Math.abs(m - (1 + legs.reduce((a, v) => a + v, 0))) < 1e-5,
              `${x.cfg} mult ${m} legs`,
            );
            assert.equal(legs.length > 0, m > 1, `${x.cfg} raised ⇔ legs`);
          } else {
            // an unadjusted entry is volume 1 at level 0; an adjusted one is 1 + ratio · level (capped)
            assert.ok(
              Math.abs(m - Math.min(8, 1 + 0.5 * lv)) < 1e-9,
              `${x.cfg} level ${lv} mult ${m}`,
            );
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
          // Complete steps round down; a smaller positive request retains its fractional ratio.
          const parts =
            mode === "overall" ? Object.values(x.legs ?? {}).map((v) => v ?? 0) : [m - 1];
          // When the total cap binds, proportional source allocations can be fractional steps
          // (an Overall stack shrunk to the cap moves its legs off the grid in proportion).
          for (const p of parts)
            assert.ok(
              p < 0.25 ||
                Math.abs(p / 0.25 - Math.round(p / 0.25)) < 1e-6 ||
                Math.abs(m - 2.5) < 1e-6,
              `${mode} raise ${p}`,
            );
          // maxMult caps the total stack in every type, Overall too: base plus every source share it
          assert.ok(m <= 2.5 + 1e-9, `${mode} stack ${m}`);
          if (mode === "overall")
            assert.ok(
              parts.every((p) => p <= 1.5 + 1e-9),
              "every source within total extra budget",
            );
        }
      }
      // the pause only ever lowers raises: total extra volume with a pause ≤ without
      const extra = (p: number) =>
        run({
          block: { ...block, pause: p },
          toggles: { block: true, blockActive: false, normal: true },
          wf: { guardPct: 0 },
        }).sim.trades.reduce((a, x) => a + ((x.mult ?? 1) - 1), 0);
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
        const block = {
          sources: only("config", "direction"),
          maxLevel: 10,
          minActiveLevel: 6,
          mode,
        };
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
        const onNg = run({
          block,
          toggles: { block: true, blockActive, normal: true },
          wf: noGuard,
        });
        const offBlock = run({
          toggles: { block: false, blockActive: false, normal: true },
          wf: noGuard,
        });
        const keys = (t: typeof onNg.sim.trades) =>
          t.map((x) => `${x.cfg}|${x.sym}|${x.entryT}`).sort();
        if (!blockActive) {
          // Normal on, Active off: nothing is skipped for Block — the same entries as Block off, unadjusted at 1×
          assert.deepEqual(keys(onNg.sim.trades), keys(offBlock.sim.trades), mode);
          assert.ok(
            on.sim.trades
              .filter((x) => base(x.kind) && (x.level ?? 0) === 0)
              .every((x) => (x.mult ?? 1) === 1),
          );
        } else {
          // Block Active: every executed plain / trailing entry is at or above the min level (also with Normal on),
          // and Active only removes entries
          assert.ok(
            on.sim.trades.every((x) => !base(x.kind) || (x.level ?? 0) >= 6),
            `${mode}: an entry below level 6 executed with Block Active`,
          );
          assert.ok(
            on.sim.trades.every((x) => !base(x.kind) || (x.mult ?? 1) > 1),
            `${mode}: Active entries are raised`,
          );
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
