# Expanded types and Exit review — 25 October 2026

**Stable positive performance has not been achieved. PF 1 is neutral; PF above 1 means gross net-return gains exceed losses on that settled sample.** Losses, zero executions and open holdings remain in the evidence. These are offline modeled allocations, not venue fills.

The shared PF display now uses neutral color at exactly 1 and positive color above 1 by default. Views with an explicit qualification floor still distinguish positive-but-unqualified samples. A verified sample containing only zero returns displays “Flat (no ratio)”; it is not reported as losing PF 0. These presentation changes do not alter calculations or gates.

## Corrected Expanded execution

Each case uses 12 symbols, 150 hours of fitting history, Last-4, 1/5/15-minute lanes and minute price calculations. Hourly bins are reporting only. The two windows cover 16 October 23:00–17 October 11:00 CEST and 17 October 11:00–23:00 CEST. Counts below are orders opened / settled / held and positions opened / closed / held. Position groups can overlap and must not be added.

| Window | Range/type | PF (neutral 1) | Orders | Positions |
|---|---|---:|---|---|
| Original | Signals / all | 2.8779 | 370/304/66 | 11/6/5 |
| Original | Signals / trailing | 2.4068 | 276/218/58 | 9/4/5 |
| Original | Signals / trailing-only | 6.8465 | 60/54/6 | 7/4/3 |
| Original | Signals / normal | 3.0372 | 34/32/2 | 7/5/2 |
| Original | Exit / all | 0.0393 | 129/74/55 | 10/3/7 |
| Original | Exit / exit:trailing-only | 0.0868 | 69/40/29 | 7/3/4 |
| Original | Exit / exit:trailing | 0.0000 | 35/17/18 | 7/2/5 |
| Original | Exit / exit:breakeven | 0.0000 | 11/5/6 | 5/1/4 |
| Original | Exit / exit:static-sl | 0.0000 | 5/5/0 | 2/2/0 |
| Original | Exit / exit:adaptive-sl | 0.0000 | 9/7/2 | 5/3/2 |
| Later | Exit / all | 0.2267 | 55/52/3 | 10/7/3 |
| Later | Exit / exit:adaptive-sl | 0.0000 | 4/4/0 | 2/2/0 |
| Later | Exit / exit:breakeven | — | 4/4/0 | 1/1/0 |
| Later | Exit / exit:trailing-only | 0.7340 | 30/29/1 | 10/9/1 |
| Later | Exit / exit:trailing | 0.0497 | 17/15/2 | 7/5/2 |
| Later | Signals / all | 0.0399 | 1097/284/813 | 1/0/1 |
| Later | Signals / trailing | 0.1117 | 812/175/637 | 1/0/1 |
| Later | Signals / normal | 0.0000 | 121/49/72 | 1/0/1 |
| Later | Signals / trailing-only | 0.0753 | 164/60/104 | 1/0/1 |

The corrected Expanded whole-account PF is **0.9771 / 0.0899**, with maximum loss-equity drawdown **0.1883% / 1.5785%**. The original positive Signals window does not establish stable performance: the later window loses. Expanded Exit remains below neutral in both windows.

## Open exposure and concentration

The later Signals sample contains 1,097 independent config orders inside one ADA short position. This is correlated exposure, not 1,097 independent market observations. Its settled PF is 0.0399; adding the separately marked 813 held allocations gives a diagnostic PF of 0.0031. Marks are not settled closes and never qualify a configuration.

The original Exit control holds configurations for up to 1,350 minutes (22.5 hours), longer than the 12-hour scored run. It closes seven winning orders while 17 remain held. Its settled sample has no losses; including held marks separately gives PF 1.3136. Expanded Exit remains below neutral even after including endpoint marks: 0.0981 / 0.2248. The endpoint-diagnostic.json file preserves both return sums and every eligible symbol/direction; no open loss was removed from equity.

## Controls and declared comparisons

