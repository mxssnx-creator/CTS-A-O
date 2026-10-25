# Post-Base loss drawdown and stop-grid comparison

12 symbols; 16 October 2026 21:00–17 October 2026 09:00 UTC (23:00–11:00 Vienna). Twelve hours of evaluated history plus 24 hours of indicator warmup; minute pricing and entry/exit calculations. Retrospective cached BingX experiment, not an unseen profitability test.

**These are funded modeled orders from the Base-qualified, subsequently validated execution path, not unfiltered pre-Base returns.** Historical qualification and future execution are different samples. A passing historical PF does not mathematically guarantee a profitable next order or hour. The independent entry audit checks saved own-direction historical PF/Last-N at each settled order’s entry, but does not reconstruct unexported exact Base-cell metadata.

Equity = initial equity + realized net P&L + open-position net P&L. Margin is reported separately and is not subtracted from equity. Peak drawdown = largest (prior equity peak − current equity) / prior peak. Loss below initial = max(0, initial − lowest equity) / initial. Both include losses and open P&L. Negative modeled equity is retained; a real account could not continue through ruin.

All rows include their independent Exit cohort. Do not sum separate portfolios. Initial equity $10, unchanged 0.2% sizing and 10× leverage, no account exposure caps. Only the ordinary configured stop-ratio ladder changes. TP, trailing choices, fees, PF gates, Last-N and Exit are unchanged. Fewer configured stops also change admissions, order counts and exposure; drawdown reduction cannot be attributed solely to a per-order improvement.

A configured ratio ceiling is not a universal realized-loss bound: lane scaling, mandatory minimum stops, price rounding and gaps remain. Actual executed configuration ratios are disclosed below. Trailing-only has no TP and is excluded from SL/TP ratios.

| Arm | Positions opened / held | Orders opened / settled / held | PF | Lowest equity $ | Loss below initial % | Peak equity DD % | End equity $ | Green / red / flat hours | Compute s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| wide baseline | 50 / 22 | 11827 / 4616 / 7211 | 0.592 | 8.66724 | 13.33 | 15.04 | 9.36159 | 7 / 5 / 0 | 61.5 |
| short baseline | 43 / 20 | 185881 / 46215 / 139666 | 2.016 | -17.29429 | 272.94 | 231.95 | 4.17431 | 7 / 4 / 1 | 694.2 |
| general baseline | 47 / 14 | 150757 / 39893 / 110864 | 0.649 | -7.79785 | 177.98 | 165.54 | 3.44423 | 6 / 6 / 0 | 513.5 |
| long baseline | 47 / 12 | 125832 / 13189 / 112643 | 0.283 | -1.31769 | 113.18 | 111.51 | 8.79468 | 4 / 7 / 1 | 947.0 |
| micro-cap1 | 50 / 19 | 2437 / 1755 / 682 | 0.213 | 9.83163 | 1.68 | 1.72 | 9.86762 | 1 / 11 / 0 | 25.9 |
| minimal-cap1 | 47 / 17 | 7349 / 3294 / 4055 | 0.135 | 9.10839 | 8.92 | 9.15 | 9.37735 | 4 / 8 / 0 | 43.6 |
| general-cap075 | 47 / 14 | 19628 / 7028 / 12600 | 0.281 | 7.93603 | 20.64 | 23.14 | 9.18896 | 6 / 5 / 1 | 306.2 |
| long-cap075 | 47 / 12 | 42824 / 5151 / 37673 | 0.102 | 6.45728 | 35.43 | 38.06 | 9.50732 | 4 / 7 / 1 | 597.3 |
| wide-cap1 | 49 / 16 | 1328 / 591 / 737 | 0.280 | 9.85385 | 1.46 | 1.49 | 9.92838 | 5 / 7 / 0 | 16.8 |
| wide-cap05 | 49 / 14 | 714 / 483 / 231 | 0.132 | 9.93730 | 0.63 | 0.65 | 9.95116 | 3 / 9 / 0 | 14.2 |
| short-cap1 | 48 / 13 | 5498 / 1452 / 4046 | 0.663 | 9.20474 | 7.95 | 8.22 | 9.74292 | 7 / 4 / 1 | 68.8 |
| short-cap125 | 48 / 18 | 21001 / 5818 / 15183 | 0.984 | 7.14613 | 28.54 | 30.98 | 9.40901 | 6 / 5 / 1 | 177.1 |
| short-cap15 | 48 / 18 | 47954 / 12378 / 35576 | 1.391 | 3.37847 | 66.22 | 68.97 | 8.87215 | 7 / 4 / 1 | 313.3 |
| short-cap2 | 47 / 20 | 122965 / 30938 / 92027 | 1.699 | -7.64552 | 176.46 | 163.16 | 6.33983 | 7 / 4 / 1 | 856.2 |

