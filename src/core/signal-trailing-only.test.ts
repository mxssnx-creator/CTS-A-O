import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { Bars, Protect, StratKind, Trade } from "./domain/types.ts";
import {
  configId,
  kindOfId,
  laneProtect,
  makeUniverse,
  parseConfigId,
  protectKind,
} from "./pipeline/pipeline.ts";
import { heldHistProtects, heldSignalProtect } from "./signal-hist.ts";
import { mergeSignals, signalSettings } from "./signal-config.ts";
import {
  acceptKey,
  guardKey,
  SignalAcceptIndex,
  SignalGuard,
  sigActiveKey,
  signalProtects,
} from "./signals.ts";
import { simulate } from "./sim/backtest.ts";
import {
  activeSignalsAt,
  buildTapes,
  defaultWalkForward,
  execDecision,
  floorsForPairs,
  makeTape,
  packTapes,
  pendingAsOpen,
  tapeExecutable,
  unpackTapes,
  type ConfigTape,
} from "./sim/walkforward.ts";
import { carryTrail, crossedExit, tickTrail } from "./server/runtime.server.ts";
import { laneContributions, liveLaneFilter } from "./server/live.server.ts";
import { controlTargets } from "./server/live.ts";
import type { CoreRuntime } from "./server/runtime.server.ts";
import { checkSettings } from "./settings-check.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { closePool, runOnWorkers } from "./server/pool.server.ts";
import { BaseConfigCounter } from "./base-config-counts.ts";
import { setKeyOf } from "./adjust.ts";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime as Runtime } from "./server/runtime.server.ts";

const H = 3_600_000;
const IND = "sig-ema-cross-s@m15";
const SYM = "A-USDT";
const NOW = 100 * H;
const only: Protect = { tp: 0, sl: 0.03, trail: 0.01, trailStep: 1, trailOnly: true, hold: 192 };

function tape(
  kind: StratKind,
  rs: number[],
  ind = IND,
  p = kind === "trailing-only" ? only : { tp: 0.03, sl: 0.06, trail: 0.015, hold: 192 },
) {
  const id = configId("follow", ind, p);
  const trades: Trade[] = rs.map((r, i) => ({
    cfg: id,
    sym: SYM,
    side: 1,
    entryT: (80 + i) * H,
    exitT: (90 + i) * H,
    entry: 100,
    exit: 100 * (1 + r),
    r,
    reason: r > 0 ? "trail" : "sl",
    bars: 40,
    mfe: 0,
    mae: 0,
    kind,
  }));
  return makeTape(id, "follow", ind, p, kind, [SYM], trades, [], []);
}

function path(side: 1 | -1): Bars {
  const reflect = (a: number[]) => Float64Array.from(a, (x) => (side === 1 ? x : 200 - x));
  const highs = [100, 101, 104, 103];
  const lows = [100, 100, 102.5, 102];
  return {
    sym: SYM,
    tfMin: 15,
    n: 4,
    t: Float64Array.from([0, 1, 2, 3], (x) => x * 15 * 60_000),
    o: reflect([100, 100, 101, 103]),
    c: reflect([100, 100.5, 103, 102.5]),
    h: reflect(side === 1 ? highs : lows),
    l: reflect(side === 1 ? lows : highs),
    v: new Float64Array(4),
  };
}

