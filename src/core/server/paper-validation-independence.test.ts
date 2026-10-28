// End-to-end paper entry validation: accepted modeled outcomes stay with the exact config and direction.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { DEFAULT_PROTECT } from "../config.ts";
import { makeTape, walkForward } from "../sim/walkforward.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";

process.env.CTS_CORE_STATE = "off";
const H = 3_600_000;
const T = Math.floor(Date.now() / H) * H;
const SYM = "AAA-USDT";
const CFG = "follow|rsi-mom-14-25@m15|tp2.6|sl3.9|tr0|h32|sh";
const OTHER = "follow|ema-9-21@m15|tp2.6|sl3.9|tr0|h32|sh";

type Sample = { cfg: string; side: 1 | -1; r: number; unknown?: boolean };

/** Run the actual paper-step path with a passing historical tape and declared post-Base accepted closes. */
function paperEntry(samples: Sample[], groupN = 0, direction: 1 | -1 = 1, disableAfter = false) {
  const rt = new CoreRuntime(new CoreDb(":memory:"),
    { gates: { minTrades: 1 }, live: { liveLastN: 3, liveGroupLastN: groupN, sideGates: false } },
    { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    rt.wf.rangeGate = undefined;
    rt.db.kvSet("liveSince", T - 4 * H);
    const raw = (cfg: string): Trade[] => Array.from({ length: 30 }, (_, i) => ({
      cfg, sym: SYM, side: direction, entryT: T - 3 * H + i * 60_000, exitT: T - 2 * H + i * 60_000,
      entry: 100, exit: 100 * (1 + direction * .02), r: .02, unitR: .02, mult: 1, vol: 1, kind: "normal", reason: "tp",
      bars: 1, mfe: 0, mae: 0,
    }));
    const open: OpenPosition = { cfg: CFG, sym: SYM, side: direction, entryI: 0, entryT: T, entry: 100,
      stop: 100 * (1 - direction * .039), target: 100 * (1 + direction * .026), peak: 100, trailOn: false, mtm: 0 };
    const protect = { ...DEFAULT_PROTECT, tag: "sh" as const };
    rt.tapes = [
      makeTape(CFG, "follow", "rsi-mom-14-25@m15", protect, "normal", [SYM], raw(CFG), [open], []),
      makeTape(OTHER, "follow", "ema-9-21@m15", protect, "normal", [SYM], raw(OTHER), [], []),
    ];
    const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 15 } as never;
    rt.sim = walkForward(u, [], { ...rt.wf, simH: 24 });
    rt.sim.validated = rt.tapes.map((t) => t.id);
    rt.sim.trades = samples.map((s, i): Trade => ({
      cfg: s.cfg, sym: SYM, side: s.side, entryT: T - H + i * 1_000,
      exitT: T - 10 * 60_000 + i * 1_000, entry: 100, exit: 100 * (1 + s.side * s.r),
      r: s.r, ...(s.unknown ? {} : { unitR: s.r, mult: 1 }), vol: 1,
      kind: "normal", reason: "time", bars: 1, mfe: 0, mae: 0,
    }));
    (rt as unknown as { stepPaper(): void }).stepPaper();
    const validation = rt.status.liveValidation;
    if (disableAfter) {
      rt.settings.live.liveLastN = 0;
      (rt as unknown as { stepPaper(): void }).stepPaper();
    }
    return {
      opened: rt.paper.positions.some((p) => p.cfg === CFG && p.side === direction),
      selected: rt.paper.selected.includes(CFG),
      siblingSelected: rt.paper.selected.includes(OTHER),
      skips: { ...rt.status.paperSkips },
      validation,
      cleared: rt.status.liveValidation === undefined,
      promotion: rt.livePromotionGate({ cfg: CFG, sym: SYM, side: direction }, T),
    };
  } finally {
    rt.dispose();
    rt.db.db.close();
  }
}

