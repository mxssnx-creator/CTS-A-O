#!/usr/bin/env node
// Builds the x02 (BingX VST demo) Micro + Low-Range desk profile used on 11 Nov 2026 and prints its cell counts.
//
//   node --experimental-strip-types --no-warnings docs/live-coordination/x02-micro-low-range.build.mjs OUT.json [symbols]
//
// The profile is generated (2,334 focus pairs) rather than stored. Everything that differs from the code defaults is
// here, with the measurement behind it — see docs/verification/micro-low-range-ladders-20261111.md.
import { writeFileSync } from "node:fs";
const root = new URL("../../", import.meta.url);
const { DEFAULT_SETTINGS } = await import(new URL("src/core/config.ts", root));
const { MICRO_CONFIG_IDS, INVERSE_MICRO_CONFIG_IDS } = await import(new URL("src/core/indications/micro-family.ts", root));
const { LOW_RANGE_IDS, DEFAULT_LOW_RANGE_GRID } = await import(new URL("src/core/indications/low-range.ts", root));
const { MICRO_RANGE, MINIMAL_RANGE, SHORT_RANGE } = await import(new URL("src/core/minimal-coord.ts", root));
const { completeBaseRangeProtects, protectCellKey } = await import(new URL("src/core/pipeline/pipeline.ts", root));
const { checkSettings } = await import(new URL("src/core/settings-check.ts", root));
const out = process.argv[2];
if (!out) throw new Error("usage: x02-micro-low-range.build.mjs OUT.json [symbols] [full]");
const symbols = Number(process.argv[3] ?? 50);
// "full": Micro, Minimal, Short and Low-Range together with Block, DCA, DCA Active and Axis (operator, 12 Nov 2026).
// Their focus pairs are the default engine focus restricted to nothing: the ranges trade their own indications.
const full = process.argv[4] === "full";
// every Micro, Inverse-Micro and Low-Range source; nothing else
// full: the code-default focus (it already contains every Micro, Inverse-Micro and Low-Range source)
const focus = full ? [...DEFAULT_SETTINGS.focus]
  : [...MICRO_CONFIG_IDS, ...INVERSE_MICRO_CONFIG_IDS, ...LOW_RANGE_IDS].map((id) => `follow|${id}`);
const settings = {
  symbols, symbolRank: "volatility1h", symbolOffset: 0, focus, pinned: [],
  // 16 GB host: with every Base-validated pair (mainTop 0) the tape stage of 954 pairs on 26 symbols reached 9.6 GB
  // and the memory guard aborted the compute (11 Nov 19:26Z). The best 200 pairs, shared across the lanes, build sets.
  mainTop: 200,
  // Normal and Trailing only (the positive coordination "Normal and Trailing on, Block Active off" holds); Block, DCA
  // and Axis are other strategies and stay out of a Micro / Low-Range desk
  toggles: full
    ? { normal: true, trailing: true, block: true, blockActive: false, dca: true, dcaActive: true, axis: true }
    : { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  // Low-Range on 5m and slower lanes and no no-TP trailing-only cells: Base at the full grid on 50 symbols does not fit
  // the session. Every TP x SL x trail x hold cell of both ranges stays (Micro 1,230, Low-Range 1,964 at this cost).
  grid: { tp: [], minimal: full ? { ...MINIMAL_RANGE } : false, short: full ? { ...SHORT_RANGE } : false, general: false, long: false,
    minimalPlus: false, trailingOnly: false,
    micro: { ...MICRO_RANGE }, lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true, minTf: 5 } },
  signals: { enabled: false },
  // the account rate read from the venue (GET /user/commissionRate, 11 Nov 18:20Z): taker 0.05 %, maker 0.02 %.
  // Auto mode arrives at the same value after reading every symbol, and then recomputes everything once.
  fees: { ...DEFAULT_SETTINGS.fees, taker: 0.0005, maker: 0.0002 },
  // demo sizing: each position at the contract's exchange minimum
  live: { notionalUsd: 6, maxNotionalUsd: 0, syncMs: 15000, maxPositions: 100, leverage: "max", positionSize: "min", maxChase: 5 },
};
checkSettings(settings);
writeFileSync(out, JSON.stringify(settings, null, 1));
const cost = 2 * settings.fees.taker * (1 + settings.fees.slippageRatio);
const cells = completeBaseRangeProtects({ ...DEFAULT_SETTINGS.grid, ...settings.grid }, cost);
const by = {};
for (const p of cells) { const k = `${p.tag}:${p.trailOnly ? "trail-only" : p.trail > 0 ? "trailing" : "normal"}`; by[k] = (by[k] ?? 0) + 1; }
console.log(`focus pairs ${focus.length} · modeled round trip ${(cost * 100).toFixed(3)} % · cells ${cells.length} (distinct ${new Set(cells.map(protectCellKey)).size}) ${JSON.stringify(by)}`);