The original Exit grid on the corrected source reproduces whole-account PF **4.9612 / 0.0679**. Original-window orders: **449/366/83**, positions **14/6/8**. Later-window orders: **860/278/582**, positions **4/2/2**. Exit alone has seven winning closes and no losses in each control window; those small samples have no finite PF. All 68 native checks per control and 78,791,856 independent scalar comparisons pass.

- [Corrected net-breakeven comparison](../expanded-exit-net-20261025/RESULTS.md): all five cost/stability cases, including empty and losing results.
- [Direction-filter comparison](../expanded-exit-trend-20261025/RESULTS.md): all six 1-hour/3-hour EMA cases across earlier/original/later windows. Every Exit result is below PF 1.
- [Intermediate cost comparison](../expanded-exit-cost-20261025/RESULTS.md): retained prior-source results; these predate the exact-zero correction.

No experimental Exit profile or validation default is promoted. Existing Expanded Signal defaults are retained. The comparisons are retrospective; repeated tuning on these windows is not fresh out-of-sample evidence.

## Correctness and processing changes

Exit locks now cover the modeled round-trip cost after sufficient favorable movement, and owned cost survives recomputation/restart. Exact modeled net-breakeven is zero in both directions; material losses are preserved. Optional chronological validation slices apply the same PF, sample and drawdown gates to every slice. Candidate retention occurs after independent qualification.

The broad ordinary runs exposed a separate processing failure: large Base messages exceeded the worker time budget and work repeated in-process; local derived-series caches then accumulated during tape construction. Base messages are now capped at 256 combinations, while retaining every requested combination. The local path releases derived caches every 16 pairs and on completion/cancellation. Tape data, costs, configured ranges and history are unchanged.

The controlled four-symbol synthetic benchmark preserves all **1,080 tapes, 212,784 historical trades, 1,575 open states and 199 pending states** byte-for-byte (SHA-256 in cache-benchmark.json). Peak RSS falls **365.0 → 276.1 MiB (24.3%)**; elapsed time rises **2.18 → 3.45 seconds**. This is a memory/time tradeoff, not a speedup or financial result.

Both 12-symbol/12-hour Signal controls now pass on the processing change. Complete historical journal bytes, frozen settings, hourly qualification, catalog, funded settled/held allocations and account results match the previous source exactly. They retain **21,764,389 historical closes across 252,538 configuration tapes** in the two separate runs, with zero missing configured cells. Each passes all 68 native checks; the independent audits make 78,791,856 scalar comparisons without discrepancies. These are the original Exit-grid controls, not new financial evidence for the experimental Expanded Exit grid.

| Processing rerun | PF (neutral 1) | Orders opened / settled / held | Positions opened / closed / held | Wall time | Child peak RSS |
|---|---:|---|---|---:|---:|
| Original window | 4.9612 | 449 / 366 / 83 | 14 / 6 / 8 | 406.30 s | 3,581.34 MiB |
| Later window | 0.0679 | 860 / 278 / 582 | 4 / 2 / 2 | 368.15 s | 3,531.20 MiB |

The previous controls ran on a different host. Their longer wall times are not a controlled speed comparison; native peak RSS did not decrease. Reproduce the exact comparisons with `scripts/compare-history-processing.mjs` and `scripts/compare-history-bytes.py`; the corresponding JSON receipts retain both source hashes and measurements.

Full CI **40200849871** on **d02ab91c6c2beae9cec0086d0fdfca8feb2b5191** passes every quality/core/slow/verification job. The earlier test-fixture type failure remains recorded in verification.json. The current economic source SHA-256 is `cb4415d4bf602c10ef1946178352c37d7bc6622f0bee19f68728b0daf4648d5b`. The two complete ordinary-range processing reruns in workflow **40200402203** are still running; they are not claimed successful.

The earlier complete ordinary matrices include preserved memory-aborted runs at roughly 14 GB RSS. They are failures and cannot support financial conclusions or hold-time defaults. Fractional scale-outs inside a single Exit configuration remain unimplemented; independently owned config orders and their terminal closes are covered. No live connection was changed or reloaded.
