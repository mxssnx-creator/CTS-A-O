# Perf: profile of the head after the value-area and Axis changes

Head run: `8abdf93` (branch `claude/sim3h-fixes`). It contains `1ce756b` (value-area indication reuses one buffer) and
`6ad88ed` (Axis loops skip flat, signal-free bars). Simulation only; no keys, no orders, no code changed.

The task named the baseline as commit `2793762`. The committed baseline in `../baseline/` was measured on `6de980f`,
which contains `2793762`. The comparison below is against that run; the two heads differ by more than the two changes.

## Run

Command: the bisect command from `docs/perf/sim-bisect-2026-10-07/` with the repo root as cwd, `--cpu-prof` for the main
thread and `tools/preload.mjs` for the workers (bench desk, 30 symbols, `--pre 24 --run 24 --focus all`,
`CTS_CORE_WORKERS=3`). Machine: 4 cores, 16,094 MB RAM, no swap, Node v22.22.0.

`/usr/bin/time` was not installed on this image, so the `time` package was installed (apt) to run the same command.
The run exited with status 1 because of the one failing report check, as in the B and C runs of the bisect.

| metric | after (`8abdf93`) | baseline (`6de980f`) |
|---|---:|---:|
| wall (`/usr/bin/time -v`) | **13:54.5 (834.5 s)** | 21:32.8 (1,292.8 s) |
| user / sys CPU | 2,014.9 s / 212.4 s (266 % CPU) | 3,496.8 s / 304.2 s (294 %) |
| max RSS | 4,810,284 KB (4.59 GiB) | 4,858,672 KB (4.63 GiB) |
| computes | 4 | 4 |
| `[core-v2] compute` done in | #1 95.2 s · #3 193.4 s (the #2 and #4 done lines are missing from this log; the log's `compute #4 … after 809 s` line is elapsed time since start, so no #4 duration here) | #1 152.5 s · #2 265.4 s · #3 329.9 s · #4 386.3 s |
| last compute, Base (workers) | not isolated (see phases) | 212.2 s |
| per-phase seconds (`phases.mjs`, all computes) | Base 392 · Tapes 215 · Real 60 · backfill 60 · running 30 (the first ~30 s backfill is not listed) | Base 541 · Tapes 487 · Real 31 · Signals 31 · backfill 30 · running 91 |
| Tape pairs per compute | 1,167 / 1,155 / 1,020 / 1,166 | – |
| report checks | `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` | same single failing check |

Book (`raw.json` trades; unit = one order at one unit, Σr profit / Σr loss):

| | after | baseline |
|---|---:|---:|
| trades (orders) | 8,638 | 8,808 |
| unit PF | 3.99 (229.49 / −57.53) | 4.17 (237.73 / −57.03) |
| net (units) | +171.96 | +180.7 |
| open at end | 4,507 | 4,211 |

Profile totals: main thread 832,955 ms sampled, idle 637,957 ms, GC 56,234 ms (6.8 %); busy about 195 s. Workers (3)
2,409,336 ms sampled, idle 699,639 ms, GC 226,958 ms (9.4 %); busy about 1,710 s. (Baseline busy: main 242.8 s, workers 2,961.2 s.)

## Top 25 self time, main thread (`profsum.mjs`, `(idle)` excluded)

| # | function | file:line | self s |
|---:|---|---|---:|
| 1 | `(garbage collector)` | – | 56.2 |
| 2 | `(program)` | – | 16.4 |
| 3 | `selectFixedGen` | src/core/sim/walkforward.ts:2558 | 15.3 |
| 4 | `unit` | scripts/core-session.mjs:1185 | 7.4 |
| 5 | `seatKey` | src/core/sim/walkforward.ts:2132 | 7.1 |
| 6 | `fill` | src/core/signals.ts:442 | 5.8 |
| 7 | `walkForwardGen` | src/core/sim/walkforward.ts:3686 | 5.0 |
| 8 | `postMessage` | node:internal/worker:380 | 3.4 |
| 9 | `configEvalAt` | src/core/sim/walkforward.ts:2518 | 3.3 |
| 10 | `fill` | src/core/signals.ts:259 | 3.2 |
| 11 | `toArrayBuffer` | node:internal/deps/undici/undici:11883 | 3.2 |
| 12 | `Zlib` | node:zlib:627 | 3.1 |
| 13 | `createUnsafeBuffer` | node:internal/buffer:1082 | 3.1 |
| 14 | `processChunkSync` | node:zlib:407 | 2.9 |
| 15 | `run` | src/core/server/db.server.ts:147 | 2.5 |
| 16 | `(anonymous)` | scripts/core-session.mjs:1 | 2.1 |
| 17 | `unitU` | scripts/core-session.mjs:1186 | 2.1 |
| 18 | `compute` | src/core/server/runtime.server.ts:2371 | 1.9 |
| 19 | `activeSignalsAt` | src/core/sim/walkforward.ts:3324 | 1.6 |
| 20 | `px` | scripts/core-session.mjs:1209 | 1.6 |
| 21 | `no` | src/core/sim/walkforward.ts:2528 | 1.5 |
| 22 | `auditStateGen` | src/core/audit.ts:96 | 1.4 |
| 23 | `(anonymous)` | src/core/market/bingx.ts:25 | 1.3 |
| 24 | `feedBooks` | src/core/sim/walkforward.ts:2052 | 1.2 |
| 25 | `orderKey` | src/core/sizing.ts:41 | 1.2 |

