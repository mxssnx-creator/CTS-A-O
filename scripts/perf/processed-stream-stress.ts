/** Synthetic production-loop stress, NOT market/venue profitability evidence. Run sequential bounded batches. */
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import type { Protect, RangeTag, StratKind, Trade } from "../../src/core/domain/types.ts";
import { configId } from "../../src/core/pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, walkForward } from "../../src/core/sim/walkforward.ts";
import { positionOrderCounts } from "../../src/core/positions.ts";
import { unitStatsOf } from "../../src/core/metrics/stats.ts";

const H = 3_600_000, M = 60_000, START = Date.UTC(2026, 9, 8, 12);
const kinds: StratKind[] = ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis", "exit"];
const tags: Array<RangeTag | undefined> = ["mc", "mn", "sh", "gn", "lg", undefined];

export function stressWindow(preH: number, simH: number): void {
  if (!Number.isFinite(preH) || !Number.isFinite(simH) || preH < 1 || simH < 1 || preH + simH > 72)
    throw new RangeError("stress prehistory + trading window must be between 2 and 72 hours");
}

export function runProcessedStreamStress(preH = 24, simH = 24, symbols = 20) {
  stressWindow(preH, simH);
  if (!Number.isSafeInteger(symbols) || symbols < 1 || symbols > 20) throw new RangeError("symbols must be 1–20");
  const syms = Array.from({ length: symbols }, (_, i) => `FIXTURE-${i}-USDT`);
  const batches = [];
  let peakHeap = 0, peakRss = 0;
  const started = performance.now();
  for (const kind of kinds) for (const tf of [1, 5, 15, 30]) {
    const batch = (() => {
    const batchStart = performance.now();
    const n = Math.floor(simH * 60 / 4);
    const tapes = tags.map((tag) => {
      const protect: Protect = { tp: kind === "trailing-only" ? 0 : .02, sl: .01,
        trail: kind === "normal" ? 0 : .005, hold: 3, ...(tag ? { tag } : {}),
        ...(kind === "trailing-only" ? { trailOnly: true } : {}) };
      const ind = `ema-9-21@m${tf}`, cfg = configId("follow", ind, protect, kind);
      const trades = syms.flatMap((sym) => ([1, -1] as const).flatMap((side) => {
        const row = (entryT: number, exitT: number, r: number): Trade => ({ cfg, sym, side, kind,
          entryT, exitT, entry: 100, exit: 100 * (1 + side * r), r, mult: 1, vol: 1,
          reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0 });
        const past = Array.from({ length: 40 }, (_, i) => row(START - (40 - i) * M, START - (40 - i) * M + 1000, .01));
        const future = Array.from({ length: n }, (_, i) => row(START + (4 * i + 1) * M,
          START + (4 * i + 3) * M, i % 60 < 12 ? -.01 : .02));
        return [...past, ...future];
      }));
      return makeTape(cfg, "follow", ind, protect, kind, syms, trades, [], []);
    });
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    const options = { ...base, seatSet: "validated" as const, startT: START, simH, preH, stepH: 1,
      portfolio: 0, maxOpen: 0, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0, lastN: 0,
      symGate: "off" as const, seatPer: "config" as const, validLastN: 12, rangeGate: undefined,
      exitMinPf: 1.1, exitMinTrades: 12, entryCrowd: undefined, bots: [],
      gates: { ...base.gates, minPf: 1.1, rangeMinPf: {}, minTrades: 9, baseLastN: 40,
        baseRangeLastN: {}, lastNOnly: true, maxDdr: 0, minGreen: 0, lossPrior: false },
      toggles: { ...base.toggles, normal: true, trailing: true, exit: true, dca: true,
        // The legacy DCA Active switch selects its own variant; exercise both in separate batches.
        dcaActive: kind === "dca-active", axis: true, block: false, blockActive: false },
      coord: { ...base.coord, enabled: false, confirm: false, conflict: false, hourLock: 0, cooldown: "off" as const } };
    const u = { bars: [], caches: [], baseTf: 1, startT: START - preH * H,
      splitT: START, endT: START + simH * H, nowT: START + simH * H } as never;
    const processingStart = performance.now();
    const sim = walkForward(u, tapes, options);
    const processingMilliseconds = performance.now() - processingStart;
    const qualifiedSource = sim.feed.filter((x) => x.validationSource);
    assert.equal(sim.validated?.length, tags.length, `${kind}/${tf}: all constructed Base contexts qualify`);
    assert.equal(qualifiedSource.length, tags.length * symbols * 2 * n, `${kind}/${tf}: own streams keep progressing`);
    const latest = new Map<string, number>();
    for (const x of sim.trades) latest.set(JSON.stringify([x.cfg, x.sym, x.side]), x.entryT);
    for (const cfg of tapes.map((x) => x.id)) for (const sym of syms) for (const side of [1, -1]) {
      const last = latest.get(JSON.stringify([cfg, sym, side]));
      assert.ok(last !== undefined, `${kind}/${tf}/${sym}/${side}: independent lane executes`);
      if (n > 30) assert.ok(last > START + 100 * M, "own source recovers after its initial twelve losses");
    }
    const usage = process.memoryUsage();
    peakHeap = Math.max(peakHeap, usage.heapUsed); peakRss = Math.max(peakRss, process.resourceUsage().maxRSS * 1024);
    return { kind, tf, contexts: tags.length * symbols * 2,
      sourceOrders: qualifiedSource.length, closed: unitStatsOf(sim.trades),
      ...positionOrderCounts(sim.trades, sim.openAtEnd ?? []), skips: sim.skips,
      milliseconds: performance.now() - batchStart, processingMilliseconds, heapBytes: usage.heapUsed, rssBytes: usage.rss };
    })();
    batches.push(batch);
    // Drop the entire batch before the next one; never retain tapes, feeds or order arrays in the result.
    globalThis.gc?.();
  }
  return { evidence: "synthetic production-loop regression; no market/venue performance claim", preH, simH,
    totalHours: preH + simH, symbols, contexts: batches.reduce((n, x) => n + x.contexts, 0),
    sourceOrders: batches.reduce((n, x) => n + x.sourceOrders, 0),
    milliseconds: performance.now() - started, peakHeapBytes: peakHeap, peakRssBytes: peakRss,
    memorySampling: "heap sampled at completed batches; RSS process high water; single bounded batch retained", batches };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pre = "24", sim = "24", symbols = "20"] = process.argv.slice(2);
  process.stdout.write(`${JSON.stringify(runProcessedStreamStress(Number(pre), Number(sim), Number(symbols)))}\n`);
}
