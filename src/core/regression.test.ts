// Regression tests for defects found in live operation and for the settings / trailing contracts.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkSettings } from "./settings-check.ts";
import { DEFAULT_SETTINGS, GRID_VARIANTS_MAX, RT_COST, SHORT_RANGE } from "./config.ts";
import { simulate } from "./sim/backtest.ts";
import { barsFromCandles } from "./market/bars.ts";
import { CoreDb, upgradeShared } from "./server/db.server.ts";
import { auditState } from "./audit.ts";
import { planLive } from "./server/live.ts";
import { protectGrid, gridVariants, DEFAULT_GRID } from "./sim/walkforward.ts";
import { RESEARCH_PRESETS } from "./presets.ts";
import type { Candle, Protect } from "./domain/types.ts";

const M = 15 * 60_000;
/** bars from close prices; highs / lows = max / min of open and close (± wick) */
function bars(closes: number[], wick = 0) {
  const cs: Candle[] = closes.map((c, i) => {
    const o = i ? closes[i - 1] : c;
    return { t: i * M, o, h: Math.max(o, c) + wick, l: Math.min(o, c) - wick, c, v: 1 };
  });
  return barsFromCandles("T-USDT", 15, cs);
}
const longAt0 = (n: number) => {
  const s = new Int8Array(n);
  s[0] = 1;
  return s;
};

describe("settings validation", () => {
  it("accepts the defaults", () => {
    assert.doesNotThrow(() => checkSettings(DEFAULT_SETTINGS));
  });
  it("Block type and sources", () => {
    const b = DEFAULT_SETTINGS.block;
    assert.doesNotThrow(() =>
      checkSettings({
        block: { ...b, mode: "additive", sources: { overall: true, config: false } },
      }),
    );
    assert.throws(
      () => checkSettings({ block: { ...b, mode: "both" as never } }),
      /shared, additive or overall/,
    );
    assert.doesNotThrow(() =>
      checkSettings({
        block: { ...b, mode: "overall", steps: 6, pause: 3, sources: { overall: true, symbol: true, direction: true, indication: true } },
      }),
    );
    // shared / overall judge one source's level: an Active minimum above the max level could never trade
    assert.throws(
      () => checkSettings({ block: { ...b, mode: "overall", maxLevel: 4, minActiveLevel: 5 } }),
      /active level/,
    );
    assert.doesNotThrow(() => checkSettings({ block: { ...b, mode: "additive", maxLevel: 4, minActiveLevel: 5 } }));
    assert.throws(() => checkSettings({ block: { ...b, pause: 13 } }), /pause/);
    assert.throws(() => checkSettings({ block: { ...b, steps: -1 } }), /steps/);
    assert.throws(
      () => checkSettings({ block: { ...b, sources: { planet: true } as never } }),
      /block source/,
    );
    assert.throws(
      () => checkSettings({ block: { ...b, sources: { overall: "yes" } as never } }),
      /block source/,
    );
    assert.throws(() => checkSettings({ block: { ...b, ratio: 5 } }), /ratio/);
    assert.throws(() => checkSettings({ block: { ...b, maxMult: 0.5 } }), /multiple/);
  });
  it("rejects out-of-range numbers and unknown rankings", () => {
    assert.throws(() => checkSettings({ symbols: 0 }), /symbols/);
    assert.throws(() => checkSettings({ symbolRank: "random" as never }), /ranking/);
    assert.throws(() => checkSettings({ fees: { ...DEFAULT_SETTINGS.fees, taker: 0.5 } }), /taker/);
  });
});

describe("no silent caps", () => {
  it("the walk-forward sanitiser and the settings keep what was asked (nothing silently narrowed)", async () => {
    const { sanitizeWf } = await import("./server/runtime.server.ts");
    const { DEFAULT_SETTINGS, GRID_VARIANTS_MAX } = await import("./config.ts");
    const { defaultWalkForward } = await import("./sim/walkforward.ts");
    // the window, the seats and the position count are taken as given
    assert.equal(sanitizeWf({ simH: 3 }).simH, 3);
    assert.equal(sanitizeWf({ preH: 3 }).preH, 3);
    assert.equal(sanitizeWf({ maxPositions: 5000 }).maxPositions, 5000);
    assert.equal(sanitizeWf({ portfolio: 5000 }).portfolio, 5000);
    assert.equal(sanitizeWf({ microSeats: 50_000 }).microSeats, 50_000);
    // no processing cap by default: everything validated trades
    const o = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(o.maxPositions, 0, "positions");
    assert.equal(o.maxOpen, 0, "open orders");
    assert.equal(o.maxPerSymbol, 0, "per symbol");
    assert.equal(o.maxPerSide, 0, "per side");
    assert.equal(o.portfolio, 0, "seats");
    assert.equal(o.microSeats ?? 0, 0, "Micro seats");
    assert.equal(DEFAULT_SETTINGS.live.maxPositions, 0, "control positions");
    assert.equal(DEFAULT_SETTINGS.mainTop, 0, "Main pairs");
    // the grid ceiling is a memory guard, not a working limit
    assert.ok(GRID_VARIANTS_MAX >= 20_000, String(GRID_VARIANTS_MAX));
  });

  it("Micro stops start at ratio 1.0 of the price target (which already carries the round-trip cost)", async () => {
    const { MICRO_SL, MICRO_RANGE, microPriceTp, EVAL_MIN_SL } = await import("./minimal-coord.ts");
    assert.equal(Math.min(...MICRO_SL), 1, "the tightest Micro stop ratio");
    assert.equal(MICRO_RANGE.tpNetOfCost, true, "Micro targets are net of the cost");
    // a 0.1 % net target at the 0.2 % cost is a 0.3 % price target; its ratio-1 stop is 0.3 %, floored at 0.5 %
    const tp = microPriceTp(0.001, MICRO_RANGE, 0.002);
    assert.ok(Math.abs(tp - 0.003) < 1e-9, String(tp));
    assert.ok(Math.max(tp * Math.min(...MICRO_SL), EVAL_MIN_SL) >= EVAL_MIN_SL);
  });
});

