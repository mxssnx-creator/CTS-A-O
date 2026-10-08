# Perf: simulation and test speed, second round (8 Oct)

Scope: the simulator, the indication filters and the walk-forward selection (exact speedups: the same outputs, pinned by
reference tests and by benchmark digests), the test suite (timing, one file that was the critical path, and the test
expectations that had gone stale). Live desks were not touched: the x02 stall track (`../after/README.md`, plan
Phase 1) still waits for a restart go-ahead.

## Benchmarks (same machine, same inputs; digests equal before and after)

Each bench is a script in `scripts/perf/`; the digest is a hash of the full output, so equal digests mean equal results.

| bench | what it runs | before (`c2d757d`) | after | digest (both) |
|---|---|---:|---:|---|
| `base-bench.ts --symbols 12` | Base (`baseRuns`): 238 combos, 33,260 trades | 3.3–3.6 s | 2.0–2.1 s | `9681ecac8e46f1fb` |
| `tapes-bench.ts --symbols 4` | `buildTapesGen`, 1,026 protect cells × 112 combos: 114,912 tapes, 1.74 M trades | 1.7–2.4 s | 1.6–2.2 s | `f8e193264fe89289` |
| `walkforward-bench.ts --symbols 4` | the same tapes and one fixed-mode walk-forward | 1.1–1.3 s | 1.1–1.3 s | `5bd0b20f701b6129` |

Timings are ranges of repeated runs on a 4-core host; the host ran other work during some of them, so only the digests
and the profile shares are exact. The Base bench's gain is mostly the filter change (below).

## What changed

Each change is exact. Each has a reference test that runs the original code next to the new one.

1. **Volatility-regime filters** (`indications/filters.ts`). The rolling percentile scanned the previous 336 values for
   every bar (O(n·p)). It now counts the window in a Fenwick tree over the ranks of the distinct values (O(n log n)),
   with −0 and +0 as one value, as `<` treats them. The other filters read each series once instead of per bar (a memo
   lookup builds its key string on every call). In the Base profile the scan was 40 % of the time. Test:
   `indications/filters-exact.test.ts` (scan vs Fenwick on gaps, ties and signed zeros; every filter vs the original
   closures on two series, with and without a reference symbol).
2. **Higher-timeframe bars** (`indications/cache.ts`, `htfBars`). The completed bars go into typed arrays of the base
   length, copied to their exact length at the end, instead of growing JS arrays. Test: `indications/cache-exact.test.ts`
   (regular, gappy, one bar and empty series; factors 1, 2, 4, 16).
3. **Simulator** (`sim/backtest.ts`, `simulate`). The excursions (mfe / mae) come from the highest high and the lowest
   low of the bars held, not from two divisions per bar: (x − entry) / entry is monotone in x, so the extreme bar is the
   extreme excursion. The exit time is computed when a trade closes. Test: `sim/simulate-exact.test.ts` (76 cases: every
   field of the result against the original per-bar code, on random bars with gaps, long and short, fixed and trailing
   exits, free trails, time exits, cooldowns and ATR protects).
4. **Symbol stats** (`pipeline/pipeline.ts`, `symStat`). The positive 4-hour blocks are summed run by run for a trade list
   in exit order (every list the engine passes is); any other list keeps the map. Test: `pipeline/symstat-exact.test.ts`.
5. **Walk-forward selection** (`sim/walkforward.ts`, `seatOf`). A tape's seat key and pair key are built once per tape
   and seat mode (the key reads the options only through the mode). Building them at every step, for every tape, was
   the selection's main garbage: 700 of 2,900 line ticks of `selectFixedGen` were one template string and a set lookup.

Profile after the changes, the walk-forward bench (share of self time): garbage collector 19 %, `simulate` 13 %,
`selectFixedGen` 12 %, `makeTape` 11 %. The collector and `makeTape` are the remaining structural costs: a trade is an
object until the tape is packed. Changing that is a format change, not an exact speedup, and is not in this round.

## Test suite

Per-file wall times at `c2d757d`, two files at a time (`npm run test:core` uses two; the sum over the files that
finished is about 16 minutes of work). The slowest:

| file | seconds |
|---|---:|
| `book-coverage.test.ts` | 166 |
| `server/heal.test.ts` | 165 |
| `sim/block-matrix.test.ts` | 145 |
| `processing.test.ts` (failed, see below) | 86 |
| `server/trading-e2e.test.ts` | 74 |
| `api-contract.test.ts` | 71 |
| `server/fast.test.ts` | 64 |
| `exchange/stuck-requests.test.ts` | 39 |
| `server/pool.test.ts` | 25 |
| `server/runtime.test.ts` | more than 15 min (stopped after 21 of 28 tests) |

`runtime.test.ts` was the critical path: every test computes a full synthetic runtime (20–45 s per compute), and the
file ran its 28 tests one after another. It is now four files that node runs in parallel:
`runtime.test.ts` (the walk-forward patch sanitiser and the first half of the coordination tests),
`runtime-coordination.test.ts` (a research preset, the stress storm, the open-position and entries paths, the cycle
guard), `runtime-progress.test.ts` and `runtime-restart.test.ts`. The shared settings and helpers are in
`server/runtime-harness.ts`. Their test names are unchanged. `scripts/test-all.mjs` lists the four files.

After the change, on the same 4-core host:

- the four files together, in parallel: 364 s wall (28 tests, one failing at the time, fixed below);
- `runtime-coordination.test.ts` alone: 378 s wall (8 tests, all passing), so it is the longest part now;
- the full `npm run test:core` (concurrency 2, as the script runs it): **1,413 tests, 1,412 pass, 0 fail, 1 todo**
  (the pre-existing TODO in `regression.test.ts`), 792 s wall. This run was not measured end to end at `c2d757d`, where
  the critical file alone ran for more than 15 minutes before it was stopped.

Expectations that had gone stale, fixed to read the runtime's own Base set (`baseFocus` and Micro's lane floor, from
`0f511c2`, which keeps Micro combos below `grid.micro.minTf` out of Base):

- `processing.test.ts`: "Base evaluates every combo of every lane" expected 2,360 more combos; it failed at `c2d757d`.
- `runtime-coordination.test.ts`: "applies a research preset …" expected 202 Base evaluations, the runtime ran 792; its
  tape check also rejected Micro's own lane pairs, which the Base focus holds.

Load-sensitive: "keeps the event loop responsive during a compute" (bound 250 ms) measured 304 ms in one run at
`c2d757d` while the other suites ran beside it. It is a timer-gap test: it passes on an idle host and is noisy on a
busy one, so it should run in a quiet window, not beside a benchmark. It passed in the full run above.

## Not in this round

- The x02 stall measurement and fixes (plan Phase 1): a restart of a live desk, held for the go-ahead.
- Turning the synthetic computes into fewer, larger tests (coverage would change) and a shared compute per file.
- The per-trade object in the simulator and tape builder (the collector's share above).