## Top 25 self time, workers (3 threads, `profsum.mjs`, `(idle)` excluded)

| # | function | file:line | self s |
|---:|---|---|---:|
| 1 | `simulate` | src/core/sim/backtest.ts:78 | 317.4 |
| 2 | `(garbage collector)` | – | 227.0 |
| 3 | `runComboSteps` | src/core/pipeline/pipeline.ts:801 | 113.6 |
| 4 | `buildTapesGen` | src/core/sim/walkforward.ts:1421 | 79.0 |
| 5 | `htfBars` | src/core/indications/cache.ts:171 | 72.0 |
| 6 | `(anonymous)` | src/core/pipeline/pipeline.ts:854 | 56.6 |
| 7 | `(anonymous)` (value area) | src/core/indications/research2.ts:545 | 46.5 |
| 8 | `makeTape` | src/core/sim/walkforward.ts:928 | 43.1 |
| 9 | `memo` | src/core/indications/cache.ts:28 | 43.0 |
| 10 | `symStat` | src/core/pipeline/pipeline.ts:322 | 41.9 |
| 11 | `(anonymous)` | src/core/bots/bots.ts:145 | 33.4 |
| 12 | `simulateAxisDesk` | src/core/sim/axis.ts:359 | 33.3 |
| 13 | `nextEntryIndex` | src/core/sim/backtest.ts:305 | 31.4 |
| 14 | `statsOf` | src/core/metrics/stats.ts:64 | 30.1 |
| 15 | `mergeSideTrades` | src/core/sim/backtest.ts:323 | 26.3 |
| 16 | `simulateDca` | src/core/sim/dca.ts:23 | 21.2 |
| 17 | `(anonymous)` | src/core/server/tapes.worker.ts:83 | 18.7 |
| 18 | `splitSides` | src/core/sim/backtest.ts:283 | 17.8 |
| 19 | `(anonymous)` | src/core/indications/research2.ts:453 | 17.6 |
| 20 | `sideSignal` | src/core/sim/backtest.ts:273 | 14.4 |
| 21 | `rsi` | src/core/math/indicators.ts:64 | 13.1 |
| 22 | `state` | src/core/indications/registry.ts:23 | 12.9 |
| 23 | `(anonymous)` | src/core/sim/backtest.ts:327 | 11.8 |
| 24 | `(anonymous)` | src/core/indications/registry.ts:1094 | 11.8 |
| 25 | `packArena` | src/core/sim/walkforward.ts:732 | 11.3 |

Line numbers in this table are from this head (`research2.ts` value-area line is 545 here, 543 in the baseline).

## Comparison with the baseline (`../baseline/README.md`)

- Wall 1,292.8 s → 834.5 s (−35 %). Worker `simulateAxisDesk` self 355.6 s → 33.3 s; `simulateAxis` (axis.ts:77,
  177.2 s in the baseline) is no longer in the top 25; value-area (`research2`) 107.5 s → 46.5 s; `htfBars` 93.6 s → 72.0 s.
- The book moved with the change set: 8,808 → 8,638 orders, unit PF 4.17 → 3.99, net +180.7 → +172.0 units. The baseline
  is `6de980f`, so this difference is not attributable to the two changes alone.

## Files

- `prof-after-summary.json`: the `profsum.mjs` output (top 60 self / top 40 total per thread, unchanged).
- Not committed: `raw.json`, cpuprofiles, html, session files, log.