describe("Base gate sensitivity (baseGateSensitivity)", () => {
  it("reports what each Base gate would admit, from the same results, without recomputing", async () => {
    const { baseGateSensitivity, BASE_GATE_VARIANTS } = await import("./pipeline/pipeline.ts");
    const g = { minPf: 1.1, minTrades: 12, maxDdr: 1 };
    const run = (pf: number, n: number, net: number, mdd: number, mc?: { pf: number; n: number; net: number }) => ({
      ind: "rsi-mom-14-20@m15",
      full: { pf, n, net, mdd },
      ...(mc ? { ranges: { mc: { ...mc, mdd: 0.1 } } } : {}),
    });
    const runs = [
      run(1.3, 40, 5, 2), // passes as run
      run(1.02, 40, 1, 0.5), // only a lower PF admits it
      run(1.4, 8, 3, 1), // only a lower close count admits it
      run(1.5, 40, 1, 4), // only DDR off / 2 admits it (drawdown 4 × its net)
    ] as never[];
    const rows = baseGateSensitivity(runs, g, ["mc", "sh"], BASE_GATE_VARIANTS);
    const by = new Map(rows.map((r) => [r.change, r]));
    assert.equal(rows[0].change, "as run");
    assert.equal(by.get("as run")!.passed, 1, "one of the four passes as run");
    assert.ok(by.get("PF ≥ 1.00")!.passed >= 2, "a lower PF admits the 1.02 pair");
    assert.ok(by.get("closes ≥ 6")!.passed >= 2, "a lower close count admits the 8-close pair");
    assert.ok(by.get("DDR off")!.passed >= 2, "DDR off admits the deep-drawdown pair");
    assert.equal(by.get("PF ≥ 1.00 · DDR off · closes ≥ 6")!.passed, 4, "all three together admit every pair");
    // the median PF reported is of the pairs that passed, and the share is of the evaluated pairs
    assert.equal(by.get("as run")!.pfPassedMedian, 1.3);
    assert.ok(by.get("as run")!.share <= 1 && by.get("as run")!.share >= 0);
    // a range's own cell counts for "in a range" even when the default cell fails
    const only = [run(0.5, 40, -1, 1, { pf: 1.3, n: 40, net: 4 })] as never[];
    const r2 = baseGateSensitivity(only, g, ["mc"], []);
    assert.equal(r2[0].passed, 0, "the default cell fails");
    assert.equal(r2[0].passedAnyRange, 1, "its Micro cell passes");
  });
});

describe("Base trailed cells (grid.baseTrailCells)", () => {
  it("off by default: every Base cell is at trail 0; on: one trailed cell per range target as well", async () => {
    const { baseRangeProtects } = await import("./pipeline/pipeline.ts");
    const { DEFAULT_SETTINGS } = await import("./config.ts");
    const { MICRO_RANGE } = await import("./minimal-coord.ts");
    assert.equal(DEFAULT_SETTINGS.grid.baseTrailCells, false, "the default");
    const g = { ...DEFAULT_SETTINGS.grid, micro: { ...MICRO_RANGE } } as never;
    const plain = baseRangeProtects(g, 0.002);
    assert.ok(plain.length > 0);
    assert.ok(
      plain.every((p) => p.trail === 0),
      "off: no Base cell carries a trail",
    );
    const withTrail = baseRangeProtects({ ...(g as object), baseTrailCells: true } as never, 0.002);
    const trailed = withTrail.filter((p) => p.trail > 0);
    assert.ok(trailed.length > 0, "on: trailed cells are measured");
    // one trailed cell per target of every range that has a non-zero trail ratio, nothing else removed
    const targets = new Set(plain.map((p) => `${p.tag}|${p.tp}`));
    assert.equal(trailed.length, targets.size, `one per target (${trailed.length} vs ${targets.size})`);
    assert.equal(withTrail.length, plain.length + trailed.length, "the plain cells are all still there");
    for (const p of trailed) assert.ok(p.sl >= 0.005 - 1e-9, `the stop floor still applies: ${p.sl}`);
  });
});

describe("stop floor", () => {
  it("every evaluated config's stop is at least the evaluation minimum (0.5 % by default)", async () => {
    const { protectGrid, dcaProtectGrid, axisVariants } = await import("./sim/walkforward.ts");
    const { baseRangeProtects } = await import("./pipeline/pipeline.ts");
    const { EVAL_MIN_SL } = await import("./minimal-coord.ts");
    const { DEFAULT_SETTINGS, DEFAULT_DCA, DEFAULT_AXIS } = await import("./config.ts");
    assert.equal(EVAL_MIN_SL, 0.005);
    const g = {
      ...DEFAULT_SETTINGS.grid,
      micro: { tp: [0.002, 0.003], slOfTp: [0.25, 0.5, 1], trailOfTp: [0, 0.5], minSl: 0.0001, minTrail: 0.0005 },
      minimal: { tp: [0.008], slOfTp: [0.1, 1], trailOfTp: [0], minSl: 0.0002, minTrail: 0.001 },
      minimalPlus: { ...DEFAULT_SETTINGS.grid.minimalPlus, enabled: true, cells: [{ tp: 0.01, sl: 0.0003, trail: 0 }] },
    } as never;
    for (const [what, ps] of [
      ["tape grid", protectGrid(15, g, 0.002)],
      ["Base cells", baseRangeProtects(g, 0.002)],
      ["DCA rungs", dcaProtectGrid(15, DEFAULT_DCA)],
    ] as const) {
      assert.ok(ps.length > 0, what);
      const low = ps.filter((p) => p.sl < EVAL_MIN_SL - 1e-9);
      assert.deepEqual(low, [], `${what}: ${JSON.stringify(low.slice(0, 3))}`);
    }
    // the Axis variants derive from the DCA rungs, so they carry the floor too
    for (const { p0 } of axisVariants(DEFAULT_AXIS, dcaProtectGrid(15, DEFAULT_DCA)))
      assert.ok(p0.sl >= EVAL_MIN_SL - 1e-9, JSON.stringify(p0));
    // the setting raises it
    const raised = protectGrid(15, { ...(g as object), minSlEval: 0.02 } as never, 0.002);
    assert.deepEqual(raised.filter((p) => p.sl < 0.02 - 1e-9), []);
  });
});

