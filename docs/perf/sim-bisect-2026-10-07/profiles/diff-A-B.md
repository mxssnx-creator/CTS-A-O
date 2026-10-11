worker: sampled A 2926563 ms · B 3566631 ms; GC A 189967 · B 196140 ms

| function (B file:line) | A self ms | B self ms | Δ ms | × |
|---|---:|---:|---:|---:|
| `splitSides src/core/sim/backtest.ts:277` (only B) | 0 | 201662 | +201662 | new |
| `sideSignal src/core/sim/backtest.ts:267` (only B) | 0 | 185697 | +185697 | new |
| `simulate src/core/sim/backtest.ts:78` | 538550 | 676815 | +138265 | 1.26 |
| `runComboSteps src/core/pipeline/pipeline.ts:801` | 71858 | 119422 | +47564 | 1.66 |
| `mergeSideTrades src/core/sim/backtest.ts:293` (only B) | 0 | 26906 | +26906 | new |
| `(anonymous) src/core/pipeline/pipeline.ts:852` | 36029 | 51628 | +15599 | 1.43 |
| `memo src/core/indications/cache.ts:28` | 37137 | 50355 | +13218 | 1.36 |
| `(anonymous) src/core/sim/backtest.ts:297` (only B) | 0 | 11895 | +11895 | new |
| `simulateAxisDesk src/core/sim/axis.ts:353` | 217132 | 225116 | +7984 | 1.04 |
| `hourlyNet src/core/metrics/stats.ts:46` | 57451 | 63722 | +6271 | 1.11 |
| `(garbage collector) ` | 189967 | 196140 | +6173 | 1.03 |
| `statsOf src/core/metrics/stats.ts:64` | 52182 | 58117 | +5935 | 1.11 |
| `bothSides src/core/sim/backtest.ts:288` (only B) | 0 | 4779 | +4779 | new |
| `simulateAxis src/core/sim/axis.ts:77` | 124215 | 128803 | +4588 | 1.04 |
| `(anonymous) src/core/indications/research2.ts:543` | 112129 | 116620 | +4491 | 1.04 |
| `symStat src/core/pipeline/pipeline.ts:322` | 33908 | 38119 | +4211 | 1.12 |
| `laneOf src/core/indications/registry.ts:1032` | 3245 | 7228 | +3983 | 2.23 |
| `statOf src/core/sim/walkforward.ts:1372` (only B) | 0 | 3417 | +3417 | new |
| `runCombo src/core/pipeline/pipeline.ts:779` | 6758 | 9467 | +2709 | 1.40 |
| `htfBars src/core/indications/cache.ts:171` | 58385 | 59892 | +1507 | 1.03 |

largest decreases:

| function | A | B | Δ |
|---|---:|---:|---:|
| `buildTapesGen src/core/sim/walkforward.ts:1339` | 257059 | 238106 | -18953 |
| `makeTape src/core/sim/walkforward.ts:879` | 51891 | 39594 | -12297 |
| `(program) ` | 51148 | 42249 | -8899 |
| `manage src/core/sim/axis.ts:444` | 9392 | 5831 | -3561 |
| `(anonymous) src/core/sim/walkforward.ts:890` | 8631 | 5523 | -3108 |
| `avg src/core/sim/axis.ts:405` | 4770 | 2866 | -1904 |
| `(anonymous) src/core/indications/cache.ts:129` | 21215 | 19494 | -1721 |
| `close src/core/sim/axis.ts:418` | 4837 | 3826 | -1011 |

only in B (≥ 200 ms self): `splitSides src/core/sim/backtest.ts:277` 201662 ms · `sideSignal src/core/sim/backtest.ts:267` 185697 ms · `mergeSideTrades src/core/sim/backtest.ts:293` 26906 ms · `(anonymous) src/core/sim/backtest.ts:297` 11895 ms · `bothSides src/core/sim/backtest.ts:288` 4779 ms · `statOf src/core/sim/walkforward.ts:1372` 3417 ms · `statKept src/core/sim/walkforward.ts:1379` 342 ms

main: sampled A 1005278 ms · B 1216767 ms; GC A 52761 · B 39066 ms

| function (B file:line) | A self ms | B self ms | Δ ms | × |
|---|---:|---:|---:|---:|
| `(anonymous) src/core/market/bingx.ts:25` | 32 | 1119 | +1087 | 34.97 |
| `firstOnset src/core/signals.ts:576` (only B) | 0 | 854 | +854 | new |
| `signalIndexGen src/core/sim/walkforward.ts:3115` | 630 | 1324 | +694 | 2.10 |
| `activeSignalsAt src/core/sim/walkforward.ts:3234` | 632 | 1161 | +529 | 1.84 |
| `walkForwardGen src/core/sim/walkforward.ts:3596` | 3629 | 4064 | +435 | 1.12 |
| `(anonymous) src/core/sim/walkforward.ts:3335` | 1271 | 1553 | +282 | 1.22 |
| `activeSignals src/core/signals.ts:116` | 123 | 393 | +270 | 3.20 |
| `run src/core/server/db.server.ts:147` | 2014 | 2275 | +261 | 1.13 |
| `runEngine scripts/core-session.mjs:329` | 505 | 739 | +234 | 1.46 |
| `laneOf src/core/indications/registry.ts:1032` | 3200 | 3430 | +230 | 1.07 |
| `fetchKlines src/core/market/bingx.ts:177` | 378 | 608 | +230 | 1.61 |
| `runComboSteps src/core/pipeline/pipeline.ts:801` | 122 | 329 | +207 | 2.70 |
| `sideSignal src/core/sim/backtest.ts:267` (only B) | 0 | 203 | +203 | new |
| `resample src/core/market/bars.ts:135` | 186 | 381 | +195 | 2.05 |
| `(anonymous) src/core/server/runtime.server.ts:4293` | 527 | 691 | +164 | 1.31 |
| `packTapesGen src/core/sim/walkforward.ts:785` | 328 | 485 | +157 | 1.48 |
| `decode node:internal/encoding:440` | 108 | 249 | +141 | 2.31 |
| `feedBooks src/core/sim/walkforward.ts:1967` | 809 | 936 | +127 | 1.16 |
| `heatAdd scripts/core-session.mjs:598` (only B) | 0 | 124 | +124 | new |
| `tapeExecutable src/core/sim/walkforward.ts:1807` | 151 | 263 | +112 | 1.74 |

largest decreases:

| function | A | B | Δ |
|---|---:|---:|---:|
| `(garbage collector) ` | 52761 | 39066 | -13695 |
| `add src/core/sim/block.ts:279` | 7775 | 0 | -7775 |
| `(anonymous) src/core/sim/block.ts:295` | 5898 | 0 | -5898 |
| `(program) ` | 17744 | 13604 | -4140 |
| `fill src/core/signals.ts:442` | 10166 | 7633 | -2533 |
| `postMessage node:internal/worker:380` | 12468 | 10084 | -2384 |
| `coordBlock src/core/sim/walkforward.ts:198` | 2186 | 8 | -2178 |
| `signalSetAt src/core/sim/walkforward.ts:3375` | 2154 | 20 | -2134 |

only in B (≥ 200 ms self): `firstOnset src/core/signals.ts:576` 854 ms · `sideSignal src/core/sim/backtest.ts:267` 203 ms
