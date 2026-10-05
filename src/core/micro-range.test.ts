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
  assert.deepEqual([...MICRO_SL], [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5]);
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
  // 7 targets × 13 stops × 3 trails (one hold) = 273 cells, of which 225 are distinct once every stop is held to the
  // evaluation floor (EVAL_MIN_SL 0.5 %): the tightest ratios of the small targets collapse onto it
  // 7 targets x 11 stop ratios (from 1.0) x 3 trails, 219 distinct once the 0.5 % stop floor applies
  assert.equal(cells.length, 219);
  assert.equal(Math.min(...cells.map((p) => p.sl)), EVAL_MIN_SL, "no Micro cell below the stop floor");
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
  // two holds: 438 distinct Micro cells after the stop floor
  assert.equal(protectGrid(15, { ...grid(), holdH: [16, 24] }, 0.002).filter((p) => p.tag === "mc").length, 438);
});

test("Micro's Base cell: the middle net target + cost, the middle stop ratio of that price target", () => {
  const ps = baseRangeProtects({ ...grid(), baseBest: false }, 0.002);
  const mc = ps.find((p) => p.tag === "mc")!;
  assert.equal(mc.tp, 0.0045);
  // the middle of the stop ratios, which now start at 1.0: 2.25x the 0.45 % price target
  assert.equal(mc.sl, 0.010125);
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
  // the tightest stops are held to the evaluation floor; the wide ones keep their ratio
  assert.ok(ps.some((p) => p.tp === 0.003 && p.sl === EVAL_MIN_SL) && ps.some((p) => p.tp === 0.006 && p.sl === 0.021));
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

test("settings check: 13 Micro stop ratios and tpNetOfCost are accepted, a bad flag or 17 ratios are not", () => {
  const g = (micro: object) => ({ grid: { ...DEFAULT_SETTINGS.grid, micro: { ...MICRO_RANGE, ...micro } } }) as never;
  checkSettings(g({}));
  checkSettings(g({ tpNetOfCost: false, minTf: 15 }));
  assert.throws(() => checkSettings(g({ tpNetOfCost: "yes" })), /tpNetOfCost/);
  assert.throws(() => checkSettings(g({ slOfTp: Array.from({ length: 17 }, (_, i) => 0.5 + i * 0.25) })), /SL×TP/);
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
  assert.equal(mc.length, 219, "every distinct Micro cell after the stop floor");
  // the Base cell's set (0.45 % target, 0.9 % stop) is positive after the cost, and so are many others
  const base = mc.find((x) => x.protect.tp === 0.0045 && x.protect.sl === 0.009 && x.protect.trail === 0)!;
  assert.ok(base && base.gp[base.n] > base.gl[base.n] * 2, "base cell PF ≥ 2");
  assert.ok(mc.filter((x) => x.gp[x.n] - x.gl[x.n] > 0).length >= 50);
});
