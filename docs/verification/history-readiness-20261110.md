# Evaluated history, sample coverage and exact PF policy — 10 November 2026

Source base: `057f9d1` (processed replay release). This change extends that release; the opt-in modeled adapter remains separate from unfinished persistent paper/venue ownership. No account was started or changed.

## History and sample definitions

Fresh ordinary walk-forward defaults now use 48 hours for `preH` and `longH`. Explicit saved values are preserved, including deliberately shorter research windows and longer custom histories. Signal/Exit defaults remain 150 hours. The existing `evaluationHistorySettings`, `strategyDataHours` and `marketHistoryBars` paths carry the longer request into per-lane retention, minute-candle storage and backfill; indicator warmup and the simulated period are additional requirements, not hidden evaluated samples. Research runs must still pin a total window of at most 72 hours.

Completed-cohort Progress now also displays a `history` row. Its minimum is the actual config evaluator's `minTrades` policy (including independent Exit minimums), and its window is the actual ordinary or Signal history. Each denominator is the full built config × configured symbol × both-direction catalogue, including empty contexts. The snapshot clock excludes same-clock and future closes. A full finite losing history is sample-ready; readiness does not assert PF qualification. Corrupt time/ownership and carried histories are unknown. Held-only configurations manage existing positions and remain excluded from new-entry sample readiness.

Validation, entry and range Last-N rows retain their own preceding-completed-close windows; changing evaluation hours does not relabel those windows. The report explicitly identifies its built-catalogue scope rather than claiming unbuilt configurations were evaluated. Native persistent processed-stage coverage is unavailable while the paper/venue adapter is pending. The opt-in replay's separate processed ledger remains the source for modeled Main/Real coverage.

Deterministic bounded fixture, not market performance: two configs × two symbols × two directions give eight contexts. Extending the evaluated window from 24h to 48h changes history readiness from **1/8 (12.5%) to 2/8 (25%)**; the newly full history contains losses and remains counted. Last-N readiness is unchanged at 2/8 because it has a different clock/window. Empty siblings stay in both denominators. Signal history stays 150h in metadata; the fixture does not load 150h of market data.

## PF consistency

Configured SL/TP PF overrides were previously read by walk-forward but omitted from full Base cell counts, representative Base range validation and native live floors. These paths now use the same effective configured SL/TP ratio, after the cost/minimum-stop adjustment, and preserve stricter range/live floors. Trailing-only configurations with no TP do not invent an SL/TP ratio. Signal economics remain independently defined.

A reproduction with two same-range cells at measured PF 1.5 formerly admitted both even though one SL policy required 1.6. The stricter cell now fails and the sibling with the lower own floor passes. Snapshotting a Base count deep-copies override maps, and malformed or duplicate numeric policy keys are rejected instead of depending on insertion order. This fixes qualification consistency; it does not manufacture profitable outcomes.

## Verification and limits

New history/sample/native-floor/processed checks: 24 pass, zero fail and one existing persistent-adapter TODO. The actual Progress component renders 25.0%, 48h, independent 150h and unavailable status: three component tests pass. The PF audit's focused arithmetic/counter tests pass, with detailed commands in the release handoff.

One early audit accidentally matched an enclosing Node test suite and ran its inherited 200h synthetic Base fixture. That result is not counted as compliant bounded evidence. The touched Base-cell and range-parity fixtures were subsequently bounded to 72h with the original arithmetic/identity assertions preserved, and rerun. New market studies must never use that earlier oversize run as evidence.

No new current-policy market post-Base PF, validated percentage or venue PF is measured here. Unchanged OLD 8–9 October cohort: Base 143/1,398 (10.2289%), post-Base 405/1,276 (31.7398%), finite historical mean PF 17.399524089 plus six no-loss contexts; subsequent funded-model PF 0.273050873. Positions 52/49/3 and orders 3,116/3,108/8 opened/closed/held. These historical figures do not qualify the changed policy or establish future profitability.

## Frozen market candidate coverage

On the same 12-symbol, 72-hour minute dataset (6 November 06:00 through 9 November 06:00 UTC), the native compact candidate catalogue has 960 exact config × symbol × direction contexts. At the start of the final 24 hours, at least 12 own completed candidate closes are available in:

| Range | 24h history | 48h history |
|---|---:|---:|
| Micro | 191/192 (99.48%) | 192/192 (100%) |
| Minimal | 354/384 (92.19%) | 384/384 (100%) |
| Short | 307/384 (79.95%) | 374/384 (97.40%) |
| Overall | 852/960 (88.75%) | 950/960 (98.96%) |

The independent scalar audit checks all 1,920 contexts across both histories, and 80 truncated-past config comparisons match with zero differences. This is candidate sample coverage, not Base qualification or processed/venue PF. See `history-readiness-20261110/market-coverage.json` for source/data hashes and timings.

The follow-up audit also carries own step/SL metadata into the default representative Base proof and its counts, rejection reasons and sensitivity table. Default-cell fallback cannot waive a stricter SL policy. Legacy proofs without the required metadata remain unavailable.

The standalone live report transport retries only read requests. Unknown POST/PUT/PATCH/DELETE outcomes are never blindly retried. Transport and UI verification remains separate from any live account acceptance.
