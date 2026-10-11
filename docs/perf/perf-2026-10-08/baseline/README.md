# Perf baseline: current head on the bench desk

Head: `6de980f` (branch `claude/sim3h-fixes`, which contains `2793762`). Simulation only; no code changed.

## Run

Command: the same flags as the bisect runs in `docs/perf/sim-bisect-2026-10-07/` (bench desk, 30 symbols, `--symbols 30 --pre 24 --run 24 --focus all`,
`CTS_CORE_WORKERS=3`, `--cpu-prof` for the main thread and, through `tools/preload.mjs`, for each worker). Machine: 4 cores, 16 GB RAM, no swap, Node v22.22.0.
Full timings are in `phases.txt`; the profile summary is `prof-head-summary.json`. Raw dump, cpuprofiles, HTML and session files are not committed.

| metric | value |
|---|---:|
| wall (`/usr/bin/time -v`) | 21:32.8 (1,292.8 s) |
| user / sys CPU | 3,496.8 s / 304.2 s (294 % CPU, about 2.9 cores on average) |
| max RSS | 4,858,672 KB (4.63 GiB) |
| computes | 4; `[core-v2] compute` done in #1 152.5 s, #2 265.4 s, #3 329.9 s, #4 386.3 s |
| per-phase totals (progress lines, ±30 s each) | Base 541 s · Tapes 487 s · Real 31 s · Signals 31 s · backfill 30 s · running 91 s |
| last compute, Base (workers) | 212.2 s |
| report checks | `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` (exit status 1; the same single failing check as the C run in the bisect README) |
| book (`raw.json` trades, the writeup's Result row) | 8,808 orders · unit PF 4.17 · net +180.7 units (Σr profit 237.73, Σr loss −57.03) · 4,211 open at end · balance $10.00 → $13.96 |

Profile totals: main thread 1,290,235 ms sampled, of which idle 1,047,456 ms, GC 61,091 ms (4.7 % of sampled). Workers (3)
3,789,190 ms sampled, idle 828,012 ms, GC 320,169 ms (8.4 % of sampled).

Note: the bench run only ran 4 computes at 24 h each, so the per-compute numbers differ from the 4-compute bisect rows (e.g. #4 386 s here vs 379 s on `d5dac9a`; the bisect rows were measured on different commits and are not directly comparable beyond that).

### Main thread: top 25 self time

Share = self time ÷ busy time (main sampled 1290.2 s, idle 1047.5 s, busy 242.8 s).

| # | function | file:line | self s | share |
|---:|---|---|---:|---:|
| 1 | `(garbage collector)` | — | 61.1 | 25.16 % |
| 2 | `selectFixedGen` | src/core/sim/walkforward.ts:2558 | 22.7 | 9.37 % |
| 3 | `(program)` | — | 21.3 | 8.77 % |
| 4 | `seatKey` | src/core/sim/walkforward.ts:2132 | 8.2 | 3.39 % |
| 5 | `fill` | src/core/signals.ts:442 | 7.7 | 3.18 % |
| 6 | `unit` | scripts/core-session.mjs:1180 | 7.6 | 3.14 % |
| 7 | `walkForwardGen` | src/core/sim/walkforward.ts:3686 | 6.2 | 2.57 % |
| 8 | `toArrayBuffer` | node:internal/deps/undici/undici:11883 | 4.9 | 2.02 % |
| 9 | `createUnsafeBuffer` | node:internal/buffer:1082 | 4.9 | 2.00 % |
| 10 | `Zlib` | node:zlib:627 | 4.8 | 1.96 % |
| 11 | `fill` | src/core/signals.ts:259 | 4.6 | 1.91 % |
| 12 | `processChunkSync` | node:zlib:407 | 4.6 | 1.89 % |
| 13 | `postMessage` | node:internal/worker:380 | 4.3 | 1.75 % |
| 14 | `configEvalAt` | src/core/sim/walkforward.ts:2518 | 4.2 | 1.72 % |
| 15 | `run` | src/core/server/db.server.ts:147 | 3.0 | 1.22 % |
| 16 | `(anonymous)` | scripts/core-session.mjs:1 | 2.7 | 1.12 % |
| 17 | `unitU` | scripts/core-session.mjs:1181 | 2.7 | 1.12 % |
| 18 | `compute` | src/core/server/runtime.server.ts:2371 | 2.2 | 0.90 % |
| 19 | `auditStateGen` | src/core/audit.ts:96 | 2.1 | 0.85 % |
| 20 | `signalIndexGen` | src/core/sim/walkforward.ts:3205 | 2.0 | 0.82 % |
| 21 | `activeSignalsAt` | src/core/sim/walkforward.ts:3324 | 2.0 | 0.82 % |
| 22 | `equityPass` | scripts/core-session.mjs:1523 | 1.7 | 0.69 % |
| 23 | `feedBooks` | src/core/sim/walkforward.ts:2052 | 1.6 | 0.68 % |
| 24 | `(anonymous)` | src/core/market/bingx.ts:25 | 1.6 | 0.67 % |
| 25 | `px` | scripts/core-session.mjs:1204 | 1.6 | 0.65 % |

### Workers (3): top 25 self time

Share = self time ÷ busy time (worker sampled 3789.2 s, idle 828.0 s, busy 2961.2 s).

| # | function | file:line | self s | share |
|---:|---|---|---:|---:|
| 1 | `simulate` | src/core/sim/backtest.ts:78 | 477.4 | 16.12 % |
| 2 | `simulateAxisDesk` | src/core/sim/axis.ts:353 | 355.6 | 12.01 % |
| 3 | `(garbage collector)` | — | 320.2 | 10.81 % |
| 4 | `buildTapesGen` | src/core/sim/walkforward.ts:1421 | 221.8 | 7.49 % |
| 5 | `simulateAxis` | src/core/sim/axis.ts:77 | 177.2 | 5.98 % |
| 6 | `runComboSteps` | src/core/pipeline/pipeline.ts:801 | 146.5 | 4.95 % |
| 7 | `(anonymous)` | src/core/indications/research2.ts:543 | 107.5 | 3.63 % |
| 8 | `htfBars` | src/core/indications/cache.ts:171 | 93.6 | 3.16 % |
| 9 | `(anonymous)` | src/core/pipeline/pipeline.ts:854 | 77.9 | 2.63 % |
| 10 | `makeTape` | src/core/sim/walkforward.ts:928 | 62.8 | 2.12 % |
| 11 | `memo` | src/core/indications/cache.ts:28 | 52.9 | 1.79 % |
| 12 | `symStat` | src/core/pipeline/pipeline.ts:322 | 52.8 | 1.78 % |
| 13 | `statsOf` | src/core/metrics/stats.ts:64 | 39.9 | 1.35 % |
| 14 | `(anonymous)` | src/core/bots/bots.ts:145 | 39.8 | 1.34 % |
| 15 | `simulateDca` | src/core/sim/dca.ts:23 | 38.5 | 1.30 % |
| 16 | `nextEntryIndex` | src/core/sim/backtest.ts:305 | 37.4 | 1.26 % |
| 17 | `mergeSideTrades` | src/core/sim/backtest.ts:323 | 34.7 | 1.17 % |
| 18 | `(anonymous)` | src/core/server/tapes.worker.ts:83 | 27.3 | 0.92 % |
| 19 | `(anonymous)` | src/core/indications/research2.ts:453 | 26.2 | 0.88 % |
| 20 | `splitSides` | src/core/sim/backtest.ts:283 | 22.7 | 0.77 % |
| 21 | `sideSignal` | src/core/sim/backtest.ts:273 | 18.4 | 0.62 % |
| 22 | `rsi` | src/core/math/indicators.ts:64 | 16.3 | 0.55 % |
| 23 | `(anonymous)` | src/core/indications/registry.ts:1094 | 15.6 | 0.53 % |
| 24 | `(anonymous)` | src/core/sim/backtest.ts:327 | 13.9 | 0.47 % |
| 25 | `state` | src/core/indications/registry.ts:23 | 13.6 | 0.46 % |

