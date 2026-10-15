# Frozen Micro / Minimal / Short development study — 15 October 2026

No profile qualified for promotion. All three profiles failed the frozen two-fold requirement of at least 30 funded settled onsets and finite accepted-virtual and funded return PF >=1.1 in each fold. No outer data was acquired. More historical cells qualified with P1, but its executed return PF deteriorated. This is a bounded retrospective development study of four symbols and 32 existing 15m regular/combined indications; it does not establish systemwide or live profitability.

| Fold | Profile | Range | Base passed / evaluated | ConfigEval passed / evaluated | Virtual closes / return PF | Funded closes / return PF | Cash PF |
|---|---|---|---:|---:|---:|---:|---:|
| 1 | P0 | Micro | 4/32 | 255/2040 | 0 / unavailable | 0 / unavailable | unavailable |
| 1 | P0 | Minimal | 3/32 | 235/1064 | 0 / unavailable | 0 / unavailable | unavailable |
| 1 | P0 | Short | 1/32 | 139/280 | 0 / unavailable | 0 / unavailable | unavailable |
| 1 | P1 | Micro | 4/32 | 371/2720 | 0 / unavailable | 0 / unavailable | unavailable |
| 1 | P1 | Minimal | 4/32 | 288/1456 | 0 / unavailable | 0 / unavailable | unavailable |
| 1 | P1 | Short | 3/32 | 183/560 | 0 / unavailable | 0 / unavailable | unavailable |
| 1 | P2 | Micro | 4/32 | 255/2040 | 0 / unavailable | 0 / unavailable | unavailable |
| 1 | P2 | Minimal | 3/32 | 235/1064 | 0 / unavailable | 0 / unavailable | unavailable |
| 1 | P2 | Short | 1/32 | 139/280 | 0 / unavailable | 0 / unavailable | unavailable |
| 2 | P0 | Micro | 5/32 | 170/2584 | 74 / 0.8617 | 74 / 0.8617 | 1.0815 |
| 2 | P0 | Minimal | 4/32 | 17/840 | 16 / no losses; undefined | 16 / no losses; undefined | no losses; undefined |
| 2 | P0 | Short | 3/32 | 52/560 | 0 / unavailable | 0 / unavailable | unavailable |
| 2 | P1 | Micro | 5/32 | 242/2992 | 88 / 0.4904 | 88 / 0.4904 | 1.1917 |
| 2 | P1 | Minimal | 4/32 | 62/1176 | 24 / 0.4438 | 24 / 0.4438 | 1.6230 |
| 2 | P1 | Short | 4/32 | 52/672 | 0 / unavailable | 0 / unavailable | unavailable |
| 2 | P2 | Micro | 5/32 | 170/2584 | 74 / 0.8617 | 74 / 0.8617 | 1.0815 |
| 2 | P2 | Minimal | 4/32 | 17/840 | 16 / no losses; undefined | 16 / no losses; undefined | no losses; undefined |
| 2 | P2 | Short | 3/32 | 52/560 | 0 / unavailable | 0 / unavailable | unavailable |

P0 is the corrected scoped baseline. P1 adds the existing causal trailing Base cell. P2 enables existing engine-side acceptance at 1.05/24h/30 closes and produces the same accepted trades as P0 in these windows; there are no additional engine-side rejection events in the captured skips. Every other gate, current TP/SL/trail/hold cell and 0.20% round-trip cost stayed unchanged. Requested/configured 57,344 cells per profile are separate from evaluated, qualified and funded cells. Block volume is removed from primary unit returns; cash PF is a separate allocation-weighted diagnostic on the same owned cohort. A cash PF above 1 cannot rescue a losing return PF.

Fold 1 is 13 October 22:00→14 October 04:00 UTC; fold 2 is 14 October 22:00→15 October 04:00 UTC. Each has 72h of evaluated prehistory on the focused 15m and higher supporting 30m series, with 205h of earlier indicator context. The two windows had already been seen and are retrospective development only.

The frozen source is 3834804ffae367a0c0a4a7cab1330cf200ff4791, source SHA256 c4b9732334500c9047cd80b15be4cbaf17d964207032aabc27e28a36418ffaeb, protocol SHA256 c3bee5d76710d4de16c135ecae4cbaa5ac419549bd16b0b18134819558460316. The original six startup failures are preserved under attempt-01-startup-failed. A harness-only repair materializes complete runtime settings and production-normalized settings/WF hashes; fourteen focused tests passed, including actual stopped-runtime application with zero computes. No core default or market-performance gate changed in this repair. The generic Base sets prefilter remains at PF 1.0 (gates.baseSetsMinPf); Tactic's full indication floor remains 1.1 in Base and every later qualification. The aggregate Base minimum therefore is not a uniform PF 1.1 proof for every indication. Actual configEval and frozen finite execution PF requirements remain separate.

