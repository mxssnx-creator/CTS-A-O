worker: sampled A 2926563 ms · C 2608902 ms; GC A 189967 · C 213968 ms

| function (C file:line) | A self ms | C self ms | Δ ms | × |
|---|---:|---:|---:|---:|
| `runComboSteps src/core/pipeline/pipeline.ts:801` | 71858 | 101837 | +29979 | 1.42 |
| `mergeSideTrades src/core/sim/backtest.ts:323` (only C) | 0 | 24961 | +24961 | new |
| `(garbage collector) ` | 189967 | 213968 | +24001 | 1.13 |
| `nextEntryIndex src/core/sim/backtest.ts:305` (only C) | 0 | 22633 | +22633 | new |
| `(anonymous) src/core/pipeline/pipeline.ts:854` | 36029 | 50581 | +14552 | 1.40 |
| `sideSignal src/core/sim/backtest.ts:273` (only C) | 0 | 14006 | +14006 | new |
| `splitSides src/core/sim/backtest.ts:283` (only C) | 0 | 13090 | +13090 | new |
| `(anonymous) src/core/sim/backtest.ts:327` (only C) | 0 | 11356 | +11356 | new |
| `(anonymous) src/core/indications/research2.ts:543` | 112129 | 118318 | +6189 | 1.06 |
| `simulateAxisDesk src/core/sim/axis.ts:353` | 217132 | 223019 | +5887 | 1.03 |
| `symStat src/core/pipeline/pipeline.ts:322` | 33908 | 38854 | +4946 | 1.15 |
| `htfBars src/core/indications/cache.ts:171` | 58385 | 62142 | +3757 | 1.06 |
| `statOf src/core/sim/walkforward.ts:1372` (only C) | 0 | 3609 | +3609 | new |
| `laneOf src/core/indications/registry.ts:1032` | 3245 | 6539 | +3294 | 2.02 |
| `(anonymous) src/core/indications/registry.ts:1086` | 21715 | 23386 | +1671 | 1.08 |
| `runCombo src/core/pipeline/pipeline.ts:779` | 6758 | 8356 | +1598 | 1.24 |
| `rsi src/core/math/indicators.ts:64` | 10600 | 11971 | +1371 | 1.13 |
| `rma src/core/math/indicators.ts:43` | 6105 | 7108 | +1003 | 1.16 |
| `RegExp: ^(.*)@m(\d+)(c?)$ ` | 967 | 1876 | +909 | 1.94 |
| `willr src/core/math/indicators.ts:449` | 6305 | 7211 | +906 | 1.14 |

largest decreases:

| function | A | C | Δ |
|---|---:|---:|---:|
| `simulate src/core/sim/backtest.ts:78` | 538550 | 277202 | -261348 |
| `buildTapesGen src/core/sim/walkforward.ts:1339` | 257059 | 196197 | -60862 |
| `hourlyNet src/core/metrics/stats.ts:46` | 57451 | 0 | -57451 |
| `statsOf src/core/metrics/stats.ts:64` | 52182 | 28133 | -24049 |
| `makeTape src/core/sim/walkforward.ts:879` | 51891 | 40516 | -11375 |
| `(program) ` | 51148 | 41179 | -9969 |
| `manage src/core/sim/axis.ts:444` | 9392 | 5803 | -3589 |
| `(anonymous) src/core/sim/walkforward.ts:890` | 8631 | 5305 | -3326 |

only in C (≥ 200 ms self): `mergeSideTrades src/core/sim/backtest.ts:323` 24961 ms · `nextEntryIndex src/core/sim/backtest.ts:305` 22633 ms · `sideSignal src/core/sim/backtest.ts:273` 14006 ms · `splitSides src/core/sim/backtest.ts:283` 13090 ms · `(anonymous) src/core/sim/backtest.ts:327` 11356 ms · `statOf src/core/sim/walkforward.ts:1372` 3609 ms · `statKept src/core/sim/walkforward.ts:1379` 298 ms

worker: sampled B 3566631 ms · C 2608902 ms; GC B 196140 · C 213968 ms

| function (C file:line) | B self ms | C self ms | Δ ms | × |
|---|---:|---:|---:|---:|
| `nextEntryIndex src/core/sim/backtest.ts:305` (only C) | 0 | 22633 | +22633 | new |
| `(garbage collector) ` | 196140 | 213968 | +17828 | 1.09 |
| `htfBars src/core/indications/cache.ts:171` | 59892 | 62142 | +2250 | 1.04 |
| `(anonymous) src/core/indications/research2.ts:543` | 116620 | 118318 | +1698 | 1.01 |
| `(anonymous) src/core/indications/registry.ts:1086` | 22309 | 23386 | +1077 | 1.05 |
| `makeTape src/core/sim/walkforward.ts:879` | 39594 | 40516 | +922 | 1.02 |
| `symStat src/core/pipeline/pipeline.ts:322` | 38119 | 38854 | +735 | 1.02 |
| `willr src/core/math/indicators.ts:449` | 6639 | 7211 | +572 | 1.09 |
| `ema src/core/math/indicators.ts:17` | 7031 | 7499 | +468 | 1.07 |
| `close src/core/sim/backtest.ts:107` | 3628 | 4075 | +447 | 1.12 |
| `baseRuns src/core/pipeline/pipeline.ts:940` | 4848 | 5270 | +422 | 1.09 |
| `rma src/core/math/indicators.ts:43` | 6726 | 7108 | +382 | 1.06 |
| `trueRange src/core/math/indicators.ts:84` | 3378 | 3754 | +376 | 1.11 |
| `rsi src/core/math/indicators.ts:64` | 11670 | 11971 | +301 | 1.03 |
| `state src/core/indications/registry.ts:23` | 8891 | 9150 | +259 | 1.03 |
| `adjustProtect src/core/adjust.ts:158` | 1275 | 1503 | +228 | 1.18 |
| `axisVol src/core/sim/axis.ts:44` | 179 | 407 | +228 | 2.27 |
| `tapeViews src/core/sim/walkforward.ts:681` | 1155 | 1380 | +225 | 1.19 |
| `rmin src/core/indications/research2.ts:114` | 1729 | 1934 | +205 | 1.12 |
| `events src/core/indications/micro.ts:61` | 3599 | 3799 | +200 | 1.06 |

