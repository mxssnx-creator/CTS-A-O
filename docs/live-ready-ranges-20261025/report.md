# Twelve-hour range results — 25 October 2026

This is a retrospective regression on cached BingX data from **16 October 2026 21:00 to 17 October 2026 09:00 UTC**. Each independent arm uses 12 symbols, 980 Micro/Inverse indication identities, 12 hours of evaluated prehistory and 24 earlier hours for indicator warmup. Entry, exit and equity pricing retain minute data; 1/5/15-minute indication combinations are included. Hourly rows summarize results.

**These are separate modeled portfolios. Do not add their counts or the repeated Exit results together.** Primary PF uses the same funded settled unit-return cohort after modeled costs; held marks stay separate. The original $10, 10× leverage, 0.2%-of-equity sizing configuration has no position/exposure balance caps. Capital-infeasible outcomes remain visible. Modeled allocations do not certify native lot/minimum-notional feasibility. No profitable promotion is implied.

Normal, Trailing, Trailing-only and independently fitted Exit participate. DCA, Block and Axis are disabled in this financial profile. Signals use their separate 150-hour policy and are not expanded into these ordinary ranges. The earlier Signals-only report is [available separately](../signals-own-grid-150h-20261024/report.html).

## Range-only results

Position episodes group overlapping orders by symbol and direction, including held siblings. Group position counts overlap and must not be summed. Counts below exclude each arm’s independent Exit orders.

| Range | Status | Positions opened | Positions closed | Positions held | Orders opened | Orders settled | Orders held | Return PF | Executed configs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Micro | pending | — | — | — | — | — | — | — | — |
| Minimal | pending | — | — | — | — | — | — | — | — |
| Short | completed | 26 | 6 | 20 | 185560 | 45894 | 139666 | 2.024 | 63042 |
| General | completed | 15 | 1 | 14 | 150436 | 39572 | 110864 | 0.650 | 45569 |
| Long | completed | 12 | 0 | 12 | 125511 | 12868 | 112643 | 0.283 | 38663 |
| Wide | completed | 23 | 1 | 22 | 11506 | 4295 | 7211 | 0.599 | 3409 |
| Minimal plus | no selected cells | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 |


## Complete arm, including Exit

Equity drawdown includes endpoint marks and is a whole-arm measure. It is distinct from range-only closed-curve drawdown.

| Arm | Positions opened | Orders opened | Settled | Held | PF | Equity max DD | Equity DDT hours | Positive/negative/flat hours | Capital feasible | Compute seconds | Sampled runtime RSS MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Short | 43 | 185881 | 46215 | 139666 | 2.016 | 231.95% | 8.47 | 7/4/1 | False | 694.2 | 4339 |
| General | 47 | 150757 | 39893 | 110864 | 0.649 | 165.54% | 8.47 | 6/6/0 | False | 513.5 | 4446 |
| Long | 47 | 125832 | 13189 | 112643 | 0.283 | 111.51% | 5.63 | 4/7/1 | False | 947.0 | 3539 |
| Wide | 50 | 11827 | 4616 | 7211 | 0.592 | 15.04% | 7.35 | 7/5/0 | False | 61.5 | 919 |
| Minimal plus | 48 | 321 | 321 | 0 | 0.312 | 0.14% | 9.18 | 3/6/3 | True | 8.9 | 812 |


## Short detail

Native calculation: 694.19 seconds. Recorded session duration before report completion: 706 seconds. Post-Base configuration evaluation: {'configs': 249430, 'evaluated': 210134, 'passed': 91721, 'signalTapes': 0, 'signalActive': 0, 'signalUnitsRun': 0, 'signalSeated': 0}.

Historical qualification and later execution are different populations. Four-close coverage below is counted from archived scalar histories at the initial evaluation boundary; it does not claim a passing PF. Exact context denominators include every configured symbol and eligible direction; side-specific Exit IDs exclude the opposite direction. The ordinary validation setting remains Last-15; Exit retains its separate configured gates.

| Range | Type | Evaluated configs | Passing configs | Pooled ≥4 % | Any own context ≥4 % | Exact contexts ≥4 / total | Exact ≥4 % | Missing histories |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Short | normal | 45654 | 8082 | 95.17 | 8.47 | 5132/1095696 | 0.47 | 0 |
| Short | trailing | 136962 | 73674 | 98.56 | 30.04 | 140336/3287088 | 4.27 | 0 |
| Short | trailing-only | 27456 | 9952 | 97.20 | 18.40 | 14094/658944 | 2.14 | 0 |
| Exit | exit:static-sl | 20 | 5 | 100.00 | 100.00 | 195/240 | 81.25 | 0 |
| Exit | exit:breakeven | 13 | 2 | 100.00 | 100.00 | 138/156 | 88.46 | 0 |
| Exit | exit:adaptive-sl | 13 | 3 | 100.00 | 100.00 | 136/156 | 87.18 | 0 |
| Exit | exit:trailing | 8 | 2 | 100.00 | 100.00 | 88/96 | 91.67 | 0 |
| Exit | exit:trailing-only | 8 | 1 | 100.00 | 100.00 | 83/96 | 86.46 | 0 |