describe("config ids", () => {
  it("every Axis variant id parses back to its protect (the variant tag is part of the id)", async () => {
    const { parseConfigId, configId, kindOfId } = await import("./pipeline/pipeline.ts");
    const { axisVariants, dcaProtectGrid } = await import("./sim/walkforward.ts");
    const { DEFAULT_AXIS, DEFAULT_DCA } = await import("./config.ts");
    const vs = axisVariants(DEFAULT_AXIS, dcaProtectGrid(15, DEFAULT_DCA));
    assert.ok(vs.length >= 8, `${vs.length} variants`);
    for (const { p0, tag } of vs) {
      const id = configId("follow", "rsi-mom-14-20@m5", p0, "axis").replace(/\|axis$/, `${tag}|axis`);
      const got = parseConfigId(id);
      assert.ok(got, id);
      assert.equal(kindOfId(id), "axis", id);
      // the protect comes back (percent rounding of the id)
      assert.ok(Math.abs(got!.protect.tp - p0.tp) < 1e-4, `${id} tp ${got!.protect.tp}`);
      assert.ok(Math.abs(got!.protect.sl - p0.sl) < 1e-4, `${id} sl ${got!.protect.sl}`);
      assert.equal(got!.protect.hold, p0.hold, id);
    }
  });
});

describe("trailing mechanics", () => {
  // entry at 100 (open of bar 1); up to 104, then back down to 98
  const path = [100, 100, 101, 102, 104, 103.5, 103, 102, 101, 100, 99, 98];
  const b = bars(path);
  const sig = longAt0(path.length);
  const run = (p: Partial<Protect>) =>
    simulate("x", b, sig, { tp: 0.2, sl: 0.1, trail: 0.02, hold: 100, ...p }, { cost: 0.002 })
      .trades[0];

  it("default: stop = peak · (1 − trail), exit as trail", () => {
    const t = run({});
    assert.equal(t.reason, "trail");
    assert.ok(Math.abs(t.exit - 104 * 0.98) < 1e-9, String(t.exit));
  });
  it("trailStep 0.5 locks in more: stop = peak · (1 − trail/2)", () => {
    const t = run({ trailStep: 0.5 });
    assert.equal(t.reason, "trail");
    assert.ok(Math.abs(t.exit - 104 * 0.99) < 1e-9, String(t.exit));
    assert.ok(t.r > run({}).r);
  });
  it("trailFree lets a winner run past the target", () => {
    const up = [100, 100, 101, 103, 105, 108, 112, 111, 109, 105];
    const bu = bars(up);
    const s = longAt0(up.length);
    const capped = simulate(
      "x",
      bu,
      s,
      { tp: 0.05, sl: 0.1, trail: 0.02, hold: 100 },
      { cost: 0.002 },
    ).trades[0];
    const free = simulate(
      "x",
      bu,
      s,
      { tp: 0.05, sl: 0.1, trail: 0.02, hold: 100, trailFree: true },
      { cost: 0.002 },
    ).trades[0];
    assert.equal(capped.reason, "tp");
    assert.equal(free.reason, "trail");
    assert.ok(free.r > capped.r, `${free.r} > ${capped.r}`);
  });
  it("trailFree keeps the target while the trail is not active", () => {
    const up = [100, 100, 106];
    const t = simulate(
      "x",
      bars(up),
      longAt0(3),
      { tp: 0.05, sl: 0.1, trail: 0.2, hold: 100, trailFree: true },
      { cost: 0.002 },
    ).trades[0];
    assert.equal(t.reason, "tp");
  });
  it("every close pays the round-trip cost", () => {
    const t = run({});
    assert.ok(Math.abs(t.r - ((t.exit - t.entry) / t.entry - 0.002)) < 1e-12);
  });
});

describe("hot reload keeps the database usable", () => {
  it("an instance from an older module version gets the current tables and methods", () => {
    const db = new CoreDb(":memory:");
    db.run("DROP TABLE live_fills");
    // simulate an instance created by an older class
    Object.setPrototypeOf(db, Object.create(CoreDb.prototype));
    assert.throws(() => db.all("SELECT * FROM live_fills"), /no such table/);
    upgradeShared(db);
    assert.equal(Object.getPrototypeOf(db), CoreDb.prototype);
    assert.deepEqual(db.all("SELECT * FROM live_fills"), []);
    db.event("info", "still writable");
  });
});

describe("audit without a simulation", () => {
  it("checks paper equity and Real selection alone", () => {
    const r = auditState({
      sim: null,
      tapes: [],
      cost: 0.002,
      paper: {
        selected: ["missing"],
        positions: [{ cfg: "a", sym: "A", entryT: 0, mtm: 0.01, vol: 1 }],
        trades: [],
        // 2 % of a 5,000 balance = a 100 unit: 0.01 × 100 = 1
        equity: 1,
        sizing: { balance: 5000, sizing: { mode: "equityPct", pct: 0.02 }, fixedNotional: 100 },
      },
    });
    assert.equal(r.ok, false);
    assert.equal(r.checks.find((c) => c.name.startsWith("stages: Real"))!.ok, false);
    assert.equal(r.checks.find((c) => c.name.startsWith("paper: equity"))!.ok, true);
  });
});

