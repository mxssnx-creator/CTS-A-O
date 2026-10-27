import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RELATE_ADJUSTMENT, DEFAULT_SETTINGS } from "../config.ts";
import { auditState } from "../audit.ts";
import { checkMerged, checkSettings } from "../settings-check.ts";
import { capRelateParts, RelateBook, relateExternalStackCap, relateStats, type RelateBookEntry } from "./relate-volume.ts";
import { defaultWalkForward, feedBooks, makeTape, relateBookFor, walkForward } from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";

const identity = {
  cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc",
  sym: "AAA-USDT",
  side: 1,
  ind: "ema-9-21@m1",
  strategy: "normal",
  coordination: "ordinary",
  range: "mc",
};

function bookEntry(r: number, overrides: Partial<RelateBookEntry> = {}): RelateBookEntry {
  return { ...identity, r, accepted: true, relateMeasured: true, relateBase: 1, ...overrides };
}

function config(overrides: Partial<typeof DEFAULT_RELATE_ADJUSTMENT> = {}) {
  return {
    ...DEFAULT_RELATE_ADJUSTMENT,
    enabled: true,
    auto: false,
    sources: { config: true, overall: false, symbol: false, direction: false, indication: false,
      strategy: false, coordination: false, range: false },
    ...overrides,
  };
}