### Exit: execution and protections

4 distinct executed indication IDs; 12 symbols; 28 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| exit:breakeven | 30 | 30 | 0 | 57 | 57 | 0 | 0.533 |
| exit:adaptive-sl | 39 | 39 | 0 | 98 | 98 | 0 | 0.318 |
| exit:trailing | 36 | 36 | 0 | 72 | 72 | 0 | 0.396 |
| exit:trailing-only | 41 | 41 | 0 | 57 | 57 | 0 | 0.347 |
| exit:static-sl | 14 | 14 | 0 | 37 | 37 | 0 | 0.079 |


Executed configuration distances: minimum nonzero TP **0.800%**, maximum SL **2.160%**, maximum SL/TP ratio **2.000**, minimum nonzero trail **0.500%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 0.127% of initial balance; closed-curve DDT 8.67 hours. Sized-dollar PF diagnostic: 0.317. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 10 | 3 | 7 | 67 | 30 | 37 | 14.663 |
| 10-16 22:00 | 0 | 5 | 2 | 0 | 25 | 12 | 16.491 |
| 10-16 23:00 | 9 | 2 | 9 | 75 | 19 | 68 | 22.414 |
| 10-17 00:00 | 11 | 2 | 18 | 88 | 42 | 114 | 0.116 |
| 10-17 01:00 | 5 | 6 | 17 | 44 | 71 | 87 | 0.018 |
| 10-17 02:00 | 1 | 14 | 4 | 4 | 87 | 4 | 0.185 |
| 10-17 03:00 | 0 | 4 | 0 | 0 | 4 | 0 | 0.000 |
| 10-17 04:00 | 2 | 0 | 2 | 3 | 0 | 3 | — |
| 10-17 05:00 | 10 | 1 | 11 | 40 | 10 | 33 | 0.076 |
| 10-17 06:00 | 0 | 11 | 0 | 0 | 33 | 0 | 0.000 |
| 10-17 07:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| 10-17 08:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |


### Short: execution and protections

405 distinct executed indication IDs; 12 symbols; 63042 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| trailing | 26 | 6 | 20 | 157147 | 38623 | 118524 | 2.311 |
| trailing-only | 23 | 5 | 18 | 18535 | 4828 | 13707 | 0.952 |
| normal | 12 | 0 | 12 | 9878 | 2443 | 7435 | 1.622 |


Executed configuration distances: minimum nonzero TP **1.800%**, maximum SL **7.000%**, maximum SL/TP ratio **2.500**, minimum nonzero trail **0.450%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 23.673% of initial balance; closed-curve DDT 3.88 hours. Sized-dollar PF diagnostic: 1.925. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 1 | 0 | 1 | 4746 | 0 | 4746 | — |
| 10-16 22:00 | 0 | 0 | 1 | 24 | 702 | 4068 | 0.203 |
| 10-16 23:00 | 0 | 0 | 1 | 0 | 0 | 4068 | — |
| 10-17 00:00 | 10 | 0 | 11 | 35486 | 5866 | 33688 | 38.187 |
| 10-17 01:00 | 7 | 1 | 17 | 43608 | 7568 | 69728 | 17.188 |
| 10-17 02:00 | 3 | 1 | 19 | 70111 | 3674 | 136165 | 23.436 |
| 10-17 03:00 | 0 | 1 | 18 | 24554 | 13451 | 147268 | 0.176 |
| 10-17 04:00 | 2 | 1 | 19 | 5872 | 1377 | 151763 | 0.080 |
| 10-17 05:00 | 3 | 2 | 20 | 1068 | 1333 | 151498 | 0.063 |
| 10-17 06:00 | 0 | 0 | 20 | 26 | 2462 | 149062 | 112.144 |
| 10-17 07:00 | 0 | 0 | 20 | 65 | 9461 | 139666 | 485.099 |
| 10-17 08:00 | 0 | 0 | 20 | 0 | 0 | 139666 | — |


Independent scalar hourly audit: **2,521,608 decisions; 0 discrepancies**. Initial → final passing configs: 91,721 → 6. Unexplained qualification transitions: 0. Counts can decrease when recent closes expire or fail current gates; cumulative opened orders remain a separate measure.


| UTC boundary | Passing configs | Gained | Dropped | Unexplained |
| --- | --- | --- | --- | --- |
| 10-16 21:00 | 91721 | 0 | 0 | 0 |
| 10-16 22:00 | 92296 | 805 | 230 | 0 |
| 10-16 23:00 | 91928 | 471 | 839 | 0 |
| 10-17 00:00 | 89075 | 2294 | 5147 | 0 |
| 10-17 01:00 | 81913 | 817 | 7979 | 0 |
| 10-17 02:00 | 78592 | 1054 | 4375 | 0 |
| 10-17 03:00 | 72944 | 5719 | 11367 | 0 |
| 10-17 04:00 | 38162 | 1523 | 36305 | 0 |
| 10-17 05:00 | 25664 | 623 | 13121 | 0 |
| 10-17 06:00 | 2995 | 4 | 22673 | 0 |
| 10-17 07:00 | 1579 | 60 | 1476 | 0 |
| 10-17 08:00 | 6 | 6 | 1579 | 0 |


