import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_RELATE_ADJUSTMENT } from "../config.ts";
import { RelateBook, type RelateAutoChoice, type RelateIdentity } from "./relate-volume.ts";

const identity: RelateIdentity = { cfg: "follow|ema-9-21@m1|tp1|sl1|tr0|h32|mc", sym: "AAA-USDT", side: 1,
  ind: "ema-9-21@m1", strategy: "normal", coordination: "ordinary", range: "mc" };

/** Deliberately slow scalar oracle: replay every ratio, depth and Active threshold order by order. */
function exhaustive(rows: number[], cap: number, wantedSteps: number, minPf: number): RelateAutoChoice | null {
  let best: RelateAutoChoice | null = null;
  for (let q = 1; q <= 30; q++) for (let steps = 2; steps <= 15; steps++)
    for (let activeStep = 0; activeStep <= Math.min(6, steps); activeStep++) {
      const ratio = q / 5;
      let prior = 0, n = 0, wins = 0, gp = 0, gl = 0, sizedGp = 0, sizedGl = 0;
      for (const r of rows) {
        const stage = Math.min(prior, steps);
        if (stage >= activeStep) {
          let volume = 1;
          for (let k = 0; k < stage; k++) volume = Math.min(cap, volume * (1 + ratio));
          n++;
          if (r > 0) { wins++; gp += r; sizedGp += r * volume; }
          else if (r < 0) { gl -= r; sizedGl -= r * volume; }
        }
        prior = r > 0 ? Math.min(15, prior + 1) : 0;
      }
      if (n < 60 || ![gp, gl, sizedGp, sizedGl].every(Number.isFinite)) continue;
      const pf = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0;
      if (!(pf >= minPf) || !(gp - gl > 0)) continue;
      const candidate = { ratio, steps, activeStep, pf,
        sizedPf: sizedGl > 0 ? sizedGp / sizedGl : sizedGp > 0 ? Infinity : 0,
        positiveRate: wins / n, n };
      const distance = Math.abs(steps - wantedSteps), bestDistance = best ? Math.abs(best.steps - wantedSteps) : Infinity;
      if (!best || pf > best.pf || (pf === best.pf && candidate.positiveRate > best.positiveRate) ||
          (pf === best.pf && candidate.positiveRate === best.positiveRate && ratio < best.ratio) ||
          (pf === best.pf && candidate.positiveRate === best.positiveRate && ratio === best.ratio && distance < bestDistance) ||
          (pf === best.pf && candidate.positiveRate === best.positiveRate && ratio === best.ratio && distance === bestDistance && steps < best.steps) ||
          (pf === best.pf && candidate.positiveRate === best.positiveRate && ratio === best.ratio && steps === best.steps && activeStep < best.activeStep))
        best = candidate;
    }
  return best;
}

test("folded Auto scoring matches every scalar ratio/step/Active candidate on varied capped histories", () => {
  const scenarios = [
    { period: 4, losses: 1, cap: 1, steps: 2 },
    { period: 6, losses: 2, cap: 2, steps: 5 },
    { period: 7, losses: 1, cap: 5, steps: 10 },
    { period: 9, losses: 2, cap: 8, steps: 15 },
    { period: 5, losses: 1, cap: 8, steps: 8 },
  ];
  for (const scenario of scenarios) {
    const rows = Array.from({ length: 240 }, (_, i) => i % scenario.period < scenario.losses ? -0.0625 : 0.125);
    const config = { ...DEFAULT_RELATE_ADJUSTMENT, enabled: true, auto: true, maxStack: scenario.cap,
      steps: scenario.steps, minPf: 1.5, minTrades: 60, lastN: 250,
      sources: { config: true, overall: false, symbol: false, direction: false, indication: false,
        strategy: false, coordination: false, range: false } };
    const book = new RelateBook(config);
    for (const r of rows) book.add({ ...identity, r, accepted: true, relateMeasured: true, relateBase: 1 });
    const actual = book.decide(identity).choices.config;
    const expected = exhaustive(rows, scenario.cap, scenario.steps, config.minPf);
    assert.ok(actual && expected);
    assert.deepEqual([actual.ratio, actual.steps, actual.activeStep, actual.n, actual.pf, actual.positiveRate],
      [expected.ratio, expected.steps, expected.activeStep, expected.n, expected.pf, expected.positiveRate]);
    if (Number.isFinite(expected.sizedPf))
      assert.ok(Math.abs(actual.sizedPf - expected.sizedPf) <= 1e-10 * Math.max(1, expected.sizedPf));
    else assert.equal(actual.sizedPf, expected.sizedPf);
  }
});

test("overflow in deeper hypothetical ladders still selects the closest finite candidate", () => {
  const config = { ...DEFAULT_RELATE_ADJUSTMENT, enabled: true, auto: true, maxStack: 8,
    steps: 15, minPf: 1.5, minTrades: 60, lastN: 250,
    sources: { config: true, overall: false, symbol: false, direction: false, indication: false,
      strategy: false, coordination: false, range: false } };
  const rows = Array<number>(80).fill(.01);
  rows[16] = 4e307;
  const book = new RelateBook(config);
  for (const r of rows) book.add({ ...identity, r, accepted: true, relateMeasured: true, relateBase: 1 });
  const choice = book.decide(identity).choices.config;
  assert.ok(choice);
  assert.equal(choice.ratio, .2);
  assert.equal(choice.steps, 8);
  assert.equal(choice.activeStep, 0);
  assert.equal(choice.pf, Infinity);
});
