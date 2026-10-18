#!/usr/bin/env node
// Post-run sample-adequacy diagnostic. Does not rescore or alter the frozen replay.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { barsFromCandles, headBars, resample } from "../src/core/market/bars.ts";
import { makeUniverse, evaluationSignal, seriesOf, laneProtect, REF_TF } from "../src/core/pipeline/pipeline.ts";
import { entrySignal } from "../src/core/bots/bots.ts";
import { entryExcursions } from "../src/core/exit-strategy.ts";
import { INDICATION_BY_ID, indicationState, laneOf } from "../src/core/indications/registry.ts";

const stem = process.argv[2] ?? "docs/sims/exit-validation-20261017";
const p = JSON.parse(readFileSync(`${stem}-protocol.json`));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const source of p.sources.filter((source) => source.path.startsWith("src/core/")))
  assert.equal(hash(readFileSync(source.path)), source.sha256, `same scored production source: ${source.path}`);
const input = readFileSync(p.feed.path);
assert.equal(hash(input), p.feed.sha256);
const feed = JSON.parse(gunzipSync(input));
const { evaluationFromT, tradeStartT, preH } = p.window;
const actualExitEntryPolicy = p.attempt ? "raw-indication-entries" : "legacy-global-entry-tactics";
const u = makeUniverse(p.symbols.flatMap((sym) => p.tfs.map((tf) => headBars(barsFromCandles(sym, tf, resample(feed.candles[`${sym}|1`], 1, tf)), tradeStartT))), evaluationFromT);
const rows = [];
for (const pair of p.pairs) {
  const [bot, ind] = pair.split("|");
  const base = laneOf(ind).base;
  assert.ok(INDICATION_BY_ID.has(base), `registry definition exists: ${ind}`);
  const fitH = Math.min(preH, p.settings.exitStrategy.lookbackH || preH) * p.settings.exitStrategy.trainFraction;
  const fromT = Math.max(evaluationFromT, p.settings.exitStrategy.lookbackH > 0 ? tradeStartT - p.settings.exitStrategy.lookbackH * 3_600_000 : -Infinity);
  const fitCutT = fromT + fitH * 3_600_000;
  const holdH = Math.max(2 * (laneOf(ind).tf ?? REF_TF) / 60, Math.min(p.settings.exitStrategy.holdH, fitH / 4));
  const holdRef = Math.max(2, Math.round(holdH * 60 / REF_TF));
  const holdBars = laneProtect({ tp: 0, sl: 0, trail: 0, hold: holdRef }, ind).hold;
  for (const s of seriesOf(u, ind)) {
    const b = u.bars[s];
    const raw = entrySignal(bot, ind, u.caches[s], null);
    const filtered = entrySignal(bot, ind, u.caches[s], p.settings.tactics);
    const state = indicationState(ind, u.caches[s]);
    assert.ok(raw && filtered && state, `${pair}/${b.sym}: initialized signals`);
    const mfe = { 1: [], [-1]: [] }, mae = { 1: [], [-1]: [] };
    entryExcursions(b, evaluationSignal(u, b, p.attempt ? raw : filtered), holdBars, fitCutT, fromT, mfe, mae);
    const counts = { stateOnsetsFit: 0, rawLongFit: 0, rawShortFit: 0, tacticLongFit: 0, tacticShortFit: 0, tacticLongValidation: 0, tacticShortValidation: 0 };
    for (let i = 1; i + 1 < b.n; i++) {
      const entryT = b.t[i + 1];
      if (entryT >= fromT && entryT < fitCutT) {
        if (state[i] !== 0 && state[i] !== state[i - 1]) counts.stateOnsetsFit++;
        if (raw[i] === 1) counts.rawLongFit++; else if (raw[i] === -1) counts.rawShortFit++;
        if (filtered[i] === 1) counts.tacticLongFit++; else if (filtered[i] === -1) counts.tacticShortFit++;
      }
      if (entryT >= fitCutT && entryT < tradeStartT) {
        if (filtered[i] === 1) counts.tacticLongValidation++; else if (filtered[i] === -1) counts.tacticShortValidation++;
      }
    }
    rows.push({ pair, sym: b.sym, registryKind: INDICATION_BY_ID.get(base).kind, signalNull: false, stateNull: false, holdBars, holdMinutes: holdBars * b.tfMin, fitFromT: fromT, fitCutT, ...counts, completedFitExcursionsLong: mfe[1].length, completedFitExcursionsShort: mfe[-1].length, minEntriesPerPairSide: p.settings.exitStrategy.minEntries });
  }
}
const totals = p.pairs.map((pair) => {
  const xs = rows.filter((row) => row.pair === pair);
  return { pair, rawFitOnsets: xs.reduce((n, row) => n + row.rawLongFit + row.rawShortFit, 0), tacticFitOnsets: xs.reduce((n, row) => n + row.tacticLongFit + row.tacticShortFit, 0), completedFitExcursionsLong: xs.reduce((n, row) => n + row.completedFitExcursionsLong, 0), completedFitExcursionsShort: xs.reduce((n, row) => n + row.completedFitExcursionsShort, 0), minEntriesPerPairSide: p.settings.exitStrategy.minEntries };
});
const evidence = { classification: "Post-run sample-adequacy diagnostic only; no setting changes, strategy rescoring, or OOS tuning", actualExitEntryPolicy, protocolSha256: hash(readFileSync(`${stem}-protocol.json`)), diagnosticScriptSha256: hash(readFileSync(new URL(import.meta.url))), totals, perSymbol: rows };
writeFileSync(`${stem}-inventory.json`, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(totals));