describe("live entries mode never mirrors what it cannot follow", () => {
  it("skips managed exits (trailing / DCA / Axis) with a reason, keeps plain ones", () => {
    const it0 = { cfg: "c", sym: "BTC-USDT", side: 1 as const, tp: 0.02, sl: 0.03, barT: 1 };
    const plan = planLive({
      settings: { ...DEFAULT_SETTINGS.live, enabled: true, mode: "entries", maxPositions: 5 },
      envArmed: true,
      hasKeys: true,
      intents: [
        { ...it0, managed: true },
        { ...it0, sym: "ETH-USDT" },
      ],
      book: { positions: [], orders: [] },
      ownSyms: new Set(),
      sent: new Set(),
    });
    assert.deepEqual(
      plan.entries.map((e) => e.sym),
      ["ETH-USDT"],
    );
    assert.match(plan.skipped[0].why, /managed exit/);
  });
});

describe("protect grid", () => {
  it("trailing variants carry the trail step / free-run settings (default: plain trail); plain variants do not", () => {
    const ps = protectGrid(15, DEFAULT_GRID);
    const tr = ps.filter((p) => p.trail > 0);
    assert.ok(tr.length > 0 && tr.every((p) => p.trailStep === 1 && p.trailFree === false));
    assert.ok(
      ps
        .filter((p) => p.trail === 0)
        .every((p) => p.trailStep === undefined && p.trailFree === undefined),
    );
    const legacy = protectGrid(15, { ...DEFAULT_GRID, trailStep: 0.5, trailFree: true }).filter(
      (p) => p.trail > 0,
    );
    assert.ok(legacy.every((p) => p.trailStep === 0.5 && p.trailFree === true));
  });
  it("validates the trailing settings", () => {
    assert.throws(
      () => checkSettings({ grid: { ...DEFAULT_SETTINGS.grid, trailStep: 2 } }),
      /trail step/,
    );
    assert.throws(
      () => checkSettings({ grid: { ...DEFAULT_SETTINGS.grid, trailFree: 1 as never } }),
      /trail free/,
    );
  });
  it("position-cost ranges replace the wide targets, trailing stops further out, cap held", () => {
    const g = DEFAULT_SETTINGS.grid;
    assert.ok(g.short && g.minimal && g.general && g.long);
    const mult = (xs: readonly number[]) => xs.map((x) => +(x / RT_COST).toFixed(6));
    assert.deepEqual(mult(g.minimal.tp), [4, 5, 6, 7, 8]);
    assert.deepEqual(mult(g.short.tp), [9, 10, 11, 12, 13, 14]);
    assert.deepEqual(mult(g.general.tp), [16, 18, 20, 22]);
    assert.deepEqual(mult(g.long.tp), [24, 26, 28, 30, 32]);
    assert.deepEqual(g.tp, []);
    assert.ok(gridVariants(g) <= 400);
    const cells = protectGrid(15, g);
    // trailing cells keep their own stop ratios from 1× (a 2× floor folded 1× / 1.5× into 2×): 288 cells
    assert.ok(cells.length <= 300 && cells.length >= 100, `${cells.length} cells`);
    // trailing cells: both widths, stop at least the range's trailing floor (1× in every range)
    for (const [tag, floor] of [["mn", 1], ["sh", 1], ["gn", 1], ["lg", 1]] as const) {
      const tr = cells.filter((p) => p.tag === tag && p.trail > 0);
      assert.ok(tr.length > 0, tag);
      assert.ok(new Set(tr.map((p) => +(p.trail / p.tp).toFixed(3))).size >= 2, `${tag} trail widths`);
      for (const p of tr) {
        assert.ok(p.sl + 1e-9 >= floor * p.tp, `${tag} stop ${p.sl} not ≥ ${floor}× ${p.tp}`);
        assert.ok(p.sl + 1e-9 >= p.trail);
        assert.equal(p.trailStep, 1);
      }
    }
    assert.ok(cells.filter((p) => p.trail === 0).every((p) => p.trailStep === undefined));
    // ratio 1 is not swallowed by a stop floor
    assert.ok(cells.some((p) => p.tp === 0.008 && p.trail === 0 && Math.abs(p.sl - 0.008) < 1e-9));
    for (const p of RESEARCH_PRESETS) {
      assert.ok(p.settings.grid?.short, p.id);
      assert.deepEqual(p.settings.grid.short.tp, [...SHORT_RANGE.tp]);
      // the matrix presets keep a small grid; a desk preset with every range stays inside the server limit
      assert.ok(
        gridVariants({ ...DEFAULT_SETTINGS.grid, ...p.settings.grid }) <= GRID_VARIANTS_MAX,
        p.id,
      );
    }
    // the ceiling is a memory guard, not a working limit: a free grid (12 targets x 12 stops x 12 trails per range)
    // is accepted, and only an absurd one is refused
    checkSettings({
      grid: {
        ...g,
        short: {
          ...SHORT_RANGE,
          tp: Array.from({ length: 12 }, (_, i) => +(0.006 + i * 0.001).toFixed(4)),
          slOfTp: Array.from({ length: 12 }, (_, i) => +(1 + i * 0.2).toFixed(2)),
          trailOfTp: [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
        },
      },
    });
    assert.throws(
      () =>
        checkSettings({
          grid: {
            ...g,
            tp: Array.from({ length: 60 }, (_, i) => +(0.01 + i * 0.001).toFixed(4)),
            slOfTp: Array.from({ length: 30 }, (_, i) => +(1 + i * 0.1).toFixed(2)),
            trailOfTp: Array.from({ length: 20 }, (_, i) => +(i * 0.05).toFixed(2)),
            holdH: [4, 8, 16, 24, 48],
          },
        }),
      /protect grid too large/,
    );
  });
});

describe("hot reload re-attaches what an old module left behind", () => {
  it("the shared database gets state persistence it did not have", async () => {
    const { mkdtempSync, existsSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "cts-up-"));
    const db = new CoreDb(":memory:");
    db.kvSet("settings", { symbols: 7 });
    upgradeShared(db, join(dir, "state.json"));
    assert.ok(existsSync(join(dir, "state.json")));
    rmSync(dir, { recursive: true, force: true });
  });
  it("the runtime's live step always comes from the current module", async () => {
    const { coreRuntime } = await import("./server/runtime.server.ts");
    const prev = process.env.CTS_CORE_STATE;
    process.env.CTS_CORE_STATE = "off";
    const G = globalThis as { __ctsCoreRuntime?: { onLive?: unknown; stop?: () => void } };
    try {
      const rt = coreRuntime();
      rt.stop();
      const stale = async () => {
        throw new Error("Vite module runner has been closed.");
      };
      rt.onLive = stale;
      (rt as unknown as { __liveFrom?: unknown }).__liveFrom = stale;
      coreRuntime().stop();
      assert.notEqual(G.__ctsCoreRuntime!.onLive, stale);
    } finally {
      G.__ctsCoreRuntime?.stop?.();
      delete G.__ctsCoreRuntime;
      if (prev === undefined) delete process.env.CTS_CORE_STATE;
      else process.env.CTS_CORE_STATE = prev;
    }
  });
});

