// Synthetic mark/protection math and atomic publication; no venue actions or profitability evidence.
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { TickMathBook } from '../src/core/server/tick-math.ts';
import { createExitProtection } from '../src/core/sim/exit-protection.ts';
import { sessionStudySourceFiles, studySha256, studyExactJson } from './lib/session-study.mjs';

const output = process.argv[2];
assert.ok(output, 'OUTPUT_JSON');
const cases = [];
const cost = .0015, t0 = Date.UTC(2026, 9, 17), frames = 50;
for (const n of [200, 20_000]) {
  const published = Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? -1 : 1;
    const set = ['static-sl', 'adaptive-sl', 'breakeven', 'trailing', 'trailing-only'][i % 5];
    const protect = { tp: set === 'trailing-only' ? 0 : .2, sl: .2, trail: .01, hold: 100,
      trailOnly: set === 'trailing-only', exitType: 'historic', exitSet: set };
    return { cfg: `follow|ema-9-21@m${[1,5,15][i % 3]}|fixture${i}`, sym: `S${i % 20}`, side,
      entryT: t0, entryI: 0, entry: 100, stop: 100 * (1 - side * .2),
      target: protect.tp ? 100 * (1 + side * .2) : 0, peak: 100, trailOn: false,
      trail: .01, trailDist: .01, mtm: -cost, vol: 1 + i % 3,
      exitProtection: createExitProtection(protect, 100, cost) };
  });
  const units = new Float64Array(n).fill(10);
  const book = new TickMathBook(structuredClone(published), units, cost, 1, false);
  const ms = [];
  let peakRss = 0, slices = 0;
  for (let frame = 0; frame <= frames; frame++) {
    const prices = Object.fromEntries(Array.from({ length: 20 }, (_, i) =>
      [`S${i}`, 100 + 1.4 * Math.sin(frame * .35 + i / 3)]).filter((_, i) => (frame + i) % 7 !== 0));
    const start = performance.now(), previous = published[0].mtm;
    const advance = book.advanceGen(prices, t0 + frame * 60_000);
    let result;
    for (;;) {
      const next = advance.next();
      if (next.done) { result = next.value; break; }
      assert.equal(published[0].mtm, previous, 'No partial published mark');
      slices++;
      await setImmediate();
    }
    for (const patch of result.patches) Object.assign(published[patch.index], patch.values);
    const elapsed = performance.now() - start;
    const scalar = published.reduce((sum, p, i) => sum + p.mtm * p.vol * units[i], 0);
    assert.ok(Math.abs(result.open - scalar) < 1e-7, 'All held marks, including unquoted symbols');
    if (frame) ms.push(elapsed);
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }
  ms.sort((a,b) => a-b);
  cases.push({ positions: n, frames, symbols: 20, lanes: [1,5,15],
    p50Ms: ms[Math.floor(ms.length*.5)], p95Ms: ms[Math.floor(ms.length*.95)], maxMs: ms.at(-1),
    peakRssMiB: peakRss/1048576, yieldedSlices: slices, scalarParity: true });
}
const result = { sourceSha256: studySha256(studyExactJson(sessionStudySourceFiles())),
  scope: 'Synthetic local recovery math and patch publication, warmed after one frame. Includes yielding and intermittent quote outages; excludes DB, network, worker startup and trade selection. Same host also running a native replay; no comparative speedup or live SLA claim.', cases };
writeFileSync(output, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
