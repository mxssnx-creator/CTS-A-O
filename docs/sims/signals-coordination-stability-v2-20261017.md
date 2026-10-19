# Signals Coordination v2 stability record

**Status:** stable for offline ratio-band calculation, range-specific PF floors, held-v1 recovery, and coordinator accounting interfaces. Strategy profitability is **not certified**; the earlier selected-pool PF is superseded by a runtime-gate replay.

**Replay validation is currently incomplete:** a last-N tie-order mismatch between replay and runtime was corrected in source, but the frozen candle cache and matching latest raw report are unavailable in this checkout. Historical PF and Base-pass figures below are not certified for the corrected source until that exact replay is regenerated.

## Stable behavior

- New coordinator IDs use v2 and assign each valid directional vote share to one band only: 60–65%, 65–70%, 70–75%, 75–80%, or 80–100%. Each lower bound is inclusive; each of the first four upper bounds is exclusive. The final 80% band includes 100%. Quiet and internally conflicting sources abstain.
- Existing v1 IDs retain their cumulative-threshold meaning. Runtime includes a v1 coordinator pair only while it has an open position, so it can close/recover with the original tape without opening new v1 entries. V1 and v2 result labels remain separate.
- Historical and replay acceptance applies each protection range's own PF floor: Short 1.10, Normal 1.12, Long 1.18 in the frozen run. Strategy/config identities remain independent.
- The 8× Signals Coordination volume factor is retained. It changes size only; PF is evaluated on normalized unit returns. Account and position caps continue to constrain live sizing.

## Verification

The frozen eight-symbol replay used cache SHA-256 `09efe84ff135bad1458995ac36df9bb209e1d56fab671375d171b3c76abdefa4`, covering 53 IS days and 30 OOS days. It processed all 1,200 protection identities for each of 15 band/input identities, both directions, Short/Normal/Long exit ranges, and eligible historic configs: **36,032 config sides**. The figures below are preserved as an audit trail only; the selection omitted runtime Strategy Base gates and is superseded.

| Prior, superseded cohort (not runtime-qualified) | Closes | PF | Net unit-return points |
|---|---:|---:|---:|
| All selected config sides | 1,626,887 | 1.390 | +705,225.2 |
| Short range | 259,633 | 1.302 | +69,497.9 |
| Normal range | 505,873 | 1.327 | +178,523.4 |
| Long range | 861,381 | 1.443 | +457,203.9 |
| Normal strategy | 502,977 | 1.388 | +251,494.2 |
| Trailing strategy | 1,123,910 | 1.391 | +453,731.0 |

The full unfiltered diagnostic was PF 1.005 over 5,832,079 overlapping config-side closes. Only **307/696 active OOS hours (44.1%)** were positive. These are overlapping retrospective unit-return observations, not unique account orders or portfolio P&L. The earlier positive v1 replay used cumulative thresholds and is not a v2 performance comparison.

The focused Signals/coordination checks passed **93/93**, and `npm run typecheck` passed after the evaluator fix. The corrected replay asserts its cache fingerprint, band matrix, runtime protection grid, range PF floors, Strategy Base/last-N evaluation, and IS/OOS boundaries. No exchange or live order path was used. The replay covers Normal and Trailing; it does not establish Exit-strategy market performance or live fill/reconciliation correctness.

## Future evaluation rule

Use the v2 replay and runtime settings as the baseline. Keep qualification based on each config's results after Stage Base and its own Short/Normal/Long PF floor; report unit PF before applying volume factors. Treat hourly green share, order-count throughput, and execution PF as separate acceptance measures. Do not reuse v1 PF numbers or tune thresholds against the frozen OOS window. Reopen this stable status if any regression breaks band exclusivity, range-floor parity, held-v1 recovery, or per-config accounting.

## Runtime-gate correction (2026-10-17)

The earlier PF 1.390 selected-pool figure is withdrawn as a strategy-performance result: its selector omitted the runtime Strategy Base evaluator. The runtime also had a last-N parity bug: Strategy Base selection used the engine's 15-close `validLastN` for Signals, even though Signal entry validation uses `signalValidLastN` (25). A shared resolver now applies the Signals sample consistently in Base selection, `configEval`, and entry validation; diagnostic failure ordering now matches runtime selection. A regression test checks both the Signal and engine paths. The corrected replay calls the runtime protection-grid, `configEval`, and `selectFixed` functions directly, verifies their eligibility sets match, pools long/short trades as the runtime does, and records first-failure reasons. The replay's earlier full-period PF/net screen was removed because runtime admits configs on its rolling Strategy Base window. The default Signals pair-level Base toggle remains off; every protection config still must pass Strategy Base.

On the same frozen cache, **3 of 11,250 Normal and 4 of 20,266 Trailing configs** passed Strategy Base at the IS cutoff; these are seven config identities and 14 directional rows. Normal expanded from 4,500 to 11,250 across the 15 coordinators by adding untrailed 12 h, 32 h and 48 h holds. Trailing expanded from 13,500 to 20,250 standard configs with a 48 h hold. The passing configs all use the General range and the r60-i3 Short + Medium coordinator identity. Exploratory shorter trailing distances and 12 h / 32 h holds did not produce Base passes and were excluded. First-failure counts are retained in `signals-coordination-trade-sim-20261017-expanded.md`.

The 14 selected directional rows produced OOS PF **1.025** over **1,570** overlapping closes, with net **+72.5** unit-return points; including endpoint marks, PF was **1.008** and net was **+23.1** points. Of 320 active OOS hours, 169 were green (52.8%). This is a small retrospective sample concentrated in one coordinator identity; it is not a portfolio result or profitability certification. The all-config OOS diagnostic was PF **1.011** over **9,957,615** overlapping closes (Normal-only 1.012; Trailing-only 1.036). These results show the last-N history is present and seven configs pass the runtime Base at the cutoff, while most candidates still fail net/PF or stability gates. No PF, drawdown, or last-N threshold was relaxed to produce a pass.
