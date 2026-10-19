# Completed trading studies — 17 October 2026

## Result

All four 20-symbol development cases, both 22-symbol/24-hour source windows and all four account-risk arms completed independent evidence/accounting checks. **No case qualifies for live promotion.** The profitable final source window is financially infeasible; the risk-capped frozen candidate has low modeled drawdown but loses money. Signals and trailing-only have no funded settled execution evidence in these studies. No config, range or indication was pruned.

Primary PF is **canonical net unit-return PF after Base/config qualification**, on positively allocated settled closes. External Block/coordination multipliers are removed; intrinsic ladder semantics remain. Equal-$1 cash-return PF uses the same base-one arithmetic. **Sized-dollar PF is diagnostic**, using recorded weighted return × allocated unit notional, with volume applied once. Endpoint marks are excluded from settled PF. Empty PF is unavailable.

All sessions use native Binance USD-M candles, $10 starting balance, 10× leverage, equity sizing 0.1% and modeled round-trip cost 0.15%. Evaluated prehistory is six hours, with older indicator-only warmup behind `evaluationFromT`. Twenty fixed symbols are used for development; the later windows add OP/XLM. Exchange positions remain capped at 100 Symbol×Direction groups, independently of order/config counts. “Funded” below means simulated positive allocation, not a verified exchange fill.

## Twenty-symbol development: 6+6 hours

Trading: **12 October 09:00–15:00 UTC**, after evaluated history 03:00–09:00. Twenty symbols process; nineteen trade. Baseline/current outcomes are identical. Entry variants change only exact-config entry Last-N from off to 5/15 at minimum PF 1.2, retaining stricter gates.

| Case | Funded closes | Unit PF | Sized-dollar PF diagnostic | Settled cash $ | Marked end equity $ | Marked DD | Cash-positive hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| Baseline = current | 126,380 | 0.765632477 | 0.943976 | -1.543603 | -9.934586 | 238.4879% | 4/6 |
| Entry Last-N 5 | 87,179 | 1.267875180 | 1.919573 | +12.395141 | 12.788254 | 54.6934% | 4/6 |
| Entry Last-N 15 | 94,903 | 1.112511245 | 1.566697 | +9.261089 | 7.795166 | 53.5457% | 5/6 |

All four books are **financially infeasible**: position/gross balance ratios are 0/0 (uncapped exposure), with peak modeled margin $295–$376. The model retains orders instead of inventing exchange liquidation. Entry-5 unit PF is positive in five hours, while cash is positive in four; unequal sizes explain the different metrics.

### Every development hour

UTC; cells are **funded closes / unit PF / sized cash $**. All are Engine orders; Signals are empty. Boundary closes belong to the preceding hour.

| Hour | Baseline = current | Entry Last-N 5 | Entry Last-N 15 |
|---|---|---|---|
| 09:00 | 6,298 / 1.044362 / -0.028221 | 4,292 / 1.118663 / -0.071640 | 5,236 / 0.974325 / -0.093453 |
| 10:00 | 19,594 / 2.194260 / +0.391975 | 12,154 / 1.309820 / -0.041429 | 13,424 / 1.579479 / +0.079589 |
| 11:00 | 21,819 / 1.832258 / +1.849131 | 17,861 / 2.765207 / +2.857245 | 18,885 / 2.613080 / +2.643255 |
| 12:00 | 26,507 / 1.344581 / +3.037444 | 17,644 / 2.276557 / +3.977226 | 19,130 / 1.954709 / +3.752800 |
| 13:00 | 12,744 / 0.842402 / +0.479804 | 8,726 / 1.342849 / +1.068911 | 9,659 / 1.307400 / +1.079218 |
| 14:00 | 39,418 / 0.428864 / -7.273736 | 26,502 / 0.799163 / +4.604828 | 28,569 / 0.663225 / +1.799681 |

[Full development types, directions, gates, hourly results and source seals](development20-results-20261017.md).

## Twenty-two-symbol source windows: both complete