describe("Signals: additional independent Trailing only sets", () => {
  it("adds every SL × trail range without replacing Normal, capped Trailing or ATR", () => {
    const sig = signalSettings({ trailRatios: [1] });
    for (const exits of ["pct", "atr", "both"] as const) {
      const enabled = signalProtects({ ...sig, exits });
      const disabled = signalProtects({
        ...sig,
        exits,
        trailingOnly: { ...sig.trailingOnly, enabled: false },
      });
      const extra = enabled.filter((p) => p.trailOnly);
      assert.equal(extra.length, 9);
      assert.equal(enabled.length - disabled.length, 9);
      assert.deepEqual(
        enabled.filter((p) => !p.trailOnly),
        disabled,
      );
      assert.deepEqual(new Set(extra.map((p) => p.sl)), new Set([0.015, 0.03, 0.06]));
      assert.deepEqual(new Set(extra.map((p) => p.trail)), new Set([0.005, 0.01, 0.02]));
      assert.ok(
        extra.every(
          (p) => p.tp === 0 && p.sl > 0 && p.trailStep === 1 && protectKind(p) === "trailing-only",
        ),
      );
    }
  });

  it("normalizes and patches its own lists independently, rejecting invalid supplied settings", () => {
    const sig = signalSettings({
      trailingOnly: {
        enabled: true,
        sl: [NaN, 0.015, 0.015, 0.03],
        trail: [0, 0.01],
        trailStep: 0.5,
      },
    });
    assert.deepEqual(sig.trailingOnly, {
      enabled: true,
      sl: [0.015, 0.03],
      trail: [0.01],
      trailStep: 0.5,
    });
    const changed = mergeSignals(sig, { trailingOnly: { ...sig.trailingOnly, trail: [0.02] } });
    assert.deepEqual(changed.trailingOnly.sl, sig.trailingOnly.sl);
    assert.deepEqual(changed.trailingOnly.trail, [0.02]);
    assert.deepEqual(changed.trailing, sig.trailing);
    assert.equal(signalProtects(changed).filter((p) => p.trailOnly).length, 2 * changed.trailRatios!.length);
    assert.throws(
      () =>
        checkSettings({
          signals: { trailingOnly: { ...sig.trailingOnly, trailStep: -1 } },
        } as never),
      /trail step/,
    );
    assert.throws(
      () => checkSettings({ signals: { trailingOnly: { ...sig.trailingOnly, sl: [0] } } } as never),
      /Trailing only SL/,
    );
  });

  it("round-trips distinct no-TP and step identities on every lane while preserving old ids", () => {
    const old: Protect = { tp: 0.03, sl: 0.09, trail: 0.012, hold: 192 };
    assert.equal(configId("follow", IND, old), `follow|${IND}|tp3|sl9|tr1.2|h192`);
    const ids = new Set<string>();
    for (const tf of [1, 5, 15, 30])
      for (const step of [0.5, 1, 1.5]) {
        const ind = `sig-ema-cross-s@m${tf}`;
        const p = laneProtect({ ...only, trailStep: step }, ind);
        assert.equal(p.tp, 0, "lane target floor never invents a take-profit");
        const id = configId("follow", ind, p);
        assert.equal(kindOfId(id), "trailing-only");
        assert.equal(parseConfigId(id)?.protect.trailOnly, true);
        assert.equal(parseConfigId(id)?.protect.trailStep, step);
        assert.equal(configId("follow", ind, parseConfigId(id)!.protect), id);
        assert.equal(setKeyOf(id), `follow|${ind}|trailing-only`);
        assert.notEqual(id, configId("follow", ind, { ...p, trailOnly: false }));
        ids.add(id);
      }
    assert.equal(ids.size, 12);
    assert.equal(parseConfigId(`follow|${IND}|tp3|sl9|tr1.2|h192|to`), null);
    assert.equal(parseConfigId(`follow|${IND}|tp0|sl9|tr0|h192|to`), null);
    assert.equal(parseConfigId(`follow|${IND}|tp0|sl9|tr1.2|h192|to|ts0`), null);
  });

  it("keeps a removed held set's exact lane and step config for protection", () => {
    for (const tf of [1, 5, 15, 30]) {
      const ind = `sig-ema-cross-s@m${tf}`;
      const id = configId("follow", ind, laneProtect({ ...only, trailStep: 0.5 }, ind));
      const restored = heldSignalProtect(id);
      assert.ok(restored);
      assert.equal(configId("follow", ind, laneProtect(restored.protect, ind)), id);
      const pair = `follow|${ind}`;
      const current = signalProtects(
        signalSettings({
          trailingOnly: { enabled: false, sl: [0.03], trail: [0.01], trailStep: 1 },
        }),
      );
      const recovered = heldHistProtects([id, id], new Set([pair]), current);
      assert.equal(recovered[pair].length, 1);
      assert.equal(recovered[pair][0].trailOnly, true);
      assert.equal(recovered[pair][0].trailStep, 0.5);
    }
  });

  it("trails long and short only from a completed peak without applying the new stop inside that bar", () => {
    for (const side of [1, -1] as const) {
      const b = path(side);
      const sig = new Int8Array([side, 0, 0, 0]);
      const p = { ...only, sl: 0.1 };
      const result = simulate("only", b, sig, p, { cost: 0.002 });
      assert.equal(result.trades.length, 1);
      const close = result.trades[0];
      assert.equal(close.reason, "trail");
      assert.equal(close.exitT, b.t[3] + 15 * 60_000, "bar 2's new stop starts at bar 3");
      const peak = side === 1 ? 104 : 96;
      const stop = peak * (1 - side * 0.01);
      const fill = side === 1 ? Math.min(b.o[3], stop) : Math.max(b.o[3], stop);
      assert.ok(Math.abs(close.exit - fill) < 1e-9, "a gap fills at its worse opening price");
      assert.ok(Math.abs(close.r - ((side * (close.exit - 100)) / 100 - 0.002)) < 1e-12);
      const open = simulate("only", { ...b, n: 3 }, sig.slice(0, 3), p, { cost: 0.002 }).open!;
      assert.ok(open);
      assert.equal(open.target, 0);
      assert.equal(open.trailOnly, true);
      assert.equal(open.trailFree, false);
    }
  });

  it("retains a hard SL before arming and a time exit when no stop crosses", () => {
    const b = path(1);
    b.h.fill(100);
    b.l.fill(100);
    b.o.fill(100);
    b.c.fill(100);
    const sig = new Int8Array([1, 0, 0, 0]);
    const timed = simulate("only", b, sig, { ...only, trail: 0.02, hold: 2 }, { cost: 0.002 })
      .trades[0];
    assert.equal(timed.reason, "time");
    assert.equal(timed.r, -0.002);
    b.l[1] = 95;
    const stopped = simulate("only", b, sig, only, { cost: 0.002 }).trades[0];
    assert.equal(stopped.reason, "sl");
    assert.equal(stopped.exit, 97);
  });

  it("keeps peak/stop ratchets over ticks and computes; own target mode overrides the global switch", () => {
    for (const side of [1, -1] as const) {
      const p = {
        side,
        entry: 100,
        stop: 100 - side * 5,
        peak: 100,
        trailOn: false,
        trail: 0.01,
        trailDist: 0.01,
      };
      const tf = 15 * 60_000;
      tickTrail(p, 100 + side * 3, 1, tf);
      assert.equal(tickTrail(p, 100 + side * 2, tf + 1, tf), true);
      const stop = p.stop;
      tickTrail(p, 100 + side, 2 * tf + 1, tf);
      assert.equal(p.stop, stop);
      const carried = carryTrail({ ...p, stop: 100 - side * 5, peak: 100, trailOn: false }, p);
      assert.equal(carried.stop, stop);
      assert.equal(carried.trailOn, true);
      assert.equal(
        crossedExit(
          { side, stop: 100 - side * 5, target: 100 + side, trailOn: true, trailFree: false },
          100 + side * 2,
          true,
        ),
        100 + side,
      );
      assert.equal(
        crossedExit(
          { side, stop: 100 - side * 5, target: 100 + side, trailOnly: true },
          100 + side * 2,
        ),
        0,
      );
    }
  });

  it("pending entries carry no target and their own trailing flags on both directions", () => {
    for (const side of [1, -1] as const) {
      const tp = tape("trailing-only", []);
      tp.pending.push({ sym: SYM, side });
      const [p] = pendingAsOpen(tp, 15 * 60_000, 1, () => 100, 0.002);
      assert.equal(p.target, 0);
      assert.equal(p.stop, 100 * (1 - side * 0.02), "Signal SL is capped before the first entry");
      assert.equal(p.trailOnly, true);
      assert.equal(p.trailFree, false);
    }
  });

  it("restores no-TP protection from durable config identity even when an older book omitted mode flags", () => {
    const db = new CoreDb(":memory:");
    db.kvSet("paperBook", {
      positions: [
        {
          cfg: configId("follow", IND, { ...only, trailStep: 0.5 }),
          sym: SYM,
          side: 1,
          entry: 100,
          stop: 101,
          peak: 103,
          trailOn: true,
          target: 110,
          entryT: 1,
          entryI: 0,
          mtm: 0,
        },
      ],
      selected: [],
      startedAt: 1,
    });
    const rt = new Runtime(db, {}, { market: "synthetic" });
    try {
      const [p] = rt.paper.positions;
      assert.equal(p.target, 0);
      assert.equal(p.trailOnly, true);
      assert.equal(p.trailFree, false);
      assert.equal(p.trail, 0.01);
      assert.equal(p.trailDist, 0.005);
      assert.equal(p.stop, 101);
      assert.equal(p.peak, 103);
      assert.equal(p.trailOn, true);
    } finally {
      rt.stop();
      db.db.close();
    }
  });

  it("winning capped sets cannot qualify losing Trailing only acceptance, active ranking or live lanes", () => {
    const capped = tape("trailing", Array(6).fill(0.02));
    const losing = tape("trailing-only", Array(6).fill(-0.01));
    const sig = signalSettings({
      count: 0,
      minTrades: 4,
      rank: "drawdown",
      minBlockShare: 0,
      validate: false,
    });
    const active = activeSignalsAt([capped, losing], NOW, sig, 48);
    assert.deepEqual([...active], [sigActiveKey("follow", IND, SYM, 1, "trailing", capped.id)]);
    const guard = new SignalGuard();
    guard.acceptIndex = new SignalAcceptIndex([capped, losing]);
    const accept = { enabled: true, minPf: 1.1, hours: 48, minTrades: 4 };
    assert.equal(guard.accepts(acceptKey(IND, SYM, 1, "trailing", capped.id), NOW, accept), true);
    assert.equal(guard.accepts(acceptKey(IND, SYM, 1, "trailing-only", losing.id), NOW, accept), false);
    assert.notEqual(
      guardKey(capped.id, SYM, 1, "trailing"),
      guardKey(losing.id, SYM, 1, "trailing-only"),
    );
    const filter = liveLaneFilter({ source: "signals" }, new Set(), active);
    assert.equal(filter.validLane({ cfg: capped.id, sym: SYM, side: 1, vol: 1 }), true);
    assert.equal(filter.validLane({ cfg: losing.id, sym: SYM, side: 1, vol: 1 }), false);
    const withoutEngineSelection = liveLaneFilter({ source: "signals" }, null, active);
    assert.equal(withoutEngineSelection.validLane({ cfg: capped.id, sym: SYM, side: 1, vol: 1 }), true);
    assert.equal(withoutEngineSelection.validLane({ cfg: losing.id, sym: SYM, side: 1, vol: 1 }), false,
      "absence of engine selections cannot waive a Signal config's own activation");
  });

  it("a winning sibling range never bypasses another config's own return-PF gate", () => {
    const winning = tape("trailing-only", Array(30).fill(0.03));
    const losing = tape("trailing-only", Array(30).fill(-0.01), IND, { ...only, sl: 0.06 });
    const at = NOW + 30 * H; // all thirty own closes precede the independent Base check
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const options = {
      ...base,
      signalActive: new Set([winning, losing].map((tp) => sigActiveKey("follow", IND, SYM, 1, "trailing-only", tp.id))),
      lastN: 4,
      validLastN: 4,
      signalValidLastN: 4,
      signalGuardN: 0,
      signalCluster: undefined,
      signalAccept: undefined,
      signalSideAccept: undefined,
      signalOwnBase: true,
      symGate: undefined,
    };
    assert.equal(execDecision(winning, at, options, { sym: SYM, side: 1 }).ok, true);
    const decision = execDecision(losing, at, options, { sym: SYM, side: 1 });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.why, "signalValid");
    winning.heldOnly = true;
    assert.deepEqual(execDecision(winning, at, options, { sym: SYM, side: 1 }), {
      ok: false,
      why: "heldOnly",
    });
    assert.equal(
      tapeExecutable(losing, { ...options, toggles: { ...options.toggles, trailing: false } }),
      false,
    );
  });

  it("a no-TP lane cancels an aggregate target while capped siblings keep their own exact target", () => {
    const capped = tape("trailing", []);
    const unbounded = tape("trailing-only", []);
    const basePosition = {
      sym: SYM,
      side: 1 as const,
      entry: 100,
      entryT: 1,
      entryI: 0,
      peak: 101,
      trailOn: false,
      stop: 95,
      mtm: 0,
      trail: 0.01,
      trailDist: 0.01,
    };
    const positions = [
      { ...basePosition, cfg: capped.id, target: 103, trailOn: true, trailFree: false },
      { ...basePosition, cfg: unbounded.id, target: 0, trailOnly: true, trailFree: false },
    ];
    const rt = {
      settings: { ...DEFAULT_SETTINGS, grid: { ...DEFAULT_SETTINGS.grid, trailFree: true } },
      paper: { positions },
    } as unknown as CoreRuntime;
    const lanes = laneContributions(rt, new Map([[SYM, 100]]));
    assert.equal(lanes[0].tgt, 103);
    assert.equal(lanes[1].tgt, undefined);
    assert.ok(lanes.every((l) => l.stopPx === 98), "venue contributions respect the entry-based cap");
    assert.ok(positions.every((p) => p.stop === 95), "reporting does not mutate the source positions");
    const result = controlTargets(lanes, new Map([[SYM, 100]]), {
      notionalUsd: 10,
      ratio: 1,
      maxNotionalUsd: 100,
      rebalancePct: 0.1,
      maxPositions: 0,
    });
    assert.equal(result.targets.length, 1);
    assert.equal(result.targets[0].tpPx, undefined);
  });

  it("parallel workers, serialized tapes and Base cells preserve every no-TP range and held-only flag", async () => {
    const bars = [
      barsFromCandles(SYM, 15, syntheticCandles(SYM, 15, 1800, Date.UTC(2026, 9, 1), 3)),
    ];
    const u = makeUniverse(bars);
    const pairs = [`follow|${IND}`, "follow|sig-ema-cross-m@m15"];
    const protects = signalProtects(signalSettings({ trailRatios: [1] })).filter((p) => p.trailOnly);
    const heldId = configId("follow", IND, protects[0]);
    const floors = {
      minSl: 0,
      minTrail: 0,
      heldIds: new Set([heldId]),
      heldOnlyIds: new Set([heldId]),
    };
    const adjust = {
      [setKeyOf(heldId)]: {
        set: setKeyOf(heldId),
        level: 1,
        minSl: 0.005,
        minTrail: 0.005,
        pausedUntil: 0,
        pf: 0.8,
        n: 10,
        lastExitT: 1,
        at: 1,
        note: "test",
        slMult: 2,
        trailMult: 2,
      },
    };
    const local = buildTapes(u, protects, 0.002, undefined, new Set(pairs), null, adjust, floors);
    assert.equal(local.length, 10, "18 raw cells deduplicate at the configured 3% cap, including the exact held id");
    assert.equal(new Set(local.map((tp) => tp.id)).size, local.length);
    assert.ok(
      local.every(
        (tp) => tp.kind === "trailing-only" && tp.protect.trailOnly && tp.protect.tp === 0,
      ),
    );
    assert.equal(local.filter((tp) => tp.heldOnly).length, 1);
    assert.equal(
      local.find((tp) => tp.id === heldId)?.protect.sl,
      protects[0].sl,
      "held distances are never adjusted a second time",
    );
    assert.ok(local.some((tp) => tp.n > 0));
    const floorsOf = floorsForPairs(floors);
    try {
      const remote = (
        await runOnWorkers<{ tapes: ConfigTape[] }>(
          pairs.map((pair) => ({
            type: "tapes",
            bars,
            pairs: [pair],
            protects,
            cost: 0.002,
            dcaOpt: null,
            tactics: null,
            adjust,
            floors: floorsOf([pair]),
          })),
          2,
        )
      ).flatMap((part) => part.tapes);
      const stored = unpackTapes(packTapes(remote));
      for (const actual of [remote, stored]) {
        assert.deepEqual(
          actual.map((tp) => tp.id),
          local.map((tp) => tp.id),
        );
        actual.forEach((tp, i) => {
          assert.equal(tp.kind, local[i].kind);
          assert.deepEqual(tp.protect, local[i].protect);
          assert.deepEqual([...tp.r], [...local[i].r]);
          assert.deepEqual([...tp.exitT], [...local[i].exitT]);
          assert.deepEqual(tp.open, local[i].open);
          assert.deepEqual(tp.pending, local[i].pending);
          assert.equal(!!tp.heldOnly, !!local[i].heldOnly);
        });
      }
      const counter = new BaseConfigCounter({
        gates: { minPf: 1.1, minTrades: 2, maxDdr: 0 },
        cost: 0.002,
        cutT: u.nowT,
        fromT: u.startT,
      });
      buildTapes(u, protects, 0.002, undefined, new Set(pairs), null, adjust, {
        ...floors,
        countOnly: true,
        countKinds: ["trailing-only"],
        baseConfigCounter: counter,
      });
      assert.deepEqual(
        // Configured is the requested raw grid; evaluated is the distinct effective capped grid.
        counter.rows().map((row) => [row.kind, row.configured, row.evaluated]),
        [
          ["trailing-only", 9, 6],
          ["trailing-only", 9, 4],
        ],
      );
    } finally {
      closePool();
    }
  });
});