Corrected report checks: **58/58**. Original Exit heatmap failures are preserved; 41 computed Exit cell labels were corrected without changing any executed return, allocation, total or hour.
Exact source-return reconciliation: 46215 matched; missing 0; mismatched 0.

## General detail

Native calculation: 513.55 seconds. Recorded session duration before report completion: 521 seconds. Post-Base configuration evaluation: {'configs': 272132, 'evaluated': 205476, 'passed': 46207, 'signalTapes': 0, 'signalActive': 0, 'signalUnitsRun': 0, 'signalSeated': 0}.

Historical qualification and later execution are different populations. Four-close coverage below is counted from archived scalar histories at the initial evaluation boundary; it does not claim a passing PF. Exact context denominators include every configured symbol and eligible direction; side-specific Exit IDs exclude the opposite direction. The ordinary validation setting remains Last-15; Exit retains its separate configured gates.

| Range | Type | Evaluated configs | Passing configs | Pooled ≥4 % | Any own context ≥4 % | Exact contexts ≥4 / total | Exact ≥4 % | Missing histories |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| General | normal | 44256 | 1108 | 76.60 | 9.51 | 8914/1062144 | 0.84 | 0 |
| General | trailing | 132768 | 39374 | 90.86 | 22.04 | 85062/3186432 | 2.67 | 0 |
| General | trailing-only | 28390 | 5712 | 87.97 | 8.70 | 4058/681360 | 0.60 | 0 |
| Exit | exit:static-sl | 20 | 5 | 100.00 | 100.00 | 195/240 | 81.25 | 0 |
| Exit | exit:breakeven | 13 | 2 | 100.00 | 100.00 | 138/156 | 88.46 | 0 |
| Exit | exit:adaptive-sl | 13 | 3 | 100.00 | 100.00 | 136/156 | 87.18 | 0 |
| Exit | exit:trailing | 8 | 2 | 100.00 | 100.00 | 88/96 | 91.67 | 0 |
| Exit | exit:trailing-only | 8 | 1 | 100.00 | 100.00 | 83/96 | 86.46 | 0 |


### Exit: execution and protections

4 distinct executed indication IDs; 12 symbols; 28 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| exit:breakeven | 30 | 30 | 0 | 57 | 57 | 0 | 0.533 |
| exit:adaptive-sl | 39 | 39 | 0 | 98 | 98 | 0 | 0.318 |
| exit:trailing | 36 | 36 | 0 | 72 | 72 | 0 | 0.396 |
| exit:trailing-only | 41 | 41 | 0 | 57 | 57 | 0 | 0.347 |
| exit:static-sl | 14 | 14 | 0 | 37 | 37 | 0 | 0.079 |


Executed configuration distances: minimum nonzero TP **0.800%**, maximum SL **2.160%**, maximum SL/TP ratio **2.000**, minimum nonzero trail **0.500%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 0.114% of initial balance; closed-curve DDT 8.67 hours. Sized-dollar PF diagnostic: 0.346. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 10 | 3 | 7 | 67 | 30 | 37 | 14.663 |
| 10-16 22:00 | 0 | 5 | 2 | 0 | 25 | 12 | 16.491 |
| 10-16 23:00 | 9 | 2 | 9 | 75 | 19 | 68 | 22.414 |
| 10-17 00:00 | 11 | 2 | 18 | 88 | 42 | 114 | 0.116 |
| 10-17 01:00 | 5 | 6 | 17 | 44 | 71 | 87 | 0.018 |
| 10-17 02:00 | 1 | 14 | 4 | 4 | 87 | 4 | 0.185 |
| 10-17 03:00 | 0 | 4 | 0 | 0 | 4 | 0 | 0.000 |
| 10-17 04:00 | 2 | 0 | 2 | 3 | 0 | 3 | — |
| 10-17 05:00 | 10 | 1 | 11 | 40 | 10 | 33 | 0.076 |
| 10-17 06:00 | 0 | 11 | 0 | 0 | 33 | 0 | 0.000 |
| 10-17 07:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| 10-17 08:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |


### General: execution and protections

383 distinct executed indication IDs; 12 symbols; 45569 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| trailing | 15 | 1 | 14 | 129854 | 34255 | 95599 | 0.723 |
| trailing-only | 12 | 0 | 12 | 11247 | 3144 | 8103 | 0.250 |
| normal | 12 | 0 | 12 | 9335 | 2173 | 7162 | 0.382 |


