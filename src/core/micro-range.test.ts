// The Micro range: net-of-cost targets (price target = net + settings.cost), every stop ratio 0.5–3.5×, its shortest
// lane, Base eligibility, and a regression that a planted micro edge passes Base and builds Micro sets.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS, type CoreSettings } from "./config.ts";
import { EVAL_MIN_SL, forEachMicro, MICRO_RANGE, MICRO_SL, MICRO_TP, microPriceTp, rangeMinTfOf, rangeTpLabel } from "./minimal-coord.ts";
import {
  basePassTags,
  baseRangeProtects,
  makeUniverse,
  MICRO_BASE_SL,
  rangeAppliesTo,
  rangeBaseStats,
  rangeCellPass,
  runCombo,
} from "./pipeline/pipeline.ts";
import { buildTapes, protectGrid } from "./sim/walkforward.ts";
import { checkSettings } from "./settings-check.ts";
import { baseFocus } from "./server/runtime.server.ts";
import { microSpecs } from "./indications/micro.ts";
import type { Bars } from "./domain/types.ts";

const grid = (micro: object = {}) => ({ ...DEFAULT_SETTINGS.grid, holdH: [16], micro: { ...MICRO_RANGE, ...micro } });

test("Micro targets are net of the round-trip cost: 0.1–0.4 % net → price targets 0.3–0.6 % at the 0.2 % cost", () => {
  assert.deepEqual([...MICRO_TP], [0.001, 0.0015, 0.002, 0.0025, 0.003, 0.0035, 0.004]);
  // the stop ratios start at 1.0 of the price target (operator): never inside the target it must reach
  // … up to 5× (operator, 6 Oct)
  assert.deepEqual([...MICRO_SL], [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5]);
  assert.equal(MICRO_RANGE.tpNetOfCost, true);
  assert.equal(microPriceTp(0.001, MICRO_RANGE, 0.002), 0.003);
  assert.equal(microPriceTp(0.004, MICRO_RANGE, 0.002), 0.006);
  // follows the cost setting, and unset means on
  assert.equal(microPriceTp(0.001, { ...MICRO_RANGE, tpNetOfCost: undefined }, 0.0025), 0.0035);
  // off: tp is the price target itself
  assert.equal(microPriceTp(0.003, { ...MICRO_RANGE, tpNetOfCost: false }, 0.002), 0.003);
  assert.equal(rangeTpLabel(0.003, "mc", 0.002), "0.30 % (net 0.10 %)");
  assert.equal(rangeTpLabel(0.012, "mn", 0.002), "1.20 %");
});

test("Micro cells: price targets net + cost, every stop and trailing share applied to the price target", () => {
  const tps: number[] = [];
  forEachMicro(grid(), (tp, k, tr) => {
    if (k === 1 && tr === 0) tps.push(tp);
  });
  assert.deepEqual(tps, [0.003, 0.0035, 0.004, 0.0045, 0.005, 0.0055, 0.006]);
  const cells = protectGrid(15, grid(), 0.002).filter((p) => p.tag === "mc");
  // 7 targets x 17 stop ratios (1.0 … 5.0) x 3 trails, 354 distinct once Micro's stop floor applies: minSlNet 0.2 %
  // plus the 0.2 % round trip = 0.4 % (the tightest ratios of the smallest targets collapse onto it)
  assert.equal(cells.length, 354);
  assert.equal(Math.min(...cells.map((p) => p.sl)), 0.004, "no Micro cell below its stop floor (0.2 % net + cost)");
  // the floor follows the cost: at 0.3 % it is 0.5 %
  const dearSl = protectGrid(15, grid(), 0.003).filter((p) => p.tag === "mc").map((p) => p.sl);
  assert.equal(Math.min(...dearSl), 0.005);
  assert.equal(Math.min(...cells.map((p) => p.tp)), 0.003, "no Micro cell below 0.3 % at the 0.2 % cost");
  const c = cells.find((p) => p.tp === 0.004 && p.trail === 0 && p.sl === 0.014)!;
  assert.ok(c, "0.2 % net → 0.4 % price target, 3.5× stop = 1.4 %");
  const t = cells.find((p) => p.tp === 0.006 && p.trail > 0 && p.sl === 0.006)!;
  assert.ok([0.003, 0.0045].includes(t.trail), "trailing share of the price target");
  // a higher cost moves every price target with it
  const dear = protectGrid(15, grid(), 0.003).filter((p) => p.tag === "mc");
  assert.equal(Math.min(...dear.map((p) => p.tp)), 0.004);
  // the configured price targets when tpNetOfCost is off
  const gross = protectGrid(15, grid({ tp: [0.003, 0.004], tpNetOfCost: false }), 0.002).filter((p) => p.tag === "mc");
  assert.deepEqual([...new Set(gross.map((p) => p.tp))], [0.003, 0.004]);
  // two holds: 708 distinct Micro cells after the stop floor
  assert.equal(protectGrid(15, { ...grid(), holdH: [16, 24] }, 0.002).filter((p) => p.tag === "mc").length, 708);
});