## Recorded qualification-to-execution path

| Arm | Initial Base evaluated / passed pairs | Initial configs evaluated / passed | Funded settled orders |
|---|---:|---:|---:|
| wide baseline | 1960 / 432 | 11852 / 5309 | 4616 |
| short baseline | 1960 / 635 | 210134 / 91721 | 46215 |
| general baseline | 1960 / 550 | 205476 / 46207 | 39893 |
| long baseline | 1960 / 475 | 163940 / 22075 | 13189 |
| micro-cap1 | 1960 / 166 | 6900 / 1591 | 1755 |
| minimal-cap1 | 1960 / 195 | 13290 / 5895 | 3294 |
| general-cap075 | 1960 / 242 | 44350 / 9107 | 7028 |
| long-cap075 | 1960 / 414 | 56972 / 7965 | 5151 |
| wide-cap1 | 1960 / 159 | 2222 / 679 | 591 |
| wide-cap05 | 1960 / 127 | 1646 / 377 | 483 |
| short-cap1 | 1960 / 235 | 11098 / 4401 | 1452 |
| short-cap125 | 1960 / 389 | 35198 / 13251 | 5818 |
| short-cap15 | 1960 / 565 | 68990 / 26167 | 12378 |
| short-cap2 | 1960 / 630 | 143318 / 60307 | 30938 |

Base pair counts, initial configuration counts and subsequently funded orders have different denominators and must not be subtracted from one another. Initial selection is reevaluated as closed evidence changes. Independent own-entry audits and complete scalar hourly histories accompany each completed candidate.

## Protection and audit evidence

| Arm / range | Max configured executed SL % | Max executed SL/TP | Min nonzero trailing % | Native checks | Entry failures / tested closes | Hourly discrepancies / decisions |
|---|---:|---:|---:|---:|---:|---:|
| wide baseline / Wide | 5.790 | 1.9829 | 0.500 | 56/56 | prior report | prior report |
| short baseline / Short | 7.000 | 2.5000 | 0.450 | 58/58 | prior report | prior report |
| general baseline / General | 6.600 | 1.5000 | 0.750 | 58/58 | prior report | prior report |
| long baseline / Long | 9.600 | 1.5000 | 1.150 | 58/58 | prior report | prior report |
| micro-cap1 / Micro | 0.950 | 1.0000 | 0.137 | 58/58 | 0 / 1755 | 0 / 82800 |
| minimal-cap1 / Minimal | 1.600 | 1.0000 | 0.300 | 58/58 | 0 / 3294 | 0 / 159480 |
| general-cap075 / General | 3.300 | 0.7500 | 0.750 | 58/58 | 0 / 7028 | 0 / 532200 |
| long-cap075 / Long | 4.800 | 0.7500 | 1.150 | 58/58 | 0 / 5151 | 0 / 683664 |
| wide-cap1 / Wide | 2.930 | 1.0337 | 0.500 | 56/56 | 0 / 591 | 0 / 26664 |
| wide-cap05 / Wide | 1.520 | 0.7079 | 0.500 | 56/56 | 0 / 483 | 0 / 19752 |
| short-cap1 / Short | 2.800 | 1.0000 | 0.450 | 58/58 | 0 / 1452 | 0 / 133176 |
| short-cap125 / Short | 3.500 | 1.2500 | 0.450 | 58/58 | 0 / 5818 | 0 / 422376 |
| short-cap15 / Short | 4.200 | 1.5000 | 0.450 | 58/58 | 0 / 12378 | 0 / 827880 |
| short-cap2 / Short | 5.600 | 2.0000 | 0.450 | 58/58 | 0 / 30938 | 0 / 1719816 |

