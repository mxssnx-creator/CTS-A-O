# Expanded types and Exit review — 25 October 2026

**Stable positive performance has not been achieved. PF 1 is neutral; PF above 1 means gross net-return gains exceed losses on that settled sample.** Losses, zero executions and open holdings remain in the evidence. These are offline modeled allocations, not venue fills.

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

## Controls and declared comparisons

The original Exit grid on the corrected source reproduces whole-account PF **4.9612 / 0.0679**. Original-window orders: **449/366/83**, positions **14/6/8**. Later-window orders: **860/278/582**, positions **4/2/2**. Exit alone has seven winning closes and no losses in each control window; those small samples have no finite PF. All 68 native checks per control and 78,791,856 independent scalar comparisons pass.

- [Corrected net-breakeven comparison](../expanded-exit-net-20261025/RESULTS.md): all five cost/stability cases, including empty and losing results.
- [Direction-filter comparison](../expanded-exit-trend-20261025/RESULTS.md): all six 1-hour/3-hour EMA cases across earlier/original/later windows. Every Exit result is below PF 1.
- [Intermediate cost comparison](../expanded-exit-cost-20261025/RESULTS.md): retained prior-source results; these predate the exact-zero correction.

No experimental Exit profile or validation default is promoted. Existing Expanded Signal defaults are retained. The comparisons are retrospective; repeated tuning on these windows is not fresh out-of-sample evidence.

## Correctness and processing changes

Exit locks now cover the modeled round-trip cost after sufficient favorable movement, and owned cost survives recomputation/restart. Exact modeled net-breakeven is zero in both directions; material losses are preserved. Optional chronological validation slices apply the same PF, sample and drawdown gates to every slice. Candidate retention occurs after independent qualification.

The broad ordinary runs exposed a separate processing failure: large Base messages exceeded the worker time budget and work repeated in-process; local derived-series caches then accumulated during tape construction. Base messages are now capped at 256 combinations, while retaining every requested combination. The local path releases derived caches every 16 pairs and on completion/cancellation. Tape data, costs, configured ranges and history are unchanged.

The controlled four-symbol synthetic benchmark preserves all **1,080 tapes, 212,784 historical trades, 1,575 open states and 199 pending states** byte-for-byte (SHA-256 in cache-benchmark.json). Peak RSS falls **365.0 → 276.1 MiB (24.3%)**; elapsed time rises **2.18 → 3.45 seconds**. This is a memory/time tradeoff, not a speedup or financial result. Broader native validation of the processing change is pending.

Before this final processing change, full CI on ccc952e passed every quality/core/slow job. After it, 95 focused history/worker/publication/incremental tests, typecheck, worker build and scoped lint pass. Current source SHA-256: `cb4415d4bf602c10ef1946178352c37d7bc6622f0bee19f68728b0daf4648d5b`. Full CI and the new native processing workflow still need completion.

The earlier complete ordinary matrices include preserved memory-aborted runs at roughly 14 GB RSS. They are failures and cannot support financial conclusions or hold-time defaults. Fractional scale-outs inside a single Exit configuration remain unimplemented; independently owned config orders and their terminal closes are covered. No live connection was changed or reloaded.