## Qualification and causal rejection

P1 improved Short Base admission from 1 to 3 pairs in fold 1 and 3 to 4 in fold 2; initial Short configEval passes rose 139→183 in fold 1 and stayed 52 in fold 2. These are real historical qualification counts, not execution proof. All exact config/symbol/direction 30-onset research proof counts are 0: the largest retained own prehistory samples are 8 onsets for Micro/Minimal and 6–7 for Short. Missing unretained histories stay unknown.

In fold 1, all recorded execution-step candidate counts are 0 and skips are empty. Ever-seated retained tapes contain no entries starting inside the trading window; their latest entry is 7h before its start (Short 10.5h). Pre-start entries that exit during the run remain excluded from its new-entry execution cohort. This is absence of qualifying fresh opportunities in the frozen scoped pool, rather than a late coordination veto. The confirmation rule in walkforward.ts applies only to Signals; Signals are disabled here. All four fold 1 inputs contain 360 gapless minute bars and positive volume on every bar. Distinct closes are BTC 355, ETH 328, SOL 314 and XRP 114. Their high/low ranges are 1.0019%, 1.0305%, 1.6110% and 1.1001%, respectively, against 0.7758%, 1.1311%, 1.2993% and 1.1531% in the preceding six hours. These active, changing inputs rule out flat or missing-candle inputs as the explanation for the zero entries; they do not independently authenticate venue freshness. Fold 2 ranges are larger at 2.0809%, 4.8411%, 4.1852% and 4.0025%. These facts establish input activity; they do not establish that an indication should fire. Market-input-sanity.csv retains every exact comparison.

In fold 2, Short has 10 closed opportunities among retained ever-seated tapes. Eight are not configEval-qualified in their actual entry hour. The two remaining XRP short entries at 03:00 UTC fail the causal own-symbol/side gate: their prior five closes have PF 0.7959115653 and net return −0.0024260957. Their later small positive results do not justify waiving this gate. Short therefore has zero accepted/funded orders. The full exact protections, timestamps, prior sample and outcome diagnostics are retained separately.

## Input horizon: observed versus reconstructed

Raw evidence directly records the four actual symbols, lanes [1,15,30], evaluationFromT, both six-hour endpoints, exact initial validation and all six hourly cuts. It does not persist physical candle/lane origins. Horizon-reconstruction.json therefore explicitly reports a deterministic reconstruction from sealed feed/settings using unchanged production readStored, CandleSeries, laneSeriesOf, headBars and makeUniverse; it is not presented as measured persisted runtime telemetry.

The runtime history request/store retains all 16,980 prepared 1m bars per symbol (283h). The focused 15m and supporting 30m series retain 1,132/566 completed bars, with exactly 820/410 completed indicator-warmup bars and 288/144 prehistory bars before trading. Production tfDays['1']=3 separately limits the mandatory 1m analysis lane to 72h, hence only 66h before the trade start: it does not satisfy 72h prehistory on every configured data lane. No 1m outcome IDs are in focus. Source higherFactors uses only higher enabled timeframes, so 15m combined uses 30m, while market references are grouped by their own timeframe. This supports the bounded focused-lane reconstruction; it does not establish complete 1m or all-timeframe validation.

## Checks and files

All six engines exited 0 at full memory level 0 and preserve every hourly cell. Fold 1 retains five failed activity checks per profile: Normal, Trailing, Micro, Minimal and Short executed no orders. Each fold 2 case retains the failed Short activity check. Thus 18 failed check occurrences remain visible; the study never claims all checks passed. The strict harness marks fold 1 incomplete for its missing strategy-type activity. Fold2 capture is complete while its Short activity check is still explicitly false. None of these empty cohorts is PF 0 or profitable.

The development-report directory contains the 18-row range waterfall, 36 range/direction rows, 576 indication/lane/range rows, all 864 hourly cells, all failed checks, frozen false-eligibility JSON, input sanity, loader reconstruction and exact Short rejection details. Each case retains full exact config-side and config/symbol/direction proof CSVs, exact TP/SL/trail/hold metadata, accepted/funded close slices, endpoint marks, raw/book JSON and hashes. Endpoint marks remain separate from settled PF.

The next falsifiable research question is whether a larger predeclared causal training period and new evaluation windows produce enough exact own-symbol/side onsets and settled funded outcomes without lowering gates. P1's increased admission alone is not a successful optimization; P2 demonstrates no measured improvement here. No losing side or cell was dropped, no parameter was selected after inspecting these results, and no live promotion is justified by this study.