describe("Relate settled-order sizing", () => {
  it("reserves the maximum possible ladder weight before an entry, without knowing its later fills", () => {
    const plain = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
    const dca = { ...plain, dca: { levels: 2, step: 0.01, addRatio: 2.5 } };
    for (const cap of [1, 2, 250]) {
      assert.equal(relateExternalStackCap(cap, "normal", plain), cap);
      assert.equal(relateExternalStackCap(cap, "dca-active", dca), cap);
      assert.equal(relateExternalStackCap(cap, "dca", dca), cap / 6);
      assert.equal(relateExternalStackCap(cap, "dca", plain), cap / 11,
        "legacy ladders reserve the maximum supported DCA weight");
      assert.equal(relateExternalStackCap(cap, "axis", plain), cap / 36,
        "Axis reserves the maximum weight allowed by Settings");
      for (const weight of [1, 3.5, 6])
        assert.ok(relateExternalStackCap(cap, "dca", dca) * weight <= cap + 1e-12);
      for (const weight of [1, 6, 36])
        assert.ok(relateExternalStackCap(cap, "axis", plain) * weight <= cap + 1e-12);
    }
    assert.deepEqual(capRelateParts({ config: { volume: 2, level: 1 } }, 0.5, 0.5, 1),
      { config: { volume: 0.5, level: 1 } }, "a reserved ceiling may be smaller than one base unit");
    assert.deepEqual(capRelateParts({ config: { volume: 2, level: 1, shadow: true } }, 0.5, 0.5, 1),
      { config: { volume: 0.5, level: 1, shadow: true } });
    const decimal = { ...plain, dca: { levels: 2, step: 0.01, addRatio: 2.2 } };
    assert.ok(Math.fround(5.4) > 5.4, "the stored tape weight rounds up in this case");
    assert.ok(relateExternalStackCap(2, "dca", decimal) * Math.fround(5.4) <= 2,
      "upward tape rounding cannot exceed the configured limit");
    assert.throws(() => checkSettings({ axis: { ...DEFAULT_SETTINGS.axis, levels: 9 } }));
    assert.throws(() => checkSettings({ axis: { ...DEFAULT_SETTINGS.axis, ratio: 5.1 } }));
  });
  it("ships disabled with the requested Auto, PF, sample, ratio, step, and stack defaults", () => {
    assert.deepEqual(
      {
        enabled: DEFAULT_RELATE_ADJUSTMENT.enabled,
        auto: DEFAULT_RELATE_ADJUSTMENT.auto,
        mode: DEFAULT_RELATE_ADJUSTMENT.mode,
        ratio: DEFAULT_RELATE_ADJUSTMENT.ratio,
        steps: DEFAULT_RELATE_ADJUSTMENT.steps,
        activeStep: DEFAULT_RELATE_ADJUSTMENT.activeStep,
        minPf: DEFAULT_RELATE_ADJUSTMENT.minPf,
        lastN: DEFAULT_RELATE_ADJUSTMENT.lastN,
        minTrades: DEFAULT_RELATE_ADJUSTMENT.minTrades,
        maxStack: DEFAULT_RELATE_ADJUSTMENT.maxStack,
      },
      { enabled: false, auto: true, mode: "additive", ratio: 2.6, steps: 5, activeStep: 0,
        minPf: 1.5, lastN: 250, minTrades: 60, maxStack: 250 },
    );
    assert.doesNotThrow(() => checkSettings({ relate: DEFAULT_RELATE_ADJUSTMENT }));
  });

  it("validates the ratio grid, step bounds, sample floor, PF, sources, and nested settings patches", () => {
    for (const ratio of [0.1, 0.3, 6.2, Number.NaN, Infinity])
      assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, ratio } }));
    for (const steps of [1, 16, 2.5])
      assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, steps } }));
    for (const activeStep of [-1, 7, 1.5])
      assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, activeStep } }));
    assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, steps: 2, activeStep: 3 } }));
    assert.throws(() => checkMerged({ ...DEFAULT_SETTINGS, relate: { ...DEFAULT_RELATE_ADJUSTMENT, activeStep: 3 } },
      { relate: { steps: 2 } as never }));
    assert.doesNotThrow(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, steps: 6, activeStep: 6 } }));
    assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, lastN: 59 } }));
    assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, minTrades: 59 } }));
    assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, minTrades: 251 } }));
    assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, minPf: -0.1 } }));
    assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, maxStack: 1.5 } }));
    assert.throws(() => checkSettings({ relate: { ...DEFAULT_RELATE_ADJUSTMENT, sources: { unknown: true } as never } }));
    assert.doesNotThrow(() => checkMerged(DEFAULT_SETTINGS, {
      relate: { ...DEFAULT_RELATE_ADJUSTMENT, sources: { ...DEFAULT_RELATE_ADJUSTMENT.sources, range: false } },
    }));
  });

  it("retains unknown accepted closes and excludes rejected or unproven entries", () => {
    const b = new RelateBook(config());
    b.add(bookEntry(0.02, { accepted: false }));
    b.add(bookEntry(0.02, { accepted: undefined }));
    assert.deepEqual(b.summary(), { relations: 0, qualified: 0, closes: 0, maxSample: 0, shadowCloses: 0 });
    b.add(bookEntry(Number.NaN));
    assert.deepEqual(b.summary(), { relations: 1, qualified: 0, closes: 1, maxSample: 1, shadowCloses: 0 });
    assert.equal(b.decide(identity).stats.config?.unknown, 1);
    assert.ok(Number.isNaN(b.decide(identity).stats.config?.pf));
  });

  it("does not replace an unknown recent accepted close with an older win", () => {
    for (const auto of [false, true]) {
      const b = new RelateBook(config({ auto, ratio: 0.2, steps: 5, lastN: 60, minTrades: 60 }));
      for (let i = 0; i < 60; i++) b.add(bookEntry(0.01));
      assert.ok(b.decide(identity).volume > 1);
      b.add(bookEntry(Number.NaN));
      assert.equal(b.decide(identity).stats.config?.n, 60);
      assert.equal(b.decide(identity).stats.config?.unknown, 1);
      assert.equal(b.decide(identity).volume, 1);
      for (let i = 0; i < 59; i++) b.add(bookEntry(0.01));
      assert.equal(b.decide(identity).volume, 1, "the unknown close remains within the last 60");
      b.add(bookEntry(0.01));
      assert.equal(b.decide(identity).stats.config?.unknown, 0);
      assert.ok(b.decide(identity).volume > 1, "qualification recovers only when the unknown expires");
    }
  });

  it("cannot qualify overflowed positive or negative return totals", () => {
    for (const r of [Number.MAX_VALUE, -Number.MAX_VALUE]) {
      const b = new RelateBook(config());
      for (let i = 0; i < 60; i++) b.add(bookEntry(r));
      assert.ok(Number.isNaN(b.decide(identity).stats.config?.pf));
      assert.equal(b.decide(identity).volume, 1);
    }
  });

  it("uses the last-N sample and compounds each step from the preceding recorded volume", () => {
    const b = new RelateBook(config({ ratio: 0.2, steps: 5, minPf: 1.5, lastN: 250, minTrades: 60 }));
    for (let i = 0; i < 59; i++) b.add(bookEntry(0.01));
    assert.equal(b.decide(identity).volume, 1, "59 results cannot size the next order");
    b.add(bookEntry(0.01));
    let d = b.decide(identity);
    assert.equal(d.volume, 1.2, "the first qualified step adds 20% of the last base volume");
    for (const expected of [1.44, 1.728, 2.0736, 2.48832]) {
      b.add(bookEntry(0.01, { relateParts: d.parts }));
      d = b.decide(identity);
      assert.equal(d.volume, expected);
    }
    b.add(bookEntry(0.01, { relateParts: d.parts }));
    assert.equal(b.decide(identity).volume, 2.48832, "the fifth step is the configured maximum");
    b.add(bookEntry(-0.01, { relateParts: d.parts }));
    assert.equal(b.decide(identity).level, 0, "a loss resets only this relation's positive run");
    assert.equal(b.decide(identity).volume, 1);
  });

  it("does not qualify a relation below its PF floor", () => {
    const b = new RelateBook(config({ ratio: 2.6, steps: 5, minPf: 1.5, minTrades: 60 }));
    for (let i = 0; i < 59; i++) b.add(bookEntry(0.001));
    b.add(bookEntry(-0.04));
    assert.equal(relateStats(Array(59).fill(0.001).concat(-0.04)).pf < 1.5, true);
    assert.equal(b.decide(identity).volume, 1);
  });

  it("applies Active as a skip gate and permits the entry after its relation reaches the selected step", () => {
    const b = new RelateBook(config({ ratio: 0.2, steps: 5, activeStep: 2, minTrades: 60 }));
    assert.equal(b.decide(identity).allowed, true, "base entries bootstrap an insufficient sample");
    for (let i = 0; i < 59; i++) b.add(bookEntry(0.01));
    b.add(bookEntry(-0.01)); // qualified PF, but the current win streak is below Active 2
    const zero = b.decide(identity);
    assert.equal(zero.allowed, false);
    b.advanceShadow(bookEntry(0.01, { accepted: false, relateParts: zero.parts }));
    const one = b.decide(identity);
    assert.equal(one.allowed, false);
    assert.equal(one.parts.config?.shadow, true);
    b.advanceShadow(bookEntry(0.01, { accepted: false, relateParts: one.parts }));
    const d = b.decide(identity);
    assert.equal(d.allowed, true);
    assert.equal(d.volume, 1.44);
    assert.equal(b.summary().closes, 60, "shadow closes never enter accepted PF evidence");
    assert.equal(b.summary().shadowCloses, 2);
    assert.equal(b.decide(identity).stats.config?.n, 60);
  });

  it("combines independent relation levels in Shared or Additive mode and caps the total stack", () => {
    const decimal = new RelateBook(config({ ratio: 0.2, steps: 8, minTrades: 60 }));
    for (let i = 0; i < 60; i++) decimal.add(bookEntry(0.01));
    let decimalDecision = decimal.decide(identity);
    for (let i = 1; i < 8; i++) {
      decimal.add(bookEntry(0.01, { relateParts: decimalDecision.parts }));
      decimalDecision = decimal.decide(identity);
    }
    assert.equal(decimalDecision.volume, 4.29981696, "eight 20% increments compound from the prior recorded portion");

    const both = { ...config({ ratio: 0.2, steps: 5 }), sources: { ...config().sources, config: true, overall: true } };
    const b = new RelateBook(both);
    for (let i = 0; i < 60; i++) b.add(bookEntry(0.01));
    let additive = b.decide(identity);
    for (let i = 1; i < 5; i++) {
      b.add(bookEntry(0.01, { relateParts: additive.parts }));
      additive = b.decide(identity);
    }
    assert.equal(additive.volume, 3.97664, "each relation compounds independently before additions are summed");
    const shared = new RelateBook({ ...both, mode: "shared" });
    for (let i = 0; i < 60; i++) shared.add(bookEntry(0.01));
    let sharedDecision = shared.decide(identity);
    assert.equal(sharedDecision.volume, 1.2, "two 0.2 additions average to 0.2");
    assert.equal(sharedDecision.parts.config?.volume, 1.1);
    assert.equal(sharedDecision.parts.overall?.volume, 1.1);
    for (let i = 1; i < 5; i++) {
      shared.add(bookEntry(0.01, { relateParts: sharedDecision.parts }));
      sharedDecision = shared.decide(identity);
    }
    assert.equal(sharedDecision.volume, 1.46112, "Shared compounds each actual share and averages both additions");
    assert.equal(sharedDecision.parts.config?.volume, 1.23056);
    assert.equal(sharedDecision.parts.overall?.volume, 1.23056);
    const capped = new RelateBook({ ...both, maxStack: 3 });
    for (let i = 0; i < 60; i++) capped.add(bookEntry(0.01));
    let capDecision = capped.decide(identity);
    for (let i = 1; i < 5; i++) {
      capped.add(bookEntry(0.01, { relateParts: capDecision.parts }));
      capDecision = capped.decide(identity);
    }
    assert.equal(capDecision.volume, 3);
    assert.ok(Object.values(capDecision.parts).reduce((n, part) => n + part!.volume - 1, 1) <= 3 + 1e-12);
  });

  it("uses the last settled entry's recorded volume and refuses missing sizing provenance", () => {
    const b = new RelateBook(config({ ratio: 0.2, steps: 5, minTrades: 60 }));
    for (let i = 0; i < 60; i++) b.add(bookEntry(0.01));
    const first = b.decide(identity);
    const overlapping = b.decide(identity);
    b.add(bookEntry(0.01, { relateParts: first.parts }));
    assert.equal(b.decide(identity).volume, 1.44);
    b.add(bookEntry(0.01, { relateParts: overlapping.parts }));
    assert.equal(b.decide(identity).volume, 1.44, "an overlapping 1.2× entry cannot invent a 1.44× prior entry");
    b.add(bookEntry(0.01, { relateMeasured: undefined }));
    assert.equal(b.decide(identity).volume, 1, "unknown previous sizing does not become a guessed multiplier");
    b.add(bookEntry(0.01));
    assert.equal(b.decide(identity).volume, 1.2, "a later explicitly neutral entry restores sizing provenance");
  });

  it("continues each relation from the portion actually left after an external stack cap", () => {
    const b = new RelateBook({ ...config({ ratio: 0.2, steps: 5 }), sources: {
      ...config().sources, config: true, overall: true,
    } });
    for (let i = 0; i < 60; i++) b.add(bookEntry(0.01));
    const requested = b.decide(identity);
    assert.equal(requested.volume, 1.4);
    const actualParts = capRelateParts(requested.parts, 1.1);
    assert.ok(Object.values(actualParts).reduce((sum, part) => sum + part!.volume - 1, 1) <= 1.1 + 1e-12);
    b.add(bookEntry(0.01, { relateParts: actualParts }));
    assert.equal(b.decide(identity).volume, 1.52, "each 1.05× portion advances to 1.26×");
  });

  it("uses the previous effective volume when Block or range sizing changes the next base", () => {
    const b = new RelateBook(config({ ratio: 0.2, steps: 5 }));
    for (let i = 0; i < 60; i++) b.add(bookEntry(0.01, { relateBase: 3 }));
    const first = b.decide(identity, 3);
    assert.equal(first.volume, 1.2);
    assert.equal(first.parts.config?.volume, 3.6);
    b.add(bookEntry(0.01, { relateBase: 3, relateParts: first.parts }));
    const smallerBase = b.decide(identity, 2);
    assert.equal(smallerBase.volume, 2.16, "3.6 original-base units grow by 20% to 4.32");
    assert.equal(smallerBase.parts.config?.volume, 4.32);
    const largerBase = b.decide(identity, 5);
    assert.equal(largerBase.volume, 1, "a larger current base is not reduced by a smaller prior target");
    assert.equal(largerBase.parts.config?.volume, 5);
    assert.equal(b.decide(identity, Number.NaN).allowed, false);
  });

  it("keeps config, symbol, direction, strategy, coordination, and range histories independent", () => {
    const b = new RelateBook({ ...config({ minTrades: 60 }), sources: {
      config: true, overall: true, symbol: true, direction: true, indication: true,
      strategy: true, coordination: true, range: true,
    } });
    for (let i = 0; i < 60; i++) b.add(bookEntry(0.01));
    const sibling = b.decide({ ...identity, cfg: "other|different-ind@m5|tp1|sl1|tr0|h32|mn",
      sym: "BBB-USDT", ind: "different-ind@m5", strategy: "trailing", coordination: "coordinated", range: "mn" });
    assert.equal(sibling.stats.config?.n, 0);
    assert.equal(sibling.stats.symbol?.n, 0);
    assert.equal(sibling.stats.overall?.n, 60, "Overall deliberately pools every relation identity");
    assert.equal(sibling.stats.direction?.n, 60, "the direction relation pools only same-side accepted orders");
    assert.equal(sibling.stats.indication?.n, 0);
    assert.equal(sibling.stats.strategy?.n, 0);
    assert.equal(sibling.stats.coordination?.n, 0);
    assert.equal(sibling.stats.range?.n, 0, "Micro histories stay distinct from Minimal");
    const minimal = b.decide({ ...identity, range: "mn" });
    assert.equal(minimal.stats.range?.n, 0);
    assert.equal(minimal.stats.config?.n, 60, "range changes do not rewrite exact config identity");
    const otherSide = b.decide({ ...identity, side: -1 });
    assert.equal(otherSide.stats.direction?.n, 0, "long and short direction histories remain separate");
    assert.equal(otherSide.stats.overall?.n, 60, "Overall remains direction agnostic");
  });

  it("auto-evaluates the configured grid, holds the min-PF/sample gates, and reports its selected values", () => {
    const b = new RelateBook({ ...config({ auto: true, minTrades: 60 }), sources: {
      config: true, overall: false, symbol: false, direction: false, indication: false,
      strategy: false, coordination: false, range: false,
    } });
    for (let i = 0; i < 60; i++) b.add(bookEntry(0.01));
    const d = b.decide(identity);
    const choice = d.choices.config;
    assert.ok(choice);
    assert.ok(choice.ratio >= 0.2 && choice.ratio <= 6 && Math.abs(choice.ratio * 5 - Math.round(choice.ratio * 5)) < 1e-8);
    assert.ok(choice.steps >= 2 && choice.steps <= 15);
    assert.ok(choice.activeStep >= 0 && choice.activeStep <= 6);
    assert.ok(choice.pf >= 1.5);
    assert.ok(choice.n >= 60);
    assert.equal(d.volume, 1 + choice.ratio, "the previous measured entry was neutral");
    const sparse = new RelateBook({ ...config({ auto: true }), sources: { ...config().sources, config: true } });
    for (let i = 0; i < 59; i++) sparse.add(bookEntry(0.01));
    assert.equal(sparse.decide(identity).choices.config, undefined);
    assert.equal(sparse.decide(identity).volume, 1);
  });

  it("judges Auto on unit-return PF and labels hypothetical size-weighted PF separately", () => {
    const b = new RelateBook(config({ auto: true, minPf: 5.5, minTrades: 60 }));
    for (let i = 0; i < 80; i++) b.add(bookEntry(i % 4 === 3 ? -0.01 : 0.02));
    const choice = b.decide(identity).choices.config;
    assert.ok(choice, "the 6.0 unit-return PF passes a 5.5 threshold");
    assert.equal(choice.n, 80);
    assert.equal(choice.activeStep, 0);
    assert.ok(Math.abs(choice.pf - 6) < 1e-12, "PF uses equal unit returns");
    assert.ok(choice.sizedPf < 5.5, "size-weighted PF is a separate hypothetical diagnostic");
  });

  it("auto-scoring respects a low Max stack while evaluating compounded ladders", () => {
    const b = new RelateBook({ ...config({ auto: true, maxStack: 5, minTrades: 60 }), sources: {
      config: true, overall: false, symbol: false, direction: false, indication: false,
      strategy: false, coordination: false, range: false,
    } });
    for (let i = 0; i < 60; i++) b.add(bookEntry(0.01));
    const d = b.decide(identity);
    assert.ok(d.choices.config, "a qualified low-cap auto candidate is selected");
    assert.ok(d.volume >= 1 && d.volume <= 5, "the nonlinear cap path never exceeds Max stack");
  });

  it("matches an independent per-order Auto grid replay for steps, ratios, Active and caps", () => {
    const rows = Array.from({ length: 120 }, (_, i) => i % 6 < 2 ? -0.125 : 0.125);
    for (const maxStack of [2, 5, 250]) {
      const settings = config({ auto: true, minTrades: 60, minPf: 1.5, maxStack, steps: 5 });
      const b = new RelateBook(settings);
      for (const r of rows) b.add(bookEntry(r));
      const actual = b.decide(identity).choices.config;
      assert.ok(actual);
      let best: { ratio: number; steps: number; activeStep: number; pf: number; sizedPf: number;
        positiveRate: number; n: number } | undefined;
      for (let q = 1; q <= 30; q++) for (let steps = 2; steps <= 15; steps++)
        for (let activeStep = 0; activeStep <= 6; activeStep++) {
          let run = 0, gp = 0, gl = 0, sizedGp = 0, sizedGl = 0, wins = 0, n = 0;
          const ratio = q / 5;
          for (const r of rows) {
            const level = Math.min(run, steps);
            if (level >= activeStep) {
              let volume = 1;
              for (let j = 0; j < level; j++) volume = Math.min(maxStack, volume * (1 + ratio));
              n++;
              if (r > 0) { wins++; gp += r; sizedGp += r * volume; }
              else if (r < 0) { gl -= r; sizedGl -= r * volume; }
            }
            run = r > 0 ? Math.min(15, run + 1) : 0;
          }
          if (n < settings.minTrades || gp <= gl) continue;
          const pf = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0;
          if (pf < settings.minPf) continue;
          const candidate = { ratio, steps, activeStep, pf, sizedPf: sizedGl > 0 ? sizedGp / sizedGl : Infinity,
            positiveRate: wins / n, n };
          const distance = Math.abs(steps - settings.steps);
          const bestDistance = best ? Math.abs(best.steps - settings.steps) : Infinity;
          if (!best || pf > best.pf || (pf === best.pf && candidate.positiveRate > best.positiveRate) ||
              (pf === best.pf && candidate.positiveRate === best.positiveRate && ratio < best.ratio) ||
              (pf === best.pf && candidate.positiveRate === best.positiveRate && ratio === best.ratio && distance < bestDistance) ||
              (pf === best.pf && candidate.positiveRate === best.positiveRate && ratio === best.ratio && distance === bestDistance && steps < best.steps) ||
              (pf === best.pf && candidate.positiveRate === best.positiveRate && ratio === best.ratio && steps === best.steps && activeStep < best.activeStep))
            best = candidate;
        }
      assert.ok(best);
      assert.deepEqual({ ratio: actual.ratio, steps: actual.steps, activeStep: actual.activeStep, n: actual.n },
        { ratio: best.ratio, steps: best.steps, activeStep: best.activeStep, n: best.n });
      assert.ok(Math.abs(actual.pf - best.pf) < 1e-12);
      assert.ok(Math.abs(actual.sizedPf - best.sizedPf) < 1e-12);
    }
  });

  it("walk-forward applies Relate after Block using only accepted settled orders and preserves unit PF", () => {
    const hour = 3_600_000;
    const minute = 60_000;
    const endT = Date.UTC(2026, 9, 20);
    const startT = endT - 76 * hour;
    const costs = 0;
    const trades: Trade[] = Array.from({ length: 75 }, (_, i) => {
      const entryT = startT + i * hour;
      const r = i < 74 ? 0.01 : -0.02;
      return {
        cfg: identity.cfg,
        sym: identity.sym,
        side: 1,
        entryT,
        exitT: entryT + 30 * minute,
        entry: 100,
        exit: 100 * (1 + r),
        r,
        reason: r > 0 ? "tp" : "sl",
        bars: 2,
        mfe: 0,
        mae: 0,
        kind: "normal",
      };
    });
    const tape = makeTape(
      identity.cfg,
      "follow",
      identity.ind,
      { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag: "mc" },
      "normal",
      [identity.sym],
      trades,
      [],
      [],
    );
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    const relate = {
      ...DEFAULT_RELATE_ADJUSTMENT,
      enabled: true,
      auto: false,
      ratio: 0.2,
      steps: 5,
      lastN: 250,
      minTrades: 60,
      maxStack: 250,
      sources: { config: true, overall: false, symbol: false, direction: false,
        indication: false, strategy: false, coordination: false, range: false },
    };
    const common = {
      ...defaults,
      startT,
      simH: 76,
      lastN: 0,
      validLastN: 0,
      normalBaseMinPf: 0,
      preGate: false,
      robustFrac: 0,
      symGate: "off" as const,
      rangeGate: undefined,
      engineSideAccept: { ...defaults.engineSideAccept!, enabled: false },
      toggles: { ...defaults.toggles, normal: true, trailing: false, block: true,
        blockActive: false, dca: false, dcaActive: false, axis: false },
      block: {
        ...defaults.block,
        historySource: "accepted-orders" as const,
        mode: "shared" as const,
        sources: { config: true, overall: false, symbol: false, direction: false,
          indication: false, type: false },
        ratio: 0.2,
        maxLevel: 1,
        maxMult: 8,
        window: 1,
        pause: 0,
      },
      coord: { enabled: false, hourLock: 0, cooldown: "off" as const,
        conflict: false, confirm: false },
      cost: costs,
    };
    const universe = { bars: [], caches: [], startT, endT, splitT: startT, nowT: endT, baseTf: 60 } as never;
    const adjusted = walkForward(universe, [tape], { ...common, relate });
    const neutral = walkForward(universe, [tape], {
      ...common,
      relate: { ...relate, enabled: false },
    });
    const raised = adjusted.trades.find((x) => (x.relateVol ?? 1) > 1);
    assert.ok(raised, "an order sees the prior 60 accepted settled closes after the validation warm-up");
    assert.equal(raised.relateVol, 1.2, "the first qualified step adds 20% to the previous base volume");
    assert.ok(Math.abs((raised.mult ?? 1) - 1.44) < 1e-10,
      "Block 1.2× is applied first, then Relate 1.2× stacks on it");
    const next = adjusted.trades[adjusted.trades.indexOf(raised) + 1];
    assert.equal(next.relateVol, 1.44, "the following step uses the first adjusted volume");
    assert.equal(adjusted.trades.length, neutral.trades.length);
    assert.ok(Math.abs(adjusted.stats.pf - neutral.stats.pf) < 1e-12,
      "sizing does not change the primary unit-return PF");
    assert.ok(Math.abs(adjusted.stats.net - neutral.stats.net) < 1e-12);
    assert.equal(adjusted.relate?.maxSample, 63);
    assert.ok(adjusted.feed.filter((x) => x.accepted === true && !x.open).length >= 61);
  });

  it("caps the complete modeled DCA position for Micro and Minimal without using future fills", () => {
    const hour = 3_600_000, endT = Date.UTC(2026, 9, 20), startT = endT - 82 * hour;
    for (const tag of ["mc", "mn"] as const) {
      const cfg = identity.cfg.replace(/\|mc$/, `|${tag}|dc2s1q0g0.5r2.5|dca`);
      const protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag,
        dca: { levels: 2, step: 0.01, addRatio: 2.5 } };
      const rows: Trade[] = Array.from({ length: 81 }, (_, i) => {
        const weight = i % 2 ? 6 : 1;
        const r = weight * (i === 74 ? -0.005 : 0.01);
        return { cfg, sym: identity.sym, side: 1, entryT: startT + i * hour,
          exitT: startT + i * hour + 30 * 60_000, entry: 100, exit: r > 0 ? 101 : 99,
          r, vol: weight, reason: r > 0 ? "tp" : "sl", bars: 2, mfe: 0, mae: 0, kind: "dca" };
      });
      const tape = makeTape(cfg, "follow", identity.ind, protect, "dca", [identity.sym], rows, [], []);
      const defaults = defaultWalkForward(DEFAULT_SETTINGS);
      const options = { ...defaults, startT, simH: 82, lastN: 0, validLastN: 0,
        normalBaseMinPf: 0, preGate: false, robustFrac: 0, symGate: "off" as const, rangeGate: undefined,
        engineSideAccept: { ...defaults.engineSideAccept!, enabled: false },
        toggles: { ...defaults.toggles, normal: false, trailing: false, block: false,
          blockActive: false, dca: true, dcaActive: false, axis: false },
        coord: { enabled: false, hourLock: 0, cooldown: "off" as const, conflict: false, confirm: false },
        relate: config({ maxStack: 2, activeStep: 0 }), cost: 0 };
      const universe = { bars: [], caches: [], startT, endT, splitT: startT, nowT: endT, baseTf: 60 } as never;
      const bounded = walkForward(universe, [tape], options);
      const unbounded = walkForward(universe, [tape], { ...options, relate: { ...options.relate, enabled: false } });
      assert.ok(bounded.trades.length > 0, `${tag}: the DCA config has admitted orders`);
      assert.equal(bounded.trades.length, unbounded.trades.length);
      for (const row of bounded.trades) {
        assert.ok((row.vol ?? Infinity) <= 2 + 1e-10, `${tag}: every complete ladder fits the cap`);
        assert.ok(Math.abs((row.mult ?? 0) - 1 / 3) < 1e-10,
          `${tag}: the same reservation is set before either one or six units eventually fill`);
      }
      assert.ok(unbounded.trades.some((row) => (row.vol ?? 0) > 2), "the test exercises a real ladder cap");
      assert.ok(Math.abs(bounded.stats.pf - unbounded.stats.pf) < 1e-10,
        "the primary return PF retains the intrinsic tape return");
      const checks = new Map(auditState({ sim: bounded, tapes: [tape], cost: 0 }).checks.map((c) => [c.name, c]));
      assert.equal(checks.get("replay: every trade passes the Real rules with its recorded Block volume and level")?.ok,
        true, `${tag}: audit must apply the same entry-time DCA reservation`);
      assert.equal(checks.get("relate: modeled volume within Max stack")?.ok, true);
      const corrupted = { ...bounded, trades: bounded.trades.map((row, i) => i === 0 ? { ...row, vol: 2.1 } : row) };
      assert.equal(auditState({ sim: corrupted, tapes: [tape], cost: 0 }).checks
        .find((c) => c.name === "relate: modeled volume within Max stack")?.ok, false,
      "the audit must reject a ladder whose complete modeled volume exceeds the ceiling");
    }
  });

  it("reserves the complete supported Axis ladder before its fills", () => {
    const hour = 3_600_000, endT = Date.UTC(2026, 9, 20), startT = endT - 30 * hour;
    const cfg = `${identity.cfg}|ax-atr8|axis`;
    const protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag: "mc" as const };
    const rows: Trade[] = Array.from({ length: 29 }, (_, i) => {
      const weight = i % 2 ? 36 : 1, r = weight * (i === 20 ? -0.005 : 0.01);
      return { cfg, sym: identity.sym, side: 1, entryT: startT + i * hour,
        exitT: startT + i * hour + 30 * 60_000, entry: 100, exit: r > 0 ? 101 : 99,
        r, vol: weight, reason: r > 0 ? "tp" : "sl", bars: 2, mfe: 0, mae: 0, kind: "axis" };
    });
    const tape = makeTape(cfg, "follow", identity.ind, protect, "axis", [identity.sym], rows, [], []);
    const defaults = defaultWalkForward(DEFAULT_SETTINGS);
    const options = { ...defaults, startT, simH: 30, lastN: 0, validLastN: 0,
      normalBaseMinPf: 0, preGate: false, robustFrac: 0, symGate: "off" as const, rangeGate: undefined,
      engineSideAccept: { ...defaults.engineSideAccept!, enabled: false },
      toggles: { ...defaults.toggles, normal: false, trailing: false, block: false,
        blockActive: false, dca: false, dcaActive: false, axis: true },
      coord: { enabled: false, hourLock: 0, cooldown: "off" as const, conflict: false, confirm: false },
      relate: config({ maxStack: 2, activeStep: 0 }), cost: 0 };
    const universe = { bars: [], caches: [], startT, endT, splitT: startT, nowT: endT, baseTf: 60 } as never;
    const bounded = walkForward(universe, [tape], options);
    assert.ok(bounded.trades.length > 0);
    for (const row of bounded.trades) {
      assert.ok((row.vol ?? Infinity) <= 2 + 1e-10);
      assert.ok(Math.abs((row.mult ?? 0) - 1 / 18) < 1e-10,
        "the same reservation is made before knowing whether one or 36 units will fill");
    }
    const checks = new Map(auditState({ sim: bounded, tapes: [tape], cost: 0 }).checks.map((c) => [c.name, c]));
    assert.equal(checks.get("replay: every trade passes the Real rules with its recorded Block volume and level")?.ok,
      true, "audit must apply the same Axis reservation");
    assert.equal(checks.get("relate: modeled volume within Max stack")?.ok, true);
  });

  it("Active recovers from its own skipped closes without adding them to accepted PF, on Micro and Minimal", () => {
    const hour = 3_600_000;
    const endT = Date.UTC(2026, 9, 20);
    const startT = endT - 82 * hour;
    for (const tag of ["mc", "mn"] as const) {
      const cfg = identity.cfg.replace(/\|mc$/, `|${tag}`);
      const rows: Trade[] = Array.from({ length: 81 }, (_, i) => {
        const r = i === 74 ? -0.02 : 0.01;
        return { cfg, sym: identity.sym, side: 1, entryT: startT + i * hour,
          exitT: startT + i * hour + 30 * 60_000, entry: 100, exit: 100 * (1 + r),
          r, reason: r > 0 ? "tp" : "sl", bars: 2, mfe: 0, mae: 0, kind: "normal" };
      });
      const tape = makeTape(cfg, "follow", identity.ind,
        { tp: 0.01, sl: 0.01, trail: 0, hold: 32, tag }, "normal", [identity.sym], rows, [], []);
      const defaults = defaultWalkForward(DEFAULT_SETTINGS);
      const relate = config({ ratio: 0.2, steps: 5, activeStep: 2, lastN: 250, minTrades: 60 });
      const options = { ...defaults, startT, simH: 82, lastN: 0, validLastN: 0,
        normalBaseMinPf: 0, preGate: false, robustFrac: 0, symGate: "off" as const, rangeGate: undefined,
        engineSideAccept: { ...defaults.engineSideAccept!, enabled: false },
        toggles: { ...defaults.toggles, normal: true, trailing: false, block: false,
          blockActive: false, dca: false, dcaActive: false, axis: false },
        coord: { enabled: false, hourLock: 0, cooldown: "off" as const, conflict: false, confirm: false },
        relate, cost: 0 };
      const universe = { bars: [], caches: [], startT, endT, splitT: startT, nowT: endT, baseTf: 60 } as never;
      const sim = walkForward(universe, [tape], options);
      const at = (i: number) => sim.feed.find((row) => row.entryT === startT + i * hour);
      assert.equal(at(74)?.accepted, true, `${tag}: the loss is an accepted close`);
      for (const i of [75, 76]) {
        assert.equal(at(i)?.accepted, undefined, `${tag}: skipped step ${i} is not accepted`);
        assert.equal(at(i)?.relateShadow, true, `${tag}: skipped step ${i} is explicitly marked`);
        assert.ok(!sim.trades.some((row) => row.entryT === startT + i * hour));
      }
      assert.equal(at(77)?.accepted, true, `${tag}: the entry recovers after the two shadow closes`);
      assert.equal(sim.trades.find((row) => row.entryT === startT + 77 * hour)?.relateVol, 1.44);
      const replay = relateBookFor({ relate })!;
      for (const row of sim.feed) feedBooks(row, null, null, null, replay);
      assert.deepEqual(replay.summary(), sim.relate, `${tag}: a replay reconstructs accepted and shadow histories`);
      assert.equal(sim.relate?.closes, sim.feed.filter((row) => row.accepted === true && !row.open).length);
      assert.ok((sim.relate?.shadowCloses ?? 0) >= 2);
    }
  });

  it("bounds stored history at last-N", () => {
    const b = new RelateBook(config({ lastN: 60, minTrades: 60 }));
    for (let i = 0; i < 100; i++) b.add(bookEntry(i < 40 ? -0.01 : 0.02));
    assert.equal(b.summary().maxSample, 60);
    assert.equal(b.decide(identity).stats.config?.n, 60);
  });
});