Executed configuration distances: minimum nonzero TP **3.000%**, maximum SL **6.600%**, maximum SL/TP ratio **1.500**, minimum nonzero trail **0.750%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 43.477% of initial balance; closed-curve DDT 7.95 hours. Sized-dollar PF diagnostic: 0.508. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 1 | 0 | 1 | 2992 | 0 | 2992 | — |
| 10-16 22:00 | 0 | 0 | 1 | 0 | 0 | 2992 | — |
| 10-16 23:00 | 0 | 0 | 1 | 0 | 0 | 2992 | — |
| 10-17 00:00 | 6 | 0 | 7 | 22494 | 0 | 25486 | — |
| 10-17 01:00 | 4 | 0 | 11 | 32588 | 7330 | 50744 | 28.117 |
| 10-17 02:00 | 1 | 0 | 12 | 44078 | 6644 | 88178 | 0.014 |
| 10-17 03:00 | 0 | 0 | 12 | 31448 | 14569 | 105057 | 0.082 |
| 10-17 04:00 | 0 | 0 | 12 | 8080 | 1871 | 111266 | 0.006 |
| 10-17 05:00 | 3 | 0 | 15 | 4301 | 1740 | 113827 | 0.000 |
| 10-17 06:00 | 0 | 0 | 15 | 1603 | 139 | 115291 | 55.047 |
| 10-17 07:00 | 0 | 1 | 14 | 2214 | 7173 | 110332 | 161.081 |
| 10-17 08:00 | 0 | 0 | 14 | 638 | 106 | 110864 | 0.000 |


Independent scalar hourly audit: **2,465,712 decisions; 0 discrepancies**. Initial → final passing configs: 46,207 → 5,892. Unexplained qualification transitions: 0. Counts can decrease when recent closes expire or fail current gates; cumulative opened orders remain a separate measure.


| UTC boundary | Passing configs | Gained | Dropped | Unexplained |
| --- | --- | --- | --- | --- |
| 10-16 21:00 | 46207 | 0 | 0 | 0 |
| 10-16 22:00 | 45144 | 635 | 1698 | 0 |
| 10-16 23:00 | 46092 | 2397 | 1449 | 0 |
| 10-17 00:00 | 44891 | 2228 | 3429 | 0 |
| 10-17 01:00 | 42179 | 567 | 3279 | 0 |
| 10-17 02:00 | 41192 | 1077 | 2064 | 0 |
| 10-17 03:00 | 39078 | 7061 | 9175 | 0 |
| 10-17 04:00 | 36609 | 9226 | 11695 | 0 |
| 10-17 05:00 | 31081 | 3730 | 9258 | 0 |
| 10-17 06:00 | 3961 | 1454 | 28574 | 0 |
| 10-17 07:00 | 4185 | 715 | 491 | 0 |
| 10-17 08:00 | 5892 | 2596 | 889 | 0 |


Corrected report checks: **58/58**. Original Exit heatmap failures are preserved; 41 computed Exit cell labels were corrected without changing any executed return, allocation, total or hour.
Exact source-return reconciliation: 39893 matched; missing 0; mismatched 0.

## Long detail

Native calculation: 947.04 seconds. Recorded session duration before report completion: 954 seconds. Post-Base configuration evaluation: {'configs': 208878, 'evaluated': 163940, 'passed': 22075, 'signalTapes': 0, 'signalActive': 0, 'signalUnitsRun': 0, 'signalSeated': 0}.

Historical qualification and later execution are different populations. Four-close coverage below is counted from archived scalar histories at the initial evaluation boundary; it does not claim a passing PF. Exact context denominators include every configured symbol and eligible direction; side-specific Exit IDs exclude the opposite direction. The ordinary validation setting remains Last-15; Exit retains its separate configured gates.

| Range | Type | Evaluated configs | Passing configs | Pooled ≥4 % | Any own context ≥4 % | Exact contexts ≥4 / total | Exact ≥4 % | Missing histories |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Long | normal | 38148 | 0 | 37.93 | 1.86 | 826/915552 | 0.09 | 0 |
| Long | trailing | 114444 | 20416 | 61.01 | 8.87 | 15598/2746656 | 0.57 | 0 |
| Long | trailing-only | 11286 | 1646 | 81.59 | 1.97 | 222/270864 | 0.08 | 0 |
| Exit | exit:static-sl | 20 | 5 | 100.00 | 100.00 | 195/240 | 81.25 | 0 |
| Exit | exit:breakeven | 13 | 2 | 100.00 | 100.00 | 138/156 | 88.46 | 0 |
| Exit | exit:adaptive-sl | 13 | 3 | 100.00 | 100.00 | 136/156 | 87.18 | 0 |
| Exit | exit:trailing | 8 | 2 | 100.00 | 100.00 | 88/96 | 91.67 | 0 |
| Exit | exit:trailing-only | 8 | 1 | 100.00 | 100.00 | 83/96 | 86.46 | 0 |


### Exit: execution and protections

