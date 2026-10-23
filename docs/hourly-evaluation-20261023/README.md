# Hourly evaluation consistency — 23 October 2026

Work starts from `5a6285ecd5c10ff3743e621670e8831f559f611f`.

## Reproduced defects

- `validatedSetGen` used pooled config returns and the ordinary history window, unlike hourly selection and entry. A losing opposite direction could remove a qualified direction from the initial validated pool. Signals could lose their independent 336-hour history, and several individually insufficient Signal contexts could qualify as one pooled context. The initial pool now calls the same independent evaluator as later selection. Existing Base/cell/held-only admission rules remain in force.
- Signal evaluation memoization omitted Exit minimum PF, minimum sample, green-hour share and maximum drawdown ratio. Editing those settings at the same market clock could reuse an obsolete verdict. All four fields now invalidate the cached evaluation.
- The multi-window pipeline evaluator read the end of its supplied tape rather than stopping at `nowT`. A retained full replay could include future closes in time windows, Last-N and the ranking score. Binary boundaries now include only closes at or before the requested clock.

Signal context evaluation now copies typed columns directly in original tied order, retaining every past return and Last-N observation while excluding the unobserved future. It no longer allocates and sorts an intermediate Trade object for every history row. No thresholds, costs, returns or source formulas were tuned to these test outcomes.

## Checkpoint verification

The initial 13 reproductions all fail on the parent implementation and pass after repair. The expanded gate matrix passes 237 tests across 14 suites, including seven ranges, three lanes and seven strategy types. The selection-index suite passes 6/6, including actual walk-forward execution and reused-versus-fresh cache comparisons. TypeScript passed after the initial code repair; full release verification and market replays are still in progress.

The first deterministic performance probe preserves all 10,000 config verdicts and 240,000 context results byte-for-byte (`51023a46c164150b066033cec70c41a14a81a9a2a3751066e404d9758072599d`). Final isolated timings and market results will be appended after completion. Synthetic passing samples establish correctness, not future trading profit.

No live instance, settings, database or venue orders were changed. A high and stable forward PF across every hour/range/type is not established by this checkpoint.


## Operator update: 100-hour Signal history / Last-8

The 23 October request changes Signal and Exit history defaults to 100 hours and their validation to Last-8. Existing factory settings/presets migrate once with a saved backup; explicit custom choices survive. Signal inputs remain one-minute OHLCV, with all configured lanes, sources, protection grids, costs and PF floors retained. Indicator warmup and replay candles are additional physical inputs, not an extension of the 100-hour evaluation window.

The lane loader previously used Signal history as a minimum, allowing ordinary 18-day retention to expand Signal processing. Full, incremental, preset and Base worker/local Signal paths now use their separately bounded candle span. Historical MFE uses monotone extrema queues instead of rescanning every hold for every entry. Scalar equality includes both directions, sparse/dense entries, boundary cuts and nonfinite prices.

Preliminary isolated CPU benchmark (12 synthetic symbols, one-minute data, three timed repetitions): 100-hour / 18,000 excursions, scalar median 62.179 ms versus rolling 5.867 ms (10.60x). At 336 hours / 69,120 excursions: 398.010 ms versus 12.104 ms (32.88x). Exact output hashes match at each history length. This measures excursion extraction, not total trade simulation or profitability. Reproduce with `node --experimental-strip-types --no-warnings scripts/perf/signal-history-bench.ts`.

The frozen 336-hour, 12-symbol baseline reached Real at 991 seconds and aborted for memory pressure around 6.4 GB RSS. Its automatic retry was stopped; it is **not a completed trading study**. The requested 100-hour, 12-hour simulation and release checks are pending at this checkpoint.
