
A workers · Base: 1005854 ms CPU (non-idle samples)

| function | self ms | share |
|---|---:|---:|
| `simulate src/core/sim/backtest.ts:78` | 403123 | 40.1 % |
| `runComboSteps src/core/pipeline/pipeline.ts:796` | 71858 | 7.1 % |
| `(anonymous) src/core/indications/research2.ts:543` | 64227 | 6.4 % |
| `hourlyNet src/core/metrics/stats.ts:46` | 57451 | 5.7 % |
| `statsOf src/core/metrics/stats.ts:64` | 52182 | 5.2 % |
| `htfBars src/core/indications/cache.ts:171` | 46615 | 4.6 % |
| `symStat src/core/pipeline/pipeline.ts:317` | 33908 | 3.4 % |
| `(anonymous) src/core/pipeline/pipeline.ts:829` | 33528 | 3.3 % |
| `memo src/core/indications/cache.ts:28` | 25234 | 2.5 % |
| `(anonymous) src/core/bots/bots.ts:145` | 22102 | 2.2 % |
| `(anonymous) src/core/indications/research2.ts:453` | 15926 | 1.6 % |
| `ichimoku src/core/math/indicators.ts:568` | 7919 | 0.8 % |
| `rsi src/core/math/indicators.ts:64` | 7822 | 0.8 % |
| `runCombo src/core/pipeline/pipeline.ts:774` | 6757 | 0.7 % |
| `donchianPrior src/core/math/indicators.ts:282` | 6736 | 0.7 % |

A workers · Tapes: 1004877 ms CPU (non-idle samples)

| function | self ms | share |
|---|---:|---:|
| `buildTapesGen src/core/sim/walkforward.ts:1162` | 257059 | 25.6 % |
| `simulateAxisDesk src/core/sim/axis.ts:353` | 217101 | 21.6 % |
| `simulate src/core/sim/backtest.ts:78` | 135342 | 13.5 % |
| `simulateAxis src/core/sim/axis.ts:77` | 124206 | 12.4 % |
| `makeTape src/core/sim/walkforward.ts:831` | 51814 | 5.2 % |
| `simulateDca src/core/sim/dca.ts:23` | 25297 | 2.5 % |
| `memo src/core/indications/cache.ts:28` | 11902 | 1.2 % |
| `htfBars src/core/indications/cache.ts:171` | 11770 | 1.2 % |
| `(anonymous) src/core/indications/research2.ts:543` | 11443 | 1.1 % |
| `manage src/core/sim/axis.ts:444` | 9392 | 0.9 % |
| `(anonymous) src/core/sim/walkforward.ts:842` | 8238 | 0.8 % |
| `(anonymous) src/core/indications/cache.ts:129` | 7806 | 0.8 % |
| `mk src/core/math/indicators.ts:348` | 6433 | 0.6 % |
| `(anonymous) src/core/bots/bots.ts:145` | 5574 | 0.6 % |
| `(anonymous) src/core/bots/bots.ts:103` | 4390 | 0.4 % |

A workers · other (signal tapes, GC outside a phase, messaging): 273724 ms