4 distinct executed indication IDs; 12 symbols; 28 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| exit:breakeven | 30 | 30 | 0 | 57 | 57 | 0 | 0.533 |
| exit:adaptive-sl | 39 | 39 | 0 | 98 | 98 | 0 | 0.318 |
| exit:trailing | 36 | 36 | 0 | 72 | 72 | 0 | 0.396 |
| exit:trailing-only | 41 | 41 | 0 | 57 | 57 | 0 | 0.347 |
| exit:static-sl | 14 | 14 | 0 | 37 | 37 | 0 | 0.079 |


Executed configuration distances: minimum nonzero TP **0.800%**, maximum SL **2.160%**, maximum SL/TP ratio **2.000**, minimum nonzero trail **0.500%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 0.123% of initial balance; closed-curve DDT 8.67 hours. Sized-dollar PF diagnostic: 0.325. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 10 | 3 | 7 | 67 | 30 | 37 | 14.663 |
| 10-16 22:00 | 0 | 5 | 2 | 0 | 25 | 12 | 16.491 |
| 10-16 23:00 | 9 | 2 | 9 | 75 | 19 | 68 | 22.414 |
| 10-17 00:00 | 11 | 2 | 18 | 88 | 42 | 114 | 0.116 |
| 10-17 01:00 | 5 | 6 | 17 | 44 | 71 | 87 | 0.018 |
| 10-17 02:00 | 1 | 14 | 4 | 4 | 87 | 4 | 0.185 |
| 10-17 03:00 | 0 | 4 | 0 | 0 | 4 | 0 | 0.000 |
| 10-17 04:00 | 2 | 0 | 2 | 3 | 0 | 3 | — |
| 10-17 05:00 | 10 | 1 | 11 | 40 | 10 | 33 | 0.076 |
| 10-17 06:00 | 0 | 11 | 0 | 0 | 33 | 0 | 0.000 |
| 10-17 07:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| 10-17 08:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |


### Long: execution and protections

318 distinct executed indication IDs; 12 symbols; 38663 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| trailing | 12 | 0 | 12 | 106916 | 12025 | 94891 | 0.301 |
| trailing-only | 11 | 0 | 11 | 4464 | 834 | 3630 | 0.099 |
| normal | 12 | 0 | 12 | 14131 | 9 | 14122 | 0.000 |


Executed configuration distances: minimum nonzero TP **4.600%**, maximum SL **9.600%**, maximum SL/TP ratio **1.500**, minimum nonzero trail **1.150%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 16.694% of initial balance; closed-curve DDT 6.90 hours. Sized-dollar PF diagnostic: 0.277. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 1 | 0 | 1 | 164 | 0 | 164 | — |
| 10-16 22:00 | 0 | 0 | 1 | 0 | 0 | 164 | — |
| 10-16 23:00 | 0 | 0 | 1 | 0 | 0 | 164 | — |
| 10-17 00:00 | 5 | 0 | 6 | 11574 | 0 | 11738 | — |
| 10-17 01:00 | 4 | 0 | 10 | 14712 | 0 | 26450 | — |
| 10-17 02:00 | 2 | 0 | 12 | 29345 | 2646 | 53149 | 0.223 |
| 10-17 03:00 | 0 | 0 | 12 | 23270 | 7817 | 68602 | 0.221 |
| 10-17 04:00 | 0 | 0 | 12 | 8459 | 62 | 76999 | 0.002 |
| 10-17 05:00 | 0 | 0 | 12 | 9232 | 1414 | 84817 | 0.000 |
| 10-17 06:00 | 0 | 0 | 12 | 8526 | 0 | 93343 | — |
| 10-17 07:00 | 0 | 0 | 12 | 16243 | 929 | 108657 | no losses |
| 10-17 08:00 | 0 | 0 | 12 | 3986 | 0 | 112643 | — |


Independent scalar hourly audit: **1,967,280 decisions; 0 discrepancies**. Initial → final passing configs: 22,075 → 30,449. Unexplained qualification transitions: 0. Counts can decrease when recent closes expire or fail current gates; cumulative opened orders remain a separate measure.


| UTC boundary | Passing configs | Gained | Dropped | Unexplained |
| --- | --- | --- | --- | --- |
| 10-16 21:00 | 22075 | 0 | 0 | 0 |
| 10-16 22:00 | 22546 | 873 | 402 | 0 |
| 10-16 23:00 | 22536 | 261 | 271 | 0 |
| 10-17 00:00 | 23291 | 1088 | 333 | 0 |
| 10-17 01:00 | 23323 | 307 | 275 | 0 |
| 10-17 02:00 | 22854 | 320 | 789 | 0 |
| 10-17 03:00 | 22062 | 3617 | 4409 | 0 |
| 10-17 04:00 | 34464 | 16075 | 3673 | 0 |
| 10-17 05:00 | 39978 | 7140 | 1626 | 0 |
| 10-17 06:00 | 21051 | 6436 | 25363 | 0 |
| 10-17 07:00 | 23470 | 2597 | 178 | 0 |
| 10-17 08:00 | 30449 | 7124 | 145 | 0 |