describe("exchange minimums", () => {
  it("quantity is floored to the lot step, and raised to the exchange minimum when below it", async () => {
    const { snapQtyExchange } = await import("./exchange/bingx.server.ts");
    const spec = { symbol: "X-USDT", minQty: 0.01, step: 0.001, qtyPrec: 3, pxPrec: 2, minUsdt: 5 };
    // plenty: floored to the step
    assert.deepEqual(snapQtyExchange(0.12345, 100, spec), { qty: 0.123, raised: false });
    // 2 USD wanted, exchange needs 5 USD: raised to 0.05
    assert.deepEqual(snapQtyExchange(0.02, 100, spec), { qty: 0.05, raised: true });
    // below min quantity (and min notional): the larger of the two
    assert.deepEqual(snapQtyExchange(0.001, 1000, spec), { qty: 0.01, raised: true });
    assert.deepEqual(snapQtyExchange(0, 100, spec), { qty: 0, raised: false });
  });
  it("a reject naming the minimum quantity is parsed, and the next size clears it", async () => {
    const { minQtyFromReject, snapQtyExchange } = await import("./exchange/bingx.server.ts");
    assert.equal(minQtyFromReject("parameter quantity or stopPrice is must"), null);
    assert.equal(minQtyFromReject("The minimum order amount is 84.25 AIN"), 84.25);
    const spec = { symbol: "AIN-USDT", minQty: 0.01, step: 0.01, qtyPrec: 2, pxPrec: 4, minUsdt: 2 };
    // planned 84.18 floors under the live minimum the exchange just named
    const floored = snapQtyExchange(84.18, 0.04, spec).qty;
    assert.ok(floored < 84.25);
    const named = minQtyFromReject("The minimum order amount is 84.25 AIN")!;
    const up = snapQtyExchange(Math.max(floored, named), 0.04, spec);
    assert.equal(up.qty, 84.25);
    assert.ok(up.qty >= named);
  });
  it("control targets record the raise, respect the cap and keep the minimum stop", async () => {
    const { controlTargets } = await import("./server/live.ts");
    const { snapQtyExchange } = await import("./exchange/bingx.server.ts");
    const spec = {
      symbol: "A-USDT",
      minQty: 0.001,
      step: 0.001,
      qtyPrec: 3,
      pxPrec: 2,
      minUsdt: 5,
    };
    const cs = {
      notionalUsd: 2,
      ratio: 1,
      maxNotionalUsd: 20,
      maxPositions: 10,
      rebalancePct: 0.25,
      minStopPct: 0.02,
    };
    const lanes = [{ cfg: "a", sym: "A-USDT", side: 1 as const, vol: 1, sl: 0.004 }];
    const { targets } = controlTargets(lanes, new Map([["A-USDT", 100]]), cs, (_s, q, px) =>
      snapQtyExchange(q, px, spec),
    );
    assert.equal(targets.length, 1);
    assert.equal(targets[0].raised, true);
    assert.ok(Math.abs(targets[0].qty - 0.05) < 1e-12);
    assert.ok(Math.abs((targets[0].volEff ?? 0) - 2.5) < 1e-9, "5 USD held for a 2 USD lane unit");
    assert.equal(targets[0].stopDist, 0.02, "never closer than the minimum stop");
    // The exchange minimum above the position cap is SENT at the minimum: it is the smallest tradable size, so
    // refusing it means never trading the symbol. The cap gives way to it, and the target says so (atMin).
    const r = controlTargets(
      lanes,
      new Map([["A-USDT", 100]]),
      { ...cs, maxNotionalUsd: 3 },
      (_s, q, px) => snapQtyExchange(q, px, spec),
    );
    assert.equal(r.targets.length, 1, "the minimum is traded, not skipped");
    assert.equal(r.targets[0].atMin, true);
    assert.ok(Math.abs(r.targets[0].notional - 5) < 1e-9, "sized at the 5 USD exchange minimum");
    assert.deepEqual(r.skipped, []);
    // only a minimum MIN_RAISE_X past the cap is refused — and then a held position is KEPT, never closed
    const far = controlTargets(
      lanes,
      new Map([["A-USDT", 100]]),
      { ...cs, maxNotionalUsd: 1 },
      (_s, q, px) => snapQtyExchange(q, px, spec),
    );
    assert.equal(far.targets.length, 0);
    assert.match(far.skipped[0].why, /exchange minimum/);
    assert.equal(far.skipped[0].keep, "A-USDT|1", "the held position stays as it is");
    // the venue's own floor sits UNDER minStopPct: it only binds when our floor is lowered below the venue's
    const venue = controlTargets(
      lanes,
      new Map([["A-USDT", 100]]),
      { ...cs, minStopPct: 0.0001, minStopOf: () => 0.0008 },
      (_s, q, px) => snapQtyExchange(q, px, spec),
    );
    assert.ok(
      Math.abs(venue.targets[0].stopDist - 0.0048) < 1e-12,
      `the lanes' own 0.4 % x 1.2 still wins: ${venue.targets[0].stopDist}`,
    );
    const tight = controlTargets(
      [{ cfg: "a", sym: "A-USDT", side: 1 as const, vol: 1, sl: 0.0001 }],
      new Map([["A-USDT", 100]]),
      { ...cs, minStopPct: 0.0001, minStopOf: () => 0.0008 },
      (_s, q, px) => snapQtyExchange(q, px, spec),
    );
    assert.equal(tight.targets[0].stopDist, 0.0008, "a stop under the venue minimum is lifted to it");
    assert.equal(tight.targets[0].riskDist, 0.0008, "and the risk distance with it");
  });
});

