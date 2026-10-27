# Exploratory past-move leads in the later capped replay

This is a post-hoc comparison of two **previously examined** windows, not a
fresh holdout and not a comparison of identical strategies. The earlier
9 October 12:00–10 October 12:00 UTC results were overlapping, unallocated
candidate records across 1m, 5m and 15m, with regular and capped-trailing
cells; they did not include the later runtime's trailing-only cells or full
account and symbol-specific admission. The later run uses 20 Binance USD-M
symbols and a single 5m lane from 19 October 00:00–20 October 00:00 UTC,
with entry tactics off, realized-balance caps, and funded **modeled** orders
in both directions. Both studies were already examined; candidate trades
and modeled funded orders are not venue fills. BingX is the live exchange,
so Binance prices and modeled costs do not establish BingX fill performance.

The earlier pooled candidate evidence is retained below to identify the
two post-hoc leads. Its validation denominator is direction contexts, and
its candidate PF is subsequent unallocated records; the later validation
denominator is configurations. Historical validation PF and subsequent
execution PF are always separate:

| Relation | Earlier validated contexts | Earlier historical PF | Earlier later candidate records / PF | Later start configs validated | Later funded long / short settled | Later funded return PF |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| trend-move-reverse | 209 / 426 (49.06%) | 5.153 | 2,667 / 1.424 | 0 / 8 (0%) | 0 / 0 | unavailable |
| trend-breakout-move-reverse | 140 / 432 (32.41%) | 2.886 | 276 / 2.197 | 0 / 0 (unavailable) | 0 / 0 | unavailable |

At the later run start there was no validated historical-PF sample in
either relation. Across all 24 causal validation snapshots,
trend-move-reverse had eight distinct evaluated configs and **0 of 192
config-hour checks passed**; trend-breakout-move-reverse had no config
checks. Neither relation had an allocated settled order or an allocated
held order. Consequently the later run cannot say whether either earlier
lead would have earned or lost money if it had traded. Its absence from
the funded cohort is not an execution PF of zero and does not validate
the earlier selection.

The earlier 5m-only slice had 201 / 404 direction contexts validated for
trend-move-reverse (historical PF 5.324), followed by 2,546 unallocated
candidate records with PF 1.452. Trend-breakout-move-reverse had 131 /
408 contexts validated (historical PF 2.911), followed by 131 candidate
records with no recorded loss. Those records overlap, were selected after
observation, and are not matched trades or an account-level strategy in
the later run; a no-loss ratio is not an infinite or guaranteed PF.

For scope, the complete later cohort had **10,439 / 14,702** configs
validated at start (71.00%, historical pooled return PF 4.570829) and then
135,811 funded modeled settled orders with unit-return PF **0.274964**.
There were 9,052 known-zero-allocated settled rows, seven funded held
orders and three known-zero held rows. Cash net for the funded settled
cohort was −$0.288909 from a $10 initial modeled balance; this is not a
statement of marked equity or live-account performance.

The output `runtime-195-5m-capped/relation-comparison.json` contains all 13
source relations, exact long/short funded returns, symbol/hour breakdowns,
initial checks and 24-step progression. Its catalog matches all 195
complete source names rather than using partial string overlaps. Every
validation and sized-order sidecar is read to completion and checked by the
existing checksummed reader. Counts, funded GP, GL and cash reconcile to
the original audit; known-zero allocation is excluded and unknown allocation
fails the analysis. The source run's economic SHA-256 remains
`d4847b799025e5309ce575e762e38525e93016350244b8457fcc5e7102e29d42`.

Reproduce while the source run and its checksummed sidecars are available:

```sh
node --test scripts/lib/low-range-relation-comparison.test.mjs
node scripts/compare-low-range-relations.mjs RUN_DIR \
  docs/low-range-research-20261027/past-move-candidate-v1/results.json OUTPUT_JSON
```

`RUN_DIR` is the original capped study directory; `OUTPUT_JSON` must not
already exist. The output contains input hashes and sidecar hashes. This
analysis does not alter source settings or run any exchange operation.