Corrected report checks: **58/58**. Original Exit heatmap failures are preserved; 41 computed Exit cell labels were corrected without changing any executed return, allocation, total or hour.
Exact source-return reconciliation: 13189 matched; missing 0; mismatched 0.

## Wide detail

Native calculation: 61.49 seconds. Recorded session duration before report completion: 62 seconds. Post-Base configuration evaluation: {'configs': 18140, 'evaluated': 11852, 'passed': 5309, 'signalTapes': 0, 'signalActive': 0, 'signalUnitsRun': 0, 'signalSeated': 0}.

Historical qualification and later execution are different populations. Four-close coverage below is counted from archived scalar histories at the initial evaluation boundary; it does not claim a passing PF. Exact context denominators include every configured symbol and eligible direction; side-specific Exit IDs exclude the opposite direction. The ordinary validation setting remains Last-15; Exit retains its separate configured gates.

| Range | Type | Evaluated configs | Passing configs | Pooled ≥4 % | Any own context ≥4 % | Exact contexts ≥4 / total | Exact ≥4 % | Missing histories |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Wide | normal | 4716 | 1966 | 88.63 | 39.65 | 10438/113184 | 9.22 | 0 |
| Wide | trailing | 4716 | 2482 | 90.71 | 50.81 | 16964/113184 | 14.99 | 0 |
| Wide | trailing-only | 2358 | 848 | 99.92 | 63.36 | 14214/56592 | 25.12 | 0 |
| Exit | exit:static-sl | 20 | 5 | 100.00 | 100.00 | 195/240 | 81.25 | 0 |
| Exit | exit:breakeven | 13 | 2 | 100.00 | 100.00 | 138/156 | 88.46 | 0 |
| Exit | exit:adaptive-sl | 13 | 3 | 100.00 | 100.00 | 136/156 | 87.18 | 0 |
| Exit | exit:trailing | 8 | 2 | 100.00 | 100.00 | 88/96 | 91.67 | 0 |
| Exit | exit:trailing-only | 8 | 1 | 100.00 | 100.00 | 83/96 | 86.46 | 0 |


### Exit: execution and protections

4 distinct executed indication IDs; 12 symbols; 28 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| exit:breakeven | 30 | 30 | 0 | 57 | 57 | 0 | 0.533 |
| exit:adaptive-sl | 39 | 39 | 0 | 98 | 98 | 0 | 0.318 |
| exit:trailing | 36 | 36 | 0 | 72 | 72 | 0 | 0.396 |
| exit:trailing-only | 41 | 41 | 0 | 57 | 57 | 0 | 0.347 |
| exit:static-sl | 14 | 14 | 0 | 37 | 37 | 0 | 0.079 |


Executed configuration distances: minimum nonzero TP **0.800%**, maximum SL **2.160%**, maximum SL/TP ratio **2.000**, minimum nonzero trail **0.500%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 0.128% of initial balance; closed-curve DDT 8.67 hours. Sized-dollar PF diagnostic: 0.315. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 10 | 3 | 7 | 67 | 30 | 37 | 14.663 |
| 10-16 22:00 | 0 | 5 | 2 | 0 | 25 | 12 | 16.491 |
| 10-16 23:00 | 9 | 2 | 9 | 75 | 19 | 68 | 22.414 |
| 10-17 00:00 | 11 | 2 | 18 | 88 | 42 | 114 | 0.116 |
| 10-17 01:00 | 5 | 6 | 17 | 44 | 71 | 87 | 0.018 |
| 10-17 02:00 | 1 | 14 | 4 | 4 | 87 | 4 | 0.185 |
| 10-17 03:00 | 0 | 4 | 0 | 0 | 4 | 0 | 0.000 |
| 10-17 04:00 | 2 | 0 | 2 | 3 | 0 | 3 | — |
| 10-17 05:00 | 10 | 1 | 11 | 40 | 10 | 33 | 0.076 |
| 10-17 06:00 | 0 | 11 | 0 | 0 | 33 | 0 | 0.000 |
| 10-17 07:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| 10-17 08:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |


### Wide: execution and protections

283 distinct executed indication IDs; 12 symbols; 3409 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| trailing | 20 | 1 | 19 | 6258 | 2077 | 4181 | 0.684 |
| trailing-only | 17 | 1 | 16 | 2132 | 932 | 1200 | 0.244 |
| normal | 20 | 1 | 19 | 3116 | 1286 | 1830 | 0.672 |