it("a preset or a settings save can set the symbol gate (veto / proven / per side); anything else is dropped", async () => {
  const { sanitizeWf } = await import("./server/runtime.server.ts");
  for (const v of ["veto", "proven", "vetoSide", "provenSide"]) assert.equal(sanitizeWf({ symGate: v } as never).symGate, v);
  assert.equal(sanitizeWf({ symGate: "nope" } as never).symGate, undefined);
});

it("the direction gate passes a settings save, clamped to the book's tail (0 = off, at most 64)", async () => {
  const { sanitizeWf } = await import("./server/runtime.server.ts");
  assert.equal(sanitizeWf({ sideGateN: 10 }).sideGateN, 10);
  assert.equal(sanitizeWf({ sideGateN: 500 }).sideGateN, 64);
  assert.equal(sanitizeWf({ sideGateN: -3 }).sideGateN, 0);
  assert.throws(() => sanitizeWf({ sideGateN: "x" as never }));
});

it("causal evaluation: the stages see only the bars before the run; the option passes a settings save", async () => {
  const { headBars, barsFromCandles } = await import("./market/bars.ts");
  const { sanitizeWf } = await import("./server/runtime.server.ts");
  const H = 3_600_000;
  const cs = Array.from({ length: 48 }, (_, i) => ({ t: i * H, o: 1, h: 1, l: 1, c: 1, v: 1 }));
  const b = barsFromCandles("A-USDT", 60, cs);
  const cut = headBars(b, 24 * H);
  assert.equal(cut.n, 24);
  assert.ok(cut.t[cut.n - 1] < 24 * H, "no bar at or after the run start");
  assert.equal(headBars(b, 100 * H), b, "nothing to cut: the same series");
  assert.equal(headBars(b, 0).n, 0);
  assert.equal(sanitizeWf({ causalBase: 1 as never }).causalBase, true);
  assert.equal(sanitizeWf({}).causalBase, undefined);
});

it("the volume factor (live.ratio) accepts up to 500: the caps bound the size, not the factor", async () => {
  const { checkSettings } = await import("./settings-check.ts");
  const { DEFAULT_SETTINGS } = await import("./config.ts");
  assert.doesNotThrow(() => checkSettings({ live: { ...DEFAULT_SETTINGS.live, ratio: 160 } } as never));
  assert.throws(() => checkSettings({ live: { ...DEFAULT_SETTINGS.live, ratio: 501 } } as never));
});

it("trailing floors hold for the trailing distance (trail × trailStep), also with a step below 1", async () => {
  const { protectGrid } = await import("./sim/walkforward.ts");
  const { DEFAULT_GRID } = await import("./sim/walkforward.ts");
  const g = { ...DEFAULT_GRID, trailStep: 0.5 } as never;
  const ps = protectGrid(15, g).filter((p) => p.trail > 0);
  assert.ok(ps.length > 0);
  const minTrail = (DEFAULT_GRID as { minTrail?: number }).minTrail ?? 0;
  for (const p of ps) assert.ok(p.trail * (p.trailStep ?? 1) >= minTrail - 1e-9, `gap ${p.trail * (p.trailStep ?? 1)} < ${minTrail}`);
  const { laneProtect } = await import("./pipeline/pipeline.ts");
  const { LANE_MIN } = await import("./pipeline/pipeline.ts");
  const lp = laneProtect({ tp: 0.004, sl: 0.004, trail: 0.002, hold: 32, trailStep: 0.5 }, "rsi-mom-14-20@m1");
  assert.ok(lp.trail * 0.5 >= LANE_MIN.trail - 1e-9, `1m lane gap ${lp.trail * 0.5} below ${LANE_MIN.trail}`);
});

it("signal acceptance sees every close inside its window, however busy the group (trimmed by time, not count)", async () => {
  const { SignalGuard } = await import("./signals.ts");
  const g = new SignalGuard();
  const H = 3_600_000;
  // 3000 closes over 300 h, all winners: a count cut kept the last 1000 (100 h) of a 336 h window
  for (let i = 0; i < 3000; i++) g.addAccept("k", 0.01, i * 0.1 * H);
  assert.equal(g.acceptStats("k", 300 * H, 336).n, 3000);
  // older than the longest window: dropped
  g.addAccept("k", 0.01, 700 * H);
  for (let i = 0; i < 2000; i++) g.addAccept("k", 0.01, (700 + i * 0.001) * H);
  assert.ok(g.acceptStats("k", 702 * H, 336).n >= 2001);
});

it("RSI of a flat series is neutral (50), not an extreme", async () => {
  const { rsi } = await import("./math/indicators.ts");
  const r = rsi(new Float64Array(40).fill(1), 14);
  const v = r.filter((x) => Number.isFinite(x));
  assert.ok(v.length > 0 && v.every((x) => x === 50), `flat RSI ${v[0]}`);
});