Selection trades **13 October 15:00–14 October 15:00 UTC**. The untouched final trades **15 October 21:00–16 October 21:00 UTC**, retaining the predeclared all-range control. Each independent audit passes 16/16 checks and matches CI.

| Window | Funded closes | Unit PF | Sized-dollar PF diagnostic | Settled cash $ | Marked end equity $ | Marked DD | Cash-positive hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| Selection | 127,501 | 0.748210087 | 0.557779586 | -27.70922118 | -27.496041 | 368.5843% | 10/24 |
| Final | 127,210 | 1.459701913 | 1.387921087 | +15.40882058 | 16.572633 | 99.4610% | 16/24 |

Both trade all 22 symbols and are **financially infeasible**. Final minimum marked equity is only $0.062921, with peak margin $269.209240. Selection has 126,582 additional zero-allocated planned closes, excluded from funded PF; final has none. Unit-PF-positive hours are 11/24 and 13/24, distinct from cash-positive hours.

Both directions trade. Final Long PF is 0.868962 on 68,885 closes; Short PF is 3.970918 on 58,325. Final Normal PF is 1.432507 and Trailing 1.462658; trailing-only and Signals remain empty. Micro PF is 1.721145, Minimal 1.223665 and Short 1.541476; Short has only 74 closes across two symbols.

**Zero exact cells meet the frozen pruning rules.** Aggregate range losses cannot replace the required sample/symbol/both-half-loss evidence. No retrospective pruning or fitting to individual hours occurred.