Executed configuration distances: minimum nonzero TP **0.890%**, maximum SL **5.790%**, maximum SL/TP ratio **1.983**, minimum nonzero trail **0.500%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 4.729% of initial balance; closed-curve DDT 6.35 hours. Sized-dollar PF diagnostic: 0.593. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 1 | 0 | 1 | 90 | 0 | 90 | — |
| 10-16 22:00 | 0 | 0 | 1 | 0 | 0 | 90 | — |
| 10-16 23:00 | 0 | 0 | 1 | 0 | 0 | 90 | — |
| 10-17 00:00 | 6 | 0 | 7 | 2306 | 512 | 1884 | 8.367 |
| 10-17 01:00 | 4 | 0 | 11 | 3018 | 632 | 4270 | 18.752 |
| 10-17 02:00 | 1 | 0 | 12 | 4265 | 764 | 7771 | 0.662 |
| 10-17 03:00 | 0 | 0 | 12 | 1339 | 1388 | 7722 | 0.045 |
| 10-17 04:00 | 0 | 0 | 12 | 207 | 156 | 7773 | 0.130 |
| 10-17 05:00 | 5 | 0 | 17 | 93 | 295 | 7571 | 0.213 |
| 10-17 06:00 | 3 | 0 | 20 | 49 | 194 | 7426 | no losses |
| 10-17 07:00 | 1 | 1 | 20 | 131 | 326 | 7231 | 10.038 |
| 10-17 08:00 | 2 | 0 | 22 | 8 | 28 | 7211 | 0.000 |


Independent scalar hourly audit: **142,224 decisions; 0 discrepancies**. Initial → final passing configs: 5,309 → 230. Unexplained qualification transitions: 0. Counts can decrease when recent closes expire or fail current gates; cumulative opened orders remain a separate measure.


| UTC boundary | Passing configs | Gained | Dropped | Unexplained |
| --- | --- | --- | --- | --- |
| 10-16 21:00 | 5309 | 0 | 0 | 0 |
| 10-16 22:00 | 5154 | 39 | 194 | 0 |
| 10-16 23:00 | 5044 | 133 | 243 | 0 |
| 10-17 00:00 | 4961 | 252 | 335 | 0 |
| 10-17 01:00 | 4207 | 63 | 817 | 0 |
| 10-17 02:00 | 3639 | 56 | 624 | 0 |
| 10-17 03:00 | 3195 | 183 | 627 | 0 |
| 10-17 04:00 | 1397 | 26 | 1824 | 0 |
| 10-17 05:00 | 968 | 70 | 499 | 0 |
| 10-17 06:00 | 473 | 353 | 848 | 0 |
| 10-17 07:00 | 529 | 196 | 140 | 0 |
| 10-17 08:00 | 230 | 77 | 376 | 0 |


Corrected report checks: **56/56**. Original Exit heatmap failures are preserved; 41 computed Exit cell labels were corrected without changing any executed return, allocation, total or hour.
Exact source-return reconciliation: 4616 matched; missing 0; mismatched 0.

## Minimal plus detail

Native calculation: 8.87 seconds. Recorded session duration before report completion: 9 seconds. Post-Base configuration evaluation: {'configs': 798, 'evaluated': 62, 'passed': 13, 'signalTapes': 0, 'signalActive': 0, 'signalUnitsRun': 0, 'signalSeated': 0}.

Historical qualification and later execution are different populations. Four-close coverage below is counted from archived scalar histories at the initial evaluation boundary; it does not claim a passing PF. Exact context denominators include every configured symbol and eligible direction; side-specific Exit IDs exclude the opposite direction. The ordinary validation setting remains Last-15; Exit retains its separate configured gates.

| Range | Type | Evaluated configs | Passing configs | Pooled ≥4 % | Any own context ≥4 % | Exact contexts ≥4 / total | Exact ≥4 % | Missing histories |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exit | exit:static-sl | 20 | 5 | 100.00 | 100.00 | 195/240 | 81.25 | 0 |
| Exit | exit:breakeven | 13 | 2 | 100.00 | 100.00 | 138/156 | 88.46 | 0 |
| Exit | exit:adaptive-sl | 13 | 3 | 100.00 | 100.00 | 136/156 | 87.18 | 0 |
| Exit | exit:trailing | 8 | 2 | 100.00 | 100.00 | 88/96 | 91.67 | 0 |
| Exit | exit:trailing-only | 8 | 1 | 100.00 | 100.00 | 83/96 | 86.46 | 0 |


### Exit: execution and protections

4 distinct executed indication IDs; 12 symbols; 28 config identities.

| Type | Positions opened | Closed | Held | Orders opened | Settled | Held | Unit-return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| exit:breakeven | 30 | 30 | 0 | 57 | 57 | 0 | 0.533 |
| exit:adaptive-sl | 39 | 39 | 0 | 98 | 98 | 0 | 0.318 |
| exit:trailing | 36 | 36 | 0 | 72 | 72 | 0 | 0.396 |
| exit:trailing-only | 41 | 41 | 0 | 57 | 57 | 0 | 0.347 |
| exit:static-sl | 14 | 14 | 0 | 37 | 37 | 0 | 0.079 |


Executed configuration distances: minimum nonzero TP **0.800%**, maximum SL **2.160%**, maximum SL/TP ratio **2.000**, minimum nonzero trail **0.500%**. Trailing-only has no TP and is excluded from the SL/TP denominator.

Range closed-curve maximum drawdown: 0.129% of initial balance; closed-curve DDT 8.67 hours. Sized-dollar PF diagnostic: 0.312. These are separate from whole-arm equity drawdown.


