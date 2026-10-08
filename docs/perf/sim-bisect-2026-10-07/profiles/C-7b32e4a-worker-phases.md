
C workers · Base: 922888 ms CPU (non-idle samples)

| function | self ms | share |
|---|---:|---:|
| `simulate src/core/sim/backtest.ts:78` | 239638 | 26.0 % |
| `runComboSteps src/core/pipeline/pipeline.ts:801` | 101837 | 11.0 % |
| `(anonymous) src/core/indications/research2.ts:543` | 69490 | 7.5 % |
| `htfBars src/core/indications/cache.ts:171` | 50964 | 5.5 % |
| `(anonymous) src/core/pipeline/pipeline.ts:854` | 45087 | 4.9 % |
| `symStat src/core/pipeline/pipeline.ts:322` | 38854 | 4.2 % |
| `statsOf src/core/metrics/stats.ts:64` | 28133 | 3.0 % |
| `memo src/core/indications/cache.ts:28` | 26452 | 2.9 % |
| `mergeSideTrades src/core/sim/backtest.ts:323` | 24961 | 2.7 % |
| `(anonymous) src/core/bots/bots.ts:145` | 24395 | 2.6 % |
| `nextEntryIndex src/core/sim/backtest.ts:305` | 19811 | 2.1 % |
| `(anonymous) src/core/indications/research2.ts:453` | 14760 | 1.6 % |
| `sideSignal src/core/sim/backtest.ts:273` | 12817 | 1.4 % |
| `splitSides src/core/sim/backtest.ts:283` | 12306 | 1.3 % |
| `(anonymous) src/core/sim/backtest.ts:327` | 11356 | 1.2 % |

C workers · Tapes: 827132 ms CPU (non-idle samples)

| function | self ms | share |
|---|---:|---:|
| `simulateAxisDesk src/core/sim/axis.ts:353` | 222980 | 27.0 % |
| `buildTapesGen src/core/sim/walkforward.ts:1339` | 196197 | 23.7 % |
| `simulateAxis src/core/sim/axis.ts:77` | 124315 | 15.0 % |
| `makeTape src/core/sim/walkforward.ts:879` | 40446 | 4.9 % |
| `simulate src/core/sim/backtest.ts:78` | 37498 | 4.5 % |
| `simulateDca src/core/sim/dca.ts:23` | 25703 | 3.1 % |
| `(anonymous) src/core/indications/research2.ts:543` | 13341 | 1.6 % |
| `htfBars src/core/indications/cache.ts:171` | 11178 | 1.4 % |
| `memo src/core/indications/cache.ts:28` | 10856 | 1.3 % |
| `(anonymous) src/core/indications/cache.ts:129` | 6991 | 0.8 % |
| `mk src/core/math/indicators.ts:348` | 6489 | 0.8 % |
| `manage src/core/sim/axis.ts:444` | 5803 | 0.7 % |
| `(anonymous) src/core/bots/bots.ts:145` | 4968 | 0.6 % |
| `(anonymous) src/core/sim/walkforward.ts:890` | 4898 | 0.6 % |
| `ema src/core/math/indicators.ts:17` | 4222 | 0.5 % |

C workers · other (signal tapes, GC outside a phase, messaging): 284138 ms