test("Micro's Base cell: the middle net target + cost, the middle stop ratio of that price target", () => {
  const ps = baseRangeProtects({ ...grid(), baseBest: false }, 0.002);
  const mc = ps.find((p) => p.tag === "mc")!;
  assert.equal(mc.tp, 0.0045);
  // the middle of the stop ratios 1.0 … 5.0: 3x the 0.45 % price target
  assert.equal(mc.sl, 0.0135);
  assert.equal(baseRangeProtects({ ...grid(), baseBest: false }, 0.0025).find((p) => p.tag === "mc")!.tp, 0.005);
});

test("Micro best-cell Base: every target × stops 0.5 / 1 / 2 / 3.5, the range keeps its best cell by net", () => {
  // the default (grid.baseBest on)
  const ps = baseRangeProtects(grid(), 0.002).filter((p) => p.tag === "mc");
  assert.equal(ps.length, 7 * MICRO_BASE_SL.length);
  // every Base stop ratio is one the Micro grid can actually trade (MICRO_SL): a Base cell at a ratio no config
  // offers validated targets on a stop that never reached the tape stage
  for (const k of MICRO_BASE_SL) assert.ok(MICRO_SL.includes(k), `MICRO_BASE_SL ${k} is not in MICRO_SL`);
  assert.equal(Math.min(...MICRO_BASE_SL), Math.min(...MICRO_SL), "the tightest ratio matches the grid");
  assert.deepEqual([...new Set(ps.map((p) => p.tp))], [0.003, 0.0035, 0.004, 0.0045, 0.005, 0.0055, 0.006]);
  // the tightest stops are held to Micro's floor (0.2 % net + cost); the wide ones keep their ratio
  assert.ok(ps.some((p) => p.tp === 0.003 && p.sl === 0.004) && ps.some((p) => p.tp === 0.006 && p.sl === 0.03));
  // off: the one middle cell
  assert.equal(baseRangeProtects({ ...grid(), baseBest: false }, 0.002).filter((p) => p.tag === "mc").length, 1);
  assert.equal(baseRangeProtects(grid({ baseBest: false }), 0.002).filter((p) => p.tag === "mc").length, 1, "range override");
  assert.throws(() => checkSettings({ ...DEFAULT_SETTINGS, grid: grid({ baseBest: "yes" }) } as unknown as CoreSettings), /baseBest/);
});

test("Micro trades 5m and slower by default: no 1m Micro pair in Base, no 1m Micro set", () => {
  assert.equal(rangeMinTfOf(grid()).mc, 5);
  assert.equal(rangeMinTfOf(grid({ minTf: 0 })).mc, undefined);
  const o = { enabled: () => true, minTf: rangeMinTfOf(grid()), microOwnInds: true };
  assert.equal(rangeAppliesTo("mc-turn-10@m1", "mc", o), false);
  assert.equal(rangeAppliesTo("mc-turn-10@m5", "mc", o), true);
  assert.equal(rangeAppliesTo("mc-turn-10@m30", "", o), false, "a Micro indication never trades Wide");
  const s = {
    ...DEFAULT_SETTINGS,
    tfs: [1, 5, 15, 30],
    grid: { ...DEFAULT_SETTINGS.grid, micro: { ...MICRO_RANGE, ownInds: true } },
  } as CoreSettings;
  const f = baseFocus(s);
  const mc = f.filter((x) => x.startsWith("follow|mc-"));
  assert.equal(mc.length, microSpecs().length * 5, "5m, 15m, 30m and the combined 5m+ / 15m+ lanes");
  assert.ok(!mc.some((x) => x.endsWith("@m1") || x.endsWith("@m1c")));
  assert.ok(mc.includes("follow|mc-turn-10@m5") && mc.includes("follow|mc-turn-10@m15c"));
  // every lane again with minTf 0
  const all = baseFocus({ ...s, grid: { ...s.grid, micro: { ...MICRO_RANGE, minTf: 0 } } } as CoreSettings);
  assert.equal(all.filter((x) => x.startsWith("follow|mc-")).length, microSpecs().length);
});

