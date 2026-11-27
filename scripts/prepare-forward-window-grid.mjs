import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { checkSettings } from "../src/core/settings-check.ts";
import { DEFAULT_SIGNALS } from "../src/core/signal-config.ts";
import { INDICATIONS } from "../src/core/indications/registry.ts";

const [marketManifest, end = "2026-11-27T00:00:00Z", rolling] = process.argv.slice(2);
if (!marketManifest || (rolling && rolling !== "--rolling"))
  throw new Error("usage: prepare-forward-window-grid.mjs MARKET_MANIFEST [END_UTC] [--rolling]");
const data = JSON.parse(readFileSync(marketManifest, "utf8"));
assert.equal(data.symbols.length, 50);
assert.equal(new Set(data.symbols).size, 50);
assert.ok(data.symbols.every(s =>typeof s === "string" && /^[A-Z0-9]+-USDT$/.test(s)));
const focused = [
  ["follow","trend-reversal-reclaim-16",[1,5]],
  ["revert","trend-reversal-reclaim-16",[1,5]],
  ["follow","trend-reversal-psar-10",[1,5]],
  ["follow","trend-reversal-structure-10",[1,5]],
  ["follow","trend-reversal-confluence-10",[1,5]],
  ["follow","rsi-mid-52-48",[1,5]],
  ["revert","rsi-fast",[1,5]],
  ["follow","cfl-break-20",[5]],
  ["revert","mc-rsi2-20",[5]],
  ["follow","micro-1x5-market-momentum-fast",[1]],
  ["follow","micro-1-drawdown-turn-fast",[1]],
  ["follow","low-range-3-mid-reclaim-standalone",[1,5]],
  ["follow","low-range-24-compression-break-standalone",[1,5]],
  ["follow","low-range-6-edge-turn-standalone-inverse",[1,5]],
];
const names = new Set(INDICATIONS.map(x=>x.id));
const focus = focused.filter(([,id])=>names.has(id)).flatMap(([bot,id,tfs])=>tfs.map(tf=>[bot,id+"@m"+tf].join("|")));
const grid = {
  tp:[], minimalPlus:false, short:false, general:false, long:false, baseCells:true, baseTrailCells:true,
  trailingOnly:true, holdH:[.5,1.5], rangeFit:{enabled:false}, baseBest:true,
  micro:{...DEFAULT_SETTINGS.grid.micro,tp:[.002,.004,.006],slOfTp:[.75,1.25],trailOfTp:[0,.5],
    minTf:1,ownInds:false,maxHoldMin:30,slAuto:undefined},
  minimal:{...DEFAULT_SETTINGS.grid.minimal,tp:[.006,.008,.012,.016],slOfTp:[.75,1.25],trailOfTp:[0,.5],
    minTf:1,maxHoldMin:90,slAuto:undefined},
  lowRange:{...DEFAULT_SETTINGS.grid.lowRange,enabled:true,coordination:"independent",steps:[3,5],slRatios:[.75,1.25],
    trailRatios:[0,.75],maxHoldMin:30,holdAuto:true,holdCandidatesMin:[15,30],slAuto:undefined},
};
const settings = {
  symbols:50, forceSymbols:data.symbols, tfMin:1, tfs:[1,5,15], tfDays:{"1":11,"5":11,"15":11,"30":11}, historyDays:11,
  focus,pinned:[],grid,
  tactics:{...DEFAULT_SETTINGS.tactics, trendStrength:false, volRegime:false},
  exitStrategy:{enabled:false},
  signals:{
    enabled:true, sourcesMode:"allow", lanes:[1,5,15],
    sources:Object.fromEntries(["ema-cross","macd-cross","rsi-reversal","psar","bb-break","trend-reversal-structure-10",
      "trend-reversal-psar-10-s","trend-reversal-rsi-10-s"].filter(x=>x).map(k=>[k,true])),
    coordination:{...DEFAULT_SIGNALS.coordination, strategyOnly:true, minSources:2},
    holdH:1.5, exits:"pct", normal:{tp:[.006,.01,.015],slOfTp:[.75,1.25]},
    trailing:{tp:[.01],trailOfTp:[.4,.6],slOfTp:1}, trailRatios:[1],
    trailingOnly:{...DEFAULT_SIGNALS.trailingOnly,sl:[.01],trail:[.004,.006]},
    hist:{enabled:false,lookbackH:150}
  }
};
const polarities = ["positive", "negative"];
const windows = (longs, shorts) => longs.flatMap(long => shorts.flatMap(short =>
  [1, 2, 3, 4, 5].flatMap(minimal => polarities.flatMap(shortPolarity => polarities.map(minimalPolarity =>
    ({ long, short, minimal, shortPolarity, minimalPolarity }))))));

const main = [4, 8, 12, 16];
const later = [...main, 20, 24, 28, 30];
const hour = 3_600_000;
const endT = Date.parse(end);
assert.ok(Number.isFinite(endT) && endT % hour === 0 && endT >= 96 * hour, "an aligned UTC end is required");
const untilT = endT - 48 * hour;
const fromT = untilT - 24 * hour;
const wf = {
  causalBase: true, recordValidation: "summary", signalLongH: 150, onePerPairEvent: false,
  processedStages: { validationN: 6, realN: 4, execN: 4, reportDetail: "summary", baseScope: "context",
    autoPf: { mode: "independent", ratio: 4 },
    windowGrid: {
      base: windows([10, 20, 30, 40, 50], main),
      validation: windows([0], main),
      real: windows([0], later),
      exec: windows([0], later),
    },
    ...(rolling && { rollingBase: true }),
  },
  processedWarmup: { fromT, untilT, baseCutT: fromT },
};
Object.assign(settings, {
  toggles: { ...DEFAULT_SETTINGS.toggles, normal: true, trailing: true, block: false,
    blockActive: false, dca: false, axis: false, exit: false },
  relate: { ...DEFAULT_SETTINGS.relate, enabled: false },
});
const desk = JSON.stringify({ settings, wf });
checkSettings(JSON.parse(desk).settings);
process.stdout.write(desk + "\n");