| UTC hour start | Positions opened | Closed | Held at end | Orders opened | Settled | Held at end | Settled return PF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-16 21:00 | 10 | 3 | 7 | 67 | 30 | 37 | 14.663 |
| 10-16 22:00 | 0 | 5 | 2 | 0 | 25 | 12 | 16.491 |
| 10-16 23:00 | 9 | 2 | 9 | 75 | 19 | 68 | 22.414 |
| 10-17 00:00 | 11 | 2 | 18 | 88 | 42 | 114 | 0.116 |
| 10-17 01:00 | 5 | 6 | 17 | 44 | 71 | 87 | 0.018 |
| 10-17 02:00 | 1 | 14 | 4 | 4 | 87 | 4 | 0.185 |
| 10-17 03:00 | 0 | 4 | 0 | 0 | 4 | 0 | 0.000 |
| 10-17 04:00 | 2 | 0 | 2 | 3 | 0 | 3 | — |
| 10-17 05:00 | 10 | 1 | 11 | 40 | 10 | 33 | 0.076 |
| 10-17 06:00 | 0 | 11 | 0 | 0 | 33 | 0 | 0.000 |
| 10-17 07:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| 10-17 08:00 | 0 | 0 | 0 | 0 | 0 | 0 | — |


Independent scalar hourly audit: **744 decisions; 0 discrepancies**. Initial → final passing configs: 13 → 0. Unexplained qualification transitions: 0. Counts can decrease when recent closes expire or fail current gates; cumulative opened orders remain a separate measure.


| UTC boundary | Passing configs | Gained | Dropped | Unexplained |
| --- | --- | --- | --- | --- |
| 10-16 21:00 | 13 | 0 | 0 | 0 |
| 10-16 22:00 | 16 | 9 | 6 | 0 |
| 10-16 23:00 | 10 | 1 | 7 | 0 |
| 10-17 00:00 | 9 | 0 | 1 | 0 |
| 10-17 01:00 | 11 | 11 | 9 | 0 |
| 10-17 02:00 | 3 | 2 | 10 | 0 |
| 10-17 03:00 | 0 | 0 | 3 | 0 |
| 10-17 04:00 | 2 | 2 | 0 | 0 |
| 10-17 05:00 | 8 | 6 | 0 | 0 |
| 10-17 06:00 | 0 | 0 | 8 | 0 |
| 10-17 07:00 | 0 | 0 | 0 | 0 |
| 10-17 08:00 | 0 | 0 | 0 | 0 |


Corrected report checks: **56/56**. Original Exit heatmap failures are preserved; 41 computed Exit cell labels were corrected without changing any executed return, allocation, total or hour.
Exact source-return reconciliation: 321 matched; missing 0; mismatched 0.

## Scope and failures retained

- Minimal Plus is enabled in its arm but has no historically selected cells in the frozen defaults. It therefore has zero ordinary config orders; its Exit orders do not prove Minimal Plus strategy activity.
- The local Micro attempt exhausted its memory reserve around 71% of tape construction, reached 6,865 MB sampled RSS, and was stopped after fallback. It is not a completed financial result. Remote results are recorded separately.
- General’s independent audit initially had a floating-point cancellation false failure near a zero confidence bound. Exact binary-rational arithmetic verified the stored returns’ bound as positive; the auditor now distinguishes exact zero and either sign. No production gate or financial result changed. The original failure and precision evidence are retained.
- Runtime RSS is sampled during computation and excludes any later report-writing peak.
- Micro and Minimal originally failed the 4 GB JavaScript heap limit. Identical economic protocols are retrying with an 8 GB test heap; pending results are not treated as completed.
- The corrected heatmap uses Exit on both computed and executed sides. A regression still rejects truly missing computed cells.
- Market losses and capital infeasibility are not repaired by changing statistics or weakening qualification gates.

## X02 VST lifecycle evidence

Separate technical fixture with synthetic qualification: seven ranges, both ETH-USDT directions, six logical config lanes per range. **14 actual exchange positions opened; 84 accepted orders; 42 confirmed market fills; 42 cancelled protective stops.** All order IDs reconciled, and all 42 fill quantities, prices and commissions matched venue history. Commission total: $0.394801. Final fresh exchange snapshot: **0 positions / 0 orders**; original account settings restored.

Completed-book dispatch: 0.017–0.406 ms. Native opening steps: 3.4–6.4 seconds; partial-sibling reductions: 11–38 seconds. This demonstrates lifecycle/ownership behavior, not profitable strategy admission, and does not certify minimum live latency under a heavy research load. See [the machine-readable receipt](vst-lifecycle.json).

## Reproduction

Original study source seal: `5aaee37338db18125aeb7798d08cfd91e549acb9c851cff475c4d2b9ec07d34c`. Full frozen protocols, raw histories, allocation sidecars and initial failures: [GitHub workflow 40148371319](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/40148371319). Corrected reports are rerendered from the unchanged raw records; all per-case details and parity receipts accompany this document.
