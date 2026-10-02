// Regression tests for defects found in live operation and for the settings / trailing contracts.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkSettings } from "./settings-check.ts";
import { DEFAULT_SETTINGS, RT_COST, SHORT_RANGE } from "./config.ts";
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
    assert.ok(cells.length <= 240 && cells.length >= 100, `${cells.length} cells`);
    // trailing cells: both widths, stop at least the range's trailing floor (2× minimal / short, 1× general / long)
    for (const [tag, floor] of [["mn", 2], ["sh", 2], ["gn", 1], ["lg", 1]] as const) {
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
        gridVariants({ ...DEFAULT_SETTINGS.grid, ...p.settings.grid }) <= (p.id.startsWith("desk-") ? 1200 : 600),
        p.id,
      );
    }
    assert.throws(
      () =>
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
    // the exchange minimum above the position cap: skipped with the reason
    const r = controlTargets(
      lanes,
      new Map([["A-USDT", 100]]),
      { ...cs, maxNotionalUsd: 3 },
      (_s, q, px) => snapQtyExchange(q, px, spec),
    );
    assert.equal(r.targets.length, 0);
    assert.match(r.skipped[0].why, /exchange minimum/);
  });
});

it("a preset or a settings save can set the symbol gate (veto / proven / per side); anything else is dropped", async () => {
  const { sanitizeWf } = await import("./server/runtime.server.ts");
  for (const v of ["veto", "proven", "vetoSide", "provenSide"]) assert.equal(sanitizeWf({ symGate: v } as never).symGate, v);
  assert.equal(sanitizeWf({ symGate: "nope" } as never).symGate, undefined);
});
