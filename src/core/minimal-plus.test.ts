import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import {
  MINIMAL_PLUS_RANGE,
  MINIMAL_PLUS_SL,
  MINIMAL_PLUS_TP,
  gateMinimalPlus,
  minimalPlusSettings,
  plusVariants,
} from "./minimal-coord.ts";
import { configId, parseConfigId } from "./pipeline/pipeline.ts";
import { controlTargets, entryCoidKind, makeCoid, planControl } from "./server/live.ts";
import { gridVariants, protectGrid } from "./sim/walkforward.ts";

test("minimal plus spans 2x-5x cost and stops 0.5x-3x, and is off by default", () => {
  assert.equal(MINIMAL_PLUS_TP.length, 4);
  assert.equal(MINIMAL_PLUS_TP[0], 0.004);
  assert.equal(MINIMAL_PLUS_TP.at(-1), 0.01);
  assert.equal(MINIMAL_PLUS_SL.length, 4);
  assert.equal(MINIMAL_PLUS_SL[0], 0.5);
  assert.equal(MINIMAL_PLUS_SL.at(-1), 3);
  assert.equal(MINIMAL_PLUS_RANGE.trailSlOfTp, 2.5);
  const mp = DEFAULT_SETTINGS.grid.minimalPlus;
  assert.equal(Boolean(mp && mp.enabled), false);
  assert.equal(plusVariants(false, 4, 2), 0);
  assert.equal(gridVariants(DEFAULT_SETTINGS.grid), gridVariants({ ...DEFAULT_SETTINGS.grid, minimalPlus: false }));
});

test("an enabled plus range builds only the selected cells, tagged for their own order id", () => {
  const g = {
    ...DEFAULT_SETTINGS.grid,
    holdH: [16],
    minimalPlus: {
      enabled: true,
      lastN: 50,
      minPf: 1.35,
      ...MINIMAL_PLUS_RANGE,
      cells: [{ tp: 0.006, sl: 0.012, trail: 0.003 }],
    },
  };
  const cells = protectGrid(15, g).filter((p) => p.tag === "mp");
  assert.equal(cells.length, 1);
  assert.equal(cells[0].sl, 0.012);
  const id = configId("follow", "rsi-mom-14-20", { ...cells[0], tag: "mp" });
  assert.equal(id.includes("|mp"), true);
  assert.equal(parseConfigId(id)?.protect.tp, 0.006);
  assert.equal(entryCoidKind(id), "M");
  assert.equal(makeCoid("bingx-vst-02", "M", 1).startsWith("CTSBV2_M"), true);
  assert.equal(entryCoidKind("follow|rsi|tp1|sl1|tr0|h16"), "E");
});

test("the last-N gate keeps a plus tape only after 50 closes above the higher PF", () => {
  const gp = new Float64Array(61);
  const gl = new Float64Array(61);
  for (let i = 1; i <= 60; i++) {
    gp[i] = gp[i - 1] + (i > 10 ? 0.02 : 0);
    gl[i] = gl[i - 1] + 0.01;
  }
  const good = { id: "follow|rsi-mom-14-20|tp0.6|sl1.2|tr0|h64|mp", n: 60, gp, gl };
  const plain = { id: "follow|rsi-mom-14-20|tp3|sl3|tr0|h16", n: 2, gp, gl };
  const kept = gateMinimalPlus([good, plain], { enabled: true, lastN: 50, minPf: 1.35 });
  assert.equal(kept.length, 2);
  const off = gateMinimalPlus([good, plain], { enabled: false, lastN: 50, minPf: 1.35 });
  assert.deepEqual(off.map((t) => t.id), [plain.id]);
  const young = gateMinimalPlus([{ ...good, n: 40 }], { enabled: true, lastN: 40, minPf: 1.35 });
  assert.equal(young.length, 0);
  assert.equal(minimalPlusSettings({ lastN: 10, minPf: 1.05 }).lastN, 50);
  assert.equal(minimalPlusSettings({ lastN: 10, minPf: 1.05 }).minPf, 1.2);
});

test("a control position of only plus lanes keeps the M tracking tag", () => {
  const cs = { notionalUsd: 50, ratio: 1, maxNotionalUsd: 200, maxPositions: 10, rebalancePct: 0.1 };
  const px = new Map([["SOL-USDT", 100]]);
  const plus = { cfg: "follow|rsi-mom-14-20|tp0.6|sl1.2|tr0.3|h64|mp", sym: "SOL-USDT", side: 1 as const, vol: 1, sl: 0.01 };
  const plain = { cfg: "follow|rsi-mom-14-20|tp0.6|sl1.2|tr0|h64", sym: "SOL-USDT", side: 1 as const, vol: 1, sl: 0.01 };
  const only = controlTargets([plus], px, cs).targets;
  assert.equal(only[0]?.cfg, "|mp");
  const open = planControl({ targets: only, held: new Map(), foreign: new Set(), rebalancePct: 0.1 });
  assert.equal(open.actions[0]?.kind, "open");
  assert.equal("cfg" in open.actions[0] ? open.actions[0].cfg : "", "|mp");
  const mixed = controlTargets([plus, plain], px, cs).targets;
  assert.equal(mixed[0]?.cfg, undefined);
  const micro = controlTargets(
    [{ ...plus, cfg: "follow|rsi|tp0.2|sl0.4|tr0|h16|mc" }],
    px,
    cs,
  ).targets;
  assert.equal(micro[0]?.cfg, "|mc");
});