## Fix and current decision

Large Micro/Minimal simulations completed calculation but failed export because their selected-config metadata records exceeded the 8 MiB chunk limit (17,455,990 / 13,541,750 bytes). Validation sidecar v2 streams selected identities individually, preserving order, duplicates, all gate checks, bounded chunks and checksums. The reader retains v1 compatibility. Original failure tails are retained here.

No candidate is promoted merely because drawdown falls. Require preserved post-Base execution PF above 1, sufficient own samples, acceptable loss drawdown, and later chronological validation. Wide 1×/0.5×, Short 1×/1.25×, Micro 1×, Minimal 1×, General 0.75× and Long 0.75× fail the PF requirement. Production strategy defaults are unchanged.

All ten stop-grid experiments completed with native reports, exact-return reconciliation and independent entry/hourly audits. The separate Micro/Minimal/General/Long workflow completed all four jobs successfully; financial success is assessed separately from correct execution. Minimal Plus still has no selected ordinary cells. Signals retain their own 150h policy and independent Exit; this ordinary-range experiment does not certify new Signal profitability.

Checks: 44 sidecar/consumer tests; 41 funded-cohort/native-report tests; margin-versus-loss replay regression; 13 trailing/readiness tests; build and TypeScript. This is not a claim of full-system stability or live profitability.

## Separate exposure-capped replay of Short 1.5×

Same native candidate orders, with maximum funded notional 0.5× realized balance per symbol/direction and 2× overall. This is an alternative funding profile, not a new market simulation or a stop-only gain. 46 positions opened / 15 held; 15194 orders opened / 3508 settled / 11686 held.

Return PF **1.162964**; peak equity DD **2.725%**; lowest equity **$9.741976**; loss below initial **2.580%**; ending equity **$9.916556**. Positive/negative/flat hours: 5/6/1. Sized-dollar PF diagnostic **0.412972**. Different allocations and held losses mean return PF above 1 does not establish a dollar profit.

All funded closed orders are an exact-return subset of the independently entry-audited native cohort; all 58 report checks pass. Native minimum order sizes and liquidation mechanics are not certified by this replay. No production promotion or positive-stability claim.

## Strongest tested Short candidate: 2× plus the same exposure caps

Configured SL/TP ceiling 2×; unchanged PF gates, fees, minute data and candidate qualification. Alternative funded replay with maximum notional 0.5× realized balance per symbol/direction and 2× overall. Return PF **2.014093**, peak equity DD **2.304%**, loss below initial **2.203%**, lowest equity **$9.779655**, ending equity **$9.932115**.

**46 positions opened / 29 closed / 17 held; 32720 orders opened / 9770 settled / 22950 held.** Positive/negative/flat hours: 5/6/1. Sized-dollar settled PF diagnostic: 1.009685. All 58 native report checks pass; funded closes retain exactly the source returns of the independently entry-audited native cohort.

This retains the baseline’s approximately 2× return PF with substantially lower loss drawdown in this cached window. It is not consistently profitable by hour, ends below initial equity including holdings, and has not been validated on a separate later market interval. Not promoted to production. Native minimum quantities and liquidation feasibility still require separate validation.
