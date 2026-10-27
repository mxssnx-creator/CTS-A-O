import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_RELATE_ADJUSTMENT, DEFAULT_SETTINGS } from "../config.ts";
import type { Protect, Side, StratKind } from "../domain/types.ts";
import { barsFromCandles } from "../market/bars.ts";
import { auditState } from "../audit.ts";
import { simulate } from "./backtest.ts";
import { RelateBook, relateFixedStopWithinLimit } from "./relate-volume.ts";
import { defaultWalkForward, execDecision, makeTape, walkForward } from "./walkforward.ts";

const H = 3_600_000;
const cfg = "follow|ema-9-21@m1|tp1|sl0.5|tr0|h4|mc";
const ind = "ema-9-21@m1";
const sources = { config: true, overall: false, symbol: false, direction: false,
  indication: false, strategy: false, coordination: false, range: false };
const protect: Protect = { tp: .01, sl: .005, trail: 0, hold: 4, tag: "mc" };

describe("Relate modeled maximum stop distance", () => {
  it("accepts fixed stops up to the boundary and does not infer unknown ladder or ATR stops", () => {
    for (const kind of ["normal", "trailing", "trailing-only", "exit"] as StratKind[]) {
      assert.equal(relateFixedStopWithinLimit(kind, { ...protect, sl: .0075 }, .0075), true, kind);
      assert.equal(relateFixedStopWithinLimit(kind, { ...protect, sl: .007501 }, .0075), false, kind);
    }
    for (const kind of ["dca", "dca-active", "axis"] as StratKind[])
      assert.equal(relateFixedStopWithinLimit(kind, protect, .0075), false, kind);
    assert.equal(relateFixedStopWithinLimit("normal", { ...protect, atr: { sl: 1, tpRatio: 1 } }, .0075), false);
    for (const sl of [0, -1, NaN, Infinity])
      assert.equal(relateFixedStopWithinLimit("normal", { ...protect, sl }, .0075), false);
    for (const cap of [0, .0024, .0151, NaN, Infinity])
      assert.equal(relateFixedStopWithinLimit("normal", protect, cap), false);
  });

  for (const side of [1, -1] as Side[]) for (const mode of ["shared", "additive"] as const)
    it(`uses real ${side === 1 ? "long" : "short"} bar exits with ${mode} sizing and keeps wider stops unraised`, () => {
      const startT = Date.UTC(2026, 9, 1);
      const barMs = H / 3;
      const rows = Array.from({ length: 76 * 3 + 1 }, (_, i) => {
        const isEntry = i % 3 === 1;
        const loss = Math.floor(i / 3) === 72;
        const favorable = isEntry && !loss ? 101.1 : 100.1;
        const adverse = isEntry && loss ? 98.9 : 99.9;
        return { t: startT + i * barMs, o: 100,
          h: side === 1 ? favorable : 200 - adverse,
          l: side === 1 ? adverse : 200 - favorable,
          c: 100, v: 1 };
      });
      const bars = barsFromCandles("AAA-USDT", 20, rows);
      const signals = Int8Array.from(rows, (_, i) => i % 3 === 0 ? side : 0);
      const defaults = defaultWalkForward(DEFAULT_SETTINGS);
      const relate = { ...DEFAULT_RELATE_ADJUSTMENT, enabled: true, auto: false, mode,
        ratio: .2, steps: 5, activeStep: 0, minTrades: 60, lastN: 250, sources };
      const options = { ...defaults, startT, simH: Math.ceil(rows.length / 3), lastN: 0, validLastN: 0,
        normalBaseMinPf: 0, preGate: false, robustFrac: 0, symGate: "off" as const, rangeGate: undefined,
        engineSideAccept: { ...defaults.engineSideAccept!, enabled: false },
        toggles: { ...defaults.toggles, normal: true, trailing: false, block: false,
          blockActive: false, dca: false, dcaActive: false, axis: false },
        coord: { enabled: false, hourLock: 0, cooldown: "off" as const, conflict: false, confirm: false },
        relate, cost: .0015 };
      const endT = rows.at(-1)!.t + barMs;
      const universe = { bars: [], caches: [], startT, endT, splitT: startT, nowT: endT, baseTf: 20 } as never;
      for (const sl of [.005, .01]) {
        const p = { ...protect, sl };
        const actual = simulate(cfg, bars, signals, p, { cost: .0015 });
        assert.equal(actual.trades.length, 76);
        const stopped = actual.trades.find((t) => t.reason === "sl");
        assert.ok(stopped);
        assert.ok(Math.abs(stopped.exit - 100 * (1 - side * sl)) < 1e-9);
        assert.ok(Math.abs(stopped.r - (-sl - .0015)) < 1e-9);
        const tape = makeTape(cfg, "follow", ind, p, "normal", ["AAA-USDT"], actual.trades, [], []);
        const bounded = walkForward(universe, [tape], options);
        const neutral = walkForward(universe, [tape], { ...options, relate: { ...relate, enabled: false } });
        assert.ok(bounded.trades.length >= 60, `admitted: ${bounded.trades.length}`);
        assert.deepEqual(bounded.trades.map((x) => [x.entryT, x.exitT, x.entry, x.exit, x.reason]),
          neutral.trades.map((x) => [x.entryT, x.exitT, x.entry, x.exit, x.reason]));
        assert.equal(bounded.trades.some((t) => (t.relateVol ?? 1) > 1), sl <= .0075);
        for (const t of bounded.trades) {
          const original = actual.trades.find((x) => x.entryT === t.entryT)!;
          assert.ok(Math.abs(t.r / (t.mult ?? 1) - original.r) < 1e-10);
        }
        const checks = auditState({ sim: bounded, tapes: [tape], cost: .0015 }).checks;
        assert.equal(checks.find((c) => c.name === "replay: every trade passes the Real rules with its recorded Block volume and level")?.ok, true);
      }
    });

  it("keeps Active, shadow progression, and accepted evidence independent of raise eligibility", () => {
    const variants: Array<{ kind: StratKind; protect: Protect; eligible: boolean }> = [
      { kind: "normal", protect: { ...protect, sl: .005 }, eligible: true },
      { kind: "normal", protect: { ...protect, sl: .01 }, eligible: false },
      { kind: "normal", protect: { ...protect, atr: { sl: 1, tpRatio: 1 } }, eligible: false },
      { kind: "trailing", protect: { ...protect, sl: .01 }, eligible: false },
      { kind: "trailing-only", protect: { ...protect, sl: .01 }, eligible: false },
      { kind: "exit", protect: { ...protect, sl: .01 }, eligible: false },
      { kind: "dca", protect, eligible: false },
      { kind: "dca-active", protect, eligible: false },
      { kind: "axis", protect, eligible: false },
    ];
    for (const side of [1, -1] as Side[]) for (const { kind, protect: p, eligible } of variants) {
      const label = `${kind}/${side}/${p.atr ? "ATR" : p.sl}`;
      const relate = { ...DEFAULT_RELATE_ADJUSTMENT, enabled: true, auto: false, activeStep: 2,
        ratio: .2, minTrades: 60, lastN: 250, sources };
      const book = new RelateBook(relate);
      const identity = { cfg, sym: "AAA-USDT", side, ind, strategy: kind,
        coordination: "ordinary", range: "mc" };
      const accepted = (r: number) => ({ ...identity, r, accepted: true, relateMeasured: true, relateBase: 1 });
      for (let i = 0; i < 59; i++) book.add(accepted(.01));
      book.add(accepted(-.01));
      // A different config and the opposing side do not change this config's own sample or Active state.
      book.add({ ...accepted(.5), cfg: `${cfg}-sibling` });
      book.add({ ...accepted(.5), side: -side });
      assert.equal(book.decide(identity).stats.config?.n, 60, label);
      const defaults = defaultWalkForward(DEFAULT_SETTINGS);
      const options = { ...defaults, lastN: 0, validLastN: 0, normalBaseMinPf: 0,
        basePassed: undefined, rangeOpts: undefined, probe: { perRange: 0, perCell: 1 }, relate,
        toggles: { ...defaults.toggles, normal: true, trailing: true, block: false, blockActive: false,
          dca: true, dcaActive: kind === "dca-active", axis: true, exit: true },
        coord: { enabled: false, hourLock: 0, cooldown: "off" as const, conflict: false, confirm: false } };
      const tp = makeTape(cfg, "follow", ind, p, kind, [identity.sym], [], [], []);
      const at = () => execDecision(tp, 100 * H, options, { sym: identity.sym, side, relate: book });
      for (let i = 0; i < 2; i++) {
        const skipped = at();
        assert.equal(skipped.ok, false, label);
        if (skipped.ok) throw new Error("unexpected admitted entry");
        assert.equal(skipped.why, "relateActive", label);
        assert.equal(skipped.relateParts?.config?.shadow, true, label);
        book.advanceShadow({ ...identity, r: .01, accepted: false, relateMeasured: true,
          relateBase: skipped.relateBase, relateParts: skipped.relateParts });
        assert.equal(book.decide(identity).stats.config?.n, 60, `${label}: shadows excluded from accepted PF`);
      }
      const allowed = at();
      assert.equal(allowed.ok, true, label);
      if (!allowed.ok) throw new Error("unexpected rejection");
      assert.equal(allowed.relateVol ?? 1, eligible ? 1.44 : 1, `${label}: raise eligibility`);
      if (!eligible) {
        assert.equal(allowed.relateParts, undefined, `${label}: no simulated raise recorded as funded`);
        book.add(accepted(.01));
        assert.equal(book.decide(identity).stats.config?.n, 61, `${label}: actual neutral close counted once`);
        const next = at();
        assert.equal(next.ok, false, `${label}: neutral prior close has no raised Active step`);
      }
      assert.equal(book.summary().shadowCloses, 2, label);
    }
  });

  it("treats the cap as a stop trigger distance, not a guaranteed loss when price gaps", () => {
    const bars = barsFromCandles("AAA-USDT", 60, [
      { t: 0, o: 100, h: 100, l: 100, c: 100, v: 1 },
      { t: H, o: 100, h: 100.1, l: 99.9, c: 100, v: 1 },
      { t: 2 * H, o: 98, h: 98.2, l: 97.9, c: 98, v: 1 },
    ]);
    const result = simulate(cfg, bars, Int8Array.from([1, 0, 0]), protect, { cost: .0015 });
    assert.equal(result.trades[0].exit, 98);
    assert.ok(result.trades[0].r < -.0075);
  });
});