it("the live control keeps running through a failed or memory-delayed compute; only unapplied settings hold it", async () => {
  const { CoreRuntime } = await import("./server/runtime.server.ts");
  const { CoreDb } = await import("./server/db.server.ts");
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 } as never, { market: "synthetic" });
  const R = rt as unknown as Record<string, unknown>;
  let calls = 0;
  rt.onLive = async () => {
    calls++;
  };
  rt.updateSettings({ live: { ...rt.settings.live, enabled: true } } as never);
  R.paperStepped = true;
  R.resetUniverse = false;
  // a compute failed (dirty, retried with backoff): live still steps on the current book
  R.dirty = true;
  R.settingsStale = false;
  await rt.tick();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls, 1, "live step skipped on a dirty (failed) compute");
  // new settings not yet taken by a compute: live waits for the book they produce
  R.liveBusy = false;
  rt.kick();
  await rt.tick();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls, 1, "live stepped on settings no compute has taken");
  rt.stop();
});

it("a restart waits for the live step in flight (its open gets its stop) before the state is saved", async () => {
  const { CoreRuntime } = await import("./server/runtime.server.ts");
  const { CoreDb } = await import("./server/db.server.ts");
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 } as never, { market: "synthetic" });
  const R = rt as unknown as Record<string, unknown>;
  let release!: () => void;
  rt.onLive = () => new Promise<void>((r) => (release = r));
  rt.updateSettings({ live: { ...rt.settings.live, enabled: true } } as never);
  R.paperStepped = true;
  R.resetUniverse = false;
  R.settingsStale = false;
  await rt.tick();
  assert.equal(R.liveBusy, true, "a step is in flight");
  rt.stop();
  assert.equal(await rt.liveSettled(30), false, "still in flight: not settled");
  const settled = rt.liveSettled(5_000);
  setTimeout(() => release(), 20);
  assert.equal(await settled, true, "settled once the step returned");
});

it("Micro on its own indications: Base evaluates the Micro indications (a focus without them left Micro with no set)", async () => {
  const { baseFocus } = await import("./server/runtime.server.ts");
  const { DEFAULT_SETTINGS } = await import("./config.ts");
  const micro = { tp: [0.002, 0.003], slOfTp: [1], trailOfTp: [0], trailSlOfTp: 1, minSl: 0.001, minTrail: 0.0005 };
  const on = baseFocus({ ...DEFAULT_SETTINGS, grid: { ...DEFAULT_SETTINGS.grid, micro } } as never);
  assert.ok(on.some((k) => k.startsWith("follow|mc-")), "the Micro indications are in the Base focus");
  for (const k of DEFAULT_SETTINGS.focus) assert.ok(on.includes(k), `${k} kept`);
  const own = baseFocus({ ...DEFAULT_SETTINGS, grid: { ...DEFAULT_SETTINGS.grid, micro: { ...micro, ownInds: false } } } as never);
  assert.equal(own.some((k) => k.startsWith("follow|mc-")), false, "Micro on every indication: nothing added");
  const off = baseFocus({ ...DEFAULT_SETTINGS, grid: { ...DEFAULT_SETTINGS.grid, micro: false } } as never);
  assert.equal(off.some((k) => k.startsWith("follow|mc-")), false, "Micro off: nothing added");
  // an empty focus means every combo already
  assert.deepEqual(baseFocus({ ...DEFAULT_SETTINGS, focus: [], grid: { ...DEFAULT_SETTINGS.grid, micro } } as never), []);
});