test("settings check: 17 Micro stop ratios, tpNetOfCost and minSlNet are accepted, a bad flag or 25 ratios are not", () => {
  const g = (micro: object) => ({ grid: { ...DEFAULT_SETTINGS.grid, micro: { ...MICRO_RANGE, ...micro } } }) as never;
  checkSettings(g({}));
  checkSettings(g({ tpNetOfCost: false, minTf: 15 }));
  assert.throws(() => checkSettings(g({ tpNetOfCost: "yes" })), /tpNetOfCost/);
  checkSettings(g({ minSlNet: 0.003 }));
  assert.throws(() => checkSettings(g({ minSlNet: 0.2 })), /min SL net/);
  assert.throws(
    () => checkSettings({ grid: { ...DEFAULT_SETTINGS.grid, short: { ...DEFAULT_SETTINGS.grid.short, minSlNet: 0.002 } } } as never),
    /only the Micro range/,
  );
  assert.throws(() => checkSettings(g({ slOfTp: Array.from({ length: 25 }, (_, i) => 0.5 + i * 0.15) })), /SL×TP/);
  assert.throws(() => checkSettings(g({ minTf: 500 })), /shortest lane/);
});

/**
 * 5m bars with a planted micro edge: every 24 bars three falling closes (RSI(2) < 5) and then a rebound of ≈ +1.2 %
 * in small steps, so a long taken at the next open reaches a 0.45 % price target long before a 0.9 % stop.
 */
function planted(sym: string, n: number, t0: number): Bars {
  const b: Bars = {
    sym,
    tfMin: 5,
    n,
    t: new Float64Array(n),
    o: new Float64Array(n),
    h: new Float64Array(n),
    l: new Float64Array(n),
    c: new Float64Array(n),
    v: new Float64Array(n).fill(1000),
  };
  let p = 100;
  for (let i = 0; i < n; i++) {
    const k = i % 24;
    const ret = k >= 16 && k <= 18 ? -0.0025 : k >= 19 ? (k % 2 ? 0.003 : -0.0002) : k % 2 ? 0.0002 : -0.0002;
    const o = p;
    p = o * (1 + ret);
    b.t[i] = t0 + i * 300_000;
    b.o[i] = o;
    b.c[i] = p;
    b.h[i] = Math.max(o, p) * 1.0003;
    b.l[i] = Math.min(o, p) * 0.9997;
  }
  return b;
}

test("regression: a planted micro edge passes Base at Micro's own cell and builds Micro sets", () => {
  const t0 = Date.UTC(2026, 8, 1);
  const u = makeUniverse([planted("A-USDT", 3000, t0), planted("B-USDT", 3000, t0 + 7 * 300_000)]);
  const g = grid({ ownInds: true });
  const cost = 0.002;
  const ind = "mc-rsi2-5@m5";
  const r = runCombo(u, "follow", ind, DEFAULT_PROTECT, cost, 1)!;
  const gates0 = { ...DEFAULT_SETTINGS.gates, minPf: 1.05 };
  const tps: Record<string, number[]> = {};
  const ranges = rangeBaseStats(
    u,
    "follow",
    ind,
    baseRangeProtects(g, cost),
    cost,
    null,
    rangeMinTfOf(g),
    true,
    rangeCellPass(gates0),
    5,
    tps,
  )!;
  assert.ok(ranges.mc, "judged at Micro's own cell");
  // the targets whose cells passed: the tape stage builds only these (pairTps)
  assert.ok(tps.mc?.length, `passing Micro targets ${JSON.stringify(tps)}`);
  const allTps = [...new Set(baseRangeProtects(g, cost).filter((p) => p.tag === "mc").map((p) => p.tp))];
  assert.ok(tps.mc.every((x) => allTps.includes(x)), "a passing target is one Base tried");
  const built = buildTapes(u, protectGrid(15, g, cost), cost, undefined, new Set([`follow|${ind}`]), null, undefined, {
    minSl: 0,
    minTrail: 0,
    microOwnInds: true,
    pairTags: { [`follow|${ind}`]: ["mc"] },
    pairTps: { [`follow|${ind}`]: { mc: tps.mc } },
  });
  assert.ok(built.length > 0, "the validated targets build their cells");
  assert.deepEqual(
    [...new Set(built.map((t) => t.protect.tp))].filter((x) => !tps.mc.includes(x)),
    [],
    "no cell of a target Base did not validate",
  );
  assert.ok(ranges.mc.n >= 100 && ranges.mc.pf >= 2 && ranges.mc.net > 0, JSON.stringify(ranges.mc));
  const gates = { ...DEFAULT_SETTINGS.gates, minPf: 1.05 };
  const o = { enabled: () => true, minTf: rangeMinTfOf(g), microOwnInds: true };
  const tags = basePassTags({ full: r.full, ranges }, gates, ["mc"]).filter((x) => rangeAppliesTo(ind, x, o));
  assert.deepEqual(tags, ["mc"], "passes Base for Micro only");
  const tapes = buildTapes(u, protectGrid(15, g, cost), cost, undefined, new Set([`follow|${ind}`]), null, undefined, {
    minSl: 0,
    minTrail: 0,
    microOwnInds: true,
    rangeMinTf: rangeMinTfOf(g),
  } as never);
  const mc = tapes.filter((x) => x.protect.tag === "mc");
  assert.equal(mc.length, tapes.length, "a Micro indication builds Micro sets only");
  assert.equal(mc.length, 354, "every distinct Micro cell after the stop floor");
  // the Base cell's set (0.45 % target, 0.9 % stop) is positive after the cost, and so are many others
  const base = mc.find((x) => x.protect.tp === 0.0045 && x.protect.sl === 0.009 && x.protect.trail === 0)!;
  assert.ok(base && base.gp[base.n] > base.gl[base.n] * 2, "base cell PF ≥ 2");
  assert.ok(mc.filter((x) => x.gp[x.n] - x.gl[x.n] > 0).length >= 50);
});

