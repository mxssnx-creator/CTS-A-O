
B workers · Base: 1684036 ms CPU (non-idle samples)

| function | self ms | share |
|---|---:|---:|
| `simulate src/core/sim/backtest.ts:78` | 532756 | 31.6 % |
| `splitSides src/core/sim/backtest.ts:277` | 200994 | 11.9 % |
| `sideSignal src/core/sim/backtest.ts:267` | 184851 | 11.0 % |
| `runComboSteps src/core/pipeline/pipeline.ts:801` | 119422 | 7.1 % |
| `(anonymous) src/core/indications/research2.ts:543` | 68262 | 4.1 % |
| `hourlyNet src/core/metrics/stats.ts:46` | 63722 | 3.8 % |
| `statsOf src/core/metrics/stats.ts:64` | 58117 | 3.5 % |
| `htfBars src/core/indications/cache.ts:171` | 49062 | 2.9 % |
| `(anonymous) src/core/pipeline/pipeline.ts:852` | 46019 | 2.7 % |
| `memo src/core/indications/cache.ts:28` | 39284 | 2.3 % |
| `symStat src/core/pipeline/pipeline.ts:322` | 38119 | 2.3 % |
| `mergeSideTrades src/core/sim/backtest.ts:293` | 26906 | 1.6 % |
| `(anonymous) src/core/bots/bots.ts:145` | 24406 | 1.4 % |
| `(anonymous) src/core/indications/research2.ts:453` | 14785 | 0.9 % |
| `(anonymous) src/core/sim/backtest.ts:297` | 11895 | 0.7 % |

B workers · Tapes: 977995 ms CPU (non-idle samples)

| function | self ms | share |
|---|---:|---:|
| `buildTapesGen src/core/sim/walkforward.ts:1339` | 238106 | 24.3 % |
| `simulateAxisDesk src/core/sim/axis.ts:353` | 225065 | 23.0 % |
| `simulate src/core/sim/backtest.ts:78` | 143974 | 14.7 % |
| `simulateAxis src/core/sim/axis.ts:77` | 128785 | 13.2 % |
| `makeTape src/core/sim/walkforward.ts:879` | 39543 | 4.0 % |
| `simulateDca src/core/sim/dca.ts:23` | 26711 | 2.7 % |
| `(anonymous) src/core/indications/research2.ts:543` | 13129 | 1.3 % |
| `memo src/core/indications/cache.ts:28` | 11071 | 1.1 % |
| `htfBars src/core/indications/cache.ts:171` | 10830 | 1.1 % |
| `(anonymous) src/core/indications/cache.ts:129` | 7433 | 0.8 % |
| `mk src/core/math/indicators.ts:348` | 6433 | 0.7 % |
| `manage src/core/sim/axis.ts:444` | 5831 | 0.6 % |
| `(anonymous) src/core/sim/walkforward.ts:890` | 5105 | 0.5 % |
| `(anonymous) src/core/bots/bots.ts:145` | 4706 | 0.5 % |
| `(anonymous) src/core/bots/bots.ts:103` | 3907 | 0.4 % |

B workers · other (signal tapes, GC outside a phase, messaging): 270044 ms
