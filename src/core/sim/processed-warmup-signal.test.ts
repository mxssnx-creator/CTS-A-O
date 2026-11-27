import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from '../config.ts';
import type { Trade } from '../domain/types.ts';
import { configId } from '../pipeline/pipeline.ts';
import { sigActiveKey } from '../signals.ts';
import { defaultWalkForward, makeTape, walkForward } from './walkforward.ts';
const H = 3_600_000, M = 60_000, T = Date.UTC(2026, 9, 16), ind = 'sig-ema-cross-s@m1', symbol = 'A-USDT';
const protect = { tp: .01, sl: .01, trail: 0, hold: 10 }, id = configId('follow', ind, protect);
function row(at: number, side: 1 | -1): Trade {
  return { cfg: id, sym: symbol, side, entryT: at, exitT: at + M, entry: 100,
    exit: 100 * (1 + side * .02176), r: .02, reason: 'tp', bars: 1, mfe: 0, mae: 0, kind: 'normal' };
}
test('modeled warmup advances independent long and short Signal stages without funding history', () => {
  const begin = T - H;
  const warm = Array.from({ length: 4 }, (_, i) => [row(begin + (2 * i + 1) * M, 1),
    row(begin + (2 * i + 2) * M, -1)]).flat();
  const target = [row(T + M, 1), row(T + 3 * M, -1)];
  const tape = makeTape(id, 'follow', ind, protect, 'normal', [symbol], [...warm, ...target], [], []);
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const opts = { ...base, startT: T, simH: 1, stepH: 1, causalBase: true, preGate: false,
    basePassed: new Set<string>(), signalBasePassed: new Set([`follow|${ind}`]),
    processedStages: { validationN: 2, realN: 2 }, processedWarmup: { fromT: begin, untilT: T, baseCutT: begin },
    signalActive: new Set([1, -1].map(side => sigActiveKey('follow', ind, symbol, side, 'normal', id))),
    signalRank: undefined, signalGuardN: 0, signalCluster: undefined, signalAccept: undefined, signalSideAccept: undefined,
    signalSourceGate: undefined, signalOwnBase: true, signalValidLastN: 0, validLastN: 0, lastN: 0,
    rangeOpts: undefined, rangeGate: undefined, onePerPairEvent: false, maxOpen: 0, signalMaxOpen: 0,
    signalPerSymbol: 0, signalMaxPositions: 0, coord: { ...base.coord!, enabled: false } };
  const universe = { bars: [], caches: [], startT: begin - H, endT: T + H, splitT: begin, nowT: T + H, baseTf: 1 } as never;
  const result = walkForward(universe, [tape], opts);
  assert.deepEqual(result.trades.map(x => [x.entryT, x.side]), [[T + M, 1], [T + 3 * M, -1]], JSON.stringify(result.skips));
  assert.equal(result.processedStages!.sets.length, 2);
  assert.ok(result.processedStages!.sets.every(x => x.stages.validated.closedOrders >= 2));
  const compact = walkForward(universe, [tape], { ...opts,
    processedStages: { ...opts.processedStages, reportDetail: 'summary' } });
  assert.deepEqual(compact.trades, result.trades);
  assert.deepEqual(compact.skips, result.skips);
  assert.deepEqual(compact.processedStageSummary!.validation, result.processedStages!.validation);
  assert.deepEqual(compact.processedStageSummary!.real, result.processedStages!.real);
  assert.throws(() => walkForward(universe, [tape], { ...opts, signalBasePassed: undefined }), /pre-warmup causal Base/);
});