const record = (cfg: string, side: 1 | -1, values: number[]): Sample[] =>
  values.map((r) => ({ cfg, side, r }));
const partition = (status: ReturnType<typeof paperEntry>["validation"], expected: {
  judged: number; passing: number; paused: number; unjudged: number; unknown: number;
}) => {
  assert.ok(status);
  assert.equal(status.basis, "post-base-accepted");
  assert.equal(status.evaluated, 4, "two selected configs × both directions are included");
  assert.equal(status.evaluated, status.judged + status.unjudged + status.unknown);
  assert.equal(status.at >= T, true);
  for (const [key, value] of Object.entries(expected))
    assert.equal(status[key as keyof typeof expected], value, key);
};

test("turning off live last-N clears its previous paper-step validation status", () => {
  const result = paperEntry(record(CFG, 1, [.02, -.01, .02]), 0, 1, true);
  partition(result.validation, { judged: 1, passing: 1, paused: 0, unjudged: 3, unknown: 0 });
  assert.equal(result.cleared, true, "the next paper step must not publish the stale verdict");
  assert.equal(result.opened, true, "turning off the entry gate does not orphan the held position");
});

for (const side of [1, -1] as const) {
  const opposite = side === 1 ? -1 : 1;
  test(`paper side ${side} uses its own direction even when legacy pooled side gates are off`, () => {
    const wins = record(CFG, side, [.02, -.01, .02]);
    const losses = record(CFG, side, [-.01, -.01, -.01]);
    const oppositeLosses = record(CFG, opposite, [-.1, -.1, -.1]);
    const oppositeWins = record(CFG, opposite, [.1, .1, .1]);
    const good = paperEntry(wins, 0, side);
    assert.ok(good.selected && good.opened, JSON.stringify(good));
    partition(good.validation, { judged: 1, passing: 1, paused: 0, unjudged: 3, unknown: 0 });
    const againstLosses = paperEntry([...wins, ...oppositeLosses], 0, side);
    assert.equal(againstLosses.opened, true, "opposite losses do not veto a passing direction");
    partition(againstLosses.validation, { judged: 2, passing: 1, paused: 1, unjudged: 2, unknown: 0 });
    const againstWins = paperEntry([...losses, ...oppositeWins], 0, side);
    assert.equal(againstWins.opened, false, "opposite wins cannot rescue a losing direction");
    partition(againstWins.validation, { judged: 2, passing: 1, paused: 1, unjudged: 2, unknown: 0 });
  });

  test(`unjudged paper side ${side} learns independently of sibling group performance`, () => {
    const insufficient = record(CFG, side, [.02, -.01]);
    for (const sibling of [[-.1, -.1, -.1], [.1, .1, .1]]) {
      const result = paperEntry([...insufficient, ...record(OTHER, side, sibling)], 3, side);
      assert.ok(result.selected && result.siblingSelected, JSON.stringify(result));
      assert.equal(result.opened, true, "pooled sibling performance does not control paper warmup");
      assert.equal(result.promotion.ok, false, "an unjudged model window is not funded proof");
      assert.equal(result.promotion.state, "model-insufficient");
      assert.equal(result.promotion.model?.n, 2);
      assert.equal(result.promotion.model?.pf, null);
      const passing = Number(sibling[0] > 0);
      partition(result.validation, { judged: 1, passing, paused: 1 - passing, unjudged: 3, unknown: 0 });
    }
  });

  test(`unknown unit-return provenance pauses paper side ${side} despite winning siblings`, () => {
    const unknown: Sample[] = Array.from({ length: 3 }, () => ({ cfg: CFG, side, r: .02, unknown: true }));
    const result = paperEntry([...unknown, ...record(OTHER, side, [.1, .1, .1])], 3, side);
    assert.equal(result.opened, false);
    assert.equal(result.skips.liveValidation, 1);
    assert.equal(result.promotion.ok, false);
    partition(result.validation, { judged: 1, passing: 1, paused: 0, unjudged: 2, unknown: 1 });
  });
}
