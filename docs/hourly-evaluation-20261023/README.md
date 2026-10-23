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


### One-minute warmup refinement

A per-lane warmup experiment was rejected after it changed three source/lane results (four entry decisions) on the retained 100h+12h window: AVAX RSI2 and coordination at the boundary, and DOT BB-width expansion later in the sample. The revised version preserves the common derived-lane warmup and reduces only the one-minute base lane from 18,840 to 8,516 candles per symbol. All 9,963,600 retained entry decisions across 12 symbols × 380 configured source/lanes then matched exactly. The 24-hour general indicator allowance, 356 one-minute tactic warmup bars, 100h evaluation and 12h simulation remain. Higher lanes retain their required warmup. Full tape/execution parity and final replay timing remain pending.

Research preflight now checks the current shared Signal policy instead of hardcoding Last-25. The optional pruning experiment preserves its frozen baseline's own Signal Last-N; archived protocols/evidence are unchanged. Its 24 focused tests pass.


### Bounded Signal simulation and capacity checkpoint, 23 October

The isolated 12-symbol replay at source `68472702d84eab8a8d2e249fcde4a320a75c9bc1200f916b3f28d70176122193` completed historic preparation in approximately 260 seconds, then exhausted the 4096 MB V8 heap around 294 seconds in Real. This is a failed run, not PF evidence. Host RAM alone did not detect the separate heap ceiling.

The next checkpoint registers immutable acceptance tapes without expanding every config/symbol/direction prefix. Requested groups use an LRU bounded to 4096 groups / 32 MiB; eviction reconstructs from full evidence. Signal candidate indices use four bytes per row, and full candidate objects are assembled and released in one-minute batches. Workers and shared input references are retired before an explicit phase-boundary collection. The memory guard also checks V8 heap headroom.

Eight identical-tape, 12-hour before/after comparisons preserve the entire result (orders, open marks, candidate counts, skips, validations, feed and hourly summaries), at selection cadences of 1/60, 1/4, 1 and 3 hours, both static and ranked activation. Each has 4944 candidates / 2880 settled modeled orders; these synthetic outcomes are correctness fixtures. Small-fixture timings include cache/batching overhead and are not an end-to-end speedup claim. Targeted correctness/publication/memory checks: 195/195 pass.

Raised configurable ceilings: engine grid 20,000→100,000; Signal/coordination positive count cap 2000→10,000 (zero still unlimited); trailing-only grid 64→256; ATR grid 600→2400; historic grid 200→1000; Exit configs/source 128→512. Accepted Signal list values are retained up to the validator's 64-value limit instead of silently discarding values after eight. Trading costs, PF gates, configured default counts and account exposure settings are unchanged.

Hourly means reporting/consistency aggregation. OHLCV and entry/exit calculations remain minute based. Existing configurable background selection cadence remains separate from the causal gate checked at each entry timestamp. No artificial hourly profit/count monotonicity is imposed. The synthetic lifecycle test's unconditional positive terminal activation failed before these memory changes too; it now verifies the measured exact terminal activation, while deterministic positive/losing gate fixtures remain. Full market replay and release verification are pending.


### Multi-lane acceptance fallback repair

The first bounded-cache replay still failed at ~295 seconds / 4 GiB V8 heap. Profiling localized expansion to acceptance-index initialization. The production tape symbol dictionary repeats symbols across initialized lanes; the former unique-symbol precondition routed every such tape to the eager generic path. Canonical symbol slots now aggregate aliases in original close order, allowing the lazy path without dropping any return or onset. Duplicate-config and unordered-input fallbacks remain. Identity maps also reuse existing config strings. Between-slice heap checks bypass the one-second cached reading near the V8 limit.

39 targeted tests pass, including exact scalar alias aggregation, immutable incremental generations, memory checks, atomic publication and the complete candidate-lifetime snapshot. The earlier CI completed 3313 core cases with only one failing fixture: its archived 336h history was implicit and inherited the new 100h default. Pinning the archived 336h input yields the exact same 42 settled orders, 48 feed entries and full-result hash on parent 5a6285e and current code (`b88ca89d72f1217210603fb4aefa109920107fbfadd991a035cb8746f7629693`). No snapshot output was suppressed. A fresh isolated replay is required after this repair.