// ── progress reporting (runtime status, session / desk lines, UI) ─────────────────────────────────────────────
describe("progress reporting", () => {
  it("Main is one monotonic stage: refine (S2), evaluate (S3) and the final ranking (S5) never move it back", async () => {
    const { pipelineStage } = await import("./progress.ts");
    // before: S3 restarted Main at 0 after S2 reached 100 %, and S5 reported "Real 100 %" before the Real
    // simulation started at 0 %
    const seq = [
      { stage: "S2", done: 0, total: 4, label: "a" },
      { stage: "S2", done: 4, total: 4, label: "a" },
      { stage: "S3", done: 1, total: 8, label: "b" },
      { stage: "S3", done: 8, total: 8, label: "b" },
      { stage: "S5", done: 1, total: 1, label: "3 armed" },
    ].map(pipelineStage);
    assert.ok(seq.every((x) => x.stage === "Main"), JSON.stringify(seq));
    for (let i = 1; i < seq.length; i++) assert.ok(seq[i].fraction >= seq[i - 1].fraction, `step ${i}`);
    assert.equal(seq[seq.length - 1].fraction, 1);
    assert.deepEqual(pipelineStage({ stage: "S1", done: 3, total: 6, label: "x" }), {
      stage: "Base",
      fraction: 0.5,
      label: "x",
    });
  });

  it("the overall bar follows the job's stages in order, never backwards, and reaches 1 at Realtime", async () => {
    const { overallOf, JOB_STAGES, DONE_STAGE } = await import("./progress.ts");
    for (const withBackfill of [true, false]) {
      let prev = 0;
      for (const [stage] of JOB_STAGES)
        for (const f of [0, 0.5, 1]) {
          const x = overallOf(stage, f, prev, withBackfill);
          assert.ok(x >= prev && x <= 1, `${stage} ${f}: ${x} after ${prev}`);
          prev = x;
        }
      assert.equal(overallOf("Paper", 1, 0, withBackfill), 1);
      assert.equal(overallOf(DONE_STAGE, 0, 0.3, withBackfill), 1);
      // a late report of an earlier stage never moves the bar back
      assert.equal(overallOf("Base", 0, 0.8, withBackfill), 0.8);
    }
    // a compute without a backfill batch starts at 0, not at the backfill's share
    assert.equal(overallOf("Base", 0, 0, false), 0);
    // out of range fractions are clamped
    assert.ok(overallOf("Real", 7, 0, true) <= 0.9);
  });

  it("the backfill line names the batch #/# of the run and the symbols loaded of the universe", async () => {
    const { backfillLabel, batchesOf } = await import("./progress.ts");
    // before: "AT-USDT · batch 8/50" — the loaded count over the symbol setting, called a batch
    // 13 symbols (12 + 1 forced) in batches of 5: 3 batches
    assert.equal(batchesOf(0, 13, 5), 3);
    assert.equal(batchesOf(1, 8, 5), 3);
    assert.equal(batchesOf(2, 3, 5), 3);
    assert.equal(backfillLabel("AT-USDT", 2, 3, 8, 13), "AT-USDT · batch 2/3 · symbols 8/13");
    // never over 100 %: a total below the loaded count (a stale universe) shows the loaded count
    assert.equal(backfillLabel("", 3, 2, 14, 13), "batch 3/3 · symbols 14/14");
  });

  it("a step of unknown length (paper, audit) estimates from its last run and never reports done early", async () => {
    const { estimatedFraction } = await import("./progress.ts");
    assert.equal(estimatedFraction(0, 100), 0);
    assert.equal(estimatedFraction(50, 100), 0.5);
    assert.equal(estimatedFraction(500, 100), 0.99);
    let prev = 0;
    for (let n = 1; n < 5000; n += 7) {
      const x = estimatedFraction(n, 0);
      assert.ok(x >= prev && x <= 0.9);
      prev = x;
    }
  });

  it("the UI lines show progress only while busy, the prehistoric bar uses the job's fraction", async () => {
    const { progressText, prehistPct, computeEta, clockOf } = await import("./progress.ts");
    // a finished compute (running) never keeps showing its last stage's fraction
    assert.equal(progressText({ state: "running", stage: "Signals", progress: 0, overall: 1 }), "");
    assert.equal(progressText({ state: "computing", stage: "Tapes", progress: 0.4, overall: 0.62 }), "Tapes 40% · job 62%");
    assert.equal(progressText({ state: "backfill", stage: "backfill", progress: 2 }), "backfill 100%");
    const p = { ready: 5, loaded: 10, total: 12, complete: false };
    // before: the stage's own fraction (restarting at 0 on every stage) moved the bar backwards
    const a = prehistPct(p, { state: "computing", overall: 0.5, progress: 0.9 });
    const b = prehistPct(p, { state: "computing", overall: 0.6, progress: 0.1 });
    assert.ok(b >= a, `${a} → ${b}`);
    assert.equal(prehistPct(p, { state: "backfill", overall: 0.05, progress: 1 }), 42);
    assert.equal(prehistPct({ ...p, complete: true }, { state: "running" }), 100);
    // loaded above total never shows more than 100 %
    assert.ok(prehistPct({ ready: 13, loaded: 13, total: 12, complete: false }, { state: "computing", overall: 1 }) <= 100);
    assert.deepEqual(computeEta({ state: "computing", computeStartedAt: 1000, lastComputeMs: 5000 }, 3000), {
      elapsedMs: 2000,
      leftMs: 3000,
    });
    assert.equal(computeEta({ state: "running", computeStartedAt: 1000, lastComputeMs: 5000 }, 3000), null);
    assert.equal(clockOf(65_000), "1:05");
    assert.equal(clockOf(3_725_000), "1:02:05");
  });

  it("the Real stage's total is the steps the simulation really yields (the start is floored to the hour)", async () => {
    const { walkForwardSteps } = await import("./sim/walkforward.ts");
    const H = 3_600_000;
    // the newest bar 20 minutes past the hour: 6 h simulated start at the full hour 6 h 20 min before → 7 steps
    // (the old total ceil(6 / 1) = 6 ran the bar to 117 %)
    const nowT = 1_800_000_000_000 - (1_800_000_000_000 % H) + 20 * 60_000;
    const u = { nowT, baseTf: 1, bars: [] };
    assert.equal(walkForwardSteps(u as never, { simH: 6, stepH: 1 }), 7);
    assert.equal(walkForwardSteps({ ...u, nowT: nowT - 20 * 60_000 } as never, { simH: 6, stepH: 1 }), 6);
    // a step is at least one bar
    assert.equal(walkForwardSteps({ ...u, baseTf: 120 } as never, { simH: 6, stepH: 1 }), 4);
    // an explicit start: up to simH
    assert.equal(walkForwardSteps(u as never, { simH: 6, stepH: 1, startT: nowT - 3 * H }), 3);
  });
});

it("the drawdown-time limit scales with a config's history and never drops below gates.minDdtH (default 18 h)", async () => {
  const { ddtLimitH } = await import("./sim/walkforward.ts");
  const { DEFAULT_GATES } = await import("./config.ts");
  assert.equal(DEFAULT_GATES.minDdtH, 18);
  const H = 3_600_000;
  const t = 1_000 * H;
  const o = (minDdtH?: number) => ({ gates: { ...DEFAULT_GATES, maxDdtH: 35, minDdtH } }) as never;
  const tp = (hours: number) => ({ fromT: t - hours * H }) as never;
  // 24 h of history: 35 × 24 / 72 = 11.67 h — lifted to the 18 h floor
  assert.equal(ddtLimitH(o(18), tp(24), t, 336), 18);
  // 6 h of history: 2.9 h — lifted to 18 h
  assert.equal(ddtLimitH(o(18), tp(6), t, 336), 18);
  // 72 h of history: the full 35 h, the floor does not bind
  assert.equal(ddtLimitH(o(18), tp(72), t, 336), 35);
  // without a floor the scaled limit applies as before
  assert.ok(Math.abs(ddtLimitH(o(0), tp(24), t, 336) - 35 * 24 / 72) < 1e-9);
  assert.ok(Math.abs(ddtLimitH(o(undefined), tp(24), t, 336) - 35 * 24 / 72) < 1e-9);
});
