// Regression tests for defects found in live operation and for the settings / trailing contracts.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkSettings } from "./settings-check.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { simulate } from "./sim/backtest.ts";
import { barsFromCandles } from "./market/bars.ts";
import { CoreDb, upgradeShared } from "./server/db.server.ts";
import { auditState } from "./audit.ts";
import { planLive } from "./server/live.ts";
import { protectGrid, DEFAULT_GRID } from "./sim/walkforward.ts";
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
      /shared or additive/,
    );
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
        positions: [{ cfg: "a", sym: "A", mtm: 0.01, vol: 1 }],
        trades: [],
        equity: 1,
        notional: 100,
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
});