largest decreases:

| function | B | C | Δ |
|---|---:|---:|---:|
| `simulate src/core/sim/backtest.ts:78` | 676815 | 277202 | -399613 |
| `splitSides src/core/sim/backtest.ts:283` | 201662 | 13090 | -188572 |
| `sideSignal src/core/sim/backtest.ts:273` | 185697 | 14006 | -171691 |
| `hourlyNet src/core/metrics/stats.ts:46` | 63722 | 0 | -63722 |
| `buildTapesGen src/core/sim/walkforward.ts:1339` | 238106 | 196197 | -41909 |
| `statsOf src/core/metrics/stats.ts:64` | 58117 | 28133 | -29984 |
| `runComboSteps src/core/pipeline/pipeline.ts:801` | 119422 | 101837 | -17585 |
| `memo src/core/indications/cache.ts:28` | 50355 | 37308 | -13047 |

only in C (≥ 200 ms self): `nextEntryIndex src/core/sim/backtest.ts:305` 22633 ms

main: sampled A 1005278 ms · C 898190 ms; GC A 52761 · C 36713 ms

| function (C file:line) | A self ms | C self ms | Δ ms | × |
|---|---:|---:|---:|---:|
| `(anonymous) src/core/market/bingx.ts:25` | 32 | 1010 | +978 | 31.56 |
| `firstOnset src/core/signals.ts:576` (only C) | 0 | 678 | +678 | new |
| `signalIndexGen src/core/sim/walkforward.ts:3118` | 630 | 1096 | +466 | 1.74 |
| `activeSignalsAt src/core/sim/walkforward.ts:3237` | 632 | 921 | +289 | 1.46 |
| `laneOf src/core/indications/registry.ts:1032` | 3200 | 3428 | +228 | 1.07 |
| `(anonymous) src/core/sim/walkforward.ts:3338` | 1271 | 1490 | +219 | 1.17 |
| `run src/core/server/db.server.ts:147` | 2014 | 2221 | +207 | 1.10 |
| `activeSignals src/core/signals.ts:116` | 123 | 283 | +160 | 2.30 |
| `runEngine scripts/core-session.mjs:329` | 505 | 649 | +144 | 1.29 |
| `walkForwardGen src/core/sim/walkforward.ts:3599` | 3629 | 3758 | +129 | 1.04 |
| `packTapesGen src/core/sim/walkforward.ts:785` | 328 | 456 | +128 | 1.39 |
| `baseGateSensitivity src/core/pipeline/pipeline.ts:633` | 409 | 530 | +121 | 1.30 |
| `stepPaperGen src/core/server/runtime.server.ts:4567` | 241 | 357 | +116 | 1.48 |
| `tapeExecutable src/core/sim/walkforward.ts:1810` | 151 | 265 | +114 | 1.75 |
| `heatAdd scripts/core-session.mjs:598` (only C) | 0 | 104 | +104 | new |
| `(anonymous) src/core/server/runtime.server.ts:4254` | 527 | 623 | +96 | 1.18 |
| `heatCellOf scripts/core-session.mjs:597` (only C) | 0 | 88 | +88 | new |
| `disabled src/core/signals.ts:658` | 49 | 125 | +76 | 2.55 |
| `entryHeldBack src/core/server/runtime.server.ts:4500` | 36 | 109 | +73 | 3.03 |
| `lastNSideOk src/core/sim/walkforward.ts:2722` (only C) | 0 | 70 | +70 | new |

largest decreases:

| function | A | C | Δ |
|---|---:|---:|---:|
| `(garbage collector) ` | 52761 | 36713 | -16048 |
| `add src/core/sim/block.ts:279` | 7775 | 0 | -7775 |
| `(anonymous) src/core/sim/block.ts:295` | 5898 | 0 | -5898 |
| `(program) ` | 17744 | 12164 | -5580 |
| `fill src/core/signals.ts:442` | 10166 | 7246 | -2920 |
| `postMessage node:internal/worker:380` | 12468 | 10158 | -2310 |
| `coordBlock src/core/sim/walkforward.ts:198` | 2186 | 9 | -2177 |
| `signalSetAt src/core/sim/walkforward.ts:3378` | 2154 | 17 | -2137 |

only in C (≥ 200 ms self): `firstOnset src/core/signals.ts:576` 678 ms
