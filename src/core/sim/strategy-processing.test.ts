import { it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import {
  defaultWalkForward,
  tapeExecutable,
  effectiveStrategyToggles,
  execDecision,
  makeTape,
  RANGE_OPT_TAGS,
} from "./walkforward.ts";
import { sanitizeRangeOpts } from "../server/runtime.server.ts";
import type { StratKind, Trade } from "../domain/types.ts";
const d = defaultWalkForward(DEFAULT_SETTINGS);
const o = {
  ...d,
  validLastN: 0,
  gates: { ...d.gates, minTrades: 1, minPf: 1 },
  lastN: 0,
  normalBaseMinPf: 0,
  preGate: false,
  engineSideAccept: undefined,
  sideGateN: 0,
  toggles: {
    ...d.toggles,
    normal: true,
    trailing: true,
    block: false,
    dca: true,
    dcaActive: false,
    axis: true,
    exit: true,
  },
};
const protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag: "mc" as const };
it("overall and range Normal/Trailing switches preserve additional families and isolate every coordination", () => {
  for (const tag of RANGE_OPT_TAGS)
    for (const normal of [false, true])
      for (const trailing of [false, true])
        for (const ownNormal of [false, true])
          for (const ownTrailing of [false, true]) {
            const opts = {
              ...o,
              toggles: { ...o.toggles, normal, trailing },
              rangeOpts: { [tag]: { normal: ownNormal, trailing: ownTrailing } },
            };
            const ind = tag === "sig" ? "sig-ema-cross-s@m15" : "rsi-mom-14-20@m15";
            const p = {
              ...protect,
              ...(tag === "wide" || tag === "sig" || tag === "exit"
                ? { tag: undefined }
                : { tag: tag as "mc" }),
            };
            const kind = tag === "exit" ? "exit" : "normal";
            const tp = { ind, protect: p, kind } as const;
            const tg = effectiveStrategyToggles(tp, opts);
            assert.equal(tg.normal, normal && ownNormal);
            assert.equal(tg.trailing, trailing && ownTrailing);
            assert.equal(tapeExecutable(tp, opts), kind === "exit" || (normal && ownNormal));
            if (tag !== "exit") {
              assert.equal(
                tapeExecutable({ ...tp, kind: "trailing", protect: { ...p, trail: 0.002 } }, opts),
                normal && ownNormal && trailing && ownTrailing,
              );
              for (const adjusted of ["axis", "dca"] as StratKind[])
                assert.equal(tapeExecutable({ ...tp, kind: adjusted }, opts), true);
            }
            assert.equal(
              tapeExecutable(
                { ...tp, kind: "exit", protect: { ...p, trail: 0.002 } },
                { ...opts, rangeOpts: { exit: { trailing: ownTrailing } } },
              ),
              trailing && ownTrailing,
            );
          }
});
it("range switches survive server sanitization and do not become another range's gate", () => {
  const input = {
    mc: { normal: false, trailing: false, lastN: 5 },
    sig: { normal: false, trailing: true, lastN: 4 },
    exit: { trailing: false },
  };
  assert.deepEqual(sanitizeRangeOpts(input), input);
  assert.equal(
    effectiveStrategyToggles(
      { kind: "normal", ind: "ordinary", protect: { ...protect, tag: "sh" } },
      { ...o, rangeOpts: input },
    ).normal,
    true,
  );
});
it("Block exclusions cannot bypass disabled Normal; calculating its tape remains available", () => {
  const time = 1700000000000;
  const tr = {
    cfg: "fixture",
    sym: "AAA-USDT",
    side: 1,
    entryT: time - 60000,
    exitT: time,
    entry: 100,
    exit: 101,
    r: 0.01,
    mult: 1,
    reason: "tp",
    bars: 1,
    mfe: 0.01,
    mae: 0,
    kind: "normal",
  } as Trade;
  const tp = makeTape(
    "fixture",
    "follow",
    "rsi-mom-14-20@m15",
    protect,
    "normal",
    ["AAA-USDT"],
    Array.from({ length: 100 }, (_, i) => ({
      ...tr,
      entryT: time - (101 - i) * 60000,
      exitT: time - (100 - i) * 60000,
    })),
    [],
    [],
  );
  const opts = {
    ...o,
    toggles: { ...o.toggles, normal: false, block: true },
    block: { ...o.block, excludeRanges: ["mc"] },
  };
  assert.equal(tp.n, 100);
  const decision = execDecision(tp, time + 60000, opts, { sym: "AAA-USDT", side: 1 });
  assert.equal(decision.ok, false);
  if (!decision.ok) assert.equal(decision.why, "normalOff");
  assert.equal(
    execDecision(
      tp,
      time + 60000,
      { ...opts, toggles: { ...opts.toggles, normal: true } },
      { sym: "AAA-USDT", side: 1 },
    ).ok,
    true,
  );
});

it("disabling trailing freezes owned tick protection across recomputes without losing the existing stop", async () => {
  const { tickTrail, carryTrail } = await import("../server/tick-math.ts");
  for (const side of [1, -1]) {
    const prev = {
      side,
      entry: 100,
      stop: 100 + side * 2,
      peak: 100 + side * 4,
      trailOn: true,
      trail: 0.01,
      trailDist: 0.01,
      tkBar: 1,
      trailingProcessingEnabled: false,
    };
    const before = { ...prev };
    assert.equal(tickTrail(prev, 100 + side * 10, 180000, 60000), false);
    assert.equal(prev.stop, before.stop);
    assert.equal(prev.peak, before.peak);
    const current = { ...prev, stop: 100 + side * 8, peak: 100 + side * 12 };
    assert.equal(carryTrail(current, prev).stop, prev.stop);
  }
});
