#!/usr/bin/env node
// Check every configured source/lane entry decision on the retained evaluation window.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { CandleSeries } from "../../src/core/market/candle-series.ts";
import { tailBars } from "../../src/core/market/bars.ts";
import { laneSeriesFrom, signalDataHours, signalLaneSeriesFrom } from "../../src/core/server/runtime.server.ts";
import { makeUniverse, seriesOf, forgetCombo } from "../../src/core/pipeline/pipeline.ts";
import { signalCombos } from "../../src/core/signals.ts";
import { entrySignal } from "../../src/core/bots/bots.ts";
import type { Candle } from "../../src/core/domain/types.ts";
const [feedPath, protocolPath] = process.argv.slice(2);
if (!feedPath || !protocolPath) throw new Error("signal-lane-parity FEED.gz PROTOCOL.json");
const bytes = readFileSync(feedPath);
const feed = JSON.parse((bytes[0] === 0x1f ? gunzipSync(bytes) : bytes).toString());
const p = JSON.parse(readFileSync(protocolPath, "utf8")), s = p.actualSettings, wf = p.actualWf;
const symbols: string[] = [...p.symbols];
const candles = new Map(symbols.map((sym) => [sym, CandleSeries.fromCandles(
  (feed.candles[`${sym}|1`] as Candle[]).filter((c) => c.t + 60_000 <= p.window.endT))]));
const hours = signalDataHours(s, wf);
const oldBars = laneSeriesFrom(candles, s, 0, hours).map((b) => tailBars(b, Math.ceil(hours * 60 / b.tfMin)));
const newBars = signalLaneSeriesFrom(candles, s, wf);
const universes = [makeUniverse(oldBars), makeUniverse(newBars)];
const hash = createHash("sha256");
let decisions = 0, sources = 0;
const differences: Array<{ ind: string; n: number; first: unknown }> = [];
const started = performance.now();
for (const pair of signalCombos(s.signals, s.tfs)) {
  const records = universes.map((u) => {
    const rows: Array<[string, number, number]> = [];
    for (const index of seriesOf(u, pair.ind)) {
      const b = u.bars[index], entries = entrySignal(pair.bot, pair.ind, u.caches[index], s.tactics);
      if (!entries) continue;
      for (let i = 0; i < b.n; i++) if (b.t[i] + b.tfMin * 60_000 >= p.window.evaluationFromT)
        rows.push([b.sym, b.t[i], entries[i]]);
    }
    forgetCombo(u, pair.bot, pair.ind);
    return rows;
  });
  const changed = records[1].filter((row, i) => JSON.stringify(row) !== JSON.stringify(records[0][i]));
  if (changed.length || records[1].length !== records[0].length) differences.push({ ind: pair.ind, n: changed.length, first: changed[0] });
  hash.update(JSON.stringify([pair, records[1]]));
  decisions += records[1].length; sources++;
}
console.log(JSON.stringify({ symbols, sources, decisions, exactParity: differences.length === 0, differences,
  fromT: p.window.evaluationFromT, endT: p.window.endT,
  oldBars: oldBars.map((b) => ({ tf: b.tfMin, n: b.n })), newBars: newBars.map((b) => ({ tf: b.tfMin, n: b.n })),
  resultSha256: hash.digest("hex"), elapsedMs: performance.now() - started }, null, 2));
assert.equal(differences.length, 0, "bounded warmup must preserve every entry decision");