[All 48 source hourly rows](source22-results-20261017.md#every-hour-including-directions-and-protection-types) include unit PF, sized-dollar PF, cash, long/short and Normal/Trailing counts/PFs, equity and margin. The [complete report](source22-results-20261017.md) retains every range/type/side and empty cohort.

## Base/config and Signal progression

| Session | Engine Base pairs passed/evaluated | Run-start config cells passed/evaluated |
|---|---:|---:|
| Development baseline/current | 104/854 | 32,507/76,754 |
| Selection22 | 261/854 | 55,985/215,948 |
| Final22 | 113/854 | 29,196/85,068 |

Development entry variants pass 32,507/76,744 cells. Short/General/Long development pairs first fail minimum closes; gates were not lowered. Run-start cells, representative Base pairs, exact entry decisions and endpoint paper snapshots have different denominators.

For the 22-symbol Signal paths, `baseGate=false`: representative Signal Base counts are diagnostic (1/126 selection, 0/126 final). All three protection types and both directions activate. Every active entry attempt has an explained first failing causal gate, before funding:

| Window | Active entry attempts | Own Last-25 validation | Other first failures | Taken |
|---|---:|---:|---|---:|
| Selection | 1,473 | 1,150 | Confirmation 223; own PF 49; cluster 51 | 0 |
| Final | 1,111 | 763 | Side 271; own PF 43; cluster 34 | 0 |

Own validation combines at least five observations, unit PF ≥1.1 and drawdown checks within the last 25 outcomes. Captures cannot separate these causes; they cannot all be called insufficient history. Settled-active candidates and endpoint paper configs are separate samples. [Exact phase and gate explanation](source22-results-20261017.md#exact-signal-activation-to-entry-flow).

## Account-risk holdout: all four complete

Trading: **14 October 21:00–15 October 21:00 UTC**, after six evaluated prehistory hours. Each arm adds a final account position ratio of 0.75× balance per Symbol×Direction and gross ratio 7×/1×. This changes account policy relative to the uncapped sessions. All four independently reconcile their funded entries and all 1,440 account minutes; all trade both directions and 22 symbols, have zero funded Signals, zero margin-shortfall minutes and model feasibility true.

| Arm | Funded closes | Unit PF | Settled cash $ | Marked end equity $ | Marked DD | Cash-positive hours |
|---|---:|---:|---:|---:|---:|---:|
| control-entry0-gross7 | 789,873 | 0.691260716 | -1.018721 | 8.472082 | 19.0931% | 14/24 |
| entry5-gross7 | 595,448 | 0.834692837 | -0.880353 | 8.540239 | 18.6287% | 16/24 |
| **entry5-gross1: frozen candidate** | 604,153 | 0.824573475 | -0.093895 | 9.829475 | 2.3357% | 16/24 |
| entry15-gross1 | 680,439 | 0.711549623 | -0.145745 | 9.782792 | 2.5763% | 16/24 |

**All four fail research acceptance.** The frozen candidate passes modeled funding/drawdown limits but fails unit PF >1.2, positive cash and ending marked equity >$10. Its sized-dollar PF is 0.802336863; Long/Short unit PF is 0.701459/0.941325. Minimum marked equity is $9.809587. No diagnostic arm can replace the frozen candidate after scoring.

[All 96 risk hourly rows and full independent/provenance checks](risk-entry-results-20261017.md#hourly-funded-execution) are preserved. Recorded qualification membership is verified; the independent reviewer does not rerun the entire DDT/DDR/Last-N strategy engine.

## Performance and DCA accounting limitation

The capture/resource changes preserve exact development unit-return and allocation/cash fingerprints, complete frozen settings and account totals. Lossless sidecar verification checks every byte hash, count, ordinal and allocation identity without hydrating tape/check arrays.

| Development case | Original → latest capture runtime seconds | Original → latest peak RSS MB | Latest strategy compute seconds |
|---|---:|---:|---:|
| Baseline | 187 → 151 | 10,625 → 3,451 | 54.759 |
| Current | 185 → 62 | 11,555 → 3,123 | 55.447 |
| Entry Last-N 5 | 177 → 59 | 11,169 → 3,081 | 54.476 |
| Entry Last-N 15 | 198 → 57 | 10,370 → 3,196 | 52.186 |

These are observed dump/capture measurements, **excluding report/audit time**. Direct strategy compute did not uniformly improve. Source selection/final capture took 157/70 seconds with peak RSS 6,769/3,157 MB and no fallback. The 8192 MiB V8 heap allowance can apply to workers too; it is not a whole-process 8 GiB cap.

All three report minute-book passes now cache immutable order units/volume/keys and each symbol price once per minute, with separate capped/uncapped caches. The suite passes **27/27**; **468,368 orders**, **63,360 symbol-minute marks** and **18/18 actual IEEE754 slices** match direct/legacy results. New full passes match the applicable recorded account and curve values at six decimals. Full end-to-end CI timing is pending; slices are not whole-report speedups. [Exact cache proof and preserved failed profiling attempts](minute-report-cache-20261017.md).

A pre-existing DCA endpoint export mismatch uses per-leg engine returns versus the account minute model's arithmetic-average entry × final volume. For development/current, 146 DCA opens differ by +$0.002206105101379 engine-minus-account; the other 22,662 match. Settled PF/cash are unaffected. Minute-account drawdown/feasibility remains an aggregate parent model: actual timed leg funding is not exported. The [additive endpoint amendment CLI](endpoint-mark-amendment.md) preserves original engine fields, adds explicit engine/book bases, and reconciles book contributions to unchanged account totals. Its 16 tests and actual old20 row/curve readback pass. Neither basis is venue execution proof.

## Reports and reproducibility

- [Detailed 20-symbol results and exact economic/resource parity](development20-results-20261017.md).
- [Complete source22 results, gates and 48 hourly rows](source22-results-20261017.md).
- [Complete four-arm risk results and 96 hourly rows](risk-entry-results-20261017.md).
- [Minute report cache proof](minute-report-cache-20261017.md) and [endpoint mark amendment](endpoint-mark-amendment.md).
- Frozen [source protocol](exact-signal-22-study-20261017.md) and [risk protocol](risk-entry-study-plan-20261017.md).
- Source [CI39077484680](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077484680); risk [CI39077541410](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077541410). Exact per-arm source/protocol/ZIP hashes are in the detailed reports.

Feed SHA256: `84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019`. Earlier failed captures supply no funded economic outcome. Full raw archival limitations are disclosed in the risk report. Live remains disabled; these results authorize no default change or automatic promotion.