test("Micro can set its own evaluation stop floor and its own smallest net target", async () => {
  const { protectGrid } = await import("./sim/walkforward.ts");
  const { baseRangeProtects } = await import("./pipeline/pipeline.ts");
  const { DEFAULT_SETTINGS } = await import("./config.ts");
  const cost = 0.002;
  // without minSlNet the global floor is 0.5 %: at a 0.40 % price target no cell can have a stop inside its target
  const wide = { ...DEFAULT_SETTINGS.grid, micro: { ...MICRO_RANGE, minSlNet: undefined } } as never;
  const g1 = protectGrid(5, wide, cost).filter((p) => p.tag === "mc" && Math.abs(p.tp - 0.004) < 1e-9);
  assert.ok(g1.length > 0, "the 0.40 % target is built");
  assert.ok(
    g1.every((p) => p.sl >= EVAL_MIN_SL - 1e-12),
    "every stop is at or above the global floor",
  );
  // with the range's own floor at 0.25 % the ratio-1 cell is its target, so reward:risk can exceed 1
  // the range's own minimum stop (MICRO_RANGE.minSl) is the evaluation floor as well, so both come down together
  const own = {
    ...DEFAULT_SETTINGS.grid,
    micro: { ...MICRO_RANGE, minSlNet: undefined, minSl: 0.0025, minSlEval: 0.0025 },
  } as never;
  const g2 = protectGrid(5, own, cost).filter((p) => p.tag === "mc" && Math.abs(p.tp - 0.004) < 1e-9);
  assert.ok(
    g2.some((p) => p.sl < EVAL_MIN_SL - 1e-12),
    "a stop below the global floor is now buildable",
  );
  assert.ok(Math.min(...g2.map((p) => p.sl)) >= 0.0025 - 1e-12, "never below the range's own floor");
  // the Base cells follow the same floor
  const b2 = baseRangeProtects(own, cost).filter((p) => p.tag === "mc");
  assert.ok(b2.length > 0 && Math.min(...b2.map((p) => p.sl)) >= 0.0025 - 1e-12);
  assert.ok(Math.min(...b2.map((p) => p.sl)) < EVAL_MIN_SL - 1e-12, "Base measures the tighter cell too");
  // minNetOfCost drops the net targets below a multiple of the round-trip cost
  const cut = { ...DEFAULT_SETTINGS.grid, micro: { ...MICRO_RANGE, minNetOfCost: 1 } } as never;
  const tps = new Set(protectGrid(5, cut, cost).filter((p) => p.tag === "mc").map((p) => p.tp));
  assert.ok(!tps.has(0.003), "net 0.10 % (price 0.30 %) is dropped at a 0.20 % cost");
  assert.ok(tps.has(0.004), "net 0.20 % (price 0.40 %) is kept");
});
